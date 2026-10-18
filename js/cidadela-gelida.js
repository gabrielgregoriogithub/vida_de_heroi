// Cidadela Gelida: quinta regiao, liberada apos derrotar o Senhor das Caveiras.
// Integra-se ao loop principal envolvendo loadLevel/update e as funcoes de desenho existentes.
const FROST_END = 12100, FROST_ARENA = 11050, QUEEN_HOME = 11600, QUEEN_HP = 60;
const FROST_TYPES = { golem: 12, mage: 13, wisp: 14, queen: 15, core: 16 };

const frostArt = {};
['frost-queen', 'frost-golem', 'ice-mage', 'crystal-wisp', 'aurora-wings', 'glacial-blade'].forEach(name => {
  const img = new Image();
  img.src = `assets/frost/${name}.png`;
  frostArt[name] = img;
});
function frostImg(name) { const img = frostArt[name]; return img && img.complete && img.naturalWidth ? img : null; }

let frost = null;

function frostFoe(kind, x, y, hp, extra = {}) {
  const e = [x, y, -1, 0, 1, hp, FROST_TYPES[kind]];
  return Object.assign(e, { frost: kind, maxHp: hp, homeX: x, homeY: y, t: Math.random() * 3, cd: 1.5 + Math.random(), hitFx: 0, lastHp: hp }, extra);
}

function frostReset() {
  frost = {
    wings: false, amulet: false, flames: 0, flameReward: false, chill: 0, entered: false, gateMsg: 0,
    blizzard: { cd: 10, warn: 0, t: 0, dir: -1 }, arenaLocked: false, queenIntro: false, phase: 1,
    queenDefeated: false, snowAlt: 0, snowTarget: 0, wingsDrop: null, ambush: false, lastAstral: 0, gliding: false,
    amuletChest: { x: 10670, y: 300, open: false },
    walls: [{ x: 10470, w: 44, top: 110, hp: 10, max: 10 }],
    braziers: [{ x: 9340, lit: false }, { x: 10260, lit: false }, { x: 10990, lit: false }],
    icicles: [9470, 9540, 9610, 10700, 10770].map(x => ({ x, top: 118, state: 0, t: 0, y: 0, vy: 0 })),
    falling: [], cores: [], queen: null, ancestral: null
  };
  platforms.push(
    [8640, 450, 170, 24, 'ice'], [8900, 380, 170, 24, 'ice'], [9180, 300, 150, 24, 'ice'], [9420, 420, 180, 24, 'ice'],
    [9700, 340, 160, 24, 'ice'], [10020, 360, 150, 24, 'ice'], [10600, 300, 140, 20, 'aurora'], [10820, 430, 160, 24, 'ice'],
    [11180, 420, 150, 24, 'ice'], [11480, 320, 180, 24, 'ice'], [11820, 420, 150, 24, 'ice']
  );
  weapons.push([9255, 265, 5, 1]);
  hazards.push([9880, FLOOR - 12, 70, 12, 'spikes'], [10880, FLOOR - 12, 60, 12, 'spikes']);
  const ancestral = frostFoe('golem', 10150, FLOOR - 80, 20, { ancestral: true, base: FLOOR, h: 185 });
  const queen = frostFoe('queen', QUEEN_HOME, 250, QUEEN_HP);
  frost.ancestral = ancestral;
  frost.queen = queen;
  enemies.push(
    frostFoe('golem', 8820, FLOOR - 55, 7, { base: FLOOR, h: 125 }),
    frostFoe('mage', 8985, 332, 4, { anchors: [[8985, 380], [8730, 450], [9255, 300]] }),
    frostFoe('wisp', 9660, 250, 2), frostFoe('wisp', 9880, 220, 2),
    ancestral,
    frostFoe('golem', 10950, FLOOR - 55, 7, { base: FLOOR, h: 125 }),
    frostFoe('mage', 10900, 382, 4, { anchors: [[10900, 430], [10720, 540], [11000, 540]] }),
    queen
  );
}

function frostBarrierUp() { return !!(frost && frost.cores.some(c => c[4])); }

function frostSfx(kind) {
  if (kind === 'crack') { tone(900, 300, .14, 'square', .025); tone(1600, 700, .08, 'triangle', .015); }
  else if (kind === 'shatter') { tone(1800, 400, .22, 'triangle', .035); tone(700, 120, .25, 'square', .025); }
  else if (kind === 'stomp') { tone(80, 32, .35, 'sawtooth', .06); }
  else if (kind === 'flame') { tone(140, 420, .4, 'sawtooth', .035); tone(300, 900, .3, 'triangle', .02); }
  else if (kind === 'wind') { tone(220, 160, .8, 'sine', .02); }
}

function frostMsg(text, duration = 1.6) { msg = text; msgTime = duration; }

// Calcula o dano de um projetil do heroi considerando escudo, barreira, fraquezas e congelamento.
function hitPower(a, e) {
  let power = (a.power || 1) + (frost && frost.amulet ? 1 : 0);
  const kind = e.frost;
  if (kind === 'golem' && a.vx * e[2] < 0 && a.kind !== 2 && a.kind !== 4) {
    burst(e[0] + e[2] * 34, e[1] - 10, '#bfefff', 10, 110);
    frostSfx('crack');
    frostMsg('Escudo de gelo! Ataque pelas costas ou use LANCA/TOCHA.', 1.3);
    return 0;
  }
  if (kind === 'queen' && !frost.arenaLocked) {
    burst(a.x, a.y, '#9eeaff', 8, 90);
    frostMsg('A Rainha esta protegida pelo trono. Entre na arena!', 1.3);
    return 0;
  }
  if (kind === 'queen' && frostBarrierUp()) {
    burst(a.x, a.y, '#d88bff', 10, 110);
    frostMsg('Barreira ativa: destrua os Cristais de Amago!', 1.3);
    return 0;
  }
  const iceBorn = kind === 'golem' || kind === 'wisp' || kind === 'queen' || kind === 'core';
  if (a.kind === 4 && iceBorn) power = Math.ceil(power * (kind === 'queen' ? 1.5 : 2));
  if (e.frozen > 0 && a.kind === 4) {
    power *= 3; e.frozen = 0;
    burst(e[0], e[1] - 10, '#ffbd62', 26, 180);
    frostMsg('CHOQUE TERMICO! Dano triplo.', 1.2);
  } else if (e.frozen > 0) power += 1;
  if (a.kind === 5 && !iceBorn) applyFreeze(e);
  return power;
}

function applyFreeze(e) {
  if (e.freezeCd > 0) return;
  const strong = isBoss(e) || e[6] === 11;
  e.frozen = strong ? .7 : 2.2;
  e.freezeCd = strong ? 4 : 0;
  burst(e[0], e[1] - 12, '#bff4ff', 14, 90);
}

