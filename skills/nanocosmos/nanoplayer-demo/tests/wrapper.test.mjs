import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeNanoPlayerClass, fakeWindow } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { SwitchPlayer } = require('../lib/player-wrapper.js');

const STREAMS = [{ label: 'A', stream: 'AAAAA-11111' }, { label: 'B', stream: 'BBBBB-22222' }];

function setup(behavior) {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass(behavior);
  const sp = new SwitchPlayer('player', { token: 'T', env: { NanoPlayer: FakeNanoPlayer, window: fakeWindow() } });
  const events = [];
  for (const type of ['state', 'error', 'switching', 'switched', 'stats']) {
    sp.on(type, (e) => events.push([e.type, e.data]));
  }
  return { sp, instances, events };
}
const only = (events, type) => events.filter((e) => e[0] === type).map((e) => e[1]);

test('load plays the first stream with the token and reports states', async () => {
  const { sp, instances, events } = setup();
  assert.equal(await sp.load(STREAMS), true);
  const src = instances[0].config.source;
  assert.equal(src.entries[0].h5live.rtmp.streamname, 'AAAAA-11111');
  assert.deepEqual(src.entries[0].h5live.security, { jwtoken: 'T' });
  instances[0].fire('onPlay');
  assert.deepEqual(only(events, 'state').map((d) => d.state), ['connecting', 'playing']);
  assert.equal(sp.state, 'playing');
  assert.equal(sp.index, 0);
});

test('events carry a timestamp', async () => {
  const { sp } = setup();
  let evt;
  sp.on('state', (e) => { evt = e; });
  await sp.load(STREAMS);
  assert.equal(evt.type, 'state');
  assert.equal(typeof evt.time, 'number');
});

test('load rejects an empty list and reports a failed setup', async () => {
  const { sp } = setup();
  await assert.rejects(sp.load([]), /at least one stream/);
  const failing = setup({ setupFails: true });
  assert.equal(await failing.sp.load(STREAMS), false);
  assert.deepEqual(only(failing.events, 'error'), [{ message: 'bad config' }]);
  assert.equal(failing.sp.state, 'error');
});

test('switchTo updates the source and resolves on onUpdateSourceSuccess', async () => {
  const { sp, instances, events } = setup();
  await sp.load(STREAMS);
  const pending = sp.switchTo(1);
  assert.equal(instances[0].updates.length, 1);
  assert.equal(instances[0].updates[0].entries[0].h5live.rtmp.streamname, 'BBBBB-22222');
  assert.deepEqual(only(events, 'switching'), [{ from: 0, to: 1 }]);
  instances[0].fire('onUpdateSourceSuccess');
  assert.equal(await pending, 1);
  assert.deepEqual(only(events, 'switched'), [{ from: 0, index: 1 }]);
  assert.equal(sp.index, 1);
});

test('a failed switch emits one error, rejects and keeps the current stream', async () => {
  const { sp, instances, events } = setup();
  await sp.load(STREAMS);
  const pending = sp.switchTo(1);
  instances[0].fire('onUpdateSourceFail', { message: 'not found' });
  instances[0].fire('onUpdateSourceError', { message: 'again' });
  await assert.rejects(pending, /not found/);
  assert.deepEqual(only(events, 'error'), [{ message: 'Switch failed: not found' }]);
  assert.equal(sp.index, 0);
});

test('a rejected updateSource promise fails the switch once', async () => {
  const { sp, instances, events } = setup({ updateFails: true });
  await sp.load(STREAMS);
  await assert.rejects(sp.switchTo(1), /update rejected/);
  instances[0].fire('onUpdateSourceFail', { message: 'late' });
  assert.equal(only(events, 'error').length, 1);
});

test('a second switch while one is pending is rejected without a second updateSource', async () => {
  const { sp, instances } = setup();
  await sp.load(STREAMS);
  const first = sp.switchTo(1);
  await assert.rejects(sp.switchTo(0), /already in progress/);
  assert.equal(instances[0].updates.length, 1);
  instances[0].fire('onUpdateSourceSuccess');
  assert.equal(await first, 1);
});

test('switching to the current stream is a no-op; bad calls are rejected', async () => {
  const { sp, instances } = setup();
  await assert.rejects(sp.switchTo(1), /Call load\(\) first/);
  await sp.load(STREAMS);
  assert.equal(await sp.switchTo(0), 0);
  assert.equal(instances[0].updates.length, 0);
  await assert.rejects(sp.switchTo(5), /No stream at index 5/);
});

test('switching before the first stream plays reports an error instead of a silent no-op', async () => {
  const { sp, events } = setup({ deferSetup: true });
  sp.load(STREAMS);
  await assert.rejects(sp.switchTo(1), /Wait until the first stream is playing/);
  await assert.rejects(sp.switchTo(9), /Wait until the first stream is playing|No stream at index/);
  assert.equal(only(events, 'error').length, 2);
  assert.match(only(events, 'error')[0].message, /Wait until the first stream is playing/);
});

test('switching to an index that does not exist reports an error', async () => {
  const { sp, events } = setup();
  await sp.load(STREAMS);
  await assert.rejects(sp.switchTo(5), /No stream at index 5/);
  assert.deepEqual(only(events, 'error'), [{ message: 'No stream at index 5.' }]);
});

test('destroy stops the player, rejects a pending switch quietly and is idempotent', async () => {
  const { sp, instances, events } = setup();
  await sp.load(STREAMS);
  const pending = sp.switchTo(1);
  sp.destroy();
  sp.destroy();
  await assert.rejects(pending, /destroyed/);
  assert.equal(instances[0].destroyed, 1);
  assert.equal(sp.state, 'idle');
  assert.equal(sp.index, -1);
  assert.deepEqual(only(events, 'error'), []);
});
