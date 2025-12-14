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

// --- IMPROVED HISTORY MANAGEMENT ---

// --- GLOBAL VARIABLE ---
let activeMenuChatId = null; // Track karega ki abhi kiska menu khula hai

// 1. UPDATED RENDER FUNCTION (Menu HTML hata diya)
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
    const safeTitle = chat.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    return `
      <div class="chat-item ${isActive}" onclick="loadChat(${chat.id})">
        <span class="chat-title-text">${safeTitle}</span>
        
        <div class="chat-menu-btn" onclick="openGlobalMenu(event, ${chat.id})">
          ⋮
        </div>
      </div>
    `;
  }).join('');
}

// 2. NEW: OPEN MENU LOGIC (Positioning Magic)
window.openGlobalMenu = function(e, chatId) {
  e.stopPropagation(); // Chat load hone se roko
  
  const menu = document.getElementById('globalChatMenu');
  const btn = e.currentTarget; // Jo button dabaya gaya
  
  // 1. Button ki position pata karo screen par kahan hai
  const rect = btn.getBoundingClientRect();
  
  // 2. Active Chat ID set karo
  activeMenuChatId = chatId;
  
  // 3. Position Calculation (Sidebar ke bahar, button se chipka hua)
  // Top: Button ke barabar
  // Left: Button ke right side + 5px ka gap
  menu.style.top = `${rect.top}px`;
  menu.style.left = `${rect.right + 5}px`; 
  
  // Mobile Safety: Agar screen ke bahar ja raha ho, to thoda andar khisko
  if (window.innerWidth < 768) {
     menu.style.left = `${rect.right - 100}px`; // Mobile par left side khulega
  }

  // 4. Show Menu
  menu.classList.add('show');
  
  // 5. Actions attach karo
  document.getElementById('globalRenameBtn').onclick = () => handleRename();
  document.getElementById('globalDeleteBtn').onclick = () => handleDelete();
};

// 3. ACTION HANDLERS
function handleRename() {
  if (!activeMenuChatId) return;
  closeGlobalMenu();
  
  const chats = getChats();
  const chat = chats.find(c => c.id === activeMenuChatId);
  
  if (chat) {
    const newTitle = prompt("Rename Chat:", chat.title);
    if (newTitle && newTitle.trim()) {
      chat.title = newTitle.trim();
      saveChats(chats);
      renderChatHistory();
    }
  }
}

function handleDelete() {
  if (!activeMenuChatId) return;
  closeGlobalMenu();
  
  if (confirm("Delete this chat permanently?")) {
    let chats = getChats();
    chats = chats.filter(c => c.id !== activeMenuChatId);
    saveChats(chats);
    
    if (currentChatId === activeMenuChatId) {
      // Current chat uda di, to reset karo
      currentChatId = null;
      if (typeof messagesList !== 'undefined') messagesList.innerHTML = '';
      if (typeof wrapper !== 'undefined') wrapper.classList.remove('mode-active');
      document.getElementById('mainContent')?.classList.remove('mode-active');
    }
    renderChatHistory();
  }
}

// 4. CLOSE MENU HELPER
function closeGlobalMenu() {
  const menu = document.getElementById('globalChatMenu');
  if (menu) menu.classList.remove('show');
  activeMenuChatId = null;
}

// 5. CLICK OUTSIDE TO CLOSE
document.addEventListener('click', (e) => {
  // Agar click menu ke andar nahi hai aur button par nahi hai
  if (!e.target.closest('#globalChatMenu') && !e.target.closest('.chat-menu-btn')) {
    closeGlobalMenu();
  }
});

// 1. Menu Open/Close Logic
window.toggleChatMenu = function(e, chatId) {
  e.stopPropagation(); // Parent click roko
  
  // Pehle baaki sab menus band karo
  document.querySelectorAll('.chat-options-dropdown').forEach(el => {
    if (el.id !== `menu-${chatId}`) el.classList.remove('show');
  });

  // Current menu ko toggle karo
  const menu = document.getElementById(`menu-${chatId}`);
  if (menu) menu.classList.toggle('show');
};

// 2. Delete Logic
window.deleteChatSession = function(e, chatId) {
  e.stopPropagation();
  
  if (confirm("Are you sure you want to delete this chat?")) {
    let chats = getChats();
    chats = chats.filter(c => c.id !== chatId); // Remove chat
    saveChats(chats);
    
    // Agar current chat delete ki, to screen clear karo
    if (currentChatId === chatId) {
      currentChatId = null;
      if (messagesList) messagesList.innerHTML = '';
      if (wrapper) wrapper.classList.remove('mode-active');
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.classList.remove('mode-active');
      if (heroInput) heroInput.value = '';
    }
    
    renderChatHistory(); // List refresh
  }
};

