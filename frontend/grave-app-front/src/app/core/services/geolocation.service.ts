import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const ACCURACY_REJECT_THRESHOLD_M = 80;
const EMA_ALPHA = 0.35;

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  getCurrentPosition(): Observable<GeolocationPosition> {
    return new Observable((observer) => {
      if (!('geolocation' in navigator)) {
        observer.error('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next(position);
          observer.complete();
        },
        (error) => observer.error(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  /**
   * Native watchPosition with two improvements:
   *  - drops samples with accuracy worse than 80m (urban-canyon noise)
   *  - applies exponential moving average to lat/lng so the marker stops jittering
   */
  watchPosition(): Observable<GeolocationPosition> {
    return new Observable((observer) => {
      if (!('geolocation' in navigator)) {
        observer.error('Geolocation not supported');
        return;
      }

      let smoothedLat: number | null = null;
      let smoothedLng: number | null = null;
      let hasFix = false;

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Always accept the first fix — even a coarse Wi-Fi/IP fix on
          // desktop is better than leaving the user with no position at all.
          // Only filter subsequent samples by accuracy.
          if (hasFix && position.coords.accuracy > ACCURACY_REJECT_THRESHOLD_M) {
            return;
          }
          hasFix = true;

          const { latitude, longitude } = position.coords;

          if (smoothedLat === null || smoothedLng === null) {
            smoothedLat = latitude;
            smoothedLng = longitude;
          } else {
            smoothedLat = EMA_ALPHA * latitude + (1 - EMA_ALPHA) * smoothedLat;
            smoothedLng = EMA_ALPHA * longitude + (1 - EMA_ALPHA) * smoothedLng;
          }

          // GeolocationCoordinates is read-only; build a shimmed object that satisfies
          // the consumer code while carrying smoothed lat/lng.
          const smoothed: GeolocationPosition = {
            timestamp: position.timestamp,
            coords: {
              ...position.coords,
              latitude: smoothedLat,
              longitude: smoothedLng,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              toJSON: () => ({ latitude: smoothedLat, longitude: smoothedLng }),
            } as GeolocationCoordinates,
            toJSON: () => ({}),
          };

          observer.next(smoothed);
        },
        (error) => observer.error(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    });
  }
}
