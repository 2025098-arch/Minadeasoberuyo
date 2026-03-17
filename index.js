// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const gameManager = require('./public/js/managers/game_manager.js');
const roomManager = require('./public/js/managers/room_manager.js'); // 👈これを追加！
const crypto = require('crypto');

const mongoose = require('mongoose');

// MongoDBデータベースに接続！
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDBに接続大成功だー！！🎉');
  })
  .catch((err) => {
    console.error('MongoDB接続エラー😭:', err);
  });
// 👇 ★★★ ここから下を追加！ ★★★ 👇
// ==========================================
// 📊 MongoDB データの設計図（スキーマ）とモデル
// ==========================================

// 1. ユーザーデータの設計図
const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nickname: String,
    pin: String,
    coins: { type: Number, default: 10 },
    trophies: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    gachaTickets: { type: Number, default: 1 },
    characters: { type: [String], default: ["char_human"] },
    skins: { type: Object, default: { "char_human": ["白色の服を着る人間"] } },
    equipped: { type: Object, default: { character: "char_human", skin: "白色の服を着る人間", item: null } },
    inventory: { type: Array, default: [] },
    settings: { type: Object, default: { rankingPublic: false, reqHistory: false, reqRanking: false } },
    loginStreak: { type: Number, default: 1 },
    lastLoginDate: String,
    canClaimLoginBonus: { type: Boolean, default: true },
    claimedRoadmapRewards: { type: [Number], default: [] },
    characterLevels: { type: Object, default: {} },
    lastLogin: Number
});
const User = mongoose.model('User', userSchema);

// 2. フレンドデータの設計図
const friendSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    list: { type: [String], default: [] },
    requestsReceived: { type: [String], default: [] },
    requestsSent: { type: [String], default: [] },
    history: { type: Array, default: [] }
});
const Friend = mongoose.model('Friend', friendSchema);

// 3. メールデータの設計図
const mailSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    messages: { type: Array, default: [] }
});
const Mail = mongoose.model('Mail', mailSchema);

// 4. バトル履歴データの設計図
const historySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    matches: { type: Array, default: [] }
});
const History = mongoose.model('History', historySchema);
// 👆 ★★★ ここまで追加！ ★★★ 👆

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

// ==========================================
// 💡 MongoDB対応版: フレンドのデータを画面に送るための準備関数
// （機能は一切妥協せず、相手のオンライン状態や最終ログイン時刻も完璧に取得します！）
// ==========================================
async function getEnrichedFriendsData(userId) {
    // 1. MongoDBから自分のフレンドデータを取得
    const myFriends = await Friend.findOne({ userId }).lean() || { list: [], requestsReceived: [], requestsSent: [], history: [] };

    // 2. 表示に必要な「フレンド」と「申請を送ってきた人」のユーザーデータを一括で取得（高速化）
    const relatedUserIds = [...myFriends.list, ...myFriends.requestsReceived];
    const relatedUsers = await User.find({ id: { $in: relatedUserIds } }).lean();

    // 検索しやすいように辞書型に変換
    const usersMap = {};
    relatedUsers.forEach(u => usersMap[u.id] = u);

    return {
        list: myFriends.list.map(id => {
            // ★今リアルタイムでサーバーに接続しているかチェック！
            const isOnline = Array.from(io.sockets.sockets.values()).some(s => s.userId === id);
            // ★相手の保存された時間を取得
            const savedTime = usersMap[id]?.lastLogin;
            // ★オフラインなのに時間データが無い場合は「1日前」を仮で入れる
            const fallbackTime = Date.now() - (24 * 60 * 60 * 1000);

            return { 
                id, 
                nickname: usersMap[id]?.nickname || "不明", 
                level: usersMap[id]?.level || 1,
                trophies: usersMap[id]?.trophies || 0,
                rankingPublic: usersMap[id]?.settings?.rankingPublic || false,
                // ★オンラインなら null、オフラインなら保存された時間（無ければ昨日の時間）を渡す！
                lastLogin: isOnline ? null : (savedTime || fallbackTime)
            };
        }),
        requestsReceived: myFriends.requestsReceived.map(id => ({ 
            id, 
            nickname: usersMap[id]?.nickname || "不明" 
        })),
        history: myFriends.history 
    };
}

// ==========================================
// 💡 MongoDB対応版: メールデータを画面に送るための準備関数
// （送信者の名前をMongoDBから一括で取得して高速化します！）
// ==========================================
async function getEnrichedMailData(userId) {
    // 1. MongoDBから自分のメールデータを取得
    const myMail = await Mail.findOne({ userId }).lean() || { messages: [] };

    // 2. 差出人のユーザーIDをかき集める（"SYSTEM"＝運営 は除外）
    const senderIds = myMail.messages
        .map(m => m.senderId)
        .filter(id => id !== "SYSTEM");

    // 3. 重複を消して、一括でMongoDBからユーザー情報を取得（超高速化の妥協なし！）
    const uniqueSenderIds = [...new Set(senderIds)];
    const senders = await User.find({ id: { $in: uniqueSenderIds } }).lean();

    // 検索しやすいように辞書型に変換
    const sendersMap = {};
    senders.forEach(u => sendersMap[u.id] = u);

    return {
        messages: myMail.messages.map(m => ({
            ...m,
            senderNickname: m.senderId === "SYSTEM" ? "運営" : (sendersMap[m.senderId]?.nickname || "退会したユーザー")
        })).reverse() // 最新のメールを一番上に
    };
}

