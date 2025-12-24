// ==========================================
// 🔑 CONFIGURATION
// ==========================================

// ✅ IS KEY KO TRY KAREIN (Ye aapke index.html me thi aur working thi)
const API_KEY = "AIzaSyA_D3AuwSzHKgs5svcwRoP0St2Nc-delF8"; 

// 2. CLIENT ID
const CLIENT_ID = "364132092578-tphp4i883gt7foep5cgaf226ivn45jmc.apps.googleusercontent.com";

// 3. VAULT IDs
const VAULT_ID = "1nAz-SdoS9vu3748RgKvIvMU8JZWSz4dt"; 
const FOOTAGE_FOLDER_ID = "1nAz-SdoS9vu3748RgKvIvMU8JZWSz4dt"; 

// 4. Scopes
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// 5. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA_D3AuwSzHKgs5svcwRoP0St2Nc-delF8", // Ab ye delF8 wali key use karega
  authDomain: "iimransquare.firebaseapp.com",
  projectId: "iimransquare",
  storageBucket: "iimransquare.firebasestorage.app",
  messagingSenderId: "431645042472", 
  appId: "1:431645042472:web:87e7cea4659d6a0564121d"
};

console.log("✅ Config Loaded with CORRECT Key (delF8)");

// ... Iske neeche ka code waisa hi rehne dein ...

// 5. Initialize Firebase (Safety Check)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized!");
}

// 6. Global Variables Export
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

window.db = db;
window.auth = auth;
window.firebase = firebase;

// 7. Server URL
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://imran-square-studio.onrender.com';

console.log("✅ Config Loaded Successfully");

// ... ISKE NEECHE AAPKA BAAKI CODE HONA CHAHIYE ...

/// ===== AUTH & CURRENT USER SETUP =====
const RAWUSER = localStorage.getItem('imranUser');
const CURRENTUSER = RAWUSER ? JSON.parse(RAWUSER) : null;
window.CURRENTUSER = CURRENTUSER;   // ✅ ye line zaroor honi chahiye

// Admin config (all allowed admin emails)
const ADMINEMAILS = [
  'aqlorium@gmail.com',       // current logged-in user (tum)
  'mohdesigner09@gmail.com'   // main webapp admin
];

// Global admin flag
const ISADMIN = CURRENTUSER && ADMINEMAILS.includes(CURRENTUSER.email);
window.ADMINEMAILS = ADMINEMAILS;
window.ISADMIN = ISADMIN;

let VIEW_MODE = 'my'; // 'my' | 'all'// Global defaults

window.VIEW_MODE = VIEW_MODE;

function showDashToast(msg, timeout = 3000) {
  const el = document.getElementById('dashToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window.__dashToastTimer);
  window.__dashToastTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, timeout);
}



// Welcome toast once per fresh login
(function () {
  try {
    const flag = localStorage.getItem('imranWelcome');
    if (!flag || !CURRENTUSER) return;

    const name =
      (CURRENTUSER.firstName && CURRENTUSER.firstName.trim()) ||
      CURRENTUSER.username ||
      'there';

    showDashToast(`Welcome back, ${name}`);
    localStorage.removeItem('imranWelcome');
  } catch (e) {
    console.warn('Welcome toast failed', e);
  }
})();



// ---- Name helper (GLOBAL, shared by all pages that include main.js) ----
function getImranFullName(user) {
  if (!user) return 'Guest';
  const first = (user.firstName || '').trim();
  const last  = (user.lastName || '').trim();
  const full  = (first + ' ' + last).trim();
  return full || (user.name || 'Guest');
}


// --- DATA SETUP ---
const defaultProjects = [
  {
    id: 'p1',
    title: 'imran bro',
    genre: 'Film Noir',
    chapters: 3,
    progress: 75,
    words: '2.4K',
    readTime: '45min',
    ownerEmail: 'aqlorium@gmail.com',
    ownerName: 'Imran Square',
    sections: createSections()
  },
  {
    id: 'p2',
    title: 'Midnight City Chronicles',
    genre: 'Sci-Fi',
    chapters: 5,
    progress: 45,
    words: '3.1K',
    readTime: '62min',
    ownerEmail: 'mohdesigner09@gmail.com',
    ownerName: 'Moh Designer',
    sections: createSections()
  },
  {
    id: 'p3',
    title: 'Urban Legends',
    genre: 'Thriller',
    chapters: 2,
    progress: 90,
    words: '1.8K',
    readTime: '32min',
    ownerEmail: 'mohdesigner09@gmail.com',
    ownerName: 'Moh Designer',
    sections: createSections()
  }
];


const defaultFootage = [];
const defaultFilters = [
  { id: 'f1', name: 'All Videos', type: 'all' },
  { id: 'f2', name: 'Recent Updates', type: 'recent' },
  { id: 'f3', name: 'Midnight City', type: 'custom' }
];

function createSections() {
  return [
    { name: "Characters", scripts: [] },
    { name: "Act 1 - Setup", scripts: [] },
    { name: "Act 2 - Confrontation", scripts: [] },
    { name: "Act 3 - Resolution", scripts: [] },
    { name: "Research", scripts: [] },
    { name: "Drafts", scripts: [] }
  ];
}

// --- LOAD DATA ---
let projects = JSON.parse(localStorage.getItem('imranProjects'));// REPLACE initDashboard FUNCTION IN main.js

