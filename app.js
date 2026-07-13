// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

// Данные оружия
const WEAPONS = {
    wooden_sword: { name: 'Деревянный Меч', tier: 1, tierName: 'Common', emoji: '⚪', price: 10, chance: 0.15 },
    rusty_knife: { name: 'Ржавый Нож', tier: 1, tierName: 'Common', emoji: '⚪', price: 15, chance: 0.15 },
    plastic_gun: { name: 'Пластиковый Пистолет', tier: 1, tierName: 'Common', emoji: '⚪', price: 12, chance: 0.15 },
    hunting_knife: { name: 'Охотничий Нож', tier: 2, tierName: 'Uncommon', emoji: '🟢', price: 50, chance: 0.10 },
    pistol: { name: 'Пистолет', tier: 2, tierName: 'Uncommon', emoji: '🟢', price: 45, chance: 0.10 },
    baton: { name: 'Дубинка', tier: 2, tierName: 'Uncommon', emoji: '🟢', price: 40, chance: 0.05 },
    samurai_sword: { name: 'Самурайский Меч', tier: 3, tierName: 'Rare', emoji: '🔵', price: 200, chance: 0.06 },
    revolver: { name: 'Револьвер', tier: 3, tierName: 'Rare', emoji: '🔵', price: 180, chance: 0.05 },
    combat_knife: { name: 'Боевой Нож', tier: 3, tierName: 'Rare', emoji: '🔵', price: 160, chance: 0.04 },
    flame_sword: { name: 'Огненный Меч', tier: 4, tierName: 'Epic', emoji: '🟣', price: 800, chance: 0.03 },
    desert_eagle: { name: 'Пустынный Орёл', tier: 4, tierName: 'Epic', emoji: '🟣', price: 750, chance: 0.03 },
    tactical_knife: { name: 'Тактический Нож', tier: 4, tierName: 'Epic', emoji: '🟣', price: 700, chance: 0.02 },
    frost_blade: { name: 'Ледяной Клинок', tier: 5, tierName: 'Legendary', emoji: '🟡', price: 3000, chance: 0.02 },
    golden_gun: { name: 'Золотой Пистолет', tier: 5, tierName: 'Legendary', emoji: '🟡', price: 2800, chance: 0.02 },
    shadow_dagger: { name: 'Теневой Кинжал', tier: 5, tierName: 'Legendary', emoji: '🟡', price: 2600, chance: 0.01 },
    phoenix_blade: { name: 'Клинок Феникса', tier: 6, tierName: 'Ancient', emoji: '🔴', price: 12000, chance: 0.01 },
    dragon_slayer: { name: 'Убийца Драконов', tier: 6, tierName: 'Ancient', emoji: '🔴', price: 15000, chance: 0.007 },
    void_reaver: { name: 'Жнец Бездны', tier: 6, tierName: 'Ancient', emoji: '🔴', price: 18000, chance: 0.003 }
};

// Состояние игры
let gameState = {
    coins: 500,
    inventory: {},
    casesOpened: 0
};

// Загружаем данные из облачного хранилища Telegram
function loadGame() {
    tg.CloudStorage.getItem('mm2_save', (err, value) => {
        if (!err && value) {
            gameState = JSON.parse(value);
            updateUI();
        }
    });
}

// Сохраняем данные
function saveGame() {
    tg.CloudStorage.setItem('mm2_save', JSON.stringify(gameState));
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('coins').textContent = gameState.coins;
}

// Генерация случайного оружия
function generateDrop() {
    const totalChance = Object.values(WEAPONS).reduce((sum, w) => sum + w.chance, 0);
    let rand = Math.random() * totalChance;
    let cumulative = 0;
    
    for (const [id, weapon] of Object.entries(WEAPONS)) {
        cumulative += weapon.chance;
        if (rand <= cumulative) return { id, ...weapon };
    }
    
    return { id: 'wooden_sword', ...WEAPONS.wooden_sword };
}

