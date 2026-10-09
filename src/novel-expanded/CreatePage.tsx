import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { CreationModal, StoryCreationProvider } from '@seihouse/library/story-seed';
import { BlueprintEnergyCost } from '@seihouse/library/stories';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { BlueprintRequestError } from '../host/story-seed/blueprintGenerationClient';
import type { AskForAccessToken } from './accessToken';
import type { NovelExpandedServices } from './services';
import { useNovelExpandedStoryCreation } from './storyCreationRuntime';

type CreationModalProps = ComponentProps<typeof CreationModal>;

export interface CreatePageProps {
  /** `accessToken`: the owner's token, saved on this device, so leaving Create never forgets it. */
  services: Pick<NovelExpandedServices, 'storySeeds' | 'requestWorldBlueprint' | 'accessToken'>;
  /** Opens the app's access token sheet. */
  askForToken: AskForAccessToken;
  /** The Story Seeds the reader's stories started from. */
  startedSeedIds: readonly string[];
  /** The model chapters are written with; the World Blueprint is written by the same one. */
  chapterModel?: string;
  /** The profile's default reading language: a new Story Seed's Original Language starts there. */
  accountDefaultLanguage?: CreationModalProps['accountDefaultLanguage'];
  /** The profile's default Reading Mode: a new Story Seed starts with it. */
  accountDefaultChapterWritingStyle?: CreationModalProps['accountDefaultChapterWritingStyle'];
  /** Story Settings in Create: the skills and media the new story starts with. */
  renderStorySettings?: CreationModalProps['renderStorySettings'];
  onHome: () => void;
  /** Manifest Story: the host starts the story and shows it. */
  onStartStory: (payload: InitialStoryGenerationPayload) => Promise<void>;
}

/** Create: the Story Seed and its World Blueprint, the same journey the Library ships. */
export function CreatePage({ services, askForToken, startedSeedIds, chapterModel, accountDefaultLanguage, accountDefaultChapterWritingStyle, renderStorySettings, onHome, onStartStory }: CreatePageProps) {
  const runtime = useNovelExpandedStoryCreation(services.storySeeds, startedSeedIds);
  const activeRequest = useRef<AbortController | null>(null);
  const [generating, setGenerating] = useState(false);

  /** One request at a time, like the Workshop: a newer one cancels the older. */
  const track = useCallback(async <T,>(run: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setGenerating(true);
    try {
      return await run(controller.signal);
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setGenerating(false);
      }
    }
  }, []);

  /** Asks for the token when there is none, and again when the server does not accept it. */
  const withToken = useCallback(async <T,>(cancelled: string, run: (accessToken: string, signal: AbortSignal) => Promise<T>): Promise<T> => {
    const token = services.accessToken;
    let rejected = false;
    for (;;) {
      const accessToken = token.current ?? await askForToken({ reason: 'blueprint', rejected });
      if (!accessToken) throw new Error(cancelled);
      token.current = accessToken;
      try {
        return await track(signal => run(accessToken, signal));
      } catch (error) {
        if (!(error instanceof BlueprintRequestError) || error.status !== 401) throw error;
        token.current = undefined;
        rejected = true;
      }
    }
  }, [askForToken, services.accessToken, track]);

  return <StoryCreationProvider value={runtime}>
    <div className="min-h-screen bg-void" data-testid="novel-expanded-create">
      <CreationModal onNavigateHome={onHome} onStartStory={onStartStory} isGenerating={generating} error={null}
        accountDefaultLanguage={accountDefaultLanguage} accountDefaultChapterWritingStyle={accountDefaultChapterWritingStyle}
        renderStorySettings={renderStorySettings} manifestAside={<BlueprintEnergyCost />}
        onGenerateBlueprint={payload => withToken('The World Blueprint needs the development access token. Nothing was changed.',
          (accessToken, signal) => services.requestWorldBlueprint(payload, accessToken, signal, chapterModel))} />
    </div>
  </StoryCreationProvider>;
}
