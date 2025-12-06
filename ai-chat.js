  const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

// niche tumhara pura JS code...

  // ============= CHAT STORAGE =============
  function getChats() {
    return JSON.parse(localStorage.getItem("chatSessions") || "[]");
  }

  function saveChats(chats) {
    localStorage.setItem("chatSessions", JSON.stringify(chats));
  }

function addChatSession(title, messages) {
  const chats = getChats();
  const newChat = {
    id: Date.now(),
    title: title || ("Chat " + (chats.length + 1)),
    messages: messages || [],
    lastActive: Date.now()
  };
  chats.unshift(newChat);
  saveChats(chats);
  return newChat;
}

let currentChatId = null;
let currentMessages = [];

const wrapper = document.getElementById('mainWrapper');
const heroInput = document.getElementById('heroInput');
const bottomInput = document.getElementById('bottomInput');
const messagesList = document.getElementById('messagesList');
const heroSendBtn = document.getElementById('heroSendBtn');
const bottomSendBtn = document.getElementById('bottomSendBtn');
const newChatBtn = document.getElementById('newChatBtn');
console.log('newChatBtn =>', newChatBtn);

const heroChatMenuBtn = document.getElementById('heroChatMenuBtn');
const heroChatMenu = document.getElementById('heroChatMenu');
console.log('heroMenu =>', { heroChatMenuBtn, heroChatMenu });





// 1) YAHAN startNewChat function define karo
function startNewChat() {
  const newChat = addChatSession();
  currentChatId = newChat.id;
  currentMessages = [];
  messagesList.innerHTML = '';
  wrapper.classList.remove('mode-active');
  renderChatHistory();
}

// New chat button
if (newChatBtn) {
  newChatBtn.addEventListener('click', startNewChat);
}


