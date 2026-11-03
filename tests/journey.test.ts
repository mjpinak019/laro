import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile} from '../client/src/store.ts';
import {MAX_XP,MAX_LEVEL,xpForLevel,playerLevel,GAME_LEVELS,gameUnlocked,awardXp} from '../client/src/progression.ts';
import {QUESTS,QUEST_SPOTS,NPC_COOLDOWN,ensureQuests,acceptQuest,collectQuestItem,claimQuest,questReady,progressQuest,questNodes,questCooldown,questExpired,questTimeLimit,normalizeQuests} from '../client/src/quests.ts';
import {buySnack,SNACKS} from '../client/src/food.ts';
import {buyCosmetic,equipCosmetic,COSMETICS} from '../client/src/wardrobe.ts';
import {makeBackup,readBackup} from '../client/src/save-backup.ts';
import {HUB_OBSTACLES} from '../client/src/hub-obstacles.ts';
import {overlaps} from '../client/src/rules.ts';
import {initialTumbang,stepTumbang,TUMBANG_LEVELS} from '../client/src/games/tumbang-rules.ts';
import {timedPikoLanding,pikoInside,pikoBotMistake} from '../client/src/games/piko-rules.ts';

test('level zero and one have exactly the chosen three starters, every gate opens at its threshold, and level 30 is final',()=>{
  for(const xp of [0,99,100,234])assert.deepEqual(Object.keys(GAME_LEVELS).filter(id=>gameUnlocked(xp,id as keyof typeof GAME_LEVELS)).sort(),['dama','patintero','tinik']);
  let previous=0;
  for(let level=1;level<=MAX_LEVEL;level++){const threshold=xpForLevel(level);assert.equal(playerLevel(threshold).level,level);assert.equal(playerLevel(threshold-1).level,level-1);const need=threshold-xpForLevel(level-1);assert.ok(need>previous);previous=need;}
  for(const [id,level] of Object.entries(GAME_LEVELS)){assert.ok(gameUnlocked(xpForLevel(level),id as keyof typeof GAME_LEVELS));if(level)assert.equal(gameUnlocked(xpForLevel(level)-1,id as keyof typeof GAME_LEVELS),false);}
  const p=normalizeProfile({xp:MAX_XP-10,coins:44});assert.equal(awardXp(p,{won:true}),10);assert.equal(awardXp(p,{won:true}),0);assert.equal(playerLevel(p.xp).level,30);assert.equal(playerLevel(1e9).level,30);assert.equal(p.coins,44);
});
test('new clothing and snacks require both the level and exact coins, while old owned clothes remain wearable',()=>{
  for(const item of COSMETICS.filter(i=>i.level)){const p=normalizeProfile({xp:xpForLevel(item.level!)-1,coins:10000});assert.equal(buyCosmetic(p,item.id),false);assert.equal(p.coins,10000);p.xp=xpForLevel(item.level!);assert.ok(buyCosmetic(p,item.id));assert.equal(p.coins,10000-item.price);p.xp=0;assert.ok(equipCosmetic(p.wardrobe,item.id));assert.equal(buyCosmetic(p,item.id),false);}
  for(const item of SNACKS.filter(i=>i.level)){const p=normalizeProfile({xp:xpForLevel(item.level!)-1,coins:item.price});assert.equal(buySnack(p,item.id),false);assert.equal(p.coins,item.price);p.xp=xpForLevel(item.level!);assert.ok(buySnack(p,item.id));assert.equal(p.coins,0);assert.equal(buySnack(p,item.id),false);}
  assert.equal(COSMETICS.filter(i=>i.slot==='skin'&&i.price===0).length,6);
});
test('random offers persist, collections and claims are single-use, and backups keep active quests',()=>{
  const p=normalizeProfile({coins:0});ensureQuests(p,()=>0);assert.equal(p.quests.offers.length,3);const before=JSON.stringify(p.quests);ensureQuests(p,()=>.99);assert.equal(JSON.stringify(p.quests),before);
  assert.ok(acceptQuest(p,'clean-plaza',()=>.3));assert.equal(acceptQuest(p,'honest-wallet'),false);assert.equal(collectQuestItem(p,999),false);
  for(const spot of p.quests.active!.spots){assert.ok(collectQuestItem(p,spot));assert.equal(collectQuestItem(p,spot),false);}assert.ok(questReady(p));assert.ok(questNodes(p).some(node=>node.label==='!'));
  const restored=readBackup(JSON.stringify(makeBackup(p))).profile;assert.deepEqual(restored.quests,p.quests);assert.ok(claimQuest(restored,'clean-plaza'));assert.equal(restored.coins,20);assert.equal(restored.xp,55);assert.equal(claimQuest(restored,'clean-plaza'),false);assert.equal(acceptQuest(restored,'clean-plaza'),false);
});
test('quests count only events after acceptance, the right purchases/games, and enforce the daily reward cap',()=>{
  const p=normalizeProfile({coins:20,xp:MAX_XP});ensureQuests(p);p.quests.offers=['elder-errand'];progressQuest(p,{kind:'buy',id:'biscuit',shop:'store'});assert.ok(acceptQuest(p,'elder-errand'));assert.equal(questReady(p),false);buySnack(p,'juice');assert.equal(questReady(p),false);buySnack(p,'biscuit');assert.ok(questReady(p));assert.ok(claimQuest(p,'elder-errand'));assert.equal(p.xp,MAX_XP);
  p.quests.offers=['rope-patience'];assert.ok(acceptQuest(p,'rope-patience'));progressQuest(p,{kind:'game',game:'lubid',score:9});assert.equal(questReady(p),false);progressQuest(p,{kind:'game',game:'piko',score:20});assert.equal(questReady(p),false);progressQuest(p,{kind:'game',game:'lubid',score:10});assert.ok(questReady(p));
  p.quests.claimed=QUESTS.filter(q=>q.id!=='rope-patience').map(q=>q.id);assert.equal(claimQuest(p,'rope-patience'),false);ensureQuests(p);assert.equal(p.quests.offers.length,0);
});
test('all quest pickups and givers are outside solid props and have a walking route',()=>{
  const targets=[...QUEST_SPOTS,...QUESTS.map(q=>({x:q.x,y:q.y}))];for(const at of targets)assert.equal(HUB_OBSTACLES.some(rect=>overlaps(at,rect,15)),false,JSON.stringify(at));
  const queue=[{x:520,y:420}],seen=new Set(['520,420']);for(let head=0;head<queue.length;head++)for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]){const at={x:queue[head].x+dx,y:queue[head].y+dy},key=`${at.x},${at.y}`;if(seen.has(key)||at.x<30||at.y<50||at.x>2550||at.y>1570||HUB_OBSTACLES.some(rect=>overlaps(at,rect,15)))continue;seen.add(key);queue.push(at);}for(const target of targets)assert.ok(queue.some(at=>Math.hypot(at.x-target.x,at.y-target.y)<35));
});

