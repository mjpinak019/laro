import { DAMA_LEVELS, isDamaDifficulty, type DamaDifficulty } from './dama-levels.ts';

export type Side = 1 | -1;
export type Piece = 0 | 1 | 2 | -1 | -2;
export type Board = Piece[];
export type DamaMove = { from: number; path: number[]; captures: number[] };
export type DamaState = { board: Board; turn: Side; quiet: number; ply: number; history: string[]; outcome: Side | 0 | null; mode: 'bot' | 'local'; difficulty?: DamaDifficulty };
const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const index = (r: number, c: number) => r * 8 + c;
export const positionKey = (board: Board, turn: Side) => `${board.join(',')}:${turn}`;

export function initialDama(mode: 'bot' | 'local' = 'bot', difficulty: DamaDifficulty = 'easy'): DamaState {
  const board: Board = Array<Piece>(64).fill(0);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2) board[index(r, c)] = r < 3 ? -1 : r > 4 ? 1 : 0;
  }
  return { board, turn: 1, quiet: 0, ply: 0, history: [positionKey(board, 1)], outcome: null, mode, difficulty };
}

function capturePaths(board: Board, origin: number): DamaMove[] {
  const results: DamaMove[] = [];
  const piece = board[origin];
  function visit(current: Board, at: number, path: number[], captured: number[]) {
    let extended = false;
    const r = Math.floor(at / 8), c = at % 8;
    for (const [dr, dc] of directions) {
      const king = Math.abs(piece) === 2;
      let nr = r + dr, nc = c + dc;
      if (king) while (inside(nr, nc) && current[index(nr, nc)] === 0) { nr += dr; nc += dc; }
      if (!inside(nr, nc)) continue;
      const victim = index(nr, nc);
      if (!current[victim] || Math.sign(current[victim]) === Math.sign(piece) || captured.includes(victim)) continue;
      nr += dr; nc += dc;
      while (inside(nr, nc) && current[index(nr, nc)] === 0) {
        extended = true;
        const landing = index(nr, nc);
        const next = current.slice(); next[at] = 0; next[landing] = piece;
        // Captured pieces remain blockers until the complete sequence ends.
        visit(next, landing, [...path, landing], [...captured, victim]);
        if (!king) break;
        nr += dr; nc += dc;
      }
    }
    if (!extended && captured.length) results.push({ from: origin, path, captures: captured });
  }
  visit(board, origin, [], []);
  return results;
}

export function legalMoves(board: Board, side: Side): DamaMove[] {
  const captures: DamaMove[] = [];
  for (let from = 0; from < 64; from++) if (Math.sign(board[from]) === side) captures.push(...capturePaths(board, from));
  if (captures.length) {
    const maximum = Math.max(...captures.map(move => move.captures.length));
    return captures.filter(move => move.captures.length === maximum);
  }
  const moves: DamaMove[] = [];
  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (Math.sign(piece) !== side) continue;
    const king = Math.abs(piece) === 2;
    for (const [dr, dc] of directions) {
      if (!king && dr !== -side) continue;
      let r = Math.floor(from / 8) + dr, c = from % 8 + dc;
      while (inside(r, c) && !board[index(r, c)]) {
        moves.push({ from, path: [index(r, c)], captures: [] });
        if (!king) break;
        r += dr; c += dc;
      }
    }
  }
  return moves;
}

export function moveBoard(board: Board, move: DamaMove): Board {
  const next = board.slice(); const piece = next[move.from];
  next[move.from] = 0;
  move.captures.forEach(at => { next[at] = 0; });
  const end = move.path[move.path.length - 1];
  next[end] = Math.abs(piece) === 1 && Math.floor(end / 8) === (piece > 0 ? 0 : 7) ? (piece * 2) as Piece : piece;
  return next;
}

export function applyDama(state: DamaState, requested: DamaMove): DamaState {
  if (state.outcome !== null) throw new Error('This match has ended.');
  const move = legalMoves(state.board, state.turn).find(candidate => candidate.from === requested.from && candidate.path.join(',') === requested.path.join(','));
  if (!move) throw new Error('That is not a legal move.');
  const quiet = move.captures.length || Math.abs(state.board[move.from]) === 1 ? 0 : state.quiet + 1;
  const board = moveBoard(state.board, move), turn = -state.turn as Side;
  const key = positionKey(board, turn), history = [...state.history, key];
  const outcome = !legalMoves(board, turn).length ? state.turn : quiet >= 80 || history.filter(item => item === key).length >= 3 ? 0 : null;
  return { ...state, board, turn, quiet, ply: state.ply + 1, history, outcome };
}

