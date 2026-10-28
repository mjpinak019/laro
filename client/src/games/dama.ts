import { applyDama, chooseDamaMove, initialDama, legalMoves, validDamaSave, type DamaMove, type DamaState } from './dama-rules';
import type { ActivityControls, ActivityUI } from './types';
import { DAMA_LEVELS, type DamaDifficulty } from './dama-levels';
import { BOT_APPEARANCES, DEFAULT_PLAYER_NAME } from '../characters';
import { paintCharacterPreview } from '../character-art';
import { COLORS } from '../store';

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

  constructor(private ui: ActivityUI, mode: 'bot' | 'local', resume = false) {
    this.state = resume ? savedDama() ?? initialDama(mode, ui.profile.damaDifficulty) : initialDama(mode, ui.profile.damaDifficulty);
    this.difficulty = this.state.difficulty ?? ui.profile.damaDifficulty;
    this.state.difficulty = this.difficulty;
    this.element = document.createElement('div'); this.element.id = 'dama-stage'; this.element.className = 'dama-stage';
    document.querySelector('#game-shell')!.append(this.element);
    ui.location('dama');
    try {
      this.worker = new Worker(new URL('./dama-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = event => { if (event.data.id === this.request && !this.disposed) this.pending = event.data.move; };
      this.worker.onerror = event => { event.preventDefault(); this.worker?.terminate(); this.worker = undefined; if (this.thinking) this.pending = this.fallbackMove(); };
    } catch { /* The bounded synchronous fallback works if browser workers are unavailable. */ }
    this.tick = window.setInterval(() => {
      if (this.disposed || this.paused || ui.blocked()) return;
      if (this.pending) { const move = this.pending; this.pending = undefined; this.commit(move); }
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
    this.thinking = true; this.render();
    const id = ++this.request;
    if (this.worker) this.worker.postMessage({ id, board: this.state.board, side: this.state.turn, difficulty: this.difficulty });
    else this.pending = this.fallbackMove();
  }

  private fallbackMove() { return chooseDamaMove(this.state.board, this.state.turn, this.difficulty, { nodes: 2000, milliseconds: 45 }) ?? undefined; }

  private commit(move: DamaMove) {
    try { this.state = applyDama(this.state, move); }
    catch { this.thinking = false; this.render(); return; }
    this.lastMove = [move.from, ...move.path]; this.selected = -1; this.prefix = []; this.thinking = false;
    this.ui.sound(move.captures.length ? 'tag' : 'turn'); this.render(); this.save();
    if (this.state.outcome !== null) this.end();
  }

  private click(at: number) {
    if (this.paused || this.ui.blocked() || this.finished || this.state.mode === 'bot' && this.state.turn === -1) return;
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
    if (this.prefix.length) { this.ui.hint('Finish this capture chain: choose a highlighted square.'); return; }
    if (Math.sign(this.state.board[at]) === this.state.turn && this.moves.some(move => move.from === at)) {
      this.selected = at; this.render();
    } else this.ui.hint(this.moves[0]?.captures.length ? 'A capture is required. Choose a glowing piece and follow the longest chain.' : 'Select one of your pieces, then a highlighted destination.');
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
    const turn = this.thinking ? `${opponent.opponent} is thinking…` : `${player} to move`;
    const counts = [this.state.board.filter(piece => piece > 0).length, this.state.board.filter(piece => piece < 0).length];
    this.element.innerHTML = `
      <div class="dama-heading ${this.state.mode === 'bot' ? 'has-portrait' : ''}">${this.state.mode === 'bot' ? `<canvas id="dama-portrait" role="img" aria-label="${opponent.opponent}"></canvas>` : ''}<span class="eyebrow">${this.state.mode === 'bot' ? `${opponent.label.toUpperCase()} · ${opponent.opponent.toUpperCase()}` : 'SA TABI NG TINDAHAN'}</span><strong id="dama-turn" aria-live="polite">${turn}</strong><span>${this.state.mode === 'bot' ? `${DEFAULT_PLAYER_NAME} · Gold / ${opponent.opponent} · Teal` : 'Pass-and-play · Gold / Teal'} · Move ${Math.floor(this.state.ply / 2) + 1}</span></div>
      <div class="dama-table"><div class="dama-board" role="group" aria-label="Dama board, 8 by 8">${board.map((piece, at) => {
        const playable = (Math.floor(at / 8) + at % 8) % 2 === 1;
        const available = this.moves.some(move => move.from === at);
        const name = `${String.fromCharCode(97 + at % 8)}${8 - Math.floor(at / 8)}`;
        const description = piece ? `${piece > 0 ? 'Gold' : 'Teal'} ${Math.abs(piece) === 2 ? 'king' : 'piece'}` : 'empty';
        return `<button class="dama-square ${playable ? 'dark' : 'light'} ${targets.has(at) ? 'legal' : ''} ${at === this.selected || this.prefix.at(-1) === at ? 'selected' : ''} ${this.lastMove.includes(at) ? 'last-move' : ''}" data-square="${at}" aria-label="${name}, ${description}${targets.has(at) ? ', legal destination' : ''}" ${!playable ? 'disabled' : ''}>${piece ? `<span class="dama-piece ${piece > 0 ? 'gold' : 'teal'} ${available && !this.thinking ? 'movable' : ''}">${Math.abs(piece) === 2 ? '<span aria-hidden="true">♛</span>' : ''}</span>` : targets.has(at) ? '<i aria-hidden="true"></i>' : ''}${at >= 56 ? `<small>${String.fromCharCode(97 + at % 8)}</small>` : ''}</button>`;
      }).join('')}</div></div>
      <div class="dama-footer"><span><i class="piece-dot gold"></i> Gold ${counts[0]} <i class="piece-dot teal"></i> Teal ${counts[1]}</span><span id="capture-rule">${this.moves[0]?.captures.length ? `${this.moves[0].captures.length}-piece capture required` : 'Select a piece to see its moves'}</span><button id="dama-resign" class="text-button">Resign match</button><small id="dama-save">Match saved automatically on this device</small></div>`;
    const portrait = this.element.querySelector<HTMLCanvasElement>('#dama-portrait');
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
  }

  private end() {
    if (this.finished) return;
    this.finished = true; this.worker?.terminate();
    const draw = this.state.outcome === 0, won = this.state.outcome === 1;
    const local = this.state.mode === 'local';
    this.ui.result({ game: 'dama', won, draw, practice: local, record: this.state.ply,
      title: draw ? 'A well-played draw.' : local ? `${this.state.outcome === 1 ? 'Gold' : 'Teal'} takes the table.` : won ? 'A clever finish!' : `${DAMA_LEVELS[this.difficulty].opponent} takes this one.`,
      summary: `${draw ? 'Threefold repetition or 40 quiet full moves ends the match.' : 'The match is complete.'} ${local ? 'Pass-and-play is a friendly match; no coins or ranked records are awarded.' : 'Try another match, or take a stroll around the barangay.'}`,
      coins: local ? 0 : draw ? 20 : won ? 60 : 10,
    });
  }

  dispose() { this.disposed = true; clearInterval(this.tick); this.worker?.terminate(); this.element.remove(); }
  setTouch() {} setSprint() {} resetInput() {} action() {} updateAvatar() {}
  setPaused(value: boolean) { this.paused = value; }
}
