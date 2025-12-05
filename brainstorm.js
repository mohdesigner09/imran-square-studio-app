// --- KONVA CONFIG ---
const GRID_SIZE = 30; // sirf CSS overlay ke saath consistency ke liye
const width = window.innerWidth;
const height = window.innerHeight;

const stage = new Konva.Stage({
  container: 'container',
  width: width,
  height: height,
  draggable: true
});

const linkLayer = new Konva.Layer();
const nodeLayer = new Konva.Layer();

stage.add(linkLayer);
stage.add(nodeLayer);

const tr = new Konva.Transformer({
  nodes: [],
  borderStroke: '#ff6b35',
  anchorStroke: '#ff6b35',
  anchorFill: '#000',
  anchorSize: 8,
  rotateEnabled: false,
  ignoreStroke: true
});
nodeLayer.add(tr);

// --- ZOOM STATE ---
let currentScale = 1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;
const SCALE_STEP = 1.1;

function setStageScale(newScale, center) {
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  const oldScale = currentScale;
  currentScale = newScale;

  const stagePos = stage.position();
  const mousePointTo = {
    x: (center.x - stagePos.x) / oldScale,
    y: (center.y - stagePos.y) / oldScale
  };

  const newPos = {
    x: center.x - mousePointTo.x * newScale,
    y: center.y - mousePointTo.y * newScale
  };

  stage.scale({ x: newScale, y: newScale });
  stage.position(newPos);
  stage.batchDraw();
}

// OPTIONAL: zoom buttons se call
function zoomIn() {
  const center = { x: width / 2, y: height / 2 };
  setStageScale(currentScale * SCALE_STEP, center);
}

function zoomOut() {
  const center = { x: width / 2, y: height / 2 };
  setStageScale(currentScale / SCALE_STEP, center);
}

function resetZoom() {
  currentScale = 1;
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
}

// --- SMOOTH MOUSE WHEEL ZOOM ---
const containerEl = stage.container();

containerEl.addEventListener('wheel', (e) => {
  e.preventDefault();

  const rect = containerEl.getBoundingClientRect();
  const pointer = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

  const zoomIntensity = 0.15; // chhota = smoother
  const direction = -Math.sign(e.deltaY); // up = +1, down = -1
  const scaleFactor = 1 + direction * zoomIntensity;

  const newScale = currentScale * scaleFactor;
  setStageScale(newScale, pointer);
});

// --- IMAGE UPLOAD ---
function handleImageUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    const newNode = {
      id: 'img' + Date.now(),
      styleType: 'image',
      src: ev.target.result,
      x: -stage.x() + width / 2,
      y: -stage.y() + height / 2,
      width: 200,
      height: 150
    };
    nodes.push(newNode);
    render();
  };
  r.readAsDataURL(f);
}

// --- STATE ---
let nodes = [];
let selectedId = null;
let globalLineStyle = 'bezier';
let isConnecting = false;
let connectStartId = null;
let tempLine = null;
let lastConnUpdate = 0;
const CONN_THROTTLE = 16; // ~60fps (16ms)

// --- BOARD SEARCH (title + subtitle) ---
let lastSearchQuery = '';

window.addEventListener('keydown', function (e) {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea') return;

  const key = e.key.toLowerCase();

  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault();
    if (typeof saveGraph === 'function') saveGraph();
    return;
  }

  switch (key) {
    case 'n':
      if (typeof addNoteCard === 'function') addNoteCard();
      break;
    case 'q':
      if (typeof addQACard === 'function') addQACard();
      break;
    case 'p':
      if (typeof addPracticeCard === 'function') addPracticeCard();
      break;
    case 'd':
      if (typeof addDefinitionCard === 'function') addDefinitionCard();
      break;
    case 'c':
      if (typeof addChapterPage === 'function') addChapterPage();
      break;
    case 'r':
      if (typeof startRevisionMode === 'function') startRevisionMode();
      break;
    default:
      break;
  }
});

// --- SHORTCUTS POPUP CONTROL ---
function positionShortcutMenu() {
  const popup = document.getElementById('shortcutPopup');
  const btn = document.getElementById('shortcutsBtn');
  if (!popup || !btn) return;

  const rect = btn.getBoundingClientRect();
  popup.style.top = rect.top + 'px';
  popup.style.left = (rect.right + 12) + 'px';
}

function openShortcutMenu() {
  const popup = document.getElementById('shortcutPopup');
  if (!popup) return;

  positionShortcutMenu();
  popup.classList.remove('hidden');
}

function closeShortcutMenu() {
  const popup = document.getElementById('shortcutPopup');
  if (!popup) return;
  popup.classList.add('hidden');
}


// Scroll / resize par agar popup open hai to reposition
window.addEventListener('resize', () => {
  const popup = document.getElementById('shortcutPopup');
  if (!popup || popup.classList.contains('hidden')) return;
  positionShortcutMenu();
});