function evaluate(board: Board, side: Side): number {
  return board.reduce<number>((score, piece, at) => {
    if (!piece) return score;
    const r = Math.floor(at / 8), c = at % 8;
    const value = Math.abs(piece) === 2 ? 330 : 100 + (piece > 0 ? 7 - r : r) * 5;
    return score + Math.sign(piece) * side * (value + (c > 1 && c < 6 ? 4 : 0));
  }, 0);
}

export function chooseDamaMove(board: Board, side: Side, difficulty: DamaDifficulty, limits?: { nodes?: number; milliseconds?: number }): DamaMove | null {
  const moves = legalMoves(board, side);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  const config = DAMA_LEVELS[difficulty];
  const maxNodes = Math.min(config.nodes, limits?.nodes ?? config.nodes);
  const deadline = performance.now() + Math.min(config.milliseconds, limits?.milliseconds ?? config.milliseconds);
  const stopped = Symbol('search budget reached');
  const table = new Map<string, { depth: number; score: number; flag: 'exact' | 'lower' | 'upper' }>();
  let nodes = 0;
  function ordered(current: Board, options: DamaMove[], turn: Side) {
    return options.map(move => ({ move, next: moveBoard(current, move) })).sort((a, b) => b.move.captures.length * 1000 + evaluate(b.next, turn) - a.move.captures.length * 1000 - evaluate(a.next, turn));
  }
  function search(current: Board, turn: Side, depth: number, alpha: number, beta: number, ply: number, extensions = 0): number {
    if (++nodes > maxNodes || (nodes % 64 === 0 && performance.now() >= deadline)) throw stopped;
    const options = legalMoves(current, turn);
    if (!options.length) return -100_000 + ply;
    // Strong opponents finish forced capture exchanges before evaluating a leaf.
    if (depth <= 0) {
      if ((difficulty === 'expert' || difficulty === 'master') && options[0].captures.length && extensions < 4) { depth = 1; extensions++; }
      else return evaluate(current, turn);
    }
    const key = `${positionKey(current, turn)}:${ply}:${extensions}`;
    const cached = table.get(key), startAlpha = alpha, startBeta = beta;
    if (cached && cached.depth >= depth) {
      if (cached.flag === 'exact') return cached.score;
      if (cached.flag === 'lower') alpha = Math.max(alpha, cached.score); else beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }
    let value = -Infinity;
    for (const option of ordered(current, options, turn)) {
      const score = -search(option.next, -turn as Side, depth - 1, -beta, -alpha, ply + 1, extensions);
      value = Math.max(value, score); alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    table.set(key, { depth, score: value, flag: value <= startAlpha ? 'upper' : value >= startBeta ? 'lower' : 'exact' });
    return value;
  }
  let roots = ordered(board, moves, side), best = roots[0].move;
  // Keep only completed iterations, so a budget limit never favors the first
  // few root moves over unsearched alternatives.
  for (let depth = 1; depth <= config.depth; depth++) {
    let candidate = best, score = -Infinity;
    try {
      for (const option of roots) {
        const value = -search(option.next, -side as Side, depth - 1, -Infinity, -score, 1);
        if (value > score) { score = value; candidate = option.move; }
      }
    } catch (error) { if (error === stopped) break; throw error; }
    best = candidate;
    roots = [...roots.filter(option => option.move === best), ...roots.filter(option => option.move !== best)];
    if (score > 90_000 || performance.now() >= deadline) break;
  }
  return best;
}

export function validDamaSave(value: unknown): value is DamaState {
  if (!value || typeof value !== 'object') return false;
  const state = value as DamaState;
  return Array.isArray(state.board) && state.board.length === 64 && state.board.every((piece, at) => [0, 1, 2, -1, -2].includes(piece) && (!piece || (Math.floor(at / 8) + at % 8) % 2 === 1))
    && state.board.filter(piece => piece > 0).length <= 12 && state.board.filter(piece => piece < 0).length <= 12
    && [1, -1].includes(state.turn) && state.outcome === null && ['bot', 'local'].includes(state.mode)
    && (state.difficulty === undefined || isDamaDifficulty(state.difficulty))
    && Number.isInteger(state.ply) && state.ply >= 0 && state.ply < 10000
    && Number.isInteger(state.quiet) && state.quiet >= 0 && state.quiet < 80
    && Array.isArray(state.history) && state.history.length === state.ply + 1
    && state.history.every(key => typeof key === 'string' && key.length < 200)
    && state.history.at(-1) === positionKey(state.board, state.turn) && legalMoves(state.board, state.turn).length > 0;
}
