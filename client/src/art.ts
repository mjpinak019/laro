import type Phaser from 'phaser';
import { COLORS } from './store';
import { pixelLabel } from './pixel-font';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, outlineSprite } from './sprite-outline';
import { propGroundPoint, WORLD_PROPS, type WorldMap } from './world-props';
import { BOT_APPEARANCES, characterTexture, type CharacterLook } from './characters';
import { drawCharacter } from './character-art';
import { HUB_SIZE } from './hub';
import { HIDE_OBJECTS } from './games/hide-objects';

const WIDTH = 480;
const HEIGHT = 300;
type Painter = CanvasRenderingContext2D;
const canvas = (width: number, height: number) => {
  const element = document.createElement('canvas');
  element.width = width; element.height = height;
  element.getContext('2d')!.imageSmoothingEnabled = false;
  return element;
};
function rect(c: Painter, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h);
}
function line(c: Painter, points: number[][], color: string, width = 1) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath();
  points.forEach(([x, y], index) => index ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}
function label(c: Painter, text: string, x: number, y: number, color = '#fcf1d1', size = 7) {
  pixelLabel(c, text, x, y, color, size);
}
function shadow(c: Painter, x: number, y: number, w: number, h: number) {
  c.fillStyle = '#1d453b38'; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, Math.PI * 2); c.fill();
}
function grass(c: Painter, width = WIDTH, height = HEIGHT) {
  rect(c, 0, 0, width, height, '#86a278');
  let seed = 27;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < Math.round(2600 * width * height / (WIDTH * HEIGHT)); i++) {
    const x = Math.floor(random() * width), y = Math.floor(random() * height);
    rect(c, x, y, 2, 1, i % 3 ? '#78966c' : '#9bb083');
  }
}
function tree(c: Painter, x: number, y: number, scale = 1, groundShadow = true) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  if (groundShadow) shadow(c, 8, 6, 20, 7);
  rect(c, -3, -17, 7, 25, '#846649'); rect(c, 1, -17, 3, 25, '#66573e');
  rect(c, -18, -35, 35, 23, '#395f48'); rect(c, -24, -30, 46, 16, '#416e4b');
  rect(c, -15, -42, 29, 31, '#4a7c50'); rect(c, -10, -45, 18, 20, '#639056');
  rect(c, -20, -30, 13, 7, '#759b5f'); rect(c, 3, -37, 11, 8, '#719653');
  rect(c, 8, -19, 15, 5, '#355d45'); rect(c, -12, -19, 8, 5, '#57804e');
  c.restore();
}
function palm(c: Painter, x: number, y: number, groundShadow = true) {
  if (groundShadow) shadow(c, x + 14, y + 4, 23, 7);
  rect(c, x, y - 41, 5, 46, '#9e7f50'); rect(c, x + 4, y - 39, 3, 43, '#715e40');
  for (let i = 0; i < 6; i++) rect(c, x, y - 36 + i * 7, 7, 2, '#c09d69');
  const leaves = [[-30, -41, 24, 5], [-23, -49, 23, 6], [-13, -55, 16, 7], [3, -53, 18, 7], [14, -47, 19, 6], [24, -39, 15, 5], [-32, -36, 8, 10], [32, -35, 7, 10], [-8, -46, 23, 9]];
  leaves.forEach(([dx, dy, w, h], i) => rect(c, x + dx, y + dy, w, h, i % 2 ? '#487549' : '#365f43'));
  rect(c, x - 4, y - 43, 9, 6, '#bac175');
}
function house(c: Painter, x: number, y: number, w: number, h: number, wall: string, roof: string, shop = false) {
  rect(c, x + 5, y + 10, w + 5, h + 10, '#244d3835');
  rect(c, x, y + 18, w, h - 12, wall); rect(c, x + w - 8, y + 18, 8, h - 12, '#00000018');
  rect(c, x - 5, y + 8, w + 10, 19, roof); rect(c, x - 2, y + 3, w + 4, 7, roof);
  rect(c, x + 4, y, w - 8, 5, roof); rect(c, x - 5, y + 24, w + 10, 4, '#493f3f');
  for (let i = 0; i < w + 6; i += 7) rect(c, x - 3 + i, y + 9, 2, 15, '#ffffff20');
  rect(c, x - 1, y + 6, w + 2, 2, '#ffffff35');
  rect(c, x + w / 2 - 7, y + h - 15, 14, 21, '#695844');
  rect(c, x + w / 2 - 5, y + h - 13, 10, 19, '#514b3f');
  rect(c, x + w / 2 + 2, y + h - 5, 2, 2, '#ddc68c');
  for (const wx of [x + 8, x + w - 21]) {
    rect(c, wx, y + 34, 14, 14, '#587c78'); rect(c, wx + 2, y + 36, 9, 4, '#acd0bc');
    rect(c, wx + 6, y + 34, 2, 14, '#e5cfaa'); rect(c, wx, y + 40, 14, 2, '#e5cfaa');
    rect(c, wx - 2, y + 48, 18, 3, '#97734b');
  }
  rect(c, x - 3, y + h + 4, w + 6, 4, '#b7a684');
  if (shop) {
    rect(c, x + 5, y + 30, w - 10, 15, '#f3dc9d'); label(c, 'SARI-SARI', x + w / 2, y + 40, '#506249', 8);
    rect(c, x + 5, y + 47, w - 10, 12, '#426d62');
    for (let i = 0; i < 9; i++) { rect(c, x + 8 + i * 6, y + 49, 3, 7, ['#d7ac59', '#b96758', '#a4b6b1'][i % 3]); }
    for (let i = 0; i < w; i += 10) rect(c, x + i, y + 43, 10, 4, i % 20 ? '#d6b776' : '#749b80');
    rect(c, x + 4, y + 60, w - 8, 4, '#b99563');
  }
}
function bench(c: Painter, x: number, y: number) {
  rect(c, x + 3, y + 4, 2, 9, '#555747'); rect(c, x + 25, y + 4, 2, 9, '#555747');
  rect(c, x, y - 3, 30, 4, '#a78253'); rect(c, x, y + 2, 30, 4, '#be9862');
}
function pot(c: Painter, x: number, y: number) {
  rect(c, x - 4, y - 1, 8, 8, '#a97454'); rect(c, x - 5, y - 3, 10, 3, '#ce9568');
  rect(c, x - 2, y - 13, 4, 10, '#52794b'); rect(c, x - 6, y - 10, 6, 4, '#6a9253'); rect(c, x + 1, y - 12, 5, 4, '#7b9d60');
}
function fence(c: Painter, x: number, y: number, w: number) {
  rect(c, x, y + 3, w, 3, '#c8bd90'); rect(c, x, y + 10, w, 2, '#9f9e76');
  for (let i = 0; i < w; i += 8) rect(c, x + i, y, 3, 17, '#dbcea2');
}
function pennants(c: Painter, x: number, y: number, width: number) {
  line(c, [[x, y], [x + width / 2, y + 11], [x + width, y]], '#4d614e');
  for (let i = 0; i < width; i += 15) {
    const py = y + Math.sin(i / width * Math.PI) * 11;
    c.fillStyle = ['#d9976e', '#e5c67b', '#87a9a4', '#b5bd80'][Math.floor(i / 15) % 4];
    c.beginPath(); c.moveTo(x + i, py); c.lineTo(x + i + 9, py + 1); c.lineTo(x + i + 4, py + 11); c.fill();
  }
}

