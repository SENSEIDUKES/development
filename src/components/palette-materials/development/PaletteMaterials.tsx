import { materialColors, THEME_COLORS } from './colors';
import { EffectsGallery } from './EffectsGallery';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLibraryAssets } from '@seihouse/library/presentation';
import { MATERIALS, MaterialSurface } from './samples';
import {
  baseBlur, baseOpacity, baseTint, colorParts, decodeLooks, encodeLooks, freshSettings,
  isColoredShadow, materialStyle, measureMaterial, shadowLayers, writeLooks, STORAGE_KEY,
  type MaterialEdit, type MaterialId, type MeasuredMaterial, type PaletteSettings, type SavedLook,
} from './model';
import { loadStartingLooks, startingLooks } from './starting-looks';
import './palette-materials.css';

type Measurements = Partial<Record<MaterialId, MeasuredMaterial>>;
const nameOf = (id: MaterialId) => MATERIALS.find(m => m.id === id)!.name;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="pm-color-control"><span>{label}</span><input type="color" aria-label={label} value={value} onChange={e => onChange(e.target.value)} /><code>{value}</code></label>;
}
function Slider({ label, value, max, unit = '%', onChange }: { label: string; value: number; max: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="pm-slider"><span>{label}<output>{Math.round(value)}{unit}</output></span>
    <input type="range" aria-label={label} min={0} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>;
}
function RecipeDetails({ base, source }: { base?: MeasuredMaterial; source: string }) {
  return <details className="pm-details"><summary>Values & source</summary><p>{source}</p>
    {base && <dl>{Object.entries(base).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : value}</dd></div>)}</dl>}
  </details>;
}

