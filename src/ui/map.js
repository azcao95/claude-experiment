// 2D world map: a parchment chart of the current zone with branching
// paths. The player picks which node to travel to next.

import { h, NODE_ICONS, NODE_NAMES, boonIcon, coin } from './dom.js';
import { run, enterNode, findNode, maxBoardSize, endRun, saveRun } from '../game/run.js';
import { ZONES } from '../data/world.js';
import { UNITS, COST_COLORS } from '../data/units.js';
import { portrait } from './dom.js';

const NODE_DESC = {
  battle: 'Fight a local warband over several rounds. Earn gold, XP and loot.',
  elite: 'A dangerous rival warband with items. Greater rewards, including Boons.',
  shop: 'Buy champions, items, boons and supplies with gold.',
  event: 'Something unusual awaits. Choose wisely.',
  rest: 'Rest by the fire to heal or train your warband.',
  treasure: 'An unguarded cache. Choose an item to keep.',
  boss: 'The master of this land. Defeat them to advance to the next Act.',
};

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function showMap(app) {
  const A = app.arena;
  A.setVisible(false);
  const zone = ZONES[run.zoneIdx];
  saveRun();

  const el = h(`
    <div class="screen map-screen">
      <div class="map-main">
        <div class="map-header">
          <div class="act">${zone.subtitle}</div>
          <div class="zone">${zone.name}</div>
          <div class="zdesc">${zone.desc}</div>
          <div class="act-track">${ZONES.map((z, i) => `${i ? '<div class="line"></div>' : ''}<div class="${i < run.zoneIdx ? 'done' : i === run.zoneIdx ? 'cur' : ''}"><span class="dot"></span>${z.name}</div>`).join('')}</div>
        </div>
        <div class="map-canvas-wrap parchment"><canvas></canvas><div class="map-nodes"></div></div>
      </div>
      <div class="map-side">
        <div class="panel side-card">
          <h3>Expedition</h3>
          <div class="stat-row"><span>Health</span><span>${run.hp} / ${run.maxHp}</span></div>
          <div class="bar hp"><div class="fill" style="width:${(run.hp / run.maxHp) * 100}%"></div></div>
          <div class="stat-row" style="margin-top:8px"><span>Gold</span>${coin(run.gold)}</div>
          <div class="stat-row"><span>Level</span><span class="lvl-badge">${run.level} <small style="color:var(--muted)">(${maxBoardSize()} on board)</small></span></div>
          <div class="stat-row"><span>Items</span><span>${run.inventory.length} in pack</span></div>
        </div>
        <div class="panel side-card">
          <h3>Warband</h3>
          <div class="roster-mini">${[...run.board, ...run.bench.filter(Boolean)].map(u => `<div class="rm" style="--cc:${COST_COLORS[UNITS[u.id].cost]};background-image:url(${portrait(u.id)})" data-tt="runit:${u.uid}"><div class="st">${'★'.repeat(u.star)}</div></div>`).join('') || '<i style="color:var(--dim)">No champions.</i>'}</div>
        </div>
        <div class="panel side-card">
          <h3>Boons</h3>
          <div class="boon-row">${run.boons.map(boonIcon).join('') || '<i style="color:var(--dim)">None yet — find them at shrines, elites and merchants.</i>'}</div>
        </div>
        <div class="side-btns">
          <button class="btn" data-act="warband">⚔ Warband</button>
          <button class="btn dark" data-act="codex">📖 Codex</button>
          <button class="btn dark" data-act="menu">⌂ Menu</button>
          <button class="btn red" data-act="abandon">Abandon</button>
        </div>
        <div class="panel side-card">
          <h3>Legend</h3>
          <div class="legend">${Object.entries(NODE_NAMES).map(([k, n]) => `<div>${NODE_ICONS[k]} ${n}</div>`).join('')}</div>
        </div>
      </div>
    </div>`);
  app.ui.appendChild(el);

  const wrap = el.querySelector('.map-canvas-wrap');
  const canvas = wrap.querySelector('canvas');
  const nodesEl = wrap.querySelector('.map-nodes');
  const floors = run.map.floors;
  const visited = new Set(run.map.visited);
  const avail = new Set(run.map.available);
  const seed = zone.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) * 97 + run.map.floors[0].length * 13;

  const layout = () => {
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const pos = {};
    const top = 60, bottom = 50;
    for (const f of floors) for (const n of f) {
      const y = H - bottom - (n.floor / (floors.length - 1)) * (H - top - bottom);
      pos[n.id] = { x: 50 + n.x * (W - 100), y };
    }
    return { W, H, pos };
  };

  const draw = () => {
    const { W, H, pos } = layout();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    drawParchment(g, W, H, zone, seed, pos);
    // paths
    for (const f of floors) for (const n of f) for (const nx of n.next) {
      const a = pos[n.id], b = pos[nx];
      const walked = visited.has(n.id) && visited.has(nx);
      const open = n.id === run.currentNode && avail.has(nx);
      g.save();
      g.strokeStyle = walked ? '#9a2a1a' : open ? '#c98a1a' : 'rgba(70, 40, 15, .55)';
      g.lineWidth = walked || open ? 4 : 2.5;
      g.setLineDash(walked ? [] : [8, 7]);
      g.lineCap = 'round';
      g.beginPath();
      const mx = (a.x + b.x) / 2 + (((n.idx * 7 + nx.length) % 3) - 1) * 14;
      const my = (a.y + b.y) / 2;
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();
      g.restore();
    }
    // nodes
    nodesEl.innerHTML = '';
    for (const f of floors) for (const n of f) {
      const p = pos[n.id];
      const isAvail = avail.has(n.id);
      const cls = ['mnode', n.type === 'boss' ? 'boss' : '', n.type === 'elite' ? 'elite' : '', visited.has(n.id) ? 'visited' : '', n.id === run.currentNode ? 'current' : '', isAvail ? 'avail' : '', !isAvail && !visited.has(n.id) ? 'locked' : ''].join(' ');
      const node = h(`<div class="${cls}" style="left:${p.x}px;top:${p.y}px" data-node="${n.id}">${NODE_ICONS[n.type]}${n.type === 'boss' ? `<div class="nlabel">${ZONES[run.zoneIdx].boss ? 'BOSS' : ''}</div>` : ''}</div>`);
      nodesEl.appendChild(node);
    }
  };

  // Simple tooltip for nodes (uses generic tooltip element)
  nodesEl.addEventListener('mousemove', (e) => {
    const n = e.target.closest('[data-node]');
    const tip = document.getElementById('tooltip');
    if (!n) { tip.classList.add('hidden'); return; }
    const node = findNode(n.dataset.node);
    let extra = '';
    if (node.type === 'boss') {
      extra = `<div class="tt-section">Guardian</div><div><b style="color:var(--gold-l)">${UNITS[zone.boss].name}</b><br><i style="color:#a89878">${UNITS[zone.boss].lore}</i></div>`;
    }
    tip.innerHTML = `<div class="panel tt"><div class="tt-head"><div class="mnode" style="position:relative;margin:0;left:0;top:0;animation:none">${NODE_ICONS[node.type]}</div><div><div class="tt-name">${NODE_NAMES[node.type]}</div><div class="tt-sub">${avail.has(node.id) ? 'Click to travel here' : visited.has(node.id) ? 'Visited' : 'Not yet reachable'}</div></div></div><div style="margin-top:8px">${NODE_DESC[node.type]}</div>${extra}</div>`;
    tip.classList.remove('hidden');
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 18, y = e.clientY + 12;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 18;
    if (y + r.height > innerHeight - 8) y = innerHeight - r.height - 8;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  });
  nodesEl.addEventListener('mouseleave', () => document.getElementById('tooltip').classList.add('hidden'));
  nodesEl.addEventListener('click', (e) => {
    const n = e.target.closest('[data-node]');
    if (!n || !avail.has(n.dataset.node)) return;
    document.getElementById('tooltip').classList.add('hidden');
    const node = enterNode(n.dataset.node);
    if (!node) return;
    if (['battle', 'elite', 'boss'].includes(node.type)) app.go('match', node);
    else app.go('node', node);
  });

  el.querySelector('.side-btns').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'warband') app.openWarband();
    if (act === 'codex') app.openCodex();
    if (act === 'menu') app.go('title');
    if (act === 'abandon') {
      if (!confirm('Abandon this expedition? You will still earn Valor for your progress.')) return;
      const summary = endRun(false);
      app.go('gameover', summary);
    }
  });

  const ro = new ResizeObserver(() => draw());
  ro.observe(wrap);
  draw();
  app.cleanup = () => ro.disconnect();
}

