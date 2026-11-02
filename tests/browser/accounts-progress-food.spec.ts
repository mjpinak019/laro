import { test, expect, type Page } from './fixtures';
import { walkHubTo } from '../helpers/hub-walk';
import { FOOD_CORNER } from '../../client/src/hub';
import { makeBackup } from '../../client/src/save-backup';
import { normalizeProfile } from '../../client/src/store';

const key = 'laro.offline.profile.v1';
async function ready(page: Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready','true'); }
async function home(page: Page) { await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); }
test('food has six distinct recognizable SVGs and still buys and loads offline on mobile', async ({ page, context }) => {
  test.setTimeout(100000); await page.addInitScript(() => { if (!localStorage.getItem('food-seed')) { localStorage.setItem('laro.offline.profile.v1',JSON.stringify({coins:30,xp:75,tutorialPrompts:false})); localStorage.setItem('food-seed','1'); } }); await ready(page);
  await walkHubTo(page, FOOD_CORNER); await page.keyboard.press('e'); await expect(page.locator('.food-menu svg')).toHaveCount(4);
  for (const id of ['fishball','kwek-kwek','kikiam','taho']) await expect(page.locator(`[data-snack-art="${id}"]`)).toHaveAttribute('role','img');
  const drawings = await page.locator('.food-menu svg').evaluateAll(els => els.map(el=>el.innerHTML)); expect(new Set(drawings).size).toBe(4);
  await page.screenshot({path:'artifacts/food-street-reference-art.png',fullPage:true}); await page.locator('[data-buy-snack="taho"]').click(); await expect(page.locator('#food-coins')).toHaveText('24 coins');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).xp,key)).toBe(75); await page.locator('#food-close').click();
  await walkHubTo(page,{x:227,y:316}); await page.keyboard.press('e'); await expect(page.locator('#modal-title')).toContainText('sari-sari');
  await expect(page.locator('[data-snack-art="biscuit"]')).toBeVisible(); await expect(page.locator('[data-snack-art="juice"]')).toBeVisible();
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'artifacts/food-store-reference-art-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('[data-buy-snack="juice"]').click(); await expect(page.locator('#food-coins')).toHaveText('20 coins'); await page.locator('#food-close').click();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;}); await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true); await context.setOffline(true); await page.reload();
  await expect(page.locator('#game')).toHaveAttribute('data-ready','true'); await expect(page.locator('#coins')).toHaveText('20'); await expect(page.locator('#xp-text')).toContainText('75 total XP'); await context.setOffline(false);
});

test('a finished round levels up once, survives reload and practice/abandonment earn no XP', async ({page}) => {
  test.setTimeout(55000); await page.addInitScript(()=>{if(!localStorage.getItem('xp-seed')){localStorage.setItem('laro.offline.profile.v1',JSON.stringify({xp:90,tutorialPrompts:false}));localStorage.setItem('xp-seed','1');}}); await ready(page);
  await page.locator('[data-game="tinik"]').click(); await page.locator('#play-button').click(); await page.locator('#tinik-challenge').click();
  await expect(page.locator('.result-xp')).toContainText('+20 XP',{timeout:22000}); await expect(page.locator('.result-xp')).toContainText('LEVEL UP!'); await expect(page.locator('#player-level-number')).toHaveText('Level 2');
  await page.locator('#return-button').click(); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready','true'); await expect(page.locator('#xp-text')).toContainText('110 total XP');
  await page.locator('[data-game="tinik"]').click(); await page.locator('#play-button').click(); await page.locator('#tinik-practice').click(); await page.waitForTimeout(6000); await home(page);
  await page.locator('[data-game="lubid"]').click(); await page.locator('#play-button').click(); await page.locator('#lubid-start').click(); await expect(page.locator('#finish-lubid')).toBeEnabled(); await page.locator('#finish-lubid').click(); await expect(page.locator('.result-xp')).toHaveCount(0); await expect(page.locator('#xp-text')).toContainText('110 total XP');
});

