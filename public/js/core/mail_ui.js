// public/js/core/mail_ui.js

window.MailUI = {
    parentUI: null,
    currentTab: 'inbox',

    open: function(uiInstance) {
        this.parentUI = uiInstance;
        this.currentTab = 'inbox'; 
        this.parentUI.isMailModalOpen = true; // ui.js側のフラグも立てておく
        this.render();
    },

    render: function() {
        const ui = this.parentUI;

        // データが無い場合はロード中を表示し、サーバーへ要求
        if (!ui.mailData) {
            ui.openModal("✉️ メール", `<div style="text-align:center; padding: 20px;">データを読み込み中...⏳</div>`);
            if (typeof Network !== 'undefined') Network.fetchMailData();
            return;
        }

        const data = ui.mailData || { messages: [] };
        const friendsList = ui.friendsData ? ui.friendsData.list : [];

        const tabsHtml = `
            <div style="display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
                <button id="mtab-inbox" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentTab==='inbox'?'#007bff':'#eee'}; color: ${this.currentTab==='inbox'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">受信箱</button>
                <button id="mtab-compose" style="flex:1; padding: 8px; cursor: pointer; background: ${this.currentTab==='compose'?'#007bff':'#eee'}; color: ${this.currentTab==='compose'?'#fff':'#000'}; border: none; border-radius: 5px; font-weight: bold;">新規作成</button>
            </div>
        `;

        let contentHtml = '';

        if (this.currentTab === 'inbox') {
            if (data.messages.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">受信したメールはありません。</div>';
            } else {
                contentHtml = data.messages.map(m => `
                    <div style="padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 5px; background: ${m.isRead ? '#f9f9f9' : '#e3f2fd'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="font-size: 16px;">${m.senderNickname} ${m.senderId === 'SYSTEM' ? '👑' : ''}</strong>
                            <small style="color: gray;">${new Date(m.timestamp).toLocaleString()}</small>
                        </div>
                        <p style="margin: 5px 0; font-size: 14px; line-height: 1.4;">${m.content}</p>
                        ${!m.isRead ? `<div style="text-align: right; margin-top: 5px;"><button class="btn-read-mail" data-id="${m.id}" style="padding: 4px 12px; font-size: 12px; background: #4caf50; color: white; border: none; border-radius: 3px; cursor: pointer;">既読にする</button></div>` : ''}
                    </div>
                `).join('');
            }
        } else if (this.currentTab === 'compose') {
            if (friendsList.length === 0) {
                contentHtml = '<div style="text-align:center; padding: 20px; color: #666;">メールを送るにはフレンドが必要です。<br>フレンド画面から申請してみましょう。</div>';
            } else {
                const options = friendsList.map(f => `<option value="${f.id}">${f.nickname}</option>`).join('');
                contentHtml = `
                    <div style="padding: 5px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">宛先（フレンド）</label>
                        <select id="mail-target" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px;">
                            ${options}
                        </select>

                        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">メッセージ</label>
                        <textarea id="mail-content" rows="5" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 5px; resize: vertical;" placeholder="メッセージを入力してください"></textarea>

                        <button id="btn-send-mail" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">✉️ 送信する</button>
                    </div>
                `;
            }
        }

        const finalHtml = `<div class="modal-body-container">${tabsHtml}<div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">${contentHtml}</div></div>`;
        ui.openModal("✉️ メール", finalHtml);

        this.bindEvents();
    },

    bindEvents: function() {
        const ui = this.parentUI;

        document.getElementById('mtab-inbox')?.addEventListener('click', () => { this.currentTab = 'inbox'; this.render(); });
        document.getElementById('mtab-compose')?.addEventListener('click', () => { this.currentTab = 'compose'; this.render(); });

        if (this.currentTab === 'inbox') {
            document.querySelectorAll('.btn-read-mail').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mailId = e.target.getAttribute('data-id');
                    if(typeof Network !== 'undefined' && Network.markMailAsRead) {
                        Network.markMailAsRead(mailId);
                    }
                    e.target.parentElement.parentElement.style.background = '#f9f9f9';
                    e.target.remove();
                });
            });
        }

        if (this.currentTab === 'compose') {
            document.getElementById('btn-send-mail')?.addEventListener('click', () => {
                const targetId = document.getElementById('mail-target').value;
                const content = document.getElementById('mail-content').value.trim();

                // アイテムチェックを削って、メッセージが空っぽかだけを判定
                if (!content) {
                    ui.showNotification('メッセージを入力してください。', 'error');
                    return;
                }

                if(typeof Network !== 'undefined' && Network.sendMail) {
                    // 第3引数（アイテム）は null にして送信！
                    Network.sendMail(targetId, content, null);
                    ui.showNotification('メールを送信しました', 'success');
                    document.getElementById('mail-content').value = '';
                }
            });
        }
    }
};