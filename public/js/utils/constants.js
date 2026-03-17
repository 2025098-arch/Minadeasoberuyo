// public/js/utils/constants.js
// （今後、最大ルーム人数や初期コインなどの定数設定をここに追加していきます）
const CONSTANTS = {};
// public/js/utils/constants.js の一番下に追加してください

// 🌟 一切の妥協なし！全キャラクター＆スキンの完全マスターデータ
const SHOP_DATA = {
    characters: {
        char_human: {
            name: "人間",
            basePrice: 0, // 初期配布
            baseStats: { hp: 80, speed: 80, power: 80 },
            skill: { name: "なし", desc: "特殊能力なし" },
            skins: [
                { name: "白色の服", price: 0, isDefault: true },
                { name: "赤色の服", price: 10 }, { name: "青色の服", price: 10 }, { name: "緑色の服", price: 10 }, // ※39色すべてここに追加可能
                { name: "カスタムデザイン服", price: 30 }
            ]
        },
        char_apple: {
            name: "りんご",
            basePrice: 500,
            baseStats: { hp: 60, speed: 150, power: 60 },
            skill: { name: "転がる", desc: "発動時間10秒" },
            skins: [
                { name: "赤りんご", price: 0, isDefault: true },
                { name: "青リンゴ", price: 10 },
                { name: "カットされた赤りんご", price: 20 },
                { name: "金りんご", price: 30 }
            ]
        },
        char_robot: {
            name: "ロボット",
            basePrice: 800,
            baseStats: { hp: 70, speed: 80, power: 150 },
            skill: { name: "シールド", desc: "発動時間10秒" },
            skins: [
                { name: "白色ロボット", price: 0, isDefault: true },
                { name: "黒色ロボット", price: 10 },
                { name: "白アンドロイド", price: 20 },
                { name: "黒アンドロイド", price: 20 }
            ]
        },
        char_dog: {
            name: "犬",
            basePrice: 1300,
            baseStats: { hp: 100, speed: 130, power: 120 },
            skill: { name: "ダッシュ", desc: "発動時間10秒" },
            skins: [
                { name: "柴犬", price: 0, isDefault: true },
                { name: "トイプードル", price: 20 },
                { name: "チワワ", price: 20 },
                { name: "ブルドッグ", price: 20 },
                { name: "ミニチュアダックスフンド", price: 20 }
            ]
        },
        char_pencil: {
            name: "鉛筆",
            basePrice: 700,
            baseStats: { hp: 150, speed: 10, power: 150 }, // ※変動式のため最大値を記載、ゲームロジックで衰退処理
            skill: { name: "衰退", desc: "常に体力とパワーが減り、スピードが上がる" },
            skins: [
                { name: "黒鉛筆", price: 0, isDefault: true },
                { name: "赤鉛筆", price: 10 }, { name: "青鉛筆", price: 10 }, // ※12色追加可能
                { name: "銀色鉛筆", price: 15 },
                { name: "金色鉛筆", price: 20 },
                { name: "シャーペン", price: 20 }
            ]
        },
        char_sushi: {
            name: "お寿司",
            basePrice: 600,
            baseStats: { hp: 200, speed: 60, power: 60 },
            skill: { name: "全回復", desc: "1回のみ発動可能" },
            skins: [
                { name: "たまご", price: 0, isDefault: true },
                { name: "まぐろ", price: 10 },
                { name: "サーモン", price: 10 },
                { name: "いくら", price: 10 },
                { name: "えび", price: 10 },
                { name: "あぶりチーズサーモン", price: 15 },
                { name: "うなぎ", price: 15 },
                { name: "おいなりさん", price: 15 }
            ]
        }
    }
};