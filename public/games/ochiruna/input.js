/**
 * ==================================================================================
 * 🎮 Ochiruna - Cross-Platform Input Manager
 * ==================================================================================
 * * [概要]
 * PC（キーボード/マウス）およびモバイル（タッチ/スワイプ）の入力を統合管理し、
 * ゲームロジックが理解できる統一されたデータ形式（ベクトルとフラグ）に変換するクラス。
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

        // スマホ用仮想ジョイスティック状態
        this.joystick = { active: false, x: 0, y: 0, identifier: null };

        // --- 2. イベントリスナーの登録 ---
        this._setupKeyboard();
        this._setupMouse();
        this._setupTouch();

        // 画面外に出た時にキーが押しっぱなしになるバグを防止
        window.addEventListener("blur", () => this.reset());

        console.log(
            "🕹️ [InputManager] クロスプラットフォーム操作システム起動完了",
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
        const canvas = document.getElementById("game-canvas") || document.body;

        canvas.addEventListener("mousedown", (e) => {
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
    // 📱 スマホ: タッチ操作 (画面左: 移動 / 画面右: カメラ＆ジャンプ)
    // ========================================================
    _setupTouch() {
        const canvas = document.getElementById("game-canvas") || document.body;
        const halfWidth = window.innerWidth / 2;

        canvas.addEventListener(
            "touchstart",
            (e) => {
                // UI等の誤爆防止
                if (e.target !== canvas) return;

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.clientX < halfWidth) {
                        // 左半分：仮想ジョイスティック開始
                        this.joystick.active = true;
                        this.joystick.startX = touch.clientX;
                        this.joystick.startY = touch.clientY;
                        this.joystick.identifier = touch.identifier;
                    } else {
                        // 右半分：カメラ操作＆ジャンプ
                        this.isDragging = true;
                        this.previousMouseX = touch.clientX;
                        // ダブルタップ判定などを入れたい場合はここに追記。
                        // 現状は右画面タッチでジャンプも兼ねる（Hex-A-Gone仕様）
                        this.keys.jump = true;
                    }
                }
            },
            { passive: false },
        );

        canvas.addEventListener(
            "touchmove",
            (e) => {
                if (e.target !== canvas) return;
                e.preventDefault(); // スクロール防止

                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];

                    // 左画面：ジョイスティック移動
                    if (
                        this.joystick.active &&
                        touch.identifier === this.joystick.identifier
                    ) {
                        const dx = touch.clientX - this.joystick.startX;
                        const dy = touch.clientY - this.joystick.startY;
                        const maxDist = 50; // ジョイスティックの最大半径

                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const force = Math.min(dist, maxDist) / maxDist;
                        const angle = Math.atan2(dy, dx);

                        this.joystick.x = Math.cos(angle) * force;
                        this.joystick.y = Math.sin(angle) * force;
                    }
                    // 右画面：カメラ回転
                    else if (touch.clientX >= halfWidth && this.isDragging) {
                        const deltaX = touch.clientX - this.previousMouseX;
                        this.cameraAngle -= deltaX * 0.01;
                        this.previousMouseX = touch.clientX;
                    }
                }
            },
            { passive: false },
        );

        const handleTouchEnd = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (this.joystick.identifier === touch.identifier) {
                    this.joystick.active = false;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                    this.joystick.identifier = null;
                } else if (touch.clientX >= halfWidth) {
                    this.isDragging = false;
                    this.keys.jump = false; // ジャンプ解除
                }
            }
        };

        canvas.addEventListener("touchend", handleTouchEnd);
        canvas.addEventListener("touchcancel", handleTouchEnd);
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

        // 2. ジョイスティックからの入力（キーボードより優先、または合成）
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
        // （「W」を押したら、常にカメラが向いている方向に進むための計算）
        const s = Math.sin(this.cameraAngle);
        const c = Math.cos(this.cameraAngle);

        const worldX = inputX * c + inputZ * s;
        const worldZ = -inputX * s + inputZ * c;

        // 一度ジャンプを読み取ったら、ロジック側で処理されるまでfalseにしない
        // （連打対策＆処理落ちでのジャンプ漏れ防止）のフラグ。今回はシンプルに返します。
        return {
            x: worldX,
            z: worldZ,
            jump: this.keys.jump,
            getCameraAngle: () => this.cameraAngle,
        };
    }

    // ========================================================
    // 🌉 logic.js との連携用ブリッジ（今回追加した部分）
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
        this.joystick.active = false;
        this.joystick.x = 0;
        this.joystick.y = 0;
    }
}

// グローバルに登録（main.js から window.InputManager としてアクセスできるようにする）
window.InputManager = new InputManager();