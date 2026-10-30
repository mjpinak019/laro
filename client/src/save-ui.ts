import { makeBackup, readBackup } from './save-backup';
import { STORAGE_KEY, type Profile } from './store';
import { savedDama } from './games/dama';

export function mountSaveTools(host: HTMLElement, profile: Profile, canRestore: () => boolean, restored: () => void) {
  host.innerHTML = `<h3>Your progress</h3><p class="fine-print">Coins, owned items, equipped clothes, avatar choices, and records save automatically in this browser. Download a save file to back up or move progress to another device. Clearing browser data removes the local save. Restoring replaces this device's profile and saved Dama match.</p><div class="save-file-actions"><button type="button" id="export-save">Download save file</button><label class="backup-import-label">Choose save file<input type="file" id="import-save" accept=".json,application/json" ${canRestore() ? '' : 'disabled'} /></label></div><p id="backup-status" role="status">${canRestore() ? '' : 'Return to the barangay before restoring a save.'}</p><div id="backup-preview" hidden><p id="backup-preview-text"></p><button type="button" id="confirm-import" class="secondary-button">Replace local progress with this save</button></div>`;
  const status = host.querySelector('#backup-status')!;
  host.querySelector<HTMLButtonElement>('#export-save')!.onclick = () => {
    const blob = new Blob([JSON.stringify(makeBackup(profile, savedDama()), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `laro-save-${new Date().toISOString().slice(0, 10)}.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 5000); status.textContent = 'Save file downloaded. Keep it somewhere safe to restore on another device.';
  };
  let pending: ReturnType<typeof readBackup> | null = null;
  host.querySelector<HTMLInputElement>('#import-save')!.onchange = async event => {
    pending = null; (host.querySelector('#backup-preview') as HTMLElement).hidden = true;
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('This save file is too large.'); pending = readBackup(await file.text());
      host.querySelector('#backup-preview-text')!.textContent = `${pending.profile.name} · ${pending.profile.coins} coins · ${pending.profile.wardrobe.owned.length} purchased items. The current local progress will be replaced.`;
      (host.querySelector('#backup-preview') as HTMLElement).hidden = false; status.textContent = 'Save file checked. Review it before restoring.';
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Could not read the save file.'; }
  };
  host.querySelector<HTMLButtonElement>('#confirm-import')!.onclick = () => {
    if (!pending || !canRestore()) { status.textContent = 'Return to the barangay before restoring progress.'; return; }
    const damaKey = 'laro.dama.match.v1'; let previousProfile: string | null = null, previousDama: string | null = null, haveSnapshot = false;
    try {
      previousProfile = localStorage.getItem(STORAGE_KEY); previousDama = localStorage.getItem(damaKey); haveSnapshot = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending.profile));
      if (pending.dama) localStorage.setItem(damaKey, JSON.stringify(pending.dama)); else localStorage.removeItem(damaKey);
    } catch {
      if (haveSnapshot) try { if (previousProfile === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, previousProfile); if (previousDama === null) localStorage.removeItem(damaKey); else localStorage.setItem(damaKey, previousDama); } catch { /* The browser reports saving unavailable below. */ }
      status.textContent = 'This browser could not save the restored data. Your current game has not changed.'; return;
    }
    Object.assign(profile, pending.profile); pending = null; restored();
  };
}
