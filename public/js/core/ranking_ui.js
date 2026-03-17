// public/js/core/ranking_ui.js

window.RankingUI = {
    parentUI: null,

    open: function(uiInstance) {
        this.parentUI = uiInstance;
        this.render();
    },

    render: function() {
        const ui = this.parentUI;

        // サーバーからデータが来ていない場合は取得命令を出して「ロード中」を表示
        if (!ui.rankingData) {
            ui.openModal("👑 総合順位", `<div style="text-align:center; padding: 20px;">データを読み込み中...⏳</div>`);
            if (typeof Network !== 'undefined') Network.fetchRanking();
            return;
        }

        const rankingData = ui.rankingData.top10 || [];
        const myRank = ui.rankingData.myRank;

        // friends.json の構造に合わせて "list" からフレンドIDの配列を取得する
        const friendIds = [];
        if (ui.friendsData) {
            const friendList = ui.friendsData.list || ui.friendsData.friends || [];
            friendList.forEach(f => {
                friendIds.push(typeof f === 'string' ? f : f.id);
            });
        }

        // 1. 自分の現在の順位
        let contentHtml = `<div style="background: #fff3e0; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center; font-weight: bold; color: #e65100; border: 1px solid #ffe0b2;">
            あなたの現在の順位（総プレイヤー）: ${myRank === '圏外' ? myRank : myRank + '位'}
        </div>`;

        // 2. 説明文
        contentHtml += `<div style="margin-bottom: 15px; font-size: 13px; color: #555; text-align: center; line-height: 1.5;">
            🏆 トロフィー数トップ10（公開設定者のみランキングに表示されます）<br>
            <span style="color: #d32f2f;">フレンド申請を許可してないプレイヤーにはフレンド申請が出来ません。</span>
        </div>`;

        // 3. ランキングリスト
        contentHtml += rankingData.map((r, index) => {
            // 背景のグラデーションデザイン（妥協なし！）
            const rankStyle = index === 0 ? 'background: linear-gradient(135deg, #ffd700, #f8e14b); color: #8a6d00;' : 
                              index === 1 ? 'background: linear-gradient(135deg, #e0e0e0, #f5f5f5); color: #555;' : 
                              index === 2 ? 'background: linear-gradient(135deg, #cd7f32, #e6a869); color: #5e3a15;' : 
                              'background: #fff; border: 1px solid #ddd;';
            const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}位`;

            // ボタン表示の出し分けロジック（妥協なし！）
            let buttonHtml = '';
            if (r.id === ui.currentUser?.id) {
                buttonHtml = '<span style="font-size: 12px; opacity: 0.7;">自身</span>';
            } else if (friendIds.includes(r.id)) {
                buttonHtml = '<span style="font-size: 12px; color: #4caf50; font-weight: bold;">フレンド</span>';
            } else if (!r.reqRanking) {
                buttonHtml = '<span style="font-size: 12px; opacity: 0.7;">申請不可</span>';
            } else {
                buttonHtml = `<button class="btn-req-from-rank" data-id="${r.id}" style="padding: 6px 12px; background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.2); border-radius: 4px; cursor: pointer; font-weight: bold; color: inherit;">申請</button>`;
            }

            // 【完全新規追加】詳細パネルのロジック
            // 仕様書通り、IDは「自分」か「フレンド」のみ表示。それ以外は非公開。
            const canSeeId = (r.id === ui.currentUser?.id || friendIds.includes(r.id));
            const displayId = canSeeId ? r.id : '<span style="color:#999; font-size:12px;">非公開 (フレンドのみ)</span>';

            return `
                <div style="${rankStyle} padding: 12px; margin-bottom: 8px; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px; font-weight: bold; width: 40px; text-align: center;">${rankIcon}</span>
                            <div>
                                <strong style="font-size: 16px;">${r.nickname}</strong>
                                <div style="font-size: 12px; opacity: 0.8;">🏆 ${r.trophies} トロフィー (Lv.${r.level})</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; align-items: center;">
                            ${buttonHtml}
                            <button class="btn-toggle-rank-details" data-id="${r.id}" style="padding: 5px 10px; background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.2); border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; color: inherit;">詳細 ▾</button>
                        </div>
                    </div>

                    <div id="rank-details-${r.id}" style="display: none; margin-top: 10px; padding: 12px; background: rgba(255,255,255,0.7); border-radius: 8px; font-size: 14px; border-left: 4px solid #ff9800;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd; color: #333;">
                                <span style="color: gray; font-size: 11px;">🆔 プレイヤーID</span><br>
                                <span style="font-family: monospace; font-size: 14px; font-weight: bold;">${displayId}</span>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd; color: #333;">
                                <span style="color: gray; font-size: 11px;">⭐ レベル</span><br>
                                <span style="font-size: 14px; font-weight: bold;">Lv. ${r.level}</span>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd; color: #333;">
                                <span style="color: gray; font-size: 11px;">🏆 トロフィー</span><br>
                                <span style="font-size: 14px; font-weight: bold;">${r.trophies}</span>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd; color: #333;">
                                <span style="color: gray; font-size: 11px;">👑 総合順位</span><br>
                                <span style="font-size: 14px; font-weight: bold;">${index + 1}位</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const finalHtml = `<div style="max-height: 50vh; overflow-y: auto; padding: 5px;">${contentHtml}</div>`;
        ui.openModal("👑 総合順位", finalHtml);

        this.bindEvents();
    },

    bindEvents: function() {
        const ui = this.parentUI;

        // 申請ボタンのアニメーション＆送信処理（既存機能を完全維持）
        document.querySelectorAll('.btn-req-from-rank').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-id');
                if(typeof Network !== 'undefined' && Network.sendFriendRequest) {
                    Network.sendFriendRequest(targetId);

                    if(typeof ui.showNotification === 'function') {
                        ui.showNotification('ランキングから申請を送信しました', 'success');
                    }

                    e.target.disabled = true;
                    e.target.textContent = '送信済';
                    e.target.style.opacity = '0.5';
                }
            });
        });

        // 【追加】詳細パネルの開閉処理
        document.querySelectorAll('.btn-toggle-rank-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-id');
                const detailDiv = document.getElementById(`rank-details-${targetId}`);
                const isHidden = detailDiv.style.display === 'none';
                detailDiv.style.display = isHidden ? 'block' : 'none';
                e.target.textContent = isHidden ? '閉じる ▴' : '詳細 ▾';
            });
        });
    }
};