// Открытие кейса с анимацией
function openCase() {
    if (gameState.coins < 100) {
        tg.showAlert('❌ Недостаточно монет! Нужно 100, у вас ' + gameState.coins);
        return;
    }
    
    gameState.coins -= 100;
    gameState.casesOpened++;
    
    // Показываем анимацию
    showCaseAnimation().then(() => {
        const weapon = generateDrop();
        
        // Добавляем в инвентарь
        if (!gameState.inventory[weapon.id]) {
            gameState.inventory[weapon.id] = 0;
        }
        gameState.inventory[weapon.id]++;
        
        saveGame();
        updateUI();
        
        // Показываем результат
        tg.showPopup({
            title: '🎉 Дроп!',
            message: `Вы получили:\n${weapon.emoji} ${weapon.name}\nРедкость: ${weapon.tierName}\nЦена: ${weapon.price} монет`,
            buttons: [
                { id: 'ok', type: 'default', text: 'Круто!' },
                { id: 'inventory', type: 'default', text: 'В инвентарь' }
            ]
        }, (buttonId) => {
            if (buttonId === 'inventory') showInventory();
        });
    });
}

// Анимация открытия кейса
function showCaseAnimation() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'animation-overlay';
        overlay.innerHTML = '<div class="case-opening">🎁</div>';
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.querySelector('.case-opening').textContent = '🎰';
        }, 500);
        
        setTimeout(() => {
            overlay.querySelector('.case-opening').textContent = '✨';
        }, 1000);
        
        setTimeout(() => {
            document.body.removeChild(overlay);
            resolve();
        }, 1500);
    });
}

