import { memo, useMemo, type CSSProperties } from 'react';
import { TextHighlightEngine, type TextHighlightOverlay } from '@seihouse/sen/text-highlight-engine';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import type { SoundCueAttachment } from '@seihouse/sen/audio';
import { chapterTitleText } from '../../../narrative/chapterTitle';
import type { ReaderChapterBodyProps } from './readerChapterBody';

/** The Reader shows chapters; it never edits them. */
const keepProse = () => undefined;

/** Behind the sentence being read aloud; a host theme may set its own. */
const READ_ALOUD_TONE = 'var(--sen-read-aloud-highlight, rgba(103, 232, 249, 0.16))';

/**
 * The chapter as prose: its title and its paragraphs on the Text Highlight
 * Engine, with the Sound Cues placed on their words and the sentence being
 * read aloud lit, in the reader's font, size, spacing and weight. The column
 * holds about 60 characters a line, the SEIHouse fonts' reading measure. The
 * overlay stays mounted while Read Aloud is active, so moving from sentence to
 * sentence never replays its fade.
 */
export const ProseChapterBody = memo(function ProseChapterBody({ chapter, blocks, locale, articleRef, highlight, reading, text }: ReaderChapterBodyProps) {
  const overlay = useMemo((): TextHighlightOverlay | undefined => {
    if (!reading) return undefined;
    if (!highlight || highlight === 'title') return { marks: [] };
    return { marks: [{ id: 'read-aloud', selection: highlight, tone: READ_ALOUD_TONE }] };
  }, [reading, highlight]);
  const cuesByBlock = useMemo(() => {
    const byBlock = new Map<string, SoundCueAttachment[]>();
    for (const cue of chapter.soundCues ?? []) byBlock.set(cue.anchor.blockId, [...(byBlock.get(cue.anchor.blockId) ?? []), cue]);
    return byBlock;
  }, [chapter]);
  // Set on the article so `ch` measures the chapter's own text.
  const prose = useMemo((): CSSProperties => ({
    fontFamily: text.font.family, fontSize: text.fontSize, fontWeight: text.fontWeight,
    fontSynthesis: 'none', fontKerning: 'normal', '--sen-text-line-height': text.lineHeight,
  } as CSSProperties), [text]);
  return <article ref={articleRef} className="mx-auto mt-6 max-w-[60ch]" style={prose} data-chapter-number={chapter.chapterNumber} lang={locale}
    aria-labelledby={`harness-reader-chapter-${chapter.chapterNumber}`}>
    {/* The word count is a testing aid while chapter length is being tuned. */}
    <p className="font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-neutral-500">Chapter {chapter.chapterNumber}
      <span data-testid="harness-reader-word-count"> · {chapter.metrics.wordCount.toLocaleString(locale)} words</span></p>
    <h1 id={`harness-reader-chapter-${chapter.chapterNumber}`} data-read-aloud-title="" data-speaking={highlight === 'title' ? '' : undefined}
      style={{ fontFamily: text.titleFont.family }}
      className={`mt-1 rounded text-2xl font-normal text-white transition-colors sm:text-3xl ${highlight === 'title' ? 'bg-cyan-300/15' : ''}`}>{chapterTitleText(chapter.title) || chapter.title}</h1>
    <TextHighlightEngine blocks={blocks} onBlocksChange={keepProse} editable={false} locale={locale} overlay={overlay}
      className="mt-6 text-neutral-200"
      renderBlockText={block => {
        const cues = cuesByBlock.get(block.id);
        return cues?.length ? <InlineAudioText text={block.text} cues={cues} renderText={text => text} /> : block.text;
      }} />
  </article>;
});
