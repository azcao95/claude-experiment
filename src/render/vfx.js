// Spell & combat visual effects. Each effect is an object with
// update(dt) -> boolean (false when finished) and an Object3D in the scene.

import * as THREE from 'three';

const add = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

export class VFX {
  constructor(scene, resolvePos) {
    this.scene = scene;
    this.resolve = resolvePos; // (unit|{c,r}) => Vector3
    this.list = [];
  }

  clear() {
    for (const e of this.list) this.scene.remove(e.obj);
    this.list = [];
  }

  update(dt) {
    // Effects may spawn new effects while updating (e.g. projectile trails),
    // so start a fresh list for those and merge it after the pass.
    const current = this.list;
    this.list = [];
    const kept = current.filter(e => {
      e.t += dt;
      const alive = e.update(dt, e.t) !== false && e.t < e.dur + (e.tail || 0);
      if (!alive) {
        this.scene.remove(e.obj);
        e.obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose && !o.material.shared) o.material.dispose(); });
      }
      return alive;
    });
    this.list = kept.concat(this.list);
  }

  push(obj, dur, update) {
    this.scene.add(obj);
    const e = { obj, dur, t: 0, update };
    this.list.push(e);
    return e;
  }

  // ─────────── Particles ───────────
  sparks(at, color, n = 10, speed = 3, size = 0.07, life = 0.6, up = 2) {
    const g = new THREE.Group();
    const p = this.resolve(at).clone();
    const m = add(color, 1);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), m);
      s.position.copy(p).add(new THREE.Vector3(0, 0.6, 0));
      const v = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * up + 0.5, (Math.random() - 0.5) * speed);
      parts.push({ s, v });
      g.add(s);
    }
    this.push(g, life, (dt, t) => {
      for (const q of parts) {
        q.v.y -= 6 * dt;
        q.s.position.addScaledVector(q.v, dt);
        q.s.rotation.x += dt * 8;
      }
      m.opacity = Math.max(0, 1 - t / life);
    });
  }

  rising(at, color, n = 12, radius = 0.5, life = 1.0, size = 0.06) {
    const g = new THREE.Group();
    const base = this.resolve(at).clone();
    const m = add(color, 1);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(size), m);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      s.position.set(base.x + Math.cos(a) * r, base.y + Math.random() * 0.4, base.z + Math.sin(a) * r);
      parts.push({ s, v: 0.8 + Math.random() * 1.5, a, r });
      g.add(s);
    }
    this.push(g, life, (dt, t) => {
      for (const q of parts) {
        q.s.position.y += q.v * dt;
        q.a += dt * 2;
        q.s.position.x = base.x + Math.cos(q.a) * q.r;
        q.s.position.z = base.z + Math.sin(q.a) * q.r;
      }
      m.opacity = Math.max(0, 1 - t / life);
    });
  }

  // ─────────── Projectiles ───────────
  projectile(src, tgt, dur, kind = 'orb', color = '#ffffff', big = false, launchDelay = 0) {
    const from = this.resolve(src).clone().add(new THREE.Vector3(0, 0.8, 0));
    let obj;
    const scale = big ? 1.6 : 1;
    switch (kind) {
      case 'arrow': {
        obj = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), new THREE.MeshBasicMaterial({ color: '#d8c8a8' }));
        shaft.rotation.x = Math.PI / 2;
        obj.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), add(color, 1));
        tip.rotation.x = Math.PI / 2; tip.position.z = 0.32; obj.add(tip);
        const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.04, 0.8, 4), add(color, 0.5));
        trail.rotation.x = -Math.PI / 2; trail.position.z = -0.5; obj.add(trail);
        break;
      }
      case 'bullet':
        obj = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 6, 4), add(color, 1));
        break;
      case 'hammer':
        obj = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), add(color, 1));
        break;
      case 'fireball': case 'fire':
        obj = new THREE.Group();
        obj.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 * scale, 1), add('#ffe08a', 1)));
        obj.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * scale, 1), add(color, 0.6)));
        break;
      case 'frost':
        obj = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 * scale), add(color, 1));
        obj.scale.z = 2.2;
        break;
      default:
        obj = new THREE.Group();
        obj.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 * scale, 1), add('#ffffff', 1)));
        obj.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 * scale, 1), add(color, 0.7)));
    }
    obj.position.copy(from);
    obj.visible = launchDelay <= 0;
    const flightDur = Math.max(0.05, dur - launchDelay);
    const arc = kind === 'arrow' ? 0.6 : kind === 'hammer' ? 0.3 : 0.15;
    let trailT = 0;
    this.push(obj, dur, (dt, t) => {
      if (t < launchDelay) return true;
      obj.visible = true;
      const k = Math.min(1, (t - launchDelay) / flightDur);
      const to = this.resolve(tgt).clone().add(new THREE.Vector3(0, 0.7, 0));
      const pos = from.clone().lerp(to, k);
      pos.y += Math.sin(k * Math.PI) * arc;
      obj.lookAt(pos.clone().add(to.clone().sub(from).normalize()));
      obj.position.copy(pos);
      if (kind === 'hammer') obj.rotation.x += t * 20;
      trailT += dt;
      if (big && trailT > 0.03 && kind !== 'arrow') {
        trailT = 0;
        this.trailPuff(pos, color);
      }
      return true;
    });
  }

  trailPuff(pos, color) {
    const m = add(color, 0.6);
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), m);
    s.position.copy(pos);
    this.push(s, 0.35, (dt, t) => { s.scale.setScalar(1 - t / 0.35); m.opacity = 0.6 * (1 - t / 0.35); });
  }

  // ─────────── Area effects ───────────
  ring(at, radius = 1.5, color = '#ffffff', dur = 0.7) {
    const p = this.resolve(at);
    const m = add(color, 0.9);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), m);
    r.rotation.x = -Math.PI / 2;
    r.position.set(p.x, 0.08, p.z);
    const R = radius * 1.74;
    this.push(r, dur, (dt, t) => {
      const k = t / dur;
      r.scale.setScalar(0.2 + k * R);
      m.opacity = 0.9 * (1 - k);
    });
  }

  disc(at, radius, color, dur) {
    const p = this.resolve(at);
    const m = add(color, 0.35);
    const d = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.74, 32), m);
    d.rotation.x = -Math.PI / 2;
    d.position.set(p.x, 0.06, p.z);
    this.push(d, dur, (dt, t) => { m.opacity = 0.35 * Math.sin(Math.min(1, t / dur) * Math.PI); });
  }

  burst(at, color = '#ffffff', size = 0.8, dur = 0.5) {
    const p = this.resolve(at).clone().add(new THREE.Vector3(0, 0.7, 0));
    const m = add(color, 0.9);
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), m);
    s.position.copy(p);
    this.push(s, dur, (dt, t) => {
      const k = t / dur;
      s.scale.setScalar(0.1 + k * size);
      m.opacity = 0.9 * (1 - k);
    });
    this.sparks(at, color, 8, 3, 0.06, 0.5);
  }

  slash(at, color = '#ffffff') {
    const p = this.resolve(at).clone().add(new THREE.Vector3(0, 0.75, 0));
    const m = add(color, 1);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 3, 16, Math.PI * 0.9), m);
    arc.position.copy(p);
    arc.rotation.set(Math.random() * 0.8 - 0.4, Math.random() * Math.PI, Math.random() * 1.5);
    this.push(arc, 0.3, (dt, t) => { arc.rotation.z += dt * 14; m.opacity = 1 - t / 0.3; arc.scale.setScalar(1 + t * 1.5); });
  }

  shockwave(at, radius, color) {
    this.ring(at, radius, color, 0.6);
    this.disc(at, radius, color, 0.5);
    this.sparks(at, color, 16, 6, 0.09, 0.7, 2);
  }

  frost(at, radius, color) {
    const p = this.resolve(at);
    const g = new THREE.Group();
    const m = add(color, 0.9);
    const R = (radius || 1) * 1.6;
    const n = Math.round(6 + R * 5);
    const shards = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 4), m);
      const a = Math.random() * Math.PI * 2, r = Math.random() * R;
      s.position.set(p.x + Math.cos(a) * r, -0.4, p.z + Math.sin(a) * r);
      s.rotation.set(Math.random() * 0.5 - 0.25, 0, Math.random() * 0.5 - 0.25);
      shards.push(s); g.add(s);
    }
    this.push(g, 1.0, (dt, t) => {
      for (const s of shards) s.position.y = Math.min(0.35, -0.4 + t * 4) - Math.max(0, t - 0.6) * 2;
      m.opacity = Math.max(0, 1 - Math.max(0, t - 0.5) * 2);
    });
    this.ring(at, radius || 1, color, 0.6);
    this.rising(at, '#ffffff', 10, R, 1, 0.05);
  }

  flames(at, radius, color) {
    const p = this.resolve(at);
    const g = new THREE.Group();
    const R = (radius || 1) * 1.5;
    const mats = [add(color, 0.9), add('#ffe08a', 0.9)];
    const fl = [];
    for (let i = 0; i < 14 + R * 6; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 5), mats[i % 2]);
      const a = Math.random() * Math.PI * 2, r = Math.random() * R;
      f.position.set(p.x + Math.cos(a) * r, 0.2, p.z + Math.sin(a) * r);
      fl.push({ f, s: Math.random() * 6 });
      g.add(f);
    }
    this.push(g, 1.0, (dt, t) => {
      for (const q of fl) { q.f.scale.y = 0.6 + Math.sin(t * 20 + q.s) * 0.4 + (1 - t); q.f.position.y = 0.2 + t * 0.6; }
      for (const m of mats) m.opacity = Math.max(0, 0.9 * (1 - t));
    });
    this.disc(at, radius || 1, color, 0.8);
  }

  holy(at, color) {
    const p = this.resolve(at);
    const m = add(color, 0.6);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 5, 16, 1, true), m);
    col.position.set(p.x, 2.5, p.z);
    this.push(col, 0.8, (dt, t) => { m.opacity = 0.6 * (1 - t / 0.8); col.scale.x = col.scale.z = 1 - t * 0.6; });
    this.rising(at, color, 14, 0.5, 1.0, 0.06);
  }

  nature(at, color) {
    this.rising(at, color, 18, 0.7, 1.2, 0.08);
    this.ring(at, 0.6, color, 0.8);
  }

  aura(unit, color, dur) {
    const m = add(color, 0.7);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), m);
    r.rotation.x = -Math.PI / 2;
    const m2 = add(color, 0.25);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.6, 16, 1, true), m2);
    const g = new THREE.Group(); g.add(r); g.add(c);
    c.position.y = 0.8;
    this.push(g, dur, (dt, t) => {
      const p = this.resolve(unit);
      g.position.set(p.x, 0.1, p.z);
      r.rotation.z += dt * 2;
      const fade = Math.min(1, (dur - t) * 3, t * 5);
      m.opacity = 0.7 * fade * (0.7 + Math.sin(t * 8) * 0.3);
      m2.opacity = 0.2 * fade;
      if (unit.alive === false) return false;
      return true;
    });
  }

  bubble(unit, color, dur) {
    const m = add(color, 0.25);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 10), m);
    this.push(s, dur, (dt, t) => {
      const p = this.resolve(unit);
      s.position.set(p.x, 0.75, p.z);
      m.opacity = 0.25 * Math.min(1, (dur - t) * 3, t * 6) + Math.sin(t * 5) * 0.05;
      if (unit.alive === false) return false;
      return true;
    });
  }

  cyclone(unit, color, dur) {
    const m = add(color, 0.5);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.3, 2.4, 12, 4, true), m);
    this.push(c, dur, (dt, t) => {
      const p = this.resolve(unit);
      c.position.set(p.x, 1.2, p.z);
      c.rotation.y += dt * 12;
      m.opacity = 0.5 * Math.min(1, (dur - t) * 3, t * 5);
    });
  }

  whirl(unit, color, dur) {
    const m = add(color, 0.8);
    const t1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 3, 24, Math.PI * 1.5), m);
    t1.rotation.x = -Math.PI / 2;
    this.push(t1, dur, (dt, t) => {
      const p = this.resolve(unit);
      t1.position.set(p.x, 0.7, p.z);
      t1.rotation.z += dt * 18;
      m.opacity = 0.8 * Math.min(1, (dur - t) * 3);
      if (unit.alive === false) return false;
      return true;
    });
  }

  cone(unit, dir, length, color, kind) {
    const p = this.resolve(unit);
    const L = length * 1.74;
    const m = add(color, 0.7);
    const geo = new THREE.ConeGeometry(L * 0.55, L, 16, 1, true);
    geo.translate(0, -L / 2, 0);
    const c = new THREE.Mesh(geo, m);
    c.position.set(p.x, 0.7, p.z);
    c.rotation.z = Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.set(p.x, 0.7, p.z);
    c.position.set(0, 0, 0);
    holder.add(c);
    holder.rotation.y = -dir;
    c.rotation.z = Math.PI / 2;
    this.push(holder, 0.6, (dt, t) => {
      const k = t / 0.6;
      c.scale.set(Math.min(1, k * 3), 1, Math.min(1, k * 3));
      m.opacity = 0.7 * (1 - k);
    });
    // particles along the cone
    for (let i = 0; i < 4; i++) {
      const d = (i + 1) / 4 * L;
      const at = { x: p.x + Math.cos(dir) * d, y: 0, z: p.z + Math.sin(dir) * d };
      if (kind === 'fire' || kind === 'fireball') this.sparks(new THREE.Vector3(at.x, 0, at.z), color, 6, 2.5, 0.08, 0.6);
      else this.sparks(new THREE.Vector3(at.x, 0, at.z), color, 5, 2, 0.06, 0.6);
    }
  }

  star(at, color) {
    const p = this.resolve(at);
    const m = add(color, 1);
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), m);
    const start = new THREE.Vector3(p.x + 2, 9, p.z - 2);
    const end = new THREE.Vector3(p.x, 0.3, p.z);
    s.position.copy(start);
    this.push(s, 0.35, (dt, t) => {
      s.position.lerpVectors(start, end, t / 0.35);
      s.rotation.y += dt * 10;
      this.trailPuff(s.position, color);
    });
    setTimeout(() => this.shockwave(end, 1.2, color), 330);
  }

  bolt(at, color) {
    const p = this.resolve(at);
    this.lightning(new THREE.Vector3(p.x + (Math.random() - 0.5), 10, p.z + (Math.random() - 0.5)), new THREE.Vector3(p.x, 0.6, p.z), color, 0.35, 0.6);
    this.sparks(at, color, 10, 4, 0.06, 0.4);
  }

  lightning(a, b, color, dur = 0.3, jitter = 0.3) {
    const pts = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      if (i > 0 && i < n) p.add(new THREE.Vector3((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter));
      pts.push(p);
    }
    const g = new THREE.Group();
    const m = add(color, 1);
    for (let i = 0; i < n; i++) {
      const s = pts[i], e = pts[i + 1];
      const len = s.distanceTo(e);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 4), m);
      seg.position.copy(s).lerp(e, 0.5);
      seg.lookAt(e);
      seg.rotateX(Math.PI / 2);
      g.add(seg);
    }
    this.push(g, dur, (dt, t) => { m.opacity = (1 - t / dur) * (0.6 + Math.random() * 0.4); });
  }

  beam(from, to, color, dur) {
    const a = this.resolve(from).clone().add(new THREE.Vector3(0, 0.8, 0));
    const b = this.resolve(to).clone().add(new THREE.Vector3(0, 0.8, 0));
    this.lightning(a, b, color, dur, 0.35);
    this.sparks(to, color, 5, 2, 0.05, 0.3);
  }

  moon(at, color) {
    const p = this.resolve(at);
    const m = add(color, 0.8);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(3, 32), m);
    disk.position.set(0, 12, -6);
    this.push(disk, 1.4, (dt, t) => { m.opacity = 0.8 * Math.sin(Math.min(1, t / 1.4) * Math.PI); disk.lookAt(p.x, 0, p.z + 10); });
  }

  beamDown(at, color) {
    const p = this.resolve(at);
    const m = add(color, 0.7);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 10, 12, 1, true), m);
    col.position.set(p.x, 5, p.z);
    this.push(col, 0.7, (dt, t) => { m.opacity = 0.7 * (1 - t / 0.7); });
    this.sparks(at, color, 6, 2, 0.05, 0.5);
  }

  poison(at, radius, color) {
    this.disc(at, radius || 0.8, color, 0.9);
    this.rising(at, color, 14, (radius || 0.8) * 1.2, 1.0, 0.09);
  }

  levelUp(at, color = '#ffd84a') {
    this.ring(at, 1.2, color, 0.8);
    this.rising(at, color, 26, 0.6, 1.4, 0.07);
    this.holy(at, color);
  }

  /** Dispatch a combat 'vfx' event. */
  fromEvent(e) {
    const c = e.color || '#ffffff';
    switch (e.vfx) {
      case 'ring': this.ring(e.at, e.radius || 1.5, c, e.dur || 0.7); break;
      case 'burst': this.burst(e.at, c); break;
      case 'impact': this.burst(e.at, c, 0.7, 0.4); break;
      case 'slash': this.slash(e.at, c); break;
      case 'shockwave': this.shockwave(e.at, e.radius || 1.3, c); break;
      case 'frost': this.frost(e.at, e.radius || 1, c); break;
      case 'fire': case 'fireball': this.flames(e.at, e.radius || 1, c); break;
      case 'fel': this.flames(e.at, e.radius || 1, c); break;
      case 'holy': this.holy(e.at, c); break;
      case 'nature': this.nature(e.at, c); break;
      case 'aura': this.aura(e.at, c, e.dur || 2); break;
      case 'bubble': this.bubble(e.at, c, e.dur || 3); break;
      case 'cyclone': this.cyclone(e.at, c, e.dur || 3); break;
      case 'whirl': this.whirl(e.at, c, e.dur || 3); break;
      case 'cone': this.cone(e.at, e.dir, e.length || 3, c, e.kind); break;
      case 'star': this.star(e.at, c); break;
      case 'bolt': this.bolt(e.at, c); break;
      case 'moon': this.moon(e.at, c); break;
      case 'beamDown': this.beamDown(e.at, c); break;
      case 'poison': this.poison(e.at, e.radius, c); break;
      case 'hex': this.burst(e.at, c, 1.0, 0.6); this.rising(e.at, c, 10, 0.5, 1, 0.06); break;
      case 'lightning': this.burst(e.at, c, 0.6, 0.3); break;
      case 'hammer': this.burst(e.at, c, 0.9, 0.4); break;
      default: this.burst(e.at, c);
    }
  }
}
