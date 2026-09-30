import { Injectable } from '@angular/core';

import { MapLayerKind } from '../components/map-canvas.component';

export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

/**
 * Stan mapy, który przeżywa wyjście z ekranu mapy (np. do szczegółów grobu i edycji).
 * Ekran mapy jest przy każdym wejściu tworzony od nowa — bez tego po powrocie mapa
 * wracała do pozycji użytkownika zamiast do miejsca, które oglądał.
 * Trzymany tylko w pamięci: po ponownym uruchomieniu aplikacji mapa startuje od pozycji.
 */
@Injectable({ providedIn: 'root' })
export class MapViewStateService {
  view: MapView | null = null;
  autoCenter = true;
  layer: MapLayerKind = 'street';
  selectedGraveId: string | null = null;
}
