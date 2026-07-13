// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

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
    casesOpened: 0,
    lastDaily: null
};

// Загрузка сохранения
function loadGame() {
    const saved = localStorage.getItem('robdrop_save');
    if (saved) {
        gameState = JSON.parse(saved);
    }
}

// Сохранение игры
function saveGame() {
    localStorage.setItem('robdrop_save', JSON.stringify(gameState));
}

// Показ экрана
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    switch(screenId) {
        case 'inventory-screen':
            renderInventory();
            break;
        case 'shop-screen':
            renderShop();
            break;
        case 'upgrade-screen':
            renderUpgrade();
            break;
        case 'profile-screen':
            renderProfile();
            break;
    }
}

// Обновление баланса
function updateBalance() {
    document.getElementById('coins-display').textContent = gameState.coins;
}

// Toast уведомление
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Генерация дропа
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

// Открытие кейса
function openCase() {
    if (gameState.coins < 100) {
        showToast('Недостаточно монет!');
        return;
    }
    
    showScreen('case-screen');
    
    // Списываем монеты
    gameState.coins -= 100;
    gameState.casesOpened++;
    updateBalance();
    
    // Анимация
    const animation = document.getElementById('case-animation');
    const result = document.getElementById('case-result');
    const resultWeapon = document.getElementById('result-weapon');
    
    animation.classList.remove('hidden');
    result.classList.add('hidden');
    
    setTimeout(() => {
        const weapon = generateDrop();
        
        // Добавляем в инвентарь
        if (!gameState.inventory[weapon.id]) {
            gameState.inventory[weapon.id] = 0;
        }
        gameState.inventory[weapon.id]++;
        
        saveGame();
        
        // Показываем результат
        resultWeapon.innerHTML = `
            <div class="weapon-emoji" style="font-size: 64px;">${weapon.emoji}</div>
            <h3>${weapon.name}</h3>
            <span class="weapon-tier tier-${weapon.tierName.toLowerCase()}">${weapon.tierName}</span>
            <p style="color: var(--gold); margin-top: 8px;">💎 ${weapon.price} монет</p>
        `;
        
        animation.classList.add('hidden');
        result.classList.remove('hidden');
        
        tg.HapticFeedback.notificationOccurred('success');
    }, 2000);
}

