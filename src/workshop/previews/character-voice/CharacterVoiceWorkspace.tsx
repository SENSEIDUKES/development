import { useMemo, useState } from 'react';
import { CharacterCard } from '../../../components/reader-codex/shared/codex/character-cards/CharacterCard';
import { CodexProvider } from '../../../components/reader-codex/shared/codex/CodexContext';
import {
  useCodexVoiceQuote,
  type CodexVoiceQuoteState,
  type CodexVoiceResolution,
} from '../../../components/reader-codex/shared/hooks/useCodexVoiceQuote';
import type { Character, Story } from '../../../components/reader-codex/shared/types';
import { CODEX_VOICE_ARTIFACT_VERSION } from '../../../audio/voiceArtifacts';
import '../../../components/reader-codex/shared/reader-codex.css';

/**
 * Inspectable Character Portrait voice interaction.
 *
 * Every state is reachable here without an already-generated clip and without
 * spending a real ElevenLabs call: the workspace substitutes the server
 * request with a local stub. The live path is identical — the same card, the
 * same hook, the same shared audio owner — only the network call is stubbed.
 */

const SAMPLE_ARTIFACT_URL = 'https://celestialaudio.seihouse.org/voice/v1/'
  + '0000000000000000000000000000000000000000000000000000000000000000.mp3';

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

type StubOutcome = 'succeeds' | 'fails' | 'slow';

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
  const [outcome, setOutcome] = useState<StubOutcome>('succeeds');
  const [character, setCharacter] = useState<Character>(baseCharacter);
  const [log, setLog] = useState<string[]>([]);

  const requestVoice = useMemo(() => async (target: Character): Promise<CodexVoiceResolution> => {
    setLog(current => [`Server call for ${target.name} (${new Date().toLocaleTimeString()})`, ...current]);
    if (outcome === 'slow') await new Promise(resolve => { window.setTimeout(resolve, 4000); });
    if (outcome === 'fails') throw new Error('The voice service is unavailable right now.');
    return {
      characterId: target.id,
      voiceKey: 'ancient-master-female',
      artifact: {
        publicUrl: SAMPLE_ARTIFACT_URL,
        quote: target.signatureQuote ?? '',
        voiceKey: 'ancient-master-female',
        model: 'eleven_multilingual_v2',
        artifactVersion: CODEX_VOICE_ARTIFACT_VERSION,
      },
    };
  }, [outcome]);

  const { handleQuoteTap, voiceStatus } = useCodexVoiceQuote({
    requestVoice,
    onVoiceResolved: resolution => {
      setCharacter(current => ({
        ...current,
        voiceKey: resolution.voiceKey,
        voiceClip: resolution.artifact,
      }));
      setLog(current => ['Artifact persisted on the Codex Character', ...current]);
    },
  });
  const status = voiceStatus(character);

  return (
    <main className="min-h-screen bg-[#04060d] px-4 py-8 text-slate-200 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <section className="w-full max-w-sm">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-200/70">
            Development-only example
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
            Inspect the interaction
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            The server request is stubbed locally, so no provider call is made and no clip needs
            to exist beforehand.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(['succeeds', 'slow', 'fails'] as StubOutcome[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setOutcome(option)}
                className={`workshop-touch-target rounded-full border px-4 py-2 text-xs ${
                  outcome === option
                    ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                    : 'border-white/15 text-slate-300 hover:bg-white/10'
                }`}
              >
                Server {option}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCharacter(baseCharacter);
                setLog(current => ['Stored artifact cleared', ...current]);
              }}
              className="workshop-touch-target rounded-full border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/10"
            >
              Clear stored artifact
            </button>
            <button
              type="button"
              onClick={() => {
                setCharacter(current => ({
                  ...current,
                  signatureQuote: 'The gate remembers who closed it.',
                }));
                setLog(current => ['Signature quote changed — the old recording is invalid', ...current]);
              }}
              className="workshop-touch-target rounded-full border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/10"
            >
              Change the quote
            </button>
            <button
              type="button"
              onClick={() => setCharacter(current => ({ ...current, signatureQuote: undefined }))}
              className="workshop-touch-target rounded-full border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/10"
            >
              Remove the quote
            </button>
          </div>

          <dl className="mt-5 space-y-2 text-xs">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">State</dt>
              <dd className="text-cyan-100">{status.state}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">Note</dt>
              <dd className="text-slate-300">{stateNotes[status.state]}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-mono uppercase tracking-wider text-slate-500">Stored</dt>
              <dd className="break-all text-slate-400">
                {character.voiceClip?.publicUrl ?? 'no artifact yet'}
              </dd>
            </div>
          </dl>

          <h3 className="mt-5 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">
            Server calls
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {log.length === 0 ? <li>None yet. Opening or scrolling never generates audio.</li> : null}
            {log.slice(0, 8).map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}
          </ul>
        </section>
      </div>
    </main>
  );
}
