import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';
const GROUP = 'b6638d50-3581-4349-8fb2-59b3406c2dde';

function pageConfig() {
  return {
    source: {
      group: { id: GROUP, startQuality: 'medium', security: {} },
      options: { adaption: { rule: 'deviationOfMean2' }, switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 } }
    },
    playback: { autoplay: true, automute: true, muted: false, faststart: true, enableMediaOverQuic: true, latencyControlMode: 'balancedadaptive' },
    style: { width: '100%', height: '100%', scaling: 'letterbox', controls: false }
  };
}

test('applyUrlParams without params returns an equal copy, not the same object', () => {
  const page = pageConfig();
  const c = D.applyUrlParams(page, '');
  assert.deepEqual(c, page);
  assert.notEqual(c, page);
  assert.notEqual(c.source.group, page.source.group);
});

test('applyUrlParams sets group id and token on the group, leaving the page config untouched', () => {
  const page = pageConfig();
  const before = JSON.stringify(page);
  const c = D.applyUrlParams(page, '?group=other-group&token=' + JWT);
  assert.equal(c.source.group.id, 'other-group');
  assert.deepEqual(c.source.group.security, { jwtoken: JWT });
  assert.equal(c.source.group.startQuality, 'medium');
  assert.equal(JSON.stringify(page), before);
});

test('applyUrlParams accepts ?jwtoken= as token alias and trims values', () => {
  const c = D.applyUrlParams(pageConfig(), '?jwtoken=%20abc%20');
  assert.deepEqual(c.source.group.security, { jwtoken: 'abc' });
});

test('?stream= switches to entries mode and wins over ?group=', () => {
  const c = D.applyUrlParams(pageConfig(), '?group=ignored&stream=ABCDE-12345&token=T');
  assert.equal(c.source.group, undefined);
  assert.deepEqual(c.source.defaults, { service: 'bintu' });
  assert.deepEqual(c.source.entries, [{ h5live: { rtmp: { streamname: 'ABCDE-12345' }, security: { jwtoken: 'T' } } }]);
  assert.equal(c.source.startIndex, 0);
  assert.deepEqual(c.source.options, pageConfig().source.options);
});

test('a malformed ?stream= throws a readable error', () => {
  assert.throws(() => D.applyUrlParams(pageConfig(), '?stream=foo'), /\?stream= must be a stream name like XXXXX-YYYYY/);
});

test('serverDomain is only set when ?server= is given', () => {
  assert.equal(D.applyUrlParams(pageConfig(), '').source.general, undefined);
  assert.deepEqual(D.applyUrlParams(pageConfig(), '?server=bintu-play-eu.nanocosmos.de').source.general,
    { serverDomain: 'bintu-play-eu.nanocosmos.de' });
});

test('mergeConfig deep-merges objects, replaces arrays and leaves both inputs untouched', () => {
  const base = pageConfig();
  const override = { playback: { enableMediaOverQuic: false }, source: { group: { id: 'g2' } } };
  const m = D.mergeConfig(base, override);
  assert.equal(m.playback.enableMediaOverQuic, false);
  assert.equal(m.playback.faststart, true);
  assert.equal(m.source.group.id, 'g2');
  assert.equal(m.source.group.startQuality, 'medium');
  assert.equal(base.playback.enableMediaOverQuic, true);
  override.playback.enableMediaOverQuic = 'changed';
  assert.equal(m.playback.enableMediaOverQuic, false);
  assert.deepEqual(D.mergeConfig({ a: [1, 2] }, { a: [3] }), { a: [3] });
});

test('clone keeps functions by reference and copies objects', () => {
  const fn = () => 1;
  const src = { events: { onPlay: fn }, a: { b: 1 } };
  const c = D.clone(src);
  assert.equal(c.events.onPlay, fn);
  assert.notEqual(c.a, src.a);
});

test('sourceId and withSourceId work for group and entries mode', () => {
  assert.equal(D.sourceId(pageConfig()), GROUP);
  assert.equal(D.withSourceId(pageConfig(), ' g3 ').source.group.id, 'g3');
  const entries = D.applyUrlParams(pageConfig(), '?stream=ABCDE-12345');
  assert.equal(D.sourceId(entries), 'ABCDE-12345');
  assert.equal(D.withSourceId(entries, 'FGHIJ-67890').source.entries[0].h5live.rtmp.streamname, 'FGHIJ-67890');
  assert.equal(D.sourceId({}), '');
});

