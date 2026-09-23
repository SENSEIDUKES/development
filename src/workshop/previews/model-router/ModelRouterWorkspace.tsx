/**
 * Archived standalone route for the Model Router. The router now opens from
 * the Workshop gear (`ModelRouterGear`); this link keeps working.
 */
import { ModelRouterPanel } from '../../ModelRouterSettings';

export function ModelRouterWorkspace({ endpoint }: { endpoint?: string }) {
  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-xl font-semibold">Model Router</h1>
        <ModelRouterPanel endpoint={endpoint} />
      </div>
    </main>
  );
}