async function initDashboard() {
  console.log('🔄 Loading Dashboard from Cloud...');

  // 1. Agar User Login nahi hai, to ruk jao
  if (!CURRENTUSER) return;

  try {
    // 🔥 FIREBASE: Projects load karo (Database se)
    // 'db' global variable hai jo humne upar define kiya tha
    const snapshot = await db.collection('projects').get();
    
    let serverProjects = [];
    snapshot.forEach(doc => {
        serverProjects.push({ id: doc.id, ...doc.data() });
    });

    if (serverProjects.length > 0) {
        projects = serverProjects;
        console.log(`✅ Loaded ${projects.length} Projects from Firestore`);
    } else {
        console.log("⚠️ New User/No Projects. Using Defaults.");
        projects = defaultProjects; 
    }

    // Offline Backup (Optional)
    localStorage.setItem('imranProjects', JSON.stringify(projects));

  } catch (error) {
    console.error("❌ Cloud Load Failed:", error);
    // Fallback: Agar internet nahi hai to LocalStorage use karo
    const local = localStorage.getItem('imranProjects');
    if(local) projects = JSON.parse(local);
  }

  // UI Render karo
  renderDashboardProjects();
  updateStats();

  // Search Logic
  const searchInput = document.getElementById('projectSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        SEARCH_QUERY = e.target.value.toLowerCase().trim();
        renderDashboardProjects();
    });
  }

  // --- ✅ RE-ADDED: Upload Button & Modal Logic ---
    setTimeout(() => {
        const fab = document.getElementById('fabButton');
        const modal = document.getElementById('projectModal');
        const cancel = document.getElementById('cancelModal');
        
        // Upload (+) Button Fix
        if (fab) {
            // Purane events saaf karke naya lagao
            const newFab = fab.cloneNode(true);
            fab.parentNode.replaceChild(newFab, fab);
            
            newFab.onclick = () => {
                console.log("➕ Upload Button Clicked");
                if(modal) modal.classList.remove('hidden');
            };
            console.log("✅ Upload Button Connected");
        } else {
            console.warn("⚠️ Upload Button (fabButton) not found in HTML");
        }

        // Cancel Button Fix
        if (cancel && modal) {
            cancel.onclick = () => {
                modal.classList.add('hidden');
            };
        }
    }, 1000); // 1 second wait taaki sab load ho jaye

}

if (!projects || !Array.isArray(projects) || projects.length === 0) {
    projects = defaultProjects;
    localStorage.setItem('imranProjects', JSON.stringify(projects));
}

projects = projects.map(p => {
    if (!p.sections) p.sections = createSections();
    return p;
});

projects = projects.map(p => { 
    if (!p.sections) p.sections = createSections(); 
    return p; 
});

let footageLib = JSON.parse(localStorage.getItem('imranFootage')) || defaultFootage;
let footageFilters = JSON.parse(localStorage.getItem('imranFilters')) || defaultFilters;
let tokenClient;
let gapiInited = false;
let gisInited = false;
let SEARCH_QUERY = '';

// --- GOOGLE API SETUP (Clean & Fixed) ---



// Sirf Define karo, Call mat karo (HTML automatic call karega)
window.gapiLoaded = async function() {
    try {
        await new Promise((resolve, reject) => {
            gapi.load('client', {callback: resolve, onerror: reject});
        });
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        });
        gapiInited = true;
        console.log('✅ GAPI (Drive) Initialized');
    } catch (error) {
        console.error("❌ GAPI Init Error:", error);
    }
};

window.gisLoaded = function() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '' 
        });
        gisInited = true;
        console.log('✅ GIS (Auth) Ready');
    } catch (error) {
        console.error("❌ GIS Init Error:", error);
    }
};

// ❌ NOTICE: Maine neeche wali "Auto-Start" lines hata di hain taaki double-load na ho.


// --- NAVIGATION ---
window.openHubLink = (type) => {
    const id = new URLSearchParams(window.location.search).get('id') || (projects[0] && projects[0].id);
    // ...same as previous logic, but every link must use ?id= not ?projectId=
    if (type === 'scripts') {
        window.location.href = `scripts.html?id=${id}`;
    } else if (type === 'footage') {
        window.location.href = `footage.html?id=${id}`;
    } else if (type === 'raw') {
        window.location.href = `footage.html?id=${id}&mode=raw`;
    }   else if (type === 'ai') {
    window.location.href = 'ai-tools.html?id=' + encodeURIComponent(id) + '&brain=1';
  }

};



window.goBackToHub = () => { const id = new URLSearchParams(window.location.search).get('id'); window.location.href = id ? `project-hub.html?id=${id}` : 'index.html'; };



// 🏗️ CREATE NEW PROJECT (With Drive Integration - Fixed)
async function createNewProject(openAfter = false) {
    console.log("🔍 Starting Project Creation...");
    
    // 1. Local User Check
    let activeUser = null;
    try {
        const stored = localStorage.getItem('imranUser');
        if (stored) {
            activeUser = JSON.parse(stored);
            if (activeUser.userId && !activeUser.uid) activeUser.uid = activeUser.userId;
        }
    } catch (e) { console.error(e); }

    // Fallback to Firebase Auth
    if ((!activeUser || !activeUser.uid) && window.auth && window.auth.currentUser) {
        const fbUser = window.auth.currentUser;
        activeUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || 'Creator'
        };
    }

    if (!activeUser || !activeUser.uid) {
        alert("⚠️ User Missing. Please Login again.");
        return;
    }

    // 2. Inputs
    const titleInput = document.getElementById('projectTitle');
    const genreSelect = document.getElementById('projectGenre');
    const modal = document.getElementById('projectModal');
    
    // Agar input nahi mila (Scripts page par), to prompt use karo
    const projectName = titleInput ? titleInput.value.trim() : prompt("Enter Project Name:");
    if (!projectName) return; 

    // Create Button ko "Working" mode mein daalo
    const createBtn = document.getElementById('createProject');
    if(createBtn) {
        createBtn.innerText = "Creating Folders...";
        createBtn.disabled = true;
    }

    try {
        const cleanName = projectName.trim();
        const safeEmail = activeUser.email.replace(/[@.]/g, '_'); 
        const safeProject = cleanName.replace(/\s+/g, '_');    
        const ownerName = activeUser.displayName || activeUser.firstName || "Imran User";    

        // 🔥 STEP 3: CREATE GOOGLE DRIVE FOLDERS (Logic Updated)
        let driveData = {};

        // A. Agar 'setupDriveFolders' (Robot) available hai to use karo
        if (typeof setupDriveFolders === 'function') {
            const folders = await setupDriveFolders(ownerName, cleanName, activeUser.email);
            if(folders) driveData = folders;
        } 
        // B. Fallback: Agar Robot function nahi mila, to Manual create karo (Safety ke liye)
        else if (typeof createDriveFolder === 'function') {
            console.log("🤖 Manual Folder Creation Triggered...");
            const projectFolderId = await createDriveFolder(cleanName, VAULT_ID);
            const scriptFolderId = await createDriveFolder("Scripts", projectFolderId);
            const footageFolderId = await createDriveFolder("Raw Footage", projectFolderId);
            
            driveData = {
                projectFolderId: projectFolderId,
                scriptFolderId: scriptFolderId,
                footageFolderId: footageFolderId
            };
        }

        console.log("📂 Folders Ready:", driveData);

        // 4. Create Project Object (Database ke liye)
        const newProject = {
            title: cleanName,
            genre: genreSelect ? genreSelect.value : 'Other',
            ownerEmail: activeUser.email,
            ownerName: ownerName,
            uid: activeUser.uid,
            createdAt: new Date().toISOString(),
            status: 'active',
            
            // ✅ NEW: Connected Drive IDs (Is format ko dhyan se dekhein)
            // Hum 'drive' aur 'driveData' dono save kar rahe hain taaki koi bhi script fail na ho
            drive: {
                enabled: !!driveData.projectFolderId,
                projectId: driveData.projectFolderId || '',
                scriptId: driveData.scriptFolderId || '',   // Scripts Page isay dhoondta hai
                footageId: driveData.footageFolderId || ''  // Footage Page isay dhoondta hai
            },
            // Backup Field (Future proofing)
            driveData: driveData, 

            sections: [], 
            footageLib: [],             
            chapters: 0, 
            progress: 0
        };

        // 5. Save to DB
        if (!window.db && window.firebase) window.db = window.firebase.firestore();
        if (!window.db) throw new Error("Database disconnected.");
        
        const docRef = await window.db.collection('projects').add(newProject);
        
        console.log("🎉 Project Created with ID:", docRef.id);

        // 6. Cleanup & Redirect
        if (titleInput) titleInput.value = '';
        if (modal) modal.classList.add('hidden');
        if(createBtn) {
             createBtn.innerText = "Create Project";
             createBtn.disabled = false;
        }

        // Agar Dashboard par hain to list refresh karo
        if (typeof initDashboard === 'function') await initDashboard(); 

        // Open Project Automatically
        if (openAfter) {
            window.location.href = `raw-footage.html?id=${docRef.id}`;
        } else {
             alert("✅ Project Created Successfully!");
        }

    } catch (error) {
        console.error("Creation Error:", error);
        alert("Error: " + error.message);
        if(createBtn) {
             createBtn.innerText = "Create Project";
             createBtn.disabled = false;
        }
    }
}


