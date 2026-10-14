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
    this.cam.x = Math.max(0, this.player.x - 152);
    this.cam.y = this.player.y - 96;
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
      if (sx > 160) c.x += Math.min(sx - 160, 24);
      if (sx < 144) c.x -= Math.min(144 - sx, 24);
    } else {
      // ゴール後・ボス戦ではカメラを固定位置へ寄せる
      c.x += Math.sign(this.lockCamX - c.x) * Math.min(Math.abs(this.lockCamX - c.x), 4);
    }
    let focus = 96;
    if (p.lookUp && p.lookTimer > 60) focus += 64;
    if (p.crouch && p.lookTimer > 60) focus -= 64;
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
    ctx.imageSmoothingEnabled = false;
    if (this.state === 'title') return this.renderTitle();
    if (this.state === 'gameover') return this.renderGameOver();
    if (this.state === 'ending') return this.renderEnding();

    const L = this.level;
    const cam = { x: Math.round(this.cam.x), y: Math.round(this.cam.y) };
    drawBackground(ctx, cam, L.palette, this.frame, L);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const lp of L.loops) if (lp.cx + lp.r + 30 > cam.x && lp.cx - lp.r - 30 < cam.x + VIEW_W) drawLoopBack(ctx, lp, this.pal, L.palette);
    for (const d of L.deco) if (d.x > cam.x - 40 && d.x < cam.x + VIEW_W + 40) drawDeco(ctx, d, this.frame, this.pal, L.palette);
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

  // ポーズとコマ番号を決めてドット絵を描く
  renderPlayer() {
    const p = this.player;
    const sp = Math.abs(p.onGround || p.loop ? p.gsp : p.vx);
    let pose = 'stand';
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

    // 本家と同じく、速いほど 1 コマの長さが短くなる
    p.animTimer = (p.animTimer || 0) - 1;
    if (p.animTimer <= 0) {
      p.animFrame = (p.animFrame || 0) + 1;
      if (pose === 'ball') p.animTimer = p.spindash ? 1 : Math.max(1, 4 - Math.floor(sp / 2));
      else p.animTimer = Math.max(1, 8 - Math.floor(sp));
    }
    let fi = p.animFrame;
    if (pose === 'stand') fi = this.frame >> 5;
    if (pose === 'balance' || pose === 'push') fi = this.frame >> 3;

    let ang = p.onGround || p.loop ? p.angle : 0;
    if (pose === 'ball' || pose === 'dead' || pose === 'hurt' || pose === 'crouch') ang = 0;
    // 傾きは 45 度刻み
    ang = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);

    const blink = p.invuln > 0 && p.state === 'normal' && (p.invuln >> 2) % 2;
    if (!blink) drawHero(ctx, pose, fi, p.x, p.y, p.dir, ang);

    if (p.shield && p.state !== 'dead') drawShield(ctx, p.x, p.y, this.frame);
    if (p.invincible > 0) {
      for (let i = 0; i < 6; i++) {
        const a = this.frame * 0.25 + (i * Math.PI) / 3;
        const rr = 18 + Math.sin(this.frame * 0.3 + i) * 4;
        ctx.fillStyle = i % 2 ? '#ffe36b' : '#ffffff';
        ctx.fillRect(Math.round(p.x + Math.cos(a) * rr) - 1, Math.round(p.y + Math.sin(a) * rr) - 1, 3, 3);
      }
    }
    if (p.shoes > 0 && sp > 4 && this.frame % 3 === 0) {
      this.spawn(new Dust(p.x - p.dir * 8, p.y + 4, -p.dir));
    }
  }

  renderTitleCard() {
    const t = 170 - this.cardTimer;
    const out = this.cardTimer < 40 ? (40 - this.cardTimer) * 12 : 0;
    const slide = Math.max(0, 1 - t / 20);
    if (t < 130) {
      ctx.fillStyle = '#2040c0';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // 黄色の縦帯と赤い帯
    const bx = Math.round(24 - slide * 160 - out);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx - 2, 0, 44, VIEW_H);
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(bx, 0, 40, VIEW_H);
    ctx.fillStyle = '#c09000';
    for (let y = 0; y < VIEW_H; y += 8) ctx.fillRect(bx + 32, y, 8, 4);
    const rx = Math.round(100 + slide * 300 + out);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(rx - 2, 136, VIEW_W, 28);
    ctx.fillStyle = '#e0302c';
    ctx.fillRect(rx, 138, VIEW_W, 24);
    ctx.fillStyle = '#901a18';
    ctx.fillRect(rx, 158, VIEW_W, 4);
    const tx = Math.round(84 + slide * 360 + out);
    Text.draw(ctx, this.level.name, tx, 74, '#ffffff', { scale: 2 });
    Text.draw(ctx, 'ZONE', tx + 70, 96, '#ffffff', { scale: 2 });
    Text.draw(ctx, 'ACT', tx + 112, 145, '#ffffff');
    Text.draw(ctx, String(this.level.act), tx + 136, 132, '#ffd23a', { scale: 4 });
  }

  renderResults() {
    const t = this.resultsTimer;
    const slide = Math.max(0, 1 - t / 30);
    const x = Math.round(48 - slide * 300);
    Text.draw(ctx, 'NISE GOT', x, 44, '#ffffff', { scale: 2 });
    Text.draw(ctx, `THROUGH ACT ${this.level.act}`, x + 16, 64, '#ffffff', { scale: 2 });
    const r = Math.round(72 + slide * 300);
    const y0 = 104;
    Text.draw(ctx, 'TIME BONUS', r, y0, HUD_YELLOW);
    Text.draw(ctx, String(this.timeBonus), r + 176, y0, '#ffffff', { align: 'right' });
    Text.draw(ctx, 'RING BONUS', r, y0 + 16, HUD_YELLOW);
    Text.draw(ctx, String(this.ringBonus), r + 176, y0 + 16, '#ffffff', { align: 'right' });
    Text.draw(ctx, 'SCORE', r, y0 + 36, HUD_YELLOW);
    Text.draw(ctx, String(this.score), r + 176, y0 + 36, '#ffffff', { align: 'right' });
  }

  renderTitle() {
    const t = this.titleFrame;
    const L = this.titleLevel;
    const cam = { x: (t * 2) % (L.w - VIEW_W), y: L.maxY - 260 };
    drawBackground(ctx, cam, 'hill', t, L);

    const cx = VIEW_W / 2;
    const bob = Math.round(Math.sin(t * 0.05) * 2);
    // エンブレム
    const emblem = Pixel.sprite('emblem', 160, 112, 80, 56, ['#ffd23a', '#c09000', '#2040c0', '#3a60e0', '#ffffff'], g => {
      ellipse(g, 0, 0, 74, 52, 0, '#ffd23a');
      ellipse(g, 0, 2, 70, 48, 0, '#c09000');
      ellipse(g, 0, 0, 66, 44, 0, '#2040c0');
      g.save();
      g.beginPath();
      g.ellipse(0, 0, 66, 44, 0, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = '#3a60e0';
      for (let i = -4; i <= 4; i++) g.fillRect(i * 16 - 3, -46, 6, 92);
      g.restore();
    });
    Pixel.blit(ctx, emblem, cx, 72 + bob);
    Pixel.blit(ctx, heroHeadSprite(2.4, 'grin'), cx - 2, 70 + bob);

    // ロゴ
    Text.draw(ctx, 'NISE SONIC', cx, 118 + bob, '#ffffff', { scale: 3, align: 'center' });
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(cx - 62, 143 + bob, 124, 15);
    ctx.fillStyle = '#e0302c';
    ctx.fillRect(cx - 60, 145 + bob, 120, 11);
    Text.draw(ctx, 'THE HEDGEHOG?', cx, 147 + bob, '#ffffff', { align: 'center', outline: false });

    if ((t >> 5) % 2 === 0) Text.draw(ctx, 'PRESS START', cx, 172, '#ffffff', { align: 'center' });
    Text.draw(ctx, `HI-SCORE ${this.hiscore}`, cx, 190, HUD_YELLOW, { align: 'center' });
    Text.draw(ctx, '<> MOVE  ~ ROLL  Z JUMP  M MUTE', cx, 206, '#cfe0ff', { align: 'center' });
  }

  renderGameOver() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = Math.min(1, this.overTimer / 40);
    Text.draw(ctx, 'GAME', Math.round(VIEW_W / 2 - 76 - (1 - k) * 200), 100, '#ffffff', { scale: 3 });
    Text.draw(ctx, 'OVER', Math.round(VIEW_W / 2 + 6 + (1 - k) * 200), 100, '#ffffff', { scale: 3 });
  }

  renderEnding() {
    const t = this.titleFrame;
    const L = this.titleLevel;
    drawBackground(ctx, { x: t * 3, y: L.maxY - 260 }, 'sunset', t, L);
    ctx.fillStyle = '#2f5a22';
    ctx.fillRect(0, 160, VIEW_W, VIEW_H - 160);
    ctx.fillStyle = '#58b23a';
    ctx.fillRect(0, 156, VIEW_W, 5);
    drawHero(ctx, 'dash', t >> 1, VIEW_W / 2, 137, 1, 0);
    Text.draw(ctx, 'CONGRATULATIONS!', VIEW_W / 2, 36, HUD_YELLOW, { align: 'center', scale: 2 });
    Text.draw(ctx, 'NISE HILL ZONE CLEAR', VIEW_W / 2, 66, '#ffffff', { align: 'center' });
    Text.draw(ctx, `SCORE ${this.score}`, VIEW_W / 2, 84, '#ffffff', { align: 'center' });
    Text.draw(ctx, 'THANK YOU FOR PLAYING', VIEW_W / 2, 176, '#ffffff', { align: 'center' });
    if (this.endTimer > 120 && (t >> 5) % 2 === 0) Text.draw(ctx, 'PRESS START', VIEW_W / 2, 196, '#cfe0ff', { align: 'center' });
  }
}

// 画面に収まる最大の整数倍で拡大すると、ドットが均一できれいに見える
function fitScreen() {
  const k = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const scale = k >= 2 ? Math.floor(k) : k;
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitScreen);
fitScreen();

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
