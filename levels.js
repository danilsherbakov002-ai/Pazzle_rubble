// ===== LEVELS DATA =====
const LEVELS_DATA = [
    // Nature Category
    {
        id: 1,
        name: "Горный рассвет",
        category: "nature",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop",
        locked: false,
        stars: 0,
        completed: false
    },
    {
        id: 2,
        name: "Лесное озеро",
        category: "nature",
        image: "https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=600&h=600&fit=crop",
        locked: false,
        stars: 0,
        completed: false
    },
    {
        id: 3,
        name: "Закат над полем",
        category: "nature",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=600&fit=crop",
        locked: false,
        stars: 0,
        completed: false
    },
    {
        id: 4,
        name: "Водопад",
        category: "nature",
        image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 5,
        name: "Северное сияние",
        category: "nature",
        image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 6,
        name: "Осенний лес",
        category: "nature",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },

    // Cyberpunk Category
    {
        id: 7,
        name: "Неоновый город",
        category: "cyberpunk",
        image: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 8,
        name: "Кибер-улица",
        category: "cyberpunk",
        image: "https://images.unsplash.com/photo-1545239351-ef35f43d5a14?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 9,
        name: "Ночной мегаполис",
        category: "cyberpunk",
        image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 10,
        name: "Дождевые огни",
        category: "cyberpunk",
        image: "https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 11,
        name: "Токийский перекрёсток",
        category: "cyberpunk",
        image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 12,
        name: "Ретро-футуризм",
        category: "cyberpunk",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },

    // Animals Category
    {
        id: 13,
        name: "Лев на закате",
        category: "animals",
        image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 14,
        name: "Полярная сова",
        category: "animals",
        image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 15,
        name: "Красная панда",
        category: "animals",
        image: "https://images.unsplash.com/photo-1525382455947-f319bc05fb35?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 16,
        name: "Тропическая птица",
        category: "animals",
        image: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 17,
        name: "Волк зимой",
        category: "animals",
        image: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 18,
        name: "Подводный мир",
        category: "animals",
        image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },

    // Space Category
    {
        id: 19,
        name: "Туманность Ориона",
        category: "space",
        image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 20,
        name: "Земля из космоса",
        category: "space",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 21,
        name: "Лунная поверхность",
        category: "space",
        image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 22,
        name: "Млечный путь",
        category: "space",
        image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },

    // Art Category
    {
        id: 23,
        name: "Абстракция",
        category: "art",
        image: "https://images.unsplash.com/photo-1541961017774-2224f7643724?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    },
    {
        id: 24,
        name: "Геометрия цвета",
        category: "art",
        image: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=600&h=600&fit=crop",
        locked: true,
        stars: 0,
        completed: false
    }
];

// Category metadata
const CATEGORIES = [
    { id: 'all', name: '🎯 Все', icon: '🎯' },
    { id: 'nature', name: '🌿 Природа', icon: '🌿' },
    { id: 'cyberpunk', name: '🌆 Киберпанк', icon: '🌆' },
    { id: 'animals', name: '🦁 Животные', icon: '🦁' },
    { id: 'space', name: '🚀 Космос', icon: '🚀' },
    { id: 'art', name: '🎨 Искусство', icon: '🎨' },
    { id: 'custom', name: '📷 Мои фото', icon: '📷' }
];

// Function to get levels (merges default with saved progress)
function getLevels() {
    const savedProgress = JSON.parse(localStorage.getItem('puzzleProgress') || '{}');
    const customPhotos = JSON.parse(localStorage.getItem('customPhotos') || '[]');
    
    return LEVELS_DATA.map(level => {
        const saved = savedProgress[level.id];
        if (saved) {
            return { ...level, ...saved };
        }
        return level;
    }).concat(customPhotos);
}

// Save progress for a level
function saveLevelProgress(levelId, data) {
    const savedProgress = JSON.parse(localStorage.getItem('puzzleProgress') || '{}');
    savedProgress[levelId] = { ...savedProgress[levelId], ...data };
    localStorage.setItem('puzzleProgress', JSON.stringify(savedProgress));
}

// Get total stars
function getTotalStars() {
    const levels = getLevels();
    return levels.reduce((sum, level) => sum + (level.stars || 0), 0);
}

// Get total completed
function getTotalCompleted() {
    const levels = getLevels();
    return levels.filter(level => level.completed).length;
}

// Unlock next levels after completing one
function unlockNextLevels(completedId) {
    const levels = getLevels();
    const currentIndex = levels.findIndex(l => l.id === completedId);
    
    if (currentIndex >= 0) {
        // Unlock next 2 levels
        for (let i = 1; i <= 2; i++) {
            const nextLevel = levels[currentIndex + i];
            if (nextLevel && nextLevel.locked) {
                saveLevelProgress(nextLevel.id, { locked: false });
            }
        }
    }
}