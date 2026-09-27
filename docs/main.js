(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon, V = BM.views, c = BM.c;
  var route = { name: 'home' }, lastRouteKey = '';

  // ---------- routing ----------
  function parseRoute() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!h.length) return { name: 'home' };
    if (h[0] === 'projects') return { name: 'projects', folder: h[1] || null };
    if (h[0] === 'p' && h[1]) return { name: 'project', id: h[1], tab: h[2] || 'overview' };
    if (h[0] === 'kb') return { name: 'kb', tab: h[1] || 'method' };
    if (h[0] === 'settings') return { name: 'settings' };
    return { name: 'home' };
  }
  function go(hash) { if (location.hash === hash) BM.render(); else location.hash = hash; }
  BM.go = go;

  function currentProject() { return route.name === 'project' ? BM.project(route.id) : null; }

  // ---------- render ----------
  BM.render = function () {
    route = parseRoute();
    var key = route.name + '/' + (route.id || route.folder || '') + '/' + (route.tab || '');
    var routeChanged = key !== lastRouteKey;
    lastRouteKey = key;

    var html;
    if (route.name === 'project') {
      var p = BM.project(route.id);
      if (!p) { BM.toast('Проект не найден — возможно, он удалён'); location.hash = '#/projects'; return; }
      html = V.project(p, route.tab);
      document.title = p.name + ' · Бренд-менеджер';
    } else if (route.name === 'projects') {
      if (route.folder && route.folder !== 'none' && !BM.folder(route.folder)) { location.hash = '#/projects'; return; }
      html = V.projects(route.folder);
      document.title = 'Проекты · Бренд-менеджер';
    } else if (route.name === 'kb') { html = V.kb(route.tab); document.title = 'База знаний · Бренд-менеджер'; }
    else if (route.name === 'settings') { html = V.settings(); document.title = 'Настройки · Бренд-менеджер'; }
    else { html = V.home(); document.title = 'Бренд-менеджер'; }

    document.getElementById('sidebar').innerHTML = V.sidebar(route);
    var drawer = document.querySelector('.sidebar.drawer');
    if (drawer) drawer.innerHTML = V.sidebar(route);
    document.getElementById('page').innerHTML = html;
    updateBottomNav();

    if (route.name === 'kb' && route.tab === 'process') renderMermaid();
    if (routeChanged) {
      window.scrollTo(0, 0);
      var h1 = document.querySelector('#page h1');
      if (h1 && document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('#page')) {
        h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true });
      }
    }
  };

  function updateBottomNav() {
    document.querySelectorAll('.bn-item[data-route]').forEach(function (a) {
      var r = a.getAttribute('data-route');
      var on = r === route.name || (r === 'projects' && route.name === 'project');
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function rerenderKeepFocus() {
    var a = document.activeElement, id = a && a.id, start = a && a.selectionStart, end = a && a.selectionEnd;
    BM.render();
    if (id) {
      var el = document.getElementById(id);
      if (el) { el.focus({ preventScroll: true }); try { if (start != null) el.setSelectionRange(start, end); } catch (e) {} }
    }
  }

  var mermaidLoading = false;
  function renderMermaid() {
    function run() {
      try {
        window.mermaid.initialize({ startOnLoad: false, theme: BM.isDark() ? 'dark' : 'neutral', fontFamily: 'Onest, sans-serif' });
        window.mermaid.run({ querySelector: '.mermaid' });
      } catch (e) {}
    }
    if (window.mermaid) { run(); return; }
    if (mermaidLoading) return;
    mermaidLoading = true;
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    s.onload = run;
    s.onerror = function () { mermaidLoading = false; };
    document.head.appendChild(s);
  }

  // ---------- drawer (mobile) ----------
  function openDrawer() {
    closeDrawer();
    var scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.addEventListener('click', closeDrawer);
    var d = document.createElement('aside'); d.className = 'sidebar drawer'; d.setAttribute('aria-label', 'Меню');
    d.innerHTML = V.sidebar(route);
    document.body.appendChild(scrim); document.body.appendChild(d);
    var first = d.querySelector('a,button'); if (first) first.focus();
  }
  function closeDrawer() { document.querySelectorAll('.scrim, .sidebar.drawer').forEach(function (el) { el.remove(); }); }

  // ---------- form builders ----------
  function field(name, label, value, opts) {
    opts = opts || {};
    var id = 'f-' + name;
    var req = opts.required ? ' required' : '';
    var input;
    if (opts.type === 'textarea') input = '<textarea class="textarea" id="' + id + '" name="' + name + '" placeholder="' + esc(opts.ph || '') + '"' + req + '>' + esc(value || '') + '</textarea>';
    else if (opts.type === 'select') input = '<select class="select" id="' + id + '" name="' + name + '">' + opts.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(value) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    else input = '<input class="input' + (opts.num ? ' num' : '') + '" id="' + id + '" name="' + name + '" type="' + (opts.type || 'text') + '" value="' + esc(value || '') + '" placeholder="' + esc(opts.ph || '') + '"' + (opts.num ? ' inputmode="decimal"' : '') + (opts.list ? ' list="' + opts.list + '"' : '') + req + ' autocomplete="off">';
    return '<div class="field' + (opts.full ? ' col-full' : '') + '"><label for="' + id + '">' + esc(label) + (opts.required ? ' <span aria-hidden="true" style="color:var(--danger)">*</span>' : '') + '</label>' + input + (opts.hint ? '<span class="hint">' + esc(opts.hint) + '</span>' : '') + '</div>';
  }
  function colorRadios(name, value) {
    return '<div class="field col-full"><span class="label" id="lbl-' + name + '">Цвет</span><div class="swatches" role="radiogroup" aria-labelledby="lbl-' + name + '">' + BM.COLORS.map(function (col) {
      return '<label class="color-opt"><input type="radio" name="' + name + '" value="' + col + '"' + (value === col ? ' checked' : '') + ' aria-label="' + col + '"><span class="c-' + col + '"></span></label>';
    }).join('') + '</div></div>';
  }
  function mpOptions(withEmpty) {
    var o = withEmpty ? [['', 'Не указана']] : [];
    return o.concat(Object.keys(BM.MP).map(function (k) { return [k, BM.MP[k].label]; }));
  }
  function folderOptions() { return [['', 'Без папки']].concat(BM.state.folders.map(function (f) { return [f.id, f.name]; })); }

  // project
  function projectModal(p, folderId) {
    var isNew = !p;
    p = p || { name: '', category: '', status: 'idea', color: BM.COLORS[BM.state.projects.length % BM.COLORS.length], marketplaces: [], description: '', folderId: folderId || null };
    var mps = '<div class="field col-full"><span class="label" id="lbl-mp">Маркетплейсы</span><div class="chips" role="group" aria-labelledby="lbl-mp">' + Object.keys(BM.MP).map(function (k) {
      return '<label class="check-chip"><input type="checkbox" name="marketplaces" value="' + k + '" data-multi="1"' + (p.marketplaces.indexOf(k) > -1 ? ' checked' : '') + '><span class="chip">' + esc(BM.MP[k].label) + '</span></label>';
    }).join('') + '</div></div>';
    BM.openModal({
      title: isNew ? 'Новый бренд' : 'Параметры проекта',
      submit: isNew ? 'Создать' : 'Сохранить',
      body: '<datalist id="cats">' + BM.CATEGORIES.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
        '<div class="form-grid two">' +
        field('name', 'Название бренда', p.name, { required: true, full: true, ph: 'Например, Mira Skin' }) +
        field('category', 'Категория', p.category, { list: 'cats', ph: 'Косметика и уход' }) +
        field('status', 'Статус', p.status, { type: 'select', options: BM.STATUSES.map(function (s) { return [s.id, s.label]; }) }) +
        field('folderId', 'Папка', p.folderId || '', { type: 'select', options: folderOptions(), full: true }) +
        mps + colorRadios('color', p.color) +
        field('description', 'Описание', p.description, { type: 'textarea', full: true, ph: 'Что за бренд, для кого, в какие сроки запуск' }) + '</div>',
      onSubmit: function (d) {
        var data = { name: d.name, category: d.category, status: d.status, folderId: d.folderId || null, marketplaces: d.marketplaces || [], color: d.color || 'sage', description: d.description };
        if (isNew) {
          var np = BM.emptyProject(data);
          BM.state.projects.push(np);
          BM.touch(np);
          go('#/p/' + np.id + '/overview');
          BM.toast('Бренд «' + np.name + '» создан');
        } else {
          for (var k in data) p[k] = data[k];
          BM.touch(p); BM.render();
          BM.toast('Сохранено');
        }
      }
    });
  }

  function folderModal(f) {
    var isNew = !f;
    f = f || { name: '', color: 'sage' };
    BM.openModal({
      title: isNew ? 'Новая папка' : 'Папка', submit: isNew ? 'Создать' : 'Сохранить',
      body: '<div class="form-grid">' + field('name', 'Название', f.name, { required: true, ph: 'Клиент, категория или сезон' }) + colorRadios('color', f.color) + '</div>',
      onSubmit: function (d) {
        if (isNew) {
          var nf = { id: BM.uid(), name: d.name, color: d.color || 'sage', createdAt: Date.now() };
          BM.state.folders.push(nf); BM.persist(); go('#/projects/' + nf.id);
          BM.toast('Папка «' + nf.name + '» создана');
        } else { f.name = d.name; f.color = d.color || f.color; BM.persist(); BM.render(); }
      }
    });
  }

  function moveModal(p) {
    BM.openModal({
      title: 'Переместить «' + p.name + '»', submit: 'Переместить',
      body: field('folderId', 'Папка', p.folderId || '', { type: 'select', options: folderOptions() }),
      onSubmit: function (d) { p.folderId = d.folderId || null; BM.touch(p); BM.render(); BM.toast('Проект перемещён'); }
    });
  }

  // SKU
  var SKU_FIELDS = [
    ['sellPrice', 'Цена продажи, ₽', true], ['costPrice', 'Себестоимость, ₽'], ['packaging', 'Упаковка и маркировка, ₽'],
    ['logisticsIn', 'Логистика до склада МП, ₽'], ['logisticsOut', 'Логистика МП до покупателя, ₽'], ['otherCosts', 'Прочее на единицу, ₽'],
    ['commissionPct', 'Комиссия площадки, %'], ['adPct', 'ДРР (реклама), %'], ['taxPct', 'Налог, %']
  ];
  function skuModal(p, s) {
    var isNew = !s;
    s = s || { name: '', marketplace: p.marketplaces[0] || '', article: '' };
    BM.openModal({
      title: isNew ? 'Новый SKU' : 'SKU: ' + s.name, submit: isNew ? 'Добавить' : 'Сохранить',
      body: '<div class="form-grid two">' + field('name', 'Название', s.name, { required: true, ph: 'Крем для рук 50 мл' }) + field('marketplace', 'Площадка', s.marketplace, { type: 'select', options: mpOptions(true) }) +
        field('article', 'Артикул', s.article, { ph: 'необязательно' }) + '<div></div>' +
        SKU_FIELDS.map(function (f) { return field(f[0], f[1], s[f[0]], { num: true, required: f[2] }); }).join('') +
        '<div class="col-full preview-box" id="sku-preview" aria-live="polite"></div></div>',
      onInput: function (el) {
        var form = el.querySelector('form'), d = BM.formData(form), cmp = BM.computeSku(d);
        el.querySelector('#sku-preview').innerHTML = '<div class="row" style="justify-content:space-between"><b>Прибыль с единицы: ' + BM.money(cmp.profit) + '</b><span class="margin-pill ' + BM.marginClass(cmp.margin) + '">' + (cmp.margin == null ? '—' : 'маржа ' + cmp.margin.toFixed(1) + '%') + '</span></div>' +
          '<p class="small muted" style="margin-top:6px">Комиссия ' + BM.money(cmp.fee) + ' · реклама ' + BM.money(cmp.ad) + ' · налог ' + BM.money(cmp.tax) + ' · всего расходов ' + BM.money(cmp.total) + '</p>';
      },
      onSubmit: function (d) {
        if (isNew) p.skus.push(Object.assign({ id: BM.uid() }, d)); else Object.assign(s, d);
        BM.touch(p); BM.render(); BM.toast(isNew ? 'SKU добавлен' : 'Сохранено');
      }
    });
  }

  function entryModal(p, e) {
    var isNew = !e;
    e = e || { marketplace: p.marketplaces[0] || 'wb', weekLabel: '' };
    BM.openModal({
      title: isNew ? 'Данные за неделю' : 'Неделя ' + e.weekLabel, submit: 'Сохранить',
      body: '<div class="form-grid two">' + field('weekLabel', 'Неделя', e.weekLabel, { required: true, ph: '22–28 сентября' }) + field('marketplace', 'Площадка', e.marketplace, { type: 'select', options: mpOptions() }) +
        field('ourRevenue', 'Ваша выручка', e.ourRevenue, { ph: '2,1 млн ₽', hint: 'Первое число используется для графика и тренда' }) + field('categoryRevenue', 'Объём категории', e.categoryRevenue, { ph: '340 млн ₽' }) +
        field('marketShare', 'Доля рынка, %', e.marketShare, { num: true, ph: '0,6' }) + field('source', 'Источник', e.source, { ph: 'MPStats, отчёт от 28.09' }) +
        field('topProducts', 'Топ-товары и почему', e.topProducts, { type: 'textarea', full: true }) + field('declining', 'Просевшие товары и почему', e.declining, { type: 'textarea', full: true }) +
        field('leaderChanges', 'Смена лидеров', e.leaderChanges, { type: 'textarea', full: true }) + field('notes', 'Заметки', e.notes, { type: 'textarea', full: true }) + '</div>',
      onSubmit: function (d) {
        if (isNew) p.entries.push(Object.assign({ id: BM.uid(), order: Date.now() }, d)); else Object.assign(e, d);
        BM.touch(p); BM.render();
      }
    });
  }

  function taskModal(p, t) {
    BM.openModal({
      title: 'Задача', submit: 'Сохранить',
      body: '<div class="form-grid two">' + field('title', 'Что сделать', t.title, { required: true, full: true }) + field('due', 'Срок', t.due, { type: 'date' }) +
        field('priority', 'Приоритет', t.priority, { type: 'select', options: [['high', 'Высокий'], ['mid', 'Обычный'], ['low', 'Низкий']] }) +
        field('note', 'Комментарий', t.note, { type: 'textarea', full: true }) + '</div>',
      onSubmit: function (d) { Object.assign(t, d); BM.touch(p); BM.render(); }
    });
  }

  function compModal(p, cp) {
    var isNew = !cp;
    cp = cp || {};
    BM.openModal({
      title: isNew ? 'Новый конкурент' : cp.name, submit: 'Сохранить',
      body: '<div class="form-grid two">' + field('name', 'Бренд или товар', cp.name, { required: true }) + field('marketplace', 'Площадка', cp.marketplace, { type: 'select', options: mpOptions(true) }) +
        field('price', 'Цена', cp.price, { ph: '390–450 ₽' }) + field('rating', 'Рейтинг', cp.rating, { num: true, ph: '4,8' }) + field('reviews', 'Отзывов', cp.reviews, { num: true }) +
        field('url', 'Ссылка на карточку', cp.url, { type: 'url', ph: 'https://' }) +
        field('strengths', 'Сильные стороны', cp.strengths, { type: 'textarea' }) + field('weaknesses', 'Слабые стороны', cp.weaknesses, { type: 'textarea' }) + '</div>',
      onSubmit: function (d) {
        if (d.url && !/^https?:\/\//i.test(d.url)) d.url = 'https://' + d.url;
        if (isNew) p.competitors.push(Object.assign({ id: BM.uid() }, d)); else Object.assign(cp, d);
        BM.touch(p); BM.render();
      }
    });
  }

  function noteCreate(p, tplId) {
    var tpl = BM.NOTE_TEMPLATES.filter(function (t) { return t.id === tplId; })[0] || BM.NOTE_TEMPLATES[0];
    var n = { id: BM.uid(), title: tpl.id === 'blank' ? '' : tpl.title, body: tpl.body, pinned: false, updatedAt: Date.now() };
    p.notes.push(n); BM.ui.noteId = n.id;
    BM.closeModal(); BM.touch(p);
    go('#/p/' + p.id + '/notes');
    setTimeout(function () { var el = document.getElementById(n.title ? 'note-body' : 'note-title'); if (el) el.focus(); }, 60);
  }

  // remove item with undo
  function removeWithUndo(p, key, id, label) {
    var arr = p[key], idx = -1;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) idx = i;
    if (idx < 0) return;
    var item = arr.splice(idx, 1)[0];
    BM.touch(p); BM.render();
    BM.toast(label + ' удалено', { undo: function () { arr.splice(idx, 0, item); BM.touch(p); BM.render(); } });
  }
  function find(arr, id) { return arr.filter(function (x) { return x.id === id; })[0]; }

  function platformText(p) {
    var lines = ['Бренд-платформа: ' + p.name, ''];
    BM.PLATFORM.forEach(function (g) {
      var rows = g.fields.map(function (f) {
        var v = p.platform[f.k];
        if (Array.isArray(v)) v = v.join(', ');
        return v ? f.label + ': ' + v : '';
      }).filter(Boolean);
      if (rows.length) lines.push(g.title.toUpperCase(), rows.join('\n'), '');
    });
    var tmp = document.createElement('div'); tmp.innerHTML = BM.statement(p);
    if (p.platform.posAudience) lines.push('Positioning statement: ' + tmp.textContent);
    return lines.join('\n');
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(BM.state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'brand-manager-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    BM.toast('Копия скачана');
  }
  function importData(file) {
    var r = new FileReader();
    r.onload = function () {
      var data;
      try { data = JSON.parse(r.result); } catch (e) { BM.toast('Файл не похож на резервную копию (ошибка JSON)'); return; }
      var m = BM.migrate(data);
      BM.confirm('Восстановить из файла?', 'В файле ' + m.projects.length + ' ' + BM.plural(m.projects.length, 'проект', 'проекта', 'проектов') + ' и ' + m.folders.length + ' ' + BM.plural(m.folders.length, 'папка', 'папки', 'папок') + '. Текущие данные на этом устройстве будут заменены.', 'Заменить', function () {
        BM.state = m; BM.persist(); go('#/'); BM.toast('Данные восстановлены');
      });
    };
    r.readAsText(file);
  }

  // ---------- actions ----------
  var A = {
    'cmdk': function () { openCmdk(); },
    'open-drawer': openDrawer,
    'new-project': function (el) { projectModal(null, el.getAttribute('data-folder') || (route.name === 'projects' && route.folder !== 'none' ? route.folder : null)); },
    'new-folder': function () { folderModal(null); },
    'edit-project': function (el) { projectModal(BM.project(el.dataset.id)); },
    'toggle-theme': function () { BM.settings.theme = BM.isDark() ? 'light' : 'dark'; BM.saveSettings(); BM.applyTheme(); BM.render(); },
    'set-theme': function (el) { BM.settings.theme = el.dataset.id; BM.saveSettings(); BM.applyTheme(); BM.render(); },
    'reset-filters': function () { BM.ui.projQuery = ''; BM.ui.projStatus = ''; BM.render(); },
    'project-menu': function (el) {
      var p = BM.project(el.dataset.id);
      BM.openMenu(el, [
        { text: 'Открыть', icon: 'arrowR', run: function () { go('#/p/' + p.id); } },
        { text: 'Изменить параметры', icon: 'edit', run: function () { projectModal(p); } },
        { text: 'Переместить в папку…', icon: 'move', run: function () { moveModal(p); } },
        { text: p.pinned ? 'Открепить' : 'Закрепить наверху', icon: 'pin', run: function () { p.pinned = !p.pinned; BM.touch(p); BM.render(); } },
        { text: 'Дублировать', icon: 'copy', run: function () {
          var cp = JSON.parse(JSON.stringify(p)); cp.id = BM.uid(); cp.name = p.name + ' (копия)'; cp.createdAt = cp.updatedAt = Date.now(); cp.pinned = false;
          BM.state.projects.push(cp); BM.persist(); BM.render(); BM.toast('Копия создана');
        } },
        '-',
        { text: 'Удалить проект', icon: 'trash', danger: true, run: function () {
          BM.confirm('Удалить «' + p.name + '»?', 'Бренд-платформа, чек-лист, SKU, аналитика, задачи и заметки этого проекта будут удалены. Перед этим можно скачать резервную копию в настройках.', 'Удалить', function () {
            BM.state.projects = BM.state.projects.filter(function (x) { return x.id !== p.id; });
            BM.persist(); if (route.name === 'project') go('#/projects'); else BM.render();
            BM.toast('Проект удалён');
          });
        } }
      ]);
    },
    'folder-menu': function (el) {
      var f = BM.folder(el.dataset.id);
      BM.openMenu(el, [
        { text: 'Переименовать', icon: 'edit', run: function () { folderModal(f); } },
        { text: 'Новый проект в папке', icon: 'plus', run: function () { projectModal(null, f.id); } },
        '-',
        { text: 'Удалить папку', icon: 'trash', danger: true, run: function () {
          var n = BM.projectsIn(f.id).length;
          BM.confirm('Удалить папку «' + f.name + '»?', n ? 'Проекты (' + n + ') не удалятся — они переедут в «Без папки».' : 'Папка пустая.', 'Удалить папку', function () {
            BM.state.projects.forEach(function (p) { if (p.folderId === f.id) p.folderId = null; });
            BM.state.folders = BM.state.folders.filter(function (x) { return x.id !== f.id; });
            BM.persist(); go('#/projects');
          });
        } }
      ]);
    },
    'fab': function (el) {
      var p = currentProject();
      var items = [{ text: 'Новый бренд', icon: 'leaf', run: function () { projectModal(null); } }, { text: 'Новая папка', icon: 'folderPlus', run: function () { folderModal(null); } }];
      if (p) items = [{ label: p.name }, { text: 'Задача', icon: 'tasks', run: function () { go('#/p/' + p.id + '/tasks'); setTimeout(function () { var i = document.getElementById('qt-t'); if (i) i.focus(); }, 60); } },
        { text: 'Заметка', icon: 'note', run: function () { A['new-note'](null, p); } }, { text: 'SKU', icon: 'box', run: function () { skuModal(p); } },
        { text: 'Неделя аналитики', icon: 'chart', run: function () { entryModal(p); } }, '-'].concat(items);
      BM.openMenu(el, items);
    },
    'toggle-section': function (el) {
      var id = el.dataset.id, open = !BM.ui.openSections[id];
      BM.ui.openSections[id] = open;
      var block = el.closest('.section-block');
      block.classList.toggle('open', open); el.setAttribute('aria-expanded', open);
    },
    'expand-all': function () { BM.DATA.checklistSections.forEach(function (s) { BM.ui.openSections[s.id] = true; }); BM.render(); },
    'collapse-all': function () { BM.ui.openSections = {}; BM.render(); },
    'check-to-task': function (el) {
      var p = currentProject(), it = find(BM.allCheckItems(), el.dataset.id);
      if (!p || !it) return;
      var title = it.label.replace(/\*\*/g, '');
      p.tasks.push({ id: BM.uid(), title: title.length > 140 ? title.slice(0, 137) + '…' : title, due: '', priority: 'mid', note: '', done: false, createdAt: Date.now() });
      BM.touch(p);
      BM.toast('Задача добавлена во вкладку «Задачи»');
    },
    'color-add': function () {
      var p = currentProject(), v = document.getElementById('new-color').value.toUpperCase();
      if (p.platform.colors.indexOf(v) < 0) p.platform.colors.push(v);
      BM.touch(p); refreshColors(p);
    },
    'color-remove': function (el) { var p = currentProject(); p.platform.colors.splice(+el.dataset.i, 1); BM.touch(p); refreshColors(p); },
    'copy-platform': function (el) {
      var txt = platformText(BM.project(el.dataset.pid));
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { BM.toast('Платформа скопирована — вставьте в документ или бриф'); }, function () { BM.toast('Браузер не дал доступ к буферу обмена'); });
    },
    'new-sku': function (el) { skuModal(BM.project(el.dataset.pid)); },
    'edit-sku': function (el) { var p = BM.project(el.dataset.pid); skuModal(p, find(p.skus, el.dataset.id)); },
    'dup-sku': function (el) { var p = BM.project(el.dataset.pid), s = find(p.skus, el.dataset.id); p.skus.push(Object.assign({}, s, { id: BM.uid(), name: s.name + ' (копия)' })); BM.touch(p); BM.render(); },
    'del-sku': function (el) { removeWithUndo(BM.project(el.dataset.pid), 'skus', el.dataset.id, 'SKU'); },
    'new-entry': function (el) { entryModal(BM.project(el.dataset.pid)); },
    'edit-entry': function (el) { var p = BM.project(el.dataset.pid); entryModal(p, find(p.entries, el.dataset.id)); },
    'del-entry': function (el) { removeWithUndo(BM.project(el.dataset.pid), 'entries', el.dataset.id, 'Запись'); },
    'mp-filter': function (el) { BM.ui.mpFilter = el.dataset.id; BM.render(); },
    'task-filter': function (el) { BM.ui.taskFilter = el.dataset.id; BM.render(); },
    'edit-task': function (el) { var p = BM.project(el.dataset.pid); taskModal(p, find(p.tasks, el.dataset.id)); },
    'del-task': function (el) { removeWithUndo(BM.project(el.dataset.pid), 'tasks', el.dataset.id, 'Задача'); },
    'new-comp': function (el) { compModal(BM.project(el.dataset.pid)); },
    'edit-comp': function (el) { var p = BM.project(el.dataset.pid); compModal(p, find(p.competitors, el.dataset.id)); },
    'del-comp': function (el) { removeWithUndo(BM.project(el.dataset.pid), 'competitors', el.dataset.id, 'Конкурент'); },
    'new-note': function (el, proj) {
      var p = proj || BM.project(el.dataset.pid);
      BM.openModal({ title: 'Новая заметка', body: BM.templatesPicker(p).replace('<div class="card"><div class="card-head"><h3>Начните с шаблона</h3></div>', '<div>'), noFoot: true });
    },
    'note-create': function (el) { noteCreate(BM.project(el.dataset.pid), el.dataset.tpl); },
    'open-note': function (el) { BM.ui.noteId = el.dataset.id; BM.render(); },
    'pin-note': function (el) { var p = BM.project(el.dataset.pid), n = find(p.notes, el.dataset.id); n.pinned = !n.pinned; BM.touch(p); BM.render(); },
    'del-note': function (el) { var p = BM.project(el.dataset.pid); BM.ui.noteId = null; removeWithUndo(p, 'notes', el.dataset.id, 'Заметка'); },
    'sync-now': function () { if (!BM.canSync()) { BM.toast(navigator.onLine ? 'Сначала укажите токен и сохраните настройки' : 'Нет интернета'); return; } BM.runSync(true); },
    'export': exportData,
    'reset-all': function () {
      BM.confirm('Удалить все данные?', 'Все папки и проекты на этом устройстве будут удалены без возможности восстановления (если нет резервной копии).', 'Удалить всё', function () {
        BM.state = BM.migrate({ version: 2 }); BM.persist(); go('#/'); BM.toast('Данные удалены');
      });
    }
  };

  function refreshColors(p) {
    var sw = document.getElementById('swatches');
    if (sw) {
      var tmp = document.createElement('div');
      tmp.innerHTML = BM.colorsField(p);
      var hint = sw.nextElementSibling;
      sw.replaceWith(tmp.children[0]);
      hint.replaceWith(tmp.children[0]);
    }
    updatePlatformMeters(p);
  }

  // ---------- autosave (platform, notes, budget) ----------
  var savePlatform = BM.debounce(function (p) { BM.touch(p); flashSaved(); }, 450);
  function flashSaved() {
    var el = document.querySelector('[data-autosave]');
    if (el) el.innerHTML = icon('check', 'sm') + 'Сохранено ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  function updatePlatformMeters(p) {
    var pr = BM.platformProgress(p);
    var pct = document.querySelector('[data-pf-pct]'); if (pct) pct.textContent = pr.done + ' из ' + pr.total + ' · ' + pr.pct + '%';
    var bar = document.querySelector('[data-pf-bar] i'); if (bar) bar.style.width = pr.pct + '%';
    BM.PLATFORM.forEach(function (g) {
      var b = document.querySelector('[data-grp-count="' + g.id + '"]');
      if (!b) return;
      var filled = g.fields.filter(function (f) { var v = p.platform[f.k]; return Array.isArray(v) ? v.length : (v && String(v).trim()); }).length;
      b.textContent = filled + '/' + g.fields.length;
    });
    var st = document.getElementById('statement-slot'); if (st) st.innerHTML = BM.statement(p);
  }
  var saveNote = BM.debounce(function (p) { BM.touch(p); flashSaved(); }, 500);
  var saveProj = BM.debounce(function (p) { BM.touch(p); }, 450);

  // ---------- command palette ----------
  var cmdkEl, cmdkItems = [], cmdkSel = 0;
  function openCmdk() {
    closeDrawer(); BM.closeMenu();
    cmdkEl = document.getElementById('cmdk');
    cmdkEl.innerHTML = '<div class="cmdk-input">' + icon('search') + '<label class="sr-only" for="cmdk-q">Поиск</label><input id="cmdk-q" placeholder="Бренд, задача, заметка или команда…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="cmdk-list"><span class="kbd">Esc</span></div><div class="cmdk-list" id="cmdk-list" role="listbox"></div>';
    cmdkEl.showModal();
    var q = cmdkEl.querySelector('#cmdk-q');
    q.addEventListener('input', function () { cmdkSel = 0; fillCmdk(q.value); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { cmdkSel = Math.min(cmdkSel + 1, cmdkItems.length - 1); paintSel(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { cmdkSel = Math.max(cmdkSel - 1, 0); paintSel(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); runCmdk(cmdkSel); }
    });
    fillCmdk('');
    q.focus();
  }
  function fillCmdk(query) {
    var ql = query.trim().toLowerCase(), groups = [];
    function match(s) { return !ql || String(s).toLowerCase().indexOf(ql) > -1; }
    var cmds = [
      { t: 'Новый бренд', i: 'plus', run: function () { projectModal(null); } },
      { t: 'Новая папка', i: 'folderPlus', run: function () { folderModal(null); } },
      { t: 'Главная', i: 'home', run: function () { go('#/'); } },
      { t: 'Все проекты', i: 'grid', run: function () { go('#/projects'); } },
      { t: 'База знаний', i: 'book', run: function () { go('#/kb'); } },
      { t: 'Карта процессов', i: 'map', run: function () { go('#/kb/process'); } },
      { t: 'Настройки и синхронизация', i: 'sliders', run: function () { go('#/settings'); } },
      { t: BM.isDark() ? 'Светлая тема' : 'Тёмная тема', i: BM.isDark() ? 'sun' : 'moon', run: function () { A['toggle-theme'](); } }
    ].filter(function (x) { return match(x.t); });
    var projects = BM.state.projects.filter(function (p) { return match(p.name + ' ' + p.category); }).slice(0, 6).map(function (p) { return { t: p.name, sub: BM.statusLabel(p.status), i: 'leaf', run: function () { go('#/p/' + p.id); } }; });
    var folders = BM.state.folders.filter(function (f) { return match(f.name); }).slice(0, 4).map(function (f) { return { t: f.name, sub: 'папка', i: 'folder', run: function () { go('#/projects/' + f.id); } }; });
    var tasks = [], notes = [];
    if (ql) {
      BM.state.projects.forEach(function (p) {
        p.tasks.forEach(function (t) { if (match(t.title)) tasks.push({ t: t.title, sub: p.name, i: 'tasks', run: function () { BM.ui.taskFilter = 'all'; go('#/p/' + p.id + '/tasks'); } }); });
        p.notes.forEach(function (n) { if (match(n.title + ' ' + n.body)) notes.push({ t: n.title || 'Без названия', sub: p.name, i: 'note', run: function () { BM.ui.noteId = n.id; go('#/p/' + p.id + '/notes'); } }); });
      });
    }
    if (projects.length) groups.push(['Бренды', projects]);
    if (folders.length) groups.push(['Папки', folders]);
    if (tasks.length) groups.push(['Задачи', tasks.slice(0, 5)]);
    if (notes.length) groups.push(['Заметки', notes.slice(0, 5)]);
    if (cmds.length) groups.push(['Команды', cmds]);
    cmdkItems = [];
    var html = groups.map(function (g) {
      return '<div class="cmdk-group">' + g[0] + '</div>' + g[1].map(function (it) {
        var i = cmdkItems.push(it) - 1;
        return '<button type="button" class="cmdk-item" role="option" id="cmdk-o' + i + '" data-cmdk="' + i + '">' + icon(it.i) + '<span>' + esc(it.t) + '</span>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</button>';
      }).join('');
    }).join('');
    var list = cmdkEl.querySelector('#cmdk-list');
    list.innerHTML = html || '<div class="cmdk-empty">Ничего не найдено по запросу «' + esc(query) + '»</div>';
    paintSel();
  }
  function paintSel() {
    cmdkEl.querySelectorAll('.cmdk-item').forEach(function (b, i) { b.classList.toggle('sel', i === cmdkSel); b.setAttribute('aria-selected', i === cmdkSel); });
    var sel = cmdkEl.querySelector('#cmdk-o' + cmdkSel);
    var q = cmdkEl.querySelector('#cmdk-q');
    if (sel) { sel.scrollIntoView({ block: 'nearest' }); q.setAttribute('aria-activedescendant', sel.id); }
  }
  function runCmdk(i) { var it = cmdkItems[i]; if (!it) return; cmdkEl.close(); it.run(); }

  // ---------- events ----------
  document.addEventListener('DOMContentLoaded', function () {
    BM.render();

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (el && A[el.dataset.action]) { e.preventDefault(); A[el.dataset.action](el); return; }
      var ck = e.target.closest('[data-cmdk]');
      if (ck) { runCmdk(+ck.dataset.cmdk); return; }
      if (e.target.closest('.sidebar.drawer a')) closeDrawer();
    });
    document.getElementById('cmdk').addEventListener('click', function (e) { if (e.target.id === 'cmdk') e.target.close(); });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-check]')) {
        var p = currentProject(); if (!p) return;
        p.checklistDone[t.dataset.check] = t.checked;
        if (!t.checked) delete p.checklistDone[t.dataset.check];
        BM.touch(p);
        var row = t.closest('.check-row'); if (row) row.classList.toggle('done', t.checked);
        var pr = BM.checkProgress(p);
        var cnt = document.querySelector('[data-ck-count]'); if (cnt) cnt.textContent = pr.done + ' из ' + pr.total;
        var bar = document.querySelector('[data-ck-bar] i'); if (bar) bar.style.width = pr.pct + '%';
        var block = t.closest('.section-block');
        if (block) {
          var sec = BM.DATA.checklistSections.filter(function (s) { return s.id === block.dataset.section; })[0];
          var items = BM.checkItems(sec), done = items.filter(function (it) { return p.checklistDone[it.id]; }).length;
          var sc = block.querySelector('[data-sec-count]'); if (sc) sc.textContent = done + '/' + items.length;
          var sb = block.querySelector('.mini .progress i'); if (sb) sb.style.width = Math.round(done / items.length * 100) + '%';
        }
        if (route.tab === 'overview') setTimeout(BM.render, 350);
        return;
      }
      if (t.matches('[data-task-toggle]')) {
        var pp = BM.project(t.dataset.pid), task = pp && find(pp.tasks, t.dataset.taskToggle);
        if (!task) return;
        task.done = t.checked; task.doneAt = t.checked ? Date.now() : null;
        BM.touch(pp);
        setTimeout(BM.render, 300);
        if (t.checked) BM.toast('Задача выполнена', { undo: function () { task.done = false; BM.touch(pp); BM.render(); } });
        return;
      }
      if (t.matches('select[data-ui]')) { BM.ui[t.dataset.ui] = t.value; rerenderKeepFocus(); return; }
      if (t.id === 'import-file' && t.files[0]) { importData(t.files[0]); t.value = ''; }
    });

    document.addEventListener('input', function (e) {
      var t = e.target, p;
      if (t.matches('input[data-ui]')) {
        BM.ui[t.dataset.ui] = t.value;
        if (t.dataset.ui === 'checkQuery') { p = currentProject(); document.getElementById('sections-slot').innerHTML = BM.checklistSections(p, t.value); }
        else rerenderKeepFocus();
        return;
      }
      if (t.matches('[data-pf]')) {
        p = currentProject(); if (!p) return;
        p.platform[t.dataset.pf] = t.value;
        updatePlatformMeters(p);
        var as = document.querySelector('[data-autosave]'); if (as) as.innerHTML = icon('refresh', 'sm') + 'Сохраняю…';
        savePlatform(p);
        return;
      }
      if (t.matches('[data-note]')) {
        p = currentProject(); var n = p && find(p.notes, BM.ui.noteId);
        if (!n) return;
        n[t.dataset.note] = t.value; n.updatedAt = Date.now();
        var item = document.querySelector('.note-item.active');
        if (item) { item.querySelector('b').textContent = n.title || 'Без названия'; item.querySelector('span').textContent = (n.body || '').slice(0, 120) || 'Пусто'; }
        saveNote(p);
        return;
      }
      if (t.matches('[data-pfield]')) {
        p = currentProject(); if (!p) return;
        p[t.dataset.pfield] = t.value;
        saveProj(p);
        var slot = document.getElementById('be-slot');
        if (slot) { var tmp = document.createElement('div'); tmp.innerHTML = V.tab_products(p); var fresh = tmp.querySelector('#be-slot'); if (fresh) slot.innerHTML = fresh.innerHTML; }
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f.matches('[data-form="quick-task"]')) {
        e.preventDefault();
        var p = BM.project(f.dataset.pid), d = BM.formData(f);
        if (!d.title) { f.querySelector('[name=title]').focus(); return; }
        p.tasks.push({ id: BM.uid(), title: d.title, due: d.due || '', priority: d.priority || 'mid', note: '', done: false, createdAt: Date.now() });
        BM.touch(p); BM.render();
        var inp = document.getElementById(f.querySelector('[name=title]').id); if (inp) inp.focus();
        return;
      }
      if (f.matches('[data-form="settings-sync"]')) {
        e.preventDefault();
        var s = BM.formData(f);
        BM.settings.owner = s.owner; BM.settings.repo = s.repo; BM.settings.path = s.path || 'state.json'; BM.settings.token = s.token;
        BM.saveSettings(); BM.toast('Настройки сохранены');
        if (BM.canSync()) BM.runSync(true); else BM.render();
      }
    });

    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) { e.preventDefault(); openCmdk(); return; }
      if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) { e.preventDefault(); openCmdk(); return; }
      if (e.key === 'Escape') closeDrawer();
    });

    window.addEventListener('hashchange', function () { closeDrawer(); BM.closeModal(); BM.render(); });
    window.addEventListener('online', function () { BM.setSyncStatus('idle'); BM.scheduleSync(); });
    window.addEventListener('offline', function () { BM.setSyncStatus('offline'); });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (BM.settings.theme === 'system') BM.render(); });

    if (BM.canSync()) BM.runSync();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  });
})();
