# Kokoro voice server

SEIHouse's free voice for NovelExpanded (SENSEI, 2026-11-17). It reads the
narration and every line that has no paid cast voice, with Kokoro-82M (Apache
2.0). It makes a line once, keeps it in Cloud Storage, and serves the saved file
to every reader after, so a line is only ever made one time.

It runs on Google Cloud Run in the `seihouse-core` project and sleeps when nobody
is listening. On four processor cores it makes about 3.5 seconds of speech a
second with the full model.

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

- **2026-11-17** — Built (SENSEI). Kokoro made in the reader's browser was far
  too slow on an iPhone, so lines are made here instead, once each, and kept.
