/**
 * ==================================================================================
 * 🎮 Ochiruna - Cross-Platform Input Manager
 * ==================================================================================
 * * [概要]
 * PC（キーボード/マウス）およびモバイル（タッチ/スワイプ）の入力を統合管理し、
 * ゲームロジックが理解できる統一されたデータ形式（ベクトルとフラグ）に変換するクラス。
 * * * [アップデート内容 (Dynamic UI 対応版)]
 * - logic.jsが動的に生成するジョイスティックUIとジャンプボタンに完全対応。
 * - 物理ノブ（knob）の視覚的な移動計算を追加。
 * - UIが存在しない場合（死亡後など）でもエラーを吐かない安全設計。
 * - 既存のPC操作や、画面ドラッグによるカメラ操作は一切カットせず完全維持。
 * ==================================================================================
 */

class InputManager {
    constructor() {
        // --- 1. 入力状態の保持 ---
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
        };

        // カメラ制御用
        this.cameraAngle = 0;
        this.isDragging = false;
        this.previousMouseX = 0;

        // スマホ用仮想ジョイスティック状態（UI連携用パラメータ追加）
        this.joystick = { 
            active: false, 
            x: 0, 
            y: 0, 
            identifier: null,
            centerX: 0,
            centerY: 0
        };

        // タッチ識別用の追跡ステータス
        this.touchState = {
            cameraIdentifier: null,
            jumpIdentifier: null
        };

        // --- 2. イベントリスナーの登録 ---
        this._setupKeyboard();
        this._setupMouse();
        this._setupTouch();

        // 画面外に出た時にキーが押しっぱなしになるバグを防止
        window.addEventListener("blur", () => this.reset());

