/**
 * ==================================================================================
 * 🎮 Ochiruna (Absolutely Don't Fall) - Ultra Premium Renderer System
 * ==================================================================================
 * * [概要]
 * Hex-A-Gone のゲーム性を視覚的に完全再現するためのコアレンダリングクラス。
 * * [主要機能]
 * 1. スタジオグレードの3点照明 ＆ 動的環境光
 * 2. Hex-A-Gone 特化型タイルアニメーション（沈下、発光、縮小消滅）
 * 3. users.json 完全準拠のスキン・キャラクター動的ロードシステム
 * 4. マルチプレイヤー同期（他プレイヤーのなめらかな補間移動）
 * 5. 高度なカメラシステム（追従、回転、死亡時の観戦オートスイッチ） 🌟 UPDATE!
 * 6. パフォーマンス最適化（ジオメトリ共有、マテリアルキャッシュ、メモリリーク対策）
 * * @author Gemini Collab (Ultra Edition)
 * @version 3.2.0 (Spectator View Switch & Dynamic Opacity Support)
 * ==================================================================================
 */

class OchirunaRenderer {
    /**
     * @param {string} canvasId - 描画対象のキャンバスID
     */
    constructor(canvasId) {
        // --- 1. 基本プロパティ ---
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`[OchirunaRenderer] Critical Error: Canvas '${canvasId}' not found.`);
        }

        // --- 2. Three.js コアコンポーネント ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // 美しい青空
        // 遠くを霞ませるフォグ効果（Hex-A-Goneの高さ演出）
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,         // ギザギザ防止
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true // 遠くのチラつき防止
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 負荷軽減しつつ高画質
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔らかな影
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        // --- 3. 管理用キャッシュ領域 ---
        this.tileMeshes = new Map();     // tile.id -> Mesh
        this.playerMeshes = new Map();   // player.id -> Group
        this.playerModels = new Map();   // player.id -> ModelInstance
        this.geometries = {};            // ジオメトリの再利用
        this.materials = {};             // マテリアルの再利用

        // フレームレート非依存のアニメーション用時計
        this.clock = new THREE.Clock();

        // --- 4. 視覚効果用 ---
        this.particles = [];             // 消滅時の破片エフェクト用配列

        // --- 5. 初期化実行 ---
        this._setupLighting();
        this._setupResizeHandler();

        console.log("🚀 [OchirunaRenderer] システムが正常に起動しました。最高設定を適用済み。");
    }

    // ========================================================
    // 💡 内部セットアップメソッド
    // ========================================================

    /**
     * スタジオ品質のライティング
     * ModelRenderer.js の設計思想をゲームフィールド規模に拡張
     */
    _setupLighting() {
        // 環境光（全体を底上げ）
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        // キーライト（メインの太陽光）
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(30, 100, 50);
        this.sunLight.castShadow = true;

        // 影の品質設定（Hex-A-Goneの広い範囲をカバー）
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.bias = -0.001; // 影の浮き防止
        this.scene.add(this.sunLight);

        // フィルライト（影の部分を青白く補い、立体感を出す）
        const fillLight = new THREE.DirectionalLight(0xcae1ff, 0.4);
        fillLight.position.set(-30, 20, -20);
        this.scene.add(fillLight);

        // バックライト（キャラの輪郭を際立たせる）
        const rimLight = new THREE.PointLight(0xffffff, 0.6);
        rimLight.position.set(0, 50, -50);
        this.scene.add(rimLight);
    }

    _setupResizeHandler() {
        // リサイズイベントのバインドを保持して後で解除できるようにする
        this._onResize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', this._onResize, false);
    }

    // ========================================================
    // 🏁 ゲーム初期化 (init)
    // ========================================================

    /**
     * フィールドと全プレイヤーを生成
     * @param {Object} logic - ロジックインスタンス
     * @param {Object|Array} participants - users.json 構造を含む参加者リスト（辞書型または配列）
     */
    init(logic, participants) {
        console.log("🎨 [Renderer] フルスクラッチ初期化を開始します...");

        // 1. 旧オブジェクトの完全破棄（メモリリーク防止）
        this._clearScene();
        this.clock.start();

        // 2. タイルの生成 (Hexagonal Cylinder)
        this.geometries.hex = new THREE.CylinderGeometry(1.2, 1.2, 0.6, 6);
        this.geometries.edges = new THREE.EdgesGeometry(this.geometries.hex); // ジオメトリ共有
        this.materials.edge = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });

        logic.tiles.forEach(tile => {
            const material = new THREE.MeshStandardMaterial({
                color: this.getLayerColor(tile.layer),
                metalness: 0.1,
                roughness: 0.8,
                transparent: true,
                opacity: 1.0
            });

            const mesh = new THREE.Mesh(this.geometries.hex, material);
            mesh.position.set(tile.x, tile.y, tile.z);
            mesh.receiveShadow = true;
            mesh.castShadow = true;

            // タイルの淵を目立たせるエッジ装飾（Hex-A-Goneのデジタル感）
            const line = new THREE.LineSegments(this.geometries.edges, this.materials.edge);
            mesh.add(line);

            this.scene.add(mesh);
            this.tileMeshes.set(tile.id, mesh);
        });

        // 3. プレイヤーの生成 (users.json 準拠)
        if (!participants) return;

        const participantArray = Array.isArray(participants) ? participants : Object.values(participants);

        participantArray.forEach((userData) => {
            const playerId = userData.id; 
            const equipped = userData.equipped || {};
            const charId = equipped.character || 'char_human';
            const skinName = equipped.skin || null;

            // モデルクラスの決定
            let ModelClass = window.HumanModel; 
            switch(charId) {
                case 'char_human':  ModelClass = window.HumanModel; break;
                case 'char_apple':  ModelClass = window.AppleModel; break;
                case 'char_robot':  ModelClass = window.RobotModel; break;
                case 'char_dog':    ModelClass = window.DogModel; break;
                case 'char_pencil': ModelClass = window.PencilModel; break;
                case 'char_sushi':  ModelClass = window.SushiModel; break;
                default:
                    console.warn(`[Renderer] 未知のキャラクターID: ${charId}。デフォルトモデルを適用します。`);
                    ModelClass = window.HumanModel;
                    break;
            }

            try {
                const modelInstance = new ModelClass(skinName);
                const group = modelInstance.getMesh();

                // 影の設定（階層構造をすべて走査）
                group.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // 頭上にニックネームを表示する (Sprite)
                this._addNameTag(group, userData.nickname || "Player");

                this.scene.add(group);
                this.playerMeshes.set(playerId, group);
                this.playerModels.set(playerId, modelInstance);

                console.log(`👤 [Renderer] Playerロード完了: ${userData.nickname} (ID: ${playerId}, Char: ${charId})`);
            } catch (e) {
                console.error(`[Renderer] プレイヤー生成失敗 (${playerId}):`, e);
            }
        });
    }

    /**
     * シーンを清掃し、メモリを解放する（徹底したリーク対策）
     */
    _clearScene() {
        this.tileMeshes.forEach(mesh => {
            // 子要素（エッジなど）の解放
            mesh.traverse(child => {
                if (child.isMesh || child.isLineSegments) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(mesh);
        });
        this.tileMeshes.clear();

        this.playerMeshes.forEach(group => {
            group.traverse(child => {
                if (child.isMesh || child.isSprite) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (child.material.map) child.material.map.dispose(); // テクスチャ解放
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(group);
        });
        this.playerMeshes.clear();
        this.playerModels.clear();

        // 共有ジオメトリ・マテリアルの解放
        if (this.geometries.hex) this.geometries.hex.dispose();
        if (this.geometries.edges) this.geometries.edges.dispose();
        if (this.materials.edge) this.materials.edge.dispose();

        // パーティクルのクリア
        this.particles.forEach(p => {
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
            this.scene.remove(p.mesh);
        });
        this.particles = [];
    }

    /**
     * ニックネームタグを生成してモデルに追加
     */
    _addNameTag(parentGroup, name) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // 背景（半透明の黒角丸）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 512, 128, 30);
        ctx.fill();

        // テキスト描画
        ctx.font = 'Bold 64px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 3.5, 0); // キャラクターの頭上少し高め
        sprite.scale.set(3, 0.75, 1);
        sprite.renderOrder = 999; // 常に手前に表示させる

        parentGroup.add(sprite);
    }

    // ========================================================
    // 🔄 メインフレーム更新 (update)
    // ========================================================

    /**
     * 毎フレーム実行される、リアルタイム同期と演出の核心
     * @param {Object} logic - ロジックから渡される最新状態
     * @param {Object} input - 入力（カメラ角度など）
     * @param {string} localUserId - ローカルプレイヤーのID (追加)
     */
    update(logic, input, localUserId) {
        if (!logic) return;

        const dt = this.clock.getDelta();
        // どんな環境でも同じ速度で補間するための係数計算
        const lerpFactorFast = 1.0 - Math.exp(-15.0 * dt);
        const lerpFactorSlow = 1.0 - Math.exp(-5.0 * dt);

        const localPlayer = logic.players[localUserId];

        // 🌟 観戦対象（自分が死んだ後に切り替えたターゲット）を取得。自分が生きている時は自分自身。
        let viewTargetId = localUserId;
        if (localPlayer && localPlayer.isDead && logic.spectatorTargetId) {
            viewTargetId = logic.spectatorTargetId;
        }
        const viewTargetPlayer = logic.players[viewTargetId];


        // --- 1. タイルのアニメーションと状態更新 ---
        logic.tiles.forEach(tile => {
            const mesh = this.tileMeshes.get(tile.id);
            if (!mesh) return;

            // 消滅済みの処理
            if (tile.state === 'gone') {
                if (mesh.visible) {
                    this._createCrumbleEffect(mesh.position, mesh.material.color);
                    mesh.visible = false;
                }
                return;
            }

            mesh.visible = true;

            // Hex-A-Gone的演出：踏まれている時のフィードバック
            if (tile.state === 'touched') {
                mesh.material.color.lerp(new THREE.Color(0xff4500), lerpFactorFast);
                mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, tile.y - 0.3, lerpFactorFast);
                // 小刻みな震え演出
                mesh.position.x = tile.x + (Math.random() - 0.5) * 0.08;
                mesh.position.z = tile.z + (Math.random() - 0.5) * 0.08;
            } else {
                mesh.material.color.lerp(new THREE.Color(this.getLayerColor(tile.layer)), lerpFactorSlow);
                mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, tile.y, lerpFactorFast);
                mesh.position.x = tile.x;
                mesh.position.z = tile.z;
            }

            // 👁️ [レイヤー透過システム] 自分のいる層（または観戦対象の層）より下の層を見やすくする
            if (viewTargetPlayer) {
                if (tile.layer < viewTargetPlayer.currentLayer) {
                    mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, 0.25, lerpFactorSlow);
                    mesh.material.depthWrite = false;
                } else {
                    mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, 1.0, lerpFactorSlow);
                    mesh.material.depthWrite = true;
                }
            }
        });

        // --- 2. 全プレイヤーのリアルタイム同期 ＆ 補間移動 ---
        for (let id in logic.players) {
            const p = logic.players[id];
            const mesh = this.playerMeshes.get(id); 
            if (!mesh) continue;

            // 死亡時：縮小して消える演出
            if (p.isDead) {
                mesh.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), lerpFactorFast);
                if (mesh.scale.x < 0.05) mesh.visible = false;
                continue;
            } else {
                mesh.visible = true;
                mesh.scale.lerp(new THREE.Vector3(1, 1, 1), lerpFactorFast);
            }

            // 位置の同期（ガクつき防止のためLerp）
            mesh.position.lerp(new THREE.Vector3(p.x, p.y, p.z), lerpFactorFast);

            // 向きの同期（進行方向へなめらかに回転）
            if (Math.abs(p.vx) > 0.01 || Math.abs(p.vz) > 0.01) {
                const targetRotation = Math.atan2(p.vx, p.vz);
                let diff = targetRotation - mesh.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                mesh.rotation.y += diff * lerpFactorFast * 1.5;
            }

            // アニメーションの更新
            const modelInstance = this.playerModels.get(id);
            if (modelInstance && modelInstance.update) {
                const isMoving = (Math.abs(p.vx) > 0.01 || Math.abs(p.vz) > 0.01);
                modelInstance.update(isMoving, dt); 
            }
        }

        // --- 3. ダイナミック・カメラシステム ---
        this._updateCamera(logic, input, dt, localUserId);

        // --- 4. パーティクル更新 ---
        this._updateParticles(dt);

        // --- 5. 描画実行 ---
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 高性能カメラ制御（Hex-A-Gone特化 ＆ 観戦モード対応）
     */
    _updateCamera(logic, input, dt, localUserId) {
        const localPlayer = logic.players[localUserId];
        let target = localPlayer;

        // 🌟 バグ修正＆機能拡張: 観戦モード中はロジック側で決めた「spectatorTargetId」を確実に追従する！
        if (localPlayer && localPlayer.isDead && logic.spectatorTargetId) {
            target = logic.players[logic.spectatorTargetId];
        } else if (!target || target.isDead) {
            // フェイルセーフ：誰も見つからない場合
            target = null;
        }

        // 全員死亡、または初期化前は中央を見る
        if (!target) {
            target = { x: 0, y: 10, z: 0 };
        }

        // 2. カメラ座標の計算
        const angle = input.getCameraAngle ? input.getCameraAngle() : 0;
        const distance = 14; // 全体を見渡しやすくする調整
        const height = 9;

        const targetPos = new THREE.Vector3(
            target.x + Math.sin(angle) * distance,
            target.y + height,
            target.z + Math.cos(angle) * distance
        );

        // カメラをなめらかに移動
        const lerpFactor = 1.0 - Math.exp(-10.0 * dt);
        this.camera.position.lerp(targetPos, lerpFactor);

        // 注視点もなめらかに移動
        const targetLookAt = new THREE.Vector3(target.x, target.y + 1, target.z);
        if (!this._currentLookAt) this._currentLookAt = targetLookAt.clone();

        this._currentLookAt.lerp(targetLookAt, lerpFactor);
        this.camera.lookAt(this._currentLookAt);
    }

    /**
     * タイルが消える際の破片エフェクト
     */
    _createCrumbleEffect(pos, color) {
        // オブジェクトプールの代わりに軽量なBoxを都度生成（寿命が短いため）
        const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const mat = new THREE.MeshLambertMaterial({ color: color });

        for (let i = 0; i < 8; i++) {
            const part = new THREE.Mesh(boxGeo, mat);
            part.position.copy(pos);
            part.position.x += (Math.random() - 0.5) * 0.8;
            part.position.z += (Math.random() - 0.5) * 0.8;

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.3 + 0.1, // 上方向へ跳ねる
                (Math.random() - 0.5) * 0.4
            );

            const rotSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );

            this.scene.add(part);
            this.particles.push({ mesh: part, vel: vel, rotSpeed: rotSpeed, life: 1.0 });
        }
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // 物理挙動の更新
            p.mesh.position.x += p.vel.x * dt * 30;
            p.mesh.position.y += p.vel.y * dt * 30;
            p.mesh.position.z += p.vel.z * dt * 30;

            p.mesh.rotation.x += p.rotSpeed.x * dt;
            p.mesh.rotation.y += p.rotSpeed.y * dt;
            p.mesh.rotation.z += p.rotSpeed.z * dt;

            p.vel.y -= 0.015 * dt * 60; // 重力
            p.life -= 1.5 * dt;         // 寿命減少

            if (p.life > 0) {
                p.mesh.scale.setScalar(p.life);
            } else {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 層に応じたHex-A-Goneカラーの定義
     */
    getLayerColor(layerIndex) {
        const colors = [
            0x00FF7F, // SpringGreen (Top)
            0xFFD700, // Gold
            0x1E90FF, // DodgerBlue (追加レイヤー)
            0xFF8C00, // DarkOrange
            0x9932CC, // DarkOrchid (追加レイヤー)
            0xFF4500, // OrangeRed
            0xDC143C  // Crimson (Bottom)
        ];
        return colors[layerIndex] || 0x808080;
    }

    /**
     * リソース完全解放（ページ遷移・リロード時）
     */
    destroy() {
        window.removeEventListener('resize', this._onResize, false);
        this._clearScene();
        this.renderer.dispose();
        // コンテキストの喪失を明示的に呼び出してGPUメモリを確実にあける
        this.renderer.forceContextLoss();
        this.renderer.context = null;
        this.renderer.domElement = null;
        console.log("🧹 [Renderer] 全リソースを完全に解放しました。");
    }
}

// グローバル展開
window.OchirunaRenderer = OchirunaRenderer;