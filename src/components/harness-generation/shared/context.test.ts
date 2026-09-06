import { describe, expect, it } from 'vitest';
import { compileHarnessContext } from './context';
import { createHarnessStory } from './foundation';
import { createEmptyHarnessWorkspaceState } from './repository';
import { appendHarnessCorrection } from './canonicalState';

const fixture = () => {
  const created = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A city follows the tide.' });
  const { state, story, foundation } = created;
  for (let chapterNumber = 1; chapterNumber <= 4; chapterNumber += 1) {
    state.chapters.push({
      id: `chapter-${chapterNumber}`, storyId: story.id, attemptId: `attempt-${chapterNumber}`,
      foundationRevisionId: foundation.id, contextSnapshotId: `context-${chapterNumber}`,
      chapterNumber, title: `Chapter ${chapterNumber}`, titleSource: 'model',
      prose: `Scene ${chapterNumber}. ` + 'The tide rises. '.repeat(80), eventIds: [],
      responseMode: 'json', createdAt: 'a', committedAt: 'b',
    });
  }
  story.head = { nextChapterNumber: 5, lastCommittedChapterId: 'chapter-4' };
  state.canonicalRecords.push({
    id: 'wrong', storyId: story.id, chapterId: 'chapter-1', capabilityId: 'characters', capabilityVersion: '1',
    kind: 'character', label: 'Mara', evidence: 'Mara has blue eyes.', confidence: 'resolved',
    facts: { eyeColor: 'blue' }, createdAt: 'a', warnings: [],
  });
  const corrected = appendHarnessCorrection(state, story.id, {
    kind: 'mark-incorrect', targetRecordIds: ['wrong'], reason: 'That eye color is incorrect.',
  });
  corrected.state.canonicalRecords.push({
    id: 'thread', storyId: story.id, chapterId: 'chapter-4', capabilityId: 'plot-threads', capabilityVersion: '1',
    kind: 'plot-thread', evidence: 'The gate remains sealed.', confidence: 'resolved',
    facts: { state: 'open', description: 'The gate remains sealed.' }, createdAt: 'c', warnings: [],
  });
  return { ...created, state: corrected.state, correction: corrected.correction };
};

