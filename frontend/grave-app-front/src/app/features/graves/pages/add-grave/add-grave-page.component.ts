import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { GraveFormComponent } from '../../components/grave-form/grave-form.component';
import { GraveService } from '../../services/grave.service';
import { CreateGraveDto, UpdateGraveDto } from '../../../../shared/models/grave.model';

@Component({
  selector: 'app-add-grave-page',
  imports: [GraveFormComponent, ToastModule, ButtonModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="add-grave-page">
      <header class="page-header">
        <p-button
          [text]="true"
          severity="secondary"
          icon="pi pi-arrow-left"
          label="Wróć"
          (onClick)="onCancel()"
          styleClass="back-btn"
        />
        <div>
          <h1>Dodaj nowy grób</h1>
          <p>Wypełnij formularz, aby zapisać lokalizację grobu</p>
        </div>
      </header>

      <app-grave-form (save)="onSave($event)" (cancel)="onCancel()" />

      <p-toast position="top-center" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .add-grave-page {
        max-width: 920px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-bottom: 28px;

        h1 {
          margin: 0 0 4px;
          font-family: var(--font-serif);
          font-size: 28px;
          font-weight: 600;
          color: var(--ink);
        }

        p {
          margin: 0;
          color: var(--ink-muted);
          font-size: 14px;
        }
      }

      @media (max-width: 600px) {
        .page-header {
          margin-bottom: 16px;

          h1 {
            font-size: 20px;
          }

          p {
            font-size: 13px;
          }
        }
      }
    `,
  ],
})
export class AddGravePageComponent {
  private readonly graveService = inject(GraveService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  async onSave(dto: CreateGraveDto | UpdateGraveDto): Promise<void> {
    try {
      await this.graveService.addGrave(dto as CreateGraveDto);
      this.toast.add({
        severity: 'success',
        summary: 'Dodano grób',
        detail: 'Lokalizacja zapisana pomyślnie',
        life: 2500,
      });
      setTimeout(() => this.router.navigate(['/graves']), 800);
    } catch (error) {
      console.error('Error adding grave:', error);
      this.toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się dodać grobu',
        life: 4000,
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/graves']);
  }
}
