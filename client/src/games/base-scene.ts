import Phaser from 'phaser';
import type { Point } from '../rules';
import type { ActivityControls, ActivityUI } from './types';
import { CHARACTER_ORIGIN } from '../sprite-outline';
import { playerTexture } from '../avatar-art';

export abstract class ActivityScene extends Phaser.Scene implements ActivityControls {
  protected keys!: Record<string, Phaser.Input.Keyboard.Key>;
  protected touch: Point = { x: 0, y: 0 };
  protected sprintHeld = false;
  protected manuallyPaused = false;
  protected walkingTarget?: Point;
  protected player!: Phaser.GameObjects.Image;
  protected shadow!: Phaser.GameObjects.Ellipse;
  protected nameTag!: Phaser.GameObjects.Text;
  protected facing = 0;
  protected finished = false;
  constructor(key: string, protected ui: ActivityUI) { super(key); }
  resizeView() { if (!this.cameras?.main) return; const { width, height } = this.game.scale.gameSize; this.cameras.main.setSize(width, height).setZoom(1).removeBounds().setScroll((960 - width) / 2, (600 - height) / 2); }

  protected inputSetup() {
    this.events.once('create', () => this.resizeView());
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,ESC', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.ESC.on('down', () => { if (!this.blocked()) document.querySelector<HTMLButtonElement>('#pause-button')?.click(); });
    window.addEventListener('blur', this.resetInput);
    this.events.once('shutdown', () => window.removeEventListener('blur', this.resetInput));
  }
  protected playerSetup(x: number, y: number) {
    this.shadow = this.add.ellipse(x, y + 2, 28, 10, 0x294e38, .23);
    this.player = this.add.image(x, y, playerTexture()).setScale(2).setOrigin(CHARACTER_ORIGIN.x, CHARACTER_ORIGIN.y);
    this.nameTag = this.add.text(x, y - 65, this.ui.profile.name, { fontFamily: 'monospace', fontSize: '15px', color: '#fff0d1', backgroundColor: '#284b3bdd', padding: { x: 7, y: 4 } }).setOrigin(.5, 1);
  }
  protected drawPlayer(at: Point, time: number, moving: boolean, vector: Point, z = 0) {
    if (moving) this.facing = Math.abs(vector.x) > Math.abs(vector.y) ? vector.x < 0 ? 1 : 2 : vector.y < 0 ? 3 : 0;
    this.player.setPosition(Math.round(at.x), Math.round(at.y - z)).setTexture(playerTexture(this.facing, moving ? Math.floor(time / 115) % 4 : 0)).setDepth(at.y);
    this.shadow.setPosition(at.x, at.y + 3).setDepth(at.y - 1).setScale(Math.max(.5, 1 - z / 250));
    this.nameTag.setPosition(at.x, at.y - z - 64).setDepth(1000);
  }
  protected blocked(): boolean { return this.manuallyPaused || this.ui.blocked() || this.finished; }
  protected checkPause(): boolean {
    if (this.blocked()) return true;
    return this.blocked();
  }
  protected vector(): Point {
    let vector = { x: Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown) + this.touch.x, y: Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown) + this.touch.y };
    if (vector.x || vector.y) this.walkingTarget = undefined;
    if (this.walkingTarget) {
      vector = { x: this.walkingTarget.x - this.player.x, y: this.walkingTarget.y - this.player.y };
      if (Math.hypot(vector.x, vector.y) < 6) { this.walkingTarget = undefined; return { x: 0, y: 0 }; }
    }
    return vector;
  }
  protected snapshot(mode: string, phase: string, point?: Point) {
    const element = document.querySelector<HTMLElement>('#game')!;
    element.dataset.mode = mode; element.dataset.phase = phase;
    if (point) { element.dataset.x = point.x.toFixed(1); element.dataset.y = point.y.toFixed(1); }
  }
  setTouch(x: number, y: number) { this.touch = { x, y }; this.walkingTarget = undefined; }
  setSprint(value: boolean) { this.sprintHeld = value; }
  setPaused(value: boolean) { this.manuallyPaused = value; this.resetInput(); }
  resetInput = () => { this.touch = { x: 0, y: 0 }; this.sprintHeld = false; this.walkingTarget = undefined; this.keys && Object.values(this.keys).forEach(key => key.reset()); };
  updateAvatar() { this.nameTag?.setText(this.ui.profile.name); }
  abstract action(): void;
}
