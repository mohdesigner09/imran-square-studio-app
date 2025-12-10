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

  container.innerHTML = chats.map(chat => {
    const isActive = chat.id === currentChatId ? 'active' : '';
    return `
      <div class="chat-item ${isActive}" onclick="loadChat(${chat.id})" style="
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: ${isActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
        border: 1px solid ${isActive ? 'rgba(74, 222, 128, 0.5)' : 'transparent'};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
        color: ${isActive ? '#4ade80' : 'rgba(255, 255, 255, 0.7)'};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${chat.title}
      </div>
    `;
  }).join('');
}

function loadChat(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatId = chatId;
  
  if (wrapper) wrapper.classList.add('mode-active');
  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.classList.add('mode-active');

  if (messagesList) {
    messagesList.innerHTML = '';
    (chat.messages || []).forEach(m => {
      addMessage(m.text, m.isUser ? 'user' : 'ai', false);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  renderChatHistory();
}

// --- Send message ------------------------------------------
async function sendMessage(inputElement) {
  const userMessage = inputElement.value.trim();
  if (!userMessage) return;

  console.log('📤 Sending:', userMessage);

  const model = document.getElementById('modelSelect')?.value || 'gemini-2.0-flash-exp';

  addMessage(userMessage, 'user');
  inputElement.value = '';

  if (!currentChatId) {
    const newChat = addChatSession(userMessage.slice(0, 50), [{ text: userMessage, isUser: true }]);
    currentChatId = newChat.id;
    renderChatHistory();
  } else {
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages.push({ text: userMessage, isUser: true });
      saveChats(chats);
    }
  }

  if (wrapper) wrapper.classList.add('mode-active');
  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.classList.add('mode-active');

  showTyping();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, model })
    });

    removeTyping();

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    let aiText = '';

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiText = data.candidates[0].content.parts[0].text;
    } else if (data.choices?.[0]?.message?.content) {
      aiText = data.choices[0].message.content;
    } else {
      aiText = 'No response text found.';
    }

    addMessage(aiText, 'ai');

    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages.push({ text: aiText, isUser: false });
      chat.lastActive = Date.now();
      saveChats(chats);
    }

  } catch (err) {
    removeTyping();
    console.error('Error:', err);
    addMessage('⚠️ Error: ' + err.message, 'ai');
  }
}

// --- UI: messages ------------------------------------------
function addMessage(text, role, save = true) {
  if (!messagesList) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'user' ? 'user-message' : 'ai-message';
  msgDiv.innerHTML = role === 'user' 
    ? `<div class="message-content">${text}</div>`
    : `<div class="message-content">${formatMarkdown(text)}</div>`;

  messagesList.appendChild(msgDiv);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function formatMarkdown(text) {
  return text
    .replace(/``````/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function showTyping() {
  if (!messagesList) return;
  const typing = document.createElement('div');
  typing.className = 'ai-message typing-indicator';
  typing.innerHTML = '<div class="message-content"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
  messagesList.appendChild(typing);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function removeTyping() {
  const typing = messagesList?.querySelector('.typing-indicator');
  if (typing) typing.remove();
}

// --- Init --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  wrapper = document.getElementById('mainWrapper');
  heroInput = document.getElementById('heroInput');
  bottomInput = document.getElementById('bottomInput');
  messagesList = document.getElementById('messagesList');
  heroSendBtn = document.getElementById('heroSendBtn');
  bottomSendBtn = document.getElementById('bottomSendBtn');
  newChatBtn = document.getElementById('newChatBtn');

  if (heroSendBtn) heroSendBtn.addEventListener('click', () => sendMessage(heroInput));
  if (bottomSendBtn) bottomSendBtn.addEventListener('click', () => sendMessage(bottomInput));

  if (heroInput) {
    heroInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(heroInput);
      }
    });
  }

  if (bottomInput) {
    bottomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(bottomInput);
      }
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      currentChatId = null;
      if (messagesList) messagesList.innerHTML = '';
      if (wrapper) wrapper.classList.remove('mode-active');
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.classList.remove('mode-active');
      if (heroInput) heroInput.value = '';
      if (bottomInput) bottomInput.value = '';
      renderChatHistory();
    });
  }

  renderChatHistory();

  document.querySelectorAll('.prompt-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const text = pill.textContent.trim();
      if (heroInput) {
        heroInput.value = text;
        sendMessage(heroInput);
      }
    });
  });
});
