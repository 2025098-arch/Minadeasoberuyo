/**
 * ==================================================================================
 * 🎮 Ochiruna (Absolutely Don't Fall) - Master Logic System
 * ==================================================================================
 * * [概要]
 * Hex-A-Goneの物理法則、タイル状態管理、プレイヤー間同期を行うコアロジック。
 * users.jsonのステータス（レベル補正、アイテム効果、特殊能力）を完全に反映する。
 * * * [主要機能]
 * 1. Hex-A-Gone タイル生成と状態管理 (normal -> touched -> gone)
 * 2. キャラクターレベルと装備アイテムに基づく動的ステータス計算
 * 3. 独自の物理エンジン（重力、慣性、六角柱シリンダー衝突判定）
 * 4. 特殊能力の完全実装（ダッシュ、転がる、衰退）
 * 5. 動的UIインジェクション（能力・アイテムボタンの自動生成）
 * 6. 観戦モード管理（死亡判定、視点切り替えUI、生存者トラッキング）
 * 7. トロフィー計算＆リザルト画面表示（common.css連携）
 * * @version 4.1.0 (Death Sync Fix Edition)
 * ==================================================================================
 */

class OchirunaLogic {
    constructor() {
        // ==========================================
        // 🛠️ 1. システム定数＆マスターデータ定義
        // ==========================================
        this.CONSTANTS = {
            GRAVITY: 30.0,             // 重力加速度
            TERMINAL_VELOCITY: -40.0,  // 落下速度の限界
            TILE_RADIUS: 1.2,          // タイルの半径（renderer.jsと同期）
            TILE_HEIGHT: 0.6,          // タイルの厚み
            PLAYER_RADIUS: 0.4,        // プレイヤーの当たり判定半径
            LAYER_GAP: 6.0,            // レイヤー間の高さ（落下距離）
            LAYERS: 5,                 // 全レイヤー数
            GRID_RINGS: 7,             // 1レイヤーあたりの六角形のリング数（広さ）
            TOUCH_TO_GONE_TIME: 0.8,   // 踏んでからタイルが消えるまでの秒数
            BASE_SPEED_MODIFIER: 0.08, // スピード値を実際の移動速度に変換する係数
            BASE_JUMP_MODIFIER: 0.15   // パワー値を実際のジャンプ力に変換する係数
        };

        // キャラクターマスター（参考資料の完全反映・HP完全排除）
        this.MASTER_CHARACTERS = {
            "char_human":  { speed: 80, power: 80, special: "none" },
            "char_apple":  { speed: 150, power: 60, special: "roll" },
            "char_sushi":  { speed: 60, power: 60, special: "heal" }, // 今回の仕様からは除外だがデータとして保持
            "char_pencil": { speed: 10, power: 150, special: "decline" }, // 衰退は初期値最大からスタートと解釈
            "char_robot":  { speed: 80, power: 150, special: "shield" }, // 今回除外
            "char_dog":    { speed: 130, power: 120, special: "dash" }
        };

        // アイテムマスター
        this.MASTER_ITEMS = {
            "item_yakiniku": { type: "passive", target: "power", multiplier: 1.2 },
            "item_bread":    { type: "passive", target: "speed", multiplier: 1.2 }
        };

        // ==========================================
        // 📊 2. 動的状態管理（State）
        // ==========================================
        this.players = {}; // プレイヤー状態の辞書
        this.tiles = new Map(); // タイル状態のハッシュマップ (id -> tileData)

        this.localPlayerId = null;
        this.isGameActive = false;

        // 特殊能力のタイマー・状態管理
        this.abilityState = {
            isActive: false,
            type: null,
            timer: 0,
            originalStats: null // 能力終了後に戻すための退避場所
        };

        // 鉛筆（衰退）用の内部タイマー
        this.declineTimer = 0;

        // 観戦モード用の状態管理
        this.isSpectating = false;
        this.spectatorTargetId = null; // 現在カメラが追従すべきプレイヤーのID

        // 🌟 リザルト・トロフィー用の状態管理
        this.isGameOver = false;
        this.totalPlayers = 0;
        this.alivePlayersCount = 0;
        this.rankedPlayers = []; // 死亡した順に格納していく配列
    }