// 🖥️ RENDER DASHBOARD (Final: Opens Project Hub)
function renderDashboardProjects() {
    const container = document.getElementById('projectCards');
    if (!container) return;

    let projectsToShow = projects;

    // 1. My/All Filter Logic
    if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === 'my' && typeof CURRENTUSER !== 'undefined' && CURRENTUSER) {
        projectsToShow = projects.filter(p => p.ownerEmail === CURRENTUSER.email);
    }

    // 2. Search Filter Logic
    if (typeof SEARCH_QUERY !== 'undefined' && SEARCH_QUERY) {
        const lowerQ = SEARCH_QUERY.toLowerCase();
        projectsToShow = projectsToShow.filter(p => {
            const title = (p.title || '').toLowerCase();
            const genre = (p.genre || '').toLowerCase();
            const owner = (p.ownerName || '').toLowerCase();
            return title.includes(lowerQ) || genre.includes(lowerQ) || owner.includes(lowerQ);
        });
    }

    container.innerHTML = ''; // Clear old cards

    // 3. Empty State (Agar koi project nahi hai)
    if (projectsToShow.length === 0) {
        container.innerHTML = (typeof SEARCH_QUERY !== 'undefined' && SEARCH_QUERY)
            ? `<div class="col-span-full text-center text-gray-400 py-10">
                 No projects found for "<span class="text-orange-400">${SEARCH_QUERY}</span>"
               </div>`
            : `<div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                 <div class="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                   <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                   </svg>
                 </div>
                 <h3 class="text-white font-semibold mb-1">No projects yet</h3>
                 <p class="text-gray-400 text-sm">Click the + button to create your first project</p>
               </div>`;
        return;
    }

    // 4. Render Cards
    projectsToShow.forEach((project) => {
        const card = document.createElement('div');
        card.className = 'project-card-item mb-6';

        // Progress Calculation
        const percent = project.progress || 0;
        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;

        // Owner Name Logic
        let displayName = project.ownerName || 'Unknown Creator';
        if (typeof CURRENTUSER !== 'undefined' && CURRENTUSER && project.ownerEmail === CURRENTUSER.email) {
            displayName = CURRENTUSER.displayName || CURRENTUSER.firstName || 'You';
        }

        // HTML Structure
        card.innerHTML = `
      <div class="dashboard-card p-3 relative overflow-hidden cursor-pointer h-[105px] bg-gray-800 rounded-xl hover:bg-gray-750 transition border border-gray-700"
           onclick="window.location.href='project-hub.html?id=${project.id}'">

        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-display text-lg font-bold mb-1 truncate">${project.title}</h3>
            <span class="text-orange-500 text-[10px] font-mono uppercase tracking-wider">${project.genre}</span>

            ${(typeof VIEW_MODE !== 'undefined' && VIEW_MODE === 'all') ? `
              <div class="mt-1">
                <span class="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                  by ${displayName}
                </span>
              </div>
            ` : ''}

            <div class="flex gap-2 text-[10px] text-gray-400 mt-2 font-mono">
              <span>${project.chapters || 0} Ch</span>
              <span>${project.readTime || '0min'}</span>
            </div>
          </div>

          <div class="flex-shrink-0 relative">
            <svg width="44" height="44" class="transform -rotate-90">
              <circle cx="22" cy="22" r="${radius}" stroke="rgba(0,0,0,0.3)" stroke-width="3" fill="none"></circle>
              <circle cx="22" cy="22" r="${radius}" stroke="#ff6b35" stroke-width="3" fill="none"
                      stroke-dasharray="${circumference}"
                      stroke-dashoffset="${offset}"
                      stroke-linecap="round"
                      style="transition: stroke-dashoffset 0.5s ease; filter: drop-shadow(0 0 4px rgba(255,107,53,0.8));"></circle>
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-orange-500 font-bold text-xs">
              ${percent}%
            </span>
          </div>
        </div>
      </div>
    `;

        container.appendChild(card);
    });

    // Animation Effect
    if (window.anime) {
        anime({
            targets: '.project-card-item',
            translateY: [30, 0],
            opacity: [0, 1],
            delay: anime.stagger(100)
        });
    }
}