test('validateConfig explains missing ids and invalid enum values', () => {
  assert.equal(D.validateConfig(pageConfig()), null);
  assert.match(D.validateConfig(D.withSourceId(pageConfig(), '')), /Enter a group ID/);
  assert.match(D.validateConfig({}), /needs a source/);
  assert.match(D.validateConfig({ source: { entries: [] } }), /Enter a stream name/);
  const badQ = pageConfig(); badQ.source.group.startQuality = 'best';
  assert.match(D.validateConfig(badQ), /startQuality must be one of high, medium-high, medium, medium-low, low/);
  const badL = pageConfig(); badL.playback.latencyControlMode = '2s';
  assert.match(D.validateConfig(badL), /latencyControlMode must be one of classic, fastadaptive, balancedadaptive/);
});

test('configJson pretty-prints without events and redacts every jwtoken value', () => {
  const c = D.applyUrlParams(pageConfig(), '?token=not-a-jwt-secret');
  c.events = { onPlay: () => {} };
  const text = D.configJson(c);
  assert.ok(!text.includes('not-a-jwt-secret'));
  assert.ok(text.includes('"jwtoken": "[redacted]"'));
  assert.ok(!text.includes('events'));
  assert.ok(text.startsWith('{\n  "source"'));
  assert.ok(D.configJson([{ label: 'A', config: c }]).includes('"label": "A"'));
});

test('redact removes jwtoken values inside JSON, JWT-shaped or not', () => {
  const out = D.redact('{"config":{"source":{"group":{"security":{"jwtoken":"mysecret123"}}}},"x":{"jwtoken" : "other"}}');
  assert.ok(!out.includes('mysecret123') && !out.includes('other'));
  assert.ok(out.includes('"jwtoken":"[redacted]"'));
  assert.equal(D.redact('{"jwtoken":""}'), '{"jwtoken":""}');
});

test('errorText gives readable text for documented code ranges', () => {
  assert.match(D.errorText(2001, 'x'), /^Stream not found: check the group ID or stream name\. \(2001: x\)$/);
  assert.match(D.errorText(4901), /^Token problem: the JWT is invalid\. Pass a valid one with \?token=\. \(4901\)$/);
  assert.match(D.errorText(4903), /^Token problem: the JWT is missing or expired\. Pass one with \?token=\./);
  assert.match(D.errorText(5006), /needs a token: pass one with \?token=/);
  assert.match(D.errorText(4900), /^The token service had an internal error/);
  assert.match(D.errorText(4904), /^The token service could not be found/);
  assert.ok(!/^Token problem/.test(D.errorText(4900)) && !/^Token problem/.test(D.errorText(4904)));
  assert.match(D.errorText(1005), /press play/);
  assert.match(D.errorText(5004, 'bad'), /check PLAYER_CONFIG/);
  assert.match(D.errorText(5001), /exception: check PLAYER_CONFIG and the page's event handlers/);
  assert.match(D.errorText(5002), /^This browser does not support this playback/);
  assert.match(D.errorText(5003), /^A forced playback tech is not supported by this browser/);
  assert.equal(D.errorText(3100, 'Media error'), 'Media error');
  assert.equal(D.errorText(undefined, ''), 'Unknown player error');
  assert.equal(D.errorText(3100, ''), 'Player error 3100');
});

test('errorMessage reads the player event payload and maps the code', () => {
  assert.match(D.errorMessage({ data: { code: 2001, message: 'not found' } }), /^Stream not found/);
  assert.equal(D.errorMessage({ data: { error: { message: 'Nested' } } }), 'Nested');
  assert.equal(D.errorMessage(new Error('Plain')), 'Plain');
  assert.equal(D.errorMessage(undefined), 'Unknown player error');
});

test('redact removes JWTs and token URL params, keeping JSON intact', () => {
  const out = D.redact('u ?stream=A&token=' + JWT + '&jwtoken=abc#x raw ' + JWT);
  assert.ok(!out.includes(JWT));
  assert.ok(out.includes('token=[redacted]') && out.includes('jwtoken=[redacted]') && out.includes('stream=A'));
  assert.equal(D.redact('{"u":"wss://x/?token=abc"}'), '{"u":"wss://x/?token=[redacted]"}');
});

test('formatStats converts bit/s to kbps and shows buffer delay with its target', () => {
  assert.deepEqual(
    D.formatStats({ bitrate: { current: 1500000 }, buffer: { delay: { current: 0.84 } }, buffergoal: { real: 1.2 }, framerate: { current: 30 } }),
    { bitrate: '1500 kbps', bufferDelay: '0.84 s', bufferGoal: '1.20 s', framerate: '30 fps' });
  assert.deepEqual(D.formatStats(null), { bitrate: '—', bufferDelay: '—', bufferGoal: '—', framerate: '—' });
});

test('statsLine renders bitrate and buffer delay against target', () => {
  assert.equal(D.statsLine(null), 'Bitrate — · Buffer delay — (target —)');
  assert.equal(D.statsLine({ bitrate: { current: 900000 }, buffer: { delay: { current: 0.5 } }, buffergoal: { real: 1 } }),
    'Bitrate 900 kbps · Buffer delay 0.50 s (target 1.00 s)');
});
