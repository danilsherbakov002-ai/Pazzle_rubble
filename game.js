/* ==========================================================
   PUZZLE MASTER 4.0 — DUAL MODE ENGINE
   Пазлы (снап 15px+, IndexedDB, PeerJS) + Пиксель-арт
   (zoom/pinch, бустеры, экономика, генераторы 32/48)
   ========================================================== */

function el(id) { return document.getElementById(id); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function st() { return window.gameSettings || {}; }
function fmt(n) { return n.toLocaleString('ru-RU'); }

var STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.26 6.6.56-5 4.4 1.5 6.5L12 16.9 5.99 19.7l1.5-6.5-5-4.4 6.6-.56z"/></svg>';

/* ================= ЗВУК (WebAudio) ================= */
var audio = {
    ctx: null, enabled: true, musicEnabled: true, musicNodes: null,
    init: function () {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.5;
            this.master.connect(this.ctx.destination);
        } catch (e) {}
    },
    resume: function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone: function (freq, dur, type, vol, when, slide) {
        if (!this.ctx) return;
        var o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(this.master);
        o.type = type || 'sine';
        var t = this.ctx.currentTime + (when || 0);
        o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol || 0.25, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.01, t + dur);
        o.start(t); o.stop(t + dur + 0.02);
    },
    playClick: function () { if (this.enabled) { this.resume(); this.tone(760, 0.07, 'sine', 0.22, 0, 420); } },
    playPickup: function () { if (this.enabled) { this.resume(); this.tone(300, 0.1, 'triangle', 0.22, 0, 620); } },
    playSnap: function () {
        if (!this.enabled) return; this.resume();
        this.tone(880, 0.16, 'sine', 0.25); this.tone(1320, 0.16, 'sine', 0.16);
        this.tone(1760, 0.22, 'sine', 0.1, 0.06);
    },
    playError: function () { if (this.enabled) { this.resume(); this.tone(190, 0.16, 'sawtooth', 0.12, 0, 110); } },
    playCoin: function () { if (this.enabled) { this.resume(); this.tone(980, 0.08, 'square', 0.12); this.tone(1470, 0.16, 'square', 0.1, 0.07); } },
    playBoost: function () { if (this.enabled) { this.resume(); this.tone(240, 0.25, 'sine', 0.25, 0, 900); } },
    playVictory: function () {
        if (!this.enabled) return; this.resume();
        var m = [[523,0,.15],[659,.15,.15],[784,.3,.15],[1046,.45,.4],[784,.7,.15],[1046,.85,.6]];
        for (var i = 0; i < m.length; i++) this.tone(m[i][0], m[i][2], 'sine', 0.28, m[i][1]);
    },
    startMusic: function () {
        if (!this.musicEnabled || !this.ctx || this.musicNodes) return;
        this.resume();
        var g = this.ctx.createGain(); g.gain.value = 0.035; g.connect(this.master);
        var nodes = [130.81, 164.81, 196, 261.63].map(function (f) {
            var o = this.ctx.createOscillator(), og = this.ctx.createGain();
            o.connect(og); og.connect(g); o.type = 'sine'; o.frequency.value = f; og.gain.value = 0.25;
            var lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
            lfo.connect(lg); lg.connect(o.frequency); lfo.frequency.value = 0.12 + Math.random() * 0.2; lg.gain.value = 2;
            o.start(); lfo.start();
            return { o: o, l: lfo };
        }, this);
        this.musicNodes = { g: g, nodes: nodes };
    },
    stopMusic: function () {
        if (!this.musicNodes) return;
        this.musicNodes.nodes.forEach(function (n) { try { n.o.stop(); n.l.stop(); } catch (e) {} });
        this.musicNodes.g.disconnect();
        this.musicNodes = null;
    },
    setSFX: function (v) { this.enabled = v; },
    setMusic: function (v) { this.musicEnabled = v; if (v) this.startMusic(); else this.stopMusic(); }
};
document.addEventListener('touchstart', function () { audio.init(); audio.resume(); }, { once: true });
document.addEventListener('click', function () { audio.init(); audio.resume(); }, { once: true });

/* ================= НАСТРОЙКИ / ЭКОНОМИКА ================= */
var DEFAULT_SETTINGS = { sfx: true, music: true, vibration: true, targetGlow: true };
function getSettings() {
    var s = {}; try { s = JSON.parse(localStorage.getItem('pm_settings') || '{}'); } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS, s);
}
function updateSetting(k, v) {
    var s = getSettings(); s[k] = v;
    localStorage.setItem('pm_settings', JSON.stringify(s));
    applySettings(s);
}
function applySettings(s) {
    audio.setSFX(s.sfx); audio.setMusic(s.music);
    window.gameSettings = s;
}
function loadSettingsUI() {
    var s = getSettings();
    el('setting-sfx').checked = s.sfx;
    el('setting-music').checked = s.music;
    el('setting-vibration').checked = s.vibration;
    el('setting-targetglow').checked = s.targetGlow;
    applySettings(s);
}
function vibrate(p) { if (st().vibration && navigator.vibrate) navigator.vibrate(p); }

function getCoins() { return parseInt(localStorage.getItem('pm_coins') || '0', 10) || 0; }
function setCoins(n) { localStorage.setItem('pm_coins', String(n)); updateCoinsUI(); }
function addCoins(n) { setCoins(getCoins() + n); }
function spendCoins(n) {
    if (getCoins() < n) { toast('Недостаточно монет'); return false; }
    setCoins(getCoins() - n); audio.playCoin(); return true;
}
function isGod() { return localStorage.getItem('pm_god') === '1'; }
function getBoosters() {
    var b = { bomb: 0, bucket: 0, lens: 0 };
    try { b = Object.assign(b, JSON.parse(localStorage.getItem('pm_boost') || '{}')); } catch (e) {}
    if (isGod()) { b.bomb = 999; b.bucket = 999; b.lens = 999; }
    return b;
}
function setBoosters(b) { localStorage.setItem('pm_boost', JSON.stringify(b)); }
var BOOST_PRICE = { bomb: 150, bucket: 300, lens: 100 };

