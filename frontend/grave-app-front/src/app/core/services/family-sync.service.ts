import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { environment } from '../../../environments/environment';
import { IndexedDbService, RemoteChange } from './indexeddb.service';
import { GraveService } from '../../features/graves/services/grave.service';

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'revoked';

const TOKEN_KEY = 'gravemap-family-token';
const REV_KEY = 'gravemap-family-rev';
const SYNCED_AT_KEY = 'gravemap-family-synced-at';

const PUSH_BATCH = 100;
const LOCAL_CHANGE_DELAY_MS = 1500;
const PERIODIC_SYNC_MS = 60_000;

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Rodzinna mapa: wspólny zbiór grobów na serwerze (Cloudflare D1), do którego
 * dostęp daje sam link. Źródłem prawdy jest serwer; ten telefon trzyma kopię
 * w IndexedDB i kolejkę własnych zmian, które wysyła, gdy jest internet.
 *
 * Cykl synchronizacji: najpierw wyślij kolejkę, potem pobierz zmiany po ostatnim
 * znanym numerze (rev). Groby z niewysłaną zmianą nie są nadpisywane.
 */
@Injectable({ providedIn: 'root' })
export class FamilySyncService {
  private readonly db = inject(IndexedDbService);
  private readonly graveService = inject(GraveService);
  private readonly api = environment.apiUrl;

  readonly token = signal<string | null>(readStorage(TOKEN_KEY));
  readonly connected = computed(() => !!this.token());
  readonly state = signal<SyncState>(this.token() ? 'idle' : 'off');
  readonly lastSyncAt = signal<number | null>(Number(readStorage(SYNCED_AT_KEY)) || null);
  readonly pending = signal(0);
  readonly errorMessage = signal<string | null>(null);

  private running: Promise<void> | null = null;
  private rerun = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Każda lokalna zmiana grobu → wyślij po krótkiej chwili (kilka edycji = jedna paczka)
    effect(() => {
      this.db.localChanges();
      untracked(() => {
        this.refreshPending();
        this.schedule(LOCAL_CHANGE_DELAY_MS);
      });
    });

    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => {
      if (this.connected()) this.state.set('offline');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') this.sync();
    }, PERIODIC_SYNC_MS);

    this.sync();
  }

  /** Link do wysłania rodzinie. Klucz po `#` nie trafia do serwera strony ani logów. */
  readonly shareLink = computed(() => {
    const token = this.token();
    return token ? `${location.origin}/rodzina#${token}` : null;
  });

  /** Zakłada nową rodzinną mapę i wysyła na nią wszystkie groby z tego telefonu. */
  async createSpace(): Promise<void> {
    const res = await this.request<{ token: string }>('POST', '/spaces', undefined, null);
    this.connect(res.token);
    await this.db.queueAllGraves();
    await this.sync();
  }

  /** Podgląd mapy przed dołączeniem — sprawdza też, czy link jest aktualny. */
  async preview(token: string): Promise<{ graves: number }> {
    return this.request<{ graves: number }>('GET', '/space', undefined, token);
  }

  /** Dołącza ten telefon; jego dotychczasowe groby też trafiają na wspólną mapę. */
  async join(token: string): Promise<void> {
    if (this.token() !== token) {
      await this.db.clearOutbox();
      this.connect(token);
    }
    await this.db.queueAllGraves();
    await this.sync();
  }

  /** Nowy link; stary przestaje działać na wszystkich telefonach, które go używały. */
  async rotateLink(): Promise<void> {
    const res = await this.request<{ token: string }>('POST', '/space/rotate');
    this.token.set(res.token);
    writeStorage(TOKEN_KEY, res.token);
    this.state.set('idle');
    this.errorMessage.set(null);
  }

  /** Odłącza ten telefon. Groby zostają na nim jako zwykła, lokalna kopia. */
  async leave(): Promise<void> {
    this.token.set(null);
    this.lastSyncAt.set(null);
    removeStorage(TOKEN_KEY);
    removeStorage(REV_KEY);
    removeStorage(SYNCED_AT_KEY);
    await this.db.clearOutbox();
    this.state.set('off');
    this.errorMessage.set(null);
    await this.refreshPending();
  }

  /** Otwiera systemowe „Udostępnij" z linkiem albo kopiuje go do schowka. */
  async shareInvite(): Promise<'shared' | 'copied' | 'cancelled'> {
    const url = this.shareLink();
    if (!url) return 'cancelled';
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Rodzinna mapa grobów',
          text: 'Dołącz do naszej rodzinnej mapy grobów w GraveMap:',
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

  sync(): Promise<void> {
    if (!this.token()) return Promise.resolve();
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.runSync().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        this.sync();
      }
    });
    return this.running;
  }

  private schedule(delayMs: number): void {
    if (!this.token()) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), delayMs);
  }

  private async runSync(): Promise<void> {
    if (!navigator.onLine) {
      this.state.set('offline');
      await this.refreshPending();
      return;
    }
    this.state.set('syncing');
    try {
      await this.push();
      const changed = await this.pull();
      if (changed) await this.graveService.loadGraves();
      const now = Date.now();
      this.lastSyncAt.set(now);
      writeStorage(SYNCED_AT_KEY, String(now));
      this.state.set('idle');
      this.errorMessage.set(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        this.state.set('revoked');
        this.errorMessage.set('Ten link przestał działać — ktoś z rodziny go zmienił. Poproś o nowy.');
      } else if (err instanceof ApiError) {
        this.state.set('error');
        this.errorMessage.set(err.message);
      } else {
        // fetch rzuca TypeError, gdy nie ma połączenia z serwerem
        this.state.set('offline');
      }
    } finally {
      await this.refreshPending();
    }
  }

  private async push(): Promise<void> {
    for (;;) {
      const batch = await this.db.getOutbox(PUSH_BATCH);
      if (batch.length === 0) return;

      const changes = [];
      for (const entry of batch) {
        const grave = entry.op === 'put' ? await this.db.getGrave(entry.id) : undefined;
        changes.push(
          grave ? { id: entry.id, deleted: false, data: grave } : { id: entry.id, deleted: true }
        );
      }
      await this.request('POST', '/changes', { changes });
      await this.db.removeFromOutbox(batch);
    }
  }

  private async pull(): Promise<boolean> {
    let since = Number(readStorage(REV_KEY)) || 0;
    let touched = false;
    for (;;) {
      const res = await this.request<{ rev: number; more: boolean; changes: RemoteChange[] }>(
        'GET',
        `/changes?since=${since}`
      );
      if (res.changes.length > 0 && (await this.db.applyRemoteChanges(res.changes))) {
        touched = true;
      }
      since = res.rev;
      writeStorage(REV_KEY, String(since));
      if (!res.more) return touched;
    }
  }

  private connect(token: string): void {
    this.token.set(token);
    writeStorage(TOKEN_KEY, token);
    writeStorage(REV_KEY, '0');
    this.state.set('idle');
    this.errorMessage.set(null);
  }

  private async refreshPending(): Promise<void> {
    try {
      this.pending.set(this.token() ? await this.db.outboxCount() : 0);
    } catch {
      this.pending.set(0);
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    token: string | null = this.token()
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(this.api + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(res.status, (payload as { error?: string }).error ?? 'Błąd serwera');
    }
    return payload as T;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // bez localStorage mapa działa do zamknięcia karty
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