export function PaletteMaterials({ renderComposition }: { renderComposition: (settings: PaletteSettings) => ReactNode }) {
  const { authImage } = useLibraryAssets();
  const [settings, setSettings] = useState(freshSettings);
  const [looks, setLooks] = useState<SavedLook[]>(startingLooks);
  const looksRef = useRef(looks);
  looksRef.current = looks;
  const [loadedId, setLoadedId] = useState('');
  const [lookName, setLookName] = useState('App colors');
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState('');
  const [colorTarget, setColorTarget] = useState<'text' | 'accent'>('accent');
  const [measured, setMeasured] = useState<Measurements>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [mobileSection, setMobileSection] = useState('materials');
  const [browseMaterials, setBrowseMaterials] = useState(false);
  const catalog = useRef<HTMLDivElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const selected = MATERIALS.find(m => m.id === settings.selected)!;
  const base = measured[selected.id];
  const edit = settings.edits[selected.id] ?? {};
  const loadedLook = looks.find(look => look.id === loadedId);
  const dirty = loadedLook ? JSON.stringify(settings) !== JSON.stringify(loadedLook.settings) : Object.keys(settings.edits).length > 0;

  useEffect(() => {
    try {
      const hadSavedLooks = window.localStorage.getItem(STORAGE_KEY) !== null;
      const { looks: available, warning } = loadStartingLooks(window.localStorage);
      setLooks(available);
      const latest = hadSavedLooks ? available.at(-1) : undefined;
      setSettings(latest ? clone(latest.settings) : freshSettings());
      setLoadedId(latest?.id ?? '');
      setLookName(latest?.name ?? 'App colors');
      setStorageError(warning);
    } catch {
      setStorageError('Browser storage is unavailable. Your exported looks are available for this visit. Export before leaving.');
    }
  }, []);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      const next: Measurements = {};
      for (const sample of MATERIALS) {
        const element = catalog.current?.querySelector(`[data-pm-recipe="${sample.id}"]`);
        if (element) next[sample.id] = measureMaterial(element);
      }
      setMeasured(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      const root = getComputedStyle(document.documentElement);
      const nextTokens: Record<string, string> = {};
      for (const color of THEME_COLORS) nextTokens[color.token] = root.getPropertyValue(color.token).trim();
      setTokens(previous => JSON.stringify(previous) === JSON.stringify(nextTokens) ? previous : nextTokens);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
    schedule();
    const observer = new ResizeObserver(schedule);
    if (catalog.current) observer.observe(catalog.current);
    const media = matchMedia('(prefers-reduced-transparency: reduce)');
    media.addEventListener('change', schedule);
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener('change', schedule); window.removeEventListener('resize', schedule); };
  }, []);

  const update = (patch: Partial<PaletteSettings>) => setSettings(current => ({ ...current, ...patch }));
  const showSection = (section: string) => {
    setMobileSection(section);
    if (matchMedia('(max-width: 650px)').matches) {
      requestAnimationFrame(() => document.getElementById(`pm-${section}`)?.scrollIntoView({ block: 'start' }));
    }
  };
  const selectMaterial = (selected: MaterialId) => {
    update({ selected });
    setBrowseMaterials(false);
    if (matchMedia('(max-width: 650px)').matches) {
      requestAnimationFrame(() => document.getElementById('pm-mixing-table')?.scrollIntoView({ block: 'start' }));
    }
  };
  const updateEdit = (patch: Partial<MaterialEdit>) => setSettings(current => ({ ...current, edits: { ...current.edits, [current.selected]: { ...current.edits[current.selected], ...patch } } }));
  const reset = () => setSettings(current => {
    const edits = { ...current.edits }; delete edits[current.selected];
    return { ...current, edits };
  });
  const stageStyle: CSSProperties = settings.background === 'artwork' && authImage && !artworkFailed
    ? { backgroundImage: `url(${JSON.stringify(authImage)})` }
    : { backgroundColor: settings.background === 'black' ? '#000000' : '#737373' };
  const stage = (children: ReactNode, className = '') => <div className={`pm-stage ${className}`} style={stageStyle}>{children}</div>;

  const persist = (next: SavedLook[], success: string) => {
    if (next.length > 100) { setMessage('Keep up to 100 looks. Export or delete a look before adding more.'); return false; }
    setLooks(next);
    looksRef.current = next;
    try { writeLooks(window.localStorage, next); setStorageError(''); setMessage(success); }
    catch { setStorageError('Browser storage is unavailable or full. Your looks are kept for this visit. Export them before leaving.'); setMessage('Changes kept for this visit.'); }
    return true;
  };
  const validName = () => {
    const name = lookName.trim();
    if (!name) { setMessage('Give this look a name first.'); return null; }
    return name;
  };
  const saveNew = () => {
    const name = validName(); if (!name) return;
    const look = { id: crypto.randomUUID(), name, settings: clone(settings) };
    if (persist([...looks, look], `Saved “${name}”.`)) setLoadedId(look.id);
  };
  const exportLooks = () => {
    const draft: SavedLook = { id: crypto.randomUUID(), name: lookName.trim() || 'Current experiment', settings: clone(settings) };
    const output = dirty || !loadedLook ? [...looks, draft] : looks;
    // Keep the same 100-look limit as imports, with the current experiment included.
    if (output.length > 100) { setMessage('Save the current experiment to an existing look, or delete one look before exporting.'); return; }
    const url = URL.createObjectURL(new Blob([encodeLooks(output)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'palette-materials.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Exported saved looks and the current experiment.');
  };
  const importLooks = async (file: File) => {
    try {
      if (file.size > 1_000_000) throw new Error('Choose a Palette & Materials export under 1 MB.');
      const imported = decodeLooks(await file.text()).map(look => ({ ...look, id: crypto.randomUUID() }));
      // Read latest state after the asynchronous file read; never replace the current experiment.
      persist([...looksRef.current, ...imported], `Imported ${imported.length} look${imported.length === 1 ? '' : 's'}. Current experiment kept.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The file could not be read. Existing looks were kept.'); }
  };

  const edgeClass = (id: MaterialId) => settings.edits[id]?.borderGlow === 'reader'
    ? 'reader-border-glow pm-reader-border' : ['reader', 'violet-shell', 'violet-panel', 'violet-card', 'blue-glass', 'smoked-glass', 'black-control'].includes(id) ? 'reader-border-glow' : '';
  const applyReaderBorder = () => setSettings(current => ({
    ...current, edits: Object.fromEntries(MATERIALS.map(({ id }) => [id, { ...current.edits[id], borderGlow: 'reader' as const }])),
  }));

  const renderSample = (sample: typeof MATERIALS[number], index: number) => <article key={sample.id} className="pm-sample" data-selected={settings.selected === sample.id}>
        {stage(<MaterialSurface id={sample.id} />, 'pm-sample-stage')}
        <button type="button" className="pm-sample-select" aria-pressed={settings.selected === sample.id} onClick={() => selectMaterial(sample.id)}>
          <span className="pm-index">0{index + 1}</span><span><strong>{sample.name}</strong><small>{sample.usage}</small></span><span aria-hidden="true">↗</span>
        </button><p className="pm-origin">{sample.origin}</p>
      </article>;

  return <main className="pm-workbench" data-mobile-section={mobileSection}>
    <header className="pm-intro"><span className="pm-eyebrow">The visual workbench</span><h2>Your paints. Your materials.</h2>
      <p>See what’s here. Try it together. Keep the looks you love.</p>
      <div className="pm-topline"><nav aria-label="Palette sections"><a href="#pm-materials">Materials</a><a href="#pm-effects">Effects</a><a href="#pm-colors">Colors</a><a href="#pm-composition">Composition</a><a href="#pm-looks">Saved looks <span>{looks.length}</span></a></nav>
        <label className="pm-background">Behind every sample<select aria-label="Behind every sample" value={settings.background} onChange={e => update({ background: e.target.value as PaletteSettings['background'] })}>
          <option value="black">Black</option><option value="gray">Neutral gray</option><option value="artwork">Sign-in artwork</option>
        </select></label>
      </div>
      {authImage && <img hidden src={authImage} alt="" onError={() => setArtworkFailed(true)} />}
      {settings.background === 'artwork' && (!authImage || artworkFailed) && <p role="status">The artwork is unavailable. Samples are shown over neutral gray.</p>}
    </header>

    <nav className="pm-mobile-nav" aria-label="Workspace sections">{[
      ['materials', 'Materials'], ['effects', 'Effects'], ['colors', 'Colors'], ['composition', 'Preview'], ['looks', 'Saved'],
    ].map(([id, label]) => <button key={id} type="button" aria-pressed={mobileSection === id} aria-controls={`pm-${id}`} onClick={() => showSection(id)}>{label}{id === 'looks' && looks.length > 0 && <span>{looks.length}</span>}</button>)}</nav>

    <section id="pm-materials" className="pm-section"><div className="pm-section-heading"><div><span className="pm-eyebrow">01 / The materials</span><h2>The active foundation.</h2></div><p>Active foundations shared with the app. Previous treatments live in the archive below.</p></div>
      <button type="button" className="pm-control pm-mobile-browse" aria-expanded={browseMaterials} aria-controls="pm-material-catalog" onClick={() => setBrowseMaterials(value => !value)}>{browseMaterials ? 'Close material gallery' : `Browse all ${MATERIALS.length} materials`}</button>
      <div ref={catalog} id="pm-material-catalog" className="pm-material-inventory" data-browse={browseMaterials}><div className="pm-catalog" data-browse="true">{MATERIALS.filter(sample => !sample.archived).map(renderSample)}</div><details className="pm-archive"><summary>Archived materials ({MATERIALS.filter(sample => sample.archived).length})</summary><p>Previous treatments, kept for comparison and saved looks. Some pages still use them until they adopt the foundation.</p><div className="pm-catalog" data-browse="true">{MATERIALS.filter(sample => sample.archived).map(renderSample)}</div></details></div>

      {selected.archived && <p className="pm-note" role="status">This look uses an archived material. Your saved edits are preserved; choose an active material to try the new foundation.</p>}
      <div id="pm-mixing-table" className="pm-editor" aria-label="Material editor"><div className="pm-editor-main"><div className="pm-editor-preview"><div className="pm-section-heading"><div><span className="pm-eyebrow">On the mixing table</span><h3>{selected.name}</h3></div><button type="button" className="pm-control" onClick={reset}>Reset material</button></div>
        <div className="pm-mobile-pickers"><label>Material<select aria-label="Material to edit" value={selected.id} onChange={e => selectMaterial(e.target.value as MaterialId)}>{MATERIALS.map(material => <option key={material.id} value={material.id}>{material.archived ? 'Archive · ' : ''}{material.name}</option>)}</select></label>
          <label>Background<select aria-label="Preview background" value={settings.background} onChange={e => update({ background: e.target.value as PaletteSettings['background'] })}><option value="black">Black</option><option value="gray">Neutral gray</option><option value="artwork">Artwork</option></select></label></div>
        <div className="pm-comparison"><div><span className="pm-caption">Original · {selected.archived ? 'archived treatment' : 'active foundation'}</span>{stage(<MaterialSurface id={selected.id} />, 'pm-large-sample')}</div>
          <div><span className="pm-caption">Your experiment {Object.keys(edit).length > 0 && '· edited'}</span>{stage(<MaterialSurface id={selected.id} style={materialStyle(base, edit, measured.reader)} className={`pm-experiment ${edgeClass(selected.id)}`} />, 'pm-large-sample')}</div></div></div>
        <div className="pm-editor-extras"><div className="pm-ingredients" aria-label="Individual material layers">{base && [
          { name: 'Border', className: '', style: { border: `${base.borderWidth} solid ${base.borderColor}` } },
          { name: 'Shadow', className: '', style: { boxShadow: shadowLayers(base.boxShadow).filter(s => !isColoredShadow(s) && !s.includes('inset')).join(', ') || 'none' } },
          { name: 'Glow & highlights', className: '', style: { boxShadow: shadowLayers(base.boxShadow).filter(s => isColoredShadow(s) || s.includes('inset')).join(', ') || 'none' } },
          { name: 'Reader border glow', className: 'reader-border-glow pm-reader-border', style: measured.reader ? { border: `${measured.reader.borderWidth} solid ${measured.reader.borderColor}`, boxShadow: shadowLayers(measured.reader.boxShadow).filter(s => s.includes('inset')).join(', ') } : {} },
        ].map(layer => <div key={layer.name}>{stage(<div className={`pm-layer ${layer.className}`} style={layer.style} />)}<span className="pm-caption">{layer.name}</span></div>)}</div>
        <RecipeDetails base={base} source={selected.source} /></div>
      </div><aside className="pm-adjustments"><span className="pm-eyebrow">Adjust the material</span>
        {base && <>
          <ColorControl label="Glass tint" value={edit.tint ?? baseTint(base)} onChange={tint => updateEdit({ tint })} />
          <Slider label="Opacity" value={edit.opacity ?? baseOpacity(base) * 100} max={100} onChange={opacity => updateEdit({ opacity })} />
          <Slider label="Background blur" value={edit.blur ?? baseBlur(base)} max={40} unit="px" onChange={blur => updateEdit({ blur })} />
          <div className="pm-border-choice"><label>Border glow<select aria-label="Border glow" value={edit.borderGlow ?? 'original'} onChange={e => updateEdit({ borderGlow: e.target.value as MaterialEdit['borderGlow'] })}>
            <option value="original">Original material edge</option><option value="reader">Reader border glow</option>
          </select></label><button type="button" className="pm-control" onClick={applyReaderBorder}>Apply Reader glow to all materials</button>
            <p className="pm-note">The Reader’s warm rim, cool highlight and gold-to-blue edge. Applies to this experiment and its preview; save the look to keep it.</p>
          </div>
          {edit.borderGlow !== 'reader' && <><ColorControl label="Border color" value={edit.borderColor ?? colorParts(base.borderColor).hex} onChange={borderColor => updateEdit({ borderColor })} />
          <Slider label="Border strength" value={edit.borderOpacity ?? colorParts(base.borderColor).alpha * 100} max={100} onChange={borderOpacity => updateEdit({ borderOpacity })} /></>}
          <Slider label="Shadow strength" value={edit.shadow ?? 100} max={200} onChange={shadow => updateEdit({ shadow })} />
          <ColorControl label="Surface glow color" value={edit.glowColor ?? colorParts(shadowLayers(base.boxShadow).find(isColoredShadow)?.match(/rgba?\([^)]+\)/)?.[0] ?? 'rgb(4,172,255)').hex} onChange={glowColor => updateEdit({ glowColor })} />
          <Slider label="Surface glow strength" value={edit.glow ?? (shadowLayers(base.boxShadow).some(isColoredShadow) ? 100 : 0)} max={200} onChange={glow => updateEdit({ glow })} />
        </>}
        <p className="pm-note">Opacity controls how much glass covers the scene. Blur softens what’s behind it. 100% shadow or glow keeps the existing strength.</p>
        <p className="pm-note">Reader border glow replaces the material’s decorative edge. Surface glow adjusts the separate halo. Your device’s transparency preferences remain active.</p>
      </aside></div>
    </section>

    <EffectsGallery />

    <section id="pm-colors" className="pm-section"><div className="pm-section-heading"><div><span className="pm-eyebrow">02 / The paints</span><h2>Colors already in the app.</h2><p className="pm-note">Shared material defaults. Your personal background tint is shown in Profile settings.</p></div>
      <label>Use a swatch for<select aria-label="Use a swatch for" value={colorTarget} onChange={e => setColorTarget(e.target.value as 'text' | 'accent')}><option value="accent">Composition accent</option><option value="text">Composition text</option></select></label></div>
      {materialColors(measured, tokens).map(group => <details className="pm-color-group" key={group.name} open={!group.name.startsWith('Archived') && group.name !== 'Surface gradient layers'}><summary>{group.name}</summary><div className="pm-swatches">{group.colors.map(color => {
        const value = color.value;
        const hex = value.startsWith('#') ? value.slice(0, 7) : colorParts(value).hex;
        return <button key={color.value.toLowerCase()} type="button" className="pm-swatch" onClick={() => update({ colors: { ...settings.colors, [colorTarget]: hex } })} aria-label={`Use ${color.name} as ${colorTarget}`}>
          <span className="pm-color-chip"><span style={{ background: value }} /></span><strong>{color.name}</strong><code>{value}</code><small>{color.usage}</small>
        </button>;
      })}</div></details>)}
      <p className="pm-note">These are the shared materials’ default colors, read from their rendered layers and theme values. Your background tint is saved in Profile settings; material experiments and saved looks do not change this inventory. Transparent swatches show their opacity; applying one to text or an accent uses its solid color.</p>
    </section>

    <section id="pm-composition" className="pm-section"><div className="pm-section-heading"><div><span className="pm-eyebrow">03 / Put it together</span><h2>Try it on Home.</h2></div><p>Your material choices on a local Home mock. Nothing changes in the app.</p></div>
      <div className="pm-role-controls">{(['navigation', 'panel', 'card', 'button'] as const).map(role => <label key={role}>{role === 'card' ? 'Nested card' : role[0].toUpperCase() + role.slice(1)}<select aria-label={role === 'card' ? 'Nested card' : role[0].toUpperCase() + role.slice(1)} value={settings.roles[role]} onChange={e => update({ roles: { ...settings.roles, [role]: e.target.value as MaterialId } })}>{MATERIALS.map(material => <option key={material.id} value={material.id}>{material.archived ? 'Archive · ' : ''}{material.name}</option>)}</select></label>)}</div>
      <div className="pm-composition-colors"><ColorControl label="Text" value={settings.colors.text} onChange={text => update({ colors: { ...settings.colors, text } })} /><ColorControl label="Accent" value={settings.colors.accent} onChange={accent => update({ colors: { ...settings.colors, accent } })} /></div>
      {renderComposition(settings)}
      <p className="pm-note">Navigation paints the header, navigation frame and footer. Panel paints the Events tray and filters; Nested card paints the empty state. Images stay clear, and the action keeps its rainbow ring. Save or export your look to keep these adjustments.</p>
    </section>

    <section id="pm-looks" className="pm-section"><div className="pm-section-heading"><div><span className="pm-eyebrow">04 / Keep your favorites</span><h2>Saved looks.</h2></div><p>Stored in this browser. Export to keep a portable copy.</p></div>
      <button type="button" className="pm-control pm-primary" onClick={() => {
        setSettings(freshSettings()); setLoadedId(''); setLookName('App colors');
        setMessage('Loaded App colors, the default purple foundation. Saved looks were kept.'); showSection('composition');
      }}>App colors · Default preset</button>
      <div className="pm-save-bar"><label>Look name<input maxLength={80} placeholder="e.g. Midnight & silver" value={lookName} onChange={e => setLookName(e.target.value)} /></label>
        <button type="button" className="pm-control pm-primary" onClick={saveNew}>Save as new look</button>
        <button type="button" className="pm-control" disabled={!loadedLook} onClick={() => { const name = validName(); if (name && loadedLook) persist(looks.map(l => l.id === loadedId ? { ...l, name, settings: clone(settings) } : l), `Updated “${name}”.`); }}>Update loaded look</button>
        <button type="button" className="pm-control" onClick={exportLooks}>Export looks</button><button type="button" className="pm-control" onClick={() => importInput.current?.click()}>Import looks</button>
        <input ref={importInput} type="file" accept=".json,application/json" aria-label="Import looks file" hidden onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importLooks(file); }} />
      </div>
      <p className="pm-note">{loadedLook ? `Loaded: ${loadedLook.name}${dirty ? ' · unsaved adjustments' : ' · saved'}` : 'Your experiment is separate from saved looks until you save it.'}</p>
      {storageError && <p role="alert" className="pm-warning">{storageError}</p>}<p role="status" className="pm-status">{message}</p>
      <div className="pm-saved-grid">{looks.map(look => <article className="pm-saved-look" key={look.id}><span className="pm-saved-color" style={{ background: look.settings.colors.accent }} /><h3>{look.name}</h3><p>{nameOf(look.settings.roles.panel)} · {look.settings.background}</p><div className="pm-saved-actions">
        <button type="button" className="pm-control" onClick={() => { setSettings(clone(look.settings)); setLoadedId(look.id); setLookName(look.name); showSection('materials'); setMessage(`Loaded “${look.name}”.`); }}>Load</button>
        <button type="button" className="pm-control" onClick={() => persist([...looks, { ...clone(look), id: crypto.randomUUID(), name: `${look.name.slice(0, 73)} (copy)` }], 'Duplicated look.')}>Duplicate</button>
        <button type="button" className="pm-control" onClick={() => { const name = window.prompt('Rename this look', look.name)?.trim(); if (!name) return; if (name.length > 80) { setMessage('Use a name of 80 characters or fewer.'); return; } if (persist(looks.map(l => l.id === look.id ? { ...l, name } : l), `Renamed to “${name}”.`) && loadedId === look.id) setLookName(name); }}>Rename</button>
        <button type="button" className="pm-control" onClick={() => { if (persist(looks.filter(l => l.id !== look.id), `Deleted “${look.name}”. Current experiment kept.`) && loadedId === look.id) setLoadedId(''); }}>Delete</button>
      </div></article>)}</div>
      {looks.length === 0 && <p className="pm-empty">Nothing saved yet. Mix a few materials above, then give your first look a name.</p>}
    </section>
  </main>;
}
