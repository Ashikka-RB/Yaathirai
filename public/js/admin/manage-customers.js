// ========================================================
// YAATHIRAI — MANAGE CUSTOMERS CLIENT CONTROLLER
// Search, Filter, Status Management (Block/Unblock), and Dossier Modal
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await YaathiraiAdmin.checkAuth(['admin', 'super_admin']);
  if (!user) return;

  loadCustomers();

  // Search input with debounce
  const searchInput = document.getElementById('customerSearchInput');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadCustomers(), 300);
  });

  // Status dropdown filter
  const statusFilter = document.getElementById('customerStatusFilter');
  statusFilter.addEventListener('change', () => loadCustomers());

  // Refresh button
  const refreshBtn = document.getElementById('refreshCustomersBtn');
  refreshBtn.addEventListener('click', () => loadCustomers());

  // Modal close handlers
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalCloseActionBtn').addEventListener('click', closeModal);
  document.getElementById('customerModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'customerModalBackdrop') closeModal();
  });
});

async function loadCustomers() {
  const tbody = document.getElementById('customersTbody');
  const countBadge = document.getElementById('customersCountBadge');
  const search = document.getElementById('customerSearchInput').value.trim();
  const status = document.getElementById('customerStatusFilter').value;

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/customers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch customers');

    const data = await res.json();
    const customers = data.customers || [];

    if (countBadge) countBadge.textContent = `${customers.length} Customers`;

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--muted); padding: 36px;">
            No customers match the current search or filter.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = customers.map((c) => {
      const isBlocked = c.status === 'blocked';
      return `
        <tr id="customer-row-${c.user_id}">
          <td class="mono-cell">#CUST-${String(c.user_id).padStart(4, '0')}</td>
          <td>
            <strong>${YaathiraiAdmin.escapeHTML(c.name)}</strong>
            <div style="font-size:0.75rem; color:var(--muted);">${YaathiraiAdmin.escapeHTML(c.email)}</div>
          </td>
          <td class="mono-cell">${YaathiraiAdmin.escapeHTML(c.mobile || '—')}</td>
          <td class="mono-cell" style="text-align:center;">${c.total_bookings || 0}</td>
          <td class="mono-cell" style="font-weight:700;">${YaathiraiAdmin.formatCurrency(c.total_spent || 0)}</td>
          <td class="mono-cell" style="font-size:0.75rem; color:var(--muted);">${YaathiraiAdmin.formatDate(c.created_at)}</td>
          <td>
            <span class="badge badge-${c.status}">
              <span class="badge-dot"></span>
              ${c.status}
            </span>
          </td>
          <td>
            <div class="action-group">
              <button class="action-btn" onclick="viewCustomerDetails(${c.user_id})">Details</button>
              <button class="action-btn ${isBlocked ? 'btn-outline-success' : 'btn-outline-danger'}" 
                      onclick="toggleCustomerStatus(${c.user_id}, '${isBlocked ? 'active' : 'blocked'}')">
                ${isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Load Customers Error]', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger); padding:24px;">Failed to load customers.</td></tr>`;
    YaathiraiAdmin.showToast('Could not load customer records', 'danger');
  }
}

async function toggleCustomerStatus(userId, newStatus) {
  const actionText = newStatus === 'blocked' ? 'block' : 'unblock';
  if (!confirm(`Are you sure you want to ${actionText} this customer account?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/customers/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update status');
    }

    YaathiraiAdmin.showToast(`Customer account successfully ${newStatus}.`, 'success');
    loadCustomers();
  } catch (err) {
    console.error('[Update Status Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

async function viewCustomerDetails(userId) {
  try {
    const res = await fetch(`/api/admin/customers/${userId}`);
    if (!res.ok) throw new Error('Customer not found');

    const data = await res.json();
    const c = data.customer;
    const bookings = data.bookings || [];

    document.getElementById('modalCustomerName').textContent = c.name;
    document.getElementById('modalCustomerId').textContent = `#CUST-${String(c.user_id).padStart(4, '0')}`;
    document.getElementById('modalCustomerEmail').textContent = c.email;
    document.getElementById('modalCustomerMobile').textContent = c.mobile || 'Not provided';
    document.getElementById('modalCustomerStatusBadge').innerHTML = `
      <span class="badge badge-${c.status}">
        <span class="badge-dot"></span>
        ${c.status}
      </span>
    `;

    const bTbody = document.getElementById('modalBookingsTbody');
    if (bookings.length === 0) {
      bTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">No bookings found for this customer.</td></tr>`;
    } else {
      bTbody.innerHTML = bookings.map((b) => `
        <tr>
          <td class="mono-cell">#BK-${String(b.booking_id).padStart(4, '0')}</td>
          <td>
            <strong>${YaathiraiAdmin.escapeHTML(b.package_title || 'Package #' + b.package_id)}</strong>
            <div style="font-size:0.75rem; color:var(--muted); font-family:'Space Mono';">${YaathiraiAdmin.escapeHTML(b.destination_name || '')}</div>
          </td>
          <td class="mono-cell">${b.travelers}</td>
          <td class="mono-cell" style="font-weight:700;">${YaathiraiAdmin.formatCurrency(b.total_amount)}</td>
          <td>
            <span class="badge badge-${b.booking_status}">
              ${b.booking_status}
            </span>
          </td>
        </tr>
      `).join('');
    }

    document.getElementById('customerModalBackdrop').classList.add('is-open');
  } catch (err) {
    console.error('[Customer Details Error]', err);
    YaathiraiAdmin.showToast('Could not load customer dossier', 'danger');
  }
}

function closeModal() {
  document.getElementById('customerModalBackdrop').classList.remove('is-open');
}

window.toggleCustomerStatus = toggleCustomerStatus;
window.viewCustomerDetails = viewCustomerDetails;
