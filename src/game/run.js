// Roguelite run state: world map, economy, roster, shop, enemy generation
// and persistence. Meta progression (Valor & talents) lives in `meta`.

import { UNITS, POOL_SIZE, SHOP_ODDS, XP_TO_LEVEL, MAX_LEVEL, playableUnitIds } from '../data/units.js';
import { COMPONENTS, ITEMS, completedItemIds, combine } from '../data/items.js';
import { ZONES, RIVALS, BOONS, EVENTS, TALENTS } from '../data/world.js';
import { COLS, PLAYER_ROWS } from './hex.js';
import { countTraits, computeStats, sellValue } from './stats.js';

const RUN_KEY = 'tacticalcraft.run.v1';
const META_KEY = 'tacticalcraft.meta.v1';
export const BENCH_SIZE = 9;
export const INVENTORY_SIZE = 10;
const FLOORS_PER_ZONE = 6;
// Enemy stat scaling by progress (0 at the start, ~34 at the final boss).
const DIFFICULTY = { lin: 0.05, quad: 0.0015 };

const rand = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ═════════════════════════ Meta progression ═════════════════════════
export const meta = loadMeta();

function loadMeta() {
  const base = { valor: 0, talents: {}, runs: 0, victories: 0, bestZone: 0, totalValor: 0, codexSeen: {} };
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return base;
}

export function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function talentRank(id) { return meta.talents[id] || 0; }

export function buyTalent(id) {
  const t = TALENTS.find(x => x.id === id);
  const r = talentRank(id);
  if (!t || r >= t.max) return false;
  const cost = t.cost[r];
  if (meta.valor < cost) return false;
  meta.valor -= cost;
  meta.talents[id] = r + 1;
  saveMeta();
  return true;
}

export function unlocks() {
  return { dragons: talentRank('dragons') > 0 };
}

// ═════════════════════════ Run creation ═════════════════════════
export let run = null;

export function hasSavedRun() {
  try { return !!localStorage.getItem(RUN_KEY); } catch { return false; }
}

export function loadRun() {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (raw) { run = JSON.parse(raw); return run; }
  } catch { /* ignore */ }
  return null;
}

export function saveRun() {
  if (!run) return;
  try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); } catch { /* ignore */ }
}

export function clearRun() {
  run = null;
  try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ }
}

export function newRun() {
  const pool = {};
  for (const id of playableUnitIds(unlocks())) pool[id] = POOL_SIZE[UNITS[id].cost];
  run = {
    zoneIdx: 0,
    map: null,
    currentNode: null,
    hp: 100 + talentRank('fortitude') * 10,
    maxHp: 100 + talentRank('fortitude') * 10,
    gold: 10 + talentRank('treasury') * 3,
    level: talentRank('tactician') ? 3 : 2,
    xp: 0,
    board: [],
    bench: Array(BENCH_SIZE).fill(null),
    inventory: [],
    boons: [],
    pool,
    shop: [],
    shopLocked: false,
    nextUid: 1,
    stats: { matches: 0, roundsWon: 0, roundsLost: 0, bosses: 0, goldEarned: 0 },
    match: null,
    log: [],
    freeRerollsLeft: 0,
    winStreak: 0,
  };
  // Starting army: two 1-cost champions (+talent recruits), placed on board.
  const starters = 2 + talentRank('recruit');
  for (let i = 0; i < starters; i++) {
    const id = drawFromPool(1);
    if (id) addUnitToBench(id);
  }
  // Move first units to the board.
  for (let i = 0; i < run.bench.length && run.board.length < run.level; i++) {
    const u = run.bench[i];
    if (!u) continue;
    run.bench[i] = null;
    u.pos = { c: 2 + run.board.length * 2, r: 4 };
    run.board.push(u);
  }
  for (let i = 0; i < talentRank('quartermaster'); i++) run.inventory.push(rand(COMPONENTS));
  if (talentRank('blessed')) addBoon(randomBoon('common'));
  generateZoneMap();
  rollShop(true);
  meta.runs += 1;
  saveMeta();
  saveRun();
  return run;
}

