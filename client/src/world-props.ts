import type Phaser from 'phaser';
import type { Rect } from './rules';

export type WorldMap = 'hub' | 'court' | 'alley' | 'schoolyard';
export type WorldPlacement = { id: string; kind: 'tree' | 'palm' | 'bench' | 'vase' | 'fence' | 'sign'; x: number; y: number; scale?: number; width?: number };
export const WORLD_PROPS: Record<WorldMap, WorldPlacement[]> = {
  hub: [
    { id: 'piko-palm', kind: 'palm', x: 1080, y: 125 },
    { id: 'wendy-tree', kind: 'tree', x: 870, y: 85 },
    { id: 'piko-bench', kind: 'bench', x: 1015, y: 310 },
    { id: 'east-crossing-tree', kind: 'tree', x: 1080, y: 410 },
    { id: 'eric-palm', kind: 'palm', x: 1080, y: 620 },
    { id: 'tumbang-tree', kind: 'tree', x: 870, y: 475 },
    { id: 'tumbang-bench', kind: 'bench', x: 1005, y: 645 },
    { id: 'south-extension-tree', kind: 'tree', x: 700, y: 680 },
    { id: 'piko-north-fence', kind: 'fence', x: 900, y: 85, width: 150 },
    { id: 'tumbang-south-fence', kind: 'fence', x: 900, y: 665, width: 150 },
    { id: 'maligaya-sign', kind: 'sign', x: 115, y: 275 },
    { id: 'plaza-tree', kind: 'tree', x: 220, y: 178, scale: .72 },
    { id: 'northwest-tree', kind: 'tree', x: 35, y: 42 },
    { id: 'north-tree', kind: 'tree', x: 74, y: 57, scale: .8 },
    { id: 'east-tree', kind: 'tree', x: 457, y: 104 },
    { id: 'east-small-tree', kind: 'tree', x: 470, y: 154, scale: .8 },
    { id: 'southeast-tree', kind: 'tree', x: 465, y: 292 },
    { id: 'south-tree', kind: 'tree', x: 277, y: 292 },
    { id: 'southwest-tree', kind: 'tree', x: 153, y: 296, scale: .8 },
    { id: 'west-palm', kind: 'palm', x: 13, y: 214 },
    { id: 'north-palm', kind: 'palm', x: 423, y: 69 },
    { id: 'south-palm', kind: 'palm', x: 409, y: 293 },
    { id: 'school-palm', kind: 'palm', x: 775, y: 135 },
    { id: 'school-tree', kind: 'tree', x: 512, y: 133 },
    { id: 'garden-tree', kind: 'tree', x: 775, y: 300 },
    { id: 'garden-palm', kind: 'palm', x: 498, y: 395 },
    { id: 'table-tree', kind: 'tree', x: 330, y: 405 },
    { id: 'south-garden-tree', kind: 'tree', x: 540, y: 470 },
    { id: 'south-border-tree', kind: 'tree', x: 375, y: 478 },
    { id: 'far-south-tree', kind: 'tree', x: 755, y: 490 },
    { id: 'plaza-bench', kind: 'bench', x: 169, y: 229 },
    { id: 'north-bench', kind: 'bench', x: 246, y: 148 },
    { id: 'table-west-bench', kind: 'bench', x: 169, y: 399 },
    { id: 'table-east-bench', kind: 'bench', x: 251, y: 399 },
    { id: 'school-west-bench', kind: 'bench', x: 542, y: 246 },
    { id: 'school-east-bench', kind: 'bench', x: 705, y: 247 },
    { id: 'south-road-bench', kind: 'bench', x: 360, y: 324 },
    { id: 'garden-rest-bench', kind: 'bench', x: 514, y: 384 },
    { id: 'west-rest-bench', kind: 'bench', x: 108, y: 380 },
    { id: 'shop-west-vase', kind: 'vase', x: 22, y: 151 },
    { id: 'shop-east-vase', kind: 'vase', x: 96, y: 151 },
    { id: 'plaza-north-vase', kind: 'vase', x: 143, y: 100 },
    { id: 'north-house-vase', kind: 'vase', x: 289, y: 112 },
    { id: 'table-west-vase', kind: 'vase', x: 166, y: 319 },
    { id: 'table-east-vase', kind: 'vase', x: 302, y: 320 },
    { id: 'school-vase', kind: 'vase', x: 744, y: 145 },
    { id: 'school-gate-vase', kind: 'vase', x: 583, y: 260 },
    { id: 'south-road-vase', kind: 'vase', x: 325, y: 310 },
    { id: 'garden-gate-vase', kind: 'vase', x: 625, y: 454 },
    { id: 'north-house-fence', kind: 'fence', x: 148, y: 105, width: 132 },
    { id: 'east-house-fence', kind: 'fence', x: 300, y: 85, width: 96 },
    { id: 'court-south-fence', kind: 'fence', x: 309, y: 266, width: 129 },
    { id: 'school-west-fence', kind: 'fence', x: 526, y: 277, width: 74 },
    { id: 'school-east-fence', kind: 'fence', x: 685, y: 277, width: 68 },
    { id: 'garden-west-fence', kind: 'fence', x: 520, y: 441, width: 94 },
    { id: 'garden-east-fence', kind: 'fence', x: 675, y: 441, width: 90 },
    { id: 'west-lane-fence', kind: 'fence', x: 30, y: 310, width: 55 },
    { id: 'roadside-fence', kind: 'fence', x: 355, y: 306, width: 95 },
    { id: 'southern-fence', kind: 'fence', x: 400, y: 400, width: 62 },
  ],
  court: [
    { id: 'court-west-tree', kind: 'tree', x: 32, y: 65 },
    { id: 'court-east-tree', kind: 'tree', x: 446, y: 261 },
    { id: 'court-east-palm', kind: 'palm', x: 443, y: 92 },
    { id: 'court-west-palm', kind: 'palm', x: 34, y: 266 },
    { id: 'court-west-bench', kind: 'bench', x: 26, y: 136 },
    { id: 'court-east-bench', kind: 'bench', x: 422, y: 167 },
    { id: 'court-west-vase', kind: 'vase', x: 51, y: 178 },
    { id: 'court-east-vase', kind: 'vase', x: 419, y: 215 },
    { id: 'court-north-fence', kind: 'fence', x: 91, y: 18, width: 299 },
    { id: 'court-south-boundary', kind: 'fence', x: 91, y: 282, width: 299 },
  ],
  alley: [
    { id: 'alley-west-tree', kind: 'tree', x: 24, y: 105 },
    { id: 'alley-east-tree', kind: 'tree', x: 450, y: 262 },
    { id: 'alley-north-palm', kind: 'palm', x: 443, y: 91 },
    { id: 'alley-south-palm', kind: 'palm', x: 25, y: 279 },
    { id: 'alley-east-bench', kind: 'bench', x: 335, y: 263 },
    { id: 'alley-middle-bench', kind: 'bench', x: 190, y: 222 },
    { id: 'alley-shop-vase', kind: 'vase', x: 39, y: 126 },
    { id: 'alley-house-vase', kind: 'vase', x: 160, y: 121 },
    { id: 'alley-fence', kind: 'fence', x: 252, y: 167, width: 22 },
  ],
  schoolyard: [
    { id: 'jump-west-bench', kind: 'bench', x: 67, y: 167 },
    { id: 'jump-east-bench', kind: 'bench', x: 360, y: 165 },
    { id: 'jump-back-fence', kind: 'fence', x: 0, y: 132, width: 480 },
  ],
};

