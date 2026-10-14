// ゲーム全体の進行・カメラ・描画
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;

const ACT_CLEAR_DELAY = 150;

function loadHiscore() {
  try {
    return parseInt(localStorage.getItem('nisesonic.hiscore') || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}
function saveHiscore(v) {
  try {
    localStorage.setItem('nisesonic.hiscore', String(v));
  } catch (e) {
    /* 保存できなくてもゲームは続行 */
  }
}

class Game {
  constructor() {
    this.state = 'title';
    this.frame = 0;
    this.titleFrame = 0;
    this.score = 0;
    this.lives = 3;
    this.rings = 0;
    this.time = 0;
    this.actIndex = 0;
    this.hiscore = loadHiscore();
    this.paused = false;
    this.cam = { x: 0, y: 0 };
    this.titleLevel = ACTS[0]();
  }

  startGame() {
    this.score = 0;
    this.lives = 3;
    this.actIndex = 0;
    this.checkpoint = null;
    this.loadAct();
  }

  loadAct() {
    const level = ACTS[this.actIndex]();
    this.level = level;
    this.pal = PALETTES[level.palette];
    this.objects = [];
    for (const o of level.objects) {
      const obj = createObject(o, level);
      if (obj) this.objects.push(obj);
    }
    let sx = level.start.x;
    this.time = 0;
    const cp = this.checkpoint && this.checkpoint.act === this.actIndex ? this.checkpoint : null;
    if (cp) {
      sx = cp.x;
      this.time = cp.time;
      for (const o of this.objects) if (o instanceof Checkpoint && o.x <= cp.x) o.active = true;
    }
    this.player = new Player(level, sx);
    this.rings = 0;
    this.state = 'play';
    this.phase = 'play';
    this.cardTimer = 170;
    this.goalPassed = false;
    this.boss = null;
    this.bossStarted = false;
    this.inputLocked = false;
    this.paused = false;
    this.camLag = 0;
    this.lockCamX = null;
    this.cam.x = Math.max(0, this.player.x - 192);
    this.cam.y = this.player.y - 128;
    this.clampCam();
    Sound.playMusic(level.music);
  }

  restoreMusic() {
    if (this.state !== 'play' || this.phase !== 'play') return;
    Sound.playMusic(this.bossStarted ? 'boss' : this.level.music);
  }

  spawn(obj) {
    this.objects.push(obj);
  }

  addScore(n, x, y, noPopup) {
    this.score += n;
    if (!noPopup && x !== undefined) this.spawn(new ScorePopup(x, y, String(n)));
  }

  collectRing() {
    const before = this.rings;
    this.rings++;
    Sound.play('ring');
    if (Math.floor(this.rings / 100) > Math.floor(before / 100)) this.extraLife();
  }

  extraLife() {
    this.lives++;
    Sound.jingle('oneup');
  }

  scatterRings(x, y, n) {
    n = Math.min(n, 32);
    let a = (101.25 * Math.PI) / 180;
    let spd = 4;
    let flip = false;
    for (let i = 0; i < n; i++) {
      if (i === 16) {
        spd = 2;
        a = (101.25 * Math.PI) / 180;
      }
      const vx = Math.cos(a) * spd * (flip ? -1 : 1);
      const vy = -Math.sin(a) * spd;
      this.spawn(new LooseRing(x, y, vx, vy));
      if (flip) a += (22.5 * Math.PI) / 180;
      flip = !flip;
    }
  }

  applyItem(kind) {
    const p = this.player;
    switch (kind) {
      case 'rings':
        for (let i = 0; i < 10; i++) {
          const before = this.rings;
          this.rings++;
          if (Math.floor(this.rings / 100) > Math.floor(before / 100)) this.extraLife();
        }
        Sound.play('ring');
        break;
      case 'shield':
        p.shield = true;
        Sound.play('shield');
        break;
      case 'shoes':
        p.shoes = 1200;
        Sound.play('select');
        break;
      case 'invincible':
        p.invincible = 1200;
        Sound.play('select');
        break;
      case 'life':
        this.extraLife();
        break;
    }
  }

  setCheckpoint(cp) {
    this.checkpoint = { act: this.actIndex, x: cp.x, time: this.time };
  }

  passGoal() {
    this.goalPassed = true;
    this.lockCamX = this.cam.x;
  }

  bossDefeated() {
    this.goalPassed = true;
    this.bossTimer = 120;
    this.player.maxX = this.level.w - 80;
    Sound.stopMusic();
  }

  levelClear() {
    this.phase = 'results';
    this.inputLocked = true;
    const s = Math.floor(this.time / 60);
    const table = [[30, 50000], [45, 10000], [60, 5000], [90, 4000], [120, 3000], [180, 2000], [240, 1000], [300, 500]];
    let tb = 0;
    for (const [lim, v] of table) {
      if (s < lim) { tb = v; break; }
    }
    this.timeBonus = tb;
    this.ringBonus = this.rings * 100;
    this.resultsTimer = 0;
    this.afterTally = 0;
    Sound.playMusic('clear');
  }

  onPlayerDeath() {
    Sound.stopMusic();
    this.inputLocked = true;
  }

  clampCam() {
    const L = this.level;
    let minX = 0;
    let maxX = L.w - VIEW_W;
    this.cam.x = Math.max(minX, Math.min(maxX, this.cam.x));
    this.cam.y = Math.min(this.cam.y, L.maxY + 90 - VIEW_H);
  }

  updateCamera() {
    const p = this.player;
    if (p.state === 'dead') return;
    const c = this.cam;
    if (this.camLag > 0) this.camLag--;
    else if (this.lockCamX === null) {
      const sx = p.x - c.x;
      if (sx > 200) c.x += Math.min(sx - 200, 24);
      if (sx < 184) c.x -= Math.min(184 - sx, 24);
    } else {
      // ゴール後・ボス戦ではカメラを固定位置へ寄せる
      c.x += Math.sign(this.lockCamX - c.x) * Math.min(Math.abs(this.lockCamX - c.x), 4);
    }
    let focus = 128;
    if (p.lookUp && p.lookTimer > 60) focus += 80;
    if (p.crouch && p.lookTimer > 60) focus -= 80;
    const sy = p.y - c.y;
    if (p.onGround || p.loop) {
      const sp = Math.abs(p.gsp) >= 8 ? 16 : 6;
      const d = sy - focus;
      c.y += Math.sign(d) * Math.min(Math.abs(d), sp);
    } else {
      if (sy < focus - 32) c.y -= Math.min(focus - 32 - sy, 16);
      if (sy > focus + 32) c.y += Math.min(sy - focus - 32, 16);
    }
    const L = this.level;
    c.x = Math.max(0, Math.min(L.w - VIEW_W, c.x));
    c.y = Math.min(c.y, L.maxY + 90 - VIEW_H);
  }

  update() {
    Input.update();
    if (this.state === 'title') {
      this.titleFrame++;
      if (Input.anyPressed()) {
        Sound.init();
        Sound.play('select');
        this.startGame();
      }
      return;
    }
    if (this.state === 'gameover') {
      this.overTimer++;
      if (this.overTimer > 300 || (this.overTimer > 60 && Input.anyPressed())) this.toTitle();
      return;
    }
    if (this.state === 'ending') {
      this.endTimer++;
      this.titleFrame++;
      if (this.endTimer > 120 && Input.anyPressed()) this.toTitle();
      return;
    }

    // プレイ中
    if (Input.pressed.start && this.phase === 'play' && this.player.state !== 'dead') {
      this.paused = !this.paused;
      if (this.paused) Sound.stopMusic();
      else this.restoreMusic();
    }
    if (this.paused) return;
    if (this.inputLocked || this.cardTimer > 120) {
      for (const k in Input.held) {
        Input.held[k] = false;
        Input.pressed[k] = false;
      }
      if (this.phase === 'results' || this.goalPassed) Input.held.right = this.phase === 'results' && this.actIndex === 0;
    }
    this.frame++;
    if (this.cardTimer > 0) this.cardTimer--;

    const p = this.player;
    if (!this.goalPassed && p.state !== 'dead') {
      this.time++;
      if (this.time >= 10 * 3600) {
        this.time = 10 * 3600 - 1;
        p.die(this);
      }
    }

    for (const pl of this.level.platforms) {
      const ox = pl.x;
      const oy = pl.y;
      const ph = (this.frame / pl.period) * Math.PI * 2 + pl.phase;
      pl.x = pl.x0 + Math.sin(ph) * pl.ax;
      pl.y = pl.y0 + Math.sin(ph) * pl.ay;
      pl.dx = pl.x - ox;
      pl.dy = pl.y - oy;
    }

    p.update(this);
    p.pushing = false;

    if (p.spindash && this.frame % 4 === 0) this.spawn(new Dust(p.x - p.dir * 10, p.y + p.hh - 3, -p.dir * 1.5));
    if (p.skid && p.onGround && this.frame % 4 === 0) this.spawn(new Dust(p.x, p.y + p.hh - 2, 0));

    // ボス戦の開始
    const A = this.level.arena;
    if (A && !this.bossStarted && p.x > A.x + 60) {
      this.bossStarted = true;
      this.lockCamX = A.x;
      p.minX = A.x + p.hw;
      p.maxX = A.x + A.w - p.hw;
      this.boss = new Boss(A, this.level.ground(A.x + 40));
      this.spawn(this.boss);
      Sound.playMusic('boss');
    }
    if (this.bossTimer > 0 && --this.bossTimer === 0) this.levelClear();

    const left = this.cam.x - 320;
    const right = this.cam.x + VIEW_W + 320;
    for (const o of this.objects) {
      const ox = o.x !== undefined ? o.x : 0;
      if (o instanceof Boss || (ox > left && ox < right)) o.update(this);
    }
    this.objects = this.objects.filter(o => !o.dead);

    this.updateCamera();

    if (p.state === 'dead' && p.deadTimer > 110) {
      this.lives--;
      if (this.lives < 0) {
        this.gameOver();
      } else {
        this.loadAct();
      }
      return;
    }

    if (this.phase === 'results') this.updateResults();
  }

  updateResults() {
    this.resultsTimer++;
    if (this.resultsTimer <= 120) return;
    if (this.timeBonus > 0 || this.ringBonus > 0) {
      const a = Math.min(this.timeBonus, 100);
      const b = Math.min(this.ringBonus, 100);
      this.timeBonus -= a;
      this.ringBonus -= b;
      this.score += a + b;
      if (this.resultsTimer % 4 === 0) Sound.play('tally');
    } else if (++this.afterTally > 150) {
      this.nextAct();
    }
  }

  nextAct() {
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      saveHiscore(this.hiscore);
    }
    this.actIndex++;
    this.checkpoint = null;
    if (this.actIndex >= ACTS.length) {
      this.state = 'ending';
      this.endTimer = 0;
      Sound.playMusic('zone');
    } else {
      this.loadAct();
    }
  }

  gameOver() {
    this.state = 'gameover';
    this.overTimer = 0;
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      saveHiscore(this.hiscore);
    }
    Sound.playMusic('gameover');
  }

  toTitle() {
    this.state = 'title';
    this.titleFrame = 0;
    Sound.stopMusic();
  }

  // ---------- 描画 ----------
  render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.state === 'title') return this.renderTitle();
    if (this.state === 'gameover') return this.renderGameOver();
    if (this.state === 'ending') return this.renderEnding();

    const L = this.level;
    const cam = { x: Math.round(this.cam.x), y: Math.round(this.cam.y) };
    drawBackground(ctx, cam, L.palette, this.frame, L);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const lp of L.loops) if (lp.cx + lp.r + 30 > cam.x && lp.cx - lp.r - 30 < cam.x + VIEW_W) drawLoopBack(ctx, lp, this.pal);
    for (const d of L.deco) if (d.x > cam.x - 40 && d.x < cam.x + VIEW_W + 40) drawDeco(ctx, d, this.frame, this.pal);
    drawTerrain(ctx, L, cam, this.pal);
    drawBoxes(ctx, L, this.pal);
    drawPlatforms(ctx, L, this.pal);
    const left = cam.x - 64;
    const right = cam.x + VIEW_W + 64;
    for (const o of this.objects) {
      if (o instanceof Boss || (o.x > left && o.x < right)) o.draw(ctx, this);
    }
    this.renderPlayer();
    ctx.restore();

    drawHUD(ctx, this);
    if (this.cardTimer > 0) this.renderTitleCard();
    if (this.phase === 'results') this.renderResults();
  }

  renderPlayer() {
    const p = this.player;
    if (p.invuln > 0 && p.state === 'normal' && (p.invuln >> 2) % 2) return;
    let pose = 'stand';
    const sp = Math.abs(p.onGround || p.loop ? p.gsp : p.vx);
    p.runPhase = (p.runPhase || 0) + 0.12 + sp * 0.07;
    p.ballRot = (p.ballRot || 0) + 0.25 + sp * 0.06;
    if (p.state === 'dead') pose = 'dead';
    else if (p.state === 'hurt') pose = 'hurt';
    else if (p.ball || p.spindash) pose = 'ball';
    else if (p.spring > 0 && p.vy < 0) pose = 'spring';
    else if (p.skid) pose = 'skid';
    else if (p.crouch) pose = 'crouch';
    else if (p.lookUp) pose = 'up';
    else if (p.balance) pose = 'balance';
    else if (sp >= 9.5) pose = 'dash';
    else if (sp > 0.1 || !p.onGround) pose = 'run';
    if (p.spindash) p.ballRot += 0.6;

    let ang = p.onGround || p.loop ? p.angle : 0;
    if (Math.abs(ang) < 0.25 && !p.loop) ang = 0;
    if (pose === 'ball' || pose === 'dead' || pose === 'hurt') ang = 0;
    p.drawAngle += (ang - p.drawAngle) * (p.loop ? 1 : 0.5);

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.drawAngle);
    ctx.scale(p.dir, 1);
    const t = pose === 'ball' ? p.ballRot : pose === 'run' || pose === 'dash' ? p.runPhase : this.frame;
    drawHero(ctx, pose, t);
    ctx.restore();

    if (p.shield && p.state !== 'dead') {
      const r = 21 + Math.sin(this.frame * 0.2);
      ctx.fillStyle = 'rgba(90,200,255,0.25)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,240,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, this.frame * 0.1, this.frame * 0.1 + 2);
      ctx.stroke();
    }
    if (p.invincible > 0) {
      for (let i = 0; i < 6; i++) {
        const a = this.frame * 0.25 + (i * Math.PI) / 3;
        const rr = 18 + Math.sin(this.frame * 0.3 + i) * 4;
        ctx.fillStyle = i % 2 ? '#ffe36b' : '#ffffff';
        ctx.fillRect(p.x + Math.cos(a) * rr - 1.5, p.y + Math.sin(a) * rr - 1.5, 3, 3);
      }
    }
    if (p.shoes > 0 && sp > 4 && this.frame % 3 === 0) {
      this.spawn(new Dust(p.x - p.dir * 8, p.y + 4, -p.dir));
    }
  }

  renderTitleCard() {
    const t = 170 - this.cardTimer;
    const out = this.cardTimer < 40 ? (40 - this.cardTimer) * 14 : 0;
    const slide = Math.max(0, 1 - t / 20);
    ctx.save();
    if (t < 130) {
      ctx.fillStyle = '#1f3fd6';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(40 - slide * 200 - out, 0, 46, VIEW_H);
    ctx.fillStyle = '#e2262a';
    ctx.beginPath();
    ctx.moveTo(VIEW_W + slide * 300 + out, 150);
    ctx.lineTo(120 + slide * 300 + out, 150);
    ctx.lineTo(140 + slide * 300 + out, 176);
    ctx.lineTo(VIEW_W + slide * 300 + out, 176);
    ctx.fill();
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    const tx = 120 + slide * 400 + out;
    hudText(ctx, `${this.level.name}`, tx, 90);
    hudText(ctx, 'ZONE', tx + 70, 112);
    ctx.font = '12px "Press Start 2P", monospace';
    hudText(ctx, `ACT ${this.level.act}`, tx + 150, 158, '#ffd23a');
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  renderResults() {
    const t = this.resultsTimer;
    const slide = Math.max(0, 1 - t / 30);
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    const x = 90 + slide * -300;
    hudText(ctx, 'NISE GOT', x, 50);
    hudText(ctx, `THROUGH ACT ${this.level.act}`, x + 20, 66);
    const y0 = 110;
    const r = 90 - slide * -300;
    hudText(ctx, 'TIME BONUS', r, y0, '#ffd23a');
    hudText(ctx, String(this.timeBonus), r + 160, y0);
    hudText(ctx, 'RING BONUS', r, y0 + 18, '#ffd23a');
    hudText(ctx, String(this.ringBonus), r + 160, y0 + 18);
    hudText(ctx, 'SCORE', r, y0 + 40, '#ffd23a');
    hudText(ctx, String(this.score), r + 160, y0 + 40);
    ctx.textBaseline = 'alphabetic';
  }

  renderTitle() {
    const t = this.titleFrame;
    const L = this.titleLevel;
    const cam = { x: (t * 2) % (L.w - VIEW_W), y: L.maxY - 260 };
    drawBackground(ctx, cam, 'hill', t, L);
    ctx.fillStyle = 'rgba(10,20,80,0.25)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // エンブレム
    const cx = VIEW_W / 2;
    const bob = Math.sin(t * 0.05) * 3;
    ctx.save();
    ctx.translate(cx, 92 + bob);
    ellipse(ctx, 0, 0, 74, 52, 0, '#ffd23a');
    ellipse(ctx, 0, 0, 68, 46, 0, '#1f3fd6');
    ctx.fillStyle = '#ffffff22';
    for (let i = -3; i <= 3; i++) ctx.fillRect(i * 20 - 2, -46, 4, 92);
    ctx.save();
    ctx.translate(-4, -6);
    ctx.scale(2.6, 2.6);
    drawHead(ctx, 0, 0, 'grin');
    ctx.translate(14, 6);
    ctx.rotate(-0.5);
    drawGlove(ctx, 0, 0);
    ctx.restore();
    ctx.restore();

    // ロゴ
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillStyle = '#0b1a6b';
    ctx.fillText('NISE SONIC', cx + 3, 130 + bob + 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NISE SONIC', cx, 130 + bob);
    ctx.fillStyle = '#e2262a';
    ctx.fillRect(cx - 80, 160 + bob, 160, 14);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('THE HEDGEHOG?', cx, 163 + bob);

    if ((t >> 5) % 2 === 0) {
      ctx.font = '10px "Press Start 2P", monospace';
      hudText(ctx, 'PRESS START', cx, 192);
    }
    ctx.font = '8px "Press Start 2P", monospace';
    hudText(ctx, `HI-SCORE ${this.hiscore}`, cx, 212, '#ffd23a');
    hudText(ctx, '←→ MOVE  ↓ ROLL  Z/SPACE JUMP  M MUTE', cx, 226, '#cfe0ff');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  renderGameOver() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = Math.min(1, this.overTimer / 40);
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    hudText(ctx, 'GAME', VIEW_W / 2 - 80 - (1 - k) * 200, 110);
    hudText(ctx, 'OVER', VIEW_W / 2 + 16 + (1 - k) * 200, 110);
    ctx.textBaseline = 'alphabetic';
  }

  renderEnding() {
    const t = this.titleFrame;
    const L = this.titleLevel;
    drawBackground(ctx, { x: t * 3, y: L.maxY - 260 }, 'sunset', t, L);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 走り抜ける主人公
    ctx.save();
    ctx.translate(VIEW_W / 2, 150);
    drawHero(ctx, 'dash', t * 1.2);
    ctx.restore();
    ctx.fillStyle = '#3d5a2a';
    ctx.fillRect(0, 169, VIEW_W, 71);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '14px "Press Start 2P", monospace';
    hudText(ctx, 'CONGRATULATIONS!', VIEW_W / 2, 40, '#ffd23a');
    ctx.font = '8px "Press Start 2P", monospace';
    hudText(ctx, 'NISE HILL ZONE CLEAR', VIEW_W / 2, 70);
    hudText(ctx, `SCORE ${this.score}`, VIEW_W / 2, 90);
    hudText(ctx, 'THANK YOU FOR PLAYING', VIEW_W / 2, 190);
    if (this.endTimer > 120 && (t >> 5) % 2 === 0) hudText(ctx, 'PRESS START', VIEW_W / 2, 210, '#cfe0ff');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

const game = new Game();
window.game = game;
Input.bindTouch();

let last = performance.now();
let acc = 0;
const STEP = 1000 / 60;
function loop(now) {
  acc += Math.min(now - last, 100);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 4) {
    game.update();
    acc -= STEP;
    steps++;
  }
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
