// Procedural low-poly 3D models for every champion and monster.
// Characters are assembled from primitives on a simple rig so they can be
// animated (idle, walk, attack, cast, stun, death) without skinned meshes.

import * as THREE from 'three';

const matCache = new Map();
export function mat(color, o = {}) {
  const k = `${color}|${o.emissive || ''}|${o.ei || 0}|${o.metal || 0}|${o.rough ?? 0.8}|${o.opacity ?? 1}|${o.flat ?? 1}`;
  if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? 0.8,
    metalness: o.metal || 0,
    flatShading: o.flat ?? true,
    emissive: o.emissive || '#000000',
    emissiveIntensity: o.ei || 0,
    transparent: (o.opacity ?? 1) < 1,
    opacity: o.opacity ?? 1,
  });
  matCache.set(k, m);
  return m;
}

const glow = (c, i = 2) => mat(c, { emissive: c, ei: i });
const metal = (c) => mat(c, { metal: 0.65, rough: 0.35 });

function mesh(geo, m, cast = true) {
  const x = new THREE.Mesh(geo, m);
  x.castShadow = cast;
  x.receiveShadow = true;
  return x;
}
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sph: (r, s = 8) => new THREE.SphereGeometry(r, s, Math.max(4, s - 2)),
  cyl: (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 6) => new THREE.ConeGeometry(r, h, s),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  oct: (r) => new THREE.OctahedronGeometry(r),
  tor: (r, t, rs = 6, ts = 12) => new THREE.TorusGeometry(r, t, rs, ts),
};

function put(parent, obj, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s) {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  if (s) { if (typeof s === 'number') obj.scale.setScalar(s); else obj.scale.set(...s); }
  parent.add(obj);
  return obj;
}
function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ═══════════════════════ Races ═══════════════════════
const RACE = {
  human: { skin: '#e9b98f', h: 1.0, bulk: 1.0, head: 1.0, hair: '#5a3a1f' },
  orc: { skin: '#5f8f3a', h: 1.05, bulk: 1.3, head: 1.0, hair: '#1a1a1a', hunch: 0.15 },
  dwarf: { skin: '#e3a985', h: 0.72, bulk: 1.3, head: 1.1, hair: '#b0582a' },
  elf: { skin: '#9b86d6', h: 1.1, bulk: 0.9, head: 0.95, hair: '#3a6fa8' },
  undead: { skin: '#8fa08a', h: 1.0, bulk: 0.8, head: 0.95, hair: '#2a2a2a' },
  troll: { skin: '#4f8fa0', h: 1.15, bulk: 0.95, head: 1.0, hair: '#d84a3a', hunch: 0.25 },
  tauren: { skin: '#7a5434', h: 1.2, bulk: 1.45, head: 1.15, hair: '#3a2614', hunch: 0.1 },
  gnome: { skin: '#f0c8a8', h: 0.55, bulk: 0.9, head: 1.5, hair: '#ff6ab0' },
  demonhunter: { skin: '#7a6ab0', h: 1.1, bulk: 1.0, head: 0.95, hair: '#1a1a1a' },
};

/** Build a humanoid rig. Returns { root, parts }. */
function humanoid(race, o) {
  const R = RACE[race] || RACE.human;
  const skinC = o.skin || R.skin;
  const skin = mat(skinC);
  const h = R.h, b = R.bulk;
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const hipY = 0.55 * h;
  const legLen = hipY - 0.06;
  const parts = { body };

  // legs
  const legMat = mat(o.secondary);
  for (const side of [-1, 1]) {
    const leg = pivot(body, side * 0.11 * b, hipY, 0);
    put(leg, mesh(G.cyl(0.075 * b, 0.065 * b, legLen), legMat), 0, -legLen / 2, 0);
    put(leg, mesh(G.box(0.13 * b, 0.08, 0.22), mat(o.boots || '#3a2a1a')), 0, -legLen + 0.01, 0.04);
    parts[side < 0 ? 'legL' : 'legR'] = leg;
  }
  // torso
  const torso = pivot(body, 0, hipY, 0);
  torso.rotation.x = R.hunch || 0;
  parts.torso = torso;
  const tH = 0.48 * h;
  put(torso, mesh(G.cyl(0.24 * b, 0.17 * b, tH, 7), mat(o.primary)), 0, tH / 2, 0);
  put(torso, mesh(G.cyl(0.19 * b, 0.19 * b, 0.07, 7), mat(o.belt || '#4a3420')), 0, 0.03, 0);
  put(torso, mesh(G.box(0.08, 0.06, 0.04), metal('#d4b050')), 0, 0.03, 0.18 * b);
  // head
  const neckY = tH + 0.02;
  const head = pivot(torso, 0, neckY, 0.02);
  parts.head = head;
  const hs = 0.15 * R.head * (race === 'gnome' ? 1 : Math.max(1, b * 0.85));
  put(head, mesh(G.sph(hs, 8), skin), 0, hs * 0.95, 0);
  parts.headSize = hs;
  // arms
  const shoulderX = 0.27 * b;
  const armLen = 0.42 * h * (race === 'troll' ? 1.15 : 1);
  for (const side of [-1, 1]) {
    const arm = pivot(torso, side * shoulderX, tH - 0.06, 0);
    put(arm, mesh(G.cyl(0.07 * b, 0.06 * b, armLen), mat(o.sleeve || o.primary)), 0, -armLen / 2, 0);
    const hand = pivot(arm, 0, -armLen, 0);
    put(hand, mesh(G.sph(0.065 * b, 6), skin), 0, 0, 0);
    arm.rotation.z = side * 0.12;
    parts[side < 0 ? 'armL' : 'armR'] = arm;
    parts[side < 0 ? 'handL' : 'handR'] = hand;
  }
  parts.shoulderX = shoulderX;
  parts.tH = tH;

  raceFeatures(race, parts, o, skinC, R);
  return { root, parts };
}

