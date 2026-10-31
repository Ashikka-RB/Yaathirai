// ========================================================
// YAATHIRAI — MANAGE PACKAGES CLIENT CONTROLLER
// Package Moderation, Approval, Status Toggles & Itinerary Dossier
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await YaathiraiAdmin.checkAuth(['admin', 'super_admin']);
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');

  loadPackages();

  if (targetId) {
    setTimeout(() => viewPackageDetails(targetId), 400);
  }

  // Search input with debounce
  const searchInput = document.getElementById('pkgSearchInput');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadPackages(), 300);
  });

  // Status dropdown filter
  const statusFilter = document.getElementById('pkgStatusFilter');
  statusFilter.addEventListener('change', () => loadPackages());

  // Refresh button
  document.getElementById('refreshPackagesBtn').addEventListener('click', () => loadPackages());

  // Modal close handlers
  document.getElementById('pkgModalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('pkgModalCloseActionBtn').addEventListener('click', closeModal);
  document.getElementById('pkgModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'pkgModalBackdrop') closeModal();
  });
});

async function loadPackages() {
  const tbody = document.getElementById('packagesTbody');
  const countBadge = document.getElementById('pkgCountBadge');
  const search = document.getElementById('pkgSearchInput').value.trim();
  const status = document.getElementById('pkgStatusFilter').value;

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/packages?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch packages');

    const data = await res.json();
    const packages = data.packages || [];

    if (countBadge) countBadge.textContent = `${packages.length} Packages`;

    // Update pending moderation badge
    const pendingCount = packages.filter((p) => p.status === 'pending').length;
    const badgePkg = document.getElementById('pendingPackagesBadge');
    if (badgePkg) badgePkg.textContent = pendingCount;

    if (packages.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--muted); padding: 36px;">
            No packages match the current search or filter.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = packages.map((pkg) => {
      let actionButtons = '';

      if (pkg.status === 'pending') {
        actionButtons = `
          <button class="action-btn btn-outline-success" onclick="updatePackageStatus(${pkg.package_id}, 'approved', 'Approve')">Approve</button>
          <button class="action-btn btn-outline-danger" onclick="updatePackageStatus(${pkg.package_id}, 'rejected', 'Reject')">Reject</button>
        `;
      } else if (pkg.status === 'approved') {
        actionButtons = `
          <button class="action-btn btn-outline-danger" onclick="updatePackageStatus(${pkg.package_id}, 'disabled', 'Disable')">Disable</button>
        `;
      } else if (pkg.status === 'disabled') {
        actionButtons = `
          <button class="action-btn btn-outline-success" onclick="updatePackageStatus(${pkg.package_id}, 'approved', 'Enable')">Enable</button>
        `;
      } else if (pkg.status === 'rejected') {
        actionButtons = `
          <button class="action-btn btn-outline-success" onclick="updatePackageStatus(${pkg.package_id}, 'approved', 'Re-Approve')">Re-Approve</button>
        `;
      }

      return `
        <tr id="pkg-row-${pkg.package_id}">
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${YaathiraiAdmin.escapeHTML(pkg.image || 'images/ooty.jpg')}" alt="${YaathiraiAdmin.escapeHTML(pkg.title)}" 
                   style="width:52px; height:52px; border-radius:var(--radius-sm); object-fit:cover; background:var(--cream);" />
              <div>
                <strong>${YaathiraiAdmin.escapeHTML(pkg.title)}</strong>
                <div class="mono-tag" style="font-size:0.7rem; color:var(--muted);">#PKG-${String(pkg.package_id).padStart(4, '0')}</div>
              </div>
            </div>
          </td>
          <td>
            <strong>${YaathiraiAdmin.escapeHTML(pkg.destination_name)}</strong>
            <div style="font-size:0.75rem; color:var(--muted);">${YaathiraiAdmin.escapeHTML(pkg.category_name)}</div>
          </td>
          <td>${YaathiraiAdmin.escapeHTML(pkg.provider_name || 'Independent Guide')}</td>
          <td class="mono-cell">
            ${pkg.duration_days} Days
            <div style="font-size:0.75rem; color:var(--muted);">Max ${pkg.capacity} guests</div>
          </td>
          <td class="mono-cell" style="font-weight:700; color:var(--burgundy); font-size:0.95rem;">
            ${YaathiraiAdmin.formatCurrency(pkg.price)}
          </td>
          <td>
            <span class="badge badge-${pkg.status}">
              <span class="badge-dot"></span>
              ${pkg.status}
            </span>
          </td>
          <td>
            <div class="action-group">
              <button class="action-btn" onclick="viewPackageDetails(${pkg.package_id})">Details</button>
              ${actionButtons}
              <button class="action-btn" style="color:var(--danger);" onclick="deletePackage(${pkg.package_id})" title="Delete Package">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Packages Error]', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:24px;">Failed to load tour packages.</td></tr>`;
    YaathiraiAdmin.showToast('Could not load packages', 'danger');
  }
}

async function updatePackageStatus(pkgId, newStatus, actionVerb = 'Update') {
  if (!confirm(`Are you sure you want to ${actionVerb.toLowerCase()} this tour package?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/packages/${pkgId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update package');
    }

    YaathiraiAdmin.showToast(`Package status updated to '${newStatus}'.`, 'success');
    closeModal();
    loadPackages();
  } catch (err) {
    console.error('[Update Package Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

async function deletePackage(pkgId) {
  if (!confirm('Are you sure you want to permanently remove this package? This cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/packages/${pkgId}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to remove package');
    }

    YaathiraiAdmin.showToast('Package removed successfully.', 'success');
    closeModal();
    loadPackages();
  } catch (err) {
    console.error('[Delete Package Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

async function viewPackageDetails(pkgId) {
  try {
    const res = await fetch(`/api/admin/packages/${pkgId}`);
    if (!res.ok) throw new Error('Package not found');

    const data = await res.json();
    const pkg = data.package;
    const itinerary = data.itinerary || [];
    const availability = data.availability || [];

    document.getElementById('modalPkgImage').src = pkg.image || 'images/ooty.jpg';
    document.getElementById('modalPkgName').textContent = pkg.title;
    document.getElementById('modalPkgDestination').textContent = `${pkg.destination_name} · ${pkg.category_name}`;
    document.getElementById('modalPkgProvider').textContent = `Submitted by: ${pkg.provider_name} (${pkg.provider_email || 'No email'})`;

    document.getElementById('modalPkgPrice').textContent = YaathiraiAdmin.formatCurrency(pkg.price);
    document.getElementById('modalPkgDuration').textContent = `${pkg.duration_days} Days / ${Math.max(1, pkg.duration_days - 1)} Nights`;
    document.getElementById('modalPkgCapacity').textContent = `${pkg.capacity} Travelers`;
    document.getElementById('modalPkgStatusBadge').innerHTML = `
      <span class="badge badge-${pkg.status}">
        <span class="badge-dot"></span>
        ${pkg.status}
      </span>
    `;

    document.getElementById('modalPkgDescription').textContent = pkg.description || 'No description provided.';

    // Render Itinerary
    const itinContainer = document.getElementById('modalItineraryContainer');
    if (itinerary.length === 0) {
      itinContainer.innerHTML = `<p style="color:var(--muted); font-size:0.85rem;">No day-by-day itinerary specified for this package.</p>`;
    } else {
      itinContainer.innerHTML = itinerary.map((it) => `
        <div class="itinerary-day">
          <h5>Day ${it.day_no}: ${YaathiraiAdmin.escapeHTML(it.title)}</h5>
          <p>${YaathiraiAdmin.escapeHTML(it.description)}</p>
        </div>
      `).join('');
    }

    // Render Availability
    const availContainer = document.getElementById('modalAvailabilityContainer');
    if (availability.length === 0) {
      availContainer.innerHTML = `<p style="color:var(--muted); font-size:0.85rem;">No departure dates currently scheduled.</p>`;
    } else {
      availContainer.innerHTML = availability.map((av) => `
        <span class="mono-tag" style="background:var(--paper); padding:6px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.75rem;">
          📅 ${YaathiraiAdmin.formatDate(av.available_date)} (${av.seats_available} seats)
        </span>
      `).join('');
    }

    // Modal action buttons
    const actionsContainer = document.getElementById('modalModerationActions');
    let modHtml = '';
    if (pkg.status === 'pending') {
      modHtml = `
        <button class="btn-primary btn-sm" onclick="updatePackageStatus(${pkg.package_id}, 'approved', 'Approve')">Approve Package</button>
        <button class="btn-danger btn-sm" onclick="updatePackageStatus(${pkg.package_id}, 'rejected', 'Reject')">Reject Package</button>
      `;
    } else if (pkg.status === 'approved') {
      modHtml = `
        <button class="btn-secondary btn-sm" onclick="updatePackageStatus(${pkg.package_id}, 'disabled', 'Disable')">Disable Package</button>
      `;
    } else {
      modHtml = `
        <button class="btn-primary btn-sm" onclick="updatePackageStatus(${pkg.package_id}, 'approved', 'Approve')">Enable / Approve</button>
      `;
    }
    actionsContainer.innerHTML = modHtml;

    document.getElementById('pkgModalBackdrop').classList.add('is-open');
  } catch (err) {
    console.error('[Package Details Error]', err);
    YaathiraiAdmin.showToast('Could not load package dossier', 'danger');
  }
}

function closeModal() {
  document.getElementById('pkgModalBackdrop').classList.remove('is-open');
}

window.updatePackageStatus = updatePackageStatus;
window.deletePackage = deletePackage;
window.viewPackageDetails = viewPackageDetails;
