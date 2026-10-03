(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon;

  // ---------- model ----------
  var LAYERS = [
    { id: 0, title: 'Ресурсы', hint: 'что вкладываем' },
    { id: 1, title: 'Действия', hint: 'что делаем' },
    { id: 2, title: 'Показатели', hint: 'что измеряем' },
    { id: 3, title: 'Результат', hint: 'что получаем' },
    { id: 4, title: 'Бренд и компания', hint: 'что накапливается' }
  ];

  // polarity: 1 — чем выше, тем лучше; -1 — чем ниже, тем лучше
  var NODES = [
    { id: 'budget', layer: 0, label: 'Бюджет', polarity: 1, desc: 'Деньги на первую партию, рекламу, SMM и блогеров. Ограничивает скорость роста всех действий.', measure: 'Методика — раздел «Бюджет запуска»: себестоимость первой партии ÷ 0,3–0,4 = общий бюджет.' },
    { id: 'platform', layer: 0, label: 'Бренд-платформа', polarity: 1, desc: 'Позиционирование, УТП, ценности, tone of voice и messaging house. Задаёт, что и как бренд говорит везде.', measure: 'Заполненность вкладки «Бренд-платформа» в проекте.' },
    { id: 'packaging', layer: 0, label: 'Упаковка и дизайн', polarity: 1, desc: 'Визуальная айдентика и упаковка. На маленьком превью в выдаче именно она решает, заметят ли товар.', measure: 'Тест превью среди 10 конкурентов в выдаче; CTR после смены главного фото.' },
    { id: 'product', layer: 0, label: 'Продукт и качество', polarity: 1, desc: 'Рецептура, текстура, стабильность, соответствие обещаниям. Фундамент отзывов и повторных покупок.', measure: 'Тест образцов, доля выкупа, тональность отзывов о самом продукте.' },
    { id: 'price', layer: 0, label: 'Цена', polarity: 1, desc: 'Цена относительно категории. Выше цена — больше маржа, но ниже конверсия; баланс ищется по юнит-экономике.', measure: 'Сравнение с топ-выдачей по ключевым запросам; калькулятор во вкладке «Продукты».' },

    { id: 'ads', layer: 1, label: 'Реклама на МП', polarity: 1, desc: 'Поиск и карточки конкурентов — основной разгон в первые недели. Даёт продажи и подталкивает органику.', measure: 'Расходы, CPC, CTR и ДРР по каждому ключевому запросу.' },
    { id: 'promo', layer: 1, label: 'Акции и скидки', polarity: 1, desc: 'Участие в акциях площадки даёт видимость новой карточке, но режет маржу.', measure: 'Прирост заказов в дни акции против падения маржи на единицу.' },
    { id: 'influencers', layer: 1, label: 'Блогеры и посевы', polarity: 1, desc: 'Микроинфлюэнсеры и посевы в Telegram: охват, первые отзывы и UGC.', measure: 'Переходы по промокодам и UTM, стоимость за переход и за заказ.' },
    { id: 'smm', layer: 1, label: 'SMM и контент', polarity: 1, desc: 'Соцсети бренда: узнаваемость и доверие, которые поддерживают конверсию на маркетплейсе.', measure: 'Охват, ER, CTR в карточку, доля переходов с SMM.' },
    { id: 'card', layer: 1, label: 'Карточка товара', polarity: 1, desc: 'Название, SEO, инфографика 5–9 слайдов, видео, полностью заполненные характеристики.', measure: 'CTR из выдачи, конверсия карточки, позиции по ключам.' },
    { id: 'reviewsWork', layer: 1, label: 'Работа с отзывами', polarity: 1, desc: 'Ответы на все отзывы, программы за баллы для первых отзывов, работа с негативом.', measure: 'Доля отзывов с ответом, скорость ответа, динамика рейтинга.' },
    { id: 'stock', layer: 1, label: 'Логистика и остатки', polarity: 1, desc: 'Поставки, приёмка, наличие на складах. Out-of-stock обнуляет позиции в поиске.', measure: 'Остатки в днях продаж, дни без наличия, соблюдение слотов.' },

    { id: 'reach', layer: 2, label: 'Охват и узнаваемость', polarity: 1, desc: 'Сколько людей знают бренд и видели продукт до поиска на маркетплейсе.', measure: 'Охваты SMM и посевов, брендовые запросы в Wordstat и на площадке.' },
    { id: 'ctr', layer: 2, label: 'CTR', polarity: 1, desc: 'Доля кликов от показов в выдаче и рекламе. Низкий CTR — сигнал слабого главного фото или цены.', measure: 'Аналитика кабинета и рекламного кабинета; сравнение с конкурентами.' },
    { id: 'ranking', layer: 2, label: 'Позиции в поиске', polarity: 1, desc: 'Органическая видимость по ключевым запросам. Алгоритм учитывает продажи, CTR, конверсию, рейтинг и остатки.', measure: 'Еженедельно по ключевым запросам первые 2–3 месяца.' },
    { id: 'cr', layer: 2, label: 'Конверсия (CR)', polarity: 1, desc: 'Доля переходов в карточку, закончившихся заказом. Главный показатель силы карточки.', measure: 'Заказы ÷ переходы; сравнивайте с топ-3 конкурентами.' },
    { id: 'rating', layer: 2, label: 'Рейтинг и отзывы', polarity: 1, desc: 'Доверие покупателей и фактор ранжирования.', measure: 'Средняя оценка и количество отзывов, доля негатива.' },
    { id: 'buyout', layer: 2, label: 'Доля выкупа', polarity: 1, desc: 'Какая часть заказов выкуплена. Низкая — проблема с описанием, фото или качеством.', measure: 'Выкуплено ÷ заказано × 100%.' },
    { id: 'drr', layer: 2, label: 'ДРР (ACOS)', polarity: -1, desc: 'Доля рекламных расходов в выручке. На старте выше нормы, должна снижаться по мере роста органики.', measure: 'Расходы на рекламу ÷ выручка × 100% — по каждому SKU отдельно.' },
    { id: 'cac', layer: 2, label: 'CAC', polarity: -1, desc: 'Сколько стоит привлечь одного покупателя со всеми расходами на продвижение.', measure: 'Все расходы на привлечение ÷ новые покупатели; не должен превышать маржу.' },

    { id: 'revenue', layer: 3, label: 'Выручка', polarity: 1, desc: 'Деньги от выкупленных заказов: органика + реклама.', measure: 'Отчёты площадки, вкладка «Аналитика» проекта.' },
    { id: 'share', layer: 3, label: 'Доля рынка', polarity: 1, desc: 'Ваша выручка относительно объёма категории.', measure: 'MPStats / Moneyplace: выручка бренда ÷ объём категории.' },
    { id: 'unit', layer: 3, label: 'Маржа (юнит-экономика)', polarity: 1, desc: 'Прибыль с одной продажи после комиссии, логистики, рекламы, налога и возвратов.', measure: 'Цена − комиссия − логистика − себестоимость − реклама − налог − возвраты.' },
    { id: 'repeat', layer: 3, label: 'Повторные покупки', polarity: 1, desc: 'Доля покупателей, вернувшихся за повторной покупкой. База для LTV.', measure: 'Отслеживайте после первых 2–3 месяцев продаж.' },
    { id: 'ltv', layer: 3, label: 'LTV', polarity: 1, desc: 'Сколько маржи приносит покупатель за всё время. Здоровая модель: LTV ≥ 3 × CAC.', measure: 'Средний чек × частота покупок × срок жизни клиента × маржинальность.' },
    { id: 'turnover', layer: 3, label: 'Оборачиваемость', polarity: 1, desc: 'Скорость продажи запаса: без дефицита и без затоваривания и штрафов за хранение.', measure: 'Средний остаток ÷ среднедневные продажи (в днях; чем быстрее, тем лучше).' },

    { id: 'equity', layer: 4, label: 'Капитал бренда', polarity: 1, desc: 'Узнаваемость, доверие и отстройка от конкурентов. Позволяет держать цену и снижает стоимость привлечения.', measure: 'Брендовые запросы, доля повторных покупок, премия к цене категории.' },
    { id: 'company', layer: 4, label: 'Прибыль и устойчивость', polarity: 1, desc: 'Итог для компании: прибыль, ROI, способность финансировать развитие бренда.', measure: 'ROI / ROMI по бренду и по кампаниям; ежемесячно.' }
  ];

  // [from, to, sign, weight 1–3, why]
  var EDGES = [
    ['budget', 'ads', 1, 3, 'Бюджет определяет объём рекламы и ставки'],
    ['budget', 'influencers', 1, 2, 'Деньги на блогеров и посевы'],
    ['budget', 'smm', 1, 2, 'Производство контента и таргет'],
    ['budget', 'promo', 1, 1, 'Запас маржи на участие в акциях'],
    ['budget', 'stock', 1, 2, 'Объём первой партии и страховой запас'],
    ['platform', 'card', 1, 2, 'УТП и messaging house — основа текстов и инфографики'],
    ['platform', 'smm', 1, 2, 'Tone of voice и ключевые сообщения для контента'],
    ['platform', 'packaging', 1, 2, 'Брендбук задаёт визуальный стандарт упаковки'],
    ['platform', 'equity', 1, 2, 'Чёткое позиционирование отличает бренд от конкурентов'],
    ['packaging', 'ctr', 1, 3, 'Фотогеничная упаковка выделяется на превью в выдаче'],
    ['packaging', 'card', 1, 2, 'Упаковка — главный кадр инфографики'],
    ['packaging', 'equity', 1, 1, 'Узнаваемый визуал запоминается'],
    ['product', 'rating', 1, 3, 'Качество продукта — главный источник оценок'],
    ['product', 'buyout', 1, 3, 'Товар соответствует ожиданиям — его выкупают'],
    ['product', 'repeat', 1, 3, 'Хороший продукт покупают снова'],
    ['product', 'unit', -1, 1, 'Дорогая рецептура увеличивает себестоимость'],
    ['price', 'unit', 1, 3, 'Цена формирует маржу с каждой продажи'],
    ['price', 'cr', -1, 2, 'Цена выше категории снижает конверсию'],
    ['price', 'ctr', -1, 1, 'Цена видна в выдаче и влияет на клик'],

    ['ads', 'ranking', 1, 2, 'Продажи с рекламы подталкивают органические позиции'],
    ['ads', 'reach', 1, 2, 'Показы рекламы расширяют охват'],
    ['ads', 'drr', 1, 3, 'Больше расходов на рекламу — выше ДРР'],
    ['ads', 'revenue', 1, 2, 'Рекламные заказы дают выручку'],
    ['ads', 'cac', 1, 1, 'Расходы на рекламу входят в стоимость привлечения'],
    ['promo', 'ranking', 1, 2, 'Всплеск продаж в акции поднимает карточку'],
    ['promo', 'cr', 1, 2, 'Скидка повышает конверсию'],
    ['promo', 'unit', -1, 2, 'Скидка режет маржу'],
    ['influencers', 'reach', 1, 3, 'Аудитория блогера узнаёт о бренде'],
    ['influencers', 'rating', 1, 1, 'UGC и первые отзывы'],
    ['influencers', 'cac', 1, 1, 'Гонорары повышают стоимость привлечения'],
    ['smm', 'reach', 1, 3, 'Регулярный контент растит узнаваемость'],
    ['smm', 'cr', 1, 1, 'Доверие к бренду до перехода в карточку'],
    ['smm', 'equity', 1, 2, 'Соцсети подтверждают «реальность» бренда'],
    ['card', 'ctr', 1, 3, 'Главное фото и инфографика решают, кликнут ли'],
    ['card', 'cr', 1, 3, 'Описание, состав, фото и видео убеждают купить'],
    ['card', 'ranking', 1, 2, 'SEO и заполненные характеристики — попадание в поиск и фильтры'],
    ['card', 'buyout', 1, 2, 'Честное описание снижает возвраты'],
    ['reviewsWork', 'rating', 1, 2, 'Ответы и программы за баллы улучшают рейтинг'],
    ['reviewsWork', 'cr', 1, 1, 'Ответы на негатив успокаивают сомневающихся'],
    ['stock', 'ranking', 1, 3, 'Нет остатков — карточка выпадает из поиска'],
    ['stock', 'revenue', 1, 2, 'Нет товара — нет продаж'],
    ['stock', 'turnover', 1, 1, 'Точное планирование поставок ускоряет оборот'],

    ['reach', 'ctr', 1, 1, 'Знакомый бренд кликают охотнее'],
    ['reach', 'cr', 1, 1, 'Узнавание повышает доверие'],
    ['reach', 'equity', 1, 3, 'Узнаваемость — часть капитала бренда'],
    ['ctr', 'ranking', 1, 2, 'Кликабельность — фактор ранжирования'],
    ['ctr', 'drr', -1, 2, 'Высокий CTR снижает цену клика и ДРР'],
    ['ranking', 'revenue', 1, 3, 'Органический трафик приносит продажи без рекламы'],
    ['ranking', 'drr', -1, 2, 'Больше органики — меньше зависимость от рекламы'],
    ['cr', 'revenue', 1, 3, 'Больше заказов с того же трафика'],
    ['cr', 'drr', -1, 3, 'Реклама окупается лучше при высокой конверсии'],
    ['cr', 'ranking', 1, 2, 'Конверсия — сильный сигнал для алгоритма'],
    ['cr', 'cac', -1, 2, 'Каждый покупатель обходится дешевле'],
    ['rating', 'cr', 1, 3, 'Рейтинг и отзывы — доверие прямо в карточке'],
    ['rating', 'ranking', 1, 2, 'Рейтинг учитывается в ранжировании'],
    ['rating', 'equity', 1, 2, 'Отзывы формируют репутацию бренда'],
    ['buyout', 'revenue', 1, 2, 'Выручка считается по выкупам'],
    ['buyout', 'unit', 1, 2, 'Возвраты оплачиваются логистикой'],
    ['drr', 'unit', -1, 3, 'Каждый процент ДРР вычитается из маржи'],
    ['drr', 'cac', 1, 2, 'Дорогая реклама — дорогой покупатель'],
    ['cac', 'unit', -1, 2, 'Стоимость привлечения съедает прибыль'],

    ['revenue', 'share', 1, 3, 'Выручка растёт — растёт доля категории'],
    ['revenue', 'company', 1, 2, 'Оборот компании'],
    ['revenue', 'budget', 1, 2, 'Часть выручки реинвестируется в рост'],
    ['unit', 'company', 1, 3, 'Прибыль с каждой продажи'],
    ['unit', 'budget', 1, 2, 'Маржа — источник бюджета на продвижение'],
    ['repeat', 'ltv', 1, 3, 'Повторные покупки — основа LTV'],
    ['repeat', 'revenue', 1, 2, 'Выручка без затрат на привлечение'],
    ['ltv', 'company', 1, 2, 'LTV ≥ 3 × CAC — признак здоровой модели'],
    ['turnover', 'unit', 1, 1, 'Быстрый оборот — меньше платы за хранение'],
    ['turnover', 'company', 1, 1, 'Деньги не заморожены в остатках'],
    ['share', 'equity', 1, 2, 'Лидер категории воспринимается сильнее'],
    ['share', 'company', 1, 2, 'Позиция на рынке — устойчивость бизнеса'],

    ['equity', 'cr', 1, 1, 'Сильный бренд покупают охотнее'],
    ['equity', 'repeat', 1, 2, 'Лояльность к бренду возвращает покупателей'],
    ['equity', 'price', 1, 1, 'Сильный бренд может держать цену выше категории'],
    ['company', 'budget', 1, 2, 'Устойчивая компания финансирует развитие бренда']
  ];

  var PRESETS = [
    { title: 'Почему растёт ДРР', text: 'Что поднимает долю рекламных расходов и что её снижает', node: 'drr', mode: 'links' },
    { title: 'Если вырастет рейтинг', text: 'Как улучшение отзывов расходится до прибыли', node: 'rating', mode: 'sim', impulse: 1 },
    { title: 'Если закончатся остатки', text: 'Цена out-of-stock для всей системы', node: 'stock', mode: 'sim', impulse: -1 },
    { title: 'От упаковки до бренда', text: 'Путь визуала через клики и выдачу к капиталу бренда', path: ['packaging', 'ctr', 'ranking', 'revenue', 'share', 'equity'] },
    { title: 'Петля роста', text: 'Маржа → бюджет → реклама → позиции → выручка → снова бюджет', path: ['unit', 'budget', 'ads', 'ranking', 'revenue', 'budget'] },
    { title: 'Если поднять цену', text: 'Маржа растёт, а что с конверсией и выручкой?', node: 'price', mode: 'sim', impulse: 1 }
  ];

  var byId = {};
  NODES.forEach(function (n) { byId[n.id] = n; });
  var edges = EDGES.map(function (e, i) { return { i: i, from: e[0], to: e[1], sign: e[2], w: e[3], why: e[4] }; });
  BM.SYSTEM = { layers: LAYERS, nodes: NODES, edges: edges };

  // ---------- layout ----------
  var W = 1180, H = 780, TOP = 84, BOTTOM = 56;
  var COLS = [90, 355, 620, 885, 1100];
  var R = [17, 15, 14, 16, 26];
  (function layout() {
    LAYERS.forEach(function (l) {
      var list = NODES.filter(function (n) { return n.layer === l.id; });
      var span = (H - TOP - BOTTOM) / list.length;
      list.forEach(function (n, i) { n.x = COLS[l.id]; n.y = Math.round(TOP + span * (i + 0.5)); n.r = R[l.id]; });
    });
  })();

  function edgePath(e) {
    var a = byId[e.from], b = byId[e.to];
    if (b.layer > a.layer) {
      var x1 = a.x + a.r, x2 = b.x - b.r, dx = (x2 - x1) * 0.5;
      return 'M' + x1 + ',' + a.y + ' C' + (x1 + dx) + ',' + a.y + ' ' + (x2 - dx) + ',' + b.y + ' ' + x2 + ',' + b.y;
    }
    if (b.layer === a.layer) {
      var bulge = Math.min(34 + Math.abs(b.y - a.y) * 0.32, 125), xa = a.x + a.r * 0.8, xb = b.x + b.r * 0.8;
      return 'M' + xa + ',' + a.y + ' C' + (xa + bulge) + ',' + a.y + ' ' + (xb + bulge) + ',' + b.y + ' ' + xb + ',' + b.y;
    }
    var top = (a.y + b.y) / 2 < H / 2, yy = top ? 14 : H - 10, s = top ? -1 : 1;
    return 'M' + a.x + ',' + (a.y + s * a.r) + ' C' + a.x + ',' + yy + ' ' + b.x + ',' + yy + ' ' + b.x + ',' + (b.y + s * b.r);
  }
  function isBack(e) { return byId[e.to].layer < byId[e.from].layer; }

  function wrap(label) {
    var words = label.split(' '), lines = [''];
    words.forEach(function (w) {
      var cur = lines[lines.length - 1];
      if (cur && (cur + ' ' + w).length > 15 && lines.length < 2) lines.push(w);
      else lines[lines.length - 1] = cur ? cur + ' ' + w : w;
    });
    return lines;
  }

  // ---------- project data ----------
  function secProgress(p, id) {
    var sec = BM.DATA.checklistSections.filter(function (s) { return s.id === id; })[0];
    if (!sec) return null;
    var items = BM.checkItems(sec);
    if (!items.length) return null;
    var done = items.filter(function (it) { return p.checklistDone[it.id]; }).length;
    return Math.round(done / items.length * 100);
  }
  function lvlPct(v) { return v >= 70 ? 'good' : v >= 30 ? 'mid' : 'bad'; }
  function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
  function health(id, p) {
    if (!p) return null;
    var v;
    switch (id) {
      case 'platform': v = BM.platformProgress(p).pct; return { text: 'Платформа заполнена на ' + v + '%', level: lvlPct(v) };
      case 'card': v = secProgress(p, 'podgotovka-k-vyhodu-na-marketpleys'); return v == null ? null : { text: 'Подготовка карточки и выхода на МП: ' + v + '% чек-листа', level: lvlPct(v) };
      case 'stock': v = secProgress(p, 'logistika-ot-proizvodstva-do-sklada-mark'); return v == null ? null : { text: 'Логистика в чек-листе: ' + v + '%', level: lvlPct(v) };
      case 'product': v = secProgress(p, 'produkt-i-upakovka'); return v == null ? null : { text: 'Продукт в чек-листе: ' + v + '%', level: lvlPct(v) };
      case 'packaging': v = secProgress(p, 'brendbuk-brand-guide'); return v == null ? null : { text: 'Брендбук и айдентика: ' + v + '% чек-листа', level: lvlPct(v) };
      case 'budget': v = BM.num(p.launchBudget); return v ? { text: 'Бюджет запуска: ' + BM.money(v), level: 'good' } : { text: 'Бюджет запуска не указан', level: 'bad' };
      case 'price':
        v = avg(p.skus.map(function (s) { return BM.num(s.sellPrice); }).filter(function (x) { return x; }));
        return v == null ? null : { text: 'Средняя цена по ' + p.skus.length + ' SKU: ' + BM.money(v), level: null };
      case 'unit':
        v = avg(p.skus.map(function (s) { return BM.computeSku(s).margin; }).filter(function (x) { return x != null; }));
        return v == null ? { text: 'Нет SKU в расчёте', level: 'bad' } : { text: 'Средняя маржа: ' + v.toFixed(1) + '%', level: v >= 20 ? 'good' : v >= 5 ? 'mid' : 'bad' };
      case 'drr':
        v = avg(p.skus.map(function (s) { return BM.num(s.adPct); }).filter(function (x) { return x != null; }));
        return v == null ? null : { text: 'Плановый ДРР в расчётах SKU: ' + v.toFixed(1) + '%', level: v <= 10 ? 'good' : v <= 20 ? 'mid' : 'bad' };
      case 'revenue':
      case 'share':
        var es = p.entries.slice().sort(function (a, b) { return a.order - b.order; });
        if (!es.length) return null;
        var last = es[es.length - 1];
        var prev = es.filter(function (e) { return e.marketplace === last.marketplace; }).slice(-2)[0];
        var key = id === 'revenue' ? 'ourRevenue' : 'marketShare';
        if (!last[key]) return null;
        var cur = BM.num(last[key]), pv = prev && prev !== last ? BM.num(prev[key]) : null;
        var lv = pv == null || cur == null ? null : cur > pv ? 'good' : cur < pv ? 'bad' : 'mid';
        return { text: (id === 'revenue' ? 'Выручка ' : 'Доля рынка ') + last[key] + (id === 'share' ? '%' : '') + ' · ' + (BM.MP[last.marketplace] ? BM.MP[last.marketplace].label : '') + ', ' + last.weekLabel, level: lv };
    }
    return null;
  }

  // ---------- simulation ----------
  function simulate(start, impulse) {
    var eff = {}, used = {}, frontier = [{ id: start, v: impulse, d: 0 }];
    eff[start] = impulse;
    while (frontier.length) {
      var next = [];
      frontier.forEach(function (f) {
        if (f.d >= 5) return;
        edges.forEach(function (e) {
          if (e.from !== f.id || e.to === start) return;
          var delta = f.v * e.sign * (e.w / 3) * 0.72;
          if (Math.abs(delta) < 0.035) return;
          eff[e.to] = (eff[e.to] || 0) + delta;
          if (used[e.i] == null || used[e.i] > f.d) used[e.i] = f.d;
          next.push({ id: e.to, v: delta, d: f.d + 1 });
        });
      });
      frontier = next;
    }
    var max = 0;
    for (var k in eff) if (k !== start) max = Math.max(max, Math.abs(eff[k]));
    var out = {};
    for (var k2 in eff) out[k2] = k2 === start ? impulse : (max ? eff[k2] / max : 0);
    return { eff: out, used: used };
  }

  // ---------- view ----------
  BM.views.system = function (nodeId) {
    var ui = BM.ui;
    if (!ui.sysMode) ui.sysMode = 'links';
    if (!ui.sysImpulse) ui.sysImpulse = 1;
    if (ui.sysProject === undefined) ui.sysProject = BM.state.projects[0] ? BM.state.projects[0].id : '';
    if (ui.sysProject && !BM.project(ui.sysProject)) ui.sysProject = BM.state.projects[0] ? BM.state.projects[0].id : '';
    ui.sysNode = nodeId && byId[nodeId] ? nodeId : (ui.sysNode && byId[ui.sysNode] ? ui.sysNode : null);
    var p = ui.sysProject ? BM.project(ui.sysProject) : null;

    var svg = '<svg class="sys-svg" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Схема системы маркетинга: ' + NODES.length + ' узлов в пяти слоях">' +
      '<defs>' + LAYERS.map(function (l) {
        return '<radialGradient id="ng' + l.id + '" cx="35%" cy="30%" r="75%"><stop offset="0" class="ng-hi"/><stop offset="1" class="ng-l' + l.id + '"/></radialGradient>';
      }).join('') + '</defs>' +
      LAYERS.map(function (l) {
        return '<g class="sys-col"><text x="' + COLS[l.id] + '" y="30" text-anchor="middle" class="sys-col-title">' + esc(l.title.toUpperCase()) + '</text><text x="' + COLS[l.id] + '" y="48" text-anchor="middle" class="sys-col-hint">' + esc(l.hint) + '</text></g>';
      }).join('') +
      '<g class="sys-edges">' + edges.map(function (e) {
        return '<path id="se-' + e.i + '" class="sys-edge' + (e.sign < 0 ? ' neg' : '') + (isBack(e) ? ' back' : '') + '" d="' + edgePath(e) + '" style="stroke-width:' + (0.7 + e.w * 0.55) + 'px"/>';
      }).join('') + '</g>' +
      '<g class="sys-pulses" aria-hidden="true"></g>' +
      '<g class="sys-nodes">' + NODES.map(function (n) {
        var h = health(n.id, p);
        var lines = wrap(n.label);
        return '<g class="sys-node l' + n.layer + '" data-node="' + n.id + '" transform="translate(' + n.x + ' ' + n.y + ')" tabindex="0" role="button" aria-label="' + esc(n.label) + ', слой «' + esc(LAYERS[n.layer].title) + '»">' +
          '<circle class="halo" r="' + (n.r + 10) + '"/>' +
          '<circle class="core" r="' + n.r + '" fill="url(#ng' + n.layer + ')"/>' +
          (h && h.level ? '<circle class="hdot h-' + h.level + '" cx="' + (n.r * 0.72) + '" cy="' + (-n.r * 0.72) + '" r="4.5"/>' : '') +
          '<text class="badge-t" y="4.5" text-anchor="middle"></text>' +
          '<text class="lbl" y="' + (n.r + 17) + '" text-anchor="middle">' + lines.map(function (ln, i) { return '<tspan x="0" dy="' + (i ? 14 : 0) + '">' + esc(ln) + '</tspan>'; }).join('') + '</text></g>';
      }).join('') + '</g></svg>';

    var projSel = BM.state.projects.length ? '<label class="sr-only" for="sys-project">Данные проекта</label><select class="select" id="sys-project" style="width:auto;flex:0 1 240px"><option value="">Без данных проекта</option>' +
      BM.state.projects.map(function (x) { return '<option value="' + x.id + '"' + (x.id === ui.sysProject ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '';
    var modes = '<div class="chips" role="group" aria-label="Режим"><button type="button" class="chip" data-sys-mode="links" aria-pressed="' + (ui.sysMode === 'links') + '">' + icon('network', 'sm') + 'Связи</button>' +
      '<button type="button" class="chip" data-sys-mode="sim" aria-pressed="' + (ui.sysMode === 'sim') + '">' + icon('sparkle', 'sm') + 'Симуляция влияния</button></div>';
    var legend = '<div class="sys-legend" aria-label="Легенда">' + LAYERS.map(function (l) { return '<span><i class="lg-dot l' + l.id + '"></i>' + esc(l.title) + '</span>'; }).join('') +
      '<span><i class="lg-line pos"></i>усиливает</span><span><i class="lg-line neg"></i>снижает</span><span><i class="lg-line back"></i>обратная связь</span>' +
      (p ? '<span><i class="lg-hdot"></i>данные проекта</span>' : '') + '<span class="sys-swipe-hint">← схему можно листать вбок →</span></div>';

    return '<div class="page sys-page">' +
      '<div class="page-head"><div><span class="eyebrow">' + icon('network', 'sm') + 'Система маркетинга</span>' +
        '<h1 style="margin-top:8px">Как всё связано — <span class="serif">от действий до бренда</span></h1>' +
        '<p>Каждый узел — область или показатель. Нажмите на узел, чтобы увидеть, что на него влияет и на что влияет он. В режиме симуляции посмотрите, как рост или падение одного показателя расходится по всей системе.</p></div></div>' +
      '<div class="row">' + modes + '<span class="spacer"></span>' + projSel + '</div>' +
      '<div class="sys-layout">' +
        '<div class="card sys-graph"><div class="sys-caption" id="sys-caption" aria-live="polite"></div><div class="sys-scroll" tabindex="0" aria-label="Схема, листается по горизонтали">' + svg + '</div>' + legend + '</div>' +
        '<aside class="card sys-panel" id="sys-panel" aria-label="Подробности"></aside>' +
      '</div></div>';
  };

  // ---------- interactive layer ----------
  var ctl = null, raf = 0, pulses = [], timers = [], hoverId = null, pathSel = null;

  BM.systemUnmount = function () {
    if (ctl) ctl.abort();
    ctl = null;
    cancelAnimationFrame(raf); raf = 0;
    timers.forEach(clearInterval); timers = [];
    pulses = [];
  };

  BM.systemMount = function () {
    BM.systemUnmount();
    var root = document.querySelector('.sys-page');
    if (!root) return;
    ctl = new AbortController();
    var sig = { signal: ctl.signal };
    var svg = root.querySelector('.sys-svg'), pulseG = svg.querySelector('.sys-pulses');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ui = BM.ui;

    function nodeEl(id) { return svg.querySelector('[data-node="' + id + '"]'); }
    function edgeEl(i) { return svg.getElementById ? svg.getElementById('se-' + i) : svg.querySelector('#se-' + i); }

    function clearMarks() {
      svg.classList.remove('focus');
      svg.querySelectorAll('.hl-out,.hl-in,.hl-path,.near,.sel,.good,.bad,.on-path').forEach(function (el) {
        el.classList.remove('hl-out', 'hl-in', 'hl-path', 'near', 'sel', 'good', 'bad', 'on-path');
        el.style.removeProperty('--k');
      });
      svg.querySelectorAll('.badge-t').forEach(function (t) { t.textContent = ''; });
    }

    var lastSim = null;
    function apply() {
      clearMarks();
      var id = ui.sysNode || hoverId;
      if (pathSel) {
        svg.classList.add('focus');
        pathSel.forEach(function (nid, i) {
          nodeEl(nid).classList.add('on-path');
          if (i) edges.forEach(function (e) { if (e.from === pathSel[i - 1] && e.to === nid) edgeEl(e.i).classList.add('hl-path'); });
        });
        return;
      }
      if (!id) return;
      svg.classList.add('focus');
      nodeEl(id).classList.add('sel');
      if (ui.sysMode === 'sim' && ui.sysNode) {
        lastSim = simulate(ui.sysNode, ui.sysImpulse);
        Object.keys(lastSim.eff).forEach(function (nid) {
          var v = lastSim.eff[nid], el = nodeEl(nid);
          if (nid === ui.sysNode) { el.querySelector('.badge-t').textContent = v > 0 ? '↑' : '↓'; return; }
          if (Math.abs(v) < 0.04) return;
          var good = v * byId[nid].polarity > 0;
          el.classList.add(good ? 'good' : 'bad');
          el.style.setProperty('--k', Math.min(1, 0.35 + Math.abs(v) * 0.65).toFixed(2));
          el.querySelector('.badge-t').textContent = v > 0 ? '↑' : '↓';
        });
        Object.keys(lastSim.used).forEach(function (i) {
          var e = edges[i], v = lastSim.eff[e.to] || 0;
          edgeEl(i).classList.add('hl-path', v * byId[e.to].polarity > 0 ? 'good' : 'bad');
        });
        return;
      }
      edges.forEach(function (e) {
        if (e.from === id) { edgeEl(e.i).classList.add('hl-out'); nodeEl(e.to).classList.add('near'); }
        if (e.to === id) { edgeEl(e.i).classList.add('hl-in'); nodeEl(e.from).classList.add('near'); }
      });
    }

    function relItem(e, other, dir) {
      var n = byId[other];
      var verb = dir === 'out' ? (e.sign > 0 ? 'усиливает' : 'снижает') : (e.sign > 0 ? 'усиливает' : 'снижает');
      return '<li><button type="button" class="sys-rel" data-sys-node="' + n.id + '"><span class="sys-rel-sign ' + (e.sign > 0 ? 'pos' : 'neg') + '" aria-hidden="true">' + (e.sign > 0 ? '+' : '−') + '</span>' +
        '<span><b>' + esc(n.label) + '</b><small>' + verb + ' · ' + esc(e.why) + '</small></span></button></li>';
    }

    function caption() {
      var cap = root.querySelector('#sys-caption'), txt = null;
      if (pathSel) {
        var pr0 = PRESETS.filter(function (x) { return x.path === pathSel; })[0];
        txt = '<b>' + esc(pr0.title) + '</b><span>' + pathSel.length + ' шагов</span>';
      } else if (ui.sysNode) {
        var n0 = byId[ui.sysNode];
        if (ui.sysMode === 'sim' && lastSim) {
          var g = 0, b = 0;
          Object.keys(lastSim.eff).forEach(function (k) { if (k === n0.id || Math.abs(lastSim.eff[k]) < 0.04) return; if (lastSim.eff[k] * byId[k].polarity > 0) g++; else b++; });
          txt = '<b>Если «' + esc(n0.label) + '» ' + (ui.sysImpulse > 0 ? 'вырастет' : 'снизится') + '</b><span>улучшится ' + g + ' · ухудшится ' + b + '</span>';
        } else {
          txt = '<b>' + esc(n0.label) + '</b><span>влияет на ' + edges.filter(function (e) { return e.from === n0.id; }).length + ' · зависит от ' + edges.filter(function (e) { return e.to === n0.id; }).length + '</span>';
        }
      }
      if (!txt) { cap.innerHTML = '<span class="hint-ic">' + icon('info', 'sm') + '</span><span>Нажмите на узел, чтобы увидеть его связи, или выберите готовый сценарий' + (window.innerWidth < 1640 ? ' ниже' : ' справа') + '.</span>'; return; }
      cap.innerHTML = txt.replace('</b><span>', '</b><span>· ') + '<button type="button" class="btn sm soft to-panel" data-sys-topanel>Подробнее ↓</button><button type="button" class="icon-btn sm" data-sys-clear aria-label="Сбросить">' + icon('x', 'sm') + '</button>';
    }

    function panel() {
      caption();
      var el = root.querySelector('#sys-panel');
      var p = ui.sysProject ? BM.project(ui.sysProject) : null;
      if (pathSel) {
        var pr = PRESETS.filter(function (x) { return x.path === pathSel; })[0];
        el.innerHTML = '<div class="sys-p-head"><span class="eyebrow">Цепочка</span><button type="button" class="icon-btn sm" data-sys-clear aria-label="Сбросить">' + icon('x', 'sm') + '</button></div><h2>' + esc(pr.title) + '</h2><p class="muted small" style="margin-top:6px">' + esc(pr.text) + '</p>' +
          '<ol class="sys-path">' + pathSel.map(function (nid, i) {
            var e = i ? edges.filter(function (x) { return x.from === pathSel[i - 1] && x.to === nid; })[0] : null;
            return '<li><button type="button" class="sys-rel" data-sys-node="' + nid + '"><span><b>' + esc(byId[nid].label) + '</b>' + (e ? '<small>' + esc(e.why) + '</small>' : '<small>старт</small>') + '</span></button></li>';
          }).join('') + '</ol>';
        return;
      }
      if (!ui.sysNode) {
        el.innerHTML = '<h2>Сценарии</h2><p class="muted small" style="margin:6px 0 12px">Выберите готовый сценарий или нажмите на любой узел схемы.</p><div class="stack sys-presets" style="gap:8px">' +
          PRESETS.map(function (x, i) { return '<button type="button" class="sys-preset" data-sys-preset="' + i + '"><b>' + esc(x.title) + '</b><small>' + esc(x.text) + '</small></button>'; }).join('') + '</div>';
        return;
      }
      var n = byId[ui.sysNode], h = health(n.id, p);
      var head = '<div class="sys-p-head"><span class="eyebrow"><i class="lg-dot l' + n.layer + '"></i>' + esc(LAYERS[n.layer].title) + '</span><button type="button" class="icon-btn sm" data-sys-clear aria-label="Сбросить выбор">' + icon('x', 'sm') + '</button></div>' +
        '<h2>' + esc(n.label) + '</h2><p class="small" style="color:var(--primary-ink);font-weight:600;margin-top:4px">' + (n.polarity > 0 ? 'Чем выше — тем лучше' : 'Чем ниже — тем лучше') + '</p>' +
        '<p style="margin-top:10px">' + esc(n.desc) + '</p>' +
        '<div class="sys-measure"><small>Где смотреть и как считать</small>' + esc(n.measure) + '</div>' +
        (h ? '<div class="sys-health h-' + (h.level || 'none') + '"><small>' + esc(p.name) + '</small>' + esc(h.text) + '</div>' : '');
      if (ui.sysMode === 'sim') {
        var sim = lastSim || simulate(n.id, ui.sysImpulse);
        var list = Object.keys(sim.eff).filter(function (k) { return k !== n.id && Math.abs(sim.eff[k]) >= 0.04; })
          .sort(function (a, b) { return Math.abs(sim.eff[b]) - Math.abs(sim.eff[a]); }).slice(0, 10);
        el.innerHTML = head + '<div class="chips" role="group" aria-label="Направление" style="margin-top:14px"><button type="button" class="chip" data-sys-impulse="1" aria-pressed="' + (ui.sysImpulse > 0) + '">Если вырастет ↑</button><button type="button" class="chip" data-sys-impulse="-1" aria-pressed="' + (ui.sysImpulse < 0) + '">Если снизится ↓</button></div>' +
          '<h3 style="margin-top:16px">Что изменится</h3><ul class="sys-effects">' + list.map(function (k) {
            var v = sim.eff[k], good = v * byId[k].polarity > 0;
            return '<li><button type="button" class="sys-rel" data-sys-node="' + k + '"><span class="sys-eff-arrow ' + (good ? 'good' : 'bad') + '" aria-hidden="true">' + (v > 0 ? '↑' : '↓') + '</span><span style="flex:1"><b>' + esc(byId[k].label) + '</b><small>' + (v > 0 ? 'растёт' : 'снижается') + ' · ' + (good ? 'хорошо' : 'плохо') + '</small>' +
              '<span class="sys-bar ' + (good ? 'good' : 'bad') + '"><i style="width:' + Math.round(Math.abs(v) * 100) + '%"></i></span></span></button></li>';
          }).join('') + '</ul><p class="small muted" style="margin-top:10px">Сила влияния ослабевает с каждым шагом цепочки. Это модель причинно-следственных связей, а не прогноз в цифрах.</p>';
        return;
      }
      var outs = edges.filter(function (e) { return e.from === n.id; }).sort(function (a, b) { return b.w - a.w; });
      var ins = edges.filter(function (e) { return e.to === n.id; }).sort(function (a, b) { return b.w - a.w; });
      el.innerHTML = head +
        '<div class="sys-cols"><div><h3 style="margin-top:16px">Влияет на · ' + outs.length + '</h3><ul class="sys-rels">' + outs.map(function (e) { return relItem(e, e.to, 'out'); }).join('') + '</ul></div>' +
        '<div><h3 style="margin-top:16px">Зависит от · ' + ins.length + '</h3><ul class="sys-rels">' + (ins.length ? ins.map(function (e) { return relItem(e, e.from, 'in'); }).join('') : '<li class="small muted" style="padding:8px">Стартовая точка системы — задаётся решениями команды.</li>') + '</ul></div></div>' +
        '<button type="button" class="btn soft block" style="margin-top:14px" data-sys-mode="sim">' + icon('sparkle', 'sm') + 'Смоделировать влияние</button>';
    }

    // pulses
    function spawn(i, delay, cls, dur) {
      var path = edgeEl(i);
      if (!path) return;
      pulses.push({ path: path, len: path.getTotalLength(), start: performance.now() + (delay || 0), dur: dur || 1300, cls: cls || '', dot: null });
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      raf = 0;
      if (!ctl) return;
      pulses = pulses.filter(function (p) {
        var t = (now - p.start) / p.dur;
        if (t < 0) return true;
        if (t >= 1) { if (p.dot) p.dot.remove(); return false; }
        if (!p.dot) {
          p.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          p.dot.setAttribute('r', 3.6); p.dot.setAttribute('class', 'pulse ' + p.cls);
          pulseG.appendChild(p.dot);
        }
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var pt = p.path.getPointAtLength(e * p.len);
        p.dot.setAttribute('cx', pt.x); p.dot.setAttribute('cy', pt.y);
        p.dot.style.opacity = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
        return true;
      });
      if (pulses.length) raf = requestAnimationFrame(tick);
    }
    function cycle() {
      if (reduce || document.hidden) return;
      if (pathSel) {
        pathSel.forEach(function (nid, k) {
          if (!k) return;
          edges.forEach(function (e) { if (e.from === pathSel[k - 1] && e.to === nid) spawn(e.i, (k - 1) * 700, 'path', 900); });
        });
      } else if (ui.sysNode && ui.sysMode === 'sim' && lastSim) {
        Object.keys(lastSim.used).forEach(function (i) {
          var e = edges[i], v = lastSim.eff[e.to] || 0;
          spawn(+i, lastSim.used[i] * 520, v * byId[e.to].polarity > 0 ? 'good' : 'bad', 1000);
        });
      } else if (ui.sysNode) {
        edges.forEach(function (e) {
          if (e.from === ui.sysNode) spawn(e.i, Math.random() * 300, 'out', 1300);
          if (e.to === ui.sysNode) spawn(e.i, 600 + Math.random() * 300, 'in', 1300);
        });
      }
    }
    function ambient() {
      if (reduce || document.hidden || ui.sysNode || pathSel || hoverId) return;
      spawn(Math.floor(Math.random() * edges.length), 0, 'ambient', 1800);
    }

    var cycleTimer = null;
    function restartCycle() {
      if (cycleTimer) { clearInterval(cycleTimer); timers = timers.filter(function (t) { return t !== cycleTimer; }); }
      pulses.forEach(function (p) { if (p.dot) p.dot.remove(); }); pulses = [];
      cycle();
      cycleTimer = setInterval(cycle, pathSel ? 4200 : (ui.sysMode === 'sim' ? 3600 : 2200));
      timers.push(cycleTimer);
    }
    timers.push(setInterval(ambient, 420));

    function refresh() { apply(); panel(); restartCycle(); }
    function select(id) {
      pathSel = null;
      ui.sysNode = id;
      history.replaceState(null, '', '#/system' + (id ? '/' + id : ''));
      refresh();
    }

    // events
    svg.addEventListener('click', function (e) {
      var g = e.target.closest('.sys-node');
      if (g) select(g.dataset.node === ui.sysNode && !pathSel ? null : g.dataset.node);
    }, sig);
    svg.addEventListener('keydown', function (e) {
      var g = e.target.closest('.sys-node');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.dataset.node); }
    }, sig);
    svg.addEventListener('mouseover', function (e) {
      var g = e.target.closest('.sys-node');
      if (!g || ui.sysNode || pathSel) return;
      if (hoverId !== g.dataset.node) { hoverId = g.dataset.node; apply(); }
    }, sig);
    svg.addEventListener('mouseout', function (e) {
      if (!hoverId) return;
      var to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.sys-node');
      if (!to) { hoverId = null; apply(); }
    }, sig);
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-sys-node]'))) { select(t.dataset.sysNode); return; }
      if ((t = e.target.closest('[data-sys-mode]'))) {
        ui.sysMode = t.dataset.sysMode;
        root.querySelectorAll('.row [data-sys-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sysMode === ui.sysMode); });
        refresh(); return;
      }
      if ((t = e.target.closest('[data-sys-impulse]'))) { ui.sysImpulse = +t.dataset.sysImpulse; refresh(); return; }
      if (e.target.closest('[data-sys-clear]')) { select(null); return; }
      if (e.target.closest('[data-sys-topanel]')) { root.querySelector('#sys-panel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
      if ((t = e.target.closest('[data-sys-preset]'))) {
        var pr = PRESETS[+t.dataset.sysPreset];
        if (pr.path) { ui.sysNode = null; pathSel = pr.path; history.replaceState(null, '', '#/system'); refresh(); return; }
        ui.sysMode = pr.mode; if (pr.impulse) ui.sysImpulse = pr.impulse;
        root.querySelectorAll('.row [data-sys-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sysMode === ui.sysMode); });
        select(pr.node);
        var nEl = nodeEl(pr.node), sc = root.querySelector('.sys-scroll');
        if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = byId[pr.node].x / W * sc.scrollWidth - sc.clientWidth / 2;
      }
    }, sig);
    root.addEventListener('change', function (e) {
      if (e.target.id === 'sys-project') { ui.sysProject = e.target.value; BM.render(); }
    }, sig);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (ui.sysNode || pathSel) && !document.querySelector('dialog[open]')) select(null); }, sig);

    refresh();
  };
})();