// ═════════════════════════ World map ═════════════════════════
function generateZoneMap() {
  const zone = ZONES[run.zoneIdx];
  const floors = [];
  let id = 0;
  for (let f = 0; f < FLOORS_PER_ZONE; f++) {
    const count = f === 0 ? 3 : 2 + Math.floor(Math.random() * 3);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `n${id++}`, floor: f, idx: i,
        x: (i + 1) / (count + 1) + (Math.random() - 0.5) * (0.5 / (count + 1)),
        type: nodeType(f), next: [],
      });
    }
    floors.push(nodes);
  }
  floors.push([{ id: `n${id++}`, floor: FLOORS_PER_ZONE, idx: 0, x: 0.5, type: 'boss', next: [] }]);

  // Connect floors: each node links to 1-2 nearest nodes on next floor,
  // and every next-floor node must have at least one parent.
  for (let f = 0; f < floors.length - 1; f++) {
    const cur = floors[f];
    const nxt = floors[f + 1];
    for (const n of cur) {
      const sorted = [...nxt].sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
      n.next.push(sorted[0].id);
      if (sorted[1] && Math.random() < 0.45 && Math.abs(sorted[1].x - n.x) < 0.4) n.next.push(sorted[1].id);
    }
    for (const m of nxt) {
      if (!cur.some(n => n.next.includes(m.id))) {
        const nearest = [...cur].sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0];
        nearest.next.push(m.id);
      }
    }
  }
  // Guarantee a merchant somewhere mid-zone and a rest before the boss.
  const mid = floors[2 + Math.floor(Math.random() * 2)];
  if (!mid.some(n => n.type === 'shop')) rand(mid).type = 'shop';
  const pre = floors[FLOORS_PER_ZONE - 1];
  if (!pre.some(n => n.type === 'rest')) rand(pre).type = 'rest';

  run.map = { zoneId: zone.id, floors, visited: [], available: floors[0].map(n => n.id) };
  run.currentNode = null;
}

function nodeType(floor) {
  if (floor === 0) return 'battle';
  const r = Math.random();
  if (floor >= 2 && r < 0.14) return 'elite';
  if (r < 0.52) return 'battle';
  if (r < 0.66) return 'event';
  if (r < 0.78) return 'shop';
  if (r < 0.88) return 'treasure';
  return 'rest';
}

export function findNode(id) {
  for (const f of run.map.floors) for (const n of f) if (n.id === id) return n;
  return null;
}

export function enterNode(id) {
  const node = findNode(id);
  if (!node || !run.map.available.includes(id)) return null;
  run.currentNode = id;
  run.map.visited.push(id);
  run.map.available = [];
  saveRun();
  return node;
}

export function completeNode() {
  const node = findNode(run.currentNode);
  if (!node) return;
  if (node.type === 'boss') {
    run.stats.bosses++;
    return 'zoneClear';
  }
  run.map.available = [...node.next];
  saveRun();
  return 'continue';
}

export function advanceZone() {
  run.zoneIdx++;
  if (run.zoneIdx >= ZONES.length) return 'victory';
  run.hp = Math.min(run.maxHp, run.hp + 15);
  generateZoneMap();
  saveRun();
  return 'next';
}

// ═════════════════════════ Roster & pool ═════════════════════════
export function drawFromPool(cost) {
  const ids = Object.keys(run.pool).filter(id => UNITS[id].cost === cost && run.pool[id] > 0);
  if (!ids.length) return null;
  // weighted by remaining copies
  const total = ids.reduce((s, id) => s + run.pool[id], 0);
  let r = Math.random() * total;
  for (const id of ids) { r -= run.pool[id]; if (r <= 0) { run.pool[id]--; return id; } }
  run.pool[ids[0]]--;
  return ids[0];
}

function returnToPool(unit) {
  const copies = [1, 3, 9][unit.star - 1];
  if (run.pool[unit.id] !== undefined) run.pool[unit.id] += copies;
}

