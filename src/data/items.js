// Items: 8 basic components, and every pair of components combines into
// a completed item (36 total). A unit holds up to 3 items; dropping a
// component on a unit that already holds a component auto-combines them.

export const COMPONENTS = ['sword', 'bow', 'rod', 'tear', 'vest', 'cloak', 'belt', 'gloves'];

export const ITEMS = {
  // ───────────── Components ─────────────
  sword: { name: 'Arcanite Shortsword', component: true, glyph: 'sword', color: '#d8dde6',
    stats: { ad: 15 }, desc: 'A well-balanced blade of arcanite steel.' },
  bow: { name: 'Recurve Longbow', component: true, glyph: 'bow', color: '#c99a5a',
    stats: { asPct: 0.15 }, desc: 'Strung with wind serpent sinew.' },
  rod: { name: 'Spellweave Rod', component: true, glyph: 'rod', color: '#b07aff',
    stats: { ap: 15 }, desc: 'Thrums faintly with arcane power.' },
  tear: { name: 'Tear of Elune', component: true, glyph: 'tear', color: '#6fc8ff',
    stats: { startMana: 15 }, desc: 'A drop of moonlight, crystallized.' },
  vest: { name: 'Thorium Chain Vest', component: true, glyph: 'vest', color: '#9aa3ad',
    stats: { armor: 20 }, desc: 'Forged in the Shadowforge.' },
  cloak: { name: 'Runecloth Cloak', component: true, glyph: 'cloak', color: '#7a5aff',
    stats: { mr: 20 }, desc: 'Woven with protective runes.' },
  belt: { name: 'Ogre Girdle', component: true, glyph: 'belt', color: '#c27a3a',
    stats: { hp: 150 }, desc: 'Fits an ogre. Fits anyone, really.' },
  gloves: { name: 'Shadowcraft Gloves', component: true, glyph: 'gloves', color: '#5a5a7a',
    stats: { crit: 0.15, dodge: 0.1 }, desc: 'Light, supple, sticky-fingered.' },

  // ───────────── Completed items ─────────────
  reaper: { name: 'Arcanite Reaper', recipe: ['sword', 'sword'], color: '#ff6a3c',
    stats: { ad: 35 }, fx: { takedownAd: 12 },
    desc: 'Takedowns grant +12 Attack Damage for the rest of combat.' },
  thunderfury: { name: 'Thunderfury, Blade of Storms', recipe: ['sword', 'bow'], color: '#5ad8ff',
    stats: { ad: 15, asPct: 0.2 }, fx: { chainEvery: 3, chainDmg: 70, chainCount: 3 },
    desc: 'Every 3rd attack releases lightning that strikes 3 enemies for 70 magic damage.' },
  ashbringer: { name: 'Ashbringer', recipe: ['sword', 'rod'], color: '#ffe48a',
    stats: { ad: 15, ap: 20 }, fx: { omnivamp: 0.25 },
    desc: 'Heal for 25% of all damage dealt (Omnivamp).' },
  doomhammer: { name: 'Doomhammer', recipe: ['sword', 'tear'], color: '#3a9aff',
    stats: { ad: 15, startMana: 15 }, fx: { manaOnHit: 5 },
    desc: 'Attacks grant 5 bonus Mana.' },
  gorehowl: { name: 'Gorehowl', recipe: ['sword', 'vest'], color: '#c0392b',
    stats: { ad: 10, armor: 25 }, fx: { titanStacks: true },
    desc: 'Gain 2 AD and 2 Armor each time this unit attacks or is attacked (up to 25 stacks).' },
  bloodfang: { name: 'Bloodfang Blade', recipe: ['sword', 'cloak'], color: '#c0164a',
    stats: { ad: 20, mr: 20 }, fx: { lifesteal: 0.3, lowHpShield: 0.25 },
    desc: '30% Lifesteal. The first time this unit falls below 40% Health, gain a shield equal to 25% max Health.' },
  titansteel: { name: 'Titansteel Destroyer', recipe: ['sword', 'belt'], color: '#b88a5a',
    stats: { ad: 15, hp: 250 }, fx: { steraks: 0.35 },
    desc: 'Once per combat at 60% Health, gain 35% max Health and +35% AD.' },
  dragonstrike: { name: 'Dragonstrike', recipe: ['sword', 'gloves'], color: '#ff9a3c',
    stats: { ad: 20, crit: 0.25 }, fx: { critDmg: 0.35, spellCrit: true },
    desc: '+35% Critical Strike Damage. Abilities can critically strike.' },
  moonbow: { name: 'Moonfall Longbow', recipe: ['bow', 'bow'], color: '#c7f0ff',
    stats: { asPct: 0.45 }, fx: { range: 1, trueStrike: true },
    desc: '+1 Range. Attacks cannot be dodged.' },
  felstriker: { name: 'Felstriker', recipe: ['bow', 'rod'], color: '#7fff3a',
    stats: { asPct: 0.15, ap: 15 }, fx: { rampAs: 0.06 },
    desc: 'Attacks grant +6% Attack Speed, stacking without limit.' },
  windfury: { name: 'Windfury Totem', recipe: ['bow', 'tear'], color: '#8fd8ff',
    stats: { asPct: 0.15, startMana: 15 }, fx: { castAs: 0.2, manaOnHit: 2 },
    desc: 'Attacks grant 2 bonus Mana. Each ability cast grants +20% Attack Speed (stacking).' },
  quelserrar: { name: 'Quel\'Serrar', recipe: ['bow', 'vest'], color: '#e0e8ff',
    stats: { asPct: 0.15, armor: 20, dodge: 0.15 }, fx: { shredOnHit: 0.3 },
    desc: '+15% Dodge. Attacks reduce the target\'s Armor by 30% for 3s.' },
  wraithbow: { name: 'Wraithbow', recipe: ['bow', 'cloak'], color: '#7a5aff',
    stats: { asPct: 0.2, mr: 20 }, fx: { multishot: 0.6 },
    desc: 'Attacks fire an extra bolt at a second nearby enemy for 60% damage.' },
  warsong: { name: 'Warsong Battle Standard', recipe: ['bow', 'belt'], color: '#c0392b',
    stats: { asPct: 0.1, hp: 200 }, fx: { auraAs: 0.25 },
    desc: 'Combat start: this unit and allies within 2 hexes gain +25% Attack Speed.' },
  shadowmourne: { name: 'Shadowmourne', recipe: ['bow', 'gloves'], color: '#48c9e5',
    stats: { asPct: 0.2, crit: 0.2 }, fx: { critShred: 0.5 },
    desc: 'Critical strikes reduce the target\'s Armor by 50% for 4s.' },
  guardianstaff: { name: 'Staff of the Guardian', recipe: ['rod', 'rod'], color: '#d68cff',
    stats: { ap: 50 }, fx: { apAmp: 0.4 },
    desc: 'Increases total Ability Power by an additional 40%.' },
  magusstaff: { name: 'Staff of the Magus', recipe: ['rod', 'tear'], color: '#b07aff',
    stats: { ap: 20, startMana: 15 }, fx: { apPerSec: 4 },
    desc: 'Gain 20 Ability Power every 5 seconds in combat.' },
  karabor: { name: 'Medallion of Karabor', recipe: ['rod', 'vest'], color: '#ffe48a',
    stats: { ap: 15, armor: 20 }, fx: { allyShieldAura: 250 },
    desc: 'Combat start: this unit and allies within 2 hexes gain a 250 Shield for 8s.' },
  spellward: { name: 'Spellward Talisman', recipe: ['rod', 'cloak'], color: '#5ad8ff',
    stats: { ap: 15, mr: 25 }, fx: { mrShredAura: 0.4, castPunish: 120 },
    desc: 'Enemies within 2 hexes have 40% reduced Magic Resist, and take 120 magic damage when they cast.' },
  felflame: { name: 'Felflame Codex', recipe: ['rod', 'belt'], color: '#7fff3a',
    stats: { ap: 25, hp: 150 }, fx: { abilityBurn: 0.05 },
    desc: 'Ability damage burns targets for 5% of their max Health per second for 3s and cuts their healing by 50%.' },
  arcanistgauntlets: { name: 'Gauntlets of the Arcanist', recipe: ['rod', 'gloves'], color: '#ff7ad8',
    stats: { ap: 30, crit: 0.2 }, fx: { spellCrit: true, critDmg: 0.2 },
    desc: 'Abilities can critically strike. +20% Critical Strike Damage.' },
  phial: { name: 'Phial of Elune', recipe: ['tear', 'tear'], color: '#6fc8ff',
    stats: { startMana: 30, ap: 10 }, fx: { manaRefund: 20 },
    desc: 'After casting an ability, restore 20 Mana.' },
  frostheart: { name: 'Heart of Frost', recipe: ['tear', 'vest'], color: '#9ed3ff',
    stats: { startMana: 15, armor: 25 }, fx: { chillAura: 0.25 },
    desc: 'Enemies within 2 hexes have 25% reduced Attack Speed.' },
  naaru: { name: 'Naaru Shard', recipe: ['tear', 'cloak'], color: '#fff2a8',
    stats: { startMana: 15, mr: 25 }, fx: { apAura: 30 },
    desc: 'Combat start: this unit and allies within 2 hexes gain +30 Ability Power.' },
  redemption: { name: 'Libram of Redemption', recipe: ['tear', 'belt'], color: '#ffe48a',
    stats: { startMana: 15, hp: 250 }, fx: { pulseHeal: 0.12 },
    desc: 'Every 5s, heal allies within 2 hexes for 12% of their missing Health.' },
  handofjustice: { name: 'Hand of Justice', recipe: ['tear', 'gloves'], color: '#f1c40f',
    stats: { startMana: 15, crit: 0.15, ad: 15, ap: 15 }, fx: { omnivamp: 0.15 },
    desc: '15% Omnivamp, +15 AD and +15 AP.' },
  thornmail: { name: 'Thornmail of the Wilds', recipe: ['vest', 'vest'], color: '#7cb342',
    stats: { armor: 60 }, fx: { thorns: 60, critImmune: true },
    desc: 'Immune to critical strikes. When struck by an attack, deal 60 magic damage to adjacent enemies (once per second).' },
  aegis: { name: 'Aegis of Wrynn', recipe: ['vest', 'cloak'], color: '#4f7fd8',
    stats: { armor: 30, mr: 30 }, fx: { lowHpResist: 50 },
    desc: 'Below 50% Health, gain +50 Armor and Magic Resist.' },
  sulfuron: { name: 'Sulfuron Cape', recipe: ['vest', 'belt'], color: '#ff5a1a',
    stats: { armor: 25, hp: 200 }, fx: { immolate: 0.02 },
    desc: 'Every 2s, burn enemies within 2 hexes for 2% of their max Health and cut their healing by 50%.' },
  cloakofshadows: { name: 'Cloak of Shadows', recipe: ['vest', 'gloves'], color: '#5a5a7a',
    stats: { armor: 20, crit: 0.1, dodge: 0.25 }, fx: { riposte: true },
    desc: '+25% Dodge. Dodging an attack instantly counterattacks the attacker.' },
  onyxiacloak: { name: 'Onyxia Scale Cloak', recipe: ['cloak', 'cloak'], color: '#3a3a3a',
    stats: { mr: 70 }, fx: { regen: 0.04 },
    desc: 'Restore 4% of max Health every 2 seconds.' },
  cyclone: { name: 'Totem of Cyclones', recipe: ['cloak', 'belt'], color: '#a0e8c0',
    stats: { mr: 25, hp: 150 }, fx: { banish: 3 },
    desc: 'Combat start: the enemy carrying the most items is caught in a cyclone, unable to act for 3s.' },
  insignia: { name: 'Insignia of the Gladiator', recipe: ['cloak', 'gloves'], color: '#e0b43c',
    stats: { mr: 20, crit: 0.15, asPct: 0.2 }, fx: { ccImmuneFor: 12 },
    desc: 'Immune to stuns and slows for the first 12 seconds of combat. +20% Attack Speed.' },
  titangirdle: { name: 'Girdle of the Titans', recipe: ['belt', 'belt'], color: '#c27a3a',
    stats: { hp: 650 }, fx: { regen: 0.03 },
    desc: 'Restore 3% of max Health every 2 seconds.' },
  soulstone: { name: 'Soulstone', recipe: ['belt', 'gloves'], color: '#c25aff',
    stats: { hp: 150, crit: 0.15, armor: 15 }, fx: { revive: 0.4 },
    desc: 'The first time this unit would die, revive after 2s with 40% Health.' },
  deceiver: { name: 'Fist of the Deceiver', recipe: ['gloves', 'gloves'], color: '#7d3c98',
    stats: { crit: 0.4, dodge: 0.25 }, fx: { critDmg: 0.5 },
    desc: '+50% Critical Strike Damage.' },
};

const RECIPE_MAP = {};
for (const [id, it] of Object.entries(ITEMS)) {
  if (it.recipe) RECIPE_MAP[[...it.recipe].sort().join('+')] = id;
}

export function combine(a, b) {
  return RECIPE_MAP[[a, b].sort().join('+')] || null;
}

export function recipesUsing(componentId) {
  return COMPONENTS.map(other => ({ other, result: combine(componentId, other) }));
}

const STAT_LABELS = {
  ad: v => `+${v} Attack Damage`,
  asPct: v => `+${Math.round(v * 100)}% Attack Speed`,
  ap: v => `+${v} Ability Power`,
  startMana: v => `+${v} Starting Mana`,
  armor: v => `+${v} Armor`,
  mr: v => `+${v} Magic Resist`,
  hp: v => `+${v} Health`,
  crit: v => `+${Math.round(v * 100)}% Crit Chance`,
  dodge: v => `+${Math.round(v * 100)}% Dodge`,
};

export function statLines(stats) {
  return Object.entries(stats).map(([k, v]) => (STAT_LABELS[k] ? STAT_LABELS[k](v) : `${k} ${v}`));
}

export function completedItemIds() {
  return Object.keys(ITEMS).filter(id => !ITEMS[id].component);
}