function updateCoinsUI() {
    var c = fmt(getCoins());
    el('coin-count-menu').textContent = c;
    el('coin-count-pixel').textContent = c;
    el('coin-count-settings').textContent = c;
    var b = getBoosters(), g = isGod();
    el('bs-bomb-n').textContent = g ? '∞' : b.bomb;
    el('bs-bucket-n').textContent = g ? '∞' : b.bucket;
    el('bs-lens-n').textContent = g ? '∞' : b.lens;
    el('shop-bomb-n').textContent = '×' + (g ? '∞' : b.bomb);
    el('shop-bucket-n').textContent = '×' + (g ? '∞' : b.bucket);
    el('shop-lens-n').textContent = '×' + (g ? '∞' : b.lens);
    el('god-badge').classList.toggle('hidden', !g);
}

function toast(text, gold) {
    var t = el('toast');
    t.textContent = text;
    t.classList.toggle('gold', !!gold);
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.add('hidden'); }, 3200);
}

function applyPromo() {
    var v = (el('promo-input').value || '').trim();
    if (v.toLowerCase() === 'goodofax') {
        addCoins(999999);
        localStorage.setItem('pm_god', '1');
        setBoosters({ bomb: 999, bucket: 999, lens: 999 });
        updateCoinsUI();
        audio.playVictory(); vibrate([60, 60, 60, 60, 120]);
        toast('God Mode Activated! Welcome, Goodofax', true);
        el('promo-input').value = '';
    } else {
        audio.playError();
        toast('Неверный промокод');
    }
}

function buyBooster(name) {
    if (isGod()) { toast('God Mode: бустеры бесконечны', true); return; }
    if (spendCoins(BOOST_PRICE[name])) {
        var b = getBoosters(); b[name]++; setBoosters(b);
        updateCoinsUI(); audio.playBoost();
        toast('Куплено: ' + name);
    }
}

function resetProgress() {
    if (confirm('Сбросить прогресс, монеты и бустеры?')) {
        localStorage.removeItem('pm_progress');
        localStorage.removeItem('pm_coins');
        localStorage.removeItem('pm_boost');
        localStorage.removeItem('pm_god');
        LEVELS.forEach(function (l) { l.stars = 0; l.completed = false; l.locked = l.id > 3; });
        updateCoinsUI(); updateMenuStats();
        showScreen('screen-menu');
        toast('Прогресс сброшен');
    }
}

/* ================= НАВИГАЦИЯ ================= */
function showScreen(id) {
    audio.playClick();
    var s = document.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) s[i].classList.remove('active');
    el(id).classList.add('active');
    if (id === 'screen-menu') { updateMenuStats(); updateCoinsUI(); }
    if (id === 'screen-gallery') renderGallery();
    if (id === 'screen-pixel') renderPixelLobby();
    if (id === 'screen-settings') { loadSettingsUI(); updateCoinsUI(); }
    if (id !== 'screen-pixel-game') PX.active = false;
}

/* ================= УРОВНИ ПАЗЛОВ ================= */
var LEVELS = [
    { id: 1, name: 'Горный рассвет', category: 'nature', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&h=800&fit=crop', locked: false, stars: 0, completed: false },
    { id: 2, name: 'Лесное озеро', category: 'nature', image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=800&h=800&fit=crop', locked: false, stars: 0, completed: false },
    { id: 3, name: 'Закат над полем', category: 'nature', image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800&h=800&fit=crop', locked: false, stars: 0, completed: false },
    { id: 4, name: 'Северное сияние', category: 'nature', image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 5, name: 'Неоновый город', category: 'cyber', image: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 6, name: 'Мегаполис ночью', category: 'cyber', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 7, name: 'Токио', category: 'cyber', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 8, name: 'Лев', category: 'animals', image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 9, name: 'Лиса', category: 'animals', image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 10, name: 'Кот', category: 'animals', image: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 11, name: 'Туманность', category: 'space', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false },
    { id: 12, name: 'Земля', category: 'space', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&h=800&fit=crop', locked: true, stars: 0, completed: false }
];
var CATS = [
    { id: 'all', name: 'Все' }, { id: 'nature', name: 'Природа' }, { id: 'cyber', name: 'Город' },
    { id: 'animals', name: 'Животные' }, { id: 'space', name: 'Космос' }, { id: 'custom', name: 'Мои фото' }
];

function getLevels() {
    var saved = {}; try { saved = JSON.parse(localStorage.getItem('pm_progress') || '{}'); } catch (e) {}
    return LEVELS.map(function (l) { return saved[l.id] ? Object.assign({}, l, saved[l.id]) : l; });
}
function saveLevelProgress(id, data) {
    if (typeof id !== 'number') return;
    var s = {}; try { s = JSON.parse(localStorage.getItem('pm_progress') || '{}'); } catch (e) {}
    s[id] = Object.assign({}, s[id], data);
    localStorage.setItem('pm_progress', JSON.stringify(s));
}
function unlockNextLevels(id) {
    var idx = -1;
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) idx = i;
    if (idx < 0) return;
    for (var k = 1; k <= 2; k++) if (LEVELS[idx + k]) saveLevelProgress(LEVELS[idx + k].id, { locked: false });
}
function getTotalStars() { return getLevels().reduce(function (s, l) { return s + (l.stars || 0); }, 0); }
function getTotalCompleted() { return getLevels().filter(function (l) { return l.completed; }).length; }
function updateMenuStats() {
    el('total-stars').textContent = getTotalStars();
    el('total-completed').textContent = getTotalCompleted();
}

/* ================= ГАЛЕРЕЯ + INDEXEDDB ================= */
var currentCategory = 'all';

function renderGallery() {
    var tabs = el('category-tabs'); tabs.innerHTML = '';
    CATS.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'category-tab' + (c.id === currentCategory ? ' active' : '');
        b.textContent = c.name;
        b.onclick = function () { currentCategory = c.id; audio.playClick(); renderGallery(); };
        tabs.appendChild(b);
    });
    if (currentCategory === 'custom') { renderCustomPhotos(); return; }
    var grid = el('levels-grid'); grid.innerHTML = '';
    getLevels().filter(function (l) { return currentCategory === 'all' || l.category === currentCategory; })
        .forEach(function (lv, i) {
            var card = document.createElement('div');
            card.className = 'level-card' + (lv.locked ? ' locked' : '');
            card.style.animationDelay = (i * 0.04) + 's';
            var img = document.createElement('img');
            img.className = 'level-card-img'; img.loading = 'lazy'; img.src = lv.image; img.alt = lv.name;
            var ov = document.createElement('div');
            ov.className = 'level-card-overlay';
            var stars = '';
            for (var s = 1; s <= 3; s++) stars += STAR_SVG.replace('<svg', '<svg class="' + ((lv.stars || 0) >= s ? 'filled' : '') + '"');
            ov.innerHTML = '<div class="level-card-name">' + lv.name + '</div><div class="level-card-stars">' + stars + '</div>';
            card.appendChild(img); card.appendChild(ov);
            if (!lv.locked) card.onclick = function () { selectLevel(lv); };
            grid.appendChild(card);
        });
}

function selectLevel(lv) {
    audio.playClick();
    currentLevel = lv;
    el('difficulty-preview-img').src = lv.image;
    el('difficulty-level-name').textContent = lv.name;
    showScreen('screen-difficulty');
}

function idbOpen() {
    return new Promise(function (res, rej) {
        var rq = indexedDB.open('puzzleMasterDB', 1);
        rq.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        };
        rq.onsuccess = function (e) { res(e.target.result); };
        rq.onerror = function (e) { rej(e.target.error); };
    });
}
function idbPut(rec) {
    return idbOpen().then(function (db) { return new Promise(function (res, rej) {
        var tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').put(rec);
        tx.oncomplete = function () { db.close(); res(); };
        tx.onerror = function () { db.close(); rej(tx.error); };
    }); });
}
function idbAll() {
    return idbOpen().then(function (db) { return new Promise(function (res, rej) {
        var tx = db.transaction('photos', 'readonly');
        var rq = tx.objectStore('photos').getAll();
        rq.onsuccess = function () { db.close(); res(rq.result || []); };
        rq.onerror = function () { db.close(); rej(rq.error); };
    }); });
}
function idbDel(id) {
    return idbOpen().then(function (db) { return new Promise(function (res, rej) {
        var tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').delete(id);
        tx.oncomplete = function () { db.close(); res(); };
        tx.onerror = function () { db.close(); rej(tx.error); };
    }); });
}

