import { expect, it } from 'vitest';
import { materialColors } from './colors';
import { colorParts, cssColors, type MeasuredMaterial } from './model';

it('inventories actual colors and alpha from the material and effect layers, without substitute values', () => {
  const base: MeasuredMaterial = { backgroundColor: 'rgba(7, 9, 11, 0.12)', backgroundImage: 'none', borderColor: 'rgba(214, 189, 135, 0.4)', borderWidth: '1px', boxShadow: 'none', backdropFilter: 'none', color: 'rgb(255, 255, 255)', mutedColor: '#ffffffb8', gradientColors: ['rgb(20, 30, 40)'], rimColors: ['#49c9fa66'], spectrumColors: ['rgba(124, 92, 255, 0.22)'] };
  const groups = materialColors({ 'rainbow-action': base }, { '--color-sen-portal': '#123456' });
  const all = groups.flatMap(group => group.colors);
  for (const value of [base.backgroundColor, base.color, base.borderColor, '#ffffffb8', '#49c9fa66', 'rgb(20, 30, 40)', 'rgba(124, 92, 255, 0.22)', '#123456']) expect(all.some(color => color.value === value)).toBe(true);
  expect(all.some(color => color.value === '#04acff')).toBe(false);
  expect(materialColors({}, {}).flatMap(group => group.colors)).toEqual([]);
});
it('extracts colors without treating angles or opacity numbers as separate colors', () => {
  expect(cssColors('linear-gradient(135deg, #49c9fa66 82%, rgba(4, 172, 255, 0.15), #49c9fa66)')).toEqual(['#49c9fa66', 'rgba(4, 172, 255, 0.15)']);
  expect(colorParts('#49c9fa66')).toEqual({ hex: '#49c9fa', alpha: 102 / 255 });
});
