// public/js/core/history_ui.js

window.HistoryUI = {
    parentUI: null,

    open: function(uiInstance) {
        this.parentUI = uiInstance;
        this.render();
    },

    render: function() {
        const ui = this.parentUI;

        // サーバーからデータが来ていない場合は取得命令を出して「ロード中」を表示
        if (!ui.historyData) {
            ui.openModal("📜 バトル履歴", `<div style="text-align:center; padding: 20px;">データを読み込み中...⏳</div>`);
            if (typeof Network !== 'undefined') Network.fetchHistoryData();
            return;
        }

        const historyData = ui.historyData || [];

        // フレンドIDのリストを取得（ランキングの時と同じ妥協のない判定処理！）
        const friendIds = [];
        if (ui.friendsData) {
            const friendList = ui.friendsData.list || ui.friendsData.friends || [];
            friendList.forEach(f => {
                friendIds.push(typeof f === 'string' ? f : f.id);
            });
        }

        let contentHtml = '';
        if (historyData.length === 0) {
            contentHtml = '<div style="text-align:center; padding:20px;">バトル履歴がありません。</div>';
        } else {
            contentHtml = historyData.map((h, index) => {
                const rankText = h.rank || (h.result === 'WIN' ? '1位' : '敗北');
                const isFirstPlace = rankText === '1位' || rankText === '1' || h.result === 'WIN';
                const isNegative = String(rankText).includes('-') || String(h.trophies || h.trophyChange).includes('-');

                // ブロスタ風の背景色（勝利・上位は青系/金、敗北はグレー/赤系）
                const headerBg = isFirstPlace ? 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' : 'linear-gradient(90deg, #757f9a 0%, #d7dde8 100%)';
                const headerColor = isFirstPlace ? '#fff' : '#333';
                const resultText = isFirstPlace ? '勝利' : '敗北';
                const resultColor = isFirstPlace ? '#4caf50' : '#f44336';

                const displayDate = h.date || (h.timestamp ? new Date(h.timestamp).toLocaleString() : '不明な日時');
                const displayMode = h.mode || h.gameMode || 'ゲーム';

                let displayTrophies = h.trophies;
                if (displayTrophies === undefined && h.trophyChange !== undefined) {
                    displayTrophies = h.trophyChange > 0 ? `+${h.trophyChange}` : `${h.trophyChange}`;
                }

                // プレイヤーリストの生成（30人対応のグリッド状）
                const opponents = h.opponents || [];
                // 自分自身も履歴に表示するためのダミー追加（サーバーデータに自分がいれば不要ですが念のため）
                const allPlayers = [...opponents]; 

                const playersHtml = allPlayers.map(p => {
                    return `
                        <div class="history-player-icon" data-match-index="${index}" data-id="${p.id}" data-name="${p.name}" data-level="${p.level || '?'}" data-req="${p.reqHistory !== false}" style="width: 50px; cursor: pointer; display: flex; flex-direction: column; align-items: center; margin: 3px;">
                            <div style="width: 45px; height: 45px; background: #222; border: 2px solid #000; border-radius: 5px; position: relative; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 20px;">👤</span> <div style="position: absolute; bottom: -2px; right: -2px; background: #ffeb3b; color: #000; font-size: 9px; font-weight: bold; padding: 1px 3px; border-radius: 3px; border: 1px solid #000;">Lv.${p.level || 1}</div>
                            </div>
                            <div style="font-size: 10px; width: 50px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #333; margin-top: 2px;">${p.name}</div>
                        </div>
                    `;
                }).join('');

                return `
                <div style="background: #fff; border-radius: 8px; margin-bottom: 15px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #ddd;">
                    <div style="background: ${headerBg}; color: ${headerColor}; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 16px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${displayMode}</div>
                            <div style="font-size: 11px; opacity: 0.8;">⏱ ${displayDate}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 18px; font-weight: bold; color: ${isFirstPlace ? '#a5d6a7' : '#e57373'}; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${resultText}</div>
                        </div>
                        <div style="font-size: 20px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                            🏆 ${displayTrophies}
                        </div>
                    </div>

                    <div style="padding: 10px; background: #f0f0f0; border-bottom: 1px solid #ccc;">
                        <div style="display: flex; flex-wrap: wrap; gap: 5px; max-height: 140px; overflow-y: auto;">
                            ${playersHtml || '<div style="font-size: 12px; color: #999; padding: 10px;">対戦相手データなし</div>'}
                        </div>

                        <div id="history-action-panel-${index}" style="display: none; margin-top: 10px; background: #fff; border: 2px solid #2196f3; border-radius: 8px; padding: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); animation: fadeIn 0.2s;">
                            </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        const finalHtml = `
            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                .history-player-icon:hover { filter: brightness(1.2); transform: scale(1.05); transition: 0.1s; }
            </style>
            <div style="max-height: 60vh; overflow-y: auto; padding: 5px; background: #e0e0e0;">${contentHtml}</div>
        `;

        ui.openModal("📜 バトル履歴", finalHtml);
        this.bindEvents(friendIds);
    },

    bindEvents: function(friendIds) {
        const ui = this.parentUI;

        // プレイヤーアイコンをタップしたときの処理
        document.querySelectorAll('.history-player-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const matchIndex = target.getAttribute('data-match-index');
                const targetId = target.getAttribute('data-id');
                const targetName = target.getAttribute('data-name');
                const targetLevel = target.getAttribute('data-level');
                const reqAllowed = target.getAttribute('data-req') === 'true';

                const actionPanel = document.getElementById(`history-action-panel-${matchIndex}`);

                // すでに同じ人を開いていたら閉じる
                if (actionPanel.style.display === 'block' && actionPanel.getAttribute('data-current-id') === targetId) {
                    actionPanel.style.display = 'none';
                    actionPanel.setAttribute('data-current-id', '');
                    return;
                }

                // 権限と状態のチェック（妥協なし！）
                const isSelf = targetId === ui.currentUser?.id;
                const isFriend = friendIds.includes(targetId);
                const displayId = (isSelf || isFriend) ? targetId : '<span style="color:#999;">非公開 (フレンドのみ)</span>';

                let friendBtnHtml = '';
                if (isSelf) {
                    friendBtnHtml = `<span style="display:inline-block; padding:8px 15px; background:#ddd; color:#777; border-radius:5px; font-weight:bold;">あなた自身です</span>`;
                } else if (isFriend) {
                    friendBtnHtml = `<span style="display:inline-block; padding:8px 15px; background:#e8f5e9; color:#4caf50; border-radius:5px; font-weight:bold; border: 1px solid #4caf50;">✅ フレンド</span>`;
                } else if (!reqAllowed) {
                    friendBtnHtml = `<span style="display:inline-block; padding:8px 15px; background:#ffebee; color:#f44336; border-radius:5px; font-weight:bold; border: 1px solid #f44336;">申請不可</span>`;
                } else {
                    friendBtnHtml = `<button class="btn-send-req-history" data-id="${targetId}" style="padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">👤 フレンド申請</button>`;
                }

                // パネルの中身を生成
                actionPanel.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                        <strong style="font-size: 16px;">${targetName} <span style="font-size: 12px; color: #666; font-weight: normal;">(Lv.${targetLevel})</span></strong>
                        <div style="font-size: 11px; color: #555;">ID: ${displayId}</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            ${friendBtnHtml}
                        </div>
                        <div style="flex: 1;">
                            <button class="btn-check-profile" data-id="${targetId}" style="padding: 8px 15px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">📄 プロフィール</button>
                        </div>
                    </div>
                `;

                actionPanel.style.display = 'block';
                actionPanel.setAttribute('data-current-id', targetId);

                // 生成したボタンにイベントを付与
                const reqBtn = actionPanel.querySelector('.btn-send-req-history');
                if (reqBtn) {
                    reqBtn.addEventListener('click', (ev) => {
                        const id = ev.target.getAttribute('data-id');
                        if (typeof Network !== 'undefined' && Network.sendFriendRequest) {
                            Network.sendFriendRequest(id);
                            if (typeof ui.showNotification === 'function') {
                                ui.showNotification(`${targetName}にフレンド申請を送りました！`, 'success');
                            }
                            ev.target.disabled = true;
                            ev.target.textContent = '送信済';
                            ev.target.style.background = '#ccc';
                        }
                    });
                }

                const profileBtn = actionPanel.querySelector('.btn-check-profile');
                if (profileBtn) {
                    profileBtn.addEventListener('click', () => {
                        if (typeof ui.showNotification === 'function') {
                            ui.showNotification(`※プロフィール詳細機能は現在開発中です`, 'info');
                        }
                    });
                }
            });
        });
    }
};