import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  input,
  output,
  inject,
  computed,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { trigger, transition, style, animate } from '@angular/animations';

import { Grave, CreateGraveDto, UpdateGraveDto } from '../../../../shared/models/grave.model';

/**
 * Formularz dodawania/edycji grobu
 * Multi-step wizard dla lepszego UX
 */
@Component({
  selector: 'app-grave-form',
  templateUrl: './grave-form.component.html',
  styleUrls: ['./grave-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
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
  currentStep = signal(0);

  editMode = computed(() => !!this.grave());

  steps = [
    { index: 0, label: 'Lokalizacja' },
    { index: 1, label: 'Cmentarz' },
    { index: 2, label: 'Osoby' },
    { index: 3, label: 'Dodatkowe' },
  ];

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

  nextStep(): void {
    const currentStepValue = this.currentStep();

    // Validate current step
    if (currentStepValue === 0 && this.locationGroup.invalid) {
      this.locationGroup.markAllAsTouched();
      return;
    }
    if (currentStepValue === 1 && this.cemeteryGroup.invalid) {
      this.cemeteryGroup.markAllAsTouched();
      return;
    }
    if (currentStepValue === 2 && this.deceasedPersons.invalid) {
      this.deceasedPersons.markAllAsTouched();
      return;
    }

    if (currentStepValue < 3) {
      this.currentStep.set(currentStepValue + 1);
    }
  }

  previousStep(): void {
    const currentStepValue = this.currentStep();
    if (currentStepValue > 0) {
      this.currentStep.set(currentStepValue - 1);
    }
  }

  goToStep(index: number): void {
    if (this.canNavigateToStep(index)) {
      this.currentStep.set(index);
    }
  }

  canNavigateToStep(index: number): boolean {
    const currentStepValue = this.currentStep();

    // Can always go back
    if (index < currentStepValue) return true;

    // Can only go forward if previous steps are valid
    if (index > 0 && this.locationGroup.invalid) return false;
    if (index > 1 && this.cemeteryGroup.invalid) return false;
    if (index > 2 && this.deceasedPersons.invalid) return false;

    return true;
  }
}
