// ===================================================================
//  Raed Ouiriemmi — portfolio interactions
// ===================================================================
const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;
// Scroll-story animations only run under html.fx; without it every .reveal
// stays visible (no-JS visitors, crawlers and reduced-motion users).
const fx = !reduceMotion;
if (fx) root.classList.add("fx");

// ===== Mobile menu =====
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
function setMenuState(open) {
  navLinks.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  const dict = typeof I18N !== "undefined" ? I18N[root.getAttribute("lang")] || I18N.en : null;
  const label = dict && dict[open ? "aria.menuClose" : "aria.menu"];
  if (label) menuToggle.setAttribute("aria-label", label);
}
menuToggle.addEventListener("click", () => setMenuState(!navLinks.classList.contains("open")));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => setMenuState(false))
);

// ===== Theme toggle (persists; syncs browser UI color) =====
const themeToggle = document.getElementById("themeToggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const THEME_COLOR = { dark: "#060912", light: "#f5f7fc" };
function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  if (themeMeta) themeMeta.setAttribute("content", THEME_COLOR[theme] || THEME_COLOR.dark);
  themeToggle.setAttribute("aria-pressed", String(theme === "light"));
  localStorage.setItem("theme", theme);
}
applyTheme(localStorage.getItem("theme") || "light");
themeToggle.addEventListener("click", () => {
  applyTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
});

// ===== Language switch (EN / FR / AR, with RTL for Arabic) =====
const langSelect = document.getElementById("langSelect");
const RTL_LANGS = ["ar"];
function ensureArabicFont() {
  if (document.getElementById("cairoFont")) return;
  const l = document.createElement("link");
  l.id = "cairoFont";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap";
  document.head.appendChild(l);
}
function applyLang(lang) {
  const dict = typeof I18N !== "undefined" ? I18N[lang] : null;
  if (!dict) return;
  if (lang === "ar") ensureArabicFont();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = dict[el.getAttribute("data-i18n")];
    if (v != null) el.innerHTML = v;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const v = dict[el.getAttribute("data-i18n-aria")];
    if (v != null) el.setAttribute("aria-label", v);
  });
  root.setAttribute("lang", lang);
  root.setAttribute("dir", RTL_LANGS.includes(lang) ? "rtl" : "ltr");
  if (dict["doc.title"]) document.title = dict["doc.title"];
  const md = document.querySelector('meta[name="description"]');
  if (md && dict["doc.desc"]) md.setAttribute("content", dict["doc.desc"].replace(/<[^>]+>/g, ""));
  // Serve the CV in the active language.
  const CV = {
    en: "Raed_Ouiriemmi_CV.pdf",
    fr: "Raed_Ouiriemmi_CV_FR.pdf",
    ar: "Raed_Ouiriemmi_CV_AR.pdf",
  };
  const cvFile = CV[lang] || CV.en;
  document.querySelectorAll(".cv-link").forEach((a) => {
    a.setAttribute("href", cvFile);
    a.setAttribute("download", cvFile);
  });
  if (langSelect) langSelect.value = lang;
}
// /fr/ and /ar/ are static pre-rendered pages locked to their language (data-default-lang);
// the root page honours an explicit saved choice and defaults to English on first visit.
const PAGE_LANG_URLS = { en: "/", fr: "/fr/", ar: "/ar/" };
const pageDefaultLang = root.getAttribute("data-default-lang");
const savedLang = localStorage.getItem("lang");
applyLang(pageDefaultLang || (["en", "fr", "ar"].includes(savedLang) ? savedLang : "en"));
if (langSelect) langSelect.addEventListener("change", (e) => {
  const lang = e.target.value;
  localStorage.setItem("lang", lang);
  const target = PAGE_LANG_URLS[lang];
  // Each language lives at its own URL; navigate unless already there (or previewing via file://).
  if (location.protocol.indexOf("http") === 0 && target && location.pathname !== target) {
    location.href = target + location.hash;
    return;
  }
  applyLang(lang);
});
// Footer language links mirror the selector: remember the choice on the way out.
document.querySelectorAll(".footer__langs a").forEach((a) =>
  a.addEventListener("click", () => {
    const lang = a.getAttribute("hreflang");
    if (["en", "fr", "ar"].includes(lang)) localStorage.setItem("lang", lang);
  })
);