// ─────────────────────────── Parchment drawing ───────────────────────────
function drawParchment(g, W, H, zone, seed, pos) {
  const R = seeded(seed);
  // base tint by zone
  const tint = { vale: 'rgba(90,140,40,.10)', dusk: 'rgba(60,40,90,.16)', jungle: 'rgba(30,120,90,.12)', forge: 'rgba(160,50,10,.14)', citadel: 'rgba(60,110,170,.14)' }[zone.id];
  g.fillStyle = tint;
  g.fillRect(0, 0, W, H);
  // stains
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(110, 70, 20, ${0.03 + R() * 0.05})`;
    g.beginPath();
    g.arc(R() * W, R() * H, 10 + R() * 70, 0, Math.PI * 2);
    g.fill();
  }
  const near = (x, y, d) => Object.values(pos).some(p => Math.hypot(p.x - x, p.y - y) < d);
  // river
  g.strokeStyle = zone.id === 'forge' ? 'rgba(220, 70, 10, .55)' : 'rgba(60, 110, 170, .45)';
  g.lineWidth = zone.id === 'forge' ? 10 : 8;
  g.beginPath();
  let rx = R() * W * 0.3, ry = 0;
  g.moveTo(rx, ry);
  for (let i = 1; i <= 12; i++) { rx += (R() - 0.3) * 60; ry = (i / 12) * H; g.lineTo(rx + Math.sin(i) * 20, ry); }
  g.stroke();
  // doodles
  const kind = { vale: 'tree', dusk: 'deadtree', jungle: 'palm', forge: 'volcano', citadel: 'peak' }[zone.id];
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * H;
    if (near(x, y, 50)) continue;
    drawDoodle(g, kind, x, y, 0.7 + R() * 0.7, R);
    if (zone.id === 'dusk' && R() < 0.25) drawDoodle(g, 'grave', x + 14, y + 4, 0.8, R);
  }
  for (let i = 0; i < 8; i++) {
    const x = R() * W, y = R() * H;
    if (near(x, y, 70)) continue;
    drawDoodle(g, 'mountain', x, y, 1 + R(), R);
  }
  // compass
  const cx = W - 60, cy = H - 60;
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = 'rgba(70,40,15,.7)'; g.fillStyle = 'rgba(70,40,15,.7)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    g.beginPath(); g.moveTo(0, -36); g.lineTo(6, 0); g.lineTo(-6, 0); g.closePath(); g.fill();
  }
  g.font = 'bold 12px Cinzel, serif'; g.textAlign = 'center';
  g.fillText('N', 0, -42);
  g.restore();
  // burnt edge vignette
  const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(80,40,5,.45)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

function drawDoodle(g, kind, x, y, s, R) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = 'rgba(60, 35, 12, .55)';
  g.fillStyle = 'rgba(60, 35, 12, .18)';
  g.lineWidth = 1.4;
  switch (kind) {
    case 'tree':
      g.beginPath(); g.arc(0, -10, 8, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 6); g.stroke();
      break;
    case 'deadtree':
      g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -12); g.moveTo(0, -6); g.lineTo(-6, -12); g.moveTo(0, -9); g.lineTo(5, -15); g.stroke();
      break;
    case 'palm':
      g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(3, -4, 0, -14); g.stroke();
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(Math.cos(i * 1.25) * 8, -20, Math.cos(i * 1.25) * 12, -12 + Math.sin(i) * 3); g.stroke(); }
      break;
    case 'volcano':
      g.beginPath(); g.moveTo(-14, 6); g.lineTo(-4, -12); g.lineTo(4, -12); g.lineTo(14, 6); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(200, 60, 10, .6)'; g.beginPath(); g.moveTo(0, -12); g.lineTo(-2, -4); g.lineTo(1, 2); g.stroke();
      break;
    case 'peak':
      g.beginPath(); g.moveTo(-12, 6); g.lineTo(0, -14); g.lineTo(12, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(-4, -7); g.lineTo(0, -14); g.lineTo(4, -7); g.closePath(); g.fill();
      break;
    case 'mountain':
      g.beginPath(); g.moveTo(-22, 8); g.lineTo(-8, -16); g.lineTo(0, -6); g.lineTo(8, -20); g.lineTo(24, 8); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(8, -20); g.lineTo(4, -4); g.stroke();
      break;
    case 'grave':
      g.beginPath(); g.moveTo(-4, 4); g.lineTo(-4, -6); g.arc(0, -6, 4, Math.PI, 0); g.lineTo(4, 4); g.closePath(); g.fill(); g.stroke();
      break;
    default: break;
  }
  g.restore();
}
