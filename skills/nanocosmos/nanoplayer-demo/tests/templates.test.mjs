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
