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

// --- Sprite Assets (NEW: using your new structure, 100x100 tiles) ---
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

// Example enemy sprite (update path as needed)
const enemySprites = {
  walk: { img: new Image(), frames: 8, frameWidth: 100, frameHeight: 100 },
  attack: { img: new Image(), frames: 6, frameWidth: 100, frameHeight: 100 } // adjust frames if needed
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

// --- Helper: Username to Email ---
function usernameToEmail(username) {
  const safe = username.replace(/[^a-zA-Z0-9._-]/g, '');
  return `${safe}@realmofidlewardens.com`;
}

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
    startGame();
  } else {
    authForms.style.display = '';
    profileSection.style.display = 'none';
    stopGame();
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

// --- Floating Gold Logic ---
let floatingGolds = [];
function showFloatingGold(x, y, amount) {
  floatingGolds.push({ x, y, amount, alpha: 1, vy: -0.5 });
}
window.showFloatingGold = showFloatingGold;

// --- Animation Update ---
function updateHeroAnimation(dt) {
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

  // Attack animations
  if ((heroAnim === 'attack1' || heroAnim === 'attack2' || heroAnim === 'attack3') && heroAnimPlaying) {
    heroAnimTimer += dt;
    const animData = heroSprites[heroAnim];
    const frameDuration = 0.10;
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

  // Default: idle or walk
  let moving = false;
  // If you have movement logic, set moving = true if hero is moving
  // For now, always idle
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

  // Draw hero (animated)
  const animData = heroSprites[heroAnim];
  if (animData) {
    drawSprite(
      animData.img,
      gameState.hero.x - 50,
      gameState.hero.y - 50,
      animData.frameWidth,
      animData.frameHeight,
      heroAnimFrame,
      animData.frameWidth
    );
  }

  // Draw hero HP bar
  drawHpBar(
    gameState.hero.x - 40,
    gameState.hero.y - 60,
    80,
    8,
    gameState.hero.hp,
    gameState.hero.maxHp
  );

  // Draw enemies (animated)
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
    drawSprite(
      enemyAnim.img,
      enemy.x - 50,
      enemy.y - 50,
      enemyAnim.frameWidth,
      enemyAnim.frameHeight,
      enemyFrame,
      enemyAnim.frameWidth
    );
    drawHpBar(
      enemy.x - 36,
      enemy.y - 60,
      72,
      7,
      enemy.hp,
      enemy.maxHp || 20 + gameState.wave * 5
    );
  }

  // Draw projectiles (arrows)
  for (const arrow of gameState.arrows || []) {
    drawSprite(
      arrowSprite,
      arrow.x - 50,
      arrow.y - 50,
      100,
      100,
      0,
      100
    );
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
}

// Draw a sprite frame from a spritesheet
function drawSprite(img, x, y, w, h, frame, frameWidth) {
  ctx.drawImage(
    img,
    frame * frameWidth, 0, frameWidth, h,
    x, y, w, h
  );
}

// Draw HP bar helper
function drawHpBar(x, y, width, height, hp, maxHp) {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#4f4";
  ctx.fillRect(x, y, (hp / maxHp) * width, height);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, width, height);
}

// --- Upgrade Buttons ---
document.getElementById('upgrade-attack') && (document.getElementById('upgrade-attack').onclick = () => {
  if (gameState.gold >= 100) {
    gameState.gold -= 100;
    gameState.hero.attack += 5;
    updateUI();
  }
});
document.getElementById('upgrade-hp') && (document.getElementById('upgrade-hp').onclick = () => {
  if (gameState.gold >= 100) {
    gameState.gold -= 100;
    gameState.hero.maxHp += 20;
    gameState.hero.hp = gameState.hero.maxHp;
    updateUI();
  }
});