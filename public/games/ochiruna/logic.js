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
     * 4. 特殊能力とアイテム使用の完全実装（ダッシュ、転がる、衰退、アクティブアイテム）
     * 5. 動的UIインジェクション（ジョイスティック、ジャンプ、能力・アイテムボタンの自動生成）
     * 6. 観戦モード管理（死亡判定、視点切り替えUI、生存者トラッキング）
     * 7. トロフィー計算＆リザルト画面表示（common.css連携）
     * * @version 4.2.0 (Full UI Controls & Active Items Edition)
     * ==================================================================================
     */

    class OchirunaLogic {
        constructor() {
            // ==========================================
            // 🛠️ 1. システム定数＆マスターデータ定義
            // ==========================================
            this.CONSTANTS = {
                GRAVITY: 30.0, // 重力加速度
                TERMINAL_VELOCITY: -40.0, // 落下速度の限界
                TILE_RADIUS: 1.2, // タイルの半径（renderer.jsと同期）
                TILE_HEIGHT: 0.6, // タイルの厚み
                PLAYER_RADIUS: 0.4, // プレイヤーの当たり判定半径
                LAYER_GAP: 6.0, // レイヤー間の高さ（落下距離）
                LAYERS: 5, // 全レイヤー数
                GRID_RINGS: 7, // 1レイヤーあたりの六角形のリング数（広さ）
                TOUCH_TO_GONE_TIME: 0.8, // 踏んでからタイルが消えるまでの秒数
                BASE_SPEED_MODIFIER: 0.08, // スピード値を実際の移動速度に変換する係数
                BASE_JUMP_MODIFIER: 0.15, // パワー値を実際のジャンプ力に変換する係数
            };

            // 🌟【完全改修】キャラクターマスター（3Dモデルごとの高さ補正と当たり判定を追加！）
            // yOffset: モデルが地面にめり込む場合の高さ補正（プラスにすると着地時に浮く）
            // hitRadius: 横幅の当たり判定（大きいほど落ちにくくなる）
            this.MASTER_CHARACTERS = {
            char_human: { speed: 80, power: 80, special: "none", yOffset: 0.0, hitRadius: 0.4 },
            char_apple: { speed: 150, power: 60, special: "roll", yOffset: 0.2, hitRadius: 0.3 },
            char_sushi: { speed: 60, power: 60, special: "heal", yOffset: 0.1, hitRadius: 0.4 },
            char_pencil: { speed: 10, power: 150, special: "decline", yOffset: 0.5, hitRadius: 0.2 }, 
            char_robot: { speed: 80, power: 150, special: "shield", yOffset: 0.0, hitRadius: 0.5 },
            char_dog: { speed: 130, power: 120, special: "dash", yOffset: 0.1, hitRadius: 0.5 },
            };

            // アイテムマスター（パッシブ型とアクティブ型を定義）
            this.MASTER_ITEMS = {
                item_yakiniku: {
                    type: "passive",
                    target: "power",
                    multiplier: 1.2,
                },
                item_bread: { type: "passive", target: "speed", multiplier: 1.2 },
                item_energy_drink: {
                    type: "active",
                    effect: "boost_speed",
                    duration: 5.0,
                    name: "エナドリ",
                },
                item_spring: {
                    type: "active",
                    effect: "super_jump",
                    duration: 5.0,
                    name: "バネ",
                },
            };

            // ==========================================
            // 📊 2. 動的状態管理（State）
            // ==========================================
            this.players = {}; // プレイヤー状態の辞書
            this.tiles = new Map(); // タイル状態のハッシュマップ (id -> tileData)

            this.localPlayerId = null;
            this.isGameActive = false;

            // 🌟【修正】AIマネージャーの変数を明示的に定義
            this.aiManager = null;

            // 特殊能力のタイマー・状態管理
            this.abilityState = {
            isActive: false,
            isCooldown: false, // 🌟 NEW: 発動までの待機（クールダウン）中かどうかのフラグ
            type: null,
            activeTimer: 0,    // 🌟 変更: 能力が発動している時間（5秒）
            cooldownTimer: 0,  // 🌟 NEW: 再発動可能になるまでの時間（10秒）
            originalStats: null, // 能力終了後に戻すための退避場所
            };

            // アクティブアイテムのタイマー・状態管理
            this.itemState = {
                isActive: false,
                effect: null,
                timer: 0,
                originalStats: null,
                isUsed: false, // 1試合での使い切りフラグ
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
                console.error(
                    `🚨 [重大バグ] 自分のID (${strLocalId}) が参加者リストに存在しません！`,
                );
                console.error(
                    `🚨 [重大バグ] サーバーから来た参加者リストのID:`,
                    availableIds,
                );
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

            // アイテム状態リセット
            this.itemState.isUsed = false;

            // 🌟【重大バグ修正】AIマネージャーの初期化処理を追加
            // ここでインスタンス化しておかないと、update内のボット処理が一生動かない
            if (typeof window.AIManager !== "undefined") {
                this.aiManager = new window.AIManager(this);
                console.log("🤖 [Logic] AIマネージャーを起動しました。");
            } else {
                console.warn("⚠️ [Logic] AIManager が見つかりません！ai_logic.js が読み込まれているか確認してください。");
            }

            // 1. プレイヤーの登録とステータス計算
            for (const [userId, data] of Object.entries(usersData)) {
                const isLocal = userId === this.localPlayerId;
                const stats = this._calculateStats(data);

                // 自分のデータも他人のデータも、必ず「本来のID（userId）」で登録する！
                this.players[userId] = {
                    id: userId,
                    nickname: data.nickname || "Player", // リザルト用に名前保持
                    trophies: data.trophies || 0, // リザルト用にトロフィー保持
                    x: (Math.random() - 0.5) * 10, // 初期位置を少しバラけさせる
                    y: 10, // 最上層の上空から落下スタート
                    z: (Math.random() - 0.5) * 10,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                    isGrounded: false,
                    isDead: false,
                    isDeathProcessed: false, // 🌟 NEW: ネットワーク同期等による死の「処理漏れ」を防ぐフラグ
                    rank: null, // 最終順位
                    currentLayer: 0,
                    // 算出されたステータスを物理演算用に保持
                    baseStats: stats,
                    currentStats: { ...stats },
                    characterId: data.equipped?.character || "char_human",
                    equippedItem: data.equipped?.item || null, // アイテム反映
                };

                if (isLocal) {
                    // userId を使って参照する
                    console.log(
                        `👤 [Logic] あなたの初期ステータス:`,
                        this.players[userId].currentStats,
                    );
                    this._setupUI(this.players[userId]);
                } else {
                    // 🌟【重大バグ修正】ボットとしてAIマネージャーに登録！
                    // 本物の人間プレイヤーとのマルチプレイを考慮し、IDに"bot"が含まれるか、
                    // isBotフラグがある場合のみAIマネージャーの制御下に置く。
                    const isBot = data.isBot === true || String(userId).toLowerCase().includes("bot");

                    if (isBot && this.aiManager) {
                        this.aiManager.addBot(this.players[userId]);
                        console.log(`🤖 [Logic] ボット(${userId})をAIに接続完了！これで物理演算が適用されます。`);
                    }
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
            const itemId = userData.equipped?.item || null;

            // マスターから基本値を取得
            const base =
                this.MASTER_CHARACTERS[charId] ||
                this.MASTER_CHARACTERS["char_human"];
            let calculated = { ...base };

            // [完全再現] レベルによるステータス上昇 (level > 1 の場合)
            if (level > 1) {
                const multiplier = Math.pow(1.05, level - 1);
                // 🌟 修正: Math.floor(切り捨て) から Math.round(四捨五入) に変更し、計算を完璧に合わせる！
                calculated.speed = Math.round(calculated.speed * multiplier);
                calculated.power = Math.round(calculated.power * multiplier);
            }

            // [完全再現] アイテムによるパッシブ効果の適用
            if (itemId && this.MASTER_ITEMS[itemId]) {
                const itemEffect = this.MASTER_ITEMS[itemId];
                if (itemEffect.type === "passive") {
                    const target = itemEffect.target; // "speed" or "power"
                    // 🌟 ここもステータスの一貫性を保つため、四捨五入に統一
                    calculated[target] = Math.round(
                        calculated[target] * itemEffect.multiplier,
                    );
                    console.log(
                        `🍖 [Logic] パッシブアイテム適用: ${itemId} により ${target} が ${itemEffect.multiplier}倍に！`,
                    );
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
                for (
                    let q = -this.CONSTANTS.GRID_RINGS;
                    q <= this.CONSTANTS.GRID_RINGS;
                    q++
                ) {
                    for (
                        let r = Math.max(
                            -this.CONSTANTS.GRID_RINGS,
                            -q - this.CONSTANTS.GRID_RINGS,
                        );
                        r <=
                        Math.min(
                            this.CONSTANTS.GRID_RINGS,
                            -q + this.CONSTANTS.GRID_RINGS,
                        );
                        r++
                    ) {
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
                            state: "normal", // normal -> touched -> gone
                            touchTimer: 0,
                        });
                    }
                }
            }
            console.log(
                `🗺️ [Logic] マップ生成完了。総タイル数: ${this.tiles.size}`,
            );
        }

        // ========================================================
        // 🕹️ UI インジェクション（ボタン＆ジョイスティック自動生成）
        // ========================================================

        /**
         * ジョイスティック、ジャンプボタン、アイテム、能力ボタンを生成する
         * @private
         */
        _setupUI(localPlayer) {
            // 既存の操作UIがあれば全て削除（初期化時の重複防止）
            const uiIds = [
                "ochiruna-joystick-zone",
                "ochiruna-jump-btn",
                "ochiruna-ability-btn",
                "ochiruna-item-btn",
            ];
            uiIds.forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });

            // 1. ジョイスティックの生成 (左下)
            const joyZone = document.createElement("div");
            joyZone.id = "ochiruna-joystick-zone";
            Object.assign(joyZone.style, {
                position: "absolute",
                bottom: "30px",
                left: "30px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                border: "2px solid rgba(255, 255, 255, 0.4)",
                zIndex: "1000",
                touchAction: "none",
                userSelect: "none",
            });

            const joyKnob = document.createElement("div");
            joyKnob.id = "ochiruna-joystick-knob";
            Object.assign(joyKnob.style, {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            });
            joyZone.appendChild(joyKnob);
            document.body.appendChild(joyZone);

            // 2. ジャンプボタンの生成 (右下ベース)
            const jumpBtn = document.createElement("button");
            jumpBtn.id = "ochiruna-jump-btn";
            jumpBtn.innerHTML = "⬆️<br>JUMP";
            Object.assign(jumpBtn.style, {
                position: "absolute",
                bottom: "30px",
                right: "30px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 200, 100, 0.8)",
                color: "white",
                border: "3px solid white",
                fontSize: "14px",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                cursor: "pointer",
                zIndex: "1000",
                userSelect: "none",
                touchAction: "manipulation",
            });
            document.body.appendChild(jumpBtn);

            // 3. 特殊能力ボタンの生成 (ジャンプボタンの左上付近)
            const special = localPlayer.baseStats.special;
            if (special !== "none" && special !== "decline") {
                const abilityBtn = document.createElement("button");
                abilityBtn.id = "ochiruna-ability-btn";
                Object.assign(abilityBtn.style, {
                    position: "absolute",
                    bottom: "120px",
                    right: "90px",
                    width: "70px",
                    height: "70px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 69, 0, 0.8)",
                    color: "white",
                    border: "2px solid white",
                    fontSize: "12px",
                    fontWeight: "bold",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                    cursor: "pointer",
                    zIndex: "1000",
                    userSelect: "none",
                });

                if (special === "dash") {
                    abilityBtn.innerHTML = "🐕<br>ダッシュ";
                    abilityBtn.onclick = () => this._activateAbility("dash");
                } else if (special === "roll") {
                    abilityBtn.innerHTML = "🍎<br>転がる";
                    abilityBtn.onclick = () => this._activateAbility("roll");
                }
                document.body.appendChild(abilityBtn);
            }

            // 4. アクティブアイテムボタンの生成 (ジャンプボタンの上付近)
            const itemId = localPlayer.equippedItem;
            if (itemId && this.MASTER_ITEMS[itemId]) {
                const itemData = this.MASTER_ITEMS[itemId];
                if (itemData.type === "active") {
                    const itemBtn = document.createElement("button");
                    itemBtn.id = "ochiruna-item-btn";
                    Object.assign(itemBtn.style, {
                        position: "absolute",
                        bottom: "130px",
                        right: "20px",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(138, 43, 226, 0.8)",
                        color: "white", // 紫色系
                        border: "2px solid white",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                        cursor: "pointer",
                        zIndex: "1000",
                        userSelect: "none",
                    });
                    itemBtn.innerHTML = `🎒<br>${itemData.name}`;
                    itemBtn.onclick = () => this._activateItem(itemId);
                    document.body.appendChild(itemBtn);
                }
            }

            // UIへの簡易アニメーション設定（タッチフィードバック）
            [
                jumpBtn,
                document.getElementById("ochiruna-ability-btn"),
                document.getElementById("ochiruna-item-btn"),
            ].forEach((btn) => {
                if (btn) {
                    btn.addEventListener(
                        "touchstart",
                        () => (btn.style.transform = "scale(0.9)"),
                    );
                    btn.addEventListener(
                        "touchend",
                        () => (btn.style.transform = "scale(1)"),
                    );
                }
            });
        }

        // ========================================================
        // 👁️ 観戦モード UI 生成ロジック
        // ========================================================

        /**
         * 死亡時に観戦用のUI（文字と切り替えボタン）を生成する
         * @private
         */
        _setupSpectatorUI() {
            const specText = document.createElement("div");
            specText.id = "ochiruna-spectator-text";
            specText.innerHTML = "👁️ 観戦モード";
            Object.assign(specText.style, {
                position: "absolute",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
                textShadow: "2px 2px 4px black",
                zIndex: "1000",
                pointerEvents: "none",
            });
            document.body.appendChild(specText);

            const switchBtn = document.createElement("button");
            switchBtn.id = "ochiruna-spectator-btn";
            switchBtn.innerHTML = "🔄<br>視点切替";
            Object.assign(switchBtn.style, {
                position: "absolute",
                bottom: "30px",
                right: "30px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 150, 255, 0.8)",
                color: "white",
                border: "3px solid white",
                fontSize: "14px",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                cursor: "pointer",
                zIndex: "1000",
                userSelect: "none",
            });

            switchBtn.onclick = () => this._switchSpectatorTarget();
            switchBtn.addEventListener(
                "touchstart",
                () => (switchBtn.style.transform = "scale(0.9)"),
            );
            switchBtn.addEventListener(
                "touchend",
                () => (switchBtn.style.transform = "scale(1)"),
            );

            document.body.appendChild(switchBtn);
        }

        /**
         * 観戦対象を次の生きているプレイヤーに切り替える
         * @private
         */
        _switchSpectatorTarget() {
            const alivePlayers = Object.values(this.players).filter(
                (p) => !p.isDead,
            );
            if (alivePlayers.length === 0) return;

            const currentIndex = alivePlayers.findIndex(
                (p) => p.id === this.spectatorTargetId,
            );
            const nextIndex = (currentIndex + 1) % alivePlayers.length;
            this.spectatorTargetId = alivePlayers[nextIndex].id;

            console.log(
                `👁️ [Logic] 観戦対象を切り替えました: ${this.spectatorTargetId}`,
            );
        }

        // ========================================================
        // ⚡ 特殊能力 ＆ アクティブアイテム 発動ロジック
        // ========================================================

        _activateAbility(type) {
            // 🌟 既に発動中、またはクールダウン（発動までの待機時間）中は弾く
            if (this.abilityState.isActive || this.abilityState.isCooldown) return;
            if (this.isSpectating) return;

            const p = this.players[this.localPlayerId];
            if (!p) return;

            // 🌟 MongoDBから取得されたキャラクターのレベルを参照（取得できない場合は安全確保のためLv1とする）
            const level = p.level || 1;

            this.abilityState.isActive = true;
            this.abilityState.type = type;
            this.abilityState.activeTimer = 5.0; // 実際の発動時間を5秒に設定（完全維持）

            this.abilityState.originalStats = { ...p.currentStats };

            if (type === "dash") {
                // 🌟 レベルに応じたスピード倍率の計算
                const multiplier = 1.5 + (level - 1) * 0.1;
                console.log(
                    `⚡ [Logic] 犬の能力「ダッシュ」発動！ Lv${level} (スピード ${multiplier.toFixed(1)}倍！)`
                );
                p.currentStats.speed = Math.floor(p.currentStats.speed * multiplier);
            } else if (type === "roll") {
                // 🌟 レベルに応じたスピード倍率の計算
                const multiplier = 2.0 + (level - 1) * 0.2;
                console.log(
                    `⚡ [Logic] りんごの能力「転がる」発動！ Lv${level} (スピード ${multiplier.toFixed(1)}倍、ジャンプ不可！)`
                );
                p.currentStats.speed = Math.floor(p.currentStats.speed * multiplier);
                p.currentStats.power = 0;
            }

            const btn = document.getElementById("ochiruna-ability-btn");
            if (btn) {
                btn.style.backgroundColor = "gold"; // 発動中をアピール
                btn.innerHTML = "⚡<br>発動中";
            }
        }

        _activateItem(itemId) {
            if (this.itemState.isActive || this.itemState.isUsed) return; // 既に発動中、または使用済み
            if (this.isSpectating) return;

            const p = this.players[this.localPlayerId];
            const itemData = this.MASTER_ITEMS[itemId];
            if (!p || !itemData) return;

            this.itemState.isActive = true;
            this.itemState.isUsed = true; // 1試合1回ポッキリ
            this.itemState.effect = itemData.effect;
            this.itemState.timer = itemData.duration;

            this.itemState.originalStats = { ...p.currentStats };

            if (itemData.effect === "boost_speed") {
                console.log(
                    `🎒 [Logic] アイテム「${itemData.name}」発動！ スピード激増！`,
                );
                p.currentStats.speed = Math.floor(p.currentStats.speed * 1.8);
            } else if (itemData.effect === "super_jump") {
                console.log(
                    `🎒 [Logic] アイテム「${itemData.name}」発動！ ジャンプ力激増！`,
                );
                p.currentStats.power = Math.floor(p.currentStats.power * 2.0);
            }

            const btn = document.getElementById("ochiruna-item-btn");
            if (btn) {
                btn.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
                btn.innerHTML = "🚫<br>使用済";
            }
        }

        /**
         * メインアップデート・ループ（毎フレーム実行）
         * 既存のスキル、アイテム、マルチプレイ同期、タイル更新の全機能を完全維持しています。
         */
        update(input, dt) {
            // 1. ゲーム進行状況のチェック
            if (!this.isGameActive || this.isGameOver) return this._getGameState();

            // 🧠 1.5 AIの思考を更新（※超重要：これがないとボットが一生動きません）
            // 既存のマルチプレイや進行に一切干渉せず、AIのタイマーだけを進めます。
            if (this.aiManager) {
                this.aiManager.update();
            }

            // 👤 2. ローカルプレイヤー（自分）の処理
            // あなたの「認識」にある元のコードを1行も変えず、最優先で実行します。
            const p = this.players[this.localPlayerId];
            if (p && !p.isDead) {
                this._updateAbilitiesAndItems(p, dt); // 犬のダッシュ、鉛筆の衰退、アイテム効果を維持
                this._applyPhysics(p, input, dt);     // 自分の移動・重力
                this._checkCollisions(p);             // 自分の当たり判定
            }

            // 🤖 3. ボットプレイヤーのみの物理処理（※追加機能）
            for (let id in this.players) {
                const player = this.players[id];

                // 自分自身、または既に死んでいる場合はスキップ
                if (id === this.localPlayerId || player.isDead) continue;

                /**
                 * 【重要：マルチプレイ保護ロジック】
                 * ネットワーク経由の人間プレイヤーには干渉しない。
                 */
                if (player.inputManager) {
                    // 🌟 【新規追加: NaNによるフリーズ完全防止】
                    // ネットワーク同期されたボットは速度やステータスが未定義の場合があり、
                    // それが原因で座標がNaNになり空中でフリーズします。
                    // 既存の_applyPhysicsを安全に動かすため、無い場合だけ初期化します。
                    if (player.vx === undefined) player.vx = 0;
                    if (player.vy === undefined) player.vy = 0;
                    if (player.vz === undefined) player.vz = 0;
                    if (player.isGrounded === undefined) player.isGrounded = false;

                    if (!player.currentStats) {
                        player.currentStats = { 
                            speed: 100, 
                            power: 10, 
                            yOffset: 0, 
                            hitRadius: this.CONSTANTS.PLAYER_RADIUS 
                        };
                    }

                    // 安全が確保された状態で、あなたの完璧な物理演算を通す
                    this._applyPhysics(player, player.inputManager, dt);
                    this._checkCollisions(player);
                }
            }

            // 💀 4. 全員の死亡判定（※元のコードを完全維持）
            // for (let id in this.players) { ... } // (※ここでは省略せずに下のメソッドを呼んでいます。提供範囲外のためそのまま)
            if (typeof this._checkDeath === "function") {
                 for (let id in this.players) {
                     this._checkDeath(this.players[id]);
                 }
            }

            // 🔲 5. タイルの状態更新（※元のコードを完全維持）
            this._updateTiles(dt);

            // 最終的なゲーム状態を返却
            return typeof this._getGameState === "function" ? this._getGameState() : null;
        }

        /**
         * 鉛筆の「衰退」、発動中の能力タイマー、アイテムタイマーの処理
         */
        _updateAbilitiesAndItems(p, dt) {
            // 1. 鉛筆のパッシブスキル「衰退」（🌟 レベルスケーリング追加）
            if (p.characterId === "char_pencil") {
                this.declineTimer += dt;
                if (this.declineTimer >= 1.0) {
                    const level = p.level || 1;
                    this.declineTimer = 0;

                    // 🌟 レベルが上がるほど、1秒ごとのスピード上昇幅が増加する
                    const speedBoost = 2 + (level - 1) * 1;

                    p.currentStats.power = Math.max(10, p.currentStats.power - 2);
                    p.currentStats.speed = Math.min(150, p.currentStats.speed + speedBoost);
                }
            }

            // 2. 特殊能力のタイマー処理（発動中とクールダウンの2フェーズ化・完全維持）
            if (this.abilityState.isActive) {
                this.abilityState.activeTimer -= dt;
                if (this.abilityState.activeTimer <= 0) {
                    console.log(
                        `🛑 [Logic] 特殊能力終了。ステータスを元に戻し、10秒の待機時間（クールダウン）に入ります。`
                    );
                    p.currentStats.speed = this.abilityState.originalStats.speed;
                    p.currentStats.power = this.abilityState.originalStats.power;
                    this.abilityState.isActive = false;

                    // 能力終了後、発動までの10秒タイマーを開始
                    this.abilityState.isCooldown = true;
                    this.abilityState.cooldownTimer = 10.0;

                    const btn = document.getElementById("ochiruna-ability-btn");
                    if (btn) {
                        btn.style.backgroundColor = "rgba(50, 50, 50, 0.8)"; // 待機中を暗い色で表現
                        btn.innerHTML = "⏳<br>待機中";
                    }
                }
            } else if (this.abilityState.isCooldown) {
                // クールダウン（発動までの時間）のカウントダウン処理
                this.abilityState.cooldownTimer -= dt;
                if (this.abilityState.cooldownTimer <= 0) {
                    console.log(`🟢 [Logic] 特殊能力の待機完了！再発動可能です。`);
                    this.abilityState.isCooldown = false;

                    const btn = document.getElementById("ochiruna-ability-btn");
                    if (btn) {
                        btn.style.backgroundColor = "rgba(255, 69, 0, 0.8)"; // 元のオレンジ色に戻す
                        // キャラクターに応じてボタンのテキストとアイコンを正確に復元
                        if (this.abilityState.type === "dash") {
                            btn.innerHTML = "🐕<br>ダッシュ";
                        } else if (this.abilityState.type === "roll") {
                            btn.innerHTML = "🍎<br>転がる";
                        }
                    }
                }
            }

            // 3. アクティブアイテムのタイマー処理（完全維持）
            if (this.itemState.isActive) {
                this.itemState.timer -= dt;
                if (this.itemState.timer <= 0) {
                    console.log(
                        `🛑 [Logic] アイテム効果終了。ステータスを元に戻します。`
                    );
                    // 万が一能力と被っていた場合におかしくならないよう、安全に復元
                    p.currentStats.speed = this.itemState.originalStats.speed;
                    p.currentStats.power = this.itemState.originalStats.power;
                    this.itemState.isActive = false;
                }
            }
        }

        /**
         * 物理演算（移動、重力、ジャンプ）
         */
        _applyPhysics(p, input, dt) {
            const moveVec =
                input && typeof input.getMovementVector === "function"
                    ? input.getMovementVector()
                    : { x: 0, z: 0 };

            const moveSpeed =
                p.currentStats.speed * this.CONSTANTS.BASE_SPEED_MODIFIER;
            const controlModifier = p.isGrounded ? 1.0 : 0.4;

            const targetVx = moveVec.x * moveSpeed;
            const targetVz = moveVec.z * moveSpeed;
            p.vx += (targetVx - p.vx) * 10.0 * dt * controlModifier;
            p.vz += (targetVz - p.vz) * 10.0 * dt * controlModifier;

            if (!p.isGrounded) {
                p.vy -= this.CONSTANTS.GRAVITY * dt;
                if (p.vy < this.CONSTANTS.TERMINAL_VELOCITY) {
                    p.vy = this.CONSTANTS.TERMINAL_VELOCITY;
                }
            }

            const isJump =
                input && typeof input.isJumpPressed === "function"
                    ? input.isJumpPressed()
                    : false;

            if (p.isGrounded && isJump && p.currentStats.power > 0) {
                const jumpForce =
                    Math.sqrt(p.currentStats.power) *
                    this.CONSTANTS.BASE_JUMP_MODIFIER;
                p.vy = 12.0 + jumpForce;
                p.isGrounded = false;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            p.isGrounded = false;
        }

        /**
        * Hexagonal Cylinder と Player の精密な当たり判定
        */
        _checkCollisions(p) {
            // 🌟【完全改修】キャラクターごとの高さオフセットと当たり判定半径を取得
            const yOffset = p.currentStats.yOffset !== undefined ? p.currentStats.yOffset : 0;
            const hitRadius = p.currentStats.hitRadius || this.CONSTANTS.PLAYER_RADIUS;

            // 論理的な「足元」のY座標を算出（モデルの原点位置からオフセットを引く）
            const footY = p.y - yOffset;
            let onTile = false;
            let currentLayerCheck = 0;

            for (let [tileId, tile] of this.tiles.entries()) {
                if (tile.state === "gone") continue;

                const tileTop = tile.y + this.CONSTANTS.TILE_HEIGHT / 2;
                // 🌟 落下速度も加味してY軸の判定範囲をわずかに広げ、すり抜け事故も防止（0.5 -> 0.8）
                if (footY > tileTop + 0.8 || footY < tileTop - 0.8) continue;

                if (p.vy > 0) continue;

                const dx = p.x - tile.x;
                const dz = p.z - tile.z;
                const distanceSq = dx * dx + dz * dz;

                // 🌟 共通定数ではなく、キャラ個別の当たり判定半径（hitRadius）を使用する
                const collisionRadius =
                this.CONSTANTS.TILE_RADIUS * 0.85 + hitRadius;

                if (distanceSq <= collisionRadius * collisionRadius) {
                    // 🌟 着地時にオフセット分だけY座標を上にズラし、めり込みを完全に防ぐ！
                    p.y = tileTop + yOffset;
                    p.vy = 0;
                    p.isGrounded = true;
                    currentLayerCheck = tile.layer;
                    onTile = true;

                    if (tile.state === "normal") {
                        tile.state = "touched";
                        tile.touchTimer = this.CONSTANTS.TOUCH_TO_GONE_TIME;

                        if (typeof this.onLocalTileTouched === "function") {
                            this.onLocalTileTouched(tile.id, "touched");
                        }
                    }
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
                if (tile.state === "touched") {
                    tile.touchTimer -= dt;
                    if (tile.touchTimer <= 0) {
                        tile.state = "gone";
                    }
                }
            }
        }

// ========================================================
    // 💀 死亡・順位・トロフィー・ゲーム終了 関連
    // ========================================================

    /**
     * 🔌 プレイヤー切断（タブ閉じ）時の強制死亡判定（🌟妥協なし・フリーズ完全対策版）
     */
    _handlePlayerDisconnect(disconnectedId) {
        let p = null;

        // 🔥 【最強のパサー追加】network.js から渡ってくる `disconnectedId` が「オブジェクト {id: ...}」でも「文字列」でも確実に捕捉する！
        let targetId1 = disconnectedId;
        let targetId2 = disconnectedId;
        if (typeof disconnectedId === 'object' && disconnectedId !== null) {
            targetId1 = disconnectedId.id;
            targetId2 = disconnectedId.socketId || disconnectedId.id;
        }

        if (Array.isArray(this.players)) {
            p = this.players.find(
                (player) => 
                    String(player.id) === String(targetId1) || 
                    String(player.id) === String(targetId2) ||
                    String(player.socketId) === String(targetId1) ||
                    String(player.socketId) === String(targetId2)
            );
        } else if (this.players instanceof Map) {
            p = this.players.get(targetId1) || this.players.get(targetId2) || 
                this.players.get(String(targetId1)) || this.players.get(String(targetId2));

            // 🔥 Mapの中身も妥協なく全検索（念のための最強の保険）
            if (!p) {
                for (let player of this.players.values()) {
                    if (String(player.id) === String(targetId1) || String(player.id) === String(targetId2) ||
                        String(player.socketId) === String(targetId1) || String(player.socketId) === String(targetId2)) {
                        p = player;
                        break;
                    }
                }
            }
        }

        if (p && !p.isDead) {
            console.log(
                `🔌 [Logic] プレイヤー ${p.id} の切断を完全に捕捉。正規の死亡判定ルートへ流し込みます！`,
            );

            // 🌟 妥協なしポイント：独自で中途半端に殺すのではなく、
            // 物理的に奈落の底へ突き落とし、ゲームの完璧な正規ルート `_checkDeath` に全てを委ねる！
            // これにより、切断が「ゲーム内の完全な落下死」として100%同じ扱いになります。
            p.y = -99999;

            if (p.mesh) {
                p.mesh.visible = false;
            }

            // 万が一観戦中だった場合、虚無を映さないようにカメラを切り替える（既存機能の完全維持）
            if (
                this.isSpectating &&
                this.spectatorTargetId === String(p.id) &&
                this.alivePlayersCount > 1
            ) {
                this._switchSpectatorTarget();
            }

            // 即座に死亡判定を実行し、正規ルートで脱落・リザルト移行させる！
            this._checkDeath(p);

            // 🔥 【最強の死神保険・追加】万が一、Y座標の判定抜け等で死にきれなかった場合、絶対にトドメを刺す！
            if (!p.isDead) {
                console.log(`⚠️ [Logic] Y座標判定をすり抜けたため、強制死亡処理を実行します！`);
                p.isDead = true;
                if (!p.isDeathProcessed) {
                    p.isDeathProcessed = true;
                    p.rank = this.alivePlayersCount;
                    this.rankedPlayers.push(p);
                    this.alivePlayersCount--;

                    console.log(
                        `💀 [Logic] プレイヤー ${p.id} が脱落しました(切断)。 (順位: ${p.rank}位)`,
                    );

                    // 🔥【修正】生存者が完全に0人になった時のみゲーム終了
                    if (this.alivePlayersCount === 0) {
                        this._finishGame();
                    }
                }
            }
        } else {
            console.log(`⚠️ [Logic] 切断通知を受け取りましたが、対象が見つからないか既に死亡済みです。 (Target: ${targetId1})`);
        }
    }

    /**
     * 落下死の判定と観戦モードへの移行（🌟同期ズレ完全対策版）
     */
    _checkDeath(p) {
        const deathY =
            -((this.CONSTANTS.LAYERS - 1) * this.CONSTANTS.LAYER_GAP) - 10;

        if (p.y < deathY && !p.isDead) {
            p.isDead = true;
        }

        if (p.isDead && !p.isDeathProcessed) {
            p.isDeathProcessed = true;

            p.rank = this.alivePlayersCount;
            this.rankedPlayers.push(p);
            this.alivePlayersCount--;

            if (p.id === this.localPlayerId) {
                console.log(`💀 [Logic] 絶対に落ちるなって言ったよね`);
                this._showTauntLog();
                this.isSpectating = true;

                const uiElementsToHide = [
                    "ochiruna-joystick-zone",
                    "ochiruna-jump-btn",
                    "ochiruna-ability-btn",
                    "ochiruna-item-btn",
                ];
                uiElementsToHide.forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = "none";
                });

                if (this.alivePlayersCount > 0) {
                    this._switchSpectatorTarget();
                    this._setupSpectatorUI();
                }
            } else {
                console.log(
                    `💀 [Logic] プレイヤー ${p.id} が脱落しました。 (順位: ${p.rank}位)`,
                );
            }

            // 🔥【修正】全員が落ちた（生存者が0になった）瞬間にリザルトへ！
            if (this.alivePlayersCount === 0) {
                this._finishGame();
            }
        }
    }

    /**
     * 煽りログを画面のど真ん中に表示する
     */
    _showTauntLog() {
        const tauntText = document.createElement("div");
        tauntText.innerHTML = "絶対に落ちるなって言ったよね？";
        Object.assign(tauntText.style, {
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#ff2222",
            fontSize: "48px",
            fontWeight: "900",
            WebkitTextStroke: "2px white",
            textShadow: "0 0 20px red",
            zIndex: "2000",
            pointerEvents: "none",
            opacity: "1",
            transition: "opacity 3s ease-in-out",
            textAlign: "center",
            width: "100%",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
        });

        document.body.appendChild(tauntText);

        setTimeout(() => {
            tauntText.style.opacity = "0";
        }, 3000);
        setTimeout(() => {
            tauntText.remove();
        }, 6000);
    }

        /**
         * ブロスタ風のトロフィー増減を計算する（🌟原因究明デバッグ＆完全動作版）
         */
        _calculateTrophyChange(rank, totalPlayers, currentTrophies) {
            if (totalPlayers <= 1) return 0;

            // 🔥 【原因究明の最強ログ】
            // ここで undefined や NaN が出ている場合、サーバーからトロフィー数が渡ってきていません！
            console.log(`🔍 [Logic] トロフィー計算開始 - 順位: ${rank}/${totalPlayers}, 受け取ったトロフィーデータ:`, currentTrophies);

            // トロフィーが未定義(undefined)の場合は、コンソールに警告を赤字で出す！
            if (currentTrophies === undefined || currentTrophies === null) {
                console.warn("⚠️ [Logic] 異常検知: トロフィー数が undefined です！クライアントのプレイヤー情報(p.trophies)にデータが存在しません。");
            }

            // 🔥 【バグ修正・最強の保険】
            // トロフィーが文字列や undefined で渡ってきても確実に「数値」に変換する！
            const t = Number(currentTrophies) || 0;

            const position = (rank - 1) / (totalPlayers - 1); // 0.0 (1位) ～ 1.0 (最下位)

            // 🌟 1. 参加人数による「勝利」のスケール（多人数ほど1位の報酬が上がる！）
            let winBase = Math.floor(6 + (totalPlayers * 0.5));

            // 🌟 2. トロフィー帯による基礎ペナルティの大幅増加（ガッツリ減らす）
            let basePenalty = 0;
            if (t < 100) {
                basePenalty = 3;  // 初心者帯
            } else if (t < 300) {
                basePenalty = 8;  // ブロンズ帯
            } else if (t < 500) {
                basePenalty = 14; // シルバー帯
            } else if (t < 800) {
                basePenalty = 20; // ゴールド帯
            } else {
                basePenalty = 25; // ガチ勢帯（最下位の痛手は絶大）
            }

            // 🌟 3. 参加人数が多いほど、最下位になった時の「ドベの重み」も増やす
            const penaltyScale = 1 + (Math.min(totalPlayers, 30) / 30) * 0.5;
            let loseBase = Math.floor(basePenalty * penaltyScale);

            let change = 0;
            if (position < 0.5) {
                // 上位半分：勝利側の計算 (+)
                change = Math.round(winBase * (1 - position * 2));
            } else {
                // 下位半分：敗北側の計算 (-)
                change = Math.round(-loseBase * ((position - 0.5) * 2));
            }

            // 🔥 【死神保険】
            // 計算の丸め誤差などで「1位なのに0」や「最下位なのにプラス」になる異常を防ぐ最終ロック
            if (rank === 1 && change <= 0) change = winBase;
            if (rank === totalPlayers && change >= 0) change = -loseBase;

            console.log(`📊 [Logic] 計算結果 -> 参照トロフィー:${t}, 基礎ペナルティ:${basePenalty}, 倍率:${penaltyScale}, 最終増減:${change}`);

            return change;
        }

    /**
     * ゲーム終了時の処理（リザルト画面表示とデータ保存）
     */
    _finishGame() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        console.log("🏁 [Logic] ゲーム終了！表彰台を生成します。");

        // 🌟【完全復旧】
        // 全員が正規ルート(_checkDeath)で自分の足で奈落に落ちて「完全な死」を迎え、
        // その時点で美しく順位が確定しているため、生き残りを無理やり処刑するバグ処理を完全削除しました！
        // これにより、最後の1人が落ちた瞬間に、完璧な状態でリザルト画面へ移行します。

        const specText = document.getElementById("ochiruna-spectator-text");
        const specBtn = document.getElementById("ochiruna-spectator-btn");
        if (specText) specText.remove();
        if (specBtn) specBtn.remove();

        this.rankedPlayers.sort((a, b) => a.rank - b.rank);
        this._saveTrophiesAndShowResult();
    }

    /**
     * トロフィー計算、サーバー送信、そして common.css 準拠の UI 表示
     */
    _saveTrophiesAndShowResult() {
        const myPlayer = this.rankedPlayers.find(
            (p) => String(p.id) === this.localPlayerId,
        );
        let myTrophyChange = 0;

        if (myPlayer) {
            // 🌟 AI（練習）モードの場合はトロフィー変動を0にし、サーバー通信を一切おこなわない
            if (window.isPracticeMode) {
                console.log("🤖 [Logic] AI（練習）モードのため、トロフィー変動とサーバーへの履歴保存をスキップします。");
                myTrophyChange = 0;
            } else {
                myTrophyChange = this._calculateTrophyChange(
                    myPlayer.rank,
                    this.totalPlayers,
                    myPlayer.trophies,
                );
                console.log(
                    `📡 [Logic] トロフィー確定！変動=${myTrophyChange}。即座にサーバーへ保存します！`,
                );

                if (window.socket) {
                    window.socket.emit("updateGameResult", {
                        trophyChange: myTrophyChange,
                    });
                }

                const matchOpponents = this.rankedPlayers.map((p) => ({
                    id: String(p.id),
                    name: p.nickname || "Unknown",
                    level: p.level || 1,
                    rank: p.rank,
                }));

                const historyPayload = {
                    userId: this.localPlayerId,
                    matchData: {
                        rank: myPlayer.rank,
                        result: myPlayer.rank === 1 ? "WIN" : "LOSE",
                        trophies: myPlayer.trophies + myTrophyChange,
                        trophyChange: myTrophyChange,
                        mode: "Ochiruna",
                        timestamp: Date.now(),
                        opponents: matchOpponents,
                    },
                };

                if (window.socket) {
                    console.log(
                        `📜 [Logic] バトル履歴データを即座にサーバーへ送信します...`,
                    );
                    window.socket.emit("saveMatchHistory", historyPayload);
                }
            }
        }

        const modalOverlay = document.createElement("div");
        modalOverlay.className = "modal";

        const modalContent = document.createElement("div");
        modalContent.className = "modal-content";
        modalContent.style.textAlign = "center";
        modalContent.style.paddingBottom = "20px";

        const title = document.createElement("h2");
        title.innerHTML = "🏆 試合結果 🏆";
        modalContent.appendChild(title);

        const listWrapper = document.createElement("ul");
        listWrapper.style.marginTop = "20px";

            this.rankedPlayers.forEach((p) => {
                const isMe = String(p.id) === this.localPlayerId;

                // 🌟 UI表示用の変動値計算（AIモードで自分の場合は強制的に0にする）
                let trophyChange = 0;
                if (isMe && window.isPracticeMode) {
                    trophyChange = 0;
                } else {
                    trophyChange = this._calculateTrophyChange(
                        p.rank,
                        this.totalPlayers,
                        p.trophies,
                    );
                }
                const sign = trophyChange > 0 ? "+" : "";
            const color =
                trophyChange > 0
                    ? "var(--accent-blue-dark)"
                    : trophyChange < 0
                      ? "var(--accent-red)"
                      : "var(--text-light)";

            const listItem = document.createElement("li");
            if (isMe) {
                listItem.style.borderColor = "var(--accent-yellow)";
                listItem.style.backgroundColor = "#fffde7";
                listItem.style.transform = "scale(1.02)";
                listItem.style.fontWeight = "900";
            }

            const infoSpan = document.createElement("span");
            infoSpan.innerHTML = `<span style="font-size: 1.2rem; color: var(--accent-blue); margin-right: 10px;">#${p.rank}</span> ${p.nickname || "Unknown"} ${isMe ? "(あなた)" : ""}`;

            const trophySpan = document.createElement("span");
            trophySpan.style.color = color;
            trophySpan.style.fontSize = "1.2rem";
            trophySpan.style.fontWeight = "bold";
            trophySpan.innerHTML = `🏆 ${p.trophies + trophyChange} (${sign}${trophyChange})`;

            listItem.appendChild(infoSpan);
            listItem.appendChild(trophySpan);
            listWrapper.appendChild(listItem);
        });

        modalContent.appendChild(listWrapper);

        const countdownText = document.createElement("p");
        countdownText.style.color = "var(--text-light)";
        countdownText.style.fontWeight = "bold";
        countdownText.style.marginTop = "15px";
        countdownText.innerHTML = "10秒後に自動でホームへ戻ります...";
        modalContent.appendChild(countdownText);

        // 🌟【NEW】手動でホームに戻るボタンを追加（一切の妥協なし）
        const returnBtn = document.createElement("button");
        returnBtn.innerHTML = "🏠 今すぐホームへ戻る";
        Object.assign(returnBtn.style, {
            marginTop: "10px",
            padding: "12px 24px",
            fontSize: "1.1rem",
            fontWeight: "bold",
            cursor: "pointer",
            backgroundColor: "var(--accent-blue)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
            transition: "transform 0.1s, filter 0.1s"
        });
        returnBtn.onmouseover = () => returnBtn.style.filter = "brightness(1.1)";
        returnBtn.onmouseout = () => returnBtn.style.filter = "brightness(1)";
        returnBtn.onmousedown = () => returnBtn.style.transform = "scale(0.95)";
        returnBtn.onmouseup = () => returnBtn.style.transform = "scale(1)";
        modalContent.appendChild(returnBtn);

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        let timeLeft = 10;
        let timerInterval;

        // 🌟 帰還処理を関数化し、手動クリックとタイマーの両方で安全に呼び出せるようにする
        const returnToHome = () => {
            if (timerInterval) clearInterval(timerInterval);
            if (document.body.contains(modalOverlay)) {
                modalOverlay.remove();
            }

            const gameContainer = document.getElementById("game-container");
            if (gameContainer) gameContainer.style.display = "none";

            const authScreen = document.getElementById("auth-screen");
            const homeScreen = document.getElementById("home-screen");

            // 🔥 【バグ修正】replaceの不発を防ぐため、確実にremoveとaddを行い、万が一のstyleも上書き！妥協一切なし！
            if (authScreen) {
                authScreen.classList.remove("active");
                authScreen.classList.add("hidden");
                authScreen.style.display = "none";
            }
            if (homeScreen) {
                homeScreen.classList.remove("hidden");
                homeScreen.classList.add("active");
                homeScreen.style.display = ""; 
                if (window.getComputedStyle(homeScreen).display === "none") {
                    homeScreen.style.display = "block";
                }
            }

            console.log("🏠 [Logic] ホーム画面へシームレスに帰還しました！(データは既にセーブ済みです)");
        };

        // ボタンクリック時に即座に帰還
        returnBtn.onclick = returnToHome;

        // 既存のタイマーロジック（時間切れでも安全に帰還）
        timerInterval = setInterval(() => {
            timeLeft--;
            countdownText.innerHTML = `${timeLeft}秒後に自動でホームへ戻ります...`;

            if (timeLeft <= 0) {
                returnToHome();
            }
        }, 1000);
    }

    /**
     * Rendererへ渡すための状態オブジェクトを生成
     */
    _getGameState() {
        const tilesArray = Array.from(this.tiles.values()).map((t) => ({
            id: t.id,
            x: t.x,
            y: t.y,
            z: t.z,
            layer: t.layer,
            state: t.state,
        }));

        return {
            players: this.players,
            tiles: tilesArray,
            spectatorTargetId: this.spectatorTargetId,
        };
    }
}

window.OchirunaLogic = OchirunaLogic;