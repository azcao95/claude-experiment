// The 3D arena: renderer, camera, hex board, bench, unit views, HTML
// overlays (health bars, floating combat text) and pointer interaction.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildEnvironment, stoneTexture, ENVS } from './environment.js';
import { buildUnitModel, animateModel, mat } from './models.js';
import { VFX } from './vfx.js';
import { COLS, ROWS, hexToWorld, PLAYER_ROWS } from '../game/hex.js';
import { UNITS, COST_COLORS } from '../data/units.js';
import { ITEMS } from '../data/items.js';
import { itemSvg } from '../ui/dom.js';

const BENCH_Z = hexToWorld(0, ROWS - 1).z + 2.35;
export const BENCH_SLOTS = 9;
export function benchToWorld(i) { return { x: (i - (BENCH_SLOTS - 1) / 2) * 1.62, z: BENCH_Z }; }

const STAR_SCALE = [1.4, 1.58, 1.78];

function at(o, x, y, z) { o.position.set(x, y, z); o.castShadow = true; return o; }
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Arena {
  constructor(container, overlay) {
    this.container = container;
    this.overlay = overlay;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camBase = new THREE.Vector3(0, 22, 14.5);
    this.camTarget = new THREE.Vector3(0, 0, 2.0);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camTarget);
    this.orbit = { on: false, angle: 0, radius: 13.5, height: 4.2, speed: 0.07 };
    this.shake = 0;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.45, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.vfx = new VFX(this.scene, (at) => this.resolvePos(at));
    this.views = new Map();     // key -> view
    this.env = null;
    this.envId = null;
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);
    this.tiles = [];
    this.benchTiles = [];
    this.buildBoard('forest');

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.drag = null;
    this.hoverView = null;
    this.interactive = false;
    this.callbacks = {};
    this.time = 0;
    this.running = true;
    this.paused = false;
    this.lastFrame = performance.now();

    this.bindEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  on(name, fn) { this.callbacks[name] = fn; }
  emit(name, ...args) { this.callbacks[name]?.(...args); }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // Pull back on narrow (portrait) screens so the whole board fits.
    const narrow = w / h < 1.1;
    this.camera.fov = narrow ? 60 : 44;
    this.camBase.set(0, narrow ? 26 : 22, narrow ? 17 : 14.5);
    this.camTarget.set(0, 0, narrow ? 3.0 : 2.0);
    this.camera.updateProjectionMatrix();
  }

  setVisible(v) {
    this.container.style.display = v ? 'block' : 'none';
    this.overlay.style.display = v ? 'block' : 'none';
    this.paused = !v;
    if (v) this.resize();
  }

  // ─────────────────────────── Board ───────────────────────────
  setEnvironment(envId) {
    if (this.envId === envId) return;
    if (this.env) this.env.dispose();
    this.env = buildEnvironment(this.scene, envId);
    this.envId = envId;
    this.buildBoard(envId);
  }

  buildBoard(envId) {
    const E = ENVS[envId] || ENVS.forest;
    this.scene.remove(this.boardGroup);
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);
    this.tiles = [];
    this.benchTiles = [];

    // Platform
    const platTex = stoneTexture(E.platform, '#ffffff');
    platTex.wrapS = platTex.wrapT = THREE.RepeatWrapping;
    platTex.repeat.set(4, 4);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 10.2, 0.6, 8), new THREE.MeshStandardMaterial({ map: platTex, roughness: 0.9, flatShading: true }));
    plat.position.y = -0.3;
    plat.rotation.y = Math.PI / 8;
    plat.receiveShadow = true;
    plat.castShadow = true;
    this.boardGroup.add(plat);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(9.75, 0.12, 4, 8), mat('#c9a227', { metal: 0.7, rough: 0.3 }));
    trim.rotation.x = Math.PI / 2;
    trim.rotation.z = Math.PI / 8;
    trim.position.y = 0.02;
    this.boardGroup.add(trim);
    // Corner braziers
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const b = new THREE.Group();
      b.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 6), mat('#4a4038')), 0, 0.6, 0));
      b.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.3, 6), mat('#c9a227', { metal: 0.6, rough: 0.4 })), 0, 1.3, 0));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 6), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
      flame.position.y = 1.75;
      b.add(flame);
      b.userData.flame = flame;
      b.position.set(Math.cos(a) * 9.3, 0, Math.sin(a) * 9.3);
      this.boardGroup.add(b);
      const l = new THREE.PointLight('#ffa040', 4, 7, 1.8);
      l.position.set(b.position.x, 2, b.position.z);
      this.boardGroup.add(l);
      (this.braziers = this.braziers || []).push(flame);
    }
    this.braziers = this.boardGroup.children.filter(c => c.userData.flame).map(c => c.userData.flame);

    const texA = stoneTexture(E.tileA, '#ffffff');
    const texB = stoneTexture(E.tileB, '#ffffff');
    const geo = new THREE.CylinderGeometry(0.93, 0.97, 0.22, 6);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const { x, z } = hexToWorld(c, r);
        const player = PLAYER_ROWS.includes(r);
        const m = new THREE.MeshStandardMaterial({
          map: (r + c) % 2 ? texA : texB, roughness: 0.85, flatShading: true,
          color: player ? '#dfe8ff' : '#ffe0dc', emissive: '#000000',
        });
        const tile = new THREE.Mesh(geo, m);
        tile.position.set(x, 0.11, z);
        tile.receiveShadow = true;
        tile.userData = { c, r, player, kind: 'hex' };
        this.boardGroup.add(tile);
        this.tiles.push(tile);
      }
    }
    // Glowing midline
    const mid = new THREE.Mesh(new THREE.PlaneGeometry(COLS * 1.75 + 0.6, 0.06), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.6 }));
    mid.rotation.x = -Math.PI / 2;
    mid.position.set(0, 0.23, (hexToWorld(0, 3).z + hexToWorld(0, 4).z) / 2);
    this.boardGroup.add(mid);

    // Bench
    const benchBase = new THREE.Mesh(new THREE.BoxGeometry(BENCH_SLOTS * 1.62 + 0.6, 0.3, 1.7), new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.9 }));
    benchBase.position.set(0, 0.0, BENCH_Z);
    benchBase.receiveShadow = true;
    this.boardGroup.add(benchBase);
    const bgeo = new THREE.BoxGeometry(1.42, 0.12, 1.42);
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const { x, z } = benchToWorld(i);
      const m = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.8, emissive: '#000000' });
      const t = new THREE.Mesh(bgeo, m);
      t.position.set(x, 0.2, z);
      t.receiveShadow = true;
      t.userData = { bench: i, kind: 'bench' };
      this.boardGroup.add(t);
      this.benchTiles.push(t);
    }
  }

  highlightTiles(mode) {
    // mode: null | 'drag'
    for (const t of this.tiles) {
      t.material.emissive.set(mode === 'drag' && t.userData.player ? '#1a3a6a' : '#000000');
    }
    for (const t of this.benchTiles) t.material.emissive.set(mode === 'drag' ? '#2a1a0a' : '#000000');
  }

  // ─────────────────────────── Unit views ───────────────────────────
  createView(key, defId, star, team, ref) {
    const def = UNITS[defId];
    const model = buildUnitModel(def);
    const s = (STAR_SCALE[star - 1] || 1);
    model.scale.setScalar(s);
    // team ring
    const ringColor = team === 'p' ? '#4ab0ff' : '#ff4a3a';
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.24;
    const holder = new THREE.Group();
    holder.add(model);
    holder.add(ring);
    // invisible hit target
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, Math.max(1.2, model.userData.height * s), 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = Math.max(1.2, model.userData.height * s) / 2;
    hit.userData.viewKey = key;
    holder.add(hit);
    model.traverse(o => { if (o.isMesh) o.userData.viewKey = key; });
    this.scene.add(holder);

    const bar = document.createElement('div');
    bar.className = `ubar ${team === 'p' ? 'ally' : 'foe'}${def.boss ? ' boss' : ''}`;
    bar.innerHTML = `<div class="ustars s${star}">${'★'.repeat(star)}</div><div class="uhp"><div class="fill"></div><div class="shield"></div><div class="ticks"></div></div><div class="umana"><div class="fill"></div></div><div class="uitems"></div>`;
    this.overlay.appendChild(bar);

    const view = {
      key, defId, star, team, ref, holder, model, ring, hit, bar,
      hpFill: bar.querySelector('.uhp .fill'), shieldFill: bar.querySelector('.uhp .shield'),
      manaFill: bar.querySelector('.umana .fill'), itemsEl: bar.querySelector('.uitems'),
      anim: { t: Math.random() * 10, moving: false, attackT: -1, castT: -1, stunned: false, dead: false, deadT: 0, ranged: def.range > 1 },
      height: model.userData.height * s, facing: team === 'p' ? Math.PI : 0, scaleBoost: 1, scaleBoostT: 0, itemsKey: '',
      stunFx: null,
    };
    holder.rotation.y = view.facing;
    this.views.set(key, view);
    return view;
  }

  removeView(key) {
    const v = this.views.get(key);
    if (!v) return;
    this.scene.remove(v.holder);
    v.bar.remove();
    this.views.delete(key);
  }

  clearViews(filter = () => true) {
    for (const [k, v] of [...this.views]) if (filter(v)) this.removeView(k);
  }

  setItemsBadge(view, items) {
    const key = (items || []).join(',');
    if (view.itemsKey === key) return;
    view.itemsKey = key;
    view.itemsEl.innerHTML = (items || []).map(id => `<div class="item ${ITEMS[id]?.component ? '' : 'full'}" style="--ic:${ITEMS[id]?.color}">${itemSvg(id)}</div>`).join('');
  }

  /** Sync planning-phase views with the run roster. */
  syncPlanning(board, bench, enemyUnits) {
    const wanted = new Set();
    for (const u of board) {
      const k = `p${u.uid}`;
      wanted.add(k);
      let v = this.views.get(k);
      if (v && (v.star !== u.star || v.defId !== u.id)) { this.removeView(k); v = null; }
      if (!v) v = this.createView(k, u.id, u.star, 'p', u);
      v.ref = u;
      v.place = { kind: 'hex', c: u.pos.c, r: u.pos.r };
      v.combat = null;
      this.setItemsBadge(v, u.items);
    }
    bench.forEach((u, i) => {
      if (!u) return;
      const k = `p${u.uid}`;
      wanted.add(k);
      let v = this.views.get(k);
      if (v && (v.star !== u.star || v.defId !== u.id)) { this.removeView(k); v = null; }
      if (!v) v = this.createView(k, u.id, u.star, 'p', u);
      v.ref = u;
      v.place = { kind: 'bench', i };
      v.combat = null;
      this.setItemsBadge(v, u.items);
    });
    for (const e of enemyUnits || []) {
      const k = `e${e.unit.uid}`;
      wanted.add(k);
      let v = this.views.get(k);
      if (!v) v = this.createView(k, e.unit.id, e.unit.star, 'e', e.unit);
      v.place = { kind: 'hex', c: e.pos.c, r: e.pos.r };
      v.combat = null;
      this.setItemsBadge(v, e.unit.items);
    }
    for (const [k, v] of [...this.views]) if (!wanted.has(k) && !v.dying) this.removeView(k);
    for (const v of this.views.values()) {
      v.anim.dead = false; v.anim.deadT = 0; v.anim.moving = false;
      v.holder.visible = true;
      v.bar.style.display = '';
      v.facing = v.team === 'p' ? Math.PI : 0;
      this.updateBarStatic(v);
    }
  }

  updateBarStatic(v) {
    v.hpFill.style.width = '100%';
    v.shieldFill.style.width = '0%';
    const def = UNITS[v.defId];
    v.manaFill.parentElement.style.display = def.mana >= 999 ? 'none' : '';
    v.manaFill.style.width = `${Math.min(100, (def.startMana / def.mana) * 100)}%`;
  }

  /** Begin showing a battle. Board/enemy planning views are replaced. */
  startCombat(battle) {
    this.battle = battle;
    this.clearViews(v => v.place?.kind !== 'bench');
    for (const u of battle.units) this.addCombatView(u);
    this.vfx.clear();
  }

  addCombatView(u) {
    const k = `c${u.id}`;
    const v = this.createView(k, u.defId, u.star, u.team, u);
    v.combat = u;
    v.place = null;
    this.setItemsBadge(v, u.items);
    const p = hexToWorld(u.pos.c, u.pos.r);
    v.holder.position.set(p.x, 0.22, p.z);
    if (u.isSummon) {
      v.holder.scale.setScalar(0.01);
      v.spawnT = 0;
      this.vfx.ring(u, 1, u.team === 'p' ? '#6fe0ff' : '#ff6a6a', 0.6);
    }
    // tick marks every 300 hp
    const ticks = Math.floor(u.maxHp / 300);
    v.bar.querySelector('.ticks').style.backgroundSize = ticks > 0 ? `${100 / (u.maxHp / 300)}% 100%` : '0 0';
    return v;
  }

  endCombat() {
    this.battle = null;
    this.vfx.clear();
    this.clearViews(v => !!v.combat);
  }

  viewOfCombat(u) { return this.views.get(`c${u.id}`); }

  resolvePos(at) {
    if (!at) return new THREE.Vector3();
    if (at.isVector3) return at;
    if (at.defId !== undefined) {
      const v = this.viewOfCombat(at);
      if (v) return v.holder.position;
      const p = hexToWorld(at.pos.c, at.pos.r);
      return new THREE.Vector3(p.x, 0.22, p.z);
    }
    if (at.c !== undefined) {
      const p = hexToWorld(at.c, at.r);
      return new THREE.Vector3(p.x, 0.22, p.z);
    }
    if (at.x !== undefined) return new THREE.Vector3(at.x, at.y || 0, at.z);
    return new THREE.Vector3();
  }

  // ─────────────────────────── Combat events ───────────────────────────
  processEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'attack': {
          const v = this.viewOfCombat(e.src);
          if (v && !e.extra) { v.anim.attackT = 0; v.anim.ranged = e.ranged; }
          if (e.ranged) {
            const def = e.src.def;
            const cls = def.cls;
            const kind = ['hunter'].includes(cls) || def.model.bow ? 'arrow' : def.model.gear === 'rifle' ? 'bullet' : 'orb';
            const color = def.ability?.vfx?.color || '#ffffff';
            this.vfx.projectile(e.src, e.tgt, e.dur, kind, color, false);
          } else {
            setTimeout(() => this.vfx.sparks(e.tgt, '#ffffff', 4, 2, 0.04, 0.25, 1), e.dur * 1000 / (this.speed || 1));
          }
          break;
        }
        case 'proj':
          this.vfx.projectile(e.src, e.tgt, e.dur, e.kind, e.color, e.big, e.launchDelay || 0);
          break;
        case 'cast': {
          const v = this.viewOfCombat(e.src);
          if (v) { v.anim.castT = 0; this.castBanner(v, e.name, e.color); }
          this.vfx.ring(e.src, 0.7, e.color || '#ffffff', 0.5);
          break;
        }
        case 'dmg': {
          const v = this.viewOfCombat(e.tgt);
          if (v) {
            this.floatText(v, e.crit ? `${e.amt}!` : `${e.amt}`, e.kind === 'magic' ? 'magic' : e.kind === 'true' ? 'true' : 'phys', e.crit);
            v.flash = 0.12;
          }
          break;
        }
        case 'heal': {
          const v = this.viewOfCombat(e.tgt);
          if (v) this.floatText(v, `+${e.amt}`, 'heal');
          break;
        }
        case 'dodge': {
          const v = this.viewOfCombat(e.u);
          if (v) this.floatText(v, 'Dodge', 'miss');
          break;
        }
        case 'shield': break;
        case 'stun': {
          const v = this.viewOfCombat(e.u);
          if (v) this.floatText(v, 'Stunned', 'stun');
          break;
        }
        case 'vfx': this.vfx.fromEvent(e); if (['shockwave', 'star', 'bolt'].includes(e.vfx)) this.shake = Math.max(this.shake, 0.18); break;
        case 'beam': this.vfx.beam(e.from, e.to, e.color, e.dur); break;
        case 'death': {
          const v = this.viewOfCombat(e.u);
          if (v) {
            v.anim.dead = true; v.anim.deadT = 0; v.dying = true;
            this.vfx.sparks(e.u, v.team === 'p' ? '#8fc8ff' : '#ff8a6a', 14, 3, 0.07, 0.8);
          }
          break;
        }
        case 'revive': {
          const v = this.viewOfCombat(e.u);
          if (v) { v.anim.dead = true; v.anim.deadT = 0; this.vfx.holy(e.u, e.phoenix ? '#ff7a2a' : '#c25aff'); }
          break;
        }
        case 'revived': {
          const v = this.viewOfCombat(e.u);
          if (v) { v.anim.dead = false; v.dying = false; this.vfx.levelUp(e.u, '#ffcc66'); }
          break;
        }
        case 'leap': break;
        case 'spawn': this.addCombatView(e.u); break;
        case 'scale': {
          const v = this.viewOfCombat(e.u);
          if (v) { v.scaleBoost = e.scale; v.scaleBoostT = e.dur; }
          break;
        }
        default: break;
      }
    }
  }

  castBanner(v, name, color) {
    const el = document.createElement('div');
    el.className = 'castname';
    el.textContent = name;
    el.style.setProperty('--c', color || '#ffd27a');
    const p = this.project(v.holder.position.clone().add(new THREE.Vector3(0, v.height + 0.9, 0)));
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  floatText(v, text, kind, crit) {
    const el = document.createElement('div');
    el.className = `ftext ${kind}${crit ? ' crit' : ''}`;
    el.textContent = text;
    const jitter = (Math.random() - 0.5) * 40;
    const p = this.project(v.holder.position.clone().add(new THREE.Vector3(0, v.height + 0.3, 0)));
    el.style.left = `${p.x + jitter}px`;
    el.style.top = `${p.y}px`;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  project(vec) {
    const p = vec.clone().project(this.camera);
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, behind: p.z > 1 };
  }

  // ─────────────────────────── Interaction ───────────────────────────
  bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', (e) => this.onPointerMove(e));
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    el.addEventListener('pointerleave', () => { if (!this.drag) { this.hoverView = null; this.emit('hover', null); } });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setPointer(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  pickView(e) {
    this.setPointer(e);
    const targets = [];
    for (const v of this.views.values()) if (v.holder.visible && !v.anim.dead) targets.push(v.hit);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;
    return this.views.get(hits[0].object.userData.viewKey) || null;
  }

  /** Public: which own unit (uid) is at this screen position (for item drops). */
  unitAtScreen(clientX, clientY) {
    const v = this.pickView({ clientX, clientY });
    return v ? v : null;
  }

  pickSlot(e) {
    this.setPointer(e);
    const hits = this.raycaster.intersectObjects([...this.tiles, ...this.benchTiles], false);
    if (hits.length) return hits[0].object.userData;
    // fallback: nearest slot to ground point
    const pt = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, pt)) return null;
    let best = null, bd = 1.3;
    for (const t of [...this.tiles, ...this.benchTiles]) {
      const d = Math.hypot(t.position.x - pt.x, t.position.z - pt.z);
      if (d < bd) { bd = d; best = t.userData; }
    }
    return best;
  }

  onPointerMove(e) {
    if (this.drag) {
      this.setPointer(e);
      const pt = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, pt)) {
        this.drag.view.holder.position.set(pt.x, 0.9, pt.z);
      }
      const slot = this.pickSlot(e);
      for (const t of this.tiles) t.material.emissive.set(t.userData.player ? '#1a3a6a' : '#000000');
      for (const t of this.benchTiles) t.material.emissive.set('#2a1a0a');
      if (slot) {
        const t = slot.kind === 'bench' ? this.benchTiles[slot.bench] : this.tiles.find(x => x.userData.c === slot.c && x.userData.r === slot.r);
        if (t && (slot.kind === 'bench' || slot.player)) t.material.emissive.set('#4a8aff');
      }
      this.emit('dragMove', e, this.drag.view);
      return;
    }
    const v = this.pickView(e);
    if (v !== this.hoverView) {
      this.hoverView = v;
      this.renderer.domElement.style.cursor = v && this.interactive && v.team === 'p' && !v.combat ? 'grab' : v ? 'help' : 'default';
    }
    this.emit('hover', v, e);
  }

  onPointerDown(e) {
    if (e.button === 2) { const v = this.pickView(e); if (v) this.emit('rightClick', v, e); return; }
    if (!this.interactive) return;
    const v = this.pickView(e);
    if (!v || v.team !== 'p' || v.combat) return;
    this.drag = { view: v, start: { x: e.clientX, y: e.clientY } };
    this.highlightTiles('drag');
    this.renderer.domElement.style.cursor = 'grabbing';
    this.emit('dragStart', v);
  }

  onPointerUp(e) {
    if (!this.drag) return;
    const v = this.drag.view;
    this.drag = null;
    this.highlightTiles(null);
    this.renderer.domElement.style.cursor = 'default';
    const slot = this.pickSlot(e);
    this.emit('drop', v, slot, e);
  }

  // ─────────────────────────── Showcase (title screen) ───────────────────────────
  showcase(unitIds) {
    this.clearViews();
    const n = unitIds.length;
    unitIds.forEach((id, i) => {
      const v = this.createView(`show${i}`, id, 1, 'p', null);
      v.bar.style.display = 'none';
      v.ring.visible = false;
      const a = (i / n) * Math.PI * 2;
      v.showPos = { x: Math.cos(a) * 3.8, z: Math.sin(a) * 3.8 };
      v.facing = -a + Math.PI / 2 + Math.PI;
      v.holder.position.set(v.showPos.x, 0.22, v.showPos.z);
      v.place = null;
    });
    this.orbit.on = true;
  }

  stopShowcase() {
    this.orbit.on = false;
    this.clearViews(v => v.key.startsWith('show'));
  }

  // ─────────────────────────── Frame ───────────────────────────
  frame() {
    const now = performance.now();
    const rawDt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.paused) return;
    this.time += rawDt;
    const dt = rawDt;
    if (this.onTick) this.onTick(dt);
    if (this.env) this.env.update(dt, this.time);
    for (const f of this.braziers || []) f.scale.set(1 + Math.sin(this.time * 9 + f.id) * 0.1, 1 + Math.sin(this.time * 13 + f.id) * 0.2, 1);

    // camera
    if (this.orbit.on) {
      this.orbit.angle += dt * this.orbit.speed;
      this.camera.position.set(Math.sin(this.orbit.angle) * this.orbit.radius, this.orbit.height, Math.cos(this.orbit.angle) * this.orbit.radius);
      this.camera.lookAt(0, 2.2, 0);
    } else {
      const cp = this.camBase.clone();
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt);
        cp.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
      }
      this.camera.position.lerp(cp, 0.2);
      this.camera.lookAt(this.camTarget);
    }

    const speed = this.speed || 1;
    for (const v of [...this.views.values()]) this.updateView(v, dt, speed);
    this.vfx.update(dt * speed);
    this.composer.render();
  }

  updateView(v, dt, speed) {
    const a = v.anim;
    a.t += dt;
    const sdt = dt * speed;
    if (v.combat) {
      const u = v.combat;
      const from = hexToWorld(u.from.c, u.from.r);
      const to = hexToWorld(u.pos.c, u.pos.r);
      const k = ease(u.moveT);
      const x = from.x + (to.x - from.x) * k;
      const z = from.z + (to.z - from.z) * k;
      const y = 0.22 + (u.leaping ? Math.sin(u.moveT * Math.PI) * 1.8 : 0);
      v.holder.position.set(x, y, z);
      a.moving = u.moveT < 1 && !u.leaping;
      a.stunned = u.stun > 0 || u.banished > 0;
      a.spin = u.spinUntil > (this.battle?.time || 0);
      // facing
      let face = v.facing;
      if (u.moveT < 1 && (to.x !== from.x || to.z !== from.z)) face = Math.atan2(to.x - from.x, to.z - from.z);
      else if (u.target && u.target.alive) {
        const tp = hexToWorld(u.target.pos.c, u.target.pos.r);
        face = Math.atan2(tp.x - x, tp.z - z);
      }
      let d = face - v.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.facing += d * Math.min(1, dt * 10);
      v.holder.rotation.y = v.facing;
      // bars
      const hpPct = Math.max(0, u.hp / u.maxHp) * 100;
      const sh = u.shields.reduce((s, x) => s + x.amt, 0);
      v.hpFill.style.width = `${hpPct}%`;
      v.shieldFill.style.width = `${Math.min(100, (sh / u.maxHp) * 100)}%`;
      v.shieldFill.style.left = `${Math.min(hpPct, 100 - Math.min(100, (sh / u.maxHp) * 100))}%`;
      v.manaFill.style.width = `${u.maxMana >= 999 ? 0 : Math.min(100, (u.mana / u.maxMana) * 100)}%`;
      v.bar.classList.toggle('full', u.mana >= u.maxMana && u.maxMana < 999);
      // stun stars
      if (a.stunned && !v.stunFx) v.stunFx = this.makeStunFx(v);
      if (!a.stunned && v.stunFx) { v.holder.remove(v.stunFx); v.stunFx = null; }
      if (v.stunFx) v.stunFx.rotation.y += dt * 5;
      if (u.reviving > 0) v.holder.visible = Math.floor(a.t * 10) % 2 === 0;
      else if (!v.dying) v.holder.visible = true;
    } else if (v.place) {
      let target;
      if (v.place.kind === 'hex') { const p = hexToWorld(v.place.c, v.place.r); target = { x: p.x, z: p.z, y: 0.22 }; }
      else { const p = benchToWorld(v.place.i); target = { x: p.x, z: p.z, y: 0.26 }; }
      if (!this.drag || this.drag.view !== v) {
        v.holder.position.x += (target.x - v.holder.position.x) * Math.min(1, dt * 14);
        v.holder.position.z += (target.z - v.holder.position.z) * Math.min(1, dt * 14);
        v.holder.position.y += (target.y - v.holder.position.y) * Math.min(1, dt * 14);
      }
      let d = (v.team === 'p' ? Math.PI : 0) - v.holder.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.holder.rotation.y += d * Math.min(1, dt * 8);
      a.moving = false;
    } else if (v.showPos) {
      v.holder.rotation.y = v.facing;
      if (Math.random() < dt * 0.3) a.castT = 0;
      if (Math.random() < dt * 0.4) { a.attackT = 0; a.ranged = false; }
    }

    if (a.attackT >= 0) { a.attackT += sdt / 0.35; if (a.attackT > 1) a.attackT = -1; }
    if (a.castT >= 0) { a.castT += sdt / 0.55; if (a.castT > 1) a.castT = -1; }
    if (a.dead) {
      a.deadT += sdt;
      if (v.dying && a.deadT > 1.6) { this.removeView(v.key); return; }
      v.bar.style.display = 'none';
      v.ring.visible = false;
    } else if (!v.showPos) {
      v.ring.visible = true;
    }

    // scale boost (Bear Form, Avatar…) and spawn pop-in
    if (v.scaleBoostT > 0) { v.scaleBoostT -= sdt; if (v.scaleBoostT <= 0) v.scaleBoost = 1; }
    const targetScale = v.scaleBoost;
    const cs = v.model.userData.curBoost || 1;
    const ns = cs + (targetScale - cs) * Math.min(1, dt * 6);
    v.model.userData.curBoost = ns;
    const baseS = STAR_SCALE[v.star - 1] || 1;
    v.model.scale.setScalar(baseS * ns);
    if (v.spawnT !== undefined && v.spawnT < 1) { v.spawnT += dt * 3; v.holder.scale.setScalar(Math.min(1, v.spawnT)); }

    // hit flash
    if (v.flash > 0) {
      v.flash -= dt;
      v.model.position.x = (Math.random() - 0.5) * 0.06;
    } else v.model.position.x = 0;

    animateModel(v.model, a, sdt);

    // bar position
    if (v.bar.style.display !== 'none') {
      const p = this.project(v.holder.position.clone().add(new THREE.Vector3(0, v.height * (v.scaleBoost || 1) + 0.45, 0)));
      v.bar.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  }

  makeStunFx(v) {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: '#ffe46a' });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), m);
      const a = (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
      g.add(s);
    }
    g.position.y = v.height + 0.15;
    v.holder.add(g);
    return g;
  }
}

export { COST_COLORS };
