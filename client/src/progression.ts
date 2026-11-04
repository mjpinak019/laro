import type { Profile } from './store.ts';

export const MAX_LEVEL = 30;
export const xpForLevel = (level: number) => { const n = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level))); return 100*n + 15*n*(n-1) + 5*(n-1)*n*(2*n-1)/6; };
export const MAX_XP = xpForLevel(MAX_LEVEL);
export const GAME_LEVELS = { patintero: 0, tinik: 0, dama: 0, piko: 2, tictactoe: 2, taguan: 3, snake: 4, jolen: 5, langit: 6, lubid: 7, crossword: 8, tumbang: 9, impact: 10, sudoku: 11, chess: 12 } as const;
export const gameUnlocked = (xp: number, game: keyof typeof GAME_LEVELS) => playerLevel(xp).level >= GAME_LEVELS[game];
export function playerLevel(xp: number) {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.min(MAX_XP, Math.floor(xp))) : 0;
  let level = 0; while (level < MAX_LEVEL && safe >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level), next = xpForLevel(level + 1), capped = level === MAX_LEVEL;
  const titles = ['Bagong Kalaro', 'Kalaro sa Kanto', 'Barkada Regular', 'Barangay Star', 'Alamat ng Laro'];
  return { level, xp: safe, current: capped ? 1 : safe - floor, needed: capped ? 1 : next - floor, next, capped, title: titles[Math.min(4, Math.floor(level / 6))] };
}
/** Credit old completed rounds, once through normalization; never infer XP from coins or purchases. */
export function legacyXp(profile: Pick<Profile, 'played' | 'wins' | 'records'>) {
  let xp = profile.played * 20 + Math.min(profile.played, profile.wins) * 40;
  for (const record of Object.values(profile.records)) xp += record.played * 20 + Math.min(record.played, record.wins) * 40;
  return Math.min(MAX_XP, xp);
}
export function awardXp(profile: Pick<Profile, 'xp'>, result: { won: boolean; draw?: boolean; practice?: boolean; failure?: boolean; record?: number; xp?:number }) {
  if (result.practice) return 0;
  // Endless manual cash-outs with no score don't become a repeatable XP shortcut.
  if (result.failure === false && !result.won && !result.record) return 0;
  const earned = typeof result.xp==='number'&&Number.isFinite(result.xp)?Math.max(0,Math.min(120,Math.floor(result.xp))):result.won ? 60 : result.draw ? 35 : 20;
  const before = profile.xp; profile.xp = Math.min(MAX_XP, Math.max(0, profile.xp) + earned);
  return profile.xp - before;
}
