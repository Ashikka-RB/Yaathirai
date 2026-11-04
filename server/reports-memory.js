// ========================================================
// YAATHIRAI — REPORTS (in-memory repository version)
// Used by GET /api/admin/reports when MySQL is not connected.
// Produces exactly the same JSON shape as the MySQL queries.
// ========================================================

function buildMemoryReport(mem, { from, to, destId }) {
  const pkgs = mem.tour_packages || [];
  const pkgById = new Map(pkgs.map((p) => [p.package_id, p]));
  const dayOf = (b) => String(b.booked_at || '').slice(0, 10);

  const inRange = (b) => (!from || dayOf(b) >= from) && (!to || dayOf(b) <= to);
  const inDest = (b) => {
    if (!destId) return true;
    const p = pkgById.get(b.package_id);
    return !!p && p.destination_id === destId;
  };
  const amount = (b) => Number(b.total_amount) || 0;
  const paid = (b) => b.payment_status === 'paid';
  const notCancelled = (b) => b.booking_status !== 'cancelled';

  // Bookings that belong to a known package, inside the filters
  const filtered = (mem.bookings || []).filter((b) => pkgById.has(b.package_id) && inRange(b) && inDest(b));

  // 1. Booking summary by status
  const statusMap = new Map();
  filtered.forEach((b) => {
    const row = statusMap.get(b.booking_status) || { booking_status: b.booking_status, count: 0, amount: 0 };
    row.count += 1;
    row.amount += amount(b);
    statusMap.set(b.booking_status, row);
  });
  const bookingSummary = [...statusMap.values()];

  // 2. Revenue totals
  const sum = (list) => list.reduce((s, b) => s + amount(b), 0);
  const revenueTotals = {
    total_bookings: filtered.length,
    total_travelers: filtered.reduce((s, b) => s + (Number(b.travelers) || 0), 0),
    collected_revenue: sum(filtered.filter(paid)),
    pending_revenue: sum(filtered.filter((b) => b.payment_status === 'unpaid' && notCancelled(b))),
    refunded_amount: sum(filtered.filter((b) => b.payment_status === 'refunded')),
    booked_value: sum(filtered.filter(notCancelled))
  };

  // 3. Destination popularity
  const destinations = mem.destinations || [];
  const destinationStats = destinations
    .filter((d) => !destId || d.destination_id === destId)
    .map((d) => {
      const dPkgs = pkgs.filter((p) => p.destination_id === d.destination_id);
      const ids = new Set(dPkgs.map((p) => p.package_id));
      const dBookings = filtered.filter((b) => ids.has(b.package_id));
      return {
        destination_id: d.destination_id,
        destination_name: d.name,
        package_count: dPkgs.length,
        booking_count: dBookings.filter(notCancelled).length,
        revenue: sum(dBookings.filter(paid))
      };
    })
    .sort((a, b) => b.booking_count - a.booking_count || b.revenue - a.revenue);

  // 4. Top packages by collected revenue
  const topPackages = pkgs
    .filter((p) => !destId || p.destination_id === destId)
    .map((p) => {
      const pb = filtered.filter((b) => b.package_id === p.package_id);
      const dest = destinations.find((d) => d.destination_id === p.destination_id);
      const prov = (mem.users || []).find((u) => u.user_id === p.provider_id);
      return {
        package_id: p.package_id,
        package_name: p.title,
        destination_name: dest ? dest.name : '',
        provider_name: prov ? prov.name : '',
        booking_count: pb.filter(notCancelled).length,
        revenue: sum(pb.filter(paid))
      };
    })
    .filter((p) => p.booking_count > 0)
    .sort((a, b) => b.revenue - a.revenue || b.booking_count - a.booking_count)
    .slice(0, 10);

  // 5. Monthly trend (last 6 months unless a range is chosen)
  let trendSource = filtered;
  if (!from && !to) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)).toISOString().slice(0, 10);
    trendSource = filtered.filter((b) => dayOf(b) >= start);
  }
  const monthMap = new Map();
  trendSource.forEach((b) => {
    const key = String(b.booked_at || '').slice(0, 7);
    if (!key) return;
    const row = monthMap.get(key) || { month: key, bookings: 0, revenue: 0 };
    row.bookings += 1;
    if (paid(b)) row.revenue += amount(b);
    monthMap.set(key, row);
  });
  const monthlyTrend = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-24);

  return {
    success: true,
    filters: { from: from || null, to: to || null, destination_id: destId || null },
    bookingSummary,
    revenueTotals,
    destinationStats,
    topPackages,
    monthlyTrend,
    destinations: destinations
      .map((d) => ({ destination_id: d.destination_id, name: d.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

module.exports = { buildMemoryReport };