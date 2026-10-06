import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fakeNanoPlayerClass, fakeWindow, fakeEl, fakeNavigator } from './helpers.mjs';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';

function pageConfig(id = 'group-under-test') {
  return {
    source: {
      group: { id, startQuality: 'medium', security: {} },
      options: { adaption: { rule: 'deviationOfMean2' }, switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 } }
    },
    playback: { autoplay: true, automute: true, muted: false, faststart: true, enableMediaOverQuic: true, latencyControlMode: 'balancedadaptive' },
    style: { width: '100%', height: '100%', scaling: 'letterbox', controls: false }
  };
}

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
const env = (FakeNanoPlayer) => ({ NanoPlayer: FakeNanoPlayer, window: fakeWindow() });

// ---- events -----------------------------------------------------------------

test('playerEvents maps player events to demo states', () => {
  const r = recorder();
  const ev = D.playerEvents(r);
  ev.onReady({ data: {} });
  ev.onStartBuffering({ data: {} });
  ev.onPlay({ data: {} });
  ev.onPause({ data: {} });
  assert.deepEqual(r.calls.filter((c) => c[0] === 'state').map((c) => c[1]), ['connecting', 'buffering', 'playing', 'paused']);
});

test('onStreamInfoError without a code says not found or offline', () => {
  const r = recorder();
  D.playerEvents(r).onStreamInfoError({ data: { message: 'stream not available' } });
  assert.deepEqual(r.calls.filter((c) => c[0] !== 'log'), [
    ['state', 'error'],
    ['error', 'Stream not found or offline: stream not available'],
  ]);
});

test('playerEvents maps onError codes to readable text', () => {
  const r = recorder();
  D.playerEvents(r).onError({ data: { code: 4901, message: 'token expired' } });
  assert.match(r.calls.find((c) => c[0] === 'error')[1], /^Token problem: .*\(4901: token expired\)$/);
});

test('playerEvents forwards stats and stream info', () => {
  const r = recorder();
  const ev = D.playerEvents(r);
  ev.onStats({ data: { stats: { bitrate: { current: 1 } } } });
  ev.onStreamInfo({ data: { streamInfo: { haveVideo: true } } });
  assert.deepEqual(r.calls.filter((c) => c[0] !== 'log'), [['stats', { bitrate: { current: 1 } }], ['info', { haveVideo: true }]]);
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
  assert.ok(r.calls.some((c) => c[0] === 'log' && c[1] === 'onUpdateSourceSuccess'));
});

test('playerEvents works with no handlers at all', () => {
  const ev = D.playerEvents();
  assert.doesNotThrow(() => { ev.onPlay({ data: {} }); ev.onError({ data: {} }); ev.onStats({}); });
});

// ---- status -------------------------------------------------------------------

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
  h.onError('Stream not found: x');
  h.onState('paused');
  assert.equal(ui.text.textContent, 'Stream not found: x');
  assert.equal(ui.badgeText.textContent, 'Error');
  h.onState('playing');
  assert.equal(ui.text.textContent, '');
  h.onStats({ bitrate: { current: 2000000 } });
  assert.equal(ui.stats.textContent, 'Bitrate 2000 kbps · Buffer delay — (target —)');
  h.onState('idle');
  assert.equal(ui.stats.textContent, 'Bitrate — · Buffer delay — (target —)');
});

test('statusHandlers work without text and stats elements', () => {
  const ui = { badge: fakeEl(), badgeText: fakeEl() };
  const h = D.statusHandlers(ui);
  assert.doesNotThrow(() => { h.onState('idle'); h.onError('x'); h.onStats({}); h.onState('playing'); });
  assert.equal(ui.badgeText.textContent, 'Live');
});

// ---- log + report ----------------------------------------------------------------