function initChatContextMenus() {
  const sidebar = document.getElementById('chatHistoryContainer');
  if (!sidebar) return;

  let openMenu = null;

  document.addEventListener('click', () => {
    if (openMenu) {
      openMenu.classList.add('hidden');
      openMenu = null;
    }
  });

 sidebar.addEventListener('click', (e) => {
  const btn = e.target.closest('.chat-menu-btn');
  if (!btn) return;

  e.stopPropagation();

  const chatItem = btn.closest('.chat-item');
  if (!chatItem) return;

  const menu = chatItem.querySelector('.chat-menu');
  if (!menu) return;

  const rect = chatItem.getBoundingClientRect();
  const offset = rect.top + rect.height / 2 - 80;
  menu.style.setProperty('--chat-menu-y', `${offset}px`);

  // Agar koi aur menu open hai to use band karo
  if (openMenu && openMenu !== menu) {
    openMenu.classList.add('hidden');
  }

  // Build menu content only first time for this item
  if (!menu.dataset.initialized) {
    menu.innerHTML = `
      <button class="chat-menu-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M15.232 5.232l3.536 3.536M4 20h4.5L19 9.5 14.5 5 4 15.5V20z" />
        </svg>
        <span class="label">Rename</span>
      </button>

      <button class="chat-menu-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M4 4h16M9 4l1 16m4-16-1 16M6 4l1 16h10l1-16" />
        </svg>
        <span class="label">Delete</span>
      </button>

      <div class="chat-menu-separator"></div>

      <button class="chat-menu-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M8 7h8M8 12h5m-1 5H8M5 4h14a1 1 0 0 1 1 1v14l-4-3-4 3-4-3-4 3V5a1 1 0 0 1 1-1z" />
        </svg>
        <span class="label">Pin to top</span>
      </button>

      <button class="chat-menu-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M8 7h8m-4-4v8m-7 5h14a1 1 0 0 0 1-1V7.5L14.5 4h-5L4 7.5V15a1 1 0 0 0 1 1z" />
        </svg>
        <span class="label">Duplicate</span>
      </button>

      <button class="chat-menu-item destructive">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        <span class="label">Clear after session</span>
      </button>
    `;

    menu.dataset.initialized = '1';

    const items = menu.querySelectorAll('.chat-menu-item');
    const [renameBtn, deleteBtn, pinBtn, duplicateBtn, clearBtn] = items;
    const chatId = chatItem.dataset.chatId;

    renameBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      openMenu = null;
      // TODO: rename logic
    });

    deleteBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      openMenu = null;
      // TODO: deleteChat(chatId)
    });

    pinBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      openMenu = null;
      // TODO: pinChatToTop(chatId)
    });

    duplicateBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      openMenu = null;
      // TODO: duplicateChat(chatId)
    });

    clearBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      openMenu = null;
      // TODO: scheduleAutoClear(chatId)
    });
  }

  // Toggle current menu
  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    openMenu = menu;
  } else {
    menu.classList.add('hidden');
    openMenu = null;
  }
});  // ← YE sidebar.addEventListener ka closing hai

}

  

              // ============= CHAT HISTORY =============
       function renderChatHistory() {
  const chats = getChats();
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

  // Heading
  container.innerHTML = '<div class="text-xs text-gray-500 font-bold uppercase mb-2 px-2">Recent</div>';

  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className =
      'chat-item group px-2 py-1.5 rounded-lg hover:bg-[#181818] cursor-pointer flex items-center justify-between gap-2' +
      (chat.id === currentChatId ? ' bg-[#1f1f1f]' : '');
    div.dataset.chatId = chat.id;

    div.innerHTML = `
      <div class="truncate text-sm text-gray-200 chat-title">
        ${chat.title}
      </div>

      <button class="chat-menu-btn opacity-0 group-hover:opacity-100 transition p-1 rounded-md hover:bg-[#1f1f1f]" title="More options">
        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      <div class="chat-menu hidden"></div>
    `;

    const titleSpan = div.querySelector('.chat-title');
    titleSpan.addEventListener('click', () => loadChatSession(chat.id));

    container.appendChild(div);
  });

  // YAHAN zaroor likho:
  initChatContextMenus();
}

              
              function loadChatSession(chatId) {
                const chats = getChats();
                const chat = chats.find(c => c.id === chatId);

                if (!chat) return;

                currentChatId = chatId;
                currentMessages = chat.messages || [];

                messagesList.innerHTML = '';
                wrapper.classList.add('mode-active');

                currentMessages.forEach(msg => {
                  addMessage(msg.text, msg.isUser ? 'user' : 'ai');
                });

                renderChatHistory();
                messagesList.scrollTop = messagesList.scrollHeight;
              }

              function deleteChat(chatId) {
                const chats = getChats();
                const chat = chats.find(c => c.id === chatId);
                const chatTitle = chat ? chat.title : 'this chat';

                if (!confirm(`Delete "${chatTitle}"?\n\nThis action cannot be undone.`)) {
                  return;
                }

                const updatedChats = chats.filter(c => c.id !== chatId);
                saveChats(updatedChats);

                if (currentChatId === chatId) {
                  if (updatedChats.length > 0) {
                    const mostRecent = updatedChats.reduce((prev, current) =>
                      (prev.lastActive > current.lastActive) ? prev : current
                    );
                    loadChatSession(mostRecent.id);
                  } else {
                    currentChatId = null;
                    currentMessages = [];
                    messagesList.innerHTML = '';
                    wrapper.classList.remove('mode-active');
                  }
                }

                renderChatHistory();
              }

              function startNewChat() {
                const newChat = addChatSession();
                currentChatId = newChat.id;
                currentMessages = [];
                messagesList.innerHTML = '';
                wrapper.classList.remove('mode-active');
                renderChatHistory();
              }

