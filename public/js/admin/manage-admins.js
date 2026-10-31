/* =========================================================
   manage-admins.js — Super Admin: administrator accounts
   Depends on: js/admin-common.js (window.YaathiraiAdmin)
   API:
     GET    /api/superadmin/admins?search=&status=
     POST   /api/superadmin/admins
     PUT    /api/superadmin/admins/:id
     PATCH  /api/superadmin/admins/:id/status
     DELETE /api/superadmin/admins/:id
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

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  let admins = [];
  let assignable = Object.keys(PERM_LABELS);
  let listSeq = 0;
  let searchTimer = null;
  let editingId = null;      // null = creating
  let saving = false;
  let pendingConfirm = null; // async function run when the confirm modal is accepted

  /* ── helpers ── */
  const permLabel = (p) =>
    PERM_LABELS[p] || String(p).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

  async function api(url, method, body) {
    const opts = {
      method: method || 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    };
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

  /* ── list state ── */
  function showLoading() {
    $('adminsLoading').hidden = false;
    $('adminsError').hidden = true;
    $('adminsTableWrap').hidden = true;
  }
  function showError(message) {
    $('adminsLoading').hidden = true;
    $('adminsTableWrap').hidden = true;
    $('adminsErrorText').textContent = message;
    $('adminsError').hidden = false;
  }
  function showTable() {
    $('adminsLoading').hidden = true;
    $('adminsError').hidden = true;
    $('adminsTableWrap').hidden = false;
  }

  function renderTable() {
    $('adminCount').textContent = admins.length + (admins.length === 1 ? ' ADMIN' : ' ADMINS');

    if (!admins.length) {
      const filtered = $('adminSearch').value.trim() || $('statusFilter').value;
      $('adminsTbody').innerHTML = `<tr><td colspan="6" class="sa-empty">${
        filtered ? 'No administrators match your filters.' : 'No administrator accounts yet. Use “Add Administrator” to create one.'
      }</td></tr>`;
      return;
    }

    $('adminsTbody').innerHTML = admins.map((a) => {
      const active = a.status === 'active';
      const permCount = (a.permissions || []).length;
      const permTitle = permCount ? a.permissions.map(permLabel).join(', ') : 'No permissions assigned';
      return `
        <tr>
          <td>
            <strong>${A.escapeHTML(a.name)}</strong>
            <div class="sa-muted" style="font-size:0.78rem">${A.escapeHTML(a.email)}</div>
          </td>
          <td>${A.escapeHTML(a.mobile || '—')}</td>
          <td><span class="sa-chip sa-chip-${active ? 'active' : 'blocked'}">${active ? 'Active' : 'Deactivated'}</span></td>
          <td><span class="sa-chip sa-chip-${permCount ? 'info' : 'muted'}" title="${A.escapeHTML(permTitle)}">${permCount} / ${assignable.length}</span></td>
          <td class="sa-num">${A.formatDate(a.created_at)}</td>
          <td>
            <div class="sa-actions-cell">
              <button class="btn-secondary btn-sm" data-act="edit" data-id="${Number(a.user_id)}">Edit</button>
              <button class="btn-secondary btn-sm" data-act="toggle" data-id="${Number(a.user_id)}">${active ? 'Deactivate' : 'Activate'}</button>
              <button class="btn-danger btn-sm" data-act="delete" data-id="${Number(a.user_id)}">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  async function loadAdmins() {
    const seq = ++listSeq;
    showLoading();
    const p = new URLSearchParams();
    const search = $('adminSearch').value.trim();
    const status = $('statusFilter').value;
    if (search) p.set('search', search);
    if (status) p.set('status', status);

    try {
      const data = await api('/api/superadmin/admins' + (p.toString() ? '?' + p.toString() : ''));
      if (seq !== listSeq) return;
      admins = data.admins || [];
      if (Array.isArray(data.assignablePermissions) && data.assignablePermissions.length) {
        assignable = data.assignablePermissions;
      }
      renderTable();
      showTable();
    } catch (err) {
      if (seq !== listSeq) return;
      console.error('[Manage Admins] load failed', err);
      showError(err.message || 'Failed to load administrators.');
    }
  }

  /* ── modals ── */
  function openModal(id) { $(id).classList.add('is-open'); }
  function closeModal(id) { $(id).classList.remove('is-open'); }

  function renderPermGrid(selected) {
    const chosen = new Set(selected || []);
    $('adminPermGrid').innerHTML = assignable.map((p) => `
      <label class="sa-check">
        <input type="checkbox" name="permission" value="${A.escapeHTML(p)}" ${chosen.has(p) ? 'checked' : ''} />
        <span>${A.escapeHTML(permLabel(p))}</span>
      </label>`).join('');
  }

  function setFormError(message) {
    const el = $('adminFormError');
    el.textContent = message || '';
    el.hidden = !message;
  }

  function openForm(admin) {
    editingId = admin ? Number(admin.user_id) : null;
    $('adminForm').reset();
    setFormError('');
    ['adminName', 'adminEmail', 'adminMobile', 'adminPassword'].forEach((id) => $(id).classList.remove('is-invalid'));

    if (admin) {
      $('adminModalTitle').textContent = 'Edit Administrator';
      $('adminName').value = admin.name || '';
      $('adminEmail').value = admin.email || '';
      $('adminMobile').value = admin.mobile || '';
      $('adminPasswordLabel').textContent = 'New Password (optional)';
      $('adminPasswordHint').textContent = 'Leave blank to keep the current password.';
      $('adminPermSection').hidden = true;
      $('adminSubmitBtn').textContent = 'Save Changes';
    } else {
      $('adminModalTitle').textContent = 'Add Administrator';
      $('adminPasswordLabel').textContent = 'Password';
      $('adminPasswordHint').textContent = 'At least 8 characters.';
      $('adminPermSection').hidden = false;
      renderPermGrid([]);
      $('adminSubmitBtn').textContent = 'Create Administrator';
    }
    openModal('adminModal');
    $('adminName').focus();
  }

  function validateForm() {
    const name = $('adminName').value.trim();
    const email = $('adminEmail').value.trim();
    const mobile = $('adminMobile').value.trim();
    const password = $('adminPassword').value;
    const errors = [];
    const bad = [];

    if (name.length < 2 || name.length > 100) { errors.push('Name must be between 2 and 100 characters.'); bad.push('adminName'); }
    if (!EMAIL_RE.test(email)) { errors.push('Enter a valid email address.'); bad.push('adminEmail'); }
    if (mobile && !/^[0-9+\-\s]{7,20}$/.test(mobile)) { errors.push('Enter a valid mobile number.'); bad.push('adminMobile'); }
    if ((editingId === null || password) && password.length < 8) {
      errors.push('Password must be at least 8 characters.'); bad.push('adminPassword');
    }

    ['adminName', 'adminEmail', 'adminMobile', 'adminPassword'].forEach((id) =>
      $(id).classList.toggle('is-invalid', bad.includes(id)));

    return { errors, value: { name, email, mobile, password } };
  }

  async function submitForm(e) {
    e.preventDefault();
    if (saving) return;

    const { errors, value } = validateForm();
    if (errors.length) { setFormError(errors.join(' ')); return; }
    setFormError('');

    const payload = { name: value.name, email: value.email, mobile: value.mobile };
    if (value.password) payload.password = value.password;

    const creating = editingId === null;
    if (creating) {
      payload.permissions = Array.from(
        $('adminPermGrid').querySelectorAll('input[name="permission"]:checked')
      ).map((i) => i.value);
    }

    saving = true;
    $('adminSubmitBtn').disabled = true;
    try {
      if (creating) {
        await api('/api/superadmin/admins', 'POST', payload);
        A.showToast('Administrator created.', 'success');
      } else {
        await api('/api/superadmin/admins/' + editingId, 'PUT', payload);
        A.showToast('Administrator updated.', 'success');
      }
      closeModal('adminModal');
      await loadAdmins();
    } catch (err) {
      setFormError(err.message);
    } finally {
      saving = false;
      $('adminSubmitBtn').disabled = false;
    }
  }

  function openConfirm({ title, message, okText, danger, run }) {
    $('confirmTitle').textContent = title;
    $('confirmMessage').textContent = message;
    const ok = $('confirmOkBtn');
    ok.textContent = okText;
    ok.className = (danger ? 'btn-danger' : 'btn-primary') + ' btn-sm';
    ok.disabled = false;
    pendingConfirm = run;
    openModal('confirmModal');
  }

  async function acceptConfirm() {
    if (!pendingConfirm) return;
    const run = pendingConfirm;
    const ok = $('confirmOkBtn');
    ok.disabled = true;
    try {
      await run();
    } catch (err) {
      A.showToast(err.message, 'danger');
    } finally {
      pendingConfirm = null;
      closeModal('confirmModal');
      await loadAdmins();
    }
  }

  /* ── row actions ── */
  function onTableClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const admin = admins.find((a) => Number(a.user_id) === id);
    if (!admin) return;

    if (btn.dataset.act === 'edit') {
      openForm(admin);
    } else if (btn.dataset.act === 'toggle') {
      const deactivating = admin.status === 'active';
      openConfirm({
        title: deactivating ? 'Deactivate administrator?' : 'Activate administrator?',
        message: deactivating
          ? `${admin.name} will no longer be able to sign in to the admin area. You can activate the account again later.`
          : `${admin.name} will be able to sign in to the admin area again.`,
        okText: deactivating ? 'Deactivate' : 'Activate',
        danger: deactivating,
        run: async () => {
          await api(`/api/superadmin/admins/${id}/status`, 'PATCH', { status: deactivating ? 'blocked' : 'active' });
          A.showToast(`Administrator ${deactivating ? 'deactivated' : 'activated'}.`, 'success');
        }
      });
    } else if (btn.dataset.act === 'delete') {
      openConfirm({
        title: 'Delete administrator?',
        message: `This permanently deletes ${admin.name} (${admin.email}) and their permissions. This cannot be undone.`,
        okText: 'Delete',
        danger: true,
        run: async () => {
          await api(`/api/superadmin/admins/${id}`, 'DELETE');
          A.showToast('Administrator deleted.', 'success');
        }
      });
    }
  }

  /* ── init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await A.checkAuth(['super_admin']);
    if (!user) return;

    $('adminSearch').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadAdmins, 300);
    });
    $('statusFilter').addEventListener('change', loadAdmins);
    $('addAdminBtn').addEventListener('click', () => openForm(null));
    $('adminsRetryBtn').addEventListener('click', loadAdmins);
    $('adminsTbody').addEventListener('click', onTableClick);

    $('adminForm').addEventListener('submit', submitForm);
    $('adminCancelBtn').addEventListener('click', () => closeModal('adminModal'));
    $('adminModalClose').addEventListener('click', () => closeModal('adminModal'));

    $('confirmOkBtn').addEventListener('click', acceptConfirm);
    $('confirmCancelBtn').addEventListener('click', () => { pendingConfirm = null; closeModal('confirmModal'); });

    ['adminModal', 'confirmModal'].forEach((id) => {
      $(id).addEventListener('click', (e) => {
        if (e.target === $(id)) { if (id === 'confirmModal') pendingConfirm = null; closeModal(id); }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { pendingConfirm = null; closeModal('adminModal'); closeModal('confirmModal'); }
    });

    loadAdmins();
  });
})();