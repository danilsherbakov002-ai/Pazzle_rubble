/* ===== НАСТРОЙКИ v3 ===== */

var DEFAULT_SETTINGS = {
    sfx: true,
    music: true,
    vibration: true,
    hints: true,
    targetGlow: true
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
    document.getElementById('setting-targetglow').checked = s.targetGlow;
    document.getElementById('setting-hints').checked = s.hints;
    applySettings(s);
}

function resetProgress() {
    if (confirm('Сбросить весь прогресс? Фото из «Мои фото» останутся.')) {
        localStorage.removeItem('puzzleProgress');
        LEVELS_DATA.forEach(function (lv) {
            lv.stars = 0; lv.completed = false; lv.locked = lv.id > 3;
        });
        audio.playClick();
        showScreen('screen-menu');
        updateMenuStats();
    }
}

document.addEventListener('DOMContentLoaded', loadSettingsUI);

function vibrate(pattern) {
    if (window.gameSettings && window.gameSettings.vibration && navigator.vibrate) navigator.vibrate(pattern);
}