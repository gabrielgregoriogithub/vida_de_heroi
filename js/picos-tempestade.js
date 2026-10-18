// Picos da Tempestade: setima regiao, liberada apos derrotar o Colosso da Forja.
// Ilhas sobre abismos, correntes de ar, rajadas e o Dragao da Tempestade.
const STORM_START = FORGE_END, STORM_ARENA = 18700, DRAGON_HOME = 19300, DRAGON_HP = 80;
const STORM_TYPES = { harpy: 21, sentinel: 22, stormcloud: 23, dragon: 24 };
const BOLT_SPEED = 1300, ROD_CHARGE = 8, ARENA_ROD_CHARGE = 5;

let storm = null;

function stormFoe(kind, x, y, hp, extra = {}) {
  const e = [x, y, -1, 0, 1, hp, STORM_TYPES[kind]];
  return Object.assign(e, { frost: kind, storm: true, maxHp: hp, originX: x, homeX: x, homeY: y, t: Math.random() * 3, cd: 1.5 + Math.random(), hitFx: 0, lastHp: hp }, extra);
}

function stormReset() {
  storm = {
    entered: false, bolt: false, feather: false, gateMsg: 0, msgCd: 0, arenaLocked: false, bossDefeated: false, phase: 1,
    chasms: [[16150, 180], [16900, 360], [17900, 400]],
    drafts: [{ x: 16600, w: 80, top: 380 }, { x: 17080, w: 90, top: 260 }],
    gust: { cd: 9, warn: 0, t: 0, dir: -1 },
    rods: [{ x: 17850, charge: 0, bridge: true }, { x: 18820, charge: 0 }, { x: 19780, charge: 0 }],
    shrines: [{ x: 17330, lit: false }, { x: 18400, lit: false }, { x: 18640, lit: false }],
    featherSpot: { x: 16695, y: 245, taken: false },
    strikes: [], arcs: [], flashT: 0, dragon: null, bridge: null
  };
  // O chao continuo da caverna termina aqui; daqui em diante ha abismos.
  const ground = platforms.find(p => p[0] === SEA_END && p[1] === FLOOR);
  if (ground) ground[2] = STORM_START - SEA_END;
  let x = STORM_START;
  storm.chasms.forEach(([cx, w]) => { platforms.push([x, FLOOR, cx - x, 108, 'stormground']); x = cx + w; });
  platforms.push([x, FLOOR, WORLD_W - x, 108, 'stormground']);
  storm.bridge = Object.assign([17900, 470, 400, 16, 'bridge'], { baseY: 470 });
  storm.bridge[1] = FLOOR + 500;
  platforms.push(
    [16380, 420, 130, 22, 'marble'], [16640, 245, 110, 20, 'cloud'], [17140, 330, 120, 20, 'cloud'],
    [17420, 360, 140, 24, 'marble'], [17640, 280, 120, 20, 'cloud'], storm.bridge,
    [18950, 400, 140, 22, 'cloud'], [19250, 320, 160, 22, 'cloud'], [19560, 400, 140, 22, 'cloud']
  );
  weapons.push([17490, 325, 7, 1]);
  const dragon = stormFoe('dragon', DRAGON_HOME, 220, DRAGON_HP, { mode: 'fly', windup: 0, stun: 0, cd: 2.5, trail: [] });
  storm.dragon = dragon;
  enemies.push(
    stormFoe('harpy', 16450, 260, 4),
    stormFoe('sentinel', 16820, FLOOR - 55, 7, { face: -1 }),
    stormFoe('harpy', 17560, 220, 4),
    stormFoe('stormcloud', 17760, 200, 5),
    stormFoe('stormcloud', 18120, 190, 5),
    stormFoe('harpy', 18200, 250, 4),
    stormFoe('sentinel', 18560, FLOOR - 55, 7, { face: -1 }),
    dragon
  );
}

function stormSfx(kind) {
  if (kind === 'thunder') { tone(90, 30, .7, 'sawtooth', .06); tone(1400, 200, .2, 'square', .03); }
  else if (kind === 'zap') { tone(1800, 600, .12, 'square', .03); tone(2400, 900, .08, 'triangle', .02); }
  else if (kind === 'beam') { tone(300, 1200, .4, 'sawtooth', .03); }
  else if (kind === 'roar') { tone(160, 60, .9, 'sawtooth', .06); tone(240, 90, .7, 'square', .03); }
  else if (kind === 'gust') { tone(200, 120, 1.2, 'sine', .03); }
  else if (kind === 'rod') { tone(600, 1600, .3, 'triangle', .04); }
}

function stormMsg(text, duration = 1.6) { msg = text; msgTime = duration; }
function stormHint(text, duration = 2) { if (storm.msgCd > 0) return; stormMsg(text, duration); storm.msgCd = 3; }

function inChasm(x) { return storm && storm.chasms.some(([cx, w]) => x > cx + 6 && x < cx + w - 6); }
function inDraft(x) { return storm.drafts.find(d => Math.abs(x - d.x) < d.w / 2); }

// O chao deixa de segurar o heroi sobre os abismos (ou depois que ele ja caiu abaixo da borda).
const baseOverAbyss = overAbyss;
overAbyss = function (x) { return baseOverAbyss(x) || inChasm(x) || (!!storm && x > STORM_START && hero.y + 35 > FLOOR + 25); };

// Mira automatica do Raio: procura o inimigo mais proximo a frente.
function boltAim() {
  const ox = hero.x + hero.face * 28, oy = hero.y - 24;
  let best = null, bestD = 520;
  enemies.forEach(e => {
    if (!e[4]) return;
    const dx = e[0] - ox;
    if (dx * hero.face < 20) return;
    const d = Math.hypot(dx, e[1] - oy);
    if (d < bestD) { bestD = d; best = e; }
  });
  if (!best) return 0;
  return Math.max(-BOLT_SPEED, Math.min(BOLT_SPEED, (best[1] - oy) * BOLT_SPEED / Math.abs(best[0] - ox)));
}

