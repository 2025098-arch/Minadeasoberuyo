// public/js/core/model_renderer.js

const ModelRenderer = {
    scene: null,
    camera: null,
    renderer: null,
    characterMesh: null,
    container: null,
    animationId: null, // アニメーションの重複起動を防ぐためのID
    resizeObserver: null, // 画面サイズを完璧に監視するシステム

    init: function(containerId) {
        console.log("🎨 3Dモデルレンダラー起動");
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // すでにアニメーションが動いていたら止める（画面切り替え時のバグ防止）
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.resizeObserver) this.resizeObserver.disconnect();

        // 既存の「ここに表示されます」というテキストを消す
        this.container.innerHTML = '';

        // 1. シーン（3D空間）の作成
        this.scene = new THREE.Scene();

        // 2. カメラの作成 (画面サイズが取得できない時は仮の数字100を入れる安全対策)
        const width = this.container.clientWidth || 100;
        const height = this.container.clientHeight || 100;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

        // 🌟 ここを 4 から 6 に変更して、カメラを少し後ろに引く
        this.camera.position.z = 6;

        // 3. レンダラー（描画エンジン）の作成
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // 背景透明 ＆ 輪郭を滑らかに
        this.renderer.setSize(width, height);
        this.container.appendChild(this.renderer.domElement);

        // 4. 光の追加（光がないと真っ黒になってしまうため）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 全体を照らす光
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 太陽のような強い光
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // 5. 初期キャラの作成
        this.createBaseCharacter();

        // 6. アニメーション（回転）の開始
        this.animate();

        // 7. 画面サイズが変わった時の完璧な対応 (ResizeObserver)
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                // サイズが0の時は計算しない（エラーで画面が真っ白になるのを防ぐ）
                if (width > 0 && height > 0) {
                    this.renderer.setSize(width, height);
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                }
            }
        });
        this.resizeObserver.observe(this.container);
    },

    createBaseCharacter: function() {
        // ※後々はここに本格的な3Dモデル(.gltfなど)を読み込み、
        // 1/100ピクセル単位の精密なスキンを描画するシステムに差し替えます。
        // 今回はバージョンに依存せず「100%確実に動く」円柱を仮の姿として作成します。

        // 半径上1、半径下1、高さ2、円の分割数16 の円柱
        const geometry = new THREE.CylinderGeometry(1, 1, 2, 16); 
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x03a9f4, // 白背景と同化しないようアクセントブルー
            roughness: 0.5,  // 少しマットな質感
            metalness: 0.1
        });

        this.characterMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.characterMesh);
    },

    animate: function() {
        // 毎フレーム（1秒間に約60回）この関数を呼び出す
        this.animationId = requestAnimationFrame(() => this.animate());

        // キャラをゆっくりY軸（縦軸）で回転させる
        if (this.characterMesh) {
            this.characterMesh.rotation.y += 0.005;
        }

        // 描画を実行
        this.renderer.render(this.scene, this.camera);
    }
};