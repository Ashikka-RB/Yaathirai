// ========================================================
// YAATHIRAI — MANAGE CATEGORIES CLIENT CONTROLLER
// Real-time AJAX operations, Category CRUD, Status Toggles
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await YaathiraiAdmin.checkAuth(['admin', 'super_admin']);
  if (!user) return;

  loadCategories();

  // Search input with debounce
  const searchInput = document.getElementById('categorySearchInput');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadCategories(), 300);
  });

  // Status dropdown filter
  const statusFilter = document.getElementById('categoryStatusFilter');
  statusFilter.addEventListener('change', () => loadCategories());

  // Refresh button
  document.getElementById('refreshCategoryBtn').addEventListener('click', () => loadCategories());

  // Modal open & close handlers
  document.getElementById('openAddCategoryModalBtn').addEventListener('click', openAddModal);
  document.getElementById('categoryModalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('categoryModalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('categoryModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'categoryModalBackdrop') closeModal();
  });

  // Form submit handler
  document.getElementById('categoryForm').addEventListener('submit', handleFormSubmit);
});

async function loadCategories() {
  const tbody = document.getElementById('categoryTbody');
  const countBadge = document.getElementById('categoryCountBadge');
  const search = document.getElementById('categorySearchInput').value.trim();
  const status = document.getElementById('categoryStatusFilter').value;

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/categories?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch categories');

    const data = await res.json();
    const categories = data.categories || [];

    if (countBadge) countBadge.textContent = `${categories.length} Categories`;

    if (categories.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--muted); padding: 36px;">
            No categories found matching criteria.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = categories.map((c) => {
      const isInactive = c.status === 'inactive';
      return `
        <tr id="category-row-${c.category_id}">
          <td class="mono-cell">#CAT-${String(c.category_id).padStart(3, '0')}</td>
          <td>
            <strong>${YaathiraiAdmin.escapeHTML(c.category_name)}</strong>
          </td>
          <td style="color:var(--muted); font-size:0.84rem; max-width: 320px;">
            ${YaathiraiAdmin.escapeHTML(c.description || 'No description.')}
          </td>
          <td class="mono-cell" style="text-align:center;">${c.total_packages || 0}</td>
          <td>
            <span class="badge badge-${c.status}">
              <span class="badge-dot"></span>
              ${c.status}
            </span>
          </td>
          <td>
            <div class="action-group">
              <button class="action-btn" onclick="openEditModal(${c.category_id})">Edit</button>
              <button class="action-btn ${isInactive ? 'btn-outline-success' : 'btn-outline-danger'}" 
                      onclick="toggleCategoryStatus(${c.category_id}, '${isInactive ? 'active' : 'inactive'}')">
                ${isInactive ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Categories Error]', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger); padding:24px;">Failed to load categories.</td></tr>`;
    YaathiraiAdmin.showToast('Could not load categories', 'danger');
  }
}

function openAddModal() {
  document.getElementById('modalCategoryTitle').textContent = 'Add Category';
  document.getElementById('categoryFormId').value = '';
  document.getElementById('categoryName').value = '';
  document.getElementById('categoryDescription').value = '';
  document.getElementById('categoryModalBackdrop').classList.add('is-open');
}

async function openEditModal(catId) {
  try {
    const res = await fetch(`/api/admin/categories/${catId}`);
    if (!res.ok) throw new Error('Category not found');

    const data = await res.json();
    const c = data.category;

    document.getElementById('modalCategoryTitle').textContent = 'Edit Category';
    document.getElementById('categoryFormId').value = c.category_id;
    document.getElementById('categoryName').value = c.category_name;
    document.getElementById('categoryDescription').value = c.description || '';

    document.getElementById('categoryModalBackdrop').classList.add('is-open');
  } catch (err) {
    console.error('[Edit Category Error]', err);
    YaathiraiAdmin.showToast('Could not load category details', 'danger');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const catId = document.getElementById('categoryFormId').value;
  const isEdit = Boolean(catId);

  const payload = {
    category_name: document.getElementById('categoryName').value.trim(),
    description: document.getElementById('categoryDescription').value.trim()
  };

  try {
    const url = isEdit ? `/api/admin/categories/${catId}` : '/api/admin/categories';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save category');
    }

    YaathiraiAdmin.showToast(isEdit ? 'Category updated successfully.' : 'Category added successfully.', 'success');
    closeModal();
    loadCategories();
  } catch (err) {
    console.error('[Save Category Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

async function toggleCategoryStatus(catId, newStatus) {
  const actionText = newStatus === 'inactive' ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${actionText} this category?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/categories/${catId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update status');
    }

    YaathiraiAdmin.showToast(`Category status changed to '${newStatus}'.`, 'success');
    loadCategories();
  } catch (err) {
    console.error('[Toggle Category Error]', err);
    YaathiraiAdmin.showToast(err.message, 'danger');
  }
}

function closeModal() {
  document.getElementById('categoryModalBackdrop').classList.remove('is-open');
}

window.openEditModal = openEditModal;
window.toggleCategoryStatus = toggleCategoryStatus;
