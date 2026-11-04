import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newLangit,stepLangit,LANGIT_PLATFORMS,LANGIT_LEVELS,langitPath,langitReward,rpsLoser,HANDS,type LangitState} from '../client/src/games/langit-rules.ts';
import {makeCrossword,crosswordSquares,makeSudoku,sudokuSolutions,ticBot,ticWinner,type Mark} from '../client/src/games/dyaryo-rules.ts';
import {normalizeProfile} from '../client/src/store.ts';
import {gameUnlocked,xpForLevel,awardXp} from '../client/src/progression.ts';
import {makeBackup,readBackup} from '../client/src/save-backup.ts';
import {HUB_SITES} from '../client/src/hub.ts';
import {HUB_OBSTACLES} from '../client/src/hub-obstacles.ts';
import {overlaps} from '../client/src/rules.ts';
const random=(seed:number)=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const tick=(s:LangitState,seconds:number)=>{for(let n=0;n<Math.ceil(seconds/.02);n++)stepLangit(s,.02);};

test('all Jack-en-Poy combinations select the loser as taya, with no role on a tie',()=>{
  for(const a of HANDS)for(const b of HANDS){const loser=rpsLoser(a,b);if(a===b)assert.equal(loser,null);else assert.equal(loser,({rock:'scissors',paper:'rock',scissors:'paper'}[a]===b?1:0));}
});
test('safe platforms prevent tags, eject after their timer, reset and cannot refresh by stepping off and back on',()=>{
  for(const difficulty of ['easy','hard'] as const){const s=newLangit(difficulty,1);s.phase='playing';s.grace=0;const p=LANGIT_PLATFORMS[0];s.actors[0].x=p.x+5;s.actors[0].y=p.y+30;s.actors[1].x=p.x-12;s.actors[1].y=p.y+30;stepLangit(s,.02);assert.equal(s.safe,0);assert.equal(s.phase,'playing');tick(s,LANGIT_LEVELS[difficulty].safe+.1);assert.equal(s.safe,null);assert.ok(s.platforms[0].cooldown>0);assert.equal(overlaps(s.actors[0],p),false);s.actors[1].x=850;s.actors[1].y=160;tick(s,LANGIT_LEVELS[difficulty].reset+.1);assert.equal(s.platforms[0].cooldown,0);
    const exit=newLangit(difficulty,1);exit.phase='playing';exit.actors[0]={...exit.actors[0],x:p.x+p.width-1,y:p.y+50};stepLangit(exit,.02);assert.equal(exit.safe,0);stepLangit(exit,.04,[{vector:{x:1,y:0},sprint:false},{vector:{x:0,y:0},sprint:false}]);assert.equal(exit.safe,null);assert.ok(exit.platforms[0].cooldown>0);const x=exit.actors[0].x;stepLangit(exit,.04,[{vector:{x:-1,y:0},sprint:false},{vector:{x:0,y:0},sprint:false}]);assert.ok(exit.actors[0].x>=x-1);
  }
});
test('taya paths go around platforms and collision prevents entry; runners may cross and exit a different side',()=>{
  const p=LANGIT_PLATFORMS[0],from={x:p.x-35,y:p.y+50},to={x:p.x+p.width+35,y:p.y+50},path=langitPath(from,to,LANGIT_PLATFORMS);assert.ok(path.length>10);for(const at of path)assert.equal(LANGIT_PLATFORMS.some(p=>overlaps(at,p,15)),false);
  const s=newLangit('easy',1);s.phase='playing';s.actors[1]={...s.actors[1],...from};for(let n=0;n<100;n++)stepLangit(s,.02,[{vector:{x:0,y:0},sprint:false},{vector:{x:1,y:0},sprint:false}]);assert.ok(s.actors[1].x<p.x);assert.equal(overlaps(s.actors[1],p),false);
  const cross=newLangit('easy',1);cross.phase='playing';cross.actors[0]={...cross.actors[0],...from};for(let n=0;n<75;n++)stepLangit(cross,.02,[{vector:{x:1,y:0},sprint:false},{vector:{x:0,y:0},sprint:false}]);assert.ok(cross.actors[0].x>p.x+p.width);assert.equal(cross.safe,null);assert.ok(cross.platforms[0].cooldown>0);
});
test('both sprint bars drain, lock at exhaustion, recharge, and local play has equal recharge',()=>{
  const s=newLangit('hard',1,true);s.phase='playing';s.actors[0].energy=s.actors[1].energy=.1;
  stepLangit(s,.04,[{vector:{x:1,y:0},sprint:true},{vector:{x:-1,y:0},sprint:true}]);assert.ok(s.actors.every(a=>a.locked&&a.energy===0));tick(s,2);assert.ok(s.actors.every(a=>a.locked&&a.energy<35));tick(s,1);assert.ok(s.actors.every(a=>!a.locked&&a.energy>=35));assert.equal(s.actors[0].energy,s.actors[1].energy);
});
test('a ground tag finishes once; countdown consumes no round time; rewards increase with survival or faster catches',()=>{
  const s=newLangit('easy',1);tick(s,3.1);assert.equal(s.phase,'playing');assert.ok(s.elapsed<.2);s.grace=0;s.actors[1]={...s.actors[1],x:s.actors[0].x+5,y:s.actors[0].y};stepLangit(s,.02);assert.equal(s.phase,'tagged');const frozen=structuredClone(s);tick(s,2);assert.deepEqual(s,frozen);
  const early=newLangit('easy',1);early.phase='tagged';early.elapsed=20;const late=structuredClone(early);late.elapsed=60;assert.ok(langitReward(late).coins>langitReward(early).coins);assert.ok(langitReward(late).xp>langitReward(early).xp);
  early.taya=late.taya=0;assert.ok(langitReward(early).coins>langitReward(late).coins);early.elapsed=2;assert.ok(langitReward(early).coins>langitReward(late).coins);assert.equal(langitReward(late,true).coins,0);const profile=normalizeProfile({xp:100});assert.equal(awardXp(profile,{...langitReward(late),xp:999}),120);
  const survived=newLangit('hard',1);survived.phase='playing';tick(survived,91);assert.equal(survived.phase,'survived');assert.equal(survived.elapsed,90);assert.ok(langitReward(survived).won);assert.ok(langitReward(survived).coins<=110);assert.ok(langitReward(survived).xp<=120);const done=structuredClone(survived);tick(survived,1);assert.deepEqual(survived,done);
});
test('generated Tagalog crosswords are connected, numbered, correct at every crossing, and varied',()=>{
  const editions=new Set<string>();
  for(let seed=1;seed<=30;seed++){const p=makeCrossword(random(seed*54321),seed%3);assert.ok(p.words.length>=4,`${p.theme}: ${p.words.length}`);const occupied=new Set<number>();for(const w of p.words){assert.ok(w.number>0);assert.ok(w.clue.length>10);const squares=crosswordSquares(p,w);squares.forEach((i,n)=>{assert.equal(p.cells[i],w.answer[n]);occupied.add(i);});}assert.equal(occupied.size,p.cells.filter(Boolean).length);
    for(const down of [false,true])for(let line=0;line<(down?p.cols:p.rows);line++){let run='';const flush=()=>{if(run.length>1)assert.ok(p.words.some(w=>w.down===down&&w.answer===run),`Unclued run: ${run}`);run='';};for(let n=0;n<(down?p.rows:p.cols);n++){const letter=p.cells[down?n*p.cols+line:line*p.cols+n];if(letter)run+=letter;else flush();}flush();}
    const seen=new Set([0]);for(let n=0;n<p.words.length;n++)for(const i of [...seen])for(let j=0;j<p.words.length;j++)if(crosswordSquares(p,p.words[i]).some(k=>crosswordSquares(p,p.words[j]).includes(k)))seen.add(j);assert.equal(seen.size,p.words.length);editions.add(JSON.stringify(p.cells));
  }assert.ok(editions.size>20);
});
test('varying Sudoku boards have exactly one valid solution, Hard has fewer clues, and malformed boards fail',()=>{
  const variants=new Set<string>();for(let seed=1;seed<=10;seed++)for(const level of ['easy','hard'] as const){const p=makeSudoku(level,random(seed*7831)),solutions=sudokuSolutions(p.givens);assert.equal(solutions.length,1);assert.deepEqual(solutions[0],p.solution);assert.ok(p.givens.filter(Boolean).length<=(level==='hard'?34:42));for(let r=0;r<9;r++)assert.equal(new Set(p.solution.slice(r*9,r*9+9)).size,9);variants.add(p.givens.join(''));}assert.equal(variants.size,20);assert.deepEqual(sudokuSolutions(Array(81).fill(1)),[]);assert.deepEqual(sudokuSolutions([]),[]);
});
test('Hard Jhing never loses over every possible human reply, and takes a win when offered',()=>{
  const visit=(board:Mark[])=>{const outcome=ticWinner(board);assert.notEqual(outcome,'X');if(outcome)return;for(let i=0;i<9;i++)if(!board[i]){const a=[...board];a[i]='X';const end=ticWinner(a);assert.notEqual(end,'X');if(!end){const bot=ticBot(a,'hard');assert.equal(a[bot],'');a[bot]='O';visit(a);}}};visit(Array(9).fill(''));assert.equal(ticBot(['O','O','','X','X','','','',''],'hard'),2);assert.equal(ticBot(['X','X','X','O','O','','','',''],'hard'),-1);
});
test('new games respect level gates and old saves keep progress, with new records included in backups',()=>{
  for(const [id,level] of [['langit',6],['crossword',8],['sudoku',11],['tictactoe',2]] as const){assert.equal(gameUnlocked(xpForLevel(level)-1,id),false);assert.ok(gameUnlocked(xpForLevel(level),id));}
  const p=normalizeProfile({coins:432,xp:200,records:{dama:{played:7,wins:3,best:5}}});assert.equal(p.coins,432);assert.equal(p.records.dama.wins,3);for(const id of ['langit','crossword','sudoku','tictactoe'] as const){assert.deepEqual(p.records[id],{played:0,wins:0,best:0});p.records[id].best=9;}assert.deepEqual(readBackup(JSON.stringify(makeBackup(p))).profile.records,p.records);
});
test('all three new map entrances are collision-free and physically reachable',()=>{
  const targets=HUB_SITES.filter(s=>['langit','crossword','tictactoe'].includes(s.game)).map(s=>s.at);assert.equal(targets.length,3);for(const p of targets)assert.equal(HUB_OBSTACLES.some(r=>overlaps(p,r,15)),false,JSON.stringify(p));
  const queue=[{x:520,y:420}],seen=new Set(['520,420']);for(let h=0;h<queue.length;h++)for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]){const at={x:queue[h].x+dx,y:queue[h].y+dy},key=`${at.x},${at.y}`;if(seen.has(key)||at.x<30||at.y<50||at.x>2550||at.y>1570||HUB_OBSTACLES.some(r=>overlaps(at,r,15)))continue;seen.add(key);queue.push(at);}for(const target of targets)assert.ok(queue.some(p=>Math.hypot(p.x-target.x,p.y-target.y)<30));
});
