// public/js/managers/room_manager.js

let privateRooms = {}; 
const MINIGAMES = ['game1', 'game2', 'random'];

// ルーム内の全員に最新の参加者リストを送信する
function updateRoomStatus(io, roomCode) {
    const room = privateRooms[roomCode];
    if (!room) return;

    const playerList = room.players.map(p => ({
        id: p.userId,
        socketId: p.socket.id, // ★追加：クライアント側での混線防止用！
        name: p.nickname,
        trophies: p.trophies || 0,
        isHost: (p.userId === room.hostId)
    }));

    room.players.forEach(p => {
        p.socket.emit('privateRoomUpdate', {
            roomCode: roomCode,
            hostId: room.hostId,
            selectedGame: room.selectedGame,
            players: playerList,
            myId: p.userId
        });
    });
}

function generateRoomCode() {
    let code;
    do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (privateRooms[code]); 
    return code;
}

module.exports = {
    createRoom: (socket, user, io) => {
        const roomCode = generateRoomCode();
        const uid = socket.userId;

        privateRooms[roomCode] = {
            code: roomCode,
            hostId: uid,
            selectedGame: 'random',
            players: [{ socket: socket, userId: uid, nickname: user.nickname || "名無し", trophies: user.trophies || 0, equipped: user.equipped || { character: 'char_human', skin: 'default' } }],
            bannedPlayers: [] // 🚫 追放されたプレイヤーのIDリスト
        };

        socket.join(roomCode); 
        socket.emit('privateRoomJoined', { roomCode: roomCode, isHost: true });
        updateRoomStatus(io, roomCode);
    },

    joinRoom: (socket, user, roomCode, io) => {
        const room = privateRooms[roomCode];

        if (!room) {
            socket.emit('privateRoomError', 'そのルームコードは存在しません。');
            return;
        }
        if (room.players.length >= 30) {
            socket.emit('privateRoomError', 'ルームが満員です。');
            return;
        }

        const uid = socket.userId;

        // 🚫 追放されたプレイヤーは入室できないようにブロック
        if (room.bannedPlayers && room.bannedPlayers.includes(String(uid))) {
            socket.emit('privateRoomError', 'このルームからは追放されているため、入室できません。');
            return;
        }

        if (room.players.find(p => p.userId === uid)) {
            return; 
        }

        room.players.push({ socket: socket, userId: uid, nickname: user.nickname || "名無し", trophies: user.trophies || 0, equipped: user.equipped || { character: 'char_human', skin: 'default' } });
        socket.join(roomCode);

        socket.emit('privateRoomJoined', { roomCode: roomCode, isHost: false });
        updateRoomStatus(io, roomCode);
    },

    leaveRoom: (socketId, io) => {
        for (const code in privateRooms) {
            const room = privateRooms[code];
            const index = room.players.findIndex(p => p.socket.id === socketId);

            if (index !== -1) {
                const player = room.players[index];
                room.players.splice(index, 1);
                player.socket.leave(code);

                if (room.players.length === 0) {
                    delete privateRooms[code];
                } else {
                    if (player.userId === room.hostId) {
                        room.hostId = room.players[0].userId;
                    }
                    updateRoomStatus(io, code);
                }
                break; 
            }
        }
    },

    // ⛔ プレイヤー追放
    kickPlayer: (socket, roomCode, targetUserId, io) => {
        const room = privateRooms[roomCode];
        if (!room) return;

        if (String(socket.userId) !== String(room.hostId)) {
            socket.emit('privateRoomError', 'ホストのみプレイヤーを追放できます。');
            return;
        }

        const targetIndex = room.players.findIndex(p => String(p.userId) === String(targetUserId));
        if (targetIndex !== -1) {
            const targetPlayer = room.players[targetIndex];

            // 🚫 ブラックリストに登録
            if (!room.bannedPlayers) room.bannedPlayers = [];
            room.bannedPlayers.push(String(targetUserId));

            room.players.splice(targetIndex, 1);
            targetPlayer.socket.leave(roomCode);

            targetPlayer.socket.emit('kickedFromPrivateRoom', 'ホストにより追放されました。');
            updateRoomStatus(io, roomCode);
            console.log(`⛔ [追放] ${targetPlayer.nickname} を ${roomCode} から出し、アクセス禁止にしました`);
        }
    },

    // ⚔️ ゲーム開始
    startGame: (socket, data, io) => { 
        const roomCode = data.roomCode;
        const room = privateRooms[roomCode];
        if (!room) return;

        if (socket.userId === room.hostId) {
            if (room.players.length < 2) {
                socket.emit('privateRoomError', '対戦相手がいません！ゲームを開始するには2人以上のプレイヤーが必要です。');
                return; 
            }

            let gameToPlay = data.game || room.selectedGame || 'random';

            if (gameToPlay === 'random') {
                gameToPlay = MINIGAMES[Math.floor(Math.random() * (MINIGAMES.length - 1))];
            }

            // 🚨 ここが超重要！ socketId と userId を明確に分けてクライアントに送る！
            const participantData = room.players.map(p => ({
                 id: p.userId,
                 socketId: p.socket.id, // ★追加：AさんがBさんを操縦するバグを根絶する！
                 nickname: p.nickname,
                 equipped: p.equipped
            }));

            room.players.forEach(p => {
                p.socket.isPlayingGame = true; // 🔥 【追加】「試合中」の刻印を打つ！妥協なし！
                p.socket.emit('privateRoomStart', { roomId: roomCode, game: gameToPlay, participants: participantData });
            });

            delete privateRooms[roomCode];
        }
    }
};