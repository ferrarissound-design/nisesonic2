// リング・敵・ギミック・ボス・パーティクル
function boxesOverlap(a, b) {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}
function playerBox(p) {
  return { l: p.x - p.hw, r: p.x + p.hw, t: p.y - p.hh, b: p.y + p.hh };
}

// 敵との接触：ボールなら倒す、そうでなければダメージ
function enemyContact(game, e, box) {
  const p = game.player;
  if (p.state !== 'normal') return false;
  if (!boxesOverlap(playerBox(p), box)) return false;
  if (p.attacking) {
    e.dead = true;
    game.spawn(new Explosion(e.x, (box.t + box.b) / 2));
    game.spawn(new Animal(e.x, (box.t + box.b) / 2));
    Sound.play('destroy');
    if (!p.onGround && !p.loop) {
      if (p.vy > 0 && p.y < (box.t + box.b) / 2) p.vy = -p.vy;
      else p.vy -= Math.sign(p.vy || -1);
      const pts = [100, 200, 500, 1000][Math.min(p.chain, 3)];
      p.chain++;
      game.addScore(pts, e.x, box.t);
    } else {
      game.addScore(100, e.x, box.t);
    }
    return true;
  }
  p.hurt(game, e.x);
  return false;
}

class Ring {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
  }
  update(game) {
    const p = game.player;
    if (p.state === 'dead' || p.state === 'hurt' && p.invuln > 100) return;
    if (Math.abs(p.x - this.x) < p.hw + 7 && Math.abs(p.y - this.y) < p.hh + 7) {
      this.dead = true;
      game.collectRing();
      game.spawn(new Sparkle(this.x, this.y));
    }
  }
  draw(ctx, game) {
    drawRing(ctx, this.x, this.y, game.frame * 0.12 + this.x * 0.01);
  }
}

class LooseRing {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.age = 0;
    this.dead = false;
  }
  update(game) {
    this.age++;
    if (this.age > 256) { this.dead = true; return; }
    this.vy += 0.09375;
    this.x += this.vx;
    this.y += this.vy;
    const g = game.level.ground(this.x);
    if (this.vy > 0 && g !== Infinity && this.y + 8 > g && this.y + 8 < g + 20) {
      this.y = g - 8;
      this.vy = -this.vy * 0.75;
      if (this.vy > -1) this.vy = -1.5;
    }
    const p = game.player;
    if (this.age > 64 && p.state === 'normal' && Math.abs(p.x - this.x) < p.hw + 7 && Math.abs(p.y - this.y) < p.hh + 7) {
      this.dead = true;
      game.collectRing();
      game.spawn(new Sparkle(this.x, this.y));
    }
  }
  draw(ctx, game) {
    if (this.age > 190 && (this.age >> 2) % 2) return;
    drawRing(ctx, this.x, this.y, game.frame * 0.3);
  }
}

class Monitor {
  constructor(x, y, kind, level) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.dead = false;
    this.broken = false;
    this.box = { x: x - 13, y: y - 28, w: 26, h: 28, monitor: true };
    level.boxes.push(this.box);
  }
  update(game) {
    if (this.broken) return;
    const p = game.player;
    if (p.state !== 'normal' || !p.attacking) return;
    const b = { l: this.x - 15, r: this.x + 15, t: this.y - 30, b: this.y };
    if (boxesOverlap(playerBox(p), b)) {
      this.broken = true;
      this.box.dead = true;
      if (!p.onGround && p.vy > 0) p.vy = -p.vy;
      Sound.play('monitor');
      game.spawn(new Explosion(this.x, this.y - 14));
      game.spawn(new MonitorIcon(this.x, this.y - 16, this.kind));
      game.addScore(10, this.x, this.y - 30, true);
    }
  }
  draw(ctx, game) {
    if (this.broken) {
      drawBrokenMonitor(ctx, this.x, this.y);
      return;
    }
    drawMonitor(ctx, this.x, this.y, this.kind, game.frame);
  }
}

class MonitorIcon {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.t = 0;
    this.dead = false;
  }
  update(game) {
    this.t++;
    if (this.t < 24) this.y -= 1.5;
    if (this.t === 40) {
      game.applyItem(this.kind);
    }
    if (this.t > 56) this.dead = true;
  }
  draw(ctx) {
    drawMonitorIcon(ctx, this.x, this.y, this.kind);
  }
}