export function makeUnit(id, star = 1) {
  return { uid: run.nextUid++, id, star, items: [] };
}

export function benchFree() { return run.bench.findIndex(b => !b); }

export function addUnitToBench(id, star = 1) {
  const idx = benchFree();
  const u = makeUnit(id, star);
  if (idx < 0) {
    // no room: try to merge immediately, else refuse
    if (!wouldMerge(id)) return null;
    run.bench.push(u); // temporary overflow, merge will consume
    checkMerges();
    run.bench = run.bench.slice(0, BENCH_SIZE);
    while (run.bench.length < BENCH_SIZE) run.bench.push(null);
    return u;
  }
  run.bench[idx] = u;
  checkMerges();
  return u;
}

function allOwned() {
  return [...run.board, ...run.bench.filter(Boolean)];
}

function wouldMerge(id) {
  return allOwned().filter(u => u.id === id && u.star === 1).length >= 2;
}

/** Combine 3 copies of the same champion & star into a higher star. Returns merged units. */
export function checkMerges() {
  const merged = [];
  let changed = true;
  while (changed) {
    changed = false;
    const groups = {};
    for (const u of allOwned()) {
      if (u.star >= 3) continue;
      const k = `${u.id}|${u.star}`;
      (groups[k] = groups[k] || []).push(u);
    }
    for (const list of Object.values(groups)) {
      if (list.length < 3) continue;
      // prefer keeping a board unit
      list.sort((a, b) => (run.board.includes(b) ? 1 : 0) - (run.board.includes(a) ? 1 : 0));
      const [keep, ...rest] = list.slice(0, 3);
      const items = [...keep.items];
      for (const r of rest) {
        items.push(...r.items);
        removeUnit(r);
      }
      keep.star++;
      keep.items = [];
      for (const it of items) {
        if (keep.items.length < 3) equipRaw(keep, it); else run.inventory.push(it);
      }
      merged.push(keep);
      changed = true;
      break;
    }
  }
  return merged;
}

function removeUnit(u) {
  const bi = run.board.indexOf(u);
  if (bi >= 0) run.board.splice(bi, 1);
  const ii = run.bench.indexOf(u);
  if (ii >= 0) run.bench[ii] = null;
}

export function findUnit(uid) {
  return allOwned().find(u => u.uid === uid) || null;
}

export function sellUnit(uid) {
  const u = findUnit(uid);
  if (!u) return 0;
  const v = sellValue(u);
  run.gold += v;
  run.inventory.push(...u.items);
  u.items = [];
  returnToPool(u);
  removeUnit(u);
  saveRun();
  return v;
}

export function maxBoardSize() {
  return run.level + run.boons.filter(b => BOONS[b]?.effect.boardSlot).length;
}

/** Move a unit to a board hex or bench slot. target: {board:{c,r}} | {bench:i} */
export function moveUnit(uid, target) {
  const u = findUnit(uid);
  if (!u) return false;
  const onBoard = run.board.includes(u);
  if (target.bench !== undefined) {
    const other = run.bench[target.bench];
    if (onBoard) {
      run.board.splice(run.board.indexOf(u), 1);
      if (other) { other.pos = { ...u.pos }; run.board.push(other); }
      delete u.pos;
      run.bench[target.bench] = u;
    } else {
      const from = run.bench.indexOf(u);
      run.bench[from] = other;
      run.bench[target.bench] = u;
    }
  } else if (target.board) {
    const { c, r } = target.board;
    if (!PLAYER_ROWS.includes(r) || c < 0 || c >= COLS) return false;
    const other = run.board.find(o => o.pos.c === c && o.pos.r === r);
    if (onBoard) {
      if (other) other.pos = { ...u.pos };
      u.pos = { c, r };
    } else {
      const from = run.bench.indexOf(u);
      if (other) {
        run.board.splice(run.board.indexOf(other), 1);
        delete other.pos;
        run.bench[from] = other;
      } else {
        if (run.board.length >= maxBoardSize()) return false;
        run.bench[from] = null;
      }
      u.pos = { c, r };
      run.board.push(u);
    }
  }
  saveRun();
  return true;
}

