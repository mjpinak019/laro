import type { Difficulty } from './rules';
import { DEFAULT_PLAYER_NAME } from './characters.ts';
import { isDamaDifficulty, type DamaDifficulty } from './games/dama-levels.ts';

export const COLORS = ['#e7b65d', '#7fafba', '#ca867b', '#a3af75'] as const;
export type RecordBook = Record<'dama' | 'taguan' | 'tinik', { wins: number; played: number; best: number }>;
const freshRecords = (): RecordBook => ({ dama: { wins: 0, played: 0, best: 0 }, taguan: { wins: 0, played: 0, best: 0 }, tinik: { wins: 0, played: 0, best: 0 } });
export interface Profile {
  name: string;
  color: number;
  coins: number;
  wins: number;
  played: number;
  best: number;
  muted: boolean;
  difficulty: Difficulty;
  damaDifficulty: DamaDifficulty;
  records: RecordBook;
}
export const STORAGE_KEY = 'laro.offline.profile.v1';
export let storageAvailable = true;
const defaults: Profile = { name: DEFAULT_PLAYER_NAME, color: 0, coins: 0, wins: 0, played: 0, best: 0, muted: false, difficulty: 'easy', damaDifficulty: 'easy', records: freshRecords() };
const number = (value: unknown, max = 1_000_000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;

export function loadProfile(): Profile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let raw: Partial<Profile>;
    try { raw = JSON.parse(stored || '{}') ?? {}; }
    catch { return { ...defaults, records: freshRecords() }; }
    const records = freshRecords();
    for (const id of ['dama', 'taguan', 'tinik'] as const) {
      const item = raw.records?.[id];
      records[id] = { wins: number(item?.wins), played: number(item?.played), best: number(item?.best, id === 'tinik' ? 6 : id === 'taguan' ? 75 : 10000) };
    }
    return {
      name: typeof raw.name === 'string' && raw.name.trim() && raw.name.trim() !== 'Kaibigan' ? raw.name.trim().slice(0, 16) : defaults.name,
      color: number(raw.color, 3), coins: number(raw.coins), wins: number(raw.wins), played: number(raw.played),
      best: number(raw.best, 90), muted: typeof raw.muted === 'boolean' ? raw.muted : false,
      difficulty: raw.difficulty === 'hard' ? 'hard' : raw.difficulty === 'normal' ? 'normal' : 'easy',
      damaDifficulty: isDamaDifficulty(raw.damaDifficulty) ? raw.damaDifficulty : isDamaDifficulty(raw.difficulty) ? raw.difficulty : 'easy',
      records,
    };
  } catch { storageAvailable = false; return { ...defaults, records: freshRecords() }; }
}

export function saveProfile(profile: Profile): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); storageAvailable = true; }
  catch { storageAvailable = false; }
}
