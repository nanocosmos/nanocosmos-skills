import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeNanoPlayerClass, fakeWindow, fakeEl } from './helpers.mjs';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';

function recorder() {
  const calls = [];
  return {
    calls,
    onState: (s) => calls.push(['state', s]),
    onError: (m) => calls.push(['error', m]),
    onStats: (s) => calls.push(['stats', s]),
    onStreamInfo: (i) => calls.push(['info', i]),
    onLog: (n) => calls.push(['log', n]),
  };
}

test('playerEvents maps player events to demo states', () => {
  const r = recorder();
  const ev = D.playerEvents(r);
  ev.onReady({ data: {} });
  ev.onStartBuffering({ data: {} });
  ev.onPlay({ data: {} });
  ev.onPause({ data: {} });
  const states = r.calls.filter((c) => c[0] === 'state').map((c) => c[1]);
  assert.deepEqual(states, ['connecting', 'buffering', 'playing', 'paused']);
});

test('playerEvents surfaces an offline stream as an error, not a hang', () => {
  const r = recorder();
  D.playerEvents(r).onStreamInfoError({ data: { message: 'stream not available' } });
  assert.deepEqual(r.calls.filter((c) => c[0] !== 'log'), [
    ['state', 'error'],
    ['error', 'Stream not found or offline: stream not available'],
  ]);
});

test('playerEvents forwards onError message, stats and stream info', () => {
  const r = recorder();
  const ev = D.playerEvents(r);
  ev.onError({ data: { message: 'boom' } });
  ev.onStats({ data: { stats: { latency: 1 } } });
  ev.onStreamInfo({ data: { streamInfo: { haveVideo: true } } });
  assert.deepEqual(r.calls.filter((c) => c[0] !== 'log'), [
    ['state', 'error'], ['error', 'boom'],
    ['stats', { latency: 1 }],
    ['info', { haveVideo: true }],
  ]);
});

test('playerEvents merges extra handlers with built-in ones and logs new ones', () => {
  const r = recorder();
  const extra = [];
  const ev = D.playerEvents(Object.assign(r, {
    extra: { onPlay: () => extra.push('play'), onUpdateSourceSuccess: () => extra.push('updated') },
  }));
  ev.onPlay({ data: {} });
  ev.onUpdateSourceSuccess({ data: {} });
  assert.deepEqual(extra, ['play', 'updated']);
  assert.ok(r.calls.some((c) => c[0] === 'state' && c[1] === 'playing'));
  assert.ok(r.calls.some((c) => c[0] === 'log' && c[1] === 'onUpdateSourceSuccess'));
});

test('playerEvents works with no handlers at all', () => {
  const ev = D.playerEvents();
  assert.doesNotThrow(() => { ev.onPlay({ data: {} }); ev.onError({ data: {} }); ev.onStats({}); });
});

test('statusView and renderStatus map states to theme badge classes', () => {
  assert.deepEqual(D.statusView('playing'), { badge: 'playing', label: 'Live' });
  assert.deepEqual(D.statusView('nonsense'), { badge: 'paused', label: 'Idle' });
  const badge = fakeEl('span');
  const label = fakeEl('span');
  D.renderStatus(badge, label, 'connecting');
  assert.equal(badge.className, 'badge loading');
  assert.equal(label.textContent, 'Connecting');
});

test('statusHandlers keep an error visible until playback recovers', () => {
  const ui = { badge: fakeEl(), badgeText: fakeEl(), text: fakeEl(), stats: fakeEl() };
  const h = D.statusHandlers(ui);
  h.onState('error');
  h.onError('Stream not found or offline: x');
  h.onState('paused');
  assert.equal(ui.text.textContent, 'Stream not found or offline: x');
  h.onState('playing');
  assert.equal(ui.text.textContent, '');
  h.onStats({ latency: 2 });
  assert.equal(ui.stats.textContent, 'Latency 2.00 s · Bitrate — · Buffer —');
  h.onState('idle');
  assert.equal(ui.stats.textContent, 'Latency — · Bitrate — · Buffer —');
});

test('statusHandlers keep the Error badge when the player pauses after an error', () => {
  // Real player: onError ("Could not open connection. Timeout reached.") is followed by onPause.
  const ui = { badge: fakeEl(), badgeText: fakeEl(), text: fakeEl(), stats: fakeEl() };
  const h = D.statusHandlers(ui);
  h.onState('error');
  h.onState('paused');
  assert.equal(ui.badgeText.textContent, 'Error');
  h.onState('connecting');
  assert.equal(ui.badgeText.textContent, 'Connecting');
  h.onState('paused');
  assert.equal(ui.badgeText.textContent, 'Paused');
});

