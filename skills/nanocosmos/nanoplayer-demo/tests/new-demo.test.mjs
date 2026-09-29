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