document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.getElementById('sidebarScroll');
  if (!scroller) return;
  scroller.addEventListener('scroll', () => {
    const popup = document.getElementById('shortcutPopup');
    if (!popup || popup.classList.contains('hidden')) return;
    positionShortcutMenu();
  });
});

// --- SIMPLE BOARD SEARCH (ENTER TO JUMP) ---
function handleBoardSearchKey(e, value) {
  if (e.key === 'Enter') {
    jumpToSearchNode(value);
  }
}

function jumpToSearchNode(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return;

  const match = nodes.find(n => {
    const t = (n.text || '').toLowerCase();
    const s = (n.subtitle || '').toLowerCase();
    return t.includes(q) || s.includes(q);
  });

  if (!match) {
    alert('No matching node found.');
    return;
  }

  if (typeof focusOnNode === 'function') {
    focusOnNode(match.id);
  } else {
    selectNode(match.id);
  }
}


// --- MOUSE WHEEL ZOOM (SMOOTH) ---


containerEl.addEventListener('wheel', (e) => {
  e.preventDefault();

  const rect = containerEl.getBoundingClientRect();
  const pointer = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

  const zoomIntensity = 0.15; // chhota = smoother
  const direction = -Math.sign(e.deltaY); // up = +1, down = -1
  const scaleFactor = 1 + direction * zoomIntensity;

  const newScale = currentScale * scaleFactor;
  setStageScale(newScale, pointer);
});


// --- HISTORY (UNDO / REDO) ---
let history = [];
let future  = [];
const HISTORY_LIMIT = 50;

function cloneNodes(arr) {
  return JSON.parse(JSON.stringify(arr));
}

function pushHistory() {
  history.push(cloneNodes(nodes));
  if (history.length > HISTORY_LIMIT) history.shift();
  future = []; // new action ke baad redo clear
}


// --- PER-PROJECT AUTOSAVE (localStorage) ---
function getProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || 'default';
}

function getStorageKey() {
  return 'brainmap_v2_' + getProjectId();
}

// --- CONNECTIONS (ensure ye upar hi ho) ---
function updateConnections() {
  linkLayer.destroyChildren();

  nodes.forEach(child => {
    if (!child.parentId) return;
    const parent = nodes.find(p => p.id === child.parentId);
    if (!parent) return;

    const pW = parent.width || 200;
    const pH = parent.height || (parent.styleType === 'section-dashed' ? 300 : 100);
    const cW = child.width || 200;
    const cH = child.height || (child.styleType === 'section-dashed' ? 300 : 100);

    let pX, pY, cX, cY;

    if (child.x > parent.x) {
      pX = parent.x + pW;
      pY = parent.y + pH / 2;
      cX = child.x;
      cY = child.y + cH / 2;
    } else {
      pX = parent.x;
      pY = parent.y + pH / 2;
      cX = child.x + cW;
      cY = child.y + cH / 2;
    }

    const dist = Math.abs(cX - pX) * 0.5;

    let cp1x, cp1y, cp2x, cp2y;
    if (child.x > parent.x) {
      cp1x = pX + dist;
      cp1y = pY;
      cp2x = cX - dist;
      cp2y = cY;
    } else {
      cp1x = pX - dist;
      cp1y = pY;
      cp2x = cX + dist;
      cp2y = cY;
    }

    const pathData = `M${pX} ${pY} C${cp1x} ${pY} ${cp2x} ${cY} ${cX} ${cY}`;

    const line = new Konva.Path({
      data: pathData,
      stroke: child.color || '#555',
      strokeWidth: 3,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.8,
      listening: false
    });

    linkLayer.add(line);
  });

  linkLayer.batchDraw();
}

// --- NODE CREATION (MAIN ENTRY) ---

// --- NODE CREATION (MAIN ENTRY) ---
function addNode(style, parentId = null) {
  let x = -stage.x() + width / 2 - 100;
  let y = -stage.y() + height / 2 - 50;

  // Agar explicit parent diya hai (child add from menu / toolbar)
  if (parentId) {
    const p = nodes.find(n => n.id === parentId);
    if (p) {
      x = p.x + (p.width || 200) + 100;
      y = p.y + (Math.random() * 100 - 50);
    }
  } else if (selectedId && !style.includes('section')) {
    // Agar koi node selected hai aur normal node add kar rahe ho,
    // to usko bhi parent treat karo (mind‑map feel)
    const p = nodes.find(n => n.id === selectedId);
    if (p) {
      parentId = selectedId;
      x = p.x + (p.width || 200) + 100;
      y = p.y + (Math.random() * 100 - 50);
    }
  }

  // Study‑friendly defaults per style
  let text = 'New Node';
  let subtitle = 'Description';
  let color = '#ff6b35';
  let widthVal = 200;
  let heightVal = undefined;

  if (style === 'section-dashed') {
    text = 'Chapter title';
    subtitle = 'Brief overview of this chapter';
    widthVal = 400;
    heightVal = 300;
  } else if (style === 'card-modern') {
    text = 'Note title';
    subtitle = 'Key points or summary';
  } else if (style === 'minimal') {
    text = 'Definition';
    subtitle = 'Explain in 1–2 lines';
  } else if (style === 'sticky') {
    text = 'Question';
    subtitle = 'Write the answer here';
  } else if (style === 'kanban') {
    text = 'Practice question';
    subtitle = 'Try to solve, then add solution';
  }

  const newNode = {
    id: 'n' + Date.now(),
    styleType: style,
    x,
    y,
    text,
    subtitle,
    color,
    parentId,
    width: widthVal,
    height: heightVal
  };

  nodes.push(newNode);
  selectedId = newNode.id;
  render();
  saveGraph();

  const popup = document.getElementById('node-popup');
  if (popup) popup.style.display = 'none';
}