function renderCustomPhotos() {
    var grid = el('levels-grid'); grid.innerHTML = '';
    idbAll().then(function (list) {
        list.sort(function (a, b) { return b.createdAt - a.createdAt; });
        if (!list.length) {
            grid.innerHTML = '<p class="hint-text" style="grid-column:1/-1;text-align:center;padding:30px 0;">Пока пусто. Нажмите на камеру, чтобы добавить фото — оно сохранится навсегда.</p>';
            return;
        }
        list.forEach(function (rec, i) {
            var card = document.createElement('div');
            card.className = 'level-card';
            card.style.animationDelay = (i * 0.04) + 's';
            var img = document.createElement('img');
            img.className = 'level-card-img'; img.src = rec.thumb || IMG_FALLBACK;
            var ov = document.createElement('div');
            ov.className = 'level-card-overlay';
            ov.innerHTML = '<div class="level-card-name">' + rec.name + '</div>';
            var del = document.createElement('button');
            del.className = 'btn-icon';
            del.style.cssText = 'position:absolute;top:8px;right:8px;width:32px;height:32px;z-index:6';
            del.innerHTML = '<svg class="ic" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
            del.onclick = function (e) {
                e.stopPropagation();
                if (confirm('Удалить фото?')) idbDel(rec.id).then(function () { renderCustomPhotos(); });
            };
            card.appendChild(img); card.appendChild(ov); card.appendChild(del);
            card.onclick = function () {
                selectLevel({ id: 'photo-' + rec.id, name: rec.name, category: 'custom', image: URL.createObjectURL(rec.blob), locked: false, stars: 0, completed: false });
            };
            grid.appendChild(card);
        });
    }).catch(function () {
        grid.innerHTML = '<p class="hint-text" style="grid-column:1/-1;text-align:center;padding:30px 0;">IndexedDB недоступен.</p>';
    });
}

function addCustomPhoto() { audio.playClick(); el('photo-input').click(); }

function handlePhotoUpload(event) {
    var file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
        var side = Math.min(img.width, img.height);
        var full = document.createElement('canvas');
        full.width = 1080; full.height = 1080;
        full.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 1080, 1080);
        var th = document.createElement('canvas');
        th.width = 240; th.height = 240;
        th.getContext('2d').drawImage(full, 0, 0, 240, 240);
        full.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            idbPut({
                id: Date.now(),
                name: (file.name || 'Фото').replace(/\.[^/.]+$/, '').slice(0, 22) || 'Фото',
                createdAt: Date.now(),
                thumb: th.toDataURL('image/jpeg', 0.7),
                blob: blob
            }).then(function () {
                audio.playSnap(); vibrate(30);
                toast('Фото сохранено');
                currentCategory = 'custom';
                showScreen('screen-gallery');
            }).catch(function () { toast('Ошибка сохранения'); });
        }, 'image/jpeg', 0.85);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Не удалось прочитать файл'); };
    img.src = url;
}

/* ================= ДВИЖОК ПАЗЛОВ ================= */
var DRAG_LIFT = 48, COMBO_WINDOW = 6000, FX_MAX = 220;
var currentLevel = null, gridSize = 4, pieces = [], placedCount = 0, moves = 0, zTop = 10;
var dragging = null, areaRect = null, boardX = 0, boardY = 0, boardSize = 0, cellSize = 0;
var sourceCanvas = null, boardCache = null, hintOn = false, combo = 0, lastPlaceTime = 0;
var timerInterval = null, elapsedMs = 0, lastTick = 0, paused = false;
var fxCanvas = null, fxCtx = null, fxParts = [], fxRaf = null;

function snapRadius() { return clamp(cellSize * 0.35, 15, 40); }

function startGame(grid) { audio.playClick(); initGame({ grid: grid, level: currentLevel, mp: false }); }

