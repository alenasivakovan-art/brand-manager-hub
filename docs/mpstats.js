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
      return '<div class="card mp-kpi"><small>' + esc(c.label) + '</small><b class="num">' + money(q.revenue) + '</b>' +
        '<div class="mp-kpi-row"><span>к прошлым 30 дням ' + growth(q.growthPct) + '</span><span>неделя ' + growth(q.weekGrowthPct) + '</span></div>' +
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
    if (r.decisions && r.decisions.length) out += '<div class="card"><h3>Решения недели</h3><ol class="mp-decisions">' + r.decisions.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ol></div>';
    return out;
  }
  function history(mp, cat) {
    var ws = ((C.index && C.index.weeks) || []).slice().reverse().filter(function (w) { return w.kpi && w.kpi[mp] && w.kpi[mp][cat]; });
    if (ws.length < 2) return '<p class="small muted">История появится со второй недели: здесь будет видно, растёт ли доля категории.</p>';
    var vals = ws.map(function (w) { return w.kpi[mp][cat].beautyShare || 0; }), max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var W = 300, H = 60, X = function (i) { return 4 + i / (ws.length - 1) * (W - 8); }, Y = function (v) { return 6 + (1 - (v - min) / ((max - min) || 1)) * (H - 12); };
    return '<svg class="mp-spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Доля в «Красоте» по неделям"><path d="' + vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ') + '" class="cf-line"/>' +
      vals.map(function (v, i) { return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="8" class="cf-hit" data-tip="' + esc(ws[i].id + ': ' + v + '%') + '"/>'; }).join('') + '</svg>';
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
    var bar = '<div class="card in-head-card"><div class="field" style="flex:1 1 200px"><label for="mp-week">Неделя</label><select class="select" id="mp-week">' +
      (weeks.length ? weeks.map(function (w) { return '<option value="' + esc(w.id) + '"' + (w.id === wid ? ' selected' : '') + '>' + esc(w.label || w.id) + '</option>'; }).join('') : '<option>Пока нет отчётов</option>') + '</select></div>' +
      '<div class="sys-seg" role="group" aria-label="Площадка">' + ['wb', 'ozon'].map(function (k) { return '<button type="button" data-mp-market="' + k + '" aria-pressed="' + (mp === k) + '">' + MP[k] + '</button>'; }).join('') + '</div>' +
      '<div class="sys-seg" role="group" aria-label="Категория">' + ['face', 'hair'].map(function (k) { return '<button type="button" data-mp-cat="' + k + '" aria-pressed="' + (cat === k) + '">' + CAT[k] + '</button>'; }).join('') + '</div>' +
      '<span class="small muted">' + (loading ? 'Загружаю…' : lastError ? 'Ошибка: ' + esc(lastError) : '') + '</span></div>';
    if (!r) return bar + '<div class="empty"><div class="e-icon">' + icon('chart') + '</div><h3>' + (weeks.length ? 'Загружаю отчёт…' : 'Первый отчёт MPStats ещё готовится') + '</h3><p>Отчёт собирается еженедельно по понедельникам задачей «Аналитика MPStats» и хранится в вашем приватном репозитории данных. Excel-копии — в папке «аналитика MPStats» на компьютере.</p></div>';
    var m = r.markets[mp] || {}, c = m.categories && m.categories[cat];
    var P = r.periods;
    var html = bar +
      '<div class="card"><div class="card-head"><h2>Главное за неделю</h2><span class="small muted">' + esc(P.p30[0]) + ' — ' + esc(P.p30[1]) + ', сравнение с ' + esc(P.p30prev[0]) + ' — ' + esc(P.p30prev[1]) + '</span></div>' +
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
  });
  document.addEventListener('change', function (e) { if (e.target.id === 'mp-week') { BM.ui.mpWeek = e.target.value; BM.render(); } });
  BM.mpstatsRefresh = function () { loadIndex(true); var id = BM.ui.mpWeek; if (id) loadWeek(id).then(rerender); };
})();
