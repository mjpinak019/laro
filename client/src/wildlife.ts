import type Phaser from 'phaser';
import { move, overlaps, type Point } from './rules';
import { HUB_OBSTACLES } from './hub-obstacles';
import { HUB_SIZE } from './hub';

type Animal = { kind: 'dog' | 'cat'; x: number; y: number; goal: Point; timer: number; rest: boolean; chase?: Animal; sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse };
/** Ambient animals use the same solid geometry as walkers and never obstruct a game. */
export class BarangayAnimals {
  private animals: Animal[];
  constructor(private scene: Phaser.Scene) {
    for (const kind of ['dog', 'cat'] as const) for (let frame = 0; frame < 4; frame++) {
      const key = `animal-${kind}-${frame}`;
      if (scene.textures.exists(key)) continue;
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 25;
      const c = canvas.getContext('2d')!, cat = kind === 'cat', coat = cat ? '#c28b56' : '#e0c29b';
      const box = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = '#293c32'; c.fillRect(x - 1, y - 1, w + 2, h + 2); c.fillStyle = color; c.fillRect(x, y, w, h); };
      box(7, 12, 17, 8, coat); box(21, 7, 8, 10, coat);
      box(8, 19, 3, 3 + frame % 2, coat); box(20, 19, 3, 4 - frame % 2, coat);
      if (cat) { box(21, 3, 2, 5, coat); box(27, 3, 2, 5, coat); box(3, 7, 3, 10, coat); box(5, 14, 4, 3, coat); }
      else { box(20, 8, 3, 8, '#735541'); box(28, 13, 3, 3, coat); box(3, 9 + frame % 2, 3, 7, coat); }
      c.fillStyle = '#26372e'; c.fillRect(26, 10, 1, 2); c.fillRect(29, 14, 2, 2);
      c.fillStyle = '#fff0ce'; c.fillRect(12, 13, 6, 4);
      scene.textures.addCanvas(key, canvas);
    }
    this.animals = [
      { kind: 'dog' as const, x: 510, y: 570 }, { kind: 'cat' as const, x: 605, y: 575 },
      { kind: 'dog' as const, x: 950, y: 360 }, { kind: 'cat' as const, x: 1120, y: 550 },
    ].map(a => ({ ...a, goal: { x: a.x, y: a.y }, timer: .5 + Math.random() * 3, rest: true,
      sprite: scene.add.image(a.x, a.y, `animal-${a.kind}-0`).setScale(1.6).setOrigin(.5, 1),
      shadow: scene.add.ellipse(a.x, a.y, 38, 9, 0x294e38, .2),
    }));
  }
  setVisible(visible: boolean) { this.animals.forEach(a => { a.sprite.setVisible(visible); a.shadow.setVisible(visible); }); }
  update(dt: number, time: number) {
    for (const a of this.animals) {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.timer = 2 + Math.random() * 4; a.chase = undefined; a.rest = Math.random() < .28;
        const other = this.animals.filter(b => b.kind !== a.kind && Math.hypot(b.x - a.x, b.y - a.y) < 250);
        if (!a.rest && other.length && Math.random() < .4) a.chase = other[Math.floor(Math.random() * other.length)];
        for (let n = 0; n < 16; n++) {
          const goal = { x: Math.max(35, Math.min(HUB_SIZE.width - 35, a.x + (Math.random() - .5) * 350)), y: Math.max(60, Math.min(HUB_SIZE.height - 35, a.y + (Math.random() - .5) * 280)) };
          if (!HUB_OBSTACLES.some(r => overlaps(goal, r, 12))) { a.goal = goal; break; }
        }
      }
      const goal = a.chase ?? a.goal, dx = goal.x - a.x, dy = goal.y - a.y;
      const flee = this.animals.find(b => b.chase === a && Math.hypot(b.x - a.x, b.y - a.y) < 150);
      const direction = flee ? { x: a.x - flee.x, y: a.y - flee.y } : { x: dx, y: dy };
      const moving = !!flee || !a.rest && Math.hypot(dx, dy) > (a.chase ? 34 : 5);
      if (moving) {
        const next = move(a, direction, flee || a.chase ? 112 : 46, dt, HUB_OBSTACLES, { x: 30, y: 55, width: HUB_SIZE.width - 60, height: HUB_SIZE.height - 85 });
        if (Math.hypot(next.x - a.x, next.y - a.y) < .05) { a.timer = 0; a.chase = undefined; }
        a.x = next.x; a.y = next.y;
        if (direction.x) a.sprite.setFlipX(direction.x < 0);
      }
      a.sprite.setPosition(Math.round(a.x), Math.round(a.y)).setDepth(a.y).setTexture(`animal-${a.kind}-${moving ? Math.floor(time / 110) % 4 : 0}`);
      a.shadow.setPosition(a.x, a.y).setDepth(a.y - 1);
    }
    const game = document.querySelector<HTMLElement>('#game');
    if (game) game.dataset.animals = JSON.stringify(this.animals.map(a => ({ kind: a.kind, x: Math.round(a.x), y: Math.round(a.y), chasing: !!a.chase, resting: a.rest })));
  }
}
