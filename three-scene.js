// ===================================================================
//  Hero WebGL — theme-aware, dynamically imported on idle (desktop only)
//   • Light mode → "data network": nodes linked by edges (a knowledge
//     graph / neural-net look that signifies data science) — reads on white.
//   • Dark mode  → glowing particle nebula.
//  Falls back to the CSS aurora if WebGL is unavailable.
// ===================================================================
const host = document.getElementById("webgl");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(hover: none)").matches;
const small = matchMedia("(max-width: 760px)").matches;

if (host && !reduce && !touch && !small) {
  const start = () =>
    import("three")
      .then((THREE) => {
        init(THREE, host);
        document.body.classList.add("webgl-on");
      })
      .catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 800);
}

const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

function sprite(THREE, hard) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (hard) {
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,1)");
    g.addColorStop(0.62, "rgba(255,255,255,0.55)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
  } else {
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.22, "rgba(255,255,255,0.85)");
    g.addColorStop(0.5, "rgba(255,255,255,0.28)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.Texture(c);
  t.needsUpdate = true;
  return t;
}

function init(THREE, host) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.z = 14;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  let content = null;
  function setMode() {
    if (content) { scene.remove(content.group); content.dispose(); content = null; }
    content = isLight() ? buildNetwork(THREE) : buildNebula(THREE);
    scene.add(content.group);
  }
  setMode();
  new MutationObserver(setMode).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-theme"],
  });

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener("pointermove", (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (document.hidden || !host.offsetParent) return;
    const t = clock.getElapsedTime();
    mx += (tx - mx) * 0.045; my += (ty - my) * 0.045;
    if (content) content.update(t, mx, my);
    renderer.render(scene, camera);
  }
  tick();
}

// ---------- LIGHT: data network (nodes + edges) ----------
function buildNetwork(THREE) {
  const group = new THREE.Group();
  const N = 80, R = 7.4, TH = 3.4;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const v = [];
  const blue = new THREE.Color("#2257cc"), violet = new THREE.Color("#6d3bd6");
  for (let i = 0; i < N; i++) {
    const u = Math.random(), w = Math.random();
    const theta = 2 * Math.PI * u, phi = Math.acos(2 * w - 1);
    const r = R * (0.45 + 0.55 * Math.cbrt(Math.random()));
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi) * 0.85;
    const z = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    v.push(new THREE.Vector3(x, y, z));
    const c = Math.random() < 0.32 ? violet : blue;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  nodeGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dot = sprite(THREE, true);
  const nodeMat = new THREE.PointsMaterial({ size: 0.42, map: dot, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  group.add(nodes);

  const lp = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    if (v[i].distanceTo(v[j]) < TH) lp.push(v[i].x, v[i].y, v[i].z, v[j].x, v[j].y, v[j].z);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x3d6fe0, transparent: true, opacity: 0.13 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  return {
    group,
    update(t, mx, my) {
      group.rotation.y = t * 0.05 + mx * 0.6;
      group.rotation.x = my * 0.4 + Math.sin(t * 0.12) * 0.04;
      group.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
      nodeMat.size = 0.42 + Math.sin(t * 1.4) * 0.04;
    },
    dispose() { nodeGeo.dispose(); lineGeo.dispose(); nodeMat.dispose(); lineMat.dispose(); dot.dispose(); },
  };
}

// ---------- DARK: glowing particle nebula ----------
function buildNebula(THREE) {
  const group = new THREE.Group();
  const soft = sprite(THREE, false);
  const palette = [new THREE.Color("#4f7bf0"), new THREE.Color("#6f8dff"), new THREE.Color("#9b73ff")];
  function cloud(count, radius, jitter, size, opacity) {
    const p = new Float32Array(count * 3), c = new Float32Array(count * 3);
    const gold = Math.PI * (1 + Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count, phi = Math.acos(1 - 2 * t), th = gold * i;
      const r = radius + (Math.random() - 0.5) * jitter, y = r * Math.cos(phi);
      p[i * 3] = r * Math.sin(phi) * Math.cos(th); p[i * 3 + 1] = y; p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(th);
      const f = (y / radius + 1) / 2;
      const cc = f < 0.5 ? palette[0].clone().lerp(palette[1], f * 2) : palette[1].clone().lerp(palette[2], (f - 0.5) * 2);
      c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    const m = new THREE.PointsMaterial({ size, map: soft, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    return new THREE.Points(g, m);
  }
  const outer = cloud(3400, 7.4, 2.6, 0.15, 0.7);
  const inner = cloud(1600, 3.8, 1.6, 0.12, 0.8);
  group.add(outer, inner);
  return {
    group,
    update(t, mx, my) {
      group.rotation.y = t * 0.055 + mx * 0.7;
      group.rotation.x = my * 0.45 + Math.sin(t * 0.15) * 0.05;
      inner.rotation.y = -t * 0.09;
      group.scale.setScalar(1 + Math.sin(t * 0.6) * 0.03);
    },
    dispose() {
      [outer, inner].forEach((o) => { o.geometry.dispose(); o.material.dispose(); });
      soft.dispose();
    },
  };
}
