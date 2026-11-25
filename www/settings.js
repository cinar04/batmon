// BATMON — ortak ayarlar (kapasite, bakım ömürleri, eşikler, uyarılar). Sayfa betiklerinden ÖNCE yüklenir.
(function () {
  const DEF = {
    nuna: { km: 30 }, joie: { km: 100 },
    life: { motor: 200, lastik: 200, batarya: 50 },   // motor/lastik: km, batarya: şarj sayısı
    thr:  { warn: 30, danger: 15 },                     // bakım çubuğu eşikleri (puan)
    crit: { on: true, levels: [15, 10, 5] },            // kritik pil uyarısı (% seviyeleri)
    health: { cycles: 500 },                            // %80 kapasiteye düşme tahmini (şarj döngüsü)
    repo: 'cinar04/batmon',
    updatedAt: 0
  };
  const merge = (a, b) => { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    for (const k in (b || {})) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object') ? merge(a[k], b[k]) : b[k];
    return o; };
  const num = (v, d) => { v = parseFloat(v); return isFinite(v) && v > 0 ? v : d; };
  function clean(s) {
    s.nuna.km = num(s.nuna.km, DEF.nuna.km); s.joie.km = num(s.joie.km, DEF.joie.km);
    ['motor', 'lastik', 'batarya'].forEach(k => s.life[k] = num(s.life[k], DEF.life[k]));
    s.thr.warn = num(s.thr.warn, 30); s.thr.danger = Math.min(num(s.thr.danger, 15), s.thr.warn);
    s.health.cycles = num(s.health.cycles, 500);
    if (!Array.isArray(s.crit.levels) || !s.crit.levels.length) s.crit.levels = DEF.crit.levels.slice();
    s.crit.levels = s.crit.levels.map(Number).filter(x => x > 0 && x < 100).sort((a, b) => b - a);
    return s;
  }
  let local = {};
  try { local = JSON.parse(localStorage.getItem('batmon_settings') || '{}'); } catch (e) {}
  const S = clean(merge(DEF, local));
  S.rate = { motor: 100 / S.life.motor, lastik: 100 / S.life.lastik, batarya: 100 / S.life.batarya };
  window.BATMON_SETTINGS = S;
  window.BATMON_DEFAULTS = DEF;

  window.BATMON_SAVE = async function (ns) {
    ns = clean(merge(DEF, ns)); ns.updatedAt = Date.now();
    delete ns.rate;
    localStorage.setItem('batmon_settings', JSON.stringify(ns));
    try { await fbSet('settings', 'batmon/settings', ns); return 'cloud'; } catch (e) { return 'local'; }
  };
  window.BATMON_SYNC = async function () {
    try {
      const snap = await fbGet('settings', 'batmon/settings');
      if (!snap.exists()) return false;
      const r = snap.val();
      if ((r.updatedAt || 0) > (local.updatedAt || 0)) { localStorage.setItem('batmon_settings', JSON.stringify(r)); return true; }
    } catch (e) {}
    return false;
  };
  // Başka cihazdan ayar değiştiyse bir kez yenile
  window.addEventListener('load', () => { setTimeout(() => {
    if (typeof fbGet === 'function') window.BATMON_SYNC().then(ch => { if (ch && !sessionStorage.getItem('bm_reloaded')) { sessionStorage.setItem('bm_reloaded', '1'); location.reload(); } });
  }, 1500); });
  window.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.capKm').forEach(el => {
    const c = /\/joie\//.test(location.pathname) ? 'joie' : 'nuna'; el.textContent = S[c].km + ' km'; }));
})();
