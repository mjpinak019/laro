import Phaser from 'phaser';
import { createActivityArt } from '../art';
import { ActivityScene } from './base-scene';
import { jumpHeight, tinikStage, touchesStage } from './arcade-rules';
import type { Difficulty } from '../rules';
import type { ActivityUI } from './types';
import { TINIK_SPRITE } from '../tinik-sprite-art';
import { addWorldProps } from '../world-props';
const PNGS = import.meta.glob<string>('../assets/tinik/*/*.png', { eager: true, query: '?url&no-inline', import: 'default' });

export class TinikScene extends ActivityScene {
  private x = 165;
  private level = 1;
  private cleared = 0;
  private lives = 3;
  private stage: 'ready' | 'run' | 'air' | 'stumble' | 'celebrate' = 'ready';
  private delay = 2;
  private airborne = 0;
  private jumped = false;
  private requestedJump = false;
  private buffered = 0;
  private obstacle!: Phaser.GameObjects.Graphics;
  private seatedPair!: Phaser.GameObjects.Image;
  private message!: Phaser.GameObjects.Text;
  private trail!: Phaser.GameObjects.Graphics;
  private feedback = 'Watch the takeoff zone. Press Jump when you reach it.';
  private lastTakeoff = 0;
  private difficulty: Difficulty;

  constructor(ui: ActivityUI, private practice = false) { super('tinik', ui); this.difficulty = ui.profile.difficulty; }
  preload() {
    for (let level = 1; level <= 6; level++) {
      const key = this.spriteKey(level);
      if (!this.textures.exists(key)) this.load.image(key, PNGS['../assets/tinik/' + this.difficulty + '/height-' + level + '.png']);
    }
  }
  private spriteKey(level = this.level) { return 'tinik-pair-' + this.difficulty + '-' + level; }
  create() {
    createActivityArt(this); this.add.image(480, 300, 'schoolyard').setScale(2); addWorldProps(this, 'schoolyard');
    this.seatedPair = this.add.image(520, 450, this.spriteKey()).setOrigin(.5, TINIK_SPRITE.ground / TINIK_SPRITE.height).setScale(TINIK_SPRITE.scale).setDepth(448);
    this.obstacle = this.add.graphics().setDepth(447); this.trail = this.add.graphics().setDepth(449);
    this.playerSetup(this.x, 450); this.inputSetup(); this.facing = 2;
    this.keys.SPACE.on('down', () => this.action());
    this.message = this.add.text(480, 110, 'Ready for your first jump?', { fontFamily: 'monospace', fontSize: '21px', color: '#fcf0cd', backgroundColor: '#37513e', padding: { x: 16, y: 10 } }).setOrigin(.5);
    this.ui.location('tinik'); this.paintObstacle(); this.refresh();
  }

  private paintObstacle() {
    const config = tinikStage(this.level, this.difficulty), center = config.obstacleX;
    const g = this.obstacle; g.clear();
    this.seatedPair.setPosition(center, 450).setTexture(this.spriteKey());
    g.fillStyle(0x294d38, .15).fillEllipse(center - 74, 452, 58, 10).fillEllipse(center + 74, 452, 58, 10);
    const game = document.querySelector<HTMLElement>('#game')!;
    game.dataset.tinikHands = String(Math.min(4, this.level)); game.dataset.tinikFeet = String(Math.max(0, this.level - 4)); game.dataset.tinikArt = 'pixel-png';
    // Small guide rails show the hand collision boundary and a generous takeoff zone.
    const showGuide = this.practice || this.difficulty !== 'hard' || this.level <= 2;
    const guideCenter = (config.takeoffMin + config.takeoffMax) / 2;
    g.fillStyle(0xa5b779, .65).fillRect(showGuide ? config.takeoffMin : guideCenter - 3, 453, showGuide ? config.takeoffMax - config.takeoffMin : 6, 9);
    g.lineStyle(2, 0xf5e7bf, .7).lineBetween(170, 463, 750, 463);
    for (let xx = 180; xx < 740; xx += 25) g.fillStyle(0xf5e7bf, .55).fillRect(xx, 462, 9, 2);
  }

  action() { if (!this.blocked()) this.requestedJump = true; }
  setSprint(value: boolean) { if (value) this.action(); }
  resetInput = () => { this.touch = { x: 0, y: 0 }; this.sprintHeld = false; this.requestedJump = false; this.buffered = 0; this.keys && Object.values(this.keys).forEach(key => key.reset()); };

  private refresh() {
    this.ui.hud({ left: this.practice ? 'PRACTICE ∞' : '♥ '.repeat(this.lives) + '♡ '.repeat(3 - this.lives), objective: `HEIGHT ${this.level} / 6`, right: this.difficulty.toUpperCase() });
    this.ui.hint(this.feedback);
    const game = document.querySelector<HTMLElement>('#game')!;
    game.dataset.level = String(this.level); game.dataset.cleared = String(this.cleared); game.dataset.jumpState = this.stage;
    this.snapshot('tinik', this.finished ? 'finished' : this.stage === 'ready' ? 'ready' : 'playing', { x: this.x, y: 450 });
    document.querySelector('#stamina-fill')?.setAttribute('style', 'width:100%');
  }

