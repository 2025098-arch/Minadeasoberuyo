// public/js/core/ui.js

const UI = {
    isLoginMode: true,
    currentUser: null, 
    friendsData: null,
    mailData: null,
    currentFriendTab: 'list',
    currentMailTab: 'inbox',
    isFriendModalOpen: false,
    isMailModalOpen: false,

    // ★拡張: 追加UIのステート管理
    currentShopTab: 'character',
    currentBackpackTab: 'character',
    currentRewardTab: 'login',

    init: function() {
        console.log("🚀 UIシステム起動");
        this.cacheElements();
        this.bindEvents();
        this.createNotificationContainer(); 
    },

    cacheElements: function() {
        // 画面
        this.authScreen = document.getElementById('auth-screen');
        this.homeScreen = document.getElementById('home-screen');

        // 入力とボタン
        this.tabLogin = document.getElementById('tab-login');
        this.tabRegister = document.getElementById('tab-register');
        this.inputNickname = document.getElementById('input-nickname');
        this.inputPin = document.getElementById('input-pin');
        this.btnTogglePin = document.getElementById('btn-toggle-pin');
        this.registerSettings = document.getElementById('register-settings');
        this.btnSubmit = document.getElementById('btn-submit');
        this.authMessage = document.getElementById('auth-message');

        // ホーム画面の表示項目
        this.uiNickname = document.getElementById('ui-nickname');
        this.uiId = document.getElementById('ui-id');
        this.uiLevel = document.getElementById('ui-level');
        this.uiCoins = document.getElementById('ui-coins');
        this.uiTrophies = document.getElementById('ui-trophies');
        this.uiTickets = document.getElementById('ui-tickets');
        this.btnLogout = document.getElementById('btn-logout');

        // メニューボタン全て
        this.btnProfile = document.getElementById('btn-profile');
        this.btnMail = document.getElementById('btn-mail');
        this.btnHistory = document.getElementById('btn-history');
        this.btnFriends = document.getElementById('btn-friends');
        this.btnRanking = document.getElementById('btn-ranking');
        this.btnRewards = document.getElementById('btn-rewards');

        this.btnShop = document.getElementById('btn-shop');
        this.btnBackpack = document.getElementById('btn-backpack');
        this.btnGacha = document.getElementById('btn-gacha');
        this.btnSettings = document.getElementById('btn-settings');

        this.btnRandomMatch = document.getElementById('btn-random-match');
        this.btnPrivateRoom = document.getElementById('btn-private-room');
        this.btnPractice = document.getElementById('btn-practice');

        // モーダル要素
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');
        this.btnCloseModal = document.getElementById('btn-close-modal');
    },

    createNotificationContainer: function() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(this.notificationContainer);
    },

    bindEvents: function() {
        this.tabLogin.addEventListener('click', () => this.switchTab(true));
        this.tabRegister.addEventListener('click', () => this.switchTab(false));

        this.btnTogglePin.addEventListener('click', () => {
            const isPassword = this.inputPin.type === 'password';
            this.inputPin.type = isPassword ? 'text' : 'password';
            this.btnTogglePin.textContent = isPassword ? '隠す' : '表示';
        });

        this.btnSubmit.addEventListener('click', () => this.handleSubmit());

        this.btnLogout.addEventListener('click', () => {
            location.reload(); 
        });

        // ================= モーダルを開くイベント（すべて専用メソッド化） =================

        this.btnProfile.addEventListener('click', () => this.renderProfileModal());

        this.btnFriends.addEventListener('click', () => {
            this.currentFriendTab = 'list'; 
            this.isFriendModalOpen = true;
            this.renderFriendsModal();
        });

        this.btnMail.addEventListener('click', () => {
            this.currentMailTab = 'inbox';
            this.isMailModalOpen = true;
            this.renderMailModal();
        });

        this.btnHistory.addEventListener('click', () => this.renderHistoryModal());
        this.btnRanking.addEventListener('click', () => this.renderRankingModal());
        this.btnRewards.addEventListener('click', () => this.renderRewardsModal());
        this.btnShop.addEventListener('click', () => this.renderShopModal());
        this.btnBackpack.addEventListener('click', () => this.renderBackpackModal());
        this.btnGacha.addEventListener('click', () => this.renderGachaModal());
        this.btnSettings.addEventListener('click', () => this.renderSettingsModal());
        this.btnRandomMatch.addEventListener('click', () => this.renderRandomMatchModal());
        this.btnPrivateRoom.addEventListener('click', () => this.renderPrivateRoomModal());
        this.btnPractice.addEventListener('click', () => this.renderPracticeModal());

        // モーダルを閉じる
        this.btnCloseModal.addEventListener('click', () => this.closeModal());
        this.modalOverlay.addEventListener('click', (e) => {
            if(e.target === this.modalOverlay) this.closeModal();
        });
    },

    switchTab: function(isLogin) {
        this.isLoginMode = isLogin;
        this.tabLogin.classList.toggle('active', isLogin);
        this.tabRegister.classList.toggle('active', !isLogin);
        if(this.registerSettings) {
            this.registerSettings.style.display = isLogin ? 'none' : 'block';
        }
        this.btnSubmit.textContent = isLogin ? 'ログインする' : '新規作成してはじめる';
        this.authMessage.textContent = ''; 
    },

    handleSubmit: function() {
        const nickname = this.inputNickname.value.trim();
        const pin = this.inputPin.value.trim();

        if (!nickname || !pin) {
            this.showAuthError('ニックネームとPINを入力してください。');
            return;
        }
        if (pin.length !== 6 || isNaN(pin)) {
            this.showAuthError('PINは6桁の数字で入力してください。');
            return;
        }

        this.authMessage.textContent = '通信中...';
        this.authMessage.style.color = 'white';

        if (this.isLoginMode) {
            Network.login(nickname, pin);
        } else {
            const settings = {
                rankingPublic: document.getElementById('setting-ranking-public')?.checked || false,
                reqHistory: document.getElementById('setting-req-history')?.checked || false,
                reqRanking: document.getElementById('setting-req-ranking')?.checked || false
            };
            Network.register(nickname, pin, settings);
        }
    },

    showAuthError: function(msg) {
        this.authMessage.textContent = msg;
        this.authMessage.style.color = 'var(--accent-red)';
    },

    onAuthSuccess: function(userData) {
        this.currentUser = userData;

        if (this.authScreen) {
            this.authScreen.classList.remove('active');
            this.authScreen.classList.add('hidden');
            this.authScreen.style.display = 'none';
        }

        if (this.homeScreen) {
            this.homeScreen.classList.remove('hidden'); 
            this.homeScreen.classList.add('active');
            this.homeScreen.style.display = 'block';

            if (typeof ModelRenderer !== 'undefined') {
                ModelRenderer.init('character-canvas-container');
            }
        }

        if(this.uiNickname) this.uiNickname.textContent = userData.nickname;
        if(this.uiId) this.uiId.textContent = userData.id;
        if(this.uiLevel) this.uiLevel.textContent = userData.level;
        if(this.uiCoins) this.uiCoins.textContent = userData.coins;
        if(this.uiTrophies) this.uiTrophies.textContent = userData.trophies;
        if(this.uiTickets) this.uiTickets.textContent = userData.gachaTickets || 0;
    },

    onAuthError: function(msg) {
        this.showAuthError(msg);
    },

    onFriendsDataUpdated: function(friendsData) {
        this.friendsData = friendsData;
        if (this.isFriendModalOpen) {
            this.renderFriendsModal();
        }
    },

    onMailDataUpdated: function(mailData) {
        this.mailData = mailData;
        const unreadCount = mailData.messages.filter(m => !m.isRead).length;
        this.btnMail.innerHTML = `✉️ メール ${unreadCount > 0 ? `<span style="background:red; color:white; border-radius:10px; padding:2px 5px; font-size:10px;">${unreadCount}</span>` : ''}`;

        if (this.isMailModalOpen) {
            this.renderMailModal();
        }
    },
    // 🏆 ランキングデータを受信して保存
    onRankingDataUpdated: function(rankingData) {
        this.rankingData = rankingData;
        // モーダルが開いていたら即座に画面を更新
        if (!this.modalOverlay.classList.contains('hidden') && this.modalTitle.textContent === "🏆 総合順位") {
            this.renderRankingModal();
        }
    },

    // 📜 バトル履歴データを受信して保存
    onHistoryDataUpdated: function(historyData) {
        this.historyData = historyData;
        if (!this.modalOverlay.classList.contains('hidden') && this.modalTitle.textContent === "📜 バトル履歴") {
            this.renderHistoryModal();
        }
    },

    showNotification: function(message, type = 'info') {
        const notif = document.createElement('div');

        let bgColor = '#333';
        if (type === 'success') bgColor = '#4caf50';
        if (type === 'error') bgColor = '#f44336';
        if (type === 'info') bgColor = '#2196f3';

        notif.style.cssText = `
            background-color: ${bgColor};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        `;
        notif.textContent = message;

        this.notificationContainer.appendChild(notif);

        setTimeout(() => { notif.style.opacity = '1'; }, 10);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => {
                if(this.notificationContainer.contains(notif)) {
                    this.notificationContainer.removeChild(notif);
                }
            }, 300);
        }, 3000);
    },

    // =============== 👤 プロフィール ===============
    renderProfileModal: function() {
        const user = this.currentUser || {};
        const settings = user.settings || {};

        const profileHtml = `
            <div class="profile-modal-layout">
                <div class="profile-info-group">
                    <p><strong>ニックネーム:</strong> <span id="modal-profile-nickname">${user.nickname || "不明"}</span></p>
                    <p><strong>ID:</strong> <span id="modal-profile-id">${user.id || "XXXXXX"}</span> <small>(一般非公開)</small></p>
                    <p><strong>レベル:</strong> <span id="modal-profile-level">${user.level || 1}</span></p>
                    <p><strong>総合順位:</strong> <span id="modal-profile-rank">圏外</span></p>
                </div>

                <div class="profile-pin-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ccc;">
                    <p><strong>アカウントPIN:</strong></p>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="password" id="modal-profile-pin" value="${user.pin || ""}" readonly style="padding: 5px; border: 1px solid #ccc; border-radius: 5px; width: 100%;">
                        <button id="btn-modal-toggle-pin" style="padding: 5px 10px; cursor: pointer; white-space: nowrap;">表示</button>
                    </div>
                </div>

                <div class="profile-settings-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ccc;">
                    <h4>⚙️ 公開・申請設定</h4>
                    <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="modal-setting-public" ${settings.rankingPublic ? "checked" : ""}> 
                        自分を総合順位に公開する
                    </label>
                    <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="modal-setting-history-req" ${settings.reqHistory ? "checked" : ""}> 
                        バトル履歴からのフレンド申請を許可
                    </label>
                    <label style="display: block; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="modal-setting-ranking-req" ${settings.reqRanking ? "checked" : ""}> 
                        総合順位からのフレンド申請を許可
                    </label>
                </div>
            </div>
        `;

        this.openModal("👤 プロフィール", profileHtml);

        const btnModalTogglePin = document.getElementById('btn-modal-toggle-pin');
        const inputModalPin = document.getElementById('modal-profile-pin');
        if (btnModalTogglePin && inputModalPin) {
            btnModalTogglePin.addEventListener('click', () => {
                const isPassword = inputModalPin.type === 'password';
                inputModalPin.type = isPassword ? 'text' : 'password';
                btnModalTogglePin.textContent = isPassword ? '隠す' : '表示';
            });
        }

        const toggleSetting = (elementId, settingKey) => {
            const el = document.getElementById(elementId);
            if (el) {
                el.addEventListener('change', (e) => {
                    this.currentUser.settings[settingKey] = e.target.checked;
                    if(typeof Network !== 'undefined' && Network.updateSettings) {
                        Network.updateSettings(this.currentUser.settings); 
                    }
                });
            }
        };
        toggleSetting('modal-setting-public', 'rankingPublic');
        toggleSetting('modal-setting-history-req', 'reqHistory');
        toggleSetting('modal-setting-ranking-req', 'reqRanking');
    },

    // =============== ✉️ メール機能 ===============
    renderMailModal: function() {
        // 【追加】データが無い場合はロード中を表示し、サーバーへ要求
        if (!this.mailData) {
            this.openModal("✉️ メール", `<div style="text-align:center; padding: 20px;">データを読み込み中...⏳</div>`);
            if (typeof Network !== 'undefined') Network.fetchMailData();
            return;
        }

        const data = this.mailData || { messages: [] };
        const friendsList = this.friendsData ? this.friendsData.list : [];

        // 【維持】ユーザー様の素晴らしいタブUI
        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button id="mtab-inbox" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentMailTab==='inbox'?'#007bff':'#eee'}; color: ${this.currentMailTab==='inbox'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">受信箱</button>
                <button id="mtab-compose" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentMailTab==='compose'?'#007bff':'#eee'}; color: ${this.currentMailTab==='compose'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">新規作成</button>
            </div>
        `;

        let contentHtml = '';

        if (this.currentMailTab === 'inbox') {
            if (data.messages.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">受信したメールはありません。</div>';
            } else {
                contentHtml = data.messages.map(m => `
                    <div style="padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 5px; background: ${m.isRead ? '#f9f9f9' : '#e3f2fd'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 16px;">${m.senderNickname} ${m.senderId === 'SYSTEM' ? '👑' : ''}</strong>
                            <small style="color: gray;">${new Date(m.timestamp).toLocaleString()}</small>
                        </div>
                        <p style="margin: 5px 0; font-size: 14px; line-height: 1.4;">${m.content}</p>
                        ${m.item ? `<div style="margin-top: 8px; color: #d84315; font-weight: bold; font-size: 13px;">🎁 添付アイテム: ${m.item}</div>` : ''}
                        ${!m.isRead ? `<div style="text-align: right; margin-top: 5px;"><button class="btn-read-mail" data-id="${m.id}" style="padding: 4px 12px; font-size: 12px; background: #4caf50; color: white; border: none; border-radius: 3px; cursor: pointer;">既読にする</button></div>` : ''}
                    </div>
                `).join('');
            }
        } else if (this.currentMailTab === 'compose') {
            if (friendsList.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">メールを送るにはフレンドが必要です。<br>フレンド画面から申請してみましょう。</div>';
            } else {
                const options = friendsList.map(f => `<option value="${f.id}">${f.nickname}</option>`).join('');
                contentHtml = `
                    <div style="padding: 5px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">宛先（フレンド）</label>
                        <select id="mail-target" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
                            ${options}
                        </select>

                        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">メッセージ</label>
                        <textarea id="mail-content" rows="5" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; resize: vertical;" placeholder="メッセージを入力してください"></textarea>

                        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">添付アイテム（所持品から選択）</label>
                        <select id="mail-item" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 5px;">
                            <option value="">添付なし</option>
                            <option value="コインx10">コインx10</option>
                            <option value="ガチャ券x1">ガチャガチャ券x1</option>
                        </select>

                        <button id="btn-send-mail" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">✉️ 送信する</button>
                    </div>
                `;
            }
        }

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">${contentHtml}</div></div>`;
        this.openModal("✉️ メール", finalHtml);

        // イベントバインド
        document.getElementById('mtab-inbox')?.addEventListener('click', () => { this.currentMailTab = 'inbox'; this.renderMailModal(); });
        document.getElementById('mtab-compose')?.addEventListener('click', () => { this.currentMailTab = 'compose'; this.renderMailModal(); });

        if (this.currentMailTab === 'inbox') {
            document.querySelectorAll('.btn-read-mail').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mailId = e.target.getAttribute('data-id');
                    if(typeof Network !== 'undefined' && Network.markMailAsRead) {
                        Network.markMailAsRead(mailId);
                    }
                    e.target.parentElement.parentElement.style.background = '#f9f9f9';
                    e.target.remove();
                });
            });
        }

        if (this.currentMailTab === 'compose') {
            document.getElementById('btn-send-mail')?.addEventListener('click', () => {
                const targetId = document.getElementById('mail-target').value;
                const content = document.getElementById('mail-content').value.trim();
                const item = document.getElementById('mail-item').value;

                if (!content && !item) {
                    this.showNotification('メッセージかアイテムのどちらかを入力してください。', 'error');
                    return;
                }
                if(typeof Network !== 'undefined' && Network.sendMail) {
                    Network.sendMail(targetId, content, item);
                    this.showNotification('メールを送信しました', 'success');
                    document.getElementById('mail-content').value = '';
                    document.getElementById('mail-item').value = '';
                }
            });
        }
    },

    // =============== 👥 フレンド機能 ===============
    renderFriendsModal: function() {
        const data = this.friendsData || { list: [], requestsReceived: [], history: [] };

        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px; overflow-x: auto;">
                <button id="ftab-list" style="padding: 6px 12px; cursor: pointer; background: ${this.currentFriendTab==='list'?'#007bff':'#eee'}; color: ${this.currentFriendTab==='list'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">リスト (${data.list.length})</button>
                <button id="ftab-requests" style="padding: 6px 12px; cursor: pointer; background: ${this.currentFriendTab==='requests'?'#007bff':'#eee'}; color: ${this.currentFriendTab==='requests'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">受信 (${data.requestsReceived.length})</button>
                <button id="ftab-search" style="padding: 6px 12px; cursor: pointer; background: ${this.currentFriendTab==='search'?'#007bff':'#eee'}; color: ${this.currentFriendTab==='search'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">ID検索</button>
                <button id="ftab-history" style="padding: 6px 12px; cursor: pointer; background: ${this.currentFriendTab==='history'?'#007bff':'#eee'}; color: ${this.currentFriendTab==='history'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">履歴</button>
            </div>
        `;

        let contentHtml = '';

        if (this.currentFriendTab === 'list') {
            if (data.list.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">フレンドはまだいません。<br>ID検索やバトル履歴から申請してみましょう。</div>';
            } else {
                contentHtml = data.list.map(f => `
                    <div style="padding: 10px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="font-size: 16px;">${f.nickname}</strong> <span style="font-size: 12px; color: #666; background: #f0f0f0; padding: 2px 6px; border-radius: 10px;">Lv.${f.level} | 🏆${f.trophies}</span>
                            </div>
                            <button class="btn-toggle-details" data-id="${f.id}" style="padding: 5px 12px; background: #e0e0e0; border: none; border-radius: 5px; cursor: pointer;">詳細 ▾</button>
                        </div>
                        <div id="details-${f.id}" style="display: none; margin-top: 10px; padding: 12px; background: #f8f9fa; border-radius: 5px; font-size: 14px; border-left: 3px solid #007bff;">
                            <p style="margin: 0 0 5px 0;"><strong>プレイヤーID:</strong> ${f.id}</p>
                            <p style="margin: 0 0 10px 0;"><strong>最終ログイン:</strong> 1時間前 (ダミー)</p>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-mail-to-friend" data-id="${f.id}" style="flex: 1; padding: 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">✉️ メッセージ</button>
                                <button class="btn-invite-friend" data-id="${f.id}" style="flex: 1; padding: 8px; background: #ff9800; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">🎮 パーティ招待</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } else if (this.currentFriendTab === 'requests') {
            if (data.requestsReceived.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">届いているフレンド申請はありません。</div>';
            } else {
                contentHtml = data.requestsReceived.map(req => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #ddd; background: #fff;">
                        <div>
                            <strong style="font-size: 16px;">${req.nickname}</strong>
                            <br><small style="color: gray;">ID: ${req.id}</small>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-accept-friend" data-id="${req.id}" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">承認</button>
                            <button class="btn-reject-friend" data-id="${req.id}" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">拒否</button>
                        </div>
                    </div>
                `).join('');
            }
        } else if (this.currentFriendTab === 'search') {
            contentHtml = `
                <div style="padding: 10px;">
                    <p style="margin-bottom: 10px; font-size: 14px; color: #555;">フレンドになりたい相手のプレイヤーIDを入力して申請を送信します。</p>
                    <input type="text" id="friend-search-input" placeholder="IDを入力 (例: A1B2C3D4)" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; text-transform: uppercase;">
                    <button id="btn-send-friend-req" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">🔍 検索して申請</button>
                </div>
            `;
        } else if (this.currentFriendTab === 'history') {
            if (data.history.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">申請履歴はありません。</div>';
            } else {
                contentHtml = [...data.history].reverse().map(h => {
                    const isSent = h.type === 'sent';
                    const typeBadge = isSent ? '<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: bold;">送信</span>' : '<span style="background: #fff3e0; color: #f57c00; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: bold;">受信</span>';
                    let statusColor = '#9e9e9e';
                    if(h.status === '承認') statusColor = '#4caf50';
                    if(h.status === '拒否') statusColor = '#f44336';
                    if(h.status === '保留中') statusColor = '#ff9800';
                    const date = new Date(h.timestamp).toLocaleString();
                    return `
                        <div style="padding: 12px; border-bottom: 1px solid #eee; font-size: 14px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <div>${typeBadge} <strong>${h.targetNickname}</strong> <small>(${h.targetId})</small></div>
                                <span style="color: white; background: ${statusColor}; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">${h.status}</span>
                            </div>
                            <div style="color: gray; font-size: 12px;">${date}</div>
                        </div>
                    `;
                }).join('');
            }
        }

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">${contentHtml}</div></div>`;
        this.openModal("👥 フレンド", finalHtml);

        const bindTab = (id, tabName) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('click', () => {
                this.currentFriendTab = tabName;
                this.renderFriendsModal(); 
            });
        };
        bindTab('ftab-list', 'list');
        bindTab('ftab-requests', 'requests');
        bindTab('ftab-search', 'search');
        bindTab('ftab-history', 'history');

        if (this.currentFriendTab === 'list') {
            document.querySelectorAll('.btn-toggle-details').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.target.getAttribute('data-id');
                    const detailDiv = document.getElementById(`details-${targetId}`);
                    const isHidden = detailDiv.style.display === 'none';
                    detailDiv.style.display = isHidden ? 'block' : 'none';
                    e.target.textContent = isHidden ? '閉じる ▴' : '詳細 ▾';
                });
            });
            document.querySelectorAll('.btn-mail-to-friend').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.target.getAttribute('data-id');
                    this.closeModal(); 
                    setTimeout(() => {
                        this.currentMailTab = 'compose';
                        this.isMailModalOpen = true;
                        this.renderMailModal();
                        setTimeout(() => {
                            const selectEl = document.getElementById('mail-target');
                            if(selectEl) selectEl.value = targetId;
                        }, 50);
                    }, 100);
                });
            });
            document.querySelectorAll('.btn-invite-friend').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.showNotification('パーティ招待を送信しました', 'success');
                });
            });
        }

        if (this.currentFriendTab === 'requests') {
            document.querySelectorAll('.btn-accept-friend').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    if(typeof Network !== 'undefined') Network.respondFriendRequest(e.target.getAttribute('data-id'), true); 
                    e.target.closest('div[style*="border-bottom"]').remove();
                    this.showNotification('フレンド申請を承認しました', 'success');
                });
            });
            document.querySelectorAll('.btn-reject-friend').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    if(typeof Network !== 'undefined') Network.respondFriendRequest(e.target.getAttribute('data-id'), false); 
                    e.target.closest('div[style*="border-bottom"]').remove();
                });
            });
        }

        if (this.currentFriendTab === 'search') {
            document.getElementById('btn-send-friend-req')?.addEventListener('click', () => {
                const targetId = document.getElementById('friend-search-input').value.trim().toUpperCase();
                if(!targetId) {
                    this.showNotification('IDを入力してください', 'error');
                    return;
                }
                if(typeof Network !== 'undefined' && Network.sendFriendRequest) {
                    Network.sendFriendRequest(targetId);
                    this.showNotification(`${targetId} にフレンド申請を送信しました`, 'success');
                }
                document.getElementById('friend-search-input').value = '';
            });
        }
    },

    // =============== 📜 バトル履歴 ===============
    renderHistoryModal: function() {
        // 【追加】サーバーからデータが来ていない場合は取得命令を出して「ロード中」を表示
        if (!this.historyData) {
            this.openModal("📜 バトル履歴", `<div style="text-align:center; padding: 20px;">データを読み込み中...⏳</div>`);
            if (typeof Network !== 'undefined') Network.fetchHistoryData();
            return;
        }

        // 【変更】ダミー配列を消し、サーバーから受け取った本物のデータを使用
        const historyData = this.historyData || [];

        let contentHtml = '';
        if (historyData.length === 0) {
            contentHtml = '<div style="text-align:center; padding:20px;">バトル履歴がありません。</div>';
        } else {
            contentHtml = historyData.map(h => {
                // サーバーのデータ形式（timestampなど）が来た場合の安全対策も兼ねて変数化
                const rankText = h.rank || (h.result === 'WIN' ? '1位' : '敗北');
                const isFirstPlace = rankText === '1位' || rankText === '1';
                const isNegative = String(rankText).includes('-') || String(h.trophies || h.trophyChange).includes('-');

                const leftBarColor = isFirstPlace ? '#ffd700' : (isNegative ? '#f44336' : '#2196f3');
                const rankColor = isFirstPlace ? '#d4af37' : '#333';

                const displayDate = h.date || (h.timestamp ? new Date(h.timestamp).toLocaleString() : '不明な日時');
                const displayMode = h.mode || h.gameMode || 'ゲーム';
                const displayKills = h.kills !== undefined ? h.kills : 0;
                const displayCoins = h.coins !== undefined ? h.coins : 0;

                // トロフィーが数値で来た場合（+30など）と文字列で来た場合の両方に対応
                let displayTrophies = h.trophies;
                if (displayTrophies === undefined && h.trophyChange !== undefined) {
                    displayTrophies = h.trophyChange > 0 ? `+${h.trophyChange}` : `${h.trophyChange}`;
                }

                return `
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 10px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top:0; left:0; width: 5px; height: 100%; background: ${leftBarColor};"></div>
                    <div style="margin-left: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-bottom: 5px;">
                            <strong style="font-size: 16px;">${displayMode}</strong>
                            <span style="font-size: 18px; font-weight: bold; color: ${rankColor};">${rankText}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #555;">
                            <span>⏱ ${displayDate}</span>
                            <span>⚔️ キル: ${displayKills} | 💰 ${displayCoins} | 🏆 ${displayTrophies}</span>
                        </div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">
                            <span style="font-size: 12px; color: #777;">対戦相手:</span>
                            ${(h.opponents || []).map(opp => `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 5px 8px; border-radius: 4px; margin-top: 4px;">
                                    <span style="font-size: 13px;">${opp.name} <small>(${opp.id})</small></span>
                                    <button class="btn-req-from-history" data-id="${opp.id}" style="padding: 3px 8px; font-size: 11px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">申請</button>
                                </div>
                            `).join('') || '<div style="font-size: 12px; color: #999; margin-top: 4px;">対戦相手データなし</div>'}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        const finalHtml = `<div style="max-height: 50vh; overflow-y: auto; padding: 5px;">${contentHtml}</div>`;
        this.openModal("📜 バトル履歴", finalHtml);

        document.querySelectorAll('.btn-req-from-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-id');
                if(typeof Network !== 'undefined' && Network.sendFriendRequest) {
                    Network.sendFriendRequest(targetId);
                    if(typeof this.showNotification === 'function') {
                        this.showNotification('フレンド申請を送信しました', 'success');
                    }
                    e.target.disabled = true;
                    e.target.textContent = '送信済';
                    e.target.style.background = '#ccc';
                }
            });
        });
    },

    // =============== 👑 総合順位 ===============
    renderRankingModal: function() {
        // 【追加】サーバーからデータが来ていない場合は取得命令を出して「ロード中」を表示
        if (!this.rankingData) {
            this.openModal("👑 総合順位", `<div style="text-align:center; padding: 20px;">データを読み込み中...⏳</div>`);
            if (typeof Network !== 'undefined') Network.fetchRanking();
            return;
        }

        // 【変更】ダミー配列を消し、サーバーから受け取った本物のデータ(top10)を使用
        const rankingData = this.rankingData.top10 || [];
        const myRank = this.rankingData.myRank;

        let contentHtml = `<div style="margin-bottom: 15px; font-size: 14px; color: #555; text-align: center;">🏆 トロフィー数トップランカー（公開設定者のみ申請可能）</div>`;

        // 【追加】自分の順位表示を追加（機能妥協なし！）
        contentHtml += `<div style="background: #fff3e0; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center; font-weight: bold; color: #e65100; border: 1px solid #ffe0b2;">あなたの現在の順位: ${myRank === '圏外' ? myRank : myRank + '位'}</div>`;

        contentHtml += rankingData.map((r, index) => {
            // 【維持】元のグラデーションデザインを完全継承！(r.rankをindexに置き換えて処理)
            const rankStyle = index === 0 ? 'background: linear-gradient(135deg, #ffd700, #f8e14b); color: #8a6d00;' : 
                              index === 1 ? 'background: linear-gradient(135deg, #e0e0e0, #f5f5f5); color: #555;' : 
                              index === 2 ? 'background: linear-gradient(135deg, #cd7f32, #e6a869); color: #5e3a15;' : 
                              'background: #fff; border: 1px solid #ddd;';
            const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}位`;

            return `
                <div style="${rankStyle} padding: 12px; margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px; font-weight: bold; width: 40px; text-align: center;">${rankIcon}</span>
                        <div>
                            <strong style="font-size: 16px;">${r.nickname}</strong>
                            <div style="font-size: 12px; opacity: 0.8;">🏆 ${r.trophies} トロフィー (Lv.${r.level})</div>
                        </div>
                    </div>
                    ${r.reqRanking && r.id !== (this.currentUser?.id) ? `
                        <button class="btn-req-from-rank" data-id="${r.id}" style="padding: 6px 12px; background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.2); border-radius: 4px; cursor: pointer; font-weight: bold; color: inherit;">申請</button>
                    ` : '<span style="font-size: 12px; opacity: 0.7;">申請不可/自身</span>'}
                </div>
            `;
        }).join('');

        const finalHtml = `<div style="max-height: 50vh; overflow-y: auto; padding: 5px;">${contentHtml}</div>`;
        this.openModal("👑 総合順位", finalHtml);

        // 【維持】元のボタンアニメーション・イベントも完全継承！
        document.querySelectorAll('.btn-req-from-rank').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-id');
                if(typeof Network !== 'undefined' && Network.sendFriendRequest) {
                    Network.sendFriendRequest(targetId);
                    if(typeof this.showNotification === 'function') {
                        this.showNotification('ランキングから申請を送信しました', 'success');
                    }
                    e.target.disabled = true;
                    e.target.textContent = '送信済';
                    e.target.style.opacity = '0.5';
                }
            });
        });
    },

    // =============== 🎁 報酬獲得 ===============
    renderRewardsModal: function() {
        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button id="rtab-login" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentRewardTab==='login'?'#4caf50':'#eee'}; color: ${this.currentRewardTab==='login'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">📅 ログイン</button>
                <button id="rtab-road" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentRewardTab==='road'?'#4caf50':'#eee'}; color: ${this.currentRewardTab==='road'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">🏆 ロードマップ</button>
            </div>
        `;

        let contentHtml = '';
        if (this.currentRewardTab === 'login') {
            const streak = this.currentUser?.loginStreak || 1;
            const canClaim = this.currentUser?.canClaimLoginBonus;

            // 連続ログインによる報酬の変化（クライアント側の表示用）
            let displayCoins = 10;
            let displayGacha = 0;
            if (streak >= 7) { displayCoins = 50; displayGacha = 1; }
            else if (streak >= 3) { displayCoins = 30; }

            contentHtml = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
                    <h3 style="margin: 0 0 10px 0;">今日のログインボーナス</h3>
                    <p style="color: #666; margin-bottom: 10px;">毎日ログインして報酬を豪華にしよう！</p>
                    <div style="font-weight: bold; margin-bottom: 20px; color: #ff9800;">🔥 現在の連続ログイン: ${streak} 日目</div>

                    <div style="background: #f1f8e9; border: 2px dashed #8bc34a; padding: 15px; border-radius: 10px; display: inline-block; margin-bottom: 20px;">
                        <strong style="font-size: 20px; color: #33691e;">💰 ${displayCoins} コイン</strong>
                        ${displayGacha > 0 ? `<br><strong style="font-size: 16px; color: #0288d1; margin-top:5px; display:block;">🎫 ガチャ券 x${displayGacha}</strong>` : ''}
                    </div><br>

                    <button id="btn-claim-login" ${!canClaim ? 'disabled' : ''} style="padding: 12px 30px; font-size: 16px; background: ${canClaim ? '#ff9800' : '#ccc'}; color: white; border: none; border-radius: 25px; cursor: ${canClaim ? 'pointer' : 'not-allowed'}; font-weight: bold; box-shadow: ${canClaim ? '0 4px 6px rgba(255,152,0,0.3)' : 'none'};">
                        ${canClaim ? '受け取る' : '今日の分は受取済'}
                    </button>
                </div>
            `;
        } else {
            const currentTrophies = this.currentUser?.trophies || 0;
            const claimedList = this.currentUser?.claimedRoadmapRewards || [];

            // 資料に基づくロードマップ配列
            const roadMap = [
                { target: 10, reward: '50コイン', claimed: claimedList.includes(10) },
                { target: 30, reward: 'ガチャ券×10', claimed: claimedList.includes(30) },
                { target: 50, reward: '100コイン、レベルアップ', claimed: claimedList.includes(50) },
                { target: 70, reward: '50コイン、ガチャ券×5', claimed: claimedList.includes(70) },
                { target: 100, reward: '100コイン、ガチャ券×5、レベルアップ', claimed: claimedList.includes(100) }
            ];

            contentHtml = `<div style="padding: 10px;">
                <div style="margin-bottom: 15px; text-align: center; font-size: 18px;">現在のトロフィー: <strong>🏆 ${currentTrophies}</strong></div>
                ${roadMap.map(r => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin-bottom: 10px; background: ${r.claimed ? '#f5f5f5' : '#fff'}; border: 1px solid ${r.claimed ? '#ddd' : (currentTrophies >= r.target ? '#ff9800' : '#2196f3')}; border-radius: 8px; box-shadow: ${currentTrophies >= r.target && !r.claimed ? '0 2px 8px rgba(255,152,0,0.3)' : 'none'};">
                        <div>
                            <div style="font-weight: bold; color: ${r.claimed ? '#999' : '#000'}; font-size: 16px;">🏆 ${r.target} 到達</div>
                            <div style="font-size: 14px; color: ${r.claimed ? '#999' : '#d84315'}; margin-top: 5px;">🎁 ${r.reward}</div>
                        </div>
                        <button class="btn-claim-road" data-target="${r.target}" ${r.claimed || currentTrophies < r.target ? 'disabled' : ''} style="padding: 10px 15px; background: ${r.claimed ? '#ccc' : (currentTrophies >= r.target ? '#4caf50' : '#e0e0e0')}; color: ${r.claimed ? '#666' : (currentTrophies >= r.target ? 'white' : '#999')}; border: none; border-radius: 5px; cursor: ${currentTrophies >= r.target && !r.claimed ? 'pointer' : 'not-allowed'}; font-weight: bold; min-width: 90px;">
                            ${r.claimed ? '受取済' : (currentTrophies >= r.target ? '受け取る' : `あと ${r.target - currentTrophies} 🏆`)}
                        </button>
                    </div>
                `).join('')}
            </div>`;
        }

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto;">${contentHtml}</div></div>`;
        this.openModal("🎁 報酬獲得", finalHtml);

        // イベントリスナーの登録
        document.getElementById('rtab-login')?.addEventListener('click', () => { this.currentRewardTab = 'login'; this.renderRewardsModal(); });
        document.getElementById('rtab-road')?.addEventListener('click', () => { this.currentRewardTab = 'road'; this.renderRewardsModal(); });

        document.getElementById('btn-claim-login')?.addEventListener('click', (e) => {
            Network.claimLoginBonus();
            e.target.disabled = true; // 連打防止
            e.target.textContent = '通信中...';
        });

        document.querySelectorAll('.btn-claim-road').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = parseInt(e.target.getAttribute('data-target'), 10);
                Network.claimRoadmapReward(target);
                e.target.disabled = true; // 連打防止
                e.target.textContent = '通信中...';
            });
        });
    },

    // =============== 🎰 ガチャ画面 ===============
    renderGachaModal: function() {
        const tickets = this.currentUser?.gachaTickets || 0;

        const html = `
            <div class="modal-body-container" style="text-align: center; padding: 20px;">
                <div style="font-size: 64px; margin-bottom: 20px; animation: bounce 2s infinite;">🎰</div>
                <h2 style="margin: 0 0 10px 0;">プレミアムガチャ</h2>
                <p style="color: #666; margin-bottom: 20px;">ガチャ券を使って、コインや限定スキンをゲットしよう！</p>

                <div style="background: #e3f2fd; border: 2px solid #2196f3; padding: 15px; border-radius: 10px; display: inline-block; margin-bottom: 25px;">
                    <strong style="font-size: 18px; color: #0d47a1;">🎫 所持ガチャ券: ${tickets} 枚</strong>
                </div><br>

                <button id="btn-draw-gacha" ${tickets < 1 ? 'disabled' : ''} style="padding: 15px 40px; font-size: 20px; background: ${tickets < 1 ? '#ccc' : '#e91e63'}; color: white; border: none; border-radius: 30px; cursor: ${tickets < 1 ? 'not-allowed' : 'pointer'}; font-weight: bold; box-shadow: ${tickets < 1 ? 'none' : '0 4px 10px rgba(233,30,99,0.4)'}; transition: transform 0.1s;">
                    ${tickets < 1 ? 'ガチャ券がありません' : '1回引く'}
                </button>

                <div id="gacha-result-area" style="margin-top: 25px; min-height: 80px; font-weight: bold; font-size: 18px; color: #d81b60;">
                    </div>
            </div>
            <style>
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                    40% {transform: translateY(-20px);}
                    60% {transform: translateY(-10px);}
                }
                @keyframes shakeGacha {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
            </style>
        `;

        this.openModal("🎰 ガチャガチャ", html);

        const btn = document.getElementById('btn-draw-gacha');
        if (btn) {
            // ボタンを押した時のへこむアニメーション
            btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
            btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');

            btn.addEventListener('click', () => {
                const resultArea = document.getElementById('gacha-result-area');
                // ドキドキするシェイクアニメーション
                resultArea.innerHTML = '<div style="animation: shakeGacha 0.4s infinite; font-size: 24px;">🔄 ガチャを回しています...</div>';
                btn.disabled = true;
                btn.style.background = '#ccc';
                btn.style.boxShadow = 'none';

                // 通信開始
                Network.drawGacha();
            });
        }
    },

    onGachaResult: function(result) {
        if (!result.success) {
            this.showNotification(result.message, 'error');
            this.renderGachaModal(); // エラー時は画面を元に戻す
            return;
        }

        const resultArea = document.getElementById('gacha-result-area');
        if (resultArea) {
            // 演出として1秒間だけ待ってから結果を表示する
            setTimeout(() => {
                let icon = result.rewardType === 'coins' ? '💰' : '✨';
                resultArea.innerHTML = `
                    <div style="font-size: 40px; margin-bottom: 10px; animation: bounce 1s;">${icon}</div>
                    <div style="color: #e91e63;">${result.message}</div>
                `;
                this.showNotification('アイテムをゲットしました！', 'success');

                // 3秒後に「もう一度引く」などの表示を再計算するため再描画
                setTimeout(() => {
                    if(document.getElementById('btn-draw-gacha')) {
                        this.renderGachaModal();
                    }
                }, 3000);
            }, 1000); // 1秒間のドキドキ演出時間
        }
    },
    
    // =============== 🛒 ショップ ===============
    renderShopModal: function() {
        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button id="stab-character" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentShopTab==='character'?'#e91e63':'#eee'}; color: ${this.currentShopTab==='character'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">👤 キャラ</button>
                <button id="stab-skin" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentShopTab==='skin'?'#e91e63':'#eee'}; color: ${this.currentShopTab==='skin'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">👕 スキン</button>
                <button id="stab-item" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentShopTab==='item'?'#e91e63':'#eee'}; color: ${this.currentShopTab==='item'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">📦 アイテム</button>
            </div>
            <div style="text-align: right; margin-bottom: 10px; font-weight: bold;">所持コイン: 💰 ${this.currentUser?.coins || 0}</div>
        `;

        let contentHtml = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 5px;">';

        const items = this.currentShopTab === 'character' ? [
            { name: 'ファイター', price: 1000, desc: '近接攻撃特化' }, { name: 'ガンナー', price: 1500, desc: '遠距離攻撃特化' }
        ] : this.currentShopTab === 'skin' ? [
            { name: '赤色スーツ', price: 500, desc: '目立つ赤い服' }, { name: '忍者装束', price: 800, desc: '足音が消えそう' }
        ] : [
            { name: 'ガチャチケットx1', price: 100, desc: 'ガチャを1回引ける' }, { name: '経験値ブースト', price: 300, desc: '1時間EXP2倍' }
        ];

        contentHtml += items.map(item => `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fff;">
                <div style="height: 60px; background: #f0f0f0; border-radius: 4px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🖼️</div>
                <strong style="display: block; font-size: 14px; margin-bottom: 5px;">${item.name}</strong>
                <div style="font-size: 11px; color: #666; margin-bottom: 10px; height: 30px;">${item.desc}</div>
                <button class="btn-buy-shop" data-price="${item.price}" data-name="${item.name}" style="width: 100%; padding: 8px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">💰 ${item.price}</button>
            </div>
        `).join('');
        contentHtml += '</div>';

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto;">${contentHtml}</div></div>`;
        this.openModal("🛒 ショップ", finalHtml);

        document.getElementById('stab-character')?.addEventListener('click', () => { this.currentShopTab = 'character'; this.renderShopModal(); });
        document.getElementById('stab-skin')?.addEventListener('click', () => { this.currentShopTab = 'skin'; this.renderShopModal(); });
        document.getElementById('stab-item')?.addEventListener('click', () => { this.currentShopTab = 'item'; this.renderShopModal(); });

        document.querySelectorAll('.btn-buy-shop').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const price = parseInt(e.target.getAttribute('data-price'));
                const name = e.target.getAttribute('data-name');
                if ((this.currentUser?.coins || 0) >= price) {
                    if(confirm(`${name}を ${price}コインで購入しますか？`)) {
                        this.showNotification(`${name} を購入しました！`, 'success');
                        // 実際にはNetwork APIを呼ぶ
                    }
                } else {
                    this.showNotification('コインが足りません', 'error');
                }
            });
        });
    },

    // =============== 🎒 バックパック ===============
    renderBackpackModal: function() {
        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button id="btab-character" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentBackpackTab==='character'?'#8bc34a':'#eee'}; color: ${this.currentBackpackTab==='character'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">👤 キャラ</button>
                <button id="btab-skin" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentBackpackTab==='skin'?'#8bc34a':'#eee'}; color: ${this.currentBackpackTab==='skin'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">👕 スキン</button>
                <button id="btab-item" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentBackpackTab==='item'?'#8bc34a':'#eee'}; color: ${this.currentBackpackTab==='item'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">📦 アイテム</button>
            </div>
        `;

        let contentHtml = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 5px;">';
        const items = Array(6).fill(null).map((_, i) => ({ id: i, name: `所持アイテム ${i+1}`, equipped: i === 0 }));

        contentHtml += items.map(item => `
            <div style="border: 2px solid ${item.equipped ? '#4caf50' : '#ddd'}; border-radius: 8px; padding: 8px; text-align: center; background: ${item.equipped ? '#e8f5e9' : '#fff'}; position: relative;">
                ${item.equipped ? '<div style="position: absolute; top: -8px; right: -8px; background: #4caf50; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">装備中</div>' : ''}
                <div style="height: 50px; background: #f0f0f0; border-radius: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center;">📦</div>
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 8px; word-break: break-all;">${item.name}</div>
                <button class="btn-equip-item" style="width: 100%; padding: 5px; font-size: 12px; background: ${item.equipped ? '#9e9e9e' : '#007bff'}; color: white; border: none; border-radius: 3px; cursor: pointer;">${this.currentBackpackTab === 'item' ? '使う' : (item.equipped ? '外す' : '装備')}</button>
            </div>
        `).join('');
        contentHtml += '</div>';

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto;">${contentHtml}</div></div>`;
        this.openModal("🎒 バックパック", finalHtml);

        document.getElementById('btab-character')?.addEventListener('click', () => { this.currentBackpackTab = 'character'; this.renderBackpackModal(); });
        document.getElementById('btab-skin')?.addEventListener('click', () => { this.currentBackpackTab = 'skin'; this.renderBackpackModal(); });
        document.getElementById('btab-item')?.addEventListener('click', () => { this.currentBackpackTab = 'item'; this.renderBackpackModal(); });

        document.querySelectorAll('.btn-equip-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showNotification('装備/使用アクションを実行しました', 'info');
                this.renderBackpackModal(); // 簡易リロード
            });
        });
    },

    // =============== 🎰 ガチャガチャ ===============
    renderGachaModal: function() {
        const tickets = this.currentUser?.gachaTickets || 0;
        const html = `
            <div style="text-align: center; padding: 20px;">
                <div id="gacha-animation-area" style="width: 200px; height: 200px; background: radial-gradient(circle, #fff, #f0f0f0); border: 4px solid #ffeb3b; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; font-size: 64px; box-shadow: inset 0 0 20px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.2);">
                    🎰
                </div>
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">所持チケット: 🎫 <span id="gacha-ticket-count">${tickets}</span> 枚</div>

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-gacha-1" style="padding: 12px 24px; font-size: 16px; background: #2196f3; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(33,150,243,0.3);">1回引く (🎫1)</button>
                    <button id="btn-gacha-10" style="padding: 12px 24px; font-size: 16px; background: #e91e63; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(233,30,99,0.3);">10連ガチャ (🎫10)</button>
                </div>
                <p style="font-size: 12px; color: #888; margin-top: 15px;">※スキンや限定アイテムが排出されます。</p>
            </div>
        `;
        this.openModal("🎰 ガチャガチャ", html);

        const playGacha = (times) => {
            const currentTickets = parseInt(document.getElementById('gacha-ticket-count').innerText);
            if (currentTickets < times) {
                this.showNotification('チケットが足りません', 'error');
                return;
            }
            // アニメーション風の演出
            const animArea = document.getElementById('gacha-animation-area');
            animArea.style.transform = 'scale(1.1) rotate(10deg)';
            animArea.innerText = '🌀';
            document.getElementById('btn-gacha-1').disabled = true;
            document.getElementById('btn-gacha-10').disabled = true;

            setTimeout(() => {
                animArea.style.transform = 'scale(1) rotate(0deg)';
                animArea.innerText = '✨🎁✨';
                document.getElementById('gacha-ticket-count').innerText = currentTickets - times;
                this.showNotification(`${times}回ガチャを引きました！結果は別画面で表示します（ダミー）`, 'success');
                document.getElementById('btn-gacha-1').disabled = false;
                document.getElementById('btn-gacha-10').disabled = false;
                setTimeout(() => { animArea.innerText = '🎰'; }, 2000);
            }, 1500);
        };

        document.getElementById('btn-gacha-1')?.addEventListener('click', () => playGacha(1));
        document.getElementById('btn-gacha-10')?.addEventListener('click', () => playGacha(10));
    },

    // =============== ⚙️ 設定 ===============
    renderSettingsModal: function() {
        // 【追加】資料にあったニックネームとPINの変更項目を上部に追加し、既存のサウンド・グラフィック設定は完全維持
        const html = `
            <div style="padding: 10px;">
                <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">👤 アカウント情報</h4>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 5px;">ニックネーム</label>
                    <input type="text" id="setting-nickname" value="${this.currentUser?.nickname || ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 5px;">PIN (6桁の数字)</label>
                    <input type="password" id="setting-pin" value="${this.currentUser?.pin || ''}" maxlength="6" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                </div>

                <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">🎵 サウンド設定</h4>
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px;">
                        BGM 音量
                        <input type="range" id="setting-bgm" min="0" max="100" value="${this.currentUser?.settings?.bgmVolume !== undefined ? this.currentUser.settings.bgmVolume : 50}" style="width: 60%;">
                    </label>
                </div>
                <div style="margin-bottom: 25px;">
                    <label style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px;">
                        SE 音量
                        <input type="range" id="setting-se" min="0" max="100" value="${this.currentUser?.settings?.seVolume !== undefined ? this.currentUser.settings.seVolume : 70}" style="width: 60%;">
                    </label>
                </div>

                <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">📺 グラフィック設定</h4>
                <div style="margin-bottom: 25px;">
                    <label style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px;">
                        画質
                        <select id="setting-graphics" style="padding: 5px 10px; border-radius: 4px; border: 1px solid #ccc;">
                            <option value="low" ${this.currentUser?.settings?.graphics === 'low' ? 'selected' : ''}>低 (パフォーマンス優先)</option>
                            <option value="medium" ${this.currentUser?.settings?.graphics === 'medium' || !this.currentUser?.settings?.graphics ? 'selected' : ''}>中 (標準)</option>
                            <option value="high" ${this.currentUser?.settings?.graphics === 'high' ? 'selected' : ''}>高 (美麗グラフィック)</option>
                        </select>
                    </label>
                </div>

                <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">🔒 プライバシー（プロフィール画面と共通）</h4>
                <label style="display: block; margin-bottom: 10px; cursor: pointer; font-size: 14px;">
                    <input type="checkbox" id="setting-ranking-public" ${this.currentUser?.settings?.rankingPublic ? "checked" : ""}> 総合順位に公開する
                </label>
                <label style="display: block; margin-bottom: 10px; cursor: pointer; font-size: 14px;">
                    <input type="checkbox" id="setting-req-ranking" ${this.currentUser?.settings?.reqRanking ? "checked" : ""}> 総合順位からの申請許可
                </label>
                <label style="display: block; margin-bottom: 10px; cursor: pointer; font-size: 14px;">
                    <input type="checkbox" id="setting-req-history" ${this.currentUser?.settings?.reqHistory ? "checked" : ""}> バトル履歴からの申請許可
                </label>

                <div style="margin-top: 30px; text-align: center;">
                    <button id="btn-save-settings" style="padding: 10px 40px; background: #007bff; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">設定を保存</button>
                </div>
            </div>
        `;
        this.openModal("⚙️ 設定", html);

        document.getElementById('btn-save-settings')?.addEventListener('click', () => {
            const btn = document.getElementById('btn-save-settings');
            btn.disabled = true;
            btn.innerText = "保存中...";

            const newNickname = document.getElementById('setting-nickname').value.trim();
            const newPin = document.getElementById('setting-pin').value.trim();

            if (!newNickname) {
                this.showNotification("ニックネームを入力してください", "error");
                btn.disabled = false; btn.innerText = "設定を保存";
                return;
            }
            if (newPin.length !== 6 || isNaN(newPin)) {
                this.showNotification("PINは6桁の数字にしてください", "error");
                btn.disabled = false; btn.innerText = "設定を保存";
                return;
            }

            // 【完全連動】入力された全ての値をサーバーに送信
            if (typeof Network !== 'undefined' && Network.updateSettings) {
                Network.updateSettings({
                    nickname: newNickname,
                    pin: newPin,
                    settings: {
                        bgmVolume: parseInt(document.getElementById('setting-bgm').value, 10),
                        seVolume: parseInt(document.getElementById('setting-se').value, 10),
                        graphics: document.getElementById('setting-graphics').value,
                        rankingPublic: document.getElementById('setting-ranking-public').checked,
                        reqRanking: document.getElementById('setting-req-ranking').checked,
                        reqHistory: document.getElementById('setting-req-history').checked
                    }
                });
            }

            this.showNotification('設定を保存しました', 'success');
            setTimeout(() => this.closeModal(), 300);
        });
    },

    // =============== 🎮 ランダムマッチ ===============
    renderRandomMatchModal: function() {
        const html = `
            <div style="text-align: center; padding: 30px 10px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🌍</div>
                <h3 style="margin: 0 0 10px 0;">ランダムマッチ検索</h3>
                <p style="color: #666; margin-bottom: 30px;">全国のプレイヤーと対戦します。<br>最大30人の待機ルームへ移動します。</p>

                <div id="match-status" style="display: none; margin-bottom: 20px; font-weight: bold; color: #007bff;">
                    対戦相手を探しています... (1/30)
                </div>

                <button id="btn-start-match" style="width: 80%; padding: 15px; font-size: 18px; background: #ff5722; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(255,87,34,0.4);">⚔️ マッチング開始</button>
                <button id="btn-cancel-match" style="display: none; width: 80%; margin-top: 15px; padding: 15px; font-size: 16px; background: #9e9e9e; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold;">キャンセル</button>
            </div>
        `;
        this.openModal("🎮 ランダムマッチ", html);

        const btnStart = document.getElementById('btn-start-match');
        const btnCancel = document.getElementById('btn-cancel-match');
        const status = document.getElementById('match-status');
        let matchInterval;

        btnStart?.addEventListener('click', () => {
            btnStart.style.display = 'none';
            btnCancel.style.display = 'inline-block';
            status.style.display = 'block';
            let players = 1;
            matchInterval = setInterval(() => {
                players += Math.floor(Math.random() * 3);
                if(players > 30) players = 30;
                status.innerText = `対戦相手を探しています... (${players}/30)`;
                if(players >= 3) {
                    clearInterval(matchInterval);
                    status.innerText = 'マッチング完了！ゲームを開始します...';
                    status.style.color = '#4caf50';
                    setTimeout(() => { this.showNotification('ゲーム画面へ遷移（モック）', 'info'); this.closeModal(); }, 1500);
                }
            }, 1000);
        });

        btnCancel?.addEventListener('click', () => {
            clearInterval(matchInterval);
            btnStart.style.display = 'inline-block';
            btnCancel.style.display = 'none';
            status.style.display = 'none';
        });
    },

    // =============== 🏠 プライベートルーム ===============
    renderPrivateRoomModal: function() {
        const html = `
            <div style="padding: 10px;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #1565c0;">部屋を作る</h4>
                    <p style="font-size: 13px; color: #555; margin-bottom: 10px;">フレンドを招待して専用ルームで遊びます。</p>
                    <button id="btn-create-room" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">＋ 新規ルーム作成</button>
                </div>

                <div style="text-align: center; font-weight: bold; color: #aaa; margin-bottom: 20px;">または</div>

                <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #2e7d32;">コードで参加する</h4>
                    <p style="font-size: 13px; color: #555; margin-bottom: 10px;">共有された6桁のルームコードを入力してください。</p>
                    <input type="text" id="room-code-input" placeholder="例: 123456" maxlength="6" style="width: 60%; padding: 10px; text-align: center; font-size: 18px; letter-spacing: 5px; border: 1px solid #ccc; border-radius: 5px; margin-bottom: 10px;">
                    <br>
                    <button id="btn-join-room" style="padding: 10px 30px; background: #388e3c; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">入室する</button>
                </div>
            </div>
        `;
        this.openModal("🏠 プライベートルーム", html);

        document.getElementById('btn-create-room')?.addEventListener('click', () => {
            this.showNotification('ルームを作成しました！待機画面へ移動します。', 'success');
        });
        document.getElementById('btn-join-room')?.addEventListener('click', () => {
            const code = document.getElementById('room-code-input').value;
            if(code.length === 6) {
                this.showNotification(`ルーム ${code} に参加しています...`, 'info');
            } else {
                this.showNotification('正しい6桁のコードを入力してください', 'error');
            }
        });
    },

    // =============== 🎯 練習モード ===============
    renderPracticeModal: function() {
        const html = `
            <div style="padding: 15px;">
                <p style="color: #555; font-size: 14px; margin-bottom: 20px; text-align: center;">AIを相手に操作の練習ができます。</p>

                <label style="display: block; margin-bottom: 10px; font-weight: bold;">AIの強さ</label>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <label style="flex: 1; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px; cursor: pointer;"><input type="radio" name="ai-level" value="easy" checked> 弱い</label>
                    <label style="flex: 1; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px; cursor: pointer;"><input type="radio" name="ai-level" value="normal"> 普通</label>
                    <label style="flex: 1; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px; cursor: pointer;"><input type="radio" name="ai-level" value="hard"> 強い</label>
                </div>

                <label style="display: block; margin-bottom: 10px; font-weight: bold;">AIの人数 (0〜29人)</label>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px;">
                    <input type="range" id="ai-count-range" min="0" max="29" value="9" style="flex: 1;">
                    <span id="ai-count-display" style="font-size: 20px; font-weight: bold; width: 40px; text-align: right;">9</span> 人
                </div>

                <button id="btn-start-practice" style="width: 100%; padding: 15px; font-size: 18px; background: #673ab7; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(103,58,183,0.3);">🎯 練習を開始する</button>
            </div>
        `;
        this.openModal("🎯 練習モード", html);

        const range = document.getElementById('ai-count-range');
        const display = document.getElementById('ai-count-display');
        range?.addEventListener('input', (e) => {
            display.innerText = e.target.value;
        });

        document.getElementById('btn-start-practice')?.addEventListener('click', () => {
            this.showNotification(`AI ${range.value}人で練習モードを開始します`, 'info');
            this.closeModal();
        });
    },

    openModal: function(title, htmlContent) {
        this.modalTitle.textContent = title;
        this.modalContent.innerHTML = htmlContent;
        this.modalOverlay.classList.remove('hidden');
    },

    closeModal: function() {
        this.modalOverlay.classList.add('hidden');
        this.isFriendModalOpen = false; 
        this.isMailModalOpen = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});