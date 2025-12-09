// --- CONFIG -------------------------------------------------
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

// --- STATE --------------------------------------------------
let wrapper, heroInput, bottomInput, messagesList, heroSendBtn, bottomSendBtn, newChatBtn;
let currentChatId = null;

// --- STORAGE -----------------------------------------------
function getChats() {
  return JSON.parse(localStorage.getItem('chatSessions') || '[]');
}
function saveChats(chats) {
  localStorage.setItem('chatSessions', JSON.stringify(chats));
}
function addChatSession(title, messages) {
  const chats = getChats();
  const newChat = {
    id: Date.now(),
    title: title || `Chat ${chats.length + 1}`,
    messages: messages || [],
    lastActive: Date.now()
  };
  chats.unshift(newChat);
  saveChats(chats);
  return newChat;
}

// --- UI: history -------------------------------------------
function renderChatHistory() {
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

  const chats = getChats();
  
  if (chats.length === 0) {
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem;">No chats yet</div>';
    return;
  }

  container.innerHTML = chats.map(chat => `
    <div class="chat-item ${chat.id === currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
      <span class="chat-item-title">${escapeHtml(chat.title)}</span>
      <button class="chat-item-menu-btn" data-menu-chat-id="${chat.id}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="8" cy="13" r="1.5"/>
        </svg>
      </button>
    </div>
  `).join('');

  // ✅ Event listeners (not inline onclick)
  container.querySelectorAll('.chat-item-title').forEach(title => {
    title.addEventListener('click', (e) => {
      const chatItem = e.target.closest('.chat-item');
      const chatId = parseInt(chatItem.dataset.chatId);
      loadChat(chatId);
    });
  });

  // ✅ Menu button listeners
  container.querySelectorAll('.chat-item-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = parseInt(btn.dataset.menuChatId);
      toggleChatMenu(e, chatId, btn);
    });
  });
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Chat Menu Toggle ---
let currentMenuChatId = null;

function toggleChatMenu(event, chatId, buttonElement) {
  event.stopPropagation();
  
  // Close existing menu
  const existingMenu = document.querySelector('.chat-dropdown-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // If clicking same menu, just close
  if (currentMenuChatId === chatId) {
    currentMenuChatId = null;
    document.removeEventListener('click', closeMenuOnOutsideClick);
    return;
  }

  currentMenuChatId = chatId;

  // Create menu
  const menu = document.createElement('div');
  menu.className = 'chat-dropdown-menu show';
  menu.innerHTML = `
    <div class="chat-menu-item" data-action="rename" data-chat-id="${chatId}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      Rename
    </div>
    <div class="chat-menu-item danger" data-action="delete" data-chat-id="${chatId}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      Delete
    </div>
  `;

  // Position menu
  const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
  chatItem.style.position = 'relative';
  chatItem.appendChild(menu);

  // Menu item listeners
  menu.querySelectorAll('.chat-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const id = parseInt(item.dataset.chatId);
      
      if (action === 'rename') renameChat(id);
      if (action === 'delete') deleteChat(id);
    });
  });

  // Close menu on outside click
  setTimeout(() => {
    document.addEventListener('click', closeMenuOnOutsideClick);
  }, 100);
}

function closeMenuOnOutsideClick(e) {
  if (!e.target.closest('.chat-dropdown-menu') && !e.target.closest('.chat-item-menu-btn')) {
    const menu = document.querySelector('.chat-dropdown-menu');
    if (menu) menu.remove();
    currentMenuChatId = null;
    document.removeEventListener('click', closeMenuOnOutsideClick);
  }
}

// --- Rename Chat ---
function renameChat(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  // Close menu
  document.querySelector('.chat-dropdown-menu')?.remove();
  currentMenuChatId = null;
  document.removeEventListener('click', closeMenuOnOutsideClick);

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">Rename Chat</div>
      <input type="text" class="modal-input" value="${escapeHtml(chat.title)}" id="renameChatInput" maxlength="50">
      <div class="modal-buttons">
        <button class="modal-btn modal-btn-cancel" data-action="cancel">Cancel</button>
        <button class="modal-btn modal-btn-confirm" data-action="confirm">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('renameChatInput');
    input.focus();
    input.select();

    // Enter to save
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmRename(chatId);
      if (e.key === 'Escape') closeModal();
    });

    // Button listeners
    modal.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
    modal.querySelector('[data-action="confirm"]').addEventListener('click', () => confirmRename(chatId));
  }, 100);
}

