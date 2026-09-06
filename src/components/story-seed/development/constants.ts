import type { StoryStyle } from '../shared/storyStyle';

export * from '../shared/storyTagCatalog';

// `Fate Survival` is deliberately absent: it is an experience layer owned by
// Story Seed Settings, not a genre a novel can be written in.
export const GENRE_PRESETS = [
  { id: 'Xianxia', name: 'Xianxia', icon: '⚔️' },
  { id: 'Xuanhuan', name: 'Xuanhuan', icon: '🔥' },
  { id: 'LitRPG / System', name: 'System', icon: '⚡' },
  { id: 'Academy Cultivation', name: 'Academy Cultivation', icon: '🏫' },
  { id: 'Kingdom Building', name: 'Kingdom Building', icon: '🏰' },
  { id: 'Crafting / Alchemy', name: 'Crafting/Alchemy', icon: '🧪' },
  { id: 'Beast Taming', name: 'Beast Taming', icon: '🐾' },
  { id: 'Tower Climb', name: 'Tower Climb', icon: '🗼' },
  { id: 'Regression', name: 'Regression', icon: '⏳' },
  { id: 'Urban Cultivation', name: 'Urban Cultivation', icon: '🌃' },
  { id: 'Apocalypse Cultivation', name: 'Apocalypse', icon: '☣️' },
  { id: 'Cosmic Cultivation', name: 'Cosmic', icon: '🌌' },
  { id: 'Political Intrigue', name: 'Political Intrigue', icon: '👑' },
  { id: 'Cozy Slice-of-Life', name: 'Cozy/Slice-of-Life', icon: '🏡' },
  { id: 'Mystery Cultivation', name: 'Mystery', icon: '🔍' }
];

/**
 * Curated system premise examples for the Origin page, keyed by novel
 * tradition (`shared/storyStyle.ts`). While the premise field is empty, one
 * example from the selected Style's bank is shown as ghost text inside the
 * field (the textarea placeholder) to teach the SEN premise style: short,
 * sharp, high-concept hooks with light-novel/webnovel energy — one strange
 * story engine, one escalation promise; never a full synopsis, a paragraph,
 * or a lore dump. Static list: no AI call, no storage. The example remains
 * reference-only placeholder text, so keyboard navigation and user-typed
 * text are never overwritten. (A future user-saved premise bank is a separate
 * feature and is not built from this list.)
 */
export const CURATED_PREMISE_EXAMPLES: Record<StoryStyle, string[]> = {
  chinese: [
    "I Bound the Ruined World's Divine Monsters and Raised Them into Calamities.",
    'I Accidentally Founded a Sect That Ruled the Nine Heaven Realms.',
    'My Broken Meridians Were Actually Seals on an Ancient Calamity God.',
    'I Failed My Heavenly Tribulation, So the Lightning Became My Master.',
    "A Nameless Herb Spirit Cultivated for Ten Thousand Years and Bloomed into Heaven's Cure.",
    "I Inherited a Dead Sect's Library, and the Forbidden Manuals Started Teaching Themselves.",
    'The Young Masters Mocked My Mortal Body Until My Bloodline Remembered the First Immortal.',
  ],
  korean: [
    "I Died as an F-Rank Porter and Regressed as the Tutorial Tower's Hidden Boss.",
    'The Constellations Abandoned Humanity, So the Weakest Hunter Started Sponsoring Monsters.',
    "I Cleared the World's Worst Dungeon by Refusing Every System Quest.",
    'After My Guild Betrayed Me, My Trash Skill Evolved Every Time I Was Killed.',
    'I Was the Last Ranker Alive, So the Tower Sent Me Back to Floor One.',
    'The Gods Streamed My Death for Entertainment, Until My Revenge Became the Main Scenario.',
    'I Bought a Failed Dungeon at Auction and Turned It into the Strongest Hunter Academy.',
  ],
  japanese: [
    "I Reincarnated as the Demon King's Weakest Familiar, but Everyone Thinks I'm the Ancient Hero.",
    'I Was Banished from the Hero Party, Then My Cooking Skill Started Evolving Monsters.',
    'The Weakest Slime in Dungeon Academy Accidentally Built a Monster Kingdom.',
    'I Wanted a Slow Life, but My Farm Keeps Producing Legendary Beasts.',
    'My Useless Support Magic Makes Everyone I Help Obsessed with Protecting Me.',
    'I Opened a Tiny Potion Shop, and the Demon Lord Became My First Regular Customer.',
  ],
};
