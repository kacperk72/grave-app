import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-settings-page',
  imports: [MatListModule, MatSlideToggleModule, MatCardModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="settings">
      <mat-card>
        <mat-card-title>Synchronizacja i kopie zapasowe</mat-card-title>
        <mat-card-content>
          <mat-list>
            <mat-list-item>
              <div matListItemTitle>Praca offline</div>
              <div matListItemLine>Aplikacja buforuje mapy i dane grobów na urządzeniu.</div>
              <mat-slide-toggle color="primary" checked disabled>Aktywne</mat-slide-toggle>
            </mat-list-item>
            <mat-list-item>
              <div matListItemTitle>Automatyczna synchronizacja</div>
              <div matListItemLine>Wyślij zmiany do chmury gdy pojawi się internet.</div>
              <mat-slide-toggle color="primary" disabled>Wkrótce</mat-slide-toggle>
            </mat-list-item>
          </mat-list>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-title>Eksport danych</mat-card-title>
        <mat-card-content>
          <p>Pobierz kopię wszystkich zapisanych lokalizacji w formacie JSON.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" disabled>Eksportuj (wkrótce)</button>
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .settings {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      mat-list-item {
        align-items: center;
      }

      mat-slide-toggle {
        margin-left: auto;
      }
    `,
  ],
})
export class SettingsPageComponent {}
