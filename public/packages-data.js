/*
  YAATHIRAI — package data (single source for the homepage spread and package.html).

  IMPORTANT: the project had no package data, so `duration`, `guests` and `price`
  below are PLACEHOLDERS for the development preview only. `price: null` renders
  as "₹ ——". Names and card taglines (max 6 words) are placeholder copy; descriptions and image paths
  are the ones already used by the Destinations section. Replace this file with
  real data (or load it from your backend) before launch.
  Optional fields package.html will render when present:
    itinerary: [{ day: 1, title: "", details: "" }], inclusions: [], exclusions: [],
    dates: [], bookingConditions: ""
*/
window.YAATHIRAI_PACKAGES_PREVIEW = true;
window.YAATHIRAI_PACKAGES = [
  { id: "ooty", name: "Misty Tea Trails", tagline: "Tea gardens and misty mornings", destination: "Ooty", region: "The Nilgiris",
    image: "images/ooty.jpg", imageAlt: "Misty hills and tea gardens of Ooty",
    description: "Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.",
    days: 3, nights: 2, guests: 2, price: null, priceUnit: "person" },
  { id: "kodaikanal", name: "Pine and Lake Retreat", tagline: "Quiet lakes, cool pine trails", destination: "Kodaikanal", region: "Princess of Hill Stations",
    image: "images/kodaikanal.jpg", imageAlt: "Pine trails and lake views in Kodaikanal",
    description: "Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.",
    days: 3, nights: 2, guests: 2, price: null, priceUnit: "person" },
  { id: "kanyakumari", name: "Sunrise at Land's End", tagline: "Southern sunrises and ocean horizons", destination: "Kanyakumari", region: "Where three waters meet",
    image: "images/kanyakumari.jpg", imageAlt: "Sunrise over the Kanyakumari coastline",
    description: "Colourful coastal skies, ocean horizons, and unforgettable sunrises at India's southern tip.",
    days: 2, nights: 1, guests: 4, price: null, priceUnit: "person" },
  { id: "madurai", name: "Temple Town Trails", tagline: "Ancient temples and lively streets", destination: "Madurai", region: "The city of temples",
    image: "images/madurai.jpg", imageAlt: "Temple towers of Madurai",
    description: "Ancient temple towers, lively streets, and food and traditions woven into everyday life.",
    days: 2, nights: 1, guests: 2, price: null, priceUnit: "person" },
  { id: "rameswaram", name: "Sacred Sea Journey", tagline: "Sacred corridors and sea breezes", destination: "Rameswaram", region: "A journey by the sea",
    image: "images/rameswaram.jpg", imageAlt: "Blue coastal waters at Rameswaram",
    description: "Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.",
    days: 3, nights: 2, guests: 2, price: null, priceUnit: "person" },
  { id: "mahabalipuram", name: "Shore Temple Stories", tagline: "Carved stone and coastal sunsets", destination: "Mahabalipuram", region: "Heritage by the shore",
    image: "images/mahabalipuram.jpg", imageAlt: "Shore temple and stone carvings at Mahabalipuram",
    description: "Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.",
    days: 2, nights: 1, guests: 2, price: null, priceUnit: "person" },
  { id: "tiruchendur", name: "Coastal Temple Calm", tagline: "Temple traditions beside the waves", destination: "Tiruchendur", region: "A temple beside the sea",
    image: "images/tiruchendur.jpg", imageAlt: "Temple and coastline at Tiruchendur",
    description: "A coastal pilgrimage town where temple traditions meet the sound of the waves.",
    days: 2, nights: 1, guests: 4, price: null, priceUnit: "person" },
  { id: "velankanni", name: "Seaside Basilica Break", tagline: "Peaceful basilica, gentle coastal breeze", destination: "Velankanni", region: "A peaceful coastal escape",
    image: "images/velankanni.jpg", imageAlt: "Basilica and seaside at Velankanni",
    description: "A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.",
    days: 2, nights: 1, guests: 2, price: null, priceUnit: "person" }
];