function raceFeatures(race, p, o, skinC, R) {
  const hs = p.headSize;
  const head = p.head;
  const hy = hs * 0.95;
  const skin = mat(skinC);
  const eyes = (color, glowing) => {
    for (const s of [-1, 1]) put(head, mesh(G.sph(hs * 0.13, 5), glowing ? glow(color, 3) : mat(color)), s * hs * 0.38, hy + hs * 0.12, hs * 0.85);
  };
  const hair = mat(o.hair || R.hair);
  switch (race) {
    case 'human':
      eyes('#1a1a2a');
      if (!o.helm) put(head, mesh(G.sph(hs * 1.05, 8), hair), 0, hy + hs * 0.25, -hs * 0.12, 0, 0, 0, [1, 0.75, 1]);
      if (o.female) put(head, mesh(G.cyl(hs * 0.5, hs * 0.2, hs * 1.6), hair), 0, hy - hs * 0.4, -hs * 0.7);
      break;
    case 'orc':
      eyes('#ff3a1a', true);
      put(head, mesh(G.box(hs * 1.3, hs * 0.5, hs * 0.8), skin), 0, hy - hs * 0.45, hs * 0.3);
      for (const s of [-1, 1]) put(head, mesh(G.cone(hs * 0.12, hs * 0.5, 4), mat('#f0e8d0')), s * hs * 0.45, hy - hs * 0.15, hs * 0.75);
      if (!o.helm) put(head, mesh(G.box(hs * 0.25, hs * 0.5, hs * 1.4), hair), 0, hy + hs * 0.9, -hs * 0.1);
      break;
    case 'dwarf':
      eyes('#1a1a2a');
      put(head, mesh(G.cone(hs * 0.95, hs * 1.9, 6), mat(o.female ? o.hair || '#c97a2a' : R.hair)), 0, hy - hs * 1.05, hs * 0.45, Math.PI + 0.25, 0, 0);
      put(head, mesh(G.sph(hs * 0.26, 5), mat('#d8906a')), 0, hy, hs * 0.95);
      break;
    case 'elf':
      eyes('#e8f8ff', true);
      for (const s of [-1, 1]) put(head, mesh(G.cone(hs * 0.15, hs * 1.6, 4), skin), s * hs * 1.15, hy + hs * 0.35, -hs * 0.1, 0, 0, -s * 1.15);
      if (!o.helm) {
        put(head, mesh(G.sph(hs * 1.05, 8), hair), 0, hy + hs * 0.2, -hs * 0.18, 0, 0, 0, [1, 0.85, 1]);
        put(head, mesh(G.cyl(hs * 0.55, hs * 0.25, hs * 2.4), hair), 0, hy - hs * 0.9, -hs * 0.8, 0.15, 0, 0);
      }
      break;
    case 'undead':
      eyes('#ffe46a', true);
      put(head, mesh(G.box(hs * 0.9, hs * 0.35, hs * 0.6), mat('#d9d2bf')), 0, hy - hs * 0.6, hs * 0.25);
      for (let i = 0; i < 3; i++) put(p.torso, mesh(G.box(0.3, 0.025, 0.05), mat('#d9d2bf')), 0, 0.15 + i * 0.07, 0.17);
      if (!o.helm) put(head, mesh(G.sph(hs * 1.02, 6), hair), 0, hy + hs * 0.35, -hs * 0.2, 0, 0, 0, [1, 0.6, 1]);
      break;
    case 'troll':
      eyes('#ffd23a', true);
      put(head, mesh(G.box(hs * 0.9, hs * 0.5, hs * 1.0), skin), 0, hy - hs * 0.35, hs * 0.55);
      for (const s of [-1, 1]) {
        put(head, mesh(G.cone(hs * 0.13, hs * 1.6, 4), skin), s * hs * 1.2, hy + hs * 0.1, 0, 0, 0, -s * 1.3);
        put(head, mesh(G.cone(hs * 0.12, hs * 0.9, 4), mat('#f0e8d0')), s * hs * 0.4, hy - hs * 0.1, hs * 1.0, -0.6, 0, s * -0.4);
      }
      if (!o.helm) put(head, mesh(G.cone(hs * 0.45, hs * 1.8, 5), hair), 0, hy + hs * 1.3, -hs * 0.2, -0.3, 0, 0);
      break;
    case 'tauren':
      eyes('#1a1a1a');
      put(head, mesh(G.box(hs * 0.9, hs * 0.7, hs * 0.9), mat('#5a3a24')), 0, hy - hs * 0.25, hs * 0.75);
      put(head, mesh(G.box(hs * 0.7, hs * 0.25, hs * 0.2), mat('#2a1a10')), 0, hy - hs * 0.35, hs * 1.2);
      for (const s of [-1, 1]) {
        const horn = pivot(head, s * hs * 0.8, hy + hs * 0.5, 0);
        put(horn, mesh(G.cone(hs * 0.18, hs * 1.3, 5), mat('#e8dcc0')), s * hs * 0.35, hs * 0.35, 0, 0, 0, -s * 0.9);
        put(head, mesh(G.cone(hs * 0.18, hs * 0.5, 4), skin), s * hs * 1.05, hy + hs * 0.2, 0, 0, 0, -s * 1.5);
      }
      put(head, mesh(G.tor(hs * 0.15, hs * 0.04), metal('#d4b050')), 0, hy - hs * 0.5, hs * 1.28, Math.PI / 2, 0, 0);
      break;
    case 'gnome':
      eyes('#2a4aff');
      if (!o.helm) {
        put(head, mesh(G.sph(hs * 0.55, 6), hair), -hs * 0.8, hy + hs * 0.5, -hs * 0.1);
        put(head, mesh(G.sph(hs * 0.55, 6), hair), hs * 0.8, hy + hs * 0.5, -hs * 0.1);
      }
      for (const s of [-1, 1]) put(head, mesh(G.cone(hs * 0.12, hs * 0.6, 4), skin), s * hs * 1.0, hy + hs * 0.1, 0, 0, 0, -s * 1.2);
      put(head, mesh(G.tor(hs * 0.3, hs * 0.07, 4, 10), metal('#c9a227')), 0, hy + hs * 0.55, hs * 0.7, 0.3, 0, 0);
      break;
    case 'demonhunter':
      put(head, mesh(G.box(hs * 2.05, hs * 0.35, hs * 0.5), glow('#7fff3a', 1.5)), 0, hy + hs * 0.12, hs * 0.65);
      for (const s of [-1, 1]) {
        put(head, mesh(G.cone(hs * 0.2, hs * 1.6, 5), mat('#1a1a1a')), s * hs * 0.6, hy + hs * 1.2, -hs * 0.2, -0.5, 0, s * -0.4);
        const wing = pivot(p.torso, s * 0.12, p.tH * 0.8, -0.18);
        put(wing, mesh(G.box(0.7, 0.5, 0.03), mat('#2a1a2a', { opacity: 0.9 })), s * 0.35, 0.1, 0, 0, s * 0.4, s * 0.3);
        p[s < 0 ? 'wingL' : 'wingR'] = wing;
      }
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) put(p.torso, mesh(G.box(0.08, 0.02, 0.03), glow('#7fff3a', 2)), s * 0.1, 0.12 + i * 0.1, 0.2);
      put(head, mesh(G.sph(hs * 1.02, 6), hair), 0, hy + hs * 0.3, -hs * 0.2, 0, 0, 0, [1, 0.7, 1]);
      break;
    default:
      eyes('#1a1a1a');
  }
}

// ═══════════════════════ Gear ═══════════════════════
function pauldrons(p, color, size = 1, spikes = false, trim) {
  for (const s of [-1, 1]) {
    const pd = put(p.torso, mesh(G.sph(0.17 * size, 7), metal(color)), s * p.shoulderX * 1.05, p.tH - 0.02, 0, 0, 0, 0, [1.25, 0.9, 1.15]);
    if (trim) put(p.torso, mesh(G.tor(0.15 * size, 0.025, 4, 10), metal(trim)), s * p.shoulderX * 1.05, p.tH - 0.06, 0, Math.PI / 2, 0, 0);
    if (spikes) for (let i = -1; i <= 1; i++) put(pd, mesh(G.cone(0.04, 0.22, 4), metal('#c0c8d0')), i * 0.07, 0.15, 0, 0, 0, s * -0.35);
  }
}