// ===== Navbar state + scroll progress + scroll-linked effects =====
const nav = document.getElementById("nav");
const progress = document.getElementById("scrollProgress");
const ghosts = [...document.querySelectorAll(".section__ghost")];
const heroInner = document.querySelector(".hero__inner");
const timelineEl = document.querySelector(".timeline");
const covers = [...document.querySelectorAll(".project__media img")];
const scrollCards = isTouch
  ? [...document.querySelectorAll(".project, .skill-card, .stat")]
  : [];
// Touch: the URL bar collapse resizes the viewport mid-scroll — anchor all
// scroll math to a stable vh, updated only on real rotations (>150px jumps).
let vhTouch = window.innerHeight;
window.addEventListener("resize", () => {
  if (!isTouch || Math.abs(window.innerHeight - vhTouch) > 150) vhTouch = window.innerHeight;
});
// Scroll-tilt state: cards ease back flat when scrolling pauses.
const cardTilt = new Map();
let cardsIdleTimer = null, cardsSettleRAF = null, settleLast = null;
const settleCards = () => {
  settleLast = null;
  const step = (now) => {
    const dt = settleLast === null ? 1 : Math.min(3, (now - settleLast) / 16.7);
    settleLast = now;
    const decay = Math.pow(0.85, dt);
    let busy = false;
    cardTilt.forEach((a, el) => {
      const na = a * decay;
      if (Math.abs(na) < 0.04) { el.style.transform = ""; cardTilt.delete(el); return; }
      cardTilt.set(el, na);
      el.style.transform =
        `perspective(900px) rotateX(${na.toFixed(2)}deg) scale(${(1 - Math.abs(na) * 0.00375).toFixed(3)})`;
      busy = true;
    });
    cardsSettleRAF = busy ? requestAnimationFrame(step) : null;
  };
  cardsSettleRAF = requestAnimationFrame(step);
};
const onScroll = () => {
  const y = Math.max(0, window.scrollY); // iOS rubber-band reports negative
  nav.classList.toggle("scrolled", y > 20);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
  if (!fx) return;
  const vh = isTouch ? vhTouch : window.innerHeight;
  // Ghost numbers lean in 3D and pivot slightly as they drift past.
  const flip = root.getAttribute("dir") === "rtl" ? -1 : 1;
  ghosts.forEach((g) => {
    const r = g.getBoundingClientRect();
    const off = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 through viewport
    g.style.transform =
      `perspective(600px) translateY(calc(-58% + ${(-off * 42).toFixed(1)}px)) ` +
      `rotateY(${(flip * (-13 + off * 7)).toFixed(1)}deg)`;
  });
  // Timeline draws its ink as the reader moves through it.
  if (timelineEl) {
    const r = timelineEl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.72 - r.top) / r.height));
    timelineEl.style.setProperty("--tlp", p.toFixed(3));
  }
  // Hero recedes, tips away and dissolves as you scroll into the page.
  if (heroInner && y <= vh * 1.2) {
    const k = Math.min(y / vh, 1);
    heroInner.style.transform =
      `perspective(900px) translate3d(0, ${(y * 0.24).toFixed(1)}px, 0) ` +
      `rotateX(${(k * 5).toFixed(2)}deg) scale(${(1 - k * 0.05).toFixed(3)})`;
    heroInner.style.opacity = (1 - k * 0.9).toFixed(3);
  }
  // Depth: project covers drift against their cards.
  covers.forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const off = (r.top + r.height / 2 - vh / 2) / vh;
    img.style.setProperty("--py", (off * -12).toFixed(1) + "px");
  });
  // Touch has no hover tilt, so cards ride a curved plane while scrolling:
  // tipped back entering from the bottom, flat at center, tipped out on top;
  // they settle flat shortly after the scroll stops.
  if (isTouch) {
    if (cardsSettleRAF) { cancelAnimationFrame(cardsSettleRAF); cardsSettleRAF = null; }
    clearTimeout(cardsIdleTimer);
    scrollCards.forEach((el) => {
      if (el.classList.contains("reveal")) return; // entrance still playing
      const r = el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > vh + 60) return;
      const off = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2)));
      const a = off * 4;
      cardTilt.set(el, a);
      el.style.transform =
        `perspective(900px) rotateX(${a.toFixed(2)}deg) scale(${(1 - Math.abs(a) * 0.00375).toFixed(3)})`;
    });
    cardsIdleTimer = setTimeout(settleCards, 160);
  }
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ===== Scroll story: staged reveals (direction, depth, cascades) =====
if (fx) {
  // Hero enters as a cascade of its pieces rather than one block.
  if (heroInner) {
    heroInner.classList.remove("reveal");
    [...heroInner.children].forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = i * 90 + "ms";
    });
  }
  // About: the text slides from the reading side, stat cards materialize.
  const about = document.querySelector(".about");
  if (about) about.classList.remove("reveal");
  const variant = (sel, cls) =>
    document.querySelectorAll(sel).forEach((el) => el.classList.add("reveal", cls));
  variant(".about__text", "reveal--side");
  variant(".about__stats .stat", "reveal--zoom");
  variant(".project", "reveal--zoom");
  variant(".tl-item", "reveal--side");
  variant(".contact", "reveal--zoom");
  // Chip cascade indices (chips animate relative to their card's delay).
  document.querySelectorAll(".reveal .tags").forEach((tags) =>
    [...tags.children].forEach((s, i) => s.style.setProperty("--i", i))
  );
  // Stagger inside grids.
  [".about__stats", ".skills", ".projects", ".timeline"].forEach((sel) => {
    const parent = document.querySelector(sel);
    if (!parent) return;
    [...parent.children].forEach((child, i) => {
      if (!child.classList.contains("reveal")) return;
      child.style.transitionDelay = i * 80 + "ms";
      child.style.setProperty("--d", i * 80 + "ms");
    });
  });
  const REVEAL_CLASSES = ["reveal", "reveal--side", "reveal--zoom", "in"];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add("in");
        io.unobserve(el);
        // Once the entrance is over, hand the element back to its own
        // stylesheet rules (restores per-component hover transitions).
        setTimeout(() => {
          el.classList.remove(...REVEAL_CLASSES);
          el.style.transitionDelay = "";
          el.style.removeProperty("--d");
        }, 2000 + (parseFloat(el.style.transitionDelay) || 0));
      });
    },
    // Root extends far ABOVE the viewport: anything already scrolled past
    // (deep links, fast scrolls with skipped frames) reveals instantly instead
    // of staying hidden; entrances still trigger at the bottom edge (-7%).
    { threshold: 0.12, rootMargin: "9999px 0px -7% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

// ===== Scroll-spy: highlight active nav link =====
const navAnchors = [...navLinks.querySelectorAll("a")];
const sections = navAnchors
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navAnchors.forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => spy.observe(s));