function heroGround() {
  if (hero.y + 35 >= FLOOR - 1) return hero.x > FROST_START ? 'frost' : 'ground';
  const p = platforms.find(q => hero.x > q[0] - 18 && hero.x < q[0] + q[2] + 18 && Math.abs(hero.y + 35 - q[1]) < 5);
  return p ? (p[4] === 'ice' || p[4] === 'aurora' ? 'ice' : 'stone') : null;
}

function frostPreUpdate() {
  return {
    x: hero.x, vx: hero.vx, jumps: hero.jumps, grounded: floor(), hp: hero.hp + hero.armor,
    iceShots: enemyShots.filter(s => s.kind === 'ice')
  };
}

function updateFrostHero(dt, pre) {
  const blocking = down('KeyL') && shieldLevel > 0, axis = down('ArrowRight', 'KeyD') || down('ArrowLeft', 'KeyA');
  const jumpPressed = hit('Space', 'ArrowUp', 'KeyW');
  // Asas da Aurora: terceiro pulo e planar segurando o pulo.
  if (frost.wings && jumpPressed && !pre.grounded && pre.jumps === 2) {
    hero.vy = -520; hero.jumps = 3; hero.jumpStyle = 2; hero.jumpFx = .4;
    playSfx('doubleJump'); burst(hero.x, hero.y + 30, '#8affc8', 20, 120);
    frostMsg('Pulo da Aurora!', .7);
  }
  frost.gliding = frost.wings && !floor() && hero.vy > 120 && down('Space', 'ArrowUp', 'KeyW');
  if (frost.gliding) {
    hero.vy = 120;
    if (Math.random() < .3) particles.push({ x: hero.x + (Math.random() - .5) * 50, y: hero.y - 10, vx: 0, vy: 40, life: .5, max: .5, size: 2.5, color: Math.random() < .5 ? '#8affc8' : '#d88bff' });
  }
  // Gelo escorregadio.
  const ground = heroGround();
  if ((ground === 'ice' || ground === 'frost') && !axis && !blocking && !hit('ShiftLeft', 'ShiftRight') && hero.dashFx <= 0) {
    const desired = pre.vx * Math.max(0, 1 - 3.2 * dt), diff = desired - hero.vx;
    hero.vx = desired; hero.x += diff * dt;
  }
  // Fragmentos de gelo dos magos congelam o heroi.
  pre.iceShots.forEach(s => {
    if (s.life > 0 || Math.hypot(s.x - hero.x, s.y - (hero.y - 18)) > 32) return;
    if (blocking && Math.hypot(s.x - (hero.x + hero.face * 25), s.y - (hero.y - 20)) < 24) return;
    frost.chill = 2.4; frostMsg('Voce esta CONGELADO: movimentos lentos!', 1.4);
  });
  frost.chill = Math.max(0, frost.chill - dt);
  const moved = hero.x - pre.x;
  if (frost.chill > 0 && Math.abs(moved) < 60) hero.x -= moved * .4;
  if (frost.blizzard.t > 0) hero.x += frost.blizzard.dir * (blocking ? 40 : 135) * dt;
  // Portao da cidadela so abre apos a queda do Senhor das Caveiras.
  const bigBoss = enemies.find(e => e[6] === 7 && e[4]);
  if (bigBoss && hero.x > FROST_START - 30) {
    hero.x = FROST_START - 30; hero.vx = Math.min(0, hero.vx);
    if (frost.gateMsg <= 0) { frostMsg('O Portao Gelido esta selado pelo Senhor das Caveiras.', 2); frost.gateMsg = 3; }
  }
  frost.gateMsg = Math.max(0, frost.gateMsg - dt);
  frost.walls.forEach(w => {
    if (w.hp <= 0 || hero.x + 16 < w.x || hero.x - 16 > w.x + w.w || hero.y + 35 < w.top) return;
    hero.x = pre.x < w.x + w.w / 2 ? w.x - 16 : w.x + w.w + 16; hero.vx = 0;
    if (frost.gateMsg <= 0) { frostMsg('Muralha de gelo! Derreta com a TOCHA (Q troca arma) ou RUPTURA ASTRAL.', 2.4); frost.gateMsg = 4; }
  });
  // Altitude da ultima superficie pisada: quanto mais alto, mais forte a neve.
  if (floor()) frost.snowTarget = hero.x > FROST_START && hero.x < FROST_END ? Math.max(0, Math.min(1, (FLOOR - hero.y - 35) / 240)) : 0;
  frost.snowAlt += (frost.snowTarget - frost.snowAlt) * Math.min(1, 1.4 * dt);
  if (frost.arenaLocked && hero.x < FROST_ARENA + 20) { hero.x = FROST_ARENA + 20; hero.vx = Math.max(0, hero.vx); }
  hero.x = Math.max(24, Math.min(WORLD_W - 24, hero.x));
}

function updateFrostWorld(dt, pre) {
  if (!frost.entered && hero.x > 8620) {
    frost.entered = true; checkpoint = true; checkpointX = 8650; checkpointY = FLOOR - 35;
    frostMsg('CIDADELA GELIDA - checkpoint ativado.', 3); burst(hero.x, hero.y - 20, '#9eeaff', 30, 160);
  }
  // Morte dentro da arena: libera a porta para o heroi poder voltar.
  if (frost.arenaLocked && hero.x < FROST_ARENA) frost.arenaLocked = false;
  // Projeteis do heroi: muralhas e braseiros.
  arrows.forEach(a => {
    frost.walls.forEach(w => {
      if (w.hp <= 0 || a.life <= 0 || a.x < w.x - 6 || a.x > w.x + w.w + 6 || a.y < w.top) return;
      a.life = 0; w.hp -= a.kind === 4 ? 4 : 1; frostSfx(w.hp <= 0 ? 'shatter' : 'crack');
      burst(a.x, a.y, a.kind === 4 ? '#ffbd62' : '#bff4ff', 10, 100);
      if (w.hp <= 0) { burst(w.x + w.w / 2, FLOOR - 160, '#bff4ff', 50, 220); score += 200; frostMsg('A muralha de gelo derreteu!', 2); }
    });
    frost.braziers.forEach(b => {
      if (b.lit || a.kind !== 4 || Math.hypot(a.x - b.x, a.y - (FLOOR - 62)) > 46) return;
      lightBrazier(b); a.life = 0;
    });
  });
  if (astralCooldown > frost.lastAstral + .5) {
    frost.walls.forEach(w => { if (w.hp > 0 && Math.abs(hero.x - (w.x + w.w / 2)) < 260) { w.hp = 0; burst(w.x + w.w / 2, FLOOR - 160, '#9eeaef', 50, 220); frostMsg('A Ruptura Astral estilhacou a muralha!', 2); } });
  }
  frost.lastAstral = astralCooldown;
  frost.braziers.forEach(b => {
    if (b.lit && Math.abs(hero.x - b.x) < 90) frost.chill = 0;
    if (!b.lit && Math.abs(hero.x - b.x) < 120 && weapon !== 4 && frost.gateMsg <= 0) { frostMsg('Braseiro apagado: acerte-o com a TOCHA para criar um checkpoint.', 2.2); frost.gateMsg = 5; }
  });
  updateIcicles(dt);
  updateBlizzard(dt);
  // Relicarios.
  if (frost.wingsDrop && Math.hypot(hero.x - frost.wingsDrop.x, hero.y - frost.wingsDrop.y) < 55) {
    frost.wingsDrop = null; frost.wings = true; score += 600; resonance = Math.min(3, resonance + 1);
    haptic([25, 25, 90]); playSfx('collect'); flash = .2; burst(hero.x, hero.y - 20, '#8affc8', 50, 220);
    frostMsg('ASAS DA AURORA: pulo triplo e planar (segure PULO). Algo brilha no alto, alem da muralha...', 4.5);
  }
  const chest = frost.amuletChest;
  if (!chest.open && Math.hypot(hero.x - chest.x, hero.y + 35 - chest.y) < 60) {
    chest.open = true; frost.amulet = true; score += 800;
    haptic([25, 25, 90]); playSfx('collect'); flash = .2; burst(chest.x, chest.y - 30, '#f0c45d', 50, 220);
    frostMsg('SEGREDO: AMULETO BOREAL! +1 de dano em todos os ataques.', 3.5);
  }
  if (!frost.ambush && hero.x > 10330) {
    frost.ambush = true;
    [[hero.x - 430, 200], [hero.x + 420, 180], [hero.x + 160, 120]].forEach(([x, y]) => { enemies.push(frostFoe('wisp', x, y, 2)); burst(x, y, '#9eeaff', 20, 140); });
    frost.blizzard.cd = 0; frost.blizzard.warn = 0; frost.blizzard.t = 4; frost.blizzard.dir = -1;
    bossWarning = 1; shake = .2; frostMsg('EMBOSCADA NA NEVASCA!', 2.5); frostSfx('wind');
  }
  const anc = frost.ancestral;
  if (anc && !anc[4] && !anc.rewarded) {
    anc.rewarded = true; frost.wingsDrop = { x: anc[0], y: FLOOR - 70 }; score += 900; shake = .3; flash = .15;
    burst(anc[0], anc[1], '#9eeaff', 60, 260); frostMsg('O Golem Ancestral ruiu! Uma reliquia surgiu.', 3);
  }
}

