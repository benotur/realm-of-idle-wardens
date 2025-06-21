export const gameState = {
  hero: {
    x: 200,
    y: 200,
    hp: 100,
    maxHp: 100,
    attack: 10,
    attackSpeed: 1,
    attackCooldown: 0,
  },
  enemies: [],
  arrows: [],
  gold: 0,
  wave: 1,
  waveEnemiesToSpawn: 0,
  waveEnemiesSpawned: 0,
  enemySpawnTimer: 0,
  upgradeLevels: {
    damage: 0,
    hp: 0,
    attackSpeed: 0,
  }
};