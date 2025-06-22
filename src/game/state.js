export const gameState = {
  hero: {
    x: 200,
    y: 200,
    hp: 100,
    maxHp: 100,
    attack: 10,
    attackSpeed: 1,
    attackCooldown: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    skillPoints: 0
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

// --- Skill Tree Data ---
export const skillTree = [
  {
    id: "damage1",
    name: "Sharpened Arrows",
    desc: "+5 Damage",
    cost: 1,
    maxLevel: 1,
    requires: [],
    apply: (gs) => { gs.hero.attack += 5; }
  },
  {
    id: "hp1",
    name: "Sturdy Constitution",
    desc: "+20 Max HP",
    cost: 1,
    maxLevel: 1,
    requires: [],
    apply: (gs) => { gs.hero.maxHp += 20; gs.hero.hp += 20; }
  },
  {
    id: "atkspd1",
    name: "Quick Draw",
    desc: "+0.15 Attack Speed",
    cost: 1,
    maxLevel: 1,
    requires: [],
    apply: (gs) => { gs.hero.attackSpeed += 0.15; }
  },
  {
    id: "flameUpgrade",
    name: "Empowered Flame Arrows",
    desc: "Flame Arrows burn for +3s",
    cost: 2,
    maxLevel: 1,
    requires: ["damage1"],
    apply: (gs) => { gs.hero.flameArrowsBonus = true; }
  },
  {
    id: "healUpgrade",
    name: "Blessed Heal",
    desc: "Heal restores 75% HP",
    cost: 2,
    maxLevel: 1,
    requires: ["hp1"],
    apply: (gs) => { gs.hero.healBonus = true; }
  },
  {
    id: "rootUpgrade",
    name: "Entangling Roots",
    desc: "Roots last +1s",
    cost: 2,
    maxLevel: 1,
    requires: ["atkspd1"],
    apply: (gs) => { gs.hero.rootBonus = true; }
  },
  {
    id: "crit1",
    name: "Critical Training",
    desc: "+10% Crit Chance",
    cost: 2,
    maxLevel: 1,
    requires: ["damage1"],
    apply: (gs) => { gs.hero.critChance = (gs.hero.critChance || 0) + 0.10; }
  },
  {
    id: "lifesteal1",
    name: "Vampiric Arrows",
    desc: "Gain 5% lifesteal",
    cost: 2,
    maxLevel: 1,
    requires: ["hp1"],
    apply: (gs) => { gs.hero.lifesteal = (gs.hero.lifesteal || 0) + 0.05; }
  },
  {
    id: "gold1",
    name: "Greedy Hands",
    desc: "+20% Gold from kills",
    cost: 2,
    maxLevel: 1,
    requires: ["atkspd1"],
    apply: (gs) => { gs.hero.goldBonus = (gs.hero.goldBonus || 0) + 0.20; }
  }
];

export const heroSkills = {}; // { skillId: level }