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
        }, // ← ⚠️ここ！絶対にカンマを追加してください！

// ================= 📜 バトル履歴系 =================
    fetchHistoryData: function() {
        console.log(`📤 サーバーへ【バトル履歴データ取得】を要求します`);
        socket.emit('getHistoryData');
    }, // ← ⚠️カンマを忘れずに！

    // ================= 🎁 報酬系 =================
    claimLoginBonus: function() {
        console.log(`📤 サーバーへ【ログインボーナス受取】を要求します`);
        socket.emit('claimLoginBonus');
    },

claimRoadmapReward: function(targetTrophies) {
        console.log(`📤 サーバーへ【ロードマップ報酬受取】を要求します: 目標 ${targetTrophies}`);
        socket.emit('claimRoadmapReward', targetTrophies);
    }, // ← ⚠️カンマを忘れずに！

    // ================= 🎰 ガチャ系 =================
    drawGacha: function() {
        console.log(`📤 サーバーへ【ガチャを引く】を要求します`);
        socket.emit('drawGacha');
    }
}; // ← Networkオブジェクトの終わりのカッコ

// ================= サーバーからの受信イベント =================

socket.on('authSuccess', (userData) => {
    console.log(`📥 サーバーから【成功】の返事が来ました！`, userData);
    if (typeof UI !== 'undefined') {
        UI.onAuthSuccess(userData);
        // ログイン成功時に必要な全データを取得
        Network.fetchFriendsData();
        Network.fetchMailData();
        Network.fetchRanking(); 
        Network.fetchHistoryData(); // ★ここに追加！ログイン時に履歴もロード！
    }
});

socket.on('authError', (errorMessage) => {
    console.log(`📥 サーバーから【エラー】の返事が来ました: ${errorMessage}`);
    if (typeof UI !== 'undefined') {
        UI.onAuthError(errorMessage);
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

// ✉️ メールデータ受信
socket.on('mailDataUpdated', (mailData) => {
    console.log(`📥 サーバーから【最新メールデータ】を受信しました`);
    if (typeof UI !== 'undefined' && typeof UI.onMailDataUpdated === 'function') {
        UI.onMailDataUpdated(mailData);
    }
});

// ✉️ メール送信結果受信
socket.on('mailSendResult', (result) => {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
        UI.showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success && UI.isMailModalOpen) {
            UI.renderMailModal(); 
        }
    }
});

// 🏆 ランキングデータ受信
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
// 📜 バトル履歴データ受信
socket.on('historyDataUpdated', (historyData) => {
    console.log(`📥 サーバーから【最新バトル履歴データ】を受信しました`, historyData);
    if (typeof UI !== 'undefined' && typeof UI.onHistoryDataUpdated === 'function') {
        UI.onHistoryDataUpdated(historyData);
    }
});
// 🎁 報酬獲得結果の受信
socket.on('rewardClaimed', (result) => {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
        UI.showNotification(result.message, result.success ? 'success' : 'error');
        // 成功したら画面を再描画してボタンを「受取済」に変える
        if (result.success && UI.currentRewardTab) {
            UI.renderRewardsModal(); 
        }
    }
});
// 🎰 ガチャ結果受信
socket.on('gachaResult', (result) => {
    console.log(`📥 サーバーから【ガチャ結果】を受信しました`, result);
    if (typeof UI !== 'undefined' && typeof UI.onGachaResult === 'function') {
        UI.onGachaResult(result);
    }
});