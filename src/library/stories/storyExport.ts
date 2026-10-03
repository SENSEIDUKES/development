import { exportHarnessStory, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';

/** The file a story is saved as: its title in letters, digits and hyphens. */
export const storyExportFileName = (title: string) =>
  `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'harness-story'}.json`;

/**
 * Saves one story as a file on the reader's device: the story and its plans,
 * every chapter, and for each chapter the exact instructions, Story
 * Information and request the writer was given, with its raw reply
 * (`exportHarnessStory`). It is how a test is shared.
 */
export function downloadHarnessStory(state: HarnessWorkspaceState, storyId: string) {
  const archive = exportHarnessStory(state, storyId);
  const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = storyExportFileName(archive.story.title);
  // Some browsers only follow a link that is in the page.
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Safari starts the save after the click returns, so the file's address stays valid a while.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