function chainBolt(a, e) {
  let from = e;
  const hitList = [e];
  for (let i = 0; i < 2; i++) {
    const next = enemies.find(o => o[4] && !hitList.includes(o) && !a.hitIds.includes(o) && o.frost !== 'dragon' && Math.hypot(o[0] - from[0], o[1] - from[1]) < 230);
    if (!next) break;
    storm.arcs.push({ x1: from[0], y1: from[1] - 10, x2: next[0], y2: next[1] - 10, t: .25 });
    next[5] -= 1; if (next[5] <= 0) next[4] = 0;
    hitList.push(next); from = next;
  }
}

const forgeHitPower = hitPower;
hitPower = function (a, e) {
  const power = forgeHitPower(a, e);
  if (a.kind === 7 && !a.chained && e.frost !== 'dragon') { a.chained = true; chainBolt(a, e); }
  if (!e.storm || power <= 0) return power;
  if (e.frost === 'stormcloud' && a.kind !== 7) {
    burst(a.x, a.y, '#c9d6ff', 8, 80); stormHint('Nuvens de tempestade so se dispersam com o RAIO (ou RUPTURA ASTRAL).', 1.8); return 0;
  }
  if (e.frost !== 'dragon') return power;
  if (a.kind === 7) { burst(a.x, a.y, '#fff27a', 10, 100); stormHint('O dragao ABSORVE o raio! Carregue os PARA-RAIOS com ele.', 2); return 0; }
  if (e.stun > 0) return power * 2;
  if (storm.phase === 2) { burst(a.x, a.y, '#9fb4ff', 10, 110); stormHint('Escudo de Tempestade! Carregue os dois PARA-RAIOS para derruba-lo.', 2); return 0; }
  return power;
};

function updateStormHero(dt) {
  const blocking = down('KeyL') && shieldLevel > 0;
  const colossus = forge.colossus;
  if (colossus && colossus[4] && hero.x > STORM_START - 40) {
    hero.x = STORM_START - 40; hero.vx = Math.min(0, hero.vx);
    if (storm.gateMsg <= 0) { stormMsg('O caminho para os Picos so se abre apos a queda do Colosso.', 2); storm.gateMsg = 3; }
  }
  storm.gateMsg = Math.max(0, storm.gateMsg - dt);
  const draft = inDraft(hero.x);
  const depth = draft ? hero.y + 35 - draft.top : 0;
  if (draft && depth > 0 && hero.y + 35 < FLOOR + 220) {
    // Sobe rapido no fundo da coluna e paira de forma estavel perto do topo.
    hero.vy += (-Math.min(430, depth * 6) - hero.vy) * Math.min(1, 8 * dt);
    if (Math.random() < .4) particles.push({ x: hero.x + (Math.random() - .5) * 40, y: hero.y + 40, vx: 0, vy: -200, life: .4, max: .4, size: 2, color: '#d9f3ff' });
  }
  const g = storm.gust;
  if (g.t > 0 && hero.x > STORM_START + 200 && !storm.feather) hero.x += g.dir * (blocking ? 40 : 150) * dt;
  if (storm.arenaLocked && hero.x < STORM_ARENA + 20) { hero.x = STORM_ARENA + 20; hero.vx = Math.max(0, hero.vx); }
  if (hero.y > FLOOR + 120 && hero.x > STORM_START && !draft) {
    const before = hero.hp + hero.armor;
    damage();
    if (hero.hp + hero.armor < before || hero.inv > 0) { hero.x = checkpointX; hero.y = checkpointY; hero.vx = hero.vy = 0; }
    stormMsg('Voce caiu no abismo!', 1.5);
  }
}

function updateGust(dt) {
  const g = storm.gust, active = hero.x > STORM_START + 200 && (hero.x < STORM_ARENA || storm.phase === 2);
  if (!active) { g.t = 0; g.warn = 0; return; }
  if (g.t > 0) { g.t -= dt; if (g.t <= 0) g.cd = 7 + Math.random() * 4; return; }
  if (g.warn > 0) { g.warn -= dt; if (g.warn <= 0) { g.t = 2.4; stormSfx('gust'); } return; }
  g.cd -= dt;
  if (g.cd <= 0) {
    g.dir = Math.random() < .6 ? -1 : 1; g.warn = 1.4;
    stormMsg(storm.feather ? 'Rajada chegando... a Pena do Vendaval protege voce.' : `RAJADA DE VENTO ${g.dir < 0 ? '←' : '→'}  (segure L com escudo)`, 1.6);
  }
}

function addStrike(x, delay = 1) { storm.strikes.push({ x, warn: delay, t: 0 }); }

function updateStrikes(dt) {
  storm.strikes.forEach(s => {
    if (s.warn > 0) { s.warn -= dt; if (s.warn <= 0) { s.t = .3; stormSfx('thunder'); storm.flashT = .12; } return; }
    s.t -= dt;
    if (s.t > 0 && Math.abs(hero.x - s.x) < 30) damage();
  });
  storm.strikes = storm.strikes.filter(s => s.warn > 0 || s.t > 0);
  storm.arcs.forEach(a => { a.t -= dt; });
  storm.arcs = storm.arcs.filter(a => a.t > 0);
  storm.flashT = Math.max(0, storm.flashT - dt);
}

