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
    statsLine: statsLine
  };
});