function helm(p, color, kind = 'dome', accent) {
  const hs = p.headSize;
  const hy = hs * 0.95;
  if (kind === 'dome') {
    put(p.head, mesh(G.sph(hs * 1.1, 8), metal(color)), 0, hy + hs * 0.2, 0, 0, 0, 0, [1, 0.85, 1]);
    put(p.head, mesh(G.box(hs * 0.18, hs * 0.7, hs * 0.2), metal(color)), 0, hy, hs * 0.95);
  } else if (kind === 'horned') {
    put(p.head, mesh(G.sph(hs * 1.1, 8), metal(color)), 0, hy + hs * 0.2, 0, 0, 0, 0, [1, 0.85, 1]);
    for (const s of [-1, 1]) put(p.head, mesh(G.cone(hs * 0.2, hs * 1.1, 5), mat('#e8dcc0')), s * hs * 1.0, hy + hs * 0.7, 0, 0, 0, -s * 0.7);
  } else if (kind === 'hood') {
    put(p.head, mesh(G.cone(hs * 1.25, hs * 2.4, 7), mat(color)), 0, hy + hs * 0.55, -hs * 0.15, -0.15, 0, 0);
    put(p.head, mesh(G.sph(hs * 0.98, 6), mat('#0a0a0a')), 0, hy, hs * 0.25);
  } else if (kind === 'wizard') {
    put(p.head, mesh(G.cyl(hs * 1.6, hs * 1.6, hs * 0.12, 10), mat(color)), 0, hy + hs * 0.7, 0);
    put(p.head, mesh(G.cone(hs * 0.9, hs * 2.6, 8), mat(color)), 0, hy + hs * 2.0, -hs * 0.2, -0.2, 0, 0);
    if (accent) put(p.head, mesh(G.oct(hs * 0.25), glow(accent, 2)), 0, hy + hs * 1.0, hs * 0.85);
  } else if (kind === 'crown') {
    put(p.head, mesh(G.cyl(hs * 1.05, hs * 1.0, hs * 0.4, 8), metal(color)), 0, hy + hs * 0.65, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(p.head, mesh(G.cone(hs * 0.15, hs * 0.6, 4), metal(color)), Math.sin(a) * hs, hy + hs * 1.1, Math.cos(a) * hs);
    }
  } else if (kind === 'lich') {
    put(p.head, mesh(G.sph(hs * 1.15, 8), metal(color)), 0, hy + hs * 0.1, 0);
    for (let i = -2; i <= 2; i++) put(p.head, mesh(G.cone(hs * 0.18, hs * (1.6 - Math.abs(i) * 0.25), 4), metal(color)), i * hs * 0.38, hy + hs * 1.25, -hs * 0.1, -0.2, 0, -i * 0.25);
    for (const s of [-1, 1]) put(p.head, mesh(G.sph(hs * 0.14, 5), glow('#6fe0ff', 4)), s * hs * 0.38, hy + hs * 0.1, hs * 1.0);
  } else if (kind === 'antlers') {
    for (const s of [-1, 1]) {
      const a = pivot(p.head, s * hs * 0.5, hy + hs * 0.8, 0);
      put(a, mesh(G.cyl(0.02, 0.03, hs * 2), mat('#8a6a3a')), s * hs * 0.3, hs * 0.7, 0, 0, 0, -s * 0.5);
      put(a, mesh(G.cyl(0.015, 0.02, hs * 0.9), mat('#8a6a3a')), s * hs * 0.75, hs * 1.2, 0, 0, 0, -s * 1.2);
      put(a, mesh(G.cyl(0.015, 0.02, hs * 0.8), mat('#8a6a3a')), s * hs * 0.2, hs * 1.3, 0, 0, 0, s * 0.3);
    }
  } else if (kind === 'goggles') {
    for (const s of [-1, 1]) put(p.head, mesh(G.cyl(hs * 0.28, hs * 0.28, hs * 0.2, 8), glow('#7fff3a', 1)), s * hs * 0.4, hy + hs * 0.25, hs * 0.85, Math.PI / 2, 0, 0);
  } else if (kind === 'conical') {
    put(p.head, mesh(G.cone(hs * 2.0, hs * 0.8, 10), mat(color)), 0, hy + hs * 0.95, 0);
  }
}

function robe(p, color, trim, length = 1) {
  const legH = p.legL.position.y;
  const r = put(p.body, mesh(G.cyl(0.2, 0.34, legH * length + 0.05, 8), mat(color)), 0, legH - (legH * length) / 2 + 0.02, 0);
  if (trim) put(p.body, mesh(G.cyl(0.345, 0.35, 0.05, 8), metal(trim)), 0, legH - legH * length + 0.03, 0);
  p.robe = r;
}

function cape(p, color) {
  const c = pivot(p.torso, 0, p.tH - 0.02, -0.17);
  put(c, mesh(G.box(0.48, p.tH + p.legL.position.y * 0.85, 0.03), mat(color)), 0, -(p.tH + p.legL.position.y * 0.85) / 2, 0);
  c.rotation.x = 0.12;
  p.cape = c;
}

function tabard(p, color, emblemColor) {
  put(p.torso, mesh(G.box(0.24, p.tH * 0.9, 0.02), mat(color)), 0, p.tH * 0.42, 0.205);
  if (emblemColor) put(p.torso, mesh(G.oct(0.06), metal(emblemColor)), 0, p.tH * 0.55, 0.225);
}