// 3. Rename Logic
window.renameChatSession = function(e, chatId) {
  e.stopPropagation();
  
  // Menu band karo
  document.querySelectorAll('.chat-options-dropdown').forEach(el => el.classList.remove('show'));

  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  
  if (chat) {
    const newTitle = prompt("Enter new chat name:", chat.title);
    if (newTitle && newTitle.trim() !== "") {
      chat.title = newTitle.trim();
      saveChats(chats);
      renderChatHistory();
    }
  }
};

// 4. Click Outside to Close Menu (Global Listener)
document.addEventListener('click', (e) => {
  if (!e.target.closest('.chat-menu-btn')) {
    document.querySelectorAll('.chat-options-dropdown').forEach(el => {
      el.classList.remove('show');
    });
  }
});

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
   // 1. Prompt nikaalo & ENHANCE karo (Magic Trick) 🪄
      let rawPrompt = userMessage.replace(/^\/image\s*/i, '').trim();
      if (!rawPrompt) throw new Error("Please describe the image!");

      // Hum automatic kuch 'Pro Keywords' jod denge taaki quality hamesha best aaye
      const enhancedPrompt = `${rawPrompt}, cinematic lighting, 8k resolution, photorealistic, highly detailed, sharp focus, masterpiece, trending on artstation`;

      // 2. Pollinations URL (With FLUX Model) 🚀
      // &model=flux lagane se quality 10x badh jayegi
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

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
 // 👇👇👇 REPLACE THE OLD FETCH WITH THIS 👇👇👇

    // 1. Get Custom Instruction (Batman Logic) 🦇
    let systemInstruction = localStorage.getItem('systemPrompt') || "";
    
    // Batman Brain Injection 🧠
    let finalPrompt = userMessage;
    if(systemInstruction) {
        // AI ko user message se pehle instruction do
        finalPrompt = `System Instruction: ${systemInstruction}\n\nUser: ${userMessage}`;
    }

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userMessage: finalPrompt, // 🔥 Yahan humne Modified Message bheja
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

  // --- MOBILE MENU LOGIC (Paste at bottom of ai-chat.js) ---
  
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  
  // Sidebar ko dhoondo (Class check karein: .sidebar hi honi chahiye)
  const sidebar = document.querySelector('.sidebar'); 

  function toggleMenu() {
    if (!sidebar) return;
    sidebar.classList.toggle('active'); // Slide In/Out
    mobileOverlay.classList.toggle('active'); // Dark Background
  }

  function closeMenu() {
    if (!sidebar) return;
    sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
  }

  // 1. Button click par open/close
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
  
  // 2. Bahar click karne par close
  if (mobileOverlay) mobileOverlay.addEventListener('click', closeMenu);

  // 3. Jab Chat History item par click ho, tab bhi close karo
  const historyContainer = document.getElementById('chatHistoryContainer');
  if (historyContainer) {
    historyContainer.addEventListener('click', (e) => {
        // Agar mobile screen hai tabhi close karo
        if (window.innerWidth <= 768) {
            closeMenu();
        }
    });
  }
  
  // 4. New Chat button par bhi close ho
  if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
          if (window.innerWidth <= 768) closeMenu();
      });
  }
  
});

// --- SETTINGS MODAL LOGIC ---

const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// 1. Open Modal
if(settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('show');
  });
}

// 2. Close Modal
if(closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('show');
  });
}

// Close on outside click
if(settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if(e.target === settingsModal) {
      settingsModal.classList.remove('show');
    }
  });
}

// --- FEATURES ---

// A. CLEAR ALL CHATS
window.clearAllChats = function() {
  if(confirm("⚠️ WARNING: This will delete ALL your chat history permanently!\nAre you sure?")) {
    localStorage.removeItem('chatSessions'); // Delete Data
    location.reload(); // Refresh Page
  }
};

// B. EXPORT CHATS (Backup)
window.exportAllChats = function() {
  const chats = localStorage.getItem('chatSessions');
  if(!chats) {
    alert("No chats to export!");
    return;
  }
  
  // File banate hain
  const blob = new Blob([chats], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  // Download Link trigger karte hain
  const a = document.createElement('a');
  a.href = url;
  a.download = `imran-ai-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- SYSTEM PREFERENCES LOGIC ---

const systemPromptInput = document.getElementById('systemPromptInput');

// 1. Load Saved Prompt on Startup
const savedPrompt = localStorage.getItem('systemPrompt');
if (savedPrompt && systemPromptInput) {
  systemPromptInput.value = savedPrompt;
}

// 2. Save Prompt on Change (Real-time save)
if (systemPromptInput) {
  systemPromptInput.addEventListener('input', (e) => {
    localStorage.setItem('systemPrompt', e.target.value);
  });
}

   