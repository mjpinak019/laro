import { paintCharacterPreview, type CharacterGesture } from './character-art';
import { COLORS, type Profile } from './store';
import { SNACKS } from './food';
import type { SnackId } from './food-art';

type Origin = { x: number; y: number; scale: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const motions: Record<SnackId, string> = { fishball: 'Bite by bite, off the skewer.', 'kwek-kwek': 'A crunchy orange bite!', kikiam: 'One golden piece at a time.', taho: 'Scoop, taste, sarap!', biscuit: 'Crunch! Watch those crumbs.', juice: 'A refreshing sip through the straw.',pandesal:'Soft bread, one little bite at a time.','banana-cue':'Caramelized saba off the skewer.',turon:'A crisp banana roll — crunch!',puto:'A soft rice cake with cheese.','halo-halo':'Mix, scoop, and enjoy the cool colors!',bibingka:'A golden slice for merienda.' };

/** A presentation only: the purchase is saved before this starts; skip/close never charges again. */
export function playMerienda(host: HTMLElement, profile: Profile, id: SnackId, origin: () => Origin, away: (value: boolean) => void, done: () => void) {
  const snack = SNACKS.find(item => item.id === id)!;
  host.innerHTML = '<div class="merienda-caption"><strong></strong><span></span></div><canvas class="merienda-canvas" width="360" height="164" role="img"></canvas><button id="merienda-skip" class="secondary-button">Skip animation</button>';
  host.dataset.snack = id; host.hidden = false;
  host.querySelector('strong')!.textContent = `Merienda with ${profile.name}`;
  host.querySelector('span')!.textContent = motions[id];
  const canvas = host.querySelector('canvas')!, c = canvas.getContext('2d')!, person = document.createElement('canvas');
  canvas.setAttribute('aria-label', `${profile.name} enjoying ${snack.name} in their current outfit.`);
  const flight = document.createElement('canvas'); flight.className = 'merienda-flight'; flight.setAttribute('aria-hidden','true');
  // A manual popover keeps the flight above the modal and its clipped scroll area.
  if ('showPopover' in flight) flight.setAttribute('popover','manual');
  host.closest('dialog')!.append(flight);
  if (flight.hasAttribute('popover')) try { flight.showPopover(); } catch { flight.removeAttribute('popover'); }
  const fc = flight.getContext('2d')!, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const travel = reduced ? 0 : .65, eating = reduced ? 2.4 : 3.15, total = eating + 2 * travel;
  let elapsed = 0, previous = 0, frame = 0, disposed = false;
  const paintPerson = (walk = 0, gesture?: CharacterGesture) => paintCharacterPreview(person, profile.gender, COLORS[profile.color], 0, walk, profile.wardrobe.equipped, gesture);
  function cleanup() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame); away(false);
    flight.remove(); host.querySelector<HTMLButtonElement>('#merienda-skip')!.onclick = null;
  }
  function finish() { if (disposed) return; cleanup(); done(); }
  host.querySelector<HTMLButtonElement>('#merienda-skip')!.onclick = finish;
  away(true);

  function background() {
    c.imageSmoothingEnabled = false; c.fillStyle = '#1c3327'; c.fillRect(0,0,360,164);
    c.fillStyle = '#46664a'; c.fillRect(9,12,342,140);
    c.fillStyle = '#78946a'; c.fillRect(13,16,334,100);
    c.fillStyle = '#c9b58b'; c.fillRect(13,116,334,32);
    c.fillStyle = '#d8c69c'; for (let i=0;i<20;i++) c.fillRect(20+i*31%320,122+i*13%22,5,2);
    // A small counter frames the avatar without replacing the game's pixel art.
    c.fillStyle = '#a08052'; c.fillRect(44,127,272,9); c.fillStyle = '#654e38'; c.fillRect(49,136,7,16); c.fillRect(304,136,7,16);
    c.fillStyle = '#4b7050'; for (const x of [26,319]) { c.fillRect(x+5,78,5,38); c.fillRect(x,85,16,21); }
    c.fillStyle = '#c9d29f'; c.fillRect(27,36,53,3); c.fillRect(278,36,53,3);
  }
  const box = (x:number,y:number,w:number,h:number,color:string) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),w,h); };
  function food(t: number) {
    const spoon = id==='taho'||id==='halo-halo', biteFood=['biscuit','pandesal','turon','puto','bibingka'].includes(id);
    const bite = Math.min(2,Math.floor(t*3)), cycle = t*3%1;
    const lift = reduced ? .75 : Math.sin(Math.min(1,cycle*1.6)*Math.PI);
    const atMouth = cycle > .25 && cycle < .7;
    const hand = spoon ? {x:lerp(4,15,lift),y:lerp(20,13,lift)} : id === 'juice' ? {x:19,y:18} : biteFood ? {x:lerp(22,13,lift),y:lerp(21,15,lift)} : {x:lerp(22,11,lift),y:lerp(23,18,lift)};
    const gesture: CharacterGesture = { rightHand: hand, leftHand: spoon ? {x:4,y:21} : undefined, mouth: atMouth ? 'open' : cycle > .7 ? 'chew' : 'smile' };
    paintPerson(0,gesture);
    c.save(); c.translate(132,reduced ? 14 : 14-Math.round(Math.sin(t*18)*.5)); c.scale(4,4); c.drawImage(person,0,0);
    if (spoon) {
      box(0,20,9,10,'#213029'); box(1,21,7,8,'#e8d6af'); box(1,21,7,2,'#a66e3c');
      box(2,26,1,1,'#795135'); box(5,27,1,1,'#795135');
      box(hand.x,hand.y,5,1,'#c6c6a3'); box(hand.x-1,hand.y-1,3,2,'#edd9ab');
      if (!atMouth) box(hand.x,hand.y-1,2,1,'#9d673b');
      // The tofu/syrup level drops with each spoonful.
      box(1,21,7,bite,'#6c8268');
      if(id==='halo-halo'){box(1,21,7,3,'#a78aba');box(2,20,5,2,'#e4dfca');box(2,25,2,2,'#9b6e93');box(5,27,2,1,'#709354');}
    } else if (id === 'juice') {
      box(17,18,9,12,'#213029'); box(18,19,7,10,'#82b0ae'); box(19,22,5,4,'#e8c47c');
      box(18,19,7,1,'#ede1b7'); box(18,28,7,1,'#ede1b7');
      box(22,14,1,5,'#ebddb1'); box(15,14,8,1,'#ebddb1');
      if (atMouth) { box(22,16+Math.floor(cycle*8)%3,1,1,'#8abbb8'); box(27,10,1,2,'#c3dcd0'); }
    } else if (biteFood) {
      if (!(bite===2 && cycle>.68)) {
        box(hand.x-1,hand.y-3,7,7,'#213029'); box(hand.x,hand.y-2,5,5,'#edce91');
        box(hand.x+1,hand.y-1,1,1,'#ac7d45'); box(hand.x+3,hand.y+1,1,1,'#ac7d45');
        if (bite) box(hand.x-1,hand.y-3,2+bite,2,'#78946a');
        if(id!=='biscuit') {box(hand.x,hand.y-2,5,5,id==='puto'?'#f2e6c9':id==='turon'?'#bc8b4e':'#dbb477');box(hand.x+1,hand.y-2,3,1,id==='puto'?'#e2bc6a':'#f0cf92');if(bite)box(hand.x,hand.y-2,2,1,'#78946a');}
      }
      if (cycle > .5) for(let n=0;n<3;n++) box(15+n*3,17+(cycle-.5)*20+n,1,1,'#edce91');
    } else {
      c.strokeStyle='#213029'; c.lineWidth=2; c.beginPath(); c.moveTo(hand.x,hand.y+10); c.lineTo(hand.x+5,hand.y-5); c.stroke();
      c.strokeStyle='#b18a55'; c.lineWidth=1; c.stroke();
      for(let n=0;n<Math.max(0,3-bite-(cycle>.68?1:0));n++) {
        const x=hand.x+1+n, y=hand.y+4-n*4;
        box(x-1,y-1,5,id==='kikiam'?7:5,'#213029');
        box(x,y,3,id==='kikiam'||id==='banana-cue'?5:3,id==='kwek-kwek'?'#e58c39':id==='kikiam'?'#b8844e':id==='banana-cue'?'#bd803c':'#ead3a0');
        if(id==='kwek-kwek' && atMouth && n===2-bite) box(x,y,2,2,'#f4e8c7');
      }
    }
    c.restore();
    host.dataset.bite = String(bite+1);
    host.dataset.motion = spoon ? 'spoon' : id === 'juice' ? 'sip' : biteFood ? 'crunch' : 'skewer';
  }
  function draw(now: number) {
    if(disposed) return;
    const dt = previous ? Math.min(.05,(now-previous)/1000) : 0; previous=now;
    if (!document.hidden) elapsed += dt;
    if(elapsed>=total) { finish(); return; }
    background();
    if (flight.width !== innerWidth || flight.height !== innerHeight) { flight.width=innerWidth; flight.height=innerHeight; }
    fc.clearRect(0,0,flight.width,flight.height); fc.imageSmoothingEnabled=false;
    if(elapsed<travel || elapsed>travel+eating) {
      const returning=elapsed>travel+eating, t=ease(returning?(elapsed-travel-eating)/travel:elapsed/travel);
      host.dataset.phase=returning?'return':'enter';
      const start=origin(), rect=canvas.getBoundingClientRect(), ratio=rect.width/360;
      const target={x:rect.left+180*ratio,y:rect.top+126*ratio,scale:4*ratio};
      const progress=returning?1-t:t, scale=lerp(start.scale,target.scale,progress);
      paintPerson(Math.floor(elapsed*10)%4);
      const x=lerp(start.x,target.x,progress), y=lerp(start.y,target.y,progress)-(reduced?0:Math.sin(progress*Math.PI)*25);
      fc.drawImage(person,Math.round(x-12*scale),Math.round(y-28*scale),24*scale,32*scale);
    } else { host.dataset.phase='eat'; food(Math.min(.999,(elapsed-travel)/eating)); }
    frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  return cleanup;
}
