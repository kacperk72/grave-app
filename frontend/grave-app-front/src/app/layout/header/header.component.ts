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
      <span class="title" routerLink="/">GraveMap</span>
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

      .spacer {
        flex: 1 1 auto;
      }

      .title {
        margin-left: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 18px;
        user-select: none;

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
