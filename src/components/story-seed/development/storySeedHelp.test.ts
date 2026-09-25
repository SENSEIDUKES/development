import { describe, expect, it } from 'vitest';
import { LIBRARY_ASSETS } from '../../../host/media/libraryAssets';
import { Lightbulb } from 'lucide-react';
import { STORY_SEED_HELP_ITEMS, getLibraryHelpItems, type StorySeedHelpItem } from '@seihouse/library/story-seed';

const helpLinesBase = 'https://lines.seihouse.org/LIBRARY/Lines/SYSTEM/SYSTEM/HELP%20LINES';

const expectedLibraryTopics = [
  ['Story Seed', 'Your Story Seed is the first spark of the novel. Give the Library enough information for it to create your universe.', `${helpLinesBase}/STORY%20SEED%20ENG.mp3`, ['story-seed']],
  ['Style', 'Style controls the flavor of the writing, not the plot itself, cultivator', `${helpLinesBase}/STYLE%20ENG.mp3`, ['story-seed']],
  ['Premise', 'The premise tells the Library what your story is really about, scholar.', `${helpLinesBase}/PREMISE%20ENG.mp3`, ['story-seed']],
  ['Genre', 'Genre tells the Library what kind of story this should feel like.', `${helpLinesBase}/GENRE%20ENG.mp3`, ['story-seed']],
  ['Story Tags', 'Story Tags are powerful signals. For the best results, use a few strong ones instead of flooding the story.', `${helpLinesBase}/STORY%20TAGS%20ENG.mp3`, ['story-seed']],
  ['World', 'World details shape the setting, powers, factions, and rules around your story, Choose wisely disciple.', `${helpLinesBase}/WORLD%20ENG.mp3`, ['story-seed']],
  ['ARC', 'ARC guides the path of the story, including plot, tropes, even Face-Slaps, Use ARC to shape the Novels Destiny.', `${helpLinesBase}/ARC%20ENG.mp3`, ['story-seed']],
  ['Origin', 'Origin holds the required heart of your story, the title, premise, genre, style and tags.', `${helpLinesBase}/ORIGIN%20ENG.mp3`, ['story-seed']],
  // Rewritten for the Phase 2 Fate model; their earlier recordings described
  // the retired design, so they have no audio until new lines are recorded.
  ['Fate Survival', 'In Fate Survival you direct every chapter yourself, and the Destined Ending is not guaranteed: your choices can fail it.', undefined, ['story-seed', 'fate']],
  ['Mind Palace', 'Your Mind Palace keeps the passages you choose from the story, each with an optional note, so you can return to them.', undefined, ['fate']],
  ['Alter Fate', 'Alter Fate opens the Fate page, where you see where the story is headed and choose the next chapter\'s path.', undefined, ['reader', 'fate']],
  ['Manifest', 'Manifesting is the act of generating chapters, images, audio, rewards, and videos in the the celestial library', `${helpLinesBase}/Manifest%20-%20Eng.mp3`, ['library', 'story-seed', 'reader']],
  ['Seed Bank', 'The storage bank for a Readers Story Seeds and world blueprints', `${helpLinesBase}/Seed%20Bank%20-%20ENG.mp3`, ['story-seed', 'seed-bank']],
  ['World Blueprint', 'A World Blueprint is the final overview of a novel before it is manifested from the seed.', `${helpLinesBase}/World%20Blueprint%20-%20Eng.mp3`, ['story-seed', 'seed-bank']],
  ['Energy', 'Energy is the currency used for manifesting inside of the celestial library', `${helpLinesBase}/Energy%20-%20Eng.mp3`, ['library', 'story-seed']],
  ['SEN', 'SEN is a portable expanded-narrative engine. Celestial Library is its first-party host; other authors bring their own content, branding, accounts, and storage.', undefined, ['library']],
  ['Celestial Library', 'The Celestial Library is home for Narration, illustration, Animation, video games and wandering scholars from around the universe.', `${helpLinesBase}/Celestial%20Library%20-%20Eng.mp3`, ['library']],
  ['Relics', 'Items lost by the Library that a cultivator can return for a reward', `${helpLinesBase}/Relics%20-%20Eng.mp3`, ['library', 'relics']],
  ['Pressure', 'Pressure is how much influence the Library exerts over a scholars story', `${helpLinesBase}/Pressure%20-%20eng.mp3`, ['story-seed', 'fate']],
] as const;

const topics: StorySeedHelpItem[] = [
  {
    id: 'general', label: 'General', icon: Lightbulb,
    translations: { en: { line: 'Main guidance', detail: 'A supporting quick tip', audioUrl: '/general.mp3' } },
  },
  {
    id: 'seed', label: 'Seed topic', icon: Lightbulb, contexts: ['story-seed'],
    translations: { en: { line: 'Shape your universe', audioUrl: '/seed.mp3' } },
  },
];

describe('Library guidance topics', () => {
  it('keeps the exact Library topic copy, audio sources, and contexts', () => {
    expect(STORY_SEED_HELP_ITEMS.map(item => {
      const translation = item.translations.en;
      expect(translation?.audioUrl).toBeUndefined();
      return [item.label, translation?.line, LIBRARY_ASSETS.helpAudio?.[item.id], item.contexts];
    })).toEqual(expectedLibraryTopics);

    const audioUrls = STORY_SEED_HELP_ITEMS.flatMap(item => LIBRARY_ASSETS.helpAudio?.[item.id] ?? []);
    expect(new Set(audioUrls).size).toBe(audioUrls.length);
  });

  it('keeps Story Seed-relevant Library topics first on the Story Seed page', () => {
    expect(getLibraryHelpItems(STORY_SEED_HELP_ITEMS, 'en', 'story-seed', '')
      .slice(0, 14)
      .map(item => item.label))
      .toEqual([
        'Story Seed', 'Style', 'Premise', 'Genre', 'Story Tags', 'World', 'ARC',
        'Origin', 'Fate Survival', 'Manifest', 'Seed Bank', 'World Blueprint',
        'Energy', 'Pressure',
      ]);
  });

  it('prioritizes topics for the current page without mutating the source order', () => {
    const originalOrder = topics.map(item => item.id);

    expect(getLibraryHelpItems(topics, 'en', 'story-seed', '').map(item => item.id))
      .toEqual(['seed', 'general']);
    expect(topics.map(item => item.id)).toEqual(originalOrder);
  });

  it.each([
    ['general', 'general'],
    ['main guidance', 'general'],
    ['quick tip', 'general'],
    ['UNIVERSE', 'seed'],
  ])(
    'searches labels, main lines, and supporting details for %s',
    (query, expectedId) => {
      expect(getLibraryHelpItems(topics, 'en', 'library', query).map(item => item.id))
        .toEqual([expectedId]);
    },
  );

  it('allows written-only topics without an audio URL', () => {
    const textOnlyTopic: StorySeedHelpItem = {
      id: 'text-only',
      label: 'Text only',
      icon: Lightbulb,
      translations: { en: { line: 'Written guidance without narration.' } },
    };

    expect(textOnlyTopic.translations.en?.audioUrl).toBeUndefined();
    expect(getLibraryHelpItems([textOnlyTopic], 'en', 'library', 'written'))
      .toEqual([textOnlyTopic]);
  });
});