// 2. HUB
function initProjectHub() {
    const id = new URLSearchParams(window.location.search).get('id');
    let project = projects.find(p => p.id === id);
    if(!project) { if(projects.length>0) window.location.href=`project-hub.html?id=${projects[0].id}`; return; }
    const h = document.getElementById('projectTitleHeading');
    const i = document.getElementById('projectTitleInput');
    if (h) h.innerText = project.title;
    if (i) i.value = project.title;
    // ...script count, animation, etc.
}




// 3. EDITOR INIT (Safe Version)
function initEditor() {
    const id = new URLSearchParams(window.location.search).get('id');
    
    // Project dhoondo
    let project = projects.find(p => p.id === id);
    if (!project && projects.length > 0) project = projects[0]; // Fallback
    
    if(!project) return; 

    // 🔥 FIX: Pehle check karo element hai ya nahi
    const titleEl = document.getElementById('projectTitle');
    if (titleEl) {
        titleEl.innerText = project.title; 
    } else {
        // Agar projectTitle nahi mila (Scripts page par), to scriptTitle update karo
        const scriptTitleEl = document.getElementById('scriptTitle');
        if(scriptTitleEl) scriptTitleEl.innerText = project.title;
    }

    // Sections Render karo
    if(typeof renderSections === 'function') {
        renderSections(project);
    }
    
    // Drag-Drop Logic
    const sectionsGrid = document.getElementById('sectionsGrid');
    if (sectionsGrid && typeof Sortable !== 'undefined') {
        new Sortable(sectionsGrid, {
            animation: 200,
            disabled: true,
            handle: '.section-card',
            onEnd: function(evt) {
                const movedSection = project.sections.splice(evt.oldIndex, 1)[0];
                project.sections.splice(evt.newIndex, 0, movedSection);
                localStorage.setItem('imranProjects', JSON.stringify(projects));
                renderSections(project);
            }
        });
    }
}


function renderSections(project) {
    const grid = document.getElementById('sectionsGrid'); if(!grid) return; grid.innerHTML = '';
    if(!project.sections) project.sections = createSections();

    project.sections.forEach((sec, sIdx) => {
        const limit = 10; const count = sec.scripts.length; const percent = Math.min(100, Math.round((count/limit)*100));
        const r = 14; const circ = 2 * Math.PI * r; const offset = circ - (percent/100) * circ;
        const isFull = count >= limit;
        const ringClass = isFull ? 'ring-green' : 'ring-orange';
        const cardClass = isFull ? 'card-full' : '';
        const text = isFull ? '100%' : `${count}/${limit}`;

        const div = document.createElement('div');
        div.className = `section-card p-5 rounded-xl h-[400px] flex flex-col relative overflow-hidden ${cardClass}`;
        div.setAttribute('data-project-id', project.id);

        div.innerHTML = `
            <div class="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <h3 class="font-display text-lg text-orange-500 tracking-wide sec-title">${sec.name}</h3>
                <div class="capacity-container"><div class="capacity-wrapper"><svg class="capacity-svg" viewBox="0 0 36 36"><circle class="capacity-bg" cx="18" cy="18" r="${r}"></circle><circle class="capacity-fg ${ringClass}" cx="18" cy="18" r="${r}" style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}"></circle></svg><span class="capacity-percent">${percent}%</span></div><span class="capacity-count">${isFull?'FULL':text}</span></div>
            </div>
            <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 script-list" id="list-${sIdx}">
                ${sec.scripts.map((s, scIdx) => `<div onclick="window.open('${s.link||'#'}', '_blank')" class="script-item cursor-pointer flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 hover:border-orange-500/50 transition group"><div class="flex items-center gap-3 overflow-hidden"><div class="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center bg-orange-500/20 text-orange-500 text-[10px] font-bold">DOC</div><div class="min-w-0"><p class="text-sm text-gray-300 truncate font-medium">${s.name||'Script'}</p><p class="text-[10px] text-gray-500">${s.date||'Now'}</p></div></div><button onclick="event.stopPropagation(); deleteScript('${project.id}', ${sIdx}, ${scIdx})" class="delete-btn text-gray-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100">Ã—</button></div>`).join('')}
            </div>
            <div class="upload-area mt-3 pt-3 border-t border-white/10 justify-center">
                ${!isFull ? `<div onclick="startScriptUpload('${project.id}', ${sIdx})" class="cursor-pointer text-gray-400 hover:text-orange-500 text-xs flex flex-col items-center gap-1 transition-colors"><span>+ Upload</span></div>` : `<span class="text-xs text-green-500 font-mono font-bold">FULL</span>`}
            </div>
        `;
        grid.appendChild(div);
        const scriptList = div.querySelector('.script-list');
new Sortable(scriptList, { 
    group: 'scripts',
    animation: 150,
    disabled: true,
    onEnd: function(evt) {
        // Prevent re-render loop
        if (evt.to === evt.from && evt.oldIndex === evt.newIndex) {
            return; // Same position, no change
        }
        
        // Get section indices from ID
        const fromSectionIdx = parseInt(evt.from.id.replace('list-', ''));
        const toSectionIdx = parseInt(evt.to.id.replace('list-', ''));
        
        // Remove from old section
        const movedFile = project.sections[fromSectionIdx].scripts.splice(evt.oldIndex, 1)[0];
        
        // Add to new section
        project.sections[toSectionIdx].scripts.splice(evt.newIndex, 0, movedFile);
        
        // Save
        localStorage.setItem('imranProjects', JSON.stringify(projects));
        
        // DON'T re-render immediately - just update the counts
        // Update capacity display manually
        updateSectionCounts(project);
    }
});
function updateSectionCounts(project) {
    project.sections.forEach((sec, idx) => {
        const count = sec.scripts.length;
        const limit = 10;
        const percent = Math.min(100, Math.round((count/limit)*100));
        
        // Update count display
        const countEl = document.querySelector(`#list-${idx}`).closest('.section-card').querySelector('.capacity-percent');
        if (countEl) countEl.textContent = percent + '%';
        
        const textEl = document.querySelector(`#list-${idx}`).closest('.section-card').querySelector('.capacity-count');
        if (textEl) textEl.textContent = count >= limit ? 'FULL' : `${count}/${limit}`;
    });
}


    });
    if(window.anime) anime({ targets: '.section-card', translateY: [30, 0], opacity: [0, 1], delay: anime.stagger(100) });
}

