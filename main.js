import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, get, update, remove }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const FB_CONFIG = {
  apiKey:            "AIzaSyB8rFWOxvBGiB37VaprVcCJkxvTds27Xr0",
  authDomain:        "scripty-20c83.firebaseapp.com",
  databaseURL:       "https://scripty-20c83-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "scripty-20c83",
  storageBucket:     "scripty-20c83.appspot.com",
  messagingSenderId: "1058812345678",
  appId:             "1:1058812345678:web:abcdef1234567890"
};


const DISCORD_CLIENT_ID = "1409268415650205869";
const REDIRECT_URI      = "https://scripty.my/index.html";

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1489929865988931714/b1RBqwj5xdQFII8qoKTD_O3e-pANbRnDakiCzbLHkhBXnZ5Vf8CLJgEzhSHkt_Zk8-kF';

const DOWNLOADS = {
  discordnuker:           { name: 'Discord Nuker',      url: 'https://scripty.my/files/discordnuker.exe' },
  minecraft:        { name: 'Minecraft Mod',      url: 'https://scripty.my/files/minecraft.exe' },
  rl:               { name: 'Rocket League Mod',  url: 'https://scripty.my/files/rl.exe' },
  emailbomber:      { name: 'Email Bomber',       url: 'https://scripty.my/files/emailbomber.exe' },
};

const TTL_MS = 15_000; // 15 seconds

const PROGS = {
  discordnuker:      { name: 'Discord Nuker',             prefix: 'dn' },
  minecraft:   { name: 'Minecraft Mod',             prefix: 'MCM' },
  rl:          { name: 'Rocket League Mod',         prefix: 'RLM' },
  emailbomber: { name: 'Email Bomber',              prefix: 'emb' },
};

// ── Init ──────────────────────────────────────
const app = initializeApp(FB_CONFIG);
const db  = getDatabase(app);

let me      = null;   
let license = null;   
const timers = {};   

// ── Expose globals so onclick= works ──────────
window.startDiscordLogin = () => {
  const p = new URLSearchParams({ client_id: DISCORD_CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'token', scope: 'identify' });
  location.href = `https://discord.com/api/oauth2/authorize?${p}`;
};
window.doLogout    = logout;
window.doGenerate  = generateToken;
window.doCopy      = copyToken;
window.doDownload = doDownload;

async function doDownload(pid) {
  if (!me || !license) return;
  if (!license.programs.includes(pid)) return toast('🔒', 'No license for this program');
  const d = DOWNLOADS[pid];
  toast('⬇', `Downloading ${d.name}...`);
  // log to webhook
  sendWebhook(0x00d4aa, '⬇ Download', [
    { name: 'User',    value: `${me.username} (\`${me.id}\`)`, inline: true },
    { name: 'Program', value: d.name,                          inline: true },
  ]);
  // trigger download
  const a = document.createElement('a');
  a.href = d.url;
  a.download = '';
  a.target = '_blank';
  a.click();
}

// ═══════════════════════════════════════════════
//  DISCORD
// ═══════════════════════════════════════════════
async function fetchMe(token) {
  const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` }});
  if (!r.ok) throw new Error('Discord API error ' + r.status);
  return r.json();
}

// ═══════════════════════════════════════════════
//  LICENSE  — read from  /licenses/{userId}
// ═══════════════════════════════════════════════
async function fetchLicense(uid) {
  const snap = await get(ref(db, `licenses/${uid}`));
  return snap.exists() ? snap.val() : null;
}

// ═══════════════════════════════════════════════
//  TOKEN GENERATION
// ═══════════════════════════════════════════════
function randId(n = 22) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({length:n}, () => a[Math.random()*a.length|0]).join('');
}

async function generateToken(pid) {
  if (!me || !license) return;
  if (!license.programs.includes(pid)) return toast('❌', 'No license for ' + PROGS[pid].name);

  const btn = document.getElementById('gb-' + pid);
  btn.disabled = true;
  btn.textContent = 'Saving to database…';

  // Kill any existing countdown for this program
  killCountdown(pid);

  const tokenStr = `${PROGS[pid].prefix}-${randId()}`;
  const issuedAt = Date.now();

  fbPill(pid, 'saving', 'Writing to database…');
  try {
    await set(ref(db, `tokens/${tokenStr}`), {
      userId:   me.id,
      username: me.username,
      program:  pid,
      issuedAt: issuedAt,
      used:     false,
    });
    fbPill(pid, 'saved', '✓ Use within 15s');
  } catch (e) {
    fbPill(pid, 'dead', 'Database write failed');
    btn.disabled = false;
    btn.textContent = '⚡ Retry';
    return toast('❌', 'DB error: ' + e.message);
  }

  // ── Show token in UI ──
  const tv = document.getElementById('tv-' + pid);
  tv.textContent = tokenStr;
  tv.className = 'token-val';

  const box = document.getElementById('box-' + pid);
  box.className = 'token-box active glow-anim';
  setTimeout(() => box.classList.remove('glow-anim'), 800);

  const cp = document.getElementById('cp-' + pid);
  cp.style.display = '';
  cp.textContent = 'Copy';
  cp.className = 'btn-copy';

  // Auto-copy
  navigator.clipboard.writeText(tokenStr).catch(() => {});

  btn.disabled = false;
  btn.textContent = '🔄 Regenerate';

  toast('✅', 'Generated & auto-copied! You have 15 seconds.');
  sendWebhook(0x5865F2, '🔑 Token Generated', [
    { name: 'User',    value: `${me.username} (\`${me.id}\`)`, inline: true },
    { name: 'Program', value: PROGS[pid].name,                 inline: true },
    { name: 'Token',   value: `\`${tokenStr}\``,               inline: false },
  ]);

  // ── Countdown ──
  startCountdown(pid, tokenStr, issuedAt);
}

