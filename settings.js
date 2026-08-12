/* ===== НАСТРОЙКИ ===== */

var DEFAULT_SETTINGS = {
    sfx: true,
    music: true,
    vibration: true,
    hints: true,        // номера клеток на доске
    targetGlow: true    // зелёная метка цели при перетаскивании
};

function getSettings() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('puzzleSettings') || '{}'); } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS, saved);
}

function saveSettings(s) {
    localStorage.setItem('puzzleSettings', JSON.stringify(s));
}

function updateSetting(key, value) {
    var s = getSettings();
    s[key] = value;
    saveSettings(s);
    applySettings(s);
}

function applySettings(s) {
    audio.setSFX(s.sfx);
    audio.setMusic(s.music);
    window.gameSettings = s;
}

function loadSettingsUI() {
    var s = getSettings();
    document.getElementById('setting-sfx').checked = s.sfx;
    document.getElementById('setting-music').checked = s.music;
    document.getElementById('setting-vibration').checked = s.vibration;
    document.getElementById('setting-hints').checked = s.hints;
    document.getElementById('setting-targetglow').checked = s.targetGlow;
    applySettings(s);
}

function resetProgress() {
    if (confirm('Вы уверены? Весь прогресс будет удалён!')) {
        localStorage.removeItem('puzzleProgress');
        localStorage.removeItem('customPhotos');
        LEVELS_DATA.forEach(function (lv) {
            lv.stars = 0; lv.completed = false; lv.locked = lv.id > 3;
        });
        audio.playClick();
        showScreen('screen-menu');
        updateMenuStats();
        alert('Прогресс сброшен!');
    }
}

document.addEventListener('DOMContentLoaded', loadSettingsUI);

function vibrate(pattern) {
    if (window.gameSettings && window.gameSettings.vibration && navigator.vibrate) navigator.vibrate(pattern);
}