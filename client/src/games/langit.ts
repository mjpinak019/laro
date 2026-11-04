import Phaser from 'phaser';
import {ActivityScene} from './base-scene';
import {BOT_APPEARANCES,CHARACTERS,characterTexture} from '../characters';
import {CHARACTER_ORIGIN} from '../sprite-outline';
import type {ActivityUI} from './types';
import {LANGIT_PLATFORMS,LANGIT_LEVELS,HANDS,newLangit,stepLangit,langitPath,langitReward,rpsLoser,type Hand,type LangitState,type LangitInput} from './langit-rules';
import type {Point} from '../rules';
import {playerLevel} from '../progression';

export class LangitScene extends ActivityScene {
  private state:LangitState;
  private chosen=false;
  private panel=document.createElement('section');
  private bot!:Phaser.GameObjects.Image;
  private botName!:Phaser.GameObjects.Text;
  private botShadow!:Phaser.GameObjects.Ellipse;
  private bars!:Phaser.GameObjects.Graphics;
  private platformBars!:Phaser.GameObjects.Graphics;
  private labels:Phaser.GameObjects.Text[]=[];
  private botFacing=0;
  private path:Point[]=[];
  private think=0;
  private refreshAt=0;
  private p1Hand?:Hand;
  private botHand:Hand=HANDS[Math.floor(Math.random()*3)];
  constructor(ui:ActivityUI,private local=false){super('langit',ui);this.state=newLangit(ui.profile.langitDifficulty??'easy',1);}
  create(){
    this.cameras.main.setBackgroundColor('#8da57b');
    this.add.rectangle(480,330,900,470,0x739366);this.add.rectangle(480,330,864,430,0xc9b68f);
    const grit=this.add.graphics();grit.fillStyle(0xe1cfaa,.65);for(let i=0;i<110;i++)grit.fillRect(60+i*137%835,130+i*73%400,4,2);
    this.add.text(480,88,'LANGIT-LUPA · JR’S PLAY PARK',{fontFamily:'monospace',fontSize:'18px',color:'#284b3a'}).setOrigin(.5);
    LANGIT_PLATFORMS.forEach((p,index)=>{
      const g=this.add.graphics().setDepth(p.y+p.height),color=p.kind==='stone'?0x8c9d87:p.kind==='bamboo'?0x8a9a5e:0xb0875c;
      g.fillStyle(0x294838,.2).fillRect(p.x+8,p.y+8,p.width,p.height);
      g.fillStyle(0x625a43).fillRect(p.x,p.y-p.heightPx,p.width,p.height+p.heightPx);
      g.fillStyle(color).fillRect(p.x+3,p.y-p.heightPx+3,p.width-6,p.height-3);
      g.lineStyle(2,0xe0cc9a,.65);
      for(let x=p.x+12;x<p.x+p.width;x+=p.kind==='stone'?34:14)g.lineBetween(x,p.y-p.heightPx+4,x,p.y+p.height-p.heightPx-4);
      if(p.kind==='stone')for(let y=p.y-p.heightPx+25;y<p.y+p.height-p.heightPx;y+=25)g.lineBetween(p.x+4,y,p.x+p.width-4,y);
      this.labels.push(this.add.text(p.x+p.width/2,p.y-p.heightPx-28,`${index+1} · ${p.name}`,{fontFamily:'monospace',fontSize:'13px',color:'#263e31',backgroundColor:'#d5c79e',padding:{x:5,y:3}}).setOrigin(.5,1).setDepth(950));
    });
    this.platformBars=this.add.graphics().setDepth(960);this.bars=this.add.graphics().setDepth(1001);
    this.playerSetup(this.state.actors[0].x,this.state.actors[0].y);this.inputSetup();
    Object.assign(this.keys,this.input.keyboard!.addKeys('ENTER',false));
    this.botShadow=this.add.ellipse(855,160,28,10,0x294e38,.24);
    this.bot=this.add.image(855,160,characterTexture('jr',BOT_APPEARANCES.jr.color)).setScale(2).setOrigin(CHARACTER_ORIGIN.x,CHARACTER_ORIGIN.y);
    this.botName=this.add.text(855,95,this.local?'Player 2':CHARACTERS.jr,{fontFamily:'monospace',fontSize:'14px',color:'#fff0d1',backgroundColor:'#544936',padding:{x:6,y:4}}).setOrigin(.5,1).setDepth(1000);
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(!this.blocked()&&!this.local&&this.chosen)this.walkingTarget=this.cameras.main.getWorldPoint(pointer.x,pointer.y);});
    this.panel.id='langit-rps';this.panel.className='langit-rps';this.panel.setAttribute('aria-label','Jack-en-Poy role selection');document.querySelector('#game-shell')!.append(this.panel);
    this.events.once('shutdown',()=>{this.panel.remove();});this.renderHands();this.ui.location('langit');this.ui.hud({left:'JACK-EN-POY',objective:'CHOOSE THE TAYA',right:'NO TIMER'});this.ui.hint('Choose a hand. The loser becomes taya; ties replay before the chase starts.');this.paint(0);
  }
  private renderHands(message='The loser becomes taya. A tie means another Jack-en-Poy.'){
    const who=this.local?(this.p1Hand?'Player 2':'Player 1'):this.ui.profile.name;
    this.panel.innerHTML=`<span class="eyebrow">JACK-EN-POY</span><h2>Who will be taya?</h2><p id="rps-message" role="status">${message}</p><p>${who.replace(/[<>&]/g,'')} · choose your hand</p><div class="rps-hands">${HANDS.map((h,i)=>`<button data-rps="${h}" aria-label="${['Bato · Rock','Papel · Paper','Gunting · Scissors'][i]}"><b>${['●','▤','✂'][i]}</b>${['Bato','Papel','Gunting'][i]}</button>`).join('')}</div><p class="fine-print">${this.local?'Choose one at a time. Player 1: WASD + Shift. Player 2: arrows + Enter.':'Move: WASD, arrows, pad or tap. Hold Shift / Takbo to sprint.'}</p>`;
    this.panel.querySelectorAll<HTMLButtonElement>('[data-rps]').forEach(button=>button.onclick=()=>this.choose(button.dataset.rps as Hand));
  }
  private choose(hand:Hand){
    if(this.blocked())return;
    if(this.local&&!this.p1Hand){this.p1Hand=hand;this.renderHands('Player 1’s hand is hidden. Pass the choice to Player 2.');return;}
    const a=this.local?this.p1Hand!:hand,b=this.local?hand:this.botHand,loser=rpsLoser(a,b),words={rock:'Bato',paper:'Papel',scissors:'Gunting'};
    if(loser===null){this.p1Hand=undefined;this.botHand=HANDS[Math.floor(Math.random()*3)];this.renderHands(`Both chose ${words[a]}. Tabla! Choose again.`);return;}
    this.state=newLangit(this.ui.profile.langitDifficulty??'easy',loser,this.local);
    this.panel.innerHTML=`<span class="eyebrow">JACK-EN-POY · REVEAL</span><h2>${loser===0?'You are taya!':`${this.local?'Player 2':CHARACTERS.jr} is taya!`}</h2><p>You: ${words[a]} · ${this.local?'Player 2':CHARACTERS.jr}: ${words[b]}</p><p>${loser===0?'Stay on lupa. Go around the platforms and catch the runner.':'Run across langit, then leave before the gold safety bar runs out.'}</p><button id="langit-begin" class="primary-button">Enter the park</button>`;
    this.panel.querySelector<HTMLButtonElement>('#langit-begin')!.onclick=()=>{if(this.blocked())return;this.chosen=true;this.panel.remove();this.refresh();};
  }
  private botInput(dt:number):LangitInput {
    const s=this.state,at=s.actors[1],human=s.actors[0],runner=1-s.taya;this.think-=dt;
    if(this.think<=0){
      this.think=.3;
      let target:Point=human;
      if(s.taya!==1){
        if(s.safe!==null&&s.platforms[s.safe].left>1){const p=LANGIT_PLATFORMS[s.safe];target={x:human.x<p.x+p.width/2?p.x+p.width-20:p.x+20,y:human.y<p.y+p.height/2?p.y+p.height-20:p.y+20};}
        else{
          const options=LANGIT_PLATFORMS.map((p,i)=>({i,at:{x:p.x+p.width/2,y:p.y+p.height/2}})).filter(p=>p.i!==s.safe&&!s.platforms[p.i].cooldown);
          options.sort((a,b)=>(Math.hypot(at.x-a.at.x,at.y-a.at.y)-.65*Math.hypot(human.x-a.at.x,human.y-a.at.y))-(Math.hypot(at.x-b.at.x,at.y-b.at.y)-.65*Math.hypot(human.x-b.at.x,human.y-b.at.y)));
          target=options[0]?.at??{x:human.x<480?885:65,y:human.y<320?525:135};
        }
      }
      const walls=LANGIT_PLATFORMS.filter((_,i)=>s.taya===1||s.platforms[i].cooldown>0);
      this.path=langitPath(at,target,walls);
    }
    while(this.path.length&&Math.hypot(this.path[0].x-at.x,this.path[0].y-at.y)<9)this.path.shift();
    const target=this.path[0];return {vector:target?{x:target.x-at.x,y:target.y-at.y}:{x:0,y:0},sprint:Math.hypot(human.x-at.x,human.y-at.y)<260&&(s.taya===1||s.safe===null||s.platforms[s.safe].left<1)};
  }
  update(time:number,delta:number){
    if(!this.chosen){this.snapshot('langit','jack-en-poy',this.state.actors[0]);return;}
    if(this.blocked()){this.paint(time);return;}
    const s=this.state,dt=Math.min(.04,delta/1000);
    const vector=this.local?{x:Number(this.keys.D.isDown)-Number(this.keys.A.isDown),y:Number(this.keys.S.isDown)-Number(this.keys.W.isDown)}:this.vector();
    const second=this.local?{vector:{x:Number(this.keys.RIGHT.isDown)-Number(this.keys.LEFT.isDown),y:Number(this.keys.DOWN.isDown)-Number(this.keys.UP.isDown)},sprint:this.keys.ENTER.isDown}:this.botInput(dt);
    const oldSafe=s.safe;stepLangit(s,dt,[{vector,sprint:this.sprintHeld||this.keys.SHIFT.isDown},second]);
    if(oldSafe!==s.safe&&s.safe!==null)this.ui.sound('turn');
    this.paint(time);if(time-this.refreshAt>100){this.refreshAt=time;this.refresh();}
    if(s.phase==='tagged'||s.phase==='survived')this.end();
  }
  private paint(time:number){
    const s=this.state,runner=1-s.taya;this.bars.clear();this.platformBars.clear();
    for(const i of [0,1] as const){const at=s.actors[i],safe=i===runner&&s.safe!==null,z=safe?LANGIT_PLATFORMS[s.safe!].heightPx:0;
      const picture=i?this.bot:this.player,vector={x:at.x-picture.x,y:at.y-z-picture.y};
      if(i===0){this.drawPlayer(at,time,Math.hypot(vector.x,vector.y)>.05,vector,z);this.nameTag.setText(`${this.ui.profile.name} · Lv ${playerLevel(this.ui.profile.xp).level} · ${s.taya===0?'TAYA':'RUNNER'}`);if(safe)this.player.setDepth(LANGIT_PLATFORMS[s.safe!].y+LANGIT_PLATFORMS[s.safe!].height+1);}
      else{if(vector.x)this.botFacing=vector.x<0?1:2;this.bot.setTexture(characterTexture('jr',BOT_APPEARANCES.jr.color,this.botFacing,this.path.length?Math.floor(time/120)%4:0)).setPosition(at.x,at.y-z).setDepth(safe?LANGIT_PLATFORMS[s.safe!].y+LANGIT_PLATFORMS[s.safe!].height+1:at.y);this.botShadow.setPosition(at.x,at.y+3).setDepth(at.y-1);this.botName.setPosition(at.x,at.y-z-64).setText(`${this.local?'Player 2':'Jr'} · ${s.taya===1?'TAYA':'RUNNER'}`);}
      this.bars.fillStyle(0x243e31).fillRect(at.x-25,at.y-z-61,50,7);this.bars.fillStyle(at.locked?0xc48970:0xead08c).fillRect(at.x-24,at.y-z-60,48*at.energy/100,5);
    }
    LANGIT_PLATFORMS.forEach((p,i)=>{const state=s.platforms[i],cd=state.cooldown,ratio=cd?1-cd/LANGIT_LEVELS[s.difficulty].reset:state.left/LANGIT_LEVELS[s.difficulty].safe;
      this.platformBars.fillStyle(0x294333).fillRect(p.x,p.y-p.heightPx-24,p.width,9);this.platformBars.fillStyle(cd?0x83b9be:0xefc96c).fillRect(p.x+1,p.y-p.heightPx-23,(p.width-2)*ratio,7);
      this.labels[i].setText(`${i+1} · ${cd?`RESET ${cd.toFixed(1)}s`:s.safe===i?`LANGIT ${state.left.toFixed(1)}s`:p.name}`);
    });
  }
  private refresh(){
    const s=this.state;this.ui.hud({left:s.taya===0?'TAYA':'RUNNER',objective:s.safe!==null?`LANGIT · ${s.platforms[s.safe].left.toFixed(1)}s`:'LUPA · KEEP MOVING',right:`${Math.ceil(90-s.elapsed)}s`,countdown:s.phase==='ready'?s.countdown:undefined});
    this.ui.hint(this.local?'P1 WASD + Shift · P2 arrows + Enter · both sprint bars must recharge.':`${s.difficulty.toUpperCase()} · Shift / Takbo sprints. Gold = safe time. Blue = platform resetting. Walk off any edge.`);
    document.querySelector<HTMLElement>('#stamina-fill')!.style.width=`${s.actors[0].energy}%`;
    const el=document.querySelector<HTMLElement>('#game')!;this.snapshot('langit',s.phase,s.actors[0]);el.dataset.langit=JSON.stringify(s);el.dataset.role=s.taya===0?'taya':'runner';
  }
  private end(){if(this.finished)return;this.finished=true;this.refresh();const reward=langitReward(this.state,this.local);this.ui.sound(reward.won?'win':'tag');this.ui.result({game:'langit',...reward,title:reward.won?'Ang galing sa Langit-Lupa!':'Isa pang habulan?',summary:`${this.state.taya===0?'Taya':'Runner'} · ${this.state.elapsed.toFixed(1)} seconds. ${this.state.phase==='tagged'?'A tag ended the chase.':'The runner survived 90 seconds.'} ${this.local?'Friendly local round: no coins or XP.':'Runner rewards grow with survival; taya rewards grow with a quicker catch.'}`});}
  action(){}
}
