// プレイヤー（ハリネズミ）の物理。値は 60fps・1フレームあたりのピクセル
const PHYS = {
  acc: 0.046875,
  dec: 0.5,
  frc: 0.046875,
  top: 6,
  jump: 6.5,
  grv: 0.21875,
  hurtGrv: 0.1875,
  air: 0.09375,
  slope: 0.125,
  rollUp: 0.078125,
  rollDown: 0.3125,
  rollFrc: 0.0234375,
  rollDec: 0.125,
  max: 16,
};
const HH_STAND = 19;
const HH_BALL = 14;

class Player {
  constructor(level, x) {
    this.level = level;
    this.hw = 9;
    this.hh = HH_STAND;
    this.x = x;
    this.y = level.ground(x) - this.hh;
    this.vx = 0;
    this.vy = 0;
    this.gsp = 0;
    this.angle = 0;
    this.drawAngle = 0;
    this.onGround = true;
    this.dir = 1;
    this.state = 'normal'; // normal | hurt | dead
    this.ball = false;
    this.rolling = false;
    this.jumping = false;
    this.spindash = false;
    this.charge = 0;
    this.crouch = false;
    this.lookUp = false;
    this.lookTimer = 0;
    this.skid = 0;
    this.spring = 0;
    this.ctrlLock = 0;
    this.invuln = 0;
    this.shield = false;
    this.shoes = 0;
    this.invincible = 0;
    this.on = null; // 乗っている足場
    this.loop = null;
    this.loopPhi = 0;
    this.loopCool = 0;
    this.anim = 0;
    this.deadTimer = 0;
    this.chain = 0;
    this.balance = false;
  }

  get feet() {
    return this.y + this.hh;
  }

  setHH(hh) {
    this.y += this.hh - hh;
    this.hh = hh;
  }

  get topSpeed() {
    return this.shoes > 0 ? PHYS.top * 2 : PHYS.top;
  }
  get accel() {
    return this.shoes > 0 ? PHYS.acc * 2 : PHYS.acc;
  }

  // 足元の床を探す（地形・ブロック・足場）
  findFloor(x, feet, upTol, downTol) {
    const L = this.level;
    let best = null;
    let gy = L.ground(x);
    let gx = x;
    if (gy === Infinity) {
      // 中央が穴なら左右のセンサーを試す
      const a = L.ground(x - this.hw + 2);
      const b = L.ground(x + this.hw - 2);
      if (a < b) { gy = a; gx = x - this.hw + 2; } else { gy = b; gx = x + this.hw - 2; }
    }
    if (gy !== Infinity && gy >= feet - upTol && gy <= feet + downTol) {
      best = { y: gy, angle: terrainAngle(L, gx), ref: null };
    }
    const consider = (top, ref) => {
      if (top >= feet - 4 && top <= feet + downTol && (!best || top < best.y)) best = { y: top, angle: 0, ref };
    };
    for (const b of L.boxes) {
      if (b.dead || (b.monitor && this.ball && !this.onGround && this.vy > 0)) continue;
      if (x + this.hw > b.x && x - this.hw < b.x + b.w) consider(b.y, b);
    }
    for (const p of L.platforms) {
      if (x + this.hw > p.x && x - this.hw < p.x + p.w) consider(p.y, p);
    }
    return best;
  }

  // 壁との衝突。ぶつかったら true
  wallCheck(prevX, onGround) {
    const L = this.level;
    let hit = false;
    const top = this.y - this.hh + 3;
    const bottom = this.y + this.hh - 4;
    for (const b of L.boxes) {
      if (b.dead) continue;
      if (b.monitor && this.ball) continue;
      if (this.x + this.hw > b.x && this.x - this.hw < b.x + b.w && bottom > b.y && top < b.y + b.h) {
        if (prevX <= b.x + b.w / 2) this.x = b.x - this.hw;
        else this.x = b.x + b.w + this.hw;
        hit = true;
      }
    }
    const moveDir = Math.sign(this.x - prevX);
    if (moveDir !== 0) {
      const tol = onGround ? 10 + Math.abs(this.x - prevX) : 12;
      const feet = this.y + this.hh;
      const blocked = xx => {
        const g = L.ground(xx + moveDir * this.hw);
        return g !== Infinity && g < feet - tol;
      };
      let n = 0;
      while (blocked(this.x) && n < 24) {
        this.x -= moveDir;
        n++;
        hit = true;
      }
    }
    // 画面外・ボス戦の範囲
    const minX = this.minX != null ? this.minX : this.hw;
    const maxX = this.maxX != null ? this.maxX : L.w - this.hw;
    if (this.x < minX) { this.x = minX; hit = true; }
    if (this.x > maxX) { this.x = maxX; hit = true; }
    return hit;
  }