test('appendLog writes redacted lines and caps the log', () => {
  const box = fakeEl();
  D.appendLog(box, 'onError', 'url ?token=' + JWT);
  const line = box.firstChild;
  assert.equal(line.className, 'log-line');
  assert.equal(line.childNodes[0].className, 'ts');
  assert.match(line.childNodes[0].textContent, /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  assert.equal(line.childNodes[1].textContent, 'onError url ?token=[redacted]');
  for (let i = 0; i < 10; i++) D.appendLog(box, 'e' + i, '', 5);
  assert.equal(box.childNodes.length, 5);
  assert.equal(box.childNodes[4].childNodes[1].textContent, 'e9');
});

test('flatten turns nested objects into dotted rows', () => {
  assert.deepEqual(D.flatten({ a: 1, b: { c: 'x', d: { e: true } }, f: [1, 2] }),
    [['a', 1], ['b.c', 'x'], ['b.d.e', true], ['f', '[1,2]']]);
  assert.deepEqual(D.flatten(null), []);
});

test('redact keeps the JSON around a token param intact', () => {
  assert.equal(D.redact('{"url":"wss://x.test/?token=abc"}'), '{"url":"wss://x.test/?token=[redacted]"}');
});

test('buildReport includes all sections and never the token', () => {
  const text = D.buildReport({
    time: '2026-09-29T10:00:00Z',
    pageUrl: 'https://x.test/?stream=A&token=' + JWT,
    userAgent: 'UA',
    config: { stream: 'A', latencyControlMode: 'balancedadaptive' },
    counters: { stats: 3, errors: 1 },
    lastStats: { latency: 1 },
    streamInfo: { url: 'wss://x.test/?token=' + JWT },
    log: ['10:00 onPlay', '10:01 onError ' + JWT],
  });
  assert.ok(!text.includes(JWT));
  for (const part of ['[Config]', 'stream: A', '[Counters]', 'errors: 1', '[Last stats]', '[Stream info]', '[Event log]', '10:00 onPlay']) {
    assert.ok(text.includes(part), 'missing ' + part);
  }
});

test('startPlayer reports a blocked player CDN readably', async () => {
  await assert.rejects(D.startPlayer('player', {}, {}), /nanoPlayer script failed to load/);
});

test('startPlayer sets up the player and destroys it on pagehide', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const win = fakeWindow();
  const cfg = { source: {}, events: {} };
  const p = await D.startPlayer('player', cfg, { NanoPlayer: FakeNanoPlayer, window: win });
  assert.equal(p, instances[0]);
  assert.equal(p.id, 'player');
  assert.equal(p.config, cfg);
  win.dispatch('pagehide');
  assert.equal(p.destroyed, 1);
  assert.equal((win.listeners.pagehide || []).length, 0);
});

test('startPlayer destroys the player and rejects with the message when setup fails', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ setupFails: true });
  const win = fakeWindow();
  await assert.rejects(D.startPlayer('player', {}, { NanoPlayer: FakeNanoPlayer, window: win }), /bad config/);
  assert.equal(instances[0].destroyed, 1);
  assert.equal((win.listeners.pagehide || []).length, 0);
});

test('stopPlayer is null-safe and tolerates an already destroyed player', () => {
  assert.equal(D.stopPlayer(null), null);
  const { FakeNanoPlayer } = fakeNanoPlayerClass({ destroyThrows: true });
  assert.equal(D.stopPlayer(new FakeNanoPlayer('p')), null);
});

test('createController loads a player and reports connecting', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  const p = await ctl.load({ stream: 'ABCDE-12345', playback: { faststart: false } });
  assert.equal(p, instances[0]);
  assert.equal(ctl.player, p);
  assert.equal(p.config.playback.faststart, false);
  assert.equal(p.config.source.entries[0].h5live.rtmp.streamname, 'ABCDE-12345');
  assert.deepEqual(r.calls[0], ['state', 'connecting']);
  p.fire('onPlay');
  assert.deepEqual(r.calls.at(-1), ['state', 'playing']);
});

test('createController reports input and CDN errors through handlers and resolves null', async () => {
  const r = recorder();
  const ctl = D.createController('player', r, { window: fakeWindow() });
  assert.equal(await ctl.load({ stream: ' ' }), null);
  assert.deepEqual(r.calls, [['state', 'error'], ['error', 'Enter a stream name (XXXXX-YYYYY) or a group ID.']]);
  r.calls.length = 0;
  assert.equal(await ctl.load({ stream: 'ABCDE-12345' }), null);
  assert.equal(r.calls.at(-2)[1], 'error');
  assert.match(r.calls.at(-1)[1], /nanoPlayer script failed to load/);
});

test('createController double load keeps one player and ignores the old one', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  await ctl.load({ stream: 'AAAAA-11111' });
  await ctl.load({ stream: 'BBBBB-22222' });
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, instances[1]);
  r.calls.length = 0;
  instances[0].fire('onPlay');
  instances[0].fire('onError', { message: 'old' });
  assert.deepEqual(r.calls, []);
});

test('createController destroys a player whose setup finishes after stop', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ deferSetup: true });
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  const pending = ctl.load({ stream: 'AAAAA-11111' });
  ctl.stop();
  instances[0].resolveSetup();
  assert.equal(await pending, null);
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, null);
  assert.deepEqual(r.calls.at(-1), ['state', 'idle']);
});

test('createController destroys a still-connecting player as soon as a new load starts', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ deferSetup: true });
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  const first = ctl.load({ stream: 'AAAAA-11111' });
  assert.equal(ctl.player, null, 'no player exposed before setup completes');
  const second = ctl.load({ stream: 'BBBBB-22222' });
  assert.equal(instances[0].destroyed, 1, 'first player destroyed before the second is built on the container');
  instances[0].resolveSetup();
  instances[1].resolveSetup();
  assert.equal(await first, null);
  assert.equal(await second, instances[1]);
  assert.equal(instances[0].destroyed, 1, 'not destroyed twice');
  assert.equal(ctl.player, instances[1]);
});

test('createController ignores extra handlers of a superseded player', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const seen = [];
  const ctl = D.createController('player', {}, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  await ctl.load({ stream: 'AAAAA-11111', extra: { onMute: () => seen.push('A') } });
  await ctl.load({ stream: 'BBBBB-22222', extra: { onMute: () => seen.push('B') } });
  instances[0].fire('onMute');
  instances[1].fire('onMute');
  assert.deepEqual(seen, ['B']);
});

test('createController stop destroys the player and reports idle', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() });
  await ctl.load({ stream: 'AAAAA-11111' });
  ctl.stop();
  ctl.stop();
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, null);
  assert.deepEqual(r.calls.at(-1), ['state', 'idle']);
});
