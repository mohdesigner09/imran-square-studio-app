const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

let wrapper, heroInput, bottomInput, messagesList, heroSendBtn, bottomSendBtn, newChatBtn;
let currentChatId = null;
let currentMessages = [];

// Storage functions
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

function startNewChat() {
  const newChat = addChatSession();
  currentChatId = newChat.id;
  currentMessages = [];
  if (messagesList) messagesList.innerHTML = '';
  if (wrapper) wrapper.classList.remove('mode-active');
  renderChatHistory();
}

function renderChatHistory() {
  const chats = getChats();
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

  container.innerHTML = '<div class="text-xs text-gray-500 font-bold uppercase mb-2 px-2">Recent</div>';

  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = 'chat-item group px-2 py-1.5 rounded-lg hover:bg-[#181818] cursor-pointer flex items-center justify-between gap-2' +
      (chat.id === currentChatId ? ' bg-[#1f1f1f]' : '');
    div.dataset.chatId = chat.id;

    div.innerHTML = `
      <div class="truncate text-sm text-gray-200 chat-title">${chat.title}</div>
      <button class="chat-menu-btn opacity-0 group-hover:opacity-100 transition p-1 rounded-md hover:bg-[#1f1f1f]">
        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a 2 2 0 11-4 0 2 2 0 014 0zm6 0a 2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </button>
    `;

    const titleSpan = div.querySelector('.chat-title');
    titleSpan.addEventListener('click', () => loadChatSession(chat.id));
    container.appendChild(div);
  });
}

function loadChatSession(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatId = chatId;
  currentMessages = chat.messages || [];
  if (messagesList) messagesList.innerHTML = '';
  if (wrapper) wrapper.classList.add('mode-active');

  currentMessages.forEach(msg => {
    addMessage(msg.text, msg.isUser ? 'user' : 'ai');
  });

  renderChatHistory();
  if (messagesList) messagesList.scrollTop = messagesList.scrollHeight;
}

function addMessage(text, type) {
  if (!wrapper.classList.contains('mode-active')) {
    wrapper.classList.add('mode-active');
  }

  const row = document.createElement('div');
  row.className = `msg-row ${type}`;

  if (type === 'user') {
    row.innerHTML = `<div style="background:#232323;color:#f5f5f5;padding:14px 24px;border-radius:24px 24px 8px 24px;max-width:55vw;font-size:1.09rem;margin-left:auto;word-break:break-word;box-shadow:0 2px 8px #0002;">${text.replace(/\n/g, '<br>')}</div>`;
  } else {
    row.innerHTML = `
      <div style="display:flex;gap:12px;max-width:75vw;margin-bottom:24px;">
        <div style="min-width:32px;width:32px;height:32px;background:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="resources/imran square logo.png" alt="AI" style="width:26px;height:26px;">
        </div>
        <div style="flex:1;color:#fff;font-size:1.08rem;line-height:1.6;">${text}</div>
      </div>`;
  }

  if (messagesList) {
    messagesList.appendChild(row);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  if (currentChatId) {
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages.push({ text, isUser: type === 'user', timestamp: Date.now() });
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
    <div style="display:flex;gap:10px;">
      <div style="min-width:32px;width:32px;height:32px;background:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <img src="resources/imran square logo.png" alt="AI" style="width:26px;height:26px;">
      </div>
      <div style="color:#888;font-size:14px;">Thinking...</div>
    </div>`;
  if (messagesList) {
    messagesList.appendChild(row);
    messagesList.scrollTop = messagesList.scrollHeight;
  }
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

async function sendMessage(userMessage) {
  if (!userMessage || !userMessage.trim()) return;

  console.log('📤 Sending:', userMessage);

  if (!currentChatId) {
    const newChat = addChatSession(userMessage.substring(0, 30) + '...', []);
    currentChatId = newChat.id;
    renderChatHistory();
  }

  addMessage(userMessage, 'user');
  const typingId = showTyping();

  try {
    const selectedModel = document.getElementById('modelSelect')?.value || 'gemini-2.5-flash';

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, model: selectedModel })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    removeTyping(typingId);

    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                 data.response || data.text ||
                 data.choices?.[0]?.message?.content ||
                 (typeof data === 'string' ? data : '');

    if (!aiText.trim()) throw new Error("Empty response");

    const formatted = aiText
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ff6b35;">$1</strong>')
      .replace(/\n/g, '<br>');

    addMessage(formatted, 'ai');

  } catch (error) {
    console.error("❌ Error:", error);
    removeTyping(typingId);
    addMessage(`<strong style="color:#ef4444;">Error:</strong> ${error.message}`, 'ai');
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing...');

  wrapper = document.getElementById('mainWrapper');
  heroInput = document.getElementById('heroInput');
  bottomInput = document.getElementById('bottomInput');
  messagesList = document.getElementById('messagesList');
  heroSendBtn = document.getElementById('heroSendBtn');
  bottomSendBtn = document.getElementById('bottomSendBtn');
  newChatBtn = document.getElementById('newChatBtn');

  console.log('Elements:', { heroInput: !!heroInput, heroSendBtn: !!heroSendBtn });

  // Hero Input Enter
  heroInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = heroInput.value.trim();
      if (text) {
        sendMessage(text);
        heroInput.value = '';
      }
    }
  });

  // Hero Send Button
  heroSendBtn?.addEventListener('click', () => {
    const text = heroInput?.value.trim();
    console.log('🖱️ Button clicked:', text);
    if (text) {
      sendMessage(text);
      heroInput.value = '';
    }
  });

  // Bottom Input Enter
  bottomInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = bottomInput.value.trim();
      if (text) {
        sendMessage(text);
        bottomInput.value = '';
      }
    }
  });

  // Bottom Send Button
  bottomSendBtn?.addEventListener('click', () => {
    const text = bottomInput?.value.trim();
    if (text) {
      sendMessage(text);
      bottomInput.value = '';
    }
  });

  // New Chat
  newChatBtn?.addEventListener('click', startNewChat);

  // Download
  document.getElementById('downloadChatBtn')?.addEventListener('click', () => {
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat?.messages?.length) return alert('No messages!');

    let text = `=== ${chat.title} ===\n\n`;
    chat.messages.forEach(m => {
      text += `[${m.isUser ? 'YOU' : 'AI'}]:\n${m.text}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  renderChatHistory();
  console.log('✅ Ready!');
});

window.startNewChat = startNewChat;
