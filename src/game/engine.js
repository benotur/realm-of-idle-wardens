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
    const target = gameState.enemies.find(e => distance(e, gameState.hero) < 40);
    if (target) {
      target.hp -= gameState.hero.attack;
      if (target.hp <= 0) {
        gameState.gold += 10;
        if (window.showFloatingGold) {
          window.showFloatingGold(target.x, target.y, "+10");
        }
      }
      // --- Trigger hero attack animation ---
      if (window.queueHeroAnimation) {
        const attackAnim = 'attack' + (Math.floor(Math.random() * 3) + 1); // attack1, attack2, or attack3
        window.queueHeroAnimation(attackAnim);
      }
      gameState.hero.attackCooldown = 1 / gameState.hero.attackSpeed;
    }
  }

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