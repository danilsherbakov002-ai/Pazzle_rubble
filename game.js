/* ==========================================================
   PUZZLE MASTER 3.0 — ENGINE
   Точная нарезка · снап 15px · IndexedDB фото · PeerJS versus
   ========================================================== */

var SNAP_PX = 15;
var DRAG_LIFT = 48;
var COMBO_WINDOW = 6000;
var FX_MAX = 220;

var currentLevel = null;
var gridSize = 4;
var pieces = [];
var placedCount = 0;
var moves = 0;
var zTop = 10;
var dragging = null;
var areaRect = null;
var boardX = 0, boardY = 0;
var boardSize = 0, cellSize = 0;
var sourceCanvas = null;
var boardCache = null;
var hintOn = false;
var combo = 0, lastPlaceTime = 0;

var timerInterval = null, elapsedMs = 0, lastTick = 0, paused = false;
var fxCanvas = null, fxCtx = null, fxParts = [], fxRaf = null;

function el(id) { return document.getElementById(id); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function st() { return window.gameSettings || {}; }

var STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.26 6.6.56-5 4.4 1.5 6.5L12 16.9 5.99 19.7l1.5-6.5-5-4.4 6.6-.56z"/></svg>';

/* ---------- НАВИГАЦИЯ ---------- */
function showScreen(id) {
    audio.playClick();
    var s = document.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) s[i].classList.remove('active');
    el(id).classList.add('active');
    if (id === 'screen-gallery') renderGallery();
    if (id === 'screen-menu') updateMenuStats();
    if (id === 'screen-settings') loadSettingsUI();
}

function updateMenuStats() {
    el('total-stars').textContent = getTotalStars();
    el('total-completed').textContent = getTotalCompleted();
}

/* ---------- ГАЛЕРЕЯ ---------- */
var currentCategory = 'all';