  update(game) {
    const I = Input;
    this.anim++;
    if (this.state === 'dead') {
      this.vy += PHYS.grv;
      this.y += this.vy;
      this.deadTimer++;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.shoes > 0 && --this.shoes === 0) game.restoreMusic();
    if (this.invincible > 0 && --this.invincible === 0) game.restoreMusic();
    if (this.ctrlLock > 0) this.ctrlLock--;
    if (this.loopCool > 0) this.loopCool--;
    if (this.spring > 0) this.spring--;

    if (this.loop) this.updateLoop();
    else if (this.onGround) this.updateGround(I, game);
    else this.updateAir(I);

    if (this.y > this.level.deathY) this.die(game);
  }

  updateGround(I, game) {
    const ctrl = this.ctrlLock === 0;
    const L = I.held.left && ctrl;
    const R = I.held.right && ctrl;

    // 乗っている足場に運ばれる
    if (this.on && this.on.dx !== undefined) {
      this.x += this.on.dx;
      this.y += this.on.dy;
    }

    // スピンダッシュ
    if (this.spindash) {
      if (!I.held.down) {
        this.spindash = false;
        this.rolling = true;
        this.ball = true;
        this.gsp = this.dir * (8 + Math.floor(this.charge) / 2);
        this.charge = 0;
        Sound.play('release');
        game.camLag = 16;
      } else {
        if (I.pressed.jump) {
          this.charge = Math.min(this.charge + 2, 8);
          Sound.play('spindash', this.charge);
        }
        this.charge -= this.charge / 32;
        this.snapToFloor(game);
        return;
      }
    }

    // ジャンプ
    if (I.pressed.jump) {
      if (this.crouch) {
        this.spindash = true;
        this.charge = 0;
        this.crouch = false;
        if (!this.ball) this.setHH(HH_BALL);
        this.ball = true;
        Sound.play('spindash', 0);
        return;
      }
      const s = Math.sin(this.angle);
      const c = Math.cos(this.angle);
      this.vx = this.gsp * c + PHYS.jump * s;
      this.vy = this.gsp * s - PHYS.jump * c;
      this.onGround = false;
      this.on = null;
      this.jumping = true;
      this.rolling = false;
      if (!this.ball) this.setHH(HH_BALL);
      this.ball = true;
      this.y -= 1;
      Sound.play('jump');
      return;
    }

    // 転がり開始
    if (!this.rolling && I.held.down && Math.abs(this.gsp) >= 1) {
      this.rolling = true;
      if (!this.ball) this.setHH(HH_BALL);
      this.ball = true;
      Sound.play('roll');
    }
    this.crouch = I.held.down && !this.rolling && Math.abs(this.gsp) < 1;
    this.lookUp = I.held.up && !this.rolling && Math.abs(this.gsp) < 0.5;
    this.lookTimer = this.crouch || this.lookUp ? this.lookTimer + 1 : 0;

    // 坂の重力
    const sinA = Math.sin(this.angle);
    if (this.rolling) {
      const downhill = Math.sign(this.gsp) === Math.sign(sinA);
      this.gsp += (downhill ? PHYS.rollDown : PHYS.rollUp) * sinA;
    } else if (Math.abs(this.angle) > 0.12 || this.gsp !== 0) {
      this.gsp += PHYS.slope * sinA;
    }

    // 入力
    if (!this.rolling) {
      const top = this.topSpeed;
      const acc = this.accel;
      if (this.crouch || this.lookUp) {
        this.gsp -= Math.min(Math.abs(this.gsp), PHYS.frc) * Math.sign(this.gsp);
      } else if (L) {
        if (this.gsp > 0) {
          if (this.gsp > 4 && this.skid === 0 && Math.abs(this.angle) < 0.5) { this.skid = 1; Sound.play('skid'); }
          this.gsp -= PHYS.dec;
          if (this.gsp <= 0) this.gsp = -0.5;
        } else if (this.gsp > -top) {
          this.gsp = Math.max(this.gsp - acc, -top);
        }
        if (this.gsp <= 0) this.dir = -1;
      } else if (R) {
        if (this.gsp < 0) {
          if (this.gsp < -4 && this.skid === 0 && Math.abs(this.angle) < 0.5) { this.skid = 1; Sound.play('skid'); }
          this.gsp += PHYS.dec;
          if (this.gsp >= 0) this.gsp = 0.5;
        } else if (this.gsp < top) {
          this.gsp = Math.min(this.gsp + acc, top);
        }
        if (this.gsp >= 0) this.dir = 1;
      } else {
        this.gsp -= Math.min(Math.abs(this.gsp), PHYS.frc) * Math.sign(this.gsp);
      }
      if (this.skid && (Math.abs(this.gsp) < 0.6 || (!L && !R) || (L && this.gsp < 0) || (R && this.gsp > 0))) this.skid = 0;
    } else {
      this.gsp -= Math.min(Math.abs(this.gsp), PHYS.rollFrc) * Math.sign(this.gsp);
      if (L && this.gsp > 0) this.gsp -= PHYS.rollDec;
      if (R && this.gsp < 0) this.gsp += PHYS.rollDec;
      if (Math.abs(this.gsp) < 0.5) {
        this.rolling = false;
        this.ball = false;
        this.setHH(HH_STAND);
      }
    }
    this.gsp = Math.max(-PHYS.max, Math.min(PHYS.max, this.gsp));

    // 移動
    const c = Math.cos(this.angle);
    const prevX = this.x;
    this.vx = this.gsp * c;
    this.x += this.vx;
    if (this.wallCheck(prevX, true)) {
      this.gsp = 0;
      this.vx = 0;
    }

    // ループに入る
    if (this.loopCool === 0 && this.gsp > 4) {
      for (const lp of this.level.loops) {
        if (prevX < lp.cx && this.x >= lp.cx && Math.abs(this.feet - (lp.cy + lp.r)) < 12) {
          this.loop = lp;
          this.loopPhi = 0;
          this.on = null;
          return;
        }
      }
    }

    this.snapToFloor(game);
  }

