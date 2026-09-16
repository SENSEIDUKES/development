import { zipSync, strToU8 } from 'fflate';

/**
 * Minimal Word documents for SPP import tests. Only the parts the importer
 * reads are produced; nothing here is a packaging tool.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

export const docxParagraph = (text: string, style?: string, list?: { level: number }) => {
  const properties = style || list
    ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${list ? `<w:numPr><w:ilvl w:val="${list.level}"/><w:numId w:val="1"/></w:numPr>` : ''}</w:pPr>`
    : '';
  return `<w:p>${properties}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
};

/** Wraps already-built paragraph XML in a document part and zips it. */
export const buildDocx = (bodyXml: string, files: Record<string, string> = {}) => zipSync({
  '[Content_Types].xml': strToU8(CONTENT_TYPES),
  'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`),
  ...Object.fromEntries(Object.entries(files).map(([path, value]) => [path, strToU8(value)])),
});

/** A Word archive whose only part is unrelated, so no document text exists. */
export const buildDocxWithoutDocumentPart = () => zipSync({
  '[Content_Types].xml': strToU8(CONTENT_TYPES),
  'word/settings.xml': strToU8('<settings/>'),
});
