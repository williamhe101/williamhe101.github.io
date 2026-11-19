(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var missing = typeof THREE === "undefined";
  function $(id) { return document.getElementById(id); }
  function warn(cv) {
    var p = document.createElement("p"); p.className = "note";
    p.textContent = "This 3D demo needs WebGL and a connection to load Three.js. Try refreshing the page.";
    cv.parentNode.insertBefore(p, cv); cv.style.display = "none";
  }

  /* Shared scene helper: renderer, resize, visibility-gated loop. */
  function stage(cv, o) {
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { warn(cv); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(o.bg || 0x06101a, 1);
    if (o.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(o.fov || 40, 1, 0.1, 300);
    var api = { scene: scene, camera: cam, renderer: renderer, render: function () { renderer.render(scene, cam); } };
    var running = false, visible = true, last = 0;
    function resize() {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      if (reduce || !running) api.render();
    }
    function frame(ts) {
      if (!running) return;
      var dt = Math.min((ts - last) / 1000, 0.05); last = ts;
      o.update(ts / 1000, dt, api); renderer.render(scene, cam);
      requestAnimationFrame(frame);
    }
    function start() { if (!reduce && !running && visible) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
    window.addEventListener("resize", resize);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(cv);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); else running = false; }).observe(cv);
    api.init = function () { resize(); if (reduce) { o.update(2, 0, api); api.render(); } else start(); };
    return api;
  }
  /* High-contrast floating label: dark pill, coloured border, white bold text (readable on any background). */
  function label(text, color, scale) {
    var px = 46, font = "bold " + px + "px 'Space Grotesk', 'Segoe UI', sans-serif", pad = 30;
    var c = document.createElement("canvas"), g = c.getContext("2d");
    g.font = font; var tw = Math.ceil(g.measureText(text).width);
    c.width = tw + pad * 2; c.height = px + 34; g = c.getContext("2d"); g.font = font;
    var r = c.height / 2 - 3;
    g.beginPath(); g.moveTo(r + 3, 3); g.arcTo(c.width - 3, 3, c.width - 3, c.height - 3, r); g.arcTo(c.width - 3, c.height - 3, 3, c.height - 3, r); g.arcTo(3, c.height - 3, 3, 3, r); g.arcTo(3, 3, c.width - 3, 3, r); g.closePath();
    g.fillStyle = "rgba(6,12,22,0.9)"; g.fill(); g.lineWidth = 4; g.strokeStyle = color || "#2ef2b0"; g.stroke();
    g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, c.width / 2, c.height / 2 + 2);
    var tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(scale * c.width / c.height, scale, 1); s.renderOrder = 10; return s;
  }
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  window.LAB3D = { stage: stage, label: label, warn: warn, ease: ease, reduce: reduce };

  /* ───────────────────────────────────────────────────────────────────
     2 · DormPod delivery run (cinematic 3D, not interactive)
     ─────────────────────────────────────────────────────────────────── */
  function pod3d() {
    var cv = $("pod"); if (!cv) return; if (missing) return warn(cv);
    var hud = $("pod-hud"), log = $("pod-log");
    var S = stage(cv, { bg: 0x070d18, fov: 36, shadows: true, update: upd }); if (!S) return;
    var scene = S.scene, cam = S.camera;
    scene.fog = new THREE.Fog(0x070d18, 42, 95);
    function W(nx, ny) { return new THREE.Vector3((nx - 0.5) * 30, 0, (ny - 0.5) * 16); }
    function mat(c, r, m, e) { return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.7 : r, metalness: m || 0, emissive: e || 0x000000 }); }
    function box(w, h, d, c, x, y, z, parent, r, m) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, r, m)); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; (parent || scene).add(b); return b; }
    function plane(w, d, c, x, y, z, r) { var p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c, r == null ? 0.95 : r)); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); return p; }

    // lights
    scene.add(new THREE.HemisphereLight(0x9bb7ff, 0x182030, 0.55));
    var sun = new THREE.DirectionalLight(0xfff1dd, 0.95); sun.position.set(-10, 22, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); var sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 70; scene.add(sun);

    // ground, street, curb, sidewalk
    plane(140, 90, 0x0d1822, 0, -0.03, 0, 1);
    var zCurb = W(0, 0.86).z, zWalk = W(0, 0.70).z;
    plane(90, 3.2, 0x151c26, 0, 0, zCurb + 1.6);
    for (var dx = -38; dx < 38; dx += 3) box(1.6, 0.02, 0.14, 0xd9d27a, dx, 0.01, zCurb + 1.9);
    box(90, 0.2, 0.38, 0x8d99a6, 0, 0.1, zCurb);
    var tile = document.createElement("canvas"); tile.width = tile.height = 128; var tg = tile.getContext("2d");
    tg.fillStyle = "#2d3947"; tg.fillRect(0, 0, 128, 128); tg.strokeStyle = "#3d4d60"; tg.lineWidth = 3; tg.strokeRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(tile); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(36, 1.3);
    var walk = new THREE.Mesh(new THREE.PlaneGeometry(90, zCurb - zWalk), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.005, (zCurb + zWalk) / 2); walk.receiveShadow = true; scene.add(walk);

    // building
    var x0 = W(0.08, 0).x, x1 = W(0.92, 0).x, zT = W(0, 0.06).z, zB = W(0, 0.70).z;
    plane(x1 - x0, zB - zT, 0x233447, (x0 + x1) / 2, 0.01, (zT + zB) / 2, 0.8);
    var zH0 = W(0, 0.36).z, zH1 = W(0, 0.58).z;
    plane(x1 - x0, zH1 - zH0, 0x2a4560, (x0 + x1) / 2, 0.02, (zH0 + zH1) / 2, 0.9);
    plane(W(0.5, 0).x - x0, zH0 - zT, 0x4a3a30, (x0 + W(0.5, 0).x) / 2, 0.02, (zT + zH0) / 2, 0.7);
    plane(W(0.7, 0).x - W(0.5, 0).x, zH0 - zT, 0x4a3a30, (W(0.5, 0).x + W(0.7, 0).x) / 2, 0.02, (zT + zH0) / 2, 0.7);
    plane(x1 - W(0.7, 0).x, zH0 - zT, 0x4a3a30, (x1 + W(0.7, 0).x) / 2, 0.02, (zT + zH0) / 2, 0.7);
    var WALLS = [
      [0.08, 0.06, 0.92, 0.06], [0.08, 0.06, 0.08, 0.70], [0.92, 0.06, 0.92, 0.70],
      [0.08, 0.70, 0.19, 0.70], [0.27, 0.70, 0.92, 0.70],
      [0.08, 0.36, 0.38, 0.36], [0.42, 0.36, 0.58, 0.36], [0.62, 0.36, 0.78, 0.36], [0.82, 0.36, 0.92, 0.36],
      [0.08, 0.58, 0.19, 0.58], [0.27, 0.58, 0.92, 0.58],
      [0.19, 0.58, 0.19, 0.70], [0.27, 0.58, 0.27, 0.70],
      [0.50, 0.06, 0.50, 0.36], [0.70, 0.06, 0.70, 0.36],
      [0.46, 0.76, 0.58, 0.76], [0.58, 0.76, 0.58, 0.80], [0.58, 0.80, 0.46, 0.80], [0.46, 0.80, 0.46, 0.76]
    ];
    var segs = WALLS.map(function (w) { var a = W(w[0], w[1]), b = W(w[2], w[3]); return [a.x, a.z, b.x, b.z]; });
    for (var wi = 0; wi < 15; wi++) {
      var a = segs[wi], len = Math.hypot(a[2] - a[0], a[3] - a[1]);
      var wh = (wi === 3 || wi === 4 || wi === 9 || wi === 10 || wi === 11 || wi === 12) ? 0.7 : 1.7;   // low south walls = cutaway view
      var wm = box(len, wh, 0.22, 0xb9c8d6, (a[0] + a[2]) / 2, wh / 2, (a[1] + a[3]) / 2, null, 0.8);
      wm.rotation.y = -Math.atan2(a[3] - a[1], a[2] - a[0]);
      box(len, 0.05, 0.26, 0x7f93a6, (a[0] + a[2]) / 2, wh + 0.02, (a[1] + a[3]) / 2).rotation.y = wm.rotation.y;
    }
    // entrance frame, canopy, sign
    var ex0 = W(0.19, 0).x, ex1 = W(0.27, 0).x, ez = zB;
    box(0.2, 2.2, 0.3, 0xdbe3ea, ex0, 1.1, ez); box(0.2, 2.2, 0.3, 0xdbe3ea, ex1, 1.1, ez);
    box(ex1 - ex0 + 0.3, 0.3, 0.3, 0xdbe3ea, (ex0 + ex1) / 2, 2.25, ez);
    var canopy = box(ex1 - ex0 + 1.6, 0.12, 2.6, 0x2f3b4a, (ex0 + ex1) / 2, 2.55, ez + 1.2); canopy.material.transparent = true; canopy.material.opacity = 0.3; canopy.castShadow = false;
    box(0.12, 2.5, 0.12, 0x9fb0c0, ex0 - 0.6, 1.25, ez + 2.3); box(0.12, 2.5, 0.12, 0x9fb0c0, ex1 + 0.6, 1.25, ez + 2.3);
    var sign = label("DORM ENTRANCE", "#ffb347", 0.62); sign.position.set((ex0 + ex1) / 2, 3.6, ez + 1.2); scene.add(sign);
    var curbLbl = label("CURB", "#ffffff", 0.75); curbLbl.position.copy(W(0.09, 0.9)); curbLbl.position.y = 0.9; scene.add(curbLbl);
    // ceiling lights + furniture
    [0.2, 0.5, 0.8].forEach(function (nx) {
      var p = W(nx, 0.47); box(2.2, 0.06, 0.5, 0xfff3d6, p.x, 2.3, p.z).material.emissive = new THREE.Color(0xfff3d6);
      var pl = new THREE.PointLight(0xffe9c4, 0.5, 11); pl.position.set(p.x, 2.0, p.z); scene.add(pl);
    });
    [[0.29, 0.2], [0.60, 0.2], [0.81, 0.2]].forEach(function (r) {
      var p = W(r[0], r[1]);
      box(2.3, 0.5, 1.2, 0x3d4f78, p.x - 0.8, 0.3, p.z - 0.9); box(0.7, 0.16, 0.5, 0xf2f2f2, p.x - 1.6, 0.62, p.z - 0.9);
      box(1.7, 0.08, 0.8, 0x6b4a32, p.x + 1.4, 0.75, p.z - 1.5); box(0.1, 0.75, 0.7, 0x6b4a32, p.x + 0.7, 0.37, p.z - 1.5); box(0.1, 0.75, 0.7, 0x6b4a32, p.x + 2.1, 0.37, p.z - 1.5);
    });
    [["ROOM A", 0.29], ["ROOM B", 0.60], ["ROOM C", 0.81]].forEach(function (r) { var s = label(r[0], r[0] === "ROOM B" ? "#ff7a59" : "#2ef2b0", 0.62); var p = W(r[1], 0.11); s.position.set(p.x, 2.4, p.z); scene.add(s); });   // on the back wall, clear of the drop-off spot
    // outdoor props
    var tp = W(0.82, 0.78), trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 10), mat(0x5a3d28)); trunk.position.set(tp.x, 1.1, tp.z); trunk.castShadow = true; scene.add(trunk);
    var crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), mat(0x1f6b4a)); crown.position.set(tp.x, 3.2, tp.z); crown.castShadow = true; scene.add(crown);
    var bp = W(0.52, 0.78); box(3.6, 0.14, 0.7, 0x8a5a36, bp.x, 0.55, bp.z); box(3.6, 0.6, 0.12, 0x8a5a36, bp.x, 0.95, bp.z - 0.32); box(0.12, 0.55, 0.6, 0x2b2f36, bp.x - 1.6, 0.27, bp.z); box(0.12, 0.55, 0.6, 0x2b2f36, bp.x + 1.6, 0.27, bp.z);
    var lp = W(0.12, 0.74); box(0.1, 3.6, 0.1, 0x2b2f36, lp.x, 1.8, lp.z); var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); lamp.position.set(lp.x, 3.7, lp.z); scene.add(lamp);
    var lpl = new THREE.PointLight(0xffd9a0, 0.9, 16); lpl.position.set(lp.x, 3.5, lp.z); scene.add(lpl);

    // AprilTags + doors
    function tagTex(id) {
      var c = document.createElement("canvas"); c.width = c.height = 128; var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#000"; g.fillRect(12, 12, 104, 104);
      var cell = 80 / 6; for (var i = 0; i < 36; i++) { var bit = ((id * 2654435761 >>> (i % 24)) + i * 7 + id) & 1; g.fillStyle = bit ? "#fff" : "#000"; g.fillRect(24 + (i % 6) * cell, 24 + Math.floor(i / 6) * cell, cell - 0.5, cell - 0.5); }
      var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
    }
    var DOORS = [{ id: 2, x: 0.40 }, { id: 3, x: 0.60 }, { id: 4, x: 0.80 }], TARGET = 3, tagObjs = {}, doorB = null;
    DOORS.forEach(function (d) {
      var p = W(d.x - 0.04, 0.36);
      var back = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ color: d.id === TARGET ? 0xff7a59 : 0xdde3ea })); back.position.set(p.x, 1.0, p.z + 0.125); scene.add(back);
      var tg2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tagTex(d.id) })); tg2.position.set(p.x, 1.0, p.z + 0.13); scene.add(tg2);
      var edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.75, -0.75, 0), new THREE.Vector3(0.75, -0.75, 0), new THREE.Vector3(0.75, 0.75, 0), new THREE.Vector3(-0.75, 0.75, 0)]), new THREE.LineBasicMaterial({ color: 0xb08cff })); edge.position.set(p.x, 1.0, p.z + 0.16); edge.visible = false; scene.add(edge);
      var idl = label("TAG #" + d.id, d.id === TARGET ? "#ff7a59" : "#b08cff", 0.62); idl.position.set(p.x, 2.15, p.z + 0.25); scene.add(idl);
      tagObjs[d.id] = { edge: edge };
      var dc = W(d.x, 0.36);
      var pivot = new THREE.Group(); pivot.position.set(dc.x - 0.6, 0, dc.z); scene.add(pivot);
      var slab = box(1.15, 1.6, 0.08, 0x9a6b3f, 0.58, 0.8, 0, pivot, 0.6);
      if (d.id === TARGET) doorB = pivot; else pivot.rotation.y = 0;
    });

    var markPos = W(0.60, 0.235), mark = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 40), new THREE.MeshBasicMaterial({ color: 0xff7a59, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(markPos.x, 0.04, markPos.z); mark.visible = false; scene.add(mark);   // drop-off marker on the Room B floor
    var LBL = []; scene.traverse(function (o) { if (o.isSprite) LBL.push(o); });   // floating labels fade out when the camera gets close
    // ── the pod ──
    var pod = new THREE.Group(); scene.add(pod);
    box(1.3, 0.26, 0.86, 0x2b3340, 0, 0.36, 0, pod, 0.4, 0.5);
    box(1.22, 0.36, 0.82, 0xeef1f6, 0, 0.68, 0, pod, 0.3, 0.1);
    // cargo bay: an open-top compartment on the roof. The package sits INSIDE it and the hinged lid is above, so the lid swings clear.
    box(0.92, 0.03, 0.76, 0x1b222c, -0.12, 0.885, 0, pod, 0.8);                                   // bay floor
    box(0.03, 0.4, 0.76, 0xe6eaf0, 0.34, 1.08, 0, pod, 0.35); box(0.03, 0.4, 0.76, 0xe6eaf0, -0.58, 1.08, 0, pod, 0.35);   // front / rear walls
    box(0.92, 0.4, 0.03, 0xe6eaf0, -0.12, 1.08, 0.38, pod, 0.35); box(0.92, 0.4, 0.03, 0xe6eaf0, -0.12, 1.08, -0.38, pod, 0.35); // side walls
    var lidPivot = new THREE.Group(); lidPivot.position.set(-0.58, 1.32, 0); pod.add(lidPivot);       // hinge at the rear, above the bay walls
    box(0.96, 0.05, 0.82, 0xdde3ec, 0.48, 0, 0, lidPivot, 0.3, 0.2);
    var pkg = new THREE.Group(); pod.add(pkg); pkg.position.set(-0.12, 1.08, 0);
    box(0.5, 0.34, 0.42, 0xc8955a, 0, 0, 0, pkg, 0.8); box(0.52, 0.05, 0.1, 0xf1e3c8, 0, 0.1, 0, pkg); box(0.1, 0.36, 0.44, 0xf1e3c8, 0, 0, 0, pkg);
    var tower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.36, 14), mat(0x22272f, 0.4, 0.6)); tower.position.set(0.5, 1.05, 0); tower.castShadow = true; pod.add(tower);
    var head = new THREE.Group(); head.position.set(0.5, 1.3, 0); pod.add(head);
    var puck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 24), mat(0xff7a59, 0.4, 0.3, 0x401810)); puck.castShadow = true; head.add(puck);
    box(0.36, 0.03, 0.05, 0xffffff, 0, 0.1, 0, head); box(0.05, 0.03, 0.2, 0x11151b, 0.12, 0.09, 0, head);
    function lens(x, y, z) { var m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0x7a5cff })); m.position.set(x, y, z); pod.add(m); return m; }
    box(0.12, 0.12, 0.26, 0x0b0d12, 0.64, 0.74, 0, pod); var frontLens = lens(0.71, 0.74, 0);
    box(0.14, 0.12, 0.1, 0x0b0d12, 0.3, 0.74, -0.44, pod); var sideLens = lens(0.3, 0.74, -0.51);
    [-0.28, 0.28].forEach(function (z) { var hl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.14), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); hl.position.set(0.63, 0.55, z); pod.add(hl); });
    var glowMat = new THREE.MeshBasicMaterial({ color: 0x2ef2b0 }), glow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 0.9), glowMat); glow.position.set(0, 0.2, 0); pod.add(glow);
    var wheels = [];
    [[0.42, 0.52], [0.42, -0.52], [-0.42, 0.52], [-0.42, -0.52]].forEach(function (p) {
      var wg = new THREE.Group(); wg.position.set(p[0], 0.21, p[1]); pod.add(wg);
      var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 22), mat(0x14171c, 0.9)); tire.rotation.x = Math.PI / 2; tire.castShadow = true; wg.add(tire);
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), mat(0xb8c2cc, 0.3, 0.8)); hub.rotation.x = Math.PI / 2; wg.add(hub);
      var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.19), mat(0x222831)); wg.add(spoke);
      wheels.push(wg);
    });
    pod.scale.setScalar(1.5);

    // ── lidar visualisation (persistent returns that fade) ──
    var NR = 150, lpos = new Float32Array(NR * 3), lcol = new Float32Array(NR * 3), llin = new Float32Array(NR * 6), llc = new Float32Array(NR * 6), inten = new Float32Array(NR), hitx = new Float32Array(NR), hitz = new Float32Array(NR);
    var pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(lpos, 3)); pg.setAttribute("color", new THREE.BufferAttribute(lcol, 3));
    var points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); points.frustumCulled = false; scene.add(points);
    var lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(llin, 3)); lg.setAttribute("color", new THREE.BufferAttribute(llc, 3));
    var lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); lines.frustumCulled = false; scene.add(lines);
    var TREE = { x: tp.x, z: tp.z, r: 1.4 }, sweep = 0, nearest = 99;
    function cast(ox, oz, dx, dz) {
      var best = 11;
      for (var s = 0; s < segs.length; s++) {
        var q = segs[s], sx = q[2] - q[0], sz = q[3] - q[1], den = dx * sz - dz * sx; if (Math.abs(den) < 1e-9) continue;
        var t = ((q[0] - ox) * sz - (q[1] - oz) * sx) / den, u = ((q[0] - ox) * dz - (q[1] - oz) * dx) / den;
        if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
      }
      var fx = ox - TREE.x, fz = oz - TREE.z, b = fx * dx + fz * dz, c = fx * fx + fz * fz - TREE.r * TREE.r, disc = b * b - c;
      if (disc >= 0) { var t2 = -b - Math.sqrt(disc); if (t2 > 0 && t2 < best) best = t2; }
      return best;
    }

    // ── state machine (normalised map coords) ──
    var st, PH = { curb: "arrived at the curb · packages loaded", drive1: "driving the walkway · lidar mapping obstacles", turn: "inside the hallway · differential turn", drive2: "scanning for AprilTags along the hall", deliver: "tag #3 matched → stopped · delivering to Room B", fade: "run complete · heading back" };
    function resetPod() { st = { phase: "curb", t: 0, x: 0.23, y: 0.90, th: -Math.PI / 2, scale: 0.01, spin: 0, seen: null, door: 0, lid: 0, pk: null }; }
    resetPod();
    var look = new THREE.Vector3(-6, 0.5, 4.5), camPos = new THREE.Vector3(-2, 9, 19);
    function shot(phase, p, tt) {
      var P = new THREE.Vector3(), Lk = new THREE.Vector3();
      if (phase === "curb" || phase === "fade") { P.set(-1.5, 8.5, 20); Lk.set(-6.5, 0.8, 3.2); }
      else if (phase === "drive1") { P.set(p.x + 8, 7.5, p.z + 6.5); Lk.set(p.x, 0.8, p.z - 2.5); }
      else if (phase === "turn" || phase === "drive2") { P.set(p.x - 4.5, 4.6, p.z + 6.2); Lk.set(p.x + 3.2, 0.8, p.z - 0.4); }
      else { var d = W(0.6, 0.36); P.set(d.x, 13.5, d.z + 2.0); Lk.set(d.x, 0, d.z - 1.6); }   // near-overhead, so the hallway wall can't hide the drop-off
      return [P, Lk];
    }
    var tmp = new THREE.Vector3(), deliverStart = null, target = W(0.60, 0.235);
    var speedN = 0.085;
    function upd(t, dt) {
      if (reduce) { st.phase = "drive2"; st.x = 0.5; st.y = 0.47; st.th = 0; st.scale = 1.5; }
      else {
        st.t += dt;
        var ph = st.phase;
        if (ph === "curb") { st.scale = Math.min(1.5, st.scale + dt * 2.2); if (st.t > 2.2) { st.phase = "drive1"; st.t = 0; } }
        else if (ph === "drive1") { st.y -= (speedN * 30 / 16) * dt; st.spin += speedN * 30 * dt; if (st.y <= 0.47) { st.y = 0.47; st.phase = "turn"; st.t = 0; } }
        else if (ph === "turn") { st.th += 1.9 * dt; if (st.th >= 0) { st.th = 0; st.phase = "drive2"; st.t = 0; } }
        else if (ph === "drive2") {
          st.door = Math.min(1, st.door + dt * 1.5); st.x += speedN * dt; st.spin += speedN * 30 * dt;
          if (st.x >= 0.6) { st.x = 0.6; st.phase = "deliver"; st.t = 0; }
        } else if (ph === "deliver") {
          st.lid = Math.min(1.25, st.lid + dt * 1.6);
          if (st.t > 0.9 && !st.pk) { st.pk = "air"; scene.attach(pkg); deliverStart = pkg.position.clone(); }
          if (st.pk === "air") { var u = Math.min(1, (st.t - 0.9) / 2.0); pkg.position.lerpVectors(deliverStart, target.clone().setY(0.2), ease(u)); pkg.position.y += Math.sin(u * Math.PI) * 1.6; pkg.rotation.y = (1 - ease(u)) * 1.2; if (u >= 1) st.pk = "done"; }
          if (st.t > 6.2) { st.phase = "fade"; st.t = 0; }
        } else if (ph === "fade") {
          st.lid = Math.max(0, st.lid - dt * 2); st.scale = Math.max(0.01, 1.5 - st.t * 2.2);
          if (st.t > 0.7) { pod.add(pkg); pkg.position.set(-0.12, 1.08, 0); pkg.rotation.set(0, 0, 0); pkg.scale.set(1, 1, 1); resetPod(); st.phase = "curb"; }
        }
      }
      var P = W(st.x, st.y);
      pod.position.set(P.x, 0, P.z); pod.rotation.y = -st.th; pod.scale.setScalar(st.scale || 0.01);
      wheels.forEach(function (w) { w.rotation.z = -st.spin / 0.3; });
      mark.visible = st.phase === "deliver" && !!st.pk; mark.scale.setScalar(1 + 0.1 * Math.sin(t * 6));
      head.rotation.y = t * 7; lidPivot.rotation.z = st.lid; doorB.rotation.y = -st.door * 1.45;
      var moving = st.phase === "drive1" || st.phase === "drive2", turning = st.phase === "turn";
      glowMat.color.setHex(moving ? 0x2ef2b0 : turning ? 0xffc14d : st.phase === "deliver" ? 0x5db2ff : 0x2ef2b0);
      // lidar sweep
      var ox = P.x, oz = P.z, nearestNow = 99;
      sweep = (sweep + dt * 9) % (Math.PI * 2);
      for (var i = 0; i < NR; i++) {
        var a = (i / NR) * Math.PI * 2, d = ((sweep - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (d < 0.28 || reduce) { var dist = cast(ox, oz, Math.cos(a), Math.sin(a)); hitx[i] = ox + Math.cos(a) * dist; hitz[i] = oz + Math.sin(a) * dist; inten[i] = dist >= 10.9 ? 0.15 : 1; if (dist < nearestNow) nearestNow = dist; }
        else inten[i] *= Math.exp(-1.5 * dt);
        var k = inten[i];
        lpos[i * 3] = hitx[i]; lpos[i * 3 + 1] = 1.0; lpos[i * 3 + 2] = hitz[i];
        lcol[i * 3] = 0.18 * k; lcol[i * 3 + 1] = 0.95 * k; lcol[i * 3 + 2] = 0.69 * k;
        llin[i * 6] = ox; llin[i * 6 + 1] = 1.0; llin[i * 6 + 2] = oz; llin[i * 6 + 3] = hitx[i]; llin[i * 6 + 4] = 1.0; llin[i * 6 + 5] = hitz[i];
        var lk = k * 0.35; llc[i * 6] = llc[i * 6 + 3] = 0.18 * lk; llc[i * 6 + 1] = llc[i * 6 + 4] = 0.95 * lk; llc[i * 6 + 2] = llc[i * 6 + 5] = 0.69 * lk;
      }
      if (nearestNow < 99) nearest = nearestNow;
      pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true; lg.attributes.position.needsUpdate = true; lg.attributes.color.needsUpdate = true;
      points.visible = lines.visible = st.scale > 0.5;
      // AprilTag detection with the side camera
      var seen = null;
      if (st.phase === "turn" || st.phase === "drive2" || st.phase === "deliver") {
        var camA = -st.th - Math.PI / 2;
        DOORS.forEach(function (d) {
          var tp2 = W(d.x - 0.04, 0.36), vx = tp2.x - P.x, vz = tp2.z - P.z, ang = Math.atan2(vz, vx), da = Math.atan2(Math.sin(ang - (st.th - Math.PI / 2)), Math.cos(ang - (st.th - Math.PI / 2)));
          if (Math.abs(da) < 0.75 && Math.hypot(vx, vz) < 5.2) seen = d.id;
        });
      }
      st.seen = seen;
      DOORS.forEach(function (d) { var o = tagObjs[d.id]; o.edge.visible = seen === d.id; if (o.edge.visible) o.edge.scale.setScalar(1 + Math.sin(t * 10) * 0.05); });
      sideLens.material.color.setHex(seen ? 0xffffff : 0x7a5cff);
      // camera director
      var sh = shot((st.phase === "drive2" && st.x > 0.56) ? "deliver" : st.phase, P, st.t), k2 = 1 - Math.exp(-(st.phase === "drive2" || st.phase === "deliver" ? 1.9 : 2.4) * dt);
      camPos.lerp(sh[0], reduce ? 1 : k2); look.lerp(sh[1], reduce ? 1 : k2);
      cam.position.copy(camPos).add(tmp.set(Math.sin(t * 0.3) * 0.5, Math.sin(t * 0.23) * 0.25, 0)); cam.lookAt(look);
      LBL.forEach(function (s) { var d = cam.position.distanceTo(s.position); s.material.opacity = Math.max(0, Math.min(1, (d - 5) / 5)); });
      // HUD
      if (hud) hud.textContent = (st.phase === "deliver" && st.pk === "done") ? "package placed inside Room B ✓" : PH[st.phase];
      if (log && (Math.floor(t * 4) % 3 === 0 || reduce)) log.textContent = '{ "id": "dormpod-1", "state": "' + st.phase + '", "lidar_nearest_m": ' + nearest.toFixed(1) + ', "apriltag": ' + (seen ? seen + (seen === TARGET ? ', "match": true' : ', "match": false') : "null") + " }  →  MQTT dormpod/1/status";
    }
    S.init();
  }

  document.addEventListener("DOMContentLoaded", function () { pod3d(); });
})();
