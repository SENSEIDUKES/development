/**
 * Fast single-pass scan to count words in a string, avoiding array
 * allocations and regex execution overhead.
 */
const isWhitespace = (code: number): boolean =>
  code === 32 ||
  (code >= 9 && code <= 13) ||
  code === 160 ||
  code === 0x1680 ||
  (code >= 0x2000 && code <= 0x200a) ||
  code === 0x2028 ||
  code === 0x2029 ||
  code === 0x202f ||
  code === 0x205f ||
  code === 0x3000 ||
  code === 0xfeff;

export const countWords = (text?: string | null): number => {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    // Fast single-pass scan avoiding string allocations and regex overhead
    const code = text.charCodeAt(i);
    if (!isWhitespace(code)) {
      if (!inWord) {
        inWord = true;
        count++;
      }
    } else {
      inWord = false;
    }
  }
  return count;
};
