import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe do formatowania odległości
 * Przykład użycia: {{ distanceInMeters | distance }}
 * Wynik: "150 m" lub "2.5 km"
 */
@Pipe({
  name: 'distance',
  standalone: true,
})
export class DistancePipe implements PipeTransform {
  transform(meters: number | null | undefined, unit: 'metric' | 'imperial' = 'metric'): string {
    if (meters === null || meters === undefined) {
      return '-';
    }

    if (unit === 'imperial') {
      const feet = meters * 3.28084;
      if (feet < 1000) {
        return `${Math.round(feet)} ft`;
      }
      const miles = feet / 5280;
      return `${miles.toFixed(1)} mi`;
    }

    // Metric (default)
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }

    const kilometers = meters / 1000;
    return `${kilometers.toFixed(1)} km`;
  }
}
