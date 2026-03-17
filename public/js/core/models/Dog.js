// public/js/core/models/Dog.js

class DogModel {
    constructor(skinName = 'default') {
        this.group = new THREE.Group();
        this.originalSkinName = skinName;
        // 小文字化して判定
        this.skinName = skinName ? String(skinName).toLowerCase() : 'default';
        this.createModel();
    }

    createModel() {
        console.log(`[DogModel] リアル体形・脚の筋肉太さ＆ダックス尻尾自然修正版起動: 受信したスキン名: "${this.originalSkinName}"`);

        // ==========================================
        // 1. スキンの判定（犬種ごとの特徴を定義）
        // ==========================================
        const isPoodle = this.skinName.includes('トイプードル') || this.skinName.includes('poodle');
        const isChihuahua = this.skinName.includes('チワワ') || this.skinName.includes('chihuahua');
        const isBulldog = this.skinName.includes('ブルドッグ') || this.skinName.includes('bulldog');
        const isDachshund = this.skinName.includes('ダックス') || this.skinName.includes('dachshund');
        const isShiba = !isPoodle && !isChihuahua && !isBulldog && !isDachshund;

        let mainColor = 0xb07b49;    // 柴犬色
        let legLength = 0.5;         // 脚の基本長さ
        let earType = 'pointy';       // 耳の形
        let tailType = 'curl';        // 尻尾の形

        // 脚の太さパラメータ（太もも と 足首）（維持！）
        let legRadiusTop = 0.11;     // 付け根（太もも・肩）の太さ
        let legRadiusBottom = 0.07;  // 足首の太さ

        // 犬種ごとの骨格パラメータ（がっしり肉厚）（維持！）
        let bodyParams = {
            chestWidth: 0.8,        // 胸の幅 
            chestDepth: 1.1,        // 胸の厚み（縦） 
            ribLength: 0.8,         // 肋骨の長さ
            abdomenWidth: 0.6,      // お腹の幅 
            abdomenDepth: 0.7,      // お腹の厚み（巻き上がり） 
            pelvisWidth: 0.75,      // 腰の幅 
            neckThickness: 0.28,    // 首の太さ 
            muscleTone: 1.0,        // 筋肉の盛り上がり
        };

        if (isShiba) {
            // 柴犬
        } else if (isPoodle) {
            // トイプードル
            mainColor = 0xe4a85c; 
            earType = 'floppy';
            tailType = 'short';
            legLength = 0.6; 
            legRadiusTop = 0.09;     
            legRadiusBottom = 0.06;
            bodyParams.chestWidth = 0.6; 
            bodyParams.abdomenDepth = 0.6; 
            bodyParams.pelvisWidth = 0.6; 
            bodyParams.neckThickness = 0.22;
            bodyParams.muscleTone = 0.8; 

        } else if (isChihuahua) {
            // チワワ
            mainColor = 0xdbd0a7; 
            legLength = 0.4; 
            legRadiusTop = 0.06;     
            legRadiusBottom = 0.04;
            bodyParams.chestWidth = 0.55; 
            bodyParams.chestDepth = 0.9; 
            bodyParams.ribLength = 0.6;
            bodyParams.abdomenWidth = 0.45;
            bodyParams.pelvisWidth = 0.5; 
            bodyParams.neckThickness = 0.18;
            bodyParams.muscleTone = 0.6;

        } else if (isBulldog) {
            // ブルドッグ (がっしり肉厚の極み！)
            mainColor = 0xeeeeee; 
            earType = 'floppy';
            tailType = 'short';
            legLength = 0.35; 
            legRadiusTop = 0.16;     
            legRadiusBottom = 0.10;
            bodyParams.chestWidth = 1.1; 
            bodyParams.chestDepth = 1.3; 
            bodyParams.ribLength = 0.7;
            bodyParams.abdomenWidth = 0.9;
            bodyParams.abdomenDepth = 1.1; 
            bodyParams.pelvisWidth = 1.0; 
            bodyParams.neckThickness = 0.45;
            bodyParams.muscleTone = 1.4; 

        } else if (isDachshund) {
            // ミニチュアダックスフンド
            mainColor = 0x5c3c21; 
            earType = 'floppy';
            tailType = 'long'; 
            legLength = 0.25; 
            legRadiusTop = 0.12;     
            legRadiusBottom = 0.08;
            bodyParams.ribLength = 1.7; // 圧倒的胴長
            bodyParams.chestWidth = 0.7; // がっしり肉厚維持
            bodyParams.chestDepth = 0.9; 
            bodyParams.abdomenDepth = 0.8; 
            bodyParams.pelvisWidth = 0.6; 
            bodyParams.neckThickness = 0.22;
            bodyParams.muscleTone = 0.9;
        }

        // ==========================================
        // 2. マテリアル（質感）（滑らか光沢維持！）
        // ==========================================
        const furMat = new THREE.MeshPhongMaterial({ 
            color: mainColor, 
            specular: 0x333333, 
            shininess: 40       
        });
        const blackMat = new THREE.MeshPhongMaterial({ color: 0x111111, specular: 0x444444, shininess: 100 }); 
        const innerEarMat = new THREE.MeshPhongMaterial({ color: 0xffb6c1, specular: 0x111111, shininess: 20 }); 
        const jointMat = new THREE.MeshPhongMaterial({ color: 0x333333, specular: 0x111111, shininess: 20 }); 

        // 前回の素晴らしい要素用のマテリアル（維持！）
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x222222, shininess: 40 }); 
        const collarMat = new THREE.MeshPhongMaterial({ color: 0xdd1111, shininess: 100, specular: 0xffffff }); // 赤い首輪
        const goldMat = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 200, specular: 0xffffff }); // 金の鈴
        const tongueMat = new THREE.MeshPhongMaterial({ color: 0xff6699, specular: 0x111111, shininess: 20 }); // ピンクの舌
        const spotMat = new THREE.MeshPhongMaterial({ color: 0x8b4513, specular: 0x111111, shininess: 30 }); // ブルドッグの模様

        const dogGroup = new THREE.Group();
        this.group.add(dogGroup);

        // ==========================================
        // 3. 骨格串刺し胴体（Body）を究極滑らか＆がっしり肉厚に！（維持！）
        // ==========================================
        const R = bodyParams.ribLength;
        const abdomenLen = R * 0.8;

        const chestZ = R * 0.45; 
        const ribsZ = 0;
        const abdomenZ = -(R * 0.6) - (abdomenLen * 0.5); 
        const pelvisZ = abdomenZ - (abdomenLen * 0.5) - (R * 0.1); 

        // a. 胸（Thorax・前胸）
        const thoraxGroup = new THREE.Group();
        const chestGeo = new THREE.SphereGeometry(0.4, 64, 64);
        const chest = new THREE.Mesh(chestGeo, furMat);
        chest.scale.set(bodyParams.chestWidth, bodyParams.chestDepth, bodyParams.muscleTone);
        chest.position.set(0, 0, chestZ); 
        thoraxGroup.add(chest);

        if (isShiba || isChihuahua) {
            const chestFluffGeo = new THREE.SphereGeometry(0.32, 64, 64); 
            const chestFluff = new THREE.Mesh(chestFluffGeo, whiteMat);
            chestFluff.scale.set(bodyParams.chestWidth * 1.0, 0.8, 1.1);
            chestFluff.position.set(0, -0.05, chestZ + 0.18); 
            thoraxGroup.add(chestFluff);
        }
        dogGroup.add(thoraxGroup);

        // 肋骨（胸郭）
        const ribGeo = new THREE.CylinderGeometry(0.4, 0.4, R, 64);
        const ribs = new THREE.Mesh(ribGeo, furMat);
        ribs.rotation.x = Math.PI / 2; 
        ribs.scale.set(bodyParams.chestWidth, 1.0, bodyParams.chestDepth);
        ribs.position.set(0, 0, ribsZ);
        dogGroup.add(ribs);

        const shoulderMuscleGeo = new THREE.SphereGeometry(0.42, 64, 64); 
        const shoulderMuscleL = new THREE.Mesh(shoulderMuscleGeo, furMat);
        shoulderMuscleL.scale.set(bodyParams.muscleTone, 1.2, 1.0);
        shoulderMuscleL.position.set(-0.25 * bodyParams.chestWidth, 0, chestZ - (R * 0.1)); 
        dogGroup.add(shoulderMuscleL);
        const shoulderMuscleR = shoulderMuscleL.clone();
        shoulderMuscleR.position.x = 0.25 * bodyParams.chestWidth;
        dogGroup.add(shoulderMuscleR);

        const midBodyJointGeo = new THREE.SphereGeometry(0.4, 64, 64); 
        const midBodyJoint = new THREE.Mesh(midBodyJointGeo, furMat);
        midBodyJoint.scale.set(bodyParams.chestWidth, bodyParams.chestDepth * 0.95, 1.0); 
        midBodyJoint.position.set(0, 0, -(R * 0.5) + (R * 0.05)); 
        dogGroup.add(midBodyJoint);

        // b. お腹（Abdomen・タックアップ）
        const abdomenGeo = new THREE.CylinderGeometry(0.4, 0.33, abdomenLen, 64); 
        const abdomen = new THREE.Mesh(abdomenGeo, furMat);
        abdomen.rotation.x = Math.PI / 2;
        abdomen.scale.set(bodyParams.abdomenWidth, 1.0, bodyParams.abdomenDepth); 
        abdomen.position.set(0, 0.05, abdomenZ); 
        dogGroup.add(abdomen);

        const hipMuscleGeo = new THREE.SphereGeometry(0.4, 64, 64); 
        const hipMuscleL = new THREE.Mesh(hipMuscleGeo, furMat);
        hipMuscleL.scale.set(bodyParams.muscleTone, 1.1, 1.0);
        hipMuscleL.position.set(-0.2 * bodyParams.pelvisWidth, 0.05, pelvisZ + (abdomenLen * 0.1)); 
        dogGroup.add(hipMuscleL);
        const hipMuscleR = hipMuscleL.clone();
        hipMuscleR.position.x = 0.2 * bodyParams.pelvisWidth;
        dogGroup.add(hipMuscleR);

        // c. 腰・臀部（Pelvis・丸み）
        const pelvisGeo = new THREE.SphereGeometry(0.38, 64, 64);
        const pelvis = new THREE.Mesh(pelvisGeo, furMat);
        pelvis.scale.set(bodyParams.pelvisWidth, bodyParams.abdomenDepth, 1.0); 
        pelvis.position.set(0, 0.05, pelvisZ); 
        dogGroup.add(pelvis);

        // ==========================================
        // 4. 頭（Head）（ウルウル星、金の鈴、舌維持！）
        // ==========================================
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.35 * bodyParams.chestDepth, chestZ + 0.15); 
        headGroup.rotation.z = -0.15;
        headGroup.rotation.y = -0.1;
        dogGroup.add(headGroup);

        const neckGroup = new THREE.Group();
        neckGroup.rotation.x = -0.3;
        headGroup.add(neckGroup);

        const neckGeo = new THREE.CylinderGeometry(bodyParams.neckThickness, bodyParams.neckThickness * 1.2, 0.45, 64);
        const neck = new THREE.Mesh(neckGeo, furMat);
        neck.position.y = 0.05;
        neckGroup.add(neck);

        const collar = new THREE.Mesh(new THREE.TorusGeometry(bodyParams.neckThickness * 1.1, 0.035, 32, 64), collarMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, 0.1, 0.05);
        neckGroup.add(collar);

        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 32), goldMat);
        bell.position.set(0, 0.08, bodyParams.neckThickness * 1.1 + 0.08);
        neckGroup.add(bell);

        let headMain;
        if (isPoodle) {
            headMain = new THREE.Group();
            headMain.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 64, 64), furMat));
            for(let i=0; i<6; i++){
                const fluff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), furMat);
                fluff.position.set(Math.cos(i * Math.PI / 3) * 0.2, 0.15, Math.sin(i * Math.PI / 3) * 0.2);
                headMain.add(fluff);
            }
        } else if (isChihuahua) {
            headMain = new THREE.Mesh(new THREE.SphereGeometry(0.28, 64, 64), furMat);
        } else if (isBulldog) {
            headMain = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), furMat);
            const spotGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
            const spot = new THREE.Mesh(spotGeo, spotMat);
            spot.position.set(0.15, 0.15, 0.21);
            headMain.add(spot);
        } else {
            headMain = new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 64), furMat);
        }
        headMain.position.y = 0.35;
        headMain.castShadow = true;
        headGroup.add(headMain);

        const createEye = (isLeft) => {
            const eyeGroup = new THREE.Group();
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), blackMat);
            const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), whiteMat);
            catchlight.position.set(isLeft ? 0.022 : -0.022, 0.025, 0.038); 
            eyeGroup.add(eye, catchlight);
            eyeGroup.position.set(isLeft ? -0.14 : 0.14, 0.48, 0.27);
            return eyeGroup;
        };
        headGroup.add(createEye(true));
        headGroup.add(createEye(false));

        let muzzle;
        if (isBulldog) {
            muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), furMat);
            muzzle.position.set(0, 0.3, 0.35);
        } else if (isPoodle) {
            muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 64), furMat);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.3, 0.4);
        } else {
            muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 0.3, 64), furMat);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.3, 0.4);
        }
        headGroup.add(muzzle);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), blackMat);
        nose.position.set(0, 0.33, 0.55);
        headGroup.add(nose);

        const tongueGeo = new THREE.SphereGeometry(0.07, 16, 16);
        tongueGeo.scale(1.0, 0.3, 1.2);
        const tongue = new THREE.Mesh(tongueGeo, tongueMat);
        tongue.position.set(0.03, 0.21, 0.5); 
        tongue.rotation.x = 0.3;
        tongue.rotation.z = -0.15;
        headGroup.add(tongue);

        const createEar = (isLeft) => {
            const earGroup = new THREE.Group();
            if (earType === 'pointy') {
                const earGeo = new THREE.CylinderGeometry(0.01, 0.15, 0.32, 64);
                const ear = new THREE.Mesh(earGeo, furMat);
                ear.rotation.y = isLeft ? -Math.PI / 4 : Math.PI / 4;
                ear.position.y = 0.16;
                const innerGeo = new THREE.CylinderGeometry(0.005, 0.1, 0.26, 64);
                const inner = new THREE.Mesh(innerGeo, innerEarMat);
                inner.position.set(0, 0.13, isLeft ? -0.01 : 0.01);
                ear.add(inner);
                earGroup.add(ear);
                earGroup.position.set(isLeft ? -0.2 : 0.2, 0.62, isLeft ? -0.12 : 0.12);
                earGroup.rotation.z = isLeft ? 0.32 : -0.32;
            } else {
                const earGeo = new THREE.SphereGeometry(0.16, 64, 64);
                const ear = new THREE.Mesh(earGeo, furMat);
                ear.scale.set(1, 1.9, 0.3);
                ear.position.y = -0.22;
                earGroup.add(ear);
                if(isPoodle) {
                     for(let i=0; i<3; i++) {
                         const fluff = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), furMat);
                         fluff.position.y = -0.15 - i * 0.18;
                         earGroup.add(fluff);
                     }
                }
                earGroup.position.set(isLeft ? -0.36 : 0.36, 0.5, 0);
                earGroup.rotation.z = isLeft ? -0.1 : 0.1;
            }
            return earGroup;
        };
        headGroup.add(createEar(true));
        headGroup.add(createEar(false));

        // ==========================================
        // 5. 脚（Legs）の筋肉量を犬種別に究極再現！（維持！）
        // ==========================================
        const createLeg = (isFront, isLeft) => {
            const legGroup = new THREE.Group();
            const currentLegLength = legLength * (isBulldog ? 0.8 : 1);

            // 🌟 上が太く下が細いテーパー形状で筋肉を表現！
            const legGeo = new THREE.CylinderGeometry(legRadiusTop, legRadiusBottom, currentLegLength, 64);
            const leg = new THREE.Mesh(legGeo, furMat);
            leg.position.y = -currentLegLength / 2;
            leg.castShadow = true;
            legGroup.add(leg);

            // 🌟 足先のサイズも足首の太さに合わせる！
            const footGeo = new THREE.SphereGeometry(legRadiusBottom * 1.3, 64, 64);
            const foot = new THREE.Mesh(footGeo, jointMat);
            foot.scale.set(1, 0.5, 1.2); 
            foot.position.y = -currentLegLength;
            foot.position.z = legRadiusBottom * 0.5; // つま先を前に
            legGroup.add(foot);

            let zPos, xPos, yPos;
            if (isFront) {
                zPos = chestZ - 0.1; 
                xPos = (isLeft ? -0.28 : 0.28) * bodyParams.chestWidth; 
                yPos = -0.35 * bodyParams.chestDepth; 
            } else {
                zPos = pelvisZ + 0.1; 
                xPos = (isLeft ? -0.25 : 0.25) * bodyParams.pelvisWidth;
                yPos = -0.35 * bodyParams.abdomenDepth; 
            }
            legGroup.position.set(xPos, yPos, zPos); 

            if (isFront && isLeft) legGroup.rotation.x = 0.15; 
            if (isFront && !isLeft) legGroup.rotation.x = -0.05; 
            if (!isFront && isLeft) legGroup.rotation.x = -0.15; 
            if (!isFront && !isLeft) legGroup.rotation.x = 0.1; 

            return legGroup;
        };

        dogGroup.add(createLeg(true, true));   
        dogGroup.add(createLeg(true, false));  
        dogGroup.add(createLeg(false, true));  
        dogGroup.add(createLeg(false, false)); 

        // ==========================================
        // 🌟 6. 究極進化：尻尾（Tail）ダックス自然修正版！
        // 分割数を64以上に増やして滑らかに！
        // ==========================================
        const tailGroup = new THREE.Group();
        dogGroup.add(tailGroup);

        if (tailType === 'long') {
            if (isDachshund) {
                // 🌟 【新規】ダックスフンド：背線の終わり（お尻の上端）から自然に生える
                const pelvisTopY = 0.05 + 0.38 * bodyParams.abdomenDepth; // お尻の球体の上端（背線の終わり）

                // 🌟 修正ポイント：接続点を背線の終わり（お尻の上端）に劇的移動！
                tailGroup.position.set(0, pelvisTopY, pelvisZ - 0.28); 

                // ジオメトリ：上が細く、下が太い（付け根）
                const tailGeo = new THREE.CylinderGeometry(0.015, 0.05, 0.6, 64);
                const tail = new THREE.Mesh(tailGeo, furMat);

                // 🌟 修正ポイント：上向きカーブを緩和し、左右修正も維持！
                tailGroup.rotation.x = 0.3; // 緩やかに上向き
                tailGroup.rotation.z = -0.15; // 自然な向きへ（左右修正維持）

                // 🌟 修正ポイント：付け根をがっしりしたお尻の筋肉になめらかに食い込ませる！
                // 円柱の中心を(0,0.22,0.08)に。これで付け根（下端）が体に深く食い込みつつ、滑らかに生える。
                tail.position.y = 0.22; // 中心。下端は(0, -0.08, 0)。
                tail.position.z = 0.08; // 付け根の太さ分、後ろへ。食い込みを緩和。

                tailGroup.add(tail);

            } else {
                // 他犬種：垂れ尾（前回の設定維持）
                tailGroup.position.set(0, 0.3 * bodyParams.abdomenDepth, pelvisZ - 0.3);
                const tailGeo = new THREE.CylinderGeometry(0.015, 0.05, 0.6, 64); 
                const tail = new THREE.Mesh(tailGeo, furMat);
                tail.rotation.x = -0.6; // 垂れ下がる
                tail.position.y = -0.15;
                tail.position.z = -0.25;
                tail.rotation.z = 0.2; 
                tailGroup.add(tail);
            }
        } else if (tailType === 'curl') {
             // 巻き尾 (維持)
             tailGroup.position.set(0, 0.3 * bodyParams.abdomenDepth, pelvisZ - 0.3);
             const tail = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.065, 32, 64, Math.PI * 1.5), furMat);
             tail.rotation.y = Math.PI / 2;
             tail.rotation.z = Math.PI / 4;
             tailGroup.add(tail);
        } else if (tailType === 'short') {
             // 短い尻尾 (維持)
             tailGroup.position.set(0, 0.3 * bodyParams.abdomenDepth, pelvisZ - 0.3);
             const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 32), furMat);
             if(isPoodle) tail.scale.set(1.6, 1.6, 1.6); 
             tailGroup.add(tail);
        }

        // ==========================================
        // 7. 全体の位置調整
        // ==========================================
        dogGroup.position.y = 0.5; // 地面に埋まらないように持ち上げる
        // 🌟 前回の素晴らしい要素：角度（立体的に見せる）（維持！）
        dogGroup.rotation.y = 0.3; 
    }

    getMesh() {
        return this.group;
    }
}

window.DogModel = DogModel;