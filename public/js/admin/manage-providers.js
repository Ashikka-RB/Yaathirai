// ========================================================
// YAATHIRAI — MANAGE PROVIDERS CLIENT CONTROLLER
// Search, Filter, Status Management (Approve/Reject/Block), and Dossier Modal
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await YaathiraiAdmin.checkAuth(['admin', 'super_admin']);
  if (!user) return;

  // Check if URL contains ?id=... (from dashboard link)
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');

  loadProviders();

  if (targetId) {
    setTimeout(() => viewProviderDetails(targetId), 400);
  }

  // Search input with debounce
  const searchInput = document.getElementById('providerSearchInput');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadProviders(), 300);
  });

  // Status dropdown filter
  const statusFilter = document.getElementById('providerStatusFilter');
  statusFilter.addEventListener('change', () => loadProviders());

  // Refresh button
  const refreshBtn = document.getElementById('refreshProvidersBtn');
  refreshBtn.addEventListener('click', () => loadProviders());

  // Modal close handlers
  document.getElementById('providerModalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('providerModalCloseActionBtn').addEventListener('click', closeModal);
  document.getElementById('providerModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'providerModalBackdrop') closeModal();
  });
});

async function loadProviders() {
  const tbody = document.getElementById('providersTbody');
  const countBadge = document.getElementById('providersCountBadge');
  const search = document.getElementById('providerSearchInput').value.trim();
  const status = document.getElementById('providerStatusFilter').value;

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/providers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch providers');

    const data = await res.json();
    const providers = data.providers || [];

    if (countBadge) countBadge.textContent = `${providers.length} Providers`;

    // Also update sidebar badge if pending count exists
    const pendingCount = providers.filter((p) => p.status === 'pending').length;
    const badgeProv = document.getElementById('pendingProvidersBadge');
    if (badgeProv) badgeProv.textContent = pendingCount;

    if (providers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--muted); padding: 36px;">
            No providers match the current search or filter.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = providers.map((p) => {
      let actionButtons = '';

      if (p.status === 'pending') {
        actionButtons = `
          <button class="action-btn btn-outline-success" onclick="updateProviderStatus(${p.user_id}, 'active', 'Approve')">Approve</button>
          <button class="action-btn btn-outline-danger" onclick="updateProviderStatus(${p.user_id}, 'rejected', 'Reject')">Reject</button>
        `;
      } else if (p.status === 'active') {
        actionButtons = `
          <button class="action-btn btn-outline-danger" onclick="updateProviderStatus(${p.user_id}, 'blocked', 'Block')">Block</button>
        `;
      } else if (p.status === 'blocked') {
        actionButtons = `
          <button class="action-btn btn-outline-success" onclick="updateProviderStatus(${p.user_id}, 'active', 'Unblock')">Unblock</button>
        `;
      } else if (p.status === 'rejected') {
        actionButtons = `
          <button class="action-btn btn-outline-success" onclick="updateProviderStatus(${p.user_id}, 'active', 'Re-Approve')">Re-Approve</button>
        `;
      }

      return `
        <tr id="provider-row-${p.user_id}">
          <td class="mono-cell">#PROV-${String(p.user_id).padStart(4, '0')}</td>
          <td>
            <strong>${YaathiraiAdmin.escapeHTML(p.name)}</strong>
            <div style="font-size:0.75rem; color:var(--muted);">${YaathiraiAdmin.escapeHTML(p.email)}</div>
          </td>
          <td class="mono-cell">${YaathiraiAdmin.escapeHTML(p.mobile || '—')}</td>
          <td class="mono-cell" style="text-align:center;">${p.total_packages || 0}</td>
          <td class="mono-cell" style="font-size:0.75rem; color:var(--muted);">${YaathiraiAdmin.formatDate(p.created_at)}</td>
          <td>
            <span class="badge badge-${p.status}">
              <span class="badge-dot"></span>
              ${p.status}
            </span>
          </td>
          <td>
            <div class="action-group">
              <button class="action-btn" onclick="viewProviderDetails(${p.user_id})">Details</button>
              ${actionButtons}
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Load Providers Error]', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:24px;">Failed to load providers.</td></tr>`;
    YaathiraiAdmin.showToast('Could not load provider accounts', 'danger');
  }
}

async function updateProviderStatus(userId, newStatus, actionVerb = 'Update') {
  if (!confirm(`Are you sure you want to ${actionVerb.toLowerCase()} this provider?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/providers/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update status');
    }

    YaathiraiAdmin.showToast(`Provider status successfully changed to '${newStatus}'.`, 'success');
    loadProviders();
  } catch (err) {
    console.error('[Update Status Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

async function viewProviderDetails(userId) {
  try {
    const res = await fetch(`/api/admin/providers/${userId}`);
    if (!res.ok) throw new Error('Provider not found');

    const data = await res.json();
    const p = data.provider;
    const packages = data.packages || [];

    document.getElementById('modalProviderName').textContent = p.name;
    document.getElementById('modalProviderId').textContent = `#PROV-${String(p.user_id).padStart(4, '0')}`;
    document.getElementById('modalProviderEmail').textContent = p.email;
    document.getElementById('modalProviderMobile').textContent = p.mobile || 'Not provided';
    document.getElementById('modalProviderStatusBadge').innerHTML = `
      <span class="badge badge-${p.status}">
        <span class="badge-dot"></span>
        ${p.status}
      </span>
    `;

    const pkgContainer = document.getElementById('modalPackagesList');
    if (packages.length === 0) {
      pkgContainer.innerHTML = `<p style="grid-column: 1/-1; color:var(--muted); font-size:0.85rem; padding: 16px;">This provider has not submitted any tour packages yet.</p>`;
    } else {
      pkgContainer.innerHTML = packages.map((pkg) => `
        <div class="pkg-mini-card">
          <img class="pkg-mini-img" src="${YaathiraiAdmin.escapeHTML(pkg.image || 'images/ooty.jpg')}" alt="${YaathiraiAdmin.escapeHTML(pkg.title)}" />
          <div style="min-width:0; flex:1;">
            <strong style="font-size:0.88rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${YaathiraiAdmin.escapeHTML(pkg.title)}</strong>
            <span class="mono-cell" style="font-size:0.75rem; color:var(--burgundy); font-weight:700;">${YaathiraiAdmin.formatCurrency(pkg.price)}</span>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
              <span class="mono-tag" style="font-size:0.65rem; color:var(--muted);">${pkg.duration_days} Days</span>
              <span class="badge badge-${pkg.status}" style="font-size:0.6rem; padding:2px 6px;">${pkg.status}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('providerModalBackdrop').classList.add('is-open');
  } catch (err) {
    console.error('[Provider Details Error]', err);
    YaathiraiAdmin.showToast('Could not load provider dossier', 'danger');
  }
}

function closeModal() {
  document.getElementById('providerModalBackdrop').classList.remove('is-open');
}

window.updateProviderStatus = updateProviderStatus;
window.viewProviderDetails = viewProviderDetails;