describe('Harness context priorities', () => {
  it('reserves correction and latest prose before older chapters or derived records', () => {
    const { state, story, foundation, correction } = fixture();
    const full = compileHarnessContext(state, story, foundation, 'full');
    const cost = (id: string) => full.selectionAudit!.included.find(item => item.sourceRecordIds[0] === id)!.estimatedTokens;
    story.contextPolicy = { recentChapterCount: 3, includeMinorEvents: false,
      maxEstimatedTokens: cost(foundation.id) + cost(correction.id) + cost('chapter-4') };
    const context = compileHarnessContext(state, story, foundation, 'tight');
    expect(context.canonicalContext!.corrections[0]).toMatchObject({
      id: correction.id, targetEvidence: [{ id: 'wrong', evidence: 'Mara has blue eyes.' }],
    });
    expect(context.committedChapters.map(chapter => chapter.chapterNumber)).toEqual([4]);
    expect(context.selectionAudit!.included.map(item => item.sourceKind)).toEqual(['foundation', 'correction', 'chapter-prose']);
    expect(context.selectionAudit!.omitted.find(item => item.sourceRecordIds[0] === 'chapter-3')!.reason).toContain('0 remain');
    expect(context.selectionAudit!.omitted.find(item => item.sourceRecordIds[0] === 'chapter-1')!.reason).toContain('outside');
    expect(full.committedChapters.map(chapter => chapter.chapterNumber)).toEqual([2, 3, 4]);
  });

  it('preserves all corrections and immediate continuation even beyond the soft budget', () => {
    const { state, story, foundation, correction } = fixture();
    state.corrections.push({ ...correction, id: 'newer', reason: 'The latest author instruction.' });
    const full = compileHarnessContext(state, story, foundation, 'full');
    expect(full.canonicalContext!.corrections.map(item => item.id)).toEqual(['newer', correction.id]);
    story.contextPolicy = { recentChapterCount: 3, includeMinorEvents: false,
      maxEstimatedTokens: full.selectionAudit!.included.slice(0, 2).reduce((sum, item) => sum + item.estimatedTokens, 0) };
    const tight = compileHarnessContext(state, story, foundation, 'tight');
    expect(tight.canonicalContext!.corrections.map(item => item.id)).toEqual(['newer', correction.id]);
    expect(tight.committedChapters.map(chapter => chapter.chapterNumber)).toEqual([4]);
    expect(tight.selectionAudit!.included.find(item => item.sourceRecordIds[0] === correction.id)!.reason).toContain('Protected author correction');
    story.contextPolicy.maxEstimatedTokens = 1;
    const tiny = compileHarnessContext(state, story, foundation, 'tiny');
    expect(tiny.foundationRevision).toEqual(foundation);
    expect(tiny.selectionAudit!.included[0].reason).toContain('exceeds the soft selection budget');
    expect(tiny.selectionAudit!.omitted.every(item => item.reason.length > 0)).toBe(true);
    expect(tiny.committedChapters.map(chapter => chapter.chapterNumber)).toEqual([4]);
    expect(tiny.canonicalContext!.corrections.map(item => item.id)).toEqual(['newer', correction.id]);
    expect(tiny.selectionAudit!.totalEstimatedTokens).toBeGreaterThan(story.contextPolicy.maxEstimatedTokens);
  });

  it('freezes alias resolution evidence even when the resolved record is not selected', () => {
    const { state, story, foundation } = fixture();
    const corrected = appendHarnessCorrection(state, story.id, {
      kind: 'resolve-entity', reason: 'Captain refers to Mara.', referenceLabel: 'Captain',
      acceptedAlias: 'Captain', resolvedRecordId: 'wrong',
    });
    const context = compileHarnessContext(corrected.state, story, foundation, 'alias');
    expect(context.canonicalContext!.corrections[0]).toMatchObject({
      acceptedAlias: 'Captain', resolvedRecordId: 'wrong', resolvedEntity: { label: 'Mara' },
    });
    expect(context.canonicalContext!.records.some(record => record.id === 'wrong')).toBe(false);
  });

  it('never fits an old instruction and chapter in place of larger current ones', () => {
    const { state, story, foundation, correction } = fixture();
    state.corrections.push({ ...correction, id: 'large-current',
      reason: 'Mara is now an ally. ' + 'Author explanation. '.repeat(200), createdAt: '2099-01-01' });
    state.chapters[3].prose = 'Latest continuation scene. '.repeat(400);
    story.contextPolicy = { recentChapterCount: 3, includeMinorEvents: false, maxEstimatedTokens: 500 };
    const snapshot = structuredClone(state);
    const context = compileHarnessContext(state, story, foundation, 'tight-current');
    expect(context.canonicalContext!.corrections[0].id).toBe('large-current');
    expect(context.committedChapters.map(chapter => chapter.chapterNumber)).toEqual([4]);
    expect(context.committedChapters[0].prose).toBe(state.chapters[3].prose);
    expect(context.selectionAudit!.omitted.some(item => item.sourceKind === 'correction')).toBe(false);
    expect(context.selectionAudit!.included.filter(item => item.reason.includes('soft selection budget')).length).toBeGreaterThan(0);
    expect(state).toEqual(snapshot);
  });

  it('stops context preparation if the committed story head points to a missing chapter', () => {
    const { state, story, foundation } = fixture();
    state.chapters = state.chapters.filter(chapter => chapter.id !== story.head.lastCommittedChapterId);
    expect(() => compileHarnessContext(state, story, foundation, 'missing'))
      .toThrow('latest committed chapter is missing');
  });
});
