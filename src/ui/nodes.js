// Non-combat map nodes (event, rest, treasure, merchant) plus the
// post-match rewards, act-clear and game-over screens.

import { h, coin, itemEl, toast, portrait, traitChip } from './dom.js';
import {
  run, completeNode, advanceZone, endRun, randomEvent, applyEventChoice, canAfford,
  merchantStock, buyMerchant, claimReward, randomCompleted, addItem, gainXp, saveRun, meta,
} from '../game/run.js';
import { UNITS, COST_COLORS } from '../data/units.js';
import { ITEMS } from '../data/items.js';
import { BOONS, BOON_RARITY_COLOR, ZONES } from '../data/world.js';

// A slowly orbiting 3D backdrop of the player's warband in the current zone.
function backdrop(app) {
  const A = app.arena;
  A.setVisible(true);
  A.interactive = false;
  A.endCombat();
  const zone = ZONES[Math.min(run?.zoneIdx ?? 0, ZONES.length - 1)];
  A.setEnvironment(zone.env);
  const ids = run ? [...run.board, ...run.bench.filter(Boolean)].map(u => u.id).slice(0, 8) : [];
  A.showcase(ids.length ? ids : ['footman', 'grunt']);
  app.cleanup = () => A.stopShowcase();
}

function leave(app) {
  const r = completeNode();
  if (r === 'zoneClear') app.go('zoneClear');
  else app.go('map');
}

export function showNode(app, node) {
  backdrop(app);
  if (node.type === 'event') return eventScreen(app);
  if (node.type === 'rest') return restScreen(app);
  if (node.type === 'treasure') return treasureScreen(app);
  if (node.type === 'shop') return merchantScreen(app);
  return leave(app);
}

function sceneShell(app, inner) {
  const el = h(`<div class="screen scene-screen"><div class="panel scene-card">${inner}</div></div>`);
  app.ui.appendChild(el);
  return el;
}

// ─────────────────────────── Event ───────────────────────────
function eventScreen(app) {
  const ev = randomEvent();
  const el = sceneShell(app, `
    <div class="scene-art">${ev.art}</div>
    <div class="scene-title">${ev.title}</div>
    <div class="divider"></div>
    <div class="scene-text">${ev.text}</div>
    <div class="choices">${ev.choices.map((c, i) => `<div class="choice ${canAfford(c.do) ? '' : 'disabled'}" data-i="${i}"><b>${c.label}</b><span>${c.hint}</span></div>`).join('')}</div>
    <div class="result-area"></div>`);
  el.querySelector('.choices').addEventListener('click', (e) => {
    const c = e.target.closest('[data-i]');
    if (!c) return;
    const choice = ev.choices[+c.dataset.i];
    const lines = applyEventChoice(choice.do);
    el.querySelector('.choices').remove();
    el.querySelector('.result-area').innerHTML = `<div class="result-lines">${lines.map(l => `<div>${l}</div>`).join('')}</div><button class="btn big">Continue</button>`;
    el.querySelector('.result-area .btn').addEventListener('click', () => leave(app));
  });
}

// ─────────────────────────── Rest ───────────────────────────
function restScreen(app) {
  const heal = Math.round(run.maxHp * 0.3);
  const el = sceneShell(app, `
    <div class="scene-art">🔥</div>
    <div class="scene-title">Campfire</div>
    <div class="divider"></div>
    <div class="scene-text">Your warband makes camp beneath the stars. The fire crackles; for a moment, the world is quiet.</div>
    <div class="choices">
      <div class="choice" data-c="heal"><b>Rest</b><span>Restore ${heal} Health (${run.hp}/${run.maxHp}).</span></div>
      <div class="choice" data-c="train"><b>Train</b><span>Gain 8 XP toward your next level.</span></div>
      <div class="choice" data-c="forage"><b>Forage</b><span>Search the area: gain 8 gold.</span></div>
    </div>`);
  el.querySelector('.choices').addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]')?.dataset.c;
    if (!c) return;
    if (c === 'heal') { run.hp = Math.min(run.maxHp, run.hp + heal); toast(`Restored ${heal} Health`, 'good'); }
    if (c === 'train') { const lv = run.level; gainXp(8); toast(run.level > lv ? `Level up! Now level ${run.level}` : 'Gained 8 XP', 'gold'); }
    if (c === 'forage') { run.gold += 8; toast('Found 8 gold', 'gold'); }
    saveRun();
    leave(app);
  });
}

