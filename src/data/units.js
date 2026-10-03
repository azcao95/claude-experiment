// Champion & monster definitions.
//
// Stats are 1-star values; stars multiply HP/AD by STAR_MULT.
// Ability `vals` are per-star arrays. Strings in `desc` like {dmg} are
// replaced with the value(s); keys listed in `apScale` are multiplied by
// the caster's AP / 100 when shown on a live unit and when cast.

export const STAR_MULT = [1, 1.8, 3.24];

const U = (o) => o;

export const UNITS = {
  // ═════════════════════ 1-COST ═════════════════════
  footman: U({
    name: 'Stormwind Footman', cost: 1, origin: 'human', cls: 'warrior',
    hp: 650, ad: 50, as: 0.6, range: 1, armor: 40, mr: 20, mana: 70, startMana: 20,
    model: { body: 'human', gear: 'warrior', primary: '#2a4f9e', secondary: '#c9ccd4', accent: '#e8c25a' },
    lore: 'A loyal soldier of the kingdom, first into the breach.',
    ability: {
      name: 'Shield Bash', kind: 'nuke', apScale: ['dmg'],
      desc: 'Bash the current target for {dmg} magic damage and stun it for {stun}s.',
      vals: { dmg: [150, 225, 340], stun: [1.5, 1.75, 2] },
      vfx: { type: 'impact', color: '#9fc4ff' },
    },
  }),
  grunt: U({
    name: 'Orgrimmar Grunt', cost: 1, origin: 'orc', cls: 'warrior',
    hp: 650, ad: 55, as: 0.65, range: 1, armor: 35, mr: 20, mana: 60, startMana: 0,
    model: { body: 'orc', gear: 'warrior', primary: '#8e1f14', secondary: '#4a3b2a', accent: '#c0a060' },
    lore: 'For the Horde! A brute with an axe and something to prove.',
    ability: {
      name: 'Cleave', kind: 'aoeTarget', physical: true,
      desc: 'Swing in an arc, dealing {pct}% Attack Damage as physical damage to the target and all enemies adjacent to it.',
      vals: { pct: [180, 200, 240] }, radius: 1.2,
      vfx: { type: 'slash', color: '#ff6a3c' },
    },
  }),
  rifleman: U({
    name: 'Ironforge Rifleman', cost: 1, origin: 'dwarf', cls: 'hunter',
    hp: 500, ad: 55, as: 0.7, range: 4, armor: 20, mr: 20, mana: 70, startMana: 0,
    model: { body: 'dwarf', gear: 'rifle', primary: '#6b4423', secondary: '#7e8c99', accent: '#d4a843' },
    lore: 'Never met a problem a bit more gunpowder couldn\'t solve.',
    ability: {
      name: 'Aimed Shot', kind: 'physNuke',
      desc: 'Fire a heavy round at the farthest enemy, dealing {pct}% Attack Damage + {flat} physical damage.',
      vals: { pct: [200, 220, 260], flat: [80, 120, 200] }, targeting: 'farthest',
      vfx: { type: 'bullet', color: '#ffd27a' },
    },
  }),
  headhunter: U({
    name: 'Darkspear Headhunter', cost: 1, origin: 'troll', cls: 'hunter',
    hp: 500, ad: 50, as: 0.75, range: 4, armor: 15, mr: 20, mana: 60, startMana: 10,
    model: { body: 'troll', gear: 'spear', primary: '#2a7d74', secondary: '#7a5230', accent: '#d9c27a' },
    lore: 'Da spirits guide my spear, mon.',
    ability: {
      name: 'Spear Volley', kind: 'multi', physical: true,
      desc: 'Hurl spears at {n} nearby enemies, each dealing {pct}% Attack Damage.',
      vals: { n: [3, 3, 4], pct: [130, 150, 180] },
      vfx: { type: 'arrow', color: '#e3c08a' },
    },
  }),
  acolyte: U({
    name: 'Forsaken Acolyte', cost: 1, origin: 'undead', cls: 'priest',
    hp: 520, ad: 40, as: 0.6, range: 3, armor: 15, mr: 30, mana: 70, startMana: 20,
    model: { body: 'undead', gear: 'priest', primary: '#3d2b4f', secondary: '#7a6a8f', accent: '#9de2a7' },
    lore: 'Prays to no god — only to the Dark Lady.',
    ability: {
      name: 'Shadow Mend', kind: 'healLowest', apScale: ['heal', 'dmg'],
      desc: 'Deal {dmg} magic damage to the target and heal the lowest-health ally for {heal}.',
      vals: { heal: [200, 300, 450], dmg: [100, 150, 220] },
      vfx: { type: 'holy', color: '#9de2a7' },
    },
  }),
  tinker: U({
    name: 'Gnomish Tinker', cost: 1, origin: 'gnome', cls: 'mage',
    hp: 450, ad: 35, as: 0.65, range: 4, armor: 15, mr: 20, mana: 60, startMana: 20,
    model: { body: 'gnome', gear: 'mage', primary: '#d05b9b', secondary: '#3f3f6b', accent: '#ffd85c' },
    lore: 'Has calculated a 73.2% chance of not exploding.',
    ability: {
      name: 'Arcane Missiles', kind: 'multi', apScale: ['dmg'],
      desc: 'Launch {n} arcane missiles at random enemies, each dealing {dmg} magic damage.',
      vals: { n: [4, 4, 5], dmg: [70, 105, 160] }, random: true,
      vfx: { type: 'orb', color: '#d68cff' },
    },
  }),
  sentinel: U({
    name: 'Moonglade Sentinel', cost: 1, origin: 'elf', cls: 'rogue',
    hp: 550, ad: 55, as: 0.75, range: 1, armor: 25, mr: 20, mana: 60, startMana: 0,
    model: { body: 'elf', gear: 'rogue', primary: '#3f2a63', secondary: '#1f1f2a', accent: '#b9a0ff' },
    lore: 'Silent as moonlight on still water.',
    ability: {
      name: 'Ambush', kind: 'physNuke',
      desc: 'Strike the target for {pct}% Attack Damage. If the target is below 50% Health, this critically strikes.',
      vals: { pct: [250, 275, 320] }, critBelow: 0.5,
      vfx: { type: 'slash', color: '#b9a0ff' },
    },
  }),
  brave: U({
    name: 'Mulgore Brave', cost: 1, origin: 'tauren', cls: 'druid',
    hp: 750, ad: 45, as: 0.55, range: 1, armor: 30, mr: 25, mana: 80, startMana: 30,
    model: { body: 'tauren', gear: 'druid', primary: '#6d4c2d', secondary: '#3b6b35', accent: '#d9b36c' },
    lore: 'Walks with the Earth Mother, charges with the bull.',
    ability: {
      name: 'Bear Form', kind: 'buffSelf', apScale: ['heal'],
      desc: 'Shift into bear form, healing {heal} Health and gaining {armor} Armor and MR for {dur}s.',
      vals: { heal: [200, 300, 450], armor: [40, 60, 90], dur: [5, 5, 6] },
      vfx: { type: 'nature', color: '#6fd36a' },
    },
  }),

  // ═════════════════════ 2-COST ═════════════════════
  initiate: U({
    name: 'Silver Hand Initiate', cost: 2, origin: 'human', cls: 'paladin',
    hp: 750, ad: 55, as: 0.6, range: 1, armor: 40, mr: 30, mana: 80, startMana: 30,
    model: { body: 'human', gear: 'paladin', primary: '#e8e3d0', secondary: '#c9a227', accent: '#4f7fd8' },
    lore: 'Sworn to the Light, the ink on her oath still fresh.',
    ability: {
      name: 'Holy Shield', kind: 'shieldAllies', apScale: ['shield'],
      desc: 'Shield herself and the {n} lowest-health allies for {shield} for 4s.',
      vals: { shield: [180, 260, 400], n: [2, 2, 3] },
      vfx: { type: 'holy', color: '#ffe48a' },
    },
  }),
  witchdoctor: U({
    name: 'Zandalari Witch Doctor', cost: 2, origin: 'troll', cls: 'shaman',
    hp: 600, ad: 40, as: 0.7, range: 3, armor: 20, mr: 30, mana: 70, startMana: 20,
    model: { body: 'troll', gear: 'shaman', primary: '#1c6b5e', secondary: '#7a3f9a', accent: '#55e0c8' },
    lore: 'He got a hex for every occasion.',
    ability: {
      name: 'Hex', kind: 'nuke', apScale: ['dmg'], targeting: 'highestAd',
      desc: 'Hex the enemy with the most Attack Damage, dealing {dmg} magic damage and stunning it for {stun}s.',
      vals: { dmg: [180, 260, 400], stun: [2, 2.5, 3] },
      vfx: { type: 'hex', color: '#55e0c8' },
    },
  }),
  thunderguard: U({
    name: 'Thunderguard Defender', cost: 2, origin: 'dwarf', cls: 'paladin',
    hp: 800, ad: 55, as: 0.55, range: 1, armor: 50, mr: 30, mana: 90, startMana: 40,
    model: { body: 'dwarf', gear: 'paladin', primary: '#b88a2e', secondary: '#8a96a3', accent: '#ffe48a' },
    lore: 'His hammer has an opinion on every argument.',
    ability: {
      name: 'Hammer of Justice', kind: 'nuke', apScale: ['dmg'],
      desc: 'Hurl a hammer at the target, dealing {dmg} magic damage and stunning it for {stun}s.',
      vals: { dmg: [220, 330, 500], stun: [2, 2, 2.5] },
      vfx: { type: 'hammer', color: '#ffe48a' },
    },
  }),
  plaguerogue: U({
    name: 'Undercity Plaguebringer', cost: 2, origin: 'undead', cls: 'rogue',
    hp: 600, ad: 60, as: 0.75, range: 1, armor: 25, mr: 20, mana: 50, startMana: 0,
    model: { body: 'undead', gear: 'rogue', primary: '#2e3b24', secondary: '#4a2f45', accent: '#9ef04a' },
    lore: 'The new plague is ready. Test it on the living.',
    ability: {
      name: 'Envenom', kind: 'dot', apScale: ['dmg'],
      desc: 'Poison the target, dealing {dmg} magic damage over 4s and reducing its healing by 50%.',
      vals: { dmg: [280, 420, 650] }, dur: 4, grievous: true,
      vfx: { type: 'poison', color: '#9ef04a' },
    },
  }),
  felcaller: U({
    name: 'Shadow Council Felcaller', cost: 2, origin: 'orc', cls: 'warlock',
    hp: 580, ad: 40, as: 0.65, range: 4, armor: 15, mr: 25, mana: 70, startMana: 20,
    model: { body: 'orc', gear: 'warlock', primary: '#3a1f4f', secondary: '#1c1c1c', accent: '#7fff3a' },
    lore: 'Traded his soul for a better offer.',
    ability: {
      name: 'Shadow Bolt', kind: 'nuke', apScale: ['dmg'],
      desc: 'Fire a bolt of shadow at the target, dealing {dmg} magic damage.',
      vals: { dmg: [300, 450, 680] },
      vfx: { type: 'orb', color: '#9a4dff' },
    },
  }),
  moonstrider: U({
    name: 'Ashenvale Moonstrider', cost: 2, origin: 'elf', cls: 'hunter',
    hp: 550, ad: 60, as: 0.75, range: 4, armor: 20, mr: 20, mana: 70, startMana: 10,
    model: { body: 'elf', gear: 'hunter', primary: '#2f5e3a', secondary: '#5a3f7a', accent: '#c7f0ff' },
    lore: 'Her arrows are blessed beneath the full moon.',
    ability: {
      name: 'Multi-Shot', kind: 'cone', physical: true,
      desc: 'Fire a fan of arrows, dealing {pct}% Attack Damage to all enemies in a cone toward the target.',
      vals: { pct: [150, 165, 200] }, length: 4,
      vfx: { type: 'arrow', color: '#c7f0ff' },
    },
  }),
  earthwarden: U({
    name: 'Thunder Bluff Earthwarden', cost: 2, origin: 'tauren', cls: 'warrior',
    hp: 850, ad: 55, as: 0.55, range: 1, armor: 45, mr: 30, mana: 90, startMana: 40,
    model: { body: 'tauren', gear: 'warrior', primary: '#7a3f1d', secondary: '#6b6b6b', accent: '#e0b060' },
    lore: 'The ground trembles at every step.',
    ability: {
      name: 'War Stomp', kind: 'aoeSelf', apScale: ['dmg'],
      desc: 'Stomp the ground, dealing {dmg} magic damage to adjacent enemies and stunning them for {stun}s.',
      vals: { dmg: [140, 210, 330], stun: [1.25, 1.5, 1.75] }, radius: 1.3,
      vfx: { type: 'shockwave', color: '#d9a25a' },
    },
  }),

  // ═════════════════════ 3-COST ═════════════════════
  battlemage: U({
    name: 'Dalaran Battlemage', cost: 3, origin: 'human', cls: 'mage',
    hp: 700, ad: 40, as: 0.7, range: 4, armor: 25, mr: 30, mana: 80, startMana: 30,
    model: { body: 'human', gear: 'mage', primary: '#5a2a8a', secondary: '#c9a227', accent: '#9ed3ff' },
    lore: 'Graduated top of her class at the Violet Citadel.',
    ability: {
      name: 'Blizzard', kind: 'aoeTarget', apScale: ['dmg'],
      desc: 'Call down a Blizzard around the target, dealing {dmg} magic damage to enemies within 2 hexes and slowing their attack speed by 30% for 3s.',
      vals: { dmg: [250, 375, 600] }, radius: 2.1, chill: 0.3,
      vfx: { type: 'frost', color: '#9ed3ff' },
    },
  }),
  spiritwalker: U({
    name: 'Spiritwalker', cost: 3, origin: 'tauren', cls: 'shaman',
    hp: 800, ad: 45, as: 0.65, range: 3, armor: 30, mr: 30, mana: 70, startMana: 10,
    model: { body: 'tauren', gear: 'shaman', primary: '#2b4d7a', secondary: '#8a6a3f', accent: '#7fd8ff' },
    lore: 'The storm whispers, and he listens.',
    ability: {
      name: 'Chain Lightning', kind: 'chain', apScale: ['dmg'],
      desc: 'Hurl lightning that bounces between {n} enemies, dealing {dmg} magic damage to each.',
      vals: { dmg: [220, 330, 520], n: [4, 5, 6] },
      vfx: { type: 'lightning', color: '#8fd8ff' },
    },
  }),
  deathknight: U({
    name: 'Ebon Blade Knight', cost: 3, origin: 'undead', cls: 'deathknight',
    hp: 900, ad: 65, as: 0.6, range: 1, armor: 40, mr: 40, mana: 90, startMana: 40,
    model: { body: 'undead', gear: 'deathknight', primary: '#1f2733', secondary: '#4f6a85', accent: '#6fe0ff' },
    lore: 'Freed from the Lich, still carrying his chill.',
    ability: {
      name: 'Death Grip', kind: 'pull', apScale: ['dmg'],
      desc: 'Pull the farthest enemy next to him, dealing {dmg} magic damage and stunning it for {stun}s.',
      vals: { dmg: [200, 300, 480], stun: [1.5, 1.75, 2] },
      vfx: { type: 'frost', color: '#6fe0ff' },
    },
  }),
  blademaster: U({
    name: 'Burning Blade Blademaster', cost: 3, origin: 'orc', cls: 'rogue',
    hp: 750, ad: 70, as: 0.75, range: 1, armor: 30, mr: 25, mana: 70, startMana: 0,
    model: { body: 'orc', gear: 'blademaster', primary: '#a8341c', secondary: '#2f2f2f', accent: '#ffb347' },
    lore: 'The last of his clan. The first to strike.',
    ability: {
      name: 'Bladestorm', kind: 'spin', physical: true,
      desc: 'Become a whirlwind of steel for 3s, dealing {pct}% Attack Damage to adjacent enemies every 0.5s. Immune to stuns while spinning.',
      vals: { pct: [70, 80, 100] }, dur: 3, radius: 1.4,
      vfx: { type: 'whirl', color: '#ffb347' },
    },
  }),
  keeper: U({
    name: 'Keeper of the Grove', cost: 3, origin: 'elf', cls: 'druid',
    hp: 800, ad: 45, as: 0.6, range: 3, armor: 30, mr: 35, mana: 100, startMana: 40,
    model: { body: 'keeper', gear: 'druid', primary: '#3e7a3a', secondary: '#6b4a2a', accent: '#c2ff7a' },
    lore: 'Half-god of the wilds, roots deep in the dreaming.',
    ability: {
      name: 'Tranquility', kind: 'healAll', apScale: ['heal'],
      desc: 'Channel Tranquility, healing all allies for {heal} Health.',
      vals: { heal: [200, 300, 480] },
      vfx: { type: 'nature', color: '#c2ff7a' },
    },
  }),
  felengineer: U({
    name: 'Gnomeregan Fel Engineer', cost: 3, origin: 'gnome', cls: 'warlock',
    hp: 600, ad: 40, as: 0.65, range: 4, armor: 20, mr: 25, mana: 80, startMana: 20,
    model: { body: 'gnome', gear: 'warlock', primary: '#4a1f5f', secondary: '#2a2a2a', accent: '#7fff3a' },
    lore: 'Fel-powered machinery — what could go wrong?',
    ability: {
      name: 'Rain of Fire', kind: 'aoeTarget', apScale: ['dmg'],
      desc: 'Rain fel fire on the largest clump of enemies, dealing {dmg} magic damage within 2 hexes.',
      vals: { dmg: [260, 390, 620] }, radius: 2.1, targeting: 'clump',
      vfx: { type: 'fel', color: '#7fff3a' },
    },
  }),
  mountainpriest: U({
    name: 'Bronzebeard Priestess', cost: 3, origin: 'dwarf', cls: 'priest',
    hp: 700, ad: 40, as: 0.6, range: 3, armor: 30, mr: 35, mana: 80, startMana: 30,
    model: { body: 'dwarf', gear: 'priest', primary: '#e8e3d0', secondary: '#c9a227', accent: '#fff2a8', female: true },
    lore: 'Her prayers ring like a forge-hammer.',
    ability: {
      name: 'Holy Nova', kind: 'nova', apScale: ['dmg', 'heal'],
      desc: 'Burst with holy light, dealing {dmg} magic damage to enemies within 2 hexes and healing allies within 2 hexes for {heal}.',
      vals: { dmg: [180, 270, 420], heal: [180, 270, 420] }, radius: 2.1,
      vfx: { type: 'holy', color: '#fff2a8' },
    },
  }),
  shadowfang: U({
    name: 'Shadowfang Stalker', cost: 3, origin: 'troll', cls: 'rogue',
    hp: 700, ad: 65, as: 0.8, range: 1, armor: 25, mr: 25, mana: 60, startMana: 0,
    model: { body: 'troll', gear: 'rogue', primary: '#2a2a3a', secondary: '#5a1f1f', accent: '#ff5a5a' },
    lore: 'You never see her coming. You rarely see her leave.',
    ability: {
      name: 'Eviscerate', kind: 'execute',
      desc: 'Deal {pct}% Attack Damage to the target. Executes enemies left below {exec}% Health.',
      vals: { pct: [300, 330, 400], exec: [15, 18, 25] },
      vfx: { type: 'slash', color: '#ff5a5a' },
    },
  }),

  // ═════════════════════ 4-COST ═════════════════════
  crusader: U({
    name: 'Crusader Commander', cost: 4, origin: 'human', cls: 'paladin',
    hp: 1000, ad: 75, as: 0.65, range: 1, armor: 55, mr: 45, mana: 100, startMana: 50,
    model: { body: 'human', gear: 'crusader', primary: '#f2efe4', secondary: '#c9a227', accent: '#ff3b3b', scale: 1.15 },
    lore: 'Leader of the Argent vanguard. Her faith is armor.',
    ability: {
      name: 'Divine Storm', kind: 'nova', apScale: ['dmg', 'heal'],
      desc: 'Unleash a storm of holy power, dealing {dmg} magic damage to adjacent enemies and healing nearby allies for {heal}.',
      vals: { dmg: [350, 525, 1200], heal: [250, 375, 900] }, radius: 1.5,
      vfx: { type: 'holy', color: '#ffe48a' },
    },
  }),
  champion: U({
    name: 'Kor\'kron Champion', cost: 4, origin: 'orc', cls: 'warrior',
    hp: 1050, ad: 85, as: 0.7, range: 1, armor: 50, mr: 40, mana: 90, startMana: 30,
    model: { body: 'orc', gear: 'champion', primary: '#5a1a12', secondary: '#2f2f2f', accent: '#ffcc33', scale: 1.15 },
    lore: 'Elite of the Warchief\'s guard. Has never taken a step backward.',
    ability: {
      name: 'Heroic Leap', kind: 'leap', apScale: ['dmg'],
      desc: 'Leap to the largest group of enemies, dealing {dmg} magic damage within 1 hex and stunning them for {stun}s.',
      vals: { dmg: [300, 450, 1100], stun: [1.5, 1.75, 3] }, radius: 1.4,
      vfx: { type: 'shockwave', color: '#ffcc33' },
    },
  }),
  archdruid: U({
    name: 'Cenarion Archdruid', cost: 4, origin: 'tauren', cls: 'druid',
    hp: 950, ad: 55, as: 0.65, range: 3, armor: 40, mr: 45, mana: 100, startMana: 40,
    model: { body: 'tauren', gear: 'archdruid', primary: '#2f5c6b', secondary: '#c9a227', accent: '#e0e8ff', scale: 1.15 },
    lore: 'Calls the very stars from the sky.',
    ability: {
      name: 'Starfall', kind: 'starfall', apScale: ['dmg'],
      desc: 'Call down {n} stars over 2s on random enemies, each dealing {dmg} magic damage in a small area.',
      vals: { dmg: [140, 210, 600], n: [6, 7, 9] }, radius: 1.2,
      vfx: { type: 'star', color: '#e0e8ff' },
    },
  }),
  darkranger: U({
    name: 'Dark Ranger', cost: 4, origin: 'undead', cls: 'hunter',
    hp: 800, ad: 80, as: 0.8, range: 4, armor: 30, mr: 30, mana: 70, startMana: 10,
    model: { body: 'undead', gear: 'darkranger', primary: '#2a1f3a', secondary: '#5a1f3a', accent: '#c25aff', female: true, scale: 1.1 },
    lore: 'Once a ranger of the elves. Now she hunts for the Banshee Queen.',
    ability: {
      name: 'Black Arrow', kind: 'physNuke',
      desc: 'Fire a Black Arrow dealing {pct}% Attack Damage. If it kills, a skeletal archer rises to fight for you.',
      vals: { pct: [300, 350, 600] }, summonOnKill: 'skeleton_archer',
      vfx: { type: 'arrow', color: '#c25aff' },
    },
  }),
  archmage: U({
    name: 'Kirin Tor Archmage', cost: 4, origin: 'human', cls: 'mage',
    hp: 800, ad: 45, as: 0.7, range: 4, armor: 30, mr: 40, mana: 90, startMana: 30,
    model: { body: 'human', gear: 'archmage', primary: '#7a2fa8', secondary: '#e8e3d0', accent: '#ff7a2a', scale: 1.1 },
    lore: 'Has mastered fire, frost and arcane — and never shuts up about it.',
    ability: {
      name: 'Pyroblast', kind: 'nuke', apScale: ['dmg'], splash: 1.3,
      desc: 'Hurl a massive Pyroblast at the target, dealing {dmg} magic damage and half that to adjacent enemies, then burning them for 3s.',
      vals: { dmg: [450, 675, 1600] }, burn: 0.05,
      vfx: { type: 'fireball', color: '#ff7a2a' },
    },
  }),
  illidari: U({
    name: 'Illidari Demon Hunter', cost: 4, origin: 'elf', cls: 'rogue',
    hp: 900, ad: 75, as: 0.8, range: 1, armor: 35, mr: 35, mana: 80, startMana: 20,
    model: { body: 'demonhunter', gear: 'warglaive', primary: '#1a1a1a', secondary: '#3a6b2a', accent: '#7fff3a', scale: 1.15 },
    lore: 'Blind, but sees all. You are not prepared.',
    ability: {
      name: 'Metamorphosis', kind: 'meta',
      desc: 'Transform into a demon for 6s: gain {as}% Attack Speed, {vamp}% Omnivamp, and attacks deal {fel} bonus magic damage.',
      vals: { as: [50, 60, 120], vamp: [25, 30, 50], fel: [40, 60, 150] }, apScale: ['fel'], dur: 6,
      vfx: { type: 'fel', color: '#7fff3a' },
    },
  }),

  // ═════════════════════ 5-COST ═════════════════════
  stormwarchief: U({
    name: 'Storm Warchief', cost: 5, origin: 'orc', cls: 'shaman',
    hp: 1200, ad: 80, as: 0.75, range: 1, armor: 55, mr: 50, mana: 100, startMana: 40,
    model: { body: 'orc', gear: 'warchief', primary: '#2a4f7a', secondary: '#1c1c1c', accent: '#8fd8ff', scale: 1.25 },
    lore: 'Son of Durotan, wielder of the Doomhammer\'s storm.',
    ability: {
      name: 'Thunderstorm', kind: 'storm', apScale: ['dmg'],
      desc: 'Summon a storm: {n} lightning bolts strike random enemies for {dmg} magic damage each, stunning them for 1s.',
      vals: { dmg: [250, 375, 2000], n: [6, 8, 12] },
      vfx: { type: 'lightning', color: '#8fd8ff' },
    },
  }),
  mountainking: U({
    name: 'Mountain King', cost: 5, origin: 'dwarf', cls: 'warrior',
    hp: 1400, ad: 90, as: 0.7, range: 1, armor: 70, mr: 50, mana: 110, startMana: 50,
    model: { body: 'dwarf', gear: 'mountainking', primary: '#3a5a8a', secondary: '#c9a227', accent: '#9fe0ff', scale: 1.4 },
    lore: 'King under the mountain. His Avatar shakes the earth.',
    ability: {
      name: 'Avatar & Thunderclap', kind: 'avatar', apScale: ['dmg'],
      desc: 'Grow massive for the rest of combat, gaining {hp} max Health, then Thunderclap for {dmg} magic damage to enemies within 2 hexes and stun them for 1.5s.',
      vals: { hp: [600, 900, 3000], dmg: [300, 450, 1500] }, radius: 2.1,
      vfx: { type: 'shockwave', color: '#9fe0ff' },
    },
  }),
  moonpriestess: U({
    name: 'High Priestess of Elune', cost: 5, origin: 'elf', cls: 'priest',
    hp: 1000, ad: 60, as: 0.75, range: 4, armor: 40, mr: 60, mana: 100, startMana: 50,
    model: { body: 'elf', gear: 'moonpriestess', primary: '#e8e8ff', secondary: '#6a4aa8', accent: '#bfe0ff', female: true, scale: 1.2 },
    lore: 'Voice of the Goddess. Her light falls on friend and foe alike.',
    ability: {
      name: 'Wrath of Elune', kind: 'nova', apScale: ['dmg', 'heal'], global: true,
      desc: 'Moonlight falls across the battlefield: ALL enemies take {dmg} magic damage and ALL allies heal {heal}.',
      vals: { dmg: [200, 300, 1500], heal: [200, 300, 1500] },
      vfx: { type: 'moon', color: '#bfe0ff' },
    },
  }),
  deathlord: U({
    name: 'Ebon Deathlord', cost: 5, origin: 'undead', cls: 'deathknight',
    hp: 1300, ad: 85, as: 0.7, range: 1, armor: 60, mr: 60, mana: 110, startMana: 40,
    model: { body: 'undead', gear: 'deathlord', primary: '#1a2430', secondary: '#4f6a85', accent: '#6fe0ff', scale: 1.3 },
    lore: 'Once a prince, then a king of the dead. Now something in-between.',
    ability: {
      name: 'Army of the Dead', kind: 'summon', apScale: [],
      desc: 'Raise {n} ghouls on nearby hexes and gain a {shield} shield.',
      vals: { n: [2, 3, 6], shield: [400, 600, 2000] }, summon: 'ghoul',
      vfx: { type: 'frost', color: '#6fe0ff' },
    },
  }),
  flamewing: U({
    name: 'Flamewing Aspect', cost: 5, origin: 'dragon', cls: 'mage',
    hp: 1100, ad: 60, as: 0.7, range: 3, armor: 40, mr: 50, mana: 110, startMana: 40,
    model: { body: 'dragonkin', gear: 'none', primary: '#b8321c', secondary: '#ffb03a', accent: '#ffe08a', scale: 1.2 },
    lore: 'A scion of the red dragonflight, keeper of life and flame.',
    ability: {
      name: 'Dragon\'s Breath', kind: 'cone', apScale: ['dmg'],
      desc: 'Breathe fire in a long cone, dealing {dmg} magic damage and burning enemies for 3s.',
      vals: { dmg: [400, 600, 2200] }, length: 5, burn: 0.06,
      vfx: { type: 'fire', color: '#ff7a2a' },
    },
    unlock: 'dragons',
  }),
  bronzewing: U({
    name: 'Bronze Chronomancer', cost: 5, origin: 'dragon', cls: 'priest',
    hp: 1100, ad: 55, as: 0.7, range: 3, armor: 45, mr: 55, mana: 100, startMana: 50,
    model: { body: 'dragonkin', gear: 'none', primary: '#a8781c', secondary: '#e8c25a', accent: '#fff2a8', scale: 1.2 },
    lore: 'Time is a river. She bends its course.',
    ability: {
      name: 'Rewind Time', kind: 'rewind', apScale: ['heal'],
      desc: 'Rewind time for allies: heal all allies for {heal} and restore {mana} Mana to each.',
      vals: { heal: [300, 450, 2000], mana: [20, 30, 60] },
      vfx: { type: 'holy', color: '#fff2a8' },
    },
    unlock: 'dragons',
  }),

  // ═════════════════════ MONSTERS (enemy-only) ═════════════════════
  murloc: U({
    name: 'Murloc Tidehunter', cost: 1, enemyOnly: true,
    hp: 420, ad: 38, as: 0.75, range: 1, armor: 15, mr: 15, mana: 999, startMana: 0,
    model: { body: 'murloc', primary: '#3a8a6a', secondary: '#c9e8a0', accent: '#ff7a5a' },
    lore: 'Mrglglglgl!',
  }),
  murlocoracle: U({
    name: 'Murloc Oracle', cost: 2, enemyOnly: true,
    hp: 480, ad: 30, as: 0.6, range: 3, armor: 15, mr: 25, mana: 80, startMana: 20,
    model: { body: 'murloc', primary: '#3a5a9a', secondary: '#c9e8ff', accent: '#ffe08a', staff: true },
    lore: 'Mrrrgl mrgl! (It is casting something.)',
    ability: {
      name: 'Tidal Heal', kind: 'healLowest', apScale: ['heal', 'dmg'],
      desc: 'Deal {dmg} magic damage to target and heal the lowest ally for {heal}.',
      vals: { heal: [180, 270, 400], dmg: [60, 90, 140] },
      vfx: { type: 'holy', color: '#7fd8ff' },
    },
  }),
  kobold: U({
    name: 'Kobold Tunneler', cost: 1, enemyOnly: true,
    hp: 450, ad: 40, as: 0.65, range: 1, armor: 20, mr: 15, mana: 999, startMana: 0,
    model: { body: 'kobold', primary: '#8a6a4a', secondary: '#4a4a4a', accent: '#ffe08a' },
    lore: 'You no take candle!',
  }),
  gnoll: U({
    name: 'Riverpaw Gnoll', cost: 1, enemyOnly: true,
    hp: 520, ad: 45, as: 0.65, range: 1, armor: 20, mr: 15, mana: 999, startMana: 0,
    model: { body: 'gnoll', primary: '#9a7a4a', secondary: '#5a3a2a', accent: '#c94a2a' },
    lore: 'A mangy hyena-man with a rusty flail.',
  }),
  wolf: U({
    name: 'Dire Wolf', cost: 1, enemyOnly: true,
    hp: 480, ad: 48, as: 0.8, range: 1, armor: 15, mr: 15, mana: 999, startMana: 0,
    model: { body: 'wolf', primary: '#5a5a5a', secondary: '#8a8a8a', accent: '#ffcc33' },
    lore: 'Hunts in packs. Smells your fear.',
  }),
  worgen: U({
    name: 'Bloodfang Worgen', cost: 2, enemyOnly: true,
    hp: 700, ad: 60, as: 0.8, range: 1, armor: 25, mr: 20, mana: 60, startMana: 0,
    model: { body: 'worgen', primary: '#4a3a2a', secondary: '#2a2a2a', accent: '#ffcc33' },
    lore: 'The curse runs hot in its blood.',
    ability: {
      name: 'Savage Bite', kind: 'physNuke',
      desc: 'Maul the target for {pct}% Attack Damage.', vals: { pct: [220, 240, 280] },
      vfx: { type: 'slash', color: '#ff4a4a' },
    },
  }),
  spider: U({
    name: 'Duskwood Venomspider', cost: 1, enemyOnly: true,
    hp: 460, ad: 42, as: 0.7, range: 1, armor: 20, mr: 20, mana: 70, startMana: 0,
    model: { body: 'spider', primary: '#2a1f2a', secondary: '#5a2a4a', accent: '#9ef04a' },
    lore: 'Many eyes. Many legs. Many teeth.',
    ability: {
      name: 'Venom Spit', kind: 'dot', apScale: ['dmg'],
      desc: 'Spit venom for {dmg} magic damage over 4s.', vals: { dmg: [180, 270, 400] }, dur: 4,
      vfx: { type: 'poison', color: '#9ef04a' },
    },
  }),
  skeleton: U({
    name: 'Risen Skeleton', cost: 1, enemyOnly: true,
    hp: 400, ad: 42, as: 0.7, range: 1, armor: 25, mr: 10, mana: 999, startMana: 0,
    model: { body: 'skeleton', primary: '#d9d2bf', secondary: '#4a4a4a', accent: '#6fe0ff' },
    lore: 'Rattle rattle.',
  }),
  skeleton_archer: U({
    name: 'Skeletal Archer', cost: 1, enemyOnly: true,
    hp: 350, ad: 45, as: 0.75, range: 4, armor: 10, mr: 10, mana: 999, startMana: 0,
    model: { body: 'skeleton', primary: '#d9d2bf', secondary: '#3a2a4a', accent: '#c25aff', bow: true },
    lore: 'Bones that remember the bowstring.',
  }),
  ghoul: U({
    name: 'Scourge Ghoul', cost: 1, enemyOnly: true,
    hp: 450, ad: 45, as: 0.8, range: 1, armor: 15, mr: 15, mana: 999, startMana: 0,
    model: { body: 'ghoul', primary: '#6a7a5a', secondary: '#3a2a2a', accent: '#c94a4a' },
    lore: 'Hungry. Always hungry.',
  }),
  raptor: U({
    name: 'Bloodscalp Raptor', cost: 2, enemyOnly: true,
    hp: 620, ad: 58, as: 0.85, range: 1, armor: 25, mr: 20, mana: 999, startMana: 0,
    model: { body: 'raptor', primary: '#4a7a3a', secondary: '#c9a050', accent: '#ff5a2a' },
    lore: 'Clever girl.',
  }),
  jungletroll: U({
    name: 'Bloodscalp Berserker', cost: 2, enemyOnly: true,
    hp: 680, ad: 60, as: 0.75, range: 1, armor: 25, mr: 20, mana: 70, startMana: 0,
    model: { body: 'troll', gear: 'blademaster', primary: '#7a2a2a', secondary: '#3a2a1a', accent: '#ffcc33' },
    lore: 'Painted in the blood of its rivals.',
    ability: {
      name: 'Frenzy', kind: 'meta', desc: 'Frenzy for 4s: +{as}% Attack Speed and {vamp}% Omnivamp.',
      vals: { as: [50, 60, 80], vamp: [20, 25, 35], fel: [0, 0, 0] }, dur: 4,
      vfx: { type: 'fire', color: '#ff5a2a' },
    },
  }),
  trollshadow: U({
    name: 'Shadowpriest of Hakkar', cost: 3, enemyOnly: true,
    hp: 650, ad: 40, as: 0.65, range: 3, armor: 20, mr: 35, mana: 70, startMana: 20,
    model: { body: 'troll', gear: 'warlock', primary: '#3a1f4f', secondary: '#7a1f1f', accent: '#ff3a6a' },
    lore: 'The Soulflayer hungers through him.',
    ability: {
      name: 'Blood Siphon', kind: 'nuke', apScale: ['dmg'], drain: true,
      desc: 'Siphon {dmg} magic damage from the target, healing himself for the same amount.',
      vals: { dmg: [220, 330, 500] }, vfx: { type: 'orb', color: '#ff3a6a' },
    },
  }),
  fireelemental: U({
    name: 'Lesser Fire Elemental', cost: 2, enemyOnly: true,
    hp: 600, ad: 50, as: 0.7, range: 2, armor: 20, mr: 40, mana: 70, startMana: 20,
    model: { body: 'elemental', primary: '#ff5a1a', secondary: '#ffcc33', accent: '#fff2a8' },
    lore: 'Living flame, bound to the will of the Firelord.',
    ability: {
      name: 'Flame Burst', kind: 'aoeTarget', apScale: ['dmg'],
      desc: 'Burst flames on the target area for {dmg} magic damage.', vals: { dmg: [180, 270, 400] }, radius: 1.3,
      vfx: { type: 'fire', color: '#ff7a2a' },
    },
  }),
  direiron: U({
    name: 'Dark Iron Guardsman', cost: 2, enemyOnly: true,
    hp: 750, ad: 55, as: 0.6, range: 1, armor: 55, mr: 25, mana: 90, startMana: 30,
    model: { body: 'dwarf', gear: 'warrior', primary: '#3a2a2a', secondary: '#5a5a5a', accent: '#ff5a1a' },
    lore: 'Servant of the Ragnaros-worshipping clan.',
    ability: {
      name: 'Shield Bash', kind: 'nuke', apScale: ['dmg'],
      desc: 'Bash for {dmg} damage and stun {stun}s.', vals: { dmg: [150, 225, 340], stun: [1.5, 1.75, 2] },
      vfx: { type: 'impact', color: '#ff7a2a' },
    },
  }),
  coregolem: U({
    name: 'Molten Core Hound', cost: 3, enemyOnly: true,
    hp: 900, ad: 65, as: 0.7, range: 1, armor: 40, mr: 40, mana: 80, startMana: 0,
    model: { body: 'wolf', primary: '#3a1a1a', secondary: '#ff5a1a', accent: '#ffcc33', molten: true },
    lore: 'A two-headed hound of molten rock.',
    ability: {
      name: 'Lava Breath', kind: 'cone', apScale: ['dmg'],
      desc: 'Breathe lava in a cone for {dmg} magic damage.', vals: { dmg: [220, 330, 500] }, length: 3,
      vfx: { type: 'fire', color: '#ff5a1a' },
    },
  }),
  whelp: U({
    name: 'Black Dragon Whelp', cost: 2, enemyOnly: true,
    hp: 550, ad: 50, as: 0.75, range: 2, armor: 25, mr: 30, mana: 70, startMana: 20,
    model: { body: 'whelp', primary: '#2a2a2a', secondary: '#7a1f1f', accent: '#ff7a2a' },
    lore: 'Small, angry, flammable.',
    ability: {
      name: 'Fire Spit', kind: 'nuke', apScale: ['dmg'], desc: 'Spit fire for {dmg} magic damage.',
      vals: { dmg: [200, 300, 450] }, vfx: { type: 'fireball', color: '#ff7a2a' },
    },
  }),
  abomination: U({
    name: 'Patchwork Abomination', cost: 3, enemyOnly: true,
    hp: 1200, ad: 60, as: 0.55, range: 1, armor: 40, mr: 20, mana: 90, startMana: 20,
    model: { body: 'abomination', primary: '#8aa07a', secondary: '#5a3a3a', accent: '#9ef04a' },
    lore: 'Patchwerk wants to play.',
    ability: {
      name: 'Poison Cloud', kind: 'aoeSelf', apScale: ['dmg'], desc: 'Belch a poison cloud for {dmg} magic damage to adjacent enemies.',
      vals: { dmg: [200, 300, 450], stun: [0, 0, 0] }, radius: 1.5, vfx: { type: 'poison', color: '#9ef04a' },
    },
  }),
  frostwyrm: U({
    name: 'Frost Wyrm', cost: 4, enemyOnly: true,
    hp: 1400, ad: 70, as: 0.6, range: 3, armor: 45, mr: 45, mana: 90, startMana: 30,
    model: { body: 'whelp', primary: '#bfe8ff', secondary: '#4f6a85', accent: '#6fe0ff', bone: true, scale: 1.35 },
    lore: 'Bones of an ancient dragon, animated by frost.',
    ability: {
      name: 'Frost Breath', kind: 'cone', apScale: ['dmg'], desc: 'Frost breath for {dmg} magic damage.',
      vals: { dmg: [300, 450, 700] }, length: 4, chill: 0.3, vfx: { type: 'frost', color: '#9ed3ff' },
    },
  }),

  // ─── Bosses ───
  boss_gnoll: U({
    name: 'Grimfang, Gnoll Warlord', cost: 5, enemyOnly: true, boss: true,
    hp: 2600, ad: 90, as: 0.7, range: 1, armor: 45, mr: 35, mana: 80, startMana: 20,
    model: { body: 'gnoll', primary: '#7a4a2a', secondary: '#3a2a1a', accent: '#ffcc33', scale: 1.5 },
    lore: 'The terror of the Vale. A 3-star bounty is on his head.',
    ability: {
      name: 'Enrage', kind: 'meta', desc: 'Enrage for 5s: +{as}% Attack Speed and {vamp}% Omnivamp.',
      vals: { as: [80, 80, 80], vamp: [30, 30, 30], fel: [0, 0, 0] }, dur: 5,
      vfx: { type: 'fire', color: '#ff5a2a' },
    },
  }),
  boss_worgen: U({
    name: 'Nightbane, Worgen Alpha', cost: 5, enemyOnly: true, boss: true,
    hp: 3200, ad: 100, as: 0.85, range: 1, armor: 45, mr: 45, mana: 70, startMana: 0,
    model: { body: 'worgen', primary: '#2a2a3a', secondary: '#1a1a1a', accent: '#c25aff', scale: 1.5 },
    lore: 'The moon rises over Duskhollow, and he answers.',
    ability: {
      name: 'Bloodcurdling Howl', kind: 'aoeSelf', apScale: ['dmg'],
      desc: 'Howl, dealing {dmg} magic damage to nearby enemies and stunning them for {stun}s.',
      vals: { dmg: [350, 350, 350], stun: [1.5, 1.5, 1.5] }, radius: 2.1,
      vfx: { type: 'shockwave', color: '#c25aff' },
    },
  }),
  boss_troll: U({
    name: 'Jin\'zak the Soulflayer', cost: 5, enemyOnly: true, boss: true,
    hp: 3800, ad: 100, as: 0.75, range: 2, armor: 50, mr: 50, mana: 90, startMana: 30,
    model: { body: 'troll', gear: 'warlock', primary: '#5a1f1f', secondary: '#1a1a1a', accent: '#ff3a6a', scale: 1.5 },
    lore: 'High Priest of the Blood God. His altar thirsts.',
    ability: {
      name: 'Blood Siphon', kind: 'chain', apScale: ['dmg'], drain: true,
      desc: 'Siphon blood from {n} enemies for {dmg} magic damage each, healing himself.',
      vals: { dmg: [300, 300, 300], n: [5, 5, 5] }, vfx: { type: 'lightning', color: '#ff3a6a' },
    },
  }),
  boss_fire: U({
    name: 'Pyrothane the Firelord', cost: 5, enemyOnly: true, boss: true,
    hp: 4800, ad: 120, as: 0.65, range: 2, armor: 60, mr: 60, mana: 100, startMana: 30,
    model: { body: 'firelord', primary: '#ff4a0a', secondary: '#2a1a1a', accent: '#ffe08a', scale: 1.45 },
    lore: 'BY FIRE BE PURGED!',
    ability: {
      name: 'Sulfuras Smash', kind: 'aoeTarget', apScale: ['dmg'],
      desc: 'Smash the target area for {dmg} magic damage within 2 hexes, burning enemies.',
      vals: { dmg: [450, 450, 450] }, radius: 2.1, burn: 0.06, vfx: { type: 'fire', color: '#ff5a1a' },
    },
  }),
  boss_lich: U({
    name: 'The Frost Sovereign', cost: 5, enemyOnly: true, boss: true,
    hp: 6500, ad: 140, as: 0.7, range: 1, armor: 70, mr: 70, mana: 100, startMana: 40,
    model: { body: 'undead', gear: 'lichking', primary: '#2a3a4f', secondary: '#7a8a9a', accent: '#6fe0ff', scale: 1.6 },
    lore: 'The throne is cold. The crown is heavier. All will serve.',
    ability: {
      name: 'Remorseless Winter', kind: 'aoeSelf', apScale: ['dmg'],
      desc: 'Unleash Remorseless Winter: {dmg} magic damage to enemies within 3 hexes, stunning for {stun}s.',
      vals: { dmg: [500, 500, 500], stun: [1.5, 1.5, 1.5] }, radius: 3.2,
      vfx: { type: 'frost', color: '#6fe0ff' },
    },
  }),
};

// Shop pool: copies available per tier (shared pool like TFT, but solo).
export const POOL_SIZE = { 1: 22, 2: 18, 3: 14, 4: 10, 5: 7 };

// Roll odds by player level (index = level), per cost tier 1..5.
export const SHOP_ODDS = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [45, 33, 20, 2, 0],
  6: [30, 40, 25, 5, 0],
  7: [19, 30, 35, 15, 1],
  8: [16, 20, 35, 25, 4],
  9: [9, 15, 30, 30, 16],
  10: [5, 10, 20, 40, 25],
};

export const XP_TO_LEVEL = { 1: 2, 2: 2, 3: 6, 4: 10, 5: 20, 6: 36, 7: 48, 8: 72, 9: 84 };
export const MAX_LEVEL = 10;

export const COST_COLORS = { 1: '#9aa3ad', 2: '#2ecc71', 3: '#3498db', 4: '#b05ce8', 5: '#f5b041' };

export function playableUnitIds(unlocks = {}) {
  return Object.keys(UNITS).filter(id => {
    const u = UNITS[id];
    if (u.enemyOnly) return false;
    if (u.unlock && !unlocks[u.unlock]) return false;
    return true;
  });
}