// Study-focused shortcuts (sidebar buttons se call honge)
function addChapterPage() {
  addNode('section-dashed');
}

function addNoteCard() {
  addNode('card-modern');
}

function addDefinitionCard() {
  addNode('minimal');
}

function addQACard() {
  addNode('sticky');
}

function addPracticeCard() {
  addNode('kanban');
}

function addReferenceCard() {
  const nodeId = 'n' + Date.now();
  const base = {
    id: nodeId,
    styleType: 'card-modern',
    x: -stage.x() + width / 2 - 100,
    y: -stage.y() + height / 2 - 50,
    text: 'Reference link',
    subtitle: 'Paste URL in notes',
    color: '#0ea5e9',
    width: 220
  };
  nodes.push(base);
  selectedId = nodeId;
  render();
  saveGraph();
}

// Toolbar helper (child node)
function addChildNode() {
  if (selectedId) addNode('card-modern', selectedId);
}

// Selection sirf yahan se control karo
function selectNode(id) {
  selectedId = id;

  const node = nodes.find(n => n.id === id);
  const panel = document.getElementById('propPanel');
  const content = document.getElementById('propContent');
  const title = document.getElementById('propTitle');

  if (node && panel && content) {
    panel.classList.remove('translate-x-full');
    if (title) title.innerText = 'PROPERTIES';

    content.innerHTML = `
      <div class="mb-4 border-b border-[#222] pb-4">
        <label class="text-[10px] text-gray-500 font-bold uppercase block mb-1">Title</label>
        <input class="input-dark mb-3"
               value="${node.text || ''}"
               oninput="updateProp('text', this.value)" />

        <label class="text-[10px] text-gray-500 font-bold uppercase block mb-1">Subtitle</label>
        <input class="input-dark"
               value="${node.subtitle || ''}"
               oninput="updateProp('subtitle', this.value)" />
      </div>

      <div class="mb-4 border-b border-[#222] pb-4">
        <label class="text-[10px] text-gray-500 font-bold uppercase block mb-2">Color</label>
        <div class="flex gap-2 mb-4">
          ${['#ff6b35','#3b82f6','#10b981','#a855f7','#eab308','#ffffff']
            .map(c => `
              <div onclick="updateProp('color','${c}')"
                   class="w-5 h-5 rounded-md cursor-pointer"
                   style="
                     background:${c};
                     border:${node.color === c ? '2px solid white' : '1px solid #333'};
                   ">
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  render();
}


// Toolbar helper (agar already nahi hai to)
// Study-focused shortcuts (sidebar buttons se call honge)
function addChapterPage() {
  // Bada section node, chapter layout ke liye
  addNode('section-dashed');
}

function addNoteCard() {
  // Normal note card
  addNode('card-modern');
}

function addDefinitionCard() {
  // Compact formula / definition style
  addNode('minimal');
}

function addQACard() {
  // Q top, A subtitle me
  addNode('sticky');
}

function addPracticeCard() {
  // Practice question / example
  addNode('kanban');
}

function addReferenceCard() {
  // External link / reference bookmark
  const nodeId = 'n' + Date.now();
  const base = {
    id: nodeId,
    styleType: 'card-modern',
    x: -stage.x() + width / 2 - 100,
    y: -stage.y() + height / 2 - 50,
    text: 'Reference link',
    subtitle: 'Paste URL in notes',
    color: '#0ea5e9',
    width: 220
  };
  nodes.push(base);
  selectedId = nodeId;
  render();
  saveGraph();
}

// --- CHAPTER OUTLINE (sidebar list) ---
function refreshOutline() {
  const wrap = document.getElementById('chapterOutline');
  if (!wrap) return;

  const chapters = nodes.filter(n => n.styleType === 'section-dashed');
  if (!chapters.length) {
    wrap.innerHTML = '<div class="px-2 py-1 text-gray-500 text-[11px]">No chapters yet.</div>';
    return;
  }

  wrap.innerHTML = chapters.map((ch, idx) => `
    <button
      onclick="focusOnNode('${ch.id}')"
      class="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#15151b] text-gray-300 flex items-center gap-2 text-[12px]">
      <span class="w-1.5 h-1.5 rounded-full"
            style="background:${ch.color || '#f97316'}"></span>
      <span class="truncate">${idx + 1}. ${ch.text || 'Chapter'}</span>
    </button>
  `).join('');
}

// Stage ko given node par center karo
function focusOnNode(id) {
  const node = nodes.find(n => n.id === id);
  if (!node) return;

  const scale = currentScale || 1;
  const centerX = width / 2;
  const centerY = height / 2;

  const targetX = -node.x * scale + centerX - (node.width || 200) * scale / 2;
  const targetY = -node.y * scale + centerY - (node.height || 100) * scale / 2;

  stage.position({ x: targetX, y: targetY });
  stage.batchDraw();

  selectNode(id);
}



// --- RENDER (FINAL VERSION) ---

function render() {
  renderNodesOnly();
  updateConnections();
  nodeLayer.batchDraw();

  if (typeof updateToolbarPosition === 'function') {
    updateToolbarPosition();
  }
  if (typeof refreshOutline === 'function') {
    refreshOutline();
  }
  if (typeof highlightSearchMatches === 'function') {
    highlightSearchMatches();
  }
}



// Sirf nodes + transformer redraw (lines touch nahi)
function renderNodesOnly() {
  nodeLayer.find('.node-group').forEach(group => group.destroy());
  nodes.forEach(n => nodeLayer.add(createNodeVisual(n)));

  const g = selectedId ? nodeLayer.findOne('#' + selectedId) : null;
  if (g) tr.nodes([g]); else tr.nodes([]);
}


function loadGraph() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) {
      addNode('card-modern');
      return;
    }
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      nodes = arr;
      render();
    }
  } catch (e) {
    console.warn('Brain map load failed', e);
  }
}

