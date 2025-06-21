export const gameState = {
  gold: 0,
  wave: 1,
  hero: {
    x: 200,
    y: 200,
    hp: 100,
    maxHp: 100,
    attack: 10,
    attackSpeed: 1, // attacks per second
    attackCooldown: 0,
  },
  enemies: [],
  enemySpawnCooldown: 0,
};