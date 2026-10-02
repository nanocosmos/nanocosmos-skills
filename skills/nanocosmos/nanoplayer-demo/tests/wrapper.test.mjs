import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeNanoPlayerClass, fakeWindow } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { SwitchPlayer } = require('../lib/player-wrapper.js');

const GROUPS = [{ label: 'A', id: 'g-a' }, { label: 'B', id: 'g-b' }];

function pageConfig() {
  return {
    source: {
      group: { id: 'placeholder', startQuality: 'medium', security: { jwtoken: 'T' } },
      options: { adaption: { rule: 'deviationOfMean2' }, switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 } }
    },
    playback: { autoplay: true, automute: true, muted: false, faststart: true, enableMediaOverQuic: true, latencyControlMode: 'balancedadaptive' },
    style: { width: '100%', height: '100%', scaling: 'letterbox', controls: false }
  };
}

function setup(behavior, config = pageConfig()) {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass(behavior);
  const sp = new SwitchPlayer('player', { config, env: { NanoPlayer: FakeNanoPlayer, window: fakeWindow() } });
  const events = [];
  for (const type of ['state', 'error', 'switching', 'switched', 'stats']) {
    sp.on(type, (e) => events.push([e.type, e.data]));
  }
  return { sp, instances, events };
}
const only = (events, type) => events.filter((e) => e[0] === type).map((e) => e[1]);

test('load plays the first group with the page config and reports states', async () => {
  const { sp, instances, events } = setup();
  assert.equal(await sp.load(GROUPS), true);
  const src = instances[0].config.source;
  assert.equal(src.group.id, 'g-a');
  assert.deepEqual(src.group.security, { jwtoken: 'T' });
  assert.equal(src.group.startQuality, 'medium');
  assert.equal(instances[0].config.playback.latencyControlMode, 'balancedadaptive');
  instances[0].fire('onPlay');
  assert.deepEqual(only(events, 'state').map((d) => d.state), ['connecting', 'playing']);
  assert.equal(sp.index, 0);
});

test('load rejects an empty list and a config without source.group', async () => {
  const { sp } = setup();
  await assert.rejects(sp.load([]), /at least one group/);
  const cfg = pageConfig();
  delete cfg.source.group;
  cfg.source.entries = [{ h5live: { rtmp: { streamname: 'ABCDE-12345' }, security: {} } }];
  await assert.rejects(setup(undefined, cfg).sp.load(GROUPS), /PLAYER_CONFIG needs source\.group/);
});

test('a failed setup resolves false and emits the error', async () => {
  const { sp, events } = setup({ setupFails: true });
  assert.equal(await sp.load(GROUPS), false);
  assert.deepEqual(only(events, 'error'), [{ message: 'bad config' }]);
  assert.equal(sp.state, 'error');
});

test('switchTo sends the full source with the next group id and resolves on success', async () => {
  const { sp, instances, events } = setup();
  await sp.load(GROUPS);
  const pending = sp.switchTo(1);
  const sent = instances[0].updates[0];
  assert.equal(sent.group.id, 'g-b');
  assert.deepEqual(sent.group.security, { jwtoken: 'T' });
  assert.deepEqual(sent.options, pageConfig().source.options);
  assert.deepEqual(only(events, 'switching'), [{ from: 0, to: 1 }]);
  instances[0].fire('onUpdateSourceSuccess');
  assert.equal(await pending, 1);
  assert.deepEqual(only(events, 'switched'), [{ from: 0, index: 1 }]);
});

test('config getter reflects the current group and never the page object', async () => {
  const page = pageConfig();
  const { sp, instances } = setup(undefined, page);
  await sp.load(GROUPS);
  assert.equal(sp.config.source.group.id, 'g-a');
  const pending = sp.switchTo(1);
  instances[0].fire('onUpdateSourceSuccess');
  await pending;
  assert.equal(sp.config.source.group.id, 'g-b');
  assert.equal(page.source.group.id, 'placeholder');
});

test('a failed switch emits one error, rejects and keeps the current group', async () => {
  const { sp, instances, events } = setup();
  await sp.load(GROUPS);
  const pending = sp.switchTo(1);
  instances[0].fire('onUpdateSourceFail', { message: 'not found' });
  instances[0].fire('onUpdateSourceError', { message: 'again' });
  await assert.rejects(pending, /not found/);
  assert.deepEqual(only(events, 'error'), [{ message: 'Switch failed: not found' }]);
  assert.equal(sp.index, 0);
});

test('a rejected updateSource promise fails the switch once', async () => {
  const { sp, instances, events } = setup({ updateFails: true });
  await sp.load(GROUPS);
  await assert.rejects(sp.switchTo(1), /update rejected/);
  instances[0].fire('onUpdateSourceFail', { message: 'late' });
  assert.equal(only(events, 'error').length, 1);
});

test('a second switch while one is pending is rejected without a second updateSource', async () => {
  const { sp, instances } = setup();
  await sp.load(GROUPS);
  const first = sp.switchTo(1);
  await assert.rejects(sp.switchTo(0), /already in progress/);
  assert.equal(instances[0].updates.length, 1);
  instances[0].fire('onUpdateSourceSuccess');
  assert.equal(await first, 1);
});

test('switching to the current group is a no-op; bad calls are rejected', async () => {
  const { sp, instances } = setup();
  await assert.rejects(sp.switchTo(1), /Call load\(\) first/);
  await sp.load(GROUPS);
  assert.equal(await sp.switchTo(0), 0);
  assert.equal(instances[0].updates.length, 0);
  await assert.rejects(sp.switchTo(5), /No group at index 5/);
});

test('switching before the first group plays reports an error instead of a silent no-op', async () => {
  const { sp, events } = setup({ deferSetup: true });
  sp.load(GROUPS);
  await assert.rejects(sp.switchTo(1), /Wait until the first group is playing/);
  assert.equal(only(events, 'error').length, 1);
});

test('destroy stops the player, rejects a pending switch quietly and is idempotent', async () => {
  const { sp, instances, events } = setup();
  await sp.load(GROUPS);
  const pending = sp.switchTo(1);
  sp.destroy();
  sp.destroy();
  await assert.rejects(pending, /destroyed/);
  assert.equal(instances[0].destroyed, 1);
  assert.equal(sp.state, 'idle');
  assert.equal(sp.index, -1);
  assert.deepEqual(only(events, 'error'), []);
});
