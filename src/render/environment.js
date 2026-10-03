// Themed 3D environments for each zone: sky, fog, lighting, terrain,
// props and ambient particles.

import * as THREE from 'three';
import { mat } from './models.js';

function at(o, x, y, z) { o.position.set(x, y, z); o.castShadow = true; return o; }

export const ENVS = {
  forest: {
    skyTop: '#4f8fd0', skyBottom: '#f8e6b8', fog: '#cfe0d0', fogDensity: 0.012,
    ground: ['#5c8f3a', '#7aad48', '#4a7a2e'], hemiSky: '#fff4dc', hemiGround: '#4a6a2a', sun: '#fff1d0', sunI: 2.6,
    tileA: '#8a8a7a', tileB: '#a29a84', platform: '#6e6a5e', particles: { color: '#fff8b0', count: 120, rise: 0.15, size: 0.08 },
  },
  dusk: {
    skyTop: '#140d26', skyBottom: '#4a3060', fog: '#2a2240', fogDensity: 0.03,
    ground: ['#2a2a30', '#3a3440', '#1e2226'], hemiSky: '#b8a8e0', hemiGround: '#3a3050', sun: '#c8b8ff', sunI: 2.0,
    tileA: '#4a4654', tileB: '#5a5266', platform: '#34303c', particles: { color: '#b8ff7a', count: 90, rise: 0.05, size: 0.09, blink: true },
  },
  jungle: {
    skyTop: '#2f8a8a', skyBottom: '#d8f0b0', fog: '#8fbf8a', fogDensity: 0.02,
    ground: ['#3a6a2a', '#4f7a32', '#2a5a2a'], hemiSky: '#e8ffd0', hemiGround: '#2a4a1a', sun: '#fff0c0', sunI: 2.2,
    tileA: '#7a7a5a', tileB: '#8a8466', platform: '#5a5a40', particles: { color: '#e8ff8a', count: 100, rise: 0.08, size: 0.07, blink: true },
  },
  volcanic: {
    skyTop: '#1a0505', skyBottom: '#8a2a0a', fog: '#3a1208', fogDensity: 0.028,
    ground: ['#2a1a16', '#3a2018', '#1a1210'], hemiSky: '#ff9a6a', hemiGround: '#3a0a00', sun: '#ffb070', sunI: 1.6,
    tileA: '#4a3a34', tileB: '#5a443a', platform: '#2a1e1a', particles: { color: '#ff8a2a', count: 160, rise: 0.8, size: 0.07 },
  },
  frozen: {
    skyTop: '#2a4a7a', skyBottom: '#d8ecff', fog: '#c0d8f0', fogDensity: 0.022,
    ground: ['#e8f0f8', '#d0e0f0', '#f4f8ff'], hemiSky: '#e8f4ff', hemiGround: '#5a7a9a', sun: '#e0f0ff', sunI: 2.3,
    tileA: '#8a9aaa', tileB: '#a0b0c0', platform: '#5a6a7a', particles: { color: '#ffffff', count: 260, rise: -0.6, size: 0.08, drift: true },
  },
};

function noiseTexture(colors, size = 512, blotches = 900) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = colors[0];
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < blotches; i++) {
    g.globalAlpha = 0.08 + Math.random() * 0.15;
    g.fillStyle = colors[1 + Math.floor(Math.random() * (colors.length - 1))];
    const r = 4 + Math.random() * 30;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function stoneTexture(base, accent) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    g.globalAlpha = 0.05 + Math.random() * 0.12;
    g.fillStyle = Math.random() < 0.5 ? '#000000' : accent;
    g.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 14, 2 + Math.random() * 14);
  }
  g.globalAlpha = 0.25;
  g.strokeStyle = '#000';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    let x = Math.random() * size, y = Math.random() * size;
    g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyDome(top, bottom) {
  const geo = new THREE.SphereGeometry(120, 24, 12);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.8)),1.0); }',
  });
  return new THREE.Mesh(geo, m);
}

const rnd = (a, b) => a + Math.random() * (b - a);

// Positions on a ring around the arena where scenery can go.
function scatter(n, rMin, rMax, avoidFront = true) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rnd(rMin, rMax);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // keep the camera's view clear (camera sits at +z)
    if (avoidFront && z > 6 && Math.abs(x) < 12) { i--; continue; }
    out.push({ x, z, a });
  }
  return out;
}

function mesh(geo, m) { const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true; return x; }

