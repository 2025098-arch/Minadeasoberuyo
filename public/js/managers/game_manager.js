// managers/game_manager.js
const crypto = require('crypto');

// ==========================================
// 🎲 ランダムマッチ待機列（キュー）管理
// ==========================================
let waitingPlayers = []; // 待機中のプレイヤー { socket, userId, nickname, trophies, equipped }
let countdownInterval = null;
let countdownSeconds = 5; // カウントダウンの秒数（テストしやすいよう5秒に設定）

const MIN_PLAYERS = 3;  // 3人以上でカウントダウン開始
const MAX_PLAYERS = 30; // 30人に達したら即時ゲーム開始

// 実装予定のミニゲームリスト
const MINIGAMES = ['game1', 'game2']; 

// ==========================================
// 待機列の状態を全員に知らせる
// ==========================================
function updateQueueStatus(io) {
    const playerCount = waitingPlayers.length;

    // プレイヤーの詳しい情報をリストにする
    const playerList = waitingPlayers.map(p => ({
        id: p.userId,                 // ユーザーID（プロフィール表示用）
        socketId: p.socket.id,        // ★追加：クライアント側での混線防止用！
        name: p.nickname || "名無し", // ニックネーム
        trophies: p.trophies || 0     // トロフィー数
    }));

    // 待機中の全員に送る
    waitingPlayers.forEach(player => {
        player.socket.emit('matchmakingUpdate', {
            message: '対戦相手を探しています...',
            playerCount: playerCount,
            maxPlayers: MAX_PLAYERS,
            players: playerList,
            myId: player.userId 
        });
    });
}

// ゲームを開始し、ルームを作る関数
function startGame(io) {
    if (waitingPlayers.length === 0) return;

    // 1. ルームIDの作成とミニゲームのランダム抽選
    const roomId = 'room_' + crypto.randomBytes(4).toString('hex');
    const selectedGame = MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)];

    console.log(`🎮 [ランダムマッチ成立] ルーム: ${roomId} | ゲーム: ${selectedGame} | 人数: ${waitingPlayers.length}人`);

    // 2. 待機列のプレイヤーをルームに移動させる
    // 🚨 ここが超重要！ socketId と userId を明確に分けてクライアントに送る！
    const participants = waitingPlayers.map(p => ({ 
        id: p.userId, 
        socketId: p.socket.id, // ★追加：AさんがBさんを操縦するバグを根絶する！
        nickname: p.nickname,
        equipped: p.equipped,
        trophies: p.trophies // 👈 【これを追加！！！】絶対に逃さない！
    }));

    waitingPlayers.forEach(p => {
        p.socket.join(roomId); // Socket.ioの機能で専用ルーム（グループ）に入れる
        p.socket.isPlayingGame = true; // 🔥 【追加】「試合中」の刻印を打つ！妥協なし！
        p.socket.emit('matchFound', {
            roomId: roomId,
            game: selectedGame,
            participants: participants
        });
    });

    // 3. 待機列を空っぽにする（次に新しく並ぶ人たちのためにリセット）
    waitingPlayers = [];
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// カウントダウンを開始（またはリセット）する関数
function startOrResetCountdown(io) {
    // すでに動いているタイマーがあれば止める（人が新しく入ってきた時のリセット処理）
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownSeconds = 5; // タイマーを5秒にリセット

    countdownInterval = setInterval(() => {
        // 毎秒全員に残り時間を通知
        waitingPlayers.forEach(p => {
            p.socket.emit('matchmakingTimer', { seconds: countdownSeconds });
        });

        if (countdownSeconds <= 0) {
            // 0秒になったらゲーム開始！
            startGame(io);
        }
        countdownSeconds--;
    }, 1000);
}

// ==========================================
// 外部（index.js）から呼び出すための機能まとめ
// ==========================================
module.exports = {
    // プレイヤーが「ランダムマッチ開始」を押した時
    joinRandomMatch: (socket, user, io) => {
        // 既に列に並んでいる場合は無視する
        if (waitingPlayers.find(p => p.userId === user.id)) return;

        console.log(`🚶‍♂️ ${user.nickname} がランダムマッチ待機列に並びました。(現在: ${waitingPlayers.length + 1}人)`);

        // MongoDBから送られてきた user データを完璧にメモリに保存
        waitingPlayers.push({ 
            socket: socket, 
            userId: user.id, 
            nickname: user.nickname,
            trophies: user.trophies || 0,
            equipped: user.equipped || { character: 'char_human', skin: 'default' }
        });

        updateQueueStatus(io);

        // 人数が最大(30人)に達したら、カウントダウンを待たずに即開始して新しい列を作る
        if (waitingPlayers.length >= MAX_PLAYERS) {
            startGame(io);
            return;
        }

        // 人数が3人以上ならカウントダウン開始（すでに始まっていればリセットされる）
        if (waitingPlayers.length >= MIN_PLAYERS) {
            startOrResetCountdown(io);
        }
    },

    // プレイヤーが「キャンセル」した時、または通信切断した時
    leaveRandomMatch: (socketId, io) => {
        const index = waitingPlayers.findIndex(p => p.socket.id === socketId);

        if (index !== -1) {
            const p = waitingPlayers[index];
            console.log(`🏃‍♂️ ${p.nickname} が待機列から離脱しました。`);
            waitingPlayers.splice(index, 1);

            updateQueueStatus(io);

            // 離脱した結果、人数が3人未満になってしまったらカウントダウンを中止する
            if (waitingPlayers.length < MIN_PLAYERS && countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                waitingPlayers.forEach(player => {
                    player.socket.emit('matchmakingTimerCancelled', { message: '人数が足りないためカウントダウンを中止しました' });
                });
            }
        }
    }
};