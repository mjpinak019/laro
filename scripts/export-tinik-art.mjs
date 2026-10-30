import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await mkdir('artifacts', { recursive: true });
const bundle = await build({ stdin: { contents: `export { paintTinikSprite, TINIK_SPRITE } from './client/src/tinik-sprite-art'; export { tinikStage } from './client/src/games/arcade-rules';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'iife', globalName: 'TinikArt', write: false });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage(); await page.setContent('<body></body>'); await page.addScriptTag({ content: bundle.outputFiles[0].text });
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const folder = resolve('client/src/assets/tinik', difficulty); await mkdir(folder, { recursive: true });
    for (let level = 1; level <= 6; level++) {
      const data = await page.evaluate(({ difficulty, level }) => {
        const c = document.createElement('canvas'), height = window.TinikArt.tinikStage(level, difficulty).height;
        window.TinikArt.paintTinikSprite(c, level, height);
        const pixels = c.getContext('2d').getImageData(0,0,c.width,c.height).data, colors = new Set(); let top = c.height;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const at = (y * c.width + x) * 4, alpha = pixels[at + 3];
          if (alpha !== 0 && alpha !== 255) throw new Error('Sprite has a smoothed edge');
          if (!alpha) continue;
          colors.add(pixels[at] + ',' + pixels[at + 1] + ',' + pixels[at + 2]);
          if (x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1) throw new Error('Clipped sprite');
          if (Math.abs(x - window.TinikArt.TINIK_SPRITE.center) <= 3) top = Math.min(top,y);
        }
        if (colors.size > 5) throw new Error('Too many sprite colors');
        if (Math.abs((window.TinikArt.TINIK_SPRITE.ground - top) * 2 - height - 2) > 2) throw new Error('Obstacle top does not match collision height');
        return c.toDataURL().split(',')[1];
      }, { difficulty, level });
      await writeFile(resolve(folder, `height-${level}.png`), Buffer.from(data, 'base64'));
    }
  }
  // An enlarged review sheet; the deliverable PNGs stay at their native 160×96 resolution.
  const preview = await page.evaluate(() => {
    const sheet = document.createElement('canvas'); sheet.width = 960; sheet.height = 960;
    const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#cbb68d'; c.fillRect(0,0,960,960);
    for (let level = 1; level <= 6; level++) {
      const sprite = document.createElement('canvas'); window.TinikArt.paintTinikSprite(sprite, level, window.TinikArt.tinikStage(level, 'easy').height);
      const x = (level - 1) % 2 * 480, y = Math.floor((level - 1) / 2) * 320;
      c.drawImage(sprite, x, y + 20, 480, 288); c.fillStyle = '#293c32'; c.font = '16px monospace'; c.fillText('HEIGHT ' + level, x + 18, y + 24);
    }
    return sheet.toDataURL().split(',')[1];
  });
  await writeFile('artifacts/tinik-pixel-heights.png', Buffer.from(preview,'base64'));
  console.log('Exported 18 transparent PNGs: six heights for each difficulty.');
} finally { await browser.close(); }
