// public/js/core/models/Human.js

class HumanModel {
    // ==========================================
    // 🌟 ショップUIからも参照できる39色の定義データ
    // ==========================================
    static SKIN_PALETTE = {
        'default': 0xFFFFFF,      // 初期スキン（白） - 無料

        // 39色の服（各10コイン）
        'color_1':  0xFF0000, // レッド
        'color_2':  0x0000FF, // ブルー
        'color_3':  0x00FF00, // グリーン
        'color_4':  0xFFFF00, // イエロー
        'color_5':  0xFFA500, // オレンジ
        'color_6':  0x800080, // パープル
        'color_7':  0xFFC0CB, // ピンク
        'color_8':  0x00FFFF, // シアン
        'color_9':  0xFF00FF, // マゼンタ
        'color_10': 0x32CD32, // ライムグリーン
        'color_11': 0x008080, // ティール（青緑）
        'color_12': 0x4B0082, // インディゴ
        'color_13': 0xEE82EE, // バイオレット
        'color_14': 0x800000, // マルーン（栗色）
        'color_15': 0x000080, // ネイビー
        'color_16': 0x808000, // オリーブ
        'color_17': 0xC0C0C0, // シルバー
        'color_18': 0x808080, // グレー
        'color_19': 0x111111, // ブラック（完全な黒だと影が潰れるため微調整）
        'color_20': 0xA52A2A, // ブラウン
        'color_21': 0xFF7F50, // コーラル
        'color_22': 0xDC143C, // クリムゾン（真紅）
        'color_23': 0xFFD700, // ゴールド
        'color_24': 0xF0E68C, // カーキ
        'color_25': 0xE6E6FA, // ラベンダー
        'color_26': 0xDDA0DD, // プラム
        'color_27': 0xFA8072, // サーモン
        'color_28': 0x40E0D0, // ターコイズ
        'color_29': 0xF5F5DC, // ベージュ
        'color_30': 0xD2691E, // チョコレート
        'color_31': 0x006400, // ダークグリーン
        'color_32': 0x8B0000, // ダークレッド
        'color_33': 0xFF69B4, // ホットピンク
        'color_34': 0xADD8E6, // ライトブルー
        'color_35': 0x191970, // ミッドナイトブルー
        'color_36': 0xDA70D6, // オーキッド（薄紫）
        'color_37': 0x2E8B57, // シーグリーン
        'color_38': 0x708090, // スレートグレー
        'color_39': 0xFF6347, // トマト

        // 自分でデザイン可能な服（30コイン）用フラグ
        'custom':   0xEEEEEE  
    };

    /**
     * @param {string} skinName - スキンID
     */
    constructor(skinName) {
        this.mesh = new THREE.Group();
        this.skinName = skinName || 'default';
        this.buildModel();
    }

