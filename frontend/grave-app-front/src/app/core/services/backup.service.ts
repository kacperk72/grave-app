import { Injectable, inject } from '@angular/core';

import { IndexedDbService } from './indexeddb.service';
import { SpaceService } from './space.service';
import { GraveService } from '../../features/graves/services/grave.service';
import { parseBackup, partitionByExisting, serializeBackup } from '../../shared/utils/grave-backup';

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  added: number;
  skippedExisting: number;
  skippedInvalid: number;
}

/**
 * Eksport/import grobów do pliku JSON. Wszystko lokalnie (IndexedDB) — bez backendu.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly db = inject(IndexedDbService);
  private readonly graveService = inject(GraveService);
  private readonly spaces = inject(SpaceService);

  /**
   * Serializuje wszystkie groby i udostępnia/pobiera plik.
   * @returns liczba wyeksportowanych grobów
   * @throws Error gdy brak grobów do eksportu
   */
  async exportGraves(): Promise<number> {
    const graves = await this.db.getGraves(this.spaces.activeSpaceId());
    if (graves.length === 0) {
      throw new Error('Brak grobów do eksportu.');
    }

    const json = serializeBackup(graves);
    const filename = `gravemap-${this.today()}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    // Na telefonie: natywne „Udostępnij" z plikiem. Fallback: pobranie.
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          files: [file],
          title: 'GraveMap',
          text: 'Moja mapa grobów (GraveMap)',
        });
        return graves.length;
      } catch (err) {
        // Użytkownik anulował udostępnianie — nie traktujemy jak błąd, bez fallbacku.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return graves.length;
        }
        // Inny błąd share → spróbuj pobrać.
      }
    }

    this.downloadFile(file, filename);
    return graves.length;
  }

  /**
   * Wczytuje groby z pliku. `merge` pomija istniejące po id; `replace` czyści groby aktywnej mapy.
   */
  async importGraves(file: File, mode: ImportMode): Promise<ImportResult> {
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const spaceId = this.spaces.activeSpaceId();
    if (mode === 'replace') await this.db.clearAll(spaceId);
    // Id grobu jest wspólne dla wszystkich map w telefonie — grób z innej mapy pomijamy
    const existingIds = await this.db.allGraveIds();
    const { toAdd, skippedExisting } = partitionByExisting(parsed.graves, existingIds);
    for (const grave of toAdd) {
      await this.db.addGrave(grave, spaceId);
    }
    const added = toAdd.length;

    await this.graveService.loadGraves();
    return { added, skippedExisting, skippedInvalid: parsed.skippedInvalid };
  }

  private downloadFile(file: File, filename: string): void {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
