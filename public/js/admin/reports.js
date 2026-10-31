/* =========================================================
   reports.js — Admin: Reports & Analytics controller
   Yaathirai Local Tourism Package Booking System
   Depends on: js/admin-common.js (window.YaathiraiAdmin)
   API: GET /api/admin/reports?from=&to=&destination_id=
   ========================================================= */

(function () {
  'use strict';

  const A = window.YaathiraiAdmin;
  const $ = (id) => document.getElementById(id);

  let requestSeq = 0;          // ignore out-of-date responses
  let destinationsLoaded = false;

  /* ── helpers ── */
  const num = (v) => Number(v) || 0;
  const money = (v) => A.formatCurrency(num(v));

  function monthLabel(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return A.escapeHTML(ym || '—');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  function chip(status) {
    const s = String(status || '').toLowerCase();
    const known = ['confirmed', 'pending', 'cancelled', 'completed'];
    const cls = known.includes(s) ? s : 'pending';
    return `<span class="rp-chip rp-chip-${cls}">${A.escapeHTML(s || '—')}</span>`;
  }

  function emptyRow(cols, text) {
    return `<tr><td colspan="${cols}" class="rp-empty">${A.escapeHTML(text)}</td></tr>`;
  }

  /* ── UI state ── */
  function showLoading() {
    $('reportLoading').hidden = false;
    $('reportError').hidden = true;
    $('reportContent').hidden = true;
    $('applyFiltersBtn').disabled = true;
  }

  function showError(message) {
    $('reportLoading').hidden = true;
    $('reportContent').hidden = true;
    $('reportErrorText').textContent = message;
    $('reportError').hidden = false;
    $('applyFiltersBtn').disabled = false;
  }

  function showContent() {
    $('reportLoading').hidden = true;
    $('reportError').hidden = true;
    $('reportContent').hidden = false;
    $('applyFiltersBtn').disabled = false;
  }

  function setFilterError(message) {
    const el = $('filterError');
    el.textContent = message || '';
    el.hidden = !message;
  }

  /* ── filters ── */
  function readFilters() {
    return {
      from: $('filterFrom').value,
      to: $('filterTo').value,
      destination_id: $('filterDestination').value
    };
  }

  function validateFilters(f) {
    if (f.from && f.to && f.from > f.to) {
      return "The 'From' date cannot be later than the 'To' date.";
    }
    return '';
  }

  function buildQuery(f) {
    const p = new URLSearchParams();
    if (f.from) p.set('from', f.from);
    if (f.to) p.set('to', f.to);
    if (f.destination_id) p.set('destination_id', f.destination_id);
    const qs = p.toString();
    return qs ? '?' + qs : '';
  }

  function fillDestinations(list) {
    if (destinationsLoaded) return;
    const sel = $('filterDestination');
    (list || []).forEach((d) => {
      const opt = document.createElement('option');
      opt.value = String(d.destination_id);
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
    destinationsLoaded = true;
  }

  /* ── renderers ── */
  function renderRange(filters) {
    const f = filters || {};
    let text = 'Showing: ';
    if (f.from || f.to) {
      text += (f.from ? A.formatDate(f.from) : 'the beginning') + ' → ' + (f.to ? A.formatDate(f.to) : 'today');
    } else {
      text += 'all time';
    }
    const sel = $('filterDestination');
    if (f.destination_id) {
      const opt = sel.querySelector(`option[value="${f.destination_id}"]`);
      text += ' · ' + (opt ? opt.textContent : 'selected destination');
    } else {
      text += ' · all destinations';
    }
    $('rangeLabel').textContent = text;
  }

  function renderKpis(t) {
    t = t || {};
    $('kpiBookings').textContent = num(t.total_bookings).toLocaleString('en-IN');
    $('kpiTravelers').textContent = num(t.total_travelers).toLocaleString('en-IN') + ' travelers';
    $('kpiCollected').textContent = money(t.collected_revenue);
    $('kpiPending').textContent = money(t.pending_revenue);
    $('kpiRefunded').textContent = money(t.refunded_amount);
    $('kpiBookedValue').textContent = money(t.booked_value);
  }

  function renderStatus(rows) {
    const order = ['pending', 'confirmed', 'completed', 'cancelled'];
    const sorted = (rows || []).slice().sort(
      (a, b) => order.indexOf(a.booking_status) - order.indexOf(b.booking_status)
    );
    $('statusTbody').innerHTML = sorted.length
      ? sorted.map((r) => `
          <tr>
            <td>${chip(r.booking_status)}</td>
            <td class="rp-num">${num(r.count).toLocaleString('en-IN')}</td>
            <td class="rp-num">${money(r.amount)}</td>
          </tr>`).join('')
      : emptyRow(3, 'No bookings match these filters.');
  }

  function renderTrend(rows, filters) {
    const list = rows || [];
    const f = filters || {};
    $('trendNote').textContent = (f.from || f.to) ? 'SELECTED RANGE' : 'LAST 6 MONTHS';

    if (!list.length) {
      $('trendList').innerHTML = '<p class="rp-empty">No bookings in this period.</p>';
      return;
    }
    const max = Math.max(1, ...list.map((r) => num(r.revenue)));
    $('trendList').innerHTML = list.map((r) => {
      const pct = Math.round((num(r.revenue) / max) * 100);
      return `
        <div class="rp-trend-row">
          <span class="rp-trend-month">${monthLabel(r.month)}</span>
          <div class="rp-bar-track"><div class="rp-bar-fill" style="width:${pct}%"></div></div>
          <span class="rp-trend-meta">${money(r.revenue)} collected · ${num(r.bookings)} booking${num(r.bookings) === 1 ? '' : 's'}</span>
        </div>`;
    }).join('');
  }

  function renderDestinations(rows) {
    const list = rows || [];
    $('destinationTbody').innerHTML = list.length
      ? list.map((r) => `
          <tr>
            <td><strong>${A.escapeHTML(r.destination_name)}</strong></td>
            <td class="rp-num">${num(r.package_count)}</td>
            <td class="rp-num">${num(r.booking_count)}</td>
            <td class="rp-num">${money(r.revenue)}</td>
          </tr>`).join('')
      : emptyRow(4, 'No destinations found.');
  }

  function renderPackages(rows) {
    const list = rows || [];
    $('packagesTbody').innerHTML = list.length
      ? list.map((r, i) => `
          <tr>
            <td class="rp-num">${i + 1}</td>
            <td><strong>${A.escapeHTML(r.package_name)}</strong></td>
            <td>${A.escapeHTML(r.destination_name)}</td>
            <td>${A.escapeHTML(r.provider_name)}</td>
            <td class="rp-num">${num(r.booking_count)}</td>
            <td class="rp-num">${money(r.revenue)}</td>
          </tr>`).join('')
      : emptyRow(6, 'No package bookings in this period.');
  }

  /* ── data load ── */
  async function loadReports() {
    const filters = readFilters();
    const problem = validateFilters(filters);
    setFilterError(problem);
    if (problem) return;

    const seq = ++requestSeq;
    showLoading();

    try {
      const res = await fetch('/api/admin/reports' + buildQuery(filters), {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });

      if (seq !== requestSeq) return; // a newer request superseded this one

      if (res.status === 401) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      let data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON body */ }

      if (res.status === 403) {
        showError((data && data.error) || 'You do not have permission to view reports.');
        return;
      }
      if (!res.ok || !data || !data.success) {
        showError((data && data.error) || 'Failed to load reports. Please try again.');
        return;
      }

      fillDestinations(data.destinations);
      renderRange(data.filters);
      renderKpis(data.revenueTotals);
      renderStatus(data.bookingSummary);
      renderTrend(data.monthlyTrend, data.filters);
      renderDestinations(data.destinationStats);
      renderPackages(data.topPackages);
      showContent();
    } catch (err) {
      if (seq !== requestSeq) return;
      console.error('[Reports] load failed', err);
      showError('Could not reach the server. Check your connection and try again.');
    }
  }

  /* ── init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await A.checkAuth(['admin', 'super_admin']);
    if (!user) return;

    $('reportFilters').addEventListener('submit', (e) => {
      e.preventDefault();
      loadReports();
    });

    $('resetFiltersBtn').addEventListener('click', () => {
      $('filterFrom').value = '';
      $('filterTo').value = '';
      $('filterDestination').value = '';
      loadReports();
    });

    $('refreshReportsBtn').addEventListener('click', loadReports);
    $('retryReportsBtn').addEventListener('click', loadReports);

    loadReports();
  });
})();