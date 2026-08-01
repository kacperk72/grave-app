import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';

import { ThemeService } from '../../core/services/theme.service';

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
          <span class="card-title"><i class="pi pi-download"></i> Twoje dane</span>
        </ng-template>

        <p class="muted">Pobierz kopię wszystkich zapisanych lokalizacji w formacie JSON.</p>

        <p-button
          icon="pi pi-file-export"
          label="Eksportuj dane do pliku (wkrótce)"
          [disabled]="true"
          styleClass="export-btn"
        />
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

      :host ::ng-deep .export-btn {
        width: 100%;
      }

      :host ::ng-deep .export-btn .p-button {
        width: 100%;
        background: var(--copper);
        border-color: var(--copper);
        color: #fbf9f3;
      }
    `,
  ],
})
export class SettingsPageComponent {
  protected readonly theme = inject(ThemeService);
  readonly isDark = computed(() => this.theme.mode() === 'dark');
}
