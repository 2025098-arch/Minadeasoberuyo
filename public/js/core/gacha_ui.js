// public/js/core/gacha_ui.js

window.GachaUI = {
    uiInstance: null,
    isAnimating: false,

    open: function(uiObj) {
        this.uiInstance = uiObj;
        this.renderGachaModal();
    },

    renderGachaModal: function() {
        const user = this.uiInstance ? this.uiInstance.currentUser : null;
        const tickets = user?.gachaTickets || 0;

        const html = `
            <div class="modal-body-container" style="text-align: center; padding: 20px; overflow: hidden; position: relative;">
                <div id="gacha-animation-area" style="position: relative; width: 100%; height: 250px; background: radial-gradient(circle, #fff 0%, #e1f5fe 70%); border: 4px solid #ffeb3b; border-radius: 15px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.2); overflow: hidden;">
                    <div id="gacha-machine" style="font-size: 80px; transition: transform 0.3s; z-index: 2;">🎰</div>
                    <div id="gacha-effect-layer" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 1;"></div>
                </div>

                <div style="background: #fff9c4; border: 2px solid #fbc02d; padding: 10px 20px; border-radius: 30px; display: inline-block; margin-bottom: 20px; font-weight: bold; font-size: 18px; color: #f57f17; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    🎫 所持ガチャ券: <span id="gacha-ticket-count" style="font-size: 22px;">${tickets}</span> 枚
                </div>

                <div id="gacha-buttons" style="display: flex; gap: 15px; justify-content: center;">
                    <button id="btn-gacha-1" style="padding: 15px 30px; font-size: 18px; background: linear-gradient(135deg, #42a5f5, #1e88e5); color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(33,150,243,0.4); transition: transform 0.1s; display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
                        <span>1回引く</span>
                        <span style="font-size: 12px; font-weight: normal;">🎫 1枚消費</span>
                    </button>
                    <button id="btn-gacha-10" style="padding: 15px 30px; font-size: 18px; background: linear-gradient(135deg, #ec407a, #d81b60); color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(233,30,99,0.4); transition: transform 0.1s; display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
                        <span>10連ガチャ</span>
                        <span style="font-size: 12px; font-weight: normal;">🎫 10枚消費</span>
                    </button>
                </div>

<div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 8px; font-size: 12px; color: #666; text-align: left;">
    <strong>✨ 提供割合 ✨</strong><br>
    50%: 30コイン / 30%: 50コイン / 14%: 100コイン / 5%: 200コイン / 1%: 激レアスキン「ゴールデン」
</div>

                <div id="gacha-result-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.95); z-index: 10; flex-direction: column; justify-content: center; align-items: center; backdrop-filter: blur(3px);">
                    <h2 style="margin: 0 0 15px 0; color: #d81b60; font-size: 28px; text-shadow: 1px 1px 0 #fff;">結果発表！</h2>
                    <div id="gacha-result-items" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-height: 60%; overflow-y: auto; padding: 10px; width: 90%;"></div>
                    <button id="btn-gacha-close-result" style="margin-top: 20px; padding: 10px 30px; background: #333; color: #fff; border: none; border-radius: 20px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">閉じる</button>
                </div>
            </div>

            <style>
                @keyframes gachaVibrate {
                    0% { transform: translate(2px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-2deg); }
                    20% { transform: translate(-3px, 0px) rotate(2deg); }
                    30% { transform: translate(0px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(2deg); }
                    50% { transform: translate(-1px, 2px) rotate(-2deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(2px, 1px) rotate(-2deg); }
                    80% { transform: translate(-1px, -1px) rotate(2deg); }
                    90% { transform: translate(2px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-2deg); }
                }
                @keyframes itemPop {
                    0% { transform: scale(0); opacity: 0; }
                    70% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .gacha-item-card {
                    background: #fff; border: 2px solid #ffd54f; border-radius: 10px; padding: 10px; width: 70px; height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
                    animation: itemPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0;
                }
                .gacha-item-card.rare {
                    border-color: #e91e63; background: #fff0f5; box-shadow: 0 0 15px rgba(233,30,99,0.5);
                }
            </style>
        `;

        if (this.uiInstance && this.uiInstance.openModal) {
            this.uiInstance.openModal("🎰 プレミアムガチャ", html);
        }

        // イベント設定
        document.getElementById('btn-gacha-1')?.addEventListener('click', () => this.playGacha(1));
        document.getElementById('btn-gacha-10')?.addEventListener('click', () => this.playGacha(10));

        document.getElementById('btn-gacha-close-result')?.addEventListener('click', () => {
            document.getElementById('gacha-result-overlay').style.display = 'none';
            document.getElementById('gacha-result-items').innerHTML = '';
            this.isAnimating = false;
            this.updateButtonState();
        });

        this.updateButtonState();
    },

    updateButtonState: function() {
        if (this.isAnimating) return;
        const user = this.uiInstance ? this.uiInstance.currentUser : null;
        const tickets = user?.gachaTickets || 0;

        const btn1 = document.getElementById('btn-gacha-1');
        const btn10 = document.getElementById('btn-gacha-10');
        const countSpan = document.getElementById('gacha-ticket-count');

        if (countSpan) countSpan.innerText = tickets;

        if (btn1) {
            btn1.disabled = tickets < 1;
            btn1.style.filter = tickets < 1 ? 'grayscale(100%)' : 'none';
            btn1.style.cursor = tickets < 1 ? 'not-allowed' : 'pointer';
        }
        if (btn10) {
            btn10.disabled = tickets < 10;
            btn10.style.filter = tickets < 10 ? 'grayscale(100%)' : 'none';
            btn10.style.cursor = tickets < 10 ? 'not-allowed' : 'pointer';
        }
    },

    playGacha: function(times) {
        if (this.isAnimating) return;
        const user = this.uiInstance ? this.uiInstance.currentUser : null;
        const tickets = user?.gachaTickets || 0;

        if (tickets < times) {
            if (this.uiInstance) this.uiInstance.showNotification('ガチャ券が足りません！', 'error');
            return;
        }

        this.isAnimating = true;
        document.getElementById('btn-gacha-1').disabled = true;
        document.getElementById('btn-gacha-10').disabled = true;

        // ガチャ本体が激しく揺れる演出
        const machine = document.getElementById('gacha-machine');
        machine.style.animation = 'gachaVibrate 0.1s infinite';
        machine.innerText = '🌀';

        // サーバーへ「何回引くか」を送信
        if (window.Network && window.Network.socket) {
            window.Network.socket.emit('drawGacha', { times: times });
        } else if (window.socket) {
            window.socket.emit('drawGacha', { times: times });
        }
    },

    // サーバーから結果を受け取った時の処理
    onGachaResult: function(resultData) {
        if (!resultData.success) {
            if (this.uiInstance) this.uiInstance.showNotification(resultData.message, 'error');
            this.isAnimating = false;
            this.updateButtonState();
            return;
        }

        const machine = document.getElementById('gacha-machine');

        // ガチャを回した後の「タメ」演出（0.8秒待つ）
        setTimeout(() => {
            machine.style.animation = 'none';
            machine.style.transform = 'scale(1.3)';
            machine.innerText = '🎉';

            // さらに0.3秒後に結果画面をバーン！と出す
            setTimeout(() => {
                machine.style.transform = 'scale(1)';
                machine.innerText = '🎰';

                const overlay = document.getElementById('gacha-result-overlay');
                const itemsContainer = document.getElementById('gacha-result-items');
                itemsContainer.innerHTML = '';
                overlay.style.display = 'flex';

                // サーバーから送られてきた結果の配列をカードとして表示
                const results = Array.isArray(resultData.results) ? resultData.results : [resultData];

                results.forEach((res, index) => {
                    const isRare = res.rewardType === 'skin';
                    const icon = res.rewardType === 'coins' ? '🪙' : '✨';
                    const valText = res.rewardType === 'coins' ? `${res.rewardValue}` : '金スキン';

                    const card = document.createElement('div');
                    card.className = `gacha-item-card ${isRare ? 'rare' : ''}`;
                    // 10連の時は、0.1秒ごとに順番にカードが飛び出してくる魔法の設定！
                    card.style.animationDelay = `${index * 0.1}s`; 

                    card.innerHTML = `
                        <div style="font-size: 24px;">${icon}</div>
                        <div style="font-size: 14px; font-weight: bold; margin-top: 5px; color: ${isRare ? '#e91e63' : '#333'};">${valText}</div>
                    `;
                    itemsContainer.appendChild(card);
                });
            }, 300);
        }, 800);
    }
};