import { useState } from 'react';
import { CharacterCard } from '../../../components/reader-codex/shared/codex/character-cards/CharacterCard';
import { CodexProvider } from '../../../components/reader-codex/shared/codex/CodexContext';
import {
  useCodexVoiceQuote,
  type CodexVoiceQuoteState,
} from '../../../components/reader-codex/shared/hooks/useCodexVoiceQuote';
import type { Character, Story } from '../../../components/reader-codex/shared/types';
import '../../../components/reader-codex/shared/reader-codex.css';

/**
 * Live Character Portrait voice interaction.
 *
 * This uses the same real endpoint as the Reader Codex. A tap on the
 * signature quote calls ElevenLabs through the server, stores the resulting
 * artifact in R2, and reuses that artifact on later taps.
 */

const baseCharacter = {
  id: 'workshop-character-mei-lin',
  name: 'Mei Lin',
  role: 'Ashen Sword Saint',
  status: 'alive',
  powerLevel: 'Core Formation — Peak',
  relationshipToMC: 'Unwilling ally',
  description: 'Master of the Ashen Sword Technique, sworn to the collapsed gate.',
  faction: 'Ashen Sword Pavilion',
  signatureQuote: 'A promise is only a blade held by its edge.',
} as Character;

const codexValue = {
  memory: { characters: [baseCharacter] },
  arcs: [],
  activeStory: { id: 'workshop-story', currentChapterNumber: 1 },
  mcName: 'Li Wei',
  onUpdateMemory: () => {},
  updateStoryFields: async () => {},
  pushNotification: () => {},
  getPowerRankScore: () => ({ score: 42, title: 'Core Formation' }),
  handleAwakenCardImage: async () => {},
  handleRevertImage: () => {},
  previews: {},
  setPreviews: () => {},
  generatingId: null,
  openEntryContextEditor: () => {},
} as unknown as Parameters<typeof CodexProvider>[0]['value'];

const stateNotes: Record<CodexVoiceQuoteState, string> = {
  ready: 'No recording exists yet. The control is still offered — the first tap is what creates it.',
  generating: 'The server is resolving the voice, generating the quote once, and storing it in R2.',
  playing: 'The stored artifact is playing through the one shared audio owner.',
  stopping: 'The shared audio owner is releasing this Character’s track.',
  unavailable: 'No stored signature quote, or the Character is not an eligible speaking identity.',
  error: 'The attempt failed. The control stays tappable so the reader can retry.',
};

export function CharacterVoiceWorkspace() {
  const [character, setCharacter] = useState<Character>(baseCharacter);

  const { handleQuoteTap, voiceStatus } = useCodexVoiceQuote({
    onVoiceResolved: resolution => {
      setCharacter(current => ({
        ...current,
        voiceKey: resolution.voiceKey,
        voiceClip: resolution.artifact,
      }));
    },
  });
  const status = voiceStatus(character);
  const statusNote = status.state === 'error' && status.message
    ? status.message
    : stateNotes[status.state];

  return (
    <main className="min-h-screen bg-[#04060d] px-4 py-8 text-slate-200 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <section className="w-full max-w-sm">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-200/70">
            Live development integration
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Character Voice</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The signature quote on a named, intelligent Character Portrait card. Chapter
            generation never produces this audio; only a tap here does.
          </p>
          <div className="mt-5">
            <CodexProvider value={codexValue}>
              <CharacterCard
                char={character}
                activePreview={undefined}
                activeStory={{ id: 'workshop-story', currentChapterNumber: 1 } as unknown as Story}
                cScore={{ score: 42 }}
                hasAppeared
                voiceStatus={status}
                isGenerating={false}
                canGenerate
                isFreeUserOnHubStory={false}
                onQuoteTap={handleQuoteTap}
                beginCharEdit={() => {}}
                handleAwakenCardImage={() => {}}
              />
            </CodexProvider>
          </div>
        </section>

        <section className="flex-1 rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-200/80">
            Live ElevenLabs → R2
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Pressing Hear Voice calls <code className="text-slate-300">/api/codex-voice-quote</code>.
            The first successful tap generates and stores this Character’s quote; later taps reuse
            the stored R2 artifact.
          </p>

          <dl className="mt-5 space-y-2 text-xs">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">State</dt>
              <dd className="text-cyan-100">{status.state}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">Note</dt>
              <dd className="text-slate-300">{statusNote}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">Endpoint</dt>
              <dd className="font-mono text-slate-400">/api/codex-voice-quote</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">Stored</dt>
              <dd className="break-all text-slate-400">
                {character.voiceClip?.publicUrl ?? 'no artifact yet'}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
