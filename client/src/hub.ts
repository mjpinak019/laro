import type { GameId } from './games/types';
import type { Point, Rect } from './rules';

export const HUB_SIZE = { width: 2600, height: 1600 };
export const FOOD_CORNER = { x: 440, y: 1320 };
export const HUB_SITES: { game: GameId; name: string; district: string; at: Point }[] = [
  { game: 'patintero', name: 'Patintero Court', district: 'THE PLAZA', at: { x: 755, y: 475 } },
  { game: 'dama', name: 'Dama Table', district: 'SARI-SARI TAMBAYAN', at: { x: 450, y: 775 } },
  { game: 'tinik', name: 'Luksong-tinik Schoolyard', district: 'PAARALAN', at: { x: 1300, y: 480 } },
  { game: 'taguan', name: 'Tagu-taguan Garden', district: 'LIKOD-BAHAY', at: { x: 1300, y: 825 } },
  { game: 'jolen', name: 'Jolen Circle', district: 'TABING PAARALAN', at: { x: 1000, y: 495 } },
  { game: 'lubid', name: 'Luksong Lubid Yard', district: 'SA DULO NG KANTO', at: { x: 450, y: 940 } },
  { game: 'piko', name: 'Wendy’s Piko Lane', district: 'SILANGANG KANTO', at: { x: 1900, y: 520 } },
  { game: 'tumbang', name: 'Eric’s Tumbang Preso Clearing', district: 'BAGONG LARUAN', at: { x: 1900, y: 1160 } },
  {game:'langit',name:'Jr’s Langit-Lupa Park',district:'LIWASANG LANGIT',at:{x:1150,y:1460}},
  {game:'crossword',name:'Geron’s Dyaryo Desk',district:'BASA AT BILANG',at:{x:1960,y:1450}},
  {game:'tictactoe',name:'Jhing’s Tic-tac-toe Table',district:'SA TABI NG BAKOD',at:{x:500,y:1135}},
];
export const EXPANSION_PROPS=[
  {kind:'deck',x:990,y:1325,width:110,height:50},
  {kind:'deck',x:1190,y:1380,width:105,height:44},
  {kind:'dyaryo',x:1910,y:1360,width:110,height:52},
  {kind:'tic',x:455,y:1050,width:90,height:45},
] as const;
export const HUB_EXTRA_OBSTACLES: Rect[] = [
  { x: 1086, y: 84, width: 392, height: 196 },
  { x: 402, y: 680, width: 96, height: 44 },
  { x: 1070, y: 610, width: 100, height: 115 },
  { x: 1420, y: 665, width: 112, height: 105 },
  ...EXPANSION_PROPS,
];
export function nearbySite(point: Point) {
  return HUB_SITES.filter(site => Math.hypot(site.at.x - point.x, site.at.y - point.y) < 82)
    .sort((a, b) => Math.hypot(a.at.x - point.x, a.at.y - point.y) - Math.hypot(b.at.x - point.x, b.at.y - point.y))[0];
}
