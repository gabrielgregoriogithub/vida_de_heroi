// Ruinas Submersas: oitava regiao, liberada apos derrotar o Dragao da Tempestade.
// Natacao, medidor de ar, correnteza, o Tridente e o Leviata no santuario afundado.
const ABYSS_START = STORM_END, WATER_START = 20250, WATER_TOP = 150, LEVI_ARENA = 23300, LEVI_HOME = 23900, LEVI_HP = 90;
const ABYSS_TYPES = { piranha: 25, jelly: 26, crab: 27, leviathan: 28 };
const AIR_MAX = 12, SWIM_STROKE = -330, SINK_SPEED = 170, WATER_DRAG = .3;
const CLAM_X = 21560, TENTACLE_HP = 3, LEVI_STUN = 3.5;

let abyss = null;

function abyssFoe(kind, x, y, hp, extra = {}) {
  const e = [x, y, -1, 0, 1, hp, ABYSS_TYPES[kind]];
  return Object.assign(e, { frost: kind, abyss: true, maxHp: hp, homeX: x, homeY: y, t: Math.random() * 3, cd: 1.5 + Math.random(), hitFx: 0, lastHp: hp }, extra);
}

function abyssReset() {
  abyss = {
    entered: false, trident: false, pearl: false, gateMsg: 0, msgCd: 0, arenaLocked: false, bossDefeated: false, phase: 1,
    air: AIR_MAX, drown: 1.5, ink: 0, swimFx: 0,
    vents: [{ x: 20900, lit: false }, { x: 21900, lit: false }, { x: 22750, lit: false }, { x: 23650, lit: false }],
    currents: [{ x1: 22050, x2: 22450, flow: -110 }],
    clam: { x: CLAM_X, open: false, taken: false },
    tentacles: [], levi: null
  };
  platforms.push(
    [ABYSS_START, FLOOR, WORLD_W - ABYSS_START, 108, 'seabed'],
    [20520, 430, 130, 22, 'ruin'], [21200, 360, 150, 22, 'coral'], [21700, 420, 120, 22, 'ruin'],
    [22300, 330, 140, 22, 'coral'], [22900, 410, 150, 22, 'ruin'], [23500, 380, 120, 22, 'coral'], [24000, 380, 120, 22, 'coral']
  );
  weapons.push([20585, 425, 8, 1]);
  const levi = abyssFoe('leviathan', LEVI_HOME, 320, LEVI_HP, { mode: 'swim', windup: 0, stun: 0, vortex: 0, cd: 2.5, step: 0, trail: [] });
  abyss.levi = levi;
  enemies.push(
    ...[20800, 20850, 20900].map((x, i) => abyssFoe('piranha', x, 300 + i * 30, 2)),
    abyssFoe('crab', 21050, FLOOR - 16, 6, { minX: 20950, maxX: 21350 }),
    abyssFoe('jelly', 21150, 300, 3),
    abyssFoe('jelly', 21420, 420, 3),
    ...[21620, 21680].map((x, i) => abyssFoe('piranha', x, 250 + i * 50, 2)),
    abyssFoe('crab', 22150, FLOOR - 16, 6, { minX: 22000, maxX: 22500 }),
    abyssFoe('jelly', 22250, 250, 3),
    abyssFoe('jelly', 22560, 390, 3),
    ...[22850, 22900, 22950].map((x, i) => abyssFoe('piranha', x, 280 + i * 40, 2)),
    abyssFoe('crab', 23050, FLOOR - 16, 6, { minX: 22950, maxX: 23250 }),
    levi
  );
}

function abyssSfx(kind) {
  if (kind === 'swim') tone(320, 520, .1, 'sine', .015);
  else if (kind === 'bubble') { tone(700, 1400, .08, 'sine', .02); tone(900, 1800, .06, 'sine', .015); }
  else if (kind === 'pulse') tone(1200, 300, .3, 'square', .02);
  else if (kind === 'roar') { tone(70, 40, 1.1, 'sawtooth', .07); tone(110, 55, .9, 'square', .03); }
  else if (kind === 'clam') { tone(180, 90, .3, 'triangle', .05); tone(600, 1500, .5, 'sine', .03); }
  else if (kind === 'gulp') tone(200, 60, .5, 'sawtooth', .04);
}

function abyssMsg(text, duration = 1.6) { msg = text; msgTime = duration; }
function abyssHint(text, duration = 2) { if (abyss.msgCd > 0) return; abyssMsg(text, duration); abyss.msgCd = 3; }

function inWater(x = hero.x, y = hero.y) { return x > WATER_START && y - 10 > WATER_TOP; }
function leviExposed(e) { return e.stun > 0 || e.vortex > 0; }

// Carapaca do caranguejo e escamas do Leviata; a regiao premia o Tridente.
const stormHitPower = hitPower;
hitPower = function (a, e) {
  const power = stormHitPower(a, e);
  if (!e.abyss || power <= 0) return power;
  if (e.frost === 'crab' && a.vx * e[2] < 0 && a.kind !== 8 && a.kind !== 6) {
    burst(a.x, a.y, '#ffb38a', 8, 90); abyssHint('Carapaca! Ataque por tras ou use o TRIDENTE / MARTELO.', 1.6); return 0;
  }
  if (e.frost !== 'leviathan') return power;
  if (!abyss.arenaLocked) { burst(a.x, a.y, '#7fffd4', 8, 80); return 0; }
  if (leviExposed(e)) return power * 2;
  if (abyss.phase === 2 && a.kind !== 8) { burst(a.x, a.y, '#5fd6c4', 8, 90); abyssHint('Escamas abissais! Use o TRIDENTE ou corte os tentaculos.', 1.8); return Math.min(1, power); }
  return power;
};

