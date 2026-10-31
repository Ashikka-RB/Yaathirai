/* =========================================================
   system-logs.js — Super Admin: system activity log viewer
   Depends on: js/admin-common.js (window.YaathiraiAdmin)
   API: GET /api/superadmin/logs?action=&search=&from=&to=&page=&limit=
   ========================================================= */

(function () {
  'use strict';

  const A = window.YaathiraiAdmin;
  const $ = (id) => document.getElementById(id);

  let page = 1;
  let totalPages = 1;
  let loadSeq = 0;
  let searchTimer = null;

  function fmtDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return A.escapeHTML(String(value));
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
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
    return `<span class="sa-chip sa-chip-${actionTone(action)}">${A.escapeHTML(String(action || '—').replace(/_/g, ' '))}</span>`;
  }

  /* ── state ── */
  function showLoading() {
    $('logsLoading').hidden = false;
    $('logsError').hidden = true;
    $('logsTableWrap').hidden = true;
    $('applyBtn').disabled = true;
  }
  function showError(message) {
    $('logsLoading').hidden = true;
    $('logsTableWrap').hidden = true;
    $('logsErrorText').textContent = message;
    $('logsError').hidden = false;
    $('applyBtn').disabled = false;
  }
  function showTable() {
    $('logsLoading').hidden = true;
    $('logsError').hidden = true;
    $('logsTableWrap').hidden = false;
    $('applyBtn').disabled = false;
  }

  function setFilterError(message) {
    const el = $('filterError');
    el.textContent = message || '';
    el.hidden = !message;
  }

  /* ── filters ── */
  function readFilters() {
    return {
      search: $('logSearch').value.trim(),
      action: $('actionFilter').value,
      from: $('fromDate').value,
      to: $('toDate').value,
      limit: $('pageSize').value
    };
  }

  function buildQuery(f) {
    const p = new URLSearchParams();
    if (f.search) p.set('search', f.search);
    if (f.action) p.set('action', f.action);
    if (f.from) p.set('from', f.from);
    if (f.to) p.set('to', f.to);
    p.set('limit', f.limit || '25');
    p.set('page', String(page));
    return '?' + p.toString();
  }

  function fillActions(actions) {
    const sel = $('actionFilter');
    const current = sel.value;
    sel.innerHTML = '<option value="">All actions</option>' +
      (actions || []).map((a) =>
        `<option value="${A.escapeHTML(a)}">${A.escapeHTML(String(a).replace(/_/g, ' '))}</option>`).join('');
    sel.value = (actions || []).includes(current) ? current : '';
  }

  /* ── render ── */
  function render(data) {
    const logs = data.logs || [];
    const pg = data.pagination || { page: 1, limit: 25, total: logs.length, totalPages: 1 };
    page = pg.page;
    totalPages = pg.totalPages;

    $('logsTbody').innerHTML = logs.length
      ? logs.map((l) => `
          <tr>
            <td class="sa-num">${fmtDateTime(l.created_at)}</td>
            <td>
              <strong>${A.escapeHTML(l.user_name || 'System')}</strong>
              ${l.user_role ? `<div class="sa-muted" style="font-size:0.75rem">${A.escapeHTML(String(l.user_role).replace('_', ' '))}</div>` : ''}
            </td>
            <td>${actionChip(l.action)}</td>
            <td>${A.escapeHTML(l.description || '')}</td>
            <td class="sa-num">${A.escapeHTML(l.ip_address || '—')}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" class="sa-empty">No log entries match these filters.</td></tr>';

    const start = pg.total === 0 ? 0 : (pg.page - 1) * pg.limit + 1;
    const end = Math.min(pg.total, pg.page * pg.limit);
    $('pagerInfo').textContent = pg.total === 0
      ? '0 ENTRIES'
      : `${start}–${end} OF ${pg.total} · PAGE ${pg.page} / ${pg.totalPages}`;
    $('prevBtn').disabled = pg.page <= 1;
    $('nextBtn').disabled = pg.page >= pg.totalPages;
    $('logCount').textContent = pg.total + (pg.total === 1 ? ' ENTRY' : ' ENTRIES');
  }

  /* ── load ── */
  async function load() {
    const f = readFilters();
    if (f.from && f.to && f.from > f.to) {
      setFilterError("The 'From' date cannot be later than the 'To' date.");
      return;
    }
    setFilterError('');

    const seq = ++loadSeq;
    showLoading();

    try {
      const res = await fetch('/api/superadmin/logs' + buildQuery(f), {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (seq !== loadSeq) return;

      if (res.status === 401) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }
      let data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON body */ }

      if (!res.ok || !data || !data.success) {
        showError((data && data.error) || 'Failed to load system logs.');
        return;
      }
      fillActions(data.actions);
      render(data);
      showTable();
    } catch (err) {
      if (seq !== loadSeq) return;
      console.error('[System Logs] load failed', err);
      showError('Could not reach the server. Check your connection and try again.');
    }
  }

  /* ── init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await A.checkAuth(['super_admin']);
    if (!user) return;

    $('logFilters').addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
    $('resetBtn').addEventListener('click', () => {
      $('logSearch').value = '';
      $('actionFilter').value = '';
      $('fromDate').value = '';
      $('toDate').value = '';
      page = 1;
      load();
    });
    $('logSearch').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { page = 1; load(); }, 350);
    });
    $('actionFilter').addEventListener('change', () => { page = 1; load(); });
    $('pageSize').addEventListener('change', () => { page = 1; load(); });
    $('prevBtn').addEventListener('click', () => { if (page > 1) { page--; load(); } });
    $('nextBtn').addEventListener('click', () => { if (page < totalPages) { page++; load(); } });
    $('refreshBtn').addEventListener('click', load);
    $('logsRetryBtn').addEventListener('click', load);

    load();
  });
})();