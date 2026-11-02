import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { loadAccountConfig } from './account-config';
import { readBackup, type SaveBackup } from './save-backup';

export type CloudCopy = { backup: SaveBackup; revision: number; updatedAt: string };
export class AccountService {
  private client?: SupabaseClient;
  private listeners = new Set<() => void>();
  session: Session | null = null;
  initialized = false;
  recovery = false;
  error = '';
  get configured() { return !!this.client; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private changed() { for (const listener of this.listeners) listener(); }
  async init() {
    try {
      const config = await loadAccountConfig();
      if (config) {
        const { createClient } = await import('@supabase/supabase-js');
        this.client = createClient(config.supabaseUrl, config.publishableKey, { auth: { storageKey: 'laro.auth.v1', flowType: 'pkce', persistSession: true, detectSessionInUrl: true } });
        this.client.auth.onAuthStateChange((event, session) => {
          const previous = this.session?.user.id; this.session = session;
          if (event === 'PASSWORD_RECOVERY') this.recovery = true;
          if (previous !== session?.user.id || event === 'PASSWORD_RECOVERY') this.changed();
        });
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error; this.session = data.session;
      }
    } catch (error) { this.error = accountError(error); }
    this.initialized = true; this.changed();
  }
  private connected() {
    if (!this.client) throw new Error('Accounts are not connected yet. You can continue as a guest.');
    if (!navigator.onLine) throw new Error('Connect to the internet to use your account. Guest play and local saves work offline.');
    return this.client;
  }
  private userId() { const id = this.session?.user.id; if (!id) throw new Error('Sign in before using cloud saves.'); return id; }
  private sameUser(id: string) { if (this.session?.user.id !== id) throw new Error('The account changed. Open Account again before continuing.'); }
  private async authorization(client: SupabaseClient, id: string) {
    const { data, error } = await client.auth.getSession(); this.sameUser(id);
    if (error) throw error;
    if (!data.session || data.session.user.id !== id) throw new Error('The account changed. Review your save again.');
    return `Bearer ${data.session.access_token}`;
  }
  private redirect() { return new URL('./', location.href).href; }
  async signIn(email: string, password: string) {
    const { error } = await this.connected().auth.signInWithPassword({ email, password }); if (error) throw error;
  }
  async signUp(email: string, password: string) {
    const { data, error } = await this.connected().auth.signUp({ email, password, options: { emailRedirectTo: this.redirect() } });
    if (error) throw error; return !!data.session;
  }
  async reset(email: string) { const { error } = await this.connected().auth.resetPasswordForEmail(email, { redirectTo: this.redirect() }); if (error) throw error; }
  async changePassword(password: string) { const { error } = await this.connected().auth.updateUser({ password }); if (error) throw error; this.recovery = false; this.changed(); }
  async signOut() {
    const { error } = await this.connected().auth.signOut({ scope: 'local' }); if (error) throw error;
    this.session = null; this.recovery = false; this.changed();
  }
  async loadCloud(): Promise<CloudCopy | null> {
    const client = this.connected(), id = this.userId();
    const authorization = await this.authorization(client, id);
    const { data, error } = await client.from('player_saves').select('save,revision,updated_at').eq('user_id', id).maybeSingle().setHeader('Authorization', authorization);
    this.sameUser(id); if (error) throw error; if (!data) return null;
    if (!Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error('The cloud save revision is invalid.');
    return { backup: readBackup(JSON.stringify(data.save)), revision: data.revision, updatedAt: data.updated_at };
  }
  async saveCloud(backup: SaveBackup, expectedRevision: number | null) {
    const client = this.connected(), id = this.userId();
    const authorization = await this.authorization(client, id);
    const { error } = await client.rpc('save_laro_progress', { p_save: backup, p_expected_revision: expectedRevision }).setHeader('Authorization', authorization);
    this.sameUser(id);
    if (error?.code === '40001') throw new Error('Another device updated your cloud save. Review the latest cloud copy before saving again.');
    if (error) throw error;
  }
}
export function accountError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Could not complete the account request.';
  if (/fetch|network|offline/i.test(message)) return 'Connection unavailable. Your local progress is safe; try again when online.';
  if (/player_saves|save_laro_progress|schema cache|permission denied/i.test(message)) return 'Cloud saves need to be enabled for this account service. Your local progress is unchanged.';
  return message;
}
