// World content: zones of the run, boons (run relics), events, and the
// permanent talents bought with Valor in the Hall of Heroes.

export const ZONES = [
  {
    id: 'vale', name: 'Verdant Vale', subtitle: 'Act I', env: 'forest',
    desc: 'Rolling meadows and old oaks. Gnolls and murlocs plague the farmsteads.',
    monsters: ['murloc', 'kobold', 'gnoll', 'wolf', 'murlocoracle'],
    elites: ['worgen', 'murlocoracle', 'gnoll'],
    boss: 'boss_gnoll', bossMinions: ['gnoll', 'gnoll', 'kobold', 'wolf'],
    tier: 1, color: '#6fbf4a',
  },
  {
    id: 'dusk', name: 'Duskhollow Woods', subtitle: 'Act II', env: 'dusk',
    desc: 'Eternal twilight. The dead do not stay buried and wolves walk on two legs.',
    monsters: ['wolf', 'worgen', 'spider', 'skeleton', 'ghoul'],
    elites: ['worgen', 'spider', 'skeleton_archer'],
    boss: 'boss_worgen', bossMinions: ['worgen', 'worgen', 'wolf', 'spider', 'skeleton_archer'],
    tier: 2, color: '#8e5bd6',
  },
  {
    id: 'jungle', name: 'Thornvine Jungle', subtitle: 'Act III', env: 'jungle',
    desc: 'Steaming jungle ruled by raptors and blood-mad trolls.',
    monsters: ['raptor', 'jungletroll', 'spider', 'trollshadow', 'headhunter'],
    elites: ['trollshadow', 'jungletroll', 'shadowfang'],
    boss: 'boss_troll', bossMinions: ['jungletroll', 'jungletroll', 'raptor', 'trollshadow', 'raptor'],
    tier: 3, color: '#2fa8a0',
  },
  {
    id: 'forge', name: 'Searing Depths', subtitle: 'Act IV', env: 'volcanic',
    desc: 'Rivers of magma beneath the mountain. The Firelord stirs.',
    monsters: ['fireelemental', 'direiron', 'coregolem', 'whelp'],
    elites: ['coregolem', 'whelp', 'fireelemental'],
    boss: 'boss_fire', bossMinions: ['coregolem', 'fireelemental', 'fireelemental', 'direiron', 'whelp', 'whelp'],
    tier: 4, color: '#e8762c',
  },
  {
    id: 'citadel', name: 'The Frozen Citadel', subtitle: 'Act V', env: 'frozen',
    desc: 'The roof of the world. Here sits the Frost Sovereign upon his throne.',
    monsters: ['skeleton', 'ghoul', 'abomination', 'frostwyrm', 'deathknight', 'skeleton_archer'],
    elites: ['frostwyrm', 'abomination', 'deathknight'],
    boss: 'boss_lich', bossMinions: ['frostwyrm', 'abomination', 'deathknight', 'ghoul', 'ghoul', 'skeleton_archer', 'deathknight'],
    tier: 5, color: '#48c9e5',
  },
];

// Rival warbands for elite encounters — composed from the champion pool.
export const RIVALS = [
  { name: 'Horde Vanguard', banner: '#8e1f14', units: ['grunt', 'headhunter', 'felcaller', 'blademaster', 'spiritwalker', 'champion', 'witchdoctor', 'stormwarchief'] },
  { name: 'Alliance Expedition', banner: '#2a4f9e', units: ['footman', 'rifleman', 'initiate', 'thunderguard', 'battlemage', 'mountainpriest', 'crusader', 'archmage', 'mountainking'] },
  { name: 'Cult of the Damned', banner: '#3a5a4a', units: ['acolyte', 'plaguerogue', 'deathknight', 'darkranger', 'ghoul', 'abomination', 'deathlord'] },
  { name: 'Cenarion Circle', banner: '#2f6b3a', units: ['sentinel', 'brave', 'moonstrider', 'keeper', 'archdruid', 'illidari', 'moonpriestess'] },
];

