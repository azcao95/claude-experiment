// Modal menus: Codex (champions, items, traits, bestiary, boons),
// Hall of Heroes (permanent talents) and Warband management.

import { h, itemEl, unitTip, portrait, traitChip, coin, toast, hideTip } from './dom.js';
import { UNITS, COST_COLORS } from '../data/units.js';
import { TRAITS } from '../data/traits.js';
import { ITEMS, COMPONENTS, combine, completedItemIds, statLines } from '../data/items.js';
import { BOONS, BOON_RARITY_COLOR, TALENTS } from '../data/world.js';
import { meta, talentRank, buyTalent, run, sellUnit, equipFromInventory, combineInInventory, canEquip, findUnit } from '../game/run.js';
import { computeStats, sellValue } from '../game/stats.js';

function modal(app, title, bodyHtml, { tabs, onClose } = {}) {
  const el = h(`<div class="modal-back"><div class="panel modal">
    <div class="modal-head"><div class="title-bar">${title}</div><div class="close-x" data-close>✕</div></div>
    ${tabs ? `<div class="tabs">${tabs.map(t => `<div class="tab" data-tab="${t.id}">${t.label}</div>`).join('')}</div>` : ''}
    <div class="modal-body">${bodyHtml}</div>
  </div></div>`);
  app.ui.appendChild(el);
  const close = () => { el.remove(); hideTip(); window.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === el) close();
  });
  return { el, body: el.querySelector('.modal-body'), close };
}

