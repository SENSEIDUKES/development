import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel } from '../../../presentation';

interface DeferredStorySeedViewProps {
  children: ReactNode;
  label: string;
  variant?: 'page' | 'modal';
}

interface DeferredStorySeedErrorBoundaryProps {
  children: ReactNode;
  label: string;
  variant: 'page' | 'modal';
}

interface DeferredStorySeedErrorBoundaryState {
  error: Error | null;
}

const DeferredStorySeedStatus = ({
  label,
  variant,
}: {
  label: string;
  variant: 'page' | 'modal';
}) => (
  <div className={variant === 'modal' ? 'fixed inset-0 z-[250] grid place-items-center bg-black/70 p-4' : ''}>
    <LibraryPanel padding="lg" className={variant === 'page' ? 'mt-6 min-h-64' : 'w-full max-w-md'}>
      <div className="grid min-h-48 place-items-center text-center" role="status" aria-live="polite">
        <p className="font-sc text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
          {label}
        </p>
      </div>
    </LibraryPanel>
  </div>
);

class DeferredStorySeedErrorBoundary extends Component<
  DeferredStorySeedErrorBoundaryProps,
  DeferredStorySeedErrorBoundaryState
> {
  state: DeferredStorySeedErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): DeferredStorySeedErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Failed to open ${this.props.label}:`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className={this.props.variant === 'modal' ? 'fixed inset-0 z-[250] grid place-items-center bg-black/70 p-4' : ''}>
        <LibraryPanel padding="lg" className={this.props.variant === 'page' ? 'mt-6 min-h-64' : 'w-full max-w-md'}>
          <div className="grid min-h-48 place-items-center text-center" role="alert">
            <div>
              <p className="font-sc text-xs font-bold uppercase tracking-[0.2em] text-red-200">
                {this.props.label} could not be opened.
              </p>
              <LibraryButton className="mt-4" onClick={() => window.location.reload()}>
                Reload
              </LibraryButton>
            </div>
          </div>
        </LibraryPanel>
      </div>
    );
  }
}

/** Stable, layout-sized loading and failure boundary for secondary Seed views. */
export const DeferredStorySeedView = ({ children, label, variant = 'page' }: DeferredStorySeedViewProps) => (
  <DeferredStorySeedErrorBoundary label={label} variant={variant}>
    <Suspense fallback={<DeferredStorySeedStatus label={`Opening ${label}...`} variant={variant} />}>
      {children}
    </Suspense>
  </DeferredStorySeedErrorBoundary>
);
