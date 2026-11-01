import { STORY_STYLE_OPTIONS, type StoryStyle } from '@seihouse/sen/story-seed';
import type { HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type {
  CreatorPluginCatalog,
  CreatorPluginFile,
  CreatorPluginGroup,
  CreatorPluginPackage,
  CreatorToolkitItem,
} from '@seihouse/library/creator-space';
import type { LibraryStories } from '@seihouse/library/stories';
import { OFFICIAL_STYLE_REFERENCES } from '../host/generation/capa/officialCapaSkills';
import { SEN_ATMOSPHERES, SEN_SCENE_ATMOSPHERES } from '../host/media/atmosphereCatalog';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS, TRACK_LIBRARY } from '../host/media/libraryCatalog';

const styles = STORY_STYLE_OPTIONS.map(option => option.label);

const STYLE_DETAILS: Record<StoryStyle, {
  tradition: string;
  description: string;
  guideTitle: string;
  guideDetail: string;
}> = {
  chinese: {
    tradition: 'Xianxia · Xuanhuan · Wuxia',
    description: 'Cultivation realms, ancient sects, karmic ties and grand martial breakthroughs.',
    guideTitle: 'Chinese Cultivation & Martial Prose Guide',
    guideDetail: ' Governs realm cadence, sect hierarchy, Dao comprehension, honorifics and breakthrough pacing.',
  },
  korean: {
    tradition: 'Hunter · Tower · Regression',
    description: 'Gates, awakened ranks, tactical raids and sharp status-driven momentum.',
    guideTitle: 'Korean Hunter, Tower & Regression Prose Guide',
    guideDetail: 'Governs raid tension, guild politics, regression stakes and crisp tactical beat structure.',
  },
  japanese: {
    tradition: 'Light Novel · Isekai · Fantasy',
    description: 'Expressive character chemistry, party dynamics and vivid world exploration.',
    guideTitle: 'Japanese Light Novel & Fantasy Prose Guide',
    guideDetail: 'Governs conversational rhythm, expressive inner voice, party banter and sense-of-wonder discovery.',
  },
};