function updateRods(dt) {
  arrows.forEach(a => {
    if (a.life <= 0) return;
    storm.rods.forEach(r => {
      if (Math.abs(a.x - r.x) > 22 || a.y < FLOOR - 140 || a.y > FLOOR) return;
      a.life = 0;
      if (a.kind !== 7) { stormHint('Para-raios: acerte-o com o RAIO para carrega-lo.', 1.6); return; }
      r.charge = r.bridge ? ROD_CHARGE : ARENA_ROD_CHARGE; stormSfx('rod'); burst(r.x, FLOOR - 130, '#fff27a', 20, 140);
      if (r.bridge) stormMsg('A ponte de energia se acendeu!', 1.6);
    });
  });
  storm.rods.forEach(r => { r.charge = Math.max(0, r.charge - dt); });
  const bridgeRod = storm.rods[0];
  storm.bridge[1] = bridgeRod.charge > 0 ? storm.bridge.baseY : FLOOR + 500;
  const [, left, right] = storm.rods, d = storm.dragon;
  if (d && d[4] && storm.arenaLocked && left.charge > 0 && right.charge > 0) {
    left.charge = right.charge = 0;
    storm.arcs.push({ x1: left.x, y1: FLOOR - 130, x2: d[0], y2: d[1], t: .5 }, { x1: right.x, y1: FLOOR - 130, x2: d[0], y2: d[1], t: .5 });
    d.stun = 3.5; d.windup = 0; d.mode = 'fly'; d[5] -= 4; if (d[5] <= 0) d[4] = 0;
    stormSfx('thunder'); storm.flashT = .25; shake = .45;
    stormMsg('RAIO ANCESTRAL! O dragao caiu: ATAQUE (dano dobrado)!', 2.5);
  }
}

function updateHarpy(e, dt) {
  if (e.swoop > 0) {
    e.swoop -= dt;
    const k = 1 - e.swoop / 1.2;
    e[0] = e.sx + (e.tx - e.sx) * k; e[1] = e.homeY + Math.sin(k * Math.PI) * (e.ty - e.homeY);
    if (e.swoop <= 0) e.homeX = Math.max(e.originX - 200, Math.min(e.originX + 200, e[0]));
    return;
  }
  e[0] += (e.homeX + Math.sin(e.t * 1.1) * 90 - e[0]) * Math.min(1, 2 * dt);
  e[1] += (e.homeY + Math.sin(e.t * 2.2) * 18 - e[1]) * Math.min(1, 2 * dt);
  e[2] = hero.x < e[0] ? -1 : 1; e.cd -= dt;
  const dx = hero.x - e[0];
  if (e.cd > 0 || Math.abs(dx) > 420) return;
  if (Math.random() < .5) { e.swoop = 1.2; e.sx = e[0]; e.tx = e[0] + dx * 1.6; e.ty = hero.y - 10; tone(900, 500, .2, 'triangle', .02); }
  else { [-60, 0, 60].forEach(vx => enemyShots.push({ x: e[0], y: e[1] + 10, vx, vy: 300, life: 2, kind: 'feather', frost: 1, storm: 1 })); }
  e.cd = 2.6;
}

function updateSentinel(e, dt) {
  e[1] = e.homeY + Math.sin(e.t * 2) * 6; e[2] = e.face;
  if (e.beam > 0) {
    e.beam -= dt;
    const dir = e.face, inBeam = (hero.x - e[0]) * dir > 10 && Math.abs(hero.x - e[0]) < 720 && Math.abs(hero.y - 18 - e[1]) < 30;
    const blocked = down('KeyL') && shieldLevel > 0 && hero.face === -dir;
    if (inBeam && !blocked) damage();
    return;
  }
  if (e.cast > 0) { e.cast -= dt; if (e.cast <= 0) { e.beam = .35; stormSfx('beam'); } return; }
  e.cd -= dt;
  if (e.cd <= 0 && Math.abs(hero.x - e[0]) < 700) { e.face = hero.x < e[0] ? -1 : 1; e.cast = .9; e.cd = 2.8; }
}

function updateStormcloud(e, dt) {
  e[0] = e.homeX + Math.sin(e.t * .6) * 120; e[1] = e.homeY + Math.sin(e.t * 1.4) * 8;
  e.cd -= dt;
  if (e.cd <= 0 && Math.abs(hero.x - e[0]) < 500) { addStrike(Math.max(e[0] - 180, Math.min(e[0] + 180, hero.x)), .9); e.cd = 3; }
}

function updateDragon(e, dt) {
  e.trail.unshift([e[0], e[1]]); if (e.trail.length > 40) e.trail.pop();
  if (!storm.arenaLocked) { e[0] += (e.homeX - e[0]) * Math.min(1, dt); e[1] = e.homeY + Math.sin(e.t * 1.5) * 20; return; }
  const rage = storm.phase === 2;
  if (e.stun > 0) {
    e.stun -= dt; e[1] += (FLOOR - 70 - e[1]) * Math.min(1, 5 * dt);
    if (Math.random() < .3) particles.push({ x: e[0] + (Math.random() - .5) * 60, y: e[1] - 20, vx: 0, vy: -60, life: .5, max: .5, size: 3, color: '#fff27a' });
    return;
  }
  if (e.mode === 'dive') {
    const ang = Math.atan2(e.ty - e[1], e.tx - e[0]);
    e[0] += Math.cos(ang) * 620 * dt; e[1] += Math.sin(ang) * 620 * dt;
    if (Math.hypot(e.tx - e[0], e.ty - e[1]) < 24) {
      e.mode = 'fly'; shake = .3; stormSfx('thunder');
      [-1, 1].forEach(dir => enemyShots.push({ x: e[0], y: FLOOR - 22, vx: dir * 360, vy: 0, life: 2, kind: 'spark', frost: 1, storm: 1 }));
    }
    return;
  }
  const tx = Math.max(STORM_ARENA + 120, Math.min(WORLD_W - 140, hero.x + Math.sin(e.t * .7) * 260)), ty = 210 + Math.sin(e.t * 1.6) * 35;
  e[0] += (tx - e[0]) * Math.min(1, 1.4 * dt); e[1] += (ty - e[1]) * Math.min(1, 2 * dt);
  e[2] = hero.x < e[0] ? -1 : 1;
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup > 0) return;
    if (e.next === 'breath') {
      const n = rage ? 7 : 5, base = Math.atan2(hero.y - 18 - e[1], hero.x - e[0]);
      for (let i = 0; i < n; i++) { const ang = base + (i - (n - 1) / 2) * .18; enemyShots.push({ x: e[0] + e[2] * 40, y: e[1], vx: Math.cos(ang) * 340, vy: Math.sin(ang) * 340, life: 3.5, kind: 'spark', frost: 1, storm: 1 }); }
      stormSfx('zap');
    } else if (e.next === 'dive') { e.mode = 'dive'; e.tx = hero.x; e.ty = FLOOR - 60; stormSfx('roar'); }
    else { const xs = rage ? [-220, -110, 0, 110, 220] : [-160, 0, 160]; xs.forEach((o, i) => addStrike(Math.max(STORM_ARENA + 40, Math.min(WORLD_W - 40, hero.x + o)), 1 + i * .08)); }
    return;
  }
  e.cd -= dt;
  if (e.cd > 0) return;
  const pick = ['breath', 'dive', 'strike'][Math.floor(e.t * 7) % 3];
  e.next = pick; e.windup = pick === 'dive' ? .8 : .7; e.cd = rage ? 2.2 : 3;
}

