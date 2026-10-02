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

  var VERSION = '2.0.0';
  var CDN_URL = 'https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js';
  var LATENCY_MODES = ['classic', 'fastadaptive', 'balancedadaptive'];
  var START_QUALITIES = ['high', 'medium-high', 'medium', 'medium-low', 'low'];
  var STREAM_NAME_RE = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
  var JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
  var TOKEN_PARAM_RE = /([?&](?:token|jwtoken)=)[^&#\s"'<>]*/gi;
  var DASH = '\u2014';

  // Deep copy of plain config data; functions (event handlers) stay by reference.
  function clone(v) {
    if (Array.isArray(v)) { return v.map(clone); }
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) { o[k] = clone(v[k]); });
      return o;
    }
    return v;
  }

  // New config = base with override merged in (objects merge, arrays replace).
  function mergeConfig(base, override) {
    var out = clone(base);
    (function merge(target, src) {
      Object.keys(src || {}).forEach(function (k) {
        var v = src[k];
        var t = target[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && t && typeof t === 'object' && !Array.isArray(t)) { merge(t, v); }
        else { target[k] = clone(v); }
      });
    })(out, override);
    return out;
  }

  // Copy of the page config with the standard URL params applied:
  // ?group= ?token= (alias ?jwtoken=) ?stream=XXXXX-YYYYY (entries mode, wins over ?group=) ?server=
  function applyUrlParams(config, search) {
    var c = clone(config || {});
    c.source = c.source || {};
    var p = new URLSearchParams(search || '');
    var group = (p.get('group') || '').trim();
    var token = (p.get('token') || p.get('jwtoken') || '').trim();
    var stream = (p.get('stream') || '').trim();
    var server = (p.get('server') || '').trim();
    if (stream) {
      if (!STREAM_NAME_RE.test(stream)) {
        throw new Error('?stream= must be a stream name like XXXXX-YYYYY (got "' + stream + '"). For a group use ?group=.');
      }
      delete c.source.group;
      c.source.defaults = { service: 'bintu' };
      c.source.entries = [{ h5live: { rtmp: { streamname: stream }, security: token ? { jwtoken: token } : {} } }];
      c.source.startIndex = 0;
    } else {
      if (group) { c.source.group = c.source.group || {}; c.source.group.id = group; }
      if (token && c.source.group) { c.source.group.security = { jwtoken: token }; }
      if (token && c.source.entries) {
        c.source.entries.forEach(function (e) { if (e.h5live) { e.h5live.security = { jwtoken: token }; } });
      }
    }
    if (server) { c.source.general = { serverDomain: server }; }
    return c;
  }

  function sourceId(config) {
    var s = (config && config.source) || {};
    if (s.group) { return s.group.id || ''; }
    var e = s.entries && s.entries[0];
    return (e && e.h5live && e.h5live.rtmp && e.h5live.rtmp.streamname) || '';
  }

  function withSourceId(config, value) {
    var c = clone(config);
    var v = String(value == null ? '' : value).trim();
    if (c.source && c.source.group) { c.source.group.id = v; }
    else if (c.source && c.source.entries && c.source.entries[0]) { c.source.entries[0].h5live.rtmp.streamname = v; }
    return c;
  }

  // Readable problem with the config, or null. Catches what nanoPlayer would reject late.
  function validateConfig(config) {
    var s = config && config.source;
    if (!s) { return 'PLAYER_CONFIG needs a source.'; }
    if (s.group) {
      if (!String(s.group.id || '').trim()) { return 'Enter a group ID (source.group.id or ?group=).'; }
      if (s.group.startQuality && START_QUALITIES.indexOf(s.group.startQuality) < 0) {
        return 'source.group.startQuality must be one of ' + START_QUALITIES.join(', ') + '.';
      }
    } else if (!s.entries || !s.entries.length || !sourceId(config)) {
      return 'Enter a stream name (?stream=XXXXX-YYYYY) or set source.group.id.';
    }
    var mode = config.playback && config.playback.latencyControlMode;
    if (mode && LATENCY_MODES.indexOf(mode) < 0) {
      return 'playback.latencyControlMode must be one of ' + LATENCY_MODES.join(', ') + ' (a behavior, not seconds).';
    }
    return null;
  }

  // What the Configuration panel shows and copies: no handlers, no token values.
  function configJson(value) {
    return JSON.stringify(value, function (key, v) {
      if (key === 'events' || typeof v === 'function') { return undefined; }
      if (key === 'jwtoken' && v) { return '[redacted]'; }
      return v;
    }, 2);
  }

  // Readable text for the documented error code ranges (nanoplayer_api_errors).
  function errorText(code, message) {
    var m = message ? String(message) : '';
    var c = Number(code);
    var hint = null;
    if (c === 1005) { hint = 'Playback needs a click: press play.'; }
    else if (c === 2001) { hint = 'Stream not found: check the group ID or stream name.'; }
    else if (c === 2002 || c === 2003) { hint = 'No media: the stream is not sending video or audio right now.'; }
    else if (c === 2004) { hint = 'The stream was stopped.'; }
    else if (c === 4006) { hint = 'The switch took too long and timed out.'; }
    else if (c >= 4900 && c <= 4999) { hint = 'Token problem: the JWT is missing, expired or not valid for this stream.'; }
    else if (c >= 5001 && c <= 5010) { hint = 'Player setup failed: check PLAYER_CONFIG.'; }
    if (!hint) { return m || (code != null && isFinite(c) ? 'Player error ' + c : 'Unknown player error'); }
    return hint + ' (' + c + (m ? ': ' + m : '') + ')';
  }

  function errorMessage(e) {
    var d = (e && e.data) || {};
    var msg = d.message ||
      (d.error && typeof d.error === 'object' && d.error.message) ||
      (typeof d.error === 'string' ? d.error : '') ||
      (e && e.message) || '';
    return errorText(d.code, msg);
  }

  function redact(text) {
    return String(text == null ? '' : text)
      .replace(TOKEN_PARAM_RE, '$1[redacted]')
      .replace(JWT_RE, '[redacted]');
  }

  function num(v) {
    if (v && typeof v === 'object' && typeof v.current === 'number') { return v.current; }
    return (typeof v === 'number' && isFinite(v)) ? v : null;
  }
  function pick(obj, path) {
    var v = obj;
    var parts = path.split('.');
    for (var i = 0; i < parts.length && v != null; i++) { v = v[parts[i]]; }
    return num(v);
  }
  // onStats (nanoplayer_api): bitrate.* in bit/s; buffer.delay and buffergoal
  // have no documented unit; shown as seconds (UNVERIFIED, see best-practices).
  function formatStats(stats) {
    var s = stats || {};
    var br = pick(s, 'bitrate');
    var delay = pick(s, 'buffer.delay');
    var goal = pick(s, 'buffergoal.real');
    var fps = pick(s, 'framerate');
    return {
      bitrate: br == null ? DASH : Math.round(br / 1000) + ' kbps',
      bufferDelay: delay == null ? DASH : delay.toFixed(2) + ' s',
      bufferGoal: goal == null ? DASH : goal.toFixed(2) + ' s',
      framerate: fps == null ? DASH : fps.toFixed(0) + ' fps'
    };
  }
  function statsLine(stats) {
    var f = formatStats(stats);
    return 'Bitrate ' + f.bitrate + ' \u00b7 Buffer delay ' + f.bufferDelay + ' (target ' + f.bufferGoal + ')';
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
    LATENCY_MODES: LATENCY_MODES,
    START_QUALITIES: START_QUALITIES,
    clone: clone,
    mergeConfig: mergeConfig,
    applyUrlParams: applyUrlParams,
    sourceId: sourceId,
    withSourceId: withSourceId,
    validateConfig: validateConfig,
    configJson: configJson,
    errorText: errorText,
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
