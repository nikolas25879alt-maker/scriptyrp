// ── PARTICLES ──
for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    const red  = Math.random() > 0.5;
    p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}vw;
        background:${red ? '#ff2222' : '#fff'};
        box-shadow: 0 0 ${size*3}px ${red ? '#ff0000' : '#ffffff'};
        animation-duration:${Math.random()*20+15}s;
        animation-delay:${Math.random()*20}s;
    `;
    document.body.appendChild(p);
}

// ── OVERLAY ──
const overlay  = document.getElementById('overlay');
const mainCard = document.getElementById('main-card');
const music    = document.getElementById('bg-music');

overlay.addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        mainCard.style.display = 'block';
        music.volume = 0.25;
        music.play().catch(() => {});
        try { if (typeof incrementCounter === 'function') incrementCounter(); } catch(e) { /* noop */ }
    }, 900);
});

// ── MUSIC CONTROLLER ──
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon     = document.getElementById('play-icon');
const pauseIcon    = document.getElementById('pause-icon');
const volumeSlider = document.getElementById('volume-slider');
const musicCtrl    = document.querySelector('.music-controller');

overlay.addEventListener('click', () => {
    musicCtrl.classList.add('visible');
});

playPauseBtn.addEventListener('click', () => {
    if (music.paused) {
        music.play();
        playIcon.style.display  = 'none';
        pauseIcon.style.display = 'block';
    } else {
        music.pause();
        playIcon.style.display  = 'block';
        pauseIcon.style.display = 'none';
    }
});

volumeSlider.addEventListener('input', e => {
    music.volume = e.target.value;
});

// ── COUNTER ──
const workspaceName = 'scriptyw';
const counterName = 'scriptyc';

function incrementCounter() {
    fetch(`https://api.counterapi.dev/v2/${workspaceName}/${counterName}/up`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(json => {
            const views = json?.data?.up_count ?? json?.value ?? json?.count;
            const el = document.getElementById('count-display');
            if (el) el.innerText = views != null ? Number(views).toLocaleString() : '...';
        })
        .catch(err => {
            console.error("Counter failed:", err);
            const el = document.getElementById('count-display');
            if (el) el.innerText = '...';
        });
}
window.incrementCounter = incrementCounter;


// ── CARD TILT ──
(function(){
    const card = mainCard;
    if (!card) return;

    let lastMouse = 0;
    const target = { rotX: 0, rotY: 0 };
    const state  = { rotX: 0, rotY: 0 };

    function onMouseMove(e) {
        const rect = card.getBoundingClientRect();
        if (!rect.width) return;
        const dx = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
        const dy = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
        target.rotX = dy * -7;
        target.rotY = dx *  7;
        lastMouse = Date.now();
    }

    card.addEventListener('mousemove',  onMouseMove);
    card.addEventListener('mouseenter', () => card.style.boxShadow = '0 40px 100px rgba(0,0,0,0.8), 0 0 60px rgba(255,0,0,0.15)');
    card.addEventListener('mouseleave', () => { target.rotX = 0; target.rotY = 0; card.style.boxShadow = ''; });

    if (window.DeviceOrientationEvent) {
        const handler = e => {
            if (Date.now() - lastMouse < 400) return;
            target.rotY = ((e.gamma || 0) / 90) * 15;
            target.rotX = ((e.beta  || 0) / 90) * -15;
        };
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            window.addEventListener('touchstart', function req() {
                DeviceOrientationEvent.requestPermission()
                    .then(r => { if (r === 'granted') window.addEventListener('deviceorientation', handler); })
                    .catch(() => {});
                window.removeEventListener('touchstart', req);
            }, { passive: true });
        } else {
            window.addEventListener('deviceorientation', handler);
        }
    }

    (function animate() {
        state.rotX += (target.rotX - state.rotX) * 0.15;
        state.rotY += (target.rotY - state.rotY) * 0.15;
        card.style.transform = `perspective(1000px) rotateX(${state.rotX}deg) rotateY(${state.rotY}deg)`;
        requestAnimationFrame(animate);
    })();
})();

// ── DISCORD PRESENCE ──
const discordId = "1355667967542694179";

function updateDiscordStatus() {
    fetch(`https://api.lanyard.rest/v1/users/${discordId}`)
        .then(res => res.json())
        .then(data => {
            const { discord_status, activities, discord_user } = data.data;

            const dot = document.getElementById('status-dot');
            if (dot) dot.className = `status-dot ${discord_status}`;

            const nameEl = document.getElementById('pres-name');
            if (nameEl) nameEl.innerText = discord_user.global_name || discord_user.username;

            const activity = activities.find(a => a.type === 0) || activities[0];
            const actEl = document.getElementById('pres-activity');
            if (actEl) actEl.innerText = activity
                ? (activity.name === "Custom Status" ? activity.state : `Playing ${activity.name}`)
                : discord_status.toUpperCase();
        })
        .catch(() => {
            const actEl = document.getElementById('pres-activity');
            if (actEl) actEl.innerText = "OFFLINE";
        });
}

setInterval(updateDiscordStatus, 30000);
updateDiscordStatus();

// ── CUSTOM CURSOR + TRAIL ──
const cursorEl = document.getElementById('cursor-img');
let lastTrail  = 0;
let trailCount = 0;
const MAX_TRAIL = 100;

document.addEventListener('mousemove', e => {
    const x = e.clientX, y = e.clientY;
    cursorEl.style.left = x + 'px';
    cursorEl.style.top  = y + 'px';

    const now = Date.now();
    if (now - lastTrail > 18 && trailCount < MAX_TRAIL) {
        lastTrail = now;
        spawnTrail(x, y);
    }
});

function spawnTrail(x, y) {
    trailCount++;
    const t    = document.createElement('div');
    const size = 26 - (trailCount % 8) * 1.5;
    t.style.cssText = `
        position:fixed;
        left:${x}px; top:${y}px;
        width:${size}px; height:${size}px;
        transform: translate(-50%, -50%);
        opacity:0.55;
        pointer-events:none;
        z-index:99996;
    `;
    t.innerHTML = '<img src="assets/cursorr.png" alt="" style="width:100%;height:100%;object-fit:contain;">';
    document.body.appendChild(t);

    setTimeout(() => {
        t.style.transition = 'opacity 0.75s ease, transform 0.75s ease';
        t.style.opacity    = '0';
        t.style.transform  = 'translate(-50%, -50%) scale(0.15)';
    }, 60);

    setTimeout(() => { t.remove(); trailCount--; }, 250);
}