function drawPropShadows(c: Painter, map: WorldMap) {
  for (const prop of WORLD_PROPS[map]) {
    const scale = prop.scale ?? 1;
    if (prop.kind === 'tree') shadow(c, prop.x + 8 * scale, prop.y + 6 * scale, 20 * scale, 7 * scale);
    else if (prop.kind === 'palm') shadow(c, prop.x + 14 * scale, prop.y + 4 * scale, 23 * scale, 7 * scale);
    else {
      const ground = propGroundPoint(prop);
      if (prop.kind === 'fence') rect(c, prop.x, ground.y / 2 - 1, prop.width ?? 64, 2, '#244a3026');
      else shadow(c, ground.x / 2 + 2, ground.y / 2, prop.kind === 'bench' ? 18 : 7, 3);
    }
  }
}

function drawHub(c: Painter) {
  grass(c, HUB_SIZE.width / 2, HUB_SIZE.height / 2);
  rect(c, 102, 69, 42, 231, '#cdb994'); rect(c, 0, 157, 480, 66, '#cdb994');
  rect(c, 103, 161, 196, 111, '#c8bb98'); rect(c, 145, 126, 146, 126, '#c5b998');
  for (let y = 130; y < 252; y += 9) for (let x = 148; x < 289; x += 13) {
    rect(c, x, y, 11, 7, ((x + y) % 3) ? '#cebf9c' : '#d5c5a2');
  }
  for (let i = 0; i < 130; i++) rect(c, (i * 71) % 480, 166 + (i * 11) % 49, 2, 1, '#b5a684');
  rect(c, 298, 116, 158, 126, '#a7a784'); rect(c, 303, 120, 149, 117, '#bdad89');
  c.strokeStyle = '#eee1b8'; c.lineWidth = 2; c.strokeRect(311, 129, 132, 97);
  for (let i = 1; i < 4; i++) rect(c, 311, 129 + i * 24, 132, 2, '#eee1b8');
  rect(c, 376, 129, 2, 97, '#eee1b8');
  label(c, 'PATINTERO', 377, 253, '#405b43', 8);
  house(c, 24, 79, 70, 68, '#e0c48c', '#9f6956', true);
  house(c, 151, 35, 65, 61, '#a8b6a0', '#65838a');
  house(c, 231, 50, 58, 54, '#d0ad82', '#b07c58');
  house(c, 320, 25, 64, 56, '#d4bca2', '#897b71');
  house(c, 20, 231, 66, 56, '#9fae9e', '#6d8582');
  // A sunlit plaza with a little planter at its center.
  shadow(c, 224, 191, 25, 9);
  rect(c, 203, 169, 34, 26, '#a59778'); rect(c, 201, 167, 38, 7, '#e0d2a8'); rect(c, 207, 174, 26, 16, '#728a5d');
  // Philippine motorized tricycle: enclosed sidecar beside an exposed motorcycle.
  // The canopy, three wheels, and chrome fork fit the shared 65-by-48 footprint.
  shadow(c, 88, 195, 17, 5);
  rect(c, 74, 190, 5, 7, '#293c38'); rect(c, 75, 192, 3, 3, '#a8b1a0');
  rect(c, 90, 189, 5, 7, '#293c38'); rect(c, 91, 191, 3, 3, '#a8b1a0');
  rect(c, 99, 190, 5, 7, '#293c38'); rect(c, 100, 192, 3, 3, '#a8b1a0');
  rect(c, 72, 178, 17, 14, '#397d88'); rect(c, 74, 178, 12, 8, '#a9c9bf');
  rect(c, 79, 178, 1, 9, '#416e73'); rect(c, 73, 187, 15, 4, '#5597a0');
  rect(c, 75, 188, 8, 1, '#dfd4ad'); rect(c, 85, 181, 3, 8, '#234d53');
  rect(c, 89, 186, 9, 4, '#b56c51'); rect(c, 90, 184, 6, 2, '#283e3e');
  rect(c, 94, 189, 5, 2, '#c8cbb5'); rect(c, 95, 180, 2, 8, '#c8cbb5');
  line(c, [[96, 183], [99, 186], [101, 193]], '#d2d4bd', 1);
  rect(c, 97, 182, 5, 2, '#2b4243'); rect(c, 100, 184, 3, 3, '#f2d594');
  rect(c, 72, 175, 2, 12, '#b8c2ac'); rect(c, 87, 175, 2, 12, '#b8c2ac');
  rect(c, 97, 175, 1, 7, '#b8c2ac'); rect(c, 71, 173, 30, 3, '#e1cf9d');
  rect(c, 73, 172, 25, 1, '#8e784e');
  drawPropShadows(c, 'hub');
  // Gateposts, chalk hopscotch, and scattered flowering ground cover.
  rect(c, 297, 208, 4, 17, '#806c4d'); rect(c, 297, 201, 4, 5, '#e6c278');
  for (let i = 0; i < 5; i++) { c.strokeStyle = '#efe1bd'; c.strokeRect(155 + (i % 2) * 9, 175 + i * 10, 9, 10); }
  for (const [x, y] of [[54, 63], [95, 257], [288, 53], [445, 255], [253, 272], [14, 66]]) {
    rect(c, x, y, 2, 3, '#ebd795'); rect(c, x + 5, y + 2, 2, 2, '#dfac92');
  }
  pennants(c, 93, 116, 215); pennants(c, 296, 101, 159);
  // Roads connect the original plaza to three additional, walkable districts.
  rect(c, 456, 163, 344, 43, '#cdb994');
  rect(c, 106, 285, 39, 215, '#cdb994'); rect(c, 106, 329, 656, 43, '#cdb994');
  rect(c, 620, 200, 39, 280, '#cdb994');
  rect(c, 163, 310, 145, 144, '#c4b694');
  for (let y = 314; y < 450; y += 12) for (let x = 167; x < 304; x += 17) rect(c, x, y, 15, 10, '#d2c29e');
  label(c, 'DAMA SA TINDAHAN', 235, 430, '#3e6047', 8);
  pennants(c, 157, 300, 160);
  house(c, 548, 42, 190, 86, '#d8c69b', '#92765d');
  rect(c, 600, 74, 91, 17, '#4b7159'); label(c, 'PAARALAN', 645, 86, '#f6e4b7', 8);
  rect(c, 519, 145, 236, 125, '#c8b38c');
  for (let i = 0; i < 12; i++) rect(c, 540 + i * 16, 224, 9, 2, '#f1dfb4');
  rect(c, 628, 220, 23, 7, '#9cab75');
  label(c, 'LUKSONG-TINIK', 650, 260, '#49674b', 9);
  rect(c, 528, 306, 234, 129, '#b6a98a');
  drawHidingObject(c, 'crates', 535, 305, 50, 57);
  drawHidingObject(c, 'barrels', 710, 332, 56, 53);
  drawHidingObject(c, 'laundry', 594, 306, 82, 42);
  drawHidingObject(c, 'hedge', 559, 398, 70, 30);
  drawHidingObject(c, 'bamboo', 730, 392, 27, 46);
  label(c, 'TAGU-TAGUAN', 650, 447, '#3b6045', 9);
  label(c, 'LIKOD-BAHAY', 649, 468, '#45684b', 8);
  label(c, 'TAMBAYAN', 229, 319, '#5c704e', 8);
  pennants(c, 513, 296, 258);
  // The circle court sits beside the schoolyard, connected to its front road.
  rect(c, 470, 204, 57, 71, '#c6ae81');
  c.strokeStyle = '#f4e5bd'; c.lineWidth = 2; c.beginPath(); c.arc(499, 239, 23, 0, Math.PI * 2); c.stroke();
  for (const [x, y, color] of [[495, 236, '#83b9b2'], [502, 240, '#e7bc70'], [495, 243, '#cd8e87']] as const) { rect(c, x, y, 4, 4, '#405b43'); rect(c, x, y, 3, 3, color); rect(c, x, y, 1, 1, '#fff1c4'); }
  rect(c, 477, 271, 45, 12, '#435f46'); label(c, 'JOLEN', 500, 280, '#f4dfaa', 8);
  rect(c, 164, 455, 140, 40, '#bdae88'); c.strokeStyle = '#eee0b4'; c.strokeRect(175, 460, 115, 30);
  line(c, [[183, 474], [210, 483], [250, 483], [280, 474]], '#7b6245', 2);
  label(c, 'LUKSONG LUBID', 234, 495, '#3c5c43', 8);
  // Two connected eastern districts, each with its own walkable entrance.
  rect(c, 790, 163, 280, 43, '#cdb994'); rect(c, 815, 163, 42, 505, '#cdb994');
  rect(c, 620, 480, 39, 188, '#cdb994'); rect(c, 620, 645, 450, 30, '#cdb994');
  rect(c, 815, 425, 255, 35, '#cdb994'); rect(c, 850, 570, 222, 38, '#cdb994');
  rect(c, 875, 110, 195, 220, '#bcb28e');
  for (let y = 0; y < 7; y++) {
    const pair = y === 2 || y === 4, xx = pair ? 932 : 942, yy = 287 - y * 23;
    c.strokeStyle = '#f4e7bf'; c.lineWidth = 2; c.strokeRect(xx, yy, pair ? 40 : 20, 23);
    if (pair) line(c, [[xx + 20, yy], [xx + 20, yy + 23]], '#f4e7bf', 2);
  }
  label(c, 'PIKO WITH WENDY', 972, 130, '#476748', 8); pennants(c, 872, 105, 200);
  rect(c, 875, 485, 195, 155, '#c6af86');
  line(c, [[890, 610], [1052, 610]], '#f4e5bd', 2);
  rect(c, 963, 534, 8, 13, '#9fafa2'); rect(c, 964, 539, 6, 4, '#bd7655');
  rect(c, 917, 596, 5, 9, '#66939b');
  label(c, 'TUMBANG PRESO', 973, 510, '#496648', 8); label(c, 'WITH ERIC', 974, 632, '#496648', 8);
  label(c, 'SILANGANG KANTO', 970, 448, '#486449', 8); pennants(c, 875, 477, 192);
}