class Spring {
  constructor(x, y, dir, power) {
    this.x = x;
    this.y = y;
    this.dir = dir || 'up';
    this.power = power || 'yellow';
    this.squash = 0;
    this.dead = false;
  }
  update(game) {
    if (this.squash > 0) this.squash--;
    const p = game.player;
    if (p.state !== 'normal') return;
    const pb = playerBox(p);
    if (this.dir === 'up') {
      const b = { l: this.x - 14, r: this.x + 14, t: this.y - 16, b: this.y };
      if (boxesOverlap(pb, b) && (p.vy >= 0 || p.onGround)) {
        p.y = this.y - 16 - p.hh;
        p.launchSpring(this.power === 'red' ? -16 : -10);
        this.squash = 12;
      }
    } else {
      const s = this.dir === 'right' ? 1 : -1;
      const b = { l: this.x - 10, r: this.x + 10, t: this.y - 28, b: this.y };
      if (boxesOverlap(pb, b)) {
        const sp = this.power === 'red' ? 16 : 10;
        if (p.onGround) p.gsp = sp * s;
        else p.vx = sp * s;
        p.dir = s;
        p.ctrlLock = 16;
        p.x = this.x + s * (10 + p.hw + 1);
        this.squash = 12;
        Sound.play('spring');
      }
    }
  }
  draw(ctx) {
    drawSpring(ctx, this.x, this.y, this.dir, this.power, this.squash);
  }
}

class Spikes {
  constructor(x, y, w, level) {
    this.x = x;
    this.y = y;
    this.w = w || 32;
    this.dead = false;
    this.box = { x: x - this.w / 2, y: y - 16, w: this.w, h: 16, spikes: true };
    level.boxes.push(this.box);
  }
  update(game) {
    const p = game.player;
    if (p.state !== 'normal') return;
    if (p.onGround && p.on === this.box) {
      p.hurt(game, p.x + p.dir * 4);
    }
  }
  draw(ctx) {
    drawSpikes(ctx, this.x, this.y, this.w);
  }
}

class Bug {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.dir = -1;
    this.wait = 0;
    this.level = level;
    this.dead = false;
    this.t = 0;
  }
  update(game) {
    this.t++;
    if (this.wait > 0) {
      if (--this.wait === 0) this.dir = -this.dir;
    } else {
      const nx = this.x + this.dir * 0.8;
      const ahead = this.level.ground(nx + this.dir * 14);
      let blocked = ahead === Infinity || Math.abs(ahead - this.y) > 14;
      for (const b of this.level.boxes) {
        if (!b.dead && nx + 14 > b.x && nx - 14 < b.x + b.w && this.y > b.y + 2) blocked = true;
      }
      if (blocked) this.wait = 40;
      else {
        this.x = nx;
        this.y = this.level.ground(this.x);
      }
    }
    enemyContact(game, this, { l: this.x - 14, r: this.x + 14, t: this.y - 24, b: this.y });
  }
  draw(ctx) {
    drawBug(ctx, this.x, this.y, this.wait > 0 ? -this.dir : this.dir, this.t);
  }
}

class Bee {
  constructor(x, y) {
    this.x0 = x;
    this.x = x;
    this.y0 = y;
    this.y = y;
    this.t = Math.random() * 100;
    this.dir = -1;
    this.dead = false;
  }
  update(game) {
    this.t++;
    this.x += this.dir * 1;
    if (Math.abs(this.x - this.x0) > 80) this.dir = -this.dir;
    this.y = this.y0 + Math.sin(this.t * 0.06) * 10;
    enemyContact(game, this, { l: this.x - 14, r: this.x + 14, t: this.y - 9, b: this.y + 9 });
  }
  draw(ctx) {
    drawBee(ctx, this.x, this.y, this.dir, this.t);
  }
}

class Checkpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.active = false;
    this.spin = 0;
    this.dead = false;
  }
  update(game) {
    if (this.spin > 0) this.spin--;
    if (this.active) return;
    const p = game.player;
    if (p.state === 'normal' && Math.abs(p.x - this.x) < 16 && p.y > this.y - 64) {
      this.active = true;
      this.spin = 60;
      game.setCheckpoint(this);
      Sound.play('checkpoint');
    }
  }
  draw(ctx) {
    const a = this.spin > 0 ? (this.spin / 60) * Math.PI * 6 : 0;
    drawCheckpoint(ctx, this.x, this.y, a, this.active);
  }
}

class Goal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.triggered = false;
    this.t = 0;
    this.dead = false;
  }
  update(game) {
    const p = game.player;
    if (!this.triggered && p.state === 'normal' && p.x > this.x) {
      this.triggered = true;
      game.passGoal();
      Sound.play('signpost');
    }
    if (this.triggered) {
      this.t++;
      if (this.t === 150) game.levelClear();
    }
  }
  draw(ctx, game) {
    const spinT = this.triggered ? Math.min(this.t, 120) : 0;
    const a = spinT < 120 ? spinT * (0.45 - spinT * 0.0035) : Math.PI;
    const w = Math.round((Math.abs(Math.cos(a)) * 22) / 2) * 2;
    const face = this.triggered && this.t >= 120 ? 'hero' : Math.cos(a) >= 0 ? 'boss' : 'hero';
    drawGoalSign(ctx, this.x, this.y, w, face);
  }
}

// ---------- ボス ----------
class Boss {
  constructor(arena, groundY) {
    this.arena = arena;
    this.groundY = groundY;
    this.x = arena.x + arena.w + 40;
    this.y = groundY - 150;
    this.hp = 8;
    this.state = 'enter';
    this.t = 0;
    this.dir = -1;
    this.flash = 0;
    this.dead = false;
    this.bombTimer = 120;
  }
  get box() {
    return { l: this.x - 26, r: this.x + 26, t: this.y - 20, b: this.y + 20 };
  }
  update(game) {
    this.t++;
    if (this.flash > 0) this.flash--;
    const A = this.arena;
    const p = game.player;
    if (this.state === 'enter') {
      this.x -= 1.2;
      this.y += (this.groundY - 110 - this.y) * 0.03;
      if (this.x < A.x + A.w - 70) { this.state = 'fight'; this.t = 0; }
      return;
    }
    if (this.state === 'fight') {
      this.x += this.dir * (1.2 + (8 - this.hp) * 0.12);
      if (this.x < A.x + 60) { this.x = A.x + 60; this.dir = 1; }
      if (this.x > A.x + A.w - 60) { this.x = A.x + A.w - 60; this.dir = -1; }
      // ときどき急降下
      const swoop = Math.max(0, Math.sin(this.t * 0.012)) ** 6;
      this.y = this.groundY - 110 + swoop * 55 + Math.sin(this.t * 0.08) * 4;
      if (--this.bombTimer <= 0) {
        this.bombTimer = this.hp > 4 ? 110 : 75;
        game.spawn(new Bomb(this.x, this.y + 20, game.level));
      }
      if (p.state === 'normal' && boxesOverlap(playerBox(p), this.box)) {
        if (p.attacking && this.flash === 0) {
          this.hp--;
          this.flash = 40;
          Sound.play('bossHit');
          game.addScore(100, this.x, this.y - 24);
          p.vx = -p.vx * 0.8 || (p.x < this.x ? -2 : 2);
          p.vy = p.y < this.y ? -4 : 3;
          p.gsp = -p.gsp;
          if (p.onGround) { p.onGround = false; p.on = null; }
          if (this.hp <= 0) {
            this.state = 'dying';
            this.t = 0;
            game.addScore(1000, this.x, this.y - 30);
          }
        } else if (!p.attacking) {
          p.hurt(game, this.x);
        }
      }
      return;
    }
    if (this.state === 'dying') {
      if (this.t % 8 === 0) {
        game.spawn(new Explosion(this.x + (Math.random() - 0.5) * 50, this.y + (Math.random() - 0.5) * 36));
        Sound.play('bomb');
      }
      if (this.t > 150) {
        this.state = 'flee';
        this.t = 0;
        game.bossDefeated();
      }
      return;
    }
    if (this.state === 'flee') {
      this.x += 2.5;
      this.y -= 1;
      if (this.t > 200) this.dead = true;
    }
  }
  draw(ctx, game) {
    if (this.flash > 0 && (this.flash >> 1) % 2) {
      drawBossShip(ctx, this.x, this.y, this.dir, game.frame, true, this.state);
    } else {
      drawBossShip(ctx, this.x, this.y, this.dir, game.frame, false, this.state);
    }
  }
}

