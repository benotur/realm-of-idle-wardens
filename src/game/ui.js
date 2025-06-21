import { gameState } from './state.js';

export function updateUI() {
  document.getElementById('gold').textContent = `Gold: ${Math.floor(gameState.gold)}`;
  document.getElementById('wave').textContent = `Wave: ${gameState.wave}`;
  document.getElementById('hero-hp').textContent = `HP: ${Math.floor(gameState.hero.hp)}/${gameState.hero.maxHp}`;
  if (window.heroAnim)
    document.getElementById('hero-anim').textContent = `State: ${window.heroAnim.charAt(0).toUpperCase() + window.heroAnim.slice(1)}`;
}