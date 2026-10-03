import './style.css';
import { Arena } from './render/arena.js';
import { installTooltips, setTipResolver, unitTip, portrait } from './ui/dom.js';
import { UNITS } from './data/units.js';
import { run, findUnit } from './game/run.js';
import { computeStats, countTraits } from './game/stats.js';
import { meta } from './game/run.js';
import { showTitle } from './ui/title.js';
import { showMap } from './ui/map.js';
import { startMatchScreen, resumeMatchScreen } from './ui/match.js';
import { showNode, showRewards, showGameOver, showZoneClear } from './ui/nodes.js';
import { openCodex, openHall, openWarband } from './ui/menus.js';

const app = {
  arena: null,
  ui: document.getElementById('ui'),
  screen: null,
  cleanup: null,
  clear() {
    if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } }
    this.cleanup = null;
    this.ui.innerHTML = '';
  },
  go(name, ...args) {
    this.clear();
    this.screen = name;
    const screens = {
      title: showTitle, map: showMap, match: startMatchScreen, resumeMatch: resumeMatchScreen,
      node: showNode, rewards: showRewards, gameover: showGameOver, zoneClear: showZoneClear,
    };
    screens[name](app, ...args);
  },
  openCodex: (tab) => openCodex(app, tab),
  openHall: () => openHall(app),
  openWarband: () => openWarband(app),
};
window.__app = app;

// Live tooltips for owned units: data-tt="runit:<uid>".
setTipResolver((kind, a) => {
  if (kind === 'runit' && run) {
    const u = findUnit(+a);
    if (!u) return null;
    const traits = countTraits(run.board);
    const stats = computeStats(u, { traits: run.board.includes(u) ? traits : {}, boons: run.boons, talents: meta.talents, pos: u.pos, isPlayer: true });
    return unitTip(u, stats, { hint: run.board.includes(u) ? 'On the board · drag to reposition, or to the shop to sell.' : 'On the bench · drag onto the board to deploy.' });
  }
  return null;
});

async function boot() {
  installTooltips();
  app.arena = new Arena(document.getElementById('stage'), document.getElementById('overlay'));
  app.arena.setEnvironment('forest');
  // Pre-render champion portraits in small batches so the loading screen animates.
  const ids = Object.keys(UNITS);
  for (let i = 0; i < ids.length; i += 6) {
    ids.slice(i, i + 6).forEach(id => portrait(id));
    await new Promise(r => setTimeout(r, 0));
  }
  app.go('title');
  const loading = document.getElementById('loading');
  loading.classList.add('fade');
  setTimeout(() => loading.remove(), 700);
}

boot();
