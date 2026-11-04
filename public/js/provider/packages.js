/* My Packages list + create/edit form. Mode is chosen by which host element exists. */
(function () {
  const ui = ProviderUI, root = ui.$('#provider-content');
  const edit = document.body.dataset.mode === 'edit', form = document.body.dataset.mode === 'create' || edit;

  async function list() {
    ui.loading(root);
    try {
      const pk = await ProviderAPI.listPackages();
      root.innerHTML = `<div class="pv-head"><div><h2>My packages</h2><p>${pk.length} package(s) you created.</p></div><a class="pv-btn" href="/provider/create-package.html">+ Create package</a></div><div class="pv-toolbar"><input class="pv-input" id="q" placeholder="Search packages…" aria-label="Search packages"></div><div id="tbl"></div>`;
      const draw = () => {
        const q = ui.$('#q').value.toLowerCase(), rows = pk.filter((p) => (p.title + p.destination).toLowerCase().includes(q)), t = ui.$('#tbl');
        if (!rows.length) return ui.empty(t, pk.length ? 'No matches' : 'No packages yet', pk.length ? 'Try a different search.' : 'Create your first tourism package.', pk.length ? '' : '<a class="pv-btn" href="/provider/create-package.html">Create package</a>');
        t.innerHTML = `<div class="pv-table-wrap"><table class="pv-table"><thead><tr><th>Package</th><th>Duration</th><th>Price</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((p) => `<tr><td><strong>${ui.esc(p.title)}</strong><small>${ui.esc(p.destination)} · ${ui.esc(p.category)}</small></td><td>${p.durationDays} day(s)</td><td>${ui.money(p.price)}</td><td>${p.capacity}</td><td>${ui.badge(p.status)}</td><td><div class="pv-actions"><a class="pv-btn pv-btn--ghost pv-btn--sm" href="/provider/edit-package.html?id=${encodeURIComponent(p.id)}">Edit</a><a class="pv-btn pv-btn--ghost pv-btn--sm" href="/provider/availability.html?package=${encodeURIComponent(p.id)}">Dates</a><button class="pv-btn pv-btn--danger pv-btn--sm" data-del="${ui.esc(p.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
      };
      draw(); ui.$('#q').oninput = draw;
      root.onclick = async (e) => {
        const id = e.target.dataset && e.target.dataset.del; if (!id) return;
        const p = pk.find((x) => x.id === id);
        if (!(await ui.confirm('Delete package?', `“${p.title}” and its dates will be removed. This cannot be undone.`, 'Delete', true))) return;
        try { await ProviderAPI.deletePackage(id); ui.toast('Package deleted'); list(); } catch (err) { ui.toast(err.message, 'err'); }
      };
    } catch (e) { ui.error(root, e, list); }
  }

  const val = (p, k) => ui.esc(p && p[k] != null ? p[k] : '');
  const field = (name, label, input, hint, span) => `<div class="pv-field ${span ? 'pv-span' : ''}" data-f="${name}"><label for="f-${name}">${label}</label>${input}${hint ? `<span class="pv-hint">${hint}</span>` : ''}<span class="pv-err" role="alert"></span></div>`;
  const opts = (arr, cur) => '<option value="">Select…</option>' + arr.map((o) => `<option ${o === cur ? 'selected' : ''}>${ui.esc(o)}</option>`).join('');
  const itinRow = (it, i) => `<div class="pv-itin-row"><span class="pv-mono">Day ${i + 1}</span><input placeholder="Title" value="${ui.esc(it.title)}" data-it="title" aria-label="Day ${i + 1} title"><input placeholder="What happens" value="${ui.esc(it.description)}" data-it="description" aria-label="Day ${i + 1} description"><button type="button" class="pv-btn pv-btn--danger pv-btn--sm" data-rm>✕</button></div>`;

  async function showForm() {
    ui.loading(root);
    try {
      const id = new URLSearchParams(location.search).get('id');
      const [me, p] = await Promise.all([ProviderAPI.me(), edit ? ProviderAPI.getPackage(id) : Promise.resolve(null)]);
      if (edit && !id) throw new Error('No package selected.');
      const o = me.options, itin = p ? p.itinerary : [{ title: '', description: '' }];
      root.innerHTML = `<div class="pv-head"><div><h2>${edit ? 'Edit package' : 'Create a tourism package'}</h2><p>Share a place you know well. New packages are submitted as <em>pending</em> for admin approval.</p></div></div>
      <form id="pkgForm" class="pv-card" novalidate><div class="pv-form-grid">
        ${field('title', 'Title', `<input id="f-title" name="title" required minlength="5" maxlength="120" value="${val(p, 'title')}">`, '', 1)}
        ${field('destination', 'Destination', `<select id="f-destination" name="destination" required>${opts(o.destinations, p && p.destination)}</select>`)}
        ${field('category', 'Category', `<select id="f-category" name="category" required>${opts(o.categories, p && p.category)}</select>`)}
        ${field('durationDays', 'Duration (days)', `<input id="f-durationDays" name="durationDays" type="number" min="1" max="30" required value="${val(p, 'durationDays')}">`)}
        ${field('price', 'Price per traveler (₹)', `<input id="f-price" name="price" type="number" min="1" step="1" required value="${val(p, 'price')}">`)}
        ${field('capacity', 'Capacity (travelers per date)', `<input id="f-capacity" name="capacity" type="number" min="1" max="200" required value="${val(p, 'capacity')}">`)}
        ${field('image', 'Image URL or path', `<input id="f-image" name="image" placeholder="images/ooty.jpg or https://…" value="${val(p, 'image')}">`, 'Optional. File upload is not part of this mock build.')}
        ${field('description', 'Description', `<textarea id="f-description" name="description" rows="4" required minlength="20">${val(p, 'description')}</textarea>`, '', 1)}
        ${field('inclusions', 'Inclusions', `<textarea id="f-inclusions" name="inclusions" rows="4">${ui.esc(p ? p.inclusions.join('\n') : '')}</textarea>`, 'One per line')}
        ${field('exclusions', 'Exclusions', `<textarea id="f-exclusions" name="exclusions" rows="4">${ui.esc(p ? p.exclusions.join('\n') : '')}</textarea>`, 'One per line')}
        <div class="pv-field pv-span" data-f="itinerary"><label>Itinerary</label><div id="itin">${itin.map(itinRow).join('')}</div><div><button type="button" class="pv-btn pv-btn--ghost pv-btn--sm" id="addDay">+ Add day</button></div><span class="pv-err" role="alert"></span></div>
      </div><div class="pv-actions" style="margin-top:8px"><button class="pv-btn" type="submit" id="save">${edit ? 'Save changes' : 'Create package'}</button><a class="pv-btn pv-btn--ghost" href="/provider/my-packages.html">Cancel</a></div></form>`;
      const itinBox = ui.$('#itin'), renum = () => { [...itinBox.children].forEach((r, i) => { ui.$('.pv-mono', r).textContent = 'Day ' + (i + 1); }); };
      ui.$('#addDay').onclick = () => { itinBox.insertAdjacentHTML('beforeend', itinRow({ title: '', description: '' }, itinBox.children.length)); };
      itinBox.onclick = (e) => { if (e.target.dataset.rm !== undefined) { if (itinBox.children.length > 1) { e.target.closest('.pv-itin-row').remove(); renum(); } else ui.toast('Keep at least one day', 'err'); } };
      const f = ui.$('#pkgForm'), setErrs = (d) => { f.querySelectorAll('[data-f]').forEach((w) => { const m = d && d[w.dataset.f]; w.classList.toggle('has-error', !!m); ui.$('.pv-err', w).textContent = m || ''; }); };
      f.onsubmit = async (e) => {
        e.preventDefault();
        const g = (n) => f.elements[n].value, lines = (n) => g(n).split('\n').map((s) => s.trim()).filter(Boolean);
        const body = { title: g('title'), destination: g('destination'), category: g('category'), durationDays: g('durationDays'), price: g('price'), capacity: g('capacity'), image: g('image'), description: g('description'), inclusions: lines('inclusions'), exclusions: lines('exclusions'), itinerary: [...itinBox.children].map((r) => ({ title: ui.$('[data-it=title]', r).value, description: ui.$('[data-it=description]', r).value })) };
        const btn = ui.$('#save'); btn.disabled = true; btn.textContent = 'Saving…'; setErrs(null);
        try {
          if (edit) await ProviderAPI.updatePackage(id, body); else await ProviderAPI.createPackage(body);
          ui.toast(edit ? 'Package updated' : 'Package created (pending approval)'); setTimeout(() => { location.href = '/provider/my-packages.html'; }, 700);
        } catch (err) {
          btn.disabled = false; btn.textContent = edit ? 'Save changes' : 'Create package';
          if (err.details) { setErrs(err.details); ui.toast('Please fix the highlighted fields', 'err'); const first = f.querySelector('.has-error'); if (first) first.scrollIntoView({ block: 'center' }); } else ui.toast(err.message, 'err');
        }
      };
    } catch (e) { ui.error(root, e, showForm); }
  }
  form ? showForm() : list();
})();
