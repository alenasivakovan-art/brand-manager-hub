(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon;
  var CUR = ['RUB', 'USD', 'EUR', 'CNY'];

  // ---------- model ----------
  function defaultModel(name) {
    return {
      id: BM.uid(), name: name || 'Крем для рук 50 мл', projectId: null, updatedAt: Date.now(),
      base: {
        unitVolume: 50, unit: 'мл', density: 1, batch: 3000, defectPct: 2,
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
          { name: 'Нанесение / этикетка', price: 4, cur: 'RUB', scrap: 3 },
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
        sales: { enabled: true, price: 590, commissionPct: 17, mpLogistics: 55, storagePerUnit: 3, drrPct: 12, buyoutPct: 85, returnCost: 50, taxPct: 6 }
      },
      sim: null,
      scenarios: []
    };
  }
  function emptySim() { return { batch: null, fx: 0, raw: 0, pack: 0, prod: 0, price: 0, drr: null, buyout: null, commission: null }; }

  function n(v) { var x = BM.num(v); return x == null ? 0 : x; }
  function rate(b, cur) { return cur === 'RUB' || !cur ? 1 : n(b.rates[cur]); }

  // core calculation; sim applies on top of base without mutating it
  function calc(base, sim) {
    sim = sim || emptySim();
    var fxK = 1 + n(sim.fx) / 100, rawK = 1 + n(sim.raw) / 100, packK = 1 + n(sim.pack) / 100, prodK = 1 + n(sim.prod) / 100;
    var batch = Math.max(1, sim.batch != null ? sim.batch : n(base.batch));
    var grams = n(base.unitVolume) * (base.unit === 'г' ? 1 : (n(base.density) || 1));
    var rt = function (cur) { return cur === 'RUB' || !cur ? 1 : rate(base, cur) * fxK; };
    var ingRows = base.ingredients.map(function (r) {
      var perKg = n(r.price) * rt(r.cur) * rawK;
      return { name: r.name, cost: grams * n(r.pct) / 100 * perKg / 1000 * (1 + n(r.loss) / 100) };
    });
    var raw = ingRows.reduce(function (a, r) { return a + r.cost; }, 0);
    var pctSum = base.ingredients.reduce(function (a, r) { return a + n(r.pct); }, 0);
    var packRows = base.packaging.map(function (r) { return { name: r.name, cost: n(r.price) * rt(r.cur) * packK * (1 + n(r.scrap) / 100) }; });
    var pack = packRows.reduce(function (a, r) { return a + r.cost; }, 0);
    var prodVar = (n(base.production.fillPerUnit) + n(base.production.laborPerUnit)) * prodK;
    var setup = n(base.production.setupPerBatch);
    var prod = prodVar + setup / batch;
    var oneOffTotal = base.oneOff.reduce(function (a, r) { return a + n(r.amount); }, 0);
    var oneOff = base.oneOff.reduce(function (a, r) { return a + n(r.amount) / (Math.max(1, n(r.batches)) * batch); }, 0);
    var marking = n(base.marking.codePerUnit) + n(base.marking.applyPerUnit);
    var inbound = n(base.logistics.inboundPerBatch);
    var logistics = inbound / batch + n(base.logistics.fulfilPerUnit);
    var subtotal = raw + pack + prod + oneOff + marking + logistics;
    var defect = clampPct(n(base.defectPct));
    var unit = subtotal / (1 - defect / 100);
    var defectCost = unit - subtotal;
    var variableUnit = raw + pack + prodVar + marking + n(base.logistics.fulfilPerUnit);
    var cashNext = variableUnit * batch + setup + inbound;
    var cashFirst = cashNext + oneOffTotal;
    var good = batch * (1 - defect / 100);
    var parts = [
      { key: 'raw', label: 'Сырьё', v: raw }, { key: 'pack', label: 'Упаковка', v: pack },
      { key: 'prod', label: 'Производство', v: prod }, { key: 'oneoff', label: 'Разовые затраты', v: oneOff },
      { key: 'marking', label: 'Маркировка', v: marking }, { key: 'log', label: 'Логистика до склада', v: logistics },
      { key: 'defect', label: 'Брак', v: defectCost }
    ];
    var r = { batch: batch, grams: grams, raw: raw, pack: pack, prod: prod, oneOff: oneOff, marking: marking, logistics: logistics, defectCost: defectCost, unit: unit, subtotal: subtotal,
      cashFirst: cashFirst, cashNext: cashNext, good: good, parts: parts, ingRows: ingRows, packRows: packRows, pctSum: pctSum, sales: null };
    var s = base.sales;
    if (s && s.enabled) {
      var price = n(s.price) * (1 + n(sim.price) / 100);
      var comm = (sim.commission != null ? sim.commission : n(s.commissionPct)) / 100;
      var drr = (sim.drr != null ? sim.drr : n(s.drrPct)) / 100;
      var buy = Math.max(1, sim.buyout != null ? sim.buyout : n(s.buyoutPct)) / 100;
      var costs = [
        { key: 'cogs', label: 'Себестоимость', v: unit },
        { key: 'comm', label: 'Комиссия МП', v: price * comm },
        { key: 'mplog', label: 'Логистика МП (с учётом невыкупа)', v: n(s.mpLogistics) / buy },
        { key: 'ret', label: 'Обратная логистика невыкупа', v: n(s.returnCost) * (1 - buy) / buy },
        { key: 'ads', label: 'Реклама (ДРР)', v: price * drr },
        { key: 'stor', label: 'Хранение', v: n(s.storagePerUnit) },
        { key: 'tax', label: 'Налог', v: price * n(s.taxPct) / 100 }
      ];
      var total = costs.reduce(function (a, c) { return a + c.v; }, 0);
      var profit = price - total;
      var netNoCogs = price - (total - unit);
      r.sales = { price: price, costs: costs, total: total, profit: profit, margin: price ? profit / price * 100 : 0,
        batchProfit: profit * good, roi: cashFirst ? profit * good / cashFirst * 100 : 0,
        payback: netNoCogs > 0 ? Math.ceil(cashFirst / netNoCogs) : null, netNoCogs: netNoCogs };
    }
    return r;
  }
  function clampPct(v) { return Math.max(0, Math.min(90, v)); }
  BM.costCalc = calc;

  // ---------- state helpers ----------
  function models() { BM.state.costModels = BM.state.costModels || []; return BM.state.costModels; }
  function current(id) {
    var list = models();
    var m = list.filter(function (x) { return x.id === id; })[0] || list[0];
    if (!m) { m = defaultModel(); list.push(m); BM.persist(); }
    if (!m.sim) m.sim = emptySim();
    return m;
  }
  BM.ui.costTab = BM.ui.costTab || 'real';

  // ---------- formatting ----------
  function rub(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    var d = digits != null ? digits : (Math.abs(v) < 100 ? 2 : 0);
    return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: d }) + ' ₽';
  }
  function pct(v, d) { return v == null || !isFinite(v) ? '—' : v.toLocaleString('ru-RU', { maximumFractionDigits: d == null ? 1 : d }) + '%'; }
  function delta(a, b, money, invert) {
    if (a == null || b == null) return '';
    var d = a - b; if (Math.abs(d) < 0.005) return '<span class="cd-delta flat">без изменений</span>';
    var good = invert ? d < 0 : d > 0;
    return '<span class="cd-delta ' + (good ? 'good' : 'bad') + '">' + (d > 0 ? '+' : '−') + (money ? rub(Math.abs(d)) : Math.abs(d).toFixed(1) + ' п.п.') + '</span>';
  }

  // ---------- inputs ----------
  function inp(path, value, opts) {
    opts = opts || {};
    var id = 'cf-' + path.replace(/\./g, '-');
    return '<input class="input' + (opts.num !== false ? ' num' : '') + '" id="' + id + '" data-cf="' + path + '" value="' + esc(value == null ? '' : value) + '"' + (opts.num !== false ? ' inputmode="decimal"' : '') + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : '') + ' autocomplete="off">';
  }
  function field(path, label, value, suffix, hint) {
    var id = 'cf-' + path.replace(/\./g, '-');
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><div class="cf-unit">' + inp(path, value) + (suffix ? '<span>' + esc(suffix) + '</span>' : '') + '</div>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function curSel(path, value, label) {
    return '<select class="select" data-cf="' + path + '" aria-label="' + esc(label) + '">' + CUR.map(function (c) { return '<option' + (c === value ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>';
  }
  function section(id, title, hint, body, extra) {
    var open = BM.ui['cs_' + id] !== false;
    return '<section class="cf-sec' + (open ? ' open' : '') + '" data-cf-sec="' + id + '"><button type="button" class="cf-sec-head" data-cf-toggle="' + id + '" aria-expanded="' + open + '">' + icon('chevR', 'chev') +
      '<span><b>' + esc(title) + '</b><small>' + esc(hint) + '</small></span><span class="cf-sec-sum num" data-cf-sum="' + id + '"></span></button><div class="cf-sec-body">' + body + (extra || '') + '</div></section>';
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
      }).join('') + '</div><div class="row cf-row-actions"><button type="button" class="btn sm soft" data-cf-add="packaging">' + icon('plus', 'sm') + 'Компонент упаковки</button></div>';
    var once = '<div class="cf-table once"><div class="cf-tr cf-th"><span>Статья</span><span>Сумма, ₽</span><span>На сколько партий</span><span></span></div>' +
      b.oneOff.map(function (r, i) {
        return '<div class="cf-tr">' + inp('oneOff.' + i + '.name', r.name, { num: false, label: 'Статья' }) + inp('oneOff.' + i + '.amount', r.amount, { label: 'Сумма' }) + inp('oneOff.' + i + '.batches', r.batches, { label: 'Партий' }) +
          '<button type="button" class="icon-btn sm" data-cf-del="oneOff" data-i="' + i + '" aria-label="Удалить статью">' + icon('x', 'sm') + '</button></div>';
      }).join('') + '</div><div class="row cf-row-actions"><button type="button" class="btn sm soft" data-cf-add="oneOff">' + icon('plus', 'sm') + 'Статья</button></div>';
    var s = b.sales;
    return '<div class="cf-inputs">' +
      section('batch', 'Продукт и партия', 'Объём единицы, размер партии, брак, курсы', '<div class="form-grid three">' +
        field('unitVolume', 'Объём единицы', b.unitVolume, b.unit) +
        '<div class="field"><label for="cf-unit">Единица</label><select class="select" id="cf-unit" data-cf="unit"><option' + (b.unit === 'мл' ? ' selected' : '') + '>мл</option><option' + (b.unit === 'г' ? ' selected' : '') + '>г</option></select></div>' +
        field('density', 'Плотность', b.density, 'г/мл', 'Для кремов ≈ 0,95–1,05') +
        field('batch', 'Размер партии', b.batch, 'шт.', 'Сверьте с MOQ производителя') +
        field('defectPct', 'Брак готовой продукции', b.defectPct, '%') +
        field('rates.USD', 'Курс USD', b.rates.USD, '₽') + field('rates.EUR', 'Курс EUR', b.rates.EUR, '₽') + field('rates.CNY', 'Курс CNY', b.rates.CNY, '₽') + '</div>') +
      section('raw', 'Рецептура и сырьё', 'Доля в формуле × цена за кг с учётом потерь', ing) +
      section('pack', 'Упаковка', 'Цена компонента на единицу с учётом брака', pack) +
      section('prod', 'Производство', 'Розлив, работа, наладка линии на партию', '<div class="form-grid three">' +
        field('production.fillPerUnit', 'Розлив и сборка', b.production.fillPerUnit, '₽/шт.') + field('production.laborPerUnit', 'Работа и контроль', b.production.laborPerUnit, '₽/шт.') + field('production.setupPerBatch', 'Наладка на партию', b.production.setupPerBatch, '₽') + '</div>') +
      section('once', 'Разовые затраты', 'Сертификация, дизайн, формы — разносятся на N партий', once) +
      section('mark', 'Маркировка и логистика до склада', 'Честный знак, доставка партии, фулфилмент', '<div class="form-grid two">' +
        field('marking.codePerUnit', 'Код Честного знака', b.marking.codePerUnit, '₽/шт.', 'Тариф оператора маркировки') + field('marking.applyPerUnit', 'Нанесение кода', b.marking.applyPerUnit, '₽/шт.') +
        field('logistics.inboundPerBatch', 'Доставка партии до склада МП', b.logistics.inboundPerBatch, '₽') + field('logistics.fulfilPerUnit', 'Фулфилмент и упаковка поставки', b.logistics.fulfilPerUnit, '₽/шт.') + '</div>') +
      section('sales', 'Продажа на маркетплейсе', 'Цена, комиссия, логистика, выкуп, реклама, налог', '<label class="cf-switch"><input type="checkbox" data-cf="sales.enabled"' + (s.enabled ? ' checked' : '') + '><span>Считать юнит-экономику продажи</span></label>' +
        '<div class="form-grid three">' + field('sales.price', 'Цена продажи', s.price, '₽') + field('sales.commissionPct', 'Комиссия площадки', s.commissionPct, '%') + field('sales.mpLogistics', 'Логистика до покупателя', s.mpLogistics, '₽/заказ') +
        field('sales.buyoutPct', 'Доля выкупа', s.buyoutPct, '%') + field('sales.returnCost', 'Обратная логистика', s.returnCost, '₽/возврат') + field('sales.storagePerUnit', 'Хранение', s.storagePerUnit, '₽/шт.') +
        field('sales.drrPct', 'ДРР (реклама)', s.drrPct, '%') + field('sales.taxPct', 'Налог', s.taxPct, '% от цены') + '</div>') +
      '</div>';
  }

  // ---------- results ----------
  function summaryHtml(r, base) {
    var s = r.sales;
    return '<div class="cf-kpis">' +
      '<div class="cf-kpi main"><small>Себестоимость единицы</small><b class="num">' + rub(r.unit) + '</b>' + (base ? delta(r.unit, base.unit, true, true) : '') + '</div>' +
      '<div class="cf-kpi"><small>Деньги на первую партию</small><b class="num">' + rub(r.cashFirst, 0) + '</b>' + (base ? delta(r.cashFirst, base.cashFirst, true, true) : '<span class="cf-sub">далее ' + rub(r.cashNext, 0) + '</span>') + '</div>' +
      (s ? '<div class="cf-kpi"><small>Прибыль с проданной единицы</small><b class="num" style="color:' + (s.profit < 0 ? 'var(--danger)' : 'inherit') + '">' + rub(s.profit) + '</b>' + (base && base.sales ? delta(s.profit, base.sales.profit, true) : '') + '</div>' +
        '<div class="cf-kpi"><small>Маржа</small><b class="num"><span class="margin-pill ' + BM.marginClass(s.margin) + '">' + pct(s.margin) + '</span></b>' + (base && base.sales ? delta(s.margin, base.sales.margin, false) : '') + '</div>' : '') +
      '</div>' +
      (s ? '<p class="small muted cf-note">Партия ' + r.batch.toLocaleString('ru-RU') + ' шт. → прибыль ' + rub(s.batchProfit, 0) + ', ROI первой партии ' + pct(s.roi, 0) + '. ' + (s.payback ? 'Вложения вернутся после продажи ' + s.payback.toLocaleString('ru-RU') + ' шт. (' + pct(s.payback / r.good * 100, 0) + ' партии).' : '<b style="color:var(--danger)">Продажи не покрывают переменные расходы — вложения не вернутся.</b>') + '</p>' : '');
  }

  function barsHtml(rows, total, title, unit) {
    var max = Math.max.apply(null, rows.map(function (x) { return x.v; }).concat([0.0001]));
    var sorted = rows.slice().sort(function (a, b) { return b.v - a.v; });
    return '<div class="cf-chart"><h3>' + esc(title) + '</h3><ul class="cf-bars" role="list">' + sorted.map(function (x) {
      var share = total ? x.v / total * 100 : 0;
      return '<li data-tip="' + esc(x.label + ': ' + rub(x.v) + ' (' + pct(share) + ')') + '"><span class="cf-bar-l">' + esc(x.label) + '</span><span class="cf-bar-t"><i style="width:' + (x.v / max * 100).toFixed(1) + '%"></i></span><span class="cf-bar-v num">' + rub(x.v) + '<small>' + pct(share, 0) + '</small></span></li>';
    }).join('') + '</ul><div class="cf-bar-total"><span>Итого ' + esc(unit) + '</span><b class="num">' + rub(total) + '</b></div></div>';
  }

  function resultsHtml(m) {
    var r = calc(m.base);
    var html = '<div class="card cf-summary">' + summaryHtml(r) + '</div>';
    html += '<div class="card">' + barsHtml(r.parts, r.unit, 'Из чего складывается себестоимость', 'на единицу') + '</div>';
    if (r.sales) html += '<div class="card">' + barsHtml(r.sales.costs, r.sales.total, 'Куда уходит цена продажи ' + rub(r.sales.price), 'расходов на проданную единицу') + '</div>';
    html += '<div class="card"><h3>Самые дорогие компоненты</h3><div class="table-wrap"><table class="table"><thead><tr><th scope="col">Компонент</th><th scope="col">На единицу</th><th scope="col">На партию</th></tr></thead><tbody>' +
      r.ingRows.concat(r.packRows).sort(function (a, b) { return b.cost - a.cost; }).slice(0, 6).map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="num">' + rub(x.cost) + '</td><td class="num">' + rub(x.cost * r.batch, 0) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    return html;
  }

  // ---------- simulation ----------
  var SIM = [
    { k: 'batch', label: 'Размер партии', min: 300, max: 30000, step: 100, unit: ' шт.', abs: true, base: function (b) { return n(b.batch); } },
    { k: 'fx', label: 'Курс валют', min: -30, max: 60, step: 1, unit: '%', fmt: 'pct' },
    { k: 'raw', label: 'Цены на сырьё', min: -40, max: 60, step: 1, unit: '%', fmt: 'pct' },
    { k: 'pack', label: 'Цены на упаковку', min: -40, max: 60, step: 1, unit: '%', fmt: 'pct' },
    { k: 'prod', label: 'Стоимость производства', min: -40, max: 60, step: 1, unit: '%', fmt: 'pct' },
    { k: 'price', label: 'Цена продажи', min: -40, max: 60, step: 1, unit: '%', fmt: 'pct', sales: true },
    { k: 'drr', label: 'ДРР', min: 0, max: 40, step: 0.5, unit: '%', abs: true, sales: true, base: function (b) { return n(b.sales.drrPct); } },
    { k: 'buyout', label: 'Доля выкупа', min: 30, max: 100, step: 1, unit: '%', abs: true, sales: true, base: function (b) { return n(b.sales.buyoutPct); } },
    { k: 'commission', label: 'Комиссия площадки', min: 5, max: 40, step: 0.5, unit: '%', abs: true, sales: true, base: function (b) { return n(b.sales.commissionPct); } }
  ];
  function simVal(m, s) { var v = m.sim[s.k]; return v == null ? (s.abs ? s.base(m.base) : 0) : v; }
  function sliderLabel(s, v) { return s.fmt === 'pct' ? (v > 0 ? '+' : '') + v + '%' : (s.k === 'batch' ? Math.round(v).toLocaleString('ru-RU') + ' шт.' : v + '%'); }

  function simHtml(m) {
    var sales = m.base.sales.enabled;
    var sliders = SIM.filter(function (s) { return !s.sales || sales; }).map(function (s) {
      var v = simVal(m, s);
      return '<div class="cf-slider"><div class="row" style="justify-content:space-between"><label for="sim-' + s.k + '">' + esc(s.label) + '</label><output class="num" id="sim-o-' + s.k + '">' + sliderLabel(s, v) + '</output></div>' +
        '<input type="range" id="sim-' + s.k + '" data-sim="' + s.k + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + v + '"></div>';
    }).join('');
    var sc = m.scenarios || [];
    return '<div class="cf-sim-grid">' +
      '<div class="card cf-sim-panel"><div class="card-head"><h2>Что если</h2><button type="button" class="btn sm ghost" data-cf-simreset>' + icon('refresh', 'sm') + 'Сбросить</button></div>' +
        '<p class="small muted" style="margin:-6px 0 12px">Ползунки меняют расчёт поверх реальных цифр, не трогая их.</p>' + sliders +
        '<div class="row" style="margin-top:14px"><button type="button" class="btn soft" data-cf-savesc>' + icon('plus', 'sm') + 'Сохранить сценарий</button><button type="button" class="btn ghost" data-cf-apply>' + icon('check', 'sm') + 'Сделать реальными цифрами</button></div></div>' +
      '<div class="cf-sim-out"><div class="card cf-summary" id="cf-sim-summary"></div><div class="card" id="cf-tornado"></div><div class="card" id="cf-batchcurve"></div></div>' +
    '</div>' +
    '<div class="card"><div class="card-head"><h2>Сценарии</h2></div><div id="cf-scenarios">' + scenariosTable(m) + '</div></div>';
  }

  function scenariosTable(m) {
    var rows = [{ id: '', name: 'Реальные цифры', sim: emptySim(), base: true }].concat(m.scenarios || []);
    return '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Сценарий</th><th scope="col">Себестоимость</th><th scope="col">Первая партия</th>' + (m.base.sales.enabled ? '<th scope="col">Прибыль/шт.</th><th scope="col">Маржа</th><th scope="col">Окупаемость</th>' : '') + '<th scope="col"><span class="sr-only">Действия</span></th></tr></thead><tbody>' +
      rows.map(function (s) {
        var r = calc(m.base, s.sim);
        return '<tr><td><b>' + esc(s.name) + '</b>' + (s.base ? '' : '<small class="muted" style="display:block">' + esc(simSummary(m, s.sim)) + '</small>') + '</td><td class="num">' + rub(r.unit) + '</td><td class="num">' + rub(r.cashFirst, 0) + '</td>' +
          (r.sales ? '<td class="num">' + rub(r.sales.profit) + '</td><td class="num">' + pct(r.sales.margin) + '</td><td class="num">' + (r.sales.payback ? r.sales.payback.toLocaleString('ru-RU') + ' шт.' : '—') + '</td>' : '') +
          '<td>' + (s.base ? '' : '<div class="row" style="gap:4px;flex-wrap:nowrap"><button type="button" class="icon-btn sm" data-cf-loadsc="' + s.id + '" aria-label="Загрузить сценарий в ползунки">' + icon('arrowR', 'sm') + '</button><button type="button" class="icon-btn sm" data-cf-delsc="' + s.id + '" aria-label="Удалить сценарий">' + icon('trash', 'sm') + '</button></div>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (rows.length < 2 ? '<p class="small muted" style="margin-top:10px">Подвигайте ползунки и нажмите «Сохранить сценарий», чтобы сравнить варианты: например, «большая партия», «рост курса на 20%», «цена 690 ₽».</p>' : '');
  }
  function simSummary(m, sim) {
    return SIM.filter(function (s) { return sim[s.k] != null && sim[s.k] !== 0 && !(s.abs && sim[s.k] === s.base(m.base)); })
      .map(function (s) { return s.label.toLowerCase() + ' ' + sliderLabel(s, sim[s.k]); }).join(', ') || 'без изменений';
  }

  // tornado: effect of each factor on profit per sold unit (or unit cost if no sales)
  function tornadoHtml(m) {
    var hasSales = m.base.sales.enabled;
    var metric = function (r) { return hasSales ? r.sales.profit : -r.unit; };
    var base = calc(m.base), b0 = metric(base);
    var F = [
      { label: 'Цены на сырьё ±20%', lo: { raw: 20 }, hi: { raw: -20 } },
      { label: 'Цены на упаковку ±20%', lo: { pack: 20 }, hi: { pack: -20 } },
      { label: 'Курс валют ±20%', lo: { fx: 20 }, hi: { fx: -20 } },
      { label: 'Производство ±20%', lo: { prod: 20 }, hi: { prod: -20 } },
      { label: 'Размер партии ×0,5 / ×2', lo: { batch: Math.max(1, n(m.base.batch) / 2) }, hi: { batch: n(m.base.batch) * 2 } }
    ];
    if (hasSales) F = F.concat([
      { label: 'Цена продажи ±10%', lo: { price: -10 }, hi: { price: 10 } },
      { label: 'ДРР ±5 п.п.', lo: { drr: n(m.base.sales.drrPct) + 5 }, hi: { drr: Math.max(0, n(m.base.sales.drrPct) - 5) } },
      { label: 'Выкуп ±10 п.п.', lo: { buyout: Math.max(30, n(m.base.sales.buyoutPct) - 10) }, hi: { buyout: Math.min(100, n(m.base.sales.buyoutPct) + 10) } },
      { label: 'Комиссия ±3 п.п.', lo: { commission: n(m.base.sales.commissionPct) + 3 }, hi: { commission: Math.max(0, n(m.base.sales.commissionPct) - 3) } }
    ]);
    var rows = F.map(function (f) {
      var lo = metric(calc(m.base, Object.assign(emptySim(), f.lo))) - b0, hi = metric(calc(m.base, Object.assign(emptySim(), f.hi))) - b0;
      return { label: f.label, lo: Math.min(lo, hi), hi: Math.max(lo, hi), range: Math.abs(hi - lo) };
    }).sort(function (a, b) { return b.range - a.range; });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(Math.abs(r.lo), Math.abs(r.hi)); }).concat([0.01]));
    var W = 520, L = 190, mid = L + (W - L) / 2, half = (W - L) / 2 - 56, RH = 30;
    var svg = '<svg class="cf-tornado" viewBox="0 0 ' + W + ' ' + (rows.length * RH + 34) + '" role="img" aria-label="Чувствительность прибыли к факторам">' +
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
    return '<h2>Что сильнее всего влияет на ' + (hasSales ? 'прибыль с единицы' : 'себестоимость') + '</h2><p class="small muted" style="margin:4px 0 10px">Сверху — главные рычаги. Длина полосы — на сколько ₽ изменится результат при указанном изменении фактора.</p>' + svg;
  }

  function batchCurveHtml(m) {
    var sizes = [300, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000];
    var cur = Math.round(simVal(m, SIM[0]));
    if (sizes.indexOf(cur) < 0) { sizes.push(cur); sizes.sort(function (a, b) { return a - b; }); }
    var simNoBatch = Object.assign({}, m.sim, { batch: null });
    var pts = sizes.map(function (s) { return { s: s, v: calc(m.base, Object.assign({}, simNoBatch, { batch: s })).unit }; });
    var W = 520, H = 220, pl = 64, pr = 16, pt = 14, pb = 34;
    var minV = Math.min.apply(null, pts.map(function (p) { return p.v; })), maxV = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var lx = function (s) { return pl + (Math.log(s) - Math.log(sizes[0])) / (Math.log(sizes[sizes.length - 1]) - Math.log(sizes[0])) * (W - pl - pr); };
    var ly = function (v) { return pt + (1 - (v - minV * 0.95) / ((maxV - minV * 0.95) || 1)) * (H - pt - pb); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + lx(p.s).toFixed(1) + ' ' + ly(p.v).toFixed(1); }).join(' ');
    var ticks = [300, 1000, 3000, 10000, 30000];
    var yt = [minV, (minV + maxV) / 2, maxV];
    var cp = pts.filter(function (p) { return p.s === cur; })[0];
    var svg = '<svg class="cf-curve" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Себестоимость единицы в зависимости от размера партии">' +
      yt.map(function (v) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ly(v) + '" y2="' + ly(v) + '" class="cf-grid"/><text x="' + (pl - 8) + '" y="' + ly(v) + '" class="cf-ax" text-anchor="end" dominant-baseline="middle">' + rub(v, 0) + '</text>'; }).join('') +
      ticks.map(function (s) { return '<text x="' + lx(s) + '" y="' + (H - 12) + '" class="cf-ax" text-anchor="middle">' + (s >= 1000 ? (s / 1000) + ' тыс.' : s) + '</text>'; }).join('') +
      '<path d="' + d + '" class="cf-line"/>' +
      pts.map(function (p) { return '<circle cx="' + lx(p.s) + '" cy="' + ly(p.v) + '" r="12" class="cf-hit" data-tip="' + esc(p.s.toLocaleString('ru-RU') + ' шт. → ' + rub(p.v)) + '"/>'; }).join('') +
      (cp ? '<circle cx="' + lx(cp.s) + '" cy="' + ly(cp.v) + '" r="5" class="cf-dot"/><text x="' + lx(cp.s) + '" y="' + (ly(cp.v) - 12) + '" class="cf-dotlabel" text-anchor="middle">' + rub(cp.v) + '</text>' : '') + '</svg>';
    var first = pts[0], last = pts[pts.length - 1];
    return '<h2>Себестоимость и размер партии</h2><p class="small muted" style="margin:4px 0 10px">Наладка, доставка партии и разовые затраты делятся на тираж: от ' + rub(first.v) + ' при ' + first.s + ' шт. до ' + rub(last.v) + ' при ' + last.s.toLocaleString('ru-RU') + ' шт. Точка — текущая партия.</p>' + svg +
      '<details class="small"><summary style="cursor:pointer">Таблицей</summary><div class="table-wrap"><table class="table"><thead><tr><th scope="col">Партия</th><th scope="col">Себестоимость</th></tr></thead><tbody>' + pts.map(function (p) { return '<tr><td class="num">' + p.s.toLocaleString('ru-RU') + ' шт.</td><td class="num">' + rub(p.v) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  }

  // ---------- page ----------
  BM.views.cost = function (id) {
    var m = current(id), list = models(), tab = BM.ui.costTab;
    BM.ui.costModel = m.id;
    var projOpts = '<option value="">Без проекта</option>' + BM.state.projects.map(function (p) { return '<option value="' + p.id + '"' + (p.id === m.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
    return '<div class="page cf-page">' +
      '<div class="page-head"><div><span class="eyebrow">' + icon('calc', 'sm') + 'Себестоимость</span><h1 style="margin-top:8px">Себестоимость <span class="serif">и юнит-экономика</span></h1>' +
        '<p>Посчитайте реальную стоимость продукта от рецептуры до полки маркетплейса и проверьте сценарии: курс, партия, цена, реклама.</p></div></div>' +
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
    set('batch', r.batch.toLocaleString('ru-RU') + ' шт.');
    set('raw', rub(r.raw) + '/шт.'); set('pack', rub(r.pack) + '/шт.'); set('prod', rub(r.prod) + '/шт.'); set('once', rub(r.oneOff) + '/шт.');
    set('mark', rub(r.marking + r.logistics) + '/шт.'); set('sales', r.sales ? 'маржа ' + pct(r.sales.margin) : 'выключено');
    var ps = document.querySelector('[data-cf-pctsum]');
    if (ps) {
      var ok = Math.abs(r.pctSum - 100) < 0.05;
      ps.innerHTML = 'Сумма долей: <b class="num" style="color:' + (ok ? 'var(--ok)' : 'var(--danger)') + '">' + pct(r.pctSum, 2) + '</b>' + (ok ? '' : ' — должна быть 100%');
    }
  }
  function refreshResults(m) {
    var host = document.getElementById('cf-results');
    if (host) host.innerHTML = resultsHtml(m);
    updateSums(m);
  }
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
        var v = t.type === 'checkbox' ? t.checked : (t.tagName === 'SELECT' || /\.(name|cur)$/.test(t.dataset.cf) || t.dataset.cf === 'unit' ? t.value : t.value);
        setPath(m.base, t.dataset.cf, v);
        refreshResults(m); save(m);
        return;
      }
      if (t.dataset.cfMeta === 'name') { m.name = t.value; var o = document.querySelector('#cf-model option[value="' + m.id + '"]'); if (o) o.textContent = t.value || 'Без названия'; save(m); return; }
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
      if (t.dataset.cf === 'sales.enabled') { m.base.sales.enabled = t.checked; save(m); BM.render(); }
    });
    page.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-cf-toggle]'))) {
        var id = t.dataset.cfToggle, sec = t.closest('.cf-sec'), open = !sec.classList.contains('open');
        sec.classList.toggle('open', open); t.setAttribute('aria-expanded', open); BM.ui['cs_' + id] = open; return;
      }
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
          if (s.batch != null) b.batch = Math.round(s.batch);
          if (s.fx) { ['USD', 'EUR', 'CNY'].forEach(function (c) { b.rates[c] = +(n(b.rates[c]) * k(s.fx)).toFixed(2); }); }
          if (s.raw) b.ingredients.forEach(function (r) { r.price = +(n(r.price) * k(s.raw)).toFixed(2); });
          if (s.pack) b.packaging.forEach(function (r) { r.price = +(n(r.price) * k(s.pack)).toFixed(2); });
          if (s.prod) { b.production.fillPerUnit = +(n(b.production.fillPerUnit) * k(s.prod)).toFixed(2); b.production.laborPerUnit = +(n(b.production.laborPerUnit) * k(s.prod)).toFixed(2); }
          if (s.price) b.sales.price = Math.round(n(b.sales.price) * k(s.price));
          if (s.drr != null) b.sales.drrPct = s.drr;
          if (s.buyout != null) b.sales.buyoutPct = s.buyout;
          if (s.commission != null) b.sales.commissionPct = s.commission;
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