test('all game types use the slow focus theme; modal, pause and mute silence it', async ({page}) => {
  await ready(page); await page.locator('#game canvas').click(); const panel=page.locator('#game-display'); await expect(panel).toHaveAttribute('data-music-theme','barangay'); await expect(panel).toHaveAttribute('data-music','playing');
  await page.locator('[data-game="jolen"]').click(); await page.locator('#play-button').click(); await page.locator('#jolen-start').click(); await expect(panel).toHaveAttribute('data-music','playing'); await expect(panel).toHaveAttribute('data-music-bpm','72'); await expect(panel).toHaveAttribute('data-music-theme','focus');
  await page.locator('#pause-button').click(); await expect(panel).toHaveAttribute('data-music','silent'); await page.locator('#resume-button').click(); await expect(panel).toHaveAttribute('data-music','playing');
  await page.locator('#sound-button').click(); await expect(panel).toHaveAttribute('data-music','silent'); await page.locator('#sound-button').click(); await expect(panel).toHaveAttribute('data-music','playing'); await home(page);
  await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('#dama-local').click(); await expect(panel).toHaveAttribute('data-music-theme','focus'); await expect(panel).toHaveAttribute('data-music','playing');
  await page.locator('#settings-button').click(); await page.locator('#music-enabled').uncheck(); await page.locator('#save-settings').click(); await expect(panel).toHaveAttribute('data-music','silent');
});

