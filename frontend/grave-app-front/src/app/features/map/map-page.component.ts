import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { GeolocationService } from '../../core/services/geolocation.service';
import { GraveService } from '../graves/services/grave.service';
import { Grave } from '../../shared/models/grave.model';

import { MapCanvasComponent, MapLayerKind } from './components/map-canvas.component';
import { MapOverlayComponent } from './components/map-overlay.component';
import { RouteDrawerComponent } from './components/route-drawer.component';
import { GraveDetailsDialogComponent } from './components/grave-details-dialog.component';
import { GalleryDialogComponent, GalleryRef } from './components/gallery-dialog.component';
import { RoutePlannerService } from './services/route-planner.service';

@Component({
  selector: 'app-map-page',
  imports: [
    ToastModule,
    MapCanvasComponent,
    MapOverlayComponent,
    RouteDrawerComponent,
    GraveDetailsDialogComponent,
    GalleryDialogComponent,
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

      <app-route-drawer
        [(visible)]="isDrawerOpen"
        [graves]="graves()"
        [userCoords]="currentCoords()"
      />

      <app-grave-details-dialog
        [(visible)]="isDetailsOpen"
        [grave]="selectedGrave()"
        [userCoords]="currentCoords()"
        (navigate)="onNavigateToGrave($event)"
        (markVisited)="onMarkAsVisited($event)"
        (openGallery)="onOpenGallery($event)"
      />

      <app-gallery-dialog [(visible)]="isGalleryOpen" [active]="activeGallery()" />

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

  private readonly canvas = viewChild(MapCanvasComponent);

  readonly graves = computed(() => this.graveService.graves());

  readonly currentCoords = signal<GeolocationCoordinates | undefined>(undefined);
  readonly geoError = signal<string | undefined>(undefined);

  readonly activeLayer = signal<MapLayerKind>('street');
  readonly autoCenter = signal(true);
  readonly isFullscreen = signal(false);

  readonly isDrawerOpen = signal(false);
  readonly isDetailsOpen = signal(false);
  readonly isGalleryOpen = signal(false);

  readonly selectedGrave = signal<Grave | undefined>(undefined);
  readonly activeGallery = signal<GalleryRef | undefined>(undefined);

  private watchSub?: Subscription;

  constructor() {
    effect(() => {
      const coords = this.currentCoords();
      if (!coords) return;
      this.planner.refreshGuidance(coords.latitude, coords.longitude, coords.heading);
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
    this.isDetailsOpen.set(true);
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
    this.isDrawerOpen.update((v) => !v);
  }

  onOpenGallery(ref: { graveId: string; index: number }): void {
    this.activeGallery.set(ref);
    this.isGalleryOpen.set(true);
  }

  onNavigateToGrave(graveId: string): void {
    const grave = this.graveService.graves().find((g) => g.id === graveId);
    const coords = this.currentCoords();
    if (!grave) return;
    this.planner.setSingleDestination(grave, coords?.latitude, coords?.longitude);
    this.planner.startNavigation();
    this.isDrawerOpen.set(true);
  }

  async onMarkAsVisited(graveId: string): Promise<void> {
    try {
      await this.graveService.markAsVisited(graveId);
      const coords = this.currentCoords();
      this.planner.removeFromRoute(graveId, coords?.latitude, coords?.longitude);
      this.toast.add({
        severity: 'success',
        summary: 'Oznaczono jako odwiedzony',
        detail: 'Data wizyty została zapisana',
        life: 2500,
      });
      this.isDetailsOpen.set(false);
    } catch {
      this.toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się zapisać wizyty',
      });
    }
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
