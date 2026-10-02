/* feature-wrapper demo: page wiring only. The player lives behind
 * NanoDemo.SwitchPlayer (js/player-wrapper.js); this file never touches
 * NanoPlayer directly. PLAYER_CONFIG below is the single source of player
 * options; the wrapper only swaps source.group.id. */
(function () {
  'use strict';
  // ── Player configuration ────────────────────────────────────────────────
  // This object is what nanoPlayer receives (the demo only adds event
  // handlers). Edit it to change the demo; the Configuration panel on the
  // page shows the result and lets you copy it.
  // Reference: https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api
  var PLAYER_CONFIG = {
    source: {
      group: {
        id: 'b6638d50-3581-4349-8fb2-59b3406c2dde', // bintu stream group (ABR). URL: ?group=
        startQuality: 'medium', // high | medium-high | medium | medium-low | low (default low)
        security: {}            // secure playback: { jwtoken: '…' }. URL: ?token=
        // apiurl: 'https://bintu.nanocosmos.de' // optional, this is the default
      },
      options: {
        adaption: { rule: 'deviationOfMean2' }, // ABR on. 'none' = keep the start quality
        switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 }
      }
    },
    playback: {
      autoplay: true,
      automute: true,  // if the browser blocks sound, start muted instead of not at all
      muted: false,    // try with sound first
      faststart: true,
      enableMediaOverQuic: true, // MoQ where the browser supports it, else WebSocket
      latencyControlMode: 'balancedadaptive' // classic | fastadaptive | balancedadaptive
    },
    style: {
      width: '100%', height: '100%', // fills the page's video area
      scaling: 'letterbox',          // letterbox | fill | crop
      controls: false                // the demo has its own controls
    }
  };

  // Groups to switch between; the label is shown on the buttons. URL: ?groups=a,b
  // UNVERIFIED: 'HX26g-YVe8D' is a stream name used as group.id. It resolved a
  // group in nanostream-development's test, but the docs define group.id as a
  // bintu group ID: replace it with a real second group before sharing.
  var GROUPS = [
    { label: 'Group A', id: 'b6638d50-3581-4349-8fb2-59b3406c2dde' },
    { label: 'Group B', id: 'HX26g-YVe8D' }
  ];

  var D = NanoDemo;
  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    groups: $('groupsInput'), buttons: $('switchButtons'), log: $('logBox'),
    badge: $('statusBadge'), badgeText: $('statusBadgeText'),
    text: $('statusText'), stats: $('statusRight')
  };
  var status = D.statusHandlers(ui);
  var panel = D.mountConfigPanel({
    toggle: $('configToggle'), pre: $('configJson'), copy: $('btnCopyConfig'), confirm: $('configCopied')
  });

  var config;
  try {
    config = D.applyUrlParams(PLAYER_CONFIG, location.search);
  } catch (err) {
    status.onState('error');
    status.onError(err.message);
    panel.render(PLAYER_CONFIG);
    return;
  }
  var sp = new D.SwitchPlayer('player', { config: config });

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
    panel.render(sp.config);
  });

  function parseList(text) {
    return String(text || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // Ids from the field, with the label from GROUPS where the id is known.
  function groupsFromField() {
    return parseList(ui.groups.value).map(function (id) {
      var known = GROUPS.filter(function (g) { return g.id === id; })[0];
      return { label: known ? known.label : id, id: id };
    });
  }

  function renderButtons(list) {
    ui.buttons.textContent = '';
    list.forEach(function (group, i) {
      var b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.textContent = group.label;
      b.title = group.id;
      b.addEventListener('click', function () {
        // A failed switch is already reported through the 'error' event.
        sp.switchTo(i).catch(function () { setBusy(false); });
      });
      ui.buttons.appendChild(b);
    });
    markActive(0);
  }

  function load() {
    var list = groupsFromField();
    if (!list.length) {
      status.onState('error');
      status.onError('Enter at least one group ID.');
      return;
    }
    renderButtons(list);
    panel.render(D.withSourceId(config, list[0].id));
    // Refusals and failures arrive as 'error' events; nothing else to do here.
    sp.load(list).catch(function () {});
  }

  var urlGroups = parseList(new URLSearchParams(location.search).get('groups'));
  ui.groups.value = (urlGroups.length ? urlGroups : GROUPS.map(function (g) { return g.id; })).join(', ');
  $('btnLoad').addEventListener('click', load);
  $('btnStop').addEventListener('click', function () { sp.destroy(); ui.buttons.textContent = ''; });
  ui.groups.addEventListener('keydown', function (e) { if (e.key === 'Enter') { load(); } });
  load();
})();