test('appendLog writes redacted lines and caps the log', () => {
  const box = fakeEl();
  D.appendLog(box, 'onError', 'url ?token=' + JWT);
  assert.equal(box.firstChild.childNodes[1].textContent, 'onError url ?token=[redacted]');
  assert.match(box.firstChild.childNodes[0].textContent, /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  for (let i = 0; i < 10; i++) D.appendLog(box, 'e' + i, '', 5);
  assert.equal(box.childNodes.length, 5);
  assert.equal(box.childNodes[4].childNodes[1].textContent, 'e9');
});

test('flatten turns nested objects into dotted rows', () => {
  assert.deepEqual(D.flatten({ a: 1, b: { c: 'x' }, f: [1, 2] }), [['a', 1], ['b.c', 'x'], ['f', '[1,2]']]);
  assert.deepEqual(D.flatten(null), []);
});

test('buildReport includes all sections and never the token', () => {
  const text = D.buildReport({
    time: 't', pageUrl: 'https://x.test/?group=g&token=' + JWT, userAgent: 'UA',
    config: { source: { group: { id: 'g' } } }, counters: { errors: 1 },
    lastStats: { bitrate: { current: 1 } }, streamInfo: { url: 'wss://x/?token=' + JWT }, log: ['onPlay', 'onError ' + JWT],
  });
  assert.ok(!text.includes(JWT));
  for (const part of ['[Config]', 'source.group.id: g', '[Counters]', 'errors: 1', '[Last stats]', '[Stream info]', '[Event log]', 'Player: unknown']) {
    assert.ok(text.includes(part), 'missing ' + part);
  }
  assert.ok(!text.includes('Ticket:'));
});

test('buildReport includes player version and ticket when given', () => {
  const text = D.buildReport({ playerVersion: '5.0.13', ticket: '48213' });
  assert.ok(text.includes('Player: 5.0.13'));
  assert.ok(text.includes('Ticket: 48213'));
});

// ---- config panel ----------------------------------------------------------------

test('mountConfigPanel renders redacted JSON, toggles open and copies the rendered text', async () => {
  const els = { toggle: fakeEl('button'), pre: fakeEl('pre'), copy: fakeEl('button'), confirm: fakeEl('span') };
  els.toggle.setAttribute('aria-expanded', 'false');
  const nav = fakeNavigator();
  const panel = D.mountConfigPanel(els, { navigator: nav });
  const cfg = D.applyUrlParams(pageConfig(), '?token=secret-value');
  const text = panel.render(cfg);
  assert.equal(els.pre.textContent, text);
  assert.ok(!text.includes('secret-value'));
  els.toggle.click();
  assert.equal(els.toggle.getAttribute('aria-expanded'), 'true');
  assert.ok(els.pre.classList.contains('open'));
  els.toggle.click();
  assert.equal(els.toggle.getAttribute('aria-expanded'), 'false');
  assert.ok(!els.pre.classList.contains('open'));
  els.copy.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(nav.clipboard.written, [text]);
  assert.equal(els.confirm.textContent, 'Copied');
  assert.ok(els.confirm.classList.contains('show'));
});

test('mountConfigPanel says so when the clipboard is unavailable', () => {
  const els = { toggle: fakeEl(), pre: fakeEl(), copy: fakeEl(), confirm: fakeEl() };
  D.mountConfigPanel(els, { navigator: {} }).render({});
  els.copy.click();
  assert.match(els.confirm.textContent, /Clipboard unavailable/);
});

// ---- lifecycle --------------------------------------------------------------------

test('startPlayer reports a blocked player CDN readably', async () => {
  await assert.rejects(D.startPlayer('player', {}, {}), /nanoPlayer script failed to load/);
});

test('startPlayer sets up the player and destroys it on pagehide', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const win = fakeWindow();
  const p = await D.startPlayer('player', { source: {} }, { NanoPlayer: FakeNanoPlayer, window: win });
  assert.equal(p, instances[0]);
  win.dispatch('pagehide');
  assert.equal(p.destroyed, 1);
  assert.equal((win.listeners.pagehide || []).length, 0);
});

test('startPlayer destroys the player and rejects with the message when setup fails', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ setupFails: true });
  await assert.rejects(D.startPlayer('player', {}, { NanoPlayer: FakeNanoPlayer, window: fakeWindow() }), /bad config/);
  assert.equal(instances[0].destroyed, 1);
});

test('stopPlayer is null-safe and tolerates an already destroyed player', () => {
  assert.equal(D.stopPlayer(null), null);
  const { FakeNanoPlayer } = fakeNanoPlayerClass({ destroyThrows: true });
  assert.equal(D.stopPlayer(new FakeNanoPlayer('p')), null);
});

// ---- controller --------------------------------------------------------------------

test('load passes the page config unchanged except for events, as a clone', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const ctl = D.createController('player', recorder(), env(FakeNanoPlayer));
  const page = pageConfig();
  const before = JSON.stringify(page);
  const p = await ctl.load(page);
  const { events, ...rest } = p.config;
  assert.deepEqual(rest, page);
  assert.equal(typeof events.onPlay, 'function');
  p.config.source.group.id = 'mutated by player';
  assert.equal(JSON.stringify(page), before);
  assert.equal(page.events, undefined);
});