// ═══════════════════════════════════════════════
//  COUNTDOWN + EXPIRY
// ═══════════════════════════════════════════════
function startCountdown(pid, tokenStr, issuedAt) {
  document.getElementById('cd-' + pid).style.display = 'block';

  const numEl = document.getElementById('cdn-' + pid);
  const barEl = document.getElementById('cdb-' + pid);
  const boxEl = document.getElementById('box-' + pid);
  const tvEl  = document.getElementById('tv-' + pid);

  const iv = setInterval(() => {
    const elapsed = Date.now() - issuedAt;
    const remain  = Math.max(0, TTL_MS - elapsed);
    const secs    = Math.ceil(remain / 1000);
    const pct     = (remain / TTL_MS) * 100;

    numEl.textContent = secs + 's';
    const cls = secs > 8 ? 'safe' : secs > 4 ? 'warn' : 'danger';
    numEl.className = 'cd-num ' + cls;
    barEl.className = 'bar-fill ' + cls;
    barEl.style.width = pct + '%';
    boxEl.className = 'token-box ' + (cls === 'safe' ? 'active' : cls);

    if (remain <= 0) {
      clearInterval(iv);
      expireToken(pid, tokenStr);
    }
  }, 200);

  const to = setTimeout(() => expireToken(pid, tokenStr), TTL_MS + 300);
  timers[pid] = { iv, to };
}

function killCountdown(pid) {
  if (timers[pid]) {
    clearInterval(timers[pid].iv);
    clearTimeout(timers[pid].to);
    delete timers[pid];
  }
  document.getElementById('cd-' + pid).style.display = 'none';
}

async function expireToken(pid, tokenStr) {
  killCountdown(pid);

  // Mark expired in DB then hard-delete after 3 s
  try {
    await update(ref(db, `tokens/${tokenStr}`), { expired: true });
    setTimeout(() => remove(ref(db, `tokens/${tokenStr}`)).catch(()=>{}), 3000);
  } catch { /* ignore */ }

  document.getElementById('tv-' + pid).className = 'token-val expired';
  document.getElementById('box-' + pid).className = 'token-box danger';
  document.getElementById('cp-' + pid).style.display = 'none';
  document.getElementById('gb-' + pid).textContent = '⚡ Generate New Token';
  fbPill(pid, 'dead', '⛔ Expired & deleted from database');

  toast('⛔', 'Token expired — generate a new one');
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
function fbPill(pid, type, text) {
  const el = document.getElementById('fb-' + pid);
  const tx = document.getElementById('fb-' + pid + '-txt');
  el.className = 'fb-pill show ' + type;
  tx.textContent = text;
}

function copyToken(pid) {
  const tv = document.getElementById('tv-' + pid);
  if (tv.classList.contains('expired') || tv.classList.contains('empty')) return;
  navigator.clipboard.writeText(tv.textContent).then(() => {
    const btn = document.getElementById('cp-' + pid);
    btn.textContent = 'Copied!';
    btn.classList.add('ok');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('ok'); }, 2000);
    toast('📋', 'Copied to clipboard');
  });
}

let toastT;
function toast(icon, msg) {
  document.getElementById('t-icon').textContent = icon;
  document.getElementById('t-msg').textContent  = msg;
  const el = document.getElementById('toast');
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 3500);
}
async function sendWebhook(color, title, fields) {
  if (!WEBHOOK_URL.includes('discord.com')) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title,
          color,
          fields,
          footer: { text: 'TokenVault' },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch(e) { }
}

