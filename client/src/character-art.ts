import type { CharacterLook } from './characters';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, outlineSprite } from './sprite-outline';
import { cosmetic, type WardrobeSlot } from './wardrobe';

type Painter = CanvasRenderingContext2D;
export type CharacterGesture = { rightHand: { x: number; y: number }; leftHand?: { x: number; y: number }; mouth?: 'open' | 'chew' | 'smile' };
const fill = (c: Painter, x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };

/** All looks share the same padded frame and feet anchor, including walking frames. */
export function drawCharacter(c: Painter, color: string, look: CharacterLook, direction = 0, frame = 0, outfit?: Record<WardrobeSlot, string>, gesture?: CharacterGesture) {
  const elderlyWoman = look === 'mama-shoni', elderlyMan = look === 'tatay-efren';
  const girl = ['girl', 'mama-shoni', 'audrey', 'sheena', 'weng', 'weng-new', 'wendy', 'jhing'].includes(look);
  const elderly = elderlyWoman || elderlyMan, bob = frame % 2;
  const stride = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  const hair = elderly ? '#c9c7b5' : look === 'weng' ? '#604533' : look === 'sheena' ? '#4b3833' : '#323c34';
  const hairShadow = elderly ? '#939c8e' : '#25362e';
  const skin = outfit ? cosmetic(outfit.skin)?.tint ?? '#dda97c' : elderly ? '#d7aa86' : look === 'mj' || look === 'weng' ? '#c48e66' : '#dda97c';
  const ribbon = look === 'sheena' ? '#e5acac' : look === 'weng' ? '#a5c8c0' : '#eed28d';

  // Hair is behind the shoulders; different silhouettes stay visible from the back.
  if (girl) {
    fill(c, 5, 7 - bob, 15, look === 'sheena' ? 9 : 12, hairShadow);
    if (look === 'weng') { fill(c, direction === 1 ? 4 : 19, 12 - bob, 2, 9, hair); fill(c, direction === 1 ? 4 : 19, 20 - bob, 2, 2, ribbon); }
    else if (!elderlyWoman && look !== 'sheena') { fill(c, direction === 1 ? 3 : 19, 7 - bob, 3, 9, hair); fill(c, direction === 1 ? 3 : 19, 7 - bob, 3, 2, ribbon); }
    if (look === 'audrey') { fill(c, 3, 7 - bob, 3, 9, hair); fill(c, 19, 7 - bob, 3, 9, hair); fill(c, 3, 7 - bob, 3, 2, ribbon); fill(c, 19, 7 - bob, 3, 2, ribbon); }
  }
  fill(c, 7, 21 - bob, 4, 5 + bob + stride, '#465b56'); fill(c, 13, 21 - bob, 4, 5 + bob - stride, '#334d49');
  fill(c, 6, 26 + stride, 5, 2, elderly ? '#5d594b' : '#e9d8b3'); fill(c, 13, 26 - stride, 5, 2, elderly ? '#5d594b' : '#e9d8b3');
  fill(c, 5, 14 - bob, 14, 9, color); fill(c, 5, 21 - bob, 14, 2, '#00000022');
  if (girl) { fill(c, 5, 20 - bob, 14, 4, elderlyWoman ? '#6d6570' : color); fill(c, 4, 23 - bob, 16, 1, elderlyWoman ? '#524d5a' : '#00000025'); }
  if (!gesture?.leftHand) fill(c, 3, 15 - bob - stride / 2, 3, 7, skin);
  if (!gesture) fill(c, 18, 15 - bob + stride / 2, 3, 7, skin);
  fill(c, 7, 5 - bob, 11, 10, skin);
  fill(c, 6, 3 - bob, 13, 5, hair); fill(c, 8, 2 - bob, 9, 2, hair);
  if (elderlyMan) {
    fill(c, 9, 3 - bob, 7, 4, skin); // Receding hair, grey temples, and a small moustache.
    fill(c, 6, 7 - bob, 2, 4, hair); fill(c, 17, 7 - bob, 2, 4, hair);
    fill(c, 20, 18, 2, 9, '#8a6745'); fill(c, 19, 17, 3, 2, '#b68b58');
    fill(c, 10, 16 - bob, 4, 2, '#e3ddc6'); fill(c, 11, 18 - bob, 2, 4, '#dbcda7');
  } else if (elderlyWoman) {
    fill(c, direction === 1 ? 16 : 5, 2 - bob, 5, 5, hairShadow);
    fill(c, direction === 1 ? 17 : 5, 2 - bob, 4, 3, hair);
    fill(c, 6, 7 - bob, 2, 5, hair); fill(c, 17, 7 - bob, 2, 5, hair);
    fill(c, 7, 13 - bob, 1, 2, '#ebc97f'); fill(c, 17, 13 - bob, 1, 2, '#ebc97f');
    for (const [x, y] of [[8, 17], [14, 20], [6, 20]]) { fill(c, x, y - bob, 2, 2, '#efcf9e'); fill(c, x, y - bob, 1, 1, '#bf8d99'); }
  } else if (look === 'jr') {
    fill(c,6,6-bob,13,2,'#e0b95d');fill(c,direction===1?3:18,7-bob,4,3,'#e0b95d');fill(c,10,17-bob,5,4,'#f3e0b7');
  } else if (look === 'geron') {
    fill(c,6,2-bob,13,3,'#7e6246');fill(c,8,1-bob,7,2,'#7e6246');
    if(direction!==3){fill(c,8,9-bob,4,4,'#38524b');fill(c,14,9-bob,4,4,'#38524b');fill(c,9,10-bob,2,2,'#b6d3bc');fill(c,15,10-bob,2,2,'#b6d3bc');fill(c,12,10-bob,2,1,'#38524b');}
    fill(c,7,20-bob,10,2,'#e9cd8f');
  } else if (look === 'ferdie') {
    fill(c, 6, 3 - bob, 13, 4, '#64734a'); fill(c, direction === 1 ? 3 : 8, 6 - bob, 13, 2, '#e0c777');
    fill(c, 11, 4 - bob, 3, 2, '#d3dab7');
  } else if (look === 'pom') {
    fill(c, 6, 2 - bob, 13, 3, '#684a36'); fill(c, 8, 1 - bob, 8, 2, '#684a36');
    fill(c, 6, 5 - bob, 4, 3, '#684a36'); fill(c, 9, 17 - bob, 6, 3, '#f3e3ad');
  } else if (look === 'eric') {
    fill(c, 6, 2 - bob, 3, 4, hair); fill(c, 12, 1 - bob, 4, 4, hair);
    fill(c, 16, 3 - bob, 4, 3, hair); fill(c, 7, 18 - bob, 10, 2, '#e8bd70');
  } else if (look === 'mj') {
    fill(c, 7, 2 - bob, 3, 4, hair); fill(c, 12, 2 - bob, 3, 4, hair);
    fill(c, 6, 18 - bob, 12, 2, '#e4ded0');
  } else if (girl) {
    fill(c, 6, 6 - bob, 2, 8, hair); fill(c, 17, 5 - bob, 2, look === 'sheena' ? 10 : 8, hair);
    if (look === 'sheena') fill(c, 6, 4 - bob, 13, 2, ribbon);
    if (look === 'wendy') {
      fill(c, direction === 1 ? 2 : 19, 6 - bob, 4, 14, '#513c32');
      fill(c, direction === 1 ? 2 : 19, 6 - bob, 4, 3, '#8bc2b0');
      fill(c, 7, 18 - bob, 10, 2, '#f7d994');
    }
    if (look === 'weng-new') {
      fill(c, direction === 1 ? 18 : 3, 9 - bob, 3, 10, '#323c34');
      fill(c, direction === 1 ? 18 : 3, 8 - bob, 3, 3, '#d6a8cc');
      fill(c, 7, 17 - bob, 10, 2, '#f3dfbb');
    }
    if(look==='jhing'){fill(c,direction===1?3:18,5-bob,4,13,'#654a3c');fill(c,direction===1?3:18,5-bob,4,3,'#d6a1a1');fill(c,8,18-bob,8,2,'#f0d998');}
    fill(c, 10, 15 - bob, 5, 2, '#f5e7cb');
  } else fill(c, 6, 8 - bob, 3, 4, hair);

  if (direction === 3) {
    fill(c, elderlyMan ? 9 : 7, 6 - bob, elderlyMan ? 7 : 11, elderlyMan ? 4 : 7, hair);
    if (elderlyMan) fill(c, 10, 4 - bob, 5, 3, skin);
  } else {
    const eyeX = direction === 1 ? 8 : direction === 2 ? 15 : 10;
    fill(c, eyeX, 10 - bob, 1, 2, '#37433c');
    if (direction === 0) fill(c, 15, 10 - bob, 1, 2, '#37433c');
    fill(c, 11, 14 - bob, 3, 1, '#aa7757');
    if (elderly) {
      fill(c, eyeX - 1, 9 - bob, 3, 1, '#5f6c60'); fill(c, eyeX - 1, 12 - bob, 3, 1, '#5f6c60');
      if (direction === 0) { fill(c, 14, 9 - bob, 3, 1, '#5f6c60'); fill(c, 14, 12 - bob, 3, 1, '#5f6c60'); fill(c, 11, 10 - bob, 4, 1, '#5f6c60'); }
      if (elderlyMan) fill(c, 10, 13 - bob, 6, 1, hairShadow);
    }
  }
  fill(c, 8, 17 - bob, 2, 3, '#ffffff25');
  if (outfit) {
    // Clothing respects the same feet anchor and the padded 24×32 silhouette.
    const shorts = outfit.bottom === 'bottom-shorts', legs = outfit.bottom === 'bottom-denim' ? '#4d7291' : outfit.bottom === 'bottom-cargo' ? '#79815d' : '#465b56';
    for (const [x, step] of [[7, stride], [13, -stride]]) {
      fill(c, x, 21 - bob, 4, 5 + bob + step, legs);
      if (shorts) fill(c, x, 24 - bob, 4, 2 + bob + step, skin);
      if (outfit.bottom === 'bottom-cargo') fill(c, x, 22 - bob, 3, 2, '#a5a879');
      if (outfit.bottom === 'bottom-denim') fill(c, x, 25 + step, 4, 1, '#91a5b2');
      const shoeY = 26 + step;
      const shoe = outfit.shoes === 'shoes-boots' ? '#725336' : outfit.shoes === 'shoes-sneakers' ? '#bc6858' : outfit.shoes === 'shoes-slippers' ? skin : '#e9d8b3';
      fill(c, x - 1, shoeY, 5, 2, shoe);
      if (outfit.shoes === 'shoes-slippers') fill(c, x - 1, shoeY + 1, 5, 1, '#466f69');
      if (outfit.shoes === 'shoes-sneakers') fill(c, x - 1, shoeY + 1, 5, 1, '#f6e3b6');
      if (outfit.shoes === 'shoes-boots') { fill(c, x, shoeY - 1, 4, 2, shoe); fill(c, x + 1, shoeY - 1, 2, 1, '#ccb183'); }
    }
    if (outfit.top === 'top-stripes') { fill(c, 6, 17 - bob, 12, 1, '#f5e5c0'); fill(c, 6, 20 - bob, 12, 1, '#f5e5c0'); }
    if (outfit.top === 'top-varsity') { fill(c, 5, 15 - bob, 14, 8, '#557a72'); fill(c, 5, 15 - bob, 2, 7, '#f0d9ad'); fill(c, 17, 15 - bob, 2, 7, '#f0d9ad'); fill(c, 11, 15 - bob, 1, 8, '#f0d9ad'); fill(c, 14, 17 - bob, 2, 2, '#e7ba64'); }
    if (outfit.top === 'top-explorer') { fill(c, 5, 15 - bob, 14, 8, '#b7945d'); fill(c, 11, 15 - bob, 2, 8, '#ece1ba'); fill(c, 6, 18 - bob, 3, 3, '#80643d'); fill(c, 15, 18 - bob, 3, 3, '#80643d'); }
    const suit = outfit.costume;
    if (suit !== 'costume-none') {
      const palette = suit === 'costume-sentinel' ? ['#39474d', '#e7bb68'] : suit === 'costume-web' ? ['#b46059', '#466b86'] : suit === 'costume-ranger' ? ['#d8d9b9', '#668e81'] : ['#b99458', '#86c3bc'];
      fill(c, 5, 15 - bob, 14, 9, palette[0]); fill(c, 7, 23 - bob, 4, 3 + stride, palette[0]); fill(c, 13, 23 - bob, 4, 3 - stride, palette[0]);
      if (suit === 'costume-sentinel') { fill(c, 3, 16 - bob, 2, 9, '#26383d'); fill(c, 19, 16 - bob, 2, 9, '#26383d'); fill(c, 6, 6 - bob, 13, 6, '#39474d'); fill(c, 9, 17 - bob, 7, 2, palette[1]); fill(c, 11, 19 - bob, 3, 2, palette[1]); }
      if (suit === 'costume-web') { for (let x = 7; x < 19; x += 4) fill(c, x, 15 - bob, 1, 8, '#493c46'); for (let y = 17; y < 23; y += 3) fill(c, 5, y - bob, 14, 1, '#493c46'); fill(c, 6, 5 - bob, 13, 8, palette[0]); }
      if (suit === 'costume-ranger' || suit === 'costume-clockwork') { fill(c, 6, 4 - bob, 13, 9, palette[0]); fill(c, 7, 8 - bob, 11, 4, '#385b63'); fill(c, 8, 8 - bob, 5, 1, palette[1]); fill(c, 7, 16 - bob, 4, 4, palette[1]); fill(c, 14, 16 - bob, 4, 4, palette[1]); fill(c, 5, 22 - bob, 14, 2, '#526758'); }
      if (direction !== 3 && (suit === 'costume-sentinel' || suit === 'costume-web')) { fill(c, direction === 1 ? 8 : direction === 2 ? 15 : 9, 9 - bob, 3, 1, '#f6ead1'); if (direction === 0) fill(c, 14, 9 - bob, 3, 1, '#f6ead1'); }
    }
    if (direction !== 3) {
      if (outfit.beard === 'beard-stubble') { fill(c, 9, 13 - bob, 1, 1, '#605041'); fill(c, 15, 13 - bob, 1, 1, '#605041'); }
      if (outfit.beard === 'beard-mustache' || outfit.beard === 'beard-full') fill(c, 10, 13 - bob, 6, 1, '#4c3c30');
      if (outfit.beard === 'beard-full') { fill(c, 8, 13 - bob, 2, 3, '#4c3c30'); fill(c, 16, 13 - bob, 2, 3, '#4c3c30'); fill(c, 10, 15 - bob, 6, 2, '#5e4736'); }
    }
    if (outfit.hat === 'hat-cap') { fill(c, 6, 2 - bob, 13, 4, '#5c817b'); fill(c, direction === 1 ? 3 : 7, 6 - bob, 14, 2, '#e5bb73'); }
    if (outfit.hat === 'hat-bucket') { fill(c, 7, 2 - bob, 11, 4, '#d0b57d'); fill(c, 4, 6 - bob, 17, 2, '#9b8056'); }
    if (outfit.hat === 'hat-adventure') { fill(c, 8, 2 - bob, 9, 4, '#92704a'); fill(c, 7, 5 - bob, 11, 2, '#554538'); fill(c, 4, 7 - bob, 17, 2, '#ad8758'); }
    if (outfit.hat === 'hat-astral') { fill(c, 6, 2 - bob, 13, 9, '#cbd5ba'); fill(c, 7, 6 - bob, 11, 5, '#466c77'); fill(c, 8, 6 - bob, 5, 1, '#a4d3cf'); }
    if(outfit.costume==='costume-none') {
    if (outfit.top==='top-jersey') { fill(c,5,14-bob,14,9,'#426f85');fill(c,5,14-bob,2,8,'#eed08b');fill(c,17,14-bob,2,8,'#eed08b');fill(c,11,17-bob,3,4,'#f2d48c'); }
    if (outfit.top==='top-barong') { fill(c,5,14-bob,14,9,'#e6d9b4');fill(c,11,14-bob,2,9,'#b39e74');for(const x of [8,15])for(const y of [16,19,21])fill(c,x,y-bob,1,1,'#ad9270'); }
    if (outfit.top==='top-fiesta') { fill(c,5,14-bob,14,9,'#437d78');fill(c,5,15-bob,3,7,'#c17868');fill(c,16,15-bob,3,7,'#c17868');fill(c,11,14-bob,2,9,'#edc579');for(const x of [7,16])fill(c,x,17-bob,1,4,'#e4bd77'); }
    if(outfit.bottom==='bottom-weave')for(const x of [7,13]){fill(c,x,23-bob,4,3,'#425c82');fill(c,x,25-bob,4,1,'#dbb46c');fill(c,x+1,24-bob,1,1,'#cb8c78');}
    }
    if(outfit.shoes==='shoes-fiesta')for(const [x,step] of [[6,stride],[13,-stride]]){fill(c,x,26+step,5,2,'#873f4b');fill(c,x,27+step,5,1,'#e5c784');fill(c,x+1,26+step,2,1,'#d4ac69');}
    if(outfit.beard==='beard-braid'&&direction!==3){fill(c,9,13-bob,7,3,'#4d3b30');fill(c,11,16-bob,3,4,'#65503a');fill(c,11,19-bob,3,1,'#e4bc6c');}
    if(outfit.hat==='hat-bandana'){fill(c,6,4-bob,13,3,'#af625a');fill(c,17,6-bob,4,4,'#d99572');}
    if(outfit.hat==='hat-salakot'){fill(c,10,1-bob,5,2,'#e6c78c');fill(c,7,3-bob,11,3,'#c3a16b');fill(c,3,6-bob,19,2,'#a57f4f');for(const x of [8,12,16])fill(c,x,4-bob,1,2,'#efd7a5');}
    if(outfit.hat==='hat-lantern'){fill(c,7,2-bob,11,4,'#3d645e');fill(c,4,6-bob,17,2,'#b1945f');fill(c,20,7-bob,1,6,'#c1a06b');fill(c,19,10-bob,3,4,'#e7c878');fill(c,20,11-bob,1,2,'#f8e2a3');}
    if(outfit.hat==='hat-parol'){fill(c,6,5-bob,13,2,'#d2af65');fill(c,11,0,3,8-bob,'#f0d282');fill(c,8,2-bob,9,3,'#e3bb66');fill(c,10,1,5,6-bob,'#e8cb77');fill(c,12,2-bob,1,2,'#cf7e73');for(const x of [5,19])fill(c,x,7-bob,1,5,'#89b5a9');}
    if(['costume-bayani','costume-parol','costume-haribon'].includes(outfit.costume)) {
      const bird=outfit.costume==='costume-haribon',star=outfit.costume==='costume-parol';
      fill(c,3,15-bob,3,11,bird?'#657d57':'#405b7a');fill(c,18,15-bob,3,11,bird?'#657d57':'#405b7a');
      fill(c,5,14-bob,14,10,star?'#6d557f':bird?'#41665b':'#426c88');fill(c,6,21-bob,12,2,'#d9b96e');
      fill(c,10,16-bob,5,4,'#e9cc7e');fill(c,12,15-bob,1,6,'#f5e2aa');fill(c,9,18-bob,7,1,'#f5e2aa');
      if(star||bird)for(const x of [5,17]){fill(c,x,14-bob,2,9,'#d2ad66');for(const y of [16,20])fill(c,x,y-bob,2,1,'#a4cfc0');}
      if(bird){fill(c,7,3-bob,12,2,'#e5c477');fill(c,11,0,3,5-bob,'#f0d797');for(const x of [2,20])for(const y of [16,19,22])fill(c,x,y-bob,3,2,'#d9c590');}
    }
  }
  if (gesture) {
    // Bent pixel arms keep the same outfit/skin, with a dark edge over the shirt.
    for (const [hand, elbow] of [[gesture.rightHand, 20], [gesture.leftHand, 3]] as const) if (hand) {
      const x = Math.round(hand.x), y = Math.round(hand.y), lo = Math.min(x, elbow), top = Math.min(y, 19);
      fill(c, elbow - 1, top - 1, 4, 22 - top, '#213029');
      fill(c, lo - 1, y - 1, Math.abs(x - elbow) + 4, 4, '#213029');
      fill(c, elbow, top, 2, 21 - top, skin);
      fill(c, lo, y, Math.abs(x - elbow) + 2, 2, skin);
    }
    const masked = outfit && (outfit.hat === 'hat-astral' || ['costume-ranger','costume-clockwork','costume-web'].includes(outfit.costume));
    if (!masked && gesture.mouth) fill(c, 12, 14, gesture.mouth === 'smile' ? 3 : 2, gesture.mouth === 'open' ? 2 : 1, '#654334');
  }
}

export function paintCharacterPreview(canvas: HTMLCanvasElement, look: CharacterLook, color: string, direction = 0, frame = 0, outfit?: Record<WardrobeSlot, string>, gesture?: CharacterGesture) {
  canvas.width = CHARACTER_WIDTH; canvas.height = CHARACTER_HEIGHT;
  const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
  drawCharacter(c, color, look, direction, frame, outfit, gesture); outlineSprite(c);
}
