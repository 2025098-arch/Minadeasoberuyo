// =============== 🎒 バックパック (backpack_ui.js) ===============
    window.BackpackUI = {
    currentTab: 'character',
    uiInstance: null,

    // ★ 選択中の要素を記憶（詳細表示用）
    selectedChar: null,
    selectedSkin: null,
    selectedItem: null,

    open: function(uiObj) {
        if (uiObj) {
            this.uiInstance = uiObj;
        }
        const user = this.uiInstance ? this.uiInstance.currentUser : null;
        if (user) {
            this.selectedChar = user.equipped?.character || null;
            this.selectedSkin = user.equipped?.skin || null;
            this.selectedItem = user.equipped?.item || null;
        }
        this.render();
    },

    render: function() {
        const ui = this.uiInstance;
        const user = ui ? ui.currentUser : null;

        if (!user) {
            console.error("プレイヤーデータがありません");
            return;
        }

        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button onclick="window.BackpackUI.switchTab('character')" style="flex:1; padding: 10px; cursor: pointer; background: ${this.currentTab==='character'?'#8bc34a':'#eee'}; color: ${this.currentTab==='character'?'#fff':'#000'}; border: none; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 16px; transition: 0.2s;">👤 キャラ</button>
                <button onclick="window.BackpackUI.switchTab('skin')" style="flex:1; padding: 10px; cursor: pointer; background: ${this.currentTab==='skin'?'#8bc34a':'#eee'}; color: ${this.currentTab==='skin'?'#fff':'#000'}; border: none; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 16px; transition: 0.2s;">👕 スキン</button>
                <button onclick="window.BackpackUI.switchTab('item')" style="flex:1; padding: 10px; cursor: pointer; background: ${this.currentTab==='item'?'#8bc34a':'#eee'}; color: ${this.currentTab==='item'?'#fff':'#000'}; border: none; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 16px; transition: 0.2s;">📦 アイテム</button>
            </div>
        `;

        let listHtml = '';
        let detailsHtml = '';

        if (this.currentTab === 'character') {
            if (!this.selectedChar && user.characters && user.characters.length > 0) this.selectedChar = user.equipped.character;
            listHtml = this.generateCharacterList(user);
            detailsHtml = this.generateCharacterDetails(user);
        } else if (this.currentTab === 'skin') {
            if (!this.selectedSkin) this.selectedSkin = user.equipped.skin;
            listHtml = this.generateSkinList(user);
            detailsHtml = this.generateSkinDetails(user);
        } else if (this.currentTab === 'item') {
            listHtml = this.generateItemList(user);
            detailsHtml = this.generateItemDetails(user);
        }

        const contentHtml = `
            <div style="display: flex; height: 50vh; gap: 15px;">
                <div style="flex: 1.5; overflow-y: auto; background: #f9f9f9; border-radius: 8px; padding: 10px; border: 1px solid #ddd; display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; align-content: start;">
                    ${listHtml}
                </div>
                <div style="flex: 1; background: #fff; border-radius: 8px; padding: 15px; border: 2px solid #eee; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    ${detailsHtml}
                </div>
            </div>
        `;

        const finalHtml = `<div class="modal-body-container">${tabsHtml}${contentHtml}</div>`;

        if (ui.openModal) {
            ui.openModal("🎒 バックパック", finalHtml);

            // 3Dモデルの再描画
            setTimeout(() => {
                if (window.ModelRenderer) {
                    if (this.currentTab === 'character' && this.selectedChar) {
                        let skinToRender = null;
                        if (this.selectedChar === user.equipped.character) {
                            skinToRender = user.equipped.skin;
                        } else if (user.skins && user.skins[this.selectedChar] && user.skins[this.selectedChar].length > 0) {
                            skinToRender = user.skins[this.selectedChar][0];
                        }
                        window.ModelRenderer.renderPreview('backpack-model-container', this.selectedChar, skinToRender);
                    } else if (this.currentTab === 'skin' && this.selectedSkin) {
                        window.ModelRenderer.renderPreview('backpack-model-container', user.equipped.character, this.selectedSkin);
                    }
                }
            }, 50);
        }
    },

    switchTab: function(tabName) {
        this.currentTab = tabName;
        this.render();
    },

    selectItem: function(type, id) {
        if (type === 'character') this.selectedChar = id;
        if (type === 'skin') this.selectedSkin = id;
        if (type === 'item') this.selectedItem = id;
        this.render();
    },

    // ==========================================
    // 👤 キャラクター機能
    // ==========================================
            generateCharacterList: function(user) {
                if (!user.characters || user.characters.length === 0) return '<div style="grid-column: 1/-1; text-align:center; color:#888;">キャラがいません</div>';

                return user.characters.map(charData => {
                    // ★追加：データが文字列でもオブジェクトでも、ちゃんとID(名前)を取り出せるようにする！
                    const charId = typeof charData === 'string' ? charData : (charData.id || charData.characterId);
                    
                    const isEquipped = (user.equipped.character === charId);
            const isSelected = (this.selectedChar === charId);
            let charIcon = '👤';
            if (window.ShopUI && window.ShopUI.masterCharacters) {
                const master = window.ShopUI.masterCharacters.find(c => c.id === charId);
                if (master) charIcon = master.icon;
            }

            return `
                <div onclick="window.BackpackUI.selectItem('character', '${charId}')" style="border: 3px solid ${isSelected ? '#007bff' : (isEquipped ? '#4caf50' : '#ddd')}; border-radius: 8px; padding: 10px; text-align: center; background: ${isEquipped ? '#e8f5e9' : '#fff'}; cursor: pointer; position: relative; transition: transform 0.1s;">
                    ${isEquipped ? '<div style="position: absolute; top: -8px; right: -8px; background: #4caf50; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">装備中</div>' : ''}
                    <div style="font-size: 35px;">${charIcon}</div>
                </div>
            `;
        }).join('');
    },

    generateCharacterDetails: function(user) {
        if (!this.selectedChar) return '<div style="text-align:center; color:#888; margin-top:50px;">キャラクターを選択してください</div>';

        let charData = { name: this.selectedChar, hp: '?', speed: '?', power: '?', special: '?', icon: '👤', level: 1 };
        if (window.ShopUI && window.ShopUI.masterCharacters) {
            const master = window.ShopUI.masterCharacters.find(c => c.id === this.selectedChar);
            if (master) charData = master;
        }

        const isEquipped = (user.equipped.character === this.selectedChar);

        return `
            <div style="text-align: center; font-size: 20px; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                ${charData.name} <span style="font-size:14px; color:#666;">Lv.${charData.level}</span>
            </div>
            <div style="display: flex; gap: 15px; flex: 1;">
                <div id="backpack-model-container" style="flex: 1; min-height: 150px; background: #f0f0f0; border-radius: 8px; overflow: hidden; position: relative; cursor: grab;">
                </div>
                <div style="flex: 1.5; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="font-size: 13px; line-height: 1.6;">
                        <div>❤️ 体力: <b>${charData.hp}</b></div>
                        <div>💨 速度: <b>${charData.speed}</b></div>
                        <div>💪 パワー: <b>${charData.power}</b></div>
                        <div style="margin-top: 5px; color: #d32f2f; font-size: 12px;">✨ 特殊: ${charData.special}</div>
                    </div>
                    ${isEquipped 
                        ? `<button disabled style="width: 100%; padding: 10px; font-size: 14px; font-weight: bold; background: #9e9e9e; color: white; border: none; border-radius: 5px;">装備中</button>`
                        : `<button onclick="window.BackpackUI.equipCharacter('${this.selectedChar}')" style="width: 100%; padding: 10px; font-size: 14px; font-weight: bold; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">装備する</button>`
                    }
                </div>
            </div>
        `;
    },

    // ==========================================
    // 👕 スキン機能
    // ==========================================
    generateSkinList: function(user) {
        const currentCharId = user.equipped.character;
        const ownedSkins = (user.skins && user.skins[currentCharId]) ? user.skins[currentCharId] : [];

        if (ownedSkins.length === 0) return `<div style="grid-column: 1/-1; text-align:center; color:#888;">${currentCharId}のスキンを持っていません</div>`;

        return ownedSkins.map(skinName => {
            const isEquipped = (user.equipped.skin === skinName);
            const isSelected = (this.selectedSkin === skinName);
            const isColor = skinName.startsWith('#');
            const preview = isColor ? `<div style="width:30px; height:30px; background:${skinName}; border-radius:50%; border:1px solid #ccc; margin:auto;"></div>` : '👕';

            return `
                <div onclick="window.BackpackUI.selectItem('skin', '${skinName}')" style="border: 3px solid ${isSelected ? '#007bff' : (isEquipped ? '#4caf50' : '#ddd')}; border-radius: 8px; padding: 10px; text-align: center; background: ${isEquipped ? '#e8f5e9' : '#fff'}; cursor: pointer; position: relative;">
                    ${isEquipped ? '<div style="position: absolute; top: -8px; right: -8px; background: #4caf50; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">装備中</div>' : ''}
                    <div style="font-size: 30px; margin-bottom: 5px;">${preview}</div>
<div style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${skinName === 'base_gold' ? '✨ゴールデン' : (isColor ? 'カラー' : skinName)}</div>
                </div>
            `;
        }).join('');
    },

    generateSkinDetails: function(user) {
        if (!this.selectedSkin) return '<div style="text-align:center; color:#888; margin-top:50px;">スキンを選択してください</div>';

        const isEquipped = (user.equipped.skin === this.selectedSkin);
        const isColor = this.selectedSkin.startsWith('#');

        return `
            <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px; word-break: break-all;">
                ${this.selectedSkin === 'base_gold' ? '✨ゴールデン✨ (激レア)' : (isColor ? 'カスタムカラー' : this.selectedSkin)}
            </div>
            <div id="backpack-model-container" style="flex: 1; min-height: 200px; background: #f0f0f0; border-radius: 8px; margin-bottom: 15px; overflow: hidden; position: relative; cursor: grab;">
            </div>
            ${isEquipped 
                ? `<button disabled style="width: 100%; padding: 12px; font-size: 16px; font-weight: bold; background: #9e9e9e; color: white; border: none; border-radius: 5px;">着用中</button>`
                : `<button onclick="window.BackpackUI.equipSkin('${this.selectedSkin}')" style="width: 100%; padding: 12px; font-size: 16px; font-weight: bold; background: #e91e63; color: white; border: none; border-radius: 5px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">着替える</button>`
            }
        `;
    },

    // ==========================================
    // 📦 アイテム機能 (所持数・重複のバグ修正)
    // ==========================================
    getInventoryArray: function(user) {
        let items = [];
        if (!user.inventory) return items;

        // ★修正: 配列の中に同じアイテムが散らばっていても、綺麗に合算するように修正
        let itemMap = {};

        if (Array.isArray(user.inventory)) {
            user.inventory.forEach(item => {
                let id = typeof item === 'string' ? item : item.itemId;
                let count = typeof item === 'string' ? 1 : (item.count || 1);
                if (itemMap[id]) itemMap[id] += count;
                else itemMap[id] = count;
            });
        } else if (typeof user.inventory === 'object') {
            for (let key in user.inventory) {
                if (user.inventory[key] > 0) itemMap[key] = user.inventory[key];
            }
        }

        for (let id in itemMap) {
            items.push({ id: id, count: itemMap[id] });
        }
        return items;
    },

    generateItemList: function(user) {
        const items = this.getInventoryArray(user);
        if (items.length === 0) return `<div style="grid-column: 1/-1; text-align:center; color:#888;">アイテムを持っていません</div>`;

        if (!this.selectedItem && items.length > 0) this.selectedItem = items[0].id;

        return items.map(item => {
            const isEquipped = (user.equipped.item === item.id);
            const isSelected = (this.selectedItem === item.id);

            let itemIcon = '📦';
            if (window.ShopUI && window.ShopUI.masterItems) {
                const master = window.ShopUI.masterItems.find(i => i.id === item.id);
                if (master) itemIcon = master.icon;
            }

            return `
                <div onclick="window.BackpackUI.selectItem('item', '${item.id}')" style="border: 3px solid ${isSelected ? '#007bff' : (isEquipped ? '#ff9800' : '#ddd')}; border-radius: 8px; padding: 10px; text-align: center; background: ${isEquipped ? '#fff3e0' : '#fff'}; cursor: pointer; position: relative;">
                    ${isEquipped ? '<div style="position: absolute; top: -8px; right: -8px; background: #ff9800; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">装備中</div>' : ''}
                    <div style="position: absolute; bottom: 2px; right: 5px; font-size: 12px; font-weight: bold; color: #555;">x${item.count}</div>
                    <div style="font-size: 30px;">${itemIcon}</div>
                </div>
            `;
        }).join('');
    },

    generateItemDetails: function(user) {
        if (!this.selectedItem) return '<div style="text-align:center; color:#888; margin-top:50px;">アイテムを選択してください</div>';

        const items = this.getInventoryArray(user);
        const myItem = items.find(i => i.id === this.selectedItem);
        const count = myItem ? myItem.count : 0;

        let itemData = { name: "不明なアイテム", desc: "説明がありません", effect: "なし", icon: "📦" };
        if (window.ShopUI && window.ShopUI.masterItems) {
            const master = window.ShopUI.masterItems.find(i => i.id === this.selectedItem);
            if (master) itemData = master;
        }

        const isEquipped = (user.equipped.item === this.selectedItem);

        // ★修正: 装備中なら「装備を外す」ボタンにする
        return `
            <div style="text-align: center; font-size: 20px; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                ${itemData.name} <span style="font-size:14px; color:#ff9800;">所持: ${count}個</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 8px; font-size: 80px; margin-bottom: 15px;">
                ${itemData.icon}
            </div>
            <div style="font-size: 14px; margin-bottom: 15px; padding: 10px; background: #fffde7; border-left: 4px solid #fbc02d;">
                <b style="color: #f57f17;">効果: ${itemData.effect}</b><br>
                <span style="font-size: 12px; color: #555;">${itemData.desc}</span>
            </div>
            ${isEquipped 
                ? `<button onclick="window.BackpackUI.unequipItem()" style="width: 100%; padding: 12px; font-size: 16px; font-weight: bold; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">外す</button>`
                : `<button onclick="window.BackpackUI.equipItem('${this.selectedItem}')" style="width: 100%; padding: 12px; font-size: 16px; font-weight: bold; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">ゲームに持っていく（1個）</button>`
            }
        `;
    },

    // ==========================================
        // ⚙️ 装備送信処理 & ホーム画面連動（究極版）
        // ==========================================

        sendEquipmentUpdate: function() {
            const ui = this.uiInstance;
            if (!ui || !ui.currentUser) return;
            const user = ui.currentUser;

            // ★★★ ここが一番重要！「Network」の中にあるソケットも探しに行くようにしました ★★★
            let socket = null;
            if (typeof window.socket !== 'undefined') socket = window.socket;
            else if (typeof Network !== 'undefined' && Network.socket) socket = Network.socket;
            else if (ui.socket) socket = ui.socket;

            if (socket) {
                socket.emit('changeEquipment', { 
                    character: user.equipped.character, 
                    skin: user.equipped.skin,
                    item: user.equipped.item || null
                });
                console.log("📤 装備データを送信しました！", user.equipped);
            } else {
                console.error("❌ ソケットが見つかりません。network.js に window.socket = Network.socket; を追加してください。");
            }

            // ホーム画面の3Dモデルを更新
            if (typeof window.ModelRenderer !== 'undefined') {
                window.ModelRenderer.renderPreview('character-canvas-container', user.equipped.character, user.equipped.skin);
            }

            // バックパックの画面も最新状態に再描画
            this.render();
        },

        equipCharacter: function(charId) {
            const user = this.uiInstance.currentUser;
            user.equipped.character = charId;
            if (user.skins && user.skins[charId] && user.skins[charId].length > 0) {
                user.equipped.skin = user.skins[charId][0]; 
            }
            this.sendEquipmentUpdate();
        },

        equipSkin: function(skinName) {
            this.uiInstance.currentUser.equipped.skin = skinName;
            this.sendEquipmentUpdate();
        },

        equipItem: function(itemId) {
            this.uiInstance.currentUser.equipped.item = itemId;
            this.sendEquipmentUpdate();
        },

        unequipItem: function() {
            this.uiInstance.currentUser.equipped.item = null;
            this.sendEquipmentUpdate();
        }
    };

    window.BackpackUI = BackpackUI;