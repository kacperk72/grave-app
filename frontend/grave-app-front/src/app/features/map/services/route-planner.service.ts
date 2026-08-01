import { Injectable, computed, signal } from '@angular/core';

import { Grave } from '../../../shared/models/grave.model';

export interface WaypointGuidance {
  grave: Grave;
  distanceMeters: number;
  bearingDeg: number;
  arrowRotationDeg: number;
}

const EARTH_RADIUS_M = 6371e3;

@Injectable()
export class RoutePlannerService {
  private readonly _route = signal<Grave[]>([]);
  private readonly _totalDistance = signal(0);
  private readonly _nextWaypoint = signal<WaypointGuidance | undefined>(undefined);
  private readonly _isNavigating = signal(false);
  private readonly _isCalculating = signal(false);
  private readonly _maxRadiusKm = signal(1);

  readonly route = this._route.asReadonly();
  readonly totalDistance = this._totalDistance.asReadonly();
  readonly nextWaypoint = this._nextWaypoint.asReadonly();
  readonly isNavigating = this._isNavigating.asReadonly();
  readonly isCalculating = this._isCalculating.asReadonly();
  readonly hasRoute = computed(() => this._route().length > 0);

  get maxRadiusKm(): number {
    return this._maxRadiusKm();
  }

  set maxRadiusKm(value: number) {
    this._maxRadiusKm.set(value);
  }

  setSingleDestination(grave: Grave, originLat?: number, originLon?: number): void {
    this._route.set([grave]);
    this._totalDistance.set(this.computeTotalDistance([grave], originLat, originLon));
    this.refreshGuidance(originLat, originLon);
  }

  planOptimal(graves: Grave[], originLat: number, originLon: number): void {
    this._isCalculating.set(true);
    try {
      const maxMeters = this._maxRadiusKm() * 1000;
      const nearby = graves.filter(
        (g) => this.distance(originLat, originLon, g.latitude, g.longitude) <= maxMeters
      );

      if (nearby.length === 0) {
        this.clear();
        return;
      }

      const ordered = this.solveTSPNearestNeighbor(originLat, originLon, nearby);
      this._route.set(ordered);
      this._totalDistance.set(this.computeTotalDistance(ordered, originLat, originLon));
      this.refreshGuidance(originLat, originLon);
    } finally {
      this._isCalculating.set(false);
    }
  }

  removeFromRoute(graveId: string, originLat?: number, originLon?: number): void {
    const remaining = this._route().filter((g) => g.id !== graveId);

    if (remaining.length === 0) {
      this.clear();
      return;
    }

    if (originLat === undefined || originLon === undefined) {
      this._route.set(remaining);
      this._totalDistance.set(0);
      this._nextWaypoint.set(undefined);
      this._isNavigating.set(false);
      return;
    }

    const recalculated = this.solveTSPNearestNeighbor(originLat, originLon, remaining);
    this._route.set(recalculated);
    this._totalDistance.set(this.computeTotalDistance(recalculated, originLat, originLon));
    this.refreshGuidance(originLat, originLon);
  }

  clear(): void {
    this._route.set([]);
    this._totalDistance.set(0);
    this._nextWaypoint.set(undefined);
    this._isNavigating.set(false);
  }

  startNavigation(): void {
    if (this._route().length === 0) return;
    this._isNavigating.set(true);
  }

  /** Recompute the next-waypoint guidance based on the current user position. */
  refreshGuidance(originLat?: number, originLon?: number, heading?: number | null): void {
    const route = this._route();
    if (route.length === 0 || originLat === undefined || originLon === undefined) {
      this._nextWaypoint.set(undefined);
      return;
    }

    const next = route[0];
    const distanceMeters = this.distance(originLat, originLon, next.latitude, next.longitude);
    const bearingDeg = this.bearing(originLat, originLon, next.latitude, next.longitude);
    const arrowRotationDeg = this.arrowRotation(bearingDeg, heading);

    this._nextWaypoint.set({ grave: next, distanceMeters, bearingDeg, arrowRotationDeg });
  }

  // -- Math helpers (exposed for callers that need raw values) --

  distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  }

  private arrowRotation(bearingDeg: number, heading: number | null | undefined): number {
    if (
      this._isNavigating() &&
      heading !== null &&
      heading !== undefined &&
      !Number.isNaN(heading)
    ) {
      return (bearingDeg - heading + 360) % 360;
    }
    return bearingDeg;
  }

  private computeTotalDistance(
    route: Grave[],
    originLat?: number,
    originLon?: number
  ): number {
    if (route.length === 0) return 0;
    let total = 0;
    if (originLat !== undefined && originLon !== undefined) {
      total += this.distance(originLat, originLon, route[0].latitude, route[0].longitude);
    }
    for (let i = 0; i < route.length - 1; i++) {
      total += this.distance(
        route[i].latitude,
        route[i].longitude,
        route[i + 1].latitude,
        route[i + 1].longitude
      );
    }
    return total;
  }

  private solveTSPNearestNeighbor(
    startLat: number,
    startLon: number,
    graves: Grave[]
  ): Grave[] {
    if (graves.length === 0) return [];
    if (graves.length === 1) return graves.slice();

    const order: Grave[] = [];
    const unvisited = new Set(graves);
    let curLat = startLat;
    let curLon = startLon;

    while (unvisited.size > 0) {
      const nearest = this.findNearest(curLat, curLon, [...unvisited]);
      if (!nearest) break;
      order.push(nearest);
      unvisited.delete(nearest);
      curLat = nearest.latitude;
      curLon = nearest.longitude;
    }
    return order;
  }

  private findNearest(lat: number, lon: number, graves: Grave[]): Grave | null {
    if (graves.length === 0) return null;
    let best = graves[0];
    let bestD = this.distance(lat, lon, best.latitude, best.longitude);
    for (let i = 1; i < graves.length; i++) {
      const d = this.distance(lat, lon, graves[i].latitude, graves[i].longitude);
      if (d < bestD) {
        bestD = d;
        best = graves[i];
      }
    }
    return best;
  }
}
