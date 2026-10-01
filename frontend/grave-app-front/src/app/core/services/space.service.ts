import { Injectable, computed, inject, signal } from '@angular/core';

import { ACTIVE_SPACE_KEY, IndexedDbService } from './indexeddb.service';
import { FamilyApi } from './family-api';
import { readStorage, removeStorage, writeStorage } from './storage';
import {
  LOCAL_SPACE_ID,
  LocalSpace,
  credentialOf,
  isShared,
  newSharedSpace,
} from '../../shared/models/space.model';
import { LEGACY_KEYS } from '../../shared/utils/space-migration';

/**
 * Mapy zapamiętane w tym telefonie i to, która jest aktywna. Groby, lista i mapa
 * pokazują wyłącznie aktywną mapę; nowy grób trafia do niej.
 */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly db = inject(IndexedDbService);
  private readonly api = inject(FamilyApi);

  /** „Moje" pierwsza, potem rodzinne w kolejności dodania. */
  readonly spaces = signal<LocalSpace[]>([]);
  readonly activeSpaceId = signal<string>(readStorage(ACTIVE_SPACE_KEY) ?? LOCAL_SPACE_ID);
  readonly activeSpace = computed(
    () => this.spaces().find((s) => s.id === this.activeSpaceId()) ?? null
  );
  readonly sharedSpaces = computed(() => this.spaces().filter(isShared));
  /** Aktywna mapa jest tylko do odczytu — założyciel usunął z niej ten telefon. */
  readonly readOnly = computed(() => this.activeSpace()?.status === 'removed');

  readonly ready: Promise<void> = this.load();

  private async load(): Promise<void> {
    try {
      // Pierwsze zapytanie otwiera bazę — wtedy biegnie migracja v4 (czyta dawne klucze)
      await this.db.ensureLocalSpace();
      await this.reload();
    } catch (error) {
      // Bez IndexedDB (np. zablokowane dane strony) zostaje samo „Moje" do zamknięcia karty
      console.error('Error loading spaces from DB', error);
      this.activeSpaceId.set(LOCAL_SPACE_ID);
      return;
    }
    const stored = readStorage(ACTIVE_SPACE_KEY);
    this.activeSpaceId.set(this.spaces().some((s) => s.id === stored) ? stored! : LOCAL_SPACE_ID);
    for (const key of Object.values(LEGACY_KEYS)) removeStorage(key);
  }

  async reload(): Promise<void> {
    const list = await this.db.getSpaces();
    this.spaces.set(list.sort((a, b) => a.createdAt - b.createdAt));
  }

  setActive(id: string): void {
    if (!this.spaces().some((s) => s.id === id)) return;
    this.activeSpaceId.set(id);
    writeStorage(ACTIVE_SPACE_KEY, id);
  }

  async update(id: string, changes: Partial<LocalSpace>): Promise<void> {
    await this.db.updateSpace(id, changes);
    await this.reload();
  }

  async add(space: LocalSpace): Promise<void> {
    await this.db.putSpace(space);
    await this.reload();
  }

  /** Zakładanie mapy bez podpisu (stary ekran Ustawień). Usuwane w Task B6. */
  async createLegacy(): Promise<void> {
    const res = await this.api.request<{ token: string }>('POST', '/spaces', null);
    const space = newSharedSpace({
      name: 'Rodzinna mapa',
      inviteToken: res.token,
      status: 'needs-profile',
    });
    await this.add(space);
    await this.db.moveGraves(await this.db.graveIds(LOCAL_SPACE_ID), space.id);
    this.setActive(space.id);
  }

  /** Dołączenie bez podpisu (stary ekran dołączania). Usuwane w Task B5. */
  async addFromInvite(invite: string): Promise<void> {
    const existing = this.spaces().find((s) => s.inviteToken === invite && s.status !== 'removed');
    if (existing) {
      this.setActive(existing.id);
      return;
    }
    const space = newSharedSpace({
      name: 'Rodzinna mapa',
      inviteToken: invite,
      status: 'needs-profile',
    });
    await this.add(space);
    this.setActive(space.id);
  }

  /** Nowy link zaproszenia; dołączeni członkowie działają dalej. */
  async rotateInvite(space: LocalSpace): Promise<void> {
    const token = credentialOf(space);
    if (!token) throw new Error('Brak dostępu do tej mapy');
    const res = await this.api.rotate(token);
    await this.update(space.id, { inviteToken: res.invite });
  }

  /** Systemowe „Udostępnij" z linkiem zaproszenia albo kopia do schowka. */
  async shareInvite(space: LocalSpace): Promise<'shared' | 'copied' | 'cancelled'> {
    if (!space.inviteToken) throw new Error('Ten telefon nie zna linku do tej mapy.');
    if (navigator.onLine) {
      // Po zmianie linku przez założyciela zapamiętany link jest martwy — nie wysyłajmy go
      await this.api.preview(space.inviteToken).catch((err) => {
        if (err?.status === 401) {
          throw new Error('Link zaproszenia został zmieniony. Aktualny ma założyciel mapy.');
        }
      });
    }
    const url = `${location.origin}/rodzina#${space.inviteToken}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: space.name,
          text: `Dołącz do mapy grobów „${space.name}" w GraveMap:`,
          url,
        });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      }
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  }

  /** Usuwa mapę z telefonu; `keep` = groby zostają jako kopia w „Moje". */
  async forget(spaceId: string, keep: boolean): Promise<void> {
    if (keep) await this.db.reassignSpace(spaceId, LOCAL_SPACE_ID);
    await this.db.deleteSpaceData(spaceId);
    if (this.activeSpaceId() === spaceId) this.setActive(LOCAL_SPACE_ID);
    await this.reload();
  }
}
