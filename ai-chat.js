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
  container.innerHTML = '<div class="text-[10px] text-gray-500 font-bold uppercase mb-2 px-2 tracking-widest">Recent</div>';

  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className =
      'history-item flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer' +
      (chat.id === currentChatId ? ' active' : '');
    item.dataset.chatId = chat.id;
    item.innerHTML = `<div class="truncate text-sm">${chat.title}</div>`;
    item.addEventListener('click', () => loadChatSession(chat.id));
    container.appendChild(item);
  });
}

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
async function sendMessage(userMessage) {
  if (!userMessage || !userMessage.trim()) return;

  // chat create if first msg
  if (!currentChatId) {
    const newChat = addChatSession(userMessage.slice(0, 30), []);
    currentChatId = newChat.id;
    renderChatHistory();
  }

  addMessage(userMessage, 'user', true);
  const typingId = showTyping();

  try {
    const model = document.getElementById('modelSelect')?.value || 'gemini-2.5-flash';

    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, model })
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();

    let aiText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.response ||
      data.text ||
      data.choices?.[0]?.message?.content ||
      (typeof data === 'string' ? data : '');

    if (!aiText || !aiText.trim()) throw new Error('Empty response');

    // basic markdown: **bold**
    aiText = aiText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    removeTyping(typingId);
    addMessage(aiText, 'ai', true);
  } catch (err) {
    console.error(err);
    removeTyping(typingId);
    addMessage(
      `<strong style="color:#ef4444;">Error:</strong> ${err.message}`,
      'ai',
      true
    );
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
