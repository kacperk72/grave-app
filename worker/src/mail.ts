import type { Env } from './index';
import { HttpError } from './http';

export interface LoginMail {
  email: string;
  code: string;
  link: string;
}

/**
 * „log” wypisuje kod zamiast wysyłać maila — wyłącznie lokalnie. Jeśli ktoś przez pomyłkę
 * ustawi go na produkcji (adresy inne niż localhost), Worker i tak wysyła przez Resend.
 */
export function mailMode(env: Env): 'resend' | 'log' {
  const localOnly = env.ALLOWED_ORIGINS.split(',').every((o) => o.trim().startsWith('http://localhost:'));
  return env.MAIL_MODE === 'log' && localOnly ? 'log' : 'resend';
}

/** Wysyła kod; w trybie „log” zwraca go (dla testu dymnego). */
export async function sendLoginMail(
  env: Env,
  mail: LoginMail
): Promise<{ code: string; link: string } | undefined> {
  if (mailMode(env) === 'log') {
    console.log(`[mail:log] ${mail.email} kod=${mail.code} link=${mail.link}`);
    return { code: mail.code, link: mail.link };
  }
  if (!env.RESEND_API_KEY) throw new HttpError(503, 'Logowanie jest chwilowo niedostępne');
  const pretty = `${mail.code.slice(0, 3)} ${mail.code.slice(3)}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'znajdzgroby.pl <logowanie@znajdzgroby.pl>',
      to: [mail.email],
      subject: `Kod logowania do znajdzgroby.pl: ${pretty}`,
      text:
        `Twój kod do znajdzgroby.pl: ${pretty}\n\n` +
        `Albo kliknij: ${mail.link}\n\n` +
        'Kod jest ważny 15 minut. Jeśli to nie Ty — zignoruj tę wiadomość.',
    }),
  });
  if (!res.ok) {
    console.error('Resend', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, 'Nie udało się wysłać maila. Spróbuj za chwilę.');
  }
  return undefined;
}