// ═════════════════════════ Items ═════════════════════════
function equipRaw(unit, itemId) {
  const it = ITEMS[itemId];
  if (it.component) {
    const idx = unit.items.findIndex(x => ITEMS[x].component);
    if (idx >= 0) {
      unit.items[idx] = combine(unit.items[idx], itemId);
      return { combined: unit.items[idx] };
    }
  }
  unit.items.push(itemId);
  return {};
}

export function canEquip(unit, itemId) {
  const it = ITEMS[itemId];
  if (UNITS[unit.id].enemyOnly) return false;
  if (unit.items.length < 3) return true;
  // full: a component can still combine with an existing component
  return it.component && unit.items.some(x => ITEMS[x].component);
}

export function equipFromInventory(invIdx, uid) {
  const u = findUnit(uid);
  const itemId = run.inventory[invIdx];
  if (!u || !itemId || !canEquip(u, itemId)) return null;
  run.inventory.splice(invIdx, 1);
  const res = equipRaw(u, itemId);
  saveRun();
  return res;
}

export function combineInInventory(a, b) {
  const ia = run.inventory[a], ib = run.inventory[b];
  if (!ia || !ib || a === b || !ITEMS[ia].component || !ITEMS[ib].component) return null;
  const res = combine(ia, ib);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  run.inventory.splice(hi, 1);
  run.inventory.splice(lo, 1);
  run.inventory.push(res);
  saveRun();
  return res;
}

export function addItem(itemId) {
  run.inventory.push(itemId);
}

export function randomComponent() { return rand(COMPONENTS); }
export function randomCompleted() { return rand(completedItemIds()); }

// ═════════════════════════ Boons ═════════════════════════
export function randomBoon(rarity) {
  const opts = Object.keys(BOONS).filter(b => (!rarity || BOONS[b].rarity === rarity) && !run.boons.includes(b));
  return opts.length ? rand(opts) : null;
}

export function addBoon(id) {
  if (!id || run.boons.includes(id)) return false;
  run.boons.push(id);
  return true;
}

// ═════════════════════════ Economy ═════════════════════════
export function interestCap() {
  let cap = 5 + (talentRank('banker') ? 2 : 0);
  for (const b of run.boons) cap += BOONS[b].effect.interestCap || 0;
  return cap;
}

export function xpNeeded() { return XP_TO_LEVEL[run.level] || 999; }

export function gainXp(n) {
  if (run.level >= MAX_LEVEL) return;
  run.xp += n;
  while (run.level < MAX_LEVEL && run.xp >= xpNeeded()) {
    run.xp -= xpNeeded();
    run.level++;
  }
  if (run.level >= MAX_LEVEL) run.xp = 0;
}

export function buyXp() {
  if (run.gold < 4 || run.level >= MAX_LEVEL) return false;
  run.gold -= 4;
  gainXp(4);
  saveRun();
  return true;
}

export function rollShop(free = false) {
  if (!free) {
    if (run.freeRerollsLeft > 0) run.freeRerollsLeft--;
    else {
      if (run.gold < 2) return false;
      run.gold -= 2;
    }
  }
  // return unbought shop units to the pool
  for (const id of run.shop) if (id) run.pool[id]++;
  const odds = SHOP_ODDS[Math.min(run.level, 10)];
  run.shop = [];
  for (let i = 0; i < 5; i++) {
    let r = Math.random() * 100;
    let cost = 1;
    for (let c = 0; c < 5; c++) { r -= odds[c]; if (r <= 0) { cost = c + 1; break; } }
    let id = drawFromPool(cost);
    for (let c = cost - 1; !id && c >= 1; c--) id = drawFromPool(c);
    run.shop.push(id);
  }
  saveRun();
  return true;
}

export function buyShopUnit(i) {
  const id = run.shop[i];
  if (!id) return null;
  const cost = UNITS[id].cost;
  if (run.gold < cost) return null;
  if (benchFree() < 0 && !wouldMerge(id)) return null;
  run.gold -= cost;
  run.shop[i] = null;
  const u = addUnitToBench(id);
  saveRun();
  return u;
}

