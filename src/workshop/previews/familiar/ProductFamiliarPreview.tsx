import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FamiliarCompanion, FamiliarRecall, type FamiliarCompanionProps } from '@seihouse/library/familiar';
import { WorkspaceHeaderAccessoryProvider } from '@seihouse/library/shell';
import { EnergyClientProvider, createHttpEnergyClient } from '@seihouse/library/energy';
import { defaultFamiliar, familiarCatalogueEntry } from '../../../host/familiar/catalogue';
import { developmentIdentityToken } from '../../../server/identity/authentication';
import { getPreviewScenario } from '../user-profile/previewData';
import { DEFAULT_USER_PROFILE_PREVIEW_STATE, type UserProfilePreviewState } from '../user-profile/previewStates';
import './productFamiliarPreview.css';

type Selection = { uid: string | null; familiarId?: string; familiarSize?: number };
const SelectionContext = createContext<{ selection: Selection; reportProfile: (selection: Selection) => void; minimized: boolean; setMinimized: (minimized: boolean) => void } | null>(null);
const SurfaceContext = createContext(false);
export const PREVIEW_FAMILIAR_ID = defaultFamiliar.definition.id;

/**
 * Preview-only projection of the active profile, never a second profile/ledger store.
 * The companion starts minimized to the header recall; the reader summons it explicitly.
 */
export function ProductFamiliarSession({ children, initialState = DEFAULT_USER_PROFILE_PREVIEW_STATE, initialFamiliarId = PREVIEW_FAMILIAR_ID, initiallyMinimized = true }: { children: ReactNode; initialState?: UserProfilePreviewState; initialFamiliarId?: string; initiallyMinimized?: boolean }) {
  const parent = useContext(SelectionContext);
  const [minimized, setMinimized] = useState(initiallyMinimized);
  const [selection, reportProfile] = useState<Selection>(() => ({
    uid: getPreviewScenario(initialState).currentUser?.uid ?? null,
    familiarId: initialFamiliarId,
  }));
  useEffect(() => setMinimized(initiallyMinimized), [selection.uid, initiallyMinimized]);
  const value = useMemo(() => ({ selection, reportProfile, minimized, setMinimized }), [selection, minimized]);
  const client = useMemo(() => createHttpEnergyClient({ token: () => selection.uid ? developmentIdentityToken(selection.uid) : null }), [selection.uid]);
  if (parent) return <>{children}</>;
  return <SelectionContext.Provider value={value}>
    <EnergyClientProvider client={client}>
      <WorkspaceHeaderAccessoryProvider accessory={<ProductFamiliarRecall />}>{children}</WorkspaceHeaderAccessoryProvider>
    </EnergyClientProvider>
  </SelectionContext.Provider>;
}

/** Access the preview's active profile projection and companion visibility controls. */
export function useProductFamiliarPreview() { return useContext(SelectionContext); }

/** Offer recall only for an authenticated preview account with the known selection. */
function ProductFamiliarRecall() {
  const context = useProductFamiliarPreview();
  const familiar = familiarCatalogueEntry(context?.selection.familiarId)?.definition;
  if (!context?.minimized || !context.selection.uid || !familiar) return null;
  return <FamiliarRecall key={`${context.selection.uid}:${familiar.id}`} familiar={familiar} onRecall={() => context.setMinimized(false)} />;
}

/** Workshop host adapter for SEN surfaces that expose a neutral header slot. */
export function ProductFamiliarHeaderAccessory() {
  return <ProductFamiliarRecall />;
}

/** Restrict standalone previews to their canvas; an embedded app owns one viewport companion. */
export function ProductFamiliarSurface({ children, viewport = false, headerRecall = false, activity, animation, paused, bottomInset }: {
  children: ReactNode; viewport?: boolean; headerRecall?: boolean;
} & Pick<FamiliarCompanionProps, 'activity' | 'animation' | 'paused' | 'bottomInset'>) {
  const parentSurface = useContext(SurfaceContext);
  const context = useProductFamiliarPreview();
  const boundary = useRef<HTMLDivElement>(null);
  const uid = context?.selection.uid;
  const familiar = familiarCatalogueEntry(context?.selection.familiarId)?.definition;
  if (parentSurface) return <>{children}</>;
  return <SurfaceContext.Provider value={true}>
    <div ref={boundary} className="product-familiar-surface">
      {!headerRecall && context?.minimized && <div className="product-familiar-recall" aria-label="Familiar controls"><ProductFamiliarRecall /></div>}
      {children}
      {uid && familiar &&
        <FamiliarCompanion key={`${uid}:${familiar.id}`} familiar={familiar} boundaryRef={viewport ? undefined : boundary} activity={activity} animation={animation} paused={paused}
          size={context.selection.familiarSize} minimized={context.minimized} onMinimize={() => context.setMinimized(true)} bottomInset={bottomInset} />
      }
    </div>
  </SurfaceContext.Provider>;
}
