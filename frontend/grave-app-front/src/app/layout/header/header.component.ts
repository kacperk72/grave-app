import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="toggleSidenav.emit()" aria-label="Toggle menu">
        <mat-icon>menu</mat-icon>
      </button>
      <a class="brand" routerLink="/" aria-label="GraveMap - strona główna">
        <img class="brand-logo" src="/graveMap-192x192.png" alt="" />
        <span class="title">GraveMap</span>
      </a>
      <span class="spacer"></span>
      <button mat-icon-button routerLink="/map" aria-label="Map">
        <mat-icon>map</mat-icon>
      </button>
    </mat-toolbar>
  `,
  styles: [
    `
      mat-toolbar {
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-left: 8px;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        user-select: none;
      }

      .brand-logo {
        width: 46px;
        height: 46px;
        display: block;
        object-fit: contain;
      }

      .spacer {
        flex: 1 1 auto;
      }

      .title {
        font-weight: 500;
        font-size: 18px;

        @media (max-width: 599px) {
          font-size: 16px;
        }
      }

      button[mat-icon-button] {
        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    `,
  ],
})
export class HeaderComponent {
  toggleSidenav = output<void>();
}
