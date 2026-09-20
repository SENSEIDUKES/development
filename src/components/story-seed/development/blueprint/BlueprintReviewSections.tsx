import { memo, type Dispatch, type SetStateAction } from 'react';
import {
  CalendarDays,
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
import { type WorldBlueprint, type WorldBlueprintMainCharacter } from '@seihouse/sen/story-seed';
import { STORY_PREMISE_MAX_LENGTH, STORY_TAG_LIMIT, type StorySeedStoryRequired } from '@seihouse/sen/story-seed';
import { STORY_STYLE_OPTIONS, type StoryStyle } from '@seihouse/sen/story-seed';
import { NarrativePanel as LibraryPanel, NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import {
  BlueprintSectionHeading,
  EditableChip,
  FieldLabelRow,
  MetadataChip,
} from './BlueprintDossierPrimitives';
import { formatBlueprintDate } from './createBlueprintMarkdown';
import { LibraryProfileIcon as SENProfileIcon } from '@seihouse/library-ui';

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
  mainCharacter: WorldBlueprintMainCharacter;
  onUpdateMainCharacter: (patch: Partial<WorldBlueprintMainCharacter>) => void;
}

export const BlueprintMainCharacterSection = memo(({
  mainCharacter,
  onUpdateMainCharacter,
}: BlueprintMainCharacterSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-main-character-heading" padding="md">
    <BlueprintSectionHeading
      id="blueprint-main-character-heading"
      icon={SENProfileIcon}
      title="Main Character"
      tagline="The protagonist this blueprint builds around."
    />

    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <LibraryTextBox
          id="blueprint-mc-name"
          label="Name"
          rightElement={<EditableChip />}
          icon={SENProfileIcon}
          value={mainCharacter.name}
          onChange={name => onUpdateMainCharacter({ name })}
          placeholder="Main character name"
        />
        <LibraryTextBox
          id="blueprint-mc-age"
          label="Age"
          rightElement={<EditableChip />}
          value={mainCharacter.age}
          onChange={age => onUpdateMainCharacter({ age })}
          placeholder="e.g. 18, Ancient, Unknown"
        />
        <LibraryTextArea
          id="blueprint-mc-personality"
          label="Personality"
          rightElement={<EditableChip />}
          value={mainCharacter.personality}
          onChange={personality => onUpdateMainCharacter({ personality })}
          rows={4}
          placeholder="Core temperament, values, contradictions..."
        />
        <LibraryTextArea
          id="blueprint-mc-appearance"
          label="Appearance"
          rightElement={<EditableChip />}
          value={mainCharacter.appearance}
          onChange={appearance => onUpdateMainCharacter({ appearance })}
          rows={4}
          placeholder="Physical appearance, clothing, distinctive features..."
        />
      </div>

      <div className="blueprint-key-field">
        <LibraryTextArea
          id="blueprint-mc-profile"
          label="Background / Profile"
          rightElement={<EditableChip />}
          icon={ScrollText}
          value={mainCharacter.backgroundProfile}
          onChange={backgroundProfile => onUpdateMainCharacter({ backgroundProfile })}
          rows={5}
          className="leading-relaxed"
          placeholder="Background, starting identity, flaws, gifts, and relevant history..."
        />
      </div>
    </div>
  </LibraryPanel>
));

BlueprintMainCharacterSection.displayName = 'BlueprintMainCharacterSection';

interface BlueprintWorldSettingSectionProps {
  worldOverview?: WorldBlueprint['worldOverview'];
  startingLocation?: WorldBlueprint['startingLocation'];
  societyStructure?: WorldBlueprint['societyStructure'];
  powerSystemOutline?: WorldBlueprint['powerSystemOutline'];
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
}

export const BlueprintWorldSettingSection = memo(({
  worldOverview,
  startingLocation,
  societyStructure,
  powerSystemOutline,
  setBlueprint,
}: BlueprintWorldSettingSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-world-setting-heading" padding="md">
    <BlueprintSectionHeading
      id="blueprint-world-setting-heading"
      icon={SENWorldIdentityIcon}
      title="World Setting"
      tagline="The universe, its opening stage, and the rules that govern it."
    />

    <div className="mt-5 space-y-5">
      <div className="blueprint-key-field">
        <LibraryTextArea
          id="blueprint-world-overview"
          label="World Overview"
          rightElement={<EditableChip />}
          icon={SENWorldIdentityIcon}
          value={worldOverview || ''}
          onChange={value => setBlueprint(current => ({ ...current, worldOverview: value }))}
          rows={7}
          className="font-serif leading-relaxed text-[#dfd8cf]"
          placeholder="The setting, lore, and physical characteristics of this universe..."
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <LibraryTextArea
          id="blueprint-opening-location"
          label="Opening Location"
          rightElement={<EditableChip />}
          icon={MapPin}
          value={startingLocation || ''}
          onChange={value => setBlueprint(current => ({ ...current, startingLocation: value }))}
          rows={5}
          className="leading-relaxed"
          placeholder="Where the story begins..."
        />
        <LibraryTextArea
          id="blueprint-world-order"
          label="World Order"
          rightElement={<EditableChip />}
          icon={Landmark}
          value={societyStructure || ''}
          onChange={value => setBlueprint(current => ({ ...current, societyStructure: value }))}
          rows={5}
          placeholder="Feudal, corporate, sect-based, military rule..."
        />
      </div>

      <LibraryTextArea
        id="blueprint-power-outline"
        label="Power System Outline"
        rightElement={<EditableChip />}
        icon={SENPowerSystemIcon}
        value={powerSystemOutline || ''}
        onChange={value => setBlueprint(current => ({ ...current, powerSystemOutline: value }))}
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
  estimatedArcs?: WorldBlueprint['estimatedArcs'];
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
}
export const BlueprintNotesSection = memo(({ styleBible, estimatedArcs, setBlueprint }: BlueprintNotesSectionProps) => (
  <LibraryPanel as="section" aria-labelledby="blueprint-notes-heading" padding="md">
    <BlueprintSectionHeading id="blueprint-notes-heading" icon={FileText} title="Generated Notes" tagline="Review the suggested prose guidance and estimated story length." />
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
      <div className="sm:max-w-xs">
        <LibraryTextBox
          id="blueprint-estimated-arcs"
          label="Estimated Arcs"
          rightElement={<EditableChip />}
          type="number"
          value={estimatedArcs || ''}
          onChange={(value) => {
            const rawValue = value.trim();
            const parsedValue = Number.parseInt(rawValue, 10);
            setBlueprint(current => ({
              ...current,
              estimatedArcs: rawValue === '' || Number.isNaN(parsedValue)
                ? 0
                : Math.min(100, Math.max(1, parsedValue)),
            }));
          }}
          className="text-center font-mono"
          placeholder="e.g. 5"
          min="1"
          max="100"
        />
      </div>
    </div>
  </LibraryPanel>
));
BlueprintNotesSection.displayName = 'BlueprintNotesSection';
