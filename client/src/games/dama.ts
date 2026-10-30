import { applyDama, chooseDamaMove, initialDama, legalMoves, validDamaSave, type DamaMove, type DamaState } from './dama-rules';
import type { ActivityControls, ActivityUI } from './types';
import { DAMA_LEVELS, type DamaDifficulty } from './dama-levels';
import { BOT_APPEARANCES, DEFAULT_PLAYER_NAME } from '../characters';
import { paintCharacterPreview } from '../character-art';
import { COLORS } from '../store';
import { botMoveFrame, damaSquareName } from './dama-playback';

const KEY = 'laro.dama.match.v1';
export function savedDama(): DamaState | null {
  try { const value: unknown = JSON.parse(localStorage.getItem(KEY) || 'null'); return validDamaSave(value) ? value : null; }
  catch { return null; }
}

export class DamaGame implements ActivityControls {
  private state: DamaState;
  private element: HTMLDivElement;
  private selected = -1;
  private prefix: number[] = [];
  private paused = false;
  private disposed = false;
  private finished = false;
  private moves: DamaMove[] = [];
  private worker?: Worker;
  private pending?: DamaMove;
  private request = 0;
  private thinking = false;
  private tick: number;
  private lastMove: number[] = [];
  private difficulty: DamaDifficulty;
  private thinkUntil = 0;
  private animationFrame = 0;
  private lastBotMove = '';
  private playback?: { move: DamaMove; elapsed: number; lastTime: number; landed: number; ghost?: HTMLElement };

