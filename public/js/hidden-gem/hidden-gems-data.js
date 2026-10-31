
/* =========================================================
   YAATHIRAI — HIDDEN GEMS DATA

   EDIT THIS FILE to replace illustrative content with verified data.

   VERIFIED vs ILLUSTRATIVE
   ---------------------------------------------------------
   - Place names, districts and descriptions are general
     descriptions of real Tamil Nadu places. Verify before launch.
   - lat/lng are approximate area coordinates, not surveyed points.
   - bestTime, duration, how, todo, local and tips come from
     category templates and are illustrative.
   - Override a template for an individual place by adding
     the same property to that destination.
   - budget is a rough tier (budget | mid | premium), not a price.
   - trend and added are sample ordering values, not analytics.
   - Photos can be added using image or images properties.
     Until then, generated illustrations are displayed.
========================================================= */


/* =========================================================
   1. CATEGORY TEMPLATES
========================================================= */

window.HG_CATEGORIES = {

    waterfalls: {
        label: 'Hidden Waterfalls',
        icon: '💧',
        bestTime: 'Post-monsoon months (illustrative)',
        duration: 'Half day (illustrative)',

        how: 'Usually a road journey to the nearest town, then a local ride or short walk. Verify the route and water-level safety locally.',

        todo: [
            'Walk to the viewpoint',
            'Photography',
            'Picnic in permitted areas'
        ],

        local: [
            'Chat with local guides about the stream and forest',
            'Try snacks from nearby village stalls'
        ],

        tips: [
            'Check entry rules and water-level advisories before going',
            'Wear shoes with grip',
            'Avoid bathing where it is not permitted'
        ]
    },

    beaches: {
        label: 'Secret Beaches',
        icon: '🌊',
        bestTime: 'Cooler months (illustrative)',
        duration: 'Half day (illustrative)',

        how: 'Reach the nearest coastal town by road or rail, then a local ride. Verify the route locally.',

        todo: [
            'Sunrise or sunset walk',
            'Photography',
            'Watch fishing activity from a respectful distance'
        ],

        local: [
            'Meet fishing communities',
            'Try fresh coastal snacks from local stalls'
        ],

        tips: [
            'Check sea conditions before entering water',
            'Carry water and sun protection',
            'Take your litter back'
        ]
    },

    hills: {
        label: 'Unexplored Hill Stations',
        icon: '⛰️',
        bestTime: 'Cooler months (illustrative)',
        duration: '1–2 days (illustrative)',

        how: 'Usually a road journey with a hill-road stretch. Verify the route, timings and vehicle rules locally.',

        todo: [
            'Viewpoint drives',
            'Short nature walks',
            'Visit local markets'
        ],

        local: [
            'Stay with a local host if available',
            'Try regional hill produce'
        ],

        tips: [
            'Pack layers',
            'Check hill-road conditions',
            'Book stays ahead in holiday periods'
        ]
    },

    heritage: {
        label: 'Ancient Temples & Heritage',
        icon: '🛕',
        bestTime: 'Cooler months (illustrative)',
        duration: '2–4 hours (illustrative)',

        how: 'Reach the nearest town by road or rail, then a local ride. Verify the route locally.',

        todo: [
            'Architecture and sculpture walk',
            'Photography where permitted',
            'Read temple history boards'
        ],

        local: [
            'Join a local guide for context',
            'Visit nearby craft or food stalls'
        ],

        tips: [
            'Dress modestly',
            'Check visiting hours and photography rules locally',
            'Remove footwear where required'
        ]
    },

    villages: {
        label: 'Peaceful Villages',
        icon: '🏡',
        bestTime: 'Cooler months (illustrative)',
        duration: 'Half to full day (illustrative)',

        how: 'Usually a road journey from the nearest town. Verify the route locally.',

        todo: [
            'Heritage-house or lane walk',
            'Meet local artisans',
            'Photography with permission'
        ],

        local: [
            'Home-style meals if offered by hosts',
            'Craft demonstrations'
        ],

        tips: [
            'Ask before photographing people or homes',
            'Support local sellers',
            'Keep noise low'
        ]
    },

    wildlife: {
        label: 'Nature & Wildlife',
        icon: '🦜',
        bestTime: 'Varies by season (illustrative)',
        duration: 'Half day (illustrative)',

        how: 'Road journey to the nearest town, then a local or permitted vehicle. Verify access rules and permits locally.',

        todo: [
            'Guided nature walk or boat ride where offered',
            'Birdwatching',
            'Photography'
        ],

        local: [
            'Talk to forest-department guides',
            'Learn about local ecology'
        ],

        tips: [
            'Follow forest rules',
            'Keep quiet and avoid feeding wildlife',
            'Check permit and timing requirements'
        ]
    },

    food: {
        label: 'Local Food Experiences',
        icon: '🍛',
        bestTime: 'Year-round (illustrative)',
        duration: '2–3 hours (illustrative)',

        how: 'Located in a town; reachable by road or rail. Verify details locally.',

        todo: [
            'Eat at long-standing local eateries',
            'Visit local markets',
            'Try regional specialities'
        ],

        local: [
            'Ask locals for their favourites',
            'Join a food walk if available'
        ],

        tips: [
            'Go hungry',
            'Ask about spice levels and ingredients',
            'Carry small cash for stalls'
        ]
    },

    culture: {
        label: 'Cultural & Traditional Experiences',
        icon: '🎭',
        bestTime: 'Year-round (illustrative)',
        duration: '2–3 hours (illustrative)',

        how: 'Located in a town; reachable by road or rail. Verify details locally.',

        todo: [
            'Visit a craft workshop',
            'Watch a demonstration',
            'Learn about the tradition'
        ],

        local: [
            'Speak with artisans',
            'Buy directly from makers'
        ],

        tips: [
            'Call ahead where possible',
            'Ask before filming',
            'Buy only genuine, fairly priced work'
        ]
    },

    adventure: {
        label: 'Offbeat Adventure Spots',
        icon: '🥾',
        bestTime: 'Dry, cooler months (illustrative)',
        duration: 'Full day (illustrative)',

        how: 'Road journey to a base village, then trail or off-road stretch. Verify permits, guides and safety locally.',

        todo: [
            'Guided trek or off-road drive',
            'Sunrise viewpoint',
            'Photography'
        ],

        local: [
            'Hire local guides',
            'Eat at village stalls'
        ],

        tips: [
            'Start early',
            'Carry water and first aid',
            'Check weather and permit rules'
        ]
    }

};