// Рендер инвентаря
function renderInventory(filter = 'all') {
    const container = document.getElementById('inventory-list');
    const inventory = Object.entries(gameState.inventory);
    
    if (inventory.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px;">🎒 Инвентарь пуст</p>';
        return;
    }
    
    let filteredInventory = inventory;
    if (filter !== 'all') {
        filteredInventory = inventory.filter(([id]) => 
            WEAPONS[id].tierName.toLowerCase() === filter
        );
    }
    
    let html = '';
    let currentTier = 0;
    
    const sorted = filteredInventory.sort(([a], [b]) => WEAPONS[b].tier - WEAPONS[a].tier);
    
    for (const [weaponId, quantity] of sorted) {
        const weapon = WEAPONS[weaponId];
        
        if (weapon.tier !== currentTier) {
            currentTier = weapon.tier;
            html += `<div style="margin: 12px 0 8px; font-weight: bold; color: var(--text-secondary);">
                ${weapon.tierName}
            </div>`;
        }
        
        html += `
            <div class="weapon-card">
                <div class="weapon-emoji">${weapon.emoji}</div>
                <div class="weapon-info">
                    <div class="weapon-name">${weapon.name}</div>
                    <span class="weapon-tier tier-${weapon.tierName.toLowerCase()}">${weapon.tierName}</span>
                    <div class="weapon-price">💎 ${weapon.price} × ${quantity}</div>
                </div>
                <div class="weapon-actions">
                    <button class="btn-small btn-sell" onclick="sellWeapon('${weaponId}')">Продать</button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Фильтр инвентаря
function filterInventory(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderInventory(filter);
}

// Продажа оружия
function sellWeapon(weaponId) {
    const weapon = WEAPONS[weaponId];
    const price = Math.floor(weapon.price / 2);
    
    gameState.coins += price;
    gameState.inventory[weaponId]--;
    
    if (gameState.inventory[weaponId] <= 0) {
        delete gameState.inventory[weaponId];
    }
    
    saveGame();
    updateBalance();
    renderInventory();
    showToast(`Продано за ${price} 💰`);
    tg.HapticFeedback.notificationOccurred('success');
}

// Рендер магазина
function renderShop() {
    const container = document.getElementById('shop-list');
    
    let html = '';
    let currentTier = 0;
    
    const sorted = Object.entries(WEAPONS).sort(([,a], [,b]) => a.tier - b.tier);
    
    for (const [id, weapon] of sorted) {
        if (weapon.tier !== currentTier) {
            currentTier = weapon.tier;
            html += `<div style="margin: 12px 0 8px; font-weight: bold; color: var(--text-secondary);">
                ${weapon.tierName}
            </div>`;
        }
        
        html += `
            <div class="weapon-card">
                <div class="weapon-emoji">${weapon.emoji}</div>
                <div class="weapon-info">
                    <div class="weapon-name">${weapon.name}</div>
                    <span class="weapon-tier tier-${weapon.tierName.toLowerCase()}">${weapon.tierName}</span>
                    <div class="weapon-price">💎 ${weapon.price}</div>
                </div>
                <div class="weapon-actions">
                    <button class="btn-small btn-buy" onclick="buyWeapon('${id}')">Купить</button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Покупка оружия
function buyWeapon(weaponId) {
    const weapon = WEAPONS[weaponId];
    
    if (gameState.coins < weapon.price) {
        showToast('Недостаточно монет!');
        return;
    }
    
    gameState.coins -= weapon.price;
    
    if (!gameState.inventory[weaponId]) {
        gameState.inventory[weaponId] = 0;
    }
    gameState.inventory[weaponId]++;
    
    saveGame();
    updateBalance();
    renderShop();
    showToast(`Куплено: ${weapon.name}`);
    tg.HapticFeedback.notificationOccurred('success');
}

// Рендер апгрейда
function renderUpgrade() {
    const container = document.getElementById('upgrade-list');
    
    const upgradeable = Object.entries(gameState.inventory)
        .filter(([id, qty]) => qty >= 3 && WEAPONS[id].tier < 6);
    
    if (upgradeable.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px;">Нет предметов для апгрейда<br>Нужно 3 одинаковых</p>';
        return;
    }
    
    let html = '';
    
    for (const [weaponId, quantity] of upgradeable) {
        const weapon = WEAPONS[weaponId];
        const nextTierName = Object.values(WEAPONS).find(w => w.tier === weapon.tier + 1)?.tierName || '???';
        
        html += `
            <div class="weapon-card">
                <div class="weapon-emoji">${weapon.emoji}</div>
                <div class="weapon-info">
                    <div class="weapon-name">${weapon.name}</div>
                    <span class="weapon-tier tier-${weapon.tierName.toLowerCase()}">${weapon.tierName}</span>
                    <div>×${quantity} → <b>${nextTierName}</b></div>
                </div>
                <div class="weapon-actions">
                    <button class="btn-small btn-upgrade" onclick="doUpgrade('${weaponId}')">Улучшить</button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Апгрейд
function doUpgrade(weaponId) {
    const weapon = WEAPONS[weaponId];
    
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
    
    if (!gameState.inventory[newId]) {
        gameState.inventory[newId] = 0;
    }
    gameState.inventory[newId]++;
    
    saveGame();
    updateBalance();
    renderUpgrade();
    showToast(`Улучшено! Получено: ${newWeapon.name}`);
    tg.HapticFeedback.notificationOccurred('success');
}

// Рендер профиля
function renderProfile() {
    const container = document.getElementById('profile-content');
    const user = tg.initDataUnsafe?.user || {};
    
    const totalItems = Object.values(gameState.inventory).reduce((a, b) => a + b, 0);
    const uniqueItems = Object.keys(gameState.inventory).length;
    
    container.innerHTML = `
        <div class="profile-avatar">👤</div>
        <h2>${user.first_name || 'Игрок'}</h2>
        <p style="color: var(--text-secondary);">@${user.username || 'username'}</p>
        
        <div style="margin-top: 20px;">
            <p style="font-size: 24px; color: var(--gold);">💰 ${gameState.coins}</p>
            <p style="color: var(--text-secondary);">Баланс</p>
        </div>
        
        <div class="profile-stats">
            <div class="stat-card">
                <div class="stat-value">${totalItems}</div>
                <div class="stat-label">Всего предметов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${uniqueItems}</div>
                <div class="stat-label">Уникальных</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${gameState.casesOpened}</div>
                <div class="stat-label">Кейсов открыто</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">18</div>
                <div class="stat-label">Всего оружия</div>
            </div>
        </div>
    `;
}

// Ежедневный бонус
function claimDaily() {
    const today = new Date().toDateString();
    
    if (gameState.lastDaily === today) {
        showToast('Уже получено сегодня!');
        return;
    }
    
    const bonus = Math.floor(Math.random() * 400) + 100;
    gameState.coins += bonus;
    gameState.lastDaily = today;
    
    saveGame();
    updateBalance();
    showToast(`+${bonus} 💰 Ежедневный бонус!`);
    tg.HapticFeedback.notificationOccurred('success');
}

// Инициализация
function init() {
    loadGame();
    updateBalance();
    
    // Устанавливаем имя пользователя
    const user = tg.initDataUnsafe?.user;
    if (user) {
        document.getElementById('user
