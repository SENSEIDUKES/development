// @vitest-environment jsdom
import { act, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import { CAPA_SCHEMA, HarnessGenerationController, type HarnessGenerationModelAdapter, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { SppSkillImport } from './SppSkillImport';
import { DOCX_MEDIA_TYPE } from './docxInstructions';
import { SPP_CAPA_EXTENSION } from './sppSkills';
import { buildDocx, docxParagraph } from './fixtures/docxFixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({
    provider: 'gemini',
    configured: true,
    models: [{ id: 'gemini-test', label: 'Gemini test' }],
    defaultModel: 'gemini-test',
  }),
  generate: vi.fn(async () => {
    throw new Error('Generation is not used by this test.');
  }),
};

/** Test-only packages; neither is an authored product skill. */
const authorPackage = (declaredSlot?: string) => createPack({
  name: 'CAPA AUTHOR',
  description: 'Test-only Word instruction package',
  files: [{
    path: 'assets/1-CAPA - AUTHOR.docx',
    mediaType: DOCX_MEDIA_TYPE,
    data: buildDocx([
      docxParagraph('CAPA Author', 'Title'),
      docxParagraph('Hold the reader inside the scene.'),
    ].join('')),
  }],
  ...(declaredSlot ? { extensions: { [SPP_CAPA_EXTENSION]: { slot: declaredSlot } } as never } : {}),
});

/**
 * The host wiring the Workshop uses: one inventory, both import entry points,
 * and the slot importer equipping what it installs.
 */
function SlotImportHost({ repository }: { repository: InMemoryHarnessGenerationRepository }) {
  const [imported, setImported] = useState<HarnessSkillManifest[]>([]);
  const installedSkills = useMemo(() => imported, [imported]);
  return <HarnessGenerationWorkspace
    repository={repository}
    modelAdapter={modelAdapter}
    installedSkills={installedSkills}
    showHarnessInternals
    renderSlotSkillImport={(slot, busy, equip) => (
      <SppSkillImport busy={busy} destinationSlot={slot} onInstall={async skill => {
        setImported(current => [...current.filter(item => item.id !== skill.id), skill]);
        await equip(skill);
      }} />
    )}
  />;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Lets package intake and its state updates finish before assertions. */
const settle = async () => {
  for (let pass = 0; pass < 20; pass += 1) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  }
};

const slotImporters = () => [...container.querySelectorAll('details')]
  .filter(details => details.querySelector('summary')?.textContent?.startsWith('Upload SPP to '));

const uploadInto = async (slotLabel: string, bytes: Uint8Array) => {
  const importer = slotImporters().find(details => details.querySelector('summary')?.textContent === `Upload SPP to ${slotLabel}`)!;
  const input = importer.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([new Uint8Array(bytes)], 'CAPA-AUTHOR.spp');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  // Intake resolves asynchronously before the instruction file is previewed.
  await settle();
  return importer;
};

const install = async (importer: HTMLDetailsElement) => {
  const button = [...importer.querySelectorAll('button')]
    .find(item => item.textContent?.includes('Install and equip in '))!;
  await act(async () => { button.click(); });
  await settle();
};

describe('Uploading an SPP directly from a CAPA slot', () => {
  it('exposes a direct SPP upload on every hand-equipped CAPA slot', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    await setup.createStory({ title: 'Slow Fire', premise: 'A rebellion begins with one missing ledger.' });

    await act(async () => root.render(<SlotImportHost repository={repository} />));

    expect(slotImporters().map(details => details.querySelector('summary')!.textContent))
      .toEqual(CAPA_SCHEMA.filter(slot => !slot.managedBy).map(slot => `Upload SPP to ${slot.label}`));
    // Fate, Accessibility and Translation follow Story Settings; nothing is uploaded into them from a story.
    for (const managed of ['Fate', 'Accessibility', 'Translation']) {
      expect(slotImporters().some(details => details.querySelector('summary')!.textContent === `Upload SPP to ${managed}`)).toBe(false);
    }
  });

  it('keeps Translation installable from the inventory importer, while Fate and Accessibility take no packages', async () => {
    await act(async () => root.render(<SppSkillImport busy={false} onInstall={vi.fn()} />));
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File([new Uint8Array(await authorPackage())], 'CAPA-AUTHOR.spp')], configurable: true });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await settle();

    const slotChoice = [...container.querySelectorAll('select')].find(select => select.previousElementSibling?.textContent === 'Install for skill slot')!;
    expect([...slotChoice.options].map(option => option.textContent)).toEqual(['Author', 'Pacing', 'Continuity', 'Style', 'Translation']);
  });

  it('installs and equips a matching package through its slot in one flow', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ title: 'Slow Fire', premise: 'A rebellion begins with one missing ledger.' });

    await act(async () => root.render(<SlotImportHost repository={repository} />));
    const importer = await uploadInto('Author', await authorPackage('author'));

    expect(importer.textContent).toContain('Validated: CAPA AUTHOR');
    expect(importer.textContent).toContain('Hold the reader inside the scene.');
    await install(importer);

    expect(importer.querySelector('[role="alert"]')).toBeNull();
    expect(importer.textContent).toContain('Installed and equipped in the Author slot.');
    // The story is equipped without a separate global install and return trip.
    const saved = repository.snapshot().stories.find(item => item.id === story.id)!;
    expect(saved.skillLoadout?.author?.id).toContain('assets%2F1-CAPA%20-%20AUTHOR.docx');
    expect(container.querySelector<HTMLSelectElement>('#harness-skill-author')?.value)
      .toBe(`${saved.skillLoadout!.author!.id}@${saved.skillLoadout!.author!.version}`);
    expect(container.textContent).toContain('AuthorEquipped');
  });

  it('refuses a package that declares another slot and leaves the slot empty', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ title: 'Slow Fire', premise: 'A rebellion begins with one missing ledger.' });

    await act(async () => root.render(<SlotImportHost repository={repository} />));
    const importer = await uploadInto('Style', await authorPackage('author'));
    await install(importer);

    expect(importer.querySelector('[role="alert"]')?.textContent)
      .toBe('CAPA AUTHOR declares the Author CAPA slot and cannot be installed into the Style slot.');
    expect(repository.snapshot().stories.find(item => item.id === story.id)?.skillLoadout?.style).toBeUndefined();
  });
});