function lightBrazier(b) {
  b.lit = true; frost.flames++; checkpoint = true; checkpointX = b.x; checkpointY = FLOOR - 35;
  hero.hp = Math.min(hero.maxHp, hero.hp + 1); score += 150; frostSfx('flame'); burst(b.x, FLOOR - 70, '#ffbd62', 30, 160);
  frostMsg(`Braseiro aceso (${frost.flames}/3): checkpoint e calor recuperados.`, 2.4);
  if (frost.flames === 3 && !frost.flameReward) {
    frost.flameReward = true; hero.maxHp = Math.min(7, hero.maxHp + 1); hero.hp = hero.maxHp; resonance = Math.min(3, resonance + 1); score += 600;
    flash = .2; frostMsg('CHAMAS DO SANTUARIO: Coracao da Chama! Vida maxima +1.', 3.5);
  }
}

function updateIcicles(dt) {
  frost.icicles.forEach(c => {
    if (c.state === 0 && Math.abs(hero.x - c.x) < 85 && hero.y > c.top) { c.state = 1; c.t = .55; frostSfx('crack'); }
    else if (c.state === 1 && (c.t -= dt) <= 0) { c.state = 2; c.y = c.top + 30; c.vy = 0; }
    else if (c.state === 2) {
      c.vy += 1500 * dt; c.y += c.vy * dt;
      if (Math.abs(hero.x - c.x) < 22 && c.y > hero.y - 55 && c.y < hero.y + 35) { damage(); shatterIcicle(c); }
      else if (c.y >= FLOOR - 8) shatterIcicle(c);
    } else if (c.state === 3 && (c.t -= dt) <= 0) c.state = 0;
  });
  frost.falling.forEach(f => {
    if (f.t > 0) { f.t -= dt; return; }
    f.vy += 1700 * dt; f.y += f.vy * dt;
    if (Math.abs(hero.x - f.x) < 26 && f.y > hero.y - 55 && f.y < hero.y + 35) { damage(); f.done = true; }
    if (f.y >= FLOOR - 8) f.done = true;
    if (f.done) { burst(f.x, Math.min(f.y, FLOOR - 8), '#bff4ff', 14, 130); frostSfx('shatter'); }
  });
  frost.falling = frost.falling.filter(f => !f.done);
}

function shatterIcicle(c) { c.state = 3; c.t = 6; burst(c.x, Math.min(c.y, FLOOR - 8), '#bff4ff', 16, 140); frostSfx('shatter'); }

function updateBlizzard(dt) {
  const b = frost.blizzard, inRegion = hero.x > 8700 && hero.x < FROST_ARENA, rage = frost.arenaLocked && frost.phase === 3;
  if (b.t > 0) { b.t -= dt; if (Math.random() < .5) particles.push({ x: hero.x - b.dir * 600 + (Math.random() - .5) * 200, y: 150 + Math.random() * 380, vx: b.dir * 520, vy: 40, life: .9, max: .9, size: 2, color: '#e8f6ff' }); if (b.t <= 0) b.cd = rage ? 4 : 11 + Math.random() * 5; return; }
  if (!inRegion && !rage) return;
  if (b.warn > 0) { if ((b.warn -= dt) <= 0) { b.t = 3.5; frostSfx('wind'); } return; }
  if ((b.cd -= dt) <= 0) { b.warn = 1.2; b.dir = Math.random() < .5 ? -1 : 1; frostMsg(`A NEVASCA SE APROXIMA ${b.dir < 0 ? '◀' : '▶'} segure L (escudo) para resistir`, 1.8); }
}

function updateFrostFoes(dt) {
  enemies.forEach(e => {
    if (!e.frost) return;
    e.freezeCd = Math.max(0, (e.freezeCd || 0) - dt);
    if (e[5] < e.lastHp) e.hitFx = .14;
    e.lastHp = e[5]; e.hitFx = Math.max(0, e.hitFx - dt);
    if (!e[4] || e.frozen > 0) return;
    e.t += dt;
    if (e.frost === 'golem') updateGolem(e, dt);
    else if (e.frost === 'mage') updateMage(e, dt);
    else if (e.frost === 'wisp') updateWisp(e, dt);
    else if (e.frost === 'queen') updateQueen(e, dt);
    else if (e.frost === 'core') { e[1] = e.homeY + Math.sin(e.t * 2.4) * 14; }
  });
}

