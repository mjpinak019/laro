import { CHARACTERS } from '../characters.ts';

export const DAMA_LEVELS = {
  easy: { label: 'Easy', character: 'mamaShoni', opponent: CHARACTERS.mamaShoni, depth: 1, nodes: 500, milliseconds: 30, hint: `Learn the board with ${CHARACTERS.mamaShoni}.` },
  normal: { label: 'Normal', character: 'audrey', opponent: CHARACTERS.audrey, depth: 4, nodes: 4500, milliseconds: 100, hint: `${CHARACTERS.audrey} looks for your next move.` },
  hard: { label: 'Hard', character: 'mj', opponent: CHARACTERS.mj, depth: 5, nodes: 12000, milliseconds: 220, hint: `${CHARACTERS.mj} is ready for a serious match.` },
  expert: { label: 'Expert', character: 'ferdie', opponent: CHARACTERS.ferdie, depth: 7, nodes: 50000, milliseconds: 550, hint: `${CHARACTERS.ferdie} sets traps and plans further ahead.` },
  master: { label: 'Master', character: 'tatayEfren', opponent: CHARACTERS.tatayEfren, depth: 9, nodes: 150000, milliseconds: 1100, hint: `${CHARACTERS.tatayEfren} brings his strongest game. Take your time.` },
} as const;
export type DamaDifficulty = keyof typeof DAMA_LEVELS;
export const isDamaDifficulty = (value: unknown): value is DamaDifficulty => typeof value === 'string' && Object.hasOwn(DAMA_LEVELS, value);
