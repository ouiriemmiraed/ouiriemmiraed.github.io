// ===================================================================
//  Raed Ouiriemmi — portfolio interactions
// ===================================================================
const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

// ===== Mobile menu =====
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  })
);

// ===== Navbar state + scroll progress + ghost parallax =====
const nav = document.getElementById("nav");
const progress = document.getElementById("scrollProgress");
const ghosts = [...document.querySelectorAll(".section__ghost")];
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle("scrolled", y > 20);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
  if (!reduceMotion) {
    const vh = window.innerHeight;
    ghosts.forEach((g) => {
      const r = g.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 through viewport
      g.style.transform = `translateY(calc(-58% + ${(-off * 42).toFixed(1)}px))`;
    });
  }
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ===== Reveal on scroll (with stagger inside grids) =====
const groups = [".about__stats", ".skills", ".projects", ".timeline"];
groups.forEach((sel) => {
  const parent = document.querySelector(sel);
  if (!parent) return;
  [...parent.children].forEach((child, i) => {
    if (child.classList.contains("reveal")) child.style.transitionDelay = i * 80 + "ms";
  });
});
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

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
      const target = parseInt(el.dataset.count, 10);
      let cur = 0;
      const step = Math.max(1, Math.ceil(target / 30));
      const tick = () => {
        cur = Math.min(target, cur + step);
        el.textContent = cur;
        if (cur < target) requestAnimationFrame(tick);
      };
      tick();
      countIO.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll(".stat__n").forEach((c) => countIO.observe(c));

// ===== Footer year =====
document.getElementById("year").textContent = new Date().getFullYear();

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

  // -- 3D tilt on project cards --
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const MAX = 6; // degrees
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg) translateY(-6px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

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

  // -- Cursor-following ambient glow (lerped) --
  const glow = document.getElementById("cursorGlow");
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;
  window.addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    document.body.classList.add("has-cursor");
  });
  const raf = () => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    glow.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(raf);
  };
  raf();
}
