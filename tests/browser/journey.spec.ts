import {test,expect,type Page} from './fixtures';
import {walkHubTo} from '../helpers/hub-walk';
import {xpForLevel,MAX_XP} from '../../client/src/progression';
import {pikoRoute,PIKO_LEVELS} from '../../client/src/games/piko-rules';

async function fresh(page:Page,xp=0,offers=['clean-plaza','honest-wallet','fair-play'],coins=100) {
  await page.addInitScript(({xp,offers,coins})=>{if(!localStorage.getItem('journey-seed')){const d=new Date();localStorage.setItem('laro.offline.profile.v1',JSON.stringify({name:'Sab',xp,coins,tutorialPrompts:false,quests:{day:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,offers,claimed:[],total:0,active:null}}));localStorage.setItem('journey-seed','1');}},{xp,offers,coins});
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
}
async function talk(page:Page,point:{x:number;y:number;spot?:number}) {await walkHubTo(page,point);await page.locator('#activity-action').click();if(point.spot===undefined||point.spot<0)await expect(page.getByRole('dialog')).toBeVisible();}
async function street(page:Page,id:string,level='easy'){await page.locator(`[data-game="${id}"]`).click();await page.locator('#play-button').click();await page.locator('#street-difficulty').selectOption(level);await page.locator('#street-start').click();}
async function home(page:Page){await page.locator('#nav-hub').click();await page.locator('#confirm-home').click();}

test('new players have only the three requested starters; menus and map entries explain locked games',async({page})=>{
  await fresh(page);await expect(page.locator('#player-level-number')).toHaveText('Level 0');await expect(page.locator('#game')).toHaveAttribute('data-avatar-level','0');
  expect(await page.locator('[data-game][data-locked="false"]').evaluateAll(els=>els.map(el=>(el as HTMLElement).dataset.game).sort())).toEqual(['dama','patintero','tinik']);
  await page.locator('[data-game="piko"]').click();await page.locator('#play-button').click();await expect(page.locator('#modal-title')).toContainText('Level 2');await expect(page.locator('#street-start')).toHaveCount(0);await page.locator('#locked-close').click();
  await page.locator('[data-game="dama"]').click();await page.locator('#play-button').click();await page.locator('[data-table-game="chess"]').click();await expect(page.locator('#modal-title')).toContainText('Level 12');await page.locator('#locked-close').click();await page.screenshot({path:'artifacts/journey-level-zero.png',fullPage:true});
});
test('physical quest pickups, offline reload, return dialogue and one reward update the moving avatar level',async({page,context})=>{
  test.setTimeout(100000);await fresh(page,220);await page.locator('[data-game="piko"]').click();await expect(page.locator('#play-button')).toContainText('Level 2');await talk(page,{x:227,y:316});await expect(page.locator('#modal-title')).toHaveText('Bayanihan sa plaza');await page.locator('#quest-accept').click();await page.locator('#quest-close').click();
  for(let index=0;index<3;index++){
    const nodes=JSON.parse((await page.locator('#game').getAttribute('data-quest-nodes'))!);const node=nodes.find((n:any)=>n.spot>=0);expect(node).toBeTruthy();await talk(page,node);
    if(index===0){await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');}
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).quests.active.progress)).toBe(index+1);
  }
  await page.locator('[data-game="piko"]').click();await expect(page.locator('#play-button')).toContainText('Level 2');await talk(page,{x:227,y:316});await expect(page.locator('#quest-claim')).toBeEnabled();await page.screenshot({path:'artifacts/quest-return-dialogue.png'});await page.locator('#quest-claim').click();await expect(page.locator('#modal-title')).toContainText('thanks you');await page.locator('#quest-done').click();await expect(page.locator('#coins')).toHaveText('120');await expect(page.locator('#game')).toHaveAttribute('data-avatar-level','2');await expect(page.locator('#play-button')).toContainText('Play Piko');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!));expect(saved.xp).toBe(275);expect(saved.quests.total).toBe(1);expect(saved.quests.active).toBeNull();await context.setOffline(false);
});
test('an elder errand counts a purchase after acceptance and requires returning to its giver',async({page})=>{
  test.setTimeout(75000);await fresh(page,0,['elder-errand','fair-play','honest-wallet']);await talk(page,{x:372,y:750});await page.locator('#quest-accept').click();await page.locator('#quest-close').click();
  await talk(page,{x:227,y:316});if(await page.locator('#quest-shop').count())await page.locator('#quest-shop').click();await page.locator('[data-buy-snack="biscuit"]').click();await page.locator('#merienda-skip').click();await page.locator('#food-close').click();
  await page.locator('#quests-button').click();await page.locator('[data-quest-details="elder-errand"]').click();await expect(page.locator('#quest-claim')).toBeDisabled();await page.locator('#quest-close').click();
  await talk(page,{x:372,y:750});await page.locator('#quest-claim').click();await expect(page.locator('#coins')).toHaveText('117');
  await page.locator('#quest-done').click();await page.locator('#quests-button').click();await expect(page.locator('[data-quest-cooldown="Tatay Efren"]')).toContainText('14:');await expect(page.locator('[data-quest-details="honest-wallet"]')).toHaveCount(0);
  await page.locator('#quests-close').click();await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');await page.locator('#quests-button').click();await expect(page.locator('[data-quest-cooldown="Tatay Efren"]')).toBeVisible();
  await page.clock.install();await page.clock.fastForward(15*60_000);await expect(page.locator('[data-quest-cooldown="Tatay Efren"]')).toContainText('Break finished');await page.locator('#quests-close').click();await page.locator('#quests-button').click();await expect(page.locator('[data-quest-cooldown="Tatay Efren"]')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).quests.cooldowns['Tatay Efren'])).toBeUndefined();
});

