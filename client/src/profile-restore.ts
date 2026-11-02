import { makeBackup, type SaveBackup } from './save-backup.ts';
import { STORAGE_KEY, type Profile } from './store.ts';

export function restoreCloudBackup(profile: Profile, backup: SaveBackup, currentDama: unknown, storage: Storage = localStorage) {
  const damaKey = 'laro.dama.match.v1', before = storage.getItem(STORAGE_KEY), dama = storage.getItem(damaKey);
  try {
    storage.setItem('laro.before-cloud-restore.v1', JSON.stringify(makeBackup(profile, currentDama)));
    storage.setItem(STORAGE_KEY, JSON.stringify(backup.profile));
    if (backup.dama) storage.setItem(damaKey, JSON.stringify(backup.dama)); else storage.removeItem(damaKey);
  } catch {
    try { if (before === null) storage.removeItem(STORAGE_KEY); else storage.setItem(STORAGE_KEY, before); if (dama === null) storage.removeItem(damaKey); else storage.setItem(damaKey, dama); } catch { /* Report failed saving; keep the in-memory game unchanged. */ }
    throw new Error('This browser could not restore the cloud copy. Your current game has not changed.');
  }
  Object.assign(profile, backup.profile);
}
