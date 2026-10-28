import type Phaser from 'phaser';
import type { Rect } from './rules';

export type WorldMap = 'hub' | 'court' | 'alley';
export type TreePlacement = { id: string; kind: 'tree' | 'palm'; x: number; y: number; scale?: number };
export const WORLD_PROPS: Record<WorldMap, TreePlacement[]> = {
  hub: [
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
  ],
  court: [
    { id: 'court-west-tree', kind: 'tree', x: 32, y: 65 },
    { id: 'court-east-tree', kind: 'tree', x: 446, y: 261 },
    { id: 'court-east-palm', kind: 'palm', x: 443, y: 92 },
    { id: 'court-west-palm', kind: 'palm', x: 34, y: 266 },
  ],
  alley: [
    { id: 'alley-west-tree', kind: 'tree', x: 24, y: 105 },
    { id: 'alley-east-tree', kind: 'tree', x: 450, y: 262 },
    { id: 'alley-north-palm', kind: 'palm', x: 443, y: 91 },
    { id: 'alley-south-palm', kind: 'palm', x: 25, y: 279 },
  ],
};

export function propGroundPoint(prop: TreePlacement) {
  const scale = prop.scale ?? 1;
  return prop.kind === 'tree' ? { x: prop.x * 2, y: (prop.y + 8 * scale) * 2 } : { x: (prop.x + 3 * scale) * 2, y: (prop.y + 5 * scale) * 2 };
}

export function propObstacles(map: WorldMap): Rect[] {
  return WORLD_PROPS[map].map(prop => {
    const at = propGroundPoint(prop), scale = prop.scale ?? 1;
    return { x: at.x - 7 * scale, y: at.y - 10 * scale, width: 14 * scale, height: 14 * scale };
  });
}

export function addWorldProps(scene: Phaser.Scene, map: WorldMap): Phaser.GameObjects.Image[] {
  return WORLD_PROPS[map].map(prop => {
    const at = propGroundPoint(prop);
    return scene.add.image(at.x, at.y, `world-${prop.kind}`)
      .setOrigin(prop.kind === 'tree' ? .5 : 39 / 80, 1)
      .setScale(2 * (prop.scale ?? 1)).setDepth(at.y).setName(prop.id);
  });
}
