/* =========================================================
   permissions.js — Super Admin: administrator permissions
   Depends on: js/admin-common.js (window.YaathiraiAdmin)
   API:
     GET /api/superadmin/permissions
     PUT /api/superadmin/admins/:id/permissions
   ========================================================= */

(function () {
  'use strict';

  const A = window.YaathiraiAdmin;
  const $ = (id) => document.getElementById(id);

  const PERM_LABELS = {
    manage_customers: 'Manage customers',
    manage_providers: 'Manage providers',
    manage_destinations: 'Manage destinations',
    manage_categories: 'Manage categories',
    manage_packages: 'Manage packages',
    manage_bookings: 'Manage bookings',
    view_reports: 'View reports'
  };

  let admins = [];
  let catalog = Object.keys(PERM_LABELS);
  const saved = new Map(); // admin id -> Set of saved permission names
  let loadSeq = 0;

  const permLabel = (p) =>
    PERM_LABELS[p] || String(p).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

  async function api(url, method, body) {
    const opts = { method: method || 'GET', credentials: 'include', headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      throw new Error('Your session has expired. Please log in again.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON body */ }
    if (!res.ok || !data || !data.success) {
      throw new Error((data && data.error) || 'Request failed. Please try again.');
    }
    return data;
  }

  /* ── state ── */
  function showLoading() {
    $('permLoading').hidden = false;
    $('permError').hidden = true;
    $('permContent').hidden = true;
  }
  function showError(message) {
    $('permLoading').hidden = true;
    $('permContent').hidden = true;
    $('permErrorText').textContent = message;
    $('permError').hidden = false;
  }
  function showContent() {
    $('permLoading').hidden = true;
    $('permError').hidden = true;
    $('permContent').hidden = false;
  }

  /* ── card helpers ── */
  const cardOf = (id) => document.querySelector(`.perm-card[data-id="${id}"]`);

  function currentSet(card) {
    return new Set(Array.from(card.querySelectorAll('input[name="permission"]:checked')).map((i) => i.value));
  }

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  function refreshCardState(card) {
    const id = Number(card.dataset.id);
    const now = currentSet(card);
    const dirty = !sameSet(now, saved.get(id) || new Set());
    card.querySelector('[data-act="save"]').disabled = !dirty;
    card.querySelector('.perm-dirty').hidden = !dirty;
    card.querySelector('.perm-count').textContent = `${now.size} / ${catalog.length} granted`;
  }

  function renderCards() {
    $('permList').innerHTML = admins.map((a) => {
      const active = a.status === 'active';
      const granted = new Set(a.permissions || []);
      return `
        <section class="admin-card perm-card" data-id="${Number(a.user_id)}" data-search="${A.escapeHTML((a.name + ' ' + a.email).toLowerCase())}">
          <div class="admin-card-header">
            <div class="sa-list-main">
              <strong>${A.escapeHTML(a.name)}</strong>
              <span>${A.escapeHTML(a.email)}</span>
            </div>
            <span class="sa-chip sa-chip-${active ? 'active' : 'blocked'}">${active ? 'Active' : 'Deactivated'}</span>
          </div>
          <div class="admin-card-body">
            <div class="sa-perm-grid">
              ${catalog.map((p) => `
                <label class="sa-check">
                  <input type="checkbox" name="permission" value="${A.escapeHTML(p)}" ${granted.has(p) ? 'checked' : ''} />
                  <span>${A.escapeHTML(permLabel(p))}</span>
                </label>`).join('')}
            </div>
            <div class="sa-pager">
              <span class="sa-pager-info"><span class="perm-count"></span> <span class="perm-dirty" hidden>· unsaved changes</span></span>
              <div class="sa-pager-btns">
                <button type="button" class="btn-secondary btn-sm" data-act="all">Select all</button>
                <button type="button" class="btn-secondary btn-sm" data-act="none">Clear</button>
                <button type="button" class="btn-primary btn-sm" data-act="save" disabled>Save</button>
              </div>
            </div>
          </div>
        </section>`;
    }).join('');

    document.querySelectorAll('.perm-card').forEach(refreshCardState);
    applySearch();
  }

  function applySearch() {
    const q = $('permSearch').value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.perm-card').forEach((card) => {
      const match = !q || card.dataset.search.includes(q);
      card.hidden = !match;
      if (match) shown++;
    });
    $('permCount').textContent = shown + (shown === 1 ? ' ADMIN' : ' ADMINS');
    $('permEmpty').hidden = shown > 0 || admins.length === 0 ? true : false;
    $('permNoAdmins').hidden = admins.length > 0;
  }

  async function load() {
    const seq = ++loadSeq;
    showLoading();
    try {
      const data = await api('/api/superadmin/permissions');
      if (seq !== loadSeq) return;
      admins = data.admins || [];
      if (Array.isArray(data.assignablePermissions) && data.assignablePermissions.length) {
        catalog = data.assignablePermissions;
      }
      saved.clear();
      admins.forEach((a) => saved.set(Number(a.user_id), new Set(a.permissions || [])));
      renderCards();
      showContent();
    } catch (err) {
      if (seq !== loadSeq) return;
      console.error('[Permissions] load failed', err);
      showError(err.message || 'Failed to load permissions.');
    }
  }

  async function onListClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = btn.closest('.perm-card');
    if (!card) return;
    const id = Number(card.dataset.id);

    if (btn.dataset.act === 'all' || btn.dataset.act === 'none') {
      card.querySelectorAll('input[name="permission"]').forEach((i) => { i.checked = btn.dataset.act === 'all'; });
      refreshCardState(card);
      return;
    }

    if (btn.dataset.act === 'save') {
      const perms = Array.from(currentSet(card));
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const data = await api(`/api/superadmin/admins/${id}/permissions`, 'PUT', { permissions: perms });
        saved.set(id, new Set(data.permissions || perms));
        A.showToast('Permissions updated.', 'success');
      } catch (err) {
        A.showToast(err.message, 'danger');
      } finally {
        btn.textContent = 'Save';
        refreshCardState(card);
      }
    }
  }

  /* ── init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await A.checkAuth(['super_admin']);
    if (!user) return;

    $('permList').addEventListener('click', onListClick);
    $('permList').addEventListener('change', (e) => {
      const card = e.target.closest('.perm-card');
      if (card) refreshCardState(card);
    });
    $('permSearch').addEventListener('input', applySearch);
    $('permRetryBtn').addEventListener('click', load);
    $('permRefreshBtn').addEventListener('click', load);

    load();
  });
})();