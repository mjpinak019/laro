import { NeighborhoodStage } from './neighborhood-stage';
import { judgePikoHop, pikoCenter, pikoInside, pikoLanding, pikoPower, pikoRoute, PIKO_LEVELS, PIKO_SQUARES, type PikoHop } from './piko-rules';
import type { ActivityUI } from './types';

export class PikoGame extends NeighborhoodStage {
  private readonly difficulty = this.ui.profile.difficulty;
  private stage = 1;
  private lives = 3;
  private phase: 'aim' | 'power' | 'throw' | 'hop-ready' | 'hop' | 'jump' | 'feedback' = 'aim';
  private time = 0;
  private aim = pikoCenter(1);
  private marker = { x: 450, y: 510 };
  private route: PikoHop[] = [];
  private hop = 0;
  private from = { x: 450, y: 510 };
  private at = { x: 450, y: 510 };
  private message = 'Wendy: Aim at square 1, then time your toss.';
  constructor(ui: ActivityUI) {
    super(ui, 'piko', 'wendy', `<label for="piko-aim">Aim across court<input id="piko-aim" type="range" min="350" max="550" value="450" /></label><div class="street-meter" id="piko-meter" role="meter" aria-label="Throw or hop timing" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><b></b><i></i></div><button id="piko-action" class="primary-button">Toss pamato</button><button id="piko-two" class="primary-button piko-two-button" hidden>Two feet · D</button><p class="street-help">Tap the target to aim. Space: toss / one foot. D: two feet. Wait for the gold timing zone.</p>`);
    this.get('#piko-action').onclick = () => this.action(); this.get('#piko-two').onclick = () => this.takeHop(2);
    this.get<HTMLInputElement>('#piko-aim').oninput = event => { if (!this.blocked() && this.phase === 'aim') this.aim.x = Number((event.target as HTMLInputElement).value); };
    this.canvas.onpointerdown = event => { if (!this.blocked() && this.phase === 'aim') { this.aim = this.point(event); this.get<HTMLInputElement>('#piko-aim').value = String(this.aim.x); } };
    this.sync();
  }
  action() {
    if (this.blocked()) return;
    if (this.phase === 'aim') { this.phase = 'power'; this.time = 0; this.message = 'Tap again in the gold zone to release the pamato.'; }
    else if (this.phase === 'power') { this.marker = pikoLanding(this.aim, pikoPower(this.time)); this.phase = 'throw'; this.time = 0; }
    else if (this.phase === 'hop-ready') { this.phase = 'hop'; this.time = 0; this.message = 'Time the landing in the gold zone. Choose the correct feet.'; }
    else if (this.phase === 'hop') { this.takeHop(1); return; }
    else if (this.phase === 'feedback') this.resetStage();
    this.sync();
  }
  protected key(event: KeyboardEvent) { if (event.code === 'KeyD') { event.preventDefault(); this.takeHop(2); } }
  private takeHop(feet: 1 | 2) {
    if (this.blocked() || this.phase !== 'hop') return;
    const result = judgePikoHop(this.time, feet, this.route[this.hop], this.difficulty);
    if (result !== 'clear') { this.fail(result === 'feet' ? `Use ${this.route[this.hop].feet === 1 ? 'one foot' : 'two feet'} on this landing.` : `You hopped too ${result}. Aim for the gold zone.`); return; }
    this.from = this.at; const squares = this.route[this.hop].squares, points = squares.map(pikoCenter);
    this.at = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points[0].y };
    this.phase = 'jump'; this.time = 0; this.ui.sound('turn'); this.sync();
  }
  private fail(reason: string) {
    this.lives--; this.ui.failure?.('hit'); this.message = reason; this.phase = 'feedback'; this.time = 0; this.sync();
    if (!this.lives) this.finish();
  }
  private resetStage() {
    this.aim = pikoCenter(this.stage); this.at = { x: 450, y: 510 }; this.from = this.at;
    this.phase = 'aim'; this.time = 0; this.marker = { x: 450, y: 510 };
    this.message = `Wendy: Toss into square ${this.stage}, then hop out and back. Skip the pamato!`;
    this.get<HTMLInputElement>('#piko-aim').value = String(this.aim.x); this.sync();
  }
  private finish() {
    if (this.finished) return; this.finished = true; this.sync();
    const won = this.stage > 8;
    this.ui.result({ game: 'piko', won, title: won ? 'A perfect trip through the chalk!' : 'Wendy says: one more try!', summary: `${Math.min(8, this.stage - 1)}/8 pamato courses completed. ${this.message}`, coins: won ? { easy: 60, normal: 80, hard: 100 }[this.difficulty] : 10, record: Math.min(8, this.stage - 1) });
  }
  protected update(dt: number) {
    this.time += dt;
    if (this.phase === 'throw' && this.time >= .65) {
      if (!pikoInside(this.stage, this.marker, this.difficulty)) { this.fail('Pamato outside the square. Adjust your aim or throw power.'); return; }
      this.route = pikoRoute(this.stage, this.difficulty); this.hop = 0; this.phase = 'hop-ready'; this.time = 0;
      this.message = this.difficulty === 'hard' && this.stage >= 5 ? 'Good toss! Two out-and-back laps on this Hard course. Start when ready.' : 'Good toss! Start hopping when ready. Gold means land.'; this.sync();
    } else if (this.phase === 'hop' && this.time > PIKO_LEVELS[this.difficulty].period) this.fail('The landing window passed. Hop a little sooner.');
    else if (this.phase === 'jump' && this.time >= .38) {
      this.hop++;
      if (this.hop >= this.route.length) {
        this.stage++; if (this.stage > 8) { this.finish(); return; }
        this.phase = 'feedback'; this.message = `Course cleared! Retrieve your pamato and try square ${this.stage}.`; this.sync();
      } else { this.phase = 'hop'; this.time = 0; this.sync(); }
    }
    const value = this.phase === 'power' ? pikoPower(this.time) : this.phase === 'hop' ? Math.min(1, this.time / PIKO_LEVELS[this.difficulty].period) : 0;
    this.get('#piko-meter i').style.width = `${value * 100}%`; this.get('#piko-meter').setAttribute('aria-valuenow', String(Math.round(value * 100)));
    this.root.dataset.time = this.time.toFixed(3);
  }
  private sync() {
    const level = PIKO_LEVELS[this.difficulty], feet = this.route[this.hop]?.feet;
    this.root.dataset.phase = this.phase; this.root.dataset.course = String(this.stage); this.root.dataset.hop = String(this.hop); this.root.dataset.lives = String(this.lives);
    this.get('#street-score').textContent = `Course ${Math.min(8, this.stage)}/8 · ${this.lives} chances`;
    this.get('#street-role').textContent = this.phase === 'hop' || this.phase === 'hop-ready' || this.phase === 'jump' ? `${this.route[this.hop]?.returning ? 'RETURN' : 'OUTBOUND'} · ${feet === 2 ? 'TWO FEET' : 'ONE FOOT'} · hop ${this.hop + 1}/${this.route.length}` : 'AIM THE PAMATO';
    this.get('#street-status').textContent = this.message;
    this.get<HTMLButtonElement>('#piko-action').disabled = ['throw', 'jump'].includes(this.phase);
    this.get('#piko-action').textContent = this.phase === 'power' ? 'Release pamato' : this.phase === 'hop-ready' ? 'Start hopping' : this.phase === 'hop' ? 'One foot · Space' : this.phase === 'feedback' ? 'Continue' : 'Toss pamato';
    this.get('#piko-two').hidden = this.phase !== 'hop';
    this.get<HTMLInputElement>('#piko-aim').disabled = this.phase !== 'aim';
    const half = this.phase === 'hop' ? level.window / level.period : .08;
    this.get('#piko-meter b').style.left = `${(.65 - half) * 100}%`; this.get('#piko-meter b').style.width = `${half * 200}%`;
    this.ui.hint(this.message);
    const game = document.querySelector<HTMLElement>('#game')!; game.dataset.mode = 'piko'; game.dataset.phase = this.finished ? 'finished' : 'playing';
  }
  protected draw() {
    this.ground(); const c = this.c, level = PIKO_LEVELS[this.difficulty];
    const next = ['hop', 'hop-ready', 'jump'].includes(this.phase) ? this.route[this.hop] : undefined;
    for (const square of PIKO_SQUARES) {
      c.fillStyle = next?.squares.includes(square.number) ? '#e3ca8a' : '#c4af87'; c.fillRect(square.x, square.y, square.width, square.height);
      c.strokeStyle = '#fff0c9'; c.lineWidth = 3; c.strokeRect(square.x, square.y, square.width, square.height);
      this.text(String(square.number), square.x + square.width / 2, square.y + 35, 23);
    }
    this.text('TURN', 450, 75, 16); this.text('PIKO', 170, 150, 32); this.text('WENDY', 205, 285, 17);
    this.kid(205, 260, true); this.text(this.stage <= 8 ? `PAMATO: ${this.stage}` : 'CLEARED!', 700, 160, 20);
    if (this.phase === 'aim' || this.phase === 'power') {
      if (level.guide) { c.setLineDash([6, 6]); c.strokeStyle = '#596b47'; c.beginPath(); c.moveTo(450, 505); c.lineTo(this.aim.x, this.aim.y); c.stroke(); c.setLineDash([]); }
      c.strokeStyle = '#9d5d3f'; c.lineWidth = 2; c.strokeRect(this.aim.x - 9, this.aim.y - 9, 18, 18);
    }
    const t = this.phase === 'throw' ? Math.min(1, this.time / .65) : 1;
    const mx = this.phase === 'throw' ? 450 + (this.marker.x - 450) * t : this.marker.x;
    const my = this.phase === 'throw' ? 510 + (this.marker.y - 510) * t - Math.sin(t * Math.PI) * 85 : this.marker.y;
    c.fillStyle = '#976f69'; c.fillRect(mx - 7, my - 5, 14, 10); c.fillStyle = '#e2bfa3'; c.fillRect(mx - 4, my - 4, 6, 2);
    const jump = this.phase === 'jump' ? Math.min(1, this.time / .38) : 1;
    this.kid(this.from.x + (this.at.x - this.from.x) * jump, this.from.y + (this.at.y - this.from.y) * jump, false, this.phase === 'jump' ? Math.sin(jump * Math.PI) * 40 : 0);
    if (next) this.text(`${next.feet === 1 ? 'ONE FOOT' : 'TWO FEET'} ${next.returning ? '- BACK' : ''}`, 690, 320, 20);
  }
}
