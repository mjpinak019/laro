import { NeighborhoodStage } from './neighborhood-stage';
import { initialTumbang, launchTumbang, nextTumbangTurn, stepTumbang, toggleTsinelas, tumbangGuideLength, tumbangMatchOver, TUMBANG_LEVELS, TUMBANG_LINE } from './tumbang-rules';
import { TouchPad } from '../touch-pad';
import type { ActivityUI } from './types';

export class TumbangGame extends NeighborhoodStage {
  private state;
  private autoGuard = false;
  private accumulator = 0;
  private previousMessage = '';
  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private pad: TouchPad;
  constructor(ui: ActivityUI) {
    super(ui, 'tumbang', 'eric', `<label for="tumbang-angle">Aim<input id="tumbang-angle" type="range" min="-150" max="-30" value="-90" aria-label="Throw direction in degrees" /></label><div class="street-meter" id="tumbang-meter" role="meter" aria-label="Throw power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="55"><b></b><i></i></div><button id="tumbang-action" class="primary-button">Start throw</button><button id="tumbang-walk" class="secondary-button" hidden>Walk to tsinelas</button><p class="street-help">WASD / arrows / pad / tap to move. E or Space: pick up / put down. First to 3 points. No holding: guard stays still.</p>`);
    this.state = initialTumbang(ui.profile.difficulty);
    this.get('.neighborhood-court').insertAdjacentHTML('beforeend', '<div id="tumbang-pad" class="touch-pad" role="group" aria-label="Tumbang Preso movement pad"><span class="stick-knob" aria-hidden="true"></span></div>');
    this.pad = new TouchPad(this.get('#tumbang-pad'), (x, y) => { this.stick = { x, y }; if (x || y) this.autoGuard = false; });
    window.addEventListener('keyup', this.release); window.addEventListener('blur', this.resetInput);
    this.get('#tumbang-walk').onclick = () => { if (this.blocked()) return; this.state.autoRetrieve = true; this.state.target = undefined; };
    this.get('#tumbang-action').onclick = () => this.action();
    this.get<HTMLInputElement>('#tumbang-angle').oninput = event => { if (!this.blocked() && this.state.phase === 'aim') this.state.angle = Number((event.target as HTMLInputElement).value) * Math.PI / 180; };
    this.canvas.onpointerdown = event => {
      if (this.blocked()) return; const at = this.point(event);
      if (this.state.phase === 'aim') { const from = this.state.players[0]; this.state.angle = Math.max(-150, Math.min(-30, Math.atan2(at.y - from.y, at.x - from.x) * 180 / Math.PI)) * Math.PI / 180; this.get<HTMLInputElement>('#tumbang-angle').value = String(this.state.angle * 180 / Math.PI); }
      else if (['retrieve', 'flight', 'bot-aim'].includes(this.state.phase)) { this.autoGuard = false; this.state.autoRetrieve = false; this.state.target = at; }
    };
    this.sync();
  }
  action() {
    if (this.blocked()) return; const state = this.state;
    if (state.phase === 'aim') { state.phase = 'power'; state.power = 0; state.clock = 0; state.elapsed = 0; state.message = 'Tap again to lock power. Enough distance hits the can; extra power sends the slipper farther.'; }
    else if (state.phase === 'power') launchTumbang(state, state.angle, state.power);
    else if (state.phase === 'feedback') { nextTumbangTurn(state); this.autoGuard = false; if (state.phase as string === 'finished') { this.finish(); return; } }
    else if (state.turn % 2 === 0 && state.phase === 'retrieve') toggleTsinelas(state);
    else if (state.turn % 2 === 1) { this.autoGuard = true; state.message = state.can.down ? 'Go to the can and hold nearby to reset it. Then chase Eric!' : 'Chase Eric once he leaves the safety line!'; }
    this.sync();
  }
  private finish() {
    if (this.finished) return; this.finished = true; this.sync();
    const [you, eric] = this.state.scores, draw = you === eric, won = you > eric;
    this.ui.result({ game: 'tumbang', won, draw, record: you, coins: draw ? 20 : won ? { easy: 60, normal: 80, hard: 100 }[this.state.difficulty] : 10,
      title: draw ? 'A tie in the clearing!' : won ? 'You take the tin-can challenge!' : 'Eric wins this round.', summary: `You ${you}/3 - Eric ${eric}/3. First to three points. Knock down and retrieve to score as thrower; reset and tag to score as guard.` });
  }
  protected update(dt: number) {
    const state = this.state, before = state.hit;
    this.accumulator += dt;
    while (this.accumulator >= 1 / 120) {
      if (this.autoGuard && state.turn % 2 === 1) state.target = state.can.down ? { x: state.can.x, y: state.can.y } : { ...state.players[1] };
      const input = { x: Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) + this.stick.x, y: Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) + this.stick.y };
      stepTumbang(state, 1 / 120, input); this.accumulator -= 1 / 120;
    }
    if (!before && state.hit) this.ui.sound('tag');
    this.sync();
  }
  private sync() {
    const s = this.state, yourThrow = s.turn % 2 === 0;
    this.root.dataset.phase = s.phase; this.root.dataset.turn = String(s.turn); this.root.dataset.canDown = String(s.can.down); this.root.dataset.canAngle = s.can.angle.toFixed(3); this.root.dataset.time = s.elapsed.toFixed(3); this.root.dataset.hit = String(s.hit); this.root.dataset.carrying = String(s.carrying);
    this.root.dataset.player = JSON.stringify(s.players[0]); this.root.dataset.guard = JSON.stringify(s.players[1 - s.turn % 2]); this.root.dataset.slipper = JSON.stringify(s.slipper); this.root.dataset.guideScale = String(TUMBANG_LEVELS[s.difficulty].guideScale);
    this.get('#street-score').textContent = `You ${s.scores[0]}/3 · Eric ${s.scores[1]}/3`;
    this.get('#street-role').textContent = `FIRST TO 3 · YOU ${yourThrow ? 'THROW' : 'GUARD'} · ${s.carrying ? 'GUARD MOVES' : 'GUARD WAITS'}`;
    if (s.message !== this.previousMessage) { this.get('#street-status').textContent = s.message; this.ui.hint(s.message); this.previousMessage = s.message; }
    const button = this.get<HTMLButtonElement>('#tumbang-action');
    button.textContent = s.phase === 'aim' ? 'Start throw' : s.phase === 'power' ? 'Throw tsinelas' : s.phase === 'feedback' ? tumbangMatchOver(s) ? 'See results' : 'Rotate roles' : !yourThrow ? s.can.down ? 'Reset can' : 'Chase Eric' : s.carrying ? 'Put down · E' : 'Pick up · E';
    button.disabled = yourThrow && s.phase === 'flight'; this.get<HTMLInputElement>('#tumbang-angle').disabled = s.phase !== 'aim';
    this.get('#tumbang-walk').hidden = !yourThrow || !['flight', 'retrieve'].includes(s.phase);
    this.get('#tumbang-walk').textContent = s.carrying ? 'Walk home' : 'Walk to tsinelas';
    this.get('#tumbang-pad').hidden = !['flight', 'retrieve'].includes(s.phase);
    this.get('#tumbang-meter i').style.width = `${s.power * 100}%`; this.get('#tumbang-meter').setAttribute('aria-valuenow', String(Math.round(s.power * 100)));
    const game = document.querySelector<HTMLElement>('#game')!; game.dataset.mode = 'tumbang'; game.dataset.phase = this.finished ? 'finished' : 'playing';
  }
  protected draw() {
    if (!this.state) return; this.ground(); const c = this.c, s = this.state, level = TUMBANG_LEVELS[s.difficulty];
    c.strokeStyle = '#f9e9bf'; c.lineWidth = 4; c.beginPath(); c.moveTo(65, TUMBANG_LINE); c.lineTo(835, TUMBANG_LINE); c.stroke();
    this.text('SAFE BEHIND THIS LINE', 450, 540, 18); this.text('TUMBANG PRESO', 450, 40, 24, '#f8e9bc');
    c.setLineDash([4, 4]); c.strokeStyle = '#8e7954'; c.strokeRect(420, 170, 60, 60); c.setLineDash([]);
    if (s.phase === 'aim' || s.phase === 'power') {
      const from = s.players[0];
      const length = tumbangGuideLength(s.power, s.difficulty); c.strokeStyle = '#8d6c42'; c.lineWidth = 2; c.setLineDash([7, 7]); c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(from.x + Math.cos(s.angle) * length, from.y + Math.sin(s.angle) * length); c.stroke(); c.setLineDash([]);
    }
    for (const i of [0, 1]) { const p = s.players[i]; this.kid(p.x, p.y, i === 1); this.text(i ? 'ERIC' : 'YOU', p.x, p.y + 25, 15); }
    const can = s.can; c.fillStyle = '#384f3c33'; c.beginPath(); c.ellipse(can.x + 3, can.y + 4, 19, 7, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(Math.round(can.x), Math.round(can.y - (can.down ? 5 : 15))); c.rotate(can.down ? can.angle : 0);
    c.fillStyle = '#566c68'; c.fillRect(-11, -15, 22, 30); c.fillStyle = '#b8c5b7'; c.fillRect(-8, -14, 15, 28); c.fillStyle = '#d17e59'; c.fillRect(-8, -6, 15, 12); c.fillStyle = '#eef0cd'; c.fillRect(-12, -16, 24, 4); c.fillRect(-12, 12, 24, 3); c.restore();
    if (can.down && can.reset) { c.fillStyle = '#2f4d38'; c.fillRect(can.x - 25, can.y + 15, 50, 5); c.fillStyle = '#f2c779'; c.fillRect(can.x - 25, can.y + 15, 50 * can.reset / level.reset, 5); }
    const slipper = s.carrying ? s.players[s.turn % 2] : s.slipper;
    c.save(); c.translate(slipper.x + (s.carrying ? 20 : 0), slipper.y - (s.phase === 'flight' ? Math.sin(s.flightTime * Math.PI) * 28 : 3)); c.rotate(s.phase === 'flight' ? s.flightTime * 8 : -.4); c.fillStyle = '#6a8c9b'; c.fillRect(-7, -13, 14, 26); c.fillStyle = '#d9d1a0'; c.fillRect(-5, -7, 10, 3); c.fillRect(-1, -7, 3, 12); c.restore();
    this.text(!s.carrying ? 'TSINELAS ON GROUND - GUARD STAYS STILL' : can.down ? 'CAN DOWN - RESET BEFORE TAGGING' : 'HOLDING TSINELAS - GUARD CAN TAG', 450, 105, 15);
  }
  protected key(event: KeyboardEvent) {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); this.keys.add(event.code); this.autoGuard = false; }
    if (event.code === 'KeyE') { event.preventDefault(); this.action(); }
  }
  private release = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  resetInput = () => { this.keys?.clear(); this.stick = { x: 0, y: 0 }; this.pad?.reset(); };
  dispose() { this.resetInput(); window.removeEventListener('keyup', this.release); window.removeEventListener('blur', this.resetInput); super.dispose(); }
}
