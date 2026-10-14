// すべてのグラフィックをコードで描く（画像ファイルなし）
const COL = {
  blue: '#1f55e0',
  blueDark: '#1238a8',
  blueLight: '#4f86ff',
  skin: '#f6c08a',
  skinDark: '#d9945a',
  red: '#e2262a',
  redDark: '#9c1418',
  white: '#ffffff',
  black: '#111118',
};

function ellipse(ctx, x, y, rx, ry, rot, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  ctx.fill();
}
function tri(ctx, a, b, c, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.closePath();
  ctx.fill();
}

// ---------- 主人公 ----------
function drawQuills(ctx, ox, oy) {
  tri(ctx, [ox - 4, oy - 7], [ox - 19, oy - 9], [ox - 6, oy - 1], COL.blueDark);
  tri(ctx, [ox - 5, oy - 2], [ox - 21, oy + 1], [ox - 5, oy + 5], COL.blue);
  tri(ctx, [ox - 4, oy + 3], [ox - 17, oy + 10], [ox - 2, oy + 8], COL.blueDark);
  tri(ctx, [ox - 3, oy - 10], [ox - 14, oy - 16], [ox - 1, oy - 6], COL.blue);
}

function drawHead(ctx, ox, oy, mood) {
  drawQuills(ctx, ox, oy);
  ellipse(ctx, ox, oy, 10, 10, 0, COL.blue);
  // 耳
  tri(ctx, [ox - 2, oy - 8], [ox + 1, oy - 16], [ox + 4, oy - 8], COL.blue);
  tri(ctx, [ox - 0.5, oy - 9], [ox + 1, oy - 13], [ox + 2.5, oy - 9], COL.skinDark);
  // 口元
  ellipse(ctx, ox + 7, oy + 4, 5.5, 4, 0, COL.skin);
  // 目
  ellipse(ctx, ox + 5, oy - 2, 4.2, 5, 0.15, COL.white);
  if (mood === 'hurt') {
    ctx.strokeStyle = COL.black;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ox + 3, oy - 4);
    ctx.lineTo(ox + 8, oy);
    ctx.moveTo(ox + 8, oy - 4);
    ctx.lineTo(ox + 3, oy);
    ctx.stroke();
  } else {
    ellipse(ctx, ox + 6.8, oy - 1.5, 1.6, 3, 0, '#1a7a2a');
    ellipse(ctx, ox + 7.2, oy - 1.5, 0.9, 2, 0, COL.black);
    ctx.fillStyle = COL.white;
    ctx.fillRect(ox + 6.5, oy - 3.5, 1, 1);
  }
  // 鼻
  ellipse(ctx, ox + 12, oy + 2, 1.8, 1.5, 0, COL.black);
  // 口
  ctx.strokeStyle = '#7a3b1a';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  if (mood === 'grin') ctx.arc(ox + 8, oy + 4, 2.5, 0.1, Math.PI * 0.8);
  else { ctx.moveTo(ox + 6, oy + 6); ctx.lineTo(ox + 10, oy + 5.5); }
  ctx.stroke();
}

function drawShoe(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ellipse(ctx, 2, 0, 6, 3.4, 0, COL.red);
  ctx.fillStyle = COL.white;
  ctx.fillRect(-1, -3, 2.4, 5);
  ctx.fillStyle = COL.redDark;
  ctx.fillRect(-3, 2, 11, 1.4);
  ctx.restore();
}

function drawLimb(ctx, x0, y0, x1, y1, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawGlove(ctx, x, y) {
  ellipse(ctx, x, y, 3, 3, 0, COL.white);
  ctx.strokeStyle = '#c8c8d8';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBall(ctx, t, r) {
  r = r || 14;
  ellipse(ctx, 0, 0, r, r, 0, COL.blue);
  ctx.save();
  ctx.rotate(t);
  ctx.strokeStyle = COL.blueDark;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.arc(r * 0.35, 0, r * 0.7, -1.2, 0.6);
    ctx.stroke();
  }
  ellipse(ctx, r * 0.35, r * 0.15, r * 0.35, r * 0.25, 0, COL.skin);
  ctx.restore();
  ctx.strokeStyle = COL.blueLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 2.5, -2.4, -1.2);
  ctx.stroke();
}