// Antes do loop base: tinta acerta o heroi junto com o dano normal do projetil.
function abyssPreUpdate() {
  if (!abyss || !started || paused || victory || hero.inv > 0) return;
  if (enemyShots.some(s => s.kind === 'ink' && Math.hypot(s.x - hero.x, s.y - (hero.y - 18)) < 30)) abyss.ink = 2.5;
}

function updateSwimming(dt) {
  const blocking = down('KeyL') && shieldLevel > 0;
  if (!inWater()) return;
  // Contra a gravidade base (1450): o heroi afunda devagar e nada a cada pulo.
  if (!blocking) hero.vy -= 950 * dt;
  if (hit('Space', 'ArrowUp', 'KeyW')) {
    hero.vy = SWIM_STROKE; abyss.swimFx = .3; abyssSfx('swim');
    for (let i = 0; i < 4; i++) particles.push({ x: hero.x + (Math.random() - .5) * 20, y: hero.y + 30, vx: (Math.random() - .5) * 40, vy: -40, life: .6, max: .6, size: 2 + Math.random() * 2, color: '#bff8ff' });
  }
  if (!floor()) hero.jumps = 3;
  hero.vy = Math.max(-400, Math.min(SINK_SPEED, hero.vy));
  if (hero.dashFx <= 0) hero.x -= hero.vx * dt * WATER_DRAG;
  abyss.currents.forEach(c => { if (hero.x > c.x1 && hero.x < c.x2) hero.x += (blocking ? c.flow * .3 : c.flow) * dt; });
  // A tocha se apaga debaixo d'agua.
  arrows.forEach(a => { if (a.kind === 4 && a.life > 0 && inWater(a.x, a.y)) { a.life = 0; burst(a.x, a.y, '#e8f6ff', 8, 60); abyssHint('A TOCHA se apaga debaixo d\'agua!', 1.4); } });
}

function updateAir(dt) {
  const vent = abyss.vents.find(v => Math.abs(hero.x - v.x) < 40);
  const breathing = !inWater() || hero.y - 20 < WATER_TOP + 10 || !!vent;
  if (breathing) { abyss.air = Math.min(AIR_MAX, abyss.air + (vent ? 8 : 5) * dt); abyss.drown = 1.5; }
  else if (!abyss.pearl) abyss.air = Math.max(0, abyss.air - dt);
  if (vent && !vent.lit) {
    vent.lit = true; checkpoint = true; checkpointX = vent.x; checkpointY = FLOOR - 35; score += 150;
    abyssSfx('bubble'); burst(vent.x, FLOOR - 40, '#bff8ff', 26, 150); abyssMsg('Fonte de ar: checkpoint e folego renovado!', 2);
  }
  if (abyss.air <= 3 && abyss.air > 0 && !breathing) abyssHint('O AR ESTA ACABANDO! Procure uma fonte de bolhas ou suba.', 1.8);
  if (abyss.air > 0 || breathing) return;
  abyss.drown -= dt;
  if (abyss.drown <= 0) { abyss.drown = 1.5; damage(); abyssMsg('Sem ar!', 1); }
}

function updateClam() {
  const clam = abyss.clam;
  if (!clam.open) {
    arrows.forEach(a => {
      if (a.life <= 0 || Math.abs(a.x - clam.x) > 50 || a.y < FLOOR - 110) return;
      a.life = 0;
      if (a.kind !== 6) { burst(a.x, a.y, '#ffe1f0', 8, 70); abyssHint('A concha gigante e dura demais... so um golpe PESADO a abriria.', 2); return; }
      clam.open = true; abyssSfx('clam'); shake = .25; burst(clam.x, FLOOR - 30, '#ffe1f0', 30, 160);
      abyssMsg('A concha gigante se abriu!', 2);
    });
    return;
  }
  if (clam.taken || Math.hypot(hero.x - clam.x, hero.y + 35 - (FLOOR - 10)) > 50) return;
  clam.taken = true; abyss.pearl = true; abyss.air = AIR_MAX; hero.maxHp = Math.min(6, hero.maxHp + 1); hero.hp = hero.maxHp; score += 800;
  haptic([25, 25, 90]); playSfx('collect'); flash = .2; burst(clam.x, FLOOR - 40, '#fff0fa', 50, 220);
  abyssMsg('PEROLA DO ABISMO: voce respira debaixo d\'agua e ganha +1 vida maxima!', 4);
}

function updatePiranha(e, dt) {
  const dx = hero.x - e[0], dy = hero.y - 18 - e[1], dist = Math.hypot(dx, dy);
  if (e.dart > 0) {
    e.dart -= dt; e[0] += e.vx * dt; e[1] += e.vy * dt;
    e[1] = Math.max(WATER_TOP + 30, Math.min(FLOOR - 20, e[1]));
    if (e.dart <= 0) { e.homeX = e[0]; e.homeY = e[1]; }
    return;
  }
  e[0] += (e.homeX + Math.sin(e.t * 2) * 40 - e[0]) * Math.min(1, 3 * dt);
  e[1] += (e.homeY + Math.sin(e.t * 3) * 14 - e[1]) * Math.min(1, 3 * dt);
  e[2] = dx < 0 ? -1 : 1; e.cd -= dt;
  if (e.cd > 0 || dist > 320 || !inWater()) return;
  e.dart = .55; e.vx = dx / dist * 330; e.vy = dy / dist * 330; e.cd = 1.6 + Math.random() * .8; tone(500, 900, .08, 'square', .015);
}

function updateJelly(e, dt) {
  e[1] = e.homeY + Math.sin(e.t * 1.2) * 50; e[0] = e.homeX + Math.sin(e.t * .5) * 30;
  if (e.pulse > 0) { e.pulse -= dt; if (Math.hypot(hero.x - e[0], hero.y - 18 - e[1]) < 95) damage(); return; }
  if (e.charge > 0) { e.charge -= dt; if (e.charge <= 0) { e.pulse = .3; abyssSfx('pulse'); } return; }
  e.cd -= dt;
  if (e.cd <= 0 && Math.abs(hero.x - e[0]) < 400) { e.charge = .8; e.cd = 3.2; }
}

