import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * 3D night highway for the hero: real geometry for cars and streetlights, bloom on every light,
 * fog that swallows the far end. The road scrolls under a fixed camera that leans toward the pointer.
 * Calls onFail if WebGL isn't available so the page can fall back to the 2D canvas.
 */

const SPEED = 20;          // how fast "we" drive, m/s
const ROAD_W = 14;         // four lanes
const TILE = 40;           // metres of road per texture repeat
const FAR = 260;           // things respawn this far ahead, hidden in fog
const LAMP_GAP = 30;
const PAINT = ["#c9ced8", "#22305a", "#8c1f2c", "#2b7380", "#dcd6c8", "#3a3f48", "#b8862f"];

export default function Hero3D({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: "high-performance" }); }
    catch { onFail(); return; }

    const small = window.matchMedia("(max-width: 900px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d1630, 0.0105);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.22;

    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 1200);
    camera.position.set(0, 3.4, 9);
    const look = new THREE.Vector3(0, 1.4, -60);

    // Things to free on unmount.
    const trash: { dispose(): void }[] = [pmrem];
    const keep = <T extends { dispose(): void }>(x: T) => { trash.push(x); return x; };

    // Sky, stars, mountains, horizon glow ------------------------------------------------
    const sky = new THREE.Mesh(
      keep(new THREE.SphereGeometry(600, 32, 16)),
      keep(new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color("#060c22") }, mid: { value: new THREE.Color("#1a2756") }, low: { value: new THREE.Color("#4a3a6a") } },
        vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
        fragmentShader: "uniform vec3 top, mid, low; varying vec3 p; void main(){ float h = p.y; vec3 c = mix(low, mid, smoothstep(-.02, .12, h)); c = mix(c, top, smoothstep(.12, .6, h)); gl_FragColor = vec4(c, 1.); }",
      })),
    );
    scene.add(sky);

    const starPos = new Float32Array(small ? 1200 : 2400);
    for (let i = 0; i < starPos.length; i += 3) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.92 + 0.08);
      starPos.set([Math.sin(ph) * Math.cos(th) * 560, Math.cos(ph) * 560, Math.sin(ph) * Math.sin(th) * 560], i);
    }
    const starGeo = keep(new THREE.BufferGeometry());
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = keep(new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    scene.add(new THREE.Points(starGeo, starMat));

    const glowTex = keep(radialTexture());
    const horizon = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa64a, blending: THREE.AdditiveBlending, fog: false, transparent: true, opacity: 0.55, depthWrite: false })));
    horizon.scale.set(520, 150, 1);
    horizon.position.set(0, 6, -420);
    scene.add(horizon);

    const ridge = (z: number, base: number, amp: number, color: string, seed: number) => {
      const s = new THREE.Shape();
      s.moveTo(-900, -20);
      for (let x = -900; x <= 900; x += 18) {
        const y = base + amp * (0.55 * Math.sin(x / 90 + seed) + 0.3 * Math.sin(x / 37 + seed * 2.1) + 0.15 * Math.sin(x / 13 + seed * 3.7));
        s.lineTo(x, y);
      }
      s.lineTo(900, -20);
      const m = new THREE.Mesh(keep(new THREE.ShapeGeometry(s)), keep(new THREE.MeshBasicMaterial({ color, fog: false })));
      m.position.z = z;
      scene.add(m);
    };
    ridge(-470, 34, 26, "#26346a", 1.2);
    ridge(-430, 18, 20, "#1b2754", 4.4);
    ridge(-390, 6, 12, "#121b3c", 7.9);

    // Ground and road ---------------------------------------------------------------------
    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1600, 1600)), keep(new THREE.MeshStandardMaterial({ color: 0x090f24, roughness: 1 })));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    scene.add(ground);

    const [roadMap, roadGlow] = roadTextures();
    keep(roadMap); keep(roadGlow);
    const road = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(ROAD_W, FAR + 160)),
      keep(new THREE.MeshStandardMaterial({ map: roadMap, emissiveMap: roadGlow, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.55, metalness: 0.1 })),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = 20 - (FAR + 160) / 2;
    scene.add(road);

    // Light: moon, sky bounce, and the glow of sodium lamps -----------------------------------
    scene.add(new THREE.HemisphereLight(0x5a6fb0, 0x0a0f20, 0.55));
    const moon = new THREE.DirectionalLight(0xaabfff, 0.9);
    moon.position.set(-30, 40, 10);
    scene.add(moon);
    const sodium = new THREE.PointLight(0xffb05a, 40, 40, 2);
    sodium.position.set(0, 7, -6);
    scene.add(sodium);

    // Streetlights ----------------------------------------------------------------------------
    const poleMat = keep(new THREE.MeshStandardMaterial({ color: 0x3a4566, metalness: 0.7, roughness: 0.4 }));
    const headMat = keep(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb547, emissiveIntensity: 6 }));
    const poleGeo = keep(new THREE.CylinderGeometry(0.09, 0.13, 8, 8));
    const armGeo = keep(new THREE.BoxGeometry(2.2, 0.09, 0.09));
    const headGeo = keep(new THREE.BoxGeometry(0.8, 0.14, 0.34));
    const lampGlow = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb04a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9, depthWrite: false }));
    const poolMat = keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff9f3a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.33, depthWrite: false }));
    const poolGeo = keep(new THREE.PlaneGeometry(10, 12));
    const lamps: THREE.Group[] = [];
    const lampCount = Math.ceil((FAR + 30) / LAMP_GAP);
    for (let i = 0; i < lampCount; i++) {
      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 4; g.add(pole);
        const arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(-side * 1.05, 7.95, 0); g.add(arm);
        const head = new THREE.Mesh(headGeo, headMat); head.position.set(-side * 1.95, 7.85, 0); g.add(head);
        const glow = new THREE.Sprite(lampGlow); glow.scale.set(4.5, 4.5, 1); glow.position.copy(head.position); g.add(glow);
        const pool = new THREE.Mesh(poolGeo, poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(-side * 2.6, 0.02, 0); g.add(pool);
        g.position.set(side * (ROAD_W / 2 + 1.3), 0, 15 - i * LAMP_GAP - (side > 0 ? LAMP_GAP / 2 : 0));
        scene.add(g);
        lamps.push(g);
      }
    }

    // Cars ------------------------------------------------------------------------------------
    const bodyGeo = keep(roundedBox(1.9, 0.66, 4.4, 0.14));
    const cabinGeo = keep(roundedBox(1.58, 0.52, 2.2, 0.16));
    const wheelGeo = keep(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16));
    const lightGeo = keep(new THREE.BoxGeometry(0.44, 0.13, 0.06));
    const glassMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x0b1020, metalness: 0.2, roughness: 0.08, clearcoat: 1 }));
    const tyreMat = keep(new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 }));
    const headLamp = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 9 }));
    const tailLamp = keep(new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff2a1e, emissiveIntensity: 7 }));
    const headGlow = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xe8f0ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.85, depthWrite: false }));
    const tailGlow = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3a2a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.7, depthWrite: false }));
    const beamMat = keep(new THREE.MeshBasicMaterial({ map: keep(beamTexture()), color: 0xdfe8ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.32, depthWrite: false }));
    const beamGeo = keep(new THREE.PlaneGeometry(3.4, 14));
    const paints = PAINT.map(c => keep(new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.65, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 })));

    interface Car { g: THREE.Group; v: number; oncoming: boolean }
    const cars: Car[] = [];
    const makeCar = (oncoming: boolean, lane: number, z: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, paints[Math.floor(Math.random() * paints.length)]); body.position.y = 0.62; g.add(body);
      const cabin = new THREE.Mesh(cabinGeo, glassMat); cabin.position.set(0, 1.18, 0.25); g.add(cabin);
      for (const x of [-0.92, 0.92]) for (const zz of [-1.4, 1.4]) {
        const w = new THREE.Mesh(wheelGeo, tyreMat); w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, zz); g.add(w);
      }
      for (const x of [-0.64, 0.64]) {
        const h = new THREE.Mesh(lightGeo, headLamp); h.position.set(x, 0.7, -2.21); g.add(h);
        const t = new THREE.Mesh(lightGeo, tailLamp); t.position.set(x, 0.74, 2.21); g.add(t);
        const hs = new THREE.Sprite(headGlow); hs.scale.set(1.6, 1.6, 1); hs.position.set(x, 0.7, -2.4); g.add(hs);
        const ts = new THREE.Sprite(tailGlow); ts.scale.set(1.1, 1.1, 1); ts.position.set(x, 0.74, 2.4); g.add(ts);
      }
      const beam = new THREE.Mesh(beamGeo, beamMat); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.03, -9.4); g.add(beam);
      // Front of the model faces -z; oncoming cars turn round to face us.
      if (oncoming) g.rotation.y = Math.PI;
      g.position.set(lane, 0, z);
      scene.add(g);
      // Speed relative to our camera: oncoming rush past, cars ahead in our direction drift back slowly.
      cars.push({ g, oncoming, v: oncoming ? SPEED + 14 + Math.random() * 10 : 2 + Math.random() * 5 });
    };
    const n = small ? 4 : 7;
    for (let i = 0; i < n; i++) makeCar(true, i % 2 ? -1.75 : -5.25, -FAR * (i / n) - 20);
    for (let i = 0; i < n - 1; i++) makeCar(false, i % 2 ? 1.75 : 5.25, -FAR * (i / (n - 1)) - 30);

    // Post-processing: bloom makes the lamps, lights and lane paint glow ---------------------------
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: small ? 0 : 4 });
    const composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.62);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    trash.push(composer, bloom);

    // Size, camera lean, loop ----------------------------------------------------------------------
    const size = () => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      // On wide screens, push the vanishing point right so the road sits behind the ride card, not the headline.
      if (w > 900) camera.setViewOffset(w, h, -w * 0.16, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };

    const clock = new THREE.Clock();
    let raf = 0, visible = true, t = 0;
    const step = (dt: number) => {
      t += dt;
      roadMap.offset.y = roadGlow.offset.y = (roadMap.offset.y + (SPEED * dt) / TILE) % 1;
      for (const g of lamps) { g.position.z += SPEED * dt; if (g.position.z > 20) g.position.z -= lampCount * LAMP_GAP; }
      for (const c of cars) {
        c.g.position.z += c.v * dt;
        if (c.g.position.z > 16) c.g.position.z = -FAR - Math.random() * 40;
      }
      camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.04;
      camera.position.y += (3.4 - pointer.y * 0.6 + Math.sin(t * 1.7) * 0.03 - camera.position.y) * 0.04;
      camera.lookAt(look);
      starMat.opacity = 0.75 + Math.sin(t * 0.8) * 0.1;
    };
    const frame = () => {
      raf = 0;
      step(Math.min(0.05, clock.getDelta()));
      composer.render();
      if (visible && !reduce.matches) raf = requestAnimationFrame(frame);
    };
    const still = () => { size(); camera.lookAt(look); composer.render(); };

    size();
    if (reduce.matches) { step(0.016); still(); } else raf = requestAnimationFrame(frame);
    cv.classList.add("ready");

    const ro = new ResizeObserver(() => { size(); if (reduce.matches) still(); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduce.matches) { clock.getDelta(); raf = requestAnimationFrame(frame); }
    });
    io.observe(cv);
    window.addEventListener("pointermove", onPointer, { passive: true });
    const onLost = (e: Event) => { e.preventDefault(); onFail(); };
    cv.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      cv.removeEventListener("webglcontextlost", onLost);
      target.dispose();
      trash.forEach(x => x.dispose());
      renderer.dispose();
    };
  }, [onFail]);

  return <canvas ref={ref} className="hero-road hero-3d" aria-hidden="true" />;
}