test('claiming starts one persistent 15-minute break for every task from that neighbor, including midnight',()=>{
  const now=new Date(2026,10,3,23,58).getTime();
  const p=normalizeProfile({coins:100});ensureQuests(p,()=>0,new Date(now));p.quests.offers=['elder-errand','honest-wallet','clean-plaza'];
  assert.ok(acceptQuest(p,'elder-errand',()=>0,now));progressQuest(p,{kind:'buy',id:'biscuit',shop:'store'},now+1000);assert.ok(claimQuest(p,'elder-errand',now+2000));
  assert.equal(questCooldown(p,'Tatay Efren',now+2000),NPC_COOLDOWN);assert.equal(p.quests.offers.includes('honest-wallet'),false);assert.ok(p.quests.offers.includes('clean-plaza'));
  const restored=readBackup(JSON.stringify(makeBackup(p))).profile;assert.deepEqual(restored.quests.cooldowns,p.quests.cooldowns);
  const until=now+2000+NPC_COOLDOWN;ensureQuests(restored,()=>0,new Date(until-1));assert.equal(restored.quests.offers.includes('honest-wallet'),false);
  restored.quests.offers=['honest-wallet'];assert.equal(acceptQuest(restored,'honest-wallet',()=>0,until-1),false);
  restored.quests.offers=[];ensureQuests(restored,()=>0,new Date(until));assert.ok(restored.quests.offers.includes('honest-wallet'));assert.ok(acceptQuest(restored,'honest-wallet',()=>0,until));
});