// Weapons attach to hands (pointing "down" the arm by default; we rotate
// so they point forward/up when held).
function sword(hand, color = '#d8dde6', len = 0.7, hiltC = '#c9a227', glowC) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2;
  put(g, mesh(G.cyl(0.025, 0.025, 0.16), mat('#3a2a1a')), 0, 0, 0);
  put(g, mesh(G.box(0.22, 0.04, 0.05), metal(hiltC)), 0, 0.09, 0);
  put(g, mesh(G.box(0.07, len, 0.02), glowC ? glow(glowC, 1.2) : metal(color)), 0, 0.1 + len / 2, 0);
  put(g, mesh(G.cone(0.05, 0.1, 4), glowC ? glow(glowC, 1.2) : metal(color)), 0, 0.15 + len, 0, 0, Math.PI / 4, 0, [1, 1, 0.3]);
  return g;
}
function axe(hand, color = '#9aa3ad', size = 1, double = false) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2;
  put(g, mesh(G.cyl(0.03, 0.03, 0.8 * size), mat('#5a3a1f')), 0, 0.3 * size, 0);
  put(g, mesh(G.cyl(0.2 * size, 0.2 * size, 0.04, 8, 1), metal(color)), 0.12 * size, 0.6 * size, 0, Math.PI / 2, 0, 0, [1, 1, 1]);
  if (double) put(g, mesh(G.cyl(0.2 * size, 0.2 * size, 0.04, 8), metal(color)), -0.12 * size, 0.6 * size, 0, Math.PI / 2, 0, 0);
  return g;
}
function hammer(hand, color = '#9aa3ad', size = 1, glowC) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2;
  put(g, mesh(G.cyl(0.03, 0.03, 0.7 * size), mat('#5a3a1f')), 0, 0.25 * size, 0);
  put(g, mesh(G.box(0.34 * size, 0.2 * size, 0.2 * size), metal(color)), 0, 0.62 * size, 0);
  if (glowC) put(g, mesh(G.box(0.36 * size, 0.06 * size, 0.21 * size), glow(glowC, 2)), 0, 0.62 * size, 0);
  return g;
}
function staff(hand, wood = '#6b4a2a', orbC = '#9ed3ff', kind = 'orb') {
  const g = pivot(hand, 0, 0, 0);
  put(g, mesh(G.cyl(0.025, 0.03, 1.3), mat(wood)), 0, 0.2, 0);
  if (kind === 'orb') {
    put(g, mesh(G.ico(0.09, 1), glow(orbC, 2.5)), 0, 0.9, 0);
    put(g, mesh(G.tor(0.11, 0.02, 4, 10), metal('#c9a227')), 0, 0.9, 0);
  } else if (kind === 'skull') {
    put(g, mesh(G.sph(0.1, 6), mat('#e8e0c8')), 0, 0.9, 0);
    for (const s of [-1, 1]) put(g, mesh(G.sph(0.025, 4), glow(orbC, 4)), s * 0.035, 0.91, 0.08);
  } else if (kind === 'leaf') {
    for (let i = 0; i < 5; i++) put(g, mesh(G.cone(0.05, 0.18, 4), mat('#4fbf4a')), Math.sin(i * 1.3) * 0.08, 0.85 + i * 0.03, Math.cos(i * 1.3) * 0.08, Math.sin(i) * 0.8, 0, Math.cos(i) * 0.8);
    put(g, mesh(G.ico(0.05), glow(orbC, 2)), 0, 0.92, 0);
  } else if (kind === 'totem') {
    put(g, mesh(G.box(0.14, 0.24, 0.14), mat('#8a5a2a')), 0, 0.85, 0);
    put(g, mesh(G.box(0.3, 0.05, 0.05), mat('#8a5a2a')), 0, 0.92, 0);
    put(g, mesh(G.sph(0.03, 4), glow(orbC, 3)), 0, 0.88, 0.08);
  } else if (kind === 'moon') {
    put(g, mesh(G.tor(0.14, 0.03, 4, 12, Math.PI * 1.3), glow(orbC, 2)), 0, 0.95, 0, 0, 0, 0.6);
    put(g, mesh(G.oct(0.06), glow('#ffffff', 3)), 0, 0.95, 0);
  }
  g.rotation.x = -0.1;
  return g;
}
function bow(hand, color = '#7a5230', glowC) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.set(0, 0, 0);
  const arc = mesh(new THREE.TorusGeometry(0.42, 0.025, 4, 12, Math.PI * 0.9), glowC ? glow(glowC, 0.8) : mat(color));
  put(g, arc, 0, 0, 0.0, 0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.45);
  put(g, mesh(G.cyl(0.005, 0.005, 0.8, 3), mat('#e8e8e8')), 0, 0, -0.12);
  return g;
}
function rifle(hand) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2 - 0.2;
  put(g, mesh(G.box(0.07, 0.35, 0.1), mat('#6b4423')), 0, -0.05, 0);
  put(g, mesh(G.cyl(0.03, 0.03, 0.6), metal('#5a5a5a')), 0, 0.35, 0.02);
  put(g, mesh(G.cyl(0.045, 0.045, 0.08), metal('#d4a843')), 0, 0.62, 0.02);
  return g;
}
function spear(hand, tipC = '#d8dde6') {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2;
  put(g, mesh(G.cyl(0.02, 0.02, 1.3), mat('#7a5230')), 0, 0.2, 0);
  put(g, mesh(G.cone(0.05, 0.22, 4), metal(tipC)), 0, 0.95, 0);
  put(g, mesh(G.sph(0.04, 4), mat('#c94a2a')), 0, 0.8, 0);
  return g;
}
function dagger(hand, color = '#d8dde6', glowC) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2;
  put(g, mesh(G.box(0.12, 0.03, 0.04), metal('#3a3a3a')), 0, 0.05, 0);
  put(g, mesh(G.box(0.05, 0.32, 0.015), glowC ? glow(glowC, 1.2) : metal(color)), 0, 0.22, 0);
  return g;
}
function shield(hand, color, trim = '#c9a227', emblem) {
  const g = pivot(hand, -0.05, 0, 0);
  put(g, mesh(G.cyl(0.24, 0.24, 0.05, 8), metal(color)), 0, 0.1, 0.05, 0, 0, Math.PI / 2);
  put(g, mesh(G.tor(0.24, 0.025, 4, 8), metal(trim)), -0.03, 0.1, 0.05, 0, Math.PI / 2, 0);
  if (emblem) put(g, mesh(G.oct(0.08), glow(emblem, 0.8)), -0.05, 0.1, 0.05);
  return g;
}
function glaive(hand, glowC) {
  const g = pivot(hand, 0, 0, 0);
  g.rotation.x = Math.PI / 2;
  put(g, mesh(G.tor(0.22, 0.03, 4, 12, Math.PI * 1.2), glow(glowC, 1.3)), 0, 0.15, 0, 0, Math.PI / 2, 0);
  put(g, mesh(G.cyl(0.025, 0.025, 0.2), mat('#2a2a2a')), 0, 0, 0);
  return g;
}