// Boons are run-long blessings. `effect` is interpreted by stats.js / run.js.
export const BOONS = {
  kings: { name: 'Blessing of Kings', icon: '👑', rarity: 'rare', desc: 'All your units gain +10% Health, AD and AP.', effect: { allPct: 0.1 } },
  might: { name: 'Blessing of Might', icon: '💪', rarity: 'common', desc: 'All your units gain +12 Attack Damage.', effect: { ad: 12 } },
  wisdom: { name: 'Blessing of Wisdom', icon: '📘', rarity: 'common', desc: 'All your units gain +20 Ability Power.', effect: { ap: 20 } },
  fortitude: { name: 'Power Word: Fortitude', icon: '✚', rarity: 'common', desc: 'All your units gain +150 Health.', effect: { hp: 150 } },
  arcaneint: { name: 'Arcane Brilliance', icon: '✺', rarity: 'common', desc: 'All your units start combat with +15 Mana.', effect: { startMana: 15 } },
  markwild: { name: 'Mark of the Wild', icon: '❦', rarity: 'common', desc: 'All your units gain +15 Armor and +15 Magic Resist.', effect: { armor: 15, mr: 15 } },
  bloodlust: { name: 'Drums of Bloodlust', icon: '🥁', rarity: 'rare', desc: 'All your units gain +20% Attack Speed.', effect: { asPct: 0.2 } },
  hearth: { name: 'Hearthstone', icon: '🏠', rarity: 'common', desc: 'Restore 8 Health after every match you win.', effect: { healAfterWin: 8 } },
  goblinbank: { name: 'Goblin Bank Note', icon: '💰', rarity: 'common', desc: 'Interest cap increased by 3 gold.', effect: { interestCap: 3 } },
  luckycoin: { name: 'Lucky Fishing Lure', icon: '🎣', rarity: 'common', desc: 'Your first shop reroll each round is free.', effect: { freeReroll: 1 } },
  banner: { name: 'Warchief\'s Banner', icon: '🚩', rarity: 'legendary', desc: '+1 maximum units on the board.', effect: { boardSlot: 1 } },
  ironskin: { name: 'Ironbark Totem', icon: '🌳', rarity: 'rare', desc: 'Your frontline (front two rows) gains +300 Health.', effect: { frontHp: 300 } },
  sniper: { name: 'Scope of Precision', icon: '🎯', rarity: 'rare', desc: 'Your backline (back two rows) gains +25% Attack Damage and +25 AP.', effect: { backDmg: 0.25 } },
  midas: { name: 'Gilded Purse', icon: '🪙', rarity: 'rare', desc: 'Gain +2 extra gold every round.', effect: { roundGold: 2 } },
  scavenger: { name: 'Scavenger\'s Satchel', icon: '🎒', rarity: 'rare', desc: 'Enemies drop items more often.', effect: { dropBonus: 0.15 } },
  phoenix: { name: 'Ashes of Al\'ar', icon: '🔥', rarity: 'legendary', desc: 'The first ally to die each combat is reborn with 50% Health.', effect: { phoenix: 0.5 } },
  critlord: { name: 'Eye of the Storm', icon: '⚡', rarity: 'rare', desc: 'All your units gain +15% Critical Strike chance.', effect: { crit: 0.15 } },
  vampire: { name: 'Vial of the Sunwell', icon: '🩸', rarity: 'rare', desc: 'All your units gain 10% Omnivamp.', effect: { omnivamp: 0.1 } },
  scholar: { name: 'Tome of the Ages', icon: '📜', rarity: 'common', desc: 'Gain 2 bonus XP every round.', effect: { roundXp: 2 } },
  sigil: { name: 'Sigil of the Champion', icon: '🏆', rarity: 'legendary', desc: 'Your highest-cost unit on the board gains +40% Health, AD and AP.', effect: { carryPct: 0.4 } },
};

export const BOON_RARITY_COLOR = { common: '#9aa3ad', rare: '#3498db', legendary: '#f5b041' };

