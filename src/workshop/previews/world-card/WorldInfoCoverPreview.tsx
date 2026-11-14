import { useCallback, useState, type ComponentProps } from 'react';
import { StoryDetailScreen } from '@seihouse/library/home';
import { blueprintCharacters } from '@seihouse/library/story-seed';
import { useStoryCoverManifest } from '@seihouse/library/stories';
import { useCodexPictures } from '../../../host/media/codexPictures';
import { IndexedDbStoryCoverStore, useStoryCovers, type StoryCoverMaker } from '../../../host/media/storyCovers';
import { requestCodexPicture, requestStoryCover } from '../../../host/media/storyCoverClient';
import { createSavedAccessToken } from '../../../host/generation/accessToken';
import { readModelPreference } from '../../../host/generation/modelPreference';
import { fillBlankSeedSlots } from '@seihouse/sen/story-seed';
import { createMockStorySeedRecord, createMockSeedSlotAnswer } from '../story-seed/previewData';

/** App cover composition on isolated Workshop records, using the real image route. */
export function WorldInfoCoverPreview(props: ComponentProps<typeof StoryDetailScreen>) {
  const [store] = useState(() => new IndexedDbStoryCoverStore('workshop-codex-pictures-v1'));
  const [coverStore] = useState(() => new IndexedDbStoryCoverStore('workshop-story-covers-v1'));
  const [record] = useState(() => createMockStorySeedRecord());
  const characters = blueprintCharacters(fillBlankSeedSlots(record.seed, createMockSeedSlotAnswer()));
  const options = () => ({ model: readModelPreference('images') ?? undefined, accessToken: createSavedAccessToken().current });
  const pictures = useCodexPictures(store, request => requestCodexPicture(request, options()));
  const makeCovers = useCallback<StoryCoverMaker>(async (story, count) => {
    const requestOptions = { model: readModelPreference('images') ?? undefined, accessToken: createSavedAccessToken().current };
    const results = await Promise.allSettled(Array.from({ length: count }, () => requestStoryCover(story, requestOptions)));
    return { images: results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []),
      problem: results.find(result => result.status === 'rejected')?.reason?.message };
  }, []);
  const covers = useStoryCovers(coverStore, makeCovers);
  const storyId = `world-card-preview:${props.story.id}`;
  const request = { title: props.story.title, synopsis: props.story.synopsis, genre: record.seed.story.required.genre, style: record.seed.story.required.style };
  const flow = useStoryCoverManifest({ covers, storyId, request, characters,
    pictures: { pictureOf: key => pictures.pictureOf(storyId, key),
      manifest: card => pictures.manifest(storyId, card.key, { card, story: { genre: request.genre, style: request.style } }) },
    referenceOf: key => pictures.referenceOf(storyId, key),
  });
  return <>
    <p className="mb-3 text-xs text-neutral-400">Cover test: sample characters, separate Workshop device storage, real image generation and request limits.</p>
    <StoryDetailScreen {...props} story={{ ...props.story, imageUrl: covers.coverUrl(storyId) ?? props.story.imageUrl ?? '' }} coverAction={flow.onCover} />
    {flow.overPage}
  </>;
}
