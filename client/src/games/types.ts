import type { Profile } from '../store';

export type GameId = 'patintero' | 'dama' | 'taguan' | 'tinik' | 'jolen' | 'lubid' | 'snake' | 'impact';
export const PUBLIC_GAMES: GameId[] = ['jolen', 'patintero', 'dama', 'taguan', 'tinik', 'lubid'];
export type NewGameId = Exclude<GameId, 'patintero'>;
export type Sound = 'step' | 'tag' | 'turn' | 'win' | 'emote';
export type FailureKind = 'mistake' | 'hit' | 'loss';
export type Result = { game: NewGameId; won: boolean; draw?: boolean; title: string; summary: string; coins: number; record: number; practice?: boolean; failure?: boolean };
export type HUD = { left: string; objective: string; right: string; countdown?: number };
export interface ActivityUI {
  profile: Profile;
  blocked(): boolean;
  location(game: NewGameId): void;
  hud(value: HUD): void;
  hint(text: string): void;
  sound(kind: Sound): void;
  result(value: Result): void;
  failure?(kind?: FailureKind): void;
  progress?(game: NewGameId, best: number): void;
  phoneReturned?(): void;
}
export interface ActivityControls {
  setTouch(x: number, y: number): void;
  setSprint(value: boolean): void;
  setPaused(value: boolean): void;
  resetInput(): void;
  action(): void;
  updateAvatar(): void;
  finishRun?(): void;
}
export const GAMES: Record<GameId, { title: string; description: string; tags: string[]; category: string; record: string }> = {
  lubid: { title: 'Luksong Lubid', description: 'Keep jumping for a new record. Speed is capped, then the rope smoothly changes rhythm. How far beyond 100 can you go?', tags: ['Endless record run', '100 coins max / run'], category: 'JUMP ROPE · SOLO + FRIENDS', record: 'BEST JUMPS' },
  snake: { title: 'Snake', description: 'A secret pocket classic. Eat, grow, wrap through the edges and avoid your own tail.', tags: ['Secret phone game', 'Swipe or keypad'], category: 'HIDDEN RETRO GAME', record: 'HIGH SCORE' },
  impact: { title: 'Orbit Patrol', description: 'Pilot a tiny spacecraft through incoming waves on your secret pocket phone.', tags: ['Secret phone game', 'Move + hold Fire'], category: 'HIDDEN RETRO GAME', record: 'HIGH SCORE' },
  jolen: { title: 'Jolen', description: 'Aim from where your marble lands. Time the fast power bar and knock targets out of the chalk circle.', tags: ['15 target marbles', '5 bot opponents'], category: 'AIMING GAME · SOLO + BOT', record: 'MOST MARBLES' },
  patintero: { title: 'Patintero', description: 'Quick feet. Good timing. Cross the lines. Make it home.', tags: ['90-second rounds', '4 bot guards'], category: 'STREET GAME · SOLO + BOTS', record: 'BEST TIME' },
  dama: { title: 'Dama', description: 'Five neighbors. Five levels. Take a seat and choose your opponent at the wooden table.', tags: ['5 unique opponents', 'Bot or pass-and-play'], category: 'BOARD GAME · 1–2 PLAYERS', record: 'MATCHES' },
  taguan: { title: 'Tagu-taguan', description: 'Hide among laundry, bamboo, crates, and hedges. The search gets sharper as the clock runs down.', tags: ['75-second search', '7 cover areas'], category: 'HIDE & SEEK · SOLO + BOT', record: 'SURVIVED' },
  tinik: { title: 'Luksong-tinik', description: 'New heights. New timing. Read the run-up and find your takeoff point before every jump.', tags: ['6 varied jumps', 'Easy · Normal · Hard'], category: 'JUMPING GAME · SOLO', record: 'BEST HEIGHT' },
};
