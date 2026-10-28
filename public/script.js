// =========================================
// YAATHIRAI — HERO SLIDESHOW
// =========================================

const scenes = [
  {
    title: "OOTY",
    image: "images/ooty.jpg"
  },
  {
    title: "KODAIKANAL",
    image: "images/kodaikanal.jpg"
  },
  {
    title: "KANYAKUMARI",
    image: "images/kanyakumari.jpg"
  },
  {
    title: "MADURAI",
    image: "images/madurai.jpg"
  },
  {
    title: "RAMESWARAM",
    image: "images/rameswaram.jpg"
  }
];

const body = document.body;
const loader = document.getElementById("loader");
const slides = [...document.querySelectorAll(".hero-slide")];

let activeScene = 0;
let slideTimer = null;
let readyStarted = false;

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

function setSceneBackgrounds() {
  slides.forEach((slide, index) => {
    const scene = scenes[index];

    if (scene) {
      slide.style.backgroundImage = `url("${scene.image}")`;
    }
  });
}

function activateScene(index) {
  if (!scenes[index]) return;

  activeScene = index;

  slides.forEach((slide, i) => {
    slide.classList.toggle("is-active", i === index);
  });
}

function startSlideshow() {
  if (slideTimer) {
    window.clearInterval(slideTimer);
  }

  if (document.hidden) return;

  slideTimer = window.setInterval(() => {
    activateScene((activeScene + 1) % scenes.length);
  }, 7200);
}

function revealPage() {
  if (readyStarted) return;

  readyStarted = true;
  body.classList.remove("is-loading");
  body.classList.add("is-ready");

  if (loader) {
    loader.classList.add("is-leaving");

    window.setTimeout(() => {
      loader.remove();
    }, 1000);
  }

  startSlideshow();
}

async function bootHero() {
  setSceneBackgrounds();

  const safetyTimeout = new Promise((resolve) => {
    window.setTimeout(resolve, 2400);
  });

  await Promise.race([
    preloadImage(scenes[0].image),
    safetyTimeout
  ]);

  await new Promise((resolve) => window.setTimeout(resolve, 950));

  revealPage();

  scenes.slice(1).forEach((scene) => {
    preloadImage(scene.image);
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && slideTimer) {
    window.clearInterval(slideTimer);
    slideTimer = null;
  } else if (!document.hidden && readyStarted && !slideTimer) {
    startSlideshow();
  }
});

bootHero();


// Navbar island: bottom centre over the hero, bottom left over destinations.
(() => {
  const nav = document.querySelector(".journey-nav");
  const section = document.getElementById("explore");
  const footer = document.querySelector(".yaathirai-footer");

  if (!nav || !section) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const top = section.getBoundingClientRect().top;
    nav.classList.toggle("is-docked", top < window.innerHeight * 0.55);

    // Hide the island once the footer reaches it; show it again on the way back up.
    if (footer) {
      const hide = footer.getBoundingClientRect().top < nav.getBoundingClientRect().bottom;

      if (hide !== nav.classList.contains("is-footer-hidden")) {
        nav.classList.add("is-reactive");
        nav.classList.toggle("is-footer-hidden", hide);
      }
    }
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
})();


// =========================================
// YAATHIRAI — DESTINATION ORBIT
// =========================================

