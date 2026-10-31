import type { Difficulty } from './rules';
import { DEFAULT_PLAYER_NAME, type AvatarGender } from './characters.ts';
import { isDamaDifficulty, type DamaDifficulty } from './games/dama-levels.ts';
import { freshWardrobe, normalizeWardrobe, type Wardrobe } from './wardrobe.ts';

export const COLORS = ['#e7b65d', '#7fafba', '#ca867b', '#a3af75'] as const;
export const RECORD_IDS = ['dama', 'chess', 'taguan', 'tinik', 'jolen', 'lubid', 'snake', 'impact', 'piko', 'tumbang'] as const;
export type RecordBook = Record<typeof RECORD_IDS[number], { wins: number; played: number; best: number }>;
const freshRecords = (): RecordBook => Object.fromEntries(RECORD_IDS.map(id => [id, { wins: 0, played: 0, best: 0 }])) as RecordBook;
export interface Profile {
  name: string;
  color: number;
  gender: AvatarGender;
  coins: number;
  wins: number;
  played: number;
  best: number;
  muted: boolean;
  difficulty: Difficulty;
  damaDifficulty: DamaDifficulty;
  jolenDifficulty: DamaDifficulty;
  chessDifficulty: Difficulty;
  records: RecordBook;
  wardrobe: Wardrobe;
  phoneFinds: number;
  vibration: boolean;
  volume: number;
  musicVolume: number;
  musicEnabled: boolean;
  tutorialPrompts: boolean;
  snacksEaten: number;
}
export const STORAGE_KEY = 'laro.offline.profile.v1';
export let storageAvailable = true;
const defaults: Profile = { name: DEFAULT_PLAYER_NAME, color: 0, gender: 'boy', coins: 0, wins: 0, played: 0, best: 0, muted: false, difficulty: 'easy', damaDifficulty: 'easy', jolenDifficulty: 'easy', chessDifficulty: 'easy', records: freshRecords(), wardrobe: freshWardrobe(), phoneFinds: 0, vibration: true, volume: .65, musicVolume: .35, musicEnabled: true, tutorialPrompts: true, snacksEaten: 0 };
const freshProfile = (): Profile => ({ ...defaults, records: freshRecords(), wardrobe: freshWardrobe() });
const number = (value: unknown, max = 1_000_000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;

export function normalizeProfile(value: unknown): Profile {
    const raw: Partial<Profile> = value && typeof value === 'object' ? value : {};
    const records = freshRecords();
    for (const id of RECORD_IDS) {
      const item = raw.records?.[id];
      records[id] = { wins: number(item?.wins), played: number(item?.played), best: number(item?.best, id === 'lubid' || id === 'impact' ? Number.MAX_SAFE_INTEGER : id === 'piko' ? 8 : id === 'tumbang' ? 6 : id === 'jolen' ? 15 : id === 'tinik' ? 6 : id === 'taguan' ? 75 : 10000) };
    }
    return {
      name: typeof raw.name === 'string' && raw.name.trim() && raw.name.trim() !== 'Kaibigan' ? raw.name.trim().slice(0, 16) : defaults.name,
      color: number(raw.color, 3), coins: number(raw.coins), wins: number(raw.wins), played: number(raw.played),
      gender: raw.gender === 'girl' ? 'girl' : 'boy',
      best: number(raw.best, 90), muted: typeof raw.muted === 'boolean' ? raw.muted : false,
      difficulty: raw.difficulty === 'hard' ? 'hard' : raw.difficulty === 'normal' ? 'normal' : 'easy',
      damaDifficulty: isDamaDifficulty(raw.damaDifficulty) ? raw.damaDifficulty : isDamaDifficulty(raw.difficulty) ? raw.difficulty : 'easy',
      jolenDifficulty: isDamaDifficulty(raw.jolenDifficulty) ? raw.jolenDifficulty : 'easy',
      chessDifficulty: raw.chessDifficulty === 'hard' ? 'hard' : raw.chessDifficulty === 'normal' ? 'normal' : 'easy',
      records,
      wardrobe: normalizeWardrobe(raw.wardrobe), phoneFinds: number(raw.phoneFinds),
      vibration: typeof raw.vibration === 'boolean' ? raw.vibration : true,
      volume: typeof raw.volume === 'number' && Number.isFinite(raw.volume) ? Math.max(0, Math.min(1, raw.volume)) : defaults.volume,
      musicVolume: typeof raw.musicVolume === 'number' && Number.isFinite(raw.musicVolume) ? Math.max(0, Math.min(1, raw.musicVolume)) : defaults.musicVolume,
      musicEnabled: typeof raw.musicEnabled === 'boolean' ? raw.musicEnabled : true,
      tutorialPrompts: typeof raw.tutorialPrompts === 'boolean' ? raw.tutorialPrompts : true,
      snacksEaten: number(raw.snacksEaten),
    };
}
export function loadProfile(): Profile {
  try { const stored = localStorage.getItem(STORAGE_KEY); try { return normalizeProfile(JSON.parse(stored || '{}')); } catch { return freshProfile(); } }
  catch { storageAvailable = false; return freshProfile(); }
}

export function saveProfile(profile: Profile): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); storageAvailable = true; return true; }
  catch { storageAvailable = false; return false; }
}