function updateStormFoes(dt) {
  enemies.forEach(e => {
    if (!e.storm || !e[4] || e.frozen > 0) return;
    if (e.frost === 'harpy') updateHarpy(e, dt);
    else if (e.frost === 'sentinel') updateSentinel(e, dt);
    else if (e.frost === 'stormcloud') updateStormcloud(e, dt);
    else if (e.frost === 'dragon') updateDragon(e, dt);
  });
  const d = storm.dragon;
  if (d && d[4] && storm.arenaLocked && d.stun <= 0 && Math.hypot(hero.x - d[0], hero.y - d[1]) < 60) damage();
}

// O Dragao e grande: acerto proprio com caixa maior que o raio padrao.
function updateDragonHits() {
  const d = storm.dragon;
  if (!d || !d[4]) return;
  arrows.forEach(a => {
    if (a.life <= 0 || a.hitIds.includes(d) || Math.abs(a.x - d[0]) > 70 || Math.abs(a.y - d[1]) > 50) return;
    a.hitIds.push(d); d[5] -= hitPower(a, d); score += 15; playSfx('bossHit');
    burst(a.x, a.y, d.stun > 0 ? '#fff27a' : '#9fb4ff', 10, 100);
    if (d[5] <= 0) d[4] = 0;
    if (!a.pierce) a.life = 0;
  });
}

function lightShrine(s) {
  s.lit = true; checkpoint = true; checkpointX = s.x; checkpointY = FLOOR - 35;
  score += 150; stormSfx('rod'); burst(s.x, FLOOR - 60, '#9fe8ff', 30, 160);
  stormMsg('Santuario do vento: checkpoint!', 2);
}

function updateStormWorld(dt) {
  storm.msgCd = Math.max(0, storm.msgCd - dt);
  storm.bolt = storm.bolt || maxWeapon >= 7;
  if (!storm.entered && hero.x > 15860) {
    storm.entered = true; checkpoint = true; checkpointX = 15860; checkpointY = FLOOR - 35;
    stormMsg('PICOS DA TEMPESTADE - checkpoint. Cuidado com os abismos!', 3); burst(hero.x, hero.y - 20, '#9fe8ff', 30, 160);
  }
  storm.shrines.forEach(s => { if (!s.lit && Math.abs(hero.x - s.x) < 40 && hero.y + 35 >= FLOOR - 5) lightShrine(s); });
  const spot = storm.featherSpot;
  if (!spot.taken && Math.hypot(hero.x - spot.x, hero.y + 35 - spot.y) < 50) {
    spot.taken = true; storm.feather = true; hero.maxHp = Math.min(6, hero.maxHp + 1); hero.hp = hero.maxHp; score += 700;
    haptic([25, 25, 90]); playSfx('collect'); flash = .2; burst(spot.x, spot.y - 30, '#d9f3ff', 50, 220);
    stormMsg('PENA DO VENDAVAL: rajadas nao empurram mais voce e +1 vida maxima!', 4);
  }
  if (storm.rods[0].charge <= 0 && Math.abs(hero.x - 17850) < 160 && !storm.bolt) stormHint('O abismo e largo demais... um para-raios alimenta a ponte. Ache o RAIO.', 2.4);
  if (storm.arenaLocked && hero.x < STORM_ARENA) storm.arenaLocked = false;
  const d = storm.dragon;
  if (d && d[4] && !storm.arenaLocked && hero.x > STORM_ARENA + 40) {
    storm.arenaLocked = true; bossWarning = 1.5; shake = .3; stormSfx('roar');
    stormMsg('O DRAGAO DA TEMPESTADE DESPERTA! Use os PARA-RAIOS para derruba-lo.', 3.5);
  }
  if (d && d[4] && d[5] <= DRAGON_HP / 2 && storm.phase === 1) {
    storm.phase = 2; flash = .25; shake = .4; storm.gust.cd = 3; stormSfx('roar');
    stormMsg('FASE 2: ESCUDO DE TEMPESTADE! So o Raio Ancestral o derruba.', 3);
  }
  if (d && !d[4] && !storm.bossDefeated) {
    storm.bossDefeated = true; storm.arenaLocked = false; storm.strikes = []; storm.gust.t = 0;
    enemyShots = enemyShots.filter(s => !s.storm);
    heartDrops.push([d[0], FLOOR - 40, 1]); hero.maxHp = Math.min(6, hero.maxHp + 1); hero.hp = hero.maxHp;
    score += 2500; flash = .45; shake = .6;
    burst(d[0], d[1], '#fff27a', 90, 320); burst(d[0], d[1], '#9fb4ff', 60, 240);
    stormMsg('O DRAGAO DA TEMPESTADE CAIU! O ceu se abre sobre o portal final.', 4);
  }
}

function stormUpdate(dt) {
  if (!storm || !started || paused || victory) return;
  updateStormFoes(dt);
  updateDragonHits();
  updateRods(dt);
  updateStrikes(dt);
  updateGust(dt);
  updateStormHero(dt);
  updateStormWorld(dt);
}

// ---------- Desenho ----------

