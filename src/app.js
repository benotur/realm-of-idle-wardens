import { auth, db } from './firebase.js';
import { gameState } from './game/state.js';
import { updateUI } from './game/ui.js';
import { updateGame, spawnWave } from './game/engine.js';

// --- Firebase Auth UI Elements ---
const authSection = document.getElementById('auth-section');
const authForms = document.getElementById('auth-forms');
const profileSection = document.getElementById('profile-section');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const newUsernameInput = document.getElementById('new-username');
const changeUsernameBtn = document.getElementById('change-username-btn');
const newPasswordInput = document.getElementById('new-password');
const changePasswordBtn = document.getElementById('change-password-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

// --- Game Canvas ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let lastTime = performance.now();
let gameRunning = false;

// --- Sprite Assets ---
const heroSprites = {
  idle: { img: new Image(), frames: 6, frameWidth: 100, frameHeight: 100 },
  walk: { img: new Image(), frames: 8, frameWidth: 100, frameHeight: 100 },
  attack1: { img: new Image(), frames: 6, frameWidth: 100, frameHeight: 100 },
  attack2: { img: new Image(), frames: 6, frameWidth: 100, frameHeight: 100 },
  attack3: { img: new Image(), frames: 9, frameWidth: 100, frameHeight: 100 },
  death: { img: new Image(), frames: 4, frameWidth: 100, frameHeight: 100 },
  hurt: { img: new Image(), frames: 4, frameWidth: 100, frameHeight: 100 },
};
heroSprites.idle.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Idle.png';
heroSprites.walk.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Walk.png';
heroSprites.attack1.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Attack01.png';
heroSprites.attack2.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Attack02.png';
heroSprites.attack3.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Attack03.png';
heroSprites.death.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Death.png';
heroSprites.hurt.img.src = 'assets/characters/soldier/soldierwithshadows/Soldier-Hurt.png';

const enemySprites = {
  walk: { img: new Image(), frames: 8, frameWidth: 100, frameHeight: 100 },
  attack: { img: new Image(), frames: 6, frameWidth: 100, frameHeight: 100 }
};
enemySprites.walk.img.src = 'assets/characters/orc/orcwithshadows/Orc-Walk.png';
enemySprites.attack.img.src = 'assets/characters/orc/orcwithshadows/Orc-Attack01.png';

const arrowSprite = new Image();
arrowSprite.src = 'assets/characters/soldier/Arrow(projectile)/Arrow01(100x100).png';

// --- Animation State ---
let heroAnim = 'idle';
let heroAnimFrame = 0;
let heroAnimTimer = 0;
let heroAnimPlaying = false;
let heroAnimQueue = [];

// --- Floating Gold & Damage Logic ---
let floatingGolds = [];
let floatingDamages = [];
function showFloatingGold(x, y, amount) {
  floatingGolds.push({ x, y, amount, alpha: 1, vy: -0.5 });
}
window.showFloatingGold = showFloatingGold;

function showFloatingDamage(x, y, amount) {
  floatingDamages.push({ x, y, amount, alpha: 1, vy: -0.7 });
}
window.showFloatingDamage = showFloatingDamage;

// --- Helper: Username to Email ---
function usernameToEmail(username) {
  const safe = username.replace(/[^a-zA-Z0-9._-]/g, '');
  return `${safe}@realmofidlewardens.com`;
}

// --- Progress Persistence ---
function saveProgress() {
  const user = auth.currentUser;
  if (user) {
    db.ref('users/' + user.uid + '/progress').set({
      gold: gameState.gold,
      wave: gameState.wave,
      hp: gameState.hero.hp,
      maxHp: gameState.hero.maxHp,
      damage: gameState.hero.attack,
      attackSpeed: gameState.hero.attackSpeed
    });
    loadLeaderboard();
  }
}
window.saveProgress = saveProgress;

// --- Leaderboard ---
let leaderboardLastUpdate = 0;
let leaderboardInterval = null;
let leaderboardCountdown = 30;

function loadLeaderboard(force = false) {
  const leaderboardEl = document.getElementById('leaderboard');
  const counterElId = 'leaderboard-refresh-counter';
  if (!leaderboardEl) return;

  // Only fetch if forced or 30s passed since last update
  const now = Date.now();
  if (!force && now - leaderboardLastUpdate < 30000) return;

  leaderboardLastUpdate = now;
  leaderboardEl.innerHTML = '<li style="text-align:center;color:#888;">Loading...</li>';

  db.ref('users').once('value').then(snap => {
    const users = snap.val() || {};
    const entries = [];
    for (const uid in users) {
      const profile = users[uid].profile || {};
      const progress = users[uid].progress || {};
      entries.push({
        username: profile.username || 'Unknown',
        wave: progress.wave || 1
      });
    }
    entries.sort((a, b) => b.wave - a.wave);
    leaderboardEl.innerHTML = entries.slice(0, 10).map((entry, i) =>
      `<li style="padding:6px 12px;${i===0?'font-weight:bold;color:#bfa76f;':''}">
        ${i+1}. ${entry.username} <span style="float:right;">Wave ${entry.wave}</span>
      </li>`
    ).join('');
    if (entries.length === 0) leaderboardEl.innerHTML = '<li style="text-align:center;color:#888;">No data yet.</li>';
    // Add/update refresh counter
    let counterEl = document.getElementById(counterElId);
    if (!counterEl) {
      counterEl = document.createElement('div');
      counterEl.id = counterElId;
      counterEl.style = "text-align:center;color:#888;font-size:0.95em;margin-top:8px;";
      leaderboardEl.parentElement.appendChild(counterEl);
    }
    counterEl.textContent = `Leaderboard refreshes in ${leaderboardCountdown}s`;
  });
}
window.loadLeaderboard = loadLeaderboard;

// Start leaderboard auto-refresh
function startLeaderboardInterval() {
  if (leaderboardInterval) clearInterval(leaderboardInterval);
  leaderboardCountdown = 30;
  loadLeaderboard(true);
  leaderboardInterval = setInterval(() => {
    leaderboardCountdown--;
    let counterEl = document.getElementById('leaderboard-refresh-counter');
    if (counterEl) {
      counterEl.textContent = `Leaderboard refreshes in ${leaderboardCountdown}s`;
    }
    if (leaderboardCountdown <= 0) {
      leaderboardCountdown = 30;
      loadLeaderboard(true);
    }
  }, 1000);
}
startLeaderboardInterval();

// --- Auth State Listener ---
auth.onAuthStateChanged(user => {
  if (user) {
    authForms.style.display = 'none';
    profileSection.style.display = '';
    userEmailSpan.textContent = user.email;
    db.ref('users/' + user.uid + '/profile').once('value').then(snapshot => {
      const profile = snapshot.val();
      if (profile && profile.username) {
        newUsernameInput.value = profile.username;
      }
    });
    db.ref('users/' + user.uid + '/progress').once('value').then(snap => {
      const progress = snap.val();
      if (progress) {
        gameState.gold = progress.gold || 0;
        gameState.wave = progress.wave || 1;
        gameState.hero.hp = progress.hp || 100;
        gameState.hero.maxHp = progress.maxHp || 100;
        gameState.hero.attack = progress.damage || 10;
        gameState.hero.attackSpeed = progress.attackSpeed || 1;
      }
      startGame();
      loadLeaderboard();
    });
  } else {
    authForms.style.display = '';
    profileSection.style.display = 'none';
    stopGame();
    loadLeaderboard();
  }
});

// --- Auth Actions ---
registerBtn.onclick = async () => {
  let username = usernameInput.value.trim();
  const password = passwordInput.value;
  username = username.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!username || username.length < 3 || username.length > 20) {
    alert('Username must be 3-20 characters: letters, numbers, ., _, -');
    return;
  }
  if (!password || password.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }
  const snap = await db.ref('usernames/' + username).once('value');
  if (snap.exists()) {
    alert('Username already taken.');
    return;
  }
  auth.createUserWithEmailAndPassword(`${username}@realmofidlewardens.com`, password)
    .then(cred => {
      db.ref('usernames/' + username).set(cred.user.uid);
      db.ref('users/' + cred.user.uid + '/profile').set({ username });
    })
    .catch(e => alert(e.message));
};

