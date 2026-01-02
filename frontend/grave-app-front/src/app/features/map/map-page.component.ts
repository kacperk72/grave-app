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
  autoCenterEnabled = true; // Domyślnie włączone automatyczne centrowanie
  isLoadingTestGraves = false;
  isFullscreen = false;

  // Planowanie trasy
  plannedRoute: Grave[] = [];
  totalRouteDistance = 0;
  maxRouteDistance = 1; // km
  isCalculatingRoute = false;

  nextWaypoint?: {
    grave: Grave;
    distanceMeters: number;
    bearingDeg: number;
    arrowRotationDeg: number;
  };
  isNavigationActive = false;
  activeGallery?: { graveId: string; index: number };
  selectedGrave?: Grave;

  currentCoords?: GeolocationCoordinates;
  geoError?: string;

  private readonly geolocation = inject(GeolocationService);
  private readonly graveService = inject(GraveService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
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
    } catch (error) {
      console.error('❌ Błąd podczas ładowania testowych grobów:', error);
    } finally {
      this.isLoadingTestGraves = false;
      this.cdr.markForCheck();
    }
  }

  private startTracking() {
    this.watchSub = this.geolocation.watchPosition({ intervalMs: 5000 }).subscribe({
      next: (pos) => {
        this.geoError = undefined;
        this.currentCoords = pos.coords;
        this.cdr.markForCheck(); // Trigger change detection

        const latLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

        if (!this.userMarker && this.mapInstance) {
          this.userMarker = L.marker(latLng, {
            zIndexOffset: 1000, // Zawsze na wierzchu
          }).addTo(this.mapInstance);

          // Ustaw ikonę użytkownika (pinezka lub strzałka) zależnie od trybu nawigacji
          this.applyUserMarkerIcon();

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

        // Aktualizuj wskazanie kierunku do następnego punktu trasy
        this.updateNextWaypointGuidance();
      },
      error: (err) => {
        console.error('Geolocation error', err);
        this.geoError = err.message || 'Brak dostępu do lokalizacji';
        this.cdr.markForCheck(); // Trigger change detection for error
      },
    });
  }

  openGallery(graveId: string, index: number): void {
    this.activeGallery = { graveId, index };
    this.cdr.markForCheck();
  }

  closeGallery(): void {
    this.activeGallery = undefined;
    this.cdr.markForCheck();
  }

  openGraveDetails(grave: Grave): void {
    this.selectedGrave = grave;
    this.cdr.markForCheck();
  }

  closeGraveDetails(): void {
    this.selectedGrave = undefined;
    this.cdr.markForCheck();
  }

  getDistanceToGrave(grave: Grave): number | null {
    if (!this.currentCoords) return null;
    return this.calculateDistance(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      grave.latitude,
      grave.longitude
    );
  }

  getGraveLocationLabel(grave: Grave): string {
    if (grave.sector && grave.graveNumber) return `${grave.sector}, nr ${grave.graveNumber}`;
    return grave.graveNumber || 'Brak numeru';
  }

  private createUserPinIcon(): L.DivIcon {
    return L.divIcon({
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
  }

  private createUserArrowIcon(rotationDeg: number): L.DivIcon {
    return L.divIcon({
      className: 'user-location-arrow-marker',
      html: `
        <div class="user-direction-arrow" style="transform: rotate(${rotationDeg}deg);">
          <svg width="36" height="36" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 3 L27 15 L15 27 L15 20 L5 20 L5 10 L15 10 Z"
                  fill="#2E7D32" stroke="white" stroke-width="2"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  private getNavigationArrowRotationDeg(bearingDeg: number): number {
    // bearingDeg: kierunek do celu względem północy (0..360)
    // coords.heading: kierunek ruchu użytkownika względem północy (0..360) – często null, zwłaszcza gdy stoisz
    const heading = this.currentCoords?.heading;
    if (
      this.isNavigationActive &&
      heading !== null &&
      heading !== undefined &&
      !Number.isNaN(heading)
    ) {
      // Obrót „kompasowy”: gdzie iść względem tego, w którą stronę się poruszasz
      return (bearingDeg - heading + 360) % 360;
    }

    // Fallback: obrót względem północy (na mapie północ jest u góry)
    return bearingDeg;
  }

  private applyUserMarkerIcon(): void {
    if (!this.userMarker) return;

    if (this.isNavigationActive && this.nextWaypoint) {
      this.userMarker.setIcon(this.createUserArrowIcon(this.nextWaypoint.arrowRotationDeg));
      return;
    }

    this.userMarker.setIcon(this.createUserPinIcon());
  }

  private updateNextWaypointGuidance(): void {
    if (!this.mapInstance || !this.currentCoords || this.plannedRoute.length === 0) {
      this.nextWaypoint = undefined;
      // Jeśli kończymy trasę, wróć do pinezki
      this.applyUserMarkerIcon();
      this.cdr.markForCheck();
      return;
    }

    const next = this.plannedRoute[0];
    const distanceMeters = this.calculateDistance(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      next.latitude,
      next.longitude
    );
    const bearingDeg = this.calculateBearing(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      next.latitude,
      next.longitude
    );

    const arrowRotationDeg = this.getNavigationArrowRotationDeg(bearingDeg);

    this.nextWaypoint = { grave: next, distanceMeters, bearingDeg, arrowRotationDeg };

    // W trybie nawigacji strzałka zastępuje pinezkę lokalizacji
    this.applyUserMarkerIcon();

    this.cdr.markForCheck();
  }

  private addGraveMarkers(): void {
    if (!this.mapInstance) return;

    // Usuń istniejące markery grobów
    this.graveMarkers.forEach((marker) => marker.remove());
    this.graveMarkers = [];

    const graves = this.graveService.graves();

    graves.forEach((grave, index) => {
      if (!this.mapInstance) return;

      // Ikona grobu (różowa/czerwona przypinka)
      const graveIcon = L.divIcon({
        html: `
          <svg width="28" height="38" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" 
                  fill="#546E7A" stroke="#37474F" stroke-width="2"/>
            <path d="M16 10 L16 22 M10 16 L22 16" stroke="white" stroke-width="3" stroke-linecap="round"/>
          </svg>
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

      // Zamiast Leaflet popup (problemy z rozmiarem/zamykaniem) otwieramy modal Angulara
      marker.on('click', () => {
        this.openGraveDetails(grave);
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
   * Wyznacza trasę tylko do jednego grobu i rozpoczyna nawigację na mapie
   */
  navigateToGrave(graveId: string): void {
    const grave = this.graveService.graves().find((g) => g.id === graveId);
    if (!grave) return;

    this.plannedRoute = [grave];
    this.totalRouteDistance = this.calculateTotalRouteDistance(this.plannedRoute);
    this.drawRouteOnMap(this.plannedRoute);
    this.startRouteNavigation();
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

  removeFromRoute(graveId: string): void {
    if (this.plannedRoute.length === 0) return;

    const remaining = this.plannedRoute.filter((g) => g.id !== graveId);

    if (remaining.length === 0) {
      this.clearRoute();
      return;
    }

    if (!this.currentCoords) {
      // Bez aktualnej lokalizacji nie da się sensownie przeliczyć TSP.
      // Zostawiamy listę po usunięciu i czyścimy rysunek trasy.
      this.plannedRoute = remaining;
      this.totalRouteDistance = 0;
      this.nextWaypoint = undefined;
      this.isNavigationActive = false;
      this.applyUserMarkerIcon();
      this.clearRouteFromMap();
      this.cdr.markForCheck();
      return;
    }

    const recalculated = this.solveTSPNearestNeighbor(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      remaining
    );

    this.plannedRoute = recalculated;
    this.totalRouteDistance = this.calculateTotalRouteDistance(recalculated);
    this.drawRouteOnMap(recalculated);
    this.cdr.markForCheck();
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

    route.forEach((grave, index) => {
      console.log(`  Punkt ${index + 1} (${this.getGraveTitle(grave)}):`, {
        latitude: grave.latitude,
        longitude: grave.longitude,
        latLngArray: [grave.latitude, grave.longitude],
      });
    });

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

    // Polilinia nie ma setZIndex() w Leaflet; dla pewności trzymamy ją pod markerami
    this.routeLine.bringToBack();

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

    // Od razu wylicz i pokaż kierunek do pierwszego punktu
    this.updateNextWaypointGuidance();
  }

  clearRoute(): void {
    this.plannedRoute = [];
    this.totalRouteDistance = 0;
    this.nextWaypoint = undefined;
    this.isNavigationActive = false;
    this.applyUserMarkerIcon();
    this.clearRouteFromMap();
    this.cdr.markForCheck();
  }

  private clearRouteFromMap(): void {
    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = undefined;
    }

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
    // Normalizacja do zakresu 0..360 (łatwiejsze do rotacji)
    return (bearing + 360) % 360;
  }

  /**
   * Rozpoczyna nawigację na mapie (strzałka zamiast pinezki lokalizacji)
   */
  startRouteNavigation(): void {
    if (!this.currentCoords || this.plannedRoute.length === 0) return;
    this.isNavigationActive = true;
    this.updateNextWaypointGuidance();
  }

  ngOnDestroy(): void {
    this.watchSub?.unsubscribe();
    this.clearRouteFromMap();
  }
}
