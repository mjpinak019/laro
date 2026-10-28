import { chooseDamaMove, type Board, type Side } from './dama-rules';
import type { DamaDifficulty } from './dama-levels';

self.onmessage = (event: MessageEvent<{ id: number; board: Board; side: Side; difficulty: DamaDifficulty }>) => {
  const { id, board, side, difficulty } = event.data;
  self.postMessage({ id, move: chooseDamaMove(board, side, difficulty) });
};
