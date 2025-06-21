import { gameState } from './state.js';

// Mob types for direction logic
export const orcTypes = ['orc1', 'orc2', 'orc3'];
export const slimeTypes = ['slime1', 'slime2', 'slime3'];
export const mobTypes = [...orcTypes, ...slimeTypes];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getMobGoldReward() {
  return 10 + (gameState.wave - 1) * 2;
}

// Handles spawning a new wave
export function spawnWave(wave) {
  gameState.waveEnemiesToSpawn = 5 + wave;
  gameState.waveEnemiesSpawned = 0;
  gameState.enemySpawnTimer = 0;
}

// Handles spawning enemies over time
function handleWaveSpawning(dt) {
  if (
    typeof gameState.waveEnemiesToSpawn === 'number' &&
    gameState.waveEnemiesSpawned < gameState.waveEnemiesToSpawn
  ) {
    gameState.enemySpawnTimer -= dt;
    if (gameState.enemySpawnTimer <= 0) {
      // Boss wave logic
      if (gameState.wave % 10 === 0 && !gameState.enemies.some(e => e.type === 'boss')) {
        // Spawn boss
        gameState.enemies.push({
          type: 'boss',
          x: 200, y: 0,
          hp: 1200 + gameState.wave * 120,
          maxHp: 1200 + gameState.wave * 120,
          attack: 60 + gameState.wave * 6,
          speed: 18 + gameState.wave,
          anim: 'walk',
          animFrame: 0,
          animTimer: 0,
          animPlaying: false,
          attackCooldown: 0,
          direction: 0,
          title: "Boss Orc",
          level: gameState.wave
        });
        gameState.waveEnemiesSpawned++;
      } else if (typeof window.spawnEnemy === "function") {
        window.spawnEnemy();
        gameState.waveEnemiesSpawned++;
      }
      gameState.enemySpawnTimer = 0.7;
    }
  }
}