function drawStormBackdrop() {
  if (cameraX + W < STORM_START) return;
  const left = STORM_START, right = WORLD_W, view = cameraX;
  ctx.save(); ctx.beginPath(); ctx.rect(left, 0, right - left, H); ctx.clip();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0b0e1f'); sky.addColorStop(.55, '#26304f'); sky.addColorStop(1, '#3b4466');
  ctx.fillStyle = sky; ctx.fillRect(left, 0, right - left, H);
  // Relampagos distantes.
  const flicker = (Math.sin(time * 1.7) > .97 || storm.flashT > 0) ? 1 : 0;
  if (flicker) {
    ctx.fillStyle = 'rgba(200,215,255,.12)'; ctx.fillRect(left, 0, right - left, H);
    const bx = view + ((Math.floor(time * 1.7 / 6.28) * 397) % W);
    ctx.strokeStyle = 'rgba(230,240,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 0);
    for (let y = 0, x = bx; y < 260; y += 30) { x += ((y * 7) % 40) - 20; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // Picos e ilhas flutuantes (parallax).
  const farShift = view * .35, farOff = farShift % 380, farIdx = Math.floor(farShift / 380);
  for (let i = -1; i < 5; i++) {
    const x = view + i * 380 - farOff, peak = 170 + ((farIdx + i + 50) % 3) * 50;
    ctx.fillStyle = '#1a2038'; ctx.beginPath(); ctx.moveTo(x - 30, FLOOR); ctx.lineTo(x + 190, peak); ctx.lineTo(x + 410, FLOOR); ctx.fill();
    ctx.fillStyle = 'rgba(210,225,255,.35)'; ctx.beginPath(); ctx.moveTo(x + 190, peak); ctx.lineTo(x + 160, peak + 50); ctx.lineTo(x + 220, peak + 50); ctx.fill();
  }
  const midShift = view * .65, midOff = midShift % 320, midIdx = Math.floor(midShift / 320);
  for (let i = -1; i < 6; i++) {
    const x = view + i * 320 - midOff + 40, y = 250 + (((midIdx + i + 50) * 41) % 120) + Math.sin(time + i) * 6;
    ctx.fillStyle = '#2c3556'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 110, y); ctx.lineTo(x + 70, y + 70); ctx.lineTo(x + 40, y + 60); ctx.fill();
    ctx.fillStyle = '#5c7a6a'; ctx.fillRect(x, y - 5, 110, 7);
    ctx.fillStyle = 'rgba(180,220,255,.35)'; ctx.fillRect(x + 80, y + 4, 4, 90 + (i % 2) * 40);
  }
  // Nuvens baixas em movimento.
  for (let i = 0; i < 7; i++) {
    const x = view + (((i * 260 - time * 22 - view * .2) % (W + 300)) + W + 300) % (W + 300) - 150, y = 80 + (i * 53) % 140;
    ctx.fillStyle = 'rgba(60,70,105,.55)'; ctx.beginPath(); ctx.ellipse(x, y, 120, 26, 0, 0, 7); ctx.ellipse(x + 60, y - 14, 70, 22, 0, 0, 7); ctx.fill();
  }
  const fade = ctx.createLinearGradient(left, 0, left + 240, 0);
  fade.addColorStop(0, 'rgba(61,18,16,.9)'); fade.addColorStop(1, 'rgba(61,18,16,0)');
  ctx.fillStyle = fade; ctx.fillRect(left, 0, 240, H);
  if (storm.arenaLocked || hero.x > STORM_ARENA - 400) { ctx.fillStyle = `rgba(150,170,255,${.04 + .03 * Math.sin(time * 2)})`; ctx.fillRect(STORM_ARENA, 0, right - STORM_ARENA, H); }
  ctx.restore();
}

function drawStormTerrain() {
  if (cameraX + W < STORM_START) return;
  platforms.forEach(p => {
    if (p[4] !== 'stormground') return;
    const g = ctx.createLinearGradient(0, FLOOR, 0, H);
    g.addColorStop(0, '#4a5470'); g.addColorStop(1, '#1b2034');
    ctx.fillStyle = g; ctx.fillRect(p[0], FLOOR, p[2], H - FLOOR);
    ctx.fillStyle = '#6f9a7e'; ctx.fillRect(p[0], FLOOR - 4, p[2], 8);
    ctx.fillStyle = '#56806a'; for (let x = p[0] + 8; x < p[0] + p[2] - 8; x += 22) { ctx.beginPath(); ctx.moveTo(x, FLOOR - 3); ctx.lineTo(x + 4, FLOOR - 12 - (x % 3) * 3); ctx.lineTo(x + 8, FLOOR - 3); ctx.fill(); }
  });
  storm.chasms.forEach(([x, w]) => {
    const g = ctx.createLinearGradient(0, FLOOR, 0, H);
    g.addColorStop(0, 'rgba(10,12,25,.2)'); g.addColorStop(1, 'rgba(5,6,14,.95)');
    ctx.fillStyle = g; ctx.fillRect(x, FLOOR - 4, w, H - FLOOR + 4);
    ctx.fillStyle = 'rgba(200,215,255,.18)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + w / 2 + Math.sin(time * .8 + i) * w * .3, H - 30 - i * 20, w * .45, 10, 0, 0, 7); ctx.fill(); }
  });
  storm.drafts.forEach(d => {
    ctx.fillStyle = 'rgba(217,243,255,.07)'; ctx.fillRect(d.x - d.w / 2, d.top - 40, d.w, H - d.top + 40);
    ctx.strokeStyle = 'rgba(217,243,255,.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const y = H - ((time * 260 + i * 90) % (H - d.top + 40)), x = d.x - d.w / 2 + 10 + i * (d.w - 20) / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(time * 6 + i) * 6, y - 26); ctx.stroke(); }
  });
  platforms.forEach(p => {
    if (p[4] === 'cloud') {
      ctx.fillStyle = 'rgba(230,238,255,.92)';
      for (let x = p[0] + 14; x < p[0] + p[2]; x += 26) { ctx.beginPath(); ctx.arc(x, p[1] + 6 + Math.sin(time * 2 + x) * 1.5, 16, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(160,180,220,.6)'; ctx.fillRect(p[0] + 4, p[1] + 12, p[2] - 8, 8);
    } else if (p[4] === 'marble') {
      ctx.fillStyle = '#c8cde0'; ctx.fillRect(p[0], p[1], p[2], p[3]); ctx.fillStyle = '#e8ecf8'; ctx.fillRect(p[0], p[1], p[2], 5);
      ctx.fillStyle = '#8a93b0'; for (let x = p[0] + 18; x < p[0] + p[2]; x += 36) ctx.fillRect(x, p[1] + 8, 3, p[3] - 10);
    } else if (p[4] === 'bridge') {
      const rod = storm.rods[0];
      if (rod.charge <= 0) return;
      const blink = rod.charge < 1.6 && Math.sin(time * 30) > 0 ? .35 : .9;
      ctx.fillStyle = `rgba(255,242,122,${blink * .35})`; ctx.fillRect(p[0], p[1] - 6, p[2], p[3] + 12);
      ctx.fillStyle = `rgba(255,250,200,${blink})`; ctx.fillRect(p[0], p[1], p[2], 5);
      ctx.strokeStyle = `rgba(255,242,122,${blink})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p[0], p[1] + 10);
      for (let x = p[0]; x <= p[0] + p[2]; x += 20) ctx.lineTo(x, p[1] + 10 + Math.sin(time * 25 + x) * 4);
      ctx.stroke();
    }
  });
  storm.rods.forEach(r => {
    ctx.fillStyle = '#3a4058'; ctx.fillRect(r.x - 5, FLOOR - 120, 10, 120); ctx.fillRect(r.x - 16, FLOOR - 10, 32, 10);
    ctx.fillStyle = r.charge > 0 ? '#fff27a' : '#8a93b0'; ctx.beginPath(); ctx.moveTo(r.x, FLOOR - 150); ctx.lineTo(r.x + 9, FLOOR - 120); ctx.lineTo(r.x - 9, FLOOR - 120); ctx.fill();
    if (r.charge > 0) { ctx.fillStyle = `rgba(255,242,122,${.25 + .15 * Math.sin(time * 12)})`; ctx.beginPath(); ctx.arc(r.x, FLOOR - 132, 26, 0, 7); ctx.fill(); }
    if (Math.abs(hero.x - r.x) < 520) text(r.charge > 0 ? `${Math.ceil(r.charge)}s` : 'PARA-RAIOS', r.x, FLOOR - 160, 11, r.charge > 0 ? '#fff27a' : '#9fb4ff', 'center');
  });
  storm.shrines.forEach(s => {
    ctx.fillStyle = '#7d86a8'; ctx.fillRect(s.x - 10, FLOOR - 64, 20, 64); ctx.fillRect(s.x - 18, FLOOR - 70, 36, 8);
    ctx.fillStyle = s.lit ? '#9fe8ff' : '#4a5470'; ctx.beginPath(); ctx.arc(s.x, FLOOR - 80, 8, 0, 7); ctx.fill();
    if (s.lit) { ctx.fillStyle = `rgba(159,232,255,${.2 + .1 * Math.sin(time * 4)})`; ctx.beginPath(); ctx.arc(s.x, FLOOR - 80, 22, 0, 7); ctx.fill(); }
  });
  const spot = storm.featherSpot;
  if (!spot.taken) {
    const y = spot.y - 34 + Math.sin(time * 3) * 5;
    ctx.fillStyle = 'rgba(217,243,255,.22)'; ctx.beginPath(); ctx.arc(spot.x, y, 28, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(spot.x, y); ctx.rotate(-.6 + Math.sin(time * 2) * .15);
    ctx.fillStyle = '#eef6ff'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 20, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7fb8e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 24); ctx.stroke(); ctx.restore();
    text('PENA', spot.x, y + 32, 10, '#d9f3ff', 'center');
  }
  storm.strikes.forEach(s => {
    if (s.warn > 0) {
      ctx.strokeStyle = `rgba(255,242,122,${.5 + .5 * Math.sin(time * 30)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x, FLOOR - 2, 30 * (1.2 - s.warn * .4), 6, 0, 0, 7); ctx.stroke();
    } else {
      ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 5; ctx.shadowBlur = 24; ctx.shadowColor = '#fff27a';
      ctx.beginPath(); ctx.moveTo(s.x, 0); for (let y = 0, x = s.x; y < FLOOR; y += 40) { x = s.x + Math.sin(y * 13 + time * 50) * 16; ctx.lineTo(x, y); } ctx.lineTo(s.x, FLOOR); ctx.stroke(); ctx.shadowBlur = 0;
    }
  });
}

function drawHarpy(e, hit) {
  const x = e[0], y = e[1], d = e[2], flap = Math.sin(time * 12 + e.homeY) * 16;
  ctx.fillStyle = hit ? '#ffffff' : '#6a5a8a';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.quadraticCurveTo(x + s * 30, y - 34 - flap, x + s * 52, y - 10 + flap * .5); ctx.lineTo(x + s * 14, y + 2); ctx.fill(); });
  ctx.fillStyle = hit ? '#ffffff' : '#c8b4a0'; ctx.beginPath(); ctx.ellipse(x, y, 11, 17, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + d * 6, y - 20, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2a4a'; ctx.beginPath(); ctx.moveTo(x + d * 6 - 9, y - 26); ctx.quadraticCurveTo(x - d * 14, y - 36, x - d * 22, y - 14); ctx.lineTo(x + d * 4, y - 22); ctx.fill();
  ctx.fillStyle = '#ffd65a'; ctx.beginPath(); ctx.moveTo(x + d * 14, y - 21); ctx.lineTo(x + d * 22, y - 18); ctx.lineTo(x + d * 14, y - 16); ctx.fill();
  ctx.fillStyle = '#ff5b77'; ctx.fillRect(x + d * 8 - 2, y - 23, 4, 3);
  ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 5, y + 16); ctx.lineTo(x - 8, y + 26); ctx.moveTo(x + 5, y + 16); ctx.lineTo(x + 8, y + 26); ctx.stroke();
}

function drawSentinel(e, hit) {
  const x = e[0], y = e[1], dir = e.face;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, FLOOR, 30, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#6e7590';
  ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x - 18, y - 30); ctx.lineTo(x + 18, y - 30); ctx.lineTo(x + 30, y); ctx.lineTo(x + 18, y + 30); ctx.lineTo(x - 18, y + 30); ctx.fill();
  ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 20, 24, 40);
  const charge = e.cast > 0 ? 1 - e.cast / .9 : 0;
  ctx.fillStyle = e.beam > 0 || charge > 0 ? '#fff27a' : '#9fe8ff'; ctx.beginPath(); ctx.arc(x + dir * 8, y, 8 + charge * 4, 0, 7); ctx.fill();
  if (e.cast > 0) { ctx.strokeStyle = `rgba(255,113,142,${.4 + .4 * Math.sin(time * 30)})`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(x + dir * 20, y); ctx.lineTo(x + dir * 720, y); ctx.stroke(); ctx.setLineDash([]); }
  if (e.beam > 0) {
    ctx.shadowBlur = 20; ctx.shadowColor = '#fff27a';
    ctx.fillStyle = 'rgba(255,242,122,.85)'; ctx.fillRect(Math.min(x + dir * 20, x + dir * 720), y - 9, 700, 18);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.min(x + dir * 20, x + dir * 720), y - 3, 700, 6); ctx.shadowBlur = 0;
  }
}

