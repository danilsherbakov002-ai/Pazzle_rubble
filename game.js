// ===== MAIN GAME ENGINE =====

// State
let currentLevel = null;
let gridSize = 4;
let pieces = [];
let placedPieces = [];
let moves = 0;
let startTime = 0;
let timerInterval = null;
let isPaused = false;
let draggingPiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let gameCanvas = null;
let gameCtx = null;
let canvasWidth = 0;
let canvasHeight = 0;
let pieceSize = 0;
let hintVisible = false;
let hintOverlayEl = null;
let originalImage = null;

// ===== SCREEN NAVIGATION =====
function showScreen(screenId) {
    audio.playClick();
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }
    
    // Refresh content based on screen
    if (screenId === 'screen-gallery') {
        renderGallery();
    } else if (screenId === 'screen-menu') {
        updateMenuStats();
    } else if (screenId === 'screen-settings') {
        loadSettingsUI();
    }
}

// ===== MENU =====
function updateMenuStats() {
    document.getElementById('total-stars').textContent = getTotalStars();
    document.getElementById('total-completed').textContent = getTotalCompleted();
}

// ===== GALLERY =====
let currentCategory = 'all';

function renderGallery() {
    renderCategoryTabs();
    renderLevelsGrid();
}

function renderCategoryTabs() {
    const container = document.getElementById('category-tabs');
    container.innerHTML = '';
    
    CATEGORIES.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = `category-tab ${cat.id === currentCategory ? 'active' : ''}`;
        tab.textContent = cat.name;
        tab.onclick = () => {
            currentCategory = cat.id;
            audio.playClick();
            renderGallery();
        };
        container.appendChild(tab);
    });
}

