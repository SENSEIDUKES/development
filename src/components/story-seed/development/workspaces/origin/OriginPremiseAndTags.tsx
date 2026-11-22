import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Feather } from 'lucide-react';
import { STORY_PREMISE_MAX_LENGTH, STORY_TAG_LIMIT, type StoryStyle } from '@seihouse/sen/story-seed';
import { CURATED_PREMISE_EXAMPLES, normalizeStoryTagIdentity } from '../../constants';
import { useStoryTagMeaning } from './useStoryTagMeaning';
import { OriginTagEditor } from './OriginTagEditor';
import { SeedPart } from '../../creator/SeedPart';
import { updateStoryTags, type UpdateSeed } from '../../seedState';
import { NarrativeDragonCycleIcon as LibraryDragonCycleIcon, NarrativeTextArea as LibraryTextArea } from '@seihouse/sen/presentation';

const TAG_LIMIT = STORY_TAG_LIMIT;
const TAG_LIMIT_MESSAGE = `Fated limit reached. Only up to ${TAG_LIMIT} celestial tags can be woven into the universe.`;
const ALL_CURATED_PREMISE_EXAMPLES = Object.values(CURATED_PREMISE_EXAMPLES).flat();

interface OriginPremiseAndTagsProps {
  premise: string;
  genre?: string;
  storyTags: string[];
  selectedStyle?: StoryStyle;
  onPremiseChange: (premise: string) => void;
  updateSeed: UpdateSeed;
  beforeTags?: ReactNode;
}

export const OriginPremiseAndTags = ({
  premise,
  genre,
  storyTags,
  selectedStyle,
  onPremiseChange,
  updateSeed,
  beforeTags,
}: OriginPremiseAndTagsProps) => {
  const [tagLimitError, setTagLimitError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [cycleRotation, setCycleRotation] = useState(0);
  const premiseBank = selectedStyle
    ? CURATED_PREMISE_EXAMPLES[selectedStyle]
    : ALL_CURATED_PREMISE_EXAMPLES;
  const premiseExample = premiseBank[exampleIndex % premiseBank.length];
  const [tagSearch, setTagSearch] = useState('');
  const meaning = useStoryTagMeaning(premise, storyTags, tagSearch);

  useEffect(() => setExampleIndex(0), [selectedStyle]);

  const handleCyclePremise = useCallback(() => {
    setExampleIndex(index => (index + 1) % premiseBank.length);
    setCycleRotation(rotation => rotation + 360);
  }, [premiseBank.length]);

  const addTag = useCallback((tag: string) => {
    if (storyTags.some(existing => normalizeStoryTagIdentity(existing) === normalizeStoryTagIdentity(tag))) return false;
    if (storyTags.length >= TAG_LIMIT) {
      setTagLimitError(TAG_LIMIT_MESSAGE);
      return false;
    }
    setTagLimitError(null);
    updateSeed(updateStoryTags(previous => [...previous, tag]));
    return true;
  }, [storyTags, updateSeed]);

  return (
    <>
      <SeedPart id="synopsis">
        <LibraryTextArea
          id="core-premise-input"
          label="Synopsis"
          icon={Feather}
          required
          maxLength={STORY_PREMISE_MAX_LENGTH}
          value={premise}
          onChange={onPremiseChange}
          rows={6}
          placeholder={premiseExample}
          helpText={premise.trim() ? undefined : 'Example shown as ghost text — use the dragon to view another.'}
          rightElement={premise.trim() ? undefined : (
            <button
              type="button"
              onClick={handleCyclePremise}
              aria-label="Show another example synopsis"
              className="story-seed-touch-target inline-flex h-10 w-10 items-center justify-center rounded-full border border-portal/35 bg-portal/10 text-portal transition-all hover:border-portal hover:bg-portal/15 hover:shadow-[0_0_12px_rgba(4,172,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 active:scale-95"
            >
              <span
                className="inline-flex items-center justify-center transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none"
                style={{ transform: `rotate(${cycleRotation}deg)` }}
              >
                <LibraryDragonCycleIcon size={18} />
              </span>
            </button>
          )}
        />
      </SeedPart>
      {beforeTags}

      <SeedPart id="tags">
        <OriginTagEditor
          premise={premise}
          genre={genre}
          storyTags={storyTags}
          selectedStyle={selectedStyle}
          meaning={meaning}
          search={tagSearch}
          onSearchChange={setTagSearch}
          updateSeed={updateSeed}
          addTag={addTag}
          tagLimitError={tagLimitError}
          setTagLimitError={setTagLimitError}
        />
      </SeedPart>
    </>
  );
};
