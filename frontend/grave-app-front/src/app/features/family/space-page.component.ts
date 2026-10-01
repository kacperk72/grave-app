import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { SpaceService } from '../../core/services/space.service';
import { FamilySyncService } from '../../core/services/family-sync.service';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ProfileFormComponent } from '../../shared/components/profile-form.component';
import { Member, Profile } from '../../shared/models/space.model';
import { lastSeenText } from '../../shared/utils/member-display';
import { syncStatusText } from '../../shared/utils/sync-status';

interface Note {
  type: 'success' | 'error' | 'info';
  icon: IconName;
  text: string;
}

/** Co zrobić z grobami po wyjściu/usunięciu mapy — wybór w panelu, nie w `confirm()`. */
type Exit = 'leave' | 'delete' | 'removed';

/** Panel rodzinnej mapy: kto ma dostęp, zaproszenie, zarządzanie (założyciel), wyjście. */
@Component({
  selector: 'app-space-page',
  imports: [RouterLink, IconComponent, AvatarComponent, ProfileFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './space-page.component.html',
  styleUrls: ['../settings/settings-page.component.scss', './space-page.component.scss'],
})
export class SpacePageComponent {
  readonly spaces = inject(SpaceService);
  private readonly sync = inject(FamilySyncService);
  private readonly router = inject(Router);

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: '' }
  );

  readonly space = computed(() => this.spaces.spaces().find((s) => s.id === this.id()) ?? null);
  readonly isOwner = computed(() => this.space()?.role === 'owner');
  readonly removed = computed(() => this.space()?.status === 'removed');
  readonly members = computed(() => this.spaces.members()[this.id()] ?? []);
  readonly me = computed(() => this.members().find((m) => m.id === this.space()?.memberId) ?? null);
  readonly others = computed(() => this.members().filter((m) => m.id !== this.space()?.memberId));
  readonly status = computed(() => {
    const s = this.space();
    return s ? syncStatusText(this.sync.syncOf(s.id), s.syncedAt) : '';
  });

  readonly busy = signal(false);
  readonly note = signal<Note | null>(null);
  readonly editingName = signal(false);
  readonly editingMe = signal(false);
  readonly menuFor = signal<string | null>(null);
  readonly exit = signal<Exit | null>(null);
  readonly nameDraft = signal('');

  readonly lastSeen = (m: Member) => lastSeenText(m.lastSeenAt);
  readonly joined = (m: Member) =>
    new Date(m.joinedAt).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  constructor() {
    this.spaces.ready.then(() => {
      if (!this.space()) {
        this.router.navigate(['/settings'], { replaceUrl: true });
        return;
      }
      if (this.removed()) this.exit.set('removed');
      this.spaces.loadMembers(this.id()).catch(() => {});
    });
  }

  startRename(): void {
    this.nameDraft.set(this.space()?.name ?? '');
    this.editingName.set(true);
  }

  async saveName(): Promise<void> {
    await this.run(async () => {
      await this.spaces.rename(this.id(), this.nameDraft());
      this.editingName.set(false);
    }, 'Nie udało się zmienić nazwy.');
  }

  async saveMe(profile: Profile): Promise<void> {
    await this.run(async () => {
      await this.spaces.updateMe(this.id(), profile);
      this.editingMe.set(false);
    }, 'Nie udało się zapisać podpisu.');
  }

  async share(): Promise<void> {
    const space = this.space();
    if (!space) return;
    await this.run(async () => {
      if ((await this.spaces.shareInvite(space)) === 'copied') {
        this.note.set({
          type: 'success',
          icon: 'check',
          text: 'Link skopiowany — wklej go w wiadomości do rodziny.',
        });
      }
    }, 'Nie udało się udostępnić linku.');
  }

  async rotate(): Promise<void> {
    const space = this.space();
    if (!space) return;
    const ok = confirm(
      'Wygenerować nowy link zaproszenia? Stary przestanie działać. Osoby, które już dołączyły, zostają.'
    );
    if (!ok) return;
    await this.run(async () => {
      await this.spaces.rotateInvite(space);
      this.note.set({
        type: 'success',
        icon: 'check',
        text: 'Nowy link gotowy. Wyślij go osobom, które mają dołączyć.',
      });
    }, 'Nie udało się zmienić linku. Sprawdź internet.');
  }

  async removeMember(m: Member): Promise<void> {
    this.menuFor.set(null);
    if (!confirm(`Usunąć ${m.name} z mapy? Ten telefon przestanie się synchronizować.`)) return;
    await this.run(() => this.spaces.removeMember(this.id(), m.id), 'Nie udało się usunąć osoby.');
  }

  async transfer(m: Member): Promise<void> {
    this.menuFor.set(null);
    if (!confirm(`Przekazać rolę założyciela: ${m.name}? Stracisz możliwość zarządzania mapą.`)) {
      return;
    }
    await this.run(
      () => this.spaces.transferOwner(this.id(), m.id),
      'Nie udało się przekazać roli.'
    );
  }

  /** Wyjście, usunięcie mapy albo porządek po usunięciu z mapy — z wyborem losu grobów. */
  async finish(keep: boolean): Promise<void> {
    const kind = this.exit();
    if (!kind) return;
    const pending = this.sync.syncOf(this.id()).pending;
    if (
      kind !== 'removed' &&
      pending > 0 &&
      !confirm(`${pending} niewysłanych zmian nie trafi do rodziny. Kontynuować?`)
    ) {
      return;
    }
    await this.run(async () => {
      if (kind === 'leave') await this.spaces.leave(this.id(), keep);
      else if (kind === 'delete') await this.spaces.deleteSpace(this.id(), keep);
      else await this.spaces.forget(this.id(), keep);
      this.router.navigate(['/settings'], { replaceUrl: true });
    }, 'Nie udało się. Sprawdź internet i spróbuj ponownie.');
  }

  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.note.set(null);
    try {
      await action();
    } catch (err) {
      const text = err instanceof Error ? err.message : '';
      this.note.set({ type: 'error', icon: 'alert', text: text || fallback });
    } finally {
      this.busy.set(false);
    }
  }
}