function updateCrab(e, dt) {
  const dx = hero.x - e[0];
  if (Math.abs(dx) < 380) { const want = Math.sign(dx) || e[2]; e.turn = want !== e[2] ? (e.turn || 0) + dt : 0; if (e.turn > .8) { e[2] = want; e.turn = 0; } }
  e[0] += e[2] * 55 * dt;
  if (e[0] < e.minX || e[0] > e.maxX) { e[0] = Math.max(e.minX, Math.min(e.maxX, e[0])); e[2] *= -1; }
  e.cd -= dt;
  if (e.cd <= 0 && Math.abs(dx) < 70) { e.snap = .25; e.cd = 1.4; tone(900, 400, .1, 'square', .025); }
  if (e.snap > 0) { e.snap -= dt; if (Math.abs(dx) < 62 && dx * e[2] > 0 && hero.y + 35 > FLOOR - 50) damage(); }
}

function spawnTentacles() {
  const n = abyss.phase === 2 ? 4 : 3, gap = abyss.phase === 2 ? 150 : 190;
  abyss.tentacles = Array.from({ length: n }, (_, i) => ({
    x: Math.max(LEVI_ARENA + 60, Math.min(WORLD_W - 60, hero.x + (i - (n - 1) / 2) * gap)), warn: 1, t: 3.2, hp: TENTACLE_HP, rise: 0
  }));
  abyssMsg('TENTACULOS! Corte todos para atordoar o Leviata.', 1.6);
}

function updateTentacles(dt) {
  const levi = abyss.levi, list = abyss.tentacles;
  if (!list.length) return;
  list.forEach(tn => {
    if (tn.hp <= 0) return;
    if (tn.warn > 0) { tn.warn -= dt; return; }
    tn.t -= dt; tn.rise = Math.min(1, tn.rise + 4 * dt);
    if (tn.t > 0 && Math.abs(hero.x - tn.x) < 24 && hero.y + 35 > FLOOR - 190 * tn.rise) damage();
    arrows.forEach(a => {
      if (a.life <= 0 || a.hitIds.includes(tn) || Math.abs(a.x - tn.x) > 22 || a.y < FLOOR - 190 * tn.rise || a.y > FLOOR) return;
      a.hitIds.push(tn); tn.hp -= Math.max(1, Math.min(2, a.power || 1)); burst(a.x, a.y, '#5fd6c4', 8, 90); playSfx('hit');
      if (tn.hp <= 0) { score += 60; burst(tn.x, FLOOR - 90, '#5fd6c4', 22, 150); }
      if (!a.pierce) a.life = 0;
    });
  });
  const active = list.filter(tn => tn.hp > 0 && (tn.warn > 0 || tn.t > 0));
  if (!active.length && list.every(tn => tn.hp <= 0) && levi[4]) {
    levi.stun = LEVI_STUN; levi.vortex = 0; levi.windup = 0; abyssSfx('roar'); shake = .4;
    abyssMsg('O LEVIATA ESTA ATORDOADO! Ataque (dano dobrado)!', 2.5);
  }
  if (!active.length) abyss.tentacles = [];
}

function leviAttack(e) {
  const rage = abyss.phase === 2;
  const pick = ['tentacles', 'ink', 'vortex'][e.step++ % 3];
  if (pick === 'tentacles') { spawnTentacles(); e.cd = rage ? 4.6 : 5.4; return; }
  if (pick === 'ink') { e.windup = .7; e.next = 'ink'; e.cd = rage ? 2.4 : 3; return; }
  e.vortex = 2.6; e.cd = rage ? 2.6 : 3.2; abyssSfx('gulp');
  abyssMsg('O Leviata suga a agua... a boca aberta e o ponto fraco!', 1.8);
}

function updateLeviathan(e, dt) {
  e.trail.unshift([e[0], e[1]]); if (e.trail.length > 60) e.trail.pop();
  if (!abyss.arenaLocked) { e[0] += (e.homeX - e[0]) * Math.min(1, dt); e[1] = e.homeY + Math.sin(e.t) * 40; return; }
  if (e.stun > 0) {
    e.stun -= dt; e[1] += (FLOOR - 80 - e[1]) * Math.min(1, 4 * dt);
    if (Math.random() < .3) particles.push({ x: e[0] + (Math.random() - .5) * 60, y: e[1] - 30, vx: 0, vy: -50, life: .6, max: .6, size: 3, color: '#bff8ff' });
    return;
  }
  e[2] = hero.x < e[0] ? -1 : 1;
  if (e.vortex > 0) {
    e.vortex -= dt;
    e[1] += (330 - e[1]) * Math.min(1, 3 * dt);
    const blocking = down('KeyL') && shieldLevel > 0, dx = e[0] - hero.x, dy = e[1] - hero.y, dist = Math.hypot(dx, dy) || 1, pull = blocking ? 50 : 150;
    hero.x += dx / dist * pull * dt; hero.y += dy / dist * pull * .5 * dt;
    if (Math.random() < .5) { const a = Math.random() * 7, r = 160; particles.push({ x: e[0] + Math.cos(a) * r, y: e[1] + Math.sin(a) * r, vx: -Math.cos(a) * 200, vy: -Math.sin(a) * 200, life: .7, max: .7, size: 2.5, color: '#bff8ff' }); }
    return;
  }
  const tx = Math.max(LEVI_ARENA + 140, Math.min(WORLD_W - 160, hero.x + Math.sin(e.t * .6) * 300)), ty = 300 + Math.sin(e.t * 1.3) * 110;
  e[0] += (tx - e[0]) * Math.min(1, 1.2 * dt); e[1] += (ty - e[1]) * Math.min(1, 1.8 * dt);
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup > 0) return;
    const n = abyss.phase === 2 ? 6 : 4, base = Math.atan2(hero.y - 18 - e[1], hero.x - e[0]);
    for (let i = 0; i < n; i++) { const ang = base + (i - (n - 1) / 2) * .22; enemyShots.push({ x: e[0] + e[2] * 50, y: e[1], vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, life: 3.5, kind: 'ink', frost: 1, abyss: 1 }); }
    tone(160, 90, .3, 'sawtooth', .03);
    return;
  }
  e.cd -= dt;
  if (e.cd <= 0) leviAttack(e);
}

