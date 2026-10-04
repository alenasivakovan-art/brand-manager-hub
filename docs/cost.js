(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon;
  var CUR = ['RUB', 'USD', 'EUR', 'CNY'];

  // ---------- marketplaces: field sets and starting points (rough, editable) ----------
  var MPS = [
    { id: 'wb', label: 'Wildberries', model: 'FBW (склад WB)',
      note: 'Логистика считается от объёма товара в литрах × коэффициент склада × индекс локализации. Невыкуп возвращается на склад за отдельную плату, приёмка на ряде складов платная. Комиссия FBW и FBS различается и зависит от категории.',
      fields: [
        ['price', 'Цена продажи', '₽'], ['commissionPct', 'Комиссия (вознаграждение WB)', '%'], ['acquiringPct', 'Эквайринг', '%', 'Если удерживается отдельно — смотрите еженедельный отчёт'],
        ['logistics', 'Логистика до покупателя', '₽/заказ', 'База по литражу товара'], ['logisticsCoef', 'Коэффициент склада и индекс локализации', '×', '1 — без надбавок; 1,2 — +20%'],
        ['returnCost', 'Обратная логистика невыкупа', '₽'], ['storage', 'Хранение на единицу', '₽'], ['acceptance', 'Платная приёмка на единицу', '₽'],
        ['buyoutPct', 'Доля выкупа', '%'], ['drrPct', 'ДРР (реклама)', '%']
      ],
      d: { enabled: true, price: 590, commissionPct: 24, acquiringPct: 0, logistics: 60, logisticsCoef: 1.1, lastMilePct: 0, processing: 0, returnCost: 50, storage: 3, acceptance: 1, buyoutPct: 85, drrPct: 12 } },
    { id: 'ozon', label: 'Ozon', model: 'FBO (склад Ozon)',
      note: 'Удерживает комиссию по категории, эквайринг, логистику (магистраль) и последнюю милю — процент от цены с ограничениями по сумме. Выкуп в красоте обычно выше, чем на WB. Хранение платное после бесплатного периода.',
      fields: [
        ['price', 'Цена продажи', '₽'], ['commissionPct', 'Комиссия по категории', '%'], ['acquiringPct', 'Эквайринг', '%'],
        ['logistics', 'Логистика (магистраль)', '₽/заказ'], ['lastMilePct', 'Последняя миля', '% от цены', 'Проверьте минимальную и максимальную сумму'],
        ['processing', 'Обработка отправления', '₽/заказ', 'Для FBS; на FBO часто 0'],
        ['returnCost', 'Обратная логистика невыкупа', '₽'], ['storage', 'Хранение на единицу', '₽'],
        ['buyoutPct', 'Доля выкупа', '%'], ['drrPct', 'ДРР (реклама)', '%']
      ],
      d: { enabled: true, price: 590, commissionPct: 18, acquiringPct: 1.5, logistics: 50, logisticsCoef: 1, lastMilePct: 5.5, processing: 0, returnCost: 50, storage: 2, acceptance: 0, buyoutPct: 92, drrPct: 10 } },
    { id: 'ym', label: 'Яндекс Маркет', model: 'FBY (склад Маркета)',
      note: 'Берёт плату за размещение товара (аналог комиссии), приём платежа, доставку покупателю (часть — процентом от цены) и обработку заказа. Модели FBY, FBS и DBS заметно отличаются по расходам.',
      fields: [
        ['price', 'Цена продажи', '₽'], ['commissionPct', 'Размещение товара', '%'], ['acquiringPct', 'Приём платежа', '%'],
        ['logistics', 'Обработка и доставка', '₽/заказ'], ['lastMilePct', 'Доставка покупателю', '% от цены'],
        ['returnCost', 'Обратная логистика невыкупа', '₽'], ['storage', 'Хранение на единицу', '₽'],
        ['buyoutPct', 'Доля выкупа', '%'], ['drrPct', 'ДРР (буст продаж, реклама)', '%']
      ],
      d: { enabled: true, price: 590, commissionPct: 15, acquiringPct: 1.9, logistics: 45, logisticsCoef: 1, lastMilePct: 4, processing: 0, returnCost: 50, storage: 2, acceptance: 0, buyoutPct: 93, drrPct: 8 } }
  ];
  var MP_BY = {}; MPS.forEach(function (m) { MP_BY[m.id] = m; });

  // ---------- what goes where ----------
  var CATS = {
    cogs: { label: 'Себестоимость продукта', color: 'var(--c-data)', text: 'Переменные затраты, которые возникают на каждую произведённую единицу. Именно они дают себестоимость единицы.' },
    launch: { label: 'Разовые затраты на запуск', color: '#8A6BB8', text: 'Инвестиции в продукт и бренд. Платятся один раз, не зависят от тиража. Учитывайте отдельно и считайте их окупаемость; при желании распределите (амортизируйте) на плановый тираж.' },
    sales: { label: 'Расходы на продажу через маркетплейс', color: '#C8961F', text: 'Платежи площадке и логистика до покупателя. Возникают на каждую продажу, но это не себестоимость продукта, а коммерческие расходы.' },
    marketing: { label: 'Маркетинг и продвижение', color: 'var(--c-worse)', text: 'Всё, что создаёт спрос и продвигает карточку. Отдельная статья: так видно, окупается ли продвижение (ДРР, CAC, ROMI).' },
    fixed: { label: 'Постоянные расходы бизнеса', color: 'var(--muted)', text: 'Не зависят от объёма продаж. Покрываются маржинальной прибылью со всех продаж, в цену единицы напрямую не закладываются.' },
    tax: { label: 'Налоги', color: 'var(--ink-2)', text: 'Считаются отдельно от выручки или от прибыли в зависимости от режима налогообложения.' }
  };
  var WHERE = [
    ['Дизайн упаковки, коробки и этикетки', 'launch', 'Разработка дизайна — разовая работа, она не повторяется с каждой единицей. Это инвестиция в продукт и бренд. А вот печать коробки и этикетки — себестоимость.'],
    ['Печать коробки, этикетки, нанесение на тубу', 'cogs', 'Повторяется на каждую единицу и масштабируется с тиражом.'],
    ['Флакон, туба, крышка, дозатор, вкладыш', 'cogs', 'Физические компоненты упаковки на единицу, с учётом брака.'],
    ['Сырьё и компоненты рецептуры', 'cogs', 'Основа себестоимости. Учитывайте потери при производстве.'],
    ['Розлив, сборка, работа производства', 'cogs', 'Оплата контрактному производителю на единицу.'],
    ['Наладка линии на партию', 'cogs', 'Платится на каждую партию и делится на тираж. Чем больше партия — тем меньше на единицу.'],
    ['Брак готовой продукции', 'cogs', 'Затраты на бракованные единицы распределяются на годные.'],
    ['Коды «Честный знак» и их нанесение', 'cogs', 'Обязательная маркировка каждой единицы.'],
    ['Доставка партии от производителя до вашего склада', 'cogs', 'Входящая логистика — часть себестоимости с доставкой (landed cost).'],
    ['Доставка партии до склада маркетплейса, фулфилмент', 'sales', 'Расходы на продажу через площадку. В калькуляторе их удобно держать на единицу вместе с себестоимостью.'],
    ['Разработка рецептуры, тестовые образцы', 'launch', 'Делается один раз для продукта.'],
    ['Декларация соответствия, лабораторные испытания', 'launch', 'Действуют несколько лет. Это затраты на вывод продукта, а не на каждую единицу.'],
    ['Пресс-формы, клише, штампы', 'launch', 'Оснастка, которая служит много партий.'],
    ['Нейминг, бренд-платформа, брендбук, логотип', 'launch', 'Инвестиции в бренд, работают на всю линейку.'],
    ['Регистрация товарного знака', 'launch', 'Нематериальный актив бренда.'],
    ['Комиссия маркетплейса', 'sales', 'Процент от цены продажи по категории.'],
    ['Эквайринг, приём платежа', 'sales', 'Процент от цены, который удерживает площадка.'],
    ['Логистика до покупателя, последняя миля', 'sales', 'На каждый заказ. Из-за невыкупа на одну продажу приходится больше одной доставки.'],
    ['Обратная логистика, возвраты', 'sales', 'Платится за невыкупленные и возвращённые заказы.'],
    ['Хранение и платная приёмка', 'sales', 'Зависит от оборачиваемости: чем дольше лежит товар, тем дороже.'],
    ['Штрафы площадки', 'sales', 'За нарушения поставки, маркировки, пересорт. Цель — ноль.'],
    ['Реклама внутри маркетплейса', 'marketing', 'Считается через ДРР — долю рекламных расходов в выручке.'],
    ['Фото, видео, инфографика и дизайн карточки', 'marketing', 'Контент для продвижения. В отличие от дизайна упаковки, это не часть продукта.'],
    ['Блогеры, посевы, внешний трафик', 'marketing', 'Продвижение вне площадки. Для единицы — бюджет месяца ÷ плановые продажи.'],
    ['SMM, контент для соцсетей', 'marketing', 'Узнаваемость и доверие к бренду.'],
    ['Отзывы за баллы, семплинг, подарки блогерам', 'marketing', 'Продвижение, а не себестоимость.'],
    ['Скидки и участие в акциях', 'marketing', 'Не расход, а снижение цены. Моделируйте через цену продажи.'],
    ['Зарплаты команды, бухгалтерия, юрист', 'fixed', 'Не зависят от числа проданных единиц.'],
    ['Сервисы аналитики (MPStats и др.), CRM', 'fixed', 'Ежемесячная подписка — постоянный расход.'],
    ['Аренда склада или офиса', 'fixed', 'Постоянный расход, если не платится за единицу.'],
    ['Налог УСН, НДС', 'tax', 'Отдельная статья. С 2026 года условия НДС для упрощёнки изменились — сверьтесь с бухгалтером.']
  ];

  // ---------- model ----------
  function mpDefaults() { var o = {}; MPS.forEach(function (m) { o[m.id] = JSON.parse(JSON.stringify(m.d)); }); return o; }
  function defaultModel(name) {
    return {
      id: BM.uid(), name: name || 'Крем для рук 50 мл', projectId: null, updatedAt: Date.now(),
      base: {
        unitVolume: 50, unit: 'мл', density: 1, batch: 3000, defectPct: 2, includeOneOff: false,
        rates: { USD: 92, EUR: 100, CNY: 12.7 },
        ingredients: [
          { name: 'Основа: вода, эмульгаторы', pct: 78, price: 180, cur: 'RUB', loss: 3 },
          { name: 'Масла и эмоленты', pct: 12, price: 950, cur: 'RUB', loss: 3 },
          { name: 'Актив: гиалуроновая кислота', pct: 1, price: 85, cur: 'USD', loss: 2 },
          { name: 'Консервант и отдушка', pct: 1.5, price: 2400, cur: 'RUB', loss: 2 },
          { name: 'Прочие компоненты', pct: 7.5, price: 300, cur: 'RUB', loss: 3 }
        ],
        packaging: [
          { name: 'Туба 50 мл', price: 14, cur: 'RUB', scrap: 2 },
          { name: 'Крышка', price: 3.5, cur: 'RUB', scrap: 1 },
          { name: 'Печать / этикетка', price: 4, cur: 'RUB', scrap: 3 },
          { name: 'Коробка', price: 9, cur: 'RUB', scrap: 2 },
          { name: 'Вкладыш с QR', price: 1.5, cur: 'RUB', scrap: 1 }
        ],
        production: { fillPerUnit: 12, laborPerUnit: 4, setupPerBatch: 25000 },
        oneOff: [
          { name: 'Декларация и испытания', amount: 60000, batches: 3 },
          { name: 'Дизайн упаковки', amount: 120000, batches: 5 },
          { name: 'Клише, формы, пробы', amount: 30000, batches: 5 }
        ],
        marking: { codePerUnit: 0.6, applyPerUnit: 1.2 },
        logistics: { inboundPerBatch: 18000, fulfilPerUnit: 8 },
        salesMode: 'simple',
        sales: { enabled: true, price: 590, commissionPct: 17, mpLogistics: 55, storagePerUnit: 3, drrPct: 12, buyoutPct: 85, returnCost: 50, taxPct: 6 },
        mp: mpDefaults(), simChannel: 'wb',
        tax: { mode: 'income', rate: 6 },
        marketing: { monthlyBudget: 0, monthlyUnits: 1000 }
      },
      sim: null, scenarios: []
    };
  }
  function normalize(m) {
    var b = m.base, d = defaultModel().base;
    ['salesMode', 'mp', 'simChannel', 'tax', 'marketing'].forEach(function (k) { if (b[k] == null) b[k] = d[k]; });
    if (b.includeOneOff == null) b.includeOneOff = false;
    if (b.tax.rate == null) b.tax.rate = b.sales.taxPct != null ? b.sales.taxPct : 6;
    MPS.forEach(function (mp) { b.mp[mp.id] = Object.assign(JSON.parse(JSON.stringify(mp.d)), b.mp[mp.id] || {}); });
    if (!m.scenarios) m.scenarios = [];
    if (!m.sim) m.sim = emptySim();
    return m;
  }
  function emptySim() { return { batch: null, fx: 0, raw: 0, pack: 0, prod: 0, price: 0, drr: null, buyout: null, commission: null }; }

  function n(v) { var x = BM.num(v); return x == null ? 0 : x; }
  function clampPct(v) { return Math.max(0, Math.min(90, v)); }

  // ---------- calculation ----------
  function channelCalc(p, ctx, sim, label, id) {
    var price = n(p.price) * (1 + n(sim.price) / 100);
    var comm = (sim.commission != null ? sim.commission : n(p.commissionPct)) / 100;
    var drr = (sim.drr != null ? sim.drr : n(p.drrPct)) / 100;
    var buy = Math.max(1, sim.buyout != null ? sim.buyout : n(p.buyoutPct)) / 100;
    var perDelivery = n(p.logistics) * (n(p.logisticsCoef) || 1) + price * n(p.lastMilePct) / 100 + n(p.processing);
    var costs = [
      { key: 'cogs', cat: 'cogs', label: 'Себестоимость', v: ctx.unit },
      { key: 'comm', cat: 'sales', label: 'Комиссия', v: price * comm },
      { key: 'acq', cat: 'sales', label: 'Эквайринг', v: price * n(p.acquiringPct) / 100 },
      { key: 'log', cat: 'sales', label: 'Логистика с учётом невыкупа', v: perDelivery / buy },
      { key: 'ret', cat: 'sales', label: 'Обратная логистика', v: n(p.returnCost) * (1 - buy) / buy },
      { key: 'stor', cat: 'sales', label: 'Хранение и приёмка', v: n(p.storage) + n(p.acceptance) },
      { key: 'ads', cat: 'marketing', label: 'Реклама (ДРР)', v: price * drr },
      { key: 'mkt', cat: 'marketing', label: 'Маркетинг вне площадки', v: ctx.mktPerUnit }
    ].filter(function (c) { return c.v > 0.004 || c.key === 'cogs'; });
    var before = costs.reduce(function (a, c) { return a + c.v; }, 0);
    var rate = n(ctx.tax.rate) / 100;
    var tax = ctx.tax.mode === 'profit' ? Math.max(0, price - before) * rate : price * rate;
    if (tax > 0.004) costs.push({ key: 'tax', cat: 'tax', label: ctx.tax.mode === 'profit' ? 'Налог с прибыли' : 'Налог с выручки', v: tax });
    var total = before + tax, profit = price - total, nonCogs = price - (total - ctx.unit);
    return { id: id, label: label, price: price, costs: costs, total: total, profit: profit, margin: price ? profit / price * 100 : 0,
      batchProfit: profit * ctx.good, roi: ctx.cashFirst ? profit * ctx.good / ctx.cashFirst * 100 : 0,
      payback: nonCogs > 0 ? Math.ceil(ctx.cashFirst / nonCogs) : null,
      launchPayback: profit > 0 && ctx.oneOffTotal ? Math.ceil(ctx.oneOffTotal / profit) : null };
  }

  function calc(base, sim) {
    sim = sim || emptySim();
    var fxK = 1 + n(sim.fx) / 100, rawK = 1 + n(sim.raw) / 100, packK = 1 + n(sim.pack) / 100, prodK = 1 + n(sim.prod) / 100;
    var batch = Math.max(1, sim.batch != null ? sim.batch : n(base.batch));
    var grams = n(base.unitVolume) * (base.unit === 'г' ? 1 : (n(base.density) || 1));
    var rt = function (cur) { return cur === 'RUB' || !cur ? 1 : n(base.rates[cur]) * fxK; };
    var ingRows = base.ingredients.map(function (r) { return { name: r.name, cost: grams * n(r.pct) / 100 * n(r.price) * rt(r.cur) * rawK / 1000 * (1 + n(r.loss) / 100) }; });
    var raw = ingRows.reduce(function (a, r) { return a + r.cost; }, 0);
    var pctSum = base.ingredients.reduce(function (a, r) { return a + n(r.pct); }, 0);
    var packRows = base.packaging.map(function (r) { return { name: r.name, cost: n(r.price) * rt(r.cur) * packK * (1 + n(r.scrap) / 100) }; });
    var pack = packRows.reduce(function (a, r) { return a + r.cost; }, 0);
    var prodVar = (n(base.production.fillPerUnit) + n(base.production.laborPerUnit)) * prodK, setup = n(base.production.setupPerBatch);
    var prod = prodVar + setup / batch;
    var oneOffTotal = base.oneOff.reduce(function (a, r) { return a + n(r.amount); }, 0);
    var oneOffAmort = base.oneOff.reduce(function (a, r) { return a + n(r.amount) / (Math.max(1, n(r.batches)) * batch); }, 0);
    var marking = n(base.marking.codePerUnit) + n(base.marking.applyPerUnit);
    var inbound = n(base.logistics.inboundPerBatch);
    var logistics = inbound / batch + n(base.logistics.fulfilPerUnit);
    var defect = clampPct(n(base.defectPct)), keep = 1 - defect / 100;
    var subtotalVar = raw + pack + prod + marking + logistics;
    var unitVar = subtotalVar / keep;
    var oneOffUnit = oneOffAmort / keep;
    var unitFull = unitVar + oneOffUnit;
    var include = !!base.includeOneOff;
    var unit = include ? unitFull : unitVar;
    var defectCost = (include ? subtotalVar + oneOffAmort : subtotalVar) * (1 / keep - 1);
    var parts = [
      { key: 'raw', label: 'Сырьё', v: raw }, { key: 'pack', label: 'Упаковка', v: pack }, { key: 'prod', label: 'Производство и наладка', v: prod },
      { key: 'marking', label: 'Маркировка', v: marking }, { key: 'log', label: 'Логистика до склада', v: logistics }, { key: 'defect', label: 'Брак', v: defectCost }
    ];
    if (include) parts.splice(3, 0, { key: 'oneoff', label: 'Амортизация запуска', v: oneOffAmort });
    var variableUnit = raw + pack + prodVar + marking + n(base.logistics.fulfilPerUnit);
    var cashNext = variableUnit * batch + setup + inbound;
    var cashFirst = cashNext + oneOffTotal;
    var good = batch * keep;
    var mk = base.marketing || { monthlyBudget: 0, monthlyUnits: 1 };
    var ctx = { unit: unit, good: good, cashFirst: cashFirst, oneOffTotal: oneOffTotal, tax: base.tax || { mode: 'income', rate: 6 }, mktPerUnit: n(mk.monthlyBudget) / Math.max(1, n(mk.monthlyUnits)) };
    var r = { batch: batch, grams: grams, raw: raw, pack: pack, prod: prod, marking: marking, logistics: logistics, defectCost: defectCost,
      unit: unit, unitVar: unitVar, unitFull: unitFull, oneOffTotal: oneOffTotal, oneOffUnit: oneOffUnit, include: include,
      cashFirst: cashFirst, cashNext: cashNext, good: good, parts: parts, ingRows: ingRows, packRows: packRows, pctSum: pctSum, sales: null, channels: [] };
    if (base.salesMode === 'mp') {
      MPS.forEach(function (mp) {
        var p = base.mp[mp.id];
        if (!p || !p.enabled) return;
        var s2 = mp.id === base.simChannel ? sim : Object.assign(emptySim(), { fx: sim.fx, raw: sim.raw, pack: sim.pack, prod: sim.prod, batch: sim.batch });
        r.channels.push(channelCalc(p, ctx, s2, mp.label, mp.id));
      });
      r.sales = r.channels.filter(function (c) { return c.id === base.simChannel; })[0] || r.channels[0] || null;
      r.best = r.channels.slice().sort(function (a, b) { return b.profit - a.profit; })[0] || null;
    } else if (base.sales && base.sales.enabled) {
      var s = base.sales;
      r.sales = channelCalc({ price: s.price, commissionPct: s.commissionPct, acquiringPct: 0, logistics: s.mpLogistics, logisticsCoef: 1, lastMilePct: 0, processing: 0, returnCost: s.returnCost, storage: s.storagePerUnit, acceptance: 0, buyoutPct: s.buyoutPct, drrPct: s.drrPct }, ctx, sim, 'Общая прикидка', 'simple');
    }
    return r;
  }
  BM.costCalc = calc;

  // ---------- state ----------
  function models() { BM.state.costModels = BM.state.costModels || []; return BM.state.costModels; }
  function current(id) {
    var list = models();
    var m = list.filter(function (x) { return x.id === id; })[0] || list[0];
    if (!m) { m = defaultModel(); list.push(m); BM.persist(); }
    return normalize(m);
  }
  BM.ui.costTab = BM.ui.costTab || 'real';

  // ---------- formatting ----------
  function rub(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    var d = digits != null ? digits : (Math.abs(v) < 100 ? 2 : 0);
    return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: d }) + ' ₽';
  }
  function pct(v, d) { return v == null || !isFinite(v) ? '—' : v.toLocaleString('ru-RU', { maximumFractionDigits: d == null ? 1 : d }) + '%'; }
  function units(v) { return v == null ? '—' : v.toLocaleString('ru-RU') + ' шт.'; }
  function delta(a, b, money, invert) {
    if (a == null || b == null) return '';
    var d = a - b; if (Math.abs(d) < 0.005) return '<span class="cd-delta flat">без изменений</span>';
    var good = invert ? d < 0 : d > 0;
    return '<span class="cd-delta ' + (good ? 'good' : 'bad') + '">' + (d > 0 ? '+' : '−') + (money ? rub(Math.abs(d)) : Math.abs(d).toFixed(1) + ' п.п.') + '</span>';
  }

  // ---------- inputs ----------
  function idOf(path) { return 'cf-' + path.replace(/\./g, '-'); }
  function inp(path, value, opts) {
    opts = opts || {};
    return '<input class="input' + (opts.num !== false ? ' num' : '') + '" id="' + idOf(path) + '" data-cf="' + path + '" value="' + esc(value == null ? '' : value) + '"' + (opts.num !== false ? ' inputmode="decimal"' : '') + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : '') + ' autocomplete="off">';
  }
  function field(path, label, value, suffix, hint) {
    return '<div class="field"><label for="' + idOf(path) + '">' + esc(label) + '</label><div class="cf-unit">' + inp(path, value) + (suffix ? '<span>' + esc(suffix) + '</span>' : '') + '</div>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function curSel(path, value, label) {
    return '<select class="select" data-cf="' + path + '" aria-label="' + esc(label) + '">' + CUR.map(function (c) { return '<option' + (c === value ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>';
  }
  function section(id, title, hint, body, cat) {
    var open = BM.ui['cs_' + id] !== false;
    return '<section class="cf-sec' + (open ? ' open' : '') + '" data-cf-sec="' + id + '"><button type="button" class="cf-sec-head" data-cf-toggle="' + id + '" aria-expanded="' + open + '">' + icon('chevR', 'chev') +
      '<span><b>' + esc(title) + (cat ? ' <i class="cf-cat" style="--cc:' + CATS[cat].color + '">' + esc(CATS[cat].label) + '</i>' : '') + '</b><small>' + esc(hint) + '</small></span><span class="cf-sec-sum num" data-cf-sum="' + id + '"></span></button><div class="cf-sec-body">' + body + '</div></section>';
  }

  function salesHtml(b) {
    var mode = b.salesMode;
    var seg = '<div class="sys-seg cf-seg" role="group" aria-label="Формат расчёта продаж"><button type="button" data-cf-salesmode="simple" aria-pressed="' + (mode !== 'mp') + '">Общая прикидка</button><button type="button" data-cf-salesmode="mp" aria-pressed="' + (mode === 'mp') + '">По площадкам</button></div>';
    var tax = '<div class="form-grid two cf-common"><div class="field"><label for="cf-tax-mode">Налог</label><select class="select" id="cf-tax-mode" data-cf="tax.mode"><option value="income"' + (b.tax.mode === 'income' ? ' selected' : '') + '>УСН «доходы» — % от выручки</option><option value="profit"' + (b.tax.mode === 'profit' ? ' selected' : '') + '>УСН «доходы − расходы» — % от прибыли</option></select></div>' +
      field('tax.rate', 'Ставка налога', b.tax.rate, '%', 'Для упрощёнки 6% или 15%; региональные ставки бывают ниже') +
      field('marketing.monthlyBudget', 'Маркетинг вне площадки в месяц', b.marketing.monthlyBudget, '₽', 'Блогеры, посевы, SMM, внешний трафик') +
      field('marketing.monthlyUnits', 'Плановые продажи в месяц', b.marketing.monthlyUnits, 'шт.', 'Делит бюджет маркетинга на единицу') + '</div>';
    var body;
    if (mode === 'mp') {
      body = '<p class="small muted" style="margin:0 0 12px">Значения по умолчанию — грубые ориентиры для косметики. Тарифы зависят от категории, габаритов, склада и регулярно меняются: сверяйтесь с калькуляторами и офертой каждой площадки.</p><div class="cf-mp-grid">' + MPS.map(function (mp) {
        var p = b.mp[mp.id];
        return '<div class="cf-mp' + (p.enabled ? '' : ' off') + '"><label class="cf-switch"><input type="checkbox" data-cf="mp.' + mp.id + '.enabled"' + (p.enabled ? ' checked' : '') + '><span><b>' + esc(mp.label) + '</b> <small class="muted">' + esc(mp.model) + '</small></span></label>' +
          '<p class="cf-mp-note">' + esc(mp.note) + '</p><div class="cf-mp-fields">' + mp.fields.map(function (f) { return field('mp.' + mp.id + '.' + f[0], f[1], p[f[0]], f[2], f[3]); }).join('') + '</div></div>';
      }).join('') + '</div>';
    } else {
      var s = b.sales;
      body = '<label class="cf-switch"><input type="checkbox" data-cf="sales.enabled"' + (s.enabled ? ' checked' : '') + '><span>Считать юнит-экономику продажи</span></label><div class="form-grid three">' +
        field('sales.price', 'Цена продажи', s.price, '₽') + field('sales.commissionPct', 'Комиссия площадки', s.commissionPct, '%') + field('sales.mpLogistics', 'Логистика до покупателя', s.mpLogistics, '₽/заказ') +
        field('sales.buyoutPct', 'Доля выкупа', s.buyoutPct, '%') + field('sales.returnCost', 'Обратная логистика', s.returnCost, '₽/возврат') + field('sales.storagePerUnit', 'Хранение', s.storagePerUnit, '₽/шт.') +
        field('sales.drrPct', 'ДРР (реклама)', s.drrPct, '%') + '</div>';
    }
    return seg + body + tax;
  }

  function inputsHtml(m) {
    var b = m.base;
    var ing = '<div class="cf-table"><div class="cf-tr cf-th"><span>Компонент</span><span>% в формуле</span><span>Цена за кг</span><span>Валюта</span><span>Потери %</span><span></span></div>' +
      b.ingredients.map(function (r, i) {
        return '<div class="cf-tr">' + inp('ingredients.' + i + '.name', r.name, { num: false, label: 'Компонент' }) + inp('ingredients.' + i + '.pct', r.pct, { label: '% в формуле' }) + inp('ingredients.' + i + '.price', r.price, { label: 'Цена за кг' }) +
          curSel('ingredients.' + i + '.cur', r.cur, 'Валюта') + inp('ingredients.' + i + '.loss', r.loss, { label: 'Потери %' }) +
          '<button type="button" class="icon-btn sm" data-cf-del="ingredients" data-i="' + i + '" aria-label="Удалить компонент">' + icon('x', 'sm') + '</button></div>';
      }).join('') + '</div><div class="row cf-row-actions"><button type="button" class="btn sm soft" data-cf-add="ingredients">' + icon('plus', 'sm') + 'Компонент</button><span class="small" data-cf-pctsum></span></div>';
    var pack = '<div class="cf-table pack"><div class="cf-tr cf-th"><span>Компонент</span><span>Цена за шт.</span><span>Валюта</span><span>Брак %</span><span></span></div>' +
      b.packaging.map(function (r, i) {
        return '<div class="cf-tr">' + inp('packaging.' + i + '.name', r.name, { num: false, label: 'Компонент' }) + inp('packaging.' + i + '.price', r.price, { label: 'Цена за штуку' }) +
          curSel('packaging.' + i + '.cur', r.cur, 'Валюта') + inp('packaging.' + i + '.scrap', r.scrap, { label: 'Брак %' }) +
          '<button type="button" class="icon-btn sm" data-cf-del="packaging" data-i="' + i + '" aria-label="Удалить компонент">' + icon('x', 'sm') + '</button></div>';
      }).join('') + '</div><div class="row cf-row-actions"><button type="button" class="btn sm soft" data-cf-add="packaging">' + icon('plus', 'sm') + 'Компонент упаковки</button></div>' +
      '<p class="small muted" style="margin-top:10px">Сюда — только то, что повторяется на каждую единицу: компоненты и печать. Дизайн упаковки — в «Разовые затраты на запуск».</p>';
    var once = '<label class="cf-switch"><input type="checkbox" data-cf="includeOneOff"' + (b.includeOneOff ? ' checked' : '') + '><span>Распределять на себестоимость единицы (амортизация)</span></label>' +
      '<div class="cf-table once"><div class="cf-tr cf-th"><span>Статья</span><span>Сумма, ₽</span><span>На сколько партий</span><span></span></div>' +
      b.oneOff.map(function (r, i) {
        return '<div class="cf-tr">' + inp('oneOff.' + i + '.name', r.name, { num: false, label: 'Статья' }) + inp('oneOff.' + i + '.amount', r.amount, { label: 'Сумма' }) + inp('oneOff.' + i + '.batches', r.batches, { label: 'Партий' }) +
          '<button type="button" class="icon-btn sm" data-cf-del="oneOff" data-i="' + i + '" aria-label="Удалить статью">' + icon('x', 'sm') + '</button></div>';
      }).join('') + '</div><div class="row cf-row-actions"><button type="button" class="btn sm soft" data-cf-add="oneOff">' + icon('plus', 'sm') + 'Статья</button></div>' +
      '<p class="small muted" style="margin-top:10px">По умолчанию эти затраты не входят в себестоимость единицы: это инвестиции в запуск. Калькулятор покажет их отдельно и посчитает, за сколько продаж они окупятся.</p>';
    return '<div class="cf-inputs">' +
      section('batch', 'Продукт и партия', 'Объём единицы, размер партии, брак, курсы', '<div class="form-grid three">' +
        field('unitVolume', 'Объём единицы', b.unitVolume, b.unit) +
        '<div class="field"><label for="cf-unit">Единица</label><select class="select" id="cf-unit" data-cf="unit"><option' + (b.unit === 'мл' ? ' selected' : '') + '>мл</option><option' + (b.unit === 'г' ? ' selected' : '') + '>г</option></select></div>' +
        field('density', 'Плотность', b.density, 'г/мл', 'Для кремов ≈ 0,95–1,05') +
        field('batch', 'Размер партии', b.batch, 'шт.', 'Сверьте с MOQ производителя') + field('defectPct', 'Брак готовой продукции', b.defectPct, '%') +
        field('rates.USD', 'Курс USD', b.rates.USD, '₽') + field('rates.EUR', 'Курс EUR', b.rates.EUR, '₽') + field('rates.CNY', 'Курс CNY', b.rates.CNY, '₽') + '</div>', 'cogs') +
      section('raw', 'Рецептура и сырьё', 'Доля в формуле × цена за кг с учётом потерь', ing, 'cogs') +
      section('pack', 'Упаковка', 'Компоненты и печать на единицу с учётом брака', pack, 'cogs') +
      section('prod', 'Производство', 'Розлив, работа, наладка линии на партию', '<div class="form-grid three">' +
        field('production.fillPerUnit', 'Розлив и сборка', b.production.fillPerUnit, '₽/шт.') + field('production.laborPerUnit', 'Работа и контроль', b.production.laborPerUnit, '₽/шт.') + field('production.setupPerBatch', 'Наладка на партию', b.production.setupPerBatch, '₽') + '</div>', 'cogs') +
      section('mark', 'Маркировка и логистика до склада', 'Честный знак, доставка партии, фулфилмент', '<div class="form-grid two">' +
        field('marking.codePerUnit', 'Код Честного знака', b.marking.codePerUnit, '₽/шт.', 'Тариф оператора маркировки') + field('marking.applyPerUnit', 'Нанесение кода', b.marking.applyPerUnit, '₽/шт.') +
        field('logistics.inboundPerBatch', 'Доставка партии до склада МП', b.logistics.inboundPerBatch, '₽') + field('logistics.fulfilPerUnit', 'Фулфилмент и упаковка поставки', b.logistics.fulfilPerUnit, '₽/шт.') + '</div>', 'cogs') +
      section('once', 'Разовые затраты на запуск', 'Дизайн, сертификация, формы — инвестиции, а не себестоимость', once, 'launch') +
      section('sales', 'Продажа на маркетплейсе', 'Общая прикидка или разбивка по WB, Ozon и Яндекс Маркету', salesHtml(b), 'sales') +
      whereHtml() +
      '</div>';
  }

  function whereHtml() {
    var q = (BM.ui.cfWhereQ || '').toLowerCase(), cat = BM.ui.cfWhereCat || '';
    var items = WHERE.filter(function (w) { return (!cat || w[1] === cat) && (!q || (w[0] + ' ' + w[2]).toLowerCase().indexOf(q) > -1); });
    var open = BM.ui.cs_where === true;
    return '<section class="cf-sec' + (open ? ' open' : '') + '" data-cf-sec="where"><button type="button" class="cf-sec-head" data-cf-toggle="where" aria-expanded="' + open + '">' + icon('chevR', 'chev') +
      '<span><b>Что куда относится</b><small>Себестоимость, запуск, продажи, маркетинг, постоянные расходы, налоги</small></span><span class="cf-sec-sum">' + icon('info', 'sm') + '</span></button><div class="cf-sec-body">' +
      '<div class="cf-where-cats">' + Object.keys(CATS).map(function (k) { var c = CATS[k]; return '<button type="button" class="cf-where-cat" data-cf-wcat="' + k + '" aria-pressed="' + (cat === k) + '" style="--cc:' + c.color + '"><b>' + esc(c.label) + '</b><span>' + esc(c.text) + '</span></button>'; }).join('') + '</div>' +
      '<div class="field" style="margin-top:12px"><label for="cf-where-q">Куда отнести статью?</label><input class="input" id="cf-where-q" type="search" data-cf-whereq placeholder="Например: дизайн коробки, фото для карточки, хранение" value="' + esc(BM.ui.cfWhereQ || '') + '"></div>' +
      '<ul class="cf-where-list" id="cf-where-list">' + whereItems(items) + '</ul></div></section>';
  }
  function whereItems(items) {
    return items.length ? items.map(function (w) { var c = CATS[w[1]]; return '<li><div class="row" style="justify-content:space-between;gap:8px"><b>' + esc(w[0]) + '</b><i class="cf-cat" style="--cc:' + c.color + '">' + esc(c.label) + '</i></div><p>' + esc(w[2]) + '</p></li>'; }).join('') : '<li class="muted">Ничего не нашлось — опишите статью иначе или выберите категорию выше.</li>';
  }

  // ---------- results ----------
  function summaryHtml(r, base) {
    var s = r.sales;
    return '<div class="cf-kpis">' +
      '<div class="cf-kpi main"><small>Себестоимость единицы</small><b class="num">' + rub(r.unit) + '</b>' + (base ? delta(r.unit, base.unit, true, true) : '<span class="cf-sub">' + (r.include ? 'с амортизацией запуска' : 'без разовых затрат; с ними ' + rub(r.unitFull)) + '</span>') + '</div>' +
      '<div class="cf-kpi"><small>Деньги на первую партию</small><b class="num">' + rub(r.cashFirst, 0) + '</b>' + (base ? delta(r.cashFirst, base.cashFirst, true, true) : '<span class="cf-sub">из них запуск ' + rub(r.oneOffTotal, 0) + '; далее ' + rub(r.cashNext, 0) + '</span>') + '</div>' +
      (s ? '<div class="cf-kpi"><small>Прибыль с продажи' + (s.id !== 'simple' ? ' · ' + esc(s.label) : '') + '</small><b class="num" style="color:' + (s.profit < 0 ? 'var(--danger)' : 'inherit') + '">' + rub(s.profit) + '</b>' + (base && base.sales ? delta(s.profit, base.sales.profit, true) : '') + '</div>' +
        '<div class="cf-kpi"><small>Маржа</small><b class="num"><span class="margin-pill ' + BM.marginClass(s.margin) + '">' + pct(s.margin) + '</span></b>' + (base && base.sales ? delta(s.margin, base.sales.margin, false) : '') + '</div>' : '') +
      '</div>' +
      (s ? '<p class="small muted cf-note">Партия ' + units(r.batch) + ' → прибыль ' + rub(s.batchProfit, 0) + ', ROI первой партии ' + pct(s.roi, 0) + '. ' +
        (s.payback ? 'Все вложения вернутся после продажи ' + units(s.payback) + ' (' + pct(s.payback / r.good * 100, 0) + ' партии).' : '<b style="color:var(--danger)">Продажи не покрывают переменные расходы — вложения не вернутся.</b>') +
        (s.launchPayback ? ' Разовые затраты на запуск окупятся за ' + units(s.launchPayback) + '.' : '') + '</p>' : '');
  }

  function barsHtml(rows, total, title, unitLabel) {
    var max = Math.max.apply(null, rows.map(function (x) { return x.v; }).concat([0.0001]));
    var sorted = rows.slice().sort(function (a, b) { return b.v - a.v; });
    return '<div class="cf-chart"><h3>' + title + '</h3><ul class="cf-bars" role="list">' + sorted.map(function (x) {
      var share = total ? x.v / total * 100 : 0;
      return '<li data-tip="' + esc(x.label + ': ' + rub(x.v) + ' (' + pct(share) + ')') + '"><span class="cf-bar-l">' + (x.cat ? '<i class="cf-dot" style="background:' + CATS[x.cat].color + '" aria-hidden="true"></i>' : '') + esc(x.label) + '</span><span class="cf-bar-t"><i style="width:' + (x.v / max * 100).toFixed(1) + '%"></i></span><span class="cf-bar-v num">' + rub(x.v) + '<small>' + pct(share, 0) + '</small></span></li>';
    }).join('') + '</ul><div class="cf-bar-total"><span>Итого ' + esc(unitLabel) + '</span><b class="num">' + rub(total) + '</b></div></div>';
  }

  function compareHtml(r) {
    var ch = r.channels;
    if (!ch.length) return '<div class="card"><p class="muted">Включите хотя бы одну площадку в блоке «Продажа на маркетплейсе».</p></div>';
    var keys = [['cogs', 'Себестоимость'], ['comm', 'Комиссия'], ['acq', 'Эквайринг'], ['log', 'Логистика с учётом невыкупа'], ['ret', 'Обратная логистика'], ['stor', 'Хранение и приёмка'], ['ads', 'Реклама (ДРР)'], ['mkt', 'Маркетинг вне площадки'], ['tax', 'Налог']];
    var val = function (c, k) { var x = c.costs.filter(function (y) { return y.key === k; })[0]; return x ? x.v : 0; };
    var best = r.best ? r.best.id : null;
    return '<div class="card"><h3>Сравнение площадок</h3><p class="small muted" style="margin:4px 0 10px">На одну проданную единицу. Подсвечена площадка с наибольшей прибылью.</p><div class="table-wrap"><table class="table cf-cmp"><thead><tr><th scope="col">На единицу</th>' +
      ch.map(function (c) { return '<th scope="col"' + (c.id === best ? ' class="best"' : '') + '>' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><td>Цена</td>' + ch.map(function (c) { return '<td class="num' + (c.id === best ? ' best' : '') + '">' + rub(c.price) + '</td>'; }).join('') + '</tr>' +
      keys.filter(function (k) { return ch.some(function (c) { return val(c, k[0]) > 0.004; }); }).map(function (k) {
        return '<tr><td>' + k[1] + '</td>' + ch.map(function (c) { var v = val(c, k[0]); return '<td class="num' + (c.id === best ? ' best' : '') + '">' + (v > 0.004 ? '−' + rub(v) : '—') + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '<tr class="cf-cmp-total"><td>Прибыль</td>' + ch.map(function (c) { return '<td class="num' + (c.id === best ? ' best' : '') + '" style="color:' + (c.profit < 0 ? 'var(--danger)' : 'inherit') + '">' + rub(c.profit) + '</td>'; }).join('') + '</tr>' +
      '<tr><td>Маржа</td>' + ch.map(function (c) { return '<td class="' + (c.id === best ? 'best' : '') + '"><span class="margin-pill ' + BM.marginClass(c.margin) + '">' + pct(c.margin) + '</span></td>'; }).join('') + '</tr>' +
      '<tr><td>Прибыль с партии</td>' + ch.map(function (c) { return '<td class="num' + (c.id === best ? ' best' : '') + '">' + rub(c.batchProfit, 0) + '</td>'; }).join('') + '</tr>' +
      '<tr><td>Окупаемость вложений</td>' + ch.map(function (c) { return '<td class="num' + (c.id === best ? ' best' : '') + '">' + (c.payback ? units(c.payback) : 'не окупится') + '</td>'; }).join('') + '</tr>' +
      '</tbody></table></div></div>';
  }

  function resultsHtml(m) {
    var r = calc(m.base);
    var html = '<div class="card cf-summary">' + summaryHtml(r) + '</div>';
    html += '<div class="card">' + barsHtml(r.parts, r.unit, 'Из чего складывается себестоимость', 'на единицу') + '</div>';
    if (m.base.salesMode === 'mp') html += compareHtml(r);
    var shown = m.base.salesMode === 'mp' ? r.best : r.sales;
    if (shown) html += '<div class="card">' + barsHtml(shown.costs, shown.total, 'Куда уходит цена ' + rub(shown.price) + (shown.id !== 'simple' ? ' · ' + esc(shown.label) : ''), 'расходов на проданную единицу') +
      '<div class="cf-legend">' + ['cogs', 'sales', 'marketing', 'tax'].map(function (k) { return '<span><i class="cf-dot" style="background:' + CATS[k].color + '"></i>' + esc(CATS[k].label) + '</span>'; }).join('') + '</div></div>';
    html += '<div class="card"><h3>Самые дорогие компоненты</h3><div class="table-wrap"><table class="table"><thead><tr><th scope="col">Компонент</th><th scope="col">На единицу</th><th scope="col">На партию</th></tr></thead><tbody>' +
      r.ingRows.concat(r.packRows).sort(function (a, b) { return b.cost - a.cost; }).slice(0, 6).map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="num">' + rub(x.cost) + '</td><td class="num">' + rub(x.cost * r.batch, 0) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    return html;
  }

  // ---------- simulation ----------
  function chanParams(b) {
    if (b.salesMode === 'mp') { var p = b.mp[b.simChannel] || b.mp.wb; return { drr: n(p.drrPct), buyout: n(p.buyoutPct), commission: n(p.commissionPct) }; }
    return { drr: n(b.sales.drrPct), buyout: n(b.sales.buyoutPct), commission: n(b.sales.commissionPct) };
  }
  function hasSales(b) { return b.salesMode === 'mp' ? MPS.some(function (mp) { return b.mp[mp.id].enabled; }) : b.sales.enabled; }
  var SIM = [
    { k: 'batch', label: 'Размер партии', min: 300, max: 30000, step: 100, abs: true, base: function (b) { return n(b.batch); } },
    { k: 'fx', label: 'Курс валют', min: -30, max: 60, step: 1, fmt: 'pct' },
    { k: 'raw', label: 'Цены на сырьё', min: -40, max: 60, step: 1, fmt: 'pct' },
    { k: 'pack', label: 'Цены на упаковку', min: -40, max: 60, step: 1, fmt: 'pct' },
    { k: 'prod', label: 'Стоимость производства', min: -40, max: 60, step: 1, fmt: 'pct' },
    { k: 'price', label: 'Цена продажи', min: -40, max: 60, step: 1, fmt: 'pct', sales: true },
    { k: 'drr', label: 'ДРР', min: 0, max: 40, step: 0.5, abs: true, sales: true, base: function (b) { return chanParams(b).drr; } },
    { k: 'buyout', label: 'Доля выкупа', min: 30, max: 100, step: 1, abs: true, sales: true, base: function (b) { return chanParams(b).buyout; } },
    { k: 'commission', label: 'Комиссия площадки', min: 5, max: 40, step: 0.5, abs: true, sales: true, base: function (b) { return chanParams(b).commission; } }
  ];
  function simVal(m, s) { var v = m.sim[s.k]; return v == null ? (s.abs ? s.base(m.base) : 0) : v; }
  function sliderLabel(s, v) { return s.fmt === 'pct' ? (v > 0 ? '+' : '') + v + '%' : (s.k === 'batch' ? Math.round(v).toLocaleString('ru-RU') + ' шт.' : v + '%'); }

  function simHtml(m) {
    var b = m.base, sales = hasSales(b);
    var chSel = b.salesMode === 'mp' ? '<div class="field" style="margin-bottom:10px"><label for="cf-simch">Площадка для симуляции</label><select class="select" id="cf-simch" data-cf-simch>' +
      MPS.filter(function (mp) { return b.mp[mp.id].enabled; }).map(function (mp) { return '<option value="' + mp.id + '"' + (mp.id === b.simChannel ? ' selected' : '') + '>' + esc(mp.label) + '</option>'; }).join('') + '</select></div>' : '';
    var sliders = SIM.filter(function (s) { return !s.sales || sales; }).map(function (s) {
      var v = simVal(m, s);
      return '<div class="cf-slider"><div class="row" style="justify-content:space-between"><label for="sim-' + s.k + '">' + esc(s.label) + '</label><output class="num" id="sim-o-' + s.k + '">' + sliderLabel(s, v) + '</output></div>' +
        '<input type="range" id="sim-' + s.k + '" data-sim="' + s.k + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + v + '"></div>';
    }).join('');
    return '<div class="cf-sim-grid">' +
      '<div class="card cf-sim-panel"><div class="card-head"><h2>Что если</h2><button type="button" class="btn sm ghost" data-cf-simreset>' + icon('refresh', 'sm') + 'Сбросить</button></div>' +
        '<p class="small muted" style="margin:-6px 0 12px">Ползунки меняют расчёт поверх реальных цифр, не трогая их.</p>' + chSel + sliders +
        '<div class="row" style="margin-top:14px"><button type="button" class="btn soft" data-cf-savesc>' + icon('plus', 'sm') + 'Сохранить сценарий</button><button type="button" class="btn ghost" data-cf-apply>' + icon('check', 'sm') + 'Сделать реальными цифрами</button></div></div>' +
      '<div class="cf-sim-out"><div class="card cf-summary" id="cf-sim-summary"></div><div class="card" id="cf-tornado"></div><div class="card" id="cf-batchcurve"></div></div>' +
    '</div>' +
    '<div class="card"><div class="card-head"><h2>Сценарии</h2></div><div id="cf-scenarios">' + scenariosTable(m) + '</div></div>';
  }

  function scenariosTable(m) {
    var rows = [{ id: '', name: 'Реальные цифры', sim: emptySim(), base: true }].concat(m.scenarios || []);
    var sales = hasSales(m.base);
    return '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Сценарий</th><th scope="col">Себестоимость</th><th scope="col">Первая партия</th>' + (sales ? '<th scope="col">Прибыль/шт.</th><th scope="col">Маржа</th><th scope="col">Окупаемость</th>' : '') + '<th scope="col"><span class="sr-only">Действия</span></th></tr></thead><tbody>' +
      rows.map(function (s) {
        var r = calc(m.base, s.sim);
        return '<tr><td><b>' + esc(s.name) + '</b>' + (s.base ? '' : '<small class="muted" style="display:block">' + esc(simSummary(m, s.sim)) + '</small>') + '</td><td class="num">' + rub(r.unit) + '</td><td class="num">' + rub(r.cashFirst, 0) + '</td>' +
          (r.sales ? '<td class="num">' + rub(r.sales.profit) + '</td><td class="num">' + pct(r.sales.margin) + '</td><td class="num">' + (r.sales.payback ? units(r.sales.payback) : '—') + '</td>' : (sales ? '<td>—</td><td>—</td><td>—</td>' : '')) +
          '<td>' + (s.base ? '' : '<div class="row" style="gap:4px;flex-wrap:nowrap"><button type="button" class="icon-btn sm" data-cf-loadsc="' + s.id + '" aria-label="Загрузить сценарий в ползунки">' + icon('arrowR', 'sm') + '</button><button type="button" class="icon-btn sm" data-cf-delsc="' + s.id + '" aria-label="Удалить сценарий">' + icon('trash', 'sm') + '</button></div>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (rows.length < 2 ? '<p class="small muted" style="margin-top:10px">Подвигайте ползунки и нажмите «Сохранить сценарий», чтобы сравнить варианты: например, «большая партия», «рост курса на 20%», «цена 690 ₽».</p>' : '');
  }
  function simSummary(m, sim) {
    return SIM.filter(function (s) { return sim[s.k] != null && sim[s.k] !== 0 && !(s.abs && sim[s.k] === s.base(m.base)); })
      .map(function (s) { return s.label.toLowerCase() + ' ' + sliderLabel(s, sim[s.k]); }).join(', ') || 'без изменений';
  }

  function tornadoHtml(m) {
    var b = m.base, sales = hasSales(b), cp = chanParams(b);
    var metric = function (r) { return sales && r.sales ? r.sales.profit : -r.unit; };
    var b0 = metric(calc(b));
    var F = [
      { label: 'Цены на сырьё ±20%', lo: { raw: 20 }, hi: { raw: -20 } },
      { label: 'Цены на упаковку ±20%', lo: { pack: 20 }, hi: { pack: -20 } },
      { label: 'Курс валют ±20%', lo: { fx: 20 }, hi: { fx: -20 } },
      { label: 'Производство ±20%', lo: { prod: 20 }, hi: { prod: -20 } },
      { label: 'Размер партии ×0,5 / ×2', lo: { batch: Math.max(1, n(b.batch) / 2) }, hi: { batch: n(b.batch) * 2 } }
    ];
    if (sales) F = F.concat([
      { label: 'Цена продажи ±10%', lo: { price: -10 }, hi: { price: 10 } },
      { label: 'ДРР ±5 п.п.', lo: { drr: cp.drr + 5 }, hi: { drr: Math.max(0, cp.drr - 5) } },
      { label: 'Выкуп ±10 п.п.', lo: { buyout: Math.max(30, cp.buyout - 10) }, hi: { buyout: Math.min(100, cp.buyout + 10) } },
      { label: 'Комиссия ±3 п.п.', lo: { commission: cp.commission + 3 }, hi: { commission: Math.max(0, cp.commission - 3) } }
    ]);
    var rows = F.map(function (f) {
      var lo = metric(calc(b, Object.assign(emptySim(), f.lo))) - b0, hi = metric(calc(b, Object.assign(emptySim(), f.hi))) - b0;
      return { label: f.label, lo: Math.min(lo, hi), hi: Math.max(lo, hi), range: Math.abs(hi - lo) };
    }).sort(function (a, c) { return c.range - a.range; });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(Math.abs(r.lo), Math.abs(r.hi)); }).concat([0.01]));
    var W = 520, L = 190, mid = L + (W - L) / 2, half = (W - L) / 2 - 56, RH = 30;
    var svg = '<svg class="cf-tornado" viewBox="0 0 ' + W + ' ' + (rows.length * RH + 34) + '" role="img" aria-label="Чувствительность к факторам">' +
      '<line x1="' + mid + '" x2="' + mid + '" y1="6" y2="' + (rows.length * RH + 10) + '" class="cf-axis"/>' +
      rows.map(function (r, i) {
        var y = 10 + i * RH, wl = Math.abs(r.lo) / max * half, wr = Math.abs(r.hi) / max * half;
        return '<g class="cf-trow" data-tip="' + esc(r.label + ': ' + (r.lo < 0 ? '−' : '+') + rub(Math.abs(r.lo)) + ' … +' + rub(Math.abs(r.hi))) + '">' +
          '<rect x="0" y="' + y + '" width="' + W + '" height="' + RH + '" class="cf-hit"/>' +
          '<text x="' + (L - 10) + '" y="' + (y + RH / 2) + '" class="cf-tlabel" text-anchor="end" dominant-baseline="middle">' + esc(r.label) + '</text>' +
          (wl > 0.5 ? '<rect x="' + (mid - wl) + '" y="' + (y + 6) + '" width="' + wl + '" height="' + (RH - 12) + '" rx="4" class="cf-worse"/>' : '') +
          (wr > 0.5 ? '<rect x="' + mid + '" y="' + (y + 6) + '" width="' + wr + '" height="' + (RH - 12) + '" rx="4" class="cf-better"/>' : '') +
          '<text x="' + (mid - wl - 6) + '" y="' + (y + RH / 2) + '" class="cf-tval" text-anchor="end" dominant-baseline="middle">' + (r.lo < -0.005 ? '−' + rub(Math.abs(r.lo), 0) : '') + '</text>' +
          '<text x="' + (mid + wr + 6) + '" y="' + (y + RH / 2) + '" class="cf-tval" dominant-baseline="middle">' + (r.hi > 0.005 ? '+' + rub(r.hi, 0) : '') + '</text></g>';
      }).join('') +
      '<text x="' + (mid - 8) + '" y="' + (rows.length * RH + 28) + '" class="cf-tlegend" text-anchor="end">← ухудшает</text><text x="' + (mid + 8) + '" y="' + (rows.length * RH + 28) + '" class="cf-tlegend">улучшает →</text></svg>';
    var where = b.salesMode === 'mp' && MP_BY[b.simChannel] ? ' · ' + MP_BY[b.simChannel].label : '';
    return '<h2>Что сильнее всего влияет на ' + (sales ? 'прибыль с продажи' + esc(where) : 'себестоимость') + '</h2><p class="small muted" style="margin:4px 0 10px">Сверху — главные рычаги. Длина полосы — на сколько ₽ изменится результат при указанном изменении фактора.</p>' + svg;
  }

  function batchCurveHtml(m) {
    var sizes = [300, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000];
    var cur = Math.round(simVal(m, SIM[0]));
    if (sizes.indexOf(cur) < 0) { sizes.push(cur); sizes.sort(function (a, b) { return a - b; }); }
    var simNoBatch = Object.assign({}, m.sim, { batch: null });
    var pts = sizes.map(function (s) { var r = calc(m.base, Object.assign({}, simNoBatch, { batch: s })); return { s: s, v: r.unit }; });
    var W = 520, H = 220, pl = 64, pr = 16, pt = 14, pb = 34;
    var minV = Math.min.apply(null, pts.map(function (p) { return p.v; })), maxV = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var lx = function (s) { return pl + (Math.log(s) - Math.log(sizes[0])) / (Math.log(sizes[sizes.length - 1]) - Math.log(sizes[0])) * (W - pl - pr); };
    var ly = function (v) { return pt + (1 - (v - minV * 0.95) / ((maxV - minV * 0.95) || 1)) * (H - pt - pb); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + lx(p.s).toFixed(1) + ' ' + ly(p.v).toFixed(1); }).join(' ');
    var cp = pts.filter(function (p) { return p.s === cur; })[0];
    var svg = '<svg class="cf-curve" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Себестоимость единицы в зависимости от размера партии">' +
      [minV, (minV + maxV) / 2, maxV].map(function (v) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ly(v) + '" y2="' + ly(v) + '" class="cf-grid"/><text x="' + (pl - 8) + '" y="' + ly(v) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">' + rub(v, 0) + '</text>'; }).join('') +
      [300, 1000, 3000, 10000, 30000].map(function (s) { return '<text x="' + lx(s) + '" y="' + (H - 12) + '" class="cf-ax" text-anchor="middle">' + (s >= 1000 ? (s / 1000) + ' тыс.' : s) + '</text>'; }).join('') +
      '<path d="' + d + '" class="cf-line"/>' +
      pts.map(function (p) { return '<circle cx="' + lx(p.s) + '" cy="' + ly(p.v) + '" r="12" class="cf-hit" data-tip="' + esc(p.s.toLocaleString('ru-RU') + ' шт. → ' + rub(p.v)) + '"/>'; }).join('') +
      (cp ? '<circle cx="' + lx(cp.s) + '" cy="' + ly(cp.v) + '" r="5" class="cf-dot2"/><text x="' + lx(cp.s) + '" y="' + (ly(cp.v) - 12) + '" class="cf-dotlabel" text-anchor="middle">' + rub(cp.v) + '</text>' : '') + '</svg>';
    var first = pts[0], last = pts[pts.length - 1];
    return '<h2>Себестоимость и размер партии</h2><p class="small muted" style="margin:4px 0 10px">Наладка, доставка партии' + (m.base.includeOneOff ? ' и амортизация запуска' : '') + ' делятся на тираж: от ' + rub(first.v) + ' при ' + first.s + ' шт. до ' + rub(last.v) + ' при ' + last.s.toLocaleString('ru-RU') + ' шт. Точка — текущая партия.</p>' + svg +
      '<details class="small"><summary style="cursor:pointer">Таблицей</summary><div class="table-wrap"><table class="table"><thead><tr><th scope="col">Партия</th><th scope="col">Себестоимость</th></tr></thead><tbody>' + pts.map(function (p) { return '<tr><td class="num">' + units(p.s) + '</td><td class="num">' + rub(p.v) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  }

  // ---------- page ----------
  BM.views.cost = function (id) {
    var m = current(id), list = models(), tab = BM.ui.costTab;
    BM.ui.costModel = m.id;
    var projOpts = '<option value="">Без проекта</option>' + BM.state.projects.map(function (p) { return '<option value="' + p.id + '"' + (p.id === m.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
    return '<div class="page cf-page">' +
      '<div class="page-head"><div><span class="eyebrow">' + icon('calc', 'sm') + 'Себестоимость</span><h1 style="margin-top:8px">Себестоимость <span class="serif">и юнит-экономика</span></h1>' +
        '<p>Реальная стоимость продукта от рецептуры до полки, прибыль на каждой площадке и сценарии: курс, партия, цена, реклама.</p></div></div>' +
      '<div class="card cf-toolbar"><div class="field" style="flex:1 1 220px"><label for="cf-model">Расчёт</label><select class="select" id="cf-model">' + list.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="flex:1 1 200px"><label for="cf-name">Название</label><input class="input" id="cf-name" data-cf-meta="name" value="' + esc(m.name) + '"></div>' +
        '<div class="field" style="flex:1 1 180px"><label for="cf-project">Проект</label><select class="select" id="cf-project" data-cf-meta="projectId">' + projOpts + '</select></div>' +
        '<div class="row" style="align-self:flex-end"><button type="button" class="btn" data-cf-new>' + icon('plus', 'sm') + 'Новый</button><button type="button" class="btn ghost" data-cf-dup>' + icon('copy', 'sm') + 'Копия</button><button type="button" class="icon-btn bordered" data-cf-delmodel aria-label="Удалить расчёт">' + icon('trash', 'sm') + '</button></div></div>' +
      '<nav class="tabs" aria-label="Режим"><button type="button" class="tab' + (tab === 'real' ? ' active' : '') + '" data-cf-tab="real"' + (tab === 'real' ? ' aria-current="page"' : '') + '>' + icon('calc', 'sm') + 'Реальные цифры</button><button type="button" class="tab' + (tab === 'sim' ? ' active' : '') + '" data-cf-tab="sim"' + (tab === 'sim' ? ' aria-current="page"' : '') + '>' + icon('sparkle', 'sm') + 'Симуляции</button></nav>' +
      (tab === 'real' ? '<div class="cf-grid">' + inputsHtml(m) + '<div class="cf-results" id="cf-results">' + resultsHtml(m) + '</div></div>' : simHtml(m)) +
      '<div class="cf-tip" id="cf-tip" role="tooltip" hidden></div></div>';
  };

  // ---------- live updates ----------
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function updateSums(m) {
    var r = calc(m.base);
    var set = function (k, v) { var el = document.querySelector('[data-cf-sum="' + k + '"]'); if (el) el.textContent = v; };
    set('batch', units(r.batch)); set('raw', rub(r.raw) + '/шт.'); set('pack', rub(r.pack) + '/шт.'); set('prod', rub(r.prod) + '/шт.');
    set('once', rub(r.oneOffTotal, 0) + (r.include ? ' → ' + rub(r.oneOffUnit) + '/шт.' : ''));
    set('mark', rub(r.marking + r.logistics) + '/шт.');
    set('sales', m.base.salesMode === 'mp' ? (r.best ? 'лучше: ' + r.best.label : 'нет площадок') : (r.sales ? 'маржа ' + pct(r.sales.margin) : 'выключено'));
    var ps = document.querySelector('[data-cf-pctsum]');
    if (ps) { var ok = Math.abs(r.pctSum - 100) < 0.05; ps.innerHTML = 'Сумма долей: <b class="num" style="color:' + (ok ? 'var(--ok)' : 'var(--danger)') + '">' + pct(r.pctSum, 2) + '</b>' + (ok ? '' : ' — должна быть 100%'); }
  }
  function refreshResults(m) { var host = document.getElementById('cf-results'); if (host) host.innerHTML = resultsHtml(m); updateSums(m); }
  function refreshSim(m) {
    var base = calc(m.base), r = calc(m.base, m.sim);
    var a = document.getElementById('cf-sim-summary'); if (a) a.innerHTML = '<h2 style="margin-bottom:12px">Результат сценария</h2>' + summaryHtml(r, base);
    var t = document.getElementById('cf-tornado'); if (t) t.innerHTML = tornadoHtml(m);
    var c = document.getElementById('cf-batchcurve'); if (c) c.innerHTML = batchCurveHtml(m);
  }
  var save = BM.debounce(function (m) { m.updatedAt = Date.now(); BM.persist(); }, 500);

  BM.costMount = function () {
    var page = document.querySelector('.cf-page');
    if (!page) return;
    var m = current(BM.ui.costModel);
    if (BM.ui.costTab === 'real') updateSums(m); else refreshSim(m);
    var tip = document.getElementById('cf-tip');
    page.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.cf) {
        if (t.type === 'checkbox') return;
        setPath(m.base, t.dataset.cf, t.value);
        refreshResults(m); save(m); return;
      }
      if (t.dataset.cfMeta === 'name') { m.name = t.value; var o = document.querySelector('#cf-model option[value="' + m.id + '"]'); if (o) o.textContent = t.value || 'Без названия'; save(m); return; }
      if (t.matches('[data-cf-whereq]')) {
        BM.ui.cfWhereQ = t.value;
        var q = t.value.toLowerCase(), cat = BM.ui.cfWhereCat || '';
        document.getElementById('cf-where-list').innerHTML = whereItems(WHERE.filter(function (w) { return (!cat || w[1] === cat) && (!q || (w[0] + ' ' + w[2]).toLowerCase().indexOf(q) > -1); }));
        return;
      }
      if (t.dataset.sim) {
        var s = SIM.filter(function (x) { return x.k === t.dataset.sim; })[0], val = +t.value;
        m.sim[s.k] = val;
        var out = document.getElementById('sim-o-' + s.k); if (out) out.textContent = sliderLabel(s, val);
        refreshSim(m); save(m);
      }
    });
    page.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'cf-model') { BM.go('#/cost/' + t.value); return; }
      if (t.dataset.cfMeta === 'projectId') { m.projectId = t.value || null; save(m); return; }
      if (t.matches('[data-cf-simch]')) { m.base.simChannel = t.value; m.sim.drr = m.sim.buyout = m.sim.commission = null; save(m); BM.render(); return; }
      if (t.type === 'checkbox' && t.dataset.cf) { setPath(m.base, t.dataset.cf, t.checked); save(m); BM.render(); return; }
      if (t.tagName === 'SELECT' && t.dataset.cf) { setPath(m.base, t.dataset.cf, t.value); refreshResults(m); save(m); }
    });
    page.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-cf-toggle]'))) {
        var id = t.dataset.cfToggle, sec = t.closest('.cf-sec'), open = !sec.classList.contains('open');
        sec.classList.toggle('open', open); t.setAttribute('aria-expanded', open); BM.ui['cs_' + id] = open; return;
      }
      if ((t = e.target.closest('[data-cf-salesmode]'))) { m.base.salesMode = t.dataset.cfSalesmode; if (m.base.salesMode === 'mp' && !m.base.mp[m.base.simChannel].enabled) { var f = MPS.filter(function (x) { return m.base.mp[x.id].enabled; })[0]; if (f) m.base.simChannel = f.id; } save(m); BM.render(); return; }
      if ((t = e.target.closest('[data-cf-wcat]'))) { BM.ui.cfWhereCat = BM.ui.cfWhereCat === t.dataset.cfWcat ? '' : t.dataset.cfWcat; BM.ui.cs_where = true; BM.render(); return; }
      if ((t = e.target.closest('[data-cf-tab]'))) { BM.ui.costTab = t.dataset.cfTab; BM.render(); return; }
      if ((t = e.target.closest('[data-cf-add]'))) {
        var k = t.dataset.cfAdd;
        m.base[k].push(k === 'ingredients' ? { name: 'Новый компонент', pct: 0, price: 0, cur: 'RUB', loss: 2 } : k === 'packaging' ? { name: 'Новый компонент', price: 0, cur: 'RUB', scrap: 1 } : { name: 'Новая статья', amount: 0, batches: 1 });
        save(m); BM.render(); return;
      }
      if ((t = e.target.closest('[data-cf-del]'))) { m.base[t.dataset.cfDel].splice(+t.dataset.i, 1); save(m); BM.render(); return; }
      if (e.target.closest('[data-cf-new]')) { var nm = defaultModel('Новый продукт'); models().push(nm); BM.persist(); BM.go('#/cost/' + nm.id); return; }
      if (e.target.closest('[data-cf-dup]')) { var cp = JSON.parse(JSON.stringify(m)); cp.id = BM.uid(); cp.name = m.name + ' (копия)'; models().push(cp); BM.persist(); BM.go('#/cost/' + cp.id); return; }
      if (e.target.closest('[data-cf-delmodel]')) {
        BM.confirm('Удалить расчёт «' + m.name + '»?', 'Все цифры и сценарии этого расчёта будут удалены.', 'Удалить', function () {
          BM.state.costModels = models().filter(function (x) { return x.id !== m.id; }); BM.persist(); BM.go('#/cost');
        });
        return;
      }
      if (e.target.closest('[data-cf-simreset]')) { m.sim = emptySim(); save(m); BM.render(); return; }
      if (e.target.closest('[data-cf-savesc]')) {
        BM.openModal({ title: 'Сохранить сценарий', submit: 'Сохранить', body: '<div class="field"><label for="f-scname">Название</label><input class="input" id="f-scname" name="name" required value="' + esc(simSummary(m, m.sim)) + '"></div>',
          onSubmit: function (d) { m.scenarios.push({ id: BM.uid(), name: d.name, sim: JSON.parse(JSON.stringify(m.sim)) }); save(m); document.getElementById('cf-scenarios').innerHTML = scenariosTable(m); BM.toast('Сценарий сохранён'); } });
        return;
      }
      if ((t = e.target.closest('[data-cf-loadsc]'))) { var sc = m.scenarios.filter(function (x) { return x.id === t.dataset.cfLoadsc; })[0]; if (sc) { m.sim = Object.assign(emptySim(), JSON.parse(JSON.stringify(sc.sim))); save(m); BM.render(); } return; }
      if ((t = e.target.closest('[data-cf-delsc]'))) { m.scenarios = m.scenarios.filter(function (x) { return x.id !== t.dataset.cfDelsc; }); save(m); document.getElementById('cf-scenarios').innerHTML = scenariosTable(m); return; }
      if (e.target.closest('[data-cf-apply]')) {
        BM.confirm('Сделать сценарий реальными цифрами?', 'Значения ползунков перенесутся в исходные данные расчёта: ' + simSummary(m, m.sim) + '.', 'Применить', function () {
          var b = m.base, s = m.sim, k = function (v) { return 1 + n(v) / 100; };
          var target = b.salesMode === 'mp' ? b.mp[b.simChannel] : null;
          if (s.batch != null) b.batch = Math.round(s.batch);
          if (s.fx) ['USD', 'EUR', 'CNY'].forEach(function (c) { b.rates[c] = +(n(b.rates[c]) * k(s.fx)).toFixed(2); });
          if (s.raw) b.ingredients.forEach(function (r) { r.price = +(n(r.price) * k(s.raw)).toFixed(2); });
          if (s.pack) b.packaging.forEach(function (r) { r.price = +(n(r.price) * k(s.pack)).toFixed(2); });
          if (s.prod) { b.production.fillPerUnit = +(n(b.production.fillPerUnit) * k(s.prod)).toFixed(2); b.production.laborPerUnit = +(n(b.production.laborPerUnit) * k(s.prod)).toFixed(2); }
          if (target) {
            if (s.price) target.price = Math.round(n(target.price) * k(s.price));
            if (s.drr != null) target.drrPct = s.drr; if (s.buyout != null) target.buyoutPct = s.buyout; if (s.commission != null) target.commissionPct = s.commission;
          } else {
            if (s.price) b.sales.price = Math.round(n(b.sales.price) * k(s.price));
            if (s.drr != null) b.sales.drrPct = s.drr; if (s.buyout != null) b.sales.buyoutPct = s.buyout; if (s.commission != null) b.sales.commissionPct = s.commission;
          }
          m.sim = emptySim(); BM.ui.costTab = 'real'; save(m); BM.render(); BM.toast('Сценарий перенесён в реальные цифры');
        });
        var btn = document.querySelector('#modal button[type=submit]'); if (btn) { btn.classList.add('primary'); btn.classList.remove('danger'); }
      }
    });
    page.addEventListener('pointerover', function (e) {
      var el = e.target.closest('[data-tip]');
      if (!el) { tip.hidden = true; return; }
      tip.textContent = el.getAttribute('data-tip'); tip.hidden = false;
    });
    page.addEventListener('pointermove', function (e) {
      if (tip.hidden) return;
      var x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14), y = e.clientY - tip.offsetHeight - 12;
      tip.style.left = Math.max(8, x) + 'px'; tip.style.top = (y < 8 ? e.clientY + 18 : y) + 'px';
    });
    page.addEventListener('pointerleave', function () { tip.hidden = true; });
  };
})();
