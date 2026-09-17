import { describe, expect, it } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import { zipSync } from 'fflate';
import { assembleCapaPrompt } from '@seihouse/sen/harness-generation';
import { buildDocx, buildDocxWithoutDocumentPart, docxParagraph } from './fixtures/docxFixtures';
import { DOCX_MEDIA_TYPE } from './docxInstructions';
import {
  createHarnessSppSkill,
  declaredHarnessSppSlot,
  defaultHarnessSppInstructionPath,
  harnessSppInstructionFiles,
  inspectHarnessSpp,
  loadHarnessSppSkills,
  readHarnessSppText,
  saveHarnessSppSkill,
  SPP_CAPA_EXTENSION,
  SPP_SKILL_STORAGE_KEY,
} from './sppSkills';

const encoder = new TextEncoder();

const AUTHOR_DOCX = () => buildDocx([
  docxParagraph('CAPA Author', 'Title'),
  docxParagraph('Voice', 'Heading1'),
  docxParagraph('Write with restraint &amp; patience.'),
  docxParagraph('Open the chapter in motion.', undefined, { level: 0 }),
  docxParagraph('Close on a held breath.', undefined, { level: 0 }),
  docxParagraph('Never explain the ending.'),
].join(''));

/** Test-only packages; none of these is an authored product skill. */
const pack = async (
  files: { path: string; data: Uint8Array; mediaType?: string }[],
  extensions?: Record<string, unknown>,
) => inspectHarnessSpp(new Uint8Array(await createPack({
  name: 'CAPA AUTHOR',
  description: 'Test-only Word instruction package',
  files,
  ...(extensions ? { extensions: extensions as never } : {}),
})));

const DOCX_PATH = 'assets/1-CAPA - AUTHOR.docx';

