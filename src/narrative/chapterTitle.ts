/**
 * A chapter title without the chapter label a writer sometimes puts before it
 * ("Chapter 3: The Gate" is "The Gate"). The chapter's number belongs to the
 * HARNESS and the Reader shows it on its own, so a title never repeats it.
 * Labels are read in every SEN story language: "Chapter 3", "Ch. 3",
 * "Capítulo 3", "Bab 3", "Kabanata 3", "Chương 3", "บทที่ 3", "제3장",
 * "第三章" and the like, with digits, Roman numerals or English number words.
 * Empty when the title was only the label.
 */

const NUMBER_WORD = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)';
/** A label word, then a period, a space or the number itself: "Chi" or "Babel" never starts a label. */
const LABEL_WORD = '(?:chapter|ch|cap[ií]tulo|cap|bab|kabanata|chương|บทที่)(?:\\.\\s*|\\s+|(?=\\d))';
const SEPARATOR = '\\s*[:：.．,，\\-–—|·、]\\s*';
/**
 * A number in digits may be followed by a space alone ("Chapter 3 The Gate");
 * a Roman numeral or a number word needs a separator, so "Chapter I Am" stays.
 */
const WORD_LABEL = new RegExp(`^${LABEL_WORD}(?:\\d+(?:${SEPARATOR}|\\s+|$)|(?:[ivxlcdm]+|${NUMBER_WORD}(?:[-\\s]${NUMBER_WORD})*)(?:${SEPARATOR}|$))`, 'iu');
/** CJK and Korean labels: 第三章, 第12話, 제3장, 3장. A space may be the only separator. */
const CJK_LABEL = new RegExp(`^(?:第\\s*[\\d〇零一二三四五六七八九十百千两兩]+\\s*[章話话回節节]|제?\\s*\\d+\\s*[장화])(?:${SEPARATOR}|\\s+|$)`, 'u');

export function chapterTitleText(title: string): string {
  const trimmed = title.trim();
  for (const label of [WORD_LABEL, CJK_LABEL]) {
    const match = trimmed.match(label);
    if (match) return trimmed.slice(match[0].length).trim();
  }
  return trimmed;
}
