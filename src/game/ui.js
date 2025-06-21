import { gameState } from './state.js';

export function updateUI() {
  document.getElementById('gold').textContent = `Gold: ${Math.floor(gameState.gold)}`;
  document.getElementById('wave').textContent = `Wave: ${gameState.wave}`;

  // Update right stats panel
  const statsHp = document.getElementById('stats-hp');
  const statsDamage = document.getElementById('stats-damage');
  const statsAtkSpeed = document.getElementById('stats-attack-speed');
  if (statsHp) statsHp.textContent = `${Math.floor(gameState.hero.hp)}/${gameState.hero.maxHp}`;
  if (statsDamage) statsDamage.textContent = gameState.hero.attack;
  if (statsAtkSpeed) statsAtkSpeed.textContent = gameState.hero.attackSpeed.toFixed(2);
}