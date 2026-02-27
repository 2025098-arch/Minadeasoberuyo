const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const path = require('path');
const fs = require('fs');

// 静的ファイルの提供設定（publicフォルダ内のファイルをクライアントに送信）
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 1. サーバー設定とデータ永続化（ファイル保存）機能
// ==========================================
const GLOBAL_CONFIG = {
    INITIAL_POINTS: 1000,
    LEVEL_UP_EXP: 100,
    MAX_PLAYERS_PER_ROOM: 8,
    FPS: 20 // サーバー側の物理演算ループ（1秒間に20回計算）
};

// データ保存用ファイルのパス設定
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

// データベース変数
let users = {}; // 全ユーザー情報
const rooms = {}; // 稼働中のルーム情報（ルームは一時データなのでメモリ上のみ）

// 起動時にデータを読み込む
function loadDatabase() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (fs.existsSync(DATA_FILE)) {
        try {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            users = JSON.parse(rawData);
            console.log(`[DB] ユーザーデータを読み込みました (総ユーザー数: ${Object.keys(users).length})`);
        } catch (e) {
            console.error('[DB Error] データ読み込み失敗。新規データとして開始します。', e);
            users = {};
        }
    }
}

// データをファイルに書き込んで永続化する（重要な変更があった際に呼び出す）
function saveDatabase() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('[DB Error] データの保存に失敗しました:', e);
    }
}

loadDatabase(); // サーバー起動時に一回だけ実行

// ==========================================
// 2. ユーザー管理・報酬システム
// ==========================================
// ユーザーオブジェクトの完全な初期化
function createInitialUser(id, name, password) {
    return {
        id: id,
        name: name,
        password: password, // ※本来はハッシュ化推奨ですが、学習・プロトタイプ用として平文
        points: GLOBAL_CONFIG.INITIAL_POINTS,
        exp: 0,
        level: 1,
        skins: ['🟦初期スキン'],
        items: [],
        equippedSkin: '🟦初期スキン',
        equippedItem: '',
        customSkinData: null,
        friends: [], // フレンドのUIDリスト
        friendRequests: [], // 届いている申請 {id, name}
        mailBox: [], // 受信メール {id, from, type, text, claimed...}
        history: [], // 戦績（過去の試合結果）
        createdAt: new Date().toISOString()
    };
}

// クライアントへ最新状態を同期する
function broadcastUserStatus(socket, user) {
    if (!user) return;
    // 状態が変わるたびに保存を実行してデータロストを防ぐ
    saveDatabase();
    socket.emit('updateFullStatus', user);
}

// 経験値・ポイントの計算とレベルアップ処理
function processGameRewards(userId, expGain, pointGain, socket) {
    const user = users[userId];
    if (!user) return;

    user.points += pointGain;
    user.exp += expGain;

    // 複数レベルの一気上がりにも対応するループ処理
    let hasLeveledUp = false;
    while (user.exp >= GLOBAL_CONFIG.LEVEL_UP_EXP) {
        user.level++;
        user.exp -= GLOBAL_CONFIG.LEVEL_UP_EXP;
        hasLeveledUp = true;

        // レベル5到達時の報酬処理（拡張しやすいように独立）
        if (user.level >= 5 && !user.skins.includes('👑覇者スキン')) {
            user.skins.push('👑覇者スキン');
        }
    }

    if (hasLeveledUp && socket) {
        socket.emit('levelUpEvent', { newLevel: user.level });
    }
    broadcastUserStatus(socket, user);
}