  snapToFloor() {
    const f = this.findFloor(this.x, this.feet, 8 + Math.abs(this.vx), 6 + Math.min(Math.abs(this.vx), 10));
    if (f) {
      this.y = f.y - this.hh;
      this.angle = f.angle;
      this.on = f.ref;
      // 崖っぷち判定（見た目用）
      const L = this.level;
      this.balance = !f.ref && this.gsp === 0 && (L.ground(this.x + this.dir * 6) === Infinity);
    } else {
      // 地面から離れる
      const s = Math.sin(this.angle);
      const c = Math.cos(this.angle);
      this.vx = this.gsp * c;
      this.vy = this.gsp * s;
      this.onGround = false;
      this.on = null;
      this.angle = 0;
    }
  }

  updateLoop() {
    const lp = this.loop;
    const R = lp.r - this.hh;
    // 接線方向の重力
    this.gsp -= PHYS.slope * Math.sin(this.loopPhi) * (this.rolling ? 1.6 : 1);
    if (!this.rolling) {
      const top = this.topSpeed;
      if (Input.held.right && this.gsp < top) this.gsp += this.accel;
    }
    this.loopPhi += this.gsp / R;
    const tangent = -this.loopPhi;
    // 遅すぎると上で落ちる
    if (this.gsp < 3 && this.loopPhi > Math.PI * 0.5 && this.loopPhi < Math.PI * 1.5) {
      this.vx = Math.cos(tangent) * this.gsp;
      this.vy = Math.sin(tangent) * this.gsp;
      this.loop = null;
      this.onGround = false;
      this.angle = 0;
      this.loopCool = 60;
      return;
    }
    if (this.loopPhi >= Math.PI * 2) {
      this.loop = null;
      this.loopCool = 40;
      this.x = lp.cx + 1;
      this.y = lp.cy + lp.r - this.hh;
      this.angle = 0;
      return;
    }
    this.x = lp.cx + Math.sin(this.loopPhi) * R;
    this.y = lp.cy + Math.cos(this.loopPhi) * R;
    this.angle = tangent;
    this.vx = Math.cos(tangent) * this.gsp;
    this.vy = Math.sin(tangent) * this.gsp;
  }

