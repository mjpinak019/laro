import type { ActivityControls, ActivityUI } from './types';
import { CHARACTERS, type CharacterLook } from '../characters';
import { paintCharacterPreview } from '../character-art';
import { COLORS } from '../store';
import { COURT, chooseJolenShot, initialJolen, jolenFinished, JOLEN_STEP, marblesMoving, nextJolenTurn, powerAt, shooter, shootJolen, stepJolen } from './jolen-rules';
import type { DamaDifficulty } from './dama-levels';

export const JOLEN_OPPONENTS: Record<DamaDifficulty, { name: string; look: CharacterLook; level: number; color: number }> = {
  easy: { name: CHARACTERS.pom, look: 'pom', level: 0, color: 0 },
  normal: { name: CHARACTERS.sheena, look: 'sheena', level: 1, color: 2 },
  hard: { name: CHARACTERS.mj, look: 'mj', level: 2, color: 1 },
  expert: { name: CHARACTERS.ferdie, look: 'ferdie', level: 3, color: 3 },
  master: { name: CHARACTERS.tatayEfren, look: 'tatay-efren', level: 4, color: 1 },
};
type Phase = 'walk' | 'aim' | 'power' | 'rolling' | 'finished';
const marbleColors = ['#83bdb6', '#eac275', '#ce8e88', '#a1b77b', '#a9a2c9'];
export class JolenGame implements ActivityControls {
  private ui: ActivityUI;
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private c: CanvasRenderingContext2D;
  private state = initialJolen();
  private phase: Phase = 'walk';
  private angle = -Math.PI / 2;
  private power = .08;
  private phaseTime = 0;
  private accumulator = 0;
  private settled = 0;
  private lastTime = 0;
  private frame = 0;
  private paused = false;
  private disposed = false;
  private reported = false;
  private botShot?: { angle: number; power: number };
  private opponent;
  private portraits: HTMLCanvasElement[] = [];
  private walkers = [{ x: 330, y: 490 }, { x: 570, y: 75 }];
  private pickups: { x: number; y: number; age: number }[] = [];
  private preview: HTMLCanvasElement;
  private dragPointer?: number;

