// public/js/core/models/Sushi.js

class SushiModel {
    constructor(skinName) {
        this.group = new THREE.Group();

        let safeSkin = 'たまご';
        if (typeof skinName === 'string') {
            safeSkin = skinName;
        } else if (skinName && typeof skinName.name === 'string') {
            safeSkin = skinName.name;
        }
        this.skinName = safeSkin;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;

        const rimLight = new THREE.DirectionalLight(0xe0f7fa, 0.6);
        rimLight.position.set(-5, 5, -5);
        this.group.add(ambientLight, directionalLight, rimLight);

        try {
            this.build();
        } catch (e) {
            console.error("🍣 お寿司の描画中にエラーが発生しましたが、処理を続行します:", e);
        }
    }

    getMesh() {
        return this.group;
    }

    _createNoiseTexture(width, height, intensity) {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const val = 255 - Math.random() * intensity;
            imgData.data[i] = val;     
            imgData.data[i+1] = val;   
            imgData.data[i+2] = val;   
            imgData.data[i+3] = 255;   
        }
        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    _createFishTexture(baseColor, fatColor, isAburi = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.strokeStyle = fatColor;

        for (let i = -512; i < 1024; i += 45) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            for(let y = 0; y <= 512; y += 50) {
                const wave = Math.sin(y * 0.05) * 10;
                ctx.lineTo(i + (y * 0.1) + wave, y);
            }
            ctx.stroke();
        }

        if (isAburi) {
            for(let i=0; i<30; i++) {
                const grad = ctx.createRadialGradient(
                    Math.random()*512, Math.random()*512, 5, 
                    Math.random()*512, Math.random()*512, 80
                );
                grad.addColorStop(0, 'rgba(30, 10, 0, 0.7)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(Math.random()*512, Math.random()*512, 80, 0, Math.PI*2);
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    _createEbiTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#ffeeee');
        ctx.fillStyle = grad; 
        ctx.fillRect(0, 0, 512, 128);

        ctx.fillStyle = '#e63900';
        for (let i = 0; i < 512; i += 80) {
            ctx.beginPath();
            ctx.moveTo(i, 0); 
            ctx.quadraticCurveTo(i + 45, 64, i + 30, 128);
            ctx.lineTo(i - 30, 128);
            ctx.quadraticCurveTo(i - 15, 64, i - 10, 0);
            ctx.fill();
        }
        return new THREE.CanvasTexture(canvas);
    }

    _createHyperRealRice() {
        const riceGroup = new THREE.Group();
        let grainGeo;

        if (typeof THREE.CapsuleGeometry !== 'undefined') {
            grainGeo = new THREE.CapsuleGeometry(0.065, 0.11, 4, 8);
        } else {
            grainGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.16, 8, 1);
        }

        const grainMat = new THREE.MeshPhysicalMaterial({
            color: 0xfffcf8,
            roughness: 0.3,
            metalness: 0.0,
            transmission: 0.4, 
            thickness: 0.1,    
            clearcoat: 0.8,    
            clearcoatRoughness: 0.1
        });

        // 🍣 シャリを900粒 → 1400粒に大増量
        const grainCount = 1400; 
        let added = 0;

        if (typeof THREE.InstancedMesh !== 'undefined') {
            const instancedRice = new THREE.InstancedMesh(grainGeo, grainMat, grainCount);
            instancedRice.castShadow = true;
            instancedRice.receiveShadow = true;
            const dummy = new THREE.Object3D();

            while (added < grainCount) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                // ボリューム（幅・高さ・奥行き）も少しだけ拡大してふっくらさせる
                const rx = 0.8 * Math.cbrt(Math.random());
                const ry = 0.45 * Math.cbrt(Math.random());
                const rz = 1.25 * Math.cbrt(Math.random());

                const x = rx * Math.sin(phi) * Math.cos(theta);
                const y = ry * Math.sin(phi) * Math.sin(theta);
                const z = rz * Math.cos(phi);

                dummy.position.set(x, y, z);
                dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                dummy.updateMatrix();
                instancedRice.setMatrixAt(added, dummy.matrix);
                added++;
            }
            instancedRice.position.y = -0.25;
            riceGroup.add(instancedRice);

        } else {
            // InstancedMeshが使えない環境用のフォールバックも1400粒のボリュームに合わせて拡大
            while (added < grainCount) {
                const x = (Math.random() - 0.5) * 1.6;
                const y = (Math.random() - 0.5) * 0.9;
                const z = (Math.random() - 0.5) * 2.5;

                if ((x*x)/(0.8*0.8) + (y*y)/(0.45*0.45) + (z*z)/(1.25*1.25) <= 1) {
                    const grain = new THREE.Mesh(grainGeo, grainMat);
                    grain.position.set(x, y, z);
                    grain.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                    grain.castShadow = true;
                    grain.receiveShadow = true;
                    riceGroup.add(grain);
                    added++;
                }
            }
            riceGroup.position.y = -0.25;
        }
        return riceGroup;
    }

