import { useId, useMemo, useState } from 'react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { CAPA_SCHEMA, type HarnessSkillApplication, type HarnessSkillManifest, type HarnessSkillSlotId } from '@seihouse/sen/harness-generation';
import { DEFAULT_SEN_LANGUAGE_CODE, SEN_LANGUAGES, type SenLanguageCode } from '@seihouse/sen';
import type { PackContent } from 'seihouse-productions-package';
import {
  createHarnessSppSkill,
  defaultHarnessSppInstructionPath,
  harnessSppInstructionFiles,
  inspectHarnessSpp,
  readHarnessSppText,
} from './sppSkills';

/** The two jobs a language package can do; each is chosen, never assumed. */
const TRANSLATION_APPLICATIONS: ReadonlyArray<{ id: HarnessSkillApplication; label: string }> = [
  { id: 'generation', label: 'Generation (write canonical chapters)' },
  { id: 'reader', label: 'Reader (translate for a reader)' },
];

/**
 * The SPP import flow. With `destinationSlot` it is opened from a CAPA slot:
 * the destination is locked to that slot and the host equips the installed
 * skill for the open story. Without it, the same flow installs into the slot
 * the author picks.
 */
export function SppSkillImport({ busy, destinationSlot, onInstall }: {
  busy: boolean;
  destinationSlot?: HarnessSkillSlotId;
  onInstall: (skill: HarnessSkillManifest) => void | Promise<void>;
}) {
  const [content, setContent] = useState<PackContent>();
  const [path, setPath] = useState('');
  const [preview, setPreview] = useState('');
  const [chosenSlot, setChosenSlot] = useState<HarnessSkillSlotId>('style');
  const slot = destinationSlot ?? chosenSlot;
  const [targetLanguage, setTargetLanguage] = useState<SenLanguageCode>(DEFAULT_SEN_LANGUAGE_CODE);
  const [applications, setApplications] = useState<HarnessSkillApplication[]>(['generation']);
  const [glossaryPath, setGlossaryPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const disabled = busy || loading || installing;
  const destinationLabel = destinationSlot
    ? CAPA_SCHEMA.find(item => item.id === destinationSlot)?.label ?? destinationSlot
    : '';
  const instructionFiles = useMemo(() => (content ? harnessSppInstructionFiles(content) : []), [content]);
  // Every CAPA slot can host its own importer, so field ids stay unique.
  const prefix = useId();
  const fieldId = (field: string) => `${prefix}-${field}`;
  const titleId = fieldId('title');
  const jsonFiles = useMemo(
    () => content?.manifest.files.filter(file => file.mediaType === 'application/json') ?? [],
    [content],
  );

  async function upload(file: File) {
    setLoading(true); setContent(undefined); setPath(''); setPreview(''); setGlossaryPath(''); setError(''); setMessage('');
    try {
      const next = await inspectHarnessSpp(file);
      setContent(next);
      // Only an unambiguous package preselects its instruction file. Several
      // eligible files always wait for an explicit choice.
      selectFile(defaultHarnessSppInstructionPath(next), next);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The package could not be read.'); }
    finally { setLoading(false); }
  }

  function selectFile(nextPath: string, source = content) {
    setPath(nextPath); setPreview(''); setError(''); setMessage('');
    if (!source || !nextPath) return;
    try { setPreview(readHarnessSppText(source, nextPath)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be decoded.'); }
  }

  async function install() {
    if (!content) return;
    setInstalling(true); setMessage('');
    try {
      await onInstall(createHarnessSppSkill(content, path, slot, slot === 'translation'
        ? { targetLanguage, applications, ...(glossaryPath ? { glossaryPath } : {}) }
        : undefined));
      setError('');
      setMessage(destinationSlot
        ? `Installed and equipped in the ${destinationLabel} slot.`
        : slot === 'translation'
          ? 'Installed. Stories written in this language load it automatically.'
          : 'Installed. Choose this skill in the story’s matching slot to activate it.');
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The skill could not be saved.'); }
    finally { setInstalling(false); }
  }

  return <LibraryPanel as="section" padding="md" aria-labelledby={titleId}>
    <h2 id={titleId} className="font-display text-xl text-white">{destinationSlot ? `Upload SPP to ${destinationLabel}` : 'Import SPP skill'}</h2>
    <p className="mt-2 text-sm text-neutral-400">{destinationSlot
      ? `Upload a package, choose its instruction file, then install and equip it in the ${destinationLabel} slot for this story.`
      : 'Upload a package, inspect its files, then install selected instructions in this browser. Equip the skill in a story slot below to use it for generation.'}</p>
    <label className="mt-4 block text-sm text-neutral-300" htmlFor={fieldId('upload')}>SPP package</label>
    <input id={fieldId('upload')} type="file" accept=".spp" disabled={disabled} className="mt-2 block w-full min-w-0 text-sm text-neutral-300"
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file); }} />
    {loading && <p role="status">Validating package…</p>}
    {error && <p role="alert" className="mt-3 whitespace-pre-wrap break-words text-sm text-human">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-cyan-200">{message}</p>}
    {content && <div className="mt-4 min-w-0 space-y-3">
      <p className="break-words text-sm text-cyan-100">Validated: {content.manifest.name} · {content.manifest.version}</p>
      <p className="break-all text-xs text-neutral-400">Package ID: {content.manifest.id}</p>
      <details><summary className="cursor-pointer text-sm text-neutral-300">Manifest and files ({content.manifest.files.length})</summary>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-neutral-400">{JSON.stringify(content.manifest, null, 2)}</pre>
      </details>
      <label className="block text-sm text-neutral-300" htmlFor={fieldId('file')}>Instruction file</label>
      <select id={fieldId('file')} value={path} disabled={disabled} onChange={event => selectFile(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg bg-neutral-900 px-3 text-sm text-white">
        <option value="">Choose a file to inspect</option>
        {content.manifest.files.map(file => <option key={file.path} value={file.path}>{file.path} ({file.mediaType})</option>)}
      </select>
      <p className="text-xs text-neutral-500">{instructionFiles.length === 0
        ? 'This package has no plain text, Markdown or Word (.docx) file to install as instructions.'
        : instructionFiles.length === 1
          ? 'This package carries one instruction file. Word documents are installed as their extracted text.'
          : `This package carries ${instructionFiles.length} instruction files. Choose which one to install.`}</p>
      {preview && <>
        <pre aria-label="Selected instruction contents" className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/20 p-3 text-xs text-neutral-300">{preview}</pre>
        {destinationSlot
          ? <p className="text-sm text-neutral-300">Installing for the <span className="text-cyan-100">{destinationLabel}</span> slot. A package that declares another CAPA slot is rejected.</p>
          : <>
            <label className="block text-sm text-neutral-300" htmlFor={fieldId('slot')}>Install for skill slot</label>
            <select id={fieldId('slot')} value={slot} disabled={disabled} onChange={event => {
              setChosenSlot(event.target.value as HarnessSkillSlotId); setError(''); setMessage('');
            }} className="min-h-11 w-full rounded-lg bg-neutral-900 px-3 text-sm text-white">
              {/* Installable is not equippable: Translation packages install here
                  and load from a story's Story Language, never by hand. */}
              {CAPA_SCHEMA.filter(item => item.installable).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </>}

        {/* A Translation skill declares its language explicitly. Nothing is
            inferred from the package, file name, or instruction text. */}
        {slot === 'translation' && <>
          <label className="block text-sm text-neutral-300" htmlFor={fieldId('language')}>Target language (required)</label>
          <select id={fieldId('language')} value={targetLanguage} disabled={disabled}
            onChange={event => { setTargetLanguage(event.target.value as SenLanguageCode); setError(''); setMessage(''); }}
            className="min-h-11 w-full rounded-lg bg-neutral-900 px-3 text-sm text-white">
            {SEN_LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
          <fieldset className="min-w-0">
            <legend className="text-sm text-neutral-300">Where this language package may be used (required)</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {TRANSLATION_APPLICATIONS.map(option => (
                <label key={option.id} className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    id={fieldId(`application-${option.id}`)}
                    type="checkbox"
                    disabled={disabled}
                    checked={applications.includes(option.id)}
                    onChange={event => {
                      setApplications(current => (event.target.checked
                        ? [...current, option.id]
                        : current.filter(value => value !== option.id)));
                      setError(''); setMessage('');
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-500">Generation writes canonical chapters in this language. Reader translates an existing chapter into it for a reader. Neither is inferred from the package.</p>
          </fieldset>
          <label className="block text-sm text-neutral-300" htmlFor={fieldId('glossary')}>Glossary resource (optional)</label>
          <select id={fieldId('glossary')} value={glossaryPath} disabled={disabled}
            onChange={event => { setGlossaryPath(event.target.value); setError(''); setMessage(''); }}
            className="min-h-11 w-full rounded-lg bg-neutral-900 px-3 text-sm text-white">
            <option value="">No glossary resource</option>
            {jsonFiles.map(file => <option key={file.path} value={file.path}>{file.path}</option>)}
          </select>
          <p className="text-xs text-neutral-500">The glossary is validated before installation and stays a reference resource. Only entries a chapter actually uses are added to its Translation instructions.</p>
        </>}

        <LibraryButton type="button" disabled={disabled} onClick={() => void install()}>
          {destinationSlot ? `Install and equip in ${destinationLabel}` : 'Install selected instructions'}
        </LibraryButton>
      </>}
    </div>}
  </LibraryPanel>;
}
