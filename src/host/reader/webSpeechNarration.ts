import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractReaderVisibleAudioText } from '@seihouse/sen/audio';
import type { ReaderChapter } from '@seihouse/sen/contracts';
import type { NarrationPlayback } from '@seihouse/sen/reader-runtime';

export type NarrationVoiceRole = 'narrator' | 'protagonist' | 'side';
export interface NarrationChunk { paragraphIndex: number; text: string; role: NarrationVoiceRole }

const MAX_CHUNK_LENGTH = 240;
export const NARRATION_SETTINGS_STORAGE_KEY = 'seihouse.reader.narration.v1';

/** Sentence-sized pieces: long utterances are cut off by several browser speech engines. */
function splitIntoSpeakable(text: string): string[] {
  const sentences = text.split(/(?<=[.!?…。！？])\s+/).map(part => part.trim()).filter(Boolean);
  const pieces: string[] = [];
  let current = '';
  const push = (value: string) => { if (value) pieces.push(value); };
  for (const sentence of sentences) {
    if (sentence.length > MAX_CHUNK_LENGTH) {
      push(current); current = '';
      let rest = sentence;
      while (rest.length > MAX_CHUNK_LENGTH) {
        const cut = Math.max(rest.lastIndexOf(', ', MAX_CHUNK_LENGTH), rest.lastIndexOf(' ', MAX_CHUNK_LENGTH));
        const end = cut > MAX_CHUNK_LENGTH / 2 ? cut + 1 : MAX_CHUNK_LENGTH;
        push(rest.slice(0, end).trim());
        rest = rest.slice(end).trim();
      }
      current = rest;
    } else if (current && current.length + 1 + sentence.length > MAX_CHUNK_LENGTH) {
      push(current); current = sentence;
    } else current = current ? `${current} ${sentence}` : sentence;
  }
  push(current);
  return pieces;
}

/**
 * What narration speaks, in reading order, addressed by the same paragraph
 * index the Reader renders so highlighting and focus follow the voice. It
 * speaks the reader-visible text only (hidden cue tags removed), and the
 * displayed translation when one is on screen.
 */
export function buildNarrationChunks(chapter: Pick<ReaderChapter, 'blocks' | 'generatedContent'>, translatedContent: string | null): NarrationChunk[] {
  const paragraphs: Array<{ paragraphIndex: number; text: string; role: NarrationVoiceRole }> = [];
  const blocks = chapter.blocks ?? [];
  if (blocks.length) {
    const readable = blocks.map((block, index) => ({ block, index, text: extractReaderVisibleAudioText(block.text || '').cleanText.trim() }))
      .filter(item => item.text);
    const translated = translatedContent?.split('\n\n').map(part => part.trim()).filter(Boolean);
    readable.forEach((item, position) => {
      const role: NarrationVoiceRole = item.block.type !== 'dialogue' ? 'narrator'
        : item.block.metadata?.speakerRole === 'main_character' ? 'protagonist' : 'side';
      const text = translated ? translated[position] : item.text;
      if (text) paragraphs.push({ paragraphIndex: item.index, text, role });
    });
  } else {
    (translatedContent ?? chapter.generatedContent ?? '').split('\n\n').forEach((paragraph, index) => {
      const text = extractReaderVisibleAudioText(paragraph).cleanText.trim();
      if (text) paragraphs.push({ paragraphIndex: index, text, role: 'narrator' });
    });
  }
  return paragraphs.flatMap(paragraph => splitIntoSpeakable(paragraph.text).map(text => ({ ...paragraph, text })));
}

interface NarrationSettings { rate: number; pitch: number; volume: number; narrator: string; protagonist: string; side: string }
const DEFAULT_SETTINGS: NarrationSettings = { rate: 1, pitch: 1, volume: 1, narrator: '', protagonist: '', side: '' };

function readSettings(): NarrationSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(NARRATION_SETTINGS_STORAGE_KEY) ?? '{}') as Partial<NarrationSettings>;
    const number = (value: unknown, fallback: number, min: number, max: number) =>
      typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const text = (value: unknown) => typeof value === 'string' ? value : '';
    return {
      rate: number(parsed.rate, 1, 0.5, 2), pitch: number(parsed.pitch, 1, 0, 2), volume: number(parsed.volume, 1, 0, 1),
      narrator: text(parsed.narrator), protagonist: text(parsed.protagonist), side: text(parsed.side),
    };
  } catch { return DEFAULT_SETTINGS; }
}