// Prop change + autosave
function updateProp(key, value) {
  if (!selectedId) return;
  const n = nodes.find(n => n.id === selectedId);
  if (!n) return;

  n[key] = value;
  renderNodesOnly();   // full render nahi
  saveGraph();
}


// Delete node helper
function deleteNode() {
  if (!selectedId) return;
  nodes = nodes.filter(n => n.id !== selectedId);
  selectedId = null;
  saveGraph();
  deselect();
}

// Deselect panel + selection
function deselect() {
  selectedId = null;
  tr.nodes([]);

  const panel = document.getElementById('propPanel');
  if (panel) panel.classList.add('translate-x-full');

  render();
}

// --- FLOATING TOOLBAR LOGIC ---
function updateToolbarPosition() {
  const toolbar = document.getElementById('floating-toolbar');
  if (!toolbar) return;

  if (!selectedId) {
    toolbar.classList.remove('visible');
    toolbar.classList.add('hidden');
    return;
  }

  const node = nodeLayer.findOne('#' + selectedId);
  const nodeData = nodes.find(n => n.id === selectedId);

  if (!node || !nodeData) {
    toolbar.classList.remove('visible');
    toolbar.classList.add('hidden');
    return;
  }

  const nodePos = node.getAbsolutePosition();
  const containerRect = stage.container().getBoundingClientRect();
  const scale = stage.scaleX();
  const nodeWidth = (nodeData.width || 200) * scale;

  const top = containerRect.top + nodePos.y;
  const left = containerRect.left + nodePos.x + nodeWidth / 2;

  toolbar.style.top = `${top}px`;
  toolbar.style.left = `${left}px`;

  toolbar.classList.remove('hidden');
  toolbar.classList.add('visible');
}

// Quick color helper (toolbar)
function quickColor(c) {
  updateProp('color', c);
}



function saveGraph() {
  try {
    pushHistory();
    localStorage.setItem(getStorageKey(), JSON.stringify(nodes));
  } catch (e) {
    console.warn('Brain map save failed', e);
  }
}




// --- POPUP TOGGLE ---
function togglePopup(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
  }
}

// --- STAGE EVENTS (connection drag + background click) ---
stage.on('mousemove', () => {
  if (!isConnecting || !tempLine) return;

  const pos = stage.getPointerPosition();
  if (!pos) return;

  const stagePos = stage.position();
  const scale    = stage.scaleX();

  const x = (pos.x - stagePos.x) / scale;
  const y = (pos.y - stagePos.y) / scale;

  const pts = tempLine.points();
  tempLine.points([pts[0], pts[1], x, y]); // sirf end point update
  linkLayer.batchDraw();
});

stage.on('mouseup', () => {
  // Agar mouse kisi node ke upar nahi chhoda gaya, to connection cancel
  if (isConnecting) {
    isConnecting   = false;
    connectStartId = null;

    if (tempLine) {
      tempLine.destroy();
      tempLine = null;
    }

    // saare nodes ko dobara draggable bana do (safety)
    nodeLayer.find('.node-group').forEach((g) => g.draggable(true));
    linkLayer.batchDraw();
  }
});

// Background click = deselect
stage.on('click tap', (e) => {
  if (e.target === stage) deselect();
});

