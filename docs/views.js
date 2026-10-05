(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon;
  var V = BM.views = {};
  BM.ui = { projQuery: '', projStatus: '', projSort: 'recent', taskFilter: 'open', mpFilter: 'all', noteId: null, openSections: {}, checkQuery: '' };

  // ---------- small components ----------
  function avatar(p, size) { return '<div class="avatar ' + (size || '') + ' c-' + esc(p.color || 'sage') + '" aria-hidden="true">' + esc(BM.initials(p.name)) + '</div>'; }
  function statusBadge(st) { return '<span class="badge st-' + esc(st) + '"><span class="bdot"></span>' + esc(BM.statusLabel(st)) + '</span>'; }
  function mpBadges(list) { return (list || []).map(function (m) { return BM.MP[m] ? '<span class="badge mp-' + m + '">' + esc(BM.MP[m].label) + '</span>' : ''; }).join(''); }
  function ring(pct, label, cls) { return '<div class="ring ' + (cls || '') + '" style="--p:' + pct + '" role="img" aria-label="' + esc(label || '') + ' ' + pct + '%"><span>' + pct + '%</span></div>'; }
  function progress(pct, thin) { return '<div class="progress' + (thin ? ' thin' : '') + '" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>'; }
  function empty(ic, title, text, actions) {
    return '<div class="empty"><div class="e-icon">' + icon(ic) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  }
  function btn(action, label, opts) {
    opts = opts || {};
    var attrs = '';
    for (var k in (opts.data || {})) attrs += ' data-' + k + '="' + esc(opts.data[k]) + '"';
    return '<button type="button" class="btn ' + (opts.cls || '') + '" data-action="' + action + '"' + attrs + '>' + (opts.icon ? icon(opts.icon) : '') + esc(label) + '</button>';
  }
  BM.c = { avatar: avatar, statusBadge: statusBadge, mpBadges: mpBadges, btn: btn };

  function spark(values) {
    if (values.length < 2) return '';
    var w = 200, h = 44, pad = 4, min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) { return [pad + i * (w - pad * 2) / (values.length - 1), h - pad - (v - min) / span * (h - pad * 2)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + h + ' L' + pts[0][0].toFixed(1) + ' ' + h + ' Z"/><path class="l" d="' + d + '"/></svg>';
  }
  function trend(cur, prev, pp) {
    if (cur == null || prev == null || (!pp && !prev)) return '';
    var v = pp ? cur - prev : (cur - prev) / Math.abs(prev) * 100;
    var cls = v > 0.05 ? 'up' : (v < -0.05 ? 'down' : 'flat');
    return '<span class="trend ' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + (pp ? ' п.п.' : '%') + '</span>';
  }

  function projectCard(p) {
    var f = BM.folder(p.folderId), prog = BM.overallProgress(p), tp = BM.taskProgress(p);
    return '<article class="card clickable p-card">' +
      '<div class="p-card-top">' + avatar(p) +
        '<div class="p-card-title"><h3><a class="stretch" href="#/p/' + p.id + '">' + esc(p.name) + '</a></h3>' +
        '<p>' + esc([p.category, f ? f.name : ''].filter(Boolean).join(' · ') || 'Без категории') + '</p></div>' +
        (p.pinned ? '<span class="muted" title="Закреплён">' + icon('pin', 'sm') + '<span class="sr-only">Закреплён</span></span>' : '') +
        '<button type="button" class="icon-btn sm raise" data-action="project-menu" data-id="' + p.id + '" aria-label="Действия с проектом ' + esc(p.name) + '">' + icon('more') + '</button>' +
      '</div>' +
      '<div class="row">' + statusBadge(p.status) + mpBadges(p.marketplaces) + '</div>' +
      '<div class="stack" style="gap:6px"><div class="p-card-foot"><span>Готовность</span><span class="num">' + prog + '%</span></div>' + progress(prog, true) + '</div>' +
      '<div class="p-card-foot"><span>' + icon('tasks', 'sm') + ' ' + tp.open + ' ' + BM.plural(tp.open, 'задача', 'задачи', 'задач') + '</span><span>обновлён ' + esc(BM.date(p.updatedAt)) + '</span></div>' +
    '</article>';
  }

  // ---------- sidebar ----------
  V.sidebar = function (route) {
    var s = BM.state;
    function navItem(href, ic, label, active, count) {
      return '<a class="nav-item' + (active ? ' active' : '') + '" href="' + href + '"' + (active ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + esc(label) + '</span>' + (count != null ? '<span class="count">' + count + '</span>' : '') + '</a>';
    }
    function projLink(p) {
      var active = route.name === 'project' && route.id === p.id;
      return '<a class="nav-item' + (active ? ' active' : '') + '" href="#/p/' + p.id + '"' + (active ? ' aria-current="page"' : '') + '><span class="dot c-' + esc(p.color) + '"></span><span>' + esc(p.name) + '</span></a>';
    }
    var folders = s.folders.map(function (f) {
      var ps = BM.projectsIn(f.id);
      var active = route.name === 'projects' && route.folder === f.id;
      return '<a class="nav-item' + (active ? ' active' : '') + '" href="#/projects/' + f.id + '">' + icon('folder') + '<span>' + esc(f.name) + '</span><span class="count">' + ps.length + '</span></a>' +
        (ps.length ? '<div class="nav-sub">' + ps.map(projLink).join('') + '</div>' : '');
    }).join('');
    var loose = BM.projectsIn(null);
    return '' +
      '<a class="logo" href="#/"><span class="logo-mark">' + icon('sparkle') + '</span><span>Бренд-менеджер<small>студия запуска брендов</small></span></a>' +
      '<button type="button" class="search-trigger" data-action="cmdk">' + icon('search') + '<span class="st-label">Поиск и команды</span><span class="kbd">Ctrl K</span></button>' +
      btn('new-project', 'Новый проект', { cls: 'primary block', icon: 'plus' }) +
      '<nav class="nav-group" aria-label="Основная навигация">' +
        navItem('#/', 'home', 'Главная', route.name === 'home') +
        navItem('#/projects', 'grid', 'Все проекты', route.name === 'projects' && !route.folder, s.projects.length) +
        navItem('#/insights', 'radar', 'Тренды и рынок', route.name === 'insights') +
        navItem('#/system', 'network', 'Система маркетинга', route.name === 'system') +
        navItem('#/cost', 'calc', 'Себестоимость', route.name === 'cost') +
        navItem('#/kb', 'book', 'База знаний', route.name === 'kb') +
      '</nav>' +
      '<div class="nav-group"><div class="nav-label"><span>Папки</span><button type="button" class="icon-btn sm" data-action="new-folder" aria-label="Новая папка">' + icon('plus', 'sm') + '</button></div>' +
        (folders || '<p class="small muted" style="padding:0 10px">Создайте папку, чтобы группировать бренды — по клиентам, категориям или годам.</p>') +
      '</div>' +
      (loose.length ? '<div class="nav-group"><div class="nav-label"><span>Без папки</span></div>' + loose.map(projLink).join('') + '</div>' : '') +
      '<div class="sidebar-foot">' +
        '<div class="sync-pill"><span class="sync-dot ' + BM.syncStatus + '" data-sync-dot></span><span data-sync-label>' + esc(BM.syncLabel()) + '</span></div>' +
        '<div class="row" style="gap:4px">' + navItem('#/settings', 'sliders', 'Настройки', route.name === 'settings').replace('class="nav-item', 'style="flex:1" class="nav-item') +
        '<button type="button" class="icon-btn" data-action="toggle-theme" aria-label="' + (BM.isDark() ? 'Светлая тема' : 'Тёмная тема') + '">' + icon(BM.isDark() ? 'sun' : 'moon') + '</button></div>' +
      '</div>';
  };

  // ---------- home ----------
  V.home = function () {
    var s = BM.state, ps = s.projects;
    var h = new Date().getHours();
    var greet = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
    var openTasks = [];
    ps.forEach(function (p) { p.tasks.forEach(function (t) { if (!t.done) openTasks.push({ t: t, p: p }); }); });
    openTasks.sort(function (a, b) { return (a.t.due || '9999') < (b.t.due || '9999') ? -1 : 1; });
    var overdue = openTasks.filter(function (x) { return BM.isOverdue(x.t.due); }).length;
    var avg = ps.length ? Math.round(ps.reduce(function (a, p) { return a + BM.overallProgress(p); }, 0) / ps.length) : 0;
    var skuCount = ps.reduce(function (a, p) { return a + p.skus.length; }, 0);
    var recent = ps.slice().sort(function (a, b) { return (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt); }).slice(0, 5);
    var today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

    var hero = '<div class="card hero pad-lg span-8"><div class="hero-deco"></div>' +
      '<span class="eyebrow">' + icon('calendar', 'sm') + esc(today) + '</span>' +
      '<h1 style="margin-top:14px">' + greet + '. <span class="serif">Что строим сегодня?</span></h1>' +
      '<p>' + (ps.length ? ps.length + ' ' + BM.plural(ps.length, 'бренд', 'бренда', 'брендов') + ' в работе · ' + openTasks.length + ' ' + BM.plural(openTasks.length, 'открытая задача', 'открытые задачи', 'открытых задач') + (overdue ? ' · <b style="color:var(--danger)">' + overdue + ' просрочено</b>' : '') : 'Соберите бренд от идеи до первой продажи: платформа, чек-лист запуска, юнит-экономика и аналитика — в одном месте.') + '</p>' +
      '<div class="actions">' + btn('new-project', 'Новый проект', { cls: 'primary', icon: 'plus' }) + btn('new-folder', 'Папка', { icon: 'folderPlus' }) + btn('cmdk', 'Поиск', { cls: 'ghost', icon: 'search' }) + '</div></div>';

    var best = ps.slice().sort(function (a, b) { return BM.overallProgress(b) - BM.overallProgress(a); })[0];
    var focus = '<div class="card span-4 stack" style="gap:18px">' +
      '<div class="card-head" style="margin:0"><h3>' + icon('target') + 'Общая готовность</h3></div>' +
      '<div class="row" style="gap:16px;flex-wrap:nowrap">' + ring(avg, 'Средняя готовность', 'lg') + '<div class="stack" style="gap:4px"><b>' + (ps.length ? 'В среднем по ' + ps.length + ' ' + BM.plural(ps.length, 'бренду', 'брендам', 'брендам') : 'Пока нет брендов') + '</b><p class="muted small">Чек-лист запуска даёт 60% оценки, бренд-платформа — 40%.</p></div></div>' +
      (best ? '<a class="link-row" style="padding:12px;border:1px solid var(--line);border-radius:var(--r-md)" href="#/p/' + best.id + '">' + avatar(best, 'sm') + '<div class="t-main"><b>Лидер: ' + esc(best.name) + '</b><small>' + BM.overallProgress(best) + '% готовности</small></div>' + icon('chevR', 'sm') + '</a>' : '<p class="muted small">Создайте проект, и здесь появится прогресс.</p>') + '</div>';

    function stat(ic, label, value, sub) {
      return '<div class="card span-3 stat"><div class="label"><span class="stat-icon">' + icon(ic) + '</span>' + esc(label) + '</div><div class="value">' + value + '</div><div class="sub">' + sub + '</div></div>';
    }
    var stats = stat('grid', 'Проекты', ps.length, s.folders.length + ' ' + BM.plural(s.folders.length, 'папка', 'папки', 'папок')) +
      stat('tasks', 'Открытые задачи', openTasks.length, overdue ? '<span class="overdue">' + overdue + ' просрочено</span>' : 'без просрочек') +
      stat('checkSq', 'Пунктов чек-листа', ps.reduce(function (a, p) { return a + BM.checkProgress(p).done; }, 0), 'выполнено во всех брендах') +
      stat('box', 'SKU в расчёте', skuCount, 'юнит-экономика');

    if (!ps.length) {
      return '<div class="page"><section class="bento">' + hero + focus + '</section>' +
        empty('sparkle', 'Здесь появятся ваши бренды', 'Создайте первый проект — внутри будет бренд-платформа, чек-лист из 64 шагов запуска, калькулятор юнит-экономики, задачи и заметки.',
          btn('new-project', 'Создать бренд', { cls: 'primary', icon: 'plus' }) + btn('new-folder', 'Сначала папку', { icon: 'folderPlus' })) + '</div>';
    }

    var recentHtml = '<div class="card span-8"><div class="card-head"><h2>Продолжить работу</h2><a class="btn ghost sm" href="#/projects">Все' + icon('chevR', 'sm') + '</a></div><div class="list" style="border:none">' +
      recent.map(function (p) {
        var prog = BM.overallProgress(p);
        return '<a class="link-row" href="#/p/' + p.id + '">' + avatar(p) + '<div class="t-main"><b>' + esc(p.name) + '</b><small>' + esc(BM.statusLabel(p.status)) + (p.category ? ' · ' + esc(p.category) : '') + '</small>' +
          '<div style="margin-top:8px;max-width:260px">' + progress(prog, true) + '</div></div><span class="num muted small">' + prog + '%</span>' + icon('chevR', 'sm') + '</a>';
      }).join('') + '</div></div>';

    var tasksHtml = '<div class="card span-4"><div class="card-head"><h2>Ближайшие задачи</h2></div>' +
      (openTasks.length ? '<ul class="checklist">' + openTasks.slice(0, 6).map(function (x) {
        return '<li class="check-row"><input type="checkbox" class="cbox" id="ht-' + x.t.id + '" data-task-toggle="' + x.t.id + '" data-pid="' + x.p.id + '"><label for="ht-' + x.t.id + '">' + esc(x.t.title) +
          '<span class="t-meta" style="display:block;font-size:12.5px;color:var(--muted)">' + esc(x.p.name) + (x.t.due ? ' · <span class="' + (BM.isOverdue(x.t.due) ? 'overdue' : '') + '">' + esc(BM.relDay(x.t.due)) + '</span>' : '') + '</span></label></li>';
      }).join('') + '</ul>' : '<p class="muted small">Открытых задач нет. Добавляйте их во вкладке «Задачи» проекта или из пунктов чек-листа.</p>') + '</div>';

    var foldersHtml = '<div class="card span-12"><div class="card-head"><h2>Папки</h2>' + btn('new-folder', 'Новая папка', { cls: 'ghost sm', icon: 'plus' }) + '</div>' +
      (s.folders.length ? '<div class="grid tight">' + s.folders.map(folderCard).join('') + '</div>' : '<p class="muted small">Папок пока нет — группируйте бренды по клиентам, категориям или сезонам.</p>') + '</div>';

    return '<div class="page"><section class="bento">' + hero + focus + stats + recentHtml + tasksHtml + foldersHtml + '</section></div>';
  };

  function folderCard(f, active) {
    var n = BM.projectsIn(f.id).length;
    return '<div class="card flat clickable folder-card' + (active ? ' active' : '') + '" style="position:relative">' +
      '<span class="folder-icon c-' + esc(f.color || 'sage') + '">' + icon('folder') + '</span>' +
      '<div class="meta"><b><a class="stretch" href="#/projects/' + f.id + '">' + esc(f.name) + '</a></b><span>' + n + ' ' + BM.plural(n, 'проект', 'проекта', 'проектов') + '</span></div>' +
      '<button type="button" class="icon-btn sm raise" data-action="folder-menu" data-id="' + f.id + '" aria-label="Действия с папкой ' + esc(f.name) + '">' + icon('more') + '</button></div>';
  }

  // ---------- projects ----------
  V.projects = function (folderId) {
    var s = BM.state, ui = BM.ui;
    var folder = folderId && folderId !== 'none' ? BM.folder(folderId) : null;
    var list = s.projects.filter(function (p) {
      if (folderId === 'none' && p.folderId) return false;
      if (folder && p.folderId !== folder.id) return false;
      if (ui.projStatus && p.status !== ui.projStatus) return false;
      if (ui.projQuery && (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().indexOf(ui.projQuery.toLowerCase()) < 0) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (b.pinned !== a.pinned) return b.pinned - a.pinned;
      if (ui.projSort === 'name') return a.name.localeCompare(b.name, 'ru');
      if (ui.projSort === 'progress') return BM.overallProgress(b) - BM.overallProgress(a);
      return b.updatedAt - a.updatedAt;
    });
    var looseCount = BM.projectsIn(null).length;
    var allCard = '<div class="card flat clickable folder-card' + (!folderId ? ' active' : '') + '" style="position:relative"><span class="folder-icon c-sage">' + icon('grid') + '</span><div class="meta"><b><a class="stretch" href="#/projects">Все проекты</a></b><span>' + s.projects.length + ' всего</span></div></div>';
    var looseCard = looseCount && s.folders.length ? '<div class="card flat clickable folder-card' + (folderId === 'none' ? ' active' : '') + '" style="position:relative"><span class="folder-icon" style="background:var(--surface-3)">' + icon('box') + '</span><div class="meta"><b><a class="stretch" href="#/projects/none">Без папки</a></b><span>' + looseCount + '</span></div></div>' : '';
    var title = folder ? folder.name : (folderId === 'none' ? 'Без папки' : 'Все проекты');
    var toolbar = '<div class="row">' +
      '<label class="sr-only" for="proj-q">Поиск по проектам</label><input class="input" id="proj-q" data-ui="projQuery" type="search" placeholder="Найти бренд…" value="' + esc(ui.projQuery) + '" style="flex:1 1 220px;max-width:360px">' +
      '<label class="sr-only" for="proj-st">Статус</label><select class="select" id="proj-st" data-ui="projStatus" style="width:auto;flex:0 1 190px"><option value="">Все статусы</option>' + BM.STATUSES.map(function (x) { return '<option value="' + x.id + '"' + (ui.projStatus === x.id ? ' selected' : '') + '>' + x.label + '</option>'; }).join('') + '</select>' +
      '<label class="sr-only" for="proj-sort">Сортировка</label><select class="select" id="proj-sort" data-ui="projSort" style="width:auto;flex:0 1 190px"><option value="recent"' + (ui.projSort === 'recent' ? ' selected' : '') + '>Недавние</option><option value="name"' + (ui.projSort === 'name' ? ' selected' : '') + '>По названию</option><option value="progress"' + (ui.projSort === 'progress' ? ' selected' : '') + '>По готовности</option></select></div>';

    var body = list.length ? '<div class="grid">' + list.map(projectCard).join('') + '</div>' :
      (s.projects.length && (ui.projQuery || ui.projStatus) ? empty('search', 'Ничего не нашлось', 'Попробуйте изменить запрос или сбросить фильтр статуса.', btn('reset-filters', 'Сбросить фильтры', { cls: 'soft' })) :
        empty('sparkle', folder ? 'В папке пока пусто' : 'Проектов пока нет', folder ? 'Создайте бренд прямо в этой папке или перенесите существующий через меню «⋯» на карточке.' : 'Каждый проект — отдельный бренд со своей платформой, чек-листом, продуктами и аналитикой.', btn('new-project', 'Новый проект', { cls: 'primary', icon: 'plus', data: { folder: folder ? folder.id : '' } })));

    return '<div class="page">' +
      '<div class="page-head"><div>' + (folder ? '<nav class="crumbs" aria-label="Путь"><a href="#/projects">Проекты</a>' + icon('chevR', 'sm') + '<span>' + esc(folder.name) + '</span></nav>' : '<span class="eyebrow">' + icon('grid', 'sm') + 'Проекты</span>') +
        '<h1 style="margin-top:8px">' + esc(title) + '</h1></div>' +
        '<div class="actions">' + (folder ? '<button type="button" class="btn ghost" data-action="folder-menu" data-id="' + folder.id + '">' + icon('more') + 'Папка</button>' : '') + btn('new-folder', 'Папка', { icon: 'folderPlus' }) + btn('new-project', 'Новый проект', { cls: 'primary', icon: 'plus', data: { folder: folder ? folder.id : '' } }) + '</div></div>' +
      '<div class="grid tight">' + allCard + s.folders.map(function (f) { return folderCard(f, f.id === folderId); }).join('') + looseCard + '</div>' +
      toolbar + '<div id="proj-list">' + body + '</div></div>';
  };

  // ---------- project workspace ----------
  var TABS = [
    { id: 'overview', label: 'Обзор', icon: 'layout' },
    { id: 'platform', label: 'Бренд-платформа', icon: 'compass' },
    { id: 'checklist', label: 'Чек-лист', icon: 'checkSq' },
    { id: 'products', label: 'Продукты', icon: 'box' },
    { id: 'analytics', label: 'Аналитика', icon: 'chart' },
    { id: 'tasks', label: 'Задачи', icon: 'tasks' },
    { id: 'competitors', label: 'Конкуренты', icon: 'users' },
    { id: 'notes', label: 'Заметки', icon: 'note' }
  ];
  BM.TABS = TABS;

  V.project = function (p, tab) {
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'overview';
    var f = BM.folder(p.folderId);
    var counts = { tasks: BM.taskProgress(p).open, products: p.skus.length, competitors: p.competitors.length, notes: p.notes.length, analytics: p.entries.length };
    var head = '<nav class="crumbs" aria-label="Путь"><a href="#/projects">Проекты</a>' + icon('chevR', 'sm') +
      (f ? '<a href="#/projects/' + f.id + '">' + esc(f.name) + '</a>' + icon('chevR', 'sm') : '') + '<span>' + esc(p.name) + '</span></nav>' +
      '<div class="proj-head">' + avatar(p, 'lg') +
        '<div class="title"><h1>' + esc(p.name) + '</h1><div class="row">' + statusBadge(p.status) + (p.category ? '<span class="badge">' + esc(p.category) + '</span>' : '') + mpBadges(p.marketplaces) + '</div></div>' +
        '<div class="actions">' + btn('edit-project', 'Изменить', { icon: 'edit', data: { id: p.id } }) +
        '<button type="button" class="icon-btn bordered" data-action="project-menu" data-id="' + p.id + '" aria-label="Ещё действия">' + icon('more') + '</button></div>' +
      '</div>' +
      '<nav class="tabs" aria-label="Разделы проекта">' + TABS.map(function (t) {
        var c = counts[t.id];
        return '<a class="tab' + (t.id === tab ? ' active' : '') + '" href="#/p/' + p.id + '/' + t.id + '"' + (t.id === tab ? ' aria-current="page"' : '') + '>' + icon(t.icon, 'sm') + t.label + (c ? '<span class="count muted small num">' + c + '</span>' : '') + '</a>';
      }).join('') + '</nav>';
    return '<div class="page">' + head + '<div id="tab-body">' + V['tab_' + tab](p) + '</div></div>';
  };

  V.tab_overview = function (p) {
    var pl = BM.platformProgress(p), ch = BM.checkProgress(p), tp = BM.taskProgress(p);
    var f = BM.folder(p.folderId);
    function ringItem(tab, pct, title, sub) {
      return '<a class="ring-item clickable" href="#/p/' + p.id + '/' + tab + '" style="text-decoration:none">' + ring(pct, title) + '<div><b>' + esc(title) + '</b><small>' + sub + '</small></div></a>';
    }
    var next = [];
    BM.DATA.checklistSections.forEach(function (sec) {
      BM.checkItems(sec).forEach(function (it) { if (!p.checklistDone[it.id] && next.length < 5) next.push({ it: it, sec: sec }); });
    });
    var openTasks = p.tasks.filter(function (t) { return !t.done; }).slice(0, 5);
    var pf = p.platform;
    var hasStatement = pf.posAudience || pf.posCategory || pf.posDiff;

    return '<section class="bento">' +
      '<div class="card span-8"><div class="card-head"><h2>Готовность бренда</h2><span class="muted small num">' + BM.overallProgress(p) + '% общая</span></div><div class="ring-row">' +
        ringItem('platform', pl.pct, 'Платформа', pl.done + ' из ' + pl.total + ' полей') +
        ringItem('checklist', ch.pct, 'Чек-лист', ch.done + ' из ' + ch.total + ' шагов') +
        ringItem('tasks', tp.pct, 'Задачи', tp.total ? tp.done + ' из ' + tp.total + ' готово' : 'пока нет') +
      '</div></div>' +
      '<div class="card span-4 stack"><div class="card-head" style="margin:0"><h3>О проекте</h3><button type="button" class="icon-btn sm" data-action="edit-project" data-id="' + p.id + '" aria-label="Изменить описание">' + icon('edit', 'sm') + '</button></div>' +
        '<p class="' + (p.description ? '' : 'muted') + '" style="white-space:pre-wrap">' + esc(p.description || 'Добавьте короткое описание: что за бренд, для кого и в какие сроки запуск.') + '</p>' +
        '<hr class="divider"><div class="small muted stack" style="gap:4px"><span>Папка: ' + esc(f ? f.name : '—') + '</span><span>Создан ' + esc(BM.date(p.createdAt)) + ' · обновлён ' + esc(BM.date(p.updatedAt)) + '</span></div></div>' +
      '<div class="card span-6"><div class="card-head"><h2>Следующие шаги</h2><a class="btn ghost sm" href="#/p/' + p.id + '/checklist">Весь чек-лист' + icon('chevR', 'sm') + '</a></div>' +
        (next.length ? '<ul class="checklist">' + next.map(function (x) {
          return '<li class="check-row"><input type="checkbox" class="cbox" id="n-' + x.it.id + '" data-check="' + x.it.id + '"><label for="n-' + x.it.id + '">' + BM.md(x.it.label) + '<span style="display:block;font-size:12.5px;color:var(--muted)">' + esc(x.sec.title) + '</span></label></li>';
        }).join('') + '</ul>' : '<p class="muted">Все 64 шага чек-листа выполнены — бренд готов к росту.</p>') + '</div>' +
      '<div class="card span-6"><div class="card-head"><h2>Задачи</h2><a class="btn ghost sm" href="#/p/' + p.id + '/tasks">Все' + icon('chevR', 'sm') + '</a></div>' +
        quickTaskForm(p, true) +
        (openTasks.length ? '<ul class="checklist" style="margin-top:10px">' + openTasks.map(function (t) {
          return '<li class="check-row"><input type="checkbox" class="cbox" id="ot-' + t.id + '" data-task-toggle="' + t.id + '" data-pid="' + p.id + '"><label for="ot-' + t.id + '">' + esc(t.title) + (t.due ? '<span style="display:block;font-size:12.5px" class="' + (BM.isOverdue(t.due) ? 'overdue' : 'muted') + '">' + esc(BM.relDay(t.due)) + '</span>' : '') + '</label></li>';
        }).join('') + '</ul>' : '<p class="muted small" style="margin-top:10px">Открытых задач нет.</p>') + '</div>' +
      '<div class="card span-6 tint"><div class="card-head"><h2>' + icon('compass') + 'Позиционирование</h2><a class="btn ghost sm" href="#/p/' + p.id + '/platform">Заполнить' + icon('chevR', 'sm') + '</a></div>' +
        (hasStatement ? statement(p) : '<p class="muted">Соберите positioning statement из четырёх полей во вкладке «Бренд-платформа» — формула появится здесь.</p>') +
        (pf.usp ? '<p style="margin-top:12px"><b>УТП:</b> ' + esc(pf.usp) + '</p>' : '') + '</div>' +
      '<div class="card span-6"><div class="card-head"><h2>' + icon('box') + 'Юнит-экономика</h2><a class="btn ghost sm" href="#/p/' + p.id + '/products">Открыть' + icon('chevR', 'sm') + '</a></div>' +
        (p.skus.length ? '<div class="stack" style="gap:8px">' + p.skus.slice(0, 4).map(function (s) {
          var c = BM.computeSku(s);
          return '<div class="row" style="justify-content:space-between"><span>' + esc(s.name) + '</span><span class="row" style="gap:8px"><span class="num muted small">' + BM.money(c.profit) + '/шт</span><span class="margin-pill ' + BM.marginClass(c.margin) + '">' + (c.margin == null ? '—' : c.margin.toFixed(0) + '%') + '</span></span></div>';
        }).join('') + '</div>' : '<p class="muted">Добавьте первый SKU — калькулятор посчитает маржу с учётом комиссии, логистики, ДРР и налога.</p>' + '<div class="actions" style="margin-top:12px">' + btn('new-sku', 'Добавить SKU', { cls: 'soft', icon: 'plus', data: { pid: p.id } }) + '</div>') + '</div>' +
    '</section>';
  };

  function statement(p) {
    var pf = p.platform;
    function part(v, ph) { return v ? '<em>' + esc(v) + '</em>' : '<span class="blank">' + esc(ph) + '</span>'; }
    return '<p class="statement">Для ' + part(pf.posAudience, 'аудитории') + ' бренд ' + part(pf.nameChosen || p.name, 'название') + ' — это ' + part(pf.posCategory, 'категория') + ', который ' + part(pf.posDiff, 'ключевое отличие') + ', потому что ' + part(pf.posProof, 'доказательство') + '.</p>';
  }
  BM.statement = statement;

  // platform
  V.tab_platform = function (p) {
    var pr = BM.platformProgress(p);
    var groups = BM.PLATFORM.map(function (g) {
      var filled = g.fields.filter(function (f) { var v = p.platform[f.k]; return Array.isArray(v) ? v.length : (v && String(v).trim()); }).length;
      var fields = g.fields.map(function (f) {
        var v = p.platform[f.k], id = 'pf-' + f.k, input;
        if (f.type === 'textarea') input = '<textarea class="textarea" id="' + id + '" data-pf="' + f.k + '" placeholder="' + esc(f.ph) + '">' + esc(v || '') + '</textarea>';
        else if (f.type === 'select') input = '<select class="select" id="' + id + '" data-pf="' + f.k + '"><option value="">Не выбрано</option>' + f.options.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
        else if (f.type === 'colors') input = colorsField(p);
        else input = '<input class="input" id="' + id + '" data-pf="' + f.k + '" type="text" placeholder="' + esc(f.ph) + '" value="' + esc(v || '') + '">';
        return '<div class="field' + (f.full ? ' col-full' : '') + '">' + (f.type === 'colors' ? '<span class="label">' + esc(f.label) + '</span>' : '<label for="' + id + '">' + esc(f.label) + '</label>') + input + '</div>';
      }).join('');
      return '<section class="fieldset" id="grp-' + g.id + '" aria-labelledby="grp-h-' + g.id + '"><div class="fieldset-head"><div><h2 id="grp-h-' + g.id + '">' + esc(g.title) + '</h2><p>' + esc(g.hint) + '</p></div><span class="badge num" data-grp-count="' + g.id + '">' + filled + '/' + g.fields.length + '</span></div>' +
        (g.builder ? '<div id="statement-slot" style="margin-bottom:16px">' + statement(p) + '</div>' : '') +
        '<div class="form-grid two">' + fields + '</div></section>';
    }).join('');
    return '<div class="stack" style="gap:16px">' +
      '<div class="card row" style="justify-content:space-between"><div style="flex:1;min-width:220px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Бренд-платформа заполнена</b><span class="num" data-pf-pct>' + pr.done + ' из ' + pr.total + ' · ' + pr.pct + '%</span></div><div data-pf-bar>' + progress(pr.pct) + '</div></div>' +
        '<div class="row"><span class="autosave" data-autosave>' + icon('check', 'sm') + 'Сохраняется автоматически</span>' + btn('copy-platform', 'Скопировать текстом', { cls: 'sm', icon: 'copy', data: { pid: p.id } }) + '</div></div>' +
      groups + '</div>';
  };
  function colorsField(p) {
    var cols = p.platform.colors || [];
    return '<div class="swatches" id="swatches">' + cols.map(function (c, i) {
      return '<div class="swatch" style="background:' + esc(c) + '" title="' + esc(c) + '"><button type="button" data-action="color-remove" data-i="' + i + '" aria-label="Удалить цвет ' + esc(c) + '">' + icon('x') + '</button></div>';
    }).join('') +
      '<div class="color-pick"><label class="sr-only" for="new-color">Новый цвет</label><input type="color" id="new-color" value="#8FA780">' + btn('color-add', 'Добавить цвет', { cls: 'sm soft', icon: 'plus' }) + '</div></div>' +
      '<span class="hint">' + (cols.length ? esc(cols.join(' · ')) : 'Добавьте основные и дополнительные цвета бренда') + '</span>';
  }
  BM.colorsField = colorsField;

  // checklist
  V.tab_checklist = function (p) {
    var pr = BM.checkProgress(p);
    return '<div class="stack" style="gap:16px">' +
      '<div class="card row"><div style="flex:1;min-width:220px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Запуск бренда на маркетплейсе</b><span class="num" data-ck-count>' + pr.done + ' из ' + pr.total + '</span></div><div data-ck-bar>' + progress(pr.pct) + '</div></div>' +
      '<div class="row">' + btn('expand-all', 'Развернуть всё', { cls: 'sm ghost' }) + btn('collapse-all', 'Свернуть', { cls: 'sm ghost' }) + '</div></div>' +
      '<div class="row"><label class="sr-only" for="ck-q">Поиск по чек-листу</label><input class="input" id="ck-q" type="search" data-ui="checkQuery" placeholder="Найти шаг: декларация, карточка, ДРР…" value="' + esc(BM.ui.checkQuery) + '" style="max-width:420px"></div>' +
      '<div id="sections-slot">' + checklistSections(p, BM.ui.checkQuery) + '</div></div>';
  };
  function checklistSections(p, filter, readOnly) {
    filter = (filter || '').toLowerCase();
    return BM.DATA.checklistSections.map(function (sec) {
      var items = BM.checkItems(sec);
      if (filter && !items.some(function (it) { return it.label.toLowerCase().indexOf(filter) > -1; }) && sec.title.toLowerCase().indexOf(filter) < 0) return '';
      var done = p ? items.filter(function (it) { return p.checklistDone[it.id]; }).length : 0;
      var pct = items.length ? Math.round(done / items.length * 100) : 0;
      var open = BM.ui.openSections[sec.id] || !!filter;
      var body = sec.blocks.map(function (b) {
        switch (b.type) {
          case 'subhead': return '<h4>' + esc(b.text) + '</h4>';
          case 'text': return '<p class="lead">' + BM.md(b.text) + '</p>';
          case 'bullets': return '<ul class="bullets">' + b.items.map(function (t) { return '<li>' + BM.md(t) + '</li>'; }).join('') + '</ul>';
          case 'numbered': return '<ol>' + b.items.map(function (t) { return '<li>' + BM.md(t) + '</li>'; }).join('') + '</ol>';
          case 'table': return '<div class="table-wrap"><table class="table"><thead><tr>' + b.headers.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
            b.rows.map(function (r) { return '<tr>' + r.map(function (c) { return c === 'x' ? '<td class="x">●</td>' : '<td>' + BM.md(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
          case 'check':
            if (readOnly) return b.items.map(function (it) { return '<div class="ref-check">' + icon('checkSq', 'sm') + '<span>' + BM.md(it.label) + '</span></div>'; }).join('');
            var its = b.items.filter(function (it) { return !filter || it.label.toLowerCase().indexOf(filter) > -1 || sec.title.toLowerCase().indexOf(filter) > -1; });
            if (!its.length) return '';
            return '<ul class="checklist">' + its.map(function (it) {
              var d = !!p.checklistDone[it.id];
              return '<li class="check-row' + (d ? ' done' : '') + '"><input type="checkbox" class="cbox" id="c-' + it.id + '" data-check="' + it.id + '"' + (d ? ' checked' : '') + '><label for="c-' + it.id + '">' + BM.md(it.label) + '</label>' +
                '<button type="button" class="icon-btn sm to-task" data-action="check-to-task" data-id="' + it.id + '" aria-label="Создать задачу из пункта" title="В задачи">' + icon('plus', 'sm') + '</button></li>';
            }).join('') + '</ul>';
        }
        return '';
      }).join('');
      var mini = readOnly ? (items.length ? items.length + ' шагов' : 'справка') : (items.length ? '<div class="progress thin">' + '<i style="width:' + pct + '%"></i></div><span data-sec-count="' + sec.id + '">' + done + '/' + items.length + '</span>' : 'справка');
      return '<div class="section-block' + (open ? ' open' : '') + '" data-section="' + sec.id + '">' +
        '<button type="button" class="section-head" data-action="toggle-section" data-id="' + sec.id + '" aria-expanded="' + open + '">' + icon('chevR', 'chev') + '<h3>' + esc(sec.title) + '</h3><span class="mini">' + mini + '</span></button>' +
        '<div class="section-body">' + body + '</div></div>';
    }).join('') || empty('search', 'Ничего не найдено', 'Попробуйте другое слово — например «маркировка» или «бюджет».');
  }
  BM.checklistSections = checklistSections;

  // products / unit economics
  V.tab_products = function (p) {
    var cards = p.skus.map(function (s) {
      var c = BM.computeSku(s);
      return '<article class="card stack" style="gap:14px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0;flex:1"><h3>' + esc(s.name) + '</h3><div class="row" style="margin-top:6px">' + (s.marketplace ? mpBadges([s.marketplace]) : '') + (s.article ? '<span class="badge">арт. ' + esc(s.article) + '</span>' : '') + '</div></div>' +
        '<span class="margin-pill ' + BM.marginClass(c.margin) + '">' + (c.margin == null ? '—' : c.margin.toFixed(1) + '%') + '<span class="sr-only"> маржа</span></span></div>' +
        '<div class="kv"><div><small>Цена продажи</small><b>' + BM.money(BM.num(s.sellPrice)) + '</b></div><div><small>Прибыль с единицы</small><b style="color:' + (c.profit < 0 ? 'var(--danger)' : 'inherit') + '">' + BM.money(c.profit) + '</b></div>' +
        '<div><small>Комиссия + ДРР</small><b>' + BM.money(c.fee + c.ad) + '</b></div><div><small>Полная себестоимость</small><b>' + BM.money(c.total) + '</b></div></div>' +
        '<div class="row">' + btn('edit-sku', 'Изменить', { cls: 'sm', icon: 'edit', data: { pid: p.id, id: s.id } }) + btn('dup-sku', 'Копия', { cls: 'sm ghost', icon: 'copy', data: { pid: p.id, id: s.id } }) + '<span class="spacer"></span>' +
        '<button type="button" class="icon-btn sm" data-action="del-sku" data-pid="' + p.id + '" data-id="' + s.id + '" aria-label="Удалить ' + esc(s.name) + '">' + icon('trash', 'sm') + '</button></div></article>';
    }).join('');
    var budget = BM.num(p.launchBudget);
    var be = p.skus.length && budget ? '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">SKU</th><th scope="col">Прибыль/шт</th><th scope="col">Штук до окупаемости</th></tr></thead><tbody>' + p.skus.map(function (s) {
      var c = BM.computeSku(s);
      return '<tr><td>' + esc(s.name) + '</td><td class="num">' + BM.money(c.profit) + '</td><td class="num">' + (c.profit > 0 ? Math.ceil(budget / c.profit).toLocaleString('ru-RU') + ' шт.' : 'не окупится') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="muted small">Укажите бюджет запуска и добавьте хотя бы один SKU.</p>';
    return '<div class="stack" style="gap:16px">' +
      '<div class="page-head"><div><h2>Продукты и юнит-экономика</h2><p>Маржа считается с учётом комиссии площадки, логистики, ДРР и налога. Зелёный — от 20%, жёлтый — 5–20%, красный — ниже 5%.</p></div>' + btn('new-sku', 'Добавить SKU', { cls: 'primary', icon: 'plus', data: { pid: p.id } }) + '</div>' +
      (p.skus.length ? '<div class="grid">' + cards + '</div>' : empty('box', 'Пока нет ни одного SKU', 'Начните с 3–5 позиций: так проще протестировать спрос и не завязнуть в сертификации.', btn('new-sku', 'Добавить SKU', { cls: 'primary', icon: 'plus', data: { pid: p.id } }))) +
      '<div class="card"><div class="card-head"><h2>' + icon('target') + 'Точка безубыточности</h2></div><div class="form-grid two" style="margin-bottom:12px"><div class="field"><label for="budget">Бюджет запуска, ₽</label><input class="input num" id="budget" inputmode="decimal" data-pfield="launchBudget" value="' + esc(p.launchBudget || '') + '" placeholder="например, 1 500 000"><span class="hint">Ориентир: первая партия — 30–40% бюджета</span></div></div><div id="be-slot">' + be + '</div></div></div>';
  };

  // analytics
  V.tab_analytics = function (p) {
    var byMp = {};
    p.entries.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (e) { (byMp[e.marketplace] = byMp[e.marketplace] || []).push(e); });
    var overview = Object.keys(BM.MP).map(function (mp) {
      var arr = byMp[mp] || [], last = arr[arr.length - 1], prev = arr[arr.length - 2];
      if (!last) return '<div class="card"><div class="row" style="justify-content:space-between">' + mpBadges([mp]) + '</div><p class="muted small" style="margin-top:12px">Нет данных — добавьте первую неделю.</p></div>';
      var vals = arr.map(function (e) { return BM.num(e.ourRevenue); }).filter(function (v) { return v != null; });
      return '<div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between">' + mpBadges([mp]) + '<span class="small muted">' + esc(last.weekLabel) + '</span></div>' +
        '<div class="stat"><div class="label">Ваша выручка</div><div class="value" style="font-size:24px">' + esc(last.ourRevenue || '—') + ' ' + trend(BM.num(last.ourRevenue), prev && BM.num(prev.ourRevenue)) + '</div></div>' +
        spark(vals) +
        '<div class="kv"><div><small>Доля рынка</small><b>' + (last.marketShare ? esc(last.marketShare) + '% ' : '—') + trend(BM.num(last.marketShare), prev && BM.num(prev.marketShare), true) + '</b></div><div><small>Объём категории</small><b>' + esc(last.categoryRevenue || '—') + '</b></div></div></div>';
    }).join('');
    var list = p.entries.slice().sort(function (a, b) { return b.order - a.order; }).filter(function (e) { return BM.ui.mpFilter === 'all' || e.marketplace === BM.ui.mpFilter; });
    var chips = '<div class="chips" role="group" aria-label="Фильтр по площадке">' + ['all'].concat(Object.keys(BM.MP)).map(function (id) {
      return '<button type="button" class="chip" data-action="mp-filter" data-id="' + id + '" aria-pressed="' + (BM.ui.mpFilter === id) + '">' + esc(id === 'all' ? 'Все площадки' : BM.MP[id].label) + '</button>';
    }).join('') + '</div>';
    var hist = list.length ? '<div class="stack">' + list.map(function (e) {
      var notes = [['Топ-товары', e.topProducts], ['Просевшие товары', e.declining], ['Смена лидеров', e.leaderChanges], ['Заметки', e.notes]].filter(function (x) { return x[1]; });
      return '<article class="card"><div class="row" style="justify-content:space-between"><div class="row">' + mpBadges([e.marketplace]) + '<h3>' + esc(e.weekLabel) + '</h3></div><div class="row" style="gap:4px">' +
        '<button type="button" class="icon-btn sm" data-action="edit-entry" data-pid="' + p.id + '" data-id="' + e.id + '" aria-label="Изменить запись">' + icon('edit', 'sm') + '</button>' +
        '<button type="button" class="icon-btn sm" data-action="del-entry" data-pid="' + p.id + '" data-id="' + e.id + '" aria-label="Удалить запись">' + icon('trash', 'sm') + '</button></div></div>' +
        '<div class="kv" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-top:12px"><div><small>Ваша выручка</small><b>' + esc(e.ourRevenue || '—') + '</b></div><div><small>Объём категории</small><b>' + esc(e.categoryRevenue || '—') + '</b></div><div><small>Доля рынка</small><b>' + (e.marketShare ? esc(e.marketShare) + '%' : '—') + '</b></div></div>' +
        (notes.length ? '<div class="stack" style="gap:8px;margin-top:12px">' + notes.map(function (n) { return '<div><div class="small muted" style="font-weight:600">' + n[0] + '</div><p style="white-space:pre-wrap">' + esc(n[1]) + '</p></div>'; }).join('') + '</div>' : '') +
        (e.source ? '<p class="small muted" style="margin-top:10px">Источник: ' + esc(e.source) + '</p>' : '') + '</article>';
    }).join('') + '</div>' : empty('chart', 'Записей пока нет', 'Раз в неделю вносите цифры из MPStats, Wildbox или кабинета площадки — тренды посчитаются автоматически.');
    return '<div class="stack" style="gap:16px">' +
      '<div class="page-head"><div><h2>Аналитика маркетплейсов</h2><p>Еженедельный трекер: выручка, доля рынка, лидеры категории. Тренд — к предыдущей неделе по той же площадке.</p></div>' + btn('new-entry', 'Добавить неделю', { cls: 'primary', icon: 'plus', data: { pid: p.id } }) + '</div>' +
      '<div class="grid">' + overview + '</div>' + chips + hist +
      '<div class="info">' + icon('info') + '<span>Автоматический дайджест рынка FMCG собирается по воскресеньям в <a href="https://claude.ai/artifact/TNtATTt7EBRv6ZYCYi7yP3" target="_blank" rel="noopener">артефакте Claude</a> — сайт не может сам ходить в интернет по расписанию.</span></div></div>';
  };

  // tasks
  function quickTaskForm(p, compact) {
    return '<form class="quick-add" data-form="quick-task" data-pid="' + p.id + '"><label class="sr-only" for="qt-' + (compact ? 'o' : 't') + '">Новая задача</label><input class="input" id="qt-' + (compact ? 'o' : 't') + '" name="title" placeholder="Новая задача… и Enter" autocomplete="off">' +
      (compact ? '' : '<label class="sr-only" for="qt-due">Срок</label><input class="input" id="qt-due" type="date" name="due" style="flex:0 1 160px"><label class="sr-only" for="qt-pr">Приоритет</label><select class="select" id="qt-pr" name="priority" style="flex:0 1 150px"><option value="mid">Обычный</option><option value="high">Высокий</option><option value="low">Низкий</option></select>') +
      '<button type="submit" class="btn primary sm" style="min-height:44px">' + icon('plus', 'sm') + 'Добавить</button></form>';
  }
  var PR = { high: 'Высокий', mid: 'Обычный', low: 'Низкий' };
  V.tab_tasks = function (p) {
    var f = BM.ui.taskFilter;
    var list = p.tasks.filter(function (t) {
      if (f === 'open') return !t.done;
      if (f === 'done') return t.done;
      if (f === 'overdue') return !t.done && BM.isOverdue(t.due);
      return true;
    }).sort(function (a, b) {
      if (a.done !== b.done) return a.done - b.done;
      var pa = { high: 0, mid: 1, low: 2 };
      if ((a.due || '9') !== (b.due || '9')) return (a.due || '9999') < (b.due || '9999') ? -1 : 1;
      return pa[a.priority] - pa[b.priority];
    });
    var counts = { open: p.tasks.filter(function (t) { return !t.done; }).length, overdue: p.tasks.filter(function (t) { return !t.done && BM.isOverdue(t.due); }).length, done: p.tasks.filter(function (t) { return t.done; }).length, all: p.tasks.length };
    var chips = '<div class="chips" role="group" aria-label="Фильтр задач">' + [['open', 'Активные'], ['overdue', 'Просроченные'], ['done', 'Готово'], ['all', 'Все']].map(function (x) {
      return '<button type="button" class="chip" data-action="task-filter" data-id="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + ' <span class="num">' + counts[x[0]] + '</span></button>';
    }).join('') + '</div>';
    var rows = list.length ? '<ul class="list" style="list-style:none;margin:0;padding:0">' + list.map(function (t) {
      return '<li class="list-row' + (t.done ? ' done' : '') + '"><input type="checkbox" class="cbox" id="t-' + t.id + '" data-task-toggle="' + t.id + '" data-pid="' + p.id + '"' + (t.done ? ' checked' : '') + ' aria-label="Выполнено: ' + esc(t.title) + '">' +
        '<div class="t-main"><div class="t-title">' + esc(t.title) + '</div><div class="t-meta">' +
        (t.due ? '<span class="' + (!t.done && BM.isOverdue(t.due) ? 'overdue' : '') + '">' + icon('calendar', 'sm') + ' ' + esc(BM.relDay(t.due)) + '</span>' : '') +
        '<span class="pr-' + t.priority + '">' + icon('flag', 'sm') + ' ' + PR[t.priority] + '</span>' + (t.note ? '<span>' + esc(t.note.slice(0, 80)) + '</span>' : '') + '</div></div>' +
        '<button type="button" class="icon-btn sm" data-action="edit-task" data-pid="' + p.id + '" data-id="' + t.id + '" aria-label="Изменить задачу">' + icon('edit', 'sm') + '</button>' +
        '<button type="button" class="icon-btn sm" data-action="del-task" data-pid="' + p.id + '" data-id="' + t.id + '" aria-label="Удалить задачу">' + icon('trash', 'sm') + '</button></li>';
    }).join('') + '</ul>' : empty('tasks', f === 'done' ? 'Ещё ничего не завершено' : 'Задач нет', 'Добавьте задачу выше или превратите любой пункт чек-листа в задачу кнопкой «+».');
    return '<div class="stack" style="gap:16px"><div class="page-head"><div><h2>Задачи</h2><p>Сроки, приоритеты и контроль просрочек по этому бренду.</p></div></div>' + quickTaskForm(p) + chips + rows + '</div>';
  };

  // competitors
  V.tab_competitors = function (p) {
    var cards = p.competitors.map(function (c) {
      return '<article class="card stack" style="gap:12px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0;flex:1"><h3>' + esc(c.name) + '</h3><div class="row" style="margin-top:6px">' + (c.marketplace ? mpBadges([c.marketplace]) : '') + (c.price ? '<span class="badge num">' + esc(c.price) + '</span>' : '') + '</div></div>' +
        (c.url ? '<a class="icon-btn sm" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Открыть карточку конкурента">' + icon('external', 'sm') + '</a>' : '') + '</div>' +
        ((c.rating || c.reviews) ? '<div class="kv"><div><small>Рейтинг</small><b>' + esc(c.rating || '—') + '</b></div><div><small>Отзывов</small><b>' + esc(c.reviews || '—') + '</b></div></div>' : '') +
        (c.strengths ? '<div><div class="small" style="font-weight:600;color:var(--ok)">Сильные стороны</div><p class="small" style="white-space:pre-wrap">' + esc(c.strengths) + '</p></div>' : '') +
        (c.weaknesses ? '<div><div class="small" style="font-weight:600;color:var(--danger)">Слабые стороны</div><p class="small" style="white-space:pre-wrap">' + esc(c.weaknesses) + '</p></div>' : '') +
        '<div class="row">' + btn('edit-comp', 'Изменить', { cls: 'sm', icon: 'edit', data: { pid: p.id, id: c.id } }) + '<span class="spacer"></span><button type="button" class="icon-btn sm" data-action="del-comp" data-pid="' + p.id + '" data-id="' + c.id + '" aria-label="Удалить ' + esc(c.name) + '">' + icon('trash', 'sm') + '</button></div></article>';
    }).join('');
    return '<div class="stack" style="gap:16px"><div class="page-head"><div><h2>Конкуренты</h2><p>Сравнивайте себя с топ-3–5 брендами именно вашей подкатегории: цена, рейтинг, сильные и слабые стороны.</p></div>' + btn('new-comp', 'Добавить конкурента', { cls: 'primary', icon: 'plus', data: { pid: p.id } }) + '</div>' +
      (p.competitors.length ? '<div class="grid">' + cards + '</div>' : empty('users', 'Конкуренты не добавлены', 'Найдите лидеров категории в MPStats или поиске площадки и зафиксируйте, чем вы будете лучше.', btn('new-comp', 'Добавить конкурента', { cls: 'primary', icon: 'plus', data: { pid: p.id } }))) + '</div>';
  };

  // notes
  V.tab_notes = function (p) {
    var notes = p.notes.slice().sort(function (a, b) { return (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt); });
    if (!notes.length) {
      return '<div class="stack" style="gap:16px"><div class="page-head"><div><h2>Заметки</h2><p>Встречи, брифы, гипотезы и черновики — всё, что относится к бренду.</p></div></div>' + templatesPicker(p) + '</div>';
    }
    var cur = p.notes.filter(function (n) { return n.id === BM.ui.noteId; })[0] || notes[0];
    BM.ui.noteId = cur.id;
    return '<div class="stack" style="gap:16px"><div class="page-head"><div><h2>Заметки</h2></div>' + btn('new-note', 'Новая заметка', { cls: 'primary', icon: 'plus', data: { pid: p.id } }) + '</div>' +
      '<div class="notes-layout"><nav class="list" aria-label="Список заметок">' + notes.map(function (n) {
        return '<button type="button" class="note-item' + (n.id === cur.id ? ' active' : '') + '" data-action="open-note" data-id="' + n.id + '"' + (n.id === cur.id ? ' aria-current="true"' : '') + '><b>' + (n.pinned ? icon('pin', 'sm') + ' ' : '') + esc(n.title || 'Без названия') + '</b><span>' + esc((n.body || '').slice(0, 120) || 'Пусто') + '</span></button>';
      }).join('') + '</nav>' +
      '<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="autosave small" data-autosave>' + icon('check', 'sm') + 'Изменено ' + esc(BM.dateTime(cur.updatedAt)) + '</span><div class="row" style="gap:4px">' +
        '<button type="button" class="icon-btn sm" data-action="pin-note" data-pid="' + p.id + '" data-id="' + cur.id + '" aria-pressed="' + !!cur.pinned + '" aria-label="' + (cur.pinned ? 'Открепить' : 'Закрепить') + ' заметку">' + icon('pin', 'sm') + '</button>' +
        '<button type="button" class="icon-btn sm" data-action="del-note" data-pid="' + p.id + '" data-id="' + cur.id + '" aria-label="Удалить заметку">' + icon('trash', 'sm') + '</button></div></div>' +
        '<label class="sr-only" for="note-title">Заголовок</label><input class="note-title" id="note-title" data-note="title" value="' + esc(cur.title) + '" placeholder="Заголовок">' +
        '<label class="sr-only" for="note-body">Текст заметки</label><textarea class="note-body" id="note-body" data-note="body" placeholder="Пишите здесь…">' + esc(cur.body) + '</textarea></div></div></div>';
  };
  function templatesPicker(p) {
    return '<div class="card"><div class="card-head"><h3>Начните с шаблона</h3></div><div class="tpl-grid">' + BM.NOTE_TEMPLATES.map(function (t) {
      return '<button type="button" class="tpl" data-action="note-create" data-pid="' + p.id + '" data-tpl="' + t.id + '"><b>' + esc(t.title) + '</b><span>' + esc(t.desc) + '</span></button>';
    }).join('') + '</div></div>';
  }
  BM.templatesPicker = templatesPicker;

  // ---------- knowledge base ----------
  V.kb = function (tab) {
    tab = tab || 'method';
    var tabs = [['method', 'Методология', 'book'], ['process', 'Карта процессов', 'map'], ['links', 'Ссылки', 'external']];
    var body;
    if (tab === 'process') {
      var pm = BM.DATA.processMap;
      body = '<p class="muted">' + esc(pm.intro) + '</p>' + pm.diagrams.map(function (d) {
        return '<div class="card stack"><h2>' + esc(d.title) + '</h2><p class="muted">' + esc(d.note) + '</p><div class="mermaid-box"><pre class="mermaid">' + esc(d.mermaid) + '</pre></div>' +
          (d.bottlenecks ? '<div class="info">' + icon('info') + '<div><b>Где чаще всего застревает</b><ul style="margin:6px 0 0;padding-left:18px">' + d.bottlenecks.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div></div>' : '') + '</div>';
      }).join('') + pm.tables.map(function (t) {
        return '<div class="card"><h3>' + esc(t.title) + '</h3><div class="table-wrap"><table class="table"><thead><tr>' + t.headers.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + t.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
      }).join('');
    } else if (tab === 'links') {
      body = '<div class="list">' + BM.DATA.externalLinks.map(function (l) {
        return '<a class="link-row" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + icon('external') + '<div class="t-main"><b>' + esc(l.title) + '</b><small>' + esc(l.kind) + (l.note ? ' — ' + esc(l.note) : '') + '</small></div>' + icon('chevR', 'sm') + '</a>';
      }).join('') + '</div><p class="small muted">Excel «Юнит-экономика.xlsx» и PDF/Word-копии документов лежат в папке «бренд» на компьютере.</p>';
    } else {
      body = '<p class="muted">' + esc(BM.DATA.checklistIntro) + ' Отмечать шаги можно внутри каждого проекта — вкладка «Чек-лист».</p>' + checklistSections(null, '', true);
    }
    return '<div class="page"><div class="page-head"><div><span class="eyebrow">' + icon('book', 'sm') + 'База знаний</span><h1 style="margin-top:8px">Как запустить бренд <span class="serif">на маркетплейсе</span></h1></div></div>' +
      '<nav class="tabs" aria-label="Разделы базы знаний">' + tabs.map(function (t) { return '<a class="tab' + (t[0] === tab ? ' active' : '') + '" href="#/kb/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + icon(t[2], 'sm') + t[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="stack" style="gap:14px">' + body + '</div></div>';
  };

  // ---------- settings ----------
  function gsheetSettings(s) {
    var on = !!(s.gsUrl && s.gsKey);
    return '<section class="card stack" id="gsheet"><div class="card-head" style="margin:0"><h2>' + icon('grid') + 'Google Таблица для себестоимости</h2></div>' +
      '<p class="muted small">Все расчёты из раздела «Себестоимость» живут и в Google Таблице: на каждый продукт — вкладка с формулами, плюс «Сводка». Правки на сайте уходят в таблицу за пару секунд, правки в таблице появляются на сайте примерно через 10 секунд. Таблицу удобно показать коллегам.</p>' +
      (on ? '<div class="gs-status" data-gs-status>' + (BM.gsheet ? BM.gsheet.statusHtml() : '') + '</div>' : '') +
      '<details' + (on ? '' : ' open') + '><summary class="small" style="cursor:pointer;font-weight:600">Как подключить — 5 минут, один раз</summary><ol class="small gs-steps">' +
        '<li>Создайте пустую таблицу: <a href="https://sheets.new" target="_blank" rel="noopener noreferrer">sheets.new</a>. Назовите её, например, «Себестоимость — бренд».</li>' +
        '<li>В таблице: <b>Расширения → Apps Script</b>. Удалите всё в файле Code.gs и вставьте код скрипта: <button type="button" class="btn sm soft" data-gs-copy>' + icon('copy', 'sm') + 'Скопировать код</button> <a href="google-sheets-script.txt" target="_blank" rel="noopener">посмотреть</a>. Нажмите «Сохранить».</li>' +
        '<li>Вверху выберите функцию <b>setup</b> и нажмите <b>Выполнить</b>. Google попросит разрешить скрипту доступ к таблице — разрешите от своего аккаунта.</li>' +
        '<li><b>Начать развертывание → Новое развертывание</b> → тип <b>Веб-приложение</b>. «Запуск от имени»: <b>Я</b>, «У кого есть доступ»: <b>Все</b>. Нажмите «Начать развертывание» и скопируйте URL веб-приложения.</li>' +
        '<li>Ключ подключения появится в журнале выполнения внизу редактора после запуска setup. Его же можно посмотреть в таблице: меню <b>Бренд-менеджер → Ключ подключения</b>.</li>' +
        '<li>Вставьте URL и ключ ниже и нажмите «Подключить». Сайт сам создаст вкладки со всеми расчётами.</li></ol>' +
        '<p class="small muted">Ключ — как пароль к таблице: храните его только в этих настройках. Доступ «Все» означает, что веб-приложение ответит тому, у кого есть и адрес, и ключ.</p></details>' +
      '<form class="form-grid two" data-form="gsheet"><div class="field"><label for="gs-url">URL веб-приложения</label><input class="input" id="gs-url" name="url" value="' + esc(s.gsUrl || '') + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" inputmode="url"></div>' +
        '<div class="field"><label for="gs-key">Ключ подключения</label><input class="input" id="gs-key" name="key" type="password" value="' + esc(s.gsKey || '') + '" autocomplete="off"></div>' +
        '<div class="actions col-full"><button type="submit" class="btn primary">' + icon('check', 'sm') + (on ? 'Переподключить' : 'Подключить') + '</button>' + (on ? '<button type="button" class="btn ghost" data-gs-off>Отключить</button>' : '') + '</div></form></section>';
  }
  V.settings = function () {
    var s = BM.settings;
    var themes = [['light', 'Светлая', 'sun'], ['dark', 'Тёмная', 'moon'], ['system', 'Как в системе', 'sliders']];
    return '<div class="page" style="max-width:820px"><div class="page-head"><div><span class="eyebrow">' + icon('sliders', 'sm') + 'Настройки</span><h1 style="margin-top:8px">Настройки</h1></div></div>' +
      '<section class="card"><div class="card-head"><h2>Оформление</h2></div><div class="chips" role="group" aria-label="Тема">' + themes.map(function (t) {
        return '<button type="button" class="chip" data-action="set-theme" data-id="' + t[0] + '" aria-pressed="' + (s.theme === t[0]) + '">' + icon(t[2], 'sm') + t[1] + '</button>';
      }).join('') + '</div></section>' +
      '<section class="card stack"><div class="card-head" style="margin:0"><h2>' + icon('cloud') + 'Синхронизация между устройствами</h2></div>' +
        '<div class="sync-pill" style="padding:0"><span class="sync-dot ' + BM.syncStatus + '" data-sync-dot></span><span data-sync-label>' + esc(BM.syncLabel()) + '</span>' + (s.lastSyncAt ? '<span class="muted">· последний раз ' + esc(BM.dateTime(s.lastSyncAt)) + '</span>' : '') + '</div>' +
        '<p class="muted small">Данные хранятся в приватном репозитории GitHub <b>' + esc(s.owner) + '/' + esc(s.repo) + '</b>. Токен вводится один раз на каждом устройстве и остаётся только в этом браузере.</p>' +
        '<details><summary class="small" style="cursor:pointer;font-weight:600">Как получить токен</summary><ol class="small muted" style="padding-left:18px;margin-top:8px"><li>github.com → Settings → Developer settings → Fine-grained tokens → Generate new token</li><li>Repository access: только <b>' + esc(s.repo) + '</b></li><li>Permissions → Contents: <b>Read and write</b></li><li>Скопируйте токен и вставьте в поле ниже (не в чат)</li></ol></details>' +
        '<form class="form-grid two" data-form="settings-sync"><div class="field"><label for="s-owner">GitHub-логин</label><input class="input" id="s-owner" name="owner" value="' + esc(s.owner) + '" autocomplete="username"></div>' +
        '<div class="field"><label for="s-repo">Репозиторий для данных</label><input class="input" id="s-repo" name="repo" value="' + esc(s.repo) + '"></div>' +
        '<div class="field"><label for="s-path">Файл</label><input class="input" id="s-path" name="path" value="' + esc(s.path) + '"></div>' +
        '<div class="field"><label for="s-token">Personal access token</label><input class="input" id="s-token" name="token" type="password" value="' + esc(s.token) + '" placeholder="github_pat_…" autocomplete="off"></div>' +
        '<div class="actions col-full"><button type="submit" class="btn primary">Сохранить</button>' + btn('sync-now', 'Синхронизировать сейчас', { icon: 'refresh' }) + '</div></form></section>' +
      gsheetSettings(s) +
      '<section class="card stack"><div class="card-head" style="margin:0"><h2>' + icon('download') + 'Резервная копия</h2></div><p class="muted small">Скачайте все папки и проекты одним JSON-файлом или восстановите из него.</p>' +
        '<div class="actions">' + btn('export', 'Скачать копию', { icon: 'download' }) + '<label class="btn" for="import-file">' + icon('upload') + 'Загрузить из файла</label><input type="file" id="import-file" accept="application/json,.json" class="sr-only"></div></section>' +
      '<section class="card stack" style="border-color:var(--danger-soft)"><div class="card-head" style="margin:0"><h2 style="color:var(--danger)">Опасная зона</h2></div><p class="muted small">Удаляет все папки и проекты на этом устройстве. Если включена синхронизация, пустое состояние уйдёт и в GitHub.</p><div>' + btn('reset-all', 'Удалить все данные', { cls: 'danger', icon: 'trash' }) + '</div></section></div>';
  };
})();