// 4. FOOTAGE
function initFootagePage() {
    renderFilters(); renderFootage(footageLib);
    const grid = document.getElementById('footageGrid');
    const vidSort = new Sortable(grid, { animation: 200, disabled: true, onEnd: (evt) => { const item = footageLib.splice(evt.oldIndex, 1)[0]; footageLib.splice(evt.newIndex, 0, item); localStorage.setItem('imranFootage', JSON.stringify(footageLib)); }});
    if(document.querySelector('.filter-scroll')) {
        document.getElementById('footageEditorToggle').onclick = function() {
            this.classList.toggle('text-orange-500'); this.classList.toggle('border-orange-500'); document.body.classList.toggle('edit-mode');
            const isEditing = document.body.classList.contains('edit-mode');
            vidSort.option("disabled", !isEditing);
            document.querySelectorAll('.vid-title').forEach((el, idx) => { el.contentEditable = isEditing; if(!isEditing) { footageLib[idx].title = el.innerText; localStorage.setItem('imranFootage', JSON.stringify(footageLib)); }});
            document.querySelectorAll('.filter-pill').forEach((el, idx) => { el.contentEditable = isEditing; if(!isEditing) { footageFilters[idx].name = el.innerText; localStorage.setItem('imranFilters', JSON.stringify(footageFilters)); }});
        };
    }
    document.getElementById('videoSearchInput').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); renderFootage(footageLib.filter(v => v.title.toLowerCase().includes(q))); });
}
function renderFilters() { const c = document.querySelector('.filter-scroll'); if(!c) return; c.innerHTML = ''; footageFilters.forEach((f) => { const d = document.createElement('div'); d.className = `filter-pill ${f.type === 'all' ? 'active' : ''}`; d.innerText = f.name; d.onclick = (e) => { if(!document.body.classList.contains('edit-mode')) filterVideos(f.type === 'custom' ? f.name : f.type, d); }; c.appendChild(d); }); }
window.filterVideos = (t, el) => { 
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    if (t === 'all') {
        renderFootage(footageLib);
    } else if (t === 'recent') {
        // latest id sabse pehle
        const sorted = [...footageLib].sort((a, b) => b.id - a.id);
        renderFootage(sorted);
    } else {
        const q = t.toLowerCase();
        renderFootage(footageLib.filter(v => v.title.toLowerCase().includes(q)));
    }
};



function renderFootage(list) { const data = list || footageLib; const grid = document.getElementById('footageGrid'); if(!grid) return; grid.innerHTML = ''; if(data.length === 0) { grid.innerHTML = `<div class="col-span-full text-center text-gray-500 mt-10">No videos found.</div>`; return; } data.forEach((vid) => { const idx = footageLib.findIndex(v => v.id === vid.id); const div = document.createElement('div'); div.className = 'video-card group relative'; const isLocal = vid.link.startsWith('blob:'); div.innerHTML = `<div onclick="playVideo('${vid.link}', '${vid.title}', ${isLocal})" class="w-full h-full"><img src="resources/hero-film-studio.png" class="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition"><div class="video-overlay"><div class="play-icon">â–¶</div></div></div><div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"><h4 class="text-white font-bold truncate vid-title pointer-events-auto">${vid.title}</h4><span class="text-[10px] text-orange-500 uppercase tracking-wider">${isLocal ? 'LOCAL' : 'DRIVE'}</span></div><button onclick="deleteFootage(${idx})" class="delete-btn absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full z-20">Ã—</button>`; grid.appendChild(div); }); if(window.anime) anime({ targets: '.video-card', translateY: [20, 0], opacity: [0, 1], delay: anime.stagger(50) }); }

// --- UPLOADS ---
function handleAuthClick(cb) { if (gapi.client.getToken() === null) { tokenClient.callback = async (r) => { if (!r.error) await cb(); }; tokenClient.requestAccessToken({prompt: ''}); } else { cb(); } }

window.startVideoUpload = () => {
    // Direct File Input (No Auth Popup needed)
    const i = document.createElement('input'); 
    i.type = 'file'; i.accept = 'video/*'; i.multiple = true; 
    i.onchange = (e) => { Array.from(e.target.files).forEach(f => uploadFileWithQueue(f, 'video')); }; 
    i.click(); 
};

window.startScriptUpload = (pId, sIdx) => { 
    const i = document.createElement('input'); 
    i.type='file'; i.multiple=true; 
    i.onchange=(e)=>{ Array.from(e.target.files).forEach(f => uploadFileWithQueue(f, 'script', pId, sIdx)); }; 
    i.click(); 
};

