import { test, expect, type Page } from './fixtures';
import { walkHubTo } from '../helpers/hub-walk';
import { FOOD_CORNER } from '../../client/src/hub';

const key='laro.offline.profile.v1';
async function ready(page:Page) {
  await page.addInitScript(()=>{if(!localStorage.getItem('merienda-seed')){localStorage.setItem('laro.offline.profile.v1',JSON.stringify({coins:100,xp:75,gender:'girl',color:1,name:'Sab',tutorialPrompts:false,wardrobe:{owned:['hat-cap','top-varsity'],equipped:{skin:'skin-morena',hat:'hat-cap',top:'top-varsity',bottom:'bottom-shorts',shoes:'shoes-slippers'}}}));localStorage.setItem('merienda-seed','1');}});
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
}
async function shop(page:Page,where:'street'|'store') { await walkHubTo(page,where==='street'?FOOD_CORNER:{x:227,y:316}); await page.keyboard.press('e'); await expect(page.locator('.food-menu')).toBeVisible(); }

test('six merienda performances keep the equipped avatar, consume once and return to the same map position',async({page})=>{
  test.setTimeout(100000); const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await shop(page,'street');
  const position=await page.locator('#game').getAttribute('data-x');let balance=100;
  for(const [id,price,motion] of [['fishball',3,'skewer'],['kwek-kwek',5,'skewer'],['kikiam',4,'skewer'],['taho',6,'spoon']] as const){
    await page.locator(`[data-buy-snack="${id}"]`).click();balance-=price;
    await expect(page.locator('#food-coins')).toHaveText(`${balance} coins`);
    await expect(page.locator('#merienda-stage')).toHaveAttribute('data-phase','enter');
    await expect(page.locator('.merienda-flight')).toBeVisible();
    if(id==='fishball'){await page.waitForTimeout(180);await page.screenshot({path:'artifacts/merienda-enter.png'});}
    await expect(page.locator('#merienda-stage')).toHaveAttribute('data-phase','eat');
    await expect(page.locator('#merienda-stage')).toHaveAttribute('data-motion',motion);
    await expect(page.locator('#merienda-stage')).toHaveAttribute('data-bite','2');
    await page.screenshot({path:`artifacts/merienda-${id}.png`});
    // Repeated events while the menu is hidden cannot buy or restart a second snack.
    await page.locator(`[data-buy-snack="${id}"]`).evaluate((button:HTMLButtonElement)=>button.click());
    await expect(page.locator('#food-coins')).toHaveText(`${balance} coins`);
    await expect(page.locator('#merienda-stage')).toBeHidden({timeout:8000});
    await expect(page.locator('.merienda-flight')).toHaveCount(0); await expect(page.locator('#food-status')).toContainText('Sarap!');
    expect(await page.locator('#game').getAttribute('data-x')).toBe(position);
  }
  await page.locator('#food-close').click();await shop(page,'store');
  for(const [id,price,motion] of [['biscuit',3,'crunch'],['juice',4,'sip']] as const){
    await page.locator(`[data-buy-snack="${id}"]`).click();balance-=price;
    await expect(page.locator('#merienda-stage')).toHaveAttribute('data-phase','eat');await expect(page.locator('#merienda-stage')).toHaveAttribute('data-motion',motion);
    await page.waitForTimeout(450);await page.screenshot({path:`artifacts/merienda-${id}.png`});
    await page.locator('#merienda-skip').click();await expect(page.locator('.food-menu')).toBeVisible();
  }
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);expect(saved.coins).toBe(balance);expect(saved.snacksEaten).toBe(6);expect(saved.xp).toBe(75);expect(saved.wardrobe.equipped.hat).toBe('hat-cap');expect(saved.wardrobe.equipped.skin).toBe('skin-morena');expect(errors).toEqual([]);
});

test('closing, skipping, reduced motion and offline mobile fullscreen leave no stranded avatar or extra charge',async({page,context})=>{
  test.setTimeout(65000);await ready(page);await shop(page,'store');
  await page.setViewportSize({width:390,height:844});await page.locator('[data-buy-snack="biscuit"]').click();
  await expect(page.locator('#merienda-stage')).toHaveAttribute('data-phase','eat');await page.screenshot({path:'artifacts/merienda-mobile.png'});
  await page.keyboard.press('Escape');await expect(page.locator('.merienda-flight')).toHaveCount(0);await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('#activity-action').click();await page.locator('[data-buy-snack="juice"]').click();await page.locator('#merienda-skip').click();await expect(page.locator('.food-menu')).toBeVisible();await page.locator('#food-close').click();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
  await page.setViewportSize({width:844,height:390});await shop(page,'store');await page.locator('#food-close').click();await page.locator('#fullscreen-button').click();await page.locator('#activity-action').click();
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-buy-snack="juice"]').click();await expect(page.locator('#merienda-stage')).toHaveAttribute('data-phase','eat');await page.screenshot({path:'artifacts/merienda-landscape-offline.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('#merienda-skip').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  await expect(page.locator('#merienda-stage')).toBeHidden();await expect(page.locator('#food-coins')).toHaveText('89 coins');await page.locator('#food-close').click();
  await page.locator('#fullscreen-button').click();await context.setOffline(false);
});

test('the restored fast map tune switches to the former mellow map theme in games and pauses for merienda',async({page})=>{
  test.setTimeout(50000);await ready(page);await page.locator('#game canvas').click();const panel=page.locator('#game-display');
  await expect(panel).toHaveAttribute('data-music-bpm','158');await expect(panel).toHaveAttribute('data-music','playing');
  await shop(page,'store');await page.locator('[data-buy-snack="juice"]').click();await expect(panel).toHaveAttribute('data-music','silent');await page.locator('#food-close').click();await expect(panel).toHaveAttribute('data-music','playing');
  await page.locator('[data-game="jolen"]').click();await page.locator('#play-button').click();await page.locator('#jolen-start').click();await expect(panel).toHaveAttribute('data-music-bpm','88');await expect(panel).toHaveAttribute('data-music-theme','focus');
  await page.locator('#sound-button').click();await expect(panel).toHaveAttribute('data-music','silent');
});
