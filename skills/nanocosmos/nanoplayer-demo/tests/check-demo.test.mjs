import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
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
<script>var PLAYER_CONFIG = { source: { group: { id: 'g', startQuality: 'medium' } } };</script>
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

test('controller.stop() is allowed; only player objects have no stop()', () => {
  assert.deepEqual(rules(makeDemo({ 'js/app.js': 'ctl.stop();\nt.ctl.stop();\nthis._ctl.stop();\n' })), []);
  assert.deepEqual(rules(makeDemo({ 'js/app.js': 'nanoPlayer.stop();\n' })), ['no-stop']);
});

test('hardcoded credentials are rejected', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';
  assert.deepEqual(rules(makeDemo({ 'js/app.js': `var t = "${jwt}";` })), ['no-credentials']);
  assert.deepEqual(rules(makeDemo({ 'js/app.js': 'var m = { accountKey: "sk-12345" };' })), ['no-credentials']);
  assert.deepEqual(rules(makeDemo({ 'js/app.js': 'var i = \'<input type="password">\';' })), []);
});

test('the real demo-core.js and player-wrapper.js pass the source rules', () => {
  const core = readFileSync(new URL('../lib/demo-core.js', import.meta.url), 'utf8');
  const wrapper = readFileSync(new URL('../lib/player-wrapper.js', import.meta.url), 'utf8');
  assert.deepEqual(checkDemo(makeDemo({ 'js/demo-core.js': core, 'js/player-wrapper.js': wrapper })), []);
});

test('the page must define PLAYER_CONFIG in index.html or js/app.js', () => {
  const noConfig = html((h) => h.replace(/<script>var PLAYER_CONFIG[^<]*<\/script>\n/, ''));
  assert.deepEqual(rules(makeDemo({ 'index.html': noConfig })), ['player-config']);
  assert.deepEqual(rules(makeDemo({ 'index.html': noConfig, 'js/app.js': "var PLAYER_CONFIG = { source: { group: { id: 'g' } } };" })), []);
});

test('a hardcoded serverDomain is rejected', () => {
  const problems = checkDemo(makeDemo({ 'js/app.js': "var x = 1;\nvar c = { general: { serverDomain: 'bintu-play.nanocosmos.de' } };" }));
  assert.deepEqual(problems.map((p) => [p.rule, p.file]), [['no-server-domain-literal', 'js/app.js']]);
  assert.match(problems[0].message, /line 2/);
});

test('startIndex next to a group in the page config is rejected', () => {
  const withIndex = html((h) => h.replace("startQuality: 'medium' } } };", "startQuality: 'medium' }, startIndex: 0 } };"));
  assert.deepEqual(rules(makeDemo({ 'index.html': withIndex })), ['no-start-index-with-group']);
});