// pose: stand, run, dash, ball, crouch, up, hurt, dead, spring, skid, balance, push
function drawHero(ctx, pose, t, opts) {
  opts = opts || {};
  if (pose === 'ball') {
    drawBall(ctx, t, 14);
    return;
  }
  if (pose === 'crouch') {
    ctx.save();
    ctx.translate(0, 7);
    ellipse(ctx, -1, 4, 9, 7, 0, COL.blue);
    ellipse(ctx, 3, 5, 4, 4, 0, COL.skin);
    drawShoe(ctx, 5, 10.5, 0);
    drawShoe(ctx, -4, 10.5, 0);
    drawHead(ctx, 2, -6, 'normal');
    drawGlove(ctx, 7, 6);
    ctx.restore();
    return;
  }

  let lean = 0;
  let headX = 1;
  let headY = -9;
  let mood = 'normal';
  let legA = 0;
  let legB = 0;
  let armA = 0.5;
  let armB = -0.4;
  let figure8 = false;

  switch (pose) {
    case 'stand': {
      const breath = Math.sin(t * 0.05) * 0.4;
      headY += breath;
      armA = 0.3;
      armB = -0.2;
      break;
    }
    case 'run':
      lean = 0.18;
      legA = Math.sin(t) * 1.0;
      legB = -legA;
      armA = -Math.sin(t) * 1.1;
      armB = -armA;
      headX = 3;
      break;
    case 'dash':
      lean = 0.3;
      figure8 = true;
      headX = 4;
      mood = 'grin';
      armA = 1.3;
      armB = 1.0;
      break;
    case 'up':
      headY -= 1;
      armA = 0.2;
      armB = -0.2;
      break;
    case 'hurt':
      lean = -0.3;
      mood = 'hurt';
      legA = 0.6;
      legB = -0.4;
      armA = -2.3;
      armB = -2.0;
      break;
    case 'dead':
      mood = 'hurt';
      legA = 0.8;
      legB = -0.8;
      armA = -2.5;
      armB = 2.5;
      break;
    case 'spring':
      armA = -2.8;
      armB = -2.6;
      legA = 0.15;
      legB = -0.15;
      mood = 'grin';
      break;
    case 'skid':
      lean = -0.25;
      legA = 0.9;
      legB = 0.6;
      armA = -1.4;
      armB = -1.0;
      break;
    case 'balance':
      lean = 0.15 + Math.sin(t * 0.25) * 0.1;
      armA = -2.2 + Math.sin(t * 0.25);
      armB = -1.8 - Math.sin(t * 0.25);
      mood = 'hurt';
      break;
    case 'push':
      lean = 0.45;
      legA = -0.6 + Math.sin(t * 0.15) * 0.3;
      legB = 0.5;
      armA = 1.6;
      armB = 1.5;
      headX = 4;
      break;
    default:
      break;
  }

  ctx.save();
  ctx.translate(0, 8);
  ctx.rotate(lean);
  ctx.translate(0, -8);

  const hip = [0, 6];
  // 奥の脚
  const drawLeg = (a, back) => {
    const len = 10;
    const fx = hip[0] + Math.sin(a) * len;
    const fy = hip[1] + Math.cos(a) * len * 0.9 + 2;
    drawLimb(ctx, hip[0], hip[1], fx, fy, back ? COL.blueDark : COL.blue, 3);
    drawShoe(ctx, fx + 1, fy + 2, a * 0.4);
  };
  if (figure8) {
    // 高速時の8の字の足
    ctx.strokeStyle = COL.red;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2 + t * 0.5;
      const px = Math.sin(a) * 9;
      const py = 13 + Math.sin(a * 2) * 3.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = COL.white;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    drawLeg(legB, true);
  }

  // 奥の腕
  const shoulder = [1, -1];
  const drawArm = (a, back) => {
    const len = 9;
    const hx = shoulder[0] + Math.sin(a) * len;
    const hy = shoulder[1] + Math.cos(a) * len;
    drawLimb(ctx, shoulder[0], shoulder[1], hx, hy, back ? COL.skinDark : COL.skin, 2.2);
    drawGlove(ctx, hx, hy);
  };
  drawArm(armB, true);

  // 胴体
  ellipse(ctx, 0, 2, 7, 8.5, 0, COL.blue);
  ellipse(ctx, 2.5, 3.5, 4, 5.5, 0, COL.skin);

  if (!figure8) drawLeg(legA, false);
  drawHead(ctx, headX, headY, mood);
  drawArm(armA, false);
  ctx.restore();
}

