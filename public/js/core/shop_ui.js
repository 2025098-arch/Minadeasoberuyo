// =============== 🛒 ショップ (shop_ui.js) ===============
// 他の機能（ui.js）を汚染しないよう、独立したオブジェクトとして定義します
const ShopUI = {
    // どのタブからもキャラデータを参照できるよう、マスタデータとして保持（妥協なき完全準拠データ）
    masterCharacters: [
        {
            id: "char_human",
            name: "人間",
            price: 0,
            owned: true,
            level: 1,
            hp: 80,
            speed: 80,
            power: 80,
            special: "なし",
            icon: "🚶",
        },
        {
            id: "char_apple",
            name: "りんご",
            price: 500,
            owned: false,
            level: 1,
            hp: 60,
            speed: 150,
            power: 60,
            special: "「転がる」発動時間10秒",
            icon: "🍎",
        },
        {
            id: "char_sushi",
            name: "お寿司",
            price: 600,
            owned: false,
            level: 1,
            hp: 200,
            speed: 60,
            power: 60,
            special: "「全回復」1回のみ発動可能",
            icon: "🍣",
        },
        {
            id: "char_pencil",
            name: "鉛筆",
            price: 700,
            owned: false,
            level: 1,
            hp: "10〜150",
            speed: "10〜150",
            power: "10〜150",
            special: "「衰退」常に体力とパワーが減り、スピードが上がる。",
            icon: "✏️",
        },
        {
            id: "char_robot",
            name: "ロボット",
            price: 800,
            owned: false,
            level: 1,
            hp: 70,
            speed: 80,
            power: 150,
            special: "「シールド」発動時間10秒",
            icon: "🤖",
        },
        {
            id: "char_dog",
            name: "犬",
            price: 1300,
            owned: false,
            level: 1,
            hp: 100,
            speed: 130,
            power: 120,
            special: "「ダッシュ」発動時間10秒",
            icon: "🐕",
        },
    ],

    masterItems: [
        {
            id: "item_sushi",
            name: "お寿司",
            effect: "全回復",
            price: 150,
            icon: "🍣",
            desc: "体力を全回復する。",
        },
        {
            id: "item_yakiniku",
            name: "焼肉",
            effect: "パワー×1.2",
            price: 150,
            icon: "🍖",
            desc: "パワーが1.2倍になる。",
        },
        {
            id: "item_bread",
            name: "パン",
            effect: "スピード×1.2",
            price: 150,
            icon: "🥐",
            desc: "スピードが1.2倍になる。",
        },
    ],

    // =============== 🎯 完璧な openModal ===============
    openModal: function (title, html) {
        // 先ほどの空振りの原因だった「window.」を外し、お使いの環境に存在する
        // 本物のオブジェクト（UI または ui）を確実に見つけて呼び出します！
        if (typeof UI !== "undefined" && typeof UI.openModal === "function") {
            UI.openModal(title, html);
        } else if (
            typeof ui !== "undefined" &&
            typeof ui.openModal === "function"
        ) {
            ui.openModal(title, html);
        } else if (typeof openModal === "function") {
            openModal(title, html);
        } else {
            // 万が一オブジェクトが見つからなくても、あなたが送ってくれたコードと
            // 全く同じ「画面要素の直接書き換え」を行う、絶対に失敗しない最終奥義です！
            const titleEl =
                document.getElementById("modal-title") ||
                document.querySelector(".modal-title") ||
                document.querySelector('[id*="title" i]');
            const contentEl =
                document.getElementById("modal-content") ||
                document.querySelector(".modal-content") ||
                document.querySelector('[id*="content" i]');
            const overlayEl =
                document.getElementById("modal-overlay") ||
                document.querySelector(".modal-overlay") ||
                document.querySelector('[id*="overlay" i]');

            if (titleEl && contentEl && overlayEl) {
                titleEl.textContent = title;
                contentEl.innerHTML = html;
                overlayEl.classList.remove("hidden"); // 送ってくれた ui.js の処理と完全に同じ！
            } else {
                console.error("モーダルの表示に失敗しました。");
            }
        }
    },

    // 簡易通知機能（アラート撲滅版）
    showNotification: function (message, type) {
        // 直接 UI.showNotification が使えるかチェック
        if (typeof UI !== "undefined" && UI.showNotification) {
            UI.showNotification(message, type);
        }
        // window.UI なら使えるかチェック
        else if (
            typeof window.UI !== "undefined" &&
            window.UI.showNotification
        ) {
            window.UI.showNotification(message, type);
        }
        // どちらもダメなら、邪魔なOK画面を出さずに裏側のコンソールにだけ残す
        else {
            console.log("🔔 通知:", message);
        }
    },

    renderShopModal: function () {
        // ★ 根本治療1: 今開いているタブを記憶する（最初は character）
        const activeTab = window.currentShopTab || "character";

        // ★ 根本治療2: 記憶しているタブだけを「青色（選択状態）」にする
        const charBg = activeTab === "character" ? "#007bff" : "#eee";
        const charColor = activeTab === "character" ? "white" : "black";

        const skinBg = activeTab === "skin" ? "#007bff" : "#eee";
        const skinColor = activeTab === "skin" ? "white" : "black";

        const itemBg = activeTab === "item" ? "#007bff" : "#eee";
        const itemColor = activeTab === "item" ? "white" : "black";

        const html = `
            <div style="display: flex; flex-direction: column; height: 70vh;">
                <div style="display: flex; border-bottom: 2px solid #ccc; margin-bottom: 15px;">
                    <button class="shop-tab ${activeTab === 'character' ? 'active' : ''}" data-tab="character" style="flex: 1; padding: 12px; font-weight: bold; cursor: pointer; background: ${charBg}; color: ${charColor}; border: none; border-radius: 5px 5px 0 0; font-size: 16px;">キャラクター</button>
                    <button class="shop-tab ${activeTab === 'skin' ? 'active' : ''}" data-tab="skin" style="flex: 1; padding: 12px; font-weight: bold; cursor: pointer; background: ${skinBg}; color: ${skinColor}; border: none; border-radius: 5px 5px 0 0; font-size: 16px;">スキン</button>
                    <button class="shop-tab ${activeTab === 'item' ? 'active' : ''}" data-tab="item" style="flex: 1; padding: 12px; font-weight: bold; cursor: pointer; background: ${itemBg}; color: ${itemColor}; border: none; border-radius: 5px 5px 0 0; font-size: 16px;">アイテム</button>
                </div>

                <div id="shop-content" style="flex: 1; overflow-y: auto; position: relative;">
                </div>
            </div>
            `;

        this.openModal("🛒 ショップ", html);

        // ★ 根本治療3: 固定で "character" ではなく、記憶しているタブの中身を描画する！
        this.renderShopTab(activeTab);

        const tabs = document.querySelectorAll(".shop-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", (e) => {
                const selectedTab = e.target.dataset.tab;

                // ★ 根本治療4: クリックされたら、どのタブかグローバル変数にしっかり記憶する
                window.currentShopTab = selectedTab;

                tabs.forEach((t) => {
                    t.style.background = "#eee";
                    t.style.color = "black";
                    t.classList.remove("active");
                });
                e.target.style.background = "#007bff";
                e.target.style.color = "white";
                e.target.classList.add("active");

                this.renderShopTab(selectedTab);
            });
        });
    },
    // =============== 🌟 新規追加：スキン専用詳細画面 ===============
    // =============== 🌟 スキン専用詳細画面（完全版：全キャラ・全データ網羅） ===============
    renderSkinDetails: function (encodedCharData, preselectedSkinName = null) {
        const contentArea = document.getElementById("shop-content");
        if (!contentArea) return;

        const char = JSON.parse(decodeURIComponent(encodedCharData));
        const getCharIdByName = (name) => {
            switch (name) {
                case "人間":
                    return "char_human";
                case "りんご":
                    return "char_apple";
                case "ロボット":
                    return "char_robot";
                case "犬":
                    return "char_dog";
                case "鉛筆":
                    return "char_pencil";
                case "お寿司":
                    return "char_sushi";
                default:
                    return "char_human";
            }
        };
        const charId = char.id || getCharIdByName(char.name);
        const isCharOwned = char.isOwned || char.unlocked || char.level > 0;

        const html = `
            <div style="display: flex; height: calc(100% - 10px); width: 100%; gap: 15px;">
                <div style="flex: 1.2; background: #e0f7fa; border-radius: 8px; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 2px solid #ddd;">
                    <button onclick="ShopUI.renderShopTab('skin')" style="position: absolute; top: 10px; left: 10px; padding: 8px 15px; cursor: pointer; background: white; border: 1px solid #ccc; border-radius: 5px; font-weight: bold; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">← スキン一覧へ戻る</button>
                    <div id="character-3d-container" style="width: 100%; height: 100%;"></div>
                </div>

                <div style="width: 320px; display: flex; flex-direction: column; height: 100%; border-left: 1px solid #ddd; padding-left: 10px;">
                    <div style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                        <h2 style="margin: 0; font-size: 24px; color: #333;">${char.name} のスキン</h2>
                        <span id="current-skin-title" style="font-size: 16px; font-weight: bold; color: #e91e63;">${preselectedSkinName || "初期スキン"}</span>
                    </div>

                    <div style="background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow-y: auto; flex: 1;">
                        <strong style="color: #333; display: block; margin-bottom: 8px; border-bottom: 1px solid #ddd;">🎨 スキン一覧</strong>
                        <div id="dynamic-skin-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">

                            ${(() => {
                                // --- キャラクターごとのスキン定義（資料に基づき一切の妥協なし） ---

                                // 1. 人間
                                if (charId === "char_human") {
                                    const colors39 = [
                                        "#FFB6C1",
                                        "#FF69B4",
                                        "#FF1493",
                                        "#DC143C",
                                        "#FF0000",
                                        "#B22222",
                                        "#8B0000",
                                        "#FFA07A",
                                        "#FF7F50",
                                        "#FF4500",
                                        "#FF8C00",
                                        "#FFA500",
                                        "#FFD700",
                                        "#FFFF00",
                                        "#F0E68C",
                                        "#BDB76B",
                                        "#ADFF2F",
                                        "#7FFF00",
                                        "#32CD32",
                                        "#00FF00",
                                        "#008000",
                                        "#006400",
                                        "#66CDAA",
                                        "#20B2AA",
                                        "#008B8B",
                                        "#00FFFF",
                                        "#40E0D0",
                                        "#4682B4",
                                        "#1E90FF",
                                        "#0000FF",
                                        "#00008B",
                                        "#8A2BE2",
                                        "#9932CC",
                                        "#800080",
                                        "#4B0082",
                                        "#FFC0CB",
                                        "#DDA0DD",
                                        "#F5DEB3",
                                        "#D2B48C",
                                    ];
                                    let res = `<div class="skin-card" data-skin="白色の服を着る人間" data-price="0" style="grid-column: span 2; background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent;"><strong>白色の服 (初期)</strong><div style="font-size: 10px; color: #4caf50;">✅ 初期スキン</div></div>`;
                                    res += `<div style="grid-column: span 2; font-size: 12px; font-weight: bold; margin-top: 5px;">🎨 39色の服 (各10🪙)</div><div style="grid-column: span 2; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">`;
                                    colors39.forEach((c, i) => {
                                        res += `<div class="skin-card" data-skin="${c}" data-price="10" style="width: 28px; height: 28px; background-color: ${c}; border: 1px solid #ccc; border-radius: 50%; cursor: pointer;"></div>`;
                                    });
                                    res += `</div><div class="skin-card" data-skin="自分でデザイン可能な服" data-price="30" style="grid-column: span 2; background: #fff3e0; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent; margin-top: 5px;"><strong>✂️ 自分でデザイン可能な服</strong><div style="font-size: 10px; color: #ff9800;">🪙 30</div></div>`;
                                    return res;

                                    // 2. りんご
                                } else if (charId === "char_apple") {
                                    const apples = [
                                        { n: "赤りんご", p: 0 },
                                        { n: "青リンゴ", p: 10 },
                                        { n: "カットされた赤りんご", p: 20 },
                                        { n: "金りんご", p: 30 },
                                    ];
                                    return apples
                                        .map(
                                            (a) =>
                                                `<div class="skin-card" data-skin="${a.n}" data-price="${a.p}" style="background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent;"><strong>${a.n}</strong><div style="font-size: 10px; color: ${a.p === 0 ? "#4caf50" : "#ff9800"};">${a.p === 0 ? "✅ 初期" : "🪙 " + a.p}</div></div>`,
                                        )
                                        .join("");

                                    // 3. ロボット
                                } else if (charId === "char_robot") {
                                    const robots = [
                                        { n: "白色ロボット", p: 0 },
                                        { n: "黒色ロボット", p: 10 },
                                        { n: "白アンドロイド", p: 20 },
                                        { n: "黒アンドロイド", p: 20 },
                                    ];
                                    return robots
                                        .map(
                                            (r) =>
                                                `<div class="skin-card" data-skin="${r.n}" data-price="${r.p}" style="background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent;"><strong>${r.n}</strong><div style="font-size: 10px; color: ${r.p === 0 ? "#4caf50" : "#ff9800"};">${r.p === 0 ? "✅ 初期" : "🪙 " + r.p}</div></div>`,
                                        )
                                        .join("");

                                    // 4. 犬
                                } else if (charId === "char_dog") {
                                    const dogs = [
                                        { n: "柴犬", p: 0 },
                                        { n: "トイプードル", p: 20 },
                                        { n: "チワワ", p: 20 },
                                        { n: "ブルドッグ", p: 20 },
                                        {
                                            n: "ミニチュアダックスフンド",
                                            p: 20,
                                        },
                                    ];
                                    return dogs
                                        .map(
                                            (d) =>
                                                `<div class="skin-card" data-skin="${d.n}" data-price="${d.p}" style="background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent;"><strong>${d.n}</strong><div style="font-size: 10px; color: ${d.p === 0 ? "#4caf50" : "#ff9800"};">${d.p === 0 ? "✅ 初期" : "🪙 " + d.p}</div></div>`,
                                        )
                                        .join("");

                                    // 5. 鉛筆
                                } else if (charId === "char_pencil") {
                                    const pColors = [
                                        { n: "あか", c: "#FF0000" },
                                        { n: "だいだい", c: "#FFA500" },
                                        { n: "きいろ", c: "#FFFF00" },
                                        { n: "きみどり", c: "#ADFF2F" },
                                        { n: "みどり", c: "#008000" },
                                        { n: "みずいろ", c: "#00FFFF" },
                                        { n: "あお", c: "#0000FF" },
                                        { n: "むらさき", c: "#800080" },
                                        { n: "ももいろ", c: "#FFC0CB" },
                                        { n: "ちゃいろ", c: "#8B4513" },
                                        { n: "くろ", c: "#000000" },
                                        { n: "しろ", c: "#FFFFFF" },
                                    ];
                                    let p = `<div class="skin-card" data-skin="黒鉛筆" data-price="0" style="grid-column: span 2; background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent;"><strong>黒鉛筆 (初期)</strong></div>`;
                                    p += `<div class="skin-card" data-skin="銀色鉛筆" data-price="15" style="background: #f8f9fa; padding: 8px; border-radius: 5px; text-align: center; cursor: pointer;">銀色 🪙15</div>`;
                                    p += `<div class="skin-card" data-skin="金色鉛筆" data-price="20" style="background: #f8f9fa; padding: 8px; border-radius: 5px; text-align: center; cursor: pointer;">金色 🪙20</div>`;
                                    p += `<div class="skin-card" data-skin="シャーペン" data-price="20" style="grid-column: span 2; background: #f8f9fa; padding: 8px; border-radius: 5px; text-align: center; cursor: pointer; margin-top: 4px;">シャーペン 🪙20</div>`;
                                    p += `<div style="grid-column: span 2; font-size: 12px; font-weight: bold; margin-top: 8px;">🖍 12色の色鉛筆 (各10🪙)</div><div style="grid-column: span 2; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">`;
                                    pColors.forEach((pc) => {
                                        p += `<div class="skin-card" data-skin="${pc.n}色鉛筆" data-price="10" style="width: 28px; height: 28px; background-color: ${pc.c}; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;"></div>`;
                                    });
                                    p += `</div>`;
                                    return p;

                                    // 6. お寿司
                                } else if (charId === "char_sushi") {
                                    const sushi = [
                                        { n: "たまご", p: 0 },
                                        { n: "まぐろ", p: 10 },
                                        { n: "サーモン", p: 10 },
                                        { n: "いくら", p: 10 },
                                        { n: "えび", p: 10 },
                                        { n: "あぶりチーズサーモン", p: 15 },
                                        { n: "うなぎ", p: 15 },
                                        { n: "おいなりさん", p: 15 },
                                    ];
                                    return sushi
                                        .map(
                                            (s) =>
                                                `<div class="skin-card" data-skin="${s.n}" data-price="${s.p}" style="background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; border: 2px solid transparent;"><strong>${s.n}</strong><div style="font-size: 10px; color: ${s.p === 0 ? "#4caf50" : "#ff9800"};">${s.p === 0 ? "✅ 初期" : "🪙 " + s.p}</div></div>`,
                                        )
                                        .join("");
                                }
                                return "";
                            })()}

                        </div>
                    </div>

                    <div style="margin-top: auto; padding-top: 10px; text-align: center;" id="skin-action-area">
                        ${
                            isCharOwned
                                ? `
                            <button id="skin-buy-button" style="width: 100%; padding: 12px; background: #e91e63; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">🪙 購入する</button>
                        `
                                : `
                            <div style="padding: 12px; background: #f5f5f5; color: #999; border-radius: 8px; font-weight: bold; font-size: 14px; border: 1px solid #ddd;">🔒 キャラクターを先に解放してください</div>
                        `
                        }
                    </div>
                </div>
            </div>
            `;

        contentArea.innerHTML = html;

        // --- 初期選択ロジック（資料の初期スキン設定に忠実） ---
        setTimeout(() => {
            let defaultSkin = "初期スキン";
            if (charId === "char_human") defaultSkin = "白色の服を着る人間";
            else if (charId === "char_apple") defaultSkin = "赤りんご";
            else if (charId === "char_robot") defaultSkin = "白色ロボット";
            else if (charId === "char_dog") defaultSkin = "柴犬";
            else if (charId === "char_pencil") defaultSkin = "黒鉛筆";
            else if (charId === "char_sushi") defaultSkin = "たまご";

            const skinToRender = preselectedSkinName || defaultSkin;
            const target =
                contentArea.querySelector(
                    `.skin-card[data-skin="${skinToRender}"]`,
                ) || contentArea.querySelector(".skin-card");
            if (target) target.click();
        }, 50);

        // --- イベント：スキン切り替え & 購入ボタン更新 ---
        contentArea.querySelectorAll(".skin-card").forEach((card) => {
            card.addEventListener("click", (e) => {
                const selectedSkin = e.currentTarget.getAttribute("data-skin");

                // 見た目の更新
                contentArea
                    .querySelectorAll(".skin-card")
                    .forEach((c) => (c.style.borderColor = "transparent"));
                e.currentTarget.style.borderColor = "#e91e63";

                document.getElementById("current-skin-title").textContent =
                    selectedSkin;

                // 購入ボタンエリアの動的更新（所持チェック＆購入処理）
                const actionArea = document.getElementById("skin-action-area");
                if (actionArea) {
                    if (!isCharOwned) {
                        // キャラ未所持の場合
                        actionArea.innerHTML = `<div style="padding: 12px; background: #f5f5f5; color: #999; border-radius: 8px; font-weight: bold; font-size: 14px; border: 1px solid #ddd;">🔒 キャラクターを先に解放してください</div>`;
                    } else {
                        // キャラは持っている場合、スキンを持っているか判定
                        // ※ currentUser が UI等でグローバルに参照できる前提です
                        const userSkins =
                            (window.currentUser &&
                                window.currentUser.skins &&
                                window.currentUser.skins[charId]) ||
                            [];

                        // キャラクターごとの初期スキン名のリスト（資料に合わせて追加してください）
                        const defaultSkins = [
                            "白色の服を着る人間",
                            "赤りんご",
                            "白色ロボット",
                            "柴犬",
                            "黒鉛筆",
                            "たまご",
                            "自分でデザイン可能な服",
                            "default",
                        ];
                        const isDefaultSkin =
                            defaultSkins.includes(selectedSkin);
                        const isSkinOwned =
                            isDefaultSkin || userSkins.includes(selectedSkin);

                        if (isSkinOwned) {
                            // 既に持っている場合
                            actionArea.innerHTML = `<button style="width: 100%; padding: 12px; background: #4caf50; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: default;">✅ 所持済み</button>`;
                        } else {
                            // まだ持っていない場合（購入ボタン表示）
                            // ※ スキンの値段はHTMLの属性(data-price)等から取得するか、固定値(例: 200)を設定します。ここでは仮に200とします。
                            // HTMLの data-price を読み取って、もし無ければ0円にする
                            const skinPrice =
                                parseInt(
                                    e.currentTarget.getAttribute("data-price"),
                                ) || 0;
                            actionArea.innerHTML = `<button id="skin-buy-button" style="width: 100%; padding: 12px; background: #e91e63; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">🪙 ${skinPrice}コインで購入</button>`;

                            // サーバーへ購入リクエストを送信
                            document.getElementById("skin-buy-button").onclick =
                                (e) => {
                                    Network.buySkin(
                                        charId,
                                        selectedSkin,
                                        skinPrice,
                                    );
                                    e.target.textContent = "通信中...";
                                    e.target.disabled = true;
                                };
                        }
                    }
                }

                // 3Dプレビュー更新
                if (
                    typeof ModelRenderer !== "undefined" &&
                    typeof ModelRenderer.renderPreview === "function"
                ) {
                    ModelRenderer.renderPreview(
                        "character-3d-container",
                        charId,
                        selectedSkin,
                    );
                }

                // 「自分でデザイン可能な服」の特殊処理
                if (selectedSkin === "自分でデザイン可能な服") {
                    const editor =
                        document.getElementById("custom-skin-editor");
                    if (editor) editor.classList.remove("hidden");
                }
            });
        });
    },

    renderShopTab: function (tabName) {
        const contentArea = document.getElementById("shop-content");
        if (!contentArea) return;

        let html = "";

            if (tabName === "character") {
                html = `<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; padding: 10px;">`;

                this.masterCharacters.forEach((char) => {
                    // ▼▼▼ ステータス計算処理 ▼▼▼
                    let displayChar = { ...char };

                    if (displayChar.owned && displayChar.level > 1) {
                        const multiplier = Math.pow(1.05, displayChar.level - 1);
                        if (typeof displayChar.hp === "number") {
                            displayChar.hp = Math.floor(displayChar.hp * multiplier);
                        }
                        if (typeof displayChar.speed === "number") {
                            displayChar.speed = Math.floor(displayChar.speed * multiplier);
                        }
                        if (typeof displayChar.power === "number") {
                            displayChar.power = Math.floor(displayChar.power * multiplier);
                        }
                    }

                    const charDataStr = encodeURIComponent(JSON.stringify(displayChar));
                    // ▲▲▲ ここまで ▲▲▲

                    // 画面に表示するHTMLカード部分
                    html += `
                        <div class="shop-item" onclick="ShopUI.renderCharacterDetails('${charDataStr}')" style="width: 140px; border: 1px solid #ddd; border-radius: 10px; padding: 15px 10px; text-align: center; cursor: pointer; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition: transform 0.2s;">
                            <div style="font-size: 50px; margin-bottom: 5px;">${char.icon}</div>
                            <div style="font-weight: bold; font-size: 16px;">${char.name}</div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">Lv.${char.level}</div>
                            ${
                                char.owned
                                    ? `<div style="color: #4caf50; font-size: 14px; font-weight: bold;">✅ 購入済み</div>`
                                    : `<div style="color: #ff9800; font-size: 16px; font-weight: bold;">🪙 ${char.price}</div>`
                            }
                        </div>
                        `;
                });
                html += `</div>`;
        } else if (tabName === "skin") {
            // =============== 妥協なしの完全準拠スキンタブ ===============
            const colors39 = [
                "#FFB6C1",
                "#FF69B4",
                "#FF1493",
                "#DC143C",
                "#FF0000",
                "#B22222",
                "#8B0000",
                "#FFA07A",
                "#FF7F50",
                "#FF4500",
                "#FF8C00",
                "#FFA500",
                "#FFD700",
                "#FFFF00",
                "#F0E68C",
                "#BDB76B",
                "#ADFF2F",
                "#7FFF00",
                "#32CD32",
                "#00FF00",
                "#008000",
                "#006400",
                "#66CDAA",
                "#20B2AA",
                "#008B8B",
                "#00FFFF",
                "#40E0D0",
                "#4682B4",
                "#1E90FF",
                "#0000FF",
                "#00008B",
                "#8A2BE2",
                "#9932CC",
                "#800080",
                "#4B0082",
                "#FFC0CB",
                "#DDA0DD",
                "#F5DEB3",
                "#D2B48C",
            ];

            const pencilColors12 = [
                { name: "あか", color: "#FF0000" },
                { name: "だいだい", color: "#FFA500" },
                { name: "きいろ", color: "#FFFF00" },
                { name: "きみどり", color: "#ADFF2F" },
                { name: "みどり", color: "#008000" },
                { name: "みずいろ", color: "#00FFFF" },
                { name: "あお", color: "#0000FF" },
                { name: "むらさき", color: "#800080" },
                { name: "ももいろ", color: "#FFC0CB" },
                { name: "ちゃいろ", color: "#8B4513" },
                { name: "くろ", color: "#000000" },
                { name: "しろ", color: "#FFFFFF" },
            ];

            html = `
                <style>
                    .skin-item { border: 1px solid #ccc; padding: 15px; border-radius: 8px; width: 150px; text-align: center; background: white; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-shrink: 0; }
                    .skin-item:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); background: #fdfdfd; }
                    .skin-item.default { border: 2px solid #4caf50; background: #e8f5e9; cursor: pointer; }
                    .skin-item.default:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    .skin-color-box { width: 45px; height: 45px; border: 2px solid #ccc; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); transition: transform 0.1s; }
                    .skin-color-box:hover { transform: scale(1.1); z-index: 10; border-color: #007bff; }
                    .skin-category-title { margin: 0 0 15px 0; border-bottom: 2px solid #ccc; padding-bottom: 5px; font-size: 20px; color: #333; }
                </style>
                <div style="padding: 10px; display: flex; flex-direction: column; gap: 30px;">
                `;

            // 人間 (クリックで詳細画面へ遷移し、そのスキンを3D表示する)
            html += `
                <div>
                    <h4 class="skin-category-title">人間のスキン</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="skin-item default" onclick="ShopUI.goToSkinDetails('人間', '白色の服を着る人間')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">白色の服を着る人間</div>
                            <div style="color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('人間', '自分でデザイン可能な服')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">自分でデザイン可能な服</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 30</div>
                        </div>
                    </div>
                    <h5 style="margin: 15px 0 10px 0; color: #555;">🎨 39色の服 (各10コイン)</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                `;
            colors39.forEach((color, index) => {
                const textColor = [
                    "#FFFFFF",
                    "#FFFF00",
                    "#F0E68C",
                    "#ADFF2F",
                ].includes(color)
                    ? "#000"
                    : "#fff";
                html += `
                        <div class="skin-color-box" onclick="ShopUI.goToSkinDetails('人間', '${color}')" title="カラー${index + 1}" style="background-color: ${color}; color: ${textColor};">
                            🪙10
                        </div>
                    `;
            });
            html += `</div></div>`;

            // りんご
            html += `
                <div>
                    <h4 class="skin-category-title">りんごのスキン</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="skin-item default" onclick="ShopUI.goToSkinDetails('りんご', '赤りんご')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">赤りんご</div>
                            <div style="color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('りんご', '青リンゴ')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">青リンゴ</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 10</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('りんご', 'カットされた赤りんご')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">カットされた赤りんご</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('りんご', '金りんご')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">金りんご</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 30</div>
                        </div>
                    </div>
                </div>`;

            // ロボット
            html += `
                <div>
                    <h4 class="skin-category-title">ロボットのスキン</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="skin-item default" onclick="ShopUI.goToSkinDetails('ロボット', '白色ロボット')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">白色ロボット</div>
                            <div style="color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('ロボット', '黒色ロボット')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">黒色ロボット</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 10</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('ロボット', '白アンドロイド')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">白アンドロイド</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('ロボット', '黒アンドロイド')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">黒アンドロイド</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                    </div>
                </div>`;

            // 犬
            html += `
                <div>
                    <h4 class="skin-category-title">犬のスキン</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="skin-item default" onclick="ShopUI.goToSkinDetails('犬', '柴犬')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">柴犬</div>
                            <div style="color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('犬', 'トイプードル')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">トイプードル</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('犬', 'チワワ')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">チワワ</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('犬', 'ブルドッグ')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">ブルドッグ</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('犬', 'ミニチュアダックスフンド')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">ミニチュアダックスフンド</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                    </div>
                </div>`;

            // 鉛筆
            html += `
                <div>
                    <h4 class="skin-category-title">鉛筆のスキン</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="skin-item default" onclick="ShopUI.goToSkinDetails('鉛筆', '黒鉛筆')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">黒鉛筆</div>
                            <div style="color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('鉛筆', '銀色鉛筆')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">銀色鉛筆</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 15</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('鉛筆', '金色鉛筆')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">金色鉛筆</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('鉛筆', 'シャーペン')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">シャーペン</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 20</div>
                        </div>
                    </div>
                    <h5 style="margin: 15px 0 10px 0; color: #555;">🖍 12色の色鉛筆 (各10コイン)</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                `;
            pencilColors12.forEach((pc) => {
                html += `
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('鉛筆', '${pc.name}色鉛筆')" style="width: 100px; padding: 10px;">
                            <div style="width: 100%; height: 12px; background-color: ${pc.color}; border-radius: 3px; margin-bottom: 5px; border: 1px solid #aaa;"></div>
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 3px;">${pc.name}</div>
                            <div style="color: #ff9800; font-size: 12px; font-weight: bold;">🪙 10</div>
                        </div>
                    `;
            });
            html += `</div></div>`;

            // お寿司
            html += `
                <div>
                    <h4 class="skin-category-title">お寿司のスキン</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="skin-item default" onclick="ShopUI.goToSkinDetails('お寿司', 'たまご')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">たまご</div>
                            <div style="color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'まぐろ')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">まぐろ</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 10</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'サーモン')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">サーモン</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 10</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'いくら')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">いくら</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 10</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'えび')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">えび</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 10</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'あぶりチーズサーモン')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">あぶりチーズサーモン</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 15</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'うなぎ')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">うなぎ</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 15</div>
                        </div>
                        <div class="skin-item" onclick="ShopUI.goToSkinDetails('お寿司', 'おいなりさん')">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">おいなりさん</div>
                            <div style="color: #ff9800; font-weight: bold;">🪙 15</div>
                        </div>
                    </div>
                </div>`;
            html += `</div>`;
        } else if (tabName === "item") {
            // ===== 妥協なし！キャラ・スキンと統一したレイアウト =====
            // 左側：詳細と購入ボタンエリア、右側：アイテムリスト
            html = `
                <div style="display: flex; height: 100%; gap: 15px;">
                    <div style="flex: 1; border: 2px solid #ddd; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; background: #fff;">
                        <div style="text-align: center; width: 100%;">
                            <h3 id="current-item-title" style="margin-bottom: 10px; font-size: 20px;">アイテムを選択してください</h3>
                            <div id="current-item-icon" style="font-size: 80px; margin: 20px 0;">📦</div>
                            <div id="current-item-effect" style="color: #d32f2f; font-weight: bold; font-size: 16px; margin-bottom: 10px;"></div>
                            <div id="current-item-desc" style="font-size: 14px; color: #555; margin-bottom: 10px; min-height: 40px;"></div>
                            <div id="current-item-owned" style="font-size: 14px; color: #666; font-weight: bold;"></div>
                        </div>

                        <div id="item-action-area" style="width: 100%;">
                            <div style="padding: 12px; background: #f5f5f5; color: #999; border-radius: 8px; text-align: center; font-weight: bold; border: 1px solid #ddd;">右のリストから選んでください</div>
                        </div>
                    </div>

                    <div style="flex: 1.5; overflow-y: auto; padding-right: 5px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;" id="item-list-container">
                `;

            // アイテムのカードを生成（正しいcurrentUserの呼び出し方に変更！）
            const user = window.currentUser || {};
            const inventory = user.inventory || [];
            this.masterItems.forEach((item) => {
                const ownedCount = inventory.filter(
                    (i) => i === item.id,
                ).length;

                html += `
                            <div class="item-card" data-id="${item.id}" data-name="${item.name}" data-icon="${item.icon}" data-effect="${item.effect}" data-desc="${item.desc}" data-price="${item.price}" data-owned="${ownedCount}" style="border: 2px solid transparent; border-radius: 8px; padding: 12px; text-align: center; background: #f9f9f9; cursor: pointer; transition: 0.2s;">
                                <div style="font-size: 40px; margin-bottom: 5px;">${item.icon}</div>
                                <div style="font-weight: bold; font-size: 14px;">${item.name}</div>
                                <div style="font-size: 11px; color: #666; margin-top: 5px;">所持数: ${ownedCount}</div>
                            </div>
                    `;
            });

            html += `
                        </div>
                    </div>
                </div>`;

            // --- HTMLを描画した直後にイベントを紐づける処理 ---
            // ※この setTimeout は、画面にHTMLが反映された直後に実行するためのテクニック（スキンと同じ手法）です
            setTimeout(() => {
                const contentArea =
                    document.querySelector(".modal-body-container") ||
                    document.body;

                // --- イベント：アイテム切り替え & 購入ボタン更新 ---
                contentArea.querySelectorAll(".item-card").forEach((card) => {
                    card.addEventListener("click", (e) => {
                        const targetCard = e.currentTarget;
                        const itemId = targetCard.getAttribute("data-id");
                        const itemName = targetCard.getAttribute("data-name");
                        const itemIcon = targetCard.getAttribute("data-icon");
                        const itemEffect =
                            targetCard.getAttribute("data-effect");
                        const itemDesc = targetCard.getAttribute("data-desc");
                        const itemPrice =
                            parseInt(targetCard.getAttribute("data-price")) ||
                            0;
                        const itemOwned =
                            parseInt(targetCard.getAttribute("data-owned")) ||
                            0;

                        // ① 見た目の更新（選択中の枠線をピンク色にする）
                        contentArea
                            .querySelectorAll(".item-card")
                            .forEach(
                                (c) => (c.style.borderColor = "transparent"),
                            );
                        targetCard.style.borderColor = "#e91e63";

                        // ② 左側の詳細テキストを更新
                        document.getElementById(
                            "current-item-title",
                        ).textContent = itemName;
                        document.getElementById(
                            "current-item-icon",
                        ).textContent = itemIcon;
                        document.getElementById(
                            "current-item-effect",
                        ).textContent = `効果: ${itemEffect}`;
                        document.getElementById(
                            "current-item-desc",
                        ).textContent = itemDesc;
                        document.getElementById(
                            "current-item-owned",
                        ).textContent = `現在所持数: ${itemOwned}個`;

                        // --- 購入ボタンエリアの動的更新 ---
                        const actionArea =
                            document.getElementById("item-action-area");
                        if (actionArea) {
                            actionArea.innerHTML = `<button id="item-buy-button" style="width: 100%; padding: 12px; background: #e91e63; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">🪙 ${itemPrice}コインで購入</button>`;

                            const buyBtn =
                                document.getElementById("item-buy-button");
                            if (buyBtn) {
                                buyBtn.onclick = (e) => {
                                    // 1. 無条件で「通信中」にする
                                    e.target.textContent = "通信中...";
                                    e.target.disabled = true;
                                    e.target.style.background = "#999";

                                    // 2. ブラウザのコンソール（F12）に証拠を残す
                                    console.log(
                                        "📡 ブラウザから電波を発射します！アイテム:",
                                        itemId,
                                        "価格:",
                                        itemPrice,
                                    );

                                    // 3. あなたのプロジェクトに存在する「socket」を何がなんでも探し出して送信する
                                    const activeSocket =
                                        window.socket ||
                                        (typeof socket !== "undefined"
                                            ? socket
                                            : null);

                                    if (activeSocket) {
                                        activeSocket.emit("buyItem", {
                                            itemId: itemId,
                                            price: itemPrice,
                                        });
                                        console.log(
                                            "✅ 送信完了！あとはサーバーが受け取るだけです。",
                                        );
                                    } else {
                                        console.error(
                                            "❌ 致命的エラー：通信するための socket が見つかりません！",
                                        );
                                    }
                                };
                            }
                        }
                    });
                });

                // --- 初期選択ロジック（一番最初のアイテムを自動選択） ---
                const firstItem = contentArea.querySelector(".item-card");
                if (firstItem) firstItem.click();
            }, 50);
        }

        contentArea.innerHTML = html;
    },

    // =============== 🎯 スキン詳細への入り口を共通化 ===============
    goToSkinDetails: function (characterName, targetSkinName = null) {
        // 全キャラクターの中から、名前が一致するデータを探し出す
        const charData = this.masterCharacters.find(
            (c) => c.name === characterName,
        );

        if (charData) {
            // データを文字列に変換して渡せるようにする
            const encodedStr = encodeURIComponent(JSON.stringify(charData));

            // 🌟 ここが重要！ 🌟
            // 以前は renderCharacterDetails を呼んでいましたが、
            // これを「新しく作ったスキン専用画面」に変更します！
            this.renderSkinDetails(encodedStr, targetSkinName);
        } else {
            console.error(
                characterName +
                    " のデータが見つかりません。masterCharactersを確認してください。",
            );
        }
    },

    // キャラクター詳細画面（左に3Dキャラ、右にステータス＋スキン一覧）
    renderCharacterDetails: function (
        encodedCharData,
        preselectedSkinName = null,
    ) {
        const contentArea = document.getElementById("shop-content");
        if (!contentArea) return;

        const char = JSON.parse(decodeURIComponent(encodedCharData));
        // 🌟👇 ここに1行追加します！ 👇🌟
        window.currentViewedCharacter = char;
        // 🌟👆 追加するのはこれだけです！ 👆🌟
        const levelUpCost = char.level * 100;

        const nextHp =
            typeof char.hp === "number" ? Math.floor(char.hp * 1.05) : char.hp;
        const nextSpeed =
            typeof char.speed === "number"
                ? Math.floor(char.speed * 1.05)
                : char.speed;
        const nextPower =
            typeof char.power === "number"
                ? Math.floor(char.power * 1.05)
                : char.power;
        const nextSpecial =
            char.special === "なし" ? "なし" : char.special + " (性能UP!)";

        const renderBar = (current, max = 200) => {
            if (typeof current !== "number") return "";
            const percentage = Math.min((current / max) * 100, 100);
            return `<div style="width: 100%; background: #ddd; height: 10px; border-radius: 5px; margin-top: 5px;">
                <div style="width: ${percentage}%; background: #4caf50; height: 100%; border-radius: 5px;"></div>
                </div>`;
        };

        const getCharIdByName = (name) => {
            switch (name) {
                case "人間":
                    return "char_human";
                case "りんご":
                    return "char_apple";
                case "ロボット":
                    return "char_robot";
                case "犬":
                    return "char_dog";
                case "鉛筆":
                    return "char_pencil";
                case "お寿司":
                    return "char_sushi";
                default:
                    return "char_human";
            }
        };
        const charId = char.id || getCharIdByName(char.name);
        const masterData =
            typeof SHOP_DATA !== "undefined" && SHOP_DATA.characters[charId]
                ? SHOP_DATA.characters[charId]
                : { skins: [{ name: "初期スキン", price: 0 }] };

        const html = `
            <div style="display: flex; height: 100%; gap: 15px;">
                <div style="flex: 1; background: #e0f7fa; border-radius: 8px; position: relative; overflow: hidden; display: flex; flex-direction: column;">
                    <button onclick="ShopUI.renderShopTab('character')" style="position: absolute; top: 10px; left: 10px; padding: 8px 15px; cursor: pointer; background: white; border: 1px solid #ccc; border-radius: 5px; font-weight: bold; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">← 戻る</button>

                    <div id="character-3d-container" style="width: 100%; height: 100%; cursor: grab;"></div>

                    <div style="position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 12px; color: #555; pointer-events: none; font-weight: bold; text-shadow: 1px 1px 0px white, -1px -1px 0px white;">
                        👆 ドラッグで自由に回転できます
                    </div>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                        <h2 style="margin: 0; font-size: 28px; color: #333;">${char.name}</h2>
                        <span style="font-size: 18px; font-weight: bold; color: #007bff;">Lv.${char.level} ${char.owned ? `➡️ Lv.${char.level + 1}` : ""}</span>
                    </div>

                    <div style="background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow-y: auto; max-height: 40%;">
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; color: #333;">
                                <strong>体力</strong>
                                <span>${char.hp} ${char.owned && typeof char.hp === "number" ? `<span style="color: #4caf50; font-weight: bold;">➡️ ${nextHp}</span>` : ""}</span>
                            </div>
                            ${renderBar(char.hp)}
                        </div>
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; color: #333;">
                                <strong>スピード</strong>
                                <span>${char.speed} ${char.owned && typeof char.speed === "number" ? `<span style="color: #2196f3; font-weight: bold;">➡️ ${nextSpeed}</span>` : ""}</span>
                            </div>
                            ${renderBar(char.speed)}
                        </div>
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; color: #333;">
                                <strong>パワー</strong>
                                <span>${char.power} ${char.owned && typeof char.power === "number" ? `<span style="color: #f44336; font-weight: bold;">➡️ ${nextPower}</span>` : ""}</span>
                            </div>
                            ${renderBar(char.power)}
                        </div>
                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc;">
                            <strong style="color: #333;">✨ 特殊能力</strong><br>
                            <div style="color: #d81b60; font-size: 14px; margin-top: 5px; font-weight: bold;">${char.special}</div>
                            ${char.owned && char.special !== "なし" ? `<div style="color: #4caf50; font-size: 13px; font-weight: bold; margin-top: 5px;">➡️ 強化予測: ${nextSpecial}</div>` : ""}
                        </div>
                    </div>

                    <div style="background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow-y: auto; flex: 1;">
                        <strong style="color: #333; display: block; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">🎨 スキン一覧</strong>
                        <div id="dynamic-skin-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        ${(() => {
                            if (charId === "char_human") {
                                const colors39 = [
                                    "#FFB6C1",
                                    "#FF69B4",
                                    "#FF1493",
                                    "#DC143C",
                                    "#FF0000",
                                    "#B22222",
                                    "#8B0000",
                                    "#FFA07A",
                                    "#FF7F50",
                                    "#FF4500",
                                    "#FF8C00",
                                    "#FFA500",
                                    "#FFD700",
                                    "#FFFF00",
                                    "#F0E68C",
                                    "#BDB76B",
                                    "#ADFF2F",
                                    "#7FFF00",
                                    "#32CD32",
                                    "#00FF00",
                                    "#008000",
                                    "#006400",
                                    "#66CDAA",
                                    "#20B2AA",
                                    "#008B8B",
                                    "#00FFFF",
                                    "#40E0D0",
                                    "#4682B4",
                                    "#1E90FF",
                                    "#0000FF",
                                    "#00008B",
                                    "#8A2BE2",
                                    "#9932CC",
                                    "#800080",
                                    "#4B0082",
                                    "#FFC0CB",
                                    "#DDA0DD",
                                    "#F5DEB3",
                                    "#D2B48C",
                                ];

                                let humanHtml = `
                                <div class="skin-card" data-skin="白色の服を着る人間" data-is-color="false" style="grid-column: span 2; background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">白色の服を着る人間</div>
                                    <div style="font-size: 11px; color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                                </div>

                                <div style="grid-column: span 2; margin-top: 5px; font-size: 12px; font-weight: bold; color: #555;">🎨 39色の服 (各10コイン)</div>
                                <div style="grid-column: span 2; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 10px;">
                                `;

                                colors39.forEach((color, index) => {
                                    humanHtml += `
                                    <div class="skin-card" data-skin="${color}" data-is-color="true" title="カラー${index + 1}" style="width: 32px; height: 32px; background-color: ${color}; border: 2px solid #ccc; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: transform 0.2s;">
                                    </div>
                                    `;
                                });

                                humanHtml += `
                                </div>

                                <div class="skin-card" data-skin="自分でデザイン可能な服" data-is-color="false" style="grid-column: span 2; background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">✂️ 自分でデザイン可能な服</div>
                                <div style="font-size: 11px; color: #ff9800; font-weight: bold;">🪙 30 コイン</div>
                                </div>
                                
                                <div class="skin-card" data-skin="base_gold" data-is-color="false" style="grid-column: span 2; background: #fff8dc; border: 2px dashed #d4af37; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                <div style="font-size: 13px; font-weight: bold; color: #d4af37; margin-bottom: 3px;">✨ ゴールデンスキン</div>
                                <div style="font-size: 11px; color: #888; font-weight: bold;">👀 プレビュー専用 (非売品)</div>
                                </div>
                                `;
                                return humanHtml;
                            } else if (charId === "char_pencil") {
                                const pencilColors12 = [
                                    { name: "あか", color: "#FF0000" },
                                    { name: "だいだい", color: "#FFA500" },
                                    { name: "きいろ", color: "#FFFF00" },
                                    { name: "きみどり", color: "#ADFF2F" },
                                    { name: "みどり", color: "#008000" },
                                    { name: "みずいろ", color: "#00FFFF" },
                                    { name: "あお", color: "#0000FF" },
                                    { name: "むらさき", color: "#800080" },
                                    { name: "ももいろ", color: "#FFC0CB" },
                                    { name: "ちゃいろ", color: "#8B4513" },
                                    { name: "くろ", color: "#000000" },
                                    { name: "しろ", color: "#FFFFFF" },
                                ];
                                let pencilHtml = `
                                <div class="skin-card" data-skin="黒鉛筆" data-is-color="false" style="grid-column: span 2; background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">黒鉛筆</div>
                                    <div style="font-size: 11px; color: #4caf50; font-weight: bold;">✅ 初期スキン</div>
                                </div>
                                <div class="skin-card" data-skin="銀色鉛筆" data-is-color="false" style="background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">銀色鉛筆</div>
                                    <div style="font-size: 11px; color: #ff9800; font-weight: bold;">🪙 15</div>
                                </div>
                                <div class="skin-card" data-skin="金色鉛筆" data-is-color="false" style="background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">金色鉛筆</div>
                                    <div style="font-size: 11px; color: #ff9800; font-weight: bold;">🪙 20</div>
                                </div>
                                <div class="skin-card" data-skin="シャーペン" data-is-color="false" style="grid-column: span 2; background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">シャーペン</div>
                                    <div style="font-size: 11px; color: #ff9800; font-weight: bold;">🪙 20</div>
                                </div>
                                <div style="grid-column: span 2; margin-top: 5px; font-size: 12px; font-weight: bold; color: #555;">🖍 12色の色鉛筆 (各10コイン)</div>
                                <div style="grid-column: span 2; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 10px;">
                                `;
                                pencilColors12.forEach((pc) => {
                                    pencilHtml += `
                                    <div class="skin-card" data-skin="${pc.name}色鉛筆" data-is-color="true" title="${pc.name}" style="width: 32px; height: 32px; background-color: ${pc.color}; border: 2px solid #ccc; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                                    </div>
                                    `;
                                });
                                pencilHtml += `</div>`;
                                return pencilHtml;
                            } else {
                                // その他のキャラ（りんご、犬、ロボットなど）のデフォルトスキンリスト表示
                                // ※マスターデータの仕組みに合わせて適宜変更可能ですが、仕様維持のため残します
                                return masterData.skins
                                    .map(
                                        (skin) => `
                                <div class="skin-card" data-skin="${skin.name}" data-is-color="false" style="background: #f8f9fa; border: 2px solid transparent; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; transition: 0.2s;">
                                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 3px;">${skin.name}</div>
                                    <div style="font-size: 11px; color: ${skin.price === 0 ? "#4caf50" : "#ff9800"}; font-weight: bold;">${skin.price === 0 ? "✅ 初期スキン" : "🪙 " + skin.price + " コイン"}</div>
                                </div>
                                `,
                                    )
                                    .join("");
                            }
                        })()}
                        </div>
                    </div>

<div style="margin-top: auto; text-align: center;">
                        ${
                            char.owned
                                ? `<button onclick="Network.upgradeCharacter('${char.id}'); this.textContent='通信中...'; this.disabled=true;" style="width: 100%; padding: 15px; background: #007bff; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 18px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,123,255,0.3);">⬆️ 🪙 ${levelUpCost} でレベルアップ</button>`
                                : `<button onclick="Network.buyCharacter('${char.id}'); this.textContent='通信中...'; this.disabled=true;" style="width: 100%; padding: 15px; background: #ff9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(255,152,0,0.3);">🪙 ${char.price} で購入</button>`
                        }
                    </div>
                </div>
            </div>
            `;

        contentArea.innerHTML = html;

        // 初期スキンまたは「スキンタブで選択されたスキン」で3Dモデルを描画
        setTimeout(() => {
            const defaultSkin = masterData.skins[0]
                ? masterData.skins[0].name
                : "初期スキン";
            const skinToRender = preselectedSkinName || defaultSkin;

            if (
                typeof ModelRenderer !== "undefined" &&
                typeof ModelRenderer.renderPreview === "function"
            ) {
                ModelRenderer.renderPreview(
                    "character-3d-container",
                    charId,
                    skinToRender,
                );
            }

            // 指定されたスキンをUI上で選択状態にする
            const targetCard = Array.from(
                contentArea.querySelectorAll(".skin-card"),
            ).find((c) => c.getAttribute("data-skin") === skinToRender);
            if (targetCard) {
                targetCard.click(); // クリックイベントを発火させて色や枠を変える
            }
        }, 50);

        // スキンカードをクリックした時のイベントリスナー
        const skinCards = contentArea.querySelectorAll(".skin-card");
        skinCards.forEach((card) => {
            card.addEventListener("click", (e) => {
                // ▼▼▼ ここを追加（ロックされたスキンはクリック無効化） ▼▼▼
                if (e.currentTarget.getAttribute("data-locked") === "true") {
                if (window.UI && window.UI.showNotification) {
                window.UI.showNotification("このスキンは現在アンロックできません！", "error");
                } else {
                alert("このスキンは現在アンロックできません！");
                }
                return; // ここで処理を止めるため、着せ替えや枠の色変更が起きません
                }
                // ▲▲▲ 追加ここまで ▲▲▲
                skinCards.forEach((c) => {
                    c.style.border =
                        c.getAttribute("data-is-color") === "true"
                            ? "2px solid #ccc"
                            : "2px solid transparent";
                    if (c.getAttribute("data-is-color") !== "true") {
                        c.style.background = "#f8f9fa";
                        c.style.transform = "scale(1)";
                    }
                });

                e.currentTarget.style.border = "2px solid #007bff";

                if (e.currentTarget.getAttribute("data-is-color") === "true") {
                    e.currentTarget.style.transform = "scale(1.15)";
                } else {
                    e.currentTarget.style.background = "#e6f2ff";
                }

                const selectedSkinName =
                    e.currentTarget.getAttribute("data-skin");

                if (selectedSkinName === "自分でデザイン可能な服") {
                    console.log("カスタムエディタを起動します...");
                    const customEditor =
                        document.getElementById("custom-skin-editor");
                    if (customEditor) customEditor.classList.remove("hidden");
                }
                // ▼▼▼ ここから追加（邪魔なアラートは出さず、控えめな通知のみ） ▼▼▼
                if (selectedSkinName === "base_gold") {
                if (window.UI && window.UI.showNotification) {
                window.UI.showNotification("✨ ゴールデンはは非売品です", "info");
                }
                // returnで止めないので、下の3Dプレビュー処理は実行されます
                }
                // ▲▲▲ ここまで追加 ▲▲▲

                if (
                    typeof ModelRenderer !== "undefined" &&
                    typeof ModelRenderer.renderPreview === "function"
                ) {
                    ModelRenderer.renderPreview(
                        "character-3d-container",
                        charId,
                        selectedSkinName,
                    );
                }
            });

            card.addEventListener("mouseover", (e) => {
                if (
                    e.currentTarget.getAttribute("data-is-color") !== "true" &&
                    e.currentTarget.style.border !==
                        "2px solid rgb(0, 123, 255)"
                ) {
                    e.currentTarget.style.background = "#e9ecef";
                }
            });
            card.addEventListener("mouseout", (e) => {
                if (
                    e.currentTarget.getAttribute("data-is-color") !== "true" &&
                    e.currentTarget.style.border !==
                        "2px solid rgb(0, 123, 255)"
                ) {
                    e.currentTarget.style.background = "#f8f9fa";
                }
            });
        });
    },

    // 着せ替えUI・お絵描き機能の初期化（一切の変更なし・機能維持！）
    initWardrobeUI: function () {
        const paletteContainer = document.getElementById(
            "skin-palette-container",
        );
        const customEditor = document.getElementById("custom-skin-editor");
        if (!paletteContainer) return;

        const palette =
            typeof HumanModel !== "undefined" ? HumanModel.SKIN_PALETTE : {};

        for (const skinId in palette) {
            const btn = document.createElement("div");
            btn.className = "skin-btn";
            btn.dataset.skinId = skinId;

            if (skinId === "custom") {
                btn.classList.add("skin-btn-custom");
                btn.textContent = "自作";
            } else {
                const hex = palette[skinId].toString(16).padStart(6, "0");
                btn.style.backgroundColor = `#${hex}`;
            }

            btn.addEventListener("click", () => {
                document
                    .querySelectorAll(".skin-btn")
                    .forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");

                if (skinId === "custom") {
                    customEditor.classList.remove("hidden");
                } else {
                    customEditor.classList.add("hidden");
                }

                const newHuman = new HumanModel(skinId);
                if (window.modelRenderer) {
                    window.modelRenderer.changeModel(newHuman.getMesh());
                }
            });

            paletteContainer.appendChild(btn);
        }

        const canvas = document.getElementById("custom-paint-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let isDrawing = false;

        const startPosition = (e) => {
            isDrawing = true;
            draw(e);
        };
        const endPosition = () => {
            isDrawing = false;
            ctx.beginPath();
        };
        const draw = (e) => {
            if (!isDrawing) return;

            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const x = clientX - rect.left;
            const y = clientY - rect.top;

            ctx.lineWidth = document.getElementById("paint-size").value;
            ctx.lineCap = "round";
            ctx.strokeStyle = document.getElementById("paint-color").value;

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        canvas.addEventListener("mousedown", startPosition);
        canvas.addEventListener("mouseup", endPosition);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("touchstart", startPosition);
        canvas.addEventListener("touchend", endPosition);
        canvas.addEventListener("touchmove", draw);

        document
            .getElementById("btn-clear-canvas")
            .addEventListener("click", () => {
                ctx.fillStyle = "#eeeeee";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            });

        document
            .getElementById("btn-apply-custom")
            .addEventListener("click", () => {
                const canvasTexture = new THREE.CanvasTexture(canvas);
                canvasTexture.colorSpace = THREE.SRGBColorSpace;

                if (window.modelRenderer && window.modelRenderer.currentMesh) {
                    const currentMesh = window.modelRenderer.currentMesh;
                    currentMesh.traverse((child) => {
                        if (
                            child.isMesh &&
                            child.material.userData &&
                            child.material.userData.isCustomSkin
                        ) {
                            child.material.map = canvasTexture;
                            child.material.color.setHex(0xffffff);
                            child.material.needsUpdate = true;
                        }
                    });
                    alert("カスタムデザインを服に適用しました！");
                }
            });

        document
            .getElementById("btn-close-wardrobe")
            .addEventListener("click", () => {
                document
                    .getElementById("wardrobe-modal")
                    .classList.add("hidden");
            });
    },

    // ===== ▼▼▼ ここから Step 3 の追加コード ▼▼▼ =====
    buyItem: function (itemId, price, itemName) {
        const user = window.UI.currentUser;

        // 所持金チェック（正しいcurrentUserの呼び出し方に変更！）
        const currentUser = window.currentUser || {};
        if (currentUser.coins !== undefined && currentUser.coins < itemPrice) {
            // もしUI.showNotificationが動かなかった時のために標準のアラートも用意
            if (window.UI && window.UI.showNotification) {
                window.UI.showNotification("コインが足りません！", "error");
            } else {
                alert("コインが足りません！");
            }
            return;
        }

        // 購入確認
        if (confirm(`🪙 ${price}コインで「${itemName}」を購入しますか？`)) {
            // サーバーに購入リクエストを送信！
            if (window.socket) {
                window.socket.emit("buyItem", { itemId: itemId, price: price });
            } else {
                console.error("❌ 通信エラー：サーバーに接続されていません。");
            }
        }
    },
    // ===== ▲▲▲ ここまで ▲▲▲ =====
}; // ← ShopUIを閉じるカッコ

// 外部ファイル（元のui.jsなど）から呼び出せるようにグローバル登録
window.ShopUI = ShopUI;

// ==========================================
// 🛒 購入時のリアルタイム所持数更新＆データ同期
// ==========================================

const activeSocket = window.socket || (typeof socket !== "undefined" ? socket : null);

if (activeSocket) {
    // 【残す機能①：購入成功時の所持数リアルタイムアップ処理】
    // 画面を再読み込みしなくても、数字が「ポンッ」と増えるアニメーション的な役割
    activeSocket.on("buySuccess", (data) => {
        if (data.type === "item") {
            const itemCard = document.querySelector(`.item-card[data-id="${data.itemId}"]`);
            if (itemCard) {
                // 1. リスト側の所持数を更新
                let currentOwned = parseInt(itemCard.getAttribute("data-owned")) || 0;
                currentOwned += 1;
                itemCard.setAttribute("data-owned", currentOwned);

                const cardDivs = itemCard.querySelectorAll("div");
                const lastDiv = cardDivs[cardDivs.length - 1];
                if (lastDiv && lastDiv.textContent.includes("所持数")) {
                    lastDiv.textContent = `所持数: ${currentOwned}`;
                }

                // 2. 左側の詳細パネル側の所持数とボタンを更新
                const currentTitle = document.getElementById("current-item-title");
                if (currentTitle && currentTitle.textContent === itemCard.getAttribute("data-name")) {
                    document.getElementById("current-item-owned").textContent = `現在所持数: ${currentOwned}個`;
                    const buyBtn = document.getElementById("item-buy-button");
                    if (buyBtn) {
                        buyBtn.textContent = `🪙 ${itemCard.getAttribute("data-price")}コインで購入`;
                        buyBtn.disabled = false;
                        buyBtn.style.background = "#e91e63";
                    }
                }
            }
        }
    });

    // 【残す機能②：最新データの同期と、下のコイン表示の更新】
    // ※画面の強制書き換え（バグの元だった部分）は削除してスッキリさせました！
    activeSocket.on('authSuccess', (user) => {
        window.currentUser = user; 
        if (typeof UI !== 'undefined' && UI.updateBottomUI) UI.updateBottomUI();
    });
}