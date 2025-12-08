const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

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

// DOM Elements
const wrapper = document.getElementById('mainWrapper');
const heroInput = document.getElementById('heroInput');
const bottomInput = document.getElementById('bottomInput');
const messagesList = document.getElementById('messagesList');
const heroSendBtn = document.getElementById('heroSendBtn');
const bottomSendBtn = document.getElementById('bottomSendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const heroChatMenuBtn = document.getElementById('heroChatMenuBtn');
const heroChatMenu = document.getElementById('heroChatMenu');

// ============= NEW CHAT =============
function startNewChat() {
  const newChat = addChatSession();
  currentChatId = newChat.id;
  currentMessages = [];
  messagesList.innerHTML = '';
  wrapper.classList.remove('mode-active');
  renderChatHistory();
}

// ============= CHAT CONTEXT MENUS =============
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

    if (openMenu && openMenu !== menu) {
      openMenu.classList.add('hidden');
    }

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
      `;
      menu.dataset.initialized = '1';

      const items = menu.querySelectorAll('.chat-menu-item');
      const [renameBtn, deleteBtn] = items;
      const chatId = chatItem.dataset.chatId;

      renameBtn.addEventListener('click', () => {
        menu.classList.add('hidden');
        openMenu = null;
        // TODO: rename logic
      });

      deleteBtn.addEventListener('click', () => {
        menu.classList.add('hidden');
        openMenu = null;
        deleteChat(chatId);
      });
    }

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
      openMenu = menu;
    } else {
      menu.classList.add('hidden');
      openMenu = null;
    }
  });
}

// ============= CHAT HISTORY =============
function renderChatHistory() {
  const chats = getChats();
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

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
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a 2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
      <div class="chat-menu hidden"></div>
    `;

    const titleSpan = div.querySelector('.chat-title');
    titleSpan.addEventListener('click', () => loadChatSession(chat.id));

    container.appendChild(div);
  });

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
  
  // Highlight code blocks after loading
  setTimeout(() => highlightAllCodeBlocks(), 100);
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

// ============= CODE SYNTAX HIGHLIGHTING UTILITIES =============

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format message with code block detection
 */
