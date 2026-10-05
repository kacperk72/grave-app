import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Grave, PhotoVariant } from '../../shared/models/grave.model';
import { Member, Profile, SpaceRole } from '../../shared/models/space.model';
import { RemoteChange } from './indexeddb.service';
import { LinkedSpace } from '../../shared/utils/account-link';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Kod z serwera, np. `member_removed`. */
    readonly code?: string
  ) {
    super(message);
  }
}

export interface InvitePreview {
  spaceId: string;
  name: string;
  graves: number;
  members: { name: string; color: string }[];
}

export interface JoinResult {
  spaceId: string;
  name: string;
  memberToken: string;
  memberId: string;
  role: SpaceRole;
}

export interface CreatedSpace extends JoinResult {
  invite: string;
}

export interface AuthResult {
  session: string;
  user: { id: string; email: string };
}

export interface PullResponse {
  rev: number;
  more: boolean;
  changes: RemoteChange[];
}

export type OutgoingChange =
  | { id: string; deleted: false; data: Grave }
  | { id: string; deleted: true };

/** Klient API rodzinnych map (grave-app/worker). Każde wywołanie dostaje klucz mapy jawnie. */
@Injectable({ providedIn: 'root' })
export class FamilyApi {
  private readonly base = environment.apiUrl;

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    token: string | null,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) throw new ApiError(res.status, payload.error ?? 'Błąd serwera', payload.code);
    return payload as T;
  }

  /** Zapytanie z surowym ciałem (bajty zdjęcia) albo bez ciała. */
  async send(method: 'PUT' | 'DELETE', path: string, token: string, body?: Blob): Promise<void> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body) headers['Content-Type'] = body.type || 'image/jpeg';
    const res = await fetch(this.base + path, { method, headers, body });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      throw new ApiError(res.status, payload.error ?? 'Błąd serwera', payload.code);
    }
  }

  async photo(token: string, photoId: string, variant: PhotoVariant): Promise<Blob | null> {
    const res = await fetch(
      `${this.base}/photos/${encodeURIComponent(photoId)}?variant=${variant}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok ? res.blob() : null;
  }

  pull(token: string, since: number): Promise<PullResponse> {
    return this.request('GET', `/changes?since=${since}`, token);
  }

  push(token: string, changes: OutgoingChange[]): Promise<{ rev: number }> {
    return this.request('POST', '/changes', token, { changes });
  }

  createSpace(name: string, member: Profile): Promise<CreatedSpace> {
    return this.request('POST', '/spaces', null, { name, member });
  }

  preview(invite: string): Promise<InvitePreview> {
    return this.request('GET', '/invite', invite);
  }

  /** Z sesją konta członek jest przypinany do konta (bez duplikatu, jeśli konto już jest w mapie). */
  join(invite: string, profile: Profile, session?: string): Promise<JoinResult> {
    return this.request('POST', '/join', invite, profile, session ? { 'X-Session': session } : {});
  }

  authRequest(email: string): Promise<{ ok: true }> {
    return this.request('POST', '/auth/request', null, { email });
  }

  authVerify(
    body: { email: string; code: string } | { link: string }
  ): Promise<{ setupToken: string; email: string }> {
    return this.request('POST', '/auth/verify', null, body);
  }

  authPassword(setupToken: string, password: string): Promise<AuthResult> {
    return this.request('POST', '/auth/password', null, { setupToken, password });
  }

  authLogin(email: string, password: string): Promise<AuthResult> {
    return this.request('POST', '/auth/login', null, { email, password });
  }

  authLogout(session: string): Promise<unknown> {
    return this.request('POST', '/auth/logout', session);
  }

  async accountLink(session: string, tokens: string[]): Promise<LinkedSpace[]> {
    return (await this.request<{ spaces: LinkedSpace[] }>('POST', '/account/link', session, { tokens }))
      .spaces;
  }

  spaceInfo(token: string): Promise<{ spaceId: string; name: string; graves: number }> {
    return this.request('GET', '/space', token);
  }

  async members(token: string): Promise<Member[]> {
    return (await this.request<{ members: Member[] }>('GET', '/members', token)).members;
  }

  updateMe(token: string, profile: Partial<Profile>): Promise<Profile> {
    return this.request('PATCH', '/me', token, profile);
  }

  leave(token: string): Promise<unknown> {
    return this.request('POST', '/space/leave', token);
  }

  rename(token: string, name: string): Promise<{ name: string }> {
    return this.request('PATCH', '/space', token, { name });
  }

  rotate(token: string): Promise<{ invite: string }> {
    return this.request('POST', '/space/rotate', token);
  }

  removeMember(token: string, memberId: string): Promise<unknown> {
    return this.request('DELETE', `/members/${encodeURIComponent(memberId)}`, token);
  }

  transferOwner(token: string, memberId: string): Promise<unknown> {
    return this.request('POST', `/members/${encodeURIComponent(memberId)}/owner`, token);
  }

  deleteSpace(token: string): Promise<unknown> {
    return this.request('DELETE', '/space', token);
  }
}
