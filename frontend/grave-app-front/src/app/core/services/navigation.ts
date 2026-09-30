/**
 * Czy poprzedni wpis w historii przeglądarki należy do tej aplikacji.
 *
 * Router Angulara zapisuje w `history.state` numer nawigacji — 1 to wejście do
 * aplikacji (np. z linku), więcej = użytkownik przyszedł z innego ekranu. Samo
 * `history.length` liczy też cudze strony, więc „wstecz" mogłoby wyrzucić z aplikacji.
 */
export function canGoBackInApp(): boolean {
  const state = history.state as { navigationId?: number } | null;
  return (state?.navigationId ?? 1) > 1;
}
