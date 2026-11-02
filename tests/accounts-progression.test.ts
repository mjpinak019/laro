import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { normalizeProfile, STORAGE_KEY } from '../client/src/store.ts';
import { awardXp, playerLevel, MAX_XP } from '../client/src/progression.ts';
import { makeBackup, readBackup } from '../client/src/save-backup.ts';
import { restoreCloudBackup } from '../client/src/profile-restore.ts';
import { validateAccountConfig } from '../client/src/account-config.ts';

test('legacy games receive one XP migration; purchases and unfinished/practice rounds cannot farm levels', () => {
  const profile = normalizeProfile({ coins: 1234, played: 3, wins: 1, records: { dama: { played: 4, wins: 2 } } });
  assert.equal(profile.xp, 260); assert.equal(playerLevel(profile.xp).level, 2); assert.equal(profile.coins, 1234);
  const initial = profile.xp;
  assert.equal(awardXp(profile, { won: true, practice: true }), 0);
  assert.equal(awardXp(profile, { won: false, failure: false, record: 0 }), 0); assert.equal(profile.xp, initial);
  awardXp(profile, { won: true }); profile.played++; assert.equal(profile.xp, 320); assert.equal(playerLevel(profile.xp).level, 2);
  assert.equal(normalizeProfile(profile).xp, 320); assert.equal(readBackup(JSON.stringify(makeBackup(profile))).profile.xp, 320);
  awardXp(profile, { won: false, draw: true }); assert.equal(profile.xp, 355);
  awardXp(profile, { won: false }); assert.equal(profile.xp, 375);
});
test('level boundaries and malformed XP are bounded without losing valid old progress', () => {
  for (const [xp, expected] of [[0,0],[99,0],[100,1],[234,1],[235,2],[414,2],[415,3]]) assert.equal(playerLevel(xp).level, expected);
  assert.equal(normalizeProfile({ xp: -10 }).xp, 0); assert.equal(normalizeProfile({ xp: Infinity, played: 1 }).xp, 20);
  const profile = normalizeProfile({ xp: MAX_XP }); awardXp(profile, { won: true }); assert.equal(profile.xp, MAX_XP);
});
test('account configuration rejects server keys and insecure remote origins', () => {
  assert.equal(validateAccountConfig({}), null);
  assert.deepEqual(validateAccountConfig({ supabaseUrl: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' }), { supabaseUrl: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' });
  for (const [url, key] of [['http://example.com','sb_publishable_test'],['https://example.com','sb_secret_private'],['https://user:pass@example.com','sb_publishable_test'],['https://example.com/path','sb_publishable_test']]) assert.throws(() => validateAccountConfig({ supabaseUrl: url, publishableKey: key }));
  const secretJwt = 'header.' + btoa(JSON.stringify({ role: 'service_role' })) + '.signature';
  assert.throws(() => validateAccountConfig({ supabaseUrl: 'https://example.com', publishableKey: secretJwt }));
});
test('a failed cloud restore rolls back saved data and never changes the live profile', () => {
  const profile = normalizeProfile({ name: 'Local', coins: 567, xp: 320 }), before = structuredClone(profile), incoming = makeBackup(normalizeProfile({ name: 'Cloud', coins: 42 }));
  const values = new Map([[STORAGE_KEY, JSON.stringify(profile)],['laro.dama.match.v1','old-match']]); let fail = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key,value); }, removeItem: (key: string) => { if (key === 'laro.dama.match.v1' && fail) { fail = false; throw new Error('Blocked'); } values.delete(key); } } as Storage;
  assert.throws(() => restoreCloudBackup(profile, incoming, null, storage)); assert.deepEqual(profile, before); assert.equal(values.get('laro.dama.match.v1'), 'old-match'); assert.equal(JSON.parse(values.get(STORAGE_KEY)!).coins, 567);
  restoreCloudBackup(profile, incoming, null, storage); assert.equal(profile.name, 'Cloud'); assert.equal(values.get('laro.dama.match.v1'), undefined); assert.equal(JSON.parse(values.get('laro.before-cloud-restore.v1')!).profile.coins, 567);
});

test('Supabase migration enforces ownership, restricted writes, atomic revisions and payload limits in PostgreSQL', async () => {
  const db = new PGlite(), alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      insert into auth.users values ('${alice}'),('${bob}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202611020001_player_saves.sql', import.meta.url),'utf8'));
    const payload = JSON.stringify(makeBackup(normalizeProfile({ coins: 100, xp: 320 })));
    await db.exec('set role anon'); await assert.rejects(db.query('select * from public.player_saves'), (e: any) => e.code === '42501');
    await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,null)',[payload]), (e: any) => e.code === '42501');
    await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);
    const first = await db.query<any>('select public.save_laro_progress($1::jsonb,null) as result',[payload]); assert.equal(first.rows[0].result.revision, 1);
    await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,null)',[payload]), (e: any) => e.code === '40001');
    await assert.rejects(db.query('insert into public.player_saves(user_id,save) values($1,$2::jsonb)',[bob,payload]), (e: any) => e.code === '42501');
    await assert.rejects(db.query('update public.player_saves set revision = 50'), (e: any) => e.code === '42501');
    await db.query('select public.save_laro_progress($1::jsonb,1)',[payload]); await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,1)',[payload]), (e: any) => e.code === '40001');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[bob]);
    assert.equal((await db.query('select * from public.player_saves')).rows.length, 0);
    await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,2)',[payload]), (e: any) => e.code === '40001');
    await db.query('select public.save_laro_progress($1::jsonb,null)',[payload]); assert.equal((await db.query('select * from public.player_saves')).rows.length, 1);
    await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,1)',[JSON.stringify({ format:'wrong',profile:{} })]), (e: any) => e.code === '22023');
    await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,1)',[JSON.stringify({format:'laro-save',version:1,profile:{big:'x'.repeat(100001)}})]), (e: any) => e.code === '22023');
    await db.query("select set_config('request.jwt.claim.sub','',false)"); await assert.rejects(db.query('select public.save_laro_progress($1::jsonb,null)',[payload]), (e: any) => e.code === '42501');
  } finally { await db.close(); }
});
