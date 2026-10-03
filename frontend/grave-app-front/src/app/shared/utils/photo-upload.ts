/**
 * Co zrobić ze zdjęciem, którego serwer nie przyjął:
 * - `later` — dzienny limit wysyłania (429): zdjęcie zostaje w kolejce i pojedzie po resecie limitu;
 * - `drop` — odmowa na stałe (za duże, zły format, brak miejsca): zostaje tylko w tym telefonie;
 * - `fail` — inny błąd: przerwij synchronizację mapy, spróbujemy przy następnej.
 */
export type PhotoRejection = 'later' | 'drop' | 'fail';

export function photoRejection(status: number): PhotoRejection {
  if (status === 429) return 'later';
  if (status === 413 || status === 415 || status === 507) return 'drop';
  return 'fail';
}
