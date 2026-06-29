// ===================================================================
//  Aurora Lab — interactive WebGL particle nebula (hero backdrop)
//  Three.js is dynamically imported only when the browser is idle,
//  on desktop with motion allowed. Falls back to the CSS aurora.
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
      .catch(() => {
        /* keep the CSS aurora fallback */
      });
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 800);
}

function softSprite(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.85)");
  g.addColorStop(0.5, "rgba(255,255,255,0.28)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.Texture(c);
  tex.needsUpdate = true;
  return tex;
}

function init(THREE, host) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.z = 13;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const sprite = softSprite(THREE);
  const group = new THREE.Group();
  scene.add(group);

  const palette = [
    new THREE.Color("#22d3ee"), // cyan
    new THREE.Color("#5b8cff"), // blue
    new THREE.Color("#a06bff"), // violet
  ];

  function cloud(count, radius, jitter, size, opacity) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const gold = Math.PI * (1 + Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const phi = Math.acos(1 - 2 * t);
      const theta = gold * i;
      const r = radius + (Math.random() - 0.5) * jitter;
      const y = r * Math.cos(phi);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const f = (y / radius + 1) / 2;
      const c =
        f < 0.5
          ? palette[0].clone().lerp(palette[1], f * 2)
          : palette[1].clone().lerp(palette[2], (f - 0.5) * 2);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  const outer = cloud(3800, 7.7, 2.7, 0.17, 1.0);
  const inner = cloud(1800, 3.9, 1.7, 0.13, 1.0);
  group.add(outer, inner);

  const ring = new THREE.Points(
    new THREE.IcosahedronGeometry(5.3, 5),
    new THREE.PointsMaterial({
      size: 0.05,
      color: 0x9fc1ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(ring);

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
    },
    { passive: true }
  );

  function resize() {
    const w = host.clientWidth || innerWidth;
    const h = host.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (document.hidden) return;
    if (!host.offsetParent) return; // hidden (e.g. light theme) -> pause
    const t = clock.getElapsedTime();
    mx += (tx - mx) * 0.045;
    my += (ty - my) * 0.045;
    group.rotation.y = t * 0.055 + mx * 0.7;
    group.rotation.x = my * 0.45 + Math.sin(t * 0.15) * 0.05;
    inner.rotation.y = -t * 0.09;
    ring.rotation.y = t * 0.12;
    ring.rotation.z = t * 0.04;
    const s = 1 + Math.sin(t * 0.6) * 0.03;
    group.scale.setScalar(s);
    renderer.render(scene, camera);
  }
  tick();
}
