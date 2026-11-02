import type { Profile } from './store.ts';
import { GAME_LEVELS, gameUnlocked, MAX_XP, playerLevel } from './progression.ts';

type Goal = { kind:'collect'; item:'litter'|'wallet'|'book'; count:number } | { kind:'buy'; shop:'store'|'street'; item?:string } | { kind:'game'; game:keyof typeof GAME_LEVELS; score:number };
export const QUESTS = [
  {id:'clean-plaza',name:'Bayanihan sa plaza',giver:'Mama Shoni',x:227,y:316,area:'sari-sari store',level:0,xp:55,coins:20,value:'Bayanihan · cleanliness',dialogue:'May kalat sa plaza. Can you collect three pieces and sort them for recycling? Small acts help everyone enjoy our shared spaces.',thanks:'Salamat! Keeping our barangay clean is a shared responsibility.',goal:{kind:'collect',item:'litter',count:3}},
  {id:'honest-wallet',name:'The lost wallet',giver:'Tatay Efren',x:372,y:750,area:'Dama table',level:0,xp:65,coins:25,value:'Katapatan · honesty',dialogue:'I dropped my wallet on the plaza path. Please find it and bring it back, even when nobody is watching.',thanks:'You returned what was not yours. Maraming salamat for your honesty.',goal:{kind:'collect',item:'wallet',count:1}},
  {id:'elder-errand',name:'A little errand',giver:'Tatay Efren',x:372,y:750,area:'Dama table',level:0,xp:55,coins:20,value:'Malasakit · care for elders',dialogue:'Could you buy biscuits from Mama Shoni’s sari-sari store for our shared merienda? It costs 3 coins. Have a taste, then return here so I can thank you.',thanks:'Salamat sa tulong! Asking what someone needs is a thoughtful way to help.',goal:{kind:'buy',shop:'store',item:'biscuit'}},
  {id:'share-merienda',name:'Merienda for the barkada',giver:'Audrey',x:792,y:417,area:'Patintero court',level:0,xp:60,coins:25,value:'Pakikisama · sharing',dialogue:'Let’s support our neighborhood vendor. Enjoy any street-food snack, then come back and tell me what you chose. Remember to keep the wrapper off the ground!',thanks:'Sarap! Supporting local vendors and disposing of our waste properly helps our community.',goal:{kind:'buy',shop:'street'}},
  {id:'fair-play',name:'Finish with respect',giver:'MJ',x:675,y:396,area:'Patintero court',level:0,xp:45,coins:15,value:'Sportsmanship · respect',dialogue:'Finish a Patintero round, win or lose. We respect our opponents, follow the rules, and thank everyone for playing.',thanks:'Panalo man o talo, we can learn and play fairly. Good game!',goal:{kind:'game',game:'patintero',score:0}},
  {id:'piko-practice',name:'Tiyaga with Wendy',giver:'Wendy',x:1790,y:490,area:'Piko lane',level:2,xp:80,coins:30,value:'Tiyaga · perseverance',dialogue:'Complete at least one Piko course and finish the round. Mistakes are part of learning — watch, practice, and try again.',thanks:'Practice helped you improve. Be kind to yourself and to other learners.',goal:{kind:'game',game:'piko',score:1}},
  {id:'school-book',name:'Balik-aklat',giver:'Amor',x:1250,y:420,area:'schoolyard',level:3,xp:90,coins:35,value:'Pag-iingat · care for shared things',dialogue:'A library book was left on a plaza path. Please return it so the next reader can enjoy it too.',thanks:'A shared book can help many readers when we take care of it.',goal:{kind:'collect',item:'book',count:1}},
  {id:'rope-patience',name:'Sabay sa lubid',giver:'Weng',x:530,y:938,area:'Luksong Lubid yard',level:7,xp:110,coins:45,value:'Pagtutulungan · cooperation',dialogue:'Reach 10 jumps in a finished rope run. The turners and jumper work together; patience matters more than blaming anyone for a miss.',thanks:'We did our part together. Salamat for practicing patiently!',goal:{kind:'game',game:'lubid',score:10}},
  {id:'can-care',name:'Ingatan ang laruan',giver:'Eric',x:1790,y:1110,area:'Tumbang Preso clearing',level:9,xp:120,coins:50,value:'Responsibility · care for toys',dialogue:'Score at least one point in a finished Tumbang Preso match. We share the can and slippers, reset them properly, and keep everyone’s play space safe.',thanks:'Good play includes caring for our shared things, not only scoring points.',goal:{kind:'game',game:'tumbang',score:1}},
] as const satisfies readonly {id:string;name:string;giver:string;x:number;y:number;area:string;level:number;xp:number;coins:number;value:string;dialogue:string;thanks:string;goal:Goal}[];
export type QuestId = typeof QUESTS[number]['id'];
export type QuestRun = { id:QuestId; progress:number; spots:number[]; collected:number[] };
export type QuestState = { day:string; offers:QuestId[]; claimed:QuestId[]; total:number; active:QuestRun|null };
export const QUEST_SPOTS = [{x:520,y:420},{x:600,y:460},{x:880,y:430},{x:450,y:540},{x:880,y:600},{x:680,y:480}];
export const questById = (id:string) => QUESTS.find(q=>q.id===id);
export function normalizeQuests(value:unknown):QuestState {
  const raw = (value && typeof value==='object' ? value : {}) as Partial<QuestState>;
  const ids = (items:unknown):QuestId[] => Array.isArray(items) ? [...new Set(items.filter((id):id is QuestId=>typeof id==='string'&&!!questById(id)))].slice(0,QUESTS.length) : [];
  let active:QuestRun|null=null; const run=raw.active;
  if(run&&questById(run.id)) { const spots=Array.isArray(run.spots)?[...new Set(run.spots.filter(n=>Number.isInteger(n)&&n>=0&&n<QUEST_SPOTS.length))].slice(0,3):[]; active={id:run.id,progress:Number.isFinite(run.progress)?Math.max(0,Math.min(3,Math.floor(run.progress))):0,spots,collected:Array.isArray(run.collected)?[...new Set(run.collected.filter(n=>spots.includes(n)))]:[]}; }
  const claimed=ids(raw.claimed); if(active&&claimed.includes(active.id)) active=null;
  return {day:typeof raw.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.day)?raw.day:'',offers:ids(raw.offers).slice(0,3),claimed,total:typeof raw.total==='number'&&Number.isFinite(raw.total)?Math.max(0,Math.min(1000000,Math.floor(raw.total))):0,active};
}
const today = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function ensureQuests(profile:Pick<Profile,'quests'|'xp'|'coins'>, random= Math.random, date=new Date()) {
  const q=profile.quests, before=JSON.stringify(q), day=today(date);
  if(q.day!==day) {q.day=day;q.claimed=[];q.offers=q.active?[q.active.id]:[];}
  if(q.claimed.length>=8) {q.offers=[];return before!==JSON.stringify(q);}
  q.offers=q.offers.filter(id=>!q.claimed.includes(id));
  const available=QUESTS.filter(def=>def.level<=playerLevel(profile.xp).level&&!q.claimed.includes(def.id)&&!q.offers.includes(def.id)&& (def.goal.kind!=='game'||gameUnlocked(profile.xp,def.goal.game)) && (def.goal.kind!=='buy'||profile.coins>=3));
  while(q.offers.length<3&&available.length&&q.claimed.length<8) {const i=Math.min(available.length-1,Math.floor(random()*available.length));q.offers.push(available.splice(i,1)[0].id);}
  return before!==JSON.stringify(q);
}
export function acceptQuest(profile:Profile,id:QuestId,random=Math.random) {
  const q=profile.quests,def=questById(id);if(!def||q.active||!q.offers.includes(id)||q.claimed.includes(id)||q.claimed.length>=8||playerLevel(profile.xp).level<def.level)return false;
  const pool=QUEST_SPOTS.map((_,i)=>i),spots:number[]=[];
  const count=def.goal.kind==='collect'?def.goal.count:0;
  while(spots.length<count){const i=Math.min(pool.length-1,Math.floor(random()*pool.length));spots.push(pool.splice(i,1)[0]);}
  q.active={id,progress:0,spots,collected:[]};return true;
}
export type QuestEvent={kind:'buy';id:string;shop:'street'|'store'}|{kind:'game';game:string;score:number};
export function progressQuest(profile:Pick<Profile,'quests'>,event:QuestEvent) {
  const run=profile.quests.active,def=run&&questById(run.id);if(!run||!def)return;
  const goal:Goal=def.goal;
  if(goal.kind==='buy'&&event.kind==='buy'&&goal.shop===event.shop&&(!goal.item||goal.item===event.id))run.progress=1;
  if(goal.kind==='game'&&event.kind==='game'&&goal.game===event.game&&event.score>=goal.score)run.progress=1;
}
export function collectQuestItem(profile:Profile,spot:number) {
  const run=profile.quests.active;if(!run||!run.spots.includes(spot)||run.collected.includes(spot))return false;
  run.collected.push(spot);run.progress=run.collected.length;return true;
}
export function questReady(profile:Pick<Profile,'quests'>) { const run=profile.quests.active,def=run&&questById(run.id);return !!run&&!!def&&run.progress>=(def.goal.kind==='collect'?def.goal.count:1); }
export function claimQuest(profile:Profile,id:QuestId) {
  const q=profile.quests,def=questById(id);if(!def||q.active?.id!==id||!questReady(profile)||q.claimed.includes(id)||q.claimed.length>=8)return false;
  profile.xp=Math.min(MAX_XP,profile.xp+def.xp);profile.coins=Math.min(1000000,profile.coins+def.coins);q.claimed.push(id);q.total++;q.active=null;q.offers=q.offers.filter(offered=>offered!==id);ensureQuests(profile);return true;
}
export function questNodes(profile:Pick<Profile,'quests'>) {
  const q=profile.quests,ids=[...new Set([...q.offers,...(q.active?[q.active.id]:[])])];
  const nodes:{id:QuestId;x:number;y:number;label:string;spot:number;item:string}[]=ids.filter(id=>!q.claimed.includes(id)).sort((a,b)=>Number(b===q.active?.id)-Number(a===q.active?.id)).map(id=>{const def=questById(id)!;return {id,x:def.x,y:def.y,label:q.active?.id===id&&questReady(profile)?'!':'?',spot:-1,item:''};}).filter((node,index,list)=>list.findIndex(other=>other.x===node.x&&other.y===node.y)===index);
  const run=q.active,def=run&&questById(run.id);if(run&&def&&def.goal.kind==='collect'&&!questReady(profile)) for(const spot of run.spots.filter(n=>!run.collected.includes(n))) nodes.push({id:run.id,...QUEST_SPOTS[spot],label:'?',spot,item:def.goal.item});
  return nodes;
}
export const nearbyQuest=(profile:Pick<Profile,'quests'>,point:{x:number;y:number})=>questNodes(profile).filter(n=>Math.hypot(n.x-point.x,n.y-point.y)<48).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
