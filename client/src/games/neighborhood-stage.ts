import { paintCharacterPreview } from '../character-art';
import { BOT_APPEARANCES, CHARACTERS, type CharacterId } from '../characters';
import { COLORS } from '../store';
import type { ActivityControls, ActivityUI } from './types';

/** Shared local canvas, avatar art, pause clock, and keyboard lifecycle. */
export abstract class NeighborhoodStage implements ActivityControls {
  protected root = document.createElement('div');
  protected canvas: HTMLCanvasElement;
  protected c: CanvasRenderingContext2D;
  protected paused = false;
  protected disposed = false;
  protected finished = false;
  private frame = 0;
  private lastTime = 0;
  private player = document.createElement('canvas');
  private neighbor = document.createElement('canvas');
  constructor(protected ui: ActivityUI, id: 'piko' | 'tumbang', neighbor: CharacterId, controls: string) {
    this.root.id = `${id}-stage`; this.root.className = 'neighborhood-stage';
    this.root.innerHTML = `<div class="neighborhood-score"><span class="eyebrow">${id === 'piko' ? 'PIKO WITH' : 'TUMBANG PRESO WITH'} ${CHARACTERS[neighbor].toUpperCase()}</span><strong id="street-score"></strong><span id="street-role"></span><p id="street-status" role="status" aria-live="polite"></p></div><div class="neighborhood-court"><canvas width="900" height="560" tabindex="0" role="img" aria-label="${id === 'piko' ? 'Piko chalk court. Aim the pamato by tapping a square.' : 'Tumbang Preso clearing. Tap to aim, or choose a destination while retrieving or guarding.'}"></canvas></div><div class="neighborhood-controls">${controls}</div>`;
    document.querySelector('#game-shell')!.append(this.root);
    this.canvas = this.get<HTMLCanvasElement>('canvas'); this.c = this.canvas.getContext('2d')!; this.c.imageSmoothingEnabled = false;
    this.updateAvatar(); const look = BOT_APPEARANCES[neighbor]; paintCharacterPreview(this.neighbor, look.look, COLORS[look.color]);
    ui.location(id); window.addEventListener('keydown', this.keyboard);
    this.frame = requestAnimationFrame(this.tick);
  }
  protected get<T extends HTMLElement = HTMLElement>(selector: string) { return this.root.querySelector<T>(selector)!; }
  protected blocked() { return this.disposed || this.finished || this.paused || this.ui.blocked(); }
  protected point(event: PointerEvent) {
    const box = this.canvas.getBoundingClientRect(), width = Math.min(box.width, box.height * 900 / 560), height = width * 560 / 900;
    return { x: (event.clientX - box.left - (box.width - width) / 2) / width * 900, y: (event.clientY - box.top - (box.height - height) / 2) / height * 560 };
  }
  protected text(text: string, x: number, y: number, size = 18, color = '#405a41') { this.c.fillStyle = color; this.c.font = `bold ${size}px monospace`; this.c.textAlign = 'center'; this.c.fillText(text, x, y); }
  protected kid(x: number, y: number, neighbor = false, lift = 0) {
    const c = this.c; c.fillStyle = '#2c503b33'; c.beginPath(); c.ellipse(x, y + 3, 17, 6, 0, 0, Math.PI * 2); c.fill();
    const picture = neighbor ? this.neighbor : this.player;
    c.drawImage(picture, Math.round(x - picture.width), Math.round(y - picture.height * 2 - lift), picture.width * 2, picture.height * 2);
  }
  protected ground() {
    const c = this.c; c.fillStyle = '#7e9970'; c.fillRect(0, 0, 900, 560);
    c.fillStyle = '#cbb891'; c.fillRect(40, 50, 820, 470);
    c.fillStyle = '#d8c7a0'; for (let i = 0; i < 70; i++) c.fillRect(60 + i * 113 % 780, 70 + i * 67 % 430, 5, 2);
    c.fillStyle = '#4b7150'; for (const x of [22, 850]) { c.fillRect(x, 42, 20, 478); for (let y = 45; y < 520; y += 24) c.fillRect(x - 6, y, 30, 12); }
    c.fillStyle = '#927451'; c.fillRect(70, 62, 140, 8); c.fillRect(80, 70, 8, 20); c.fillRect(190, 70, 8, 20);
  }
  private keyboard = (event: KeyboardEvent) => {
    if (this.blocked() || /INPUT|SELECT|TEXTAREA/.test((event.target as HTMLElement)?.tagName)) return;
    if (event.code === 'Escape') { event.preventDefault(); document.querySelector<HTMLButtonElement>('#pause-button')?.click(); return; }
    if (event.repeat) return;
    if (event.code === 'Space') { event.preventDefault(); this.action(); }
    else this.key(event);
  };
  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = this.lastTime ? Math.min(.04, (now - this.lastTime) / 1000) : 0; this.lastTime = now;
    if (!this.blocked()) this.update(dt);
    this.draw(); this.frame = requestAnimationFrame(this.tick);
  };
  protected abstract update(dt: number): void;
  protected abstract draw(): void;
  protected key(_event: KeyboardEvent) {}
  abstract action(): void;
  setTouch() {} setSprint() {} resetInput() {}
  setPaused(value: boolean) { this.paused = value; this.resetInput(); }
  updateAvatar() { paintCharacterPreview(this.player, this.ui.profile.gender, COLORS[this.ui.profile.color], 0, 0, this.ui.profile.wardrobe.equipped); }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); window.removeEventListener('keydown', this.keyboard); this.root.remove(); }
}