function updateAbyssFoes(dt) {
  enemies.forEach(e => {
    if (!e.abyss || !e[4] || e.frozen > 0) return;
    if (e.frost === 'piranha') updatePiranha(e, dt);
    else if (e.frost === 'jelly') updateJelly(e, dt);
    else if (e.frost === 'crab') updateCrab(e, dt);
    else if (e.frost === 'leviathan') updateLeviathan(e, dt);
  });
  const l = abyss.levi;
  if (l && l[4] && abyss.arenaLocked && l.stun <= 0 && Math.hypot(hero.x - l[0], hero.y - l[1]) < 62) damage();
}

// O Leviata e enorme: caixa de acerto propria na cabeca.
function updateLeviHits() {
  const l = abyss.levi;
  if (!l || !l[4]) return;
  arrows.forEach(a => {
    if (a.life <= 0 || a.hitIds.includes(l) || Math.abs(a.x - l[0]) > 80 || Math.abs(a.y - l[1]) > 55) return;
    a.hitIds.push(l); l[5] -= hitPower(a, l); score += 15; playSfx('bossHit');
    burst(a.x, a.y, leviExposed(l) ? '#ff9ad5' : '#5fd6c4', 10, 100);
    if (l[5] <= 0) l[4] = 0;
    if (!a.pierce) a.life = 0;
  });
}

function updateAbyssWorld(dt) {
  abyss.msgCd = Math.max(0, abyss.msgCd - dt);
  abyss.ink = Math.max(0, abyss.ink - dt);
  abyss.swimFx = Math.max(0, abyss.swimFx - dt);
  abyss.trident = abyss.trident || maxWeapon >= 8;
  const dragon = storm.dragon;
  if (dragon && dragon[4] && hero.x > ABYSS_START - 40) {
    hero.x = ABYSS_START - 40; hero.vx = Math.min(0, hero.vx);
    if (abyss.gateMsg <= 0) { abyssMsg('O mar so se revela apos a queda do Dragao.', 2); abyss.gateMsg = 3; }
  }
  abyss.gateMsg = Math.max(0, abyss.gateMsg - dt);
  if (!abyss.entered && hero.x > 20000) {
    abyss.entered = true; checkpoint = true; checkpointX = 20000; checkpointY = FLOOR - 35;
    abyssMsg('PRAIA DOS NAUFRAGOS - checkpoint. Debaixo d\'agua, cuide do seu AR!', 3); burst(hero.x, hero.y - 20, '#7fffd4', 30, 160);
  }
  if (abyss.arenaLocked && hero.x < LEVI_ARENA + 20) { hero.x = LEVI_ARENA + 20; hero.vx = Math.max(0, hero.vx); }
  const l = abyss.levi;
  if (l && l[4] && !abyss.arenaLocked && hero.x > LEVI_ARENA + 40) {
    abyss.arenaLocked = true; bossWarning = 1.5; shake = .35; abyssSfx('roar');
    abyssMsg('O LEVIATA EMERGE DAS RUINAS! Corte os tentaculos e mire na boca aberta.', 3.5);
  }
  if (l && l[4] && l[5] <= LEVI_HP / 2 && abyss.phase === 1) {
    abyss.phase = 2; flash = .25; shake = .4; abyssSfx('roar');
    enemies.push(...[-120, 0, 120].map(o => abyssFoe('piranha', Math.max(LEVI_ARENA + 80, Math.min(WORLD_W - 80, hero.x + o)), 220, 2, { cd: 2 })));
    abyssMsg('FASE 2: ESCAMAS ABISSAIS e um cardume furioso!', 3);
  }
  if (l && !l[4] && !abyss.bossDefeated) {
    abyss.bossDefeated = true; abyss.arenaLocked = false; abyss.tentacles = [];
    enemyShots = enemyShots.filter(s => !s.abyss);
    heartDrops.push([l[0], FLOOR - 40, 1]); hero.maxHp = Math.min(6, hero.maxHp + 1); hero.hp = hero.maxHp;
    score += 3000; flash = .45; shake = .6;
    burst(l[0], l[1], '#7fffd4', 90, 320); burst(l[0], l[1], '#ff9ad5', 60, 240);
    abyssMsg('O LEVIATA CAIU! O portal final brilha no fundo do santuario.', 4);
  }
}

function abyssUpdate(dt) {
  if (!abyss || !started || paused || victory) return;
  updateSwimming(dt);
  updateAir(dt);
  updateClam();
  updateAbyssFoes(dt);
  updateLeviHits();
  updateTentacles(dt);
  updateAbyssWorld(dt);
}

// ---------- Desenho ----------

