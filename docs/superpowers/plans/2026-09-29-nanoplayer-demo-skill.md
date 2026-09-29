# nanoplayer-demo Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `nanoplayer-demo` skill that scaffolds nanoPlayer demos from six templates, with one base look (brand-guidelines' `product-theme.css`), one tested helper library, a demo checker and a "demo done" checklist.

**Architecture:** Templates (`templates/<type>/`: `index.html` + `page.css`, plus `js/app.js` for the wrapper type) hold only page markup and wiring. All player logic lives in `lib/demo-core.js` (config, events, status, logging, lifecycle), a classic script exposing `window.NanoDemo`, and `lib/player-wrapper.js` (`NanoDemo.SwitchPlayer`), both covered by Node tests with a fake `NanoPlayer`. `scripts/new-demo.mjs` scaffolds a demo (template + lib files + a copy of the canonical theme); `scripts/check-demo.mjs` enforces the mechanical checklist rules.

**Tech Stack:** Plain HTML/CSS, ES5-style classic browser scripts (UMD so Node can `require` them), Node 20 built-in test runner (`node --test`), no npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-29-nanoplayer-demo-skill-design.md`

## Global Constraints

- Never inline CSS: every demo `<link>`s an unmodified `product-theme.css`, then `page.css`. No `<style>` blocks, no `style=""` attributes.
- `page.css` uses theme tokens only (`var(--accent-orange)`, `var(--text-primary)`, …). No raw hex/rgb/hsl colors. Use class selectors, not id selectors, in `page.css`.
- Available theme tokens: `--bg --panel --panel-inset --panel-soft --border --border-strong --text-primary --text-secondary --text-muted --text-on-accent --accent-orange --accent-orange-hover --accent-blue --accent-blue-hover --font-heading --font-body --font-mono --shadow --shadow-sm --shadow-lg --page-margin --page-max-width`.
- Player CDN, verbatim: `https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js`.
- Player defaults (from `nanostream-development`): stream `CD6oL-2kE1g`, server `bintu-play.nanocosmos.de`, bintu API `https://bintu.nanocosmos.de`, `latencyControlMode` ∈ `fastadaptive | balancedadaptive | classic` (default `balancedadaptive`), `adaption.rule: "deviationOfMean2"`, `switch.timeout: 10`.
- Events go in `setup({ events })`. Never call `player.on('onX')` after `setup()`. There is no `stop()`; use `destroy()`. Switch streams with `updateSource(source)`.
- URL params: `?stream=` (name or UUID, auto-detected), `?token=` (alias `?jwtoken=`), `?server=`; multi-stream templates add `?streams=a,b,c`.
- No credentials in any file. Tokens are redacted in logs and reports.
- Head/header/footer markup copied from brand-guidelines' `product-sample.html` (Google Fonts stopgap included as-is), with the nanoStream logo `https://www.nanocosmos.net/wp-content/uploads/2026/06/nanoStream-logo-V1.webp`.
- Footer version stamp format: `v<!-- version -->1.0.0<!-- /version -->` and `Updated <!-- updated -->YYYY-MM-DD<!-- /updated -->`.
- `<meta name="robots" content="noindex, nofollow">` on every page.
- Browser JS in `lib/` and `templates/` is ES5 (`var`, `function`), with no modules, so demos open from `file://`.
- Commits: no `Co-Authored-By` trailer, no "Generated with" line (user's global instructions).
- All paths below are relative to the repo root `D:/Projects/nanocosmos-skills`; `SK=skills/nanocosmos/nanoplayer-demo`.
- Run all tests with: `cd skills/nanocosmos/nanoplayer-demo && node --test`

## Shared page shell

Every template's `index.html` is this shell. Replace `<!-- MAIN -->` with the
task's `<main>…</main>` and `<!-- SCRIPTS -->` with the task's script tags.
Task 5 shows the fully assembled `single-player/index.html`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{{TITLE}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;700&family=Source+Sans+3:wght@400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="product-theme.css">
<link rel="stylesheet" href="page.css">
</head>
<body>

  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <img class="logo-lockup" src="https://www.nanocosmos.net/wp-content/uploads/2026/06/nanoStream-logo-V1.webp" alt="nanoStream">
        <div class="header-divider"></div>
        <div class="nav-label"><span class="title">{{TITLE}}</span></div>
      </div>
      <div class="header-right">
        <a href="https://dashboard.nanostream.cloud/signup" target="_blank" rel="noopener" class="theme-pill">Start for free</a>
        <a href="https://www.nanocosmos.net/support/" target="_blank" rel="noopener" class="theme-pill">Contact</a>
        <img class="brand-mark" src="https://www.nanocosmos.net/wp-content/uploads/2025/03/Nanocosmos_logo_RGB_on-dark-bg.png" alt="nanocosmos">
      </div>
    </div>
  </header>

  <!-- MAIN -->

  <footer class="footer">
    <div class="footer-inner">
      <span>© 2026 <a href="https://www.nanocosmos.net">nanocosmos</a> GmbH</span>
      <div class="page-version" aria-label="Page version">
        <span>v<!-- version -->1.0.0<!-- /version --></span>
        <span aria-hidden="true">·</span>
        <span>Updated <!-- updated -->{{DATE}}<!-- /updated --></span>
      </div>
    </div>
  </footer>

<!-- SCRIPTS -->
</body>
</html>
```

The `<!-- MAIN -->` / `<!-- SCRIPTS -->` markers are replaced, not kept.
The template tests (Task 5) fail if the shell is incomplete: `check-demo`
checks noindex, stylesheet order, version stamp, player CDN and demo-core.

## Review Focus

1. **Double-click Load / Load while still connecting:** exactly one player survives; events from the superseded player never touch the UI. Pinned in Task 3 (`createController` double-load and stale-setup tests).
2. **Offline or misspelled stream:** the page shows "Stream not found or offline: …" and an Error badge, not a permanent "Connecting". Pinned in Task 3 (`playerEvents` onStreamInfoError test, `statusHandlers` test).
3. **Token in the page URL:** `?token=eyJ…` never appears in the event log, stream-info panel or copied diagnostics report. Pinned in Task 2 (`redact`) and Task 3 (`appendLog`, `buildReport`).
4. **Player CDN blocked (ad blocker, offline):** a readable "nanoPlayer script failed to load" error instead of a `ReferenceError`. Pinned in Task 3 (`startPlayer` missing-constructor test).
5. **Switch clicked again while a switch is pending, or the same stream clicked:** no second `updateSource`, no duplicate `switched`/`error` events. Pinned in Task 10 (SwitchPlayer pending/same-index tests).

---

### Task 1: Skill skeleton, test harness, spec amendment

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/SKILL.md` (stub; completed in Task 12)
- Create: `skills/nanocosmos/nanoplayer-demo/tests/helpers.mjs`
- Create: `skills/nanocosmos/nanoplayer-demo/tests/harness.test.mjs`
- Modify: `docs/superpowers/specs/2026-09-29-nanoplayer-demo-skill-design.md` (§5.2, §5.3, §7)

**Interfaces:**
- Produces: `tests/helpers.mjs` exports `fakeNanoPlayerClass(behavior)` → `{ FakeNanoPlayer, instances }`, `fakeWindow()`, `fakeDocument()`, `fakeEl()`. Used by Tasks 3 and 10.

- [ ] **Step 1: Write the stub SKILL.md**

```markdown
---
name: nanoplayer-demo
description: "Build nanoPlayer demo pages the nanocosmos way — work in progress, see docs/superpowers/plans/2026-09-29-nanoplayer-demo-skill.md"
license: (c) nanocosmos
metadata:
  version: 0.0.1
  author: nanocosmos
  category: streaming
  updated: 2026-09-29
---

# nanoplayer-demo

Work in progress.
```

- [ ] **Step 2: Write test helpers**

`skills/nanocosmos/nanoplayer-demo/tests/helpers.mjs`:

```js
// Test doubles for the nanoplayer-demo browser scripts. No real player, no DOM.

export function fakeNanoPlayerClass(behavior = {}) {
  const instances = [];
  class FakeNanoPlayer {
    constructor(id) {
      this.id = id;
      this.destroyed = 0;
      this.updates = [];
      instances.push(this);
    }
    setup(config) {
      this.config = config;
      if (behavior.deferSetup) {
        return new Promise((resolve, reject) => {
          this.resolveSetup = () => resolve(config);
          this.rejectSetup = (e) => reject(e);
        });
      }
      if (behavior.setupFails) return Promise.reject({ data: { message: 'bad config' } });
      return Promise.resolve(config);
    }
    updateSource(source) {
      this.updates.push(source);
      if (behavior.updateFails) return Promise.reject({ data: { message: 'update rejected' } });
      return Promise.resolve({});
    }
    destroy() {
      this.destroyed++;
      if (behavior.destroyThrows) throw new Error('already destroyed');
    }
    fire(name, data = {}) {
      const fn = this.config && this.config.events && this.config.events[name];
      if (fn) fn({ name, data });
    }
  }
  return { FakeNanoPlayer, instances };
}

export function fakeWindow() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    dispatch(type) { (listeners[type] || []).slice().forEach((f) => f()); },
  };
}

export function fakeDocument() {
  const doc = {
    createElement(tag) { return fakeEl(tag, doc); },
  };
  return doc;
}

export function fakeEl(tag = 'div', doc = null) {
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    childNodes: [],
    scrollTop: 0,
    scrollHeight: 0,
    ownerDocument: doc || fakeDocument(),
    appendChild(child) {
      this.childNodes.push(child);
      this.scrollHeight = this.childNodes.length * 20;
      return child;
    },
    removeChild(child) {
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      return child;
    },
    get firstChild() { return this.childNodes[0] || null; },
  };
  return el;
}
```

- [ ] **Step 3: Write a harness smoke test**

`skills/nanocosmos/nanoplayer-demo/tests/harness.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeNanoPlayerClass, fakeWindow, fakeEl } from './helpers.mjs';

test('fake player records setup config and fires configured events', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const seen = [];
  const p = new FakeNanoPlayer('player');
  await p.setup({ events: { onPlay: (e) => seen.push(e.name) } });
  p.fire('onPlay');
  assert.deepEqual(seen, ['onPlay']);
  assert.equal(instances.length, 1);
});

test('fake window dispatches and removes listeners', () => {
  const win = fakeWindow();
  let n = 0;
  const fn = () => n++;
  win.addEventListener('pagehide', fn);
  win.dispatch('pagehide');
  win.removeEventListener('pagehide', fn);
  win.dispatch('pagehide');
  assert.equal(n, 1);
});

test('fake element appends and removes children', () => {
  const el = fakeEl();
  const child = el.ownerDocument.createElement('span');
  el.appendChild(child);
  assert.equal(el.firstChild, child);
  el.removeChild(child);
  assert.equal(el.childNodes.length, 0);
});
```

- [ ] **Step 4: Run the tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: `# pass 3`, `# fail 0`.

- [ ] **Step 5: Amend the spec for the two approved deviations**

In the spec, replace the whole of §5.2 ("When to add JS modules") with:

```markdown
### 5.2 Shared scripts and when to add `js/app.js`

Every demo carries the shared, tested helper library as a classic script:

    <demo-name>/
      index.html          markup + inline page wiring
      product-theme.css   unmodified copy of canonical
      page.css            demo-specific styles, tokens only
      js/demo-core.js     NanoDemo helpers (copied unmodified by new-demo.mjs)

Page wiring moves from an inline `<script>` into `js/app.js` when any of these
is true: the demo has a wrapper (type G always does), the demo has more than
one page, or the inline script exceeds ~300 lines. Wrappers live in
`js/player-wrapper.js`.

All scripts are classic scripts (no ES modules), so every demo, wrapper demos
included, opens from `file://` as well as from any static host.
```

In §5.3, replace the `templates/` and `references/` part of the tree with:

```
  lib/
    demo-core.js              NanoDemo: config, events, status, log, report, lifecycle
    player-wrapper.js         NanoDemo.SwitchPlayer (the worked wrapper example)
  scripts/
    new-demo.mjs              scaffold: template + lib + canonical theme copy
    check-demo.mjs            mechanical checklist rules
  templates/
    single-player/            index.html, page.css
    feature-showcase/         index.html, page.css
    multi-player/             index.html, page.css
    diagnostics/              index.html, page.css
    branded-page/             index.html, page.css, customer-logo.svg
    feature-wrapper/          index.html, page.css, js/app.js
  tests/                      node --test suites for lib/ and scripts/
  references/
    best-practices.md
    wrapper-pattern.md
    demo-checklist.md
```

In §7, replace the `// js/player-wrapper.js` code block's first line comment and `export class SwitchPlayer` line with:

```js
// js/player-wrapper.js — classic script, exposes NanoDemo.SwitchPlayer
function SwitchPlayer(containerId, options)   // named after the feature
```

and append to §6 rule 9: ` Multi-stream demos add ?streams=a,b,c.`

- [ ] **Step 6: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo docs/superpowers/specs/2026-09-29-nanoplayer-demo-skill-design.md
git commit -m "nanoplayer-demo: skill skeleton, test helpers, spec amendments"
```

---

### Task 2: demo-core — pure config and formatting helpers

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/lib/demo-core.js`
- Test: `skills/nanocosmos/nanoplayer-demo/tests/core-config.test.mjs`

**Interfaces:**
- Produces (on `NanoDemo` / `module.exports`): `VERSION`, `CDN_URL`, `DEFAULTS { stream, serverDomain, apiUrl, latencyControlMode }`, `LATENCY_MODES`, `isUuid(s) → bool`, `readParams(search, defaults?) → { stream, token, server, params: URLSearchParams }`, `buildSource({ stream, token?, server?, apiUrl? }) → source` (throws on empty stream), `buildConfig({ source, playback?, style?, events? }) → config` (throws on bad latency mode), `errorMessage(e) → string`, `redact(text) → string`, `formatStats(stats) → { latency, bitrate, buffer, framerate }`, `statsLine(stats) → string`.

- [ ] **Step 1: Write the failing tests**

`skills/nanocosmos/nanoplayer-demo/tests/core-config.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');

const UUID = 'b6638d50-3581-4349-8fb2-59b3406c2dde';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';

test('isUuid detects group IDs and rejects stream names', () => {
  assert.equal(D.isUuid(UUID), true);
  assert.equal(D.isUuid('  ' + UUID.toUpperCase() + ' '), true);
  assert.equal(D.isUuid('CD6oL-2kE1g'), false);
  assert.equal(D.isUuid(''), false);
  assert.equal(D.isUuid(null), false);
});

test('readParams falls back to defaults', () => {
  const p = D.readParams('');
  assert.equal(p.stream, 'CD6oL-2kE1g');
  assert.equal(p.token, '');
  assert.equal(p.server, 'bintu-play.nanocosmos.de');
});

test('readParams reads stream, token alias and server, trimming whitespace', () => {
  const p = D.readParams('?stream=%20ABCDE-12345%20&jwtoken=' + JWT + '&server=example.test');
  assert.equal(p.stream, 'ABCDE-12345');
  assert.equal(p.token, JWT);
  assert.equal(p.server, 'example.test');
  assert.equal(p.params.get('server'), 'example.test');
});

test('readParams prefers ?token= over ?jwtoken= and treats blank stream as default', () => {
  const p = D.readParams('?stream=%20&token=A&jwtoken=B');
  assert.equal(p.stream, 'CD6oL-2kE1g');
  assert.equal(p.token, 'A');
});

test('readParams accepts per-demo default overrides', () => {
  assert.equal(D.readParams('', { stream: 'XXXXX-YYYYY' }).stream, 'XXXXX-YYYYY');
});

test('buildSource plays a stream name via entries', () => {
  const s = D.buildSource({ stream: 'ABCDE-12345' });
  assert.deepEqual(s.entries, [{ h5live: { rtmp: { streamname: 'ABCDE-12345' }, security: {} } }]);
  assert.equal(s.group, undefined);
  assert.deepEqual(s.defaults, { service: 'bintu' });
  assert.deepEqual(s.general, { serverDomain: 'bintu-play.nanocosmos.de' });
  assert.deepEqual(s.options, { switch: { timeout: 10 }, adaption: { rule: 'deviationOfMean2' } });
  assert.equal(s.startIndex, 0);
});

test('buildSource plays a UUID via group with apiurl and token security', () => {
  const s = D.buildSource({ stream: UUID, token: JWT, server: 'example.test' });
  assert.deepEqual(s.group, { id: UUID, apiurl: 'https://bintu.nanocosmos.de', security: { jwtoken: JWT } });
  assert.equal(s.entries, undefined);
  assert.equal(s.general.serverDomain, 'example.test');
});

test('buildSource rejects an empty or whitespace stream with a readable message', () => {
  assert.throws(() => D.buildSource({ stream: '   ' }), /Enter a stream name/);
  assert.throws(() => D.buildSource({}), /Enter a stream name/);
});

test('buildConfig applies verified playback and style defaults', () => {
  const source = D.buildSource({ stream: 'ABCDE-12345' });
  const c = D.buildConfig({ source });
  assert.equal(c.source, source);
  assert.deepEqual(c.playback, {
    autoplay: true, automute: true, muted: true,
    enableMediaOverQuic: true, faststart: true,
    latencyControlMode: 'balancedadaptive',
  });
  assert.deepEqual(c.style, { scaling: 'fill', width: '100%', height: '100%', view: true, controls: false });
  assert.deepEqual(c.events, {});
});

test('buildConfig merges overrides and keeps automute on with autoplay', () => {
  const c = D.buildConfig({
    source: {},
    playback: { latencyControlMode: 'fastadaptive', enableMediaOverQuic: false, automute: false },
    style: { controls: true },
  });
  assert.equal(c.playback.latencyControlMode, 'fastadaptive');
  assert.equal(c.playback.enableMediaOverQuic, false);
  assert.equal(c.playback.automute, true);
  assert.equal(c.style.controls, true);
  assert.equal(c.style.scaling, 'fill');
});

test('buildConfig rejects a latency value that is not a control mode', () => {
  assert.throws(() => D.buildConfig({ source: {}, playback: { latencyControlMode: '2s' } }),
    /latencyControlMode must be one of fastadaptive, balancedadaptive, classic/);
});

test('errorMessage prefers data.message, then data.error, then code', () => {
  assert.equal(D.errorMessage({ data: { message: 'Stream offline', code: 2002 } }), 'Stream offline');
  assert.equal(D.errorMessage({ data: { error: { message: 'Nested' } } }), 'Nested');
  assert.equal(D.errorMessage({ data: { error: 'Flat' } }), 'Flat');
  assert.equal(D.errorMessage({ data: { code: 4001 } }), 'Player error 4001');
  assert.equal(D.errorMessage(new Error('Plain')), 'Plain');
  assert.equal(D.errorMessage(undefined), 'Unknown player error');
});

test('redact removes JWTs and token URL params', () => {
  const out = D.redact('url https://x.test/?stream=A&token=' + JWT + '&jwtoken=abc#x and raw ' + JWT);
  assert.ok(!out.includes(JWT));
  assert.ok(!out.includes('jwtoken=abc'));
  assert.ok(out.includes('token=[redacted]'));
  assert.ok(out.includes('jwtoken=[redacted]'));
  assert.ok(out.includes('stream=A'));
  assert.equal(D.redact(null), '');
});

test('formatStats reads plain numbers and {current} objects, dashes for missing', () => {
  assert.deepEqual(D.formatStats({ latency: 1.234, bitrate: 1500, bufferDelay: 0.8, frameRate: 30 }),
    { latency: '1.23 s', bitrate: '1500 kbps', buffer: '0.80 s', framerate: '30 fps' });
  assert.deepEqual(D.formatStats({ buffer: { delay: { current: 0.5 } }, framerate: { current: 25 } }),
    { latency: '—', bitrate: '—', buffer: '0.50 s', framerate: '25 fps' });
  assert.deepEqual(D.formatStats(null), { latency: '—', bitrate: '—', buffer: '—', framerate: '—' });
});

test('statsLine renders the status-bar summary', () => {
  assert.equal(D.statsLine(null), 'Latency — · Bitrate — · Buffer —');
  assert.equal(D.statsLine({ latency: 1, bitrate: 900, bufferDelay: 0.5 }), 'Latency 1.00 s · Bitrate 900 kbps · Buffer 0.50 s');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/core-config.test.mjs`
Expected: FAIL with `Cannot find module '../lib/demo-core.js'`.

- [ ] **Step 3: Implement `lib/demo-core.js`**

```js
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
  var DASH = '\u2014';

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
    return 'Latency ' + f.latency + ' \u00b7 Bitrate ' + f.bitrate + ' \u00b7 Buffer ' + f.buffer;
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/lib/demo-core.js skills/nanocosmos/nanoplayer-demo/tests/core-config.test.mjs
git commit -m "nanoplayer-demo: demo-core config, params and formatting helpers"
```

---

### Task 3: demo-core — events, status, logging, report, lifecycle, controller

**Files:**
- Modify: `skills/nanocosmos/nanoplayer-demo/lib/demo-core.js` (add functions before `return {`, extend the export object)
- Test: `skills/nanocosmos/nanoplayer-demo/tests/core-runtime.test.mjs`

**Interfaces:**
- Consumes: Task 2 functions; `tests/helpers.mjs` from Task 1.
- Produces:
  - `playerEvents({ onState?(state, e), onError?(message, e), onStats?(stats, e), onStreamInfo?(info, e), onLog?(name, e), extra?: { [eventName]: fn(e) } }) → events object` for `setup()`. States: `connecting | buffering | playing | paused | error`.
  - `statusView(state) → { badge: 'paused'|'loading'|'playing', label }` (unknown → idle).
  - `renderStatus(badgeEl, labelEl, state)`.
  - `statusHandlers({ badge, badgeText, text, stats? }) → { onState, onError, onStats }`.
  - `appendLog(boxEl, name, detail?, max = 300)` (redacts).
  - `flatten(obj) → [[key, value], …]`.
  - `buildReport({ time, pageUrl, userAgent, config, counters, lastStats, streamInfo, log: string[] }) → string` (redacted).
  - `startPlayer(containerId, config, env?) → Promise<player>` (`env = { NanoPlayer?, window? }`).
  - `stopPlayer(player, env?) → null`.
  - `createController(containerId, handlers, env?) → { load(opts) → Promise<player|null>, stop(), player }`, where `opts = { stream, token?, server?, playback?, style?, extra? }`; `load` never rejects.

- [ ] **Step 1: Write the failing tests**

`skills/nanocosmos/nanoplayer-demo/tests/core-runtime.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeNanoPlayerClass, fakeWindow, fakeEl } from './helpers.mjs';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';

function recorder() {
  const calls = [];
  return {
    calls,
    onState: (s) => calls.push(['state', s]),
    onError: (m) => calls.push(['error', m]),
    onStats: (s) => calls.push(['stats', s]),
    onStreamInfo: (i) => calls.push(['info', i]),
    onLog: (n) => calls.push(['log', n]),
  };
}

test('playerEvents maps player events to demo states', () => {
  const r = recorder();
  const ev = D.playerEvents(r);
  ev.onReady({ data: {} });
  ev.onStartBuffering({ data: {} });
  ev.onPlay({ data: {} });
  ev.onPause({ data: {} });
  const states = r.calls.filter((c) => c[0] === 'state').map((c) => c[1]);
  assert.deepEqual(states, ['connecting', 'buffering', 'playing', 'paused']);
});

test('playerEvents surfaces an offline stream as an error, not a hang', () => {
  const r = recorder();
  D.playerEvents(r).onStreamInfoError({ data: { message: 'stream not available' } });
  assert.deepEqual(r.calls.filter((c) => c[0] !== 'log'), [
    ['state', 'error'],
    ['error', 'Stream not found or offline: stream not available'],
  ]);
});

test('playerEvents forwards onError message, stats and stream info', () => {
  const r = recorder();
  const ev = D.playerEvents(r);
  ev.onError({ data: { message: 'boom' } });
  ev.onStats({ data: { stats: { latency: 1 } } });
  ev.onStreamInfo({ data: { streamInfo: { haveVideo: true } } });
  assert.deepEqual(r.calls.filter((c) => c[0] !== 'log'), [
    ['state', 'error'], ['error', 'boom'],
    ['stats', { latency: 1 }],
    ['info', { haveVideo: true }],
  ]);
});

test('playerEvents merges extra handlers with built-in ones and logs new ones', () => {
  const r = recorder();
  const extra = [];
  const ev = D.playerEvents(Object.assign(r, {
    extra: { onPlay: () => extra.push('play'), onUpdateSourceSuccess: () => extra.push('updated') },
  }));
  ev.onPlay({ data: {} });
  ev.onUpdateSourceSuccess({ data: {} });
  assert.deepEqual(extra, ['play', 'updated']);
  assert.ok(r.calls.some((c) => c[0] === 'state' && c[1] === 'playing'));
  assert.ok(r.calls.some((c) => c[0] === 'log' && c[1] === 'onUpdateSourceSuccess'));
});

test('playerEvents works with no handlers at all', () => {
  const ev = D.playerEvents();
  assert.doesNotThrow(() => { ev.onPlay({ data: {} }); ev.onError({ data: {} }); ev.onStats({}); });
});

test('statusView and renderStatus map states to theme badge classes', () => {
  assert.deepEqual(D.statusView('playing'), { badge: 'playing', label: 'Live' });
  assert.deepEqual(D.statusView('nonsense'), { badge: 'paused', label: 'Idle' });
  const badge = fakeEl('span');
  const label = fakeEl('span');
  D.renderStatus(badge, label, 'connecting');
  assert.equal(badge.className, 'badge loading');
  assert.equal(label.textContent, 'Connecting');
});

test('statusHandlers keep an error visible until playback recovers', () => {
  const ui = { badge: fakeEl(), badgeText: fakeEl(), text: fakeEl(), stats: fakeEl() };
  const h = D.statusHandlers(ui);
  h.onState('error');
  h.onError('Stream not found or offline: x');
  h.onState('paused');
  assert.equal(ui.text.textContent, 'Stream not found or offline: x');
  h.onState('playing');
  assert.equal(ui.text.textContent, '');
  h.onStats({ latency: 2 });
  assert.equal(ui.stats.textContent, 'Latency 2.00 s · Bitrate — · Buffer —');
  h.onState('idle');
  assert.equal(ui.stats.textContent, 'Latency — · Bitrate — · Buffer —');
});

test('appendLog writes redacted lines and caps the log', () => {
  const box = fakeEl();
  D.appendLog(box, 'onError', 'url ?token=' + JWT);
  const line = box.firstChild;
  assert.equal(line.className, 'log-line');
  assert.equal(line.childNodes[0].className, 'ts');
  assert.match(line.childNodes[0].textContent, /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  assert.equal(line.childNodes[1].textContent, 'onError url ?token=[redacted]');
  for (let i = 0; i < 10; i++) D.appendLog(box, 'e' + i, '', 5);
  assert.equal(box.childNodes.length, 5);
  assert.equal(box.childNodes[4].childNodes[1].textContent, 'e9');
});

test('flatten turns nested objects into dotted rows', () => {
  assert.deepEqual(D.flatten({ a: 1, b: { c: 'x', d: { e: true } }, f: [1, 2] }),
    [['a', 1], ['b.c', 'x'], ['b.d.e', true], ['f', '[1,2]']]);
  assert.deepEqual(D.flatten(null), []);
});

test('redact keeps the JSON around a token param intact', () => {
  assert.equal(D.redact('{"url":"wss://x.test/?token=abc"}'), '{"url":"wss://x.test/?token=[redacted]"}');
});

test('buildReport includes all sections and never the token', () => {
  const text = D.buildReport({
    time: '2026-09-29T10:00:00Z',
    pageUrl: 'https://x.test/?stream=A&token=' + JWT,
    userAgent: 'UA',
    config: { stream: 'A', latencyControlMode: 'balancedadaptive' },
    counters: { stats: 3, errors: 1 },
    lastStats: { latency: 1 },
    streamInfo: { url: 'wss://x.test/?token=' + JWT },
    log: ['10:00 onPlay', '10:01 onError ' + JWT],
  });
  assert.ok(!text.includes(JWT));
  for (const part of ['[Config]', 'stream: A', '[Counters]', 'errors: 1', '[Last stats]', '[Stream info]', '[Event log]', '10:00 onPlay']) {
    assert.ok(text.includes(part), 'missing ' + part);
  }
});

test('startPlayer reports a blocked player CDN readably', async () => {
  await assert.rejects(D.startPlayer('player', {}, {}), /nanoPlayer script failed to load/);
});

test('startPlayer sets up the player and destroys it on pagehide', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const win = fakeWindow();
  const cfg = { source: {}, events: {} };
  const p = await D.startPlayer('player', cfg, { NanoPlayer: FakeNanoPlayer, window: win });
  assert.equal(p, instances[0]);
  assert.equal(p.id, 'player');
  assert.equal(p.config, cfg);
  win.dispatch('pagehide');
  assert.equal(p.destroyed, 1);
  assert.equal((win.listeners.pagehide || []).length, 0);
});

test('startPlayer destroys the player and rejects with the message when setup fails', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ setupFails: true });
  const win = fakeWindow();
  await assert.rejects(D.startPlayer('player', {}, { NanoPlayer: FakeNanoPlayer, window: win }), /bad config/);
  assert.equal(instances[0].destroyed, 1);
  assert.equal((win.listeners.pagehide || []).length, 0);
});

test('stopPlayer is null-safe and tolerates an already destroyed player', () => {
  assert.equal(D.stopPlayer(null), null);
  const { FakeNanoPlayer } = fakeNanoPlayerClass({ destroyThrows: true });
  assert.equal(D.stopPlayer(new FakeNanoPlayer('p')), null);
});

test('createController loads a player and reports connecting', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  const p = await ctl.load({ stream: 'ABCDE-12345', playback: { faststart: false } });
  assert.equal(p, instances[0]);
  assert.equal(ctl.player, p);
  assert.equal(p.config.playback.faststart, false);
  assert.equal(p.config.source.entries[0].h5live.rtmp.streamname, 'ABCDE-12345');
  assert.deepEqual(r.calls[0], ['state', 'connecting']);
  p.fire('onPlay');
  assert.deepEqual(r.calls.at(-1), ['state', 'playing']);
});

test('createController reports input and CDN errors through handlers and resolves null', async () => {
  const r = recorder();
  const ctl = D.createController('player', r, { window: fakeWindow() });
  assert.equal(await ctl.load({ stream: ' ' }), null);
  assert.deepEqual(r.calls, [['state', 'error'], ['error', 'Enter a stream name (XXXXX-YYYYY) or a group ID.']]);
  r.calls.length = 0;
  assert.equal(await ctl.load({ stream: 'ABCDE-12345' }), null);
  assert.equal(r.calls.at(-2)[1], 'error');
  assert.match(r.calls.at(-1)[1], /nanoPlayer script failed to load/);
});

test('createController double load keeps one player and ignores the old one', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  await ctl.load({ stream: 'AAAAA-11111' });
  await ctl.load({ stream: 'BBBBB-22222' });
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, instances[1]);
  r.calls.length = 0;
  instances[0].fire('onPlay');
  instances[0].fire('onError', { message: 'old' });
  assert.deepEqual(r.calls, []);
});

test('createController destroys a player whose setup finishes after stop', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ deferSetup: true });
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  const pending = ctl.load({ stream: 'AAAAA-11111' });
  ctl.stop();
  instances[0].resolveSetup();
  assert.equal(await pending, null);
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, null);
  assert.deepEqual(r.calls.at(-1), ['state', 'idle']);
});

test('createController stop destroys the player and reports idle', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  await ctl.load({ stream: 'AAAAA-11111' });
  ctl.stop();
  ctl.stop();
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, null);
  assert.deepEqual(r.calls.at(-1), ['state', 'idle']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/core-runtime.test.mjs`
Expected: FAIL with `TypeError: D.playerEvents is not a function` (and similar).

- [ ] **Step 3: Add the runtime functions to `lib/demo-core.js`**

Insert this block directly above the `return {` line:

```js
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
  function statusHandlers(ui) {
    return {
      onState: function (s) {
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
  // There is no player.stop(): destroy() is the real stop.
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
    var player = null;
    var gen = 0;
    function guard(my, fn) {
      return function () { if (my === gen && fn) { return fn.apply(null, arguments); } };
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
        player = stopPlayer(player, env);
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
              extra: opts.extra
            })
          });
        } catch (err) {
          return Promise.resolve(fail(my, err.message));
        }
        if (h.onState) { h.onState('connecting'); }
        return startPlayer(containerId, config, env).then(function (p) {
          if (my !== gen) { stopPlayer(p, env); return null; }
          player = p;
          return p;
        }, function (err) {
          return fail(my, err.message);
        });
      },
      stop: function () {
        gen++;
        player = stopPlayer(player, env);
        if (h.onState) { h.onState('idle'); }
      },
      get player() { return player; }
    };
  }
```

Then replace the export object with:

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/lib/demo-core.js skills/nanocosmos/nanoplayer-demo/tests/core-runtime.test.mjs
git commit -m "nanoplayer-demo: demo-core events, status, report and player lifecycle"
```

---

### Task 4: check-demo — mechanical checklist rules

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/scripts/check-demo.mjs`
- Test: `skills/nanocosmos/nanoplayer-demo/tests/check-demo.test.mjs`

**Interfaces:**
- Produces: `checkDemo(dir) → Array<{ rule, file, message }>` (empty = pass), `CDN_URL`. CLI: `node scripts/check-demo.mjs <demo-dir>`, exit 0 on pass, 1 on problems, 2 on usage error. Rule ids: `index`, `theme-link`, `no-inline-style`, `theme-file`, `page-css`, `tokens-only`, `noindex`, `version-stamp`, `player-cdn`, `demo-core`, `no-stop`, `events-in-setup`, `no-credentials`.

- [ ] **Step 1: Write the failing tests**

`skills/nanocosmos/nanoplayer-demo/tests/check-demo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDemo, CDN_URL } from '../scripts/check-demo.mjs';

const VALID_HTML = `<!doctype html><html><head>
<meta name="robots" content="noindex, nofollow">
<link href="https://fonts.googleapis.com/css2?family=Lexend+Deca" rel="stylesheet">
<link rel="stylesheet" href="product-theme.css">
<link rel="stylesheet" href="page.css">
</head><body>
<footer><span>v<!-- version -->1.0.0<!-- /version --></span>
<span>Updated <!-- updated -->2026-09-29<!-- /updated --></span></footer>
<script src="${CDN_URL}"></script>
<script src="js/demo-core.js"></script>
<script>document.getElementById('x').addEventListener('click', function (e) { e.stopPropagation(); });</script>
</body></html>`;

function makeDemo(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'npd-check-'));
  const files = Object.assign({
    'index.html': VALID_HTML,
    'product-theme.css': '/* theme */',
    'page.css': '.player-host { position: absolute; inset: 0; color: var(--text-primary); }\n',
    'js/demo-core.js': '// core',
  }, overrides);
  for (const [name, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}
const rules = (dir) => checkDemo(dir).map((p) => p.rule);
const html = (fn) => fn(VALID_HTML);

test('a valid demo passes', () => {
  assert.deepEqual(checkDemo(makeDemo()), []);
});

test('missing index.html is reported and stops the check', () => {
  assert.deepEqual(rules(makeDemo({ 'index.html': null })), ['index']);
});

test('theme must be linked, then page.css', () => {
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('<link rel="stylesheet" href="product-theme.css">', '')) })), ['theme-link']);
  const swapped = html((h) => h.replace('href="product-theme.css"', 'href="TMP"').replace('href="page.css"', 'href="product-theme.css"').replace('href="TMP"', 'href="page.css"'));
  assert.deepEqual(rules(makeDemo({ 'index.html': swapped })), ['theme-link']);
});

test('inline styles are rejected', () => {
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('</head>', '<style>.a{}</style></head>')) })), ['no-inline-style']);
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('<footer>', '<footer style="color:red">')) })), ['no-inline-style']);
});

test('theme copy and page.css must exist', () => {
  assert.deepEqual(rules(makeDemo({ 'product-theme.css': null })), ['theme-file']);
  assert.deepEqual(rules(makeDemo({ 'page.css': null })), ['page-css']);
});

test('page.css may use tokens only, with line numbers in the message', () => {
  const problems = checkDemo(makeDemo({ 'page.css': '.a { color: var(--text-primary); }\n.b { color: #fff; }\n.c { background: rgba(0,0,0,.5); }\n' }));
  assert.deepEqual(problems.map((p) => p.rule), ['tokens-only', 'tokens-only']);
  assert.match(problems[0].message, /"#fff" at line 2/);
  assert.match(problems[1].message, /"rgba\(" at line 3/);
});

test('noindex, version stamp, player CDN and demo-core are required', () => {
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('<meta name="robots" content="noindex, nofollow">', '')) })), ['noindex']);
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('<!-- version -->1.0.0<!-- /version -->', '1.0.0')) })), ['version-stamp']);
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('2026-09-29', '{{DATE}}')) })), ['version-stamp']);
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace(CDN_URL, 'https://cdn.example/nanoplayer.js')) })), ['player-cdn']);
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('<script src="js/demo-core.js"></script>', '')) })), ['demo-core']);
  assert.deepEqual(rules(makeDemo({ 'js/demo-core.js': null })), ['demo-core']);
});

test('player.stop() and post-setup .on() are rejected in html and js', () => {
  assert.deepEqual(rules(makeDemo({ 'index.html': html((h) => h.replace('e.stopPropagation();', 'player.stop();')) })), ['no-stop']);
  const problems = checkDemo(makeDemo({ 'js/app.js': 'var a = 1;\nplayer.on("onPlay", f);\n' }));
  assert.deepEqual(problems.map((p) => [p.rule, p.file]), [['events-in-setup', 'js/app.js']]);
  assert.match(problems[0].message, /line 2/);
});

test('hardcoded credentials are rejected', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';
  assert.deepEqual(rules(makeDemo({ 'js/app.js': `var t = "${jwt}";` })), ['no-credentials']);
  assert.deepEqual(rules(makeDemo({ 'js/app.js': 'var m = { accountKey: "sk-12345" };' })), ['no-credentials']);
  assert.deepEqual(rules(makeDemo({ 'js/app.js': 'var i = \'<input type="password">\';' })), []);
});

test('the real demo-core.js passes the source rules', () => {
  const core = readFileSync(new URL('../lib/demo-core.js', import.meta.url), 'utf8');
  assert.deepEqual(checkDemo(makeDemo({ 'js/demo-core.js': core })), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/check-demo.test.mjs`
Expected: FAIL with `Cannot find module '…/scripts/check-demo.mjs'`.

- [ ] **Step 3: Implement `scripts/check-demo.mjs`**

```js
#!/usr/bin/env node
// Mechanical "demo done" rules for a nanoplayer demo folder.
// Usage: node check-demo.mjs <demo-dir>   → exit 0 pass, 1 problems, 2 usage
// The rest of the checklist (browsers, real streams) is manual:
// see references/demo-checklist.md.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CDN_URL = 'https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js';

function listFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

export function checkDemo(dir) {
  const problems = [];
  const add = (rule, file, message) => problems.push({ rule, file, message });

  const indexPath = join(dir, 'index.html');
  if (!existsSync(indexPath)) {
    add('index', 'index.html', 'missing index.html');
    return problems;
  }
  const html = readFileSync(indexPath, 'utf8');

  const hrefs = [...html.matchAll(/<link\b[^>]*>/gi)]
    .filter((m) => /rel=["']stylesheet["']/i.test(m[0]))
    .map((m) => (m[0].match(/href=["']([^"']+)["']/i) || [])[1]);
  const themeAt = hrefs.indexOf('product-theme.css');
  const pageAt = hrefs.indexOf('page.css');
  if (themeAt < 0) add('theme-link', 'index.html', 'must <link rel="stylesheet" href="product-theme.css">');
  if (pageAt < 0) add('theme-link', 'index.html', 'must <link rel="stylesheet" href="page.css">');
  if (themeAt >= 0 && pageAt >= 0 && pageAt < themeAt) add('theme-link', 'index.html', 'page.css must be linked after product-theme.css');

  if (/<style[\s>]/i.test(html)) add('no-inline-style', 'index.html', 'no <style> blocks; put page styles in page.css');
  if (/\sstyle=["']/i.test(html)) add('no-inline-style', 'index.html', 'no style="" attributes; use classes in page.css');

  if (!existsSync(join(dir, 'product-theme.css'))) {
    add('theme-file', 'product-theme.css', 'copy the canonical product-theme.css next to index.html (scripts/new-demo.mjs does this)');
  }
  const pageCssPath = join(dir, 'page.css');
  if (!existsSync(pageCssPath)) {
    add('page-css', 'page.css', 'missing page.css');
  } else {
    const css = readFileSync(pageCssPath, 'utf8');
    for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g)) {
      add('tokens-only', 'page.css', `raw color "${m[0]}" at line ${lineOf(css, m.index)}; use product-theme.css tokens (var(--...))`);
    }
  }

  if (!/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(html)) {
    add('noindex', 'index.html', 'add <meta name="robots" content="noindex, nofollow">');
  }
  if (!/<!-- version -->\d+\.\d+\.\d+<!-- \/version -->/.test(html) ||
      !/<!-- updated -->\d{4}-\d{2}-\d{2}<!-- \/updated -->/.test(html)) {
    add('version-stamp', 'index.html', 'footer needs v<!-- version -->x.y.z<!-- /version --> and <!-- updated -->YYYY-MM-DD<!-- /updated -->');
  }
  if (!html.includes(`<script src="${CDN_URL}"></script>`)) {
    add('player-cdn', 'index.html', `load the player from ${CDN_URL}`);
  }
  if (!/<script src=["']js\/demo-core\.js["']><\/script>/.test(html)) {
    add('demo-core', 'index.html', 'load <script src="js/demo-core.js"></script> after the player script');
  } else if (!existsSync(join(dir, 'js', 'demo-core.js'))) {
    add('demo-core', 'js/demo-core.js', 'missing js/demo-core.js (copy it from the skill lib/ folder)');
  }

  for (const file of listFiles(dir).filter((f) => /\.(html|js|mjs)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(dir, file).replace(/\\/g, '/');
    for (const m of text.matchAll(/\.stop\s*\(/g)) {
      add('no-stop', rel, `line ${lineOf(text, m.index)}: nanoPlayer has no stop(); use destroy() (NanoDemo.stopPlayer / controller.stop)`);
    }
    for (const m of text.matchAll(/\.on\(\s*["']on[A-Z]\w*["']/g)) {
      add('events-in-setup', rel, `line ${lineOf(text, m.index)}: pass player events in setup({ events }); .on('onX') after setup() races`);
    }
    for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g)) {
      add('no-credentials', rel, `line ${lineOf(text, m.index)}: hardcoded JWT; pass tokens via ?token=`);
    }
    for (const m of text.matchAll(/\b(accountKey|apiKey|apikey|x-bintu-apikey|password)\b["']?\s*[:=]\s*["'][^"']{4,}["']/g)) {
      add('no-credentials', rel, `line ${lineOf(text, m.index)}: hardcoded ${m[1]}; never ship credentials in a demo`);
    }
  }
  return problems;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node check-demo.mjs <demo-dir>');
    process.exit(2);
  }
  const problems = checkDemo(dir);
  for (const p of problems) console.log(`FAIL [${p.rule}] ${p.file}: ${p.message}`);
  console.log(problems.length ? `${problems.length} problem(s)` : 'OK: demo passes all mechanical checks (now walk references/demo-checklist.md)');
  process.exit(problems.length ? 1 : 0);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/scripts/check-demo.mjs skills/nanocosmos/nanoplayer-demo/tests/check-demo.test.mjs
git commit -m "nanoplayer-demo: check-demo script for mechanical checklist rules"
```

---

### Task 5: new-demo scaffolder + single-player template

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/single-player/index.html`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/single-player/page.css`
- Test: `skills/nanocosmos/nanoplayer-demo/tests/new-demo.test.mjs`
- Test: `skills/nanocosmos/nanoplayer-demo/tests/templates.test.mjs`

**Interfaces:**
- Consumes: `checkDemo` (Task 4), `lib/demo-core.js` (Tasks 2–3).
- Produces: `TYPES` (array of template names; grows in Tasks 6–11), `findTheme(explicit?, env?, home?) → path|null`, `scaffold({ type, dest, theme, title?, today? }) → dest`. CLI: `node scripts/new-demo.mjs <type> <dest> [--title "…"] [--theme <path>]`. Templates use placeholders `{{TITLE}}` and `{{DATE}}`.

- [ ] **Step 1: Write the failing scaffolder tests**

`skills/nanocosmos/nanoplayer-demo/tests/new-demo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffold, findTheme, TYPES } from '../scripts/new-demo.mjs';

const tmp = (p) => mkdtempSync(join(tmpdir(), p));
function stubTheme() {
  const f = join(tmp('npd-theme-'), 'product-theme.css');
  writeFileSync(f, '/* stub theme */\n');
  return f;
}

test('TYPES starts with single-player', () => {
  assert.equal(TYPES[0], 'single-player');
});

test('scaffold rejects unknown types, non-empty destinations and a missing theme', () => {
  const theme = stubTheme();
  assert.throws(() => scaffold({ type: 'nope', dest: join(tmp('npd-'), 'd'), theme }), /unknown type "nope"/);
  const busy = tmp('npd-busy-');
  writeFileSync(join(busy, 'x.txt'), 'x');
  assert.throws(() => scaffold({ type: 'single-player', dest: busy, theme }), /exists and is not empty/);
  assert.throws(() => scaffold({ type: 'single-player', dest: join(tmp('npd-'), 'd'), theme: null }), /product-theme.css not found/);
});

test('scaffold copies template, core library and theme, and fills placeholders', () => {
  const theme = stubTheme();
  const dest = join(tmp('npd-'), 'demo');
  scaffold({ type: 'single-player', dest, theme, title: 'Sales <Demo> & Co', today: '2026-09-29' });
  assert.ok(existsSync(join(dest, 'page.css')));
  assert.equal(readFileSync(join(dest, 'product-theme.css'), 'utf8'), '/* stub theme */\n');
  assert.equal(readFileSync(join(dest, 'js', 'demo-core.js'), 'utf8'),
    readFileSync(new URL('../lib/demo-core.js', import.meta.url), 'utf8'));
  const html = readFileSync(join(dest, 'index.html'), 'utf8');
  assert.ok(html.includes('<title>Sales &lt;Demo&gt; &amp; Co</title>'));
  assert.ok(html.includes('<!-- updated -->2026-09-29<!-- /updated -->'));
  assert.ok(!html.includes('{{'));
});

test('findTheme honours explicit path, env var, then skill discovery', () => {
  const theme = stubTheme();
  assert.equal(findTheme(theme, {}, tmp('npd-home-')), theme);
  assert.equal(findTheme(join(tmp('npd-'), 'missing.css'), {}, tmp('npd-home-')), null);
  assert.equal(findTheme(undefined, { NANOCOSMOS_PRODUCT_THEME: theme }, tmp('npd-home-')), theme);
  const home = tmp('npd-home-');
  const skill = join(home, '.claude', 'skills', 'synced', 'abc', 'nanocosmos-brand-guidelines');
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'product-theme.css'), '/* t */');
  assert.equal(findTheme(undefined, {}, home), join(skill, 'product-theme.css'));
  assert.equal(findTheme(undefined, {}, tmp('npd-empty-')), null);
});
```

- [ ] **Step 2: Write the failing template tests**

`skills/nanocosmos/nanoplayer-demo/tests/templates.test.mjs`:

```js
// Every template in TYPES must scaffold into a demo that passes check-demo,
// reference only element ids that exist, and contain parseable scripts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffold, TYPES } from '../scripts/new-demo.mjs';
import { checkDemo } from '../scripts/check-demo.mjs';

const theme = join(mkdtempSync(join(tmpdir(), 'npd-theme-')), 'product-theme.css');
writeFileSync(theme, '/* stub theme */\n');

function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

for (const type of TYPES) {
  test(`${type}: scaffolds and passes check-demo`, () => {
    const dest = join(mkdtempSync(join(tmpdir(), 'npd-tpl-')), type);
    scaffold({ type, dest, theme, title: 'Template Test', today: '2026-09-29' });
    assert.deepEqual(checkDemo(dest), []);
  });

  test(`${type}: scripts parse and every referenced id exists`, () => {
    const dest = join(mkdtempSync(join(tmpdir(), 'npd-tpl-')), type);
    scaffold({ type, dest, theme, title: 'Template Test', today: '2026-09-29' });
    const html = readFileSync(join(dest, 'index.html'), 'utf8');
    const scripts = inlineScripts(html);
    const appJs = join(dest, 'js', 'app.js');
    if (existsSync(appJs)) scripts.push(readFileSync(appJs, 'utf8'));
    assert.ok(scripts.length > 0, 'template has page wiring');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const code of scripts) {
      assert.doesNotThrow(() => new Function(code), 'script must parse');
      for (const m of code.matchAll(/(?:getElementById|\$)\('([\w-]+)'\)/g)) {
        assert.ok(ids.has(m[1]), `id "${m[1]}" used in script but missing in markup`);
      }
    }
  });
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/new-demo.test.mjs tests/templates.test.mjs`
Expected: FAIL with `Cannot find module '…/scripts/new-demo.mjs'`.

- [ ] **Step 4: Implement `scripts/new-demo.mjs`**

```js
#!/usr/bin/env node
// Scaffold a nanoplayer demo from a template.
// Usage: node new-demo.mjs <type> <dest> [--title "Demo title"] [--theme path/to/product-theme.css]
// The theme is the canonical product-theme.css from the nanocosmos-brand-guidelines
// skill: --theme, else $NANOCOSMOS_PRODUCT_THEME, else found under ~/.claude/skills.
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkDemo } from './check-demo.mjs';

export const TYPES = ['single-player'];

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRAPPER_TYPES = new Set(['feature-wrapper']);

function searchTheme(dir, depth) {
  if (depth < 0 || !existsSync(dir)) return null;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name);
    if (e.name === 'nanocosmos-brand-guidelines' && existsSync(join(p, 'product-theme.css'))) {
      return join(p, 'product-theme.css');
    }
    const found = searchTheme(p, depth - 1);
    if (found) return found;
  }
  return null;
}

export function findTheme(explicit, env = process.env, home = homedir()) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  if (env.NANOCOSMOS_PRODUCT_THEME && existsSync(env.NANOCOSMOS_PRODUCT_THEME)) return env.NANOCOSMOS_PRODUCT_THEME;
  return searchTheme(join(home, '.claude', 'skills'), 4);
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function scaffold({ type, dest, theme, title = 'nanoPlayer Demo', today = new Date().toISOString().slice(0, 10) }) {
  if (!TYPES.includes(type)) throw new Error(`unknown type "${type}"; one of: ${TYPES.join(', ')}`);
  if (existsSync(dest) && readdirSync(dest).length) throw new Error(`${dest} exists and is not empty`);
  if (!theme) {
    throw new Error('product-theme.css not found. Pass --theme <path> or set NANOCOSMOS_PRODUCT_THEME; ' +
      'it ships with the nanocosmos-brand-guidelines skill.');
  }
  cpSync(join(SKILL_DIR, 'templates', type), dest, { recursive: true });
  mkdirSync(join(dest, 'js'), { recursive: true });
  copyFileSync(join(SKILL_DIR, 'lib', 'demo-core.js'), join(dest, 'js', 'demo-core.js'));
  if (WRAPPER_TYPES.has(type)) {
    copyFileSync(join(SKILL_DIR, 'lib', 'player-wrapper.js'), join(dest, 'js', 'player-wrapper.js'));
  }
  copyFileSync(theme, join(dest, 'product-theme.css'));
  const indexPath = join(dest, 'index.html');
  const html = readFileSync(indexPath, 'utf8')
    .split('{{TITLE}}').join(escapeHtml(title))
    .split('{{DATE}}').join(today);
  writeFileSync(indexPath, html);
  return dest;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const title = opt('--title');
  const themeArg = opt('--theme');
  const [type, dest] = args;
  if (!type || !dest) {
    console.error(`usage: node new-demo.mjs <type> <dest> [--title "…"] [--theme path]\ntypes: ${TYPES.join(', ')}`);
    process.exit(2);
  }
  try {
    const theme = findTheme(themeArg);
    scaffold({ type, dest: resolve(dest), theme, title });
    console.log(`Created ${type} demo in ${resolve(dest)} (theme: ${theme})`);
    const problems = checkDemo(resolve(dest));
    for (const p of problems) console.log(`FAIL [${p.rule}] ${p.file}: ${p.message}`);
    process.exit(problems.length ? 1 : 0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Create `templates/single-player/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{{TITLE}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;700&family=Source+Sans+3:wght@400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="product-theme.css">
<link rel="stylesheet" href="page.css">
</head>
<body>

  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <img class="logo-lockup" src="https://www.nanocosmos.net/wp-content/uploads/2026/06/nanoStream-logo-V1.webp" alt="nanoStream">
        <div class="header-divider"></div>
        <div class="nav-label"><span class="title">{{TITLE}}</span></div>
      </div>
      <div class="header-right">
        <a href="https://dashboard.nanostream.cloud/signup" target="_blank" rel="noopener" class="theme-pill">Start for free</a>
        <a href="https://www.nanocosmos.net/support/" target="_blank" rel="noopener" class="theme-pill">Contact</a>
        <img class="brand-mark" src="https://www.nanocosmos.net/wp-content/uploads/2025/03/Nanocosmos_logo_RGB_on-dark-bg.png" alt="nanocosmos">
      </div>
    </div>
  </header>

  <main>
    <div class="container">

      <section class="panel form-panel">
        <div class="field">
          <label for="streamInput">Stream name or group ID</label>
          <div class="field-control">
            <input type="text" id="streamInput" autocomplete="off" spellcheck="false">
            <span class="helper">XXXXX-YYYYY or an ABR group ID (UUID); the type is auto-detected. URL: ?stream= · ?token= · ?server=</span>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="btnLoad">Load Stream</button>
          <button class="btn btn-secondary" id="btnStop">Stop</button>
        </div>
      </section>

      <section class="panel player-panel">
        <div class="video-surface"><div id="player" class="player-host"></div></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="badge paused" id="statusBadge"><span class="dot"></span><span id="statusBadgeText">Idle</span></span>
            <span class="status-text" id="statusText"></span>
          </div>
          <div class="status-right" id="statusRight">Latency — · Bitrate — · Buffer —</div>
        </div>
      </section>

    </div>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <span>© 2026 <a href="https://www.nanocosmos.net">nanocosmos</a> GmbH</span>
      <div class="page-version" aria-label="Page version">
        <span>v<!-- version -->1.0.0<!-- /version --></span>
        <span aria-hidden="true">·</span>
        <span>Updated <!-- updated -->{{DATE}}<!-- /updated --></span>
      </div>
    </div>
  </footer>

<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>
<script src="js/demo-core.js"></script>
<script>
(function () {
  'use strict';
  var D = NanoDemo;
  var params = D.readParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    stream: $('streamInput'),
    badge: $('statusBadge'), badgeText: $('statusBadgeText'),
    text: $('statusText'), stats: $('statusRight')
  };
  var ctl = D.createController('player', D.statusHandlers(ui));

  function load() {
    ctl.load({ stream: ui.stream.value, token: params.token, server: params.server });
  }

  ui.stream.value = params.stream;
  $('btnLoad').addEventListener('click', load);
  $('btnStop').addEventListener('click', function () { ctl.stop(); });
  ui.stream.addEventListener('keydown', function (e) { if (e.key === 'Enter') { load(); } });
  load();
})();
</script>
</body>
</html>
```

- [ ] **Step 6: Create `templates/single-player/page.css`**

```css
/* single-player: page-specific rules only. Colors and fonts come from
   product-theme.css tokens; never add raw hex here. */

/* nanoPlayer renders into this div; it fills the theme's 16:10.5 video surface. */
.player-host {
  position: absolute;
  inset: 0;
}
```

- [ ] **Step 7: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including `single-player: scaffolds and passes check-demo` and `single-player: scripts parse and every referenced id exists`.

- [ ] **Step 8: Try the CLI once against the real theme**

Run: `node skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs single-player "$TEMP/npd-cli-demo" --title "CLI Smoke"` (Git Bash: `$TEMP` exists on Windows; elsewhere use `/tmp`)
Expected: `Created single-player demo in … (theme: …nanocosmos-brand-guidelines/product-theme.css)` and exit code 0. If the theme isn't found, rerun with `--theme <path to product-theme.css>`.

- [ ] **Step 9: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs skills/nanocosmos/nanoplayer-demo/templates/single-player skills/nanocosmos/nanoplayer-demo/tests/new-demo.test.mjs skills/nanocosmos/nanoplayer-demo/tests/templates.test.mjs
git commit -m "nanoplayer-demo: new-demo scaffolder and single-player template"
```

---

### Task 6: feature-showcase template

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/templates/feature-showcase/index.html`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/feature-showcase/page.css`
- Modify: `skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs` (`TYPES`)

**Interfaces:**
- Consumes: `NanoDemo.readParams`, `createController`, `statusHandlers`, `LATENCY_MODES`.

- [ ] **Step 1: Add the type so the template tests cover it (and fail)**

In `scripts/new-demo.mjs` change `export const TYPES = ['single-player'];` to:

```js
export const TYPES = ['single-player', 'feature-showcase'];
```

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/templates.test.mjs`
Expected: FAIL for `feature-showcase` (`ENOENT` on `templates/feature-showcase`).

- [ ] **Step 2: Create `templates/feature-showcase/index.html`**

The showcased feature is latency control + MOQ + fast start; demo builders swap the controls and the "About this feature" copy for their feature.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{{TITLE}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;700&family=Source+Sans+3:wght@400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="product-theme.css">
<link rel="stylesheet" href="page.css">
</head>
<body>

  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <img class="logo-lockup" src="https://www.nanocosmos.net/wp-content/uploads/2026/06/nanoStream-logo-V1.webp" alt="nanoStream">
        <div class="header-divider"></div>
        <div class="nav-label"><span class="title">{{TITLE}}</span></div>
      </div>
      <div class="header-right">
        <a href="https://dashboard.nanostream.cloud/signup" target="_blank" rel="noopener" class="theme-pill">Start for free</a>
        <a href="https://www.nanocosmos.net/support/" target="_blank" rel="noopener" class="theme-pill">Contact</a>
        <img class="brand-mark" src="https://www.nanocosmos.net/wp-content/uploads/2025/03/Nanocosmos_logo_RGB_on-dark-bg.png" alt="nanocosmos">
      </div>
    </div>
  </header>

  <main>
    <div class="container">

      <section class="panel feature-panel">
        <h2>About this feature</h2>
        <p>Latency control mode sets how tightly the player holds to the live edge. All three modes are low latency; none of them is a latency value in seconds.</p>
        <p>Change a setting below: the player restarts with the new configuration, and the status bar shows the effect on latency and buffer.</p>
      </section>

      <section class="panel form-panel">
        <div class="field">
          <label for="streamInput">Stream name or group ID</label>
          <div class="field-control">
            <input type="text" id="streamInput" autocomplete="off" spellcheck="false">
            <span class="helper">URL: ?stream= · ?token= · ?server=</span>
          </div>
        </div>
        <div class="field">
          <label for="modeSelect">Latency control mode</label>
          <div class="field-control">
            <select id="modeSelect">
              <option value="fastadaptive">fastadaptive: closest to the live edge</option>
              <option value="balancedadaptive" selected>balancedadaptive: default balance</option>
              <option value="classic">classic: smoothest playback</option>
            </select>
          </div>
        </div>
        <div class="checkbox-row">
          <div class="checkbox-item">
            <input type="checkbox" id="cbMoq" checked>
            <label for="cbMoq">Media over QUIC (MOQ)</label>
          </div>
          <div class="checkbox-item">
            <input type="checkbox" id="cbFastStart" checked>
            <label for="cbFastStart">Fast start</label>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="btnLoad">Load Stream</button>
          <button class="btn btn-secondary" id="btnStop">Stop</button>
        </div>
      </section>

      <section class="panel player-panel">
        <div class="video-surface"><div id="player" class="player-host"></div></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="badge paused" id="statusBadge"><span class="dot"></span><span id="statusBadgeText">Idle</span></span>
            <span class="status-text" id="statusText"></span>
          </div>
          <div class="status-right" id="statusRight">Latency — · Bitrate — · Buffer —</div>
        </div>
      </section>

    </div>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <span>© 2026 <a href="https://www.nanocosmos.net">nanocosmos</a> GmbH</span>
      <div class="page-version" aria-label="Page version">
        <span>v<!-- version -->1.0.0<!-- /version --></span>
        <span aria-hidden="true">·</span>
        <span>Updated <!-- updated -->{{DATE}}<!-- /updated --></span>
      </div>
    </div>
  </footer>

<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>
<script src="js/demo-core.js"></script>
<script>
(function () {
  'use strict';
  var D = NanoDemo;
  var params = D.readParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    stream: $('streamInput'), mode: $('modeSelect'), moq: $('cbMoq'), fast: $('cbFastStart'),
    badge: $('statusBadge'), badgeText: $('statusBadgeText'),
    text: $('statusText'), stats: $('statusRight')
  };
  var ctl = D.createController('player', D.statusHandlers(ui));
  var running = false;

  function load() {
    running = true;
    ctl.load({
      stream: ui.stream.value, token: params.token, server: params.server,
      playback: {
        latencyControlMode: ui.mode.value,
        enableMediaOverQuic: ui.moq.checked,
        faststart: ui.fast.checked
      }
    });
  }

  ui.stream.value = params.stream;
  $('btnLoad').addEventListener('click', load);
  $('btnStop').addEventListener('click', function () { running = false; ctl.stop(); });
  ui.stream.addEventListener('keydown', function (e) { if (e.key === 'Enter') { load(); } });
  // Setup-time options: apply by restarting the player.
  [ui.mode, ui.moq, ui.fast].forEach(function (control) {
    control.addEventListener('change', function () { if (running) { load(); } });
  });
  load();
})();
</script>
</body>
</html>
```

- [ ] **Step 3: Create `templates/feature-showcase/page.css`**

```css
/* feature-showcase: page-specific rules only. Theme tokens only, no raw hex. */

.player-host {
  position: absolute;
  inset: 0;
}

.feature-panel {
  padding: 20px;
}
.feature-panel h2 {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-primary);
}
.feature-panel p {
  margin: 0 0 8px;
  color: var(--text-secondary);
}
.feature-panel p:last-child {
  margin-bottom: 0;
}
```

- [ ] **Step 4: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including both `feature-showcase:` tests.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/templates/feature-showcase skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs
git commit -m "nanoplayer-demo: feature-showcase template"
```

---

### Task 7: multi-player template

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/templates/multi-player/index.html`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/multi-player/page.css`
- Modify: `skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs` (`TYPES`)

**Interfaces:**
- Consumes: `NanoDemo.readParams` (`params.params.get('streams')`), `createController`, `statusHandlers`.

- [ ] **Step 1: Add the type (tests fail)**

```js
export const TYPES = ['single-player', 'feature-showcase', 'multi-player'];
```

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/templates.test.mjs`
Expected: FAIL for `multi-player` (`ENOENT`).

- [ ] **Step 2: Create `templates/multi-player/index.html`**

Use the **Shared page shell** (top of this plan). Replace `<!-- MAIN -->` with:

```html
  <main>
    <div class="container">

      <section class="panel form-panel">
        <div class="field">
          <label for="streamsInput">Streams</label>
          <div class="field-control">
            <input type="text" id="streamsInput" autocomplete="off" spellcheck="false">
            <span class="helper">Comma-separated stream names or group IDs, up to 9. URL: ?streams=a,b,c · ?token= (applies to every tile) · ?server=</span>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="btnLoad">Load All</button>
          <button class="btn btn-secondary" id="btnStop">Stop All</button>
        </div>
        <p class="helper form-note" id="formNote"></p>
      </section>

      <div class="player-grid" id="grid"></div>

      <template id="tileTemplate">
        <section class="panel player-panel">
          <div class="video-surface"><div class="player-host"></div></div>
          <div class="status-bar">
            <div class="status-left">
              <span class="tile-label"></span>
              <span class="badge paused"><span class="dot"></span><span class="badge-text">Idle</span></span>
              <span class="status-text"></span>
            </div>
            <div class="status-right">Latency — · Bitrate — · Buffer —</div>
          </div>
        </section>
      </template>

    </div>
  </main>
```

and replace `<!-- SCRIPTS -->` with:

```html
<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>
<script src="js/demo-core.js"></script>
<script>
(function () {
  'use strict';
  var D = NanoDemo;
  var MAX_TILES = 9;
  var params = D.readParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var ui = { streams: $('streamsInput'), grid: $('grid'), tpl: $('tileTemplate'), note: $('formNote') };
  var tiles = [];

  function parseList(text) {
    return String(text || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function stopAll() {
    tiles.forEach(function (t) { t.ctl.stop(); });
  }

  function buildTiles(list) {
    stopAll();
    tiles = [];
    ui.grid.textContent = '';
    list.forEach(function (stream, i) {
      var node = ui.tpl.content.firstElementChild.cloneNode(true);
      var host = node.querySelector('.player-host');
      host.id = 'player-' + i;
      node.querySelector('.tile-label').textContent = stream;
      ui.grid.appendChild(node);
      var status = D.statusHandlers({
        badge: node.querySelector('.badge'),
        badgeText: node.querySelector('.badge-text'),
        text: node.querySelector('.status-text'),
        stats: node.querySelector('.status-right')
      });
      tiles.push({ stream: stream, ctl: D.createController(host.id, status) });
    });
  }

  function loadAll() {
    var list = parseList(ui.streams.value);
    if (!list.length) { ui.note.textContent = 'Enter at least one stream.'; return; }
    ui.note.textContent = list.length > MAX_TILES
      ? 'Showing the first ' + MAX_TILES + ' of ' + list.length + ' streams.' : '';
    buildTiles(list.slice(0, MAX_TILES));
    tiles.forEach(function (t) {
      t.ctl.load({ stream: t.stream, token: params.token, server: params.server });
    });
  }

  var initial = parseList(params.params.get('streams'));
  ui.streams.value = (initial.length ? initial : [params.stream, params.stream]).join(', ');
  $('btnLoad').addEventListener('click', loadAll);
  $('btnStop').addEventListener('click', stopAll);
  ui.streams.addEventListener('keydown', function (e) { if (e.key === 'Enter') { loadAll(); } });
  loadAll();
})();
</script>
</body>
</html>
```

- [ ] **Step 3: Create `templates/multi-player/page.css`**

```css
/* multi-player: page-specific rules only. Theme tokens only, no raw hex. */

.player-host {
  position: absolute;
  inset: 0;
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
}
@media (max-width: 640px) {
  .player-grid { grid-template-columns: 1fr; }
}

.tile-label {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 13px;
  color: var(--text-primary);
}

.form-note {
  margin: 12px 0 0;
}
.form-note:empty {
  display: none;
}
```

- [ ] **Step 4: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including both `multi-player:` tests.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/templates/multi-player skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs
git commit -m "nanoplayer-demo: multi-player template"
```

---

### Task 8: diagnostics template

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/templates/diagnostics/index.html`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/diagnostics/page.css`
- Modify: `skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs` (`TYPES`)

**Interfaces:**
- Consumes: `createController` (with `onStreamInfo`, `onLog`), `statusHandlers`, `formatStats`, `flatten`, `redact`, `appendLog`, `buildReport`.

- [ ] **Step 1: Add the type (tests fail)**

```js
export const TYPES = ['single-player', 'feature-showcase', 'multi-player', 'diagnostics'];
```

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/templates.test.mjs`
Expected: FAIL for `diagnostics` (`ENOENT`).

- [ ] **Step 2: Create `templates/diagnostics/index.html`**

Use the **Shared page shell** (top of this plan). Replace `<!-- MAIN -->` with:

```html
  <main>
    <div class="container">

      <section class="panel form-panel">
        <div class="field">
          <label for="streamInput">Stream name or group ID</label>
          <div class="field-control">
            <input type="text" id="streamInput" autocomplete="off" spellcheck="false">
            <span class="helper">URL: ?stream= · ?token= · ?server=</span>
          </div>
        </div>
        <div class="field">
          <label for="modeSelect">Latency control mode</label>
          <div class="field-control">
            <select id="modeSelect">
              <option value="fastadaptive">fastadaptive</option>
              <option value="balancedadaptive" selected>balancedadaptive</option>
              <option value="classic">classic</option>
            </select>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="btnLoad">Load Stream</button>
          <button class="btn btn-secondary" id="btnStop">Stop</button>
        </div>
      </section>

      <section class="panel player-panel">
        <div class="video-surface"><div id="player" class="player-host"></div></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="badge paused" id="statusBadge"><span class="dot"></span><span id="statusBadgeText">Idle</span></span>
            <span class="status-text" id="statusText"></span>
          </div>
          <div class="status-right" id="statusRight">Latency — · Bitrate — · Buffer —</div>
        </div>
      </section>

      <div class="stats-row">
        <section class="panel stats-panel">
          <h2>Live stats</h2>
          <div class="info-row"><span class="label">Latency</span><span class="value" id="stLatency">—</span></div>
          <div class="info-row"><span class="label">Bitrate</span><span class="value" id="stBitrate">—</span></div>
          <div class="info-row"><span class="label">Buffer</span><span class="value" id="stBuffer">—</span></div>
          <div class="info-row"><span class="label">Frame rate</span><span class="value" id="stFrameRate">—</span></div>
          <div class="info-row"><span class="label">Stats updates</span><span class="value" id="stUpdates">0</span></div>
          <div class="info-row"><span class="label">Buffering events</span><span class="value" id="stBuffering">0</span></div>
          <div class="info-row"><span class="label">Errors</span><span class="value" id="stErrors">0</span></div>
        </section>
        <section class="panel stats-panel">
          <h2>Stream info</h2>
          <div id="streamInfo"><p class="helper">No stream info yet.</p></div>
        </section>
      </div>

      <section class="panel log-panel">
        <h2>Event log</h2>
        <div class="log-box" id="logBox" aria-live="polite"></div>
        <div class="log-actions">
          <button class="btn btn-primary" id="btnCopy">Copy Diagnostics Report</button>
          <button class="btn btn-secondary" id="btnClear">Clear Log</button>
          <span class="copy-confirm" id="copyConfirm">Copied to clipboard</span>
        </div>
      </section>

    </div>
  </main>
```

and replace `<!-- SCRIPTS -->` with:

```html
<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>
<script src="js/demo-core.js"></script>
<script>
(function () {
  'use strict';
  var D = NanoDemo;
  var LOG_MAX = 300;
  var params = D.readParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    stream: $('streamInput'), mode: $('modeSelect'),
    badge: $('statusBadge'), badgeText: $('statusBadgeText'),
    text: $('statusText'), stats: $('statusRight'),
    info: $('streamInfo'), log: $('logBox'), confirm: $('copyConfirm')
  };
  var counters = { statsUpdates: 0, bufferingEvents: 0, errors: 0 };
  var last = { stats: null, streamInfo: null };
  var logLines = [];
  var status = D.statusHandlers(ui);

  function summarize(e) {
    try {
      var s = JSON.stringify(e && e.data);
      return s && s.length > 200 ? s.slice(0, 200) + '…' : (s || '');
    } catch (err) { return ''; }
  }
  function log(name, detail) {
    logLines.push(new Date().toISOString() + ' ' + name + (detail ? ' ' + detail : ''));
    if (logLines.length > LOG_MAX) { logLines.shift(); }
    D.appendLog(ui.log, name, detail, LOG_MAX);
  }
  function renderCounters() {
    $('stUpdates').textContent = counters.statsUpdates;
    $('stBuffering').textContent = counters.bufferingEvents;
    $('stErrors').textContent = counters.errors;
  }
  function renderStats() {
    var f = D.formatStats(last.stats);
    $('stLatency').textContent = f.latency;
    $('stBitrate').textContent = f.bitrate;
    $('stBuffer').textContent = f.buffer;
    $('stFrameRate').textContent = f.framerate;
  }
  function renderStreamInfo() {
    ui.info.textContent = '';
    D.flatten(last.streamInfo).forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'info-row wrap';
      var k = document.createElement('span');
      k.className = 'label';
      k.textContent = r[0];
      var v = document.createElement('span');
      v.className = 'value';
      v.textContent = D.redact(String(r[1]));
      row.appendChild(k);
      row.appendChild(v);
      ui.info.appendChild(row);
    });
  }

  var ctl = D.createController('player', {
    onState: function (s) {
      status.onState(s);
      if (s === 'buffering') { counters.bufferingEvents++; renderCounters(); }
    },
    onError: function (msg) { status.onError(msg); counters.errors++; renderCounters(); },
    onStats: function (stats) {
      status.onStats(stats);
      last.stats = stats;
      counters.statsUpdates++;
      renderStats();
      renderCounters();
    },
    onStreamInfo: function (info) { last.streamInfo = info; renderStreamInfo(); },
    onLog: function (name, e) { log(name, summarize(e)); }
  });

  function load() {
    ctl.load({
      stream: ui.stream.value, token: params.token, server: params.server,
      playback: { latencyControlMode: ui.mode.value }
    });
  }

  function flashConfirm(text) {
    ui.confirm.textContent = text;
    ui.confirm.classList.add('show');
    setTimeout(function () { ui.confirm.classList.remove('show'); }, 2000);
  }

  $('btnCopy').addEventListener('click', function () {
    var report = D.buildReport({
      time: new Date().toISOString(),
      pageUrl: location.href,
      userAgent: navigator.userAgent,
      config: { stream: ui.stream.value, server: params.server, latencyControlMode: ui.mode.value, token: params.token ? 'present' : 'none' },
      counters: counters,
      lastStats: last.stats,
      streamInfo: last.streamInfo,
      log: logLines
    });
    if (!navigator.clipboard) { flashConfirm('Clipboard unavailable; open the page over https'); return; }
    navigator.clipboard.writeText(report).then(function () {
      flashConfirm('Copied to clipboard');
    }, function () {
      flashConfirm('Copy failed; check browser permissions');
    });
  });
  $('btnClear').addEventListener('click', function () { ui.log.textContent = ''; logLines = []; });
  $('btnLoad').addEventListener('click', load);
  $('btnStop').addEventListener('click', function () { ctl.stop(); });
  ui.mode.addEventListener('change', load);
  ui.stream.addEventListener('keydown', function (e) { if (e.key === 'Enter') { load(); } });

  ui.stream.value = params.stream;
  load();
})();
</script>
</body>
</html>
```

- [ ] **Step 3: Create `templates/diagnostics/page.css`**

```css
/* diagnostics: page-specific rules only. Theme tokens only, no raw hex. */

.player-host {
  position: absolute;
  inset: 0;
}
```

- [ ] **Step 4: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including both `diagnostics:` tests.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/templates/diagnostics skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs
git commit -m "nanoplayer-demo: diagnostics template"
```

---

### Task 9: branded-page template

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/templates/branded-page/index.html`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/branded-page/page.css`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/branded-page/customer-logo.svg`
- Modify: `skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs` (`TYPES`)

**Interfaces:**
- Consumes: `readParams`, `createController`, `statusHandlers`.

Customer identity comes from the logo file and the copy only. Colors stay nanocosmos theme tokens, so no customer hex goes in `page.css` (the `tokens-only` rule enforces this).

- [ ] **Step 1: Add the type (tests fail)**

```js
export const TYPES = ['single-player', 'feature-showcase', 'multi-player', 'diagnostics', 'branded-page'];
```

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/templates.test.mjs`
Expected: FAIL for `branded-page` (`ENOENT`).

- [ ] **Step 2: Create `templates/branded-page/customer-logo.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56" viewBox="0 0 200 56" role="img" aria-label="Customer logo placeholder">
  <rect x="1" y="1" width="198" height="54" rx="4" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-dasharray="6 4"/>
  <text x="100" y="34" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#ffffff" fill-opacity="0.7">Customer logo</text>
</svg>
```

- [ ] **Step 3: Create `templates/branded-page/index.html`**

Use the **Shared page shell** (top of this plan). Replace `<!-- MAIN -->` with:

```html
  <main>
    <div class="container">

      <section class="panel brand-intro">
        <img class="customer-logo" src="customer-logo.svg" alt="Customer logo">
        <div>
          <h1 class="brand-title">{{TITLE}}</h1>
          <p class="brand-text">Event or customer description goes here: one or two sentences on what the viewer is watching.</p>
        </div>
      </section>

      <section class="panel player-panel">
        <div class="video-surface"><div id="player" class="player-host"></div></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="badge paused" id="statusBadge"><span class="dot"></span><span id="statusBadgeText">Idle</span></span>
            <span class="status-text" id="statusText"></span>
          </div>
          <div class="status-right" id="statusRight">Latency — · Bitrate — · Buffer —</div>
        </div>
      </section>

      <p class="helper brand-note">Powered by nanoStream ultra-low-latency delivery. URL: ?stream= · ?token= · ?server=</p>

    </div>
  </main>
```

and replace `<!-- SCRIPTS -->` with:

```html
<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>
<script src="js/demo-core.js"></script>
<script>
(function () {
  'use strict';
  var D = NanoDemo;
  var params = D.readParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var ctl = D.createController('player', D.statusHandlers({
    badge: $('statusBadge'), badgeText: $('statusBadgeText'),
    text: $('statusText'), stats: $('statusRight')
  }));
  // Viewer-facing page: no stream form, the stream comes from the URL.
  ctl.load({ stream: params.stream, token: params.token, server: params.server });
})();
</script>
</body>
</html>
```

- [ ] **Step 4: Create `templates/branded-page/page.css`**

```css
/* branded-page: page-specific rules only. Customer identity = logo + copy;
   colors stay nanocosmos theme tokens (no raw hex, check-demo enforces it). */

.player-host {
  position: absolute;
  inset: 0;
}

.brand-intro {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
}
.customer-logo {
  height: 56px;
  width: auto;
}
.brand-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 28px;
  margin: 0 0 6px;
  color: var(--text-primary);
}
.brand-text {
  margin: 0;
  color: var(--text-secondary);
}
.brand-note {
  margin: 0;
  color: var(--text-muted);
}
@media (max-width: 640px) {
  .brand-intro { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 5: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including both `branded-page:` tests.

- [ ] **Step 6: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/templates/branded-page skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs
git commit -m "nanoplayer-demo: branded-page template"
```

---

### Task 10: player-wrapper — NanoDemo.SwitchPlayer

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/lib/player-wrapper.js`
- Test: `skills/nanocosmos/nanoplayer-demo/tests/wrapper.test.mjs`

**Interfaces:**
- Consumes: `createController`, `buildSource`, `errorMessage` from `lib/demo-core.js`.
- Produces: `NanoDemo.SwitchPlayer(containerId, options)` where `options = { token?, server?, playback?, style?, env? }`; methods `on(type, fn) → this`, `load(streams: Array<{label, stream}>) → Promise<boolean>`, `switchTo(index) → Promise<index>`, `destroy()`; getters `state`, `index`. Events (all `{ type, data, time }`): `state {state}`, `error {message}`, `stats {stats}`, `log {name, event}`, `switching {from, to}`, `switched {from, index}`.

- [ ] **Step 1: Write the failing tests**

`skills/nanocosmos/nanoplayer-demo/tests/wrapper.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeNanoPlayerClass, fakeWindow } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { SwitchPlayer } = require('../lib/player-wrapper.js');

const STREAMS = [{ label: 'A', stream: 'AAAAA-11111' }, { label: 'B', stream: 'BBBBB-22222' }];

function setup(behavior) {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass(behavior);
  const sp = new SwitchPlayer('player', { token: 'T', env: { NanoPlayer: FakeNanoPlayer, window: fakeWindow() } });
  const events = [];
  for (const type of ['state', 'error', 'switching', 'switched', 'stats']) {
    sp.on(type, (e) => events.push([e.type, e.data]));
  }
  return { sp, instances, events };
}
const only = (events, type) => events.filter((e) => e[0] === type).map((e) => e[1]);

test('load plays the first stream with the token and reports states', async () => {
  const { sp, instances, events } = setup();
  assert.equal(await sp.load(STREAMS), true);
  const src = instances[0].config.source;
  assert.equal(src.entries[0].h5live.rtmp.streamname, 'AAAAA-11111');
  assert.deepEqual(src.entries[0].h5live.security, { jwtoken: 'T' });
  instances[0].fire('onPlay');
  assert.deepEqual(only(events, 'state').map((d) => d.state), ['connecting', 'playing']);
  assert.equal(sp.state, 'playing');
  assert.equal(sp.index, 0);
});

test('events carry a timestamp', async () => {
  const { sp } = setup();
  let evt;
  sp.on('state', (e) => { evt = e; });
  await sp.load(STREAMS);
  assert.equal(evt.type, 'state');
  assert.equal(typeof evt.time, 'number');
});

test('load rejects an empty list and reports a failed setup', async () => {
  const { sp } = setup();
  await assert.rejects(sp.load([]), /at least one stream/);
  const failing = setup({ setupFails: true });
  assert.equal(await failing.sp.load(STREAMS), false);
  assert.deepEqual(only(failing.events, 'error'), [{ message: 'bad config' }]);
  assert.equal(failing.sp.state, 'error');
});

test('switchTo updates the source and resolves on onUpdateSourceSuccess', async () => {
  const { sp, instances, events } = setup();
  await sp.load(STREAMS);
  const pending = sp.switchTo(1);
  assert.equal(instances[0].updates.length, 1);
  assert.equal(instances[0].updates[0].entries[0].h5live.rtmp.streamname, 'BBBBB-22222');
  assert.deepEqual(only(events, 'switching'), [{ from: 0, to: 1 }]);
  instances[0].fire('onUpdateSourceSuccess');
  assert.equal(await pending, 1);
  assert.deepEqual(only(events, 'switched'), [{ from: 0, index: 1 }]);
  assert.equal(sp.index, 1);
});

test('a failed switch emits one error, rejects and keeps the current stream', async () => {
  const { sp, instances, events } = setup();
  await sp.load(STREAMS);
  const pending = sp.switchTo(1);
  instances[0].fire('onUpdateSourceFail', { message: 'not found' });
  instances[0].fire('onUpdateSourceError', { message: 'again' });
  await assert.rejects(pending, /not found/);
  assert.deepEqual(only(events, 'error'), [{ message: 'Switch failed: not found' }]);
  assert.equal(sp.index, 0);
});

test('a rejected updateSource promise fails the switch once', async () => {
  const { sp, instances, events } = setup({ updateFails: true });
  await sp.load(STREAMS);
  await assert.rejects(sp.switchTo(1), /update rejected/);
  instances[0].fire('onUpdateSourceFail', { message: 'late' });
  assert.equal(only(events, 'error').length, 1);
});

test('a second switch while one is pending is rejected without a second updateSource', async () => {
  const { sp, instances } = setup();
  await sp.load(STREAMS);
  const first = sp.switchTo(1);
  await assert.rejects(sp.switchTo(0), /already in progress/);
  assert.equal(instances[0].updates.length, 1);
  instances[0].fire('onUpdateSourceSuccess');
  assert.equal(await first, 1);
});

test('switching to the current stream is a no-op; bad calls are rejected', async () => {
  const { sp, instances } = setup();
  await assert.rejects(sp.switchTo(1), /Call load\(\) first/);
  await sp.load(STREAMS);
  assert.equal(await sp.switchTo(0), 0);
  assert.equal(instances[0].updates.length, 0);
  await assert.rejects(sp.switchTo(5), /No stream at index 5/);
});

test('destroy stops the player, rejects a pending switch quietly and is idempotent', async () => {
  const { sp, instances, events } = setup();
  await sp.load(STREAMS);
  const pending = sp.switchTo(1);
  sp.destroy();
  sp.destroy();
  await assert.rejects(pending, /destroyed/);
  assert.equal(instances[0].destroyed, 1);
  assert.equal(sp.state, 'idle');
  assert.equal(sp.index, -1);
  assert.deepEqual(only(events, 'error'), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/wrapper.test.mjs`
Expected: FAIL with `Cannot find module '../lib/player-wrapper.js'`.

- [ ] **Step 3: Implement `lib/player-wrapper.js`**

```js
/* nanoplayer-demo wrapper example: NanoDemo.SwitchPlayer.
 *
 * Presents nanoPlayer as a "switch player": load a list of streams, switch
 * between them in place with updateSource() (no teardown, no black frame).
 * Copy this file as the starting point for any feature wrapper; see
 * references/wrapper-pattern.md for the contract.
 *
 * Classic script. Load after js/demo-core.js. Browser: NanoDemo.SwitchPlayer.
 * Node (tests): module.exports.SwitchPlayer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./demo-core.js')); }
  else { root.NanoDemo.SwitchPlayer = factory(root.NanoDemo).SwitchPlayer; }
})(typeof self !== 'undefined' ? self : this, function (core) {
  'use strict';

  var SWITCH_FAIL_EVENTS = ['onUpdateSourceFail', 'onUpdateSourceError', 'onUpdateSourceTimeout',
    'onUpdateSourceAbort', 'onUpdateSourceInvalid'];

  function SwitchPlayer(containerId, options) {
    var self = this;
    this._opts = options || {};
    this._streams = [];
    this._index = -1;
    this._pending = null; // { to, resolve, reject } while a switch is in flight
    this._state = 'idle';
    this._handlers = {};
    this._ctl = core.createController(containerId, {
      onState: function (s) { self._setState(s); },
      onError: function (msg) { self._emit('error', { message: msg }); },
      onStats: function (stats) { self._emit('stats', { stats: stats }); },
      onLog: function (name, e) { self._emit('log', { name: name, event: e }); }
    }, this._opts.env);
  }

  SwitchPlayer.prototype.on = function (type, fn) {
    (this._handlers[type] = this._handlers[type] || []).push(fn);
    return this;
  };

  SwitchPlayer.prototype._emit = function (type, data) {
    var evt = { type: type, data: data, time: Date.now() };
    (this._handlers[type] || []).slice().forEach(function (fn) { fn(evt); });
  };

  SwitchPlayer.prototype._setState = function (s) {
    if (s === this._state) { return; }
    this._state = s;
    this._emit('state', { state: s });
  };

  SwitchPlayer.prototype._source = function (i) {
    return core.buildSource({ stream: this._streams[i].stream, token: this._opts.token, server: this._opts.server });
  };

  // First outcome wins; later success/fail events for the same switch are ignored.
  SwitchPlayer.prototype._settle = function (errMsg, quiet) {
    var p = this._pending;
    if (!p) { return; }
    this._pending = null;
    if (errMsg) {
      if (!quiet) { this._emit('error', { message: 'Switch failed: ' + errMsg }); }
      p.reject(new Error(errMsg));
      return;
    }
    var from = this._index;
    this._index = p.to;
    this._emit('switched', { from: from, index: p.to });
    p.resolve(p.to);
  };

  SwitchPlayer.prototype.load = function (streams) {
    var self = this;
    if (!Array.isArray(streams) || streams.length === 0) {
      return Promise.reject(new Error('SwitchPlayer.load needs at least one stream.'));
    }
    this._settle('superseded by load()', true);
    this._streams = streams.slice();
    this._index = 0;
    var extra = { onUpdateSourceSuccess: function () { self._settle(null); } };
    SWITCH_FAIL_EVENTS.forEach(function (name) {
      extra[name] = function (e) { self._settle(core.errorMessage(e)); };
    });
    return this._ctl.load({
      stream: streams[0].stream,
      token: this._opts.token,
      server: this._opts.server,
      playback: this._opts.playback,
      style: this._opts.style,
      extra: extra
    }).then(function (player) { return player !== null; });
  };

  SwitchPlayer.prototype.switchTo = function (i) {
    var self = this;
    var player = this._ctl.player;
    if (!player) { return Promise.reject(new Error('Call load() first.')); }
    if (!(i >= 0 && i < this._streams.length)) { return Promise.reject(new Error('No stream at index ' + i + '.')); }
    if (this._pending) { return Promise.reject(new Error('A switch is already in progress.')); }
    if (i === this._index) { return Promise.resolve(i); }
    return new Promise(function (resolve, reject) {
      self._pending = { to: i, resolve: resolve, reject: reject };
      self._emit('switching', { from: self._index, to: i });
      // onUpdateSource* events are the authority for the outcome; a rejected
      // promise (bad source, player gone) fails the switch too.
      player.updateSource(self._source(i)).then(null, function (err) {
        self._settle(core.errorMessage(err));
      });
    });
  };

  SwitchPlayer.prototype.destroy = function () {
    this._settle('player destroyed', true);
    this._ctl.stop();
    this._index = -1;
  };

  Object.defineProperty(SwitchPlayer.prototype, 'state', { get: function () { return this._state; } });
  Object.defineProperty(SwitchPlayer.prototype, 'index', { get: function () { return this._index; } });

  return { SwitchPlayer: SwitchPlayer };
});
```

- [ ] **Step 4: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/lib/player-wrapper.js skills/nanocosmos/nanoplayer-demo/tests/wrapper.test.mjs
git commit -m "nanoplayer-demo: SwitchPlayer wrapper example"
```

---

### Task 11: feature-wrapper template

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/templates/feature-wrapper/index.html`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/feature-wrapper/page.css`
- Create: `skills/nanocosmos/nanoplayer-demo/templates/feature-wrapper/js/app.js`
- Modify: `skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs` (`TYPES`)
- Modify: `skills/nanocosmos/nanoplayer-demo/tests/new-demo.test.mjs` (wrapper copy test)

**Interfaces:**
- Consumes: `NanoDemo.SwitchPlayer` (Task 10), `readParams`, `statusHandlers`, `appendLog`. `new-demo.mjs` already copies `lib/player-wrapper.js` for `feature-wrapper` (`WRAPPER_TYPES`, Task 5).

- [ ] **Step 1: Add the type and a wrapper-copy test (tests fail)**

```js
export const TYPES = ['single-player', 'feature-showcase', 'multi-player', 'diagnostics', 'branded-page', 'feature-wrapper'];
```

Append to `tests/new-demo.test.mjs`:

```js
test('feature-wrapper also gets the wrapper library, other types do not', () => {
  const theme = stubTheme();
  const wrapped = join(tmp('npd-'), 'w');
  scaffold({ type: 'feature-wrapper', dest: wrapped, theme });
  assert.equal(readFileSync(join(wrapped, 'js', 'player-wrapper.js'), 'utf8'),
    readFileSync(new URL('../lib/player-wrapper.js', import.meta.url), 'utf8'));
  assert.ok(existsSync(join(wrapped, 'js', 'app.js')));
  const plain = join(tmp('npd-'), 'p');
  scaffold({ type: 'single-player', dest: plain, theme });
  assert.ok(!existsSync(join(plain, 'js', 'player-wrapper.js')));
});
```

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: FAIL for `feature-wrapper` (`ENOENT`).

- [ ] **Step 2: Create `templates/feature-wrapper/index.html`**

Use the **Shared page shell** (top of this plan). Replace `<!-- MAIN -->` with:

```html
  <main>
    <div class="container">

      <section class="panel form-panel">
        <div class="field">
          <label for="streamsInput">Streams</label>
          <div class="field-control">
            <input type="text" id="streamsInput" autocomplete="off" spellcheck="false">
            <span class="helper">Comma-separated stream names or group IDs to switch between. URL: ?streams=a,b · ?token= · ?server=</span>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="btnLoad">Load</button>
          <button class="btn btn-secondary" id="btnStop">Stop</button>
        </div>
      </section>

      <section class="panel player-panel">
        <div class="video-surface"><div id="player" class="player-host"></div></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="badge paused" id="statusBadge"><span class="dot"></span><span id="statusBadgeText">Idle</span></span>
            <span class="status-text" id="statusText"></span>
          </div>
          <div class="status-right" id="statusRight">Latency — · Bitrate — · Buffer —</div>
        </div>
      </section>

      <section class="panel switch-panel">
        <h2>Switch to</h2>
        <div class="button-row" id="switchButtons"></div>
      </section>

      <section class="panel log-panel">
        <h2>Switch events</h2>
        <div class="log-box" id="logBox" aria-live="polite"></div>
      </section>

    </div>
  </main>
```

and replace `<!-- SCRIPTS -->` with:

```html
<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>
<script src="js/demo-core.js"></script>
<script src="js/player-wrapper.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `templates/feature-wrapper/js/app.js`**

```js
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
```

- [ ] **Step 4: Create `templates/feature-wrapper/page.css`**

```css
/* feature-wrapper: page-specific rules only. Theme tokens only, no raw hex. */

.player-host {
  position: absolute;
  inset: 0;
}

.switch-panel {
  padding: 20px;
}
.switch-panel h2 {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-primary);
}

/* The stream currently playing. Orange = active state. */
.btn.is-active {
  box-shadow: 0 0 0 2px var(--accent-orange);
}
```

- [ ] **Step 5: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including both `feature-wrapper:` template tests and the wrapper-copy test.

- [ ] **Step 6: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/templates/feature-wrapper skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs skills/nanocosmos/nanoplayer-demo/tests/new-demo.test.mjs
git commit -m "nanoplayer-demo: feature-wrapper template (switch player)"
```

---

### Task 12: SKILL.md and references

**Files:**
- Modify: `skills/nanocosmos/nanoplayer-demo/SKILL.md` (replace the stub)
- Create: `skills/nanocosmos/nanoplayer-demo/references/best-practices.md`
- Create: `skills/nanocosmos/nanoplayer-demo/references/wrapper-pattern.md`
- Create: `skills/nanocosmos/nanoplayer-demo/references/demo-checklist.md`
- Test: `skills/nanocosmos/nanoplayer-demo/tests/docs.test.mjs`

**Interfaces:**
- Consumes: every name produced in Tasks 2–11 (docs must match the code).

- [ ] **Step 1: Write the failing docs consistency test**

`skills/nanocosmos/nanoplayer-demo/tests/docs.test.mjs`:

```js
// Docs must name what the code actually has: every NanoDemo function,
// every template type, and only existing reference files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TYPES } from '../scripts/new-demo.mjs';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const skill = read('SKILL.md');

test('SKILL.md frontmatter names the skill', () => {
  assert.match(skill, /^---\r?\nname: nanoplayer-demo\r?\n/);
  assert.match(skill, /\n {2}version: 1\.0\.0\r?\n/);
});

test('SKILL.md lists every template type', () => {
  for (const t of TYPES) assert.ok(skill.includes('`' + t + '`'), 'missing type ' + t);
});

test('SKILL.md documents every public NanoDemo function', () => {
  const fns = Object.keys(D).filter((k) => typeof D[k] === 'function');
  for (const f of fns) assert.ok(skill.includes(f), 'missing NanoDemo.' + f);
});

test('every references/ link in SKILL.md exists', () => {
  for (const m of skill.matchAll(/references\/[\w-]+\.md/g)) {
    assert.ok(existsSync(new URL('../' + m[0], import.meta.url)), 'dangling ' + m[0]);
  }
});

test('wrapper-pattern.md documents the SwitchPlayer API', () => {
  const doc = read('references/wrapper-pattern.md');
  for (const name of ['load(', 'switchTo(', 'destroy(', "on('", 'switching', 'switched', 'createController']) {
    assert.ok(doc.includes(name), 'missing ' + name);
  }
});
```

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test tests/docs.test.mjs`
Expected: FAIL (stub SKILL.md has no types, version 0.0.1).

- [ ] **Step 2: Write `SKILL.md`**

````markdown
---
name: nanoplayer-demo
description: "Build nanoPlayer demo pages the nanocosmos way: one base look, verified player usage, six starter templates (single player, feature showcase, multi-player grid, diagnostics, customer/event-branded page, feature wrapper such as a switch player), a demo checker and a done-checklist. Use whenever someone asks for a player demo, sample page, feature demo, comparison page or wrapper around nanoPlayer, for sales, marketing, support or product. Not for marketing pages on nanocosmos.net (nanocosmos-brand-guidelines) or raw player API questions (nanostream-development)."
license: (c) nanocosmos
metadata:
  version: 1.0.0
  author: nanocosmos
  category: streaming
  updated: 2026-09-29
---

# nanoplayer-demo

Every nanoPlayer demo, whoever builds it, starts from one of this skill's
templates, uses the shared `NanoDemo` helpers for all player work, and passes
`check-demo` plus the checklist before handover.

## Who owns what

| Concern | Owner |
|---|---|
| Look: colors, fonts, header/footer, buttons, panels | `nanocosmos-brand-guidelines` (`product-theme.css`, `product-sample.html`) |
| Player facts: config values, events, lifecycle, JWT, ABR | `nanostream-development` |
| Demo templates, `NanoDemo` helpers, wrapper pattern, rules, checklist | this skill |

Don't restate or override the other two here. For nanocosmos demos, don't
start from `nanostream-development/player/player-demo.html`: it uses the
Dark Neutral Studio colors, which brand-guidelines rules out for nanocosmos
pages.

## Workflow

1. **Pick the template.**

   | Type | Use for |
   |---|---|
   | `single-player` | One stream in the brand shell, e.g. a link for sales or marketing |
   | `feature-showcase` | One player feature with its controls and an "About this feature" panel |
   | `multi-player` | Grid of streams or side-by-side comparison (`?streams=a,b,c`, up to 9) |
   | `diagnostics` | Live stats, stream info, event log, copyable support report |
   | `branded-page` | Viewer-facing page for a customer or event (their logo and copy, nanocosmos theme) |
   | `feature-wrapper` | A JS wrapper presenting a feature as its own thing, e.g. the switch player |

2. **Scaffold.** From this skill's directory:

   ```bash
   node scripts/new-demo.mjs <type> <dest-dir> --title "Demo title"
   ```

   This copies the template, `js/demo-core.js` (+ `js/player-wrapper.js` for
   `feature-wrapper`) and the canonical `product-theme.css`. The theme is found
   via `--theme <path>`, `$NANOCOSMOS_PRODUCT_THEME`, or the installed
   `nanocosmos-brand-guidelines` skill under `~/.claude/skills`. Without that
   skill the scaffold stops and says so.

3. **Build the demo.** Edit `index.html` (markup and the inline page wiring,
   or `js/app.js`) and `page.css`. Never edit `product-theme.css` or
   `js/demo-core.js` in a demo; fix shared problems in this skill. Follow
   `references/best-practices.md`. For a wrapper, follow
   `references/wrapper-pattern.md`.

4. **Check.** `node scripts/check-demo.mjs <dest-dir>` must print `OK`.

5. **Walk the checklist.** `references/demo-checklist.md` covers the manual
   checks (real streams, browsers, copy).

<!-- internal -->
6. **Register and host.** See `internal/hosting.md`: theme-consumer
   registration and GitLab Pages deploy.
<!-- /internal -->

## Page layout

Every demo is a small folder, never a single file with inlined CSS:

```
<demo>/
  index.html          markup + inline wiring (or js/app.js)
  product-theme.css   unmodified copy of canonical, never edited
  page.css            demo-only rules, theme tokens only
  js/demo-core.js     NanoDemo helpers, never edited
```

Move the page wiring into `js/app.js` when the demo has a wrapper, more than
one page, or more than ~300 lines of inline script. All scripts are classic
scripts, so demos open from `file://` and from any static host.

## NanoDemo API (js/demo-core.js)

| Function | Use |
|---|---|
| `readParams(location.search)` | `{ stream, token, server, params }` from `?stream= ?token=/?jwtoken= ?server=` |
| `isUuid(s)` | Group/stream ID vs stream name |
| `buildSource({ stream, token, server })` | The verified base source (`entries` for names, `group` for UUIDs) |
| `buildConfig({ source, playback, style, events })` | Verified defaults; rejects invalid `latencyControlMode` |
| `createController(containerId, handlers)` | **Use this for every player.** `load(opts)` / `stop()` / `player`; handles double-loads, errors, pagehide |
| `playerEvents(handlers)` | Player events → `connecting/buffering/playing/paused/error` (used by the controller) |
| `statusHandlers(ui)` | Standard status-bar wiring for `{ badge, badgeText, text, stats }` |
| `statusView(state)` / `renderStatus(badge, label, state)` | Theme badge class + label for a state |
| `formatStats(stats)` / `statsLine(stats)` | `onStats` payload → display strings |
| `appendLog(box, name, detail)` | Timestamped, redacted log line, capped at 300 |
| `flatten(obj)` | Nested object → `[key, value]` rows |
| `buildReport(info)` | Redacted plain-text support report |
| `errorMessage(e)` / `redact(text)` | Readable player errors; strip JWTs and `token=` params |
| `startPlayer(id, config)` / `stopPlayer(player)` | Low-level lifecycle (the controller uses these) |

`NanoDemo.SwitchPlayer` (js/player-wrapper.js) is the worked wrapper example.

## Tests (skill maintainers)

```bash
cd <this skill> && node --test
```

Node 20+, no dependencies. Tests cover `lib/`, `scripts/` and every template.

## Changelog

### 1.0.0 (2026-09-29)

- First version: six templates, `NanoDemo` core, `SwitchPlayer` wrapper,
  `new-demo` / `check-demo` scripts, best practices, wrapper pattern, checklist.
````

- [ ] **Step 3: Write `references/best-practices.md`**

```markdown
# nanoPlayer demo best practices

One line per rule. Where another skill owns the detail, follow the pointer;
don't copy the detail into a demo.

## Player usage (details: nanostream-development/SKILL.md)

1. Load `https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js`, then `js/demo-core.js`. `startPlayer` reports a blocked CDN readably.
2. Pass player events in `setup({ events })`. Never call `player.on('onX')` after `setup()`: it races the first events. `createController` does this for you.
3. Always surface `onStreamInfoError` (offline or unknown stream) and `onError` (`e.data.message` first). `statusHandlers` shows both in the status bar.
4. Drive UI state from player events (`onPlay`, `onPause`, buffering), not from click handlers.
5. Use `onStats` for metrics; never poll.
6. There is no `stop()`. Stop = `destroy()` (`controller.stop()`); another stream in place = `updateSource(source)`; an ABR rendition = `switchStream(index)`.
7. `latencyControlMode` is `fastadaptive`, `balancedadaptive` (default) or `classic`: a behavior, not seconds. `buildConfig` rejects anything else.
8. Autoplay needs `automute`; `buildConfig` enforces it.
9. `adaption.rule` stays `deviationOfMean2`; it's not an ABR on/off switch.

## Demo conventions (owned here)

10. URL params: `?stream=` (name or UUID, auto-detected), `?token=` (alias `?jwtoken=`), `?server=`; multi-stream demos add `?streams=a,b,c`. Document them in the page's helper text.
11. Never ship credentials: no API keys, metrics keys or long-lived tokens in any file. Tokens come from `?token=`, and logs/reports are redacted. `check-demo` flags JWT literals and key assignments.
12. The default stream is one constant (`DEFAULTS.stream`, or a `DEFAULT_STREAMS` constant at the top of `app.js`).
13. Copy is functional and label-driven. The only marketing links are the standard header pill pair from `product-sample.html`.
14. Bump the footer version stamp on every change (PATCH for fixes, MINOR for features), with today's date.
15. `<meta name="robots" content="noindex, nofollow">`.
16. Players are destroyed on `pagehide`, so demos don't leave viewer sessions open (`startPlayer` does it).
17. Look: link `product-theme.css` unmodified, then `page.css`; tokens only in `page.css`; class selectors only. Details: nanocosmos-brand-guidelines, product tier.
18. Customer branding (`branded-page`) = customer logo + copy. Colors stay nanocosmos tokens.
```

- [ ] **Step 4: Write `references/wrapper-pattern.md`**

````markdown
# Wrapper pattern

A feature wrapper presents nanoPlayer as a product or use case of its own
(the "switch player", a "replay player", a "watch party"). The page talks to
the wrapper; only the wrapper talks to nanoPlayer.

`lib/player-wrapper.js` (`NanoDemo.SwitchPlayer`) is the worked example. The
`feature-wrapper` template wires it into a page.

## Contract

```js
var sp = new NanoDemo.SwitchPlayer('player', { token: params.token, server: params.server });
sp.on('state', function (e) { /* e.data.state */ });
sp.on('switched', function (e) { /* e.data.index */ });
sp.load([{ label: 'Cam 1', stream: 'XXXXX-YYYYY' }, { label: 'Cam 2', stream: '<uuid>' }]);
sp.switchTo(1);          // Promise<index>
sp.destroy();            // idempotent
sp.state; sp.index;
```

Rules every wrapper follows:

1. **Built on `NanoDemo.createController`.** The controller owns the only
   `NanoPlayer` instance, wires events in `setup({ events })` and handles
   double-loads and `pagehide`. The page never touches `NanoPlayer`.
2. **Feature-shaped API.** Methods name the feature (`switchTo`, not
   `updateSource`). `load(...)`, `destroy()`, `on(type, fn)` and a `state`
   getter are always present.
3. **One event shape:** `{ type, data, time }`. Always emit `state`,
   `error` (`data.message`, human-readable) and `stats`; add feature events
   (`switching`, `switched`).
4. **Errors are never swallowed.** Every player or feature failure becomes an
   `error` event. Promise rejections carry the same message.
5. **One outcome per action.** Guard in-flight actions (SwitchPlayer's
   `_pending`), so duplicate SDK events can't emit twice and a second click
   during a pending action is rejected, not queued.
6. **No DOM beyond the player container.** UI lives in `js/app.js`.
7. **`destroy()` is idempotent** and rejects pending actions quietly.

## Writing a new wrapper

1. Copy `lib/player-wrapper.js` into the demo as `js/<feature>-player.js` and
   rename `SwitchPlayer` → `<Feature>Player` (the UMD header attaches it to
   `NanoDemo`).
2. Keep the controller setup, `on`/`_emit`/`_setState`, `load` and `destroy`.
   Replace `switchTo` with the feature's methods. Player events the feature
   needs go into `extra` in `load()`, never `player.on()`.
3. Test it the way `tests/wrapper.test.mjs` tests SwitchPlayer, with the fake
   player from `tests/helpers.mjs`: happy path, failure path, duplicate
   events, action while pending, destroy while pending.
4. If the wrapper is useful beyond one demo, move it into this skill's `lib/`
   with its tests and add it to `new-demo.mjs`.
````

- [ ] **Step 5: Write `references/demo-checklist.md`**

```markdown
# "Demo done" checklist

Run `node scripts/check-demo.mjs <demo>` first; it covers the items marked (auto).

## Structure and look
- [ ] Started from a `nanoplayer-demo` template of the right type
- [ ] (auto) `product-theme.css` linked, then `page.css`; no `<style>`, no `style=""`
- [ ] (auto) `page.css` uses theme tokens only
- [ ] `product-theme.css` and `js/demo-core.js` are unmodified copies
- [ ] Header logo matches the product (nanoStream for player demos); title is set
- [ ] (auto) `noindex, nofollow`; footer version stamp present and bumped, with today's date
- [ ] No template placeholder copy left ("Event or customer description goes here", "About this feature" text changed to the real feature)

## Player behavior (real browser, real streams)
- [ ] Plays by stream name and by group UUID
- [ ] `?token=` plays a secured stream; the token doesn't appear in the log or copied report
- [ ] An offline or misspelled stream shows "Stream not found or offline" and an Error badge
- [ ] Stop, then Load again works; double-clicking Load leaves one player
- [ ] (auto) No `stop()` calls; no `player.on('onX')` after setup
- [ ] Wrapper demos: every feature action works, and a failure shows an error

## Safety
- [ ] (auto) No hardcoded JWTs or keys
- [ ] Demo JWTs, if any are shared in links, are expired-acceptable (check `exp`)

## Browsers
- [ ] Chrome, Safari, Firefox, plus one mobile browser (iOS Safari or Android Chrome)
- [ ] Layout holds at phone width (no horizontal scroll)
```

- [ ] **Step 6: Run all tests**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass, including `tests/docs.test.mjs`.

- [ ] **Step 7: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/SKILL.md skills/nanocosmos/nanoplayer-demo/references skills/nanocosmos/nanoplayer-demo/tests/docs.test.mjs
git commit -m "nanoplayer-demo: SKILL.md, best practices, wrapper pattern, checklist"
```

---

### Task 13: internal tier — hosting and registration

**Files:**
- Create: `skills/nanocosmos/nanoplayer-demo/internal/hosting.md`

**Interfaces:**
- Consumes: brand-guidelines `scripts/theme_consumers.txt` / `check_theme_sync.sh` conventions (paths relative to `$NANOCOSMOS_REPOS_DIR`, default `~/Documents/nanocosmos`).

- [ ] **Step 1: Check the real Pages setup before writing**

Look at one existing demo repo registered as a theme consumer (e.g. `token-revocation` or `stream-switching-demo` on `gitlab.nanocosmos.cloud`) and note its `.gitlab-ci.yml` pages job and published URL pattern. If you can't access any, write the file below as-is and add the line `Unverified: confirm against an existing Pages repo.` under the title.

- [ ] **Step 2: Write `internal/hosting.md`**

````markdown
# Hosting and registration (internal)

Not shipped publicly: the source repo's build drops `internal/` folders.

## 1. Register the theme copy

Every demo keeps a physical copy of `product-theme.css`, so brand-guidelines
has to know about it, or it silently drifts.

- Add the demo's theme path, relative to `$NANOCOSMOS_REPOS_DIR`
  (default `~/Documents/nanocosmos`), to
  `nanocosmos-brand-guidelines/scripts/theme_consumers.txt` in the same change
  that creates the demo, e.g. `my-demo/product-theme.css`.
- Check: `nanocosmos-brand-guidelines/scripts/check_theme_sync.sh --diff`.
  "Behind" between release rollouts is fine. "Ahead" means someone edited the
  copy; port that into canonical (brand-guidelines Theme release cycle).

## 2. Deploy to GitLab Pages

Demos live on `web.pages.gitlab.nanocosmos.cloud`. A demo folder is static,
with no build step. The minimal Pages job publishes it as `public/`:

```yaml
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r index.html page.css product-theme.css js public/
    - '[ -f customer-logo.svg ] && cp customer-logo.svg public/ || true'
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

Match whatever the existing demo repos use if it differs (see Step 1 of the
implementation plan task that wrote this file).

## 3. Streams for demos

- Public demo org streams (safe in shared links): `CD6oL-2kE1g`,
  `HX26g-YVe8D`; other streams of the demo orgs `CD6oL`, `HX26g`, `yPleE`,
  `nNCcf`.
- Customer streams: only with the requesting team's OK, and never with a
  long-lived token in the link.
- Non-production environments (stage/dev) are internal-only. Never put them
  in a demo that leaves the company.
````

- [ ] **Step 3: Commit**

```bash
git add skills/nanocosmos/nanoplayer-demo/internal/hosting.md
git commit -m "nanoplayer-demo: internal hosting and theme registration notes"
```

---

### Task 14: repo integration

**Files:**
- Modify: `.claude-plugin/plugin.json` (`skills` array, `description`)
- Modify: `README.md` (skills table, "all five skills")
- Modify: `skills/nanocosmos/README.md` (routing table)
- Modify: `CHANGELOG.md` (new entry)
- Modify: `REVIEW-NOTES.md` (open items)

- [ ] **Step 1: Register the skill in the plugin**

In `.claude-plugin/plugin.json`, insert `"./skills/nanocosmos/nanoplayer-demo",` into `skills` between `"./skills/nanocosmos/dark-neutral-studio",` and `"./skills/nanocosmos/nanostream-analytics",` (keeps alphabetical order). Change `description` to:

```json
"description": "AI-agent skills for the nanocosmos platform: nanoStream development, nanoPlayer demo building, self-serve diagnostics, analytics queries, nanoStudio production tools, and a dark AV-workbench UI design system",
```

Run: `node -e "const p=require('./.claude-plugin/plugin.json'); console.log(p.skills.length, p.skills.every(s=>require('fs').existsSync(s+'/SKILL.md')))"`
Expected: `6 true`.

- [ ] **Step 2: Update `README.md`**

Change `one install, all five skills,` to `one install, all six skills,`. Add this row to the Skills table directly after the `nanostream-development` row:

```markdown
| [`nanoplayer-demo`](skills/nanocosmos/nanoplayer-demo/) | player team / anyone building demos | nanoPlayer demo pages with one base look and verified player usage: six starter templates (single player, feature showcase, multi-player, diagnostics, branded page, feature wrapper such as a switch player), a scaffolder, a demo checker and a done-checklist |
```

- [ ] **Step 3: Update `skills/nanocosmos/README.md`**

Add after the `nanostream-development` row of the "Which skill for which question" table:

```markdown
| [`nanoplayer-demo`](nanoplayer-demo/) | Building a player demo for another team: templates, the shared NanoDemo helpers, the wrapper pattern and the done-checklist |
```

- [ ] **Step 4: Add a CHANGELOG entry**

Insert above `## 2026-09-26 sync`:

```markdown
## Unreleased (branch feature/nanoplayer-demo-skill)

- `nanoplayer-demo` 1.0.0 (new): nanoPlayer demo templates (single player,
  feature showcase, multi-player, diagnostics, branded page, feature wrapper),
  the tested `NanoDemo` helper library and `SwitchPlayer` wrapper,
  `new-demo.mjs` / `check-demo.mjs`, best practices and a done-checklist.
  Templates use `product-theme.css` from `nanocosmos-brand-guidelines`.
```

- [ ] **Step 5: Record open items in `REVIEW-NOTES.md`**

Append a new section at the end:

```markdown
## nanoplayer-demo (branch feature/nanoplayer-demo-skill, 2026-09-29)
- Written here on a branch, NOT yet in the source repo: port it before the next
  sync or it is overwritten. Check the `<!-- internal -->` marker syntax and the
  `internal/` stripping against PUBLISHING.md while porting.
- Public tier: templates depend on `product-theme.css`, which isn't public
  (open `nanostream-demo-styling` decision above). Until decided, ship
  templates internal-only.
- Flagged to nanostream-development's owner: `player/player-demo.html` uses
  Dark Neutral Studio colors, and `player/README.md` still describes inlined
  demo CSS (out of date since 2026-09-04).
```

- [ ] **Step 6: Run all tests once more**

Run: `cd skills/nanocosmos/nanoplayer-demo && node --test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add .claude-plugin/plugin.json README.md skills/nanocosmos/README.md CHANGELOG.md REVIEW-NOTES.md
git commit -m "Register nanoplayer-demo skill in plugin, READMEs and changelog"
```

---

### Task 15: real-browser verification and skill pressure test

**Files:**
- Modify (only if a check fails): `skills/nanocosmos/nanoplayer-demo/lib/demo-core.js` (`formatStats` field names/units) + its test in `tests/core-config.test.mjs`

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Scaffold all six types against the real theme**

```bash
for t in single-player feature-showcase multi-player diagnostics branded-page feature-wrapper; do
  node skills/nanocosmos/nanoplayer-demo/scripts/new-demo.mjs "$t" "$TEMP/npd-verify/$t" --title "Verify $t" || echo "FAILED $t"
done
```

Expected: six `Created …` lines, no `FAILED`.

- [ ] **Step 2: Open each demo over `file://` in Chrome and check the player**

For each `$TEMP/npd-verify/<type>/index.html`:
- plays `CD6oL-2kE1g` (badge goes Connecting → Live);
- `?stream=DOESNOT-EXIST` shows "Stream not found or offline" and an Error badge;
- Stop, then Load again works; double-clicking Load leaves one player;
- feature-wrapper: switching between the two default streams works (if `HX26g-YVe8D` is offline, use `?streams=` with two live streams and update `DEFAULT_STREAMS` in `templates/feature-wrapper/js/app.js`).

- [ ] **Step 3: Check the `onStats` payload against `formatStats`**

In the diagnostics demo's browser console, run `copy(JSON.stringify(<latest onStats payload>))` via the Stream info / Last stats data, or add a temporary `console.log` in the local copy only. Compare the real field names and bitrate unit with `formatStats` in `lib/demo-core.js`. If they differ, first add a failing test to `tests/core-config.test.mjs` using the real payload shape, then fix `formatStats`, run `node --test`, and re-scaffold.

- [ ] **Step 4: Visual check**

Compare each demo side by side with brand-guidelines' `product-sample.html` (same header, footer, panels, buttons, fonts) at desktop width and at 375 px width. Fix any layout issues in the template's `page.css` (tokens only) and rerun `node --test`.

- [ ] **Step 5: Skill pressure test with fresh agents**

Dispatch three fresh subagents with the skill directory available and no other context, one prompt each:
1. "Sales needs a page to show our low-latency player to a prospect with stream `CD6oL-2kE1g`."
2. "Product wants a demo that shows how latency control modes change the player behavior."
3. "Build a switch-player demo that switches between two camera streams."

Each output must pick the right template (`single-player`, `feature-showcase`, `feature-wrapper`), be scaffolded with `new-demo.mjs`, and pass `check-demo.mjs` without manual fixes. If an agent goes wrong, fix the SKILL.md wording that misled it, and rerun that prompt.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A skills/nanocosmos/nanoplayer-demo
git commit -m "nanoplayer-demo: fixes from browser verification and pressure test"
```

(Skip the commit if nothing changed.)
