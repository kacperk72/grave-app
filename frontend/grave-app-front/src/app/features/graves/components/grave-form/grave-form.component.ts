import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  input,
  output,
  inject,
  computed,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';

import { Grave, CreateGraveDto, UpdateGraveDto } from '../../../../shared/models/grave.model';

/**
 * Formularz dodawania/edycji grobu
 * Multi-step wizard dla lepszego UX
 */
@Component({
  selector: 'app-grave-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="graveForm" (ngSubmit)="onSubmit()">
      <mat-stepper [linear]="true" #stepper>
        <!-- Krok 1: Lokalizacja -->
        <mat-step [stepControl]="locationGroup" label="Lokalizacja">
          <div class="step-content">
            <h3>Lokalizacja grobu</h3>
            <p class="step-hint">Wprowadź współrzędne GPS lub użyj aktualnej lokalizacji</p>

            <div class="form-row" formGroupName="location">
              <mat-form-field appearance="outline">
                <mat-label>Szerokość geograficzna</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="latitude"
                  placeholder="52.2297"
                  step="0.000001"
                />
                @if (locationGroup.get('latitude')?.hasError('required')) {
                <mat-error>Pole wymagane</mat-error>
                } @if (locationGroup.get('latitude')?.hasError('min')) {
                <mat-error>Wartość musi być >= -90</mat-error>
                } @if (locationGroup.get('latitude')?.hasError('max')) {
                <mat-error>Wartość musi być <= 90</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Długość geograficzna</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="longitude"
                  placeholder="21.0122"
                  step="0.000001"
                />
                @if (locationGroup.get('longitude')?.hasError('required')) {
                <mat-error>Pole wymagane</mat-error>
                } @if (locationGroup.get('longitude')?.hasError('min')) {
                <mat-error>Wartość musi być >= -180</mat-error>
                } @if (locationGroup.get('longitude')?.hasError('max')) {
                <mat-error>Wartość musi być <= 180</mat-error>
                }
              </mat-form-field>
            </div>

            <button
              mat-raised-button
              type="button"
              color="accent"
              (click)="useCurrentLocation()"
              [disabled]="loadingLocation"
            >
              <mat-icon>my_location</mat-icon>
              {{ loadingLocation ? 'Pobieranie lokalizacji...' : 'Użyj aktualnej lokalizacji' }}
            </button>

            <div class="step-actions">
              <button mat-button type="button" (click)="onCancel()">Anuluj</button>
              <button mat-raised-button color="primary" matStepperNext type="button">Dalej</button>
            </div>
          </div>
        </mat-step>

        <!-- Krok 2: Informacje o cmentarzu -->
        <mat-step [stepControl]="cemeteryGroup" label="Cmentarz">
          <div class="step-content">
            <h3>Informacje o cmentarzu</h3>
            <p class="step-hint">Podaj nazwę cmentarza i lokalizację grobu</p>

            <div formGroupName="cemetery">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nazwa cmentarza</mat-label>
                <input matInput formControlName="cemeteryName" placeholder="Cmentarz Powązkowski" />
                @if (cemeteryGroup.get('cemeteryName')?.hasError('required')) {
                <mat-error>Pole wymagane</mat-error>
                }
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Sektor (opcjonalnie)</mat-label>
                  <input matInput formControlName="sector" placeholder="A" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Numer grobu (opcjonalnie)</mat-label>
                  <input matInput formControlName="graveNumber" placeholder="123" />
                </mat-form-field>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious type="button">Wstecz</button>
              <button mat-raised-button color="primary" matStepperNext type="button">Dalej</button>
            </div>
          </div>
        </mat-step>

        <!-- Krok 3: Osoby zmarłe -->
        <mat-step [stepControl]="deceasedGroup" label="Osoby zmarłe">
          <div class="step-content">
            <h3>Osoby pochowane</h3>
            <p class="step-hint">Dodaj informacje o osobach pochowanych w tym grobie</p>

            <div formArrayName="deceasedPersons">
              @for (person of deceasedPersons.controls; track i; let i = $index) {
              <mat-card class="person-card">
                <mat-card-header>
                  <mat-card-title>Osoba {{ i + 1 }}</mat-card-title>
                  @if (deceasedPersons.length > 1) {
                  <button mat-icon-button type="button" (click)="removePerson(i)" color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                  }
                </mat-card-header>

                <mat-card-content [formGroupName]="i">
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Imię</mat-label>
                      <input matInput formControlName="firstName" placeholder="Jan" />
                      @if (person.get('firstName')?.hasError('required')) {
                      <mat-error>Pole wymagane</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Nazwisko</mat-label>
                      <input matInput formControlName="lastName" placeholder="Kowalski" />
                      @if (person.get('lastName')?.hasError('required')) {
                      <mat-error>Pole wymagane</mat-error>
                      }
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Data urodzenia</mat-label>
                      <input
                        matInput
                        [matDatepicker]="birthPicker"
                        formControlName="birthDate"
                        placeholder="DD.MM.RRRR"
                      />
                      <mat-datepicker-toggle matSuffix [for]="birthPicker"></mat-datepicker-toggle>
                      <mat-datepicker #birthPicker></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Data śmierci</mat-label>
                      <input
                        matInput
                        [matDatepicker]="deathPicker"
                        formControlName="deathDate"
                        placeholder="DD.MM.RRRR"
                      />
                      <mat-datepicker-toggle matSuffix [for]="deathPicker"></mat-datepicker-toggle>
                      <mat-datepicker #deathPicker></mat-datepicker>
                    </mat-form-field>
                  </div>
                </mat-card-content>
              </mat-card>
              }
            </div>

            <button mat-stroked-button type="button" (click)="addPerson()" class="add-person-btn">
              <mat-icon>add</mat-icon>
              Dodaj kolejną osobę
            </button>

            <div class="step-actions">
              <button mat-button matStepperPrevious type="button">Wstecz</button>
              <button mat-raised-button color="primary" matStepperNext type="button">Dalej</button>
            </div>
          </div>
        </mat-step>

        <!-- Krok 4: Dodatkowe informacje -->
        <mat-step label="Dodatkowe">
          <div class="step-content">
            <h3>Dodatkowe informacje</h3>
            <p class="step-hint">Notatki i informacje o płatnościach (opcjonalnie)</p>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notatki</mat-label>
              <textarea
                matInput
                formControlName="notes"
                rows="4"
                placeholder="Np. Przy dużym dębie, w pobliżu kaplicy..."
              ></textarea>
            </mat-form-field>

            <h4>Płatności za miejsce</h4>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Data wygaśnięcia opłaty</mat-label>
                <input
                  matInput
                  [matDatepicker]="paymentPicker"
                  formControlName="paymentDueDate"
                  placeholder="DD.MM.RRRR"
                />
                <mat-datepicker-toggle matSuffix [for]="paymentPicker"></mat-datepicker-toggle>
                <mat-datepicker #paymentPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Kwota ostatniej płatności</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="lastPaymentAmount"
                  placeholder="500"
                />
                <span matSuffix>PLN</span>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Okres opłaty (miesiące)</mat-label>
              <input
                matInput
                type="number"
                formControlName="paymentPeriodMonths"
                placeholder="12"
              />
              <mat-hint>Na ile miesięcy została uiszczona opłata</mat-hint>
            </mat-form-field>

            <div class="step-actions">
              <button mat-button matStepperPrevious type="button">Wstecz</button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="graveForm.invalid || submitting"
              >
                <mat-icon>{{ editMode() ? 'save' : 'add_location' }}</mat-icon>
                {{ submitting ? 'Zapisywanie...' : editMode() ? 'Zapisz zmiany' : 'Dodaj grób' }}
              </button>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </form>
  `,
  styles: [
    `
      form {
        max-width: 800px;
        margin: 0 auto;
      }

      .step-content {
        padding: 24px 0;

        h3 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 500;
        }

        .step-hint {
          margin: 0 0 24px 0;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }

      .full-width {
        width: 100%;
      }

      .person-card {
        margin-bottom: 16px;

        mat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      }

      .add-person-btn {
        width: 100%;
        margin-bottom: 24px;
      }

      .step-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
      }

      h4 {
        margin: 24px 0 16px 0;
        font-size: 16px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.87);
      }
    `,
  ],
})
export class GraveFormComponent implements OnInit {
  grave = input<Grave>();
  save = output<CreateGraveDto | UpdateGraveDto>();
  cancel = output<void>();

  private fb = inject(FormBuilder);

  graveForm!: FormGroup;
  loadingLocation = false;
  submitting = false;

  editMode = computed(() => !!this.grave());

  get locationGroup(): FormGroup {
    return this.graveForm.get('location') as FormGroup;
  }

  get cemeteryGroup(): FormGroup {
    return this.graveForm.get('cemetery') as FormGroup;
  }

  get deceasedGroup(): FormGroup {
    return this.graveForm.get('deceased') as FormGroup;
  }

  get deceasedPersons(): FormArray {
    return this.graveForm.get('deceasedPersons') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    if (this.grave()) {
      this.patchFormValues();
    }
  }

  private initForm(): void {
    this.graveForm = this.fb.group({
      location: this.fb.group({
        latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
        longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
        accuracy: [null],
      }),
      cemetery: this.fb.group({
        cemeteryName: ['', Validators.required],
        sector: [''],
        graveNumber: [''],
      }),
      deceasedPersons: this.fb.array([this.createPersonGroup()]),
      notes: [''],
      paymentDueDate: [null],
      lastPaymentAmount: [null, Validators.min(0)],
      paymentPeriodMonths: [null, [Validators.min(1), Validators.max(600)]],
      currency: ['PLN'],
    });
  }

  private createPersonGroup(): FormGroup {
    return this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: [null],
      deathDate: [null],
    });
  }

  private patchFormValues(): void {
    const grave = this.grave();
    if (!grave) return;

    this.graveForm.patchValue({
      location: {
        latitude: grave.latitude,
        longitude: grave.longitude,
        accuracy: grave.accuracy,
      },
      cemetery: {
        cemeteryName: grave.cemeteryName,
        sector: grave.sector,
        graveNumber: grave.graveNumber,
      },
      notes: grave.notes,
      paymentDueDate: grave.paymentDueDate ? new Date(grave.paymentDueDate) : null,
      lastPaymentAmount: grave.lastPaymentAmount,
      paymentPeriodMonths: grave.paymentPeriodMonths,
      currency: grave.currency,
    });

    // Zastąp deceased persons
    this.deceasedPersons.clear();
    grave.deceasedPersons.forEach((person) => {
      this.deceasedPersons.push(
        this.fb.group({
          firstName: [person.firstName, Validators.required],
          lastName: [person.lastName, Validators.required],
          birthDate: [person.birthDate ? new Date(person.birthDate) : null],
          deathDate: [person.deathDate ? new Date(person.deathDate) : null],
        })
      );
    });
  }

  addPerson(): void {
    this.deceasedPersons.push(this.createPersonGroup());
  }

  removePerson(index: number): void {
    if (this.deceasedPersons.length > 1) {
      this.deceasedPersons.removeAt(index);
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.loadingLocation = true;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      this.locationGroup.patchValue({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Nie udało się pobrać lokalizacji. Sprawdź uprawnienia GPS.');
    } finally {
      this.loadingLocation = false;
    }
  }

  onSubmit(): void {
    if (this.graveForm.invalid) {
      this.graveForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const formValue = this.graveForm.value;
    const dto: CreateGraveDto | UpdateGraveDto = {
      latitude: formValue.location.latitude,
      longitude: formValue.location.longitude,
      accuracy: formValue.location.accuracy,
      cemeteryName: formValue.cemetery.cemeteryName,
      sector: formValue.cemetery.sector || undefined,
      graveNumber: formValue.cemetery.graveNumber || undefined,
      notes: formValue.notes || undefined,
      paymentDueDate: formValue.paymentDueDate
        ? new Date(formValue.paymentDueDate).toISOString()
        : undefined,
      lastPaymentAmount: formValue.lastPaymentAmount || undefined,
      paymentPeriodMonths: formValue.paymentPeriodMonths || undefined,
      currency: formValue.currency || 'PLN',
      deceasedPersons: formValue.deceasedPersons.map((person: any) => ({
        firstName: person.firstName,
        lastName: person.lastName,
        birthDate: person.birthDate ? new Date(person.birthDate).toISOString() : null,
        deathDate: person.deathDate ? new Date(person.deathDate).toISOString() : null,
      })),
    };

    this.save.emit(dto);
    this.submitting = false;
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