function applyGear(gear, p, o, race) {
  const pr = o.primary, se = o.secondary, ac = o.accent;
  switch (gear) {
    case 'warrior':
      pauldrons(p, se, race === 'tauren' ? 1.3 : 1.1, race === 'orc', ac);
      tabard(p, pr, ac);
      if (race === 'orc' || race === 'tauren') axe(p.handR, '#a0a8b0', race === 'tauren' ? 1.3 : 1, race === 'tauren');
      else { sword(p.handR); shield(p.handL, pr, ac, ac); }
      if (race === 'human') helm(p, se, 'dome');
      if (race === 'dwarf') helm(p, se, 'horned');
      break;
    case 'paladin':
      pauldrons(p, se, 1.2, false, '#fff2a8');
      tabard(p, pr, se);
      hammer(p.handR, '#c9ccd4', 1, '#ffe48a');
      shield(p.handL, se, '#fff2a8', '#ffe48a');
      if (race === 'human') helm(p, se, 'dome');
      break;
    case 'crusader':
      pauldrons(p, se, 1.35, false, '#fff2a8');
      tabard(p, pr, ac);
      cape(p, ac);
      sword(p.handR, '#ffffff', 0.85, se, '#ffe48a');
      shield(p.handL, pr, se, ac);
      helm(p, '#e8e3d0', 'dome');
      break;
    case 'hunter':
      pauldrons(p, se, 0.8);
      bow(p.handL, '#5a3a2a', ac);
      cape(p, se);
      break;
    case 'rifle':
      pauldrons(p, se, 0.9);
      rifle(p.handR);
      break;
    case 'spear':
      spear(p.handR);
      put(p.torso, mesh(G.box(0.4, 0.04, 0.3), mat('#7a5230')), 0, p.tH * 0.5, 0.05, 0, 0, 0.6);
      break;
    case 'priest':
      robe(p, pr, ac);
      staff(p.handR, '#e8e3d0', ac, 'orb');
      helm(p, pr, 'hood');
      break;
    case 'mage':
      robe(p, pr, se);
      staff(p.handR, '#6b4a2a', ac, 'orb');
      helm(p, pr, race === 'gnome' ? 'goggles' : 'wizard', ac);
      break;
    case 'archmage':
      robe(p, pr, se, 1.05);
      pauldrons(p, se, 0.9, false, ac);
      cape(p, pr);
      staff(p.handR, '#3a2a4a', ac, 'orb');
      helm(p, pr, 'wizard', ac);
      break;
    case 'warlock':
      robe(p, pr, ac);
      staff(p.handR, '#2a1a2a', ac, 'skull');
      if (race === 'gnome') helm(p, pr, 'goggles'); else helm(p, pr, 'hood');
      pauldrons(p, se, 0.8, true);
      break;
    case 'shaman':
      pauldrons(p, se, 1.0, false, ac);
      staff(p.handR, '#6b4a2a', ac, 'totem');
      put(p.torso, mesh(G.tor(0.18, 0.03, 4, 10), mat('#e8dcc0')), 0, p.tH * 0.75, 0.08, 1.3, 0, 0);
      break;
    case 'druid':
      robe(p, se, null, 0.6);
      staff(p.handR, '#6b4a2a', ac, 'leaf');
      helm(p, se, 'antlers');
      break;
    case 'archdruid':
      robe(p, pr, se, 0.7);
      pauldrons(p, se, 1.1, false, ac);
      staff(p.handR, '#e8e8f0', ac, 'moon');
      helm(p, pr, 'antlers');
      cape(p, pr);
      break;
    case 'rogue':
      helm(p, pr, 'hood');
      dagger(p.handR, '#d8dde6', race === 'elf' ? ac : null);
      dagger(p.handL, '#d8dde6', race === 'elf' ? ac : null);
      break;
    case 'blademaster': {
      helm(p, '#c9a050', 'conical');
      const s = sword(p.handR, '#e8e8f0', 0.9, '#2a2a2a');
      s.rotation.z = 0.1;
      put(p.torso, mesh(G.box(0.5, 0.06, 0.06), mat(pr)), 0, 0.05, 0.12);
      break;
    }
    case 'champion':
      pauldrons(p, se, 1.45, true, ac);
      tabard(p, pr, ac);
      axe(p.handR, '#b0b8c0', 1.2, true);
      axe(p.handL, '#b0b8c0', 1.0);
      helm(p, se, 'horned');
      break;
    case 'deathknight':
      pauldrons(p, pr, 1.25, true, se);
      tabard(p, pr, ac);
      sword(p.handR, '#bfe8ff', 0.85, '#3a4a5a', ac);
      helm(p, pr, 'dome');
      break;
    case 'deathlord':
      pauldrons(p, pr, 1.4, true, se);
      tabard(p, pr, ac);
      cape(p, '#1a1a2a');
      sword(p.handR, '#bfe8ff', 1.0, '#3a4a5a', ac);
      helm(p, se, 'crown');
      break;
    case 'lichking':
      pauldrons(p, pr, 1.6, true, se);
      tabard(p, pr, ac);
      cape(p, '#10151f');
      sword(p.handR, '#bfe8ff', 1.1, '#3a4a5a', ac);
      helm(p, se, 'lich');
      break;
    case 'darkranger':
      helm(p, pr, 'hood');
      bow(p.handL, '#2a1a2a', ac);
      cape(p, se);
      pauldrons(p, '#3a2a4a', 0.8, true);
      break;
    case 'warglaive':
      glaive(p.handR, ac);
      glaive(p.handL, ac);
      break;
    case 'warchief':
      pauldrons(p, '#2a2a2a', 1.4, true, ac);
      hammer(p.handR, '#5a5a6a', 1.5, ac);
      cape(p, '#2a2a2a');
      put(p.torso, mesh(G.box(0.4, 0.25, 0.05), mat(pr)), 0, p.tH * 0.6, 0.2);
      break;
    case 'mountainking':
      pauldrons(p, se, 1.3, false, ac);
      tabard(p, pr, se);
      hammer(p.handR, '#9aa3ad', 1.3, ac);
      helm(p, se, 'horned');
      break;
    case 'moonpriestess':
      robe(p, pr, se, 1.1);
      pauldrons(p, se, 0.9, false, ac);
      staff(p.handR, '#e8e8f0', ac, 'moon');
      break;
    default:
      break;
  }
}

// ═══════════════════════ Creatures ═══════════════════════
function quadruped(o, kind) {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const parts = { body, quad: true };
  const pr = mat(o.primary);
  const se = mat(o.secondary);
  const molten = o.molten;
  const legH = kind === 'raptor' ? 0.5 : 0.38;
  if (kind === 'raptor') {
    // bipedal dinosaur
    const torso = pivot(body, 0, legH + 0.05, 0);
    parts.torso = torso;
    put(torso, mesh(G.sph(0.28, 7), pr), 0, 0.1, 0, 0, 0, 0, [0.9, 0.85, 1.5]);
    put(torso, mesh(G.cone(0.13, 0.7, 5), pr), 0, 0.15, -0.6, -Math.PI / 2 - 0.2, 0, 0);
    const head = pivot(torso, 0, 0.35, 0.4);
    parts.head = head;
    put(head, mesh(G.box(0.2, 0.2, 0.45), pr), 0, 0, 0.12);
    put(head, mesh(G.box(0.16, 0.06, 0.35), mat('#f0e8d0')), 0, -0.1, 0.15);
    for (const s of [-1, 1]) put(head, mesh(G.sph(0.03, 4), glow('#ffd23a', 3)), s * 0.1, 0.05, 0.22);
    for (let i = 0; i < 4; i++) put(torso, mesh(G.cone(0.04, 0.18, 4), mat(o.accent)), 0, 0.33 - i * 0.02, 0.15 - i * 0.18);
    for (const s of [-1, 1]) {
      const leg = pivot(body, s * 0.17, legH + 0.05, 0);
      put(leg, mesh(G.cyl(0.08, 0.04, legH), pr), 0, -legH / 2, 0);
      put(leg, mesh(G.box(0.12, 0.05, 0.2), se), 0, -legH, 0.06);
      parts[s < 0 ? 'legL' : 'legR'] = leg;
      const arm = pivot(torso, s * 0.18, 0.05, 0.3);
      put(arm, mesh(G.cyl(0.03, 0.02, 0.2), pr), 0, -0.1, 0.05);
      parts[s < 0 ? 'armL' : 'armR'] = arm;
    }
    return { root, parts };
  }
  if (kind === 'spider') {
    const torso = pivot(body, 0, 0.32, 0);
    parts.torso = torso;
    put(torso, mesh(G.sph(0.3, 8), pr), 0, 0.05, -0.3, 0, 0, 0, [1, 0.8, 1.2]);
    put(torso, mesh(G.sph(0.18, 7), se), 0, 0, 0.12);
    for (let i = 0; i < 4; i++) put(torso, mesh(G.sph(0.035, 4), glow(o.accent, 3)), (i - 1.5) * 0.06, 0.08, 0.28);
    put(torso, mesh(G.box(0.18, 0.04, 0.1), mat(o.accent)), 0, 0.1, -0.42, 0, 0, 0);
    parts.head = torso;
    parts.spiderLegs = [];
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const leg = pivot(torso, s * 0.15, 0, 0.05 - i * 0.1);
      leg.rotation.y = s * (0.6 - i * 0.4);
      put(leg, mesh(G.cyl(0.025, 0.02, 0.45), se), s * 0.2, 0.12, 0, 0, 0, s * 1.0);
      put(leg, mesh(G.cyl(0.02, 0.01, 0.45), se), s * 0.42, -0.1, 0, 0, 0, -s * 0.4);
      parts.spiderLegs.push(leg);
    }
    return { root, parts };
  }
  // wolf / hound
  const torso = pivot(body, 0, legH + 0.12, 0);
  parts.torso = torso;
  put(torso, mesh(G.box(0.34, 0.3, 0.75), pr), 0, 0.05, 0);
  put(torso, mesh(G.box(0.36, 0.34, 0.3), se), 0, 0.1, 0.25);
  const heads = molten ? [-0.14, 0.14] : [0];
  for (const hx of heads) {
    const head = pivot(torso, hx, 0.22, 0.45);
    parts.head = parts.head || head;
    put(head, mesh(G.box(0.22, 0.22, 0.24), pr), 0, 0, 0);
    put(head, mesh(G.box(0.14, 0.12, 0.22), se), 0, -0.04, 0.18);
    for (const s of [-1, 1]) {
      put(head, mesh(G.cone(0.05, 0.14, 4), pr), s * 0.07, 0.15, -0.03);
      put(head, mesh(G.sph(0.025, 4), glow(o.accent, 3)), s * 0.07, 0.04, 0.12);
    }
  }
  put(torso, mesh(G.cone(0.06, 0.4, 4), molten ? glow('#ff5a1a', 2) : pr), 0, 0.1, -0.5, -Math.PI / 2 + 0.5, 0, 0);
  if (molten) for (let i = 0; i < 5; i++) put(torso, mesh(G.cone(0.05, 0.16, 4), glow(o.secondary, 2)), 0, 0.22, 0.3 - i * 0.15);
  const legPos = [[-0.13, 0.27], [0.13, 0.27], [-0.13, -0.27], [0.13, -0.27]];
  parts.quadLegs = [];
  for (const [x, z] of legPos) {
    const leg = pivot(body, x, legH + 0.05, z);
    put(leg, mesh(G.cyl(0.05, 0.04, legH), pr), 0, -legH / 2, 0);
    parts.quadLegs.push(leg);
  }
  return { root, parts };
}

