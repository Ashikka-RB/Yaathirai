/* =========================================================
   superadmin-dashboard.js — Super Admin console overview
   Depends on: js/admin-common.js (window.YaathiraiAdmin)
   API: GET /api/superadmin/dashboard-stats
   ========================================================= */

(function () {
  'use strict';

  const A = window.YaathiraiAdmin;
  const $ = (id) => document.getElementById(id);
  const num = (v) => Number(v) || 0;

  function fmtDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return A.escapeHTML(String(value));
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function actionTone(action) {
    const a = String(action || '');
    if (/(DELETE|DEACTIVATE|BLOCK|REJECT)/.test(a)) return 'blocked';
    if (/(CREATE|ACTIVATE|APPROVE)/.test(a)) return 'active';
    if (/LOGIN|LOGOUT/.test(a)) return 'info';
    if (/(UPDATE|PERMISSION|SETTINGS)/.test(a)) return 'warning';
    return 'muted';
  }

  function actionChip(action) {
    const label = String(action || '—').replace(/_/g, ' ');
    return `<span class="sa-chip sa-chip-${actionTone(action)}">${A.escapeHTML(label)}</span>`;
  }

  /* ── state helpers ── */
  function showLoading() {
    $('saLoading').hidden = false;
    $('saError').hidden = true;
    $('saContent').hidden = true;
  }

  function showError(message) {
    $('saLoading').hidden = true;
    $('saContent').hidden = true;
    $('saErrorText').textContent = message;
    $('saError').hidden = false;
  }

  function showContent() {
    $('saLoading').hidden = true;
    $('saError').hidden = true;
    $('saContent').hidden = false;
  }

  /* ── renderers ── */
  function renderStats(s) {
    s = s || {};
    $('kpiTotalAdmins').textContent = num(s.total_admins).toLocaleString('en-IN');
    $('kpiSuperAdmins').textContent = num(s.super_admins) + ' super admin' + (num(s.super_admins) === 1 ? '' : 's');
    $('kpiActiveAdmins').textContent = num(s.active_admins).toLocaleString('en-IN');
    $('kpiInactiveAdmins').textContent = num(s.inactive_admins).toLocaleString('en-IN');
    $('kpiTotalUsers').textContent = num(s.total_users).toLocaleString('en-IN');
    $('kpiLogsToday').textContent = num(s.logs_today).toLocaleString('en-IN');
    $('kpiLoginsToday').textContent = num(s.logins_today) + ' sign-in' + (num(s.logins_today) === 1 ? '' : 's') + ' today';
  }

  function renderRecentLogs(rows) {
    const list = rows || [];
    $('recentLogsTbody').innerHTML = list.length
      ? list.map((l) => `
          <tr>
            <td class="sa-num">${fmtDateTime(l.created_at)}</td>
            <td>${A.escapeHTML(l.user_name || 'System')}</td>
            <td>${actionChip(l.action)}</td>
            <td>${A.escapeHTML(l.description || '')}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="sa-empty">No activity has been recorded yet.</td></tr>';
  }

  function renderRecentAdmins(rows) {
    const list = rows || [];
    $('recentAdminsList').innerHTML = list.length
      ? list.map((a) => `
          <div class="sa-list-row">
            <div class="sa-list-main">
              <strong>${A.escapeHTML(a.name)}</strong>
              <span>${A.escapeHTML(a.email)}</span>
            </div>
            <span class="sa-chip sa-chip-${a.status === 'active' ? 'active' : 'blocked'}">${a.status === 'active' ? 'Active' : 'Deactivated'}</span>
          </div>`).join('')
      : '<p class="sa-empty">No administrator accounts yet.</p>';
  }

  /* ── load ── */
  async function load() {
    showLoading();
    try {
      const res = await fetch('/api/superadmin/dashboard-stats', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });

      if (res.status === 401) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      let data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON body */ }

      if (res.status === 403) {
        showError((data && data.error) || 'Access denied. Super Admin only.');
        return;
      }
      if (!res.ok || !data || !data.success) {
        showError((data && data.error) || 'Failed to load the Super Admin dashboard.');
        return;
      }

      renderStats(data.stats);
      renderRecentLogs(data.recentLogs);
      renderRecentAdmins(data.recentAdmins);
      showContent();
    } catch (err) {
      console.error('[SuperAdmin Dashboard] load failed', err);
      showError('Could not reach the server. Check your connection and try again.');
    }
  }

  /* ── init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await A.checkAuth(['super_admin']);
    if (!user) return;

    $('saRefreshBtn').addEventListener('click', load);
    $('saRetryBtn').addEventListener('click', load);
    load();
  });
})();