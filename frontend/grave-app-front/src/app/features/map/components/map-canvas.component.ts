import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import 'leaflet.markercluster';

import { Grave } from '../../../shared/models/grave.model';
import { MapMarkerFactory } from '../services/map-marker.factory';
import { RoutePlannerService } from '../services/route-planner.service';

export type MapLayerKind = 'street' | 'satellite';

@Component({
  selector: 'app-map-canvas',
  imports: [LeafletModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      leaflet
      class="map-canvas"
      [leafletOptions]="mapOptions"
      (leafletMapReady)="onMapReady($event)"
    ></div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: absolute;
        inset: 0;
        z-index: 1;
      }

      .map-canvas {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class MapCanvasComponent implements OnDestroy {
  graves = input<Grave[]>([]);
  userCoords = input<GeolocationCoordinates | undefined>();
  activeLayer = input<MapLayerKind>('street');
  autoCenter = input<boolean>(true);

  graveClick = output<Grave>();
  manualDrag = output<void>();
  mapReady = output<L.Map>();

  private readonly markerFactory = inject(MapMarkerFactory);
  private readonly planner = inject(RoutePlannerService);

  private readonly streetLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom: 19, attribution: '&copy; OpenStreetMap' }
  );

  private readonly satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 22, attribution: 'Tiles &copy; Esri' }
  );

  mapOptions: L.MapOptions = {
    zoom: 19,
    center: L.latLng(52.2297, 21.0122),
    zoomControl: false,
    attributionControl: false,
    layers: [this.streetLayer],
  };

  private map?: L.Map;
  private userMarker?: L.Marker;
  private accuracyCircle?: L.Circle;
  private clusterGroup?: L.MarkerClusterGroup;
  private routeLine?: L.Polyline;
  private routeNumberMarkers: L.Marker[] = [];

  private currentLayer = signal<MapLayerKind>('street');

  constructor() {
    effect(() => this.syncLayer(this.activeLayer()));
    effect(() => this.syncUserPosition(this.userCoords()));
    effect(() => this.syncGraveMarkers(this.graves()));
    effect(() => this.syncRoute(this.planner.route()));
    effect(() => this.syncUserIcon(this.planner.nextWaypoint()));
  }

  onMapReady(map: L.Map): void {
    this.map = map;
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    map.on('dragstart', () => this.manualDrag.emit());

    this.syncGraveMarkers(this.graves());
    this.syncUserPosition(this.userCoords());
    this.syncRoute(this.planner.route());

    this.mapReady.emit(map);
  }

  invalidateSize(): void {
    this.map?.invalidateSize();
  }

  flyToUser(): void {
    const coords = this.userCoords();
    if (!this.map || !coords) return;
    this.map.flyTo([coords.latitude, coords.longitude], this.map.getZoom(), { duration: 0.6 });
  }

  // --- Effect handlers -------------------------------------------------

  private syncLayer(kind: MapLayerKind): void {
    if (!this.map || this.currentLayer() === kind) return;
    if (kind === 'satellite') {
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    }
    this.currentLayer.set(kind);
  }

  private syncUserPosition(coords: GeolocationCoordinates | undefined): void {
    if (!this.map || !coords) return;
    const latLng = L.latLng(coords.latitude, coords.longitude);

    if (!this.userMarker) {
      this.userMarker = L.marker(latLng, { zIndexOffset: 1000 }).addTo(this.map);
      this.userMarker.setIcon(this.markerFactory.userPin());
      this.accuracyCircle = L.circle(latLng, {
        radius: coords.accuracy,
        color: '#10b981',
        fillColor: '#34d399',
        fillOpacity: 0.12,
        weight: 1.5,
        opacity: 0.5,
      }).addTo(this.map);
    } else {
      this.userMarker.setLatLng(latLng);
      this.accuracyCircle?.setLatLng(latLng);
      this.accuracyCircle?.setRadius(coords.accuracy);
    }

    if (this.autoCenter()) {
      this.map.panTo(latLng, { animate: true, duration: 0.4 });
    }
  }

  private syncUserIcon(next: { arrowRotationDeg: number } | undefined): void {
    if (!this.userMarker) return;
    if (this.planner.isNavigating() && next) {
      this.userMarker.setIcon(this.markerFactory.userArrow(next.arrowRotationDeg));
    } else {
      this.userMarker.setIcon(this.markerFactory.userPin());
    }
  }

  private syncGraveMarkers(graves: Grave[]): void {
    if (!this.map) return;

    if (!this.clusterGroup) {
      this.clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 18,
        maxClusterRadius: 60,
        iconCreateFunction: (cluster) => this.markerFactory.cluster(cluster.getChildCount()),
      });
      this.map.addLayer(this.clusterGroup);
    } else {
      this.clusterGroup.clearLayers();
    }

    const markers = graves.map((grave) => {
      const marker = L.marker([grave.latitude, grave.longitude], {
        icon: this.markerFactory.grave(),
        title: this.titleFor(grave),
      });
      marker.on('click', () => this.graveClick.emit(grave));
      return marker;
    });

    this.clusterGroup.addLayers(markers);
  }

  private syncRoute(route: Grave[]): void {
    if (!this.map) return;
    this.clearRouteFromMap();

    if (route.length === 0) return;

    const coords = this.userCoords();
    if (!coords) return;

    const points: L.LatLngExpression[] = [
      [coords.latitude, coords.longitude],
      ...route.map((g) => [g.latitude, g.longitude] as L.LatLngExpression),
    ];

    this.routeLine = L.polyline(points, {
      color: '#6366f1',
      weight: 5,
      opacity: 0.85,
      dashArray: '10, 10',
      lineJoin: 'round',
      lineCap: 'round',
      smoothFactor: 0,
    }).addTo(this.map);
    this.routeLine.bringToBack();

    route.forEach((grave, index) => {
      if (!this.map) return;
      const marker = L.marker([grave.latitude, grave.longitude], {
        icon: this.markerFactory.routeNumber(index),
        zIndexOffset: 500,
      }).addTo(this.map);
      this.routeNumberMarkers.push(marker);
    });

    const bounds = L.latLngBounds(points);
    this.map.fitBounds(bounds, { padding: [60, 60] });
  }

  private clearRouteFromMap(): void {
    this.routeLine?.remove();
    this.routeLine = undefined;
    this.routeNumberMarkers.forEach((m) => m.remove());
    this.routeNumberMarkers = [];
  }

  private titleFor(grave: Grave): string {
    if (grave.deceasedPersons.length > 0) {
      const p = grave.deceasedPersons[0];
      return `${p.firstName} ${p.lastName}`;
    }
    return grave.cemeteryName;
  }

  ngOnDestroy(): void {
    this.clearRouteFromMap();
    this.clusterGroup?.clearLayers();
  }
}