function loadSourceImage(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        var nw = img.naturalWidth, nh = img.naturalHeight, side = Math.min(nw, nh), S = 720;
        var c = document.createElement('canvas');
        c.width = S; c.height = S;
        c.getContext('2d').drawImage(img, (nw - side) / 2, (nh - side) / 2, side, side, 0, 0, S, S);
        cb(c);
    };
    img.onerror = function () {
        var S = 720, c = document.createElement('canvas');
        c.width = S; c.height = S;
        var x = c.getContext('2d');
        x.fillStyle = '#1E2130'; x.fillRect(0, 0, S, S);
        for (var i = 0; i < 24; i++) {
            x.beginPath();
            x.arc(Math.random() * S, Math.random() * S, 30 + Math.random() * 90, 0, Math.PI * 2);
            x.fillStyle = 'hsla(' + (225 + Math.random() * 40) + ',45%,' + (30 + Math.random() * 30) + '%,.5)';
            x.fill();
        }
        cb(c);
    };
    img.src = url;
}

function initGame(opts) {
    gridSize = opts.grid; currentLevel = opts.level;
    if (!opts.mp) { try { localStorage.setItem('pm_lastGrid', String(gridSize)); } catch (e) {} }
    moves = 0; placedCount = 0; combo = 0; lastPlaceTime = 0;
    el('game-moves').textContent = '0';
    el('game-timer').textContent = '00:00';
    el('game-combo').classList.add('hidden');
    hintOn = true; toggleHint(true);
    MP.active = !!opts.mp;
    MP.oppPct = 0; MP.oppFinished = false; MP.myFinished = false;
    el('mp-bars').classList.toggle('hidden', !MP.active);
    el('mp-alert').classList.add('hidden');
    updateMPBars(0);
    showScreen('screen-game');
    var area = el('game-area');
    area.classList.remove('done');
    var old = area.querySelectorAll('.piece,.float-text');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    pieces = []; fxParts = [];
    loadSourceImage(currentLevel.image, function (src) {
        sourceCanvas = src;
        layoutGame(); spawnPieces(); startTimer();
        if (audio.musicEnabled && !MP.active) audio.startMusic();
    });
}

function layoutGame() {
    var area = el('game-area'), tray = el('tray'), wrap = el('board-wrap'), canvas = el('board-canvas');
    var aW = area.clientWidth, aH = area.clientHeight;
    var trayH = clamp(Math.round(aH * 0.32), 140, 240);
    tray.style.height = trayH + 'px';
    boardSize = Math.max(160, Math.min(aW - 16, aH - trayH - 26));
    cellSize = boardSize / gridSize;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(boardSize * dpr); canvas.height = Math.round(boardSize * dpr);
    canvas.style.width = boardSize + 'px'; canvas.style.height = boardSize + 'px';
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    wrap.style.width = boardSize + 'px'; wrap.style.height = boardSize + 'px';
    boardX = wrap.offsetLeft; boardY = wrap.offsetTop;
    fxCanvas = el('fx-canvas'); fxCtx = fxCanvas.getContext('2d');
    fxCanvas.width = aW; fxCanvas.height = aH;
    buildBoardCache(dpr);
    for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        p.w = cellSize; p.h = cellSize;
        p.el.style.width = cellSize + 'px'; p.el.style.height = cellSize + 'px';
        if (p.placed) { p.x = boardX + p.col * cellSize; p.y = boardY + p.row * cellSize; }
        else { p.x = clamp(p.x, 0, aW - cellSize); p.y = clamp(p.y, 0, aH - cellSize); }
        setPieceTransform(p, false);
    }
    drawBoard(null, 0);
}

function buildBoardCache(dpr) {
    boardCache = document.createElement('canvas');
    boardCache.width = Math.round(boardSize * dpr); boardCache.height = Math.round(boardSize * dpr);
    var ctx = boardCache.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, boardSize, boardSize);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (var i = 1; i < gridSize; i++) {
        var pos = i * cellSize;
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, boardSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(boardSize, pos); ctx.stroke();
    }
}

