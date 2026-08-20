import React, { createContext, useContext, ReactNode } from 'react';
import { StoryMemory, StoryArc, StoryWorld, MultiModelRouting, UpdateStoryFields } from '../types';

export type CodexEntryCollection = 'characters' | 'factions' | 'locations' | 'artifacts' | 'abilities';

export interface CodexContextEditorTarget {
  collection: CodexEntryCollection;
  id?: string;
  index?: number;
}

interface CodexContextType {
  memory: StoryMemory;
  arcs: StoryArc[];
  activeStory: StoryWorld;
  mcName: string;
  routingConfig?: MultiModelRouting;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  updateStoryFields: UpdateStoryFields;
  pushNotification: (msg: string) => void;
  getPowerRankScore: (powerStr: string | undefined) => { score: number; title: string };
  handleAwakenCardImage: (id: string, type: 'character' | 'location' | 'artifact', entity: any) => Promise<void>;
  /** `historyId` is the durable `GeneratedImage.id`, never a rendered URL. */
  handleRevertImage: (
    id: string,
    type: 'character' | 'creature' | 'location' | 'artifact' | 'beast' | 'faction',
    historyId: string,
  ) => void;
  previews: Record<string, any>;
  setPreviews: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  generatingId: string | null;
  openEntryContextEditor: (target: CodexContextEditorTarget) => void;
  /**
   * Development access token forwarded to the server-only Character voice
   * endpoint. No provider credential ever reaches the browser.
   */
  voiceAccessToken?: string;
}

const CodexContext = createContext<CodexContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useCodex() {
  const context = useContext(CodexContext);
  if (!context) {
    throw new Error('useCodex must be used within a CodexProvider');
  }
  return context;
}

export function CodexProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CodexContextType;
}) {
  return <CodexContext.Provider value={value}>{children}</CodexContext.Provider>;
}