test('task deadlines include the return, survive saves, reject late progress and rewards, and allow a fresh retry',()=>{
  const now=Date.now(),p=normalizeProfile({coins:100});ensureQuests(p,()=>0);p.quests.offers=['clean-plaza'];assert.ok(acceptQuest(p,'clean-plaza',()=>0,now));
  const until=now+questTimeLimit('clean-plaza');assert.equal(p.quests.active!.expiresAt,until);
  const restored=readBackup(JSON.stringify(makeBackup(p))).profile;assert.equal(restored.quests.active!.expiresAt,until);
  for(const spot of restored.quests.active!.spots)assert.ok(collectQuestItem(restored,spot,until-1));assert.ok(questReady(restored,until-1));assert.equal(questReady(restored,until),false);assert.ok(questExpired(restored,until));assert.equal(claimQuest(restored,'clean-plaza',until),false);assert.equal(restored.coins,100);assert.equal(restored.xp,0);assert.deepEqual(restored.quests.cooldowns,{});
  assert.equal(collectQuestItem(p,p.quests.active!.spots[0],until),false);p.quests.active=null;assert.ok(acceptQuest(p,'clean-plaza',()=>0,until+1000));assert.equal(p.quests.active!.progress,0);assert.equal(p.quests.active!.expiresAt,until+1000+questTimeLimit('clean-plaza'));
  p.quests.active=null;p.quests.offers=['elder-errand'];assert.ok(acceptQuest(p,'elder-errand',()=>0,now));progressQuest(p,{kind:'buy',id:'biscuit',shop:'store'},now+questTimeLimit('elder-errand'));assert.equal(p.quests.active!.progress,0);
});

test('untimed and legacy active quests remain untimed; malformed cooldowns and deadlines cannot poison saves',()=>{
  const p=normalizeProfile({quests:{active:{id:'clean-plaza',progress:1,spots:[0,1,2],collected:[0]},cooldowns:{'Tatay Efren':NaN,unknown:Date.now()}}});
  assert.equal(p.quests.active!.expiresAt,0);assert.equal(questExpired(p,Date.now()+1e9),false);assert.deepEqual(p.quests.cooldowns,{});
  assert.equal(normalizeQuests({active:{id:'clean-plaza',expiresAt:Infinity}}).active!.expiresAt,0);
  p.quests.active=null;p.quests.offers=['honest-wallet'];assert.ok(acceptQuest(p,'honest-wallet'));assert.equal(p.quests.active!.expiresAt,0);assert.equal(questTimeLimit('fair-play'),0);
});
test('fallen cans allow bot and human guards to move without holding, reset quickly, and cannot permit early tags',()=>{
  for(const difficulty of ['easy','normal','hard'] as const){const s=initialTumbang(difficulty);s.phase='retrieve';s.can.down=true;s.players[0]={x:600,y:330};const before={...s.players[1]};stepTumbang(s,.1);assert.notDeepEqual(s.players[1],before);assert.equal(s.carrying,false);s.players[1]={x:s.can.x,y:s.can.y};for(let t=0;t<TUMBANG_LEVELS[difficulty].reset+.1;t+=.01)stepTumbang(s,.01);assert.equal(s.can.down,false);assert.equal(s.tagged,false);assert.ok(TUMBANG_LEVELS[difficulty].reset<.7);
    const human=initialTumbang(difficulty);human.turn=1;human.phase='retrieve';human.can.down=true;const x=human.players[0].x;stepTumbang(human,.05,{x:1,y:0});assert.ok(human.players[0].x>x);assert.equal(human.carrying,false);}
});
test('timed Piko tosses hit each next square without aiming, and bot mistakes decline with difficulty',()=>{
  for(const difficulty of ['easy','normal','hard'] as const)for(let number=1;number<=8;number++){assert.ok(pikoInside(number,timedPikoLanding(number,.65,difficulty),difficulty));assert.equal(pikoInside(number,timedPikoLanding(number,0,difficulty),difficulty),false);}
  const counts=['easy','normal','hard'].map(d=>Array.from({length:100},(_,i)=>pikoBotMistake(d as 'easy'|'normal'|'hard',12,i/100,.8)).filter(n=>n!==null).length);assert.deepEqual(counts,[42,22,7]);assert.equal(pikoBotMistake('hard',12,0,0),-1);
});
