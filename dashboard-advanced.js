

// ===== USER AVATAR + MENU UI =====
function setupUserMenu() {
 // In dashboard-advanced.js -> setupUserMenu()

const btn = document.getElementById('userAvatarButton');
const menu = document.getElementById('userMenu');

// Remove old listener if any (safety)
const newBtn = btn.cloneNode(true);
btn.parentNode.replaceChild(newBtn, btn);

newBtn.addEventListener('click', (e) => {
  e.preventDefault(); // Link click roko
  e.stopPropagation(); // Bubble roko
  const menuEl = document.getElementById('userMenu'); // Re-select
  if (menuEl) menuEl.classList.toggle('hidden');
});

  const img = document.getElementById('userAvatarImg');
  const fallback = document.getElementById('userAvatarFallback');
  
  const nameEl = document.getElementById('userMenuName');
  const emailEl = document.getElementById('userMenuEmail');
  const roleEl = document.getElementById('userMenuRole');
  const signOutBtn = document.getElementById('userMenuSignOut');
  const accountBtn = document.getElementById('userMenuAccount');

  if (!btn || !menu) return;

  if (CURRENTUSER) {
    const name = getImranFullName(CURRENTUSER);
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = CURRENTUSER.email || 'No email';

    if (CURRENTUSER.photo) {
      img.src = CURRENTUSER.photo;
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
    } else {
      const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
      fallback.textContent = initials || 'U';
    }

    // Always show as User in this dashboard
    roleEl.textContent = 'User';
    roleEl.classList.remove('text-cyan-300');
    roleEl.classList.add('text-orange-300');
  }

  // Avatar → menu toggle
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }
  });

  menu.addEventListener('click', (e) => e.stopPropagation());

  // Dropdown "Account" → account.html
  accountBtn.addEventListener('click', () => {
    menu.classList.add('hidden');
    window.location.href = 'account.html';
  });

  // Sign out
  signOutBtn.addEventListener('click', () => {
    localStorage.removeItem('imranUser');
    window.location.href = 'landing.html';
  });
}

// DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupUserMenu);
} else {
  setupUserMenu();
}

// ===== ACCOUNT SETTINGS PANEL =====
function setupAccountPanel() {
  const overlay = document.getElementById('accountPanelOverlay');
  const panel = document.getElementById('accountPanel');
  const closeBtn = document.getElementById('accountPanelClose');
  const accountBtn = document.getElementById('userMenuAccount');
  const signOutBtn = document.getElementById('userMenuSignOut');
  const panelSignOut = document.getElementById('panelSignOut');

  const panelAvatarImg = document.getElementById('panelAvatarImg');
  const panelAvatarFallback = document.getElementById('panelAvatarFallback');
  const panelAvatarInput = document.getElementById('panelAvatarInput');
  const panelChangeAvatar = document.getElementById('panelChangeAvatar');
  const panelName = document.getElementById('panelName');
  const panelEmail = document.getElementById('panelEmail');
  const panelRole = document.getElementById('panelRole');

  const themeAdvanced = document.getElementById('themeAdvanced');
  const themeBasic = document.getElementById('themeBasic');

  if (!overlay || !panel || !closeBtn || !themeAdvanced || !themeBasic) return;

  function openPanel() {
    if (!CURRENTUSER) return;
    overlay.classList.remove('hidden');
    panel.classList.remove('translate-x-full');

    const name = getImranFullName(CURRENTUSER);
    panelName.textContent = name;
    panelEmail.textContent = CURRENTUSER.email || 'No email';

    if (CURRENTUSER.photo) {
      panelAvatarImg.src = CURRENTUSER.photo;
      panelAvatarImg.classList.remove('hidden');
      panelAvatarFallback.classList.add('hidden');
    } else {
      const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
      panelAvatarFallback.textContent = initials || 'U';
      panelAvatarImg.classList.add('hidden');
      panelAvatarFallback.classList.remove('hidden');
    }

    // Always show User role here too
    panelRole.textContent = 'User';
    panelRole.classList.remove('text-cyan-300');
    panelRole.classList.add('text-orange-300');

    const theme = localStorage.getItem('imranTheme') || 'advanced';
    applyThemeButtons(theme);
  }

  function closePanel() {
    panel.classList.add('translate-x-full');
    overlay.classList.add('hidden');
  }

  function applyThemeButtons(theme) {
    if (theme === 'basic') {
      document.body.classList.add('theme-basic');
      document.body.classList.remove('theme-advanced');
      themeBasic.classList.add('border-orange-400', 'bg-orange-500/10', 'text-orange-100');
      themeAdvanced.classList.remove('border-orange-500/60', 'bg-orange-500/10', 'text-orange-100');
      themeAdvanced.classList.add('border-white/15', 'bg-black/60', 'text-gray-200');
    } else {
      document.body.classList.add('theme-advanced');
      document.body.classList.remove('theme-basic');
      themeAdvanced.classList.add('border-orange-500/60', 'bg-orange-500/10', 'text-orange-100');
      themeBasic.classList.remove('border-orange-400', 'bg-orange-500/10', 'text-orange-100');
      themeBasic.classList.add('border-white/15', 'bg-black/60', 'text-gray-200');
    }
  }

  themeAdvanced.addEventListener('click', () => {
    localStorage.setItem('imranTheme', 'advanced');
    applyThemeButtons('advanced');
  });

  themeBasic.addEventListener('click', () => {
    localStorage.setItem('imranTheme', 'basic');
    applyThemeButtons('basic');
  });

  const savedTheme = localStorage.getItem('imranTheme') || 'advanced';
  applyThemeButtons(savedTheme);

  if (accountBtn) {
    accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('userMenu');
      if (menu) menu.classList.add('hidden');
      openPanel();
    });
  }

  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  panelChangeAvatar.addEventListener('click', () => {
    panelAvatarInput.click();
  });

  panelAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const updated = { ...CURRENTUSER, photo: dataUrl };
      localStorage.setItem('imranUser', JSON.stringify(updated));
      panelAvatarImg.src = dataUrl;
      panelAvatarImg.classList.remove('hidden');
      panelAvatarFallback.classList.add('hidden');

      const topAvatar = document.getElementById('userAvatarImg');
      const topFallback = document.getElementById('userAvatarFallback');
      if (topAvatar && topFallback) {
        topAvatar.src = dataUrl;
        topAvatar.classList.remove('hidden');
        topFallback.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
  });

  const doSignOut = () => {
    localStorage.removeItem('imranUser');
    window.location.href = 'landing.html';
  };
  if (signOutBtn) signOutBtn.addEventListener('click', doSignOut);
  if (panelSignOut) panelSignOut.addEventListener('click', doSignOut);
}

// init account panel
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAccountPanel);
} else {
  setupAccountPanel();
}
