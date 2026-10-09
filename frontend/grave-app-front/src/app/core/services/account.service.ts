import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiError, FamilyApi } from './family-api';
import { SpaceService } from './space.service';
import { IndexedDbService } from './indexeddb.service';
import { FamilySyncService } from './family-sync.service';
import { StoredSession, clearSession, readSession, writeSession } from './session';
import { readStorage, writeStorage } from './storage';
import { LOCAL_SPACE_ID, newSharedSpace } from '../../shared/models/space.model';
import { LinkedSpace, planAccountLink, spacesToForgetOnLogout } from '../../shared/utils/account-link';
import { TERMS_VERSION, markTermsAccepted } from '../../shared/legal';
import { DeletionPreview } from '../../shared/utils/account-rules';

const LAST_LINK_KEY = 'znajdzgroby-last-link';
const LINK_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Konto (opcjonalne): sesja w tym urządzeniu i przypięcie map do konta. Po zalogowaniu „Moje”
 * z telefonu przechodzi do prywatnej mapy konta na serwerze, a mapy z innych urządzeń pojawiają się tutaj.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = inject(FamilyApi);
  private readonly spaces = inject(SpaceService);
  private readonly db = inject(IndexedDbService);
  private readonly sync = inject(FamilySyncService);

  readonly session = signal<StoredSession | null>(readSession());
  readonly loggedIn = computed(() => !!this.session());

  async login(email: string, password: string): Promise<{ movedGraves: number }> {
    const res = await this.api.authLogin(email, password);
    // Zgoda zapisana na koncie obowiązuje na każdym urządzeniu, na którym się zalogujesz
    if ((res.user.termsVersion ?? 0) >= TERMS_VERSION) markTermsAccepted();
    this.save({ token: res.session, email: res.user.email });
    return this.link();
  }

  requestCode(email: string): Promise<unknown> {
    return this.api.authRequest(email);
  }

  verify(
    input: { email: string; code: string } | { link: string }
  ): Promise<{ setupToken: string; email: string; exists: boolean }> {
    return this.api.authVerify(input);
  }

  /** `acceptTerms` — wersja regulaminu przy zakładaniu konta (przy nowym haśle istniejącego — brak). */
  async setPassword(
    setupToken: string,
    password: string,
    acceptTerms?: number
  ): Promise<{ movedGraves: number }> {
    const res = await this.api.authPassword(setupToken, password, acceptTerms);
    if (acceptTerms || (res.user.termsVersion ?? 0) >= TERMS_VERSION) markTermsAccepted();
    this.save({ token: res.session, email: res.user.email });
    return this.link();
  }

  /** Przypina mapy tego urządzenia do konta i dociąga mapy konta. Zwraca, ile grobów z „Moje” poszło na konto. */
  async link(): Promise<{ movedGraves: number }> {
    const session = this.session();
    if (!session) return { movedGraves: 0 };
    await this.spaces.ready;
    const tokens = this.spaces
      .spaces()
      .filter((s) => s.memberToken && s.status === 'active')
      .map((s) => s.memberToken!);
    let linked: LinkedSpace[];
    try {
      linked = await this.api.accountLink(session.token, tokens);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Sesja wygasła albo hasło zmieniono na innym urządzeniu: dane zostają, konto „wylogowane”
        this.dropSession();
      }
      throw err;
    }

    for (const step of planAccountLink(this.spaces.spaces(), linked)) {
      if (step.localId !== null) await this.spaces.update(step.localId, step.changes);
      else await this.spaces.add(newSharedSpace(step.fields));
    }

    const personal = this.spaces.spaces().find((s) => s.kind === 'personal');
    let movedGraves = 0;
    if (personal) {
      const localIds = await this.db.graveIds(LOCAL_SPACE_ID);
      movedGraves = localIds.length;
      if (movedGraves > 0) await this.db.moveGraves(localIds, personal.id);
      if (this.spaces.activeSpaceId() === LOCAL_SPACE_ID) this.spaces.setActive(personal.id);
    }
    writeStorage(LAST_LINK_KEY, String(Date.now()));
    this.sync.sync();
    return { movedGraves };
  }

  /** Raz na dobę przy starcie: mapy dodane na innym urządzeniu pojawiają się i tutaj. */
  linkIfDue(): void {
    if (!this.session()) return;
    const last = Number(readStorage(LAST_LINK_KEY)) || 0;
    if (Date.now() - last < LINK_EVERY_MS) return;
    this.link().catch(() => {});
  }

  /** Wylogowanie: mapy konta znikają z tej przeglądarki (są na serwerze); mapy spoza konta zostają. */
  async logout(): Promise<void> {
    const session = this.session();
    if (session) await this.api.authLogout(session.token).catch(() => {});
    await this.forgetAccountSpaces();
    this.dropSession();
  }

  /** Podgląd skutków usunięcia konta. 401 = sesja wygasła: czyścimy ją jak przy link(). */
  async deletionPreview(): Promise<DeletionPreview> {
    try {
      return await this.api.accountDeletionPreview(this.requireSession());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) this.dropSession();
      throw err;
    }
  }

  /** Usuwa konto na serwerze, potem z tej przeglądarki znikają mapy konta (jak przy wylogowaniu). */
  async deleteAccount(password: string): Promise<void> {
    await this.api.deleteAccount(this.requireSession(), password);
    await this.forgetAccountSpaces();
    this.dropSession();
  }

  private async forgetAccountSpaces(): Promise<void> {
    for (const id of spacesToForgetOnLogout(this.spaces.spaces())) await this.spaces.forget(id, false);
  }

  private requireSession(): string {
    const token = this.session()?.token;
    if (!token) throw new ApiError(401, 'Sesja wygasła — zaloguj się ponownie');
    return token;
  }

  /** Liczba niewysłanych zmian w mapach, które wylogowanie usunie z przeglądarki. */
  async pendingChanges(): Promise<number> {
    let total = 0;
    for (const id of spacesToForgetOnLogout(this.spaces.spaces())) {
      total += await this.db.queueCount(id);
    }
    return total;
  }

  private save(session: StoredSession): void {
    writeSession(session);
    this.session.set(session);
  }

  private dropSession(): void {
    clearSession();
    this.session.set(null);
  }
}