function drawHidingObject(c: Painter, kind: string, x: number, y: number, w: number, h: number) {
  shadow(c, x + w / 2 + 3, y + h, w / 2, 4);
  if (kind === 'laundry') {
    rect(c, x, y, 2, h, '#806b4c'); rect(c, x + w - 2, y, 2, h, '#806b4c');
    line(c, [[x, y + 4], [x + w, y + 4]], '#607052');
    for (let i = 0; i < 4; i++) { rect(c, x + 5 + i * (w - 10) / 4, y + 4, Math.floor((w - 15) / 4), Math.floor(h * .76), ['#dfcea8','#83a9a4','#d49a83','#b6bb88'][i]); }
  } else if (kind === 'hedge') {
    rect(c, x, y + 4, w, h - 4, '#3e7147'); rect(c, x + 2, y, w - 4, h - 7, '#659154');
    for (let xx = x + 5; xx < x + w - 3; xx += 10) rect(c, xx, y + 3, 5, 4, '#9bb77a');
  } else if (kind === 'bamboo') {
    for (let xx = x + 3; xx < x + w; xx += 6) { rect(c, xx, y, 3, h, '#527a43'); for (let yy = y + 8; yy < y + h; yy += 10) rect(c, xx, yy, 3, 2, '#abc17c'); rect(c, xx - 3, y + 5, 9, 3, '#719a57'); }
  } else if (kind === 'barrels') {
    const bw = Math.min(17, w / 2);
    for (let xx = x; xx + bw <= x + w + 1; xx += bw) {
      rect(c, xx, y + 4, bw - 1, h - 4, '#527f80'); rect(c, xx + 2, y, bw - 5, 5, '#a3c2b4');
      rect(c, xx, y + Math.floor(h * .38), bw - 1, 2, '#355f63'); rect(c, xx, y + Math.floor(h * .78), bw - 1, 2, '#355f63');
    }
  } else {
    rect(c, x, y, w, h, '#99774c'); rect(c, x + 2, y + 2, w - 4, h - 4, '#b99562');
    line(c, [[x + 3, y + 3], [x + w - 4, y + h - 4]], '#7d6547', 2);
    line(c, [[x + w - 4, y + 3], [x + 3, y + h - 4]], '#7d6547', 2);
  }
}