function dragon(o, small) {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const parts = { body, quad: true, flying: true };
  const pr = o.bone ? mat('#e8e0d0') : mat(o.primary);
  const se = mat(o.secondary);
  const torso = pivot(body, 0, small ? 0.6 : 0.75, 0);
  parts.torso = torso;
  put(torso, mesh(G.sph(0.3, 8), pr), 0, 0, 0, 0, 0, 0, [0.9, 0.85, 1.4]);
  put(torso, mesh(G.sph(0.22, 6), se), 0, -0.08, 0.1, 0, 0, 0, [0.9, 0.7, 1.3]);
  const neck = pivot(torso, 0, 0.1, 0.35);
  put(neck, mesh(G.cyl(0.08, 0.12, 0.4), pr), 0, 0.15, 0.05, 0.5, 0, 0);
  const head = pivot(neck, 0, 0.35, 0.2);
  parts.head = head;
  put(head, mesh(G.box(0.2, 0.18, 0.35), pr), 0, 0, 0.08);
  put(head, mesh(G.box(0.16, 0.06, 0.25), se), 0, -0.08, 0.15);
  for (const s of [-1, 1]) {
    put(head, mesh(G.cone(0.03, 0.22, 4), mat('#e8dcc0')), s * 0.07, 0.12, -0.08, -0.8, 0, 0);
    put(head, mesh(G.sph(0.028, 4), glow(o.accent, 4)), s * 0.08, 0.05, 0.15);
  }
  put(torso, mesh(G.cone(0.1, 0.7, 5), pr), 0, -0.05, -0.6, -Math.PI / 2 - 0.15, 0, 0);
  for (const s of [-1, 1]) {
    const wing = pivot(torso, s * 0.2, 0.15, 0);
    const wm = o.bone ? mat('#7fc8ff', { opacity: 0.55 }) : mat(o.secondary);
    put(wing, mesh(G.box(0.8, 0.03, 0.5), wm), s * 0.42, 0.1, -0.05, 0, 0, s * 0.3);
    put(wing, mesh(G.cyl(0.02, 0.03, 0.85), pr), s * 0.42, 0.15, 0.2, 0, 0, Math.PI / 2 + s * 0.3);
    parts[s < 0 ? 'wingL' : 'wingR'] = wing;
    for (const z of [0.2, -0.2]) {
      const leg = pivot(torso, s * 0.15, -0.15, z);
      put(leg, mesh(G.cyl(0.05, 0.03, 0.3), pr), 0, -0.15, 0);
    }
  }
  if (o.bone) for (let i = 0; i < 4; i++) put(torso, mesh(G.box(0.5, 0.03, 0.03), mat('#e8e0d0')), 0, 0.02, 0.2 - i * 0.12);
  return { root, parts };
}

