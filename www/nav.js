// BATMON — alt menü (ANA · NUNA · JOİE · BAKIM). Tüm sayfalarda ortak.
(function () {
  if (window.__batmonNav) return; window.__batmonNav = true;
  const p = location.pathname;
  const inSub = /\/(nuna|joie)\//.test(p);
  const base = inSub ? '../' : '';
  const cur = inSub ? (p.indexOf('/nuna/') >= 0 ? 'nuna' : 'joie') : (/bakim(\.html)?$/.test(p) ? 'bakim' : 'ana');
  const items = [
    ['ana',   'ANA',   base + 'index.html',      '#00e5ff'],
    ['nuna',  'NUNA',  base + 'nuna/index.html', '#ff3b3b'],
    ['joie',  'JOİE',  base + 'joie/index.html', '#d8c3a0'],
    ['bakim', 'BAKIM', base + 'bakim.html',      '#ff8800'] ];

  const css = document.createElement('style');
  css.textContent = `
  #bmNav{position:fixed;left:0;right:0;bottom:0;z-index:900;display:flex;background:#0b0e13;border-top:1px solid #1e2a38;padding-bottom:env(safe-area-inset-bottom);}
  #bmNav a{flex:1;text-align:center;padding:16px 0 15px;font:900 13px 'Barlow Condensed',Arial,sans-serif;letter-spacing:3px;text-decoration:none;color:var(--c);opacity:.5;border-top:2px solid transparent;margin-top:-1px;transition:opacity .15s;}
  #bmNav a.on{opacity:1;border-top-color:var(--c);background:linear-gradient(color-mix(in srgb,var(--c) 14%,transparent),transparent);}
  body{padding-bottom:calc(58px + env(safe-area-inset-bottom) + var(--bm-extra,0px)) !important;}
  ${cur === 'bakim' ? '' : '.toast{bottom:calc(74px + var(--bm-extra,0px)) !important;}'}`;
  document.head.appendChild(css);

  const nav = document.createElement('nav'); nav.id = 'bmNav';
  nav.innerHTML = items.map(([k, t, h, c]) =>
    `<a href="${h}" style="--c:${c}" class="${k === cur ? 'on' : ''}">${t}</a>`).join('');
  (document.body ? Promise.resolve() : new Promise(r => document.addEventListener('DOMContentLoaded', r)))
    .then(() => document.body.appendChild(nav));
})();