    // ========================================================
    // 🏁 初期化フェーズ
    // ========================================================

    /**
     * ゲームの初期化。全プレイヤーのデータを解析し、フィールドを生成する。
     * @param {Object} usersData - users.json の全体データ
     * @param {string} localUserId - 自分自身のID
     */
        init(usersData, localUserId) {
        console.log("⚙️ [Logic] 究極ロジック初期化開始。一切の妥協なし。");

        const availableIds = Object.keys(usersData);

        // 型（数値と文字列）の違いによるバグを防ぐため、文字列に統一
        const strLocalId = String(localUserId);

        // 勝手に1番目のプレイヤーを乗っ取る処理を廃止し、原因特定用のエラーを出す
        if (availableIds.length > 0 && !availableIds.includes(strLocalId)) {
            console.error(`🚨 [重大バグ] 自分のID (${strLocalId}) が参加者リストに存在しません！`);
            console.error(`🚨 [重大バグ] サーバーから来た参加者リストのID:`, availableIds);
            this.localPlayerId = strLocalId; // 乗っ取らずに、一旦自分のIDを信じる
        } else {
            this.localPlayerId = strLocalId;
        }

        this.players = {};
        this.tiles.clear();
        this.isSpectating = false;
        this.spectatorTargetId = this.localPlayerId; // 初期カメラターゲットは自分

        // 🌟 ランキング用の初期化
        this.isGameOver = false;
        this.rankedPlayers = [];
        this.totalPlayers = availableIds.length;
        this.alivePlayersCount = this.totalPlayers;

        // 1. プレイヤーの登録とステータス計算
        for (const [userId, data] of Object.entries(usersData)) {
            const isLocal = (userId === this.localPlayerId);
            const stats = this._calculateStats(data);

            // 自分のデータも他人のデータも、必ず「本来のID（userId）」で登録する！
            this.players[userId] = {
                id: userId,
                nickname: data.nickname || "Player", // リザルト用に名前保持
                trophies: data.trophies || 0,        // リザルト用にトロフィー保持
                x: (Math.random() - 0.5) * 10, // 初期位置を少しバラけさせる
                y: 10, // 最上層の上空から落下スタート
                z: (Math.random() - 0.5) * 10,
                vx: 0, vy: 0, vz: 0,
                isGrounded: false,
                isDead: false,
                isDeathProcessed: false, // 🌟 NEW: ネットワーク同期等による死の「処理漏れ」を防ぐフラグ
                rank: null, // 最終順位
                currentLayer: 0,
                // 算出されたステータスを物理演算用に保持
                baseStats: stats,
                currentStats: { ...stats }, 
                characterId: data.equipped?.character || "char_human",
                equippedItem: data.equipped?.item || null // アイテム反映
            };

            if (isLocal) {
                // userId を使って参照する
                console.log(`👤 [Logic] あなたの初期ステータス:`, this.players[userId].currentStats);
                this._setupUI(this.players[userId]);
            }
        }

        // 2. Hex-A-Gone フィールドの生成
        this._buildHexMap();
        this.isGameActive = true;
    }

    /**
     * users.json のデータから、レベルとアイテムを加味した最終ステータスを計算
     * @private
     */
    _calculateStats(userData) {
        const charId = userData.equipped?.character || "char_human";
        const level = userData.level || 1;
        const itemId = userData.equipped?.item || null; // パン、焼肉など

        // マスターから基本値を取得
        const base = this.MASTER_CHARACTERS[charId] || this.MASTER_CHARACTERS["char_human"];
        let calculated = { ...base };

        // [完全再現] レベルによるステータス上昇 (level > 1 の場合)
        if (level > 1) {
            const multiplier = Math.pow(1.05, level - 1);
            calculated.speed = Math.floor(calculated.speed * multiplier);
            calculated.power = Math.floor(calculated.power * multiplier);
        }

        // [完全再現] アイテムによるパッシブ効果の適用
        if (itemId && this.MASTER_ITEMS[itemId]) {
            const itemEffect = this.MASTER_ITEMS[itemId];
            if (itemEffect.type === "passive") {
                const target = itemEffect.target; // "speed" or "power"
                calculated[target] = Math.floor(calculated[target] * itemEffect.multiplier);
                console.log(`🍖 [Logic] アイテム適用: ${itemId} により ${target} が ${itemEffect.multiplier}倍に！`);
            }
        }

        return calculated;
    }

