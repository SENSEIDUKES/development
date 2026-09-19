/** Explicit capability ownership. More specific rules win; new source trees fail closed. */
export const ownershipRules = [
  ['src/package/sen/', 'sen', 'public entries'],
  ['src/package/library/', 'library', 'public entries'],
  ['src/presentation/', 'sen', 'neutral presentation'],
  ['src/narrative/', 'sen', 'narrative contracts'],
  ['src/library/', 'library', 'headless Library behavior'],
  ['src/host/', 'host', 'host adapters and records'],
  ['src/components/chapter-generation/shared/types.ts', 'workshop', 'locked-reference adapter'],
  ['src/components/reader-chamber/shared/types.ts', 'workshop', 'locked-reference adapter'],
  ['src/components/reader-chamber/shared/colorCodes.ts', 'workshop', 'locked-reference adapter'],
  ['src/components/reader-chamber/shared/systemPromptPresentation.ts', 'workshop', 'locked-reference adapter'],
  ['src/lib/language.ts', 'sen', 'language'],
  ['src/lib/agents.ts', 'host', 'first-party agents'],
  ['src/lib/senLightNovelAuthorInstructions.ts', 'sen', 'optional author skill'],
  ['src/styles.css', 'workshop', 'preview styles'],
  ['src/audio/', 'sen', 'media'],
  ['src/audio/DevAudioPlayback.tsx', 'workshop', 'preview playback'],
  ['src/audio/libraryCues.ts', 'host', 'first-party catalog records'],
  ['src/audio/data/', 'host', 'first-party catalog records'],
  ['src/audio/mediaPacks.ts', 'library', 'media entitlement policy'],
  ['src/components/arc-goals/', 'sen', 'arc goals'],
  ['src/components/reader-chamber/', 'sen', 'reader'],
  ['src/components/reader-codex/', 'sen', 'codex'],
  ['src/components/harness-generation/', 'sen', 'harness'],
  ['src/components/story-seed/shared/', 'sen', 'story foundation'],
  ['src/components/story-seed/development/', 'library', 'story creation'],
  ['src/components/chapter-generation/', 'workshop', 'legacy diagnostics'],
  ['src/components/chapter-manifestation/shared/', 'sen', 'manifestation contracts'],
  ['src/components/chapter-manifestation/shared/taskCard.ts', 'workshop', 'locked-reference adapter'],
  ['src/components/chapter-manifestation/shared/CompactIndicator.tsx', 'workshop', 'locked-reference adapter'],
  ['src/components/chapter-manifestation/development/', 'library', 'Celestial manifestations'],
  ['src/components/library-shell/', 'library', 'shell'],
  ['src/components/library-presentation/', 'library', 'presentation adapter'],
  ['src/components/library/', 'workshop', 'locked-reference adapter'],
  ['src/components/sen-icons/', 'library', 'Celestial icons'],
  ['src/components/light-novels-home/', 'library', 'home'],
  ['src/components/user-profile/', 'library', 'profile'],
  ['src/components/energy/', 'library', 'energy'],
  ['src/components/dao-pillar/', 'library', 'dao pillar'],
  ['src/components/closed-door-cultivation/', 'library', 'cultivation'],
  ['src/components/relics/', 'library', 'relics'],
  ['src/components/provenance/', 'deferred', 'cross-product provenance (unexported by approval)'],
  ['src/components/card-workshop/', 'workshop', 'card inspection'],
  ['src/server/', 'host', 'backend'],
  ['src/workshop/', 'workshop', 'preview application'],
  ['src/test-utils/', 'test', 'test support'],
  ['src/App.tsx', 'workshop', 'preview router'],
  ['src/main.tsx', 'workshop', 'preview bootstrap'],
  ['src/index.css', 'workshop', 'preview styles'],
  ['src/vite-env.d.ts', 'tooling', 'build declarations'],
  ['src/components/reader-chamber/shared/stubs.ts', 'workshop', 'preview state'],
  ['src/components/reader-chamber/shared/readerPlayback.ts', 'workshop', 'preview playback'],
  ['src/components/reader-chamber/shared/trackLibrary.ts', 'host', 'first-party tracks'],
  ['src/components/reader-codex/shared/appStore.ts', 'workshop', 'preview state'],
  ['src/components/reader-codex/shared/vibration.ts', 'workshop', 'preview haptics'],
  ['src/components/reader-codex/shared/workshopGlossary.ts', 'workshop', 'preview glossary'],
  ['src/components/story-seed/shared/stubs.ts', 'workshop', 'preview state'],
  ['src/components/story-seed/shared/workshopStorySeedStorage.ts', 'workshop', 'preview persistence'],
];

export const requiredCapabilities = {
  sen: ['reader', 'codex', 'story foundation', 'arc goals', 'harness', 'manifestation contracts', 'media'],
  library: ['profile', 'energy', 'cultivation', 'dao pillar', 'relics', 'shell', 'home', 'story creation'],
};

export function ownershipOf(path, rules = ownershipRules) {
  if (/(^|\/)reference\//.test(path)) return { owner: 'workshop', capability: 'locked reference' };
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(path)) return { owner: 'test', capability: 'verification' };
  const rule = rules.filter(([prefix]) => path === prefix || (prefix.endsWith('/') && path.startsWith(prefix)))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return rule ? { owner: rule[1], capability: rule[2] } : undefined;
}
