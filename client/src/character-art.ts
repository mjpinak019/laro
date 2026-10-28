import type { CharacterLook } from './characters';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, outlineSprite } from './sprite-outline';

type Painter = CanvasRenderingContext2D;
const fill = (c: Painter, x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };

/** All looks share the same padded frame and feet anchor, including walking frames. */
export function drawCharacter(c: Painter, color: string, look: CharacterLook, direction = 0, frame = 0) {
  const elderlyWoman = look === 'mama-shoni', elderlyMan = look === 'tatay-efren';
  const girl = ['girl', 'mama-shoni', 'audrey', 'sheena', 'weng'].includes(look);
  const elderly = elderlyWoman || elderlyMan, bob = frame % 2;
  const stride = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  const hair = elderly ? '#c9c7b5' : look === 'weng' ? '#604533' : look === 'sheena' ? '#4b3833' : '#323c34';
  const hairShadow = elderly ? '#939c8e' : '#25362e';
  const skin = elderly ? '#d7aa86' : look === 'mj' || look === 'weng' ? '#c48e66' : '#dda97c';
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
  fill(c, 3, 15 - bob - stride / 2, 3, 7, skin); fill(c, 18, 15 - bob + stride / 2, 3, 7, skin);
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
  } else if (look === 'ferdie') {
    fill(c, 6, 3 - bob, 13, 4, '#64734a'); fill(c, direction === 1 ? 3 : 8, 6 - bob, 13, 2, '#e0c777');
    fill(c, 11, 4 - bob, 3, 2, '#d3dab7');
  } else if (look === 'mj') {
    fill(c, 7, 2 - bob, 3, 4, hair); fill(c, 12, 2 - bob, 3, 4, hair);
    fill(c, 6, 18 - bob, 12, 2, '#e4ded0');
  } else if (girl) {
    fill(c, 6, 6 - bob, 2, 8, hair); fill(c, 17, 5 - bob, 2, look === 'sheena' ? 10 : 8, hair);
    if (look === 'sheena') fill(c, 6, 4 - bob, 13, 2, ribbon);
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
}

export function paintCharacterPreview(canvas: HTMLCanvasElement, look: CharacterLook, color: string, direction = 0, frame = 0) {
  canvas.width = CHARACTER_WIDTH; canvas.height = CHARACTER_HEIGHT;
  const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
  drawCharacter(c, color, look, direction, frame); outlineSprite(c);
}
