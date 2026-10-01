import { Injectable, computed, inject, signal } from '@angular/core';

import { ACTIVE_SPACE_KEY, IndexedDbService } from './indexeddb.service';
import { FamilyApi, InvitePreview } from './family-api';
import { writeProfile } from './profile';
import { readStorage, removeStorage, writeStorage } from './storage';
import {
  LOCAL_SPACE_ID,
  LocalSpace,
  Member,
  Profile,
  SpaceRole,
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

  /** Członkowie map (po lokalnym id) — z serwera, tylko w pamięci. */
  readonly members = signal<Record<string, Member[]>>({});

  /** Ja na tej mapie (z listy członków). */
  me(spaceId: string): Member | null {
    const space = this.spaces().find((s) => s.id === spaceId);
    return this.members()[spaceId]?.find((m) => m.id === space?.memberId) ?? null;
  }

  async loadMembers(spaceId: string): Promise<void> {
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token || !navigator.onLine) return;
    const [list, info] = await Promise.all([this.api.members(token), this.api.spaceInfo(token)]);
    this.members.update((all) => ({ ...all, [spaceId]: list }));
    // Nazwę i rolę mógł zmienić ktoś inny (założyciel, przekazanie roli) — telefon dowiaduje się tutaj
    const role = list.find((m) => m.id === space!.memberId)?.role ?? space!.role;
    if (role !== space!.role || info.name !== space!.name) {
      await this.update(spaceId, { role, name: info.name });
    }
  }

  async create(name: string, profile: Profile, moveLocal: boolean): Promise<LocalSpace> {
    const res = await this.api.createSpace(name, profile);
    const space = newSharedSpace({
      serverId: res.spaceId,
      name: res.name,
      memberToken: res.memberToken,
      memberId: res.memberId,
      role: 'owner',
      inviteToken: res.invite,
    });
    await this.add(space);
    if (moveLocal) await this.db.moveGraves(await this.db.graveIds(LOCAL_SPACE_ID), space.id);
    writeProfile(profile);
    this.setActive(space.id);
    return space;
  }

  /** Wyjście z mapy (członek). Mapa sprzed podpisu nie ma członka — tylko znika z telefonu. */
  async leave(spaceId: string, keep: boolean): Promise<void> {
    const space = this.spaces().find((s) => s.id === spaceId);
    if (space?.memberToken && space.status === 'active') await this.api.leave(space.memberToken);
    await this.forget(spaceId, keep);
  }

  /** Usunięcie mapy przez założyciela, gdy nikogo innego już na niej nie ma. */
  async deleteSpace(spaceId: string, keep: boolean): Promise<void> {
    await this.api.deleteSpace(this.tokenOf(spaceId));
    await this.forget(spaceId, keep);
  }

  async removeMember(spaceId: string, memberId: string): Promise<void> {
    await this.api.removeMember(this.tokenOf(spaceId), memberId);
    await this.loadMembers(spaceId);
  }

  async transferOwner(spaceId: string, memberId: string): Promise<void> {
    await this.api.transferOwner(this.tokenOf(spaceId), memberId);
    await this.update(spaceId, { role: 'member' });
    await this.loadMembers(spaceId);
  }

  async updateMe(spaceId: string, profile: Profile): Promise<void> {
    await this.api.updateMe(this.tokenOf(spaceId), profile);
    writeProfile(profile);
    await this.loadMembers(spaceId);
  }

  preview(invite: string): Promise<InvitePreview> {
    return this.api.preview(invite);
  }

  /** Mapa z tego zaproszenia, jeśli telefon już ją zna (także sprzed podpisu). */
  findForInvite(invite: string, preview: InvitePreview): LocalSpace | null {
    return (
      this.spaces().find(
        (s) => isShared(s) && (s.serverId === preview.spaceId || s.inviteToken === invite)
      ) ?? null
    );
  }

  /**
   * Dołącza ten telefon do mapy z zaproszenia. Nic nie wysyła — groby z innych map zostają,
   * gdzie były. Telefon usunięty kiedyś z tej mapy dołącza od nowa i pobiera ją od zera.
   */
  async join(invite: string, preview: InvitePreview, profile: Profile): Promise<LocalSpace> {
    const known = this.findForInvite(invite, preview);
    if (known && known.status !== 'removed' && known.memberToken) {
      this.setActive(known.id);
      return known;
    }
    const res = await this.api.join(invite, profile);
    const fields: Partial<LocalSpace> = {
      serverId: res.spaceId,
      name: res.name,
      memberToken: res.memberToken,
      memberId: res.memberId,
      role: res.role,
      inviteToken: invite,
      status: 'active',
    };
    let id: string;
    if (known) {
      id = known.id;
      // Mapa sprzed podpisu zachowuje rev; po usunięciu z mapy pobieramy wszystko od nowa
      await this.update(id, known.status === 'removed' ? { ...fields, rev: 0 } : fields);
    } else {
      const space = newSharedSpace({ ...fields, name: res.name });
      id = space.id;
      await this.add(space);
    }
    writeProfile(profile);
    this.setActive(id);
    return this.spaces().find((s) => s.id === id)!;
  }

  /** Podpis na mapie sprzed list członków; zwraca rolę (pierwszy podpisany = założyciel). */
  async completeProfile(spaceId: string, profile: Profile): Promise<SpaceRole> {
    const space = this.spaces().find((s) => s.id === spaceId);
    if (!space?.inviteToken) throw new Error('Ten telefon nie zna linku do tej mapy.');
    const res = await this.api.join(space.inviteToken, profile);
    await this.update(spaceId, {
      serverId: res.spaceId,
      name: res.name,
      memberToken: res.memberToken,
      memberId: res.memberId,
      role: res.role,
      status: 'active',
    });
    writeProfile(profile);
    return res.role;
  }

  async rename(spaceId: string, name: string): Promise<void> {
    const res = await this.api.rename(this.tokenOf(spaceId), name);
    await this.update(spaceId, { name: res.name });
  }

  /** Nowy link zaproszenia; dołączeni członkowie działają dalej. */
  async rotateInvite(space: LocalSpace): Promise<void> {
    const res = await this.api.rotate(this.tokenOf(space.id));
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
    this.members.update(({ [spaceId]: _, ...rest }) => rest);
  }

  /**
   * Dociąga do telefonu brakujące bajty zdjęć grobu z jego mapy.
   * Zwraca, ilu zdjęć (pełnych) nadal brakuje — np. bez internetu.
   */
  async ensurePhotoBytes(graveId: string): Promise<number> {
    const grave = await this.db.getGrave(graveId);
    const spaceId = await this.db.getGraveSpaceId(graveId);
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    let missing = 0;
    for (const photo of grave?.photos ?? []) {
      if (/^(https?:|data:)/.test(photo.url)) continue;
      for (const variant of ['full', 'thumb'] as const) {
        if (await this.db.hasPhotoBlob(photo.id, variant)) continue;
        const blob =
          token && navigator.onLine
            ? await this.api.photo(token, photo.id, variant).catch(() => null)
            : null;
        if (blob) await this.db.putPhotoBlob(photo.id, variant, blob, null);
        else if (variant === 'full') missing++;
      }
    }
    return missing;
  }

  /** Przenosi grób (ten sam id) na inną mapę. Bez bajtów zdjęć w telefonie odmawia — zginęłyby. */
  async moveGrave(graveId: string, toSpaceId: string): Promise<void> {
    if ((await this.ensurePhotoBytes(graveId)) > 0) {
      throw new Error(
        'Nie wszystkie zdjęcia są w telefonie. Połącz się z internetem i spróbuj ponownie.'
      );
    }
    await this.db.moveGraves([graveId], toSpaceId);
  }

  /** Kopia grobu na inną mapę; zdjęcia, których nie da się pobrać, są pomijane. */
  async copyGrave(graveId: string, toSpaceId: string): Promise<{ skippedPhotos: number }> {
    await this.ensurePhotoBytes(graveId);
    const res = await this.db.copyGraveTo(graveId, toSpaceId);
    return { skippedPhotos: res.skippedPhotos };
  }

  private tokenOf(spaceId: string): string {
    const space = this.spaces().find((s) => s.id === spaceId);
    const token = space ? credentialOf(space) : null;
    if (!token) throw new Error('Brak dostępu do tej mapy');
    return token;
  }
}