function drawCourt(c: Painter) {
  grass(c);
  rect(c, 78, 33, 324, 249, '#b5a680'); rect(c, 82, 36, 316, 243, '#cfb991');
  for (let i = 0; i < 1000; i++) rect(c, 84 + (i * 41) % 310, 38 + (i * 67) % 239, 1, 1, i % 2 ? '#d9c59e' : '#bba77f');
  rect(c, 100, 60, 280, 180, '#c2ad85');
  c.strokeStyle = '#f4e8c7'; c.lineWidth = 2; c.strokeRect(100, 60, 280, 180);
  for (const y of [90, 140, 190]) rect(c, 100, y, 280, 2, '#f4e8c7');
  rect(c, 239, 60, 2, 180, '#f4e8c7');
  for (const x of [100, 380]) for (let y = 62; y < 240; y += 12) rect(c, x - 1, y, 3, 5, '#e5d7b3');
  rect(c, 101, 39, 278, 15, '#92a778'); rect(c, 101, 248, 278, 22, '#b8ba8e');
  label(c, 'TURN HERE  /  BALIK!', 240, 50, '#395843', 7);
  label(c, 'HOME  /  BAHAY', 240, 262, '#4e6447', 7);
  for (let i = 0; i < 10; i++) { rect(c, 105 + i * 28, 248, 14, 3, '#e7d49f'); rect(c, 119 + i * 28, 248, 14, 3, '#8b9d72'); }
  drawPropShadows(c, 'court');
  pennants(c, 98, 15, 284);
  label(c, 'PUROK 01', 40, 205, '#e5dfb4', 7);
}

