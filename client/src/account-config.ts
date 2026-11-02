export type AccountConfig = { supabaseUrl: string; publishableKey: string };
export function validateAccountConfig(raw: unknown): AccountConfig | null {
  const value = raw as Partial<AccountConfig> | null;
  if (!value?.supabaseUrl || !value.publishableKey) return null;
  if (typeof value.supabaseUrl !== 'string' || typeof value.publishableKey !== 'string') throw new Error('Account configuration must contain public text values.');
  const url = new URL(value.supabaseUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Account server must use HTTPS.');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use the account project origin only.');
  if (value.publishableKey.startsWith('sb_secret_')) throw new Error('A secret server key cannot be used in the game.');
  if (value.publishableKey.split('.').length === 3) {
    try { const payload = JSON.parse(atob(value.publishableKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (payload.role !== 'anon') throw new Error('Expected a public anon key.'); }
    catch { throw new Error('Use a publishable key or public anon key.'); }
  } else if (!value.publishableKey.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key.');
  return { supabaseUrl: url.origin, publishableKey: value.publishableKey };
}
export async function loadAccountConfig() {
  const env = { supabaseUrl: import.meta.env.VITE_SUPABASE_URL, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };
  if (env.supabaseUrl || env.publishableKey) return validateAccountConfig(env);
  const response = await fetch(new URL('./account-config.json', location.href), { cache: 'no-store' });
  if (!response.ok) return null;
  return validateAccountConfig(await response.json());
}
