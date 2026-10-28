import Phaser from 'phaser';
import { createActivityArt } from '../art';
import { move, type Point } from '../rules';
import { ActivityScene } from './base-scene';
import { ALLEY_WALLS, alleyPath, canSee, inCover, lineBlocked } from './arcade-rules';
import type { ActivityUI } from './types';
import { addWorldProps } from '../world-props';
import { CHARACTER_ORIGIN } from '../sprite-outline';
import type { Difficulty } from '../rules';

const patrol: Point[] = [{ x: 100, y: 300 }, { x: 180, y: 500 }, { x: 400, y: 440 }, { x: 600, y: 480 }, { x: 820, y: 500 }, { x: 880, y: 140 }, { x: 420, y: 100 }, { x: 560, y: 280 }];

export class TaguanScene extends ActivityScene {
  private at: Point = { x: 180, y: 510 };
  private seeker: Point = { x: 480, y: 300 };
  private seekerSprite!: Phaser.GameObjects.Image;
  private seekerName!: Phaser.GameObjects.Text;
  private seekerShadow!: Phaser.GameObjects.Ellipse;
  private vision!: Phaser.GameObjects.Graphics;
  private facingVector: Point = { x: -1, y: 0 };
  private countdown = 10;
  private remaining = 75;
  private crouched = false;
  private energy = 100;
  private awareness = 0;
  private lastSeen?: Point;
  private memory = 0;
  private target: Point = patrol[0];
  private route: Point[] = [];
  private nextPatrol = 0;
  private routeAge = 0;
  private elapsed = 0;
  private botState = 'COUNTING';
  private lastStep = 0;
  private searchCenter?: Point;
  private searchSteps = 0;
  private difficulty: Difficulty;
  private get level() { return this.difficulty; }
  private get sightRange() { return this.level === 'hard' ? 350 : this.level === 'normal' ? 310 : 280; }

