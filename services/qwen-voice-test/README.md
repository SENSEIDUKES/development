# Qwen3-TTS trial (a test, not a service)

A one-off trial asked for by SENSEI (2026-11-17): could Qwen3-TTS (Apache 2.0)
be a **foundation voice** beside Kokoro, with each character's voice designed
from its Codex card?

`test.py` designs each voice once from a description built from the story's
Codex cards (VoiceDesign 1.7B), then makes that character's real lines from the
designed sample (Base 1.7B, "design then clone", Qwen's own advice for a voice
that stays the same from line to line). It times everything and writes the
audio and a listening page to `gs://<project>-kokoro-voices/qwen-test/<run>/`.

Run from Cloud Shell: `bash services/qwen-voice-test/run.sh seihouse-core`. It
runs once on a Cloud Run GPU job (NVIDIA L4); nothing stays running.

`lines.json` holds the voices and lines, taken from the exported test story
"Tethered Paths of the Immortal Sun".

## History

- **2026-11-17** — Written (SENSEI).