    /**
     * Hexagonal Grid (六角形グリッド) の数学的生成
     * @private
     */
    _buildHexMap() {
        const hexWidth = Math.sqrt(3) * this.CONSTANTS.TILE_RADIUS;
        const hexHeight = 2 * this.CONSTANTS.TILE_RADIUS;

        for (let layer = 0; layer < this.CONSTANTS.LAYERS; layer++) {
            const layerY = -layer * this.CONSTANTS.LAYER_GAP;

            // 螺旋状（リング状）に六角形を配置するアルゴリズム
            for (let q = -this.CONSTANTS.GRID_RINGS; q <= this.CONSTANTS.GRID_RINGS; q++) {
                for (let r = Math.max(-this.CONSTANTS.GRID_RINGS, -q - this.CONSTANTS.GRID_RINGS); r <= Math.min(this.CONSTANTS.GRID_RINGS, -q + this.CONSTANTS.GRID_RINGS); r++) {

                    // 軸座標(q, r)からワールド座標(x, z)への変換
                    const x = hexWidth * (q + r / 2);
                    const z = hexHeight * (3 / 4) * r;

                    const tileId = `L${layer}_Q${q}_R${r}`;

                    this.tiles.set(tileId, {
                        id: tileId,
                        layer: layer,
                        x: x,
                        y: layerY,
                        z: z,
                        state: 'normal', // normal -> touched -> gone
                        touchTimer: 0
                    });
                }
            }
        }
        console.log(`🗺️ [Logic] マップ生成完了。総タイル数: ${this.tiles.size}`);
    }

    // ========================================================
    // 🕹️ UI インジェクション（ボタン自動生成）
    // ========================================================

    /**
     * キャラクターの特殊能力に応じたボタンを画面に生成する
     * @private
     */
    _setupUI(localPlayer) {
        // 既存の能力ボタンがあれば削除
        const existingBtn = document.getElementById('ochiruna-ability-btn');
        if (existingBtn) existingBtn.remove();

        const special = localPlayer.baseStats.special;
        if (special === "none" || special === "decline") {
            // 衰退(decline)はパッシブスキルのためボタン不要
            return; 
        }

        // ボタン要素の作成
        const btn = document.createElement('button');
        btn.id = 'ochiruna-ability-btn';

        // スタイル設定（スマホでも押しやすいように右下に配置）
        Object.assign(btn.style, {
            position: 'absolute',
            bottom: '30px',
            right: '30px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 69, 0, 0.8)',
            color: 'white',
            border: '3px solid white',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            zIndex: '1000',
            userSelect: 'none'
        });

        // 能力ごとのテキスト設定
        if (special === "dash") {
            btn.innerHTML = '🐕<br>ダッシュ';
            btn.onclick = () => this._activateAbility("dash");
        } else if (special === "roll") {
            btn.innerHTML = '🍎<br>転がる';
            btn.onclick = () => this._activateAbility("roll");
        }

        // クリック時のフィードバック
        btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.9)');
        btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');