/** Soft round glow, used for lamp halos, light pools and the horizon. */
function radialTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Headlight spill on the road: bright near the car, fading out ahead. */
function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  const side = x.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, "rgba(0,0,0,1)"); side.addColorStop(0.3, "rgba(0,0,0,0)"); side.addColorStop(0.7, "rgba(0,0,0,0)"); side.addColorStop(1, "rgba(0,0,0,1)");
  x.globalCompositeOperation = "destination-out"; x.fillStyle = side; x.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

/** Asphalt with lane paint, plus a matching glow map so only the paint lights up. */
function roadTextures(): [THREE.CanvasTexture, THREE.CanvasTexture] {
  const W = 512, H = 1024;
  const u = (m: number) => ((m + ROAD_W / 2) / ROAD_W) * W; // metres across -> pixels
  const dash = H / (TILE / 12); // a 3 m dash every 12 m

  const a = document.createElement("canvas"); a.width = W; a.height = H;
  const x = a.getContext("2d")!;
  x.fillStyle = "#1c2442"; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { const v = 22 + Math.random() * 26; x.fillStyle = `rgb(${v},${v + 4},${v + 22})`; x.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  // Darker wheel tracks in each lane
  x.fillStyle = "rgba(8,12,30,.25)";
  for (const lane of [-5.25, -1.75, 1.75, 5.25]) for (const o of [-0.8, 0.8]) x.fillRect(u(lane + o) - 10, 0, 20, H);

  const b = document.createElement("canvas"); b.width = W; b.height = H;
  const y = b.getContext("2d")!;
  y.fillStyle = "#000"; y.fillRect(0, 0, W, H);

  const paint = (ctx: CanvasRenderingContext2D, edge: string, centre: string, lane: string) => {
    ctx.fillStyle = edge; for (const m of [-6.7, 6.7]) ctx.fillRect(u(m) - 4, 0, 8, H);
    ctx.fillStyle = centre; for (const m of [-0.16, 0.16]) ctx.fillRect(u(m) - 3, 0, 6, H);
    ctx.fillStyle = lane; for (const m of [-3.5, 3.5]) for (let k = 0; k < H; k += dash) ctx.fillRect(u(m) - 3, k, 6, dash / 4);
  };
  paint(x, "#c9d3ea", "#ffb547", "#d8deee");
  paint(y, "#2bb3bd", "#c27f22", "#3a4050");

  const make = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, (FAR + 160) / TILE);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return [make(a, true), make(b, true)];
}

/** Box with softened edges, so the cars read as cars rather than crates. */
function roundedBox(w: number, h: number, d: number, r: number) {
  const s = new THREE.Shape();
  const x = -d / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + d - r, y); s.quadraticCurveTo(x + d, y, x + d, y + r);
  s.lineTo(x + d, y + h - r); s.quadraticCurveTo(x + d, y + h, x + d - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: w - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(w - r * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
