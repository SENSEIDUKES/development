import { useEffect, useState } from 'react';
import { ARC_LENGTH, ARC_LOOKAHEAD_TEXT_LIMIT, MAX_ARC_GOALS, STORY_LENGTH_ARCS } from '@seihouse/sen/arc-goals';
import { Compass, Hourglass, Milestone, Target, Pin } from 'lucide-react';
import { HARD_PIN_LIMIT, HARD_PIN_TEXT_LIMIT, type StorySeedArcGoal, type StorySeedInput } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { patchWorldFoundations, worldFoundations, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { SeedPart } from '../creator/SeedPart';
import { SeedNote, SeedSectionFrame } from './SeedSectionFrame';
import { FunSettingsPanel } from './FunSettingsPanel';

interface ArcWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  /** The Blueprint review edits Arc 1's goals in its own Arc 1 section instead. */
  showArcGoals?: boolean;
  /** The Blueprint review edits the Story Length beside Arc 1's goals instead. */
  showStoryLength?: boolean;
}

/** The written goals as the Seed keeps them: blank rows dropped, chapters only when whole. */
const goalsFromDrafts = (drafts: ReadonlyArray<{ text: string; chapters: string }>): StorySeedArcGoal[] => drafts.flatMap(draft => {
  const text = draft.text.trim();
  if (!text) return [];
  const chapters = Number(draft.chapters.trim());
  return [{ text, ...(draft.chapters.trim() && Number.isInteger(chapters) && chapters >= 1 && chapters <= ARC_LENGTH ? { chapters } : {}) }];
});

const arcsLabel = (count: number) => `${count} ${count === 1 ? 'arc' : 'arcs'}`;

/** The typed Story Length: a length, blank (`undefined`), or `null` while the text is not a length yet. */
const readStoryLength = (value: string): number | undefined | null => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const count = Number(trimmed);
  return Number.isInteger(count) && count >= STORY_LENGTH_ARCS.min && count <= STORY_LENGTH_ARCS.max ? count : null;
};

