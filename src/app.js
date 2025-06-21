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

// --- Helper: Username to Email ---
function usernameToEmail(username) {
  // Only allow letters, numbers, dot, dash, underscore
  const safe = username.replace(/[^a-zA-Z0-9._-]/g, '');
  return `${safe}@realmofidlewardens.com`;
}

// --- Auth State Listener ---
auth.onAuthStateChanged(user => {
  if (user) {
    authForms.style.display = 'none';
    profileSection.style.display = '';
    userEmailSpan.textContent = user.email;
    // Load user profile from DB
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
// Register with username
registerBtn.onclick = async () => {
  let username = usernameInput.value.trim();
  const password = passwordInput.value;
  // Sanitize username
  username = username.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!username || username.length < 3 || username.length > 20) {
    alert('Username must be 3-20 characters: letters, numbers, ., _, -');
    return;
  }
  if (!password || password.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }
  // Check if username exists in Realtime Database
  const snap = await db.ref('usernames/' + username).once('value');
  if (snap.exists()) {
    alert('Username already taken.');
    return;
  }
  // Register with fake email
  auth.createUserWithEmailAndPassword(`${username}@realmofidlewardens.com`, password)
    .then(cred => {
      // Save username mapping and profile in Realtime Database
      db.ref('usernames/' + username).set(cred.user.uid);
      db.ref('users/' + cred.user.uid + '/profile').set({ username });
    })
    .catch(e => alert(e.message));
};

// Login with username
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
  // Lookup UID by username
  const snap = await db.ref('usernames/' + username).once('value');
  if (!snap.exists()) {
    alert('Username not found.');
    return;
  }
  // Login with fake email
  auth.signInWithEmailAndPassword(usernameToEmail(username), password)
    .catch(e => alert(e.message));
};

logoutBtn && (logoutBtn.onclick = () => auth.signOut());

// Change username
changeUsernameBtn && (changeUsernameBtn.onclick = async () => {
  const user = auth.currentUser;
  let newUsername = newUsernameInput.value.trim();
  newUsername = newUsername.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!user || !newUsername || newUsername.length < 3 || newUsername.length > 20) {
    alert('Username must be 3-20 characters: letters, numbers, ., _, -');
    return;
  }

  // Check if new username is taken
  const snap = await db.ref('usernames/' + newUsername).once('value');
  if (snap.exists()) {
    alert('Username already taken.');
    return;
  }

  // Get old username
  const profileSnap = await db.ref('users/' + user.uid + '/profile').once('value');
  const oldUsername = profileSnap.val()?.username;

  // Update username mapping
  await db.ref('usernames/' + newUsername).set(user.uid);
  if (oldUsername) {
    await db.ref('usernames/' + oldUsername).remove();
  }
  await db.ref('users/' + user.uid + '/profile').update({ username: newUsername });
  alert('Username updated!');
});

// Change password
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

// Delete account
deleteAccountBtn && (deleteAccountBtn.onclick = async () => {
  const user = auth.currentUser;
  if (user && confirm('Are you sure you want to delete your account?')) {
    // Remove username mapping
    const profileSnap = await db.ref('users/' + user.uid + '/profile').once('value');
    const username = profileSnap.val()?.username;
    if (username) {
      await db.ref('usernames/' + username).remove();
    }
    await db.ref('users/' + user.uid).remove();
    user.delete().catch(e => alert(e.message));
  }
});

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
  draw();

  // If hero dies, reset HP and respawn wave (no game over)
  if (gameState.hero.hp <= 0) {
    gameState.hero.hp = gameState.hero.maxHp;
    gameState.enemies = [];
    spawnWave(gameState.wave);
    // Optionally show a message or animation here
  }

  requestAnimationFrame(gameLoop);
}

// --- Drawing ---
function draw() {
  ctx.clearRect(0, 0, 400, 400);

  // Draw hero
  ctx.fillStyle = "#4af";
  ctx.beginPath();
  ctx.arc(gameState.hero.x, gameState.hero.y, 20, 0, Math.PI * 2);
  ctx.fill();

  // Draw hero HP bar
  drawHpBar(
    gameState.hero.x - 25,
    gameState.hero.y - 32,
    50,
    6,
    gameState.hero.hp,
    gameState.hero.maxHp
  );

  // Draw enemies
  ctx.fillStyle = "#a44";
  for (const enemy of gameState.enemies) {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemy HP bar
    drawHpBar(
      enemy.x - 18,
      enemy.y - 25,
      36,
      5,
      enemy.hp,
      20 + gameState.wave * 5 // If you add enemy.maxHp, use that instead
    );
  }
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