function showView(v) {
  document.getElementById('loading').style.display        = v==='loading'   ? 'flex'  : 'none';
  document.getElementById('login-view').style.display     = v==='login'     ? 'flex'  : 'none';
  document.getElementById('dashboard-view').style.display = v==='dash'      ? 'block' : 'none';
}

function logout() {
  Object.keys(timers).forEach(killCountdown);
  sessionStorage.clear();
  me = license = null;
  history.replaceState(null,'',location.pathname);
  document.getElementById('nav-avatar').style.display = 'none';
  document.getElementById('nav-username').textContent = '';
  document.getElementById('btn-logout').style.display = 'none';
  showView('login');
}

// ═══════════════════════════════════════════════
//  RENDER DASHBOARD
// ═══════════════════════════════════════════════
function renderDash(user, lic) {
  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  // Nav
  const na = document.getElementById('nav-avatar');
  na.src = avatar; na.style.display = 'block';
  document.getElementById('nav-username').textContent = user.username;
  document.getElementById('btn-logout').style.display = '';

  // Profile card
  document.getElementById('profile-avatar').src = avatar;
  document.getElementById('profile-name').textContent = user.global_name || user.username;
  document.getElementById('profile-tag').textContent  = '@' + user.username;
  document.getElementById('badge-id').textContent     = 'ID: ' + user.id;

  const bl = document.getElementById('badge-lic');
  if (lic) {
    bl.textContent = '✓ Licensed';
    bl.className = 'badge licensed';
    function formatExpiry(exp) {
        if (!exp || exp === 'Never') return `<span style="color:var(--teal)">♾ Lifetime</span>`;
        const diff = Math.ceil((new Date(exp) - new Date()) / (1000 * 60 * 60 * 24));
        const fmt = new Date(exp).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
        if (diff < 0)   return `<span style="color:var(--red)">✗ Expired ${Math.abs(diff)}d ago</span>`;
        if (diff <= 7)  return `<span style="color:var(--red)">⚠ ${diff}d left · ${fmt}</span>`;
        if (diff <= 30) return `<span style="color:var(--amber)">⚡ ${diff}d left · ${fmt}</span>`;
        return `<span style="color:var(--green)">✓ ${diff}d left · ${fmt}</span>`;
    }
    document.getElementById('profile-meta').innerHTML = `Programs ${lic.programs.length}/4<br>Expires ${formatExpiry(lic.expires)}`;
  } else {
    bl.textContent = '✗ No License';
    bl.className = 'badge no-license';
    document.getElementById('profile-meta').innerHTML =
      `<span style="color:var(--red)">Contact support to purchase access</span>`;
  }

  // Lock overlays
  for (const pid of Object.keys(PROGS)) {
    const card = document.getElementById('card-' + pid);
    card.querySelectorAll('.lock-overlay').forEach(e => e.remove());
    const dlBtn = document.getElementById(`dl-${pid}`);
    if (dlBtn) dlBtn.disabled = !lic || !lic.programs.includes(pid);
    if (!lic || !lic.programs.includes(pid)) {
      const o = document.createElement('div');
      o.className = 'lock-overlay';
      o.innerHTML = `<div class="lock">🔒</div>
        <p><strong>No License</strong>You don't have access to this program.</p>`;
      card.appendChild(o);
    }
  }

  showView('dash');
}

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
async function init() {
  // Check for Discord OAuth token in URL hash
  const params = new URLSearchParams(location.hash.slice(1));
  const oauthToken = params.get('access_token');

  if (oauthToken) {
    history.replaceState(null, '', location.pathname);
    showView('loading');
    try {
      me      = await fetchMe(oauthToken);
      license = await fetchLicense(me.id);
      sessionStorage.setItem('me',  JSON.stringify(me));
      sessionStorage.setItem('lic', JSON.stringify(license));
      renderDash(me, license);
    } catch (e) {
      toast('❌', 'Auth error: ' + e.message);
      showView('login');
    }
    return;
  }

  const saved = sessionStorage.getItem('me');
  if (saved) {
      me = JSON.parse(saved);
      showView('loading');
      try {
          license = await fetchLicense(me.id);  
          sessionStorage.setItem('lic', JSON.stringify(license));
          renderDash(me, license);
      } catch(e) {
          toast('⚠️', 'Could not refresh license');
          license = JSON.parse(sessionStorage.getItem('lic'));
          renderDash(me, license);
      }
      return;
  }

  showView('login');
}

init();
