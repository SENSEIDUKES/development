# The Familiar's media spot and its lenses

- **Created:** 2026-11-07
- **Owner:** SENSEI
- **Status:** phase A built (the guide player). Phases B to F are direction, not built.
  [`NOVEL_EXPANDED.md`](../NOVEL_EXPANDED.md) stays the source of truth for what
  is built.
- **Source:** a conversation with SENSEI on 2026-11-07, after trying
  Hugging Face's open real-time voice and camera demo (`smolagents/hf-realtime-voice`:
  Nemotron Transcribe to listen, Gemma to think and see, Qwen3-TTS to speak).

## The idea

The Familiar already has one spot for media: the frame on its card where a
guide's recording plays. That frame becomes **the Familiar's universal media
spot**. Whatever needs to be seen right now plays there:

- a recorded guide or help clip (today);
- what the Familiar looked at when you asked it something: a snapshot of the
  screen, or the paper you held up to the camera, so you see exactly what it saw;
- what it found: a character's picture from the Codex, a scene from the chapter;
- your camera, small, with its "on" light, while the camera lens is on.

Voice talk and video talk start from the same card. **No new page and no new
system**: the Familiar's card and its frame do more. Recorded media is still
made in the Studios; the frame plays what it is handed.

## Lenses, not features

Tapping, typing, the free phone voice and live talk are ways in to the same
Familiar. The camera is one more. Most readers never turn it on; for some it
is how they use the phone at all. **It is an accessibility lens.**

The camera does two different jobs, with two different tools:

| Job | What it does | Where it runs |
| --- | --- | --- |
| **Control** | Where you are looking, blinks, nods, head shakes. Look at one of the card's big choices and blink to pick it; nod for Yes. For readers who can only move their eyes (ALS, some strokes, locked-in), who today need eye-gaze devices that cost thousands. | On the phone, in real time, free. No video leaves the device. |
| **Understanding** | "What am I holding?", "What does this paper say?", "What's on my screen?" | One frame sent to a model that can see, only when there is a question. |

The Familiar's card already suits eye control: a few large choices, the
"Take me back" pill, and Yes / Change. Gaze does not need to be precise.

Later: the Familiar notices, with the reader's OK, that someone has been stuck
on a screen and offers help; sign language as one more way to talk.

## The engines underneath

Live talk already runs on three companies' real-time voice (Google, OpenAI,
ElevenLabs), chosen in the Model Router, with the free phone voice when none is
set up. Everything that makes it the Familiar sits above that choice: its rules,
no spoilers, story knowledge, "Take me back", asking before it changes anything.

The demo is the recipe for a fourth engine made only of open models: **ears**
(speech to text), **a brain that can see**, and **a voice**, with a small relay
passing the conversation between them. The same recipe fits three places:

| Where | What runs | Cost |
| --- | --- | --- |
| On the phone | Small phone-sized models, the phone's own speech, the on-device face and eye tracker | $0 to the user and to SEIHouse; battery and a one-time download |
| On a home computer or SEIHouse's own servers | The full recipe, with a brain around 30B | Nearly nothing once the hardware is owned; cheap on a rented GPU before that |
| In the cloud | Today's live talk | Paid per conversation |

The Familiar tries engines in order: SEIHouse's own server first, a paid one if
it is down, the free phone voice if everything is down. Readers never notice.
That is also the backup compute SENSEI plans to own. Every reader on an engine
we run ourselves costs almost nothing, which is how a help button for regular
people can be given away. The same engine is what the game studio would want
for NPCs. **It is a matter of timing, not a blocker.**

## The rules

- Off by default. The reader turns the camera lens on, and a clear light shows
  while it is on.
- It never watches by itself. Frames for understanding are taken only when
  there is a question, shown in the media spot, and never kept.
- Everything the Familiar already promises still holds: it never changes
  anything without asking, "Take me back" always works, and it gives no spoilers.
- Each open model's license must allow shipping it in an app. Check before
  choosing one.

## The phases

- **A. The guide player (built 2026-11-07).** The media spot made right for
  phones first. On a phone the guided tour is a full-screen player that never
  scrolls: progress at the top, the recording filling the middle, what the
  Familiar says under it, and Back / Next / Done in the thumb's reach. On a
  laptop the same player sits in a phone-shaped sheet.
- **B. The frame shows any media.** Pictures as well as recordings, so the
  Familiar can show what it found (a Codex picture) and what it looked at.
- **C. Show the Familiar something.** Tap, take one photo, ask about it. The
  photo shows in the frame. It covers "what did my doctor say?" today.
- **D. The open-model engine.** The fourth live talk engine on SEIHouse's own
  or rented server, registered in the Model Router, with the fallback order above.
- **E. The camera lens: control.** On-device gaze, blink and nod, driving the
  card's choices. No server.
- **F. The camera lens: live video talk.** The camera in the frame while you
  talk, with frames sent to a model that can see when there is a question.

## Open questions for the owner

- Which phase comes after A.
- Whether eye control (E) should come before the open engine (D): it needs no
  server and serves the readers who need it most.
