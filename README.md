# LARO — Barangay Days (offline alpha)

Installed on October 28, 2026. This directory is separate from the existing
Tio Philo Next.js application and has its own npm workspaces and lockfile.
Alpha 0.7.0 is a local game collection with a barangay hub, Jolen, Patintero,
Dama, Tagu-taguan, and Luksong-tinik. All five games work offline.

Jolen uses the circle rules: collect the most of 15 target marbles by
knocking their entire body outside the chalk circle. Players alternate
shots. Each shooter stays where it lands, including outside the circle;
characters walk to their next shooting positions. Shooters can collide
but never count as targets. Leaving the dirt court re-spots a shooter
at its nearest playable edge. Tap/drag the court or use the direction
slider to aim. Tap Tira (or Space) to start the power meter; tap again to
shoot. The meter rises to full in 0.6 seconds and bounces back. Cancel
returns to aiming. Escape, dialogs, and visibility pause freeze play.

Jolen has its own five-level setting: Weng, Sheena, MJ, Ferdie, and Tatay
Efren. Bots plan using the same collision and friction rules as the player.
Their aims, power selections, and shots are visible. A win earns 60–100 coins
by difficulty; a finished loss earns 10. The new court is beside the schoolyard
and appears in the game picker, Games menu, and five-location minimap.
Girl NPC Weng is distinct from Amor; both remain in the barangay.

A pixel emblem and lowercase `tphilo games` wordmark welcome players while
the barangay initializes. About is available in ordinary and fullscreen
navigation and credits `tphilo games`, `developed by Sab`, and version
`0.7.0-alpha`. The displayed version comes from `client/src/version.ts`.
Existing coins, avatars, records, and Dama saves are preserved. Jolen adds
`records.jolen` and `jolenDifficulty` to the existing profile key.

The interface now uses larger body text, controls, instructions, and
in-world labels on desktop and mobile. The original designs and future
extensions are in [the game concepts](docs/NEXT-GAMES.md).

Map signage now uses hard-edged five-by-seven pixel glyphs. Trees and palms
in the top-down maps are separate objects sorted by their trunk ground
position, with small trunk collision footprints. Characters have a one-source-
pixel dark outline in every walking/facing frame; sprite padding preserves
the outline without moving the feet anchor. Jumping presenters are outlined too.

## Play

Play online at **https://mjpinak019.github.io/laro/** on a computer, phone,
or tablet. The first visit needs an internet connection to download the game.
After the offline-ready message appears, the same browser can reload offline.
Progress is saved separately in each browser and device; existing localhost
progress remains in the local version and is not transferred automatically.

Double-click `PLAY-LARO.cmd`. It builds the game, starts a loopback-only
server, and opens your browser. Keep its terminal window open while playing;
press Ctrl+C to stop the server. No internet connection is required with the
installed dependencies.

Or, from this directory in PowerShell:

```powershell
npm.cmd run build
npm.cmd run play
```

The game opens at http://127.0.0.1:4173/. Development with automatic source
updates uses `npm.cmd run dev` at http://127.0.0.1:5173/.
Both servers bind explicitly to `127.0.0.1`, including the Windows launcher's
programmatic preview. Opening the launcher again reuses an existing LARO
server at that address rather than failing because its port is occupied.

The production build caches all its assets using a service worker. After
the first successful load, the same browser can reload it with the network
disconnected. Look for “ready to play offline” below your stats. The dev
server does not register an offline cache. Double-clicking `dist/index.html`
directly is not supported; use the launcher or the local server.

## Source control and hosting

