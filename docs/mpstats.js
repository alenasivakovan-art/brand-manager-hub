(function () {
  'use strict';
  // «Аналитика MPStats» tab of the insights page: weekly market report from the private data repo (mpstats/).
  var BM = window.BM, esc = BM.esc, icon = BM.icon;
  var CACHE_KEY = 'bmh-mpstats-cache';
  var MP = { wb: 'Wildberries', ozon: 'Ozon' };
  var CAT = { face: 'Уход за лицом', hair: 'Уход за волосами' };
  var VERDICT = { 'заходить': 'go', 'наблюдать': 'watch', 'не заходить': 'stop' };

  function cache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || { index: null, weeks: {} }; } catch (e) { return { index: null, weeks: {} }; } }
  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(C)); }
    catch (e) { var ids = Object.keys(C.weeks).sort(); while (ids.length > 2) delete C.weeks[ids.shift()]; try { localStorage.setItem(CACHE_KEY, JSON.stringify(C)); } catch (e2) {} }
  }
  var C = cache(), loading = false, lastError = null;
  function canRead() { var s = BM.settings; return !!(s.owner && s.repo && s.token); }
  function ghRaw(p) {
    var s = BM.settings;
    var url = 'https://api.github.com/repos/' + encodeURIComponent(s.owner) + '/' + encodeURIComponent(s.repo) + '/contents/' + p.split('/').map(encodeURIComponent).join('/');
    return fetch(url, { headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github.raw+json' }, cache: 'no-store' })
      .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('GitHub ответил ' + r.status); return r.json(); });
  }
  function rerender() { if ((location.hash || '').indexOf('#/insights') === 0 && BM.ui.inTab === 'mpstats') BM.render(); }
  function loadIndex(force) {
    if (!canRead() || !navigator.onLine || loading) return;
    if (!force && C.index && Date.now() - (C.fetchedAt || 0) < 10 * 60 * 1000) return;
    loading = true; lastError = null;
    ghRaw('mpstats/index.json').then(function (idx) {
      C.index = idx || { weeks: [] }; C.fetchedAt = Date.now(); saveCache();
      var first = C.index.weeks && C.index.weeks[0];
      return first && !C.weeks[first.id] ? loadWeek(first.id) : null;
    }).catch(function (e) { lastError = e.message; }).then(function () { loading = false; rerender(); });
  }
  function loadWeek(id) { return ghRaw('mpstats/' + id + '.json').then(function (w) { if (w) { C.weeks[id] = w; saveCache(); } }); }

  // ---------- formatting ----------
  function money(v) {
    if (v == null) return '—';
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' млрд ₽';
    if (a >= 1e6) return (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн ₽';
    if (a >= 1e4) return Math.round(v / 1e3).toLocaleString('ru-RU') + ' тыс. ₽';
    return Math.round(v).toLocaleString('ru-RU') + ' ₽';
  }
  function n(v) { return v == null ? '—' : Math.round(v).toLocaleString('ru-RU'); }
  function growth(v, pp) {
    if (v == null) return '<span class="muted">—</span>';
    var cls = v > 0.05 ? 'up' : v < -0.05 ? 'down' : 'flat';
    return '<span class="mp-g ' + cls + '">' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + (pp ? ' п.п.' : '%') + '</span>';
  }
  function pctv(v) { return v == null ? '—' : v.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%'; }
  function link(url, text) { return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>' : esc(text); }

  // ---------- blocks ----------
  function dm(d) { var p = String(d || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] : String(d || ''); }
  function byScore(a, b) { return (b.score || 0) - (a.score || 0); }
  function ring(score, cls) {
    var rad = 20, len = 2 * Math.PI * rad, v = Math.max(0, Math.min(100, Math.round(score || 0)));
    return '<svg class="mp-ring ' + (cls || '') + '" viewBox="0 0 52 52" role="img" aria-label="Оценка ' + v + ' из 100"><circle cx="26" cy="26" r="' + rad + '" class="mp-ring-bg"/><circle cx="26" cy="26" r="' + rad + '" class="mp-ring-fg" stroke-dasharray="' + (len * v / 100).toFixed(1) + ' ' + len.toFixed(1) + '" transform="rotate(-90 26 26)"/><text x="26" y="27" text-anchor="middle" dominant-baseline="middle">' + v + '</text></svg>';
  }
  function more(label, body) { return '<details class="mp-more"><summary>' + esc(label) + '</summary>' + body + '</details>'; }
  function jump(id, label) { return '<button type="button" class="mp-jump" data-mp-jump="mp-s-' + id + '">' + esc(label) + icon('chevR', 'sm') + '</button>'; }

  // four tiles: marketplace × category; a click switches the detailed sections below
  function kpiCards(r, mp, cat) {
    var out = '';
    ['wb', 'ozon'].forEach(function (k) {
      var m = r.markets[k]; if (!m) return;
      Object.keys(m.categories).forEach(function (ck) {
        var c = m.categories[ck], q = c.kpi, on = k === mp && ck === cat, P = m.periods || {};
        out += '<button type="button" class="card mp-pulse' + (on ? ' on' : '') + '" data-mp-pick="' + k + ':' + ck + '" aria-pressed="' + on + '">' +
          '<small>' + esc(MP[k]) + ' · ' + esc(c.label) + '</small><b class="num">' + money(q.revenue) + '</b>' +
          '<span class="mp-pulse-g">' + growth(q.growthPct) + '<i>к прошлым ' + (P.len || 30) + ' дням</i></span>' +
          '<span class="mp-pulse-row"><span>неделя ' + growth(q.weekGrowthPct) + '</span><span>доля в «Красоте» ' + pctv(q.beautyShare) + ' ' + growth(q.beautyShareDeltaPp, true) + '</span></span>' +
          (P.stale ? '<span class="mp-stale">данные по ' + esc(dm(P.lastData)) + '</span>' : '') + '</button>';
      });
    });
    return '<div class="mp-kpis">' + out + '</div>';
  }

  // a highlight sentence → tile: marketplace tag, the first figure in large type, a short headline; the full text opens on click
  function fact(h) {
    var t = String(h), tag = '', m = t.match(/^(WB|Wildberries|Ozon)\b[^:]{0,24}:\s*/i);
    if (m) { tag = /^o/i.test(m[1]) ? 'Ozon' : 'WB'; t = t.slice(m[0].length); }
    var fig = t.match(/[+−]?\d+(?:[.,]\d+)?\s?%/) || t.match(/\d+(?:[.,]\d+)?\s?(?:млрд|млн|тыс\.)\s?₽/);
    var cut = t.search(/;| — |\.\s(?=[А-ЯЁA-Z])/), head = cut > 24 ? t.slice(0, cut) : t;
    if (head.length > 92) head = head.slice(0, 92).replace(/[\s,;:(]+\S*$/, '') + '…';
    var ft = fig ? fig[0].replace(/\s(?=%)/, '') : '';
    if (/^\d.*%$/.test(ft)) {
      var pre = t.slice(Math.max(0, fig.index - 16), fig.index);
      if (/(вырос|рост|прибав)\S*\s+(на\s+)?$/i.test(pre)) ft = '+' + ft; else if (/(упал|сниз|потер|просел)\S*\s+(на\s+)?$/i.test(pre)) ft = '−' + ft;
    }
    var cls = ft.charAt(0) === '+' ? 'up' : ft.charAt(0) === '−' ? 'down' : '';
    return '<details class="mp-fact"><summary>' + (tag ? '<span class="mp-fact-tag">' + tag + '</span>' : '') + (ft ? '<b class="num ' + cls + '">' + esc(ft) + '</b>' : '') + '<span>' + esc(head.charAt(0).toUpperCase() + head.slice(1)) + '</span></summary><p>' + esc(t) + '</p></details>';
  }

  function widgets(r, c, mp) {
    var out = '', N = (r.niches || []).slice().sort(byScore), W = (r.windows || []).slice().sort(byScore);
    if (N.length) {
      var cnt = { go: 0, watch: 0, stop: 0 }, names = { go: 'заходить', watch: 'наблюдать', stop: 'не заходить' };
      N.forEach(function (x) { var v = VERDICT[x.verdict]; if (v) cnt[v]++; });
      out += '<section class="mp-w"><h3>Ниши: решения</h3><div class="mp-stack" aria-hidden="true">' + ['go', 'watch', 'stop'].map(function (k) { return cnt[k] ? '<i class="' + k + '" style="flex:' + cnt[k] + '"></i>' : ''; }).join('') + '</div>' +
        '<div class="mp-stack-l">' + ['go', 'watch', 'stop'].map(function (k) { return '<span class="' + k + '"><b class="num">' + cnt[k] + '</b> ' + names[k] + '</span>'; }).join('') + '</div>' +
        '<ol class="mp-w-list">' + N.slice(0, 3).map(function (x) { return '<li><span>' + esc(x.name) + '<small>' + esc(MP[x.mp] || x.mp || '') + '</small></span><b class="num">' + esc(x.score) + '</b></li>'; }).join('') + '</ol>' + jump('niches', 'Все ниши: ' + N.length) + '</section>';
    }
    if (W.length) {
      out += '<section class="mp-w"><h3>Лучшее окно возможностей</h3><div class="mp-w-win">' + ring(W[0].score) + '<p>' + esc(W[0].title) + '</p></div>' +
        '<div class="in-meta">' + (W[0].mp ? '<span class="badge">' + esc(MP[W[0].mp] || W[0].mp) + '</span>' : '') + (W[0].category ? '<span class="badge">' + esc(W[0].category) + '</span>' : '') + '</div>' +
        (W.length > 1 ? '<ol class="mp-w-list" start="2">' + W.slice(1, 3).map(function (x) { return '<li><span>' + esc(x.title) + '</span><b class="num">' + esc(x.score) + '</b></li>'; }).join('') + '</ol>' : '') + jump('windows', 'Все окна: ' + W.length) + '</section>';
    }
    if (c && c.subcats) {
      var subs = c.subcats.filter(function (x) { return x.growthPct != null && (x.share || 0) >= 1; });
      var up = subs.filter(function (x) { return x.growthPct > 0; }).sort(function (a, b) { return b.growthPct - a.growthPct; }).slice(0, 3);
      var down = subs.filter(function (x) { return x.growthPct < 0; }).sort(function (a, b) { return a.growthPct - b.growthPct; }).slice(0, 3);
      var max = Math.max.apply(null, up.concat(down).map(function (x) { return Math.abs(x.growthPct); }).concat([1]));
      var row = function (x) { return '<li><span class="mp-mv-n">' + esc(x.name) + '</span><span class="mp-mv-t"><i class="' + (x.growthPct > 0 ? 'up' : 'down') + '" style="width:' + Math.max(4, Math.abs(x.growthPct) / max * 100).toFixed(0) + '%"></i></span>' + growth(x.growthPct) + '</li>'; };
      if (up.length || down.length) out += '<section class="mp-w"><h3>Растёт и падает</h3><small class="mp-w-sub">' + esc(c.label) + ' · ' + esc(MP[mp]) + ', подкатегории с долей от 1%</small><ul class="mp-movers">' + up.map(row).join('') + (up.length && down.length ? '<li class="mp-mv-sep" aria-hidden="true"></li>' : '') + down.map(row).join('') + '</ul>' + jump('sub', 'Все подкатегории') + '</section>';
    }
    if ((r.pains || []).length) out += '<section class="mp-w"><h3>На что жалуются покупатели</h3><ol class="mp-w-pains">' + r.pains.slice(0, 4).map(function (p) { return '<li>' + esc(p.pain) + '</li>'; }).join('') + '</ol>' + jump('pains', 'Цитаты и инсайты: ' + r.pains.length) + '</section>';
    if ((r.trends || []).length) out += '<section class="mp-w"><h3>Что двигает продажи</h3><div class="mp-w-chips">' + r.trends.map(function (t) { return '<span class="in-pchip">' + esc(t.title) + '</span>'; }).join('') + '</div>' + jump('trends', 'Подробнее о трендах') + '</section>';
    return out ? '<div class="mp-widgets">' + out + '</div>' : '';
  }
  function doneMap(id) { var all = BM.state.mpDone = BM.state.mpDone || {}; return all[id] = all[id] || {}; }

  function matrix(c) {
    var s = c.subcats.filter(function (x) { return x.growthPct != null; }).slice(0, 16);
    if (!s.length) return '';
    var W = 560, H = 300, pl = 44, pr = 16, pt = 14, pb = 34;
    var maxS = Math.max.apply(null, s.map(function (x) { return x.share; }).concat([5]));
    var gs = s.map(function (x) { return Math.max(-60, Math.min(80, x.growthPct)); });
    var minG = Math.min.apply(null, gs.concat([-10])), maxG = Math.max.apply(null, gs.concat([10]));
    var X = function (v) { return pl + Math.sqrt(v / maxS) * (W - pl - pr); };
    var Y = function (v) { return pt + (1 - (v - minG) / (maxG - minG)) * (H - pt - pb); };
    return '<svg class="mp-matrix" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Подкатегории: доля и рост">' +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" class="cf-axis"/>' +
      '<line x1="' + X(3) + '" x2="' + X(3) + '" y1="' + pt + '" y2="' + (H - pb) + '" class="cf-grid"/>' +
      '<text x="' + (W - pr) + '" y="' + (pt + 10) + '" class="cf-tlegend" text-anchor="end">растут</text><text x="' + (W - pr) + '" y="' + (H - pb - 6) + '" class="cf-tlegend" text-anchor="end">падают</text>' +
      '<text x="' + ((pl + W - pr) / 2) + '" y="' + (H - 8) + '" class="cf-ax" text-anchor="middle">доля в категории →</text>' +
      '<text x="' + (pl - 6) + '" y="' + Y(0) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">0%</text>' +
      s.map(function (x, i) {
        var g = gs[i], cx = X(x.share), cy = Y(g), rr = 4 + Math.sqrt(x.share) * 2.2;
        return '<g data-tip="' + esc(x.name + ': доля ' + x.share + '%, рост ' + x.growthPct + '%, ' + money(x.revenue)) + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" class="mp-dot ' + (g >= 0 ? 'up' : 'down') + '"/>' +
          '<text x="' + (cx + rr + 3) + '" y="' + cy + '" class="mp-dot-l" dominant-baseline="middle">' + esc(x.name) + '</text></g>';
      }).join('') + '</svg>';
  }
  function subTable(c) {
    return '<div class="table-wrap"><table class="table mp-table"><thead><tr><th scope="col">Подкатегория</th><th scope="col">Выручка</th><th scope="col">Рост</th><th scope="col">Доля</th><th scope="col">Δ доли</th><th scope="col">На товар с продажами</th><th scope="col">Товаров с продажами</th><th scope="col">Квадрант</th></tr></thead><tbody>' +
      c.subcats.slice(0, 20).map(function (s) {
        return '<tr><td>' + esc(s.name) + '</td><td class="num">' + money(s.revenue) + '</td><td class="num">' + growth(s.growthPct) + '</td><td class="num"><span class="mp-share"><i style="width:' + Math.min(100, s.share * 2.5) + '%"></i></span>' + pctv(s.share) + '</td><td class="num">' + growth(s.shareDeltaPp, true) + '</td><td class="num">' + money(s.revenuePerItemWithSells) + '</td><td class="num">' + pctv(s.itemsWithSellsPct) + '</td><td>' + esc(s.quadrant) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function productCards(list, mpKey, kind) {
    if (!list || !list.length) return '<p class="muted">Нет данных.</p>';
    return '<div class="mp-products">' + list.slice(0, kind === 'top' ? 12 : 10).map(function (x, i) {
      return '<article class="mp-prod"><div class="mp-prod-head"><span class="mp-rank">' + (i + 1) + '</span><div><b>' + link(x.url, x.name) + '</b><small>' + esc(x.brand) + ' · ' + esc(x.subcat) + (x.country ? ' · ' + esc(x.country) : '') + '</small></div></div>' +
        '<div class="mp-prod-meta"><span>' + n(x.price) + ' ₽</span>' + (kind === 'top' ? '<span>' + money(x.revenue) + ' за 30 дн.</span>' : '<span>' + money(x.daily7) + '/день</span><span>' + (x.accel ? '×' + x.accel : esc(x.signal)) + '</span>') +
        '<span>★ ' + (x.rating || '—') + ' · ' + n(x.comments) + ' отз.</span>' + (x.ageDays != null ? '<span>' + n(x.ageDays) + ' дн. на рынке</span>' : '') + '</div>' +
        (x.why ? '<p class="mp-why">' + esc(x.why) + '</p>' : '') + '</article>';
    }).join('') + '</div>';
  }
  function brandBlock(c) {
    var b = c.brands, row = function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="num">' + money(x.revenue) + '</td><td class="num">' + pctv(x.share) + '</td><td class="num">' + growth(x.growthPct) + '</td><td class="num">' + n(x.avgPrice) + ' ₽</td></tr>'; };
    return '<div class="mp-two"><div><h4>Топ брендов</h4><div class="table-wrap"><table class="table mp-table"><thead><tr><th scope="col">Бренд</th><th scope="col">Выручка</th><th scope="col">Доля</th><th scope="col">Рост</th><th scope="col">Ср. цена</th></tr></thead><tbody>' + b.top.slice(0, 12).map(row).join('') + '</tbody></table></div></div>' +
      '<div><h4>Быстрорастущие и новые</h4><div class="table-wrap"><table class="table mp-table"><thead><tr><th scope="col">Бренд</th><th scope="col">Выручка</th><th scope="col">Доля</th><th scope="col">Рост</th><th scope="col">Ср. цена</th></tr></thead><tbody>' + b.growing.concat(b.entrants).slice(0, 12).map(row).join('') + '</tbody></table></div>' +
      '<p class="small muted" style="margin-top:8px">Топ-10 брендов держат ' + pctv(c.concentration.top10BrandsShare) + ' выручки; новинки до 180 дней — ' + pctv(c.concentration.newItemsShareTop100) + ' выручки топ-100; медиана отзывов у лидеров ' + n(c.concentration.medianCommentsTop25) + '.</p></div></div>';
  }
  function priceBars(c) {
    if (!c.prices.length) return '';
    var max = Math.max.apply(null, c.prices.map(function (p) { return p.opportunity || 0; }).concat([1.5]));
    return '<ul class="cf-bars" role="list">' + c.prices.map(function (p) {
      return '<li data-tip="' + esc(p.range + ': доля выручки ' + p.shareRevenue + '%, доля товаров с продажами ' + p.shareItemsWithSells + '%, ' + money(p.revenuePerItemWithSells) + ' на товар') + '"><span class="cf-bar-l">' + esc(p.range) + '</span><span class="cf-bar-t"><i class="' + (p.opportunity >= 1.15 ? 'mp-hot' : '') + '" style="width:' + (p.opportunity / max * 100).toFixed(1) + '%"></i></span><span class="cf-bar-v num">×' + p.opportunity + '<small>' + pctv(p.shareRevenue) + '</small></span></li>';
    }).join('') + '</ul><p class="small muted" style="margin-top:8px">Индекс = доля выручки ÷ доля товаров с продажами. Больше 1 — спроса в сегменте больше, чем предложений.</p>';
  }
  function season(c) {
    var s = c.seasonality; if (!s || !s.index.length) return '';
    var NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var max = Math.max.apply(null, s.index.map(function (i) { return i.index; }));
    return '<div class="mp-season">' + s.index.map(function (i) {
      return '<div class="mp-season-col' + (s.peakMonths.indexOf(i.month) > -1 ? ' peak' : '') + '" data-tip="' + esc(NAMES[+i.month - 1] + ': ' + i.index) + '"><i style="height:' + (i.index / max * 100).toFixed(0) + '%"></i><small>' + NAMES[+i.month - 1] + '</small></div>';
    }).join('') + '</div><p class="small muted">Индекс сезонности: 100 — средний месяц. Пики выделены; товар лучше выводить за 2–3 месяца до пика.</p>';
  }
  function insightCards(r) {
    var out = '';
    if (r.windows && r.windows.length) out += '<h3 class="mp-h" id="mp-s-windows">Окна возможностей</h3><div class="in-grid">' + r.windows.slice().sort(byScore).map(function (w) {
      return '<article class="card in-card"><div class="mp-win-head">' + ring(w.score) + '<h3>' + esc(w.title) + '</h3></div>' +
        '<div class="in-meta">' + (w.mp ? '<span class="badge">' + esc(MP[w.mp] || w.mp) + '</span>' : '') + (w.category ? '<span class="badge">' + esc(w.category) + '</span>' : '') + '</div>' +
        (w.action ? '<div class="in-opp"><b>Что сделать</b>' + esc(w.action) + '</div>' : '') + (w.evidence ? more('Цифры и обоснование', '<div class="in-evidence">' + esc(w.evidence) + '</div>') : '') + '</article>';
    }).join('') + '</div>';
    if (r.pains && r.pains.length) out += '<h3 class="mp-h" id="mp-s-pains">Боли покупателей из отзывов</h3><div class="in-grid">' + r.pains.map(function (p) {
      var q = p.quotes || [];
      return '<article class="card in-card"><h3>' + esc(p.pain) + '</h3><div class="in-meta">' + (p.category ? '<span class="badge">' + esc(p.category) + '</span>' : '') + '</div>' +
        (q[0] ? '<p class="in-quote">«' + esc(q[0]) + '»</p>' : '') + (p.insight ? '<div class="in-opp"><b>Инсайт для продукта</b>' + esc(p.insight) + '</div>' : '') +
        (q.length > 1 || (p.products || []).length ? more('Ещё цитаты и товары', q.slice(1, 3).map(function (x) { return '<p class="in-quote">«' + esc(x) + '»</p>'; }).join('') + ((p.products || []).length ? '<div class="in-pchips">' + p.products.slice(0, 4).map(function (x) { return '<span class="in-pchip">' + esc(x) + '</span>'; }).join('') + '</div>' : '')) : '') + '</article>';
    }).join('') + '</div>';
    if (r.trends && r.trends.length) out += '<h3 class="mp-h" id="mp-s-trends">Что двигает продажи: компоненты и форматы</h3><div class="in-grid">' + r.trends.map(function (t) {
      return '<article class="card in-card"><h3>' + esc(t.title) + '</h3>' + ((t.products || []).length ? '<div class="in-pchips">' + t.products.slice(0, 5).map(function (x) { return '<span class="in-pchip">' + esc(x) + '</span>'; }).join('') + '</div>' : '') + (t.evidence ? more('На чём основано', '<p class="mp-more-p">' + esc(t.evidence) + '</p>') : '') + '</article>';
    }).join('') + '</div>';
    if (r.niches && r.niches.length) out += '<h3 class="mp-h" id="mp-s-niches">Ниши: скоринг</h3><div class="card"><p class="small muted" style="margin-bottom:8px">Нажмите на нишу, чтобы увидеть обоснование.</p><div class="mp-niches">' +
      r.niches.slice().sort(byScore).map(function (x) {
        var v = VERDICT[x.verdict] || '';
        return '<details class="mp-niche"><summary><span class="mp-niche-n"><b>' + esc(x.name) + '</b><small>' + esc(MP[x.mp] || x.mp || '') + (x.category ? ' · ' + esc(x.category) : '') + '</small></span><span class="mp-niche-bar"><i class="' + v + '" style="width:' + (x.score || 0) + '%"></i></span><b class="num mp-niche-s">' + esc(x.score) + '</b><span class="mp-verdict ' + v + '">' + esc(x.verdict) + '</span></summary><p>' + esc(x.reason) + '</p></details>';
      }).join('') + '</div></div>';
    if (r.decisions && r.decisions.length) {
      var done = doneMap(r.id), k = r.decisions.filter(function (d, i) { return done[i]; }).length;
      out += '<div class="card" id="mp-s-decisions"><div class="card-head"><h3>Решения до следующего отчёта</h3><span class="small muted" id="mp-done-n">' + k + ' из ' + r.decisions.length + '</span></div><div class="mp-progress"><i id="mp-done-bar" style="width:' + (k / r.decisions.length * 100).toFixed(0) + '%"></i></div>' +
        '<ul class="mp-todo">' + r.decisions.map(function (d, i) { return '<li' + (done[i] ? ' class="done"' : '') + '><label><input type="checkbox" data-mp-done="' + i + '" data-mp-week="' + esc(r.id) + '"' + (done[i] ? ' checked' : '') + '><span>' + esc(d) + '</span></label></li>'; }).join('') + '</ul></div>';
    }
    return out;
  }

  function history(mp, cat) {
    var ws = ((C.index && C.index.weeks) || []).slice().reverse().filter(function (w) { return w.kpi && w.kpi[mp] && w.kpi[mp][cat]; });
    if (ws.length < 2) return '<p class="small muted">История появится со второго отчёта: здесь будет видно, растёт ли доля категории.</p>';
    var vals = ws.map(function (w) { return w.kpi[mp][cat].beautyShare || 0; }), max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var W = 300, H = 60, X = function (i) { return 4 + i / (ws.length - 1) * (W - 8); }, Y = function (v) { return 6 + (1 - (v - min) / ((max - min) || 1)) * (H - 12); };
    return '<svg class="mp-spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Доля в «Красоте» по неделям"><path d="' + vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ') + '" class="cf-line"/>' +
      vals.map(function (v, i) { return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="8" class="cf-hit" data-tip="' + esc(ws[i].id + ': ' + v + '%') + '"/>'; }).join('') + '</svg>';
  }

  // ---------- top-10 dynamics ----------
  var GROUP_ORDER = ['cream', 'serum', 'toner', 'cleanse', 'hair'];
  var STATUS = {
    'растёт': 'up', 'падает': 'down', 'новый в топ-10': 'new', 'вернулся в топ-10': 'new', 'выбыл из топ-10': 'out', 'был в топ-10 раньше': 'out', 'стабильно': 'flat'
  };
  var MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  function wlabel(w) {
    var a = new Date(w.d1 + 'T00:00:00Z'), b = new Date(w.d2 + 'T00:00:00Z');
    return a.getUTCDate() + (a.getUTCMonth() !== b.getUTCMonth() ? ' ' + MONTHS[a.getUTCMonth()] : '') + '–' + b.getUTCDate() + ' ' + MONTHS[b.getUTCMonth()];
  }
  function short(name, n) { name = String(name || ''); return name.length > n ? name.slice(0, n - 1) + '…' : name; }
  function bump(G, weeks, mode) {
    var list = G.products.filter(function (x) { return x.ranks.some(function (r) { return r != null; }); });
    var nW = weeks.length, last = nW - 1;
    var W = 980, H = 470, pl = 70, pr = 330, pt = 34, pb = 26;
    var X = function (i) { return pl + i / (nW - 1) * (W - pl - pr); };
    var Y, ticks;
    if (mode === 'revenue') {
      var max = Math.max.apply(null, list.map(function (x) { return Math.max.apply(null, x.revenue.map(function (v) { return v || 0; })); }).concat([1]));
      Y = function (v) { return pt + (1 - (v || 0) / max) * (H - pt - pb); };
      ticks = [0, max / 2, max].map(function (v) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="cf-grid"/><text x="' + (pl - 10) + '" y="' + Y(v) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">' + money(v) + '</text>'; }).join('');
    } else {
      Y = function (r) { return pt + ((r == null ? 11.4 : r) - 1) / 10.4 * (H - pt - pb); };
      ticks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (r) { return '<text x="' + (pl - 12) + '" y="' + Y(r) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">' + r + '</text>'; }).join('') +
        '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ((Y(10) + Y(null)) / 2) + '" y2="' + ((Y(10) + Y(null)) / 2) + '" class="cf-axis" stroke-dasharray="4 4"/>' +
        '<text x="' + (pl - 12) + '" y="' + Y(null) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">вне</text>';
    }
    var cols = weeks.map(function (w, i) { return '<text x="' + X(i) + '" y="16" class="cf-tlegend" text-anchor="middle">' + esc(wlabel(w)) + '</text><line x1="' + X(i) + '" x2="' + X(i) + '" y1="' + (pt - 8) + '" y2="' + (H - pb + 6) + '" class="cf-grid"/>'; }).join('');
    var ordered = list.slice().sort(function (a, b) { return (STATUS[a.status] === 'out') - (STATUS[b.status] === 'out'); });
    var labelsUsed = [];
    var lines = ordered.map(function (x) {
      var cls = STATUS[x.status] || 'flat';
      var pts = x.ranks.map(function (r, i) { return mode === 'revenue' ? (x.revenue[i] == null ? null : [X(i), Y(x.revenue[i])]) : [X(i), Y(r)]; });
      var d = '', started = false;
      pts.forEach(function (p) { if (!p) { started = false; return; } d += (started ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' '; started = true; });
      var tip = x.brand + ' — ' + x.name + ' · места: ' + x.ranks.map(function (r) { return r || '—'; }).join(' → ') + ' · выручка: ' + x.revenue.map(function (v) { return v == null ? '—' : money(v); }).join(' → ') + ' · ' + x.status;
      var dots = pts.map(function (p, i) { return p ? '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === last ? 5 : 3.5) + '" class="mp-bd ' + cls + '"/>' : ''; }).join('');
      var label = '';
      var lp = pts[last];
      if (lp && (mode === 'revenue' || x.ranks[last] != null)) {
        var ly = lp[1];
        while (labelsUsed.some(function (u) { return Math.abs(u - ly) < 15; })) ly += 15;
        labelsUsed.push(ly);
        label = '<text x="' + (lp[0] + 12) + '" y="' + ly + '" class="mp-bl ' + cls + '" dominant-baseline="middle">' + (x.ranks[last] ? x.ranks[last] + '. ' : '') + esc(short(x.brand, 16)) + ' · ' + esc(short(x.name, 30)) + '</text>';
      }
      return '<g class="mp-bump-line ' + cls + '" data-tip="' + esc(tip) + '"><path d="' + d + '" class="mp-bp ' + cls + '"/>' + dots + label + '</g>';
    }).join('');
    return '<svg class="mp-bump" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Топ-10 по неделям: ' + esc(G.label) + '">' + cols + ticks + lines + '</svg>';
  }
  function dynTable(G, weeks) {
    var last = weeks.length - 1;
    var rows = G.products.slice().sort(function (a, b) { return (a.ranks[last] || 99) - (b.ranks[last] || 99) || (b.revenue[last] || 0) - (a.revenue[last] || 0); });
    return '<div class="table-wrap"><table class="table mp-table"><thead><tr><th scope="col">Место</th><th scope="col">Товар</th><th scope="col">Выручка по неделям</th><th scope="col">За неделю</th><th scope="col">Изм.</th><th scope="col">Статус</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var r = x.ranks[last], p = x.ranks[last - 1], mv = r && p ? p - r : null;
        var max = Math.max.apply(null, x.revenue.map(function (v) { return v || 0; }).concat([1]));
        var spark = '<span class="mp-mini">' + x.revenue.map(function (v, i) { return '<i title="' + esc(wlabel(weeks[i]) + ': ' + (v == null ? 'нет в топ-100' : money(v))) + '" style="height:' + Math.max(2, (v || 0) / max * 100).toFixed(0) + '%"' + (v == null ? ' class="none"' : '') + '></i>'; }).join('') + '</span>';
        return '<tr><td class="num"><b>' + (r || '—') + '</b>' + (mv ? ' <span class="mp-g ' + (mv > 0 ? 'up' : 'down') + '">' + (mv > 0 ? '↑' : '↓') + Math.abs(mv) + '</span>' : '') + '</td>' +
          '<td class="mp-prodcell">' + link(x.url, short(x.name, 70)) + '<small>' + esc(x.brand) + (x.price ? ' · ' + n(x.price) + ' ₽' : '') + (x.rating ? ' · ★ ' + x.rating : '') + '</small></td>' +
          '<td>' + spark + '</td><td class="num">' + money(x.revenue[last]) + '</td><td class="num">' + growth(x.changePct) + '</td>' +
          '<td><span class="mp-status ' + (STATUS[x.status] || 'flat') + '">' + esc(x.status) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function dynPanel(r, mp) {
    var D = r.dynamics;
    if (!D || !D.groups || !D.groups[mp]) return '<div class="card mp-dyn"><p class="muted">Динамика топ-10 появится в отчёте после следующего сбора данных.</p></div>';
    var groups = D.groups[mp], keys = GROUP_ORDER.filter(function (k) { return groups[k]; });
    var g = BM.ui.mpDynGroup && groups[BM.ui.mpDynGroup] ? BM.ui.mpDynGroup : keys[0];
    var G = groups[g], weeks = (D.weeksByMp && D.weeksByMp[mp]) || D.weeks, mode = BM.ui.mpDynMode || 'rank';
    var last = weeks.length - 1, cnt = function (st) { return G.products.filter(function (x) { return STATUS[x.status] === st; }).length; };
    var stale = r.periods && r.periods.byMp && r.periods.byMp[mp] && r.periods.byMp[mp].stale;
    return '<div class="card mp-dyn" id="mp-dyn"><div class="card-head"><h2>Динамика топ-10 · ' + esc(MP[mp]) + '</h2><button type="button" class="btn sm ghost" data-mp-dyn>' + icon('x', 'sm') + 'Закрыть</button></div>' +
      '<div class="mp-dyn-bar"><div class="chips" role="group" aria-label="Группа товаров">' + keys.map(function (k) { return '<button type="button" class="chip" data-mp-dyngroup="' + k + '" aria-pressed="' + (k === g) + '">' + esc(groups[k].label) + '</button>'; }).join('') + '</div>' +
      '<div class="sys-seg" role="group" aria-label="Что показывать"><button type="button" data-mp-dynmode="rank" aria-pressed="' + (mode === 'rank') + '">Место в топе</button><button type="button" data-mp-dynmode="revenue" aria-pressed="' + (mode === 'revenue') + '">Выручка</button></div></div>' +
      '<p class="small muted" style="margin:4px 0 10px">Четыре недели подряд: ' + esc(wlabel(weeks[0])) + ' — ' + esc(wlabel(weeks[last])) + '.' + (stale ? ' Данные ' + esc(MP[mp]) + ' в MPStats обрываются ' + esc(r.periods.byMp[mp].lastData) + ', поэтому недели сдвинуты к последним доступным.' : '') +
      ' За неделю: растут ' + cnt('up') + ', падают ' + cnt('down') + ', новых в топ-10 ' + cnt('new') + ', выбыли ' + cnt('out') + '.</p>' +
      '<div class="mp-legend"><span class="up">растёт</span><span class="down">падает</span><span class="new">новый в топ-10</span><span class="out">выбыл</span><span class="flat">стабильно</span></div>' +
      '<div class="mp-bump-wrap">' + bump(G, weeks, mode) + '</div>' + dynTable(G, weeks) + '</div>';
  }

  // ---------- view ----------
  BM.mpstatsView = function () {
    var ui = BM.ui;
    loadIndex(false);
    var weeks = (C.index && C.index.weeks) || [];
    var wid = ui.mpWeek && weeks.some(function (w) { return w.id === ui.mpWeek; }) ? ui.mpWeek : (weeks[0] && weeks[0].id);
    ui.mpWeek = wid;
    if (wid && !C.weeks[wid] && canRead() && navigator.onLine) loadWeek(wid).then(rerender);
    var r = wid ? C.weeks[wid] : null;
    var mp = ui.mpMarket || 'wb', cat = ui.mpCat || 'face';
    var bar = '<div class="card in-head-card"><div class="field" style="flex:1 1 200px"><label for="mp-week">Отчёт</label><select class="select" id="mp-week">' +
      (weeks.length ? weeks.map(function (w) { return '<option value="' + esc(w.id) + '"' + (w.id === wid ? ' selected' : '') + '>' + esc(w.label || w.id) + '</option>'; }).join('') : '<option>Пока нет отчётов</option>') + '</select></div>' +
      '<div class="sys-seg" role="group" aria-label="Площадка">' + ['wb', 'ozon'].map(function (k) { return '<button type="button" data-mp-market="' + k + '" aria-pressed="' + (mp === k) + '">' + MP[k] + '</button>'; }).join('') + '</div>' +
      '<div class="sys-seg" role="group" aria-label="Категория">' + ['face', 'hair'].map(function (k) { return '<button type="button" data-mp-cat="' + k + '" aria-pressed="' + (cat === k) + '">' + CAT[k] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="btn' + (ui.mpDyn ? ' primary' : '') + '" data-mp-dyn aria-expanded="' + !!ui.mpDyn + '">' + icon('chart', 'sm') + 'Динамика топ-10</button>' +
      '<span class="small muted">' + (loading ? 'Загружаю…' : lastError ? 'Ошибка: ' + esc(lastError) : '') + '</span></div>';
    if (!r) return bar + '<div class="empty"><div class="e-icon">' + icon('chart') + '</div><h3>' + (weeks.length ? 'Загружаю отчёт…' : 'Первый отчёт MPStats ещё готовится') + '</h3><p>Отчёт собирается дважды в месяц, 1-го и 15-го числа, задачей «Аналитика MPStats» и хранится в вашем приватном репозитории данных. Excel-копии — в папке «аналитика MPStats» на компьютере.</p></div>';
    var m = r.markets[mp] || {}, c = m.categories && m.categories[cat];
    var P = (r.periods.byMp && r.periods.byMp[mp]) || r.periods;
    var NAV = [['main', 'Главное'], ['sub', 'Подкатегории'], ['top', 'Топ товаров'], ['rising', 'Растущие'], ['brands', 'Бренды'], ['windows', 'Окна'], ['pains', 'Боли'], ['trends', 'Тренды'], ['niches', 'Ниши'], ['decisions', 'Решения']];
    var html = bar +
      '<nav class="mp-nav" aria-label="Разделы отчёта">' + NAV.map(function (x) { return '<button type="button" class="chip" data-mp-jump="mp-s-' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</nav>' +
      (ui.mpDyn ? dynPanel(r, mp) : '') +
      kpiCards(r, mp, cat) +
      '<div class="card" id="mp-s-main"><div class="card-head"><h2>Главное за период</h2><span class="small muted">' + esc(MP[mp]) + ': ' + esc(dm(P.p30[0])) + ' — ' + esc(dm(P.p30[1])) + ' к ' + esc(dm(P.p30prev[0])) + ' — ' + esc(dm(P.p30prev[1])) + '</span></div>' +
      widgets(r, c, mp) +
      ((r.highlights || []).length ? '<h3 class="mp-sub">Ключевые факты <small>нажмите на карточку, чтобы раскрыть</small></h3><div class="mp-facts">' + r.highlights.map(fact).join('') + '</div>' : '') +
      '<div class="mp-fold">' + (r.summary ? more('Развёрнутый вывод', '<p class="in-summary">' + esc(r.summary) + '</p>') : '') +
      ((r.notes || []).length ? more('Как читать данные', '<ul class="muted small" style="padding-left:18px;margin-top:6px">' + r.notes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>') : '') + '</div></div>';
    if (c) {
      html += '<div class="card" id="mp-s-sub"><div class="card-head"><h2>' + esc(c.label) + ' · ' + esc(MP[mp]) + ': подкатегории</h2></div><div class="mp-two"><div>' + matrix(c) + '</div><div><h4>Доля в «Красоте» по неделям</h4>' + history(mp, cat) +
        '<h4 style="margin-top:12px">Цены: где спрос выше предложения</h4>' + priceBars(c) + '</div></div>' + more('Таблица по всем подкатегориям', subTable(c)) + '</div>' +
        '<div class="card" id="mp-s-top"><h2>Топ товаров и почему они в топе</h2>' + productCards(c.topProducts, mp, 'top') + '</div>' +
        '<div class="card" id="mp-s-rising"><h2>Быстро растущие товары</h2>' + productCards(c.risingProducts, mp, 'rising') + '</div>' +
        '<div class="card" id="mp-s-brands"><h2>Бренды</h2>' + brandBlock(c) + '</div>' +
        '<div class="card"><h2>Сезонность</h2>' + season(c) + '</div>';
    }
    html += insightCards(r);
    return html;
  };

  // tooltips for charts
  var tip = null;
  document.addEventListener('pointerover', function (e) {
    var el = e.target.closest && e.target.closest('.mp-root [data-tip]');
    if (!el) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'cf-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = el.getAttribute('data-tip'); tip.hidden = false;
  });
  document.addEventListener('pointermove', function (e) {
    if (!tip || tip.hidden) return;
    var x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14), y = e.clientY - tip.offsetHeight - 12;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = (y < 8 ? e.clientY + 18 : y) + 'px';
  });

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-mp-market]'))) { BM.ui.mpMarket = t.dataset.mpMarket; BM.render(); }
    else if ((t = e.target.closest('[data-mp-pick]'))) { var pk = t.dataset.mpPick.split(':'); BM.ui.mpMarket = pk[0]; BM.ui.mpCat = pk[1]; BM.render(); }
    else if ((t = e.target.closest('[data-mp-jump]'))) { var sec = document.getElementById(t.dataset.mpJump); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if ((t = e.target.closest('[data-mp-cat]'))) { BM.ui.mpCat = t.dataset.mpCat; BM.render(); }
    else if ((t = e.target.closest('[data-mp-dyn]'))) { BM.ui.mpDyn = !BM.ui.mpDyn; BM.render(); if (BM.ui.mpDyn) { var el = document.getElementById('mp-dyn'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    else if ((t = e.target.closest('[data-mp-dyngroup]'))) { BM.ui.mpDynGroup = t.dataset.mpDyngroup; BM.render(); }
    else if ((t = e.target.closest('[data-mp-dynmode]'))) { BM.ui.mpDynMode = t.dataset.mpDynmode; BM.render(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'mp-week') { BM.ui.mpWeek = t.value; BM.render(); return; }
    if (t.dataset && t.dataset.mpDone != null) {
      var done = doneMap(t.dataset.mpWeek);
      if (t.checked) done[t.dataset.mpDone] = true; else delete done[t.dataset.mpDone];
      BM.persist();
      var li = t.closest('li'), all = document.querySelectorAll('[data-mp-done]'), k = document.querySelectorAll('[data-mp-done]:checked').length;
      if (li) li.classList.toggle('done', t.checked);
      var nEl = document.getElementById('mp-done-n'), bar = document.getElementById('mp-done-bar');
      if (nEl) nEl.textContent = k + ' из ' + all.length;
      if (bar) bar.style.width = (all.length ? k / all.length * 100 : 0).toFixed(0) + '%';
    }
  });
  BM.mpstatsRefresh = function () { loadIndex(true); var id = BM.ui.mpWeek; if (id) loadWeek(id).then(rerender); };
})();
