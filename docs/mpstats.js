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
  function kpiCards(r, mp) {
    var m = r.markets[mp]; if (!m) return '';
    return '<div class="mp-kpis">' + Object.keys(m.categories).map(function (k) {
      var c = m.categories[k], q = c.kpi;
      return '<div class="card mp-kpi"><small>' + esc(c.label) + (m.periods && m.periods.stale ? ' · данные по ' + esc(m.periods.lastData) : '') + '</small><b class="num">' + money(q.revenue) + '</b>' +
        '<div class="mp-kpi-row"><span>к прошлым ' + ((m.periods && m.periods.len) || 30) + ' дням ' + growth(q.growthPct) + '</span><span>неделя ' + growth(q.weekGrowthPct) + '</span></div>' +
        '<div class="mp-kpi-row"><span>доля в «Красоте» <b class="num">' + pctv(q.beautyShare) + '</b> ' + growth(q.beautyShareDeltaPp, true) + '</span></div>' +
        '<div class="mp-kpi-row muted"><span>товаров с продажами ' + pctv(q.itemsWithSellsPct) + '</span><span>брендов ' + n(q.brandsWithSells) + '</span></div></div>';
    }).join('') + '</div>';
  }
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
    if (r.windows && r.windows.length) out += '<h3 class="mp-h">Окна возможностей</h3><div class="in-grid">' + r.windows.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).map(function (w) {
      return '<article class="card in-card"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><h3>' + esc(w.title) + '</h3><span class="in-total">' + esc(w.score) + '/100</span></div>' +
        '<div class="in-meta">' + (w.mp ? '<span class="badge">' + esc(MP[w.mp] || w.mp) + '</span>' : '') + (w.category ? '<span class="badge">' + esc(w.category) + '</span>' : '') + '</div>' +
        '<div class="in-evidence">' + esc(w.evidence) + '</div>' + (w.action ? '<div class="in-opp"><b>Что сделать</b>' + esc(w.action) + '</div>' : '') + '</article>';
    }).join('') + '</div>';
    if (r.pains && r.pains.length) out += '<h3 class="mp-h">Боли покупателей из отзывов</h3><div class="in-grid">' + r.pains.map(function (p) {
      return '<article class="card in-card"><h3>' + esc(p.pain) + '</h3><div class="in-meta">' + (p.category ? '<span class="badge">' + esc(p.category) + '</span>' : '') + (p.products || []).slice(0, 3).map(function (x) { return '<span class="in-pchip">' + esc(x) + '</span>'; }).join('') + '</div>' +
        (p.quotes || []).slice(0, 3).map(function (q) { return '<p class="in-quote">«' + esc(q) + '»</p>'; }).join('') + (p.insight ? '<div class="in-opp"><b>Инсайт для продукта</b>' + esc(p.insight) + '</div>' : '') + '</article>';
    }).join('') + '</div>';
    if (r.trends && r.trends.length) out += '<h3 class="mp-h">Что двигает продажи: компоненты и форматы</h3><div class="in-grid">' + r.trends.map(function (t) {
      return '<article class="card in-card"><h3>' + esc(t.title) + '</h3><p>' + esc(t.evidence) + '</p>' + ((t.products || []).length ? '<div class="in-pchips">' + t.products.slice(0, 5).map(function (x) { return '<span class="in-pchip">' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</article>';
    }).join('') + '</div>';
    if (r.niches && r.niches.length) out += '<h3 class="mp-h">Ниши: скоринг</h3><div class="card"><div class="table-wrap"><table class="table mp-table"><thead><tr><th scope="col">Ниша</th><th scope="col">Площадка</th><th scope="col">Оценка</th><th scope="col">Решение</th><th scope="col">Почему</th></tr></thead><tbody>' +
      r.niches.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).map(function (x) {
        return '<tr><td><b>' + esc(x.name) + '</b><small class="muted" style="display:block">' + esc(x.category || '') + '</small></td><td>' + esc(MP[x.mp] || x.mp || '') + '</td><td class="num"><span class="mp-score"><i style="width:' + (x.score || 0) + '%"></i></span>' + esc(x.score) + '</td><td><span class="mp-verdict ' + (VERDICT[x.verdict] || '') + '">' + esc(x.verdict) + '</span></td><td class="mp-reason">' + esc(x.reason) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    if (r.decisions && r.decisions.length) out += '<div class="card"><h3>Решения до следующего отчёта</h3><ol class="mp-decisions">' + r.decisions.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ol></div>';
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
    var html = bar +
      (ui.mpDyn ? dynPanel(r, mp) : '') +
      '<div class="card"><div class="card-head"><h2>Главное за период</h2><span class="small muted">' + esc(P.p30[0]) + ' — ' + esc(P.p30[1]) + ', сравнение с ' + esc(P.p30prev[0]) + ' — ' + esc(P.p30prev[1]) + '</span></div>' +
      (r.summary ? '<p class="in-summary">' + esc(r.summary) + '</p>' : '') +
      ((r.highlights || []).length ? '<ul class="mp-highlights">' + r.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') +
      ((r.notes || []).length ? '<details class="small" style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Как читать данные</summary><ul class="muted" style="padding-left:18px;margin-top:6px">' + r.notes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>' +
      kpiCards(r, mp);
    if (c) {
      html += '<div class="card"><div class="card-head"><h2>' + esc(c.label) + ' · ' + esc(MP[mp]) + ': подкатегории</h2></div><div class="mp-two"><div>' + matrix(c) + '</div><div><h4>Доля в «Красоте» по неделям</h4>' + history(mp, cat) +
        '<h4 style="margin-top:12px">Цены: где спрос выше предложения</h4>' + priceBars(c) + '</div></div>' + subTable(c) + '</div>' +
        '<div class="card"><h2>Топ товаров и почему они в топе</h2>' + productCards(c.topProducts, mp, 'top') + '</div>' +
        '<div class="card"><h2>Быстро растущие товары</h2>' + productCards(c.risingProducts, mp, 'rising') + '</div>' +
        '<div class="card"><h2>Бренды</h2>' + brandBlock(c) + '</div>' +
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
    else if ((t = e.target.closest('[data-mp-cat]'))) { BM.ui.mpCat = t.dataset.mpCat; BM.render(); }
    else if ((t = e.target.closest('[data-mp-dyn]'))) { BM.ui.mpDyn = !BM.ui.mpDyn; BM.render(); if (BM.ui.mpDyn) { var el = document.getElementById('mp-dyn'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    else if ((t = e.target.closest('[data-mp-dyngroup]'))) { BM.ui.mpDynGroup = t.dataset.mpDyngroup; BM.render(); }
    else if ((t = e.target.closest('[data-mp-dynmode]'))) { BM.ui.mpDynMode = t.dataset.mpDynmode; BM.render(); }
  });
  document.addEventListener('change', function (e) { if (e.target.id === 'mp-week') { BM.ui.mpWeek = e.target.value; BM.render(); } });
  BM.mpstatsRefresh = function () { loadIndex(true); var id = BM.ui.mpWeek; if (id) loadWeek(id).then(rerender); };
})();
