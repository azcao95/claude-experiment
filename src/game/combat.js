// Real-time auto-battle simulation on the hex board.
// The simulation runs in fixed steps; the renderer reads unit state and
// drains `battle.events` each frame to play animations and effects.

import { UNITS } from '../data/units.js';
import { hexDist, neighbors, key, inBounds, hexToWorld } from './hex.js';
import { computeStats, abilityValues } from './stats.js';

const MOVE_TIME = 0.42;
const SUDDEN_DEATH_AT = 40;
const MAX_TIME = 80;

let NEXT_ID = 1;

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export class Battle {
  /**
   * @param {object} opts
   * @param {Array} opts.player [{unit, pos, stats}]
   * @param {Array} opts.enemy  [{unit, pos, stats}]
   * @param {object} opts.playerCtx  ctx for summoned player units
   * @param {object} opts.teamFx { p: {phoenix}, e: {} }
   */
  constructor({ player, enemy, playerCtx = {}, enemyCtx = {}, teamFx = {} }) {
    this.time = 0;
    this.units = [];
    this.events = [];
    this.scheduled = [];
    this.over = false;
    this.winner = null;
    this.occ = new Map();
    this.ctx = { p: playerCtx, e: enemyCtx };
    this.teamFx = { p: { ...(teamFx.p || {}) }, e: { ...(teamFx.e || {}) } };
    this.tickAcc = { regen: 0, aura: 0, sec: 0, dot: 0, redemption: 0 };
    for (const p of player) this.addUnit('p', p.unit, p.pos, p.stats);
    for (const e of enemy) this.addUnit('e', e.unit, e.pos, e.stats);
    this.startEffects();
  }

  addUnit(team, unit, pos, stats, isSummon = false) {
    const def = UNITS[unit.id];
    const u = {
      id: NEXT_ID++, uid: unit.uid, team, defId: unit.id, def, star: unit.star || 1,
      items: unit.items || [], isSummon,
      pos: { ...pos }, from: { ...pos }, moveT: 1, moveDur: MOVE_TIME, leaping: false,
      ...stats,
      baseAs: stats.as, baseAd: stats.ad, baseAp: stats.ap,
      hp: stats.maxHp, mana: stats.startMana, shields: [],
      atkCd: 0.2 + Math.random() * 0.3, stun: 0, castLock: 0, manaLock: 0,
      buffs: [], dots: [], grievousUntil: 0, chillUntil: 0, chillPct: 0,
      shredUntil: 0, shredPct: 0, auraChill: 0, auraMrShred: 0,
      alive: true, reviving: 0, banished: 0, ccImmuneUntil: 0, spinUntil: 0, spinTick: 0,
      target: null, attacks: 0, stacks: 0, rampAs: 0, castAs: 0,
      thornsCd: 0, flags: {}, dmgDealt: 0, dmgTaken: 0, healDone: 0, scale: 1,
    };
    this.units.push(u);
    this.occ.set(key(pos.c, pos.r), u);
    if (isSummon) this.emit({ type: 'spawn', u });
    return u;
  }

  emit(e) { this.events.push(e); }
  schedule(delay, fn) { this.scheduled.push({ t: this.time + delay, fn }); }

  alive(team) { return this.units.filter(u => u.alive && (!team || u.team === team)); }
  enemiesOf(u) { return this.units.filter(o => o.alive && o.team !== u.team && !o.reviving); }
  alliesOf(u) { return this.units.filter(o => o.alive && o.team === u.team && !o.reviving); }

  // ─────────────────────────── Start-of-combat ───────────────────────────
  startEffects() {
    for (const u of this.units) {
      if (u.startShield > 0) this.addShield(u, u.startShield, 99);
      if (u.fx.ccImmuneFor) u.ccImmuneUntil = u.fx.ccImmuneFor;
    }
    for (const u of this.units) {
      const allies = this.alliesOf(u);
      if (u.fx.allyShieldAura) {
        for (const a of allies) if (hexDist(a.pos, u.pos) <= 2) this.addShield(a, u.fx.allyShieldAura, 8);
        this.emit({ type: 'vfx', vfx: 'ring', at: u, radius: 2.2, color: '#ffe48a', dur: 0.8 });
      }
      if (u.fx.auraAs) {
        for (const a of allies) if (hexDist(a.pos, u.pos) <= 2) a.buffs.push({ until: 999, as: u.fx.auraAs });
        this.emit({ type: 'vfx', vfx: 'ring', at: u, radius: 2.2, color: '#ff5a3a', dur: 0.8 });
      }
      if (u.fx.apAura) {
        for (const a of allies) if (hexDist(a.pos, u.pos) <= 2) a.ap += u.fx.apAura;
        this.emit({ type: 'vfx', vfx: 'ring', at: u, radius: 2.2, color: '#fff2a8', dur: 0.8 });
      }
      if (u.fx.banish) {
        const foes = this.enemiesOf(u).sort((a, b) => b.items.length - a.items.length || b.def.cost - a.def.cost);
        if (foes[0]) {
          foes[0].banished = u.fx.banish;
          this.emit({ type: 'vfx', vfx: 'cyclone', at: foes[0], color: '#a0e8c0', dur: u.fx.banish });
        }
      }
    }
    // Rogue ambush: leap to the enemy backline.
    for (const u of this.units) {
      if (!u.ambush) continue;
      const foes = this.enemiesOf(u);
      if (!foes.length) continue;
      const far = foes.reduce((best, f) => (hexDist(f.pos, u.pos) > hexDist(best.pos, u.pos) ? f : best));
      const spot = this.freeHexNear(far.pos, u.pos);
      if (spot) this.schedule(0.1, () => { if (u.alive) this.relocate(u, spot, true); });
    }
  }

  // ─────────────────────────── Helpers ───────────────────────────
  isFree(c, r) { return inBounds(c, r) && !this.occ.has(key(c, r)); }

  freeHexNear(pos, prefer) {
    const cands = neighbors(pos.c, pos.r).filter(n => this.isFree(n.c, n.r));
    if (!cands.length) {
      // widen search
      const ring2 = [];
      for (const n of neighbors(pos.c, pos.r)) for (const m of neighbors(n.c, n.r)) if (this.isFree(m.c, m.r)) ring2.push(m);
      if (!ring2.length) return null;
      return prefer ? ring2.sort((a, b) => hexDist(a, prefer) - hexDist(b, prefer))[0] : ring2[0];
    }
    return prefer ? cands.sort((a, b) => hexDist(a, prefer) - hexDist(b, prefer))[0] : cands[0];
  }

  relocate(u, to, leap = false) {
    this.occ.delete(key(u.pos.c, u.pos.r));
    u.from = { ...u.pos };
    u.pos = { ...to };
    u.moveT = 0;
    u.moveDur = leap ? 0.5 : MOVE_TIME;
    u.leaping = leap;
    this.occ.set(key(to.c, to.r), u);
    if (leap) this.emit({ type: 'leap', u });
  }

  effAS(u) {
    let mult = 1 + u.rampAs + u.castAs;
    for (const b of u.buffs) if (b.as) mult += b.as;
    let slow = 0;
    if (u.chillUntil > this.time) slow = Math.max(slow, u.chillPct);
    slow = Math.max(slow, u.auraChill);
    if (u.ccImmuneUntil > this.time) slow = 0;
    return Math.min(5, u.baseAs * mult * (1 - slow));
  }

  effAD(u) {
    let ad = u.ad;
    for (const b of u.buffs) if (b.ad) ad += b.ad;
    if (u.bloodFury && u.hp < u.maxHp * 0.5) ad *= 1 + u.bloodFuryPct * 0.5;
    if (u.flags.steraks) ad *= 1 + u.fx.steraks;
    return ad;
  }

  effArmor(u) {
    let a = u.armor + u.stacks * (u.fx.titanStacks ? 2 : 0);
    for (const b of u.buffs) if (b.armor) a += b.armor;
    if (u.fx.lowHpResist && u.hp < u.maxHp * 0.5) a += u.fx.lowHpResist;
    if (u.shredUntil > this.time) a *= 1 - u.shredPct;
    return Math.max(0, a);
  }

  effMR(u) {
    let m = u.mr;
    for (const b of u.buffs) if (b.mr) m += b.mr;
    if (u.fx.lowHpResist && u.hp < u.maxHp * 0.5) m += u.fx.lowHpResist;
    m *= 1 - u.auraMrShred;
    return Math.max(0, m);
  }

  totalShield(u) { return u.shields.reduce((s, x) => s + x.amt, 0); }

  addShield(u, amt, dur) {
    u.shields.push({ amt, until: this.time + dur });
    this.emit({ type: 'shield', u, amt });
  }

  stunUnit(u, dur) {
    if (!u.alive || u.ccImmuneUntil > this.time || u.spinUntil > this.time) return;
    u.stun = Math.max(u.stun, dur);
    this.emit({ type: 'stun', u, dur });
  }

  heal(src, tgt, amt) {
    if (!tgt.alive || tgt.reviving) return 0;
    if (tgt.grievousUntil > this.time) amt *= 0.5;
    const before = tgt.hp;
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
    const done = tgt.hp - before;
    if (src) src.healDone += done;
    if (done >= 15) this.emit({ type: 'heal', tgt, amt: Math.round(done) });
    return done;
  }

  gainMana(u, amt) {
    if (u.manaLock > this.time || u.maxMana >= 999) return;
    u.mana = Math.min(u.maxMana, u.mana + amt);
  }

  /** Core damage function. type: 'phys' | 'magic' | 'true' */
  damage(src, tgt, amount, type, opts = {}) {
    if (!tgt.alive || tgt.reviving || tgt.banished > 0) return 0;
    let amt = amount;
    if (this.time > SUDDEN_DEATH_AT) amt *= 1 + (this.time - SUDDEN_DEATH_AT) * 0.08;
    if (opts.isAbility && src && src.fx.spellCrit && Math.random() < src.crit) {
      amt *= src.critDmg; opts.crit = true;
    }
    if (type === 'phys') amt *= 100 / (100 + this.effArmor(tgt));
    else if (type === 'magic') amt *= 100 / (100 + this.effMR(tgt));
    const pre = amount;
    amt = Math.max(1, amt);

    let rem = amt;
    for (const s of tgt.shields) {
      if (rem <= 0) break;
      const take = Math.min(s.amt, rem);
      s.amt -= take; rem -= take;
    }
    tgt.shields = tgt.shields.filter(s => s.amt > 0.5);
    tgt.hp -= rem;
    tgt.dmgTaken += amt;
    if (src) {
      src.dmgDealt += amt;
      let vamp = src.omnivamp;
      if (opts.isAttack) vamp += src.lifesteal;
      if (opts.isAbility) vamp += src.spellVamp;
      for (const b of src.buffs) if (b.omnivamp) vamp += b.omnivamp;
      if (vamp > 0 && src.alive) this.heal(src, src, amt * vamp);
      if (opts.isAbility && src.spellBurn) this.applyBurn(src, tgt, src.spellBurn, 3);
      if (opts.isAbility && src.fx.abilityBurn) this.applyBurn(src, tgt, src.fx.abilityBurn, 3, true);
    }
    this.gainMana(tgt, Math.min(40, pre * 0.012 + amt * 0.03));
    this.emit({ type: 'dmg', tgt, amt: Math.round(amt), kind: type, crit: !!opts.crit });

    // threshold effects
    if (tgt.hp > 0) {
      if (tgt.fx.lowHpShield && !tgt.flags.lowShield && tgt.hp < tgt.maxHp * 0.4) {
        tgt.flags.lowShield = true;
        this.addShield(tgt, tgt.maxHp * tgt.fx.lowHpShield, 5);
      }
      if (tgt.fx.steraks && !tgt.flags.steraks && tgt.hp < tgt.maxHp * 0.6) {
        tgt.flags.steraks = true;
        const add = tgt.maxHp * tgt.fx.steraks;
        tgt.maxHp += add; tgt.hp += add;
        this.emit({ type: 'vfx', vfx: 'burst', at: tgt, color: '#ffb36a', dur: 0.6 });
      }
    }
    if (tgt.hp <= 0) this.kill(tgt, src);
    return amt;
  }

  applyBurn(src, tgt, pctPerSec, dur, grievous = true) {
    const existing = tgt.dots.find(d => d.burn);
    const dps = tgt.maxHp * pctPerSec;
    if (existing) { existing.until = this.time + dur; existing.dps = Math.max(existing.dps, dps); existing.src = src; }
    else tgt.dots.push({ burn: true, until: this.time + dur, dps, src, type: 'true' });
    if (grievous) tgt.grievousUntil = Math.max(tgt.grievousUntil, this.time + dur);
  }

  kill(u, killer) {
    if (!u.alive) return;
    // Soulstone revive
    if (u.fx.revive && !u.flags.revived) {
      u.flags.revived = true;
      u.hp = 1; u.reviving = 2; u.shields = []; u.dots = [];
      this.emit({ type: 'revive', u, dur: 2 });
      this.schedule(2, () => { if (u.alive) { u.reviving = 0; u.hp = u.maxHp * u.fx.revive; this.emit({ type: 'revived', u }); } });
      return;
    }
    const tfx = this.teamFx[u.team];
    if (tfx.phoenix && !tfx.phoenixUsed && !u.isSummon) {
      tfx.phoenixUsed = true;
      u.hp = 1; u.reviving = 2; u.shields = []; u.dots = [];
      this.emit({ type: 'revive', u, dur: 2, phoenix: true });
      this.schedule(2, () => { if (u.alive) { u.reviving = 0; u.hp = u.maxHp * tfx.phoenix; this.emit({ type: 'revived', u }); } });
      return;
    }
    u.alive = false;
    u.hp = 0;
    this.occ.delete(key(u.pos.c, u.pos.r));
    this.emit({ type: 'death', u });
    if (killer && killer.alive) {
      if (killer.fx.takedownAd) {
        killer.ad += killer.fx.takedownAd;
        this.emit({ type: 'vfx', vfx: 'burst', at: killer, color: '#ff6a3c', dur: 0.5 });
      }
      if (killer.onKill) { const f = killer.onKill; killer.onKill = null; f(u); }
    }
  }

  // ─────────────────────────── Main loop ───────────────────────────
  step(dt) {
    if (this.over) return;
    this.time += dt;

    // scheduled
    if (this.scheduled.length) {
      const due = this.scheduled.filter(s => s.t <= this.time);
      this.scheduled = this.scheduled.filter(s => s.t > this.time);
      for (const s of due) s.fn();
    }

    this.periodic(dt);

    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.moveT < 1) {
        u.moveT = Math.min(1, u.moveT + dt / u.moveDur);
        if (u.moveT >= 1) u.leaping = false;
      }
      if (u.reviving > 0) { u.reviving -= dt; continue; }
      if (u.banished > 0) { u.banished -= dt; continue; }
      u.buffs = u.buffs.filter(b => b.until > this.time);
      u.shields = u.shields.filter(s => s.until > this.time);
      if (u.stun > 0) { u.stun -= dt; continue; }
      if (u.castLock > 0) { u.castLock -= dt; continue; }
      if (u.spinUntil > this.time) { this.spinTick(u, dt); continue; }
      this.act(u, dt);
    }

    const pAlive = this.units.some(u => u.alive && u.team === 'p');
    const eAlive = this.units.some(u => u.alive && u.team === 'e');
    if (!pAlive || !eAlive || this.time > MAX_TIME) {
      this.over = true;
      this.winner = pAlive && !eAlive ? 'p' : 'e';
      this.emit({ type: 'end', winner: this.winner });
    }
  }

  periodic(dt) {
    const T = this.tickAcc;
    T.dot += dt; T.regen += dt; T.aura += dt; T.sec += dt; T.redemption += dt;

    if (T.dot >= 0.5) {
      T.dot -= 0.5;
      for (const u of this.units) {
        if (!u.alive || !u.dots.length) continue;
        u.dots = u.dots.filter(d => d.until > this.time);
        for (const d of u.dots) this.damage(d.src, u, d.dps * 0.5, d.type || 'magic', { dot: true });
      }
    }
    if (T.sec >= 1) {
      T.sec -= 1;
      for (const u of this.units) {
        if (!u.alive) continue;
        if (u.fx.apPerSec) u.ap += u.fx.apPerSec;
        if (u.selfRegen) this.heal(u, u, u.maxHp * u.selfRegen);
        if (u.thornsCd > 0) u.thornsCd -= 1;
      }
    }
    if (T.regen >= 2) {
      T.regen -= 2;
      for (const u of this.units) {
        if (!u.alive) continue;
        if (u.regenPct) this.heal(null, u, u.maxHp * u.regenPct);
        if (u.fx.regen) this.heal(u, u, u.maxHp * u.fx.regen);
        if (u.fx.immolate) {
          for (const f of this.enemiesOf(u)) if (hexDist(f.pos, u.pos) <= 2) this.applyBurn(u, f, u.fx.immolate / 2, 2.2);
          this.emit({ type: 'vfx', vfx: 'ring', at: u, radius: 2.2, color: '#ff5a1a', dur: 0.5 });
        }
      }
    }
    if (T.redemption >= 5) {
      T.redemption -= 5;
      for (const u of this.units) {
        if (!u.alive || !u.fx.pulseHeal) continue;
        for (const a of this.alliesOf(u)) if (hexDist(a.pos, u.pos) <= 2) this.heal(u, a, (a.maxHp - a.hp) * u.fx.pulseHeal);
        this.emit({ type: 'vfx', vfx: 'ring', at: u, radius: 2.2, color: '#ffe48a', dur: 0.7 });
      }
    }
    if (T.aura >= 0.5) {
      T.aura -= 0.5;
      for (const u of this.units) { u.auraChill = 0; u.auraMrShred = 0; }
      for (const h of this.units) {
        if (!h.alive || (!h.fx.chillAura && !h.fx.mrShredAura)) continue;
        for (const f of this.enemiesOf(h)) {
          if (hexDist(f.pos, h.pos) > 2) continue;
          if (h.fx.chillAura) f.auraChill = Math.max(f.auraChill, h.fx.chillAura);
          if (h.fx.mrShredAura) f.auraMrShred = Math.max(f.auraMrShred, h.fx.mrShredAura);
        }
      }
    }
  }

  pickTarget(u) {
    const foes = this.enemiesOf(u).filter(f => f.banished <= 0);
    if (!foes.length) return null;
    if (u.target && u.target.alive && !u.target.reviving && u.target.banished <= 0) {
      const d = hexDist(u.pos, u.target.pos);
      if (d <= u.range) return u.target;
      const nearest = Math.min(...foes.map(f => hexDist(u.pos, f.pos)));
      if (d <= nearest) return u.target;
    }
    foes.sort((a, b) => hexDist(u.pos, a.pos) - hexDist(u.pos, b.pos) || a.hp - b.hp);
    return foes[0];
  }

  act(u, dt) {
    const tgt = this.pickTarget(u);
    u.target = tgt;
    if (!tgt) return;
    const inRange = hexDist(u.pos, tgt.pos) <= u.range;

    // Cast
    if (u.def.ability && u.maxMana < 999 && u.mana >= u.maxMana && u.moveT >= 1) {
      this.cast(u, tgt);
      return;
    }

    if (inRange) {
      if (u.moveT < 1) return;
      u.atkCd -= dt;
      if (u.atkCd <= 0) {
        u.atkCd = 1 / this.effAS(u);
        this.attack(u, tgt);
      }
    } else if (u.moveT >= 1) {
      const step = this.pathStep(u, tgt);
      if (step) this.relocate(u, step);
      u.atkCd = Math.min(u.atkCd, 0.25);
    }
  }

  // BFS to any hex within range of the target, return first step.
  pathStep(u, tgt) {
    const start = key(u.pos.c, u.pos.r);
    const prev = new Map([[start, null]]);
    const queue = [u.pos];
    let goal = null;
    while (queue.length) {
      const cur = queue.shift();
      if (hexDist(cur, tgt.pos) <= u.range && key(cur.c, cur.r) !== start) { goal = cur; break; }
      for (const n of neighbors(cur.c, cur.r)) {
        const k = key(n.c, n.r);
        if (prev.has(k)) continue;
        if (!this.isFree(n.c, n.r)) continue;
        prev.set(k, cur);
        queue.push(n);
      }
    }
    if (!goal) {
      // Blocked: shuffle closer greedily.
      const opts = neighbors(u.pos.c, u.pos.r).filter(n => this.isFree(n.c, n.r));
      const cur = hexDist(u.pos, tgt.pos);
      const better = opts.filter(n => hexDist(n, tgt.pos) < cur);
      return better.length ? rand(better) : null;
    }
    let node = goal;
    while (true) {
      const p = prev.get(key(node.c, node.r));
      if (!p || key(p.c, p.r) === start) return node;
      node = p;
    }
  }

  attack(u, tgt) {
    const ranged = u.range > 1;
    const dist = hexDist(u.pos, tgt.pos);
    const delay = ranged ? 0.12 + dist * 0.07 : 0.18;
    this.emit({ type: 'attack', src: u, tgt, ranged, dur: delay });
    this.schedule(delay, () => this.onHit(u, tgt, 1));
    if (u.fx.multishot) {
      const other = this.enemiesOf(u).filter(f => f !== tgt).sort((a, b) => hexDist(a.pos, tgt.pos) - hexDist(b.pos, tgt.pos))[0];
      if (other && hexDist(other.pos, tgt.pos) <= 2) {
        this.emit({ type: 'attack', src: u, tgt: other, ranged: true, dur: delay, extra: true });
        this.schedule(delay, () => this.onHit(u, other, u.fx.multishot, true));
      }
    }
  }

  onHit(u, tgt, mult, extra = false) {
    if (!u.alive || !tgt.alive || tgt.reviving) return;
    u.attacks++;
    if (!extra) {
      this.gainMana(u, 10 * (1 + (u.manaGain || 0)) + (u.fx.manaOnHit || 0));
      if (u.fx.rampAs) u.rampAs += u.fx.rampAs;
      if (u.fx.titanStacks && u.stacks < 25) { u.stacks++; u.ad += 2; }
    }
    if (!u.fx.trueStrike && Math.random() < tgt.dodge) {
      this.emit({ type: 'dodge', u: tgt });
      if (tgt.fx.riposte && tgt.alive && !tgt.stun) this.schedule(0.1, () => this.onHit(tgt, u, 1, true));
      return;
    }
    let dmg = this.effAD(u) * mult;
    let crit = false;
    if (Math.random() < u.crit && !tgt.fx.critImmune) { dmg *= u.critDmg; crit = true; }
    this.damage(u, tgt, dmg, 'phys', { isAttack: true, crit });
    for (const b of u.buffs) if (b.fel) this.damage(u, tgt, b.fel, 'magic', {});
    if (u.fx.shredOnHit) { tgt.shredUntil = this.time + 3; tgt.shredPct = Math.max(tgt.shredPct, u.fx.shredOnHit); }
    if (crit && u.fx.critShred) { tgt.shredUntil = this.time + 4; tgt.shredPct = Math.max(tgt.shredPct, u.fx.critShred); }
    if (tgt.fx.titanStacks && tgt.stacks < 25 && tgt.alive) tgt.stacks++;
    if (tgt.fx.thorns && tgt.alive && tgt.thornsCd <= 0) {
      tgt.thornsCd = 1;
      for (const f of this.enemiesOf(tgt)) if (hexDist(f.pos, tgt.pos) <= 1) this.damage(tgt, f, tgt.fx.thorns, 'magic');
      this.emit({ type: 'vfx', vfx: 'ring', at: tgt, radius: 1.2, color: '#7cb342', dur: 0.35 });
    }
    if (u.fx.chainEvery && !extra && u.attacks % u.fx.chainEvery === 0) {
      const foes = this.enemiesOf(u).sort((a, b) => hexDist(a.pos, tgt.pos) - hexDist(b.pos, tgt.pos)).slice(0, u.fx.chainCount);
      let prev = u;
      for (const f of foes) {
        this.emit({ type: 'beam', from: prev, to: f, color: '#5ad8ff', dur: 0.25 });
        this.damage(u, f, u.fx.chainDmg, 'magic');
        prev = f;
      }
    }
  }

  spinTick(u, dt) {
    u.spinTick -= dt;
    if (u.spinTick <= 0) {
      u.spinTick = 0.5;
      const pct = u.spinPct;
      for (const f of this.enemiesOf(u)) if (hexDist(f.pos, u.pos) <= 1) this.damage(u, f, this.effAD(u) * pct, 'phys', { isAbility: true });
    }
    // drift toward target while spinning
    const tgt = this.pickTarget(u);
    if (tgt && u.moveT >= 1 && hexDist(u.pos, tgt.pos) > 1) {
      const step = this.pathStep(u, tgt);
      if (step) this.relocate(u, step);
    }
  }

  // ─────────────────────────── Abilities ───────────────────────────
  cast(u, tgt) {
    const ab = u.def.ability;
    u.mana = 0;
    u.manaLock = this.time + 0.8;
    u.castLock = 0.3;
    const V = abilityValues(u.def, u.star, u.ap);
    this.emit({ type: 'cast', src: u, name: ab.name, color: ab.vfx?.color });
    const fn = ABILITIES[ab.kind];
    if (fn) fn(this, u, tgt, V, ab);
    if (u.fx.manaRefund) this.schedule(0.05, () => this.gainMana(u, u.fx.manaRefund));
    if (u.fx.castAs) u.castAs += u.fx.castAs;
    for (const h of this.units) {
      if (h.alive && h.team !== u.team && h.fx.castPunish && hexDist(h.pos, u.pos) <= 2) {
        this.damage(h, u, h.fx.castPunish, 'magic');
        this.emit({ type: 'beam', from: h, to: u, color: '#5ad8ff', dur: 0.2 });
      }
    }
  }

  pickBy(u, rule, fallback) {
    const foes = this.enemiesOf(u);
    if (!foes.length) return fallback;
    switch (rule) {
      case 'farthest': return foes.reduce((a, b) => (hexDist(b.pos, u.pos) > hexDist(a.pos, u.pos) ? b : a));
      case 'highestAd': return foes.reduce((a, b) => (b.ad > a.ad ? b : a));
      case 'lowest': return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
      case 'clump': {
        let best = fallback, bestN = -1;
        for (const f of foes) {
          const n = foes.filter(o => hexDist(o.pos, f.pos) <= 2).length;
          if (n > bestN) { bestN = n; best = f; }
        }
        return best;
      }
      default: return fallback && fallback.alive ? fallback : foes[0];
    }
  }

  dmgOf(u, V, ab) {
    if (ab.physical) return { amt: this.effAD(u) * (V.pct || 100) / 100, type: 'phys' };
    return { amt: V.dmg || 0, type: 'magic' };
  }

  inRadius(units, center, radius) {
    const c = hexToWorld(center.c, center.r);
    return units.filter(o => {
      const p = hexToWorld(o.pos.c, o.pos.r);
      return Math.hypot(p.x - c.x, p.z - c.z) <= radius * 1.74 + 0.01;
    });
  }

  finishBattleSummary() {
    return this.units.filter(u => !u.isSummon).map(u => ({
      team: u.team, defId: u.defId, star: u.star, uid: u.uid,
      dmgDealt: Math.round(u.dmgDealt), dmgTaken: Math.round(u.dmgTaken), healDone: Math.round(u.healDone), alive: u.alive,
    }));
  }
}