// ===== Animated count-up stats =====
const countIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      countIO.unobserve(el);
      const target = parseInt(el.dataset.count, 10);
      if (!fx) { el.textContent = target; return; }
      const dur = 1300;
      let t0;
      const tick = (ts) => {
        if (t0 === undefined) t0 = ts;
        const p = Math.min((ts - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll(".stat__n").forEach((c) => countIO.observe(c));

// ===== Footer year =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== CSS gyroscopes: decorative 3D rings (desktop: stats + contact;
//       touch: a single quiet ring behind the contact card) =====
if (fx) {
  const addGyro = (host, css) => {
    if (!host) return;
    const g = document.createElement("div");
    g.className = "gyro";
    g.setAttribute("aria-hidden", "true");
    g.style.cssText = css;
    g.innerHTML = "<i></i><i></i><i></i><b></b>";
    host.appendChild(g);
  };
  if (!isTouch && window.matchMedia("(min-width: 861px)").matches) {
    addGyro(document.querySelector(".about__stats"),
      "width:300px; top:50%; left:50%; margin:-150px 0 0 -150px;");
    addGyro(document.querySelector(".section--contact"),
      "width:760px; top:50%; left:50%; margin:-380px 0 0 -380px;");
  } else if (isTouch) {
    addGyro(document.querySelector(".section--contact"),
      "width:min(340px, 88vw); top:50%; left:50%; transform:translate(-50%,-50%);");
  }
}

// ===================================================================
//  Device-tilt 3D rig (touch devices): tilting the phone moves the hero
//  layers in depth and steers the WebGL scene (via window.__tilt, read
//  by three-scene.js). iOS needs a user-gesture permission — hooked to
//  the first tap, silent if denied.
// ===================================================================
if (fx && isTouch) {
  // empty touchstart listener: enables :active styling on iOS Safari
  document.addEventListener("touchstart", () => {}, { passive: true });

  const layers = [];
  if (heroInner) {
    [[".badge", 10], [".hero__avatar img", 26], [".hero__avatar-fallback", 26],
     [".hero__hi", 8], [".hero__name", 19], [".hero__role", 13], [".hero__tag", 7],
     [".hero__cta", 15], [".hero__socials", 9]].forEach(([sel, d]) =>
      heroInner.querySelectorAll(sel).forEach((el) => layers.push({ el, d }))
    );
  }

  const tilt = (window.__tilt = { x: 0, y: 0, active: false });
  let base = null, gx = 0, gy = 0, running = false;

  const step = () => {
    if (document.hidden || window.scrollY > window.innerHeight * 1.15) { running = false; return; }
    tilt.x += (gx - tilt.x) * 0.1;
    tilt.y += (gy - tilt.y) * 0.1;
    layers.forEach((l) => {
      if (l.el.closest(".reveal")) return; // entrance still playing
      l.el.style.transform =
        `translate3d(${(tilt.x * l.d).toFixed(1)}px, ${(tilt.y * l.d * 0.7).toFixed(1)}px, 0)`;
    });
    requestAnimationFrame(step);
  };
  const start = () => { if (!running) { running = true; requestAnimationFrame(step); } };

  const onOri = (e) => {
    if (e.beta == null || e.gamma == null) return;
    // remap axes when the device is held in landscape
    const ang = (screen.orientation ? screen.orientation.angle : window.orientation) || 0;
    let px, py;
    if (ang === 90) { px = e.beta; py = -e.gamma; }
    else if (ang === -90 || ang === 270) { px = -e.beta; py = e.gamma; }
    else { px = e.gamma; py = e.beta; }
    if (!base) base = { x: px, y: py };
    // the neutral pose slowly re-centers so posture changes don't stick
    base.x += (px - base.x) * 0.006;
    base.y += (py - base.y) * 0.006;
    gx = Math.max(-1, Math.min(1, (px - base.x) / 16));
    gy = Math.max(-1, Math.min(1, (py - base.y) / 16));
    tilt.active = true;
    start();
  };
  addEventListener("orientationchange", () => { base = null; });
  addEventListener("scroll", () => { if (tilt.active) start(); }, { passive: true });

  const attach = () => addEventListener("deviceorientation", onOri, { passive: true });
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    addEventListener("touchend", () => {
      DeviceOrientationEvent.requestPermission()
        .then((s) => { if (s === "granted") attach(); })
        .catch(() => {});
    }, { once: true, passive: true });
  } else {
    attach();
  }
}

// ===================================================================
//  Pointer-driven effects (desktop, motion-allowed only)
// ===================================================================
if (!reduceMotion && !isTouch) {
  // -- Spotlight: cards light up under the cursor --
  document.querySelectorAll(".spot").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // -- 3D tilt engine: lerped tilt + inner parallax + glare, on every card --
  // JS writes the card transform each frame and exposes --rx/--ry/--glare;
  // the stylesheet turns those into layered parallax and a moving highlight.
  const TILT = [
    { sel: ".project", max: 7, lift: -6, scale: 1.012 },
    { sel: ".skill-card", max: 6, lift: -5, scale: 1.01 },
    { sel: ".stat", max: 8, lift: -4, scale: 1.02 },
    { sel: ".contact", max: 2.6, lift: 0, scale: 1.004 },
  ];
  const tiltCards = [];
  let tiltRAF = null, tiltLast = null;
  const tiltWake = () => { if (tiltRAF === null) { tiltLast = null; tiltRAF = requestAnimationFrame(tiltStep); } };
  function tiltStep(now) {
    // Frame-rate independent easing: normalize decay to 60fps-equivalent steps.
    const dt = tiltLast === null ? 1 : Math.min(3, (now - tiltLast) / 16.7);
    tiltLast = now;
    const ease = (base) => 1 - Math.pow(1 - base, dt);
    let busy = false;
    tiltCards.forEach((st) => {
      const k = ease(st.on ? 0.14 : 0.24); // ease back out faster than in
      st.cx += (st.tx - st.cx) * k;
      st.cy += (st.ty - st.cy) * k;
      st.p += ((st.on ? 1 : 0) - st.p) * ease(st.on ? 0.12 : 0.22);
      if (!st.on && st.p < 0.02 && Math.abs(st.cx) < 0.01 && Math.abs(st.cy) < 0.01) {
        if (st.live) {
          st.live = false;
          st.el.classList.remove("is-tilting");
          st.el.style.transform = "";
          ["--rx", "--ry", "--glare"].forEach((v) => st.el.style.removeProperty(v));
        }
        return;
      }
      busy = true;
      if (!st.live) { st.live = true; st.el.classList.add("is-tilting"); }
      const rx = -st.cy * st.max * st.p;
      const ry = st.cx * st.max * st.p;
      st.el.style.transform =
        `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) ` +
        `translateY(${(st.lift * st.p).toFixed(1)}px) scale(${(1 + (st.scale - 1) * st.p).toFixed(4)})`;
      st.el.style.setProperty("--rx", rx.toFixed(2));
      st.el.style.setProperty("--ry", ry.toFixed(2));
      st.el.style.setProperty("--glare", Math.min(1, Math.hypot(st.cx, st.cy) * 2.4 * st.p).toFixed(2));
    });
    tiltRAF = busy ? requestAnimationFrame(tiltStep) : null;
  }
  TILT.forEach(({ sel, max, lift, scale }) =>
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add("tilt3d");
      const glare = document.createElement("i");
      glare.className = "card-glare";
      glare.setAttribute("aria-hidden", "true");
      el.appendChild(glare);
      const st = { el, max, lift, scale, tx: 0, ty: 0, cx: 0, cy: 0, p: 0, on: false, live: false };
      el.addEventListener("pointerenter", () => { st.on = true; tiltWake(); });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        st.tx = (e.clientX - r.left) / r.width - 0.5;
        st.ty = (e.clientY - r.top) / r.height - 0.5;
      });
      el.addEventListener("pointerleave", () => { st.on = false; st.tx = 0; st.ty = 0; });
      tiltCards.push(st);
    })
  );


  // -- Magnetic buttons --
  document.querySelectorAll(".magnetic").forEach((btn) => {
    const STR = 0.35;
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${x * STR}px, ${y * STR}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  });

  // -- Cursor glow + marquee shear + hero depth rig (one rAF loop) --
  const glow = document.getElementById("cursorGlow");
  const marquee = document.querySelector(".marquee");
  // Hero pieces float at different depths and follow the pointer; the rig
  // waits until each element's entrance reveal is done (classes cleaned up).
  const heroLayers = [];
  if (heroInner) {
    [[".badge", 18], [".hero__avatar img", 46], [".hero__avatar-fallback", 46],
     [".hero__hi", 15], [".hero__name", 34], [".hero__role", 22], [".hero__tag", 12],
     [".hero__cta", 26], [".hero__socials", 16]].forEach(([sel, d]) =>
      heroInner.querySelectorAll(sel).forEach((el) => heroLayers.push({ el, d }))
    );
  }
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;
  let lastY = window.scrollY, shear = 0, hx = 0, hy = 0;
  window.addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    document.body.classList.add("has-cursor");
  });
  const raf = () => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    glow.style.transform = `translate(${cx}px, ${cy}px)`;
    // The tech marquee rides a tilted plane and shears with scroll velocity.
    const yNow = window.scrollY;
    shear += (Math.max(-4, Math.min(4, (yNow - lastY) * 0.14)) - shear) * 0.1;
    lastY = yNow;
    if (marquee) marquee.style.transform = `perspective(800px) rotateX(4deg) skewX(${shear.toFixed(2)}deg)`;
    // Hero parallax (only while the hero is on screen).
    if (heroLayers.length && yNow < window.innerHeight) {
      hx += (tx / window.innerWidth - 0.5 - hx) * 0.06;
      hy += (ty / window.innerHeight - 0.5 - hy) * 0.06;
      heroLayers.forEach((l) => {
        if (l.el.closest(".reveal")) return; // entrance still playing
        l.el.style.transform = `translate3d(${(hx * l.d).toFixed(1)}px, ${(hy * l.d * 0.7).toFixed(1)}px, 0)`;
      });
    }
    requestAnimationFrame(raf);
  };
  raf();
}