function renderGallery() {
    var tabs = el('category-tabs');
    tabs.innerHTML = '';
    CATEGORIES.forEach(function (cat) {
        var b = document.createElement('button');
        b.className = 'category-tab' + (cat.id === currentCategory ? ' active' : '');
        b.textContent = cat.name;
        b.onclick = function () { currentCategory = cat.id; audio.playClick(); renderGallery(); };
        tabs.appendChild(b);
    });

    if (currentCategory === 'custom') { renderCustomPhotos(); return; }

    var grid = el('levels-grid');
    grid.innerHTML = '';
    getLevels().filter(function (lv) {
        return currentCategory === 'all' || lv.category === currentCategory;
    }).forEach(function (lv, i) {
        var card = document.createElement('div');
        card.className = 'level-card' + (lv.locked ? ' locked' : '');
        card.style.animationDelay = (i * 0.04) + 's';

        var img = document.createElement('img');
        img.className = 'level-card-img';
        img.loading = 'lazy';
        img.alt = lv.name;
        img.src = lv.image;

        var ov = document.createElement('div');
        ov.className = 'level-card-overlay';
        var stars = '';
        for (var s = 1; s <= 3; s++) stars += STAR_SVG.replace('<svg', '<svg class="' + ((lv.stars || 0) >= s ? 'filled' : '') + '"');
        ov.innerHTML = '<div class="level-card-name">' + lv.name + '</div><div class="level-card-stars">' + stars + '</div>';

        card.appendChild(img);
        card.appendChild(ov);
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

/* ---------- INDEXEDDB: МОИ ФОТО ---------- */
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

function idbAddPhoto(rec) {
    return idbOpen().then(function (db) {
        return new Promise(function (res, rej) {
            var tx = db.transaction('photos', 'readwrite');
            tx.objectStore('photos').put(rec);
            tx.oncomplete = function () { db.close(); res(); };
            tx.onerror = function () { db.close(); rej(tx.error); };
        });
    });
}

function idbGetPhotos() {
    return idbOpen().then(function (db) {
        return new Promise(function (res, rej) {
            var tx = db.transaction('photos', 'readonly');
            var rq = tx.objectStore('photos').getAll();
            rq.onsuccess = function () { db.close(); res(rq.result || []); };
            rq.onerror = function () { db.close(); rej(rq.error); };
        });
    });
}

function idbDeletePhoto(id) {
    return idbOpen().then(function (db) {
        return new Promise(function (res, rej) {
            var tx = db.transaction('photos', 'readwrite');
            tx.objectStore('photos').delete(id);
            tx.oncomplete = function () { db.close(); res(); };
            tx.onerror = function () { db.close(); rej(tx.error); };
        });
    });
}

function renderCustomPhotos() {
    var grid = el('levels-grid');
    grid.innerHTML = '';

    idbGetPhotos().then(function (list) {
        list.sort(function (a, b) { return b.createdAt - a.createdAt; });
        if (list.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3);font-size:12px;padding:30px 0;">Пока пусто. Нажмите «+», чтобы добавить фото.</p>';
            return;
        }
        list.forEach(function (rec, i) {
            var card = document.createElement('div');
            card.className = 'level-card';
            card.style.animationDelay = (i * 0.04) + 's';

            var img = document.createElement('img');
            img.className = 'level-card-img';
            img.src = rec.thumb || IMG_FALLBACK;
            img.alt = rec.name;

            var ov = document.createElement('div');
            ov.className = 'level-card-overlay';
            ov.innerHTML = '<div class="level-card-name">' + rec.name + '</div>';

            var del = document.createElement('button');
            del.className = 'photo-delete';
            del.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
            del.onclick = function (e) {
                e.stopPropagation();
                if (confirm('Удалить фото?')) {
                    idbDeletePhoto(rec.id).then(function () { audio.playClick(); renderCustomPhotos(); });
                }
            };

            card.appendChild(img);
            card.appendChild(ov);
            card.appendChild(del);
            card.onclick = function () {
                var url = URL.createObjectURL(rec.blob);
                selectLevel({ id: 'photo-' + rec.id, name: rec.name, category: 'custom', image: url, locked: false, stars: 0, completed: false });
            };
            grid.appendChild(card);
        });
    }).catch(function () {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3);font-size:12px;padding:30px 0;">IndexedDB недоступен.</p>';
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

        var thumbC = document.createElement('canvas');
        thumbC.width = 240; thumbC.height = 240;
        thumbC.getContext('2d').drawImage(full, 0, 0, 240, 240);

        full.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            var rec = {
                id: Date.now(),
                name: (file.name || 'Фото').replace(/\.[^/.]+$/, '').slice(0, 24) || 'Фото',
                createdAt: Date.now(),
                thumb: thumbC.toDataURL('image/jpeg', 0.7),
                blob: blob
            };
            idbAddPhoto(rec).then(function () {
                audio.playPlace();
                vibrate(30);
                currentCategory = 'custom';
                showScreen('screen-gallery');
            }).catch(function () { alert('Не удалось сохранить фото.'); });
        }, 'image/jpeg', 0.85);
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('Не удалось прочитать файл.'); };
    img.src = url;
}

/* ---------- ИСТОЧНИК ---------- */
function loadSourceImage(url, onReady) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { onReady(buildSource(img)); };
    img.onerror = function () { onReady(buildProceduralSource()); };
    img.src = url;
}

function buildSource(img) {
    var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    var side = Math.min(nw, nh), sx = (nw - side) / 2, sy = (nh - side) / 2, S = 720;
    var c = document.createElement('canvas');
    c.width = S; c.height = S;
    c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, S, S);
    return c;
}

function buildProceduralSource() {
    var S = 720, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#1E2130'; ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 24; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * S, Math.random() * S, 30 + Math.random() * 90, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + (225 + Math.random() * 40) + ',45%,' + (30 + Math.random() * 30) + '%,.5)';
        ctx.fill();
    }
    return c;
}

/* ---------- СТАРТ ---------- */
function startGame(grid) {
    audio.playClick();
    initGame({ grid: grid, level: currentLevel, mp: false });
}

function initGame(opts) {
    gridSize = opts.grid;
    currentLevel = opts.level;
    if (!opts.mp) { try { localStorage.setItem('lastGrid', String(gridSize)); } catch (e) {} }

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
    var old = area.querySelectorAll('.piece, .float-text');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    pieces = [];
    fxParts = [];

    loadSourceImage(currentLevel.image, function (src) {
        sourceCanvas = src;
        layoutGame();
        spawnPieces();
        startTimer();
        if (audio.musicEnabled && !MP.active) audio.startMusic();
    });
}