const ABILITIES = {
  nuke(B, u, tgt, V, ab) {
    const t = B.pickBy(u, ab.targeting, tgt);
    if (!t) return;
    const vfx = ab.vfx || {};
    const dist = hexDist(u.pos, t.pos);
    const delay = dist > 1 ? 0.15 + dist * 0.08 : 0.12;
    B.emit({ type: 'proj', src: u, tgt: t, dur: delay, kind: vfx.type, color: vfx.color, big: true });
    B.schedule(delay, () => {
      if (!t.alive) return;
      const dealt = B.damage(u, t, V.dmg, 'magic', { isAbility: true });
      B.emit({ type: 'vfx', vfx: vfx.type || 'impact', at: t, color: vfx.color, dur: 0.6, radius: ab.splash || 0.8 });
      if (V.stun) B.stunUnit(t, V.stun);
      if (ab.drain) B.heal(u, u, dealt);
      if (ab.burn) B.applyBurn(u, t, ab.burn, 3);
      if (ab.splash) {
        for (const o of B.inRadius(B.enemiesOf(u), t.pos, ab.splash)) {
          if (o === t) continue;
          B.damage(u, o, V.dmg * 0.5, 'magic', { isAbility: true });
          if (ab.burn) B.applyBurn(u, o, ab.burn, 3);
        }
      }
    });
  },

  physNuke(B, u, tgt, V, ab) {
    const t = B.pickBy(u, ab.targeting, tgt);
    if (!t) return;
    const vfx = ab.vfx || {};
    const dist = hexDist(u.pos, t.pos);
    const delay = dist > 1 ? 0.15 + dist * 0.06 : 0.12;
    B.emit({ type: 'proj', src: u, tgt: t, dur: delay, kind: vfx.type, color: vfx.color, big: true });
    B.schedule(delay, () => {
      if (!t.alive) return;
      let amt = B.effAD(u) * V.pct / 100 + (V.flat || 0);
      let crit = false;
      if (ab.critBelow && t.hp < t.maxHp * ab.critBelow) { amt *= u.critDmg; crit = true; }
      if (ab.summonOnKill) {
        u.onKill = (dead) => B.schedule(0.3, () => {
          const spot = B.isFree(dead.pos.c, dead.pos.r) ? dead.pos : B.freeHexNear(dead.pos, u.pos);
          if (!spot) return;
          const unit = { id: ab.summonOnKill, star: u.star, items: [] };
          const stats = computeStats(unit, { ...B.ctx[u.team], traits: {} });
          B.addUnit(u.team, unit, spot, stats, true);
        });
      }
      B.damage(u, t, amt, 'phys', { isAbility: true, crit });
      if (u.onKill && t.alive) u.onKill = null;
      B.emit({ type: 'vfx', vfx: vfx.type === 'slash' ? 'slash' : 'impact', at: t, color: vfx.color, dur: 0.5 });
    });
  },

  aoeTarget(B, u, tgt, V, ab) {
    const t = B.pickBy(u, ab.targeting, tgt);
    if (!t) return;
    const center = { ...t.pos };
    const vfx = ab.vfx || {};
    B.emit({ type: 'vfx', vfx: vfx.type || 'burst', at: center, color: vfx.color, dur: 1.0, radius: ab.radius });
    B.schedule(0.35, () => {
      const { amt, type } = B.dmgOf(u, V, ab);
      for (const o of B.inRadius(B.enemiesOf(u), center, ab.radius)) {
        B.damage(u, o, amt, type, { isAbility: true });
        if (ab.chill) { o.chillUntil = B.time + 3; o.chillPct = ab.chill; }
        if (ab.burn) B.applyBurn(u, o, ab.burn, 3);
      }
    });
  },

  aoeSelf(B, u, tgt, V, ab) {
    const vfx = ab.vfx || {};
    B.emit({ type: 'vfx', vfx: vfx.type || 'shockwave', at: u, color: vfx.color, dur: 0.8, radius: ab.radius });
    const { amt, type } = B.dmgOf(u, V, ab);
    for (const o of B.inRadius(B.enemiesOf(u), u.pos, ab.radius)) {
      B.damage(u, o, amt, type, { isAbility: true });
      if (V.stun) B.stunUnit(o, V.stun);
    }
  },

  multi(B, u, tgt, V, ab) {
    let foes = B.enemiesOf(u);
    if (ab.random) {
      const picks = [];
      for (let i = 0; i < V.n && foes.length; i++) picks.push(rand(foes));
      foes = picks;
    } else {
      foes = foes.sort((a, b) => hexDist(a.pos, u.pos) - hexDist(b.pos, u.pos)).slice(0, V.n);
    }
    const vfx = ab.vfx || {};
    foes.forEach((f, i) => {
      const delay = 0.1 + i * 0.08 + hexDist(u.pos, f.pos) * 0.06;
      B.emit({ type: 'proj', src: u, tgt: f, dur: delay, kind: vfx.type, color: vfx.color, launchDelay: i * 0.08 });
      B.schedule(delay, () => {
        if (!f.alive) return;
        const { amt, type } = B.dmgOf(u, V, ab);
        B.damage(u, f, amt, type, { isAbility: true });
      });
    });
  },

  healLowest(B, u, tgt, V, ab) {
    const allies = B.alliesOf(u);
    const low = allies.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), allies[0]);
    if (tgt && V.dmg) {
      B.emit({ type: 'proj', src: u, tgt, dur: 0.3, kind: 'orb', color: '#8a5aff' });
      B.schedule(0.3, () => B.damage(u, tgt, V.dmg, 'magic', { isAbility: true }));
    }
    if (low) {
      B.heal(u, low, V.heal);
      B.emit({ type: 'vfx', vfx: 'holy', at: low, color: ab.vfx?.color, dur: 0.9 });
    }
  },

  buffSelf(B, u, tgt, V, ab) {
    B.heal(u, u, V.heal);
    u.buffs.push({ until: B.time + V.dur, armor: V.armor, mr: V.armor });
    B.emit({ type: 'vfx', vfx: 'aura', at: u, color: ab.vfx?.color, dur: V.dur });
    B.emit({ type: 'scale', u, scale: 1.25, dur: V.dur });
  },

  shieldAllies(B, u, tgt, V, ab) {
    const allies = B.alliesOf(u).filter(a => a !== u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, V.n);
    for (const a of [u, ...allies]) {
      B.addShield(a, V.shield, 4);
      B.emit({ type: 'vfx', vfx: 'bubble', at: a, color: ab.vfx?.color, dur: 4 });
    }
  },

  dot(B, u, tgt, V, ab) {
    if (!tgt) return;
    const dur = ab.dur || 4;
    B.emit({ type: 'proj', src: u, tgt, dur: 0.2, kind: ab.vfx?.type, color: ab.vfx?.color });
    B.schedule(0.2, () => {
      if (!tgt.alive) return;
      tgt.dots.push({ until: B.time + dur, dps: V.dmg / dur, src: u, type: 'magic' });
      if (ab.grievous) tgt.grievousUntil = Math.max(tgt.grievousUntil, B.time + dur);
      B.emit({ type: 'vfx', vfx: 'aura', at: tgt, color: ab.vfx?.color, dur });
    });
  },

  cone(B, u, tgt, V, ab) {
    if (!tgt) return;
    const a = hexToWorld(u.pos.c, u.pos.r);
    const b = hexToWorld(tgt.pos.c, tgt.pos.r);
    const dir = Math.atan2(b.z - a.z, b.x - a.x);
    B.emit({ type: 'vfx', vfx: 'cone', at: u, dir, length: ab.length, color: ab.vfx?.color, kind: ab.vfx?.type, dur: 0.7 });
    const { amt, type } = B.dmgOf(u, V, ab);
    for (const f of B.enemiesOf(u)) {
      const p = hexToWorld(f.pos.c, f.pos.r);
      const d = Math.hypot(p.x - a.x, p.z - a.z);
      if (d > ab.length * 1.74 + 0.2) continue;
      let ang = Math.atan2(p.z - a.z, p.x - a.x) - dir;
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      if (Math.abs(ang) > 0.6 && d > 1.8) continue;
      B.schedule(0.1 + d * 0.04, () => {
        B.damage(u, f, amt, type, { isAbility: true });
        if (ab.burn) B.applyBurn(u, f, ab.burn, 3);
        if (ab.chill) { f.chillUntil = B.time + 3; f.chillPct = ab.chill; }
      });
    }
  },

  chain(B, u, tgt, V, ab) {
    if (!tgt) return;
    const hit = [];
    let cur = tgt;
    let prev = u;
    for (let i = 0; i < V.n && cur; i++) {
      hit.push(cur);
      const from = prev, to = cur;
      B.schedule(i * 0.12, () => {
        B.emit({ type: 'beam', from, to, color: ab.vfx?.color, dur: 0.3 });
        if (!to.alive) return;
        const d = B.damage(u, to, V.dmg, 'magic', { isAbility: true });
        if (ab.drain) B.heal(u, u, d * 0.5);
      });
      prev = cur;
      const rest = B.enemiesOf(u).filter(f => !hit.includes(f));
      cur = rest.sort((a, b) => hexDist(a.pos, prev.pos) - hexDist(b.pos, prev.pos))[0];
    }
  },

  pull(B, u, tgt, V, ab) {
    const t = B.pickBy(u, 'farthest', tgt);
    if (!t) return;
    B.emit({ type: 'beam', from: u, to: t, color: ab.vfx?.color, dur: 0.4 });
    const spot = B.freeHexNear(u.pos, t.pos);
    if (spot && hexDist(t.pos, u.pos) > 1) B.relocate(t, spot, true);
    B.schedule(0.35, () => {
      if (!t.alive) return;
      B.damage(u, t, V.dmg, 'magic', { isAbility: true });
      B.stunUnit(t, V.stun);
    });
  },

  spin(B, u, tgt, V, ab) {
    u.spinUntil = B.time + (ab.dur || 3);
    u.spinTick = 0;
    u.spinPct = V.pct / 100;
    u.stun = 0;
    B.emit({ type: 'vfx', vfx: 'whirl', at: u, color: ab.vfx?.color, dur: ab.dur || 3 });
  },

  healAll(B, u, tgt, V, ab) {
    for (const a of B.alliesOf(u)) {
      B.heal(u, a, V.heal);
      B.emit({ type: 'vfx', vfx: 'holy', at: a, color: ab.vfx?.color, dur: 1 });
    }
    B.emit({ type: 'vfx', vfx: 'aura', at: u, color: ab.vfx?.color, dur: 1.5 });
  },

  nova(B, u, tgt, V, ab) {
    const foes = ab.global ? B.enemiesOf(u) : B.inRadius(B.enemiesOf(u), u.pos, ab.radius);
    const allies = ab.global ? B.alliesOf(u) : B.inRadius(B.alliesOf(u), u.pos, ab.radius);
    if (ab.global) B.emit({ type: 'vfx', vfx: 'moon', at: u, color: ab.vfx?.color, dur: 1.4 });
    else B.emit({ type: 'vfx', vfx: 'ring', at: u, color: ab.vfx?.color, dur: 0.8, radius: ab.radius });
    for (const f of foes) {
      B.damage(u, f, V.dmg, 'magic', { isAbility: true });
      if (ab.global) B.emit({ type: 'vfx', vfx: 'beamDown', at: f, color: ab.vfx?.color, dur: 0.8 });
    }
    for (const a of allies) B.heal(u, a, V.heal);
  },

  execute(B, u, tgt, V, ab) {
    if (!tgt) return;
    B.emit({ type: 'vfx', vfx: 'slash', at: tgt, color: ab.vfx?.color, dur: 0.5 });
    B.damage(u, tgt, B.effAD(u) * V.pct / 100, 'phys', { isAbility: true });
    if (tgt.alive && tgt.hp < tgt.maxHp * V.exec / 100) {
      B.emit({ type: 'vfx', vfx: 'burst', at: tgt, color: '#ff2a2a', dur: 0.6 });
      B.damage(u, tgt, tgt.hp + B.totalShield(tgt) + 9999, 'true', {});
    }
  },

  leap(B, u, tgt, V, ab) {
    const t = B.pickBy(u, 'clump', tgt);
    if (!t) return;
    const spot = B.freeHexNear(t.pos, u.pos);
    if (spot) B.relocate(u, spot, true);
    B.schedule(0.5, () => {
      if (!u.alive) return;
      B.emit({ type: 'vfx', vfx: 'shockwave', at: u, color: ab.vfx?.color, dur: 0.8, radius: ab.radius });
      for (const o of B.inRadius(B.enemiesOf(u), u.pos, ab.radius)) {
        B.damage(u, o, V.dmg, 'magic', { isAbility: true });
        B.stunUnit(o, V.stun);
      }
    });
  },

  starfall(B, u, tgt, V, ab) {
    for (let i = 0; i < V.n; i++) {
      B.schedule(i * (2 / V.n), () => {
        const foes = B.enemiesOf(u);
        if (!foes.length) return;
        const f = rand(foes);
        const center = { ...f.pos };
        B.emit({ type: 'vfx', vfx: 'star', at: center, color: ab.vfx?.color, dur: 0.6 });
        B.schedule(0.35, () => {
          for (const o of B.inRadius(B.enemiesOf(u), center, ab.radius)) B.damage(u, o, V.dmg, 'magic', { isAbility: true });
        });
      });
    }
  },

  meta(B, u, tgt, V, ab) {
    const dur = ab.dur || 5;
    u.buffs.push({ until: B.time + dur, as: V.as / 100, omnivamp: V.vamp / 100, fel: V.fel || 0 });
    B.emit({ type: 'vfx', vfx: 'aura', at: u, color: ab.vfx?.color, dur });
    B.emit({ type: 'scale', u, scale: 1.3, dur });
  },

  storm(B, u, tgt, V, ab) {
    B.emit({ type: 'vfx', vfx: 'aura', at: u, color: ab.vfx?.color, dur: 2 });
    for (let i = 0; i < V.n; i++) {
      B.schedule(0.15 + i * 0.18, () => {
        const foes = B.enemiesOf(u);
        if (!foes.length) return;
        const f = rand(foes);
        B.emit({ type: 'vfx', vfx: 'bolt', at: f, color: ab.vfx?.color, dur: 0.4 });
        B.damage(u, f, V.dmg, 'magic', { isAbility: true });
        B.stunUnit(f, 1);
      });
    }
  },

  avatar(B, u, tgt, V, ab) {
    if (!u.flags.avatar) {
      u.flags.avatar = true;
      u.maxHp += V.hp;
      u.hp += V.hp;
      B.emit({ type: 'scale', u, scale: 1.45, dur: 999 });
    }
    B.emit({ type: 'vfx', vfx: 'shockwave', at: u, color: ab.vfx?.color, dur: 0.9, radius: ab.radius });
    for (const o of B.inRadius(B.enemiesOf(u), u.pos, ab.radius)) {
      B.damage(u, o, V.dmg, 'magic', { isAbility: true });
      B.stunUnit(o, 1.5);
    }
  },

  summon(B, u, tgt, V, ab) {
    B.addShield(u, V.shield, 6);
    B.emit({ type: 'vfx', vfx: 'ring', at: u, color: ab.vfx?.color, dur: 1, radius: 2 });
    for (let i = 0; i < V.n; i++) {
      const spot = B.freeHexNear(u.pos, tgt ? tgt.pos : null);
      if (!spot) break;
      const unit = { id: ab.summon, star: Math.min(u.star, 2), items: [] };
      const stats = computeStats(unit, { ...B.ctx[u.team], traits: {} });
      B.addUnit(u.team, unit, spot, stats, true);
    }
  },

  rewind(B, u, tgt, V, ab) {
    B.emit({ type: 'vfx', vfx: 'moon', at: u, color: ab.vfx?.color, dur: 1.2 });
    for (const a of B.alliesOf(u)) {
      B.heal(u, a, V.heal);
      if (a !== u) a.mana = Math.min(a.maxMana, a.mana + V.mana);
      B.emit({ type: 'vfx', vfx: 'holy', at: a, color: ab.vfx?.color, dur: 0.8 });
    }
  },
};
