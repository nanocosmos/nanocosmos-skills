// Every template in TYPES must scaffold into a demo that passes check-demo,
// reference only element ids that exist, and contain parseable scripts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold, TYPES } from '../scripts/new-demo.mjs';
import { checkDemo } from '../scripts/check-demo.mjs';

const theme = join(mkdtempSync(join(tmpdir(), 'npd-theme-')), 'product-theme.css');
writeFileSync(theme, '/* stub theme */\n');

function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

const readTemplate = (type, file = 'index.html') =>
  readFileSync(new URL(`../templates/${type}/${file}`, import.meta.url), 'utf8');

const MUTED = { 'multi-player': true, 'branded-page': true };
const pageCode = (type) => type === 'feature-wrapper' ? readTemplate(type, 'js/app.js') : readTemplate(type);
// No public group exists: templates must not ship a real group ID or stream name.
const REAL_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b(?!XXXXX-YYYYY)[A-Za-z0-9]{5}-[A-Za-z0-9]{5}\b/;

test('no template, script or reference contains a real group ID or stream name', () => {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'tests') walk(p); }
      else if (/\.(html|js|mjs|md|css)$/.test(e.name)) files.push(p);
    }
  })(fileURLToPath(new URL('..', import.meta.url)));
  for (const f of files) {
    const text = readFileSync(f, 'utf8').replace(/[a-z]+(-[a-z]+)+/g, ''); // drop kebab-case words
    const m = text.match(REAL_ID);
    assert.equal(m, null, `${f} contains ${m && m[0]}`);
  }
});

for (const type of TYPES) {
  test(`${type}: explicit PLAYER_CONFIG with an empty group placeholder`, () => {
    const code = pageCode(type);
    const block = code.slice(code.indexOf('var PLAYER_CONFIG = {'), code.indexOf('};', code.indexOf('var PLAYER_CONFIG = {')));
    assert.ok(block.length > 0, 'PLAYER_CONFIG literal');
    for (const part of ['group: {', "id: '',", "startQuality: 'medium'", 'security: {}',
      "rule: 'deviationOfMean2'", "method: 'server'", 'timeout: 20', 'autoplay: true', 'automute: true',
      'faststart: true', 'enableMediaOverQuic: true', "latencyControlMode: 'balancedadaptive'", "scaling: 'letterbox'"]) {
      assert.ok(block.includes(part), `${type} PLAYER_CONFIG missing ${part}`);
    }
    assert.ok(block.includes(MUTED[type] ? 'muted: true' : 'muted: false'), `${type} audio default`);
    assert.ok(!/serverDomain|startIndex|defaults:/.test(block), 'no serverDomain/startIndex/defaults in a group config');
    assert.ok(code.includes('D.applyUrlParams(PLAYER_CONFIG, location.search)'), 'URL params applied visibly');
  });

  test(`${type}: has the Configuration panel`, () => {
    const html = readTemplate(type);
    for (const id of ['configToggle', 'configJson', 'btnCopyConfig', 'configCopied']) {
      assert.ok(html.includes('id="' + id + '"'), `${type} missing #${id}`);
    }
    assert.ok(pageCode(type).includes('D.mountConfigPanel('), 'panel wired');
  });
}

test('diagnostics resets counters, reads ?ticket= and reports the player version', () => {
  const html = readTemplate('diagnostics');
  const body = html.slice(html.indexOf('function load()'), html.indexOf('function flashConfirm'));
  for (const part of ['counters.statsUpdates = 0', 'counters.bufferingEvents = 0', 'counters.errors = 0',
    'last.stats = null', 'last.streamInfo = null', 'renderStreamInfo()']) {
    assert.ok(body.includes(part), 'load() must contain ' + part);
  }
  assert.ok(html.includes("get('ticket')"));
  assert.ok(html.includes('playerVersion:'));
});

test('branded-page shows no developer URL text to viewers', () => {
  const html = readTemplate('branded-page');
  const main = html.slice(html.indexOf('<main>'), html.indexOf('</main>'));
  assert.ok(!/\?stream=|\?token=|\?group=/.test(main), 'no URL param hints in visible markup');
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
