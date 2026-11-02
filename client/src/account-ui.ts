import { AccountService, accountError, type CloudCopy } from './account';
import type { SaveBackup } from './save-backup';
import { playerLevel } from './progression';
import type { Profile } from './store';

export function mountAccount(host: HTMLElement, service: AccountService, profile: Profile, canRestore: () => boolean, snapshot: () => SaveBackup, restore: (backup: SaveBackup) => void) {
  let signup = false, busy = false, message = '', copy: CloudCopy | null = null, preview: 'save' | 'restore' | null = null;
  let snapshotAtReview: SaveBackup | null = null, reviewedUser: string | null = null;
  const info = (save: SaveBackup) => `${save.profile.name} · Level ${playerLevel(save.profile.xp).level} · ${save.profile.coins} coins · ${save.profile.wardrobe.owned.length} purchased items`;
  const run = async (operation: () => Promise<void>) => {
    if (busy) return; busy = true; host.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.disabled = true);
    try { await operation(); } catch (error) { message = accountError(error); preview = null; }
    finally { busy = false; if (host.isConnected) render(); }
  };
  const render = () => {
    if (!host.isConnected || busy) return;
    host.replaceChildren(); const body = document.createElement('div'); body.className = 'account-content'; host.append(body);
    if (!service.initialized) body.innerHTML = '<p>Checking account availability…</p>';
    else if (!service.configured) body.innerHTML = '<p>Accounts are not connected yet. Guest play and progress saving on this device are available now.</p><p class="fine-print">Email accounts and cloud saves will become available after the account service is connected.</p>';
    else if (!canRestore()) body.innerHTML = '<p>Return to the barangay to sign in or manage cloud progress. Your current game stays paused while this menu is open.</p>';
    else if (service.recovery && service.session) {
      body.innerHTML = '<form id="account-password-form"><label class="field-label" for="account-password">New password</label><input id="account-password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required/><button class="primary-button">Set new password</button></form>';
      body.querySelector<HTMLFormElement>('form')!.onsubmit = event => { event.preventDefault(); const password = body.querySelector<HTMLInputElement>('input')!.value; void run(async () => { await service.changePassword(password); message = 'Password updated. You can now use your account.'; }); };
    } else if (!service.session) {
      preview = null; copy = null; snapshotAtReview = null;
      body.innerHTML = `<p>Email accounts are optional. Guest play and local saves remain available.</p><form id="account-form"><label class="field-label" for="account-email">Email</label><input id="account-email" type="email" autocomplete="email" maxlength="254" required/><label class="field-label" for="account-password">Password${signup ? ' · at least 12 characters' : ''}</label><input id="account-password" type="password" minlength="${signup ? 12 : 1}" maxlength="128" autocomplete="${signup ? 'new-password' : 'current-password'}" required/><button id="account-submit" class="primary-button">${signup ? 'Create account' : 'Sign in'}</button></form><div class="account-actions"><button id="account-mode" class="secondary-button">${signup ? 'Already have an account? Sign in' : 'Create an account'}</button><button id="account-reset" class="text-button">Forgot password?</button></div><p class="fine-print">Your email is used for account access. Game progress uploads only when you choose Save cloud copy.</p>`;
      body.querySelector<HTMLFormElement>('#account-form')!.onsubmit = event => {
        event.preventDefault(); const email = body.querySelector<HTMLInputElement>('#account-email')!.value.trim(), password = body.querySelector<HTMLInputElement>('#account-password')!.value;
        void run(async () => { if (signup) { const signedIn = await service.signUp(email, password); message = signedIn ? 'Account created. Choose how to manage your progress below.' : 'Check your email to confirm your account, then sign in.'; } else { await service.signIn(email, password); message = 'Signed in. Your local progress has not been replaced.'; } });
      };
      body.querySelector<HTMLButtonElement>('#account-mode')!.onclick = () => { signup = !signup; message = ''; render(); };
      body.querySelector<HTMLButtonElement>('#account-reset')!.onclick = () => {
        const email = body.querySelector<HTMLInputElement>('#account-email')!; if (!email.value || !email.checkValidity()) { email.reportValidity(); return; }
        void run(async () => { await service.reset(email.value.trim()); message = 'If that email has an account, a password reset link has been sent.'; });
      };
    } else {
      body.innerHTML = '<p>Signed in as <strong id="account-identity"></strong></p><p>Your game stays saved on this device. Cloud copies transfer progress between devices only when you choose to save or restore.</p><div class="account-actions"><button id="cloud-save" class="primary-button">Save cloud copy</button><button id="cloud-load" class="secondary-button">Review cloud copy</button><button id="account-signout" class="text-button">Sign out</button></div><p class="fine-print">Signing out keeps local progress on this device. Email/password details are not included in downloadable game backups.</p><div id="cloud-preview"></div>';
      body.querySelector('#account-identity')!.textContent = service.session.user.email ?? 'Your account';
      body.querySelector<HTMLButtonElement>('#cloud-save')!.onclick = () => void run(async () => { copy = await service.loadCloud(); reviewedUser = service.session!.user.id; snapshotAtReview = snapshot(); preview = 'save'; message = ''; });
      body.querySelector<HTMLButtonElement>('#cloud-load')!.onclick = () => void run(async () => { copy = await service.loadCloud(); reviewedUser = service.session!.user.id; preview = copy ? 'restore' : null; message = copy ? '' : 'No cloud copy yet. Choose Save cloud copy to create one.'; });
      body.querySelector<HTMLButtonElement>('#account-signout')!.onclick = () => void run(async () => { await service.signOut(); preview = null; message = 'Signed out. Your progress remains saved on this device.'; });
      if (preview) {
        const area = body.querySelector('#cloud-preview')!; area.innerHTML = '<h3 id="cloud-preview-title"></h3><p id="cloud-preview-details"></p><button id="cloud-confirm" class="primary-button"></button><button id="cloud-cancel" class="secondary-button">Cancel</button>';
        area.querySelector('#cloud-preview-title')!.textContent = preview === 'save' ? copy ? 'Replace your cloud copy?' : 'Create a cloud copy?' : 'Restore this cloud copy?';
        area.querySelector('#cloud-preview-details')!.textContent = preview === 'save' ? `This device: ${info(snapshotAtReview!)}. ${copy ? 'Cloud: ' + info(copy.backup) + '.' : 'No cloud copy exists.'}` : `${info(copy!.backup)}. This replaces this device’s progress; a safety copy is kept locally first.`;
        area.querySelector<HTMLButtonElement>('#cloud-confirm')!.textContent = preview === 'save' ? 'Confirm cloud save' : 'Replace local progress';
        area.querySelector<HTMLButtonElement>('#cloud-confirm')!.onclick = () => void run(async () => {
          if (!canRestore() || reviewedUser !== service.session?.user.id) throw new Error('Return to the barangay and review this account’s save again.');
          if (preview === 'save') { await service.saveCloud(snapshotAtReview!, copy?.revision ?? null); message = 'Cloud copy saved. Your other devices can now restore it.'; }
          else { restore(copy!.backup); message = 'Cloud progress restored and saved on this device.'; }
          preview = null; snapshotAtReview = null;
        });
        area.querySelector<HTMLButtonElement>('#cloud-cancel')!.onclick = () => { preview = null; render(); };
      }
    }
    const status = document.createElement('p'); status.id = 'account-status'; status.setAttribute('role','status'); status.textContent = message || service.error; body.append(status);
  };
  const unsubscribe = service.subscribe(() => { if (reviewedUser && reviewedUser !== service.session?.user.id) { preview = null; copy = null; } render(); }); render(); return unsubscribe;
}