function drawAbyssBackdrop() {
  if (cameraX + W < ABYSS_START) return;
  const left = ABYSS_START, right = WORLD_W, view = cameraX;
  ctx.save(); ctx.beginPath(); ctx.rect(left, 0, right - left, H); ctx.clip();
  const sky = ctx.createLinearGradient(0, 0, 0, WATER_TOP);
  sky.addColorStop(0, '#3a2f5a'); sky.addColorStop(1, '#e89a7a');
  ctx.fillStyle = sky; ctx.fillRect(left, 0, right - left, WATER_TOP);
  ctx.fillStyle = 'rgba(255,214,150,.8)'; ctx.beginPath(); ctx.arc(left + 260, WATER_TOP - 10, 46, Math.PI, 0); ctx.fill();
  const sea = ctx.createLinearGradient(0, WATER_TOP, 0, H);
  sea.addColorStop(0, '#1c6f8a'); sea.addColorStop(.5, '#0f3f63'); sea.addColorStop(1, '#071a33');
  ctx.fillStyle = sea; ctx.fillRect(left, WATER_TOP, right - left, H - WATER_TOP);
  // Ruinas do templo afundado (parallax).
  const farShift = view * .4, farOff = farShift % 340, farIdx = Math.floor(farShift / 340);
  for (let i = -1; i < 6; i++) {
    const x = view + i * 340 - farOff, h = 160 + ((farIdx + i + 60) % 3) * 60;
    ctx.fillStyle = 'rgba(20,60,90,.75)'; ctx.fillRect(x, FLOOR - h, 34, h); ctx.fillRect(x + 110, FLOOR - h + 40, 34, h - 40);
    ctx.fillRect(x - 10, FLOOR - h - 14, 170, 16);
    ctx.fillStyle = 'rgba(30,85,115,.6)'; ctx.beginPath(); ctx.moveTo(x - 10, FLOOR - h - 14); ctx.lineTo(x + 75, FLOOR - h - 60); ctx.lineTo(x + 160, FLOOR - h - 14); ctx.fill();
  }
  // Algas ao fundo.
  const midShift = view * .7, midOff = midShift % 90;
  for (let i = -1; i < 15; i++) {
    const x = view + i * 90 - midOff, hgt = 70 + ((Math.floor(midShift / 90) + i + 100) % 4) * 30;
    ctx.strokeStyle = 'rgba(40,120,90,.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, FLOOR);
    for (let k = 1; k <= 5; k++) ctx.lineTo(x + Math.sin(time * 1.5 + i + k) * 10, FLOOR - hgt * k / 5);
    ctx.stroke();
  }
  // Raios de luz da superficie.
  for (let i = 0; i < 6; i++) {
    const x = view + ((i * 230 + time * 15) % (W + 200)) - 100;
    ctx.fillStyle = `rgba(190,245,255,${.05 + .03 * Math.sin(time + i)})`;
    ctx.beginPath(); ctx.moveTo(x, WATER_TOP); ctx.lineTo(x + 60, WATER_TOP); ctx.lineTo(x + 160, FLOOR); ctx.lineTo(x + 40, FLOOR); ctx.fill();
  }
  // A praia fica acima da agua; a agua comeca no WATER_START.
  ctx.fillStyle = '#e89a7a'; ctx.fillRect(left, WATER_TOP, WATER_START - left, FLOOR - WATER_TOP);
  const shore = ctx.createLinearGradient(0, WATER_TOP, 0, FLOOR);
  shore.addColorStop(0, '#d98a72'); shore.addColorStop(1, '#6a4a6a');
  ctx.fillStyle = shore; ctx.fillRect(left, WATER_TOP, WATER_START - left, FLOOR - WATER_TOP);
  ctx.fillStyle = '#4a3550'; for (let i = 0; i < 3; i++) { const x = left + 60 + i * 100; ctx.fillRect(x, FLOOR - 70 - i * 20, 10, 70 + i * 20); ctx.fillRect(x - 25, FLOOR - 70 - i * 20, 60, 6); }
  const fade = ctx.createLinearGradient(left, 0, left + 200, 0);
  fade.addColorStop(0, 'rgba(38,48,79,.95)'); fade.addColorStop(1, 'rgba(38,48,79,0)');
  ctx.fillStyle = fade; ctx.fillRect(left, 0, 200, H);
  if (abyss.arenaLocked || hero.x > LEVI_ARENA - 400) { ctx.fillStyle = `rgba(255,120,200,${.03 + .02 * Math.sin(time * 2)})`; ctx.fillRect(LEVI_ARENA, WATER_TOP, right - LEVI_ARENA, H); }
  ctx.restore();
}