// ─────────────────────────── Treasure ───────────────────────────
function treasureScreen(app) {
  const opts = [randomCompleted(), randomCompleted(), randomCompleted()];
  const el = sceneShell(app, `
    <div class="scene-art">🎁</div>
    <div class="scene-title">Forgotten Cache</div>
    <div class="divider"></div>
    <div class="scene-text">An abandoned supply chest, still sealed. Inside, three pieces of gear glint. You can only carry one.</div>
    <div class="reward-row">${opts.map((id, i) => `
      <div class="reward" data-i="${i}" style="--rc:${ITEMS[id].color}">
        <div class="r-kind">Completed Item</div>
        <div class="r-art">${itemEl(id, 'xl')}</div>
        <div class="r-name">${ITEMS[id].name}</div>
        <div class="r-desc">${ITEMS[id].desc}</div>
      </div>`).join('')}</div>`);
  el.querySelector('.reward-row').addEventListener('click', (e) => {
    const r = e.target.closest('[data-i]');
    if (!r) return;
    const id = opts[+r.dataset.i];
    addItem(id);
    saveRun();
    toast(`Took ${ITEMS[id].name}`, 'gold');
    leave(app);
  });
}

// ─────────────────────────── Merchant ───────────────────────────
function wareHtml(w, i) {
  let icon, name, kind, tt = '', cc = '';
  if (w.kind === 'unit') {
    const d = UNITS[w.id];
    cc = COST_COLORS[d.cost];
    icon = `<div class="w-ico" style="--cc:${cc};background-image:url(${portrait(w.id)})"></div>`;
    name = d.name; kind = `${d.cost}-cost Champion`; tt = `unit:${w.id}:1`;
  } else if (w.kind === 'item') {
    icon = itemEl(w.id, 'lg'); name = ITEMS[w.id].name; kind = ITEMS[w.id].component ? 'Component' : 'Completed Item'; tt = `item:${w.id}`;
  } else if (w.kind === 'boon') {
    const b = BOONS[w.id];
    cc = BOON_RARITY_COLOR[b.rarity];
    icon = `<div class="w-ico" style="--cc:${cc}">${b.icon}</div>`; name = b.name; kind = `${b.rarity} Boon`; tt = `boon:${w.id}`;
  } else if (w.kind === 'heal') {
    icon = '<div class="w-ico">🧪</div>'; name = `Healing Potion`; kind = `Restore ${w.amount} Health`;
  } else if (w.kind === 'xp') {
    icon = '<div class="w-ico">📜</div>'; name = 'Tactical Manual'; kind = `Gain ${w.amount} XP`;
  }
  return `<div class="ware ${w.sold ? 'sold' : ''} ${run.gold < w.price ? 'poor' : ''}" data-w="${i}" ${tt ? `data-tt="${tt}"` : ''}>
    ${icon}<div><div class="w-name">${name}</div><div class="w-kind">${kind}</div><div class="price">${coin(w.price)}</div></div></div>`;
}

function merchantScreen(app) {
  const stock = merchantStock();
  const el = h(`<div class="screen scene-screen"><div class="panel scene-card" style="width:min(980px,96vw)">
    <div class="merchant-head">
      <div class="scene-art">💰</div>
      <div><div class="scene-title">Goblin Trading Post</div>
      <div style="color:var(--muted);font-style:italic">"Time is money, friend! Everything's for sale — even the slightly cursed stuff."</div></div>
      <div style="margin-left:auto;text-align:right"><div style="font-size:12px;color:var(--muted)">YOUR GOLD</div><div class="gold-now" style="font-size:28px"></div></div>
    </div>
    <div class="divider"></div>
    <div class="shop-grid"></div>
    <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="btn dark" data-act="warband">⚔ Manage Warband</button>
      <span style="color:var(--muted)">Bench: ${''}<b class="bench-count"></b></span>
      <button class="btn big" data-act="leave">Leave Shop</button>
    </div>
  </div></div>`);
  app.ui.appendChild(el);
  const render = () => {
    el.querySelector('.shop-grid').innerHTML = stock.map(wareHtml).join('');
    el.querySelector('.gold-now').innerHTML = coin(run.gold);
    el.querySelector('.bench-count').textContent = `${run.bench.filter(Boolean).length}/${run.bench.length}`;
  };
  render();
  el.addEventListener('click', (e) => {
    const w = e.target.closest('[data-w]');
    if (w) {
      const entry = stock[+w.dataset.w];
      if (run.gold < entry.price) { toast('Not enough gold', 'bad'); return; }
      if (!buyMerchant(entry)) { toast('Your bench is full', 'bad'); return; }
      document.getElementById('tooltip').classList.add('hidden');
      toast('Purchased!', 'gold');
      render();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'leave') leave(app);
    if (act === 'warband') app.openWarband(render);
  });
}

