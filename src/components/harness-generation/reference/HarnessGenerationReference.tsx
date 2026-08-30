/**
 * Harness Generation is a new independent product boundary. There is no
 * production implementation to copy here, and this locked pane intentionally
 * does not import or render the legacy Chapter Generation feature.
 */
export function HarnessGenerationReference() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 text-center text-neutral-300">
      <p className="font-sc text-xs uppercase tracking-[0.24em] text-cyan-200/60">Independent baseline</p>
      <h2 className="mt-3 font-display text-2xl text-white">Harness Generation has no legacy reference pane.</h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        This feature starts from a separate Foundation, durable local story core, and one-call prose boundary.
        The existing Chapter Generation workflow remains independent and is intentionally not mounted here.
      </p>
    </section>
  );
}
