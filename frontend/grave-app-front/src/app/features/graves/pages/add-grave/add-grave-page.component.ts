import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { GraveFormComponent } from '../../components/grave-form/grave-form.component';
import { GraveService } from '../../services/grave.service';
import { CreateGraveDto } from '../../../../shared/models/grave.model';

/**
 * Strona dodawania nowego grobu
 */
@Component({
  selector: 'app-add-grave-page',
  imports: [GraveFormComponent, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="add-grave-page">
      <header class="page-header">
        <h1>Dodaj nowy grób</h1>
        <p>Wypełnij formularz aby zapisać lokalizację grobu</p>
      </header>

      <app-grave-form (save)="onSave($event)" (cancel)="onCancel()" />
    </div>
  `,
  styles: [
    `
      .add-grave-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 16px;
      }

      .page-header {
        margin-bottom: 32px;
        text-align: center;

        h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 500;
        }

        p {
          margin: 0;
          color: rgba(0, 0, 0, 0.6);
          font-size: 16px;
        }
      }

      @media (max-width: 600px) {
        .add-grave-page {
          padding: 8px;
        }

        .page-header h1 {
          font-size: 24px;
        }
      }
    `,
  ],
})
export class AddGravePageComponent {
  private readonly graveService = inject(GraveService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  async onSave(dto: CreateGraveDto | any): Promise<void> {
    try {
      const grave = await this.graveService.addGrave(dto as CreateGraveDto);

      this.snackBar.open('Grób został dodany pomyślnie', 'OK', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });

      // Przekieruj do listy lub szczegółów
      this.router.navigate(['/graves']);
    } catch (error) {
      console.error('Error adding grave:', error);
      this.snackBar.open('Wystąpił błąd podczas dodawania grobu', 'OK', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar'],
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/graves']);
  }
}
