(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon;
  var CACHE_KEY = 'bmh-insights-cache';
  var SECTIONS = {
    trends: 'Тренды', needs: 'Потребности', market: 'Рынок и цифры', competitors: 'Конкуренты и запуски',
    regulation: 'Регулирование', channels: 'Каналы и маркетплейсы'
  };
  var TABS = [
    { id: 'overview', label: 'Обзор недели', icon: 'layout' },
    { id: 'world', label: 'Мировые рынки', icon: 'map' },
    { id: 'trends', label: 'Тренды России', icon: 'chart' },
    { id: 'pains', label: 'Боли и потребности', icon: 'users' },
    { id: 'mpstats', label: 'Аналитика MPStats', icon: 'chart' },
    { id: 'market', label: 'Рынок и конкуренты', icon: 'target' },
    { id: 'ideas', label: 'Идеи брендов', icon: 'bulb' },
    { id: 'stars', label: 'Избранное', icon: 'star' }
  ];
  var DIR = { up: '↑ растёт', down: '↓ снижается', new: 'новое', stable: '→ стабильно' };
  var LVL = { high: 'высокая', medium: 'средняя', low: 'низкая' };
  var REG = { KR: 'Южная Корея', US: 'США', JP: 'Япония', CN: 'Китай', EU: 'Европа', RU: 'Россия', GLOBAL: 'Мир' };
  var REG_ORDER = ['KR', 'US', 'JP', 'CN', 'EU'];
  var STAGE = { emerging: 'зарождается', growing: 'растёт', mainstream: 'массовый', fading: 'угасает' };
  var RUS = { none: 'в России пока нет', early: 'в России первые бренды', mass: 'в России уже массово' };

  function cache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || { index: null, weeks: {} }; } catch (e) { return { index: null, weeks: {} }; } }
  function saveCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {} }
  var C = cache();
  var loading = false, lastError = null;

  function canRead() { var s = BM.settings; return !!(s.owner && s.repo && s.token); }
  function ghRaw(path) {
    var s = BM.settings;
    var url = 'https://api.github.com/repos/' + encodeURIComponent(s.owner) + '/' + encodeURIComponent(s.repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    return fetch(url, { headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github.raw+json' }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return null;
        if (r.status === 401) throw new Error('токен недействителен');
        if (!r.ok) throw new Error('GitHub ответил ' + r.status);
        return r.json();
      });
  }
  function loadIndex(force) {
    if (!canRead() || !navigator.onLine || loading) return Promise.resolve();
    if (!force && C.index && Date.now() - (C.fetchedAt || 0) < 10 * 60 * 1000) return Promise.resolve();
    loading = true; lastError = null;
    return ghRaw('insights/index.json').then(function (idx) {
      C.index = idx || { weeks: [] }; C.fetchedAt = Date.now(); saveCache(C);
      var first = C.index.weeks && C.index.weeks[0];
      return first && !C.weeks[first.id] ? loadWeek(first.id) : null;
    }).catch(function (e) { lastError = e.message; }).then(function () { loading = false; rerender(); });
  }
  function loadWeek(id) {
    return ghRaw('insights/' + id + '.json').then(function (w) { if (w) { C.weeks[id] = w; saveCache(C); } });
  }
  function rerender() { if ((location.hash || '').indexOf('#/insights') === 0) BM.render(); }

  // ---------- small renderers ----------
  function sources(list) {
    if (!list || !list.length) return '';
    return '<div class="in-sources">' + list.slice(0, 4).map(function (s) {
      var host = ''; try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch (e) {}
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + icon('external', 'sm') + '<span>' + esc(s.title || host) + '</span></a>';
    }).join('') + '</div>';
  }
  function starBtn(week, type, item) {
    var key = week + ':' + item.id, on = !!(BM.state.insightStars || {})[key];
    return '<button type="button" class="icon-btn sm in-star" data-in-star="' + esc(key) + '" data-in-type="' + type + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Убрать из избранного' : 'В избранное') + '">' + icon('star', 'sm') + '</button>';
  }
  function pchips(list) { return '<span class="in-pchips">' + list.map(function (x) { return '<span class="in-pchip">' + esc(x) + '</span>'; }).join('') + '</span>'; }
  // Concrete breakdown: category › subcategory → product types → ingredients → price → examples → numbers.
  function breakdown(b) {
    if (!b) return '';
    var rows = [];
    if (b.category || b.subcategory) rows.push(['Категория', esc([b.category, b.subcategory].filter(Boolean).join(' › '))]);
    if (b.products && b.products.length) rows.push(['Виды продуктов', pchips(b.products)]);
    if (b.ingredients && b.ingredients.length) rows.push(['Ингредиенты и claims', pchips(b.ingredients)]);
    if (b.price) rows.push(['Цена', esc(b.price)]);
    if (b.examples && b.examples.length) rows.push(['Примеры', b.examples.map(esc).join('<br>')]);
    if (b.numbers && b.numbers.length) rows.push(['Цифры', b.numbers.map(esc).join('<br>')]);
    return rows.length ? '<dl class="in-bd">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' : '';
  }
  function tagChips(tags) {
    return tags && tags.length ? '<div class="chips">' + tags.map(function (t) { return '<button type="button" class="chip" style="min-height:28px;font-size:12px" data-in-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('') + '</div>' : '';
  }
  // ---------- widget helpers ----------
  var LV = { low: 1, medium: 2, high: 3 };
  function ring(score) {
    var rad = 20, len = 2 * Math.PI * rad, v = Math.max(0, Math.min(100, Math.round(score || 0)));
    return '<svg class="mp-ring" viewBox="0 0 52 52" role="img" aria-label="Оценка ' + v + ' из 100"><circle cx="26" cy="26" r="' + rad + '" class="mp-ring-bg"/><circle cx="26" cy="26" r="' + rad + '" class="mp-ring-fg" stroke-dasharray="' + (len * v / 100).toFixed(1) + ' ' + len.toFixed(1) + '" transform="rotate(-90 26 26)"/><text x="26" y="27" text-anchor="middle" dominant-baseline="middle">' + v + '</text></svg>';
  }
  function more(label, body) { return body ? '<details class="mp-more"><summary>' + esc(label) + '</summary>' + body + '</details>' : ''; }
  function meter(label, level, max, word) {
    var n = typeof level === 'number' ? level : (LV[level] || 0), cells = '';
    for (var i = 1; i <= max; i++) cells += '<i' + (i <= n ? ' class="on"' : '') + '></i>';
    return '<span class="in-meter"><small>' + esc(label) + '</small><span class="in-meter-b" aria-hidden="true">' + cells + '</span><b>' + esc(word) + '</b></span>';
  }
  // the opening clause of a long summary, shown as the headline of the week
  function lead(text) {
    var t = String(text || ''), cut = t.search(/:\s|\.\s(?=[А-ЯЁA-Z«])/);
    if (cut >= 20 && cut <= 170) return t.slice(0, cut);
    return t.length > 170 ? t.slice(0, 160).replace(/[\s,;:]+\S*$/, '') + '…' : t;
  }
  function cardTop(title, star) { return '<div class="in-card-top"><h3>' + esc(title) + '</h3>' + star + '</div>'; }

  function worldTrendCard(w, region, t) {
    return '<article class="card in-card">' + cardTop(t.title, starBtn(w.id, 'global', t)) +
      '<div class="in-meta"><span class="badge">' + esc(REG[region] || region) + '</span>' +
      (t.stage ? '<span class="in-dir ' + (t.stage === 'fading' ? 'down' : t.stage === 'emerging' ? 'new' : 'up') + '">' + esc(STAGE[t.stage] || t.stage) + '</span>' : '') +
      (t.ru_status ? '<span class="in-ru ' + esc(t.ru_status) + '">' + esc(RUS[t.ru_status] || t.ru_status) + '</span>' : '') + '</div>' +
      (t.ru_lag ? '<p class="in-lag">' + icon('calendar', 'sm') + '<span><b>Когда в России:</b> ' + esc(t.ru_lag) + '</span></p>' : '') +
      (t.opportunity ? '<div class="in-opp"><b>Возможность для бренда</b>' + esc(t.opportunity) + '</div>' : '') +
      more('Подробности и источники', (t.text ? '<p class="mp-more-p">' + esc(t.text) + '</p>' : '') + breakdown(t.breakdown) + (t.evidence ? '<div class="in-evidence">' + esc(t.evidence) + '</div>' : '') + tagChips(t.tags) + sources(t.sources)) + '</article>';
  }
  function leadersCard(g) {
    if (!g.leaders || !g.leaders.length) return '';
    return '<div class="card"><h3>Лидеры рынка: ' + esc(REG[g.region] || g.region) + '</h3><ul class="in-leaders">' + g.leaders.map(function (l) {
      return '<li><b>' + esc(l.brand) + '</b>' + (l.hero && l.hero.length ? pchips(l.hero) : '') + more('Почему в лидерах', (l.why ? '<p>' + esc(l.why) + '</p>' : '') + sources(l.sources)) + '</li>';
    }).join('') + '</ul></div>';
  }
  function signalCard(w, s) {
    var nums = (s.breakdown && s.breakdown.numbers) || [];
    return '<article class="card in-card">' + cardTop(s.title, starBtn(w.id, 'signal', s)) +
      '<div class="in-meta">' + (s.direction ? '<span class="in-dir ' + esc(s.direction) + '">' + esc(DIR[s.direction] || s.direction) + '</span>' : '') + '<span class="badge">' + esc(SECTIONS[s.section] || s.section || '') + '</span>' + (s.region && s.region !== 'RU' ? '<span class="badge">' + esc(REG[s.region] || s.region) + '</span>' : '') +
      (s.impact ? meter('влияние', s.impact, 3, LVL[s.impact] || s.impact) : '') + '</div>' +
      (nums.length ? '<ul class="in-nums">' + nums.slice(0, 2).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (s.implication ? '<div class="in-opp"><b>Что это значит для бренда</b>' + esc(s.implication) + '</div>' : '') +
      more('Подробности и источники', (s.text ? '<p class="mp-more-p">' + esc(s.text) + '</p>' : '') + breakdown(s.breakdown) + (s.evidence ? '<div class="in-evidence">' + esc(s.evidence) + '</div>' : '') + tagChips(s.tags) + sources(s.sources)) + '</article>';
  }
  function painCard(w, p) {
    var q = p.quotes || [];
    return '<article class="card in-card">' + cardTop(p.pain, starBtn(w.id, 'pain', p)) +
      '<div class="in-meta">' + meter('размер', p.size, 3, LVL[p.size] || '—') + meter('частота', p.frequency, 3, LVL[p.frequency] || '—') + '</div>' +
      (q[0] ? '<p class="in-quote">«' + esc(q[0]) + '»</p>' : '') +
      (p.unmet ? '<div class="in-opp"><b>Чего не хватает в текущих продуктах</b>' + esc(p.unmet) + '</div>' : '') +
      more('Кто, где и ещё цитаты', (p.segment ? '<p class="mp-more-p"><b>Кто:</b> ' + esc(p.segment) + '</p>' : '') + (p.product ? '<p class="mp-more-p"><b>Продукт:</b> ' + esc(p.product) + '</p>' : '') + (p.context ? '<p class="mp-more-p">' + esc(p.context) + '</p>' : '') +
        q.slice(1, 3).map(function (x) { return '<p class="in-quote">«' + esc(x) + '»</p>'; }).join('') + sources(p.sources)) + '</article>';
  }
  function ideaScore(i) { var v = (+i.size || 0) * (+i.frequency || 0) * (6 - (+i.competition || 3)); return Math.round(v / 125 * 100); }
  function kv(rows) { rows = rows.filter(function (x) { return x[1]; }); return rows.length ? '<div class="in-kv">' + rows.map(function (x) { return '<div><b>' + x[0] + '</b>' + esc(x[1]) + '</div>'; }).join('') + '</div>' : ''; }
  function ideaInner(w, i, brief) {
    return '<div class="in-idea-head">' + ring(ideaScore(i)) + '<h3>' + esc(i.title) + '</h3>' + starBtn(w.id, 'idea', i) + '</div>' +
      '<div class="in-meters">' + meter('Размер проблемы', +i.size || 0, 5, (i.size || '—') + '/5') + meter('Частота покупки', +i.frequency || 0, 5, (i.frequency || '—') + '/5') + meter('Конкуренция', +i.competition || 0, 5, (i.competition || '—') + '/5') + '</div>' +
      kv(brief ? [['Инсайт', i.insight], ['Продукт', i.product]] : [['Инсайт', i.insight], ['Продукт', i.product], ['Цена', i.price]]) +
      more('Аудитория, позиционирование, риски и проверка', kv((brief ? [['Цена', i.price]] : []).concat([['Для кого', i.audience], ['Позиционирование', i.positioning], ['Мировой ориентир', i.global_ref], ['Почему сейчас', i.why_now], ['Риски', i.risks], ['Как проверить за 2 недели', i.validate]])) + sources(i.sources)) +
      '<div class="row"><button type="button" class="btn sm primary" data-in-brand="' + esc(w.id + ':' + i.id) + '">' + icon('sparkle', 'sm') + 'Создать бренд из идеи</button><button type="button" class="btn sm" data-in-note="' + esc(w.id + ':' + i.id) + '">' + icon('note', 'sm') + 'В заметки проекта</button></div>';
  }
  function ideaCard(w, i) { return '<article class="card in-card">' + ideaInner(w, i) + '</article>'; }

  // ---------- widgets ----------
  // where each foreign trend stands in Russia: three lanes from «nobody yet» to «already mass»
  var LANES = [['none', 'В России пока нет', 'можно быть первым'], ['early', 'Первые бренды', 'окно ещё открыто'], ['mass', 'Уже массово', 'нужна отстройка']];
  function transfer(w, regions) {
    var all = [].concat.apply([], regions.map(withRegion)).filter(function (t) { return t.ru_status; });
    if (!all.length) return '';
    var so = { emerging: 0, growing: 1, mainstream: 2, fading: 3 }, href = '#/insights/' + esc(w.id) + '/world';
    var item = function (t) { return '<li><a href="' + href + '" data-in-region-go="' + esc(t._region) + '"><span class="in-cc" title="' + esc(REG[t._region] || t._region) + '">' + esc(t._region) + '</span><span class="in-lane-t">' + esc(t.title) + '</span>' + (t.stage ? '<i class="in-stage ' + esc(t.stage) + '">' + esc(STAGE[t.stage] || t.stage) + '</i>' : '') + '</a></li>'; };
    return '<div class="in-lanes">' + LANES.map(function (L) {
      var list = all.filter(function (t) { return t.ru_status === L[0]; }).sort(function (a, b) { return (so[a.stage] || 0) - (so[b.stage] || 0); });
      return '<section class="in-lane ' + L[0] + '"><header><h4>' + L[1] + '</h4><b class="num">' + list.length + '</b><small>' + L[2] + '</small></header>' +
        (list.length ? '<ul>' + list.slice(0, 4).map(item).join('') + '</ul>' + (list.length > 4 ? more('Ещё ' + (list.length - 4), '<ul>' + list.slice(4).map(item).join('') + '</ul>') : '') : '<p class="small muted">На этой неделе таких трендов нет</p>') + '</section>';
    }).join('') + '</div>';
  }
  // pains on a 3×3 field: problem size → right, purchase frequency → up; the numbers match the list beside it
  function painMatrix(pains) {
    var cells = '';
    ['high', 'medium', 'low'].forEach(function (fq) {
      ['low', 'medium', 'high'].forEach(function (sz) {
        var here = '';
        pains.forEach(function (p, i) { if ((p.frequency || 'medium') === fq && (p.size || 'medium') === sz) here += '<span class="in-pm-d" title="' + esc(p.pain) + '">' + (i + 1) + '</span>'; });
        cells += '<div class="in-pm-c' + (LV[fq] + LV[sz] >= 5 ? ' hot' : '') + '">' + here + '</div>';
      });
    });
    return '<div class="in-pmw"><div class="in-pm" role="img" aria-label="Боли по размеру проблемы и частоте"><span class="in-pm-y">чаще</span><div class="in-pm-g">' + cells + '</div><span class="in-pm-x">проблема больше</span></div>' +
      '<ol class="in-pm-l">' + pains.map(function (p) { return '<li>' + esc(p.pain) + '</li>'; }).join('') + '</ol></div>';
  }
  function sigStrip(list) {
    if (!list.length) return '';
    var d = { up: 0, 'new': 0, stable: 0, down: 0 }, names = { up: 'растут', 'new': 'новые', stable: 'стабильны', down: 'снижаются' }, hi = 0, sec = {};
    list.forEach(function (x) { if (d[x.direction] != null) d[x.direction]++; if (x.impact === 'high') hi++; sec[x.section] = (sec[x.section] || 0) + 1; });
    var keys = Object.keys(d).filter(function (k) { return d[k]; });
    return '<div class="card in-strip"><div class="in-strip-main"><div class="mp-stack" aria-hidden="true">' + keys.map(function (k) { return '<i class="' + k + '" style="flex:' + d[k] + '"></i>'; }).join('') + '</div>' +
      '<div class="mp-stack-l">' + keys.map(function (k) { return '<span class="' + k + '"><b class="num">' + d[k] + '</b> ' + names[k] + '</span>'; }).join('') + '</div></div>' +
      '<div class="in-strip-side">' + (hi ? '<span><b class="num">' + hi + '</b> с высоким влиянием</span>' : '') + Object.keys(sec).map(function (k) { return '<span class="in-pchip">' + esc(SECTIONS[k] || k) + ' ' + sec[k] + '</span>'; }).join('') + '</div></div>';
  }
  function sigRow(s) {
    var g = { up: '↑', down: '↓', 'new': '+', stable: '→' };
    return '<details class="in-rowd"><summary><span class="in-dir ' + esc(s.direction || '') + '" title="' + esc(DIR[s.direction] || '') + '">' + (g[s.direction] || '•') + '</span><span class="in-row-t">' + esc(s.title) + '</span>' + (s.impact === 'high' ? '<span class="in-hi">сильный</span>' : '') + '</summary>' +
      '<p>' + esc(s.implication || s.text || '') + '</p></details>';
  }

  function find(key) {
    var parts = key.split(':'), w = C.weeks[parts[0]];
    if (!w) return null;
    var all = [].concat(w.signals || [], w.pains || [], w.ideas || [], globalTrends(w));
    return { week: w, item: all.filter(function (x) { return x.id === parts.slice(1).join(':'); })[0] };
  }

  function withRegion(g) { return (g.trends || []).map(function (t) { return Object.assign({ _region: g.region }, t); }); }
  function globalTrends(w) { return [].concat.apply([], (w.global || []).map(withRegion)); }
  function sortedGlobal(w) {
    var o = function (r) { var i = REG_ORDER.indexOf(r); return i < 0 ? 9 : i; };
    return (w.global || []).slice().sort(function (a, b) { return o(a.region) - o(b.region); });
  }

  // ---------- page ----------
  BM.views.insights = function (weekId, tab) {
    var ui = BM.ui;
    tab = TABS.some(function (t) { return t.id === tab; }) ? tab : (ui.inTab || 'overview');
    ui.inTab = tab;
    loadIndex(false);
    var idx = C.index, weeks = (idx && idx.weeks) || [];
    var wid = weekId && weekId !== '-' ? weekId : (ui.inWeek && C.weeks[ui.inWeek] ? ui.inWeek : (weeks[0] && weeks[0].id));
    ui.inWeek = wid;
    if (wid && !C.weeks[wid] && canRead() && navigator.onLine) loadWeek(wid).then(rerender);
    var w = wid ? C.weeks[wid] : null;

    var head = '<div class="page-head"><div><span class="eyebrow">' + icon('radar', 'sm') + 'Тренды и рынок</span><h1 style="margin-top:8px">Рыночный радар: <span class="serif">уход за собой</span></h1>' +
      '<p>Каждую неделю Claude собирает из открытых источников тренды России и мировых рынков (Корея, США, Япония, Китай, Европа), боли покупателей, цифры рынка, запуски конкурентов и идеи для новых брендов.</p></div></div>';

    if (!canRead() && !weeks.length) {
      return '<div class="page">' + head + '<div class="card"><h2>Подключите данные</h2><p class="muted" style="margin-top:6px">Еженедельные дайджесты хранятся в вашем приватном репозитории данных, как и остальные данные проекта. Чтобы их видеть, включите синхронизацию:</p>' +
        '<ol class="in-empty-steps"><li>Откройте «Настройки» и вставьте токен GitHub для репозитория данных.</li><li>Вернитесь сюда — дайджесты загрузятся и сохранятся для работы без интернета.</li></ol><div class="actions" style="margin-top:12px"><a class="btn primary" href="#/settings">' + icon('sliders', 'sm') + 'Открыть настройки</a></div></div>' + howItWorks() + '</div>';
    }

    var toolbar = '<div class="card in-head-card"><div class="field" style="flex:1 1 240px"><label for="in-week">Неделя</label><select class="select" id="in-week">' +
      (weeks.length ? weeks.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === wid ? ' selected' : '') + '>' + esc(x.week || x.id) + '</option>'; }).join('') : '<option>Пока нет дайджестов</option>') + '</select></div>' +
      '<div class="stack" style="gap:2px;flex:1 1 220px"><span class="small muted">' + (loading ? 'Загружаю…' : lastError ? '<span style="color:var(--danger)">Ошибка: ' + esc(lastError) + '</span>' : (C.fetchedAt ? 'Обновлено ' + esc(BM.dateTime(C.fetchedAt)) : 'Из кеша')) + '</span>' +
      (w && w.generatedAt ? '<span class="small muted">Собрано ' + esc(BM.dateTime(w.generatedAt)) + '</span>' : '') + '</div>' +
      '<button type="button" class="btn" data-in-refresh>' + icon('refresh', 'sm') + 'Обновить</button></div>';

    var sg = (w && w.signals) || [], cnt = !w ? {} : { world: globalTrends(w).length, trends: sg.filter(function (x) { return x.section === 'trends' || x.section === 'needs'; }).length, pains: (w.pains || []).length, ideas: (w.ideas || []).length };
    if (w) cnt.market = sg.length - cnt.trends;
    cnt.stars = Object.keys(BM.state.insightStars || {}).length;
    var tabs = '<nav class="tabs" aria-label="Разделы радара">' + TABS.map(function (t) {
      return '<a class="tab' + (t.id === tab ? ' active' : '') + '" href="#/insights/' + esc(wid || '-') + '/' + t.id + '"' + (t.id === tab ? ' aria-current="page"' : '') + '>' + icon(t.icon, 'sm') + t.label + (cnt[t.id] ? '<span class="in-tab-n num">' + cnt[t.id] + '</span>' : '') + '</a>';
    }).join('') + '</nav>';

    var body;
    if (tab === 'stars') body = starsView();
    else if (tab === 'mpstats') body = '<div class="mp-root">' + (BM.mpstatsView ? BM.mpstatsView() : '') + '</div>';
    else if (!w) body = weeks.length ? '<div class="empty"><div class="e-icon">' + icon('refresh') + '</div><h3>Загружаю дайджест…</h3><p>Если интернета нет — откроется последняя сохранённая версия.</p></div>' :
      '<div class="empty"><div class="e-icon">' + icon('radar') + '</div><h3>Первый дайджест ещё готовится</h3><p>Задача «Рыночный радар» запускается по понедельникам в 08:00. Её можно запустить вручную в Claude: раздел Scheduled → «Рыночный радар: уход за собой» → Run now.</p></div>' + howItWorks();
    else body = weekView(w, tab);
    return '<div class="page">' + head + toolbar + tabs + body + '</div>';
  };

  function filterBar(items) {
    var tags = {};
    items.forEach(function (s) { (s.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
    var top = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 14);
    var ui = BM.ui;
    return '<div class="row"><label class="sr-only" for="in-q">Поиск</label><input class="input" id="in-q" type="search" data-in-q placeholder="Поиск: SPF, ретинол, сухая кожа…" value="' + esc(ui.inQ || '') + '" style="flex:1 1 240px;max-width:380px">' +
      (ui.inTag ? '<button type="button" class="chip active" data-in-tag="">#' + esc(ui.inTag) + ' ✕</button>' : '') + '</div>' +
      (top.length ? '<div class="chips">' + top.map(function (t) { return '<button type="button" class="chip" style="min-height:30px;font-size:12.5px" data-in-tag="' + esc(t) + '" aria-pressed="' + (ui.inTag === t) + '">#' + esc(t) + ' <span class="muted num">' + tags[t] + '</span></button>'; }).join('') + '</div>' : '');
  }
  function applyFilter(list, text) {
    var q = (BM.ui.inQ || '').toLowerCase(), tag = BM.ui.inTag;
    return list.filter(function (s) {
      if (tag && (s.tags || []).indexOf(tag) < 0) return false;
      if (q && text(s).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function grid(cards, emptyText) { return cards.length ? '<div class="in-grid">' + cards.join('') + '</div>' : '<p class="muted">' + esc(emptyText) + '</p>'; }

  function weekView(w, tab) {
    var signals = w.signals || [], pains = w.pains || [], ideas = (w.ideas || []).slice().sort(function (a, b) { return ideaScore(b) - ideaScore(a); });
    var sigText = function (s) { return [s.title, s.text, s.evidence, (s.tags || []).join(' ')].join(' '); };
    var go = function (t, label) { return '<a class="btn sm ghost" href="#/insights/' + esc(w.id) + '/' + t + '">' + esc(label) + icon('chevR', 'sm') + '</a>'; };
    if (tab === 'overview') {
      var impOrder = { high: 0, medium: 1, low: 2 }, gl = sortedGlobal(w);
      var top = signals.slice().sort(function (a, b) { return (impOrder[a.impact] || 1) - (impOrder[b.impact] || 1); }).slice(0, 5);
      var lanes = transfer(w, gl);
      return '<div class="card"><div class="card-head"><h2>Главное за неделю</h2><span class="small muted">' + esc(w.week || w.id) + '</span></div>' + (w.summary ? '<p class="in-leadline">' + esc(lead(w.summary)) + '</p>' + more('Читать вывод полностью', '<p class="in-summary">' + esc(w.summary) + '</p>') : '') + '</div>' +
        (lanes ? '<div class="card"><div class="card-head"><h2>Откуда придут тренды</h2>' + go('world', 'Мировые рынки') + '</div><p class="small muted in-sub">Тренды Кореи, США и других рынков — по тому, насколько они уже освоены в России.</p>' + lanes + '</div>' : '') +
        '<div class="in-two">' +
        (ideas.length ? '<div class="card in-card"><div class="card-head"><h2>Лучшая идея недели</h2>' + go('ideas', 'Все идеи: ' + ideas.length) + '</div>' + ideaInner(w, ideas[0], true) + '</div>' : '') +
        (top.length ? '<div class="card"><div class="card-head"><h2>Сильные сигналы в России</h2>' + go('trends', 'Все сигналы: ' + signals.length) + '</div><div class="in-rows">' + top.map(sigRow).join('') + '</div></div>' : '') + '</div>' +
        '<div class="in-two">' +
        (pains.length ? '<div class="card"><div class="card-head"><h2>Боли покупателей</h2>' + go('pains', 'Цитаты') + '</div>' + painMatrix(pains) + '</div>' : '') +
        (w.watch && w.watch.length ? '<div class="card"><div class="card-head"><h2>За чем следить дальше</h2></div><ul class="in-watch">' + w.watch.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') + '</div>';
    }
    if (tab === 'world') {
      var gw = sortedGlobal(w);
      if (!gw.length) return '<div class="empty"><div class="e-icon">' + icon('map') + '</div><h3>В этом дайджесте мировых данных нет</h3><p>Отдельный сбор по Корее, США, Японии, Китаю и Европе начнётся со следующего выпуска радара.</p></div>';
      var reg = BM.ui.inRegion && gw.some(function (g) { return g.region === BM.ui.inRegion; }) ? BM.ui.inRegion : '';
      var shown = reg ? gw.filter(function (g) { return g.region === reg; }) : gw;
      var tText = function (t) { return [t.title, t.text, t.evidence, t.opportunity, JSON.stringify(t.breakdown || {}), (t.tags || []).join(' ')].join(' '); };
      var wl = transfer(w, shown);
      return '<div class="chips in-regions" role="group" aria-label="Страна"><button type="button" class="chip" data-in-region="" aria-pressed="' + !reg + '">Все страны</button>' +
        gw.map(function (g) { return '<button type="button" class="chip" data-in-region="' + esc(g.region) + '" aria-pressed="' + (reg === g.region) + '">' + esc(REG[g.region] || g.region) + ' <span class="muted num">' + (g.trends || []).length + '</span></button>'; }).join('') + '</div>' +
        (wl ? '<div class="card"><div class="card-head"><h2>Насколько тренды освоены в России</h2></div>' + wl + '</div>' : '') +
        filterBar([].concat.apply([], shown.map(withRegion))) +
        shown.map(function (g) {
          var ts = applyFilter(withRegion(g), tText);
          return '<section class="in-region"><div class="in-region-h"><h2>' + esc(REG[g.region] || g.region) + '</h2>' + (g.summary ? more('Обзор рынка', '<p class="in-summary">' + esc(g.summary) + '</p>') : '') + '</div>' +
            grid(ts.map(function (t) { return worldTrendCard(w, g.region, t); }), 'Ничего не найдено по фильтру.') + leadersCard(g) + '</section>';
        }).join('');
    }
    if (tab === 'trends') {
      var tr = signals.filter(function (s) { return s.section === 'trends' || s.section === 'needs'; });
      return sigStrip(tr) + filterBar(tr) + grid(applyFilter(tr, sigText).map(function (s) { return signalCard(w, s); }), 'Ничего не найдено по фильтру.');
    }
    if (tab === 'market') {
      var mk = signals.filter(function (s) { return ['market', 'competitors', 'regulation', 'channels'].indexOf(s.section) > -1; });
      return sigStrip(mk) + filterBar(mk) + grid(applyFilter(mk, sigText).map(function (s) { return signalCard(w, s); }), 'Ничего не найдено по фильтру.');
    }
    if (tab === 'pains') {
      return (pains.length ? '<div class="card"><div class="card-head"><h2>Какие боли важнее</h2><span class="small muted">правый верхний угол — большие и частые</span></div>' + painMatrix(pains) + '</div>' : '') +
        filterBar([]) + grid(applyFilter(pains, function (p) { return [p.pain, p.segment, p.context, (p.quotes || []).join(' '), p.unmet].join(' '); }).map(function (p) { return painCard(w, p); }), 'Ничего не найдено.');
    }
    if (tab === 'ideas') {
      var max = Math.max.apply(null, ideas.map(ideaScore).concat([1]));
      return (ideas.length ? '<div class="card"><div class="card-head"><h2>Рейтинг идей</h2><span class="small muted">размер проблемы × частота покупки × свобода ниши</span></div><ul class="cf-bars in-rank" role="list">' + ideas.map(function (i) {
        var v = ideaScore(i); return '<li><span class="cf-bar-l" title="' + esc(i.title) + '">' + esc(i.title) + '</span><span class="cf-bar-t"><i style="width:' + (v / max * 100).toFixed(0) + '%"></i></span><span class="cf-bar-v num">' + v + '</span></li>';
      }).join('') + '</ul></div>' : '') + grid(ideas.map(function (i) { return ideaCard(w, i); }), 'Идей пока нет.');
    }
    return '';
  }

  function starsView() {
    var stars = BM.state.insightStars || {};
    var keys = Object.keys(stars);
    if (!keys.length) return '<div class="empty"><div class="e-icon">' + icon('star') + '</div><h3>Избранное пусто</h3><p>Отмечайте звёздочкой сигналы, боли и идеи — они соберутся здесь из всех недель.</p></div>';
    var cards = keys.map(function (k) {
      var f = find(k);
      if (!f || !f.item) return '<article class="card in-card"><h3>' + esc(stars[k].title || k) + '</h3><p class="small muted">Неделя ' + esc(k.split(':')[0]) + ' ещё не загружена на это устройство.</p></article>';
      var t = stars[k].type;
      return t === 'idea' ? ideaCard(f.week, f.item) : t === 'pain' ? painCard(f.week, f.item) : t === 'global' ? worldTrendCard(f.week, f.item._region, f.item) : signalCard(f.week, f.item);
    });
    return grid(cards, '');
  }

  function howItWorks() {
    return '<div class="card"><h2>Как собирается радар</h2><ul style="margin:10px 0 0;padding-left:20px;color:var(--ink-2)">' +
      '<li>Еженедельно по понедельникам в 08:00 Claude ищет свежие материалы за 7–10 дней: отраслевые медиа о косметике и уходе, отчёты маркетплейсов и аналитических сервисов, новости ритейла, обсуждения и отзывы покупателей.</li>' +
      '<li>Отдельно собираются мировые рынки, откуда приходят тренды: Южная Корея и США каждую неделю, Япония, Китай и Европа — при заметных событиях. Для каждого тренда — стадия, есть ли он уже в России и какая возможность для нового бренда.</li>' +
      '<li>Каждый тренд раскладывается до конкретики: категория → подкатегория → виды продуктов → ингредиенты → цена → примеры брендов → цифры.</li>' +
      '<li>Каждый факт идёт со ссылкой на источник. Цифры без источника не публикуются — если данных нет, так и написано.</li>' +
      '<li>Боли покупателей собираются из отзывов и обсуждений с дословными цитатами.</li>' +
      '<li>Идеи брендов оцениваются по размеру проблемы, частоте покупки и конкуренции.</li>' +
      '<li>Задача работает, когда открыто приложение Claude на компьютере. Если компьютер был выключен — запустится при следующем открытии.</li></ul></div>';
  }

  // ---------- actions ----------
  BM.insightsMount = function () {
    var page = document.querySelector('.page');
    if (!page) return;
    page.addEventListener('change', function (e) {
      if (e.target.id === 'in-week') { BM.go('#/insights/' + e.target.value + '/' + (BM.ui.inTab || 'overview')); }
    });
    page.addEventListener('input', function (e) {
      if (e.target.matches('[data-in-q]')) {
        BM.ui.inQ = e.target.value;
        var pos = e.target.selectionStart;
        BM.render();
        var el = document.getElementById('in-q'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (er) {} }
      }
    });
    page.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-in-refresh]') && BM.mpstatsRefresh) BM.mpstatsRefresh();
      if (e.target.closest('[data-in-refresh]')) { loadIndex(true).then(function () { var id = BM.ui.inWeek; if (id) return loadWeek(id).then(rerender); }); BM.render(); return; }
      if ((t = e.target.closest('[data-in-region]'))) { BM.ui.inRegion = t.dataset.inRegion; BM.ui.inTag = ''; BM.render(); return; }
      if ((t = e.target.closest('[data-in-region-go]'))) { BM.ui.inRegion = t.dataset.inRegionGo; BM.ui.inTag = ''; if (location.hash === t.getAttribute('href')) { e.preventDefault(); BM.render(); } return; }
      if ((t = e.target.closest('[data-in-tag]'))) { var tg = t.dataset.inTag; BM.ui.inTag = BM.ui.inTag === tg ? '' : tg; BM.render(); return; }
      if ((t = e.target.closest('[data-in-star]'))) {
        var key = t.dataset.inStar, stars = BM.state.insightStars = BM.state.insightStars || {};
        if (stars[key]) delete stars[key];
        else { var f = find(key); stars[key] = { type: t.dataset.inType, title: f && f.item ? (f.item.title || f.item.pain) : '', at: Date.now() }; }
        BM.persist(); BM.render(); return;
      }
      if ((t = e.target.closest('[data-in-brand]'))) {
        var fi = find(t.dataset.inBrand); if (!fi || !fi.item) return;
        var i = fi.item;
        var p = BM.emptyProject({ name: i.title, category: 'Косметика и уход', status: 'idea', description: [i.insight, i.product ? 'Продукт: ' + i.product : '', i.price ? 'Цена: ' + i.price : ''].filter(Boolean).join('\n') });
        p.platform.audience = i.audience || ''; p.platform.problem = i.insight || ''; p.platform.usp = i.positioning || '';
        p.notes.push({ id: BM.uid(), title: 'Идея из рыночного радара', body: ideaText(fi.week, i), pinned: true, updatedAt: Date.now() });
        p.tasks.push({ id: BM.uid(), title: 'Проверить гипотезу: ' + (i.validate || 'спрос и готовность платить'), due: '', priority: 'high', note: '', done: false, createdAt: Date.now() });
        BM.state.projects.push(p); BM.touch(p);
        BM.toast('Бренд «' + p.name + '» создан из идеи'); BM.go('#/p/' + p.id + '/platform');
        return;
      }
      if ((t = e.target.closest('[data-in-note]'))) {
        var fn = find(t.dataset.inNote); if (!fn || !fn.item) return;
        if (!BM.state.projects.length) { BM.toast('Сначала создайте проект'); return; }
        BM.openModal({ title: 'Сохранить идею в заметки', submit: 'Сохранить',
          body: '<div class="field"><label for="f-pid">Проект</label><select class="select" id="f-pid" name="pid">' + BM.state.projects.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div>',
          onSubmit: function (d) {
            var pr = BM.project(d.pid);
            pr.notes.push({ id: BM.uid(), title: 'Идея: ' + fn.item.title, body: ideaText(fn.week, fn.item), pinned: false, updatedAt: Date.now() });
            BM.touch(pr); BM.toast('Идея сохранена в заметки «' + pr.name + '»');
          } });
      }
    });
  };
  function ideaText(w, i) {
    return [i.title, '', 'Инсайт: ' + (i.insight || ''), 'Для кого: ' + (i.audience || ''), 'Продукт: ' + (i.product || ''), 'Позиционирование: ' + (i.positioning || ''), 'Цена: ' + (i.price || ''),
      'Почему сейчас: ' + (i.why_now || ''), 'Риски: ' + (i.risks || ''), 'Как проверить: ' + (i.validate || ''), 'Оценка: размер ' + i.size + '/5, частота ' + i.frequency + '/5, конкуренция ' + i.competition + '/5',
      '', 'Источник: рыночный радар, ' + (w.week || w.id), (i.sources || []).map(function (s) { return '— ' + (s.title || '') + ' ' + s.url; }).join('\n')].join('\n');
  }
})();
