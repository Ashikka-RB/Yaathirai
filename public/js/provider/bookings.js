(function () {
  const ui = ProviderUI, root = ui.$('#provider-content'); let pkgs = [];
  const NEXT = { pending: [['confirmed', 'Confirm'], ['cancelled', 'Reject']], confirmed: [['completed', 'Mark completed'], ['cancelled', 'Cancel']] };
  async function init() {
    ui.loading(root);
    try {
      pkgs = await ProviderAPI.listPackages();
      root.innerHTML = `<div class="pv-head"><div><h2>Customer bookings</h2><p>Confirm or manage bookings for your packages. Payments shown are mock.</p></div></div>
      <div class="pv-toolbar"><input class="pv-input" id="q" placeholder="Search customer or package…" aria-label="Search"><select class="pv-input" id="st" aria-label="Status"><option value="">All statuses</option><option>pending</option><option>confirmed</option><option>completed</option><option>cancelled</option></select><select class="pv-input" id="pk" aria-label="Package"><option value="">All packages</option>${pkgs.map((p) => `<option value="${ui.esc(p.id)}">${ui.esc(p.title)}</option>`).join('')}</select></div><div id="list"></div>`;
      let t; ui.$('#q').oninput = () => { clearTimeout(t); t = setTimeout(load, 250); }; ui.$('#st').onchange = load; ui.$('#pk').onchange = load; load();
    } catch (e) { ui.error(root, e, init); }
  }
  async function load() {
    const box = ui.$('#list'); ui.loading(box);
    try {
      const rows = await ProviderAPI.listBookings({ q: ui.$('#q').value.trim(), status: ui.$('#st').value, packageId: ui.$('#pk').value });
      if (!rows.length) return ui.empty(box, 'No bookings found', 'Adjust the filters or check back later.');
      box.innerHTML = `<div class="pv-table-wrap"><table class="pv-table"><thead><tr><th>Booking</th><th>Customer</th><th>Package</th><th>Travel date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((b) => `<tr><td class="pv-mono">${ui.esc(b.id)}</td><td>${ui.esc(b.customerName)}<small>${b.travelers} traveler(s)</small></td><td>${ui.esc(b.packageTitle)}</td><td>${ui.date(b.travelDate)}</td><td>${ui.money(b.totalAmount)}</td><td>${ui.badge(b.bookingStatus)}</td><td><button class="pv-btn pv-btn--ghost pv-btn--sm" data-view="${ui.esc(b.id)}">Details</button></td></tr>`).join('')}</tbody></table></div>`;
      box.onclick = (e) => { if (e.target.dataset.view) details(e.target.dataset.view); };
    } catch (e) { ui.error(box, e, load); }
  }
  async function details(id) {
    try {
      const b = await ProviderAPI.getBooking(id);
      const m = ui.modal(`<h3>Booking ${ui.esc(b.id)}</h3><dl class="pv-dl"><dt>Customer</dt><dd>${ui.esc(b.customerName)}<br><small>${ui.esc(b.customerEmail)}</small></dd><dt>Package</dt><dd>${ui.esc(b.packageTitle)}</dd><dt>Travel date</dt><dd>${ui.date(b.travelDate)}</dd><dt>Travelers</dt><dd>${b.travelers}</dd><dt>Total</dt><dd>${ui.money(b.totalAmount)}</dd><dt>Payment (mock)</dt><dd>${ui.esc(b.paymentStatus.replace('_', ' '))}</dd><dt>Booked</dt><dd>${ui.date(b.bookedAt)}</dd><dt>Status</dt><dd>${ui.badge(b.bookingStatus)}</dd></dl>
      <div class="pv-modal-actions"><button class="pv-btn pv-btn--ghost" data-x>Close</button>${(NEXT[b.bookingStatus] || []).map(([s, l]) => `<button class="pv-btn ${s === 'cancelled' ? 'pv-btn--danger' : ''}" data-s="${s}">${l}</button>`).join('')}</div>`);
      ui.$('[data-x]', m.el).onclick = m.close;
      m.el.querySelectorAll('[data-s]').forEach((btn) => { btn.onclick = async () => {
        const s = btn.dataset.s; if (!(await ui.confirm(btn.textContent + '?', `Booking ${b.id} will be marked ${s}.` + (s === 'cancelled' ? ' Seats return to the date.' : ''), btn.textContent, s === 'cancelled'))) return;
        try { await ProviderAPI.setBookingStatus(b.id, s); ui.toast('Booking ' + s); m.close(); load(); } catch (er) { ui.toast(er.message, 'err'); }
      }; });
    } catch (e) { ui.toast(e.message, 'err'); }
  }
  init();
})();