// ─────────────────────────── Codex ───────────────────────────
export function openCodex(app, startTab = 'champions') {
  const tabs = [
    { id: 'champions', label: 'Champions' }, { id: 'items', label: 'Items' }, { id: 'traits', label: 'Synergies' },
    { id: 'bestiary', label: 'Bestiary' }, { id: 'boons', label: 'Boons' }, { id: 'guide', label: 'How to Play' },
  ];
  const M = modal(app, '📖 Codex of Azeroth', '', { tabs });
  let sel = { id: 'footman', star: 1 };
  const show = (tab) => {
    M.el.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    M.body.innerHTML = RENDER[tab]();
    M.body.scrollTop = 0;
    if (tab === 'champions') renderDetail();
  };
  const renderDetail = () => {
    const d = M.body.querySelector('.codex-detail');
    if (!d) return;
    const stats = computeStats({ id: sel.id, star: sel.star, items: [] }, { traits: {} });
    d.innerHTML = `<div class="panel tt" style="padding:14px">
      <div style="display:flex;gap:6px;margin-bottom:10px">${[1, 2, 3].map(s => `<button class="btn small ${s === sel.star ? '' : 'dark'}" data-star="${s}">${'★'.repeat(s)}</button>`).join('')}</div>
      ${unitTip({ id: sel.id, star: sel.star, items: [] }, stats)}</div>`;
    M.body.querySelectorAll('.codex-card').forEach(c => c.classList.toggle('sel', c.dataset.id === sel.id));
  };
  M.el.querySelector('.tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) show(t.dataset.tab); });
  M.body.addEventListener('click', (e) => {
    const c = e.target.closest('.codex-card[data-id]');
    if (c && M.body.querySelector('.codex-detail')) { sel = { id: c.dataset.id, star: 1 }; renderDetail(); }
    const s = e.target.closest('[data-star]');
    if (s) { sel.star = +s.dataset.star; renderDetail(); }
  });
  show(startTab);
}

const RENDER = {
  champions() {
    let html = '<div class="codex-split"><div>';
    for (let cost = 1; cost <= 5; cost++) {
      const ids = Object.keys(UNITS).filter(id => !UNITS[id].enemyOnly && UNITS[id].cost === cost);
      html += `<div class="cost-head" style="color:${COST_COLORS[cost]}"><i class="coin"></i> ${cost}-Cost Champions</div><div class="codex-grid">`;
      html += ids.map(id => codexCard(id)).join('');
      html += '</div>';
    }
    html += `<div class="hint" style="margin-top:14px">Click a champion to inspect it; switch star levels to see how its ability scales. Dragonflight champions are unlocked in the Hall of Heroes.</div>`;
    html += '</div><div class="codex-detail"></div></div>';
    return html;
  },
  items() {
    const comps = COMPONENTS.map(id => `<div style="display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px;background:rgba(0,0,0,.3)">${itemEl(id, 'lg')}<div><b style="color:var(--gold-l)">${ITEMS[id].name}</b><div style="color:#8fd8ff;font-size:13px;font-weight:700">${statLines(ITEMS[id].stats).join(', ')}</div></div></div>`).join('');
    const table = `<table class="recipe-table"><tr><th></th>${COMPONENTS.map(c => `<th>${itemEl(c, 'sm')}</th>`).join('')}</tr>
      ${COMPONENTS.map(r => `<tr><th>${itemEl(r, 'sm')}</th>${COMPONENTS.map(c => `<td>${itemEl(combine(r, c))}</td>`).join('')}</tr>`).join('')}</table>`;
    const fulls = completedItemIds().map(id => {
      const it = ITEMS[id];
      return `<div style="display:flex;gap:10px;padding:10px;border-radius:8px;background:rgba(0,0,0,.3);border-left:3px solid ${it.color}">${itemEl(id, 'lg')}<div>
        <b style="color:var(--gold-l);font-family:var(--font-head)">${it.name}</b>
        <div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px;margin:2px 0">${itemEl(it.recipe[0], 'sm')} + ${itemEl(it.recipe[1], 'sm')}</div>
        <div style="color:#8fd8ff;font-size:12.5px;font-weight:700">${statLines(it.stats).join(' · ')}</div>
        <div style="font-size:13px">${it.desc}</div></div></div>`;
    }).join('');
    return `<div class="cost-head" style="color:var(--gold)">Components</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">${comps}</div>
      <div class="cost-head" style="color:var(--gold)">Recipe Chart</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:center">${table}
        <div style="max-width:320px;color:var(--muted)">Any two components combine into a completed item. Drop a component on a champion already holding one — or drop one component onto another in your item pack — to forge them. <br><br>Hover any icon in the chart for full details.</div></div>
      <div class="cost-head" style="color:var(--gold)">Completed Items</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:8px">${fulls}</div>`;
  },
  traits() {
    const block = (kind) => Object.entries(TRAITS).filter(([, t]) => t.kind === kind).map(([id, t]) => {
      const units = Object.entries(UNITS).filter(([, u]) => !u.enemyOnly && (u.origin === id || u.cls === id)).sort((a, b) => a[1].cost - b[1].cost);
      return `<div class="trait-card" style="--tc:${t.color}">
        <h4><span style="font-size:20px">${t.icon}</span> ${t.name}</h4>
        <p>${t.desc}</p>
        <div class="trait-steps">${t.levels.map((lv, i) => `<div class="on"><b>(${lv})</b> ${t.effects[i]}</div>`).join('')}</div>
        <div class="mini-portraits">${units.map(([uid, u]) => `<img src="${portrait(uid)}" style="--cc:${COST_COLORS[u.cost]}" data-tt="unit:${uid}:1">`).join('')}</div>
      </div>`;
    }).join('');
    return `<div class="cost-head" style="color:var(--gold)">Origins</div><div class="trait-list">${block('origin')}</div>
      <div class="cost-head" style="color:var(--gold)">Classes</div><div class="trait-list">${block('class')}</div>
      <div class="hint">Synergies count unique champions on the board. Bench champions do not count.</div>`;
  },
  bestiary() {
    const mons = Object.keys(UNITS).filter(id => UNITS[id].enemyOnly && !UNITS[id].boss);
    const bosses = Object.keys(UNITS).filter(id => UNITS[id].boss);
    return `<div class="cost-head" style="color:#ff6a5a">Bosses</div><div class="codex-grid">${bosses.map(id => codexCard(id, '#ff6a3a')).join('')}</div>
      <div class="cost-head" style="color:var(--muted)">Creatures</div><div class="codex-grid">${mons.map(id => codexCard(id, '#8a7a6a')).join('')}</div>`;
  },
  boons() {
    return `<div class="boon-list">${Object.entries(BOONS).map(([id, b]) => `<div class="boon-card" style="--rc:${BOON_RARITY_COLOR[b.rarity]}">
      <div class="boon-ico" style="--rc:${BOON_RARITY_COLOR[b.rarity]}">${b.icon}</div><div><b>${b.name}</b> <small style="color:${BOON_RARITY_COLOR[b.rarity]};text-transform:capitalize">${b.rarity}</small><p>${b.desc}</p></div></div>`).join('')}</div>`;
  },
  guide() {
    return `<div style="max-width:780px;line-height:1.6;font-size:15.5px">
      <h3 class="title-bar">The Expedition</h3>
      <p>Lead a warband across five Acts — from the Verdant Vale to the Frozen Citadel. On the <b>world map</b>, choose your path: battles, elite warbands, merchants, mysteries, campfires and treasure. Each Act ends with a boss.</p>
      <h3 class="title-bar">Matches</h3>
      <p>Each battle is a <b>match</b> of several rounds. Before each round you <b>buy champions</b> from the shop, <b>position</b> them on the hex board (drag from the bench), and <b>equip items</b>. Then press <b>Fight</b> and your champions battle automatically. Losing a round costs Health; you must win the final round to complete the match.</p>
      <h3 class="title-bar">Growing Stronger</h3>
      <p><b>In a match:</b> earn gold every round (+interest for every 10 gold you hold), buy XP to field more champions, and combine <b>three copies</b> of a champion into a ★★ upgrade (three ★★ make ★★★). Enemies drop item components.<br>
      <b>Across the run:</b> your warband, items and gold carry over between matches. Win Boons, buy gear at merchants, and gather rewards.<br>
      <b>Between runs:</b> earn <b>Valor</b> and spend it in the Hall of Heroes on permanent talents.</p>
      <h3 class="title-bar">Synergies</h3>
      <p>Every champion has an <b>Origin</b> (e.g. Orc, Night Elf) and a <b>Class</b> (e.g. Mage, Warrior). Field enough unique champions of a trait to unlock bonuses — shown on the left during matches.</p>
      <h3 class="title-bar">Controls</h3>
      <p>Drag champions to move them · Drag onto the shop to sell · Hover anything for details · <b>D</b> reroll · <b>F</b> buy XP · <b>E</b> sell hovered champion · <b>Space</b> start the fight.</p>
    </div>`;
  },
};

function codexCard(id, color) {
  const u = UNITS[id];
  const cc = color || COST_COLORS[u.cost];
  return `<div class="codex-card" style="--cc:${cc}" data-id="${id}" data-tt="unit:${id}:1"><div class="art" style="background-image:url(${portrait(id)})"></div>
    ${u.enemyOnly ? '' : `<div class="cost"><i class="coin"></i>${u.cost}</div>`}<div class="nm">${u.name}</div></div>`;
}

// ─────────────────────────── Hall of Heroes ───────────────────────────
export function openHall(app) {
  const M = modal(app, '🏛 Hall of Heroes', '', { onClose: () => { if (app.screen === 'title') app.go('title'); } });
  const render = () => {
    M.body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div style="color:var(--muted);max-width:620px">Valor is earned at the end of every expedition — the further you go, the more you earn. Talents are permanent and apply to all future expeditions.</div>
        <div class="valor-pill" style="font-size:18px"><i class="valor-icon"></i> ${meta.valor} Valor</div>
      </div>
      <div class="talent-grid">${TALENTS.map(t => {
        const r = talentRank(t.id);
        const maxed = r >= t.max;
        const cost = t.cost[r];
        return `<div class="talent ${maxed ? 'maxed' : ''}">
          <div class="ico">${t.icon}</div>
          <div style="flex:1"><h4>${t.name}</h4><p>${t.desc(Math.max(1, maxed ? r : r + 1))}</p>
            <div class="ranks">${Array.from({ length: t.max }, (_, i) => `<span class="${i < r ? 'on' : ''}"></span>`).join('')}</div></div>
          ${maxed ? '<b style="color:var(--gold)">MAX</b>' : `<button class="btn small buy ${meta.valor < cost ? 'disabled' : ''}" data-buy="${t.id}"><i class="valor-icon" style="width:12px;height:12px"></i>${cost}</button>`}
        </div>`;
      }).join('')}</div>`;
  };
  render();
  M.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy]');
    if (!b) return;
    if (buyTalent(b.dataset.buy)) toast('Talent learned!', 'gold');
    else toast('Not enough Valor', 'bad');
    render();
  });
}

// ─────────────────────────── Warband ───────────────────────────
export function openWarband(app, onChange) {
  const M = modal(app, '⚔ Your Warband', '', {
    onClose: () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onChange?.();
      if (app.screen === 'map') app.go('map');
    },
  });
  const render = () => {
    const units = [...run.board.map(u => ({ u, where: 'Board' })), ...run.bench.filter(Boolean).map(u => ({ u, where: 'Bench' }))];
    M.body.innerHTML = `
      <div style="color:var(--muted);margin-bottom:12px">Hover champions to study their abilities. Drag items from your pack onto a champion to equip, or onto another component to forge. Positioning happens during matches.</div>
      <div class="warband-grid">${units.map(({ u, where }) => {
        const d = UNITS[u.id];
        return `<div class="wb-unit" style="--cc:${COST_COLORS[d.cost]}" data-uid="${u.uid}">
          <div class="where">${where}</div>
          <button class="btn red small sell" data-sell="${u.uid}" title="Sell">${coin(sellValue(u))}</button>
          <div class="portrait" style="background-image:url(${portrait(u.id)})" data-tt="runit:${u.uid}"></div>
          <div class="nm">${d.name}</div><div class="st">${'★'.repeat(u.star)}</div>
          <div style="display:flex;gap:3px;justify-content:center;flex-wrap:wrap">${[d.origin, d.cls].map(traitChip).join('')}</div>
          <div class="slots">${u.items.map(id => itemEl(id, 'sm')).join('')}${Array.from({ length: 3 - u.items.length }, () => '<div class="slot"></div>').join('')}</div>
        </div>`;
      }).join('') || '<i>No champions.</i>'}</div>
      <div class="cost-head" style="color:var(--gold)">Item Pack</div>
      <div class="wb-inv">${run.inventory.map((id, i) => itemEl(id, 'lg', `data-inv="${i}"`)).join('') || '<i style="color:var(--dim)">Empty</i>'}</div>`;
  };
  render();

  let drag = null;
  M.body.addEventListener('pointerdown', (e) => {
    const it = e.target.closest('[data-inv]');
    if (!it) return;
    e.preventDefault();
    hideTip();
    const ghost = h(`<div class="item-ghost">${itemEl(run.inventory[+it.dataset.inv], 'lg')}</div>`);
    document.body.appendChild(ghost);
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
    drag = { idx: +it.dataset.inv, ghost };
  });
  const onMove = (e) => {
    if (!drag) return;
    drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`;
    M.body.querySelectorAll('.wb-unit').forEach(x => x.classList.remove('drop-hot'));
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.wb-unit');
    if (t) t.classList.add('drop-hot');
  };
  const onUp = (e) => {
    if (!drag) return;
    const { idx, ghost } = drag;
    ghost.remove();
    drag = null;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const unitEl = t?.closest?.('.wb-unit');
    const invEl = t?.closest?.('[data-inv]');
    if (unitEl) {
      const u = findUnit(+unitEl.dataset.uid);
      const itemId = run.inventory[idx];
      if (u && canEquip(u, itemId)) {
        const res = equipFromInventory(idx, u.uid);
        toast(res?.combined ? `Forged ${ITEMS[res.combined].name}!` : `Equipped ${ITEMS[itemId].name}`, 'gold');
      } else toast('That champion cannot hold more items', 'bad');
    } else if (invEl && +invEl.dataset.inv !== idx) {
      const r = combineInInventory(idx, +invEl.dataset.inv);
      if (r) toast(`Forged ${ITEMS[r].name}!`, 'gold'); else toast('Only two components can be combined', 'bad');
    }
    render();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  M.body.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sell]');
    if (!s) return;
    const u = findUnit(+s.dataset.sell);
    if (!u) return;
    if (run.board.length + run.bench.filter(Boolean).length <= 1) { toast('You cannot sell your last champion', 'bad'); return; }
    if (!confirm(`Sell ${UNITS[u.id].name} for ${sellValue(u)} gold? Items return to your pack.`)) return;
    sellUnit(u.uid);
    render();
  });
}
