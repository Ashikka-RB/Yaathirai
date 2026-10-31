(function () {
  const ui = ProviderUI, root = ui.$('#provider-content'); let pkgs = [], cur = new URLSearchParams(location.search).get('package');
  async function init() {
    ui.loading(root);
    try {
      pkgs = await ProviderAPI.listPackages();
      if (!pkgs.length) return ui.empty(root, 'No packages yet', 'Create a package before managing dates.', '<a class="pv-btn" href="/provider/create-package.html">Create package</a>');
      if (!pkgs.some((p) => p.id === cur)) cur = pkgs[0].id;
      root.innerHTML = `<div class="pv-head"><div><h2>Availability &amp; capacity</h2><p>Set departure dates and how many seats each date offers.</p></div></div>
        <div class="pv-toolbar"><select class="pv-input" id="pk" aria-label="Package">${pkgs.map((p) => `<option value="${ui.esc(p.id)}" ${p.id === cur ? 'selected' : ''}>${ui.esc(p.title)}</option>`).join('')}</select></div><div id="av"></div>`;
      ui.$('#pk').onchange = (e) => { cur = e.target.value; load(); }; load();
    } catch (e) { ui.error(root, e, init); }
  }
  async function load() {
    const box = ui.$('#av'); ui.loading(box);
    try {
      const d = await ProviderAPI.listAvailability(cur);
      box.innerHTML = `<form class="pv-card" id="addF" style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end"><div class="pv-field" style="margin:0" data-f="date"><label for="ad">Departure date</label><input id="ad" type="date" required><span class="pv-err"></span></div><div class="pv-field" style="margin:0" data-f="seatsAvailable"><label for="as">Seats (max ${d.capacity})</label><input id="as" type="number" min="1" max="${d.capacity}" value="${d.capacity}" required><span class="pv-err"></span></div><button class="pv-btn">Add date</button></form><div id="rows"></div>`;
      const rows = ui.$('#rows');
      if (!d.dates.length) ui.empty(rows, 'No dates yet', 'Add a departure date so customers can book.');
      else rows.innerHTML = `<div class="pv-table-wrap"><table class="pv-table"><thead><tr><th>Date</th><th>Seats left</th><th>Status</th><th>Actions</th></tr></thead><tbody>${d.dates.map((a) => `<tr><td>${ui.date(a.date)}</td><td><input type="number" class="pv-input" style="min-width:0;width:80px" min="0" max="${d.capacity}" value="${a.seatsAvailable}" data-seats="${a.id}" aria-label="Seats"> / ${d.capacity}</td><td>${ui.badge(a.status)}</td><td><div class="pv-actions"><button class="pv-btn pv-btn--ghost pv-btn--sm" data-save="${a.id}">Save seats</button><button class="pv-btn pv-btn--ghost pv-btn--sm" data-toggle="${a.id}" data-to="${a.status === 'open' ? 'closed' : 'open'}">${a.status === 'open' ? 'Close' : 'Reopen'}</button><button class="pv-btn pv-btn--danger pv-btn--sm" data-rm="${a.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
      const errs = (x) => ui.$('#addF').querySelectorAll('[data-f]').forEach((w) => { w.classList.toggle('has-error', !!(x && x[w.dataset.f])); ui.$('.pv-err', w).textContent = (x && x[w.dataset.f]) || ''; });
      ui.$('#addF').onsubmit = async (e) => { e.preventDefault(); errs(null); try { await ProviderAPI.addAvailability(cur, { date: ui.$('#ad').value, seatsAvailable: ui.$('#as').value }); ui.toast('Date added'); load(); } catch (er) { er.details ? errs(er.details) : ui.toast(er.message, 'err'); } };
      rows.onclick = async (e) => {
        const t = e.target, act = async (fn, msg) => { try { await fn(); ui.toast(msg); load(); } catch (er) { ui.toast(er.message, 'err'); } };
        if (t.dataset.save) act(() => ProviderAPI.updateAvailability(t.dataset.save, { seatsAvailable: ui.$(`[data-seats="${t.dataset.save}"]`).value }), 'Seats updated');
        else if (t.dataset.toggle) act(() => ProviderAPI.updateAvailability(t.dataset.toggle, { status: t.dataset.to }), 'Date ' + t.dataset.to);
        else if (t.dataset.rm && (await ui.confirm('Delete this date?', 'Customers will no longer be able to book it.', 'Delete', true))) act(() => ProviderAPI.deleteAvailability(t.dataset.rm), 'Date deleted');
      };
    } catch (e) { ui.error(box, e, load); }
  }
  init();
})();
