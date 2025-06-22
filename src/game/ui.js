import { gameState, skillTree, heroSkills } from './state.js';

// --- UI Update Function (exported for use in app.js) ---
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

  // --- Hero Level, XP, Skill Points in Stats Panel ---
  let statsList = document.getElementById('stats-list');
  if (statsList) {
    // Add level/xp/sp if not present
    if (!document.getElementById('stats-level')) {
      const levelLi = document.createElement('li');
      levelLi.innerHTML = `<b>Level:</b> <span id="stats-level">1</span>`;
      levelLi.setAttribute("style", "padding:8px 12px;");
      statsList.insertBefore(levelLi, statsList.firstChild);

      const xpLi = document.createElement('li');
      xpLi.innerHTML = `<b>XP:</b> <span id="stats-xp">0/100</span>`;
      xpLi.setAttribute("style", "padding:8px 12px;");
      statsList.insertBefore(xpLi, statsList.children[1]);

      const spLi = document.createElement('li');
      spLi.innerHTML = `<b>Skill Points:</b> <span id="stats-sp">0</span>`;
      spLi.setAttribute("style", "padding:8px 12px;");
      statsList.insertBefore(spLi, statsList.children[2]);
    }
    // Update values
    document.getElementById('stats-level').textContent = gameState.hero.level;
    document.getElementById('stats-xp').textContent = `${gameState.hero.xp}/${gameState.hero.xpToNext}`;
    document.getElementById('stats-sp').textContent = gameState.hero.skillPoints;
  }

  // Stats panel (existing)
  const statsHp = document.getElementById('stats-hp');
  const statsDamage = document.getElementById('stats-damage');
  const statsAtkSpeed = document.getElementById('stats-attack-speed');
  if (statsHp) statsHp.textContent = `${Math.floor(gameState.hero.hp)}/${gameState.hero.maxHp}`;
  if (statsDamage) statsDamage.textContent = gameState.hero.attack;
  if (statsAtkSpeed) statsAtkSpeed.textContent = gameState.hero.attackSpeed.toFixed(2);

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

// --- Skill Tree Logic ---
function canUnlock(skill) {
  if ((heroSkills[skill.id] || 0) >= (skill.maxLevel || 1)) return false;
  if (gameState.hero.skillPoints < skill.cost) return false;
  for (const req of skill.requires || []) {
    if (!heroSkills[req]) return false;
  }
  return true;
}

export function renderSkillTree() {
  const list = document.getElementById('skill-tree-list');
  list.innerHTML = '';
  skillTree.forEach(skill => {
    const level = heroSkills[skill.id] || 0;
    const unlocked = level > 0;
    const canBuy = canUnlock(skill);
    const reqs = (skill.requires || []).map(reqId => {
      const reqSkill = skillTree.find(s => s.id === reqId);
      return reqSkill ? reqSkill.name : reqId;
    }).join(', ');
    const div = document.createElement('div');
    div.style = `margin:10px 0; padding:10px; border-radius:8px; background:${unlocked ? '#e2c275' : '#fff'}; border:2px solid #bfa76f;`;
    div.innerHTML = `
      <b>${skill.name}</b> <span style="float:right;">${level}/${skill.maxLevel || 1}</span><br>
      <span style="font-size:0.98em;">${skill.desc}</span>
      ${reqs ? `<div style="font-size:0.9em; color:#bfa76f;">Requires: ${reqs}</div>` : ''}
      <br>
      <button ${canBuy ? '' : 'disabled'} style="margin-top:6px;" data-skill="${skill.id}">Unlock (${skill.cost} SP)</button>
    `;
    list.appendChild(div);
  });

  // Button handlers
  list.querySelectorAll('button[data-skill]').forEach(btn => {
    btn.onclick = () => {
      const skill = skillTree.find(s => s.id === btn.dataset.skill);
      if (!skill) return;
      if (!canUnlock(skill)) return;
      heroSkills[skill.id] = (heroSkills[skill.id] || 0) + 1;
      gameState.hero.skillPoints -= skill.cost;
      skill.apply(gameState);
      updateUI();
      renderSkillTree();
      if (window.saveProgress) window.saveProgress();
    };
  });
}

// UI open/close
document.getElementById('open-skill-tree').onclick = () => {
  renderSkillTree();
  document.getElementById('skill-tree-overlay').style.display = '';
};
document.getElementById('close-skill-tree').onclick = () => {
  document.getElementById('skill-tree-overlay').style.display = 'none';
};