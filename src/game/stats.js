// Computes final combat stats for units from base stats, star level,
// items, traits, boons and talents. Also used by tooltips so that the
// numbers the player reads are the numbers the fight uses.

import { UNITS, STAR_MULT } from '../data/units.js';
import { TRAITS, traitLevelIndex } from '../data/traits.js';
import { ITEMS } from '../data/items.js';
import { BOONS } from '../data/world.js';

export function countTraits(units) {
  const seen = {};
  const counts = {};
  for (const u of units) {
    const def = UNITS[u.id];
    if (!def || def.enemyOnly || seen[u.id]) continue;
    seen[u.id] = true;
    for (const t of [def.origin, def.cls]) if (t) counts[t] = (counts[t] || 0) + 1;
  }
  const out = {};
  for (const [t, count] of Object.entries(counts)) {
    out[t] = { count, level: traitLevelIndex(t, count) };
  }
  return out;
}

// Ordered list for display: active first, then by count.
export function traitList(counts) {
  return Object.entries(counts)
    .map(([id, v]) => ({ id, ...v, def: TRAITS[id] }))
    .sort((a, b) => (b.level >= 0) - (a.level >= 0) || b.level - a.level || b.count - a.count);
}

function emptyBonus() {
  return {
    hp: 0, hpPct: 0, ad: 0, adPct: 0, ap: 0, asPct: 0, armor: 0, mr: 0, range: 0,
    crit: 0, critDmg: 0, dodge: 0, startMana: 0, startShield: 0, startShieldPct: 0,
    omnivamp: 0, lifesteal: 0, spellVamp: 0, spellBurn: 0, regenPct: 0, selfRegen: 0,
    manaGain: 0, bloodFury: false, ambush: false, allPct: 0,
  };
}

function addInto(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (k === 'scope' || k === 'team') continue;
    if (typeof v === 'boolean') dst[k] = dst[k] || v;
    else dst[k] = (dst[k] || 0) + v;
  }
}

/**
 * Build final stats.
 * @param unit {id, star, items[]}
 * @param ctx {traits, boons[], talents{}, pos{c,r}, isPlayer, isCarry, enemyMult}
 */
export function computeStats(unit, ctx = {}) {
  const def = UNITS[unit.id];
  const star = unit.star || 1;
  const sm = STAR_MULT[star - 1];
  const b = emptyBonus();
  const fx = {};

  // Traits
  const traits = ctx.traits || {};
  for (const [tid, info] of Object.entries(traits)) {
    if (info.level < 0) continue;
    const bonus = TRAITS[tid].bonus(info.level);
    const mine = def.origin === tid || def.cls === tid;
    if (bonus.scope === 'team') addInto(b, bonus);
    else if (mine) addInto(b, bonus);
    if (bonus.team) addInto(b, bonus.team);
  }

  // Items
  for (const itemId of unit.items || []) {
    const it = ITEMS[itemId];
    if (!it) continue;
    addInto(b, it.stats || {});
    for (const [k, v] of Object.entries(it.fx || {})) {
      if (typeof v === 'number' && typeof fx[k] === 'number') fx[k] += v;
      else fx[k] = v;
    }
  }
  if (fx.range) b.range += fx.range;
  if (fx.critDmg) b.critDmg += fx.critDmg;
  if (fx.omnivamp) b.omnivamp += fx.omnivamp;
  if (fx.lifesteal) b.lifesteal += fx.lifesteal;

  // Boons and talents (player only)
  if (ctx.isPlayer) {
    for (const boonId of ctx.boons || []) {
      const e = BOONS[boonId]?.effect || {};
      for (const k of ['ad', 'ap', 'hp', 'startMana', 'armor', 'mr', 'asPct', 'crit', 'omnivamp', 'allPct']) {
        if (e[k]) b[k] += e[k];
      }
      if (e.frontHp && ctx.pos && ctx.pos.r <= 5) b.hp += e.frontHp;
      if (e.backDmg && ctx.pos && ctx.pos.r >= 6) { b.adPct += e.backDmg; b.ap += 25; }
      if (e.carryPct && ctx.isCarry) b.allPct += e.carryPct;
    }
    const t = ctx.talents || {};
    if (t.training) { b.hpPct += 0.05 * t.training; b.adPct += 0.05 * t.training; }
    if (t.arcane) b.ap += 8 * t.arcane;
  }

  const em = ctx.enemyMult || 1;
  const allMult = 1 + b.allPct;
  const maxHp = Math.round(((def.hp * sm) + b.hp) * (1 + b.hpPct) * allMult * em);
  const ad = Math.round(((def.ad * sm) + b.ad) * (1 + b.adPct) * allMult * Math.sqrt(em));
  let ap = (100 + b.ap) * allMult;
  if (fx.apAmp) ap *= 1 + fx.apAmp;
  ap = Math.round(ap * (em > 1 ? Math.sqrt(em) : 1));

  return {
    maxHp,
    ad,
    ap,
    as: +(def.as * (1 + b.asPct)).toFixed(2),
    // Range bonuses only extend ranged units; melee stays melee.
    range: def.range + (def.range > 1 ? b.range : 0),
    armor: Math.round(def.armor + b.armor),
    mr: Math.round(def.mr + b.mr),
    crit: Math.min(1, 0.25 + b.crit),
    critDmg: 1.4 + b.critDmg,
    dodge: Math.min(0.75, b.dodge),
    maxMana: def.mana,
    startMana: Math.min(def.mana, def.startMana + b.startMana),
    startShield: b.startShield + b.startShieldPct * maxHp,
    omnivamp: b.omnivamp,
    lifesteal: b.lifesteal,
    spellVamp: b.spellVamp,
    spellBurn: b.spellBurn,
    regenPct: b.regenPct,
    selfRegen: b.selfRegen,
    manaGain: b.manaGain,
    bloodFury: b.bloodFury,
    bloodFuryPct: b.adPct,
    ambush: b.ambush,
    fx,
  };
}

// Resolve ability values for a given star/AP. Returns { key: number }.
export function abilityValues(def, star, ap = 100) {
  const ab = def.ability;
  if (!ab) return {};
  const out = {};
  for (const [k, arr] of Object.entries(ab.vals || {})) {
    let v = arr[Math.min(arr.length - 1, star - 1)];
    if ((ab.apScale || []).includes(k)) v = Math.round(v * ap / 100);
    out[k] = v;
  }
  return out;
}

// Produce human-readable description with values for each star,
// highlighting the current one.
export function abilityText(def, star, ap) {
  const ab = def.ability;
  if (!ab) return '';
  return ab.desc.replace(/\{(\w+)\}/g, (_, k) => {
    const arr = ab.vals?.[k];
    if (!arr) return k;
    const scaled = (ab.apScale || []).includes(k);
    const parts = arr.map((v, i) => {
      const val = scaled && ap ? Math.round(v * ap / 100) : v;
      const cls = star && i === star - 1 ? 'val cur' : 'val';
      return `<span class="${cls}">${val}</span>`;
    });
    return `<span class="vals${scaled ? ' ap' : ''}">${parts.join('<i>/</i>')}</span>`;
  });
}

export function sellValue(unit) {
  const def = UNITS[unit.id];
  const copies = [1, 3, 9][unit.star - 1];
  const v = def.cost * copies;
  return unit.star > 1 ? v - 1 : v;
}
