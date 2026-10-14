// Web Audio で効果音と BGM をすべて合成する（外部音源ファイルなし）
const Sound = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let noiseBuf = null;
  let muted = false;

  // BGM シーケンサ状態
  let song = null;
  let songStep = 0;
  let nextTime = 0;
  let timer = null;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.32;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.6;
    return muted;
  }

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(name) {
    const m = /^([A-G]#?)(\d)$/.exec(name);
    if (!m) return 0;
    const midi = NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function tone(type, f0, f1, dur, vol, when, dest) {
    if (!ctx) return;
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, when, hp, dest) {
    if (!ctx) return;
    const t = when || ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp || 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest || sfxGain);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  let ringPan = 1;
  const sfx = {
    jump() { tone('square', 280, 900, 0.16, 0.18); },
    ring() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      ringPan = -ringPan;
      let dest = sfxGain;
      if (p) { p.pan.value = ringPan * 0.6; p.connect(sfxGain); dest = p; }
      tone('square', 1318, 1318, 0.06, 0.12, t, dest);
      tone('square', 1976, 1976, 0.28, 0.12, t + 0.05, dest);
    },
    ringLoss() {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) tone('square', 1700 - i * 90, 1500 - i * 90, 0.08, 0.08, t + i * 0.04);
    },
    spindash(charge) { tone('sawtooth', 300 + charge * 60, 900 + charge * 120, 0.22, 0.12); },
    release() { tone('sawtooth', 1200, 200, 0.3, 0.14); noise(0.25, 0.12, 0, 2000); },
    roll() { tone('triangle', 500, 200, 0.12, 0.15); },
    skid() { noise(0.12, 0.12, 0, 3000); },
    spring() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone('square', 200, 1000, 0.25, 0.14, t);
      tone('square', 300, 1200, 0.25, 0.08, t + 0.05);
    },
    destroy() { noise(0.35, 0.25, 0, 200); tone('square', 220, 60, 0.3, 0.14); },
    hurt() { tone('sawtooth', 600, 120, 0.35, 0.16); },
    monitor() { noise(0.2, 0.22, 0, 500); tone('square', 900, 300, 0.15, 0.1); },
    checkpoint() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [1046, 1318, 1568, 2093].forEach((f, i) => tone('square', f, f, 0.12, 0.1, t + i * 0.07));
    },
    shield() { tone('sine', 300, 1200, 0.4, 0.2); },
    bossHit() { noise(0.3, 0.3, 0, 600); tone('square', 120, 60, 0.3, 0.2); },
    bomb() { noise(0.4, 0.3, 0, 150); },
    signpost() {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 10; i++) tone('triangle', 600 + (i % 2) * 300, 600 + (i % 2) * 300, 0.08, 0.1, t + i * 0.06);
    },
    tally() { tone('square', 1500, 1500, 0.03, 0.06); },
    select() { tone('square', 880, 1760, 0.1, 0.12); },
  };

  function play(name, arg) {
    if (!ctx || !sfx[name]) return;
    sfx[name](arg);
  }

  // ---------- BGM ----------
  // 1トークン = 1ステップ。'-' は伸ばし、'.' は休符
  function parseTrack(str) {
    const tokens = str.replace(/\|/g, ' ').trim().split(/\s+/);
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      if (tk === '-' || tk === '.') { out.push(null); continue; }
      let len = 1;
      while (tokens[i + len] === '-') len++;
      out.push({ f: freq(tk), len });
    }
    return out;
  }

  function makeSong(def) {
    return {
      bpm: def.bpm,
      loop: def.loop !== false,
      tracks: def.tracks.map(t => ({ type: t.type, vol: t.vol, notes: parseTrack(t.notes) })),
      drums: def.drums || null,
      length: parseTrack(def.tracks[0].notes).length,
    };
  }

  const songs = {
    zone: {
      bpm: 152,
      tracks: [
        {
          type: 'square', vol: 0.09,
          notes:
            'E5 - G5 - A5 - C6 B5 | A5 - G5 - E5 - D5 E5 | G5 - - - E5 - D5 C5 | D5 - E5 - . . . . |' +
            'E5 - G5 - A5 - C6 D6 | E6 - D6 - C6 - A5 G5 | A5 - - - G5 - E5 D5 | C5 - - - . . G4 B4 |' +
            'C5 . C5 D5 E5 . E5 G5 | A5 - G5 - E5 - C5 - | D5 . D5 E5 F5 . F5 A5 | G5 - - - - - . . |' +
            'C6 - B5 - A5 - G5 - | F5 - E5 - D5 - E5 F5 | G5 - - - A5 - B5 - | C6 - - - . . . . |',
        },
        {
          type: 'triangle', vol: 0.22,
          notes:
            'A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 | C3 C4 C3 C4 C3 C4 C3 C4 | G2 G3 G2 G3 G2 G3 G2 G3 |' +
            'A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 | C3 C4 C3 C4 G2 G3 B2 B3 |' +
            'C3 C4 C3 C4 C3 C4 C3 C4 | A2 A3 A2 A3 A2 A3 A2 A3 | D3 D4 D3 D4 D3 D4 D3 D4 | G2 G3 G2 G3 G2 G3 G2 G3 |' +
            'F2 F3 F2 F3 F2 F3 F2 F3 | D3 D4 D3 D4 D3 D4 D3 D4 | G2 G3 G2 G3 G2 G3 G2 G3 | C3 C4 C3 C4 G2 G3 G2 G3 |',
        },
      ],
      drums: 'k h s h k k s h',
    },
    sunset: {
      bpm: 140,
      tracks: [
        {
          type: 'square', vol: 0.08,
          notes:
            'D5 - F5 - A5 - G5 F5 | E5 - C5 - D5 - - - | F5 - A5 - C6 - A#5 A5 | G5 - - - . . . . |' +
            'D5 - F5 - A5 - D6 C6 | A#5 - A5 - G5 - F5 E5 | F5 - G5 - E5 - C5 - | D5 - - - . . . . |',
        },
        {
          type: 'triangle', vol: 0.22,
          notes:
            'D3 D4 D3 D4 D3 D4 D3 D4 | C3 C4 C3 C4 C3 C4 C3 C4 | A#2 A#3 A#2 A#3 A#2 A#3 A#2 A#3 | C3 C4 C3 C4 C3 C4 C3 C4 |' +
            'D3 D4 D3 D4 D3 D4 D3 D4 | G2 G3 G2 G3 G2 G3 G2 G3 | A2 A3 A2 A3 A2 A3 A2 A3 | D3 D4 D3 D4 A2 A3 C3 C4 |',
        },
      ],
      drums: 'k h s h k h s s',
    },
    boss: {
      bpm: 176,
      tracks: [
        {
          type: 'square', vol: 0.08,
          notes:
            'A4 A4 C5 A4 D#5 D5 C5 A4 | A4 A4 C5 A4 E5 D#5 D5 C5 | G4 G4 A#4 G4 D5 C5 A#4 G4 | G#4 - A4 - B4 - C5 D5 |',
        },
        {
          type: 'sawtooth', vol: 0.06,
          notes:
            'A2 A2 A3 A2 A2 A2 A3 A2 | A2 A2 A3 A2 A2 A2 A3 A2 | G2 G2 G3 G2 G2 G2 G3 G2 | G#2 G#2 G#3 G#2 E2 E2 E3 E2 |',
        },
      ],
      drums: 'k h k s k h k s',
    },
    clear: {
      bpm: 160, loop: false,
      tracks: [
        { type: 'square', vol: 0.1, notes: 'C5 E5 G5 C6 - . G5 C6 | E6 - - - D6 - - - | C6 - - - - - - - |' },
        { type: 'triangle', vol: 0.22, notes: 'C3 - G3 - C4 - . . | G2 - - - G3 - - - | C3 - - - - - - - |' },
      ],
    },
    oneup: {
      bpm: 200, loop: false,
      tracks: [
        { type: 'square', vol: 0.1, notes: 'G5 . G5 . G5 . E5 G5 | C6 - - - - - . . |' },
        { type: 'triangle', vol: 0.2, notes: 'C4 . C4 . C4 . C4 E4 | G4 - - - - - . . |' },
      ],
    },
    gameover: {
      bpm: 100, loop: false,
      tracks: [
        { type: 'square', vol: 0.09, notes: 'C5 - B4 - A#4 - A4 - | G#4 - - - - - - - |' },
        { type: 'triangle', vol: 0.2, notes: 'C3 - B2 - A#2 - A2 - | G#2 - - - - - - - |' },
      ],
    },
  };
  const compiled = {};
  for (const k in songs) compiled[k] = makeSong(songs[k]);

  let currentName = null;
  let resumeName = null;

  function scheduleStep(s, step, t, stepDur) {
    for (const tr of s.tracks) {
      const n = tr.notes[step];
      if (n && n.f) {
        const dur = n.len * stepDur * 0.92;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = tr.type;
        o.frequency.setValueAtTime(n.f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(tr.vol, t + 0.01);
        g.gain.setValueAtTime(tr.vol, t + dur * 0.7);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(musicGain);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
    }
    if (s.drums) {
      const pat = s.drums.split(' ');
      const d = pat[step % pat.length];
      if (d === 'k') {
        tone('sine', 150, 40, 0.15, 0.5, t, musicGain);
      } else if (d === 's') {
        noise(0.12, 0.25, t, 1500, musicGain);
      } else if (d === 'h') {
        noise(0.04, 0.12, t, 7000, musicGain);
      }
    }
  }

  function tick() {
    if (!ctx || !song) return;
    const stepDur = 60 / song.bpm / 2;
    while (nextTime < ctx.currentTime + 0.15) {
      if (songStep >= song.length) {
        if (song.loop) {
          songStep = 0;
        } else {
          song = null;
          currentName = null;
          if (resumeName) {
            const r = resumeName;
            resumeName = null;
            playMusic(r);
          }
          return;
        }
      }
      scheduleStep(song, songStep, nextTime, stepDur);
      songStep++;
      nextTime += stepDur;
    }
  }

  function playMusic(name, opts) {
    if (!ctx) return;
    if (currentName === name && song) return;
    stopMusic();
    const s = compiled[name];
    if (!s) return;
    song = s;
    currentName = name;
    if (opts && opts.resume) resumeName = opts.resume;
    songStep = 0;
    nextTime = ctx.currentTime + 0.05;
    tick();
    timer = setInterval(tick, 50);
  }

  function stopMusic() {
    if (timer) clearInterval(timer);
    timer = null;
    song = null;
    currentName = null;
    resumeName = null;
  }

  // ジングル（1UPなど）を鳴らした後に元の曲へ戻る
  function jingle(name) {
    const back = currentName;
    playMusic(name, { resume: back });
  }

  return { init, play, playMusic, stopMusic, jingle, toggleMute, get current() { return currentName; } };
})();
