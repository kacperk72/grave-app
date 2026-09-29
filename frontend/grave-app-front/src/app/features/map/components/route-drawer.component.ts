import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DrawerModule } from 'primeng/drawer';
import { SliderModule } from 'primeng/slider';

import { Grave } from '../../../shared/models/grave.model';
import { RoutePlannerService } from '../services/route-planner.service';
import { IconComponent } from '../../../shared/components/icon.component';
import { GravePhotoComponent } from '../../../shared/components/grave-photo.component';
import {
  graveTitle,
  placeLine,
  pluralPl,
  primaryPhotoUrl,
} from '../../../shared/utils/grave-display';

@Component({
  selector: 'app-route-drawer',
  imports: [DecimalPipe, FormsModule, DrawerModule, SliderModule, IconComponent, GravePhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [(visible)]="visible"
      position="bottom"
      [modal]="false"
      [dismissible]="true"
      styleClass="route-drawer"
      [style]="{ height: 'auto', maxHeight: '80vh' }"
      [showCloseIcon]="false"
    >
      <ng-template #header>
        <div class="head">
          <div class="head__text">
            <h2>Trasa odwiedzin</h2>
            <span>{{ summary() }}</span>
          </div>
          <button type="button" class="round-btn round-btn--sm close" aria-label="Zamknij" (click)="visible.set(false)">
            <app-icon name="close" [size]="18" />
          </button>
        </div>
      </ng-template>

      <div class="body">
        <div class="radius">
          <label for="routeRadius">
            Groby w promieniu <strong>{{ maxRadius() }} km</strong>
          </label>
          <p-slider
            inputId="routeRadius"
            [ngModel]="maxRadius()"
            (ngModelChange)="onRadiusChange($event)"
            [min]="0.5"
            [max]="5"
            [step]="0.5"
            styleClass="radius__slider"
          />
        </div>

        @if (!planner.hasRoute()) {
        <button
          type="button"
          class="cta plan"
          [disabled]="!hasUserCoords() || planner.isCalculating()"
          (click)="onPlan()"
        >
          {{ planner.isCalculating() ? 'Układam trasę…' : 'Zaplanuj najkrótszą trasę' }}
          <span class="cta__arrow"><app-icon name="route" [size]="20" /></span>
        </button>
        @if (!hasUserCoords()) {
        <p class="hint">Włącz lokalizację, żeby ułożyć trasę od miejsca, w którym stoisz.</p>
        } } @else {

        @if (planner.nextWaypoint(); as next) {
        <div class="next">
          <span class="next__arrow" [style.transform]="'rotate(' + next.arrowRotationDeg + 'deg)'">
            <app-icon name="navigate" [size]="22" [stroke]="2" />
          </span>
          <span class="next__text">
            <small>Następny grób</small>
            <strong>{{ titleOf(next.grave) }}</strong>
            <span>{{ next.distanceMeters | number : '1.0-0' }} m · {{ next.bearingDeg | number : '1.0-0' }}°</span>
          </span>
        </div>
        }

        <ol class="stops">
          @for (grave of planner.route(); track grave.id; let i = $index) {
          <li class="stop">
            <div class="stop__thumb">
              <app-grave-photo [src]="photoOf(grave)" [seed]="grave.id" />
              <span class="stop__num">{{ i + 1 }}</span>
            </div>
            <div class="stop__text">
              <strong>{{ titleOf(grave) }}</strong>
              <small>{{ placeOf(grave) }}</small>
            </div>
            <button
              type="button"
              class="stop__remove"
              [attr.aria-label]="'Usuń z trasy: ' + titleOf(grave)"
              (click)="onRemove(grave)"
            >
              <app-icon name="close" [size]="18" />
            </button>
          </li>
          }
        </ol>

        <div class="actions">
          <button type="button" class="pill-btn" (click)="planner.clear()">Wyczyść</button>
          <button type="button" class="cta start" (click)="onStartNavigation()">
            Nawiguj
            <span class="cta__arrow"><app-icon name="arrow-right" [size]="20" /></span>
          </button>
        </div>
        }
      </div>
    </p-drawer>
  `,
  styleUrl: './route-drawer.component.scss',
})
export class RouteDrawerComponent {
  visible = model<boolean>(false);
  graves = input<Grave[]>([]);
  userCoords = input<GeolocationCoordinates | undefined>();

  readonly planner = inject(RoutePlannerService);

  hasUserCoords = computed(() => !!this.userCoords());

  walkingMinutes = computed(() => Math.max(1, Math.round((this.planner.totalDistance() / 1000) * 12)));

  summary = computed(() => {
    if (!this.planner.hasRoute()) return 'Najkrótsza droga przez groby w pobliżu';
    const n = this.planner.route().length;
    const km = (this.planner.totalDistance() / 1000).toFixed(1).replace('.', ',');
    return `${n} ${pluralPl(n, 'grób', 'groby', 'grobów')} · ${km} km · ok. ${this.walkingMinutes()} min pieszo`;
  });

  maxRadius = computed(() => this.planner.maxRadiusKm);

  titleOf(grave: Grave): string {
    return graveTitle(grave);
  }

  placeOf(grave: Grave): string {
    return [grave.cemeteryName, placeLine(grave)].filter(Boolean).join(' · ');
  }

  photoOf(grave: Grave): string | undefined {
    return primaryPhotoUrl(grave);
  }

  onRadiusChange(value: number): void {
    this.planner.maxRadiusKm = value;
  }

  onPlan(): void {
    const coords = this.userCoords();
    if (!coords) return;
    this.planner.planOptimal(this.graves(), coords.latitude, coords.longitude);
  }

  onRemove(grave: Grave): void {
    const coords = this.userCoords();
    this.planner.removeFromRoute(grave.id, coords?.latitude, coords?.longitude);
  }

  onStartNavigation(): void {
    this.planner.startNavigation();
    this.visible.set(false);
  }
}
