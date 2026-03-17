// public/js/core/models/Apple.js

window.AppleModel = class AppleModel {
    constructor(skinName = '赤りんご') {
        this.group = new THREE.Group();
        this.skinName = skinName;

        this.baseRadius = 1.35; 
        this.height = 2.4;

        this.buildModel(); 
    }

    getMesh() {
        return this.group;
    }

    createAppleProfile() {
        const points = [];
        const r = this.baseRadius;
        const h = this.height;

        points.push(new THREE.Vector2(0, h * 0.45));           
        points.push(new THREE.Vector2(r * 0.15, h * 0.48));    
        points.push(new THREE.Vector2(r * 0.5, h * 0.5));      
        points.push(new THREE.Vector2(r * 0.98, h * 0.3));     
        points.push(new THREE.Vector2(r * 1.0, h * 0.05));     
        points.push(new THREE.Vector2(r * 0.85, h * -0.3));    
        points.push(new THREE.Vector2(r * 0.4, h * -0.48));    
        points.push(new THREE.Vector2(r * 0.15, h * -0.45));   
        points.push(new THREE.Vector2(0, h * -0.4));           

        const spline = new THREE.SplineCurve(points);
        return spline.getPoints(50); 
    }

    createLeafProfile() {
        const points = [];
        points.push(new THREE.Vector2(0, 0));
        points.push(new THREE.Vector2(0.1, 0.02));
        points.push(new THREE.Vector2(0.2, 0.05));
        points.push(new THREE.Vector2(0.25, 0)); 
        points.push(new THREE.Vector2(0.2, -0.05));
        points.push(new THREE.Vector2(0.1, -0.02));
        points.push(new THREE.Vector2(0, 0)); 

        const spline = new THREE.SplineCurve(points);
        return spline.getPoints(16);
    }

    buildModel() {
        let skinColor = 0xd31c1c; 
        let isCut = false;
        let isGold = false;

        switch(this.skinName) {
            case '青リンゴ':
                skinColor = 0x8cc63f;
                break;
            case '金りんご':
                isGold = true;
                break;
            case 'カットされた赤りんご':
                skinColor = 0xd31c1c;
                isCut = true;
                break;
            case '金りんご（カット）':
                isGold = true;
                isCut = true;
                break;
        }

        let skinMaterial;

        if (isGold) {
            skinMaterial = new THREE.MeshPhongMaterial({
                color: 0xcc9900,     
                specular: 0xfff5b3,   
                shininess: 100,       
                side: THREE.DoubleSide
            });
            this.addGoldLights(); 
        } else {
            skinMaterial = new THREE.MeshStandardMaterial({
                color: skinColor,
                roughness: 0.3, 
                side: THREE.DoubleSide
            });
        }

        if (!isCut) {
            this.buildWholeApple(skinMaterial);
        } else {
            this.buildRabbitAppleSlice(skinMaterial);
        }
    }

    addGoldLights() {
        const intensity = 0.8;
        const dist = 10;
        const positions = [
            [4, 4, 4], [-4, 4, 4], [4, 4, -4], [-4, 4, -4],
            [0, -4, 0]
        ];
        positions.forEach(pos => {
            const light = new THREE.PointLight(0xffffff, intensity, dist);
            light.position.set(...pos);
            this.group.add(light);
        });
    }

    buildWholeApple(skinMaterial) {
        const profilePoints = this.createAppleProfile();
        const appleGeo = new THREE.LatheGeometry(profilePoints, 64);
        appleGeo.computeVertexNormals();
        const appleMesh = new THREE.Mesh(appleGeo, skinMaterial);
        appleMesh.castShadow = true;
        appleMesh.receiveShadow = true;
        this.group.add(appleMesh);

        this.addStemAndLeaf();
        this.group.position.y = 0.6;
    }

    buildRabbitAppleSlice(skinMaterial) {
        const sliceGroup = new THREE.Group();
        const angle = Math.PI / 4; 
        const profilePoints = this.createAppleProfile();

        const fleshMat = new THREE.MeshLambertMaterial({
            color: 0xfff3cc, 
            side: THREE.DoubleSide 
        });

        // 果肉背中
        const fleshBackGeo = new THREE.LatheGeometry(profilePoints, 32, 0, angle);
        const fleshBack = new THREE.Mesh(fleshBackGeo, fleshMat);
        sliceGroup.add(fleshBack);

        // 断面の構築
        const shape = new THREE.Shape(profilePoints);
        const faceGeo = new THREE.ShapeGeometry(shape);

        const faceA = this.createCutFace(faceGeo, fleshMat, false);
        faceA.rotation.y = -Math.PI / 2; 
        sliceGroup.add(faceA);

        const faceB = this.createCutFace(faceGeo, fleshMat, true);
        faceB.rotation.y = -Math.PI / 4; 
        sliceGroup.add(faceB);

        // 滑らかな境界線を持つ皮パーツ群を生成（めくれた耳は削除済み）
        const skinGeometries = this.createCustomRabbitSkin(profilePoints, angle);
        sliceGroup.add(new THREE.Mesh(skinGeometries.bottomGeo, skinMaterial));
        sliceGroup.add(new THREE.Mesh(skinGeometries.topLeftGeo, skinMaterial));
        sliceGroup.add(new THREE.Mesh(skinGeometries.topRightGeo, skinMaterial));

        sliceGroup.rotation.x = Math.PI / 2;
        sliceGroup.rotation.y = -Math.PI / 6;
        sliceGroup.rotation.z = Math.PI / 8;
        sliceGroup.position.set(0.2, -0.1, 0);

        this.group.add(sliceGroup);
    }

    createCutFace(geometry, material, flipZ = false) {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        const zDir = flipZ ? -1 : 1;

        const coreGeo = new THREE.CircleGeometry(0.3, 16);
        coreGeo.scale(0.5, 1.0, 1.0);
        const coreMat = new THREE.MeshLambertMaterial({ color: 0xe8dcb8, side: THREE.DoubleSide });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.set(0.2, 0, 0.005 * zDir); 
        group.add(coreMesh);

        const seedGeo = new THREE.SphereGeometry(0.06, 16, 16);
        seedGeo.scale(0.5, 1.5, 0.5);
        const seedMat = new THREE.MeshStandardMaterial({ color: 0x3d1a00, roughness: 0.5 });
        const seed = new THREE.Mesh(seedGeo, seedMat);
        seed.position.set(0.2, -0.05, 0.01 * zDir);
        seed.rotation.z = -Math.PI / 8;
        group.add(seed);

        return group;
    }

    createCustomRabbitSkin(points, angle) {
        const midPhi = angle / 2;
        const vCutBaseIndex = Math.floor(points.length * 0.45);

        const bottomPoints = points.slice(0, vCutBaseIndex + 1);
        const topPoints = points.slice(vCutBaseIndex);

        const buildPatch = (pts, getStartPhi, getEndPhi, segs, transform) => {
            const pos = [];
            const idx = [];
            for (let i = 0; i < pts.length; i++) {
                const r = pts[i].x * 1.002;
                const y = pts[i].y;
                const start = getStartPhi(i);
                const end = getEndPhi(i);
                for (let j = 0; j <= segs; j++) {
                    const phi = start + (end - start) * (j / segs);
                    let vx = r * Math.sin(phi);
                    let vy = y;
                    let vz = r * Math.cos(phi);
                    if (transform) {
                        const t = transform(i, j, vx, vy, vz, phi);
                        vx = t.x; vy = t.y; vz = t.z;
                    }
                    pos.push(vx, vy, vz);
                }
            }
            for (let i = 0; i < pts.length - 1; i++) {
                for (let j = 0; j < segs; j++) {
                    const a = i * (segs + 1) + j;
                    const b = a + 1;
                    const c = a + (segs + 1);
                    const d = c + 1;
                    idx.push(a, c, b);
                    idx.push(b, c, d);
                }
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setIndex(idx);
            geo.computeVertexNormals();
            return geo;
        };

        const getCutWidth = (i) => {
            const ratio = i / (topPoints.length - 1);
            return (angle * 0.85) * Math.pow(ratio, 0.9);
        };

        const bottomGeo = buildPatch(bottomPoints, () => 0, () => angle, 16);
        const topLeftGeo = buildPatch(topPoints, () => 0, (i) => midPhi - getCutWidth(i) / 2, 8);
        const topRightGeo = buildPatch(topPoints, (i) => midPhi + getCutWidth(i) / 2, () => angle, 8);

        // ※earGeo（めくれた耳）の生成処理を完全に削除しました

        return { bottomGeo, topLeftGeo, topRightGeo };
    }

    addStemAndLeaf() {
        const stemCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, this.height * 0.45, 0), 
            new THREE.Vector3(0.05, this.height * 0.55, 0),
            new THREE.Vector3(0.1, this.height * 0.65, -0.05) 
        ]);
        const stemGeo = new THREE.TubeGeometry(stemCurve, 16, 0.04, 8, false);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x4e3115, roughness: 0.8 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.castShadow = true;
        this.group.add(stem);

        const leafPoints = this.createLeafProfile();
        const leafShape = new THREE.Shape(leafPoints);
        const leafGeo = new THREE.ShapeGeometry(leafShape);

        const leafMat = new THREE.MeshStandardMaterial({ 
            color: 0x388e3c, 
            roughness: 0.6,
            side: THREE.DoubleSide
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);

        leaf.scale.set(3.5, 3.5, 3.5);
        leaf.position.set(0.05, this.height * 0.58, -0.02);
        leaf.rotation.set(-Math.PI / 6, Math.PI / 4, Math.PI / 8);
        leaf.castShadow = true;

        this.group.add(leaf);
    }
}