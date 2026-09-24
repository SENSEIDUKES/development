import { useEffect, useState } from 'react';
import type { IndexedDbHarnessGenerationRepository, PreservedHarnessWorkspaceSummary } from '../../../host/generation/indexedDbRepository';

/** Lists workspaces this build could not read and kept instead of discarding. */
export function PreservedWorkspaceNotice({ repository, refreshKey }: {
  repository: IndexedDbHarnessGenerationRepository; refreshKey: number;
}) {
  const [preserved, setPreserved] = useState<PreservedHarnessWorkspaceSummary[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    repository.listPreservedWorkspaces()
      .then(items => { if (active) setPreserved(items); })
      .catch(() => { if (active) setPreserved([]); });
    return () => { active = false; };
  }, [repository, refreshKey]);

  if (!preserved.length) return null;
  const download = async (item: PreservedHarnessWorkspaceSummary) => {
    setError('');
    try {
      const record = await repository.readPreservedWorkspace(item.key);
      if (!record) throw new Error('missing');
      const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `harness-workspace-${item.key.replace(/[^a-z0-9.-]+/gi, '_')}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('The preserved workspace could not be read.');
    }
  };
  return (
    <section role="status" className="mx-auto mb-4 mt-4 max-w-7xl rounded-lg border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100 sm:px-6">
      <p>This build could not read an earlier HARNESS workspace, so it kept an untouched copy instead of discarding it.</p>
      <ul className="mt-2 space-y-2">
        {preserved.map(item => (
          <li key={item.key} className="flex flex-wrap items-center gap-3">
            <span className="text-amber-100/80">
              {item.schemaVersion === null ? 'Unknown schema' : `Schema ${item.schemaVersion}`} · {item.storyCount} {item.storyCount === 1 ? 'story' : 'stories'} · {item.chapterCount} {item.chapterCount === 1 ? 'chapter' : 'chapters'} · kept {new Date(item.preservedAt).toLocaleString()}
            </span>
            <button type="button" className="min-h-11 rounded border border-amber-300/40 px-3 text-amber-50 hover:bg-amber-400/10" onClick={() => void download(item)}>
              Download preserved workspace
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-red-300">{error}</p>}
    </section>
  );
}
