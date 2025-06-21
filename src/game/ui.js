import { gameState } from './state.js';

export function updateUI() {
  document.getElementById('gold').textContent = `Gold: ${Math.floor(gameState.gold)}`;
  document.getElementById('wave').textContent = `Wave: ${gameState.wave}`;

  // Wave kill counter
  const waveCounter = document.getElementById('wave-counter');
  if (waveCounter) {
    const killed = gameState.waveEnemiesSpawned - gameState.enemies.length;
    const total = gameState.waveEnemiesToSpawn || 0;
    waveCounter.textContent = `${Math.max(0, killed)} / ${total}`;
  }

  // Stats panel
  const statsHp = document.getElementById('stats-hp');
  const statsDamage = document.getElementById('stats-damage');
  const statsAtkSpeed = document.getElementById('stats-attack-speed');
  if (statsHp) statsHp.textContent = `${Math.floor(gameState.hero.hp)}/${gameState.hero.maxHp}`;
  if (statsDamage) statsDamage.textContent = gameState.hero.attack;
  if (statsAtkSpeed) statsAtkSpeed.textContent = gameState.hero.attackSpeed.toFixed(2);

  // Skill buttons
  const flameBtn = document.getElementById('skill-flame-arrows');
  if (flameBtn && typeof window.flameArrowsCooldown !== "undefined") {
    flameBtn.disabled = window.flameArrowsCooldown > 0 || gameState.gold < 50;
    flameBtn.textContent = window.flameArrowsActive > 0
      ? `🔥 Flame Arrows (${Math.ceil(window.flameArrowsActive)}s)`
      : (window.flameArrowsCooldown > 0
        ? `🔥 Flame Arrows (${Math.ceil(window.flameArrowsCooldown)}s, 50g)`
        : `🔥 Flame Arrows (50g)`);
  }
  const healBtn = document.getElementById('skill-heal');
  if (healBtn && typeof window.healCooldown !== "undefined") {
    healBtn.disabled = window.healCooldown > 0 || gameState.gold < 40;
    healBtn.textContent = window.healCooldown > 0
      ? `💚 Heal (${Math.ceil(window.healCooldown)}s, 40g)`
      : `💚 Heal (40g)`;
  }
  const freezeBtn = document.getElementById('skill-freeze');
  if (freezeBtn && typeof window.freezeCooldown !== "undefined") {
    freezeBtn.disabled = window.freezeCooldown > 0 || gameState.gold < 60;
    freezeBtn.textContent = window.freezeCooldown > 0
      ? `❄️ Freeze (${Math.ceil(window.freezeCooldown)}s, 60g)`
      : `❄️ Freeze (60g)`;
  }

  // Upgrade prices (scaling)
  const damageBtn = document.getElementById('upgrade-damage');
  if (damageBtn) {
    const price = Math.floor(100 * Math.pow(1.15, gameState.upgradeLevels?.damage || 0));
    damageBtn.textContent = `Upgrade Damage (${price}g)`;
  }
  const hpBtn = document.getElementById('upgrade-hp');
  if (hpBtn) {
    const price = Math.floor(200 * Math.pow(1.15, gameState.upgradeLevels?.hp || 0));
    hpBtn.textContent = `Upgrade HP (${price}g)`;
  }
  const atkSpdBtn = document.getElementById('upgrade-attack-speed');
  if (atkSpdBtn) {
    const price = Math.floor(300 * Math.pow(1.15, gameState.upgradeLevels?.attackSpeed || 0));
    atkSpdBtn.textContent = `Upgrade Attack Speed (${price}g)`;
  }
}