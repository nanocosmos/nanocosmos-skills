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
