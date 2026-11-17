"""
Qwen3-TTS trial for SEIHouse (SENSEI, 2026-11-17): can it be a foundation voice?

For each voice in lines.json it designs the voice once from its Codex-card
description (VoiceDesign model), keeps that sample, and makes every line from
it (Base model, "design then clone": Qwen's own advice for a voice that stays
the same from line to line). Every step is timed. The audio and a listening
page (index.html) go to the Cloud Storage bucket, under qwen-test/<run>/.
"""
import html, io, json, os, sys, time
import soundfile as sf
import torch
from google.cloud import storage
from qwen_tts import Qwen3TTSModel

BUCKET = os.environ["BUCKET"]
RUN = time.strftime("%Y%m%d-%H%M%S")
PREFIX = f"qwen-test/{RUN}"
bucket = storage.Client().bucket(BUCKET)
data = json.load(open(os.path.join(os.path.dirname(__file__), "lines.json")))
log = lambda *a: print(*a, flush=True)

def upload(name, wav, sr):
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV")
    bucket.blob(f"{PREFIX}/{name}").upload_from_string(buf.getvalue(), content_type="audio/wav")
    return name

log("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none")
t = time.time()
design = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16)
clone = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cuda:0", dtype=torch.bfloat16)
load_s = time.time() - t
log(f"models loaded in {load_s:.0f}s")

rows, total_audio, total_took = [], 0.0, 0.0
for i, voice in enumerate(data["voices"]):
    ref_text = voice["lines"][0]
    t = time.time()
    ref, sr = design.generate_voice_design(text=ref_text, language="English", instruct=voice["instruct"])
    took = time.time() - t
    sec = len(ref[0]) / sr
    ref_name = upload(f"{i}-{voice['name'].replace(' ', '_')}-designed.wav", ref[0], sr)
    log(f"{voice['name']}: designed {sec:.1f}s of speech in {took:.1f}s")
    entries = [("designed sample", ref_text, ref_name, sec, took)]
    prompt = clone.create_voice_clone_prompt(ref_audio=(ref[0], sr), ref_text=ref_text)
    for j, text in enumerate(voice["lines"][1:] or voice["lines"], start=1):
        t = time.time()
        wavs, sr = clone.generate_voice_clone(text=text, language="English", voice_clone_prompt=prompt)
        took = time.time() - t
        sec = len(wavs[0]) / sr
        total_audio += sec; total_took += took
        name = upload(f"{i}-{voice['name'].replace(' ', '_')}-line{j}.wav", wavs[0], sr)
        log(f"  line {j}: {sec:.1f}s of speech in {took:.1f}s ({sec / took:.1f}x)")
        entries.append((f"line {j}", text, name, sec, took))
    rows.append((voice, entries))

speed = total_audio / total_took if total_took else 0
log(f"OVERALL: {total_audio:.0f}s of speech in {total_took:.0f}s = {speed:.1f}x faster than spoken")

base = f"https://storage.cloud.google.com/{BUCKET}/{PREFIX}/"
page = [f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Qwen3-TTS trial</title>",
        "<style>body{font-family:system-ui;background:#111;color:#eee;max-width:760px;margin:auto;padding:16px}audio{width:100%}.m{color:#9ab}h2{margin-top:28px}</style>",
        f"<h1>Qwen3-TTS trial</h1><p class=m>{html.escape(data['story'])} · {torch.cuda.get_device_name(0)} · models loaded in {load_s:.0f}s<br>"
        f"<b>Overall: {speed:.1f}× faster than spoken</b> ({total_audio:.0f}s of speech made in {total_took:.0f}s, designed samples not counted)</p>"]
for voice, entries in rows:
    page.append(f"<h2>{html.escape(voice['name'])}</h2><p class=m>Designed from: {html.escape(voice['instruct'])}</p>")
    for label, text, name, sec, took in entries:
        page.append(f"<p><b>{label}</b> · {sec:.1f}s made in {took:.1f}s<br>{html.escape(text)}<br><audio controls preload=none src='{base}{name}'></audio></p>")
bucket.blob(f"{PREFIX}/index.html").upload_from_string("\n".join(page), content_type="text/html; charset=utf-8")
log("LISTEN:", f"{base}index.html")
