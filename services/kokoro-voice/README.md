# Kokoro voice server

SEIHouse's foundation voice for NovelExpanded (SENSEI, 2026-11-17): the guaranteed floor, not the ceiling, and not free (it carries an Energy price; premium voices such as ElevenLabs stay above it). It reads the
narration and every line that has no paid cast voice, with Kokoro-82M (Apache
2.0). It makes a line once, keeps it in Cloud Storage, and serves the saved file
to every reader after, so a line is only ever made one time.

It runs on Google Cloud Run in the `seihouse-core` project and sleeps when nobody
is listening. On four processor cores it makes about 3.5 seconds of speech a
second with the full model.

## Before going public: the audio moves to R2

**Decided by SENSEI, 2026-11-17.** The Google Cloud Storage bucket is the
development shelf only. Before NovelExpanded is public, made lines are kept on
Cloudflare R2 and readers download them straight from R2, not through this
server: R2 charges nothing for sending files out, and sending audio to
listeners is the cost that grows with readers (about 4 MB a chapter).

What that change is:

- `server.mjs`: add an R2 store beside the Cloud Storage and local ones (R2
  speaks the S3 API), keyed the same way (`<model>/<voice>/<sha256>.mp3`).
- `POST /line` answers the clip's public R2 address instead of `/clip/...`.
  `src/server/audio/kokoroVoice.ts` must then accept that address rather than
  only `/clip/` paths.
- The R2 keys go to Cloud Run as secrets (Secret Manager), never in
  `setup.sh` or the repository. SENSEI has an R2 account; it is not set up
  for this yet.
- Copy any lines already kept in `gs://seihouse-core-kokoro-voices` across,
  or let them be made again.

The Reader does not change: it only receives a line's address. The app's server does (`kokoroVoice.ts`, above).

## How the app uses it

The browser never talks to it with the key. The Reader asks the app's own
server (`/api/chapter-voice`, `{ kokoro: { text, voice } }`), which asks this
server with `KOKORO_SERVER_TOKEN` and hands back the clip's address. The clip
itself is played straight from this server (`/clip/...`), which anyone may read.

| Route | Who | What |
| --- | --- | --- |
| `POST /line` `{ text, voice }` | the app's server, with the key | Makes the line or finds it kept; answers `{ url, made }`. |
| `GET /clip/<model>/<voice>/<hash>.mp3` | anyone | The saved line, as MP3. |
| `GET /health` | anyone | `{ ok, model }`. |

## Setting it up

In the Google Cloud console's Cloud Shell:

```bash
git clone --depth 1 https://github.com/SENSEIDUKES/development.git seihouse
bash seihouse/services/kokoro-voice/setup.sh seihouse-core
```

It turns on the services it needs, makes the storage bucket, builds and starts
the server, and prints `KOKORO_SERVER_URL` and `KOKORO_SERVER_TOKEN` to add to
Vercel's environment variables. Running it again updates the server and makes a
new key, which then replaces the old one in Vercel.

## Testing on a computer

```bash
cd services/kokoro-voice && npm install
KOKORO_TOKEN=test KOKORO_BUCKET=local:/tmp/kokoro-clips node server.mjs
```

`local:<folder>` keeps made lines in a folder instead of Cloud Storage.

## History

- **2026-11-17** — Public release keeps the audio on R2 (SENSEI); the Cloud Storage bucket is for development only.
- **2026-11-17** — Built (SENSEI). Kokoro made in the reader's browser was far
  too slow on an iPhone, so lines are made here instead, once each, and kept.