export function updateGame(dt) {
  handleWaveSpawning(dt);

  // --- Hero burn effect from slime3 ---
  if (gameState.hero.burn && gameState.hero.burn.time > 0) {
    gameState.hero.burn.time -= dt;
    if (!gameState.hero.burn.tick) gameState.hero.burn.tick = 0;
    gameState.hero.burn.tick += dt;
    if (gameState.hero.burn.tick >= 1) {
      gameState.hero.hp -= gameState.hero.burn.dps;
      if (window.showFloatingDamage) window.showFloatingDamage(gameState.hero.x, gameState.hero.y, "-" + gameState.hero.burn.dps);
      gameState.hero.burn.tick = 0;
    }
    if (gameState.hero.burn.time <= 0) {
      delete gameState.hero.burn;
    }
  }

  for (const enemy of gameState.enemies) {
    const dx = gameState.hero.x - enemy.x;
    const dy = gameState.hero.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    // --- Direction for orcs and slimes (for 4-row spritesheets) ---
    if (
      orcTypes.includes(enemy.type) ||
      slimeTypes.includes(enemy.type)
    ) {
      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.direction = dx > 0 ? 3 : 2;
      } else {
        enemy.direction = dy > 0 ? 0 : 1;
      }
    }

    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

    // Burning effect (flame arrows)
    if (enemy.burn && enemy.burn.time > 0) {
      enemy.burn.time -= dt;
      if (!enemy.burn.tick) enemy.burn.tick = 0;
      enemy.burn.tick += dt;
      if (enemy.burn.tick >= 1) {
        enemy.hp -= enemy.burn.dps;
        if (window.showFloatingDamage) window.showFloatingDamage(enemy.x, enemy.y, "-" + enemy.burn.dps);
        enemy.burn.tick = 0;
        // Play hurt animation if not dying or attacking (don't interrupt attack)
        if (
          enemy.hp > 0 &&
          enemy.anim !== 'death' &&
          enemy.anim !== 'attack'
        ) {
          enemy.anim = 'hurt';
          enemy.animFrame = 0;
          enemy.animTimer = 0;
          enemy.animPlaying = true;
        }
      }
    }

    // --- Animation handling ---
    if (enemy.anim === 'hurt' && enemy.animPlaying) {
      enemy.animTimer += dt;
      const frameDuration = 0.10;
      let hurtFrames = 6;
      if (enemy.animTimer >= frameDuration) {
        enemy.animFrame++;
        enemy.animTimer = 0;
        if (enemy.animFrame >= hurtFrames) {
          enemy.animPlaying = false;
          // After hurt, if in attack range and can attack, attack
          if (
            dist <= 5 &&
            enemy.attackCooldown <= 0 &&
            enemy.anim !== 'death'
          ) {
            enemy.anim = 'attack';
            enemy.animFrame = 0;
            enemy.animTimer = 0;
            enemy.animPlaying = true;
            enemy.attackCooldown = 1;
            gameState.hero.hp -= enemy.attack;
            if (enemy.type === 'slime3') {
              if (!gameState.hero.burn) gameState.hero.burn = { time: 3, dps: 5 };
              else gameState.hero.burn.time = 3;
            }
            if (window.saveProgress) window.saveProgress();
          } else {
            enemy.anim = 'walk';
            enemy.animFrame = 0;
          }
        }
      }
      if (enemy.type !== 'boss') continue;
    } else if (enemy.anim === 'attack' && enemy.animPlaying) {
      enemy.animTimer += dt;
      const frameDuration = 0.10;
      let attackFrames = 8;
      if (enemy.animTimer >= frameDuration) {
        enemy.animFrame++;
        enemy.animTimer = 0;
        if (enemy.animFrame >= attackFrames) {
          enemy.animPlaying = false;
          enemy.anim = 'walk';
          enemy.animFrame = 0;
        }
      }
      if (enemy.type !== 'boss') continue;
    } else if (enemy.anim === 'death' && enemy.animPlaying) {
      enemy.animTimer += dt;
      const frameDuration = 0.10;
      let deathFrames = 8;
      if (enemy.animTimer >= frameDuration) {
        enemy.animFrame++;
        enemy.animTimer = 0;
        if (enemy.animFrame >= deathFrames) {
          enemy.animPlaying = false;
        }
      }
      continue;
    }

    // --- Movement and attack logic ---
    if (dist > 5) {
      if (!(enemy.anim === 'attack' && enemy.animPlaying)) {
        enemy.x += (dx / dist) * enemy.speed * dt;
        enemy.y += (dy / dist) * enemy.speed * dt;
        if (enemy.anim !== 'walk') {
          enemy.anim = 'walk';
          enemy.animFrame = 0;
          enemy.animTimer = 0;
          enemy.animPlaying = true;
        }
      }
    } else {
      if (
        enemy.attackCooldown <= 0 &&
        enemy.anim !== 'death' &&
        !(enemy.anim === 'attack' && enemy.animPlaying)
      ) {
        enemy.anim = 'attack';
        enemy.animFrame = 0;
        enemy.animTimer = 0;
        enemy.animPlaying = true;
        enemy.attackCooldown = 1;
        gameState.hero.hp -= enemy.attack;
        if (enemy.type === 'slime3') {
          if (!gameState.hero.burn) gameState.hero.burn = { time: 3, dps: 5 };
          else gameState.hero.burn.time = 3;
        }
        if (window.saveProgress) window.saveProgress();
      }
    }
  }

  // Only remove enemies after death animation is finished
  gameState.enemies = gameState.enemies.filter(e => !(e.anim === 'death' && !e.animPlaying));

  // --- Hero attack logic ---
  gameState.hero.attackCooldown -= dt;
  if (gameState.hero.attackCooldown <= 0) {
    let minDist = Infinity;
    let target = null;
    for (const enemy of gameState.enemies) {
      const d = distance(enemy, gameState.hero);
      if (d < minDist) {
        minDist = d;
        target = enemy;
      }
    }
    if (target) {
      if (minDist > 60 && minDist < 300) {
        if (window.queueHeroAnimation) window.queueHeroAnimation('attack3');
        gameState.arrows.push({
          x: gameState.hero.x,
          y: gameState.hero.y,
          targetX: target.x,
          targetY: target.y,
          vx: (target.x - gameState.hero.x) / minDist * 400,
          vy: (target.y - gameState.hero.y) / minDist * 400,
          damage: gameState.hero.attack,
          hit: false,
          flame: window.flameArrowsActive > 0
        });
        gameState.hero.attackCooldown = 1 / gameState.hero.attackSpeed;
      } else if (minDist <= 60) {
        target.hp -= gameState.hero.attack;
        // Give gold for boss hit (melee)
        if (target.type === 'boss') {
          const bossHitGold = 5;
          gameState.gold += bossHitGold;
          if (window.showFloatingGold) window.showFloatingGold(target.x, target.y, "+" + bossHitGold);
          if (window.saveProgress) window.saveProgress();
        }
        if (window.showFloatingDamage) window.showFloatingDamage(target.x, target.y, "-" + gameState.hero.attack);
        if (target.hp > 0) {
          if (target.anim !== 'death' && target.anim !== 'attack') {
            target.anim = 'hurt';
            target.animFrame = 0;
            target.animTimer = 0;
            target.animPlaying = true;
          }
        } else if (target.anim !== 'death') {
          target.anim = 'death';
          target.animFrame = 0;
          target.animTimer = 0;
          target.animPlaying = true;
          const goldReward = getMobGoldReward();
          gameState.gold += goldReward;
          if (window.showFloatingGold) window.showFloatingGold(target.x, target.y, "+" + goldReward);
          if (window.saveProgress) window.saveProgress();
        }
        if (window.queueHeroAnimation) {
          const attackAnim = 'attack' + (Math.floor(Math.random() * 2) + 1);
          window.queueHeroAnimation(attackAnim);
        }
        gameState.hero.attackCooldown = 1 / gameState.hero.attackSpeed;
      }
      if (window.saveProgress) window.saveProgress();
    }
  }

  // --- Arrow logic ---
  for (const arrow of gameState.arrows) {
    if (arrow.hit) continue;
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    for (const enemy of gameState.enemies) {
      if (!arrow.hit && distance(arrow, enemy) < 30 && enemy.anim !== 'death') {
        enemy.hp -= arrow.damage;
        // Give gold for boss hit (ranged)
        if (enemy.type === 'boss') {
          const bossHitGold = 5;
          gameState.gold += bossHitGold;
          if (window.showFloatingGold) window.showFloatingGold(enemy.x, enemy.y, "+" + bossHitGold);
          if (window.saveProgress) window.saveProgress();
        }
        if (window.showFloatingDamage) window.showFloatingDamage(enemy.x, enemy.y, "-" + arrow.damage);
        if (arrow.flame && enemy.type !== 'slime2') {
          enemy.burn = { time: 3, dps: 5 };
        }
        arrow.hit = true;
        if (enemy.hp > 0) {
          if (enemy.anim !== 'death' && enemy.anim !== 'attack') {
            enemy.anim = 'hurt';
            enemy.animFrame = 0;
            enemy.animTimer = 0;
            enemy.animPlaying = true;
          }
        } else if (enemy.anim !== 'death') {
          enemy.anim = 'death';
          enemy.animFrame = 0;
          enemy.animTimer = 0;
          enemy.animPlaying = true;
          const goldReward = getMobGoldReward();
          gameState.gold += goldReward;
          if (window.showFloatingGold) window.showFloatingGold(enemy.x, enemy.y, "+" + goldReward);
          if (window.saveProgress) window.saveProgress();
        }
      }
    }
    if (
      arrow.x < 0 || arrow.x > 400 ||
      arrow.y < 0 || arrow.y > 400
    ) {
      arrow.hit = true;
    }
  }
  gameState.arrows = gameState.arrows.filter(a => !a.hit);

  if (
    gameState.enemies.length === 0 &&
    typeof gameState.waveEnemiesToSpawn === 'number' &&
    gameState.waveEnemiesSpawned === gameState.waveEnemiesToSpawn &&
    gameState.hero.hp > 0
  ) {
    gameState.wave += 1;
    if (window.saveProgress) window.saveProgress();
    if (window.showWavePopup) window.showWavePopup(gameState.wave);
    spawnWave(gameState.wave);
  }
}