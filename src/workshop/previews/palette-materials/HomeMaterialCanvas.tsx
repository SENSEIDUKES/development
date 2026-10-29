import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LibraryPresentationProvider, useLibraryAssets } from '@seihouse/library/presentation';
import {
  LibraryDesktopNavigationProvider, MainLibraryHomeInsights, WorkspaceHeaderAccessoryProvider,
  WorkspaceHeaderCenterProvider, WorkspaceHeaderPreferencesProvider,
} from '@seihouse/library/shell';
import { FamiliarSprite } from '@seihouse/library/familiar';
import { HomePage } from '../../../novel-expanded/HomePage';
import { defaultFamiliar } from '../../../host/familiar/catalogue';
import { getPreviewScenario } from '../user-profile/previewData';
import { MATERIALS, MaterialSurface } from '../../../components/palette-materials/development/samples';
import { decodeLooks, freshSettings, measureMaterial, type PaletteSettings } from '../../../components/palette-materials/development/model';
import { homeMaterialStyles, type MaterialMeasurements } from './homeMaterialStyles';
import './home-material-canvas.css';

const profile = getPreviewScenario('developed-cultivator').profile!;

/** The actual Home composition, with inert host actions and no app services/storage. */
export function HomeMaterialCanvas() {
  const assets = useLibraryAssets();
  const catalog = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<PaletteSettings>(freshSettings);
  const [measured, setMeasured] = useState<MaterialMeasurements>({});
  const [feedback, setFeedback] = useState('');
  const [menuMusic, setMenuMusic] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'pm-home-settings') return;
      try {
        // Reuse saved-look validation at the frame boundary, including editable ranges.
        const [look] = decodeLooks(JSON.stringify({ format: 'palette-materials', version: 3,
          looks: [{ id: 'preview', name: 'Preview', settings: event.data.settings }] }));
        setSettings(look.settings);
      } catch { /* Invalid messages never replace the current experiment. */ }
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'pm-home-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      const next: MaterialMeasurements = {};
      for (const material of MATERIALS) {
        const element = catalog.current?.querySelector(`[data-pm-recipe="${material.id}"]`);
        if (element) next[material.id] = measureMaterial(element);
      }
      setMeasured(next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
    schedule();
    const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
    window.addEventListener('resize', schedule);
    transparency.addEventListener('change', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); transparency.removeEventListener('change', schedule); };
  }, []);

  const backdrop: CSSProperties = settings.background === 'artwork'
    ? { '--pm-home-backdrop': `linear-gradient(#0009, #000b), url(${JSON.stringify(assets.homeImages?.[0])}) center / cover` } as CSSProperties
    : { '--pm-home-backdrop': settings.background === 'black' ? '#000' : '#737373' } as CSSProperties;
  // A still from Home's existing images keeps comparisons steady and avoids autoplay/data costs.
  const stillAssets = { ...assets, homeVideos: [], homeImages: assets.homeImages?.slice(0, 1) };
  const report = (label: string) => setFeedback(`${label} — preview only. Your app is unchanged.`);
  return <>
    <div ref={catalog} className="pm-home-measurements" aria-hidden="true" inert>
      {MATERIALS.map(material => <MaterialSurface key={material.id} id={material.id} />)}
    </div>
    <style>{homeMaterialStyles(settings, measured)}</style>
    <div className="pm-home-canvas" style={backdrop}
      onClickCapture={event => { if ((event.target as Element).closest('a[href]')) event.preventDefault(); }}
      onAuxClickCapture={event => { if ((event.target as Element).closest('a[href]')) event.preventDefault(); }}>
      <LibraryPresentationProvider assets={stillAssets} accentColor={settings.colors.accent}>
        <LibraryDesktopNavigationProvider value="sidebar">
          <WorkspaceHeaderPreferencesProvider preferences={{ language: 'en', onLanguageChange: () => report('Language'), menuMusic, onMenuMusicChange: setMenuMusic }}>
            <WorkspaceHeaderCenterProvider center={<MainLibraryHomeInsights everyWidth adapter={{ copyText: async () => report('Copy') }} />} centerBreakpoint="always">
              <WorkspaceHeaderAccessoryProvider accessory={<span className="pm-home-familiar" aria-label={defaultFamiliar.definition.displayName}><FamiliarSprite familiar={defaultFamiliar.definition} animation="neutral" paused /></span>}>
                <HomePage worlds={[]} readerProfile={{ ...profile, accentColor: settings.colors.accent }} navigate={route => report(route.page === 'create' ? 'Carve New Destiny' : route.page)} />
              </WorkspaceHeaderAccessoryProvider>
            </WorkspaceHeaderCenterProvider>
          </WorkspaceHeaderPreferencesProvider>
        </LibraryDesktopNavigationProvider>
      </LibraryPresentationProvider>
      {feedback && <p role="status" className="pm-home-feedback"><span>{feedback}</span><button type="button" aria-label="Dismiss preview message" onClick={() => setFeedback('')}>×</button></p>}
    </div>
  </>;
}
