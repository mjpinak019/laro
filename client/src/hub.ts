import type { GameId } from './games/types';
import type { Point, Rect } from './rules';

export const HUB_SIZE = { width: 1600, height: 1000 };
export const HUB_SITES: { game: GameId; name: string; district: string; at: Point }[] = [
  { game: 'patintero', name: 'Patintero Court', district: 'THE PLAZA', at: { x: 755, y: 475 } },
  { game: 'dama', name: 'Dama Table', district: 'SARI-SARI TAMBAYAN', at: { x: 450, y: 775 } },
  { game: 'tinik', name: 'Luksong-tinik Schoolyard', district: 'PAARALAN', at: { x: 1300, y: 480 } },
  { game: 'taguan', name: 'Tagu-taguan Garden', district: 'LIKOD-BAHAY', at: { x: 1300, y: 825 } },
  { game: 'jolen', name: 'Jolen Circle', district: 'TABING PAARALAN', at: { x: 1000, y: 495 } },
];
export const HUB_EXTRA_OBSTACLES: Rect[] = [
  { x: 1086, y: 84, width: 392, height: 196 },
  { x: 402, y: 680, width: 96, height: 44 },
  { x: 1070, y: 610, width: 100, height: 115 },
  { x: 1420, y: 665, width: 112, height: 105 },
];
export function nearbySite(point: Point) {
  return HUB_SITES.filter(site => Math.hypot(site.at.x - point.x, site.at.y - point.y) < 82)
    .sort((a, b) => Math.hypot(a.at.x - point.x, a.at.y - point.y) - Math.hypot(b.at.x - point.x, b.at.y - point.y))[0];
}
