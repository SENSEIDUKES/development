import { describe, expect, it } from 'vitest';
import type { SystemEvent } from './types';
import {
  getSystemPromptSurface,
  normalizeFateResultData,
  normalizeSystemPromptRows,
  normalizeWorldNoticeData,
  resolveSystemPromptRoute,
} from './systemPromptPresentation';

describe('System Prompt presentation routing', () => {
  it('uses one structural route for Narrative, Mechanical, World Notice, and Fate', () => {
    const narrative: SystemEvent = {
      kind: 'system_prompt',
      presentation: 'narrative',
      promptType: 'quest_update',
      title: 'Quest Update',
    };
    const mechanical: SystemEvent = {
      kind: 'system_prompt',
      presentation: 'mechanical',
      promptType: 'quest_update',
      title: 'Objective Update',
      rows: [{ label: 'Status', value: 'Active' }],
    };
    const worldNotice: SystemEvent = {
      kind: 'system_prompt',
      presentation: 'world_notice',
      promptType: 'quest_update',
      title: 'GUILD BOUNTY',
      worldNotice: {
        entries: [{ title: 'Ashfang Direwolf', details: [{ label: 'Reward', value: '80 silver' }] }],
      },
    };
    const fate: SystemEvent = {
      kind: 'fate_system_prompt',
      promptType: 'fate_event',
      title: 'Fate Result',
      fateResult: {
        outcome: 'FATE SCARRED',
        timelineScar: 'The oath remains visible in every future storm.',
        permanentCosts: ['Storm channels remain scarred.'],
      },
    };

    expect(resolveSystemPromptRoute(narrative)).toMatchObject({ presentation: 'narrative' });
    expect(resolveSystemPromptRoute(mechanical)).toMatchObject({ presentation: 'mechanical' });
    expect(resolveSystemPromptRoute(worldNotice)).toMatchObject({
      presentation: 'world_notice',
      worldNotice: { entries: [{ title: 'Ashfang Direwolf' }] },
    });
    expect(resolveSystemPromptRoute(fate)).toMatchObject({
      presentation: 'fate',
      fateResult: { outcome: 'FATE SCARRED' },
    });

    // promptType stays semantic: the three regular forms share its color but
    // use their own presentation-specific renderers.
    const colorCodes = [narrative, mechanical, worldNotice]
      .map(event => getSystemPromptSurface(event, 'A guild message arrives.').meaning.colorCode);
    expect(colorCodes).toEqual(['mainCharacter', 'mainCharacter', 'mainCharacter']);
  });

  it('normalizes loose regular data at the Reader boundary and preserves the legacy fallback', () => {
    const malformedRows = [
      null,
      { label: 'Rank', value: 'Copper' },
      { label: 'Ignored', value: '' },
      { label: 'Strength', value: '18', trend: 'up' },
    ];
    expect(normalizeSystemPromptRows(malformedRows)).toEqual([
      { label: 'Rank', value: 'Copper' },
      { label: 'Strength', value: '18', trend: 'up' },
    ]);

    const legacyMechanical = {
      kind: 'system_prompt',
      promptType: 'progression',
      title: 'Legacy Status',
      rows: malformedRows,
    } as SystemEvent;
    const malformedWorldNoticePayload = { entries: [] };
    const malformedWorldNotice = {
      kind: 'system_prompt',
      presentation: 'world_notice',
      promptType: 'progression',
      title: 'Incomplete Notice',
      rows: malformedRows,
      worldNotice: malformedWorldNoticePayload,
    } as SystemEvent;
    const malformedFatePayload = { outcome: 'FATE SCARRED' };
    const malformedFate = {
      kind: 'fate_system_prompt',
      title: 'Invalid Fate',
      fateResult: malformedFatePayload,
    } as SystemEvent;

    expect(resolveSystemPromptRoute(legacyMechanical)).toMatchObject({
      presentation: 'mechanical',
      rows: [{ label: 'Rank', value: 'Copper' }, { label: 'Strength', value: '18', trend: 'up' }],
    });
    expect(resolveSystemPromptRoute(malformedWorldNotice)).toMatchObject({ presentation: 'mechanical' });
    expect(resolveSystemPromptRoute(malformedFate)).toBeUndefined();
    expect(normalizeWorldNoticeData(malformedWorldNoticePayload)).toBeUndefined();
    expect(normalizeFateResultData(malformedFatePayload)).toBeUndefined();
  });
});
