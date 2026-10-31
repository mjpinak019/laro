import type { Difficulty } from '../rules.ts';

export type PikoSquare = { number: number; x: number; y: number; width: number; height: number };
export const PIKO_SQUARES: PikoSquare[] = [
  { number: 1, x: 410, y: 420, width: 80, height: 55 },
  { number: 2, x: 410, y: 365, width: 80, height: 55 },
  { number: 3, x: 410, y: 310, width: 80, height: 55 },
  { number: 4, x: 370, y: 255, width: 80, height: 55 },
  { number: 5, x: 450, y: 255, width: 80, height: 55 },
  { number: 6, x: 410, y: 200, width: 80, height: 55 },
  { number: 7, x: 370, y: 145, width: 80, height: 55 },
  { number: 8, x: 450, y: 145, width: 80, height: 55 },
  { number: 9, x: 410, y: 90, width: 80, height: 55 },
];
export const PIKO_LEVELS = {
  easy: { period: 1.65, window: .24, margin: 6, guide: true },
  normal: { period: 1.35, window: .16, margin: 9, guide: true },
  hard: { period: 1.1, window: .105, margin: 12, guide: false },
} as const;
export const pikoPower = (time: number) => { const t = (time % 1.6) / .8; return t <= 1 ? t : 2 - t; };
export const pikoCenter = (number: number) => { const s = PIKO_SQUARES[number - 1]; return { x: s.x + s.width / 2, y: s.y + s.height / 2 }; };
export function pikoLanding(aim: { x: number; y: number }, power: number) {
  return { x: aim.x, y: aim.y + (.65 - power) * 240 };
}
export function pikoInside(number: number, landing: { x: number; y: number }, difficulty: Difficulty) {
  const s = PIKO_SQUARES[number - 1], m = PIKO_LEVELS[difficulty].margin;
  return landing.x >= s.x + m && landing.x <= s.x + s.width - m && landing.y >= s.y + m && landing.y <= s.y + s.height - m;
}
export type PikoHop = { squares: number[]; feet: 1 | 2; returning: boolean };
export function pikoRoute(marker: number, difficulty: Difficulty = 'easy'): PikoHop[] {
  const rows = [[1], [2], [3], [4, 5], [6], [7, 8], [9]].map(row => row.filter(n => n !== marker)).filter(row => row.length);
  const lap = [...rows.map(squares => ({ squares, feet: squares.length as 1 | 2, returning: false })), ...rows.slice(0, -1).reverse().map(squares => ({ squares, feet: squares.length as 1 | 2, returning: true }))];
  return difficulty === 'hard' && marker >= 5 ? [...lap, ...lap] : lap;
}
export function judgePikoHop(time: number, feet: 1 | 2, hop: PikoHop, difficulty: Difficulty): 'clear' | 'early' | 'late' | 'feet' {
  if (feet !== hop.feet) return 'feet';
  const level = PIKO_LEVELS[difficulty], delta = time - level.period * .65;
  return Math.abs(delta) <= level.window ? 'clear' : delta < 0 ? 'early' : 'late';
}