/* ---------- РАСКЛАДКА ---------- */
function layoutGame() {
    var area = el('game-area'), tray = el('tray'), wrap = el('board-wrap'), canvas = el('board-canvas');
    var aW = area.clientWidth, aH = area.clientHeight;

    var trayH = clamp(Math.round(aH * 0.32), 140, 240);
    tray.style.height = trayH + 'px';

    boardSize = Math.max(160, Math.min(aW - 16, aH - trayH - 26));
    cellSize = boardSize / gridSize;

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(boardSize * dpr);
    canvas.height = Math.round(boardSize * dpr);
    canvas.style.width = boardSize + 'px';
    canvas.style.height = boardSize + 'px';
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

    wrap.style.width = boardSize + 'px';
    wrap.style.height = boardSize + 'px';
    boardX = wrap.offsetLeft;
    boardY = wrap.offsetTop;

    fxCanvas = el('fx-canvas');
    fxCtx = fxCanvas.getContext('2d');
    fxCanvas.width = aW;
    fxCanvas.height = aH;

    buildBoardCache(dpr);

    for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        p.w = cellSize; p.h = cellSize;
        p.el.style.width = cellSize + 'px';
        p.el.style.height = cellSize + 'px';
        if (p.placed) {
            p.x = boardX + p.col * cellSize;
            p.y = boardY + p.row * cellSize;
        } else {
            p.x = clamp(p.x, 0, aW - cellSize);
            p.y = clamp(p.y, 0, aH - cellSize);
        }
        setPieceTransform(p, false);
    }
    drawBoard(null, 0);
}

function buildBoardCache(dpr) {
    boardCache = document.createElement('canvas');
    boardCache.width = Math.round(boardSize * dpr);
    boardCache.height = Math.round(boardSize * dpr);
    var ctx = boardCache.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, boardSize, boardSize);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (var i = 1; i < gridSize; i++) {
        var pos = i * cellSize;
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, boardSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(boardSize, pos); ctx.stroke();
    }

    if (st().hints) {
        ctx.fillStyle = 'rgba(232,234,242,0.06)';
        ctx.font = '600 ' + Math.max(9, cellSize * 0.22) + 'px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var r = 0; r < gridSize; r++)
            for (var c = 0; c < gridSize; c++)
                ctx.fillText(String(r * gridSize + c + 1), c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
    }
}

function drawBoard(highlight, intensity) {
    var ctx = el('board-canvas').getContext('2d');
    ctx.clearRect(0, 0, boardSize, boardSize);
    if (boardCache) ctx.drawImage(boardCache, 0, 0, boardSize, boardSize);

    if (highlight && st().targetGlow) {
        var x = highlight.c * cellSize, y = highlight.r * cellSize;
        var a = clamp(intensity, 0, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(110,231,183,' + (0.06 + a * 0.12) + ')';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.strokeStyle = 'rgba(110,231,183,' + (0.3 + a * 0.6) + ')';
        ctx.lineWidth = 1.5 + a * 1.5;
        ctx.shadowColor = 'rgba(110,231,183,.8)';
        ctx.shadowBlur = 5 + a * 12;
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        ctx.restore();
    }
}

/* ---------- СПАВН ---------- */
function spawnPieces() {
    var area = el('game-area'), tray = el('tray');
    var aW = area.clientWidth, aH = area.clientHeight;
    var trayTop = tray.offsetTop;
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
            div.style.width = cellSize + 'px';
            div.style.height = cellSize + 'px';
            div.appendChild(pc);

            var maxX = Math.max(0, aW - cellSize);
            var minY = Math.min(aH - cellSize, trayTop + 4);
            var maxY = Math.max(minY, aH - cellSize - 4);

            var piece = {
                row: r, col: c,
                x: clamp(Math.random() * maxX, 0, maxX),
                y: clamp(minY + Math.random() * (maxY - minY), 0, aH - cellSize),
                w: cellSize, h: cellSize,
                placed: false, el: div
            };

            div.style.zIndex = String(++zTop);
            attachPieceEvents(div, piece);
            area.appendChild(div);
            setPieceTransform(piece, false);
            pieces.push(piece);
        }
    }
}

function setPieceTransform(p, isDrag) {
    p.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)' + (isDrag ? ' scale(1.1)' : '');
}