function creature(kind, o) {
  switch (kind) {
    case 'wolf': case 'raptor': case 'spider': return quadruped(o, kind);
    case 'whelp': return dragon(o, true);
    case 'dragonkin': return dragon(o, false);
    default: break;
  }
  // humanoid-ish creatures
  const pr = mat(o.primary);
  const se = mat(o.secondary);
  let rig;
  if (kind === 'murloc') {
    rig = humanoid('gnome', { ...o, skin: o.primary, secondary: o.primary, primary: o.secondary, sleeve: o.primary, boots: o.primary });
    const p = rig.parts;
    p.head.children.forEach(c => { c.visible = false; });
    const hs = 0.22;
    put(p.head, mesh(G.sph(hs, 8), pr), 0, 0.1, 0.02, 0, 0, 0, [1, 1, 1.15]);
    put(p.head, mesh(G.box(hs * 1.4, hs * 0.35, hs * 0.6), mat('#c94a4a')), 0, 0.02, hs * 0.85);
    for (const s of [-1, 1]) {
      put(p.head, mesh(G.sph(0.06, 6), mat('#ffffff')), s * 0.12, 0.22, 0.12);
      put(p.head, mesh(G.sph(0.03, 4), mat('#0a0a0a')), s * 0.13, 0.23, 0.17);
      put(p.head, mesh(G.cone(0.05, 0.25, 4), mat(o.accent)), s * 0.24, 0.12, -0.03, 0, 0, -s * 1.2);
    }
    for (let i = 0; i < 3; i++) put(p.head, mesh(G.cone(0.05, 0.2, 4), mat(o.accent)), 0, 0.3 - i * 0.05, -0.05 - i * 0.08, -0.6, 0, 0);
    if (o.staff) staff(p.handR, '#6b4a2a', '#7fd8ff', 'totem'); else spear(p.handR, '#e8dcc0');
  } else if (kind === 'kobold') {
    rig = humanoid('gnome', { ...o, skin: o.primary, primary: '#6b5a3a', secondary: '#4a3a2a' });
    const p = rig.parts;
    put(p.head, mesh(G.box(0.15, 0.13, 0.28), pr), 0, 0.15, 0.2);
    for (const s of [-1, 1]) put(p.head, mesh(G.cone(0.08, 0.2, 4), pr), s * 0.18, 0.35, 0, 0, 0, -s * 0.4);
    put(p.head, mesh(G.cyl(0.04, 0.04, 0.12), mat('#f0e8c0')), 0, 0.48, 0);
    put(p.head, mesh(G.sph(0.035, 4), glow('#ffcc33', 4)), 0, 0.58, 0);
    put(p.head, mesh(G.cyl(0.18, 0.2, 0.08, 7), mat('#c9a050')), 0, 0.36, 0);
    put(p.handR, mesh(G.box(0.05, 0.35, 0.05), mat('#5a3a1f')), 0, 0, 0.15, Math.PI / 2, 0, 0);
    put(p.handR, mesh(G.box(0.2, 0.06, 0.06), metal('#7a7a7a')), 0, 0, 0.32);
  } else if (kind === 'gnoll' || kind === 'worgen') {
    const scale = kind === 'worgen' ? 1.15 : 1.0;
    rig = humanoid('orc', { ...o, skin: o.primary, primary: kind === 'worgen' ? '#3a2a20' : '#6b4a2a', secondary: o.secondary, sleeve: o.primary });
    const p = rig.parts;
    p.head.children.forEach(c => { c.visible = false; });
    p.torso.rotation.x = 0.35;
    put(p.head, mesh(G.box(0.3, 0.28, 0.3), pr), 0, 0.12, 0);
    put(p.head, mesh(G.box(0.16, 0.14, 0.3), se), 0, 0.06, 0.25);
    put(p.head, mesh(G.sph(0.04, 4), mat('#1a1a1a')), 0, 0.12, 0.4);
    for (const s of [-1, 1]) {
      put(p.head, mesh(G.cone(0.07, 0.2, 4), pr), s * 0.11, 0.33, -0.03);
      put(p.head, mesh(G.sph(0.03, 4), glow(o.accent, 3)), s * 0.08, 0.18, 0.15);
    }
    if (kind === 'gnoll') {
      for (let i = 0; i < 4; i++) put(p.head, mesh(G.cone(0.03, 0.15, 3), mat(o.accent)), 0, 0.3 - i * 0.04, -0.15 - i * 0.04, -1, 0, 0);
      axe(p.handR, '#7a7a7a', 0.9);
    } else {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) put(s < 0 ? p.handL : p.handR, mesh(G.cone(0.015, 0.12, 3), mat('#e8e8e8')), (i - 1) * 0.03, -0.08, 0.04, Math.PI, 0, 0);
    }
    rig.root.scale.setScalar(scale);
  } else if (kind === 'skeleton') {
    rig = humanoid('undead', { ...o, skin: o.primary, primary: '#c9c2af', secondary: '#c9c2af', sleeve: '#d9d2bf', boots: '#c9c2af' });
    const p = rig.parts;
    for (let i = 0; i < 4; i++) put(p.torso, mesh(G.tor(0.17, 0.018, 3, 8), mat(o.primary)), 0, 0.12 + i * 0.07, 0, Math.PI / 2, 0, 0);
    if (o.bow) bow(p.handL, '#3a2a2a', o.accent); else { sword(p.handR, '#9aa3ad', 0.55); shield(p.handL, '#5a4a3a', '#7a7a7a'); }
  } else if (kind === 'ghoul') {
    rig = humanoid('undead', { ...o, skin: o.primary, primary: o.primary, secondary: o.secondary, sleeve: o.primary });
    const p = rig.parts;
    p.torso.rotation.x = 0.55;
    for (const hand of [p.handL, p.handR]) for (let i = 0; i < 3; i++) put(hand, mesh(G.cone(0.02, 0.18, 3), mat('#e8e0c8')), (i - 1) * 0.04, -0.12, 0.02, Math.PI, 0, 0);
    put(p.torso, mesh(G.sph(0.08, 5), mat('#8a2a2a')), 0.1, 0.3, 0.18);
  } else if (kind === 'abomination') {
    rig = humanoid('tauren', { ...o, skin: o.primary, primary: o.primary, secondary: o.secondary, sleeve: o.primary });
    const p = rig.parts;
    p.head.children.forEach(c => { c.visible = false; });
    put(p.head, mesh(G.sph(0.14, 6), pr), 0, 0.05, 0.1);
    put(p.torso, mesh(G.sph(0.5, 8), pr), 0, 0.3, 0.1, 0, 0, 0, [1, 0.9, 0.9]);
    for (let i = 0; i < 4; i++) put(p.torso, mesh(G.box(0.02, 0.25, 0.02), mat('#3a2a2a')), -0.2 + i * 0.12, 0.3, 0.55);
    put(p.torso, mesh(G.sph(0.12, 6), glow(o.accent, 1.5)), 0.2, 0.15, 0.5);
    axe(p.handR, '#7a7a7a', 1.0);
    put(p.handL, mesh(G.tor(0.08, 0.02, 4, 8, Math.PI * 1.4), metal('#7a7a7a')), 0, -0.1, 0.1);
  } else if (kind === 'elemental' || kind === 'firelord') {
    const root = new THREE.Group();
    const body = pivot(root, 0, 0, 0);
    const big = kind === 'firelord';
    const torso = pivot(body, 0, big ? 0.55 : 0.45, 0);
    const parts = { body, torso, floating: true };
    put(torso, mesh(G.cone(0.3, 0.9, 7), glow(o.primary, big ? 0.7 : 1.1)), 0, -0.2, 0, Math.PI, 0, 0);
    put(torso, mesh(G.ico(0.32, 0), big ? mat('#3a2a2a') : glow(o.secondary, 1.2)), 0, 0.35, 0);
    const head = pivot(torso, 0, big ? 0.85 : 0.75, 0);
    parts.head = head;
    put(head, mesh(G.ico(0.18, 0), big ? mat('#2a1a1a') : glow(o.secondary, 1.5)), 0, 0, 0);
    for (const s of [-1, 1]) put(head, mesh(G.sph(0.035, 4), glow('#fff2a8', 5)), s * 0.07, 0.03, 0.15);
    for (let i = 0; i < 5; i++) put(head, mesh(G.cone(0.08, 0.35, 4), glow(o.primary, 1.2)), Math.sin(i * 1.3) * 0.08, 0.2, Math.cos(i * 1.3) * 0.08 - 0.05, -0.3, 0, (i - 2) * 0.2);
    for (const s of [-1, 1]) {
      const arm = pivot(torso, s * 0.4, 0.45, 0);
      put(arm, mesh(G.ico(0.13, 0), big ? mat('#3a2a2a') : glow(o.secondary, 1)), 0, -0.1, 0);
      put(arm, mesh(G.cone(0.1, 0.35, 5), glow(o.primary, 1.0)), 0, -0.35, 0, Math.PI, 0, 0);
      const hand = pivot(arm, 0, -0.5, 0);
      parts[s < 0 ? 'armL' : 'armR'] = arm;
      parts[s < 0 ? 'handL' : 'handR'] = hand;
    }
    if (big) {
      hammer(parts.handR, '#3a2a2a', 1.6, '#ff7a2a');
      for (let i = 0; i < 6; i++) put(torso, mesh(G.box(0.08, 0.08, 0.08), glow('#ffcc33', 1.5)), Math.sin(i) * 0.3, 0.1 + i * 0.1, Math.cos(i) * 0.3);
    }
    return { root, parts };
  }
  return rig;
}

// ═══════════════════════ Public builders ═══════════════════════
const CREATURES = new Set(['murloc', 'kobold', 'gnoll', 'worgen', 'wolf', 'spider', 'skeleton', 'ghoul', 'raptor', 'elemental', 'firelord', 'whelp', 'abomination', 'dragonkin']);

export function buildUnitModel(def) {
  const o = def.model;
  let rig;
  if (CREATURES.has(o.body)) rig = creature(o.body, o);
  else if (o.body === 'keeper') rig = keeper(o);
  else {
    const helmGears = ['crusader', 'deathknight', 'deathlord', 'lichking', 'priest', 'mage', 'archmage', 'warlock', 'rogue', 'darkranger', 'blademaster', 'champion', 'mountainking'];
    rig = humanoid(o.body, { ...o, helm: helmGears.includes(o.gear) || (o.gear === 'warrior' && ['human', 'dwarf'].includes(o.body)) || (o.gear === 'paladin' && o.body === 'human') });
    applyGear(o.gear, rig.parts, o, o.body);
  }
  const container = new THREE.Group();
  container.add(rig.root);
  const s = (o.scale || 1) * (def.boss ? 1 : 1);
  rig.root.scale.multiplyScalar(s);
  container.userData.parts = rig.parts;
  container.userData.baseScale = s;
  const box = new THREE.Box3().setFromObject(container);
  container.userData.height = box.max.y;
  return container;
}

