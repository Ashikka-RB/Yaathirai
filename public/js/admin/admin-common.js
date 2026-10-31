// ========================================================
// YAATHIRAI — SHARED ADMIN CLIENT CONTROLLER
// Vanilla JS, DOM manipulation, Fetch API, Session Verification
// ========================================================

window.YaathiraiAdmin = (() => {
  let currentUser = null;

  async function checkAuth(requiredRoles = ['admin', 'super_admin']) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
      }

      const data = await res.json();
      if (!data.success || !data.user) {
        window.location.href = 'login.html';
        return null;
      }

      currentUser = data.user;

      // Check role authorization
      if (!requiredRoles.includes(currentUser.role)) {
        alert('Access denied: You do not have administrator permissions.');
        window.location.href = 'login.html';
        return null;
      }

      renderUserHeader(currentUser);
      updateSidebarForRole(currentUser);
      return currentUser;
    } catch (err) {
      console.error('[Auth Error]', err);
      window.location.href = 'login.html';
      return null;
    }
  }

  function renderUserHeader(user) {
    const nameEl = document.getElementById('userNameDisplay');
    const roleEl = document.getElementById('userRoleDisplay');
    const avatarEl = document.getElementById('userAvatarDisplay');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role.replace('_', ' ');
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  function updateSidebarForRole(user) {
    const superAdminSection = document.getElementById('superAdminNavSection');
    if (superAdminSection) {
      superAdminSection.style.display = user.role === 'super_admin' ? 'block' : 'none';
    }

    // Highlight current page in sidebar
    const currentPath = window.location.pathname.split('/').pop() || 'admin-dashboard.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (href === currentPath || (currentPath === '' && href === 'admin-dashboard.html'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network fail on logout
    }
    window.location.href = 'login.html';
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="mono-tag" style="font-size:1.1rem">${type === 'success' ? '✓' : type === 'danger' ? '✕' : 'ℹ'}</span>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function formatCurrency(amount) {
    return '₹ ' + Number(amount || 0).toLocaleString('en-IN');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Mobile sidebar drawer setup
  function initMobileSidebar() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.admin-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
      });

      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('is-open');
        }
      });
    }

    // Attach logout buttons
    const logoutBtns = document.querySelectorAll('[data-action="logout"]');
    logoutBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initMobileSidebar);

  return {
    checkAuth,
    logout,
    showToast,
    escapeHTML,
    formatCurrency,
    formatDate,
    getCurrentUser: () => currentUser
  };
})();
