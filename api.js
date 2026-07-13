// API модуль для синхронизации с ботом
class GameAPI {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.userId = null;
        this.sessionToken = null;
        this.apiUrl = 'https://your-api-server.com/api'; // Замените на ваш API URL
        this.syncInterval = null;
    }

    async init() {
        // Получаем параметры из URL
        const params = new URLSearchParams(window.location.search);
        this.userId = params.get('user_id');
        this.sessionToken = params.get('session');
        
        if (this.userId && this.sessionToken) {
            // Загружаем данные с сервера
            await this.loadFromServer();
            
            // Запускаем периодическую синхронизацию
            this.startAutoSync();
        } else {
            // Загружаем из локального хранилища
            this.loadFromLocal();
        }
    }

    async loadFromServer() {
        try {
            const response = await fetch(`${this.apiUrl}/user?user_id=${this.userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Сохраняем в локальное хранилище
                localStorage.setItem('robdrop_data', JSON.stringify(data));
                return data;
            }
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
        }
        
        return this.loadFromLocal();
    }

    async syncToServer(gameState) {
        if (!this.userId || !this.sessionToken) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    init_data: this.tg.initData,
                    game_data: gameState
                })
            });
            
            if (response.ok) {
                const serverData = await response.json();
                // Обновляем локальные данные серверными
                localStorage.setItem('robdrop_data', JSON.stringify(serverData.data));
                return serverData.data;
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
        
        return null;
    }

    loadFromLocal() {
        const saved = localStorage.getItem('robdrop_data');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Данные по умолчанию
        return {
            coins: 500,
            inventory: {},
            cases_opened: 0,
            total_earned: 0,
            transactions: []
        };
    }

    startAutoSync() {
        // Синхронизация каждые 30 секунд
        this.syncInterval = setInterval(() => {
            const gameState = window.gameState;
            if (gameState) {
                this.syncToServer(gameState);
            }
        }, 30000);
        
        // Синхронизация при закрытии
        this.tg.onEvent('viewportChanged', () => {
            if (this.tg.isExpanded === false) {
                const gameState = window.gameState;
                if (gameState) {
                    this.syncToServer(gameState);
                }
            }
        });
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Экспорт
window.GameAPI = GameAPI;
