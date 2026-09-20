import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { FamiliarCompanion, type FamiliarCompanionProps } from '@seihouse/library/familiar';
import { EnergyClientProvider, createHttpEnergyClient } from '@seihouse/library/energy';
import { celestialGuardian } from '../../../host/familiar/celestialGuardian';
import { developmentIdentityToken } from '../../../server/identity/authentication';
import { getPreviewScenario } from '../user-profile/previewData';
import { DEFAULT_USER_PROFILE_PREVIEW_STATE, type UserProfilePreviewState } from '../user-profile/previewStates';

type Selection = { uid: string | null; familiarId?: string };
const SelectionContext = createContext<{ selection: Selection; reportProfile: (selection: Selection) => void } | null>(null);
const SurfaceContext = createContext(false);
export const PREVIEW_FAMILIAR_ID = celestialGuardian.id;

/** Preview-only projection of the active profile, never a second profile/ledger store. */
export function ProductFamiliarSession({ children, initialState = DEFAULT_USER_PROFILE_PREVIEW_STATE }: { children: ReactNode; initialState?: UserProfilePreviewState }) {
  const parent = useContext(SelectionContext);
  const [selection, reportProfile] = useState<Selection>(() => ({
    uid: getPreviewScenario(initialState).currentUser?.uid ?? null,
    familiarId: PREVIEW_FAMILIAR_ID,
  }));
  const value = useMemo(() => ({ selection, reportProfile }), [selection]);
  return <SelectionContext.Provider value={parent ?? value}>{children}</SelectionContext.Provider>;
}

export function useProductFamiliarPreview() { return useContext(SelectionContext); }

/** Restrict standalone previews to their canvas; an embedded app owns one viewport companion. */
export function ProductFamiliarSurface({ children, viewport = false, animation, paused }: {
  children: ReactNode; viewport?: boolean;
} & Pick<FamiliarCompanionProps, 'animation' | 'paused'>) {
  const parentSurface = useContext(SurfaceContext);
  const context = useProductFamiliarPreview();
  const boundary = useRef<HTMLDivElement>(null);
  const uid = context?.selection.uid;
  const client = useMemo(() => createHttpEnergyClient({ token: () => uid ? developmentIdentityToken(uid) : null }), [uid]);
  if (parentSurface) return <>{children}</>;
  return <SurfaceContext.Provider value={true}>
    <div ref={boundary} className="product-familiar-surface">
      {children}
      {uid && context?.selection.familiarId === celestialGuardian.id && <EnergyClientProvider client={client}>
        <FamiliarCompanion key={uid} familiar={celestialGuardian} boundaryRef={viewport ? undefined : boundary} animation={animation} paused={paused} />
      </EnergyClientProvider>}
    </div>
  </SurfaceContext.Provider>;
}
