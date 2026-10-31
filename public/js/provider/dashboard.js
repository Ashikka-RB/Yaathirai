(function () {
  const ui = ProviderUI, root = ui.$('#provider-content');
  async function load() {
    ui.loading(root);
    try {
      const d = await ProviderAPI.dashboard(), t = d.totals;
      const stat = (l, v) => `<div class="pv-card pv-stat"><span class="pv-mono">${l}</span><strong>${v}</strong></div>`;
      root.innerHTML = `<div class="pv-head"><div><h2>Welcome back</h2><p>Here is how your packages are doing.</p></div><a class="pv-btn" href="/provider/create-package.html">+ Create package</a></div>
        <div class="pv-grid">${stat('Packages', t.packages)}${stat('Approved', t.approvedPackages)}${stat('Pending bookings', t.pendingBookings)}${stat('Confirmed bookings', t.confirmedBookings)}${stat('Earnings (mock)', ui.money(t.earnings))}${stat('Avg rating', t.averageRating ? t.averageRating + ' ★' : '—')}</div>
        <h3 style="margin-bottom:12px">Recent bookings</h3><div id="recent"></div>`;
      const box = ui.$('#recent');
      if (!d.recentBookings.length) return ui.empty(box, 'No bookings yet', 'Bookings for your packages will appear here.');
      box.innerHTML = `<div class="pv-table-wrap"><table class="pv-table"><thead><tr><th>Customer</th><th>Package</th><th>Travel date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${d.recentBookings.map((b) => `<tr><td>${ui.esc(b.customerName)}<small>${b.travelers} traveler(s)</small></td><td>${ui.esc(b.packageTitle)}</td><td>${ui.date(b.travelDate)}</td><td>${ui.money(b.totalAmount)}</td><td>${ui.badge(b.bookingStatus)}</td></tr>`).join('')}</tbody></table></div><p style="margin-top:12px"><a href="/provider/bookings.html">Manage all bookings →</a></p>`;
    } catch (e) { ui.error(root, e, load); }
  }
  load();
})();
