import { gameState } from './state.js';

export function updateUI() {
  document.getElementById('gold').textContent = `Gold: ${Math.floor(gameState.gold)}`;
  document.getElementById('wave').textContent = `Wave: ${gameState.wave}`;
  document.getElementById('hero-hp').textContent = `HP: ${Math.floor(gameState.hero.hp)}/${gameState.hero.maxHp}`;
}