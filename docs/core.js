(function () {
  'use strict';
  var BM = window.BM = {};
  BM.DATA = window.APP_DATA;

  // ---------- utils ----------
  BM.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  BM.md = function (s) { return BM.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); };
  BM.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  BM.num = function (s) {
    if (s == null || s === '') return null;
    var m = String(s).replace(/\s/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  BM.money = function (n) {
    if (n == null || isNaN(n)) return '—';
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
  };
  BM.date = function (ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
  };
  BM.dateTime = function (ts) {
    try { return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  };
  BM.relDay = function (iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
    var diff = Math.round((d - t) / 86400000);
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    if (diff === -1) return 'вчера';
    if (diff < 0) return 'просрочено · ' + BM.date(d);
    if (diff < 7) return 'через ' + diff + ' дн.';
    return BM.date(d);
  };
  BM.isOverdue = function (iso) {
    if (!iso) return false;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return new Date(iso + 'T00:00:00') < t;
  };
  BM.debounce = function (fn, ms) {
    var h; return function () { var a = arguments, self = this; clearTimeout(h); h = setTimeout(function () { fn.apply(self, a); }, ms); };
  };
  BM.initials = function (name) {
    var w = String(name || '?').trim().split(/\s+/);
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0][1] || ''))).toUpperCase();
  };
  BM.plural = function (n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  // ---------- icons (Lucide-style strokes) ----------
  var P = {
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    folderPlus: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/><path d="M12 10v6M9 13h6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkSq: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    tasks: '<rect x="3" y="5" width="6" height="6" rx="1.5"/><path d="m3 17 2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
    sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    layout: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    refresh: '<path d="M21 12a9 9 0 0 0-15.7-6L3 8M3 3v5h5M3 12a9 9 0 0 0 15.7 6l2.3-2M16 16h5v5"/>',
    pin: '<path d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    move: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/><path d="m12 10 3 3-3 3M9 13h6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>',
    command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
    arrowR: '<path d="M5 12h14M12 5l7 7-7 7"/>'
  };
  BM.icon = function (name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';
  };

  // ---------- constants ----------
  BM.STATUSES = [
    { id: 'idea', label: 'Идея' },
    { id: 'strategy', label: 'Стратегия' },
    { id: 'development', label: 'Разработка' },
    { id: 'launch', label: 'Запуск' },
    { id: 'live', label: 'В продаже' },
    { id: 'paused', label: 'Пауза' }
  ];
  BM.statusLabel = function (id) { var s = BM.STATUSES.filter(function (x) { return x.id === id; })[0]; return s ? s.label : 'Идея'; };
  BM.COLORS = ['sage', 'clay', 'blush', 'butter', 'sky', 'lilac', 'moss'];
  BM.CATEGORIES = ['Косметика и уход', 'Бытовая химия', 'Продукты питания', 'БАДы и здоровье', 'Одежда и аксессуары', 'Товары для дома', 'Детские товары', 'Зоотовары', 'Электроника'];
  BM.MP = BM.DATA.marketplaces;

  BM.PLATFORM = [
    { id: 'core', title: 'Основа бренда', hint: 'Зачем бренд существует и что он обещает покупателю', fields: [
      { k: 'mission', label: 'Миссия', type: 'textarea', ph: 'Зачем бренд существует, какую проблему решает для покупателя' },
      { k: 'vision', label: 'Видение', type: 'textarea', ph: 'Каким бренд видит себя через 2–3 года' },
      { k: 'values', label: 'Ценности', type: 'textarea', ph: '3–5 принципов: в продукте, сервисе и коммуникации' },
      { k: 'promise', label: 'Обещание бренда', type: 'text', ph: 'Одно ключевое обещание, которое бренд выполняет каждый раз' }
    ]},
    { id: 'audience', title: 'Аудитория и отстройка', hint: 'Кто покупатель и чем мы отличаемся от брендов компании и конкурентов', fields: [
      { k: 'audience', label: 'Портрет покупателя', type: 'textarea', ph: 'Пол, возраст, доход, триггеры покупки в категории' },
      { k: 'problem', label: 'Ключевая проблема покупателя', type: 'textarea', ph: 'Что болит и почему текущие решения не устраивают' },
      { k: 'usp', label: 'УТП', type: 'text', ph: 'Уникальное торговое предложение в одной фразе' },
      { k: 'priceSegment', label: 'Ценовой сегмент', type: 'select', options: ['Масс-маркет', 'Средний', 'Средний+', 'Премиум'] },
      { k: 'differentiation', label: 'Отстройка от брендов компании', type: 'textarea', ph: 'ЦА, цена, УТП, стиль — чем новый бренд не каннибализирует существующие', full: true }
    ]},
    { id: 'positioning', title: 'Positioning statement', hint: 'Заполните четыре поля — формула соберётся сама', builder: true, fields: [
      { k: 'posAudience', label: 'Для кого', type: 'text', ph: 'женщин 25–35, которые ценят быстрый уход' },
      { k: 'posCategory', label: 'Категория', type: 'text', ph: 'уходовая косметика для рук' },
      { k: 'posDiff', label: 'Ключевое отличие', type: 'text', ph: 'впитывается за 10 секунд' },
      { k: 'posProof', label: 'Доказательство', type: 'text', ph: 'лёгкая формула на гиалуроне' }
    ]},
    { id: 'character', title: 'Характер и голос', hint: 'Как бренд звучит в карточках, соцсетях и ответах на отзывы', fields: [
      { k: 'archetype', label: 'Архетип', type: 'select', options: ['Заботливый', 'Мудрец', 'Искатель', 'Творец', 'Бунтарь', 'Маг', 'Герой', 'Правитель', 'Славный малый', 'Любовник', 'Шут', 'Невинный'] },
      { k: 'address', label: 'Обращение', type: 'select', options: ['На «ты»', 'На «вы»', 'Смешанное'] },
      { k: 'tone', label: 'Tone of voice', type: 'textarea', ph: 'Формально или дружески, с юмором или серьёзно', full: true },
      { k: 'sayDo', label: 'Как говорим', type: 'textarea', ph: 'Примеры фраз в стиле бренда' },
      { k: 'sayDont', label: 'Как не говорим', type: 'textarea', ph: 'Запрещённые слова и обещания (например, медицинские термины)' }
    ]},
    { id: 'naming', title: 'Нейминг и товарный знак', hint: '10–15 вариантов → проверка → заявка в Роспатент', fields: [
      { k: 'nameOptions', label: 'Варианты названия', type: 'textarea', ph: 'По одному на строку', full: true },
      { k: 'nameChosen', label: 'Выбранное название', type: 'text', ph: '' },
      { k: 'tmStatus', label: 'Статус товарного знака', type: 'select', options: ['Не проверяли', 'Проверено по Роспатенту', 'Заявка подана', 'Зарегистрирован'] }
    ]},
    { id: 'messaging', title: 'Messaging house', hint: 'Главное сообщение и 3 опоры — основа для карточек, рекламы и соцсетей', fields: [
      { k: 'msgMain', label: 'Главное сообщение', type: 'text', ph: '', full: true },
      { k: 'msg1', label: 'Аргумент 1', type: 'text', ph: 'Состав / технология' },
      { k: 'msg2', label: 'Аргумент 2', type: 'text', ph: 'Результат / выгода' },
      { k: 'msg3', label: 'Аргумент 3', type: 'text', ph: 'Цена / доверие / отзывы', full: true }
    ]},
    { id: 'visual', title: 'Визуальная айдентика', hint: 'Цвета, шрифты и ссылки на макеты', fields: [
      { k: 'colors', label: 'Цвета бренда', type: 'colors', full: true },
      { k: 'fonts', label: 'Шрифты', type: 'text', ph: 'Заголовки / основной текст' },
      { k: 'logo', label: 'Логотип', type: 'text', ph: 'Ссылка на файл или статус разработки' },
      { k: 'refs', label: 'Референсы и ссылки', type: 'textarea', ph: 'Figma, Canva, Pinterest, брендбук…', full: true }
    ]}
  ];
  BM.platformKeys = [];
  BM.PLATFORM.forEach(function (g) { g.fields.forEach(function (f) { BM.platformKeys.push(f.k); }); });

  BM.NOTE_TEMPLATES = [
    { id: 'blank', title: 'Пустая заметка', desc: 'Чистый лист', body: '' },
    { id: 'meeting', title: 'Встреча', desc: 'Повестка, решения, задачи', body: 'Дата:\nУчастники:\n\nПовестка\n— \n\nРешения\n— \n\nСледующие шаги\n— ' },
    { id: 'designBrief', title: 'Бриф дизайнеру', desc: 'Упаковка или карточка', body: 'Задача:\nПозиционирование:\nЦелевая аудитория:\nРеференсы:\nОбязательная информация на упаковке: наименование, состав (INCI), объём, срок годности, условия хранения, производитель, EAN-13, код Честного знака\nФормат и сроки:' },
    { id: 'bloggerBrief', title: 'Бриф блогеру', desc: 'Интеграция и посев', body: 'Продукт:\nКлючевое сообщение:\nЧто обязательно сказать:\nЧего нельзя говорить:\nПромокод / ссылка на карточку:\nФормат и дата выхода:\nБюджет:' },
    { id: 'manufacturer', title: 'Запрос производителю', desc: 'MOQ, сроки, сертификаты', body: 'Производитель:\nКонтакт:\n\nMOQ:\nСроки производства:\nГотовые формулы под лейбл:\nСертификаты на сырьё:\nСтоимость единицы:\nОбразцы: заказаны / получены / протестированы' },
    { id: 'hypothesis', title: 'Гипотеза', desc: 'Проверка идеи на метриках', body: 'Если мы …,\nто …,\nпотому что ….\n\nМетрика успеха:\nСрок проверки:\nРезультат:' }
  ];

  // ---------- store ----------
  var STATE_KEY = 'bmh-state-v1';
  var SETTINGS_KEY = 'bmh-settings-v1';

  function emptyProject(fields) {
    var p = {
      id: BM.uid(), folderId: null, name: 'Новый бренд', category: '', status: 'idea', color: 'sage',
      marketplaces: [], description: '', pinned: false, createdAt: Date.now(), updatedAt: Date.now(),
      platform: { colors: [] }, checklistDone: {}, skus: [], entries: [], tasks: [], notes: [], competitors: [], launchBudget: ''
    };
    for (var k in fields) p[k] = fields[k];
    return p;
  }
  BM.emptyProject = emptyProject;

  function normalizeProject(p) {
    var d = emptyProject({});
    for (var k in d) if (p[k] === undefined) p[k] = d[k];
    if (!p.platform.colors) p.platform.colors = [];
    return p;
  }

  BM.migrate = function (s) {
    if (!s || typeof s !== 'object') s = {};
    if (s.version === 2) {
      s.folders = s.folders || [];
      s.projects = (s.projects || []).map(normalizeProject);
      return s;
    }
    var v2 = { version: 2, updatedAt: s.updatedAt || 0, folders: [], projects: [] };
    var hasLegacy = (s.checklistDone && Object.keys(s.checklistDone).length) || (s.marketplaceEntries && s.marketplaceEntries.length) || (s.skuEntries && s.skuEntries.length);
    if (hasLegacy) {
      v2.projects.push(emptyProject({
        name: 'Мой бренд', status: 'strategy', checklistDone: s.checklistDone || {},
        entries: s.marketplaceEntries || [], skus: s.skuEntries || [], launchBudget: s.launchBudget || ''
      }));
    }
    return v2;
  };

  function load() {
    try { return BM.migrate(JSON.parse(localStorage.getItem(STATE_KEY))); } catch (e) { return BM.migrate(null); }
  }
  BM.state = load();

  BM.persist = function () {
    BM.state.updatedAt = Date.now();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(BM.state)); } catch (e) { BM.toast('Не удалось сохранить: память браузера заполнена'); }
    BM.scheduleSync();
  };
  BM.touch = function (project) { if (project) project.updatedAt = Date.now(); BM.persist(); };
  BM.replaceState = function (s) {
    BM.state = BM.migrate(s);
    try { localStorage.setItem(STATE_KEY, JSON.stringify(BM.state)); } catch (e) {}
  };

  BM.project = function (id) { return BM.state.projects.filter(function (p) { return p.id === id; })[0] || null; };
  BM.folder = function (id) { return BM.state.folders.filter(function (f) { return f.id === id; })[0] || null; };
  BM.projectsIn = function (folderId) { return BM.state.projects.filter(function (p) { return (p.folderId || null) === (folderId || null); }); };

  // checklist helpers
  BM.checkItems = function (sec) {
    var out = [];
    sec.blocks.forEach(function (b) { if (b.type === 'check') out = out.concat(b.items); });
    return out;
  };
  BM.allCheckItems = function () {
    var out = [];
    BM.DATA.checklistSections.forEach(function (s) { out = out.concat(BM.checkItems(s)); });
    return out;
  };
  var TOTAL_CHECK = BM.allCheckItems().length;
  BM.checkProgress = function (p) {
    var done = 0;
    for (var k in p.checklistDone) if (p.checklistDone[k]) done++;
    return { done: done, total: TOTAL_CHECK, pct: TOTAL_CHECK ? Math.round(done / TOTAL_CHECK * 100) : 0 };
  };
  BM.platformProgress = function (p) {
    var filled = 0;
    BM.platformKeys.forEach(function (k) {
      var v = p.platform[k];
      if (Array.isArray(v) ? v.length : (v && String(v).trim())) filled++;
    });
    return { done: filled, total: BM.platformKeys.length, pct: Math.round(filled / BM.platformKeys.length * 100) };
  };
  BM.taskProgress = function (p) {
    var total = p.tasks.length, done = p.tasks.filter(function (t) { return t.done; }).length;
    return { done: done, total: total, open: total - done, pct: total ? Math.round(done / total * 100) : 0 };
  };
  BM.overallProgress = function (p) {
    return Math.round((BM.checkProgress(p).pct * 0.6) + (BM.platformProgress(p).pct * 0.4));
  };

  BM.computeSku = function (s) {
    var sell = BM.num(s.sellPrice) || 0;
    var fee = sell * (BM.num(s.commissionPct) || 0) / 100;
    var ad = sell * (BM.num(s.adPct) || 0) / 100;
    var tax = sell * (BM.num(s.taxPct) || 0) / 100;
    var fixed = ['costPrice', 'packaging', 'logisticsIn', 'logisticsOut', 'otherCosts'].reduce(function (a, k) { return a + (BM.num(s[k]) || 0); }, 0);
    var total = fixed + fee + ad + tax;
    var profit = sell - total;
    return { fee: fee, ad: ad, tax: tax, total: total, profit: profit, margin: sell ? profit / sell * 100 : null };
  };
  BM.marginClass = function (m) { return m == null ? 'm-mid' : (m >= 20 ? 'm-good' : (m >= 5 ? 'm-mid' : 'm-bad')); };

  // ---------- settings & theme ----------
  function defaultSettings() { return { owner: 'alenasivakovan-art', repo: 'brand-manager-data', token: '', path: 'state.json', theme: 'system' }; }
  try { BM.settings = Object.assign(defaultSettings(), JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { BM.settings = defaultSettings(); }
  BM.saveSettings = function () { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(BM.settings)); } catch (e) {} };
  BM.applyTheme = function () {
    var t = BM.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  };
  BM.isDark = function () {
    var t = BM.settings.theme;
    return t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  BM.applyTheme();

  // ---------- GitHub sync ----------
  var syncTimer = null;
  BM.syncStatus = navigator.onLine ? 'idle' : 'offline';
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(str) { return decodeURIComponent(escape(atob(str))); }
  function ghUrl() {
    var s = BM.settings;
    return 'https://api.github.com/repos/' + encodeURIComponent(s.owner) + '/' + encodeURIComponent(s.repo) + '/contents/' + s.path.split('/').map(encodeURIComponent).join('/');
  }
  function ghHeaders() { return { 'Authorization': 'Bearer ' + BM.settings.token, 'Accept': 'application/vnd.github+json' }; }
  BM.canSync = function () { var s = BM.settings; return !!(s.owner && s.repo && s.token && s.path) && navigator.onLine; };
  BM.setSyncStatus = function (st) {
    BM.syncStatus = st;
    document.querySelectorAll('[data-sync-dot]').forEach(function (el) { el.className = 'sync-dot ' + st; });
    document.querySelectorAll('[data-sync-label]').forEach(function (el) { el.textContent = BM.syncLabel(); });
  };
  BM.syncLabel = function () {
    if (!navigator.onLine) return 'Офлайн — всё сохранено на устройстве';
    if (!BM.canSync()) return 'Только на этом устройстве';
    return { idle: 'Синхронизация включена', syncing: 'Синхронизация…', ok: 'Синхронизировано', err: 'Ошибка синхронизации' }[BM.syncStatus] || 'Синхронизация включена';
  };
  BM.scheduleSync = function () {
    if (!BM.canSync()) { BM.setSyncStatus(navigator.onLine ? 'idle' : 'offline'); return; }
    clearTimeout(syncTimer);
    syncTimer = setTimeout(BM.runSync, 1500);
  };
  BM.runSync = function (manual) {
    if (!BM.canSync()) { BM.setSyncStatus(navigator.onLine ? 'idle' : 'offline'); return Promise.resolve(); }
    BM.setSyncStatus('syncing');
    return fetch(ghUrl(), { headers: ghHeaders(), cache: 'no-store' }).then(function (res) {
      if (res.status === 404) return { notFound: true };
      if (!res.ok) throw new Error(res.status === 401 ? 'Токен недействителен' : 'GitHub ответил ' + res.status);
      return res.json();
    }).then(function (data) {
      var remote = null, sha = null;
      if (!data.notFound) {
        sha = data.sha;
        try { remote = JSON.parse(b64dec(data.content.replace(/\n/g, ''))); } catch (e) { remote = null; }
      }
      if (remote && (remote.updatedAt || 0) > (BM.state.updatedAt || 0)) {
        BM.replaceState(remote);
        BM.settings.lastSyncAt = Date.now(); BM.saveSettings();
        BM.setSyncStatus('ok');
        if (BM.render) BM.render();
        if (manual) BM.toast('Загружена более свежая версия с другого устройства');
        return;
      }
      var body = { message: 'Sync ' + new Date().toISOString(), content: b64enc(JSON.stringify(BM.state)) };
      if (sha) body.sha = sha;
      return fetch(ghUrl(), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()), body: JSON.stringify(body) })
        .then(function (res) { if (!res.ok) throw new Error('GitHub ответил ' + res.status); })
        .then(function () {
          BM.settings.lastSyncAt = Date.now(); BM.saveSettings();
          BM.setSyncStatus('ok');
          if (manual) BM.toast('Данные сохранены в GitHub');
        });
    }).catch(function (e) {
      BM.setSyncStatus('err');
      if (manual) BM.toast('Синхронизация не удалась: ' + e.message);
    });
  };

  // ---------- toast ----------
  BM.toast = function (msg, opts) {
    opts = opts || {};
    var box = document.getElementById('toasts');
    if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span>' + BM.esc(msg) + '</span>' + (opts.undo ? '<button type="button">Отменить</button>' : '');
    box.appendChild(t);
    var remove = function () { if (t.parentNode) t.parentNode.removeChild(t); };
    if (opts.undo) t.querySelector('button').addEventListener('click', function () { opts.undo(); remove(); });
    setTimeout(remove, opts.undo ? 6000 : 3500);
  };

  // ---------- modal ----------
  var modalEl = null, modalSubmit = null, modalOnInput = null;
  BM.openModal = function (o) {
    modalEl = modalEl || document.getElementById('modal');
    modalSubmit = o.onSubmit || null;
    modalOnInput = o.onInput || null;
    modalEl.innerHTML = '<form class="modal-form" novalidate style="display:contents">' +
      '<div class="modal-head"><h2 id="modal-title">' + BM.esc(o.title) + '</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Закрыть">' + BM.icon('x') + '</button></div>' +
      '<div class="modal-body">' + o.body + '</div>' +
      (o.noFoot ? '' : '<div class="modal-foot">' + (o.danger || '') +
      '<button type="button" class="btn ghost" data-close>Отмена</button>' +
      '<button type="submit" class="btn primary">' + BM.esc(o.submit || 'Сохранить') + '</button></div>') + '</form>';
    modalEl.setAttribute('aria-labelledby', 'modal-title');
    modalEl.showModal();
    var first = modalEl.querySelector('.modal-body input:not([type=hidden]):not([type=radio]):not([type=checkbox]), .modal-body textarea, .modal-body select');
    if (first) setTimeout(function () { first.focus(); }, 30);
    if (modalOnInput) modalOnInput(modalEl);
  };
  BM.closeModal = function () { if (modalEl && modalEl.open) modalEl.close(); };
  BM.formData = function (form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        if (el.dataset.multi) { out[el.name] = out[el.name] || []; if (el.checked) out[el.name].push(el.value); }
        else out[el.name] = el.checked;
      } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value.trim();
    });
    return out;
  };
  document.addEventListener('DOMContentLoaded', function () {
    modalEl = document.getElementById('modal');
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl || e.target.closest('[data-close]')) BM.closeModal();
    });
    modalEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var invalid = Array.prototype.filter.call(form.querySelectorAll('[required]'), function (el) { return !el.value.trim(); });
      form.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
      if (invalid.length) {
        invalid.forEach(function (el) {
          el.setAttribute('aria-invalid', 'true');
          var msg = document.createElement('span');
          msg.className = 'hint field-error'; msg.style.color = 'var(--danger)'; msg.id = el.id + '-err';
          msg.textContent = 'Заполните это поле';
          el.setAttribute('aria-describedby', msg.id);
          el.parentNode.appendChild(msg);
        });
        invalid[0].focus();
        return;
      }
      if (modalSubmit && modalSubmit(BM.formData(form)) !== false) BM.closeModal();
    });
    modalEl.addEventListener('input', function () { if (modalOnInput) modalOnInput(modalEl); });
  });

  BM.confirm = function (title, text, action, cb) {
    BM.openModal({ title: title, body: '<p class="muted">' + BM.esc(text) + '</p>', submit: action || 'Удалить', onSubmit: function () { cb(); } });
    var btn = modalEl.querySelector('button[type=submit]');
    btn.classList.remove('primary'); btn.classList.add('danger');
  };

  // ---------- context menu ----------
  var menuEl = null;
  BM.closeMenu = function () { if (menuEl) { menuEl.remove(); menuEl = null; } };
  BM.openMenu = function (anchor, items) {
    BM.closeMenu();
    menuEl = document.createElement('div');
    menuEl.className = 'menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.innerHTML = items.map(function (it, i) {
      if (it === '-') return '<hr>';
      if (it.label && !it.run) return '<div class="menu-label">' + BM.esc(it.label) + '</div>';
      return '<button type="button" role="menuitem" data-i="' + i + '" class="' + (it.danger ? 'danger' : '') + '">' + (it.icon ? BM.icon(it.icon, 'sm') : '') + BM.esc(it.text) + '</button>';
    }).join('');
    document.body.appendChild(menuEl);
    var r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    var left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
    var top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menuEl.style.left = left + 'px'; menuEl.style.top = top + 'px';
    menuEl.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b) return;
      var it = items[+b.getAttribute('data-i')];
      BM.closeMenu();
      it.run();
    });
    var firstBtn = menuEl.querySelector('button');
    if (firstBtn) firstBtn.focus();
  };
  document.addEventListener('mousedown', function (e) { if (menuEl && !menuEl.contains(e.target)) BM.closeMenu(); });
  document.addEventListener('keydown', function (e) {
    if (!menuEl) return;
    if (e.key === 'Escape') { BM.closeMenu(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var btns = Array.prototype.slice.call(menuEl.querySelectorAll('button'));
      var i = btns.indexOf(document.activeElement);
      i = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
      btns[i].focus(); e.preventDefault();
    }
  });
  window.addEventListener('resize', BM.closeMenu);
  window.addEventListener('scroll', BM.closeMenu, true);
})();
