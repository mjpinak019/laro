# Barangay journey — alpha 0.14

Levels start at 0 and stop at 30. Level 1 starts at 100 XP, Level 2 at 235,
Level 3 at 415. The XP needed for each next level is
`100 + 30 * currentLevel + 5 * currentLevel²`: every step takes more effort.
Level 30 starts at 58,825 total XP; the XP bar stays full at the cap. Coins,
records and quest completion can still be earned there. No food/energy meter
is required to play. Finished wins award 60 XP, draws 35 and losses 20;
practice, abandoned games and empty early rope cash-outs award none.

| Level | Newly available games |
| --- | --- |
| 0–1 | Patintero, Luksong-tinik, Dama |
| 2 | Piko |
| 3 | Tagu-taguan |
| 4 | Snake, after finding the pocket phone |
| 5 | Jolen |
| 7 | Luksong Lubid |
| 9 | Tumbang Preso |
| 10 | Orbit Patrol, after finding the pocket phone |
| 12 | Chess, at the Dama table |

The picker, setup, map entrances, phone and Chess tab all respect the same
thresholds. The level is shown beside the moving player on the map and
avatar-based game courts, as well as in the corner chip and progress card.
Levels are derived from XP, never a separately saved field.

## Neighbors and quests

Three eligible offers are selected randomly, saved on the device and kept
through reloads. Higher-level tasks appear as their games unlock. Look for
`?` over a neighbor, approach, and press E or Talk. Accept one active quest
at a time; the Quests button shows the goal and the giver's location.
Collection tasks place separate objects at randomized, reachable plaza
spots. Walk up and press E / Pick up. A ready quest changes its giver's
marker to `!`; return in person and claim once. Browsing a quest in the
journal cannot claim a reward from across the map.

| Quest | Task | XP / coins | Value |
| --- | --- | --- | --- |
| Bayanihan sa plaza | Collect 3 litter pieces, return to Mama Shoni | 55 / 20 | Shared responsibility and cleanliness |
| The lost wallet | Return a wallet to Tatay Efren | 65 / 25 | Honesty even without an audience |
| A little errand | Buy biscuits, return to Tatay Efren | 55 / 20 | Care for elders and neighbors |
| Merienda for the barkada | Buy street food, return to Audrey | 60 / 25 | Sharing and supporting local vendors |
| Finish with respect | Finish a Patintero round, win or lose | 45 / 15 | Sportsmanship |
| Tiyaga with Wendy | Finish Piko with at least 1 course | 80 / 30 | Patient practice |
| Balik-aklat | Return a library book to Amor, from Level 3 | 90 / 35 | Care for shared resources |
| Sabay sa lubid | Finish a run with 10+ jumps, from Level 7 | 110 / 45 | Cooperation and patience |
| Ingatan ang laruan | Finish Tumbang Preso with 1+ point, from Level 9 | 120 / 50 | Responsibility for shared toys |

Buying/playing before accepting does not finish a new quest. Practice and
unfinished game exits do not count. Pickups and rewards cannot be repeated
for the same active task. Up to eight different quests can reward each
local calendar day. Completed quests rotate out; new eligible offers fill
their place. A new day refreshes offers while keeping an unfinished active
task. Quests are optional: game XP remains an alternative at every level.
Dialogue examples describe these values without claiming that one custom
represents all Filipino families.

Quest state is included in local saves, downloadable backups and configured
cloud copies. It uses the existing offline save system, including its
limitations: device clocks and client-edited saves are not a trusted online
currency or competitive score ledger.

## Clothing and merienda

Six skin tones, boy/girl choices and basic clothes remain free. Existing
purchases remain owned and wearable even if the new level curve gives the
player a different level. New purchases require both coins and the level;
previewing remains free.

| Level | Clothing / costume | Coins |
| --- | --- | --- |
| 2 | Kanto bandana | 120 |
| 3 | Barangay jersey | 200 |
| 5 | Woven salakot | 280 |
| 8 | Celebration barong | 500 |
| 10 | Woven-trim trousers | 650 |
| 12 | Fiesta shoes | 700 |
| 14 | Fiesta jacket | 950 |
| 16 | Braided beard | 800 |
| 18 | Lantern keeper hat | 1,200 |
| 20 | Bayanihan guardian | 2,200 |
| 24 | Parol crown | 2,800 |
| 26 | Parol voyager | 3,800 |
| 30 | Haribon legend | 6,000 |

Higher tiers add embroidery, layers, tassels, crests and feather patterns
inside the existing pixel silhouette. All are cosmetic. New signature suits
are original designs. The wardrobe now contains 45 items.

| Level | New merienda | Shop | Coins |
| --- | --- | --- | --- |
| 2 | Pandesal | Sari-sari | 12 |
| 4 | Banana cue | Street food | 18 |
| 7 | Turon | Street food | 28 |
| 10 | Cheese puto | Sari-sari | 40 |
| 15 | Halo-halo | Street food | 70 |
| 22 | Bibingka | Sari-sari | 110 |

The six existing snacks keep their prices and are available from Level 0.
The twelve items have distinct menu art and participate in the avatar's
merienda animation: bites, crumbs, skewers, sipping or spoonfuls.
Buying snacks does not directly grant XP; an accepted errand can reward the
specific task once. This keeps the economy from becoming a buy/XP loop.

## Street game fixes

Tumbang Preso: a fallen can allows bot and human guards to move even when
the slipper is on the ground. An upright can freezes the guard while nobody
holds the slipper. Tags still require an upright can, a held slipper and an
exposed thrower outside the safety line. Reset time is 0.65 / 0.40 / 0.25
seconds on Easy / Normal / Hard, after physically reaching the slowed can.
Tests cover movement without carrying, faster resets and a winning throw
on all difficulties. Throwing unnecessarily far can leave the slipper very
close to the guard; aim and retrieval route still matter.

Piko: the aim slider and manual target selection are removed. A timed toss
lands at the next number; a mistimed toss misses. The timing meter remains
for tosses and hop landings. Player and Wendy alternate after each attempt
or completed course, racing to eight. Wendy visibly tosses and traverses the
same route. Her chance of one mistake per attempt is 42% / 22% / 7% on
Easy / Normal / Hard; it can be a missed toss or a line/landing error.
Player buttons react on pointer down. Pause freezes both actors and timers.