function confirmRename(chatId) {
  const input = document.getElementById('renameChatInput');
  const newTitle = input.value.trim();
  
  if (!newTitle) {
    input.style.borderColor = '#ef4444';
    return;
  }

  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (chat) {
    chat.title = newTitle;
    saveChats(chats);
    renderChatHistory();
  }

  closeModal();
}

// --- Delete Chat ---
function deleteChat(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  // Close menu
  document.querySelector('.chat-dropdown-menu')?.remove();
  currentMenuChatId = null;
  document.removeEventListener('click', closeMenuOnOutsideClick);

  // Create confirmation modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">Delete Chat?</div>
      <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 1.5rem;">
        Are you sure you want to delete "<strong>${escapeHtml(chat.title)}</strong>"? This action cannot be undone.
      </p>
      <div class="modal-buttons">
        <button class="modal-btn modal-btn-cancel" data-action="cancel">Cancel</button>
        <button class="modal-btn modal-btn-danger" data-action="delete">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Button listeners
  modal.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
  modal.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(chatId));
}

function confirmDelete(chatId) {
  let chats = getChats();
  chats = chats.filter(c => c.id !== chatId);
  saveChats(chats);

  // If deleting current chat, start new
  if (currentChatId === chatId) {
    currentChatId = null;
    messagesList.innerHTML = '';
    wrapper.classList.remove('mode-active');
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.classList.remove('mode-active');
  }

  renderChatHistory();
  closeModal();
}

// --- Close Modal ---
function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 200);
  }
}

// --- Load Chat Session ---
function loadChatSession(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatId = chatId;
  if (wrapper) wrapper.classList.add('mode-active');
  if (messagesList) messagesList.innerHTML = '';

  (chat.messages || []).forEach(m => {
    addMessage(m.text, m.isUser ? 'user' : 'ai', false);
  });

  if (messagesList) messagesList.scrollTop = messagesList.scrollHeight;
  renderChatHistory();
}


function startNewChat() {
  const newChat = addChatSession();
  currentChatId = newChat.id;
  if (messagesList) messagesList.innerHTML = '';
  if (wrapper) wrapper.classList.remove('mode-active');
  renderChatHistory();
}

// --- UI: messages ------------------------------------------
function addMessage(text, type = 'ai', persist = true) {
  if (!text) return;

  if (!wrapper.classList.contains('mode-active')) {
    wrapper.classList.add('mode-active');
  }

  const row = document.createElement('div');
  row.className = `msg-row ${type}`;

  if (type === 'user') {
    row.innerHTML = `
      <div class="msg-bubble">
        ${text.replace(/\n/g, '<br>')}
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="msg-bubble">
        ${text}
      </div>
    `;
  }

  if (messagesList) {
    messagesList.appendChild(row);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  if (persist && currentChatId) {
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages = chat.messages || [];
      chat.messages.push({
        text,
        isUser: type === 'user',
        timestamp: Date.now()
      });
      chat.lastActive = Date.now();
      saveChats(chats);
    }
  }
}