function drawHeroFace(ctx) {
  ctx.save();
  ctx.scale(1.2, 1.2);
  drawHead(ctx, -3, 1, 'grin');
  ctx.restore();
}

function drawBossFace(ctx) {
  ellipse(ctx, 0, 0, 11, 11, 0, '#f2b090');
  ellipse(ctx, -4, -2, 3.5, 2.5, 0, '#bde4ff');
  ellipse(ctx, 4, -2, 3.5, 2.5, 0, '#bde4ff');
  ctx.fillStyle = '#222';
  ctx.fillRect(-8, -3, 16, 1);
  ctx.fillStyle = '#ff8a3a';
  ctx.beginPath();
  ctx.moveTo(-10, 5);
  ctx.quadraticCurveTo(0, -1, 10, 5);
  ctx.quadraticCurveTo(0, 3, -10, 5);
  ctx.fill();
  ellipse(ctx, 0, 2, 2, 1.6, 0, '#e08060');
}

// ---------- リング・ギミック ----------
function drawRing(ctx, x, y, phase) {
  const w = Math.abs(Math.cos(phase)) * 5.5 + 0.8;
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#b86f00';
  ctx.beginPath();
  ctx.ellipse(x, y + 0.6, w, 5.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#ffd23a';
  ctx.beginPath();
  ctx.ellipse(x, y, w, 5.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fffbe0';
  ctx.fillRect(x - w * 0.7 - 0.5, y - 4, 1.5, 1.5);
}

function drawMonitorIcon(ctx, x, y, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-8, -7, 16, 14);
  switch (kind) {
    case 'rings':
      drawRing(ctx, 0, 0, 0);
      break;
    case 'shield':
      ellipse(ctx, 0, 0, 6, 6, 0, '#56c8ff');
      ellipse(ctx, -2, -2, 2, 2, 0, '#ffffff');
      break;
    case 'shoes':
      drawShoe(ctx, -2, 1, 0);
      break;
    case 'invincible':
      ctx.fillStyle = '#ffe36b';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.fillRect(Math.cos(a) * 4 - 1, Math.sin(a) * 4 - 1, 3, 3);
      }
      break;
    case 'life':
      ctx.scale(0.45, 0.45);
      drawHead(ctx, -2, 2, 'grin');
      break;
  }
  ctx.restore();
}

function drawMonitor(ctx, x, y, kind, frame) {
  ctx.fillStyle = '#3c3c46';
  ctx.fillRect(x - 13, y - 4, 26, 4);
  ctx.fillStyle = '#c9c9d6';
  ctx.fillRect(x - 13, y - 28, 26, 25);
  ctx.fillStyle = '#8a8a99';
  ctx.fillRect(x - 13, y - 6, 26, 3);
  if ((frame >> 3) % 6 === 0) {
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x - 9, y - 24, 18, 15);
    ctx.fillStyle = '#888';
    for (let i = 0; i < 6; i++) ctx.fillRect(x - 9, y - 24 + i * 3 + (frame % 3), 18, 1);
  } else {
    drawMonitorIcon(ctx, x, y - 16, kind);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x - 9, y - 24, 3, 6);
}

function drawSpring(ctx, x, y, dir, power, squash) {
  ctx.save();
  ctx.translate(x, y);
  if (dir === 'right') ctx.rotate(-Math.PI / 2), ctx.translate(14, 0);
  if (dir === 'left') ctx.rotate(Math.PI / 2), ctx.translate(-14, 0);
  const ext = squash > 0 ? (squash > 6 ? 16 : 8) : 8;
  const top = power === 'red' ? '#ff3b3b' : '#ffd23a';
  const topDark = power === 'red' ? '#a51818' : '#c48a00';
  ctx.fillStyle = '#8a8a99';
  ctx.fillRect(-12, -4, 24, 4);
  ctx.strokeStyle = '#c9c9d6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const yy = -4 - (i / 4) * ext;
    ctx.lineTo(i % 2 ? 7 : -7, yy);
  }
  ctx.stroke();
  ctx.fillStyle = topDark;
  ctx.fillRect(-14, -8 - ext, 28, 6);
  ctx.fillStyle = top;
  ctx.fillRect(-14, -9 - ext, 28, 4);
  ctx.restore();
}

