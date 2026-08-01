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

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SliderModule } from 'primeng/slider';
import { DividerModule } from 'primeng/divider';

import { Grave } from '../../../shared/models/grave.model';
import { RoutePlannerService } from '../services/route-planner.service';

@Component({
  selector: 'app-route-drawer',
  imports: [DecimalPipe, FormsModule, ButtonModule, DrawerModule, SliderModule, DividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [(visible)]="visible"
      position="bottom"
      [modal]="false"
      [dismissible]="true"
      styleClass="route-drawer"
      [style]="{ height: 'auto', maxHeight: '70vh' }"
      [showCloseIcon]="true"
    >
      <ng-template #header>
        <div class="drawer-header">
          <i class="pi pi-directions"></i>
          <div>
            <h3>Planowanie trasy</h3>
            <small>Optymalna ścieżka przez groby</small>
          </div>
        </div>
      </ng-template>

      <div class="drawer-body">
        <div class="distance-row">
          <label for="maxDistance">
            Maksymalny promień: <strong>{{ maxRadius() }} km</strong>
          </label>
          <p-slider
            [ngModel]="maxRadius()"
            (ngModelChange)="onRadiusChange($event)"
            [min]="0.5"
            [max]="5"
            [step]="0.5"
            styleClass="distance-slider"
          />
        </div>

        <div class="action-row">
          <p-button
            severity="primary"
            [loading]="planner.isCalculating()"
            icon="pi pi-directions"
            label="Zaplanuj trasę"
            [disabled]="!hasUserCoords() || planner.isCalculating()"
            (onClick)="onPlan()"
            styleClass="action-row__main"
          />
          @if (planner.hasRoute()) {
          <p-button
            severity="secondary"
            [text]="true"
            icon="pi pi-times"
            label="Wyczyść"
            (onClick)="planner.clear()"
          />
          }
        </div>

        @if (planner.hasRoute()) {
        <p-divider />

        <div class="route-summary">
          <div class="summary-item">
            <i class="pi pi-flag-fill"></i>
            <div>
              <strong>{{ planner.route().length }}</strong>
              <span>{{ planner.route().length === 1 ? 'grób' : 'grobów' }}</span>
            </div>
          </div>
          <div class="summary-item">
            <i class="pi pi-map"></i>
            <div>
              <strong>{{ (planner.totalDistance() / 1000).toFixed(2) }}</strong>
              <span>km</span>
            </div>
          </div>
          <div class="summary-item">
            <i class="pi pi-clock"></i>
            <div>
              <strong>{{ walkingMinutes() }}</strong>
              <span>min</span>
            </div>
          </div>
        </div>

        @if (planner.nextWaypoint(); as next) {
        <div class="next-waypoint">
          <i
            class="pi pi-arrow-up bearing-icon"
            [style.transform]="'rotate(' + next.arrowRotationDeg + 'deg)'"
          ></i>
          <div class="next-waypoint__text">
            <small>NASTĘPNY GRÓB</small>
            <strong>
              {{ next.grave.deceasedPersons[0]?.firstName }}
              {{ next.grave.deceasedPersons[0]?.lastName }}
            </strong>
            <span>
              {{ next.distanceMeters | number : '1.0-0' }} m ·
              {{ next.bearingDeg | number : '1.0-0' }}°
            </span>
          </div>
        </div>
        }

        <div class="route-list">
          <h4>Kolejność odwiedzin</h4>
          <ol>
            @for (grave of planner.route(); track grave.id; let i = $index) {
            <li>
              <span class="bullet">{{ i + 1 }}</span>
              <div class="info">
                <strong>
                  {{ grave.deceasedPersons[0]?.firstName }}
                  {{ grave.deceasedPersons[0]?.lastName }}
                </strong>
                <small>{{ grave.cemeteryName }}</small>
              </div>
              <p-button
                [rounded]="true"
                [text]="true"
                severity="danger"
                size="small"
                icon="pi pi-times"
                (onClick)="onRemove(grave)"
              />
            </li>
            }
          </ol>
        </div>

        <p-button
          severity="success"
          icon="pi pi-play"
          label="Rozpocznij nawigację"
          styleClass="navigate-btn"
          (onClick)="onStartNavigation()"
        />
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

  walkingMinutes = computed(() =>
    ((this.planner.totalDistance() / 1000) * 12).toFixed(0)
  );

  maxRadius = computed(() => this.planner.maxRadiusKm);

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
