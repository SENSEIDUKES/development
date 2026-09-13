import { useState } from 'react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { HARNESS_SKILL_SLOTS, type HarnessSkillManifest, type HarnessSkillSlotId } from '@seihouse/sen/harness-generation';
import type { PackContent } from 'seihouse-productions-package';
import { createHarnessSppSkill, inspectHarnessSpp, readHarnessSppText } from './sppSkills';

export function SppSkillImport({ busy, onInstall }: { busy: boolean; onInstall: (skill: HarnessSkillManifest) => void }) {
  const [content, setContent] = useState<PackContent>();
  const [path, setPath] = useState('');
  const [preview, setPreview] = useState('');
  const [slot, setSlot] = useState<HarnessSkillSlotId>('style');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const disabled = busy || loading;

  async function upload(file: File) {
    setLoading(true); setContent(undefined); setPath(''); setPreview(''); setError(''); setMessage('');
    try { setContent(await inspectHarnessSpp(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The package could not be read.'); }
    finally { setLoading(false); }
  }

  function selectFile(nextPath: string) {
    setPath(nextPath); setPreview(''); setError(''); setMessage('');
    if (!content || !nextPath) return;
    try { setPreview(readHarnessSppText(content, nextPath)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be decoded.'); }
  }

  return <LibraryPanel as="section" padding="md" aria-labelledby="harness-spp-title">
    <h2 id="harness-spp-title" className="font-display text-xl text-white">Import SPP skill</h2>
    <p className="mt-2 text-sm text-neutral-400">Upload a package, inspect its files, then install selected instructions in this browser. Equip the skill in a story slot below to use it for generation.</p>
    <label className="mt-4 block text-sm text-neutral-300" htmlFor="harness-spp-upload">SPP package</label>
    <input id="harness-spp-upload" type="file" accept=".spp" disabled={disabled} className="mt-2 block w-full min-w-0 text-sm text-neutral-300"
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
      <label className="block text-sm text-neutral-300" htmlFor="harness-spp-file">Instruction file</label>
      <select id="harness-spp-file" value={path} disabled={disabled} onChange={event => selectFile(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg bg-neutral-900 px-3 text-sm text-white">
        <option value="">Choose a file to inspect</option>
        {content.manifest.files.map(file => <option key={file.path} value={file.path}>{file.path} ({file.mediaType})</option>)}
      </select>
      {preview && <>
        <pre aria-label="Selected instruction contents" className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/20 p-3 text-xs text-neutral-300">{preview}</pre>
        <label className="block text-sm text-neutral-300" htmlFor="harness-spp-slot">Install for skill slot</label>
        <select id="harness-spp-slot" value={slot} disabled={disabled} onChange={event => setSlot(event.target.value as HarnessSkillSlotId)} className="min-h-11 w-full rounded-lg bg-neutral-900 px-3 text-sm text-white">
          {HARNESS_SKILL_SLOTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <LibraryButton type="button" disabled={disabled} onClick={() => {
          setMessage('');
          try { onInstall(createHarnessSppSkill(content, path, slot)); setError(''); setMessage('Installed. Choose this skill in the story’s matching slot to activate it.'); }
          catch (cause) { setError(cause instanceof Error ? cause.message : 'The skill could not be saved.'); }
        }}>Install selected instructions</LibraryButton>
      </>}
    </div>}
  </LibraryPanel>;
}