function drawAbyssTerrain() {
  if (cameraX + W < ABYSS_START) return;
  platforms.forEach(p => {
    if (p[4] === 'seabed') {
      const g = ctx.createLinearGradient(0, FLOOR, 0, H);
      g.addColorStop(0, '#c9b07a'); g.addColorStop(1, '#5a4a3a');
      ctx.fillStyle = g; ctx.fillRect(p[0], FLOOR, p[2], H - FLOOR);
      ctx.fillStyle = '#e0c890'; ctx.fillRect(p[0], FLOOR - 3, p[2], 6);
      ctx.fillStyle = 'rgba(90,70,50,.5)';
      for (let x = Math.max(p[0], cameraX - 40); x < Math.min(p[0] + p[2], cameraX + W + 40); x += 46) { const sx = x - (x % 46); ctx.beginPath(); ctx.ellipse(sx, FLOOR + 14 + (sx % 3) * 8, 9, 3, 0, 0, 7); ctx.fill(); }
    } else if (p[4] === 'coral') {
      ctx.fillStyle = '#d86a8a'; ctx.fillRect(p[0], p[1], p[2], p[3]); ctx.fillStyle = '#ff9ab0'; ctx.fillRect(p[0], p[1], p[2], 5);
      for (let x = p[0] + 10; x < p[0] + p[2]; x += 24) { ctx.fillStyle = x % 48 ? '#ff7f9f' : '#ffb35a'; ctx.beginPath(); ctx.arc(x, p[1] - 4, 6, Math.PI, 0); ctx.fill(); }
    } else if (p[4] === 'ruin') {
      ctx.fillStyle = '#5f7f8a'; ctx.fillRect(p[0], p[1], p[2], p[3]); ctx.fillStyle = '#8fb0b8'; ctx.fillRect(p[0], p[1], p[2], 5);
      ctx.fillStyle = '#3f5a66'; for (let x = p[0] + 16; x < p[0] + p[2]; x += 32) ctx.fillRect(x, p[1] + 7, 2, p[3] - 9);
      ctx.fillStyle = 'rgba(60,140,100,.7)'; ctx.fillRect(p[0] + 8, p[1] + p[3], 6, 18); ctx.fillRect(p[0] + p[2] - 20, p[1] + p[3], 6, 26);
    }
  });
  abyss.currents.forEach(c => {
    ctx.strokeStyle = 'rgba(190,245,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const span = c.x2 - c.x1, x = c.x2 - ((time * 140 + i * 97) % span), y = WATER_TOP + 60 + (i * 53) % (FLOOR - WATER_TOP - 80);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y - 4); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 6); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 6); ctx.stroke();
    }
    if (Math.abs(hero.x - (c.x1 + c.x2) / 2) < 500) text('CORRENTEZA ←', (c.x1 + c.x2) / 2, WATER_TOP + 40, 12, '#bff8ff', 'center');
  });
  abyss.vents.forEach(v => {
    ctx.fillStyle = '#4a5a66'; ctx.beginPath(); ctx.moveTo(v.x - 26, FLOOR); ctx.lineTo(v.x - 12, FLOOR - 22); ctx.lineTo(v.x + 12, FLOOR - 22); ctx.lineTo(v.x + 26, FLOOR); ctx.fill();
    ctx.fillStyle = v.lit ? '#7fffd4' : '#2f3f4a'; ctx.fillRect(v.x - 8, FLOOR - 26, 16, 6);
    for (let i = 0; i < 8; i++) {
      const y = FLOOR - 30 - ((time * 120 + i * 47) % (FLOOR - WATER_TOP - 30)), x = v.x + Math.sin(time * 3 + i * 1.7) * 14;
      ctx.strokeStyle = 'rgba(220,250,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3) * 2, 0, 7); ctx.stroke();
    }
  });
  const clam = abyss.clam;
  if (!clam.taken) {
    const open = clam.open ? 1 : 0, x = clam.x, y = FLOOR - 4;
    ctx.fillStyle = '#b07a9a'; ctx.beginPath(); ctx.ellipse(x, y, 42, 14, 0, 0, Math.PI); ctx.fill();
    ctx.save(); ctx.translate(x - 40, y); ctx.rotate(-open * .9);
    ctx.fillStyle = '#d6a0bf'; ctx.beginPath(); ctx.ellipse(40, 0, 42, 26, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#8a5a7a'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40 + k * 16, -22 + Math.abs(k) * 4); ctx.stroke(); }
    ctx.restore();
    if (open) {
      ctx.fillStyle = `rgba(255,240,250,${.3 + .15 * Math.sin(time * 5)})`; ctx.beginPath(); ctx.arc(x, y - 12, 22, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff6fb'; ctx.beginPath(); ctx.arc(x, y - 12, 9, 0, 7); ctx.fill();
      text('PEROLA', x, y - 40, 10, '#ffe1f0', 'center');
    }
  }
  abyss.tentacles.forEach(tn => {
    if (tn.hp <= 0) return;
    if (tn.warn > 0) {
      for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(220,250,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tn.x + Math.sin(time * 9 + i) * 12, FLOOR - 10 - ((time * 90 + i * 20) % 60), 4, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = `rgba(255,113,142,${.5 + .5 * Math.sin(time * 25)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(tn.x, FLOOR - 2, 26, 6, 0, 0, 7); ctx.stroke();
      return;
    }
    const h = 190 * tn.rise * Math.min(1, tn.t * 2);
    for (let k = 0; k < 10; k++) {
      const y = FLOOR - h * k / 10, r = 18 - k * 1.2, x = tn.x + Math.sin(time * 4 + k * .6 + tn.x) * k * 2;
      ctx.fillStyle = k % 2 ? '#3d8a7a' : '#2f6f63'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (k % 2) { ctx.fillStyle = '#ff9ad5'; ctx.beginPath(); ctx.arc(x - r * .4, y, 3, 0, 7); ctx.fill(); }
    }
  });
}

function drawPiranha(e, hit) {
  const x = e[0], y = e[1], d = e[2], wag = Math.sin(time * 18 + e.homeX) * 6;
  ctx.fillStyle = hit ? '#ffffff' : '#7a8a9a';
  ctx.beginPath(); ctx.moveTo(x - d * 16, y); ctx.lineTo(x - d * 28, y - 10 + wag); ctx.lineTo(x - d * 28, y + 10 + wag); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, 17, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#d84a4a'; ctx.beginPath(); ctx.ellipse(x + d * 2, y + 5, 12, 5, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + d * (8 + i * 3), y + 2); ctx.lineTo(x + d * (9 + i * 3), y + 6); ctx.lineTo(x + d * (10 + i * 3), y + 2); ctx.fill(); }
  ctx.fillStyle = '#ffd65a'; ctx.beginPath(); ctx.arc(x + d * 9, y - 3, 3, 0, 7); ctx.fill();
}

function drawJelly(e, hit) {
  const x = e[0], y = e[1], glow = e.charge > 0 ? 1 - e.charge / .8 : 0;
  if (e.pulse > 0) { ctx.strokeStyle = `rgba(200,140,255,${e.pulse * 3})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 95 * (1 - e.pulse * 2), 0, 7); ctx.stroke(); }
  ctx.fillStyle = hit ? 'rgba(255,255,255,.95)' : `rgba(${190 + glow * 60},${140 + glow * 100},255,.75)`;
  ctx.beginPath(); ctx.arc(x, y, 22, Math.PI, 0); ctx.quadraticCurveTo(x + 22, y + 8, x, y + 6); ctx.quadraticCurveTo(x - 22, y + 8, x - 22, y); ctx.fill();
  ctx.strokeStyle = `rgba(220,190,255,.7)`; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8, y + 4); for (let k = 1; k <= 4; k++) ctx.lineTo(x + i * 8 + Math.sin(time * 4 + k + i) * 5, y + 4 + k * 10); ctx.stroke(); }
  if (glow > 0) { ctx.fillStyle = `rgba(255,255,255,${glow * .6})`; ctx.beginPath(); ctx.arc(x, y - 6, 10 + glow * 8, 0, 7); ctx.fill(); }
}

function drawCrab(e, hit) {
  const x = e[0], y = e[1], d = e[2], snap = e.snap > 0 ? 1 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, FLOOR, 34, 6, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = hit ? '#ffffff' : '#a8442e'; ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(x + s * 14, y + 2 + i * 4); ctx.lineTo(x + s * 30, y + 6 + i * 3 + Math.sin(time * 12 + i) * 2); ctx.lineTo(x + s * 34, FLOOR); ctx.stroke(); });
  ctx.fillStyle = hit ? '#ffffff' : '#d8603e'; ctx.beginPath(); ctx.ellipse(x, y, 30, 18, 0, Math.PI, 0); ctx.lineTo(x - 30, y + 6); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#f08a5a'; ctx.beginPath(); ctx.ellipse(x + d * 36, y - 6, 16 + snap * 4, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#7a2a1a'; ctx.beginPath(); ctx.moveTo(x + d * 36, y - 6); ctx.lineTo(x + d * 54, y - 12 - snap * 8); ctx.lineTo(x + d * 54, y + snap * 4); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(x - 8, y - 26, 3, 10); ctx.fillRect(x + 5, y - 26, 3, 10);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 6, y - 27, 3, 0, 7); ctx.arc(x + 7, y - 27, 3, 0, 7); ctx.fill();
}

