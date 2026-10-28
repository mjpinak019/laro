import { chooseDamaMove, type Board, type Side } from './dama-rules';

self.onmessage = (event: MessageEvent<{ id: number; board: Board; side: Side; difficulty: 'easy' | 'normal' | 'hard' }>) => {
  const { id, board, side, difficulty } = event.data;
  self.postMessage({ id, move: chooseDamaMove(board, side, difficulty) });
};
