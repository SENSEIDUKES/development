import { describe, expect, it } from 'vitest';
import { CHAPTER_MODELS, IMAGE_MODELS, LIVE_MODELS, TTS_MODELS } from '../../../library/model-router/catalog';
import { ENERGY_PRICE_CATALOG } from './energyContracts';
import { ENERGY_USD, GRADED_ENERGY_PRICES, MODEL_ENERGY_GRADES, VOICE_ENERGY_MARGIN, VOICE_USD_PER_1000_CHARACTERS, gradedEnergyPrice, liveTalkEnergy, modelEnergyGrade, voiceEnergyPrice } from './energyGrades';

describe('Energy grades', () => {
  it('prices Mortal the same as the shared catalog, and each grade above the one below', () => {
    const catalog = (id: string) => ENERGY_PRICE_CATALOG.find(entry => entry.actionId === id)?.price;
    expect(GRADED_ENERGY_PRICES.chapter.mortal).toBe(catalog('chapter.generate'));
    expect(GRADED_ENERGY_PRICES.image.mortal).toBe(catalog('image.generate'));
    for (const prices of Object.values(GRADED_ENERGY_PRICES)) {
      expect(prices.mortal).toBeLessThan(prices.immortal);
      expect(prices.immortal).toBeLessThan(prices.heaven);
    }
  });

  it('sorts every chapter, image and live model in the Router into a grade', () => {
    const ungraded = [...CHAPTER_MODELS, ...IMAGE_MODELS, ...LIVE_MODELS].map(model => model.id).filter(id => !Object.hasOwn(MODEL_ENERGY_GRADES, id));
    expect(ungraded).toEqual([]);
  });

  it('charges a premium model more, and an unknown model as Mortal', () => {
    expect(gradedEnergyPrice('chapter', 'openrouter/openai/gpt-6-luna')).toBe(2);
    expect(gradedEnergyPrice('chapter', 'google/gemini-3.8-flash')).toBe(4);
    expect(gradedEnergyPrice('chapter', 'anthropic/claude-opus-5-5')).toBe(8);
    expect(gradedEnergyPrice('image', 'google/gemini-3-pro-image')).toBe(20);
    expect(modelEnergyGrade('someone/new-model')).toBe('mortal');
    expect(modelEnergyGrade(undefined)).toBe('mortal');
  });

  it('charges live talk per started 20 seconds, in whole Energy', () => {
    for (const price of Object.values(GRADED_ENERGY_PRICES['live-minute'])) expect(price % 3).toBe(0);
    expect(liveTalkEnergy('google/gemini-3.8-live', 0)).toBe(0);
    // A quick call is one step.
    expect(liveTalkEnergy('google/gemini-3.8-live', 15)).toBe(1);
    expect(liveTalkEnergy('google/gemini-3.8-live', 30)).toBe(2);
    expect(liveTalkEnergy('google/gemini-3.8-live', 60)).toBe(3);
    expect(liveTalkEnergy('openai/gpt-live-1', 20)).toBe(2);
    expect(liveTalkEnergy('openai/gpt-live-1', 125)).toBe(14);
  });

  it('prices character voices at four times the provider\'s price for what is spoken, in whole Energy', () => {
    expect(ENERGY_USD).toBe(0.02);
    expect(VOICE_ENERGY_MARGIN).toBe(4);
    // 1,000 characters at $0.08 cost SEIHouse 8 cents: 32 cents charged, 16 Energy.
    expect(voiceEnergyPrice(1000, 'eleven_multilingual_v2')).toBe(16);
    expect(voiceEnergyPrice(1000, 'eleven_flash_v2_5')).toBe(8);
    // Rounded up, and a single short line is never free.
    expect(voiceEnergyPrice(985, 'eleven_multilingual_v2')).toBe(16);
    expect(voiceEnergyPrice(1001, 'eleven_multilingual_v2')).toBe(17);
    expect(voiceEnergyPrice(20, 'eleven_multilingual_v2')).toBe(1);
    expect(voiceEnergyPrice(0, 'eleven_multilingual_v2')).toBe(0);
    // A model with no listed price is charged at the dearest one.
    expect(voiceEnergyPrice(1000, 'someone/new-voice')).toBe(16);
    expect(voiceEnergyPrice(1000, undefined)).toBe(16);
    // Every ElevenLabs voice model in the Router has its provider price here.
    const unpriced = TTS_MODELS.filter(model => model.provider === 'elevenlabs').map(model => model.id)
      .filter(id => !Object.hasOwn(VOICE_USD_PER_1000_CHARACTERS, id));
    expect(unpriced).toEqual([]);
  });
});