function titleCaseWords(text: string): string {
  return text
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function readableTrackTitle(id: string, label?: string): string {
  if (label?.trim()) return label.trim();
  return id
    .replace(/^LIGHT_NOVEL_/, '')
    .replace(/^AMBEINT_/, 'AMBIENT_')
    .replace(/TRUIMPH/i, 'TRIUMPH')
    .replace(/TRAVLING/i, 'TRAVELING')
    .replace(/OPPORUNIRTY/i, 'OPPORTUNITY')
    .replace(/APPERANCE/i, 'APPEARANCE')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function readableCueTitle(filePath: string): string {
  const base = filePath.split('/').pop() ?? filePath;
  const withoutExt = base.replace(/\.[a-z0-9]+$/i, '');
  return titleCaseWords(withoutExt);
}

const SOUNDSCAPE_PRIORITY_ORDER = ['adventure', 'ambient', 'fighting', 'tension', 'war'];

function groupSoundscapeTracks(tracks: ReadonlyArray<{
  id: string;
  label?: string;
  mood: string;
  tags: readonly string[];
}>): CreatorPluginGroup[] {
  const byMood = new Map<string, CreatorPluginFile[]>();
  for (const track of tracks) {
    const key = track.mood || 'other';
    const list = byMood.get(key) ?? [];
    list.push({
      id: track.id,
      title: readableTrackTitle(track.id, track.label),
      ...(track.tags.length > 0 ? { detail: track.tags.join(' · ') } : {}),
    });
    byMood.set(key, list);
  }
  return Array.from(byMood.entries())
    .sort(([moodA, filesA], [moodB, filesB]) => {
      const priA = SOUNDSCAPE_PRIORITY_ORDER.indexOf(moodA);
      const priB = SOUNDSCAPE_PRIORITY_ORDER.indexOf(moodB);
      if (priA !== -1 || priB !== -1) {
        if (priA === -1) return 1;
        if (priB === -1) return -1;
        return priA - priB;
      }
      return filesB.length - filesA.length || moodA.localeCompare(moodB);
    })
    .map(([mood, files]) => ({
      id: mood,
      label: titleCaseWords(mood),
      files,
    }));
}

function groupCueEntries(cues: ReadonlyArray<{
  file_path: string;
  category: string;
  metadata: { sound?: string; description: string; soft_tags: readonly string[] };
}>): CreatorPluginGroup[] {
  const byCategory = new Map<string, CreatorPluginFile[]>();
  for (const cue of cues) {
    const key = cue.category || 'other';
    const list = byCategory.get(key) ?? [];
    list.push({
      id: cue.file_path,
      title: readableCueTitle(cue.file_path),
      ...(cue.metadata.sound ? { badge: cue.metadata.sound } : {}),
      detail: cue.metadata.description || cue.metadata.soft_tags.join(' · '),
    });
    byCategory.set(key, list);
  }
  return Array.from(byCategory.entries())
    .sort(([catA, filesA], [catB, filesB]) => filesB.length - filesA.length || catA.localeCompare(catB))
    .map(([category, files]) => ({
      id: category,
      label: titleCaseWords(category),
      files,
    }));
}

function groupAtmosphereEntries(entries: ReadonlyArray<{
  id: string;
  label?: string;
  word: string;
  group?: string;
  studioTags?: { energy?: string };
}>): CreatorPluginGroup[] {
  const byGroup = new Map<string, CreatorPluginFile[]>();
  for (const entry of entries) {
    const key = entry.group?.trim() || 'Other';
    const list = byGroup.get(key) ?? [];
    list.push({
      id: entry.id,
      title: entry.label?.trim() || titleCaseWords(entry.word),
      badge: entry.word,
      detail: entry.studioTags?.energy ? `${titleCaseWords(entry.studioTags.energy)} intensity loop` : 'Seamless environment bed',
    });
    byGroup.set(key, list);
  }
  return Array.from(byGroup.entries())
    .sort(([groupA, filesA], [groupB, filesB]) => filesB.length - filesA.length || groupA.localeCompare(groupB))
    .map(([group, files]) => ({
      id: group.toLowerCase().replace(/\s+/g, '-'),
      label: group,
      files,
    }));
}

const BUILTIN_STYLE_PACKAGES: readonly CreatorPluginPackage[] = STORY_STYLE_OPTIONS.map(option => {
  const info = STYLE_DETAILS[option.value];
  return {
    id: `ne-style-${option.value}`,
    kind: 'style',
    title: `NovelExpanded ${option.label} Style`,
    description: info.description,
    version: '1.0.0',
    builtIn: true,
    unitSingular: 'guide',
    unitPlural: 'guides',
    groups: [
      {
        id: option.value,
        label: info.tradition,
        files: [
          {
            id: `capa-style-${option.value}`,
            title: info.guideTitle,
            badge: 'CAPA Style',
            detail: info.guideDetail.trim(),
          },
        ],
      },
    ],
  };
});

const BUILTIN_SOUNDSCAPE_PACKAGE: CreatorPluginPackage = {
  id: 'ne-soundscapes-vol-1',
  kind: 'soundscape',
  title: 'NovelExpanded Soundscapes Vol. 1',
  description: 'Composed ambient scores matched to each chapter’s opening mood.',
  version: '1.0.0',
  builtIn: true,
  unitSingular: 'score',
  unitPlural: 'scores',
  groups: groupSoundscapeTracks(TRACK_LIBRARY),
};

const BUILTIN_CUES_PACKAGE: CreatorPluginPackage = {
  id: 'ne-cues-vol-1',
  kind: 'cue',
  title: 'NovelExpanded Cues Vol. 1',
  description: `Inline story sound effects triggered across ${LIBRARY_SOUND_WORDS.length} sound words.`,
  version: '1.0.0',
  builtIn: true,
  unitSingular: 'effect',
  unitPlural: 'effects',
  groups: groupCueEntries(LIBRARY_BASE_MEDIA.soundCues.map(record => record.cue)),
};

const BUILTIN_ATMOSPHERES_PACKAGE: CreatorPluginPackage = {
  id: 'ne-atmospheres-vol-1',
  kind: 'atmosphere',
  title: 'NovelExpanded Atmospheres Vol. 1',
  description: 'Seamless weather and environment beds that play under your chapters.',
  version: '1.0.0',
  builtIn: true,
  unitSingular: 'bed',
  unitPlural: 'beds',
  groups: groupAtmosphereEntries(SEN_SCENE_ATMOSPHERES),
};

const OFFICIAL_STYLE_IDS = new Set([
  ...Object.values(OFFICIAL_STYLE_REFERENCES).map(ref => ref.id),
  'sen-default-style',
  'capa-style-chinese',
  'capa-style-korean',
  'capa-style-japanese',
]);

function mediaPackToPluginPackage(pack: LibraryStories['mediaPacks'][number]): CreatorPluginPackage {
  if (pack.type === 'soundscape') {
    return {
      id: `spp-media-${pack.id}@${pack.version}`,
      kind: 'soundscape',
      title: pack.displayName,
      description: pack.description || 'Installed .spp soundscape pack on this device.',
      version: pack.version,
      unitSingular: 'score',
      unitPlural: 'scores',
      groups: groupSoundscapeTracks(pack.entries),
    };
  }
  if (pack.type === 'sound-cue') {
    return {
      id: `spp-media-${pack.id}@${pack.version}`,
      kind: 'cue',
      title: pack.displayName,
      description: pack.description || `Installed .spp cue pack across ${pack.sounds.length} sound words.`,
      version: pack.version,
      unitSingular: 'effect',
      unitPlural: 'effects',
      groups: groupCueEntries(pack.entries),
    };
  }
  return {
    id: `spp-media-${pack.id}@${pack.version}`,
    kind: 'atmosphere',
    title: pack.displayName,
    description: pack.description || 'Installed .spp atmosphere pack on this device.',
    version: pack.version,
    unitSingular: 'bed',
    unitPlural: 'beds',
    groups: groupAtmosphereEntries(pack.entries),
  };
}

/**
 * Builds the live Creator Plugins catalog from the Library's built-in parent
 * `.spp` packs plus any custom `.spp` skills or media packs installed locally.
 */
export function buildCreatorPluginCatalog(options?: {
  skills?: readonly HarnessSkillManifest[];
  mediaPacks?: LibraryStories['mediaPacks'];
}): CreatorPluginCatalog {
  const customStylePackages: CreatorPluginPackage[] = (options?.skills ?? [])
    .filter(skill => skill.slot === 'style' && !OFFICIAL_STYLE_IDS.has(skill.id) && !/^STYLE\s*-\s*(CHINESE|JAPANESE|KOREAN)\b/i.test(skill.name))
    .map(skill => ({
      id: `spp-skill-${skill.id}@${skill.version}`,
      kind: 'style',
      title: skill.name,
      description: skill.description || 'Custom prose style .spp installed on this device.',
      version: skill.version,
      unitSingular: 'guide',
      unitPlural: 'guides',
      groups: [
        {
          id: 'style',
          label: 'Custom Style Guide',
          files: [
            {
              id: skill.id,
              title: skill.name,
              badge: 'CAPA Style',
              detail: skill.description || 'Custom style guidance applied when equipped on a story.',
            },
          ],
        },
      ],
    }));

  const customMediaPackages = (options?.mediaPacks ?? []).map(mediaPackToPluginPackage);

  return {
    packages: [
      ...BUILTIN_STYLE_PACKAGES,
      ...customStylePackages,
      BUILTIN_SOUNDSCAPE_PACKAGE,
      ...customMediaPackages.filter(pack => pack.kind === 'soundscape'),
      BUILTIN_CUES_PACKAGE,
      ...customMediaPackages.filter(pack => pack.kind === 'cue'),
      BUILTIN_ATMOSPHERES_PACKAGE,
      ...customMediaPackages.filter(pack => pack.kind === 'atmosphere'),
    ],
  };
}

/**
 * The Creator Toolkit's cards on Create: the first-party systems a story is
 * made with, each opening its section in Creator Plugins.
 */
export const CREATOR_TOOLKIT: readonly CreatorToolkitItem[] = [
  { id: 'style-packs', kind: 'style', title: 'Style Packs',
    description: `${styles.slice(0, -1).join(', ')} and ${styles.at(-1)} writing styles.`,
    imageUrl: '/manifest-backdrops/immortal-land-2.jpg' },
  { id: 'soundscapes', kind: 'soundscape', title: 'Soundscapes',
    description: `${TRACK_LIBRARY.length} ambient scores for your scenes.`,
    imageUrl: '/manifest-backdrops/immortal-land-4.jpg' },
  { id: 'cues', kind: 'cue', title: 'Cues',
    description: `${LIBRARY_BASE_MEDIA.soundCues.length} sound effects for story moments.`,
    imageUrl: '/manifest-backdrops/immortal-land-5.jpg' },
  { id: 'atmospheres', kind: 'atmosphere', title: 'Atmospheres',
    description: `${SEN_ATMOSPHERES.length} weather and place sounds for your worlds.`,
    imageUrl: '/manifest-backdrops/immortal-land-3.jpg' },
];
