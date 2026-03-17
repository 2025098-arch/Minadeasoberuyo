/**
 * ==================================================================================
 * 🎮 Ochiruna (絶対に落ちるな！) - Main Controller & Network Sync
 * ==================================================================================
 * * [概要]
 * クライアントのメインループ。入力の取得、ローカルロジックの更新、
 * サーバーとの状態同期、そしてレンダリングの実行を統括する。
 * ==================================================================================
 */

class OchirunaGame {
    constructor(canvasId, socket, participants, myId) {
        // --- コアモジュールのインスタンス化 ---
        this.logic = new window.OchirunaLogic();
        this.renderer = new window.OchirunaRenderer(canvasId || 'gameCanvas');

        // グローバルのInputManagerを優先して使用
        this.input = window.InputManager || new InputManager(); 

        // 渡されたsocketを使用するようにNetworkManagerに渡す
        this.network = new NetworkManager(this, socket);

        // --- ゲーム状態 ---
        this.lastTime = performance.now();
        this.isRunning = false;

        // game_client.js からもらったデータを保存
        this.localUserId = myId || null; 
        this.rawParticipants = participants || [];
        this.usersData = null; 

        // 他プレイヤーの補間用データストア
        this.interpolationTargets = {}; 
    }

    start() {
        console.log("🎮 [OchirunaGame] GameClientからの起動要求を受理しました！");

        const usersDataObj = {};
        if (Array.isArray(this.rawParticipants)) {
            this.rawParticipants.forEach(p => {
                const id = p.id || p.ID;
                if (id) usersDataObj[id] = p;
            });
        } else if (this.rawParticipants) {
            Object.assign(usersDataObj, this.rawParticipants);
        }

        this.init(this.localUserId, usersDataObj, "current_room");
    }

    stop() {
        console.log("🛑 [OchirunaGame] ゲームを停止・破棄します。");
        this.isRunning = false;
        if (this.renderer && typeof this.renderer.destroy === 'function') {
            this.renderer.destroy();
        }
    }

    async init(myUserId, roomUsersData, roomId) {
        console.log("🚀 [Main] ゲーム初期化シーケンス開始...");

        this.localUserId = myUserId;
        this.usersData = roomUsersData;

        // 1. 各モジュールの初期化
        this.logic.init(this.usersData, this.localUserId);

        // 🌟 [タイル同期] ロジック側で自分がタイルを踏んだ時のイベントをフックして送信
        this.logic.onLocalTileTouched = (tileId, state) => {
            this.network.sendTileTouch(tileId, state);
        };

        await this.renderer.init(this.logic, this.usersData); 

        if (this.input.init) this.input.init();

        // 2. ネットワーク接続
        this.network.connect(this.localUserId, roomId);

        // 3. 他プレイヤーの補間データ初期化（向き・生死ステータスも追加）
        for (const uid in this.usersData) {
            if (uid !== this.localUserId) {
                this.interpolationTargets[uid] = {
                    x: 0, y: 10, z: 0,
                    vx: 0, vy: 0, vz: 0,
                    isDead: false
                };
            }
        }

        // 4. メインループの開始
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));

        console.log("🎮 [Main] ゲームループ開始！絶対に落ちるな！");
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // --- 1. ローカルの更新 (自分自身の処理) ---
        const gameState = this.logic.update(this.input, dt);

        // --- 2. サーバーへの送信 ---
        const myPlayer = gameState.players[this.localUserId];
        if (myPlayer) {
            this.network.sendMyPosition({
                x: myPlayer.x, y: myPlayer.y, z: myPlayer.z,
                vx: myPlayer.vx, vy: myPlayer.vy, vz: myPlayer.vz, // 向きの同期に必須
                isDead: myPlayer.isDead                            // 生死判定の同期に必須
            });
        }

        // --- 3. 他プレイヤーの補間処理 (Lerp) ---
        this._interpolateOtherPlayers(gameState.players, dt);

        // --- 4. レンダリング ---
        // 🌟 バグ修正: renderer に「自分のID(this.localUserId)」を確実に渡す！
        this.renderer.update(gameState, this.input, this.localUserId); 

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * 🎭 他プレイヤーの動きと状態を同期する
     */
    _interpolateOtherPlayers(players, dt) {
        const lerpFactor = 10.0 * dt; 

        for (const uid in players) {
            if (uid === this.localUserId) continue; 

            const p = players[uid];
            const target = this.interpolationTargets[uid];

            if (target && p) {
                // 位置はガクつき防止のために滑らかにLerp補間
                p.x += (target.x - p.x) * lerpFactor;
                p.y += (target.y - p.y) * lerpFactor;
                p.z += (target.z - p.z) * lerpFactor;

                // 🌟 [同期の要] 向き(Velocity)と生死(isDead)は即座に上書きしてレンダラーに渡す
                p.vx = target.vx;
                p.vy = target.vy;
                p.vz = target.vz;
                p.isDead = target.isDead;
            }
        }
    }

    // --- ネットワークから呼ばれるコールバック ---

    onReceivePlayerUpdate(uid, data) {
        if (this.interpolationTargets[uid]) {
            // 座標情報の更新
            this.interpolationTargets[uid].x = data.x;
            this.interpolationTargets[uid].y = data.y;
            this.interpolationTargets[uid].z = data.z;

            // 🌟 向きと生死情報の更新（データ欠損対策でフォールバック値を設定）
            this.interpolationTargets[uid].vx = data.vx || 0;
            this.interpolationTargets[uid].vy = data.vy || 0;
            this.interpolationTargets[uid].vz = data.vz || 0;
            this.interpolationTargets[uid].isDead = data.isDead || false;
        }
    }

    onReceiveTileUpdate(tileId, state) {
        // Mapオブジェクトからタイルを取得
        const tile = this.logic.tiles.get(tileId);
        if (tile) {
            tile.state = state; 

            // サーバーから「踏まれた(touched)」と通知が来たら、沈み込みのタイマーを強制始動
            if (state === 'touched') {
                const fallTime = (this.logic.CONSTANTS && this.logic.CONSTANTS.TOUCH_TO_GONE_TIME) ? this.logic.CONSTANTS.TOUCH_TO_GONE_TIME : 1.0;
                tile.touchTimer = fallTime;
            }
        }
    }
}

/**
 * ==================================================================================
 * 📡 NetworkManager (通信管理システム)
 * ==================================================================================
 */
class NetworkManager {
    constructor(gameInstance, socket) {
        this.game = gameInstance;
        this.socket = socket || window.socket || window.io(); 
    }

    connect(userId, roomId) {
        console.log(`📡 [Network] サーバーへ接続完了。User:${userId}, Room:${roomId}`);

        this.socket.on('ochiruna_moved', (data) => {
            this.game.onReceivePlayerUpdate(data.uid, data);
        });

        // 🌟 バグ修正: サーバーの実装に合わせて touch と touched の両方をキャッチする
        this.socket.on('ochiruna_tile_touched', (data) => {
            this.game.onReceiveTileUpdate(data.tileId || data.id, data.state);
        });
        this.socket.on('ochiruna_tile_touch', (data) => {
            this.game.onReceiveTileUpdate(data.tileId || data.id, data.state);
        });
    }

    sendMyPosition(data) {
        if (this.socket) {
            const payload = { uid: this.game.localUserId, ...data };
            this.socket.emit('ochiruna_move', payload);
        }
    }

    sendTileTouch(tileId, state) {
        if (this.socket) {
            this.socket.emit('ochiruna_tile_touch', { tileId: tileId, state: state });
        }
    }
}

// グローバルに登録
window.OchirunaGame = OchirunaGame;