// Forja Vulcanica: sexta regiao, liberada apos derrotar a Rainha do Inverno.
// Mesmo padrao da Cidadela: envolve loadLevel/update/hitPower e as funcoes de desenho.
const FORGE_START = FROST_END, FORGE_ARENA = 14790, COLOSSUS_HOME = 15250, COLOSSUS_HP = 70;
const FORGE_TYPES = { salamander: 17, bomber: 18, ember: 19, colossus: 20 };
const MAGMA_GRAVITY = 700;

let forge = null;

function forgeFoe(kind, x, y, hp, extra = {}) {
  const e = [x, y, -1, 0, 1, hp, FORGE_TYPES[kind]];
  return Object.assign(e, { frost: kind, forge: true, maxHp: hp, homeX: x, homeY: y, t: Math.random() * 3, cd: 1.5 + Math.random(), hitFx: 0, lastHp: hp }, extra);
}

function forgeReset() {
  forge = {
    entered: false, hammer: false, helm: false, gateMsg: 0, msgCd: 0, arenaLocked: false, bossDefeated: false,
    phase: 1, tide: { cd: 8, warn: 0, t: 0 },
    pools: [[12560, 150], [13020, 200], [13880, 230], [14200, 170]],
    walls: [{ x: 13480, w: 48, top: 100, hp: 8, max: 8 }],
    anvils: [{ x: 13620, lit: false }, { x: 14720, lit: false }],
    helmSpot: { x: 14575, y: 290, taken: false },
    puddles: [], colossus: null
  };
  const basalt = (x, y, w) => Object.assign([x, y, w, 20, 'basalt'], { baseY: y, crumble: 0, down: 0 });
  platforms.push(
    basalt(12600, 440, 80), [12820, 360, 150, 24, 'obsidian'],
    basalt(13050, 430, 70), basalt(13145, 380, 70), [13300, 330, 120, 24, 'obsidian'],
    [13700, 420, 150, 24, 'obsidian'], basalt(13915, 440, 70), basalt(14015, 380, 70),
    basalt(14250, 430, 70), [14520, 290, 110, 20, 'obsidian'],
    [14900, 410, 130, 24, 'obsidian'], [15180, 330, 140, 24, 'obsidian'], [15470, 410, 130, 24, 'obsidian']
  );
  weapons.push([12895, 325, 6, 1]);
  const colossus = forgeFoe('colossus', COLOSSUS_HOME, FLOOR - 85, COLOSSUS_HP, { h: 175, mode: 'walk', exposed: 0, windup: 0, cd: 2.5 });
  forge.colossus = colossus;
  enemies.push(
    forgeFoe('salamander', 12380, FLOOR - 18, 5, { minX: 12250, maxX: 12540 }),
    forgeFoe('salamander', 12850, FLOOR - 18, 5, { minX: 12730, maxX: 13000 }),
    forgeFoe('ember', 12960, 230, 3),
    forgeFoe('bomber', 13360, 300, 6),
    forgeFoe('ember', 13560, 220, 3),
    forgeFoe('salamander', 13700, FLOOR - 18, 5, { minX: 13620, maxX: 13860 }),
    forgeFoe('bomber', 13775, 390, 6),
    forgeFoe('salamander', 14150, FLOOR - 18, 6, { minX: 14120, maxX: 14190 }),
    forgeFoe('ember', 14420, 240, 3),
    colossus
  );
}

function forgeSfx(kind) {
  if (kind === 'slam') { tone(70, 28, .45, 'sawtooth', .07); tone(180, 60, .3, 'square', .03); }
  else if (kind === 'lob') { tone(260, 90, .3, 'sawtooth', .03); }
  else if (kind === 'sizzle') { tone(1200, 300, .18, 'square', .018); }
  else if (kind === 'crumble') { tone(140, 50, .25, 'triangle', .035); }
  else if (kind === 'anvil') { tone(880, 1320, .3, 'triangle', .04); tone(440, 660, .4, 'sine', .03); }
}

function forgeMsg(text, duration = 1.6) { msg = text; msgTime = duration; }
function forgeHint(text, duration = 2) { if (forge.msgCd > 0) return; forgeMsg(text, duration); forge.msgCd = 3; }

// Fogo nao fere criaturas de magma; a Lamina Glacial e o Martelo sao as respostas da regiao.
const frostHitPower = hitPower;
hitPower = function (a, e) {
  const power = frostHitPower(a, e);
  if (!e.forge || power <= 0) return power;
  if (a.kind === 4) { burst(a.x, a.y, '#ffbd62', 8, 80); forgeHint('Criaturas de magma sao imunes ao FOGO. Use a LAMINA GLACIAL!', 1.6); return 0; }
  if (e.frost !== 'colossus') return a.kind === 5 ? power * 2 : power;
  if (e.exposed > 0) {
    if (a.kind === 5) { burst(e[0], e[1] - 30, '#bff4ff', 18, 140); forgeHint('RESFRIAMENTO! O nucleo racha com o gelo.', 1.2); return power * 3; }
    return power * 2;
  }
  if (a.kind === 6) return power;
  burst(a.x, a.y, '#ff9b3d', 8, 90);
  forgeHint('Armadura de magma! Use o MARTELO ou ataque o nucleo apos a martelada.', 1.8);
  return Math.min(1, power);
};