function drawBug(ctx, x, y, dir, t) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir > 0) ctx.scale(-1, 1);
  // 車輪
  ctx.fillStyle = '#2b2b33';
  ctx.beginPath();
  ctx.arc(4, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9b9bab';
  ctx.fillRect(4 + Math.cos(t * 0.3) * 3 - 1, -5 + Math.sin(t * 0.3) * 3 - 1, 2, 2);
  // 胴体（てんとう虫風）
  ctx.fillStyle = '#d9262a';
  ctx.beginPath();
  ctx.arc(2, -12, 12, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a1014';
  ctx.fillRect(-10, -13, 24, 2);
  ctx.fillStyle = '#111';
  ellipse(ctx, -2, -18, 2.5, 2.5, 0, '#111');
  ellipse(ctx, 7, -17, 2, 2, 0, '#111');
  ellipse(ctx, 2, -21, 1.6, 1.6, 0, '#111');
  // 顔
  ctx.fillStyle = '#5b6aa8';
  ctx.beginPath();
  ctx.arc(-11, -12, 6, 0, Math.PI * 2);
  ctx.fill();
  ellipse(ctx, -13, -13, 2.5, 3, 0, '#ffffff');
  ellipse(ctx, -14, -13, 1, 1.6, 0, '#e22');
  // 前輪
  ctx.fillStyle = '#9b9bab';
  ctx.fillRect(-12, -6, 3, 6);
  ctx.restore();
}

function drawBee(ctx, x, y, dir, t) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir > 0) ctx.scale(-1, 1);
  // 羽
  ctx.fillStyle = 'rgba(220,240,255,0.75)';
  const flap = (t >> 1) % 2 ? 5 : 2;
  ellipse(ctx, 2, -7 - flap / 2, 6, flap, -0.3, 'rgba(220,240,255,0.75)');
  ellipse(ctx, 7, -6 - flap / 2, 5, flap * 0.8, 0.2, 'rgba(220,240,255,0.6)');
  // 体
  ellipse(ctx, 4, 0, 10, 6, 0, '#ffd23a');
  ctx.fillStyle = '#222';
  ctx.fillRect(1, -6, 3, 12);
  ctx.fillRect(7, -5, 3, 10);
  tri(ctx, [13, -1], [19, 3], [12, 3], '#9b9bab');
  // 頭
  ellipse(ctx, -8, -1, 5.5, 5.5, 0, '#6a6aa8');
  ellipse(ctx, -10, -2, 2.4, 2.8, 0, '#fff');
  ellipse(ctx, -11, -2, 1, 1.5, 0, '#e22');
  ctx.restore();
}

function drawBossShip(ctx, x, y, dir, frame, flash, state) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir > 0) ctx.scale(-1, 1);
  // 炎
  if (state !== 'dying') {
    const f = (frame >> 1) % 2 ? 8 : 5;
    tri(ctx, [20, 4], [28 + f, 8], [20, 12], '#ff8a2b');
    tri(ctx, [20, 6], [24 + f * 0.6, 8], [20, 10], '#ffe36b');
  }
  // 操縦者
  ellipse(ctx, 0, -14, 10, 10, 0, flash ? '#ffffff' : '#f2b090');
  ctx.fillStyle = '#222';
  ctx.fillRect(-9, -16, 18, 2);
  ellipse(ctx, -4, -15, 3, 2.2, 0, '#bde4ff');
  ellipse(ctx, 4, -15, 3, 2.2, 0, '#bde4ff');
  ctx.fillStyle = '#ff8a3a';
  ctx.beginPath();
  ctx.moveTo(-11, -9);
  ctx.quadraticCurveTo(-4, -13, 0, -10);
  ctx.quadraticCurveTo(4, -13, 11, -9);
  ctx.quadraticCurveTo(0, -8, -11, -9);
  ctx.fill();
  ctx.fillStyle = flash ? '#fff' : '#e23a3a';
  ctx.fillRect(-10, -6, 20, 6);
  // 機体
  ctx.fillStyle = flash ? '#ffffff' : '#c9c9d6';
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.lineTo(26, -4);
  ctx.quadraticCurveTo(24, 20, 0, 20);
  ctx.quadraticCurveTo(-24, 20, -26, -4);
  ctx.fill();
  ctx.fillStyle = flash ? '#ddd' : '#8a8a99';
  ctx.fillRect(-26, -5, 52, 4);
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(-18, 4, 6, 4);
  ctx.fillStyle = '#56c8ff';
  ctx.fillRect(-8, 4, 6, 4);
  ctx.fillStyle = '#ff4b4b';
  ctx.fillRect(2, 4, 6, 4);
  // ガラスのドーム
  ctx.fillStyle = 'rgba(160,220,255,0.35)';
  ctx.beginPath();
  ctx.arc(0, -5, 18, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -5, 15, Math.PI * 1.1, Math.PI * 1.4);
  ctx.stroke();
  ctx.restore();
}