export function propGroundPoint(prop: WorldPlacement) {
  const scale = prop.scale ?? 1;
  if (prop.kind === 'sign') return { x: prop.x * 2, y: prop.y * 2 };
  if (prop.kind === 'tree') return { x: prop.x * 2, y: (prop.y + 8 * scale) * 2 };
  if (prop.kind === 'palm') return { x: (prop.x + 3 * scale) * 2, y: (prop.y + 5 * scale) * 2 };
  if (prop.kind === 'bench') return { x: (prop.x + 15) * 2, y: (prop.y + 13) * 2 };
  if (prop.kind === 'vase') return { x: prop.x * 2, y: (prop.y + 7) * 2 };
  return { x: (prop.x + (prop.width ?? 64) / 2) * 2, y: (prop.y + 17) * 2 };
}

export function propFootprint(prop: WorldPlacement): Rect {
  if (prop.kind === 'sign') return { x: prop.x * 2 - 5, y: prop.y * 2 - 7, width: 10, height: 10 };
  if (prop.kind === 'bench') return { x: prop.x * 2, y: (prop.y + 3) * 2, width: 60, height: 20 };
  if (prop.kind === 'vase') return { x: (prop.x - 4) * 2, y: (prop.y - 1) * 2, width: 16, height: 16 };
  if (prop.kind === 'fence') return { x: prop.x * 2, y: (prop.y + 12) * 2, width: (prop.width ?? 64) * 2, height: 10 };
  const at = propGroundPoint(prop), scale = prop.scale ?? 1;
  return { x: at.x - 7 * scale, y: at.y - 10 * scale, width: 14 * scale, height: 14 * scale };
}

export const propTexture = (prop: WorldPlacement) => prop.kind === 'fence' ? `world-fence-${prop.width ?? 64}` : `world-${prop.kind}`;
export function propObstacles(map: WorldMap): Rect[] {
  return WORLD_PROPS[map].map(propFootprint);
}

export function addWorldProps(scene: Phaser.Scene, map: WorldMap): Phaser.GameObjects.Image[] {
  return WORLD_PROPS[map].map(prop => {
    const at = propGroundPoint(prop);
    return scene.add.image(at.x, at.y, propTexture(prop))
      .setOrigin(prop.kind === 'palm' ? 39 / 80 : .5, 1)
      .setScale(2 * (prop.scale ?? 1)).setDepth(at.y).setName(prop.id);
  });
}
