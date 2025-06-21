import { gameState } from './state.js';

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

  // Move enemies
  for (const enemy of gameState.enemies) {
    const dx = gameState.hero.x - enemy.x;
    const dy = gameState.hero.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
    } else {
      // Enemy attacks hero
      gameState.hero.hp -= enemy.attack * dt;
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}