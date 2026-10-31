// ========================================================
// YAATHIRAI — MANAGE DESTINATIONS CLIENT CONTROLLER
// Real-time AJAX operations, Destination CRUD, Status Toggles
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await YaathiraiAdmin.checkAuth(['admin', 'super_admin']);
  if (!user) return;

  loadDestinations();

  // Search input with debounce
  const searchInput = document.getElementById('destSearchInput');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadDestinations(), 300);
  });

  // Status dropdown filter
  const statusFilter = document.getElementById('destStatusFilter');
  statusFilter.addEventListener('change', () => loadDestinations());

  // Refresh button
  document.getElementById('refreshDestBtn').addEventListener('click', () => loadDestinations());

  // Modal open & close handlers
  document.getElementById('openAddDestModalBtn').addEventListener('click', openAddModal);
  document.getElementById('destModalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('destModalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('destModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'destModalBackdrop') closeModal();
  });

  // Form submit handler
  document.getElementById('destForm').addEventListener('submit', handleFormSubmit);
});

async function loadDestinations() {
  const tbody = document.getElementById('destTbody');
  const countBadge = document.getElementById('destCountBadge');
  const search = document.getElementById('destSearchInput').value.trim();
  const status = document.getElementById('destStatusFilter').value;

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/destinations?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch destinations');

    const data = await res.json();
    const destinations = data.destinations || [];

    if (countBadge) countBadge.textContent = `${destinations.length} Destinations`;

    if (destinations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--muted); padding: 36px;">
            No destinations found matching criteria.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = destinations.map((d) => {
      const isInactive = d.status === 'inactive';
      return `
        <tr id="dest-row-${d.destination_id}">
          <td class="mono-cell">#DEST-${String(d.destination_id).padStart(3, '0')}</td>
          <td>
            <strong>${YaathiraiAdmin.escapeHTML(d.name)}</strong>
            <div style="font-size:0.75rem; color:var(--muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${YaathiraiAdmin.escapeHTML(d.description || '')}
            </div>
          </td>
          <td>${YaathiraiAdmin.escapeHTML(d.city || d.name)}</td>
          <td>${YaathiraiAdmin.escapeHTML(d.state || 'Tamil Nadu')}, ${YaathiraiAdmin.escapeHTML(d.country || 'India')}</td>
          <td class="mono-cell" style="text-align:center;">${d.total_packages || 0}</td>
          <td>
            <span class="badge badge-${d.status}">
              <span class="badge-dot"></span>
              ${d.status}
            </span>
          </td>
          <td>
            <div class="action-group">
              <button class="action-btn" onclick="openEditModal(${d.destination_id})">Edit</button>
              <button class="action-btn ${isInactive ? 'btn-outline-success' : 'btn-outline-danger'}" 
                      onclick="toggleDestStatus(${d.destination_id}, '${isInactive ? 'active' : 'inactive'}')">
                ${isInactive ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Destinations Error]', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:24px;">Failed to load destinations.</td></tr>`;
    YaathiraiAdmin.showToast('Could not load destinations', 'danger');
  }
}

function openAddModal() {
  document.getElementById('modalDestTitle').textContent = 'Add Destination';
  document.getElementById('destFormId').value = '';
  document.getElementById('destName').value = '';
  document.getElementById('destCity').value = '';
  document.getElementById('destState').value = 'Tamil Nadu';
  document.getElementById('destCountry').value = 'India';
  document.getElementById('destDescription').value = '';
  document.getElementById('destModalBackdrop').classList.add('is-open');
}

async function openEditModal(destId) {
  try {
    const res = await fetch(`/api/admin/destinations/${destId}`);
    if (!res.ok) throw new Error('Destination not found');

    const data = await res.json();
    const d = data.destination;

    document.getElementById('modalDestTitle').textContent = 'Edit Destination';
    document.getElementById('destFormId').value = d.destination_id;
    document.getElementById('destName').value = d.name;
    document.getElementById('destCity').value = d.city || '';
    document.getElementById('destState').value = d.state || 'Tamil Nadu';
    document.getElementById('destCountry').value = d.country || 'India';
    document.getElementById('destDescription').value = d.description || '';

    document.getElementById('destModalBackdrop').classList.add('is-open');
  } catch (err) {
    console.error('[Edit Dest Error]', err);
    YaathiraiAdmin.showToast('Could not load destination details', 'danger');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const destId = document.getElementById('destFormId').value;
  const isEdit = Boolean(destId);

  const payload = {
    name: document.getElementById('destName').value.trim(),
    city: document.getElementById('destCity').value.trim(),
    state: document.getElementById('destState').value.trim(),
    country: document.getElementById('destCountry').value.trim(),
    description: document.getElementById('destDescription').value.trim()
  };

  try {
    const url = isEdit ? `/api/admin/destinations/${destId}` : '/api/admin/destinations';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save destination');
    }

    YaathiraiAdmin.showToast(isEdit ? 'Destination updated successfully.' : 'Destination added successfully.', 'success');
    closeModal();
    loadDestinations();
  } catch (err) {
    console.error('[Save Dest Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

async function toggleDestStatus(destId, newStatus) {
  const actionText = newStatus === 'inactive' ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${actionText} this destination?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/destinations/${destId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update status');
    }

    YaathiraiAdmin.showToast(`Destination status changed to '${newStatus}'.`, 'success');
    loadDestinations();
  } catch (err) {
    console.error('[Toggle Dest Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

function closeModal() {
  document.getElementById('destModalBackdrop').classList.remove('is-open');
}

window.openEditModal = openEditModal;
window.toggleDestStatus = toggleDestStatus;