stage.on('wheel', (e) => {
  e.evt.preventDefault();

  // Normal scroll = pan, Ctrl+scroll = zoom
  if (!e.evt.ctrlKey) return;

  const scaleBy = SCALE_STEP;
  const oldScale = currentScale;
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

  setStageScale(newScale, pointer);
});





// --- UPDATED VISUAL FACTORY (CLICK TO GLOW ONLY) ---
function createNodeVisual(n) {
    const group = new Konva.Group({ 
        x: n.x, 
        y: n.y, 
        id: n.id, 
        draggable: true,
        name: 'node-group' 
    });

    const isSelected = selectedId === n.id;
    const color = n.color || '#ff6b35';
    const w = n.width || 200;

    // --- GLOW SETTINGS (Jab Click Hoga Tab Apply Hoga) ---
    // Agar selected hai to Node ka Color use karo glow ke liye, nahi to Black shadow
    const glowColor = isSelected ? color : 'black'; 
    const glowBlur = isSelected ? 30 : 10;          // Select hone par zyada blur (Glow)
    const glowOpacity = isSelected ? 0.6 : 0.3;     // Select hone par zyada bright
    const strokeW = isSelected ? 2 : 1;             // Border bhi thoda mota

    // --- 1. MODERN CARD ---
    if (n.styleType === 'card-modern') {
        const h = 100, headH = 8;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#141414', cornerRadius: 8, 
            stroke: isSelected ? color : '#333', strokeWidth: strokeW, 
            shadowColor: glowColor, shadowBlur: glowBlur, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        const header = new Konva.Rect({ width: w, height: headH, fill: color, cornerRadius:[8,8,0,0] });
        const title = new Konva.Text({ x: 15, y: 20, text: n.text, fontSize: 14, fontStyle:'bold', fill:'white', width:w-30, name:'text' });
        const sub = new Konva.Text({ x: 15, y: 45, text: n.subtitle||'Details...', fontSize:11, fill:'#666', width:w-30 });
        group.add(bg, header, title, sub);
    
    // --- 2. MINIMAL ---
    } else if (n.styleType === 'minimal') {
        const h = 50;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#000', 
            stroke: color, strokeWidth: strokeW, cornerRadius: 4, 
            shadowColor: glowColor, shadowBlur: isSelected ? 20 : 0, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        const title = new Konva.Text({ x: 10, y: 18, text: n.text, fontSize: 14, fill:'white', width:w-20, align:'center', name:'text' });
        group.add(bg, title);

    // --- 3. STICKY NOTE ---
    } else if (n.styleType === 'sticky') {
        const h = w; 
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#fef3c7', 
            stroke: isSelected ? 'white' : 'transparent', strokeWidth: strokeW, 
            shadowColor: 'black', shadowBlur: 15, shadowOpacity: 0.2, // Sticky ka glow simple rakha hai
            name: 'bg' 
        });
        const title = new Konva.Text({ x: 15, y: 20, text: n.text, fontSize: 16, fill:'#000', fontFamily:'Inter', width:w-30, name:'text' });
        group.add(bg, title);

    // --- 4. KANBAN ---
    } else if (n.styleType === 'kanban') {
        const h = 90;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#1a1a1a', 
            stroke: isSelected ? color : '#333', strokeWidth: 1, cornerRadius: 6,
            shadowColor: glowColor, shadowBlur: glowBlur, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        const tag = new Konva.Rect({ x: 15, y: 15, width: 60, height: 6, fill: color, cornerRadius: 3 });
        const title = new Konva.Text({ x: 15, y: 35, text: n.text, fontSize: 13, fill:'white', width:w-30, name:'text' });
        const meta = new Konva.Text({ x: 15, y: 65, text: 'TASK', fontSize: 10, fill:'#555' });
        group.add(bg, tag, title, meta);

    // --- 5. PROFILE ---
    } else if (n.styleType === 'profile') {
        const h = 70;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#111', 
            stroke: isSelected ? color : '#222', strokeWidth: strokeW, cornerRadius: 35, 
            shadowColor: glowColor, shadowBlur: glowBlur, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        const avatar = new Konva.Circle({ x: 35, y: 35, radius: 20, fill: '#333' });
        const title = new Konva.Text({ x: 65, y: 20, text: n.text, fontSize: 14, fontStyle:'bold', fill:'white', name:'text' });
        const role = new Konva.Text({ x: 65, y: 38, text: n.subtitle||'Role', fontSize: 11, fill: color });
        group.add(bg, avatar, title, role);

    // --- 6. CHECKLIST ---
    } else if (n.styleType === 'checklist') {
        const h = 100;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#1a1a1a', 
            stroke: isSelected ? color : '#333', strokeWidth: 1, cornerRadius: 6,
            shadowColor: glowColor, shadowBlur: glowBlur, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        const title = new Konva.Text({ x: 15, y: 15, text: n.text, fontSize: 14, fontStyle:'bold', fill:'white', name:'text' });
        const box1 = new Konva.Rect({ x: 15, y: 45, width: 12, height: 12, stroke: '#555', strokeWidth:1 });
        const line1 = new Konva.Rect({ x: 35, y: 48, width: w-50, height: 6, fill: '#333', cornerRadius:2 });
        group.add(bg, title, box1, line1);

    // --- 7. TERMINAL ---
    } else if (n.styleType === 'terminal') {
        const h = 80;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#0d1117', 
            stroke: isSelected ? color : '#30363d', strokeWidth: 1, cornerRadius: 6,
            shadowColor: glowColor, shadowBlur: glowBlur, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        const dot1 = new Konva.Circle({ x: 15, y: 12, radius: 3, fill: '#ff5f56' });
        const code = new Konva.Text({ x: 15, y: 30, text: '> ' + n.text, fontFamily: 'monospace', fontSize: 12, fill: '#58a6ff', name:'text' });
        group.add(bg, dot1, code);

    // --- 8. DECISION ---
    } else if (n.styleType === 'decision') {
        const size = 100;
        const bg = new Konva.Rect({ 
            width: size, height: size, fill: '#141414', 
            stroke: color, strokeWidth: 2, rotation: 45, cornerRadius: 4, 
            shadowColor: glowColor, shadowBlur: isSelected ? 25 : 0, shadowOpacity: glowOpacity,
            name: 'bg' 
        });
        group.add(bg);
        const text = new Konva.Text({ text: n.text, fontSize: 12, fill: 'white', width: 100, align: 'center', x: -35, y: 35, name:'text' });
        bg.x(0); bg.y(-70);
        group.add(text);

    // --- 9. ALERT ---
    } else if (n.styleType === 'alert') {
        const h = 60;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#2a0a0a', 
            stroke: '#ef4444', strokeWidth: isSelected?2:1, cornerRadius: 4,
            shadowColor: isSelected ? '#ef4444' : 'transparent', shadowBlur: glowBlur,
            name: 'bg' 
        });
        const icon = new Konva.Text({ x: 15, y: 20, text: '⚠️', fontSize: 18 });
        const title = new Konva.Text({ x: 45, y: 22, text: n.text.toUpperCase(), fontSize: 12, fontStyle:'bold', fill:'#ef4444', name:'text' });
        group.add(bg, icon, title);

    // --- 10. MILESTONE ---
    } else if (n.styleType === 'milestone') {
        const h = 40;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#141414', 
            stroke: color, strokeWidth: isSelected?2:1, cornerRadius: 20,
            shadowColor: glowColor, shadowBlur: glowBlur,
            name: 'bg' 
        });
        const title = new Konva.Text({ x: 0, y: 13, text: n.text, fontSize: 12, fill:'white', width: w, align:'center', name:'text' });
        group.add(bg, title);

    // --- 11. FILE ---
    } else if (n.styleType === 'file') {
        const h = 70;
        const bg = new Konva.Rect({ 
            width: w, height: h, fill: '#1a1a1a', 
            stroke: isSelected?color:'#333', strokeWidth: isSelected?2:1, cornerRadius: 4, 
            shadowColor: glowColor, shadowBlur: glowBlur,
            name: 'bg' 
        });
        const fold = new Konva.Line({ points: [w-20, 0, w, 20, w-20, 20, w-20, 0], fill: '#333', closed: true });
        const title = new Konva.Text({ x: 15, y: 25, text: n.text, fontSize: 13, fill:'#ccc', name:'text' });
        const ext = new Konva.Text({ x: 15, y: 45, text: 'DOC', fontSize: 10, fontStyle:'bold', fill: color });
        group.add(bg, fold, title, ext);

    // --- 12. SECTION ---
    } else if (n.styleType === 'section-dashed') {
        const bg = new Konva.Rect({ 
            width: 400, height: 300, fill: 'rgba(255,255,255,0.02)', 
            stroke: isSelected ? color : '#444', strokeWidth: 2, dash:[10,10], cornerRadius: 12,
            name: 'bg' 
        });
        const label = new Konva.Text({ x: 0, y: -25, text: n.text.toUpperCase(), fontSize: 14, fontStyle:'bold', fill:'#888', letterSpacing:2, name:'text' });
        group.add(bg, label);
    
    // --- OTHERS ---
    } else if (n.styleType === 'shape') {
        const size = 100;
        let shape;
        const props = { fill: n.fill||'#1a1a1a', stroke: color, strokeWidth: 2, name:'bg', shadowColor: glowColor, shadowBlur: isSelected ? 25 : 0 };
        if (n.shapeType === 'circle') shape = new Konva.Circle({ radius: size/2, ...props });
        else shape = new Konva.Rect({ width: size, height: size, cornerRadius:4, offsetX:size/2, offsetY:size/2, ...props });
        group.add(shape);
        group.on('dblclick', () => { n.styleType='minimal'; n.text='Converted'; render(); });

    } else if (n.styleType === 'image') {
        const imgObj = new Image(); imgObj.src = n.src;
        const kImg = new Konva.Image({ image: imgObj, width: w, height: n.height||150, stroke: isSelected?color:'transparent', strokeWidth:2, shadowColor: glowColor, shadowBlur: isSelected?20:0, name: 'bg' });
        group.add(kImg); imgObj.onload = () => nodeLayer.batchDraw();
    } else {
        const bg = new Konva.Rect({ width: w, height: 60, fill: '#111', stroke: '#555', cornerRadius: 6, name:'bg' });
        const title = new Konva.Text({ x: 10, y: 20, text: n.text, fontSize: 12, fill:'white', name:'text' });
        group.add(bg, title);
    }

   // --- EVENTS (Cleaned Up - No Hover Glow) ---