test('load merges page events with demo events, page first', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const order = [];
  const ctl = D.createController('player', { onState: (s) => order.push('demo:' + s) }, env(FakeNanoPlayer));
  const page = pageConfig();
  page.events = { onPlay: () => order.push('page:onPlay'), onMute: () => order.push('page:onMute') };
  await ctl.load(page);
  order.length = 0;
  instances[0].fire('onPlay');
  instances[0].fire('onMute');
  assert.deepEqual(order, ['page:onPlay', 'demo:playing', 'page:onMute']);
});

test('load reports an invalid config through handlers and starts no player', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, env(FakeNanoPlayer));
  assert.equal(await ctl.load(D.withSourceId(pageConfig(), '')), null);
  assert.deepEqual(r.calls[0], ['state', 'error']);
  assert.match(r.calls[1][1], /Enter a group ID/);
  assert.equal(instances.length, 0);
});

test('load reports a blocked CDN through handlers and resolves null', async () => {
  const r = recorder();
  const ctl = D.createController('player', r, { window: fakeWindow() });
  assert.equal(await ctl.load(pageConfig()), null);
  assert.deepEqual(r.calls.at(-2), ['state', 'error']);
  assert.match(r.calls.at(-1)[1], /nanoPlayer script failed to load/);
});

test('controller.config is the last loaded config', async () => {
  const { FakeNanoPlayer } = fakeNanoPlayerClass();
  const ctl = D.createController('player', {}, env(FakeNanoPlayer));
  assert.equal(ctl.config, null);
  const page = pageConfig('g-1');
  await ctl.load(page);
  assert.equal(ctl.config, page);
});

test('createController loads a player and reports connecting then playing', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, env(FakeNanoPlayer));
  const p = await ctl.load(pageConfig());
  assert.equal(p, instances[0]);
  assert.equal(ctl.player, p);
  assert.deepEqual(r.calls[0], ['state', 'connecting']);
  p.fire('onPlay');
  assert.deepEqual(r.calls.at(-1), ['state', 'playing']);
});

test('createController double load keeps one player and ignores the old one', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, env(FakeNanoPlayer));
  await ctl.load(pageConfig('g-a'));
  await ctl.load(pageConfig('g-b'));
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, instances[1]);
  r.calls.length = 0;
  instances[0].fire('onPlay');
  instances[0].fire('onError', { message: 'old' });
  assert.deepEqual(r.calls, []);
});

test('createController destroys a still-connecting player as soon as a new load starts', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ deferSetup: true });
  const ctl = D.createController('player', recorder(), env(FakeNanoPlayer));
  const first = ctl.load(pageConfig('g-a'));
  assert.equal(ctl.player, null);
  const second = ctl.load(pageConfig('g-b'));
  assert.equal(instances[0].destroyed, 1);
  instances[0].resolveSetup();
  instances[1].resolveSetup();
  assert.equal(await first, null);
  assert.equal(await second, instances[1]);
  assert.equal(instances[0].destroyed, 1);
});

test('createController ignores page and extra handlers of a superseded player', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const seen = [];
  const ctl = D.createController('player', {}, env(FakeNanoPlayer));
  const a = pageConfig('g-a'); a.events = { onMute: () => seen.push('page-A') };
  await ctl.load(a, { onMute: () => seen.push('extra-A') });
  await ctl.load(pageConfig('g-b'), { onMute: () => seen.push('extra-B') });
  instances[0].fire('onMute');
  instances[1].fire('onMute');
  assert.deepEqual(seen, ['extra-B']);
});

test('createController destroys a player whose setup finishes after stop', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass({ deferSetup: true });
  const r = recorder();
  const ctl = D.createController('player', r, env(FakeNanoPlayer));
  const pending = ctl.load(pageConfig());
  ctl.stop();
  instances[0].resolveSetup();
  assert.equal(await pending, null);
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, null);
  assert.deepEqual(r.calls.at(-1), ['state', 'idle']);
});

test('createController stop destroys the player and reports idle', async () => {
  const { FakeNanoPlayer, instances } = fakeNanoPlayerClass();
  const r = recorder();
  const ctl = D.createController('player', r, env(FakeNanoPlayer));
  await ctl.load(pageConfig());
  ctl.stop();
  ctl.stop();
  assert.equal(instances[0].destroyed, 1);
  assert.equal(ctl.player, null);
  assert.deepEqual(r.calls.at(-1), ['state', 'idle']);
});
