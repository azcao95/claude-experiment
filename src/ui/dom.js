// Shared UI helpers: element creation, SVG icons, item art, tooltips.

import { UNITS, COST_COLORS } from '../data/units.js';
import { TRAITS } from '../data/traits.js';
import { ITEMS, COMPONENTS, combine, statLines } from '../data/items.js';
import { BOONS, BOON_RARITY_COLOR } from '../data/world.js';
import { computeStats, abilityText, countTraits } from '../game/stats.js';
import { unitPortrait } from '../render/models.js';

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function portrait(id) { return unitPortrait(id, UNITS[id]); }

export function coin(n) { return `<span class="gold"><i class="coin"></i>${n}</span>`; }

export function toast(text, kind = '') {
  const el = h(`<div class="toast ${kind}">${text}</div>`);
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ─────────────────────────── Item art ───────────────────────────
const GLYPHS = {
  sword: '<path d="M9 31 L27 13 L30 10 L29 14 L11 32 Z" fill="#eef2f8" stroke="#2a2a3a" stroke-width="1.2"/><path d="M8 26 L14 32" stroke="#c9a227" stroke-width="3" stroke-linecap="round"/><path d="M6 34 L10 30" stroke="#5a3a1f" stroke-width="3" stroke-linecap="round"/>',
  bow: '<path d="M12 6 Q34 20 12 34" fill="none" stroke="#a87a3a" stroke-width="3.5" stroke-linecap="round"/><path d="M12 6 L12 34" stroke="#f0f0f0" stroke-width="1"/><path d="M8 20 L30 20" stroke="#e8d8b8" stroke-width="1.6"/><path d="M28 17 L33 20 L28 23 Z" fill="#dfe6ee"/>',
  rod: '<path d="M10 34 L26 14" stroke="#6a4a2a" stroke-width="3.2" stroke-linecap="round"/><circle cx="28" cy="11" r="6" fill="#d8a8ff" stroke="#5a2a8a" stroke-width="1.5"/><circle cx="26.5" cy="9.5" r="2" fill="#fff"/>',
  tear: '<path d="M20 5 C26 15 31 20 31 25 A11 11 0 0 1 9 25 C9 20 14 15 20 5 Z" fill="#8ad8ff" stroke="#1a4a7a" stroke-width="1.5"/><ellipse cx="16" cy="24" rx="2.5" ry="4" fill="#fff" opacity=".8"/>',
  vest: '<path d="M12 7 L17 10 L23 10 L28 7 L33 13 L29 17 L29 33 L11 33 L11 17 L7 13 Z" fill="#b8c0c8" stroke="#2a2a3a" stroke-width="1.4"/><path d="M20 11 L20 33" stroke="#6a7280" stroke-width="1.4"/><path d="M13 20 H27 M13 25 H27" stroke="#6a7280" stroke-width="1"/>',
  cloak: '<path d="M14 7 H26 L32 33 Q20 29 8 33 Z" fill="#8a6aff" stroke="#2a1a5a" stroke-width="1.4"/><circle cx="20" cy="10" r="2.5" fill="#ffd84a"/><path d="M15 13 L12 30 M25 13 L28 30" stroke="#5a3ad0" stroke-width="1"/>',
  belt: '<rect x="5" y="15" width="30" height="10" rx="2" fill="#a86a2a" stroke="#3a1a05" stroke-width="1.4"/><rect x="15" y="13" width="10" height="14" rx="2" fill="none" stroke="#ffd84a" stroke-width="2.4"/><path d="M20 15 V25" stroke="#ffd84a" stroke-width="1.6"/>',
  gloves: '<path d="M13 34 L13 18 L11 12 Q11 9 13 10 L15 15 L15 7 Q16 5 17.5 7 L18 15 L18.5 6 Q20 4 21.5 6 L21.5 15 L22.5 8 Q24 6 25 8 L25 20 L28 15 Q30 14 30 16 L26 27 L26 34 Z" fill="#7a7a9a" stroke="#1a1a2a" stroke-width="1.3"/>',
};

export function itemSvg(id) {
  const it = ITEMS[id];
  if (!it) return '';
  if (it.component) return `<svg viewBox="0 0 40 40">${GLYPHS[id]}</svg>`;
  const [a, b] = it.recipe;
  return `<svg viewBox="0 0 40 40"><defs><radialGradient id="g${id}" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="${it.color}" stop-opacity=".0"/></radialGradient></defs>
    <g transform="translate(-1 -1) scale(.95)">${GLYPHS[a]}</g>
    <circle cx="30" cy="30" r="9.5" fill="#120a06" stroke="${it.color}" stroke-width="1.6"/>
    <g transform="translate(21.5 21.5) scale(.43)">${GLYPHS[b]}</g>
    <circle cx="20" cy="20" r="19" fill="url(#g${id})"/></svg>`;
}

export function itemEl(id, size = '', extra = '') {
  const it = ITEMS[id];
  return `<div class="item ${size} ${it && !it.component ? 'full' : ''}" style="--ic:${it?.color || '#888'}" data-tt="item:${id}" ${extra}>${itemSvg(id)}</div>`;
}

// ─────────────────────────── Map node icons ───────────────────────────
export const NODE_ICONS = {
  battle: '<svg viewBox="0 0 40 40"><path d="M8 8 L28 28 M32 8 L12 28" stroke="#3a2208" stroke-width="4" stroke-linecap="round"/><path d="M8 8 L28 28 M32 8 L12 28" stroke="#e8e8f0" stroke-width="2" stroke-linecap="round"/><path d="M24 30 L30 24 M10 24 L16 30" stroke="#8a5a1a" stroke-width="4" stroke-linecap="round"/></svg>',
  elite: '<svg viewBox="0 0 40 40"><path d="M10 18 Q10 6 20 6 Q30 6 30 18 L28 26 L24 26 L24 32 L16 32 L16 26 L12 26 Z" fill="#f0e8d8" stroke="#3a1a0a" stroke-width="1.6"/><circle cx="15.5" cy="17" r="3.4" fill="#8a1a0a"/><circle cx="24.5" cy="17" r="3.4" fill="#8a1a0a"/><path d="M10 12 L4 4 L12 9 M30 12 L36 4 L28 9" fill="#5a3a1a" stroke="#3a1a0a" stroke-width="1.5"/><path d="M18 28 V32 M22 28 V32" stroke="#3a1a0a" stroke-width="1.2"/></svg>',
  shop: '<svg viewBox="0 0 40 40"><path d="M12 14 Q8 34 20 34 Q32 34 28 14 Z" fill="#c9a050" stroke="#3a2208" stroke-width="1.6"/><path d="M13 14 Q20 8 27 14" fill="none" stroke="#3a2208" stroke-width="2"/><path d="M14 10 L26 10" stroke="#8a5a1a" stroke-width="2.5"/><circle cx="20" cy="24" r="5" fill="#ffd84a" stroke="#8a5a10" stroke-width="1.4"/><text x="20" y="27.5" font-size="8" text-anchor="middle" font-weight="900" fill="#8a5a10">G</text></svg>',
  event: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="#4a7ad8" stroke="#1a2a5a" stroke-width="1.8"/><text x="20" y="27" font-size="20" text-anchor="middle" font-weight="900" fill="#fff" font-family="Cinzel, serif">?</text></svg>',
  rest: '<svg viewBox="0 0 40 40"><path d="M8 32 L32 26 M8 26 L32 32" stroke="#5a3a1a" stroke-width="3.5" stroke-linecap="round"/><path d="M20 27 C12 22 16 14 20 6 C22 12 28 15 26 22 C25 25 23 27 20 27 Z" fill="#ff8a2a" stroke="#8a2a0a" stroke-width="1.4"/><path d="M20 26 C17 23 18 19 20 15 C22 19 23 22 20 26 Z" fill="#ffe46a"/></svg>',
  treasure: '<svg viewBox="0 0 40 40"><rect x="7" y="17" width="26" height="15" rx="2" fill="#a8641a" stroke="#3a1a05" stroke-width="1.6"/><path d="M7 17 Q7 8 20 8 Q33 8 33 17 Z" fill="#c97a2a" stroke="#3a1a05" stroke-width="1.6"/><path d="M7 17 H33" stroke="#ffd84a" stroke-width="2"/><rect x="17" y="15" width="6" height="7" rx="1" fill="#ffd84a" stroke="#8a5a10"/><path d="M12 9 V32 M28 9 V32" stroke="#ffd84a" stroke-width="1.5"/></svg>',
  boss: '<svg viewBox="0 0 40 40"><path d="M6 14 L12 22 L20 8 L28 22 L34 14 L31 32 L9 32 Z" fill="#ffd84a" stroke="#6a3a05" stroke-width="1.8" stroke-linejoin="round"/><circle cx="20" cy="25" r="3" fill="#e5483a"/><circle cx="13" cy="27" r="2" fill="#4ab0ff"/><circle cx="27" cy="27" r="2" fill="#4ab0ff"/></svg>',
};
export const NODE_NAMES = { battle: 'Battle', elite: 'Elite Warband', shop: 'Merchant', event: 'Mystery', rest: 'Campfire', treasure: 'Treasure', boss: 'Boss' };

// ─────────────────────────── Tooltips ───────────────────────────
const tipEl = () => document.getElementById('tooltip');
let tipResolver = null; // (key) => html, provided by main for live units

export function setTipResolver(fn) { tipResolver = fn; }

export function showTip(html, x, y) {
  const el = tipEl();
  el.innerHTML = `<div class="panel tt">${html}</div>`;
  el.classList.remove('hidden');
  const r = el.getBoundingClientRect();
  let left = x + 18;
  let top = y + 14;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 18;
  if (top + r.height > window.innerHeight - 8) top = window.innerHeight - r.height - 8;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
}

export function hideTip() { tipEl().classList.add('hidden'); }

export function installTooltips() {
  let current = null;
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest?.('[data-tt]');
    if (!t) { if (current) { current = null; hideTip(); } return; }
    current = t;
    const html = tipFor(t.dataset.tt);
    if (html) showTip(html, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => {
    if (!current) return;
    if (!document.body.contains(current)) { current = null; hideTip(); return; }
    const el = tipEl();
    if (el.classList.contains('hidden')) return;
    showTip(el.firstElementChild.innerHTML, e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', () => { current = null; hideTip(); });
}

export function tipFor(key) {
  const [kind, a, b] = key.split(':');
  if (tipResolver) {
    const r = tipResolver(kind, a, b);
    if (r) return r;
  }
  if (kind === 'unit') return unitTip({ id: a, star: +b || 1, items: [] });
  if (kind === 'item') return itemTip(a);
  if (kind === 'trait') return traitTip(a, +b || 0);
  if (kind === 'boon') return boonTip(a);
  return null;
}

export function traitChip(tid) {
  const t = TRAITS[tid];
  if (!t) return '';
  return `<span class="tchip" style="--tc:${t.color}" data-tt="trait:${tid}">${t.icon} ${t.name}</span>`;
}

/**
 * Unit tooltip. `unit` = {id, star, items}; `stats` optional computed stats;
 * `extra` optional { combat } live combat unit.
 */
export function unitTip(unit, stats, extra = {}) {
  const def = UNITS[unit.id];
  if (!def) return '';
  const star = unit.star || 1;
  const s = stats || computeStats(unit, { traits: {} });
  const base = computeStats({ id: unit.id, star, items: [] }, { traits: {} });
  const cc = COST_COLORS[def.cost];
  const up = (k) => (s[k] > base[k] + 0.001 ? 'up' : '');
  const live = extra.combat;
  const hpTxt = live ? `${Math.max(0, Math.round(live.hp))}/${Math.round(live.maxHp)}` : `${s.maxHp}`;
  const ab = def.ability;
  const traits = [def.origin, def.cls].filter(Boolean).map(traitChip).join('');
  const items = (unit.items || []).map(id => `<div class="tt-item">${itemEl(id, 'sm')}<div><b>${ITEMS[id].name}</b><br>${ITEMS[id].desc || statLines(ITEMS[id].stats).join(', ')}</div></div>`).join('');
  return `
    <div class="tt-head">
      <div class="tt-portrait" style="--cc:${cc};background-image:url(${portrait(unit.id)})"></div>
      <div>
        <div class="tt-name">${def.name}</div>
        <div class="tt-sub"><span style="color:${star === 3 ? '#ffd84a' : star === 2 ? '#dfe8f0' : '#c8a070'}">${'★'.repeat(star)}</span>
          ${def.enemyOnly ? '<span class="tchip" style="--tc:#a33">Monster</span>' : `${coin(def.cost)}`}</div>
        <div class="tt-sub">${traits}</div>
      </div>
    </div>
    <div class="tt-stats">
      <div><span>Health</span><b class="${up('maxHp')}">${hpTxt}</b></div>
      <div><span>Attack</span><b class="${up('ad')}">${Math.round(live ? live.ad : s.ad)}</b></div>
      <div><span>Atk Spd</span><b class="${up('as')}">${s.as.toFixed(2)}</b></div>
      <div><span>Armor</span><b class="${up('armor')}">${s.armor}</b></div>
      <div><span>Magic Res</span><b class="${up('mr')}">${s.mr}</b></div>
      <div><span>Range</span><b class="${up('range')}">${s.range}</b></div>
      <div><span>Ability Pwr</span><b class="${up('ap')}">${Math.round(live ? live.ap : s.ap)}</b></div>
      <div><span>Crit</span><b class="${up('crit')}">${Math.round(s.crit * 100)}%</b></div>
      <div><span>Mana</span><b>${s.maxMana >= 999 ? '—' : `${live ? Math.round(live.mana) : s.startMana}/${s.maxMana}`}</b></div>
    </div>
    ${ab ? `<div class="tt-ability"><div class="ab-head"><span class="ab-name">${ab.name}</span><span class="ab-mana">${s.maxMana} Mana</span></div>
      <div>${abilityText(def, star, s.ap)}</div></div>` : '<div class="hint">No special ability — relies on basic attacks.</div>'}
    ${items ? `<div class="tt-section">Equipped</div><div class="tt-items">${items}</div>` : ''}
    <div class="tt-lore">"${def.lore}"</div>
    ${extra.hint ? `<div class="hint">${extra.hint}</div>` : ''}
  `;
}

export function itemTip(id) {
  const it = ITEMS[id];
  if (!it) return '';
  const stats = statLines(it.stats || {}).join('<br>');
  let extra = '';
  if (it.component) {
    extra = `<div class="tt-section">Combines into</div><div class="recipe-grid">${COMPONENTS.map(o => {
      const r = combine(id, o);
      return `<div>${itemEl(o, 'sm')}<span class="plus">→</span>${itemEl(r, 'sm')}<span>${ITEMS[r].name}</span></div>`;
    }).join('')}</div>`;
  } else {
    const [a, b] = it.recipe;
    extra = `<div class="tt-section">Recipe</div><div class="recipe-grid" style="grid-template-columns:1fr"><div>${itemEl(a, 'sm')} ${ITEMS[a].name} <span class="plus">+</span> ${itemEl(b, 'sm')} ${ITEMS[b].name}</div></div>`;
  }
  return `
    <div class="tt-head">${itemEl(id, 'lg')}<div><div class="tt-name">${it.name}</div><div class="tt-sub">${it.component ? 'Component' : 'Completed Item'}</div></div></div>
    <div class="stat-lines">${stats}</div>
    <div>${it.component ? `<i style="color:#a89878">${it.desc}</i>` : it.desc}</div>
    ${extra}
    <div class="hint">${it.component ? 'Drag onto a champion to equip. Two components on one champion combine automatically.' : 'Drag onto a champion to equip (max 3 items).'}</div>`;
}

export function traitTip(tid, count = 0) {
  const t = TRAITS[tid];
  if (!t) return '';
  const steps = t.levels.map((lv, i) => {
    const on = count >= lv && (i === t.levels.length - 1 || count < t.levels[i + 1]);
    return `<div class="${on ? 'on' : ''}"><b>(${lv})</b> ${t.effects[i]}</div>`;
  }).join('');
  const units = Object.entries(UNITS).filter(([, u]) => !u.enemyOnly && (u.origin === tid || u.cls === tid))
    .sort((a, b) => a[1].cost - b[1].cost)
    .map(([id, u]) => `<img src="${portrait(id)}" style="--cc:${COST_COLORS[u.cost]}" title="${u.name}">`).join('');
  return `
    <div class="tt-head"><div class="tt-portrait" style="--cc:${t.color};display:grid;place-items:center;font-size:34px;width:56px;height:56px">${t.icon}</div>
      <div><div class="tt-name">${t.name}</div><div class="tt-sub">${t.kind === 'origin' ? 'Origin' : 'Class'} · ${count} active</div></div></div>
    <div style="margin-top:8px">${t.desc}</div>
    <div class="trait-steps">${steps}</div>
    <div class="mini-portraits">${units}</div>
    <div class="tt-lore">${t.flavor}</div>`;
}

export function boonTip(id) {
  const b = BOONS[id];
  if (!b) return '';
  return `<div class="tt-head"><div class="boon-ico" style="--rc:${BOON_RARITY_COLOR[b.rarity]};width:52px;height:52px;font-size:26px">${b.icon}</div>
    <div><div class="tt-name">${b.name}</div><div class="tt-sub" style="color:${BOON_RARITY_COLOR[b.rarity]};text-transform:capitalize">${b.rarity} Boon</div></div></div>
    <div style="margin-top:8px">${b.desc}</div><div class="hint">Boons last for the rest of this expedition.</div>`;
}

export function boonIcon(id) {
  const b = BOONS[id];
  return `<div class="boon-ico" style="--rc:${BOON_RARITY_COLOR[b.rarity]}" data-tt="boon:${id}">${b.icon}</div>`;
}

export function traitChipsHtml(units) {
  const counts = countTraits(units);
  return Object.entries(counts).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.level >= 0) - (a.level >= 0) || b.count - a.count)
    .map(({ id, count, level }) => {
      const t = TRAITS[id];
      const steps = t.levels.map((lv, i) => (i === level ? `<b>${lv}</b>` : lv)).join(' › ');
      return `<div class="trait-chip ${level >= 0 ? 'active' : ''} ${level >= 1 ? 'tier-2' : ''}" style="--tc:${t.color}" data-tt="trait:${id}:${count}">
        <div class="t-ico">${t.icon}</div><div><div class="t-name">${t.name}</div><div class="t-steps">${steps}</div></div><div class="t-count">${count}</div></div>`;
    }).join('');
}

export function unitCardHtml(id, opts = {}) {
  const def = UNITS[id];
  const cc = COST_COLORS[def.cost];
  const traits = [def.origin, def.cls].filter(Boolean).map(t => `<span style="--tc:${TRAITS[t].color}">${TRAITS[t].icon} ${TRAITS[t].name}</span>`).join('');
  return `<div class="ucard ${opts.cls || ''}" style="--cc:${cc}" data-tt="unit:${id}:1" ${opts.attrs || ''}>
    <div class="art" style="background-image:url(${portrait(id)})"></div>
    <div class="trs">${traits}</div>
    ${opts.owned ? `<div class="stars-own">${opts.owned}</div>` : ''}
    <div class="nm">${def.name}</div><div class="cost"><i class="coin"></i>${def.cost}</div></div>`;
}
