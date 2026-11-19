/* 3D Kindle 4 (graphite, 6" 600x800 e-ink, 16 grey levels) showing real Pokémon cards.
   Hover left to right to change cards; the screen does a slow multi-flash refresh with ghosting like real e-ink. */
(function () {
  var L3 = window.LAB3D;
  document.addEventListener("DOMContentLoaded", function () {
    var cv = document.getElementById("eink"); if (!cv || !L3) return;
    if (typeof THREE === "undefined") return L3.warn(cv);
    var reduce = L3.reduce, dots = document.querySelectorAll("#eink-dots i");
    var S = L3.stage(cv, { bg: 0x0b0e13, fov: 34, update: upd }); if (!S) return;
    var scene = S.scene, cam = S.camera; cam.position.set(0, 0.15, 9.6); cam.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    var key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(4, 6, 8); scene.add(key);
    var rim = new THREE.PointLight(0x7a5cff, 0.8, 30); rim.position.set(-6, 2, -3); scene.add(rim);

    var CW = 600, CH = 800;
    var CARDS = [
      { name: "Pikachu", url: "https://images.pokemontcg.io/base1/58_hires.png" },
      { name: "Charizard", url: "https://images.pokemontcg.io/base1/4_hires.png" },
      { name: "Squirtle", url: "https://images.pokemontcg.io/base1/63_hires.png" }
    ];
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], INK = [26, 26, 24], PAPER = [214, 213, 200];

    // Turn any image into what a 16-level e-ink panel shows: greyscale, ordered dither, warm paper white.
    function einkify(img, msg) {
      var c = document.createElement("canvas"); c.width = CW; c.height = CH; var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, CW, CH);
      if (img) {
        var h = CH - 36, w = Math.round(h * img.naturalWidth / img.naturalHeight);
        if (w > CW - 28) { w = CW - 28; h = Math.round(w * img.naturalHeight / img.naturalWidth); }
        g.drawImage(img, (CW - w) / 2, (CH - h) / 2, w, h);
      } else {
        g.fillStyle = "#333"; g.font = "bold 34px Georgia, serif"; g.textAlign = "center"; g.fillText(msg || "loading…", CW / 2, CH / 2);
      }
      var im = g.getImageData(0, 0, CW, CH), d = im.data;
      for (var y = 0; y < CH; y++) for (var x = 0; x < CW; x++) {
        var p = (y * CW + x) * 4, gray = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        gray = Math.max(0, Math.min(255, (gray - 14) * 1.1));
        var lv = Math.max(0, Math.min(15, Math.round((gray + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 17) / 17))), v = lv / 15, n = (Math.random() - 0.5) * 5;
        d[p] = INK[0] + (PAPER[0] - INK[0]) * v + n; d[p + 1] = INK[1] + (PAPER[1] - INK[1]) * v + n; d[p + 2] = INK[2] + (PAPER[2] - INK[2]) * v + n; d[p + 3] = 255;
      }
      g.putImageData(im, 0, 0); return c;
    }
    var inks = CARDS.map(function () { return einkify(null, "loading…"); });
    var scr = document.createElement("canvas"); scr.width = CW; scr.height = CH; var sg = scr.getContext("2d");
    sg.drawImage(inks[0], 0, 0);
    var tex = new THREE.CanvasTexture(scr); tex.anisotropy = 8;

    // ── the device: Kindle 4th gen (2011), 114 x 166 x 8.7 mm, graphite, 6" 600x800 screen ──
    var W = 3.42, H = 4.98, D = 0.27, dev = new THREE.Group(); scene.add(dev);
    function mat(c, r, m) { return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.5 : r, metalness: m == null ? 0.1 : m }); }
    function rrShape(w, h, r) {
      var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    }
    function plate(w, h, r, color, x, y, z, depth) {
      var g = depth ? new THREE.ExtrudeGeometry(rrShape(w, h, r), { depth: depth, bevelEnabled: false }) : new THREE.ShapeGeometry(rrShape(w, h, r));
      var m = new THREE.Mesh(g, mat(color, 0.55, 0.05)); m.position.set(x, y, z); dev.add(m); return m;
    }
    function bar(w, h, d, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, 0.6)); m.position.set(x, y, z); dev.add(m); return m; }
    // rounded-rectangle body with soft bevelled edges
    var bodyGeo = new THREE.ExtrudeGeometry(rrShape(W, H, 0.36), { depth: D - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
    bodyGeo.translate(0, 0, -(D - 0.06) / 2);
    dev.add(new THREE.Mesh(bodyGeo, mat(0x66696e, 0.42, 0.3)));
    var FZ = D / 2, SY = 0.31;                           // front face; screen centre (slim top bezel, deeper control strip below)
    plate(3.0, 3.93, 0.1, 0x3a3c40, 0, SY, FZ + 0.004);  // thin dark frame around the screen
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(2.73, 3.64), new THREE.MeshBasicMaterial({ map: tex })); screen.position.set(0, SY, FZ + 0.01); dev.add(screen);
    // "kindle" wordmark on the TOP bezel
    var wc = document.createElement("canvas"); wc.width = 256; wc.height = 64; var wg = wc.getContext("2d"); wg.fillStyle = "#b4b7bd"; wg.font = "bold 40px Georgia, serif"; wg.textAlign = "center"; wg.textBaseline = "middle"; wg.fillText("kindle", 128, 34);
    var wm = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.18), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(wc), transparent: true })); wm.position.set(0, H / 2 - 0.25, FZ + 0.008); dev.add(wm);
    // page-turn keys: thin slits on the side bezels
    [-1, 1].forEach(function (s) { bar(0.07, 0.85, 0.03, 0x45474b, s * (W / 2 - 0.17), 0.6, FZ + 0.012); bar(0.07, 0.42, 0.03, 0x45474b, s * (W / 2 - 0.17), -0.3, FZ + 0.012); });
    // single bottom row: two round buttons | rounded-square 5-way pad | two round buttons
    var BY = -2.08;
    function glyph(ch) {
      var c = document.createElement("canvas"); c.width = c.height = 128; var g = c.getContext("2d");
      g.fillStyle = "#4b4e53"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#d3d6dc"; g.font = "bold 70px 'Segoe UI Symbol', 'Segoe UI', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 64, 68);
      return new THREE.CanvasTexture(c);
    }
    function rbtn(x, ch) {
      var side = mat(0x3f4246, 0.5), cap = new THREE.MeshStandardMaterial({ map: glyph(ch), roughness: 0.55 });
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 28), [side, cap, side]); m.rotation.x = Math.PI / 2; m.position.set(x, BY, FZ + 0.02); dev.add(m);
    }
    rbtn(-0.72, "↩"); rbtn(-0.43, "⌨"); rbtn(0.43, "≡"); rbtn(0.72, "⌂");
    plate(0.6, 0.6, 0.15, 0x44474c, 0, BY, FZ + 0.004, 0.03);
    var pring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 10, 40), mat(0x2b2d31, 0.5)); pring.position.set(0, BY, FZ + 0.04); dev.add(pring);
    var pctr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), mat(0x5b5e64, 0.5)); pctr.rotation.x = Math.PI / 2; pctr.position.set(0, BY, FZ + 0.05); dev.add(pctr);
    // easel prop so it stands up
    var prop = bar(0.4, 2.7, 0.14, 0x23252a, 0, -1.0, -0.5); prop.rotation.x = 0.42;
    dev.position.y = 0.05; dev.rotation.x = -0.08;
    var glow = new THREE.Mesh(new THREE.CircleGeometry(4.3, 48), new THREE.MeshBasicMaterial({ color: 0x241a46, transparent: true, opacity: 0.55 })); glow.position.z = -1.6; scene.add(glow);

    // ── load the real cards ──
    var cur = 0, target = 0, tr = null, hovered = false, autoT = 0, px = 0.5, py = 0.5, rotY = 0, rotX = 0;
    function refreshIfIdle(i) { if (i === cur && !tr) { sg.drawImage(inks[i], 0, 0); tex.needsUpdate = true; if (reduce) S.render(); } }
    CARDS.forEach(function (c, i) {
      var im = new Image(); im.crossOrigin = "anonymous";
      im.onload = function () { try { inks[i] = einkify(im); } catch (e) { inks[i] = einkify(null, c.name + " (image blocked)"); } refreshIfIdle(i); };
      im.onerror = function () { inks[i] = einkify(null, c.name + " (offline)"); refreshIfIdle(i); };
      im.src = c.url;
    });

    function begin(to) { tr = { from: cur, to: to, t: 0 }; cur = to; dots.forEach(function (d, k) { d.className = k === to ? "on" : ""; }); }
    function setTarget(i) { target = i; if (reduce && i !== cur) { cur = i; sg.drawImage(inks[i], 0, 0); tex.needsUpdate = true; dots.forEach(function (d, k) { d.className = k === i ? "on" : ""; }); S.render(); } }
    cv.style.touchAction = "pan-y";
    function onMove(e) {
      var r = cv.getBoundingClientRect(); px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height; hovered = true; autoT = 0;
      setTarget(Math.max(0, Math.min(2, Math.floor(px * 3))));
    }
    cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerdown", onMove);
    cv.addEventListener("pointerleave", function () { px = 0.5; py = 0.5; });

    // Slow full-page refresh: black, white, black, white flashes, then the new page "develops" in steps while the old one ghosts out.
    var FL = [["#161614", 0.3], ["#d6d5c8", 0.2], ["#161614", 0.2], ["#d6d5c8", 0.2]], FLT = 0.9, DEV = 1.6;
    function upd(t, dt) {
      if (!hovered) { autoT += dt; if (autoT > 8) { autoT = 0; setTarget((cur + 1) % 3); } }
      if (!tr && target !== cur) begin(target);
      rotY += ((px - 0.5) * 0.9 - rotY) * Math.min(1, dt * 5); rotX += ((py - 0.5) * 0.3 - rotX) * Math.min(1, dt * 5);
      dev.rotation.y = rotY + Math.sin(t * 0.4) * 0.05; dev.rotation.x = -0.08 + rotX; dev.position.y = 0.05 + Math.sin(t * 0.8) * 0.06;
      if (tr) {
        tr.t += dt; var tt = tr.t;
        if (tt < FLT) {
          var acc = 0, col = FL[0][0]; for (var i = 0; i < FL.length; i++) { acc += FL[i][1]; if (tt < acc) { col = FL[i][0]; break; } }
          sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1; sg.fillStyle = col; sg.fillRect(0, 0, CW, CH);
        } else if (tt < FLT + DEV) {
          var p = (tt - FLT) / DEV, a = Math.min(1, (Math.floor(p * 6) + 1) / 6);
          sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1; sg.fillStyle = "#d6d5c8"; sg.fillRect(0, 0, CW, CH);
          sg.globalAlpha = a; sg.drawImage(inks[tr.to], 0, 0);
          sg.globalCompositeOperation = "multiply"; sg.globalAlpha = 0.3 * (1 - p); sg.drawImage(inks[tr.from], 0, 0);
          sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1;
        } else { sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1; sg.drawImage(inks[tr.to], 0, 0); tr = null; }
        tex.needsUpdate = true;
      }
    }
    S.init();
  });
})();