loginBtn.onclick = async () => {
  let username = usernameInput.value.trim();
  const password = passwordInput.value;
  username = username.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!username || username.length < 3 || username.length > 20) {
    alert('Username must be 3-20 characters: letters, numbers, ., _, -');
    return;
  }
  if (!password || password.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }
  const snap = await db.ref('usernames/' + username).once('value');
  if (!snap.exists()) {
    alert('Username not found.');
    return;
  }
  auth.signInWithEmailAndPassword(usernameToEmail(username), password)
    .catch(e => alert(e.message));
};

logoutBtn && (logoutBtn.onclick = () => auth.signOut());

changeUsernameBtn && (changeUsernameBtn.onclick = async () => {
  const user = auth.currentUser;
  let newUsername = newUsernameInput.value.trim();
  newUsername = newUsername.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!user || !newUsername || newUsername.length < 3 || newUsername.length > 20) {
    alert('Username must be 3-20 characters: letters, numbers, ., _, -');
    return;
  }
  const snap = await db.ref('usernames/' + newUsername).once('value');
  if (snap.exists()) {
    alert('Username already taken.');
    return;
  }
  const profileSnap = await db.ref('users/' + user.uid + '/profile').once('value');
  const oldUsername = profileSnap.val()?.username;
  await db.ref('usernames/' + newUsername).set(user.uid);
  if (oldUsername) {
    await db.ref('usernames/' + oldUsername).remove();
  }
  await db.ref('users/' + user.uid + '/profile').update({ username: newUsername });
  alert('Username updated!');
});

