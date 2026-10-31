(function () {
  const ui = ProviderUI, root = ui.$('#provider-content');
  async function init() {
    ui.loading(root);
    try {
      const pkgs = await ProviderAPI.listPackages();
      root.innerHTML = `<div class="pv-head"><div><h2>Customer reviews</h2><p id="sum"></p></div></div><div class="pv-toolbar"><select class="pv-input" id="pk" aria-label="Package"><option value="">All packages</option>${pkgs.map((p) => `<option value="${ui.esc(p.id)}">${ui.esc(p.title)}</option>`).join('')}</select></div><div id="r"></div>`;
      ui.$('#pk').onchange = load; load();
    } catch (e) { ui.error(root, e, init); }
  }
  async function load() {
    const box = ui.$('#r'); ui.loading(box);
    try {
      const d = await ProviderAPI.reviews({ packageId: ui.$('#pk').value });
      ui.$('#sum').textContent = d.count ? `${d.count} review(s) · average ${d.average} / 5` : 'No reviews yet.';
      if (!d.count) return ui.empty(box, 'No reviews yet', 'Reviews appear after customers complete a trip.');
      box.innerHTML = d.reviews.map((r) => `<div class="pv-card pv-review"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>${ui.esc(r.customerName)}</strong>${ui.stars(r.rating)}</div><div class="pv-mono" style="margin:4px 0 8px">${ui.esc(r.packageTitle)} · ${ui.date(r.createdAt)}</div><p style="margin:0">${ui.esc(r.comment)}</p></div>`).join('');
    } catch (e) { ui.error(box, e, load); }
  }
  init();
})();
