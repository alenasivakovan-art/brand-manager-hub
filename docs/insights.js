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
  function worldTrendCard(w, region, t) {
    return '<article class="card in-card"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><h3>' + esc(t.title) + '</h3>' + starBtn(w.id, 'global', t) + '</div>' +
      '<div class="in-meta"><span class="badge">' + esc(REG[region] || region) + '</span>' +
      (t.stage ? '<span class="in-dir ' + (t.stage === 'fading' ? 'down' : t.stage === 'emerging' ? 'new' : 'up') + '">' + esc(STAGE[t.stage] || t.stage) + '</span>' : '') +
      (t.ru_status ? '<span class="in-ru ' + esc(t.ru_status) + '">' + esc(RUS[t.ru_status] || t.ru_status) + '</span>' : '') + '</div>' +
      (t.text ? '<p>' + esc(t.text) + '</p>' : '') + breakdown(t.breakdown) + (t.evidence ? '<div class="in-evidence">' + esc(t.evidence) + '</div>' : '') +
      (t.ru_lag ? '<p class="small"><b>Когда в России:</b> ' + esc(t.ru_lag) + '</p>' : '') +
      (t.opportunity ? '<div class="in-opp"><b>Возможность для бренда</b>' + esc(t.opportunity) + '</div>' : '') +
      tagChips(t.tags) + sources(t.sources) + '</article>';
  }
  function leadersCard(g) {
    if (!g.leaders || !g.leaders.length) return '';
    return '<div class="card"><h3>Лидеры рынка: ' + esc(REG[g.region] || g.region) + '</h3><ul class="in-leaders">' + g.leaders.map(function (l) {
      return '<li><b>' + esc(l.brand) + '</b><p>' + esc(l.why || '') + '</p>' + (l.hero && l.hero.length ? '<div><span class="small muted">Хиты: </span>' + pchips(l.hero) + '</div>' : '') + sources(l.sources) + '</li>';
    }).join('') + '</ul></div>';
  }
  function signalCard(w, s) {
    return '<article class="card in-card"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><h3>' + esc(s.title) + '</h3>' + starBtn(w.id, 'signal', s) + '</div>' +
      '<div class="in-meta"><span class="badge">' + esc(SECTIONS[s.section] || s.section || '') + '</span>' + (s.region && s.region !== 'RU' ? '<span class="badge">' + esc(REG[s.region] || s.region) + '</span>' : '') + (s.direction ? '<span class="in-dir ' + esc(s.direction) + '">' + esc(DIR[s.direction] || s.direction) + '</span>' : '') +
      (s.impact ? '<span class="in-imp">влияние: <b>' + esc(LVL[s.impact] || s.impact) + '</b></span>' : '') + '</div>' +
      '<p>' + esc(s.text) + '</p>' + breakdown(s.breakdown) + (s.evidence ? '<div class="in-evidence">' + esc(s.evidence) + '</div>' : '') +
      (s.implication ? '<p class="small"><b>Что это значит для бренда:</b> ' + esc(s.implication) + '</p>' : '') +
      (s.tags && s.tags.length ? '<div class="chips">' + s.tags.map(function (t) { return '<button type="button" class="chip" style="min-height:28px;font-size:12px" data-in-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('') + '</div>' : '') +
      sources(s.sources) + '</article>';
  }
  function painCard(w, p) {
    return '<article class="card in-card"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><h3>' + esc(p.pain) + '</h3>' + starBtn(w.id, 'pain', p) + '</div>' +
      '<div class="in-meta">' + (p.segment ? '<span class="badge">' + esc(p.segment) + '</span>' : '') + (p.product ? '<span class="badge">' + esc(p.product) + '</span>' : '') +
      '<span class="in-imp">размер: <b>' + esc(LVL[p.size] || p.size || '—') + '</b></span><span class="in-imp">частота: <b>' + esc(LVL[p.frequency] || p.frequency || '—') + '</b></span></div>' +
      (p.context ? '<p>' + esc(p.context) + '</p>' : '') +
      (p.quotes || []).slice(0, 3).map(function (q) { return '<p class="in-quote">«' + esc(q) + '»</p>'; }).join('') +
      (p.unmet ? '<p class="small"><b>Чего не хватает в текущих продуктах:</b> ' + esc(p.unmet) + '</p>' : '') + sources(p.sources) + '</article>';
  }
  function ideaScore(i) { var v = (+i.size || 0) * (+i.frequency || 0) * (6 - (+i.competition || 3)); return Math.round(v / 125 * 100); }
  function ideaCard(w, i) {
    return '<article class="card in-card"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><h3>' + esc(i.title) + '</h3><div class="row" style="gap:6px;flex-wrap:nowrap"><span class="in-total" title="Размер × частота × свобода ниши">' + ideaScore(i) + '/100</span>' + starBtn(w.id, 'idea', i) + '</div></div>' +
      '<div class="in-score"><div><small>Размер проблемы</small><b>' + esc(i.size || '—') + '/5</b></div><div><small>Частота покупки</small><b>' + esc(i.frequency || '—') + '/5</b></div><div><small>Конкуренция</small><b>' + esc(i.competition || '—') + '/5</b></div></div>' +
      '<div class="in-kv">' + [['Инсайт', i.insight], ['Мировой ориентир', i.global_ref], ['Для кого', i.audience], ['Продукт', i.product], ['Позиционирование', i.positioning], ['Цена', i.price], ['Почему сейчас', i.why_now], ['Риски', i.risks], ['Как проверить за 2 недели', i.validate]]
        .filter(function (x) { return x[1]; }).map(function (x) { return '<div><b>' + x[0] + '</b>' + esc(x[1]) + '</div>'; }).join('') + '</div>' +
      sources(i.sources) +
      '<div class="row"><button type="button" class="btn sm primary" data-in-brand="' + esc(w.id + ':' + i.id) + '">' + icon('sparkle', 'sm') + 'Создать бренд из идеи</button><button type="button" class="btn sm" data-in-note="' + esc(w.id + ':' + i.id) + '">' + icon('note', 'sm') + 'В заметки проекта</button></div></article>';
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

    var tabs = '<nav class="tabs" aria-label="Разделы радара">' + TABS.map(function (t) {
      return '<a class="tab' + (t.id === tab ? ' active' : '') + '" href="#/insights/' + esc(wid || '-') + '/' + t.id + '"' + (t.id === tab ? ' aria-current="page"' : '') + '>' + icon(t.icon, 'sm') + t.label + '</a>';
    }).join('') + '</nav>';

    var body;
    if (tab === 'stars') body = starsView();
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
    if (tab === 'overview') {
      var impOrder = { high: 0, medium: 1, low: 2 };
      var top = signals.slice().sort(function (a, b) { return (impOrder[a.impact] || 1) - (impOrder[b.impact] || 1); }).slice(0, 6);
      return '<div class="card"><div class="card-head"><h2>Главное за неделю</h2><span class="small muted">' + esc(w.week || w.id) + '</span></div><p class="in-summary">' + esc(w.summary || '') + '</p>' +
        '<div class="row" style="margin-top:12px"><span class="badge">' + signals.length + ' сигналов</span><span class="badge">' + pains.length + ' болей</span><span class="badge">' + ideas.length + ' идей</span></div></div>' +
        (ideas.length ? '<h2 style="margin-top:4px">Лучшие идеи недели</h2>' + grid(ideas.slice(0, 3).map(function (i) { return ideaCard(w, i); }), '') : '') +
        '<h2>Самые сильные сигналы в России</h2>' + grid(top.map(function (s) { return signalCard(w, s); }), 'Сигналов нет.') +
        (sortedGlobal(w).length ? '<h2>Мировые рынки коротко</h2><div class="in-grid">' + sortedGlobal(w).map(function (g) {
          return '<article class="card in-card"><h3>' + esc(REG[g.region] || g.region) + '</h3>' + (g.summary ? '<p>' + esc(g.summary) + '</p>' : '') +
            '<ul class="in-mini">' + (g.trends || []).slice(0, 4).map(function (t) { return '<li>' + esc(t.title) + (t.ru_status ? ' <span class="in-ru ' + esc(t.ru_status) + '">' + esc(RUS[t.ru_status] || '') + '</span>' : '') + '</li>'; }).join('') + '</ul>' +
            '<a class="btn sm" href="#/insights/' + esc(w.id) + '/world" data-in-region-go="' + esc(g.region) + '">' + icon('arrowR', 'sm') + 'Подробнее</a></article>';
        }).join('') + '</div>' : '') +
        (w.watch && w.watch.length ? '<div class="card"><h2>За чем следить дальше</h2><ul style="margin:10px 0 0;padding-left:20px">' + w.watch.map(function (x) { return '<li style="margin-bottom:6px">' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '');
    }
    if (tab === 'world') {
      var gl = sortedGlobal(w);
      if (!gl.length) return '<div class="empty"><div class="e-icon">' + icon('map') + '</div><h3>В этом дайджесте мировых данных нет</h3><p>Отдельный сбор по Корее, США, Японии, Китаю и Европе начнётся со следующего выпуска радара.</p></div>';
      var reg = BM.ui.inRegion && gl.some(function (g) { return g.region === BM.ui.inRegion; }) ? BM.ui.inRegion : '';
      var shown = reg ? gl.filter(function (g) { return g.region === reg; }) : gl;
      var tText = function (t) { return [t.title, t.text, t.evidence, t.opportunity, JSON.stringify(t.breakdown || {}), (t.tags || []).join(' ')].join(' '); };
      return '<div class="chips in-regions" role="group" aria-label="Страна"><button type="button" class="chip" data-in-region="" aria-pressed="' + !reg + '">Все страны</button>' +
        gl.map(function (g) { return '<button type="button" class="chip" data-in-region="' + esc(g.region) + '" aria-pressed="' + (reg === g.region) + '">' + esc(REG[g.region] || g.region) + ' <span class="muted num">' + (g.trends || []).length + '</span></button>'; }).join('') + '</div>' +
        filterBar([].concat.apply([], shown.map(withRegion))) +
        shown.map(function (g) {
          var ts = applyFilter(withRegion(g), tText);
          return '<section class="in-region"><h2>' + esc(REG[g.region] || g.region) + '</h2>' + (g.summary ? '<p class="in-summary" style="margin:6px 0 12px">' + esc(g.summary) + '</p>' : '') +
            grid(ts.map(function (t) { return worldTrendCard(w, g.region, t); }), 'Ничего не найдено по фильтру.') + leadersCard(g) + '</section>';
        }).join('');
    }
    if (tab === 'trends') {
      var tr = signals.filter(function (s) { return s.section === 'trends' || s.section === 'needs'; });
      return filterBar(tr) + grid(applyFilter(tr, sigText).map(function (s) { return signalCard(w, s); }), 'Ничего не найдено по фильтру.');
    }
    if (tab === 'market') {
      var mk = signals.filter(function (s) { return ['market', 'competitors', 'regulation', 'channels'].indexOf(s.section) > -1; });
      return filterBar(mk) + grid(applyFilter(mk, sigText).map(function (s) { return signalCard(w, s); }), 'Ничего не найдено по фильтру.');
    }
    if (tab === 'pains') {
      return filterBar([]) + grid(applyFilter(pains, function (p) { return [p.pain, p.segment, p.context, (p.quotes || []).join(' '), p.unmet].join(' '); }).map(function (p) { return painCard(w, p); }), 'Ничего не найдено.');
    }
    if (tab === 'ideas') {
      return '<p class="muted">Оценка = размер проблемы × частота покупки × свобода ниши (6 − конкуренция). Большие и частые проблемы в нишах без сильного лидера — лучший старт для нового бренда.</p>' +
        grid(ideas.map(function (i) { return ideaCard(w, i); }), 'Идей пока нет.');
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
      if (e.target.closest('[data-in-refresh]')) { loadIndex(true).then(function () { var id = BM.ui.inWeek; if (id) return loadWeek(id).then(rerender); }); BM.render(); return; }
      if ((t = e.target.closest('[data-in-region]'))) { BM.ui.inRegion = t.dataset.inRegion; BM.ui.inTag = ''; BM.render(); return; }
      if ((t = e.target.closest('[data-in-region-go]'))) { BM.ui.inRegion = t.dataset.inRegionGo; BM.ui.inTag = ''; return; }
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