changePasswordBtn && (changePasswordBtn.onclick = () => {
  const user = auth.currentUser;
  if (user && newPasswordInput.value.length >= 6) {
    user.updatePassword(newPasswordInput.value)
      .then(() => alert('Password updated!'))
      .catch(e => alert(e.message));
  } else {
    alert('Password must be at least 6 characters.');
  }
});

deleteAccountBtn && (deleteAccountBtn.onclick = async () => {
  const user = auth.currentUser;
  if (user && confirm('Are you sure you want to delete your account?')) {
    const profileSnap = await db.ref('users/' + user.uid + '/profile').once('value');
    const username = profileSnap.val()?.username;
    if (username) {
      await db.ref('usernames/' + username).remove();
    }
    await db.ref('users/' + user.uid).remove();
    user.delete().catch(e => alert(e.message));
  }
});

// --- Animation Logic ---
function playHeroAnimation(anim, force = false) {
  if (force || heroAnim !== anim) {
    heroAnim = anim;
    heroAnimFrame = 0;
    heroAnimTimer = 0;
    heroAnimPlaying = true;
    window.heroAnim = heroAnim;
  }
}

function queueHeroAnimation(anim) {
  heroAnimQueue.push(anim);
}
window.queueHeroAnimation = queueHeroAnimation;

// --- Sprite Flipping Helpers ---
function drawSpriteFlipped(img, x, y, w, h, frame, frameWidth) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(-1, 1);
  ctx.drawImage(
    img,
    frame * frameWidth, 0, frameWidth, h,
    -w / 2, -h / 2, w, h
  );
  ctx.restore();
}

function getHeroFlip() {
  // Find closest enemy
  let targetX = null;
  let minDist = Infinity;
  for (const enemy of gameState.enemies) {
    const d = Math.abs(enemy.x - gameState.hero.x);
    if (d < minDist) {
      minDist = d;
      targetX = enemy.x;
    }
  }
  if (targetX === null) return false;
  return targetX < gameState.hero.x;
}
function getEnemyFlip(enemy) {
  return gameState.hero.x < enemy.x;
}
function getArrowFlip(arrow) {
  return arrow.vx < 0;
}

