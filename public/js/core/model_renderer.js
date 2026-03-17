// public/js/core/model_renderer.js

class ModelRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container ${containerId} not found!`);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 8); // キャラを綺麗に映すアングル

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // 影の有効化（リアルな質感を出すため）
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        this.currentModelGroup = null;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.animationId = null;

        this._setupLighting();
        this._setupInteractivity();
        this._setupResizeHandler();
        this.animate();
    }

    _setupLighting() {
        // スタジオのような完璧な3点照明＋環境光
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(5, 10, 5);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xe0eaff, 0.4);
        fillLight.position.set(-5, 3, 5);
        this.scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xffeedd, 0.6);
        backLight.position.set(0, 5, -10);
        this.scene.add(backLight);
    }

    _setupInteractivity() {
        const dom = this.renderer.domElement;
        dom.addEventListener('mousedown', () => { this.isDragging = true; dom.style.cursor = 'grabbing'; });
        dom.addEventListener('mouseup', () => { this.isDragging = false; dom.style.cursor = 'grab'; });
        dom.addEventListener('mouseleave', () => { this.isDragging = false; dom.style.cursor = 'grab'; });
        dom.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.currentModelGroup) {
                // マウス操作で360度グリグリ回せる
                this.currentModelGroup.rotation.y += (e.offsetX - this.previousMousePosition.x) * 0.01;
                this.currentModelGroup.rotation.x += (e.offsetY - this.previousMousePosition.y) * 0.01;
            }
            this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
        });
        dom.style.cursor = 'grab';
    }

    _setupResizeHandler() {
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    this.renderer.setSize(width, height);
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                }
            }
        });
        this.resizeObserver.observe(this.container);
    }

    // 外部からキャラクラス（Sushi等）を注入する関数
    loadModel(ModelClass, skinName) {
        if (this.currentModelGroup) {
            this.scene.remove(this.currentModelGroup);
        }

        // 注入されたクラスをインスタンス化
        const modelInstance = new ModelClass(skinName);
        this.currentModelGroup = modelInstance.getMesh();
        this.scene.add(this.currentModelGroup);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        // ドラッグしていない時は自動で美しくゆっくり回転
        if (this.currentModelGroup && !this.isDragging) {
            this.currentModelGroup.rotation.y += 0.005;
            // 縦回転は徐々に水平に戻る（重力的な演出）
            this.currentModelGroup.rotation.x += (0 - this.currentModelGroup.rotation.x) * 0.05;
        }
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.container.innerHTML = '';
    }

    // ========================================================
    // 🌟 UI側（ui.js）からの呼び出しを受け付ける窓口
    // ========================================================
    static activeRenderers = {}; // 複数回開いたときに重くならないための管理帳

    static renderPreview(containerId, charId, skinName) {
        // 1. UIから来たID（char_sushi等）を、実際の3Dモデルクラス（SushiModel等）に変換
        let ModelClass = null;

        switch(charId) {
            case 'char_human': ModelClass = window.HumanModel; break;
            case 'char_apple': ModelClass = window.AppleModel; break;
            case 'char_robot': ModelClass = window.RobotModel; break;
            case 'char_dog':   ModelClass = window.DogModel; break;
            case 'char_pencil':ModelClass = window.PencilModel; break;
            case 'char_sushi': ModelClass = window.SushiModel; break;
        }

        // 2. まだモデルのファイル（models/Sushi.jsなど）が読み込まれていない場合の安全装置
        if (!ModelClass) {
            console.warn(`[ModelRenderer] ${charId} の3Dモデルクラスが見つかりません。HTMLで読み込まれているか確認してください。`);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:#888;">
                        <span style="font-size:40px;">🛠️</span>
                        <span style="margin-top:10px; font-weight:bold;">モデル準備中</span>
                    </div>`;
            }
            return;
        }

        // 3. すでに同じ場所で3Dを描画中なら、一度破壊して綺麗にする（メモリリーク防止）
        if (ModelRenderer.activeRenderers[containerId]) {
            ModelRenderer.activeRenderers[containerId].destroy();
        }

        // 4. 新しくレンダラーを立ち上げて、モデルを読み込ませる
        try {
            const renderer = new ModelRenderer(containerId);
            renderer.loadModel(ModelClass, skinName);
            // 次回開いた時に破棄できるように管理帳に記録
            ModelRenderer.activeRenderers[containerId] = renderer;
        } catch (error) {
            console.error("3D描画エラー:", error);
        }
    }
}
// グローバルに登録
window.ModelRenderer = ModelRenderer;