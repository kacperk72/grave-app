/**
 * Kopia zapasowa grobów — czysta logika serializacji, walidacji i scalania.
 * Bez API przeglądarki, żeby dało się to w pełni przetestować.
 */
import { DeceasedPerson, Grave } from '../models/grave.model';

export const BACKUP_APP = 'GraveMap';
export const BACKUP_VERSION = 1;

export interface GraveBackup {
  app: string;
  version: number;
  exportedAt: string;
  graves: Grave[];
}

export type ParseResult =
  | { ok: true; graves: Grave[]; skippedInvalid: number }
  | { ok: false; error: string };

export function serializeBackup(graves: Grave[], now: Date = new Date()): string {
  const backup: GraveBackup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    graves,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'To nie jest prawidłowy plik JSON.' };
  }

  const rawGraves = extractRawGraves(data);
  if (!rawGraves) {
    return { ok: false, error: 'Plik nie zawiera listy grobów GraveMap.' };
  }

  const graves: Grave[] = [];
  let skippedInvalid = 0;
  for (const item of rawGraves) {
    const grave = normalizeGrave(item);
    if (grave) graves.push(grave);
    else skippedInvalid++;
  }

  if (graves.length === 0) {
    return { ok: false, error: 'Nie znaleziono prawidłowych grobów w pliku.' };
  }

  return { ok: true, graves, skippedInvalid };
}

export function partitionByExisting(
  incoming: Grave[],
  existingIds: Set<string>
): { toAdd: Grave[]; skippedExisting: number } {
  const toAdd: Grave[] = [];
  let skippedExisting = 0;
  for (const grave of incoming) {
    if (existingIds.has(grave.id)) skippedExisting++;
    else toAdd.push(grave);
  }
  return { toAdd, skippedExisting };
}

function extractRawGraves(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const graves = (data as Record<string, unknown>)['graves'];
    if (Array.isArray(graves)) return graves;
  }
  return null;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function normalizeGrave(input: unknown): Grave | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, any>;

  if (typeof o['latitude'] !== 'number' || typeof o['longitude'] !== 'number') return null;
  if (typeof o['cemeteryName'] !== 'string' || o['cemeteryName'].trim() === '') return null;

  const id = typeof o['id'] === 'string' && o['id'] ? o['id'] : newId();
  const now = new Date().toISOString();
  const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
  const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);

  return {
    id,
    latitude: o['latitude'],
    longitude: o['longitude'],
    accuracy: num(o['accuracy']),
    cemeteryName: o['cemeteryName'],
    graveNumber: str(o['graveNumber']),
    sector: str(o['sector']),
    notes: str(o['notes']),
    paymentDueDate: str(o['paymentDueDate']),
    lastPaymentAmount: num(o['lastPaymentAmount']),
    paymentPeriodMonths: num(o['paymentPeriodMonths']),
    currency: typeof o['currency'] === 'string' && o['currency'] ? o['currency'] : 'PLN',
    deceasedPersons: normalizePersons(o['deceasedPersons'], id),
    photos: Array.isArray(o['photos']) ? o['photos'] : [],
    createdAt: str(o['createdAt']) ?? now,
    updatedAt: str(o['updatedAt']) ?? now,
    lastVisited: str(o['lastVisited']),
  };
}

function normalizePersons(input: unknown, graveId: string): DeceasedPerson[] {
  if (!Array.isArray(input)) return [];
  const persons: DeceasedPerson[] = [];
  for (const p of input) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, any>;
    persons.push({
      id: typeof o['id'] === 'string' && o['id'] ? o['id'] : newId(),
      graveId,
      firstName: typeof o['firstName'] === 'string' ? o['firstName'] : '',
      lastName: typeof o['lastName'] === 'string' ? o['lastName'] : '',
      birthDate: typeof o['birthDate'] === 'string' ? o['birthDate'] : null,
      deathDate: typeof o['deathDate'] === 'string' ? o['deathDate'] : null,
    });
  }
  return persons;
}
