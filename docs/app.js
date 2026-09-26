(function () {
  'use strict';

  var STATE_KEY = 'bmh-state-v1';
  var SETTINGS_KEY = 'bmh-settings-v1';
  var THEME_KEY = 'bmh-theme';
  var DATA = window.APP_DATA;

  // ---------- persistence ----------
  function defaultState() {
    return {
      updatedAt: 0,
      checklistDone: {},
      marketplaceEntries: [],
      skuEntries: [],
      launchBudget: ''
    };
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var d = defaultState();
      for (var k in d) if (!(k in parsed)) parsed[k] = d[k];
      return parsed;
    } catch (e) { return defaultState(); }
  }
  function saveState(touch) {
    if (touch !== false) STATE.updatedAt = Date.now();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(STATE)); } catch (e) {}
    showSaved();
    scheduleSync();
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { owner: '', repo: '', token: '', path: 'data/state.json' };
    } catch (e) { return { owner: '', repo: '', token: '', path: 'data/state.json' }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var STATE = loadState();
  var SETTINGS = loadSettings();

  // ---------- theme ----------
  function getStoredTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function setStoredTheme(t) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  var CURRENT_THEME = getStoredTheme() || 'light';
  document.documentElement.setAttribute('data-theme', CURRENT_THEME);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function parseNum(s) {
    if (s == null || s === '') return null;
    var n = parseFloat(String(s).replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  function fmtMoney(n) {
    if (n == null) return '—';
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽';
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function fmtDateTime(ts) {
    try { return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  // ---------- checklist progress ----------
  function checklistTotals() {
    var total = 0, done = 0;
    DATA.checklistSections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        total++;
        if (STATE.checklistDone[it.id]) done++;
      });
    });
    return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
  }
  function sectionTotals(sec) {
    var total = sec.items.length, done = 0;
    sec.items.forEach(function (it) { if (STATE.checklistDone[it.id]) done++; });
    return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
  }

  // ---------- views ----------
  var openSections = {};

  function renderDashboard() {
    var t = checklistTotals();
    var latestEntries = {};
    (STATE.marketplaceEntries || []).forEach(function (e) { latestEntries[e.marketplace] = e; });
    var mpCards = Object.keys(DATA.marketplaces).map(function (mp) {
      var e = latestEntries[mp];
      var m = DATA.marketplaces[mp];
      return '<div class="card mp-card"><span class="badge" style="background:' + m.color + '">' + esc(m.label) + '</span>' +
        (e ? '<div class="stat"><div class="label">Неделя ' + esc(e.weekLabel) + '</div><div class="value">' + esc(e.ourRevenue || '—') + '</div></div>'
          : '<p style="margin-top:8px;">Нет записей ещё</p>') +
        '</div>';
    }).join('');
    return '' +
      '<section class="view">' +
        '<div>' +
          '<div class="eyebrow">Дашборд</div>' +
          '<h1>Центр управления запуском бренда</h1>' +
          '<p class="lede">Работает офлайн и синхронизируется между устройствами, когда есть интернет.</p>' +
        '</div>' +
        '<div class="progress-card">' +
          '<div class="progress-top"><div><div class="eyebrow">Чек-лист</div><div class="progress-num mono">' + t.done + ' из ' + t.total + '</div></div>' +
          '<div class="mono" style="color:var(--ink-muted);font-size:14px;">' + t.pct + '% готово</div></div>' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + t.pct + '%"></div></div>' +
          '<div class="row"><button class="btn primary" data-nav="checklist">Открыть чек-лист</button></div>' +
        '</div>' +
        '<div><h2>Маркетплейсы</h2><div class="card-grid thirds" style="margin-top:10px;">' + mpCards + '</div></div>' +
        '<div class="card"><h3>Юнит-экономика</h3><p>Быстрый калькулятор по SKU: себестоимость, комиссия площадки, ДРР, маржа.</p><div class="row"><button class="btn" data-nav="economics">Открыть калькулятор</button></div></div>' +
      '</section>';
  }

  function renderChecklistSections(filter) {
    filter = (filter || '').toLowerCase();
    return DATA.checklistSections.map(function (sec) {
      var items = sec.items.filter(function (it) { return !filter || it.label.toLowerCase().indexOf(filter) > -1; });
      if (filter && !items.length) return '';
      var st = sectionTotals(sec);
      var isOpen = openSections[sec.id] || !!filter;
      var itemsHtml = items.map(function (it) {
        var done = !!STATE.checklistDone[it.id];
        return '<li class="' + (done ? 'done' : '') + '"><input type="checkbox" id="chk-' + it.id + '" data-id="' + it.id + '" ' + (done ? 'checked' : '') + '><label for="chk-' + it.id + '">' + esc(it.label) + '</label></li>';
      }).join('');
      return '<div class="section-block' + (isOpen ? ' open' : '') + '" data-section="' + sec.id + '">' +
        '<div class="section-head" data-toggle-section="' + sec.id + '">' +
          '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
          '<h3>' + esc(sec.title) + '</h3><span class="pct">' + st.done + '/' + st.total + '</span>' +
        '</div>' +
        '<div class="section-items"><ul class="checklist">' + itemsHtml + '</ul></div>' +
      '</div>';
    }).join('');
  }

  function renderChecklist(filter) {
    filter = (filter || '');
    var t = checklistTotals();
    return '' +
      '<section class="view">' +
        '<div><div class="eyebrow">Чек-лист</div><h1>Чек-лист бренд-менеджера</h1></div>' +
        '<div class="progress-card"><div class="progress-top"><div class="progress-num mono">' + t.done + ' из ' + t.total + '</div><div class="mono" style="color:var(--ink-muted);font-size:14px;">' + t.pct + '% готово</div></div><div class="progress-bar"><div class="progress-fill" style="width:' + t.pct + '%"></div></div></div>' +
        '<input class="search" id="checklist-search" type="text" placeholder="Найти пункт..." value="' + esc(filter) + '">' +
        '<div id="sections-slot">' + renderChecklistSections(filter) + '</div>' +
      '</section>';
  }

  var mermaidReady = false;
  function ensureMermaid(cb) {
    if (window.mermaid) { mermaidReady = true; cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    s.onload = function () {
      try { window.mermaid.initialize({ startOnLoad: false, theme: CURRENT_THEME === 'dark' ? 'dark' : 'default' }); } catch (e) {}
      mermaidReady = true; cb();
    };
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  function renderProcess() {
    var pm = DATA.processMap;
    var diagrams = pm.diagrams.map(function (d, i) {
      var extra = d.bottlenecks ? '<p style="margin-top:12px;"><b>Где чаще всего застревает:</b></p><ul>' + d.bottlenecks.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '';
      return '<div><h2>' + esc(d.title) + '</h2><p class="lede">' + esc(d.note) + '</p>' +
        '<div class="mermaid-box"><pre class="mermaid" id="mmd-' + i + '">' + esc(d.mermaid) + '</pre></div>' + extra + '</div>';
    }).join('');
    var tables = pm.tables.map(function (t) {
      return '<div><h3>' + esc(t.title) + '</h3><div class="table-wrap"><table class="data-table"><thead><tr>' +
        t.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div></div>';
    }).join('');
    return '' +
      '<section class="view">' +
        '<div><div class="eyebrow">Процессы</div><h1>Карта процессов</h1><p class="lede">' + esc(pm.intro) + '</p></div>' +
        diagrams +
        '<div><h2>Сводные таблицы по шагам</h2>' + tables + '</div>' +
      '</section>';
  }

  var activeMpFilter = 'all';
  function withTrends() {
    var byMp = {}, out = [];
    (STATE.marketplaceEntries || []).slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (e) {
      var prev = byMp[e.marketplace], t = {};
      var curCat = parseNum(e.categoryRevenue), prevCat = prev ? parseNum(prev.categoryRevenue) : null;
      var curOur = parseNum(e.ourRevenue), prevOur = prev ? parseNum(prev.ourRevenue) : null;
      var curShare = parseNum(e.marketShare), prevShare = prev ? parseNum(prev.marketShare) : null;
      if (curCat != null && prevCat) t.categoryPct = (curCat - prevCat) / Math.abs(prevCat) * 100;
      if (curOur != null && prevOur) t.ourPct = (curOur - prevOur) / Math.abs(prevOur) * 100;
      if (curShare != null && prevShare != null) t.sharePP = curShare - prevShare;
      byMp[e.marketplace] = e;
      out.push({ entry: e, trends: t });
    });
    return out;
  }
  function trendChip(val, pp) {
    if (val == null) return '';
    var cls = val > 0.05 ? 'trend-up' : (val < -0.05 ? 'trend-down' : 'trend-flat');
    var sign = val > 0 ? '+' : '';
    return '<span class="trend-chip ' + cls + '">' + sign + val.toFixed(1) + (pp ? ' п.п.' : '%') + '</span>';
  }
  function badge(mp) {
    var m = DATA.marketplaces[mp] || { label: mp, color: '#888' };
    return '<span class="badge" style="background:' + m.color + '">' + esc(m.label) + '</span>';
  }

  var editingEntryId = null;
  var pendingDelete = null;
  function emptyEntryForm() {
    return { marketplace: 'wb', weekLabel: '', categoryRevenue: '', ourRevenue: '', marketShare: '', topProducts: '', declining: '', leaderChanges: '', source: '', notes: '' };
  }
  var entryForm = emptyEntryForm();

  function renderAnalytics() {
    var withT = withTrends(), latestByMp = {};
    withT.forEach(function (x) { latestByMp[x.entry.marketplace] = x; });
    var overview = Object.keys(DATA.marketplaces).map(function (mp) {
      var x = latestByMp[mp];
      if (!x) return '<div class="card mp-card">' + badge(mp) + '<p style="margin-top:8px;">Нет данных — добавьте запись ниже.</p></div>';
      var e = x.entry, t = x.trends, rows = [];
      if (e.ourRevenue) rows.push('<div class="stat"><div class="label">Ваша выручка</div><div class="value">' + esc(e.ourRevenue) + trendChip(t.ourPct) + '</div></div>');
      if (e.categoryRevenue) rows.push('<div class="stat"><div class="label">Объём категории</div><div class="value">' + esc(e.categoryRevenue) + trendChip(t.categoryPct) + '</div></div>');
      if (e.marketShare) rows.push('<div class="stat"><div class="label">Доля рынка</div><div class="value">' + esc(e.marketShare) + '%' + trendChip(t.sharePP, true) + '</div></div>');
      return '<div class="card mp-card">' + badge(mp) + '<div class="week" style="font-size:12.5px;color:var(--ink-muted);margin-top:6px;">Неделя: ' + esc(e.weekLabel) + '</div>' + rows.join('') + '</div>';
    }).join('');

    var f = entryForm;
    var mpOptions = Object.keys(DATA.marketplaces).map(function (mp) {
      return '<option value="' + mp + '"' + (f.marketplace === mp ? ' selected' : '') + '>' + esc(DATA.marketplaces[mp].label) + '</option>';
    }).join('');
    var form = '<div class="form-card"><h3>' + (editingEntryId ? 'Редактирование записи' : 'Новая запись за неделю') + '</h3>' +
      '<p class="form-hint">Впишите цифры из отчёта (MPStats / Wildbox / кабинет площадки).</p>' +
      '<div class="field-row">' +
        '<div class="field"><label>Неделя*</label><input id="f-week" type="text" placeholder="22–28 сентября 2026" value="' + esc(f.weekLabel) + '"></div>' +
        '<div class="field"><label>Маркетплейс*</label><select id="f-mp">' + mpOptions + '</select></div>' +
        '<div class="field"><label>Источник</label><input id="f-source" type="text" placeholder="MPStats, отчёт от 28.09" value="' + esc(f.source) + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Объём категории <span class="opt">(опц.)</span></label><input id="f-catrev" type="text" placeholder="340 млн ₽" value="' + esc(f.categoryRevenue) + '"></div>' +
        '<div class="field"><label>Ваша выручка <span class="opt">(опц.)</span></label><input id="f-ourrev" type="text" placeholder="2.1 млн ₽" value="' + esc(f.ourRevenue) + '"></div>' +
        '<div class="field"><label>Доля рынка, % <span class="opt">(опц.)</span></label><input id="f-share" type="text" placeholder="0.6" value="' + esc(f.marketShare) + '"></div>' +
      '</div>' +
      '<div class="field"><label>Топ-товары и почему</label><textarea id="f-top">' + esc(f.topProducts) + '</textarea></div>' +
      '<div class="field"><label>Просевшие товары и почему</label><textarea id="f-declining">' + esc(f.declining) + '</textarea></div>' +
      '<div class="field"><label>Смена лидеров и почему</label><textarea id="f-leaders">' + esc(f.leaderChanges) + '</textarea></div>' +
      '<div class="field"><label>Заметки <span class="opt">(опц.)</span></label><textarea id="f-notes">' + esc(f.notes) + '</textarea></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-submit" type="button">' + (editingEntryId ? 'Сохранить изменения' : 'Сохранить запись') + '</button>' +
      (editingEntryId ? '<button class="btn" id="f-cancel" type="button">Отменить</button>' : '') + '</div></div>';

    var entries = (STATE.marketplaceEntries || []).slice().sort(function (a, b) { return b.order - a.order; });
    if (activeMpFilter !== 'all') entries = entries.filter(function (e) { return e.marketplace === activeMpFilter; });
    var chips = '<div class="filter-row">' + ['all'].concat(Object.keys(DATA.marketplaces)).map(function (id) {
      var label = id === 'all' ? 'Все' : DATA.marketplaces[id].label;
      return '<button type="button" class="filter-chip' + (activeMpFilter === id ? ' active' : '') + '" data-filter="' + id + '">' + esc(label) + '</button>';
    }).join('') + '</div>';
    var history = !entries.length ? chips + '<div class="empty-state">Записей пока нет.</div>' : chips + entries.map(function (e) {
      var stats = [];
      if (e.categoryRevenue) stats.push('<div class="stat"><div class="label">Объём категории</div><div class="value">' + esc(e.categoryRevenue) + '</div></div>');
      if (e.ourRevenue) stats.push('<div class="stat"><div class="label">Ваша выручка</div><div class="value">' + esc(e.ourRevenue) + '</div></div>');
      if (e.marketShare) stats.push('<div class="stat"><div class="label">Доля рынка</div><div class="value">' + esc(e.marketShare) + '%</div></div>');
      var notes = [];
      if (e.topProducts) notes.push('<div><b>Топ-товары</b><p>' + esc(e.topProducts) + '</p></div>');
      if (e.declining) notes.push('<div><b>Просевшие товары</b><p>' + esc(e.declining) + '</p></div>');
      if (e.leaderChanges) notes.push('<div><b>Смена лидеров</b><p>' + esc(e.leaderChanges) + '</p></div>');
      if (e.notes) notes.push('<div><b>Заметки</b><p>' + esc(e.notes) + '</p></div>');
      var confirming = pendingDelete === e.id;
      return '<div class="entry-card"><div class="entry-head">' + badge(e.marketplace) + '<h3 style="margin:0;">' + esc(e.weekLabel) + '</h3></div>' +
        '<div class="entry-meta">Добавлено ' + fmtDate(e.order) + (e.source ? ' · источник: ' + esc(e.source) : '') + '</div>' +
        (stats.length ? '<div class="entry-grid">' + stats.join('') + '</div>' : '') +
        (notes.length ? '<div class="entry-notes">' + notes.join('') + '</div>' : '') +
        '<div class="entry-actions"><button class="btn" data-edit-entry="' + e.id + '">Редактировать</button>' +
        '<button class="btn ' + (confirming ? 'danger' : '') + '" data-delete-entry="' + e.id + '">' + (confirming ? 'Точно удалить?' : 'Удалить') + '</button></div></div>';
    }).join('');

    return '' +
      '<section class="view">' +
        '<div><div class="eyebrow">Аналитика</div><h1>Еженедельный трекер маркетплейсов</h1><p class="lede">Ручной ввод из ваших отчётов — тренд считается автоматически к предыдущей записи по площадке.</p></div>' +
        '<div><h2>Последние данные</h2><div class="card-grid thirds" style="margin-top:10px;">' + overview + '</div></div>' +
        '<div><h2>Добавить запись</h2>' + form + '</div>' +
        '<div><h2>История</h2>' + history + '</div>' +
        '<div class="info-box"><h3>Автодайджест рынка</h3><p>Еженедельный автосбор новостей рынка FMCG (по воскресеньям) работает только внутри Claude — статический офлайн-сайт не может сам ходить в интернет по расписанию. Смотрите его в <a href="' + DATA.externalLinks.filter(function(l){return l.title.indexOf('Аналитика в Claude')>-1 || l.kind.indexOf('Аналитика')>-1;})[0].url + '" target="_blank" rel="noopener">артефакте на claude.ai</a>.</p></div>' +
      '</section>';
  }

  function emptySkuForm() {
    return { name: '', costPrice: '', packaging: '', logisticsIn: '', commissionPct: '', logisticsOut: '', adPct: '', otherCosts: '', sellPrice: '' };
  }
  var skuForm = emptySkuForm();
  var editingSkuId = null;
  var pendingSkuDelete = null;

  function computeSku(s) {
    var sell = parseNum(s.sellPrice) || 0;
    var commissionPct = parseNum(s.commissionPct) || 0;
    var adPct = parseNum(s.adPct) || 0;
    var fee = sell * commissionPct / 100;
    var ad = sell * adPct / 100;
    var fixedCosts = (parseNum(s.costPrice) || 0) + (parseNum(s.packaging) || 0) + (parseNum(s.logisticsIn) || 0) + (parseNum(s.logisticsOut) || 0) + (parseNum(s.otherCosts) || 0);
    var totalCost = fixedCosts + fee + ad;
    var profit = sell - totalCost;
    var marginPct = sell ? (profit / sell * 100) : null;
    return { fee: fee, ad: ad, totalCost: totalCost, profit: profit, marginPct: marginPct };
  }

  function renderEconomics() {
    var f = skuForm;
    var form = '<div class="form-card"><h3>' + (editingSkuId ? 'Редактирование SKU' : 'Новый расчёт SKU') + '</h3>' +
      '<p class="form-hint">Быстрый калькулятор маржи. Подробный расчёт с формулами — в Юнит-экономика.xlsx (папка «бренд» на компьютере).</p>' +
      '<div class="field-row"><div class="field"><label>Название SKU*</label><input id="s-name" type="text" placeholder="Крем для рук 50мл" value="' + esc(f.name) + '"></div>' +
      '<div class="field"><label>Цена продажи, ₽*</label><input id="s-sell" type="text" inputmode="decimal" value="' + esc(f.sellPrice) + '"></div>' +
      '<div class="field"><label>Себестоимость, ₽</label><input id="s-cost" type="text" inputmode="decimal" value="' + esc(f.costPrice) + '"></div></div>' +
      '<div class="field-row"><div class="field"><label>Упаковка, ₽</label><input id="s-pack" type="text" inputmode="decimal" value="' + esc(f.packaging) + '"></div>' +
      '<div class="field"><label>Логистика до склада МП, ₽</label><input id="s-login" type="text" inputmode="decimal" value="' + esc(f.logisticsIn) + '"></div>' +
      '<div class="field"><label>Логистика МП (доставка покупателю), ₽</label><input id="s-logout" type="text" inputmode="decimal" value="' + esc(f.logisticsOut) + '"></div></div>' +
      '<div class="field-row"><div class="field"><label>Комиссия площадки, %</label><input id="s-comm" type="text" inputmode="decimal" value="' + esc(f.commissionPct) + '"></div>' +
      '<div class="field"><label>ДРР (реклама), %</label><input id="s-ad" type="text" inputmode="decimal" value="' + esc(f.adPct) + '"></div>' +
      '<div class="field"><label>Прочие расходы, ₽</label><input id="s-other" type="text" inputmode="decimal" value="' + esc(f.otherCosts) + '"></div></div>' +
      '<div class="form-actions"><button class="btn primary" id="s-submit" type="button">' + (editingSkuId ? 'Сохранить изменения' : 'Сохранить SKU') + '</button>' +
      (editingSkuId ? '<button class="btn" id="s-cancel" type="button">Отменить</button>' : '') + '</div></div>';

    var list = (STATE.skuEntries || []).slice().reverse().map(function (s) {
      var c = computeSku(s);
      var marginCls = c.marginPct == null ? '' : (c.marginPct >= 15 ? 'trend-up' : (c.marginPct < 0 ? 'trend-down' : 'trend-flat'));
      var confirming = pendingSkuDelete === s.id;
      return '<div class="entry-card"><div class="entry-head"><h3 style="margin:0;">' + esc(s.name || 'Без названия') + '</h3>' +
        '<span class="trend-chip ' + marginCls + '">' + (c.marginPct == null ? '—' : c.marginPct.toFixed(1) + '% маржа') + '</span></div>' +
        '<div class="entry-grid">' +
          '<div class="stat"><div class="label">Цена продажи</div><div class="value">' + fmtMoney(parseNum(s.sellPrice)) + '</div></div>' +
          '<div class="stat"><div class="label">Комиссия + ДРР</div><div class="value">' + fmtMoney(c.fee + c.ad) + '</div></div>' +
          '<div class="stat"><div class="label">Итоговая себестоимость</div><div class="value">' + fmtMoney(c.totalCost) + '</div></div>' +
          '<div class="stat"><div class="label">Прибыль с единицы</div><div class="value">' + fmtMoney(c.profit) + '</div></div>' +
        '</div>' +
        '<div class="entry-actions"><button class="btn" data-edit-sku="' + s.id + '">Редактировать</button>' +
        '<button class="btn ' + (confirming ? 'danger' : '') + '" data-delete-sku="' + s.id + '">' + (confirming ? 'Точно удалить?' : 'Удалить') + '</button></div></div>';
    }).join('');

    var budgetSection = '<div class="form-card"><h3>Точка безубыточности по бюджету запуска</h3>' +
      '<div class="field"><label>Бюджет запуска, ₽</label><input id="launch-budget" type="text" inputmode="decimal" value="' + esc(STATE.launchBudget) + '"></div>' +
      '<div id="breakeven-slot">' + renderBreakeven() + '</div></div>';

    return '' +
      '<section class="view">' +
        '<div><div class="eyebrow">Юнит-экономика</div><h1>Калькулятор маржи по SKU</h1></div>' +
        form +
        '<div><h2>Сохранённые расчёты</h2>' + (list || '<div class="empty-state">Пока нет расчётов.</div>') + '</div>' +
        budgetSection +
      '</section>';
  }
  function renderBreakeven() {
    var budget = parseNum(STATE.launchBudget);
    if (!budget || !(STATE.skuEntries || []).length) return '<p class="lede">Укажите бюджет запуска и хотя бы один SKU с положительной прибылью.</p>';
    var rows = (STATE.skuEntries || []).map(function (s) {
      var c = computeSku(s);
      if (c.profit <= 0) return '<tr><td>' + esc(s.name) + '</td><td>—</td><td>Прибыль на единицу отрицательна</td></tr>';
      var units = Math.ceil(budget / c.profit);
      return '<tr><td>' + esc(s.name) + '</td><td>' + units + ' шт.</td><td>' + fmtMoney(c.profit) + ' / шт.</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>SKU</th><th>Штук до окупаемости</th><th>Прибыль/шт.</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderDocs() {
    var cards = DATA.externalLinks.map(function (d) {
      return '<div class="card"><div class="kind">' + esc(d.kind) + '</div><h3>' + esc(d.title) + '</h3>' +
        (d.note ? '<p>' + esc(d.note) + '</p>' : '') +
        '<div class="row"><a class="btn primary" href="' + d.url + '" target="_blank" rel="noopener">Открыть</a></div></div>';
    }).join('');
    return '' +
      '<section class="view">' +
        '<div><div class="eyebrow">Документы</div><h1>Живые документы и файлы</h1><p class="lede">Excel «Юнит-экономика.xlsx» и офлайн-копии PDF/Word — в папке «бренд» на компьютере, вне этого приложения.</p></div>' +
        '<div class="card-grid">' + cards + '</div>' +
      '</section>';
  }

  // ---------- GitHub sync ----------
  var syncTimer = null;
  var syncStatus = 'idle'; // idle | ok | syncing | offline | err
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) { return String.fromCharCode('0x' + p1); }));
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
  }
  function ghHeaders() {
    return { 'Authorization': 'Bearer ' + SETTINGS.token, 'Accept': 'application/vnd.github+json' };
  }
  function ghUrl(path) {
    return 'https://api.github.com/repos/' + encodeURIComponent(SETTINGS.owner) + '/' + encodeURIComponent(SETTINGS.repo) + '/contents/' + path;
  }
  function canSync() { return !!(SETTINGS.owner && SETTINGS.repo && SETTINGS.token) && navigator.onLine; }

  function scheduleSync() {
    if (!canSync()) { setSyncStatus(navigator.onLine ? 'idle' : 'offline'); return; }
    clearTimeout(syncTimer);
    syncTimer = setTimeout(runSync, 1500);
  }

  function setSyncStatus(s) {
    syncStatus = s;
    var dot = document.getElementById('status-dot');
    if (!dot) return;
    dot.className = 'status-dot' + (s === 'offline' ? ' offline' : (s === 'syncing' ? ' syncing' : ''));
    dot.title = s === 'offline' ? 'Офлайн — изменения сохранены локально' : (s === 'syncing' ? 'Синхронизация...' : (s === 'err' ? 'Ошибка синхронизации' : 'Синхронизировано'));
  }

  function runSync() {
    if (!canSync()) { setSyncStatus(navigator.onLine ? 'idle' : 'offline'); return; }
    setSyncStatus('syncing');
    fetch(ghUrl(SETTINGS.path), { headers: ghHeaders() }).then(function (res) {
      if (res.status === 404) return { notFound: true };
      if (!res.ok) throw new Error('GET ' + res.status);
      return res.json();
    }).then(function (data) {
      var remote = null, sha = null;
      if (!data.notFound) {
        sha = data.sha;
        try { remote = JSON.parse(b64DecodeUnicode(data.content.replace(/\n/g, ''))); } catch (e) { remote = null; }
      }
      if (remote && remote.updatedAt > STATE.updatedAt) {
        STATE = remote;
        localStorage.setItem(STATE_KEY, JSON.stringify(STATE));
        render();
        setSyncStatus('ok');
        return null;
      }
      var body = {
        message: 'Sync from device ' + new Date().toISOString(),
        content: b64EncodeUnicode(JSON.stringify(STATE, null, 2))
      };
      if (sha) body.sha = sha;
      return fetch(ghUrl(SETTINGS.path), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()), body: JSON.stringify(body) })
        .then(function (res) { if (!res.ok) throw new Error('PUT ' + res.status); return res.json(); })
        .then(function () { setSyncStatus('ok'); SETTINGS.lastSyncAt = Date.now(); saveSettings(SETTINGS); });
    }).catch(function (e) {
      console.error('sync error', e);
      setSyncStatus('err');
    });
  }

  // ---------- settings view ----------
  function renderSettings() {
    var s = SETTINGS;
    return '' +
      '<section class="view">' +
        '<div><div class="eyebrow">Настройки</div><h1>Синхронизация между устройствами</h1></div>' +
        '<div class="sync-banner ' + (syncStatus === 'ok' ? 'ok' : (syncStatus === 'err' ? 'err' : '')) + '">' +
          (navigator.onLine ? (canSync() ? 'Синхронизация настроена' : 'Онлайн, но данные для синхронизации не заполнены') : 'Офлайн — данные сохраняются только на этом устройстве') +
        '</div>' +
        '<div class="info-box"><h3>Как это работает</h3><p>Данные (чек-лист, аналитика, юнит-экономика) хранятся в вашем приватном GitHub-репозитории в файле <code>' + esc(s.path) + '</code>. Токен нужен, чтобы приложение могло его читать/писать — введите его один раз на каждом устройстве, он остаётся только в этом браузере и никуда, кроме api.github.com, не отправляется.</p>' +
          '<ul><li>Зайдите на github.com → Settings → Developer settings → Fine-grained tokens → Generate new token</li>' +
          '<li>Repository access: только этот репозиторий (' + esc(s.owner || 'ваш-логин') + '/' + esc(s.repo || 'brand-manager-hub') + ')</li>' +
          '<li>Permissions → Contents: Read and write</li>' +
          '<li>Создайте токен, скопируйте его и вставьте сюда (в это поле, не в чат)</li></ul></div>' +
        '<div class="form-card">' +
          '<div class="field"><label>GitHub-логин (owner)</label><input id="set-owner" type="text" value="' + esc(s.owner) + '"></div>' +
          '<div class="field"><label>Репозиторий</label><input id="set-repo" type="text" value="' + esc(s.repo) + '"></div>' +
          '<div class="field"><label>Путь к файлу данных</label><input id="set-path" type="text" value="' + esc(s.path) + '"></div>' +
          '<div class="field"><label>Personal access token</label><input id="set-token" type="password" value="' + esc(s.token) + '" placeholder="github_pat_..."></div>' +
          '<div class="form-actions"><button class="btn primary" id="set-save">Сохранить</button><button class="btn" id="set-sync-now">Синхронизировать сейчас</button></div>' +
          (s.lastSyncAt ? '<p class="foot">Последняя синхронизация: ' + fmtDateTime(s.lastSyncAt) + '</p>' : '') +
        '</div>' +
        '<div class="card"><h3>Установить как приложение</h3><p>На телефоне: меню браузера → «Добавить на главный экран». На компьютере: иконка установки в адресной строке Chrome/Edge. После установки приложение открывается отдельным окном и работает офлайн.</p></div>' +
      '</section>';
  }

  // ---------- render / router ----------
  var VIEWS = {
    dashboard: { title: 'Дашборд', render: renderDashboard },
    checklist: { title: 'Чек-лист', render: function () { return renderChecklist(''); } },
    process: { title: 'Процессы', render: renderProcess },
    analytics: { title: 'Аналитика', render: renderAnalytics },
    economics: { title: 'Юнит-экономика', render: renderEconomics },
    docs: { title: 'Документы', render: renderDocs },
    settings: { title: 'Настройки', render: renderSettings }
  };
  var currentView = 'dashboard';

  function render() {
    var app = document.getElementById('app');
    app.innerHTML = VIEWS[currentView].render();
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === currentView);
    });
    if (currentView === 'process') {
      ensureMermaid(function () {
        if (window.mermaid) { try { window.mermaid.run({ querySelector: '.mermaid' }); } catch (e) {} }
      });
    }
  }

  function navigate(view) {
    if (!VIEWS[view]) return;
    currentView = view;
    location.hash = '#/' + view;
    render();
    window.scrollTo(0, 0);
  }

  function showSaved() {
    var t = document.getElementById('save-toast');
    if (!t) return;
    t.classList.add('show');
    clearTimeout(showSaved._h);
    showSaved._h = setTimeout(function () { t.classList.remove('show'); }, 1300);
  }

  // ---------- event delegation ----------
  document.addEventListener('DOMContentLoaded', function () {
    var shell = document.getElementById('shell');
    shell.addEventListener('click', function (e) {
      var navBtn = e.target.closest('[data-nav]');
      if (navBtn) { navigate(navBtn.getAttribute('data-nav')); return; }

      var themeBtn = e.target.closest('#theme-toggle');
      if (themeBtn) {
        CURRENT_THEME = CURRENT_THEME === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', CURRENT_THEME);
        setStoredTheme(CURRENT_THEME);
        return;
      }

      var secHead = e.target.closest('[data-toggle-section]');
      if (secHead) {
        var id = secHead.getAttribute('data-toggle-section');
        openSections[id] = !openSections[id];
        secHead.parentElement.classList.toggle('open', openSections[id]);
        return;
      }

      var filterBtn = e.target.closest('.filter-chip');
      if (filterBtn && filterBtn.hasAttribute('data-filter')) {
        activeMpFilter = filterBtn.getAttribute('data-filter');
        pendingDelete = null;
        render();
        return;
      }

      if (e.target.closest('#f-submit')) {
        entryForm.weekLabel = document.getElementById('f-week').value;
        entryForm.marketplace = document.getElementById('f-mp').value;
        entryForm.source = document.getElementById('f-source').value;
        entryForm.categoryRevenue = document.getElementById('f-catrev').value;
        entryForm.ourRevenue = document.getElementById('f-ourrev').value;
        entryForm.marketShare = document.getElementById('f-share').value;
        entryForm.topProducts = document.getElementById('f-top').value;
        entryForm.declining = document.getElementById('f-declining').value;
        entryForm.leaderChanges = document.getElementById('f-leaders').value;
        entryForm.notes = document.getElementById('f-notes').value;
        if (!entryForm.weekLabel.trim()) { document.getElementById('f-week').focus(); return; }
        if (editingEntryId) {
          STATE.marketplaceEntries = STATE.marketplaceEntries.map(function (en) {
            if (en.id !== editingEntryId) return en;
            var merged = Object.assign({}, en, entryForm);
            return merged;
          });
          editingEntryId = null;
        } else {
          STATE.marketplaceEntries.push(Object.assign({ id: uid(), order: Date.now() }, entryForm));
        }
        entryForm = emptyEntryForm();
        saveState();
        render();
        return;
      }
      if (e.target.closest('#f-cancel')) { editingEntryId = null; entryForm = emptyEntryForm(); render(); return; }
      var editEntryBtn = e.target.closest('[data-edit-entry]');
      if (editEntryBtn) {
        var eid = editEntryBtn.getAttribute('data-edit-entry');
        var en = (STATE.marketplaceEntries || []).filter(function (x) { return x.id === eid; })[0];
        if (en) { editingEntryId = eid; entryForm = Object.assign(emptyEntryForm(), en); render(); }
        return;
      }
      var delEntryBtn = e.target.closest('[data-delete-entry]');
      if (delEntryBtn) {
        var did = delEntryBtn.getAttribute('data-delete-entry');
        if (pendingDelete === did) {
          STATE.marketplaceEntries = STATE.marketplaceEntries.filter(function (x) { return x.id !== did; });
          pendingDelete = null; saveState(); render();
        } else { pendingDelete = did; render(); }
        return;
      }

      if (e.target.closest('#s-submit')) {
        skuForm.name = document.getElementById('s-name').value;
        skuForm.sellPrice = document.getElementById('s-sell').value;
        skuForm.costPrice = document.getElementById('s-cost').value;
        skuForm.packaging = document.getElementById('s-pack').value;
        skuForm.logisticsIn = document.getElementById('s-login').value;
        skuForm.logisticsOut = document.getElementById('s-logout').value;
        skuForm.commissionPct = document.getElementById('s-comm').value;
        skuForm.adPct = document.getElementById('s-ad').value;
        skuForm.otherCosts = document.getElementById('s-other').value;
        if (!skuForm.name.trim()) { document.getElementById('s-name').focus(); return; }
        if (editingSkuId) {
          STATE.skuEntries = STATE.skuEntries.map(function (en) { return en.id === editingSkuId ? Object.assign({}, en, skuForm) : en; });
          editingSkuId = null;
        } else {
          STATE.skuEntries.push(Object.assign({ id: uid() }, skuForm));
        }
        skuForm = emptySkuForm();
        saveState();
        render();
        return;
      }
      if (e.target.closest('#s-cancel')) { editingSkuId = null; skuForm = emptySkuForm(); render(); return; }
      var editSkuBtn = e.target.closest('[data-edit-sku]');
      if (editSkuBtn) {
        var sid = editSkuBtn.getAttribute('data-edit-sku');
        var sen = (STATE.skuEntries || []).filter(function (x) { return x.id === sid; })[0];
        if (sen) { editingSkuId = sid; skuForm = Object.assign(emptySkuForm(), sen); render(); }
        return;
      }
      var delSkuBtn = e.target.closest('[data-delete-sku]');
      if (delSkuBtn) {
        var dsid = delSkuBtn.getAttribute('data-delete-sku');
        if (pendingSkuDelete === dsid) {
          STATE.skuEntries = STATE.skuEntries.filter(function (x) { return x.id !== dsid; });
          pendingSkuDelete = null; saveState(); render();
        } else { pendingSkuDelete = dsid; render(); }
        return;
      }

      if (e.target.closest('#set-save')) {
        SETTINGS.owner = document.getElementById('set-owner').value.trim();
        SETTINGS.repo = document.getElementById('set-repo').value.trim();
        SETTINGS.path = document.getElementById('set-path').value.trim() || 'data/state.json';
        SETTINGS.token = document.getElementById('set-token').value.trim();
        saveSettings(SETTINGS);
        render();
        return;
      }
      if (e.target.closest('#set-sync-now')) { runSync(); return; }
    });

    shell.addEventListener('change', function (e) {
      var chk = e.target.closest('input[type="checkbox"][data-id]');
      if (chk) {
        STATE.checklistDone[chk.getAttribute('data-id')] = chk.checked;
        saveState();
        var li = chk.closest('li');
        li.classList.toggle('done', chk.checked);
        var block = chk.closest('.section-block');
        var secId = block.getAttribute('data-section');
        var sec = DATA.checklistSections.filter(function (s) { return s.id === secId; })[0];
        if (sec) {
          var st = sectionTotals(sec), t = checklistTotals();
          block.querySelector('.pct').textContent = st.done + '/' + st.total;
          if (currentView === 'checklist') {
            var pcard = document.querySelector('.progress-card .progress-num');
            if (pcard) pcard.textContent = t.done + ' из ' + t.total;
          }
        }
        return;
      }
      var budgetInput = e.target.closest('#launch-budget');
      if (budgetInput) {
        STATE.launchBudget = budgetInput.value;
        saveState();
        var slot = document.getElementById('breakeven-slot');
        if (slot) slot.innerHTML = renderBreakeven();
      }
    });

    shell.addEventListener('input', function (e) {
      if (e.target.id === 'checklist-search') {
        document.getElementById('sections-slot').innerHTML = renderChecklistSections(e.target.value);
      }
    });

    window.addEventListener('online', function () { setSyncStatus('idle'); scheduleSync(); });
    window.addEventListener('offline', function () { setSyncStatus('offline'); });

    var initHash = (location.hash || '').replace('#/', '');
    if (VIEWS[initHash]) currentView = initHash;
    render();
    setSyncStatus(navigator.onLine ? 'idle' : 'offline');
    if (canSync()) scheduleSync();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  });
})();