    build() {
        if (!this.skinName.includes('おいなり')) {
            this.group.add(this._createHyperRealRice());
        }

        switch (this.skinName) {
            case 'たまご': this._buildTamago(); break;
            case 'まぐろ': this._buildFish('#cc0000', '#ff8080', false); break;
            case 'サーモン': this._buildFish('#ff5500', '#ffd6b3', false); break;
            case 'いくら': this._buildIkura(); break;
            case 'えび': this._buildEbi(); break;
            case 'あぶりチーズサーモン': this._buildAburiCheese(); break;
            case 'うなぎ': this._buildUnagi(); break;
            case 'おいなりさん': this._buildInari(); break;
            default: this._buildTamago();
        }

        // キャラクターとして見やすい自然な角度
        this.group.rotation.x = 0.1;
        this.group.rotation.y = -0.15;
    }

    _buildTamago() {
        const eggGeo = new THREE.BoxGeometry(1.6, 0.4, 2.6, 16, 4, 16);
        const positions = eggGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            positions.setY(i, positions.getY(i) - (x * x * 0.05) - (z * z * 0.02));
        }
        eggGeo.computeVertexNormals();

        const eggMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, 
            roughness: 0.7,
            bumpMap: this._createNoiseTexture(256, 256, 50),
            bumpScale: 0.03
        });
        const egg = new THREE.Mesh(eggGeo, eggMat);
        egg.position.y = 0.1; 
        egg.castShadow = true;

        const bandGeo = new THREE.BoxGeometry(1.65, 1.0, 0.4);
        const bandMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.9,
            bumpMap: this._createNoiseTexture(256, 256, 200),
            bumpScale: 0.08
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = -0.15;
        band.castShadow = true;

        this.group.add(egg, band);
    }

    _buildFish(baseColor, fatColor, isAburi) {
        const netaGeo = new THREE.BoxGeometry(1.6, 0.4, 2.9, 32, 8, 32); 

        const positions = netaGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i);
            let y = positions.getY(i);
            let z = positions.getZ(i);

            const edgeDropX = Math.pow(Math.abs(x), 3) * 0.05;
            const edgeDropZ = Math.pow(Math.abs(z), 3) * 0.02;
            const taper = (z + 1.45) * 0.05; 
            const gravity = (x * x * 0.15) + (z * z * 0.04);

            positions.setY(i, y - edgeDropX - edgeDropZ + taper - gravity);
        }
        netaGeo.computeVertexNormals();

        const netaMat = new THREE.MeshPhysicalMaterial({
            map: this._createFishTexture(baseColor, fatColor, isAburi),
            roughness: 0.05,        
            metalness: 0.0,
            clearcoat: 1.0,         
            clearcoatRoughness: 0.1,
            transmission: 0.3,      
            ior: 1.45               
        });
        const neta = new THREE.Mesh(netaGeo, netaMat);
        neta.position.y = 0.15; 
        neta.castShadow = true;
        this.group.add(neta);
    }

    _buildIkura() {
        const seaweedGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.2, 32, 1, true);
        const seaweedMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.9, 
            side: THREE.DoubleSide,
            bumpMap: this._createNoiseTexture(256, 256, 200),
            bumpScale: 0.05
        });
        const seaweed = new THREE.Mesh(seaweedGeo, seaweedMat);
        seaweed.scale.set(0.9, 1.1, 1.3);
        seaweed.position.y = -0.1;
        seaweed.castShadow = true;
        this.group.add(seaweed);

        const ikuraOuterGeo = new THREE.SphereGeometry(0.18, 24, 24);
        const ikuraInnerGeo = new THREE.SphereGeometry(0.06, 16, 16); 

        const outerMat = new THREE.MeshPhysicalMaterial({
            color: 0xff6600,
            transmission: 1.0,  
            opacity: 1,
            roughness: 0.0,
            ior: 1.33,          
            thickness: 0.3,
            clearcoat: 1.0
        });
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });

        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 1.4;
            const z = (Math.random() - 0.5) * 2.0;
            const y = 0.05 + (Math.random() * 0.3);

            if (x*x + z*z < 0.8) {
                const outer = new THREE.Mesh(ikuraOuterGeo, outerMat);
                const inner = new THREE.Mesh(ikuraInnerGeo, innerMat);
                outer.position.set(x, y, z);
                inner.position.set(x + 0.02, y - 0.04, z + 0.02);
                outer.castShadow = true;
                this.group.add(outer, inner);
            }
        }
    }

    _buildEbi() {
        const ebiGeo = new THREE.BoxGeometry(1.5, 0.25, 2.6, 16, 4, 16);
        const positions = ebiGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const z = positions.getZ(i);
            const x = positions.getX(i);
            positions.setY(i, positions.getY(i) - (z * z * 0.08) - (x * x * 0.1)); 
        }
        ebiGeo.computeVertexNormals();

        const ebiMat = new THREE.MeshPhysicalMaterial({
            map: this._createEbiTexture(),
            roughness: 0.2,
            clearcoat: 0.8,         
            transmission: 0.1       
        });
        const ebi = new THREE.Mesh(ebiGeo, ebiMat);
        ebi.position.y = 0.15; 
        ebi.castShadow = true;

        const tailGeo = new THREE.ConeGeometry(0.5, 0.8, 8);
        const tailMat = new THREE.MeshStandardMaterial({ 
            color: 0xe62e00, 
            roughness: 0.4,
            bumpMap: this._createNoiseTexture(128, 128, 100),
            bumpScale: 0.02
        });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.rotation.x = -Math.PI / 2.2;
        tail.position.set(0, -0.05, 1.5);
        tail.scale.set(1, 1, 0.3);
        tail.castShadow = true;
        this.group.add(ebi, tail);
    }

    // 【改良】激アツの多層グラデーション焦げ目 ＆ 沸き立つチーズ
    _buildAburiCheese() {
        // 土台となるサーモンを配置
        this._buildFish('#ff5500', '#ffd6b3', true);

        const cheeseGeo = new THREE.BoxGeometry(1.65, 0.15, 2.5, 32, 4, 32);

        const positions = cheeseGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i);
            let y = positions.getY(i);
            let z = positions.getZ(i);

            const gravity = (x * x * 0.18) + (z * z * 0.05);
            // 熱でボコボコと沸き立つような凹凸（バンプ）を頂点に追加
            const bubbling = (Math.sin(x * 15) * Math.cos(z * 15)) * 0.015;

            positions.setY(i, y - gravity + bubbling);
        }
        cheeseGeo.computeVertexNormals();

        // 🧀 炙り感を極限まで高めるためのテクスチャ生成
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffdd55'; // 溶けた濃厚チーズ色
        ctx.fillRect(0,0,512,512);

        // 焦げ目の生成（多層グラデーションで「焦げ・熱・元のチーズ」を表現）
        for(let i=0; i<45; i++) { // 焦げの数を増量
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = 10 + Math.random() * 40;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, 'rgba(20, 5, 0, 0.95)');    // 中心：真っ黒な炭化
            grad.addColorStop(0.3, 'rgba(100, 30, 0, 0.8)'); // 中間：濃い茶色の焼き目
            grad.addColorStop(0.6, 'rgba(200, 80, 0, 0.5)'); // 外側：熱で赤みを帯びたチーズ
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');        // 境界を馴染ませる

            ctx.fillStyle = grad;
            ctx.beginPath(); 
            ctx.arc(x, y, radius, 0, Math.PI*2); 
            ctx.fill();
        }

        const cheeseMat = new THREE.MeshPhysicalMaterial({
            map: new THREE.CanvasTexture(canvas),
            roughness: 0.2, // 溶けた脂でテカテカにする
            transmission: 0.1, 
            clearcoat: 0.8, // 表面の照り
            clearcoatRoughness: 0.1,
        });

        const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
        cheese.position.y = 0.30; 
        cheese.castShadow = true;
        this.group.add(cheese);
    }

    _buildUnagi() {
        const unagiGeo = new THREE.BoxGeometry(1.6, 0.3, 2.8, 32, 8, 32);
        const positions = unagiGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const z = positions.getZ(i);
            const x = positions.getX(i);
            positions.setY(i, positions.getY(i) + Math.sin(z * 3) * 0.06 - (x * x * 0.12) - (z * z * 0.04));
        }
        unagiGeo.computeVertexNormals();

        const unagiMat = new THREE.MeshPhysicalMaterial({
            color: 0x2b1100, 
            roughness: 0.1, 
            metalness: 0.1, 
            clearcoat: 1.0, 
            clearcoatRoughness: 0.05,
            bumpMap: this._createNoiseTexture(256, 256, 100),
            bumpScale: 0.02
        });
        const unagi = new THREE.Mesh(unagiGeo, unagiMat);
        unagi.position.y = 0.1; 
        unagi.castShadow = true;
        this.group.add(unagi);
    }

    _buildInari() {
        const inariGeo = new THREE.BoxGeometry(2.0, 1.4, 2.8, 32, 16, 32); 
        const positions = inariGeo.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i); 
            let y = positions.getY(i); 
            let z = positions.getZ(i);

            const widthScale = 1.0 + (Math.sin((y + 0.7) * Math.PI) * 0.2);

            const cornerRoundX = Math.pow(Math.abs(x), 3) * 0.05;
            const cornerRoundZ = Math.pow(Math.abs(z), 3) * 0.05;

            const wrinkle = Math.sin(z * 15) * 0.02 + Math.cos(x * 12) * 0.015;

            positions.setX(i, (x * widthScale) - (Math.sign(x) * cornerRoundX) + wrinkle);
            positions.setZ(i, (z * widthScale) - (Math.sign(z) * cornerRoundZ) + wrinkle);

            if (y > 0.4) {
                positions.setY(i, y - (Math.sin(x * 10) * 0.05) - (Math.cos(z * 8) * 0.05));
            }
        }
        inariGeo.computeVertexNormals();

        const inariMat = new THREE.MeshStandardMaterial({
            color: 0xa65900, 
            roughness: 0.85, 
            bumpMap: this._createNoiseTexture(512, 512, 150),
            bumpScale: 0.05
        });
        const inari = new THREE.Mesh(inariGeo, inariMat);
        inari.position.y = -0.15; 
        inari.castShadow = true;
        this.group.add(inari);
    }
}

window.GameModels = window.GameModels || {};
window.GameModels.Sushi = SushiModel;
window.GameModels.SushiModel = SushiModel;
window.SushiModel = SushiModel;