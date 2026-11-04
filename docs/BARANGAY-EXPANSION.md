# New neighborhood games — alpha 0.16

| Game | Unlock | Area / neighbor | Play options |
| --- | --- | --- | --- |
| Tic-tac-toe | Level 2 | West of the housing loop, Jhing | Easy/Hard bot; friendly pass-and-play |
| Langit-Lupa | Level 6 | Southern play park, Jr | Easy/Hard bot; friendly shared-keyboard local play |
| Tagalog Krosword | Level 8 | Southeastern Dyaryo desk, Geron | Random theme and connected layout; untimed |
| Sudoku | Level 11 | Same Dyaryo desk | Easy/Hard; generated uniquely solvable 9×9 boards |

The original three starters remain available at Levels 0–1. All fifteen games
work offline after the first complete online load. Existing coins, clothes,
records, quests and XP remain compatible. New records are included in backups
and configured cloud saves. Puzzle boards themselves are single sessions;
leaving a puzzle ends that attempt without a reward.

## Langit-Lupa

Jack-en-Poy reveals both hands. Ties replay; the loser becomes taya. The bot
commits its hand before the player's choice. The local option hides Player 1's
choice until Player 2 commits. A separate start button follows the reveal.

The chase starts with a three-second countdown and lasts up to 90 seconds.
The runner walks onto any available elevated platform. The taya cannot enter
its footprint or tag the runner on top; its pathfinding travels around the
platforms. Wide bamboo, wooden and stone surfaces allow crossing and exiting
from different edges. Stepping off starts a platform reset, preventing timer
refresh by repeatedly crossing its edge. Safety expiration automatically moves
the runner to the nearest ground edge, with a brief 0.35-second landing grace.

| Setting | Easy | Hard |
| --- | --- | --- |
| Platform safety | 6 seconds | 3.8 seconds |
| Platform reset | 4 seconds | 9 seconds |
| Player sprint recharge | 25 points/second | 14 points/second |
| Bot sprint recharge | 17 points/second | 27 points/second |

Both actors have visible sprint bars. Sprint drains 33 points/second; complete
exhaustion locks sprint until 35 points have recharged. Local actors receive
equal recharge for the selected difficulty. Move with WASD/arrows, the touch
pad or a tapped destination; sprint with Shift/Takbo. Local Player 1 uses WASD
and Shift; Player 2 uses arrows and Enter and therefore needs a keyboard.

Runner rewards scale with seconds survived, plus a survival bonus. Taya rewards
scale with a faster successful catch. Hard increases rewards by 20%, capped at
110 coins and 120 XP. Early runner losses earn nothing; unfinished exits earn
nothing. Friendly local rounds award no coins, records or XP, consistent with
the other local board games. The saved best round score is survived seconds as
runner, or seconds remaining on a successful taya catch.

## Dyaryo and Tic-tac-toe

Krosword themes cover home life, nature and being a good neighbor. Original
Tagalog clues show word length and pahalang/pababa orientation. Select a clue,
type the whole answer, and place it into the shared crossing cells. Check the
whole puzzle or reveal one letter in the selected word. Layouts and theme
selection change between rounds.

Sudoku shuffles valid full grids and removes numbers only while retaining one
solution. Easy aims for 42 givens and Hard for 30; the generator may retain a
few additional clues to preserve uniqueness. Printed givens cannot be changed.
Use the touch number pad or keyboard digits, arrows and Delete. Check marks
mistakes; hints fill one number. Both paper games are untimed. Hints reduce
the final reward and solved-puzzle counts save after completion.

Jhing takes visible, delayed turns in Tic-tac-toe. Easy makes random legal
moves; Hard searches the full game and never loses against legal play. Three
in a row wins and a full board without a line draws. Bot games earn small
rewards, while friendly pass-and-play awards none.
