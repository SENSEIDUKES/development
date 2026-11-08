# SEIHouse Front Desk: the plan

- **Created:** 2026-11-07, as the Familiar's media spot plan; widened to the whole
  Front Desk on 2026-11-08.
- **Owner:** SENSEI
- **Status:** step 1 built (2026-11-08); the media spot's phase A built (2026-11-07).
  Everything else is direction, in order. [`NOVEL_EXPANDED.md`](../NOVEL_EXPANDED.md)
  stays the source of truth for what is built.
- **Sources:** conversations with SENSEI on 2026-11-07 and 2026-11-08, including
  Hugging Face's open real-time voice and camera demo (`smolagents/hf-realtime-voice`:
  Nemotron Transcribe to listen, Gemma to think and see, Qwen3-TTS to speak) and
  Microsoft's inclusive design principle, solve for one, extend to many.

## What it is

**The app's front desk:** one character who is the interface. Help, guides,
navigation, messages, accessibility setup, and later taste and memory all go
through it: one voice, one set of rules, everywhere. It is **SEIHouse Front Desk**
(`@seihouse/front-desk`), open source under MPL-2.0. Novel Expanded's character on
it is the Familiar; SEA's will be the vocal director.

Its rules: it never changes anything without asking; "Take me back" always works;
no spoilers unless asked; it never watches unless asked; your data is yours.

## Who it is for

The first four layers: the 14-year-old; the factory worker with busy hands and
eyes; the slow but good-hearted daily companion user; the reader in a hospital bed
who cannot use their hands. The fifth: **older people**, through a conversation that
comes first, is patient and remembers your name. And the groups named along the
way: deaf, DeafBlind, dyslexic, easily overwhelmed, forgetful, second-language
readers, and people who use a single switch.

Each limit comes permanent, temporary and situational (one arm, a broken arm, a
parent holding a baby), so building for one serves the rest. The situational ones
gave quiet mode and hands-free listening (step 5); the hands-free listening mode was
the Familiar's original inspiration, and cheap phones and data are why the core
must always work on the free engines.

## The steps

1. **Separate Front Desk inside this repository (built 2026-11-08).** Its own
   source tree (`src/front-desk/`), entry (`@seihouse/front-desk`) and boundary rule
   (`FRONT_DESK_BOUNDARY`): it imports nothing from SEN, the Library or the app, which
   hand it their docs, action rules, code letters, wording, recorded-line player and
   the character's face. The app works exactly as before, through `FamiliarFrontDesk`.
2. **Lift it into its own repository.** `seihouse-front-desk`, MPL-2.0, a plain
   default look, a tiny example app and a README, no SEIHouse art or secrets; vendored
   back into this repository like the audio player and the UI kit. Then rename the
   card's CSS classes, `data-familiar-*` attributes and labels, move the live-talk
   server pieces, give the controller's tests their own fixtures, and decide on the
   `@seihouse/ui` peer.
3. **The bridge for older people.** Words under the icons; "Tap to say hello": it
   introduces itself and asks your name, then it is a conversation, listening when it
   finishes talking, with no microphone button per turn; patience (it waits longer,
   never talks over you, "say that again" and "slower" always work); two or three
   choices offered instead of only "what next?".
4. **Memory and first-meeting setup.** It remembers your name and greets you back.
   The first meeting asks, in one short conversation: your name, your channel (the
   two-option preference), read aloud, bigger text, captions for sounds, fewer effects.
   A family member can set it up for someone else. What it remembers is visible,
   changeable and wipeable.
5. **Quiet mode and hands-free listening.** Quiet mode: text only, for bed, the
   library or class. Hands-free listening: chapters back to back like an audiobook,
   steered by voice ("next chapter", "go back a bit", "who's that?").
6. **Pages hand it their content, and the Inbox.** Pages give it what is on them
   (messages, stories, chapters), not only their buttons. A mail icon beside the
   microphone in the tray, with a dot when something is new, opens a dedicated Inbox
   page the Familiar runs: "read me my messages", "what's important", "take me there",
   "mark all read". Messages carry their next step (Open chapter, Go to event). It
   never interrupts a chapter unless something is urgent. The app's own messages
   first, on the device; SEIHouse's and other people's later, with the server.
7. **The channel works everywhere.** Home and Discover open on the reader's channel
   (the two-option preference, as the genre's own platforms present it), the other
   side one swipe away; "what's new" means new for you, sharpened quietly by what they
   read, finish and drop.
8. **Accessibility lenses.** "Read this to me" in the bottom bar's spare slot (in the
   Reader, "Catch me up"); read-along, the words lit as they are read; Sound Cue
   captions ("*[thunder rolls]*") for deaf readers; Calm mode (no flashing, motion or
   surprise sounds); "say that simpler" and "what does this word mean?"; a switch
   access and braille readiness check.
9. **The touch lens.** Vibration patterns for the Familiar ("heard you", "done",
   "are you sure?", "something's waiting") and Sound Cues you feel. Android browsers
   now; iPhone once the app is installed. For DeafBlind readers, touch is the whole channel.
10. **The rest of the media spot**, phases B to F below: pictures in the frame,
    "show the Familiar something", the open-model engine on SEIHouse's own server,
    on-device eye, blink and nod control, live video talk.
11. **SEA's vocal director.** The same Front Desk with SEA's own character, look and actions.

## The media spot and its lenses (step 10)

### The idea

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

### Lenses, not features

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

### The engines underneath

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

### The rules

- Off by default. The reader turns the camera lens on, and a clear light shows
  while it is on.
- It never watches by itself. Frames for understanding are taken only when
  there is a question, shown in the media spot, and never kept.
- Everything the Familiar already promises still holds: it never changes
  anything without asking, "Take me back" always works, and it gives no spoilers.
- Each open model's license must allow shipping it in an app. Check before
  choosing one.

### The phases

- **A. Guides play in the Familiar's card (built 2026-11-07).** The card's
  middle is the media spot: a guide plays there in place of the topics and
  actions, from the Guides button beside the microphone (the card's quick
  actions for this screen) and in whichever mode the card is in, with the
  card's top bar, "Take me back" and the microphone still around it, so the reader watches, follows along on the page and talks to the
  Familiar in one place. The card can be dragged anywhere. The guides'
  progress, Close and Hear sit on the recording; under it Back, the title and
  what the Familiar says (tap for all of it), and Next (Done on the last).
  SENSEI corrected two earlier tries the same day: a full-screen player (a
  guide that covers the screen cannot be followed) and a separate corner
  window (two surfaces that do not talk to each other; the card already is
  the place).
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

- Which media spot phase comes after A, and whether eye control (E) should come
  before the open engine (D): it needs no server and serves the readers who need it most.
