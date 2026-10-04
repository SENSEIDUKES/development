import { describe, expect, it } from 'vitest';
import { chapterTitleText } from './chapterTitle';

describe('A chapter title without its chapter label', () => {
  it('drops the label a writer put before the title, in any form', () => {
    // The titles the owner's Goblin test story came back with.
    expect(chapterTitleText('Chapter 3: The Gutter Becomes a Front Line')).toBe('The Gutter Becomes a Front Line');
    expect(chapterTitleText('Chapter 12 — The Western Junction')).toBe('The Western Junction');
    expect(chapterTitleText('Chapter 4 - The Counterflow Equation')).toBe('The Counterflow Equation');
    expect(chapterTitleText('Chapter 5. A Measured Stretch')).toBe('A Measured Stretch');
    expect(chapterTitleText('Chapter 6 The Vein That Remembered')).toBe('The Vein That Remembered');
    expect(chapterTitleText('CHAPTER 7: Ash')).toBe('Ash');
    expect(chapterTitleText('Ch. 8: Ash')).toBe('Ash');
    expect(chapterTitleText('Chapter Three: The Gate')).toBe('The Gate');
    expect(chapterTitleText('Chapter Twenty-One: The Gate')).toBe('The Gate');
    expect(chapterTitleText('Chapter IV: Ash')).toBe('Ash');
  });

  it('reads the label in every SEN story language', () => {
    expect(chapterTitleText('Capítulo 3: El portal')).toBe('El portal');
    expect(chapterTitleText('Bab 3: Gerbang')).toBe('Gerbang');
    expect(chapterTitleText('Kabanata 3: Ang Tarangkahan')).toBe('Ang Tarangkahan');
    expect(chapterTitleText('Chương 3: Cánh cổng')).toBe('Cánh cổng');
    expect(chapterTitleText('บทที่ 3: ประตู')).toBe('ประตู');
    expect(chapterTitleText('第三章 归来')).toBe('归来');
    expect(chapterTitleText('第12話：帰還')).toBe('帰還');
    expect(chapterTitleText('제3장: 귀환')).toBe('귀환');
  });

  it('is empty when the title was only the label, and leaves every other title as it is', () => {
    expect(chapterTitleText('Chapter 3')).toBe('');
    expect(chapterTitleText('Chapter One')).toBe('');
    expect(chapterTitleText('  The Gate  ')).toBe('The Gate');
    // Words that only start like a label are titles.
    expect(chapterTitleText('Chi: The Life Force')).toBe('Chi: The Life Force');
    expect(chapterTitleText('Babel 3: The Tower')).toBe('Babel 3: The Tower');
    expect(chapterTitleText('Chapterhouse: The Order')).toBe('Chapterhouse: The Order');
    expect(chapterTitleText('Chapter I Am Legend')).toBe('Chapter I Am Legend');
    // "3장의 카드" is three cards, not Chapter 3.
    expect(chapterTitleText('3장의 카드')).toBe('3장의 카드');
  });
});
