export interface ProgressLabelProps {
  label: string;
  /** Measured generation progress, 0–100; null when unknown. */
  progress: number | null;
}

/** Names the current work and shows a percentage only when supplied by the host. */
export function ProgressLabel({ label, progress }: ProgressLabelProps) {
  if (!label) return null;
  return <div className="progress-label mb-2 inline-flex items-center gap-2.5 rounded-full border px-4 py-1 backdrop-blur-sm">
    <span className="progress-label-title font-sans text-xs sm:text-sm tracking-wide font-medium">{label}</span>
    {progress !== null && <>
      <span aria-hidden="true" className="progress-label-divider h-3 w-px" />
      <span className="progress-label-title font-sans text-xs sm:text-sm tracking-wide font-semibold">{Math.round(progress)}%</span>
    </>}
  </div>;
}
