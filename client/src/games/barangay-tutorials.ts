import type {GameId} from './types';
export const BARANGAY_TUTORIALS={
  langit:[
    {title:'Jack-en-Poy chooses taya',text:'Choose Bato, Papel or Gunting. Both choices are revealed together; the loser becomes taya. Ties replay before the chase starts.',keys:'Choose a hand · then Enter the park'},
    {title:'Langit is safe, but temporary',text:'Runners can climb raised platforms from any edge. The taya stays on lupa and goes around. The gold safety bar drains while occupied; leaving starts the blue reset bar. An empty gold bar automatically moves the runner down.',keys:'Cross the deck · leave from another side'},
    {title:'Manage your sprint',text:'Empty sprint bars recharge to 35% before restarting. Survive 90 seconds as runner, or tag quickly as taya. Hard shortens safe time, lengthens platform reset and gives Jr quicker recharge.',keys:'WASD / arrows / pad · Shift / Takbo · Escape pauses'},
  ],
  crossword:[
    {title:'Piliin ang tanong',text:'Basahin ang mga tanong sa dyaryo ni Geron. May iba’t ibang edisyon tungkol sa tahanan, kalikasan at mabuting kapitbahay.',keys:'Pahalang = across · Pababa = down'},
    {title:'Isulat ang sagot',text:'Piliin ang tanong o isang parisukat. Isulat ang buong sagot, saka pindutin ang Ilagay. Magkakaugnay ang mga letra sa mga salitang nagkakrus.',keys:'Type a word · Ilagay ang sagot'},
    {title:'Suriin ang buong krosword',text:'Pindutin ang Suriin kapag handa ka na. Walang takdang oras. Ang Tulong ay nagbibigay ng isang letra at nagpapababa nang kaunti sa gantimpala.',keys:'Suriin · optional Tulong'},
  ],
  sudoku:[
    {title:'One of every number',text:'Fill every row, column and outlined 3×3 box with 1–9 exactly once. Printed numbers stay fixed. Every generated board has one solution.',keys:'Tap an empty cell · use the number pad'},
    {title:'Write, erase and compare',text:'Tap a number or type 1–9. Erase or Delete clears a choice. Arrows move the selection. Hard prints fewer numbers.',keys:'1–9 · arrows · Erase / Delete'},
    {title:'Check your finished paper',text:'Check puzzle marks mistakes and tells you how many spaces remain. Hints fill one number and reduce rewards. There is no timer.',keys:'Check puzzle · optional Hint'},
  ],
  tictactoe:[
    {title:'Choose a free square',text:'You play X and Jhing plays O. You move first. Tap a blank square; Jhing considers her reply before placing O.',keys:'Tap an empty square'},
    {title:'Make three in a row',text:'Win with a horizontal, vertical or diagonal line. Block Jhing’s next winning line. Nine filled squares without a line means a draw.',keys:'Across · down · diagonally'},
    {title:'Try a harder neighbor or a friend',text:'Easy Jhing is learning. Hard Jhing plans ahead and can force a draw against perfect play. Pass-and-play lets two people share the board without rewards.',keys:'Easy / Hard · bot or pass-and-play'},
  ],
};
export function barangayIllustration(id:GameId,step:number){
  if(!(id in BARANGAY_TUTORIALS))return null;
  const kid=(x:number,y:number,color='#e5bb71')=>`<path d="M${x-9} ${y-43}h18v17h-18z" fill="#d2a77f"/><path d="M${x-11} ${y-27}h22v22h-22z" fill="${color}"/><path d="M${x-7} ${y-5}v12m14-12v12" stroke="#365640" stroke-width="6"/>`;
  let art='';
  if(id==='langit')art=`<path d="M20 200h440" stroke="#f0dfb7" stroke-width="4"/><path d="M145 115h170v70H145z" fill="#a4a576" stroke="#395f43" stroke-width="4"/>${kid(220,125)}${kid(365,190,'#d09284')}<path d="M157 100h145" stroke="#e9bf62" stroke-width="8"/><text x="240" y="225">LANGIT: LIMITED TIME · LUPA: TAYA CAN TAG</text>`;
  else{
    const n=id==='tictactoe'?3:id==='sudoku'?9:7,size=180/n;art='<rect x="130" y="20" width="220" height="200" fill="#efe1b7"/>';
    for(let r=0;r<n;r++)for(let col=0;col<n;col++){const black=id==='crossword'&&(r+col)%4===0;art+=`<rect x="${150+col*size}" y="${30+r*size}" width="${size}" height="${size}" fill="${black?'#365640':'#e5d5a5'}" stroke="#608057" stroke-width="1"/>`;if(!black&&(r+col)%3===0)art+=`<text x="${150+(col+.5)*size}" y="${30+(r+.7)*size}" font-size="${n===3?35:12}">${id==='tictactoe'?(r?'O':'X'):id==='sudoku'?(r*3+col)%9+1:['B','A','Y','A','N'][col%5]}</text>`;}
  }
  return `<svg class="tutorial-picture" viewBox="0 0 480 240" role="img" aria-label="${BARANGAY_TUTORIALS[id as keyof typeof BARANGAY_TUTORIALS][step].title}"><rect width="480" height="240" rx="12" fill="#8ca37a"/><g font-family="monospace" font-size="12" text-anchor="middle" fill="#263f30">${art}</g></svg>`;
}
