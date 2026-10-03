import { h } from './dom.js';
import { meta, hasSavedRun, loadRun, newRun, clearRun, findNode, completeNode } from '../game/run.js';
import { ZONES } from '../data/world.js';

const SHOWCASE = ['crusader', 'champion', 'archmage', 'darkranger', 'archdruid', 'mountainking', 'illidari', 'stormwarchief'];

export function showTitle(app) {
  const A = app.arena;
  A.setVisible(true);
  A.setEnvironment(['forest', 'dusk', 'jungle', 'volcanic', 'frozen'][Math.min(4, meta.bestZone)]);
  A.interactive = false;
  A.endCombat();
  A.showcase(SHOWCASE);

  const saved = hasSavedRun();
  const el = h(`
    <div class="screen title-screen">
      <div>
        <div class="logo">Tactical<span>Craft</span></div>
        <div class="logo-sub">A Roguelite Autobattler of the Warcraft Realms</div>
      </div>
      <div class="title-bottom">
      <div class="valor-pill"><i class="valor-icon"></i> ${meta.valor} Valor</div>
      <div class="title-menu">
        ${saved ? '<button class="btn big" data-act="continue">Continue Expedition</button>' : ''}
        <button class="btn ${saved ? 'dark' : 'big'}" data-act="new">New Expedition</button>
        <button class="btn dark" data-act="hall">Hall of Heroes</button>
        <button class="btn dark" data-act="codex">Codex</button>
      </div>
      </div>
      <div class="title-foot">
        ${meta.runs ? `Expeditions: ${meta.runs} · Victories: ${meta.victories} · Furthest: ${ZONES[Math.min(meta.bestZone, ZONES.length - 1)].name}` : 'Recruit champions, forge items, and journey to the Frozen Citadel.'}
      </div>
    </div>`);
  app.ui.appendChild(el);

  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'continue') {
      const r = loadRun();
      if (!r) return;
      A.stopShowcase();
      if (r.match) app.go('resumeMatch');
      else if (r.currentNode && r.map.available.length === 0) {
        // The expedition was saved mid-node: resume or settle that node.
        const node = findNode(r.currentNode);
        if (['battle', 'elite', 'boss'].includes(node.type)) app.go(completeNode() === 'zoneClear' ? 'zoneClear' : 'map');
        else app.go('node', node);
      } else app.go('map');
    }
    if (act === 'new') {
      if (saved && !confirm('Abandon your current expedition and start a new one?')) return;
      clearRun();
      newRun();
      A.stopShowcase();
      app.go('map');
    }
    if (act === 'hall') app.openHall();
    if (act === 'codex') app.openCodex();
  });
  app.cleanup = () => A.stopShowcase();
}