function drawBoard(hl, a) {
    var ctx = el('board-canvas').getContext('2d');
    ctx.clearRect(0, 0, boardSize, boardSize);
    if (boardCache) ctx.drawImage(boardCache, 0, 0, boardSize, boardSize);
    if (hl && st().targetGlow) {
        var x = hl.c * cellSize, y = hl.r * cellSize;
        a = clamp(a, 0, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(110,231,183,' + (0.06 + a * 0.12) + ')';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.strokeStyle = 'rgba(110,231,183,' + (0.3 + a * 0.6) + ')';
        ctx.lineWidth = 1.5 + a * 1.5;
        ctx.shadowColor = 'rgba(110,231,183,.8)'; ctx.shadowBlur = 5 + a * 12;
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        ctx.restore();
    }
}

function spawnPieces() {
    var area = el('game-area'), tray = el('tray');
    var aW = area.clientWidth, aH = area.clientHeight, trayTop = tray.offsetTop;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var res = clamp(Math.round(cellSize * dpr), 24, 220);
    for (var r = 0; r < gridSize; r++) {
        for (var c = 0; c < gridSize; c++) {
            var pc = document.createElement('canvas');
            pc.width = res; pc.height = res;
            var sw = sourceCanvas.width / gridSize;
            pc.getContext('2d').drawImage(sourceCanvas, c * sw, r * sw, sw, sw, 0, 0, res, res);
            var div = document.createElement('div');
            div.className = 'piece';
            div.style.width = cellSize + 'px'; div.style.height = cellSize + 'px';
            div.appendChild(pc);
            var maxX = Math.max(0, aW - cellSize);
            var minY = Math.min(aH - cellSize, trayTop + 4);
            var maxY = Math.max(minY, aH - cellSize - 4);
            var piece = {
                row: r, col: c,
                x: clamp(Math.random() * maxX, 0, maxX),
                y: clamp(minY + Math.random() * (maxY - minY), 0, aH - cellSize),
                w: cellSize, h: cellSize, placed: false, el: div
            };
            div.style.zIndex = String(++zTop);
            attachPieceEvents(div, piece);
            area.appendChild(div);
            setPieceTransform(piece, false);
            pieces.push(piece);
        }
    }
}
function setPieceTransform(p, d) {
    p.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)' + (d ? ' scale(1.1)' : '');
}
function attachPieceEvents(div, piece) {
    div.addEventListener('touchstart', function (e) {
        if (piece.placed || paused) return;
        e.preventDefault();
        beginDrag(piece, e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    div.addEventListener('mousedown', function (e) {
        if (piece.placed || paused) return;
        e.preventDefault();
        beginDrag(piece, e.clientX, e.clientY);
    });
}
function beginDrag(piece, cx, cy) {
    areaRect = el('game-area').getBoundingClientRect();
    dragging = { piece: piece, offX: (cx - areaRect.left) - piece.x, offY: (cy - areaRect.top) - piece.y };
    piece.el.classList.add('dragging');
    piece.el.style.zIndex = String(++zTop);
    audio.playPickup(); vibrate(8);
}
function moveDrag(cx, cy) {
    if (!dragging) return;
    var p = dragging.piece;
    var aW = el('game-area').clientWidth, aH = el('game-area').clientHeight;
    p.x = clamp((cx - areaRect.left) - dragging.offX, 0, aW - p.w);
    p.y = clamp((cy - areaRect.top) - dragging.offY - DRAG_LIFT, 0, aH - p.h);
    setPieceTransform(p, true);
    var tx = boardX + p.col * cellSize, ty = boardY + p.row * cellSize;
    var dist = Math.hypot(p.x - tx, p.y - ty);
    var zone = cellSize * 1.4;
    if (dist < zone) drawBoard({ r: p.row, c: p.col }, 1 - dist / zone);
    else drawBoard(null, 0);
}
function endDrag() {
    if (!dragging) return;
    var p = dragging.piece;
    dragging = null;
    p.el.classList.remove('dragging');
    moves++; el('game-moves').textContent = moves;
    var tx = boardX + p.col * cellSize, ty = boardY + p.row * cellSize;
    if (Math.hypot(p.x - tx, p.y - ty) <= snapRadius()) {
        p.placed = true; p.x = tx; p.y = ty;
        p.el.classList.add('placed');
        p.el.style.transition = 'transform 110ms ease';
        setPieceTransform(p, false);
        setTimeout(function () { p.el.style.transition = ''; }, 140);
        placedCount++;
        onPlaceFX(p);
        var pct = Math.round(placedCount / (gridSize * gridSize) * 100);
        if (MP.active) { updateMPBars(pct); mpSend({ type: 'progress', pct: pct }); }
        if (placedCount === gridSize * gridSize) setTimeout(finishPuzzle, 300);
    } else {
        combo = 0; el('game-combo').classList.add('hidden');
        setPieceTransform(p, false);
    }
    drawBoard(null, 0);
}
document.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    e.preventDefault();
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
document.addEventListener('touchend', endDrag);
document.addEventListener('touchcancel', endDrag);
document.addEventListener('mousemove', function (e) { if (dragging) moveDrag(e.clientX, e.clientY); });
document.addEventListener('mouseup', endDrag);

function onPlaceFX(p) {
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    var now = performance.now();
    combo = (now - lastPlaceTime < COMBO_WINDOW) ? combo + 1 : 1;
    lastPlaceTime = now;
    var m = Math.min(combo, 5);
    fxEmitBurst(cx, cy, 8 + m * 4, 2.6 + m * 0.4);
    fxEmitRing(cx, cy, 'rgba(143,160,255,0.8)', 2.5 + m * 0.6);
    shakeBoard();
    if (combo >= 2) {
        floatText(cx, cy - 8, 'серия ×' + combo, 'combo');
        var b = el('game-combo');
        b.textContent = '· серия ×' + combo;
        b.classList.remove('hidden');
        vibrate([12, 18, 12]);
    } else vibrate([8, 24, 8]);
    audio.playSnap();
}
function fxEmitRing(x, y, color, power) {
    if (fxParts.length > FX_MAX) fxParts.splice(0, 10);
    fxParts.push({ type: 2, x: x, y: y, r: 4, vr: 2.2 + power, life: 0, max: 22, color: color });
    fxStart();
}
function fxEmitBurst(x, y, count, power) {
    var colors = ['#8FA0FF', '#E8EAF2', '#6EE7B7', '#B7BFF9'];
    for (var i = 0; i < count; i++) {
        if (fxParts.length > FX_MAX) fxParts.splice(0, 10);
        var a = Math.random() * Math.PI * 2, sp = (0.5 + Math.random()) * power;
        fxParts.push({
            type: Math.random() < 0.35 ? 1 : 0, x: x, y: y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, g: 0.12,
            life: 0, max: 30 + Math.random() * 20, size: 1.5 + Math.random() * 3,
            rot: Math.random() * 6.28, vrot: (Math.random() - 0.5) * 0.4,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    fxStart();
}
function fxStart() { if (!fxRaf) fxRaf = requestAnimationFrame(fxStep); }
function fxStep() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    var alive = [];
    for (var i = 0; i < fxParts.length; i++) {
        var p = fxParts[i];
        p.life++;
        if (p.life >= p.max) continue;
        var t = 1 - p.life / p.max;
        if (p.type === 2) {
            p.r += p.vr;
            fxCtx.save(); fxCtx.globalAlpha = t * 0.8; fxCtx.strokeStyle = p.color; fxCtx.lineWidth = 2 * t + 0.5;
            fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fxCtx.stroke(); fxCtx.restore();
        } else {
            p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.rot += p.vrot;
            fxCtx.save(); fxCtx.globalAlpha = t; fxCtx.fillStyle = p.color; fxCtx.translate(p.x, p.y);
            if (p.type === 1) { fxCtx.rotate(p.rot); fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
            else { fxCtx.beginPath(); fxCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2); fxCtx.fill(); }
            fxCtx.restore();
        }
        alive.push(p);
    }
    fxParts = alive;
    if (fxParts.length) fxRaf = requestAnimationFrame(fxStep);
    else { fxRaf = null; fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height); }
}
function floatText(x, y, text, cls) {
    var d = document.createElement('div');
    d.className = 'float-text' + (cls ? ' ' + cls : '');
    d.textContent = text;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    el('game-area').appendChild(d);
    d.addEventListener('animationend', function () { if (d.parentNode) d.parentNode.removeChild(d); });
}
function shakeBoard() {
    var w = el('board-wrap');
    w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
}

function startTimer() {
    stopTimer();
    elapsedMs = 0; paused = false; lastTick = performance.now();
    timerInterval = setInterval(function () {
        var now = performance.now();
        if (!paused) elapsedMs += now - lastTick;
        lastTick = now;
        var s = Math.floor(elapsedMs / 1000);
        el('game-timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 250);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

function pauseGame() { audio.playClick(); paused = true; el('screen-pause').classList.add('active'); }
function resumeGame() { audio.playClick(); paused = false; el('screen-pause').classList.remove('active'); }
function restartGame() {
    audio.playClick();
    el('screen-pause').classList.remove('active');
    stopTimer(); audio.stopMusic();
    var wasMP = MP.active;
    mpReset();
    if (wasMP) { showScreen('screen-menu'); return; }
    initGame({ grid: gridSize, level: currentLevel, mp: false });
}
function quitToMenu() {
    audio.playClick();
    stopTimer(); audio.stopMusic(); paused = false;
    mpSend({ type: 'bye' }); mpReset();
    PX.active = false;
    el('screen-pause').classList.remove('active');
    el('screen-victory').classList.remove('active');
    showScreen('screen-menu');
}
function toggleHint(force) {
    if (typeof force === 'boolean') hintOn = force; else { hintOn = !hintOn; audio.playClick(); }
    el('hint-overlay').classList.toggle('hidden', !hintOn);
    el('btn-hint').style.opacity = hintOn ? '1' : '0.45';
}

function finishPuzzle() {
    stopTimer(); audio.stopMusic();
    audio.playVictory(); vibrate([50, 80, 50, 80, 50]);
    var ctx = el('board-canvas').getContext('2d');
    ctx.clearRect(0, 0, boardSize, boardSize);
    ctx.drawImage(sourceCanvas, 0, 0, boardSize, boardSize);
    el('game-area').classList.add('done');
    for (var b = 0; b < 3; b++) setTimeout(function () {
        fxEmitBurst(boardX + Math.random() * boardSize, boardY + Math.random() * boardSize, 22, 4.5);
    }, b * 180);
    var sec = Math.floor(elapsedMs / 1000), total = gridSize * gridSize;
    var reward = gridSize * 15;
    if (MP.active) {
        MP.myFinished = true;
        mpSend({ type: 'finish', time: sec });
        var won = !MP.oppFinished;
        addCoins(reward);
        showEnd(won ? 'Победа' : 'Поражение', won ? 'Вы собрали первыми!' : 'Соперник оказался быстрее.', 0, reward);
        return;
    }
    var stars = 1;
    if (moves <= total * 1.7 && sec <= total * 9) stars = 3;
    else if (moves <= total * 2.6 && sec <= total * 16) stars = 2;
    if (currentLevel && typeof currentLevel.id === 'number') {
        saveLevelProgress(currentLevel.id, { stars: Math.max(currentLevel.stars || 0, stars), completed: true });
        unlockNextLevels(currentLevel.id);
    }
    addCoins(reward);
    showEnd('Победа', '', stars, reward);
}

function showEnd(title, sub, stars, reward) {
    el('victory-title').textContent = title;
    el('victory-sub').textContent = sub;
    el('victory-time').textContent = fmtTime(Math.floor(elapsedMs / 1000));
    el('victory-moves').textContent = moves;
    var box = el('victory-stars');
    box.innerHTML = '';
    box.style.display = stars ? 'flex' : 'none';
    for (var i = 1; i <= 3; i++) box.innerHTML += STAR_SVG.replace('<svg', '<svg class="' + (i <= stars ? 'filled' : '') + '"');
    var rw = el('victory-reward');
    rw.classList.remove('hidden');
    el('victory-reward-n').textContent = '+' + fmt(reward);
    el('victory-next-btn').style.display = (MP.active || PX.lastMode) ? 'none' : 'flex';
    el('screen-victory').classList.add('active');
    startConfetti();
    updateCoinsUI();
}

function nextLevel() {
    audio.playClick();
    el('screen-victory').classList.remove('active');
    var levels = getLevels(), idx = -1;
    for (var i = 0; i < levels.length; i++) if (levels[i].id === currentLevel.id) idx = i;
    var next = idx >= 0 ? levels[idx + 1] : null;
    if (next && !next.locked) selectLevel(next);
    else showScreen('screen-gallery');
}

function startConfetti() {
    var canvas = el('confetti-canvas'), ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var colors = ['#8FA0FF', '#E8EAF2', '#6EE7B7', '#B7BFF9', '#5560E8'];
    var parts = [];
    for (var i = 0; i < 130; i++) parts.push({
        x: Math.random() * canvas.width, y: -Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 4,
        size: 3 + Math.random() * 7, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)], round: Math.random() > 0.5
    });
    var frame;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var alive = false;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.rot += p.vr;
            if (p.y < canvas.height + 40) alive = true;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180); ctx.fillStyle = p.color;
            if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
            else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
        if (alive) frame = requestAnimationFrame(animate);
    }
    animate();
    setTimeout(function () { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height); }, 5000);
}

/* ================= МУЛЬТИПЛЕЕР ================= */
var MP = { active: false, conn: null, peer: null, isHost: false, code: null, grid: 4, oppPct: 0, oppFinished: false, myFinished: false, joinTimer: null };
var MP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function mpGenCode() {
    var s = '';
    for (var i = 0; i < 4; i++) s += MP_ALPHABET[Math.floor(Math.random() * MP_ALPHABET.length)];
    return s;
}
function mpPeerId(c) { return 'puzzle-master-ru-' + c; }
function openMulti() {
    if (typeof Peer === 'undefined') { toast('Мультиплеер требует интернет при запуске'); return; }
    showScreen('screen-multi');
    el('multi-lobby').classList.remove('hidden');
    el('multi-room').classList.add('hidden');
    el('multi-status').textContent = '';
}
function leaveMulti() { mpSend({ type: 'bye' }); mpReset(); showScreen('screen-menu'); }
function mpShowLobby() {
    el('multi-lobby').classList.remove('hidden');
    el('multi-room').classList.add('hidden');
}
function mpCreate() {
    audio.playClick();
    el('multi-status').textContent = 'Создание комнаты…';
    MP.code = mpGenCode(); MP.isHost = true;
    MP.peer = new Peer(mpPeerId(MP.code), { debug: 0 });
    mpBindPeer();
    var chips = el('multi-grid-chips').querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) chips[i].onclick = function () {
        var all = el('multi-grid-chips').querySelectorAll('.chip');
        for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
        this.classList.add('active');
        MP.grid = parseInt(this.getAttribute('data-grid'), 10);
        audio.playClick();
    };
}
function mpBindPeer() {
    MP.peer.on('open', function () {
        el('multi-lobby').classList.add('hidden');
        el('multi-room').classList.remove('hidden');
        el('multi-code').textContent = MP.code;
        el('multi-room-status').textContent = 'Ожидание соперника…';
        el('multi-start-btn').classList.add('hidden');
        if (window.QRCode) QRCode.toCanvas(el('multi-qr'), MP.code, { width: 150, margin: 1, color: { dark: '#E8EAF2', light: '#0B0C12' } }).catch(function () {});
    });
    MP.peer.on('connection', function (conn) {
        MP.conn = conn; mpSetupConn();
        el('multi-room-status').textContent = 'Соперник подключён';
        el('multi-start-btn').classList.remove('hidden');
    });
    MP.peer.on('error', function (err) {
        if (err && err.type === 'unavailable-id') {
            try { MP.peer.destroy(); } catch (e) {}
            MP.code = mpGenCode();
            MP.peer = new Peer(mpPeerId(MP.code), { debug: 0 });
            mpBindPeer();
        } else el('multi-status').textContent = 'Ошибка сети: ' + (err ? err.type : '?');
    });
}
function mpJoin() {
    audio.playClick();
    var code = (el('multi-code-input').value || '').trim().toUpperCase();
    if (code.length !== 4) { el('multi-status').textContent = 'Введите код из 4 символов'; return; }
    el('multi-status').textContent = 'Подключение…';
    MP.isHost = false; MP.code = code;
    MP.peer = new Peer({ debug: 0 });
    MP.joinTimer = setTimeout(function () {
        if (!MP.conn || !MP.conn.open) {
            el('multi-status').textContent = 'Не удалось подключиться';
            try { MP.peer.destroy(); } catch (e) {}
            mpShowLobby();
        }
    }, 8000);
    MP.peer.on('open', function () {
        MP.conn = MP.peer.connect(mpPeerId(code), { reliable: true });
        MP.conn.on('open', function () {
            clearTimeout(MP.joinTimer);
            mpSetupConn();
            el('multi-lobby').classList.add('hidden');
            el('multi-room').classList.remove('hidden');
            el('multi-code').textContent = code;
            el('multi-grid-chips').style.display = 'none';
            el('multi-start-btn').classList.add('hidden');
            el('multi-room-status').textContent = 'Подключено. Ожидание старта…';
        });
    });
    MP.peer.on('error', function (err) {
        clearTimeout(MP.joinTimer);
        mpShowLobby();
        el('multi-status').textContent = err && err.type === 'peer-unavailable' ? 'Комната не найдена' : 'Ошибка подключения';
    });
}
function mpSetupConn() {
    MP.conn.on('data', mpHandleData);
    MP.conn.on('close', function () {
        if (MP.active) mpAlert('Соперник покинул игру');
        MP.conn = null; MP.active = false;
        el('mp-bars').classList.add('hidden');
    });
}
function mpSend(d) { if (MP.conn && MP.conn.open) { try { MP.conn.send(d); } catch (e) {} } }
function mpHandleData(d) {
    if (!d || typeof d !== 'object') return;
    if (d.type === 'start' && !MP.isHost) {
        var blob = new Blob([d.image], { type: 'image/jpeg' });
        initGame({ grid: d.grid, level: { id: 'mp', name: 'Versus', category: 'mp', image: URL.createObjectURL(blob), locked: false }, mp: true });
    } else if (d.type === 'progress') {
        MP.oppPct = d.pct;
        el('mp-opp').style.width = d.pct + '%';
        el('mp-opp-pct').textContent = d.pct + '%';
    } else if (d.type === 'finish') {
        MP.oppFinished = true;
        if (!MP.myFinished) mpAlert('Соперник собрал пазл!');
    } else if (d.type === 'bye') {
        if (MP.active) mpAlert('Соперник покинул игру');
        MP.active = false;
        el('mp-bars').classList.add('hidden');
    }
}
function updateMPBars(p) {
    el('mp-you').style.width = p + '%';
    el('mp-you-pct').textContent = p + '%';
}
function mpAlert(t) {
    var a = el('mp-alert');
    a.textContent = t; a.classList.remove('hidden');
    setTimeout(function () { a.classList.add('hidden'); }, 4000);
}
function mpStart() {
    if (!MP.conn || !MP.conn.open) { el('multi-room-status').textContent = 'Соперник не подключён'; return; }
    audio.playClick();
    var pool = getLevels().filter(function (l) { return !l.locked; });
    var lv = pool[Math.floor(Math.random() * pool.length)] || LEVELS[0];
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var c = document.createElement('canvas');
        c.width = 560; c.height = 560;
        c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 560, 560);
        c.toBlob(function (blob) {
            blob.arrayBuffer().then(function (ab) {
                mpSend({ type: 'start', grid: MP.grid, image: ab });
                initGame({ grid: MP.grid, level: { id: 'mp', name: lv.name, category: 'mp', image: URL.createObjectURL(blob), locked: false }, mp: true });
            });
        }, 'image/jpeg', 0.72);
    };
    img.onerror = function () { el('multi-room-status').textContent = 'Не удалось загрузить картинку'; };
    img.src = lv.image;
}
function mpReset() {
    clearTimeout(MP.joinTimer);
    MP.active = false; MP.oppPct = 0; MP.oppFinished = false; MP.myFinished = false;
    if (MP.conn) { try { MP.conn.close(); } catch (e) {} MP.conn = null; }
    if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} MP.peer = null; }
    el('multi-grid-chips').style.display = 'flex';
}
window.addEventListener('beforeunload', function () { mpSend({ type: 'bye' }); });