/* =========================================================
   2. HIDDEN GEMS DESTINATION DATA

   exp: nature | heritage | adventure | cultural
   travel: solo | friends | family | couples
   budget: budget | mid | premium
========================================================= */

window.HIDDEN_GEMS = [

    {
        id: 'manimuthar',
        name: 'Manimuthar Falls',
        district: 'Tirunelveli',
        cat: 'waterfalls',

        lat: 8.62,
        lng: 77.43,

        exp: ['nature'],
        travel: ['friends', 'family', 'couples'],
        budget: 'budget',

        desc: 'Waterfall and reservoir area in the Western Ghats foothills of Tirunelveli district.',
        special: 'A hill-and-water setting that suits a slow, scenic day out.',

        featured: true,
        trend: 70,
        added: 3
    },

    {
        id: 'thirumoorthy',
        name: 'Thirumoorthy Falls',
        district: 'Tiruppur',
        cat: 'waterfalls',

        lat: 10.40,
        lng: 77.25,

        exp: ['nature', 'heritage'],
        travel: ['family', 'friends'],
        budget: 'budget',

        desc: 'Western Ghats waterfall near Udumalpet, set beside a hill temple.',
        special: 'Pairs a natural waterfall with a temple visit.',

        trend: 55,
        added: 8
    },

    {
        id: 'kumbakkarai',
        name: 'Kumbakkarai Falls',
        district: 'Theni',
        cat: 'waterfalls',

        lat: 10.17,
        lng: 77.47,

        exp: ['nature'],
        travel: ['solo', 'friends'],
        budget: 'budget',

        desc: 'Forest-stream waterfall near Periyakulam in Theni district.',
        special: 'Green foothill scenery in the Theni region.',

        trend: 40,
        added: 12
    },

    {
        id: 'manapad',
        name: 'Manapad',
        district: 'Thoothukudi',
        cat: 'beaches',

        lat: 8.38,
        lng: 78.06,

        exp: ['nature', 'heritage'],
        travel: ['solo', 'couples', 'friends'],
        budget: 'budget',

        desc: 'Quiet Gulf of Mannar coastal village with a historic church and a long shoreline.',
        special: 'Coastline and heritage in one small village.',

        featured: true,
        trend: 80,
        added: 2
    },

    {
        id: 'tharangambadi',
        name: 'Tharangambadi (Tranquebar)',
        district: 'Mayiladuthurai',
        cat: 'beaches',

        lat: 11.03,
        lng: 79.85,

        exp: ['heritage', 'nature'],
        travel: ['couples', 'solo', 'family'],
        budget: 'mid',

        desc: 'Former Danish trading town on the Coromandel coast with Fort Dansborg and a seafront.',
        special: 'Colonial-era history beside the sea.',

        featured: true,
        trend: 65,
        added: 5
    },

    {
        id: 'kolli',
        name: 'Kolli Hills',
        district: 'Namakkal',
        cat: 'hills',

        lat: 11.25,
        lng: 78.35,

        exp: ['nature', 'adventure'],
        travel: ['friends', 'family', 'couples'],
        budget: 'budget',

        desc: 'Forested hill range in Namakkal district, reached by a winding hill road, with the Agaya Gangai falls.',
        special: 'Hill-road drive and forest walks.',

        trend: 60,
        added: 9
    },

    {
        id: 'meghamalai',
        name: 'Meghamalai',
        district: 'Theni',
        cat: 'hills',

        lat: 9.68,
        lng: 77.40,

        exp: ['nature'],
        travel: ['couples', 'solo', 'friends'],
        budget: 'mid',

        desc: 'Cloud-draped tea and cardamom hill region in Theni district.',
        special: 'Tea-estate landscapes in the Western Ghats.',

        featured: true,
        trend: 75,
        added: 1
    },

    {
        id: 'kalrayan',
        name: 'Kalrayan Hills',
        district: 'Kallakurichi',
        cat: 'hills',

        lat: 11.80,
        lng: 78.67,

        exp: ['nature', 'cultural'],
        travel: ['solo', 'friends'],
        budget: 'budget',

        desc: 'Quiet hill range in Kallakurichi district with village settlements.',
        special: 'A low-key hill region for slow exploring.',

        trend: 35,
        added: 14
    },

    {
        id: 'valparai',
        name: 'Valparai',
        district: 'Coimbatore',
        cat: 'hills',

        lat: 10.33,
        lng: 76.96,

        exp: ['nature'],
        travel: ['family', 'couples', 'friends'],
        budget: 'mid',

        desc: 'Plateau hill town amid tea estates and rainforest in the Anamalai range.',
        special: 'Tea estates and rainforest on one road.',

        trend: 85,
        added: 6
    },

    {
        id: 'gangaikonda',
        name: 'Gangaikonda Cholapuram',
        district: 'Ariyalur',
        cat: 'heritage',

        lat: 11.20,
        lng: 79.45,

        exp: ['heritage', 'cultural'],
        travel: ['family', 'solo', 'couples'],
        budget: 'budget',

        desc: 'Chola-era capital town with a large Shiva temple, a UNESCO World Heritage Site.',
        special: 'A major Chola monument away from the usual circuits.',

        featured: true,
        trend: 72,
        added: 4
    },

    {
        id: 'darasuram',
        name: 'Darasuram (Airavatesvara Temple)',
        district: 'Thanjavur',
        cat: 'heritage',

        lat: 10.95,
        lng: 79.36,

        exp: ['heritage', 'cultural'],
        travel: ['solo', 'family', 'couples'],
        budget: 'budget',

        desc: 'Temple known for fine stone carving, part of the Great Living Chola Temples UNESCO listing.',
        special: 'Detailed sculpture worth a slow look.',

        trend: 68,
        added: 7
    },

    {
        id: 'kanadukathan',
        name: 'Kanadukathan (Chettinad)',
        district: 'Sivaganga',
        cat: 'villages',

        lat: 10.08,
        lng: 78.78,

        exp: ['heritage', 'cultural'],
        travel: ['couples', 'family', 'solo'],
        budget: 'mid',

        desc: 'Chettinad village known for large traditional mansions.',
        special: 'Walkable lanes of heritage mansions.',

        featured: true,
        trend: 78,
        added: 10
    },

    {
        id: 'athangudi',
        name: 'Athangudi',
        district: 'Sivaganga',
        cat: 'villages',

        lat: 10.08,
        lng: 78.82,

        exp: ['cultural'],
        travel: ['friends', 'family', 'solo'],
        budget: 'budget',

        desc: 'Chettinad village known for handmade, colourful floor tiles.',
        special: 'See a regional craft at the source.',

        trend: 50,
        added: 11
    },

    {
        id: 'pichavaram',
        name: 'Pichavaram Mangroves',
        district: 'Cuddalore',
        cat: 'wildlife',

        lat: 11.43,
        lng: 79.78,

        exp: ['nature', 'adventure'],
        travel: ['friends', 'family', 'couples'],
        budget: 'budget',

        desc: 'Mangrove backwaters near Chidambaram, explored by boat.',
        special: 'Boat rides through mangrove channels.',

        trend: 82,
        added: 13
    },

    {
        id: 'vedanthangal',
        name: 'Vedanthangal Bird Sanctuary',
        district: 'Chengalpattu',
        cat: 'wildlife',

        lat: 12.54,
        lng: 79.86,

        exp: ['nature'],
        travel: ['solo', 'family'],
        budget: 'budget',

        desc: 'Wetland bird sanctuary in Chengalpattu district.',
        special: 'Birdwatching close to Chennai.',

        trend: 45,
        added: 15
    },

    {
        id: 'topslip',
        name: 'Top Slip (Anamalai)',
        district: 'Coimbatore',
        cat: 'wildlife',

        lat: 10.47,
        lng: 76.84,

        exp: ['nature', 'adventure'],
        travel: ['friends', 'family'],
        budget: 'mid',

        desc: 'Forest area within the Anamalai Tiger Reserve, Coimbatore district.',
        special: 'Rainforest and wildlife-country scenery.',

        trend: 62,
        added: 16
    },

    {
        id: 'kumbakonam',
        name: 'Kumbakonam Food Trail',
        district: 'Thanjavur',
        cat: 'food',

        lat: 10.96,
        lng: 79.38,

        exp: ['cultural'],
        travel: ['solo', 'friends', 'family'],
        budget: 'budget',

        desc: 'Kaveri delta temple town with a strong traditional food culture.',
        special: 'Temples and traditional eating in one town.',

        trend: 58,
        added: 17
    },

    {
        id: 'karaikudi',
        name: 'Karaikudi Chettinad Cuisine',
        district: 'Sivaganga',
        cat: 'food',

        lat: 10.07,
        lng: 78.78,

        exp: ['cultural'],
        travel: ['friends', 'couples', 'family'],
        budget: 'mid',

        desc: 'Town at the heart of Chettinad, known for its regional cuisine.',
        special: 'A chance to eat the cuisine where it comes from.',

        trend: 74,
        added: 18
    },

    {
        id: 'swamimalai',
        name: 'Swamimalai Bronze Casting',
        district: 'Thanjavur',
        cat: 'culture',

        lat: 10.96,
        lng: 79.33,

        exp: ['cultural', 'heritage'],
        travel: ['solo', 'couples', 'family'],
        budget: 'mid',

        desc: 'Temple town known for traditional bronze-icon casting.',
        special: 'Watch an age-old craft in a workshop.',

        featured: true,
        trend: 66,
        added: 19
    },

    {
        id: 'sathuragiri',
        name: 'Sathuragiri Hills',
        district: 'Virudhunagar',
        cat: 'adventure',

        lat: 9.70,
        lng: 77.68,

        exp: ['adventure', 'heritage', 'nature'],
        travel: ['friends', 'solo'],
        budget: 'budget',

        desc: 'Forested hill with a Shiva-temple pilgrimage trail in Virudhunagar district.',
        special: 'A trail that blends trekking with pilgrimage.',

        trend: 52,
        added: 20
    },

    {
        id: 'kolukkumalai',
        name: 'Kolukkumalai',
        district: 'Theni',
        cat: 'adventure',

        lat: 10.08,
        lng: 77.20,

        exp: ['adventure', 'nature'],
        travel: ['friends', 'couples'],
        budget: 'mid',

        desc: 'High-altitude tea-estate viewpoint region on the Theni–Idukki border area, reached by off-road jeep.',
        special: 'An off-road jeep climb to tea-covered ridges.',

        featured: false,
        trend: 88,
        added: 21
    }

];