function lavaTouch() {
  const x = hero.x;
  if (!forge.helm) damage();
  else forgeHint('O Elmo de Obsidiana protege voce da lava!', 1.4);
  if (Math.abs(hero.x - x) < 1) { hero.vy = -640; hero.jumps = 1; }
  forgeSfx('sizzle'); burst(hero.x, FLOOR - 4, '#ff7b35', 18, 160);
}

function onFloor() { return hero.y + 35 >= FLOOR - 2; }
function inPool(x) { return forge.pools.some(([px, w]) => x > px + 8 && x < px + w - 8); }
function inArenaTide() { return forge.tide.t > 0 && hero.x > FORGE_ARENA; }

function updateForgeHero(dt) {
  if (!frost.queenDefeated && hero.x > FORGE_START - 40) {
    hero.x = FORGE_START - 40; hero.vx = Math.min(0, hero.vx);
    if (forge.gateMsg <= 0) { forgeMsg('O Portao da Forja so se abre apos a queda da Rainha do Inverno.', 2); forge.gateMsg = 3; }
  }
  forge.gateMsg = Math.max(0, forge.gateMsg - dt);
  forge.walls.forEach(w => {
    if (w.hp <= 0 || hero.x + 16 < w.x || hero.x - 16 > w.x + w.w || hero.y + 35 < w.top) return;
    hero.x = hero.x < w.x + w.w / 2 ? w.x - 16 : w.x + w.w + 16; hero.vx = 0;
    forgeHint('Muralha de basalto! So o MARTELO VULCANICO a quebra (Q troca arma).', 2.4);
  });
  if (forge.arenaLocked && hero.x < FORGE_ARENA + 20) { hero.x = FORGE_ARENA + 20; hero.vx = Math.max(0, hero.vx); }
  if (onFloor() && hero.x > FORGE_START && (inPool(hero.x) || inArenaTide())) lavaTouch();
}

function updateBasalt(dt) {
  platforms.forEach(p => {
    if (p[4] !== 'basalt') return;
    if (p.down > 0) { p.down -= dt; if (p.down <= 0) { p[1] = p.baseY; p.crumble = 0; } return; }
    const standing = hero.x > p[0] - 18 && hero.x < p[0] + p[2] + 18 && Math.abs(hero.y + 35 - p[1]) < 5;
    if (standing && !p.crumble) { p.crumble = .75; forgeSfx('crumble'); }
    if (p.crumble > 0) {
      p.crumble -= dt;
      if (p.crumble <= 0) { p.crumble = 0; p.down = 2.8; p[1] = FLOOR + 400; burst(p[0] + p[2] / 2, p.baseY, '#5a4a4a', 16, 120); }
    }
  });
}

function hammerImpact(a) {
  a.life = 0; shake = Math.max(shake, .14); forgeSfx('slam');
  burst(a.x, FLOOR - 6, '#ff9b3d', 20, 160);
  enemies.forEach(e => {
    if (!e[4] || a.hitIds.includes(e) || Math.abs(e[0] - a.x) > 80 || e[1] < FLOOR - 200) return;
    e[5] -= hitPower({ ...a, power: 1 }, e); if (e[5] <= 0) e[4] = 0;
  });
}

function updateForgeArrows() {
  const c = forge.colossus;
  arrows.forEach(a => {
    if (a.life <= 0) return;
    if (a.kind === 6 && a.y >= FLOOR - 6) { hammerImpact(a); return; }
    forge.walls.forEach(w => {
      if (w.hp <= 0 || a.life <= 0 || a.x < w.x - 6 || a.x > w.x + w.w + 6 || a.y < w.top) return;
      a.life = 0;
      if (a.kind !== 6) { burst(a.x, a.y, '#8a7a7a', 6, 60); forgeHint('O basalto e duro demais. Use o MARTELO VULCANICO!', 1.6); return; }
      w.hp -= 2; forgeSfx('crumble'); shake = .12; burst(a.x, a.y, '#ff9b3d', 14, 120);
      if (w.hp <= 0) { burst(w.x + w.w / 2, FLOOR - 200, '#ff7b35', 50, 230); score += 250; forgeMsg('A muralha de basalto desabou!', 2); }
    });
    // O corpo do Colosso e grande demais para o raio de acerto padrao.
    if (c && c[4] && a.life > 0 && !a.hitIds.includes(c) && Math.abs(a.x - c[0]) < 62 && a.y > FLOOR - c.h && a.y < FLOOR) {
      a.hitIds.push(c); c[5] -= hitPower(a, c); score += 15; playSfx('bossHit');
      burst(a.x, a.y, c.exposed > 0 ? '#ffe6a0' : '#ff9b3d', 10, 100);
      if (c[5] <= 0) c[4] = 0;
      if (!a.pierce) a.life = 0;
    }
  });
}

function lobMagma(x, y, tx, flight, extra = {}) {
  const ty = FLOOR - 8;
  enemyShots.push(Object.assign({ x, y, vx: (tx - x) / flight, vy: (ty - y - .5 * MAGMA_GRAVITY * flight * flight) / flight, life: flight + .6, kind: 'magma', frost: 1, forge: 1, g: MAGMA_GRAVITY }, extra));
}

