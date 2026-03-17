// public/js/core/models/Robot.js

class RobotModel {
    constructor(skinName = 'default') {
        this.group = new THREE.Group();
        this.originalSkinName = skinName;
        this.skinName = skinName ? String(skinName).toLowerCase() : 'default';
        this.createModel();
    }

    createModel() {
        console.log(`[RobotModel] 受信したスキン名: "${this.originalSkinName}"`);

        const isAndroid = this.skinName.includes('アンドロイド') || this.skinName.includes('android');
        const isBlack = this.skinName.includes('黒') || this.skinName.includes('black');

        const mainColor = isBlack ? 0x1a1a1a : 0xFFFFFF; 
        const eyeColor = isBlack ? 0xff0033 : 0x00ffff;  

        // ==========================================
        // 🌟 マテリアル（質感）
        // ==========================================
        const androidMat = new THREE.MeshPhongMaterial({
            color: mainColor, specular: 0xffffff, shininess: 200
        });
        const robotMat = new THREE.MeshPhongMaterial({
            color: mainColor, specular: 0x555555, shininess: 30
        });
        const jointMat = new THREE.MeshPhongMaterial({ 
            color: 0x222222, specular: 0x666666, shininess: 60 
        });
        const glowMat = new THREE.MeshPhongMaterial({ 
            color: eyeColor, emissive: eyeColor, emissiveIntensity: 2.5 
        });

        // 胴体用グループ
        const bodyGroup = new THREE.Group();
        bodyGroup.position.y = 0.3; // デフォルトの高さ
        this.group.add(bodyGroup);

        if (isAndroid) {
            // ========================================================
            // 💫 【アンドロイド】究極の人型・5本指・スマートプロポーション
            // ========================================================

            // 🌟 リクエスト通り170%（1.7倍）に巨大化！
            bodyGroup.scale.set(1.7, 1.7, 1.7);

            // 🌟 巨大化した分、足が床にめり込まないようにY座標（高さ）を上に調整！
            bodyGroup.position.y = 0.55; 

            // 1. 胴体
            const chestGeo = new THREE.SphereGeometry(0.28, 32, 32);
            const chest = new THREE.Mesh(chestGeo, androidMat);
            chest.position.y = 1.05;
            chest.scale.set(1, 1.2, 0.7);

            const abdomenGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 32);
            const abdomen = new THREE.Mesh(abdomenGeo, androidMat);
            abdomen.position.y = 0.7;

            const pelvisGeo = new THREE.SphereGeometry(0.25, 32, 32);
            const pelvis = new THREE.Mesh(pelvisGeo, jointMat);
            pelvis.position.y = 0.45;
            pelvis.scale.set(1, 0.8, 0.8);

            bodyGroup.add(chest, abdomen, pelvis);

            // 2. 頭
            const headGroup = new THREE.Group();
            headGroup.position.set(0, 1.45, 0); 

            const headGeo = new THREE.SphereGeometry(0.22, 32, 32);
            const head = new THREE.Mesh(headGeo, androidMat);
            head.scale.set(1, 1.3, 1.1); 

            const visorGeo = new THREE.CylinderGeometry(0.23, 0.15, 0.15, 32, 1, false, -Math.PI/3, Math.PI*2/3);
            const visor = new THREE.Mesh(visorGeo, new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 150 }));
            visor.position.set(0, 0.05, 0);
            visor.rotation.y = Math.PI / 2;
            visor.rotation.z = -0.1;

            const neonGeo = new THREE.BoxGeometry(0.3, 0.02, 0.2);
            const neon = new THREE.Mesh(neonGeo, glowMat);
            neon.position.set(0, 0.05, 0.15);

            headGroup.add(head, visor, neon);
            bodyGroup.add(headGroup);

            // 3. 手を作る関数
            const createHand = (isLeft) => {
                const handGroup = new THREE.Group();

                const palmGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
                const palm = new THREE.Mesh(palmGeo, androidMat);
                handGroup.add(palm);

                const fingerGeo = new THREE.CylinderGeometry(0.012, 0.008, 0.06, 8);

                const thumb = new THREE.Mesh(fingerGeo, androidMat);
                thumb.position.set(isLeft ? 0.05 : -0.05, -0.02, 0.02);
                thumb.rotation.z = isLeft ? -0.6 : 0.6;
                thumb.rotation.x = 0.2;
                handGroup.add(thumb);

                const fingerLengths = [0.06, 0.07, 0.065, 0.05];
                for(let i=0; i<4; i++) {
                    const fGeo = new THREE.CylinderGeometry(0.012, 0.008, fingerLengths[i], 8);
                    const finger = new THREE.Mesh(fGeo, androidMat);
                    finger.position.set((isLeft ? 1 : -1) * (i - 1.5) * 0.022, -0.05 - (fingerLengths[i]/2), 0);
                    handGroup.add(finger);
                }
                return handGroup;
            };

            // 4. 腕
            const createAndroidArm = (isLeft) => {
                const armGroup = new THREE.Group();
                armGroup.position.set(isLeft ? -0.35 : 0.35, 1.25, 0); 

                const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), jointMat);
                const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 32), androidMat);
                upperArm.position.y = -0.18;
                const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 32), jointMat);
                elbow.position.y = -0.36;
                const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.35, 32), androidMat);
                lowerArm.position.y = -0.54;

                const hand = createHand(isLeft);
                hand.position.y = -0.75;

                armGroup.add(shoulder, upperArm, elbow, lowerArm, hand);

                armGroup.rotation.z = isLeft ? 0.15 : -0.15;
                armGroup.rotation.x = -0.1;
                return armGroup;
            };
            bodyGroup.add(createAndroidArm(true));
            bodyGroup.add(createAndroidArm(false));

            // 5. 脚
            const createAndroidLeg = (isLeft) => {
                const legGroup = new THREE.Group();
                legGroup.position.set(isLeft ? -0.12 : 0.12, 0.45, 0); 

                const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.45, 32), androidMat);
                thigh.position.y = -0.22;
                const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 32), jointMat);
                knee.position.y = -0.45;
                const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.45, 32), androidMat);
                calf.position.y = -0.68;

                const footGroup = new THREE.Group();
                footGroup.position.y = -0.95;
                const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), androidMat);
                foot.position.z = 0.05; 
                footGroup.add(foot);

                legGroup.add(thigh, knee, calf, footGroup);
                return legGroup;
            };
            bodyGroup.add(createAndroidLeg(true));
            bodyGroup.add(createAndroidLeg(false));

        } else {
            // ========================================================
            // 🤖 【ロボット】無骨・重機・箱型・ガシャガシャ感（完全維持！）
            // ========================================================

            // 1. 胴体
            const bodyMain = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.7), robotMat);
            bodyMain.position.y = 0.7;
            const bodyBottom = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), jointMat);
            bodyBottom.position.y = 0.15;
            const duct = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), jointMat);
            duct.position.y = 0.8;
            bodyGroup.add(bodyMain, bodyBottom, duct);

            // 2. 頭
            const headGroup = new THREE.Group();
            headGroup.position.set(0, 1.4, 0);
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2), jointMat);
            neck.position.y = -0.1;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), robotMat);
            head.position.y = 0.2;
            const eyeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
            const eye = new THREE.Mesh(eyeGeo, glowMat);
            eye.rotation.x = Math.PI / 2;
            eye.position.set(0, 0.2, 0.31);
            headGroup.add(neck, head, eye);
            bodyGroup.add(headGroup);

            // 3. 腕
            const createRobotArm = (isLeft) => {
                const armGroup = new THREE.Group();
                armGroup.position.set(isLeft ? -0.55 : 0.55, 1.0, 0);
                const shoulderGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
                const shoulder = new THREE.Mesh(shoulderGeo, jointMat);
                shoulder.rotation.z = Math.PI / 2;
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), robotMat);
                arm.position.y = -0.35;
                const clawL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.15), jointMat);
                clawL.position.set(-0.08, -0.8, 0);
                const clawR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.15), jointMat);
                clawR.position.set(0.08, -0.8, 0);
                armGroup.add(shoulder, arm, clawL, clawR);
                armGroup.rotation.x = isLeft ? 0.3 : -0.1;
                return armGroup;
            };
            bodyGroup.add(createRobotArm(true));
            bodyGroup.add(createRobotArm(false));

            // 4. 脚
            const createRobotLeg = (isLeft) => {
                const legGroup = new THREE.Group();
                legGroup.position.set(isLeft ? -0.25 : 0.25, 0, 0);
                const hip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), jointMat);
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.4), robotMat);
                leg.position.y = -0.3;
                const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), jointMat);
                foot.position.y = -0.65;
                foot.position.z = 0.1;
                legGroup.add(hip, leg, foot);
                return legGroup;
            };
            bodyGroup.add(createRobotLeg(true));
            bodyGroup.add(createRobotLeg(false));
        }

        // ==========================================
        // 全体の角度調整
        // ==========================================
        this.group.rotation.y = 0.25; 
    }

    getMesh() {
        return this.group;
    }
}

window.RobotModel = RobotModel;