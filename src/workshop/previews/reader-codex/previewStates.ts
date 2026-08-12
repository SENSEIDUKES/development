export type ReaderCodexPage =
  | 'portraits'
  | 'karma'
  | 'power'
  | 'artifacts'
  | 'fate'
  | 'lore';

export interface ReaderCodexPreviewState {
  id: ReaderCodexPage;
  label: string;
  sourceTabLabel: string;
}

export const readerCodexPages: ReaderCodexPreviewState[] = [
  { id: 'portraits', label: 'Portraits', sourceTabLabel: 'Portraits' },
  { id: 'karma', label: 'Karma', sourceTabLabel: 'Karma' },
  { id: 'power', label: 'Power Rankings', sourceTabLabel: 'Power Rankings' },
  { id: 'artifacts', label: 'Artifacts', sourceTabLabel: 'Artifacts' },
  { id: 'fate', label: 'Fate', sourceTabLabel: 'Fate' },
  { id: 'lore', label: 'Lore', sourceTabLabel: 'Lore' },
];