function updateForgeShots(dt) {
  enemyShots.forEach(s => {
    if (!s.forge || s.life <= 0) return;
    if (s.kind === 'magma') {
      s.vy += s.g * dt;
      if (s.y >= FLOOR - 8 && s.vy > 0) { s.life = 0; forge.puddles.push({ x: s.x, t: 2.6 }); burst(s.x, FLOOR - 6, '#ff7b35', 12, 120); }
    } else if (s.kind === 'flamewave' && Math.abs(s.x - hero.x) < 26 && onFloor()) { s.life = 0; damage(); }
  });
  forge.puddles.forEach(p => { p.t -= dt; if (p.t > 0 && onFloor() && Math.abs(hero.x - p.x) < 30) lavaTouch(); });
  forge.puddles = forge.puddles.filter(p => p.t > 0);
}

function updateSalamander(e, dt) {
  const dx = hero.x - e[0];
  if (e.dash > 0) {
    e.dash -= dt; e[0] += e[2] * 340 * dt;
    if (Math.random() < .5) particles.push({ x: e[0] - e[2] * 20, y: FLOOR - 8, vx: 0, vy: -40, life: .4, max: .4, size: 4, color: '#ff7b35' });
  } else {
    e[0] += e[2] * 70 * dt; e.cd -= dt;
    if (Math.abs(dx) < 300 && hero.y + 35 > FLOOR - 90 && e.cd <= 0) { e[2] = Math.sign(dx) || 1; e.dash = .9; e.cd = 2.2; tone(300, 520, .15, 'sawtooth', .02); }
  }
  if (e[0] < e.minX) { e[0] = e.minX; e[2] = 1; e.dash = 0; }
  if (e[0] > e.maxX) { e[0] = e.maxX; e[2] = -1; e.dash = 0; }
}

function updateBomber(e, dt) {
  e[2] = hero.x < e[0] ? -1 : 1;
  if (e.cast > 0) { e.cast -= dt; if (e.cast <= 0) { lobMagma(e[0], e[1] - 30, hero.x + hero.vx * .4, 1.05); forgeSfx('lob'); } return; }
  e.cd -= dt;
  if (e.cd <= 0 && Math.abs(hero.x - e[0]) < 620) { e.cast = .55; e.cd = 2.6; }
}

function updateEmber(e, dt) {
  if (e.dive > 0) {
    e.dive -= dt;
    const ang = Math.atan2(e.ty - e[1], e.tx - e[0]);
    e[0] += Math.cos(ang) * 380 * dt; e[1] += Math.sin(ang) * 380 * dt;
    if (Math.hypot(e.tx - e[0], e.ty - e[1]) < 20) e.dive = 0;
    return;
  }
  const hx = e.homeX + Math.sin(e.t * 1.3) * 80, hy = e.homeY + Math.sin(e.t * 2.6) * 22;
  e[0] += (hx - e[0]) * Math.min(1, 2 * dt); e[1] += (hy - e[1]) * Math.min(1, 2 * dt);
  e[2] = hero.x < e[0] ? -1 : 1; e.cd -= dt;
  if (e.cd <= 0 && Math.abs(hero.x - e[0]) < 380) { e.dive = 1; e.tx = hero.x; e.ty = hero.y - 15; e.cd = 3; tone(700, 1100, .12, 'triangle', .02); }
}

function updateColossus(e, dt) {
  if (!forge.arenaLocked) { e[0] += (e.homeX - e[0]) * Math.min(1, dt); return; }
  const rage = forge.phase === 2, dx = hero.x - e[0];
  e.exposed = Math.max(0, e.exposed - dt);
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 0) {
      forgeSfx('slam'); shake = .4; flash = .1; e.exposed = rage ? 1.8 : 2.4;
      [-1, 1].forEach(dir => enemyShots.push({ x: e[0] + dir * 60, y: FLOOR - 20, vx: dir * (rage ? 400 : 340), vy: 0, life: 2.4, kind: 'flamewave', frost: 1, forge: 1 }));
      if (Math.abs(dx) < 120 && onFloor()) damage();
      forgeHint('O nucleo esta exposto: ATAQUE AGORA!', 1.4);
    }
    return;
  }
  if (e.exposed <= 0) { e[2] = Math.sign(dx) || e[2]; e[0] += e[2] * (rage ? 62 : 45) * dt; }
  e[0] = Math.max(FORGE_ARENA + 60, Math.min(WORLD_W - 80, e[0]));
  e.cd -= dt;
  if (e.cd > 0 || e.exposed > 0) return;
  if (Math.abs(dx) < 260) { e.windup = rage ? .7 : .9; e.cd = rage ? 2.6 : 3.2; }
  else {
    const n = rage ? 5 : 3;
    for (let i = 0; i < n; i++) lobMagma(e[0], FLOOR - e.h, hero.x + (i - (n - 1) / 2) * 110, 1.1 + i * .08);
    forgeSfx('lob'); e.cd = rage ? 2.4 : 3;
  }
}

function updateLavaTide(dt) {
  const tide = forge.tide;
  if (forge.phase !== 2 || !forge.arenaLocked) { tide.t = 0; tide.warn = 0; return; }
  if (tide.t > 0) { tide.t -= dt; if (tide.t <= 0) tide.cd = 8; return; }
  if (tide.warn > 0) { tide.warn -= dt; if (tide.warn <= 0) { tide.t = 2.6; shake = .3; forgeMsg('A LAVA SUBIU! Fique nas plataformas!', 2); } return; }
  tide.cd -= dt;
  if (tide.cd <= 0) { tide.warn = 1.6; forgeMsg('O chao racha... SUBA NAS PLATAFORMAS!', 1.8); tone(90, 60, 1.2, 'sawtooth', .03); }
}