/* ---------- DRAG ---------- */
function attachPieceEvents(div, piece) {
    div.addEventListener('touchstart', function (e) {
        if (piece.placed || paused) return;
        e.preventDefault();
        var t = e.touches[0];
        beginDrag(piece, t.clientX, t.clientY);
    }, { passive: false });
    div.addEventListener('mousedown', function (e) {
        if (piece.placed || paused) return;
        e.preventDefault();
        beginDrag(piece, e.clientX, e.clientY);
    });
}

function beginDrag(piece, cx, cy) {
    areaRect = el('game-area').getBoundingClientRect();
    dragging = {
        piece: piece,
        offX: (cx - areaRect.left) - piece.x,
        offY: (cy - areaRect.top) - piece.y
    };
    piece.el.classList.add('dragging');
    piece.el.style.zIndex = String(++zTop);
    audio.playPickup();
    vibrate(8);
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
    var glowZone = cellSize * 1.4;

    if (dist < glowZone) drawBoard({ r: p.row, c: p.col }, 1 - dist / glowZone);
    else drawBoard(null, 0);
}

function endDrag() {
    if (!dragging) return;
    var p = dragging.piece;
    dragging = null;
    p.el.classList.remove('dragging');

    moves++;
    el('game-moves').textContent = moves;

    var tx = boardX + p.col * cellSize, ty = boardY + p.row * cellSize;
    var dist = Math.hypot(p.x - tx, p.y - ty);

    if (dist <= SNAP_PX) {
        p.placed = true;
        p.x = tx; p.y = ty;
        p.el.classList.add('placed');
        p.el.style.transition = 'transform 110ms ease';
        setPieceTransform(p, false);
        setTimeout(function () { p.el.style.transition = ''; }, 140);

        placedCount++;
        onPlaceFX(p);

        var pct = Math.round(placedCount / (gridSize * gridSize) * 100);
        if (MP.active) { updateMPBars(pct); mpSend({ type: 'progress', pct: pct }); }

        if (placedCount === gridSize * gridSize) setTimeout(finishGame, 300);
    } else {
        combo = 0;
        el('game-combo').classList.add('hidden');
        setPieceTransform(p, false);
    }
    drawBoard(null, 0);
}

document.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    e.preventDefault();
    var t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
}, { passive: false });
document.addEventListener('touchend', endDrag);
document.addEventListener('touchcancel', endDrag);
document.addEventListener('mousemove', function (e) { if (dragging) moveDrag(e.clientX, e.clientY); });
document.addEventListener('mouseup', endDrag);

/* ---------- FX ---------- */
function fxEmitRing(x, y, color, power) {
    if (fxParts.length > FX_MAX) fxParts.splice(0, 10);
    fxParts.push({ type: 2, x: x, y: y, r: 4, vr: 2.2 + power, life: 0, max: 22, color: color });
    fxStart();
}

function fxEmitBurst(x, y, count, power) {
    var colors = ['#8FA0FF', '#E8EAF2', '#6EE7B7', '#B7BFF9'];
    for (var i = 0; i < count; i++) {
        if (fxParts.length > FX_MAX) fxParts.splice(0, 10);
        var ang = Math.random() * Math.PI * 2;
        var sp = (0.5 + Math.random()) * power;
        fxParts.push({
            type: Math.random() < 0.35 ? 1 : 0,
            x: x, y: y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.5,
            g: 0.12, life: 0, max: 30 + Math.random() * 20,
            size: 1.5 + Math.random() * 3,
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
            fxCtx.save();
            fxCtx.globalAlpha = t * 0.8;
            fxCtx.strokeStyle = p.color;
            fxCtx.lineWidth = 2 * t + 0.5;
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            fxCtx.stroke();
            fxCtx.restore();
        } else {
            p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.rot += p.vrot;
            fxCtx.save();
            fxCtx.globalAlpha = t;
            fxCtx.fillStyle = p.color;
            fxCtx.translate(p.x, p.y);
            if (p.type === 1) { fxCtx.rotate(p.rot); fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
            else { fxCtx.beginPath(); fxCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2); fxCtx.fill(); }
            fxCtx.restore();
        }
        alive.push(p);
    }
    fxParts = alive;
    if (fxParts.length > 0) fxRaf = requestAnimationFrame(fxStep);
    else { fxRaf = null; fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height); }
}

