import { useId } from 'react';
import { Languages } from 'lucide-react';
import {
  CHAPTER_WRITING_STYLE_DESCRIPTIONS,
  CHAPTER_WRITING_STYLE_OPTIONS,
  getSenLanguageLabel,
  normalizeChapterWritingStyle,
  type ChapterWritingStyle,
} from '@seihouse/sen/contracts';
import { resolveStoryLanguagePackage, type HarnessSkillManifest, type HarnessStory } from '@seihouse/sen/harness-generation';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';

/**
 * The reader-experience notice for a story's Story Language, in product
 * terms. Absent when the language needs nothing extra.
 */
export const storyLanguageNotice = (
  story: Pick<HarnessStory, 'originalLanguage'>,
  installedSkills: readonly HarnessSkillManifest[],
): { tone: 'info' | 'blocking'; text: string } | undefined => {
  const language = getSenLanguageLabel(story.originalLanguage);
  const support = resolveStoryLanguagePackage(installedSkills, story.originalLanguage);
  if (support.status === 'missing') {
    return { tone: 'info', text: `No specialized ${language} writing package is installed. Chapters are still written in ${language}.` };
  }
  if (support.status === 'ambiguous') return { tone: 'blocking', text: support.message };
  return undefined;
};

/**
 * Story Settings on the novel page: the story's own configuration in plain
 * terms. The owner reads the Story Language fixed at the start and chooses the
 * Reading Mode for chapters still to come; the HARNESS turns both into its own
 * internal skills, which this panel never names.
 */
export function StorySettingsPanel({
  story,
  installedSkills,
  busy,
  onReadingModeChange,
}: {
  story: HarnessStory;
  /** The host's installed packages, read only to explain the Story Language. */
  installedSkills: readonly HarnessSkillManifest[];
  busy: boolean;
  onReadingModeChange: (mode: ChapterWritingStyle) => void;
}) {
  const titleId = useId();
  const readingModeId = useId();
  const readingMode = normalizeChapterWritingStyle(story.chapterWritingStyle);
  const notice = storyLanguageNotice(story, installedSkills);
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby={titleId} data-testid="story-settings">
      <div className="flex items-center gap-2">
        <Languages size={18} className="text-cyan-200" aria-hidden="true" />
        <h2 id={titleId} className="font-display text-xl text-white">Story Settings</h2>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Story Language</p>
          <p className="mt-1 min-h-11 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-neutral-100" data-testid="story-settings-language">
            {getSenLanguageLabel(story.originalLanguage)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Chosen when the story began. Every chapter is written in this language.</p>
          {notice && (
            <p
              role={notice.tone === 'blocking' ? 'alert' : 'status'}
              data-testid="story-settings-language-notice"
              className={`mt-2 rounded-lg border p-2.5 text-[11px] leading-relaxed ${notice.tone === 'blocking' ? 'border-human/30 bg-human-brand/10 text-human' : 'border-cyan-300/20 bg-cyan-400/[0.06] text-cyan-50/85'}`}
            >
              {notice.text}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={readingModeId}>Reading Mode</label>
          <select
            id={readingModeId}
            value={readingMode}
            disabled={busy}
            onChange={event => onReadingModeChange(normalizeChapterWritingStyle(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-cyan-300/60"
          >
            {CHAPTER_WRITING_STYLE_OPTIONS.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            {CHAPTER_WRITING_STYLE_DESCRIPTIONS[readingMode]} Applies to chapters written from now on; chapters already written stay as they are.
          </p>
        </div>
      </div>
    </LibraryPanel>
  );
}