/** Income after each combat round. */
export function roundIncome(won) {
  const interest = Math.min(interestCap(), Math.floor(run.gold / 10));
  let base = 5;
  let extra = 0;
  for (const b of run.boons) extra += BOONS[b].effect.roundGold || 0;
  const streak = Math.abs(run.winStreak) >= 5 ? 3 : Math.abs(run.winStreak) >= 3 ? 2 : Math.abs(run.winStreak) >= 2 ? 1 : 0;
  const total = base + interest + (won ? 1 : 0) + extra + streak;
  run.gold += total;
  run.stats.goldEarned += total;
  let xp = 2;
  for (const b of run.boons) xp += BOONS[b].effect.roundXp || 0;
  gainXp(xp);
  run.freeRerollsLeft = run.boons.filter(b => BOONS[b].effect.freeReroll).length;
  return { base, interest, win: won ? 1 : 0, extra, streak, total };
}

// ═════════════════════════ Matches & enemies ═════════════════════════
export function startMatch(node) {
  const zone = ZONES[run.zoneIdx];
  const rounds = node.type === 'battle' ? 2 : 3;
  run.match = { nodeId: node.id, type: node.type, round: 1, rounds, results: [], loot: [] };
  run.match.enemy = genEnemies(zone, node.floor, 1, node.type, rounds);
  run.freeRerollsLeft = run.boons.filter(b => BOONS[b].effect.freeReroll).length;
  if (!run.shopLocked) rollShop(true);
  saveRun();
  return run.match;
}

export function progressIndex(floor) {
  const zone = ZONES[run.zoneIdx];
  return (zone.tier - 1) * (FLOORS_PER_ZONE + 1) + (floor ?? 0);
}

function genEnemies(zone, floor, round, type, rounds) {
  const p = progressIndex(floor) + (round - 1) * 0.7;
  const isFinal = round === rounds;
  let pool = zone.monsters;
  let names = null;
  let count = clamp(Math.round(2 + p * 0.33 + (round - 1) * 0.5), 2, 9);
  let star2 = clamp((p - 4) * 0.045, 0, 0.85);
  let star3 = clamp((p - 24) * 0.05, 0, 0.5);
  const T = { ...DIFFICULTY, ...(globalThis.TC_TUNE || {}) };
  const q = Math.max(0, p - 2);
  let enemyMult = 1 + q * T.lin + q * q * T.quad;
  const units = [];
  let itemCount = 0;

  if (type === 'elite') {
    const rival = rand(RIVALS);
    names = rival.name;
    const maxCost = clamp(zone.tier + 1, 2, 5);
    pool = rival.units.filter(id => UNITS[id].cost <= maxCost);
    pool = [...pool, ...zone.elites];
    count = clamp(count + 1, 3, 9);
    star2 = clamp(star2 + 0.2, 0, 0.95);
    itemCount = zone.tier + round - 1;
    enemyMult *= 1.08;
  }

  if (type === 'boss' && isFinal) {
    units.push({ id: zone.boss, star: 1, items: [] });
    const minions = zone.bossMinions.slice(0, clamp(count - 1, 2, zone.bossMinions.length));
    for (const m of minions) units.push({ id: m, star: Math.random() < star2 ? 2 : 1, items: [] });
    itemCount = zone.tier + 1;
    names = UNITS[zone.boss].name;
  } else {
    if (type === 'boss') { count = clamp(count + 1, 3, 9); star2 = clamp(star2 + 0.15, 0, 0.95); }
    for (let i = 0; i < count; i++) {
      const id = rand(pool);
      const r = Math.random();
      const star = r < star3 ? 3 : r < star2 ? 2 : 1;
      units.push({ id, star, items: [] });
    }
  }
  // Give items to the strongest enemies on elites & bosses.
  const sorted = [...units].sort((a, b) => UNITS[b.id].cost - UNITS[a.id].cost);
  for (let i = 0; i < itemCount; i++) {
    const u = sorted[i % sorted.length];
    if (u.items.length >= 3) continue;
    u.items.push(zone.tier >= 3 || Math.random() < 0.4 ? randomCompleted() : randomComponent());
  }
  // Positions: melee front (row 3,2), ranged back (row 0,1).
  const taken = new Set();
  const place = (rows) => {
    for (let tries = 0; tries < 60; tries++) {
      const r = rand(rows);
      const c = Math.floor(Math.random() * COLS);
      const k = `${c},${r}`;
      if (!taken.has(k)) { taken.add(k); return { c, r }; }
    }
    for (let r = 0; r < 4; r++) for (let c = 0; c < COLS; c++) if (!taken.has(`${c},${r}`)) { taken.add(`${c},${r}`); return { c, r }; }
    return { c: 0, r: 0 };
  };
  const placed = units.map(u => {
    const def = UNITS[u.id];
    const pos = def.boss ? place([2, 3]) : def.range > 1 ? place([0, 1]) : place([3, 2]);
    return { unit: { ...u, uid: -Math.floor(Math.random() * 1e9) }, pos };
  });
  const title = names || (type === 'boss' ? `${zone.name} Warband` : `${zone.name} Wilds`);
  return { units: placed, enemyMult, title };
}

