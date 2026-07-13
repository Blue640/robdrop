// Инициализация
const tg = window.Telegram.WebApp;
const api = new GameAPI();

// Глобальное состояние игры
let gameState = {
    coins: 500,
    inventory: {},
    cases_opened: 0,
    total_earned: 0,
    last_daily: null,
    recent_drops: [],
    transactions: []
};

// Инициализация приложения
async function initApp() {
    // Показываем сплеш
    showSplash();
    
    // Инициализируем API
    await api.init();
    
    // Загружаем данные
    const data = api.loadFromLocal();
    if (data) {
        gameState = { ...gameState, ...data };
    }
    
    // Настраиваем Telegram
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
    
    // Устанавливаем данные пользователя
    const user = tg.initDataUnsafe?.user;
    if (user) {
        document.getElementById('user-name').textContent = user.first_name || 'Игрок';
        if (user.photo_url) {
            document.getElementById('user-avatar').style.backgroundImage = `url(${user.photo_url})`;
            document.getElementById('user-avatar').textContent = '';
        }
    }
    
    // Обновляем UI
    updateUI();
    renderRecentDrops();
    
    // Показываем приложение
    setTimeout(() => {
        hideSplash();
        showScreen('home');
    }, 2000);
}

function showSplash() {
    document.getElementById('splash').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function hideSplash() {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('splash').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }, 500);
}