// ==========================================
// 3. リアルタイム通信（Socket.io）メインロジック
// ==========================================
io.on('connection', (socket) => {
    let currentUser = null; // この通信を繋いでいるユーザー
    let currentRoomId = null; // 現在入っている部屋
    // --- ここから追加：一人で練習 ---
    socket.on('startPractice', (gameType) => {
        const practiceRoomId = 'practice_' + socket.id;
        socket.join(practiceRoomId);
        socket.currentRoom = practiceRoomId;
        const playerData = {
            uid: socket.uid,
            name: socket.playerName || 'プレイヤー',
            skin: socket.skin || 'デフォルト',
            customSkinData: socket.customSkinData || null
        };
        socket.emit('gameStart', { 
            gameType: gameType, 
            isPractice: true,
            playersData: [playerData] 
        });
    });

    // --- ここから追加：試合履歴 ---
    socket.on('reqHistory', () => {
        const history = (users[socket.uid] && users[socket.uid].matchHistory) ? users[socket.uid].matchHistory : [];
        socket.emit('showHistory', history);
    });

    // --- ここから追加：ショップ購入処理 ---
    socket.on('buyItem', (data) => {
        const user = users[socket.uid];
        if (!user) {
            socket.emit('buyFail', 'ユーザー情報が見つかりません。');
            return;
        }
        const { type, id, price } = data;
        if (user.ownedItems && user.ownedItems[type] && user.ownedItems[type].includes(id)) {
            socket.emit('buyFail', 'すでに所持しているアイテムです。');
            return;
        }
        if (user.points >= price) {
            user.points -= price;
            if (!user.ownedItems) user.ownedItems = {};
            if (!user.ownedItems[type]) user.ownedItems[type] = [];
            user.ownedItems[type].push(id);
            socket.emit('buySuccess', { type: type, id: id });
            socket.emit('statusUpdate', { points: user.points, exp: user.exp });
        } else {
            socket.emit('buyFail', 'ポイントが足りません。');
        }
    });
    // --- 認証セクション ---
    socket.on('register', (data) => {
        if (!data.name || !data.password) return socket.emit('authError', '入力が空です');
        if (Object.values(users).some(u => u.name === data.name)) {
            return socket.emit('authError', 'その名前は既に使用されています');
        }
        // 衝突しにくいUIDの生成
        const id = 'UID_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        users[id] = createInitialUser(id, data.name, data.password);
        currentUser = users[id];

        socket.emit('authSuccess', { name: data.name, password: data.password });
        socket.emit('initData', id);
        broadcastUserStatus(socket, currentUser);
    });

    socket.on('login', (data) => {
        const user = Object.values(users).find(u => u.name === data.name && u.password === data.password);
        if (!user) return socket.emit('authError', '名前またはパスワードが間違っています');

        currentUser = user;
        socket.emit('authSuccess', { name: data.name, password: data.password });
        socket.emit('initData', user.id);
        broadcastUserStatus(socket, currentUser);
    });

    // --- カスタマイズ・ショップセクション ---
    socket.on('saveCustomSkin', (base64Data) => {
        if (!currentUser) return;
        currentUser.customSkinData = base64Data;
        if (!currentUser.skins.includes('🎨マイオリジナル')) {
            currentUser.skins.push('🎨マイオリジナル');
        }
        currentUser.equippedSkin = '🎨マイオリジナル';
        broadcastUserStatus(socket, currentUser);
    });

    socket.on('buy', (payload) => {
        if (!currentUser) return;
        const { type, name, price } = payload;

        if (currentUser.points < price) return socket.emit('serverMessage', 'ポイントが足りません');
        if (type === 'skin' && currentUser.skins.includes(name)) return socket.emit('serverMessage', '既に所持しています');
        if (type === 'item' && currentUser.items.includes(name)) return socket.emit('serverMessage', '既に所持しています');

        // 支払いとアイテム追加
        currentUser.points -= price;
        if (type === 'skin') currentUser.skins.push(name);
        if (type === 'item') currentUser.items.push(name);

        broadcastUserStatus(socket, currentUser);
        socket.emit('serverMessage', `${name} を購入しました！`);
    });

    socket.on('equip', (payload) => {
        if (!currentUser) return;
        if (payload.type === 'skin' && currentUser.skins.includes(payload.name)) {
            currentUser.equippedSkin = payload.name;
        }
        if (payload.type === 'item' && currentUser.items.includes(payload.name)) {
            // 同じものを選択したら外す（トグル機能）
            currentUser.equippedItem = (currentUser.equippedItem === payload.name) ? '' : payload.name;
        }
        broadcastUserStatus(socket, currentUser);
    });

    // --- ソーシャルセクション（フレンド・メール） ---
    socket.on('sendFriendRequest', (targetId) => {
        if (!currentUser || !users[targetId] || targetId === currentUser.id) return;

        const targetUser = users[targetId];
        // 既に申請済みか、既にフレンドかチェック
        const alreadyRequested = targetUser.friendRequests.some(r => r.id === currentUser.id);
        const alreadyFriends = currentUser.friends.includes(targetId);

        if (!alreadyRequested && !alreadyFriends) {
            targetUser.friendRequests.push({ id: currentUser.id, name: currentUser.name });
            saveDatabase(); // 相手のデータを書き換えたので強制保存
            socket.emit('serverMessage', 'フレンド申請を送信しました');
        } else {
            socket.emit('serverMessage', '申請済み、または既にフレンドです');
        }
    });

    socket.on('acceptFriend', (targetId) => {
        if (!currentUser || !users[targetId]) return;

        // 申請リストから削除
        currentUser.friendRequests = currentUser.friendRequests.filter(r => r.id !== targetId);

        // 相互にフレンドリストへ追加
        if (!currentUser.friends.includes(targetId)) currentUser.friends.push(targetId);
        if (!users[targetId].friends.includes(currentUser.id)) users[targetId].friends.push(currentUser.id);

        saveDatabase();
        broadcastUserStatus(socket, currentUser);
    });

    socket.on('sendMail', (data) => {
        if (!currentUser || !users[data.targetId]) return;

        const newMail = {
            id: 'MAIL_' + Date.now(),
            from: currentUser.name,
            type: data.type, // 'text', 'point', 'item'
            text: data.text,
            amount: data.amount || 0,
            itemName: data.itemName || '',
            claimed: false,
            date: new Date().toISOString()
        };

        // ポイント添付の場合は送信者から引く
        if (data.type === 'point') {
            if (currentUser.points < data.amount) return socket.emit('serverMessage', 'ポイントが足りません');
            currentUser.points -= data.amount;
            broadcastUserStatus(socket, currentUser);
        }

        users[data.targetId].mailBox.push(newMail);
        saveDatabase();
        socket.emit('serverMessage', 'メールを送信しました');
    });

    socket.on('claimMail', (mailId) => {
        if (!currentUser) return;
        const mail = currentUser.mailBox.find(m => m.id === mailId);
        if (!mail || mail.claimed) return;

        if (mail.type === 'point') {
            currentUser.points += mail.amount;
        } else if (mail.type === 'item') {
            if (!currentUser.items.includes(mail.itemName)) currentUser.items.push(mail.itemName);
        }

        mail.claimed = true;
        broadcastUserStatus(socket, currentUser);
    });

    // --- ゲームエンジン・マッチングセクション ---
    function setupRoom(code, gameType, isPublic) {
        rooms[code] = {
            id: code,
            gameType: gameType,
            isPublic: isPublic,
            players: [],
            status: 'waiting',
            bombs: [], // ボンバー用物理オブジェクト
            startTime: null,
            intervals: [] // クリーンアップ用
        };
        return rooms[code];
    }

    socket.on('quickMatch', (gameType) => {
        if (!currentUser) return;

        // パブリックで、待機中で、満員でない同じゲームタイプの部屋を探す
        let room = Object.values(rooms).find(r => 
            r.isPublic && 
            r.gameType === gameType && 
            r.status === 'waiting' && 
            r.players.length < GLOBAL_CONFIG.MAX_PLAYERS_PER_ROOM
        );

        // なければ新規作成
        const code = room ? room.id : Math.random().toString(36).substring(2, 7).toUpperCase();
        if (!room) room = setupRoom(code, gameType, true);

        joinRoom(code);
    });

    function joinRoom(code) {
        const room = rooms[code];
        if (!room || room.status !== 'waiting') return socket.emit('serverMessage', '入室できません');

        // 以前の部屋から抜ける処理
        if (currentRoomId && currentRoomId !== code) socket.leave(currentRoomId);

        currentRoomId = code;
        socket.join(code);

        // プレイヤー情報の登録（戦闘用データ）
        room.players.push({
            socketId: socket.id,
            uid: currentUser.id,
            name: currentUser.name,
            skin: currentUser.equippedSkin,
            customSkinData: currentUser.customSkinData,
            score: 0,
            isDead: false
        });

        // 部屋の全員にメンバー更新を通知
        io.to(code).emit('worldMembersUpdate', {
            code: code,
            members: room.players.map(p => p.name),
            isPublic: room.isPublic
        });
    }

    // ホスト（または誰か）がゲーム開始を押した時
    socket.on('startMultiplayerGame', () => {
        const room = rooms[currentRoomId];
        if (room && room.status === 'waiting' && room.players.length >= 1) { // ※テスト用に1人でも開始可能にしています
            executeGameStart(room);
        }
    });

    // --- ゲームロジック（サーバー主導） ---
    function executeGameStart(room) {
        room.status = 'playing';
        room.startTime = Date.now();

        const playersData = room.players.map(p => ({
            uid: p.uid, name: p.name, skin: p.skin, customSkinData: p.customSkinData
        }));

        io.to(room.id).emit('gameStart', { gameType: room.gameType, playersData: playersData });

        // ゲーム別のサーバー側物理演算ループ
        if (room.gameType === 'bomber') {
            // サーバー側で爆弾を生成し、移動を計算する
            const bomb = { id: 'BOMB_' + Date.now(), x: 0, z: 0, vx: 0.3, vz: 0.3, speed: 0.4 };
            room.bombs.push(bomb);

            const timer = setInterval(() => {
                // 爆弾の移動演算
                bomb.x += bomb.vx * bomb.speed;
                bomb.z += bomb.vz * bomb.speed;

                io.to(room.id).emit('bomberUpdateBomb', { 
                    id: bomb.id, 
                    pos: { x: bomb.x, y: 0.8, z: bomb.z } 
                });

                // 場外に出たら爆発判定としてゲーム終了へ
                if (Math.abs(bomb.x) > 16 || Math.abs(bomb.z) > 16) {
                    io.to(room.id).emit('bomberExplode', { 
                        id: bomb.id, 
                        pos: { x: bomb.x, y: 0.8, z: bomb.z } 
                    });
                    finalizeGame(room.id);
                }
            }, 1000 / GLOBAL_CONFIG.FPS);

            room.intervals.push(timer);
        }
    }

    // プレイヤーの移動同期（超高頻度で呼ばれる）
    socket.on('movePlayer', (data) => {
        if (currentRoomId && currentUser) {
            socket.to(currentRoomId).emit('otherPlayerMoved', {
                uid: currentUser.id,
                pos: data.pos || data, // 古い形式と新しい形式両方に対応
                rot: data.rot
            });
        }
    });

    // 本探しゲーム等のクリック判定（早い者勝ちをサーバーで判定）
    socket.on('bookClicked', (bookId) => {
        const room = rooms[currentRoomId];
        if (room && room.status === 'playing' && !room.winnerDefined) {
            room.winnerDefined = true;

            io.to(currentRoomId).emit('bookRoundResult', {
                winnerUid: currentUser.id,
                winnerName: currentUser.name,
                targetId: bookId
            });

            // 2秒後にリザルト画面へ移行
            setTimeout(() => finalizeGame(currentRoomId), 2000);
        }
    });

    // 試合終了・報酬配布・部屋の解散
    function finalizeGame(code) {
        const room = rooms[code];
        if (!room || room.status === 'finished') return;

        room.status = 'finished';
        room.intervals.forEach(clearInterval); // 全ての物理演算ループを停止

        // 参加者全員に報酬を配布
        room.players.forEach((p, index) => {
            const socketTarget = io.sockets.sockets.get(p.socketId);
            if (socketTarget) {
                // 順位付け（簡易的にインデックスを使用、実際はスコアでソートする）
                const rank = index + 1;
                const rewardPoints = Math.max(10, 100 - (rank * 10)); // 1位90pt, 2位80pt...最低10pt
                const rewardExp = 50;

                // 戦績の記録
                if (users[p.uid]) {
                    users[p.uid].history.unshift({
                        date: new Date().toISOString(),
                        game: room.gameType,
                        rank: rank,
                        points: rewardPoints
                    });
                    // 戦績は直近10件のみ保存
                    if (users[p.uid].history.length > 10) users[p.uid].history.pop();
                }

                socketTarget.emit('gameResult', {
                    rank: rank,
                    points: rewardPoints,
                    exp: rewardExp,
                    topPlayers: room.players.slice(0, 3).map(tp => tp.name)
                });

                processGameRewards(p.uid, rewardExp, rewardPoints, socketTarget);
            }
        });

        // 10秒後に部屋を完全に削除
        setTimeout(() => delete rooms[code], 10000);
    }

            // --- ここから追加・上書き：確実な退出処理 ---
            function handlePlayerLeave(socket) {
                const roomId = socket.currentRoom;
                if (roomId && rooms[roomId]) {
                    rooms[roomId].members = rooms[roomId].members.filter(uid => uid !== socket.uid);
                    socket.leave(roomId);
                    socket.currentRoom = null;

                    if (rooms[roomId].members.length > 0) {
                        const updatedMemberNames = rooms[roomId].members.map(uid => users[uid].name);
                        io.to(roomId).emit('worldMembersUpdate', {
                            code: roomId,
                            isPublic: rooms[roomId].isPublic,
                            members: updatedMemberNames
                        });
                        if (rooms[roomId].gameActive) {
                            io.to(roomId).emit('otherPlayerDied', socket.uid);
                        }
                    } else {
                        delete rooms[roomId];
                    }
                }
            }

            socket.on('leaveRoom', () => {
                handlePlayerLeave(socket);
            });

    socket.on('disconnect', () => {
        handlePlayerLeave(socket);
        if (currentUser) saveDatabase();
    });
});

// 静的ファイルの提供設定（publicフォルダ内のファイルをクライアントに送信）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

// サーバー起動
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 Ultimate Game Server is now Running!`);
    console.log(`💾 Data Persistence: ENABLED`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`=========================================`);
});