  constructor(private ui: ActivityUI, mode: 'bot' | 'local', resume = false) {
    this.state = resume ? savedDama() ?? initialDama(mode, ui.profile.damaDifficulty) : initialDama(mode, ui.profile.damaDifficulty);
    this.difficulty = this.state.difficulty ?? ui.profile.damaDifficulty;
    this.state.difficulty = this.difficulty;
    this.element = document.createElement('div'); this.element.id = 'dama-stage'; this.element.className = 'dama-stage';
    document.querySelector('#game-shell')!.append(this.element);
    ui.location('dama');
    try {
      this.worker = new Worker(new URL('./dama-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = event => { if (event.data.id === this.request && !this.disposed && !this.finished) this.pending = event.data.move; };
      this.worker.onerror = event => { event.preventDefault(); this.worker?.terminate(); this.worker = undefined; if (this.thinking) this.pending = this.fallbackMove(); };
    } catch { /* The bounded synchronous fallback works if browser workers are unavailable. */ }
    this.tick = window.setInterval(() => {
      if (this.disposed || this.finished || this.paused || ui.blocked() || this.playback) return;
      if (this.pending && performance.now() >= this.thinkUntil) { const move = this.pending; this.pending = undefined; this.playBotMove(move); }
      else if (this.state.mode === 'bot' && this.state.turn === -1 && this.state.outcome === null && !this.thinking) this.bot();
    }, 150);
    this.render(); this.save();
  }

  private save() {
    try {
      if (this.state.outcome === null) localStorage.setItem(KEY, JSON.stringify(this.state)); else localStorage.removeItem(KEY);
    } catch { this.element.querySelector('#dama-save')!.textContent = 'Browser storage unavailable · this match stays in this session'; }
  }

  private bot() {
    this.thinking = true; this.thinkUntil = performance.now() + 450; this.render();
    const id = ++this.request;
    if (this.worker) this.worker.postMessage({ id, board: this.state.board, side: this.state.turn, difficulty: this.difficulty });
    else this.pending = this.fallbackMove();
  }

  private fallbackMove() { return chooseDamaMove(this.state.board, this.state.turn, this.difficulty, { nodes: 2000, milliseconds: 45 }) ?? undefined; }

  private commit(move: DamaMove, soundPlayed = false) {
    try { this.state = applyDama(this.state, move); }
    catch { this.thinking = false; this.render(); return; }
    this.lastMove = [move.from, ...move.path]; this.selected = -1; this.prefix = []; this.thinking = false;
    if (!soundPlayed) this.ui.sound(move.captures.length ? 'tag' : 'turn'); this.render(); this.save();
    if (this.state.outcome !== null) this.end();
  }

  private playBotMove(move: DamaMove) {
    try { applyDama(this.state, move); }
    catch { this.thinking = false; this.render(); return; }
    this.playback = { move, elapsed: 0, lastTime: performance.now(), landed: 0 };
    this.render();
    const source = this.element.querySelector<HTMLElement>(`[data-square="${move.from}"] .dama-piece`)!;
    const ghost = source.cloneNode(true) as HTMLElement; ghost.classList.remove('movable'); ghost.classList.add('dama-moving-piece'); ghost.setAttribute('aria-hidden', 'true');
    source.classList.add('bot-lifted'); this.element.querySelector('.dama-board')!.append(ghost); this.playback.ghost = ghost;
    const step = (now: number) => {
      const playback = this.playback;
      if (!playback || this.disposed || this.finished) return;
      const delta = Math.min(50, Math.max(0, now - playback.lastTime)); playback.lastTime = now;
      if (!this.paused && !this.ui.blocked()) playback.elapsed += delta;
      const frame = botMoveFrame(move, playback.elapsed);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const progress = reduced ? frame.progress < .5 ? 0 : 1 : frame.progress;
      const x = (frame.from % 8) + (frame.to % 8 - frame.from % 8) * progress;
      const y = Math.floor(frame.from / 8) + (Math.floor(frame.to / 8) - Math.floor(frame.from / 8)) * progress;
      ghost.style.left = `${x * 12.5 + 1.5625}%`; ghost.style.top = `${y * 12.5 + 1.5625}%`;
      ghost.style.transform = move.captures.length && !reduced ? `translateY(${-Math.sin(progress * Math.PI) * 7}px)` : '';
      this.element.querySelectorAll('.bot-next').forEach(square => square.classList.remove('bot-next'));
      this.element.querySelector(`[data-square="${frame.to}"]`)!.classList.add('bot-next');
      if (frame.landed > playback.landed) {
        playback.landed = frame.landed; this.ui.sound(move.captures.length ? 'tag' : 'turn');
        move.captures.slice(0, frame.landed).forEach(at => this.element.querySelector(`[data-square="${at}"]`)!.classList.add('bot-jumped'));
      }
      this.element.dataset.botPhase = frame.phase; this.element.dataset.botHop = String(frame.hop + 1);
      this.element.querySelector('#dama-move-note')!.textContent = `${DAMA_LEVELS[this.difficulty].opponent}: ${damaSquareName(move.from)} → ${move.path.slice(0, frame.hop + 1).map(damaSquareName).join(' → ')}${move.path.length > 1 ? ` · jump ${frame.hop + 1}/${move.path.length}` : ''}`;
      if (frame.phase === 'done') {
        this.lastBotMove = `${DAMA_LEVELS[this.difficulty].opponent}: ${[move.from, ...move.path].map(damaSquareName).join(' → ')}`;
        this.stopPlayback(); this.commit(move, true); return;
      }
      this.animationFrame = requestAnimationFrame(step);
    };
    this.animationFrame = requestAnimationFrame(step);
  }

  private stopPlayback() { cancelAnimationFrame(this.animationFrame); this.animationFrame = 0; this.playback = undefined; }

  private click(at: number) {
    if (this.paused || this.ui.blocked() || this.finished) return;
    if (this.state.mode === 'bot' && this.state.turn === -1) { this.ui.failure?.('mistake'); return; }
    if (this.selected >= 0) {
      const candidates = this.moves.filter(move => move.from === this.selected && this.prefix.every((step, i) => move.path[i] === step) && move.path[this.prefix.length] === at);
      if (candidates.length) {
        this.prefix.push(at);
        const complete = candidates.find(move => move.path.length === this.prefix.length);
        if (complete) this.commit(complete);
        else { this.render(); this.ui.hint('Keep jumping with the same piece to finish the capture chain.'); }
        return;
      }
    }
    if (this.prefix.length) { this.ui.failure?.('mistake'); this.ui.hint('Finish this capture chain: choose a highlighted square.'); return; }
    if (Math.sign(this.state.board[at]) === this.state.turn && this.moves.some(move => move.from === at)) {
      this.selected = at; this.render();
    } else { this.ui.failure?.('mistake'); this.ui.hint(this.moves[0]?.captures.length ? 'A capture is required. Choose a glowing piece and follow the longest chain.' : 'Select one of your pieces, then a highlighted destination.'); }
  }

  private render() {
    if (this.disposed) return;
    this.moves = this.state.outcome === null ? legalMoves(this.state.board, this.state.turn) : [];
    const choices = this.moves.filter(move => move.from === this.selected && this.prefix.every((at, i) => move.path[i] === at));
    const targets = new Set(choices.map(move => move.path[this.prefix.length]));
    const board = this.state.board.slice();
    if (this.prefix.length) {
      const piece = board[this.selected]; board[this.selected] = 0;
      choices[0]?.captures.slice(0, this.prefix.length).forEach(at => { board[at] = 0; });
      board[this.prefix.at(-1)!] = piece;
    }
    const player = this.state.turn === 1 ? 'Gold' : 'Teal';
    const opponent = DAMA_LEVELS[this.difficulty];
    const turn = this.playback ? `${opponent.opponent} is moving…` : this.thinking ? `${opponent.opponent} is thinking…` : `${player} to move`;
    const counts = [this.state.board.filter(piece => piece > 0).length, this.state.board.filter(piece => piece < 0).length];
    this.element.innerHTML = `
      <div class="dama-heading ${this.state.mode === 'bot' ? 'has-portrait' : ''}">${this.state.mode === 'bot' ? `<canvas id="dama-portrait" role="img" aria-label="${opponent.opponent}"></canvas>` : ''}<span class="eyebrow">${this.state.mode === 'bot' ? `${opponent.label.toUpperCase()} · ${opponent.opponent.toUpperCase()}` : 'SA TABI NG TINDAHAN'}</span><strong id="dama-turn" aria-live="polite">${turn}</strong><span>${this.state.mode === 'bot' ? `${DEFAULT_PLAYER_NAME} · Gold / ${opponent.opponent} · Teal` : 'Pass-and-play · Gold / Teal'} · Move ${Math.floor(this.state.ply / 2) + 1}</span></div>
      <div class="dama-table"><div class="dama-board" role="group" aria-label="Dama board, 8 by 8" aria-busy="${this.thinking}">${board.map((piece, at) => {
        const playable = (Math.floor(at / 8) + at % 8) % 2 === 1;
        const available = this.moves.some(move => move.from === at);
        const name = `${String.fromCharCode(97 + at % 8)}${8 - Math.floor(at / 8)}`;
        const description = piece ? `${piece > 0 ? 'Gold' : 'Teal'} ${Math.abs(piece) === 2 ? 'king' : 'piece'}` : 'empty';
        return `<button class="dama-square ${playable ? 'dark' : 'light'} ${targets.has(at) ? 'legal' : ''} ${at === this.selected || this.prefix.at(-1) === at ? 'selected' : ''} ${this.lastMove.includes(at) ? 'last-move' : ''} ${this.playback?.move.from === at ? 'bot-source' : ''}" data-square="${at}" aria-label="${name}, ${description}${targets.has(at) ? ', legal destination' : ''}" ${!playable ? 'disabled' : ''}>${piece ? `<span class="dama-piece ${piece > 0 ? 'gold' : 'teal'} ${available && !this.thinking ? 'movable' : ''}">${Math.abs(piece) === 2 ? '<span aria-hidden="true">♛</span>' : ''}</span>` : targets.has(at) ? '<i aria-hidden="true"></i>' : ''}${at >= 56 ? `<small>${String.fromCharCode(97 + at % 8)}</small>` : ''}</button>`;
      }).join('')}</div></div>
      <div class="dama-footer"><span><i class="piece-dot gold"></i> Gold ${counts[0]} <i class="piece-dot teal"></i> Teal ${counts[1]}</span><span id="capture-rule">${this.moves[0]?.captures.length ? `${this.moves[0].captures.length}-piece capture required` : 'Select a piece to see its moves'}</span><span id="dama-move-note" ${this.playback || this.lastBotMove ? '' : 'hidden'}>${this.lastBotMove}</span><button id="dama-resign" class="text-button">Resign match</button><small id="dama-save">Match saved automatically on this device</small></div>`;
    const portrait = this.element.querySelector<HTMLCanvasElement>('#dama-portrait');
    const boardElement = this.element.querySelector<HTMLElement>('.dama-board')!;
    boardElement.onpointerdown = event => {
      if (this.paused || this.ui.blocked() || this.finished) return;
      const box = boardElement.getBoundingClientRect(), row = Math.floor((event.clientY - box.top) / box.height * 8), column = Math.floor((event.clientX - box.left) / box.width * 8);
      if (row >= 0 && row < 8 && column >= 0 && column < 8 && (row + column) % 2 === 0) { this.ui.failure?.('mistake'); this.ui.hint('Dama pieces move on the dark squares.'); }
    };
    if (portrait) { const appearance = BOT_APPEARANCES[opponent.character]; paintCharacterPreview(portrait, appearance.look, [...COLORS, '#c97969'][appearance.color]); }
    this.element.querySelectorAll<HTMLButtonElement>('[data-square]').forEach(button => {
      button.onclick = () => this.click(Number(button.dataset.square));
      button.onkeydown = event => {
        const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[event.key];
        if (offset === undefined) return;
        event.preventDefault();
        let next = Number(button.dataset.square) + offset;
        while (next >= 0 && next < 64 && this.element.querySelector<HTMLButtonElement>(`[data-square="${next}"]`)?.disabled) next += offset;
        this.element.querySelector<HTMLButtonElement>(`[data-square="${next}"]`)?.focus();
      };
    });
    this.element.querySelector<HTMLButtonElement>('#dama-resign')!.onclick = () => {
      const button = this.element.querySelector<HTMLButtonElement>('#dama-resign')!;
      if (button.dataset.confirm !== 'true') { button.dataset.confirm = 'true'; button.textContent = 'Confirm resignation'; return; }
      this.state.outcome = this.state.mode === 'bot' ? -1 : -this.state.turn as 1 | -1; this.save(); this.end();
    };
    this.ui.hint(this.moves[0]?.captures.length ? 'Captures are mandatory. The highlighted route must take the most pieces.' : 'Click a piece, then its destination. Kings can travel along clear diagonals.');
    const game = document.querySelector<HTMLElement>('#game')!;
    game.dataset.mode = 'dama'; game.dataset.phase = this.state.outcome === null ? 'playing' : 'finished'; game.dataset.ply = String(this.state.ply);
    this.element.dataset.turn = String(this.state.turn); this.element.dataset.ply = String(this.state.ply);
    this.element.dataset.difficulty = this.difficulty;
    this.element.dataset.botMoving = String(Boolean(this.playback)); this.element.dataset.botPhase = this.playback ? 'focus' : 'idle'; this.element.dataset.botHop = this.playback ? '1' : '0';
  }

  private end() {
    if (this.finished) return;
    this.finished = true; this.thinking = false; this.stopPlayback(); this.worker?.terminate(); this.render();
    const draw = this.state.outcome === 0, won = this.state.outcome === 1;
    const local = this.state.mode === 'local';
    this.ui.result({ game: 'dama', won, draw, practice: local, record: this.state.ply,
      title: draw ? 'A well-played draw.' : local ? `${this.state.outcome === 1 ? 'Gold' : 'Teal'} takes the table.` : won ? 'A clever finish!' : `${DAMA_LEVELS[this.difficulty].opponent} takes this one.`,
      summary: `${draw ? 'Threefold repetition or 40 quiet full moves ends the match.' : 'The match is complete.'} ${local ? 'Pass-and-play is a friendly match; no coins or ranked records are awarded.' : 'Try another match, or take a stroll around the barangay.'}`,
      coins: local ? 0 : draw ? 20 : won ? 60 : 10,
    });
  }

  dispose() { this.disposed = true; this.stopPlayback(); clearInterval(this.tick); this.worker?.terminate(); this.element.remove(); }
  setTouch() {} setSprint() {} resetInput() {} action() {} updateAvatar() {}
  setPaused(value: boolean) { this.paused = value; }
}
