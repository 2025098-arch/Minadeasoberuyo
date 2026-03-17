        // public/js/core/game_ui.js

        window.GameUI = {
            parentUI: null,
            currentTab: 'random', // 'random', 'private', 'practice'
            isSocketInitialized: false, // 通信の受け取り設定を1回だけにするためのフラグ
            currentPrivateRoomCode: null, // 現在入っているプライベートルームのコード

            open: function(uiInstance) {
                this.parentUI = uiInstance;
                this.currentTab = 'random'; // 開いた時は最初はランダムマッチタブ

                // サーバーからの合図を受け取る準備（初回のみ実行）
                if (!this.isSocketInitialized) {
                    this.setupSocketListeners();
                    this.isSocketInitialized = true;
                }

                this.render();
            },

            // サーバーから「人数が増えた」「カウントダウン開始」などの合図を受け取る場所
            setupSocketListeners: function() {
                // ==========================================
                // 1. ランダムマッチ用の通信
                // ==========================================
                socket.on('matchmakingUpdate', (data) => {
                    const status = document.getElementById('match-status');
                    const playerListDiv = document.getElementById('random-player-list');

                    if (status) {
                        status.innerText = `${data.message} (${data.playerCount}/${data.maxPlayers})`;
                        status.style.color = '#007bff';
                    }

                    // 待機部屋にいる人の名前を並べて表示する
                    if (playerListDiv && data.players) {
                        playerListDiv.innerHTML = data.players.map(p => {
                            const isMe = (p.id === data.myId); // 自分かどうか判定

                            // 自分の場合は色を黄色っぽくして目立たせる！
                            const bgColor = isMe ? '#fff8e1' : '#e0f7fa'; 
                            const borderColor = isMe ? '#ffca28' : '#b2ebf2';
                            const textColor = isMe ? '#ff8f00' : '#00796b';
                            const meLabel = isMe ? ' <span style="font-size:11px; color:#f44336;">(あなた)</span>' : '';

                            return `
                                <div 
                                    onclick="window.GameUI.showPlayerProfile('${p.id}')"
                                    style="display: inline-block; padding: 8px 15px; margin: 5px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 20px; font-weight: bold; color: ${textColor}; cursor: pointer; transition: 0.2s;"
                                    onmouseover="this.style.transform='scale(1.05)'"
                                    onmouseout="this.style.transform='scale(1)'"
                                >
                                    👤 ${p.name} 🏆${p.trophies || 0} ${meLabel}
                                </div>
                            `;
                        }).join('');
                    }
                });

                socket.on('matchmakingTimer', (data) => {
                    const status = document.getElementById('match-status');
                    if (status) {
                        status.innerText = `ゲーム開始まで... あと ${data.seconds} 秒！`;
                        status.style.color = '#ff9800'; // カウントダウン中はオレンジ色にして目立たせる
                    }
                });

                socket.on('matchmakingTimerCancelled', (data) => {
                    const status = document.getElementById('match-status');
                    if (status) {
                        status.innerText = data.message;
                        status.style.color = '#f44336'; // 中止は赤色
                    }
                });

                socket.on('matchFound', (data) => {
                    const status = document.getElementById('match-status');
                    const btnCancel = document.getElementById('btn-cancel-match');
                    if (status) {
                        status.innerText = 'マッチング完了！ゲームを開始します...';
                        status.style.color = '#4caf50';
                    }
                    if (btnCancel) {
                        btnCancel.style.display = 'none'; // キャンセルできないように隠す
                    }

                    // 少し待ってから画面を切り替える演出
                    setTimeout(() => { 
                        const lobbyArea = document.getElementById('random-lobby-area');
                        if (lobbyArea) lobbyArea.style.display = 'none';

                        this.parentUI.showNotification(`ルーム ${data.roomId} で ${data.game} を開始します！`, 'success'); 
                    // 👇 追加：ゲームクライアントに指示を出す！
                        window.GameClient.startMiniGame(data.game, data.participants);
                    }, 1500);
                });

                // ==========================================
                // 2. プライベートルーム用の通信
                // ==========================================
                socket.on('privateRoomJoined', (data) => {
                    this.currentPrivateRoomCode = data.roomCode;
                    const lobbyArea = document.getElementById('private-lobby-area');
                    if (lobbyArea) lobbyArea.style.display = 'flex';

                    const codeDisplay = document.getElementById('private-room-code-display');
                    if (codeDisplay) codeDisplay.innerText = data.roomCode;

                    // チャットエリアを初期化
                    const chatMessages = document.getElementById('private-chat-messages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 12px; margin-bottom: 5px;">チャットルームへようこそ</div>';
                    }
                });

                socket.on('privateRoomUpdate', (data) => {
                    const listDiv = document.getElementById('private-player-list');
                    const amIHost = data.players.find(p => p.id === data.myId)?.isHost;

                    if (listDiv && data.players) {
                        listDiv.innerHTML = data.players.map(p => {
                            const isMe = (p.id === data.myId);
                            const hostMark = p.isHost ? '👑' : '👤';
                            const bgColor = isMe ? '#fff8e1' : (p.isHost ? '#fce4ec' : '#e0f7fa'); 
                            const borderColor = isMe ? '#ffca28' : (p.isHost ? '#f48fb1' : '#b2ebf2');
                            const textColor = isMe ? '#ff8f00' : '#333';
                            const meLabel = isMe ? ' <span style="font-size:11px; color:#f44336;">(あなた)</span>' : '';

                            const kickBtn = (amIHost && !isMe) 
                                ? `<button onclick="event.stopPropagation(); window.GameUI.kickPlayer('${p.id}');" style="margin-left: 10px; padding: 2px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">追放</button>` 
                                : '';

                            return `
                                <div 
                                    onclick="window.GameUI.showPlayerProfile('${p.id}')"
                                    style="display: inline-block; padding: 8px 15px; margin: 5px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 20px; font-weight: bold; color: ${textColor}; cursor: pointer; transition: 0.2s;"
                                    onmouseover="this.style.transform='scale(1.05)'"
                                    onmouseout="this.style.transform='scale(1)'"
                                >
                                    ${hostMark} ${p.name} 🏆${p.trophies || 0} ${meLabel}
                                    ${kickBtn}
                                </div>
                            `;
                        }).join('');
                    }

                    // ホスト専用UI（ゲーム選択・開始ボタン・招待UI）の表示切り替え
                    const btnStart = document.getElementById('btn-private-start');
                    const waitingMsg = document.getElementById('private-waiting-msg');
                    const gameSelectArea = document.getElementById('private-game-select-area');
                    const inviteContainer = document.getElementById('invite-area-container');

                    if (inviteContainer) inviteContainer.style.display = amIHost ? 'block' : 'none';

                    if (btnStart) {
                        btnStart.style.display = amIHost ? 'inline-block' : 'none';

                        if (data.players.length < 2) {
                            btnStart.disabled = true;
                            btnStart.style.opacity = '0.5';
                            btnStart.innerText = '👥 2人以上で開始できます';
                        } else {
                            btnStart.disabled = false;
                            btnStart.style.opacity = '1';
                            btnStart.innerText = '🚀 ゲーム開始';
                        }
                    }

                    if (waitingMsg) waitingMsg.style.display = amIHost ? 'none' : 'block';
                    if (gameSelectArea) gameSelectArea.style.display = amIHost ? 'block' : 'none';
                });

                // チャット受信処理
                socket.on('privateRoomChatReceive', (data) => {
                    const chatMessages = document.getElementById('private-chat-messages');
                    if (chatMessages) {
                        const isMe = data.senderId === socket.id;
                        const align = isMe ? 'right' : 'left';
                        const bgColor = isMe ? '#dcf8c6' : '#fff';
                        const nameDisplay = isMe ? '' : `<span style="font-size: 10px; color: #888;">${data.senderName}</span><br>`;

                        chatMessages.innerHTML += `
                            <div style="text-align: ${align}; margin-bottom: 5px;">
                                ${nameDisplay}
                                <div style="display: inline-block; background: ${bgColor}; padding: 6px 12px; border-radius: 12px; border: 1px solid #ddd; max-width: 80%; text-align: left; word-break: break-all; font-size: 14px;">
                                    ${data.message}
                                </div>
                            </div>
                        `;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                });

                // 🚫 キックされた時の処理
                socket.on('kickedFromPrivateRoom', (msg) => {
                    if (this.parentUI) {
                        this.parentUI.showNotification(msg || 'ホストによりルームから追放されました。', 'error');
                    }
                    const lobbyArea = document.getElementById('private-lobby-area');
                    if (lobbyArea) lobbyArea.style.display = 'none';
                    this.currentPrivateRoomCode = null;
                });

                socket.on('privateRoomError', (msg) => {
                    if (this.parentUI) this.parentUI.showNotification(msg, 'error');
                });

                // 💡 修正箇所1：カッコの対応を正しく直しました
                socket.on('privateRoomStart', (data) => {
                    const lobbyArea = document.getElementById('private-lobby-area');
                    if (lobbyArea) lobbyArea.style.display = 'none';

                    if (this.parentUI) {
                        this.parentUI.showNotification(`プライベートゲーム ${data.game} を開始します！`, 'success');
                    }

                    // 👇 追加：ゲームクライアントに指示を出す！
                    window.GameClient.startMiniGame(data.game, data.participants || []);
                });

                // ==========================================
                // 3. システム・メール通知用の通信
                // ==========================================
                // 💌 リアルタイムで招待状を受け取る
                socket.on('receiveMail', (mail) => {
                    if (this.parentUI) {
                        this.parentUI.showNotification(`💌 ${mail.message}`, 'info');
                    }
                });

                // 👥 サーバーからフレンドリストを受け取って選択UIを出す
                socket.on('friendsListForInvite', (data) => {
                    console.log("💌 [デバッグ] フレンドリスト受信:", data); // 確認用

                    // ⚠️ 修正ポイント：サーバーから来るデータが配列かオブジェクトか分からない場合でも安全に処理する
                    const friendsArray = Array.isArray(data) ? data : (data && data.friends ? data.friends : []);

                    const selectUI = document.getElementById('invite-select-ui');
                    const btnInvite = document.getElementById('btn-invite-friend');
                    const selectBox = document.getElementById('friend-select-for-invite');

                    if (!friendsArray || friendsArray.length === 0) {
                        if (this.parentUI) this.parentUI.showNotification('招待できるフレンドがいません。', 'error');
                        return;
                    }

                    if (selectUI && btnInvite && selectBox) {
                        // ⚠️ 修正ポイント：サーバーのDB構造が「id/name」でも「userId/nickname」でも柔軟に読み取れるようにする
                        selectBox.innerHTML = friendsArray.map(f => {
                            const fId = f.id || f.userId || f._id;
                            const fName = f.name || f.nickname || f.username || "名称不明";
                            return `<option value="${fId}">${fName}</option>`;
                        }).join('');

                        btnInvite.style.display = 'none';   // 元のボタンを隠す
                        selectUI.style.display = 'flex';    // セレクトUIを表示する
                    }
                });

                socket.on('inviteSuccess', (msg) => {
                    if (this.parentUI) this.parentUI.showNotification(msg, 'success');
                });
            },

            render: function() {
                const ui = this.parentUI;

                // タブボタンのスタイル定義
                const tabStyle = (tabId) => `
                    flex: 1; 
                    padding: 12px 5px; 
                    text-align: center; 
                    cursor: pointer; 
                    font-weight: bold; 
                    border-bottom: 3px solid ${this.currentTab === tabId ? '#ff5722' : 'transparent'};
                    color: ${this.currentTab === tabId ? '#ff5722' : '#666'};
                    background: ${this.currentTab === tabId ? '#fff' : '#f9f9f9'};
                    transition: 0.2s;
                `;

                let contentHtml = '';

                if (this.currentTab === 'random') {
                    contentHtml = `
                        <div style="text-align: center; padding: 20px 10px; animation: fadeIn 0.3s;">
                            <div id="random-start-area">
                                <div style="font-size: 64px; margin-bottom: 20px;">🌍</div>
                                <h3 style="margin: 0 0 10px 0;">ランダムマッチ</h3>
                                <p style="color: #666; margin-bottom: 30px;">全国のプレイヤーと対戦します。<br>最大30人の待機ルームへ移動します。</p>
                                <button id="btn-start-match" style="width: 80%; padding: 15px; font-size: 18px; background: #ff5722; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(255,87,34,0.4);">⚔️ マッチング開始</button>
                            </div>

                            <div id="random-lobby-area" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.85); z-index: 10000; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                                <div style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 450px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                                    <h3 style="margin: 0 0 15px 0; color: #ff5722; font-size: 24px;">🕒 待機ルーム</h3>
                                    <div id="match-status" style="margin-bottom: 20px; font-weight: bold; color: #007bff; font-size: 18px;">
                                        対戦相手を探しています... (1/30)
                                    </div>
                                    <div id="random-player-list" style="background: #f1f1f1; min-height: 150px; border-radius: 10px; padding: 15px; margin-bottom: 25px; text-align: center; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1); max-height: 250px; overflow-y: auto;">
                                    </div>
                                    <button id="btn-cancel-match" style="width: 80%; padding: 15px; font-size: 18px; background: #9e9e9e; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold;">退出する</button>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (this.currentTab === 'private') {
                    contentHtml = `
                        <div style="padding: 15px; animation: fadeIn 0.3s;">
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #1565c0;">部屋を作る</h4>
                                <p style="font-size: 13px; color: #555; margin-bottom: 10px;">フレンドを招待して専用ルームで遊びます。</p>
                                <button id="btn-create-room" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">＋ 新規ルーム作成</button>
                            </div>
                            <div style="text-align: center; font-weight: bold; color: #aaa; margin-bottom: 20px;">または</div>
                            <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #2e7d32;">コードで参加する</h4>
                                <p style="font-size: 13px; color: #555; margin-bottom: 10px;">共有された6桁のルームコードを入力してください。</p>
                                <input type="text" id="room-code-input" placeholder="例: A1B2C3" maxlength="6" style="width: 60%; padding: 10px; text-align: center; font-size: 18px; letter-spacing: 5px; border: 1px solid #ccc; border-radius: 5px; margin-bottom: 10px;">
                                <br>
                                <button id="btn-join-room" style="padding: 10px 30px; background: #388e3c; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">入室する</button>
                            </div>

                            <div id="private-lobby-area" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.85); z-index: 10000; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                                <div style="background: white; padding: 20px; border-radius: 15px; width: 90%; max-width: 450px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 95vh;">
                                    <h3 style="margin: 0 0 5px 0; color: #1565c0; font-size: 22px;">🏠 プライベートルーム</h3>
                                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">コード: <span id="private-room-code-display" style="font-size: 20px; font-weight: bold; color: #d32f2f; letter-spacing: 3px;">---</span></p>

                                    <div id="private-game-select-area" style="display: none; margin-bottom: 10px; background: #e8f5e9; padding: 8px; border-radius: 8px; border: 1px solid #c8e6c9;">
                                        <label style="font-weight: bold; color: #2e7d32; font-size: 14px;">🎮 ミニゲーム選択:</label>
                                        <select id="private-game-select" style="padding: 5px; border-radius: 5px; border: 1px solid #ccc; font-size: 14px;">
                                            <option value="game1">絶対に落ちるな！</option>
                                            <option value="game2">準備中</option>
                                        </select>
                                    </div>

                                    <div id="private-player-list" style="background: #f1f1f1; min-height: 80px; border-radius: 10px; padding: 10px; margin-bottom: 10px; text-align: center; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1); max-height: 120px; overflow-y: auto;">
                                    </div>

                                    <div id="invite-area-container" style="display: none; width: 100%; margin-bottom: 10px;">
                                        <button id="btn-invite-friend" style="width: 100%; padding: 8px; font-size: 14px; background: #0288d1; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">💌 フレンドを招待する</button>

                                        <div id="invite-select-ui" style="display: none; flex-direction: column; gap: 5px; background: #e1f5fe; padding: 8px; border-radius: 5px; border: 1px solid #b3e5fc;">
                                            <div style="font-size: 12px; font-weight: bold; color: #0277bd; margin-bottom: 3px;">招待するフレンドを選択:</div>
                                            <div style="display: flex; gap: 5px;">
                                                <select id="friend-select-for-invite" style="flex: 1; padding: 6px; border-radius: 5px; border: 1px solid #ccc;"></select>
                                                <button id="btn-send-invite-confirm" style="padding: 6px 12px; font-size: 14px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">送信</button>
                                            </div>
                                            <button id="btn-cancel-invite" style="padding: 5px; font-size: 12px; background: #9e9e9e; color: white; border: none; border-radius: 5px; cursor: pointer;">キャンセル</button>
                                        </div>
                                    </div>

                                    <div id="private-chat-area" style="display: flex; flex-direction: column; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; height: 180px; background: #fafafa;">
                                        <div id="private-chat-messages" style="flex: 1; padding: 10px; overflow-y: auto; text-align: left; background: #ece5dd;">
                                        </div>
                                        <div style="display: flex; border-top: 1px solid #ccc; background: white;">
                                            <input type="text" id="private-chat-input" placeholder="メッセージ..." style="flex: 1; padding: 10px; border: none; outline: none;">
                                            <button id="btn-private-chat-send" style="padding: 10px 15px; background: #1976d2; color: white; border: none; cursor: pointer; font-weight: bold;">送信</button>
                                        </div>
                                    </div>

                                    <p id="private-waiting-msg" style="color: #ff9800; font-weight: bold; margin-bottom: 10px; display: none;">⏳ ホストの開始を待っています...</p>
                                    <button id="btn-private-start" style="width: 100%; padding: 12px; font-size: 16px; background: #4caf50; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; margin-bottom: 10px; display: none; box-shadow: 0 4px 6px rgba(76,175,80,0.3);">🚀 ゲーム開始</button>
                                    <button id="btn-private-leave" style="width: 100%; padding: 10px; font-size: 14px; background: #9e9e9e; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold;">退出する</button>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (this.currentTab === 'practice') {
                    contentHtml = `
                        <div style="padding: 20px 15px; animation: fadeIn 0.3s;">
                            <div style="font-size: 48px; text-align: center; margin-bottom: 10px;">🎯</div>
                            <p style="color: #555; font-size: 14px; margin-bottom: 20px; text-align: center;">AIを相手に操作の練習ができます。</p>
                            <label style="display: block; margin-bottom: 10px; font-weight: bold;">🤖 AIの強さ</label>
                            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                                <label style="flex: 1; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px; cursor: pointer;"><input type="radio" name="ai-level" value="easy" checked> 弱い</label>
                                <label style="flex: 1; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px; cursor: pointer;"><input type="radio" name="ai-level" value="normal"> 普通</label>
                                <label style="flex: 1; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 5px; cursor: pointer;"><input type="radio" name="ai-level" value="hard"> 強い</label>
                            </div>
                            <label style="display: block; margin-bottom: 10px; font-weight: bold;">👥 AIの人数 (0〜29人)</label>
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px;">
                                <input type="range" id="ai-count-range" min="0" max="29" value="9" style="flex: 1;">
                                <span id="ai-count-display" style="font-size: 20px; font-weight: bold; width: 40px; text-align: right;">9</span> 人
                            </div>
                            <button id="btn-start-practice" style="width: 100%; padding: 15px; font-size: 18px; background: #673ab7; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(103,58,183,0.3);">練習を開始する</button>
                        </div>
                    `;
                }

                const finalHtml = `
                    <style>
                        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                    </style>
                    <div style="display: flex; border-bottom: 1px solid #ddd; background: #f9f9f9;">
                        <div class="game-tab" data-tab="random" style="${tabStyle('random')}">🌍<br>ランダム</div>
                        <div class="game-tab" data-tab="private" style="${tabStyle('private')}">🏠<br>プライベート</div>
                        <div class="game-tab" data-tab="practice" style="${tabStyle('practice')}">🎯<br>練習</div>
                    </div>
                    <div style="min-height: 350px;">
                        ${contentHtml}
                    </div>
                `;

                ui.openModal("🎮 ゲームスタート", finalHtml);
                this.bindEvents();
            },

            bindEvents: function() {
                const ui = this.parentUI;

                // タブ切り替えイベント
                document.querySelectorAll('.game-tab').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        const selectedTab = e.currentTarget.getAttribute('data-tab');
                        if (this.currentTab !== selectedTab) {
                            if (this.currentTab === 'random') {
                                socket.emit('cancelRandomMatch'); 
                            }
                            if (this.currentTab === 'private') {
                                socket.emit('leavePrivateRoom'); 
                                this.currentPrivateRoomCode = null;
                            }
                            this.currentTab = selectedTab;
                            this.render(); 
                        }
                    });
                });

                // ======= ランダムマッチのイベント =======
                if (this.currentTab === 'random') {
                    document.getElementById('btn-start-match')?.addEventListener('click', () => {
                        document.getElementById('random-lobby-area').style.display = 'flex';
                        socket.emit('joinRandomMatch');
                    });

                    document.getElementById('btn-cancel-match')?.addEventListener('click', () => {
                        document.getElementById('random-lobby-area').style.display = 'none';
                        socket.emit('cancelRandomMatch');
                    });
                }

                // ======= プライベートルームのイベント =======
                if (this.currentTab === 'private') {
                    document.getElementById('btn-create-room')?.addEventListener('click', () => {
                        socket.emit('createPrivateRoom'); 
                    });

                    document.getElementById('btn-join-room')?.addEventListener('click', () => {
                        const code = document.getElementById('room-code-input').value.trim();
                        if(code.length === 6) {
                            socket.emit('joinPrivateRoom', { roomCode: code });
                        } else {
                            ui.showNotification('正しい6桁のコードを入力してください', 'error');
                        }
                    });

                    document.getElementById('btn-private-leave')?.addEventListener('click', () => {
                        const lobbyArea = document.getElementById('private-lobby-area');
                        if (lobbyArea) lobbyArea.style.display = 'none';
                        socket.emit('leavePrivateRoom');
                        this.currentPrivateRoomCode = null;
                    });

                    const btnStart = document.getElementById('btn-private-start');
                    btnStart?.addEventListener('click', () => {
                        if (btnStart.disabled) return;
                        if (this.currentPrivateRoomCode) {
                            const selectedGame = document.getElementById('private-game-select')?.value || 'game1';
                            socket.emit('startPrivateGame', { roomCode: this.currentPrivateRoomCode, game: selectedGame });
                        }
                    });

                    // 💌 フレンド招待イベント（ID入力ではなく、リストを要求するように変更）
                    document.getElementById('btn-invite-friend')?.addEventListener('click', () => {
                        socket.emit('getFriendsForInvite');
                    });

                    // 💌 リストから選んで送信するボタン
                    document.getElementById('btn-send-invite-confirm')?.addEventListener('click', () => {
                        const selectedFriendId = document.getElementById('friend-select-for-invite')?.value;
                        if (selectedFriendId && this.currentPrivateRoomCode) {
                            // index.jsで設定した名前（inviteFriend）と引数（targetFriendId）に合わせて送信
                            socket.emit('inviteFriend', { targetFriendId: selectedFriendId, roomCode: this.currentPrivateRoomCode });

                            // UIを元のボタンに戻す
                            document.getElementById('invite-select-ui').style.display = 'none';
                            document.getElementById('btn-invite-friend').style.display = 'block';
                        }
                    });

                    // 💌 招待をキャンセルして元のボタンに戻す
                    document.getElementById('btn-cancel-invite')?.addEventListener('click', () => {
                        document.getElementById('invite-select-ui').style.display = 'none';
                        document.getElementById('btn-invite-friend').style.display = 'block';
                    });

                    // チャット送信イベント
                    const btnChatSend = document.getElementById('btn-private-chat-send');
                    const chatInput = document.getElementById('private-chat-input');
                    const sendChat = () => {
                        const msg = chatInput.value.trim();
                        if (msg && this.currentPrivateRoomCode) {
                            socket.emit('privateRoomChatSend', { roomCode: this.currentPrivateRoomCode, message: msg });
                            chatInput.value = ''; 
                        }
                    };

                    btnChatSend?.addEventListener('click', sendChat);
                    chatInput?.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') sendChat();
                    });
                }

                // ======= 練習モードのイベント =======
                if (this.currentTab === 'practice') {
                    const range = document.getElementById('ai-count-range');
                    const display = document.getElementById('ai-count-display');

                    range?.addEventListener('input', (e) => {
                        display.innerText = e.target.value;
                    });

                    document.getElementById('btn-start-practice')?.addEventListener('click', () => {
                        ui.showNotification(`AI ${range.value}人で練習モードを開始します`, 'info');
                        ui.closeModal();
                    });
                }
            }, // 💡 修正箇所2：ここに関数を閉じる「},」が抜けていました！

            showPlayerProfile: function(userId) {
                if (this.parentUI) {
                    // 将来的に profile_ui.js の機能が完成したら、ここで相手のプロフィール画面を開く処理を呼び出します。
                }
            },

            kickPlayer: function(playerId) {
                if (this.currentPrivateRoomCode) {
                    if (confirm("本当にこのプレイヤーを追放しますか？")) {
                        socket.emit('kickPlayerFromPrivateRoom', { roomCode: this.currentPrivateRoomCode, targetId: playerId });
                    }
                }
            }
        };