        document.body.appendChild(btn);
    }

    // ========================================================
    // 👁️ 観戦モード UI 生成ロジック
    // ========================================================

    /**
     * 死亡時に観戦用のUI（文字と切り替えボタン）を生成する
     * @private
     */
    _setupSpectatorUI() {
        // 1. 「観戦モード」のテキスト表示
        const specText = document.createElement('div');
        specText.id = 'ochiruna-spectator-text';
        specText.innerHTML = '👁️ 観戦モード';
        Object.assign(specText.style, {
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px black',
            zIndex: '1000',
            pointerEvents: 'none'
        });
        document.body.appendChild(specText);

        // 2. 「視点切り替え」ボタンの生成
        const switchBtn = document.createElement('button');
        switchBtn.id = 'ochiruna-spectator-btn';
        switchBtn.innerHTML = '🔄<br>視点切替';
        Object.assign(switchBtn.style, {
            position: 'absolute',
            bottom: '30px',
            right: '30px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 150, 255, 0.8)', // 青系の色に変更
            color: 'white',
            border: '3px solid white',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            zIndex: '1000',
            userSelect: 'none'
        });

        switchBtn.onclick = () => this._switchSpectatorTarget();
        switchBtn.addEventListener('touchstart', () => switchBtn.style.transform = 'scale(0.9)');
        switchBtn.addEventListener('touchend', () => switchBtn.style.transform = 'scale(1)');

        document.body.appendChild(switchBtn);
    }

    /**
     * 観戦対象を次の生きているプレイヤーに切り替える
     * @private
     */
    _switchSpectatorTarget() {
        // 生きているプレイヤーだけを抽出
        const alivePlayers = Object.values(this.players).filter(p => !p.isDead);

        if (alivePlayers.length === 0) return; // 全滅している場合は何もしない

        // 現在のターゲットのインデックスを探す
        const currentIndex = alivePlayers.findIndex(p => p.id === this.spectatorTargetId);

        // 次のプレイヤーへ（最後まで行ったら最初に戻るループ）
        const nextIndex = (currentIndex + 1) % alivePlayers.length;
        this.spectatorTargetId = alivePlayers[nextIndex].id;

        console.log(`👁️ [Logic] 観戦対象を切り替えました: ${this.spectatorTargetId}`);
    }


    // ========================================================
    // ⚡ 特殊能力の発動ロジック
    // ========================================================

    _activateAbility(type) {
        if (this.abilityState.isActive) return; // すでに発動中なら無視
        if (this.isSpectating) return; // 死亡・観戦中は発動不可

        // 自身のID(this.localPlayerId)で参照する
        const p = this.players[this.localPlayerId];
        if (!p) return;

        this.abilityState.isActive = true;
        this.abilityState.type = type;
        this.abilityState.timer = 10.0; // 発動時間10秒

        // 現在のステータスを退避
        this.abilityState.originalStats = { ...p.currentStats };

        // 能力ごとのステータス変動を適用
        if (type === "dash") {
            console.log("⚡ [Logic] 犬の能力「ダッシュ」発動！ スピード1.5倍！");
            p.currentStats.speed = Math.floor(p.currentStats.speed * 1.5);
        } else if (type === "roll") {
            console.log("⚡ [Logic] りんごの能力「転がる」発動！ スピード2倍、ジャンプ不可！");
            p.currentStats.speed = Math.floor(p.currentStats.speed * 2.0);
            p.currentStats.power = 0; // ジャンプ力を奪う
        }

        // UIボタンをクールダウン表示に変更
        const btn = document.getElementById('ochiruna-ability-btn');
        if (btn) btn.style.backgroundColor = 'gray';
    }

    // ========================================================
    // 🔄 メインアップデート・ループ（毎フレーム実行）
    // ========================================================

    /**
     * @param {Object} input - 入力オブジェクト (getMovementVector, isJumpPressed などを想定)
     * @param {number} dt - デルタタイム（前フレームからの経過秒数）
     */
    update(input, dt) {
        if (!this.isGameActive || this.isGameOver) return this._getGameState(); // 終了時は更新ストップ

        // 自身のID(this.localPlayerId)で参照する
        const p = this.players[this.localPlayerId];
        if (p && !p.isDead) {
            this._updateAbilities(p, dt);
            this._applyPhysics(p, input, dt);
            this._checkCollisions(p);
        }

        // 🌟 死亡判定は全員分ローカルで回す（全員死亡を検知するため）
        for (let id in this.players) {
            const player = this.players[id];
            this._checkDeath(player); // isDead になっていても isDeathProcessed が済むまで処理を回す
        }

        this._updateTiles(dt);

        // ※ここで他のプレイヤーの位置情報をネットワーク補間する処理が入る想定
        return this._getGameState();
    }

    /**
     * 鉛筆の「衰退」や、発動中の能力タイマーの処理
     */
    _updateAbilities(p, dt) {
        // 1. 鉛筆のパッシブスキル「衰退」: 常にパワーが減り、スピードが上がる (HP処理は削除)
        if (p.characterId === "char_pencil") {
            this.declineTimer += dt;
            if (this.declineTimer >= 1.0) { // 1秒ごとに更新
                this.declineTimer = 0;
                // パワーを減少（最低値10）、スピードを増加（最大値150）
                p.currentStats.power = Math.max(10, p.currentStats.power - 2);
                p.currentStats.speed = Math.min(150, p.currentStats.speed + 2);
            }
        }

        // 2. アクティブスキルのタイマー処理（ダッシュ、転がる）
        if (this.abilityState.isActive) {
            this.abilityState.timer -= dt;
            if (this.abilityState.timer <= 0) {
                // 能力終了、ステータスを元に戻す
                console.log(`🛑 [Logic] 能力終了。ステータスを元に戻します。`);
                p.currentStats.speed = this.abilityState.originalStats.speed;
                p.currentStats.power = this.abilityState.originalStats.power;
                this.abilityState.isActive = false;

                // UIリセット
                const btn = document.getElementById('ochiruna-ability-btn');
                if (btn) btn.style.backgroundColor = 'rgba(255, 69, 0, 0.8)';
            }
        }
    }

    /**
     * 物理演算（移動、重力、ジャンプ）
     */
    _applyPhysics(p, input, dt) {
        // --- 移動ベクトル計算 ---
        // メソッドが存在しない場合に備えた安全網（クラッシュ防止）
        const moveVec = (input && typeof input.getMovementVector === 'function') 
            ? input.getMovementVector() 
            : { x: 0, z: 0 }; 

        const moveSpeed = p.currentStats.speed * this.CONSTANTS.BASE_SPEED_MODIFIER;

        // 空中では移動制御が鈍くなる（Hex-A-Gone仕様）
        const controlModifier = p.isGrounded ? 1.0 : 0.4;

        // 慣性を表現するため、Lerp(線形補間)で速度を目標値に近づける
        const targetVx = moveVec.x * moveSpeed;
        const targetVz = moveVec.z * moveSpeed;
        p.vx += (targetVx - p.vx) * 10.0 * dt * controlModifier;
        p.vz += (targetVz - p.vz) * 10.0 * dt * controlModifier;

        // --- 重力の適用 ---
        if (!p.isGrounded) {
            p.vy -= this.CONSTANTS.GRAVITY * dt;
            if (p.vy < this.CONSTANTS.TERMINAL_VELOCITY) {
                p.vy = this.CONSTANTS.TERMINAL_VELOCITY;
            }
        }

        // --- ジャンプ処理 ---
        // ジャンプ入力の安全網
        const isJump = (input && typeof input.isJumpPressed === 'function') 
            ? input.isJumpPressed() 
            : false;

        // users.jsonから計算された「power」がジャンプ力に直結する
        if (p.isGrounded && isJump && p.currentStats.power > 0) {
            const jumpForce = Math.sqrt(p.currentStats.power) * this.CONSTANTS.BASE_JUMP_MODIFIER;
            p.vy = 12.0 + jumpForce; // 基本ジャンプ力 + ステータス補正
            p.isGrounded = false;
        }

        // --- 座標の更新 ---
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        // 初期化（当たり判定で接地したらtrueになる）
        p.isGrounded = false; 
    }

    /**
     * Hexagonal Cylinder と Player (Sphere/Cylinder) の精密な当たり判定
     */
    _checkCollisions(p) {
        // 足元の位置（プレイヤーのY座標が基準）
        const footY = p.y;
        let onTile = false;
        let currentLayerCheck = 0;

        for (let [tileId, tile] of this.tiles.entries()) {
            if (tile.state === 'gone') continue; // 消えたタイルは無視

            // --- 1. Y軸（高さ）の判定 ---
            // タイルの上面から少し下までを許容範囲とする
            const tileTop = tile.y + (this.CONSTANTS.TILE_HEIGHT / 2);
            if (footY > tileTop + 0.5 || footY < tileTop - 0.5) continue;

            if (p.vy > 0) continue; // 上昇中（ジャンプ中）はすり抜ける

            // --- 2. XZ平面（円と六角形の近似）の判定 ---
            const dx = p.x - tile.x;
            const dz = p.z - tile.z;
            const distanceSq = dx * dx + dz * dz;
            const collisionRadius = this.CONSTANTS.TILE_RADIUS * 0.85 + this.CONSTANTS.PLAYER_RADIUS;

            if (distanceSq <= collisionRadius * collisionRadius) {
                // 接地判定成功！
                p.y = tileTop;
                p.vy = 0;
                p.isGrounded = true;
                currentLayerCheck = tile.layer;
                onTile = true;

                // タイルの状態遷移（Hex-A-Goneの肝）
                if (tile.state === 'normal') {
                    tile.state = 'touched';
                    tile.touchTimer = this.CONSTANTS.TOUCH_TO_GONE_TIME;

                    // 自分が踏んだタイルを即座にネットワークに通知！
                    if (typeof this.onLocalTileTouched === 'function') {
                        this.onLocalTileTouched(tile.id, 'touched');
                    }
                }

                // 一つのタイルに乗ったら他のタイルの判定は不要
                break;
            }
        }

        if (onTile) {
            p.currentLayer = currentLayerCheck;
        }
    }

    /**
     * タイルのタイマー管理（touched -> gone）
     */
    _updateTiles(dt) {
        for (let [tileId, tile] of this.tiles.entries()) {
            if (tile.state === 'touched') {
                tile.touchTimer -= dt;
                if (tile.touchTimer <= 0) {
                    tile.state = 'gone'; // 奈落へ落とす
                }
            }
        }
    }

    // ========================================================
    // 💀 死亡・順位・トロフィー・ゲーム終了 関連
    // ========================================================

    /**
     * 落下死の判定と観戦モードへの移行（🌟同期ズレ完全対策版）
     */
    _checkDeath(p) {
        const deathY = -((this.CONSTANTS.LAYERS - 1) * this.CONSTANTS.LAYER_GAP) - 10;

        // 1. ローカルでの物理落下による死亡検知
        if (p.y < deathY && !p.isDead) {
            p.isDead = true;
        }

        // 2. 死亡状態だが、まだ順位等の処理が終わっていない場合
        // （他スクリプトから通信で強制的に p.isDead = true にされた場合でも、ここで確実に拾う）
        if (p.isDead && !p.isDeathProcessed) {
            p.isDeathProcessed = true; // 処理済みにマーク

            // 🌟 順位を確定させる (残っている人数がそのまま順位になる)
            p.rank = this.alivePlayersCount;
            this.rankedPlayers.push(p);
            this.alivePlayersCount--;

            // 自分が死んだ場合の特別処理
            if (p.id === this.localPlayerId) {
                console.log(`💀 [Logic] 絶対に落ちるなって言ったよね`);

                // 画面のど真ん中に特大煽りテロップを表示
                this._showTauntLog();

                this.isSpectating = true;

                // 能力ボタンを非表示にする
                const btn = document.getElementById('ochiruna-ability-btn');
                if (btn) btn.style.display = 'none';

                // まだ生き残りがいるなら観戦モードへ
                if (this.alivePlayersCount > 0) {
                    this._switchSpectatorTarget(); 
                    this._setupSpectatorUI();
                }
            } else {
                console.log(`💀 [Logic] プレイヤー ${p.id} が脱落しました。 (順位: ${p.rank}位)`);
            }

            // 🌟 全員死んだらゲーム終了（表彰台へ）
            if (this.alivePlayersCount === 0) {
                this._finishGame();
            }
        }
    }

    /**
     * 煽りログを画面のど真ん中に表示する
     */
    _showTauntLog() {
        const tauntText = document.createElement('div');
        tauntText.innerHTML = '絶対に落ちるなって言ったよね？';
        Object.assign(tauntText.style, {
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            color: '#ff2222', fontSize: '48px', fontWeight: '900', WebkitTextStroke: '2px white',
            textShadow: '0 0 20px red', zIndex: '2000', pointerEvents: 'none',
            opacity: '1', transition: 'opacity 3s ease-in-out', textAlign: 'center', width: '100%',
            fontFamily: "'Helvetica Neue', Arial, sans-serif"
        });

        document.body.appendChild(tauntText);

        // 3秒後にフェードアウトして消す
        setTimeout(() => { tauntText.style.opacity = '0'; }, 3000);
        setTimeout(() => { tauntText.remove(); }, 6000);
    }

    /**
     * ブロスタ風のトロフィー増減を計算する
     */
    _calculateTrophyChange(rank, totalPlayers, currentTrophies) {
        if (totalPlayers <= 1) return 0; // 1人の場合は変動なし

        // 0.0 (1位) ～ 1.0 (ビリ) の割合を出す
        const position = (rank - 1) / (totalPlayers - 1); 

        let winBase = 8; // 1位の基本獲得数
        let loseBase = 0; // ビリの基本減少数

        // 帯域ごとのマイナス調整
        if (currentTrophies < 100) {
            loseBase = 1; 
        } else if (currentTrophies < 300) {
            loseBase = 3;
        } else if (currentTrophies < 500) {
            loseBase = 6;
        } else if (currentTrophies < 800) {
            loseBase = 8;
        } else {
            loseBase = 10;
        }

        let change = 0;
        if (position < 0.5) {
            // 上位陣 (0 ~ 0.49): プラス変動
            change = Math.round(winBase * (1 - position * 2));
        } else {
            // 下位陣 (0.5 ~ 1.0): マイナス変動
            change = Math.round(-loseBase * ((position - 0.5) * 2));
        }

        return change;
    }

    /**
     * ゲーム終了時の処理（リザルト画面表示とデータ保存）
     */
    _finishGame() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        console.log("🏁 [Logic] ゲーム終了！表彰台を生成します。");

        // 観戦UIを消す
        const specText = document.getElementById('ochiruna-spectator-text');
        const specBtn = document.getElementById('ochiruna-spectator-btn');
        if (specText) specText.remove();
        if (specBtn) specBtn.remove();

        // ランク順（1位が先頭）に並び替える
        this.rankedPlayers.sort((a, b) => a.rank - b.rank);

        // トロフィーの計算と保存処理を呼び出す
        this._saveTrophiesAndShowResult();
    }

    /**
     * トロフィー計算、サーバー送信、そして common.css 準拠の UI 表示
     */
    _saveTrophiesAndShowResult() {
        // 自分のトロフィー増減を計算
        const myPlayer = this.rankedPlayers.find(p => String(p.id) === this.localPlayerId);
        let myTrophyChange = 0;
        if (myPlayer) {
            myTrophyChange = this._calculateTrophyChange(myPlayer.rank, this.totalPlayers, myPlayer.trophies);

            // --- ⚠️ バックエンド(users.json)保存用の擬似APIコール ---
            console.log(`📡 [API] トロフィー更新リクエスト送信: ID=${this.localPlayerId}, 変動=${myTrophyChange}`);
            fetch('/api/update-trophies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.localPlayerId, trophyChange: myTrophyChange })
            }).catch(err => console.warn("バックエンド未接続のためトロフィー保存はスキップされました", err));
        }

        // ============================================
        // 🏆 common.css のスタイルを完全活用したモーダル生成
        // ============================================

        // 1. 背景オーバーレイ (modal クラスで弾むアニメーションの親)
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal'; // common.css の .modal

        // 2. モーダルコンテンツ (popInBounce アニメーション適用)
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content'; // common.css の .modal-content
        modalContent.style.textAlign = 'center';
        modalContent.style.paddingBottom = '20px'; // 下部の余白調整

        // 3. ヘッダータイトル (グラデーションとシャドウ)
        const title = document.createElement('h2');
        title.innerHTML = '🏆 試合結果 🏆';
        modalContent.appendChild(title);

        // 4. リスト表示 (common.css の ul / li カード型スタイルを適用)
        const listWrapper = document.createElement('ul');
        listWrapper.style.marginTop = '20px';

        this.rankedPlayers.forEach(p => {
            const isMe = (String(p.id) === this.localPlayerId);
            const trophyChange = this._calculateTrophyChange(p.rank, this.totalPlayers, p.trophies);
            const sign = trophyChange > 0 ? '+' : '';
            const color = trophyChange > 0 ? 'var(--accent-blue-dark)' : (trophyChange < 0 ? 'var(--accent-red)' : 'var(--text-light)');

            const listItem = document.createElement('li');
            // 自分の結果は黄色いボーダーでハイライト
            if (isMe) {
                listItem.style.borderColor = 'var(--accent-yellow)';
                listItem.style.backgroundColor = '#fffde7'; // 薄い黄色背景
                listItem.style.transform = 'scale(1.02)';
                listItem.style.fontWeight = '900';
            }

            // 左側：順位と名前
            const infoSpan = document.createElement('span');
            infoSpan.innerHTML = `<span style="font-size: 1.2rem; color: var(--accent-blue); margin-right: 10px;">#${p.rank}</span> ${p.nickname} ${isMe ? '(あなた)' : ''}`;

            // 右側：トロフィー
            const trophySpan = document.createElement('span');
            trophySpan.style.color = color;
            trophySpan.style.fontSize = '1.2rem';
            trophySpan.style.fontWeight = 'bold';
            trophySpan.innerHTML = `🏆 ${p.trophies + trophyChange} (${sign}${trophyChange})`;

            listItem.appendChild(infoSpan);
            listItem.appendChild(trophySpan);
            listWrapper.appendChild(listItem);
        });

        modalContent.appendChild(listWrapper);

        // 5. カウントダウンテキスト
        const countdownText = document.createElement('p');
        countdownText.style.color = 'var(--text-light)';
        countdownText.style.fontWeight = 'bold';
        countdownText.innerHTML = '10秒後にホームへ戻ります...';
        modalContent.appendChild(countdownText);

        // DOMに追加して表示
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // 🌟 10秒カウントダウン演出 & ホーム画面遷移
        let timeLeft = 10;
        const timerInterval = setInterval(() => {
            timeLeft--;
            countdownText.innerHTML = `${timeLeft}秒後にホームへ戻ります...`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);

                // 1. リザルトのモーダルを完全に削除
                modalOverlay.remove();

                // 2. 自分のトロフィー増減を計算し、サーバーに送信して保存！(あなたのSocket.ioを使用)
                const myPlayer = this.rankedPlayers.find(p => String(p.id) === this.localPlayerId);
                if (myPlayer) {
                    const myTrophyChange = this._calculateTrophyChange(myPlayer.rank, this.totalPlayers, myPlayer.trophies);

                    // ★ここでサーバーの index.js に向けてセーブ命令を出します
                    if (window.socket) {
                        window.socket.emit('updateGameResult', { trophyChange: myTrophyChange });
                    }
                }

                // 3. ゲーム画面のコンテナを非表示にする
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) gameContainer.style.display = 'none';

                // 4. ログイン画面を隠し、ホーム画面をアクティブにする（シームレスな帰還）
                const authScreen = document.getElementById('auth-screen');
                const homeScreen = document.getElementById('home-screen');
                if (authScreen) authScreen.classList.replace('active', 'hidden');
                if (homeScreen) homeScreen.classList.replace('hidden', 'active');

                console.log("🏠 [Logic] ホーム画面へシームレスに帰還し、セーブを実行しました！");
            }
        }, 1000);
    }

    /**
     * Rendererへ渡すための状態オブジェクトを生成
     * 🌟 NEW: 観戦モード用の情報（spectatorTargetId）も追加で渡す
     */
    _getGameState() {
        // Array.from() を使って Map を配列化（Renderer側で処理しやすくする）
        const tilesArray = Array.from(this.tiles.values()).map(t => ({
            id: t.id, x: t.x, y: t.y, z: t.z, layer: t.layer, state: t.state
        }));

        return {
            players: this.players,
            tiles: tilesArray,
            spectatorTargetId: this.spectatorTargetId // カメラ制御用に今のターゲットを渡す
        };
    }
}

// グローバルスコープへエクスポート
window.OchirunaLogic = OchirunaLogic;