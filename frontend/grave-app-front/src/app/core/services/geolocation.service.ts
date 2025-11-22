import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private positionSubject = new Subject<GeolocationPosition>();
  private errorSubject = new Subject<GeolocationPositionError>();

  constructor() {}

  getCurrentPosition(): Observable<GeolocationPosition> {
    return new Observable((observer) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            observer.next(position);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          },
          {
            enableHighAccuracy: true, // Wymusza użycie GPS zamiast WiFi/cell towers
            timeout: 15000, // Zwiększony timeout dla GPS
            maximumAge: 0, // Zawsze pobieraj świeże dane
          }
        );
      } else {
        observer.error('Geolocation not supported');
      }
    });
  }

  watchPosition(): Observable<GeolocationPosition> {
    return new Observable((observer) => {
      let watchId: number;
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            this.positionSubject.next(position);
            observer.next(position);
          },
          (error) => {
            this.errorSubject.next(error);
            observer.error(error);
          },
          {
            enableHighAccuracy: true, // Wymusza GPS - najlepsza dostępna dokładność
            timeout: 15000, // 15 sekund na fix GPS
            maximumAge: 0, // Nie cache'uj pozycji, zawsze świeże dane
          }
        );
      } else {
        observer.error('Geolocation not supported');
      }

      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    });
  }
}
