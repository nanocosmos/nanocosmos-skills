import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../lib/demo-core.js');

const UUID = 'b6638d50-3581-4349-8fb2-59b3406c2dde';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.c2lnbmF0dXJlLXZhbHVl';

test('isUuid detects group IDs and rejects stream names', () => {
  assert.equal(D.isUuid(UUID), true);
  assert.equal(D.isUuid('  ' + UUID.toUpperCase() + ' '), true);
  assert.equal(D.isUuid('CD6oL-2kE1g'), false);
  assert.equal(D.isUuid(''), false);
  assert.equal(D.isUuid(null), false);
});

test('readParams falls back to defaults', () => {
  const p = D.readParams('');
  assert.equal(p.stream, 'CD6oL-2kE1g');
  assert.equal(p.token, '');
  assert.equal(p.server, 'bintu-play.nanocosmos.de');
});

test('readParams reads stream, token alias and server, trimming whitespace', () => {
  const p = D.readParams('?stream=%20ABCDE-12345%20&jwtoken=' + JWT + '&server=example.test');
  assert.equal(p.stream, 'ABCDE-12345');
  assert.equal(p.token, JWT);
  assert.equal(p.server, 'example.test');
  assert.equal(p.params.get('server'), 'example.test');
});

test('readParams prefers ?token= over ?jwtoken= and treats blank stream as default', () => {
  const p = D.readParams('?stream=%20&token=A&jwtoken=B');
  assert.equal(p.stream, 'CD6oL-2kE1g');
  assert.equal(p.token, 'A');
});

test('readParams accepts per-demo default overrides', () => {
  assert.equal(D.readParams('', { stream: 'XXXXX-YYYYY' }).stream, 'XXXXX-YYYYY');
});

test('buildSource plays a stream name via entries', () => {
  const s = D.buildSource({ stream: 'ABCDE-12345' });
  assert.deepEqual(s.entries, [{ h5live: { rtmp: { streamname: 'ABCDE-12345' }, security: {} } }]);
  assert.equal(s.group, undefined);
  assert.deepEqual(s.defaults, { service: 'bintu' });
  assert.deepEqual(s.general, { serverDomain: 'bintu-play.nanocosmos.de' });
  assert.deepEqual(s.options, { switch: { timeout: 10 }, adaption: { rule: 'deviationOfMean2' } });
  assert.equal(s.startIndex, 0);
});

test('buildSource plays a UUID via group with apiurl and token security', () => {
  const s = D.buildSource({ stream: UUID, token: JWT, server: 'example.test' });
  assert.deepEqual(s.group, { id: UUID, apiurl: 'https://bintu.nanocosmos.de', security: { jwtoken: JWT } });
  assert.equal(s.entries, undefined);
  assert.equal(s.general.serverDomain, 'example.test');
});

test('buildSource rejects an empty or whitespace stream with a readable message', () => {
  assert.throws(() => D.buildSource({ stream: '   ' }), /Enter a stream name/);
  assert.throws(() => D.buildSource({}), /Enter a stream name/);
});

test('buildConfig applies verified playback and style defaults', () => {
  const source = D.buildSource({ stream: 'ABCDE-12345' });
  const c = D.buildConfig({ source });
  assert.equal(c.source, source);
  assert.deepEqual(c.playback, {
    autoplay: true, automute: true, muted: true,
    enableMediaOverQuic: true, faststart: true,
    latencyControlMode: 'balancedadaptive',
  });
  assert.deepEqual(c.style, { scaling: 'fill', width: '100%', height: '100%', view: true, controls: false });
  assert.deepEqual(c.events, {});
});

test('buildConfig merges overrides and keeps automute on with autoplay', () => {
  const c = D.buildConfig({
    source: {},
    playback: { latencyControlMode: 'fastadaptive', enableMediaOverQuic: false, automute: false },
    style: { controls: true },
  });
  assert.equal(c.playback.latencyControlMode, 'fastadaptive');
  assert.equal(c.playback.enableMediaOverQuic, false);
  assert.equal(c.playback.automute, true);
  assert.equal(c.style.controls, true);
  assert.equal(c.style.scaling, 'fill');
});

test('buildConfig rejects a latency value that is not a control mode', () => {
  assert.throws(() => D.buildConfig({ source: {}, playback: { latencyControlMode: '2s' } }),
    /latencyControlMode must be one of fastadaptive, balancedadaptive, classic/);
});

test('errorMessage prefers data.message, then data.error, then code', () => {
  assert.equal(D.errorMessage({ data: { message: 'Stream offline', code: 2002 } }), 'Stream offline');
  assert.equal(D.errorMessage({ data: { error: { message: 'Nested' } } }), 'Nested');
  assert.equal(D.errorMessage({ data: { error: 'Flat' } }), 'Flat');
  assert.equal(D.errorMessage({ data: { code: 4001 } }), 'Player error 4001');
  assert.equal(D.errorMessage(new Error('Plain')), 'Plain');
  assert.equal(D.errorMessage(undefined), 'Unknown player error');
});

test('redact removes JWTs and token URL params', () => {
  const out = D.redact('url https://x.test/?stream=A&token=' + JWT + '&jwtoken=abc#x and raw ' + JWT);
  assert.ok(!out.includes(JWT));
  assert.ok(!out.includes('jwtoken=abc'));
  assert.ok(out.includes('token=[redacted]'));
  assert.ok(out.includes('jwtoken=[redacted]'));
  assert.ok(out.includes('stream=A'));
  assert.equal(D.redact(null), '');
});

test('formatStats reads plain numbers and {current} objects, dashes for missing', () => {
  assert.deepEqual(D.formatStats({ latency: 1.234, bitrate: 1500, bufferDelay: 0.8, frameRate: 30 }),
    { latency: '1.23 s', bitrate: '1500 kbps', buffer: '0.80 s', framerate: '30 fps' });
  assert.deepEqual(D.formatStats({ buffer: { delay: { current: 0.5 } }, framerate: { current: 25 } }),
    { latency: '—', bitrate: '—', buffer: '0.50 s', framerate: '25 fps' });
  assert.deepEqual(D.formatStats(null), { latency: '—', bitrate: '—', buffer: '—', framerate: '—' });
});

test('statsLine renders the status-bar summary', () => {
  assert.equal(D.statsLine(null), 'Latency — · Bitrate — · Buffer —');
  assert.equal(D.statsLine({ latency: 1, bitrate: 900, bufferDelay: 0.5 }), 'Latency 1.00 s · Bitrate 900 kbps · Buffer 0.50 s');
});
