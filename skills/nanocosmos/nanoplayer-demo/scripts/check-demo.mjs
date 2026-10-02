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

  // The page's player configuration must be visible: a PLAYER_CONFIG literal.
  const appPath = join(dir, 'js', 'app.js');
  const pageCode = html + (existsSync(appPath) ? readFileSync(appPath, 'utf8') : '');
  if (!/var PLAYER_CONFIG\s*=/.test(pageCode)) {
    add('player-config', 'index.html', 'define the player configuration as `var PLAYER_CONFIG = { … }` in index.html or js/app.js');
  }

  for (const file of listFiles(dir).filter((f) => /\.(html|js|mjs)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(dir, file).replace(/\\/g, '/');
    for (const m of text.matchAll(/serverDomain\s*:\s*['"]/g)) {
      add('no-server-domain-literal', rel, `line ${lineOf(text, m.index)}: serverDomain overrides all play-server domains (no geo load balancing); set it only from ?server=`);
    }
    if (/var PLAYER_CONFIG\s*=/.test(text) && /\bgroup\s*:/.test(text)) {
      for (const m of text.matchAll(/\bstartIndex\s*:/g)) {
        add('no-start-index-with-group', rel, `line ${lineOf(text, m.index)}: for a group use source.group.startQuality, not startIndex`);
      }
    }
    // Player objects only: controller.stop() is the demo API and is fine.
    for (const m of text.matchAll(/\b\w*[pP]layer\s*\.stop\s*\(/g)) {
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
