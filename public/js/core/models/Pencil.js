// public/js/core/models/Pencil.js

class PencilModel {
    constructor(skinName = 'default') {
        this.group = new THREE.Group();
        this.originalSkinName = skinName; // デバッグ用に元の名前を保存
        this.skinName = skinName ? String(skinName).toLowerCase() : 'default';
        this.createModel();
    }

    createModel() {
        // 🛠️ デバッグ用：ブラウザのコンソールに送られてきたスキン名を表示
        console.log(`[PencilModel] 受信したスキン名: "${this.originalSkinName}"`);

        // 🌟 判定の順番が重要（「きみどり」を「きいろ」より先に判定することで誤爆を防ぐ）
        // 💡 いただいたログに合わせて「ひらがな」のキーワードを大幅追加！
        const colorDefinitions = [
            { keys: ['シャーペン', 'mechanical', 'メカニカル'], color: 0x2b2b2b, isMech: true, isMetal: false },
            { keys: ['金', 'gold', 'きん'], color: 0xffd700, isMech: false, isMetal: true },
            { keys: ['銀', 'silver', 'ぎん'], color: 0xc0c0c0, isMech: false, isMetal: true },
            { keys: ['黄緑', 'yellowgreen', 'yellow_green', 'lightgreen', 'きみどり'], color: 0x9acd32, isMech: false, isMetal: false },
            { keys: ['水色', 'lightblue', 'light_blue', 'cyan', 'みずいろ'], color: 0xadd8e6, isMech: false, isMetal: false },
            { keys: ['赤', 'red', 'あか'], color: 0xff0000, isMech: false, isMetal: false },
            { keys: ['青', 'blue', 'あお'], color: 0x0000ff, isMech: false, isMetal: false },
            { keys: ['緑', 'green', 'みどり'], color: 0x00ff00, isMech: false, isMetal: false },
            { keys: ['黄', 'yellow', 'きいろ'], color: 0xffff00, isMech: false, isMetal: false },
            { keys: ['オレンジ', '橙', 'orange', 'だいだい'], color: 0xffa500, isMech: false, isMetal: false },
            { keys: ['ピンク', '桃', 'pink', 'もも', 'ぴんく'], color: 0xffc0cb, isMech: false, isMetal: false },
            { keys: ['紫', 'purple', 'むらさき'], color: 0x800080, isMech: false, isMetal: false },
            { keys: ['茶', 'brown', 'ちゃ'], color: 0x8b4513, isMech: false, isMetal: false },
            { keys: ['白', 'white', 'しろ'], color: 0xffffff, isMech: false, isMetal: false },
            { keys: ['黒', 'black', 'default', 'くろ'], color: 0x333333, isMech: false, isMetal: false }
        ];

        let matchedColor = 0x333333; // デフォルトは黒
        let isMechanical = false;
        let isMetal = false;
        let colorFound = false;

        // 1. 強力なキーワード判定（ひらがな対応版）
        for (const def of colorDefinitions) {
            if (def.keys.some(key => this.skinName.includes(key))) {
                matchedColor = def.color;
                isMechanical = def.isMech;
                isMetal = def.isMetal;
                colorFound = true;
                break;
            }
        }

        // 2. キーワードで見つからなかった場合、ただの数字が送られてきている可能性をケア
        if (!colorFound) {
            const numMatch = this.skinName.match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0], 10);
                const palette = [
                    0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xffa500, 0xffc0cb,
                    0x800080, 0xadd8e6, 0x9acd32, 0x8b4513, 0xffffff, 0x333333
                ]; // 仕様書の12色相当

                if (num >= 0 && num < palette.length && !this.skinName.includes('12色')) {
                    matchedColor = palette[num];
                    colorFound = true;
                }
            }
        }

        // 3. 最終セーフティネット
        if (!colorFound && this.skinName.includes('色鉛筆')) {
            matchedColor = 0xff0000; // とりあえず赤にする
        }

        // ==========================================
        // 🌟 既存機能キープ：マテリアル（質感）の設定
        // ==========================================
        const woodMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.8 });
        const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
        const eraserMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.9 });

        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: matchedColor,
            metalness: isMetal ? 0.9 : 0.1,
            roughness: isMetal ? 0.2 : 0.7
        });

        const coreMaterial = new THREE.MeshStandardMaterial({ 
            color: isMechanical ? 0x222222 : matchedColor, 
            roughness: 0.5 
        });

        // 胴体（六角柱）
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 6);
        const body = new THREE.Mesh(bodyGeo, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        this.group.add(body);

        // ==========================================
        // 🌟 既存機能キープ：通常の鉛筆 or シャーペンの形状分岐
        // ==========================================
        if (!isMechanical) {
            // 削られた木の部分
            const woodGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.8, 6);
            const wood = new THREE.Mesh(woodGeo, woodMaterial);
            wood.position.y = -1.9;
            wood.castShadow = true;
            this.group.add(wood);

            // 芯の先端
            const coreGeo = new THREE.CylinderGeometry(0.1, 0.01, 0.4, 6);
            const core = new THREE.Mesh(coreGeo, coreMaterial);
            core.position.y = -2.5;
            core.castShadow = true;
            this.group.add(core);

            // 後ろの金具
            const backMetalGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.4, 16);
            const backMetal = new THREE.Mesh(backMetalGeo, metalMaterial);
            backMetal.position.y = 1.7;
            backMetal.castShadow = true;
            this.group.add(backMetal);

            // 消しゴム
            const eraserGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.5, 16);
            const eraser = new THREE.Mesh(eraserGeo, eraserMaterial);
            eraser.position.y = 2.1;
            eraser.castShadow = true;
            this.group.add(eraser);

        } else {
            // シャーペンの形状
            const gripGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.0, 16);
            const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const grip = new THREE.Mesh(gripGeo, gripMaterial);
            grip.position.y = -1.0;
            this.group.add(grip);

            const tipGeo = new THREE.CylinderGeometry(0.3, 0.05, 0.8, 16);
            const tip = new THREE.Mesh(tipGeo, metalMaterial);
            tip.position.y = -1.9;
            this.group.add(tip);

            const leadGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
            const lead = new THREE.Mesh(leadGeo, coreMaterial);
            lead.position.y = -2.4;
            this.group.add(lead);

            const knockGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16);
            const knock = new THREE.Mesh(knockGeo, metalMaterial);
            knock.position.y = 1.8;
            this.group.add(knock);

            const clipGeo = new THREE.BoxGeometry(0.1, 1.2, 0.4);
            const clip = new THREE.Mesh(clipGeo, metalMaterial);
            clip.position.set(0, 1.0, 0.25);
            this.group.add(clip);
        }

        // ==========================================
        // 🌟 既存機能キープ：全体の位置・角度調整
        // ==========================================
        this.group.position.y = 1.5; // 前回調整した少し上の位置をキープ！
        this.group.rotation.z = -0.2;
        this.group.rotation.x = 0.2;
    }

    getMesh() {
        return this.group;
    }
}

// グローバルに登録
window.PencilModel = PencilModel;