  constructor(ui: ActivityUI) {
    this.ui = ui; this.opponent = JOLEN_OPPONENTS[ui.profile.jolenDifficulty]; this.state = initialJolen(this.opponent.level);
    this.root = document.createElement('div'); this.root.id = 'jolen-stage'; this.root.className = 'jolen-stage';
    this.root.innerHTML = `<div class="jolen-scoreboard"><strong id="jolen-you"></strong><span id="jolen-turn" role="status" aria-live="polite"></span><strong id="jolen-bot"></strong></div><div class="jolen-court"><canvas id="jolen-canvas" width="900" height="560" tabindex="0" role="img" aria-label="Jolen dirt court. Aim by tapping the court, or use the direction slider below."></canvas><span class="jolen-remaining"></span></div><div class="jolen-controls"><label for="jolen-angle">Aim <input id="jolen-angle" type="range" min="0" max="359" value="270" aria-label="Shot direction in degrees" /></label><div class="jolen-power-group"><span id="jolen-power-label">POWER · TAP TIRA TO START</span><div id="jolen-power" class="jolen-power" role="meter" aria-label="Shot power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="8"><i></i></div></div><button id="jolen-shoot" class="primary-button">Tira</button><button id="jolen-cancel" class="secondary-button" hidden>Cancel</button></div><p class="jolen-instructions">Aim from where your shooter landed. Tira starts the fast meter; tap again to shoot. Space also works.</p>`;
    document.querySelector('#game-shell')!.append(this.root);
    this.canvas = this.get<HTMLCanvasElement>('#jolen-canvas'); this.c = this.canvas.getContext('2d')!; this.c.imageSmoothingEnabled = false;
    this.preview = document.createElement('canvas'); this.preview.width = 900; this.preview.height = 560; this.paintCourt();
    this.updateAvatar(); this.ui.location('jolen'); this.ui.hint('Aim from your shooter. Tira → time the fast power bar → tap again. Most marbles wins.');
    this.get('#jolen-shoot').onclick = () => this.action(); this.get('#jolen-cancel').onclick = () => this.cancelPower();
    this.get<HTMLInputElement>('#jolen-angle').oninput = event => { if (this.canAim()) this.angle = Number((event.target as HTMLInputElement).value) * Math.PI / 180; };
    this.canvas.onpointerdown = event => { if (!this.canAim()) return; this.dragPointer = event.pointerId; this.canvas.setPointerCapture(event.pointerId); this.aimAt(event); };
    this.canvas.onpointermove = event => { if (this.dragPointer === event.pointerId && this.canAim()) this.aimAt(event); };
    this.canvas.onpointerup = this.canvas.onpointercancel = () => { this.dragPointer = undefined; };
    window.addEventListener('keydown', this.keyboard); this.startWalk(); this.frame = requestAnimationFrame(this.tick);
  }
  private get<T extends HTMLElement = HTMLElement>(selector: string) { return this.root.querySelector<T>(selector)!; }
  private blocked() { return this.disposed || this.paused || this.ui.blocked(); }
  private canAim() { return !this.blocked() && this.state.turn === 0 && this.phase === 'aim'; }
  private aimAt(event: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect(), from = shooter(this.state);
    // object-fit can add letterboxing in portrait fullscreen. Aim in the actual drawing area.
    const width = Math.min(bounds.width, bounds.height * 900 / 560), height = width * 560 / 900;
    const left = bounds.left + (bounds.width - width) / 2, top = bounds.top + (bounds.height - height) / 2;
    const x = (event.clientX - left) / width * 900, y = (event.clientY - top) / height * 560;
    this.angle = Math.atan2(y - from.y, x - from.x); this.syncAngle();
  }
  private syncAngle() { this.get<HTMLInputElement>('#jolen-angle').value = String((Math.round(this.angle * 180 / Math.PI) + 360) % 360); }
  private keyboard = (event: KeyboardEvent) => {
    if (this.blocked()) return;
    if (event.code === 'Escape') { event.preventDefault(); document.querySelector<HTMLButtonElement>('#pause-button')?.click(); }
    if (/INPUT|SELECT|BUTTON/.test((event.target as HTMLElement)?.tagName)) return;
    if (this.state.turn !== 0 || event.repeat) return;
    if (event.code === 'Space') { event.preventDefault(); this.action(); }
    if (this.canAim() && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) { event.preventDefault(); this.angle += (event.code === 'ArrowLeft' ? -1 : 1) * Math.PI / 90; this.syncAngle(); }
  };
  private cancelPower() { if (this.blocked() || this.state.turn || this.phase !== 'power') return; this.phase = 'aim'; this.power = .08; this.phaseTime = 0; this.refresh(); }
  action() {
    if (this.blocked() || this.state.turn !== 0) return;
    if (this.phase === 'aim') { this.phase = 'power'; this.phaseTime = 0; this.power = .08; this.refresh(); }
    else if (this.phase === 'power') this.release();
  }
  private release() {
    if (!shootJolen(this.state, this.angle, this.power)) return;
    this.phase = 'rolling'; this.phaseTime = 0; this.settled = 0; this.accumulator = 0; this.ui.sound('turn'); this.refresh();
  }
  private startWalk() {
    this.phase = 'walk'; this.phaseTime = 0; this.power = .08; this.botShot = undefined;
    const m = shooter(this.state); this.angle = Math.atan2(COURT.y - m.y, COURT.x - m.x); this.syncAngle(); this.refresh();
  }
  private refresh() {
    const turn = this.state.turn === 0 ? this.ui.profile.name : this.opponent.name;
    this.get('#jolen-you').textContent = `${this.ui.profile.name} · ${this.state.scores[0]}`;
    this.get('#jolen-bot').textContent = `${this.opponent.name} · ${this.state.scores[1]}`;
    this.get('#jolen-turn').textContent = this.phase === 'finished' ? this.state.pocketWinner !== null ? 'HOLE-IN WIN!' : 'Collection complete' : `${turn}: ${this.phase === 'walk' ? 'walking to shooter…' : this.phase === 'rolling' ? 'marbles rolling…' : this.phase === 'power' ? 'timing the shot…' : 'aiming…'}`;
    this.get('.jolen-remaining').textContent = `${15 - this.state.scores[0] - this.state.scores[1]} marbles left`;
    const shoot = this.get<HTMLButtonElement>('#jolen-shoot'); shoot.disabled = this.state.turn !== 0 || !['aim', 'power'].includes(this.phase); shoot.textContent = this.phase === 'power' ? 'Tira!' : 'Tira';
    this.get<HTMLButtonElement>('#jolen-cancel').hidden = this.state.turn !== 0 || this.phase !== 'power';
    this.get<HTMLInputElement>('#jolen-angle').disabled = this.state.turn !== 0 || this.phase !== 'aim';
    this.get('#jolen-power-label').textContent = this.phase === 'power' ? 'TAP AGAIN TO LOCK & SHOOT' : this.phase === 'rolling' ? 'SHOT RELEASED' : this.state.turn ? 'BOT TURN' : 'POWER · TAP TIRA TO START';
    const el = document.querySelector<HTMLElement>('#game')!; el.dataset.mode = 'jolen'; el.dataset.phase = this.phase === 'finished' ? 'finished' : 'playing';
    this.root.dataset.phase = this.phase; this.root.dataset.turn = String(this.state.turn); this.root.dataset.shots = String(this.state.shots); this.root.dataset.scores = JSON.stringify(this.state.scores);
    this.root.dataset.hole = JSON.stringify(this.state.hole); this.root.dataset.aimRings = String(this.opponent.level < 2);
    this.root.dataset.pocketWinner = String(this.state.pocketWinner);
    // Snapshot only on turn/phase changes; browser checks can plan from the actual resting board.
    this.root.dataset.marbles = JSON.stringify(this.state.marbles);
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = this.lastTime ? Math.min(.05, (now - this.lastTime) / 1000) : 0; this.lastTime = now;
    if (!this.blocked() && this.phase !== 'finished') {
      this.phaseTime += dt * 1000;
      if (this.phase === 'walk') {
        const m = shooter(this.state), walker = this.walkers[this.state.turn];
        const x = Math.max(55, Math.min(845, m.x + (this.state.turn ? 29 : -29))), y = Math.max(75, Math.min(515, m.y + 13));
        const dx = x - walker.x, dy = y - walker.y, distance = Math.hypot(dx, dy), travel = Math.min(distance, dt * 280);
        if (distance) { walker.x += dx / distance * travel; walker.y += dy / distance * travel; }
        if (distance < 2 && this.phaseTime > 550) { this.phase = 'aim'; this.phaseTime = 0; this.refresh(); }
      } else if (this.phase === 'aim' && this.state.turn === 1 && this.phaseTime > 650) {
        this.botShot = chooseJolenShot(this.state, this.opponent.level); this.angle = this.botShot.angle; this.phase = 'power'; this.phaseTime = 0; this.refresh();
      } else if (this.phase === 'power') {
        this.power = powerAt(this.phaseTime);
        if (this.state.turn === 1 && this.phaseTime > 1200 + ((this.botShot!.power - .08) / .92) * 600) { this.power = this.botShot!.power; this.release(); }
      } else if (this.phase === 'rolling') {
        this.accumulator += dt;
        while (this.accumulator >= JOLEN_STEP) {
          const before = this.state.marbles.filter(m => !m.collected && m.owner === null);
          if (stepJolen(this.state)) { for (const m of before.filter(m => m.collected)) this.pickups.push({ x: m.x, y: m.y, age: 0 }); this.ui.sound('tag'); this.refresh(); }
          this.accumulator -= JOLEN_STEP;
          if (this.state.pocketWinner !== null) { this.finish(); break; }
        }
        this.settled = marblesMoving(this.state) ? 0 : this.settled + dt;
        if (!this.reported && this.settled > .45) {
          if (jolenFinished(this.state)) this.finish();
          else { nextJolenTurn(this.state); this.startWalk(); }
        }
      }
      for (const pickup of this.pickups) pickup.age += dt; this.pickups = this.pickups.filter(p => p.age < 1.2);
    }
    this.draw(); this.frame = requestAnimationFrame(this.tick);
  };
  private paintCourt() {
    const c = this.preview.getContext('2d')!; c.fillStyle = '#6e8557'; c.fillRect(0, 0, 900, 560);
    c.fillStyle = '#a28a60'; c.fillRect(28, 33, 844, 494); c.fillStyle = '#c5ad80'; c.fillRect(35, 40, 830, 480);
    for (let n = 0; n < 1500; n++) { c.fillStyle = n % 3 ? '#d5be92' : '#b49b70'; c.fillRect(42 + n * 71 % 816, 46 + n * 137 % 467, 2, 2); }
    c.lineWidth = 4; c.strokeStyle = '#f2e7be'; c.setLineDash([13, 2]); c.beginPath(); c.arc(COURT.x, COURT.y, COURT.radius, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.font = 'bold 16px monospace'; c.fillStyle = '#526247'; c.textAlign = 'center'; c.fillText('JOLEN · BILOG NG BARKADA', 450, 25);
    c.font = '12px monospace'; c.fillText('KNOCK TARGETS OUT OF THE CHALK CIRCLE', 450, 548);
  }
  private draw() {
    const c = this.c; c.drawImage(this.preview, 0, 0);
    if (this.state.hole) {
      const h = this.state.hole;
      c.fillStyle = '#8d7049'; c.beginPath(); c.ellipse(h.x, h.y + 2, h.radius + 5, h.radius + 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#25372a'; c.beginPath(); c.arc(h.x, h.y, h.radius, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e9cd91'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#fff0c4'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('HOLE-IN', h.x, h.y - 23);
    }
    for (let index = 0; index < 2; index++) {
      const walker = this.walkers[index], moving = this.state.turn === index && this.phase === 'walk';
      const bob = moving ? Math.sin(this.phaseTime / 65) * 2 : 0;
      c.globalAlpha = .2; c.fillStyle = '#20372a'; c.beginPath(); c.ellipse(walker.x, walker.y + 1, 15, 5, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.drawImage(this.portraits[index], Math.round(walker.x - 18), Math.round(walker.y - 42 + bob), 36, 48);
    }
    const active = shooter(this.state);
    if (['aim', 'power'].includes(this.phase)) {
      const rayX = Math.cos(this.angle), rayY = Math.sin(this.angle);
      const first = this.state.marbles.filter(m => m.owner === null && !m.collected).map(m => {
        const dx = m.x - active.x, dy = m.y - active.y;
        return { m, along: dx * rayX + dy * rayY, across: Math.abs(dx * rayY - dy * rayX) };
      }).filter(hit => hit.along > 0 && hit.across <= hit.m.radius + active.radius).sort((a, b) => a.along - b.along)[0];
      if (first && this.opponent.level < 2) { c.strokeStyle = '#fff5d2'; c.lineWidth = 2; c.beginPath(); c.arc(first.m.x, first.m.y, first.m.radius + 5, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = this.state.turn ? '#375e5c' : '#684a31'; c.lineWidth = 2; c.setLineDash([6, 5]);
      const guide = this.ui.profile.jolenDifficulty === 'easy' ? 145 : 82;
      const endX = active.x + Math.cos(this.angle) * guide, endY = active.y + Math.sin(this.angle) * guide;
      c.beginPath(); c.moveTo(active.x, active.y); c.lineTo(endX, endY); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(endX - Math.cos(this.angle - .5) * 12, endY - Math.sin(this.angle - .5) * 12); c.lineTo(endX, endY); c.lineTo(endX - Math.cos(this.angle + .5) * 12, endY - Math.sin(this.angle + .5) * 12); c.stroke();
      if (this.opponent.level < 2) { c.strokeStyle = this.state.turn ? '#315f65' : '#735330'; c.beginPath(); c.arc(active.x, active.y, active.radius + 6, 0, Math.PI * 2); c.stroke(); }
    }
    for (const m of this.state.marbles) {
      if (m.collected) continue;
      c.globalAlpha = .23; c.fillStyle = '#314d35'; c.beginPath(); c.ellipse(m.x + 2, m.y + 4, m.radius, m.radius * .7, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.fillStyle = m.owner === 0 ? '#ebbd65' : m.owner === 1 ? '#70aaa6' : marbleColors[m.id % marbleColors.length];
      c.strokeStyle = '#3e5345'; c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, m.radius, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#ffffff77'; c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, m.radius * .5, .5, 4.5); c.stroke();
      c.fillStyle = '#fff6da'; c.fillRect(Math.round(m.x - m.radius * .4), Math.round(m.y - m.radius * .5), 3, 3);
      if (m.owner !== null) { c.font = 'bold 10px monospace'; c.fillStyle = '#263e31'; c.textAlign = 'center'; c.fillText(m.owner ? 'B' : '1', m.x, m.y + 4); }
    }
    for (const p of this.pickups) { c.globalAlpha = Math.min(1, (1.2 - p.age) * 2); c.font = 'bold 18px monospace'; c.fillStyle = '#26482f'; c.textAlign = 'center'; c.fillText('+1 Jolen', Math.max(70, Math.min(830, p.x)), p.y - p.age * 42); } c.globalAlpha = 1;
    this.get('#jolen-power i').style.width = `${this.power * 100}%`; this.get('#jolen-power').setAttribute('aria-valuenow', String(Math.round(this.power * 100)));
    this.root.dataset.shooters = JSON.stringify(this.state.marbles.filter(m => m.owner !== null).map(m => ({ x: m.x, y: m.y })));
  }
  private finish() {
    if (this.reported || this.disposed) return; this.reported = true; this.phase = 'finished'; this.refresh();
    const won = this.state.pocketWinner !== null ? this.state.pocketWinner === 0 : this.state.scores[0] > this.state.scores[1]; this.ui.sound(won ? 'win' : 'tag');
    this.ui.result({ game: 'jolen', won, title: this.state.pocketWinner !== null ? won ? 'Hole-in! Instant victory!' : `${this.opponent.name} wins by hole-in!` : won ? 'Your jar is fuller!' : `${this.opponent.name} takes this one.`, summary: `${this.ui.profile.name}: ${this.state.scores[0]} marbles · ${this.opponent.name}: ${this.state.scores[1]}. ${this.state.pocketWinner !== null ? 'The opposing shooter was knocked into the hole.' : 'Every shot started where the shooter landed.'}`, coins: won ? 60 + this.opponent.level * 10 : 10, record: this.state.scores[0] });
  }
  setTouch() {} setSprint() {} resetInput() { this.dragPointer = undefined; }
  setPaused(value: boolean) { this.paused = value; this.resetInput(); }
  updateAvatar() {
    this.portraits = [document.createElement('canvas'), document.createElement('canvas')];
    paintCharacterPreview(this.portraits[0], this.ui.profile.gender, COLORS[this.ui.profile.color], 0, 0, this.ui.profile.wardrobe.equipped);
    paintCharacterPreview(this.portraits[1], this.opponent.look, COLORS[this.opponent.color]);
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); window.removeEventListener('keydown', this.keyboard); this.root.remove(); }
}
