export type PuzzleLevel='easy'|'hard';
type Word={answer:string;clue:string};
export const CROSSWORD_THEMES=[
  {name:'Sa bahay',words:[{answer:'BAHAY',clue:'Tirahan ng isang pamilya.'},{answer:'PINTO',clue:'Binubuksan upang makapasok sa isang silid.'},{answer:'BUBONG',clue:'Takip sa itaas ng bahay na panangga sa ulan.'},{answer:'PADER',clue:'Naghihiwalay sa mga silid ng bahay.'},{answer:'KUSINA',clue:'Bahagi ng bahay kung saan nagluluto.'},{answer:'SUSI',clue:'Ginagamit sa pagbukas ng kandado.'},{answer:'HAPAG',clue:'Mesa na pinagsasaluhan kapag kumakain.'},{answer:'ILAW',clue:'Nagbibigay-liwanag sa madilim na silid.'},{answer:'WALIS',clue:'Panlinis ng alikabok at kalat sa sahig.'},{answer:'BINTANA',clue:'Dinaraanan ng hangin at liwanag sa dingding.'}]},
  {name:'Kalikasan',words:[{answer:'HALAMAN',clue:'Inaalagaan sa paso o hardin at dinidiligan.'},{answer:'PUNO',clue:'Malaking halaman na may matigas na katawan at mga sanga.'},{answer:'DAHON',clue:'Karaniwang luntiang bahagi ng halaman.'},{answer:'BULAKLAK',clue:'Makulay na bahagi ng halaman na maaaring mabango.'},{answer:'ARAW',clue:'Bituing nagbibigay-liwanag at init sa daigdig.'},{answer:'ULAN',clue:'Tubig na bumabagsak mula sa ulap.'},{answer:'DAGAT',clue:'Malawak na anyong-tubig na maalat.'},{answer:'IBON',clue:'Hayop na may pakpak at balahibo.'},{answer:'ISDA',clue:'Hayop na may hasang at palikpik.'},{answer:'BUWAN',clue:'Likas na satelayt ng daigdig na nakikita sa gabi.'}]},
  {name:'Mabuting kapitbahay',words:[{answer:'GALANG',clue:'Pagpapahalaga sa kapwa, gaya ng pakikinig at pagsasabi ng po.'},{answer:'TULONG',clue:'Ibinibigay sa taong may pangangailangan.'},{answer:'TIWALA',clue:'Paniniwalang maaasahan ang isang tao.'},{answer:'TAPAT',clue:'Taong nagsasabi ng totoo at hindi nandaraya.'},{answer:'LINIS',clue:'Kabaligtaran ng dumi.'},{answer:'SIPAG',clue:'Katangiang masikap gumawa at umiwas sa katamaran.'},{answer:'TIYAGA',clue:'Patuloy na pagsisikap kahit mahirap ang gawain.'},{answer:'BAYANI',clue:'Taong naglilingkod nang may tapang para sa kapwa at bayan.'},{answer:'KAPWA',clue:'Ibang taong dapat tratuhin nang may dignidad.'},{answer:'ALAGA',clue:'Pag-aasikaso upang maging ligtas at malusog ang isang tao o bagay.'}]},
] satisfies {name:string;words:Word[]}[];
export type CrosswordWord=Word&{row:number;col:number;down:boolean;number:number};
export type Crossword={theme:string;rows:number;cols:number;cells:(string|null)[];words:CrosswordWord[]};
export function shuffle<T>(items:readonly T[],random=Math.random):T[]{const result=[...items];for(let n=result.length-1;n>0;n--){const i=Math.min(n,Math.max(0,Math.floor(random()*(n+1))));[result[i],result[n]]=[result[n],result[i]];}return result;}
export function makeCrossword(random=Math.random,themeIndex=Math.floor(random()*CROSSWORD_THEMES.length)):Crossword {
  const theme=CROSSWORD_THEMES[Math.max(0,Math.min(2,themeIndex))],size=15,grid:(string|null)[]=Array(size*size).fill(null),placed:CrosswordWord[]=[];
  const words=shuffle(theme.words,random).sort((a,b)=>b.answer.length-a.answer.length),first=words.shift()!;
  const add=(w:Word,row:number,col:number,down:boolean)=>{for(let n=0;n<w.answer.length;n++)grid[(row+(down?n:0))*size+col+(down?0:n)]=w.answer[n];placed.push({...w,row,col,down,number:0});};
  add(first,7,Math.floor((size-first.answer.length)/2),false);
  for(let pass=0;pass<3;pass++)for(const w of words.filter(w=>!placed.some(p=>p.answer===w.answer))){
    const candidates:{row:number;col:number;down:boolean}[]=[];
    for(const other of placed)for(let a=0;a<w.answer.length;a++)for(let b=0;b<other.answer.length;b++)if(w.answer[a]===other.answer[b]){
      const down=!other.down,row=other.row+(other.down?b:0)-(down?a:0),col=other.col+(other.down?0:b)-(down?0:a);
      if(row<0||col<0||row+(down?w.answer.length:1)>size||col+(down?1:w.answer.length)>size)continue;
      let valid=true,crosses=0;
      const cell=(r:number,c:number)=>r<0||c<0||r>=size||c>=size?null:grid[r*size+c];
      if(cell(row-(down?1:0),col-(down?0:1))||cell(row+(down?w.answer.length:0),col+(down?0:w.answer.length)))continue;
      for(let n=0;n<w.answer.length;n++){
        const r=row+(down?n:0),c=col+(down?0:n),old=cell(r,c);
        if(old){if(old!==w.answer[n])valid=false;else crosses++;}
        else if(cell(r+(down?0:1),c+(down?1:0))||cell(r-(down?0:1),c-(down?1:0)))valid=false;
      }
      if(valid&&crosses)candidates.push({row,col,down});
    }
    const p=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];if(p)add(w,p.row,p.col,p.down);
  }
  const minR=Math.min(...placed.map(p=>p.row)),minC=Math.min(...placed.map(p=>p.col)),rows=Math.max(...placed.map(p=>p.row+(p.down?p.answer.length:1)))-minR,cols=Math.max(...placed.map(p=>p.col+(p.down?1:p.answer.length)))-minC;
  placed.forEach(p=>{p.row-=minR;p.col-=minC;});placed.sort((a,b)=>a.row-b.row||a.col-b.col);let number=0,last='';placed.forEach(w=>{const key=`${w.row},${w.col}`;if(key!==last){number++;last=key;}w.number=number;});
  return {theme:theme.name,rows,cols,cells:Array.from({length:rows*cols},(_,n)=>grid[(minR+Math.floor(n/cols))*size+minC+n%cols]),words:placed};
}
export const crosswordSquares=(p:Crossword,w:CrosswordWord)=>Array.from({length:w.answer.length},(_,n)=>(w.row+(w.down?n:0))*p.cols+w.col+(w.down?0:n));