// ─────────────────────────── Rewards ───────────────────────────
export function showRewards(app, rewards, type) {
  backdrop(app);
  const title = { battle: 'Victory!', elite: 'Elite Defeated!', boss: 'Boss Slain!' }[type] || 'Victory!';
  const cards = rewards.map((r, i) => {
    if (r.kind === 'item') {
      const it = ITEMS[r.id];
      return `<div class="reward" data-i="${i}" style="--rc:${it.color}" data-tt="item:${r.id}"><div class="r-kind">${it.component ? 'Component' : 'Completed Item'}</div><div class="r-art">${itemEl(r.id, 'xl')}</div><div class="r-name">${it.name}</div><div class="r-desc">${it.desc}</div></div>`;
    }
    if (r.kind === 'gold') return `<div class="reward" data-i="${i}" style="--rc:#f5c542"><div class="r-kind">Treasure</div><div class="r-art"><div class="big-ico">💰</div></div><div class="r-name">${r.amount} Gold</div><div class="r-desc">Spend it on champions, experience and merchant wares.</div></div>`;
    if (r.kind === 'boon') {
      const b = BOONS[r.id];
      return `<div class="reward" data-i="${i}" style="--rc:${BOON_RARITY_COLOR[b.rarity]}"><div class="r-kind">${b.rarity} Boon</div><div class="r-art"><div class="big-ico">${b.icon}</div></div><div class="r-name">${b.name}</div><div class="r-desc">${b.desc}</div></div>`;
    }
    if (r.kind === 'unit') {
      const d = UNITS[r.id];
      return `<div class="reward" data-i="${i}" style="--rc:${COST_COLORS[d.cost]}" data-tt="unit:${r.id}:1"><div class="r-kind">${d.cost}-cost Champion</div><div class="r-art"><div class="portrait" style="--cc:${COST_COLORS[d.cost]};background-image:url(${portrait(r.id)})"></div></div><div class="r-name">${d.name}</div><div class="r-desc">${[d.origin, d.cls].map(traitChip).join(' ')}<br>${d.ability.name}</div></div>`;
    }
    return '';
  }).join('');
  const el = h(`<div class="screen scene-screen"><div class="panel scene-card" style="width:min(820px,96vw)">
    <div class="scene-title">${title}</div>
    <div style="color:var(--muted);margin-top:6px">Choose one reward to carry forward.</div>
    <div class="reward-row">${cards}</div>
    <button class="btn dark small" data-act="skip">Skip reward</button>
  </div></div>`);
  app.ui.appendChild(el);
  el.addEventListener('click', (e) => {
    const r = e.target.closest('[data-i]');
    const skip = e.target.closest('[data-act="skip"]');
    if (!r && !skip) return;
    document.getElementById('tooltip').classList.add('hidden');
    if (r) {
      const reward = rewards[+r.dataset.i];
      claimReward(reward);
      toast('Reward claimed!', 'gold');
    }
    leave(app);
  });
}

// ─────────────────────────── Act clear ───────────────────────────
export function showZoneClear(app) {
  backdrop(app);
  const zone = ZONES[run.zoneIdx];
  const next = ZONES[run.zoneIdx + 1];
  const el = h(`<div class="screen scene-screen"><div class="panel scene-card">
    <div class="scene-art">👑</div>
    <div class="scene-title">${zone.name} Liberated!</div>
    <div class="divider"></div>
    <div class="scene-text">${UNITS[zone.boss].name} has fallen. ${next ? `The road leads onward to <b style="color:var(--gold-l)">${next.name}</b>. Your warband recovers 15 Health on the journey.` : 'The Frost Sovereign is no more. Azeroth is saved!'}</div>
    <button class="btn big">${next ? `Journey to ${next.name}` : 'Claim Victory'}</button>
  </div></div>`);
  app.ui.appendChild(el);
  el.querySelector('.btn').addEventListener('click', () => {
    const r = advanceZone();
    if (r === 'victory') {
      const s = endRun(true);
      app.go('gameover', s);
    } else app.go('map');
  });
}

// ─────────────────────────── Game over ───────────────────────────
export function showGameOver(app, s) {
  backdrop(app);
  const zone = ZONES[Math.min(s.zone, ZONES.length - 1)];
  const el = h(`<div class="screen scene-screen"><div class="panel scene-card">
    <div class="scene-art">${s.victory ? '🏆' : '☠'}</div>
    <div class="scene-title" style="color:${s.victory ? 'var(--gold)' : '#ff6a5a'}">${s.victory ? 'Legendary Victory' : 'Your Warband Has Fallen'}</div>
    <div class="scene-text">${s.victory ? 'Songs will be sung of this expedition in every tavern from Stormwind to Orgrimmar.' : `Your expedition ended in ${zone.name}. But every defeat is a lesson.`}</div>
    <div class="go-stats">
      <div><b>${s.stats.matches}</b><span>Matches won</span></div>
      <div><b>${s.stats.roundsWon}</b><span>Rounds won</span></div>
      <div><b>${s.stats.bosses}</b><span>Bosses slain</span></div>
      <div><b>${s.stats.goldEarned}</b><span>Gold earned</span></div>
    </div>
    <div class="valor-pill" style="font-size:20px;padding:10px 24px"><i class="valor-icon"></i> +${s.valor} Valor</div>
    <div style="color:var(--muted);margin:10px 0 18px">Spend Valor in the Hall of Heroes for permanent upgrades. (Total: ${meta.valor})</div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn big" data-act="hall">Hall of Heroes</button>
      <button class="btn dark" data-act="title">Main Menu</button>
    </div>
  </div></div>`);
  app.ui.appendChild(el);
  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'hall') { app.go('title'); app.openHall(); }
    if (act === 'title') app.go('title');
  });
}

