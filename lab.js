(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BG = "#06101a", GREEN = "#2ef2b0", COPPER = "#e0a14a", CORAL = "#ff7a59", VIOLET = "#9d7bff";
  function $(id) { return document.getElementById(id); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.3; }
  function S(z) { return 0.5 * (1 + Math.tanh(z)); }

  /* Shared canvas helper: sizing, DPR, visibility-gated animation loop. */
  function kit(cv, draw, opts) {
    opts = opts || {};
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, running = false, visible = true, last = 0;
    var api = {
      redraw: function () {
        if (opts.animate && !reduce) return;
        var n = opts.staticFrames || 1;
        for (var i = 0; i < n; i++) draw(ctx, W, H, performance.now() / 1000, 0.016);
      }
    };
    function resize() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      api.redraw();
    }
    function frame(ts) {
      if (!running) return;
      var dt = Math.min((ts - last) / 1000, 0.05); last = ts;
      draw(ctx, W, H, ts / 1000, dt);
      requestAnimationFrame(frame);
    }
    function start() { if (opts.animate && !reduce && !running && visible) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
    window.addEventListener("resize", resize);
    if (opts.animate && "IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); else running = false; }).observe(cv);
    }
    resize(); start();
    return api;
  }
  function clear(ctx, W, H) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
  function grid(ctx, W, H) {
    ctx.strokeStyle = "rgba(46,242,176,0.08)"; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = 0; x <= W; x += W / 10) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (var y = 0; y <= H; y += H / 6) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  /* 2 ─ Equalization opens a closed eye (rainbow) ────────────────────── */
  function demoEq() {
    var cv = $("eq"); if (!cv) return;
    var ids = ["eq-ctle", "eq-ffe", "eq-dfe"], out = $("eq-out"), isi = 0.92, frames = 0;
    function target() { return 0.92 * ($("eq-ctle").checked ? 0.62 : 1) * ($("eq-ffe").checked ? 0.6 : 1) * ($("eq-dfe").checked ? 0.5 : 1); }
    function trace(ctx, W, H) {
      var L = [-1, 1], a = L[Math.floor(Math.random() * 2)], b = L[Math.floor(Math.random() * 2)], c = L[Math.floor(Math.random() * 2)];
      var r = 0.07 + isi * 0.13, vo = gauss() * isi * 0.22, jit = gauss() * isi * 0.035, amp = H * 0.36 * (1 - 0.35 * isi), cy = H / 2;
      ctx.strokeStyle = "hsla(" + Math.floor(Math.random() * 360) + ",92%,64%,0.62)";
      ctx.beginPath();
      for (var x = 0; x <= W; x += 3) {
        var u = x / W, v = a + (b - a) * S((u - 0.25 - jit) / r) + (c - b) * S((u - 0.75 - jit) / r);
        var y = cy - (v + vo + (a + c) * isi * 0.12) * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    var api = kit(cv, function (ctx, W, H) {
      isi += (target() - isi) * (reduce ? 1 : 0.06);
      ctx.fillStyle = "rgba(6,16,26,0.17)"; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1.5;
      for (var i = 0; i < 8; i++) trace(ctx, W, H);
      if (++frames % 6 === 0 || reduce) {
        var open = Math.max(0, Math.round(100 * (1 - isi)));
        out.innerHTML = "Eye opening: <b>" + open + "%</b> " + (open > 60 ? "✅ link is happy" : open > 25 ? "😬 marginal" : "💀 eye is closed");
      }
    }, { animate: true, staticFrames: 80 });
    out.innerHTML = "Eye opening: <b>8%</b> 💀 eye is closed";
    ids.forEach(function (id) { $(id).addEventListener("change", function () { if (reduce) { isi = target(); api.redraw(); } }); });
  }

  /* 3 ─ Crosstalk: waveforms + cross-section ─────────────────────────── */
  function demoXtalk() {
    var cv = $("xtalk"), xs = $("xsec"); if (!cv) return;
    var sl = $("xt-sp"), out = $("xt-out");
    function k(s) { return 0.35 / Math.pow(s, 1.8); }
    var a1 = kit(cv, function (ctx, W, H, t) {
      clear(ctx, W, H); grid(ctx, W, H);
      var s = +sl.value, c = k(s), period = W / 4, off = (t * 70) % (period * 2), y1 = H * 0.3, y2 = H * 0.78, amp = H * 0.16;
      ctx.beginPath();
      var edges = [];
      for (var n = -2; n < 8; n++) {
        var x0 = n * period - off, hi = (n % 2 + 2) % 2 === 0;
        ctx.lineTo(x0, hi ? y1 + amp : y1 - amp); ctx.lineTo(x0, hi ? y1 - amp : y1 + amp);
        edges.push([x0, hi ? 1 : -1]);
      }
      ctx.strokeStyle = GREEN; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath();
      for (var x = 0; x <= W; x += 2) {
        var v = 0;
        edges.forEach(function (e) { var d = (x - e[0]) / 10; v += e[1] * Math.exp(-d * d); });
        var yy = y2 - v * c * H * 0.9 + (reduce ? 0 : gauss() * 0.4);
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = CORAL; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(191,247,227,0.8)"; ctx.font = "12px JetBrains Mono, monospace";
      ctx.fillText("aggressor", 10, y1 - amp - 8); ctx.fillText("victim (quiet trace)", 10, y2 - H * 0.2);
      out.innerHTML = "Spacing: <b>" + s.toFixed(1) + "× trace width</b> · coupled noise ≈ <b>" + Math.round(c * 100) + "%</b> of the swing " + (c < 0.06 ? "✅" : c < 0.15 ? "😬" : "💀");
    }, { animate: true });
    var a2 = xs && kit(xs, function (ctx, W, H, t) {
      clear(ctx, W, H);
      var s = +sl.value, c = k(s), tw = Math.min(46, W / 9), th = 26, gap = s * tw, cx = W / 2, g = H - 34, yT = g - 74 - th;
      var x1 = cx - gap / 2 - tw, x2 = cx + gap / 2;
      ctx.fillStyle = "rgba(157,123,255,0.12)"; ctx.fillRect(0, yT + th, W, g - yT - th);
      ctx.fillStyle = "rgba(224,161,74,0.9)"; ctx.fillRect(0, g, W, 10);
      var fld = $("xt-field");
      if (fld && fld.checked) {   // full field: rings of magnetic field spreading out from the aggressor
        var ax = x1 + tw / 2, ay = yT + th / 2, rmax = Math.min(W * 0.42, gap + tw * 3.2);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, g); ctx.clip(); ctx.setLineDash([]); ctx.lineWidth = 1.6;
        for (var rk = 0; rk < 7; rk++) {
          var ph = reduce ? rk / 7 : ((t * 0.45 + rk / 7) % 1), rr = tw * 0.75 + ph * rmax, al = (1 - ph) * (0.28 + c * 1.2);
          ctx.strokeStyle = "rgba(157,123,255," + Math.min(0.85, al) + ")"; ctx.beginPath(); ctx.arc(ax, ay, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "rgba(190,170,255,0.9)"; ctx.font = "11px JetBrains Mono, monospace"; ctx.fillText("field rings spread out from the aggressor", 10, 20);
      }
      ctx.lineWidth = 1.3; ctx.setLineDash([4, 5]); ctx.lineDashOffset = reduce ? 0 : -t * 22;
      ctx.strokeStyle = "rgba(46,242,176,0.4)";
      [x1, x2].forEach(function (bx) { for (var i = 0; i < 5; i++) { var xx = bx + tw * (i / 4); ctx.beginPath(); ctx.moveTo(xx, yT + th); ctx.lineTo(xx, g); ctx.stroke(); } });
      var n = Math.max(1, Math.round(c * 44));
      ctx.strokeStyle = "rgba(255,122,89," + Math.min(0.95, 0.3 + c * 1.4) + ")"; ctx.lineWidth = 1.6 + c * 2;
      ctx.lineDashOffset = reduce ? 0 : t * 30;
      for (var i = 0; i < n; i++) {
        var u = (i + 0.5) / n, ya = yT + th * u, bulge = 6 + gap * 0.18 * (1 - u) + th * 0.6 * u;
        ctx.beginPath(); ctx.moveTo(x1 + tw, ya); ctx.quadraticCurveTo(cx, ya - bulge, x2, ya); ctx.stroke();
      }
      ctx.setLineDash([]);
      [[x1, GREEN, "aggressor"], [x2, CORAL, "victim"]].forEach(function (tr) {
        ctx.fillStyle = COPPER; ctx.fillRect(tr[0], yT, tw, th);
        ctx.strokeStyle = tr[1]; ctx.lineWidth = 3;
        if (tr[2] === "victim") { ctx.shadowColor = CORAL; ctx.shadowBlur = 4 + c * 70; }
        ctx.strokeRect(tr[0], yT, tw, th); ctx.shadowBlur = 0;
        ctx.fillStyle = tr[1]; ctx.font = "12px JetBrains Mono, monospace"; ctx.fillText(tr[2], tr[0] - 2, yT - 10);
      });
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(x1 + tw, yT + th + 14); ctx.lineTo(x2, yT + th + 14); ctx.moveTo(x1 + tw, yT + th + 9); ctx.lineTo(x1 + tw, yT + th + 19); ctx.moveTo(x2, yT + th + 9); ctx.lineTo(x2, yT + th + 19); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText("gap " + s.toFixed(1) + "×", cx - 28, yT + th + 32);
      ctx.fillStyle = "rgba(191,247,227,0.75)"; ctx.fillText("ground plane", 10, g + 24 > H ? g - 4 : g + 24);
      ctx.fillStyle = CORAL; ctx.fillText(n + " coupling lines → noise", W - 190, 20);
    }, { animate: true });
    sl.addEventListener("input", function () { a1.redraw(); if (a2) a2.redraw(); });
    if ($("xt-field")) $("xt-field").addEventListener("change", function () { if (a2) a2.redraw(); });
  }

  /* 5 ─ Smart mirror: power on, compliment first, then the modules ───── */
  function demoMirror() {
    var m = $("mirror"), btn = $("mirror-toggle"); if (!m) return;
    var tEl = $("mirror-time"), dEl = $("mirror-date"), cEl = $("mirror-news"), sEl = $("mirror-scene");
    var tl = m.querySelector(".m-tl"), tr = m.querySelector(".m-tr"), bot = m.querySelector(".m-bottom");
    function greet() { var h = new Date().getHours(); return (h < 5 ? "Still up? Respect" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + ", William."; }
    var compliments = [
      greet(),
      "Hey, good-looking. Yes, you.",
      "You look like someone who returns the shopping cart.",
      "Main character energy, confirmed.",
      "Looking like a million bucks, tax included.",
      "That smile should come with a warning label.",
      "Today's forecast: you, thriving.",
      "Honestly? The room just got better."
    ];
    function up(s) { return '<span class="m-up">▲ ' + s + "</span>"; }
    function dn(s) { return '<span class="m-down">▼ ' + s + "</span>"; }
    var scenes = [
      '<div class="m-lab">MARKETS · DEMO PRICES</div><div class="m-row"><span>AAPL</span><span>227.40 ' + up("0.8%") + '</span></div><div class="m-row"><span>AMD</span><span>168.15 ' + dn("0.4%") + '</span></div><div class="m-row"><span>NVDA</span><span>141.90 ' + up("1.2%") + "</span></div>",
      '<div class="m-lab">HEADLINES · DEMO</div><div class="m-row">Local team wins in overtime thriller</div><div class="m-row">New coffee shop opens downtown</div><div class="m-row">Sunny weekend ahead</div>',
      '<div class="m-lab">TODAY</div><div class="m-row"><span>9:30</span><span>Team meeting</span></div><div class="m-row"><span>12:00</span><span>Lunch with a friend</span></div><div class="m-row"><span>18:00</span><span>Pickleball 🏓</span></div>',
      '<div class="m-lab">QUOTE OF THE DAY</div><div class="m-row">“Well done is better than well said.”</div><div class="m-row" style="color:#999">Benjamin Franklin</div>',
      '<div class="m-lab">COMMUTE</div><div class="m-row"><span>Home → Work</span><span>18 min</span></div><div class="m-row"><span>Traffic</span><span class="m-up">light</span></div>',
      '<div class="m-lab">SPORTS · DEMO</div><div class="m-row"><span>Pickleball league</span><span>11 – 7 W</span></div><div class="m-row"><span>Next match</span><span>Sat 10 AM</span></div>',
      '<div class="m-lab">COUNTDOWN</div><div class="m-row"><span>Weekend</span><span>2 days 🎉</span></div><div class="m-row"><span>Next trip</span><span>34 days ✈️</span></div>'
    ];
    var timers = [], on = false, ci = 0, si = 0;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function every(fn, ms) { timers.push(setInterval(fn, ms)); }
    function clearAll() { timers.forEach(function (x) { clearTimeout(x); clearInterval(x); }); timers = []; }
    function tick() {
      var d = new Date();
      tEl.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      dEl.textContent = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    }
    tick(); setInterval(tick, 1000);
    function showScene(first) {
      var swap = function () { sEl.innerHTML = scenes[si]; sEl.style.opacity = 1; si = (si + 1) % scenes.length; };
      if (first) { swap(); return; }
      sEl.style.opacity = 0; setTimeout(swap, 480);
    }
    function nextCompliment() {
      cEl.classList.remove("show");
      setTimeout(function () { ci = (ci + 1) % compliments.length; cEl.textContent = compliments[ci]; cEl.classList.add("show"); }, 1300);
    }
    function turnOn() {
      on = true; m.classList.add("on"); btn.classList.add("on"); btn.textContent = "Turn the mirror off";
      compliments[0] = greet(); ci = 0; si = 0; cEl.textContent = compliments[0];
      var d = reduce ? 0 : 1;
      later(function () { cEl.classList.add("show"); }, 500 * d);
      later(function () { tl.classList.add("show"); }, 3400 * d);
      later(function () { tr.classList.add("show"); }, 3900 * d);
      later(function () { bot.classList.add("show"); showScene(true); if (!reduce) every(function () { showScene(false); }, 5500); }, 4500 * d);
      if (!reduce) later(function () { every(nextCompliment, 8500); }, 4500);
    }
    function turnOff() {
      on = false; clearAll(); m.classList.remove("on"); btn.classList.remove("on"); btn.textContent = "Turn the mirror on";
      [cEl, tl, tr, bot].forEach(function (e) { e.classList.remove("show"); });
    }
    btn.addEventListener("click", function () { on ? turnOff() : turnOn(); });
  }

  document.addEventListener("DOMContentLoaded", function () { demoEq(); demoXtalk(); demoMirror(); });
})();
