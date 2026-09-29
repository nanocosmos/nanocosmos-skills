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

const readTemplate = (type, file = 'index.html') =>
  readFileSync(new URL(`../templates/${type}/${file}`, import.meta.url), 'utf8');

test('every template declares its default stream in one visible constant', () => {
  for (const type of TYPES) {
    const code = type === 'feature-wrapper' ? readTemplate(type, 'js/app.js') : readTemplate(type);
    assert.match(code, /var DEFAULT_STREAMS? = /, `${type} needs a DEFAULT_STREAM(S) constant`);
  }
});

test('diagnostics resets counters and last stats/stream info on every load', () => {
  const html = readTemplate('diagnostics');
  const body = html.slice(html.indexOf('function load()'), html.indexOf('function flashConfirm'));
  for (const s of ['counters.statsUpdates = 0', 'counters.bufferingEvents = 0', 'counters.errors = 0',
    'last.stats = null', 'last.streamInfo = null', 'renderStreamInfo()']) {
    assert.ok(body.includes(s), 'load() must contain ' + s);
  }
});

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
