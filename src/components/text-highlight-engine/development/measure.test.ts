import { describe, expect, it } from 'vitest';
import { mergeLineRectangles } from './measure';

const rect = (left: number, top: number, width: number, height = 20) => ({ left, top, width, height });

describe('mergeLineRectangles', () => {
  it('draws one piece per stretch of a line, however the browser split it', () => {
    // Text and the inline element around it overlap; a trailing space touches the word before it.
    expect(mergeLineRectangles([rect(10, 0, 40), rect(10, 0, 44), rect(54, 0, 6)])).toEqual([rect(10, 0, 50)]);
  });

  it('keeps separate lines, separate stretches, and boxes of another height apart', () => {
    const lines = [rect(10, 33, 30), rect(10, 0, 30), rect(60, 0, 20), rect(42, 2, 12, 14)];
    expect(mergeLineRectangles(lines)).toEqual([rect(10, 0, 30), rect(60, 0, 20), rect(42, 2, 12, 14), rect(10, 33, 30)]);
  });
});
