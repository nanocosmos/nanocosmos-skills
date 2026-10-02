# nanoplayer-demo v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the nanoplayer-demo skill so every demo plays by `source.group.id`, shows its complete nanoPlayer configuration explicitly (commented code block + on-page panel), and follows the nanoPlayer 5.0.13 docs.

**Architecture:** Each template's page script starts with a literal `PLAYER_CONFIG` (docs shape). `NanoDemo.applyUrlParams` makes a visible copy with `?group= ?token= ?stream= ?server=` applied. `createController.load(config)` passes that config to nanoPlayer unchanged except for attached events. The helper library no longer builds or defaults any player option.

**Tech Stack:** Plain HTML/CSS, ES5 classic UMD scripts, Node 20 `node --test`, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-02-nanoplayer-demo-v2-design.md` (v1 spec `2026-09-29-nanoplayer-demo-skill-design.md` still governs ownership, layout and tiers).

## Global Constraints

- Docs authority: `D:/Projects/nano-docs` `main` @ `ddcd5d7`, `docs/nanoplayer/*` (published https://docs.nanocosmos.de/docs/nanoplayer/…).
- Default group: `b6638d50-3581-4349-8fb2-59b3406c2dde`. Second group for the switch demo: `HX26g-YVe8D` (passthrough name used as `group.id`).
- `PLAYER_CONFIG` defaults: `group.startQuality: 'medium'`, `security: {}`, `options.adaption.rule: 'deviationOfMean2'`, `options.switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 }`, `playback: { autoplay: true, automute: true, muted: false, faststart: true, enableMediaOverQuic: true, latencyControlMode: 'balancedadaptive' }`, `style: { width: '100%', height: '100%', scaling: 'letterbox', controls: false }`.
- `muted: true` only in `multi-player` and `branded-page`, each with a comment.
- Never set `general.serverDomain` or `defaults.service` in a template; never `startIndex` with `group`.
- Stats: bitrate bit/s → kbps; "Buffer delay" = `buffer.delay.current`, target = `buffergoal.real`, both shown in seconds (unit UNVERIFIED).
- Theme rules from v1 stand (link `product-theme.css` then `page.css`, tokens only, no inline style).
- Browser JS ES5; commits without Co-Authored-By/attribution lines.
- Tests: `cd skills/nanocosmos/nanoplayer-demo && node --test`.

## Review Focus

1. A malformed `?stream=` (e.g. `?stream=foo`): readable error on the page, no player started. Pinned in Task 1 (`applyUrlParams` throws) and Task 5 (templates catch it).
2. The page's `PLAYER_CONFIG` object must never be mutated by URL params, merges, the player or the controller; customers copy it. Pinned in Task 1 (input untouched) and Task 2 (controller passes a clone).
3. Tokens: `?token=` must never appear in the Configuration panel, Copy output or report, including non-JWT strings. Pinned in Task 1 (`configJson` redacts `jwtoken` values).
4. `?stream=` together with `?group=`: stream wins, documented. Pinned in Task 1.
5. Switch demo while connecting / invalid index: error event, no silent click (v1 behavior kept). Pinned in Task 3.

---

### Task 1: demo-core v2 — config helpers and readable output

**Files:**
- Modify: `skills/nanocosmos/nanoplayer-demo/lib/demo-core.js` (replace the config section and export list)
- Rewrite: `skills/nanocosmos/nanoplayer-demo/tests/core-config.test.mjs`

**Interfaces — Produces:** `VERSION '2.0.0'`, `CDN_URL`, `LATENCY_MODES`, `START_QUALITIES`, `clone(v)`, `mergeConfig(base, override)`, `applyUrlParams(config, search)`, `sourceId(config)`, `withSourceId(config, value)`, `validateConfig(config) → string|null`, `configJson(value)`, `errorText(code, message)`, `errorMessage(e)`, `redact(text)`, `formatStats(stats) → { bitrate, bufferDelay, bufferGoal, framerate }`, `statsLine(stats)`. Removed: `DEFAULTS`, `isUuid`, `readParams`, `buildSource`, `buildConfig`.

- [ ] Step 1: Rewrite `tests/core-config.test.mjs` with the tests below; run, expect failures (`D.applyUrlParams is not a function` …).

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';
const GROUP = 'b6638d50-3581-4349-8fb2-59b3406c2dde';

function pageConfig() {
  return {
    source: {
      group: { id: GROUP, startQuality: 'medium', security: {} },
      options: { adaption: { rule: 'deviationOfMean2' }, switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 } }
    },
    playback: { autoplay: true, automute: true, muted: false, faststart: true, enableMediaOverQuic: true, latencyControlMode: 'balancedadaptive' },
    style: { width: '100%', height: '100%', scaling: 'letterbox', controls: false }
  };
}

test('applyUrlParams without params returns an equal copy, not the same object', () => {
  const page = pageConfig();
  const c = D.applyUrlParams(page, '');
  assert.deepEqual(c, page);
  assert.notEqual(c, page);
  assert.notEqual(c.source.group, page.source.group);
});

test('applyUrlParams sets group id and token on the group, leaving the page config untouched', () => {
  const page = pageConfig();
  const before = JSON.stringify(page);
  const c = D.applyUrlParams(page, '?group=other-group&token=' + JWT);
  assert.equal(c.source.group.id, 'other-group');
  assert.deepEqual(c.source.group.security, { jwtoken: JWT });
  assert.equal(c.source.group.startQuality, 'medium');
  assert.equal(JSON.stringify(page), before);
});

test('applyUrlParams accepts ?jwtoken= as token alias and trims values', () => {
  const c = D.applyUrlParams(pageConfig(), '?jwtoken=%20abc%20');
  assert.deepEqual(c.source.group.security, { jwtoken: 'abc' });
});

test('?stream= switches to entries mode and wins over ?group=', () => {
  const c = D.applyUrlParams(pageConfig(), '?group=ignored&stream=ABCDE-12345&token=T');
  assert.equal(c.source.group, undefined);
  assert.deepEqual(c.source.defaults, { service: 'bintu' });
  assert.deepEqual(c.source.entries, [{ h5live: { rtmp: { streamname: 'ABCDE-12345' }, security: { jwtoken: 'T' } } }]);
  assert.equal(c.source.startIndex, 0);
  assert.deepEqual(c.source.options, pageConfig().source.options);
});

test('a malformed ?stream= throws a readable error', () => {
  assert.throws(() => D.applyUrlParams(pageConfig(), '?stream=foo'), /\?stream= must be a stream name like XXXXX-YYYYY/);
});

test('serverDomain is only set when ?server= is given', () => {
  assert.equal(D.applyUrlParams(pageConfig(), '').source.general, undefined);
  assert.deepEqual(D.applyUrlParams(pageConfig(), '?server=bintu-play-eu.nanocosmos.de').source.general,
    { serverDomain: 'bintu-play-eu.nanocosmos.de' });
});

test('mergeConfig deep-merges objects, replaces arrays and leaves both inputs untouched', () => {
  const base = pageConfig();
  const override = { playback: { enableMediaOverQuic: false }, source: { group: { id: 'g2' } } };
  const m = D.mergeConfig(base, override);
  assert.equal(m.playback.enableMediaOverQuic, false);
  assert.equal(m.playback.faststart, true);
  assert.equal(m.source.group.id, 'g2');
  assert.equal(m.source.group.startQuality, 'medium');
  assert.equal(base.playback.enableMediaOverQuic, true);
  override.playback.enableMediaOverQuic = 'changed';
  assert.equal(m.playback.enableMediaOverQuic, false);
  assert.deepEqual(D.mergeConfig({ a: [1, 2] }, { a: [3] }), { a: [3] });
});

test('clone keeps functions by reference and copies objects', () => {
  const fn = () => 1;
  const src = { events: { onPlay: fn }, a: { b: 1 } };
  const c = D.clone(src);
  assert.equal(c.events.onPlay, fn);
  assert.notEqual(c.a, src.a);
});

test('sourceId and withSourceId work for group and entries mode', () => {
  assert.equal(D.sourceId(pageConfig()), GROUP);
  assert.equal(D.withSourceId(pageConfig(), ' g3 ').source.group.id, 'g3');
  const entries = D.applyUrlParams(pageConfig(), '?stream=ABCDE-12345');
  assert.equal(D.sourceId(entries), 'ABCDE-12345');
  assert.equal(D.withSourceId(entries, 'FGHIJ-67890').source.entries[0].h5live.rtmp.streamname, 'FGHIJ-67890');
  assert.equal(D.sourceId({}), '');
});

test('validateConfig explains missing ids and invalid enum values', () => {
  assert.equal(D.validateConfig(pageConfig()), null);
  assert.match(D.validateConfig(D.withSourceId(pageConfig(), '')), /Enter a group ID/);
  assert.match(D.validateConfig({}), /needs a source/);
  assert.match(D.validateConfig({ source: { entries: [] } }), /Enter a stream name/);
  const badQ = pageConfig(); badQ.source.group.startQuality = 'best';
  assert.match(D.validateConfig(badQ), /startQuality must be one of high, medium-high, medium, medium-low, low/);
  const badL = pageConfig(); badL.playback.latencyControlMode = '2s';
  assert.match(D.validateConfig(badL), /latencyControlMode must be one of classic, fastadaptive, balancedadaptive/);
});

test('configJson pretty-prints without events and redacts every jwtoken value', () => {
  const c = D.applyUrlParams(pageConfig(), '?token=not-a-jwt-secret');
  c.events = { onPlay: () => {} };
  const text = D.configJson(c);
  assert.ok(!text.includes('not-a-jwt-secret'));
  assert.ok(text.includes('"jwtoken": "[redacted]"'));
  assert.ok(!text.includes('events'));
  assert.ok(text.startsWith('{\n  "source"'));
  assert.ok(D.configJson([{ label: 'A', config: c }]).includes('"label": "A"'));
});

test('errorText gives readable text for documented code ranges', () => {
  assert.match(D.errorText(2001, 'x'), /^Stream not found: check the group ID or stream name\. \(2001: x\)$/);
  assert.match(D.errorText(4901), /^Token problem: .* \(4901\)$/);
  assert.match(D.errorText(1005), /press play/);
  assert.match(D.errorText(5003, 'bad'), /check PLAYER_CONFIG/);
  assert.equal(D.errorText(3100, 'Media error'), 'Media error');
  assert.equal(D.errorText(undefined, ''), 'Unknown player error');
  assert.equal(D.errorText(3100, ''), 'Player error 3100');
});

test('errorMessage reads the player event payload and maps the code', () => {
  assert.match(D.errorMessage({ data: { code: 2001, message: 'not found' } }), /^Stream not found/);
  assert.equal(D.errorMessage({ data: { error: { message: 'Nested' } } }), 'Nested');
  assert.equal(D.errorMessage(new Error('Plain')), 'Plain');
  assert.equal(D.errorMessage(undefined), 'Unknown player error');
});

test('redact removes JWTs and token URL params, keeping JSON intact', () => {
  const out = D.redact('u ?stream=A&token=' + JWT + '&jwtoken=abc#x raw ' + JWT);
  assert.ok(!out.includes(JWT));
  assert.ok(out.includes('token=[redacted]') && out.includes('jwtoken=[redacted]') && out.includes('stream=A'));
  assert.equal(D.redact('{"u":"wss://x/?token=abc"}'), '{"u":"wss://x/?token=[redacted]"}');
});

test('formatStats converts bit/s to kbps and shows buffer delay with its target', () => {
  assert.deepEqual(
    D.formatStats({ bitrate: { current: 1500000 }, buffer: { delay: { current: 0.84 } }, buffergoal: { real: 1.2 }, framerate: { current: 30 } }),
    { bitrate: '1500 kbps', bufferDelay: '0.84 s', bufferGoal: '1.20 s', framerate: '30 fps' });
  assert.deepEqual(D.formatStats(null), { bitrate: '—', bufferDelay: '—', bufferGoal: '—', framerate: '—' });
});

test('statsLine renders bitrate and buffer delay against target', () => {
  assert.equal(D.statsLine(null), 'Bitrate — · Buffer delay — (target —)');
  assert.equal(D.statsLine({ bitrate: { current: 900000 }, buffer: { delay: { current: 0.5 } }, buffergoal: { real: 1 } }),
    'Bitrate 900 kbps · Buffer delay 0.50 s (target 1.00 s)');
});
```

- [ ] Step 2: In `lib/demo-core.js`, replace everything from `var VERSION` through `function statsLine … }` with the v2 config section below; keep the runtime section (events onward) for Task 2; update the export object to the Produces list (keep runtime exports). Run the config tests: PASS. (Runtime tests will fail until Task 2; that is expected.)

```js
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
```

- [ ] Step 3: Commit `nanoplayer-demo v2: config helpers (applyUrlParams, configJson, errorText, stats)`.

### Task 2: demo-core v2 — controller, events, panel, report

**Files:** Modify `lib/demo-core.js` (runtime section); rewrite `tests/core-runtime.test.mjs`; extend `tests/helpers.mjs`.

**Interfaces — Produces:** `createController(id, h, env) → { load(config, extra?) → Promise<player|null>, stop(), player, config }`; `playerEvents` (errors via `errorMessage`); `statusHandlers(ui)` with optional `text`/`stats`; `buildReport(info)` adds `Player:` and `Ticket:` lines; `mountConfigPanel({ toggle, pre, copy, confirm }, env?) → { render(value) → text }`. Kept: `statusView`, `renderStatus`, `appendLog`, `flatten`, `startPlayer`, `stopPlayer`.

- [ ] Step 1: Extend `tests/helpers.mjs` `fakeEl` with `attributes`, `getAttribute`, `setAttribute`, `classList { add, remove, toggle, contains }`, `addEventListener(type, fn)` and `click()`; add `fakeNavigator()` returning `{ clipboard: { written: [], writeText(t) { this.written.push(t); return Promise.resolve(); } } }`.
- [ ] Step 2: Rewrite `tests/core-runtime.test.mjs`: keep every v1 runtime test, ported to `load(config)` with a `pageConfig()` helper (same as Task 1); stats assertions use the v2 `statsLine` format; plus these new tests:
  - `load passes the page config unchanged except for events, as a clone` (setup config deep-equals page config minus events; page object not mutated after the fake player writes `config.source.group.id = 'mutated'`).
  - `load merges page events with demo events, page first` (page `onPlay` and state `playing` both fire, page first).
  - `load reports an invalid config through handlers and starts no player` (empty group id → `['state','error']`, `['error', /Enter a group ID/]`, 0 instances).
  - `controller.config is the last loaded config`.
  - `playerEvents maps onError codes to readable text` (code 4901 → /Token problem/).
  - `onStreamInfoError without a code says not found or offline`.
  - `statusHandlers work without text and stats elements`.
  - `buildReport includes player version and ticket when given`.
  - `mountConfigPanel renders redacted JSON, toggles open and copies the rendered text`.
  Run: new tests FAIL.
- [ ] Step 3: Implement in `lib/demo-core.js`:
  - `playerEvents`: `onError` → `h.onError(errorMessage(e))`; `onStreamInfoError` → `d.code ? errorMessage(e) : 'Stream not found or offline: ' + errorMessage(e)`.
  - `statusHandlers`: guard `ui.text` like `ui.stats`.
  - `buildReport`: after `NanoDemo:` add `'Player: ' + (i.playerVersion || 'unknown')`; if `i.ticket` add `'Ticket: ' + i.ticket`.
  - `createController.load(config, extra)`: `++gen; release(); problem = validateConfig(config)` → `fail`; `cfg = clone(config)`; `cfg.events` = demo events (guarded) merged with guarded `config.events` page handlers called first; `current = config`; then the v1 start/pending/stale logic. Add `get config() { return current; }`.
  - `mountConfigPanel` as specified (toggle sets `aria-expanded` and `.open` on `pre`, copy uses `navigator.clipboard.writeText(lastText)`, confirm shows "Copied" / "Copy failed" / "Clipboard unavailable; select the text instead" with class `show` for 2 s).
  Run all tests: PASS except wrapper/template/docs suites that still use the v1 API (fixed in Tasks 3–6).
- [ ] Step 4: Commit `nanoplayer-demo v2: controller takes page config, readable errors, config panel`.

### Task 3: SwitchPlayer v2 — switch between groups

**Files:** Modify `lib/player-wrapper.js`; rewrite `tests/wrapper.test.mjs`.

**Interfaces — Produces:** `new SwitchPlayer(containerId, { config, env })`; `load(groups: Array<{label, id}>) → Promise<boolean>`; `switchTo(index) → Promise<index>`; `destroy()`; getters `state`, `index`, `config` (effective config for the panel); events unchanged (`state`, `error`, `stats`, `log`, `switching`, `switched`).

- [ ] Step 1: Port all v1 wrapper tests to groups (`GROUPS = [{label:'A', id:'g-a'}, {label:'B', id:'g-b'}]`, config from `pageConfig()` with `security: { jwtoken: 'T' }`), asserting `setup` gets `source.group.id === 'g-a'` and `updateSource` gets a full source with `group.id === 'g-b'` and the same `options`/`startQuality`/`security`; add `load rejects a config without source.group` and `config getter reflects the current group`. Run: FAIL.
- [ ] Step 2: Implement: store `options.config`; `load` validates `config.source.group` (else reject with `SwitchPlayer switches between groups: PLAYER_CONFIG needs source.group.`), stores groups, loads `withSourceId(config, groups[0].id)` via `this._ctl.load(cfg, extra)`; `_source(i)` = `withSourceId(this._config, this._groups[i].id).source`; `config` getter = `withSourceId(this._config, current id)`; keep `_pending`, `_settle`, `_refuse` semantics. Run: wrapper tests PASS.
- [ ] Step 3: Commit `nanoplayer-demo v2: SwitchPlayer switches groups from the page config`.

### Task 4: check-demo v2 rules

**Files:** Modify `scripts/check-demo.mjs`, `tests/check-demo.test.mjs`.

- [ ] Step 1: Add `<script>var PLAYER_CONFIG = { source: { group: { id: 'g' } } };</script>` to `VALID_HTML`; add tests: missing `PLAYER_CONFIG` → `player-config`; `serverDomain: 'x'` in a page → `no-server-domain-literal`; `startIndex: 0` in a file that defines `PLAYER_CONFIG` with `group:` → `no-start-index-with-group`; the real `lib/demo-core.js` and `lib/player-wrapper.js` still pass. Run: FAIL.
- [ ] Step 2: Implement: `player-config` = `/var PLAYER_CONFIG\s*=/` found in `index.html` or `js/app.js`; per file `/serverDomain\s*:\s*['"]/` → `no-server-domain-literal`; files containing `PLAYER_CONFIG` with `/\bgroup\s*:/` and `/\bstartIndex\s*:/` → `no-start-index-with-group`. Run: PASS.
- [ ] Step 3: Commit `nanoplayer-demo v2: check-demo rules for PLAYER_CONFIG`.

### Task 5: Templates v2 — single-player, feature-showcase, diagnostics

**Files:** Rewrite `templates/{single-player,feature-showcase,diagnostics}/index.html` (+ page.css as needed); modify `tests/templates.test.mjs`.

- [ ] Step 1: Replace the v1 template tests (`DEFAULT_STREAM`, diagnostics reset) with: every template's page code has `var PLAYER_CONFIG = {` with `group:` and the default group id, `D.applyUrlParams(PLAYER_CONFIG, location.search)`, `muted: false` (single-player, feature-showcase, diagnostics, feature-wrapper) or `muted: true` (multi-player, branded-page), and the panel ids `configToggle`, `configJson`, `btnCopyConfig`, `configCopied`; diagnostics resets counters in `load()` and reads `ticket`. Run: FAIL.
- [ ] Step 2: Write the three templates on the shared shell: the commented `PLAYER_CONFIG` block from spec §4 at the top of the script; `applyUrlParams` in a try/catch that shows the error and does not load; "Group ID" input (label "Stream name" in entries mode) wired through `withSourceId`; Configuration panel section (markup below) rendered on every load; showcase controls initialised from and written into the config via `mergeConfig`; diagnostics: stats rows Bitrate / Buffer delay / Target / Frame rate, `?ticket=` line, report with `config: JSON.parse(D.configJson(config))`, `ticket`, `playerVersion: ctl.player && ctl.player.version`.

```html
      <section class="panel config-panel">
        <button class="raw-toggle" id="configToggle" aria-expanded="false" aria-controls="configJson">
          <span>Configuration: what nanoPlayer receives (copy it into your page)</span><span class="chevron">›</span>
        </button>
        <pre class="raw-payload" id="configJson">—</pre>
        <div class="button-row config-actions">
          <button class="btn btn-secondary" id="btnCopyConfig">Copy configuration</button>
          <span class="copy-confirm" id="configCopied">Copied</span>
        </div>
      </section>
```
- [ ] Step 3: `.config-panel { padding: 20px; } .config-actions { margin-top: 12px; align-items: center; }` in each page.css. Run: tests for these three PASS.
- [ ] Step 4: Commit `nanoplayer-demo v2: single-player, feature-showcase, diagnostics on PLAYER_CONFIG`.

### Task 6: Templates v2 — multi-player, branded-page, feature-wrapper

- [ ] Step 1: multi-player: `PLAYER_CONFIG` with `muted: true` (comment: several tiles, sound from all would overlap); `TILES = [{ label: 'H5Live (WebSocket)', override: { playback: { enableMediaOverQuic: false } } }, { label: 'Media over QUIC (MoQ)', override: { playback: { enableMediaOverQuic: true } } }]`; `?groups=a,b,…` (max 9) replaces TILES with one tile per group (`override: { source: { group: { id } } }`) and hides the shared Group ID field; each tile loads `D.mergeConfig(config, tile.override)`; panel renders `[{ tile, config }]`.
- [ ] Step 2: branded-page: `muted: true` (comment: unattended screen, no one to unmute); no URL/developer text visible; `.brand-event` line for booth/dates; logo placeholder comment ("replace customer-logo.svg; until then keep the 'logo pending' placeholder"); Configuration panel only when `?config=1` (viewer-facing page).
- [ ] Step 3: feature-wrapper `js/app.js`: `PLAYER_CONFIG` block; `GROUPS = [{ label: 'Group A', id: 'b6638d50-3581-4349-8fb2-59b3406c2dde' }, { label: 'Group B', id: 'HX26g-YVe8D' }]`; `?groups=` overrides; `new D.SwitchPlayer('player', { config: config })`; panel renders `sp.config` after load and after each `switched`; markup gets the panel.
- [ ] Step 4: Run all tests: PASS. Commit `nanoplayer-demo v2: multi-player, branded-page, feature-wrapper on PLAYER_CONFIG`.

### Task 7: new-demo v2

- [ ] Step 1: Tests: `scaffold({ group: 'my-group' })` replaces the default group id in the page config of every type (index.html or js/app.js, first occurrence); invalid group (`'a"b'`) throws; CLI prints a line starting `OK:` on success. Run: FAIL.
- [ ] Step 2: Implement `group` option + `--group` flag; print `OK: <type> demo in <dest> passes check-demo` on success. Run: PASS. Commit `nanoplayer-demo v2: new-demo --group`.

### Task 8: Docs v2

**Files:** Rewrite `references/best-practices.md`; update `SKILL.md` (v2.0.0, API table, workflow), `references/wrapper-pattern.md`, `references/demo-checklist.md`, `tests/docs.test.mjs` (version 2.0.0); `CHANGELOG.md`; `REVIEW-NOTES.md` (nanostream-development conflict flag).

- [ ] Step 1: docs.test → version 2.0.0, every exported function named in SKILL.md, best-practices cites `nano-docs` paths (`docs/nanoplayer/`) at least 8 times. Run: FAIL.
- [ ] Step 2: Write the docs (sections: configuration in the page; group playback; URL params; autoplay & audio; latency & MoQ; stats & units (UNVERIFIED buffer units); ABR: `switchStream` disables ABR, `setAdaption({rule})` restores, `onSwitchStream*` with `data.entry`, no documented rendition list; errors: ranges + never-retry list (1005, 1007, 1009, 4901, 4903, 5001–5010) + 1005 tap-to-play; tokens: JWT only, expired token blocks new connections and switches; deprecated: `switch.fastStart`, `source.h5live/bintu/hls`, STS tokens, scaling `resize`/`original`). Run: PASS. Commit `nanoplayer-demo v2: docs follow nanoPlayer 5.0.13 docs`.

### Task 9: Verification

- [ ] Step 1: Scaffold all six types against the real theme; `check-demo` OK; headless screenshots (desktop) of each; config panel open in one.
- [ ] Step 2: Re-run the five-team trial with fresh agents (same five requests) into `D:/Projects/nanoplayer-demo-trials/v2/`; collect gaps.
- [ ] Step 3: Whole-branch review of the v2 range by a fresh reviewer; fix Critical/Important test-first.
