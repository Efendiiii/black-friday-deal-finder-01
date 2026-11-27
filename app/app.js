// Verdict Friday — search, filter, sort and render. No network: every deal
// comes from deals.js, which ships with the site. State also lives in the
// URL query (?q=&cat=&store=&off=&sort=) so a filtered view can be shared.

(function () {
  'use strict';

  var CATEGORIES = ["Audio", "TVs", "Wearables", "Laptops & Tablets", "Gaming & Toys", "Home & Kitchen", "E-readers", "Accessories", "Monitors", "PC Parts"];
  var STORES = ["Amazon", "Best Buy", "Walmart", "Target", "Newegg"];
  var OFFS = [
    { key: "all", label: "Any discount" },
    { key: "strong", label: "Strong ≥40%" },
    { key: "good", label: "Good 20–39%" },
    { key: "weak", label: "Weak <20%" }
  ];

  var grid = document.getElementById('grid');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var qEl = document.getElementById('q');
  var sortEl = document.getElementById('sort');

  var params = new URLSearchParams(location.search);
  var state = {
    q: params.get('q') || '',
    cat: params.get('cat') || 'all',
    store: params.get('store') || 'all',
    off: params.get('off') || 'all',
    sort: params.get('sort') || 'pct-desc'
  };

  function pct(d) { return Math.round((d.was - d.sale) / d.was * 100); }
  function save(d) { return d.was - d.sale; }
  function verdict(d) {
    var p = pct(d);
    if (p >= 40) return 'strong';
    if (p >= 20) return 'good';
    return 'weak';
  }
  function verdictLabel(v) {
    return v === 'strong' ? 'Strong deal' : v === 'good' ? 'Good deal' : 'Weak deal';
  }
  function money(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  // ---- stats (computed from the data, so they can never drift) ----
  (function fillStats() {
    var strong = DEALS.filter(function (d) { return verdict(d) === 'strong'; }).length;
    var total = DEALS.reduce(function (s, d) { return s + save(d); }, 0);
    document.getElementById('stat-deals').textContent = String(DEALS.length);
    document.getElementById('stat-strong').textContent = String(strong);
    document.getElementById('stat-savings').textContent =
      '$' + Math.round(total).toLocaleString('en-US');
  })();

  // ---- filter chips ----
  function chipGroup(containerId, options, key, allLabel) {
    var box = document.getElementById(containerId);
    var hasAll = options.some(function (o) { return (typeof o === 'string' ? o : o.key) === 'all'; });
    var items = (hasAll ? [] : [{ key: 'all', label: allLabel }]).concat(options.map(function (o) {
      return typeof o === 'string' ? { key: o, label: o } : o;
    }));
    items.forEach(function (item) {
      var b = el('button', 'chip' + (state[key] === item.key ? ' on' : ''));
      b.type = 'button';
      b.textContent = item.label;
      b.setAttribute('aria-pressed', state[key] === item.key ? 'true' : 'false');
      b.addEventListener('click', function () {
        state[key] = item.key;
        syncChips();
        render();
      });
      b.dataset.key = item.key;
      box.appendChild(b);
    });
  }
  function syncChips() {
    [['cat-filters', 'cat'], ['store-filters', 'store'], ['off-filters', 'off']].forEach(function (pair) {
      var box = document.getElementById(pair[0]);
      Array.prototype.forEach.call(box.children, function (b) {
        var on = b.dataset.key === state[pair[1]];
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  }
  chipGroup('cat-filters', CATEGORIES, 'cat', 'All categories');
  chipGroup('store-filters', STORES, 'store', 'All stores');
  chipGroup('off-filters', OFFS, 'off', 'Any discount');

  // ---- search + sort controls ----
  qEl.value = state.q;
  sortEl.value = state.sort;
  qEl.addEventListener('input', function () { state.q = qEl.value; render(); });
  sortEl.addEventListener('change', function () { state.sort = sortEl.value; render(); });

  function matches(d) {
    if (state.cat !== 'all' && d.category !== state.cat) return false;
    if (state.store !== 'all' && d.store !== state.store) return false;
    if (state.off !== 'all' && verdict(d) !== state.off) return false;
    if (state.q) {
      var hay = (d.name + ' ' + d.store + ' ' + d.category).toLowerCase();
      var needles = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < needles.length; i++) {
        if (hay.indexOf(needles[i]) === -1) return false;
      }
    }
    return true;
  }

  function sortList(list) {
    var s = state.sort;
    return list.slice().sort(function (a, b) {
      if (s === 'pct-desc') return pct(b) - pct(a) || save(b) - save(a);
      if (s === 'save-desc') return save(b) - save(a) || pct(b) - pct(a);
      if (s === 'price-asc') return a.sale - b.sale;
      return b.sale - a.sale;
    });
  }

  function card(d) {
    var v = verdict(d);
    var article = el('article', 'card');
    var top = el('div', 'card-top');
    top.appendChild(el('span', 'cat', d.category));
    top.appendChild(el('span', 'store-badge store-' + d.store.toLowerCase().replace(/\s+/g, '-'), d.store));
    article.appendChild(top);
    article.appendChild(el('h3', 'name', d.name));
    var prices = el('p', 'prices');
    prices.appendChild(el('span', 'sale', money(d.sale)));
    prices.appendChild(el('span', 'was', money(d.was)));
    article.appendChild(prices);
    var saveRow = el('div', 'save-row');
    saveRow.appendChild(el('p', 'save-line',
      'Save ' + money(save(d)) + ' (' + pct(d) + '% off)'));
    saveRow.appendChild(el('span', 'pill ' + v, verdictLabel(v)));
    article.appendChild(saveRow);
    var meta = el('p', 'meta', 'Checked ' + d.checked + ' · Source: ' + d.source);
    article.appendChild(meta);
    var a = el('a', 'cta', 'View at ' + d.store + ' →');
    a.href = d.url;
    a.rel = 'noopener';
    a.target = '_blank';
    article.appendChild(a);
    return article;
  }

  function render() {
    var list = sortList(DEALS.filter(matches));
    grid.textContent = '';
    list.forEach(function (d) { grid.appendChild(card(d)); });
    var total = DEALS.length;
    countEl.textContent = list.length === total
      ? 'Showing all ' + total + ' deals, biggest discount first'
      : 'Showing ' + list.length + ' of ' + total + ' deals';
    emptyEl.hidden = list.length !== 0;
    var qs = new URLSearchParams();
    if (state.q) qs.set('q', state.q);
    if (state.cat !== 'all') qs.set('cat', state.cat);
    if (state.store !== 'all') qs.set('store', state.store);
    if (state.off !== 'all') qs.set('off', state.off);
    if (state.sort !== 'pct-desc') qs.set('sort', state.sort);
    var next = qs.toString();
    try {
      history.replaceState(null, '', next ? '?' + next : location.pathname);
    } catch (e) { /* file:// or sandboxed: state still works in-page */ }
  }

  render();
})();
