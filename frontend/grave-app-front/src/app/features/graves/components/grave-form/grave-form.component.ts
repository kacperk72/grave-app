import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';

import { Grave, CreateGraveDto, UpdateGraveDto } from '../../../../shared/models/grave.model';

@Component({
  selector: 'app-grave-form',
  templateUrl: './grave-form.component.html',
  styleUrls: ['./grave-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    IconFieldModule,
    InputIconModule,
    CardModule,
    MessageModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(16px)' }),
        animate('260ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
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
  loadingLocation = signal(false);
  submitting = signal(false);
  currentStep = signal(0);
  showPaymentInfo = signal(false);

  editMode = computed(() => !!this.grave());

  steps = [
    { index: 0, label: 'Lokalizacja', icon: 'pi-map-marker' },
    { index: 1, label: 'Cmentarz', icon: 'pi-building' },
    { index: 2, label: 'Osoby', icon: 'pi-users' },
    { index: 3, label: 'Dodatkowe', icon: 'pi-info-circle' },
  ];

  get locationGroup(): FormGroup {
    return this.graveForm.get('location') as FormGroup;
  }

  get cemeteryGroup(): FormGroup {
    return this.graveForm.get('cemetery') as FormGroup;
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

    if (grave.paymentDueDate || grave.lastPaymentAmount || grave.paymentPeriodMonths) {
      this.showPaymentInfo.set(true);
    }

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

  togglePaymentInfo(): void {
    const next = !this.showPaymentInfo();
    this.showPaymentInfo.set(next);
    if (!next) {
      this.graveForm.patchValue({
        paymentDueDate: null,
        lastPaymentAmount: null,
        paymentPeriodMonths: null,
      });
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.loadingLocation.set(true);
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
    } finally {
      this.loadingLocation.set(false);
    }
  }

  onSubmit(): void {
    if (this.graveForm.invalid) {
      this.graveForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

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
    this.submitting.set(false);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  nextStep(): void {
    const current = this.currentStep();

    if (current === 0 && this.locationGroup.invalid) {
      this.locationGroup.markAllAsTouched();
      return;
    }
    if (current === 1 && this.cemeteryGroup.invalid) {
      this.cemeteryGroup.markAllAsTouched();
      return;
    }
    if (current === 2 && this.deceasedPersons.invalid) {
      this.deceasedPersons.markAllAsTouched();
      return;
    }

    if (current < 3) {
      this.currentStep.set(current + 1);
    }
  }

  previousStep(): void {
    const current = this.currentStep();
    if (current > 0) this.currentStep.set(current - 1);
  }

  goToStep(index: number): void {
    if (this.canNavigateToStep(index)) {
      this.currentStep.set(index);
    }
  }

  canNavigateToStep(index: number): boolean {
    const current = this.currentStep();
    if (index < current) return true;
    if (index > 0 && this.locationGroup.invalid) return false;
    if (index > 1 && this.cemeteryGroup.invalid) return false;
    if (index > 2 && this.deceasedPersons.invalid) return false;
    return true;
  }
}
