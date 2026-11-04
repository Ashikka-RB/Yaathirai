/* Shared provider layout (sidebar + topbar) and UI helpers. Load after api.js, before the page script. */
(function () {
  const ui = {};
  ui.$ = (s, r) => (r || document).querySelector(s);
  ui.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ui.money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  ui.date = (s) => (s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  ui.badge = (s) => `<span class="pv-badge pv-badge--${ui.esc(s)}">${ui.esc(String(s).replace('_', ' '))}</span>`;
  ui.stars = (n) => `<span class="pv-stars" aria-label="${n} out of 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  ui.loading = (el) => { el.innerHTML = '<div class="pv-state"><div class="pv-spinner"></div>Loading…</div>'; };
  ui.empty = (el, title, text, action) => { el.innerHTML = `<div class="pv-state"><h3>${ui.esc(title)}</h3><p>${ui.esc(text || '')}</p>${action || ''}</div>`; };
  ui.error = (el, err, retry) => {
    el.innerHTML = `<div class="pv-state"><h3>Something went wrong</h3><p>${ui.esc(err.message)}</p>${retry ? '<button class="pv-btn" data-retry>Try again</button>' : ''}</div>`;
    if (retry) ui.$('[data-retry]', el).onclick = retry;
  };
  ui.toast = (msg, type) => {
    const box = ui.$('.pv-toasts'); const t = document.createElement('div');
    t.className = 'pv-toast pv-toast--' + (type || 'ok'); t.setAttribute('role', 'status'); t.textContent = msg;
    box.appendChild(t); setTimeout(() => t.remove(), 3800);
  };
  ui.modal = (html) => {
    const o = document.createElement('div'); o.className = 'pv-overlay';
    o.innerHTML = `<div class="pv-modal" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => { o.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    o.addEventListener('click', (e) => { if (e.target === o) close(); });
    document.addEventListener('keydown', esc); document.body.appendChild(o);
    return { el: o, close };
  };
  ui.confirm = (title, text, okLabel, danger) => new Promise((resolve) => {
    const m = ui.modal(`<h3>${ui.esc(title)}</h3><p>${ui.esc(text)}</p><div class="pv-modal-actions"><button class="pv-btn pv-btn--ghost" data-no>Cancel</button><button class="pv-btn ${danger ? 'pv-btn--danger' : ''}" data-yes>${ui.esc(okLabel || 'Confirm')}</button></div>`);
    const done = (v) => { m.close(); resolve(v); };
    ui.$('[data-no]', m.el).onclick = () => done(false); ui.$('[data-yes]', m.el).onclick = () => done(true); ui.$('[data-yes]', m.el).focus();
  });
  ui.safe = async (fn, okMsg) => { try { const r = await fn(); if (okMsg) ui.toast(okMsg); return r; } catch (e) { ui.toast(e.message, 'err'); throw e; } };
  window.ProviderUI = ui;

  const NAV = [['dashboard', 'Dashboard', 'dashboard.html'], ['packages', 'My Packages', 'my-packages.html'], ['create', 'Create Package', 'create-package.html'], ['availability', 'Availability', 'availability.html'], ['bookings', 'Bookings', 'bookings.html'], ['reports', 'Earnings & Reports', 'reports.html'], ['reviews', 'Reviews', 'reviews.html']];
  const body = document.body, main = document.getElementById('provider-content'), active = body.dataset.active;
  const shell = document.createElement('div'); shell.className = 'provider-shell';
  shell.innerHTML = `<aside class="provider-sidebar" id="pvSidebar"><a class="provider-brand" href="/">yaathirai.</a><div class="provider-brand-sub pv-mono">Local tourist portal</div>
    <nav class="provider-nav" aria-label="Provider navigation">${NAV.map((n, i) => `<a href="/provider/${n[2]}" class="${n[0] === active ? 'is-active' : ''}"${n[0] === active ? ' aria-current="page"' : ''}><span>0${i + 1}</span>${n[1]}</a>`).join('')}</nav>
    <div class="provider-sidebar-foot">Mock data · in-memory only. Changes reset when the server restarts.</div><button class="provider-logout" id="pvLogout" type="button">Log out</button></aside>
    <div class="provider-main"><header class="provider-topbar"><button class="pv-menu" aria-label="Open menu" id="pvMenu">☰</button><h1>${ui.esc(body.dataset.title || '')}</h1><span class="pv-user" id="pvUser">…</span></header>
    <div class="pv-banner">Demo build: packages, bookings, payments and reviews shown here are mock data, not real transactions.</div><div id="pvSlot"></div></div>`;
  main.parentNode.insertBefore(shell, main); ui.$('#pvSlot').appendChild(main);
  const toasts = document.createElement('div'); toasts.className = 'pv-toasts'; toasts.setAttribute('aria-live', 'polite'); body.appendChild(toasts);
  ui.$('#pvMenu').onclick = () => body.classList.toggle('nav-open');
  ui.$('#pvLogout').onclick = () => { localStorage.removeItem('user'); sessionStorage.removeItem('providerDevId'); location.href = '/login.html'; };
  ProviderAPI.me().then((u) => { ui.$('#pvUser').textContent = u.name; ui.me = u; }).catch((e) => { ui.$('#pvUser').textContent = e.status === 401 || e.status === 403 ? 'Not signed in as provider' : 'Offline'; });
})();