async function uploadFileWithQueue(file, type, pId, sIdx) {
    // 1. Queue UI (Progress Bar) Banao
    const uid = 'up-' + Date.now();
    let q = document.getElementById('uploadQueue');
    if (!q) { 
        q = document.createElement('div'); q.id = 'uploadQueue'; document.body.appendChild(q); 
    }

    const ui = document.createElement('div'); 
    ui.className = 'upload-item'; ui.id = uid;
    ui.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-weight:bold;max-width:150px;overflow:hidden;text-overflow:ellipsis">${file.name}</span>
            <span style="font-size:10px;color:#ff6b35" id="status-${uid}">Start...</span>
        </div>
        <div style="width:100%;background:#333;height:3px;border-radius:2px">
            <div style="height:100%;background:#ff6b35;width:0%;transition:width 0.2s" id="bar-${uid}"></div>
        </div>`;
    ui.style.cssText = "background:#111;border:1px solid #333;border-left:3px solid #ff6b35;padding:10px;border-radius:8px;margin-bottom:5px;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
    q.appendChild(ui);

    // 2. Data Prepare Karo (FormData)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userName', CURRENTUSER ? (CURRENTUSER.displayName || CURRENTUSER.email) : 'Guest');
    
    // Project Name Nikalo
    let projName = 'General Uploads';
    if(pId) {
        const p = projects.find(x => x.id === pId);
        if(p) projName = p.title;
    }
    formData.append('projectName', projName);
    
    // File Type (Folder Category)
    formData.append('fileType', type === 'script' ? 'Scripts' : 'Raw Footage');

    try {
        // 3. 🔥 SEND TO YOUR SERVER (API Call)
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/drive/smart-upload`, true);

        // Progress Tracking
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const p = Math.round((e.loaded / e.total) * 100);
                document.getElementById(`bar-${uid}`).style.width = `${p}%`;
                document.getElementById(`status-${uid}`).innerText = `${p}% Uploading`;
            }
        };

        // Complete Handler
        xhr.onload = async () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                
                if(response.success) {
                    // Success UI
                    document.getElementById(`status-${uid}`).innerText = "✅ DONE";
                    document.getElementById(uid).style.borderLeftColor = "#22c55e"; // Green
                    
                    const link = response.viewLink;
                    const name = file.name;

                    // 4. Update Frontend State (App me file dikhao)
                    if (type === 'script' && pId) {
                        const p = projects.find(x => x.id === pId);
                        if (p) {
                            if(!p.sections[sIdx].scripts) p.sections[sIdx].scripts = [];
                            p.sections[sIdx].scripts.push({ name: name, date: new Date().toLocaleDateString(), link: link });
                            
                            // Database Sync (Firestore update)
                            await db.collection('projects').doc(pId).update({ sections: p.sections });
                            renderSections(p);
                        }
                    } else if (type === 'video') {
                        footageLib.unshift({ id: Date.now(), title: name, link: link, driveId: response.fileId });
                        // Local update for speed (Next refresh pe DB se aayega)
                        renderFootage();
                    }

                    // Remove Toast after 3 sec
                    setTimeout(() => ui.remove(), 3000);
                } else {
                    throw new Error(response.message);
                }
            } else {
                throw new Error("Server Error");
            }
        };

        xhr.send(formData);

    } catch (error) {
        console.error(error);
        document.getElementById(`status-${uid}`).innerText = "❌ ERROR";
        ui.style.borderLeftColor = "red";
    }
}

// UTILS
window.playVideo = (l, t, loc) => { if(document.body.classList.contains('edit-mode')) return; const m = document.getElementById('theaterModal'); const c = document.getElementById('playerContainer'); document.getElementById('playerTitle').innerText = t; c.innerHTML = ''; if(loc) { const v = document.createElement('video'); v.src = l; v.controls = true; v.autoplay = true; v.className = "w-full h-full object-contain"; c.appendChild(v); } else { const i = document.createElement('iframe'); i.src = l; i.className = "w-full h-full"; i.allow = "autoplay"; c.appendChild(i); } m.classList.remove('hidden'); setTimeout(() => m.classList.add('active'), 10); };
window.closeTheater = () => { const m = document.getElementById('theaterModal'); m.classList.remove('active'); document.getElementById('playerContainer').innerHTML = ''; setTimeout(() => m.classList.add('hidden'), 400); };
window.deleteScript = (pId, sIdx, scIdx) => { if(confirm("Delete?")) { const p = projects.find(x => x.id === pId); p.sections[sIdx].scripts.splice(scIdx, 1); localStorage.setItem('imranProjects', JSON.stringify(projects)); renderSections(p); } };
window.deleteFootage = (idx) => { if(confirm("Delete?")) { footageLib.splice(idx, 1); localStorage.setItem('imranFootage', JSON.stringify(footageLib)); renderFootage(); } };
window.deleteProject = (idx) => { if(confirm("Delete?")) { projects.splice(idx, 1); localStorage.setItem('imranProjects', JSON.stringify(projects)); renderDashboardProjects(); updateStats(); } };
window.saveDashTitle = (el, idx) => { projects[idx].title = el.innerText; localStorage.setItem('imranProjects', JSON.stringify(projects)); };

function updateStats() {
  // ===== PROJECTS / SCRIPTS / VIDEOS STATS =====

  // Projects (option: sirf current user ke)
  let myProjects = projects;
  if (CURRENTUSER) {
    myProjects = projects.filter(p => p.ownerEmail === CURRENTUSER.email);
  }

  const p = document.getElementById('project-count');
  if (p) {
    p.innerText = myProjects.length;
  }

  // Videos (footage) – yahi global array use ho jo tum already bana rahe ho
  const v = document.getElementById('video-count');
  if (v) {
    v.innerText = Array.isArray(footageLib) ? footageLib.length : 0;
  }

  // Scripts (all projects, all sections)
  const s = document.getElementById('script-count');
  if (s) {
    const totalScripts = myProjects.reduce((acc, proj) => {
      if (!proj.sections) return acc;
      const bySections = proj.sections.reduce((secAcc, sec) => {
        const list = sec.scripts || [];
        return secAcc + list.length;
      }, 0);
      return acc + bySections;
    }, 0);

    s.innerText = totalScripts;
  }

  // ===== EXTRA: Projects card subtitle (optional) =====
  const statProjectsSubEl = document.getElementById('statProjectsSub');
  if (statProjectsSubEl) {
    const total = myProjects.length;
    statProjectsSubEl.textContent =
      total > 0 ? `${total} active` : 'No active projects';
  }
}


