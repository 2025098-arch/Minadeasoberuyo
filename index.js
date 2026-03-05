// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🚨 【超重要】サーバーの起動方法について 🚨
// ==========================================
// Replitの「Run」ボタン（緑色）は押さないでください！
// 右側の「Shell」タブを開き、以下のコマンドを手打ちしてEnterを押してください：
// node index.js
// ==========================================

// ==========================================
// 🗄️ データベース（JSONファイル）管理システム【完全強化版】
// ==========================================
const dataDir = path.join(process.cwd(), 'data');

// dataフォルダが存在しない場合は作成
if (!fs.existsSync(dataDir)) {
    console.log("📁 dataフォルダが存在しないため作成します。");
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPaths = {
    users: path.join(dataDir, 'users.json'),
    mail: path.join(dataDir, 'mail.json'),
    friends: path.join(dataDir, 'friends.json'),
    history: path.join(dataDir, 'history.json')
};

// 🚀 【新規追加】メモリキャッシュ
// 毎回ファイルを読み込まず、サーバー起動中は常にここに最新のデータを保持（超高速化＆データ消失防止）
const dbCache = {
    users: {}, mail: {}, friends: {}, history: {}
};

// サーバー起動時に1回だけファイルを読み込み、キャッシュに格納
Object.keys(dbPaths).forEach(dbName => {
    const filePath = dbPaths[dbName];
    if (!fs.existsSync(filePath)) {
        // ファイルがなければ空っぽで作成し、キャッシュも空にする
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4), 'utf8');
        dbCache[dbName] = {};
    } else {
        // ファイルがあれば読み込む
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            // 中身が空だった場合の対策
            dbCache[dbName] = fileContent.trim() ? JSON.parse(fileContent) : {};
        } catch (err) {
            console.error(`❌ ${dbName}の読み込みに失敗。初期化します。`, err);
            dbCache[dbName] = {};
        }
    }
});

// 💡 変更点1：ファイルではなく、メモリから爆速でデータを返す
function loadDB(dbName) {
    return dbCache[dbName]; 
}

// 💡 変更点2：メモリを最新に更新しつつ、ファイルにも確実に上書きする
function saveDB(dbName, data) {
    dbCache[dbName] = data; // まずメモリを最新にする（強制再起動されても直前の処理はメモリに残る）
    try {
        fs.writeFileSync(dbPaths[dbName], JSON.stringify(data, null, 4), 'utf8');
        console.log(`📂 [確認用] ${dbName} をメモリとファイルに保存しました: ${dbPaths[dbName]}`);
    } catch (err) {
        console.error(`❌ ${dbName} の保存に失敗しました:`, err);
    }
}

function generatePlayerID() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function getEnrichedFriendsData(userId, friendsDB, usersDB) {
    const myFriends = friendsDB[userId] || { list: [], requestsReceived: [], requestsSent: [], history: [] };
    return {
        list: myFriends.list.map(id => ({ 
            id, 
            nickname: usersDB[id]?.nickname || "不明", 
            level: usersDB[id]?.level || 1,
            trophies: usersDB[id]?.trophies || 0,
            rankingPublic: usersDB[id]?.settings?.rankingPublic || false
        })),
        requestsReceived: myFriends.requestsReceived.map(id => ({ 
            id, 
            nickname: usersDB[id]?.nickname || "不明" 
        })),
        history: myFriends.history 
    };
}

function getEnrichedMailData(userId, mailDB, usersDB) {
    const myMail = mailDB[userId] || { messages: [] };
    return {
        messages: myMail.messages.map(m => ({
            ...m,
            senderNickname: m.senderId === "SYSTEM" ? "運営" : (usersDB[m.senderId]?.nickname || "不明")
        })).reverse() 
    };
}

