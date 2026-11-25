/* Impact Lab — shared page engine
   Each example page calls IC.start(config). See ex1.html … ex6.html. */
(function () {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = (x, d = 2) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);

  /* ---------- drawing helpers (bound to the canvas context) ---------- */
  function makeDraw(ctx) {
    const D = {
      ctx,
      line(x1, y1, x2, y2, color, w = 1.5, dash) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      },
      circle(x, y, r, fill, stroke, w = 2, dash) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.stroke(); }
        ctx.restore();
      },
      rrect(x, y, w, h, r, fill, stroke, lw = 2, dash) {
        ctx.save(); r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; if (dash) ctx.setLineDash(dash); ctx.stroke(); }
        ctx.restore();
      },
      arrow(x1, y1, x2, y2, color, w = 3) {
        const L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return;
        ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
        const a = Math.atan2(y2 - y1, x2 - x1), s = Math.min(10, 4 + L * 0.3);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - s * 0.6 * Math.cos(a), y2 - s * 0.6 * Math.sin(a)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
        ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
      },
      text(t, x, y, color = '#94a3b8', align = 'left', size = 12, weight = 600, base = 'alphabetic') {
        ctx.save(); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
        ctx.font = `${weight} ${size}px system-ui,-apple-system,"Segoe UI",sans-serif`; ctx.fillText(t, x, y); ctx.restore();
      },
      /* text with a dark backing pill, for labels over busy backgrounds */
      tag(t, x, y, color = '#e2e8f0', align = 'center', size = 12) {
        ctx.save(); ctx.font = `700 ${size}px system-ui,sans-serif`;
        const w = ctx.measureText(t).width + 10, h = size + 8;
        let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
        ctx.fillStyle = 'rgba(15,23,42,.78)'; D.rrect(x0, y - h + 4, w, h, 6, 'rgba(15,23,42,.8)');
        ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, x0 + 5, y - 1); ctx.restore();
      },
      zigzag(x1, y1, x2, y2, n, amp, color = '#cbd5e1', w = 2) {
        const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1);
        const lead = 0.08;
        ctx.lineTo(x1 + ux * L * lead, y1 + uy * L * lead);
        for (let i = 1; i < n; i++) {
          const f = lead + (1 - 2 * lead) * i / n, s = i % 2 ? amp : -amp;
          ctx.lineTo(x1 + ux * L * f + nx * s, y1 + uy * L * f + ny * s);
        }
        ctx.lineTo(x1 + ux * L * (1 - lead), y1 + uy * L * (1 - lead)); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      },
      ground(y, W, H, hatch = true) {
        ctx.save(); ctx.fillStyle = '#273449'; ctx.fillRect(0, y, W, H - y); ctx.fillStyle = '#475569'; ctx.fillRect(0, y, W, 2);
        if (hatch) { ctx.strokeStyle = 'rgba(148,163,184,.18)'; ctx.lineWidth = 1;
          for (let x = -20; x < W + 20; x += 14) { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 10, y + 14); ctx.stroke(); } }
        ctx.restore();
      },
      alpha(a, fn) { ctx.save(); ctx.globalAlpha = a; fn(); ctx.restore(); }
    };
    return D;
  }

  /* ---------- page ---------- */
  function start(cfg) {
    const opts = {};
    (cfg.options || []).forEach(o => opts[o.key] = o.default);
    document.title = `Example ${cfg.n} · ${cfg.title} | Impact Lab`;
    const app = document.getElementById('app');
    app.className = 'app';
    app.innerHTML = `
      <header>
        <a class="back" href="index.html">← All examples</a>
        <h1><span class="exn">Example ${cfg.n}</span>${cfg.title}</h1>
        <nav class="pn">${cfg.n > 1 ? `<a href="ex${cfg.n - 1}.html">‹ Prev</a>` : ''}${cfg.n < 6 ? `<a href="ex${cfg.n + 1}.html">Next ›</a>` : ''}</nav>
      </header>
      <div class="layout">
        <div class="left">
          <div class="card stage"><canvas id="cv"></canvas></div>
          <div class="card bar">
            <button class="btn primary" id="play">▶ Play</button>
            <button class="btn" id="reset">⟲ Reset</button>
            <span class="seglbl" style="margin-left:auto">Speed</span>
            <div class="seg" id="speed" style="margin-left:0">${[0.1, 0.25, 0.5, 1].map(s => `<button data-s="${s}">${s}×</button>`).join('')}</div>
          </div>
          ${cfg.options ? `<div class="card opts">${cfg.options.map(o => `<label><input type="checkbox" data-k="${o.key}" ${o.default ? 'checked' : ''}> ${o.label}</label>`).join('')}</div>` : ''}
        </div>
        <div class="right">
          <div class="card pad">
            <div class="ttl">Problem</div>
            <p>${cfg.statement}</p>
            <div class="glist">${cfg.given.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('')}</div>
            <div class="find"><b>Find:</b> ${cfg.find}</div>
          </div>
          <div class="card pad">
            <div class="ttl">Your answers</div>
            <div id="rows"></div>
            <div class="btns"><button class="btn primary" id="check">Check &amp; play</button><button class="btn" id="solBtn">Show solution</button></div>
            <div class="summary" id="summary"></div>
            <div class="note">${cfg.note || 'Enter numbers only. You can leave “Step” boxes empty. The dashed orange shapes in the animation show what <b>your</b> answers would do.'}</div>
          </div>
          <div class="card pad" id="solCard" hidden>
            <div class="ttl">Solution</div>
            <div class="math" id="solBody"></div>
          </div>
        </div>
      </div>
      <p class="foot">ECOR 1034 Dynamics · PA Session 10 · Impulse &amp; Impact</p>`;

    /* answer rows */
    const rows = document.getElementById('rows');
    cfg.answers.forEach(a => {
      const r = document.createElement('div'); r.className = 'arow';
      r.innerHTML = `<span class="tag ${a.step ? 'step' : 'ans'}">${a.step ? 'Step' : 'Answer'}</span>
        <span class="alabel">${a.label}</span>
        <input type="number" inputmode="decimal" step="any" data-k="${a.key}" aria-label="${a.label.replace(/<[^>]+>/g, '')}">
        <span class="unit">${a.unit || ''}</span><span class="st" data-st="${a.key}"></span>`;
      rows.appendChild(r);
    });

    /* canvas */
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), D = makeDraw(ctx);
    let W = 700, H = 380;
    function resize() {
      const r = cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      W = r.width; H = clamp(W * (cfg.aspect || 0.52), 240, 520);
      cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize); resize();

    /* state */
    const st = { opts, ghost: null, playing: false, done: false, s: null, speed: cfg.speed || 0.5 };
    function reset() { st.s = cfg.scene.init(st.opts); st.playing = false; st.done = false; syncPlay(); }
    function play() { if (st.done) reset(); st.playing = !st.playing; syncPlay(); }
    function syncPlay() { document.getElementById('play').textContent = st.playing ? '❚❚ Pause' : st.done ? '↻ Replay' : '▶ Play'; }
    document.getElementById('play').onclick = play;
    document.getElementById('reset').onclick = () => { st.ghost = null; reset(); };
    const seg = document.getElementById('speed');
    function setSpeed(s) { st.speed = s; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); }
    seg.querySelectorAll('button').forEach(b => b.onclick = () => setSpeed(+b.dataset.s));
    setSpeed(st.speed);
    document.querySelectorAll('.opts input').forEach(i => i.onchange = () => {
      st.opts[i.dataset.k] = i.checked; st.ghost = null; reset(); clearMarks(); renderSolution();
    });

    /* answers */
    const inputs = [...rows.querySelectorAll('input')];
    function readVals() {
      const v = {}; inputs.forEach(i => { const x = parseFloat(i.value); v[i.dataset.k] = isFinite(x) ? x : null; }); return v;
    }
    function clearMarks() {
      inputs.forEach(i => i.classList.remove('ok', 'bad', 'sign'));
      rows.querySelectorAll('.st').forEach(s => { s.textContent = ''; s.className = 'st'; });
      document.getElementById('summary').innerHTML = '';
    }
    function check() {
      clearMarks();
      const vals = readVals(); let nA = 0, okA = 0, nS = 0, okS = 0; const msgs = [];
      cfg.answers.forEach(a => {
        const v = vals[a.key], inp = rows.querySelector(`input[data-k="${a.key}"]`), mark = rows.querySelector(`[data-st="${a.key}"]`);
        if (a.step) nS++; else nA++;
        if (v === null) return;
        const ans = a.value(st.opts), tol = Math.max(Math.abs(ans) * (a.tol || 0.02), a.abs || 0.005);
        let res = Math.abs(v - ans) <= tol ? 'ok' : (a.signed && Math.abs(v + ans) <= tol ? 'sign' : 'bad');
        inp.classList.add(res); mark.classList.add(res);
        mark.textContent = res === 'ok' ? '✓' : res === 'sign' ? '±' : '✗';
        if (res === 'ok') { if (a.step) okS++; else okA++; }
        if (res === 'sign') msgs.push(`<b>${a.label.replace(/<[^>]+>/g, '')}</b>: right size, wrong direction. ${a.signNote || 'Check your sign convention.'}`);
      });
      const sum = document.getElementById('summary');
      sum.innerHTML = `<b class="${okA === nA ? 'ok' : ''}">${okA}/${nA} answers correct</b>${nS ? ` · ${okS}/${nS} steps` : ''}.
        ${okA === nA ? ' 🎉 Nice work!' : ' Within 2% counts as correct.'}${msgs.length ? '<br>' + msgs.join('<br>') : ''}`;
      st.ghost = cfg.ghost ? cfg.ghost(vals, st.opts) : null;
      reset(); st.playing = true; syncPlay();
    }
    document.getElementById('check').onclick = check;
    inputs.forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } }));

    /* solution */
    const solCard = document.getElementById('solCard'), solBtn = document.getElementById('solBtn');
    function renderSolution() { document.getElementById('solBody').innerHTML = cfg.solution(st.opts); }
    solBtn.onclick = () => {
      solCard.hidden = !solCard.hidden; solBtn.textContent = solCard.hidden ? 'Show solution' : 'Hide solution';
      if (!solCard.hidden) { renderSolution(); solCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    };

    /* loop */
    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      try {
        if (st.playing && !st.done) {
          const sim = dt * st.speed;
          if (cfg.scene.step(st.s, sim, st.opts)) { st.done = true; st.playing = false; syncPlay(); }
        }
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2540'); g.addColorStop(1, '#141d33');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        cfg.scene.draw(D, W, H, st.s, st);
        if (st.speed < 1 && st.playing) D.text(`slow motion ${st.speed}×`, W - 10, H - 10, 'rgba(148,163,184,.7)', 'right', 11);
      } catch (err) { console.error(err); }
    }
    reset(); requestAnimationFrame(frame);
  }

  window.IC = { start, fmt, clamp };
})();
