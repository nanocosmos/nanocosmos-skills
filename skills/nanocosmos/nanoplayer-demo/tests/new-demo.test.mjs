import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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

test('scaffold --group writes the group into the page config of every type', () => {
  const theme = stubTheme();
  for (const type of TYPES) {
    const dest = join(tmp('npd-'), type);
    scaffold({ type, dest, theme, group: 'my-group-01' });
    const code = readFileSync(join(dest, type === 'feature-wrapper' ? 'js/app.js' : 'index.html'), 'utf8');
    const block = code.slice(code.indexOf('var PLAYER_CONFIG = {'), code.indexOf('};', code.indexOf('var PLAYER_CONFIG = {')));
    assert.ok(block.includes("id: 'my-group-01'"), type + ': group in PLAYER_CONFIG');
    assert.ok(!block.includes('b6638d50-3581-4349-8fb2-59b3406c2dde'), type + ': default group replaced');
  }
});

test('scaffold rejects a group id that would break the page script', () => {
  assert.throws(() => scaffold({ type: 'single-player', dest: join(tmp('npd-'), 'd'), theme: stubTheme(), group: "a'b" }),
    /group must contain only letters, digits and dashes/);
});

test('the CLI prints OK when the scaffolded demo passes check-demo', () => {
  const dest = join(tmp('npd-'), 'cli');
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/new-demo.mjs', import.meta.url)),
    'single-player', dest, '--theme', stubTheme(), '--group', 'cli-group'], { encoding: 'utf8' });
  assert.match(out, /^OK: single-player demo in .* passes check-demo/m);
});
