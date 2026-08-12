import { StoryMemory, StoryWorld, UpdateStoryFields } from '../types';

export function useCodexDeletions(
  memory: StoryMemory,
  onUpdateMemory: (updatedMemory: StoryMemory) => void,
  activeStory: StoryWorld,
  updateStoryFields: UpdateStoryFields,
) {
  const handleDeleteFaction = (id: string) => {
    const currentFactions = memory.factions || [];
    onUpdateMemory({
      ...memory,
      factions: currentFactions.filter(f => f.id !== id)
    });
  };

  const handleDeleteArtifact = (id: string) => {
    const currentArtifacts = memory.artifacts || [];
    onUpdateMemory({
      ...memory,
      artifacts: currentArtifacts.filter(a => a.id !== id)
    });
  };

  const handleDeleteLocation = (id: string) => {
    const currentLocations = memory.locations || [];
    onUpdateMemory({
      ...memory,
      locations: currentLocations.filter(l => l.id !== id)
    });
  };

  const handleDeleteCustomRelationship = (bondId: string) => {
    void updateStoryFields(activeStory.id, (current) => ({
      relationships: (Array.isArray(current.relationships) ? current.relationships : [])
        .filter(b => b.id !== bondId),
    }));
  };

  const handleDeleteFateNode = (fateId: string) => {
    void updateStoryFields(activeStory.id, (current) => ({
      karmaNodes: (Array.isArray(current.karmaNodes) ? current.karmaNodes : [])
        .filter(n => n.id !== fateId),
    }));
  };

  return {
    handleDeleteFaction,
    handleDeleteArtifact,
    handleDeleteLocation,
    handleDeleteCustomRelationship,
    handleDeleteFateNode
  };
}
