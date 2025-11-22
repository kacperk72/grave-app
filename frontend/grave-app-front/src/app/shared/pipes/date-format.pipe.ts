import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe do formatowania dat dla polskiej lokalizacji
 * Przykład użycia: {{ dateString | dateFormat }}
 * Wynik: "06.11.2025" lub "6 listopada 2025"
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: 'short' | 'long' | 'relative' = 'short'
  ): string {
    if (!value) {
      return '-';
    }

    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date.getTime())) {
      return '-';
    }

    if (format === 'short') {
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    if (format === 'long') {
      return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    // Relative format (np. "2 dni temu")
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Dzisiaj';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tygodni temu`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} miesięcy temu`;

    return `${Math.floor(diffDays / 365)} lat temu`;
  }
}