export function prepareNextRound() {
  const m = run.match;
  const zone = ZONES[run.zoneIdx];
  const node = findNode(m.nodeId);
  m.enemy = genEnemies(zone, node.floor, m.round, m.type, m.rounds);
  if (!run.shopLocked) rollShop(true);
  saveRun();
}

/** Build battle setup for the current round. */
export function battleSetup() {
  const boardUnits = run.board;
  const traits = countTraits(boardUnits);
  const carry = [...boardUnits].sort((a, b) => UNITS[b.id].cost * b.star - UNITS[a.id].cost * a.star)[0];
  const talents = meta.talents;
  const player = boardUnits.map(u => ({
    unit: u, pos: u.pos,
    stats: computeStats(u, { traits, boons: run.boons, talents, pos: u.pos, isPlayer: true, isCarry: u === carry }),
  }));
  const em = run.match.enemy;
  const enemyTraits = countTraits(em.units.map(e => e.unit));
  const enemy = em.units.map(e => ({
    unit: e.unit, pos: e.pos,
    stats: computeStats(e.unit, { traits: enemyTraits, enemyMult: em.enemyMult }),
  }));
  const phoenix = run.boons.map(b => BOONS[b].effect.phoenix).find(Boolean);
  return {
    player, enemy,
    playerCtx: { boons: run.boons, talents, isPlayer: true },
    enemyCtx: { enemyMult: em.enemyMult },
    teamFx: { p: phoenix ? { phoenix } : {} },
  };
}

/** Resolve a finished round. Returns a summary for the UI. */
export function resolveRound(won, survivors, kills) {
  const m = run.match;
  const zone = ZONES[run.zoneIdx];
  let damage = 0;
  if (won) { run.stats.roundsWon++; run.winStreak = Math.max(1, run.winStreak + 1); }
  else {
    run.stats.roundsLost++;
    run.winStreak = Math.min(-1, run.winStreak - 1);
    damage = 2 + zone.tier + survivors.reduce((s, u) => s + UNITS[u.defId].cost * u.star, 0);
    if (m.type === 'boss') damage += 5;
    damage = Math.min(damage, 30);
    run.hp = Math.max(0, run.hp - damage);
  }
  // Loot drops from slain enemies.
  const loot = [];
  let dropChance = { battle: 0.1, elite: 0.22, boss: 0.25 }[m.type];
  for (const b of run.boons) dropChance += BOONS[b].effect.dropBonus || 0;
  for (let i = 0; i < kills; i++) if (Math.random() < dropChance) loot.push(randomComponent());
  if (won && m.round === m.rounds && m.type !== 'battle') loot.push(m.type === 'boss' ? randomCompleted() : randomComponent());
  if (won && loot.length === 0 && Math.random() < 0.35) loot.push(randomComponent());
  for (const it of loot) addItem(it);
  m.loot.push(...loot);

  const income = roundIncome(won);
  m.results.push(won);
  const isFinal = m.round >= m.rounds;
  let outcome;
  if (run.hp <= 0) outcome = 'dead';
  else if (isFinal && won) outcome = 'matchWon';
  else if (isFinal && !won) outcome = 'retry';
  else outcome = 'next';
  if (outcome === 'next') { m.round++; prepareNextRound(); }
  else if (outcome === 'retry') prepareNextRound();
  saveRun();
  return { won, damage, loot, income, outcome };
}

