# Luksong-tinik pixel sprites

The final artwork uses the same two children on a fixed 160 × 96 pixel grid,
with five opaque colors plus transparency. There are no gradients, textures,
individual fingers, facial features, or cloth details. Sprites display at 2×
with nearest-neighbor sampling. Their shared ground row is 88 and center is 80.

| Height | Obstacle | Easy PNG | Normal PNG | Hard PNG |
| --- | --- | --- | --- | --- |
| 1 | One hand | [PNG](easy/height-1.png) | [PNG](normal/height-1.png) | [PNG](hard/height-1.png) |
| 2 | Two hands | [PNG](easy/height-2.png) | [PNG](normal/height-2.png) | [PNG](hard/height-2.png) |
| 3 | Three hands | [PNG](easy/height-3.png) | [PNG](normal/height-3.png) | [PNG](hard/height-3.png) |
| 4 | Four hands | [PNG](easy/height-4.png) | [PNG](normal/height-4.png) | [PNG](hard/height-4.png) |
| 5 | Four hands + one foot | [PNG](easy/height-5.png) | [PNG](normal/height-5.png) | [PNG](hard/height-5.png) |
| 6 | Four hands + two feet | [PNG](easy/height-6.png) | [PNG](normal/height-6.png) | [PNG](hard/height-6.png) |

Source: `client/src/tinik-sprite-art.ts`. Regenerate with:

```powershell
node scripts/export-tinik-art.mjs
```

The game loads the exported PNGs. Separate difficulty exports keep their
visible obstacle tops aligned to the existing jump heights without stretching
the children's bodies. Collision widths match the central hand/foot stack.

Art direction: match the user's simple seated-children reference, chunky
low-resolution blocks, dark green outlines, tan skin, cream and terracotta
shirts, teal shorts, no shading or texture, transparent background.

Built-in imagegen was used for style exploration (no CLI/API fallback). The
generated illustrations were too detailed for the game. Final assets instead
come from the repository's native pixel drawing source, so every variation
has consistent anatomy, palette, ground anchor and exact integer pixels.

Concept prompt: “Ultra-low-resolution 64 × 32-style two seated children facing
inward, bent knees, arms reaching to a central hand-and-foot stack. Square hair
and plain tan face blocks, cream left shirt, terracotta right shirt, teal shorts,
thick dark outlines, flat colors, no eyes, mouth, gradients, texture or backdrop.”