function floatText(x, y, text, cls) {
    var d = document.createElement('div');
    d.className = 'float-text' + (cls ? ' ' + cls : '');
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    el('game-area').appendChild(d);
    d.addEventListener('animationend', function () { if (d.parentNode) d.parentNode.removeChild(d); });
}

function shakeBoard() {
    var w = el('board-wrap');
    w.classList.remove('shake');
    void w.offsetWidth;
    w.classList.add('shake');
}

function onPlaceFX(p) {
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    var now = performance.now();
    combo = (now - lastPlaceTime < COMBO_WINDOW) ? combo + 1 : 1;
    lastPlaceTime = now;

    var mult = Math.min(combo, 5);
    fxEmitBurst(cx, cy, 8 + mult * 4, 2.6 + mult * 0.4);
    fxEmitRing(cx, cy, 'rgba(143,160,255,0.8)', 2.5 + mult * 0.6);
    shakeBoard();

    if (combo >= 2) {
        floatText(cx, cy - 8, 'серия ×' + combo, 'combo');
        var badge = el('game-combo');
        badge.textContent = '· серия ×' + combo;
        badge.classList.remove('hidden');
        badge.style.animation = 'none';
        void badge.offsetWidth;
        badge.style.animation = '';
        vibrate([12, 18, 12]);
    } else {
        vibrate([8, 24, 8]);
    }
    audio.playSnap();
}

