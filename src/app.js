import { auth, db } from './firebase.js';
import { gameState, heroSkills } from './game/state.js';
import { updateUI } from './game/ui.js';
import { updateGame, spawnWave } from './game/engine.js';
import './game/ui.js'; // For skill tree UI

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

const arrowSprite = new Image();
arrowSprite.src = 'assets/characters/soldier/Arrow(projectile)/Arrow01(100x100).png';

const rootSprite = new Image();
rootSprite.src = 'assets/magic/1.png';

const orcTypes = ['orc1', 'orc2', 'orc3'];
const slimeTypes = ['slime1', 'slime2', 'slime3'];
const mobTypes = [...orcTypes, ...slimeTypes];

const orcSprites = {};
for (const orcType of orcTypes) {
  orcSprites[orcType] = {
    walk: { img: new Image(), frames: 6, frameWidth: 64, frameHeight: 64, rows: 4 },
    attack: { img: new Image(), frames: 8, frameWidth: 64, frameHeight: 64, rows: 4 },
    death: { img: new Image(), frames: 8, frameWidth: 64, frameHeight: 64, rows: 4 },
    hurt: { img: new Image(), frames: 6, frameWidth: 64, frameHeight: 64, rows: 4 }
  };
  orcSprites[orcType].walk.img.src = `assets/characters/${orcType}/Walk.png`;
  orcSprites[orcType].attack.img.src = `assets/characters/${orcType}/Attack.png`;
  orcSprites[orcType].death.img.src = `assets/characters/${orcType}/Death.png`;
  orcSprites[orcType].hurt.img.src = `assets/characters/${orcType}/Hurt.png`;
}

const slimeSprites = {};
for (const slimeType of slimeTypes) {
  slimeSprites[slimeType] = {
    walk: { img: new Image(), frames: 6, frameWidth: 64, frameHeight: 64, rows: 4 },
    attack: { img: new Image(), frames: 8, frameWidth: 64, frameHeight: 64, rows: 4 },
    death: { img: new Image(), frames: 8, frameWidth: 64, frameHeight: 64, rows: 4 },
    hurt: { img: new Image(), frames: 6, frameWidth: 64, frameHeight: 64, rows: 4 }
  };
  slimeSprites[slimeType].walk.img.src = `assets/characters/${slimeType}/Walk.png`;
  slimeSprites[slimeType].attack.img.src = `assets/characters/${slimeType}/Attack.png`;
  slimeSprites[slimeType].death.img.src = `assets/characters/${slimeType}/Death.png`;
  slimeSprites[slimeType].hurt.img.src = `assets/characters/${slimeType}/Hurt.png`;
}

// --- Animation State ---
let heroAnim = 'idle';
let heroAnimFrame = 0;
let heroAnimTimer = 0;
let heroAnimPlaying = false;
let heroAnimQueue = [];

// --- Floating Gold, Damage & Heal Logic ---
let floatingGolds = [];
let floatingDamages = [];
let floatingHeals = [];
function showFloatingGold(x, y, amount) {
  floatingGolds.push({ x, y, amount, alpha: 1, vy: -0.5 });
}
window.showFloatingGold = showFloatingGold;

function showFloatingDamage(x, y, amount) {
  floatingDamages.push({ x, y, amount, alpha: 1, vy: -0.7 });
}
window.showFloatingDamage = showFloatingDamage;