function renderLevelsGrid() {
    const container = document.getElementById('levels-grid');
    container.innerHTML = '';
    
    const levels = getLevels();
    let filtered = levels;
    
    if (currentCategory !== 'all') {
        filtered = levels.filter(l => l.category === currentCategory);
    }
    
    filtered.forEach((level, index) => {
        const card = document.createElement('div');
        card.className = `level-card ${level.locked ? 'locked' : ''}`;
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <img class="level-card-img" src="${level.image}" alt="${level.name}" loading="lazy">
            <div class="level-card-overlay">
                <div class="level-card-name">${level.name}</div>
                <div class="level-card-stars">
                    ${[1,2,3].map(s => `<span class="star ${level.stars >= s ? 'filled' : ''}">⭐</span>`).join('')}
                </div>
            </div>
        `;
        
        if (!level.locked) {
            card.onclick = () => selectLevel(level);
        }
        
        container.appendChild(card);
    });
}

// ===== LEVEL SELECTION =====
function selectLevel(level) {
    audio.playClick();
    currentLevel = level;
    
    document.getElementById('difficulty-preview-img').src = level.image;
    document.getElementById('difficulty-level-name').textContent = level.name;
    
    showScreen('screen-difficulty');
}

// ===== START GAME =====
function startGame(grid) {
    audio.playClick();
    gridSize = grid;
    moves = 0;
    pieces = [];
    placedPieces = [];
    draggingPiece = null;
    hintVisible = false;
    
    showScreen('screen-game');
    
    // Load image and create puzzle
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        originalImage = img;
        initGameCanvas(img);
        createPieces(img);
        startTimer();
        
        // Start music
        if (audio.musicEnabled) {
            audio.startMusic();
        }
    };
    img.onerror = () => {
        // Fallback: create a colorful gradient image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 600;
        tempCanvas.height = 600;
        const tempCtx = tempCanvas.getContext('2d');
        
        const gradient = tempCtx.createLinearGradient(0, 0, 600, 600);
        gradient.addColorStop(0, '#6c5ce7');
        gradient.addColorStop(0.5, '#fd79a8');
        gradient.addColorStop(1, '#00b894');
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, 600, 600);
        
        // Add some shapes
        for (let i = 0; i < 20; i++) {
            tempCtx.beginPath();
            tempCtx.arc(Math.random()*600, Math.random()*600, Math.random()*50+20, 0, Math.PI*2);
            tempCtx.fillStyle = `hsla(${Math.random()*360}, 70%, 60%, 0.5)`;
            tempCtx.fill();
        }
        
        originalImage = tempCanvas;
        initGameCanvas(tempCanvas);
        createPieces(tempCanvas);
        startTimer();
        
        if (audio.musicEnabled) {
            audio.startMusic();
        }
    };
    img.src = currentLevel.image;
}

function initGameCanvas(imgSource) {
    gameCanvas = document.getElementById('game-canvas');
    gameCtx = gameCanvas.getContext('2d');
    
    // Calculate dimensions based on screen
    const gameArea = document.getElementById('game-area');
    const maxWidth = gameArea.clientWidth - 20;
    const maxHeight = gameArea.clientHeight - 20;
    
    // Use square canvas
    canvasWidth = Math.min(maxWidth, maxHeight, 600);
    canvasHeight = canvasWidth;
    
    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    gameCanvas.width = canvasWidth * dpr;
    gameCanvas.height = canvasHeight * dpr;
    gameCanvas.style.width = canvasWidth + 'px';
    gameCanvas.style.height = canvasHeight + 'px';
    gameCtx.scale(dpr, dpr);
    
    pieceSize = canvasWidth / gridSize;
    
    // Setup hint overlay
    hintOverlayEl = document.getElementById('hint-overlay');
    hintOverlayEl.src = currentLevel.image;
    hintOverlayEl.style.width = canvasWidth + 'px';
    hintOverlayEl.style.height = canvasHeight + 'px';
    
    // Draw board background
    drawBoard();
    
    // Setup touch/mouse events
    setupInputHandlers();
    
    // Update UI
    document.getElementById('game-moves').textContent = '0';
}

function drawBoard() {
    gameCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw grid cells
    const settings = getSettings();
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const x = col * pieceSize;
            const y = row * pieceSize;
            
            // Cell background
            gameCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            gameCtx.fillRect(x, y, pieceSize, pieceSize);
            
            // Cell border
            gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            gameCtx.lineWidth = 1;
            gameCtx.strokeRect(x + 0.5, y + 0.5, pieceSize - 1, pieceSize - 1);
            
            // Show hint outlines if enabled
            if (settings.hints) {
                // Subtle hint number
                gameCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                gameCtx.font = `${pieceSize * 0.2}px Inter`;
                gameCtx.textAlign = 'center';
                gameCtx.textBaseline = 'middle';
                gameCtx.fillText(
                    `${row * gridSize + col + 1}`,
                    x + pieceSize / 2,
                    y + pieceSize / 2
                );
            }
        }
    }
}

function createPieces(imgSource) {
    pieces = [];
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const piece = {
                id: row * gridSize + col,
                correctRow: row,
                correctCol: col,
                currentX: 0,
                currentY: 0,
                placed: false,
                width: pieceSize,
                height: pieceSize,
                imageData: null
            };
            
            // Create piece image
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = pieceSize * (window.devicePixelRatio || 1);
            pieceCanvas.height = pieceSize * (window.devicePixelRatio || 1);
            const pieceCtx = pieceCanvas.getContext('2d');
            
            const imgW = imgSource.width || imgSource.naturalWidth || 600;
            const imgH = imgSource.height || imgSource.naturalHeight || 600;
            const srcX = (col / gridSize) * imgW;
            const srcY = (row / gridSize) * imgH;
            const srcW = imgW / gridSize;
            const srcH = imgH / gridSize;
            
            pieceCtx.drawImage(
                imgSource,
                srcX, srcY, srcW, srcH,
                0, 0, pieceCanvas.width, pieceCanvas.height
            );
            
            piece.imageCanvas = pieceCanvas;
            pieces.push(piece);
        }
    }
    
    // Shuffle pieces
    shufflePieces();
    
    // Draw pieces
    drawPieces();
}

function shufflePieces() {
    const padding = 20;
    const shuffleArea = {
        minX: padding,
        minY: canvasHeight + 10, // Below the puzzle board
        maxX: canvasWidth - pieceSize - padding,
        maxY: canvasHeight + 200
    };
    
    // Actually, let's shuffle within the canvas but scattered
    // Since canvas might be limited, let's scatter around edges and below
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    
    // Position pieces randomly in a tray area below the grid
    const trayY = canvasHeight * 0.6;
    const trayHeight = canvasHeight * 0.4 - 20;
    
    pieces.forEach((piece, index) => {
        // Scatter around the canvas
        piece.currentX = Math.random() * (canvasWidth - pieceSize);
        piece.currentY = trayY + Math.random() * trayHeight;
        
        // Make sure they don't overlap their correct position
        const correctX = piece.correctCol * pieceSize;
        const correctY = piece.correctRow * pieceSize;
        
        if (Math.abs(piece.currentX - correctX) < pieceSize && 
            Math.abs(piece.currentY - correctY) < pieceSize) {
            piece.currentX = (piece.currentX + pieceSize * 2) % canvasWidth;
        }
    });
}

function drawPieces() {
    // Redraw board
    drawBoard();
    
    // Draw placed pieces first
    pieces.filter(p => p.placed).forEach(piece => {
        const x = piece.correctCol * pieceSize;
        const y = piece.correctRow * pieceSize;
        gameCtx.drawImage(piece.imageCanvas, 0, 0, pieceSize, pieceSize, x, y, pieceSize, pieceSize);
    });
    
    // Draw unplaced pieces on top
    pieces.filter(p => !p.placed && p !== draggingPiece).forEach(piece => {
        drawPiece(piece, piece.currentX, piece.currentY, false);
    });
    
    // Draw dragging piece on top
    if (draggingPiece) {
        drawPiece(draggingPiece, draggingPiece.currentX, draggingPiece.currentY, true);
    }
}

function drawPiece(piece, x, y, isDragging) {
    gameCtx.save();
    
    if (isDragging) {
        // Add shadow for dragged piece
        gameCtx.shadowColor = 'rgba(108, 92, 231, 0.6)';
        gameCtx.shadowBlur = 20;
        gameCtx.shadowOffsetX = 0;
        gameCtx.shadowOffsetY = 5;
        
        // Slightly scale up
        const scale = 1.05;
        const scaledSize = pieceSize * scale;
        const offsetX = (scaledSize - pieceSize) / 2;
        const offsetY = (scaledSize - pieceSize) / 2;
        
        gameCtx.drawImage(piece.imageCanvas, x - offsetX, y - offsetY, scaledSize, scaledSize);
    } else {
        // Draw border for unplaced pieces
        gameCtx.drawImage(piece.imageCanvas, x, y, pieceSize, pieceSize);
        
        // Add subtle border
        gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        gameCtx.lineWidth = 1;
        gameCtx.strokeRect(x, y, pieceSize, pieceSize);
    }
    
    gameCtx.restore();
}

// ===== INPUT HANDLING =====
function setupInputHandlers() {
    const canvas = document.getElementById('game-canvas');
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse events (for desktop testing)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
}

function getCanvasPos(e) {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleTouchStart(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);
    startDrag(pos);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!draggingPiece) return;
    const pos = getCanvasPos(e);
    moveDrag(pos);
}

function handleTouchEnd(e) {
    e.preventDefault();
    endDrag();
}

function handleMouseDown(e) {
    const pos = getCanvasPos(e);
    startDrag(pos);
}

function handleMouseMove(e) {
    if (!draggingPiece) return;
    const pos = getCanvasPos(e);
    moveDrag(pos);
}

function handleMouseUp(e) {
    endDrag();
}

function startDrag(pos) {
    // Find piece under cursor (reverse order to get topmost)
    const unplacedPieces = pieces.filter(p => !p.placed).reverse();
    
    for (const piece of unplacedPieces) {
        if (pos.x >= piece.currentX && 
            pos.x <= piece.currentX + pieceSize &&
            pos.y >= piece.currentY && 
            pos.y <= piece.currentY + pieceSize) {
            
            draggingPiece = piece;
            dragOffsetX = pos.x - piece.currentX;
            dragOffsetY = pos.y - piece.currentY;
            
            audio.playPickup();
            vibrate(10);
            break;
        }
    }
}

function moveDrag(pos) {
    if (!draggingPiece) return;
    
    draggingPiece.currentX = pos.x - dragOffsetX;
    draggingPiece.currentY = pos.y - dragOffsetY;
    
    // Check if near correct position for magnetic snap visual feedback
    const correctX = draggingPiece.correctCol * pieceSize;
    const correctY = draggingPiece.correctRow * pieceSize;
    const distance = Math.hypot(draggingPiece.currentX - correctX, draggingPiece.currentY - correctY);
    
    drawPieces();
    
    // Draw snap indicator
    if (distance < pieceSize * 0.6) {
        const alpha = 1 - (distance / (pieceSize * 0.6));
        gameCtx.save();
        gameCtx.strokeStyle = `rgba(0, 184, 148, ${alpha})`;
        gameCtx.lineWidth = 3;
        gameCtx.setLineDash([5, 5]);
        gameCtx.strokeRect(correctX + 2, correctY + 2, pieceSize - 4, pieceSize - 4);
        gameCtx.restore();
    }
}

function endDrag() {
    if (!draggingPiece) return;
    
    const piece = draggingPiece;
    const correctX = piece.correctCol * pieceSize;
    const correctY = piece.correctRow * pieceSize;
    const distance = Math.hypot(piece.currentX - correctX, piece.currentY - correctY);
    const snapThreshold = pieceSize * 0.4;
    
    moves++;
    document.getElementById('game-moves').textContent = moves;
    
    if (distance < snapThreshold) {
        // Snap to correct position!
        piece.currentX = correctX;
        piece.currentY = correctY;
        piece.placed = true;
        
        audio.playSnap();
        vibrate([10, 30, 10]);
        
        // Check for completion
        const allPlaced = pieces.every(p => p.placed);
        if (allPlaced) {
            setTimeout(() => showVictory(), 300);
        }
    } else {
        // Drop where released
        audio.playError();
        vibrate(5);
    }
    
    draggingPiece = null;
    drawPieces();
}

// ===== TIMER =====
function startTimer() {
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (isPaused) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('game-timer').textContent = `${minutes}:${seconds}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ===== PAUSE =====
function pauseGame() {
    audio.playClick();
    isPaused = true;
    document.getElementById('screen-pause').classList.add('active');
}

function resumeGame() {
    audio.playClick();
    isPaused = false;
    document.getElementById('screen-pause').classList.remove('active');
}

function restartGame() {
    audio.playClick();
    stopTimer();
    audio.stopMusic();
    document.getElementById('screen-pause').classList.remove('active');
    isPaused = false;
    startGame(gridSize);
}

function quitToMenu() {
    audio.playClick();
    stopTimer();
    audio.stopMusic();
    isPaused = false;
    document.getElementById('screen-pause').classList.remove('active');
    document.getElementById('screen-victory').classList.remove('active');
    showScreen('screen-menu');
}

// ===== HINT =====
function toggleHint() {
    audio.playClick();
    hintVisible = !hintVisible;
    
    const overlay = document.getElementById('hint-overlay');
    if (hintVisible) {
        overlay.classList.remove('hidden');
        overlay.style.width = canvasWidth + 'px';
        overlay.style.height = canvasHeight + 'px';
    } else {
        overlay.classList.add('hidden');
    }
}

// ===== VICTORY =====
function showVictory() {
    stopTimer();
    audio.stopMusic();
    audio.playVictory();
    vibrate([50, 100, 50, 100, 50]);
    
    // Calculate stars
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const expectedPieces = gridSize * gridSize;
    const optimalMoves = expectedPieces;
    const moveRatio = moves / optimalMoves;
    
    let stars = 1;
    if (moveRatio <= 1.5 && elapsed < expectedPieces * 10) {
        stars = 3;
    } else if (moveRatio <= 2.5 && elapsed < expectedPieces * 20) {
        stars = 2;
    }
    
    // Update progress
    const currentStars = currentLevel.stars || 0;
    const newStars = Math.max(currentStars, stars);
    
    saveLevelProgress(currentLevel.id, {
        stars: newStars,
        completed: true,
        bestTime: elapsed
    });
    
    unlockNextLevels(currentLevel.id);
    
    // Show victory screen
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('victory-time').textContent = `${minutes}:${seconds}`;
    document.getElementById('victory-moves').textContent = moves;
    
    // Stars display
    const starsContainer = document.getElementById('victory-stars');
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        const starEl = document.createElement('span');
        starEl.className = `victory-star ${i <= stars ? '' : 'empty'}`;
        starEl.textContent = '⭐';
        starsContainer.appendChild(starEl);
    }
    
    document.getElementById('screen-victory').classList.add('active');
    
    // Start confetti
    startConfetti();
}

// ===== CONFETTI =====
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#e17055', '#a29bfe', '#fab1a0'];
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 4 + 2,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            shape: Math.random() > 0.5 ? 'rect' : 'circle'
        });
    }
    
    let animFrame;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let active = false;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.rotation += p.rotationSpeed;
            p.vx *= 0.99;
            
            if (p.y < canvas.height + 50) {
                active = true;
            }
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            
            if (p.shape === 'rect') {
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
        
        if (active) {
            animFrame = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    animate();
    
    // Stop after 5 seconds
    setTimeout(() => {
        cancelAnimationFrame(animFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

// ===== NEXT LEVEL =====
function nextLevel() {
    audio.playClick();
    document.getElementById('screen-victory').classList.remove('active');
    
    const levels = getLevels();
    const currentIndex = levels.findIndex(l => l.id === currentLevel.id);
    const nextLevelData = levels[currentIndex + 1];
    
    if (nextLevelData && !nextLevelData.locked) {
        currentLevel = nextLevelData;
        document.getElementById('difficulty-preview-img').src = nextLevelData.image;
        document.getElementById('difficulty-level-name').textContent = nextLevelData.name;
        showScreen('screen-difficulty');
    } else {
        showScreen('screen-gallery');
    }
}

// ===== CUSTOM PHOTO =====
function addCustomPhoto() {
    audio.playClick();
    document.getElementById('photo-input').click();
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const customPhotos = JSON.parse(localStorage.getItem('customPhotos') || '[]');
        const newPhoto = {
            id: Date.now(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: 'custom',
            image: e.target.result,
            locked: false,
            stars: 0,
            completed: false
        };
        
        customPhotos.push(newPhoto);
        
        // Save to localStorage (limit to prevent quota issues)
        try {
            localStorage.setItem('customPhotos', JSON.stringify(customPhotos));
            audio.playPlace();
            vibrate(30);
            renderGallery();
            alert('Фото добавлено! 📸');
        } catch (err) {
            alert('Не удалось сохранить фото. Возможно, оно слишком большое.');
        }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
}

// ===== PARTICLES BACKGROUND =====
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 6) + 's';
        particle.style.width = (2 + Math.random() * 4) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    updateMenuStats();
    loadSettingsUI();
});

// Handle visibility change (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && !isPaused && document.getElementById('screen-game').classList.contains('active')) {
        pauseGame();
    }
});