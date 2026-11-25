// BATMON — araç sayfası üst bloğu (büyük % + hızlı işlemler) ve sabit ŞARJ ET çubuğu.
(function () {
  const p = location.pathname;
  const car = p.indexOf('/nuna/') >= 0 ? 'nuna' : p.indexOf('/joie/') >= 0 ? 'joie' : null;
  if (!car || typeof state === 'undefined' || typeof updateUI !== 'function') return;
  const C = { nuna: { col: '#ff3b3b', no: '01', name: 'OPEL NUNA', ghost: 'NUNA' },
              joie: { col: '#d8c3a0', no: '02', name: 'JOİE LİTETRAX 4', ghost: 'JOİE' } }[car];

  window.addEventListener('error', e => { if (!window.__bmErr) window.__bmErr = (e.message || '') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno; });
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

  .vpanel{margin:12px 24px 0;display:grid;gap:12px;animation:vhIn .6s .1s cubic-bezier(.2,.8,.2,1) both}
  @media(max-width:700px){.vpanel{margin:10px 10px 0}}
  .vsec{background:var(--bg2);border:1px solid var(--border);border-top:2px solid ${C.col};padding:14px}
  .vsec .vh{display:flex;justify-content:space-between;align-items:center;font:12px 'Share Tech Mono',monospace;letter-spacing:3px;color:${C.col};margin-bottom:10px}
  .vsec .tag{font-size:9px;letter-spacing:2px;color:var(--text3);border:1px solid var(--border2);padding:2px 6px}
  .vsec .big{font:900 54px 'Barlow Condensed',sans-serif;color:var(--text,#fff);line-height:.9}.vsec .big small{font-size:22px}
  .vsec .txt{font:11px 'Share Tech Mono',monospace;letter-spacing:1px;color:var(--text2);line-height:1.55}
  .vsec .b2{height:8px;background:var(--bg3);border:1px solid var(--border2);margin:10px 0}.vsec .b2 i{display:block;height:100%;width:0;transition:width .9s cubic-bezier(.2,.8,.2,1)}
  .vsec button.sm{padding:10px 12px;background:transparent;border:1.5px solid ${C.col};color:${C.col};font:900 12px 'Barlow Condensed',sans-serif;letter-spacing:2px;cursor:pointer}
  .vsec button.sm:active{transform:scale(.96)}
  .vsec .form{display:none;gap:8px;margin-top:10px}.vsec .form.on{display:flex}
  .vsec .form input{flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border2);color:var(--text,#fff);padding:9px;font:700 16px 'Barlow Condensed',sans-serif}
  .vit{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;font:12px 'Share Tech Mono',monospace;letter-spacing:1px;color:var(--text2)}
  .vit:last-child{border-bottom:0}.vit b{color:var(--text,#fff);font:700 15px 'Barlow Condensed',sans-serif;letter-spacing:1px}
  .vit .go{color:${C.col};font-size:18px}.vempty{font:11px 'Share Tech Mono',monospace;color:var(--text3);letter-spacing:1px;padding:4px 0}
  #vtMap{position:fixed;inset:0;z-index:2600;background:var(--bg);display:none;flex-direction:column}#vtMap.on{display:flex;animation:bmFade .25s both}
  #vtMap .hd{display:flex;justify-content:space-between;align-items:center;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;border-bottom:1px solid var(--border);font:12px 'Share Tech Mono',monospace;letter-spacing:2px;color:${C.col}}
  #vtMap .hd button{background:transparent;border:1.5px solid ${C.col};color:${C.col};padding:8px 12px;font:900 12px 'Barlow Condensed',sans-serif;letter-spacing:2px}
  #vtMap .mp{flex:1;min-height:200px;background:#0a0c0f}
  #vtMap .st{display:flex;gap:8px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--border)}
  #vtMap .st div{flex:1;background:var(--bg2);border:1px solid var(--border);padding:8px;text-align:center}#vtMap .st b{display:block;font:900 20px 'Barlow Condensed',sans-serif;color:var(--text,#fff)}#vtMap .st span{font:9px 'Share Tech Mono',monospace;color:var(--text2);letter-spacing:1px}
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
    if (!window.batmonTripToggle) { st.style.color = '#ff3355'; st.textContent = '✕ native.js çalışmadı' + (window.__bmErr ? ' — ' + window.__bmErr : (window.__bmNativeLoaded ? '' : ' — dosya hiç yüklenmedi / sözdizimi hatası')); return; }
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

  // ═══════ PİL SAĞLIĞI + YOLCULUK İZLERİ ═══════
  const BS = window.BATMON_SETTINGS, store = {
    get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: (k, x) => { try { localStorage.setItem(k, JSON.stringify(x)); } catch (e) {} } };
  const panel = document.createElement('div'); panel.className = 'vpanel';
  panel.innerHTML = `
    <div class="vsec"><div class="vh"><span>🔋 PİL SAĞLIĞI</span><span class="tag" id="hTag">TAHMİN</span></div>
      <div style="display:flex;align-items:flex-end;gap:14px"><div class="big"><span id="hVal">--</span><small>%</small></div><div class="txt" id="hTxt"></div></div>
      <div class="b2"><i id="hBar"></i></div>
      <button class="sm" id="hAdd">＋ GERÇEK MENZİL ÖLÇÜMÜ EKLE</button>
      <div class="form" id="hForm"><input type="number" id="hKm" step="0.1" min="0.1" placeholder="dolu pille kaç km gittin?"><button class="sm" id="hSave">KAYDET</button></div>
      <div id="hList" style="margin-top:8px"></div></div>
    <div class="vsec"><div class="vh"><span>🗺 YOLCULUK İZLERİ</span><span class="tag">GPS</span></div><div id="tList"></div></div>`;
  hero.parentNode.insertBefore(panel, main);

  // — sağlık
  let calibs = store.get('batmon_health_' + car) || [];
  const cloudKey = 'batmon/' + car + '_health';
  function healthCalc() {
    const cycles = state.totalCharges || 0, life = BS.health.cycles, rated = MAX_S / 1000;
    const est = Math.max(50, Math.round(100 - cycles * 20 / life));
    const c = calibs.slice(0, 3);
    if (c.length) { const avg = c.reduce((a, x) => a + x.km, 0) / c.length;
      return { val: Math.min(100, Math.round(avg / rated * 100)), kind: 'ÖLÇÜLEN', est, avg, rated, n: c.length, cycles, life }; }
    return { val: est, kind: 'TAHMİN', est, rated, cycles, life };
  }
  function healthRender() {
    const h = healthCalc(), col = h.val >= 85 ? '#00ff88' : h.val >= 70 ? '#ffcc00' : '#ff3355';
    document.getElementById('hVal').textContent = h.val; document.getElementById('hTag').textContent = h.kind;
    const bar = document.getElementById('hBar'); bar.style.width = h.val + '%'; bar.style.background = col; bar.style.boxShadow = '0 0 10px ' + col;
    document.getElementById('hVal').style.color = col;
    document.getElementById('hTxt').innerHTML = h.kind === 'ÖLÇÜLEN'
      ? `son ${h.n} ölçüm ort. ${h.avg.toFixed(1)} / ${h.rated.toFixed(0)} km<br>şarj döngüsüne göre tahmin: %${h.est}`
      : `${h.cycles} / ${h.life} şarj döngüsü<br>≈ ${Math.max(0, h.life - h.cycles)} şarj sonra %80'e iner<br>gerçek menzil ölçerek netleştir`;
    document.getElementById('hList').innerHTML = calibs.length
      ? calibs.slice(0, 5).map((x, i) => `<div class="vit" data-i="${i}"><span>${new Date(x.t).toLocaleDateString('tr-TR')}</span><b>${x.km.toFixed(1)} km</b><span class="go">✕</span></div>`).join('')
      : '<div class="vempty">// henüz ölçüm yok — pil doluyken boşalana kadar gidip kaç km yaptığını gir</div>';
  }
  function healthSave() { store.set('batmon_health_' + car, calibs); try { fbSet(car, cloudKey, { calibs, updatedAt: Date.now() }); } catch (e) {} }
  document.getElementById('hAdd').onclick = () => { document.getElementById('hForm').classList.toggle('on'); document.getElementById('hKm').focus(); };
  document.getElementById('hSave').onclick = () => {
    const km = parseFloat(document.getElementById('hKm').value);
    if (!(km > 0)) { showToast('Geçerli bir km gir', true); return; }
    calibs.unshift({ t: Date.now(), km }); calibs = calibs.slice(0, 10); healthSave(); healthRender();
    document.getElementById('hKm').value = ''; document.getElementById('hForm').classList.remove('on'); showToast('🔋 Ölçüm kaydedildi');
  };
  document.getElementById('hList').onclick = e => { const it = e.target.closest('.vit'); if (!it) return;
    if (confirm('Bu ölçüm silinsin mi?')) { calibs.splice(+it.dataset.i, 1); healthSave(); healthRender(); } };
  try { fbGet(car, cloudKey).then(s => { if (s.exists()) { const r = (s.val() || {}).calibs || [];
    const map = {}; calibs.concat(r).forEach(x => map[x.t] = x);
    calibs = Object.values(map).sort((a, b) => b.t - a.t).slice(0, 10); store.set('batmon_health_' + car, calibs); healthRender(); } }).catch(() => {}); } catch (e) {}

  // — izler
  let tracks = store.get('batmon_tracks_' + car) || [];
  const tKey = 'batmon/' + car + '_tracks', fmtDur = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h ? `${h} sa ${m} dk` : `${m} dk ${s % 60} sn`; };
  function tracksRender() {
    document.getElementById('tList').innerHTML = tracks.length
      ? tracks.slice(0, 8).map((t, i) => `<div class="vit" data-i="${i}"><span>${new Date(t.t).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} ${new Date(t.t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span><b>${t.km.toFixed(2)} km</b><span>${fmtDur(t.sec)}</span><span class="go">›</span></div>`).join('')
      : `<div class="vempty">// henüz iz yok — ${NATIVE ? '📍 YOLCULUK ile bir yolculuk kaydet' : 'izler yalnızca Android uygulamasında kaydedilir'}</div>`;
  }
  function tracksSave() { const it = tracks.slice(0, 30); store.set('batmon_tracks_' + car, it); try { fbSet(car, tKey, { items: it, updatedAt: Date.now() }); } catch (e) {} }
  window.batmonAddTrack = t => { tracks.unshift(t); tracks = tracks.slice(0, 30); tracksSave(); tracksRender(); };
  try { fbGet(car, tKey).then(s => { if (s.exists()) { const r = (s.val() || {}).items || [];
    const map = {}; tracks.concat(r).forEach(x => map[x.t] = x);
    tracks = Object.values(map).sort((a, b) => b.t - a.t).slice(0, 30); store.set('batmon_tracks_' + car, tracks); tracksRender(); } }).catch(() => {}); } catch (e) {}

  const ov = document.createElement('div'); ov.id = 'vtMap'; document.body.appendChild(ov); let map = null;
  function closeOv() { ov.classList.remove('on'); if (map) { map.remove(); map = null; } ov.innerHTML = ''; }
  window.__bmOverlayClose = () => { if (!ov.classList.contains('on')) return false; closeOv(); return true; };
  function openTrack(i) {
    const t = tracks[i]; if (!t) return;
    const spd = t.sec > 0 ? (t.km / (t.sec / 3600)) : 0;
    ov.innerHTML = `<div class="hd"><span>${C.name} · ${new Date(t.t).toLocaleDateString('tr-TR')}</span><span><button id="vtDel">SİL</button> <button id="vtX">✕ KAPAT</button></span></div>
      <div class="mp" id="vtMp"></div>
      <div class="st"><div><b>${t.km.toFixed(2)}</b><span>KM</span></div><div><b>${fmtDur(t.sec)}</b><span>SÜRE</span></div><div><b>${spd.toFixed(1)}</b><span>ORT. KM/SA</span></div></div>`;
    ov.classList.add('on');
    document.getElementById('vtX').onclick = closeOv;
    document.getElementById('vtDel').onclick = () => { if (confirm('Bu yolculuk izi silinsin mi?')) { tracks.splice(i, 1); tracksSave(); tracksRender(); closeOv(); } };
    const mp = document.getElementById('vtMp');
    if (typeof L === 'undefined') { mp.innerHTML = '<div class="vempty" style="padding:20px">Harita yüklenemedi — internet bağlantısı gerekli</div>'; return; }
    setTimeout(() => {
      map = L.map(mp, { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const line = L.polyline(t.pts, { color: C.col, weight: 5, opacity: .95 }).addTo(map);
      L.circleMarker(t.pts[0], { radius: 8, color: '#fff', weight: 2, fillColor: '#00ff88', fillOpacity: 1 }).addTo(map);
      L.circleMarker(t.pts[t.pts.length - 1], { radius: 8, color: '#fff', weight: 2, fillColor: '#ff3355', fillOpacity: 1 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [30, 30] }); map.invalidateSize();
    }, 60);
  }
  document.getElementById('tList').onclick = e => { const it = e.target.closest('.vit'); if (it) openTrack(+it.dataset.i); };
  tracksRender(); healthRender();

  function render() {
    const pc = pct100();
    if (!firstRun && pc > shown + 1) { hero.classList.remove('flash'); void hero.offsetWidth; hero.classList.add('flash'); }
    firstRun = false;
    countTo(pc);
    document.getElementById('vhBar').style.width = Math.min(100, pc) + '%';
    document.getElementById('vhKm').textContent = `${(Math.max(0, state.remainS) / 1000).toFixed(1)} / ${(MAX_S / 1000).toFixed(0)} KM KALDI`;
    bar.classList.toggle('full', pc >= 100);
    bar.textContent = pc >= 100 ? '✓ PİL DOLU' : '⚡ ŞARJ ET';
    try { healthRender(); } catch (e) {}
  }
  const orig = window.updateUI;
  window.updateUI = function () { const r = orig.apply(this, arguments); try { render(); } catch (e) {} return r; };
  render();
})();