function tree(kind) {
  const g = new THREE.Group();
  if (kind === 'oak') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.4, 6), mat('#5a3a20')), 0, 1.2, 0));
    const leaf = [mat('#3f7a2a'), mat('#4f8f32'), mat('#5fa03a')];
    for (let i = 0; i < 6; i++) {
      const s = mesh(new THREE.IcosahedronGeometry(rnd(0.9, 1.4), 0), leaf[i % 3]);
      s.position.set(rnd(-0.9, 0.9), rnd(2.4, 3.6), rnd(-0.9, 0.9));
      g.add(s);
    }
  } else if (kind === 'dead') {
    const bark = mat('#2a2228');
    g.add(at(mesh(new THREE.CylinderGeometry(0.15, 0.35, 3.2, 5), bark), 0, 1.6, 0));
    for (let i = 0; i < 5; i++) {
      const b = mesh(new THREE.CylinderGeometry(0.03, 0.1, rnd(1, 1.8), 4), bark);
      b.position.set(0, rnd(1.8, 3), 0);
      b.rotation.set(rnd(-1, 1), rnd(0, 6), rnd(0.6, 1.2) * (Math.random() < 0.5 ? -1 : 1));
      b.translateY(0.6);
      g.add(b);
    }
  } else if (kind === 'palm') {
    const trunk = mat('#7a5a3a');
    let y = 0, x = 0;
    const lean = rnd(-0.25, 0.25);
    for (let i = 0; i < 6; i++) {
      const s = mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 6), trunk);
      s.position.set(x, y + 0.3, 0); s.rotation.z = lean; g.add(s);
      y += 0.55; x -= lean * 0.55;
    }
    for (let i = 0; i < 7; i++) {
      const l = mesh(new THREE.ConeGeometry(0.3, 2.2, 4), mat(i % 2 ? '#2f7a2a' : '#3f8f32'));
      const a = (i / 7) * Math.PI * 2;
      l.position.set(x + Math.cos(a) * 0.8, y + 0.2, Math.sin(a) * 0.8);
      l.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3);
      l.scale.set(1, 1, 0.25);
      g.add(l);
    }
  } else if (kind === 'pine') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.2, 5), mat('#4a3020')), 0, 0.6, 0));
    for (let i = 0; i < 4; i++) {
      const c = mesh(new THREE.ConeGeometry(1.4 - i * 0.28, 1.4, 7), mat(i % 2 ? '#2f5a4a' : '#3a6a5a'));
      c.position.y = 1.3 + i * 0.8; g.add(c);
      const s = mesh(new THREE.ConeGeometry(1.0 - i * 0.22, 0.5, 7), mat('#f4f8ff'));
      s.position.y = 1.75 + i * 0.8; g.add(s);
    }
  }
  return g;
}

function rock(color, s = 1) {
  const r = mesh(new THREE.DodecahedronGeometry(rnd(0.4, 0.9) * s, 0), mat(color));
  r.scale.y = rnd(0.5, 0.9);
  r.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
  return r;
}