test('unconfigured accounts clearly retain guest play and never offer a fake password form', async({page})=>{
  await ready(page); await page.locator('#account-button').click(); await expect(page.locator('#account-panel')).toContainText('Accounts are not connected yet'); await expect(page.locator('#account-email')).toHaveCount(0);
  await page.locator('#account-close').click(); await page.setViewportSize({width:390,height:844}); await page.locator('#account-button').click(); expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test.describe('Configured account service contract',()=>{
  test.use({serviceWorkers:'block'});
  async function mockAccounts(page:Page, existing=true){
    const id='11111111-1111-4111-8111-111111111111', user={id,email:'player@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},identities:[]};
    const part=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url'); const token=part({alg:'HS256',typ:'JWT'})+'.'+part({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.test-signature';
    const session={access_token:token,refresh_token:'test-only-refresh',expires_in:3600,token_type:'bearer',user};
    const backend={copy:existing?makeBackup(normalizeProfile({name:'Cloud',coins:99,xp:300})):null,revision:existing?1:0,uploads:[] as any[],conflict:false,requests:[] as string[]};
    await page.route('**/account-config.json',route=>route.fulfill({json:{supabaseUrl:'https://laro-test.supabase.co',publishableKey:'sb_publishable_test_only'}}));
    await page.route('https://laro-test.supabase.co/**',async route=>{
      const request=route.request(),url=new URL(request.url()); backend.requests.push(url.pathname);
      if(url.pathname.endsWith('/signup')) return route.fulfill({json:{user,session:null}});
      if(url.pathname.endsWith('/token')) return route.fulfill({json:session});
      if(url.pathname.endsWith('/recover')) return route.fulfill({json:{}});
      if(url.pathname.endsWith('/logout')) return route.fulfill({status:204});
      if(url.pathname.endsWith('/user')) return route.fulfill({json:user});
      if(url.pathname.endsWith('/player_saves')) return route.fulfill({json:backend.copy?[{save:backend.copy,revision:backend.revision,updated_at:new Date().toISOString()}]:[]});
      if(url.pathname.endsWith('/rpc/save_laro_progress')){
        const body=request.postDataJSON(); backend.uploads.push(body);
        if(backend.conflict) return route.fulfill({status:400,json:{code:'40001',message:'Cloud copy changed'}});
        backend.copy=body.p_save;backend.revision++;return route.fulfill({json:{revision:backend.revision,updated_at:new Date().toISOString()}});
      }
      return route.fulfill({status:404,json:{message:'Unexpected test endpoint'}});
    }); return backend;
  }
  async function signIn(page:Page){await page.locator('#account-button').click();await page.locator('#account-email').fill('player@example.test');await page.locator('#account-password').fill('TestOnlyPassword42!');await page.locator('#account-submit').click();await expect(page.locator('#account-identity')).toHaveText('player@example.test');}
  test('email signup, reset, session persistence and reviewed cloud save/restore work without replacing progress on login',async({page})=>{
    const backend=await mockAccounts(page); await page.addInitScript(()=>{if(!localStorage.getItem('auth-seed')){localStorage.setItem('laro.offline.profile.v1',JSON.stringify({name:'Local',coins:20,xp:80,tutorialPrompts:false}));localStorage.setItem('auth-seed','1');}}); await ready(page);
    await page.locator('#account-button').click();await page.locator('#account-mode').click();await page.locator('#account-email').fill('player@example.test');await page.locator('#account-password').fill('TestOnlyPassword42!');await page.locator('#account-submit').click();await expect(page.locator('#account-status')).toContainText('Check your email');
    await page.locator('#account-mode').click();await page.locator('#account-email').fill('player@example.test');await page.locator('#account-reset').click();await expect(page.locator('#account-status')).toContainText('password reset link');
    await page.locator('#account-email').fill('player@example.test');await page.locator('#account-password').fill('TestOnlyPassword42!');await page.locator('#account-submit').click();await expect(page.locator('#account-identity')).toBeVisible();await expect(page.locator('#coins')).toHaveText('20');
    await page.locator('#cloud-load').click();await expect(page.locator('#cloud-preview-details')).toContainText('99 coins');await expect(page.locator('#coins')).toHaveText('20');await page.locator('#cloud-confirm').click();await expect(page.locator('#coins')).toHaveText('99');await expect(page.locator('#player-level-number')).toHaveText('Level 3');
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.before-cloud-restore.v1')!).profile.coins)).toBe(20);
    await page.locator('#cloud-save').click();await expect(page.locator('#cloud-preview-title')).toContainText('Replace');await page.locator('#cloud-confirm').click();await expect(page.locator('#account-status')).toContainText('Cloud copy saved');expect(backend.uploads).toHaveLength(1);expect(backend.uploads[0].p_expected_revision).toBe(1);expect(backend.uploads[0].p_save.profile.xp).toBe(300);expect(JSON.stringify(backend.uploads[0])).not.toContain('TestOnlyPassword42');
    await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');await page.locator('#account-button').click();await expect(page.locator('#account-identity')).toBeVisible();await page.screenshot({path:'artifacts/account-cloud-progress.png',fullPage:true});await page.locator('#account-signout').click();await expect(page.locator('#account-email')).toBeVisible();await expect(page.locator('#coins')).toHaveText('99');expect(await page.evaluate(()=>localStorage.getItem('laro.auth.v1'))).toBeNull();
  });
  test('stale saves and offline account requests show errors without overwriting local progress',async({page,context})=>{
    const backend=await mockAccounts(page);await ready(page);await signIn(page);backend.conflict=true;await page.locator('#cloud-save').click();await page.locator('#cloud-confirm').click();await expect(page.locator('#account-status')).toContainText('Another device');expect(backend.copy!.profile.coins).toBe(99);await expect(page.locator('#coins')).toHaveText('0');
    await context.setOffline(true);await page.locator('#cloud-load').click();await expect(page.locator('#account-status')).toContainText('Connection unavailable');await expect(page.locator('#coins')).toHaveText('0');await context.setOffline(false);
  });
  test('new accounts create their first cloud copy only after confirmation',async({page})=>{
    const backend=await mockAccounts(page,false);await ready(page);await signIn(page);expect(backend.uploads).toHaveLength(0);
    await page.locator('#cloud-load').click();await expect(page.locator('#account-status')).toContainText('No cloud copy yet');
    await page.locator('#cloud-save').click();await expect(page.locator('#cloud-preview-title')).toContainText('Create a cloud copy');await page.locator('#cloud-confirm').click();await expect(page.locator('#account-status')).toContainText('Cloud copy saved');expect(backend.uploads[0].p_expected_revision).toBeNull();expect(backend.revision).toBe(1);
  });
  test('password recovery links open the reset form and update the password through Supabase',async({page})=>{
    const backend=await mockAccounts(page);await page.addInitScript(()=>localStorage.setItem('laro.auth.v1-code-verifier',JSON.stringify('test-verifier/recovery')));
    await page.goto('/?code=test-recovery-code');await expect(page.locator('#game')).toHaveAttribute('data-ready','true');await expect(page.locator('#account-password-form')).toBeVisible();
    await page.locator('#account-password').fill('ReplacementTestPassword42!');await page.locator('#account-password-form button').click();await expect(page.locator('#account-status')).toContainText('Password updated');await expect(page.locator('#account-identity')).toBeVisible();expect(backend.requests).toContain('/auth/v1/user');
  });

});
