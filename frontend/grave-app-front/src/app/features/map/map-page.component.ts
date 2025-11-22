import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  inject,
  effect,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
  imports: [DecimalPipe, LeafletModule, MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-page">
      <div class="map-section">
        <h1 class="page-title">Mapa grobów</h1>
        <p class="page-subtitle">Wyświetl lokalizacje wszystkich zapisanych grobów na mapie</p>

        <div class="map-wrapper">
          <div
            leaflet
            class="map-container"
            [leafletOptions]="mapOptions"
            (leafletMapReady)="onMapReady($event)"
          ></div>
        </div>

        @if (currentCoords; as coords) {
        <div class="coordinates-info">
          <div class="coord-label">
            <mat-icon>place</mat-icon>
            <span>Współrzędne geograficzne:</span>
          </div>
          <div class="coord-values">
            <div class="coord-item">
              <span class="coord-name">Szerokość:</span>
              <code class="coord-value">{{ coords.latitude | number : '1.6-6' }}°</code>
            </div>
            <div class="coord-item">
              <span class="coord-name">Długość:</span>
              <code class="coord-value">{{ coords.longitude | number : '1.6-6' }}°</code>
            </div>
          </div>
        </div>
        }
      </div>

      <aside class="info-panel">
        <mat-card class="location-card">
          <mat-card-header>
            <div mat-card-avatar class="location-avatar">
              <mat-icon class="location-icon">my_location</mat-icon>
            </div>
            <mat-card-title>Twoja lokalizacja</mat-card-title>
            <mat-card-subtitle>Aktywne śledzenie GPS</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            @if (currentCoords; as coords) {
            <div class="status-info">
              <div
                class="status-item"
                [class.excellent]="coords.accuracy <= 5"
                [class.good]="coords.accuracy > 5 && coords.accuracy <= 15"
                [class.fair]="coords.accuracy > 15 && coords.accuracy <= 30"
                [class.poor]="coords.accuracy > 30"
              >
                <mat-icon
                  class="status-icon"
                  [class.excellent]="coords.accuracy <= 5"
                  [class.good]="coords.accuracy > 5 && coords.accuracy <= 15"
                  [class.fair]="coords.accuracy > 15 && coords.accuracy <= 30"
                  [class.poor]="coords.accuracy > 30"
                >
                  {{
                    coords.accuracy <= 5
                      ? 'gps_fixed'
                      : coords.accuracy <= 15
                      ? 'gps_not_fixed'
                      : 'gps_off'
                  }}
                </mat-icon>
                <div class="status-text">
                  <strong>Pozycja aktywna</strong>
                  <span class="accuracy-info">
                    Dokładność: {{ coords.accuracy | number : '1.0-0' }}m @if (coords.accuracy <= 5)
                    {
                    <span class="quality excellent">• Doskonała</span>
                    } @else if (coords.accuracy <= 15) {
                    <span class="quality good">• Bardzo dobra</span>
                    } @else if (coords.accuracy <= 30) {
                    <span class="quality fair">• Dobra</span>
                    } @else {
                    <span class="quality poor">• Słaba</span>
                    }
                  </span>
                </div>
              </div>
            </div>
            } @else {
            <div class="loading-state">
              <mat-icon>hourglass_empty</mat-icon>
              <div>
                <p>Oczekiwanie na sygnał GPS...</p>
                <span class="hint">💡 Wyjdź na zewnątrz dla lepszej dokładności</span>
              </div>
            </div>
            } @if (geoError) {
            <div class="error-state">
              <mat-icon>error_outline</mat-icon>
              <div>
                <p>{{ geoError }}</p>
                <span class="hint">Sprawdź uprawnienia aplikacji</span>
              </div>
            </div>
            }
          </mat-card-content>

          <mat-card-actions>
            <button
              mat-raised-button
              color="primary"
              (click)="centerOnUser()"
              [disabled]="!currentCoords"
              class="center-button"
            >
              <mat-icon>my_location</mat-icon>
              Wycentruj mapę
            </button>
          </mat-card-actions>
        </mat-card>
      </aside>
    </div>
  `,
  styles: [
    `
      .map-page {
        display: grid;
        gap: 1.5rem;
        height: 100%;
      }

      .map-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .page-title {
        margin: 0;
        font-size: 28px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.87);
      }

      .page-subtitle {
        margin: 4px 0 0 0;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
      }

      .map-wrapper {
        flex: 1;
        min-height: 500px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.12);
      }

      .map-container {
        height: 100%;
        min-height: 500px;
      }

      .coordinates-info {
        margin-top: 1rem;
        padding: 12px 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.08);

        .coord-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            color: var(--primary-color);
          }
        }

        .coord-values {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .coord-item {
          display: flex;
          align-items: baseline;
          gap: 6px;

          .coord-name {
            font-size: 12px;
            color: rgba(0, 0, 0, 0.6);
          }

          .coord-value {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: 600;
            color: rgba(0, 0, 0, 0.87);
            background: rgba(0, 0, 0, 0.04);
            padding: 2px 6px;
            border-radius: 4px;
            user-select: all;
          }
        }
      }

      .info-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .location-card {
        mat-card-header {
          margin-bottom: 16px;
        }

        .location-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-color);
        }

        .location-icon {
          color: white;
          font-size: 24px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .status-info {
        padding: 8px 0;
      }

      .status-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid;
        transition: all 0.3s ease;

        &.excellent {
          background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
          border-color: rgba(46, 125, 50, 0.3);
        }

        &.good {
          background: linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%);
          border-color: rgba(33, 150, 243, 0.3);
        }

        &.fair {
          background: linear-gradient(135deg, #fff3e0 0%, #fff8f0 100%);
          border-color: rgba(255, 152, 0, 0.3);
        }

        &.poor {
          background: linear-gradient(135deg, #ffebee 0%, #fff0f1 100%);
          border-color: rgba(244, 67, 54, 0.3);
        }

        .status-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          flex-shrink: 0;

          &.excellent {
            color: #2e7d32;
          }

          &.good {
            color: #1976d2;
          }

          &.fair {
            color: #f57c00;
          }

          &.poor {
            color: #d32f2f;
          }
        }

        .status-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;

          strong {
            font-size: 16px;
            color: rgba(0, 0, 0, 0.87);
            line-height: 1.2;
          }

          .accuracy-info {
            font-size: 13px;
            color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            gap: 4px;
            flex-wrap: wrap;
          }

          .quality {
            font-weight: 500;
            font-size: 12px;

            &.excellent {
              color: #2e7d32;
            }

            &.good {
              color: #1976d2;
            }

            &.fair {
              color: #f57c00;
            }

            &.poor {
              color: #d32f2f;
            }
          }
        }
      }

      .loading-state,
      .error-state {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        border-radius: 12px;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        p {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
        }

        .hint {
          font-size: 12px;
          opacity: 0.8;
        }
      }

      .loading-state {
        background: rgba(0, 0, 0, 0.04);
        color: rgba(0, 0, 0, 0.6);
      }

      .error-state {
        background: rgba(211, 47, 47, 0.08);
        color: #d32f2f;

        mat-icon {
          color: #d32f2f;
        }
      }

      mat-card-actions {
        padding: 16px;

        .center-button {
          width: 100%;

          mat-icon {
            margin-right: 8px;
          }
        }
      }

      @media (max-width: 599px) {
        .page-title {
          font-size: 22px;
        }

        .page-subtitle {
          font-size: 13px;
          line-height: 1.4;
        }

        .map-section {
          gap: 0.75rem;
        }

        .map-wrapper {
          min-height: 350px;
          border-radius: 8px;
        }

        .map-container {
          min-height: 350px;
        }

        .coordinates-info {
          padding: 10px 12px;
          margin-top: 0.75rem;

          .coord-label {
            font-size: 12px;
            margin-bottom: 6px;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
            }
          }

          .coord-values {
            gap: 12px;
          }

          .coord-item {
            .coord-name {
              font-size: 11px;
            }

            .coord-value {
              font-size: 13px;
              padding: 2px 5px;
            }
          }
        }

        .location-card {
          mat-card-header {
            padding: 12px 16px;

            mat-card-title {
              font-size: 16px;
            }

            mat-card-subtitle {
              font-size: 12px;
            }
          }

          mat-card-content {
            padding: 12px 16px;
          }

          mat-card-actions {
            padding: 12px 16px;
          }
        }

        .status-item {
          padding: 12px;

          .status-icon {
            font-size: 24px;
            width: 24px;
            height: 24px;
          }

          .status-text strong {
            font-size: 15px;
          }

          .status-text span {
            font-size: 12px;
          }
        }

        .loading-state,
        .error-state {
          padding: 16px;

          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
          }

          p {
            font-size: 13px;
          }

          .hint {
            font-size: 11px;
          }
        }
      }

      @media (min-width: 600px) and (max-width: 959px) {
        .map-page {
          gap: 1.5rem;
        }

        .map-wrapper {
          min-height: 450px;
        }

        .map-container {
          min-height: 450px;
        }
      }

      @media (min-width: 960px) {
        .map-page {
          grid-template-columns: 1fr 380px;
          align-items: flex-start;
        }

        .map-wrapper {
          min-height: calc(100vh - 220px);
        }

        .map-container {
          min-height: calc(100vh - 220px);
        }

        .info-panel {
          position: sticky;
          top: 1rem;
        }
      }

      @media (min-width: 1400px) {
        .map-page {
          grid-template-columns: 1fr 420px;
        }
      }

      // Custom marker styles
      :host ::ng-deep .user-location-marker {
        background: transparent;
        border: none;

        .marker-pin {
          position: relative;
          animation: bounce 2s infinite;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }
      }

      @keyframes bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }

      :host ::ng-deep .leaflet-tooltip {
        background-color: #2e7d32;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      :host ::ng-deep .leaflet-tooltip-top:before {
        border-top-color: #2e7d32;
      }

      :host ::ng-deep .grave-marker {
        transition: all 0.2s ease;
      }

      :host ::ng-deep .grave-marker:hover {
        transform: scale(1.1);
        z-index: 1000 !important;
      }

      :host ::ng-deep .grave-popup .leaflet-popup-content-wrapper {
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        border: 2px solid #c62828;
      }

      :host ::ng-deep .grave-popup .leaflet-popup-content {
        margin: 0;
        min-width: 180px;
      }

      :host ::ng-deep .grave-popup .leaflet-popup-tip {
        background: white;
        border-bottom: 2px solid #c62828;
        border-right: 2px solid #c62828;
      }
    `,
  ],
})
export class MapPageComponent implements OnDestroy {
  mapOptions: L.MapOptions = {
    zoom: 19, // Maksymalne przybliżenie dla najlepszej dokładności
    center: L.latLng(52.2297, 21.0122),
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
      this.mapInstance.panTo(latLng);
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

        if (this.mapInstance && !this.mapInstance.getBounds().contains(latLng)) {
          this.mapInstance.panTo(latLng);
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
                    fill="#C62828" stroke="#8B0000" stroke-width="2"/>
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
        maxWidth: 300,
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

    return `
      <div style="padding: 8px;">
        <div style="font-size: 14px; margin-bottom: 8px;">
          ${names || '<em>Brak informacji</em>'}
        </div>
        <div style="font-size: 12px; color: rgba(0,0,0,0.6); margin-bottom: 4px;">
          <strong>📍 ${grave.cemeteryName}</strong>
        </div>
        <div style="font-size: 11px; color: rgba(0,0,0,0.5);">
          ${location}
        </div>
      </div>
    `;
  }

  ngOnDestroy(): void {
    this.watchSub?.unsubscribe();
  }
}
