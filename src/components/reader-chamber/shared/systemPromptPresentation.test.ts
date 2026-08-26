import { describe, expect, it } from 'vitest';
import type { SystemEvent } from './types';
import {
  getSystemPromptSurface,
  normalizeFateResultData,
  normalizeSystemPromptRows,
  normalizeSystemStatusScreen,
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
    expect(resolveSystemPromptRoute(malformedWorldNotice)).toBeUndefined();
    expect(resolveSystemPromptRoute(malformedFate)).toBeUndefined();
    expect(normalizeWorldNoticeData(malformedWorldNoticePayload)).toBeUndefined();
    expect(normalizeFateResultData(malformedFatePayload)).toBeUndefined();
  });

  it('normalizes the mechanical status screen and attaches it only to the mechanical route', () => {
    const statusPayload = {
      level: '24',
      bars: [
        { label: 'HP', value: 780, max: 780, display: '780 / 780', tone: 'health' },
        { label: 'Bad Bar', value: 'x', max: 0, tone: 'glitch' },
        { label: '', value: 62, max: 100, tone: 'progress' },
      ],
      stats: [
        { label: 'VIT', value: '44', delta: 3 },
        { label: 'AGI', value: '31', delta: -2 },
        { label: 'STR', value: '38', delta: 0 },
        { label: '', value: '27' },
      ],
      effects: [
        { name: 'Rain Attunement', detail: 'Qi Recovery', value: '+12/min', tone: 'positive' },
        { name: '', value: 'dropped' },
      ],
      abilities: [
        { name: 'Soul Seam Sight', detail: 'Range 30 paces' },
        { detail: 'nameless' },
      ],
    };
    const statusEvent = {
      kind: 'system_prompt',
      presentation: 'mechanical',
      promptType: 'progression',
      title: 'STATUS // YUN CHE',
      status: statusPayload,
    } as SystemEvent;

    const route = resolveSystemPromptRoute(statusEvent);
    expect(route).toMatchObject({
      presentation: 'mechanical',
      status: {
        level: '24',
        bars: [{ label: 'HP', value: 780, max: 780, display: '780 / 780', tone: 'health' }],
        stats: [
          { label: 'VIT', value: '44', delta: 3 },
          { label: 'AGI', value: '31', delta: -2 },
          { label: 'STR', value: '38' },
        ],
        effects: [{ name: 'Rain Attunement', detail: 'Qi Recovery', value: '+12/min', tone: 'positive' }],
        abilities: [{ name: 'Soul Seam Sight', detail: 'Range 30 paces' }],
      },
    });

    // A status payload never leaks onto a narrative route, and an empty one drops.
    const narrativeRoute = resolveSystemPromptRoute({
      kind: 'system_prompt',
      presentation: 'narrative',
      title: 'Narrative Event',
      status: statusPayload,
    } as SystemEvent);
    expect(narrativeRoute).toMatchObject({ presentation: 'narrative' });
    expect((narrativeRoute as { status?: unknown } | undefined)?.status).toBeUndefined();
    expect(normalizeSystemStatusScreen({ level: '   ', bars: 'no' })).toBeUndefined();
    expect(normalizeSystemStatusScreen(null)).toBeUndefined();
  });
});
