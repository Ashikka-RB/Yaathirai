/* =========================================================
   manage-bookings.js — Admin: Manage Bookings controller
   Yaathirai Local Tourism Package Booking System
   ========================================================= */

(function () {
  'use strict';

  /* ── state ── */
  let currentBookingId = null;
  let searchTimer = null;

  /* ── DOM refs (resolved after DOMContentLoaded) ── */
  let searchInput, bookingStatusFilter, paymentStatusFilter;
  let bookingsTbody, bookingsCountBadge;
  let bookingModalBackdrop, modalBookingRef;
  let modalCustomerName, modalCustomerContact;
  let modalPackageName, modalDestination;
  let modalAmount, modalTravelers;
  let modalBookingStatusBadge, modalPaymentStatusBadge;
  let modalBookingStatusSelect, modalPaymentStatusSelect;
  let saveBookingStatusBtn, bookingModalCloseBtn, bookingModalCloseActionBtn;

  /* ── helpers ── */
  const api = (url, opts) => fetch(url, { credentials: 'include', ...opts });

  function statusClass(val, type) {
    if (type === 'booking') {
      const map = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' };
      return map[val] || 'muted';
    }
    if (type === 'payment') {
      const map = { paid: 'success', pending: 'warning', refunded: 'info', failed: 'danger' };
      return map[val] || 'muted';
    }
    return 'muted';
  }

  function badgeHTML(val, type) {
    const cls = statusClass(val, type);
    return `<span class="badge badge-${cls}">${window.YaathiraiAdmin.escapeHTML(String(val || '—'))}</span>`;
  }

  /* ── load bookings ── */
  function buildQuery() {
    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    if (q) params.set('search', q);
    const bs = bookingStatusFilter.value;
    if (bs) params.set('booking_status', bs);
    const ps = paymentStatusFilter.value;
    if (ps) params.set('payment_status', ps);
    return params.toString();
  }

  async function loadBookings() {
    bookingsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--muted);">Loading…</td></tr>`;
    try {
      const qs = buildQuery();
      const res = await api(`/api/admin/bookings${qs ? '?' + qs : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const bookings = data.bookings || data;
      renderBookings(bookings);
    } catch (err) {
      console.error('loadBookings error:', err);
      bookingsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:2rem;">Failed to load bookings. ${window.YaathiraiAdmin.escapeHTML(err.message)}</td></tr>`;
      window.YaathiraiAdmin.showToast('Failed to load bookings', 'error');
    }
  }

  function renderBookings(bookings) {
    if (!bookings || !bookings.length) {
      bookingsCountBadge.textContent = '0';
      bookingsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--muted);">No bookings found.</td></tr>`;
      return;
    }
    bookingsCountBadge.textContent = bookings.length;
    const escHTML = window.YaathiraiAdmin.escapeHTML;
    const fmtDate = window.YaathiraiAdmin.formatDate;
    const fmtCurr = window.YaathiraiAdmin.formatCurrency;

    bookingsTbody.innerHTML = bookings.map(b => {
      const ref = escHTML(b.booking_reference || `#${b.booking_id}`);
      const customer = escHTML(b.customer_name || b.customer_email || '—');
      const pkg = escHTML(b.package_name || '—');
      const dest = escHTML(b.destination_name || '—');
      const date = fmtDate(b.booking_date || b.created_at);
      const amount = fmtCurr(b.total_price || b.total_amount || 0);
      const bsBadge = badgeHTML(b.booking_status, 'booking');
      const psBadge = badgeHTML(b.payment_status, 'payment');
      return `
        <tr>
          <td><code class="ref-code">${ref}</code></td>
          <td>${customer}</td>
          <td>${pkg}</td>
          <td>${dest}</td>
          <td>${date}</td>
          <td>${amount}</td>
          <td>${bsBadge}</td>
          <td>${psBadge}</td>
          <td>
            <button class="btn-icon btn-view" title="View / Update" onclick="viewBookingDetails(${b.booking_id})">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </td>
        </tr>`;
    }).join('');
  }

  /* ── view booking details modal ── */
  window.viewBookingDetails = async function (bookingId) {
    currentBookingId = bookingId;
    modalBookingRef.textContent = '…';
    modalCustomerName.textContent = '…';
    modalCustomerContact.textContent = '…';
    modalPackageName.textContent = '…';
    modalDestination.textContent = '…';
    modalAmount.textContent = '…';
    modalTravelers.textContent = '…';
    modalBookingStatusBadge.innerHTML = '';
    modalPaymentStatusBadge.innerHTML = '';
    modalBookingStatusSelect.value = '';
    modalPaymentStatusSelect.value = '';
    openModal();

    try {
      const res = await api(`/api/admin/bookings/${bookingId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const b = await res.json();

      const escHTML = window.YaathiraiAdmin.escapeHTML;
      const fmtDate = window.YaathiraiAdmin.formatDate;
      const fmtCurr = window.YaathiraiAdmin.formatCurrency;

      modalBookingRef.textContent = b.booking_reference || `#${b.booking_id}`;
      modalCustomerName.textContent = b.customer_name || b.customer_email || '—';
      modalCustomerContact.textContent = b.customer_phone || b.customer_email || '—';
      modalPackageName.textContent = b.package_name || '—';
      modalDestination.textContent = b.destination_name || '—';
      modalAmount.textContent = fmtCurr(b.total_price || b.total_amount || 0);
      modalTravelers.textContent = b.num_travelers || b.travelers || 1;
      modalBookingStatusBadge.innerHTML = badgeHTML(b.booking_status, 'booking');
      modalPaymentStatusBadge.innerHTML = badgeHTML(b.payment_status, 'payment');

      // Populate selects
      if (b.booking_status) modalBookingStatusSelect.value = b.booking_status;
      if (b.payment_status) modalPaymentStatusSelect.value = b.payment_status;
    } catch (err) {
      console.error('viewBookingDetails error:', err);
      window.YaathiraiAdmin.showToast('Failed to load booking details', 'error');
      closeModal();
    }
  };

  /* ── save booking status ── */
  async function saveBookingStatus() {
    if (!currentBookingId) return;
    const booking_status = modalBookingStatusSelect.value;
    const payment_status = modalPaymentStatusSelect.value;

    if (!booking_status || !payment_status) {
      window.YaathiraiAdmin.showToast('Please select both statuses', 'error');
      return;
    }

    saveBookingStatusBtn.disabled = true;
    saveBookingStatusBtn.textContent = 'Saving…';

    try {
      const res = await api(`/api/admin/bookings/${currentBookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_status, payment_status })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      window.YaathiraiAdmin.showToast('Booking status updated', 'success');
      closeModal();
      await loadBookings();
    } catch (err) {
      console.error('saveBookingStatus error:', err);
      window.YaathiraiAdmin.showToast('Update failed: ' + err.message, 'error');
    } finally {
      saveBookingStatusBtn.disabled = false;
      saveBookingStatusBtn.textContent = 'Save Changes';
    }
  }

  /* ── modal helpers ── */
  function openModal() {
    bookingModalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    bookingModalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    currentBookingId = null;
  }

  /* ── debounced search ── */
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadBookings, 300);
  }

  /* ── init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    // Auth guard
    await window.YaathiraiAdmin.checkAuth(['admin', 'super_admin']);

    // Resolve DOM refs
    searchInput = document.getElementById('bookingSearchInput');
    bookingStatusFilter = document.getElementById('bookingStatusFilter');
    paymentStatusFilter = document.getElementById('paymentStatusFilter');
    bookingsTbody = document.getElementById('bookingsTbody');
    bookingsCountBadge = document.getElementById('bookingsCountBadge');
    bookingModalBackdrop = document.getElementById('bookingModalBackdrop');
    modalBookingRef = document.getElementById('modalBookingRef');
    modalCustomerName = document.getElementById('modalBookingCustomerName');
    modalCustomerContact = document.getElementById('modalBookingCustomerContact');
    modalPackageName = document.getElementById('modalBookingPackage');
    modalDestination = document.getElementById('modalBookingDestination');
    modalAmount = document.getElementById('modalBookingAmount');
    modalTravelers = document.getElementById('modalBookingTravelers');
    modalBookingStatusBadge = document.getElementById('modalBookingStatusBadge');
    modalPaymentStatusBadge = document.getElementById('modalPaymentStatusBadge');
    modalBookingStatusSelect = document.getElementById('modalBookingStatusSelect');
    modalPaymentStatusSelect = document.getElementById('modalPaymentStatusSelect');
    saveBookingStatusBtn = document.getElementById('saveBookingStatusBtn');
    bookingModalCloseBtn = document.getElementById('bookingModalCloseBtn');
    bookingModalCloseActionBtn = document.getElementById('bookingModalCloseActionBtn');

    // Event listeners
    if (searchInput) searchInput.addEventListener('input', onSearch);
    if (bookingStatusFilter) bookingStatusFilter.addEventListener('change', loadBookings);
    if (paymentStatusFilter) paymentStatusFilter.addEventListener('change', loadBookings);
    if (saveBookingStatusBtn) saveBookingStatusBtn.addEventListener('click', saveBookingStatus);
    if (bookingModalCloseBtn) bookingModalCloseBtn.addEventListener('click', closeModal);
    if (bookingModalCloseActionBtn) bookingModalCloseActionBtn.addEventListener('click', closeModal);
    if (bookingModalBackdrop) {
      bookingModalBackdrop.addEventListener('click', e => {
        if (e.target === bookingModalBackdrop) closeModal();
      });
    }

    // Initial load
    await loadBookings();
  });
})();
