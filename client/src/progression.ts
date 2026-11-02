import type { Profile } from './store.ts';

export const MAX_XP = 100_000_000;
export const xpForLevel = (level: number) => 50 * Math.max(0, Math.floor(level) - 1) * Math.max(0, Math.floor(level));
export function playerLevel(xp: number) {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.min(MAX_XP, Math.floor(xp))) : 0;
  const level = Math.floor((1 + Math.sqrt(1 + 4 * safe / 50)) / 2);
  const floor = xpForLevel(level), next = xpForLevel(level + 1);
  const titles = ['Bagong Kalaro', 'Kalaro sa Kanto', 'Barkada Regular', 'Barangay Star', 'Alamat ng Laro'];
  return { level, xp: safe, current: safe - floor, needed: next - floor, next, title: titles[Math.min(4, Math.floor((level - 1) / 5))] };
}
/** Credit old completed rounds, once through normalization; never infer XP from coins or purchases. */
export function legacyXp(profile: Pick<Profile, 'played' | 'wins' | 'records'>) {
  let xp = profile.played * 20 + Math.min(profile.played, profile.wins) * 40;
  for (const record of Object.values(profile.records)) xp += record.played * 20 + Math.min(record.played, record.wins) * 40;
  return Math.min(MAX_XP, xp);
}
export function awardXp(profile: Pick<Profile, 'xp'>, result: { won: boolean; draw?: boolean; practice?: boolean; failure?: boolean; record?: number }) {
  if (result.practice) return 0;
  // Endless manual cash-outs with no score don't become a repeatable XP shortcut.
  if (result.failure === false && !result.won && !result.record) return 0;
  const earned = result.won ? 60 : result.draw ? 35 : 20;
  profile.xp = Math.min(MAX_XP, Math.max(0, profile.xp) + earned);
  return earned;
}
