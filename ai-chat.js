// --- CONFIG -------------------------------------------------
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://imran-square-studio.onrender.com';

// --- STATE --------------------------------------------------
let wrapper, heroInput, bottomInput, messagesList, heroSendBtn, bottomSendBtn, newChatBtn;
let currentChatId = null;

// ✅ NEW: Image handling
let heroImageData = null;
let bottomImageData = null;



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

// ---------- Messages ----------
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
      </div>`;
  } else {
    // ✅ AI Response - Parse Markdown
    const parsedContent = parseMarkdown(text);
    row.innerHTML = `
      <div class="msg-bubble">
        <div class="ai-message-content">
          ${parsedContent}
        </div>
      </div>`;
  }

  if (messagesList) {
    messagesList.appendChild(row);
    messagesList.scrollTop = messagesList.scrollHeight;

    // ✅ Highlight code blocks after adding
    if (type === 'ai') {
      row.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });

      // ✅ Add copy buttons to code blocks
      addCopyButtons(row);
    }
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

// ---------- Markdown Parser ----------
function parseMarkdown(text) {
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (e) {
          console.error('Highlight error:', e);
        }
      }
      return hljs.highlightAuto(code).value;
    }
  });

  // Custom renderer for code blocks with language labels
  const renderer = new marked.Renderer();
  const originalCode = renderer.code.bind(renderer);
  
  renderer.code = function(code, language) {
    const lang = language || 'plaintext';
    const langLabel = lang.charAt(0).toUpperCase() + lang.slice(1);
    
    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-language">${langLabel}</span>
          <button class="copy-code-btn" data-code="${escapeHtml(code)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        </div>
        ${originalCode(code, language)}
      </div>
    `;
  };

  marked.use({ renderer });

  return marked.parse(text);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------- Copy Button Handler ----------
