import type { Profile } from '../store';

export type GameId = 'patintero' | 'dama' | 'taguan' | 'tinik' | 'jolen';
export type NewGameId = Exclude<GameId, 'patintero'>;
export type Sound = 'step' | 'tag' | 'turn' | 'win' | 'emote';
export type Result = { game: NewGameId; won: boolean; draw?: boolean; title: string; summary: string; coins: number; record: number; practice?: boolean };
export type HUD = { left: string; objective: string; right: string; countdown?: number };
export interface ActivityUI {
  profile: Profile;
  blocked(): boolean;
  location(game: NewGameId): void;
  hud(value: HUD): void;
  hint(text: string): void;
  sound(kind: Sound): void;
  result(value: Result): void;
}
export interface ActivityControls {
  setTouch(x: number, y: number): void;
  setSprint(value: boolean): void;
  setPaused(value: boolean): void;
  resetInput(): void;
  action(): void;
  updateAvatar(): void;
}
export const GAMES: Record<GameId, { title: string; description: string; tags: string[]; category: string; record: string }> = {
  jolen: { title: 'Jolen', description: 'Aim from where your marble lands. Time the fast power bar and knock targets out of the chalk circle.', tags: ['15 target marbles', '5 bot opponents'], category: 'AIMING GAME · SOLO + BOT', record: 'MOST MARBLES' },
  patintero: { title: 'Patintero', description: 'Quick feet. Good timing. Cross the lines. Make it home.', tags: ['90-second rounds', '4 bot guards'], category: 'STREET GAME · SOLO + BOTS', record: 'BEST TIME' },
  dama: { title: 'Dama', description: 'Five neighbors. Five levels. Take a seat and choose your opponent at the wooden table.', tags: ['5 unique opponents', 'Bot or pass-and-play'], category: 'BOARD GAME · 1–2 PLAYERS', record: 'MATCHES' },
  taguan: { title: 'Tagu-taguan', description: 'Hide among laundry, bamboo, crates, and hedges. The search gets sharper as the clock runs down.', tags: ['75-second search', '7 cover areas'], category: 'HIDE & SEEK · SOLO + BOT', record: 'SURVIVED' },
  tinik: { title: 'Luksong-tinik', description: 'New heights. New timing. Read the run-up and find your takeoff point before every jump.', tags: ['6 varied jumps', 'Easy · Normal · Hard'], category: 'JUMPING GAME · SOLO', record: 'BEST HEIGHT' },
};
