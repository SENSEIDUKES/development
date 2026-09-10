import React from 'react';
import { LibraryPanel } from '@seihouse/library-ui';
import { SEIInlineAlert } from '@seihouse/ui';

/**
 * The public Stories and Relics pages.
 *
 * Those two destinations have not been redesigned yet, so the public view
 * shows the smallest thing that proves the navigation is real and correctly
 * scoped: the titles the *viewed* cultivator published, or the fact that they
 * kept them private. It receives that list as a prop and reads nothing else —
 * no controller, no signed-in profile, no story or seed service — so no
 * private surface can be reached through a public route.
 */
export function UserProfilePublicPanel({
  kind,
  displayName,
  titles,
}: {
  kind: 'stories' | 'relics';
  displayName: string;
  /** Published titles, or `null` when the cultivator keeps this area private. */
  titles: readonly string[] | null;
}) {
  const noun = kind === 'stories' ? 'stories' : 'relic titles';

  return (
    <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]" data-cave-public-panel={kind}>
      <SEIInlineAlert tone="info" title="Public view">
        Scoped to {displayName}. Only what they published appears here — this page shows no
        signed-in account content.
      </SEIInlineAlert>

      {titles === null ? (
        <LibraryPanel padding="md">
          <p className="text-neutral-300" data-cave-public-empty>
            {displayName} keeps their {noun} private.
          </p>
        </LibraryPanel>
      ) : titles.length === 0 ? (
        <LibraryPanel padding="md">
          <p className="text-neutral-300" data-cave-public-empty>
            {displayName} has not published any {noun} yet.
          </p>
        </LibraryPanel>
      ) : (
        <LibraryPanel padding="md">
          <p className="font-sc text-[10px] uppercase tracking-widest text-neutral-400">
            Published {noun} · {titles.length}
          </p>
          <ul className="mt-3 space-y-2">
            {titles.map(title => (
              <li
                key={title}
                className="min-w-0 border-b border-white/10 pb-2 text-sm text-neutral-200 [overflow-wrap:anywhere] last:border-b-0 last:pb-0"
                data-cave-public-title
              >
                {title}
              </li>
            ))}
          </ul>
        </LibraryPanel>
      )}

      <p className="font-sans text-xs italic text-neutral-400">
        Titles only. The public {kind === 'stories' ? 'Stories' : 'Relics'} page is not designed
        yet; reading, inspection, attunement, and rewards stay in the private Cave.
      </p>
    </div>
  );
}
