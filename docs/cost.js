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

  // ---------- product development stages ----------
  var STAGES = [
    { id: 'brand', label: 'Концепция и бренд', hint: 'Нейминг, бренд-платформа, логотип, товарный знак', weeks: 3 },
    { id: 'formula', label: 'Рецептура и образцы', hint: 'Формула, тестовые образцы, проверка стабильности', weeks: 6 },
    { id: 'design', label: 'Дизайн и упаковка', hint: 'Дизайн коробки и тубы, клише, пробная печать', weeks: 4 },
    { id: 'cert', label: 'Сертификация', hint: 'Декларация соответствия, испытания, регистрация в Честном знаке', weeks: 4 },
    { id: 'purchase', label: 'Закупка сырья и тары', hint: 'Оплата поставщикам, доставка компонентов на производство', weeks: 3 },
    { id: 'production', label: 'Производство партии', hint: 'Наладка линии, розлив, контроль качества, брак', weeks: 2 },
    { id: 'logistics', label: 'Маркировка и доставка на склад', hint: 'Нанесение кодов, доставка партии, приёмка на складе площадки', weeks: 2 },
    { id: 'launch', label: 'Запуск продаж', hint: 'Контент карточки, первые отзывы, старт продвижения', weeks: 4 }
  ];
  var ONE_OFF_STAGES = ['brand', 'formula', 'design', 'cert'];
  function guessStage(name) {
    var s = String(name || '').toLowerCase();
    if (/рецеп|образц|формул|стабил/.test(s)) return 'formula';
    if (/деклар|сертиф|испыт|лаборат|честн/.test(s)) return 'cert';
    if (/дизайн|клише|пресс|штамп|печат|упаков|форм/.test(s)) return 'design';
    return 'brand';
  }
  function flowDefaults() { var w = {}; STAGES.forEach(function (s) { w[s.id] = s.weeks; }); return { weeks: w, content: 45000, launchBudget: 60000 }; }

  // ---------- import from China ----------
  var SHIP = [
    { id: 'auto', label: 'Авто', rate: 280, days: 25 },
    { id: 'rail', label: 'Ж/д', rate: 200, days: 40 },
    { id: 'sea', label: 'Море', rate: 130, days: 60 },
    { id: 'air', label: 'Авиа', rate: 750, days: 10 }
  ];
  // Customs processing fee (₽) by customs value — guideline scale from 2025, verify with the broker.
  var CUSTOMS_FEE = [[200000, 1231], [450000, 2462], [1200000, 4924], [2700000, 13541], [4200000, 18465], [5500000, 21344], [10000000, 49240], [Infinity, 73860]];
  function customsFeeAuto(v) { for (var i = 0; i < CUSTOMS_FEE.length; i++) if (v <= CUSTOMS_FEE[i][0]) return CUSTOMS_FEE[i][1]; return 0; }
  function impDefaults() {
    var rates = {}, days = {};
    SHIP.forEach(function (s) { rates[s.id] = s.rate; days[s.id] = s.days; });
    return {
      apply: false, mode: 'white', method: 'auto', rates: rates, days: days, cargoRate: 450, cargoDays: 25,
      agentPct: 3, insurancePct: 0.5, vatPct: 22, vatDeductible: false, customsFee: '', broker: 25000,
      qc: 12000, domestic: 15000, depositPct: 30, prodDays: 20,
      items: [
        { on: true, name: 'Туба 50 мл с печатью', link: 'packaging.0', price: 0.55, cur: 'CNY', unit: 'шт', per: 1, weight: 10, duty: 6.5 },
        { on: true, name: 'Крышка', link: 'packaging.1', price: 0.1, cur: 'CNY', unit: 'шт', per: 1, weight: 3, duty: 6.5 },
        { on: false, name: 'Гиалуроновая кислота', link: 'ingredients.2', price: 520, cur: 'CNY', unit: 'кг', per: 0.5, weight: 0, duty: 5 }
      ]
    };
  }

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
          { name: 'Нейминг и логотип', amount: 50000, batches: 5, stage: 'brand' },
          { name: 'Рецептура и тестовые образцы', amount: 40000, batches: 5, stage: 'formula' },
          { name: 'Дизайн упаковки', amount: 120000, batches: 5, stage: 'design' },
          { name: 'Клише, формы, пробы', amount: 30000, batches: 5, stage: 'design' },
          { name: 'Декларация и испытания', amount: 60000, batches: 3, stage: 'cert' }
        ],
        marking: { codePerUnit: 0.6, applyPerUnit: 1.2 },
        logistics: { inboundPerBatch: 18000, fulfilPerUnit: 8 },
        salesMode: 'simple',
        sales: { enabled: true, price: 590, commissionPct: 17, mpLogistics: 55, storagePerUnit: 3, drrPct: 12, buyoutPct: 85, returnCost: 50, taxPct: 6 },
        mp: mpDefaults(), simChannel: 'wb',
        tax: { mode: 'income', rate: 6 },
        marketing: { monthlyBudget: 0, monthlyUnits: 1000 },
        flow: flowDefaults(), imp: impDefaults()
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
    b.flow = Object.assign(flowDefaults(), b.flow || {}); b.flow.weeks = Object.assign(flowDefaults().weeks, b.flow.weeks || {});
    b.imp = Object.assign(impDefaults(), b.imp || {}); b.imp.rates = Object.assign(impDefaults().rates, b.imp.rates || {}); b.imp.days = Object.assign(impDefaults().days, b.imp.days || {});
    b.oneOff.forEach(function (o) { if (!o.stage) o.stage = guessStage(o.name); });
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

  function importCalc(base, batch, fxK) {
    var im = base.imp, white = im.mode !== 'cargo';
    var rt = function (cur) { return cur === 'RUB' || !cur ? 1 : n(base.rates[cur]) * fxK; };
    var fr = white ? n(im.rates[im.method]) : n(im.cargoRate);
    var rows = im.items.filter(function (i) { return i.on; }).map(function (i) {
      var byKg = i.unit === 'кг';
      var qty = byKg ? n(i.per) / 1000 * batch : n(i.per) * batch;
      var kg = byKg ? qty * 1.1 : qty * n(i.weight) / 1000;
      var goods = qty * n(i.price) * rt(i.cur);
      var freight = kg * fr, ins = goods * n(im.insurancePct) / 100, cv = goods + freight + ins;
      var duty = white ? cv * n(i.duty) / 100 : 0;
      return { name: i.name, link: i.link || '', unit: i.unit, qty: qty, kg: kg, goods: goods, agent: goods * n(im.agentPct) / 100, freight: freight, ins: ins, cv: cv, duty: duty, vat: white ? (cv + duty) * n(im.vatPct) / 100 : 0 };
    });
    var T = function (k) { return rows.reduce(function (a, x) { return a + x[k]; }, 0); };
    var cvT = T('cv'), goodsT = T('goods');
    var autoFee = customsFeeAuto(cvT);
    var fee = white ? (im.customsFee === '' || im.customsFee == null ? autoFee : n(im.customsFee)) : 0;
    var fixed = fee + (white ? n(im.broker) : 0) + n(im.qc) + n(im.domestic);
    rows.forEach(function (x) {
      x.fixed = goodsT ? fixed * x.goods / goodsT : (rows.length ? fixed / rows.length : 0);
      x.vatCost = im.vatDeductible ? 0 : x.vat;
      x.total = x.goods + x.agent + x.freight + x.ins + x.duty + x.vatCost + x.fixed;
      x.perProduct = x.total / batch;
    });
    var t = { goods: goodsT, agent: T('agent'), freight: T('freight'), ins: T('ins'), duty: T('duty'), vat: T('vat'), fixed: fixed, kg: T('kg'), cv: cvT };
    t.cost = T('total');
    t.cash = t.goods + t.agent + t.freight + t.ins + t.duty + t.vat + fixed;
    var shipDays = white ? n(im.days[im.method]) : n(im.cargoDays);
    return { rows: rows, t: t, white: white, fee: fee, autoFee: autoFee, prodDays: n(im.prodDays), shipDays: shipDays, days: n(im.prodDays) + shipDays,
      deposit: goodsT * n(im.depositPct) / 100 };
  }

  function calc(base, sim) {
    sim = sim || emptySim();
    var fxK = 1 + n(sim.fx) / 100, rawK = 1 + n(sim.raw) / 100, packK = 1 + n(sim.pack) / 100, prodK = 1 + n(sim.prod) / 100;
    var batch = Math.max(1, sim.batch != null ? sim.batch : n(base.batch));
    var grams = n(base.unitVolume) * (base.unit === 'г' ? 1 : (n(base.density) || 1));
    var rt = function (cur) { return cur === 'RUB' || !cur ? 1 : n(base.rates[cur]) * fxK; };
    var ingRows = base.ingredients.map(function (r) { return { name: r.name, cost: grams * n(r.pct) / 100 * n(r.price) * rt(r.cur) * rawK / 1000 * (1 + n(r.loss) / 100) }; });
    var pctSum = base.ingredients.reduce(function (a, r) { return a + n(r.pct); }, 0);
    var packRows = base.packaging.map(function (r) { return { name: r.name, cost: n(r.price) * rt(r.cur) * packK * (1 + n(r.scrap) / 100) }; });
    var prodVar = (n(base.production.fillPerUnit) + n(base.production.laborPerUnit)) * prodK, setup = n(base.production.setupPerBatch);
    var sumCost = function (rows) { return rows.reduce(function (a, r) { return a + r.cost; }, 0); };
    var ruRaw = sumCost(ingRows), ruPack = sumCost(packRows), ruProd = prodVar + setup / batch;
    // Import from China: landed cost per product replaces the linked rows (or the whole product).
    var imp = base.imp ? importCalc(base, batch, fxK) : null, useImp = !!(imp && base.imp.apply && imp.rows.length), finished = 0;
    if (imp) imp.rows.forEach(function (x) {
      var t = x.link.split('.'), src = t[0] === 'ingredients' ? ingRows : t[0] === 'packaging' ? packRows : null;
      x.ru = x.link === 'finished' ? ruRaw + ruPack + ruProd : (src && src[+t[1]] ? src[+t[1]].cost : null);
    });
    if (useImp) {
      var fin = imp.rows.filter(function (x) { return x.link === 'finished'; });
      if (fin.length) {
        finished = fin.reduce(function (a, x) { return a + x.perProduct; }, 0);
        ingRows = []; packRows = [{ name: 'Готовый продукт из Китая', cost: finished, imported: true }]; prodVar = 0; setup = 0;
      } else {
        var used = {};
        imp.rows.forEach(function (x) {
          var t = x.link.split('.'), src = t[0] === 'ingredients' ? ingRows : t[0] === 'packaging' ? packRows : null, row = src && src[+t[1]];
          if (row) { if (!used[x.link]) { row.cost = 0; row.name += ' (Китай)'; row.imported = true; used[x.link] = 1; } row.cost += x.perProduct; }
          else (x.unit === 'кг' ? ingRows : packRows).push({ name: x.name + ' (Китай)', cost: x.perProduct, imported: true });
        });
      }
    }
    var raw = sumCost(ingRows), pack = finished ? 0 : sumCost(packRows);
    var prod = prodVar + setup / batch;
    var oneOffTotal = base.oneOff.reduce(function (a, r) { return a + n(r.amount); }, 0);
    var oneOffAmort = base.oneOff.reduce(function (a, r) { return a + n(r.amount) / (Math.max(1, n(r.batches)) * batch); }, 0);
    var marking = n(base.marking.codePerUnit) + n(base.marking.applyPerUnit);
    var inbound = n(base.logistics.inboundPerBatch);
    var logistics = inbound / batch + n(base.logistics.fulfilPerUnit);
    var defect = clampPct(n(base.defectPct)), keep = 1 - defect / 100;
    var subtotalVar = raw + pack + finished + prod + marking + logistics;
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
    if (finished) parts = [{ key: 'fin', label: 'Готовый продукт из Китая', v: finished }].concat(parts.filter(function (p) { return p.v > 0.004 || p.key === 'defect'; }));
    var fulfil = n(base.logistics.fulfilPerUnit);
    var variableUnit = raw + pack + finished + prodVar + marking + fulfil;
    var vatRefund = useImp && base.imp.vatDeductible ? imp.t.vat : 0;
    var cashNext = variableUnit * batch + setup + inbound + vatRefund;
    var cashFirst = cashNext + oneOffTotal;
    var good = batch * keep;
    var mk = base.marketing || { monthlyBudget: 0, monthlyUnits: 1 };
    var ctx = { unit: unit, good: good, cashFirst: cashFirst, oneOffTotal: oneOffTotal, tax: base.tax || { mode: 'income', rate: 6 }, mktPerUnit: n(mk.monthlyBudget) / Math.max(1, n(mk.monthlyUnits)) };
    var r = { batch: batch, grams: grams, raw: raw, pack: pack, prod: prod, marking: marking, logistics: logistics, defectCost: defectCost,
      unit: unit, unitVar: unitVar, unitFull: unitFull, oneOffTotal: oneOffTotal, oneOffUnit: oneOffUnit, include: include,
      cashFirst: cashFirst, cashNext: cashNext, good: good, parts: parts, ingRows: ingRows, packRows: packRows, pctSum: pctSum, sales: null, channels: [],
      imp: imp, useImp: useImp, finished: finished, vatRefund: vatRefund, ruUnitVar: (ruRaw + ruPack + ruProd + marking + logistics) / keep,
      prodVar: prodVar, setup: setup, fulfil: fulfil, inbound: inbound, oneOffAmort: oneOffAmort, keep: keep };
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
  BM.costDebug = function () { return { flowCalc: flowCalc, productAoa: productAoa, summaryAoa: summaryAoa, summarySel: summarySel, productData: productData }; };

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
  function stageSel(path, value) {
    return '<select class="select" data-cf="' + path + '" aria-label="Этап разработки">' + STAGES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === value ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('') + '</select>';
  }
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
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
      '<div class="cf-table once"><div class="cf-tr cf-th"><span>Статья</span><span>Сумма, ₽</span><span>На сколько партий</span><span>Этап</span><span></span></div>' +
      b.oneOff.map(function (r, i) {
        return '<div class="cf-tr">' + inp('oneOff.' + i + '.name', r.name, { num: false, label: 'Статья' }) + inp('oneOff.' + i + '.amount', r.amount, { label: 'Сумма' }) + inp('oneOff.' + i + '.batches', r.batches, { label: 'Партий' }) +
          stageSel('oneOff.' + i + '.stage', r.stage) +
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

  // ---------- development flow ----------
  function flowCalc(base) {
    var r = calc(base), f = base.flow, batch = r.batch, imp = r.useImp ? r.imp : null;
    var st = STAGES.map(function (s) { return { id: s.id, label: s.label, hint: s.hint, weeks: Math.max(0, n(f.weeks[s.id])), items: [], money: 0, unit: 0, auto: false }; });
    var by = {}; st.forEach(function (x) { by[x.id] = x; });
    var add = function (id, it) { var s = by[id]; s.items.push(it); s.money += it.money || 0; s.unit += it.unit || 0; };
    base.oneOff.forEach(function (o, i) {
      add(by[o.stage] ? o.stage : guessStage(o.name), { label: o.name, money: n(o.amount), unit: r.include ? n(o.amount) / (Math.max(1, n(o.batches)) * batch) : 0, cat: 'launch', path: 'oneOff.' + i + '.amount', val: o.amount });
    });
    if (imp) {
      var local = (r.raw + r.pack + r.finished) * batch - imp.t.cost;
      if (local > 0.5) add('purchase', { label: 'Сырьё и тара у российских поставщиков', money: local, cat: 'cogs' });
      add('purchase', { label: r.finished ? 'Готовый продукт у фабрики в Китае' : 'Товар у поставщика в Китае', money: imp.t.goods, cat: 'cogs', note: 'Предоплата ' + pct(n(base.imp.depositPct), 0) + ' — ' + rub(imp.deposit, 0) + ', остаток перед отгрузкой' });
      add('purchase', { label: 'Комиссия платёжного агента', money: imp.t.agent, cat: 'cogs' });
      add('purchase', { label: 'Доставка и страховка', money: imp.t.freight + imp.t.ins, cat: 'cogs', note: Math.round(imp.t.kg).toLocaleString('ru-RU') + ' кг' });
      if (imp.white) {
        add('purchase', { label: 'Таможенная пошлина', money: imp.t.duty, cat: 'cogs' });
        add('purchase', { label: 'НДС при ввозе', money: imp.t.vat, cat: base.imp.vatDeductible ? 'tax' : 'cogs', note: base.imp.vatDeductible ? 'Вернётся вычетом — замороженные деньги' : 'На УСН без НДС становится частью себестоимости' });
      }
      add('purchase', { label: imp.white ? 'Брокер, таможенный сбор, проверка, доставка по России' : 'Проверка качества и доставка по России', money: imp.t.fixed, cat: 'cogs' });
      by.purchase.weeks = Math.ceil(imp.days / 7); by.purchase.auto = true;
      if (r.finished) { by.production.weeks = 0; by.production.auto = true; }
    } else {
      add('purchase', { label: 'Сырьё на партию', money: r.raw * batch, cat: 'cogs' });
      add('purchase', { label: 'Тара и упаковка на партию', money: r.pack * batch, cat: 'cogs' });
    }
    by.purchase.unit += r.raw + r.pack + r.finished;
    if (r.finished) add('production', { label: 'Производство в Китае — входит в закупку', money: 0, cat: 'cogs' });
    else {
      add('production', { label: 'Розлив, сборка, контроль', money: r.prodVar * batch, cat: 'cogs' });
      if (r.setup) add('production', { label: 'Наладка линии', money: r.setup, cat: 'cogs' });
    }
    add('production', { label: 'Брак — распределяется на годные', money: 0, unit: r.defectCost, cat: 'cogs' });
    by.production.unit += r.prod;
    add('logistics', { label: 'Коды Честного знака и нанесение', money: r.marking * batch, cat: 'cogs' });
    add('logistics', { label: 'Доставка партии до склада', money: r.inbound, cat: 'cogs' });
    add('logistics', { label: 'Фулфилмент и упаковка поставки', money: r.fulfil * batch, cat: 'cogs' });
    by.logistics.unit += r.marking + r.logistics;
    add('launch', { label: 'Контент карточки: фото, видео, инфографика', money: n(f.content), cat: 'marketing', path: 'flow.content', val: f.content });
    add('launch', { label: 'Стартовое продвижение: блогеры, отзывы', money: n(f.launchBudget), cat: 'marketing', path: 'flow.launchBudget', val: f.launchBudget });
    var w = 0, cum = 0, run = 0, cats = {};
    st.forEach(function (s) {
      s.start = w; w += s.weeks; s.end = w; cum += s.money; s.cum = cum; run += s.unit; s.running = run;
      s.items.forEach(function (it) { cats[it.cat] = (cats[it.cat] || 0) + (it.money || 0); });
    });
    return { r: r, st: st, by: by, weeks: w, total: cum, toSale: by.launch.start, beforeSale: by.launch.cum - by.launch.money, cats: cats };
  }
  function period(s) { return s.weeks ? 'нед. ' + (s.start + 1) + (s.weeks > 1 ? '–' + s.end : '') : 'без отдельного срока'; }
  function stageUnitHtml(s) {
    if (s.unit > 0.004) return 'В себестоимость единицы <b class="num">+' + rub(s.unit) + '</b>, итого <b class="num">' + rub(s.running) + '</b>';
    if (s.id === 'launch') return 'Маркетинг — в себестоимость продукта не входит';
    if (ONE_OFF_STAGES.indexOf(s.id) > -1) return 'Разовые затраты — в себестоимость единицы не входят';
    return '';
  }
  function flowStagesHtml(F) {
    return '<ol class="cf-flow">' + F.st.map(function (s, i) {
      return '<li class="cf-stage"><span class="cf-stage-num" aria-hidden="true">' + (i + 1) + '</span><div class="card cf-stage-body">' +
        '<div class="cf-stage-head"><div><h3>' + esc(s.label) + '</h3><small>' + esc(s.hint) + '</small></div><div class="cf-stage-money"><b class="num" data-fs-money="' + s.id + '">' + rub(s.money, 0) + '</b><small data-fs-period="' + s.id + '">' + period(s) + '</small></div></div>' +
        '<ul class="cf-stage-items">' + s.items.map(function (it) {
          return '<li><span class="cf-si-l"><i class="cf-dot" style="background:' + CATS[it.cat].color + '" title="' + esc(CATS[it.cat].label) + '"></i><span>' + esc(it.label) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span></span>' +
            (it.path ? '<span class="cf-unit cf-unit-sm">' + inp(it.path, it.val, { label: it.label }) + '<span>₽</span></span>' : '<b class="num">' + (it.money ? rub(it.money, 0) : '—') + '</b>') + '</li>';
        }).join('') + (ONE_OFF_STAGES.indexOf(s.id) > -1 ? '<li class="cf-si-add"><button type="button" class="btn sm ghost" data-cf-addstage="' + s.id + '">' + icon('plus', 'sm') + 'Статья</button></li>' : '') + '</ul>' +
        '<div class="cf-stage-foot"><label class="cf-weeks">Срок ' + '<input class="input num" data-cf="flow.weeks.' + s.id + '" value="' + esc(s.weeks) + '" inputmode="decimal" aria-label="Срок этапа «' + esc(s.label) + '» в неделях"' + (s.auto ? ' disabled' : '') + '> нед.' + (s.auto ? '<small>по срокам импорта</small>' : '') + '</label>' +
        '<span class="cf-stage-unit" data-fs-unit="' + s.id + '">' + stageUnitHtml(s) + '</span></div></div></li>';
    }).join('') + '</ol>';
  }
  function flowChart(F) {
    var W = 520, H = 230, pl = 60, pr = 16, pt = 16, pb = 34, tw = Math.max(1, F.weeks), max = Math.max(1, F.total);
    var x = function (w) { return pl + w / tw * (W - pl - pr); }, y = function (v) { return pt + (1 - v / max) * (H - pt - pb); };
    var d = 'M' + x(0) + ' ' + y(0), prev = 0;
    F.st.forEach(function (s) { d += ' L' + x(s.start).toFixed(1) + ' ' + y(prev).toFixed(1) + ' L' + x(s.start).toFixed(1) + ' ' + y(s.cum).toFixed(1); prev = s.cum; });
    d += ' L' + x(tw) + ' ' + y(prev);
    var area = d + ' L' + x(tw) + ' ' + y(0) + ' Z';
    var step = tw > 30 ? 8 : tw > 14 ? 4 : 2, ticks = [];
    for (var t = 0; t <= tw; t += step) ticks.push(t);
    var ls = x(F.toSale);
    return '<svg class="cf-curve" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Накопленные вложения по неделям разработки">' +
      [0, max / 2, max].map(function (v) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="cf-grid"/><text x="' + (pl - 8) + '" y="' + y(v) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">' + (v >= 1e6 ? (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн' : Math.round(v / 1000) + ' тыс.') + '</text>'; }).join('') +
      ticks.map(function (t) { return '<text x="' + x(t) + '" y="' + (H - 12) + '" class="cf-ax" text-anchor="middle">' + t + '</text>'; }).join('') +
      '<text x="' + (W - pr) + '" y="' + (H - 1) + '" class="cf-ax" text-anchor="end">недели</text>' +
      '<path d="' + area + '" class="cf-area"/><path d="' + d + '" class="cf-line"/>' +
      '<line x1="' + ls + '" x2="' + ls + '" y1="' + pt + '" y2="' + (H - pb) + '" class="cf-launch"/><text x="' + (ls - 6) + '" y="' + (pt + 10) + '" class="cf-tlegend" text-anchor="end">старт продаж</text>' +
      F.st.map(function (s, i) { return s.money > 0 ? '<circle cx="' + x(s.start) + '" cy="' + y(s.cum) + '" r="11" class="cf-hit" data-tip="' + esc((i + 1) + '. ' + s.label + ': +' + rub(s.money, 0) + ', всего ' + rub(s.cum, 0) + ' к неделе ' + (s.start + 1)) + '"/><circle cx="' + x(s.start) + '" cy="' + y(s.cum) + '" r="3.5" class="cf-dot2" pointer-events="none"/>' : ''; }).join('') + '</svg>';
  }
  var STAGE_TONE = { brand: 0.35, formula: 0.45, design: 0.55, cert: 0.65, purchase: 1, production: 0.75, logistics: 0.5 };
  function flowSideHtml(F) {
    var r = F.r, parts = F.st.filter(function (s) { return s.unit > 0.004; });
    var months = F.toSale / 4.345;
    return '<div class="card cf-summary"><div class="cf-kpis">' +
      '<div class="cf-kpi main"><small>До первой продажи</small><b class="num">' + F.toSale + ' нед.</b><span class="cf-sub">≈ ' + months.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' мес., если этапы идут друг за другом</span></div>' +
      '<div class="cf-kpi"><small>Вложено до старта продаж</small><b class="num">' + rub(F.beforeSale, 0) + '</b><span class="cf-sub">с запуском продаж ' + rub(F.total, 0) + '</span></div>' +
      '<div class="cf-kpi"><small>Себестоимость единицы</small><b class="num">' + rub(r.unit) + '</b><span class="cf-sub">' + (r.include ? 'с амортизацией запуска' : 'без разовых затрат') + '</span></div>' +
      '<div class="cf-kpi"><small>Партия</small><b class="num">' + units(r.batch) + '</b><span class="cf-sub">годных ' + units(Math.round(r.good)) + '</span></div>' +
      '</div><div class="cf-legend" style="margin-top:14px">' + ['launch', 'cogs', 'tax', 'marketing'].filter(function (k) { return F.cats[k] > 0; }).map(function (k) { return '<span><i class="cf-dot" style="background:' + CATS[k].color + '"></i>' + esc(CATS[k].label) + ': <b class="num">' + rub(F.cats[k], 0) + '</b></span>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>Деньги по ходу разработки</h3><p class="small muted" style="margin:4px 0 10px">Сколько вложено к каждой неделе. Ступенька — оплата этапа.</p>' + flowChart(F) + '</div>' +
      '<div class="card"><h3>Как складывается себестоимость единицы</h3><div class="cf-stack" role="img" aria-label="Себестоимость единицы по этапам">' + parts.map(function (s) {
        return '<i style="flex:' + s.unit.toFixed(3) + ';opacity:' + (STAGE_TONE[s.id] || 0.6) + '" data-tip="' + esc(s.label + ': ' + rub(s.unit)) + '"></i>';
      }).join('') + '</div><ul class="cf-bars" role="list" style="margin-top:12px">' + parts.map(function (s) {
        return '<li><span class="cf-bar-l"><i class="cf-dot" style="background:var(--c-data);opacity:' + (STAGE_TONE[s.id] || 0.6) + '"></i>' + esc(s.label) + '</span><span></span><span class="cf-bar-v num">+' + rub(s.unit) + '<small>' + pct(s.unit / r.unit * 100, 0) + '</small></span></li>';
      }).join('') + '</ul><div class="cf-bar-total"><span>Себестоимость на складе</span><b class="num">' + rub(r.unit) + '</b></div></div>';
  }
  function flowHtml(m) {
    var F = flowCalc(m.base);
    return '<p class="small muted cf-flow-intro">Те же цифры, что и в «Реальных цифрах», но в порядке разработки продукта: что и когда оплачивается, сколько денег вложено к каждому этапу и как с каждым шагом растёт себестоимость единицы. Сроки этапов можно менять; если этапы идут параллельно, уменьшите срок.</p>' +
      '<div class="cf-grid"><div>' + flowStagesHtml(F) + '</div><div class="cf-results" id="cf-flow-side">' + flowSideHtml(F) + '</div></div>';
  }
  function updateFlow(m) {
    var F = flowCalc(m.base);
    F.st.forEach(function (s) {
      var q = function (a) { return document.querySelector('[' + a + '="' + s.id + '"]'); };
      var a = q('data-fs-money'), b = q('data-fs-period'), c = q('data-fs-unit');
      if (a) a.textContent = rub(s.money, 0); if (b) b.textContent = period(s); if (c) c.innerHTML = stageUnitHtml(s);
    });
    var side = document.getElementById('cf-flow-side'); if (side) side.innerHTML = flowSideHtml(F);
  }

  // ---------- import page ----------
  function withImp(base, apply) { var b = JSON.parse(JSON.stringify(base)); b.imp.apply = apply; return b; }
  function importHtml(m) {
    var b = m.base, im = b.imp, white = im.mode !== 'cargo', I = importCalc(b, n(b.batch), 1);
    var seg = function (path, cur, opts, label) { return '<div class="sys-seg cf-seg" role="group" aria-label="' + esc(label) + '">' + opts.map(function (o) { return '<button type="button" data-cf-set="' + path + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; };
    var linkOpts = function (v) {
      var o = function (val, label) { return '<option value="' + val + '"' + (val === (v || '') ? ' selected' : '') + '>' + esc(label) + '</option>'; };
      return o('', 'Отдельная позиция — добавится к себестоимости') +
        '<optgroup label="Заменяет сырьё">' + b.ingredients.map(function (r, i) { return o('ingredients.' + i, r.name); }).join('') + '</optgroup>' +
        '<optgroup label="Заменяет упаковку">' + b.packaging.map(function (r, i) { return o('packaging.' + i, r.name); }).join('') + '</optgroup>' +
        o('finished', 'Готовый продукт целиком — контрактное производство');
    };
    var how = '<div class="field"><span class="cf-lbl">Схема ввоза</span>' + seg('imp.mode', im.mode, [['white', 'Белый импорт'], ['cargo', 'Карго']], 'Схема ввоза') + '</div>' +
      '<p class="small muted" style="margin:0 0 12px">' + (white ? 'Официальный ввоз по контракту: таможенная декларация, пошлина и НДС на таможне, документы для маркетплейса и Честного знака.' : 'Перевозчик берёт одну ставку за кг «под ключ», включая растаможку. Дешевле и проще, но документов о ввозе у вас не будет.') + '</p>' +
      (white ? '<div class="field"><span class="cf-lbl">Транспорт</span>' + seg('imp.method', im.method, SHIP.map(function (s) { return [s.id, s.label]; }), 'Транспорт') + '</div>' : '') +
      '<div class="form-grid three">' +
        (white ? field('imp.rates.' + im.method, 'Доставка до вашего склада', im.rates[im.method], '₽/кг', 'Ориентир, уточните у логиста') + field('imp.days.' + im.method, 'Срок доставки', im.days[im.method], 'дней')
          : field('imp.cargoRate', 'Ставка карго «под ключ»', im.cargoRate, '₽/кг', 'Доставка и растаможка одной ставкой') + field('imp.cargoDays', 'Срок доставки', im.cargoDays, 'дней')) +
        field('imp.prodDays', 'Производство у поставщика', im.prodDays, 'дней') +
        field('imp.depositPct', 'Предоплата поставщику', im.depositPct, '%', 'Обычно 30%, остаток перед отгрузкой') +
        field('imp.agentPct', 'Комиссия платёжного агента', im.agentPct, '%', 'Оплата в юанях через агента: обычно 2–5%') +
        field('imp.insurancePct', 'Страховка груза', im.insurancePct, '%') +
        field('rates.CNY', 'Курс CNY', b.rates.CNY, '₽') + field('rates.USD', 'Курс USD', b.rates.USD, '₽') + '</div>' +
      (white ? '<div class="form-grid three cf-common">' + field('imp.vatPct', 'НДС при ввозе', im.vatPct, '%', 'С 2026 года — 22%') +
        '<div class="field"><label for="cf-imp-fee">Таможенный сбор</label><div class="cf-unit"><input class="input num" id="cf-imp-fee" data-cf="imp.customsFee" value="' + esc(im.customsFee == null ? '' : im.customsFee) + '" placeholder="авто: ' + rub(I.autoFee, 0) + '" inputmode="decimal" autocomplete="off"><span>₽</span></div><span class="hint">Пусто — по шкале от таможенной стоимости</span></div>' +
        field('imp.broker', 'Брокер и декларация', im.broker, '₽') + '</div>' +
        '<label class="cf-switch"><input type="checkbox" data-cf="imp.vatDeductible"' + (im.vatDeductible ? ' checked' : '') + '><span>Принимаю НДС к вычету (ОСНО или УСН с НДС)</span></label>' : '') +
      '<div class="form-grid two">' + field('imp.qc', 'Проверка качества, инспекция', im.qc, '₽/партия') + field('imp.domestic', 'Доставка по России до производства', im.domestic, '₽/партия') + '</div>';
    var items = '<div class="cf-imp-items">' + im.items.map(function (it, i) {
      var p = 'imp.items.' + i + '.', kg = it.unit === 'кг';
      return '<div class="cf-imp-item' + (it.on ? '' : ' off') + '"><div class="cf-imp-top"><input type="checkbox" class="cf-chk" data-cf="' + p + 'on"' + (it.on ? ' checked' : '') + ' aria-label="Учитывать позицию">' + inp(p + 'name', it.name, { num: false, label: 'Позиция' }) +
        '<button type="button" class="icon-btn sm" data-cf-del="imp.items" data-i="' + i + '" aria-label="Удалить позицию">' + icon('x', 'sm') + '</button></div>' +
        '<div class="form-grid three"><div class="field cf-span2"><label for="' + idOf(p + 'link') + '">Что заменяет</label><select class="select" id="' + idOf(p + 'link') + '" data-cf="' + p + 'link" data-cf-rerender>' + linkOpts(it.link) + '</select></div>' +
        '<div class="field"><label for="' + idOf(p + 'unit') + '">Закупка в</label><select class="select" id="' + idOf(p + 'unit') + '" data-cf="' + p + 'unit" data-cf-rerender><option value="шт"' + (kg ? '' : ' selected') + '>штуках</option><option value="кг"' + (kg ? ' selected' : '') + '>килограммах</option></select></div>' +
        '<div class="field"><label for="' + idOf(p + 'price') + '">Цена у поставщика</label><div class="cf-unit">' + inp(p + 'price', it.price) + curSel(p + 'cur', it.cur, 'Валюта') + '</div><span class="hint">за ' + (kg ? 'кг' : 'шт.') + ' на условиях EXW/FOB</span></div>' +
        field(p + 'per', kg ? 'Расход на один продукт' : 'Штук на один продукт', it.per, kg ? 'г' : 'шт.') +
        (kg ? '' : field(p + 'weight', 'Вес одной штуки', it.weight, 'г', 'С упаковкой поставщика')) +
        (white ? field(p + 'duty', 'Пошлина', it.duty, '%', 'Зависит от кода ТН ВЭД') : '') + '</div></div>';
    }).join('') + '</div><div class="row cf-row-actions"><button type="button" class="btn sm soft" data-cf-add="imp.items">' + icon('plus', 'sm') + 'Позиция из Китая</button></div>';
    return '<p class="small muted cf-flow-intro">Посчитайте, сколько на самом деле стоят сырьё, тара или готовый продукт из Китая с доставкой, пошлиной, НДС и комиссиями, и сравните с российскими поставщиками. Значения по умолчанию — грубые ориентиры.</p>' +
      '<div class="cf-grid"><div class="cf-inputs">' + section('impitems', 'Что закупаем в Китае', 'Позиции, цены поставщика, вес, пошлина', items) + section('impmode', 'Как везём и платим', 'Схема ввоза, транспорт, платежи, таможня', how) + '</div>' +
      '<div class="cf-results" id="cf-imp-results">' + importResultsHtml(m) + '</div></div>';
  }
  function importResultsHtml(m) {
    var b = m.base, on = withImp(b, true), off = withImp(b, false), rOn = calc(on), rOff = calc(off), I = rOn.imp, im = b.imp;
    var apply = '<label class="cf-switch" style="margin:0"><input type="checkbox" data-cf="imp.apply"' + (im.apply ? ' checked' : '') + '><span>Подставить импорт в основной расчёт себестоимости</span></label>';
    if (!I || !I.rows.length) return '<div class="card">' + apply + '<p class="muted" style="margin-top:12px">Отметьте хотя бы одну позицию слева.</p></div>';
    var sizes = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000], be = null;
    for (var i = 0; i < sizes.length; i++) { var s = Object.assign(emptySim(), { batch: sizes[i] }); if (calc(on, s).unit <= calc(off, s).unit) { be = sizes[i]; break; } }
    var cheaper = rOn.unit < rOff.unit;
    var html = '<div class="card cf-summary">' + apply + '<div class="cf-kpis" style="margin-top:14px">' +
      '<div class="cf-kpi main"><small>Себестоимость с импортом</small><b class="num">' + rub(rOn.unit) + '</b>' + delta(rOn.unit, rOff.unit, true, true) + '</div>' +
      '<div class="cf-kpi"><small>Только российские поставщики</small><b class="num">' + rub(rOff.unit) + '</b><span class="cf-sub">' + (cheaper ? 'экономия ' + rub((rOff.unit - rOn.unit) * rOn.batch, 0) + ' на партии' : 'импорт пока дороже') + '</span></div>' +
      '<div class="cf-kpi"><small>Закупка в Китае на партию</small><b class="num">' + rub(I.t.cash, 0) + '</b><span class="cf-sub">' + Math.round(I.t.kg).toLocaleString('ru-RU') + ' кг груза</span></div>' +
      '<div class="cf-kpi"><small>От предоплаты до вашего склада</small><b class="num">' + I.days + ' дн.</b><span class="cf-sub">производство ' + I.prodDays + ' + доставка ' + I.shipDays + '</span></div></div>' +
      '<p class="small muted cf-note">' + (be ? (be <= rOn.batch ? 'Импорт выгоднее уже при текущей партии. ' : '') + 'Импорт становится выгоднее российских поставщиков с партии ≈ ' + units(be) + ': фиксированные расходы на ввоз (' + rub(I.t.fixed, 0) + ') делятся на тираж.' : 'В диапазоне до 50 000 шт. импорт не выгоднее российских поставщиков при этих ценах.') + '</p></div>';
    var rows = [{ label: 'Товар у поставщика', v: I.t.goods }, { label: 'Комиссия платёжного агента', v: I.t.agent }, { label: 'Доставка', v: I.t.freight }, { label: 'Страховка', v: I.t.ins }];
    if (I.white) rows.push({ label: 'Пошлина', v: I.t.duty }, { label: 'НДС при ввозе' + (im.vatDeductible ? ' (к вычету)' : ''), v: I.t.vat });
    rows.push({ label: I.white ? 'Брокер, сбор, проверка, доставка по РФ' : 'Проверка и доставка по РФ', v: I.t.fixed });
    html += '<div class="card">' + barsHtml(rows.filter(function (x) { return x.v > 0.5; }), I.t.cash, 'Из чего складывается закупка партии', 'на партию') + '</div>';
    html += '<div class="card"><h3>Китай или Россия — на один продукт</h3><div class="table-wrap"><table class="table"><thead><tr><th scope="col">Позиция</th><th scope="col">Китай с доставкой</th><th scope="col">Россия</th><th scope="col">Разница</th></tr></thead><tbody>' +
      I.rows.map(function (x) {
        var d = x.ru != null ? x.perProduct - x.ru : null;
        return '<tr><td>' + esc(x.name) + '</td><td class="num">' + rub(x.perProduct) + '</td><td class="num">' + (x.ru != null ? rub(x.ru) : '—') + '</td><td class="num" style="color:' + (d == null ? 'inherit' : d < 0 ? 'var(--c-better)' : 'var(--c-worse)') + '">' + (d == null ? 'новая позиция' : (d < 0 ? '−' : '+') + rub(Math.abs(d))) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small muted" style="margin-top:8px">В цену из Китая входят доставка, страховка, ' + (I.white ? 'пошлина, ' + (im.vatDeductible ? '' : 'НДС, ') : '') + 'комиссия агента и доля фиксированных расходов на партию.</p></div>';
    var agentK = n(im.agentPct) / 100;
    var pays = [
      ['День 0', 'Предоплата поставщику ' + pct(n(im.depositPct), 0), I.deposit * (1 + agentK)],
      ['День ' + I.prodDays, 'Остаток перед отгрузкой', (I.t.goods - I.deposit) * (1 + agentK)],
      ['День ' + I.days, I.white ? 'Доставка, пошлина, НДС, брокер, сборы' : 'Карго, проверка, доставка по России', I.t.freight + I.t.ins + I.t.duty + I.t.vat + I.t.fixed]
    ];
    html += '<div class="card"><h3>График платежей</h3><ol class="cf-pay">' + pays.map(function (p) { return '<li><span class="cf-pay-d">' + p[0] + '</span><span>' + esc(p[1]) + '</span><b class="num">' + rub(p[2], 0) + '</b></li>'; }).join('') + '</ol>' +
      '<p class="small muted" style="margin-top:8px">Деньги заморожены около ' + Math.round((I.days + 30) / 7) + ' недель: ' + I.days + ' дней до склада и ещё примерно месяц на производство, приёмку и первые продажи.</p></div>';
    var warn = I.white ? [
      'Нужен импортёр: ваше ИП или ООО с внешнеторговым контрактом либо агент по ВЭД, который ввозит товар на себя.',
      'Для готовой косметики на таможне нужна декларация соответствия ЕАЭС; для сырья и тары — спецификации и паспорта безопасности от поставщика.',
      'Готовую косметику маркируют кодами Честного знака до таможенного оформления — у производителя или на таможенном складе.',
      'НДС при ввозе платится на таможне. На УСН без НДС его нельзя принять к вычету, поэтому он входит в себестоимость.'
    ] : [
      'Документов о ввозе не будет: готовую косметику с карго нельзя законно продавать на маркетплейсе — нужны декларация соответствия и коды Честного знака.',
      'Для сырья и тары на собственное производство карго используют чаще, но риски изъятия, пересорта и порчи остаются на вас.',
      'Ставка «под ключ» обычно не включает страховку и проверку качества — заложите их отдельно.'
    ];
    warn.push('Заложите образцы и их экспресс-доставку в этап «Рецептура и образцы», а риск курса юаня проверьте на вкладке «Симуляции».');
    html += '<div class="card"><h3>' + icon('info', 'sm') + ' Что важно учесть</h3><ul class="cf-warn">' + warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>';
    return html;
  }
  function refreshImport(m) { var h = document.getElementById('cf-imp-results'); if (h) h.innerHTML = importResultsHtml(m); }
  function refreshTab(m) { var t = BM.ui.costTab; if (t === 'real') refreshResults(m); else if (t === 'flow') updateFlow(m); else if (t === 'import') refreshImport(m); }

  // ---------- brand summary & export ----------
  function productData(m) {
    normalize(m);
    var r = calc(m.base), mp = {};
    r.channels.forEach(function (c) { mp[c.id] = c; });
    return { m: m, r: r, F: flowCalc(m.base), s: m.base.salesMode === 'mp' ? r.best : r.sales, mp: mp };
  }
  // [label, value(p), kind, total: sum|avg|max, strong]
  var SUM_ROWS = [
    ['Объём', function (p) { return n(p.m.base.unitVolume) + ' ' + p.m.base.unit; }, 'text'],
    ['Партия, шт.', function (p) { return p.r.batch; }, 'int', 'sum'],
    ['Сырьё на единицу', function (p) { return p.r.raw; }, 'rub', 'avg'],
    ['Упаковка на единицу', function (p) { return p.r.pack + p.r.finished; }, 'rub', 'avg'],
    ['Производство на единицу', function (p) { return p.r.prod; }, 'rub', 'avg'],
    ['Маркировка на единицу', function (p) { return p.r.marking; }, 'rub', 'avg'],
    ['Логистика до склада на единицу', function (p) { return p.r.logistics; }, 'rub', 'avg'],
    ['Брак на единицу', function (p) { return p.r.defectCost; }, 'rub', 'avg'],
    ['Себестоимость единицы', function (p) { return p.r.unit; }, 'rub', 'avg', true],
    ['Себестоимость с амортизацией запуска', function (p) { return p.r.unitFull; }, 'rub', 'avg'],
    ['Разовые затраты на запуск', function (p) { return p.r.oneOffTotal; }, 'rub0', 'sum'],
    ['Деньги на первую партию', function (p) { return p.r.cashFirst; }, 'rub0', 'sum', true],
    ['Деньги на следующую партию', function (p) { return p.r.cashNext; }, 'rub0', 'sum'],
    ['Импорт из Китая в расчёте', function (p) { return p.r.useImp ? 'да' : 'нет'; }, 'text'],
    ['До первой продажи, нед.', function (p) { return p.F.toSale; }, 'int', 'max'],
    ['Вложено до старта продаж', function (p) { return p.F.beforeSale; }, 'rub0', 'sum'],
    ['Формат продаж', function (p) { return p.m.base.salesMode === 'mp' ? 'По площадкам' : (p.s ? 'Общая прикидка' : '—'); }, 'text'],
    ['Канал для итогов', function (p) { return p.s ? p.s.label : '—'; }, 'text'],
    ['Цена продажи', function (p) { return p.s ? p.s.price : null; }, 'rub0', 'avg'],
    ['Прибыль с продажи', function (p) { return p.s ? p.s.profit : null; }, 'rub', 'avg', true],
    ['Маржа', function (p) { return p.s ? p.s.margin : null; }, 'pct', 'avg', true],
    ['Прибыль с партии', function (p) { return p.s ? p.s.batchProfit : null; }, 'rub0', 'sum'],
    ['ROI первой партии', function (p) { return p.s ? p.s.roi : null; }, 'pct', 'avg'],
    ['Окупаемость вложений, шт.', function (p) { return p.s ? p.s.payback : null; }, 'int']
  ].concat([].concat.apply([], MPS.map(function (mp) {
    return [['Прибыль · ' + mp.label, function (p) { return p.mp[mp.id] ? p.mp[mp.id].profit : null; }, 'rub', 'avg'],
      ['Маржа · ' + mp.label, function (p) { return p.mp[mp.id] ? p.mp[mp.id].margin : null; }, 'pct', 'avg']];
  })));
  function fmtKind(v, kind) {
    if (v == null || v === '') return '—';
    if (kind === 'text') return esc(v);
    if (kind === 'int') return Math.round(v).toLocaleString('ru-RU');
    if (kind === 'pct') return pct(v);
    return rub(v, kind === 'rub0' ? 0 : null);
  }
  function totalOf(row, list) {
    var vals = list.map(function (p) { return row[1](p); }).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!row[3] || !vals.length) return null;
    if (row[3] === 'sum') return vals.reduce(function (a, v) { return a + v; }, 0);
    if (row[3] === 'max') return Math.max.apply(null, vals);
    return vals.reduce(function (a, v) { return a + v; }, 0) / vals.length;
  }
  function brandModels(brand) {
    return models().filter(function (x) { return brand === '' ? true : brand === '__none' ? !x.projectId : x.projectId === brand; });
  }
  function brandName(brand) {
    if (brand === '') return 'Все расчёты';
    if (brand === '__none') return 'Без бренда';
    var p = BM.state.projects.filter(function (x) { return x.id === brand; })[0];
    return p ? p.name : 'Бренд';
  }
  function summarySel() {
    var brand = BM.ui.cfSumBrand != null ? BM.ui.cfSumBrand : '', off = BM.ui.cfSumOff || {};
    var all = brandModels(brand);
    return { brand: brand, all: all, list: all.filter(function (x) { return !off[x.id]; }).map(productData) };
  }
  function summaryHtml2() {
    var S = summarySel(), list = S.list, ids = {};
    models().forEach(function (x) { if (x.projectId) ids[x.projectId] = 1; });
    var opts = [['', 'Все расчёты']].concat(BM.state.projects.filter(function (p) { return ids[p.id]; }).map(function (p) { return [p.id, p.name]; }));
    if (models().some(function (x) { return !x.projectId; })) opts.push(['__none', 'Без бренда']);
    var off = BM.ui.cfSumOff || {};
    var head = '<div class="card cf-toolbar"><div class="field" style="flex:1 1 220px"><label for="cf-sumbrand">Бренд</label><select class="select" id="cf-sumbrand" data-cf-sumbrand>' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === S.brand ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="row" style="align-self:flex-end"><button type="button" class="btn primary" data-cf-export="xlsx"' + (list.length ? '' : ' disabled') + '>' + icon('download', 'sm') + 'Выгрузить в Excel</button><button type="button" class="btn ghost" data-cf-export="csv"' + (list.length ? '' : ' disabled') + '>CSV</button></div>' +
      '<div class="cf-picks" style="flex-basis:100%"><span class="small muted">Продукты в сводке:</span>' + S.all.map(function (x) { return '<label class="cf-pick"><input type="checkbox" data-cf-sumpick="' + x.id + '"' + (off[x.id] ? '' : ' checked') + '><span>' + esc(x.name) + '</span></label>'; }).join('') + '</div>' +
      '<p class="small muted" style="flex-basis:100%;margin:0">Продукт попадает в бренд через поле «Проект» вверху расчёта. В Excel — лист «Сводка» и подробный лист по каждому отмеченному продукту.</p></div>';
    if (!list.length) return head + '<div class="card"><p class="muted">Нет выбранных продуктов. Отметьте продукты выше или привяжите расчёты к бренду.</p></div>';
    var tot = function (label) { var row = SUM_ROWS.filter(function (r) { return r[0] === label; })[0]; return totalOf(row, list); };
    var kpis = '<div class="card cf-summary"><h2 style="margin-bottom:12px">' + esc(brandName(S.brand)) + '</h2><div class="cf-kpis cf-kpis4">' +
      '<div class="cf-kpi"><small>Продуктов</small><b class="num">' + list.length + '</b></div>' +
      '<div class="cf-kpi"><small>Запуск всей линейки</small><b class="num">' + rub(tot('Деньги на первую партию'), 0) + '</b><span class="cf-sub">из них разовые ' + rub(tot('Разовые затраты на запуск'), 0) + '</span></div>' +
      '<div class="cf-kpi"><small>Средняя маржа</small><b class="num">' + pct(tot('Маржа')) + '</b></div>' +
      '<div class="cf-kpi"><small>Прибыль с первых партий</small><b class="num">' + rub(tot('Прибыль с партии'), 0) + '</b></div></div></div>';
    var table = '<div class="card"><div class="table-wrap"><table class="table cf-sumtable"><thead><tr><th scope="col">Показатель</th>' +
      list.map(function (p) { return '<th scope="col"><a href="#/cost/' + p.m.id + '" data-cf-open="' + p.m.id + '">' + esc(p.m.name) + '</a></th>'; }).join('') + (list.length > 1 ? '<th scope="col" class="cf-tot">По бренду</th>' : '') + '</tr></thead><tbody>' +
      SUM_ROWS.filter(function (row) { return list.some(function (p) { var v = row[1](p); return v != null && v !== '—'; }); }).map(function (row) {
        var t = totalOf(row, list);
        return '<tr' + (row[4] ? ' class="cf-strong"' : '') + '><td>' + esc(row[0]) + (row[3] === 'avg' && list.length > 1 ? '' : '') + '</td>' + list.map(function (p) { return '<td class="num">' + fmtKind(row[1](p), row[2]) + '</td>'; }).join('') +
          (list.length > 1 ? '<td class="num cf-tot">' + (t == null ? '' : fmtKind(t, row[2]) + (row[3] === 'avg' ? '<small> сред.</small>' : row[3] === 'max' ? '<small> макс.</small>' : '')) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
    return head + kpis + table;
  }

  // Excel workbook: summary sheet + one detailed sheet per product.
  function r2(v) { return typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v; }
  function summaryAoa(S) {
    var list = S.list, multi = list.length > 1;
    var aoa = [['Бренд', brandName(S.brand)], ['Дата выгрузки', new Date().toLocaleDateString('ru-RU')], [],
      ['Показатель'].concat(list.map(function (p) { return p.m.name; })).concat(multi ? ['По бренду'] : [])];
    SUM_ROWS.forEach(function (row) {
      var vals = list.map(function (p) { var v = row[1](p); return v == null ? '' : r2(v); });
      if (vals.every(function (v) { return v === '' || v === '—'; })) return;
      var t = totalOf(row, list);
      aoa.push([row[0] + (row[2] === 'pct' ? ', %' : /rub/.test(row[2]) ? ', ₽' : '')].concat(vals).concat(multi ? [t == null ? '' : r2(t)] : []));
    });
    return aoa;
  }
  function productAoa(p) {
    var b = p.m.base, r = p.r, rt = function (c) { return c === 'RUB' || !c ? 1 : n(b.rates[c]); };
    var proj = BM.state.projects.filter(function (x) { return x.id === p.m.projectId; })[0];
    var aoa = [['Продукт', p.m.name], ['Бренд', proj ? proj.name : '—'], ['Объём', n(b.unitVolume) + ' ' + b.unit], ['Партия, шт.', r.batch], ['Брак, %', n(b.defectPct)], [],
      ['СЫРЬЁ', '% в формуле', 'Цена за кг', 'Валюта', 'Потери, %', 'На единицу, ₽', 'На партию, ₽']];
    b.ingredients.forEach(function (x, i) { var c = r.ingRows[i] ? r.ingRows[i].cost : null; aoa.push([x.name, n(x.pct), n(x.price), x.cur, n(x.loss), r2(c), c == null ? '' : r2(c * r.batch)]); });
    aoa.push([], ['УПАКОВКА', 'Цена за шт.', 'Валюта', 'Брак, %', 'На единицу, ₽ (с учётом курса)']);
    b.packaging.forEach(function (x) { aoa.push([x.name, n(x.price), x.cur, n(x.scrap), r2(n(x.price) * rt(x.cur) * (1 + n(x.scrap) / 100))]); });
    aoa.push([], ['ПРОИЗВОДСТВО', '₽'], ['Розлив и сборка, за шт.', n(b.production.fillPerUnit)], ['Работа и контроль, за шт.', n(b.production.laborPerUnit)], ['Наладка на партию', n(b.production.setupPerBatch)]);
    aoa.push([], ['РАЗОВЫЕ ЗАТРАТЫ НА ЗАПУСК', 'Сумма, ₽', 'Партий', 'Этап']);
    b.oneOff.forEach(function (x) { aoa.push([x.name, n(x.amount), n(x.batches), (STAGES.filter(function (s) { return s.id === x.stage; })[0] || {}).label || '']); });
    aoa.push([], ['СТРУКТУРА СЕБЕСТОИМОСТИ', '₽ на единицу', 'Доля, %']);
    r.parts.forEach(function (x) { aoa.push([x.label, r2(x.v), r2(r.unit ? x.v / r.unit * 100 : 0)]); });
    aoa.push(['Себестоимость единицы', r2(r.unit), 100], ['С амортизацией запуска', r2(r.unitFull)], ['Деньги на первую партию', r2(r.cashFirst)], ['Деньги на следующую партию', r2(r.cashNext)]);
    var ch = r.channels.length ? r.channels : (r.sales ? [r.sales] : []);
    if (ch.length) {
      aoa.push([], ['ПРОДАЖИ, ₽ НА ЕДИНИЦУ'].concat(ch.map(function (c) { return c.label; })));
      aoa.push(['Цена'].concat(ch.map(function (c) { return r2(c.price); })));
      var keys = [];
      ch.forEach(function (c) { c.costs.forEach(function (x) { if (keys.indexOf(x.label) < 0) keys.push(x.label); }); });
      keys.forEach(function (k) { aoa.push([k].concat(ch.map(function (c) { var x = c.costs.filter(function (y) { return y.label === k; })[0]; return x ? -r2(x.v) : ''; }))); });
      aoa.push(['Прибыль'].concat(ch.map(function (c) { return r2(c.profit); })), ['Маржа, %'].concat(ch.map(function (c) { return r2(c.margin); })),
        ['Прибыль с партии'].concat(ch.map(function (c) { return r2(c.batchProfit); })), ['Окупаемость, шт.'].concat(ch.map(function (c) { return c.payback || ''; })));
    }
    aoa.push([], ['ХОД РАЗРАБОТКИ', 'Недели', 'Затраты этапа, ₽', 'Накоплено, ₽', '+ к себестоимости единицы, ₽']);
    p.F.st.forEach(function (s) { aoa.push([s.label, s.weeks ? (s.start + 1) + '–' + s.end : '—', r2(s.money), r2(s.cum), r2(s.unit)]); });
    if (r.imp && r.imp.rows.length) {
      aoa.push([], ['ИМПОРТ ИЗ КИТАЯ' + (r.useImp ? ' (в расчёте)' : ' (не в расчёте)'), 'Товар', 'Доставка', 'Пошлина', 'НДС', 'Фикс. доля', 'На продукт, ₽', 'Россия, ₽']);
      r.imp.rows.forEach(function (x) { aoa.push([x.name, r2(x.goods), r2(x.freight + x.ins), r2(x.duty), r2(x.vat), r2(x.fixed), r2(x.perProduct), x.ru == null ? '' : r2(x.ru)]); });
    }
    return aoa;
  }
  function sheetName(name, used) {
    var s = String(name).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 28) || 'Продукт', k = s, i = 2;
    while (used[k.toLowerCase()]) k = s.slice(0, 25) + ' ' + i++;
    used[k.toLowerCase()] = 1; return k;
  }
  function fileBase(S) { return ('Себестоимость — ' + brandName(S.brand) + ' — ' + new Date().toISOString().slice(0, 10)).replace(/[\\\/:*?"<>|]/g, ' '); }
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(); }; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function downloadBlob(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportCsv(S) {
    var cell = function (v) { v = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = summaryAoa(S).map(function (row) { return row.map(cell).join(';'); }).join('\r\n');
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), fileBase(S) + '.csv');
  }
  function exportXlsx(S) {
    BM.toast('Готовлю файл Excel…');
    loadXlsx().then(function (X) {
      var wb = X.utils.book_new(), used = {};
      var add = function (aoa, name, widths) { var ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = widths.map(function (w) { return { wch: w }; }); X.utils.book_append_sheet(wb, ws, sheetName(name, used)); };
      add(summaryAoa(S), 'Сводка', [38].concat(S.list.map(function () { return 18; })).concat([16]));
      S.list.forEach(function (p) { add(productAoa(p), p.m.name, [42, 16, 16, 16, 16, 16, 16, 16]); });
      X.writeFile(wb, fileBase(S) + '.xlsx');
    }).catch(function () { BM.toast('Нет связи с библиотекой Excel — сохраняю сводку в CSV, она тоже открывается в Excel'); exportCsv(S); });
  }

  // ---------- page ----------
  BM.views.cost = function (id) {
    var m = current(id), list = models(), tab = BM.ui.costTab;
    BM.ui.costModel = m.id;
    if (BM.ui.cfSumBrand == null) BM.ui.cfSumBrand = m.projectId || '';
    var projOpts = '<option value="">Без проекта</option>' + BM.state.projects.map(function (p) { return '<option value="' + p.id + '"' + (p.id === m.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
    return '<div class="page cf-page">' +
      '<div class="page-head"><div><span class="eyebrow">' + icon('calc', 'sm') + 'Себестоимость</span><h1 style="margin-top:8px">Себестоимость <span class="serif">и юнит-экономика</span></h1>' +
        '<p>Реальная стоимость продукта от рецептуры до полки, прибыль на каждой площадке и сценарии: курс, партия, цена, реклама.</p></div></div>' +
      '<div class="card cf-toolbar"><div class="field" style="flex:1 1 220px"><label for="cf-model">Расчёт</label><select class="select" id="cf-model">' + list.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="flex:1 1 200px"><label for="cf-name">Название</label><input class="input" id="cf-name" data-cf-meta="name" value="' + esc(m.name) + '"></div>' +
        '<div class="field" style="flex:1 1 180px"><label for="cf-project">Проект</label><select class="select" id="cf-project" data-cf-meta="projectId">' + projOpts + '</select></div>' +
        '<div class="row" style="align-self:flex-end"><button type="button" class="btn" data-cf-new>' + icon('plus', 'sm') + 'Новый</button><button type="button" class="btn ghost" data-cf-dup>' + icon('copy', 'sm') + 'Копия</button><button type="button" class="icon-btn bordered" data-cf-delmodel aria-label="Удалить расчёт">' + icon('trash', 'sm') + '</button></div></div>' +
      '<nav class="tabs" aria-label="Режим">' + [['real', 'calc', 'Реальные цифры'], ['flow', 'flag', 'Ход разработки'], ['import', 'box', 'Импорт из Китая'], ['sim', 'sparkle', 'Симуляции'], ['sum', 'grid', 'Сводка и выгрузка']].map(function (x) {
        return '<button type="button" class="tab' + (tab === x[0] ? ' active' : '') + '" data-cf-tab="' + x[0] + '"' + (tab === x[0] ? ' aria-current="page"' : '') + '>' + icon(x[1], 'sm') + x[2] + '</button>';
      }).join('') + '</nav>' +
      (tab === 'real' ? '<div class="cf-grid">' + inputsHtml(m) + '<div class="cf-results" id="cf-results">' + resultsHtml(m) + '</div></div>' : tab === 'flow' ? flowHtml(m) : tab === 'import' ? importHtml(m) : tab === 'sum' ? summaryHtml2() : simHtml(m)) +
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
    if (BM.ui.costTab === 'real') updateSums(m); else if (BM.ui.costTab === 'sim') refreshSim(m);
    var tip = document.getElementById('cf-tip');
    page.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.cf) {
        if (t.type === 'checkbox') return;
        setPath(m.base, t.dataset.cf, t.value);
        refreshTab(m); save(m); return;
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
      if (t.matches('[data-cf-sumbrand]')) { BM.ui.cfSumBrand = t.value; BM.render(); return; }
      if (t.matches('[data-cf-sumpick]')) { BM.ui.cfSumOff = BM.ui.cfSumOff || {}; BM.ui.cfSumOff[t.dataset.cfSumpick] = !t.checked; BM.render(); return; }
      if (t.matches('[data-cf-simch]')) { m.base.simChannel = t.value; m.sim.drr = m.sim.buyout = m.sim.commission = null; save(m); BM.render(); return; }
      if (t.type === 'checkbox' && t.dataset.cf) { setPath(m.base, t.dataset.cf, t.checked); save(m); BM.render(); return; }
      if (t.tagName === 'SELECT' && t.dataset.cf) { setPath(m.base, t.dataset.cf, t.value); save(m); if (t.hasAttribute('data-cf-rerender')) BM.render(); else refreshTab(m); }
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
      if ((t = e.target.closest('[data-cf-export]'))) { var S = summarySel(); if (S.list.length) (t.dataset.cfExport === 'csv' ? exportCsv : exportXlsx)(S); return; }
      if ((t = e.target.closest('[data-cf-open]'))) { e.preventDefault(); BM.ui.costTab = 'real'; BM.go('#/cost/' + t.dataset.cfOpen); return; }
      if ((t = e.target.closest('[data-cf-set]'))) { setPath(m.base, t.dataset.cfSet, t.dataset.v); save(m); BM.render(); return; }
      if ((t = e.target.closest('[data-cf-addstage]'))) { m.base.oneOff.push({ name: 'Новая статья', amount: 0, batches: 1, stage: t.dataset.cfAddstage }); save(m); BM.render(); return; }
      if ((t = e.target.closest('[data-cf-add]'))) {
        var k = t.dataset.cfAdd;
        getPath(m.base, k).push(k === 'ingredients' ? { name: 'Новый компонент', pct: 0, price: 0, cur: 'RUB', loss: 2 } : k === 'packaging' ? { name: 'Новый компонент', price: 0, cur: 'RUB', scrap: 1 } :
          k === 'imp.items' ? { on: true, name: 'Новая позиция', link: '', price: 0, cur: 'CNY', unit: 'шт', per: 1, weight: 10, duty: 6.5 } : { name: 'Новая статья', amount: 0, batches: 1, stage: 'brand' });
        save(m); BM.render(); return;
      }
      if ((t = e.target.closest('[data-cf-del]'))) { getPath(m.base, t.dataset.cfDel).splice(+t.dataset.i, 1); save(m); BM.render(); return; }
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