// Cursor change only
group.on('mouseover', () => document.body.style.cursor = 'pointer');
group.on('mouseout', () => document.body.style.cursor = 'default');


group.on('dragmove', () => {
  const node = nodes.find(x => x.id === n.id);
  if (node) {
    node.x = group.x();
    node.y = group.y();
  }

  const now = performance.now();
  if (now - lastConnUpdate > CONN_THROTTLE) {
    lastConnUpdate = now;
    updateConnections();
  }
});


group.on('dragend', () => {
  const node = nodes.find(x => x.id === n.id);
  if (node) {
    const snappedX = Math.round(group.x() / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(group.y() / GRID_SIZE) * GRID_SIZE;
    group.position({ x: snappedX, y: snappedY });
    node.x = snappedX;
    node.y = snappedY;
  }

  isDragging = false;
  updateConnections();
  nodeLayer.batchDraw();
  saveGraph();
});

// NOTE: yahan "click tap" wala purana handler nahi hoga
group.on('mouseup touchend', (e) => {
  e.cancelBubble = true;
  if (isConnecting) return;
  selectNode(n.id);
});

group.on('dblclick', (e) => {
  e.cancelBubble = true;
  handleTextEdit(e, n);
});

group.on('mousedown', (e) => {
  if (e.evt.shiftKey) {
    isConnecting = true;
    connectStartId = n.id;
    group.draggable(false);

    const pos = stage.getPointerPosition();
    const stagePos = stage.position();
    const scale = stage.scaleX();

    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    tempLine = new Konva.Line({
      points: [group.x() + 100, group.y() + 50, x, y],
      stroke: '#ff6b35',
      strokeWidth: 2,
      dash: [10, 5],
    });
    linkLayer.add(tempLine);
  }
});

group.on('mouseup', (e) => {
  if (isConnecting && connectStartId && connectStartId !== n.id) {
    const child = nodes.find(child => child.id === n.id);
    if (child) child.parentId = connectStartId;

    updateConnections();
    isConnecting = false;
    connectStartId = null;
    if (tempLine) tempLine.destroy();
    group.draggable(true);
    linkLayer.batchDraw();
  }
});

group.on('contextmenu', (e) => {
  showContextMenu(e, n.id);
});

return group;
}



    // --- TEXT EDIT ---
    function handleTextEdit(e, nodeData) {
        const group = e.target.getParent();
        const textNode = group.findOne('.text');
        if (!textNode) return;

        textNode.hide();
        nodeLayer.batchDraw();

        const textPosition = textNode.getAbsolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const areaPosition = { x: stageBox.left + textPosition.x, y: stageBox.top + textPosition.y };

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.value = textNode.text();
        textarea.style.position = 'absolute';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = textNode.width() + 'px';
        textarea.style.height = (textNode.height() + 20) + 'px';
        textarea.style.fontSize = (textNode.fontSize() * stage.scaleX()) + 'px';
        textarea.style.border = '1px solid #ff6b35';
        textarea.style.background = '#000';
        textarea.style.color = '#fff';
        textarea.style.zIndex = '100000'; // High Z-Index
        textarea.focus();

        function removeTextarea() {
            if(!textarea.parentNode) return;
            textarea.parentNode.removeChild(textarea);
            textNode.show();
            textNode.text(textarea.value);
            const n = nodes.find(x => x.id === nodeData.id);
            if(n) n.text = textarea.value;
            nodeLayer.batchDraw();
            saveGraph();

        }

        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) removeTextarea();
        });
        textarea.addEventListener('blur', removeTextarea);
    }








