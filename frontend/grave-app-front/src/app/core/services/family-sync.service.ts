import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { IndexedDbService, PhotoVariant } from './indexeddb.service';
import { ApiError, FamilyApi, OutgoingChange } from './family-api';
import { SpaceService } from './space.service';
import { GraveService } from '../../features/graves/services/grave.service';
import { LocalSpace, credentialOf } from '../../shared/models/space.model';

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'revoked' | 'removed';

export interface SpaceSync {
  state: SyncState;
  error: string | null;
  pending: number;
}

const PUSH_BATCH = 100;
const PHOTO_BATCH = 10;
const LOCAL_CHANGE_DELAY_MS = 1500;
const PERIODIC_SYNC_MS = 60_000;
const OFF: SpaceSync = { state: 'off', error: null, pending: 0 };

/**
 * Synchronizacja rodzinnych map. Źródłem prawdy jest serwer (Cloudflare D1); telefon trzyma
 * kopię każdej mapy w IndexedDB i kolejkę własnych zmian. Cykl dla każdej mapy jej kluczem:
 * zdjęcia → groby → pobranie zmian po ostatnim znanym `rev`. Błąd jednej mapy nie zatrzymuje innych.
 */
@Injectable({ providedIn: 'root' })
export class FamilySyncService {
  private readonly db = inject(IndexedDbService);
  private readonly api = inject(FamilyApi);
  private readonly spaces = inject(SpaceService);
  private readonly graveService = inject(GraveService);

  /** Stan synchronizacji każdej mapy (po lokalnym id). */
  readonly status = signal<Record<string, SpaceSync>>({});
  /** Zdjęcie odrzucone przez serwer (np. bezpiecznik limitu) — zostaje tylko w tym telefonie. */
  readonly photoWarning = signal<string | null>(null);

  private running: Promise<void> | null = null;
  private rerun = false;
  private timer?: ReturnType<typeof setTimeout>;

  /** Zmienia się tylko, gdy mapa dochodzi, znika albo dostaje klucz — nie przy każdym `rev`. */
  private readonly syncKey = computed(() =>
    this.spaces
      .spaces()
      .map((s) => `${s.id}:${s.status}:${credentialOf(s) ?? ''}`)
      .join('|')
  );

  constructor() {
    // Każda lokalna zmiana grobu → wyślij po krótkiej chwili (kilka edycji = jedna paczka)
    effect(() => {
      this.db.localChanges();
      untracked(() => {
        this.refreshPending();
        this.schedule(LOCAL_CHANGE_DELAY_MS);
      });
    });
    // Nowa mapa (założona, dołączona, podpisana) → synchronizuj od razu
    effect(() => {
      this.syncKey();
      untracked(() => this.schedule(0));
    });

    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => {
      for (const space of this.spaces.sharedSpaces()) {
        if (credentialOf(space)) this.setStatus(space.id, { state: 'offline' });
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') this.sync();
    }, PERIODIC_SYNC_MS);
  }