class Bomb {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.level = level;
    this.dead = false;
    this.t = 0;
  }
  update(game) {
    this.t++;
    this.vy = Math.min(this.vy + 0.15, 6);
    this.y += this.vy;
    const g = this.level.ground(this.x);
    if (this.y + 6 >= g) {
      this.dead = true;
      game.spawn(new Blast(this.x, g - 10));
      Sound.play('bomb');
      return;
    }
    const p = game.player;
    if (p.state === 'normal' && boxesOverlap(playerBox(p), { l: this.x - 6, r: this.x + 6, t: this.y - 6, b: this.y + 6 })) {
      p.hurt(game, this.x);
    }
  }
  draw(ctx) {
    drawBomb(ctx, this.x, this.y, this.t);
  }
}

class Blast {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.dead = false;
  }
  update(game) {
    this.t++;
    if (this.t > 24) this.dead = true;
    const p = game.player;
    if (this.t < 16 && p.state === 'normal' && boxesOverlap(playerBox(p), { l: this.x - 14, r: this.x + 14, t: this.y - 14, b: this.y + 10 })) {
      p.hurt(game, this.x);
    }
  }
  draw(ctx) {
    drawBlast(ctx, this.x, this.y, this.t);
  }
}

// ---------- パーティクル ----------
class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.dead = false;
  }
  update() {
    if (++this.t > 30) this.dead = true;
  }
  draw(ctx) {
    drawExplosion(ctx, this.x, this.y, this.t);
  }
}

class Sparkle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.dead = false;
  }
  update() {
    if (++this.t > 16) this.dead = true;
  }
  draw(ctx) {
    drawSparkle(ctx, this.x, this.y, this.t);
  }
}

class Animal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() < 0.5 ? -2 : 2;
    this.vy = -4;
    this.t = 0;
    this.kind = Math.random() < 0.5 ? 'bird' : 'bunny';
    this.dead = false;
  }
  update(game) {
    this.t++;
    if (this.kind === 'bird' && this.t > 20) {
      this.vy = Math.max(this.vy - 0.1, -1.2);
      this.x += this.vx;
      this.y += this.vy + Math.sin(this.t * 0.4) * 0.8;
    } else {
      this.vy += 0.21875;
      this.x += this.vx;
      this.y += this.vy;
      const g = game.level.ground(this.x);
      if (g !== Infinity && this.y + 6 > g && this.vy > 0) {
        this.y = g - 6;
        this.vy = -4;
      }
    }
    if (this.t > 300) this.dead = true;
  }
  draw(ctx) {
    drawAnimal(ctx, this.x, this.y, this.kind, this.t, this.vx < 0);
  }
}

class ScorePopup {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.t = 0;
    this.dead = false;
  }
  update() {
    this.t++;
    if (this.t < 30) this.y -= 1;
    if (this.t > 50) this.dead = true;
  }
  draw(ctx) {
    Text.draw(ctx, this.text, this.x, this.y - 7, '#ffffff', { align: 'center' });
  }
}

class Dust {
  constructor(x, y, vx) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.t = 0;
    this.dead = false;
  }
  update() {
    this.t++;
    this.x += this.vx;
    this.y -= 0.3;
    if (this.t > 16) this.dead = true;
  }
  draw(ctx) {
    drawDust(ctx, this.x, this.y, this.t);
  }
}

function createObject(o, level) {
  switch (o.type) {
    case 'ring': return new Ring(o.x, o.y);
    case 'monitor': return new Monitor(o.x, o.y, o.kind, level);
    case 'spring': return new Spring(o.x, o.y, o.dir, o.power);
    case 'spikes': return new Spikes(o.x, o.y, o.w, level);
    case 'bug': return new Bug(o.x, o.y, level);
    case 'bee': return new Bee(o.x, o.y);
    case 'checkpoint': return new Checkpoint(o.x, o.y);
    case 'goal': return new Goal(o.x, o.y);
    default: return null;
  }
}
