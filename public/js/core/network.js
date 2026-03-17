// public/js/core/network.js

const socket = io(); 

const Network = {
    // ================= 認証・設定系 =================
    login: function(nickname, pin) {
        console.log(`📤 サーバーへ【ログイン】を送信します: ${nickname}`);
        socket.emit('login', { nickname, pin });
    },

    register: function(nickname, pin, settings) {
        console.log(`📤 サーバーへ【新規登録】を送信します: ${nickname}`);
        socket.emit('register', { nickname, pin, settings });
    },

    updateSettings: function(settings) {
        console.log(`📤 サーバーへ【設定更新】を送信します`, settings);
        socket.emit('updateSettings', settings);
    },

    // ================= フレンド系 =================
    fetchFriendsData: function() {
        console.log(`📤 サーバーへ【フレンドデータ取得】を要求します`);
        socket.emit('getFriendsData');
    },

    sendFriendRequest: function(targetId) {
        console.log(`📤 サーバーへ【フレンド申請】を送信します: 宛先ID ${targetId}`);
        socket.emit('sendFriendRequest', targetId);
    },

    respondFriendRequest: function(targetId, accept) {
        console.log(`📤 サーバーへ【申請応答】を送信します: 対象ID ${targetId}, 承認: ${accept}`);
        socket.emit('respondFriendRequest', { targetId, accept });
    },

    // ================= ✉️ メール系 =================
    fetchMailData: function() {
        console.log(`📤 サーバーへ【メールデータ取得】を要求します`);
        socket.emit('getMailData');
    },

    sendMail: function(targetId, content, item) {
        console.log(`📤 サーバーへ【メール送信】を実行します: 宛先ID ${targetId}`);
        socket.emit('sendMail', { targetId, content, item });
    },

    markMailAsRead: function(mailId) {
        socket.emit('markMailAsRead', mailId);
    },

    // ================= 🏆 ランキング系 =================
    fetchRanking: function() {
        console.log(`📤 サーバーへ【ランキングデータ取得】を要求します`);
        socket.emit('getRanking');
    },

    // ================= 📜 バトル履歴系 =================
    fetchHistoryData: function() {
        console.log(`📤 サーバーへ【バトル履歴データ取得】を要求します`);
        socket.emit('getHistoryData');
    },

    // ================= 🎁 報酬系 =================
    claimLoginBonus: function() {
        console.log(`📤 サーバーへ【ログインボーナス受取】を要求します`);
        socket.emit('claimLoginBonus');
    },

    claimRoadmapReward: function(targetTrophies) {
        console.log(`📤 サーバーへ【ロードマップ報酬受取】を要求します: 目標 ${targetTrophies}`);
        socket.emit('claimRoadmapReward', targetTrophies);
    },

    // ================= 🎰 ガチャ系 =================
    drawGacha: function(times = 1) { // ←引数 times を追加！
        console.log(`📤 サーバーへ【ガチャを引く】を要求します (回数: ${times})`);
        socket.emit('drawGacha', { times: times }); // ← { times: times } を送る！
    },

    // ================= 🎒 バックパック（装備変更）系 =================
    changeEquipment: function(characterId, skinId) {
        console.log(`📤 サーバーへ【装備変更】を送信します: キャラ=${characterId}, スキン=${skinId}`);
        socket.emit('changeEquipment', { character: characterId, skin: skinId });
    },

    // ================= 🛒 ショップ（購入）系 =================
    buyCharacter: function(charId) {
        console.log(`📤 サーバーへ【キャラ購入】を送信します: ${charId}`);
        socket.emit('buyCharacter', charId);
    },

    upgradeCharacter: function(charId) {
        console.log(`📤 サーバーへ【キャラのレベルアップ】を送信します: ${charId}`);
        if (window.socket) {
            window.socket.emit('upgradeCharacter', charId);
        }
    },

    buySkin: function(charId, skinId, price) {
        console.log(`📤 サーバーへ【スキン購入】を送信します: ${charId} / ${skinId} (${price}コイン)`);
        socket.emit('buySkin', { charId, skinId, price });
    },

    buyItem: function(itemId, price) {
        if (window.socket) {
            window.socket.emit('buyItem', { itemId: itemId, price: price });
        } else {
            console.error("❌ サーバーに接続されていません。");
            if (window.UI && window.UI.showNotification) {
                window.UI.showNotification("通信エラーが発生しました", "error");
            }
        }
    },

    // ================= ⚙️ アカウント設定系 =================
    deleteAccount: function() {
        console.log(`📤 サーバーへ【アカウント削除】を送信します`);
        socket.emit('deleteAccount');
    }
};

