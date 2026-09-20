import { describe, expect, it } from 'vitest';
import { compileStoryInformationPacket, projectCurrentStory } from './context';
import { createHarnessStory } from './foundation';
import { createEmptyHarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { appendHarnessCorrection } from './canonicalState';
import { GENERATION_PACKET_BUDGET } from './packetBudget';
import type { HarnessCanonicalRecord } from '@seihouse/sen/harness-generation';

const fixture = (chapterCount = 4) => {
  const created = createHarnessStory(createEmptyHarnessWorkspaceState(), {
    premise: 'A city follows the tide.', title: 'Tidebound', destinedEnding: 'The city anchors itself.', fatePressure: 'mortal',
    sourceSnapshot: { kind: 'story-seed', sourceId: 'seed-9', sourceUpdatedAt: 'a', schemaVersion: 3, seed: { secret: 'SEED SNAPSHOT BODY' } },
  });
  const { state, story, foundation } = created;
  for (let chapterNumber = 1; chapterNumber <= chapterCount; chapterNumber += 1) {
    state.chapters.push({
      id: `chapter-${chapterNumber}`, storyId: story.id, attemptId: `attempt-${chapterNumber}`,
      foundationRevisionId: foundation.id, storyInformationPacketId: `context-${chapterNumber}`,
      chapterNumber, title: `Chapter ${chapterNumber}`, titleSource: 'model',
      prose: `Scene ${chapterNumber}. ` + 'The tide rises. '.repeat(80), paragraphs: [`Scene ${chapterNumber}.`, 'The tide rises. '.repeat(80).trim()],
      metrics: { wordCount: 241, paragraphCount: 2, meetsScaleTarget: false }, eventIds: [],
      ...(chapterNumber === 2 ? {} : { recap: { text: `Recap ${chapterNumber}.`, source: 'model', updatedAt: 'a' } }),
      rhythm: { chapterFunction: 'worldBuilding', nextChapterSuggestions: { progression: `Go ${chapterNumber}`, worldBuilding: `Explore ${chapterNumber}`, conflict: `Fight ${chapterNumber}` } },
      responseMode: 'json', createdAt: 'a', committedAt: 'b', mediaLoadout: { capturedAt: 'a', soundscapes: [], soundCues: [] },
    });
  }
  story.head = { nextChapterNumber: chapterCount + 1, lastCommittedChapterId: `chapter-${chapterCount}` };
  story.hardPins = [{ id: 'p1', text: 'Mara never leaves the city.', createdAt: 'a', updatedAt: 'a' }];
  story.rhythmRecommendation = { fatePressure: 'mortal', fatePressureSource: 'story', forChapterNumber: chapterCount + 1, recommendedFunction: 'conflict', reason: 'Test reason.', recentFunctions: [{ chapterNumber: chapterCount, chapterFunction: 'worldBuilding' }], weights: { progression: 2, worldBuilding: 3, conflict: 1 }, blocked: [], computedAt: 'a' };
  const record = (id: string, chapterId: string, overrides: Partial<HarnessCanonicalRecord>): HarnessCanonicalRecord => ({
    id, storyId: story.id, chapterId, capabilityId: 'characters', capabilityVersion: '1', kind: 'character', label: 'Mara',
    evidence: 'RAW EVIDENCE PASSAGE ' + id, confidence: 'resolved', facts: {}, createdAt: 'a', warnings: [], entityId: 'mara', ...overrides,
  });
  state.canonicalRecords.push(
    record('mara-1', 'chapter-1', { facts: { eyeColor: 'blue', role: 'Courier', description: 'Mara arrives.' } }),
    record('mara-3', 'chapter-3', { facts: { role: 'Captain', description: 'Mara takes command.' } }),
  );
  return { ...created, state };
};

describe('Compact Story Information Packet', () => {
  it('projects Current Story Information from stable Foundation fields without the Story Seed snapshot', () => {
    const { state, story, foundation } = fixture();
    story.steering = [{ id: 's1', direction: 'Keep the tide rising.', mode: 'future', effectiveChapter: 3, createdAt: 'a' }];
    const current = projectCurrentStory(state, story, foundation);
    expect(current).toMatchObject({ title: 'Tidebound', premise: 'A city follows the tide.', originalLanguage: 'en', authorDirections: [{ direction: 'Keep the tide rising.', mode: 'future', effectiveChapter: 3 }], corrections: [] });
    expect(JSON.stringify(current)).not.toContain('SEED SNAPSHOT BODY');
    expect(JSON.stringify(current)).not.toContain('sourceSnapshot');
    expect(current).not.toHaveProperty('destinedEnding');
    expect(current).not.toHaveProperty('fatePressure');
  });

  it('assembles distinct sections: direction, arc, rhythm with the matching suggestion, recaps, and latest canonical state', () => {
    const { state, story, foundation } = fixture();
    story.arcPlans = [{ plan: { arcNumber: 1, goals: [{ id: 'g1', text: 'Anchor the city.', chapters: 100 }] }, effectiveChapter: 1, reason: 'initial' }];
    const packet = compileStoryInformationPacket(state, story, foundation, 'next');
    expect(packet.storyDirection).toEqual({ destinedEnding: 'The city anchors itself.', hardPins: ['Mara never leaves the city.'] });
    expect(packet.arc).toMatchObject({ arcNumber: 1, activeGoal: { id: 'g1' }, completionDeadline: 100, positionInSegment: 5 });
    expect(packet.rhythm).toEqual({ fatePressure: 'mortal', recentFunctions: [{ chapterNumber: 4, chapterFunction: 'worldBuilding' }], recommendedFunction: 'conflict', reason: 'Test reason.', suggestion: 'Fight 4' });
    // Chapter 2 has no recap and is skipped, never replaced by prose.
    expect(packet.previouslyOn).toEqual([{ chapterNumber: 1, title: 'Chapter 1', recap: 'Recap 1.' }, { chapterNumber: 3, title: 'Chapter 3', recap: 'Recap 3.' }, { chapterNumber: 4, title: 'Chapter 4', recap: 'Recap 4.' }]);
    expect(packet.diagnostics.omitted).toContainEqual(expect.objectContaining({ section: 'previouslyOn', label: 'Chapter 2: Chapter 2' }));
    // Latest applicable state: the newest role wins, the older eye color survives, evidence stays home.
    expect(packet.canonicalState.characters).toEqual([{ name: 'Mara', asOfChapter: 3, facts: { eyeColor: 'blue', role: 'Captain', description: 'Mara takes command.' } }]);
    expect(JSON.stringify(packet)).not.toContain('RAW EVIDENCE PASSAGE');
    expect(JSON.stringify(packet)).not.toContain('The tide rises.');
    expect(packet.diagnostics.storage).toMatchObject({ chapters: 4, canonicalRecords: 2, recaps: 3 });
  });

  it('keeps only the latest five recaps and records the older ones as omitted', () => {
    const { state, story, foundation } = fixture(9);
    const packet = compileStoryInformationPacket(state, story, foundation, 'next');
    expect(GENERATION_PACKET_BUDGET.previouslyOnCount).toBe(5);
    expect(packet.previouslyOn.map(entry => entry.chapterNumber)).toEqual([5, 6, 7, 8, 9]);
    expect(packet.diagnostics.omitted.filter(item => item.section === 'previouslyOn' && item.reason.includes('Older'))).toHaveLength(3);
  });

  it('compacts corrections into Current Story Information and keeps their evidence in storage', () => {
    const { state, story, foundation } = fixture();
    const corrected = appendHarnessCorrection(state, story.id, {
      kind: 'correct-fact', targetRecordIds: ['mara-3'], reason: 'Mara was demoted.',
      replacement: { kind: 'character', label: 'Mara', evidence: 'The author says Mara is a deckhand.', facts: { role: 'Deckhand' } },
    });
    const packet = compileStoryInformationPacket(corrected.state, story, foundation, 'next');
    expect(packet.currentStory.corrections).toEqual([{ kind: 'correct-fact', reason: 'Mara was demoted.', targets: ['Mara'], replacement: { kind: 'character', label: 'Mara', facts: { role: 'Deckhand' } } }]);
    expect(JSON.stringify(packet)).not.toContain('The author says Mara is a deckhand.');
    expect(packet.canonicalState.characters[0].facts.role).toBe('Deckhand');
    expect(corrected.state.canonicalRecords.find(record => record.id === 'mara-3')?.supersededByCorrectionId).toBe(corrected.correction.id);
  });

  it('stops packet preparation if the committed story head points to a missing chapter', () => {
    const { state, story, foundation } = fixture();
    state.chapters = state.chapters.filter(chapter => chapter.id !== story.head.lastCommittedChapterId);
    expect(() => compileStoryInformationPacket(state, story, foundation, 'missing'))
      .toThrow('latest committed chapter is missing');
  });
});