function showTyping() {
  const id = `typing-${Date.now()}`;
  const row = document.createElement('div');
  row.id = id;
  row.className = 'msg-row ai';
  row.innerHTML = `
    <div class="msg-bubble">
      <span class="text-gray-400 text-sm">Thinking…</span>
    </div>
  `;
  if (messagesList) {
    messagesList.appendChild(row);
    messagesList.scrollTop = messagesList.scrollHeight;
  }
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// --- API ----------------------------------------------------
// ---------- API ----------
async function sendMessage(userMessage) {
  if (!userMessage || !userMessage.trim()) return;

  // Activate chat mode
  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.classList.add('mode-active');
  if (wrapper) wrapper.classList.add('mode-active');

  if (!currentChatId) {
    const newChat = addChatSession(userMessage.slice(0, 30), []);
    currentChatId = newChat.id;
    renderChatHistory();
  }

  addMessage(userMessage, 'user', true);
  const typingId = showTyping();

  try {
    const model = document.getElementById('modelSelect')?.value || 'gemini-2.5-flash';
    
    console.log('📤 Sending:', userMessage);

    // ✅ TRY SELECTED MODEL FIRST
    let response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, model })
    });

    // ✅ IF 429 ERROR, AUTO-FALLBACK TO GROQ
    if (response.status === 429) {
      console.log('⚠️ Rate limit hit, trying Groq fallback...');
      
      response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userMessage, 
          model: 'groq-llama-70b' // Fast & free alternative
        })
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Parse response based on model
    let aiText = 
      data.candidates?.[0]?.content?.parts?.[0]?.text || // Gemini
      data.choices?.[0]?.message?.content ||             // Groq/Perplexity
      data.response ||                                    // Generic
      data.text ||
      (typeof data === 'string' ? data : '');

    if (!aiText || !aiText.trim()) {
      throw new Error('Empty response received');
    }

    // Simple formatting
    aiText = aiText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    removeTyping(typingId);
    addMessage(aiText, 'ai', true);

  } catch (err) {
    console.error(err);
    removeTyping(typingId);
    
    // ✅ USER-FRIENDLY ERROR MESSAGE
    let errorMsg = '<strong style="color:#ef4444;">⚠️ Error:</strong> ';
    
    if (err.message.includes('429') || err.message.includes('quota')) {
      errorMsg += 'API limit reached. Please wait 1 minute or try Groq/Perplexity models.';
    } else if (err.message.includes('Failed to fetch')) {
      errorMsg += 'Network error. Check your internet connection.';
    } else {
      errorMsg += err.message;
    }
    
    addMessage(errorMsg, 'ai', true);
  }
}


// --- DOWNLOAD ----------------------------------------------
function downloadChat() {
  const chats = getChats();
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat || !chat.messages?.length) {
    alert('No messages to download.');
    return;
  }

  let out = `=== ${chat.title} ===\nDownloaded: ${new Date().toLocaleString()}\n\n`;
  chat.messages.forEach(m => {
    out += `[${m.isUser ? 'YOU' : 'AI'}]\n${m.text}\n\n`;
  });

  const blob = new Blob([out], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chat.title.replace(/\s+/g, '-')}-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- INIT --------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // cache elements
  wrapper = document.getElementById('mainWrapper');
  heroInput = document.getElementById('heroInput');
  bottomInput = document.getElementById('bottomInput');
  messagesList = document.getElementById('messagesList');
  heroSendBtn = document.getElementById('heroSendBtn');
  bottomSendBtn = document.getElementById('bottomSendBtn');
  newChatBtn = document.getElementById('newChatBtn');

  // auto-resize textareas
  [heroInput, bottomInput].forEach(t => {
    if (!t) return;
    t.addEventListener('input', function () {
      this.style.height = '24px';
      this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    });
  });

  // hero: Enter
  heroInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = heroInput.value.trim();
      if (text) {
        sendMessage(text);
        heroInput.value = '';
        heroInput.style.height = '24px';
      }
    }
  });

  // hero: button
  heroSendBtn?.addEventListener('click', () => {
    const text = heroInput?.value.trim();
    if (text) {
      sendMessage(text);
      heroInput.value = '';
      heroInput.style.height = '24px';
    }
  });

  // bottom: Enter
  bottomInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = bottomInput.value.trim();
      if (text) {
        sendMessage(text);
        bottomInput.value = '';
        bottomInput.style.height = '24px';
      }
    }
  });

  // bottom: button
  bottomSendBtn?.addEventListener('click', () => {
    const text = bottomInput?.value.trim();
    if (text) {
      sendMessage(text);
      bottomInput.value = '';
      bottomInput.style.height = '24px';
    }
  });

  // new chat
  newChatBtn?.addEventListener('click', startNewChat);

  // download
  document.getElementById('downloadChatBtn')
    ?.addEventListener('click', downloadChat);

  // initial sidebar
  renderChatHistory();

  console.log('✅ Neural Core ready');
});

// expose for pills
window.activateChat = prompt => {
  if (!heroInput) return;
  heroInput.value = prompt;
  heroInput.focus();
};

// ========== GLOBAL SCOPE (for inline onclick) ==========
window.toggleChatMenu = toggleChatMenu;
window.renameChat = renameChat;
window.deleteChat = deleteChat;
window.confirmRename = confirmRename;
window.confirmDelete = confirmDelete;
window.closeModal = closeModal;
window.escapeHtml = escapeHtml;

