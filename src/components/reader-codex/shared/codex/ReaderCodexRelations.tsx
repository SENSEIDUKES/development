import { generateId } from '../codexCompatibility';
import React, { useState, useMemo } from 'react';
import { Network, HelpCircle, ArrowLeftRight, Trash2, Download, Scan, Info } from 'lucide-react';
import { VirtualizedList } from '../../../reader-chamber/development/VirtualizedList';
import { Character, CharacterRelationship } from '../types';
import { useCodex } from './CodexContext';
import { useDialect } from '../codexCompatibility';
import { handleDownload } from '../codexCompatibility';
import {
  getColorCodeSurfaceStyle,
  getColorCodeValue,
  resolveCharacterRelationshipColorCode,
  resolveCharacterStatusColorCode,
  resolveRelationshipAffinityColorCode,
  type ColorCodeId,
} from '../../../reader-chamber/shared/colorCodes';


interface ReaderCodexRelationsProps {
  charsToRender: Character[];
  setDeletePrompt: (p: any) => void;
  selectedNodeChar: Character | null;
  setSelectedNodeChar: (c: Character | null) => void;
}

function resolveVisualAffinityColorCode(affinity: number, neutralThreshold = 0): ColorCodeId {
  return resolveRelationshipAffinityColorCode(
    Math.abs(affinity) <= neutralThreshold ? 0 : affinity,
  );
}

