import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { RoutePlannerService } from '../services/route-planner.service';
import { MapLayerKind } from './map-canvas.component';

@Component({
  selector: 'app-map-overlay',
  imports: [DecimalPipe, ButtonModule, TagModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- GPS chip -->
    <div class="overlay overlay-top-left">
      @if (userCoords(); as coords) {
      <p-tag
        [severity]="severityFor(coords.accuracy)"
        [rounded]="true"
        pTooltip="Dokładność GPS"
        tooltipPosition="bottom"
      >
        <span class="gps-chip">
          <i
            class="pi"
            [class.pi-circle-fill]="coords.accuracy <= 5"
            [class.pi-circle]="coords.accuracy > 5"
          ></i>
          <span class="gps-chip__value">{{ coords.accuracy | number : '1.0-0' }} m</span>
          <span class="gps-chip__label">· {{ labelFor(coords.accuracy) }}</span>
        </span>
      </p-tag>
      } @else if (geoError()) {
      <p-tag severity="danger" [rounded]="true">
        <span class="gps-chip">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ geoError() }}</span>
        </span>
      </p-tag>
      } @else {
      <p-tag severity="info" [rounded]="true">
        <span class="gps-chip">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Szukam sygnału GPS…</span>
        </span>
      </p-tag>
      }
    </div>

    <!-- Top-right control stack -->
    <div class="overlay overlay-top-right">
      <p-button
        [rounded]="true"
        severity="secondary"
        styleClass="map-control"
        [icon]="activeLayer() === 'satellite' ? 'pi pi-map' : 'pi pi-globe'"
        [pTooltip]="activeLayer() === 'satellite' ? 'Mapa uliczna' : 'Satelita'"
        tooltipPosition="left"
        (onClick)="toggleLayer.emit()"
      />
      <p-button
        [rounded]="true"
        severity="secondary"
        styleClass="map-control"
        [icon]="isFullscreen() ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
        [pTooltip]="isFullscreen() ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'"
        tooltipPosition="left"
        (onClick)="toggleFullscreen.emit()"
      />
    </div>

    <!-- Bottom-right FAB stack -->
    <div class="overlay overlay-bottom-right">
      @if (planner.nextWaypoint(); as next) {
      <div class="next-hint">
        <i
          class="pi pi-arrow-up next-hint__arrow"
          [style.transform]="'rotate(' + next.arrowRotationDeg + 'deg)'"
        ></i>
        <div class="next-hint__text">
          <strong>{{ next.distanceMeters | number : '1.0-0' }} m</strong>
          <small>{{ next.grave.deceasedPersons[0]?.lastName || 'Następny grób' }}</small>
        </div>
      </div>
      }

      <p-button
        [rounded]="true"
        severity="success"
        styleClass="fab-primary"
        icon="pi pi-compass"
        [pTooltip]="autoCenter() ? 'Auto-centrowanie ON' : 'Wycentruj'"
        tooltipPosition="left"
        [disabled]="!userCoords()"
        (onClick)="centerOnUser.emit()"
      />

      <p-button
        [rounded]="true"
        severity="primary"
        styleClass="fab-secondary"
        icon="pi pi-directions"
        [badge]="routeBadge()"
        pTooltip="Trasa"
        tooltipPosition="left"
        (onClick)="toggleRoutePanel.emit()"
      />
    </div>
  `,
  styleUrl: './map-overlay.component.scss',
})
export class MapOverlayComponent {
  userCoords = input<GeolocationCoordinates | undefined>();
  geoError = input<string | undefined>();
  activeLayer = input<MapLayerKind>('street');
  isFullscreen = input<boolean>(false);
  autoCenter = input<boolean>(true);

  centerOnUser = output<void>();
  toggleLayer = output<void>();
  toggleFullscreen = output<void>();
  toggleRoutePanel = output<void>();

  readonly planner = inject(RoutePlannerService);

  routeBadge = computed(() => {
    const len = this.planner.route().length;
    return len > 0 ? String(len) : undefined;
  });

  severityFor(accuracy: number): 'success' | 'info' | 'warn' | 'danger' {
    if (accuracy <= 5) return 'success';
    if (accuracy <= 15) return 'info';
    if (accuracy <= 30) return 'warn';
    return 'danger';
  }

  labelFor(accuracy: number): string {
    if (accuracy <= 5) return 'Doskonała';
    if (accuracy <= 15) return 'Bardzo dobra';
    if (accuracy <= 30) return 'Dobra';
    return 'Słaba';
  }
}