function updateForgeFoes(dt) {
  enemies.forEach(e => {
    if (!e.forge || !e[4] || e.frozen > 0) return;
    if (e.frost === 'salamander') updateSalamander(e, dt);
    else if (e.frost === 'bomber') updateBomber(e, dt);
    else if (e.frost === 'ember') updateEmber(e, dt);
    else if (e.frost === 'colossus') updateColossus(e, dt);
  });
  const c = forge.colossus;
  if (c && c[4] && forge.arenaLocked && Math.abs(hero.x - c[0]) < 55 && hero.y + 35 > FLOOR - c.h) damage();
}

function lightAnvil(a) {
  a.lit = true; checkpoint = true; checkpointX = a.x; checkpointY = FLOOR - 35;
  score += 150; forgeSfx('anvil'); burst(a.x, FLOOR - 50, '#ffbd62', 30, 160);
  forgeMsg('Bigorna ancestral acesa: checkpoint!', 2);
}

function updateForgeWorld(dt) {
  forge.msgCd = Math.max(0, forge.msgCd - dt);
  if (!forge.entered && hero.x > 12260) {
    forge.entered = true; checkpoint = true; checkpointX = 12260; checkpointY = FLOOR - 35;
    forgeMsg('FORJA VULCANICA - checkpoint ativado. Cuidado com a lava!', 3); burst(hero.x, hero.y - 20, '#ff9b3d', 30, 160);
  }
  forge.anvils.forEach(a => { if (!a.lit && Math.abs(hero.x - a.x) < 40) lightAnvil(a); });
  const spot = forge.helmSpot;
  if (!spot.taken && Math.hypot(hero.x - spot.x, hero.y + 35 - spot.y) < 50) {
    spot.taken = true; forge.helm = true; score += 700; resonance = Math.min(3, resonance + 1);
    haptic([25, 25, 90]); playSfx('collect'); flash = .2; burst(spot.x, spot.y - 30, '#ffbd62', 50, 220);
    forgeMsg('ELMO DE OBSIDIANA: a lava nao fere mais voce!', 4);
  }
  if (forge.arenaLocked && hero.x < FORGE_ARENA) forge.arenaLocked = false;
  const c = forge.colossus;
  if (c && c[4] && !forge.arenaLocked && hero.x > FORGE_ARENA + 30) {
    forge.arenaLocked = true; bossWarning = 1.5; shake = .3; forgeSfx('slam');
    forgeMsg('O COLOSSO DA FORJA DESPERTA! Ataque o nucleo apos cada martelada.', 3.5);
  }
  if (c && c[4] && c[5] <= COLOSSUS_HP / 2 && forge.phase === 1) {
    forge.phase = 2; forge.tide.cd = 2; flash = .2; shake = .35; burst(c[0], c[1] - 40, '#ff5b2e', 50, 240);
    forgeMsg('FASE 2: O COLOSSO FUNDE O CHAO DA ARENA!', 3);
  }
  updateLavaTide(dt);
  if (c && !c[4] && !forge.bossDefeated) {
    forge.bossDefeated = true; forge.arenaLocked = false; forge.tide.t = 0; forge.puddles = [];
    enemyShots = enemyShots.filter(s => !s.forge);
    heartDrops.push([c[0], FLOOR - 40, 1]); hero.maxHp = Math.min(6, hero.maxHp + 1); hero.hp = hero.maxHp;
    score += 2000; flash = .4; shake = .6;
    burst(c[0], c[1] - 40, '#ff9b3d', 90, 320); burst(c[0], c[1] - 40, '#ffe6a0', 50, 220);
    forgeMsg('O COLOSSO DA FORJA CAIU! O portal final se abre adiante.', 4);
  }
}

function forgeUpdate(dt) {
  if (!forge || !started || paused || victory) return;
  updateForgeFoes(dt);
  updateForgeShots(dt);
  updateForgeArrows();
  updateBasalt(dt);
  updateForgeHero(dt);
  updateForgeWorld(dt);
}

// ---------- Desenho ----------