// Переключение экранов
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${screenName}-screen`).classList.add('active');
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.screen === screenName) {
            btn.classList.add('active');
        }
    });
    
    // Обновляем контент экрана
    switch(screenName) {
        case 'inventory':
            renderInventory();
            break;
        case 'case':
            renderCaseScreen();
            break;
        case 'shop':
            renderShop();
            break;
        case 'profile':
            renderProfile();
            break;
    }
}

// Навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        showScreen(btn.dataset.screen);
    });
});

// Обновление UI
function updateUI() {
    document.getElementById('coins-display').textContent = formatNumber(gameState.coins);
    document.getElementById('total-items').textContent = 
        `${getTotalItems()} предметов`;
    
    // Ежедневный бонус
    const today = new Date().toDateString();
    const dailyBtn = document.getElementById('daily-btn');
    if (gameState.last_daily === today) {
        dailyBtn.textContent = 'Получено ✓';
        dailyBtn.classList.add('claimed');
    }
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getTotalItems() {
    return Object.values(gameState.inventory).reduce((a, b) => a + b, 0);
}

// Открытие кейса
async function openCaseAnimation() {
    if (gameState.coins < 100) {
        showToast('Недостаточно монет! 😢', 'error');
        return;
    }
    
    // Списываем монеты
    gameState.coins -= 100;
    gameState.cases_opened++;
    updateUI();
    
    // Анимация
    showModal('case-opening', `
        <div class="case-animation-container">
            <div class="case-box-animated">📦</div>
            <div class="case-sparkles">✨</div>
        </div>
    `);
    
    // Генерируем дроп через 2 секунды
    setTimeout(async () => {
        const weapon = generateDrop();
        
        // Добавляем в инвентарь
        if (!gameState.inventory[weapon.id]) {
            gameState.inventory[weapon.id] = 0;
        }
        gameState.inventory[weapon.id]++;
        
        // Добавляем в историю
        gameState.recent_drops.unshift({
            weapon: weapon,
            timestamp: new Date().toISOString()
        });
        if (gameState.recent_drops.length > 10) {
            gameState.recent_drops.pop();
        }
        
        // Транзакция
        gameState.transactions.push({
            type: 'open_case',
            weapon_id: weapon.id,
            coins: -100,
            timestamp: new Date().toISOString()
        });
        
        // Сохраняем
        saveGame();
        
        // Синхронизируем с сервером
        await api.syncToServer(gameState);
        
        // Показываем результат
        showModal('drop-result', `
            <div class="drop-result-container">
                <div class="drop-weapon-icon">${weapon.emoji}</div>
                <h2>${weapon.name}</h2>
                <span class="weapon-tier-badge tier-${weapon.tierName.toLowerCase()}">
                    ${weapon.tierName}
                </span>
                <p class="drop-price">💎 ${weapon.price} монет</p>
                <button class="btn-action-large" onclick="closeModal(); showScreen('inventory');">
                    В инвентарь
                </button>
            </div>
        `, false);
        
        tg.HapticFeedback.notificationOccurred('success');
    }, 2000);
}

function generateDrop() {
    const weapons = {
        wooden_sword: { id: 'wooden_sword', name: 'Деревянный Меч', tier: 1, tierName: 'Common', emoji: '⚪', price: 10, chance: 0.15 },
        rusty_knife: { id: 'rusty_knife', name: 'Ржавый Нож', tier: 1, tierName: 'Common', emoji: '⚪', price: 15, chance: 0.15 },
        plastic_gun: { id: 'plastic_gun', name: 'Пластиковый Пистолет', tier: 1, tierName: 'Common', emoji: '⚪', price: 12, chance: 0.15 },
        hunting_knife: { id: 'hunting_knife', name: 'Охотничий Нож', tier: 2, tierName: 'Uncommon', emoji: '🟢', price: 50, chance: 0.10 },
        pistol: { id: 'pistol', name: 'Пистолет', tier: 2, tierName: 'Uncommon', emoji: '🟢', price: 45, chance: 0.10 },
        baton: { id: 'baton', name: 'Дубинка', tier: 2, tierName: 'Uncommon', emoji: '🟢', price: 40, chance: 0.05 },
        samurai_sword: { id: 'samurai_sword', name: 'Самурайский Меч', tier: 3, tierName: 'Rare', emoji: '🔵', price: 200, chance: 0.06 },
        revolver: { id: 'revolver', name: 'Револьвер', tier: 3, tierName: 'Rare', emoji: '🔵', price: 180, chance: 0.05 },
        combat_knife: { id: 'combat_knife', name: 'Боевой Нож', tier: 3, tierName: 'Rare', emoji: '🔵', price: 160, chance: 0.04 },
        flame_sword: { id: 'flame_sword', name: 'Огненный Меч', tier: 4, tierName: 'Epic', emoji: '🟣', price: 800, chance: 0.03 },
        desert_eagle: { id: 'desert_eagle', name: 'Пустынный Орёл', tier: 4, tierName: 'Epic', emoji: '🟣', price: 750, chance: 0.03 },
        tactical_knife: { id: 'tactical_knife', name: 'Тактический Нож', tier: 4, tierName: 'Epic', emoji: '🟣', price: 700, chance: 0.02 },
        frost_blade: { id: 'frost_blade', name: 'Ледяной Клинок', tier: 5, tierName: 'Legendary', emoji: '🟡', price: 3000, chance: 0.02 },
        golden_gun: { id: 'golden_gun', name: 'Золотой Пистолет', tier: 5, tierName: 'Legendary', emoji: '🟡', price: 2800, chance: 0.02 },
        shadow_dagger: { id: 'shadow_dagger', name: 'Теневой Кинжал', tier: 5, tierName: 'Legendary', emoji: '🟡', price: 2600, chance: 0.01 },
        phoenix_blade: { id: 'phoenix_blade', name: 'Клинок Феникса', tier: 6, tierName: 'Ancient', emoji: '🔴', price: 12000, chance: 0.01 },
        dragon_slayer: { id: 'dragon_slayer', name: 'Убийца Драконов', tier: 6, tierName: 'Ancient', emoji: '🔴', price: 15000, chance: 0.007 },
        void_reaver: { id: 'void_reaver', name: 'Жнец Бездны', tier: 6, tierName: 'Ancient', emoji: '🔴', price: 18000, chance: 0.003 }
    };
    
    const totalChance = Object.values(weapons).reduce((sum, w) => sum + w.chance, 0);
    let rand = Math.random() * totalChance;
    let cumulative = 0;
    
    for (const weapon of Object.values(weapons)) {
        cumulative += weapon.chance;
        if (rand <= cumulative) return weapon;
    }
    
    return weapons.wooden_sword;
}

// Сохранение игры
function saveGame() {
    localStorage.setItem('robdrop_data', JSON.stringify(gameState));
}

// Toast уведомления
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Модальное окно
function showModal(title, content, showClose = true) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    
    if (showClose) {
        document.querySelector('.modal-close').style.display = 'block';
    } else {
        document.querySelector('.modal-close').style.display = 'none';
    }
    
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// Закрытие модалки по клику на фон
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

// Ежедневный бонус
async function claimDaily() {
    const today = new Date().toDateString();
    
    if (gameState.last_daily === today) {
        showToast('Уже получено сегодня!', 'warning');
        return;
    }
    
    const bonus = Math.floor(Math.random() * 400) + 100;
    gameState.coins += bonus;
    gameState.last_daily = today;
    
    saveGame();
    updateUI();
    await api.syncToServer(gameState);
    
    showToast(`+${bonus} 💰 Ежедневный бонус!`, 'success');
    tg.HapticFeedback.notificationOccurred('success');
}

// Рендер инвентаря
function renderInventory(filter = 'all') {
    const container = document.getElementById('inventory-list');
    let items = Object.entries(gameState.inventory);
    
    if (filter !== 'all') {
        items = items.filter(([id]) => {
            const weapon = getWeaponById(id);
            return weapon && weapon.tierName.toLowerCase() === filter;
        });
    }
    
    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 16px;">🎒</div>
                <p>Инвентарь пуст</p>
                <p style="font-size: 12px; margin-top: 8px;">Откройте кейсы чтобы получить оружие!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map(([weaponId, quantity]) => {
        const weapon = getWeaponById(weaponId);
        if (!weapon) return '';
        
        return `
            <div class="weapon-card ${weapon.tierName.toLowerCase()}">
                <div class="weapon-icon">${weapon.emoji}</div>
                <div class="weapon-details">
                    <div class="weapon-name">${weapon.name}</div>
                    <span class="weapon-tier-badge tier-${weapon.tierName.toLowerCase()}">${weapon.tierName}</span>
                    <div class="weapon-price">💎 ${weapon.price}</div>
                </div>
                <div class="weapon-quantity">${quantity}</div>
                <div class="weapon-actions">
                    <button class="btn-action btn-sell" onclick="sellWeapon('${weaponId}')">Продать</button>
                    ${quantity >= 3 && weapon.tier < 6 ? 
                        `<button class="btn-action btn-upgrade" onclick="upgradeWeapon('${weaponId}')">Апгрейд</button>` 
                        : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getWeaponById(id) {
    const weapon = generateDrop();
    // В реальном приложении здесь должен быть поиск по ID
    return weapon;
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
