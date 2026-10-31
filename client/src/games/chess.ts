import { Chess, type Move, type Square, type PieceSymbol } from 'chess.js';
import { chooseChessMove } from './chess-rules';
import { chessPiece } from './chess-pieces';
import type { ActivityControls, ActivityUI } from './types';

const NAMES: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export class ChessGame implements ActivityControls {
  private readonly difficulty: ActivityUI['profile']['chessDifficulty'];
  private game = new Chess();
  private root = document.createElement('div');
  private selected?: Square;
  private promotion?: Move[];
  private paused = false;
  private finished = false;
  private disposed = false;
  private nextBotAt = 0;
  private lastMove?: Move;
  private tick: number;

  constructor(private ui: ActivityUI, private mode: 'bot' | 'local') {
    this.difficulty = ui.profile.chessDifficulty;
    this.root.id = 'chess-stage'; this.root.className = 'chess-stage';
    document.querySelector('#game-shell')!.append(this.root);
    ui.location('chess'); this.render();
    this.tick = window.setInterval(() => {
      if (this.disposed || this.finished || this.paused || ui.blocked() || mode !== 'bot' || this.game.turn() !== 'b' || performance.now() < this.nextBotAt) return;
      const move = chooseChessMove(this.game, this.difficulty);
      if (move) this.commit(move);
    }, 150);
  }

  private blocked() { return this.disposed || this.finished || this.paused || this.ui.blocked(); }
  private click(square: Square) {
    if (this.blocked() || this.promotion || this.mode === 'bot' && this.game.turn() === 'b') return;
    if (this.selected) {
      const moves = this.game.moves({ square: this.selected, verbose: true }).filter(move => move.to === square);
      if (moves.length) {
        if (moves[0].promotion) { this.promotion = moves; this.render(); } else this.commit(moves[0]);
        return;
      }
    }
    if (this.game.get(square)?.color === this.game.turn()) { this.selected = square; this.render(); }
    else { this.ui.failure?.('mistake'); this.ui.hint('Choose your piece, then a highlighted legal square. Your king must stay safe.'); }
  }

  private commit(move: Move) {
    this.lastMove = this.game.move(move); this.selected = undefined; this.promotion = undefined;
    this.ui.sound(move.captured ? 'tag' : 'turn'); this.nextBotAt = performance.now() + 650; this.render();
    if (this.game.isGameOver()) this.end();
  }

  private end(resigned = false) {
    if (this.finished) return;
    this.finished = true;
    const draw = !resigned && this.game.isDraw();
    const winner = resigned ? this.mode === 'bot' ? 'b' : this.game.turn() === 'w' ? 'b' : 'w' : this.game.turn() === 'w' ? 'b' : 'w';
    const won = !draw && winner === 'w', local = this.mode === 'local';
    const reason = resigned ? 'Resignation' : this.game.isCheckmate() ? 'Checkmate' : this.game.isStalemate() ? 'Stalemate' : this.game.isThreefoldRepetition() ? 'Threefold repetition' : this.game.isInsufficientMaterial() ? 'Insufficient material' : 'Fifty-move rule';
    this.render();
    this.ui.result({ game: 'chess', won, draw, practice: local, coins: local ? 0 : draw ? 20 : won ? 60 : 10, record: this.game.history().length,
      title: draw ? 'A well-played draw.' : `${winner === 'w' ? 'White' : 'Black'} wins at the table.`,
      summary: `${reason}. ${local ? 'Friendly pass-and-play has no coins or records.' : 'Take another seat at the Dama table for a rematch.'}` });
  }

  private render() {
    const turn = this.game.turn() === 'w' ? 'White' : 'Black';
    const thinking = this.mode === 'bot' && this.game.turn() === 'b' && !this.finished;
    const targets = new Set(this.selected ? this.game.moves({ square: this.selected, verbose: true }).map(move => move.to) : []);
    this.root.dataset.turn = this.game.turn(); this.root.dataset.ply = String(this.game.history().length);
    this.root.dataset.mode = this.mode; this.root.dataset.difficulty = this.difficulty;
    this.root.innerHTML = `<div class="chess-heading"><span class="eyebrow">CHESS · SA TABI NG TINDAHAN</span><strong id="chess-turn" role="status">${this.finished ? 'Match complete' : thinking ? 'Black is thinking…' : `${turn} to move`}${!this.finished && this.game.inCheck() ? ' · CHECK' : ''}</strong><span>${this.mode === 'local' ? 'Pass-and-play · White / Black' : `${this.difficulty.toUpperCase()} BOT · You play White`}</span><small>Move ${Math.floor(this.game.history().length / 2) + 1}</small></div>
      <div class="chess-table"><div class="chess-board" role="group" aria-label="Chess board, 8 by 8" aria-busy="${thinking}">${this.game.board().flatMap((row, r) => row.map((piece, f) => {
        const square = `${String.fromCharCode(97 + f)}${8 - r}` as Square;
        const name = piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${NAMES[piece.type]}` : 'empty';
        return `<button type="button" data-chess-square="${square}" class="chess-square ${(r + f) % 2 ? 'dark' : 'light'} ${this.selected === square ? 'selected' : ''} ${targets.has(square) ? 'legal' : ''} ${this.lastMove?.from === square || this.lastMove?.to === square ? 'last-move' : ''}" aria-label="${square}, ${name}${targets.has(square) ? ', legal destination' : ''}" aria-pressed="${this.selected === square}">${piece ? chessPiece(piece.type, piece.color) : targets.has(square) ? '<i aria-hidden="true"></i>' : ''}</button>`;
      })).join('')}</div></div>
      <div class="chess-footer">${this.promotion ? `<div class="chess-promotion" role="group" aria-label="Choose promotion"><strong>Promote pawn to</strong>${this.promotion.map(move => `<button type="button" data-promote="${move.promotion}">${NAMES[move.promotion!]}</button>`).join('')}</div>` : ''}<span id="chess-last-move">${this.lastMove ? `Last move: ${this.lastMove.san}` : 'Select a piece to see its legal moves.'}</span><p>Castling, en passant, and all four promotion choices are supported.</p><button id="chess-resign" class="secondary-button" ${this.finished ? 'disabled' : ''}>Resign match</button><small>Leaving ends this match. Completed bot matches save coins and records.</small></div>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-chess-square]').forEach(button => {
      button.onclick = () => this.click(button.dataset.chessSquare as Square);
      button.onkeydown = event => {
        const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[event.key];
        if (offset === undefined) return; event.preventDefault();
        const buttons = [...this.root.querySelectorAll<HTMLButtonElement>('[data-chess-square]')], at = buttons.indexOf(button), next = at + offset;
        if (next >= 0 && next < 64 && (Math.abs(offset) !== 1 || Math.floor(at / 8) === Math.floor(next / 8))) buttons[next].focus();
      };
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-promote]').forEach(button => { button.onclick = () => { if (!this.blocked()) this.commit(this.promotion!.find(move => move.promotion === button.dataset.promote)!); }; });
    this.root.querySelector<HTMLButtonElement>('#chess-resign')!.onclick = () => {
      if (this.blocked()) return;
      const button = this.root.querySelector<HTMLButtonElement>('#chess-resign')!;
      if (button.dataset.confirm === 'true') this.end(true);
      else { button.dataset.confirm = 'true'; button.textContent = 'Confirm resignation'; }
    };
    const gameElement = document.querySelector<HTMLElement>('#game')!;
    gameElement.dataset.mode = 'chess'; gameElement.dataset.phase = this.finished ? 'finished' : 'playing';
    this.ui.hint(this.game.inCheck() ? `${turn} is in check. Protect the king.` : 'Select a piece, then a highlighted square. White moves first.');
  }
  dispose() { this.disposed = true; clearInterval(this.tick); this.root.remove(); }
  setPaused(value: boolean) { this.paused = value; }
  setTouch() {} setSprint() {} resetInput() {} action() {} updateAvatar() {}
}