function addProps(group, env, updaters) {
  const lights = [];
  if (env === 'forest') {
    for (const p of scatter(26, 14, 34)) { const t = tree('oak'); t.position.set(p.x, 0, p.z); t.scale.setScalar(rnd(0.9, 1.5)); t.rotation.y = p.a; group.add(t); }
    for (const p of scatter(30, 11, 30, false)) { const r = rock('#8a8a7a'); r.position.set(p.x, 0.1, p.z); group.add(r); }
    for (const p of scatter(40, 10, 26, false)) {
      const f = mesh(new THREE.ConeGeometry(0.12, 0.3, 4), mat(['#ff6a8a', '#ffe06a', '#ffffff', '#8a6aff'][Math.floor(Math.random() * 4)], { emissive: '#ffffff', ei: 0.1 }));
      f.position.set(p.x, 0.15, p.z); group.add(f);
    }
    // fence & farmhouse in the distance
    const house = new THREE.Group();
    house.add(at(mesh(new THREE.BoxGeometry(4, 2.5, 3), mat('#e8dcc0')), 0, 1.25, 0));
    const roof = mesh(new THREE.ConeGeometry(3.2, 1.8, 4), mat('#a83a2a'));
    roof.position.y = 3.4; roof.rotation.y = Math.PI / 4; house.add(roof);
    house.add(at(mesh(new THREE.BoxGeometry(0.8, 1.4, 0.1), mat('#5a3a20')), 0, 0.7, 1.51));
    house.position.set(-16, 0, -18); house.rotation.y = 0.5; group.add(house);
    const mill = new THREE.Group();
    mill.add(at(mesh(new THREE.CylinderGeometry(1, 1.5, 6, 8), mat('#d8c8a8')), 0, 3, 0));
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i++) { const b = mesh(new THREE.BoxGeometry(0.4, 3.2, 0.05), mat('#6a4a2a')); b.position.y = 1.6; const h = new THREE.Group(); h.rotation.z = (i * Math.PI) / 2; h.add(b); blades.add(h); }
    blades.position.set(0, 5.2, 1.2); mill.add(blades); mill.position.set(18, 0, -20); group.add(mill);
    updaters.push(dt => { blades.rotation.z += dt * 0.6; });
  } else if (env === 'dusk') {
    for (const p of scatter(30, 13, 32)) { const t = tree('dead'); t.position.set(p.x, 0, p.z); t.scale.setScalar(rnd(1, 1.7)); t.rotation.y = p.a; group.add(t); }
    for (const p of scatter(22, 11, 22, false)) {
      const gs = mesh(new THREE.BoxGeometry(0.6, 0.9, 0.18), mat('#5a5a66'));
      gs.position.set(p.x, 0.4, p.z); gs.rotation.set(rnd(-0.15, 0.15), rnd(-0.4, 0.4), rnd(-0.15, 0.15)); group.add(gs);
    }
    for (const p of scatter(7, 11, 16)) {
      const post = new THREE.Group();
      post.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5), mat('#2a2228')), 0, 1.1, 0));
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), mat('#ffcc66', { emissive: '#ffaa33', ei: 4 }));
      lamp.position.y = 2.25; post.add(lamp);
      post.position.set(p.x, 0, p.z); group.add(post);
      const l = new THREE.PointLight('#ffaa44', 6, 9, 1.6); l.position.set(p.x, 2.3, p.z); group.add(l); lights.push(l);
    }
    const crypt = new THREE.Group();
    crypt.add(at(mesh(new THREE.BoxGeometry(5, 3, 4), mat('#3a3844')), 0, 1.5, 0));
    const cr = mesh(new THREE.ConeGeometry(3.6, 2, 4), mat('#2a2830')); cr.position.y = 4; cr.rotation.y = Math.PI / 4; crypt.add(cr);
    crypt.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), mat('#7fff9a', { emissive: '#3aff7a', ei: 1.5 })), 0, 1, 2.01));
    crypt.position.set(0, 0, -22); group.add(crypt);
  } else if (env === 'jungle') {
    for (const p of scatter(34, 12, 32)) { const t = tree('palm'); t.position.set(p.x, 0, p.z); t.scale.setScalar(rnd(1, 1.6)); t.rotation.y = p.a; group.add(t); }
    for (const p of scatter(40, 10, 24, false)) {
      const f = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const l = mesh(new THREE.ConeGeometry(0.2, 1.1, 3), mat('#2f8a3a'));
        l.position.y = 0.4; l.rotation.set(rnd(-1, 1), (i / 5) * 6.28, rnd(0.5, 1)); l.scale.z = 0.3; f.add(l);
      }
      f.position.set(p.x, 0, p.z); group.add(f);
    }
    for (const p of scatter(8, 12, 20)) {
      const pillar = new THREE.Group();
      const h = rnd(2, 5);
      pillar.add(at(mesh(new THREE.BoxGeometry(1, h, 1), mat('#8a8a6a')), 0, h / 2, 0));
      pillar.add(at(mesh(new THREE.BoxGeometry(1.3, 0.4, 1.3), mat('#7a7a5a')), 0, h, 0));
      pillar.add(at(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), mat('#3aff9a', { emissive: '#3affaa', ei: 1 })), 0, h * 0.6, 0.52));
      pillar.position.set(p.x, 0, p.z); pillar.rotation.set(rnd(-0.1, 0.1), rnd(0, 3), rnd(-0.15, 0.15)); group.add(pillar);
    }
    // ziggurat
    const zig = new THREE.Group();
    for (let i = 0; i < 5; i++) zig.add(at(mesh(new THREE.BoxGeometry(10 - i * 1.8, 1.4, 10 - i * 1.8), mat(i % 2 ? '#8a8466' : '#7a7458')), 0, 0.7 + i * 1.4, 0));
    zig.position.set(10, 0, -26); group.add(zig);
  } else if (env === 'volcanic') {
    for (const p of scatter(26, 12, 32)) {
      const s = mesh(new THREE.ConeGeometry(rnd(0.6, 1.6), rnd(3, 8), 5), mat('#1e1614'));
      s.position.set(p.x, 1.5, p.z); s.rotation.set(rnd(-0.1, 0.1), rnd(0, 3), rnd(-0.1, 0.1)); group.add(s);
    }
    const lavaMat = new THREE.MeshStandardMaterial({ color: '#ff5a0a', emissive: '#ff4a00', emissiveIntensity: 2.2, roughness: 0.6 });
    for (const p of scatter(9, 12, 26)) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(rnd(1.5, 3.5), 10), lavaMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(p.x, 0.03, p.z); group.add(pool);
      const l = new THREE.PointLight('#ff6a1a', 10, 12, 1.5); l.position.set(p.x, 1.2, p.z); group.add(l); lights.push(l);
    }
    // lava river behind
    const river = new THREE.Mesh(new THREE.PlaneGeometry(80, 5), lavaMat);
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0.03, -15); group.add(river);
    updaters.push((dt, t) => { lavaMat.emissiveIntensity = 2 + Math.sin(t * 1.5) * 0.4; });
    for (const p of scatter(16, 10, 22, false)) { const r = rock('#2a1e1a'); r.position.set(p.x, 0.1, p.z); group.add(r); }
  } else if (env === 'frozen') {
    for (const p of scatter(30, 13, 32)) { const t = tree('pine'); t.position.set(p.x, 0, p.z); t.scale.setScalar(rnd(1, 1.6)); group.add(t); }
    const iceMat = new THREE.MeshStandardMaterial({ color: '#9ed8ff', emissive: '#4ab0ff', emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85, flatShading: true });
    for (const p of scatter(18, 11, 22, false)) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(rnd(0.4, 1.0)), iceMat);
      c.scale.y = rnd(1.5, 3); c.position.set(p.x, 0.6, p.z); c.rotation.set(rnd(-0.3, 0.3), rnd(0, 3), rnd(-0.3, 0.3)); c.castShadow = true; group.add(c);
    }
    // the citadel
    const cit = new THREE.Group();
    const dark = mat('#2a3444');
    cit.add(at(mesh(new THREE.CylinderGeometry(4, 6, 10, 6), dark), 0, 5, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const sp = mesh(new THREE.ConeGeometry(1.2, rnd(12, 20), 5), dark);
      sp.position.set(Math.cos(a) * 5, 7, Math.sin(a) * 5); cit.add(sp);
    }
    const spire = mesh(new THREE.ConeGeometry(1.6, 26, 6), dark); spire.position.y = 16; cit.add(spire);
    cit.add(at(new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshStandardMaterial({ color: '#6fe0ff', emissive: '#6fe0ff', emissiveIntensity: 3 })), 0, 29.5, 0));
    cit.position.set(-6, 0, -48); group.add(cit);
  }
  return lights;
}

