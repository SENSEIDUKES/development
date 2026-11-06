import { OriginIcon } from '../seedSections';
import { memo, type Dispatch, type SetStateAction } from 'react';
import {
  CalendarDays,
  Check,
  Drama,
  Feather,
  FileText,
  Info,
  Landmark,
  MapPin,
  Tag,
} from 'lucide-react';
import { LibraryPowerSystemIcon as SENPowerSystemIcon, LibraryWorldIdentityIcon as SENWorldIdentityIcon } from '@seihouse/library-ui';
import {
  type StorySeedInput,
  type WorldBlueprint,
} from '@seihouse/sen/story-seed';
import { STORY_PREMISE_MAX_LENGTH, STORY_TAG_LIMIT, type StorySeedStoryRequired } from '@seihouse/sen/story-seed';
import { STORY_STYLE_OPTIONS, type StoryStyle } from '@seihouse/sen/story-seed';
import {
  NarrativeButton as LibraryButton,
  NarrativePanel as LibraryPanel,
  NarrativeTextArea as LibraryTextArea,
  NarrativeTextBox as LibraryTextBox,
} from '@seihouse/sen/presentation';
import {
  BlueprintSectionHeading,
  EditableChip,
  FieldLabelRow,
  MetadataChip,
} from './BlueprintDossierPrimitives';
import { formatBlueprintDate } from './createBlueprintMarkdown';
import { LibraryProfileIcon as SENProfileIcon } from '@seihouse/library-ui';
import { type UpdateSeed } from '../seedState';
import { AbilitiesFields } from '../workspaces/AbilitiesWorkspace';
import { PowerSystemFields } from '../workspaces/PowerSystemWorkspace';

interface BlueprintHeaderSectionProps {
  blueprintVersion?: WorldBlueprint['blueprintVersion'];
  title?: WorldBlueprint['title'];
  creator?: WorldBlueprint['creator'];
  status?: WorldBlueprint['status'];
  createdAt?: WorldBlueprint['createdAt'];
  updatedAt?: WorldBlueprint['updatedAt'];
  onTitleChange: (title: string) => void;
}

export const BlueprintHeaderSection = memo(({
  blueprintVersion,
  title,
  creator,
  status,
  createdAt,
  updatedAt,
  onTitleChange,
}: BlueprintHeaderSectionProps) => (
  <LibraryPanel as="header" padding="md" className="bp-cover">
    {/* The dossier cover: its eyebrow and version, the title, then its record. */}
    <div className="flex items-center justify-between gap-3">
      <span className="font-sc text-[11px] font-bold uppercase tracking-[0.3em] text-[#CDB271]">World Blueprint</span>
      <MetadataChip gold>{blueprintVersion || 'v1.0'}</MetadataChip>
    </div>

    <div className="blueprint-title-field mt-4">
      <LibraryTextBox
        id="blueprint-story-title"
        label="Title"
        rightElement={<EditableChip />}
        value={title || ''}
        onChange={onTitleChange}
        placeholder="Give your story a title"
        autoComplete="off"
      />
    </div>

    <div className="bp-record mt-4">
      {creator && <MetadataChip icon={SENProfileIcon}>Creator: {creator}</MetadataChip>}
      {status && <MetadataChip icon={Info}>Status: {status}</MetadataChip>}
      {createdAt && <MetadataChip icon={CalendarDays}>Created: {formatBlueprintDate(createdAt)}</MetadataChip>}
      {updatedAt && <MetadataChip icon={CalendarDays}>Updated: {formatBlueprintDate(updatedAt)}</MetadataChip>}
    </div>
  </LibraryPanel>
));

BlueprintHeaderSection.displayName = 'BlueprintHeaderSection';

interface BlueprintOriginSectionProps {
  origin: StorySeedStoryRequired;
  storyTagCount: number;
  tagLimitError: string | null;
  onUpdateOrigin: (patch: Partial<StorySeedStoryRequired>) => void;
  onUpdateStoryTags: (value: string) => void;
}

export const BlueprintOriginSection = memo(({
  origin,
  storyTagCount,
  tagLimitError,
  onUpdateOrigin,
  onUpdateStoryTags,
}: BlueprintOriginSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-origin-heading" padding="md">
    <BlueprintSectionHeading
      id="blueprint-origin-heading"
      icon={OriginIcon}
      title="Origin Snapshot"
      tagline="Creator-authored Origin inputs. Changes here update the same Story Seed values used for generation."
    />

    <div className="mt-5 space-y-5">
      <div className="blueprint-key-field">
        <LibraryTextArea
          id="blueprint-origin-premise"
          label="Synopsis"
          rightElement={<EditableChip />}
          icon={Feather}
          value={origin.premise}
          onChange={premise => onUpdateOrigin({ premise })}
          maxLength={STORY_PREMISE_MAX_LENGTH}
          rows={5}
          className="font-serif leading-relaxed text-[#dfd8cf]"
          placeholder="The premise written in Origin..."
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <LibraryTextBox
          id="blueprint-origin-genre"
          label="Genre"
          rightElement={<EditableChip />}
          icon={Drama}
          value={origin.genre}
          onChange={genre => onUpdateOrigin({ genre })}
          placeholder="e.g. Xianxia, LitRPG / System"
        />

        <div>
          <FieldLabelRow htmlFor="blueprint-origin-style">Style / Novel Tradition</FieldLabelRow>
          <div className="glass-select">
            <select
              id="blueprint-origin-style"
              value={origin.style}
              onChange={(event) => onUpdateOrigin({ style: event.target.value as StoryStyle | '' })}
              className="glass-field min-h-[2.75rem] px-4 py-2.5 text-base"
              data-complete={origin.style ? 'true' : undefined}
            >
              <option value="">Choose a novel tradition</option>
              {STORY_STYLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <LibraryTextArea
        id="blueprint-origin-tags"
        label={`Story Tags (${storyTagCount} / ${STORY_TAG_LIMIT})`}
        rightElement={<EditableChip />}
        icon={Tag}
        value={origin.storyTags.join('\n')}
        onChange={onUpdateStoryTags}
        rows={3}
        className="font-mono"
        placeholder="One Story Tag per line"
        error={tagLimitError ?? undefined}
      />
    </div>
  </LibraryPanel>
));

BlueprintOriginSection.displayName = 'BlueprintOriginSection';

interface BlueprintWorldSettingSectionProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/**
 * World setting: the one World card (what kind of world it is, who rules, the
 * ladder, the laws, the era) and the abilities. What kind of world it is and
 * who rules it live on the card, not as text beside it (SENSEI, 2026-11-06).
 */
export const BlueprintWorldSettingSection = memo(({
  seed,
  updateSeed,
}: BlueprintWorldSettingSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-world-setting-heading" padding="md">
    <BlueprintSectionHeading
      id="blueprint-world-setting-heading"
      icon={SENWorldIdentityIcon}
      title="World Setting"
      tagline="The world card: what kind of world it is, who rules, and the rules that govern it. Edits save to the Story Seed."
    />

    <div className="mt-5 space-y-5">
      <AbilitiesFields seed={seed} updateSeed={updateSeed} />
      <PowerSystemFields seed={seed} updateSeed={updateSeed} />
    </div>
  </LibraryPanel>
));

BlueprintWorldSettingSection.displayName = 'BlueprintWorldSettingSection';

