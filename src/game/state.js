export const gameState = {
  hero: {
    x: 200,
    y: 300,
    hp: 100,
    maxHp: 100,
    attack: 10,
    attackSpeed: 1, // attacks per second
    attackCooldown: 0,
  },
  enemies: [],
  arrows: [],
  gold: 0,
  wave: 1,
  waveEnemiesToSpawn: 0,
  waveEnemiesSpawned: 0,
  enemySpawnTimer: 0,
};