function makeParticles(spec) {
  const n = spec.count;
  const pos = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd(-20, 20);
    pos[i * 3 + 1] = rnd(0, 10);
    pos[i * 3 + 2] = rnd(-20, 14);
    seeds[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: spec.color, size: spec.size, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m);
  const update = (dt, t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      a[i * 3 + 1] += spec.rise * dt * (0.5 + (seeds[i] % 1));
      a[i * 3] += Math.sin(t * 0.7 + seeds[i]) * dt * (spec.drift ? 0.6 : 0.25);
      a[i * 3 + 2] += Math.cos(t * 0.5 + seeds[i]) * dt * 0.2;
      if (a[i * 3 + 1] > 10) a[i * 3 + 1] = 0;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 10;
    }
    geo.attributes.position.needsUpdate = true;
    if (spec.blink) m.opacity = 0.6 + Math.sin(t * 3) * 0.3;
  };
  return { pts, update };
}

export function buildEnvironment(scene, envId) {
  const E = ENVS[envId] || ENVS.forest;
  const group = new THREE.Group();
  const updaters = [];

  scene.background = new THREE.Color(E.skyBottom);
  scene.fog = new THREE.FogExp2(E.fog, E.fogDensity);
  group.add(skyDome(E.skyTop, E.skyBottom));

  const hemi = new THREE.HemisphereLight(E.hemiSky, E.hemiGround, 1.3);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(E.sun, E.sunI);
  sun.position.set(-8, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 50;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  group.add(sun);
  const fill = new THREE.DirectionalLight('#9ab8ff', 0.5);
  fill.position.set(8, 6, -10);
  group.add(fill);

  // terrain
  const gtex = noiseTexture(E.ground);
  gtex.repeat.set(10, 10);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshStandardMaterial({ map: gtex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  // gentle hills
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(rnd(8, 14), 10, 6), new THREE.MeshStandardMaterial({ map: gtex, roughness: 1, flatShading: true }));
    hill.position.set(Math.cos(a) * rnd(42, 55), -rnd(3, 6), Math.sin(a) * rnd(42, 55));
    hill.scale.y = rnd(0.5, 0.9);
    group.add(hill);
  }

  const lights = addProps(group, envId, updaters);
  const parts = makeParticles(E.particles);
  group.add(parts.pts);
  updaters.push(parts.update);

  scene.add(group);
  return {
    group, env: E, lights,
    update(dt, t) { for (const u of updaters) u(dt, t); },
    dispose() { scene.remove(group); },
  };
}
