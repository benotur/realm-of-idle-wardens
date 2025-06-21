import { gameState } from './state.js';

// --- Helper for distance ---
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = 0; y = Math.random() * 400; }
  if (edge === 1) { x = 400; y = Math.random() * 400; }
  if (edge === 2) { x = Math.random() * 400; y = 0; }
  if (edge === 3) { x = Math.random() * 400; y = 400; }
  gameState.enemies.push({
    x,
    y,
    hp: 20 + gameState.wave * 5,
    maxHp: 20 + gameState.wave * 5,
    attack: 5,
    speed: 30 + gameState.wave * 2,
    anim: 'walk',
    animFrame: 0,
    animTimer: 0,
    animPlaying: false,
    attackCooldown: 0,
  });
}

// Start a new wave: set up how many enemies to spawn and reset counters
export function spawnWave(wave) {
  gameState.waveEnemiesToSpawn = 5 + wave;
  gameState.waveEnemiesSpawned = 0;
  gameState.enemySpawnTimer = 0;
}

// Call this every frame in updateGame to handle enemy spawning
function handleWaveSpawning(dt) {
  if (
    typeof gameState.waveEnemiesToSpawn === 'number' &&
    gameState.waveEnemiesSpawned < gameState.waveEnemiesToSpawn
  ) {
    gameState.enemySpawnTimer -= dt;
    if (gameState.enemySpawnTimer <= 0) {
      spawnEnemy();
      gameState.waveEnemiesSpawned++;
      gameState.enemySpawnTimer = 0.7; // seconds between spawns, adjust as needed
    }
  }
}

export function updateGame(dt) {
  handleWaveSpawning(dt);

  // Move enemies and handle enemy attack animation
  for (const enemy of gameState.enemies) {
    const dx = gameState.hero.x - enemy.x;
    const dy = gameState.hero.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    // Enemy attack logic
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

    // --- Enemy Animation Update ---
    if (enemy.anim === 'attack' && enemy.animPlaying) {
      enemy.animTimer += dt;
      const frameDuration = 0.10; // seconds per frame
      if (enemy.animTimer >= frameDuration) {
        enemy.animFrame++;
        enemy.animTimer = 0;
        // 6 is the number of attack frames for orc, adjust if needed
        if (enemy.animFrame >= 6) {
          enemy.animFrame = 0;
          enemy.animPlaying = false;
          enemy.anim = 'walk';
        }
      }
    }

    if (dist > 5) {
      // Move enemy
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
      if (enemy.anim !== 'walk') {
        enemy.anim = 'walk';
        enemy.animFrame = 0;
        enemy.animTimer = 0;
        enemy.animPlaying = true;
      }
    } else {
      // Enemy is close enough to attack
      if (enemy.attackCooldown <= 0) {
        enemy.anim = 'attack';
        enemy.animFrame = 0;
        enemy.animTimer = 0;
        enemy.animPlaying = true;
        enemy.attackCooldown = 1; // 1 second between attacks
        gameState.hero.hp -= enemy.attack;
      }
    }
  }

  // Remove dead enemies
  gameState.enemies = gameState.enemies.filter(e => e.hp > 0);

  // Hero attacks nearest enemy
  gameState.hero.attackCooldown -= dt;
  if (gameState.hero.attackCooldown <= 0) {
    // Find closest enemy
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
      if (minDist > 120 && minDist < 300) {
        // Ranged attack (bow)
        if (window.queueHeroAnimation) window.queueHeroAnimation('attack3');
        // Spawn arrow projectile
        gameState.arrows.push({
          x: gameState.hero.x,
          y: gameState.hero.y,
          targetX: target.x,
          targetY: target.y,
          vx: (target.x - gameState.hero.x) / minDist * 400,
          vy: (target.y - gameState.hero.y) / minDist * 400,
          damage: gameState.hero.attack,
          hit: false,
        });
        gameState.hero.attackCooldown = 1 / gameState.hero.attackSpeed;
      } else if (minDist <= 120) {
        // Melee attack (sword)
        target.hp -= gameState.hero.attack;
        if (target.hp <= 0) {
          gameState.gold += 10;
          if (window.showFloatingGold) window.showFloatingGold(target.x, target.y, "+10");
        }
        if (window.queueHeroAnimation) {
          const attackAnim = 'attack' + (Math.floor(Math.random() * 2) + 1); // attack1 or attack2
          window.queueHeroAnimation(attackAnim);
        }
        gameState.hero.attackCooldown = 1 / gameState.hero.attackSpeed;
      }
    }
  }

  // Arrow projectile logic
  for (const arrow of gameState.arrows) {
    if (arrow.hit) continue;
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    // Check collision with enemies
    for (const enemy of gameState.enemies) {
      if (!arrow.hit && distance(arrow, enemy) < 30) {
        enemy.hp -= arrow.damage;
        arrow.hit = true;
        if (enemy.hp <= 0) {
          gameState.gold += 10;
          if (window.showFloatingGold) window.showFloatingGold(enemy.x, enemy.y, "+10");
        }
      }
    }
    // Remove arrow if out of bounds
    if (
      arrow.x < 0 || arrow.x > 400 ||
      arrow.y < 0 || arrow.y > 400
    ) {
      arrow.hit = true;
    }
  }
  // Remove hit arrows
  gameState.arrows = gameState.arrows.filter(a => !a.hit);

  // If all enemies are dead and all have spawned, advance to next wave
  if (
    gameState.enemies.length === 0 &&
    typeof gameState.waveEnemiesToSpawn === 'number' &&
    gameState.waveEnemiesSpawned === gameState.waveEnemiesToSpawn &&
    gameState.hero.hp > 0
  ) {
    gameState.wave += 1;
    spawnWave(gameState.wave);
  }
}