function updateGolem(e, dt) {
  const dx = hero.x - e[0], near = Math.abs(dx) < (e.ancestral ? 520 : 420), reach = e.ancestral ? 64 : 44;
  if (near) {
    const want = Math.sign(dx) || e[2];
    if (want !== e[2]) { e.turn = (e.turn || 0) + dt; if (e.turn > (e.ancestral ? .7 : .9)) { e[2] = want; e.turn = 0; } } else e.turn = 0;
    if (!e.windup) e[0] += e[2] * (e.ancestral ? 34 : 40) * dt;
    e[0] = Math.max(e.homeX - 240, Math.min(e.homeX + 240, e[0]));
    e.cd -= dt;
    if (!e.windup && e.cd <= 0 && Math.abs(dx) < 320) e.windup = .6;
  }
  if (e.windup) {
    e.windup -= dt;
    if (e.windup <= 0) {
      e.windup = 0; e.cd = e.ancestral ? 2.4 : 3.3; shake = Math.max(shake, e.ancestral ? .25 : .14); frostSfx('stomp');
      burst(e[0], FLOOR - 6, '#bff4ff', 22, 160);
      const speeds = e.ancestral ? [250, 390] : [300];
      speeds.forEach(v => [-1, 1].forEach(dir => enemyShots.push({ x: e[0] + dir * 40, y: FLOOR - 40, vx: dir * v, vy: 0, life: 1.8, kind: 'quake', frost: 1 })));
    }
  }
  if (Math.abs(dx) < reach && hero.y > e[1] - (e.ancestral ? 120 : 85)) damage();
}

function updateMage(e, dt) {
  const anchor = e.anchors[e.anchor || 0];
  e[1] = anchor[1] - 48 + Math.sin(e.t * 2) * 4;
  e[2] = hero.x < e[0] ? -1 : 1;
  e.blink = (e.blink ?? 5) - dt;
  if (e.blink <= 0) {
    burst(e[0], e[1] - 10, '#b46cff', 22, 140);
    e.anchor = ((e.anchor || 0) + 1 + Math.floor(Math.random() * (e.anchors.length - 1))) % e.anchors.length;
    const next = e.anchors[e.anchor]; e[0] = next[0]; e[1] = next[1] - 48; e.blink = 4.5 + Math.random() * 2; e.cast = 0;
    burst(e[0], e[1] - 10, '#b46cff', 22, 140);
    return;
  }
  const dist = Math.hypot(hero.x - e[0], hero.y - e[1]);
  if (e.cast > 0) {
    e.cast -= dt;
    if (e.cast <= 0) {
      const ang = Math.atan2(hero.y - 18 - (e[1] - 30), hero.x - e[0]);
      enemyShots.push({ x: e[0] + e[2] * 20, y: e[1] - 30, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 3.4, kind: 'ice', frost: 1 });
      tone(1200, 600, .18, 'triangle', .025);
    }
  } else if ((e.cd -= dt) <= 0 && dist < 560) { e.cast = .65; e.cd = 2.3; }
}

function updateWisp(e, dt) {
  const dx = hero.x - e[0], dy = hero.y - 20 - e[1];
  if (e.dive > 0) {
    e.dive -= dt; e[0] += e.vx * dt; e[1] += e.vy * dt;
    if (e.dive <= 0) e.ret = 1.2;
  } else if (e.charge > 0) {
    e.charge -= dt;
    if (e.charge <= 0) { const d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 540; e.vy = dy / d * 540; e.dive = .75; tone(1500, 500, .2, 'sine', .025); }
  } else if (e.ret > 0) {
    e.ret -= dt; e[0] += (e.homeX - e[0]) * Math.min(1, 2.2 * dt); e[1] += (e.homeY - e[1]) * Math.min(1, 2.2 * dt);
  } else {
    e[0] += (e.homeX + Math.sin(e.t * 1.3) * 60 - e[0]) * Math.min(1, 3 * dt);
    e[1] = e.homeY + Math.sin(e.t * 3) * 16;
    if ((e.cd -= dt) <= 0 && Math.hypot(dx, dy) < 400) { e.charge = .55; e.cd = 2.6 + Math.random(); }
  }
  e[1] = Math.min(FLOOR - 40, e[1]);
  e[2] = dx < 0 ? -1 : 1;
}

function updateQueen(q, dt) {
  if (!frost.arenaLocked) {
    q[0] = QUEEN_HOME; q[1] = 280 + Math.sin(q.t * 1.2) * 18;
    if (hero.x > FROST_ARENA + 40) {
      frost.arenaLocked = true; bossWarning = 1.5; shake = .25;
      frostMsg(frost.queenIntro ? 'A Rainha do Inverno retorna ao trono!' : 'A RAINHA DO INVERNO DESPERTA!', 3);
      frost.queenIntro = true; q.fan = 1.6; q.drop = 3; q.wave = 3;
    }
    return;
  }
  const phase = q[5] > 40 ? 1 : q[5] > 20 ? 2 : 3;
  if (phase > frost.phase) {
    frost.phase = phase; flash = .2; shake = .3;
    if (phase === 2) {
      frost.cores = [[11255, 345], [11895, 345]].map(([x, y]) => frostFoe('core', x, y, 4));
      frost.cores.forEach(c => { enemies.push(c); burst(c[0], c[1], '#d88bff', 26, 160); });
      frostMsg('FASE 2: a Rainha ergueu uma barreira! Destrua os Cristais de Amago.', 3.2);
    } else {
      [[11250, 200], [11950, 200]].forEach(([x, y]) => { enemies.push(frostFoe('wisp', x, y, 2)); burst(x, y, '#9eeaff', 20, 140); });
      frost.blizzard.cd = 1; frostMsg('FASE 3: NEVASCA ETERNA!', 2.6);
    }
  }
  const barrier = frostBarrierUp(), rage = phase === 3;
  const tx = barrier ? QUEEN_HOME : QUEEN_HOME + Math.sin(q.t * .55) * 300, ty = barrier ? 240 : 290 + Math.sin(q.t * 1.4) * 40;
  q[0] += (tx - q[0]) * Math.min(1, 2.4 * dt); q[1] += (ty - q[1]) * Math.min(1, 2.4 * dt);
  q[2] = hero.x < q[0] ? -1 : 1;
  if ((q.fan -= dt) <= 0) {
    const n = rage ? 5 : 3, base = Math.atan2(hero.y - 18 - (q[1] - 40), hero.x - q[0]);
    for (let i = 0; i < n; i++) { const ang = base + (i - (n - 1) / 2) * .22; enemyShots.push({ x: q[0], y: q[1] - 40, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, life: 4, kind: 'ice', frost: 1 }); }
    q.fan = rage ? 1.6 : barrier ? 2 : 2.5; tone(900, 400, .25, 'triangle', .03);
  }
  if ((q.drop -= dt) <= 0) {
    const xs = rage ? [hero.x - 150, hero.x, hero.x + 150] : [hero.x];
    xs.forEach(x => frost.falling.push({ x: Math.max(FROST_ARENA + 40, Math.min(FROST_END - 40, x)), y: 60, vy: 0, t: .85 }));
    q.drop = rage ? 2.6 : 3.8;
  }
  if (rage && (q.wave -= dt) <= 0) {
    [-1, 1].forEach(dir => enemyShots.push({ x: q[0], y: FLOOR - 40, vx: dir * 330, vy: 0, life: 2.6, kind: 'quake', frost: 1 }));
    q.wave = 3.4; frostSfx('stomp'); shake = Math.max(shake, .15);
  }
  if (Math.hypot(hero.x - q[0], hero.y - (q[1] + 10)) < 62) damage();
}

