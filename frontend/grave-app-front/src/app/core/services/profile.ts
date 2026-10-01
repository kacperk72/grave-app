import { Profile } from '../../shared/models/space.model';
import { isAvatarColor } from '../../shared/utils/member-display';
import { readStorage, writeStorage } from './storage';

const PROFILE_KEY = 'gravemap-profile';

/** Ostatni podpis z tego telefonu — podpowiedź przy kolejnych mapach. */
export function readProfile(): Profile | null {
  try {
    const parsed = JSON.parse(readStorage(PROFILE_KEY) ?? 'null') as Partial<Profile> | null;
    if (parsed && typeof parsed.name === 'string' && isAvatarColor(parsed.color)) {
      return { name: parsed.name, color: parsed.color };
    }
  } catch {
    // uszkodzony wpis — jak brak
  }
  return null;
}

export function writeProfile(profile: Profile): void {
  writeStorage(PROFILE_KEY, JSON.stringify(profile));
}
