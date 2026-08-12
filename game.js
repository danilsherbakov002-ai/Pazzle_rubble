/* ==========================================================
   PUZZLE MASTER — GAME ENGINE v2.0
   Точная нарезка, безопасный спавн, магнитный снап 18px
   ========================================================== */

var SNAP_PX = 18;

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
var hintOn = false;

var timerInterval = null;
var elapsedMs = 0;
var lastTick = 0;
var paused = false;

function el(id) { return document.getElementById(id); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* ---------- НАВИГАЦИЯ ---------- */
function showScreen(id) {
    audio.playClick();
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
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

    var grid = el('levels-grid');
    grid.innerHTML = '';
    var levels = getLevels().filter(function (lv) {
        return currentCategory === 'all' || lv.category === currentCategory;
    });

    levels.forEach(function (lv, i) {
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
        for (var s = 1; s <= 3; s++) stars += '<span class="star' + ((lv.stars || 0) >= s ? ' filled' : '') + '">⭐</span>';
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

/* ---------- ЗАГРУЗКА ИСТОЧНИКА ---------- */
function loadSourceImage(url, onReady) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { onReady(buildSource(img)); };
    img.onerror = function () { onReady(buildProceduralSource()); };
    img.src = url;
}

function buildSource(img) {
    var nw = img.naturalWidth || img.width;
    var nh = img.naturalHeight || img.height;
    var side = Math.min(nw, nh);
    var sx = (nw - side) / 2, sy = (nh - side) / 2;
    var S = 720;
    var c = document.createElement('canvas');
    c.width = S; c.height = S;
    c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, S, S);
    return c;
}

function buildProceduralSource() {
    var S = 720;
    var c = document.createElement('canvas');
    c.width = S; c.height = S;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#ff9f43'); g.addColorStop(0.5, '#22303f'); g.addColorStop(1, '#1dd3b0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 26; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * S, Math.random() * S, 30 + Math.random() * 80, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + Math.floor(Math.random() * 360) + ',70%,60%,.35)';
        ctx.fill();
    }
    return c;
}

/* ---------- СТАРТ ИГРЫ ---------- */
function startGame(grid) {
    audio.playClick();
    gridSize = grid;
    try { localStorage.setItem('lastGrid', String(grid)); } catch (e) {}

    moves = 0; placedCount = 0; hintOn = true; toggleHint(true);
    el('game-moves').textContent = '0';
    el('game-timer').textContent = '00:00';

    showScreen('screen-game');
    var area = el('game-area');
    area.classList.remove('done');
    var old = area.querySelectorAll('.piece');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    pieces = [];

    loadSourceImage(currentLevel.image, function (src) {
        sourceCanvas = src;
        layoutGame();
        spawnPieces();
        startTimer();
        if (audio.musicEnabled) audio.startMusic();
    });
}

/* ---------- РАСКЛАДКА (bounds-safe) ---------- */
function layoutGame() {
    var area = el('game-area');
    var tray = el('tray');
    var wrap = el('board-wrap');
    var canvas = el('board-canvas');

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
    drawBoard(null);
}

function drawBoard(highlight) {
    var ctx = el('board-canvas').getContext('2d');
    ctx.clearRect(0, 0, boardSize, boardSize);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, 0, boardSize, boardSize);

    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    for (var i = 1; i < gridSize; i++) {
        var pos = i * cellSize;
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, boardSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(boardSize, pos); ctx.stroke();
    }

    if (highlight) {
        ctx.save();
        ctx.strokeStyle = '#1dd3b0';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#1dd3b0';
        ctx.shadowBlur = 12;
        ctx.strokeRect(highlight.c * cellSize + 2, highlight.r * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.restore();
    }
}

/* ---------- СПАВН ДЕТАЛЕЙ (строго в зоне) ---------- */
function spawnPieces() {
    var area = el('game-area');
    var tray = el('tray');
    var aW = area.clientWidth, aH = area.clientHeight;
    var trayTop = tray.offsetTop;

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var res = clamp(Math.round(cellSize * dpr), 24, 220);

    for (var r = 0; r < gridSize; r++) {
        for (var c = 0; c < gridSize; c++) {
            var pc = document.createElement('canvas');
            pc.width = res; pc.height = res;
            var side = sourceCanvas.width;
            var sw = side / gridSize;
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

function setPieceTransform(p, isDragging) {
    p.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)' + (isDragging ? ' scale(1.07)' : '');
}

/* ---------- TOUCH / DRAG ---------- */
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
    vibrate(10);
}

function moveDrag(cx, cy) {
    if (!dragging) return;
    var p = dragging.piece;
    var aW = el('game-area').clientWidth, aH = el('game-area').clientHeight;

    p.x = clamp((cx - areaRect.left) - dragging.offX, 0, aW - p.w);
    p.y = clamp((cy - areaRect.top) - dragging.offY, 0, aH - p.h);
    setPieceTransform(p, true);

    var tx = boardX + p.col * cellSize;
    var ty = boardY + p.row * cellSize;
    var dist = Math.hypot(p.x - tx, p.y - ty);
    var snap = Math.min(SNAP_PX, cellSize * 0.45);

    if (dist < snap * 1.6) drawBoard({ r: p.row, c: p.col });
    else drawBoard(null);
}

function endDrag() {
    if (!dragging) return;
    var p = dragging.piece;
    dragging = null;
    p.el.classList.remove('dragging');

    moves++;
    el('game-moves').textContent = moves;

    var tx = boardX + p.col * cellSize;
    var ty = boardY + p.row * cellSize;
    var dist = Math.hypot(p.x - tx, p.y - ty);
    var snap = Math.min(SNAP_PX, cellSize * 0.45);

    if (dist <= snap) {
        p.placed = true;
        p.x = tx; p.y = ty;
        p.el.classList.add('placed');
        p.el.style.transition = 'transform 120ms ease';
        setPieceTransform(p, false);
        setTimeout(function () { p.el.style.transition = ''; }, 150);

        placedCount++;
        audio.playSnap();
        vibrate([10, 30, 10]);
        drawBoard(null);

        if (placedCount === gridSize * gridSize) setTimeout(winGame, 250);
    } else {
        setPieceTransform(p, false);
        drawBoard(null);
    }
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
        var mm = String(Math.floor(s / 60)).padStart(2, '0');
        var ss = String(s % 60).padStart(2, '0');
        el('game-timer').textContent = mm + ':' + ss;
    }, 250);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

/* ---------- ПАУЗА / ПОДСКАЗКА ---------- */
function pauseGame() {
    audio.playClick();
    paused = true;
    el('screen-pause').classList.add('active');
}
function resumeGame() {
    audio.playClick();
    paused = false;
    el('screen-pause').classList.remove('active');
}
function restartGame() {
    audio.playClick();
    el('screen-pause').classList.remove('active');
    stopTimer(); audio.stopMusic();
    startGame(gridSize);
}
function quitToMenu() {
    audio.playClick();
    stopTimer(); audio.stopMusic();
    paused = false;
    el('screen-pause').classList.remove('active');
    el('screen-victory').classList.remove('active');
    showScreen('screen-menu');
}
function toggleHint(force) {
    if (typeof force === 'boolean') hintOn = force; else { hintOn = !hintOn; audio.playClick(); }
    el('hint-overlay').classList.toggle('hidden', !hintOn);
    el('btn-hint').style.opacity = hintOn ? '1' : '0.55';
}

/* ---------- ПОБЕДА ---------- */
function winGame() {
    stopTimer();
    audio.stopMusic();
    audio.playVictory();
    vibrate([50, 80, 50, 80, 50]);

    var ctx = el('board-canvas').getContext('2d');
    ctx.clearRect(0, 0, boardSize, boardSize);
    ctx.drawImage(sourceCanvas, 0, 0, boardSize, boardSize);
    el('game-area').classList.add('done');

    var sec = Math.floor(elapsedMs / 1000);
    var total = gridSize * gridSize;
    var stars = 1;
    if (moves <= total * 1.7 && sec <= total * 9) stars = 3;
    else if (moves <= total * 2.6 && sec <= total * 16) stars = 2;

    if (currentLevel && typeof currentLevel.id === 'number') {
        var best = Math.max(currentLevel.stars || 0, stars);
        saveLevelProgress(currentLevel.id, { stars: best, completed: true });
        unlockNextLevels(currentLevel.id);
    }

    var mm = String(Math.floor(sec / 60)).padStart(2, '0');
    var ss = String(sec % 60).padStart(2, '0');
    el('victory-time').textContent = mm + ':' + ss;
    el('victory-moves').textContent = moves;

    var box = el('victory-stars');
    box.innerHTML = '';
    for (var i = 1; i <= 3; i++) {
        var s = document.createElement('span');
        s.className = 'victory-star' + (i <= stars ? '' : ' empty');
        s.textContent = '⭐';
        box.appendChild(s);
    }

    el('screen-victory').classList.add('active');
    startConfetti();
}

function nextLevel() {
    audio.playClick();
    el('screen-victory').classList.remove('active');
    var levels = getLevels();
    var idx = -1;
    for (var i = 0; i < levels.length; i++) if (levels[i].id === currentLevel.id) idx = i;
    var next = idx >= 0 ? levels[idx + 1] : null;
    if (next && !next.locked) selectLevel(next);
    else showScreen('screen-gallery');
}

/* ---------- КОНФЕТТИ ---------- */
function startConfetti() {
    var canvas = el('confetti-canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var colors = ['#ff9f43', '#1dd3b0', '#feca57', '#ff6b6b', '#a29bfe', '#7efff0'];
    var parts = [];
    for (var i = 0; i < 140; i++) {
        parts.push({
            x: Math.random() * canvas.width,
            y: -Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 7,
            vy: 2 + Math.random() * 4,
            size: 4 + Math.random() * 8,
            rot: Math.random() * 360,
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

/* ---------- СВОЁ ФОТО ---------- */
function addCustomPhoto() {
    audio.playClick();
    el('photo-input').click();
}

function handlePhotoUpload(event) {
    var file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
        var side = Math.min(img.width, img.height);
        var S = 720;
        var c = document.createElement('canvas');
        c.width = S; c.height = S;
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url);

        var dataURL = c.toDataURL('image/jpeg', 0.85);
        var lv = {
            id: 'custom-' + Date.now(),
            name: 'Моё фото',
            category: 'custom',
            image: dataURL,
            locked: false, stars: 0, completed: false
        };

        try {
            var custom = JSON.parse(localStorage.getItem('customPhotos') || '[]');
            custom.push(lv);
            localStorage.setItem('customPhotos', JSON.stringify(custom));
        } catch (e) { /* переполнение квоты — играем без сохранения */ }

        currentLevel = lv;
        audio.playPlace();
        vibrate(30);
        var last = 4;
        try { last = parseInt(localStorage.getItem('lastGrid') || '4', 10) || 4; } catch (e) {}
        startGame(last);
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('Не удалось прочитать файл 😢'); };
    img.src = url;
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
    var colors = ['#ff9f43', '#1dd3b0', '#a29bfe'];
    for (var i = 0; i < 26; i++) {
        var p = document.createElement('div');
        p.className = 'particle';
        var size = 2 + Math.random() * 4;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = (Math.random() * 8) + 's';
        p.style.animationDuration = (6 + Math.random() * 7) + 's';
        box.appendChild(p);
    }
    updateMenuStats();
    loadSettingsUI();
});