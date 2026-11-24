// BATMON — araç sayfası üst bloğu (büyük % + hızlı işlemler) ve sabit ŞARJ ET çubuğu.
(function () {
  const p = location.pathname;
  const car = p.indexOf('/nuna/') >= 0 ? 'nuna' : p.indexOf('/joie/') >= 0 ? 'joie' : null;
  if (!car || typeof state === 'undefined' || typeof updateUI !== 'function') return;
  const C = { nuna: { col: '#ff3b3b', no: '01', name: 'OPEL NUNA', ghost: 'NUNA' },
              joie: { col: '#d8c3a0', no: '02', name: 'JOİE LİTETRAX 4', ghost: 'JOİE' } }[car];

  const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const st = document.createElement('style');
  st.textContent = `
  .vhero{position:relative;overflow:hidden;margin:14px 24px 0;padding:18px 20px 16px;border:1px solid var(--border);border-top:2px solid ${C.col};
    background:linear-gradient(160deg,color-mix(in srgb,${C.col} 16%,transparent),var(--bg) 70%);}
  .vhero .ghost{position:absolute;right:-8px;top:-10px;font:900 104px 'Barlow Condensed',sans-serif;letter-spacing:-3px;color:${C.col};opacity:.09;pointer-events:none;line-height:1}
  .vhero .lbl{position:relative;font:11px 'Share Tech Mono',monospace;letter-spacing:3px;color:${C.col}}
  .vhero .row{position:relative;display:flex;align-items:flex-end;gap:14px;margin:8px 0 10px}
  .vhero .pct{font:900 76px 'Barlow Condensed',sans-serif;color:var(--text,#fff);line-height:.9}
  .vhero .pct small{font-size:26px;color:${C.col};margin-left:2px}
  .vhero .km{font:11px 'Share Tech Mono',monospace;letter-spacing:2px;color:var(--text2);padding-bottom:6px}
  .vhero .bar{position:relative;height:10px;background:var(--bg3);border:1px solid var(--border2)}
  .vhero .bar i{display:block;height:100%;background:${C.col};box-shadow:0 0 12px ${C.col};transition:width .6s}
  .vhero .btns{position:relative;display:flex;gap:8px;margin-top:14px}
  .vhero .btns button{flex:1;padding:12px 4px;background:transparent;border:1.5px solid ${C.col};color:${C.col};font:900 13px 'Barlow Condensed',sans-serif;letter-spacing:2px;cursor:pointer}
  .vhero .btns button.rec{background:${C.col};color:#0a0c0f}
  #chargeBar{position:fixed;left:12px;right:12px;bottom:calc(66px + env(safe-area-inset-bottom));z-index:890;padding:15px;border:0;background:${C.col};color:#0a0c0f;
    font:900 16px 'Barlow Condensed',sans-serif;letter-spacing:3px;box-shadow:0 0 22px -3px ${C.col};cursor:pointer}
  #chargeBar.full{background:#10141a;color:${C.col};border:1.5px solid ${C.col};box-shadow:none;opacity:.8}
  .batt-wrap,.batt-rows{display:none !important}
  :root{--bm-extra:62px}
  .vhero{animation:vhIn .55s cubic-bezier(.2,.8,.2,1) both}
  @keyframes vhIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  .vhero .ghost{animation:vhDrift 16s ease-in-out infinite}
  @keyframes vhDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(-16px)}}
  .vhero .btns button{transition:transform .12s,background .2s,color .2s}.vhero .btns button:active{transform:scale(.95)}
  .vhero .btns button.rec{animation:vhRec 1.6s ease-in-out infinite}
  @keyframes vhRec{0%,100%{box-shadow:0 0 0 0 ${C.col}88}50%{box-shadow:0 0 0 8px ${C.col}00}}
  .vhero.flash{animation:vhFlash 1s ease-out}
  @keyframes vhFlash{0%{box-shadow:inset 0 0 0 transparent}30%{box-shadow:inset 0 0 70px ${C.col}66}100%{box-shadow:inset 0 0 0 transparent}}
  #chargeBar{overflow:hidden;transition:transform .12s;animation:cbIn .5s .25s cubic-bezier(.2,.8,.2,1) both}
  #chargeBar:active{transform:scale(.98)}
  @keyframes cbIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
  #chargeBar:not(.full)::after{content:'';position:absolute;top:0;bottom:0;width:60px;left:-80px;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);animation:cbShine 3.6s ease-in-out infinite}
  @keyframes cbShine{0%,55%{left:-80px}100%{left:110%}}
  @media(max-width:700px){.vhero{margin:10px 10px 0}.vhero .pct{font-size:68px}}`;
  document.head.appendChild(st);

  const hero = document.createElement('div'); hero.className = 'vhero';
  hero.innerHTML = `<div class="ghost">${C.ghost}</div><div class="lbl">ARAÇ ${C.no} · ${C.name}</div>
    <div class="row"><div class="pct"><span id="vhPct">--</span><small>%</small></div><div class="km" id="vhKm">—</div></div>
    <div class="bar"><i id="vhBar" style="width:0"></i></div>
    <div class="btns"><button id="vhAdd">＋ KM</button>${NATIVE ? '<button id="vhGps">📍 YOLCULUK</button>' : ''}<button id="vhMap">⊕ HARİTA</button></div>
    <div id="vhStatus" style="position:relative;margin-top:10px;font:11px 'Share Tech Mono',monospace;letter-spacing:1px;color:var(--text2);min-height:14px"></div>`;
  const main = document.querySelector('.main'); main.parentNode.insertBefore(hero, main);

  const bar = document.createElement('button'); bar.id = 'chargeBar'; bar.textContent = '⚡ ŞARJ ET';
  bar.onclick = () => chargeDevice(); document.body.appendChild(bar);

  document.getElementById('vhAdd').onclick = () => { const i = document.getElementById('useInput'); i.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => i.focus(), 350); };
  document.getElementById('vhMap').onclick = () => enterKiosk();
  const gps = document.getElementById('vhGps');
  if (gps) gps.onclick = () => {
    const st = document.getElementById('vhStatus');
    if (!window.batmonTripToggle) { st.style.color = '#ff3355'; st.textContent = '✕ Yolculuk servisi yüklenmedi (native.js çalışmadı)'; return; }
    st.style.color = ''; st.textContent = '⏳ Başlatılıyor…';
    Promise.resolve(window.batmonTripToggle()).catch(e => { st.style.color = '#ff3355'; st.textContent = '✕ ' + ((e && e.message) || e); });
  };
  window.addEventListener('batmon-trip', e => {
    if (!gps) return;
    const d = e.detail || {};
    gps.className = d.active ? 'rec' : '';
    gps.textContent = d.active ? `● ${(d.km || 0).toFixed(2)} KM · DURDUR` : '📍 YOLCULUK';
  });

  let shown = 0, firstRun = true;
  function countTo(to) {
    const el = document.getElementById('vhPct'), from = shown; shown = to;
    if (from === to) { el.textContent = to; return; }
    const t0 = performance.now(), ms = 800;
    (function f(t) { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function render() {
    const pc = pct100();
    if (!firstRun && pc > shown + 1) { hero.classList.remove('flash'); void hero.offsetWidth; hero.classList.add('flash'); }
    firstRun = false;
    countTo(pc);
    document.getElementById('vhBar').style.width = Math.min(100, pc) + '%';
    document.getElementById('vhKm').textContent = `${(Math.max(0, state.remainS) / 1000).toFixed(1)} / ${(MAX_S / 1000).toFixed(0)} KM KALDI`;
    bar.classList.toggle('full', pc >= 100);
    bar.textContent = pc >= 100 ? '✓ PİL DOLU' : '⚡ ŞARJ ET';
  }
  const orig = window.updateUI;
  window.updateUI = function () { const r = orig.apply(this, arguments); try { render(); } catch (e) {} return r; };
  render();
})();
