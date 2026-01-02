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

  watchPosition(options?: { intervalMs?: number }): Observable<GeolocationPosition> {
    // Jeśli podano intervalMs, użyj odpytywania co N ms (np. co 5s)
    if (options?.intervalMs && options.intervalMs > 0) {
      return new Observable((observer) => {
        if (!('geolocation' in navigator)) {
          observer.error('Geolocation not supported');
          return;
        }

        let inProgress = false;

        const tick = () => {
          if (inProgress) return;
          inProgress = true;
          navigator.geolocation.getCurrentPosition(
            (position) => {
              inProgress = false;
              this.positionSubject.next(position);
              observer.next(position);
            },
            (error) => {
              inProgress = false;
              this.errorSubject.next(error);
              observer.error(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        };

        // od razu pierwsza próba
        tick();
        const id = window.setInterval(tick, options.intervalMs);

        return () => {
          window.clearInterval(id);
        };
      });
    }

    // Domyślnie: natywny watchPosition (częstotliwość zależy od urządzenia/przeglądarki)
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