  constructor(ui: ActivityUI) { super('taguan', ui); this.difficulty = ui.profile.difficulty; }
  create() {
    createActivityArt(this); this.add.image(480, 300, 'alley').setScale(2);
    addWorldProps(this, 'alley');
    this.vision = this.add.graphics().setDepth(10);
    this.playerSetup(this.at.x, this.at.y); this.inputSetup();
    this.keys.E.on('down', () => this.action());
    this.seekerShadow = this.add.ellipse(this.seeker.x, this.seeker.y + 2, 28, 10, 0x294e38, .22);
    this.seekerSprite = this.add.image(this.seeker.x, this.seeker.y, 'kid-4-1-0').setScale(2).setOrigin(CHARACTER_ORIGIN.x, CHARACTER_ORIGIN.y);
    this.seekerName = this.add.text(this.seeker.x, this.seeker.y - 64, 'Bea · TAYA', { fontFamily: 'monospace', fontSize: '15px', color: '#fff0cf', backgroundColor: '#685044', padding: { x: 7, y: 4 } }).setOrigin(.5, 1).setDepth(1000);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { if (!this.blocked()) this.walkingTarget = { x: pointer.x, y: pointer.y }; });
    this.ui.location('taguan'); this.refresh();
  }
  action() { if (!this.blocked()) { this.crouched = !this.crouched; this.refresh(); } }

  private refresh() {
    const hidden = inCover(this.at) && !canSee(this.seeker, this.at, this.facingVector, this.crouched, this.sightRange);
    const status = this.countdown > 0 ? 'FIND A HIDING PLACE' : this.awareness >= 1 ? 'SPOTTED — BREAK SIGHT!' : this.awareness > .05 ? `SUSPICIOUS · ${Math.round(this.awareness * 100)}%` : hidden ? 'HIDDEN · KEEP QUIET' : this.crouched ? 'CROUCHING · STAY IN COVER' : 'STAY OUT OF SIGHT';
    this.ui.hud({ left: this.crouched ? 'CROUCH' : 'HIDER', objective: status, right: `${Math.floor(Math.ceil(this.remaining) / 60).toString().padStart(2, '0')}:${(Math.ceil(this.remaining) % 60).toString().padStart(2, '0')}` });
    this.ui.hint(this.countdown > 0 ? `Bea is counting: ${Math.ceil(this.countdown)}. Try laundry, bamboo, hedges, or the stacks of crates.` : `${this.level.toUpperCase()} · Bea checks cover and searches more quickly as time passes. Shift sprints; E crouches.`);
    document.querySelector<HTMLButtonElement>('#activity-action')!.textContent = this.crouched ? 'Stand up · E' : 'Crouch · E';
    document.querySelector('#stamina-fill')?.setAttribute('style', `width:${this.energy}%`);
    this.nameTag.setText(hidden ? `${this.ui.profile.name} · Hidden` : this.ui.profile.name);
    this.player.setAlpha(hidden ? .58 : 1);
    const game = document.querySelector<HTMLElement>('#game')!;
    game.dataset.hidden = String(hidden); game.dataset.crouched = String(this.crouched); game.dataset.seeker = this.botState; game.dataset.remaining = this.remaining.toFixed(1);
    this.snapshot('taguan', this.finished ? 'finished' : this.countdown > 0 ? 'ready' : 'playing', this.at);
  }

  private paintVision() {
    this.vision.clear();
    if (this.countdown > 0 || this.level !== 'easy') return;
    const angle = Math.atan2(this.facingVector.y, this.facingVector.x), points = [new Phaser.Math.Vector2(this.seeker.x, this.seeker.y)];
    for (let i = 0; i <= 36; i++) {
      const a = angle - Math.PI * .38 + i / 36 * Math.PI * .76;
      let distance = this.sightRange;
      for (let d = 10; d <= this.sightRange; d += 10) if (lineBlocked(this.seeker, { x: this.seeker.x + Math.cos(a) * d, y: this.seeker.y + Math.sin(a) * d })) { distance = d - 10; break; }
      points.push(new Phaser.Math.Vector2(this.seeker.x + Math.cos(a) * distance, this.seeker.y + Math.sin(a) * distance));
    }
    this.vision.fillStyle(this.awareness >= 1 ? 0xd88f70 : 0xf3dda0, .17).fillPoints(points, true);
  }

  private end(won: boolean) {
    if (this.finished) return;
    this.finished = true; this.refresh(); this.ui.sound(won ? 'win' : 'tag');
    const survived = Math.min(75, Math.round(75 - this.remaining));
    this.ui.result({ game: 'taguan', won, title: won ? 'Hindi ka nahuli!' : 'Huli ka!', coins: won ? this.level === 'hard' ? 100 : this.level === 'normal' ? 80 : 60 : 10, record: survived,
      summary: won ? 'You survived the whole search. Bea will have to look a little harder next time.' : `Bea found you after ${survived} seconds. Try breaking sight around a wall before choosing new cover.` });
  }

  update(time: number, milliseconds: number) {
    if (!this.player || this.checkPause()) return;
    const dt = Math.min(milliseconds / 1000, .04); this.elapsed += dt;
    const input = this.vector(), moving = Math.hypot(input.x, input.y) > 0;
    const running = moving && !this.crouched && (this.keys.SHIFT.isDown || this.sprintHeld) && this.energy > 2;
    this.energy = Phaser.Math.Clamp(this.energy + (running ? -32 : 20) * dt, 0, 100);
    const previous = this.at;
    this.at = move(this.at, input, this.crouched ? 88 : running ? 238 : 160, dt, ALLEY_WALLS, { x: 40, y: 75, width: 875, height: 475 });
    if (this.walkingTarget && Math.hypot(this.at.x - previous.x, this.at.y - previous.y) < .1) this.walkingTarget = undefined;
    this.drawPlayer(this.at, time, moving, input);
    if (running && time - this.lastStep > 300) { this.ui.sound('step'); this.lastStep = time; }
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      if (!this.countdown) { this.botState = 'PATROL'; this.ui.sound('turn'); }
    } else {
      this.remaining = Math.max(0, this.remaining - dt);
      const seen = canSee(this.seeker, this.at, this.facingVector, this.crouched, this.sightRange);
      this.awareness = Phaser.Math.Clamp(this.awareness + (seen ? dt / (this.level === 'hard' ? .28 : this.level === 'normal' ? .45 : .75) : -dt * .65), 0, 1);
      if (seen && this.awareness >= 1) {
        const lead = this.level === 'hard' ? .2 : this.level === 'normal' ? .1 : 0;
        this.lastSeen = { x: this.at.x + (this.at.x - previous.x) / dt * lead, y: this.at.y + (this.at.y - previous.y) / dt * lead };
        this.searchCenter = { ...this.at }; this.searchSteps = 0; this.memory = this.level === 'hard' ? 9 : this.level === 'normal' ? 7 : 5; this.botState = 'CHASE';
      }
      else if (this.memory > 0) { this.memory -= dt; this.botState = 'SEARCH'; }
      else if (running && Math.hypot(this.at.x - this.seeker.x, this.at.y - this.seeker.y) < (this.level === 'hard' ? 340 : this.level === 'normal' ? 290 : 240)) {
        this.lastSeen = { x: Math.round(this.at.x / 80) * 80, y: Math.round(this.at.y / 80) * 80 }; this.searchCenter = { ...this.lastSeen }; this.searchSteps = 0; this.memory = 3; this.botState = 'LISTEN';
      } else { this.lastSeen = undefined; this.botState = 'PATROL'; }
      const desired = this.lastSeen ?? patrol[this.nextPatrol % patrol.length];
      this.routeAge += dt;
      if (Math.hypot(this.target.x - desired.x, this.target.y - desired.y) > 30 || this.routeAge > .65 || !this.route.length) {
        this.target = { ...desired }; this.route = alleyPath(this.seeker, desired); this.routeAge = 0;
      }
      const next = this.route[0];
      if (next) {
        const vector = { x: next.x - this.seeker.x, y: next.y - this.seeker.y };
        if (Math.hypot(vector.x, vector.y) < 7) this.route.shift();
        else {
          this.facingVector = new Phaser.Math.Vector2(vector.x, vector.y).normalize();
          const chasing = this.botState === 'CHASE';
          const pressure = Math.min(18, Math.floor((75 - this.remaining) / 15) * 4);
          const speed = chasing ? this.level === 'hard' ? 218 : this.level === 'normal' ? 190 : 165 : (this.level === 'hard' ? 150 : this.level === 'normal' ? 135 : 118) + pressure;
          this.seeker = move(this.seeker, vector, speed, dt, ALLEY_WALLS, { x: 40, y: 75, width: 875, height: 475 });
        }
      }
      if (Math.hypot(this.seeker.x - desired.x, this.seeker.y - desired.y) < 15 || !this.route.length && !this.lastSeen) {
        if (this.lastSeen) {
          this.memory = Math.max(0, this.memory - dt * 2);
          if (!seen && this.searchCenter && this.searchSteps < 4) {
            const angle = ++this.searchSteps * 2.4;
            this.lastSeen = { x: this.searchCenter.x + Math.cos(angle) * 55, y: this.searchCenter.y + Math.sin(angle) * 55 }; this.routeAge = 1;
          }
        } else this.nextPatrol++;
      }
      if (Math.hypot(this.at.x - this.seeker.x, this.at.y - this.seeker.y) < 25 && !lineBlocked(this.at, this.seeker)) this.end(false);
      else if (this.remaining === 0) this.end(true);
    }
    const facing = Math.abs(this.facingVector.x) > Math.abs(this.facingVector.y) ? this.facingVector.x < 0 ? 1 : 2 : this.facingVector.y < 0 ? 3 : 0;
    this.seekerSprite.setPosition(this.seeker.x, this.seeker.y).setDepth(this.seeker.y).setTexture(`kid-4-${facing}-${this.countdown > 0 ? 0 : Math.floor(time / 130) % 4}`);
    this.seekerShadow.setPosition(this.seeker.x, this.seeker.y + 2).setDepth(this.seeker.y - 1);
    this.seekerName.setPosition(this.seeker.x, this.seeker.y - 64).setText(this.countdown > 0 ? `Bea · ${Math.ceil(this.countdown)}` : `Bea · ${this.botState}`);
    this.paintVision(); if (!this.finished) this.refresh();
  }
}