(() => {
  const wheel = document.getElementById("destinationWheel");
  const wheelItems = document.getElementById("wheelItems");
  const explorer = document.querySelector(".destination-explorer");
  const photoButtons = [...document.querySelectorAll(".wheel-photo")];

  const preview = document.getElementById("destinationPreview");
  const prompt = document.getElementById("previewPrompt");
  const polaroid = document.getElementById("destinationPolaroid");

  const destinationName = document.getElementById("destinationName");
  const destinationNumber = document.getElementById("destinationNumber");
  const destinationImage = document.getElementById("destinationImage");
  const destinationImageCaption = document.getElementById("destinationImageCaption");
  const destinationDescription = document.getElementById("destinationDescription");
  const packagesLink = document.getElementById("destinationPackagesLink");

  if (
    !wheel ||
    !wheelItems ||
    !explorer ||
    !preview ||
    !prompt ||
    !polaroid ||
    !photoButtons.length
  ) {
    return;
  }

  const destinations = {
    Ooty: {
      image: "images/ooty.jpg",
      caption: "THE NILGIRIS, TAMIL NADU",
      description:
        "Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer."
    },

    Kodaikanal: {
      image: "images/kodaikanal.jpg",
      caption: "THE PRINCESS OF HILL STATIONS",
      description:
        "Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes."
    },

    Kanyakumari: {
      image: "images/kanyakumari.jpg",
      caption: "WHERE THREE WATERS MEET",
      description:
        "Colourful coastal skies, ocean horizons, and unforgettable sunrises at India's southern tip."
    },

    Madurai: {
      image: "images/madurai.jpg",
      caption: "THE CITY OF TEMPLES",
      description:
        "Ancient temple towers, lively streets, and food and traditions woven into everyday life."
    },

    Rameswaram: {
      image: "images/rameswaram.jpg",
      caption: "A JOURNEY BY THE SEA",
      description:
        "Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland."
    },

    Mahabalipuram: {
      image: "images/mahabalipuram.jpg",
      caption: "HERITAGE BY THE SHORE",
      description:
        "Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast."
    },

    Tiruchendur: {
      image: "images/tiruchendur.jpg",
      caption: "A TEMPLE BESIDE THE SEA",
      description:
        "A coastal pilgrimage town where temple traditions meet the sound of the waves."
    },

    Velankanni: {
      image: "images/velankanni.jpg",
      caption: "A PEACEFUL COASTAL ESCAPE",
      description:
        "A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze."
    },

    Chennai: {
      image: "images/chennai-bus.jpg",
      caption: "THE CITY BY THE BAY",
      description:
        "City energy, coastal mornings, colourful streets, and little discoveries around every corner."
    }
  };

  // Preload card images so switching destinations never flashes a stale image.
  Object.values(destinations).forEach((details) => {
    const img = new Image();
    img.src = details.image;
  });

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const TAU = Math.PI * 2;
  const rotationSpeed = 0.00022;

  let angle = -Math.PI / 2;
  let lastTimestamp = 0;
  let isPaused = false;
  let isVisible = true;

  let hoveredButton = null;
  let focusedButton = null;
  let previewHovered = false;
  let previewFocused = false;

  let lastDisplayedName = "";

  /*
    Keep the wheel's size fixed.
    Adjust only the radius so the nine images fit inside it.
  */
  function getOrbitRadius() {
    const size = wheel.clientWidth;
    const imageSize = Math.min(100, Math.max(49, size * 0.18));

    return Math.max(
      0,
      Math.min(size * 0.385, size / 2 - imageSize / 2 - 4)
    );
  }

  /*
    Move each photo independently instead of rotating its parent.
    This prevents the images from turning upside down.
  */
  function positionPhotos() {
    const radius = getOrbitRadius();
    const count = photoButtons.length;

    photoButtons.forEach((button, index) => {
      const itemAngle = angle + (index * TAU / count);
      const x = Math.cos(itemAngle) * radius;
      const y = Math.sin(itemAngle) * radius;

      button.style.transform =
        `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
    });
  }

  function animateOrbit(timestamp) {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const delta = Math.min(timestamp - lastTimestamp, 40);
    lastTimestamp = timestamp;

    if (isVisible && !isPaused && !reduceMotion.matches) {
      angle = (angle + rotationSpeed * delta) % TAU;
      positionPhotos();
    }

    window.requestAnimationFrame(animateOrbit);
  }

  /*
    Toggle visibility using CSS classes rather than display:none.
    This allows the card and default message to fade smoothly.
  */
  function showDestination(button) {
    const name = button.dataset.destination;
    const details = destinations[name];

    if (!details) return;

    prompt.classList.add("is-hidden");
    polaroid.classList.remove("is-hidden");

    // Avoid restarting the card animation when the same image
    // receives repeated hover/focus events.
    if (name === lastDisplayedName) return;

    lastDisplayedName = name;

    destinationName.textContent = name;

    const index = photoButtons.indexOf(button) + 1;

    destinationNumber.textContent =
      `${String(index).padStart(2, "0")} / ${String(photoButtons.length).padStart(2, "0")}`;

    destinationImage.src = details.image;
    destinationImage.alt = `Scenic view of ${name}, Tamil Nadu`;

    destinationImageCaption.textContent = details.caption;
    destinationDescription.textContent = details.description;

    packagesLink.href =
      `packages.html?destination=${encodeURIComponent(name)}`;

    packagesLink.querySelector("span:first-child").textContent =
      `Find your ${name} escape`;
  }

  function showDefaultPrompt() {
    lastDisplayedName = "";

    polaroid.classList.add("is-hidden");
    prompt.classList.remove("is-hidden");
  }

  /*
    Short grace period before returning to the default message, so the
    card doesn't flash away in the gaps between photos or on the way
    from a photo to the card.
  */
  let hideTimer = null;

  function cancelHide() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function updatePreview() {
    const activeButton = focusedButton || hoveredButton;

    if (activeButton) {
      cancelHide();
      showDestination(activeButton);
      return;
    }

    // Keep the card visible when moving the pointer onto its link.
    if (previewHovered || previewFocused) {
      cancelHide();
      return;
    }

    if (hideTimer) return;

    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      showDefaultPrompt();
    }, 160);
  }

  function updatePauseState() {
    isPaused = Boolean(
      hoveredButton ||
      focusedButton ||
      previewHovered ||
      previewFocused ||
      reduceMotion.matches
    );
  }

  photoButtons.forEach((button) => {
    const name = button.dataset.destination;
    const details = destinations[name];

    if (!details) {
      console.warn(`Missing destination data for: ${name}`);
      return;
    }

    button.addEventListener("mouseenter", () => {
      hoveredButton = button;
      updatePauseState();
      updatePreview();
    });

    button.addEventListener("mouseleave", () => {
      if (hoveredButton === button) {
        hoveredButton = null;
      }

      updatePauseState();
      updatePreview();
    });

    button.addEventListener("focus", () => {
      focusedButton = button;
      updatePauseState();
      updatePreview();
    });

    button.addEventListener("blur", () => {
      if (focusedButton === button) {
        focusedButton = null;
      }

      // Wait until the next focus target is known. This avoids
      // a flash when keyboard focus moves between wheel images
      // or from a wheel image to the destination link.
      window.requestAnimationFrame(() => {
        if (explorer.contains(document.activeElement)) {
          const focusedPhoto = document.activeElement.closest?.(".wheel-photo");

          if (focusedPhoto) {
            focusedButton = focusedPhoto;
          } else {
            focusedButton = null;
          }

          previewFocused = preview.contains(document.activeElement);
        } else {
          focusedButton = null;
          previewFocused = false;
        }

        updatePauseState();
        updatePreview();
      });
    });

    button.addEventListener("click", () => {
      // Supports tapping on touchscreen devices.
      focusedButton = button;
      updatePauseState();
      updatePreview();
    });

    const image = button.querySelector("img");

    if (image) {
      image.addEventListener("error", () => {
        console.error(
          `Destination image not found: ${image.getAttribute("src")}`
        );
      });
    }
  });

  preview.addEventListener("mouseenter", () => {
    previewHovered = true;
    updatePauseState();
    updatePreview();
  });

  preview.addEventListener("mouseleave", () => {
    previewHovered = false;
    updatePauseState();
    updatePreview();
  });

  preview.addEventListener("focusin", () => {
    previewFocused = true;
    updatePauseState();
  });

  preview.addEventListener("focusout", () => {
    window.requestAnimationFrame(() => {
      previewFocused = preview.contains(document.activeElement);
      updatePauseState();
      updatePreview();
    });
  });

  /*
    Reset the preview only after leaving the whole destination
    explorer, not when moving from an image to the card.
  */
  explorer.addEventListener("mouseleave", () => {
    hoveredButton = null;
    previewHovered = false;

    if (!explorer.contains(document.activeElement)) {
      focusedButton = null;
      previewFocused = false;
    }

    updatePauseState();
    updatePreview();
  });

  window.addEventListener("resize", positionPhotos);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      lastTimestamp = 0;
    }, { threshold: 0.05 });

    observer.observe(wheel);
  }

  const handleMotionPreference = () => {
    updatePauseState();
  };

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", handleMotionPreference);
  } else {
    reduceMotion.addListener(handleMotionPreference);
  }

  positionPhotos();
  showDefaultPrompt();
  updatePauseState();

  window.requestAnimationFrame(animateOrbit);
})();


// =========================================
// YAATHIRAI — POPULAR PACKAGES (horizontal carousel)
// =========================================

(() => {
  const root = document.getElementById("popular-packages");
  const data = window.YAATHIRAI_PACKAGES;

  if (!root || !Array.isArray(data) || !data.length) return;

  const book = document.getElementById("ppBook");
  const stage = document.getElementById("ppStage");

  if (!book || !stage) return;

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const PERSON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6"></circle><path d="M5 20c.6-4 3.3-6 7-6s6.4 2 7 6"></path></svg>';

  const ROUTE =
    '<svg class="pp-route" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true"><path d="M10 210 C 200 40, 330 400, 570 230 S 920 60, 1190 200"></path></svg>';

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function cardHTML(pkg, index) {
    const duration = `${pkg.days}D ${pkg.nights}N`;
    const price = pkg.price == null ? "₹ ——" : `₹ ${Number(pkg.price).toLocaleString("en-IN")}`;

    // Same route pattern the Destinations section already uses.
    const href =
      `packages.html?destination=${encodeURIComponent(pkg.destination)}&package=${encodeURIComponent(pkg.id)}`;

    return `
      <article class="pp-card" style="--d:${Math.min(index, 3) * 110 + 250}ms">
        <a class="pp-link" href="${href}">
          <div class="pp-photo">
            <img src="${esc(pkg.image)}" alt="${esc(pkg.imageAlt || pkg.destination)}" loading="lazy" decoding="async" />
            <h3 class="pp-name">${esc(pkg.name)}</h3>
            <p class="pp-price"><strong>${price}</strong> / ${esc(pkg.priceUnit || "person")}</p>
            <span class="pp-go" aria-hidden="true">↗</span>
          </div>
          <ul class="pp-meta">
            <li>${PERSON}<span>${esc(pkg.guests)} guests</span></li>
            <li><span>${duration}</span></li>
          </ul>
          <p class="pp-desc">${esc(pkg.tagline || "")}</p>
        </a>
      </article>`;
  }

  stage.innerHTML =
    `<div class="pp-row" style="--pp-n:${data.length}">${ROUTE}${data.map(cardHTML).join("")}</div>`;

  const scrollStep = () => Math.round(stage.clientWidth * 0.5);
  const behavior = () => (mqReduce.matches ? "auto" : "smooth");

  function canScroll(dir) {
    return dir < 0
      ? stage.scrollLeft > 2
      : stage.scrollLeft + stage.clientWidth < stage.scrollWidth - 2;
  }

  function moveBy(dir) {
    if (!canScroll(dir)) return;
    stage.scrollBy({ left: dir * scrollStep(), behavior: behavior() });
  }

  // Reflect whether more packages exist on each side (drives the subtle cues).
  let cueFrame = 0;

  function updateCues() {
    cueFrame = 0;
    book.classList.toggle("can-prev", canScroll(-1));
    book.classList.toggle("can-next", canScroll(1));
  }

  const requestCues = () => {
    if (!cueFrame) cueFrame = window.requestAnimationFrame(updateCues);
  };

  stage.addEventListener("scroll", requestCues, { passive: true });
  window.addEventListener("resize", requestCues);

  /*
    Edge-triggered movement (mouse only): entering the left/right edge zone of
    the track advances once by half a viewport-width of the track. Re-arming
    requires leaving the zone, and a cooldown guards rapid in/out flicking.
  */
  const COOLDOWN = 900;
  let edge = 0;
  let lockedUntil = 0;

  function setEdge(next) {
    if (next === edge) return;

    edge = next;
    book.classList.toggle("edge-prev", edge < 0);
    book.classList.toggle("edge-next", edge > 0);

    if (!edge) return;

    const now = performance.now();

    if (now < lockedUntil || !canScroll(edge)) return;

    lockedUntil = now + COOLDOWN;
    moveBy(edge);
  }

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;

    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const zone = Math.min(150, Math.max(64, rect.width * 0.12));

    setEdge(x < zone ? -1 : x > rect.width - zone ? 1 : 0);
  });

  stage.addEventListener("pointerleave", () => setEdge(0));

  // Keyboard: arrow keys scroll the row; Tab moves through package links.
  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(event.key === "ArrowRight" ? 1 : -1);
    }
  });

  // One-time entrance.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        root.classList.add("is-in");
        observer.disconnect();
      }
    }, { threshold: 0.15 });

    observer.observe(root);
  } else {
    root.classList.add("is-in");
  }

  updateCues();
})();


// =========================================
// YAATHIRAI — PLAN YOUR NEXT-CATION
// =========================================

(() => {
  const form = document.getElementById("ncForm");
  const where = document.getElementById("ncWhere");
  const start = document.getElementById("ncStart");
  const end = document.getElementById("ncEnd");
  const count = document.getElementById("ncCount");
  const minus = document.getElementById("ncMinus");
  const plus = document.getElementById("ncPlus");
  const msg = document.getElementById("ncMsg");

  if (!form || !where || !start || !end || !count || !minus || !plus || !msg) return;

  const MIN_GUESTS = 1;
  const MAX_GUESTS = 20;
  let guests = 2;

  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  start.min = today;
  end.min = today;

  function renderGuests() {
    count.textContent = String(guests);
    minus.disabled = guests <= MIN_GUESTS;
    plus.disabled = guests >= MAX_GUESTS;
  }

  function clearErrors() {
    msg.textContent = "";
    start.removeAttribute("aria-invalid");
    end.removeAttribute("aria-invalid");
  }

  minus.addEventListener("click", () => {
    guests = Math.max(MIN_GUESTS, guests - 1);
    renderGuests();
  });

  plus.addEventListener("click", () => {
    guests = Math.min(MAX_GUESTS, guests + 1);
    renderGuests();
  });

  start.addEventListener("change", () => {
    end.min = start.value || today;

    if (end.value && start.value && end.value < start.value) {
      end.value = start.value;
    }

    clearErrors();
  });

  end.addEventListener("change", clearErrors);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();

    if (!start.value || !end.value) {
      (!start.value ? start : end).setAttribute("aria-invalid", "true");
      msg.textContent = "Please choose both a start date and an end date.";
      (!start.value ? start : end).focus();
      return;
    }

    if (end.value < start.value) {
      end.setAttribute("aria-invalid", "true");
      msg.textContent = "The end date can't be earlier than the start date.";
      end.focus();
      return;
    }

    // Uses the same packages.html?destination=... convention as the
    // Destinations section; an empty location simply omits it.
    const params = new URLSearchParams();
    const place = where.value.trim();

    if (place) params.set("destination", place);
    params.set("start", start.value);
    params.set("end", end.value);
    params.set("guests", String(guests));

    window.location.href = `packages.html?${params.toString()}`;
  });

  renderGuests();
})();


// =========================================
// YAATHIRAI — HERO INTRO, PULLBACK/DISSOLVE, WHEEL ENTRANCE
// =========================================

(() => {
  const body = document.body;
  const hero = document.querySelector(".hero");
  const section = document.getElementById("explore");
  const wheel = document.getElementById("destinationWheel");

  if (!hero || !section) return;

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /*
    1. First-scroll intro. The first downward gesture (wheel, touch, or
    keyboard) is consumed once to reveal the hero text. Listeners remove
    themselves after the reveal, so ordinary scrolling is restored. Scrollbar
    drags and anchor jumps are never blocked: they just reveal the text.
  */
  const REVEAL_MS = 1500;

  function startIntro() {
    if (mqReduce.matches || window.scrollY > 4) {
      body.classList.add("hero-text-in");
      return;
    }

    body.classList.add("js-hero-intro");

    let triggered = false;
    let touchY = 0;
    let timer = 0;

    const opts = { passive: false };

    const release = () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", onWheel, opts);
      window.removeEventListener("touchstart", onTouchStart, { passive: true });
      window.removeEventListener("touchmove", onTouchMove, opts);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      body.classList.add("hero-text-in");
    };

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      body.classList.add("hero-text-in");
      timer = window.setTimeout(release, REVEAL_MS);
    };

    function onWheel(event) {
      if (event.deltaY > 0) {
        event.preventDefault();
        trigger();
      }
    }

    function onTouchStart(event) {
      touchY = event.touches[0].clientY;
    }

    function onTouchMove(event) {
      if (touchY - event.touches[0].clientY > 6) {
        if (event.cancelable) event.preventDefault();
        trigger();
      }
    }

    function onKey(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      const interactive = target.closest && target.closest("a, button, input, select, textarea, [contenteditable]");

      if (["ArrowDown", "PageDown", "End"].includes(event.key) && !(interactive && /INPUT|SELECT|TEXTAREA/.test(target.tagName))) {
        event.preventDefault();
        trigger();
      } else if (event.key === " " && !event.shiftKey && !interactive) {
        event.preventDefault();
        trigger();
      }
    }

    function onScroll() {
      if (window.scrollY > 4) release();
    }

    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, opts);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /*
    2. Scroll-linked pullback + dissolve. Progress runs from the top of the
    page to the point where Destinations reaches the top of the viewport and
    is written to CSS variables only (transform/opacity in CSS).
  */
  let frame = 0;

  function update() {
    frame = 0;

    if (mqReduce.matches) {
      ["--hero-p", "--hero-fade", "--hero-dissolve"].forEach((v) => hero.style.removeProperty(v));
      section.style.removeProperty("--dest-reveal");
      return;
    }

    const y = window.scrollY;
    const end = Math.max(1, section.getBoundingClientRect().top + y);
    const p = clamp(y / end);
    const d = clamp((p - 0.3) / 0.7);

    hero.style.setProperty("--hero-p", p.toFixed(4));
    hero.style.setProperty("--hero-fade", clamp(1 - p * 3.5).toFixed(3));
    hero.style.setProperty("--hero-dissolve", (d * d * (3 - 2 * d)).toFixed(3));
    section.style.setProperty("--dest-reveal", clamp((p - 0.45) / 0.45).toFixed(3));
  }

  const request = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);

  if (mqReduce.addEventListener) mqReduce.addEventListener("change", request);
  else mqReduce.addListener(request);

  /*
    3. Destination circles: once, when the wheel enters view, each circle fades
    and scales in at its own place in a staggered sequence.
  */
  if (wheel && !mqReduce.matches) {
    wheel.querySelectorAll(".wheel-photo").forEach((photo, i) => photo.style.setProperty("--i", i));
    wheel.classList.add("wheel-prep");

    const enter = () => {
      wheel.classList.remove("wheel-prep");
      wheel.classList.add("wheel-in");
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          enter();
          observer.disconnect();
        }
      }, { threshold: 0.35 });

      observer.observe(wheel);
    } else {
      enter();
    }
  }

  startIntro();
  update();
})();