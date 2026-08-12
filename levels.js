/* ===== ДАННЫЕ УРОВНЕЙ + ПРОГРЕСС ===== */

const LEVELS_DATA = [
    // 🌿 Природа
    { id: 1,  name: "Горный рассвет",    category: "nature", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&h=800&fit=crop", locked: false, stars: 0, completed: false },
    { id: 2,  name: "Солнечный лес",     category: "nature", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&h=800&fit=crop", locked: false, stars: 0, completed: false },
    { id: 3,  name: "Туманные холмы",    category: "nature", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&h=800&fit=crop", locked: false, stars: 0, completed: false },
    { id: 4,  name: "Тихое озеро",       category: "nature", image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 5,  name: "Закат в горах",     category: "nature", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 6,  name: "Золотое поле",      category: "nature", image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },

    // 🦁 Животные
    { id: 7,  name: "Король лев",        category: "animals", image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 8,  name: "Пушистый кот",      category: "animals", image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 9,  name: "Верный пёс",        category: "animals", image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 10, name: "Рыжая лиса",        category: "animals", image: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 11, name: "Панда-милота",      category: "animals", image: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 12, name: "Щенок корги",       category: "animals", image: "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },

    // 🌆 Киберпанк / Город
    { id: 13, name: "Неоновый город",    category: "cyberpunk", image: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 14, name: "Мегаполис ночью",   category: "cyberpunk", image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 15, name: "Закат над сити",    category: "cyberpunk", image: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 16, name: "Огни магистрали",   category: "cyberpunk", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 17, name: "Кибер-улица",       category: "cyberpunk", image: "https://images.unsplash.com/photo-1545239351-ef35f43d5a14?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 18, name: "Чикаго в ночи",     category: "cyberpunk", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },

    // 🚀 Космос
    { id: 19, name: "Туманность",        category: "space", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 20, name: "Земля из космоса",  category: "space", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 21, name: "Сеть планеты",      category: "space", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 22, name: "Звёздное небо",     category: "space", image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 23, name: "Млечный путь",      category: "space", image: "https://images.unsplash.com/photo-1465101162946-4377e5774194?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },

    // 🍕 Еда
    { id: 24, name: "Ужин шефа",         category: "food", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 25, name: "Свежий салат",      category: "food", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 26, name: "Панкейки",          category: "food", image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 27, name: "Пицца",             category: "food", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 28, name: "Завтрак",           category: "food", image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },

    // 🎨 Арт
    { id: 29, name: "Абстракция",        category: "art", image: "https://images.unsplash.com/photo-1541961017774-2224f7643724?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false },
    { id: 30, name: "Красочный взрыв",   category: "art", image: "https://images.unsplash.com/photo-1549887534-1541e9326642?q=80&w=800&h=800&fit=crop", locked: true, stars: 0, completed: false }
];

const CATEGORIES = [
    { id: 'all',       name: '🎯 Все' },
    { id: 'nature',    name: '🌿 Природа' },
    { id: 'animals',   name: '🦁 Животные' },
    { id: 'cyberpunk', name: '🌆 Город' },
    { id: 'space',     name: '🚀 Космос' },
    { id: 'food',      name: '🍕 Еда' },
    { id: 'art',       name: '🎨 Арт' },
    { id: 'custom',    name: '📷 Мои фото' }
];

function getLevels() {
    var saved = {};
    var custom = [];
    try { saved = JSON.parse(localStorage.getItem('puzzleProgress') || '{}'); } catch (e) {}
    try { custom = JSON.parse(localStorage.getItem('customPhotos') || '[]'); } catch (e) {}

    return LEVELS_DATA.map(function (lv) {
        var s = saved[lv.id];
        return s ? Object.assign({}, lv, s) : lv;
    }).concat(custom);
}

function saveLevelProgress(levelId, data) {
    if (typeof levelId !== 'number') return;
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('puzzleProgress') || '{}'); } catch (e) {}
    saved[levelId] = Object.assign({}, saved[levelId], data);
    localStorage.setItem('puzzleProgress', JSON.stringify(saved));
}

function getTotalStars() {
    return getLevels().reduce(function (sum, lv) { return sum + (lv.stars || 0); }, 0);
}

function getTotalCompleted() {
    return getLevels().filter(function (lv) { return lv.completed; }).length;
}

function unlockNextLevels(completedId) {
    if (typeof completedId !== 'number') return;
    var idx = -1;
    for (var i = 0; i < LEVELS_DATA.length; i++) if (LEVELS_DATA[i].id === completedId) idx = i;
    if (idx < 0) return;
    for (var k = 1; k <= 2; k++) {
        var next = LEVELS_DATA[idx + k];
        if (next) saveLevelProgress(next.id, { locked: false });
    }
}