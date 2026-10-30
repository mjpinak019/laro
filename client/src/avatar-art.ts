import type Phaser from 'phaser';
import type { Profile } from './store';
import { COLORS } from './store';
import { paintCharacterPreview } from './character-art';

export const playerTexture = (direction = 0, frame = 0) => `avatar-live-${direction}-${frame}`;
/** Replaces only sixteen current-player frames, so purchases never grow the texture cache. */
export function createPlayerArt(scene: Phaser.Scene, profile: Profile) {
  for (let direction = 0; direction < 4; direction++) for (let frame = 0; frame < 4; frame++) {
    const key = playerTexture(direction, frame), image = document.createElement('canvas');
    paintCharacterPreview(image, profile.gender, COLORS[profile.color], direction, frame, profile.wardrobe.equipped);
    if (scene.textures.exists(key)) { const texture = scene.textures.get(key); const canvas = texture.getSourceImage() as HTMLCanvasElement; const context = canvas.getContext('2d')!; context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0); (texture as Phaser.Textures.CanvasTexture).refresh(); }
    else scene.textures.addCanvas(key, image);
  }
}