function drawForgeBackdrop() {
  if (cameraX + W < FORGE_START) return;
  const left = FORGE_START, right = WORLD_W, view = cameraX;
  ctx.save(); ctx.beginPath(); ctx.rect(left, 0, right - left, H); ctx.clip();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#16070a'); sky.addColorStop(.5, '#3d1210'); sky.addColorStop(1, '#5c1d0e');
  ctx.fillStyle = sky; ctx.fillRect(left, 0, right - left, H);
  // Vulcoes distantes com rios de lava (parallax).
  const farShift = view * .4, farOff = farShift % 420, farIdx = Math.floor(farShift / 420);
  for (let i = -1; i < 5; i++) {
    const x = view + i * 420 - farOff, peak = 210 + ((farIdx + i + 40) % 3) * 40;
    ctx.fillStyle = '#2a0f10'; ctx.beginPath(); ctx.moveTo(x - 40, FLOOR); ctx.lineTo(x + 170, peak); ctx.lineTo(x + 230, peak); ctx.lineTo(x + 440, FLOOR); ctx.fill();
    const glow = .5 + .5 * Math.sin(time * 2 + i);
    ctx.fillStyle = `rgba(255,123,53,${.5 + glow * .3})`; ctx.beginPath(); ctx.ellipse(x + 200, peak, 30, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,110,40,${.35 + glow * .2})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 190, peak + 4); ctx.quadraticCurveTo(x + 160, peak + 120, x + 120, FLOOR - 40); ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,22,.5)';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 200 + Math.sin(time * .6 + k) * 20, peak - 40 - k * 36 - (time * 12 % 36), 26 + k * 8, 0, 7); ctx.fill(); }
  }
  // Chamines da forja (camada intermediaria).
  const midShift = view * .7, midOff = midShift % 340, midIdx = Math.floor(midShift / 340);
  for (let i = -1; i < 6; i++) {
    const x = view + i * 340 - midOff + 60, h = 190 + (((midIdx + i + 40) * 53) % 110);
    ctx.fillStyle = '#24110f'; ctx.fillRect(x, FLOOR - h, 62, h);
    ctx.fillStyle = '#3a1a14'; ctx.fillRect(x - 8, FLOOR - h, 78, 14);
    ctx.fillStyle = `rgba(255,140,60,${.45 + .25 * Math.sin(time * 4 + i)})`;
    for (let y = FLOOR - h + 36; y < FLOOR - 40; y += 52) ctx.fillRect(x + 24, y, 14, 18);
  }
  // Transicao gelo -> fogo.
  const fade = ctx.createLinearGradient(left, 0, left + 260, 0);
  fade.addColorStop(0, 'rgba(23,58,92,.9)'); fade.addColorStop(1, 'rgba(23,58,92,0)');
  ctx.fillStyle = fade; ctx.fillRect(left, 0, 260, H);
  if (forge.arenaLocked || hero.x > FORGE_ARENA - 400) {
    ctx.fillStyle = `rgba(255,91,46,${.05 + .03 * Math.sin(time * 2)})`; ctx.fillRect(FORGE_ARENA, 0, right - FORGE_ARENA, H);
    [FORGE_ARENA - 10, WORLD_W - 60].forEach(x => { ctx.fillStyle = '#2b1512'; ctx.fillRect(x, FLOOR - 240, 46, 240); ctx.fillStyle = '#ff7b35'; ctx.fillRect(x + 16, FLOOR - 228, 14, 20); });
  }
  ctx.restore();
}

function drawLava(x, w, top, alpha = 1) {
  ctx.fillStyle = `rgba(255,91,30,${alpha})`; ctx.fillRect(x, top, w, FLOOR + 20 - top);
  ctx.fillStyle = `rgba(255,200,90,${.8 * alpha})`;
  ctx.beginPath(); ctx.moveTo(x, top + 4);
  for (let sx = x; sx <= x + w; sx += 12) ctx.lineTo(sx, top + 3 + Math.sin(time * 4 + sx * .08) * 3);
  ctx.lineTo(x + w, top + 10); ctx.lineTo(x, top + 10); ctx.fill();
  for (let i = 0; i < w / 40; i++) { const bx = x + ((i * 53 + time * 30) % w), r = 3 + Math.abs(Math.sin(time * 3 + i)) * 4; ctx.fillStyle = `rgba(255,230,160,${.6 * alpha})`; ctx.beginPath(); ctx.arc(bx, top + 14 + (i % 3) * 8, r, 0, 7); ctx.fill(); }
}

