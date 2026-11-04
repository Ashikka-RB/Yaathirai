(function () {
  const ui = ProviderUI, root = ui.$('#provider-content');
  async function load() {
    ui.loading(root);
    try {
      const d = await ProviderAPI.earnings(), max = Math.max(1, ...d.rows.map((r) => r.earnings));
      root.innerHTML = `<div class="pv-head"><div><h2>Earnings &amp; reports</h2><p>Package-wise earnings from confirmed and completed bookings. Figures come from mock data, not real payments.</p></div></div>
      <div class="pv-grid"><div class="pv-card pv-stat"><span class="pv-mono">Total earnings (mock)</span><strong>${ui.money(d.total)}</strong></div><div class="pv-card pv-stat"><span class="pv-mono">Awaiting confirmation</span><strong>${ui.money(d.pending)}</strong></div></div>
      <div id="t"></div>`;
      if (!d.rows.length) return ui.empty(ui.$('#t'), 'No packages yet', 'Earnings appear once you have packages and bookings.');
      ui.$('#t').innerHTML = `<div class="pv-table-wrap"><table class="pv-table"><thead><tr><th>Package</th><th>Bookings</th><th>Travelers</th><th>Pending</th><th>Earnings</th><th>Share</th></tr></thead><tbody>${d.rows.map((r) => `<tr><td>${ui.esc(r.title)}</td><td>${r.bookings}</td><td>${r.travelers}</td><td>${ui.money(r.pendingAmount)}</td><td><strong>${ui.money(r.earnings)}</strong></td><td><div class="pv-bar"><i style="width:${Math.round((r.earnings / max) * 100)}%"></i></div></td></tr>`).join('')}</tbody></table></div>`;
    } catch (e) { ui.error(root, e, load); }
  }
  load();
})();
