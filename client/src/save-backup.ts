import { normalizeProfile, type Profile } from './store.ts';
import { validDamaSave, type DamaState } from './games/dama-rules.ts';

export type SaveBackup = { format: 'laro-save'; version: 1; exportedAt: string; profile: Profile; dama: DamaState | null };
export function makeBackup(profile: Profile, dama: unknown = null): SaveBackup {
  return { format: 'laro-save', version: 1, exportedAt: new Date().toISOString(), profile: normalizeProfile(profile), dama: validDamaSave(dama) ? dama as DamaState : null };
}
export function readBackup(text: string): SaveBackup {
  if (text.length > 100_000) throw new Error('This save file is too large.');
  let value: Partial<SaveBackup>; try { value = JSON.parse(text); } catch { throw new Error('Choose a valid LARO save file.'); }
  if (!value || value.format !== 'laro-save' || value.version !== 1 || !value.profile || typeof value.profile.name !== 'string' || !Number.isFinite(value.profile.coins) || value.profile.coins < 0) throw new Error('This is not a supported LARO save file.');
  if (value.dama != null && !validDamaSave(value.dama)) throw new Error('The saved Dama match is damaged.');
  return makeBackup(value.profile, value.dama);
}