  syncOf(spaceId: string): SpaceSync {
    return this.status()[spaceId] ?? OFF;
  }

  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.runAll().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        this.sync();
      }
    });
    return this.running;
  }

  /** Bajty zdjęcia z mapy; null, gdy brak klucza, internetu albo zdjęcia. */
  async fetchPhoto(spaceId: string, photoId: string, variant: PhotoVariant): Promise<Blob | null> {
    const space = this.spaces.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token || !navigator.onLine) return null;
    return this.api.photo(token, photoId, variant);
  }

  private schedule(delayMs: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), delayMs);
  }

  private async runAll(): Promise<void> {
    await this.spaces.ready;
    let activeTouched = false;
    for (const space of this.spaces.spaces()) {
      if (!credentialOf(space)) continue;
      const touched = await this.runSpace(space);
      if (touched && space.id === this.spaces.activeSpaceId()) activeTouched = true;
    }
    if (activeTouched) await this.graveService.loadGraves();
    await this.prefetchPhotos();
    await this.refreshPending();
  }

  /** Synchronizuje jedną mapę; true, gdy zmieniły się jej groby. */
  private async runSpace(space: LocalSpace): Promise<boolean> {
    const token = credentialOf(space)!;
    if (!navigator.onLine) {
      this.setStatus(space.id, { state: 'offline', error: null });
      return false;
    }
    this.setStatus(space.id, { state: 'syncing', error: null });
    try {
      // Najpierw bajty zdjęć: gdy inny telefon zobaczy grób z nowym zdjęciem,
      // samo zdjęcie musi już być na serwerze.
      await this.pushPhotos(space.id, token);
      await this.push(space.id, token);
      const touched = await this.pull(space, token);
      await this.spaces.update(space.id, { syncedAt: Date.now() });
      this.setStatus(space.id, { state: 'idle', error: null });
      // Awatary w przełączniku i panelu: lista członków aktywnej mapy przy okazji synchronizacji
      if (space.id === this.spaces.activeSpaceId()) {
        await this.spaces.loadMembers(space.id).catch(() => {});
      }
      return touched;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'member_removed') {
        await this.spaces.update(space.id, { status: 'removed' });
        this.setStatus(space.id, {
          state: 'removed',
          error: `Nie masz już dostępu do mapy „${space.name}".`,
        });
      } else if (err instanceof ApiError && err.status === 401) {
        this.setStatus(space.id, {
          state: 'revoked',
          error: 'Ten link przestał działać — poproś założyciela mapy o nowy.',
        });
      } else if (err instanceof ApiError) {
        this.setStatus(space.id, { state: 'error', error: err.message });
      } else {
        // fetch rzuca TypeError, gdy nie ma połączenia z serwerem
        this.setStatus(space.id, { state: 'offline', error: null });
      }
      return false;
    }
  }

  private async pushPhotos(spaceId: string, token: string): Promise<void> {
    for (;;) {
      const batch = await this.db.getPhotoQueue(spaceId, PHOTO_BATCH);
      if (batch.length === 0) return;
      for (const entry of batch) {
        const path = `/photos/${encodeURIComponent(entry.photoId)}`;
        if (entry.op === 'delete') {
          await this.api.send('DELETE', path, token);
          continue;
        }
        const blob = entry.variant
          ? await this.db.getPhotoBlob(entry.photoId, entry.variant)
          : undefined;
        try {
          if (blob) await this.api.send('PUT', `${path}?variant=${entry.variant}`, token, blob);
        } catch (err) {
          // Odmowa na stałe (limit miejsca, format) nie może blokować synchronizacji grobów
          if (err instanceof ApiError && [413, 415, 429, 507].includes(err.status)) {
            this.photoWarning.set(err.message);
            continue;
          }
          throw err;
        }
      }
      await this.db.removeFromPhotoQueue(batch);
    }
  }

  private async push(spaceId: string, token: string): Promise<void> {
    for (;;) {
      const batch = await this.db.getGraveQueue(spaceId, PUSH_BATCH);
      if (batch.length === 0) return;
      const changes: OutgoingChange[] = [];
      for (const entry of batch) {
        // Grobu nie ma albo jest już na innej mapie → dla tej mapy to usunięcie
        const grave =
          entry.op === 'put' ? await this.db.getGraveForSync(entry.id, spaceId) : undefined;
        changes.push(
          grave ? { id: entry.id, deleted: false, data: grave } : { id: entry.id, deleted: true }
        );
      }
      await this.api.push(token, changes);
      await this.db.removeFromGraveQueue(batch);
    }
  }

  private async pull(space: LocalSpace, token: string): Promise<boolean> {
    let since = space.rev;
    let touched = false;
    for (;;) {
      const res = await this.api.pull(token, since);
      if (res.changes.length > 0 && (await this.db.applyRemoteChanges(space.id, res.changes))) {
        touched = true;
      }
      since = res.rev;
      await this.spaces.update(space.id, { rev: since });
      if (!res.more) return touched;
    }
  }

  /** Zdjęcia aktywnej mapy do telefonu — żeby były widoczne na cmentarzu bez zasięgu. */
  private async prefetchPhotos(): Promise<void> {
    const spaceId = this.spaces.activeSpaceId();
    for (const grave of this.graveService.graves()) {
      for (const photo of grave.photos) {
        if (/^(https?:|data:)/.test(photo.url)) continue;
        for (const variant of ['thumb', 'full'] as const) {
          if (await this.db.hasPhotoBlob(photo.id, variant)) continue;
          try {
            const blob = await this.fetchPhoto(spaceId, photo.id, variant);
            if (blob) await this.db.putPhotoBlob(photo.id, variant, blob, null);
          } catch {
            // spróbujemy przy następnej synchronizacji
          }
        }
      }
    }
  }

  private async refreshPending(): Promise<void> {
    for (const space of this.spaces.sharedSpaces()) {
      try {
        this.setStatus(space.id, { pending: await this.db.queueCount(space.id) });
      } catch {
        this.setStatus(space.id, { pending: 0 });
      }
    }
  }

  private setStatus(spaceId: string, patch: Partial<SpaceSync>): void {
    this.status.update((all) => ({ ...all, [spaceId]: { ...(all[spaceId] ?? OFF), ...patch } }));
  }
}