function formatMessageWithCode(text) {
  if (!text) return '';
  
  // Fixed: Correct regex pattern for code blocks
  const codeBlockRegex = /``````/g;
  
  let formatted = text;
  let blockIndex = 0;
  
  // Replace code blocks with highlighted versions
  formatted = formatted.replace(codeBlockRegex, (match, language, code) => {
    language = language || 'javascript';
    const blockId = `code-block-${Date.now()}-${blockIndex++}`;
    
    return `
      <div class="code-block-wrapper" id="${blockId}" style="position: relative; margin: 12px 0;">
        <div class="code-language-label" style="position: absolute; top: 8px; left: 12px; font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px;">${language}</div>
        <button class="copy-code-btn" onclick="copyCodeBlock('${blockId}')" style="position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; opacity: 0; transition: all 0.2s;">
          Copy
        </button>
        <pre style="background: rgba(30,30,30,0.8) !important; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin: 0; overflow-x: auto;"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
      </div>
    `;
  });
  
  // Detect inline code (`code`)
  const inlineCodeRegex = /`([^`]+)`/g;
  formatted = formatted.replace(inlineCodeRegex, '<code style="background: rgba(50,50,50,0.6); border: 1px solid rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">$1</code>');
  
  return formatted;
}

/**
 * Copy code block to clipboard
 */
function copyCodeBlock(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return;
  
  const codeElement = block.querySelector('code');
  const code = codeElement.textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    const btn = block.querySelector('.copy-code-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.background = 'rgba(34, 197, 94, 0.3)';
    btn.style.opacity = '1';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

/**
 * Highlight all code blocks using Prism.js
 */
function highlightAllCodeBlocks() {
  if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
  }
  
  // Show copy buttons on hover
  document.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    wrapper.addEventListener('mouseenter', () => {
      const btn = wrapper.querySelector('.copy-code-btn');
      if (btn) btn.style.opacity = '1';
    });
    wrapper.addEventListener('mouseleave', () => {
      const btn = wrapper.querySelector('.copy-code-btn');
      if (btn && !btn.textContent.includes('✓')) btn.style.opacity = '0';
    });
  });
}

// Make functions global
window.copyCodeBlock = copyCodeBlock;
window.highlightAllCodeBlocks = highlightAllCodeBlocks;

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
        ${text.replace(/\n/g, '<br>')}
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
        
        <div style="flex:1;">
          <span class="ai-message-text" style="
            color:#fff;
            font-family:'Inter',sans-serif;
            font-size:1.08rem;
            font-weight:400;
            line-height:1.6;
            word-wrap:break-word;">
            ${text}
          </span>
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
    <div style="display:flex;align-items:center;gap:10px;">
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
        overflow:hidden;">
        <img src="resources/imran square logo.png" alt="AI"
          style="width:26px;height:26px;object-fit:cover;">
      </div>
      <div style="color: #888; font-size: 14px;">AI is typing...</div>
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
    const selectedModel = document.getElementById('modelSelect')?.value || 'gemini-2.5-flash';

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
    console.log('📦 Server Response:', data);

    removeTyping(typingId);

    // Parse response
    let aiText = '';
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiText = data.candidates[0].content.parts[0].text;
    } else if (data.response) {
      aiText = data.response;
    } else if (data.text) {
      aiText = data.text;
    } else if (data.choices?.[0]?.message?.content) {
      aiText = data.choices[0].message.content;
    } else if (typeof data === 'string') {
      aiText = data;
    } else {
      throw new Error("Could not parse response format");
    }

    if (!aiText || aiText.trim() === '') {
      throw new Error("AI returned empty response");
    }

    console.log('✅ AI Response:', aiText.substring(0, 100) + '...');

    // Format with code highlighting + bold text
    const formatted = formatMessageWithCode(aiText)
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ff6b35;">$1</strong>')
      .replace(/\n/g, '<br>');

    addMessage(formatted, 'ai');

    // Trigger Prism highlighting
    setTimeout(() => highlightAllCodeBlocks(), 100);

  } catch (error) {
    console.error("❌ Error:", error);
    removeTyping(typingId);
    addMessage(
      `<strong style="color:#ef4444;">Error:</strong> ${error.message}<br><small style="color:#888;">Check console (F12) for details</small>`,
      'ai',
      true
    );
  }
}

// ============= EVENT HANDLERS =============

// Hero Menu
if (heroChatMenuBtn && heroChatMenu) {
  heroChatMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    heroChatMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    heroChatMenu.classList.add('hidden');
  });
}

// Auto-resize textareas
[heroInput, bottomInput].forEach(textarea => {
  if (!textarea) return;
  textarea.addEventListener('input', function () {
    this.style.height = '52px';
    this.style.height = Math.min(this.scrollHeight, 200) + "px";
  });
});

// Hero Input - Enter key
heroInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = heroInput.value.trim();
    if (text) {
      sendMessage(text);
      heroInput.value = '';
      heroInput.style.height = '52px';
    }
  }
});

// Hero Send Button
heroSendBtn?.addEventListener('click', () => {
  const text = heroInput.value.trim();
  if (text) {
    sendMessage(text);
    heroInput.value = '';
    heroInput.style.height = '52px';
  }
});

// Bottom Input - Enter key
bottomInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = bottomInput.value.trim();
    if (text) {
      sendMessage(text);
      bottomInput.value = '';
      bottomInput.style.height = '52px';
    }
  }
});

// Bottom Send Button
bottomSendBtn?.addEventListener('click', () => {
  const text = bottomInput.value.trim();
  if (text) {
    sendMessage(text);
    bottomInput.value = '';
    bottomInput.style.height = '52px';
  }
});

// New Chat Button
newChatBtn?.addEventListener('click', startNewChat);

// Download Chat Button
const downloadChatBtn = document.getElementById('downloadChatBtn');
downloadChatBtn?.addEventListener('click', downloadChat);

// ============= INITIALIZE =============
window.addEventListener('DOMContentLoaded', () => {
  const chats = getChats();

  // Start with hero view
  currentChatId = null;
  currentMessages = [];
  messagesList.innerHTML = '';
  wrapper.classList.remove('mode-active');

  renderChatHistory();
  initChatContextMenus();

  console.log('✅ AI Chat initialized');
});

// Make startNewChat global
window.startNewChat = startNewChat;