function drawStormcloud(e, hit) {
  const x = e[0], y = e[1], pulse = e.cd < .6 ? 1 : 0;
  ctx.fillStyle = hit ? 'rgba(255,255,255,.95)' : `rgba(70,78,110,.95)`;
  [[-36, 6, 26], [-10, -8, 32], [22, 0, 28], [44, 10, 20], [0, 14, 30]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill(); });
  ctx.fillStyle = pulse ? '#fff27a' : 'rgba(255,242,122,.5)';
  ctx.fillRect(x - 14, y + 4, 8, 4); ctx.fillRect(x + 8, y + 4, 8, 4);
  if (pulse || Math.sin(time * 5 + x) > .9) { ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y + 30); ctx.lineTo(x - 2, y + 42); ctx.lineTo(x - 8, y + 44); ctx.lineTo(x + 2, y + 58); ctx.stroke(); }
}

function drawDragon(e, hit) {
  const d = e[2], x = e[0], y = e[1], shield = storm.phase === 2 && e.stun <= 0;
  // Corpo serpentino seguindo o rastro da cabeca.
  for (let i = e.trail.length - 1; i > 0; i -= 3) {
    const [tx, ty] = e.trail[i], r = 18 - i * .3;
    ctx.fillStyle = hit ? '#ffffff' : i % 6 === 0 ? '#3d4f8a' : '#2e3c6e'; ctx.beginPath(); ctx.arc(tx, ty + 6, Math.max(6, r), 0, 7); ctx.fill();
    if (i % 6 === 0) { ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.moveTo(tx - 4, ty - r + 6); ctx.lineTo(tx, ty - r - 4); ctx.lineTo(tx + 4, ty - r + 6); ctx.fill(); }
  }
  const flap = Math.sin(time * 6) * 26;
  ctx.fillStyle = hit ? '#ffffff' : 'rgba(80,100,170,.9)';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(x - d * 20, y); ctx.lineTo(x - d * 20 + s * 30, y - 70 - flap); ctx.lineTo(x - d * 20 + s * 90, y - 40 - flap * .5); ctx.lineTo(x - d * 20 + s * 40, y + 6); ctx.fill(); });
  ctx.fillStyle = hit ? '#ffffff' : '#3d4f8a'; ctx.beginPath(); ctx.ellipse(x, y, 40, 26, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + d * 40, y - 10, 26, 16, d * -.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#c9d6ff'; ctx.beginPath(); ctx.moveTo(x + d * 30, y - 24); ctx.lineTo(x + d * 18, y - 48); ctx.lineTo(x + d * 40, y - 26); ctx.fill();
  ctx.fillStyle = e.windup > 0 ? '#ff5b77' : '#fff27a'; ctx.beginPath(); ctx.arc(x + d * 50, y - 14, 4, 0, 7); ctx.fill();
  if (e.windup > 0 && e.next === 'breath') { ctx.fillStyle = `rgba(255,242,122,${.6 * (1 - e.windup)})`; ctx.beginPath(); ctx.arc(x + d * 66, y - 6, 14, 0, 7); ctx.fill(); }
  if (shield) { ctx.strokeStyle = `rgba(159,180,255,${.5 + .3 * Math.sin(time * 6)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 10, 82 + Math.sin(time * 4) * 5, 0, 7); ctx.stroke(); }
  if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = time * 4 + i * 2.1; ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 34, y - 44 + Math.sin(a) * 8, 4, 0, 7); ctx.fill(); }
}

function drawStormFoes() {
  enemies.forEach(e => {
    if (!e[4] || !e.storm) return;
    const hit = e.hitFx > 0;
    if (e.frost === 'harpy') drawHarpy(e, hit);
    else if (e.frost === 'sentinel') drawSentinel(e, hit);
    else if (e.frost === 'stormcloud') drawStormcloud(e, hit);
    else if (e.frost === 'dragon') drawDragon(e, hit);
  });
  storm.arcs.forEach(a => {
    ctx.strokeStyle = `rgba(255,250,200,${a.t * 4})`; ctx.lineWidth = 3; ctx.shadowBlur = 14; ctx.shadowColor = '#fff27a';
    ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
    for (let i = 1; i < 6; i++) { const k = i / 6; ctx.lineTo(a.x1 + (a.x2 - a.x1) * k + Math.sin(time * 70 + i) * 10, a.y1 + (a.y2 - a.y1) * k + Math.cos(time * 60 + i) * 10); }
    ctx.lineTo(a.x2, a.y2); ctx.stroke(); ctx.shadowBlur = 0;
  });
}

function drawStormShot(s) {
  ctx.save();
  if (s.kind === 'feather') {
    ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
    ctx.fillStyle = '#c8b4a0'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 12, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6a5a8a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
  } else if (s.kind === 'spark') {
    ctx.shadowBlur = 16; ctx.shadowColor = '#fff27a'; ctx.fillStyle = '#fffbe0';
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + time * 10, r = i % 2 ? 5 : 12; ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); } ctx.fill();
  }
  ctx.restore();
}

// Chamado de dentro do desenho de projeteis (ja transladado e rotacionado).
function drawBoltShot(a) {
  ctx.lineWidth = 3; ctx.strokeStyle = '#fffbe0'; ctx.beginPath(); ctx.moveTo(-34, 0);
  for (let x = -24; x <= 14; x += 10) ctx.lineTo(x, Math.sin(time * 80 + x) * 6);
  ctx.lineTo(20, 0); ctx.stroke();
  ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.arc(20, 0, 5, 0, 7); ctx.fill();
}

function drawBoltPickup(item) {
  const y = item[1] - 18 + Math.sin(time * 3) * 4;
  ctx.fillStyle = 'rgba(255,242,122,.2)'; ctx.beginPath(); ctx.arc(item[0], y, 30 + Math.sin(time * 6) * 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.moveTo(item[0] + 4, y - 26); ctx.lineTo(item[0] - 10, y + 2); ctx.lineTo(item[0], y + 2); ctx.lineTo(item[0] - 4, y + 26); ctx.lineTo(item[0] + 12, y - 4); ctx.lineTo(item[0] + 2, y - 4); ctx.fill();
  text('RAIO', item[0], item[1] + 28, 12, '#fff27a', 'center');
}

function drawStormAtmosphere() {
  if (cameraX + W < STORM_START) return;
  const startSx = Math.max(0, STORM_START - cameraX), g = storm.gust, gusting = g.t > 0 ? 1 : g.warn > 0 ? .4 : 0;
  const slant = gusting ? g.dir * 40 : -12;
  ctx.strokeStyle = 'rgba(180,200,240,.35)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 90 + gusting * 60; i++) {
    const sx = ((i * 97.3 + time * slant * 6) % W + W) % W, sy = (i * 61 + time * 620) % H;
    if (sx < startSx) continue;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + slant * .5, sy + 18); ctx.stroke();
  }
  if (gusting) {
    ctx.strokeStyle = `rgba(230,240,255,${.3 * gusting})`; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const sx = ((i * 233 + time * g.dir * 1000) % W + W) % W, sy = 120 + (i * 37) % 420; if (sx < startSx) continue; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - g.dir * 40, sy - 12, sx - g.dir * 90, sy); ctx.stroke(); }
  }
  if (storm.flashT > 0) { ctx.fillStyle = `rgba(230,240,255,${storm.flashT * 2})`; ctx.fillRect(startSx, 0, W - startSx, H); }
}

function drawStormUI() {
  if (!started || victory || hero.x <= FORGE_END) return;
  const chips = [
    [storm.bolt ? 'RAIO ✓' : 'RAIO —', storm.bolt ? '#fff27a' : '#5d6b80'],
    [storm.feather ? 'PENA DO VENDAVAL ✓' : 'PENA ?', storm.feather ? '#d9f3ff' : '#5d6b80']
  ];
  let x = 28;
  chips.forEach(([label, color]) => { ctx.font = '12px system-ui,sans-serif'; const w = ctx.measureText(label).width + 18; ctx.fillStyle = 'rgba(8,12,24,.82)'; ctx.fillRect(x, 128, w, 22); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + .5, 128.5, w - 1, 21); text(label, x + 9, 143, 12, color); x += w + 6; });
  const d = storm.dragon;
  if (d && d[4] && storm.arenaLocked) {
    const w = 460, bx = 576 - w / 2, y = 158, shield = storm.phase === 2 && d.stun <= 0;
    ctx.fillStyle = 'rgba(7,10,20,.9)'; ctx.fillRect(bx - 4, y - 4, w + 8, 18);
    ctx.fillStyle = d.stun > 0 ? '#fff27a' : shield ? '#9fb4ff' : '#6f8cff'; ctx.fillRect(bx, y, w * Math.max(0, d[5] / DRAGON_HP), 10);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx + w / 2 - 1, y - 3, 2, 16);
    const [, l, r] = storm.rods;
    text(`DRAGAO DA TEMPESTADE  •  FASE ${storm.phase}${d.stun > 0 ? '  •  CAIDO!' : shield ? '  •  ESCUDO' : ''}   ⚡${l.charge > 0 ? '●' : '○'}${r.charge > 0 ? '●' : '○'}`, 576, y - 10, 15, d.stun > 0 ? '#fff27a' : '#9fb4ff', 'center');
  }
  if (storm.gust.t > 0 && !storm.feather) text(storm.gust.dir < 0 ? '« RAJADA «' : '» RAJADA »', 576, 590, 16, '#e8f0ff', 'center');
}

// ---------- Integracao com o jogo existente ----------

const forgeLoadLevel = loadLevel;
loadLevel = function () { forgeLoadLevel(); stormReset(); };
const forgeUpdateLoop = update;
update = function (dt) { forgeUpdateLoop(dt); stormUpdate(dt); };
const forgeDrawBossArena = drawBossArena;
drawBossArena = function () { forgeDrawBossArena(); if (storm) drawStormBackdrop(); };
const forgeDrawWorldExtras = drawWorldExtras;
drawWorldExtras = function () { forgeDrawWorldExtras(); if (storm) drawStormTerrain(); };
const forgeDrawEnemyPremium = drawEnemyPremium;
drawEnemyPremium = function () { forgeDrawEnemyPremium(); if (storm) drawStormFoes(); };
const forgeDrawShot = drawFrostShot;
drawFrostShot = function (s) { if (s.storm) drawStormShot(s); else forgeDrawShot(s); };
const forgeDrawAtmosphere = drawAtmosphere;
drawAtmosphere = function () { forgeDrawAtmosphere(); if (storm) drawStormAtmosphere(); };
const forgeDrawUI = drawUI;
drawUI = function () { forgeDrawUI(); if (storm) drawStormUI(); };

stormReset();
lastEnemyCount = enemies.filter(e => e[4]).length;