test('ten-minute offers rotate live and reject an open expired dialogue without erasing an accepted quest',async({page,context})=>{
  await fresh(page);await page.clock.install();await page.locator('#quests-button').click();await expect(page.locator('[data-quest-offer="fair-play"]')).toContainText('Offer expires in');
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).quests.offerExpiresAt);await page.locator('#quests-close').click();await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).quests.offerExpiresAt)).toEqual(first);
  await page.locator('#quests-button').click();await page.locator('[data-quest-details="fair-play"]').click();await page.clock.fastForward(10*60_000);await expect(page.locator('#quest-accept')).toBeDisabled();await expect(page.locator('#quest-accept')).toContainText('Offer expired');await expect(page.locator('[data-quest-offer="fair-play"]')).toContainText('expired');
  await page.locator('#quest-journal').click();await expect(page.locator('[data-quest-details="fair-play"]')).toHaveCount(0);await expect(page.locator('[data-quest-details="elder-errand"]')).toBeVisible();await expect.poll(()=>page.locator('#game').getAttribute('data-quest-nodes')).not.toContain('fair-play');await page.screenshot({path:'artifacts/quest-offer-rotation.png'});
  // A fresh window after the next rotation can be accepted; its own quest state then survives offer expiry offline.
  await page.clock.fastForward(10*60_000);await expect(page.locator('[data-quest-details="honest-wallet"]')).toBeVisible();await page.locator('#quests-close').click();await page.clock.resume();await talk(page,{x:372,y:750});await page.locator('#quest-accept').click();await page.locator('#quest-close').click();
  const run=await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).quests.active);expect(run.id).toBe('honest-wallet');expect(run.expiresAt).toBe(0);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');await page.clock.fastForward(10*60_000);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).quests.active)).toEqual(run);await context.setOffline(false);
});

