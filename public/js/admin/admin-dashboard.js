// ========================================================
// YAATHIRAI — ADMIN DASHBOARD CONTROLLER
// Real-time asynchronous data fetching & DOM manipulation
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate user as admin or super_admin
  const user = await YaathiraiAdmin.checkAuth(['admin', 'super_admin']);
  if (!user) return;

  // 2. Fetch all dashboard data
  loadDashboardData();

  // 3. Attach refresh button listener
  const refreshBtn = document.getElementById('refreshStatsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.querySelector('span:last-child').style.transform = 'rotate(360deg)';
      refreshBtn.querySelector('span:last-child').style.transition = 'transform 500ms ease';
      setTimeout(() => {
        refreshBtn.querySelector('span:last-child').style.transform = 'none';
        refreshBtn.querySelector('span:last-child').style.transition = 'none';
      }, 500);
      loadDashboardData();
    });
  }
});

async function loadDashboardData() {
  await Promise.all([
    fetchStats(),
    fetchRecentBookings(),
    fetchPendingApprovals(),
    fetchActivityFeed()
  ]);
}

async function fetchStats() {
  try {
    const res = await fetch('/api/admin/dashboard-stats');
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const s = data.stats;
    document.getElementById('statCustomers').textContent = s.total_customers || 0;
    document.getElementById('statProviders').textContent = s.total_providers || 0;
    document.getElementById('statPackages').textContent = s.total_packages || 0;
    document.getElementById('statBookings').textContent = s.total_bookings || 0;
    document.getElementById('statRevenue').textContent = YaathiraiAdmin.formatCurrency(s.total_revenue || 0);

    // Pill meta
    const pendingProvEl = document.getElementById('statPendingProvidersPill');
    if (pendingProvEl) pendingProvEl.textContent = `${s.pending_providers || 0} Pending`;

    const pendingPkgEl = document.getElementById('statPendingPackagesPill');
    if (pendingPkgEl) pendingPkgEl.textContent = `${s.pending_packages || 0} Moderation`;

    const confBookEl = document.getElementById('statConfirmedBookingsPill');
    if (confBookEl) confBookEl.textContent = `${s.confirmed_bookings || 0} Confirmed`;

    // Sidebar badges
    const badgeProv = document.getElementById('pendingProvidersBadge');
    if (badgeProv) badgeProv.textContent = s.pending_providers || 0;

    const badgePkg = document.getElementById('pendingPackagesBadge');
    if (badgePkg) badgePkg.textContent = s.pending_packages || 0;

  } catch (err) {
    console.error('[Stats Error]', err);
    YaathiraiAdmin.showToast('Could not load statistics', 'danger');
  }
}

async function fetchRecentBookings() {
  const tbody = document.getElementById('recentBookingsTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/recent-bookings');
    if (!res.ok) throw new Error('Failed to fetch recent bookings');

    const data = await res.json();
    const bookings = data.bookings || [];

    if (bookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--muted); padding: 32px;">No bookings found.</td>
        </tr>`;
      return;
    }

    tbody.innerHTML = bookings.map((b) => `
      <tr>
        <td class="mono-cell">#BK-${String(b.booking_id).padStart(4, '0')}</td>
        <td>
          <strong>${YaathiraiAdmin.escapeHTML(b.customer_name)}</strong>
          <div style="font-size:0.75rem; color:var(--muted);">${YaathiraiAdmin.escapeHTML(b.customer_email)}</div>
        </td>
        <td>
          <div>${YaathiraiAdmin.escapeHTML(b.package_title)}</div>
          <span style="font-size:0.75rem; color:var(--muted); font-family:'Space Mono';">${YaathiraiAdmin.escapeHTML(b.destination_name)} (${b.travelers} guests)</span>
        </td>
        <td class="mono-cell" style="font-weight:700;">${YaathiraiAdmin.formatCurrency(b.total_amount)}</td>
        <td>
          <span class="badge badge-${b.booking_status}">
            <span class="badge-dot"></span>
            ${b.booking_status}
          </span>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('[Bookings Error]', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:24px;">Failed to load bookings.</td></tr>`;
  }
}