/* ---------- ТАЙМЕР ---------- */
function startTimer() {
    stopTimer();
    elapsedMs = 0; paused = false;
    lastTick = performance.now();
    timerInterval = setInterval(function () {
        var now = performance.now();
        if (!paused) elapsedMs += now - lastTick;
        lastTick = now;
        var s = Math.floor(elapsedMs / 1000);
        el('game-timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 250);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function fmtTime(sec) { return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }

/* ---------- ПАУЗА / ПОДСКАЗКА ---------- */
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
    stopTimer(); audio.stopMusic();
    paused = false;
    mpSend({ type: 'bye' });
    mpReset();
    el('screen-pause').classList.remove('active');
    el('screen-victory').classList.remove('active');
    showScreen('screen-menu');
}
function toggleHint(force) {
    if (typeof force === 'boolean') hintOn = force; else { hintOn = !hintOn; audio.playClick(); }
    el('hint-overlay').classList.toggle('hidden', !hintOn);
    el('btn-hint').style.opacity = hintOn ? '1' : '0.45';
}

/* ---------- ФИНАЛ ---------- */
function finishGame() {
    stopTimer();
    audio.stopMusic();
    audio.playVictory();
    vibrate([50, 80, 50, 80, 50]);

    var ctx = el('board-canvas').getContext('2d');
    ctx.clearRect(0, 0, boardSize, boardSize);
    ctx.drawImage(sourceCanvas, 0, 0, boardSize, boardSize);
    el('game-area').classList.add('done');

    for (var b = 0; b < 3; b++) {
        setTimeout(function () {
            fxEmitBurst(boardX + Math.random() * boardSize, boardY + Math.random() * boardSize, 22, 4.5);
        }, b * 180);
    }

    var sec = Math.floor(elapsedMs / 1000);
    var total = gridSize * gridSize;

    if (MP.active) {
        MP.myFinished = true;
        mpSend({ type: 'finish', time: sec });
        var won = !MP.oppFinished;
        showEnd(won, 0, won ? 'Вы собрали первыми!' : 'Соперник оказался быстрее.');
        return;
    }

    var stars = 1;
    if (moves <= total * 1.7 && sec <= total * 9) stars = 3;
    else if (moves <= total * 2.6 && sec <= total * 16) stars = 2;

    if (currentLevel && typeof currentLevel.id === 'number') {
        saveLevelProgress(currentLevel.id, { stars: Math.max(currentLevel.stars || 0, stars), completed: true });
        unlockNextLevels(currentLevel.id);
    }
    showEnd(true, stars, '');
}

function showEnd(won, stars, sub) {
    el('victory-title').textContent = MP.active ? (won ? 'Победа' : 'Поражение') : 'Победа';
    el('victory-sub').textContent = sub;

    var sec = Math.floor(elapsedMs / 1000);
    el('victory-time').textContent = fmtTime(sec);
    el('victory-moves').textContent = moves;

    var box = el('victory-stars');
    box.innerHTML = '';
    box.style.display = MP.active ? 'none' : 'flex';
    for (var i = 1; i <= 3; i++) {
        box.innerHTML += STAR_SVG.replace('<svg', '<svg class="' + (i <= stars ? 'filled' : '') + '"');
    }

    el('victory-next-btn').style.display = MP.active ? 'none' : 'flex';
    el('screen-victory').classList.add('active');
    if (won || !MP.active) startConfetti();
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var colors = ['#8FA0FF', '#E8EAF2', '#6EE7B7', '#B7BFF9', '#5560E8'];
    var parts = [];
    for (var i = 0; i < 130; i++) {
        parts.push({
            x: Math.random() * canvas.width, y: -Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 4,
            size: 3 + Math.random() * 7, rot: Math.random() * 360,
            vr: (Math.random() - 0.5) * 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            round: Math.random() > 0.5
        });
    }

    var frame;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var alive = false;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.rot += p.vr;
            if (p.y < canvas.height + 40) alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
            else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
        if (alive) frame = requestAnimationFrame(animate);
    }
    animate();
    setTimeout(function () { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height); }, 5000);
}

/* ==========================================================
   МУЛЬТИПЛЕЕР (PeerJS)
   ========================================================== */
var MP = { active: false, conn: null, peer: null, isHost: false, code: null, grid: 4,
           oppPct: 0, oppFinished: false, myFinished: false };

var MP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function mpGenCode() {
    var s = '';
    for (var i = 0; i < 4; i++) s += MP_ALPHABET[Math.floor(Math.random() * MP_ALPHABET.length)];
    return s;
}
function mpPeerId(code) { return 'puzzle-master-ru-' + code; }

function openMulti() {
    if (typeof Peer === 'undefined') { alert('Мультиплеер требует подключения к интернету при запуске.'); return; }
    showScreen('screen-multi');
    mpShowLobby();
}

function leaveMulti() {
    mpSend({ type: 'bye' });
    mpReset();
    showScreen('screen-menu');
}

function mpShowLobby() {
    el('multi-lobby').classList.remove('hidden');
    el('multi-room').classList.add('hidden');
    el('multi-status').textContent = '';
}

function mpSetStatus(text) { el('multi-status').textContent = text; }

function mpCreate() {
    audio.playClick();
    mpSetStatus('Создание комнаты…');
    MP.code = mpGenCode();
    MP.isHost = true;

    MP.peer = new Peer(mpPeerId(MP.code), { debug: 0 });

    MP.peer.on('open', function () {
        el('multi-lobby').classList.add('hidden');
        el('multi-room').classList.remove('hidden');
        el('multi-code').textContent = MP.code;
        el('multi-room-status').textContent = 'Ожидание соперника…';
        el('multi-start-btn').classList.add('hidden');
        if (window.QRCode) {
            QRCode.toCanvas(el('multi-qr'), MP.code, { width: 150, margin: 1,
                color: { dark: '#E8EAF2', light: '#0B0C12' } }).catch(function () {});
        }
    });

    MP.peer.on('connection', function (conn) {
        MP.conn = conn;
        mpSetupConn();
        el('multi-room-status').textContent = 'Соперник подключён';
        el('multi-start-btn').classList.remove('hidden');
    });

    MP.peer.on('error', function (err) {
        if (err && err.type === 'unavailable-id') {
            try { MP.peer.destroy(); } catch (e) {}
            MP.code = mpGenCode();
            MP.peer = new Peer(mpPeerId(MP.code), { debug: 0 });
        } else {
            mpSetStatus('Ошибка сети: ' + (err ? err.type : '?'));
        }
    });

    var chips = el('multi-grid-chips').querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
        chips[i].onclick = function () {
            var all = el('multi-grid-chips').querySelectorAll('.chip');
            for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
            this.classList.add('active');
            MP.grid = parseInt(this.getAttribute('data-grid'), 10);
            audio.playClick();
        };
    }
}

