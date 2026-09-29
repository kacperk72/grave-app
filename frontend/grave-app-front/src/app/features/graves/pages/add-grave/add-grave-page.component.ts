import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { GraveFormComponent } from '../../components/grave-form/grave-form.component';
import { GraveService } from '../../services/grave.service';
import { CreateGraveDto, UpdateGraveDto } from '../../../../shared/models/grave.model';

/** Dodawanie nowego grobu (`/graves/add`) i edycja istniejącego (`/graves/:id/edit`). */
@Component({
  selector: 'app-add-grave-page',
  imports: [GraveFormComponent, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!editId()) {
    <app-grave-form heading="Nowy grób" (save)="onSave($event)" (cancel)="onCancel()" />
    } @else if (grave(); as g) {
    <app-grave-form heading="Edycja grobu" [grave]="g" (save)="onSave($event)" (cancel)="onCancel()" />
    }
    <p-toast position="top-center" />
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class AddGravePageComponent {
  private readonly graveService = inject(GraveService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly editId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))));
  readonly grave = computed(() => {
    const id = this.editId();
    return id ? this.graveService.graves().find((g) => g.id === id) : undefined;
  });

  async onSave(dto: CreateGraveDto | UpdateGraveDto): Promise<void> {
    const id = this.editId();
    try {
      if (id) {
        await this.graveService.updateGrave(id, dto);
        this.router.navigate(['/graves', id], { replaceUrl: true });
        return;
      }
      const created = await this.graveService.addGrave(dto as CreateGraveDto);
      this.router.navigate(['/graves', created.id], { replaceUrl: true });
    } catch (error) {
      console.error('Error saving grave:', error);
      this.toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: id ? 'Nie udało się zapisać zmian' : 'Nie udało się dodać grobu',
        life: 4000,
      });
    }
  }

  onCancel(): void {
    const id = this.editId();
    this.router.navigate(id ? ['/graves', id] : ['/start']);
  }
}
