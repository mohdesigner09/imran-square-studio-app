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
// --- UI: messages ------------------------------------------
function addMessage(text, role, save = true) {
  if (!messagesList) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'user' ? 'user-message' : 'ai-message';
  msgDiv.dataset.messageId = Date.now();
  msgDiv.dataset.originalText = text;

  // Message content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = role === 'user' ? text : formatMarkdown(text);

  // Action buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions';

  if (role === 'user') {
    // User message: Edit, Delete (left side on hover)
    actionsDiv.innerHTML = `
      <button class="action-btn edit-msg-btn" data-tooltip="Edit">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
      <button class="action-btn delete-msg-btn" data-tooltip="Delete">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    `;
  } else {
    // AI message: Copy, Regenerate (bottom, always visible)
    actionsDiv.innerHTML = `
      <button class="action-btn copy-msg-btn" data-tooltip="Copy">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
      <button class="action-btn regen-msg-btn" data-tooltip="Regenerate">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    `;
  }

  // Timestamp
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'message-timestamp';
  timestampSpan.textContent = timestamp;

  // Append elements
  msgDiv.appendChild(contentDiv);
  msgDiv.appendChild(actionsDiv);
  msgDiv.appendChild(timestampSpan);

  messagesList.appendChild(msgDiv);
  messagesList.scrollTop = messagesList.scrollHeight;

  // Attach event listeners
  attachMessageActions(msgDiv, text, role);
}

// --- MESSAGE ACTIONS ---------------------------------------
function attachMessageActions(msgDiv, originalText, role) {
  if (role === 'user') {
    // Edit button
    const editBtn = msgDiv.querySelector('.edit-msg-btn');
    editBtn?.addEventListener('click', () => editMessage(msgDiv, originalText));

    // Delete button
    const deleteBtn = msgDiv.querySelector('.delete-msg-btn');
    deleteBtn?.addEventListener('click', () => deleteMessage(msgDiv));
  } else {
    // Copy button
    const copyBtn = msgDiv.querySelector('.copy-msg-btn');
    copyBtn?.addEventListener('click', () => copyMessage(msgDiv, originalText));

    // Regenerate button
    const regenBtn = msgDiv.querySelector('.regen-msg-btn');
    regenBtn?.addEventListener('click', () => regenerateMessage(msgDiv));
  }
}

// Copy message to clipboard
async function copyMessage(msgDiv, text) {
  const copyBtn = msgDiv.querySelector('.copy-msg-btn');
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
        Copy
      `;
    }, 2000);
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

// Edit user message
function editMessage(msgDiv, originalText) {
  const contentDiv = msgDiv.querySelector('.message-content');
  const actionsDiv = msgDiv.querySelector('.message-actions');
  
  // Create edit textarea
  const editArea = document.createElement('textarea');
  editArea.className = 'edit-textarea';
  editArea.value = originalText;
  
  // Create edit actions
  const editActionsDiv = document.createElement('div');
  editActionsDiv.className = 'edit-actions';
  editActionsDiv.innerHTML = `
    <button class="edit-btn-save">Save & Resend</button>
    <button class="edit-btn-cancel">Cancel</button>
  `;
  
  // Replace content
  contentDiv.innerHTML = '';
  contentDiv.appendChild(editArea);
  contentDiv.appendChild(editActionsDiv);
  contentDiv.classList.add('editing');
  actionsDiv.style.display = 'none';
  
  editArea.focus();
  editArea.setSelectionRange(editArea.value.length, editArea.value.length);
  
  // Save button
  editActionsDiv.querySelector('.edit-btn-save').addEventListener('click', async () => {
    const newText = editArea.value.trim();
    if (!newText) return;
    
    // Delete current message and all after it
    const allMessages = Array.from(messagesList.children);
    const currentIndex = allMessages.indexOf(msgDiv);
    allMessages.slice(currentIndex).forEach(msg => msg.remove());
    
    // Update chat history
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages = chat.messages.slice(0, currentIndex);
      saveChats(chats);
    }
    
    // Resend edited message
    if (heroInput) heroInput.value = newText;
    if (bottomInput) bottomInput.value = newText;
    await sendMessage(heroInput || bottomInput);
  });
  
  // Cancel button
  editActionsDiv.querySelector('.edit-btn-cancel').addEventListener('click', () => {
    contentDiv.innerHTML = originalText;
    contentDiv.classList.remove('editing');
    actionsDiv.style.display = 'flex';
  });
}

// Delete message
function deleteMessage(msgDiv) {
  if (!confirm('Delete this message?')) return;
  
  const allMessages = Array.from(messagesList.children);
  const currentIndex = allMessages.indexOf(msgDiv);
  
  // Delete current and all after it
  allMessages.slice(currentIndex).forEach(msg => msg.remove());
  
  // Update chat history
  const chats = getChats();
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) {
    chat.messages = chat.messages.slice(0, currentIndex);
    saveChats(chats);
  }
}

// Regenerate AI response
async function regenerateMessage(msgDiv) {
  // Find previous user message
  const allMessages = Array.from(messagesList.children);
  const currentIndex = allMessages.indexOf(msgDiv);
  
  let userMessageText = '';
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (allMessages[i].classList.contains('user-message')) {
      userMessageText = allMessages[i].dataset.originalText;
      break;
    }
  }
  
  if (!userMessageText) return;
  
  // Remove current AI message
  msgDiv.remove();
  
  // Update chat history (remove last AI response)
  const chats = getChats();
  const chat = chats.find(c => c.id === currentChatId);
  if (chat && chat.messages.length > 0) {
    chat.messages.pop();
    saveChats(chats);
  }
  
  // Regenerate
  showTyping();
  
  try {
    const model = document.getElementById('modelSelect')?.value || 'gemini-2.0-flash-exp';
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: userMessageText, model })
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

    // Update chat history
    if (chat) {
      chat.messages.push({ text: aiText, isUser: false });
      chat.lastActive = Date.now();
      saveChats(chats);
    }

  } catch (err) {
    removeTyping();
    console.error('Regenerate error:', err);
    addMessage('⚠️ Error regenerating: ' + err.message, 'ai');
  }
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
