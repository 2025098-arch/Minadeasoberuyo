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

        // ★ここを追加：起動時にスプラッシュ画面を表示する
        this.showSplashScreen();
    },

    // ★ここからまるごと追加：スプラッシュ画面を2秒表示してフェードアウトさせる処理
    showSplashScreen: function() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(() => {
                splash.style.opacity = '0'; // ふわっと消える
                setTimeout(() => {
                    splash.style.display = 'none'; // 完全に非表示にする
                }, 1000); // 1秒かけて消える
            }, 2000); // 最初の2秒間は表示したまま
        }
    },
    // ★ここまで追加

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

        // 古い3つのボタンは削除し、新しい「ゲームスタート」ボタンを取得
        this.btnGameStart = document.getElementById('btn-game-start');

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

        // プロフィールボタンを押したときは「プロフィールタブ」を開く
        if (this.btnProfile) {
            this.btnProfile.addEventListener('click', () => {
                if (typeof window.ProfileUI !== 'undefined') {
                    window.ProfileUI.open(this, 'profile');
                } else {
                    console.error("❌ ProfileUIが読み込まれていません！");
                }
            });
        }

        // ======= 変更：フレンドボタンを押したとき =======
        this.btnFriends.addEventListener('click', () => {
            if (typeof window.FriendsUI !== 'undefined') {
                window.FriendsUI.open(this); // UI自身を渡して開く
            } else {
                console.error("❌ FriendsUIが読み込まれていません！");
            }
        });

        this.btnMail.addEventListener('click', () => {
            if (typeof window.MailUI !== 'undefined') {
                window.MailUI.open(this); // 新しいUIを呼び出す！
            } else {
                console.error("❌ MailUIが読み込まれていません！");
            }
        });

        this.btnHistory.addEventListener('click', () => {
            if (typeof window.HistoryUI !== 'undefined') {
                window.HistoryUI.open(this); // 新しいUIを呼び出す！
            } else {
                console.error("❌ HistoryUIが読み込まれていません！");
            }
        });
        this.btnRanking.addEventListener('click', () => {
            if (typeof window.RankingUI !== 'undefined') {
                window.RankingUI.open(this); // 新しいUIを呼び出す！
            } else {
                console.error("❌ RankingUIが読み込まれていません！");
            }
        });
        this.btnRewards.addEventListener('click', () => {
            if (typeof window.RewardsUI !== 'undefined') {
                window.RewardsUI.open(this); // 新しいUIを呼び出す！
            } else {
                console.error("❌ RewardsUIが読み込まれていません！");
            }
        });
        // --- 125行目付近：ショップボタンの取得とイベント登録 ---
        const shopButton = document.getElementById('btn-shop');

        if (shopButton) {
            // 'never read' を防ぐため、取得した変数にクリックイベントを紐づける
            shopButton.addEventListener('click', () => {
                console.log("🔘 ショップボタンがクリックされました");
                // ShopUIが存在するか確認して実行
                if (typeof ShopUI !== 'undefined') {
                    ShopUI.renderShopModal();
                } else {
                    console.error("❌ ShopUIが見つかりません。shop_ui.jsを読み込んでください。");
                }
            });
            console.log("🎯 ショップボタン(btn-shop)の紐づけに成功しました");
        } else {
            console.error("❌ HTML内に id='btn-shop' が見つかりません");
        }
        if (this.btnBackpack) {
            this.btnBackpack.addEventListener('click', () => {
                if (typeof window.BackpackUI !== 'undefined') {
                    // ★ 変更点：カッコの中に this (UI自身) を入れて手渡しする！
                    window.BackpackUI.open(this);
                } else {
                    console.error("❌ BackpackUIが読み込まれていません！index.htmlを確認してください。");
                }
            });
        }
        if (this.btnGacha) {
            this.btnGacha.addEventListener('click', () => {
                if (typeof window.GachaUI !== 'undefined') {
                    // ★ 変更点：GachaUI に UI自身(this) を渡して開く！
                    window.GachaUI.open(this);
                } else {
                    console.error("❌ GachaUIが読み込まれていません！index.htmlを確認してください。");
                }
            });
        }
        if (this.btnGameStart) {
            this.btnGameStart.addEventListener('click', () => {
                if (typeof window.GameUI !== 'undefined') {
                    window.GameUI.open(this); // 新しいUIを呼び出す！
                } else {
                    console.error("❌ GameUIが読み込まれていません！");
                }
            });
        }

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
                // 1行にまとめてスッキリさせました！
                ModelRenderer.renderPreview('character-canvas-container', userData.equipped.character, userData.equipped.skin);
            }
        }

        if(this.uiNickname) this.uiNickname.textContent = userData.nickname;
        if(this.uiId) this.uiId.textContent = userData.id;
        if(this.uiLevel) this.uiLevel.textContent = userData.level;
        if(this.uiCoins) this.uiCoins.textContent = userData.coins;
        if(this.uiTrophies) this.uiTrophies.textContent = userData.trophies;
        if(this.uiTickets) this.uiTickets.textContent = userData.gachaTickets || 0;

        // ★★★ 今回のバグ修正の核：ゲーム終了時の「透明化の呪縛」を完全に剥がす！ ★★★
        if (this.modalOverlay) {
            this.modalOverlay.style.display = ''; 
            this.modalOverlay.style.opacity = '';
        }
        const shopArea = document.getElementById('shop-modal-area');
        if (shopArea) {
            shopArea.style.display = '';
            shopArea.style.opacity = '';
        }
        // ★★★ ここまで ★★★

        // ★これを一番最後に追加！
        this.updateRewardsBadge();
    }, // <- onAuthSuccessの閉じカッコ

    onAuthError: function(msg) {
        this.showAuthError(msg);
    },

    onFriendsDataUpdated: function(friendsData) {
        this.friendsData = friendsData;

        // 届いているフレンド申請の数を数える
        const reqCount = friendsData.requestsReceived ? friendsData.requestsReceived.length : 0;

        // メールのコードと同じ形式で、ボタンの文字とバッジを書き換える！
        this.btnFriends.innerHTML = `👥 フレンド ${reqCount > 0 ? `<span style="background:red; color:white; border-radius:10px; padding:2px 5px; font-size:10px;">${reqCount}</span>` : ''}`;

        // もしフレンド画面を開きっぱなしだったら、中身も最新に描き直す
        if (this.isFriendModalOpen && typeof window.FriendsUI !== 'undefined') {
            window.FriendsUI.render();
        }
    },

    onMailDataUpdated: function(mailData) {
        this.mailData = mailData;
        const unreadCount = mailData.messages.filter(m => !m.isRead).length;
        this.btnMail.innerHTML = `✉️ メール ${unreadCount > 0 ? `<span style="background:red; color:white; border-radius:10px; padding:2px 5px; font-size:10px;">${unreadCount}</span>` : ''}`;

        if (this.isMailModalOpen && typeof window.MailUI !== 'undefined') {
            window.MailUI.render();
        }
    },

    // =============== 🎁 報酬バッジの更新 ===============
    updateRewardsBadge: function() {
        if (!this.currentUser || !this.btnRewards) return;
        let count = 0;

        // ①ログインボーナスが受け取れるか
        if (this.currentUser.canClaimLoginBonus) {
            count++;
        }

        // ②ロードマップで受け取れるものがあるか
        const currentTrophies = this.currentUser.trophies || 0;
        const claimedList = this.currentUser.claimedRoadmapRewards || [];

        if (typeof window.RewardsUI !== 'undefined') {
            window.RewardsUI.roadMap.forEach(r => {
                if (currentTrophies >= r.target && !claimedList.includes(r.target)) {
                    count++;
                }
            });
        }

        // バッジの描画
        this.btnRewards.innerHTML = `🎁 報酬 ${count > 0 ? `<span style="background:red; color:white; border-radius:10px; padding:2px 5px; font-size:10px;">${count}</span>` : ''}`;
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
            if (typeof window.HistoryUI !== 'undefined') {
                window.HistoryUI.render();
            }
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
    }, // ← ここで練習モードの関数を正しく閉じる

    // =============== 🛒 ショップ機能 (UI.initの中で呼ぶか、独立させる) ===============

    // ショップを開く関数をUIオブジェクトのメソッドとして定義
    openShop: function() {
        console.log("👟 ui.js: ショップ初期化エリアを通過！");

        function openShop() {
            console.log("🔘 ui.js: openShop関数が実行されました！（ボタンが反応しています）");
            console.log("🕵️‍♂️ ShopUIの正体はこれだ！:", ShopUI);
            if (typeof ShopUI !== 'undefined') {
                console.log("✅ ui.js: ShopUIを発見！これから renderShopModal を呼び出します！");
                ShopUI.renderShopModal();
            } else {
                console.error("❌ エラー: ShopUI が見つかりません！");
                alert("エラー: ShopUIが見つかりません。コンソールを確認してください。");
            }
        }

        // ==========================================
        // ボタンへのイベント紐づけ
        // ==========================================
        const shopButton = document.getElementById('btn-shop');
        console.log("🔍 ui.js: ショップボタンを探した結果 ->", shopButton);

        if (shopButton) {
            shopButton.addEventListener('click', openShop);
            console.log("🎯 ui.js: ショップボタンにクリック処理を紐づけました！");
        } else {
            console.error("❌ ui.js: 'btn-shop' というIDのボタンが見つかりません！HTMLを確認してください。");
        }

        // ショップを閉じる処理
        function closeShop() {
            const shopContainer = document.getElementById('shop-modal-area');
            if (shopContainer) {
                shopContainer.style.display = 'none';

                if (typeof ModelRenderer !== 'undefined' && typeof ModelRenderer.stopPreview === 'function') {
                    ModelRenderer.stopPreview('character-3d-container');
                }
                shopContainer.innerHTML = '';
            }
        }

        const closeShopButton = document.getElementById('btn-close-shop');
        if (closeShopButton) {
            closeShopButton.addEventListener('click', closeShop);
        }
    },

    openModal: function(title, htmlContent) {
        this.modalTitle.textContent = title;
        this.modalContent.innerHTML = htmlContent;

        // ★★★ 念のためのバグ修正：他のモーダルを開くときも確実に呪縛を解く ★★★
        if (this.modalOverlay) {
            this.modalOverlay.style.display = ''; 
        }
        // ★★★ ここまで ★★★

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