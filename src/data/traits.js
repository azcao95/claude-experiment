// Trait (synergy) definitions. Each unit has one origin and one class.
// `levels` are the unit-count breakpoints; `bonus(level)` returns the effect
// payload applied by stats.js when that breakpoint is active.

export const TRAITS = {
  // ───────────── Origins ─────────────
  human: {
    name: 'Human', kind: 'origin', icon: '⚜', color: '#4f7fd8',
    flavor: 'The stalwart kingdoms of the west.',
    desc: 'Humans gain bonus Ability Power and start combat with bonus Mana.',
    levels: [2, 3, 5],
    effects: ['+20 AP, +10 Mana', '+45 AP, +20 Mana', '+80 AP, +35 Mana'],
    bonus: l => ({ scope: 'trait', ap: [20, 45, 80][l], startMana: [10, 20, 35][l] }),
  },
  orc: {
    name: 'Orc', kind: 'origin', icon: '⚔', color: '#c0392b',
    flavor: 'Blood and thunder!',
    desc: 'Blood Fury: Orcs gain Attack Damage. Below 50% Health they gain it again.',
    levels: [2, 4],
    effects: ['+15% Attack Damage', '+35% Attack Damage'],
    bonus: l => ({ scope: 'trait', adPct: [0.15, 0.35][l], bloodFury: true }),
  },
  dwarf: {
    name: 'Dwarf', kind: 'origin', icon: '⛰', color: '#b9773a',
    flavor: 'Forged in the mountain halls.',
    desc: 'Stoneform: Dwarves gain Armor and Magic Resist.',
    levels: [2, 4],
    effects: ['+25 Armor & MR', '+60 Armor & MR'],
    bonus: l => ({ scope: 'trait', armor: [25, 60][l], mr: [25, 60][l] }),
  },
  elf: {
    name: 'Night Elf', kind: 'origin', icon: '☾', color: '#8e5bd6',
    flavor: 'Ancient guardians of the moonlit groves.',
    desc: 'Shadowmeld: Night Elves gain a chance to dodge attacks.',
    levels: [2, 4],
    effects: ['20% Dodge', '40% Dodge'],
    bonus: l => ({ scope: 'trait', dodge: [0.2, 0.4][l] }),
  },
  undead: {
    name: 'Forsaken', kind: 'origin', icon: '☠', color: '#5fae7a',
    flavor: 'Free of the Lich\'s will, bound to vengeance.',
    desc: 'Will of the Forsaken: Forsaken heal for a portion of all damage they deal.',
    levels: [2, 4],
    effects: ['18% Omnivamp', '35% Omnivamp'],
    bonus: l => ({ scope: 'trait', omnivamp: [0.18, 0.35][l] }),
  },
  troll: {
    name: 'Troll', kind: 'origin', icon: '✦', color: '#2fa8a0',
    flavor: 'Stay away from da voodoo.',
    desc: 'Berserking: Trolls gain Attack Speed.',
    levels: [2, 3],
    effects: ['+25% Attack Speed', '+60% Attack Speed'],
    bonus: l => ({ scope: 'trait', asPct: [0.25, 0.6][l] }),
  },
  tauren: {
    name: 'Tauren', kind: 'origin', icon: '♉', color: '#8a6a3f',
    flavor: 'Children of the Earth Mother.',
    desc: 'Endurance: Tauren gain bonus maximum Health.',
    levels: [2, 4],
    effects: ['+300 Health', '+750 Health'],
    bonus: l => ({ scope: 'trait', hp: [300, 750][l] }),
  },
  gnome: {
    name: 'Gnome', kind: 'origin', icon: '⚙', color: '#e0b43c',
    flavor: 'Small in stature, vast in invention.',
    desc: 'Escape Artist: ALL allies start combat with bonus Mana.',
    levels: [2],
    effects: ['All allies +25 Mana'],
    bonus: () => ({ scope: 'team', startMana: 25 }),
  },
  dragon: {
    name: 'Dragonflight', kind: 'origin', icon: '🜂', color: '#e8762c',
    flavor: 'The Aspects watch over Azeroth.',
    desc: 'Aspect\'s Might: Dragons gain +300 Health and +30 AP. With 2, all allies gain +15 AP.',
    levels: [1, 2],
    effects: ['Dragons +300 HP, +30 AP', 'Also: all allies +15 AP'],
    bonus: l => (l === 0
      ? { scope: 'trait', hp: 300, ap: 30 }
      : { scope: 'trait', hp: 300, ap: 30, team: { ap: 15 } }),
  },

  // ───────────── Classes ─────────────
  warrior: {
    name: 'Warrior', kind: 'class', icon: '🛡', color: '#a0522d',
    flavor: 'Plate, steel and fury.',
    desc: 'Battle Shout: ALL allies gain Attack Damage. Warriors gain bonus Armor.',
    levels: [2, 3, 5],
    effects: ['All +10% AD; Warriors +20 Armor', 'All +20% AD; Warriors +45 Armor', 'All +35% AD; Warriors +80 Armor'],
    bonus: l => ({ scope: 'trait', armor: [20, 45, 80][l], team: { adPct: [0.1, 0.2, 0.35][l] } }),
  },
  paladin: {
    name: 'Paladin', kind: 'class', icon: '✚', color: '#f1c40f',
    flavor: 'By the Light!',
    desc: 'Divine Shield: ALL allies start combat with a shield.',
    levels: [2, 3],
    effects: ['All allies 150 Shield', 'All allies 400 Shield'],
    bonus: l => ({ scope: 'team', startShield: [150, 400][l] }),
  },
  hunter: {
    name: 'Hunter', kind: 'class', icon: '➶', color: '#7cb342',
    flavor: 'Patience, aim, release.',
    desc: 'Hunter\'s Mark: Hunters gain Attack Damage and +1 Range.',
    levels: [2, 4],
    effects: ['+25% AD, +1 Range', '+60% AD, +1 Range'],
    bonus: l => ({ scope: 'trait', adPct: [0.25, 0.6][l], range: 1 }),
  },
  rogue: {
    name: 'Rogue', kind: 'class', icon: '🗡', color: '#d4c43a',
    flavor: 'Strike from the shadows.',
    desc: 'Ambush: Rogues leap to the enemy backline at combat start and gain Critical Strike chance.',
    levels: [2, 4],
    effects: ['+25% Crit, leap', '+50% Crit, +25% Crit Damage, leap'],
    bonus: l => ({ scope: 'trait', crit: [0.25, 0.5][l], critDmg: [0, 0.25][l], ambush: true }),
  },
  priest: {
    name: 'Priest', kind: 'class', icon: '✧', color: '#ecf0f1',
    flavor: 'Faith restores all.',
    desc: 'Renew: ALL allies restore a percent of max Health every 2 seconds.',
    levels: [2, 4],
    effects: ['Heal 2% max HP / 2s', 'Heal 5% max HP / 2s'],
    bonus: l => ({ scope: 'team', regenPct: [0.02, 0.05][l] }),
  },
  mage: {
    name: 'Mage', kind: 'class', icon: '✺', color: '#5dade2',
    flavor: 'Knowledge is power, power is fire.',
    desc: 'Arcane Intellect: Mages gain Ability Power.',
    levels: [2, 3, 4],
    effects: ['+40 AP', '+90 AP', '+160 AP'],
    bonus: l => ({ scope: 'trait', ap: [40, 90, 160][l] }),
  },
  warlock: {
    name: 'Warlock', kind: 'class', icon: '♆', color: '#7d3c98',
    flavor: 'Power at any price.',
    desc: 'Drain Life: Warlocks heal for a portion of spell damage, and spells burn targets.',
    levels: [2],
    effects: ['40% Spell Vamp, spells burn for 3s'],
    bonus: () => ({ scope: 'trait', spellVamp: 0.4, spellBurn: 0.05 }),
  },
  shaman: {
    name: 'Shaman', kind: 'class', icon: 'ϟ', color: '#2e86de',
    flavor: 'The elements answer.',
    desc: 'Bloodlust: ALL allies gain Attack Speed. Shamans gain Mana faster.',
    levels: [2, 3],
    effects: ['All +15% AS', 'All +35% AS; Shamans +50% mana gain'],
    bonus: l => ({ scope: 'trait', manaGain: [0.2, 0.5][l], team: { asPct: [0.15, 0.35][l] } }),
  },
  druid: {
    name: 'Druid', kind: 'class', icon: '❦', color: '#27ae60',
    flavor: 'Balance in all things.',
    desc: 'Nature\'s Grasp: Druids gain bonus Health and regenerate quickly.',
    levels: [2, 3],
    effects: ['+20% HP, 3% regen/s', '+45% HP, 6% regen/s'],
    bonus: l => ({ scope: 'trait', hpPct: [0.2, 0.45][l], selfRegen: [0.03, 0.06][l] }),
  },
  deathknight: {
    name: 'Death Knight', kind: 'class', icon: '❄', color: '#48c9e5',
    flavor: 'Death is only the beginning.',
    desc: 'Runic Power: Death Knights gain Omnivamp and a shield of 35% max Health.',
    levels: [2],
    effects: ['20% Omnivamp, 35% HP shield'],
    bonus: () => ({ scope: 'trait', omnivamp: 0.2, startShieldPct: 0.35 }),
  },
};

export function traitLevelIndex(traitId, count) {
  const t = TRAITS[traitId];
  if (!t) return -1;
  let idx = -1;
  t.levels.forEach((lv, i) => { if (count >= lv) idx = i; });
  return idx;
}