// ================= サーバーからの受信イベント =================

socket.on('authSuccess', (userData) => {
    console.log(`📥 サーバーから【成功】の返事が来ました！`, userData);

    localStorage.setItem('userId', userData.id);

    const coinEl = document.getElementById('ui-coins');
    const trophyEl = document.getElementById('ui-trophies');
    const ticketEl = document.getElementById('ui-tickets');
    const nicknameEl = document.getElementById('ui-nickname');
    const idEl = document.getElementById('ui-id');
    const levelEl = document.getElementById('ui-level');

    if (coinEl) coinEl.textContent = userData.coins;
    if (trophyEl) trophyEl.textContent = userData.trophies;
    if (ticketEl) ticketEl.textContent = userData.gachaTickets;
    if (nicknameEl) nicknameEl.textContent = userData.nickname;
    if (idEl) idEl.textContent = userData.id;
    if (levelEl) levelEl.textContent = userData.level;

    if (typeof UI !== 'undefined') {
        UI.currentUser = userData; 
        if (typeof UI.onAuthSuccess === 'function') UI.onAuthSuccess(userData);

        // 🌟 【完全修正】サーバーの 'characterLevels' から正しいレベルを読み込んで反映する！
        if (Array.isArray(userData.characters) && typeof ShopUI !== 'undefined' && ShopUI.masterCharacters) {
            userData.characters.forEach(charData => {
                let charId = typeof charData === 'string' ? charData : (charData.id || charData.characterId);
                let master = ShopUI.masterCharacters.find(m => m.id === charId);

                if (master) {
                    master.isOwned = true;
                    // userData.characterLevels の引き出しからレベルを取り出す！無ければLv1
                    if (userData.characterLevels && userData.characterLevels[charId]) {
                        master.level = userData.characterLevels[charId];
                    } else {
                        master.level = 1;
                    }
                }
            });
        }

        Network.fetchFriendsData();
        Network.fetchMailData();
        Network.fetchRanking(); 
        Network.fetchHistoryData(); 
    }
});

socket.on('buySuccess', (result) => {
    console.log(`📥 サーバーから【購入/強化成功】の返事が来ました！`, result);

    const targetTab = result.type || 'character'; 
    const isDetailsOpen = document.getElementById("character-3d-container") !== null;

    let updatedChar = null;

    if (window.currentViewedCharacter) {
        updatedChar = { ...window.currentViewedCharacter };
        if (updatedChar.isOwned || updatedChar.level > 0) {
            updatedChar.level = (updatedChar.level || 1) + 1;
            updatedChar.hp = Math.floor((updatedChar.hp || 100) * 1.05);
            updatedChar.speed = Math.floor((updatedChar.speed || 10) * 1.05);
            updatedChar.power = Math.floor((updatedChar.power || 10) * 1.05);
        } else {
            updatedChar.isOwned = true;
            updatedChar.level = 1;
        }
        window.currentViewedCharacter = updatedChar; 
    }

    if (updatedChar) {
        if (typeof ShopUI !== 'undefined' && Array.isArray(ShopUI.masterCharacters)) {
            let targetMaster = ShopUI.masterCharacters.find(c => c.id === updatedChar.id || c.name === updatedChar.name);
            if (targetMaster) {
                targetMaster.level = updatedChar.level;
                targetMaster.hp = updatedChar.hp;
                targetMaster.speed = updatedChar.speed;
                targetMaster.power = updatedChar.power;
                targetMaster.isOwned = true;
            }
        }

        // 🌟 【復旧】レベルを消さずに、ちゃんとセーブデータに保存する元のコード！
        if (typeof UI !== 'undefined' && UI.currentUser) {
            let charId = updatedChar.id || "char_unknown";
            if (!UI.currentUser.characters) UI.currentUser.characters = [];

            if (Array.isArray(UI.currentUser.characters)) {
                let strIndex = UI.currentUser.characters.indexOf(charId);
                if (strIndex !== -1) {
                    UI.currentUser.characters[strIndex] = { id: charId, level: updatedChar.level };
                } else {
                    let target = UI.currentUser.characters.find(c => typeof c === 'object' && (c.id === charId || c.characterId === charId));
                    if (target) {
                        target.level = updatedChar.level;
                    } else {
                        UI.currentUser.characters.push({ id: charId, level: updatedChar.level });
                    }
                }
            }
        }
    }

    if (isDetailsOpen && updatedChar && typeof ShopUI !== 'undefined') {
        const encodedData = encodeURIComponent(JSON.stringify(updatedChar));
        ShopUI.renderCharacterDetails(encodedData);
    } else {
        if (typeof ShopUI !== 'undefined' && typeof ShopUI.renderShopTab === 'function') {
            ShopUI.renderShopTab(targetTab);
        } else if (typeof UI !== 'undefined' && typeof UI.renderShopTab === 'function') {
            UI.renderShopTab(targetTab);
        }
    }
});

