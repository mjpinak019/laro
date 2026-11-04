import type {ActivityControls,ActivityUI} from './types';
import {makeCrossword,crosswordSquares,makeSudoku,ticBot,ticWinner,TIC_LINES,type Crossword,type Mark} from './dyaryo-rules';
import {paintCharacterPreview} from '../character-art';
import {BOT_APPEARANCES} from '../characters';
import {COLORS} from '../store';

type PaperGame='crossword'|'sudoku'|'tictactoe';
export class DyaryoGame implements ActivityControls {
  private root=document.createElement('section');
  private disposed=false;
  private paused=false;
  private finished=false;
  private crossword?:Crossword;
  private givens:number[]=[];
  private solution:number[]=[];
  private entries:(number|string)[]=[];
  private selected=0;
  private word=0;
  private hints=0;
  private checked=false;
  private board:Mark[]=Array(9).fill('');
  private turn:'X'|'O'='X';
  private botTimer=0;
  private level:'easy'|'hard';
  constructor(private ui:ActivityUI,private id:PaperGame,private local=false){
    this.level=id==='crossword'?'easy':ui.profile.puzzleDifficulty??'easy';
    this.root.id=`${id}-stage`;this.root.className=`puzzle-stage ${id==='tictactoe'?'tic-stage':'paper-stage'}`;
    const title=id==='crossword'?'Krosword sa Dyaryo':id==='sudoku'?'Sudoku sa Dyaryo':'Tic-tac-toe with Jhing';
    this.root.innerHTML=`<header class="puzzle-header"><canvas class="puzzle-neighbor" width="24" height="32" aria-hidden="true"></canvas><div><span class="eyebrow">${id==='tictactoe'?'SA TABI NG BAKOD':'ANG DYARYO NG BARANGAY · GERON'}</span><h3>${title}</h3></div><span id="puzzle-counter"></span></header><div id="puzzle-status" role="status" aria-live="polite"></div><div class="puzzle-work"><div class="puzzle-board-wrap"><div id="puzzle-board" aria-label="${title}"></div></div><aside id="puzzle-tools"></aside></div>`;
    document.querySelector('#game-shell')!.append(this.root);
    const npc=BOT_APPEARANCES[id==='tictactoe'?'jhing':'geron'];paintCharacterPreview(this.get<HTMLCanvasElement>('.puzzle-neighbor'),npc.look,COLORS[npc.color]);
    if(id==='crossword')this.startCrossword();else if(id==='sudoku')this.startSudoku();else this.startTic();
    window.addEventListener('keydown',this.key);ui.location(id);this.sync();
  }
  private get<T extends HTMLElement=HTMLElement>(s:string){return this.root.querySelector<T>(s)!;}
  private blocked(){return this.disposed||this.finished||this.paused||this.ui.blocked();}
  private say(text:string,fail=false){this.get('#puzzle-status').textContent=text;if(fail)this.ui.failure?.('mistake');}
  private startCrossword(){
    this.crossword=makeCrossword();this.entries=Array(this.crossword.cells.length).fill('');
    this.get('#puzzle-tools').innerHTML='<div class="crossword-clues" aria-label="Mga tanong"></div><form id="crossword-form"><label for="crossword-answer">Sagot sa napiling tanong</label><input id="crossword-answer" autocomplete="off" autocapitalize="characters" maxlength="20" spellcheck="false" /><button type="submit" class="primary-button">Ilagay ang sagot</button></form><button id="puzzle-check" class="secondary-button">Suriin ang krosword</button><button id="puzzle-hint" class="secondary-button">Tulong · isang letra</button><p class="fine-print">Untimed. Hints reduce the coin / XP reward. A new edition appears on your next round.</p>';
    this.get('#crossword-form').onsubmit=event=>{event.preventDefault();if(this.blocked())return;const p=this.crossword!,w=p.words[this.word],answer=this.get<HTMLInputElement>('#crossword-answer').value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');if(answer.length!==w.answer.length){this.say(`Kailangan ng ${w.answer.length} letra.`,true);return;}crosswordSquares(p,w).forEach((i,n)=>this.entries[i]=answer[n]);this.checked=false;this.renderCrossword();this.say('Nailagay na ang sagot. Piliin ang susunod na tanong.');};
    this.get('#puzzle-check').onclick=()=>this.check();this.get('#puzzle-hint').onclick=()=>this.hint();this.renderCrossword();this.say(`Edisyon: ${this.crossword.theme}. Pumili ng tanong at ilagay ang sagot.`);
  }
  private renderCrossword(){
    const p=this.crossword!,current=p.words[this.word],active=crosswordSquares(p,current),board=this.get('#puzzle-board');board.className='crossword-grid';board.style.setProperty('--columns',String(p.cols));
    board.innerHTML=p.cells.map((cell,i)=>{const w=p.words.find(w=>w.row*p.cols+w.col===i);return cell?`<button data-cross-cell="${i}" class="${active.includes(i)?'selected ':''}${this.checked&&this.entries[i]!==cell?'wrong':''}" aria-label="Hanay ${Math.floor(i/p.cols)+1}, puwesto ${i%p.cols+1}: ${this.entries[i]||'blangko'}">${w?`<small>${w.number}</small>`:''}<b>${this.entries[i]||''}</b></button>`:'<span class="black-cell" aria-hidden="true"></span>';}).join('');
    board.querySelectorAll<HTMLButtonElement>('[data-cross-cell]').forEach(button=>button.onclick=()=>{if(this.blocked())return;const i=Number(button.dataset.crossCell),choices=p.words.map((w,n)=>({w,n})).filter(({w})=>crosswordSquares(p,w).includes(i));this.word=(choices.find(({n})=>n!==this.word)??choices[0]).n;this.renderCrossword();});
    this.get('.crossword-clues').innerHTML=p.words.map((w,n)=>`<button data-clue="${n}" aria-pressed="${n===this.word}"><strong>${w.number} ${w.down?'Pababa':'Pahalang'}</strong> · ${w.clue} (${w.answer.length})</button>`).join('');
    this.root.querySelectorAll<HTMLButtonElement>('[data-clue]').forEach(button=>button.onclick=()=>{if(this.blocked())return;this.word=Number(button.dataset.clue);this.renderCrossword();this.get<HTMLInputElement>('#crossword-answer').focus();});
    const input=this.get<HTMLInputElement>('#crossword-answer');input.value=active.map(i=>this.entries[i]).join('');input.placeholder=`${current.number} ${current.down?'pababa':'pahalang'} · ${current.answer.length} letra`;input.maxLength=current.answer.length;this.sync();
  }
  private startSudoku(){
    const p=makeSudoku(this.level);this.givens=p.givens;this.solution=p.solution;this.entries=[...p.givens];this.selected=this.givens.findIndex(n=>!n);
    this.get('#puzzle-tools').innerHTML=`<p>Fill each row, column and 3×3 box with 1–9, once each. Select an empty square, then a number.</p><div class="number-pad" aria-label="Choose a number">${Array.from({length:9},(_,i)=>`<button data-number="${i+1}">${i+1}</button>`).join('')}<button data-number="0" class="erase-number">Erase</button></div><button id="puzzle-check" class="primary-button">Check puzzle</button><button id="puzzle-hint" class="secondary-button">Hint · one number</button><p class="fine-print">${this.level.toUpperCase()} · Untimed · unique solution. Hints reduce rewards. Keyboard: 1–9, arrows, Delete.</p>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-number]').forEach(button=>button.onclick=()=>this.setNumber(Number(button.dataset.number)));this.get('#puzzle-check').onclick=()=>this.check();this.get('#puzzle-hint').onclick=()=>this.hint();this.renderSudoku();this.say('Geron: Every row, column and box has one of each number. Kaya mo ’yan!');
  }
  private renderSudoku(){
    const board=this.get('#puzzle-board');board.className='sudoku-grid';board.innerHTML=this.entries.map((value,i)=>`<button data-cell="${i}" class="${this.givens[i]?'given ':''}${i===this.selected?'selected ':''}${this.checked&&value&&value!==this.solution[i]?'wrong ':''}${i%9===2||i%9===5?'box-right ':''}${Math.floor(i/9)===2||Math.floor(i/9)===5?'box-bottom':''}" aria-label="Row ${Math.floor(i/9)+1}, column ${i%9+1}: ${value||'empty'}${this.givens[i]?', given':''}" aria-pressed="${i===this.selected}">${value||''}</button>`).join('');
    board.querySelectorAll<HTMLButtonElement>('[data-cell]').forEach(button=>button.onclick=()=>{if(this.blocked())return;this.selected=Number(button.dataset.cell);this.renderSudoku();});this.sync();
  }
  private setNumber(n:number){if(this.blocked())return;if(this.givens[this.selected]){this.say('Printed numbers stay fixed. Select an empty square.',true);return;}this.entries[this.selected]=n;this.checked=false;this.renderSudoku();this.say(n?`Placed ${n}.`:'Square erased.');}
  private check(){
    if(this.blocked())return;this.checked=true;
    const solution=this.id==='crossword'?this.crossword!.cells:this.solution,missing=solution.filter((v,i)=>v&&!this.entries[i]).length,wrong=solution.filter((v,i)=>v&&this.entries[i]&&this.entries[i]!==v).length;
    if(!missing&&!wrong){this.finishPuzzle();return;}
    if(this.id==='crossword')this.renderCrossword();else this.renderSudoku();this.say(`${missing} empty squares · ${wrong} incorrect ${this.id==='crossword'?'letters':'numbers'}. Keep going!`,wrong>0);
  }
  private hint(){
    if(this.blocked())return;
    const solution=this.id==='crossword'?this.crossword!.cells:this.solution;
    const pool=this.id==='crossword'?crosswordSquares(this.crossword!,this.crossword!.words[this.word]):[this.selected,...solution.map((_,i)=>i)];
    const i=pool.find(i=>solution[i]&&this.entries[i]!==solution[i]);if(i===undefined){this.say('This part is correct. Try Check puzzle.');return;}
    this.entries[i]=solution[i]!;this.hints++;this.checked=false;if(this.id==='crossword')this.renderCrossword();else this.renderSudoku();this.ui.sound('turn');this.say('Geron gave one hint. Your final reward is a little smaller.');
  }
  private finishPuzzle(){
    if(this.finished)return;this.finished=true;this.sync();this.ui.sound('win');
    const hard=this.level==='hard',coins=Math.max(5,(this.id==='sudoku'?(hard?80:55):50)-this.hints*5),xp=Math.max(10,(hard?85:65)-this.hints*7);
    this.ui.result({game:this.id,won:true,title:'Natapos ang dyaryo!',summary:`${this.id==='crossword'?this.crossword!.theme:`${this.level} Sudoku`} solved · ${this.hints} hints used. Geron: Salamat sa tiyaga!`,coins,xp,record:this.ui.profile.records[this.id].best+1});
  }
  private startTic(){
    this.get('#puzzle-tools').innerHTML=`<p>You are X. ${this.local?'Player 2 is O. Take turns on the same device.':'Jhing is O. Make a horizontal, vertical or diagonal line of three.'}</p><p>${this.local?'Friendly pass-and-play · no coins or XP.':this.level==='hard'?'Hard · Jhing plans ahead. Perfect play can end in a draw.':'Easy · Jhing is learning and sometimes leaves a chance.'}</p>`;this.renderTic();
  }
  private renderTic(){
    const board=this.get('#puzzle-board'),winner=ticWinner(this.board);board.className='tic-grid';
    const line=TIC_LINES.find(line=>this.board[line[0]]&&line.every(i=>this.board[i]===this.board[line[0]]))??[];
    board.innerHTML=this.board.map((mark,i)=>`<button data-tic="${i}" class="${line.includes(i)?'winning':''}" ${mark||(!this.local&&this.turn==='O')||winner?'disabled':''} aria-label="Square ${i+1}: ${mark||'empty'}">${mark}</button>`).join('');
    board.querySelectorAll<HTMLButtonElement>('[data-tic]').forEach(button=>button.onclick=()=>this.playTic(Number(button.dataset.tic)));
    this.say(winner?winner==='draw'?'Tabla! A well-played draw.':`${winner==='X'?'You':this.local?'Player 2':'Jhing'} made three in a row!`:this.turn==='X'?'Your turn · X':this.local?'Player 2’s turn · O':'Jhing is thinking…');this.sync();
  }
  private playTic(index:number){
    if(this.blocked()||this.board[index]||(!this.local&&this.turn==='O'))return;this.board[index]=this.turn;this.ui.sound('turn');if(this.endTic())return;
    this.turn=this.turn==='X'?'O':'X';this.renderTic();if(!this.local&&this.turn==='O')this.botTimer=window.setTimeout(this.botMove,550);
  }
  private botMove=()=>{if(this.disposed||this.finished)return;if(this.blocked()){this.botTimer=window.setTimeout(this.botMove,150);return;}const i=ticBot(this.board,this.level);if(i<0)return;this.board[i]='O';this.ui.sound('turn');if(this.endTic())return;this.turn='X';this.renderTic();};
  private endTic(){
    const outcome=ticWinner(this.board);if(!outcome)return false;this.finished=true;this.renderTic();const won=outcome==='X',draw=outcome==='draw';this.ui.sound(won||draw?'win':'tag');
    this.ui.result({game:'tictactoe',won,draw,title:won?'Tatlo sa isang linya!':draw?'Tabla, Jhing!':'Jhing got three in a row!',summary:this.local?'A friendly game for two. Salitan tayo!':`${this.level.toUpperCase()} · ${draw?'A draw means both players defended well.':'Try a corner or protect the center next time.'}`,coins:this.local?0:won?30:draw?10:3,xp:this.local?0:won?45:draw?25:10,record:this.ui.profile.records.tictactoe.wins+(won?1:0),practice:this.local});return true;
  }
  private sync(){
    this.root.dataset.phase=this.finished?'finished':'playing';this.root.dataset.hints=String(this.hints);
    this.root.dataset.board=JSON.stringify(this.id==='tictactoe'?this.board:this.entries);this.root.dataset.turn=this.turn;
    if(this.id==='sudoku')this.root.dataset.givens=JSON.stringify(this.givens);
    this.get('#puzzle-counter').textContent=this.id==='tictactoe'?`${this.local?'LOCAL':this.level.toUpperCase()} · ${this.board.filter(Boolean).length}/9`:this.id==='crossword'?`${this.crossword!.words.length} words · ${this.hints} hints`:`${this.hints} hints`;
  }
  private key=(event:KeyboardEvent)=>{
    if(this.blocked()||/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName))return;
    if(event.code==='Escape'){event.preventDefault();document.querySelector<HTMLButtonElement>('#pause-button')?.click();return;}
    if(this.id!=='sudoku')return;
    if(/^[1-9]$/.test(event.key)){event.preventDefault();this.setNumber(Number(event.key));}
    else if(['Backspace','Delete','0'].includes(event.key)){event.preventDefault();this.setNumber(0);}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[event.key]!;this.selected=Math.max(0,Math.min(80,this.selected+step));this.renderSudoku();}
  };
  setTouch(){} setSprint(){} resetInput(){} action(){} updateAvatar(){}
  setPaused(value:boolean){this.paused=value;}
  dispose(){this.disposed=true;clearTimeout(this.botTimer);window.removeEventListener('keydown',this.key);this.root.remove();}
}