async function fetchPendingApprovals() {
  const container = document.getElementById('pendingApprovalsList');
  const badgeTotal = document.getElementById('pendingTotalBadge');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/pending-approvals');
    if (!res.ok) throw new Error('Failed to fetch pending approvals');

    const data = await res.json();
    const providers = data.pendingProviders || [];
    const packages = data.pendingPackages || [];
    const total = providers.length + packages.length;

    if (badgeTotal) badgeTotal.textContent = `${total} Action Items`;

    if (total === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 32px; color:var(--muted);">
          <span style="font-size:2rem; color:var(--success);">✓</span>
          <p style="margin-top:8px; font-weight:600;">All caught up!</p>
          <small style="color:var(--muted-light);">No pending providers or packages requiring moderation.</small>
        </div>`;
      return;
    }

    let html = '';

    // Render pending providers
    providers.forEach((prov) => {
      html += `
        <div class="approval-item">
          <div class="approval-item-left">
            <div class="user-avatar" style="width:48px; height:48px; font-size:1.1rem; background: #b35900;">
              ${prov.name.charAt(0).toUpperCase()}
            </div>
            <div class="approval-info">
              <h4>${YaathiraiAdmin.escapeHTML(prov.name)}</h4>
              <p class="approval-sub">PROVIDER APPLICATION · ${prov.mobile || 'No mobile'}</p>
              <span class="badge badge-pending" style="margin-top:4px;">Pending Approval</span>
            </div>
          </div>
          <div class="action-group">
            <a href="manage-providers.html?id=${prov.user_id}" class="action-btn">Review</a>
          </div>
        </div>`;
    });

    // Render pending packages
    packages.forEach((pkg) => {
      html += `
        <div class="approval-item">
          <div class="approval-item-left">
            <img class="approval-thumb" src="${YaathiraiAdmin.escapeHTML(pkg.image || 'images/ooty.jpg')}" alt="${YaathiraiAdmin.escapeHTML(pkg.title)}" />
            <div class="approval-info">
              <h4>${YaathiraiAdmin.escapeHTML(pkg.title)}</h4>
              <p class="approval-sub">${YaathiraiAdmin.escapeHTML(pkg.destination_name)} · By ${YaathiraiAdmin.escapeHTML(pkg.provider_name)}</p>
              <span class="mono-cell" style="font-weight:700; color:var(--burgundy);">${YaathiraiAdmin.formatCurrency(pkg.price)}</span>
            </div>
          </div>
          <div class="action-group">
            <a href="manage-packages.html?id=${pkg.package_id}" class="action-btn">Moderate</a>
          </div>
        </div>`;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error('[Approvals Error]', err);
    container.innerHTML = `<p style="color:var(--danger); text-align:center;">Failed to load pending items.</p>`;
  }
}

async function fetchActivityFeed() {
  const tbody = document.getElementById('activityLogTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/recent-activity');
    if (!res.ok) throw new Error('Failed to fetch activity logs');

    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted); padding:24px;">No system logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((log) => `
      <tr>
        <td class="mono-cell" style="color:var(--muted);">${YaathiraiAdmin.formatDate(log.created_at)}</td>
        <td>
          <strong>${YaathiraiAdmin.escapeHTML(log.user_name || 'System')}</strong>
          <span class="mono-tag" style="font-size:0.65rem; color:var(--burgundy); margin-left:6px;">${log.user_role || 'SYSTEM'}</span>
        </td>
        <td><span class="mono-tag" style="font-weight:700;">${YaathiraiAdmin.escapeHTML(log.action)}</span></td>
        <td style="color:var(--muted);">${YaathiraiAdmin.escapeHTML(log.description)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('[Activity Error]', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">Failed to load activity.</td></tr>`;
  }
}
