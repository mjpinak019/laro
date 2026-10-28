import type { Rect } from '../rules';

export const HIDE_OBJECTS: { kind: 'laundry' | 'hedge' | 'barrels' | 'bamboo' | 'crates'; rect: Rect; solid: boolean; conceal: boolean }[] = [
  { kind: 'laundry', rect: { x: 345, y: 410, width: 100, height: 64 }, solid: false, conceal: true },
  { kind: 'hedge', rect: { x: 555, y: 455, width: 90, height: 55 }, solid: false, conceal: true },
  { kind: 'bamboo', rect: { x: 840, y: 95, width: 65, height: 115 }, solid: false, conceal: true },
  { kind: 'hedge', rect: { x: 75, y: 270, width: 80, height: 50 }, solid: false, conceal: true },
  { kind: 'barrels', rect: { x: 735, y: 270, width: 70, height: 42 }, solid: true, conceal: false },
  { kind: 'crates', rect: { x: 335, y: 320, width: 66, height: 44 }, solid: true, conceal: false },
  { kind: 'barrels', rect: { x: 650, y: 380, width: 40, height: 50 }, solid: true, conceal: false },
];
