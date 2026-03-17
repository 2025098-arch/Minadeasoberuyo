// public/js/core/profile_ui.js

window.ProfileUI = {
    uiRef: null,
    currentTab: 'profile',

    open: function(ui, initialTab = 'profile') {
        this.uiRef = ui;
        this.currentTab = initialTab;
        this.render();
    },

    render: function() {
        const user = this.uiRef.currentUser || {};
        const settings = user.settings || {};

        const html = `
            <div class="profile-modal-container" style="display: flex; flex-direction: column; height: 100%;">

                <div style="display: flex; border-bottom: 2px solid #ccc; margin-bottom: 15px;">
                    <button id="tab-btn-profile" style="flex: 1; padding: 10px; font-weight: bold; background: ${this.currentTab === 'profile' ? '#eee' : 'transparent'}; border: none; border-bottom: ${this.currentTab === 'profile' ? '3px solid #007bff' : 'none'}; cursor: pointer;">
                        👤 プロフィール
                    </button>
                    <button id="tab-btn-settings" style="flex: 1; padding: 10px; font-weight: bold; background: ${this.currentTab === 'settings' ? '#eee' : 'transparent'}; border: none; border-bottom: ${this.currentTab === 'settings' ? '3px solid #007bff' : 'none'}; cursor: pointer;">
                        ⚙️ 設定
                    </button>
                </div>

                <div id="content-profile" style="display: ${this.currentTab === 'profile' ? 'block' : 'none'}; overflow-y: auto;">
                    <div style="padding: 10px; background: #f9f9f9; border-radius: 8px; margin-bottom: 15px;">
                        <p><strong>ニックネーム:</strong> <span>${user.nickname || "不明"}</span></p>
                        <p><strong>ID:</strong> <span>${user.id || "XXXXXX"}</span> <small style="color: gray;">(一般非公開)</small></p>
                        <p><strong>レベル:</strong> <span>${user.level || 1}</span></p>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <button id="btn-profile-logout" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                            🚪 ログアウト
                        </button>
                        <button id="btn-profile-delete" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                            ⚠️ アカウント削除
                        </button>
                    </div>
                </div>

                <div id="content-settings" style="display: ${this.currentTab === 'settings' ? 'block' : 'none'}; overflow-y: auto;">

                    <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">👤 アカウント情報変更</h4>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 5px;">ニックネーム</label>
                        <input type="text" id="setting-nickname" value="${user.nickname || ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 5px;">PIN (6桁の数字)</label>
                        <input type="password" id="setting-pin" value="${user.pin || ''}" maxlength="6" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </div>

                    <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">🔒 プライバシー・公開設定</h4>
                    <label style="display: block; margin-bottom: 10px; cursor: pointer; font-size: 14px;">
                        <input type="checkbox" id="setting-ranking-public" ${settings.rankingPublic !== false ? 'checked="checked"' : ''}> 総合順位に自分を公開する
                    </label>
                    <label style="display: block; margin-bottom: 10px; cursor: pointer; font-size: 14px;">
                        <input type="checkbox" id="setting-req-ranking" ${settings.reqRanking !== false ? 'checked="checked"' : ''}> 総合順位からのフレンド申請を許可
                    </label>
                    <label style="display: block; margin-bottom: 20px; cursor: pointer; font-size: 14px;">
                        <input type="checkbox" id="setting-req-history" ${settings.reqHistory !== false ? 'checked="checked"' : ''}> バトル履歴からのフレンド申請を許可
                    </label>

                    <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">🎵 サウンド設定</h4>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px;">
                            BGM 音量
                            <input type="range" id="setting-bgm" min="0" max="100" value="${settings.bgmVolume !== undefined ? settings.bgmVolume : 50}" style="width: 60%;">
                        </label>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px;">
                            SE 音量
                            <input type="range" id="setting-se" min="0" max="100" value="${settings.seVolume !== undefined ? settings.seVolume : 70}" style="width: 60%;">
                        </label>
                    </div>

                    <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">📺 グラフィック設定</h4>
                    <div style="margin-bottom: 25px;">
                        <label style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 14px;">
                            画質
                            <select id="setting-graphics" style="padding: 5px 10px; border-radius: 4px; border: 1px solid #ccc;">
                                <option value="low" ${settings.graphics === 'low' ? 'selected' : ''}>低 (パフォーマンス優先)</option>
                                <option value="medium" ${settings.graphics === 'medium' || !settings.graphics ? 'selected' : ''}>中 (標準)</option>
                                <option value="high" ${settings.graphics === 'high' ? 'selected' : ''}>高 (美麗グラフィック)</option>
                            </select>
                        </label>
                    </div>

                    <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                        <button id="btn-save-settings" style="padding: 12px 40px; background: #28a745; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; font-size: 16px;">
                            💾 設定を保存して適用
                        </button>
                    </div>
                </div>

            </div>
        `;

        this.uiRef.openModal("👤 プロフィール ＆ ⚙️ 設定", html);
        this.bindEvents();
    },

    bindEvents: function() {
        document.getElementById('tab-btn-profile').addEventListener('click', () => {
            this.currentTab = 'profile';
            this.render();
        });
        document.getElementById('tab-btn-settings').addEventListener('click', () => {
            this.currentTab = 'settings';
            this.render();
        });

        if (this.currentTab === 'profile') {
            document.getElementById('btn-profile-logout').addEventListener('click', () => {
                if(confirm("本当にログアウトしますか？")) {
                    location.reload();
                }
            });

            document.getElementById('btn-profile-delete').addEventListener('click', () => {
                const confirm1 = confirm("⚠️ 警告 ⚠️\n本当にアカウントを削除しますか？\n全てのデータが完全に消去され、復旧できません！");
                if (confirm1) {
                    const confirm2 = prompt(`最終確認です。\n削除する場合はあなたのID「${this.uiRef.currentUser.id}」を入力してください。`);
                    if (confirm2 === this.uiRef.currentUser.id) {
                        const socket = window.socket || (typeof Network !== 'undefined' ? Network.socket : null);
                        if (socket) {
                            socket.emit('deleteAccount');
                        }
                        alert("アカウントを完全に削除しました。ログイン画面に戻ります。");
                        setTimeout(() => location.reload(), 500);
                    } else if(confirm2 !== null) {
                        alert("IDが一致しませんでした。削除をキャンセルしました。");
                    }
                }
            });
        }

        if (this.currentTab === 'settings') {
            document.getElementById('btn-save-settings')?.addEventListener('click', () => {
                const btn = document.getElementById('btn-save-settings');
                btn.disabled = true;
                btn.innerText = "保存中...";

                // 🌟 修正2: 「裏に残った古い画面」を無視して、絶対に一番手前（最新）の画面からデータを取る最強の関数
                const getVal = (id) => {
                    const els = document.querySelectorAll('#' + id);
                    return els.length > 0 ? els[els.length - 1].value : '';
                };
                const getChecked = (id) => {
                    const els = document.querySelectorAll('#' + id);
                    return els.length > 0 ? els[els.length - 1].checked : false;
                };

                const newNickname = getVal('setting-nickname').trim();
                const newPin = getVal('setting-pin').trim();

                if (!newNickname) {
                    this.uiRef.showNotification("ニックネームを入力してください", "error");
                    btn.disabled = false; btn.innerText = "💾 設定を保存して適用";
                    return;
                }
                if (newPin.length !== 6 || isNaN(newPin)) {
                    this.uiRef.showNotification("PINは6桁の数字にしてください", "error");
                    btn.disabled = false; btn.innerText = "💾 設定を保存して適用";
                    return;
                }

                // ここで getVal / getChecked を使って安全にデータをかき集める！
                const newSettingsData = {
                    nickname: newNickname,
                    pin: newPin,
                    settings: {
                        bgmVolume: parseInt(getVal('setting-bgm'), 10),
                        seVolume: parseInt(getVal('setting-se'), 10),
                        graphics: getVal('setting-graphics'),
                        rankingPublic: getChecked('setting-ranking-public'),
                        reqRanking: getChecked('setting-req-ranking'),
                        reqHistory: getChecked('setting-req-history')
                    }
                };

                const socket = window.socket || (typeof Network !== 'undefined' ? Network.socket : null);
                if (socket) {
                    socket.emit('updateSettings', newSettingsData);
                } else if (typeof Network !== 'undefined' && typeof Network.updateSettings === 'function') {
                    Network.updateSettings(newSettingsData);
                }

                this.uiRef.showNotification('設定を保存しました！', 'success');
                setTimeout(() => this.uiRef.closeModal(), 300);
            });
        }
    }
};