export function sudokuSolutions(board:readonly number[],limit=2):number[][] {
  if(board.length!==81||board.some(n=>!Number.isInteger(n)||n<0||n>9))return [];
  const a=[...board],out:number[][]=[];
  const allowed=(i:number,n:number)=>{const row=Math.floor(i/9),col=i%9;for(let k=0;k<9;k++)if(a[row*9+k]===n||a[k*9+col]===n||a[(Math.floor(row/3)*3+Math.floor(k/3))*9+Math.floor(col/3)*3+k%3]===n)return false;return true;};
  for(let i=0;i<81;i++)if(a[i]){const n=a[i];a[i]=0;if(!allowed(i,n))return [];a[i]=n;}
  const visit=()=>{
    let index=-1,options:number[]=[];
    for(let i=0;i<81;i++)if(!a[i]){const candidates=Array.from({length:9},(_,n)=>n+1).filter(n=>allowed(i,n));if(!candidates.length)return;if(index<0||candidates.length<options.length){index=i;options=candidates;if(options.length===1)break;}}
    if(index<0){out.push([...a]);return;}
    for(const n of options){a[index]=n;visit();a[index]=0;if(out.length>=limit)return;}
  };visit();return out;
}
export function makeSudoku(level:PuzzleLevel='easy',random=Math.random) {
  const digits=shuffle([1,2,3,4,5,6,7,8,9],random),groups=()=>shuffle([0,1,2],random).flatMap(b=>shuffle([0,1,2],random).map(i=>b*3+i)),rows=groups(),cols=groups(),transpose=random()<.5;
  const solution=Array.from({length:81},(_,i)=>{const r=rows[Math.floor(i/9)],c=cols[i%9];return digits[transpose?(c*3+Math.floor(c/3)+r)%9:(r*3+Math.floor(r/3)+c)%9];});
  const givens=[...solution],target=level==='hard'?30:42;let count=81;
  for(const i of shuffle(Array.from({length:81},(_,n)=>n),random)){const value=givens[i];givens[i]=0;if(sudokuSolutions(givens).length!==1)givens[i]=value;else count--;if(count<=target)break;}
  return {givens,solution};
}

export type Mark=''|'X'|'O';
export const TIC_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const ticWinner=(board:readonly Mark[])=>{for(const line of TIC_LINES)if(board[line[0]]&&line.every(i=>board[i]===board[line[0]]))return board[line[0]];return board.every(Boolean)?'draw':null;};
export function ticBot(board:readonly Mark[],level:PuzzleLevel,random=Math.random):number {
  if(ticWinner(board))return -1;
  const empty=board.map((v,i)=>v?-1:i).filter(i=>i>=0);if(level==='easy')return empty[Math.min(empty.length-1,Math.floor(random()*empty.length))];
  const score=(a:Mark[],turn:'X'|'O',depth:number):number=>{const end=ticWinner(a);if(end)return end==='O'?10-depth:end==='X'?depth-10:0;const scores=a.map((v,i)=>{if(v)return null;a[i]=turn;const n=score(a,turn==='X'?'O':'X',depth+1);a[i]='';return n;}).filter((n):n is number=>n!==null);return turn==='O'?Math.max(...scores):Math.min(...scores);};
  let best=-Infinity,choice=-1;for(const i of [4,0,2,6,8,1,3,5,7].filter(i=>!board[i])){const a=[...board];a[i]='O';const n=score(a,'X',0);if(n>best){best=n;choice=i;}}return choice;
}
