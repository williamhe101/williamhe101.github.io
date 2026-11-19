/* 3D PCB trace with a via stub, modelled with transmission-line rules (lossless, one stub round trip):
   - At the stub junction a bit sees the main line in parallel with the stub, so the junction reflects an INVERTED copy (Γ = -1/3)
     and passes 2/3 of the bit on.  The stub itself carries 2/3 of the bit to its open end, reflects it (Γ = +1) and sends it back
     after a round trip; at the junction that wave splits (T = 2/3 each way) into a positive, delayed copy of 4/9 toward Rx and toward Tx.
   - The Tx is not perfectly matched (Γs = 0.5), so reflections heading back bounce again and arrive at Rx as echoes.
   - Waves travelling in opposite directions pass straight through each other (linear superposition). */
(function () {
  var L3 = window.LAB3D;
  document.addEventListener("DOMContentLoaded", function () {
    var cv = document.getElementById("trace"); if (!cv || !L3) return;
    if (typeof THREE === "undefined") return L3.warn(cv);
    var reduce = L3.reduce, label = L3.label;
    var S = L3.stage(cv, { update: upd }); if (!S) return;
    var scene = S.scene, cam = S.camera, btn = document.getElementById("trace-stub"), stub = false;
    cam.position.set(0, 9, 12.5); cam.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(5, 10, 6); scene.add(dl);
    var root = new THREE.Group(); scene.add(root);
    var board = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 10), new THREE.MeshLambertMaterial({ color: 0x0f3d31, transparent: true, opacity: 0.85 }));
    board.position.y = -0.25; root.add(board);
    var gh = new THREE.GridHelper(16, 16, 0x1f6f58, 0x15503f); gh.position.y = 0.01; gh.scale.z = 0.6; root.add(gh);
    var pts = [[-7, 0.5], [-3, 0.5], [-1.6, -2.6], [1.6, -2.6], [3, 2.2], [7, 2.2]].map(function (p) { return new THREE.Vector3(p[0], 0.18, p[1]); });
    var path = new THREE.CurvePath();
    for (var i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    var L = path.getLength();
    root.add(new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.14, 10, false), new THREE.MeshStandardMaterial({ color: 0xe0a14a, metalness: 0.6, roughness: 0.35 })));
    [pts[0], pts[pts.length - 1]].forEach(function (p) {
      var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 28), new THREE.MeshStandardMaterial({ color: 0xe0a14a, metalness: 0.6, roughness: 0.35 })); pad.position.set(p.x, 0.06, p.z); root.add(pad);
    });
    var tx = label("Tx (source, not perfectly matched)", "#2ef2b0", 0.7); tx.position.set(pts[0].x + 1.2, 1.5, pts[0].z); root.add(tx);
    var rx = label("Rx (receiver, terminated)", "#2ef2b0", 0.7); rx.position.set(pts[pts.length - 1].x - 0.4, 1.5, pts[pts.length - 1].z); root.add(rx);

    // via stub: a piece of open-ended line hanging off the trace
    var stubU = 0.62, LS = 1.6, sp = path.getPointAt(stubU), stubG = new THREE.Group(); stubG.position.set(sp.x, 0, sp.z); stubG.visible = false; root.add(stubG);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 32), new THREE.MeshBasicMaterial({ color: 0xff7a59 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; stubG.add(ring);
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, LS, 14), new THREE.MeshBasicMaterial({ color: 0xff7a59, transparent: true, opacity: 0.8 })); barrel.position.y = -LS / 2 + 0.2; stubG.add(barrel);
    var stubLbl = label("via stub (open-ended line)", "#ff7a59", 0.7); stubLbl.position.set(0, 1.9, 0); stubG.add(stubLbl);

    var COL = { pos: 0x2ef2b0, neg: 0x6ea8ff, echo: 0xffc14d, back: 0xff7a59 };
    var GJ = -1 / 3, TJ = 2 / 3, GTX = 0.5, THRESH = 0.045;
    var geo = new THREE.SphereGeometry(1, 14, 14), pulses = [], stubWaves = [], ripples = [], rxEv = [], now = 0, spawn = 1.4, speed = L / 3.4;
    var flashes = [];
    for (var f = 0; f < 4; f++) { var fm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); fm.visible = false; root.add(fm); flashes.push(fm); }
    function colorFor(p) { return p.a < 0 ? COL.neg : (p.kind === "main" ? COL.pos : (p.dir === 1 ? COL.echo : COL.back)); }
    function mk(color) {
      var g = new THREE.Group(), arr = [];
      for (var k = 0; k < 9; k++) { var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 })); g.add(m); arr.push(m); }
      root.add(g); return { g: g, m: arr };
    }
    function addPulse(s, dir, a, kind) { var p = { s: s, dir: dir, a: a, kind: kind }; p.v = mk(colorFor(p)); pulses.push(p); return p; }
    function clearAll() { pulses.forEach(function (p) { root.remove(p.v.g); }); stubWaves.forEach(function (w) { stubG.remove(w.m); }); pulses = []; stubWaves = []; rxEv = []; }
    function ripple(x, z) {
      var m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0xff7a59, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); root.add(m); ripples.push({ m: m, t: 0 });
    }
    btn.addEventListener("click", function () {
      stub = !stub; stubG.visible = stub; clearAll(); spawn = 1.4;
      btn.textContent = stub ? "Remove the via stub" : "Add a via stub"; btn.classList.toggle("on", stub);
      if (reduce) seedStatic();
    });

    // ── receiver scope (2D), now with negative (inverted) excursions ──
    var rs = document.getElementById("rxscope"), rg = rs && rs.getContext("2d"), RW = 0, RH = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function sizeScope() { if (!rs) return; var r = rs.getBoundingClientRect(); RW = r.width; RH = r.height; rs.width = Math.round(RW * dpr); rs.height = Math.round(RH * dpr); rg.setTransform(dpr, 0, 0, dpr, 0, 0); }
    sizeScope(); window.addEventListener("resize", sizeScope);
    var WINDOW = 9, NAMES = { main: "bit", tail: "stub copy", echo: "echo" };
    function drawScope() {
      if (!rg) return;
      rg.fillStyle = "#06101a"; rg.fillRect(0, 0, RW, RH);
      rg.strokeStyle = "rgba(46,242,176,0.1)"; rg.lineWidth = 1; rg.beginPath();
      for (var x = 0; x <= RW; x += RW / 9) { rg.moveTo(x, 0); rg.lineTo(x, RH); }
      for (var y = 0; y <= RH; y += RH / 4) { rg.moveTo(0, y); rg.lineTo(RW, y); }
      rg.stroke();
      var base = RH * 0.68, scale = RH * 0.5, pps = RW / WINDOW;
      rg.strokeStyle = "rgba(255,255,255,0.18)"; rg.beginPath(); rg.moveTo(0, base); rg.lineTo(RW, base); rg.stroke();
      rg.beginPath();
      for (var px = 0; px <= RW; px += 2) {
        var tt = now - (RW - px) / pps, v = 0;
        for (var i = 0; i < rxEv.length; i++) { var d = (tt - rxEv[i].t) / 0.14; v += rxEv[i].a * Math.exp(-d * d); }
        var yy = base - Math.max(-0.55, Math.min(1.2, v)) * scale;
        px === 0 ? rg.moveTo(px, yy) : rg.lineTo(px, yy);
      }
      rg.strokeStyle = "#2ef2b0"; rg.lineWidth = 2.5; rg.stroke();
      rg.font = "11px JetBrains Mono, monospace";
      rxEv.forEach(function (e) {
        var px2 = RW - (now - e.t) * pps; if (px2 < -10 || px2 > RW + 10) return;
        var c = e.a < 0 ? "#6ea8ff" : (e.kind === "main" ? "#2ef2b0" : "#ffc14d"), py = base - Math.max(-0.55, Math.min(1.2, e.a)) * scale;
        rg.fillStyle = c; rg.beginPath(); rg.arc(px2, py + (e.a < 0 ? 6 : -6), 4, 0, 7); rg.fill();
        if (Math.abs(e.a) >= 0.25) rg.fillText(NAMES[e.kind], px2 - 14, py + (e.a < 0 ? 20 : -14));   // label only the big ones; colour tells the rest
      });
      rg.fillStyle = "rgba(191,247,227,0.8)"; rg.fillText("what the receiver sees (voltage vs. time)", 10, 16);
    }

    // drag to orbit
    var rotY = 0, rotX = 0, drag = false, lx = 0, ly = 0, idle = 0;
    cv.style.touchAction = "pan-y"; cv.style.cursor = "grab";
    cv.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; ly = e.clientY; cv.style.cursor = "grabbing"; });
    window.addEventListener("pointerup", function () { drag = false; cv.style.cursor = "grab"; });
    cv.addEventListener("pointermove", function (e) {
      if (!drag) return; rotY += (e.clientX - lx) * 0.008; rotX = Math.max(-0.25, Math.min(0.5, rotX + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; idle = 0;
      if (reduce) { root.rotation.set(rotX, rotY, 0); S.render(); }
    });

    function seedStatic() {
      clearAll(); now = 6;
      addPulse(L * 0.45, 1, stub ? TJ : 1, "main");
      if (stub) { addPulse(L * stubU - 1.5, -1, GJ, "refl"); addPulse(L * 0.8, 1, 0.22, "echo"); rxEv.push({ t: 2.2, a: TJ, kind: "main" }, { t: 2.9, a: 0.444, kind: "tail" }, { t: 4.4, a: -0.11, kind: "echo" }); }
      else rxEv.push({ t: 4.2, a: 1, kind: "main" });
    }
    function place() {
      pulses.forEach(function (p) {
        var aa = Math.min(1, Math.abs(p.a));
        for (var k = 0; k < 9; k++) {
          var u = Math.max(0, Math.min(1, (p.s - p.dir * k * 0.3) / L)), q = path.getPointAt(u), m = p.v.m[k];
          m.position.set(q.x, 0.5, q.z); m.scale.setScalar((0.36 - k * 0.028) * (0.5 + 0.5 * aa)); m.material.opacity = Math.min(1, 0.35 + aa) * (1 - k / 9);
        }
      });
    }
    function upd(t, dt) {
      now = reduce ? now : t; idle += dt;
      root.rotation.y = rotY + (idle > 3 ? Math.sin(t * 0.25) * 0.28 : 0); root.rotation.x = rotX;
      if (reduce) { if (!pulses.length) seedStatic(); place(); drawScope(); return; }
      spawn += dt; if (spawn > 2.6) { spawn = 0; addPulse(0, 1, 1, "main"); }
      var stubS = L * stubU, later = [], tStub = LS / speed;
      pulses.forEach(function (p) {
        var prev = p.s; p.s += p.dir * speed * dt;
        if (stub && p.dir === 1 && prev < stubS && p.s >= stubS) {        // forward wave reaches the stub junction
          var a = p.a; ripple(sp.x, sp.z);
          if (Math.abs(a * GJ) > THRESH) later.push([stubS, -1, a * GJ, "refl"]);            // inverted reflection heads back toward Tx
          p.a = a * TJ;                                                                      // 2/3 continues toward Rx
          var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: a < 0 ? COL.neg : 0xffffff, transparent: true, opacity: 0.9 })); m.scale.setScalar(0.22); stubG.add(m);
          stubWaves.push({ t: 0, a: a * TJ, m: m });                                          // 2/3 runs down the stub
        }
      });
      stubWaves = stubWaves.filter(function (w) {                           // wave runs to the open end and back (round trip = 2·LS / v)
        w.t += dt;
        var half = tStub, y = w.t < half ? 0.2 - (w.t / half) * LS : 0.2 - LS + ((w.t - half) / half) * LS;
        w.m.position.set(0, y, 0);
        if (w.t >= 2 * half) {                                              // back at the junction: splits to both directions (T = 2/3 each)
          var out = w.a * TJ; if (Math.abs(out) > THRESH) { later.push([stubS, 1, out, "tail"]); later.push([stubS, -1, out, "refl"]); }
          stubG.remove(w.m); return false;
        }
        return true;
      });
      pulses = pulses.filter(function (p) {
        if (p.dir === 1 && p.s >= L) { rxEv.push({ t: now, a: p.a, kind: p.kind }); root.remove(p.v.g); return false; }
        if (p.dir === -1 && p.s <= 0) {                                    // reaches the mismatched Tx and bounces again
          var ea = p.a * GTX; if (Math.abs(ea) > THRESH) later.push([0, 1, ea, "echo"]); root.remove(p.v.g); return false;
        }
        return true;
      });
      later.forEach(function (l) { addPulse(l[0], l[1], l[2], l[3]); });
      rxEv = rxEv.filter(function (e) { return now - e.t < WINDOW + 1; });
      flashes.forEach(function (fm) { fm.visible = false; });
      var fi = 0;
      pulses.forEach(function (a) { if (a.dir !== 1) return; pulses.forEach(function (b) {
        if (b.dir !== -1 || fi >= flashes.length || Math.abs(a.s - b.s) > 0.55) return;
        var q = path.getPointAt(Math.max(0, Math.min(1, (a.s + b.s) / 2 / L))), fm = flashes[fi++];
        fm.visible = true; fm.position.set(q.x, 0.5, q.z); fm.scale.setScalar(0.3 + (Math.abs(a.a) + Math.abs(b.a)) * 0.35);
      }); });
      place();
      ripples = ripples.filter(function (r) {
        r.t += dt; r.m.scale.setScalar(1 + r.t * 5); r.m.material.opacity = Math.max(0, 0.9 - r.t * 0.9);
        if (r.t > 1) { root.remove(r.m); return false; } return true;
      });
      ring.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
      drawScope();
    }
    S.init();
    if (reduce) { seedStatic(); place(); drawScope(); S.render(); }
  });
})();