export { HUB_OBSTACLES } from './hub-obstacles';

export function createArt(scene: Phaser.Scene) {
  for (const [key, painter] of [['hub', drawHub], ['court', drawCourt]] as const) {
    const image = canvas(key === 'hub' ? HUB_SIZE.width / 2 : WIDTH, key === 'hub' ? HUB_SIZE.height / 2 : HEIGHT); painter(image.getContext('2d')!); scene.textures.addCanvas(key, image);
  }
  const treeImage = canvas(64, 56); tree(treeImage.getContext('2d')!, 32, 48, 1, false); scene.textures.addCanvas('world-tree', treeImage);
  const signImage = canvas(68, 40), sign = signImage.getContext('2d')!;
  rect(sign, 31, 13, 5, 27, '#374d3b'); rect(sign, 32, 14, 3, 26, '#8d7453');
  rect(sign, 1, 4, 66, 18, '#294833'); rect(sign, 2, 5, 64, 16, '#5c7960');
  label(sign, 'MALIGAYA', 34, 17, '#fff0c2', 7); scene.textures.addCanvas('world-sign', signImage);
  const palmImage = canvas(80, 60); palm(palmImage.getContext('2d')!, 36, 55, false); scene.textures.addCanvas('world-palm', palmImage);
  const benchImage = canvas(36, 24); bench(benchImage.getContext('2d')!, 3, 11); scene.textures.addCanvas('world-bench', benchImage);
  const vaseImage = canvas(20, 24), vase = vaseImage.getContext('2d')!; pot(vase, 10, 17);
  for (const [x, y] of [[5, 8], [13, 5], [10, 10]]) { rect(vase, x, y, 3, 3, '#edbb88'); rect(vase, x + 1, y + 1, 1, 1, '#9a654c'); }
  scene.textures.addCanvas('world-vase', vaseImage);
  const fenceWidths = new Set(Object.values(WORLD_PROPS).flat().filter(prop => prop.kind === 'fence').map(prop => prop.width ?? 64));
  for (const width of fenceWidths) { const image = canvas(width + 4, 20); fence(image.getContext('2d')!, 2, 3, width); scene.textures.addCanvas(`world-fence-${width}`, image); }
  const tableImage = canvas(64, 48), table = tableImage.getContext('2d')!;
  rect(table, 10, 25, 6, 19, '#65543b'); rect(table, 48, 25, 6, 19, '#65543b');
  rect(table, 4, 3, 56, 31, '#6c543a'); rect(table, 6, 4, 52, 27, '#b58b57');
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) { rect(table, 20 + col * 3, 5 + row * 3, 3, 3, (row + col) % 2 ? '#4b6c54' : '#d3c18d'); if ((row + col) % 2 && (row < 3 || row > 4)) rect(table, 21 + col * 3, 6 + row * 3, 2, 2, row < 3 ? '#7fb0a4' : '#ecc57b'); }
  scene.textures.addCanvas('world-dama-table', tableImage);
  const outfits: { look: CharacterLook; color: number }[] = [
    ...(['boy', 'girl'] as const).flatMap(look => COLORS.map((_, color) => ({ look, color }))),
    ...Object.values(BOT_APPEARANCES),
  ];
  for (const outfit of outfits) {
    const color = [...COLORS, '#c97969'][outfit.color];
    for (let facing = 0; facing < 4; facing++) for (let frame = 0; frame < 4; frame++) {
      const image = canvas(CHARACTER_WIDTH, CHARACTER_HEIGHT), c = image.getContext('2d')!;
      drawCharacter(c, color, outfit.look, facing, frame); outlineSprite(c);
      scene.textures.addCanvas(characterTexture(outfit.look, outfit.color, facing, frame), image);
    }
  }
}

