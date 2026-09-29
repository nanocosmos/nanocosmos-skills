/* nanoplayer-demo core: shared helpers for every nanoPlayer demo.
 *
 * Classic script, so demos open from file://. Browser: window.NanoDemo.
 * Node (tests): module.exports. Copied unmodified into each demo as
 * js/demo-core.js by scripts/new-demo.mjs; fix bugs here, not in a demo.
 *
 * Player facts (config values, events, lifecycle) follow
 * nanostream-development/SKILL.md. When the player changes, change it there
 * first, then here.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  else { root.NanoDemo = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var CDN_URL = 'https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js';
  var DEFAULTS = {
    stream: 'CD6oL-2kE1g',
    serverDomain: 'bintu-play.nanocosmos.de',
    apiUrl: 'https://bintu.nanocosmos.de',
    latencyControlMode: 'balancedadaptive'
  };
  var LATENCY_MODES = ['fastadaptive', 'balancedadaptive', 'classic'];
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
  var TOKEN_PARAM_RE = /([?&](?:token|jwtoken)=)[^&#\s"'<>]*/gi;
  var DASH = '—';

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i] || {};
      for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) { target[k] = src[k]; } }
    }
    return target;
  }

  function isUuid(s) { return UUID_RE.test(String(s == null ? '' : s).trim()); }

  // Standard demo URL params: ?stream= ?token= (alias ?jwtoken=) ?server=
  function readParams(search, defaults) {
    var d = assign({}, DEFAULTS, defaults);
    var p = new URLSearchParams(search || '');
    return {
      stream: (p.get('stream') || '').trim() || d.stream,
      token: (p.get('token') || p.get('jwtoken') || '').trim(),
      server: (p.get('server') || '').trim() || d.serverDomain,
      params: p
    };
  }

  // One base source; a UUID plays as a group, anything else as a stream name.
  function buildSource(opts) {
    opts = opts || {};
    var stream = String(opts.stream == null ? '' : opts.stream).trim();
    if (!stream) { throw new Error('Enter a stream name (XXXXX-YYYYY) or a group ID.'); }
    var security = opts.token ? { jwtoken: opts.token } : {};
    var source = {
      defaults: { service: 'bintu' },
      general: { serverDomain: opts.server || DEFAULTS.serverDomain },
      options: { switch: { timeout: 10 }, adaption: { rule: 'deviationOfMean2' } },
      startIndex: 0
    };
    if (isUuid(stream)) {
      source.group = { id: stream, apiurl: opts.apiUrl || DEFAULTS.apiUrl, security: security };
    } else {
      source.entries = [{ h5live: { rtmp: { streamname: stream }, security: security } }];
    }
    return source;
  }

  function buildConfig(opts) {
    opts = opts || {};
    var playback = assign({
      autoplay: true, automute: true, muted: true,
      enableMediaOverQuic: true, faststart: true,
      latencyControlMode: DEFAULTS.latencyControlMode
    }, opts.playback);
    if (LATENCY_MODES.indexOf(playback.latencyControlMode) < 0) {
      throw new Error('latencyControlMode must be one of ' + LATENCY_MODES.join(', ') +
        ' (a control behavior, not a latency in seconds). Got "' + playback.latencyControlMode + '".');
    }
    if (playback.autoplay) { playback.automute = true; } // browsers block unmuted autoplay
    var style = assign({ scaling: 'fill', width: '100%', height: '100%', view: true, controls: false }, opts.style);
    return { source: opts.source, playback: playback, style: style, events: opts.events || {} };
  }

  function errorMessage(e) {
    var d = (e && e.data) || {};
    if (d.message) { return String(d.message); }
    if (d.error && typeof d.error === 'object' && d.error.message) { return String(d.error.message); }
    if (d.error) { return String(d.error); }
    if (d.code != null) { return 'Player error ' + d.code; }
    if (e && e.message) { return String(e.message); }
    return 'Unknown player error';
  }

  function redact(text) {
    return String(text == null ? '' : text)
      .replace(TOKEN_PARAM_RE, '$1[redacted]')
      .replace(JWT_RE, '[redacted]');
  }

  // onStats field names vary by player build; take the first numeric match.
  // Verified against a live payload in Task 15 of the implementation plan.
  function num(v) {
    if (v && typeof v === 'object' && typeof v.current === 'number') { return v.current; }
    return (typeof v === 'number' && isFinite(v)) ? v : null;
  }
  function pick(obj, paths) {
    for (var i = 0; i < paths.length; i++) {
      var parts = paths[i].split('.');
      var v = obj;
      for (var j = 0; j < parts.length && v != null; j++) { v = v[parts[j]]; }
      var n = num(v);
      if (n != null) { return n; }
    }
    return null;
  }
  function formatStats(stats) {
    var s = stats || {};
    var lat = pick(s, ['latency', 'latencyVideo', 'currentLatency']);
    var br = pick(s, ['bitrate', 'playoutBitrate', 'videoBitrate', 'qosBitrateRendered']);
    var buf = pick(s, ['buffer.delay', 'bufferDelay', 'bufferLength', 'buffer']);
    var fps = pick(s, ['framerate', 'frameRate']);
    return {
      latency: lat == null ? DASH : lat.toFixed(2) + ' s',
      bitrate: br == null ? DASH : Math.round(br) + ' kbps',
      buffer: buf == null ? DASH : buf.toFixed(2) + ' s',
      framerate: fps == null ? DASH : fps.toFixed(0) + ' fps'
    };
  }
  function statsLine(stats) {
    var f = formatStats(stats);
    return 'Latency ' + f.latency + ' · Bitrate ' + f.bitrate + ' · Buffer ' + f.buffer;
  }

  // ---- events --------------------------------------------------------------
  // Events are passed in setup({ events }); never player.on() after setup()
  // (the SDK can fire onReady/onPlay before a .then() callback runs).
  function playerEvents(h) {
    h = h || {};
    function state(s, e) { if (h.onState) { h.onState(s, e); } }
    function log(name, e) { if (h.onLog) { h.onLog(name, e); } }
    function info(e) { if (h.onStreamInfo) { h.onStreamInfo(e && e.data && e.data.streamInfo, e); } }
    var events = {
      onReady: function (e) { log('onReady', e); state('connecting', e); },
      onStreamInfo: function (e) { log('onStreamInfo', e); info(e); },
      onStreamInfoUpdate: function (e) { log('onStreamInfoUpdate', e); info(e); },
      onStreamInfoError: function (e) {
        log('onStreamInfoError', e);
        state('error', e);
        if (h.onError) { h.onError('Stream not found or offline: ' + errorMessage(e), e); }
      },
      onPlay: function (e) { log('onPlay', e); state('playing', e); },
      onPause: function (e) { log('onPause', e); state('paused', e); },
      onStartBuffering: function (e) { log('onStartBuffering', e); state('buffering', e); },
      onStopBuffering: function (e) { log('onStopBuffering', e); state('playing', e); },
      onError: function (e) {
        log('onError', e);
        state('error', e);
        if (h.onError) { h.onError(errorMessage(e), e); }
      },
      onWarning: function (e) { log('onWarning', e); },
      onStats: function (e) { if (h.onStats) { h.onStats(e && e.data && e.data.stats, e); } }
    };
    var extra = h.extra || {};
    Object.keys(extra).forEach(function (name) {
      var base = events[name];
      var add = extra[name];
      events[name] = base
        ? function (e) { base(e); add(e); }
        : function (e) { log(name, e); add(e); };
    });
    return events;
  }

  // ---- status UI (theme badge classes: paused / loading / playing) ----------
  var STATUS = {
    idle: { badge: 'paused', label: 'Idle' },
    connecting: { badge: 'loading', label: 'Connecting' },
    buffering: { badge: 'loading', label: 'Buffering' },
    playing: { badge: 'playing', label: 'Live' },
    paused: { badge: 'paused', label: 'Paused' },
    error: { badge: 'paused', label: 'Error' }
  };
  function statusView(s) { return STATUS[s] || STATUS.idle; }
  function renderStatus(badgeEl, labelEl, s) {
    var v = statusView(s);
    badgeEl.className = 'badge ' + v.badge;
    labelEl.textContent = v.label;
  }
  // Standard status-bar wiring: ui = { badge, badgeText, text, stats? }.
  // An error message stays visible until connecting/playing/idle clears it.
  // The player pauses right after an error; that pause keeps the Error badge.
  function statusHandlers(ui) {
    var current = 'idle';
    return {
      onState: function (s) {
        if (current === 'error' && s === 'paused') { return; }
        current = s;
        renderStatus(ui.badge, ui.badgeText, s);
        if (s === 'connecting' || s === 'playing' || s === 'idle') { ui.text.textContent = ''; }
        if (s === 'idle' && ui.stats) { ui.stats.textContent = statsLine(null); }
      },
      onError: function (msg) { ui.text.textContent = msg; },
      onStats: function (stats) { if (ui.stats) { ui.stats.textContent = statsLine(stats); } }
    };
  }

  // ---- log + report -------------------------------------------------------
  function appendLog(box, name, detail, max) {
    var doc = box.ownerDocument;
    var line = doc.createElement('div');
    line.className = 'log-line';
    var ts = doc.createElement('span');
    ts.className = 'ts';
    ts.textContent = new Date().toISOString().slice(11, 23);
    var evt = doc.createElement('span');
    evt.className = 'evt';
    evt.textContent = name + (detail ? ' ' + redact(detail) : '');
    line.appendChild(ts);
    line.appendChild(evt);
    box.appendChild(line);
    while (box.childNodes.length > (max || 300)) { box.removeChild(box.firstChild); }
    box.scrollTop = box.scrollHeight;
  }

  function flatten(obj, prefix, out) {
    out = out || [];
    if (!obj || typeof obj !== 'object') { return out; }
    Object.keys(obj).forEach(function (k) {
      var key = prefix ? prefix + '.' + k : k;
      var v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) { flatten(v, key, out); }
      else { out.push([key, Array.isArray(v) ? JSON.stringify(v) : v]); }
    });
    return out;
  }

  // Plain-text report for support tickets. Redacted as a whole.
  function buildReport(info) {
    var i = info || {};
    var lines = [
      'nanoPlayer demo diagnostics report',
      'Time (UTC): ' + (i.time || ''),
      'Page: ' + (i.pageUrl || ''),
      'User agent: ' + (i.userAgent || ''),
      'NanoDemo: ' + VERSION,
      '',
      '[Config]'
    ];
    flatten(i.config).forEach(function (r) { lines.push(r[0] + ': ' + r[1]); });
    lines.push('', '[Counters]');
    flatten(i.counters).forEach(function (r) { lines.push(r[0] + ': ' + r[1]); });
    lines.push('', '[Last stats]', i.lastStats ? JSON.stringify(i.lastStats) : DASH);
    lines.push('', '[Stream info]', i.streamInfo ? JSON.stringify(i.streamInfo) : DASH);
    lines.push('', '[Event log]');
    (i.log || []).forEach(function (l) { lines.push(l); });
    return redact(lines.join('\n'));
  }

  // ---- lifecycle ------------------------------------------------------------
  // nanoPlayer has no stop method: destroy() is the real stop.
  function envWindow(env) {
    if (env && env.window) { return env.window; }
    return typeof window !== 'undefined' ? window : null;
  }

  function stopPlayer(player, env) {
    if (!player) { return null; }
    var win = envWindow(env);
    if (win && player._nanoDemoOnHide) { win.removeEventListener('pagehide', player._nanoDemoOnHide); }
    try { player.destroy(); } catch (e) { /* destroying twice is harmless */ }
    return null;
  }

  function startPlayer(containerId, config, env) {
    env = env || {};
    var Ctor = env.NanoPlayer || (typeof NanoPlayer !== 'undefined' ? NanoPlayer : undefined);
    if (typeof Ctor !== 'function') {
      return Promise.reject(new Error('nanoPlayer script failed to load (' + CDN_URL +
        '). Check the network connection or an ad blocker.'));
    }
    var player = new Ctor(containerId);
    if (env.onCreate) { env.onCreate(player); } // lets a caller destroy it before setup settles
    var win = envWindow(env);
    if (win) {
      // Close the session when the tab goes away, so demos don't leave viewers open.
      player._nanoDemoOnHide = function () { stopPlayer(player, env); };
      win.addEventListener('pagehide', player._nanoDemoOnHide);
    }
    return player.setup(config).then(function () {
      return player;
    }, function (err) {
      stopPlayer(player, env);
      throw new Error(errorMessage(err));
    });
  }

  // One player slot with load/stop. A newer load() or stop() supersedes an
  // older load(): the old player is destroyed and its events are ignored.
  // load() never rejects; failures arrive via handlers.onState/onError.
  function createController(containerId, h, env) {
    h = h || {};
    var player = null;   // set up and ready
    var pending = null;  // built, setup() not settled yet
    var gen = 0;
    function guard(my, fn) {
      return function () { if (my === gen && fn) { return fn.apply(null, arguments); } };
    }
    function guardAll(my, fns) {
      var out = {};
      Object.keys(fns || {}).forEach(function (name) { out[name] = guard(my, fns[name]); });
      return out;
    }
    function release() {
      pending = stopPlayer(pending, env);
      player = stopPlayer(player, env);
    }
    function fail(my, message) {
      if (my !== gen) { return null; }
      if (h.onState) { h.onState('error'); }
      if (h.onError) { h.onError(message); }
      return null;
    }
    return {
      load: function (opts) {
        opts = opts || {};
        var my = ++gen;
        release();
        var config;
        try {
          config = buildConfig({
            source: buildSource(opts),
            playback: opts.playback,
            style: opts.style,
            events: playerEvents({
              onState: guard(my, h.onState),
              onError: guard(my, h.onError),
              onStats: guard(my, h.onStats),
              onStreamInfo: guard(my, h.onStreamInfo),
              onLog: guard(my, h.onLog),
              extra: guardAll(my, opts.extra)
            })
          });
        } catch (err) {
          return Promise.resolve(fail(my, err.message));
        }
        if (h.onState) { h.onState('connecting'); }
        var startEnv = {
          NanoPlayer: env && env.NanoPlayer,
          window: env && env.window,
          onCreate: function (p) { pending = p; }
        };
        return startPlayer(containerId, config, startEnv).then(function (p) {
          if (my !== gen) { return null; } // superseded: release() already destroyed it
          pending = null;
          player = p;
          return p;
        }, function (err) {
          if (my === gen) { pending = null; } // startPlayer already destroyed it
          return fail(my, err.message);
        });
      },
      stop: function () {
        gen++;
        release();
        if (h.onState) { h.onState('idle'); }
      },
      get player() { return player; }
    };
  }

  return {
    VERSION: VERSION,
    CDN_URL: CDN_URL,
    DEFAULTS: DEFAULTS,
    LATENCY_MODES: LATENCY_MODES,
    isUuid: isUuid,
    readParams: readParams,
    buildSource: buildSource,
    buildConfig: buildConfig,
    errorMessage: errorMessage,
    redact: redact,
    formatStats: formatStats,
    statsLine: statsLine,
    playerEvents: playerEvents,
    statusView: statusView,
    renderStatus: renderStatus,
    statusHandlers: statusHandlers,
    appendLog: appendLog,
    flatten: flatten,
    buildReport: buildReport,
    startPlayer: startPlayer,
    stopPlayer: stopPlayer,
    createController: createController
  };
});