// Показ инвентаря
function showInventory() {
    const content = document.getElementById('content');
    
    if (Object.keys(gameState.inventory).length === 0) {
        content.innerHTML = '<p style="text-align:center; padding:20px;">🎒 Инвентарь пуст</p>';
        return;
    }
    
    let html = '<h3>🎒 Инвентарь</h3>';
    
    // Сортируем по тиру
    const sortedInventory = Object.entries(gameState.inventory)
        .sort(([id1], [id2]) => WEAPONS[id2].tier - WEAPONS[id1].tier);
    
    let currentTier = 0;
    for (const [weaponId, quantity] of sortedInventory) {
        const weapon = WEAPONS[weaponId];
        
        if (weapon.tier !== currentTier) {
            currentTier = weapon.tier;
            html += `<div class="tier-badge" style="background: ${getTierColor(weapon.tier)}">
                ${weapon.tierName}
            </div>`;
        }
        
        html += `
            <div class="weapon-card">
                <div class="weapon-emoji">${weapon.emoji}</div>
                <div class="weapon-info">
                    <div class="weapon-name">${weapon.name}</div>
                    <div class="weapon-tier">${weapon.tierName}</div>
                    <div class="weapon-price">💎 ${weapon.price} x${quantity}</div>
                </div>
                <button class="btn btn-secondary" onclick="sellWeapon('${weaponId}')">
                    Продать
                </button>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Получение цвета тира
function getTierColor(tier) {
    const colors = {
        1: '#9e9e9e', // Common
        2: '#4caf50', // Uncommon
        3: '#2196f3', // Rare
        4: '#9c27b0', // Epic
        5: '#ff9800', // Legendary
        6: '#f44336'  // Ancient
    };
    return colors[tier] || '#9e9e9e';
}

// Продажа оружия
function sellWeapon(weaponId) {
    const weapon = WEAPONS[weaponId];
    const quantity = gameState.inventory[weaponId];
    
    tg.showPopup({
        title: '💰 Продажа',
        message: `Продать ${weapon.name}?\nЦена продажи: ${Math.floor(weapon.price / 2)} монет`,
        buttons: [
            { id: 'sell', type: 'destructive', text: 'Продать' },
            { id: 'cancel', type: 'cancel', text: 'Отмена' }
        ]
    }, (buttonId) => {
        if (buttonId === 'sell') {
            gameState.coins += Math.floor(weapon.price / 2);
            gameState.inventory[weaponId]--;
            
            if (gameState.inventory[weaponId] <= 0) {
                delete gameState.inventory[weaponId];
            }
            
            saveGame();
            updateUI();
            showInventory();
            
            tg.HapticFeedback.notificationOccurred('success');
        }
    });
}

// Показ магазина
function showShop() {
    const content = document.getElementById('content');
    
    let html = '<h3>🏪 Магазин</h3>';
    let currentTier = 0;
    
    const sortedWeapons = Object.entries(WEAPONS)
        .sort(([, a], [, b]) => a.tier - b.tier);
    
    for (const [id, weapon] of sortedWeapons) {
        if (weapon.tier !== currentTier) {
            currentTier = weapon.tier;
            html += `<div class="tier-badge" style="background: ${getTierColor(weapon.tier)}">
                ${weapon.tierName}
            </div>`;
        }
        
        html += `
            <div class="weapon-card">
                <div class="weapon-emoji">${weapon.emoji}</div>
                <div class="weapon-info">
                    <div class="weapon-name">${weapon.name}</div>
                    <div class="weapon-tier">${weapon.tierName}</div>
                    <div class="weapon-price">💎 ${weapon.price}</div>
                </div>
                <button class="btn btn-secondary" onclick="buyWeapon('${id}')">
                    Купить
                </button>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Покупка оружия
function buyWeapon(weaponId) {
    const weapon = WEAPONS[weaponId];
    
    if (gameState.coins < weapon.price) {
        tg.showAlert('❌ Недостаточно монет!');
        return;
    }
    
    tg.showPopup({
        title: '🛒 Покупка',
        message: `Купить ${weapon.name} за ${weapon.price} монет?`,
        buttons: [
            { id: 'buy', type: 'default', text: 'Купить' },
            { id: 'cancel', type: 'cancel', text: 'Отмена' }
        ]
    }, (buttonId) => {
        if (buttonId === 'buy') {
            gameState.coins -= weapon.price;
            
            if (!gameState.inventory[weaponId]) {
                gameState.inventory[weaponId] = 0;
            }
            gameState.inventory[weaponId]++;
            
            saveGame();
            updateUI();
            showShop();
            
            tg.HapticFeedback.notificationOccurred('success');
        }
    });
}

// Система апгрейда
function upgradeWeapon() {
    const content = document.getElementById('content');
    
    // Находим оружие, которого 3+ штук
    const upgradeable = Object.entries(gameState.inventory)
        .filter(([id, qty]) => qty >= 3 && WEAPONS[id].tier < 6);
    
    if (upgradeable.length === 0) {
        content.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <h3>⬆️ Апгрейд</h3>
                <p>Нужно 3 одинаковых предмета для улучшения</p>
                <p>Соберите больше оружия!</p>
            </div>
        `;
        return;
    }
    
    let html = '<h3>⬆️ Доступно для апгрейда</h3>';
    
    for (const [weaponId, quantity] of upgradeable) {
        const weapon = WEAPONS[weaponId];
        const nextTier = weapon.tier + 1;
        const nextTierName = Object.values(WEAPONS).find(w => w.tier === nextTier)?.tierName || '???';
        
        html += `
            <div class="weapon-card">
                <div class="weapon-emoji">${weapon.emoji}</div>
                <div class="weapon-info">
                    <div class="weapon-name">${weapon.name}</div>
                    <div class="weapon-tier">x${quantity} → ${nextTierName}</div>
                </div>
                <button class="btn btn-primary" onclick="doUpgrade('${weaponId}')">
                    Улучшить
                </button>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Выполнение апгрейда
function doUpgrade(weaponId) {
    const weapon = WEAPONS[weaponId];
    
    tg.showPopup({
        title: '⬆️ Апгрейд',
        message: `Улучшить 3x ${weapon.name}?\nПолучите случайное оружие следующего тира!`,
        buttons: [
            { id: 'upgrade', type: 'default', text: 'Улучшить' },
            { id: 'cancel', type: 'cancel', text: 'Отмена' }
        ]
    }, (buttonId) => {
        if (buttonId === 'upgrade') {
            // Удаляем 3 предмета
            gameState.inventory[weaponId] -= 3;
            if (gameState.inventory[weaponId] <= 0) {
                delete gameState.inventory[weaponId];
            }
            
            // Находим случайное оружие следующего тира
            const nextTier = weapon.tier + 1;
            const possibleUpgrades = Object.entries(WEAPONS)
                .filter(([id, w]) => w.tier === nextTier);
            
            const [newId, newWeapon] = possibleUpgrades[Math.floor(Math.random() * possibleUpgrades.length)];
            
            // Добавляем новое оружие
            if (!gameState.inventory[newId]) {
                gameState.inventory[newId] = 0;
            }
            gameState.inventory[newId]++;
            
            saveGame();
            updateUI();
            upgradeWeapon();
            
            tg.showAlert(`🎉 Улучшено!\nПолучено: ${newWeapon.emoji} ${newWeapon.name}`);
            tg.HapticFeedback.notificationOccurred('success');
        }
    });
}

// Инициализация
tg.ready();
loadGame();
updateUI();

// Настройка темы
document.documentElement.style.setProperty('--tg-theme-bg', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-button', tg.themeParams.button_color || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-text', tg.themeParams.button_text_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary', tg.themeParams.secondary_bg_color || '#f0f0f0');