// --- Animation Update ---
function updateHeroAnimation(dt) {
  // Animation speed multiplier for attack only
  const attackAnimSpeed = Math.max(0.5, gameState.hero.attackSpeed);

  // Death animation
  if (heroAnim === 'death' && heroAnimPlaying) {
    heroAnimTimer += dt;
    const animData = heroSprites[heroAnim];
    const frameDuration = 0.15;
    if (heroAnimTimer >= frameDuration) {
      heroAnimFrame++;
      heroAnimTimer = 0;
      if (heroAnimFrame >= animData.frames) {
        heroAnimFrame = animData.frames - 1;
        heroAnimPlaying = false;
      }
    }
    return;
  }

  // Hurt animation
  if (heroAnim === 'hurt' && heroAnimPlaying) {
    heroAnimTimer += dt;
    const animData = heroSprites[heroAnim];
    const frameDuration = 0.12;
    if (heroAnimTimer >= frameDuration) {
      heroAnimFrame++;
      heroAnimTimer = 0;
      if (heroAnimFrame >= animData.frames) {
        heroAnimPlaying = false;
        playHeroAnimation('idle');
      }
    }
    return;
  }

  // Attack animations (speed up only these)
  if ((heroAnim === 'attack1' || heroAnim === 'attack2' || heroAnim === 'attack3') && heroAnimPlaying) {
    heroAnimTimer += dt * attackAnimSpeed;
    const animData = heroSprites[heroAnim];
    const frameDuration = 0.10 / attackAnimSpeed;
    if (heroAnimTimer >= frameDuration) {
      heroAnimFrame++;
      heroAnimTimer = 0;
      if (heroAnimFrame >= animData.frames) {
        heroAnimPlaying = false;
        playHeroAnimation('idle');
      }
    }
    return;
  }

  // If queued animation, play it
  if (heroAnimQueue.length > 0) {
    playHeroAnimation(heroAnimQueue.shift());
    return;
  }

  // Default: idle or walk (do NOT speed up)
  let moving = false;
  playHeroAnimation('idle');
  const animData = heroSprites[heroAnim];
  const frameDuration = 0.15;
  heroAnimTimer += dt;
  if (heroAnimTimer >= frameDuration) {
    heroAnimFrame = (heroAnimFrame + 1) % animData.frames;
    heroAnimTimer = 0;
  }
}

// --- Game Loop ---
function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    spawnWave(gameState.wave);
    updateUI();
    gameLoop(lastTime);
  }
}

function stopGame() {
  gameRunning = false;
  ctx.clearRect(0, 0, 400, 400);
  ctx.fillStyle = "#333";
  ctx.font = "24px Georgia";
  ctx.fillText("Please log in to play.", 60, 200);
}

function gameLoop(now) {
  if (!gameRunning) return;
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updateGame(dt);
  updateUI();
  updateHeroAnimation(dt);
  draw(now);

  if (gameState.hero.hp <= 0) {
    playHeroAnimation('death', true);
    setTimeout(() => {
      gameState.hero.hp = gameState.hero.maxHp;
      gameState.enemies = [];
      spawnWave(gameState.wave);
      playHeroAnimation('idle');
    }, 1000);
  }

  requestAnimationFrame(gameLoop);
}

