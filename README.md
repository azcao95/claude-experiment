# Tactical Craft

A 3D roguelite autobattler inspired by Teamfight Tactics and World of Warcraft. Lead a warband of Azeroth-inspired champions across five Acts, from the Verdant Vale to the Frozen Citadel.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

It runs in any modern browser with WebGL2. Progress is saved to `localStorage`.

## How it plays

**The expedition (roguelite layer).** Each Act has a branching 2D world map. You choose your path through these node types:

| Node | What happens |
|---|---|
| ⚔ Battle | A 2-round match against the zone's creatures |
| 💀 Elite | A 3-round match against a rival warband that carries items. Rewards include Boons |
| 💰 Merchant | Buy champions, components, completed items, Boons, potions and XP |
| ❓ Mystery | A random event with choices (gambles, shrines, mercenaries…) |
| 🔥 Campfire | Heal, train (gain XP) or forage (gain gold) |
| 🎁 Treasure | Pick 1 of 3 completed items |
| 👑 Boss | Defeat the Act's boss to move on to the next zone |

**Matches (autobattler layer).** Before each round you buy champions from the shop, drag them onto the hex board and equip items. Then press **Fight** and the battle plays out in real time. You lose Health when you lose a round, and you have to win a match's final round to clear it.

**Getting stronger**
- *Within a match:* you earn gold and interest every round, buy XP to field more champions, and merge 3 copies of a champion into a ★★ (or ★★★). Slain enemies drop item components.
- *Across a run:* your warband, items and gold carry over between matches. Boons are permanent run-long blessings.
- *Between runs:* you earn **Valor** at the end of every expedition and spend it in the **Hall of Heroes** on permanent talents. One talent unlocks the 5-cost Dragonflight champions.

## Content

- **35 champions** across 9 origins (Human, Orc, Dwarf, Night Elf, Forsaken, Troll, Tauren, Gnome, Dragonflight) and 10 classes (Warrior, Paladin, Hunter, Rogue, Priest, Mage, Warlock, Shaman, Druid, Death Knight). Each champion has a unique ability.
- **20 monsters and 5 bosses**, from murlocs and gnolls up to the Frost Sovereign.
- **8 item components and 36 completed items.** Every pair of components combines into a completed item.
- **20 Boons, 8 events and 11 permanent talents.**
- **5 themed 3D zones** with their own lighting, props and ambient particles.

Every champion, item, synergy and boon has a hover tooltip, and the numbers in it are the ones combat actually uses. The **Codex** (on the title screen and the world map) holds full champion details at each star level, an item recipe chart, synergies, a bestiary and a how-to-play guide. The **Warband** screen on the world map lets you inspect champions and equip or forge items between matches.

## Controls

| Input | Action |
|---|---|
| Drag champion | Move between bench and board |
| Drag champion onto the shop | Sell |
| Drag item onto champion | Equip (two components combine automatically) |
| Drag item onto item | Forge two components |
| Hover / right-click | Show details |
| `D` | Reroll shop |
| `F` | Buy XP |
| `E` | Sell hovered champion |
| `Space` | Start the fight |

## Project structure

```
src/
  data/       units, traits, items, zones/boons/events/talents
  game/       hex math, stat computation, combat simulation, run/meta state
  render/     Three.js arena, procedural models, environments, VFX
  ui/         title, world map, match HUD, nodes, codex/hall/warband menus
```

All 3D models are built procedurally from primitives on a simple rig, so there are no external assets. The combat simulation (`src/game/combat.js`) is deterministic-step and renderer-agnostic: the renderer only reads unit state and plays back the events it emits.
