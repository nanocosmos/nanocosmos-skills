#!/usr/bin/env node
// setup_restream_captions.js -- restream one or more live streams into NEW
// streams of your organisation with Live Captions + translation, recording
// and replay enabled. (fetch variant for Node >= 18; setup_restream_captions.sh
// is the same flow with curl.)
//
// Usage:
//   node setup_restream_captions.js <source-stream-name> [<source-stream-name> ...]
//
// Per source stream:
//   1. POST /stream            -> new low-latency stream, processing [rec, replay]
//                                 (retried without processing on error code 1009
//                                 FeatureNotEnabled -- recording not in the package)
//   2. POST /stream/{id}/options -> Live Captions, BEFORE the first ingest
//   3. spawn relay_stream.sh (ffmpeg -c copy, self-restarting, detached):
//        rtmp://bintu-play.nanocosmos.de/play/<source>
//     -> rtmp://bintu-stream.nanocosmos.de:1935/live/<new stream>
// then mints an orga-wide playback JWT via the Cloud Token Service.
//
// Environment (BINTU_API_KEY required; read from the shell or the first .env
// found at <skills repo root>/.env, <script dir>/.env, <script dir>/../.env,
// ~/.config/nanocosmos/.env, $PWD/.env -- or only NANOCOSMOS_ENV_FILE if set):
//   BINTU_API_KEY  API key of the TARGET organisation
//   SOURCE_LANG    spoken language of the source audio   (default: en)
//   TARGET_LANGS   comma-separated translation targets     (default: de,pt-BR)
//                  -- a STRING, not a JSON array: the array form shown in the
//                  Live Captions API guide answers HTTP 500 (2026-10-21)
//   ENGINE         ASR engine                              (default: deepgram)
//   NO_VOD=1       create without recording/replay
//   NO_RELAY=1     API steps only, do not start ffmpeg relays
//   LOGDIR         relay logs + map.tsv                    (default: /tmp/restream)
//   TOKEN_HOURS    lifetime of the printed playback JWT    (default: 2)
//
// Output: one TSV line per stream (source, target id, target name, pid,
// processing), appended to $LOGDIR/map.tsv, then the playback token.
// Stop all relays: pkill -f relay_stream.sh
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const API = 'https://bintu.nanocosmos.de';
const CTS = 'https://token.nanostream.cloud/api/v1/splay';
const SCRIPT_DIR = __dirname;

// ---- credentials: environment wins, then the first .env found (same order as env.sh)
function loadDotEnv() {
  // same order as env.sh: NANOCOSMOS_ENV_FILE alone if set, else repo root,
  // script dir, skill dir, user-level ~/.config/nanocosmos/.env, $PWD
  const xdg = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '', '.config');
  const candidates = process.env.NANOCOSMOS_ENV_FILE ? [process.env.NANOCOSMOS_ENV_FILE] : [
    path.join(SCRIPT_DIR, '..', '..', '.env'),
    path.join(SCRIPT_DIR, '.env'),
    path.join(SCRIPT_DIR, '..', '.env'),
    path.join(xdg, 'nanocosmos', '.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith('#')) continue;
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
    return file;
  }
  return null;
}

async function api(method, route, body, apiKey) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { 'x-bintu-apikey': apiKey, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: { message: text || res.statusText, code: res.status } }; }
  return data;
}

async function createStream(apiKey, src, withVod) {
  const body = { type: 'low-latency', tags: ['restream', `source-${src}`, 'captions'] };
  if (withVod) body.processing = [{ id: 'rec' }, { id: 'replay' }]; // same payload as the captions-workflow page
  return api('POST', '/stream', body, apiKey);
}

async function main() {
  const sources = process.argv.slice(2);
  if (!sources.length || sources.includes('-h') || sources.includes('--help')) {
    const header = fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//'));
    console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(sources.length ? 0 : 1);
  }
  loadDotEnv();
  const apiKey = process.env.BINTU_API_KEY;
  if (!apiKey) {
    console.error('error: BINTU_API_KEY not set and no .env found (see scripts/.env.example)');
    process.exit(1);
  }
  const SOURCE_LANG = process.env.SOURCE_LANG || 'en';
  const TARGET_LANGS = process.env.TARGET_LANGS || 'de,pt-BR';
  const ENGINE = process.env.ENGINE || 'deepgram';
  const LOGDIR = process.env.LOGDIR || '/tmp/restream';
  const TOKEN_HOURS = Number(process.env.TOKEN_HOURS || 2);
  const withVod = !process.env.NO_VOD;
  const relay = !process.env.NO_RELAY;
  fs.mkdirSync(LOGDIR, { recursive: true });

  let failed = false;
  for (const src of sources) {
    // 1. create (recording + replay unless NO_VOD; degrade on 1009)
    let rec = await createStream(apiKey, src, withVod);
    if (withVod && rec.error && Number(rec.error.code) === 1009) {
      console.error(`note: recording/replay not in this organisation's package -- creating ${src}'s target without it`);
      rec = await createStream(apiKey, src, false);
    }
    const id = rec.id;
    const dst = rec.ingest && rec.ingest.rtmp && rec.ingest.rtmp.streamname;
    if (!id || !dst) {
      console.error(`error: creating target stream for ${src} failed: ${rec.error ? rec.error.message : JSON.stringify(rec)}`);
      failed = true; continue;
    }
    const processing = (rec.processing || []).map((p) => p.id).join('+') || 'no-vod';

    // 2. captions, before the first ingest
    const opt = await api('POST', `/stream/${id}/options`, {
      name: 'captions',
      options: { engine: ENGINE, sourceLanguage: SOURCE_LANG, targetLanguages: TARGET_LANGS },
    }, apiKey);
    if (opt.error) {
      console.error(`error: captions on ${dst} failed: ${opt.error.message} -- is Live Captions enabled for this organisation? (stream created, relay NOT started)`);
      failed = true; continue;
    }

    // 3. relay, detached
    let pid = '-';
    if (relay) {
      const log = fs.openSync(path.join(LOGDIR, `${dst}.log`), 'a');
      const child = spawn(path.join(SCRIPT_DIR, 'relay_stream.sh'), [src, dst], {
        detached: true, stdio: ['ignore', log, log],
      });
      child.unref();
      pid = String(child.pid);
    }
    const line = [src, id, dst, pid, processing].join('\t');
    fs.appendFileSync(path.join(LOGDIR, 'map.tsv'), line + '\n');
    console.log(line);
  }

  // 4. orga-wide playback token (secure org)
  const exp = Math.floor(Date.now() / 1000) + TOKEN_HOURS * 3600;
  const tok = await fetch(CTS, {
    method: 'POST',
    headers: { 'x-bintu-apikey': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ orgawide: true, exp }),
  }).then((r) => r.json()).catch(() => ({}));
  if (tok && tok.data && tok.data.token) {
    console.log(`playback token (orga-wide, ${TOKEN_HOURS}h): ${tok.data.token}`);
  } else {
    console.error('note: no playback token minted (organisation not secure?) -- the new streams play without a token');
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