// Events: each choice has a `do` string interpreted by run.js.
export const EVENTS = [
  {
    id: 'paladin', title: 'The Wounded Paladin', art: '✚',
    text: 'Collapsed beside the road lies a paladin of the Silver Hand, her armor dented and her strength fading. "Please... the Light will repay you."',
    choices: [
      { label: 'Tend her wounds (-10 Health)', do: 'hp:-10|boon:random_rare', hint: 'Lose 10 Health. Gain a rare Boon.' },
      { label: 'Take her sword and go', do: 'item:sword|gold:3', hint: 'Gain an Arcanite Shortsword and 3 gold.' },
      { label: 'Walk on', do: 'none', hint: 'Nothing happens.' },
    ],
  },
  {
    id: 'goblin', title: 'Gazlowe\'s Gamble', art: '🎲',
    text: 'A goblin with a gold tooth grins over a crate. "Double or nothin\', friend! Odds are... well, they\'re odds!"',
    choices: [
      { label: 'Bet 10 gold', do: 'gamble:10', hint: '50%: gain 25 gold. 50%: lose it.' },
      { label: 'Buy a mystery crate (8 gold)', do: 'gold:-8|item:random_full', hint: 'Spend 8 gold for a random completed item.' },
      { label: 'Decline', do: 'none', hint: 'Keep your gold.' },
    ],
  },
  {
    id: 'moonwell', title: 'Moonwell', art: '☾',
    text: 'A pool of silver water hums beneath the trees. Elune\'s light dances on its surface.',
    choices: [
      { label: 'Drink deeply', do: 'hp:20', hint: 'Restore 20 Health.' },
      { label: 'Fill your flasks', do: 'boon:arcaneint', hint: 'Gain Arcane Brilliance.' },
    ],
  },
  {
    id: 'mercenary', title: 'Sellsword Camp', art: '⚔',
    text: 'A band of mercenaries lounges by a fire. "Coin talks, friend. One of us could be convinced to join up."',
    choices: [
      { label: 'Hire a veteran (12 gold)', do: 'gold:-12|unit:random3', hint: 'Spend 12 gold: recruit a random 3-cost champion.' },
      { label: 'Hire a recruit (4 gold)', do: 'gold:-4|unit:random2', hint: 'Spend 4 gold: recruit a random 2-cost champion.' },
      { label: 'Move on', do: 'none', hint: 'Nothing happens.' },
    ],
  },
  {
    id: 'shrine', title: 'Forgotten Shrine', art: '⛩',
    text: 'An overgrown shrine to the Titans. Something still listens here.',
    choices: [
      { label: 'Pray for strength', do: 'boon:random_common', hint: 'Gain a random common Boon.' },
      { label: 'Offer blood (-15 Health)', do: 'hp:-15|boon:random_legendary', hint: 'Lose 15 Health. Gain a legendary Boon.' },
    ],
  },
  {
    id: 'blacksmith', title: 'Wandering Blacksmith', art: '⚒',
    text: 'A dwarven smith hammers at a portable anvil. "Bring me two bits o\' gear and I\'ll make ye something proper!"',
    choices: [
      { label: 'Commission a weapon', do: 'item:random_component|item:random_component', hint: 'Gain 2 random components.' },
      { label: 'Buy a whetstone (5 gold)', do: 'gold:-5|boon:might', hint: 'Spend 5 gold: Blessing of Might.' },
    ],
  },
  {
    id: 'tavern', title: 'The Lion\'s Pride Inn', art: '🍺',
    text: 'Warm hearth, cold ale, and a bard singing of heroes long gone.',
    choices: [
      { label: 'Rest (2 gold)', do: 'gold:-2|hp:15', hint: 'Spend 2 gold: restore 15 Health.' },
      { label: 'Listen to tales', do: 'xp:6', hint: 'Gain 6 XP.' },
      { label: 'Start a bar brawl', do: 'gold:6|hp:-6', hint: 'Gain 6 gold, lose 6 Health.' },
    ],
  },
  {
    id: 'cursedchest', title: 'Cursed Chest', art: '🗝',
    text: 'A black iron chest crawls with shadow. It will open... for a price.',
    choices: [
      { label: 'Pry it open (-12 Health)', do: 'hp:-12|item:random_full|item:random_component', hint: 'Lose 12 Health. Gain a completed item and a component.' },
      { label: 'Leave it', do: 'none', hint: 'Nothing happens.' },
    ],
  },
];

// Permanent meta-progression bought with Valor.
export const TALENTS = [
  { id: 'fortitude', name: 'Hardened Veteran', icon: '❤', max: 3, cost: [20, 40, 70], desc: r => `Start each run with +${r * 10} Health.` },
  { id: 'treasury', name: 'War Chest', icon: '💰', max: 3, cost: [20, 40, 70], desc: r => `Start each run with +${r * 3} gold.` },
  { id: 'recruit', name: 'Recruitment Drive', icon: '⚔', max: 2, cost: [30, 70], desc: r => `Start each run with ${r} extra random 1-cost champion${r === 1 ? '' : 's'}.` },
  { id: 'quartermaster', name: 'Quartermaster', icon: '🎒', max: 2, cost: [40, 80], desc: r => `Start each run with ${r} random item component${r === 1 ? '' : 's'}.` },
  { id: 'haggler', name: 'Silver Tongue', icon: '🗣', max: 2, cost: [30, 60], desc: r => `World merchant prices reduced by ${r * 15}%.` },
  { id: 'training', name: 'Barracks Drills', icon: '🛡', max: 3, cost: [30, 60, 100], desc: r => `All your units gain +${r * 5}% Health and Attack Damage.` },
  { id: 'arcane', name: 'Arcane Studies', icon: '✺', max: 3, cost: [30, 60, 100], desc: r => `All your units gain +${r * 8} Ability Power.` },
  { id: 'tactician', name: 'Grand Tactician', icon: '♟', max: 1, cost: [90], desc: () => 'Start each run at player level 3 (3 board slots).' },
  { id: 'banker', name: 'Goblin Investor', icon: '🪙', max: 1, cost: [80], desc: () => 'Interest cap increased by 2.' },
  { id: 'blessed', name: 'Blessed Beginnings', icon: '✧', max: 1, cost: [100], desc: () => 'Begin each run with a random common Boon.' },
  { id: 'dragons', name: 'Call of the Aspects', icon: '🐉', max: 1, cost: [150], desc: () => 'Dragonflight champions (5-cost) can appear in your shop.' },
];