function updateQueenDefeat() {
  const q = frost.queen;
  if (!q || q[4] || frost.queenDefeated) return;
  frost.queenDefeated = true; frost.arenaLocked = false; frost.falling = [];
  frost.cores.forEach(c => { c[4] = 0; });
  enemyShots = enemyShots.filter(s => !s.frost);
  heartDrops.push([q[0], FLOOR - 40, 1]); score += 1500; flash = .35; shake = .5;
  burst(q[0], q[1], '#9eeaff', 80, 300); burst(q[0], q[1], '#d88bff', 50, 220);
  frostMsg('A RAINHA DO INVERNO CAIU! A Cidadela foi libertada.', 4);
}

function frostUpdate(dt, pre) {
  if (!frost || !started || paused || victory) return;
  updateFrostFoes(dt);
  updateFrostHero(dt, pre);
  updateFrostWorld(dt, pre);
  updateQueenDefeat();
}

// ---------- Desenho ----------

function drawSprite(name, x, bottom, h, face, extra) {
  const img = frostImg(name);
  if (!img) return false;
  const w = img.naturalWidth * h / img.naturalHeight;
  ctx.save(); ctx.translate(x, bottom);
  if (face > 0) ctx.scale(-1, 1);
  if (extra && extra.hit) ctx.filter = 'brightness(2.4)';
  if (extra && extra.alpha !== undefined) ctx.globalAlpha = extra.alpha;
  if (extra && extra.squash) ctx.scale(1 + extra.squash, 1 - extra.squash);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

function drawFrostBackdrop() {
  if (cameraX + W < FROST_START) return;
  const left = FROST_START, right = FROST_END, view = cameraX;
  ctx.save(); ctx.beginPath(); ctx.rect(left, 0, right - left, H); ctx.clip();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#071228'); sky.addColorStop(.55, '#173a5c'); sky.addColorStop(1, '#0a1526');
  ctx.fillStyle = sky; ctx.fillRect(left, 0, right - left, H);
  // Aurora boreal animada.
  for (let band = 0; band < 3; band++) {
    const colors = ['rgba(110,255,190,', 'rgba(125,230,255,', 'rgba(216,139,255,'];
    ctx.beginPath();
    for (let sx = -20; sx <= W + 20; sx += 24) {
      const wx = view + sx, px = view * .3 + sx, y = 120 + band * 34 + Math.sin(px * .004 + time * .7 + band) * 26 + Math.sin(px * .011 - time * .4) * 10;
      sx === -20 ? ctx.moveTo(wx, y) : ctx.lineTo(wx, y);
    }
    ctx.strokeStyle = colors[band] + (.16 + .08 * Math.sin(time * 1.3 + band)) + ')'; ctx.lineWidth = 26 - band * 6; ctx.stroke();
  }
  for (let i = 0; i < 40; i++) { const sx = (i * 131) % W, y = 30 + (i * 67) % 200; ctx.fillStyle = `rgba(230,245,255,${.3 + .3 * Math.sin(time * 2 + i)})`; ctx.fillRect(view + sx, y, 2, 2); }
  // Montanhas distantes (parallax).
  const farShift = view * .45, farOff = farShift % 260, farIdx = Math.floor(farShift / 260);
  for (let i = -1; i < 8; i++) {
    const x = view + i * 260 - farOff, peak = 250 + ((farIdx + i + 30) % 3) * 30;
    ctx.fillStyle = '#16304d'; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + 150, peak); ctx.lineTo(x + 320, FLOOR); ctx.fill();
    ctx.fillStyle = 'rgba(220,240,255,.55)'; ctx.beginPath(); ctx.moveTo(x + 150, peak); ctx.lineTo(x + 118, peak + 46); ctx.lineTo(x + 140, peak + 38); ctx.lineTo(x + 160, peak + 52); ctx.lineTo(x + 184, peak + 44); ctx.fill();
  }
  // Torres da cidadela (camada intermediaria).
  const midShift = view * .75, midOff = midShift % 300, midIdx = Math.floor(midShift / 300);
  for (let i = -1; i < 7; i++) {
    const x = view + i * 300 - midOff + 80, h = 210 + (((midIdx + i + 30) * 37) % 90);
    ctx.fillStyle = '#1d3554'; ctx.fillRect(x, FLOOR - h, 54, h);
    ctx.fillStyle = '#9fd8f0'; ctx.beginPath(); ctx.moveTo(x - 8, FLOOR - h); ctx.lineTo(x + 27, FLOOR - h - 70); ctx.lineTo(x + 62, FLOOR - h); ctx.fill();
    ctx.fillStyle = 'rgba(125,230,255,.55)'; for (let y = FLOOR - h + 30; y < FLOOR - 40; y += 46) ctx.fillRect(x + 22, y, 10, 16);
  }
  // Boca da caverna: transicao da Catedral para a Cidadela.
  const fade = ctx.createLinearGradient(left, 0, left + 220, 0);
  fade.addColorStop(0, 'rgba(8,7,18,1)'); fade.addColorStop(1, 'rgba(8,7,18,0)');
  ctx.fillStyle = fade; ctx.fillRect(left, 0, 220, H);
  if (frost.arenaLocked || hero.x > FROST_ARENA - 400) {
    const pulse = .5 + .5 * Math.sin(time * 2);
    ctx.fillStyle = `rgba(216,139,255,${.05 + pulse * .04})`; ctx.fillRect(FROST_ARENA, 0, FROST_END - FROST_ARENA, H);
    ctx.fillStyle = '#2a4466'; ctx.fillRect(QUEEN_HOME - 90, FLOOR - 120, 180, 120);
    ctx.fillStyle = '#9fd8f0'; ctx.beginPath(); ctx.moveTo(QUEEN_HOME - 110, FLOOR - 120); ctx.lineTo(QUEEN_HOME - 60, FLOOR - 230); ctx.lineTo(QUEEN_HOME, FLOOR - 150); ctx.lineTo(QUEEN_HOME + 60, FLOOR - 230); ctx.lineTo(QUEEN_HOME + 110, FLOOR - 120); ctx.fill();
  }
  ctx.restore();
}

