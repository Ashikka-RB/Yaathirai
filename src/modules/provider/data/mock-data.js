'use strict';
// MOCK DATA ONLY. Not real customers, bookings or payments. Shapes follow the assignment's
// tour_packages / package_itinerary / package_availability / bookings / reviews tables.
const d = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const at = (n) => new Date(Date.now() + n * 86400000).toISOString();

module.exports = {
  users: {
    'prov-1': { id: 'prov-1', name: 'Karthik Subramanian', email: 'karthik@example.com', role: 'PROVIDER', status: 'approved', city: 'Ooty' },
    'prov-2': { id: 'prov-2', name: 'Meena Rajan', email: 'meena@example.com', role: 'PROVIDER', status: 'approved', city: 'Mahabalipuram' },
    'cust-1': { id: 'cust-1', name: 'Test Customer', email: 'cust@example.com', role: 'CUSTOMER', status: 'active' }
  },
  packages: [
    { id: 'pkg-1', providerId: 'prov-1', destination: 'Ooty', category: 'Nature', title: 'Ooty Tea Estate & Toy Train Trail', description: 'Walk a working tea estate, ride the Nilgiri toy train and watch sunset from Doddabetta with a local host.', durationDays: 2, price: 4500, capacity: 12, image: '', status: 'approved', createdAt: at(-60),
      itinerary: [{ title: 'Estate walk & tasting', description: 'Morning plucking demo and tea tasting.' }, { title: 'Toy train & viewpoint', description: 'Coonoor to Ooty train, then Doddabetta.' }],
      inclusions: ['Local guide', 'Toy train tickets', 'Breakfast'], exclusions: ['Lunch', 'Personal expenses'] },
    { id: 'pkg-2', providerId: 'prov-1', destination: 'Madurai', category: 'Food & Culture', title: 'Madurai Temple & Street Food Walk', description: 'An evening heritage walk around Meenakshi temple followed by a guided tour of Madurai street food.', durationDays: 1, price: 1800, capacity: 15, image: '', status: 'approved', createdAt: at(-45),
      itinerary: [{ title: 'Temple & food walk', description: 'Temple precinct, flower market and 6 food stops.' }],
      inclusions: ['Guide', 'Food tastings'], exclusions: ['Temple camera fee'] },
    { id: 'pkg-3', providerId: 'prov-1', destination: 'Kanyakumari', category: 'Beach', title: 'Kanyakumari Sunrise & Coastal Villages', description: 'Three days along the southern tip: sunrise point, fishing hamlets and Vivekananda Rock with a local family host.', durationDays: 3, price: 7200, capacity: 10, image: '', status: 'pending', createdAt: at(-5),
      itinerary: [{ title: 'Arrival & sunset', description: 'Check in and sunset at the point.' }, { title: 'Fishing village', description: 'Morning with a fishing family.' }, { title: 'Rock memorial', description: 'Ferry to Vivekananda Rock.' }],
      inclusions: ['Homestay', 'Meals', 'Ferry'], exclusions: ['Transport to Kanyakumari'] },
    { id: 'pkg-4', providerId: 'prov-2', destination: 'Mahabalipuram', category: 'Heritage', title: 'Mahabalipuram Heritage Cycle Tour', description: 'Cycle between the shore temple, rock-cut caves and sculptor studios with a local historian.', durationDays: 1, price: 2200, capacity: 8, image: '', status: 'approved', createdAt: at(-30),
      itinerary: [{ title: 'Cycle circuit', description: 'Seven monuments by bicycle.' }], inclusions: ['Cycle', 'Guide'], exclusions: ['Entry tickets'] }
  ],
  availability: [
    { id: 'av-1', packageId: 'pkg-1', date: d(10), seatsAvailable: 6, status: 'open' },
    { id: 'av-2', packageId: 'pkg-1', date: d(24), seatsAvailable: 12, status: 'open' },
    { id: 'av-3', packageId: 'pkg-1', date: d(-12), seatsAvailable: 7, status: 'closed' },
    { id: 'av-4', packageId: 'pkg-2', date: d(5), seatsAvailable: 12, status: 'open' },
    { id: 'av-5', packageId: 'pkg-2', date: d(-20), seatsAvailable: 12, status: 'closed' },
    { id: 'av-6', packageId: 'pkg-3', date: d(30), seatsAvailable: 10, status: 'open' },
    { id: 'av-7', packageId: 'pkg-4', date: d(8), seatsAvailable: 6, status: 'open' }
  ],
  bookings: [
    { id: 'bk-1', packageId: 'pkg-1', availabilityId: 'av-1', customerName: 'Ananya R.', customerEmail: 'ananya@example.com', travelers: 2, totalAmount: 9000, bookingStatus: 'pending', paymentStatus: 'mock_pending', bookedAt: at(-2) },
    { id: 'bk-2', packageId: 'pkg-1', availabilityId: 'av-1', customerName: 'Vikram S.', customerEmail: 'vikram@example.com', travelers: 4, totalAmount: 18000, bookingStatus: 'confirmed', paymentStatus: 'mock_paid', bookedAt: at(-6) },
    { id: 'bk-3', packageId: 'pkg-2', availabilityId: 'av-4', customerName: 'Divya L.', customerEmail: 'divya@example.com', travelers: 3, totalAmount: 5400, bookingStatus: 'pending', paymentStatus: 'mock_pending', bookedAt: at(-1) },
    { id: 'bk-4', packageId: 'pkg-1', availabilityId: 'av-3', customerName: 'Rohit M.', customerEmail: 'rohit@example.com', travelers: 3, totalAmount: 13500, bookingStatus: 'confirmed', paymentStatus: 'mock_paid', bookedAt: at(-20) },
    { id: 'bk-5', packageId: 'pkg-2', availabilityId: 'av-5', customerName: 'Sana K.', customerEmail: 'sana@example.com', travelers: 2, totalAmount: 3600, bookingStatus: 'completed', paymentStatus: 'mock_paid', bookedAt: at(-30) },
    { id: 'bk-6', packageId: 'pkg-2', availabilityId: 'av-5', customerName: 'Arjun P.', customerEmail: 'arjun@example.com', travelers: 1, totalAmount: 1800, bookingStatus: 'completed', paymentStatus: 'mock_paid', bookedAt: at(-31) },
    { id: 'bk-7', packageId: 'pkg-4', availabilityId: 'av-7', customerName: 'Other Provider Customer', customerEmail: 'x@example.com', travelers: 2, totalAmount: 4400, bookingStatus: 'confirmed', paymentStatus: 'mock_paid', bookedAt: at(-3) },
    { id: 'bk-8', packageId: 'pkg-1', availabilityId: 'av-3', customerName: 'Meera T.', customerEmail: 'meera@example.com', travelers: 2, totalAmount: 9000, bookingStatus: 'completed', paymentStatus: 'mock_paid', bookedAt: at(-22) },
    { id: 'bk-9', packageId: 'pkg-1', availabilityId: 'av-2', customerName: 'Kiran B.', customerEmail: 'kiran@example.com', travelers: 2, totalAmount: 9000, bookingStatus: 'cancelled', paymentStatus: 'mock_refunded', bookedAt: at(-8) }
  ],
  reviews: [
    { id: 'rv-1', bookingId: 'bk-5', packageId: 'pkg-2', customerName: 'Sana K.', rating: 5, comment: 'Best food walk I have done. Our host knew every vendor by name.', createdAt: at(-18) },
    { id: 'rv-2', bookingId: 'bk-6', packageId: 'pkg-2', customerName: 'Arjun P.', rating: 4, comment: 'Lovely evening, a little rushed at the last stop.', createdAt: at(-17) },
    { id: 'rv-3', bookingId: 'bk-8', packageId: 'pkg-1', customerName: 'Meera T.', rating: 5, comment: 'The tea estate walk was the highlight of our trip.', createdAt: at(-9) },
    { id: 'rv-4', bookingId: 'bk-x', packageId: 'pkg-4', customerName: 'Someone Else', rating: 3, comment: 'Belongs to another provider.', createdAt: at(-9) }
  ]
};