export function ReaderCodexRelations({
  charsToRender,
  setDeletePrompt,
  selectedNodeChar,
  setSelectedNodeChar
}: ReaderCodexRelationsProps) {
  const { memory, activeStory, mcName, pushNotification, updateStoryFields } = useCodex();
  const t = useDialect();


  // Pre-compute character lookup map for efficiency, memoized on characters list change
  const { characters } = memory;
  const characterMap = useMemo(() => {
    const m = new Map<string, Character>();
    characters?.forEach(c => m.set(c.id, c));
    return m;
  }, [characters]);
  // Selection is intentionally stored as an ID-bearing snapshot by the parent.
  // Resolve it against current story memory before rendering so a generation
  // update (for example ally -> enemy) immediately repaints this panel too.
  const currentSelectedNodeChar = useMemo(() => {
    if (!selectedNodeChar) return null;
    return characters?.find(character => character.id === selectedNodeChar.id) ?? null;
  }, [characters, selectedNodeChar]);
  const selectedRelationshipColorCode = currentSelectedNodeChar
    ? resolveCharacterRelationshipColorCode(currentSelectedNodeChar, mcName)
    : null;
  const selectedStatusColorCode = currentSelectedNodeChar
    ? resolveCharacterStatusColorCode(currentSelectedNodeChar.status)
    : null;

  const [bondSourceId, setBondSourceId] = useState('');
  const [bondTargetId, setBondTargetId] = useState('');
  const [bondAffinity, setBondAffinity] = useState<number>(0);
  const [bondDesc, setBondDesc] = useState('');
  const bondAffinityColorCode = resolveRelationshipAffinityColorCode(bondAffinity);

  const handleAddCustomRelationship = () => {
    if (!bondSourceId || !bondTargetId) {
      pushNotification("Two sovereign characters are required to bind a causal relation.");
      return;
    }
    if (bondSourceId === bondTargetId) {
      pushNotification("A cultivator cannot bond with their own split soul.");
      return;
    }
    const sourceChar = characterMap.get(bondSourceId);
    const targetChar = characterMap.get(bondTargetId);
    if (!sourceChar || !targetChar) return;

    const newRelationship: CharacterRelationship = {
      id: `bond_${Date.now()}_${generateId(4)}`,
      sourceCharId: bondSourceId,
      sourceCharName: sourceChar.name,
      targetCharId: bondTargetId,
      targetCharName: targetChar.name,
      affinity: bondAffinity,
      description: bondDesc || `${sourceChar.name} and ${targetChar.name} are bound through shared tribulation.`,
      updatedAt: new Date().toISOString()
    };

    void updateStoryFields(activeStory.id, (current) => ({
      relationships: [
        newRelationship,
        ...(Array.isArray(current.relationships) ? current.relationships : []),
      ],
    }));

    setBondSourceId('');
    setBondTargetId('');
    setBondDesc('');
    setBondAffinity(0);
    pushNotification(`Successfully bound a karma link between ${sourceChar.name} and ${targetChar.name}!`);
  };
  return (
    <>
{/* PAGE 2: Relationship Map (Affinity Graph) */}

          <div className="space-y-6 animate-fadeIn" id="codex-relationships">
            <div className="border-b border-portal/15 pb-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-lg text-signal tracking-wide codex-glow-blue flex items-center gap-2">
                  <Network size={16} className="text-portal" />
                  <span>{t('relationship_map')}</span>
                </h3>
                <p className="text-[10px] text-neutral-500 font-sans mt-0.5">See how characters relate — love, hate, rivalry, loyalty, fear, and trust. Click a {t('daoist_node')} to inspect their connections.</p>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-sc uppercase tracking-widest text-portal/80 px-3 py-1.5 rounded-lg codex-panel border-portal/20 flex-shrink-0">
                <Scan size={11} />
                <span>Interactive Map</span>
              </span>
            </div>

            {charsToRender.length === 0 ? (
              <div className="codex-panel codex-grid-bg rounded-2xl text-center py-20 px-6">
                <Network size={28} className="mx-auto text-portal/30 mb-3" />
                <h4 className="font-sc text-xs text-neutral-400 uppercase tracking-[0.25em] font-semibold">Web Unwoven</h4>
                <p className="text-xs text-neutral-500 italic font-serif mt-2 max-w-sm mx-auto">
                  No active secondary nodes present. Mapping remains locked to the Void.
                </p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">

                {/* Visual SVG Map block */}
                <div className="flex-1 codex-panel codex-grid-bg rounded-2xl p-4 sm:p-5 flex flex-col min-h-[440px] relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="flex items-center gap-1.5 text-[10px] font-sc uppercase tracking-[0.25em] text-neutral-400 font-semibold">
                      <span>Karma Web</span>
                      <Info size={11} className="text-neutral-600" />
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-lg border border-white/10 bg-black/50 font-sc text-neutral-400 uppercase tracking-widest">
                      <Scan size={10} className="text-portal/70" />
                      <span>Fit View</span>
                    </span>
                  </div>

                  {/* SVG Mapping nodes */}
                  <div className="flex-1 flex items-center justify-center">
                  <svg className="w-full max-w-[520px] h-[380px]" viewBox="0 0 440 380">
                    <defs>
                      <filter id="glow-portal" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-edge" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <radialGradient id="mc-core-gradient" cx="50%" cy="42%" r="65%">
                        <stop offset="0%" stopColor="#062338" />
                        <stop offset="100%" stopColor="#000000" />
                      </radialGradient>
                    </defs>

                    {/* Faint concentric constellation rings */}
                    {[52, 88, 124, 160].map((ringRadius) => (
                      <circle
                        key={`ring-${ringRadius}`}
                        cx="220"
                        cy="190"
                        r={ringRadius}
                        fill="none"
                        data-color-code="mainCharacter"
                        stroke={getColorCodeValue('mainCharacter')}
                        strokeWidth="0.6"
                        strokeDasharray="2 6"
                        opacity="0.14"
                      />
                    ))}

                    {/* Draw connecting lines */}
                    {charsToRender.map((char, index) => {
                      const total = charsToRender.length;
                      const angle = (index * 2 * Math.PI) / total;
                      const radius = 124;
                      const cx = 220 + radius * Math.cos(angle);
                      const cy = 190 + radius * Math.sin(angle);

                      // The relationship-to-MC color is derived from the
                      // current Character record. It intentionally does not
                      // read the separate inter-character affinity ledger.
                      const colorCode = resolveCharacterRelationshipColorCode(char, mcName);
                      const isSelectedEdge = currentSelectedNodeChar?.id === char.id;
                      return (
                        <g key={`line-${char.id}`} data-color-code={colorCode}>
                          <line
                            x1="220"
                            y1="190"
                            x2={cx}
                            y2={cy}
                            stroke={getColorCodeValue(colorCode)}
                            strokeWidth={isSelectedEdge ? "3" : "1.5"}
                            opacity={currentSelectedNodeChar ? (isSelectedEdge ? "1" : "0.25") : "0.7"}
                            filter="url(#glow-edge)"
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    })}

                    {/* Render Center Node representing MC */}
                    <g transform="translate(220, 190)" className="cursor-pointer" data-color-code="mainCharacter">
                      <circle cx="0" cy="0" r="46" fill="none" stroke={getColorCodeValue('mainCharacter')} strokeWidth="0.75" strokeDasharray="1 5" opacity="0.5" />
                      <circle cx="0" cy="0" r="38" fill="url(#mc-core-gradient)" stroke={getColorCodeValue('mainCharacter')} strokeWidth="2.5" filter="url(#glow-portal)" />
                      <circle cx="0" cy="0" r="32" fill="none" stroke={getColorCodeValue('mainCharacter')} strokeWidth="0.75" opacity="0.4" />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#FAFAFA"
                        className="font-display text-[15px] font-bold tracking-wider pointer-events-none"
                      >
                        {(mcName || '').split(' ')[0]}
                      </text>
                    </g>

                    {/* Render Circular character nodes */}
                    {charsToRender.map((char, index) => {
                      const total = charsToRender.length;
                      const angle = (index * 2 * Math.PI) / total;
                      const radius = 124;
                      const cx = 220 + radius * Math.cos(angle);
                      const cy = 190 + radius * Math.sin(angle);

                      const isSelected = currentSelectedNodeChar?.id === char.id;
                      const colorCode = resolveCharacterRelationshipColorCode(char, mcName);
                      const statusColorCode = resolveCharacterStatusColorCode(char.status);

                      return (
                        <g
                          key={`node-${char.id}`}
                          transform={`translate(${cx}, ${cy})`}
                          className="cursor-pointer group"
                          data-color-code={colorCode}
                          onClick={() => setSelectedNodeChar(char)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedNodeChar(char); } }}
                        >
                          {isSelected && (
                            <circle cx="0" cy="0" r="26" fill="none" stroke={getColorCodeValue(colorCode)} strokeWidth="0.75" strokeDasharray="2 4" opacity="0.6" />
                          )}
                          <circle
                            cx="0"
                            cy="0"
                            r={isSelected ? "21" : "17"}
                            fill="#000000"
                            stroke={getColorCodeValue(colorCode)}
                            strokeWidth={isSelected ? "2.5" : "1.5"}
                            filter={isSelected ? "url(#glow-edge)" : undefined}
                            className="transition-all duration-300"
                          />
                          <circle cx="0" cy="0" r={isSelected ? "16" : "12.5"} fill="none" stroke={getColorCodeValue(colorCode)} strokeWidth="0.5" opacity="0.35" />
                          {char.status === 'deceased' && (
                            <line x1="-9" y1="-9" x2="9" y2="9" data-color-code={statusColorCode} stroke={getColorCodeValue(statusColorCode)} strokeWidth="2" opacity="0.8" />
                          )}
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill={isSelected ? "#FAFAFA" : "#d4d4d4"}
                            className="font-serif text-[10px] pointer-events-none tracking-tight"
                          >
                            {(char.name || '').split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  </div>

                  {/* Alignment legend */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-3 mt-auto relative z-10">
                    {([
                      { label: 'Allied', colorCode: 'ally' },
                      { label: 'Hostile', colorCode: 'enemy' },
                      { label: 'Mentor/Important', colorCode: 'mentor' },
                      { label: 'Neutral', colorCode: 'unknown' },
                    ] satisfies Array<{ label: string; colorCode: ColorCodeId }>).map(({ label, colorCode }) => (
                      <span key={label} className="flex items-center gap-1.5 text-[9px] font-sc uppercase tracking-widest text-neutral-500 px-2.5 py-1 rounded-full border border-white/5 bg-black/40">
                        <span
                          className="w-2 h-2 rounded-full border"
                          data-color-code={colorCode}
                          style={getColorCodeSurfaceStyle(colorCode, { borderOpacity: 1, backgroundOpacity: 0, glowOpacity: 0.4 })}
                        ></span>
                        <span>{label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Inspect Card Profile Panel */}
                <div
                  className={`w-full lg:w-72 ${currentSelectedNodeChar ? 'codex-panel-blue' : 'codex-panel'} rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-500`}
                  data-color-code={selectedRelationshipColorCode ?? undefined}
                >
                  {currentSelectedNodeChar ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="border-b border-portal/20 pb-2.5 flex items-center justify-between">
                        <span className="text-[9px] text-portal font-sc uppercase font-bold tracking-[0.25em] codex-glow-blue">Resonance Details</span>
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedNodeChar(null)}
                          className="text-[9px] text-neutral-500 hover:text-portal capitalize font-sc uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 hover:border-portal/40 transition-colors"
                        >
                          Clear
                        </button>
                      </div>

                      {currentSelectedNodeChar.imageUrl && (
                        <div className="h-32 w-full rounded-xl overflow-hidden border border-portal/20 shadow-[0_0_18px_rgba(4,172,255,0.12)] relative group/rel bg-black/60">
                          <img src={currentSelectedNodeChar.imageUrl} alt={currentSelectedNodeChar.name} className="w-full h-full object-contain object-top" referrerPolicy="no-referrer" />
                          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>
                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(currentSelectedNodeChar.imageUrl!, `${currentSelectedNodeChar.name.toLowerCase().replace(/\s+/g, '_')}_portrait.png`);
                            }}
                            className="absolute bottom-1.5 right-1.5 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded transition-all duration-200 opacity-0 group-hover/rel:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow"
                            title="Download Portrait"
                          >
                            <Download size={8} />
                            <span>Get</span>
                          </button>
                        </div>
                      )}

                      <div>
                        <h4 className="font-display font-bold text-signal text-lg tracking-wide">{currentSelectedNodeChar.name}</h4>
                        <span className="text-[10px] text-portal/70 font-sc uppercase tracking-widest block mt-0.5">{currentSelectedNodeChar.role}</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between px-3 py-2 bg-black/50 border border-white/5 rounded-lg">
                          <span className="text-neutral-500 text-[8.5px] uppercase tracking-[0.2em] font-sc">Bonds to MC</span>
                          <span
                            className="font-semibold text-[10px] font-sc uppercase tracking-wider"
                            data-color-code={selectedRelationshipColorCode ?? undefined}
                            style={selectedRelationshipColorCode ? { color: getColorCodeValue(selectedRelationshipColorCode) } : undefined}
                          >
                            {currentSelectedNodeChar.relationshipToMC}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 bg-black/50 border border-white/5 rounded-lg">
                          <span className="text-neutral-500 text-[8.5px] uppercase tracking-[0.2em] font-sc">Status</span>
                          <span
                            className="font-mono text-[9px] uppercase"
                            data-color-code={selectedStatusColorCode ?? undefined}
                            style={selectedStatusColorCode ? { color: getColorCodeValue(selectedStatusColorCode) } : undefined}
                          >
                            {currentSelectedNodeChar.status}
                          </span>
                        </div>
                        {currentSelectedNodeChar.powerLevel && (
                          <div className="flex items-center justify-between px-3 py-2 bg-black/50 border border-amber-500/15 rounded-lg">
                            <span className="text-neutral-500 text-[8.5px] uppercase tracking-[0.2em] font-sc">Realm</span>
                            <span className="text-amber-400 font-mono text-[9.5px] codex-glow-gold">{currentSelectedNodeChar.powerLevel}</span>
                          </div>
                        )}
                        {currentSelectedNodeChar.faction && (
                          <div className="flex items-center justify-between px-3 py-2 bg-black/50 border border-white/5 rounded-lg">
                            <span className="text-neutral-500 text-[8.5px] uppercase tracking-[0.2em] font-sc">Sect Affiliation</span>
                            <span className="text-neutral-300 text-[9.5px] truncate max-w-[130px]">{currentSelectedNodeChar.faction}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 leading-relaxed italic font-serif border-l-2 border-portal/30 pl-3">
                        "{currentSelectedNodeChar.description}"
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="w-14 h-14 rounded-full border border-portal/20 bg-portal/5 flex items-center justify-center mb-3 shadow-[0_0_18px_rgba(4,172,255,0.1)]">
                        <HelpCircle size={24} className="text-portal/40 animate-pulse" />
                      </div>
                      <h4 className="font-sc text-xs text-neutral-400 uppercase tracking-[0.25em] font-semibold">Sensor Idle</h4>
                      <p className="text-[9.5px] text-neutral-600 font-sans mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Tap any {t('daoist_node')} in the {t('cosmic_grid')} to inspect special causal relationship bindings.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Custom Interactive Relationship Bonds Panel */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 codex-panel p-6 rounded-2xl">

                {/* Form to Create Custom Bond */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <h4 className="font-sc font-bold text-portal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                      <ArrowLeftRight size={14} />
                      <span>{t('relationship_bond')}</span>
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-sans mt-1">
                      Manually add a relationship between two characters.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1" htmlFor="a11y-control-rlm0bgs">Source Character</label>
                      <select
                        value={bondSourceId}
                        onChange={(e) => setBondSourceId(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none" id="a11y-control-rlm0bgs"
                      >
                        <option value="">-- Choose Soul --</option>
                        {(memory.characters || []).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1" htmlFor="a11y-control-f5n7va3">Target Character</label>
                      <select
                        value={bondTargetId}
                        onChange={(e) => setBondTargetId(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none" id="a11y-control-f5n7va3"
                      >
                        <option value="">-- Choose Soul --</option>
                        {(memory.characters || []).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="bond-affinity-score" className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Affinity Score</label>
                        <span
                          className="text-[10px] font-mono font-bold"
                          data-color-code={bondAffinityColorCode}
                          style={{ color: getColorCodeValue(bondAffinityColorCode) }}
                        >
                          {bondAffinity > 0 ? `+${bondAffinity}` : bondAffinity}%
                        </span>
                      </div>
                      <input
                        id="bond-affinity-score"
                        type="range"
                        min="-100"
                        max="100"
                        value={bondAffinity}
                        onChange={(e) => setBondAffinity(parseInt(e.target.value))}
                        className="w-full bg-neutral-900 rounded"
                        data-color-code={bondAffinityColorCode}
                        style={{ accentColor: getColorCodeValue(bondAffinityColorCode) }}
                      />
                      <div className="flex justify-between text-[8px] text-neutral-600 font-mono">
                        <span>Deadly Enemy (-100)</span>
                        <span>Neutral</span>
                        <span>Eternal Mirror (+100)</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1" htmlFor="a11y-control-nc785iv">Causal Narrative / Link Description</label>
                      <textarea
                        placeholder="e.g. Sworn companion, linked by the blood of the Azure Wyrm..."
                        value={bondDesc}
                        onChange={(e) => setBondDesc(e.target.value)}
                        className="w-full h-16 bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none resize-none font-serif" id="a11y-control-nc785iv"
                      />
                    </div>

                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleAddCustomRelationship}
                      className="w-full py-2 bg-portal text-void text-[10px] uppercase font-sc font-bold tracking-widest rounded hover:brightness-115 transition-all"
                    >
                      Bind Thread
                    </button>
                  </div>
                </div>

                {/* Display Active Relationships Ledger */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                    <h4 className="font-sc font-bold text-signal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                      <Network size={14} />
                      <span>Active Custom Bonds Ledger</span>
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-500">{(activeStory.relationships || []).length} registered threads</span>
                  </div>

                  <VirtualizedList
                    items={activeStory.relationships || []}
                    itemHeight={80} // Estimated height of each relationship bond card inside the grid list
                    containerHeight={300}
                    className="pr-2"
                    emptyPlaceholder={
                      <div className="h-full py-16 flex flex-col items-center justify-center text-center border border-dashed border-neutral-900 rounded">
                        <p className="font-serif italic text-neutral-500 text-xs">"No custom karma strands recorded. Link cultivators on your left."</p>
                      </div>
                    }
                    renderItem={(bond: CharacterRelationship) => {
                      // Numeric affinity remains an inter-character graph
                      // concern; it never reclassifies relationshipToMC.
                      const affinityColorCode = resolveVisualAffinityColorCode(bond.affinity, 40);
                      return (
                        <div key={bond.id} className="p-3 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-start gap-4">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-sc font-bold text-signal">{bond.sourceCharName}</span>
                              <span className="text-[9px] font-mono text-neutral-600">to</span>
                              <span className="text-xs font-sc font-bold text-signal">{bond.targetCharName}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[8.5px] font-mono uppercase border"
                                data-color-code={affinityColorCode}
                                style={getColorCodeSurfaceStyle(affinityColorCode, { borderOpacity: 0.25, backgroundOpacity: 0.1 })}
                              >
                                Affinity: {bond.affinity > 0 ? `+${bond.affinity}` : bond.affinity}%
                              </span>
                            </div>
                            <p className="text-[11px] font-serif text-neutral-400 italic">
                              "{bond.description}"
                            </p>
                          </div>
                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setDeletePrompt({ id: bond.id, type: 'relationship' })}
                            className="p-1 px-1.5 text-neutral-500 hover:text-human hover:bg-neutral-900 rounded transition-colors"
                            title="Purge link"
                            aria-label="Purge link"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    }}
                  />
                </div>

              </div>

            </div>

    </>
  );
}
