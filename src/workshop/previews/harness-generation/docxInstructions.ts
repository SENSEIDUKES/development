import { unzipSync } from 'fflate';

/**
 * Word (.docx) instruction text for the SPP importer.
 *
 * A .docx is an OOXML archive, so the readable document text is extracted here
 * and only that text ever becomes a CAPA Skill's instructions. The archive
 * bytes, its XML, and any embedded media never reach a skill manifest or the
 * CAPA Prompt.
 */

export const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Where Word keeps the main document part; nothing else is read. */
const DOCUMENT_PART = 'word/document.xml';

/** Media types a packer may record for a Word document it did not sniff. */
const AMBIGUOUS_MEDIA_TYPES = ['application/octet-stream', 'application/zip'];

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * Word documents are recognized by content, never by file name: a ZIP whose
 * uncompressed entry names include the main document part.
 */
export function looksLikeDocx(bytes: Uint8Array): boolean {
  if (bytes.length < ZIP_MAGIC.length || ZIP_MAGIC.some((byte, index) => bytes[index] !== byte)) return false;
  const names = new TextDecoder('latin1').decode(bytes);
  return names.includes(DOCUMENT_PART);
}

/** True when this validated package entry should be read as a Word document. */
export const isDocxInstructionFile = (mediaType: string, bytes: Uint8Array) =>
  mediaType === DOCX_MEDIA_TYPE || (AMBIGUOUS_MEDIA_TYPES.includes(mediaType) && looksLikeDocx(bytes));

const XML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

const decodeXmlText = (value: string) => value.replace(
  /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g,
  (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return XML_ENTITIES[entity] ?? match;
  },
);

/** Runs, tabs and line breaks in the order Word stores them. */
const PARAGRAPH_CONTENT = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*>|<w:br\b[^>]*>/g;
const PARAGRAPH = /<w:p(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/w:p>)/g;
const PARAGRAPH_STYLE = /<w:pStyle\b[^>]*w:val="([^"]*)"/;
const LIST_LEVEL = /<w:ilvl\b[^>]*w:val="([0-9]+)"/;

interface DocxBlock {
  kind: 'heading' | 'list' | 'paragraph';
  text: string;
}

const headingLevel = (style: string | undefined): number | undefined => {
  if (!style) return undefined;
  if (/^title$/i.test(style)) return 1;
  if (/^subtitle$/i.test(style)) return 2;
  const heading = /^heading\s*([1-6])$/i.exec(style);
  return heading ? Number(heading[1]) : undefined;
};

const paragraphText = (inner: string) => [...inner.matchAll(PARAGRAPH_CONTENT)]
  .map(match => (match[1] !== undefined
    ? decodeXmlText(match[1])
    : match[0].startsWith('<w:tab') ? '\t' : '\n'))
  .join('')
  .replace(/[ \t]+$/gm, '')
  .trim();

/**
 * Reads the document body into Markdown-shaped text: headings, list items and
 * paragraphs in their original reading order.
 */
export function readDocxDocumentText(xml: string): string {
  const blocks: DocxBlock[] = [];
  for (const paragraph of xml.matchAll(PARAGRAPH)) {
    const inner = paragraph[1] ?? '';
    const text = paragraphText(inner);
    if (!text) continue;
    const propertiesEnd = inner.indexOf('</w:pPr>');
    const properties = propertiesEnd === -1 ? '' : inner.slice(0, propertiesEnd);
    const level = headingLevel(PARAGRAPH_STYLE.exec(properties)?.[1]);
    if (level !== undefined) {
      blocks.push({ kind: 'heading', text: `${'#'.repeat(level)} ${text}` });
      continue;
    }
    if (/<w:numPr[\s>/]/.test(properties)) {
      const indent = Number(LIST_LEVEL.exec(properties)?.[1] ?? 0);
      blocks.push({ kind: 'list', text: `${'  '.repeat(Math.min(indent, 6))}- ${text}` });
      continue;
    }
    blocks.push({ kind: 'paragraph', text });
  }
  return blocks
    .map((block, index) => (index === 0
      ? block.text
      : `${block.kind === 'list' && blocks[index - 1].kind === 'list' ? '\n' : '\n\n'}${block.text}`))
    .join('')
    .trim();
}

/**
 * Extracts the readable text of a validated Word document. Throws a message the
 * importer can show for archives that are malformed, unreadable, or empty.
 */
export function extractDocxInstructionText(bytes: Uint8Array): string {
  let part: Uint8Array | undefined;
  try {
    part = unzipSync(bytes, { filter: file => file.name === DOCUMENT_PART })[DOCUMENT_PART];
  } catch {
    throw new Error('This Word document could not be opened. Save it again as .docx and repackage it.');
  }
  if (!part) throw new Error('This Word document has no readable document part. Save it again as .docx and repackage it.');
  let xml: string;
  try {
    xml = new TextDecoder('utf-8', { fatal: true }).decode(part);
  } catch {
    throw new Error('This Word document could not be decoded as UTF-8 text.');
  }
  const text = readDocxDocumentText(xml);
  if (!text) throw new Error('This Word document contains no readable text.');
  return text;
}