window.goBackToHub = () => { const id = new URLSearchParams(window.location.search).get('id') || projects[0].id; window.location.href = `project-hub.html?id=${id}`; };
// ========== SEARCH - COMPLETE WORKING VERSION ==========
setTimeout(() => {
    const searchInput = document.querySelector('input[placeholder="Search projects..."]');
    if (!searchInput) return;
    
    console.log('✓ Search initialized!');
    
    function updateCards(filtered) {
        const container = document.getElementById('projectCards');
        if (!container) return;
        
        // Clear existing cards
        container.innerHTML = '';
        
        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding: 60px; text-align: center; color: #666;">No projects found</div>';
            return;
        }
        
        // Render each card
        filtered.forEach((project) => {
            const card = document.createElement('div');
            card.className = 'project-card-item mb-6';
            
            const percent = project.progress || 0;
            const radius = 18;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (percent / 100) * circumference;
            
            card.innerHTML = `
                <div class="dashboard-card p-3 relative overflow-hidden cursor-pointer h-[105px]" 
                    onclick="window.location.href='project-hub.html?id=${project.id}'">
                    
                    <div class="flex justify-between items-start gap-3">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-white font-display text-lg font-bold mb-1 truncate">${project.title}</h3>
                            <span class="text-orange-500 text-[10px] font-mono uppercase tracking-wider">${project.genre}</span>
                            <div class="flex gap-2 text-[10px] text-gray-400 mt-2 font-mono">
                                <span>${project.chapters} Ch</span>
                                <span>${project.readTime}</span>
                            </div>
                        </div>
                        
                        <div class="flex-shrink-0 relative">
                            <svg width="44" height="44" class="transform -rotate-90">
                                <circle cx="22" cy="22" r="${radius}" stroke="rgba(0,0,0,0.3)" stroke-width="3" fill="none"/>
                                <circle cx="22" cy="22" r="${radius}" stroke="#ff6b35" stroke-width="3" fill="none" 
                                    stroke-dasharray="${circumference}" 
                                    stroke-dashoffset="${offset}"
                                    stroke-linecap="round"
                                    style="transition: stroke-dashoffset 0.5s ease; filter: drop-shadow(0 0 4px rgba(255,107,53,0.8));"/>
                            </svg>
                            <span class="absolute inset-0 flex items-center justify-center text-orange-500 font-bold text-xs">${percent}%</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
        console.log('✓ Rendered', filtered.length, 'cards');
    }
    
    function liveFilter(query) {
        query = query.toLowerCase().trim();
        const allProjects = window.projects || projects;
        
        if (!query) {
            updateCards(allProjects);
            return;
        }
        
        const filtered = allProjects.filter(p => 
            p.title.toLowerCase().includes(query) ||
            (p.genre && p.genre.toLowerCase().includes(query))
        );
        
        updateCards(filtered);
    }
    
    // Live typing
    searchInput.addEventListener('input', (e) => liveFilter(e.target.value));
    
    // Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') liveFilter(searchInput.value);
    });
    
    // Search icon
    const icon = searchInput.previousElementSibling;
    if (icon) {
        icon.style.cursor = 'pointer';
        icon.onclick = () => liveFilter(searchInput.value);
    }
    
}, 1000);
// ========== PROJECT HEADER FUNCTIONS ==========
function saveProjectTitle(newTitle) {
    console.log('Title saved:', newTitle);
    // TODO: Save to backend/localStorage
}

function updateStatus(status) {
    const statusMap = {
        'pre': 'PRE-PRODUCTION',
        'filming': 'FILMING',
        'post': 'POST-PRODUCTION',
        'complete': 'COMPLETE'
    };
    console.log('Status updated:', statusMap[status]);
    // TODO: Save to backend
}

function editProject() {
    alert('Edit project settings');
    // TODO: Open edit modal
}

function exportProject() {
    alert('Exporting project...');
    // TODO: Export functionality
}

// ✅ REPLACE: deleteProject (Cloud Version)
async function deleteProject(idx) {
    if(confirm("Are you sure you want to delete this project permanently?")) {
        const projectToDelete = projects[idx];
        
        // 1. Local UI se hatao
        projects.splice(idx, 1);
        renderDashboardProjects();
        updateStats();

        // 2. 🔥 CLOUD DELETE
        if(projectToDelete && projectToDelete.id) {
            try {
                await db.collection('projects').doc(projectToDelete.id).delete();
                showDashToast("Project Deleted from Cloud");
                
                // Backup update
                saveProjectToCloud(project); // ✅ Cloud Update
            } catch(e) {
                console.error("Delete Failed:", e);
                alert("Failed to delete from server.");
            }
        }
    }
}

// Update progress bar (enhanced)
function updateProgress(percent) {
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressPercent');
    if (bar && text) {
        bar.style.width = percent + '%';
        text.textContent = percent + '%';
    }
}

// Demo: Animate progress on load
setTimeout(() => {
    updateProgress(0);
    setTimeout(() => updateProgress(35), 100);
}, 500);
// ========== PROJECT-SPECIFIC PAGE NAVIGATION ==========
function getProjectId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function openScriptsPage() {
    const id = getProjectId();
    if (id) {
        window.location.href = `scripts.html?id=${id}`;
    } else {
        window.location.href = 'scripts.html';
    }
}

function openFootagePage() {
    const id = getProjectId();
    if (id) {
        window.location.href = `footage.html?id=${id}`;
    } else {
        window.location.href = 'footage.html';
    }
}

window.openRawFootage = function () {
  const id = new URLSearchParams(window.location.search).get('id') || projects[0]?.id || 'p1';
  window.location.href = `raw-footage.html?id=${id}`;
};

window.openEditedFootage = function () {
  const id = new URLSearchParams(window.location.search).get('id') || projects[0]?.id || 'p1';
  window.location.href = `edited-footage.html?id=${id}`;
};

function filterByProject() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        console.log('Filtering for project:', id);
        // Tumhara filtering/rendering yahi pe karo
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const id = new URLSearchParams(window.location.search).get('id');
    const project = projects && projects.find(p => p.id === id);
    if (project) {
        const h = document.getElementById('projectTitleHeading');
        const i = document.getElementById('projectTitleInput');
        if (h) h.innerText = project.title;
        if (i) i.value = project.title;
    }

    // Check which page and initialize
    const hasProjectCards = document.getElementById('projectCards');
    const hasSectionsGrid = document.getElementById('sectionsGrid');
    const hasFootageGrid = document.getElementById('footageGrid');
    if (hasProjectCards) {
        initDashboard();
    }
    if (hasSectionsGrid) {
        initEditor();
    }
    if (hasFootageGrid) {
        initFootagePage();
    }
    // Project Hub detection
    const isProjectHub = window.location.pathname.includes('project-hub');
    if (isProjectHub && typeof initProjectHub === 'function') {
        initProjectHub();
    }
});

// ------- message rendering/wrapping code ke baad yeh paste karo -------



// Outside click to close
document.addEventListener('click', (e) => {
  if (!e.target.closest('.more-menu')) {
    document.querySelectorAll('.more-dropdown').forEach(dd => dd.classList.remove('active'));
  }
});


// Hover actions UI (optional if CSS alone doesn't work)
document.addEventListener('mouseover', function(e) {
  if (e.target.closest('.msg-row.ai')) {
    var actions = e.target.closest('.msg-row.ai').querySelector('.ai-actions');
    if (actions) actions.style.display = 'flex';
  }
});
document.addEventListener('mouseout', function(e) {
  if (e.target.closest('.msg-row.ai')) {
    var actions = e.target.closest('.msg-row.ai').querySelector('.ai-actions');
    if (actions) actions.style.display = 'none';
  }
});

// Like/Dislike/Copy/Three-dot menu
document.addEventListener('click', function(e) {
  // Copy
  if (e.target.classList.contains('copy-btn')) {
    const msg = e.target.closest('.msg-row').querySelector('span').innerText;
    navigator.clipboard.writeText(msg);
    // alert('Copied!'); // Optional feedback
  }
  // Like/Dislike - add custom JS as needed
  if (e.target.classList.contains('like-btn')) {
    e.target.style.color = "#55e96e";
  }
  if (e.target.classList.contains('dislike-btn')) {
    e.target.style.color = "#ff6868";
  }
  // 3-dot toggle
  if (e.target.classList.contains('more-btn')) {
    const dd = e.target.parentElement.querySelector('.more-dropdown');
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
    // Hide others
    document.querySelectorAll('.more-dropdown').forEach(o => {
      if(o!==dd) o.style.display = 'none';
    });
    e.stopPropagation();
  }
  // Dropdown menu item hide on select
  if (e.target.classList.contains('dropdown-item')) {
    e.target.closest('.more-dropdown').style.display = 'none';
  }
});
// Menu outside click close
document.addEventListener('click', function(e) {
  document.querySelectorAll('.more-dropdown').forEach(dd => dd.style.display = 'none');
}, true);

function drawAvatarFireAnim() {
  const canvas = document.getElementById("avatarFireAnim");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Draw orange ring
  ctx.strokeStyle = "#ff6b35";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(w/2, h/2, 16, 0, Math.PI*2);
  ctx.stroke();
  
  // Animated sparkle orbit
  const now = Date.now()/1000;
  const angle = (now*1.9) % (Math.PI*2);
  const x = w/2 + Math.cos(angle)*16;
  const y = h/2 + Math.sin(angle)*16;

  // Draw sparkle point
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI*2);
  ctx.fillStyle = "#f97d3c";
  ctx.shadowColor = "#ffae70";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Subtle dotted outer ring
  for (let i=0; i < 18; i++) {
    const t = (i/18)*Math.PI*2;
    ctx.beginPath();
    ctx.arc(w/2 + Math.cos(t)*18, h/2 + Math.sin(t)*18, 0.7, 0, Math.PI*2);
    ctx.fillStyle = "#222";
    ctx.fill();
  }

  requestAnimationFrame(drawAvatarFireAnim);
}


// ==========================================
// ⚡ FINAL FIX: CONNECT CREATE BUTTON (Safe Mode)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Sirf tab dhoondo jab hum Dashboard (index.html) par hon
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        
        const createBtn = document.getElementById('createProject');
        const modal = document.getElementById('projectModal');

        if (createBtn) {
            console.log("✅ Create Button Found!");
            
            // Purana listener hatane ke liye clone
            const newBtn = createBtn.cloneNode(true);
            createBtn.parentNode.replaceChild(newBtn, createBtn);

            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log("🚀 Create Clicked!");

                const originalText = newBtn.innerText;
                newBtn.innerText = "Creating...";
                newBtn.disabled = true;

                try {
                    if (typeof createNewProject === 'function') {
                        // Modal close karo agar open hai
                        if(modal) modal.classList.add('hidden');
                        await createNewProject(false);
                    }
                } catch (err) {
                    alert("Error: " + err.message);
                } finally {
                    newBtn.innerText = originalText;
                    newBtn.disabled = false;
                }
            });
        } else {
            console.warn("⚠️ Create Button not found (Might be loading...)");
        }
    }
});

// ==========================================
// 🚀 2TB UPLOAD SYSTEM (Zero User Quota)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzyNZ-RfOEcYtL5jmx-0UzqnacPL7e6lsjR2PHh6g50ojQsBu-144YmfYwMzxQ2bczE/exec"; 

// 1. Folder Setup Function
async function setupDriveFolders(userName, projectName, userEmail) {
    console.log("🤖 Robot creating folders...");
    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "create_project", // Robot ko batao ye folder banana hai
                userName: userName,
                projectName: projectName,
                userEmail: userEmail
            })
        });
        const result = await response.json();
        
        if (result.status === "success") {
            console.log("✅ Folders Ready!");
            return result; // IDs wapis milengi
        } else {
            alert("Error: " + result.message);
            return null;
        }
    } catch (e) { console.error(e); return null; }
}

// 2. Upload Function (Magic Link User)
// Jab user file select kare, is function ko call karein
async function uploadFileToDrive(file, folderId) {
    console.log(`🚀 Preparing upload for: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);

    try {
        // A. Robot se "Magic Link" maango
        const linkResponse = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "get_upload_url",
                folderId: folderId,
                fileName: file.name,
                mimeType: file.type
            })
        });
        const linkResult = await linkResponse.json();

        if (linkResult.status !== "success") throw new Error(linkResult.message);

        const magicUrl = linkResult.uploadUrl;
        console.log("🔗 Magic Link Received. Uploading directly to Imran's 2TB...");

        // B. File Upload karo (PUT Request on Magic Link)
        // Note: Ye seedha Google ke server par jayega via Magic Link
        const upload = await fetch(magicUrl, {
            method: "PUT",
            body: file // Seedha file stream bhejo
        });

        if (upload.ok) {
            console.log("🎉 Upload Successful! (Used Imran's Storage)");
            alert("Upload Complete!");
            return true;
        } else {
            throw new Error("Upload failed");
        }

    } catch (e) {
        console.error("❌ Upload Error:", e);
        alert("Upload Failed: " + e.message);
        return false;
    }
}

// 📂 CREATE DRIVE SUB-FOLDER
async function createDriveSubFolder(name, parentId) {
    console.log(`Creating Drive Folder: ${name}...`);
    try {
        const response = await fetch(`${API_BASE}/api/drive/create-folder`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folderName: name,
                parentId: parentId
            })
        });
        
        const result = await response.json();
        if(result.success) {
            console.log("✅ Folder Created ID:", result.folderId);
            return result.folderId;
        } else {
            throw new Error(result.error || "Failed to create folder");
        }
    } catch (e) {
        console.error(e);
        alert("Folder Creation Failed: " + e.message);
        return null;
    }
}