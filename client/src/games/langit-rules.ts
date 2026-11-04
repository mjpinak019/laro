import {move,overlaps,segmentDistance,type Point,type Rect} from '../rules.ts';

export type LangitDifficulty='easy'|'hard';
export type Hand='rock'|'paper'|'scissors';
export const HANDS:Hand[]=['rock','paper','scissors'];
/** A tie has no taya. The loser of the revealed pair becomes taya. */
export function rpsLoser(a:Hand,b:Hand):0|1|null {return a===b?null:({rock:'scissors',paper:'rock',scissors:'paper'}[a]===b?1:0);}
export const LANGIT_BOUNDS:Rect={x:44,y:118,width:872,height:430};
export const LANGIT_PLATFORMS=[
  {x:140,y:185,width:185,height:100,heightPx:22,name:'Bamboo deck',kind:'bamboo'},
  {x:590,y:150,width:170,height:112,heightPx:30,name:'Stone steps',kind:'stone'},
  {x:375,y:360,width:185,height:100,heightPx:26,name:'Wooden stage',kind:'wood'},
  {x:715,y:420,width:145,height:90,heightPx:18,name:'Low terrace',kind:'stone'},
] as const;
export const LANGIT_LEVELS={easy:{safe:6,reset:4,recharge:25,botRecharge:17},hard:{safe:3.8,reset:9,recharge:14,botRecharge:27}};
export type LangitActor=Point&{energy:number;locked:boolean};
export type LangitState={difficulty:LangitDifficulty;local:boolean;taya:0|1;phase:'ready'|'playing'|'tagged'|'survived';countdown:number;elapsed:number;safe:number|null;grace:number;actors:[LangitActor,LangitActor];platforms:{left:number;cooldown:number}[]};
export type LangitInput={vector:Point;sprint:boolean};
const still:LangitInput={vector:{x:0,y:0},sprint:false};
const inside=(p:Point,r:Rect)=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;
export function newLangit(difficulty:LangitDifficulty,taya:0|1,local=false):LangitState {
  return {difficulty,local,taya,phase:'ready',countdown:3,elapsed:0,safe:null,grace:1,actors:[{x:90,y:490,energy:100,locked:false},{x:855,y:160,energy:100,locked:false}],platforms:LANGIT_PLATFORMS.map(()=>({left:LANGIT_LEVELS[difficulty].safe,cooldown:0}))};
}
export function platformExit(at:Point,index:number):Point {
  const p=LANGIT_PLATFORMS[index];
  return [{x:p.x-15,y:at.y},{x:p.x+p.width+15,y:at.y},{x:at.x,y:p.y-15},{x:at.x,y:p.y+p.height+15}].sort((a,b)=>Math.hypot(a.x-at.x,a.y-at.y)-Math.hypot(b.x-at.x,b.y-at.y))[0];
}
export function stepLangit(s:LangitState,delta:number,inputs:[LangitInput,LangitInput]=[still,still]) {
  if(s.phase==='tagged'||s.phase==='survived'||!Number.isFinite(delta)||delta<=0)return;
  const dt=Math.min(.04,delta),level=LANGIT_LEVELS[s.difficulty],runner=(1-s.taya) as 0|1;
  if(s.phase==='ready'){s.countdown=Math.max(0,s.countdown-dt);if(!s.countdown)s.phase='playing';return;}
  s.elapsed=Math.min(90,s.elapsed+dt);s.grace=Math.max(0,s.grace-dt);
  for(const p of s.platforms){p.cooldown=Math.max(0,p.cooldown-dt);if(!p.cooldown&&p.left<=0)p.left=level.safe;}
  const previous=s.actors.map(p=>({...p}));
  for(const i of [0,1] as const){
    const actor=s.actors[i],input=inputs[i],moving=!!Math.hypot(input.vector.x,input.vector.y),sprinting=input.sprint&&moving&&!actor.locked&&actor.energy>0;
    actor.energy=Math.max(0,Math.min(100,actor.energy+(sprinting?-33:i===1&&!s.local?level.botRecharge:level.recharge)*dt));
    if(actor.energy===0)actor.locked=true;else if(actor.energy>=35)actor.locked=false;
    const walls=LANGIT_PLATFORMS.filter((_,n)=>i===s.taya||s.platforms[n].cooldown>0);
    Object.assign(actor,move(actor,input.vector,sprinting?266:178,dt,walls,LANGIT_BOUNDS));
  }
  const at=s.actors[runner];
  if(s.safe!==null){
    const index=s.safe,p=s.platforms[index];p.left=Math.max(0,p.left-dt);
    if(!p.left||!inside(at,LANGIT_PLATFORMS[index])){
      if(!p.left){Object.assign(at,platformExit(at,index));s.grace=.35;}
      p.left=0;p.cooldown=level.reset;s.safe=null;
    }
  }else{
    const index=LANGIT_PLATFORMS.findIndex((p,i)=>!s.platforms[i].cooldown&&inside(at,p));if(index>=0)s.safe=index;
  }
  const t=s.actors[s.taya],oldT=previous[s.taya],oldR=previous[runner];
  if(s.safe===null&&!s.grace&&segmentDistance({x:0,y:0},{x:oldR.x-oldT.x,y:oldR.y-oldT.y},{x:at.x-t.x,y:at.y-t.y})<23)s.phase='tagged';
  if(s.phase==='playing'&&s.elapsed>=90)s.phase='survived';
}

/** Short, collision-safe ground paths; nearest free goal also supports circling a safe runner. */
export function langitPath(from:Point,to:Point,walls:readonly Rect[]):Point[] {
  const cols=44,rows=22,point=(i:number)=>({x:50+i%cols*20,y:120+Math.floor(i/cols)*20});
  const free=(i:number)=>i>=0&&i<cols*rows&&!walls.some(p=>overlaps(point(i),p,16));
  const nearest=(p:Point)=>{let best=-1,d=Infinity;for(let i=0;i<cols*rows;i++)if(free(i)){const at=point(i),n=Math.hypot(at.x-p.x,at.y-p.y);if(n<d){d=n;best=i;}}return best;};
  const start=nearest(from),end=nearest(to);if(start<0||end<0)return [];
  const queue=[start],parents=new Map<number,number>([[start,-1]]);
  for(let h=0;h<queue.length;h++){
    const at=queue[h];if(at===end)break;
    for(const n of [at-cols,at+cols,at%cols?at-1:-1,at%cols<cols-1?at+1:-1])if(!parents.has(n)&&free(n)){parents.set(n,at);queue.push(n);}
  }
  if(!parents.has(end))return [];
  const path:Point[]=[];for(let at=end;at!==start;at=parents.get(at)!)path.unshift(point(at));return path;
}
export function langitReward(s:LangitState,local=false) {
  const taya=s.taya===0,won=taya?s.phase==='tagged':s.phase==='survived';
  const score=Math.floor(taya?(won?90-s.elapsed:0):s.elapsed),mult=s.difficulty==='hard'?1.2:1;
  if(local)return {won,coins:0,xp:0,record:score,practice:true};
  const coins=s.elapsed<3&&!taya?0:Math.min(110,Math.floor((taya?(won?20+score*.6:5):score*.7+(won?20:0))*mult));
  const xp=s.elapsed<3&&!taya?0:Math.min(120,Math.floor((taya?(won?25+score*.8:10):score*.9+(won?20:0))*mult));
  return {won,coins,xp,record:score};
}