function drawForgeTerrain() {
  if (cameraX + W < FORGE_START) return;
  ctx.fillStyle = '#1e1212'; ctx.fillRect(FORGE_START, FLOOR, WORLD_W - FORGE_START, H - FLOOR);
  ctx.fillStyle = '#2e1a17'; ctx.fillRect(FORGE_START, FLOOR, WORLD_W - FORGE_START, 10);
  ctx.strokeStyle = `rgba(255,110,40,${.45 + .2 * Math.sin(time * 2)})`; ctx.lineWidth = 2;
  for (let x = Math.max(FORGE_START, cameraX - 60); x < Math.min(WORLD_W, cameraX + W + 60); x += 90) {
    const bx = x - x % 90; ctx.beginPath(); ctx.moveTo(bx + 10, FLOOR + 14); ctx.lineTo(bx + 34, FLOOR + 40); ctx.lineTo(bx + 28, FLOOR + 70); ctx.moveTo(bx + 34, FLOOR + 40); ctx.lineTo(bx + 62, FLOOR + 52); ctx.stroke();
  }
  forge.pools.forEach(([x, w]) => drawLava(x, w, FLOOR - 6));
  const tide = forge.tide;
  if (tide.warn > 0) {
    ctx.strokeStyle = `rgba(255,170,70,${.5 + .5 * Math.sin(time * 20)})`; ctx.lineWidth = 3;
    for (let x = FORGE_ARENA + 20; x < WORLD_W; x += 70) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + 20, FLOOR - 8); ctx.lineTo(x + 40, FLOOR); ctx.stroke(); }
  }
  if (tide.t > 0) drawLava(FORGE_ARENA, WORLD_W - FORGE_ARENA, FLOOR - 26, Math.min(1, tide.t * 2));
  forge.puddles.forEach(p => { ctx.fillStyle = `rgba(255,110,40,${Math.min(1, p.t)})`; ctx.beginPath(); ctx.ellipse(p.x, FLOOR - 3, 30, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(255,220,140,${Math.min(1, p.t) * .7})`; ctx.beginPath(); ctx.ellipse(p.x, FLOOR - 4, 14, 3, 0, 0, 7); ctx.fill(); });
  platforms.forEach(p => {
    if (p[4] !== 'basalt' && p[4] !== 'obsidian') return;
    if (p[4] === 'basalt' && p.down > 0) return;
    const jitter = p.crumble > 0 ? Math.sin(time * 60) * 2 : 0, x = p[0] + jitter, y = p[1];
    ctx.fillStyle = p[4] === 'basalt' ? '#3b2a28' : '#1d1622'; ctx.fillRect(x, y, p[2], p[3]);
    ctx.fillStyle = p[4] === 'basalt' ? '#5a4440' : '#3a2e48'; ctx.fillRect(x, y, p[2], 5);
    ctx.strokeStyle = p[4] === 'basalt' ? `rgba(255,123,53,${p.crumble > 0 ? .9 : .4})` : 'rgba(216,139,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + p[2] * .25, y + 6); ctx.lineTo(x + p[2] * .4, y + p[3]); ctx.moveTo(x + p[2] * .7, y + 4); ctx.lineTo(x + p[2] * .6, y + p[3]); ctx.stroke();
  });
  forge.walls.forEach(w => {
    if (w.hp <= 0) return;
    ctx.fillStyle = '#2e2120'; ctx.fillRect(w.x, w.top, w.w, FLOOR - w.top);
    ctx.fillStyle = '#4a3632'; for (let y = w.top; y < FLOOR; y += 36) ctx.fillRect(w.x + ((y / 36) % 2) * 8, y, w.w - 8, 4);
    ctx.strokeStyle = `rgba(255,123,53,${.3 + .6 * (1 - w.hp / w.max)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w.x + 10, w.top + 60); ctx.lineTo(w.x + 30, w.top + 160); ctx.lineTo(w.x + 14, w.top + 300); ctx.stroke();
    if (Math.abs(hero.x - w.x) < 500) text(`BASALTO ${w.hp}/${w.max}`, w.x + w.w / 2, w.top - 12, 12, '#ff9b3d', 'center');
  });
  forge.anvils.forEach(a => {
    ctx.fillStyle = '#3a3440'; ctx.fillRect(a.x - 26, FLOOR - 30, 52, 14); ctx.fillRect(a.x - 12, FLOOR - 16, 24, 16); ctx.fillRect(a.x - 34, FLOOR - 38, 30, 9);
    if (a.lit) { ctx.fillStyle = `rgba(255,189,98,${.35 + .2 * Math.sin(time * 6)})`; ctx.beginPath(); ctx.arc(a.x, FLOOR - 40, 22, 0, 7); ctx.fill(); }
  });
  const spot = forge.helmSpot;
  if (!spot.taken) {
    const y = spot.y - 34 + Math.sin(time * 3) * 4;
    ctx.fillStyle = 'rgba(255,189,98,.18)'; ctx.beginPath(); ctx.arc(spot.x, y, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2233'; ctx.beginPath(); ctx.arc(spot.x, y, 15, Math.PI, 0); ctx.fill(); ctx.fillRect(spot.x - 15, y, 30, 9);
    ctx.fillStyle = '#ff9b3d'; ctx.fillRect(spot.x - 9, y + 1, 18, 3);
    text('ELMO', spot.x, y + 26, 10, '#ffbd62', 'center');
  }
}

function drawSalamander(e, hit) {
  const x = e[0], y = FLOOR - 4, d = e[2], wig = Math.sin(time * (e.dash > 0 ? 30 : 10)) * 6;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, FLOOR, 36, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#7a1d10';
  ctx.beginPath(); ctx.moveTo(x - d * 22, y - 12); ctx.quadraticCurveTo(x - d * 44, y - 6 + wig, x - d * 58, y - 16 + wig); ctx.lineTo(x - d * 22, y - 4); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - 13, 26, 11, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + d * 28, y - 17, 13, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff7b35'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 12 - 6, y - 22); ctx.lineTo(x + i * 12, y - 34 - Math.abs(wig) * .5); ctx.lineTo(x + i * 12 + 6, y - 22); ctx.fill(); }
  ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.arc(x + d * 33, y - 20, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a120a'; [-14, 12].forEach(o => ctx.fillRect(x + o - 3, y - 4, 6, 6 + (Math.sin(time * 14 + o) > 0 ? 2 : 0)));
}

function drawBomber(e, hit) {
  const x = e[0], y = e[1] + 30, glow = e.cast > 0 ? 1 - e.cast / .55 : .3 + .2 * Math.sin(time * 3);
  ctx.fillStyle = hit ? '#ffffff' : '#3a2522';
  ctx.beginPath(); ctx.moveTo(x - 34, y); ctx.lineTo(x - 24, y - 44); ctx.lineTo(x - 12, y - 52); ctx.lineTo(x + 12, y - 52); ctx.lineTo(x + 24, y - 44); ctx.lineTo(x + 34, y); ctx.fill();
  ctx.fillStyle = `rgba(255,123,53,${.5 + glow * .5})`; ctx.beginPath(); ctx.ellipse(x, y - 52, 13, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(255,190,90,${glow})`; ctx.beginPath(); ctx.arc(x, y - 58 - glow * 8, 6 + glow * 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffbd62'; ctx.fillRect(x + e[2] * 8 - 4, y - 32, 8, 5); ctx.fillRect(x + e[2] * 8 + e[2] * 10 - 4, y - 32, 8, 5);
}

function drawEmber(e, hit) {
  const x = e[0], y = e[1], flap = Math.sin(time * 16 + e.homeX) * 14;
  ctx.fillStyle = 'rgba(255,123,53,.2)'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#ff5b2e';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 26, y - 20 - flap, x + s * 40, y - 4 + flap * .4); ctx.quadraticCurveTo(x + s * 20, y + 2, x, y + 6); ctx.fill(); });
  ctx.fillStyle = '#ffbd62'; ctx.beginPath(); ctx.ellipse(x, y, 9, 13, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(x + e[2] * 3, y - 6, 3, 0, 7); ctx.fill();
  if (Math.random() < .3) particles.push({ x, y: y + 10, vx: (Math.random() - .5) * 30, vy: 40, life: .4, max: .4, size: 2.5, color: '#ff9b3d' });
}

function drawColossus(e, hit) {
  const x = e[0], d = e[2], top = FLOOR - e.h, raise = e.windup > 0 ? 1 : 0, step = e.exposed > 0 ? 0 : Math.sin(time * 4) * 4;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, FLOOR, 80, 10, 0, 0, 7); ctx.fill();
  ctx.fillStyle = hit ? '#ffffff' : '#2a1d1c';
  ctx.fillRect(x - 40, FLOOR - 58 + step, 26, 58 - step); ctx.fillRect(x + 14, FLOOR - 58 - step, 26, 58 + step);
  ctx.fillRect(x - 58, top + 40, 116, 82); ctx.fillRect(x - 30, top + 6, 60, 40);
  ctx.fillStyle = '#3d2a27'; ctx.fillRect(x - 66, top + 34, 132, 16);
  ctx.strokeStyle = `rgba(255,110,40,${.55 + .3 * Math.sin(time * 3)})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 44, top + 56); ctx.lineTo(x - 20, top + 86); ctx.lineTo(x - 36, top + 116); ctx.moveTo(x + 46, top + 60); ctx.lineTo(x + 24, top + 96); ctx.stroke();
  ctx.fillStyle = e.windup > 0 ? '#ff5b77' : '#ffbd62'; ctx.fillRect(x + d * 4 - 16, top + 20, 12, 7); ctx.fillRect(x + d * 4 + 6, top + 20, 12, 7);
  const core = e.exposed > 0 ? 1 : .3, r = 14 + core * 8 + Math.sin(time * 10) * core * 3;
  ctx.fillStyle = `rgba(255,230,160,${.25 * core})`; ctx.beginPath(); ctx.arc(x, top + 80, r + 18, 0, 7); ctx.fill();
  ctx.fillStyle = e.exposed > 0 ? '#fff2c0' : '#a8401e'; ctx.beginPath(); ctx.arc(x, top + 80, r, 0, 7); ctx.fill();
  // Braco do martelo: erguido durante o golpe.
  ctx.save(); ctx.translate(x + d * 62, top + 46); ctx.rotate(d * (raise ? -2.4 : e.exposed > 0 ? .5 : -.2));
  ctx.fillStyle = hit ? '#ffffff' : '#2a1d1c'; ctx.fillRect(-10, 0, 20, 70);
  ctx.fillStyle = '#4a3a3a'; ctx.fillRect(-4, 60, 8, 50); ctx.fillStyle = '#3a2e48'; ctx.fillRect(-30, 104, 60, 34);
  ctx.fillStyle = `rgba(255,123,53,${raise ? .9 : .4})`; ctx.fillRect(-30, 114, 60, 5); ctx.restore();
  if (e.windup > 0) { ctx.strokeStyle = 'rgba(255,113,142,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, FLOOR - 4, 120 * (1 - e.windup), 0, Math.PI, true); ctx.stroke(); }
}

function drawForgeFoes() {
  enemies.forEach(e => {
    if (!e[4] || !e.forge) return;
    const hit = e.hitFx > 0;
    if (e.frost === 'salamander') drawSalamander(e, hit);
    else if (e.frost === 'bomber') drawBomber(e, hit);
    else if (e.frost === 'ember') drawEmber(e, hit);
    else if (e.frost === 'colossus') drawColossus(e, hit);
  });
}

function drawForgeShot(s) {
  ctx.save();
  if (s.kind === 'magma') {
    ctx.shadowBlur = 16; ctx.shadowColor = '#ff7b35'; ctx.fillStyle = '#ff5b2e'; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.arc(s.x - 3, s.y - 3, 4, 0, 7); ctx.fill();
  } else if (s.kind === 'flamewave') {
    const dir = Math.sign(s.vx) || 1; ctx.shadowBlur = 14; ctx.shadowColor = '#ff7b35';
    for (let i = 0; i < 3; i++) { const x = s.x - dir * i * 18, h = 46 - i * 12 + Math.sin(time * 30 + i) * 5; ctx.fillStyle = i ? '#ff7b35' : '#ffbd62'; ctx.beginPath(); ctx.moveTo(x - 11, FLOOR); ctx.quadraticCurveTo(x - 6, FLOOR - h * .6, x, FLOOR - h); ctx.quadraticCurveTo(x + 6, FLOOR - h * .6, x + 11, FLOOR); ctx.fill(); }
  }
  ctx.restore();
}

// Chamado de dentro do desenho de projeteis (ja transladado e rotacionado).
function drawHammerShot(a) {
  ctx.rotate(a.spin * .9);
  ctx.fillStyle = '#6b3928'; ctx.fillRect(-3, -18, 6, 30);
  ctx.fillStyle = '#3a2e48'; ctx.fillRect(-14, -26, 28, 14);
  ctx.fillStyle = '#ff9b3d'; ctx.fillRect(-14, -21, 28, 4);
}

function drawHammerPickup(item) {
  const y = item[1] - 18 + Math.sin(time * 3) * 4;
  ctx.fillStyle = 'rgba(255,155,61,.2)'; ctx.beginPath(); ctx.arc(item[0], y, 30 + Math.sin(time * 4) * 3, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(item[0], y); ctx.rotate(-.5);
  ctx.fillStyle = '#6b3928'; ctx.fillRect(-3, -6, 6, 34);
  ctx.fillStyle = '#3a2e48'; ctx.fillRect(-16, -20, 32, 16); ctx.fillStyle = '#ff9b3d'; ctx.fillRect(-16, -14, 32, 4);
  ctx.restore();
  text('MARTELO VULCANICO', item[0], item[1] + 28, 12, '#ff9b3d', 'center');
}

function drawForgeAtmosphere() {
  if (cameraX + W < FORGE_START) return;
  const startSx = Math.max(0, FORGE_START - cameraX);
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 157.3 + Math.sin(time * .8 + i) * 40) % W + W) % W, sy = H - ((i * 83 + time * (40 + (i % 4) * 18)) % H);
    if (sx < startSx) continue;
    ctx.fillStyle = i % 3 ? `rgba(255,${120 + (i % 5) * 20},60,${.5 + .3 * Math.sin(time * 5 + i)})` : 'rgba(90,80,80,.5)';
    ctx.fillRect(sx, sy, 2 + (i % 2), 2 + (i % 2));
  }
  const heat = ctx.createLinearGradient(0, H, 0, H * .45);
  heat.addColorStop(0, `rgba(255,90,30,${.16 + .05 * Math.sin(time * 2)})`); heat.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = heat; ctx.fillRect(startSx, H * .45, W - startSx, H * .55);
}

function drawForgeUI() {
  if (!started || victory || hero.x < FORGE_START - 200) return;
  const chips = [
    [forge.hammer ? 'MARTELO ✓' : 'MARTELO —', forge.hammer ? '#ff9b3d' : '#5d6b80'],
    [forge.helm ? 'ELMO DE OBSIDIANA ✓' : 'ELMO ?', forge.helm ? '#ffbd62' : '#5d6b80']
  ];
  let x = 28;
  chips.forEach(([label, color]) => { ctx.font = '12px system-ui,sans-serif'; const w = ctx.measureText(label).width + 18; ctx.fillStyle = 'rgba(8,12,24,.82)'; ctx.fillRect(x, 128, w, 22); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + .5, 128.5, w - 1, 21); text(label, x + 9, 143, 12, color); x += w + 6; });
  const c = forge.colossus;
  if (c && c[4] && forge.arenaLocked) {
    const w = 460, bx = 576 - w / 2, y = 158;
    ctx.fillStyle = 'rgba(7,10,20,.9)'; ctx.fillRect(bx - 4, y - 4, w + 8, 18);
    ctx.fillStyle = c.exposed > 0 ? '#ffe6a0' : '#ff7b35'; ctx.fillRect(bx, y, w * Math.max(0, c[5] / COLOSSUS_HP), 10);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx + w / 2 - 1, y - 3, 2, 16);
    text(`COLOSSO DA FORJA  •  FASE ${forge.phase}${c.exposed > 0 ? '  •  NUCLEO EXPOSTO' : ''}`, 576, y - 10, 15, c.exposed > 0 ? '#ffe6a0' : '#ff9b3d', 'center');
  }
}