export function finishMatch() {
  const m = run.match;
  run.stats.matches++;
  const healAfterWin = run.boons.reduce((s, b) => s + (BOONS[b].effect.healAfterWin || 0), 0);
  if (healAfterWin) run.hp = Math.min(run.maxHp, run.hp + healAfterWin);
  const type = m.type;
  run.match = null;
  saveRun();
  return matchRewards(type);
}

export function matchRewards(type) {
  const opts = [];
  const tier = ZONES[run.zoneIdx].tier;
  if (type === 'battle') {
    opts.push({ kind: 'item', id: randomComponent() });
    opts.push({ kind: 'gold', amount: 6 + tier * 2 });
    opts.push({ kind: 'unit', id: randomUnitOfCost(clamp(tier, 1, 4)) });
  } else if (type === 'elite') {
    opts.push({ kind: 'item', id: randomCompleted() });
    opts.push({ kind: 'boon', id: randomBoon('rare') || randomBoon() });
    opts.push({ kind: 'unit', id: randomUnitOfCost(clamp(tier + 1, 2, 5)) });
  } else {
    opts.push({ kind: 'boon', id: randomBoon('legendary') || randomBoon('rare') || randomBoon() });
    opts.push({ kind: 'item', id: randomCompleted() });
    opts.push({ kind: 'gold', amount: 15 + tier * 4 });
  }
  return opts.filter(o => o.kind !== 'boon' || o.id).filter(o => o.kind !== 'unit' || o.id);
}

export function randomUnitOfCost(cost) {
  const ids = playableUnitIds(unlocks()).filter(id => UNITS[id].cost === cost && run.pool[id] > 0);
  return ids.length ? rand(ids) : null;
}

export function claimReward(r) {
  if (r.kind === 'item') addItem(r.id);
  else if (r.kind === 'gold') run.gold += r.amount;
  else if (r.kind === 'boon') addBoon(r.id);
  else if (r.kind === 'unit') {
    if (run.pool[r.id] > 0) run.pool[r.id]--;
    if (!addUnitToBench(r.id)) { run.gold += UNITS[r.id].cost; }
  }
  saveRun();
}

// ═════════════════════════ Merchant ═════════════════════════
export function priceMult() { return 1 - talentRank('haggler') * 0.15; }

export function merchantStock() {
  const tier = ZONES[run.zoneIdx].tier;
  const pm = priceMult();
  const stock = [];
  for (let i = 0; i < 3; i++) {
    const cost = clamp(tier + Math.floor(Math.random() * 2) - (i === 0 ? 1 : 0), 1, 5);
    const id = randomUnitOfCost(cost);
    if (id) stock.push({ kind: 'unit', id, price: Math.ceil((cost * 2 + 1) * pm) });
  }
  for (let i = 0; i < 3; i++) stock.push({ kind: 'item', id: randomComponent(), price: Math.ceil(6 * pm) });
  stock.push({ kind: 'item', id: randomCompleted(), price: Math.ceil(15 * pm) });
  stock.push({ kind: 'item', id: randomCompleted(), price: Math.ceil(15 * pm) });
  const b1 = randomBoon('common');
  const b2 = randomBoon('rare');
  if (b1) stock.push({ kind: 'boon', id: b1, price: Math.ceil(12 * pm) });
  if (b2 && b2 !== b1) stock.push({ kind: 'boon', id: b2, price: Math.ceil(20 * pm) });
  stock.push({ kind: 'heal', amount: 15, price: Math.ceil(5 * pm) });
  stock.push({ kind: 'xp', amount: 6, price: Math.ceil(5 * pm) });
  return stock;
}

