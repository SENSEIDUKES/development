import { useCallback, useRef, useState, type RefObject } from 'react';
import { CreationModal, StoryCreationProvider } from '@seihouse/library/story-seed';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { BlueprintRequestError } from '../host/story-seed/blueprintGenerationClient';
import { AccessTokenSheet, type AccessTokenRequest } from './AccessTokenSheet';
import type { NovelExpandedServices } from './services';
import { useNovelExpandedStoryCreation } from './storyCreationRuntime';

export interface CreatePageProps {
  services: Pick<NovelExpandedServices, 'storySeeds' | 'requestWorldBlueprint' | 'requestArcRoadmapExtension'>;
  /** The development access token, held by the app for the visit so leaving Create never forgets it. */
  blueprintToken: RefObject<string | undefined>;
  /** The Story Seeds the reader's stories started from. */
  startedSeedIds: readonly string[];
  onHome: () => void;
  /** Manifest Story: the host starts the story and shows it. */
  onStartStory: (payload: InitialStoryGenerationPayload) => Promise<void>;
}

/** Create: the Story Seed and its World Blueprint, the same journey the Library ships. */
export function CreatePage({ services, blueprintToken, startedSeedIds, onHome, onStartStory }: CreatePageProps) {
  const runtime = useNovelExpandedStoryCreation(services.storySeeds, startedSeedIds);
  const pendingToken = useRef<Promise<string | undefined> | undefined>(undefined);
  const [tokenRequest, setTokenRequest] = useState<AccessTokenRequest>();
  const activeRequest = useRef<AbortController | null>(null);
  const [generating, setGenerating] = useState(false);

  const askForToken = useCallback((rejected: boolean) => {
    pendingToken.current ??= new Promise<string | undefined>(resolve => {
      setTokenRequest({
        rejected,
        resolve: value => {
          pendingToken.current = undefined;
          setTokenRequest(undefined);
          resolve(value);
        },
      });
    });
    return pendingToken.current;
  }, []);

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
    let rejected = false;
    for (;;) {
      const accessToken = blueprintToken.current ?? await askForToken(rejected);
      if (!accessToken) throw new Error(cancelled);
      blueprintToken.current = accessToken;
      try {
        return await track(signal => run(accessToken, signal));
      } catch (error) {
        if (!(error instanceof BlueprintRequestError) || error.status !== 401) throw error;
        blueprintToken.current = undefined;
        rejected = true;
      }
    }
  }, [askForToken, blueprintToken, track]);

  return <StoryCreationProvider value={runtime}>
    <div className="min-h-screen bg-void" data-testid="novel-expanded-create">
      <CreationModal onNavigateHome={onHome} onStartStory={onStartStory} isGenerating={generating} error={null}
        onGenerateBlueprint={payload => withToken('The World Blueprint needs the development access token. Nothing was changed.',
          (accessToken, signal) => services.requestWorldBlueprint(payload, accessToken, signal))}
        onExtendArcRoadmap={payload => withToken('Adding arcs needs the development access token. Nothing was changed.',
          (accessToken, signal) => services.requestArcRoadmapExtension(payload, accessToken, signal))} />
    </div>
    <AccessTokenSheet request={tokenRequest} />
  </StoryCreationProvider>;
}
