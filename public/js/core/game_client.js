// public/js/core/game_client.js

window.GameRegistry = window.GameRegistry || {};

window.GameClient = {
    currentGame: null,

    startMiniGame: function(gameName, participants) {
        console.log(`🚀 [GameClient] ミニゲーム「${gameName}」を起動します！参加者:`, participants);

        if (gameName === 'game1') {
            window.GameRegistry['game1'] = window.OchirunaGame;
        }

        const homeScreen = document.getElementById('home-screen');
        const modalOverlay = document.getElementById('modal-overlay');
        const gameContainer = document.getElementById('game-container');

        if (homeScreen) homeScreen.style.display = 'none';
        if (modalOverlay) modalOverlay.style.display = 'none';
        if (gameContainer) {
            gameContainer.style.display = 'block';
            gameContainer.innerHTML = '';

            if (gameName === 'game1') {
                // 🌟 【バグ6対応】結果表示用のUIも一緒に作っておく
                gameContainer.innerHTML = `
                    <canvas id="gameCanvas" style="width:100%; height:100%; display:block;"></canvas>
                    <div id="result-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); color:white; justify-content:center; align-items:center; flex-direction:column; z-index:1000;">
                        <h1 id="result-text" style="font-size:3rem; margin-bottom:20px;"></h1>
                        <button onclick="window.location.reload()" style="padding:10px 20px; font-size:1.5rem; cursor:pointer;">ロビーに戻る</button>
                    </div>
                `;
            }
        }

        if (this.currentGame && typeof this.currentGame.stop === 'function') {
            this.currentGame.stop();
        }

        const GameClass = window.GameRegistry[gameName];

        if (GameClass) {
            // 🌟 修正：自分のIDと、参加者リストの中身をコンソールに出力して確認する
            const myId = localStorage.getItem('userId'); 
            console.log("🔍 [ID確認] localStorageから取得した自分のID:", myId);
            console.log("🔍 [ID確認] participants(参加者データ)の中身:", participants);

            // 🌟 コンストラクタに myId を渡す
            this.currentGame = new GameClass('gameCanvas', window.socket, participants, myId);

            // 🔥 【完全連携用・追加】network.js が「gameManager.logic」を探せるように橋渡しをする！妥協なし！
            window.gameManager = window.gameManager || {};
            // OchirunaGameの中にlogicがあればそれを、なければcurrentGame自体をセットする完璧な保険設計
            window.gameManager.logic = this.currentGame.logic || this.currentGame;
            
            if (typeof this.currentGame.start === 'function') {
                this.currentGame.start();
            }
        } else {
            console.warn(`⚠️ 未知のゲーム、または準備中です: ${gameName}`);
            this.showComingSoon();
        }
    },

    showComingSoon: function() {
        const gameContainer = document.getElementById('game-container');
        gameContainer.innerHTML = '<h1 style="color:white; text-align:center; padding-top:20vh;">🚧 準備中 🚧</h1>';
    }
};