import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { RoutePlannerService } from '../services/route-planner.service';
import { MapLayerKind } from './map-canvas.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { SpaceSwitcherComponent } from '../../../shared/components/space-switcher.component';

@Component({
  selector: 'app-map-overlay',
  imports: [DecimalPipe, IconComponent, SpaceSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Stan GPS + wskazówka do następnego grobu -->
    <div class="overlay overlay-top-left">
      <app-space-switcher />
      @if (userCoords(); as coords) {
      <span class="status-pill" title="Dokładność GPS">
        <span [class]="'dot dot--' + severityFor(coords.accuracy)"></span>
        ± {{ coords.accuracy | number : '1.0-0' }} m
        <span class="status-pill__label">· {{ labelFor(coords.accuracy) }}</span>
      </span>
      } @else if (geoError()) {
      <span class="status-pill status-pill--error">
        <app-icon name="alert" [size]="16" />
        {{ geoError() }}
      </span>
      } @else {
      <span class="status-pill">
        <span class="dot dot--wait"></span>
        Szukam sygnału GPS…
      </span>
      }

      @if (planner.nextWaypoint(); as next) {
      <div class="next-hint">
        <span class="next-hint__arrow" [style.transform]="'rotate(' + next.arrowRotationDeg + 'deg)'">
          <app-icon name="navigate" [size]="20" [stroke]="2" />
        </span>
        <span class="next-hint__text">
          <strong>{{ next.distanceMeters | number : '1.0-0' }} m</strong>
          <small>{{ next.grave.deceasedPersons[0]?.lastName || 'Następny grób' }}</small>
        </span>
      </div>
      }
    </div>

    <!-- Przyciski mapy -->
    <div class="overlay overlay-top-right">
      <button
        type="button"
        class="map-btn"
        [attr.aria-label]="activeLayer() === 'satellite' ? 'Mapa uliczna' : 'Zdjęcia satelitarne'"
        [title]="activeLayer() === 'satellite' ? 'Mapa uliczna' : 'Zdjęcia satelitarne'"
        (click)="toggleLayer.emit()"
      >
        <app-icon name="layers" />
      </button>
      <button
        type="button"
        class="map-btn"
        [attr.aria-label]="isFullscreen() ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'"
        [title]="isFullscreen() ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'"
        (click)="toggleFullscreen.emit()"
      >
        <app-icon [name]="isFullscreen() ? 'shrink' : 'expand'" />
      </button>
      <button
        type="button"
        class="map-btn"
        aria-label="Pokaż wszystkie groby"
        title="Pokaż wszystkie groby"
        [disabled]="gravesCount() === 0"
        (click)="showAllGraves.emit()"
      >
        <app-icon name="pins" />
      </button>
      <button
        type="button"
        class="map-btn"
        [class.map-btn--on]="autoCenter() && !!userCoords()"
        aria-label="Pokaż moją lokalizację"
        title="Pokaż moją lokalizację"
        [disabled]="!userCoords()"
        (click)="centerOnUser.emit()"
      >
        <app-icon name="locate" />
      </button>
      <button
        type="button"
        class="map-btn"
        aria-label="Trasa odwiedzin"
        title="Trasa odwiedzin"
        (click)="toggleRoutePanel.emit()"
      >
        <app-icon name="route" />
        @if (routeBadge(); as badge) {
        <span class="badge">{{ badge }}</span>
        }
      </button>
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
  gravesCount = input<number>(0);

  centerOnUser = output<void>();
  showAllGraves = output<void>();
  toggleLayer = output<void>();
  toggleFullscreen = output<void>();
  toggleRoutePanel = output<void>();

  readonly planner = inject(RoutePlannerService);

  routeBadge = computed(() => {
    const len = this.planner.route().length;
    return len > 0 ? String(len) : undefined;
  });

  severityFor(accuracy: number): 'good' | 'ok' | 'weak' {
    if (accuracy <= 15) return 'good';
    if (accuracy <= 30) return 'ok';
    return 'weak';
  }

  labelFor(accuracy: number): string {
    if (accuracy <= 5) return 'Doskonała';
    if (accuracy <= 15) return 'Bardzo dobra';
    if (accuracy <= 30) return 'Dobra';
    return 'Słaba';
  }
}