// ---------- Integracao com o jogo existente ----------

const frostLoadLevel = loadLevel;
loadLevel = function () { frostLoadLevel(); forgeReset(); };
const frostUpdateLoop = update;
update = function (dt) { frostUpdateLoop(dt); forge.hammer = forge.hammer || maxWeapon >= 6; forgeUpdate(dt); };
const frostDrawBossArena = drawBossArena;
drawBossArena = function () { frostDrawBossArena(); if (forge) drawForgeBackdrop(); };
const frostDrawWorldExtras = drawWorldExtras;
drawWorldExtras = function () { frostDrawWorldExtras(); if (forge) drawForgeTerrain(); };
const frostDrawEnemyPremium = drawEnemyPremium;
drawEnemyPremium = function () { frostDrawEnemyPremium(); if (forge) drawForgeFoes(); };
const frostDrawShot = drawFrostShot;
drawFrostShot = function (s) { if (s.forge) drawForgeShot(s); else frostDrawShot(s); };
const frostDrawAtmosphere = drawAtmosphere;
drawAtmosphere = function () { frostDrawAtmosphere(); if (forge) drawForgeAtmosphere(); };
const frostDrawUI = drawUI;
drawUI = function () { frostDrawUI(); if (forge) drawForgeUI(); };

forgeReset();
lastEnemyCount = enemies.filter(e => e[4]).length;