const docxPack = (extensions?: Record<string, unknown>) => pack(
  [{ path: DOCX_PATH, data: AUTHOR_DOCX(), mediaType: DOCX_MEDIA_TYPE }],
  extensions,
);

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('SPP packages carrying Word instructions', () => {
  it('installs a valid Word instruction file as the generation instructions', async () => {
    const content = await docxPack();
    const skill = createHarnessSppSkill(content, DOCX_PATH, 'author');

    expect(skill.slot).toBe('author');
    expect(skill.instructions).toBe([
      '# CAPA Author',
      '',
      '# Voice',
      '',
      'Write with restraint & patience.',
      '',
      '- Open the chapter in motion.',
      '- Close on a held breath.',
      '',
      'Never explain the ending.',
    ].join('\n'));
    // Provenance still identifies the original package entry, not the text.
    expect(skill.source).toMatchObject({ packageId: content.manifest.id, path: DOCX_PATH });
  });

  it('keeps the Word archive out of the CAPA Prompt', async () => {
    const content = await docxPack();
    const skill = createHarnessSppSkill(content, DOCX_PATH, 'author');
    const prompt = assembleCapaPrompt({ skills: [skill], capturedAt: '2026-09-16T00:00:00.000Z' });

    expect(prompt.text).toContain('Write with restraint & patience.');
    for (const marker of ['PK', 'word/document.xml', '<w:t', 'Content_Types', 'base64']) {
      expect(prompt.text).not.toContain(marker);
    }
    // Nothing byte-shaped survives: the instructions are exactly the text.
    expect(JSON.stringify(skill)).not.toContain('word/document.xml');
  });

  it('preserves headings, list items and paragraphs in reading order', async () => {
    const content = await pack([{
      path: 'assets/order.docx',
      data: buildDocx([
        docxParagraph('First paragraph.'),
        docxParagraph('Middle heading', 'Heading2'),
        docxParagraph('Nested item.', undefined, { level: 1 }),
        docxParagraph('Last paragraph.'),
      ].join('')),
      mediaType: DOCX_MEDIA_TYPE,
    }]);

    expect(readHarnessSppText(content, 'assets/order.docx')).toBe([
      'First paragraph.',
      '',
      '## Middle heading',
      '',
      '  - Nested item.',
      '',
      'Last paragraph.',
    ].join('\n'));
  });

  it('recognizes a Word document a packer recorded only as opaque bytes', async () => {
    const content = await pack([
      { path: 'assets/instructions.docx', data: AUTHOR_DOCX(), mediaType: 'application/octet-stream' },
    ]);

    expect(harnessSppInstructionFiles(content).map(file => file.path)).toEqual(['assets/instructions.docx']);
    expect(readHarnessSppText(content, 'assets/instructions.docx')).toContain('# CAPA Author');
  });

  it('rejects empty, malformed and unreadable Word documents with a clear message', async () => {
    const empty = await pack([{ path: 'assets/empty.docx', data: buildDocx(docxParagraph('   ')), mediaType: DOCX_MEDIA_TYPE }]);
    expect(() => readHarnessSppText(empty, 'assets/empty.docx'))
      .toThrow('This Word document contains no readable text.');

    const partless = await pack([{ path: 'assets/partless.docx', data: buildDocxWithoutDocumentPart(), mediaType: DOCX_MEDIA_TYPE }]);
    expect(() => readHarnessSppText(partless, 'assets/partless.docx'))
      .toThrow('This Word document has no readable document part. Save it again as .docx and repackage it.');

    const malformed = await pack([{ path: 'assets/malformed.docx', data: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]), mediaType: DOCX_MEDIA_TYPE }]);
    expect(() => readHarnessSppText(malformed, 'assets/malformed.docx'))
      .toThrow('This Word document could not be opened. Save it again as .docx and repackage it.');

    const undecodable = await pack([{
      path: 'assets/undecodable.docx',
      data: zipSync({ 'word/document.xml': new Uint8Array([0xff, 0xfe, 0xff]) }),
      mediaType: DOCX_MEDIA_TYPE,
    }]);
    expect(() => readHarnessSppText(undecodable, 'assets/undecodable.docx'))
      .toThrow('This Word document could not be decoded as UTF-8 text.');
  });

  it('still rejects a file format that cannot supply instructions', async () => {
    const content = await pack([{ path: 'assets/cover.png', data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }]);

    expect(harnessSppInstructionFiles(content)).toEqual([]);
    expect(() => readHarnessSppText(content, 'assets/cover.png'))
      .toThrow('Only plain text, Markdown and Word (.docx) files can be installed as generation instructions.');
  });

  it('keeps installing Markdown and plain-text packages', async () => {
    const content = await pack([
      { path: 'assets/author.md', data: encoder.encode('# Author\n\nWrite plainly.') },
      { path: 'assets/notes.txt', data: encoder.encode('Keep scenes short.') },
    ]);

    expect(createHarnessSppSkill(content, 'assets/author.md', 'author').instructions).toBe('# Author\n\nWrite plainly.');
    expect(createHarnessSppSkill(content, 'assets/notes.txt', 'style').instructions).toBe('Keep scenes short.');
  });

  it('requires an explicit choice when several files could supply instructions', async () => {
    const content = await pack([
      { path: 'assets/author.md', data: encoder.encode('Write plainly.') },
      { path: DOCX_PATH, data: AUTHOR_DOCX(), mediaType: DOCX_MEDIA_TYPE },
    ]);

    expect(harnessSppInstructionFiles(content).map(file => file.path)).toEqual(['assets/author.md', DOCX_PATH]);
    // No file name wins by default; the host must select one.
    expect(defaultHarnessSppInstructionPath(content)).toBe('');
    expect(() => createHarnessSppSkill(content, '', 'author'))
      .toThrow('Select a file from this validated package.');
  });

  it('preselects the only instruction file a package carries', async () => {
    expect(defaultHarnessSppInstructionPath(await docxPack())).toBe(DOCX_PATH);
  });

  it('installs into the slot its package declares and refuses any other', async () => {
    const content = await docxPack({ [SPP_CAPA_EXTENSION]: { slot: 'author' } });

    expect(declaredHarnessSppSlot(content)).toBe('author');
    expect(createHarnessSppSkill(content, DOCX_PATH, 'author').slot).toBe('author');
    expect(() => createHarnessSppSkill(content, DOCX_PATH, 'style'))
      .toThrow('CAPA AUTHOR declares the Author CAPA slot and cannot be installed into the Style slot.');
  });

  it('rejects a package declaring a slot the CAPA Schema does not define', async () => {
    const content = await docxPack({ [SPP_CAPA_EXTENSION]: { slot: 'media' } });

    expect(() => declaredHarnessSppSlot(content)).toThrow('unsupported CAPA slot');
  });

  it('accepts the slot the host chose when a package declares none', async () => {
    const content = await docxPack();

    expect(declaredHarnessSppSlot(content)).toBeUndefined();
    expect(createHarnessSppSkill(content, DOCX_PATH, 'style').slot).toBe('style');
  });

  it('restores an installed Word skill as text after reload', async () => {
    const content = await docxPack();
    const skill = createHarnessSppSkill(content, DOCX_PATH, 'author');
    const saved = storage();
    saveHarnessSppSkill(saved, [], skill);

    const [restored] = loadHarnessSppSkills(saved);
    expect(restored).toEqual(skill);
    expect(restored.instructions).toContain('# CAPA Author');
    expect(saved.getItem(SPP_SKILL_STORAGE_KEY)).not.toContain('word/document.xml');
  });
});
