import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { GeolocationService } from '../../core/services/geolocation.service';
import { GraveService } from '../graves/services/grave.service';
import { Grave } from '../../shared/models/grave.model';

import { MapCanvasComponent, MapLayerKind } from './components/map-canvas.component';
import { MapOverlayComponent } from './components/map-overlay.component';
import { RouteDrawerComponent } from './components/route-drawer.component';
import { MapGraveCardComponent } from './components/map-grave-card.component';
import { RoutePlannerService } from './services/route-planner.service';

@Component({
  selector: 'app-map-page',
  imports: [
    ToastModule,
    MapCanvasComponent,
    MapOverlayComponent,
    RouteDrawerComponent,
    MapGraveCardComponent,
  ],
  providers: [MessageService, RoutePlannerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-shell" [class.fullscreen]="isFullscreen()">
      <app-map-canvas
        [graves]="graves()"
        [userCoords]="currentCoords()"
        [activeLayer]="activeLayer()"
        [autoCenter]="autoCenter()"
        (graveClick)="onGraveClick($event)"
        (manualDrag)="onManualDrag()"
        (mapReady)="onMapReady()"
      />

      <app-map-overlay
        [userCoords]="currentCoords()"
        [geoError]="geoError()"
        [activeLayer]="activeLayer()"
        [isFullscreen]="isFullscreen()"
        [autoCenter]="autoCenter()"
        (centerOnUser)="centerOnUser()"
        (toggleLayer)="toggleLayer()"
        (toggleFullscreen)="toggleFullscreen()"
        (toggleRoutePanel)="toggleDrawer()"
      />

      @if (selectedGrave() && !isDrawerOpen()) {
      <app-map-grave-card
        [grave]="selectedGrave()"
        [userCoords]="currentCoords()"
        (close)="selectedGrave.set(undefined)"
        (navigate)="onNavigateToGrave($event)"
      />
      }

      <app-route-drawer
        [visible]="isDrawerOpen()"
        (visibleChange)="onDrawerVisibleChange($event)"
        [graves]="graves()"
        [userCoords]="currentCoords()"
      />

      <p-toast position="top-center" />
    </div>
  `,
  styleUrls: ['./map-page.component.scss'],
})
export class MapPageComponent implements OnDestroy {
  private readonly geolocation = inject(GeolocationService);
  private readonly graveService = inject(GraveService);
  private readonly toast = inject(MessageService);
  private readonly planner = inject(RoutePlannerService);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParamMap);

  private readonly canvas = viewChild(MapCanvasComponent);

  readonly graves = computed(() => this.graveService.graves());

  readonly currentCoords = signal<GeolocationCoordinates | undefined>(undefined);
  readonly geoError = signal<string | undefined>(undefined);

  readonly activeLayer = signal<MapLayerKind>('street');
  readonly autoCenter = signal(true);
  readonly isFullscreen = signal(false);

  readonly isDrawerOpen = signal(false);

  readonly selectedGrave = signal<Grave | undefined>(undefined);

  /** Grób z `?navigate=<id>`, do którego ruszamy, gdy tylko znane są groby i pozycja. */
  private pendingNavigateId: string | null = null;

  private watchSub?: Subscription;

  constructor() {
    effect(() => {
      const coords = this.currentCoords();
      if (!coords) return;
      this.planner.refreshGuidance(coords.latitude, coords.longitude, coords.heading);
    });

    // Zakładka „Trasa" w nawigacji otwiera szufladę przez ?panel=route,
    // a „Nawiguj" ze szczegółów grobu przekazuje ?navigate=<id>.
    effect(() => {
      const params = this.queryParams();
      const panel = params?.get('panel');
      const navigateId = params?.get('navigate');
      untracked(() => {
        this.isDrawerOpen.set(panel === 'route');
        if (navigateId) this.pendingNavigateId = navigateId;
      });
    });

    effect(() => {
      const graves = this.graves();
      const coords = this.currentCoords();
      const id = this.pendingNavigateId;
      if (!id || graves.length === 0) return;
      const grave = graves.find((g) => g.id === id);
      untracked(() => {
        if (!grave) {
          this.pendingNavigateId = null;
          return;
        }
        this.selectedGrave.set(grave);
        // Trasa wymaga pozycji — poczekaj na pierwszy odczyt GPS
        if (!coords) return;
        this.pendingNavigateId = null;
        this.onNavigateToGrave(grave.id);
      });
    });

    this.startTracking();
  }

  onMapReady(): void {
    // Canvas signals mapReady once Leaflet is mounted.
  }

  onManualDrag(): void {
    if (this.autoCenter()) {
      this.autoCenter.set(false);
    }
  }

  onGraveClick(grave: Grave): void {
    this.selectedGrave.set(grave);
  }

  centerOnUser(): void {
    this.canvas()?.flyToUser();
    this.autoCenter.set(true);
  }

  toggleLayer(): void {
    this.activeLayer.update((l) => (l === 'street' ? 'satellite' : 'street'));
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
    requestAnimationFrame(() => {
      this.canvas()?.invalidateSize();
      if (this.autoCenter()) {
        this.canvas()?.flyToUser();
      }
    });
  }

  toggleDrawer(): void {
    this.setDrawer(!this.isDrawerOpen());
  }

  onDrawerVisibleChange(visible: boolean): void {
    this.setDrawer(visible);
  }

  onNavigateToGrave(graveId: string): void {
    const grave = this.graveService.graves().find((g) => g.id === graveId);
    const coords = this.currentCoords();
    if (!grave) return;
    if (!coords) {
      this.toast.add({
        severity: 'info',
        summary: 'Czekam na sygnał GPS',
        detail: 'Trasa pojawi się, gdy aplikacja ustali twoją pozycję.',
        life: 3000,
      });
      this.pendingNavigateId = graveId;
      return;
    }
    this.planner.setSingleDestination(grave, coords.latitude, coords.longitude);
    this.planner.startNavigation();
    this.selectedGrave.set(undefined);
    this.setDrawer(true);
  }

  /** Stan szuflady trzymamy w adresie, żeby zakładka „Trasa" w nawigacji była aktywna. */
  private setDrawer(open: boolean): void {
    this.isDrawerOpen.set(open);
    this.router.navigate([], {
      queryParams: { panel: open ? 'route' : null, navigate: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private startTracking(): void {
    this.watchSub = this.geolocation.watchPosition().subscribe({
      next: (pos) => {
        this.geoError.set(undefined);
        this.currentCoords.set(pos.coords);
      },
      error: (err) => {
        this.geoError.set(err?.message || 'Brak dostępu do lokalizacji');
      },
    });
  }

  ngOnDestroy(): void {
    this.watchSub?.unsubscribe();
  }
}
