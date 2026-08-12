// ===== SETTINGS MANAGER =====
const DEFAULT_SETTINGS = {
    sfx: true,
    music: true,
    vibration: true,
    hints: true
};

function getSettings() {
    const saved = JSON.parse(localStorage.getItem('puzzleSettings') || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
}

function saveSettings(settings) {
    localStorage.setItem('puzzleSettings', JSON.stringify(settings));
}

function updateSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
    applySettings(settings);
}

function applySettings(settings) {
    // Apply SFX setting
    audio.setSFX(settings.sfx);
    
    // Apply music setting
    audio.setMusic(settings.music);
    
    // Store vibration and hints for game.js to use
    window.gameSettings = settings;
}

function loadSettingsUI() {
    const settings = getSettings();
    
    document.getElementById('setting-sfx').checked = settings.sfx;
    document.getElementById('setting-music').checked = settings.music;
    document.getElementById('setting-vibration').checked = settings.vibration;
    document.getElementById('setting-hints').checked = settings.hints;
    
    applySettings(settings);
}

function resetProgress() {
    if (confirm('Вы уверены? Весь прогресс будет удалён!')) {
        localStorage.removeItem('puzzleProgress');
        localStorage.removeItem('customPhotos');
        
        // Reset levels data
        LEVELS_DATA.forEach(level => {
            level.stars = 0;
            level.completed = false;
            level.locked = level.id > 3; // Keep first 3 unlocked
        });
        
        audio.playClick();
        showScreen('screen-menu');
        updateMenuStats();
        
        alert('Прогресс сброшен!');
    }
}

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', loadSettingsUI);

// Vibrate helper
function vibrate(pattern) {
    if (window.gameSettings && window.gameSettings.vibration && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}