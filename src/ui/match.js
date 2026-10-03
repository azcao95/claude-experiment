// The match screen: TFT-style planning (shop, bench, board, items) and the
// real-time 3D combat between rounds.

import { h, $, coin, itemEl, traitChipsHtml, unitCardHtml, boonIcon, toast, showTip, hideTip, unitTip, tipFor, portrait } from './dom.js';
import {
  run, meta, startMatch, battleSetup, resolveRound, finishMatch, endRun, saveRun,
  buyShopUnit, rollShop, buyXp, sellUnit, moveUnit, maxBoardSize, xpNeeded, findUnit,
  equipFromInventory, combineInInventory, canEquip, findNode,
} from '../game/run.js';
import { Battle } from '../game/combat.js';
import { computeStats, countTraits, sellValue } from '../game/stats.js';
import { UNITS, COST_COLORS, MAX_LEVEL } from '../data/units.js';
import { ITEMS } from '../data/items.js';
import { ZONES } from '../data/world.js';

const STEP = 1 / 30;

export function startMatchScreen(app, node) {
  startMatch(node);
  planning(app, true);
}

export function resumeMatchScreen(app) {
  planning(app, false);
}

function planning(app, fresh) {
  const A = app.arena;
  const zone = ZONES[run.zoneIdx];
  const m = run.match;
  A.setVisible(true);
  A.setEnvironment(zone.env);
  A.endCombat();
  A.interactive = true;
  A.speed = 1;

  const el = h(`<div class="screen match-screen">
    <div class="hud-top"></div>
    <div class="traits-panel"></div>
    <div class="panel hud-player"></div>
    <div class="help-tip"></div>
    <div class="panel inventory plan-only"></div>
    <button class="btn fight plan-only" data-act="fight">⚔ Fight!</button>
    <div class="shop-wrap plan-only">
      <div class="panel shop">
        <div class="shop-actions">
          <button class="btn dark" data-act="xp"><span>Buy XP</span><span>${coin(4)}</span></button>
          <button class="btn dark" data-act="reroll"><span>Reroll</span><span class="reroll-cost">${coin(2)}</span></button>
          <button class="btn dark small lock-btn" data-act="lock">🔓 Lock Shop</button>
        </div>
        <div class="shop-cards"></div>
        <div class="shop-sell hidden"></div>
      </div>
    </div>
    <div class="combat-ctrl hidden">
      <button class="btn dark small speed-btn on" data-speed="1">1×</button>
      <button class="btn dark small speed-btn" data-speed="2">2×</button>
      <button class="btn dark small speed-btn" data-speed="4">4×</button>
    </div>
  </div>`);
  app.ui.appendChild(el);

  const S = {
    phase: 'plan', battle: null, acc: 0, hovered: null, itemDrag: null, ended: false,
  };

  // ─────────── Rendering of HUD pieces ───────────
  const renderTop = () => {
    const node = findNode(m.nodeId);
    const pips = Array.from({ length: m.rounds }, (_, i) => {
      const r = m.results[i];
      const cls = i + 1 === m.round && S.phase !== 'done' ? 'cur' : '';
      const res = i < m.results.length ? (r ? 'win' : 'loss') : '';
      return `<span class="${cls} ${i < m.results.length && i + 1 !== m.round ? res : ''} ${m.type === 'boss' && i === m.rounds - 1 ? 'boss' : ''}"></span>`;
    }).join('');
    const kind = { battle: 'Battle', elite: 'Elite Battle', boss: 'Boss Battle' }[m.type];
    $('.hud-top', el).innerHTML = `
      <div class="stage-name">${zone.subtitle} · ${zone.name} · ${kind} · Round ${Math.min(m.round, m.rounds)}/${m.rounds}</div>
      <div class="enemy-name">${m.enemy.title}</div>
      <div class="round-pips">${pips}</div>`;
    void node;
  };

  const renderPlayer = () => {
    const need = xpNeeded();
    $('.hud-player', el).innerHTML = `
      <div class="stat-row"><span>❤ Health</span><span>${run.hp}/${run.maxHp}</span></div>
      <div class="bar hp"><div class="fill" style="width:${(run.hp / run.maxHp) * 100}%"></div></div>
      <div class="stat-row" style="margin-top:8px"><span class="lvl-badge">Level ${run.level}</span><span style="color:var(--muted);font-size:12px">${run.level >= MAX_LEVEL ? 'MAX' : `${run.xp}/${need} XP`}</span></div>
      <div class="bar xp"><div class="fill" style="width:${run.level >= MAX_LEVEL ? 100 : (run.xp / need) * 100}%"></div></div>
      <div class="stat-row" style="margin-top:8px"><span>Gold</span><span style="font-size:20px">${coin(run.gold)}</span></div>
      <div class="stat-row"><span>Board</span><span style="color:${run.board.length > maxBoardSize() ? 'var(--red)' : run.board.length < maxBoardSize() ? '#ffd84a' : 'var(--green)'}">${run.board.length} / ${maxBoardSize()}</span></div>
      ${run.winStreak >= 2 ? `<div class="stat-row"><span>🔥 Win streak</span><span>${run.winStreak}</span></div>` : ''}
      ${run.boons.length ? `<div class="boon-row">${run.boons.map(boonIcon).join('')}</div>` : ''}`;
  };

  const renderTraits = () => {
    $('.traits-panel', el).innerHTML = traitChipsHtml(run.board);
  };

  const ownedCount = (id) => [...run.board, ...run.bench.filter(Boolean)].filter(u => u.id === id && u.star === 1).length;

  const renderShop = () => {
    const cards = run.shop.map((id, i) => {
      if (!id) return '<div class="ucard empty"></div>';
      const owned = ownedCount(id);
      return unitCardHtml(id, {
        cls: `${run.gold < UNITS[id].cost ? 'poor' : ''} ${owned >= 2 ? 'pair' : ''}`,
        attrs: `data-buy="${i}"`,
        owned: owned ? '★'.repeat(1) + ` ×${owned}` : '',
      });
    }).join('');
    $('.shop-cards', el).innerHTML = cards;
    const free = run.freeRerollsLeft > 0;
    $('.reroll-cost', el).innerHTML = free ? '<b style="color:var(--green)">FREE</b>' : coin(2);
    const lock = $('.lock-btn', el);
    lock.classList.toggle('locked', run.shopLocked);
    lock.textContent = run.shopLocked ? '🔒 Locked' : '🔓 Lock Shop';
  };

  const renderInventory = () => {
    const inv = $('.inventory', el);
    inv.innerHTML = `<div class="label">Item Pack</div><div class="inv-grid">${run.inventory.length
      ? run.inventory.map((id, i) => itemEl(id, '', `data-inv="${i}"`)).join('')
      : '<span class="empty-msg">Enemies drop item components. Drag items onto champions.</span>'}</div>`;
  };

  const renderHelp = () => {
    const tip = $('.help-tip', el);
    const free = maxBoardSize() - run.board.length;
    const benchUnits = run.bench.filter(Boolean).length;
    if (S.phase !== 'plan') { tip.classList.add('hidden'); return; }
    tip.classList.remove('hidden');
    if (free > 0 && benchUnits > 0) tip.innerHTML = `You can field <b>${free}</b> more champion${free > 1 ? 's' : ''} — drag them from the bench onto the blue hexes.`;
    else if (run.board.length > maxBoardSize()) tip.innerHTML = `<b style="color:var(--red)">Too many champions on the board!</b> Move some back to the bench.`;
    else tip.innerHTML = 'Drag to position · Right-click a champion for details · <b>D</b> reroll · <b>F</b> buy XP · <b>E</b> sell hovered · <b>Space</b> fight';
  };

  const syncBoard = () => {
    A.syncPlanning(run.board, run.bench, m.enemy.units);
  };

  const renderAll = () => {
    renderTop(); renderPlayer(); renderTraits(); renderShop(); renderInventory(); renderHelp();
    if (S.phase === 'plan') syncBoard();
  };

  // ─────────── Arena interaction ───────────
  const shopWrap = $('.shop', el);
  const sellEl = $('.shop-sell', el);
  const overShop = (e) => {
    const r = shopWrap.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };

  A.on('hover', (v, e) => {
    S.hovered = v;
    if (!v || S.itemDrag) { hideTip(); return; }
    let html;
    if (v.combat) {
      const u = v.combat;
      html = unitTip({ id: u.defId, star: u.star, items: u.items }, { ...u, as: u.baseAs }, { combat: u });
    } else if (v.team === 'p' && v.ref?.uid) html = tipFor(`runit:${v.ref.uid}`);
    else if (v.team === 'e') {
      const eu = v.ref;
      const traits = countTraits(m.enemy.units.map(x => x.unit));
      html = unitTip(eu, computeStats(eu, { traits, enemyMult: m.enemy.enemyMult }));
    }
    if (html) showTip(html, e.clientX, e.clientY);
  });
  A.on('rightClick', (v, e) => { S.hovered = v; A.emit('hover', v, e); });

  A.on('dragStart', (v) => {
    hideTip();
    if (S.phase !== 'plan' && run.board.includes(v.ref)) return;
    sellEl.classList.remove('hidden');
    sellEl.innerHTML = `Sell ${UNITS[v.ref.id].name} for &nbsp;${coin(sellValue(v.ref))}`;
  });
  A.on('dragMove', (e) => { sellEl.classList.toggle('hot', overShop(e)); });
  A.on('drop', (v, slot, e) => {
    sellEl.classList.add('hidden');
    const u = v.ref;
    if (!u) return;
    if (overShop(e)) {
      const g = sellUnit(u.uid);
      toast(`Sold for ${g} gold`, 'gold');
      renderAll();
      return;
    }
    if (slot) {
      let ok = false;
      if (slot.kind === 'bench') ok = moveUnit(u.uid, { bench: slot.bench });
      else if (slot.player) {
        const onBoard = run.board.includes(u);
        if (!onBoard && run.board.length >= maxBoardSize() && !run.board.find(o => o.pos.c === slot.c && o.pos.r === slot.r)) {
          toast(`Board is full (${maxBoardSize()}). Level up to field more champions.`, 'bad');
        } else ok = moveUnit(u.uid, { board: { c: slot.c, r: slot.r } });
      }
      if (S.phase !== 'plan') {
        // during combat only bench rearrangement is allowed
      }
      void ok;
    }
    renderAll();
  });

  // ─────────── Shop & buttons ───────────
  el.addEventListener('click', (e) => {
    const buy = e.target.closest('[data-buy]');
    if (buy && S.phase === 'plan') {
      const before = run.board.length + run.bench.filter(Boolean).length;
      const u = buyShopUnit(+buy.dataset.buy);
      if (!u) {
        const id = run.shop[+buy.dataset.buy];
        toast(id && run.gold < UNITS[id].cost ? 'Not enough gold' : 'Your bench is full', 'bad');
      } else {
        hideTip();
        const after = run.board.length + run.bench.filter(Boolean).length;
        if (after < before + 1) {
          toast(`★ ${UNITS[u.id].name} upgraded!`, 'gold');
          setTimeout(() => { const v = A.views.get(`p${u.uid}`); if (v) A.vfx.levelUp(v.holder.position.clone()); }, 50);
        }
      }
      renderAll();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'reroll') doReroll();
    if (act === 'xp') doXp();
    if (act === 'lock') { run.shopLocked = !run.shopLocked; saveRun(); renderShop(); }
    if (act === 'fight') fight();
    const sp = e.target.closest('[data-speed]');
    if (sp) {
      A.speed = +sp.dataset.speed;
      el.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('on', b === sp));
    }
  });

  const doReroll = () => {
    if (S.phase !== 'plan') return;
    if (!rollShop()) toast('Not enough gold', 'bad');
    renderAll();
  };
  const doXp = () => {
    if (S.phase !== 'plan') return;
    const lv = run.level;
    if (!buyXp()) toast(run.level >= MAX_LEVEL ? 'Max level reached' : 'Not enough gold', 'bad');
    else if (run.level > lv) toast(`Level ${run.level}! You can field ${maxBoardSize()} champions.`, 'gold');
    renderAll();
  };

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyD') doReroll();
    if (e.code === 'KeyF') doXp();
    if (e.code === 'Space' && S.phase === 'plan') { e.preventDefault(); fight(); }
    if (e.code === 'KeyE' && S.phase === 'plan' && S.hovered?.team === 'p' && S.hovered.ref?.uid) {
      const name = UNITS[S.hovered.ref.id].name;
      const g = sellUnit(S.hovered.ref.uid);
      toast(`Sold ${name} for ${g} gold`, 'gold');
      hideTip();
      renderAll();
    }
  };
  window.addEventListener('keydown', onKey);

  // ─────────── Item dragging (HTML → 3D) ───────────
  const invEl = $('.inventory', el);
  invEl.addEventListener('pointerdown', (e) => {
    const it = e.target.closest('[data-inv]');
    if (!it || S.phase !== 'plan') return;
    e.preventDefault();
    hideTip();
    const idx = +it.dataset.inv;
    const ghost = h(`<div class="item-ghost">${itemEl(run.inventory[idx], 'lg')}</div>`);
    document.body.appendChild(ghost);
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
    it.classList.add('dragging');
    S.itemDrag = { idx, ghost, src: it };
  });
  const onMove = (e) => {
    if (!S.itemDrag) return;
    S.itemDrag.ghost.style.left = `${e.clientX}px`;
    S.itemDrag.ghost.style.top = `${e.clientY}px`;
    const v = A.unitAtScreen(e.clientX, e.clientY);
    for (const x of A.views.values()) x.ring.material.color.set(x.team === 'p' ? '#4ab0ff' : '#ff4a3a');
    if (v && v.team === 'p' && v.ref?.uid) v.ring.material.color.set(canEquip(v.ref, run.inventory[S.itemDrag.idx]) ? '#7aff7a' : '#ff4a4a');
  };
  const onUp = (e) => {
    if (!S.itemDrag) return;
    const { idx, ghost } = S.itemDrag;
    ghost.remove();
    S.itemDrag = null;
    for (const x of A.views.values()) x.ring.material.color.set(x.team === 'p' ? '#4ab0ff' : '#ff4a3a');
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const invTarget = target?.closest?.('[data-inv]');
    if (invTarget && +invTarget.dataset.inv !== idx) {
      const res = combineInInventory(idx, +invTarget.dataset.inv);
      if (res) toast(`Forged ${ITEMS[res].name}!`, 'gold');
      else toast('Only two components can be combined', 'bad');
      renderAll();
      return;
    }
    if (target === A.renderer.domElement) {
      const v = A.unitAtScreen(e.clientX, e.clientY);
      if (v && v.team === 'p' && v.ref?.uid) {
        const itemId = run.inventory[idx];
        const res = equipFromInventory(idx, v.ref.uid);
        if (res) {
          if (res.combined) toast(`Forged ${ITEMS[res.combined].name}!`, 'gold');
          else toast(`${UNITS[v.ref.id].name} equipped ${ITEMS[itemId].name}`, 'good');
          A.vfx.ring(v.holder.position.clone(), 0.8, ITEMS[res.combined || itemId].color, 0.6);
        } else toast('That champion cannot hold more items', 'bad');
      }
    }
    renderAll();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // ─────────── Combat ───────────
  const fight = () => {
    if (S.phase !== 'plan') return;
    if (run.board.length === 0) { toast('Place at least one champion on the board!', 'bad'); return; }
    if (run.board.length > maxBoardSize()) { toast(`Too many champions on the board (max ${maxBoardSize()})`, 'bad'); return; }
    hideTip();
    S.phase = 'combat';
    A.interactive = false;
    el.classList.add('in-combat');
    $('.combat-ctrl', el).classList.remove('hidden');
    $('.help-tip', el).classList.add('hidden');
    const setup = battleSetup();
    S.battle = new Battle(setup);
    A.startCombat(S.battle);
    showBanner(el, 'Fight!', 'neutral', m.enemy.title, 900);
    S.acc = -0.9; // brief pause for the banner
    A.onTick = (dt) => {
      if (S.phase !== 'combat') return;
      S.acc += dt * (A.speed || 1);
      let steps = 0;
      while (S.acc >= STEP && steps < 40) {
        S.battle.step(STEP);
        S.acc -= STEP;
        steps++;
        if (S.battle.over) break;
      }
      if (S.battle.events.length) { A.processEvents(S.battle.events); S.battle.events.length = 0; }
      if (S.battle.over && S.phase === 'combat') {
        S.phase = 'result';
        setTimeout(() => endRound(), 1300);
      }
    };
  };

  const endRound = () => {
    const B = S.battle;
    const won = B.winner === 'p';
    const survivors = B.units.filter(u => u.alive && u.team === 'e' && !u.isSummon).map(u => ({ defId: u.defId, star: u.star }));
    const kills = B.units.filter(u => !u.alive && u.team === 'e' && !u.isSummon).length;
    const summary = B.finishBattleSummary().filter(x => x.team === 'p');
    const res = resolveRound(won, survivors, kills);
    A.onTick = null;
    showBanner(el, won ? 'Victory' : 'Defeat', won ? 'win' : 'loss', won ? 'The enemy is routed!' : `You lose ${res.damage} Health`, 99999);
    renderTop(); renderPlayer();
    showRoundResult(el, res, summary, () => {
      el.querySelectorAll('.banner, .round-result').forEach(x => x.remove());
      if (res.outcome === 'dead') {
        A.endCombat();
        const s = endRun(false);
        app.go('gameover', s);
        return;
      }
      if (res.outcome === 'matchWon') {
        A.endCombat();
        const rewards = finishMatch();
        app.go('rewards', rewards, m.type);
        return;
      }
      if (res.outcome === 'retry') toast('The enemy holds! Regroup and strike again.', 'bad');
      backToPlanning();
    });
  };

  const backToPlanning = () => {
    S.phase = 'plan';
    A.endCombat();
    A.interactive = true;
    el.classList.remove('in-combat');
    $('.combat-ctrl', el).classList.add('hidden');
    renderAll();
  };

  renderAll();
  if (fresh) {
    const kind = { battle: 'Battle', elite: 'Elite Battle', boss: 'Boss Battle' }[m.type];
    showBanner(el, kind, 'neutral', `${m.rounds} rounds · ${m.enemy.title}`, 1600);
  }

  app.cleanup = () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    A.onTick = null;
    A.interactive = false;
    A.callbacks = {};
    hideTip();
  };
}

