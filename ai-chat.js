const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

let wrapper, heroInput, bottomInput, messagesList, heroSendBtn, bottomSendBtn;
let currentChatId = null;

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
    div.className = 'px-2 py-1.5 rounded-lg hover:bg-[#181818] cursor-pointer';
    div.innerHTML = `<div class="text-sm text-gray-200">${chat.title}</div>`;
    div.addEventListener('click', () => loadChatSession(chat.id));
    container.appendChild(div);
  });
}

function loadChatSession(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatId = chatId;
  if (messagesList) messagesList.innerHTML = '';
  if (wrapper) wrapper.classList.add('mode-active');

  chat.messages?.forEach(msg => {
    addMessage(msg.text, msg.isUser ? 'user' : 'ai');
  });

  if (messagesList) messagesList.scrollTop = messagesList.scrollHeight;
}

function addMessage(text, type) {
  if (!wrapper.classList.contains('mode-active')) {
    wrapper.classList.add('mode-active');
  }

  const row = document.createElement('div');
  row.style.marginBottom = '20px';

  if (type === 'user') {
    row.innerHTML = `<div style="background:#232323;color:#f5f5f5;padding:14px 24px;border-radius:24px 24px 8px 24px;max-width:55vw;margin-left:auto;word-break:break-word;">${text}</div>`;
  } else {
    row.innerHTML = `
      <div style="display:flex;gap:12px;">
        <img src="resources/imran square logo.png" style="width:32px;height:32px;border-radius:50%;">
        <div style="color:#fff;line-height:1.6;">${text}</div>
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
      chat.messages = chat.messages || [];
      chat.messages.push({ text, isUser: type === 'user', timestamp: Date.now() });
      saveChats(chats);
    }
  }
}

function showTyping() {
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.id = id;
  row.innerHTML = `<div style="color:#888;padding:10px;">AI is thinking...</div>`;
  if (messagesList) messagesList.appendChild(row);
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

async function sendMessage(userMessage) {
  if (!userMessage?.trim()) return;

  console.log('📤 Sending:', userMessage);

  if (!currentChatId) {
    const newChat = addChatSession(userMessage.substring(0, 30), []);
    currentChatId = newChat.id;
    renderChatHistory();
  }

  addMessage(userMessage, 'user');
  const typingId = showTyping();

  try {
    const model = document.getElementById('modelSelect')?.value || 'gemini-2.5-flash';

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, model })
    });

    if (!response.ok) throw new Error('Server error');

    const data = await response.json();
    removeTyping(typingId);

    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || data.response || data.text || '';

    if (!aiText.trim()) throw new Error("Empty response");

    const formatted = aiText.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ff6b35;">$1</strong>').replace(/\n/g, '<br>');

    addMessage(formatted, 'ai');

  } catch (error) {
    console.error("❌", error);
    removeTyping(typingId);
    addMessage(`Error: ${error.message}`, 'ai');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Loading...');

  wrapper = document.getElementById('mainWrapper');
  heroInput = document.getElementById('heroInput');
  bottomInput = document.getElementById('bottomInput');
  messagesList = document.getElementById('messagesList');
  heroSendBtn = document.getElementById('heroSendBtn');
  bottomSendBtn = document.getElementById('bottomSendBtn');

  console.log('✅ Elements:', { heroInput: !!heroInput, heroSendBtn: !!heroSendBtn });

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

  heroSendBtn?.addEventListener('click', () => {
    const text = heroInput?.value.trim();
    console.log('🖱️ Clicked:', text);
    if (text) {
      sendMessage(text);
      heroInput.value = '';
    }
  });

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

  bottomSendBtn?.addEventListener('click', () => {
    const text = bottomInput?.value.trim();
    if (text) {
      sendMessage(text);
      bottomInput.value = '';
    }
  });

  document.getElementById('newChatBtn')?.addEventListener('click', startNewChat);

  renderChatHistory();
  console.log('✅ Ready');
});

window.startNewChat = startNewChat;
