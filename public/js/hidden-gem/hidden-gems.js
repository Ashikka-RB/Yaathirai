
/* =========================================================
   HIDDEN GEMS EXPLORER
   Vanilla JavaScript
   Routes:
   #/          → Discover page
   #/gem/:id   → Destination details
   #/saved     → Wishlist
========================================================= */

(function () {
    'use strict';

    /* =====================================================
       1. DOM HELPERS AND INITIAL CONFIGURATION
    ===================================================== */

    const $ = (s, r) => (r || document).querySelector(s);

    const esc = (s) =>
        String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));

    const root = $('#hgRoot');
    const D = window.HIDDEN_GEMS;
    const CAT = window.HG_CATEGORIES;

    const BUDGET = {
        budget: 'Budget-friendly',
        mid: 'Mid-range',
        premium: 'Premium'
    };

    const EXP = {
        nature: 'Nature',
        heritage: 'Heritage',
        adventure: 'Adventure',
        cultural: 'Cultural'
    };

    const TRAVEL = {
        solo: 'Solo',
        friends: 'Friends',
        family: 'Family',
        couples: 'Couples'
    };

    const state = {
        q: '',
        cat: '',
        district: '',
        travel: '',
        budget: '',
        exp: '',
    };

    /* =====================================================
       2. DATA VALIDATION
    ===================================================== */

    if (!Array.isArray(D) || !CAT) {
        root.innerHTML = `
            <div class="hg-wrap">
                <div class="hg-state">
                    <h3>Hidden gems could not load</h3>
                    <p>
                        The data file js/hidden-gems-data.js is
                        missing or invalid. Check the file and reload.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    /* =====================================================
       3. WISHLIST MANAGEMENT (LOCAL STORAGE)
       No database required
    ===================================================== */

    const KEY = 'yaathirai.hiddenGems.saved';

    const store = {
        get() {
            try {
                return JSON.parse(localStorage.getItem(KEY)) || [];
            } catch (e) {
                return [];
            }
        },

        set(a) {
            try {
                localStorage.setItem(KEY, JSON.stringify(a));
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    let saved = new Set(
        store.get().filter((id) => D.some((g) => g.id === id))
    );

    let toastT;

    function toast(m) {
        const t = $('#hgToast');

        t.textContent = m;
        t.classList.add('is-on');

        clearTimeout(toastT);

        toastT = setTimeout(() => {
            t.classList.remove('is-on');
        }, 2400);
    }

    function toggleSave(id) {
        saved.has(id)
            ? saved.delete(id)
            : saved.add(id);

        if (!store.set([...saved])) {
            toast('Browser storage is blocked — your wishlist will not persist.');
        } else {
            toast(
                saved.has(id)
                    ? 'Saved to your wishlist'
                    : 'Removed from wishlist'
            );
        }

        syncSaved();

        if (route().name === 'saved') {
            render();
        }
    }

    function syncSaved() {
        $('#hgSavedCount').textContent = saved.size;

        document.querySelectorAll('[data-save]').forEach((b) => {
            const on = saved.has(b.dataset.save);

            b.setAttribute('aria-pressed', on);

            b.textContent = b.classList.contains('hg-btn')
                ? (on ? '♥ Saved' : '♡ Save to wishlist')
                : (on ? '♥' : '♡');
        });
    }

    /* =====================================================
       4. GENERATED ILLUSTRATIONS
       Placeholder images until real photos are added
    ===================================================== */

    const PAL = {
        waterfalls: ['#d3ebe3', '#6fa58f', '#25483c'],
        beaches: ['#ffe3c2', '#7fc3c9', '#e0b878'],
        hills: ['#e5efe2', '#8db58c', '#2f5a46'],
        heritage: ['#f6dcc0', '#c9825a', '#5b3a2e'],
        villages: ['#f7e6c8', '#c9a15c', '#7a4a2a'],
        wildlife: ['#dcebd0', '#79a35d', '#2d4d2c'],
        food: ['#f9dfc4', '#d98a4a', '#7b3a1f'],
        culture: ['#f3d6d0', '#b0525a', '#5a2230'],
        adventure: ['#dbe6ee', '#7e97a8', '#2c3e4c']
    };

    const hash = (s) => {
        let h = 0;

        for (const c of s) {
            h = (h * 31 + c.charCodeAt(0)) >>> 0;
        }

        return h;
    };

    function art(g, v) {
        v = v || 0;

        const [a, b, c] = PAL[g.cat];
        const h = hash(g.id) + v * 977;
        const sx = 60 + ((h >> 2) % 280);
        const o = v * 22 - 22;

        let m = '';

        switch (g.cat) {
            case 'waterfalls':
                m = `
                    <path
                        d="M0 300V130l90-30 70 20 80-40 90 30 70-10v200z"
                        fill="${c}"
                    />
                    <rect
                        x="${170 + o}"
                        y="104"
                        width="40"
                        height="196"
                        rx="8"
                        fill="#fff"
                        opacity=".85"
                    />
                    <ellipse
                        cx="${190 + o}"
                        cy="292"
                        rx="72"
                        ry="14"
                        fill="#fff"
                        opacity=".5"
                    />
                `;
                break;

            case 'beaches':
                m = `
                    <rect y="170" width="400" height="130" fill="${b}"/>
                    <path
                        d="M0 235Q100 205 200 235T400 235V300H0z"
                        fill="${c}"
                    />
                    <path
                        d="M0 265Q100 245 200 265T400 265"
                        stroke="#fff"
                        stroke-width="3"
                        fill="none"
                        opacity=".6"
                    />
                `;
                break;

            case 'hills':
                m = `
                    <path
                        d="M0 220L110 110l90 90 80-100 120 120v80H0z"
                        fill="${b}"
                    />
                    <path
                        d="M0 260L90 170l110 90 90-70 110 90v20H0z"
                        fill="${c}"
                    />
                `;
                break;

            case 'heritage': {
                let t = '';

                for (let k = 0; k < 6; k++) {
                    t += `
                        <rect
                            x="${200 + o - (150 - k * 22) / 2}"
                            y="${240 - k * 28}"
                            width="${150 - k * 22}"
                            height="26"
                            fill="${c}"
                            opacity="${1 - k * .05}"
                        />
                    `;
                }

                m = `
                    <rect y="250" width="400" height="50" fill="${b}"/>
                    ${t}
                    <circle cx="${200 + o}" cy="62" r="6" fill="${c}"/>
                `;
                break;
            }

            case 'villages':
                m = `<rect y="230" width="400" height="70" fill="${b}"/>` +
                    [0, 1, 2].map((i) => {
                        const x = 50 + i * 120 + o;

                        return `
                            <rect
                                x="${x}"
                                y="170"
                                width="80"
                                height="60"
                                fill="${c}"
                            />
                            <path
                                d="M${x - 8} 172l48-44 48 44z"
                                fill="${a}"
                                stroke="${c}"
                                stroke-width="3"
                            />
                        `;
                    }).join('');
                break;

            case 'wildlife':
                m = `<rect y="240" width="400" height="60" fill="${b}"/>` +
                    [0, 1, 2, 3, 4].map((i) => {
                        const x = 40 + i * 78 + o;

                        return `
                            <rect
                                x="${x + 14}"
                                y="190"
                                width="8"
                                height="55"
                                fill="${c}"
                            />
                            <circle
                                cx="${x + 18}"
                                cy="${170 - (i % 2) * 14}"
                                r="${34 - (i % 3) * 4}"
                                fill="${b}"
                            />
                        `;
                    }).join('');
                break;

            case 'food':
                m = `
                    <ellipse cx="${200 + o}" cy="215" rx="130" ry="48" fill="${c}"/>
                    <ellipse cx="${200 + o}" cy="205" rx="112" ry="38" fill="${a}"/>
                    <circle cx="${170 + o}" cy="200" r="16" fill="${b}"/>
                    <circle cx="${215 + o}" cy="208" r="13" fill="${c}" opacity=".7"/>
                ` +
                    [0, 1, 2].map((i) => `
                        <path
                            d="M${170 + i * 30 + o} 150q-10-18 0-34t0-30"
                            stroke="#fff"
                            stroke-width="4"
                            fill="none"
                            opacity=".7"
                        />
                    `).join('');
                break;

            case 'culture':
                m = [0, 1, 2, 3, 4].map((i) => `
                    <rect
                        x="${i * 85 + o}"
                        y="170"
                        width="60"
                        height="60"
                        transform="rotate(45 ${i * 85 + 30 + o} 200)"
                        fill="${i % 2 ? b : c}"
                        opacity=".85"
                    />
                `).join('') +
                    `<rect y="260" width="400" height="40" fill="${c}"/>`;
                break;

            default:
                m = `
                    <path
                        d="M0 300L120 90l90 120 70-80 120 170z"
                        fill="${c}"
                    />
                    <path
                        d="M120 90l-24 36 24 14 18-16z"
                        fill="#fff"
                        opacity=".8"
                    />
                    <path
                        d="M60 300l60-70 40 30 50-60 60 50"
                        stroke="${a}"
                        stroke-width="4"
                        fill="none"
                        stroke-dasharray="8 6"
                    />
                `;
        }

        const svg = `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="${a}"/>
                        <stop offset="1" stop-color="${b}"/>
                    </linearGradient>
                </defs>

                <rect width="400" height="300" fill="url(#g)"/>
                <circle
                    cx="${sx}"
                    cy="60"
                    r="26"
                    fill="#fff"
                    opacity=".55"
                />

                ${m}
            </svg>
        `;

        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    const photo = (g, v) =>
        (g.images && g.images[v]) ||
        (v === 0 && g.image) ||
        art(g, v);

    /* =====================================================
       5. GENERAL HELPERS AND ROUTING
    ===================================================== */

    const T = (g, k) => g[k] || CAT[g.cat][k];

    const route = () => {
        const h = location.hash.replace(/^#\/?/, '');

        if (h.startsWith('gem/')) {
            return {
                name: 'gem',
                id: decodeURIComponent(h.slice(4))
            };
        }

        if (h === 'saved') {
            return { name: 'saved' };
        }

        return { name: 'home' };
    };

    const km = (a, b) => {
        const R = 6371;
        const r = Math.PI / 180;

        const dLat = (b.lat - a.lat) * r;
        const dLng = (b.lng - a.lng) * r;

        const x =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(a.lat * r) *
            Math.cos(b.lat * r) *
            Math.sin(dLng / 2) ** 2;

        return 2 * R * Math.asin(Math.sqrt(x));
    };

    /* =====================================================
       6. SEARCH AND FILTER LOGIC
    ===================================================== */

    function matches(g) {
        const f = state;

        if (f.cat && g.cat !== f.cat) return false;

        if (f.district && g.district !== f.district) {
            return false;
        }

        if (f.travel && !g.travel.includes(f.travel)) {
            return false;
        }

        if (f.budget && g.budget !== f.budget) {
            return false;
        }

        if (f.exp && !g.exp.includes(f.exp)) {
            return false;
        }

        if (f.q) {
            const hay = [
                g.name,
                g.district,
                CAT[g.cat].label,
                g.exp.join(' '),
                g.travel.join(' '),
                g.desc,
                g.special
            ].join(' ').toLowerCase();

            if (
                !f.q.toLowerCase()
                    .split(/\s+/)
                    .every((t) => hay.includes(t))
            ) {
                return false;
            }
        }

        return true;
    }

    const filtersActive = () =>
        ['q', 'cat', 'district', 'travel', 'budget', 'exp']
            .some((k) => state[k]);

    /* =====================================================
       7. DESTINATION CARD GENERATION
    ===================================================== */

    function card(g) {
        const on = saved.has(g.id);
        const c = CAT[g.cat];

        return `
            <article class="hg-card">

                <a
                    class="hg-card-img"
                    href="#/gem/${esc(g.id)}"
                    aria-label="Explore ${esc(g.name)}"
                >
                    <img
                        loading="lazy"
                        src="${photo(g, 0)}"
                        alt="${esc(g.name)} — illustrative image"
                    >

                    <span class="hg-badge">
                        ${c.icon} ${esc(c.label)}
                    </span>
                </a>

                <button
                    class="hg-heart"
                    data-save="${esc(g.id)}"
                    aria-pressed="${on}"
                    aria-label="Save ${esc(g.name)} to wishlist"
                >
                    ${on ? '♥' : '♡'}
                </button>

                <div class="hg-card-body">

                    <div class="hg-meta">
                        ${esc(g.district)} district
                    </div>

                    <h3>${esc(g.name)}</h3>

                    <p>${esc(g.desc)}</p>

                    <dl class="hg-facts">
                        <div>
                            <dt>Best time*</dt>
                            <dd>${esc(T(g, 'bestTime'))}</dd>
                        </div>

                        <div>
                            <dt>Duration*</dt>
                            <dd>${esc(T(g, 'duration'))}</dd>
                        </div>
                    </dl>

                    <p class="hg-why">
                        <strong>Why it's special:</strong>
                        ${esc(g.special)}
                    </p>

                    <a class="hg-btn" href="#/gem/${esc(g.id)}">
                        Explore More →
                    </a>

                </div>
            </article>
        `;
    }

    const row = (title, sub, list) => `
        <section class="hg-section">

            <div class="hg-sec-head">
                <div>
                    <h2>${title}</h2>
                    <p>${sub}</p>
                </div>
            </div>

            <div class="hg-grid">
                ${list.map(card).join('')}
            </div>

        </section>
    `;


    /* =====================================================
       9. DISCOVER PAGE
    ===================================================== */

    function home() {
        const districts = [
            ...new Set(D.map((g) => g.district))
        ].sort();

        const opt = (o, all) =>
            `<option value="">${all}</option>` +
            Object.entries(o)
                .map(([k, v]) => `
                    <option value="${k}">${v}</option>
                `)
                .join('');

        root.innerHTML = `
            <section
                class="hg-hero"
                style="--hero-art:url('${art({
                    id: 'hero',
                    cat: 'hills'
                }, 1)}')"
            >
                <div class="hg-wrap">

                    <div class="hg-eyebrow">
                        Hidden Gems Explorer · Tamil Nadu
                    </div>

                    <h1>
                        Discover Tamil Nadu Beyond the Ordinary
                    </h1>

                    <p class="lead">
                        Quiet waterfalls, village lanes, forgotten
                        coastlines and local flavours — the places
                        guidebooks skip.
                    </p>

                    <form
                        class="hg-search"
                        id="hgSearch"
                        role="search"
                    >
                        <input
                            id="hgQ"
                            type="search"
                            placeholder="Search by name, district or experience…"
                            aria-label="Search hidden gems"
                            autocomplete="off"
                        >

                        <button class="hg-btn" type="submit">
                            Search
                        </button>
                    </form>

                </div>
            </section>

            <div class="hg-wrap">

                <p class="hg-note">
                    <strong>Sample content:</strong>
                    descriptions are general; best time, duration,
                    travel and budget details are illustrative and
                    unverified. Photos are generated illustrations
                    until real images are added.
                </p>

                <section class="hg-section">

                    <div class="hg-sec-head">
                        <div>
                            <h2>Browse by category</h2>
                            <p>
                                Pick a theme, or combine it with
                                the filters below.
                            </p>
                        </div>
                    </div>

                    <div class="hg-cats" id="hgCats"></div>

                    <div
                        class="hg-filters"
                        id="hgFilters"
                        style="margin-top:20px"
                    >

                        <label>
                            District
                            <select data-f="district">
                                <option value="">All districts</option>
                                ${districts.map((d) => `
                                    <option>${esc(d)}</option>
                                `).join('')}
                            </select>
                        </label>

                        <label>
                            Travel type
                            <select data-f="travel">
                                ${opt(TRAVEL, 'Anyone')}
                            </select>
                        </label>

                        <label>
                            Budget tier*
                            <select data-f="budget">
                                ${opt(BUDGET, 'Any budget')}
                            </select>
                        </label>

                        <label>
                            Experience
                            <select data-f="exp">
                                ${opt(EXP, 'All experiences')}
                            </select>
                        </label>

                        <button
                            class="hg-btn hg-btn--ghost"
                            data-reset
                            type="button"
                        >
                            Reset
                        </button>

                    </div>

                </section>

                <div id="hgCurated"></div>

                <section class="hg-section" id="hgResults">

                    <div class="hg-sec-head">
                        <div>
                            <h2 id="hgResTitle">
                                All hidden gems
                            </h2>

                            <p id="hgResCount"></p>
                        </div>

                        <button
                            class="hg-btn hg-btn--ghost"
                            id="hgMapBtn"
                            type="button"
                        >
                            🗺️ Show map
                        </button>
                    </div>

                    <div id="hgMapHost"></div>
                    <div id="hgGrid"></div>

                </section>

                <p style="padding:20px 0 50px;color:var(--muted);font-size:13px">
                    * Best time, duration and budget tier are
                    illustrative templates, not verified data.
                </p>

            </div>
        `;

        $('#hgQ').value = state.q;

        document.querySelectorAll('#hgFilters [data-f]')
            .forEach((s) => {
                s.value = state[s.dataset.f];
            });

        update();
    }

    /* =====================================================
       10. UPDATE DISCOVERY RESULTS
    ===================================================== */

    function update() {
        $('#hgCats').innerHTML = Object.entries(CAT)
            .map(([k, c]) => `
                <button
                    class="hg-cat ${state.cat === k ? 'is-on' : ''}"
                    data-cat="${k}"
                    aria-pressed="${state.cat === k}"
                >
                    <span>${c.icon}</span>
                    <b>${esc(c.label)}</b>
                    <small>
                        ${D.filter((g) => g.cat === k).length} places
                    </small>
                </button>
            `)
            .join('');

        const list = D.filter(matches);

        $('#hgCurated').innerHTML = filtersActive()
            ? ''
            : `
                <div class="hg-wrap" style="padding:0">

                    ${row(
                        'Featured hidden gems',
                        'Hand-picked starting points (sample selection).',
                        D.filter((g) => g.featured).slice(0, 4)
                    )}

                    ${row(
                        'Trending hidden gems',
                        'Sample ranking — will use real saves and views once available.',
                        [...D]
                            .sort((a, b) => b.trend - a.trend)
                            .slice(0, 4)
                    )}

                    ${row(
                        'Recently added',
                        'The newest additions to the explorer (sample order).',
                        [...D]
                            .sort((a, b) => b.added - a.added)
                            .slice(0, 4)
                    )}

                </div>
            `;

        $('#hgResTitle').textContent = filtersActive()
            ? 'Search results'
            : 'All hidden gems';

        $('#hgResCount').textContent =
            `${list.length} of ${D.length} places`;

        $('#hgGrid').innerHTML = list.length
            ? `<div class="hg-grid">${list.map(card).join('')}</div>`
            : `
                <div class="hg-state">
                    <h3>No hidden gems match</h3>
                    <p>
                        Try removing a filter or searching a different word.
                    </p>
                    <button class="hg-btn" data-reset type="button">
                        Clear all filters
                    </button>
                </div>
            `;


        const host = $('#hgMapHost');

        if (state.showMap) {
            host.innerHTML = `
                <div class="hg-mapbox" id="hgMap"></div>
            `;

            mountMap($('#hgMap'), list);
        } else {
            host.innerHTML = '';
        }

        $('#hgMapBtn').textContent = state.showMap
            ? '📋 Hide map'
            : '🗺️ Show map';

        syncSaved();
    }

    /* =====================================================
       11. DESTINATION DETAIL PAGE
    ===================================================== */

    function detail(id) {
        const g = D.find((x) => x.id === id);

        if (!g) {
            root.innerHTML = `
                <div class="hg-wrap hg-detail">
                    <div class="hg-state">
                        <h3>Hidden gem not found</h3>
                        <p>
                            That place does not exist in the explorer.
                        </p>
                        <a class="hg-btn" href="#/">
                            Back to all hidden gems
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        const c = CAT[g.cat];

        const near = D
            .filter((x) => x.id !== g.id)
            .map((x) => ({
                x,
                d: km(g, x)
            }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 3);

        const sameDist = D.filter(
            (x) => x.district === g.district && x.id !== g.id
        );

        const li = (a) =>
            a.map((s) => `<li>${esc(s)}</li>`).join('');

        const tag = '<span class="hg-tag">illustrative</span>';

        document.title =
            g.name + ' · Hidden Gems · Yaathirai';

        root.innerHTML = `
            <div class="hg-wrap hg-detail">

                <a class="hg-back" href="#/">
                    ← All hidden gems
                </a>

                <div class="hg-gallery">

                    <div class="hg-gallery-main">
                        <img
                            id="hgMain"
                            src="${photo(g, 0)}"
                            alt="${esc(g.name)} — illustrative image"
                        >
                    </div>

                    <div class="hg-thumbs">
                        ${[0, 1, 2].map((i) => `
                            <button
                                class="hg-thumb ${i === 0 ? 'is-on' : ''}"
                                data-thumb="${i}"
                                aria-label="Show image ${i + 1}"
                            >
                                <img src="${photo(g, i)}" alt="">
                            </button>
                        `).join('')}
                    </div>

                </div>

                <div class="hg-detail-head">

                    <div>
                        <div class="hg-meta">
                            ${c.icon} ${esc(c.label)} ·
                            ${esc(g.district)} district
                        </div>

                        <h1>${esc(g.name)}</h1>
                    </div>

                    <button
                        class="hg-btn hg-btn--ghost"
                        data-save="${esc(g.id)}"
                        aria-pressed="${saved.has(g.id)}"
                    >
                        ♡ Save to wishlist
                    </button>

                </div>

                <div class="hg-layout">

                    <div>

                        <div class="hg-block">
                            <h2>Overview</h2>
                            <p>${esc(g.desc)}</p>
                            <p>
                                <strong>Why it's special:</strong>
                                ${esc(g.special)}
                            </p>
                        </div>

                        <div class="hg-block">
                            <h2>How to reach${tag}</h2>
                            <p>${esc(T(g, 'how'))}</p>
                        </div>

                        <div class="hg-block">
                            <h2>Things to do${tag}</h2>
                            <ul>${li(T(g, 'todo'))}</ul>
                        </div>

                        <div class="hg-block">
                            <h2>Local experiences${tag}</h2>
                            <ul>${li(T(g, 'local'))}</ul>
                        </div>

                        <div class="hg-block">
                            <h2>Nearby attractions</h2>

                            ${
                                sameDist.length
                                    ? `
                                        <p>
                                            Other places in
                                            ${esc(g.district)}
                                            district in this explorer:
                                        </p>

                                        <ul>
                                            ${sameDist.map((x) => `
                                                <li>
                                                    <a href="#/gem/${esc(x.id)}">
                                                        ${esc(x.name)}
                                                    </a>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    `
                                    : `
                                        <p>
                                            No verified nearby-attraction
                                            list yet. Add one per place
                                            in the data file.
                                        </p>
                                    `
                            }

                        </div>

                        <div class="hg-block">
                            <h2>Travel tips${tag}</h2>
                            <ul>${li(T(g, 'tips'))}</ul>
                        </div>

                        <div class="hg-block">
                            <h2>Estimated budget${tag}</h2>
                            <p>
                                Rough tier:
                                <strong>${BUDGET[g.budget]}</strong>.
                                No rupee estimate is shown because
                                verified pricing data has not been
                                collected yet.
                            </p>
                        </div>

                    </div>

                    <aside class="hg-side">

                        <div class="hg-block">
                            <dl>

                                <div>
                                    <dt>Location</dt>
                                    <dd>
                                        ${esc(g.district)} district,
                                        Tamil Nadu
                                    </dd>
                                </div>

                                <div>
                                    <dt>Best time to visit</dt>
                                    <dd>${esc(T(g, 'bestTime'))}</dd>
                                </div>

                                <div>
                                    <dt>Visit duration</dt>
                                    <dd>${esc(T(g, 'duration'))}</dd>
                                </div>

                                <div>
                                    <dt>Good for</dt>
                                    <dd>
                                        ${g.travel.map((t) => TRAVEL[t]).join(', ')}
                                    </dd>
                                </div>

                                <div>
                                    <dt>Experience</dt>
                                    <dd>
                                        ${g.exp.map((e) => EXP[e]).join(', ')}
                                    </dd>
                                </div>

                            </dl>
                        </div>



                    </aside>

                </div>

                <section
                    class="hg-section"
                    style="padding-top:20px"
                >

                    <div class="hg-sec-head">
                        <div>
                            <h2>Nearby hidden gems</h2>
                            <p>
                                Straight-line distances are approximate,
                                not road distances.
                            </p>
                        </div>
                    </div>

                    <div class="hg-grid">
                        ${near.map((n) =>
                            card(n.x).replace(
                                '<div class="hg-meta">',
                                `<div class="hg-meta">~${Math.round(n.d)} km away · `
                            )
                        ).join('')}
                    </div>

                </section>

            </div>
        `;

        mountMap(
            $('#hgDMap'),
            [g, ...near.map((n) => n.x)],
            g.id
        );

        syncSaved();
    }

    /* =====================================================
       12. SAVED DESTINATIONS PAGE
    ===================================================== */

    function savedPage() {
        const list = D.filter((g) => saved.has(g.id));

        root.innerHTML = `
            <div class="hg-wrap hg-detail">

                <div class="hg-sec-head">
                    <div>
                        <h2>Saved destinations</h2>
                        <p>
                            ${list.length} saved on this device
                            (stored in your browser).
                        </p>
                    </div>

                    ${
                        list.length
                            ? `
                                <button
                                    class="hg-btn hg-btn--ghost"
                                    data-clear
                                    type="button"
                                >
                                    Clear all
                                </button>
                            `
                            : ''
                    }

                </div>

                ${
                    list.length
                        ? `<div class="hg-grid">${list.map(card).join('')}</div>`
                        : `
                            <div class="hg-state">
                                <h3>Nothing saved yet</h3>
                                <p>
                                    Tap the ♡ on any hidden gem
                                    to keep it here.
                                </p>
                                <a class="hg-btn" href="#/">
                                    Discover hidden gems
                                </a>
                            </div>
                        `
                }

            </div>
        `;

        syncSaved();
    }

    /* =====================================================
       13. MAIN RENDER FUNCTION
    ===================================================== */

    function render() {

        const r = route();

        document.title =
            'Hidden Gems Explorer · Yaathirai';

        document.querySelectorAll('[data-nav]')
            .forEach((a) => {
                a.classList.toggle(
                    'is-on',
                    a.dataset.nav === (
                        r.name === 'saved' ? 'saved' : 'home'
                    )
                );
            });

        if (r.name === 'gem') {
            detail(r.id);
        } else if (r.name === 'saved') {
            savedPage();
        } else {
            home();
        }
    }

    /* =====================================================
       14. EVENT HANDLING
       Search, filters, wishlist, gallery and map controls
    ===================================================== */

    let timer;

    /* Search input */

    document.addEventListener('input', (e) => {
        if (e.target.id === 'hgQ') {
            clearTimeout(timer);

            timer = setTimeout(() => {
                state.q = e.target.value.trim();
                update();
            }, 180);
        }
    });

    /* Filter changes */

    document.addEventListener('change', (e) => {
        const k = e.target.dataset && e.target.dataset.f;

        if (k) {
            state[k] = e.target.value;
            update();
        }
    });

    /* Search form submission */

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'hgSearch') {
            e.preventDefault();

            state.q = $('#hgQ').value.trim();

            update();

            $('#hgResults').scrollIntoView({
                behavior: 'smooth'
            });
        }
    });

    /* Click events */

    document.addEventListener('click', (e) => {
        const t = e.target.closest(
            '[data-save],[data-cat],[data-reset],[data-thumb],[data-clear],#hgMapBtn'
        );

        if (!t) return;

        /* Wishlist */

        if (t.dataset.save) {
            e.preventDefault();
            toggleSave(t.dataset.save);
        }

        /* Category selection */

        else if (t.dataset.cat) {
            state.cat =
                state.cat === t.dataset.cat
                    ? ''
                    : t.dataset.cat;

            update();

            $('#hgResults').scrollIntoView({
                behavior: 'smooth'
            });
        }

        /* Reset filters */

        else if ('reset' in t.dataset) {
            Object.assign(state, {
                q: '',
                cat: '',
                district: '',
                travel: '',
                budget: '',
                exp: ''
            });

            home();
        }

        /* Image gallery thumbnails */

        else if (t.dataset.thumb !== undefined) {
            const g = D.find((x) => x.id === route().id);

            $('#hgMain').src = photo(g, +t.dataset.thumb);

            document.querySelectorAll('.hg-thumb')
                .forEach((b) => {
                    b.classList.toggle('is-on', b === t);
                });
        }

        /* Clear wishlist */

        else if ('clear' in t.dataset) {
            saved.clear();
            store.set([]);

            toast('Wishlist cleared');

            syncSaved();
            render();
        }

        /* Map visibility */

        else if (t.id === 'hgMapBtn') {
            state.showMap = !state.showMap;
            update();
        }
    });

    /* =====================================================
       15. ROUTE CHANGE HANDLING
    ===================================================== */

    window.addEventListener('hashchange', () => {
        render();
        window.scrollTo(0, 0);
    });

    /* =====================================================
       16. INITIALIZE APPLICATION
    ===================================================== */

    render();

})();
