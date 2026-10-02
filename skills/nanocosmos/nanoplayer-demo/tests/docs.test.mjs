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
  assert.match(skill, /\n {2}version: 2\.0\.0\r?\n/);
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

test('best-practices cites the nanoPlayer docs for its player rules', () => {
  const doc = read('references/best-practices.md');
  const cites = doc.match(/docs\/nanoplayer\/nanoplayer_[a-z_]+\.mdx?/g) || [];
  assert.ok(cites.length >= 8, 'expected at least 8 nano-docs citations, got ' + cites.length);
  for (const topic of ['startQuality', 'setAdaption', 'switchStream', 'onSwitchStream', '1005', '4901', 'UNVERIFIED', 'fastStart']) {
    assert.ok(doc.includes(topic), 'best-practices missing ' + topic);
  }
});

test('wrapper-pattern documents the group-based SwitchPlayer', () => {
  const doc = read('references/wrapper-pattern.md');
  for (const part of ['config:', 'source.group.id', 'GROUPS']) assert.ok(doc.includes(part), 'missing ' + part);
});
