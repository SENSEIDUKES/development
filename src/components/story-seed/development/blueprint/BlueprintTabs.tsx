import type { KeyboardEvent } from 'react';
import { Globe2, Map, ScrollText, Users, type LucideIcon } from 'lucide-react';

export type BlueprintTabId = 'story' | 'cast' | 'world' | 'arcs';

export const BLUEPRINT_TABS: readonly { id: BlueprintTabId; label: string; icon: LucideIcon }[] = [
  { id: 'story', label: 'Story', icon: ScrollText },
  { id: 'cast', label: 'Cast', icon: Users },
  { id: 'world', label: 'World', icon: Globe2 },
  { id: 'arcs', label: 'Arcs', icon: Map },
];

export const blueprintTabId = (tab: BlueprintTabId) => `blueprint-tab-${tab}`;
export const blueprintPanelId = (tab: BlueprintTabId) => `blueprint-panel-${tab}`;

/**
 * The Blueprint's four pages, pinned at the top like the Seed creator's step
 * strip: Story, Cast, World and Arcs. A tablist, so arrow keys move along it.
 */
export function BlueprintTabs({ tab, onSelect }: { tab: BlueprintTabId; onSelect: (tab: BlueprintTabId) => void }) {
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = BLUEPRINT_TABS.findIndex(entry => entry.id === tab);
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? BLUEPRINT_TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = BLUEPRINT_TABS[(next + BLUEPRINT_TABS.length) % BLUEPRINT_TABS.length];
    onSelect(target.id);
    document.getElementById(blueprintTabId(target.id))?.focus();
  };
  return (
    <div className="bp-tabs-strip" data-blueprint-tabs>
      <div role="tablist" aria-label="World Blueprint" className="bp-tabs">
        {BLUEPRINT_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} id={blueprintTabId(id)} type="button" role="tab" className="bp-tab"
            aria-selected={tab === id} aria-controls={blueprintPanelId(id)} tabIndex={tab === id ? 0 : -1}
            onClick={() => onSelect(id)} onKeyDown={move}>
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
