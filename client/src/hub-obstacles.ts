import type { Rect } from './rules';
import { propObstacles } from './world-props.ts';
import { HUB_EXTRA_OBSTACLES } from './hub.ts';
/** Shared geometry for the rendered village and reachable collectible placements. */
export const HUB_OBSTACLES: Rect[] = [
  { x: 43, y: 100, width: 151, height: 203 },
  { x: 294, y: 67, width: 146, height: 141 },
  { x: 454, y: 99, width: 130, height: 128 },
  { x: 630, y: 45, width: 147, height: 126 },
  { x: 32, y: 460, width: 151, height: 133 },
  { x: 398, y: 330, width: 86, height: 64 },
  { x: 142, y: 347, width: 65, height: 48 },
  ...propObstacles('hub'), ...HUB_EXTRA_OBSTACLES,
];