export const ArcWorkspace = ({ seed, updateSeed, showArcGoals = true, showStoryLength = true }: ArcWorkspaceProps) => {
  const section = getSeedSection('arc');
  const savedLength = seed.story.optional.arcCount;
  const [lengthText, setLengthText] = useState(() => savedLength === undefined ? '' : String(savedLength));
  // A length saved elsewhere (the Blueprint review, an import) replaces the
  // typed text; text that already reads as the saved length stays as typed.
  useEffect(() => {
    setLengthText(current => readStoryLength(current) === savedLength ? current : savedLength === undefined ? '' : String(savedLength));
  }, [savedLength]);
  const typedLength = readStoryLength(lengthText);
  // Only a whole length is saved; while the text is not one, the Seed keeps the last.
  const changeLength = (value: string) => {
    setLengthText(value);
    const count = readStoryLength(value);
    if (count === null) return;
    updateSeed(current => {
      const { arcCount: _previous, ...optional } = current.story.optional;
      return { ...current, story: { ...current.story, optional: count === undefined ? optional : { ...optional, arcCount: count } } };
    });
  };
  const savedPins = JSON.stringify((seed.story.optional.hardPins ?? []).map(pin => pin.text));
  const [pinDrafts, setPinDrafts] = useState<string[]>(() => JSON.parse(savedPins));
  useEffect(() => {
    setPinDrafts(current => JSON.stringify(current.map(text => text.trim()).filter(Boolean)) === savedPins ? current : JSON.parse(savedPins));
  }, [savedPins]);
  const updatePin = (index: number, text: string) => {
    const next = Array.from({ length: HARD_PIN_LIMIT }, (_, i) => i === index ? text : (pinDrafts[i] ?? ''));
    setPinDrafts(next);
    updateSeed(current => ({ ...current, story: { ...current.story, optional: {
      ...current.story.optional, hardPins: next.map(text => text.trim()).filter(Boolean).map(text => ({ text })),
    } } }));
  };
  // Arc 1's goals: the wording and, if the creator wants, the chapters each takes.
  const savedGoals = JSON.stringify(seed.story.optional.arcOneGoals ?? []);
  const [goalDrafts, setGoalDrafts] = useState<Array<{ text: string; chapters: string }>>(() =>
    (JSON.parse(savedGoals) as StorySeedArcGoal[]).map(goal => ({ text: goal.text, chapters: goal.chapters === undefined ? '' : String(goal.chapters) })));
  useEffect(() => {
    setGoalDrafts(current => JSON.stringify(goalsFromDrafts(current)) === savedGoals ? current
      : (JSON.parse(savedGoals) as StorySeedArcGoal[]).map(goal => ({ text: goal.text, chapters: goal.chapters === undefined ? '' : String(goal.chapters) })));
  }, [savedGoals]);
  const updateGoal = (index: number, patch: Partial<{ text: string; chapters: string }>) => {
    const next = Array.from({ length: MAX_ARC_GOALS }, (_, i) => ({ ...{ text: '', chapters: '' }, ...goalDrafts[i], ...(i === index ? patch : {}) }));
    setGoalDrafts(next);
    const goals = goalsFromDrafts(next);
    updateSeed(current => {
      const { arcOneGoals: _previous, ...optional } = current.story.optional;
      return { ...current, story: { ...current.story, optional: goals.length ? { ...optional, arcOneGoals: goals } : optional } };
    });
  };
  const lastWrittenGoal = goalDrafts.reduce((last, goal, index) => goal.text.trim() ? index : last, -1);
  const visibleGoals = Math.min(MAX_ARC_GOALS, lastWrittenGoal + 2);
  const givenChapters = goalsFromDrafts(goalDrafts).reduce((sum, goal) => sum + (goal.chapters ?? 0), 0);
  // Where Arcs 2 and 3 head, one line each.
  const direction = (arcNumber: number) => seed.story.optional.arcLookahead?.find(entry => entry.arcNumber === arcNumber)?.direction ?? '';
  const updateDirection = (arcNumber: number, value: string) => updateSeed(current => {
    const others = (current.story.optional.arcLookahead ?? []).filter(entry => entry.arcNumber !== arcNumber);
    const lines = [...others, ...(value.trim() ? [{ arcNumber, direction: value }] : [])].sort((a, b) => a.arcNumber - b.arcNumber);
    const { arcLookahead: _previous, ...optional } = current.story.optional;
    return { ...current, story: { ...current.story, optional: lines.length ? { ...optional, arcLookahead: lines } : optional } };
  });
  // Pins appear one at a time: every written pin plus one empty slot, up to the limit.
  const lastWrittenPin = pinDrafts.reduce((last, text, index) => text.trim() ? index : last, -1);
  const visiblePins = Math.min(HARD_PIN_LIMIT, lastWrittenPin + 2);
  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      {/* A phone shows one part at a time (SeedPart): Ending, Goals, Hard Pins, Fun Settings. */}
      <SeedPart id="ending">
        <div className="space-y-4 sm:space-y-6">
          <LibraryTextArea id="destined-ending-input" label="Destined Ending" icon={Hourglass} maxLength={1500}
            helpText={<SeedNote moreLabel="More about the Destined Ending" more="The true long-term destination of this novel. If left blank, the Library recommends a fitting ending from your Origin. You can alter this outcome later.">Where the novel ultimately ends. Blank? The Library suggests one.</SeedNote>}
            value={worldFoundations(seed).destinedEnding || ''}
            onChange={value => updateSeed(patchWorldFoundations({ destinedEnding: value }))} rows={3} />
          {showStoryLength && <div>
            <LibraryTextBox id="story-length-input" label="Story Length (arcs)" icon={Milestone}
              type="number" min={STORY_LENGTH_ARCS.min} max={STORY_LENGTH_ARCS.max} step={1} inputMode="numeric"
              helpText={<SeedNote moreLabel="More about Story Length" more={`How many arcs of ${ARC_LENGTH} chapters the story takes to reach its Destined Ending. Leave it blank and the World Blueprint suggests a length you can change.`}>{`Arcs of ${ARC_LENGTH} chapters. Blank? The Blueprint suggests one.`}</SeedNote>}
              value={lengthText} invalid={typedLength === null}
              error={typedLength === null ? `Choose a whole number of arcs from ${STORY_LENGTH_ARCS.min} to ${STORY_LENGTH_ARCS.max}.` : undefined}
              onChange={changeLength} />
            {typeof typedLength === 'number' && (
              <p className="mt-2 text-xs text-neutral-400" data-testid="story-length-summary">
                {arcsLabel(typedLength)} · {(typedLength * ARC_LENGTH).toLocaleString('en-US')} chapters. Arc {typedLength}, the final arc, reaches the Destined Ending.
              </p>
            )}
          </div>}
        </div>
      </SeedPart>
      <SeedPart id="goals">
        <div className="space-y-4 sm:space-y-6">
          {showArcGoals && <section aria-labelledby="arc-one-goals-title" className="glass-panel p-4 sm:p-5">
            <h3 id="arc-one-goals-title" className="font-display text-lg text-[#DDC58A]">Arc 1 Goals</h3>
            <p className="mb-3 text-xs text-neutral-400">
              {`Up to ${MAX_ARC_GOALS}, in order. The first is what is happening when Chapter 1 opens. Chapters are optional; the Blueprint plans the rest so Arc 1 takes ${ARC_LENGTH}.`}
            </p>
            <div className="space-y-3">
              {Array.from({ length: visibleGoals }, (_, index) => (
                <div key={index} className="grid grid-cols-[1fr_6rem] gap-3">
                  <LibraryTextBox id={`arc-one-goal-${index + 1}`} label={`Goal ${index + 1}`} icon={Target}
                    value={goalDrafts[index]?.text ?? ''} onChange={value => updateGoal(index, { text: value })} />
                  <LibraryTextBox id={`arc-one-goal-${index + 1}-chapters`} label="Chapters" type="number"
                    min={1} max={ARC_LENGTH} step={1} inputMode="numeric"
                    value={goalDrafts[index]?.chapters ?? ''} onChange={value => updateGoal(index, { chapters: value })} />
                </div>
              ))}
            </div>
            {givenChapters > 0 && (
              <p className="mt-2 text-xs text-neutral-400" data-testid="arc-one-chapters-summary">
                {givenChapters > ARC_LENGTH
                  ? `These goals take ${givenChapters} chapters; Arc 1 has ${ARC_LENGTH}.`
                  : `${givenChapters} of ${ARC_LENGTH} chapters given.`}
              </p>
            )}
          </section>}
          {showArcGoals && <section aria-labelledby="arc-directions-title" className="glass-panel p-4 sm:p-5">
            <h3 id="arc-directions-title" className="font-display text-lg text-[#DDC58A]">Where the Story Heads</h3>
            <p className="mb-3 text-xs text-neutral-400">One line each for Arc 2 and Arc 3. Blank? The Blueprint writes one.</p>
            <div className="space-y-3">
              {[2, 3].map(arcNumber => (
                <LibraryTextBox key={arcNumber} id={`arc-direction-${arcNumber}`} label={`Arc ${arcNumber}`} icon={Compass}
                  maxLength={ARC_LOOKAHEAD_TEXT_LIMIT} value={direction(arcNumber)} onChange={value => updateDirection(arcNumber, value)} />
              ))}
            </div>
          </section>}
        </div>
      </SeedPart>
      <SeedPart id="pins">
        <section aria-labelledby="arc-hard-pins-title" className="glass-panel p-4 sm:p-5">
          <h3 id="arc-hard-pins-title" className="font-display text-lg text-[#DDC58A]">Hard Pins</h3>
          <p className="mb-3 text-xs text-neutral-400">Promises the story must keep on the way to its ending. Up to {HARD_PIN_LIMIT}, all optional.</p>
          <div className="space-y-3">
            {Array.from({ length: visiblePins }, (_, index) => (
              <LibraryTextBox key={index} id={`hard-pin-${index + 1}`} label={`Hard Pin ${index + 1}`} icon={Pin}
                maxLength={HARD_PIN_TEXT_LIMIT} value={pinDrafts[index] ?? ''} onChange={value => updatePin(index, value)} />
            ))}
          </div>
        </section>
      </SeedPart>
      <SeedPart id="fun"><FunSettingsPanel seed={seed} updateSeed={updateSeed} /></SeedPart>
    </SeedSectionFrame>
  );
};