The source repository is [mjpinak019/laro](https://github.com/mjpinak019/laro),
public and independent of the Tio Philo website. Anyone can view or clone
the source. The playable game is published separately through GitHub Pages.
Commit its source, package manifests, and lockfile; dependencies, build output,
logs, and test screenshots are already ignored. A production build produces
static files in `client/dist/`, suitable for a static host such as GitHub Pages.
The `Deploy LARO to GitHub Pages` workflow runs the rule tests, builds the game
and offline cache, and publishes `client/dist/` on pushes to `main` or manual
dispatch. GitHub Pages must use **GitHub Actions** as its publishing source.
The workflow reads the Pages base path and passes it as `LARO_BASE_PATH`;
local builds keep relative paths for the Windows launcher. The parent
website has its own deployment and custom domain. Network multiplayer
would need a separate server, but the current offline games do not.

## What is playable

- A pixel-art barangay with a sari-sari store, plaza, tricycle, houses,
  neighbors, and Patintero court. The scrolling 1600 by 1000 barangay connects
  the plaza to a Dama courtyard with a playable table, an eastern schoolyard,
  and a southeast garden. A minimap tracks the player and five game locations.
  Walk to a marker and press E or tap Play to enter; returning preserves your
  location. All art is original, generated locally
  from canvas drawing routines in `client/src/art.ts`.
- Eight-direction walking, sprint energy, building collision, directional
  walk animations, click/tap-to-walk, emotes, and a store greeting.
- A solo Patintero practice adaptation: cross to the far green strip and
  return home within 90 seconds. Horizontal guards defend three lines;
  a fourth moves along the center line. A tag resets your crossing. Three
  tags or a timeout end the round.
- A win earns 50 coins plus 10 per remaining chance; a finished loss earns
  10 coins. Abandoned rounds earn nothing. Rematches and return-to-hub work.
- Nickname, four shirt palettes, Easy/Normal/Hard difficulty, sound toggle, pause,
  fullscreen, and touch controls on narrow screens.
- Browser-local coins, wins, completed rounds, and best winning time.
  Blocked browser storage falls back to session-only progress. There is no
  online account, cloud save, network multiplayer, or cosmetic shop in this build.
- Dama with five unique opponents: Mama Shoni (Easy), Audrey (Normal),
  MJ (Hard), Ferdie (Expert), and Tatay Efren (Master). Also included are friendly
  two-player pass-and-play, highlighted
  legal moves, complete capture chains, flying kings, promotion, win/loss/draw,
  resignation, and automatic resume of an unfinished match. The bots
  search in a worker so the board remains responsive. Expert and Master plan
  further ahead, order tactical moves, and finish forced capture exchanges
  before evaluating. Iterative deepening retains the last completed search
  within each tier's time/node limit. A short synchronous fallback is used
  only when workers are unavailable. Saved matches retain their opponent. Each ordinary piece
  can capture backward, captures must take the most pieces, captured pieces
  remain blockers until the sequence ends, and promotion occurs at the end
  of the complete move. Threefold repetition or 80 quiet plies is a draw.
- Tagu-taguan: one human hider versus Audrey, a seeker bot. Hide during a
  10-second count, then survive 75 seconds. Walls block sight, shrubs provide
  cover along with laundry and bamboo. Crates and barrels add sight-blocking
  obstacles. There are seven concealment areas. E toggles crouching, and sprinting produces approximate sound clues.
  The seeker navigates around obstacles and searches remembered locations.
  Easy mode displays her sight cone. Normal and Hard increase movement speed,
  sight range, hearing range, recognition speed, and last-seen memory. Her patrol
  visits hiding areas, and her search fans out around remembered sightings;
  she only predicts movement she has actually seen. No transformation, disguise, or weapons.
- Luksong-tinik: a side-view schoolyard with a human hands-and-feet obstacle,
  automatic run-up, a buffered Space/touch jump, six growing heights, and three
  chances. Each height changes run-up speed and obstacle position. Normal
  and Hard raise the obstacle; Hard replaces the full guide with a small notch
  after height two. A separate practice mode has unlimited retries without rewards.
- A game picker, a Games navigation menu, per-game rules, pause/resume,
  rematches, and separate records. Existing Patintero records and coins are
  preserved in the additive save format. New-game records are stored in
  `records.dama`, `records.taguan`, and `records.tinik` under the same profile key.

Controls: WASD/arrows to move, Shift to sprint, E to interact, Space to wave,
Escape to pause. On mobile, drag the circular control pad on the left and hold Takbo on the right.
The pad supports diagonal movement, a neutral centre, and pointer capture.
Two fingers can hold Takbo and a direction together.
Match rules are explained in the in-game rulebook.

Choose a game in the right-hand picker and press its Play button, or use
Games in the navigation bar. Difficulty is available directly below the game
cards on both desktop and mobile, and in Settings. Changes apply at the start
of the next Tagu-taguan or Luksong-tinik round. Dama offers bot/pass-and-play and a Resume
button if a match is saved. Luksong-tinik offers Challenge or Practice.
On mobile, starting a game brings the play area into view.

| Game | Input | Completed-game reward |
| --- | --- | --- |
| Patintero | WASD/arrows, Shift/RUN | Win: 50 + 10 per chance left; loss: 10 |
| Dama | Click/tap piece and destination; arrow keys navigate focused squares | Bot win: 60; draw: 20; loss: 10; pass-and-play: 0 |
| Tagu-taguan | WASD/arrows or ground click, Shift/RUN, E/Crouch | Survive: 60 / 80 / 100 on Easy / Normal / Hard; caught: 10 |
| Luksong-tinik | Space or Jump; run-up is automatic | Win: 60 / 80 / 100 on Easy / Normal / Hard + 10 per chance left; loss: 10 + 5 per height cleared; practice: 0 |

Leaving an arcade round early grants no reward. Friendly Dama and jump
practice do not affect records. Dama resumes from its latest completed turn;
an unfinished capture selection is not saved as a partial turn. The human-
seeker and save-sa-poste variants of Tagu-taguan are future additions.

## Names, Dama opponents, and mobile fullscreen

Display names and bot appearance assignments live in `client/src/characters.ts`.
Mama Shoni is an elderly woman; Tatay Efren is an elderly man with a walking
stick. Ferdie and MJ are boys; Audrey, Sheena, and Amor are girls. Amor was previously named Weng. Each bot has a distinct hairstyle or outfit, and Dama shows their portrait. They are shared by the
barangay, guard labels, Tagu-taguan, Dama menus, and dialogue. The default
player is Ikaw; old untouched Kaibigan profiles migrate without losing coins
or records, and custom nicknames stay unchanged.

Dama has its own saved difficulty setting in the match setup and Settings;
street games retain Easy/Normal/Hard. Each Dama tier has a different neighbor:
Mama Shoni, Audrey, MJ, Ferdie, and Tatay Efren from Easy through Master. Resuming an existing board keeps the difficulty saved with that board.

Bot turns highlight the starting square, then visibly slide the piece or
play each capture hop in order. Captured pieces fade until the full chain
finishes. The final route stays highlighted and is written below the board.
Pausing or opening a menu freezes playback; leaving cancels it. Only complete
turns are saved, so reloading during a move resumes from the preceding board.
Promotion, turn changes, and results occur after the last landing.

The fullscreen button expands the complete play panel, including pause,
Barangay, Games, Avatar, Rules, Settings, Sound, exit, and all dialogs. Mobile
fullscreen requests landscape orientation. If native fullscreen is unavailable
or denied, an immersive viewport panel keeps the same controls available.
Browsers that reject orientation locking show a prompt to rotate the phone;
the page cannot force the device to rotate or hide browser chrome there.
Touch controls are explicitly anchored inside the game area in landscape:
the circular pad is low left and Takbo is low right. Button colors are set
explicitly for mobile browsers. The panel follows the visual viewport as
browser bars expand or collapse, retains notch padding, and sizes the Dama
board to the actual available stage height. Dama uses a compact board layout.

The browser checks cover native fullscreen and simulated fullscreen/orientation
rejection in Chrome, two-finger diagonal sprinting with the circular pad, both stronger opponents playing
offline, and saved-opponent persistence. Actual phone/browser fullscreen
behavior still depends on the device. PC controller input is not implemented.

Avatar settings offer Boy and Girl with live previews and four shirt colors.
The choice is shared by the hub and all arcade games and persists offline.
Profiles from older builds default to Boy without resetting other progress.
The artwork is generated locally for every facing and walking frame, with
consistent dark outlines and feet anchors.

Benches, flower vases, and fence sections are separate objects throughout the
barangay, court, hiding arena, and jumping schoolyard. Their ground position
controls draw depth; collision uses the same placement metadata and smaller
physical footprints. Existing background copies have been removed. Trees
and palms retain trunk collision and depth sorting. The village contains nine
benches, ten flower vases, and ten fence sections, with open routes between
game locations. Props in the side-view schoolyard stay behind the jump lane.

## Development and checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The browser suite uses installed Microsoft Edge. Set `LARO_BROWSER=chrome`
to run it with installed Google Chrome. It starts its own production
preview when port 4173 is free, or reuses an existing preview on that port.
Screenshots are written to ignored `artifacts/` and `test-results/` folders.
Close the game preview before testing if you need a completely isolated run.

`client/src/rules.ts` contains movement, collision, round state, and rewards;
`game.ts` contains Phaser rendering and bots; `main.ts` contains the interface,
sound, and input bindings; `store.ts` handles local progress. `scripts/` contains
the Windows browser launcher. The client build bundles only the offline client;
the preinstalled Colyseus server dependencies are reserved for future work.

`client/src/games/` contains the new activities: a scene director, shared
controls, Dama rules/board/worker, seeker perception/pathfinding, and the
jumping scene. Each activity has an independent lifecycle. The production
offline cache also includes the Dama worker asset.

The parent website excludes `laro/` from its TypeScript and ESLint scope so
the two applications keep independent checks.

## Installed packages

| Workspace | Package | Version |
| --- | --- | --- |
| Client | Phaser | 4.2.1 |
| Client | @colyseus/sdk | 0.18.8 |
| Client development | Vite | 8.3.5 |
| Server | Colyseus | 0.18.10 |
| Server | @colyseus/schema | 5.0.42 |
| Shared development | TypeScript | 7.0.2 |
| Shared development | tsx | 4.23.15 |
| Shared development | @types/node | 24.19.2 |
| Shared development | @playwright/test | 1.64.1 |

The current Colyseus browser package is `@colyseus/sdk`, replacing the older
`colyseus.js` name in the initial concept notes.

## Computer tools

- Already installed: Node.js 24.22.1 LTS, npm 11.19.1, Git 2.56.0,
  GitHub Desktop, Visual Studio Code, and Microsoft Edge.
- Newly installed through Windows Package Manager: Tiled 1.12.2 and
  Audacity 4.0.1 (Windows package version 4.0.1.262721353).
- Aseprite 1.3.14.2 x64 is installed at
  `C:\Program Files\Aseprite\Aseprite.exe`. Verified its executable metadata
  and successful `--batch --version` command after the initial setup.
- Database and cloud hosting are deferred until saved profiles or online
  deployment are needed. No hosting accounts or paid services were created.

Open Tiled, Audacity, and Aseprite from the Windows Start menu.

## PowerShell usage

From the website directory:

```powershell
cd .\laro
npm.cmd ls --depth=0
```

To restore these exact dependencies on another checkout:

```powershell
npm.cmd ci
```

Use `npm.cmd` and `npx.cmd` in PowerShell on this computer. Its execution
policy blocks the npm PowerShell wrapper; the policy has not been changed.

Playwright was verified with the installed Edge browser using
`chromium.launch({ channel: 'msedge', headless: true })`. No separate
Playwright browser download was needed.

The esbuild installation script is explicitly allowed in `package.json`.
The optional msgpackr native extraction build is disabled; the Colyseus
modules loaded successfully without compiling it.

## Verification and dependency report

Alpha 0.7 validation: production build and TypeScript checks pass; all 43
rule tests and 38 browser scenarios pass. The world-art scenario walks
behind and in front of a tree, verifies its trunk collision, and captures
screenshots of the outlined characters and sharpened signage. Tagu-taguan
also checks that camping in the starting bush is not a free win. New coverage
walks the expanded map, enters all three new activity locations, checks the
return position and camera, saves Hard difficulty, and plays its varied jumps.
All eighteen height/difficulty combinations have a physically valid takeoff
window; rule tests simulate clearing each one. GitHub Actions runs the rule
tests and production build on pushes and pull requests.

Rule tests cover Patintero, diagonal movement and collision, Dama longest
captures and king landings, promotion, draws, bot legality, save validation,
seeker visibility/pathfinding, and clearance of every jump height. Browser
checks cover all five games, saved boards, captures and rewards, disconnected
bot play, crouching/pause, a six-height winning run, missed-jump practice,
mobile controls, and preservation of legacy progress. Run the commands above
for the current results. Production compilation includes TypeScript checks.

Jolen checks cover a full simulated match, whole-marble boundary scoring,
collision transfer, persistent shooters, edge re-spots, power timing, and
legacy profile migration. Browser checks enter its map court, pause the
power meter, observe bot shots, play a complete match with one reward,
reload offline, and verify portrait, landscape, loading, and About layouts.

- Verified TypeScript, Vite, tsx, and Playwright version commands.
- Successfully imported Colyseus, its client SDK, and its schema package.
- Successfully transformed TypeScript with esbuild.
- Launched headless Edge through Playwright and loaded Phaser 4.2.1.
- Verified Tiled and Audacity installation through Windows Package Manager.
- Verified Aseprite 1.3.14.2 x64 through its installed executable and batch CLI.

The initial npm audit reported 16 affected dependency entries: 13 low and
3 moderate, with no high or critical entries. The underlying advisories are
in the Colyseus authentication dependency tree (`elliptic` and `uuid` via
`grant` / `request-oauth`); many reported entries inherit these findings.
The suggested automatic fix changes Colyseus to an older major version and
was not applied. Review compatible upstream updates before deployment:

```powershell
npm.cmd audit
```

- https://github.com/advisories/GHSA-848j-6mx2-7j84
- https://github.com/advisories/GHSA-w5hq-g745-h8pq

The offline client does not import Colyseus. Live multiplayer and network
synchronization are not implemented or tested in this alpha.
