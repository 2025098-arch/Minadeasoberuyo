// public/js/core/friends_ui.js

window.FriendsUI = {
    parentUI: null,
    currentTab: 'list',

    open: function(uiInstance) {
        this.parentUI = uiInstance;
        this.currentTab = 'list';
        this.render();
    },

    render: function() {
        const ui = this.parentUI;
        const data = ui.friendsData || { list: [], requestsReceived: [], history: [] };

        const formatLastLogin = (timestamp) => {
            if (!timestamp) return '🟢 オンライン'; 
            const now = Date.now();
            const diffMs = now - new Date(timestamp).getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 5) return '🟢 今すぐ (オンライン)';
            if (diffMins < 60) return `${diffMins}分前`;
            if (diffHours < 24) return `${diffHours}時間前`;
            if (diffDays === 1) return '昨日';
            return `${diffDays}日前`;
        };

        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px; overflow-x: auto;">
                <button id="ftab-list" style="padding: 6px 12px; cursor: pointer; background: ${this.currentTab==='list'?'#007bff':'#eee'}; color: ${this.currentTab==='list'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">リスト (${data.list.length})</button>
                <button id="ftab-requests" style="padding: 6px 12px; cursor: pointer; background: ${this.currentTab==='requests'?'#007bff':'#eee'}; color: ${this.currentTab==='requests'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">受信 (${data.requestsReceived.length})</button>
                <button id="ftab-search" style="padding: 6px 12px; cursor: pointer; background: ${this.currentTab==='search'?'#007bff':'#eee'}; color: ${this.currentTab==='search'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">ID検索</button>
                <button id="ftab-history" style="padding: 6px 12px; cursor: pointer; background: ${this.currentTab==='history'?'#007bff':'#eee'}; color: ${this.currentTab==='history'?'#fff':'#000'}; border: none; border-radius: 5px; white-space: nowrap;">履歴</button>
            </div>
        `;

        let contentHtml = '';

        if (this.currentTab === 'list') {
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

                        <div id="details-${f.id}" style="display: none; margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; border-left: 4px solid #007bff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                                <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                                    <span style="color: gray; font-size: 11px;">🆔 プレイヤーID</span><br>
                                    <span style="font-family: monospace; font-size: 14px; font-weight: bold;">${f.id}</span>
                                </div>
                                <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                                    <span style="color: gray; font-size: 11px;">⏱️ 最終ログイン</span><br>
                                    <span style="font-size: 14px; font-weight: bold;">${formatLastLogin(f.lastLogin)}</span>
                                </div>
                                <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                                    <span style="color: gray; font-size: 11px;">⭐ レベル</span><br>
                                    <span style="font-size: 14px; font-weight: bold;">Lv. ${f.level}</span>
                                </div>
                                <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                                    <span style="color: gray; font-size: 11px;">🏆 トロフィー</span><br>
                                    <span style="font-size: 14px; font-weight: bold;">${f.trophies}</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-mail-to-friend" data-id="${f.id}" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">✉️ メッセージを送る</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } else if (this.currentTab === 'requests') {
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
        } else if (this.currentTab === 'search') {
            contentHtml = `
                <div style="padding: 10px;">
                    <p style="margin-bottom: 10px; font-size: 14px; color: #555;">フレンドになりたい相手のプレイヤーIDを入力して申請を送信します。</p>
                    <input type="text" id="friend-search-input" placeholder="IDを入力 (例: A1B2C3D4)" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; text-transform: uppercase;">
                    <button id="btn-send-friend-req" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">🔍 検索して申請</button>
                </div>
            `;
        } else if (this.currentTab === 'history') {
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
        ui.openModal("👥 フレンド", finalHtml);

        this.bindEvents();
    },

    bindEvents: function() {
        const ui = this.parentUI;

        // タブ切り替え
        const bindTab = (id, tabName) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('click', () => {
                this.currentTab = tabName;
                this.render(); 
            });
        };
        bindTab('ftab-list', 'list');
        bindTab('ftab-requests', 'requests');
        bindTab('ftab-search', 'search');
        bindTab('ftab-history', 'history');

        // リストタブのイベント
        if (this.currentTab === 'list') {
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
                    ui.closeModal(); 

                    setTimeout(() => {
                        if (typeof window.MailUI !== 'undefined') {
                            // 1. まずメール画面を開く（仕様により一度「受信箱」になります）
                            window.MailUI.open(ui); 

                            // 2. その直後に「新規作成」タブに切り替えて、もう一度描画する！
                            window.MailUI.currentTab = 'compose';
                            window.MailUI.render(); 

                            // 3. 描画が終わったら、宛先の選択肢を対象のフレンドIDに合わせる
                            setTimeout(() => {
                                const selectEl = document.getElementById('mail-target');
                                if(selectEl) {
                                    selectEl.value = targetId;
                                }
                            }, 50);
                        }
                    }, 100);
                });
            });

            // ★ btn-invite-friend のクリックイベントを削除しました
        }

        // 申請タブのイベント
        if (this.currentTab === 'requests') {
            document.querySelectorAll('.btn-accept-friend').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    if(typeof Network !== 'undefined') Network.respondFriendRequest(e.target.getAttribute('data-id'), true); 
                    e.target.closest('div[style*="border-bottom"]').remove();
                    ui.showNotification('フレンド申請を承認しました', 'success');

                    ui.friendsData.requestsReceived = ui.friendsData.requestsReceived.filter(req => req.id !== e.target.getAttribute('data-id'));
                    if (typeof ui.onFriendsDataUpdated === 'function') {
                        ui.onFriendsDataUpdated(ui.friendsData);
                    }
                });
            });
            document.querySelectorAll('.btn-reject-friend').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    if(typeof Network !== 'undefined') Network.respondFriendRequest(e.target.getAttribute('data-id'), false); 
                    e.target.closest('div[style*="border-bottom"]').remove();

                    ui.friendsData.requestsReceived = ui.friendsData.requestsReceived.filter(req => req.id !== e.target.getAttribute('data-id'));
                    if (typeof ui.onFriendsDataUpdated === 'function') {
                        ui.onFriendsDataUpdated(ui.friendsData);
                    }
                });
            });
        }

        // 検索タブのイベント
        if (this.currentTab === 'search') {
            document.getElementById('btn-send-friend-req')?.addEventListener('click', () => {
                const targetId = document.getElementById('friend-search-input').value.trim().toUpperCase();
                if(!targetId) {
                    ui.showNotification('IDを入力してください', 'error');
                    return;
                }
                if(typeof Network !== 'undefined' && Network.sendFriendRequest) {
                    Network.sendFriendRequest(targetId);
                    ui.showNotification(`${targetId} にフレンド申請を送信しました`, 'success');
                }
                document.getElementById('friend-search-input').value = '';
            });
        }
    }
};