// ---------- 地形・背景 ----------
const Patterns = {};
function getPattern(ctx, pal) {
  const key = pal.dirtA + pal.dirtB;
  if (Patterns[key]) return Patterns[key];
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = pal.dirtA;
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = pal.dirtB;
  g.fillRect(0, 0, 16, 16);
  g.fillRect(16, 16, 16, 16);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, 15, 32, 1);
  g.fillRect(15, 0, 1, 32);
  g.fillRect(0, 31, 32, 1);
  g.fillRect(31, 0, 1, 32);
  Patterns[key] = ctx.createPattern(c, 'repeat');
  return Patterns[key];
}

function drawTerrain(ctx, level, cam, pal) {
  const x0 = Math.max(0, Math.floor(cam.x) - 4);
  const x1 = Math.min(level.w - 1, Math.ceil(cam.x + VIEW_W) + 4);
  const bottom = cam.y + VIEW_H + 20;
  const pat = getPattern(ctx, pal);
  const runs = [];
  let start = -1;
  for (let x = x0; x <= x1; x++) {
    const has = level.h[x] !== Infinity;
    if (has && start < 0) start = x;
    if ((!has || x === x1) && start >= 0) {
      runs.push([start, has ? x : x - 1]);
      start = -1;
    }
  }
  for (const [a, b] of runs) {
    ctx.beginPath();
    ctx.moveTo(a, bottom);
    for (let x = a; x <= b; x += 2) ctx.lineTo(x, level.h[x]);
    ctx.lineTo(b, level.h[b]);
    ctx.lineTo(b, bottom);
    ctx.closePath();
    ctx.fillStyle = pat;
    ctx.fill();
    // 草
    const grass = (offset, width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = a; x <= b; x += 2) {
        const y = level.h[x] + offset;
        if (x === a) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    grass(4, 9, pal.grassDark);
    grass(2.5, 6, pal.grass);
    grass(0.5, 1.5, pal.grassLight);
    // 草のギザギザ
    ctx.fillStyle = pal.grassDark;
    for (let x = a - (a % 8); x <= b; x += 8) {
      if (x < a) continue;
      const y = level.h[x];
      if (y === Infinity) continue;
      ctx.fillRect(x, y + 8, 4, 3);
    }
  }
}

function drawBoxes(ctx, level, pal) {
  for (const b of level.boxes) {
    if (b.dead || b.monitor || b.spikes) continue;
    ctx.fillStyle = pal.block[0];
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = pal.block[1];
    for (let yy = 0; yy < b.h; yy += 16) {
      for (let xx = ((yy / 16) % 2) * 16; xx < b.w; xx += 32) {
        ctx.fillRect(b.x + xx, b.y + yy, Math.min(16, b.w - xx), Math.min(16, b.h - yy));
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x, b.y, 2, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + b.w - 2, b.y, 2, b.h);
    ctx.fillStyle = pal.grassDark;
    ctx.fillRect(b.x - 1, b.y, b.w + 2, 7);
    ctx.fillStyle = pal.grass;
    ctx.fillRect(b.x - 1, b.y, b.w + 2, 5);
    ctx.fillStyle = pal.grassLight;
    ctx.fillRect(b.x - 1, b.y, b.w + 2, 1);
  }
}

function drawPlatforms(ctx, level, pal) {
  for (const p of level.platforms) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    ctx.fillStyle = pal.dirtB;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + p.w, y + 4);
    ctx.lineTo(x + p.w - 10, y + p.h + 6);
    ctx.lineTo(x + 10, y + p.h + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.dirtA;
    ctx.fillRect(x + 12, y + 6, p.w - 24, 4);
    ctx.fillStyle = pal.grassDark;
    ctx.fillRect(x, y, p.w, 7);
    ctx.fillStyle = pal.grass;
    ctx.fillRect(x, y, p.w, 5);
    ctx.fillStyle = pal.grassLight;
    ctx.fillRect(x, y, p.w, 1);
  }
}

function drawLoopBack(ctx, lp, pal) {
  ctx.save();
  ctx.strokeStyle = pal.dirtB;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(lp.cx, lp.cy, lp.r + 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = pal.dirtA;
  ctx.lineWidth = 10;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.arc(lp.cx, lp.cy, lp.r + 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = pal.grass;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(lp.cx, lp.cy, lp.r + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = pal.grassLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(lp.cx, lp.cy, lp.r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ループの手前側（下半分の支柱）
function drawLoopFront(ctx, lp, pal) {
  ctx.fillStyle = pal.dirtB;
  ctx.fillRect(lp.cx - lp.r - 22, lp.cy + lp.r * 0.2, 10, lp.r * 0.8);
  ctx.fillRect(lp.cx + lp.r + 12, lp.cy + lp.r * 0.2, 10, lp.r * 0.8);
}

function drawDeco(ctx, d, frame, pal) {
  const x = Math.round(d.x);
  const y = Math.round(d.y);
  if (d.type === 'palm') {
    ctx.strokeStyle = '#9a6a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x - 6, y - 30, x + 2, y - 62);
    ctx.stroke();
    ctx.strokeStyle = '#6b4626';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 3, y - i * 10);
      ctx.lineTo(x + 2, y - i * 10 - 2);
      ctx.stroke();
    }
    const sway = Math.sin(frame * 0.03 + x) * 2;
    ctx.fillStyle = pal.grassDark;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.ellipse(x + 2 + Math.cos(a) * 14 + sway, y - 62 + Math.sin(a) * 6 + 4, 16, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = pal.grass;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + 2 + Math.cos(a) * 12 + sway, y - 64 + Math.sin(a) * 5, 13, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (d.type === 'flower') {
    ctx.fillStyle = pal.grassDark;
    ctx.fillRect(x - 1, y - 16, 2, 16);
    const bob = Math.round(Math.sin(frame * 0.08 + x) * 1);
    const petal = (frame >> 4) % 2 ? '#ffe14a' : '#ff8fd0';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + frame * 0.02;
      ellipse(ctx, x + Math.cos(a) * 4, y - 18 + bob + Math.sin(a) * 4, 2.6, 2.6, 0, petal);
    }
    ellipse(ctx, x, y - 18 + bob, 2.5, 2.5, 0, '#9a4a1a');
  }
}

// 背景レイヤー（パララックス）
const BG = {};
function buildBackground(palName) {
  if (BG[palName]) return BG[palName];
  const pal = PALETTES[palName];
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  // 遠景の山
  const far = mk(512, 120);
  let g = far.getContext('2d');
  g.fillStyle = pal.far;
  g.beginPath();
  g.moveTo(0, 120);
  for (let x = 0; x <= 512; x += 4) {
    const y = 60 + Math.sin((x / 512) * Math.PI * 4) * 22 + Math.sin((x / 512) * Math.PI * 10) * 8;
    g.lineTo(x, y);
  }
  g.lineTo(512, 120);
  g.fill();
  g.fillStyle = pal.farTop;
  for (let x = 0; x < 512; x += 4) {
    const y = 60 + Math.sin((x / 512) * Math.PI * 4) * 22 + Math.sin((x / 512) * Math.PI * 10) * 8;
    g.fillRect(x, y, 4, 2);
  }
  // 中景の丘
  const mid = mk(640, 90);
  g = mid.getContext('2d');
  for (let i = 0; i < 6; i++) {
    const cx = i * 110 + 40;
    const r = 50 + (i % 3) * 14;
    g.fillStyle = pal.mid;
    g.beginPath();
    g.ellipse(cx, 90, r, 60 + (i % 2) * 12, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = pal.midTop;
    g.beginPath();
    g.ellipse(cx, 90, r, 60 + (i % 2) * 12, 0, Math.PI * 1.15, Math.PI * 1.55);
    g.lineTo(cx, 90);
    g.fill();
  }
  // 雲
  const clouds = mk(600, 70);
  g = clouds.getContext('2d');
  g.fillStyle = pal.cloud;
  const puff = (x, y, s) => {
    for (const [dx, dy, rx, ry] of [[0, 0, 20, 8], [14, -5, 14, 9], [-12, -2, 12, 7]]) {
      g.beginPath();
      g.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
      g.fill();
    }
  };
  puff(60, 30, 1);
  puff(230, 50, 0.7);
  puff(380, 22, 1.2);
  puff(520, 46, 0.8);
  BG[palName] = { far, mid, clouds };
  return BG[palName];
}

function drawBackground(ctx, cam, palName, frame, level) {
  const pal = PALETTES[palName];
  const bg = buildBackground(palName);
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, pal.sky[0]);
  grd.addColorStop(0.55, pal.sky[1]);
  grd.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 縦方向の視差：カメラ y はレベルの高さに対して少しだけ動く
  const vy = (cam.y - (level.maxY - 300)) * 0.05;

  if (pal.sun) {
    ellipse(ctx, 330, 120 - vy, 26, 26, 0, pal.sun);
    ellipse(ctx, 330, 120 - vy, 34, 34, 0, 'rgba(255,224,138,0.25)');
  }
  const tile = (img, speed, y, drift) => {
    const w = img.width;
    let ox = -(((cam.x * speed + (drift || 0)) % w) + w) % w;
    for (let x = ox; x < VIEW_W; x += w) ctx.drawImage(img, Math.round(x), Math.round(y));
  };
  tile(bg.clouds, 0.05, 8 - vy * 0.5, frame * 0.15);
  tile(bg.far, 0.1, 70 - vy);
  // 水面
  const waterY = Math.round(150 - vy * 1.2);
  ctx.fillStyle = pal.water;
  ctx.fillRect(0, waterY, VIEW_W, VIEW_H - waterY);
  ctx.fillStyle = pal.waterLine;
  for (let i = 0; i < 8; i++) {
    const yy = waterY + 3 + i * 9;
    const off = ((frame * (0.3 + i * 0.15) + cam.x * (0.2 + i * 0.05)) % 64);
    for (let x = -off; x < VIEW_W; x += 64) ctx.fillRect(Math.round(x + (i % 2) * 20), yy, 18 - i, 1);
  }
  tile(bg.mid, 0.3, waterY - 60);
}

// ---------- HUD ----------
function hudText(ctx, text, x, y, color) {
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color || '#fff';
  ctx.fillText(text, x, y);
}

function drawHUD(ctx, game) {
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  const flash = (game.frame >> 3) % 2 === 0;
  hudText(ctx, 'SCORE', 12, 10, '#ffd23a');
  hudText(ctx, String(game.score), 64, 10);
  const t = Math.floor(game.time / 60);
  const ts = `${Math.floor(t / 60)}'${String(t % 60).padStart(2, '0')}"${String(Math.floor(((game.time % 60) * 100) / 60)).padStart(2, '0')}`;
  hudText(ctx, 'TIME', 12, 22, game.time > 9 * 3600 && flash ? '#ff3030' : '#ffd23a');
  hudText(ctx, ts, 64, 22);
  hudText(ctx, 'RINGS', 12, 34, game.rings === 0 && flash ? '#ff3030' : '#ffd23a');
  hudText(ctx, String(game.rings), 64, 34);

  // 残機
  ctx.save();
  ctx.translate(20, VIEW_H - 16);
  ctx.scale(0.55, 0.55);
  drawHead(ctx, 0, 0, 'grin');
  ctx.restore();
  hudText(ctx, '×' + game.lives, 32, VIEW_H - 20);

  if (game.player && game.player.shoes > 0) hudText(ctx, 'SPEED UP', VIEW_W - 82, 10, '#ff8a3a');
  if (game.player && game.player.invincible > 0) hudText(ctx, 'STAR', VIEW_W - 50, 22, '#ffe36b');
  if (game.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    hudText(ctx, 'PAUSE', VIEW_W / 2, VIEW_H / 2 - 4);
    ctx.textAlign = 'left';
  }
  ctx.textBaseline = 'alphabetic';
}
