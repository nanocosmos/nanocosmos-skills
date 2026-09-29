/* feature-wrapper demo: page wiring only. The player lives behind
 * NanoDemo.SwitchPlayer (js/player-wrapper.js); this file never touches
 * NanoPlayer directly. */
(function () {
  'use strict';
  var DEFAULT_STREAMS = ['CD6oL-2kE1g', 'HX26g-YVe8D'];
  var D = NanoDemo;
  var params = D.readParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    streams: $('streamsInput'), buttons: $('switchButtons'), log: $('logBox'),
    badge: $('statusBadge'), badgeText: $('statusBadgeText'),
    text: $('statusText'), stats: $('statusRight')
  };
  var status = D.statusHandlers(ui);
  var sp = new D.SwitchPlayer('player', { token: params.token, server: params.server });

  function eachButton(fn) { Array.prototype.forEach.call(ui.buttons.children, fn); }
  function markActive(index) { eachButton(function (b, i) { b.classList.toggle('is-active', i === index); }); }
  function setBusy(busy) { eachButton(function (b) { b.disabled = busy; }); }

  sp.on('state', function (e) { status.onState(e.data.state); });
  sp.on('stats', function (e) { status.onStats(e.data.stats); });
  sp.on('error', function (e) {
    status.onError(e.data.message);
    D.appendLog(ui.log, 'error', e.data.message);
  });
  sp.on('switching', function (e) {
    D.appendLog(ui.log, 'switching', '#' + e.data.from + ' → #' + e.data.to);
    setBusy(true);
  });
  sp.on('switched', function (e) {
    D.appendLog(ui.log, 'switched', 'now playing #' + e.data.index);
    setBusy(false);
    markActive(e.data.index);
  });

  function parseList(text) {
    return String(text || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function renderButtons(list) {
    ui.buttons.textContent = '';
    list.forEach(function (stream, i) {
      var b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.textContent = stream;
      b.addEventListener('click', function () {
        // A failed switch is already reported through the 'error' event.
        sp.switchTo(i).catch(function () { setBusy(false); });
      });
      ui.buttons.appendChild(b);
    });
    markActive(0);
  }

  function load() {
    var list = parseList(ui.streams.value);
    if (!list.length) {
      status.onState('error');
      status.onError('Enter at least one stream.');
      return;
    }
    renderButtons(list);
    sp.load(list.map(function (s) { return { label: s, stream: s }; }));
  }

  var initial = parseList(params.params.get('streams'));
  ui.streams.value = (initial.length ? initial : DEFAULT_STREAMS).join(', ');
  $('btnLoad').addEventListener('click', load);
  $('btnStop').addEventListener('click', function () { sp.destroy(); ui.buttons.textContent = ''; });
  ui.streams.addEventListener('keydown', function (e) { if (e.key === 'Enter') { load(); } });
  load();
})();