// --- Drawing ---
function draw(now) {
  ctx.clearRect(0, 0, 400, 400);

  // Draw hero (centered, bigger)
  const heroDrawSize = 180;
  const animData = heroSprites[heroAnim];
  const heroFlip = getHeroFlip();
  if (animData) {
    if (heroFlip) {
      drawSpriteFlipped(
        animData.img,
        gameState.hero.x - heroDrawSize / 2,
        gameState.hero.y - heroDrawSize / 2,
        heroDrawSize,
        heroDrawSize,
        heroAnimFrame,
        animData.frameWidth
      );
    } else {
      drawSprite(
        animData.img,
        gameState.hero.x - heroDrawSize / 2,
        gameState.hero.y - heroDrawSize / 2,
        heroDrawSize,
        heroDrawSize,
        heroAnimFrame,
        animData.frameWidth
      );
    }
  }

  // Draw hero HP bar
  drawHpBar(
    gameState.hero.x - 40,
    gameState.hero.y - 70,
    80,
    12,
    gameState.hero.hp,
    gameState.hero.maxHp
  );

  // Draw enemies (smaller)
  const orcDrawSize = 100;
  for (const enemy of gameState.enemies) {
    let enemyAnim = enemySprites.walk;
    let enemyFrame = 0;
    if (enemy.anim === 'walk') {
      enemyAnim = enemySprites.walk;
      enemyFrame = Math.floor((now / 100) % enemyAnim.frames);
    } else if (enemy.anim === 'attack') {
      enemyAnim = enemySprites.attack;
      enemyFrame = enemy.animFrame || 0;
    }
    const enemyFlip = getEnemyFlip(enemy);
    if (enemyFlip) {
      drawSpriteFlipped(
        enemyAnim.img,
        enemy.x - orcDrawSize / 2,
        enemy.y - orcDrawSize / 2,
        orcDrawSize,
        orcDrawSize,
        enemyFrame,
        enemyAnim.frameWidth
      );
    } else {
      drawSprite(
        enemyAnim.img,
        enemy.x - orcDrawSize / 2,
        enemy.y - orcDrawSize / 2,
        orcDrawSize,
        orcDrawSize,
        enemyFrame,
        enemyAnim.frameWidth
      );
    }
    drawHpBar(
      enemy.x - 36,
      enemy.y - 30,
      72,
      10,
      enemy.hp,
      enemy.maxHp || 20 + gameState.wave * 5
    );
  }

  // Draw projectiles (arrows, bigger)
  for (const arrow of gameState.arrows || []) {
    const arrowFlip = getArrowFlip(arrow);
    if (arrowFlip) {
      drawSpriteFlipped(
        arrowSprite,
        arrow.x - 30,
        arrow.y - 80,
        60,
        60,
        0,
        100
      );
    } else {
      drawSprite(
        arrowSprite,
        arrow.x - 30,
        arrow.y - 80,
        60,
        60,
        0,
        100
      );
    }
  }

  // Draw floating gold
  for (let i = floatingGolds.length - 1; i >= 0; i--) {
    const fg = floatingGolds[i];
    ctx.save();
    ctx.globalAlpha = fg.alpha;
    ctx.font = "bold 22px EB Garamond, serif";
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText(fg.amount, fg.x, fg.y);
    ctx.fillText(fg.amount, fg.x, fg.y);
    ctx.restore();
    fg.y += fg.vy;
    fg.alpha -= 0.02;
    if (fg.alpha <= 0) floatingGolds.splice(i, 1);
  }

  // Draw floating damage numbers
  for (let i = floatingDamages.length - 1; i >= 0; i--) {
    const fd = floatingDamages[i];
    ctx.save();
    ctx.globalAlpha = fd.alpha;
    ctx.font = "bold 20px Georgia";
    ctx.fillStyle = "#ff4444";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText(fd.amount, fd.x, fd.y);
    ctx.fillText(fd.amount, fd.x, fd.y);
    ctx.restore();
    fd.y += fd.vy;
    fd.alpha -= 0.025;
    if (fd.alpha <= 0) floatingDamages.splice(i, 1);
  }
}

// Draw a sprite frame from a spritesheet
function drawSprite(img, x, y, w, h, frame, frameWidth) {
  ctx.drawImage(
    img,
    frame * frameWidth, 0, frameWidth, h,
    x, y, w, h
  );
}

// Draw HP bar helper (with numbers)
function drawHpBar(x, y, width, height, hp, maxHp) {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#4f4";
  ctx.fillRect(x, y, (hp / maxHp) * width, height);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, width, height);
  ctx.font = "bold 12px Georgia";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.max(0, Math.floor(hp))}/${Math.floor(maxHp)}`, x + width / 2, y + height - 2);
  ctx.textAlign = "left";
}

// --- Upgrade Buttons ---
document.getElementById('upgrade-damage') && (document.getElementById('upgrade-damage').onclick = () => {
  if (gameState.gold >= 100) {
    gameState.gold -= 100;
    gameState.hero.attack += 5;
    updateUI();
    saveProgress();
  }
});
document.getElementById('upgrade-hp') && (document.getElementById('upgrade-hp').onclick = () => {
  if (gameState.gold >= 100) {
    gameState.gold -= 100;
    gameState.hero.maxHp += 20;
    gameState.hero.hp = gameState.hero.maxHp;
    updateUI();
    saveProgress();
  }
});
document.getElementById('upgrade-attack-speed') && (document.getElementById('upgrade-attack-speed').onclick = () => {
  if (gameState.gold >= 100) {
    gameState.gold -= 100;
    gameState.hero.attackSpeed += 0.1;
    updateUI();
    saveProgress();
  }
});