export function buyMerchant(entry) {
  if (entry.sold || run.gold < entry.price) return false;
  if (entry.kind === 'unit' && benchFree() < 0 && !wouldMerge(entry.id)) return false;
  run.gold -= entry.price;
  entry.sold = true;
  if (entry.kind === 'unit') { if (run.pool[entry.id] > 0) run.pool[entry.id]--; addUnitToBench(entry.id); }
  else if (entry.kind === 'item') addItem(entry.id);
  else if (entry.kind === 'boon') addBoon(entry.id);
  else if (entry.kind === 'heal') run.hp = Math.min(run.maxHp, run.hp + entry.amount);
  else if (entry.kind === 'xp') gainXp(entry.amount);
  saveRun();
  return true;
}

// ═════════════════════════ Events & rest ═════════════════════════
export function randomEvent() { return rand(EVENTS); }

/** Execute an event choice "do" string. Returns lines describing results. */
export function applyEventChoice(doStr) {
  const out = [];
  for (const part of doStr.split('|')) {
    const [k, v] = part.split(':');
    if (k === 'none') out.push('You continue on your way.');
    if (k === 'hp') {
      const n = +v;
      run.hp = clamp(run.hp + n, 1, run.maxHp);
      out.push(n >= 0 ? `Restored ${n} Health.` : `Lost ${-n} Health.`);
    }
    if (k === 'gold') { run.gold = Math.max(0, run.gold + +v); out.push(+v >= 0 ? `Gained ${v} gold.` : `Spent ${-v} gold.`); }
    if (k === 'xp') { gainXp(+v); out.push(`Gained ${v} XP.`); }
    if (k === 'gamble') {
      const n = +v;
      if (Math.random() < 0.5) { run.gold += n * 1.5; out.push(`The dice favor you! +${n * 1.5} gold.`); }
      else { run.gold = Math.max(0, run.gold - n); out.push(`Snake eyes. Lost ${n} gold.`); }
    }
    if (k === 'item') {
      const id = v === 'random_full' ? randomCompleted() : v === 'random_component' ? randomComponent() : v;
      addItem(id); out.push(`Received ${ITEMS[id].name}.`);
    }
    if (k === 'boon') {
      const id = v.startsWith('random') ? (randomBoon(v.split('_')[1]) || randomBoon()) : v;
      if (id && addBoon(id)) out.push(`Gained boon: ${BOONS[id].name}.`);
      else out.push('The blessing fades — you already carry it.');
    }
    if (k === 'unit') {
      const id = randomUnitOfCost(+v.replace('random', ''));
      if (id) {
        run.pool[id]--;
        if (addUnitToBench(id)) out.push(`${UNITS[id].name} joins your warband!`);
        else { run.gold += UNITS[id].cost; out.push('Your bench is full — they leave a refund.'); }
      }
    }
  }
  saveRun();
  return out;
}

export function canAfford(doStr) {
  const m = doStr.match(/gold:-(\d+)/);
  const bet = doStr.match(/gamble:(\d+)/);
  const need = m ? +m[1] : bet ? +bet[1] : 0;
  return run.gold >= need;
}

// ═════════════════════════ End of run ═════════════════════════
export function computeValor(victory) {
  const s = run.stats;
  const v = run.zoneIdx * 25 + s.matches * 3 + s.roundsWon + s.bosses * 15 + (victory ? 60 : 0);
  return Math.max(5, Math.round(v));
}

export function endRun(victory) {
  const valor = computeValor(victory);
  meta.valor += valor;
  meta.totalValor += valor;
  meta.bestZone = Math.max(meta.bestZone, run.zoneIdx + (victory ? 1 : 0));
  if (victory) meta.victories++;
  saveMeta();
  const summary = { valor, zone: run.zoneIdx, stats: { ...run.stats }, victory };
  clearRun();
  return summary;
}
