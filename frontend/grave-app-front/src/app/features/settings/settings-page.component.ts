import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';

import { ThemeService } from '../../core/services/theme.service';
import { BackupService, ImportMode } from '../../core/services/backup.service';
import { GraveService } from '../graves/services/grave.service';

interface StatusMessage {
  type: 'success' | 'error' | 'info';
  icon: string;
  text: string;
}

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, CardModule, ButtonModule, ToggleSwitchModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings">
      <header class="page-header">
        <span class="eyebrow">Konfiguracja</span>
        <h1>Ustawienia</h1>
        <p>Dane offline, kopie zapasowe i wygląd aplikacji.</p>
      </header>

      <p-card>
        <ng-template #title>
          <span class="card-title"><i class="pi pi-cloud"></i> Dane offline</span>
        </ng-template>

        <ul class="settings-list">
          <li>
            <div class="info">
              <strong>Praca offline</strong>
              <small>Aplikacja buforuje mapy i dane grobów na urządzeniu.</small>
            </div>
            <p-tag severity="success" value="Aktywne" />
          </li>
          <li>
            <div class="info">
              <strong>Automatyczna synchronizacja</strong>
              <small>Wyślij zmiany do chmury, gdy wróci internet.</small>
            </div>
            <p-tag severity="secondary" value="Wkrótce" />
          </li>
        </ul>
      </p-card>

      <p-card>
        <ng-template #title>
          <span class="card-title"><i class="pi pi-database"></i> Twoje dane</span>
        </ng-template>

        <p class="muted">
          Zapisz wszystkie groby do pliku, aby zrobić kopię lub udostępnić mapę rodzinie.
          Import wczytuje groby z takiego pliku.
        </p>

        <div class="data-actions">
          <p-button
            icon="pi pi-share-alt"
            label="Eksportuj / udostępnij"
            [disabled]="busy() || graveService.gravesCount() === 0"
            (onClick)="exportData()"
            styleClass="export-btn"
          />
          <p-button
            icon="pi pi-file-import"
            label="Wczytaj z pliku"
            [outlined]="true"
            [disabled]="busy()"
            (onClick)="triggerImport('merge', fileInput)"
          />
        </div>

        <button
          type="button"
          class="replace-link"
          [disabled]="busy()"
          (click)="triggerImport('replace', fileInput)"
        >
          Zastąp wszystko z pliku…
        </button>

        <input
          #fileInput
          type="file"
          accept="application/json,.json"
          hidden
          (change)="onFileSelected($event)"
        />

        @if (status(); as msg) {
        <div
          class="status"
          [class.success]="msg.type === 'success'"
          [class.error]="msg.type === 'error'"
          [class.info]="msg.type === 'info'"
        >
          <i class="pi {{ msg.icon }}"></i>
          <span>{{ msg.text }}</span>
        </div>
        }
      </p-card>

      <p-card>
        <ng-template #title>
          <span class="card-title"><i class="pi pi-moon"></i> Wygląd</span>
        </ng-template>

        <ul class="settings-list">
          <li>
            <div class="info">
              <strong>Tryb ciemny</strong>
              <small>Łagodniejszy dla oczu po zmroku.</small>
            </div>
            <p-toggleswitch [ngModel]="isDark()" (onChange)="theme.toggle()" />
          </li>
        </ul>
      </p-card>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .settings {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-width: 780px;
        margin: 0 auto;
      }

      .page-header h1 {
        margin: 6px 0 0;
        font-family: var(--font-serif);
        font-size: 32px;
        font-weight: 600;
        color: var(--ink);
      }

      .page-header p {
        margin: 6px 0 0;
        color: var(--ink-muted);
        font-size: 14px;
      }

      .card-title {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-serif);
        font-size: 19px;
        font-weight: 600;
        color: var(--ink);

        i {
          color: var(--sage);
          font-size: 17px;
        }
      }

      .settings-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;

        li {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--paper);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
        }

        .info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;

          strong {
            font-size: 15px;
            color: var(--ink);
          }

          small {
            font-size: 12.5px;
            color: var(--ink-muted);
          }
        }
      }

      .muted {
        color: var(--ink-muted);
        margin: 0 0 14px;
        font-size: 14px;
      }

      .data-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;

        @media (max-width: 480px) {
          flex-direction: column;
        }
      }

      :host ::ng-deep .data-actions .p-button {
        width: 100%;
      }

      :host ::ng-deep .data-actions .export-btn .p-button {
        background: var(--copper);
        border-color: var(--copper);
        color: #fbf9f3;
      }

      .replace-link {
        margin-top: 12px;
        padding: 4px 0;
        background: none;
        border: none;
        color: var(--ink-muted);
        font: inherit;
        font-size: 13px;
        text-decoration: underline;
        text-underline-offset: 3px;
        cursor: pointer;

        &:hover:not(:disabled) {
          color: var(--danger);
        }

        &:disabled {
          opacity: 0.5;
          cursor: default;
        }
      }

      .status {
        margin-top: 14px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        line-height: 1.4;

        i {
          font-size: 14px;
          margin-top: 1px;
          flex-shrink: 0;
        }

        &.success {
          background: color-mix(in srgb, var(--forest) 14%, var(--surface));
          color: var(--forest-strong);
        }

        &.info {
          background: var(--copper-tint);
          color: var(--copper-ink);
        }

        &.error {
          background: var(--danger-tint);
          color: var(--danger);
        }
      }
    `,
  ],
})
export class SettingsPageComponent {
  protected readonly theme = inject(ThemeService);
  private readonly backup = inject(BackupService);
  readonly graveService = inject(GraveService);

  readonly isDark = computed(() => this.theme.mode() === 'dark');
  readonly busy = signal(false);
  readonly status = signal<StatusMessage | null>(null);

  private pendingMode: ImportMode = 'merge';

  async exportData(): Promise<void> {
    this.busy.set(true);
    this.status.set(null);
    try {
      const count = await this.backup.exportGraves();
      this.status.set({
        type: 'success',
        icon: 'pi-check-circle',
        text: `Wyeksportowano ${count} ${this.grobyWord(count)} do pliku.`,
      });
    } catch (err) {
      this.status.set({
        type: 'error',
        icon: 'pi-exclamation-triangle',
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
      const confirmed = confirm(
        'Zastąpić wszystkie obecne groby zawartością pliku? Obecne dane zostaną usunięte i nie można tego cofnąć.'
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
      this.status.set({ type: 'success', icon: 'pi-check-circle', text: parts.join(', ') + '.' });
    } catch (err) {
      this.status.set({
        type: 'error',
        icon: 'pi-exclamation-triangle',
        text: err instanceof Error ? err.message : 'Nie udało się wczytać pliku.',
      });
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  private grobyWord(n: number): string {
    if (n === 1) return 'grób';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'groby';
    return 'grobów';
  }
}
