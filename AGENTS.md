# LARO

This is an independent Phaser 4 and TypeScript game repository. The parent
Tio Philo website is a separate project.

- Use Node.js 24 LTS and npm. On Windows PowerShell use `npm.cmd`.
- Run `npm.cmd run build` and `npm.cmd test` after gameplay changes.
- Browser checks use Microsoft Edge: `npm.cmd run test:e2e`.
- The production preview binds to `127.0.0.1:4173`; the Windows launcher
  reuses a running instance. Keep that binding consistent with its printed URL.
- Bundle assets locally and preserve disconnected reload through the service worker.
- Preserve existing profile coins and records when changing the save format.
- Keep character feet anchors, prop depth, visible geometry, collision, and
  seeker visibility consistent. Do not give bots knowledge of hidden positions.
- Repo-local rule tests use Node's TypeScript stripping; runtime imports in
  their dependency graph need explicit `.ts` extensions.
