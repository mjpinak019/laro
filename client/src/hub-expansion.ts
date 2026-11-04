import type Phaser from 'phaser';
import {EXPANSION_PROPS} from './hub';

export function expansionProps(scene:Phaser.Scene){return EXPANSION_PROPS.map(p=>{
  const g=scene.add.graphics(),lift=p.kind==='deck'?14:20;
  g.fillStyle(0x244b36,.2).fillRect(p.x+7,p.y+5,p.width,p.height);
  g.fillStyle(0x625641).fillRect(p.x,p.y-lift,p.width,p.height+lift);
  g.fillStyle(p.kind==='deck'?0xa0a16c:0xb68c5e).fillRect(p.x+3,p.y-lift+3,p.width-6,p.height-3);
  if(p.kind==='deck'){g.lineStyle(2,0xd7c488);for(let x=p.x+12;x<p.x+p.width;x+=14)g.lineBetween(x,p.y-lift+4,x,p.y+p.height-lift-4);}
  else if(p.kind==='dyaryo'){
    g.fillStyle(0xe8ddba).fillRect(p.x+12,p.y-lift+7,38,32).fillRect(p.x+57,p.y-lift+9,39,30);
    g.fillStyle(0x4b644c);for(let r=0;r<4;r++)for(let c=0;c<4;c++)if((r+c)%3)g.fillRect(p.x+16+c*7,p.y-lift+11+r*6,5,4);
    g.lineStyle(1,0x738469);for(let i=0;i<4;i++){g.lineBetween(p.x+60,p.y-lift+12+i*7,p.x+91,p.y-lift+12+i*7);g.lineBetween(p.x+60+i*10,p.y-lift+12,p.x+60+i*10,p.y-lift+33);}
  }else{
    g.lineStyle(2,0xf0dfae);for(let i=1;i<3;i++){g.lineBetween(p.x+12+i*22,p.y-lift+5,p.x+12+i*22,p.y-lift+38);g.lineBetween(p.x+12,p.y-lift+5+i*11,p.x+78,p.y-lift+5+i*11);}g.lineBetween(p.x+16,p.y-lift+8,p.x+29,p.y-lift+15);g.lineBetween(p.x+29,p.y-lift+8,p.x+16,p.y-lift+15);g.strokeCircle(p.x+45,p.y-lift+21,5);
  }
  return scene.add.container(0,0,[g]).setDepth(p.y+p.height);
});}