  private fail() {
    if (!this.practice) this.lives--;
    this.stage = 'stumble'; this.delay = 1.5; this.ui.sound('tag'); this.ui.failure?.('hit');
    const config = tinikStage(this.level, this.difficulty);
    this.feedback = this.lastTakeoff && this.lastTakeoff < config.takeoffMin ? 'A little later! You came down before clearing the hands.' : 'A little earlier! Watch the new run-up speed and takeoff marker.';
    this.message.setText('Oops! ' + (this.practice ? 'Try that height again.' : `${this.lives} chance${this.lives === 1 ? '' : 's'} left.`));
    if (!this.practice && this.lives === 0) this.end(false);
  }
  private end(won: boolean) {
    if (this.finished) return;
    this.finished = true; this.refresh(); this.ui.sound(won ? 'win' : 'tag');
    const baseReward = this.difficulty === 'hard' ? 100 : this.difficulty === 'normal' ? 80 : 60;
    this.ui.result({ game: 'tinik', won, practice: this.practice, coins: this.practice ? 0 : won ? baseReward + this.lives * 10 : 10 + this.cleared * 5, record: this.cleared,
      title: won ? 'Ang taas ng talon mo!' : 'One more brave jump?',
      summary: `${this.cleared} of 6 heights cleared on ${this.difficulty}. ${this.practice ? 'Practice uses unlimited retries and awards no coins or records.' : 'Each height has a different takeoff point and run-up speed. Higher difficulties earn more coins.'}` });
  }
  private nextAttempt() {
    this.x = 165; this.stage = 'ready'; this.delay = 1.7; this.airborne = 0; this.jumped = false; this.requestedJump = false; this.lastTakeoff = 0;
    this.message.setText(`Height ${this.level} · get ready!`); this.paintObstacle(); this.trail.clear();
    this.feedback = `New height, new timing. ${this.difficulty === 'hard' && this.level > 2 ? 'Watch the small takeoff notch.' : 'Press Space / Jump in the green zone.'}`;
  }

  update(time: number, milliseconds: number) {
    if (!this.player || this.checkPause()) return;
    const dt = Math.min(milliseconds / 1000, .04);
    const config = tinikStage(this.level, this.difficulty);
    if (this.requestedJump) { this.buffered = .12; this.requestedJump = false; }
    else this.buffered = Math.max(0, this.buffered - dt);
    let z = 0;
    if (this.stage === 'ready') {
      this.delay -= dt;
      this.message.setText(`Height ${this.level} · ${Math.max(1, Math.ceil(this.delay))}`);
      if (this.delay <= 0) { this.stage = 'run'; this.message.setText('Find your moment.'); }
    } else if (this.stage === 'run' || this.stage === 'air') {
      this.x += config.speed * dt;
      if (this.buffered > 0 && !this.jumped) { this.stage = 'air'; this.jumped = true; this.airborne = 0; this.lastTakeoff = this.x; this.buffered = 0; this.ui.sound('emote'); }
      if (this.stage === 'air') { this.airborne += dt; z = jumpHeight(this.airborne); }
      if (touchesStage(this.x, z, config)) this.fail();
      else if (this.stage === 'air' && this.airborne >= 1) {
        if (this.x > config.obstacleX + config.halfWidth + 9) {
          this.stage = 'celebrate'; this.delay = 1.3; this.cleared = this.level; this.ui.sound('turn'); this.message.setText('Cleared! Isa pang taas.');
          if (this.level === 6) this.end(true);
        } else this.fail();
      } else if (this.x > config.obstacleX + 60 && this.stage === 'run') this.fail();
      if (this.stage === 'air') {
        this.trail.clear().lineStyle(2, 0xf2dfac, .5);
        for (let i = 0; i < 8; i++) {
          const t = Math.max(0, this.airborne - i * .035);
          this.trail.fillStyle(0xf2dfac, .35).fillRect(this.lastTakeoff + t * config.speed, 450 - jumpHeight(t), 3, 3);
        }
      }
    } else {
      this.delay -= dt;
      if (this.delay <= 0) { if (this.stage === 'celebrate') this.level++; this.nextAttempt(); }
    }
    this.drawPlayer({ x: this.x, y: 450 }, time, this.stage === 'run' || this.stage === 'air', { x: 1, y: 0 }, z);
    if (this.stage === 'air') this.player.setAngle(-8); else if (this.stage === 'stumble') this.player.setAngle(35); else this.player.setAngle(0);
    if (!this.finished) this.refresh();
  }
}