test.describe('touch quest timers',()=>{
test.use({hasTouch:true});
test('quest labels track live NPC transforms and timed tasks expire without a penalty in larger mobile dialogs',async({page})=>{
  await fresh(page);const marker=async()=>JSON.parse((await page.locator('#game').getAttribute('data-quest-markers'))!).find((m:any)=>m.id==='fair-play');
  const start=await marker();await expect.poll(async()=>(await marker()).x).not.toBe(start.x);const moved=await marker();expect(moved.x).toBe(moved.giver.x);expect(moved.y).toBe(moved.giver.y-90);
  await talk(page,{x:227,y:316});await expect(page.locator('.quest-goal')).toContainText('4 minutes');await page.locator('#quest-accept').click();await expect(page.locator('[data-quest-clock]')).toContainText('Quest time left');
  await page.setViewportSize({width:390,height:844});expect(await page.locator('.quest-goal p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);await page.screenshot({path:'artifacts/quest-timed-mobile.png'});
  await page.clock.install();await page.clock.fastForward(4*60_000);await expect(page.locator('#quest-claim')).toBeDisabled();await expect(page.locator('#quest-claim')).toHaveText('Time is up');await expect(page.locator('[data-quest-clock]')).toContainText('Time is up');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!));expect(saved.coins).toBe(100);expect(saved.xp).toBe(0);expect(saved.quests.total).toBe(0);
  await page.locator('#quest-abandon').click();await page.locator('[data-quest-details="clean-plaza"]').click();await page.locator('#quest-accept').click();await expect(page.locator('[data-quest-clock]')).toContainText('Quest time left');await expect(page.locator('#quest-timer')).toContainText('Quests for details');
  await page.locator('#quest-close').click();await page.setViewportSize({width:844,height:390});await page.locator('#fullscreen-button').click();await page.clock.runFor(200);await expect(page.locator('#quest-timer')).toBeVisible();await page.screenshot({path:'artifacts/quest-timer-landscape.png'});
  const timer=await page.locator('#quest-timer').boundingBox();expect(timer!.x).toBeGreaterThanOrEqual(0);expect(timer!.x+timer!.width).toBeLessThanOrEqual(844);expect(timer!.y+timer!.height).toBeLessThanOrEqual(390);
  for(const control of ['#touch-pad','#touch-run','#activity-action']){const box=await page.locator(control).boundingBox();if(box)expect(timer!.x+timer!.width<=box.x||timer!.x>=box.x+box.width||timer!.y+timer!.height<=box.y||timer!.y>=box.y+box.height).toBe(true);}
});
});
test('Piko uses only toss timing, and Wendy visibly misses on Easy and completes a course on Hard',async({page})=>{
  test.setTimeout(65000);await fresh(page,xpForLevel(2));await page.evaluate(()=>{Math.random=()=>.1;});
  for(const level of ['easy','hard']){
    await street(page,'piko',level);await expect(page.locator('#piko-aim')).toHaveCount(0);const stage=page.locator('#piko-stage');await page.locator('#piko-action').click();await page.locator('#piko-action').click();await expect(stage).toHaveAttribute('data-phase','feedback');await page.locator('#piko-action').click();await expect(stage).toHaveAttribute('data-phase','bot');
    if(level==='easy'){await expect(page.locator('#street-status')).toContainText('missed');await expect(stage).toHaveAttribute('data-bot-course','1');}
    else {await expect(stage).toHaveAttribute('data-bot-hop','1');await page.screenshot({path:'artifacts/piko-wendy-turn.png'});await expect(stage).toHaveAttribute('data-bot-course','2',{timeout:15000});}
    await expect(stage).toHaveAttribute('data-phase','aim');await page.locator('#piko-action').click();await expect.poll(async()=>Number(await page.locator('#piko-meter').getAttribute('aria-valuenow')),{intervals:[10]}).toBeGreaterThan(62);await page.keyboard.press('Space');await expect(stage).toHaveAttribute('data-phase','hop-ready');await home(page);
  }
});
test('a downed can lets the guard move and reset before anyone picks up the slipper',async({page})=>{
  await fresh(page,xpForLevel(9));await street(page,'tumbang');const stage=page.locator('#tumbang-stage');const guard=await stage.getAttribute('data-guard');await page.locator('#tumbang-action').click();await expect.poll(async()=>Number(await page.locator('#tumbang-meter').getAttribute('aria-valuenow')),{intervals:[10]}).toBeGreaterThan(44);await page.locator('#tumbang-action').click();
  await expect(stage).toHaveAttribute('data-hit','true');await expect(stage).toHaveAttribute('data-carrying','false');await expect.poll(()=>stage.getAttribute('data-guard')).not.toBe(guard);await expect(stage).toHaveAttribute('data-can-down','false',{timeout:5000});await expect(stage).toHaveAttribute('data-carrying','false');
  const stopped=await stage.getAttribute('data-guard');await page.waitForTimeout(250);expect(await stage.getAttribute('data-guard')).toBe(stopped);await page.screenshot({path:'artifacts/tumbang-fast-reset.png'});
});
test('progressive shop prices and levels enforce purchases; the level-30 outfit has distinct artwork',async({page})=>{
  await fresh(page,MAX_XP,[],10000);await page.locator('#avatar-button').click();await page.locator('[data-shop-category="costume"]').click();await page.locator('[data-preview-item="costume-haribon"]').click();await page.screenshot({path:'artifacts/haribon-level30-preview.png'});await page.locator('[data-equip-item="costume-haribon"]').click();await expect(page.locator('#shop-coins')).toHaveText('4000 coins');await expect(page.locator('[data-equip-item="costume-haribon"]')).toHaveText('Wearing');await page.locator('#close-modal').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).wardrobe.owned)).toContain('costume-haribon');
  await expect(page.locator('#xp-text')).toContainText('MAX LEVEL');await page.locator('#level-info').click();await expect(page.locator('.unlock-list')).toContainText('Level 12');
});
test('mobile quests and level locks remain usable in portrait and landscape fullscreen',async({page})=>{
  await fresh(page);await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/journey-mobile-home.png'});await page.locator('#quests-button').click();await expect(page.locator('.quest-list')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/quest-journal-mobile.png'});await page.locator('#quests-close').click();
  await page.setViewportSize({width:844,height:390});await page.locator('#fullscreen-button').click();await page.locator('#play-menu').click();await page.locator('[data-screen-nav="quests-button"]').click();await expect(page.locator('.quest-list')).toBeVisible();expect(await page.evaluate(()=>document.fullscreenElement?.contains(document.querySelector('#modal')))).toBe(true);
});
test('new merienda designs have level locks and each performs its own eating animation after purchase',async({page})=>{
  test.setTimeout(70000);await fresh(page,MAX_XP,[],10000);
  for(const shop of ['store','street']){
    await talk(page,shop==='store'?{x:227,y:316}:{x:440,y:1320});if(await page.locator('#quest-shop').count())await page.locator('#quest-shop').click();await page.screenshot({path:`artifacts/new-merienda-${shop}.png`});
    for(const id of shop==='store'?['pandesal','puto','bibingka']:['banana-cue','turon','halo-halo']){
      await expect(page.locator(`[data-snack-art="${id}"]`)).toHaveAttribute('role','img');await page.locator(`[data-buy-snack="${id}"]`).click();await expect(page.locator('#merienda-stage')).toHaveAttribute('data-phase','eat');await expect(page.locator('#merienda-stage')).toHaveAttribute('data-motion',id==='halo-halo'?'spoon':id==='banana-cue'?'skewer':'crunch');await page.locator('#merienda-skip').click();
    }
    await page.locator('#food-close').click();
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).snacksEaten)).toBe(6);
});