function showFloatingHeal(x, y, amount) {
  floatingHeals.push({ x, y, amount, alpha: 1, vy: -0.7 });
}
window.showFloatingHeal = showFloatingHeal;

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
      attackSpeed: gameState.hero.attackSpeed,
      upgradeLevels: gameState.upgradeLevels,
      heroLevel: gameState.hero.level,
      heroXp: gameState.hero.xp,
      heroXpToNext: gameState.hero.xpToNext,
      heroSkillPoints: gameState.hero.skillPoints,
      heroSkills: heroSkills
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
      if (profile.username && progress.wave) {
        entries.push({
          username: profile.username,
          wave: progress.wave
        });
      }
    }
    entries.sort((a, b) => b.wave - a.wave);
    leaderboardEl.innerHTML = entries.slice(0, 10).map((entry, i) =>
      `<li style="padding:6px 12px;${i === 0 ? 'font-weight:bold;color:#bfa76f;' : ''}">
      ${i + 1}. ${entry.username} <span style="float:right;">Wave ${entry.wave}</span>
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
let isDeletingAccount = false;
auth.onAuthStateChanged(user => {
  if (isDeletingAccount) return;
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
        gameState.upgradeLevels = progress.upgradeLevels || { damage: 0, hp: 0, attackSpeed: 0 };
        gameState.hero.level = progress.heroLevel || 1;
        gameState.hero.xp = progress.heroXp || 0;
        gameState.hero.xpToNext = progress.heroXpToNext || 100;
        gameState.hero.skillPoints = progress.heroSkillPoints || 0;
        if (progress.heroSkills) Object.assign(heroSkills, progress.heroSkills);
      }
      spawnWave(gameState.wave);
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

// --- Delete Account ---
deleteAccountBtn && (deleteAccountBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm('Are you sure you want to delete your account?')) return;

  isDeletingAccount = true; // Prevents onAuthStateChanged from writing

  // Remove username from /usernames
  const profileSnap = await db.ref('users/' + user.uid + '/profile').once('value');
  const username = profileSnap.val()?.username;
  if (username) {
    await db.ref('usernames/' + username).remove();
  }

  // Remove ALL user data from /users/{uid}
  await db.ref('users/' + user.uid).remove();

  // Try to delete the auth user
  try {
    await user.delete();
    alert('Account deleted.');
    await auth.signOut();
    window.location.reload();
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      const password = prompt("Please enter your password to confirm account deletion:");
      if (password) {
        try {
          const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
          await user.reauthenticateWithCredential(credential);
          await db.ref('users/' + user.uid).remove();
          await user.delete();
          alert('Account deleted.');
          await auth.signOut();
          window.location.reload();
        } catch (reauthErr) {
          alert('Re-authentication failed: ' + reauthErr.message);
        }
      }
    } else {
      alert('Error deleting account: ' + e.message);
    }
  }
});

window.spawnEnemy = function () {
  const mobWaves = [
    { types: ['orc1', 'slime1'], minWave: 1 },
    { types: ['orc2', 'slime2'], minWave: 4 },
    { types: ['orc3', 'slime3'], minWave: 8 },
  ];

  let allowedTypes = [];
  for (const entry of mobWaves) {
    if (gameState.wave >= entry.minWave) {
      allowedTypes = allowedTypes.concat(entry.types);
    }
  }
  if (allowedTypes.length === 0) allowedTypes = ['orc1', 'slime1'];
  const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

  // --- Default stats ---
  let hp = 20 + gameState.wave * 5;
  let attack = 5 + gameState.wave * 2;
  let speed = 30 + gameState.wave * 2;
  let size = 100;
  let burnImmune = false;
  let appliesBurn = false;
  let title = "";

  // --- Orcs ---
  if (type === 'orc1') {
    size = 100;
    title = "Orc Grunt";
  } else if (type === 'orc2') {
    hp += 30; attack += 5; speed += 25;
    size = 80;
    title = "Orc Scout";
  } else if (type === 'orc3') {
    hp += 60; attack += 10; speed -= 10;
    size = 120;
    title = "Orc Brute";
  }

  // --- Slimes ---
  if (type === 'slime1') {
    size = 100;
    title = "Green Slime";
  } else if (type === 'slime2') {
    hp += 40; attack += 3;
    size = 120;
    burnImmune = true;
    title = "Water Slime";
  } else if (type === 'slime3') {
    hp += 20; attack += 8;
    size = 100;
    appliesBurn = true;
    title = "Fire Slime";
  }

  // Randomize spawn side and position
  const sides = ['top', 'bottom', 'left', 'right'];
  const side = sides[Math.floor(Math.random() * sides.length)];
  let x, y;
  if (side === 'top') {
    x = 40 + Math.random() * 320;
    y = 0;
  } else if (side === 'bottom') {
    x = 40 + Math.random() * 320;
    y = 400;
  } else if (side === 'left') {
    x = 0;
    y = 40 + Math.random() * 320;
  } else if (side === 'right') {
    x = 400;
    y = 40 + Math.random() * 320;
  }

  gameState.enemies.push({
    type,
    x,
    y,
    hp,
    maxHp: hp,
    attack,
    speed,
    anim: 'walk',
    animFrame: 0,
    animTimer: 0,
    animPlaying: false,
    attackCooldown: 0,
    direction: 0,
    title,
    level: gameState.wave,
    size,
    burnImmune,
    appliesBurn
  });
};

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
    gameState.hero.attackCooldown = 0;
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

let flameArrowsCooldown = 0;
let flameArrowsActive = 0;
let healCooldown = 0;
let rootCooldown = 0;
let rootActive = 0;

window.flameArrowsCooldown = flameArrowsCooldown;
window.flameArrowsActive = flameArrowsActive;
window.healCooldown = healCooldown;
window.rootCooldown = rootCooldown;
window.rootActive = rootActive;

function gameLoop(now) {
  if (!gameRunning) return;
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Skill cooldowns
  if (flameArrowsCooldown > 0) flameArrowsCooldown -= dt;
  if (flameArrowsActive > 0) flameArrowsActive -= dt;
  if (healCooldown > 0) healCooldown -= dt;
  if (rootCooldown > 0) rootCooldown -= dt;
  window.flameArrowsCooldown = flameArrowsCooldown;
  window.flameArrowsActive = flameArrowsActive;
  window.healCooldown = healCooldown;
  window.rootCooldown = rootCooldown;
  if (rootActive > 0) {
    rootActive -= dt;
    window.rootActive = rootActive;
    // Root all enemies (set speed to 0 and mark as rooted)
    for (const enemy of gameState.enemies) {
      enemy._originalSpeed = enemy._originalSpeed ?? enemy.speed;
      enemy.speed = 0;
      enemy.rooted = true;
    }
  } else {
    // Restore normal speed if not rooted
    for (const enemy of gameState.enemies) {
      if (enemy.rooted) {
        enemy.speed = enemy._originalSpeed ?? (30 + gameState.wave * 2);
        delete enemy.rooted;
        delete enemy._originalSpeed;
      }
    }
  }

  // Fireball logic
  if (gameState.fireballs) {
    for (const fireball of gameState.fireballs) {
      fireball.t += dt;
      if (!fireball.hit && fireball.t >= fireball.duration) {
        // Hit all enemies in radius
        for (const enemy of gameState.enemies) {
          const dx = enemy.x - fireball.x;
          const dy = enemy.y - fireball.y;
          if (Math.sqrt(dx * dx + dy * dy) < 120) {
            enemy.hp -= 40;
            if (window.showFloatingDamage) window.showFloatingDamage(enemy.x, enemy.y, "-40");
          }
        }
        fireball.hit = true;
      }
    }
    // Remove finished fireballs
    gameState.fireballs = gameState.fireballs.filter(f => f.t < f.duration + 0.3);
  }

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
      if (window.showWavePopup) window.showWavePopup(gameState.wave);
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
        gameState.hero.y - heroDrawSize / 2 + 40,
        heroDrawSize,
        heroDrawSize,
        heroAnimFrame,
        animData.frameWidth
      );
    } else {
      drawSprite(
        animData.img,
        gameState.hero.x - heroDrawSize / 2,
        gameState.hero.y - heroDrawSize / 2 + 40,
        heroDrawSize,
        heroDrawSize,
        heroAnimFrame,
        animData.frameWidth
      );
    }
  }

  // --- Draw hero level above hero ---
  ctx.save();
  ctx.font = "bold 20px Georgia";
  ctx.fillStyle = "#ffd700";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.textAlign = "center";
  ctx.strokeText(`Lv. ${gameState.hero.level}`, gameState.hero.x, gameState.hero.y - heroDrawSize / 2 + 40);
  ctx.fillText(`Lv. ${gameState.hero.level}`, gameState.hero.x, gameState.hero.y - heroDrawSize / 2 + 40);
  ctx.restore();

  // Draw hero HP bar
  drawHpBar(
    gameState.hero.x - 40,
    gameState.hero.y - 30,
    80,
    12,
    gameState.hero.hp,
    gameState.hero.maxHp
  );

  // Draw enemies (orcs, slimes, boss)
  for (const enemy of gameState.enemies) {
    // Set mob size per type
    let mobDrawSize =
      enemy.type === 'orc2' ? 80 :
        enemy.type === 'orc3' || enemy.type === 'boss' ? 120 :
          enemy.type === 'slime2' ? 120 :
            100; // default

    let enemyAnim, enemyFrame, enemyRow;

    // --- Orcs and Boss ---
    if (orcTypes.includes(enemy.type) || enemy.type === 'boss') {
      const orcType = enemy.type === 'boss' ? 'orc3' : enemy.type;
      let animKey = enemy.anim;
      if (!['walk', 'attack', 'death', 'hurt'].includes(animKey)) animKey = 'walk';
      enemyAnim = orcSprites[orcType][animKey];
      enemyRow = typeof enemy.direction === 'number' ? enemy.direction : 0;
      if (animKey === 'walk' || animKey === 'hurt') {
        enemyFrame = Math.floor((now / 100) % enemyAnim.frames);
      } else {
        enemyFrame = enemy.animFrame || 0;
      }
      ctx.drawImage(
        enemyAnim.img,
        enemyFrame * enemyAnim.frameWidth,
        enemyRow * enemyAnim.frameHeight,
        enemyAnim.frameWidth,
        enemyAnim.frameHeight,
        enemy.x - mobDrawSize / 2,
        enemy.y - mobDrawSize / 2,
        mobDrawSize,
        mobDrawSize
      );
    }
    // --- Slimes ---
    else if (slimeTypes.includes(enemy.type)) {
      const slimeType = enemy.type;
      let animKey = enemy.anim;
      if (!['walk', 'attack', 'death', 'hurt'].includes(animKey)) animKey = 'walk';
      enemyAnim = slimeSprites[slimeType][animKey];
      enemyRow = typeof enemy.direction === 'number' ? enemy.direction : 0;
      if (animKey === 'walk' || animKey === 'hurt') {
        enemyFrame = Math.floor((now / 100) % enemyAnim.frames);
      } else {
        enemyFrame = enemy.animFrame || 0;
      }
      ctx.drawImage(
        enemyAnim.img,
        enemyFrame * enemyAnim.frameWidth,
        enemyRow * enemyAnim.frameHeight,
        enemyAnim.frameWidth,
        enemyAnim.frameHeight,
        enemy.x - mobDrawSize / 2,
        enemy.y - mobDrawSize / 2,
        mobDrawSize,
        mobDrawSize
      );
    }

    // Draw enemy title if exists
    if (enemy.title) {
      ctx.save();
      ctx.font = enemy.type === 'boss' ? "bold 22px Georgia" : "bold 15px Georgia";
      ctx.fillStyle = enemy.type === 'boss' ? "#ff4444" : "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      // Draw level above the title
      if (enemy.level) {
        ctx.font = enemy.type === 'boss' ? "bold 18px Georgia" : "bold 13px Georgia";
        ctx.strokeText(`Lv. ${enemy.level}`, enemy.x, enemy.y - mobDrawSize / 2 - 17);
        ctx.fillText(`Lv. ${enemy.level}`, enemy.x, enemy.y - mobDrawSize / 2 - 17);
        ctx.font = enemy.type === 'boss' ? "bold 22px Georgia" : "bold 15px Georgia";
      }
      ctx.strokeText(enemy.title, enemy.x, enemy.y - mobDrawSize / 2 - -2);
      ctx.fillText(enemy.title, enemy.x, enemy.y - mobDrawSize / 2 - -2);
      ctx.restore();
    }

    drawHpBar(
      enemy.x - 36,
      enemy.y - 30,
      72,
      10,
      enemy.hp,
      enemy.maxHp || 20 + gameState.wave * 5,
      enemy.anim === 'death'
    );

    // Draw root effect on rooted enemies
    if (enemy.rooted) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      const rootFrameCount = 8;
      const rootFrameW = 72;
      const rootFrameH = 72;
      const frame = Math.floor((now / 83) % rootFrameCount);
      ctx.drawImage(
        rootSprite,
        frame * rootFrameW, 0, rootFrameW, rootFrameH,
        enemy.x - rootFrameW / 2,
        enemy.y - rootFrameH / 2 - 24,
        rootFrameW,
        rootFrameH
      );
      ctx.restore();
    }
  }

  // Draw projectiles (arrows, bigger)
  for (const arrow of gameState.arrows || []) {
    const arrowFlip = getArrowFlip(arrow);
    ctx.save();
    if (arrow.flame) {
      ctx.filter = "brightness(1.2) sepia(1) hue-rotate(-30deg) saturate(4)";
    }
    if (arrowFlip) {
      drawSpriteFlipped(
        arrowSprite,
        arrow.x - 30,
        arrow.y - 50,
        60,
        60,
        0,
        100
      );
    } else {
      drawSprite(
        arrowSprite,
        arrow.x - 30,
        arrow.y - 50,
        60,
        60,
        0,
        100
      );
    }
    ctx.restore();
  }

  // Draw fireballs (orange obstacles)
  if (gameState.fireballs) {
    for (const fireball of gameState.fireballs) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(fireball.x, fireball.y, fireball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ff8800";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.restore();
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

  // Draw floating heal numbers (green)
  for (let i = floatingHeals.length - 1; i >= 0; i--) {
    const fh = floatingHeals[i];
    ctx.save();
    ctx.globalAlpha = fh.alpha;
    ctx.font = "bold 20px Georgia";
    ctx.fillStyle = "#44ff44";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText(fh.amount, fh.x, fh.y);
    ctx.fillText(fh.amount, fh.x, fh.y);
    ctx.restore();
    fh.y += fh.vy;
    fh.alpha -= 0.025;
    if (fh.alpha <= 0) floatingHeals.splice(i, 1);
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
function drawHpBar(x, y, width, height, hp, maxHp, isDead = false) {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, width, height);
  if (!isDead && hp > 0) {
    ctx.fillStyle = "#4f4";
    ctx.fillRect(x, y, (hp / maxHp) * width, height);
  }
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, width, height);
  ctx.font = "bold 12px Georgia";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.max(0, Math.floor(hp))}/${Math.floor(maxHp)}`, x + width / 2, y + height - 2);
  ctx.textAlign = "left";
}

