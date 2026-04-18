/**
 * ==================================================================================
 * 🤖 Ochiruna - AI Logic Manager (物理エンジン完全同期・高機動対応・フリーズ修正版)
 * ==================================================================================
 * [修正・維持ポイント]
 * - 🐛 停止バグ修正：物理エンジンが要求する getMovementVector 等のメソッドをクラス直下に完全復旧。
 * - 🚀 Speed/Power同期：p.currentStats.speed/power (80) へ直接アクセスし完全同期。
 * - 判定ロジック修正：物理エンジンのステータス("normal", "touched")を正確に認識。
 * - 慣性対応：Speed 80 の高速移動に合わせ、ターゲット到達判定と未来予測距離を拡張。
 * - 全機能維持：引きこもり防止、フェイルセーフ、階層移動、予測ジャンプは一切削らず最適化。
 * ==================================================================================
 */

class OchirunaAI {
    constructor(botPlayer, logicReference) {
        this.bot = botPlayer;
        this.logic = logicReference;

        this.aiLevel = this.bot.aiLevel || 'normal';

        this.currentInput = { x: 0, z: 0 };
        this.isJumping = false;

        this.targetTile = null;
        this.targetOffset = { x: 0, z: 0 }; 
        this.thinkTimer = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;

        // AIレベルに応じた思考間隔
        if (this.aiLevel === 'hard') {
            this.thinkInterval = Math.floor(Math.random() * 3) + 2; 
        } else if (this.aiLevel === 'normal') {
            this.thinkInterval = Math.floor(Math.random() * 10) + 10;
        } else {
            this.thinkInterval = Math.floor(Math.random() * 20) + 20;
        }
    }

    update() {
        if (this.bot.isDead) {
            this.reset();
            return;
        }

        this.thinkTimer++;

        // 思考の実施
        const shouldThink = (this.aiLevel === 'hard') 
            ? (this.thinkTimer >= this.thinkInterval) 
            : (this.thinkTimer >= this.thinkInterval || !this.targetTile);

        if (shouldThink) {
            this.thinkTimer = 0;
            this._analyzeEnvironment();
        }

        this._calculateMovement();
        this._evaluateJumpNecessity();
    }

