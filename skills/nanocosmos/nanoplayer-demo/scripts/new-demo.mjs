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