function setLineStyle(s) {
  globalLineStyle = s;
  render();
}

function undo() {
  if (!history.length) return;
  const current = cloneNodes(nodes);
  future.push(current);
  nodes = history.pop();
  selectedId = null;
  render();
}

function redo() {
  if (!future.length) return;
  const current = cloneNodes(nodes);
  history.push(current);
  nodes = future.pop();
  selectedId = null;
  render();
}

    


// --- RIGHT CLICK MENU LOGIC ---
    let contextTargetId = null;

    function showContextMenu(e, id) {
        e.evt.preventDefault();
        contextTargetId = id;
        selectNode(id);
        
        const menu = document.getElementById('right-click-menu');
        const containerRect = stage.container().getBoundingClientRect();
        
        // Position menu near mouse
        menu.style.display = 'block';
        menu.style.top = (containerRect.top + stage.getPointerPosition().y + 5) + 'px';
        menu.style.left = (containerRect.left + stage.getPointerPosition().x + 5) + 'px';
    }

    function addChildFromMenu(styleType) {
        if (contextTargetId) {
            // Parent ke right side me add karo
            addNode(styleType, contextTargetId);
            document.getElementById('right-click-menu').style.display = 'none';
        }
    }



    // Hide menu on click anywhere else
    window.addEventListener('click', (e) => {
        const menu = document.getElementById('right-click-menu');
        // Agar click menu ke andar nahi hai to band karo
        if (!e.target.closest('#right-click-menu')) {
            menu.style.display = 'none';
        }
    });

    window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  }
});

