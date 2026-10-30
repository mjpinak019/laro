import type Phaser from 'phaser';
/** Extend the logical scene width to match landscape rather than stretching/cropping the court. */
export function fitGameViewport(game: Phaser.Game) {
  const panel = document.querySelector<HTMLElement>('#game-display')!, shell = document.querySelector<HTMLElement>('#game')!;
  const wide = panel.classList.contains('play-fullscreen') && panel.classList.contains('landscape-screen');
  const width = wide && shell.clientHeight > 0 ? Math.max(960, Math.round(600 * shell.clientWidth / shell.clientHeight)) : 960;
  const height = wide && shell.clientWidth > 0 ? Math.max(600, Math.round(960 * shell.clientHeight / shell.clientWidth)) : 600;
  if (game.scale.gameSize.width !== width || game.scale.gameSize.height !== height) game.scale.setGameSize(width, height);
  game.scale.refresh();
  for (const scene of game.scene.getScenes(false)) (scene as Phaser.Scene & { resizeView?(): void }).resizeView?.();
}