function drawFrostTerrain() {
  if (cameraX + W < FROST_START - 60) return;
  const ground = ctx.createLinearGradient(0, FLOOR, 0, H);
  ground.addColorStop(0, '#5d86ad'); ground.addColorStop(.25, '#2c4a6d'); ground.addColorStop(1, '#101c30');
  ctx.fillStyle = ground; ctx.fillRect(FROST_START, FLOOR, FROST_END - FROST_START, H - FLOOR);
  ctx.fillStyle = '#e8f4ff';
  for (let x = Math.max(FROST_START, cameraX - 40); x < Math.min(FROST_END, cameraX + W + 40); x += 36) { ctx.beginPath(); ctx.ellipse(x - x % 36 + 18, FLOOR + 2, 22, 7, 0, 0, 7); ctx.fill(); }
  platforms.forEach(p => {
    if (p[0] < FROST_START || p[0] >= FROST_END || p[0] > cameraX + W || p[0] + p[2] < cameraX) return;
    const slab = ctx.createLinearGradient(0, p[1], 0, p[1] + p[3]);
    const aurora = p[4] === 'aurora';
    slab.addColorStop(0, aurora ? '#bfffe6' : '#bfe8fa'); slab.addColorStop(1, aurora ? '#6a4fa0' : '#3b6f99');
    ctx.fillStyle = slab; ctx.fillRect(p[0], p[1], p[2], p[3]);
    ctx.fillStyle = '#f2faff'; ctx.fillRect(p[0] - 3, p[1] - 3, p[2] + 6, 6);
    ctx.fillStyle = 'rgba(191,244,255,.85)';
    for (let x = p[0] + 10; x < p[0] + p[2] - 6; x += 22) { ctx.beginPath(); ctx.moveTo(x, p[1] + p[3]); ctx.lineTo(x + 5, p[1] + p[3] + 10 + (x % 3) * 4); ctx.lineTo(x + 10, p[1] + p[3]); ctx.fill(); }
    if (aurora) { ctx.strokeStyle = `rgba(138,255,200,${.4 + .3 * Math.sin(time * 3)})`; ctx.lineWidth = 2; ctx.strokeRect(p[0] - 4, p[1] - 5, p[2] + 8, p[3] + 9); }
  });
  frost.icicles.forEach(c => {
    ctx.fillStyle = '#2c4a6d'; ctx.fillRect(c.x - 46, c.top - 26, 92, 18);
    ctx.fillStyle = '#9fd8f0'; ctx.fillRect(c.x - 46, c.top - 10, 92, 6);
    if (c.state === 3) return;
    const y = c.state === 2 ? c.y - 30 : c.top - 4, wob = c.state === 1 ? Math.sin(time * 60) * 2 : 0;
    ctx.fillStyle = c.state === 1 ? '#ffffff' : '#bff4ff';
    ctx.beginPath(); ctx.moveTo(c.x - 11 + wob, y); ctx.lineTo(c.x + 11 + wob, y); ctx.lineTo(c.x + wob, y + 56); ctx.closePath(); ctx.fill();
  });
  frost.falling.forEach(f => {
    if (f.t > 0) { ctx.strokeStyle = `rgba(255,113,142,${.5 + .4 * Math.sin(time * 20)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, FLOOR - 2, 30 * (1 - f.t / 2), 6, 0, 0, 7); ctx.stroke(); return; }
    ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.moveTo(f.x - 13, f.y - 50); ctx.lineTo(f.x + 13, f.y - 50); ctx.lineTo(f.x, f.y + 8); ctx.closePath(); ctx.fill();
  });
  frost.walls.forEach(w => {
    if (w.hp <= 0) return;
    const dmg = 1 - w.hp / w.max;
    ctx.fillStyle = 'rgba(159,216,240,.78)'; ctx.fillRect(w.x, w.top, w.w, FLOOR - w.top);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(w.x + 6, w.top, 8, FLOOR - w.top);
    ctx.strokeStyle = 'rgba(30,60,90,.75)'; ctx.lineWidth = 2;
    for (let i = 0; i < Math.ceil(dmg * 8); i++) { const y = w.top + 40 + i * 48; ctx.beginPath(); ctx.moveTo(w.x + 4, y); ctx.lineTo(w.x + w.w / 2, y + 16); ctx.lineTo(w.x + w.w - 4, y + 6); ctx.stroke(); }
    text('GELO ESPESSO', w.x + w.w / 2, FLOOR - 190, 11, '#ffffff', 'center');
  });
  frost.braziers.forEach(b => {
    ctx.fillStyle = '#39465c'; ctx.fillRect(b.x - 8, FLOOR - 52, 16, 52);
    ctx.fillStyle = '#56657d'; ctx.beginPath(); ctx.moveTo(b.x - 28, FLOOR - 64); ctx.lineTo(b.x + 28, FLOOR - 64); ctx.lineTo(b.x + 16, FLOOR - 48); ctx.lineTo(b.x - 16, FLOOR - 48); ctx.fill();
    if (b.lit) {
      const f = Math.sin(time * 14 + b.x) * 4;
      ctx.fillStyle = 'rgba(255,170,80,.18)'; ctx.beginPath(); ctx.arc(b.x, FLOOR - 80, 70 + f, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff7b35'; ctx.beginPath(); ctx.moveTo(b.x - 18, FLOOR - 64); ctx.quadraticCurveTo(b.x - 10, FLOOR - 100 - f, b.x, FLOOR - 112 - f); ctx.quadraticCurveTo(b.x + 10, FLOOR - 100 + f, b.x + 18, FLOOR - 64); ctx.fill();
      ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.arc(b.x, FLOOR - 76, 7, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(191,244,255,.6)'; ctx.fillRect(b.x - 18, FLOOR - 70, 36, 6);
      text('BRASEIRO', b.x, FLOOR - 82, 10, '#ffbd62', 'center');
    }
  });
  // Portao gelido entre a Catedral e a Cidadela.
  const sealed = enemies.some(e => e[6] === 7 && e[4]);
  const lift = sealed ? 0 : 300;
  ctx.fillStyle = '#273b58'; ctx.fillRect(FROST_START - 28, 60, 56, 26);
  ctx.strokeStyle = sealed ? '#9fd8f0' : 'rgba(159,216,240,.25)'; ctx.lineWidth = 6;
  for (let i = -18; i <= 18; i += 12) { ctx.beginPath(); ctx.moveTo(FROST_START + i, 86); ctx.lineTo(FROST_START + i, FLOOR - lift); ctx.stroke(); }
  if (sealed) text('SELADO', FROST_START, 320, 12, '#bff4ff', 'center');
  if (frost.arenaLocked) {
    ctx.fillStyle = 'rgba(216,139,255,.25)'; ctx.fillRect(FROST_ARENA - 6, 0, 24, FLOOR);
    ctx.strokeStyle = '#d88bff'; ctx.lineWidth = 5;
    for (let y = 40; y < FLOOR; y += 50) { ctx.beginPath(); ctx.moveTo(FROST_ARENA - 6, y); ctx.lineTo(FROST_ARENA + 18, y + 25); ctx.stroke(); }
  }
}

function drawFrostFoes() {
  enemies.forEach(e => {
    if (!e[4]) return;
    if (e.frozen > 0) {
      const r = e.frost ? 40 : isBoss(e) ? 60 : 30;
      ctx.fillStyle = 'rgba(191,244,255,.38)'; ctx.fillRect(e[0] - r, e[1] - r - 10, r * 2, r * 2 + 20);
      ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 2; ctx.strokeRect(e[0] - r, e[1] - r - 10, r * 2, r * 2 + 20);
    }
    if (!e.frost) return;
    const hit = e.hitFx > 0;
    if (e.frost === 'golem') {
      const squash = e.windup ? .06 * Math.sin((.6 - e.windup) * 10) : 0;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(e[0], e.base, e.ancestral ? 70 : 46, 9, 0, 0, 7); ctx.fill();
      if (!drawSprite('frost-golem', e[0], e.base, e.h, e[2], { hit, squash })) { ctx.fillStyle = '#5d86ad'; ctx.fillRect(e[0] - 40, e.base - e.h, 80, e.h); }
      if (e.windup) { ctx.strokeStyle = 'rgba(255,113,142,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e[0], e.base - e.h - 14, 10, 0, 7); ctx.stroke(); text('!', e[0], e.base - e.h - 8, 16, '#ff718e', 'center'); }
      if (e.ancestral && Math.abs(hero.x - e[0]) < 600) drawFoeBar(e, 'GOLEM ANCESTRAL', '#9eeaff');
    } else if (e.frost === 'mage') {
      if (e.cast > 0) { ctx.fillStyle = `rgba(158,234,255,${.3 + .3 * Math.sin(time * 30)})`; ctx.beginPath(); ctx.arc(e[0] + e[2] * 20, e[1] - 30, 18 * (1 - e.cast / .65) + 6, 0, 7); ctx.fill(); }
      if (!drawSprite('ice-mage', e[0], e[1] + 48, 100, e[2], { hit })) { ctx.fillStyle = '#4d2867'; ctx.fillRect(e[0] - 20, e[1] - 50, 40, 98); }
    } else if (e.frost === 'wisp') {
      if (e.charge > 0) { ctx.strokeStyle = `rgba(255,113,142,${.6 + .4 * Math.sin(time * 40)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e[0], e[1], 30, 0, 7); ctx.stroke(); }
      if (!drawSprite('crystal-wisp', e[0], e[1] + 28, 58, e[2], { hit })) { ctx.fillStyle = '#9eeaff'; ctx.beginPath(); ctx.arc(e[0], e[1], 16, 0, 7); ctx.fill(); }
    } else if (e.frost === 'core') {
      const s = 22 + Math.sin(time * 6) * 3;
      ctx.fillStyle = 'rgba(216,139,255,.22)'; ctx.beginPath(); ctx.arc(e[0], e[1], s + 16, 0, 7); ctx.fill();
      ctx.fillStyle = hit ? '#ffffff' : '#d88bff'; ctx.beginPath(); ctx.moveTo(e[0], e[1] - s); ctx.lineTo(e[0] + s * .6, e[1]); ctx.lineTo(e[0], e[1] + s); ctx.lineTo(e[0] - s * .6, e[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(216,139,255,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(frost.queen[0], frost.queen[1] - 40); ctx.stroke(); ctx.setLineDash([]);
    } else if (e.frost === 'queen') {
      const barrier = frostBarrierUp();
      ctx.fillStyle = 'rgba(158,234,255,.12)'; ctx.beginPath(); ctx.arc(e[0], e[1] - 30, 120, 0, 7); ctx.fill();
      if (!drawSprite('frost-queen', e[0], e[1] + 80, 210, e[2], { hit })) { ctx.fillStyle = '#9fd8f0'; ctx.fillRect(e[0] - 40, e[1] - 120, 80, 200); }
      if (barrier) { ctx.strokeStyle = `rgba(216,139,255,${.5 + .3 * Math.sin(time * 5)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e[0], e[1] - 30, 112 + Math.sin(time * 4) * 6, 0, 7); ctx.stroke(); }
    }
  });
  if (frost.wingsDrop) {
    const d = frost.wingsDrop, y = d.y - 20 + Math.sin(time * 3) * 6;
    ctx.fillStyle = 'rgba(138,255,200,.18)'; ctx.beginPath(); ctx.arc(d.x, y, 44 + Math.sin(time * 4) * 4, 0, 7); ctx.fill();
    drawSprite('aurora-wings', d.x, y + 26, 52, -1);
    text('ASAS DA AURORA', d.x, y + 50, 11, '#8affc8', 'center');
  }
  const chest = frost.amuletChest;
  if (!chest.open) {
    const x = chest.x, y = chest.y, glow = .5 + .5 * Math.sin(time * 3);
    ctx.fillStyle = `rgba(240,196,93,${.12 + glow * .1})`; ctx.beginPath(); ctx.arc(x, y - 22, 38, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4fa0'; ctx.fillRect(x - 22, y - 30, 44, 30); ctx.fillStyle = '#f0c45d'; ctx.fillRect(x - 24, y - 34, 48, 8); ctx.fillRect(x - 4, y - 24, 8, 10);
  }
  if (frost.wings && !floor() && (frost.gliding || hero.jumps >= 2)) {
    const flap = frost.gliding ? 1 + Math.sin(time * 6) * .08 : 1 + Math.sin(time * 18) * .2;
    ctx.save(); ctx.translate(hero.x, hero.y - 24); ctx.scale(1.4 * flap, 1.1); ctx.globalAlpha = .9;
    drawSprite('aurora-wings', 0, 22, 44, -1); ctx.restore();
  }
  if (frost.chill > 0) { ctx.strokeStyle = `rgba(191,244,255,${.4 + .3 * Math.sin(time * 10)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hero.x, hero.y - 10, 44, 0, 7); ctx.stroke(); }
}

function drawFoeBar(e, name, color) {
  const w = e.ancestral ? 150 : 90, y = e.base - e.h - 30;
  ctx.fillStyle = 'rgba(7,10,20,.85)'; ctx.fillRect(e[0] - w / 2 - 2, y - 2, w + 4, 10);
  ctx.fillStyle = color; ctx.fillRect(e[0] - w / 2, y, w * Math.max(0, e[5] / e.maxHp), 6);
  text(name, e[0], y - 8, 12, color, 'center');
}

function drawFrostShot(s) {
  ctx.save();
  if (s.kind === 'ice') {
    ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy || 0, s.vx));
    ctx.shadowBlur = 14; ctx.shadowColor = '#9eeaff'; ctx.fillStyle = '#bff4ff';
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-4, 6); ctx.lineTo(-14, 0); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -1.5, 9, 3);
  } else if (s.kind === 'quake') {
    const dir = Math.sign(s.vx) || 1;
    ctx.fillStyle = 'rgba(191,244,255,.9)'; ctx.shadowBlur = 12; ctx.shadowColor = '#9eeaff';
    for (let i = 0; i < 3; i++) { const x = s.x - dir * i * 16, h = 34 - i * 9; ctx.beginPath(); ctx.moveTo(x - 9, FLOOR); ctx.lineTo(x, FLOOR - h); ctx.lineTo(x + 9, FLOOR); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

function drawGlacialPickup(item) {
  const y = item[1] - 18 + Math.sin(time * 3) * 4;
  ctx.fillStyle = 'rgba(158,234,255,.2)'; ctx.beginPath(); ctx.arc(item[0], y, 30 + Math.sin(time * 4) * 3, 0, 7); ctx.fill();
  if (!drawSprite('glacial-blade', item[0], y + 26, 52, -1)) { ctx.strokeStyle = '#9eeaff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(item[0] - 10, y + 16); ctx.lineTo(item[0] + 12, y - 22); ctx.stroke(); }
  text('LAMINA GLACIAL', item[0], item[1] + 28, 12, '#9eeaff', 'center');
}

function drawFrostAtmosphere() {
  if (cameraX + W < FROST_START || cameraX > FROST_END) return;
  const b = frost.blizzard, startSx = Math.max(0, FROST_START - cameraX), endSx = Math.min(W, FROST_END - cameraX);
  const storm = b.t > 0 ? 1 : b.warn > 0 ? .4 : 0, alt = frost.snowAlt;
  ctx.save(); ctx.beginPath(); ctx.rect(startSx, 0, endSx - startSx, H); ctx.clip();
  // No chao a neve fica no nivel base; nas alturas ela engrossa, cai mais rapido e ganha vento.
  const flakes = 70 + storm * 60 + Math.round(alt * 150), fall = 1 + alt * 1.3;
  for (let i = 0; i < flakes; i++) {
    const drift = storm ? b.dir * time * 380 : Math.sin(time * .5 + i) * 30 - alt * time * 120;
    const sx = ((i * 137.5 + drift + time * 14) % W + W) % W, sy = (i * 91 + time * (36 + (i % 5) * 14) * fall) % H;
    const size = 2 + (i % 2) + (alt > .5 && i % 4 === 0 ? 1.5 : 0);
    ctx.fillStyle = `rgba(240,248,255,${.35 + (i % 3) * .2})`; ctx.fillRect(sx, sy, size, size);
  }
  if (alt > .05) {
    ctx.fillStyle = `rgba(225,240,255,${.09 * alt})`; ctx.fillRect(startSx, 0, endSx - startSx, H);
    ctx.strokeStyle = `rgba(240,248,255,${.22 * alt})`; ctx.lineWidth = 1.2;
    for (let i = 0; i < Math.round(alt * 18); i++) { const sx = ((i * 263 - time * 520) % W + W) % W, sy = (i * 71 + time * 90) % H; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 46, sy - 10); ctx.stroke(); }
  }
  if (storm) {
    ctx.fillStyle = `rgba(220,238,255,${.08 * storm + .04 * Math.sin(time * 8)})`; ctx.fillRect(startSx, 0, endSx - startSx, H);
    ctx.strokeStyle = `rgba(240,248,255,${.25 * storm})`; ctx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) { const sx = ((i * 211 + time * b.dir * 900) % W + W) % W, sy = (i * 47) % H; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - b.dir * 60, sy - 8); ctx.stroke(); }
  }
  ctx.restore();
  if (frost.chill > 0) {
    const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .85);
    v.addColorStop(0, 'rgba(158,234,255,0)'); v.addColorStop(1, `rgba(158,234,255,${.22 * Math.min(1, frost.chill)})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
}

function drawFrostUI() {
  if (!started || victory) return;
  if (hero.x < FROST_END - 200 && (hero.x > FROST_START - 300 || frost.wings || frost.amulet)) {
    const chips = [
      [frost.wings ? 'ASAS ✓' : 'ASAS —', frost.wings ? '#8affc8' : '#5d6b80'],
      [frost.amulet ? 'AMULETO +1' : 'AMULETO ?', frost.amulet ? '#f0c45d' : '#5d6b80'],
      [`BRASEIROS ${frost.flames}/3`, frost.flames === 3 ? '#ffbd62' : '#c9a27a']
    ];
    let x = 28;
    chips.forEach(([label, color]) => { ctx.font = '12px system-ui,sans-serif'; const w = ctx.measureText(label).width + 18; ctx.fillStyle = 'rgba(8,12,24,.82)'; ctx.fillRect(x, 128, w, 22); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + .5, 128.5, w - 1, 21); text(label, x + 9, 143, 12, color); x += w + 6; });
    if (frost.chill > 0) text('❄ CONGELADO', x + 6, 143, 13, '#bff4ff');
  }
  const q = frost.queen;
  if (q && q[4] && frost.arenaLocked) {
    const w = 460, x = 576 - w / 2, y = 158, barrier = frostBarrierUp();
    ctx.fillStyle = 'rgba(7,10,20,.9)'; ctx.fillRect(x - 4, y - 4, w + 8, 18);
    ctx.fillStyle = barrier ? '#d88bff' : '#9eeaff'; ctx.fillRect(x, y, w * Math.max(0, q[5] / QUEEN_HP), 10);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; [40, 20].forEach(t => ctx.fillRect(x + w * t / QUEEN_HP - 1, y - 3, 2, 16));
    text(`RAINHA DO INVERNO  •  FASE ${frost.phase}${barrier ? '  •  BARREIRA' : ''}`, 576, y - 10, 15, barrier ? '#d88bff' : '#9eeaff', 'center');
  }
  if (frost.blizzard.t > 0) text('❄ NEVASCA ❄', 576, 590, 16, '#e8f6ff', 'center');
}

// ---------- Integracao com o jogo existente ----------

const baseLoadLevel = loadLevel;
loadLevel = function () { baseLoadLevel(); frostReset(); };
const baseUpdate = update;
update = function (dt) { const pre = frost ? frostPreUpdate() : null; baseUpdate(dt); if (pre) frostUpdate(dt, pre); };
const baseDrawBossArena = drawBossArena;
drawBossArena = function () { if (frost) drawFrostBackdrop(); baseDrawBossArena(); };
const baseDrawWorldExtras = drawWorldExtras;
drawWorldExtras = function () { if (frost) drawFrostTerrain(); baseDrawWorldExtras(); };
const baseDrawEnemyPremium = drawEnemyPremium;
drawEnemyPremium = function () { baseDrawEnemyPremium(); if (frost) drawFrostFoes(); };
const baseDrawAtmosphere = drawAtmosphere;
drawAtmosphere = function () { baseDrawAtmosphere(); if (frost) drawFrostAtmosphere(); };
const baseDrawUI = drawUI;
drawUI = function () { baseDrawUI(); if (frost) drawFrostUI(); };

frostReset();
lastEnemyCount = enemies.filter(e => e[4]).length;

// Botoes de toque para trocar arma e usar habilidades (antes so existiam no teclado).
[['⇄ ARMA', 'KeyQ'], ['✧ ASTRAL', 'KeyI'], ['✦ VAZIO', 'KeyK']].forEach(([label, code]) => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'touch-only'; button.textContent = label;
  button.addEventListener('click', () => {
    unlockAudio();
    dispatchEvent(new KeyboardEvent('keydown', { code }));
    dispatchEvent(new KeyboardEvent('keyup', { code }));
  });
  document.querySelector('.utility')?.prepend(button);
});
document.querySelector('.help')?.insertAdjacentText('beforeend', '  |  Asas da Aurora: segure PULO para planar');