function drawLeviathan(e, hit) {
  const d = e[2], x = e[0], y = e[1], open = e.vortex > 0 ? 1 : e.windup > 0 ? .4 : 0, armored = abyss.phase === 2 && !leviExposed(e);
  for (let i = e.trail.length - 1; i > 2; i -= 3) {
    const [tx, ty] = e.trail[i], r = Math.max(10, 34 - i * .4);
    ctx.fillStyle = hit ? '#ffffff' : i % 6 === 0 ? '#2f7a73' : '#245f5c'; ctx.beginPath(); ctx.arc(tx, ty, r, 0, 7); ctx.fill();
    if (i % 6 === 0) { ctx.fillStyle = armored ? '#9ff5e0' : '#3f9a8a'; ctx.beginPath(); ctx.moveTo(tx - 6, ty - r + 4); ctx.lineTo(tx, ty - r - 12); ctx.lineTo(tx + 6, ty - r + 4); ctx.fill(); }
  }
  ctx.fillStyle = hit ? '#ffffff' : '#2f7a73'; ctx.beginPath(); ctx.ellipse(x, y, 58, 38, 0, 0, 7); ctx.fill();
  // Mandibula: abre durante o redemoinho e mostra o nucleo rosado.
  ctx.fillStyle = hit ? '#ffffff' : '#245f5c'; ctx.beginPath(); ctx.moveTo(x + d * 20, y + 4); ctx.lineTo(x + d * 90, y + 10 + open * 34); ctx.lineTo(x + d * 10, y + 30); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#2f7a73'; ctx.beginPath(); ctx.moveTo(x + d * 20, y - 4); ctx.lineTo(x + d * 92, y - 4 - open * 20); ctx.lineTo(x + d * 10, y - 30); ctx.fill();
  if (open > 0) { ctx.fillStyle = `rgba(255,154,213,${.6 + .3 * Math.sin(time * 12)})`; ctx.beginPath(); ctx.arc(x + d * 46, y + 4, 12 + open * 8, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { const tx = x + d * (40 + k * 12); ctx.beginPath(); ctx.moveTo(tx, y - 2 - open * 6); ctx.lineTo(tx + d * 4, y + 6); ctx.lineTo(tx + d * 8, y - 2 - open * 6); ctx.fill(); }
  ctx.fillStyle = e.windup > 0 ? '#ff5b77' : '#fff27a'; ctx.beginPath(); ctx.arc(x + d * 24, y - 16, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#5fd6c4'; [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(x - d * 10, y + s * 30); ctx.lineTo(x - d * 50, y + s * (56 + Math.sin(time * 5) * 8)); ctx.lineTo(x - d * 36, y + s * 22); ctx.fill(); });
  if (armored) { ctx.strokeStyle = `rgba(159,245,224,${.4 + .3 * Math.sin(time * 6)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 70, 48, 0, 0, 7); ctx.stroke(); }
  if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = time * 4 + i * 2.1; ctx.fillStyle = '#bff8ff'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 40, y - 54 + Math.sin(a) * 8, 5, 0, 7); ctx.fill(); }
}

function drawAbyssFoes() {
  enemies.forEach(e => {
    if (!e[4] || !e.abyss) return;
    const hit = e.hitFx > 0;
    if (e.frost === 'piranha') drawPiranha(e, hit);
    else if (e.frost === 'jelly') drawJelly(e, hit);
    else if (e.frost === 'crab') drawCrab(e, hit);
    else if (e.frost === 'leviathan') drawLeviathan(e, hit);
  });
}

function drawAbyssShot(s) {
  if (s.kind !== 'ink') return;
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,40,.9)'; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(80,40,120,.6)'; ctx.beginPath(); ctx.arc(s.x - s.vx * .04, s.y - s.vy * .04, 7, 0, 7); ctx.fill();
  ctx.restore();
}

// Chamado de dentro do desenho de projeteis (ja transladado e rotacionado).
function drawTridentShot() {
  ctx.fillStyle = '#c9a85a'; ctx.fillRect(-34, -2, 40, 4);
  ctx.fillStyle = '#7fffd4'; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill();
  ctx.fillRect(4, -10, 4, 20);
  [-10, 10].forEach(o => { ctx.beginPath(); ctx.moveTo(16, o); ctx.lineTo(6, o - 3); ctx.lineTo(6, o + 3); ctx.fill(); });
}

function drawTridentPickup(item) {
  const y = item[1] - 22 + Math.sin(time * 3) * 4;
  ctx.fillStyle = 'rgba(127,255,212,.2)'; ctx.beginPath(); ctx.arc(item[0], y, 30 + Math.sin(time * 6) * 4, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(item[0], y); ctx.rotate(-Math.PI / 2 + .3); drawTridentShot(); ctx.restore();
  text('TRIDENTE', item[0], item[1] + 24, 12, '#7fffd4', 'center');
}

function drawAbyssAtmosphere() {
  if (cameraX + W < WATER_START) return;
  const startSx = Math.max(0, WATER_START - cameraX), top = WATER_TOP;
  ctx.fillStyle = 'rgba(20,110,150,.18)'; ctx.fillRect(startSx, top, W - startSx, H - top);
  // Linha da superficie e bolhas soltas.
  ctx.strokeStyle = 'rgba(220,250,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let sx = startSx; sx <= W; sx += 16) ctx.lineTo(sx, top + Math.sin((sx + cameraX) * .03 + time * 3) * 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,250,255,.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    const sx = (i * 137.7 + Math.sin(time + i) * 12) % W, sy = H - ((time * (30 + i % 5 * 12) + i * 71) % (H - top));
    if (sx < startSx) continue;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5 + i % 3, 0, 7); ctx.stroke();
  }
  if (abyss.phase === 2 && abyss.arenaLocked) { ctx.fillStyle = 'rgba(10,0,30,.22)'; ctx.fillRect(startSx, top, W - startSx, H - top); }
  if (abyss.ink > 0) {
    const sx = hero.x - cameraX, sy = hero.y - 20, k = Math.min(1, abyss.ink);
    const g = ctx.createRadialGradient(sx, sy, 60, sx, sy, 420);
    g.addColorStop(0, 'rgba(10,5,25,0)'); g.addColorStop(1, `rgba(10,5,25,${.92 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function drawAbyssUI() {
  if (!started || victory || hero.x <= ABYSS_START) return;
  const chips = [
    [abyss.trident ? 'TRIDENTE ✓' : 'TRIDENTE —', abyss.trident ? '#7fffd4' : '#5d6b80'],
    [abyss.pearl ? 'PEROLA DO ABISMO ✓' : 'PEROLA ?', abyss.pearl ? '#ffe1f0' : '#5d6b80']
  ];
  let x = 28;
  chips.forEach(([label, color]) => { ctx.font = '12px system-ui,sans-serif'; const w = ctx.measureText(label).width + 18; ctx.fillStyle = 'rgba(8,12,24,.82)'; ctx.fillRect(x, 128, w, 22); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + .5, 128.5, w - 1, 21); text(label, x + 9, 143, 12, color); x += w + 6; });
  if (abyss.pearl ? inWater() : abyss.air < AIR_MAX || inWater()) {
    const low = abyss.air <= 3 && !abyss.pearl;
    ctx.fillStyle = 'rgba(8,12,24,.82)'; ctx.fillRect(x, 128, 190, 22);
    text('AR', x + 9, 143, 12, low ? '#ff7b8e' : '#bff8ff');
    for (let i = 0; i < AIR_MAX; i++) {
      const filled = abyss.pearl || i < Math.ceil(abyss.air), blink = low && Math.sin(time * 14) > 0;
      ctx.strokeStyle = filled ? (blink ? '#ff7b8e' : '#bff8ff') : '#3a4a5a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x + 38 + i * 12.5, 139, 4.5, 0, 7); ctx.stroke();
      if (filled) { ctx.fillStyle = 'rgba(191,248,255,.35)'; ctx.fill(); }
    }
  }
  const l = abyss.levi;
  if (l && l[4] && abyss.arenaLocked) {
    const w = 460, bx = 576 - w / 2, y = 158, exposed = leviExposed(l), armored = abyss.phase === 2 && !exposed;
    ctx.fillStyle = 'rgba(7,10,20,.9)'; ctx.fillRect(bx - 4, y - 4, w + 8, 18);
    ctx.fillStyle = exposed ? '#ff9ad5' : armored ? '#9ff5e0' : '#3fbfa8'; ctx.fillRect(bx, y, w * Math.max(0, l[5] / LEVI_HP), 10);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx + w / 2 - 1, y - 3, 2, 16);
    const label = l.stun > 0 ? '  •  ATORDOADO!' : l.vortex > 0 ? '  •  BOCA ABERTA!' : armored ? '  •  ESCAMAS' : '';
    text(`LEVIATA DAS RUINAS  •  FASE ${abyss.phase}${label}`, 576, y - 10, 15, exposed ? '#ff9ad5' : '#7fffd4', 'center');
  }
}

// ---------- Integracao com o jogo existente ----------

const stormLoadLevel = loadLevel;
loadLevel = function () { stormLoadLevel(); abyssReset(); };
const stormUpdateLoop = update;
update = function (dt) { abyssPreUpdate(); stormUpdateLoop(dt); abyssUpdate(dt); };
const stormDrawBossArena = drawBossArena;
drawBossArena = function () { stormDrawBossArena(); if (abyss) drawAbyssBackdrop(); };
const stormDrawWorldExtras = drawWorldExtras;
drawWorldExtras = function () { stormDrawWorldExtras(); if (abyss) drawAbyssTerrain(); };
const stormDrawEnemyPremium = drawEnemyPremium;
drawEnemyPremium = function () { stormDrawEnemyPremium(); if (abyss) drawAbyssFoes(); };
const stormDrawShot = drawFrostShot;
drawFrostShot = function (s) { if (s.abyss) drawAbyssShot(s); else stormDrawShot(s); };
const stormDrawAtmosphere = drawAtmosphere;
drawAtmosphere = function () { stormDrawAtmosphere(); if (abyss) drawAbyssAtmosphere(); };
const stormDrawUI = drawUI;
drawUI = function () { stormDrawUI(); if (abyss) drawAbyssUI(); };

abyssReset();
lastEnemyCount = enemies.filter(e => e[4]).length;