function keeper(o) {
  // Keeper of the Grove: stag-bodied with an elven upper torso.
  const lower = quadruped({ primary: '#6b4a2a', secondary: '#8a6a4a', accent: '#c2ff7a' }, 'wolf');
  const p = lower.parts;
  p.head.visible = false;
  const up = humanoid('elf', { ...o, skin: '#7a9a5a', primary: o.primary, secondary: o.primary, hair: '#3a6a2a' });
  up.parts.legL.visible = false;
  up.parts.legR.visible = false;
  up.root.position.set(0, 0.25, 0.3);
  p.torso.add(up.root);
  helm(up.parts, o.primary, 'antlers');
  staff(up.parts.handR, '#6b4a2a', o.accent, 'leaf');
  Object.assign(p, { armL: up.parts.armL, armR: up.parts.armR, handR: up.parts.handR });
  return lower;
}

// ═══════════════════════ Animation ═══════════════════════
/**
 * Animate a model. state: { t, moving, attackT (0..1 or -1), castT, stunned, dead, deadT, spin }
 */
export function animateModel(model, st, dt) {
  const p = model.userData.parts;
  const t = st.t;
  const breathe = Math.sin(t * 2.2) * 0.02;
  if (p.torso && !p.quad) p.torso.scale.y = 1 + breathe;
  if (p.floating) {
    p.body.position.y = 0.1 + Math.sin(t * 2) * 0.06;
    p.torso.rotation.y = Math.sin(t * 0.8) * 0.2;
  }
  if (p.flying) {
    p.body.position.y = 0.15 + Math.sin(t * 3) * 0.06;
    const flap = Math.sin(t * (st.moving ? 14 : 7)) * 0.5;
    if (p.wingL) p.wingL.rotation.z = -flap;
    if (p.wingR) p.wingR.rotation.z = flap;
  }
  // Walk cycle
  const walk = st.moving ? Math.sin(t * 13) : 0;
  if (p.legL && !p.quad) { p.legL.rotation.x = walk * 0.6; p.legR.rotation.x = -walk * 0.6; }
  if (p.legL && p.quad) { p.legL.rotation.x = walk * 0.7; p.legR.rotation.x = -walk * 0.7; }
  if (p.quadLegs) p.quadLegs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? 1 : -1) * walk * 0.6; });
  if (p.spiderLegs) p.spiderLegs.forEach((l, i) => { l.rotation.x = Math.sin(t * 16 + i) * (st.moving ? 0.3 : 0.05); });
  if (p.body && !p.floating && !p.flying) p.body.position.y = st.moving ? Math.abs(walk) * 0.05 : 0;
  if (p.cape) p.cape.rotation.x = 0.12 + (st.moving ? 0.35 : Math.sin(t * 1.5) * 0.05);
  if (p.wingL && !p.flying) { p.wingL.rotation.y = Math.sin(t * 2) * 0.15; p.wingR.rotation.y = -Math.sin(t * 2) * 0.15; }

  // Arms: idle sway, attack swing, cast raise
  if (p.armR) {
    let rx = st.moving ? -walk * 0.5 : Math.sin(t * 2.2) * 0.05;
    let lx = st.moving ? walk * 0.5 : -Math.sin(t * 2.2) * 0.05;
    let rz = 0.12, lz = -0.12;
    if (st.attackT >= 0) {
      const a = st.attackT;
      const swing = a < 0.4 ? -(a / 0.4) * 2.2 : -2.2 + ((a - 0.4) / 0.6) * 3.0;
      rx = st.ranged ? -1.4 : swing;
      if (st.ranged) lx = -1.4;
    }
    if (st.castT >= 0) {
      const c = Math.sin(Math.min(1, st.castT) * Math.PI);
      rx = -2.6 * c; lx = -2.6 * c; rz = 0.4 * c; lz = -0.4 * c;
    }
    p.armR.rotation.x = rx; p.armR.rotation.z = rz;
    if (p.armL) { p.armL.rotation.x = lx; p.armL.rotation.z = lz; }
  }
  if (p.quad && p.head && st.attackT >= 0) {
    p.head.rotation.x = Math.sin(st.attackT * Math.PI) * 0.5;
    if (p.torso) p.torso.position.z = Math.sin(st.attackT * Math.PI) * 0.15;
  } else if (p.quad && p.head) p.head.rotation.x = Math.sin(t * 1.7) * 0.05;

  if (st.spin) model.children[0].rotation.y += dt * 18;
  else model.children[0].rotation.y = 0;

  if (st.stunned) model.children[0].rotation.z = Math.sin(t * 6) * 0.08;
  else model.children[0].rotation.z = 0;

  if (st.dead) {
    const d = Math.min(1, st.deadT / 0.6);
    model.children[0].rotation.x = -d * Math.PI / 2;
    model.children[0].position.y = -Math.max(0, st.deadT - 0.8) * 0.6;
  } else {
    model.children[0].rotation.x = 0;
    model.children[0].position.y = 0;
  }
}

// ═══════════════════════ Portraits ═══════════════════════
let portraitRenderer = null;
let portraitScene = null;
let portraitCam = null;
const portraitCache = new Map();

export function unitPortrait(id, def) {
  if (portraitCache.has(id)) return portraitCache.get(id);
  try {
    if (!portraitRenderer) {
      const canvas = document.createElement('canvas');
      canvas.width = 192; canvas.height = 192;
      portraitRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      portraitRenderer.setSize(192, 192, false);
      portraitRenderer.outputColorSpace = THREE.SRGBColorSpace;
      portraitRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      portraitRenderer.toneMappingExposure = 1.5;
      portraitScene = new THREE.Scene();
      portraitScene.add(new THREE.HemisphereLight('#fff4e0', '#6a5a7a', 2.2));
      const key = new THREE.DirectionalLight('#ffffff', 2.4);
      key.position.set(1.5, 2.5, 3);
      portraitScene.add(key);
      const rim = new THREE.DirectionalLight('#8fb8ff', 1.8);
      rim.position.set(-2, 1.5, -2);
      portraitScene.add(rim);
      portraitCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    }
    const model = buildUnitModel(def);
    const p = model.userData.parts;
    if (p.armR) { p.armR.rotation.x = -0.5; }
    const h = model.userData.height;
    const headY = p.quad || p.floating || p.flying ? h * 0.65 : h * 0.78;
    model.rotation.y = 0.45;
    portraitScene.add(model);
    const dist = Math.max(1.4, h * 1.25);
    portraitCam.position.set(0.25, headY + 0.1, dist);
    portraitCam.lookAt(0, headY - h * 0.12, 0);
    portraitRenderer.setClearColor(0x000000, 0);
    portraitRenderer.render(portraitScene, portraitCam);
    const url = portraitRenderer.domElement.toDataURL('image/png');
    portraitScene.remove(model);
    portraitCache.set(id, url);
    return url;
  } catch {
    return '';
  }
}
