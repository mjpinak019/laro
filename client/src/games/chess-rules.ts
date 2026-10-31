import { Chess, type Move, type PieceSymbol } from 'chess.js';
import type { Difficulty } from '../rules.ts';

const VALUES: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const priority = (move: Move) => (move.captured ? VALUES[move.captured] * 10 - VALUES[move.piece] : 0) + (move.promotion ? VALUES[move.promotion] : 0);
function evaluate(game: Chess) {
  let value = 0;
  for (const row of game.board()) for (const piece of row) if (piece) {
    const rank = Number(piece.square[1]), file = piece.square.charCodeAt(0) - 97;
    const center = 7 - Math.abs(file - 3.5) - Math.abs(rank - 4.5);
    const advance = piece.color === 'w' ? rank - 2 : 7 - rank;
    value += (piece.color === game.turn() ? 1 : -1) * (VALUES[piece.type] + (piece.type === 'p' ? advance * 6 : piece.type === 'k' ? 0 : center * 5));
  }
  return value;
}

/** Beginner opponents share the exact legal rules used by the board. Search
 * always undoes moves, and discards an incomplete iteration at the budget. */
export function chooseChessMove(game: Chess, difficulty: Difficulty, budget = { nodes: 1400, milliseconds: 55 }): Move | null {
  if (game.isGameOver()) return null;
  const moves = game.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a));
  let best = moves[0], nodes = 0;
  const deadline = performance.now() + budget.milliseconds, exhausted = {};
  function search(depth: number, alpha: number, beta: number, ply: number): number {
    if (++nodes > budget.nodes || performance.now() >= deadline) throw exhausted;
    if (game.isCheckmate()) return -100000 + ply;
    if (game.isDraw()) return 0;
    if (!depth) return evaluate(game);
    let value = -Infinity;
    for (const move of game.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a))) {
      game.move(move);
      let score: number;
      try { score = -search(depth - 1, -beta, -alpha, ply + 1); } finally { game.undo(); }
      value = Math.max(value, score); alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return value;
  }
  const maxDepth = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let candidate = best, value = -Infinity;
    try {
      for (const move of moves) {
        game.move(move);
        let score: number;
        try { score = -search(depth - 1, -Infinity, -value, 1); } finally { game.undo(); }
        if (score > value) { value = score; candidate = move; }
      }
      best = candidate;
    } catch (error) { if (error !== exhausted) throw error; break; }
  }
  return best;
}