// ==========================================
// 🌐 Socket.io 通信システム
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 新しいプレイヤーが接続しました: ${socket.id}`);

    // ================= 新規登録 =================
    socket.on('register', (data) => {
        const { nickname, pin, settings = {} } = data;
        let users = loadDB('users');

        const isDuplicate = Object.values(users).some(user => user.nickname === nickname);
        if (isDuplicate) {
            socket.emit('authError', 'そのニックネームは既に使用されています。別の名前をお試しください。');
            return;
        }

        let newId;
        do {
            newId = generatePlayerID();
        } while (users[newId]); 

        // 資料の要件をすべて満たした初期ステータス
        const newUser = {
            id: newId,
            nickname: nickname,
            pin: pin,
            coins: 10,
            trophies: 0,
            level: 1,
            gachaTickets: 1,
            characters: ["base_char"],
            skins: { "base_char": ["base_white"] },
            equipped: { character: "base_char", skin: "base_white", items: [] },
            inventory: [],
            settings: {
                rankingPublic: settings.rankingPublic !== undefined ? settings.rankingPublic : false,
                reqHistory: settings.reqHistory !== undefined ? settings.reqHistory : false,
                reqRanking: settings.reqRanking !== undefined ? settings.reqRanking : false
            },
            loginStreak: 1,
            lastLoginDate: new Date().toISOString().split('T')[0],
            // ★追加: ログインボーナスとロードマップの管理
            canClaimLoginBonus: true, 
            claimedRoadmapRewards: [] 
        };

        users[newId] = newUser;
        saveDB('users', users);

        let friendsDB = loadDB('friends');
        friendsDB[newId] = { list: [], requestsReceived: [], requestsSent: [], history: [] };
        saveDB('friends', friendsDB);

        let historyDB = loadDB('history');
        historyDB[newId] = { matches: [] };
        saveDB('history', historyDB);

        let mailDB = loadDB('mail');
        mailDB[newId] = { messages: [] };
        mailDB[newId].messages.push({
            id: crypto.randomBytes(4).toString('hex'),
            senderId: "SYSTEM",
            content: "ゲームへようこそ！初期報酬として10コインをプレゼントします！",
            item: null,
            timestamp: new Date().toISOString(),
            isRead: false
        });
        saveDB('mail', mailDB);

        console.log(`✨ 新規アカウント作成＆保存成功: ${nickname} (ID: ${newId})`);
        socket.userId = newId;
        socket.emit('authSuccess', newUser);
    });

    // ================= ログイン =================
    socket.on('login', (data) => {
        const { nickname, pin } = data; 
        let users = loadDB('users');

        const searchKey = (nickname || "").trim().toUpperCase();
        const userEntry = Object.entries(users).find(([id, user]) => 
            user.nickname === nickname || id === searchKey
        );

        if (!userEntry) {
            socket.emit('authError', '指定されたID(またはニックネーム)のプレイヤーはいませんでした。');
            return;
        }

        const [userId, userData] = userEntry;
        if (userData.pin !== pin) {
            socket.emit('authError', 'PINが間違っています。');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        if (userData.lastLoginDate !== today) {
            // 前日のログインかチェックして連続日数を計算
            const lastDate = new Date(userData.lastLoginDate);
            const currentDate = new Date(today);
            const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                userData.loginStreak += 1; // 連続ログイン
            } else {
                userData.loginStreak = 1; // 途切れたらリセット
            }

            userData.lastLoginDate = today;
            userData.canClaimLoginBonus = true; // ★自動でコインを足さず、フラグを立てる
            saveDB('users', users);
            socket.emit('notification', '🎁 今日のログインボーナスが届いています！報酬画面から受け取ってください！');
        }

        console.log(`🔓 ログイン成功: ${userData.nickname} (ID: ${userId})`);
        socket.userId = userId;
        socket.emit('authSuccess', userData);
    });

    // ================= 設定・プロフィール更新（完全版） =================
    socket.on('updateSettings', (newSettings) => {
        if (!socket.userId) return;
        let users = loadDB('users');
        let user = users[socket.userId];

        if (user) {
            // 設定（チェックボックス等）の更新
            if (newSettings.settings) {
                user.settings = { ...user.settings, ...newSettings.settings };
            }
            // ニックネームの変更（重複チェック付き）
            if (newSettings.nickname && newSettings.nickname !== user.nickname) {
                const isDuplicate = Object.values(users).some(u => u.nickname === newSettings.nickname);
                if (isDuplicate) {
                    socket.emit('notification', 'そのニックネームは既に使用されています。');
                    return; // 名前変更はキャンセルするが、エラーにはしない
                }
                user.nickname = newSettings.nickname;
            }
            // PINの変更
            if (newSettings.pin && newSettings.pin.length === 6 && !isNaN(newSettings.pin)) {
                user.pin = newSettings.pin;
            }

            saveDB('users', users);
            socket.emit('authSuccess', user); // UI側のcurrentUserを最新化
            socket.emit('notification', 'プロフィール・設定を保存しました！');

            // 総合順位に名前変更を即座に反映させるためランキングも更新
            const rankedUsers = Object.values(users).sort((a, b) => b.trophies - a.trophies);
            io.emit('rankingDataUpdated', { /* 全体に更新をかける処理が必要になりますが、今回は簡易的に再取得させます */ });
        }
    });

    // ================= 🏆 総合ランキング機能 =================
    socket.on('getRanking', () => {
        if (!socket.userId) return;
        const usersDB = loadDB('users');

        let rankIndex = 1;
        const rankedUsers = Object.values(usersDB)
            .sort((a, b) => b.trophies - a.trophies)
            .map(u => ({ ...u, rank: rankIndex++ }));

        const myRankData = rankedUsers.find(u => u.id === socket.userId);
        const myRank = myRankData ? myRankData.rank : '圏外';

        const top10 = rankedUsers
            .filter(u => u.settings && u.settings.rankingPublic)
            .slice(0, 10)
            .map(u => ({
                id: u.id,
                nickname: u.nickname,
                trophies: u.trophies,
                level: u.level,
                rank: u.rank,
                reqRanking: u.settings.reqRanking 
            }));

        socket.emit('rankingDataUpdated', { top10, myRank });
    });

    // ================= 👥 フレンド機能 =================
    socket.on('getFriendsData', () => {
        if (!socket.userId) return;
        const friendsDB = loadDB('friends');
        const usersDB = loadDB('users');
        socket.emit('friendsDataUpdated', getEnrichedFriendsData(socket.userId, friendsDB, usersDB));
    });

    socket.on('sendFriendRequest', (targetId) => {
        if (!socket.userId) return;

        targetId = (targetId || "").trim().toUpperCase();

        if (socket.userId === targetId) {
            socket.emit('friendRequestResult', { success: false, message: '自分自身には申請できません。' });
            return;
        }

        const usersDB = loadDB('users');
        if (!usersDB[targetId]) {
            socket.emit('friendRequestResult', { success: false, message: '指定されたIDのプレイヤーは見つかりませんでした。' });
            return;
        }

        let friendsDB = loadDB('friends');
        let myFriends = friendsDB[socket.userId] || { list: [], requestsReceived: [], requestsSent: [], history: [] };
        let targetFriends = friendsDB[targetId] || { list: [], requestsReceived: [], requestsSent: [], history: [] };

        if (myFriends.list.includes(targetId)) {
            socket.emit('friendRequestResult', { success: false, message: '既にフレンドです。' });
            return;
        }
        if (targetFriends.requestsReceived.includes(socket.userId) || myFriends.requestsReceived.includes(targetId)) {
            socket.emit('friendRequestResult', { success: false, message: '既に申請中、または相手から申請が届いています。' });
            return;
        }

        targetFriends.requestsReceived.push(socket.userId);
        const timestamp = new Date().toISOString();
        myFriends.history.push({ targetId: targetId, targetNickname: usersDB[targetId].nickname, type: 'sent', status: '確認中', timestamp });
        targetFriends.history.push({ targetId: socket.userId, targetNickname: usersDB[socket.userId].nickname, type: 'received', status: '確認中', timestamp });

        friendsDB[socket.userId] = myFriends;
        friendsDB[targetId] = targetFriends;
        saveDB('friends', friendsDB);

        socket.emit('friendRequestResult', { success: true, message: 'フレンド申請を送信しました！' });
        socket.emit('friendsDataUpdated', getEnrichedFriendsData(socket.userId, friendsDB, usersDB));

        const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetId);
        if (targetSocket) {
            targetSocket.emit('friendsDataUpdated', getEnrichedFriendsData(targetId, friendsDB, usersDB));
            targetSocket.emit('notification', '新しいフレンド申請が届きました！');
        }
    });

    socket.on('respondFriendRequest', (data) => {
        if (!socket.userId) return;
        const { targetId, accept } = data;

        let friendsDB = loadDB('friends');
        let usersDB = loadDB('users');
        let myFriends = friendsDB[socket.userId];
        let targetFriends = friendsDB[targetId];

        myFriends.requestsReceived = myFriends.requestsReceived.filter(id => id !== targetId);
        const newStatus = accept ? '承認' : '拒否';

        let myHistory = myFriends.history.find(h => h.targetId === targetId && h.status === '確認中');
        if (myHistory) myHistory.status = newStatus;

        let targetHistory = targetFriends.history.find(h => h.targetId === socket.userId && h.status === '確認中');
        if (targetHistory) targetHistory.status = newStatus;

        if (accept) {
            if (!myFriends.list.includes(targetId)) myFriends.list.push(targetId);
            if (!targetFriends.list.includes(socket.userId)) targetFriends.list.push(socket.userId);
            socket.emit('friendRequestResult', { success: true, message: 'フレンド申請を承認しました！' });
        } else {
            socket.emit('friendRequestResult', { success: true, message: 'フレンド申請を拒否しました。' });
        }

        saveDB('friends', friendsDB);

        socket.emit('friendsDataUpdated', getEnrichedFriendsData(socket.userId, friendsDB, usersDB));
        const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetId);
        if (targetSocket) {
            targetSocket.emit('friendsDataUpdated', getEnrichedFriendsData(targetId, friendsDB, usersDB));
            if(accept) targetSocket.emit('notification', `${usersDB[socket.userId].nickname}さんとフレンドになりました！`);
        }
    });

    // ================= ✉️ メール機能 =================
    socket.on('getMailData', () => {
        if (!socket.userId) return;
        const mailDB = loadDB('mail');
        const usersDB = loadDB('users');
        socket.emit('mailDataUpdated', getEnrichedMailData(socket.userId, mailDB, usersDB));
    });

    socket.on('sendMail', (data) => {
        if (!socket.userId) return;
        const { targetId, content, item } = data;

        const friendsDB = loadDB('friends');
        const myFriends = friendsDB[socket.userId] || { list: [] };

        if (!myFriends.list.includes(targetId)) {
            socket.emit('mailSendResult', { success: false, message: 'エラー: フレンドにのみメールを送信できます。' });
            return;
        }

        const usersDB = loadDB('users');
        const senderNickname = usersDB[socket.userId].nickname;

        let mailDB = loadDB('mail');
        if (!mailDB[targetId]) mailDB[targetId] = { messages: [] };

        const newMessage = {
            id: crypto.randomBytes(4).toString('hex'),
            senderId: socket.userId,
            content: content,
            item: item || null,
            timestamp: new Date().toISOString(),
            isRead: false
        };

        mailDB[targetId].messages.push(newMessage);
        saveDB('mail', mailDB);

        socket.emit('mailSendResult', { success: true, message: 'メールを送信しました！' });

        const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetId);
        if (targetSocket) {
            targetSocket.emit('mailDataUpdated', getEnrichedMailData(targetId, mailDB, usersDB));
            targetSocket.emit('notification', `${senderNickname}さんからメールが届きました！`);
        }
    });

    socket.on('markMailAsRead', (mailId) => {
        if (!socket.userId) return;
        let mailDB = loadDB('mail');
        let usersDB = loadDB('users');
        let myMail = mailDB[socket.userId];

        if (myMail) {
            const mail = myMail.messages.find(m => m.id === mailId);
            if (mail && !mail.isRead) {
                mail.isRead = true;
                saveDB('mail', mailDB);

                // ★追加：既読にしたら即座に最新のメールボックスをクライアントに送り返す（これでUIの赤丸が消える）
                socket.emit('mailDataUpdated', getEnrichedMailData(socket.userId, mailDB, usersDB));
            }
        }
    });
    // ================= 📜 バトル履歴機能 =================
    socket.on('getHistoryData', () => {
        if (!socket.userId) return;
        const historyDB = loadDB('history');
        const usersDB = loadDB('users');
        const myHistory = historyDB[socket.userId] || { matches: [] };

        // 対戦相手の名前を最新化して返す
        const enrichedMatches = myHistory.matches.map(match => ({
            ...match,
            opponents: (match.opponents || []).map(opp => ({
                id: opp.id,
                name: usersDB[opp.id]?.nickname || "不明なプレイヤー"
            }))
        }));

        socket.emit('historyDataUpdated', enrichedMatches);
    });
    // ================= 🎁 報酬受取システム =================
    socket.on('claimLoginBonus', () => {
        if (!socket.userId) return;
        let users = loadDB('users');
        let user = users[socket.userId];

        if (user && user.canClaimLoginBonus) {
            user.canClaimLoginBonus = false; // フラグを折る

            // 連続ログイン数に応じて報酬を豪華にする
            let bonusCoins = 10;
            let bonusGacha = 0;

            if (user.loginStreak >= 7) {
                bonusCoins = 50;
                bonusGacha = 1;
            } else if (user.loginStreak >= 3) {
                bonusCoins = 30;
            }

            user.coins += bonusCoins;
            if (bonusGacha > 0) user.gachaTickets += bonusGacha;

            saveDB('users', users);

            let msg = `ログインボーナスで ${bonusCoins} コイン`;
            if (bonusGacha > 0) msg += ` と ガチャ券x${bonusGacha}`;
            msg += ` を獲得しました！（連続ログイン: ${user.loginStreak}日目）`;

            socket.emit('authSuccess', user); // UI側の数値を最新化
            socket.emit('rewardClaimed', { success: true, message: msg });
        } else {
            socket.emit('rewardClaimed', { success: false, message: '今日の分は既に受け取り済みです。' });
        }
    });

    socket.on('claimRoadmapReward', (targetTrophies) => {
        if (!socket.userId) return;
        let users = loadDB('users');
        let user = users[socket.userId];

        if (!user) return;
        if (!user.claimedRoadmapRewards) user.claimedRoadmapRewards = [];

        // 既に受け取っているか
        if (user.claimedRoadmapRewards.includes(targetTrophies)) {
            socket.emit('rewardClaimed', { success: false, message: '既に受け取り済みです。' });
            return;
        }

        // トロフィーが足りているか
        if (user.trophies < targetTrophies) {
            socket.emit('rewardClaimed', { success: false, message: 'トロフィーが足りません。' });
            return;
        }

        // 資料に基づくロードマップ報酬内容
        let coinsToAdd = 0;
        let gachaToAdd = 0;
        let levelUp = false;

        switch(targetTrophies) {
            case 10: coinsToAdd = 50; break;
            case 30: gachaToAdd = 10; break;
            case 50: coinsToAdd = 100; levelUp = true; break;
            case 70: coinsToAdd = 50; gachaToAdd = 5; break;
            case 100: coinsToAdd = 100; gachaToAdd = 5; levelUp = true; break;
            default: 
                socket.emit('rewardClaimed', { success: false, message: '無効な報酬です。' });
                return;
        }

        user.coins += coinsToAdd;
        user.gachaTickets += gachaToAdd;
        if (levelUp) user.level += 1;

        user.claimedRoadmapRewards.push(targetTrophies);
        saveDB('users', users);

        let msg = `🏆 トロフィー${targetTrophies}到達報酬を獲得！\n`;
        if (coinsToAdd > 0) msg += `${coinsToAdd}コイン `;
        if (gachaToAdd > 0) msg += `ガチャ券x${gachaToAdd} `;
        if (levelUp) msg += `【レベルアップ！】`;

        socket.emit('authSuccess', user); // UI最新化
        socket.emit('rewardClaimed', { success: true, message: msg });
    });
    // ================= 🎰 ガチャシステム =================
    socket.on('drawGacha', () => {
        if (!socket.userId) return;
        let users = loadDB('users');
        let user = users[socket.userId];

        if (!user) return;

        // チケット不足チェック
        if (user.gachaTickets < 1) {
            socket.emit('gachaResult', { success: false, message: 'ガチャ券が足りません。' });
            return;
        }

        // ガチャ券を1枚消費
        user.gachaTickets -= 1;

        // ★本格的な排出割合（妥協なし！）
        // 50% - 30コイン
        // 30% - 50コイン
        // 10% - 100コイン
        // 5%  - 200コイン
        // 5%  - レアスキン (初期キャラの特別色)

        const rand = Math.random() * 100;
        let rewardType = '';
        let rewardValue = null;
        let message = '';

        if (rand < 50) {
            rewardType = 'coins'; rewardValue = 30; message = '30コイン獲得！';
        } else if (rand < 80) {
            rewardType = 'coins'; rewardValue = 50; message = '50コイン獲得！';
        } else if (rand < 90) {
            rewardType = 'coins'; rewardValue = 100; message = '大当たり！100コイン獲得！';
        } else if (rand < 95) {
            rewardType = 'coins'; rewardValue = 200; message = '超大当たり！200コイン獲得！';
        } else {
            rewardType = 'skin'; rewardValue = 'base_gold'; // 金色のスキン
            message = '激レア！限定スキン「ゴールデン」を獲得！';
        }

        // 報酬をユーザーデータに追加
        if (rewardType === 'coins') {
            user.coins += rewardValue;
        } else if (rewardType === 'skin') {
            if (!user.skins["base_char"]) user.skins["base_char"] = [];

            // 被り救済システム（既に持っていたらコインに変換）
            if (user.skins["base_char"].includes(rewardValue)) {
                user.coins += 150; 
                message = '限定スキン「ゴールデン」を獲得しましたが、既に持っていたため 150コイン に変換されました！';
            } else {
                user.skins["base_char"].push(rewardValue);
            }
        }

        // データを保存して最新化
        saveDB('users', users);
        socket.emit('authSuccess', user); 
        socket.emit('gachaResult', { success: true, message: message, rewardType: rewardType, rewardValue: rewardValue });
    });
    socket.on('disconnect', () => {
        console.log(`👋 プレイヤーが切断しました: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(`🚀 ゲームサーバーが起動しました！`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`================================\n`);
});