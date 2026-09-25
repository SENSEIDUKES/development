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
  ScrollText,
  Tag,
} from 'lucide-react';
import { LibraryPowerSystemIcon as SENPowerSystemIcon, LibraryWorldIdentityIcon as SENWorldIdentityIcon } from '@seihouse/library-ui';
import {
  worldFactDetailIsCurrent,
  type StorySeedInput,
  type StorySeedWorldIdentity,
  type WorldBlueprint,
  type WorldFactDetailBasisField,
  type WorldFactDetailField,
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
import { MainCharacterFields } from '../workspaces/CharactersWorkspace';
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
  <LibraryPanel as="header" padding="lg" className="text-center">
    {/* Blueprint version pins to the cover's top-left corner; the
        remaining metadata chips stay centered under the title. */}
    <div className="flex justify-start">
      <MetadataChip gold>{blueprintVersion || 'v1.0'}</MetadataChip>
    </div>

    <div className="mt-4 flex items-center justify-center gap-3">
      <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-transparent to-[rgba(205,178,113,0.4)]" />
      <span className="font-sc text-[11px] font-bold uppercase tracking-[0.34em] text-[#CDB271]">World Blueprint</span>
      <span aria-hidden="true" className="h-px w-8 bg-gradient-to-l from-transparent to-[rgba(205,178,113,0.4)]" />
    </div>

    <div className="blueprint-title-field mx-auto mt-5 max-w-2xl">
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

    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
      icon={Feather}
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

interface BlueprintMainCharacterSectionProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  backgroundProfile: string;
  onBackgroundProfileChange: (backgroundProfile: string) => void;
}

/** Main character: every Seed field, edited on the Seed, plus the Blueprint's background prose. */
export const BlueprintMainCharacterSection = memo(({
  seed,
  updateSeed,
  backgroundProfile,
  onBackgroundProfileChange,
}: BlueprintMainCharacterSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-main-character-heading" padding="md">
    <BlueprintSectionHeading
      id="blueprint-main-character-heading"
      icon={SENProfileIcon}
      title="Main Character"
      tagline="The protagonist this blueprint builds around. Edits save to the Story Seed."
    />

    <div className="mt-5 space-y-5">
      <MainCharacterFields seed={seed} updateSeed={updateSeed} />

      <div className="blueprint-key-field">
        <LibraryTextArea
          id="blueprint-mc-profile"
          label="Generated Background"
          rightElement={<EditableChip />}
          icon={ScrollText}
          value={backgroundProfile}
          onChange={onBackgroundProfileChange}
          rows={5}
          className="leading-relaxed"
          placeholder="The Blueprint's narrative background for the main character..."
        />
      </div>
    </div>
  </LibraryPanel>
));

BlueprintMainCharacterSection.displayName = 'BlueprintMainCharacterSection';

interface BlueprintWorldSettingSectionProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  worldType: string;
  startingLocation: string;
  societyStructure: string;
  powerSystemOutline?: WorldBlueprint['powerSystemOutline'];
  onUpdateWorldIdentity: (patch: Partial<StorySeedWorldIdentity>) => void;
  onPowerSystemOutlineChange: (powerSystemOutline: string) => void;
  /** The Blueprint's generated detail beside each author-written fact, when it has one, and the fact it was written for. */
  worldFactDetails?: WorldFactDetails;
  /** An edit to a detail, which also reviews it against the fact shown above it. */
  onWorldFactDetailChange?: (field: WorldFactDetailField, value: string, fact: string) => void;
}

type WorldFactDetails = Partial<Pick<WorldBlueprint, WorldFactDetailField | WorldFactDetailBasisField>>;

/**
 * A Blueprint-owned detail under the author's fact it adds to. Absent until
 * generation writes one, and hidden while the fact is empty. A detail written
 * for an earlier version of the fact stays visible but is marked, and chapter
 * generation skips it until the author edits or keeps it.
 */
const WorldFactDetailArea = ({ id, label, field, fact, details, onChange }: {
  id: string;
  label: string;
  field: WorldFactDetailField;
  fact: string;
  details: WorldFactDetails;
  onChange?: (field: WorldFactDetailField, value: string, fact: string) => void;
}) => {
  const value = details[field];
  if (typeof value !== 'string' || !fact.trim()) return null;
  // An emptied detail has nothing written for an earlier fact.
  const current = !value.trim() || worldFactDetailIsCurrent(details, field, fact);
  return (
    <div>
      <LibraryTextArea
        id={id}
        label={label}
        rightElement={<EditableChip />}
        value={value}
        onChange={next => onChange?.(field, next, fact)}
        rows={4}
        className="leading-relaxed"
        helpText={current ? 'Generated detail that adds to the line above. Chapter generation receives both; your line stays the fact.' : undefined}
      />
      {!current && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/30 bg-amber-950/20 p-3" data-testid={`${id}-earlier`}>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-100">
            Written for an earlier version of the line above, so chapter generation skips it. Edit it to fit, or keep it as it is.
          </p>
          <LibraryButton type="button" size="sm" variant="secondary" icon={Check} aria-label={`Keep ${label} as is`}
            onClick={() => onChange?.(field, value, fact)}>
            Keep as is
          </LibraryButton>
        </div>
      )}
    </div>
  );
};