    /**
     * 周辺環境の分析：物理エンジンのタイル状態("normal", "touched")に準拠
     */
    _analyzeEnvironment() {
        if (!this.logic.tiles) return;

        const currentY = this.bot.y || 0;
        const layerGap = this.logic.CONSTANTS?.LAYER_GAP || 20;
        const botLayer = Math.max(0, Math.round(-currentY / layerGap));

        let myCurrentTile = null;
        let myCurrentDistSq = Infinity;
        let safeTilesOnLayer = [];

        // 全タイルスキャン
        for (const tile of this.logic.tiles.values()) {
            if (tile.layer === botLayer) {
                const dx = tile.x - this.bot.x;
                const dz = tile.z - this.bot.z;
                const distSq = dx * dx + dz * dz;

                if (distSq < myCurrentDistSq) {
                    myCurrentDistSq = distSq;
                    myCurrentTile = tile;
                }

                // 🌟数値の0ではなく、文字列の状態をチェック
                if (tile.state === "normal" || tile.state === "touched") {
                    safeTilesOnLayer.push({ tile, distSq });
                }
            }
        }

        // ターゲットの有効性チェック
        if (this.targetTile) {
            const tDx = this.targetTile.x - this.bot.x;
            const tDz = this.targetTile.z - this.bot.z;
            const distToTargetSq = tDx * tDx + tDz * tDz;

            // 🚀 Speed 80 に合わせ、到着判定を緩和
            if (distToTargetSq < 25 || (this.targetTile.state !== "normal" && this.targetTile.state !== "touched")) {
                this.targetTile = null;
            }
        }

        // 新しいターゲットの選定
        if (!this.targetTile) {
            // 現在地が安全か（判定範囲もSpeed80に合わせて拡張）
            const isCurrentSafe = (myCurrentTile && myCurrentDistSq < 400 && (myCurrentTile.state === "normal" || myCurrentTile.state === "touched"));

            if (!isCurrentSafe && safeTilesOnLayer.length > 0) {
                // 緊急避難：最も近い安全なタイルへ
                safeTilesOnLayer.sort((a, b) => a.distSq - b.distSq);
                this.targetTile = safeTilesOnLayer[0].tile;
                this.targetOffset = { x: 0, z: 0 };
            } else if (isCurrentSafe && safeTilesOnLayer.length > 1) {
                // 通常移動：今乗っているタイル以外を選択（引きこもり防止機能維持）
                const otherSafeTiles = safeTilesOnLayer.filter(t => t.tile !== myCurrentTile);

                if (otherSafeTiles.length > 0) {
                    otherSafeTiles.sort((a, b) => a.distSq - b.distSq);
                    const searchRange = Math.min(otherSafeTiles.length, 5);
                    const randomIdx = Math.floor(Math.random() * searchRange);
                    this.targetTile = otherSafeTiles[randomIdx].tile;
                    this.targetOffset = { x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 };
                }
            }
        }

        // 下の階層の探索（機能維持）
        if (!this.targetTile && botLayer < (this.logic.CONSTANTS?.LAYERS || 5) - 1) {
            let nextLayerMinDist = Infinity;
            for (const tile of this.logic.tiles.values()) {
                if (tile.layer === botLayer + 1 && (tile.state === "normal" || tile.state === "touched")) {
                    const dx = tile.x - this.bot.x;
                    const dz = tile.z - this.bot.z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < nextLayerMinDist) {
                        nextLayerMinDist = distSq;
                        this.targetTile = tile;
                        this.targetOffset = { x: 0, z: 0 };
                    }
                }
            }
        }
    }

    _calculateMovement() {
        let speedMult = 1.0;
        if (this.aiLevel === 'easy') speedMult = 0.5;  
        if (this.aiLevel === 'normal') speedMult = 0.8;
        if (this.aiLevel === 'hard') speedMult = 1.0; 

        if (this.targetTile) {
            const targetX = this.targetTile.x + this.targetOffset.x;
            const targetZ = this.targetTile.z + this.targetOffset.z;
            const dx = targetX - this.bot.x;
            const dz = targetZ - this.bot.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 1.0) {
                this.currentInput.x = (dx / dist) * speedMult;
                this.currentInput.z = (dz / dist) * speedMult;
            } else {
                this.currentInput.x = 0;
                this.currentInput.z = 0;
            }
        } else {
            // フェイルセーフ：迷子時のウロウロ（機能維持）
            this.wanderAngle += (Math.random() - 0.5) * 0.5;
            this.currentInput.x = Math.cos(this.wanderAngle) * (0.3 * speedMult);
            this.currentInput.z = Math.sin(this.wanderAngle) * (0.3 * speedMult);
        }
    }

    _evaluateJumpNecessity() {
        this.isJumping = false;

        const currentY = this.bot.y || 0;
        const layerGap = this.logic.CONSTANTS?.LAYER_GAP || 20;
        const botLayer = Math.max(0, Math.round(-currentY / layerGap));

        // 🌟機能維持：落下時の足掻きジャンプ
        if (typeof this.bot.vy === 'number' && this.bot.vy < -2.0) {
            if (this.aiLevel === 'easy' && Math.random() < 0.6) return;
            this.isJumping = true;
            return; 
        }

        // 🌟未来予測ジャンプ：Speed 80 の慣性を考慮
        if (this.aiLevel === 'hard' || this.aiLevel === 'normal') {
            const speedSq = this.currentInput.x ** 2 + this.currentInput.z ** 2;

            if (speedSq > 0.01) {
                const predictionMultiplier = this.aiLevel === 'hard' ? 35 : 28; 
                const futureX = this.bot.x + (this.currentInput.x * predictionMultiplier);
                const futureZ = this.bot.z + (this.currentInput.z * predictionMultiplier);

                let closestFutureTile = null;
                let minFutureDistSq = Infinity;

                for (const tile of this.logic.tiles.values()) {
                    if (tile.layer === botLayer) {
                        const dx = tile.x - futureX;
                        const dz = tile.z - futureZ;
                        const distSq = dx * dx + dz * dz;
                        if (distSq < minFutureDistSq) {
                            minFutureDistSq = distSq;
                            closestFutureTile = tile;
                        }
                    }
                }

                // 🌟判定距離(1200)は Speed 80 の移動ベクトル量に対して最適化。
                if (!closestFutureTile || (closestFutureTile.state !== "normal" && closestFutureTile.state !== "touched") || minFutureDistSq > 1200) {
                    this.isJumping = true;
                }
            }
        }

        // 遠距離ジャンプ（機能維持）
        if (this.targetTile && !this.isJumping && this.bot.isGrounded) {
            const dx = this.targetTile.x - this.bot.x;
            const dz = this.targetTile.z - this.bot.z;
            const distSq = dx * dx + dz * dz;

            if (distSq > 1500 && distSq < 4000 && this.targetTile.layer === botLayer) { 
                if (this.aiLevel === 'easy' && Math.random() < 0.7) return; 
                this.isJumping = true;
            }
        }
    }

    // ========================================================================
    // 🛑 以下、物理エンジンとの接続用インターフェース（絶対削除・省略不可）
    // ========================================================================
    get x() { return this.currentInput.x; }
    get z() { return this.currentInput.z; }
    get jump() { return this.isJumping; }

    getInput() {
        return {
            x: this.currentInput.x,
            z: this.currentInput.z,
            jump: this.isJumping,
            getCameraAngle: () => 0,
        };
    }

    getMovementVector() {
        return { x: this.currentInput.x, z: this.currentInput.z };
    }

    isJumpPressed() {
        return this.isJumping;
    }

    getCameraAngle() {
        return 0;
    }

    reset() {
        this.currentInput = { x: 0, z: 0 };
        this.isJumping = false;
        this.targetTile = null;
    }
}

class AIManager {
    constructor(logicReference) {
        this.logic = logicReference;
        this.bots = new Map();
    }

    addBot(botPlayer) {
        if (!this.bots.has(botPlayer.id)) {
            const ai = new OchirunaAI(botPlayer, this.logic);
            this.bots.set(botPlayer.id, ai);
            if (this.logic && this.logic.players[botPlayer.id]) {
                this.logic.players[botPlayer.id].inputManager = ai;
            }
        }
    }

    update() {
        for (const botAi of this.bots.values()) {
            const currentPlayer = this.logic.players[botAi.bot.id];
            if (!currentPlayer) continue;

            botAi.bot = currentPlayer; 
            currentPlayer.inputManager = botAi; 

            // 🚀 Speed 80 / Power 80 を物理エンジンの参照先に直接適用
            if (currentPlayer.currentStats) {
                currentPlayer.currentStats.speed = 80;
                currentPlayer.currentStats.power = 80;
            }

            botAi.update();

            // 物理エンジンへの入力フィード（プロパティとしてのバックアップ）
            const inputData = botAi.getInput();
            currentPlayer.inputX = inputData.x;
            currentPlayer.inputZ = inputData.z;
            currentPlayer.isJumpPressed = inputData.jump;
        }
    }
}

window.AIManager = AIManager;