//Upgrade Prices
function getUpgradePrice(type) {
  const basePrices = { damage: 100, hp: 200, attackSpeed: 300 };
  const level = gameState.upgradeLevels[type] || 0;
  return Math.floor(basePrices[type] * Math.pow(1.15, level));
}

// --- Upgrade Buttons ---
document.getElementById('upgrade-damage') && (document.getElementById('upgrade-damage').onclick = () => {
  const price = getUpgradePrice('damage');
  if (gameState.gold >= price) {
    gameState.gold -= price;
    gameState.hero.attack += 5;
    gameState.upgradeLevels.damage = (gameState.upgradeLevels.damage || 0) + 1;
    updateUI();
    saveProgress();
  }
});
document.getElementById('upgrade-hp') && (document.getElementById('upgrade-hp').onclick = () => {
  const price = getUpgradePrice('hp');
  if (gameState.gold >= price) {
    gameState.gold -= price;
    gameState.hero.maxHp += 20;
    gameState.hero.hp = gameState.hero.maxHp;
    gameState.upgradeLevels.hp = (gameState.upgradeLevels.hp || 0) + 1;
    updateUI();
    saveProgress();
  }
});
document.getElementById('upgrade-attack-speed') && (document.getElementById('upgrade-attack-speed').onclick = () => {
  const price = getUpgradePrice('attackSpeed');
  if (gameState.gold >= price) {
    gameState.gold -= price;
    gameState.hero.attackSpeed += 0.1;
    gameState.upgradeLevels.attackSpeed = (gameState.upgradeLevels.attackSpeed || 0) + 1;
    updateUI();
    saveProgress();
  }
});