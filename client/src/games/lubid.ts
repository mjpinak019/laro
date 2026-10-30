import Phaser from 'phaser';
import { ActivityScene } from './base-scene';
import type { ActivityUI } from './types';
import { initialLubid, jumpLubid, LUBID, lubidJumpHeight, lubidCoins, finishLubid, tickLubid } from './lubid-rules';
import { characterTexture, CHARACTERS } from '../characters';
import { CHARACTER_ORIGIN } from '../sprite-outline';

export class LubidScene extends ActivityScene {
  private run;
  private rope!: Phaser.GameObjects.Graphics;
  private guide!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private feedback = '';
  private feedbackUntil = 0;
  private pointerJump = () => this.action();
  constructor(ui: ActivityUI) { super('lubid', ui); this.run = initialLubid(ui.profile.difficulty); }
  create() {
    this.cameras.main.setBackgroundColor('#839b6e');
    const g = this.add.graphics(); g.fillStyle(0xc8b48c); g.fillRect(100, 160, 760, 370); g.lineStyle(3, 0xf2e1ba); g.strokeRect(150, 200, 660, 300);
    for (let n = 0; n < 180; n++) { g.fillStyle(n % 2 ? 0xd5c49b : 0xbba47e); g.fillRect(112 + n * 67 % 735, 180 + n * 97 % 335, 2, 2); }
    this.add.text(480, 105, 'LUKSONG LUBID', { fontFamily: 'monospace', fontSize: '29px', color: '#f5e3b9', backgroundColor: '#35583d', padding: { x: 20, y: 12 } }).setOrigin(.5);
    for (const [x, look, color, name] of [[250, 'weng-new', 2, CHARACTERS.weng], [710, 'ferdie', 3, CHARACTERS.ferdie]] as const) {
      this.add.ellipse(x, 438, 30, 10, 0x294e38, .25);
      this.add.image(x, 435, characterTexture(look, color, x < 480 ? 2 : 1)).setScale(2).setOrigin(CHARACTER_ORIGIN.x, CHARACTER_ORIGIN.y).setDepth(435);
      this.add.text(x, 360, name, { fontFamily: 'monospace', fontSize: '16px', color: '#f3e5be', backgroundColor: '#34583e', padding: { x: 7, y: 4 } }).setOrigin(.5);
    }
    this.rope = this.add.graphics(); this.playerSetup(480, 435); this.inputSetup();
    this.guide = this.add.text(480, 190, 'GET READY', { fontFamily: 'monospace', fontSize: '26px', color: '#f8edce', backgroundColor: '#365b3e', padding: { x: 16, y: 9 } }).setOrigin(.5).setDepth(1000);
    this.info = this.add.text(480, 543, 'Tap the court, Jump, or Space. One tap = one jump.', { fontFamily: 'monospace', fontSize: '18px', color: '#314d36' }).setOrigin(.5);
    this.keys.SPACE.on('down', () => this.action()); this.input.on('pointerdown', this.pointerJump);
    this.ui.location('lubid'); this.ui.hint('Tap the court, Jump, or Space. React before the rope reaches your feet. Holding does not auto-jump.');
    this.status();
  }
  action() {
    if (this.blocked()) return;
    if (jumpLubid(this.run)) { this.ui.sound('step'); this.snapshotRun(); }
  }
  private snapshotRun() {
    this.snapshot('lubid', this.run.phase === 'ready' ? 'ready' : this.finished ? 'finished' : 'playing');
    const el = document.querySelector<HTMLElement>('#game')!;
    el.dataset.cleared = String(this.run.cleared); el.dataset.ropeIn = (this.run.nextPass - this.run.time).toFixed(3); el.dataset.jumpAt = String(this.run.jumpAt); el.dataset.jumps = String(this.run.jumps); el.dataset.jumpHeight = lubidJumpHeight(this.run).toFixed(2);
    el.dataset.ropePeriod = (1 / this.run.rate).toFixed(3); el.dataset.ropeRate = this.run.rate.toFixed(5);
    el.dataset.pendingCoins = String(lubidCoins(this.run.cleared));
  }
  private status() {
    this.ui.hud({ left: '♥ '.repeat(this.run.lives), objective: `${this.run.cleared} JUMPS · BEST ${Math.max(this.run.cleared, this.ui.profile.records.lubid.best)}`, right: `${(60 * this.run.rate).toFixed(0)} RPM`, countdown: this.run.phase === 'ready' ? this.run.ready : undefined });
    const finish = document.querySelector<HTMLButtonElement>('#finish-lubid');
    if (finish) { finish.disabled = this.run.phase !== 'playing'; finish.textContent = `Finish · ${lubidCoins(this.run.cleared)}/${LUBID.coinCap} coins`; }
  }
  finishRun() { if (!this.blocked() && finishLubid(this.run)) this.finish(); }
  private finish() {
    if (this.finished) return;
    this.finished = true; this.snapshotRun(); const won = this.run.cleared >= LUBID.milestone;
    this.ui.sound(won ? 'win' : this.run.lives === 0 ? 'tag' : 'emote');
    this.ui.result({ game: 'lubid', won, failure: this.run.lives === 0, title: `${this.run.cleared} jumps. A run to remember.`, summary: `Best: ${this.ui.profile.records.lubid.best} jumps. Endless play has no final jump. Earn 1 coin per 2 clearances, capped at ${LUBID.coinCap} coins per run.`, coins: lubidCoins(this.run.cleared), record: this.run.cleared });
  }
  update(time: number, milliseconds: number) {
    if (this.checkPause()) return;
    const result = tickLubid(this.run, milliseconds / 1000);
    if (result) {
      this.feedback = result === 'clear' ? this.run.cleared === LUBID.milestone ? '100! KEEP GOING!' : 'NICE JUMP!' : 'ROPE HIT · TRY AGAIN';
      this.feedbackUntil = this.run.time + .65; this.ui.sound(result === 'clear' ? 'turn' : 'tag');
      if (result === 'clear') this.ui.progress?.('lubid', this.run.cleared); else this.ui.failure?.('hit');
    }
    const until = this.run.nextPass - this.run.time;
    const angle = Math.PI + this.run.rotation * Math.PI * 2, middleY = 340 - 95 * Math.cos(angle);
    this.rope.clear().lineStyle(5, 0x705538); this.rope.setDepth(middleY > 404 ? 436 : 430);
    for (let index = 0; index < 48; index++) {
      const a = index / 48, b = (index + 1) / 48;
      const y = (t: number) => 415 + 4 * t * (1 - t) * (middleY - 415);
      this.rope.lineBetween(263 + a * 434, y(a), 263 + b * 434, y(b));
    }
    this.drawPlayer({ x: 480, y: 435 }, time, false, { x: 0, y: 0 }, lubidJumpHeight(this.run));
    this.guide.setText(this.run.phase === 'ready' ? 'GET READY' : this.run.time < this.feedbackUntil ? this.feedback : until < .26 ? 'JUMP!' : 'WATCH THE ROPE');
    this.guide.setColor(until < .26 ? '#f4d080' : '#f8edce');
    this.info.setText(`${Math.round(60 * this.run.rate)} RPM · ${this.run.cleared >= LUBID.variationAt ? 'CHANGING RHYTHM' : this.run.difficulty.toUpperCase()} · ENDLESS`);
    this.status(); this.snapshotRun();
    if (this.run.phase === 'finished') this.finish();
  }
}