function mpJoin() {
    audio.playClick();
    var code = (el('multi-code-input').value || '').trim().toUpperCase();
    if (code.length !== 4) { mpSetStatus('Введите код из 4 символов'); return; }
    mpSetStatus('Подключение…');
    MP.isHost = false;
    MP.code = code;

    MP.peer = new Peer({ debug: 0 });
    MP.peer.on('open', function () {
        MP.conn = MP.peer.connect(mpPeerId(code), { reliable: true });
        MP.conn.on('open', function () {
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
        mpShowLobby();
        mpSetStatus(err && err.type === 'peer-unavailable' ? 'Комната не найдена' : 'Ошибка подключения');
    });
}

function mpSetupConn() {
    MP.conn.on('data', mpHandleData);
    MP.conn.on('close', function () {
        if (MP.active) mpAlert('Соперник покинул игру');
        MP.conn = null;
        MP.active = false;
        el('mp-bars').classList.add('hidden');
    });
}

function mpSend(data) {
    if (MP.conn && MP.conn.open) { try { MP.conn.send(data); } catch (e) {} }
}

function mpHandleData(d) {
    if (!d || typeof d !== 'object') return;

    if (d.type === 'start' && !MP.isHost) {
        var blob = new Blob([d.image], { type: 'image/jpeg' });
        var url = URL.createObjectURL(blob);
        MP.grid = d.grid;
        el('multi-grid-chips').style.display = 'none';
        initGame({ grid: d.grid, level: { id: 'mp', name: 'Versus', category: 'mp', image: url, locked: false }, mp: true });
    }
    else if (d.type === 'progress') {
        MP.oppPct = d.pct;
        el('mp-opp').style.width = d.pct + '%';
        el('mp-opp-pct').textContent = d.pct + '%';
    }
    else if (d.type === 'finish') {
        MP.oppFinished = true;
        if (!MP.myFinished) mpAlert('Соперник собрал пазл!');
    }
    else if (d.type === 'bye') {
        if (MP.active) mpAlert('Соперник покинул игру');
        MP.active = false;
        el('mp-bars').classList.add('hidden');
    }
}

function updateMPBars(myPct) {
    el('mp-you').style.width = myPct + '%';
    el('mp-you-pct').textContent = myPct + '%';
}

function mpAlert(text) {
    var a = el('mp-alert');
    a.textContent = text;
    a.classList.remove('hidden');
    setTimeout(function () { a.classList.add('hidden'); }, 4000);
}

function mpStart() {
    if (!MP.conn || !MP.conn.open) { mpSetStatus('Соперник не подключён'); return; }
    audio.playClick();

    var pool = getLevels().filter(function (lv) { return !lv.locked && lv.category !== 'custom'; });
    var lv = pool[Math.floor(Math.random() * pool.length)] || getLevels()[0];

    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var c = document.createElement('canvas');
        c.width = 720; c.height = 720;
        c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 720, 720);
        c.toBlob(function (blob) {
            blob.arrayBuffer().then(function (ab) {
                mpSend({ type: 'start', grid: MP.grid, image: ab });
                var localUrl = URL.createObjectURL(blob);
                initGame({ grid: MP.grid, level: { id: 'mp', name: lv.name, category: 'mp', image: localUrl, locked: false }, mp: true });
            });
        }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { mpSetStatus('Не удалось загрузить картинку'); };
    img.src = lv.image;
}

function mpReset() {
    MP.active = false;
    MP.oppPct = 0; MP.oppFinished = false; MP.myFinished = false;
    if (MP.conn) { try { MP.conn.close(); } catch (e) {} MP.conn = null; }
    if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} MP.peer = null; }
    el('multi-grid-chips').style.display = 'flex';
}

/* ---------- РЕСАЙЗ / ИНИТ ---------- */
window.addEventListener('resize', function () {
    if (el('screen-game').classList.contains('active') && sourceCanvas) layoutGame();
});
window.addEventListener('orientationchange', function () {
    setTimeout(function () {
        if (el('screen-game').classList.contains('active') && sourceCanvas) layoutGame();
    }, 250);
});
document.addEventListener('visibilitychange', function () {
    if (document.hidden && !paused && el('screen-game').classList.contains('active') && timerInterval) pauseGame();
});

document.addEventListener('DOMContentLoaded', function () {
    var box = el('particles');
    for (var i = 0; i < 24; i++) {
        var p = document.createElement('div');
        p.className = 'particle';
        var size = 2 + Math.random() * 3;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = (Math.random() * 9) + 's';
        p.style.animationDuration = (7 + Math.random() * 7) + 's';
        box.appendChild(p);
    }
    updateMenuStats();
    loadSettingsUI();
});