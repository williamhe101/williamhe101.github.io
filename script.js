(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme ---------- */
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function label(btn) { btn.textContent = current() === "dark" ? "☀️ Light" : "🌙 Dark"; }

  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    label(btn);
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      label(btn);
    });
  }

  /* ---------- scroll progress bar ---------- */
  function initProgress() {
    var bar = document.createElement("div");
    bar.id = "progress";
    document.body.appendChild(bar);
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || reduce) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var sibs = en.target.parentNode ? Array.prototype.indexOf.call(en.target.parentNode.children, en.target) : 0;
          en.target.style.transitionDelay = Math.min(sibs % 6, 5) * 70 + "ms";
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    // safety net: never leave content hidden if the observer is slow to fire
    setTimeout(function () {
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
      });
    }, 1200);
  }

  /* ---------- rotating typed headline ---------- */
  function initTyped() {
    var el = document.getElementById("typed");
    if (!el) return;
    var words = (el.getAttribute("data-words") || "").split("|").filter(Boolean);
    if (!words.length) return;
    if (reduce) { el.textContent = words[0]; return; }
    var w = 0, i = 0, del = false;
    function tick() {
      var word = words[w];
      el.textContent = word.slice(0, i);
      var delay = del ? 35 : 75;
      if (!del && i === word.length) { del = true; delay = 1400; }
      else if (del && i === 0) { del = false; w = (w + 1) % words.length; delay = 350; }
      else { i += del ? -1 : 1; }
      setTimeout(tick, delay);
    }
    tick();
  }

  /* ---------- count-up numbers ---------- */
  function initCounters() {
    var els = document.querySelectorAll(".count");
    function fmt(el, v) {
      var dec = +el.getAttribute("data-dec") || 0;
      el.textContent = (el.getAttribute("data-prefix") || "") + v.toFixed(dec) + (el.getAttribute("data-suffix") || "");
    }
    function run(el) {
      var to = parseFloat(el.getAttribute("data-to"));
      if (reduce) { fmt(el, to); return; }
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1300, 1);
        fmt(el, to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { fmt(e, parseFloat(e.getAttribute("data-to"))); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- card spotlight + tilt ---------- */
  function initCards() {
    document.querySelectorAll(".card").forEach(function (card) {
      var tilt = card.classList.contains("tilt");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        if (tilt && !reduce && e.pointerType === "mouse") {
          card.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * 5) + "deg) rotateY(" + ((px - 0.5) * 7) + "deg) translateY(-3px)";
        }
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- project filters ---------- */
  function initFilters() {
    var btns = document.querySelectorAll(".filters button");
    if (!btns.length) return;
    var items = document.querySelectorAll(".project");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var f = b.getAttribute("data-filter");
        items.forEach(function (it) {
          var show = f === "all" || (it.getAttribute("data-cat") || "").split(" ").indexOf(f) !== -1;
          it.classList.toggle("hide", !show);
          if (show) { it.classList.remove("pop"); void it.offsetWidth; it.classList.add("pop"); }
        });
      });
    });
  }

  /* ---------- timeline: expand all ---------- */
  function initExpand() {
    var btn = document.getElementById("expand-all");
    if (!btn) return;
    var open = false;
    btn.addEventListener("click", function () {
      open = !open;
      document.querySelectorAll(".t-item details").forEach(function (d) { d.open = open; });
      btn.textContent = open ? "Collapse all" : "Expand all";
    });
  }

  /* ---------- wave emoji ---------- */
  function initWave() {
    var w = document.querySelector(".wave");
    if (!w) return;
    w.addEventListener("click", function () {
      w.classList.remove("go"); void w.offsetWidth; w.classList.add("go");
      confetti(w);
    });
  }

  /* ---------- confetti burst of emoji ---------- */
  function confetti(from) {
    if (reduce || !from.animate) return;
    var r = from.getBoundingClientRect();
    var bits = ["⚡", "📡", "🏓", "📚", "🎮", "🧠", "✨", "🔧"];
    for (var i = 0; i < 22; i++) {
      var s = document.createElement("span");
      s.textContent = bits[i % bits.length];
      s.style.cssText = "position:fixed;z-index:60;pointer-events:none;font-size:" + (16 + Math.random() * 14) + "px;left:" + (r.left + r.width / 2) + "px;top:" + (r.top + r.height / 2) + "px";
      document.body.appendChild(s);
      var ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 60;
      var a = s.animate([
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + dx + "px," + (dy + 140) + "px) rotate(" + (Math.random() * 540 - 270) + "deg)", opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(s);
    }
  }

  /* ---------- hidden easter egg: Konami code → rainbow scope ---------- */
  function initKonami() {
    var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    var pos = 0;
    document.addEventListener("keydown", function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) {
        pos = 0;
        window.__rainbow = !window.__rainbow;
        var w = document.querySelector(".wave");
        if (w) confetti(w);
      }
    });
  }

  /* ---------- live eye diagram ---------- */
  function initScope() {
    var cv = document.getElementById("eye");
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var mode = "nrz", noise = 0.22, target = 0.22;
    var W = 0, H = 0, frames = 0, running = false, visible = true;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var readOpen = document.getElementById("eye-open");
    var readBer = document.getElementById("eye-ber");
    var readMode = document.getElementById("eye-mode");

    function resize() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#06101a";
      ctx.fillRect(0, 0, W, H);
    }
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.3; }
    function levels() { return mode === "pam4" ? [-1, -1 / 3, 1 / 3, 1] : [-1, 1]; }
    function pick(L) { return L[Math.floor(Math.random() * L.length)]; }
    function S(z) { return 0.5 * (1 + Math.tanh(z)); }

    function trace() {
      var L = levels(), a = pick(L), b = pick(L), c = pick(L);
      var vo = gauss() * noise * 0.3, jit = gauss() * noise * 0.04;
      var amp = H * 0.36, cy = H / 2;
      ctx.beginPath();
      for (var x = 0; x <= W; x += 3) {
        var u = x / W;
        var v = a + (b - a) * S((u - 0.25 - jit) / 0.09) + (c - b) * S((u - 0.75 - jit) / 0.09);
        var y = cy - (v + vo) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    function readout() {
      var k = mode === "pam4" ? 2.4 : 1.3;
      var open = Math.max(0, Math.min(100, Math.round(100 * (1 - noise * k))));
      var ber = open > 70 ? "&lt; 1e-12 ✅" : open > 40 ? "~ 1e-9 🙂" : open > 15 ? "~ 1e-5 😬" : "link down 💀";
      if (readOpen) readOpen.textContent = open + "%";
      if (readBer) readBer.innerHTML = ber;
      if (readMode) readMode.textContent = mode === "pam4" ? "PAM4 · 64 GT/s" : "NRZ · 32 GT/s";
    }
    function frame() {
      if (!running) return;
      noise += (target - noise) * 0.08;
      ctx.fillStyle = "rgba(6,16,26,0.17)";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1.4;
      for (var i = 0; i < 7; i++) {
        ctx.strokeStyle = window.__rainbow ? "hsla(" + Math.floor(Math.random() * 360) + ",90%,65%,0.6)" : "rgba(46,242,176,0.55)";
        trace();
      }
      if (++frames % 8 === 0) readout();
      requestAnimationFrame(frame);
    }
    function start() { if (!running && visible && !reduce) { running = true; requestAnimationFrame(frame); } }
    function stop() { running = false; }

    resize();
    readout();
    if (reduce) {
      ctx.strokeStyle = "rgba(46,242,176,0.5)";
      ctx.lineWidth = 1.4;
      for (var i = 0; i < 80; i++) trace();
    }
    window.addEventListener("resize", function () { resize(); });

    function setX(clientX) {
      var r = cv.getBoundingClientRect();
      target = 0.04 + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 0.7;
      if (reduce) { ctx.fillStyle = "#06101a"; ctx.fillRect(0, 0, W, H); for (var j = 0; j < 80; j++) trace(); readout(); }
    }
    cv.addEventListener("mousemove", function (e) { setX(e.clientX); });
    cv.addEventListener("touchmove", function (e) { if (e.touches[0]) setX(e.touches[0].clientX); }, { passive: true });
    cv.addEventListener("mouseleave", function () { target = 0.22; });

    document.querySelectorAll(".scope-bar .mode button").forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-mode");
        document.querySelectorAll(".scope-bar .mode button").forEach(function (x) { x.classList.toggle("on", x === b); });
        ctx.fillStyle = "#06101a"; ctx.fillRect(0, 0, W, H);
        readout();
        ctx.strokeStyle = "rgba(46,242,176,0.5)";
        ctx.lineWidth = 1.4;
        for (var j = 0; j < (reduce ? 80 : 40); j++) trace();
      });
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(cv);
    }
    start();
  }

  /* ---------- scroll-driven 3D point cloud story ---------- */
  function initCloud() {
    var sec = document.getElementById("story");
    if (!sec) return;
    var pin = sec.querySelector(".story-pin"), cv = sec.querySelector("canvas"), ctx = cv.getContext("2d");
    var ui = { idx: document.getElementById("story-idx"), num: document.getElementById("story-num"), unit: document.getElementById("story-unit"), tag: document.getElementById("story-tag"), text: document.getElementById("story-text"), bar: document.getElementById("story-bar"), box: document.getElementById("story-copy") };
    var STAGES = [
      { tag: "MURATA", num: "2021", unit: "RF hardware · IoT", text: "Where it started: Bluetooth and LTE IoT modules, battery QA, a smart mirror, and a lot of RF to learn." },
      { tag: "DELL", num: "2022", unit: "server hardware", text: "Server hardware intern: an RS232 port in no extra rack space, and a 1st place hackathon win." },
      { tag: "AMD", num: "64", unit: "GT/s PAM4 · PCIe Gen6", text: "Signal integrity on EPYC server platforms: connectors, via transitions, and a design guide teams could follow." },
      { tag: "APPLE", num: "2026", unit: "MacBook signal integrity", text: "Now: high-speed I/O, memory and flex layouts for Mac, keeping USB4, PCIe and DisplayPort links happy." }
    ];
    var N = 1600, shapes = [], i, k;
    function hash(n) { return (n * 0.6180339887) % 1; }
    for (k = 0; k < 4; k++) shapes.push(new Float32Array(N * 3));
    for (i = 0; i < N; i++) {
      var o = i * 3, h1 = hash(i + 1), h2 = hash(i * 7 + 3);
      // 0 MURATA: radio waves, three nested half-shells radiating from an antenna mast
      if (i < 90) {
        shapes[0][o] = 0; shapes[0][o + 1] = -0.55 + (i / 90) * 0.5; shapes[0][o + 2] = 0;
      } else {
        var rad = 0.38 + (i % 3) * 0.28, ang = h1 * Math.PI * 2, el = Math.acos(1 - h2);
        shapes[0][o] = Math.sin(el) * Math.cos(ang) * rad; shapes[0][o + 1] = Math.cos(el) * rad - 0.5; shapes[0][o + 2] = Math.sin(el) * Math.sin(ang) * rad;
      }
      // 1 DELL: a rack of six server trays
      var tray = i % 6, ti = Math.floor(i / 6), tgx = ti % 16, tgz = Math.floor(ti / 16);
      shapes[1][o] = (tgx / 15 - 0.5) * 1.5; shapes[1][o + 1] = (tray / 5 - 0.5) * 1.3; shapes[1][o + 2] = (tgz / 16 - 0.5) * 0.9;
      // 2 AMD: flat ball-grid package with a raised die in the middle
      var gx = i % 40, gy = Math.floor(i / 40), x = (gx / 39 - 0.5) * 2, z = (gy / 39 - 0.5) * 2;
      var onDie = Math.abs(x) < 0.3 && Math.abs(z) < 0.3;
      shapes[2][o] = x * 0.95; shapes[2][o + 1] = onDie ? 0.12 : -0.02; shapes[2][o + 2] = z * 0.95;
      // 3 APPLE: an open laptop, base plus tilted screen
      var lj = i % (N / 2), lgx = lj % 32, lgy = Math.floor(lj / 32), lx = (lgx / 31 - 0.5) * 1.7;
      if (i < N / 2) { shapes[3][o] = lx; shapes[3][o + 1] = -0.35; shapes[3][o + 2] = -0.2 + (lgy / 24) * 0.9; }
      else { shapes[3][o] = lx; shapes[3][o + 1] = -0.35 + (lgy / 24) * 0.95 * Math.cos(0.35); shapes[3][o + 2] = -0.2 - (lgy / 24) * 0.95 * Math.sin(0.35); }
    }
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), running = false, visible = true;
    var rx = 0.5, ry = 0, mx = 0, my = 0, tmx = 0, tmy = 0, shown = -1, frames = 0, col = [31, 26, 23], acc = [255, 90, 54];
    function rgb(v) {
      v = (v || "").trim();
      if (v.charAt(0) === "#") { if (v.length === 4) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]; return [parseInt(v.substr(1, 2), 16), parseInt(v.substr(3, 2), 16), parseInt(v.substr(5, 2), 16)]; }
      var m = v.match(/\d+/g); return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
    }
    function colors() { var cs = getComputedStyle(document.documentElement); col = rgb(cs.getPropertyValue("--text")); acc = rgb(cs.getPropertyValue("--accent")); }
    function resize() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function ss(t) { return t * t * (3 - 2 * t); }
    function setStage(n) {
      if (n === shown) return; shown = n;
      var s = STAGES[n];
      ui.box.style.opacity = 0;
      setTimeout(function () {
        ui.idx.textContent = "0" + (n + 1) + " / 04"; ui.num.textContent = s.num; ui.unit.textContent = s.unit; ui.tag.textContent = "[ " + s.tag + " ]"; ui.text.textContent = s.text; ui.box.style.opacity = 1;
      }, reduce ? 0 : 180);
    }
    function frame(ts) {
      if (!running) return;
      var r = sec.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (72 - r.top) / Math.max(1, r.height - pin.offsetHeight)));
      var s = p * 3, a = Math.min(2, Math.floor(s)), f = ss(Math.max(0, Math.min(1, (s - a - 0.25) / 0.5)));
      setStage(Math.round(s));
      ui.bar.style.width = (p * 100) + "%";
      mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
      var t = ts / 1000;
      ry = (reduce ? 0.4 : t * 0.22) + mx * 1.6; rx = 0.55 + my * 0.9;
      var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      if (++frames % 20 === 1) colors();
      ctx.clearRect(0, 0, W, H);
      var narrow = W < 640;
      var scale = Math.min(W, H) * (narrow ? 0.3 : 0.3), ox = narrow ? W * 0.5 : W * 0.68, oy = narrow ? H * 0.64 : H * 0.5, A = shapes[a], B = shapes[a + 1];
      for (var n = 0; n < N; n++) {
        var o = n * 3, fi = Math.max(0, Math.min(1, f * 1.5 - hash(n) * 0.5)), e = ss(fi);
        var x = A[o] + (B[o] - A[o]) * e, y = A[o + 1] + (B[o + 1] - A[o + 1]) * e, z = A[o + 2] + (B[o + 2] - A[o + 2]) * e;
        y += Math.sin(t * 1.6 + x * 4) * 0.015;
        var x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
        var pf = 3 / (3 + z2), px = ox + x1 * scale * pf, py = oy + y1 * scale * pf;
        var d = 0.25 + 0.6 * (1 - (z2 + 1) / 2), sz = 1 + pf * 1.6;
        var hi = n % 17 === 0, c = hi ? acc : col;
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (hi ? 0.95 : d).toFixed(2) + ")";
        ctx.fillRect(px, py, sz, sz);
      }
      requestAnimationFrame(frame);
    }
    function start() { if (!running && visible) { running = true; requestAnimationFrame(frame); } }
    pin.addEventListener("pointermove", function (e) {
      var r = pin.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5;
    });
    pin.addEventListener("pointerleave", function () { tmx = 0; tmy = 0; });
    window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); else running = false; }, { rootMargin: "200px" }).observe(sec);
    }
    resize(); colors(); setStage(0); start();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initCloud();
    initProgress();
    initReveal();
    initTyped();
    initCounters();
    initCards();
    initFilters();
    initExpand();
    initWave();
    initKonami();
    initScope();
  });
})();