  updateAir(I) {
    const ctrl = this.ctrlLock === 0 && this.state !== 'hurt';
    if (this.jumping && !I.held.jump && this.vy < -4) this.vy = -4;
    const top = this.topSpeed;
    if (ctrl) {
      const a = PHYS.air * (this.shoes > 0 ? 2 : 1);
      if (I.held.left) {
        if (this.vx > -top) this.vx = Math.max(this.vx - a, -top);
        this.dir = -1;
      }
      if (I.held.right) {
        if (this.vx < top) this.vx = Math.min(this.vx + a, top);
        this.dir = 1;
      }
    }
    if (this.vy < 0 && this.vy > -4) this.vx -= this.vx / 0.125 / 256;
    this.vy += this.state === 'hurt' ? PHYS.hurtGrv : PHYS.grv;
    if (this.vy > 16) this.vy = 16;

    const prevX = this.x;
    this.x += this.vx;
    if (this.wallCheck(prevX, false)) this.vx = 0;

    const prevFeet = this.feet;
    this.y += this.vy;

    // 天井（ブロックの底）
    if (this.vy < 0) {
      for (const b of this.level.boxes) {
        if (b.dead) continue;
        if (this.x + this.hw > b.x && this.x - this.hw < b.x + b.w && this.y - this.hh < b.y + b.h && this.y > b.y + b.h) {
          this.y = b.y + b.h + this.hh;
          this.vy = 0;
        }
      }
    }

    if (this.vy >= 0) {
      const f = this.findFloor(this.x, this.feet, Math.max(12, this.feet - prevFeet + 12), 0);
      if (f && f.y >= prevFeet - 12) this.land(f);
    }

    this.angle = 0;
  }

  land(f) {
    this.y = f.y - this.hh;
    this.angle = f.angle;
    this.on = f.ref;
    const s = Math.sin(this.angle);
    const c = Math.cos(this.angle);
    this.gsp = Math.abs(this.angle) < 0.35 ? this.vx : this.vx * c + this.vy * s;
    this.onGround = true;
    this.jumping = false;
    this.spring = 0;
    this.chain = 0;
    if (this.state === 'hurt') {
      this.state = 'normal';
      this.gsp = 0;
      this.vx = 0;
    }
    if (this.ball && !(Input.held.down && Math.abs(this.gsp) >= 1)) {
      this.ball = false;
      this.rolling = false;
      this.setHH(HH_STAND);
    } else if (this.ball) {
      this.rolling = true;
    }
  }

  // ボール状態か（敵を倒せるか）
  get attacking() {
    return this.ball || this.invincible > 0;
  }

  bounce(vy) {
    this.onGround = false;
    this.on = null;
    this.loop = null;
    this.vy = vy;
    this.angle = 0;
  }

  launchSpring(vy) {
    this.bounce(vy);
    this.jumping = false;
    this.spring = 40;
    if (this.ball) {
      this.ball = false;
      this.rolling = false;
      this.setHH(HH_STAND);
    }
    this.spindash = false;
    Sound.play('spring');
  }

  hurt(game, srcX) {
    if (this.state !== 'normal' || this.invuln > 0 || this.invincible > 0) return;
    if (!this.shield && game.rings === 0) {
      this.die(game);
      return;
    }
    if (this.shield) {
      this.shield = false;
      Sound.play('hurt');
    } else {
      game.scatterRings(this.x, this.y, game.rings);
      game.rings = 0;
      Sound.play('ringLoss');
    }
    this.state = 'hurt';
    this.invuln = 120;
    const d = this.x < srcX ? -1 : 1;
    this.loop = null;
    this.onGround = false;
    this.on = null;
    this.spindash = false;
    this.rolling = false;
    if (this.ball) { this.ball = false; this.setHH(HH_STAND); }
    this.vx = 2 * d;
    this.vy = -4;
    this.y -= 2;
  }

  die(game) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.loop = null;
    this.onGround = false;
    this.ball = false;
    this.shield = false;
    this.vx = 0;
    this.vy = this.y > this.level.deathY ? -2 : -7;
    if (this.y > this.level.deathY) this.y = this.level.deathY;
    this.deadTimer = 0;
    Sound.play('hurt');
    game.onPlayerDeath();
  }
}
