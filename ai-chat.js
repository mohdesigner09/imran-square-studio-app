// --- CONFIGURATION & LIBRARY SETUP ---
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

// Configure Marked (Markdown) & Highlight.js (Code Coloring)
if (typeof marked !== 'undefined') {
  marked.setOptions({
    highlight: function(code, lang) {
      if (typeof highlight !== 'undefined' && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      // Fallback for auto-detection or unknown lang
      if (typeof highlight !== 'undefined') {
         return hljs.highlightAuto(code).value;
      }
      return code;
    },
    langPrefix: 'hljs language-',
    breaks: true // Enter key creates <br>
  });
}

// --- GLOBAL STATE ---
let wrapper, heroInput, bottomInput, messagesList, heroSendBtn, bottomSendBtn, newChatBtn;
let currentChatId = null;
let isGenerating = false; 

// --- STORAGE MANAGEMENT ---
function getChats() {
  try {
    return JSON.parse(localStorage.getItem('chatSessions') || '[]');
  } catch (e) {
    console.error("Storage Error:", e);
    return [];
  }
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

// --- UI: HISTORY SIDEBAR ---
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
    // Escape HTML to prevent XSS in titles
    const safeTitle = chat.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
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
        ${safeTitle}
      </div>
    `;
  }).join('');
}

// Global scope for HTML onclick access
window.loadChat = function(chatId) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatId = chatId;
  
  // Switch to Chat Interface
  if (wrapper) wrapper.classList.add('mode-active');
  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.classList.add('mode-active');

  if (messagesList) {
    messagesList.innerHTML = '';
    // Re-render messages
    (chat.messages || []).forEach(m => {
      // Logic: If role is user, show user bubble. If model/ai, show AI bubble.
      // We check m.role or fallback to m.isUser logic
      const role = m.isUser ? 'user' : 'ai';
      addMessage(m.text, role, false); // false = don't scroll hard on load
    });
    
    // Scroll to bottom after loading
    setTimeout(scrollToBottom, 100);
  }

  renderChatHistory();
};

// --- CORE LOGIC: SEND MESSAGE ---
// --- CORE LOGIC: SEND MESSAGE ---
async function sendMessage(inputElement) {
  const userMessage = inputElement.value.trim();
  if (!userMessage) return;

  console.log('📤 Sending:', userMessage);

  // 1. UI Update (Immediate)
  addMessage(userMessage, 'user');
  inputElement.value = ''; // Clear input

  // 2. Session Management & History Prep
  let chatHistory = [];
  
  if (!currentChatId) {
    // Start New Chat
    const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? "..." : "");
    const newChat = addChatSession(title, [{ text: userMessage, isUser: true }]);
    currentChatId = newChat.id;
    renderChatHistory();
  } else {
    // Update Existing Chat
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages.push({ text: userMessage, isUser: true });
      saveChats(chats);
      
      // 🔥 Extract last 10 messages for Context (Memory)
      chatHistory = chat.messages.slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'model', 
        parts: [{ text: m.text }] 
      }));
    }
  }

  // Ensure UI is visible
  if (wrapper) wrapper.classList.add('mode-active');

  showTyping();
  isGenerating = true;
  
  try {
    // 🔥 PHASE 3: IMAGE GENERATION CHECK (PRO VERSION)
    if (userMessage.toLowerCase().startsWith('/image')) {
      
      const prompt = userMessage.replace(/^\/image\s*/i, '').trim();
      if (!prompt) throw new Error("Please describe the image!");

      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

      removeTyping();

      // 1. Placeholder Create Karo (Loading State)
      const aiMsgDiv = document.createElement('div');
      aiMsgDiv.className = 'msg-row ai';
      
      // Initially Sirf Loader Dikhao
      aiMsgDiv.innerHTML = `
        <div class="msg-bubble" style="padding: 0; background: transparent; border: none; width: 100%; max-width: 400px;">
          <div class="image-placeholder" id="loader-${seed}">
            <div class="image-loader"></div>
            <div class="loading-text">Creating Art...</div>
          </div>
          
          <img src="${imageUrl}" 
               class="ai-generated-image" 
               alt="Generated Art"
               style="display: none;" 
               onload="revealImage(this, 'loader-${seed}')"
               onerror="handleImageError(this, 'loader-${seed}')"
          >
          
          <div id="btn-${seed}" style="margin-top: 10px; display: none; gap: 10px; opacity: 0; transition: opacity 1s;">
            <a href="${imageUrl}" download="ai-image.jpg" target="_blank" 
               style="background: #4ade80; color: #000; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;">
               <span>⬇️</span> Download HD
            </a>
          </div>
        </div>
      `;
      
      messagesList.appendChild(aiMsgDiv);
      scrollToBottom();

      // Save to History
      const chats = getChats();
      const chat = chats.find(c => c.id === currentChatId);
      if (chat) {
        chat.messages.push({ text: `[Generated Image: ${prompt}]`, isUser: false });
        saveChats(chats);
      }
      
      isGenerating = false;
      return; 
    }
  
    // ==========================================
    // 👇 TEXT GENERATION LOGIC (Agar image nahi hai)
    // ==========================================

    const model = document.getElementById('modelSelect')?.value || 'gemini-1.5-flash';
    
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userMessage, 
        model,
        history: chatHistory
      })
    });

    removeTyping();

    if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    let aiText = '';

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiText = data.candidates[0].content.parts[0].text; 
    } else if (data.choices?.[0]?.message?.content) {
      aiText = data.choices[0].message.content;
    } else {
      aiText = '⚠️ Empty response from AI.';
    }

    // Show AI Response WITH TYPEWRITER
    await typeWriterEffect(aiText);

    // Save AI Response
    const chats = getChats();
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages.push({ text: aiText, isUser: false });
      chat.lastActive = Date.now();
      saveChats(chats);
    }

  } catch (err) {
    removeTyping();
    console.error('Chat Error:', err);
    addMessage(`⚠️ Error: ${err.message || 'Connection failed'}`, 'ai');
  } finally {
    // Chahe image ho ya text, generating flag band karo
    isGenerating = false;
  }
}

// --- UI: MESSAGE RENDERING ---
function addMessage(text, role, animate = true) {
  if (!messagesList) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'user' ? 'msg-row user' : 'msg-row ai';
  
  // Store raw text for Copy/Edit features
  msgDiv.dataset.originalText = text;

  // Content Bubble
  const contentDiv = document.createElement('div');
  // Add 'prose' class for Markdown styling on AI messages
  contentDiv.className = role === 'user' ? 'msg-bubble' : 'msg-bubble prose';

  if (role === 'user') {
    // User text is safe plain text
    contentDiv.textContent = text;
  } else {
    // AI text is rendered Markdown
   if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(text);
        
        // Pollinations Image Handling
        const imgRegex = /!\[image\]\((https:\/\/image\.pollinations\.ai\/prompt\/[^)]+)\)/g;
        if (imgRegex.test(text)) {
            // Already handled by marked.js img tag, but we can style it
            const images = contentDiv.querySelectorAll('img');
            images.forEach(img => {
                img.style.borderRadius = "12px";
                img.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
                img.style.marginTop = "10px";
            });
        }
    } else {
        contentDiv.innerText = text;
    }
}

  // Action Buttons (Copy, Edit, etc.)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions'; // Requires CSS from prev step

  if (role === 'user') {
    actionsDiv.innerHTML = `
      <button class="action-btn edit-msg-btn" title="Edit">✏️</button>
      <button class="action-btn delete-msg-btn" title="Delete">🗑️</button>
    `;
  } else {
    actionsDiv.innerHTML = `
      <button class="action-btn copy-msg-btn" title="Copy">📋</button>
      <button class="action-btn regen-msg-btn" title="Regenerate">🔄</button>
    `;
  }

  msgDiv.appendChild(contentDiv);
  msgDiv.appendChild(actionsDiv);

  // Append to list
  messagesList.appendChild(msgDiv);
  
  // Attach Event Listeners to Buttons
  attachMessageActions(msgDiv, text, role);

  if (animate) scrollToBottom();
}

// --- PHASE 2: TYPEWRITER EFFECT ---
async function typeWriterEffect(fullText) {
  if (!messagesList) return;

  // 1. Create UI Elements
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg-row ai';
  msgDiv.dataset.originalText = fullText;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-bubble prose';
  msgDiv.appendChild(contentDiv);
  
  // Actions (Hidden initially)
  const actionsDiv = createActionButtons('ai'); // Ensure createActionButtons exists or copy logic here
  actionsDiv.style.opacity = '0'; 
  msgDiv.appendChild(actionsDiv);

  messagesList.appendChild(msgDiv);

  // 2. Typing Logic (Word by Word)
  const words = fullText.split(' ');
  let currentText = '';
  
  return new Promise((resolve) => {
    let i = 0;
    function typeNext() {
      if (i < words.length) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        
        if (typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(currentText);
        } else {
            contentDiv.innerText = currentText;
        }
        
        // Auto Scroll
        if(messagesList) messagesList.scrollTop = messagesList.scrollHeight;
        
        i++;
        setTimeout(typeNext, Math.floor(Math.random() * 15) + 10); // Speed: 10-25ms
      } else {
        actionsDiv.style.opacity = '1'; // Show buttons
        resolve();
      }
    }
    typeNext();
  });
}

// --- HELPER: Create Action Buttons (Copy, Edit, etc.) ---
function createActionButtons(role) {
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions';
  
  if (role === 'user') {
    actionsDiv.innerHTML = `
      <button class="action-btn edit-msg-btn" title="Edit">✏️</button>
      <button class="action-btn delete-msg-btn" title="Delete">🗑️</button>
    `;
  } else {
    actionsDiv.innerHTML = `
      <button class="action-btn copy-msg-btn" title="Copy">📋</button>
      <button class="action-btn regen-msg-btn" title="Regenerate">🔄</button>
    `;
  }
  return actionsDiv;
}

// --- HELPER: Attach Click Events to Buttons ---
function attachMessageActions(msgDiv, originalText, role) {
  if (role === 'user') {
    const editBtn = msgDiv.querySelector('.edit-msg-btn');
    const delBtn = msgDiv.querySelector('.delete-msg-btn');
    
    // Safety check: ? check karta hai ki button exist karta hai ya nahi
    if(editBtn) editBtn.onclick = () => editMessage(msgDiv, originalText);
    if(delBtn) delBtn.onclick = () => deleteMessage(msgDiv);
  } else {
    const copyBtn = msgDiv.querySelector('.copy-msg-btn');
    const regenBtn = msgDiv.querySelector('.regen-msg-btn');
    
    if(copyBtn) copyBtn.onclick = () => copyMessage(copyBtn, originalText);
    if(regenBtn) regenBtn.onclick = () => regenerateMessage(msgDiv);
  }
}

// --- PHASE 3: IMAGE HANDLING HELPERS ---
function revealImage(imgElement, loaderId) {
  const loader = document.getElementById(loaderId);
  const btnDiv = document.getElementById(loaderId.replace('loader', 'btn'));
  
  if (loader) {
    // 1. Loader hatao
    loader.style.display = 'none';
    
    // 2. Image dikhao (Fade In)
    imgElement.style.display = 'block';
    // Thoda delay taaki display:block apply ho jaye, fir opacity badhao
    setTimeout(() => {
      imgElement.classList.add('loaded');
      scrollToBottom();
    }, 50);

    // 3. Button dikhao
    if(btnDiv) {
        btnDiv.style.display = 'flex';
        setTimeout(() => btnDiv.style.opacity = '1', 200);
    }
  }
}

function handleImageError(imgElement, loaderId) {
  const loader = document.getElementById(loaderId);
  if (loader) {
    loader.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">❌ Failed to load image. <br>Please try again.</div>';
  }
}

// --- ACTIONS IMPLEMENTATION ---
async function copyMessage(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.innerHTML;
    btn.innerHTML = '✅';
    setTimeout(() => btn.innerHTML = original, 1500);
  } catch(e) { console.error(e); }
}

function editMessage(msgDiv, oldText) {
  // Simple prompt for now (Can be UI modal later)
  const newText = prompt("Edit message:", oldText);
  if (newText && newText !== oldText) {
     // Remove this and subsequent messages to "branch" the conversation
     // Then re-send
     // For simplicity in Phase 1: Just re-send as new message
     if(heroInput) heroInput.value = newText;
     if(bottomInput) bottomInput.value = newText;
     sendMessage(heroInput || bottomInput);
  }
}

function deleteMessage(msgDiv) {
  if(confirm("Delete message?")) {
    msgDiv.remove();
    // Ideally remove from localStorage too, but complex to sync index
  }
}

async function regenerateMessage(msgDiv) {
  // Remove last AI message
  msgDiv.remove();
  // Trigger last user message again
  // (Requires getting last user message from DOM or Storage)
  const lastUserMsg = Array.from(messagesList.querySelectorAll('.msg-row.user')).pop();
  if (lastUserMsg) {
     const text = lastUserMsg.dataset.originalText;
     // Re-send (will create duplicate user msg in UI unless we handle logic carefully)
     // Smart fix: Just call API directly without adding UI user message
     // ... Advanced logic for Phase 2
     alert("Regenerate feature coming in Phase 2!");
  }
}

// --- UTILS ---
function showTyping() {
  if (!messagesList) return;
  const typing = document.createElement('div');
  typing.id = 'typingIndicator';
  typing.className = 'msg-row ai';
  typing.innerHTML = `
    <div class="msg-bubble" style="background:transparent; border:1px solid rgba(255,255,255,0.1); padding:10px 15px;">
      <span class="animate-pulse">●</span>
      <span class="animate-pulse" style="animation-delay:0.2s">●</span>
      <span class="animate-pulse" style="animation-delay:0.4s">●</span>
    </div>`;
  messagesList.appendChild(typing);
  scrollToBottom();
}

function removeTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

function scrollToBottom() {
  if(messagesList) {
    messagesList.scrollTo({ top: messagesList.scrollHeight, behavior: 'smooth' });
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  wrapper = document.getElementById('mainWrapper');
  heroInput = document.getElementById('heroInput');
  bottomInput = document.getElementById('bottomInput');
  messagesList = document.getElementById('messagesList');
  
  heroSendBtn = document.getElementById('heroSendBtn');
  bottomSendBtn = document.getElementById('bottomSendBtn');
  newChatBtn = document.getElementById('newChatBtn');

  // Input Listeners (Enter to Send)
  const handleEnter = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e.target);
    }
  };

  if (heroInput) heroInput.addEventListener('keydown', handleEnter);
  if (bottomInput) bottomInput.addEventListener('keydown', handleEnter);

  // Button Listeners
  if (heroSendBtn) heroSendBtn.addEventListener('click', () => sendMessage(heroInput));
  if (bottomSendBtn) bottomSendBtn.addEventListener('click', () => sendMessage(bottomInput));

  // New Chat Button
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

  // Suggestion Pills
  window.activateChat = (text) => {
      if(heroInput) {
          heroInput.value = text;
          sendMessage(heroInput);
      }
  };

  // Initial Render
  renderChatHistory();
});