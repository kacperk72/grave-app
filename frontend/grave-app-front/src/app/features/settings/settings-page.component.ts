import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { BackupService, ImportMode } from '../../core/services/backup.service';
import { GraveService } from '../graves/services/grave.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { SpaceService } from '../../core/services/space.service';
import { AvatarStackComponent } from '../../shared/components/avatar.component';
import { LOCAL_SPACE_ID } from '../../shared/models/space.model';
import { syncStatusText } from '../../shared/utils/sync-status';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { pluralPl } from '../../shared/utils/grave-display';

interface StatusMessage {
  type: 'success' | 'error' | 'info';
  icon: IconName;
  text: string;
}

@Component({
  selector: 'app-settings-page',
  imports: [IconComponent, RouterLink, AvatarStackComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  protected readonly theme = inject(ThemeService);
  private readonly backup = inject(BackupService);
  readonly graveService = inject(GraveService);
  readonly family = inject(FamilySyncService);

  readonly spaces = inject(SpaceService);

  /** Rodzinne mapy w tym telefonie — wiersze listy z nazwą, stanem i awatarami. */
  readonly mapRows = computed(() =>
    this.spaces.sharedSpaces().map((s) => {
      const sync = this.family.syncOf(s.id);
      return {
        id: s.id,
        name: s.name,
        active: s.id === this.spaces.activeSpaceId(),
        people: this.spaces.members()[s.id] ?? [],
        status:
          s.status === 'needs-profile' ? 'Czeka na twój podpis' : syncStatusText(sync, s.syncedAt),
        error: ['error', 'revoked', 'removed'].includes(sync.state),
      };
    })
  );

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
      const active = this.spaces.activeSpace();
      const scope =
        active && active.id !== LOCAL_SPACE_ID
          ? ` Dotyczy całej mapy „${active.name}" — groby znikną też u pozostałych osób.`
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

  private grobyWord(n: number): string {
    return pluralPl(n, 'grób', 'groby', 'grobów');
  }
}