export function createActivityArt(scene: Phaser.Scene) {
  if (!scene.textures.exists('alley')) {
    const image = canvas(WIDTH, HEIGHT), c = image.getContext('2d')!;
    grass(c);
    rect(c, 25, 130, 430, 34, '#cdb994'); rect(c, 163, 35, 28, 235, '#cdb994'); rect(c, 280, 125, 38, 150, '#cdb994');
    rect(c, 25, 225, 430, 48, '#c8b48e');
    house(c, 45, 52, 110, 69, '#dec08c', '#9b6a55', true);
    house(c, 295, 45, 115, 69, '#b8b7a0', '#6d8583');
    // Storage crates and a tricycle exactly match the collision footprints.
    for (const [x, y, w, h] of [[195, 85, 45, 42], [82, 172, 70, 35]] as const) {
      shadow(c, x + w / 2 + 5, y + h, w / 2, 6);
      rect(c, x, y, w, h, '#aa875b'); rect(c, x + 3, y + 3, w - 6, h - 6, '#c19d68');
      for (let xx = x + 8; xx < x + w; xx += 11) rect(c, xx, y + 2, 2, h - 4, '#997a50');
      line(c, [[x + 3, y + 4], [x + w - 4, y + h - 4]], '#846b4a', 3);
    }
    rect(c, 83, 174, 68, 28, '#477f83'); rect(c, 88, 177, 27, 17, '#92b7ab'); rect(c, 83, 173, 68, 4, '#e3d2a5');
    rect(c, 89, 203, 10, 5, '#3d5148'); rect(c, 132, 203, 10, 5, '#3d5148');
    rect(c, 253, 171, 17, 56, '#8a815b');
    for (const [x, y, w, h] of [[37, 230, 85, 40], [345, 172, 73, 45], [180, 32, 65, 30]]) {
      rect(c, x, y + 5, w, h - 5, '#4d7c4c'); rect(c, x + 3, y, w - 6, h - 8, '#648e53');
      for (let dx = 5; dx < w; dx += 12) { rect(c, x + dx, y + 4, 7, 4, '#85a365'); rect(c, x + dx - 2, y + h - 10, 7, 4, '#396c46'); }
    }
    drawPropShadows(c, 'alley');
    for (const object of HIDE_OBJECTS) drawHidingObject(c, object.kind, object.rect.x / 2, object.rect.y / 2, object.rect.width / 2, object.rect.height / 2);
    pennants(c, 160, 64, 135); pennants(c, 290, 125, 140);
    rect(c, 237, 146, 7, 18, '#8c7650'); rect(c, 234, 140, 13, 10, '#e1c485');
    label(c, 'TAGU-TAGUAN', 240, 288, '#3d6047', 10);
    scene.textures.addCanvas('alley', image);
  }
  if (!scene.textures.exists('schoolyard')) {
    const image = canvas(WIDTH, HEIGHT), c = image.getContext('2d')!;
    rect(c, 0, 0, 480, 300, '#bdd0b2');
    rect(c, 0, 45, 480, 102, '#a1ba91');
    house(c, 70, 43, 215, 84, '#d9c799', '#8a6e5d');
    rect(c, 135, 80, 84, 16, '#426e5b'); label(c, 'PAARALAN', 177, 91, '#f3dfae', 9);
    tree(c, 35, 139, 1.6); tree(c, 352, 136, 1.5); palm(c, 420, 141);
    rect(c, 0, 150, 480, 150, '#cbb68d'); rect(c, 0, 182, 480, 6, '#bda77f');
    for (let i = 0; i < 450; i++) rect(c, (i * 67) % 480, 155 + (i * 31) % 145, 2, 1, i % 3 ? '#c1ab82' : '#dac49a');
    drawPropShadows(c, 'schoolyard');
    pennants(c, 50, 24, 365);
    label(c, 'ISA PANG TAAS!', 240, 278, '#66744c', 10);
    scene.textures.addCanvas('schoolyard', image);
  }
}