        console.log(
            "🕹️ [InputManager] クロスプラットフォーム操作システム起動完了 (Dynamic UI対応版)",
        );
    }

    // ========================================================
    // ⌨️ PC: キーボード操作 (WASD / 矢印 / スペース)
    // ========================================================
    _setupKeyboard() {
        document.addEventListener("keydown", (e) => {
            if (e.repeat) return; // 押しっぱなしによる連続発火を無視
            switch (e.code) {
                case "KeyW":
                case "ArrowUp":
                    this.keys.forward = true;
                    break;
                case "KeyS":
                case "ArrowDown":
                    this.keys.backward = true;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    this.keys.left = true;
                    break;
                case "KeyD":
                case "ArrowRight":
                    this.keys.right = true;
                    break;
                case "Space":
                    this.keys.jump = true;
                    break;
            }
        });

        document.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyW":
                case "ArrowUp":
                    this.keys.forward = false;
                    break;
                case "KeyS":
                case "ArrowDown":
                    this.keys.backward = false;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    this.keys.left = false;
                    break;
                case "KeyD":
                case "ArrowRight":
                    this.keys.right = false;
                    break;
                case "Space":
                    this.keys.jump = false;
                    break;
            }
        });
    }

    // ========================================================
    // 🖱️ PC: マウス操作 (ドラッグでカメラ回転)
    // ========================================================
    _setupMouse() {
        // UI上でのドラッグを弾くため、canvasまたはbodyを対象とする
        document.addEventListener("mousedown", (e) => {
            // UIボタン類をクリックした場合はカメラ回転を発動させない
            if (e.target.closest('button') || e.target.closest('#ochiruna-joystick-zone')) return;

            this.isDragging = true;
            this.previousMouseX = e.clientX;
        });

        window.addEventListener("mouseup", () => {
            this.isDragging = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMouseX;
                // マウスの移動量に応じてカメラ角度を更新 (感度調整)
                this.cameraAngle -= deltaX * 0.01;
                this.previousMouseX = e.clientX;
            }
        });
    }

    // ========================================================
    // 📱 スマホ: 動的UI連動タッチ操作 (ジョイスティック＆ボタン＆カメラ)
    // ========================================================
    _setupTouch() {
        // イベントデリゲーション：動的に生成されたUIにも対応するためdocument全体で監視
        document.addEventListener("touchstart", (e) => {
            // ゲーム関連のタッチ以外（ブラウザ標準UIなど）は無視
            const isGameTouch = e.target.id === 'game-canvas' || 
                                e.target.closest('#ochiruna-joystick-zone') || 
                                e.target.closest('#ochiruna-jump-btn');
            if (!isGameTouch) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);

                // 1. ジョイスティックの処理
                if (target && target.closest('#ochiruna-joystick-zone')) {
                    this.joystick.active = true;
                    this.joystick.identifier = touch.identifier;

                    // ジョイスティックの中心座標を計算（毎回取得することでリサイズに対応）
                    const zone = document.getElementById('ochiruna-joystick-zone');
                    const rect = zone.getBoundingClientRect();
                    this.joystick.centerX = rect.left + rect.width / 2;
                    this.joystick.centerY = rect.top + rect.height / 2;

                    this._updateJoystick(touch.clientX, touch.clientY);
                } 
                // 2. ジャンプボタンの処理
                else if (target && target.closest('#ochiruna-jump-btn')) {
                    this.keys.jump = true;
                    this.touchState.jumpIdentifier = touch.identifier;
                } 
                // 3. 画面ドラッグ（カメラ回転）の処理
                else if (target && target.id === 'game-canvas') {
                    this.isDragging = true;
                    this.touchState.cameraIdentifier = touch.identifier;
                    this.previousMouseX = touch.clientX;
                }
            }
        }, { passive: false });

        document.addEventListener("touchmove", (e) => {
            // スクロールなどのブラウザデフォルト挙動を防止
            if (this.joystick.active || this.isDragging) {
                if (e.cancelable) e.preventDefault(); 
            }

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                // ジョイスティックの移動
                if (this.joystick.active && touch.identifier === this.joystick.identifier) {
                    this._updateJoystick(touch.clientX, touch.clientY);
                } 
                // カメラの回転
                else if (this.isDragging && touch.identifier === this.touchState.cameraIdentifier) {
                    const deltaX = touch.clientX - this.previousMouseX;
                    this.cameraAngle -= deltaX * 0.01;
                    this.previousMouseX = touch.clientX;
                }
            }
        }, { passive: false });

        const handleTouchEnd = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                // ジョイスティックの解除と初期位置へのリセット
                if (this.joystick.active && touch.identifier === this.joystick.identifier) {
                    this.joystick.active = false;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                    this.joystick.identifier = null;

                    const knob = document.getElementById('ochiruna-joystick-knob');
                    if (knob) {
                        knob.style.transform = `translate(-50%, -50%)`;
                    }
                } 
                // ジャンプの解除
                else if (touch.identifier === this.touchState.jumpIdentifier) {
                    this.keys.jump = false;
                    this.touchState.jumpIdentifier = null;
                } 
                // カメラドラッグの解除
                else if (this.isDragging && touch.identifier === this.touchState.cameraIdentifier) {
                    this.isDragging = false;
                    this.touchState.cameraIdentifier = null;
                }
            }
        };

        document.addEventListener("touchend", handleTouchEnd);
        document.addEventListener("touchcancel", handleTouchEnd);
    }

    /**
     * ジョイスティックのベクトル計算とノブ（内側の円）の視覚的な移動処理
     * @private
     */
    _updateJoystick(clientX, clientY) {
        const maxDist = 40; // ジョイスティックが動く最大半径（ピクセル）

        const dx = clientX - this.joystick.centerX;
        const dy = clientY - this.joystick.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 限界を超えないように押し留める
        const force = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        // 1. ロジックに渡す入力ベクトル（-1.0 〜 1.0 に正規化）
        this.joystick.x = (Math.cos(angle) * force) / maxDist;
        this.joystick.y = (Math.sin(angle) * force) / maxDist;

        // 2. 視覚的なUI（ノブ）の移動
        const knob = document.getElementById('ochiruna-joystick-knob');
        if (knob) {
            const visualX = Math.cos(angle) * force;
            const visualY = Math.sin(angle) * force;
            // logic.js で指定した中央配置の translate(-50%, -50%) に移動量を足し合わせる
            knob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
        }
    }

    // ========================================================
    // 🚀 ロジックへの出力 (main.js が毎フレーム呼び出す)
    // ========================================================

    /**
     * 現在の入力状態を、カメラの向きを考慮したベクトルとして返す
     */
    getInput() {
        let inputX = 0;
        let inputZ = 0;

        // 1. キーボードからの入力（WASDを -1.0 〜 1.0 に変換）
        if (this.keys.forward) inputZ -= 1;
        if (this.keys.backward) inputZ += 1;
        if (this.keys.left) inputX -= 1;
        if (this.keys.right) inputX += 1;

        // 2. スマホジョイスティックからの入力（存在する場合上書き・合成）
        if (this.joystick.active) {
            inputX = this.joystick.x;
            inputZ = this.joystick.y;
        }

        // ベクトルの正規化（斜め移動が速くならないようにする）
        if (inputX !== 0 || inputZ !== 0) {
            const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
            inputX /= length;
            inputZ /= length;
        }

        // 3. カメラの角度に合わせて移動方向を回転させる
        // （「前」に入力したら、常にカメラが向いている方向に進むための計算）
        const s = Math.sin(this.cameraAngle);
        const c = Math.cos(this.cameraAngle);

        const worldX = inputX * c + inputZ * s;
        const worldZ = -inputX * s + inputZ * c;

        return {
            x: worldX,
            z: worldZ,
            jump: this.keys.jump,
            getCameraAngle: () => this.cameraAngle,
        };
    }

    // ========================================================
    // 🌉 logic.js との連携用ブリッジ
    // ========================================================

    getMovementVector() {
        const currentInput = this.getInput();
        return { x: currentInput.x, z: currentInput.z };
    }

    isJumpPressed() {
        return this.keys.jump;
    }

    reset() {
        this.keys.forward = false;
        this.keys.backward = false;
        this.keys.left = false;
        this.keys.right = false;
        this.keys.jump = false;

        this.isDragging = false;
        this.touchState.cameraIdentifier = null;
        this.touchState.jumpIdentifier = null;

        this.joystick.active = false;
        this.joystick.x = 0;
        this.joystick.y = 0;
        this.joystick.identifier = null;

        // ノブが引っかかったままにならないように視覚リセット
        const knob = document.getElementById('ochiruna-joystick-knob');
        if (knob) {
            knob.style.transform = `translate(-50%, -50%)`;
        }
    }
}

// グローバルに登録（main.js から window.InputManager としてアクセスできるようにする）
window.InputManager = new InputManager();