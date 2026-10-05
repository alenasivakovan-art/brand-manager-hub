(function () {
  'use strict';
  // Two-way sync of cost calculations with a Google Sheet through its Apps Script web app (google-sheets.gs).
  var BM = window.BM, esc = BM.esc, icon = BM.icon;
  var CUR = ['RUB', 'USD', 'EUR', 'CNY'];
  var STAGE_IDS = ['brand', 'formula', 'design', 'cert', 'purchase', 'production', 'logistics', 'launch'];
  var CHF = ['price', 'commissionPct', 'acquiringPct', 'logistics', 'logisticsCoef', 'lastMilePct', 'processing', 'returnCost', 'storage', 'acceptance', 'buyoutPct', 'drrPct'];
  var st = { busy: false, stamp: null, lastOk: 0, lastPoll: 0, error: null, url: null, pushTimer: null, pending: false };

  function cfg() { var s = BM.settings; return s.gsUrl && s.gsKey ? { url: String(s.gsUrl).trim(), key: String(s.gsKey).trim() } : null; }
  function call(action, payload, conf) {
    var c = conf || cfg();
    if (!c) return Promise.reject(new Error('Таблица не подключена'));
    // text/plain keeps it a simple request: no CORS preflight, which Apps Script does not answer.
    return fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', cache: 'no-store',
      body: JSON.stringify(Object.assign({ action: action, key: c.key }, payload || {})) })
      .then(function (r) { if (!r.ok) throw new Error('Таблица ответила ' + r.status); return r.text(); })
      .then(function (t) {
        var d; try { d = JSON.parse(t); } catch (e) { throw new Error('Проверьте URL: это должен быть адрес веб-приложения, оканчивающийся на /exec, с доступом «Все»'); }
        if (!d.ok) throw new Error(d.error || 'Ошибка таблицы');
        return d;
      });
  }

  // ---------- canonical inputs (same shape the sheet returns) ----------
  function num(v) { var x = typeof v === 'number' ? v : BM.num(v); return x == null || !isFinite(x) ? 0 : Math.round(x * 1e6) / 1e6; }
  function str(v) { return String(v == null ? '' : v).trim(); }
  function bool(v) { return v === true || v === 'TRUE' || v === 'true'; }
  function cur(v) { v = str(v).toUpperCase(); return CUR.indexOf(v) > -1 ? v : 'RUB'; }
  function named(list) { return (list || []).filter(function (x) { return str(x.name); }); }
  function norm(o) {
    var r = o.rates || {}, pr = o.production || {}, mk = o.marking || {}, lg = o.logistics || {}, tx = o.tax || {}, mt = o.marketing || {}, s = o.sales || {}, mp = o.mp || {};
    var ch = function (c) { c = c || {}; var x = { enabled: bool(c.enabled) }; CHF.forEach(function (k) { x[k] = num(c[k]); }); return x; };
    return {
      name: str(o.name), unitVolume: num(o.unitVolume), unit: str(o.unit) === 'г' ? 'г' : 'мл', density: num(o.density), batch: num(o.batch), defectPct: num(o.defectPct),
      rates: { USD: num(r.USD), EUR: num(r.EUR), CNY: num(r.CNY) }, includeOneOff: bool(o.includeOneOff),
      ingredients: named(o.ingredients).map(function (x) { return { name: str(x.name), pct: num(x.pct), price: num(x.price), cur: cur(x.cur), loss: num(x.loss) }; }),
      packaging: named(o.packaging).map(function (x) { return { name: str(x.name), price: num(x.price), cur: cur(x.cur), scrap: num(x.scrap) }; }),
      production: { fillPerUnit: num(pr.fillPerUnit), laborPerUnit: num(pr.laborPerUnit), setupPerBatch: num(pr.setupPerBatch) },
      oneOff: named(o.oneOff).map(function (x) { return { name: str(x.name), amount: num(x.amount), batches: num(x.batches), stage: STAGE_IDS.indexOf(x.stage) > -1 ? x.stage : 'brand' }; }),
      marking: { codePerUnit: num(mk.codePerUnit), applyPerUnit: num(mk.applyPerUnit) },
      logistics: { inboundPerBatch: num(lg.inboundPerBatch), fulfilPerUnit: num(lg.fulfilPerUnit) },
      tax: { mode: tx.mode === 'profit' ? 'profit' : 'income', rate: num(tx.rate) },
      marketing: { monthlyBudget: num(mt.monthlyBudget), monthlyUnits: num(mt.monthlyUnits) },
      salesMode: o.salesMode === 'mp' ? 'mp' : 'simple',
      sales: { enabled: bool(s.enabled), price: num(s.price), commissionPct: num(s.commissionPct), mpLogistics: num(s.mpLogistics), storagePerUnit: num(s.storagePerUnit), drrPct: num(s.drrPct), buyoutPct: num(s.buyoutPct), returnCost: num(s.returnCost) },
      mp: { wb: ch(mp.wb), ozon: ch(mp.ozon), ym: ch(mp.ym) }
    };
  }
  function fromModel(m) {
    var b = m.base;
    return norm({ name: m.name, unitVolume: b.unitVolume, unit: b.unit, density: b.density, batch: b.batch, defectPct: b.defectPct, rates: b.rates, includeOneOff: b.includeOneOff,
      ingredients: b.ingredients, packaging: b.packaging, production: b.production, oneOff: b.oneOff, marking: b.marking, logistics: b.logistics,
      tax: b.tax, marketing: b.marketing, salesMode: b.salesMode, sales: b.sales, mp: b.mp });
  }
  function key(m) { return JSON.stringify(fromModel(m)); }
  function applyTo(m, inp) {
    var b = m.base;
    if (inp.name) m.name = inp.name;
    ['unitVolume', 'unit', 'density', 'batch', 'defectPct', 'includeOneOff', 'salesMode'].forEach(function (k) { b[k] = inp[k]; });
    b.rates = Object.assign({}, b.rates, inp.rates);
    b.ingredients = inp.ingredients; b.packaging = inp.packaging; b.oneOff = inp.oneOff;
    b.production = inp.production; b.marking = inp.marking; b.logistics = inp.logistics; b.tax = inp.tax; b.marketing = inp.marketing;
    b.sales = Object.assign({}, b.sales, inp.sales);
    ['wb', 'ozon', 'ym'].forEach(function (k) { b.mp[k] = Object.assign({}, b.mp[k], inp.mp[k]); });
    m.updatedAt = Date.now();
  }
  // Landed import costs computed on the site are written next to the rows they replace.
  function payload(m) {
    var r = BM.costCalc(m.base), b = m.base, ov = { ing: [], pack: [] }, round = function (v) { return Math.round(v * 100) / 100; };
    if (r.useImp && !r.finished) {
      b.ingredients.forEach(function (x, i) { if (str(x.name)) ov.ing.push(r.ingRows[i] && r.ingRows[i].imported ? round(r.ingRows[i].cost) : ''); });
      b.packaging.forEach(function (x, i) { if (str(x.name)) ov.pack.push(r.packRows[i] && r.packRows[i].imported ? round(r.packRows[i].cost) : ''); });
    }
    return { id: m.id, brand: brandOf(m), inputs: fromModel(m), overrides: ov,
      note: r.useImp && r.finished ? 'Готовый продукт закупается в Китае: импорт считается на сайте, формулы этой вкладки его не учитывают.' : '' };
  }
  function models() { return BM.state.costModels || []; }
  function brandOf(m) { var p = BM.state.projects.filter(function (x) { return x.id === m.projectId; })[0]; return p ? p.name : ''; }
  function isDirty(m) { return key(m) !== m.gsSnap || brandOf(m) !== (m.gsBrand || ''); }

  // ---------- sync ----------
  function setStatus(err) {
    st.error = err || null; if (!err) st.lastOk = Date.now();
    var html = statusHtml();
    document.querySelectorAll('[data-gs-status]').forEach(function (el) { el.innerHTML = html; });
  }
  function pushNow() {
    clearTimeout(st.pushTimer); st.pushTimer = null;
    if (!cfg() || !navigator.onLine) return Promise.resolve();
    if (st.busy) { st.pending = true; return Promise.resolve(); }
    var dirty = models().filter(isDirty);
    var removed = (BM.state.gsRemoved || []).slice();
    if (!dirty.length && !removed.length) return Promise.resolve();
    var snaps = dirty.map(key), brands = dirty.map(brandOf);
    st.busy = true; setStatus(st.error);
    return call('push', { products: dirty.map(payload), order: models().map(function (m) { return m.id; }), remove: removed })
      .then(function (res) {
        dirty.forEach(function (m, i) { m.gsSnap = snaps[i]; m.gsBrand = brands[i]; });
        BM.state.gsRemoved = (BM.state.gsRemoved || []).filter(function (id) { return removed.indexOf(id) < 0; });
        st.url = res.url || st.url; BM.persist(); setStatus(null);
      })
      .catch(function (e) { setStatus(e.message); })
      .then(function () { st.busy = false; if (st.pending) { st.pending = false; schedule(300); } });
  }
  function schedule(delay) { if (!cfg()) return; clearTimeout(st.pushTimer); st.pushTimer = setTimeout(pushNow, delay == null ? 1200 : delay); }
  function editing() { var a = document.activeElement; return !!(a && a.closest && a.closest('.cf-page') && /INPUT|SELECT|TEXTAREA/.test(a.tagName)); }
  function rerender() {
    if ((location.hash || '').indexOf('#/cost') !== 0) return;
    if (editing()) { setTimeout(rerender, 1500); return; }
    BM.render();
  }
  function pull(force) {
    if (!cfg() || !navigator.onLine || st.busy) return Promise.resolve();
    st.busy = true; st.lastPoll = Date.now();
    return call('pull', { since: force ? null : st.stamp })
      .then(function (res) {
        st.stamp = res.stamp; st.url = res.url || st.url;
        if (!res.changed) return;
        var byId = {}, changed = [], needPush = false;
        (res.products || []).forEach(function (p) { byId[p.id] = p; });
        models().forEach(function (m) {
          var p = byId[m.id];
          if (!p) { needPush = true; m.gsSnap = null; return; }
          var sheet = norm(p.inputs), sj = JSON.stringify(sheet), local = key(m);
          if (local === sj) { m.gsSnap = sj; return; }
          if (m.gsSnap && local === m.gsSnap) { applyTo(m, sheet); m.gsSnap = sj; changed.push(m.name); }
          else needPush = true; // unsynced edits on the site win; they go to the sheet next
        });
        if (changed.length) { BM.persist(); BM.toast('Обновлено из Google Таблицы: ' + changed.join(', ')); rerender(); }
        if (needPush) schedule(200);
      })
      .then(function () { setStatus(null); }, function (e) { setStatus(e.message); })
      .then(function () { st.busy = false; if (st.pending) { st.pending = false; schedule(300); } });
  }
  function tick() {
    if (!cfg() || document.hidden || !navigator.onLine) return;
    var onCost = (location.hash || '').indexOf('#/cost') === 0;
    if (Date.now() - st.lastPoll > (onCost ? 8000 : 45000)) pull(false);
  }
  setInterval(tick, 3000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { st.lastPoll = 0; tick(); } });

  // ---------- UI helpers ----------
  function time(t) { return new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function statusHtml() {
    if (!cfg()) return '<span class="gs-dot off"></span><span>Google Таблица не подключена</span><a class="gs-link" href="#/settings">Подключить</a>';
    var cls = st.error ? 'err' : st.busy ? 'busy' : st.lastOk ? 'ok' : 'busy';
    var text = st.error ? 'Ошибка: ' + esc(st.error) : st.busy ? 'Синхронизирую с таблицей…' : st.lastOk ? 'Google Таблица: синхронизировано в ' + time(st.lastOk) : 'Подключаюсь к таблице…';
    return '<span class="gs-dot ' + cls + '"></span><span>' + text + '</span>' +
      (st.url ? '<a class="gs-link" href="' + esc(st.url) + '" target="_blank" rel="noopener noreferrer">' + icon('external', 'sm') + 'Открыть таблицу</a>' : '') +
      '<button type="button" class="gs-link" data-gs-sync>' + icon('refresh', 'sm') + 'Обновить</button>';
  }
  function connect(url, k) {
    var c = { url: String(url || '').trim(), key: String(k || '').trim() };
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(c.url)) return Promise.reject(new Error('Адрес должен выглядеть так: https://script.google.com/macros/s/…/exec'));
    if (!c.key) return Promise.reject(new Error('Вставьте ключ подключения из меню таблицы'));
    return call('ping', {}, c).then(function (res) {
      BM.settings.gsUrl = c.url; BM.settings.gsKey = c.key; BM.saveSettings();
      st.url = res.url; st.stamp = null; models().forEach(function (m) { m.gsSnap = null; });
      return pushNow().then(function () { return res; });
    });
  }
  function disconnect() { BM.settings.gsUrl = ''; BM.settings.gsKey = ''; BM.saveSettings(); st.url = null; st.error = null; st.lastOk = 0; }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-gs-sync]')) { st.stamp = null; pushNow().then(function () { return pull(true); }); setStatus(st.error); }
  });

  // ---------- settings page ----------
  var scriptText = null;
  function loadScript() { return scriptText ? Promise.resolve(scriptText) : fetch('google-sheets-script.txt', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) { scriptText = t; return t; }); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    var ok = document.execCommand('copy'); ta.remove(); return ok ? Promise.resolve() : Promise.reject();
  }
  window.addEventListener('hashchange', function () { if ((location.hash || '').indexOf('#/settings') === 0) loadScript().catch(function () {}); });
  if ((location.hash || '').indexOf('#/settings') === 0) loadScript().catch(function () {});
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-gs-copy]')) {
      loadScript().then(copyText).then(function () { BM.toast('Код скрипта скопирован — вставьте его в Apps Script'); },
        function () { BM.toast('Не удалось скопировать — откройте «посмотреть» и скопируйте вручную'); });
    }
    if (e.target.closest('[data-gs-off]')) {
      BM.confirm('Отключить Google Таблицу?', 'Сайт перестанет обмениваться данными с таблицей. Сама таблица и её данные останутся.', 'Отключить', function () { disconnect(); BM.render(); BM.toast('Таблица отключена'); });
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.matches('[data-form="gsheet"]')) return;
    e.preventDefault();
    var d = BM.formData(f), btn = f.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    BM.toast('Подключаюсь к таблице…');
    connect(d.url, d.key).then(function (res) { BM.toast('Таблица «' + res.name + '» подключена, расчёты выгружены'); BM.render(); },
      function (err) { BM.toast('Не удалось подключить: ' + err.message); if (btn) btn.disabled = false; });
  });

  BM.gsheet = {
    schedule: schedule, pull: pull, push: pushNow, connect: connect, disconnect: disconnect, statusHtml: statusHtml, state: st, enabled: function () { return !!cfg(); },
    removeModel: function (id) { if (!cfg()) return; BM.state.gsRemoved = (BM.state.gsRemoved || []).concat(id); schedule(300); },
    _norm: norm, _fromModel: fromModel
  };
})();
