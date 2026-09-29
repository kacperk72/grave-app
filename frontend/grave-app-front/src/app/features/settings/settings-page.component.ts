import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { BackupService, ImportMode } from '../../core/services/backup.service';
import { GraveService } from '../graves/services/grave.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { pluralPl } from '../../shared/utils/grave-display';

interface StatusMessage {
  type: 'success' | 'error' | 'info';
  icon: IconName;
  text: string;
}

@Component({
  selector: 'app-settings-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  protected readonly theme = inject(ThemeService);
  private readonly backup = inject(BackupService);
  readonly graveService = inject(GraveService);
  readonly family = inject(FamilySyncService);

  readonly familyBusy = signal(false);
  readonly familyNote = signal<StatusMessage | null>(null);

  /** Jedna linijka stanu rodzinnej mapy pod jej nazwą. */
  readonly familyStatus = computed(() => {
    const pending = this.family.pending();
    const pendingText = `${pending} ${pluralPl(pending, 'zmiana czeka', 'zmiany czekają', 'zmian czeka')}`;
    switch (this.family.state()) {
      case 'syncing':
        return 'Synchronizuję…';
      case 'offline':
        return pending > 0 ? `Bez internetu · ${pendingText}` : 'Bez internetu';
      case 'error':
      case 'revoked':
        return this.family.errorMessage() ?? 'Błąd synchronizacji';
      default: {
        const at = this.family.lastSyncAt();
        const when = at ? `Zsynchronizowano ${relativeTime(at)}` : 'Połączono';
        return pending > 0 ? `${when} · ${pendingText}` : when;
      }
    }
  });

  readonly themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Jasny' },
    { value: 'dark', label: 'Ciemny' },
    { value: 'system', label: 'Systemowy' },
  ];

  readonly dataSummary = computed(() => {
    const graves = this.graveService.gravesCount();
    const photos = this.graveService.graves().reduce((sum, g) => sum + g.photos.length, 0);
    const parts = [`${graves} ${this.grobyWord(graves)}`];
    if (photos > 0) parts.push(`${photos} ${pluralPl(photos, 'zdjęcie', 'zdjęcia', 'zdjęć')}`);
    return parts.join(', ');
  });
  readonly busy = signal(false);
  readonly status = signal<StatusMessage | null>(null);

  /** Wersję zapisuje pipeline wydania do /version.json; lokalnie pliku nie ma. */
  readonly version = signal<string | null>(null);

  constructor() {
    fetch('/version.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((v: { sha?: string; date?: string } | null) => {
        if (!v?.sha) return;
        const date = v.date ? new Date(v.date).toLocaleDateString('pl-PL') : '';
        this.version.set([v.sha.slice(0, 7), date].filter(Boolean).join(' · '));
      })
      .catch(() => undefined);
  }

  private pendingMode: ImportMode = 'merge';

  async exportData(): Promise<void> {
    this.busy.set(true);
    this.status.set(null);
    try {
      const count = await this.backup.exportGraves();
      this.status.set({
        type: 'success',
        icon: 'check',
        text: `Wyeksportowano ${count} ${this.grobyWord(count)} do pliku.`,
      });
    } catch (err) {
      this.status.set({
        type: 'error',
        icon: 'alert',
        text: err instanceof Error ? err.message : 'Nie udało się wyeksportować danych.',
      });
    } finally {
      this.busy.set(false);
    }
  }

  triggerImport(mode: ImportMode, input: HTMLInputElement): void {
    this.pendingMode = mode;
    this.status.set(null);
    input.value = ''; // pozwól wybrać ten sam plik ponownie
    input.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.pendingMode === 'replace') {
      const scope = this.family.connected()
        ? ' Dotyczy całej rodzinnej mapy — groby znikną też u pozostałych osób.'
        : '';
      const confirmed = confirm(
        `Zastąpić wszystkie obecne groby zawartością pliku? Obecne dane zostaną usunięte i nie można tego cofnąć.${scope}`
      );
      if (!confirmed) {
        input.value = '';
        return;
      }
    }

    this.busy.set(true);
    try {
      const result = await this.backup.importGraves(file, this.pendingMode);
      const parts = [`Dodano ${result.added} ${this.grobyWord(result.added)}`];
      if (result.skippedExisting > 0) parts.push(`pominięto ${result.skippedExisting} już istniejących`);
      if (result.skippedInvalid > 0) parts.push(`${result.skippedInvalid} nieprawidłowych`);
      this.status.set({ type: 'success', icon: 'check', text: parts.join(', ') + '.' });
    } catch (err) {
      this.status.set({
        type: 'error',
        icon: 'alert',
        text: err instanceof Error ? err.message : 'Nie udało się wczytać pliku.',
      });
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  async createFamily(): Promise<void> {
    await this.runFamilyAction(async () => {
      await this.family.createSpace();
      this.familyNote.set({
        type: 'success',
        icon: 'check',
        text: 'Rodzinna mapa gotowa. Wyślij link bliskim, żeby do niej dołączyli.',
      });
    }, 'Nie udało się utworzyć mapy. Sprawdź internet i spróbuj ponownie.');
  }

  async shareFamily(): Promise<void> {
    await this.runFamilyAction(async () => {
      const result = await this.family.shareInvite();
      if (result === 'copied') {
        this.familyNote.set({
          type: 'success',
          icon: 'check',
          text: 'Link skopiowany — wklej go w wiadomości do rodziny.',
        });
      }
    }, 'Nie udało się udostępnić linku.');
  }

  async rotateFamilyLink(): Promise<void> {
    const ok = confirm(
      'Wygenerować nowy link? Stary przestanie działać — osoby, które go używają, będą potrzebowały nowego.'
    );
    if (!ok) return;
    await this.runFamilyAction(async () => {
      await this.family.rotateLink();
      this.familyNote.set({
        type: 'success',
        icon: 'check',
        text: 'Nowy link gotowy. Wyślij go osobom, które mają mieć dostęp.',
      });
    }, 'Nie udało się zmienić linku. Sprawdź internet.');
  }

  async leaveFamily(): Promise<void> {
    const pending = this.family.pending();
    const warning = pending > 0 ? ` ${pending} niewysłanych zmian nie trafi do rodziny.` : '';
    const ok = confirm(`Odłączyć ten telefon od rodzinnej mapy? Groby zostaną na nim jako kopia.${warning}`);
    if (!ok) return;
    await this.family.leave();
    this.familyNote.set(null);
  }

  private async runFamilyAction(action: () => Promise<void>, errorText: string): Promise<void> {
    this.familyBusy.set(true);
    this.familyNote.set(null);
    try {
      await action();
    } catch {
      this.familyNote.set({ type: 'error', icon: 'alert', text: errorText });
    } finally {
      this.familyBusy.set(false);
    }
  }

  private grobyWord(n: number): string {
    return pluralPl(n, 'grób', 'groby', 'grobów');
  }
}

function relativeTime(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60_000);
  if (diffMin < 1) return 'przed chwilą';
  if (diffMin < 60) return `${diffMin} min temu`;
  const date = new Date(ts);
  const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return `dziś o ${time}`;
  return `${date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} o ${time}`;
}