function showBanner(el, big, kind, sub, ms) {
  el.querySelectorAll('.banner').forEach(b => b.remove());
  const b = h(`<div class="banner ${kind}"><div class="big">${big}</div><div class="sub">${sub}</div></div>`);
  el.appendChild(b);
  if (ms < 99999) setTimeout(() => b.remove(), ms);
}

function showRoundResult(el, res, summary, onContinue) {
  const inc = res.income;
  const maxDmg = Math.max(1, ...summary.map(s => s.dmgDealt));
  const meter = summary.sort((a, b) => b.dmgDealt - a.dmgDealt).map(s => `
    <div class="meter-row"><img src="${portrait(s.defId)}"><div class="mbar"><div style="width:${(s.dmgDealt / maxDmg) * 100}%"></div><span>${UNITS[s.defId].name} ${'★'.repeat(s.star)}</span></div><b style="text-align:right">${s.dmgDealt}</b></div>`).join('');
  const label = { next: 'Next Round', retry: 'Try Again', matchWon: 'Claim Spoils', dead: 'Continue' }[res.outcome];
  const card = h(`<div class="panel round-result">
    <div class="title-bar" style="font-size:16px">Spoils of Battle</div>
    <div class="income-grid">
      <span>Base income</span><span>${coin(inc.base)}</span>
      <span>Interest</span><span>${coin(inc.interest)}</span>
      ${inc.win ? `<span>Victory bonus</span><span>${coin(inc.win)}</span>` : ''}
      ${inc.streak ? `<span>Streak bonus</span><span>${coin(inc.streak)}</span>` : ''}
      ${inc.extra ? `<span>Boons</span><span>${coin(inc.extra)}</span>` : ''}
      <span class="tot">Total</span><span class="tot">${coin(inc.total)}</span>
    </div>
    ${res.loot.length ? `<div class="tt-section">Loot</div><div class="loot-row">${res.loot.map(id => itemEl(id, 'lg')).join('')}</div>` : ''}
    ${meter ? `<div class="tt-section">Damage Dealt</div><div class="meter">${meter}</div>` : ''}
    <div style="margin-top:14px"><button class="btn big">${label}</button></div>
  </div>`);
  el.appendChild(card);
  card.querySelector('button').addEventListener('click', onContinue);
}