const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Browser speech narration for the Reader: play, pause, resume, stop, voices, and speed. */
export function useWebSpeechNarration({ selectedChapter, activeTranslationContent }: {
  selectedChapter: ReaderChapter; activeTranslationContent: string | null;
}): NarrationPlayback {
  // Keyed on spoken content, so rebuilding an unchanged chapter never interrupts narration.
  const { blocks, generatedContent, number } = selectedChapter;
  const contentKey = useMemo(() => JSON.stringify([
    number, generatedContent ?? '', activeTranslationContent,
    (blocks ?? []).map(block => [block.type, block.text, block.metadata?.speakerRole]),
  ]), [blocks, generatedContent, number, activeTranslationContent]);
  const chunks = useMemo(
    () => buildNarrationChunks({ blocks, generatedContent }, activeTranslationContent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentKey],
  );
  const [settings, setSettings] = useState(readSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingText, setIsPlaying] = useState(false);
  const [isPausedText, setIsPaused] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const run = useRef(0);
  const live = useRef({ chunks, settings, voices, index: 0 });
  live.current.chunks = chunks;
  live.current.settings = settings;
  live.current.voices = voices;

  useEffect(() => {
    try { localStorage.setItem(NARRATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings)); } catch { /* advisory */ }
  }, [settings]);

  useEffect(() => {
    if (!speechAvailable()) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);

  // Once voices exist, an unset or uninstalled choice falls back to the browser default.
  useEffect(() => {
    if (!voices.length) return;
    const fallback = (voices.find(voice => voice.default) ?? voices[0]).voiceURI;
    const known = (uri: string) => voices.some(voice => voice.voiceURI === uri);
    setSettings(current => (known(current.narrator) && known(current.protagonist) && known(current.side)) ? current : {
      ...current,
      narrator: known(current.narrator) ? current.narrator : fallback,
      protagonist: known(current.protagonist) ? current.protagonist : fallback,
      side: known(current.side) ? current.side : fallback,
    });
  }, [voices]);

  const speakFrom = useCallback((index: number) => {
    if (!speechAvailable()) return;
    const token = ++run.current;
    window.speechSynthesis.cancel();
    const step = (position: number) => {
      if (token !== run.current) return;
      const chunk = live.current.chunks[position];
      if (!chunk) { setIsPlaying(false); setIsPaused(false); setCurrentChunkIndex(0); live.current.index = 0; return; }
      live.current.index = position;
      setCurrentChunkIndex(position);
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const { settings: current, voices: available } = live.current;
      const voiceUri = chunk.role === 'protagonist' ? current.protagonist : chunk.role === 'side' ? current.side : current.narrator;
      const voice = available.find(item => item.voiceURI === voiceUri);
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
      utterance.rate = current.rate;
      utterance.pitch = current.pitch;
      utterance.volume = current.volume;
      utterance.onend = () => step(position + 1);
      utterance.onerror = event => {
        if (token !== run.current || event.error === 'interrupted' || event.error === 'canceled') return;
        step(position + 1);
      };
      window.speechSynthesis.speak(utterance);
    };
    setIsPlaying(true);
    setIsPaused(false);
    step(index);
  }, []);

  const handleStopSpeaking = useCallback(() => {
    run.current += 1;
    if (speechAvailable()) window.speechSynthesis.cancel();
    live.current.index = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentChunkIndex(0);
  }, []);

  const handleTogglePlayback = useCallback(() => {
    if (!speechAvailable() || !live.current.chunks.length) return;
    if (isPlayingText && !isPausedText) {
      // Pausing cancels the utterance; resuming restarts that sentence, which is
      // reliable across engines where native pause/resume is not.
      run.current += 1;
      window.speechSynthesis.cancel();
      setIsPaused(true);
      return;
    }
    speakFrom(isPausedText ? live.current.index : 0);
  }, [isPausedText, isPlayingText, speakFrom]);

  // A different chapter or displayed language is different speech: stop.
  useEffect(() => handleStopSpeaking, [chunks, handleStopSpeaking]);

  const update = <K extends keyof NarrationSettings>(key: K) => (value: NarrationSettings[K] | ((previous: NarrationSettings[K]) => NarrationSettings[K])) =>
    setSettings(current => ({ ...current, [key]: typeof value === 'function' ? (value as (previous: NarrationSettings[K]) => NarrationSettings[K])(current[key]) : value }));

  return {
    isPlayingText,
    isPausedText,
    speechRate: settings.rate,
    speechPitch: settings.pitch,
    speechVolume: settings.volume,
    availableVoices: voices.map(voice => ({ voiceURI: voice.voiceURI, name: `${voice.name} (${voice.lang})` })),
    selectedVoiceURI: settings.narrator,
    selectedDialogueVoiceURI: settings.protagonist,
    selectedSideVoiceURI: settings.side,
    activeChunks: chunks,
    currentChunkIndex,
    setSpeechRate: update('rate'),
    setSpeechPitch: update('pitch'),
    setSpeechVolume: update('volume'),
    setSelectedVoiceURI: update('narrator'),
    setSelectedDialogueVoiceURI: update('protagonist'),
    setSelectedSideVoiceURI: update('side'),
    handleTogglePlayback,
    handleStopSpeaking,
    currentNarratedBlockIndex: isPlayingText ? chunks[currentChunkIndex]?.paragraphIndex ?? null : null,
  };
}