/** World setting: the Seed's world identity, abilities, and power system, plus the Blueprint's power outline prose. */
export const BlueprintWorldSettingSection = memo(({
  seed,
  updateSeed,
  worldType,
  startingLocation,
  societyStructure,
  powerSystemOutline,
  onUpdateWorldIdentity,
  onPowerSystemOutlineChange,
  worldFactDetails = {},
  onWorldFactDetailChange,
}: BlueprintWorldSettingSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-world-setting-heading" padding="md">
    <BlueprintSectionHeading
      id="blueprint-world-setting-heading"
      icon={SENWorldIdentityIcon}
      title="World Setting"
      tagline="The universe, its opening stage, and the rules that govern it. Edits save to the Story Seed."
    />

    <div className="mt-5 space-y-5">
      <div className="blueprint-key-field">
        <LibraryTextArea
          id="blueprint-world-overview"
          label="World Overview"
          rightElement={<EditableChip />}
          icon={SENWorldIdentityIcon}
          value={worldType}
          onChange={value => onUpdateWorldIdentity({ worldType: value })}
          rows={7}
          className="font-serif leading-relaxed text-[#dfd8cf]"
          placeholder="The setting, lore, and physical characteristics of this universe..."
        />
      </div>
      <WorldFactDetailArea id="blueprint-world-overview-detail" label="World Detail" field="worldOverviewDetail"
        details={worldFactDetails} fact={worldType} onChange={onWorldFactDetailChange} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <LibraryTextArea
            id="blueprint-opening-location"
            label="Opening Location"
            rightElement={<EditableChip />}
            icon={MapPin}
            value={startingLocation}
            onChange={value => onUpdateWorldIdentity({ startingLocation: value })}
            rows={5}
            className="leading-relaxed"
            placeholder="Where the story begins..."
          />
          <WorldFactDetailArea id="blueprint-opening-location-detail" label="Opening Location Detail" field="startingLocationDetail"
            details={worldFactDetails} fact={startingLocation} onChange={onWorldFactDetailChange} />
        </div>
        <div className="space-y-5">
          <LibraryTextArea
            id="blueprint-world-order"
            label="World Order"
            rightElement={<EditableChip />}
            icon={Landmark}
            value={societyStructure}
            onChange={value => onUpdateWorldIdentity({ societyStructure: value })}
            rows={5}
            placeholder="Feudal, corporate, sect-based, military rule..."
          />
          <WorldFactDetailArea id="blueprint-world-order-detail" label="World Order Detail" field="societyStructureDetail"
            details={worldFactDetails} fact={societyStructure} onChange={onWorldFactDetailChange} />
        </div>
      </div>

      <AbilitiesFields seed={seed} updateSeed={updateSeed} />
      <PowerSystemFields seed={seed} updateSeed={updateSeed} />

      <LibraryTextArea
        id="blueprint-power-outline"
        label="Power System Outline"
        rightElement={<EditableChip />}
        icon={SENPowerSystemIcon}
        value={powerSystemOutline || ''}
        onChange={onPowerSystemOutlineChange}
        rows={4}
        className="font-mono leading-relaxed"
        placeholder="Power scaling, ranks, costs, limits, magical energy..."
      />
    </div>
  </LibraryPanel>
));

BlueprintWorldSettingSection.displayName = 'BlueprintWorldSettingSection';

interface BlueprintNotesSectionProps {
  styleBible?: WorldBlueprint['styleBible'];
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
}
export const BlueprintNotesSection = memo(({ styleBible, setBlueprint }: BlueprintNotesSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-notes-heading" padding="md">
    <BlueprintSectionHeading id="blueprint-notes-heading" icon={FileText} title="Generated Notes" tagline="Review the suggested prose guidance." />
    <div className="mt-5 space-y-5">
        <LibraryTextArea
          id="blueprint-style-bible"
          label="Generated Style Bible"
          rightElement={<EditableChip />}
          icon={FileText}
          value={styleBible || ''}
          onChange={value => setBlueprint(current => ({ ...current, styleBible: value }))}
          rows={5}
          className="font-mono"
          placeholder="Generated prose rules, forbidden phrasing, and tone requirements..."
        />
    </div>
  </LibraryPanel>
));
BlueprintNotesSection.displayName = 'BlueprintNotesSection';