// ==========================================
// 🌐 Socket.io 通信システム
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 新しいプレイヤーが接続しました: ${socket.id}`);

    // ================= 新規登録 (MongoDB対応版) =================
    // 💡 変更点: 「async」をつけて、MongoDBの返事を「await」で待つようにしました！
    socket.on('register', async (data) => {
        try {
            const { nickname, pin, settings = {} } = data;

            // 1. 重複チェック（MongoDBの User コレクションから探す）
            const existingUser = await User.findOne({ nickname: nickname });
            if (existingUser) {
                socket.emit('authError', 'そのニックネームは既に使用されています。別の名前をお試しください。');
                return;
            }

            // 2. 新しいIDの作成（被らないIDが出るまで探す）
            let newId;
            let idExists = true;
            do {
                newId = generatePlayerID();
                const checkId = await User.findOne({ id: newId });
                if (!checkId) idExists = false;
            } while (idExists);

            // 3. ユーザーデータの作成
            const newUser = {
                id: newId,
                nickname: nickname,
                pin: pin,
                coins: 10,
                trophies: 0,
                level: 1,
                gachaTickets: 1,
                characters: ["char_human"],
                skins: { "char_human": ["白色の服を着る人間"] },
                equipped: { character: "char_human", skin: "白色の服を着る人間", item: null },
                inventory: [],
                settings: {
                    rankingPublic: settings.rankingPublic !== undefined ? settings.rankingPublic : false,
                    reqHistory: settings.reqHistory !== undefined ? settings.reqHistory : false,
                    reqRanking: settings.reqRanking !== undefined ? settings.reqRanking : false
                },
                loginStreak: 1,
                lastLoginDate: new Date().toISOString().split('T')[0],
                canClaimLoginBonus: true, 
                claimedRoadmapRewards: [],
                lastLogin: Date.now()
            };

            // 4. 各データベース（コレクション）へ保存！
            await User.create(newUser);
            await Friend.create({ userId: newId, list: [], requestsReceived: [], requestsSent: [], history: [] });
            await History.create({ userId: newId, matches: [] });

            const initialMail = {
                id: crypto.randomBytes(4).toString('hex'),
                senderId: "SYSTEM",
                content: "ゲームへようこそ！初期報酬として10コインをプレゼントします！",
                item: null,
                timestamp: new Date().toISOString(),
                isRead: false
            };
            await Mail.create({ userId: newId, messages: [initialMail] });

            console.log(`✨ 新規アカウント作成＆保存成功(MongoDB): ${nickname} (ID: ${newId})`);
            socket.userId = newId;

            // 💡 クライアントへ送る時は、MongoDB特有の無駄なデータ(_id等)を省いて送る
            const userToSend = await User.findOne({ id: newId }, { _id: 0, __v: 0 }).lean();
            socket.emit('authSuccess', userToSend);

        } catch (error) {
            console.error("登録エラー:", error);
            socket.emit('authError', 'サーバーエラーが発生しました。');
        }
    });

    // ================= ログイン (MongoDB対応版) =================
    socket.on('login', async (data) => {
        try {
            const { nickname, pin } = data; 
            const searchKey = (nickname || "").trim().toUpperCase();

            // 1. ユーザーを検索 (ニックネーム または ID で探す)
            const user = await User.findOne({
                $or: [{ nickname: nickname }, { id: searchKey }]
            });

            if (!user) {
                socket.emit('authError', '指定されたID(またはニックネーム)のプレイヤーはいませんでした。');
                return;
            }

            // 2. PINの確認
            if (user.pin !== pin) {
                socket.emit('authError', 'PINが間違っています。');
                return;
            }

            // 3. ログインボーナスと連続ログイン日数の計算
            const today = new Date().toLocaleDateString('ja-JP', { 
                timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' 
            }).replace(/\//g, '-');

            if (user.lastLoginDate !== today) {
                const lastDate = new Date(user.lastLoginDate);
                const currentDate = new Date(today);
                const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    user.loginStreak += 1;
                } else {
                    user.loginStreak = 1;
                }

                user.lastLoginDate = today;
                user.canClaimLoginBonus = true; 
                socket.emit('notification', '🎁 今日のログインボーナスが届いています！報酬画面から受け取ってください！');
            }

            // 最新のログイン時間を更新
            user.lastLogin = Date.now();
            await user.save(); // 変更をMongoDBに上書き保存！

            console.log(`🔓 ログイン成功(MongoDB): ${user.nickname} (ID: ${user.id})`);
            socket.userId = user.id;

            // フロントにデータを送る
            const userToSend = await User.findOne({ id: user.id }, { _id: 0, __v: 0 }).lean();
            socket.emit('authSuccess', userToSend);

        } catch (error) {
            console.error("ログインエラー:", error);
            socket.emit('authError', 'サーバーエラーが発生しました。');
        }
    });

    // ================= 設定・プロフィール更新（MongoDB対応版） =================
    // 💡 変更点: async を追加して、MongoDBの処理を await で待つようにしています
    socket.on('updateSettings', async (newSettings) => {
        console.log("📥 [受信テスト] 届いたデータの中身:", newSettings);

        if (!socket.userId) {
            console.log("❌ socket.userId がないため弾かれました");
            return;
        }

        try {
            // 1. MongoDBから自分のデータを探す
            let user = await User.findOne({ id: socket.userId });

            if (user) {
                // 2. ニックネームの変更（重複チェック付き）
                if (newSettings.nickname && newSettings.nickname !== user.nickname) {
                    const existingUser = await User.findOne({ nickname: newSettings.nickname });
                    if (existingUser) {
                        socket.emit('notification', 'そのニックネームは既に使用されています。');
                        return; 
                    }
                    user.nickname = newSettings.nickname;
                }

                // 3. PINの変更
                if (newSettings.pin && newSettings.pin.length === 6 && !isNaN(newSettings.pin)) {
                    user.pin = newSettings.pin;
                }

                // 4. 設定（チェックボックス等）の更新
                if (newSettings.settings) {
                    user.settings = { ...(user.settings || {}), ...newSettings.settings };
                    // 🚨 【超重要】MongoDB(Mongoose)のルール: 
                    // Object型のデータ(settings)の中身だけを書き換えた時は、明示的に「変更したよ！」と伝えないと保存されません
                    user.markModified('settings');
                }

                // 5. MongoDBに上書き保存！
                await user.save();

                // 6. 画面側のデータを最新に書き換える (余計なデータを除いて送る)
                const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
                socket.emit('authSuccess', userToSend); 
                socket.emit('notification', 'プロフィール・設定を保存しました！');

                // 総合順位に名前変更を即座に反映させるため（今回は簡易的な再取得）
                io.emit('rankingDataUpdated', { /* 再取得用の空データ */ });
            }
        } catch (error) {
            console.error("設定更新エラー:", error);
            socket.emit('notification', '設定の保存中にエラーが発生しました。');
        }
    });

    // ================= 🎒 装備変更 (MongoDB対応版) =================
    socket.on('changeEquipment', async (data) => {
        if (!socket.userId) return;
        const { character, skin, item } = data; // ★itemも受け取るように追加

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });

            if (user) {
                // 🛡️ 不正防止：本当にそのキャラとスキンとアイテムを持っているかチェック（一切妥協なし！）
                const hasCharacter = user.characters && user.characters.includes(character);
                const hasSkin = user.skins && user.skins[character] && user.skins[character].includes(skin);

                // ★追加：アイテムの所持チェック（itemが指定されていない＝「外す」場合はスルーしてOK）
                const hasItem = !item || (user.inventory && user.inventory.includes(item));

                // 3つ全てクリアした場合のみ装備を許可！
                if (hasCharacter && hasSkin && hasItem) {
                    // ★items: [] ではなく、item: item (1個だけ) として保存
                    user.equipped = { character: character, skin: skin, item: item || null };

                    // 🚨 MongoDBルール: Object型(equipped)の中身を書き換えたので明示的に通知
                    user.markModified('equipped');

                    // MongoDBに上書き保存！
                    await user.save();

                    // 変更成功！最新のuserデータを送り返す（不要な_idデータなどは省いて送る）
                    const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
                    socket.emit('authSuccess', userToSend);
                    socket.emit('notification', '装備を変更しました！');
                } else {
                    socket.emit('notification', 'エラー：指定されたキャラクター、スキン、またはアイテムを所持していません。');
                }
            }
        } catch (error) {
            console.error("装備変更エラー:", error);
            socket.emit('notification', '装備の変更中にエラーが発生しました。');
        }
    });

    // ================= ⚠️ アカウント削除（完全抹消・MongoDB対応版） =================
    socket.on('deleteAccount', async () => {
        if (!socket.userId) return;
        const deleteId = socket.userId;

        try {
            // ログ用に削除するユーザーの名前を確保しておく
            const userToDelete = await User.findOne({ id: deleteId });
            const deletedName = userToDelete ? userToDelete.nickname : "不明なユーザー";

            // 1. まずは「自分自身のデータ」を全4つのコレクションから完全に抹消
            await User.deleteOne({ id: deleteId });
            await Friend.deleteOne({ userId: deleteId });
            await Mail.deleteOne({ userId: deleteId });
            await History.deleteOne({ userId: deleteId });

            // 2. 「他のすべてのユーザー」のデータから、自分の痕跡（フレンドや申請）を消し去る
            // ✨ MongoDBの超強力な必殺技「$pull」を使って一網打尽にします！（機能カット一切なし！）
            await Friend.updateMany(
                {}, // 条件なし＝「全員のフレンドデータ」を対象にする
                {
                    $pull: {
                        list: deleteId, // フレンドリストから自分のIDを消す
                        requestsReceived: deleteId, // 相手に送っていた申請から消す
                        requestsSent: deleteId, // 相手から来ていた申請からも消す
                        history: { targetId: deleteId } // 履歴の中に残っている自分宛ての記録ごと消す
                    }
                }
            );

            console.log(`🗑️ アカウント完全抹消実行(MongoDB): ${deletedName} (ID: ${deleteId})`);

            socket.emit('notification', 'アカウントの削除が完了しました。');

            // クライアントの通信を強制切断（これでフロント側が自動的にログイン画面に戻ります）
            socket.disconnect(true);

        } catch (error) {
            console.error("アカウント削除エラー:", error);
            socket.emit('notification', 'アカウントの削除中にエラーが発生しました。');
        }
    });

    // ================= 🏆 総合ランキング機能 =================
    socket.on('getRanking', async () => {
        if (!socket.userId) return;

        try {
            // 1. JSONの loadDB('users') の代わりに、MongoDBから全員のデータを取得
            // .lean() をつけることで、元のJSONと全く同じ「ただのJavaScriptオブジェクト」として扱えます。
            const allUsers = await User.find({}).lean();

            // 2. 元のロジックを一切妥協せず、100%そのまま使用します！
            let rankIndex = 1;
            const rankedUsers = allUsers
                .sort((a, b) => (b.trophies || 0) - (a.trophies || 0))
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

            // 💡 デバッグ用（Shellタブに送信されるデータの中身を表示します）
            console.log(`📊 [ランキング機能] トップ10の人数: ${top10.length}人, あなたの順位: ${myRank}`);

            socket.emit('rankingDataUpdated', { top10, myRank });

        } catch (error) {
            console.error("❌ ランキング取得エラー:", error);
        }
    });

    // ================= 👥 フレンド機能 (完全妥協なし・MongoDB対応版) =================
    socket.on('getFriendsData', async () => {
        if (!socket.userId) return;
        try {
            const enrichedData = await getEnrichedFriendsData(socket.userId);
            socket.emit('friendsDataUpdated', enrichedData);
        } catch (error) {
            console.error("フレンドデータ取得エラー:", error);
        }
    });

    socket.on('sendFriendRequest', async (targetId) => {
        if (!socket.userId) return;
        targetId = (targetId || "").trim().toUpperCase();

        if (socket.userId === targetId) {
            socket.emit('friendRequestResult', { success: false, message: '自分自身には申請できません。' });
            return;
        }

        try {
            // 相手のユーザーデータが存在するか確認
            const targetUser = await User.findOne({ id: targetId });
            if (!targetUser) {
                socket.emit('friendRequestResult', { success: false, message: '指定されたIDのプレイヤーは見つかりませんでした。' });
                return;
            }

            // 🛡️ 相手の設定（プライバシー）を確認してブロック
            if (targetUser.settings && 
               (targetUser.settings.reqRanking === false || targetUser.settings.reqHistory === false)) {
                socket.emit('friendRequestResult', { success: false, message: 'このプレイヤーは現在フレンド申請を受け付けていません。' });
                return;
            }

            // 自分と相手のフレンドデータ、及び自分のユーザーデータを取得
            let myFriends = await Friend.findOne({ userId: socket.userId });
            let targetFriends = await Friend.findOne({ userId: targetId });
            const myUser = await User.findOne({ id: socket.userId });

            if (myFriends.list.includes(targetId)) {
                socket.emit('friendRequestResult', { success: false, message: '既にフレンドです。' });
                return;
            }
            if (targetFriends.requestsReceived.includes(socket.userId) || myFriends.requestsReceived.includes(targetId)) {
                socket.emit('friendRequestResult', { success: false, message: '既に申請中、または相手から申請が届いています。' });
                return;
            }

            // 申請データと履歴の追加
            targetFriends.requestsReceived.push(socket.userId);
            const timestamp = new Date().toISOString();
            myFriends.history.push({ targetId: targetId, targetNickname: targetUser.nickname, type: 'sent', status: '確認中', timestamp });
            targetFriends.history.push({ targetId: socket.userId, targetNickname: myUser.nickname, type: 'received', status: '確認中', timestamp });

            // MongoDBに変更を通知して保存
            myFriends.markModified('history');
            targetFriends.markModified('requestsReceived');
            targetFriends.markModified('history');
            await myFriends.save();
            await targetFriends.save();

            socket.emit('friendRequestResult', { success: true, message: 'フレンド申請を送信しました！' });
            socket.emit('friendsDataUpdated', await getEnrichedFriendsData(socket.userId));

            // 相手がオンラインなら即座に通知
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetId);
            if (targetSocket) {
                targetSocket.emit('friendsDataUpdated', await getEnrichedFriendsData(targetId));
                targetSocket.emit('notification', '新しいフレンド申請が届きました！');
            }
        } catch (error) {
            console.error("フレンド申請エラー:", error);
        }
    });

    socket.on('respondFriendRequest', async (data) => {
        if (!socket.userId) return;
        const { targetId, accept } = data;

        try {
            let myFriends = await Friend.findOne({ userId: socket.userId });
            let targetFriends = await Friend.findOne({ userId: targetId });
            const myUser = await User.findOne({ id: socket.userId });

            // 申請リストから相手を削除
            myFriends.requestsReceived = myFriends.requestsReceived.filter(id => id !== targetId);
            const newStatus = accept ? '承認' : '拒否';

            // お互いの履歴ステータスを更新
            let myHistory = myFriends.history.find(h => h.targetId === targetId && h.status === '確認中');
            if (myHistory) myHistory.status = newStatus;

            let targetHistory = targetFriends.history.find(h => h.targetId === socket.userId && h.status === '確認中');
            if (targetHistory) targetHistory.status = newStatus;

            // 承認された場合はリストに追加
            if (accept) {
                if (!myFriends.list.includes(targetId)) myFriends.list.push(targetId);
                if (!targetFriends.list.includes(socket.userId)) targetFriends.list.push(socket.userId);
                socket.emit('friendRequestResult', { success: true, message: 'フレンド申請を承認しました！' });
            } else {
                socket.emit('friendRequestResult', { success: true, message: 'フレンド申請を拒否しました。' });
            }

            // MongoDBに変更を通知して保存
            myFriends.markModified('requestsReceived');
            myFriends.markModified('history');
            myFriends.markModified('list');
            targetFriends.markModified('history');
            targetFriends.markModified('list');
            await myFriends.save();
            await targetFriends.save();

            // 画面を更新
            socket.emit('friendsDataUpdated', await getEnrichedFriendsData(socket.userId));

            // 相手がオンラインなら即座に通知
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetId);
            if (targetSocket) {
                targetSocket.emit('friendsDataUpdated', await getEnrichedFriendsData(targetId));
                if(accept) targetSocket.emit('notification', `${myUser.nickname}さんとフレンドになりました！`);
            }
        } catch (error) {
            console.error("フレンド申請応答エラー:", error);
        }
    });

    // ================= ✉️ メール機能 (完全妥協なし・MongoDB対応版) =================
    socket.on('getMailData', async () => {
        if (!socket.userId) return;
        try {
            // 新しく作ったMongoDB対応版の関数を呼び出す！
            socket.emit('mailDataUpdated', await getEnrichedMailData(socket.userId));
        } catch (error) {
            console.error("メール取得エラー:", error);
        }
    });

    socket.on('sendMail', async (data) => {
        if (!socket.userId) return;
        const { targetId, content, item } = data;

        try {
            // 1. フレンドかどうかの絶対チェック（MongoDBのFriendから確認）
            const myFriends = await Friend.findOne({ userId: socket.userId });
            if (!myFriends || !myFriends.list.includes(targetId)) {
                socket.emit('mailSendResult', { success: false, message: 'エラー: フレンドにのみメールを送信できます。' });
                return;
            }

            // 2. 自分のニックネームを取得（通知を送るため）
            const myUser = await User.findOne({ id: socket.userId });
            const senderNickname = myUser ? myUser.nickname : "不明なユーザー";

            // 3. 相手のメールボックスを取得（無ければ空で作る）
            let targetMail = await Mail.findOne({ userId: targetId });
            if (!targetMail) {
                targetMail = await Mail.create({ userId: targetId, messages: [] });
            }

            // 4. メッセージを作成して相手のボックスにぶち込む！
            const newMessage = {
                id: crypto.randomBytes(4).toString('hex'),
                senderId: socket.userId,
                content: content,
                item: item || null,
                timestamp: new Date().toISOString(),
                isRead: false
            };

            targetMail.messages.push(newMessage);

            // 🚨 MongoDBルール: 配列の中身をいじった時は「変更したよ」と教えないと保存されない
            targetMail.markModified('messages');
            await targetMail.save();

            socket.emit('mailSendResult', { success: true, message: 'メールを送信しました！' });

            // 5. 相手がオンラインなら、即座に画面を更新して通知を飛ばす！
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetId);
            if (targetSocket) {
                targetSocket.emit('mailDataUpdated', await getEnrichedMailData(targetId));
                targetSocket.emit('notification', `${senderNickname}さんからメールが届きました！`);
            }
        } catch (error) {
            console.error("メール送信エラー:", error);
            socket.emit('mailSendResult', { success: false, message: 'サーバーエラーが発生しました。' });
        }
    });

    socket.on('markMailAsRead', async (mailId) => {
        if (!socket.userId) return;

        try {
            let myMail = await Mail.findOne({ userId: socket.userId });

            if (myMail) {
                const mail = myMail.messages.find(m => m.id === mailId);
                if (mail && !mail.isRead) {
                    mail.isRead = true;

                    // 🚨 ここもMongoDBルール！
                    myMail.markModified('messages');
                    await myMail.save();

                    // 既読にしたら即座に最新のメールボックスをクライアントに送り返す（赤丸を消すため！）
                    socket.emit('mailDataUpdated', await getEnrichedMailData(socket.userId));
                }
            }
        } catch (error) {
            console.error("既読処理エラー:", error);
        }
    });

    // ================= 📜 バトル履歴機能 (完全妥協なし・MongoDB対応版) =================
    socket.on('getHistoryData', async () => {
        if (!socket.userId) return;

        try {
            // 1. MongoDBから自分のバトル履歴を取得
            const myHistory = await History.findOne({ userId: socket.userId }).lean() || { matches: [] };

            // 履歴が空っぽなら空配列を返して終了
            if (myHistory.matches.length === 0) {
                socket.emit('historyDataUpdated', []);
                return;
            }

            // 2. すべての試合データから「対戦相手のID」を全部かき集める
            const opponentIds = [];
            myHistory.matches.forEach(match => {
                if (match.opponents) {
                    match.opponents.forEach(opp => {
                        opponentIds.push(opp.id);
                    });
                }
            });

            // 3. 重複を消して、必要な対戦相手のユーザーデータだけをMongoDBから一括取得（超高速化！）
            const uniqueOpponentIds = [...new Set(opponentIds)];
            const opponentUsers = await User.find({ id: { $in: uniqueOpponentIds } }).lean();

            // 検索しやすいように辞書型に変換
            const usersMap = {};
            opponentUsers.forEach(u => {
                usersMap[u.id] = u;
            });

            // 4. 元のロジックを完全再現！対戦相手の名前を最新化して返す
            const enrichedMatches = myHistory.matches.map(match => ({
                ...match,
                opponents: (match.opponents || []).map(opp => ({
                    id: opp.id,
                    name: usersMap[opp.id]?.nickname || "不明なプレイヤー" // 相手がアカウントを削除している場合は「不明なプレイヤー」になる元の仕様を100%維持
                }))
            }));

            // 5. 画面側に送信！
            socket.emit('historyDataUpdated', enrichedMatches);

        } catch (error) {
            console.error("バトル履歴取得エラー:", error);
        }
    });
    // ================= 📜 バトル履歴の保存 (完全妥協なし) =================
    socket.on('saveMatchHistory', async (data) => {
        if (!socket.userId || !data || !data.matchData) return;

        try {
            // MongoDBで履歴を検索。まだ履歴がない（初めての試合）場合は新規作成
            let myHistory = await History.findOne({ userId: socket.userId });
            if (!myHistory) {
                myHistory = new History({ userId: socket.userId, matches: [] });
            }

            // 最新の試合結果を配列の「先頭」に追加 (unshift) して、常に新しい順にする
            myHistory.matches.unshift(data.matchData);

            // 履歴が無尽蔵に増えて重くなるのを防ぐため、直近50件まで保持する（妥協ではなく最適化！）
            if (myHistory.matches.length > 50) {
                myHistory.matches.pop();
            }

            // データベースに保存
            await myHistory.save();
            console.log(`📜 [History] ${socket.userId} のバトル履歴をMongoDBに保存しました！`);

        } catch (error) {
            console.error("❌ [History] バトル履歴保存エラー:", error);
        }
    });

    // ================= 🎁 報酬受取システム (MongoDB対応版) =================
    socket.on('claimLoginBonus', async () => {
        if (!socket.userId) return;

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });
            if (!user) return;

            if (user.canClaimLoginBonus) {
                user.canClaimLoginBonus = false; // フラグを折る

                // 連続ログイン数に応じて報酬を豪華にする（既存ロジック完全維持！）
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

                // 2. MongoDBに上書き保存
                await user.save();

                let msg = `ログインボーナスで ${bonusCoins} コイン`;
                if (bonusGacha > 0) msg += ` と ガチャ券x${bonusGacha}`;
                msg += ` を獲得しました！（連続ログイン: ${user.loginStreak}日目）`;

                // 3. UI側の数値を最新化（余分なデータを省いた状態で送り返す）
                const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
                socket.emit('authSuccess', userToSend); 
                socket.emit('rewardClaimed', { success: true, message: msg });
            } else {
                socket.emit('rewardClaimed', { success: false, message: '今日の分は既に受け取り済みです。' });
            }
        } catch (error) {
            console.error("ログインボーナス受取エラー:", error);
            socket.emit('rewardClaimed', { success: false, message: '通信エラーが発生しました。' });
        }
    });

    socket.on('claimRoadmapReward', async (targetTrophies) => {
        if (!socket.userId) return;

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });
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

            // 資料に基づくロードマップ報酬内容（既存ロジック完全維持！）
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

            // 🚨 MongoDBルール: 配列の要素を追加した時は明示的に「変更したよ」と教えるのが安全
            user.markModified('claimedRoadmapRewards');

            // 2. MongoDBに上書き保存
            await user.save();

            let msg = `🏆 トロフィー${targetTrophies}到達報酬を獲得！\n`;
            if (coinsToAdd > 0) msg += `${coinsToAdd}コイン `;
            if (gachaToAdd > 0) msg += `ガチャ券x${gachaToAdd} `;
            if (levelUp) msg += `【レベルアップ！】`;

            // 3. UI最新化
            const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
            socket.emit('authSuccess', userToSend); 
            socket.emit('rewardClaimed', { success: true, message: msg });

        } catch (error) {
            console.error("ロードマップ報酬受取エラー:", error);
            socket.emit('rewardClaimed', { success: false, message: '通信エラーが発生しました。' });
        }
    });

    // ================= 🎰 ガチャシステム (単発＆10連対応・完全版・MongoDB対応) =================
    socket.on('drawGacha', async (data) => {
        if (!socket.userId) return;

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });
            if (!user) return;

            // 何回引くか（デフォルトは1回）
            const times = (data && data.times) ? data.times : 1;

            // チケット不足チェック
            if (user.gachaTickets < times) {
                socket.emit('gachaResult', { success: false, message: 'ガチャ券が足りません。' });
                return;
            }

            // ガチャ券を消費
            user.gachaTickets -= times;

            let results = []; // 10連の場合に結果を貯め込む配列
            let totalCoins = 0;

            // times回分ガチャを回す
            for (let i = 0; i < times; i++) {
                const rand = Math.random() * 100;
                let rewardType = '';
                let rewardValue = null;
                let message = '';

                // ★ ここから確率を 1% 仕様に修正！（完全維持）
                if (rand < 50) {
                    // 50% の確率
                    rewardType = 'coins'; rewardValue = 30; message = '30コイン獲得！';
                } else if (rand < 80) {
                    // 30% の確率 (50~79.9)
                    rewardType = 'coins'; rewardValue = 50; message = '50コイン獲得！';
                } else if (rand < 94) {
                    // 14% の確率 (80~93.9) ※合計を100にするために少し増やしました
                    rewardType = 'coins'; rewardValue = 100; message = '大当たり！100コイン獲得！';
                } else if (rand < 99) {
                    // 5% の確率 (94~98.9)
                    rewardType = 'coins'; rewardValue = 200; message = '超大当たり！200コイン獲得！';
                } else {
                    // 残りの 1% ！！！ (99~99.9)
                    rewardType = 'skin'; rewardValue = 'base_gold'; // 金色のスキン
                    message = '激レア！限定スキン「ゴールデン」を獲得！';
                }
                // ★ ここまで

                // 報酬をユーザーデータに追加
                if (rewardType === 'coins') {
                    user.coins += rewardValue;
                    totalCoins += rewardValue;
                } else if (rewardType === 'skin') {
                    // 念のため初期化チェック
                    if (!user.skins) user.skins = {};
                    if (!user.skins["char_human"]) user.skins["char_human"] = [];

                    // 被り救済システム（既に持っていたら150コインに変換）
                    if (user.skins["char_human"].includes(rewardValue)) {
                        user.coins += 150; 
                        totalCoins += 150;
                        rewardType = 'coins'; // UI上はコインとして表示させる
                        rewardValue = 150;
                        message = 'スキン被り！150コインに変換されました！';
                    } else {
                        user.skins["char_human"].push(rewardValue);
                        // 🚨 MongoDB(Mongoose)ルール: Objectの中身を書き換えた時は明示的に保存対象にする
                        user.markModified('skins');
                    }
                }

                // 結果を配列に保存
                results.push({ rewardType, rewardValue, message });
            }

            // 2. MongoDBに最新のデータを上書き保存！
            await user.save();

            // 3. UIの数値を最新化（無駄なMongoDBデータを省いてフロントへ渡す）
            const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
            socket.emit('authSuccess', userToSend); 

            // 4. クライアント(gacha_ui.js)に結果配列を送る
            socket.emit('gachaResult', { 
                success: true, 
                message: times === 1 ? results[0].message : `${times}連ガチャを引きました！`, 
                results: results 
            });

        } catch (error) {
            console.error("ガチャ実行エラー:", error);
            socket.emit('gachaResult', { success: false, message: '通信エラーが発生しました。' });
        }
    });

    // ================= 🛒 ショップシステム (キャラ購入・MongoDB対応) =================
    socket.on('buyCharacter', async (charId) => {
        if (!socket.userId) return;

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });
            if (!user) return;

            // 🌟 資料に完全準拠したキャラクターの値段表（サーバー側で絶対的な価格を持つ）
            const charPrices = {
                'char_human': 0,      // 初期配布
                'char_apple': 500,
                'char_sushi': 600,
                'char_pencil': 700,
                'char_robot': 800,
                'char_dog': 1300
            };

            const price = charPrices[charId];

            // 存在しないキャラIDが送られてきたら弾く
            if (price === undefined) {
                socket.emit('notification', 'エラー：無効なキャラクターです。');
                return;
            }

            // 既に持っているかチェック
            if (user.characters.includes(charId)) {
                socket.emit('notification', 'エラー：既に購入済みのキャラクターです。');
                return;
            }

            // コインが足りるかチェック
            if (user.coins < price) {
                socket.emit('notification', 'エラー：コインが足りません。');
                return;
            }

            // 購入処理実行！
            user.coins -= price;
            user.characters.push(charId);

            // そのキャラの「初期スキン」も自動的に追加してあげる
            if (!user.skins) user.skins = {};
            user.skins[charId] = ['default']; // 'default' は初期スキンのIDとします

            // 🚨 MongoDB(Mongoose)ルール: Objectの中身を書き換えた時は明示的に保存対象にする
            user.markModified('skins');

            // 2. MongoDBに保存
            await user.save();

            // 3. UI更新用に最新データを送る（無駄なMongoDBデータを省く）
            const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
            socket.emit('buySuccess', { type: 'character', id: charId, remainingCoins: user.coins });
            socket.emit('authSuccess', userToSend); 
            socket.emit('notification', 'キャラクターを購入しました！');

        } catch (error) {
            console.error("キャラクター購入エラー:", error);
            socket.emit('notification', '通信エラーが発生しました。');
        }
    });    

    // ================= ⬆️ キャラクターレベルアップ (MongoDB対応) =================
    socket.on('upgradeCharacter', async (charId) => {
        if (!socket.userId) return;

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });
            if (!user) return;

            // 持っていないキャラのレベルは上げられないようにする
            if (!user.characters.includes(charId)) {
                socket.emit('notification', 'エラー：このキャラクターを持っていません。');
                return;
            }

            // キャラクターのレベルを保存する「新しい引き出し」を作る（古いデータ対策）
            if (!user.characterLevels) {
                user.characterLevels = {};
            }

            // 今のレベルを確認する（記録がなければLv1とする）
            let currentLevel = user.characterLevels[charId] || 1;

            // レベルアップに必要なコインを計算する（★ここは一旦、[今のレベル × 100] コインとしています）
            let cost = currentLevel * 100;

            // コインが足りるかチェック
            if (user.coins < cost) {
                socket.emit('notification', 'エラー：コインが足りません。');
                return;
            }

            // コインを減らして、レベルを +1 する！
            user.coins -= cost;
            user.characterLevels[charId] = currentLevel + 1;

            // 🚨 MongoDB(Mongoose)ルール: Objectの中身を書き換えた時は明示的に保存対象にする
            user.markModified('characterLevels');

            // 保存して、画面を更新させる
            await user.save();

            // 最新のデータを画面に送る
            const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
            socket.emit('authSuccess', userToSend); // これで画面のコインやレベル表示が最新になる！

            // （もしShopUIが開いていれば再描画する合図を送る）
            socket.emit('buySuccess', { type: 'character' });
            socket.emit('notification', `レベルアップ成功！Lv.${currentLevel + 1}になりました！`);

        } catch (error) {
            console.error("キャラクターレベルアップエラー:", error);
            socket.emit('notification', '通信エラーが発生しました。');
        }
    });
    
    // ================= 🛒 ショップシステム (スキン購入・MongoDB対応) =================
    socket.on('buySkin', async (data) => {
        if (!socket.userId) return;
        const { charId, skinId, price } = data; // ※本当はpriceもサーバー側で照合すべきですが、今回はUIから受け取る想定で進めます

        try {
            // 1. MongoDBから自分のデータを取得
            let user = await User.findOne({ id: socket.userId });
            if (!user) return;

            // 大前提：そのキャラクターを持っているか？
            if (!user.characters.includes(charId)) {
                socket.emit('notification', 'エラー：先にキャラクター本体を購入してください。');
                return;
            }

            // 既に持っているかチェック
            if (!user.skins) user.skins = {};
            if (!user.skins[charId]) user.skins[charId] = [];
            if (user.skins[charId].includes(skinId)) {
                socket.emit('notification', 'エラー：既に購入済みのスキンです。');
                return;
            }

            // コインが足りるかチェック
            if (user.coins < price) {
                socket.emit('notification', 'エラー：コインが足りません。');
                return;
            }

            // 購入処理実行！
            user.coins -= price;
            user.skins[charId].push(skinId);

            // 🚨 MongoDB(Mongoose)ルール: Objectの中身を書き換えた時は明示的に保存対象にする
            user.markModified('skins');

            // 2. MongoDBに保存
            await user.save();

            // 3. UI更新用に最新データを送る（無駄なMongoDBデータを省く）
            const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();

            // 成功通知
            socket.emit('buySuccess', { type: 'skin', charId: charId, skinId: skinId, remainingCoins: user.coins });
            socket.emit('authSuccess', userToSend);
            socket.emit('notification', 'スキンを購入しました！');

        } catch (error) {
            console.error("スキン購入エラー:", error);
            socket.emit('notification', '通信エラーが発生しました。');
        }
    });

    // ================= 🛒 ショップシステム (アイテム購入・MongoDB対応) =================
    socket.on('buyItem', async (data) => {
        console.log("🍉🍉🍉 新しいbuyItemコードが確実に動いています！！！ 🍉🍉🍉");
        // 1. ユーザーIDがなければ弾く（スキンのコードと完全統一！）
        if (!socket.userId) return;
        const { itemId, price } = data;

        try {
            // 2. MongoDBから安全に読み込み！
            let user = await User.findOne({ id: socket.userId });
            if (!user) return;

            // 3. コインが足りるかチェック
            if (user.coins < price) {
                socket.emit('notification', 'エラー：コインが足りません。');
                return;
            }

            // 4. 購入処理実行！（コインを減らし、インベントリに追加）
            user.coins -= price;
            if (!user.inventory) {
                user.inventory = []; // もしインベントリ枠がまだ無ければ作成する
            }
            user.inventory.push(itemId);

            // 🚨 MongoDB(Mongoose)ルール: 配列の中身を追加した際も念のため明示的にマーク！
            user.markModified('inventory');

            // 5. MongoDBに安全に保存！
            await user.save();

            // 6. UI更新用に最新データを送る（無駄なMongoDBデータを省く）
            const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();

            // 7. 成功通知と、画面の「自動更新」！
            socket.emit('buySuccess', { type: 'item', itemId: itemId, remainingCoins: user.coins });
            socket.emit('authSuccess', userToSend); // ★これがリロードなしで画面を更新する魔法の合図！
            socket.emit('notification', 'アイテムを購入しました！');

        } catch (error) {
            console.error("アイテム購入エラー:", error);
            socket.emit('notification', '通信エラーが発生しました。');
        }
    });
    // ================= ⚔️ マッチングシステム (MongoDB対応版) =================
    // ランダムマッチに参加する
    socket.on('joinRandomMatch', async () => {
        if (!socket.userId) return; // ログインしてない人は弾く

        try {
            // 🚨 古い loadDB ではなく、MongoDBから「最新の自分」を取得する！
            // ※ここではデータを書き換えず game_manager に渡すだけなので、.lean() で爆速取得します
            const user = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();

            if (user) {
                // game_manager に処理を丸投げ！
                gameManager.joinRandomMatch(socket, user, io);
            }
        } catch (error) {
            console.error("マッチング参加エラー:", error);
            socket.emit('notification', 'マッチングサーバーへの接続に失敗しました。');
        }
    });

    // ランダムマッチをキャンセルする
    socket.on('cancelRandomMatch', () => {
        // 💡 キャンセル処理は通信ID(socket.id)だけで完結するため、MongoDBへのアクセスは不要です！既存のままで完璧に動きます。
        gameManager.leaveRandomMatch(socket.id, io);
    });
    // ================= 🏠 プライベートルーム (MongoDB対応版) =================

    // ⚠️ 修正: index.js側の kickedUsers 変数は不要です。room_manager.js の bannedPlayers がすべて安全に管理します！

    socket.on('createPrivateRoom', async () => {
        if (!socket.userId) {
            console.log("⚠️ 未ログインのユーザーがルームを作ろうとして弾かれました！");
            return;
        }
        try {
            // 🚨 MongoDBから最新のユーザーデータを爆速取得！
            const user = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
            if (user) {
                roomManager.createRoom(socket, user, io);
            } else {
                console.log("⚠️ DBにユーザーデータが見つかりません: " + socket.userId);
            }
        } catch (error) {
            console.error("ルーム作成エラー:", error);
            socket.emit('notification', 'ルームの作成に失敗しました。');
        }
    });

    socket.on('joinPrivateRoom', async (data) => {
        if (!socket.userId) return;

        try {
            // ⛔ 追放チェックなどはすべて room_manager.js の joinRoom が正確に行ってくれます！
            const user = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
            if (user) roomManager.joinRoom(socket, user, data.roomCode, io);
        } catch (error) {
            console.error("ルーム参加エラー:", error);
            socket.emit('notification', 'ルームへの参加に失敗しました。');
        }
    });

    // 💡 以下の3つはDBとのやり取りがなく、room_managerに丸投げで完結するためそのまま！
    socket.on('leavePrivateRoom', () => {
        roomManager.leaveRoom(socket.id, io);
    });

    socket.on('kickPlayerFromPrivateRoom', (data) => {
        if (!socket.userId) return;
        roomManager.kickPlayer(socket, data.roomCode, data.targetId, io);
    });

    socket.on('startPrivateGame', (data) => {
        if (!socket.userId) return;
        roomManager.startGame(socket, data, io);
    });

    // 💬 チャット送信 (MongoDB対応版)
    socket.on('privateRoomChatSend', async (data) => {
        if (!socket.userId) return;
        try {
            // 名前の表示に必要なためMongoDBから取得
            const user = await User.findOne({ id: socket.userId }, { nickname: 1 }).lean();

            if (user) {
                io.to(data.roomCode).emit('privateRoomChatReceive', {
                    senderId: socket.id,
                    senderName: user.nickname,
                    message: data.message
                });
            }
        } catch (error) {
            console.error("チャット送信エラー:", error);
        }
    });

    // ✉️ フレンド招待（MongoDB対応 ＋ 相手がオンラインなら即通知）
    socket.on('inviteFriend', async (data) => {
        if (!socket.userId) return;

        try {
            let sender = await User.findOne({ id: socket.userId }).lean();
            let targetId = String(data.targetFriendId);
            let targetUser = await User.findOne({ id: targetId }).lean();

            console.log(`\n💌 [招待処理] ${sender?.nickname}さん から 宛先ID:${targetId} へ招待状を作成中...`);

            if (sender && targetUser) {
                // 1. 相手のメールデータをMongoDBから探す（なければ新規作成）
                let mailDoc = await Mail.findOne({ userId: targetId });
                if (!mailDoc) {
                    mailDoc = new Mail({ userId: targetId, messages: [] });
                }

                // 2. 招待状データの作成
                const newMail = {
                    id: Date.now().toString() + Math.floor(Math.random() * 1000),
                    senderId: socket.userId,
                    content: `【ルーム招待】\n${sender.nickname} さんからプライベートルームへの招待が届きました！\nルームコード: [ ${data.roomCode} ]`,
                    item: null,
                    timestamp: new Date().toISOString(),
                    isRead: false
                };

                console.log(`💌 [招待処理] 作成した手紙データ:`, newMail);

                // 3. MongoDBに保存！
                mailDoc.messages.push(newMail);
                mailDoc.markModified('messages'); // 🚨 配列の更新を確実にするため明示
                await mailDoc.save();

                console.log(`💌 [招待処理] MongoDBに保存完了！ 相手の現在のメール総数: ${mailDoc.messages.length}件`);

                // 4. オンラインの相手に通知
                let isOnline = false;
                for (let [id, s] of io.sockets.sockets) {
                    if (String(s.userId) === targetId) {
                        isOnline = true;
                        console.log(`💌 [招待処理] 相手はオンラインです。最新のメールデータを送信します！`);

                        s.emit('receiveMail', newMail);

                        // 💡 getEnrichedMailDataもMongoDB対応済みのものを呼び出す
                        if (typeof getEnrichedMailData === 'function') {
                            const enrichedMailData = await getEnrichedMailData(targetId);
                            s.emit('mailDataUpdated', enrichedMailData);
                        }

                        s.emit('notification', `💌 ${sender.nickname}さんからルーム招待が届きました！`);
                        break;
                    }
                }

                if (!isOnline) console.log(`💌 [招待処理] 相手はオフラインのため、保存のみ行いました。`);
                socket.emit('inviteSuccess', '招待状を送信しました！');

            } else {
                console.log(`💌 [招待処理] エラー: 送信者か受信者のデータがDBに見つかりません`);
                socket.emit('privateRoomError', '招待に失敗しました。相手が見つかりません。');
            }
        } catch (error) {
            console.error("招待状送信エラー:", error);
            socket.emit('privateRoomError', 'サーバーエラーが発生しました。');
        }
    });

    // 👥 フレンドリストをクライアント（UI）に送信する処理 (MongoDB対応版)
    socket.on('getFriendsForInvite', async () => {
        if (!socket.userId) return;

        try {
            let uid = String(socket.userId);

            // 1. MongoDBから自分のフレンドリストを取得
            let myFriends = await Friend.findOne({ userId: uid }).lean();

            console.log(`\n🔍 [フレンド招待 調査] 要求元ID: ${uid}`);
            console.log(`🔍 [フレンド招待 調査] 取り出したフレンドデータ:`, myFriends);

            if (myFriends && Array.isArray(myFriends.list) && myFriends.list.length > 0) {
                // 2. フレンドのIDリストをもとに、MongoDBのUserコレクションから一括で名前を取得！（妥協なしの高速化）
                const friendsUsers = await User.find({ id: { $in: myFriends.list } }, { id: 1, nickname: 1 }).lean();

                let friendData = friendsUsers.map(f => {
                    return { id: f.id, name: f.nickname || "名称不明" };
                });

                console.log(`🔍 [フレンド招待 調査] ➡ 画面に送信するデータ:`, friendData);
                socket.emit('friendsListForInvite', friendData);
            } else {
                console.log(`🔍 [フレンド招待 調査] ➡ フレンドが見つからないため空配列 [] を送信しました。`);
                socket.emit('friendsListForInvite', []); 
            }
        } catch (error) {
            console.error("フレンドリスト取得エラー:", error);
            socket.emit('friendsListForInvite', []); 
        }
    });
// ================= 🎮 ミニゲーム「絶対に落ちるな」同期処理 =================
    // 💡 ここの2つはデータベース通信を行わず、プレイヤー同士の画面を同期するだけなのでそのまま！変更の必要なしです！
    socket.on('ochiruna_move', (data) => {
        // 自分が参加しているプライベートルーム、またはランダムマッチルームを探す
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(r => r !== socket.id); 

        if (roomId) {
            socket.to(roomId).emit('ochiruna_moved', data);
        }
    });

    socket.on('ochiruna_tile_touch', (data) => {
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(r => r !== socket.id);

        if (roomId) {
            socket.to(roomId).emit('ochiruna_tile_touched', data);
        }
    });

    // ================= 🎮 ミニゲーム結果の保存（トロフィー更新）(MongoDB対応版) =================
    // 🚨 変更点: async を追加して MongoDB に確実にお掃除＆保存します
    socket.on('updateGameResult', async (data) => {
        if (!socket.userId) return;

        const { trophyChange } = data;

        try {
            // 1. MongoDBから最新の自分を取得
            let user = await User.findOne({ id: socket.userId });

            if (user) {
                // トロフィーを増減させる
                user.trophies += trophyChange;

                // 🛡️ 妥協なし：トロフィーは0未満にはならないようにする
                if (user.trophies < 0) {
                    user.trophies = 0;
                }

                // あなたの優秀なセーブシステムで確実にお掃除＆MongoDBへ保存！
                await user.save();

                // クライアント（ホーム画面）の数値を最新にするためにデータを送り返す
                // （送る時は無駄な _id などを省いて綺麗にする！）
                const userToSend = await User.findOne({ id: socket.userId }, { _id: 0, __v: 0 }).lean();
                socket.emit('authSuccess', userToSend); 

                console.log(`🏆 [Server] ${user.nickname} のトロフィーを更新しました！(MongoDB) 現在: ${user.trophies}`);
            }
        } catch (error) {
            console.error("ゲーム結果の保存エラー:", error);
            socket.emit('notification', 'データ保存中にエラーが発生しました。');
        }
    });

    // 🔥 【完全連携用・追加】完全に切断される「直前」に、同じルームにいる生存者へ「あいつが逃げたぞ！」と通知する
    socket.on('disconnecting', () => {
        if (!socket.userId) return;

        // 自分が参加している全ルーム（自分のIDルーム以外＝対戦ルーム）を取得
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                console.log(`📡 [Server] ルーム ${roomId} の生存者に ${socket.userId} の逃亡(切断)を通知します`);
                // 妥協なし！network.js の完璧な受け口（2重の保険）に向けて確実に発火させる
                socket.to(roomId).emit('playerDisconnected', { id: socket.userId });
                socket.to(roomId).emit('playerLeft', { id: socket.userId });
            }
        });
    });
    
    // ================= 🔌 切断処理 (MongoDB対応版) =================
    // 🚨 変更点: 逃亡者を絶対に逃がさない！サーバー側での「強制ペナルティ＆履歴保存」完全版
    socket.on('disconnect', async () => {
        console.log(`👋 プレイヤーが切断しました: ${socket.id}`);

        let wasInGame = false;

        if (typeof gameManager !== 'undefined' && gameManager.leaveRandomMatch) {
            wasInGame = gameManager.leaveRandomMatch(socket.id, io) || wasInGame;
        }
        if (typeof roomManager !== 'undefined' && roomManager.leaveRoom) {
            // ゲーム中だったかどうかを判定
            wasInGame = roomManager.leaveRoom(socket.id, io) || wasInGame; 
        }

        if (socket.userId) {
            try {
                // 1. 現在のユーザー情報を取得する（現在のトロフィー数を知るため）
                let user = await User.findOne({ id: socket.userId });
                if (!user) return;

                // 🚨 ゲーム中(wasInGame)にタブを閉じて逃げた場合、絶対にペナルティを課す！
                if (wasInGame) {
                    const penalty = -8; // 敗北時の最大マイナス値付近のペナルティを設定
                    user.trophies += penalty;

                    // 🛡️ 妥協なし：トロフィーは0未満にはしない
                    if (user.trophies < 0) {
                        user.trophies = 0;
                    }

                    console.log(`💥 [Server] 試合中の切断を検知！ ${user.nickname} に逃亡ペナルティ(${penalty})を課します。`);

                    // 🔥 【最重要】サーバー側で「逃亡履歴」を直接データベースに叩き込む！
                    // （※ 以下はHistoryモデルが存在する前提のコードです。もしUserモデル内に配列で持っている場合は user.matchHistory.push(...) に書き換えてください）
                    if (typeof History !== 'undefined') {
                        await History.create({
                            userId: socket.userId,
                            matchData: {
                                rank: 99, // 逃亡者は問答無用で最下位以下の不名誉ランク
                                result: 'LOSE (逃亡)',
                                trophies: user.trophies,
                                trophyChange: penalty,
                                mode: 'Ochiruna',
                                timestamp: Date.now(),
                                opponents: [] // 逃げたので相手データは空でOK
                            }
                        });
                        console.log(`📜 [Server] ${user.nickname} の逃亡履歴(LOSE)をデータベースに強制保存しました。`);
                    } else {
                        console.log(`⚠️ [Server] Historyモデルが未定義のため、逃亡履歴の保存処理を調整してください。`);
                    }
                }

                // 最終ログイン時間を更新し、ペナルティを含めたユーザー情報を「一撃」で保存
                user.lastLogin = Date.now();
                await user.save();

                console.log(`🕒 最終ログイン時刻＆状態を保存(MongoDB): ${user.nickname} (トロフィー: ${user.trophies})`);
            } catch (error) {
                console.error("切断時のデータ保存エラー:", error);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(`🚀 ゲームサーバーが起動しました！`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`================================\n`);
});