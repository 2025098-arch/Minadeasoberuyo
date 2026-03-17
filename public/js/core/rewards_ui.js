// public/js/core/rewards_ui.js

window.RewardsUI = {
    parentUI: null,
    currentTab: 'login',

    // ロードマップの設定（ここで目標と報酬を管理します。ui.jsのバッジ計算でも使います）
    roadMap: [
        { target: 10, reward: '50コイン' },
        { target: 30, reward: 'ガチャ券×10' },
        { target: 50, reward: '100コイン、レベルアップ' },
        { target: 70, reward: '50コイン、ガチャ券×5' },
        { target: 100, reward: '100コイン、ガチャ券×5、レベルアップ' },
        // ▼ ここから延長分 ▼
        { target: 150, reward: '200コイン、ガチャ券×10' },
        { target: 200, reward: '300コイン、レベルアップ' },
        { target: 300, reward: '500コイン、ガチャ券×10、レベルアップ' },
        { target: 500, reward: '1000コイン、ガチャ券×20、レベルアップ' },
        { target: 1000, reward: '3000コイン、ガチャ券×50、レベルアップ' }
    ],

    open: function(uiInstance) {
        this.parentUI = uiInstance;
        this.render();
    },

    render: function() {
        const ui = this.parentUI;
        if (!ui.currentUser) return;

        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button id="rtab-login" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentTab==='login'?'#4caf50':'#eee'}; color: ${this.currentTab==='login'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">📅 ログイン</button>
                <button id="rtab-road" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentTab==='road'?'#4caf50':'#eee'}; color: ${this.currentTab==='road'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">🏆 ロードマップ</button>
            </div>
        `;

        let contentHtml = '';
        if (this.currentTab === 'login') {
            const streak = ui.currentUser.loginStreak || 1;
            const canClaim = ui.currentUser.canClaimLoginBonus;

            // クライアント側の表示用
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
            const currentTrophies = ui.currentUser.trophies || 0;
            const claimedList = ui.currentUser.claimedRoadmapRewards || [];

            contentHtml = `<div style="padding: 10px;">
                <div style="margin-bottom: 15px; text-align: center; font-size: 18px;">現在のトロフィー: <strong>🏆 ${currentTrophies}</strong></div>
                ${this.roadMap.map(r => {
                    const isClaimed = claimedList.includes(r.target);
                    const canClaim = currentTrophies >= r.target && !isClaimed;
                    return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin-bottom: 10px; background: ${isClaimed ? '#f5f5f5' : '#fff'}; border: 1px solid ${isClaimed ? '#ddd' : (canClaim ? '#ff9800' : '#2196f3')}; border-radius: 8px; box-shadow: ${canClaim ? '0 2px 8px rgba(255,152,0,0.3)' : 'none'};">
                        <div>
                            <div style="font-weight: bold; color: ${isClaimed ? '#999' : '#000'}; font-size: 16px;">🏆 ${r.target} 到達</div>
                            <div style="font-size: 14px; color: ${isClaimed ? '#999' : '#d84315'}; margin-top: 5px;">🎁 ${r.reward}</div>
                        </div>
                        <button class="btn-claim-road" data-target="${r.target}" ${isClaimed || currentTrophies < r.target ? 'disabled' : ''} style="padding: 10px 15px; background: ${isClaimed ? '#ccc' : (canClaim ? '#4caf50' : '#e0e0e0')}; color: ${isClaimed ? '#666' : (canClaim ? 'white' : '#999')}; border: none; border-radius: 5px; cursor: ${canClaim ? 'pointer' : 'not-allowed'}; font-weight: bold; min-width: 90px;">
                            ${isClaimed ? '受取済' : (canClaim ? '受け取る' : `あと ${r.target - currentTrophies} 🏆`)}
                        </button>
                    </div>
                `}).join('')}
            </div>`;
        }

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto;">${contentHtml}</div></div>`;
        ui.openModal("🎁 報酬獲得", finalHtml);

        this.bindEvents();
    },

    bindEvents: function() {
        const ui = this.parentUI;

        document.getElementById('rtab-login')?.addEventListener('click', () => { this.currentTab = 'login'; this.render(); });
        document.getElementById('rtab-road')?.addEventListener('click', () => { this.currentTab = 'road'; this.render(); });

        document.getElementById('btn-claim-login')?.addEventListener('click', (e) => {
            if (typeof Network !== 'undefined' && Network.claimLoginBonus) {
                Network.claimLoginBonus();
                e.target.disabled = true; 
                e.target.textContent = '通信中...';
            }
        });

        document.querySelectorAll('.btn-claim-road').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = parseInt(e.target.getAttribute('data-target'), 10);
                if (typeof Network !== 'undefined' && Network.claimRoadmapReward) {
                    Network.claimRoadmapReward(target);
                    e.target.disabled = true; 
                    e.target.textContent = '通信中...';
                }
            });
        });
    }
};