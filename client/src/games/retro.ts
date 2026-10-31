import type { ActivityControls, ActivityUI } from './types';
import { initialOrbit, initialSnake, snakeInterval, steerSnake, stepSnake, tickOrbit, type Direction } from './retro-rules';

export class RetroGame implements ActivityControls {
  private ui: ActivityUI;
  private id: 'snake' | 'impact';
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private c: CanvasRenderingContext2D;
  private snake = initialSnake();
  private orbit = initialOrbit();
  private held = new Set<string>();
  private pointers = new Map<number, string>();
  private ready = true;
  private finished = false;
  private disposed = false;
  private paused = false;
  private accumulator = 0;
  private lastTime = 0;
  private frame = 0;
  private swipe?: { x: number; y: number };
  private help = false;
  constructor(ui: ActivityUI, id: 'snake' | 'impact') {
    this.ui = ui; this.id = id;
    this.root = document.createElement('div'); this.root.id = 'retro-stage'; this.root.className = 'retro-stage';
    this.root.innerHTML = `<div class="retro-phone"><div class="retro-speaker" aria-hidden="true">▪ ▪ ▪ ▪ ▪</div><div class="retro-brand">TALA <span>01</span></div><div class="retro-lcd"><canvas id="retro-canvas" width="168" height="96" role="img" aria-label="${id === 'snake' ? 'Snake' : 'Orbit Patrol'} monochrome game screen"></canvas></div><div class="retro-softkeys"><button id="retro-start">Start</button><button id="retro-help">Controls</button></div><div class="retro-keypad" aria-label="Phone keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => `<button type="button" ${['2', '4', '6', '8'].includes(key) ? `data-retro-input="${({ 2: 'up', 4: 'left', 6: 'right', 8: 'down' } as Record<string, string>)[key]}"` : key === '5' ? 'data-retro-input="fire"' : 'disabled'}>${key}<small>${({ 2: '↑', 4: '←', 6: '→', 8: '↓', 5: 'FIRE' } as Record<string, string>)[key] ?? '·'}</small></button>`).join('')}</div><span class="retro-phone-label">BULSA EDITION · NO SIGNAL NEEDED</span></div><div class="retro-console"><div class="eyebrow">A LITTLE SECRET IN YOUR POCKET</div><h2>${id === 'snake' ? 'Snake' : 'Orbit Patrol'}</h2><p id="retro-instructions">${id === 'snake' ? 'Edges wrap to the opposite side. Eat food and avoid your own tail. Use arrows, WASD, keypad or swipe.' : 'Move with arrows, WASD or the left pad. Hold Space / Fire on the right. Dodge fast scouts and boss fire. Defeat each boss to loop into the next wave.'}</p><div class="retro-controller" aria-label="Retro game controls"><div class="retro-dpad">${['up', 'left', 'right', 'down'].map(key => `<button type="button" data-retro-input="${key}" aria-label="Retro ${key}">${({ up: '↑', down: '↓', left: '←', right: '→' })[key]}</button>`).join('')}</div><button id="retro-fire" data-retro-input="fire" ${id === 'snake' ? 'hidden' : ''}>Fire</button></div><p id="retro-status" role="status">Tap screen or press Enter. Coins and high scores save after a finished game.</p><small>Pause with Escape or the pause button. Leaving early earns no coins.</small></div>`;
    document.querySelector('#game-shell')!.append(this.root); this.root.append(this.root.querySelector('.retro-controller')!);
    this.canvas = this.root.querySelector('#retro-canvas')!; this.c = this.canvas.getContext('2d')!; this.c.imageSmoothingEnabled = false;
    this.root.querySelector<HTMLButtonElement>('#retro-start')!.onclick = () => { if (!this.blocked() && this.ready) { this.ready = false; this.root.querySelector<HTMLButtonElement>('#retro-start')!.disabled = true; this.status(); } };
    this.root.querySelector<HTMLButtonElement>('#retro-help')!.onclick = () => this.toggleHelp();
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-retro-input]')) {
      button.onpointerdown = event => { event.preventDefault(); if (this.blocked()) return; button.setPointerCapture(event.pointerId); const input = button.dataset.retroInput!; this.pointers.set(event.pointerId, input); button.classList.add('held'); this.press(input); };
      const release = (event: PointerEvent) => { this.pointers.delete(event.pointerId); button.classList.remove('held'); this.rebuildHeld(); };
      button.onpointerup = release; button.onpointercancel = release; button.onlostpointercapture = release;
    }
    this.canvas.tabIndex = 0;
    this.canvas.onpointerdown = event => { if (this.blocked()) return; if (this.ready) { this.action(); return; } this.canvas.setPointerCapture(event.pointerId); this.swipe = { x: event.clientX, y: event.clientY }; };
    this.canvas.onpointermove = event => { if (!this.swipe || this.blocked() || id !== 'snake') return; const dx = event.clientX - this.swipe.x, dy = event.clientY - this.swipe.y; if (Math.hypot(dx, dy) < 12) return; this.press(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down'); this.swipe = { x: event.clientX, y: event.clientY }; };
    this.canvas.onpointerup = this.canvas.onpointercancel = () => { this.swipe = undefined; };
    window.addEventListener('keydown', this.keyDown); window.addEventListener('keyup', this.keyUp); window.addEventListener('blur', this.resetInput);
    this.ui.location(id); this.ui.hint('Secret pocket games · Tap screen or press Enter · arrows / keypad to move · Escape pauses.'); this.status(); this.frame = requestAnimationFrame(this.tick);
  }
  private blocked() { return this.disposed || this.paused || this.ui.blocked() || this.finished || this.help; }
  private toggleHelp() {
    if (this.disposed || this.paused || this.ui.blocked() || this.finished) return;
    this.help = !this.help; this.resetInput(); this.root.querySelector('#retro-help')!.textContent = this.help ? 'Back' : 'Controls';
    if (this.help) this.root.querySelector('#retro-status')!.textContent = this.id === 'snake' ? 'Paused · 2 ↑ · 4 ← · 6 → · 8 ↓. No reverse turns. Swipe also works. Press Back or Escape to resume.' : 'Paused · 2 ↑ · 4 ← · 6 → · 8 ↓ · hold 5 to fire. Escaped enemies cost a life. Press Back or Escape to resume.';
    else this.status();
  }
  private keyNames: Record<string, string> = { ArrowUp: 'up', KeyW: 'up', Digit2: 'up', ArrowDown: 'down', KeyS: 'down', Digit8: 'down', ArrowLeft: 'left', KeyA: 'left', Digit4: 'left', ArrowRight: 'right', KeyD: 'right', Digit6: 'right', Space: 'fire', Digit5: 'fire' };
  private keyboardHeld = new Map<string, string>();
  private keyDown = (event: KeyboardEvent) => {
    if (this.help && event.code === 'Escape') { event.preventDefault(); this.toggleHelp(); return; }
    if (this.blocked() || /INPUT|SELECT/.test((event.target as HTMLElement)?.tagName)) return;
    if (event.code === 'Escape') { event.preventDefault(); document.querySelector<HTMLButtonElement>('#pause-button')?.click(); return; }
    if (event.code === 'Enter' && this.ready) { event.preventDefault(); this.root.querySelector<HTMLButtonElement>('#retro-start')!.click(); return; }
    const input = this.keyNames[event.code]; if (!input) return; event.preventDefault();
    if (!event.repeat) { this.keyboardHeld.set(event.code, input); this.press(input); }
  };
  private keyUp = (event: KeyboardEvent) => { this.keyboardHeld.delete(event.code); this.rebuildHeld(); };
  private press(input: string) {
    if (this.blocked() || this.ready) return;
    this.held.add(input); if (this.id === 'snake' && input !== 'fire') steerSnake(this.snake, input as Direction);
  }
  private rebuildHeld() { this.held = new Set([...this.keyboardHeld.values(), ...this.pointers.values()]); }
  private status() {
    const score = this.id === 'snake' ? this.snake.score : this.orbit.score;
    this.root.dataset.game = this.id; this.root.dataset.phase = this.ready ? 'ready' : this.finished ? 'finished' : 'playing'; this.root.dataset.score = String(score);
    this.root.dataset.snakeHead = JSON.stringify(this.snake.body[0]); this.root.dataset.lives = String(this.orbit.lives);
    this.root.dataset.time = this.orbit.time.toFixed(2); this.root.dataset.bullets = String(this.orbit.bullets.length);
    this.root.dataset.player = JSON.stringify(this.orbit.player);
    this.root.dataset.wave = String(this.orbit.wave); this.root.dataset.bossHp = String(this.orbit.boss?.hp ?? 0); this.root.dataset.hostile = String(this.orbit.hostile.length);
    const game = document.querySelector<HTMLElement>('#game')!; game.dataset.mode = this.id; game.dataset.phase = this.ready ? 'ready' : this.finished ? 'finished' : 'playing';
    this.root.querySelector('#retro-status')!.textContent = this.ready ? 'Tap screen or press Enter. Coins and high scores save after a finished game.' : this.id === 'snake' ? `${score} points · Best ${this.ui.profile.records.snake.best}` : `${score} points · ${this.orbit.lives} lives · Wave ${this.orbit.wave}${this.orbit.boss ? ' · BOSS ' + this.orbit.boss.hp + '/' + this.orbit.boss.maxHp : ' · boss in ' + Math.max(0, Math.ceil(24 - this.orbit.waveTime)) + 's'}`;
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = this.lastTime ? Math.min(.05, (now - this.lastTime) / 1000) : 0; this.lastTime = now;
    if (!this.blocked() && !this.ready) {
      this.accumulator += dt;
      if (this.id === 'snake') {
        while (this.accumulator >= snakeInterval(this.snake.score) && !this.snake.over) { this.accumulator -= snakeInterval(this.snake.score); const before = this.snake.score; stepSnake(this.snake); if (this.snake.score > before) this.ui.sound('turn'); }
        if (this.snake.over) this.finish();
      } else {
        while (this.accumulator >= 1 / 120 && !this.orbit.over) { const lives = this.orbit.lives; tickOrbit(this.orbit, 1 / 120, { x: Number(this.held.has('right')) - Number(this.held.has('left')), y: Number(this.held.has('down')) - Number(this.held.has('up')), firing: this.held.has('fire') }); if (this.orbit.lives < lives) this.ui.failure?.('hit'); this.accumulator -= 1 / 120; }
        if (this.orbit.over) this.finish();
      }
      this.status();
    }
    this.draw(); this.frame = requestAnimationFrame(this.tick);
  };
  private draw() {
    const c = this.c; c.fillStyle = '#a8b87c'; c.fillRect(0, 0, 168, 96); c.fillStyle = '#263c24'; c.font = '8px monospace'; c.textAlign = 'left';
    if (this.help) { c.textAlign = 'center'; c.font = 'bold 10px monospace'; c.fillText('CONTROLS · PAUSED', 84, 22); c.font = '8px monospace'; c.fillText('2 UP    8 DOWN', 84, 41); c.fillText('4 LEFT  6 RIGHT', 84, 55); c.fillText(this.id === 'snake' ? 'SWIPE TO TURN' : 'HOLD 5 / SPACE: FIRE', 84, 69); c.fillText('BACK TO RESUME', 84, 85); return; }
    if (this.ready) { c.textAlign = 'center'; c.font = 'bold 11px monospace'; c.fillText(this.id === 'snake' ? 'SNAKE' : 'ORBIT PATROL', 84, 34); c.font = '8px monospace'; c.fillText('TAP / ENTER TO START', 84, 57); c.fillText(this.id === 'snake' ? 'EAT · GROW · SURVIVE' : 'FLY · FIRE · SURVIVE', 84, 76); return; }
    if (this.id === 'snake') {
      c.fillText(`SCORE ${this.snake.score}`, 3, 9); c.fillRect(0, 12, 168, 1);
      for (const [index, cell] of this.snake.body.entries()) { c.fillRect(cell.x * 8 + 1, 14 + cell.y * 8, 6, 6); if (!index) { c.fillStyle = '#a8b87c'; c.fillRect(cell.x * 8 + 3, 16 + cell.y * 8, 1, 1); c.fillStyle = '#263c24'; } }
      const food = this.snake.food; c.fillRect(food.x * 8 + 2, 15 + food.y * 8, 4, 4); c.fillRect(food.x * 8 + 3, 14 + food.y * 8, 2, 6);
    } else {
      c.fillText(`${this.orbit.score}  HP ${this.orbit.lives}  WAVE ${this.orbit.wave}`, 3, 9); c.fillRect(0, 12, 168, 1);
      for (let n = 0; n < 20; n++) c.fillRect((n * 47 - Math.floor(this.orbit.time * 18) % 168 + 168) % 168, 17 + n * 31 % 76, 1, 1);
      const p = this.orbit.player;
      if (!this.orbit.invulnerable || Math.floor(this.orbit.time * 12) % 2) { c.fillRect(Math.round(p.x - 5), Math.round(p.y - 2), 10, 4); c.fillRect(Math.round(p.x - 2), Math.round(p.y - 4), 4, 8); c.fillRect(Math.round(p.x + 5), Math.round(p.y - 1), 3, 2); }
      for (const bullet of this.orbit.bullets) c.fillRect(Math.round(bullet.x), Math.round(bullet.y), 3, 1);
      for (const enemy of this.orbit.enemies) { c.fillRect(Math.round(enemy.x - 5), Math.round(enemy.y - 3), 10, 6); c.fillStyle = '#a8b87c'; c.fillRect(Math.round(enemy.x - 2), Math.round(enemy.y - 1), 3, 2); c.fillStyle = '#263c24'; c.fillRect(Math.round(enemy.x - 7), Math.round(enemy.y - 1), 2, 2); }
      for (const enemy of this.orbit.enemies.filter(e => e.fast)) { c.fillRect(Math.round(enemy.x - 9), Math.round(enemy.y), 5, 1); c.fillRect(Math.round(enemy.x + 2), Math.round(enemy.y - 5), 3, 10); }
      const boss = this.orbit.boss;
      if (boss) {
        const x = Math.round(boss.x), y = Math.round(boss.y);
        c.fillRect(x - 12, y - 10, 25, 20); c.fillRect(x - 17, y - 5, 6, 10); c.fillRect(x - 8, y - 14, 18, 28);
        c.fillStyle = '#a8b87c'; c.fillRect(x - 7, y - 6, 13, 12); c.fillStyle = '#263c24'; c.fillRect(x - 5, y - 3, 5, 6);
        c.strokeRect(111, 15, 52, 4); c.fillRect(112, 16, 50 * boss.hp / boss.maxHp, 2);
      }
      for (const bullet of this.orbit.hostile) { c.fillRect(Math.round(bullet.x) - 1, Math.round(bullet.y) - 1, 3, 3); }
    }
  }
  private finish() {
    if (this.finished || this.disposed) return; this.finished = true;
    const score = this.id === 'snake' ? this.snake.score : this.orbit.score, won = this.id === 'snake' ? this.snake.won : this.orbit.won;
    this.status(); this.resetInput(); this.ui.sound(won ? 'win' : 'tag');
    this.ui.result({ game: this.id, won, title: won ? 'Pocket champion!' : 'Game over. One more?', summary: `${this.id === 'snake' ? 'Snake' : 'Orbit Patrol'}: ${score} points. Your high score and earned coins are saved.`, coins: Math.min(this.id === 'snake' ? 30 : 40, Math.floor(score / (this.id === 'snake' ? 5 : 25))), record: score });
  }
  setTouch() {} setSprint() {} action() { if (this.ready) this.root.querySelector<HTMLButtonElement>('#retro-start')!.click(); } updateAvatar() {}
  setPaused(value: boolean) { this.paused = value; this.resetInput(); }
  resetInput = () => { this.held.clear(); this.pointers.clear(); this.keyboardHeld.clear(); this.swipe = undefined; this.root.querySelectorAll('.held').forEach(button => button.classList.remove('held')); };
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.resetInput(); window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.resetInput); this.root.remove(); }
}
