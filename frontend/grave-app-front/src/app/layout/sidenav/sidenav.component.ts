import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidenav',
  imports: [MatListModule, MatIconModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sidenav-header">
      <mat-icon class="app-icon">location_on</mat-icon>
      <h2>GraveMap</h2>
      <p>Zarządzaj lokalizacjami grobów</p>
    </div>

    <mat-nav-list>
      <a mat-list-item routerLink="/map" routerLinkActive="active" (click)="close.emit()">
        <mat-icon matListItemIcon>map</mat-icon>
        <span matListItemTitle>Mapa</span>
      </a>
      <a mat-list-item routerLink="/graves" routerLinkActive="active" (click)="close.emit()">
        <mat-icon matListItemIcon>location_city</mat-icon>
        <span matListItemTitle>Lista Grobów</span>
      </a>
      <a mat-list-item routerLink="/settings" routerLinkActive="active" (click)="close.emit()">
        <mat-icon matListItemIcon>settings</mat-icon>
        <span matListItemTitle>Ustawienia</span>
      </a>
    </mat-nav-list>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        background: white;
      }

      .sidenav-header {
        padding: 24px 16px;
        background: linear-gradient(135deg, var(--primary-color) 0%, #2e7d32 100%);
        color: white;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);

        .app-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          margin-bottom: 8px;
        }

        h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 500;
        }

        p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
      }

      mat-nav-list {
        padding-top: 8px;
      }

      a[mat-list-item] {
        margin: 4px 8px;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          background-color: rgba(46, 125, 50, 0.08);
        }

        &.active {
          background-color: rgba(46, 125, 50, 0.12);
          color: var(--primary-color);

          mat-icon {
            color: var(--primary-color);
          }
        }
      }
    `,
  ],
})
export class SidenavComponent {
  close = output<void>();
}