function triggerRename() {
  if (!selectedId) return;

  const node = nodes.find(n => n.id === selectedId);
  if (!node) return;

  const panel = document.getElementById('propPanel');
  const content = document.getElementById('propContent');
  if (!panel || !content) return;

  const inputs = content.querySelectorAll('input.input-dark');
  if (!inputs.length) return;

  const current = document.activeElement;
  if (current === inputs[0] && inputs[1]) {
    inputs[1].focus();
    inputs[1].select();
  } else if (current === inputs[1]) {
    current.blur();
    saveGraph();
  } else {
    inputs[0].focus();
    inputs[0].select();
  }
}








    function triggerDelete() {
        if(contextTargetId) {
            selectedId = contextTargetId;
            deleteNode();
            document.getElementById('right-click-menu').style.display = 'none';
        }
    }


function duplicateNode() {
  if (!selectedId) return;
  const base = nodes.find(n => n.id === selectedId);
  if (!base) return;

  const copy = {
    ...base,
    id: 'n' + Date.now(),
    x: base.x + 40,
    y: base.y + 40
  };

  nodes.push(copy);
  selectedId = copy.id;
  render();
  saveGraph();
}

// View controls (sidebar buttons)
function toggleCurvedFlow() {
  globalLineStyle = globalLineStyle === 'bezier' ? 'straight' : 'bezier';
  updateConnections();
}

function toggleGridView() {
  // Simple toggle: background grid on/off
  const gridToggle = document.body.dataset.gridToggle === 'off' ? 'on' : 'off';
  document.body.dataset.gridToggle = gridToggle;
  if (gridToggle === 'off') {
    bgLayer.visible(false);
  } else {
    bgLayer.visible(true);
    drawGrid();
  }
  bgLayer.batchDraw();
}

// Simple placeholder for study session
function startRevisionMode() {
  alert('Revision mode (flashcards from Q&A cards) coming soon.');
}

// Design tools (left sidebar)
function openNodeStylePicker() {
  const popup = document.getElementById('node-popup');
  if (popup) popup.style.display = 'block';
}


// --- REVISION MODE (Q&A + Practice cards) ---
let revisionCards = [];
let revisionIndex = 0;

function collectRevisionCards() {
  // sticky = Q&A, kanban = practice
  return nodes.filter(n =>
    n.styleType === 'sticky' || n.styleType === 'kanban'
  );
}

function startRevisionMode() {
  revisionCards = collectRevisionCards();
  if (!revisionCards.length) {
    alert('Revision ke liye pehle Q & A ya Practice cards banao.');
    return;
  }
  revisionIndex = 0;
  document.getElementById('revisionModal').classList.remove('hidden');
  document.getElementById('revisionModal').classList.add('flex');
  loadRevisionCard();
}

function closeRevisionMode() {
  const modal = document.getElementById('revisionModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function loadRevisionCard() {
  if (!revisionCards.length) return;

  const card = revisionCards[revisionIndex];
  const qEl = document.getElementById('revisionQuestion');
  const aEl = document.getElementById('revisionAnswer');
  const btn = document.getElementById('revisionShowBtn');

  qEl.textContent = card.text || '(No question)';
  aEl.textContent = 'Hidden. Click "Show answer".';
  aEl.classList.add('opacity-50', 'italic');
  btn.textContent = 'Show answer';
}

function revealRevisionAnswer() {
  if (!revisionCards.length) return;
  const card = revisionCards[revisionIndex];
  const aEl = document.getElementById('revisionAnswer');
  const btn = document.getElementById('revisionShowBtn');

  aEl.textContent = card.subtitle || '(No answer yet)';
  aEl.classList.remove('opacity-50', 'italic');
  btn.textContent = 'Hide answer';
}

function nextRevisionCard() {
  if (!revisionCards.length) return;
  revisionIndex = (revisionIndex + 1) % revisionCards.length;
  loadRevisionCard();
}

function prevRevisionCard() {
  if (!revisionCards.length) return;
  revisionIndex = (revisionIndex - 1 + revisionCards.length) % revisionCards.length;
  loadRevisionCard();
}


function addShapeNode() {
  // Filhaal normal card ko shape ki tarah treat karte hain
  addNode('card-modern');
}


// On load, try to restore existing map
loadGraph();