window.startNewChat = startNewChat;



              function downloadChat() {
                const chats = getChats();
                const chat = chats.find(c => c.id === currentChatId);

                if (!chat || !chat.messages || chat.messages.length === 0) {
                  alert('No messages to download!');
                  return;
                }

                let chatText = `=== ${chat.title} ===\nDownloaded: ${new Date().toLocaleString()}\n\n`;

                chat.messages.forEach((msg) => {
                  chatText += `[${msg.isUser ? 'YOU' : 'AI'}]:\n${msg.text}\n\n`;
                });

                const blob = new Blob([chatText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${chat.title.replace(/\s+/g, '-')}-${Date.now()}.txt`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }
                


                // ============= MESSAGE HANDLING =============
              function addMessage(text, type, isError = false) {
                if (!wrapper.classList.contains('mode-active')) {
                  wrapper.classList.add('mode-active');
                }

                const row = document.createElement('div');
                row.className = `msg-row ${type}`;

                if (type === 'user') {
                  row.innerHTML = `
      <div style="
        background:#232323;
        color:#f5f5f5;
        padding:14px 24px;
        border-radius:24px 24px 8px 24px;
        max-width:55vw;
        font-size:1.09rem;
        font-family:'Inter',sans-serif;
        margin-left:auto;
        word-break:break-word;
        box-shadow:0 2px 8px #0002;">
        ${text}
      </div>
    `;
                } else {
                  row.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;max-width:75vw;margin-bottom:24px;">
      <div style="
        min-width:32px;
        max-width:32px;
        width:32px;
        height:32px;
        background:#000;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        flex-shrink:0;
        overflow:hidden;">
        <img src="resources/imran square logo.png" alt="AI"
          style="width:26px;height:26px;object-fit:cover;display:block;">
      </div>
      
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
        <span class="ai-message-text" style="
          color:#fff;
          font-family:'Inter',sans-serif;
          font-size:1.08rem;
          font-weight:400;
          line-height:1.6;
          word-wrap:break-word;">
          ${text}
        </span>
        
        <div class="ai-actions" style="display:none;align-items:center;gap:8px;margin-top:4px;">
          <button class="action-btn copy-btn" title="Copy" style="background:none;border:none;cursor:pointer;padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          
          <button class="action-btn regen-btn" title="Regenerate response" style="background:none;border:none;cursor:pointer;padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>

          <button class="action-btn download-msg-btn" title="Download message" style="background:none;border:none;cursor:pointer;padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
                }


                messagesList.appendChild(row);
                messagesList.scrollTop = messagesList.scrollHeight;

                if (currentChatId) {
                  const chats = getChats();
                  const chat = chats.find(c => c.id === currentChatId);
                  if (chat) {
                    chat.messages.push({
                      text,
                      isUser: type === 'user',
                      model: type === 'ai' ? document.getElementById('modelSelect')?.value : null,
                      timestamp: Date.now()
                    });
                    chat.lastActive = Date.now();
                    saveChats(chats);
                  }
                }
              }

              function showTyping() {
                const id = 'typing-' + Date.now();
                const row = document.createElement('div');
                row.id = id;
                row.className = 'msg-row ai';

                row.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;max-width:62vw;">
      <div style="
        min-width:32px;
        max-width:32px;
        width:32px;
        height:32px;
        background:#000;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        flex-shrink:0;
        overflow:hidden;">
        <img src="resources/imran square logo.png" alt="AI"
          style="width:26px;height:26px;object-fit:cover;display:block;">
      </div>
      <div style="background:none; box-shadow:none; padding:0; min-width:40px;">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;

                messagesList.appendChild(row);
                messagesList.scrollTop = messagesList.scrollHeight;
                return id;
              }

              function removeTyping(id) {
                document.getElementById(id)?.remove();
              }

              // ============= API CALL =============
              async function sendMessage(userMessage) {
                if (!currentChatId) {
                  const newChat = addChatSession(userMessage.substring(0, 30) + '...', []);
                  currentChatId = newChat.id;
                  renderChatHistory();
                }

                addMessage(userMessage, 'user');
                const typingId = showTyping();

                try {
        const selectedModel = document.getElementById('modelSelect').value || 'gemini-1.5-pro';

        console.log('🚀 Sending request:', { userMessage, selectedModel });

        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: userMessage,
            model: selectedModel
          })
        });


                  if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                  }

                  const data = await response.json();
                  console.log('📦 Full Server Response:', JSON.stringify(data, null, 2));

                  removeTyping(typingId);

                  // Parse response
                  let aiText = '';

                  // Try multiple formats
                  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    console.log('✅ Using Gemini format');
                    aiText = data.candidates[0].content.parts[0].text;
                  } else if (data.response) {
                    console.log('✅ Using simple response format');
                    aiText = data.response;
                  } else if (data.text) {
                    console.log('✅ Using text format');
                    aiText = data.text;
                  } else if (data.choices?.[0]?.message?.content) {
                    console.log('✅ Using OpenAI format');
                    aiText = data.choices[0].message.content;
                  } else if (typeof data === 'string') {
                    console.log('✅ Using raw string');
                    aiText = data;
                  } else {
                    console.error('❌ Unknown format. Full response:', data);
                    console.error('Data keys:', Object.keys(data));
                    throw new Error("Could not parse response format. Check console.");
                  }

                  if (!aiText || aiText.trim() === '') {
                    throw new Error("AI returned empty response");
                  }

                  console.log('✅ Extracted text:', aiText.substring(0, 100) + '...');

                  // Format and display
                  const formatted = aiText
                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ff6b35;">$1</strong>')
                    .replace(/\n/g, '<br>');

                  addMessage(formatted, 'ai');

                } catch (error) {
                  console.error("❌ Full Error:", error);
                  removeTyping(typingId);
                  addMessage(
                    `<strong>Error:</strong> ${error.message}<br><small>Check browser console (F12) for details</small>`,
                    'ai',
                    true
                  );
                }
              }


              async function regenerateResponse(messageRow) {
                const allMessages = Array.from(messagesList.querySelectorAll('.msg-row'));
                const currentIndex = allMessages.indexOf(messageRow);

                let userMessage = '';
                for (let i = currentIndex - 1; i >= 0; i--) {
                  if (allMessages[i].classList.contains('user')) {
                    const userTextDiv = allMessages[i].querySelector('div');
                    userMessage = userTextDiv ? userTextDiv.textContent.trim() : '';
                    break;
                  }
                }

                if (!userMessage) {
                  alert('Could not find original message');
                  return;
                }

                messageRow.remove();

                if (currentChatId) {
                  const chats = getChats();
                  const chat = chats.find(c => c.id === currentChatId);
                  if (chat && chat.messages.length > 0) {
                    chat.messages.pop();
                    saveChats(chats);
                  }
                }

                sendMessage(userMessage);
              }

// ============= EVENT HANDLERS (CORRECTED) =============

// HERO MENU
if (heroChatMenuBtn && heroChatMenu) {
  heroChatMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.chat-menu').forEach(m => m.classList.add('hidden'));
    heroChatMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    heroChatMenu.classList.add('hidden');
  });
}


// ... baaki hero/bottom inputs, buttons, newChatBtn, etc ...

// Auto-resize textarea
[heroInput, bottomInput].forEach(textarea => {
  if (!textarea) return;
  textarea.addEventListener('input', function () {
    this.style.height = '28px';
    this.style.height = Math.min(this.scrollHeight, 160) + "px";
  });
});

// ✅ Hero Input - Enter key
heroInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    const text = heroInput.value.trim();
    if (text) {
      sendMessage(text);
      heroInput.value = '';
      heroInput.style.height = '28px';
    }
  }
});

// ✅ Hero Send Button
heroSendBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const text = heroInput.value.trim();
  if (text) {
    sendMessage(text);
    heroInput.value = '';
    heroInput.style.height = '28px';
  }
});

// ✅ Bottom Input - Enter key
bottomInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    const text = bottomInput.value.trim();
    if (text) {
      sendMessage(text);
      bottomInput.value = '';
      bottomInput.style.height = '28px';
    }
  }
});

// ✅ Bottom Send Button
bottomSendBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const text = bottomInput.value.trim();
  if (text) {
    sendMessage(text);
    bottomInput.value = '';
    bottomInput.style.height = '28px';
  }
});

// New chat button
newChatBtn?.addEventListener('click', startNewChat);

// Download chat button
const downloadChatBtn = document.getElementById('downloadChatBtn');
if (downloadChatBtn) {
  downloadChatBtn.addEventListener('click', function () {
    downloadChat();
  });
}

// Message action handlers (Copy, Regenerate)
messagesList.addEventListener('click', function (e) {
  // Copy button
  if (e.target.closest('.copy-btn')) {
    const btn = e.target.closest('.copy-btn');
    const msgRow = btn.closest('.msg-row');
    const aiText = msgRow.querySelector('span').innerText;
    navigator.clipboard.writeText(aiText).then(() => {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="green" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';
      setTimeout(() => { btn.innerHTML = originalHTML; }, 1200);
    });
  }

  // Regenerate button
  if (e.target.closest('.regen-btn')) {
    const btn = e.target.closest('.regen-btn');
    const msgRow = btn.closest('.msg-row');
    if (confirm('Regenerate this response?')) {
      regenerateResponse(msgRow);
    }
  }
});

// Film grain animation (optional)
const canvas = document.getElementById('filmGrain');
if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 1000; i++) {
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2,
        Math.random() * 2
      );
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ============= INITIALIZE ON PAGE LOAD =============

window.addEventListener('DOMContentLoaded', () => {
  const chats = getChats();

  // Hero state by default
  currentChatId = null;
  currentMessages = [];
  messagesList.innerHTML = '';
  wrapper.classList.remove('mode-active');

  // Sidebar fill + menus
  renderChatHistory();
  initChatContextMenus();   // <<< yeh line ADD/CONFIRM karo

  console.log('✅ AI Chat initialized (no auto-load)');
});
