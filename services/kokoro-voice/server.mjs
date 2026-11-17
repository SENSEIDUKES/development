// SEIHouse's Kokoro voice server (Google Cloud Run).
//
// POST /line {text, voice} (with the shared key) makes one line of speech, or
// finds it already made, and answers {url}. GET /clip/<voice>/<hash>.mp3 serves
// a made line to anyone: every reader after the first hears the saved file.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { MODEL_VERSION, loadModel } from './model.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const TOKEN = process.env.KOKORO_TOKEN ?? '';
const BUCKET = process.env.KOKORO_BUCKET ?? '';
const MAX_TEXT = 600;

if (!TOKEN || !BUCKET) {
  console.error('KOKORO_TOKEN and KOKORO_BUCKET must be set.');
  process.exit(1);
}

/** Where made lines are kept: the Cloud Storage bucket, or a folder (`local:<folder>`) when testing on a computer. */
const store = BUCKET.startsWith('local:')
  ? (() => {
    const root = BUCKET.slice('local:'.length);
    const at = name => path.join(root, name);
    return {
      exists: async name => existsSync(at(name)),
      size: async name => (existsSync(at(name)) ? statSync(at(name)).size : undefined),
      save: async (name, bytes) => { mkdirSync(path.dirname(at(name)), { recursive: true }); writeFileSync(at(name), bytes); },
      read: (name, range) => createReadStream(at(name), range),
    };
  })()
  : (() => {
    const bucket = new Storage().bucket(BUCKET);
    return {
      exists: async name => (await bucket.file(name).exists())[0],
      size: async name => {
        try { return Number((await bucket.file(name).getMetadata())[0].size); } catch (error) { if (error?.code === 404) return undefined; throw error; }
      },
      save: (name, bytes) => bucket.file(name).save(bytes, { contentType: 'audio/mpeg', resumable: false, metadata: { cacheControl: 'public, max-age=31536000, immutable' } }),
      read: (name, range) => bucket.file(name).createReadStream(range ?? {}),
    };
  })();
let model;
const tts = () => (model ??= loadModel().catch(error => { model = undefined; throw error; }));

// One line is made at a time: the model already uses every core. Lines waiting here still hold a
// request slot, so the server takes many requests at once (setup.sh) and playing a kept clip is never stuck behind them.
let line = Promise.resolve();
const oneAtATime = work => {
  const next = line.then(work, work);
  line = next.catch(() => undefined);
  return next;
};
// The same line asked for twice at once is made once.
const making = new Map();

const clipName = (voice, text) => `${MODEL_VERSION}/${voice}/${createHash('sha256').update(text).digest('hex')}.mp3`;

/** 32-bit float samples to a small MP3: a few kilobytes a second, which every phone plays. */
const toMp3 = (samples, rate) => new Promise((resolve, reject) => {
  const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '64k', '-f', 'mp3', 'pipe:1']);
  const chunks = [];
  ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
  ffmpeg.on('error', reject);
  // ffmpeg stopping early breaks its input; the close handler reports the failed run, and the server stays up.
  ffmpeg.stdin.on('error', () => undefined);
  ffmpeg.on('close', code => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg ended with ${code}`))));
  ffmpeg.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
});

async function makeLine(voice, text) {
  const name = clipName(voice, text);
  if (await store.exists(name)) return { name, made: false };
  const started = Date.now();
  const audio = await oneAtATime(async () => (await tts()).generate(text, { voice }));
  const mp3 = await toMp3(audio.audio, audio.sampling_rate);
  await store.save(name, mp3);
  return { name, made: true, audioSeconds: audio.audio.length / audio.sampling_rate, tookMs: Date.now() - started };
}

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
  response.end(JSON.stringify(body));
};

const readJson = request => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  request.on('data', chunk => {
    size += chunk.length;
    if (size > 8_192) { reject(new Error('too large')); request.destroy(); return; }
    chunks.push(chunk);
  });
  request.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(error); } });
  request.on('error', reject);
});

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://server');
  try {
    if (request.method === 'GET' && url.pathname === '/health') { send(response, 200, { ok: true, model: MODEL_VERSION }); return; }

    if (request.method === 'GET' && url.pathname.startsWith('/clip/')) {
      const name = decodeURIComponent(url.pathname.slice('/clip/'.length));
      if (!/^[\w.-]+\/[a-z]{2}_[a-z]+\/[0-9a-f]{64}\.mp3$/.test(name)) { send(response, 404, { error: 'No such clip.' }); return; }
      const size = await store.size(name);
      if (size === undefined) { send(response, 404, { error: 'No such clip.' }); return; }
      const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' };
      // Safari on an iPhone plays audio only from a server that answers for a part of the file.
      const asked = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
      if (asked && (asked[1] || asked[2])) {
        const start = asked[1] ? Number(asked[1]) : Math.max(0, size - Number(asked[2]));
        const end = asked[1] && asked[2] ? Math.min(Number(asked[2]), size - 1) : size - 1;
        if (start > end || start >= size) {
          response.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` });
          response.end();
          return;
        }
        response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) });
        store.read(name, { start, end }).on('error', () => response.destroy()).pipe(response);
        return;
      }
      response.writeHead(200, { ...headers, 'Content-Length': String(size) });
      store.read(name).on('error', () => response.destroy()).pipe(response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/line') {
      if (request.headers.authorization !== `Bearer ${TOKEN}`) { send(response, 401, { error: 'Not allowed.' }); return; }
      const body = await readJson(request).catch(() => undefined);
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      const voice = typeof body?.voice === 'string' ? body.voice : '';
      if (!text || text.length > MAX_TEXT) { send(response, 400, { error: `A line is 1 to ${MAX_TEXT} characters.` }); return; }
      if (!/^[a-z]{2}_[a-z]+$/.test(voice)) { send(response, 400, { error: 'Unknown voice.' }); return; }
      const key = `${voice}\n${text}`;
      let work = making.get(key);
      if (!work) {
        work = makeLine(voice, text).finally(() => making.delete(key));
        making.set(key, work);
      }
      const result = await work;
      send(response, 200, { url: `/clip/${result.name}`, made: result.made, model: MODEL_VERSION, ...(result.made ? { audioSeconds: result.audioSeconds, tookMs: result.tookMs } : {}) });
      return;
    }

    send(response, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) send(response, 500, { error: 'The line could not be voiced.' });
  }
}).listen(PORT, () => console.log(`Kokoro voice server on ${PORT}`));
