import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { IconComponent } from '../../shared/components/icon.component';
import { markOnboardingSeen } from '../../core/services/onboarding';

@Component({
  selector: 'app-welcome-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="welcome">
      <svg
        class="scene"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <rect width="390" height="844" fill="#C9BDB0" />
        <circle cx="276" cy="262" r="62" fill="#E6D9C8" />
        <path d="M0 430C90 400 170 415 250 395S360 385 390 395V844H0Z" fill="#A39B8F" />
        <path d="M0 470C100 450 200 465 290 445S370 450 390 455V844H0Z" fill="#7C766C" />
        <path d="M150 482V466a11 11 0 0 1 22 0V482Z" fill="#B3AB9F" />
        <path d="M186 480V462a13 13 0 0 1 26 0V480Z" fill="#B3AB9F" />
        <path d="M228 478V466a10 10 0 0 1 20 0V478Z" fill="#B3AB9F" />
        <path d="M262 476V460a12 12 0 0 1 24 0V476Z" fill="#B3AB9F" />
        <path d="M52 486C44 420 52 320 62 250C72 320 80 420 72 486Z" fill="#3A3D34" />
        <path d="M92 488C86 440 92 370 100 326C108 370 114 440 108 488Z" fill="#3A3D34" />
        <path d="M322 474C314 420 322 344 332 296C342 344 350 420 342 474Z" fill="#3A3D34" />
        <path d="M354 476C350 440 354 390 360 356C366 390 370 440 366 476Z" fill="#3A3D34" />
        <path d="M0 510C120 495 260 505 390 492V844H0Z" fill="#23241F" />
        <rect x="196" y="484" width="12" height="18" rx="2" fill="#3A3D34" />
        <circle cx="202" cy="480" r="3.5" fill="#E7A95C" />
      </svg>

      <header class="top">
        <span class="brand">
          <span class="brand__mark"><app-icon name="flame" [size]="18" /></span>
          znajdzgroby.pl
        </span>
        <button type="button" class="skip" (click)="start()">Pomiń</button>
      </header>

      <div class="content">
        <h1>Zawsze trafisz do bliskich</h1>
        <p>
          Zapisz miejsce spoczynku z dokładnością GPS, dodaj zdjęcia i wracaj bez szukania —
          także bez internetu.
        </p>
        <button type="button" class="cta start" (click)="start()">
          Zaczynamy
          <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
        </button>
        <button type="button" class="import" (click)="importBackup()">
          Mam kopię od rodziny — wczytaj plik
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .welcome {
        position: relative;
        min-height: 100dvh;
        overflow: hidden;
        background: #23241f;
        color: #171715;
      }

      // Na szerokim ekranie scena mieści się w pionowej karcie, żeby ilustracja była widoczna
      @media (min-width: 600px) {
        :host {
          padding: 24px;
          background: var(--stone);
        }

        .welcome {
          max-width: 460px;
          min-height: min(calc(100dvh - 48px), 900px);
          margin: 0 auto;
          border-radius: var(--radius-xl);
        }
      }

      .scene {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .top {
        position: absolute;
        top: calc(24px + env(safe-area-inset-top, 0px));
        left: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;

        &__mark {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-pill);
          background: #171715;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      }

      .skip {
        padding: 10px 4px;
        border: none;
        background: none;
        color: #171715;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
      }

      .content {
        position: absolute;
        left: 24px;
        right: 24px;
        bottom: calc(32px + env(safe-area-inset-bottom, 0px));
        max-width: 480px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        color: #ffffff;

        h1 {
          margin: 0;
          font-size: 42px;
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        p {
          margin: 0 0 14px;
          font-size: 15px;
          line-height: 1.5;
          color: #c9c6bf;
        }
      }

      // Na ciemnym gruncie sceny przycisk jest zawsze jasny, niezależnie od motywu
      .start {
        height: 64px;
        padding-left: 28px;
        background: #ffffff;
        color: #171715;

        .cta__arrow {
          background: #171715;
          color: #ffffff;
        }
      }

      .import {
        align-self: center;
        padding: 8px;
        border: none;
        background: none;
        color: #e7e5df;
        font-size: 14px;
        font-weight: 500;
        text-decoration: underline;
        text-underline-offset: 3px;
        cursor: pointer;
      }
    `,
  ],
})
export class WelcomePageComponent {
  private readonly router = inject(Router);

  start(): void {
    markOnboardingSeen();
    this.router.navigate(['/start']);
  }

  importBackup(): void {
    markOnboardingSeen();
    this.router.navigate(['/settings']);
  }
}