function addCopyButtons(container) {
  container.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const code = this.getAttribute('data-code');
      const decodedCode = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");

      try {
        await navigator.clipboard.writeText(decodedCode);
        
        // Visual feedback
        const originalHTML = this.innerHTML;
        this.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        this.classList.add('copied');

        setTimeout(() => {
          this.innerHTML = originalHTML;
          this.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  });
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

// ---------- API ----------
async function sendMessage(userMessage, imageData = null) {
  if (!userMessage || !userMessage.trim()) {
    if (!imageData) return; // No text and no image
    userMessage = 'What is in this image?'; // Default question for image-only
  }

  if (!currentChatId) {
    const newChat = addChatSession(userMessage.slice(0, 30), []);
    currentChatId = newChat.id;
    renderChatHistory();
  }

  // Add user message with image if present
  if (imageData) {
    const imageHTML = `<img src="data:${imageData.mimeType};base64,${imageData.base64}" class="msg-image" style="max-width: 300px; border-radius: 8px; margin-bottom: 8px;">`;
    addMessage(imageHTML + '<br>' + userMessage, 'user', true);
  } else {
    addMessage(userMessage, 'user', true);
  }

  const typingId = showTyping();

  try {
    const model = document.getElementById('modelSelect')?.value || 'gemini-2.5-flash';

    // ✅ Vision API Call (if image present)
    if (imageData) {
      console.log('📷 Using Gemini Vision API...');
      
      const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Will use from server
      const visionUrl = `${API_BASE}/api/chat`;

      const res = await fetch(visionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          model: 'gemini-pro-vision',
          image: {
            data: imageData.base64,
            mimeType: imageData.mimeType
          }
        })
      });

      if (!res.ok) throw new Error(`Vision API error: ${res.status}`);
      const data = await res.json();

      let aiText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        data.response ||
        data.text ||
        '';

      if (!aiText || !aiText.trim()) throw new Error('Empty vision response');

      removeTyping(typingId);
      addMessage(aiText, 'ai', true);
    } else {
      // Regular text-only chat
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

      aiText = aiText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      removeTyping(typingId);
      addMessage(aiText, 'ai', true);
    }
  } catch (err) {
    console.error(err);
    removeTyping(typingId);
    addMessage(`<strong style="color:#ef4444;">Error:</strong> ${err.message}`, 'ai', true);
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

   // ✅ HERO: Enter Key
  heroInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = heroInput.value.trim();
      const imageData = heroImageData; // ✅ Ye line hai?
      
      if (text || imageData) {
        sendMessage(text, imageData);
        heroInput.value = '';
        heroInput.style.height = '24px';
        
        // Clear image after sending
        if (imageData) {
          const heroImageInput = document.getElementById('heroImageInput');
          const heroImagePreview = document.getElementById('heroImagePreview');
          clearImage('hero', heroImageInput, heroImagePreview);
        }
      }
    }
  });

  // ✅ HERO: Button Click
  heroSendBtn?.addEventListener('click', () => {
    const text = heroInput?.value.trim();
    const imageData = heroImageData; // ✅ Ye line hai?
    
    console.log('🖱️ Hero button clicked!', { text, imageData }); // ✅ Debug log
    
    if (text || imageData) {
      sendMessage(text, imageData);
      heroInput.value = '';
      heroInput.style.height = '24px';
      
      // Clear image after sending
      if (imageData) {
        const heroImageInput = document.getElementById('heroImageInput');
        const heroImagePreview = document.getElementById('heroImagePreview');
        clearImage('hero', heroImageInput, heroImagePreview);
      }
    }
  });

  // ✅ BOTTOM: Button Click (same pattern)
  bottomSendBtn?.addEventListener('click', () => {
    const text = bottomInput?.value.trim();
    const imageData = bottomImageData;
    
    console.log('🖱️ Bottom button clicked!', { text, imageData }); // ✅ Debug log
    
    if (text || imageData) {
      sendMessage(text, imageData);
      bottomInput.value = '';
      bottomInput.style.height = '24px';
      
      if (imageData) {
        const bottomImageInput = document.getElementById('bottomImageInput');
        const bottomImagePreview = document.getElementById('bottomImagePreview');
        clearImage('bottom', bottomImageInput, bottomImagePreview);
      }
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

   // ✅ NEW: Image Upload Handlers
  setupImageHandlers();

  renderChatHistory();
  console.log('✅ Neural Core ready');
});

// expose for pills
window.activateChat = prompt => {
  if (!heroInput) return;
  heroInput.value = prompt;
  heroInput.focus();
};

// ---------- Image Upload & Vision ----------
function setupImageHandlers() {
  // Hero image input
  const heroImageInput = document.getElementById('heroImageInput');
  const heroImagePreview = document.getElementById('heroImagePreview');
  const heroImagePreviewImg = document.getElementById('heroImagePreviewImg');
  const heroRemoveImage = document.getElementById('heroRemoveImage');

  // Bottom image input
  const bottomImageInput = document.getElementById('bottomImageInput');
  const bottomImagePreview = document.getElementById('bottomImagePreview');
  const bottomImagePreviewImg = document.getElementById('bottomImagePreviewImg');
  const bottomRemoveImage = document.getElementById('bottomRemoveImage');

  // Hero handlers
  if (heroImageInput) {
    heroImageInput.addEventListener('change', (e) => {
      handleImageSelect(e, 'hero', heroImagePreview, heroImagePreviewImg);
    });
  }

  if (heroRemoveImage) {
    heroRemoveImage.addEventListener('click', () => {
      clearImage('hero', heroImageInput, heroImagePreview);
    });
  }

  // Bottom handlers
  if (bottomImageInput) {
    bottomImageInput.addEventListener('change', (e) => {
      handleImageSelect(e, 'bottom', bottomImagePreview, bottomImagePreviewImg);
    });
  }

  if (bottomRemoveImage) {
    bottomRemoveImage.addEventListener('click', () => {
      clearImage('bottom', bottomImageInput, bottomImagePreview);
    });
  }
}

async function handleImageSelect(event, source, previewContainer, previewImg) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size should be less than 5MB');
    return;
  }

  try {
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    // Store image data
    if (source === 'hero') {
      heroImageData = {
        base64: base64.split(',')[1], // Remove data:image/...;base64, prefix
        mimeType: file.type
      };
    } else {
      bottomImageData = {
        base64: base64.split(',')[1],
        mimeType: file.type
      };
    }

    // Show preview
    previewImg.src = base64;
    previewContainer.style.display = 'block';

    console.log('✅ Image loaded:', file.name);
  } catch (error) {
    console.error('Image load error:', error);
    alert('Failed to load image');
  }
}

function clearImage(source, input, previewContainer) {
  if (source === 'hero') {
    heroImageData = null;
  } else {
    bottomImageData = null;
  }
  
  input.value = '';
  previewContainer.style.display = 'none';
  
  console.log('🗑️ Image removed');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

