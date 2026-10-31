import type { Profile } from '../store';

export type GameId = 'patintero' | 'dama' | 'chess' | 'taguan' | 'tinik' | 'jolen' | 'lubid' | 'snake' | 'impact' | 'piko' | 'tumbang';
export const PUBLIC_GAMES: GameId[] = ['jolen', 'patintero', 'dama', 'taguan', 'tinik', 'lubid', 'piko', 'tumbang'];
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
  piko: { title: 'Piko', description: 'Wendy drew a chalk court in the east lane. Toss your pamato, skip its square, and time each landing out and back.', tags: ['8 pamato courses', 'One foot or two'], category: 'HOPPING GAME · SOLO WITH WENDY', record: 'COURSES / 8' },
  tumbang: { title: 'Tumbang Preso', description: 'Throw a tsinelas, topple the spinning tin can, and bring your slipper home. Take turns guarding with Eric.', tags: ['Aim + retrieve', 'Thrower / guard rotation'], category: 'AIMING GAME · SOLO + ERIC', record: 'BEST POINTS' },
  chess: { title: 'Chess', description: 'Share the Dama table for a game of chess. Play a neighbor or pass the device between friends.', tags: ['At the Dama table', 'Bot or pass-and-play'], category: 'BOARD GAME · 1–2 PLAYERS', record: 'MATCHES' },
  lubid: { title: 'Luksong Lubid', description: 'Keep jumping for a new record. Speed is capped, then the rope smoothly changes rhythm. How far beyond 100 can you go?', tags: ['Endless record run', '100 coins max / run'], category: 'JUMP ROPE · SOLO + FRIENDS', record: 'BEST JUMPS' },
  snake: { title: 'Snake', description: 'A secret pocket classic. Eat, grow, wrap through the edges and avoid your own tail.', tags: ['Secret phone game', 'Swipe or keypad'], category: 'HIDDEN RETRO GAME', record: 'HIGH SCORE' },
  impact: { title: 'Orbit Patrol', description: 'Pilot a tiny spacecraft through incoming waves on your secret pocket phone.', tags: ['Secret phone game', 'Move + hold Fire'], category: 'HIDDEN RETRO GAME', record: 'HIGH SCORE' },
  jolen: { title: 'Jolen', description: 'Aim from where your marble lands. Time the fast power bar and knock targets out of the chalk circle.', tags: ['15 target marbles', '5 bot opponents'], category: 'AIMING GAME · SOLO + BOT', record: 'MOST MARBLES' },
  patintero: { title: 'Patintero', description: 'Quick feet. Good timing. Cross the lines. Make it home.', tags: ['90-second rounds', '4 bot guards'], category: 'STREET GAME · SOLO + BOTS', record: 'BEST TIME' },
  dama: { title: 'Dama', description: 'Take a seat at the wooden table. Choose Dama or Chess, then a bot opponent or pass-and-play.', tags: ['Dama or Chess', 'Bot or pass-and-play'], category: 'BOARD GAME · 1–2 PLAYERS', record: 'MATCHES' },
  taguan: { title: 'Tagu-taguan', description: 'Hide among laundry, bamboo, crates, and hedges. The search gets sharper as the clock runs down.', tags: ['75-second search', '7 cover areas'], category: 'HIDE & SEEK · SOLO + BOT', record: 'SURVIVED' },
  tinik: { title: 'Luksong-tinik', description: 'New heights. New timing. Read the run-up and find your takeoff point before every jump.', tags: ['6 varied jumps', 'Easy · Normal · Hard'], category: 'JUMPING GAME · SOLO', record: 'BEST HEIGHT' },
};