    buildModel() {
        // ==========================================
        // 1. スキンの色を決定する
        // ==========================================
        let clothesColor = HumanModel.SKIN_PALETTE['default'];

        if (this.skinName) {
            if (this.skinName.startsWith('#')) {
                clothesColor = new THREE.Color(this.skinName);
            } else if (this.skinName === '自分でデザイン可能な服' || this.skinName === 'custom') {
                clothesColor = HumanModel.SKIN_PALETTE['custom'];
            } else if (this.skinName === '白色の服を着る人間') {
                clothesColor = HumanModel.SKIN_PALETTE['default'];
            } else if (HumanModel.SKIN_PALETTE[this.skinName] !== undefined) {
                clothesColor = HumanModel.SKIN_PALETTE[this.skinName];
            }
        }

        // ==========================================
        // 2. マテリアル（質感と色）の定義
        // ==========================================
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffccaa, 
            roughness: 0.4,
            metalness: 0.1
        });

        const clothesMaterial = new THREE.MeshStandardMaterial({ 
            color: clothesColor, 
            roughness: 0.7,
            metalness: 0.1
        });

        if (this.skinName === '自分でデザイン可能な服' || this.skinName === 'custom') {
            clothesMaterial.userData = { isCustomSkin: true };
        }

        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2
        });

        // 👑 ★影＋360度反射の究極ハイブリッド！
        if (this.skinName === 'base_gold') {
            const pureGold = 0xFFD700;

            skinMaterial.color.setHex(pureGold);
            skinMaterial.metalness = 1.0;
            skinMaterial.roughness = 0.3; 
            skinMaterial.emissive.setHex(0x332200); 
            skinMaterial.emissiveIntensity = 0.4;

            clothesMaterial.color.setHex(pureGold);
            clothesMaterial.metalness = 1.0;
            clothesMaterial.roughness = 0.3;
            clothesMaterial.emissive.setHex(0x332200);
            clothesMaterial.emissiveIntensity = 0.4;

            eyeMaterial.color.setHex(pureGold);
            eyeMaterial.metalness = 1.0;
            eyeMaterial.roughness = 0.1;

            // 🌟 影を作るための「強烈な主光源（キーライト）」
            const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.5); // 強めの光でコントラストを出す
            mainLight.position.set(10, 15, 10); // 右斜め上から当てる
            mainLight.castShadow = true;        // ★ここで影をオン！
            // 影を綺麗に描画するための設定
            mainLight.shadow.mapSize.width = 1024;
            mainLight.shadow.mapSize.height = 1024;
            mainLight.shadow.bias = -0.001;
            this.mesh.add(mainLight);

            // 🌟 現状維持：360個の反射用ライト
            const totalLights = 360; 
            const radius = 20.0;     
            const phi = Math.PI * (3 - Math.sqrt(5)); 

            // 主光源（1.5）を足した分、白飛びを防ぐために360個の光はほんの少しだけ弱める
            const intensity = 0.012; 
            const lightColor = 0xFFFFFF;

            for (let i = 0; i < totalLights; i++) {
                const y = 1 - (i / (totalLights - 1)) * 2; 
                const r = Math.sqrt(1 - y * y); 
                const theta = phi * i; 

                const x = Math.cos(theta) * r;
                const z = Math.sin(theta) * r;

                const light = new THREE.DirectionalLight(lightColor, intensity);
                light.position.set(x * radius, y * radius, z * radius);
                // ※ ここは castShadow を設定しない（反射のツヤ出し専用）
                this.mesh.add(light);
            }

            const ambientLight = new THREE.AmbientLight(0xffddaa, 0.4);
            this.mesh.add(ambientLight);
        }

        // ==========================================
        // 3. 各パーツの生成と組み立て
        // ==========================================

        const headGeo = new THREE.SphereGeometry(0.8, 32, 32);
        const head = new THREE.Mesh(headGeo, skinMaterial);
        head.position.y = 2.0; 
        head.castShadow = true;
        head.receiveShadow = true; // ★自分自身に影を落とすように追加
        this.mesh.add(head);

        const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        leftEye.position.set(-0.3, 2.1, 0.72);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        rightEye.position.set(0.3, 2.1, 0.72);
        this.mesh.add(rightEye);

        const bodyGeo = new THREE.CapsuleGeometry(0.55, 0.6, 16, 32);
        const body = new THREE.Mesh(bodyGeo, clothesMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        body.receiveShadow = true; // ★追加
        this.mesh.add(body);

        const handGeo = new THREE.SphereGeometry(0.25, 32, 32);
        const leftHand = new THREE.Mesh(handGeo, skinMaterial);
        leftHand.position.set(-0.9, 0.9, 0.2); 
        leftHand.castShadow = true;
        leftHand.receiveShadow = true; // ★追加
        this.mesh.add(leftHand);

        const rightHand = new THREE.Mesh(handGeo, skinMaterial);
        rightHand.position.set(0.9, 0.9, 0.2); 
        rightHand.castShadow = true;
        rightHand.receiveShadow = true; // ★追加
        this.mesh.add(rightHand);

        const footGeo = new THREE.SphereGeometry(0.3, 32, 32);
        const leftFoot = new THREE.Mesh(footGeo, clothesMaterial);
        leftFoot.scale.set(1, 0.6, 1.3);
        leftFoot.position.set(-0.35, 0.2, 0.1); 
        leftFoot.castShadow = true;
        leftFoot.receiveShadow = true; // ★追加
        this.mesh.add(leftFoot);

        const rightFoot = new THREE.Mesh(footGeo, clothesMaterial);
        rightFoot.scale.set(1, 0.6, 1.3);
        rightFoot.position.set(0.35, 0.2, 0.1); 
        rightFoot.castShadow = true;
        rightFoot.receiveShadow = true; // ★追加
        this.mesh.add(rightFoot);

        this.mesh.position.y = 0;
    }

    getMesh() {
        return this.mesh;
    }
}

window.HumanModel = HumanModel;