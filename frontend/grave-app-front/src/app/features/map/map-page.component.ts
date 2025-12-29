import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  inject,
  effect,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { GeolocationService } from '../../core/services/geolocation.service';
import { GraveService } from '../graves/services/grave.service';
import { Grave } from '../../shared/models/grave.model';

@Component({
  selector: 'app-map-page',
  imports: [DecimalPipe, FormsModule, LeafletModule, MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.scss'],
})
export class MapPageComponent implements OnDestroy {
  mapOptions: L.MapOptions = {
    zoom: 19, // Maksymalne przybliżenie dla najlepszej dokładności
    center: L.latLng(52.2297, 21.0122),
    dragging: false, // Zablokowane przesuwanie mapy
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }),
    ],
  };

  private mapInstance?: L.Map;
  private userMarker?: L.Marker;
  private accuracyCircle?: L.Circle;
  private watchSub?: Subscription;
  private graveMarkers: L.Marker[] = [];
  private routeLine?: L.Polyline;
  private routeArrows: L.Marker[] = [];
  autoCenterEnabled = true; // Domyślnie włączone automatyczne centrowanie
  isLoadingTestGraves = false;
  isFullscreen = false;

  // Planowanie trasy
  plannedRoute: Grave[] = [];
  totalRouteDistance = 0;
  maxRouteDistance = 1; // km
  isCalculatingRoute = false;

  currentCoords?: GeolocationCoordinates;
  geoError?: string;

  private readonly geolocation = inject(GeolocationService);
  private readonly graveService = inject(GraveService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // Globalna referencja do nawigacji (dla przycisków w popup)
    (window as any).navigateToGrave = (graveId: string) => this.navigateToGrave(graveId);

    // Automatycznie odświeżaj markery gdy zmieni się lista grobów
    effect(() => {
      const graves = this.graveService.graves();
      if (this.mapInstance && graves.length > 0) {
        this.addGraveMarkers();
      }
    });
  }

  onMapReady(map: L.Map) {
    this.mapInstance = map;
    this.startTracking();
    this.addGraveMarkers();
  }

  centerOnUser() {
    if (this.mapInstance && this.currentCoords) {
      const latLng = L.latLng(this.currentCoords.latitude, this.currentCoords.longitude);
      this.mapInstance.setView(latLng, this.mapInstance.getZoom(), { animate: true });
    }
  }

  toggleAutoCenter() {
    this.autoCenterEnabled = !this.autoCenterEnabled;

    // Jeśli włączamy auto-centrowanie, od razu wycentruj mapę
    if (this.autoCenterEnabled && this.currentCoords) {
      this.centerOnUser();
    }

    this.cdr.markForCheck();
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    // Odśwież rozmiar mapy po zmianie trybu
    setTimeout(() => {
      if (this.mapInstance) {
        this.mapInstance.invalidateSize();
        // Wycentruj mapę jeśli auto-centrowanie jest włączone
        if (this.autoCenterEnabled && this.currentCoords) {
          this.centerOnUser();
        }
      }
    }, 100);

    this.cdr.markForCheck();
  }

  async loadTestGraves() {
    if (!this.currentCoords) return;

    this.isLoadingTestGraves = true;
    this.cdr.markForCheck();

    try {
      await this.graveService.generateMockGraves(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        8
      );
      console.log('✅ Załadowano testowe groby wokół Twojej lokalizacji');
    } catch (error) {
      console.error('❌ Błąd podczas ładowania testowych grobów:', error);
    } finally {
      this.isLoadingTestGraves = false;
      this.cdr.markForCheck();
    }
  }

  private startTracking() {
    this.watchSub = this.geolocation.watchPosition().subscribe({
      next: (pos) => {
        this.geoError = undefined;
        this.currentCoords = pos.coords;
        this.cdr.markForCheck(); // Trigger change detection

        const latLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

        if (!this.userMarker && this.mapInstance) {
          // Utworzenie niestandardowej ikony pinezki dla lokalizacji użytkownika
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
              <div class="marker-pin">
                <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" 
                        fill="#2E7D32" stroke="#1B5E20" stroke-width="2"/>
                  <circle cx="16" cy="16" r="6" fill="white"/>
                  <circle cx="16" cy="16" r="3" fill="#2E7D32"/>
                </svg>
              </div>
            `,
            iconSize: [32, 42],
            iconAnchor: [16, 42],
            popupAnchor: [0, -42],
          });

          this.userMarker = L.marker(latLng, {
            icon: userIcon,
            zIndexOffset: 1000, // Zawsze na wierzchu
          }).addTo(this.mapInstance);

          // Dodaj okrąg dokładności
          this.accuracyCircle = L.circle(latLng, {
            radius: pos.coords.accuracy,
            color: '#2E7D32',
            fillColor: '#4CAF50',
            fillOpacity: 0.15,
            weight: 2,
            opacity: 0.5,
          }).addTo(this.mapInstance);

          // Dodaj tooltip
          this.userMarker.bindTooltip('Twoja lokalizacja', {
            permanent: false,
            direction: 'top',
          });
        } else if (this.userMarker) {
          this.userMarker.setLatLng(latLng);

          // Aktualizuj okrąg dokładności
          if (this.accuracyCircle) {
            this.accuracyCircle.setLatLng(latLng);
            this.accuracyCircle.setRadius(pos.coords.accuracy);
          }
        }

        // Automatyczne centrowanie jeśli jest włączone - używa setView dla precyzji
        if (this.mapInstance && this.autoCenterEnabled) {
          this.mapInstance.setView(latLng, this.mapInstance.getZoom(), { animate: true });
        }
      },
      error: (err) => {
        console.error('Geolocation error', err);
        this.geoError = err.message || 'Brak dostępu do lokalizacji';
        this.cdr.markForCheck(); // Trigger change detection for error
      },
    });
  }

  private addGraveMarkers(): void {
    if (!this.mapInstance) return;

    // Usuń istniejące markery grobów
    this.graveMarkers.forEach((marker) => marker.remove());
    this.graveMarkers = [];

    const graves = this.graveService.graves();
    console.log(`📍 Dodawanie ${graves.length} markerów grobów na mapę`);

    graves.forEach((grave) => {
      if (!this.mapInstance) return;

      // Ikona grobu (różowa/czerwona przypinka)
      const graveIcon = L.divIcon({
        html: `
          <div style="transform: translateY(-21px);">
            <svg width="28" height="38" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" 
                    fill="#546E7A" stroke="#37474F" stroke-width="2"/>
              <path d="M16 10 L16 22 M10 16 L22 16" stroke="white" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
        `,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
        className: 'grave-marker',
      });

      const marker = L.marker([grave.latitude, grave.longitude], {
        icon: graveIcon,
        title: this.getGraveTitle(grave),
      }).addTo(this.mapInstance);

      // Popup z informacjami o grobie
      const popupContent = this.createGravePopup(grave);
      marker.bindPopup(popupContent, {
        maxWidth: 400,
        minWidth: 280,
        className: 'grave-popup',
      });

      this.graveMarkers.push(marker);
    });
  }

  private getGraveTitle(grave: Grave): string {
    if (grave.deceasedPersons.length > 0) {
      const person = grave.deceasedPersons[0];
      return `${person.firstName} ${person.lastName}`;
    }
    return grave.cemeteryName;
  }

  private createGravePopup(grave: Grave): string {
    const names = grave.deceasedPersons
      .map((p) => `<strong>${p.firstName} ${p.lastName}</strong>`)
      .join('<br>');

    const location =
      grave.sector && grave.graveNumber
        ? `${grave.sector}, nr ${grave.graveNumber}`
        : grave.graveNumber || 'Brak numeru';

    const distance = this.currentCoords
      ? this.calculateDistance(
          this.currentCoords.latitude,
          this.currentCoords.longitude,
          grave.latitude,
          grave.longitude
        )
      : null;

    const distanceInfo =
      distance !== null
        ? `<div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-top: 8px;">📏 Odległość: ${distance.toFixed(
            0
          )}m</div>`
        : '';

    return `
      <div style="padding: 16px; min-height: 100px;">
        <div style="font-size: 16px; margin-bottom: 12px; line-height: 1.5;">
          ${names || '<em>Brak informacji</em>'}
        </div>
        <div style="font-size: 14px; color: rgba(0,0,0,0.6); margin-bottom: 8px;">
          <strong>📍 ${grave.cemeteryName}</strong>
        </div>
        <div style="font-size: 13px; color: rgba(0,0,0,0.5);">
          ${location}
        </div>
        ${distanceInfo}
        <button 
          onclick="window.navigateToGrave('${grave.id}')"
          style="
            margin-top: 12px;
            width: 100%;
            padding: 10px 16px;
            background: #43a047;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#388e3c'"
          onmouseout="this.style.background='#43a047'"
        >
          <span style="font-size: 18px;">🧭</span> Nawiguj do grobu
        </button>
      </div>
    `;
  }

  /**
   * Oblicza odległość w metrach między dwoma punktami używając wzoru Haversine
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Promień Ziemi w metrach
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Dystans w metrach
  }

  /**
   * Otwiera nawigację do konkretnego grobu w Google Maps
   */
  navigateToGrave(graveId: string): void {
    const grave = this.graveService.graves().find((g) => g.id === graveId);
    if (!grave) return;

    // Otwórz Google Maps z nawigacją do grobu
    const url = `https://www.google.com/maps/dir/?api=1&destination=${grave.latitude},${grave.longitude}`;
    window.open(url, '_blank');
  }

  /**
   * Planuje optymalną trasę przez groby w określonym promieniu
   * Używa algorytmu najbliższego sąsiada (aproksymacja TSP)
   */
  async planOptimalRoute(): Promise<void> {
    if (!this.currentCoords) {
      console.warn('Brak lokalizacji użytkownika');
      return;
    }

    this.isCalculatingRoute = true;
    this.cdr.markForCheck();

    try {
      const allGraves = this.graveService.graves();
      const maxDistanceMeters = this.maxRouteDistance * 1000;

      // Filtruj groby w promieniu
      const nearbyGraves = allGraves.filter((grave) => {
        const distance = this.calculateDistance(
          this.currentCoords!.latitude,
          this.currentCoords!.longitude,
          grave.latitude,
          grave.longitude
        );
        return distance <= maxDistanceMeters;
      });

      if (nearbyGraves.length === 0) {
        console.log('Brak grobów w określonym promieniu');
        this.plannedRoute = [];
        this.totalRouteDistance = 0;
        this.clearRouteFromMap();
        this.cdr.markForCheck();
        return;
      }

      // Rozwiąż problem komiwojażera (TSP) algorytmem najbliższego sąsiada
      const route = this.solveTSPNearestNeighbor(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        nearbyGraves
      );

      this.plannedRoute = route;
      this.totalRouteDistance = this.calculateTotalRouteDistance(route);
      this.drawRouteOnMap(route);

      console.log(
        `🗺️ Zaplanowano trasę przez ${route.length} grobów, dystans: ${(
          this.totalRouteDistance / 1000
        ).toFixed(2)}km`
      );
    } finally {
      this.isCalculatingRoute = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Rozwiązuje TSP używając algorytmu najbliższego sąsiada
   * (heurystyka - nie gwarantuje optymalnego rozwiązania, ale działa szybko)
   */
  private solveTSPNearestNeighbor(startLat: number, startLon: number, graves: Grave[]): Grave[] {
    if (graves.length === 0) return [];
    if (graves.length === 1) return graves;

    const route: Grave[] = [];
    const unvisited = new Set(graves);
    let currentLat = startLat;
    let currentLon = startLon;

    // Znajdź najbliższy grób jako punkt startowy
    let nearest = this.findNearestGrave(currentLat, currentLon, Array.from(unvisited));
    if (!nearest) return [];

    route.push(nearest);
    unvisited.delete(nearest);
    currentLat = nearest.latitude;
    currentLon = nearest.longitude;

    // Iteracyjnie wybieraj najbliższy nieodwiedzony grób
    while (unvisited.size > 0) {
      nearest = this.findNearestGrave(currentLat, currentLon, Array.from(unvisited));
      if (!nearest) break;

      route.push(nearest);
      unvisited.delete(nearest);
      currentLat = nearest.latitude;
      currentLon = nearest.longitude;
    }

    return route;
  }

  private findNearestGrave(lat: number, lon: number, graves: Grave[]): Grave | null {
    if (graves.length === 0) return null;

    let nearest = graves[0];
    let minDistance = this.calculateDistance(lat, lon, nearest.latitude, nearest.longitude);

    for (let i = 1; i < graves.length; i++) {
      const distance = this.calculateDistance(lat, lon, graves[i].latitude, graves[i].longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = graves[i];
      }
    }

    return nearest;
  }

  private calculateTotalRouteDistance(route: Grave[]): number {
    if (!this.currentCoords || route.length === 0) return 0;

    let total = 0;

    // Dystans od pozycji użytkownika do pierwszego grobu
    total += this.calculateDistance(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      route[0].latitude,
      route[0].longitude
    );

    // Dystans między kolejnymi grobami
    for (let i = 0; i < route.length - 1; i++) {
      total += this.calculateDistance(
        route[i].latitude,
        route[i].longitude,
        route[i + 1].latitude,
        route[i + 1].longitude
      );
    }

    return total;
  }

  private drawRouteOnMap(route: Grave[]): void {
    if (!this.mapInstance || !this.currentCoords || route.length === 0) return;

    // Usuń poprzednią trasę
    this.clearRouteFromMap();

    // Utwórz punkty trasy - WAŻNE: dokładne współrzędne
    const points: L.LatLngExpression[] = [
      [this.currentCoords.latitude, this.currentCoords.longitude],
      ...route.map((grave) => [grave.latitude, grave.longitude] as L.LatLngExpression),
    ];

    console.log('🗺️ Rysowanie trasy przez punkty:', points);

    // Rysuj linię trasy - prosta linia przez wszystkie punkty
    this.routeLine = L.polyline(points, {
      color: '#5C6BC0',
      weight: 5,
      opacity: 0.9,
      dashArray: '10, 10',
      lineJoin: 'round',
      lineCap: 'round',
      smoothFactor: 0, // WAŻNE: 0 = dokładne przejście przez punkty, bez wygładzania
    }).addTo(this.mapInstance);

    // Ustaw zIndex żeby linia była widoczna ale pod markerami
    if (this.routeLine) {
      (this.routeLine as any).setZIndex(100);
    }

    // Dodaj strzałki kierunku wzdłuż trasy
    this.addDirectionArrows(points);

    // Dodaj numerację punktów trasy
    route.forEach((grave, index) => {
      if (!this.mapInstance) return;

      const numberIcon = L.divIcon({
        html: `<div style="
          background: #5C6BC0;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 15px;
          border: 3px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        ">${index + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: 'route-number-marker',
      });

      L.marker([grave.latitude, grave.longitude], {
        icon: numberIcon,
        zIndexOffset: 500,
      }).addTo(this.mapInstance!);
    });

    // Dopasuj widok mapy do trasy
    const bounds = L.latLngBounds(points);
    this.mapInstance.fitBounds(bounds, { padding: [50, 50] });
  }

  clearRoute(): void {
    this.plannedRoute = [];
    this.totalRouteDistance = 0;
    this.clearRouteFromMap();
    this.cdr.markForCheck();
  }

  private clearRouteFromMap(): void {
    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = undefined;
    }

    // Usuń strzałki kierunku
    this.routeArrows.forEach((arrow) => arrow.remove());
    this.routeArrows = [];

    // Usuń markery numerów (są one dodawane dynamicznie)
    if (this.mapInstance) {
      this.mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const icon = (layer as any).options.icon;
          if (icon && icon.options.className === 'route-number-marker') {
            layer.remove();
          }
        }
      });
    }
  }

  /**
   * Dodaje strzałki kierunku wzdłuż trasy
   */
  private addDirectionArrows(points: L.LatLngExpression[]): void {
    if (!this.mapInstance || points.length < 2) return;

    // Dla każdego segmentu trasy, dodaj strzałkę na środku
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i] as [number, number];
      const p2 = points[i + 1] as [number, number];

      // Oblicz punkt środkowy
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;

      // Oblicz kąt rotacji strzałki
      const angle = this.calculateBearing(p1[0], p1[1], p2[0], p2[1]);

      // Utwórz ikonę strzałki z SVG
      const arrowIcon = L.divIcon({
        html: `
          <svg width="30" height="30" viewBox="0 0 30 30" style="transform: rotate(${angle}deg);">
            <path d="M15 5 L25 15 L15 25 L15 19 L5 19 L5 11 L15 11 Z" 
                  fill="#5C6BC0" 
                  stroke="white" 
                  stroke-width="2"/>
          </svg>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: 'route-arrow-marker',
      });

      // Dodaj marker strzałki
      const arrow = L.marker([midLat, midLng], {
        icon: arrowIcon,
        zIndexOffset: 200,
      }).addTo(this.mapInstance);

      this.routeArrows.push(arrow);
    }
  }

  /**
   * Oblicza kąt (bearing) między dwoma punktami geograficznymi
   */
  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * (180 / Math.PI);
    return bearing;
  }

  /**
   * Otwiera nawigację Google Maps z wszystkimi punktami trasy
   */
  startRouteNavigation(): void {
    if (!this.currentCoords || this.plannedRoute.length === 0) return;

    // Google Maps API wspiera do 9 waypoints, więc limitujemy
    const maxWaypoints = Math.min(this.plannedRoute.length - 1, 9);
    const waypoints = this.plannedRoute
      .slice(0, maxWaypoints)
      .map((g) => `${g.latitude},${g.longitude}`)
      .join('|');

    const lastGrave = this.plannedRoute[maxWaypoints];
    const url = `https://www.google.com/maps/dir/?api=1&origin=${this.currentCoords.latitude},${this.currentCoords.longitude}&destination=${lastGrave.latitude},${lastGrave.longitude}&waypoints=${waypoints}&travelmode=walking`;

    window.open(url, '_blank');
  }

  ngOnDestroy(): void {
    this.watchSub?.unsubscribe();
    this.clearRouteFromMap();
    delete (window as any).navigateToGrave;
  }
}