/* ==========================================================
   ПИКСЕЛЬ-АРТ: ГЕНЕРАТОРЫ
   ========================================================== */
var PAL_MASTER = ['#0B0C12','#1E2130','#3A3F58','#64748B','#FFFFFF','#F87171','#DC2626','#FF9F43','#FECA57','#A16207','#6EE7B7','#10B981','#1DD3B0','#0EA5E9','#5560E8','#7C8CFF','#F472B6','#8B5CF6','#D97706','#78350F'];
var PAL_RGB = PAL_MASTER.map(function (h) {
    return [parseInt(h.substr(1,2),16), parseInt(h.substr(3,2),16), parseInt(h.substr(5,2),16)];
});

function pxCanvas(N) {
    var c = document.createElement('canvas');
    c.width = N; c.height = N;
    return c;
}
function drawStars(ctx, N, n) {
    for (var i = 0; i < n; i++) {
        ctx.fillStyle = Math.random() < 0.7 ? '#FFFFFF' : '#7C8CFF';
        ctx.fillRect(Math.floor(Math.random() * N), Math.floor(Math.random() * N), 1, 1);
    }
}
function genSpacePlanet(ctx, N) {
    var g = ctx.createLinearGradient(0, 0, 0, N);
    g.addColorStop(0, '#0B0C12'); g.addColorStop(1, '#1E2130');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = 'rgba(139,92,246,.25)';
    ctx.beginPath(); ctx.arc(N * 0.75, N * 0.25, N * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(85,96,232,.2)';
    ctx.beginPath(); ctx.arc(N * 0.2, N * 0.75, N * 0.28, 0, 7); ctx.fill();
    drawStars(ctx, N, Math.floor(N * 1.6));
    var cx = N * 0.5, cy = N * 0.46, r = N * 0.26;
    var pg = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r);
    pg.addColorStop(0, '#FF9F43'); pg.addColorStop(0.6, '#DC2626'); pg.addColorStop(1, '#78350F');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(161,98,7,.8)';
    ctx.fillRect(cx - r, cy - r * 0.2, r * 2, r * 0.18);
    ctx.fillRect(cx - r * 0.9, cy + r * 0.3, r * 1.8, r * 0.14);
    ctx.strokeStyle = '#FECA57'; ctx.lineWidth = N * 0.03;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.4);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * 0.5, 0, 0, 7); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#64748B';
    ctx.beginPath(); ctx.arc(N * 0.16, N * 0.18, N * 0.05, 0, 7); ctx.fill();
}
function genSpaceRocket(ctx, N) {
    var g = ctx.createLinearGradient(0, 0, 0, N);
    g.addColorStop(0, '#0B0C12'); g.addColorStop(1, '#1E2130');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    drawStars(ctx, N, Math.floor(N * 1.6));
    var cx = N * 0.5, w = N * 0.16, top = N * 0.16, bot = N * 0.66;
    ctx.fillStyle = '#DC2626';
    ctx.beginPath(); ctx.moveTo(cx, top - N * 0.08); ctx.lineTo(cx - w, top + N * 0.1); ctx.lineTo(cx + w, top + N * 0.1); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - w, top + N * 0.1, w * 2, bot - top - N * 0.1);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(cx, top + N * 0.1, w, bot - top - N * 0.1);
    ctx.fillStyle = '#0EA5E9';
    ctx.beginPath(); ctx.arc(cx, top + N * 0.2, w * 0.55, 0, 7); ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath(); ctx.moveTo(cx - w, bot - N * 0.14); ctx.lineTo(cx - w * 1.9, bot); ctx.lineTo(cx - w, bot); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + w, bot - N * 0.14); ctx.lineTo(cx + w * 1.9, bot); ctx.lineTo(cx + w, bot); ctx.fill();
    ctx.fillStyle = '#FF9F43';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.7, bot); ctx.lineTo(cx, bot + N * 0.2); ctx.lineTo(cx + w * 0.7, bot); ctx.fill();
    ctx.fillStyle = '#FECA57';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.4, bot); ctx.lineTo(cx, bot + N * 0.12); ctx.lineTo(cx + w * 0.4, bot); ctx.fill();
}
function genSword(ctx, N) {
    var g = ctx.createRadialGradient(N/2, N/2, N*0.1, N/2, N/2, N*0.75);
    g.addColorStop(0, '#1E2130'); g.addColorStop(1, '#0B0C12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    ctx.save(); ctx.translate(N/2, N/2); ctx.rotate(-Math.PI/4);
    var bl = N * 0.52, bw = N * 0.07;
    var bg2 = ctx.createLinearGradient(-bw, 0, bw, 0);
    bg2.addColorStop(0, '#64748B'); bg2.addColorStop(0.5, '#FFFFFF'); bg2.addColorStop(1, '#3A3F58');
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.moveTo(-bw, -bl * 0.1); ctx.lineTo(-bw, -bl); ctx.lineTo(0, -bl - N * 0.08); ctx.lineTo(bw, -bl); ctx.lineTo(bw, -bl * 0.1);
    ctx.fill();
    ctx.fillStyle = '#FECA57';
    ctx.fillRect(-bw * 2.6, -bl * 0.12, bw * 5.2, N * 0.045);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-bw * 0.7, -bl * 0.075, bw * 1.4, bl * 0.42);
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-bw * 0.7, bl * 0.05, bw * 1.4, N * 0.02);
    ctx.fillRect(-bw * 0.7, bl * 0.18, bw * 1.4, N * 0.02);
    ctx.fillStyle = '#FECA57';
    ctx.beginPath(); ctx.arc(0, bl * 0.38, bw * 0.9, 0, 7); ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath(); ctx.arc(0, -bl * 0.0, bw * 0.5, 0, 7); ctx.fill();
    ctx.restore();
}
function genAxe(ctx, N) {
    var g = ctx.createLinearGradient(0, 0, N, N);
    g.addColorStop(0, '#0B0C12'); g.addColorStop(1, '#1E2130');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    ctx.save(); ctx.translate(N/2, N/2); ctx.rotate(Math.PI/4);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-N * 0.03, -N * 0.34, N * 0.06, N * 0.7);
    ctx.fillStyle = '#A16207';
    ctx.fillRect(-N * 0.03, -N * 0.34, N * 0.02, N * 0.7);
    var hg = ctx.createLinearGradient(-N*0.2, 0, 0, 0);
    hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(0.4, '#64748B'); hg.addColorStop(1, '#3A3F58');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-N * 0.03, -N * 0.34);
    ctx.qu