socket.on('upgradeSuccess', (result) => {
    socket._callbacks['$buySuccess'][0](result); 
});

socket.on('authError', (errorMessage) => {
    console.log(`📥 サーバーから【エラー】の返事が来ました: ${errorMessage}`);
    if (typeof UI !== 'undefined' && typeof UI.onAuthError === 'function') {
        UI.onAuthError(errorMessage);
    } else {
        alert(errorMessage);
    }
});

socket.on('friendsDataUpdated', (friendsData) => {
    console.log(`📥 サーバーから【最新フレンドデータ】を受信しました`);
    if (typeof UI !== 'undefined' && typeof UI.onFriendsDataUpdated === 'function') {
        UI.onFriendsDataUpdated(friendsData);
    }
});

socket.on('friendRequestResult', (result) => {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
        UI.showNotification(result.message, result.success ? 'success' : 'error');
    } else {
        alert(result.message); 
    }
});

socket.on('mailDataUpdated', (mailData) => {
    console.log(`📥 サーバーから【最新メールデータ】を受信しました`);
    if (typeof UI !== 'undefined' && typeof UI.onMailDataUpdated === 'function') {
        UI.onMailDataUpdated(mailData);
    }
});

socket.on('mailSendResult', (result) => {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
        UI.showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success && UI.isMailModalOpen) {
            UI.renderMailModal(); 
        }
    }
});

socket.on('rankingDataUpdated', (rankingData) => {
    console.log(`📥 サーバーから【ランキングデータ】を受信しました`);
    if (typeof UI !== 'undefined' && typeof UI.onRankingDataUpdated === 'function') {
        UI.onRankingDataUpdated(rankingData);
    }
});

socket.on('notification', (message) => {
    console.log(`🔔 通知: ${message}`);
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
        UI.showNotification(message, 'info');
    } else {
        alert(message);
    }
});

socket.on('historyDataUpdated', (historyData) => {
    console.log(`📥 サーバーから【最新バトル履歴データ】を受信しました`, historyData);
    if (typeof UI !== 'undefined' && typeof UI.onHistoryDataUpdated === 'function') {
        UI.onHistoryDataUpdated(historyData);
    }
});

socket.on('rewardClaimed', (result) => {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
        UI.showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success && UI.currentRewardTab) {
            UI.renderRewardsModal(); 
        }
    }
});

socket.on('gachaResult', (result) => {
    console.log(`📥 サーバーから【ガチャ結果】を受信しました`, result);
    // 修正後： GachaUI に結果を渡す！
    if (typeof window.GachaUI !== 'undefined') {
        window.GachaUI.onGachaResult(result);
    }
});

// ================= 🎮 ゲーム進行・マルチプレイ連携系 =================
// 🚨 追加: サーバーからプレイヤーの切断(逃亡)通知を受け取り、フリーズ防止処理を発動する

// ※サーバー側のイベント名が 'playerDisconnected' の場合
socket.on('playerDisconnected', (data) => {
    // データがオブジェクト型( {id: "..."} )でも、文字列型( "..." )でも確実に対応する妥協なしの設計
    const disconnectedId = typeof data === 'object' ? (data.id || data.userId) : data;
    console.log(`🔌 [Network] プレイヤー ${disconnectedId} の切断イベントを受信しました。即死判定を実行します。`);

    // ゲーム中であり、logic.js が動いている場合のみ処理を実行
    if (typeof window.gameManager !== 'undefined' && window.gameManager.logic) {
        if (typeof window.gameManager.logic._handlePlayerDisconnect === 'function') {
            window.gameManager.logic._handlePlayerDisconnect(disconnectedId);
        }
    }
});

// 🛡️ 妥協なしの保険: もしサーバー側の退出イベント名が 'playerLeft' だった場合も絶対に逃がさない
socket.on('playerLeft', (data) => {
    const disconnectedId = typeof data === 'object' ? (data.id || data.userId) : data;
    console.log(`🔌 [Network] プレイヤー ${disconnectedId} の退出(playerLeft)を受信しました。即死判定を実行します。`);

    if (typeof window.gameManager !== 'undefined' && window.gameManager.logic) {
        if (typeof window.gameManager.logic._handlePlayerDisconnect === 'function') {
            window.gameManager.logic._handlePlayerDisconnect(disconnectedId);
        }
    }
});

window.Network = Network;
window.socket = socket;