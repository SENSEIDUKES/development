import React, { useState } from 'react';
import { Heart, Zap, Network, Sparkles } from 'lucide-react';
import { StoryMemory, StoryWorld, Character } from '../types';
import {
  getColorCodeStyle,
  getColorCodeSurfaceStyle,
  getColorCodeValue,
  resolveKarmaMetricColorCode,
  resolvePowerStageColorCode,
  resolveRelationshipAffinityColorCode,
  POWER_STAGE_BREAKTHROUGH_COLOR_CODE,
} from '../../../reader-chamber/shared/colorCodes';

const AFFINITY_NEUTRAL_THRESHOLD = 20;

const POWER_STAGE_THRESHOLDS = [
  { label: 'Nascent (85)', position: 0.15, stageName: 'Nascent' },
  { label: 'Core (70)', position: 0.3, stageName: 'Core' },
  { label: 'Found. (55)', position: 0.45, stageName: 'Foundation' },
  { label: 'Qi (35)', position: 0.65, stageName: 'Qi' },
  { label: 'Mortal', position: 1, stageName: 'Mortal' },
] as const;

function resolveChartAffinityColorCode(affinity: number) {
  return resolveRelationshipAffinityColorCode(
    Math.abs(affinity) <= AFFINITY_NEUTRAL_THRESHOLD ? 0 : affinity,
  );
}

interface ReaderCodexDashboardsProps {
  memory: StoryMemory;
  activeStory: StoryWorld;
  flatChapters: any[];
  charsToRender: Character[];
  affinityTimelineOfChar: any[];
  powerTimeline: any[];
  selectedChartCharId: string;
  setSelectedChartCharId: React.Dispatch<React.SetStateAction<string>>;
}

export function ReaderCodexDashboards({
  memory,
  activeStory,
  flatChapters,
  charsToRender,
  affinityTimelineOfChar,
  powerTimeline,
  selectedChartCharId,
  setSelectedChartCharId
}: ReaderCodexDashboardsProps) {
  const [hoveredAffPoint, setHoveredAffPoint] = useState<any | null>(null);
  const [hoveredPowerPoint, setHoveredPowerPoint] = useState<any | null>(null);
  const currentPowerStageColorCode = resolvePowerStageColorCode(memory.currentPowerStage);

  // Clear local hover details and ensure selectedChartCharId is valid whenever charsToRender or selectedChartCharId changes.
  React.useEffect(() => {
    setHoveredAffPoint(null);
    if (charsToRender.length > 0 && !charsToRender.find(c => c.id === selectedChartCharId)) {
      setSelectedChartCharId(charsToRender[0].id);
    }
  }, [charsToRender, selectedChartCharId, setSelectedChartCharId]);

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-225" id="codex-progression-dashboards">
      <div className="border-b border-neutral-900 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Chronicles of the Heavenly Path</h3>
          <p className="text-[10px] text-neutral-500 font-sans">Aether metrics illustrating MC cultivation breakthroughs and secondary character affinity timelines.</p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[10px] px-2 py-0.5 font-mono bg-neutral-900 border border-neutral-850 text-cyan-400 rounded">
            Chapters Logged: {flatChapters.length}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 font-mono rounded"
            data-color-code={currentPowerStageColorCode}
            style={getColorCodeSurfaceStyle(currentPowerStageColorCode, { borderOpacity: 0.2, backgroundOpacity: 0.08 })}
          >
            Current Rank: {memory.currentPowerStage || 'None'}
          </span>
        </div>
      </div>

      {flatChapters.length === 0 ? (
        <div className="text-center py-20 border border-neutral-900 rounded-lg bg-neutral-950/20 text-xs text-neutral-500 italic space-y-3">
          <p>The Akashic Record remains void. The paths of destiny are yet unwritten.</p>
          <p className="text-[10px] text-neutral-600 not-italic">Write or generate standard chapters inside the core Reader to materialize interactive progression maps.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">

          {/* Visual Charts Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* CHART 1: Relationship Affinity Timeline Chart */}
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-4 md:p-5 flex flex-col space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
                <div className="flex items-center space-x-2">
                  <Heart
                    size={14}
                    className="shrink-0"
                    data-color-code="bond"
                    style={{ color: getColorCodeValue('bond') }}
                  />
                  <span className="font-sc font-bold text-xs uppercase tracking-wider text-signal">Affinity Chronology</span>
                </div>

                {/* Character Selector Option */}
                {(memory.characters || []).length > 0 ? (
                  <select
                    value={selectedChartCharId}
                    onChange={(e) => {
                      setSelectedChartCharId(e.target.value);
                      setHoveredAffPoint(null);
                    }}
                    className="text-[11px] bg-void border border-neutral-850 rounded px-2.5 py-1 text-neutral-300 focus:outline-none focus:border-portal cursor-pointer max-w-[180px] truncate"
                  >
                    {charsToRender.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name} ({char.role.split(',')[0]})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] text-neutral-600">No companions bound</span>
                )}
              </div>

              {charsToRender.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10 text-xs text-neutral-500 italic">
                  Align secondary characters in the Living Codex first to map karmic affinity.
                </div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Interactive SVG Line Graph for Affinity */}
                  {(() => {
                    const activeChar = charsToRender.find(c => c.id === selectedChartCharId);
                    if (!activeChar) return null;
                    const points = affinityTimelineOfChar;
                    const total = points.length;

                    // Dimensions
                    const w = 500;
                    const h = 200;
                    const padL = 40;
                    const padR = 20;
                    const padT = 20;
                    const padB = 30;

                    const graphW = w - padL - padR;
                    const graphH = h - padT - padB;

                    const coords = points.map((p, i) => {
                      const x = padL + (total > 1 ? (i / (total - 1)) * graphW : graphW / 2);
                      const normY = (p.affinity + 100) / 200;
                      const y = padT + (1 - normY) * graphH;
                      return { x, y, p, index: i };
                    });

                    let linePath = '';
                    if (coords.length > 0) {
                      linePath = `M ${coords[0].x} ${coords[0].y}`;
                      for (let i = 1; i < coords.length; i++) {
                        linePath += ` L ${coords[i].x} ${coords[i].y}`;
                      }
                    }

                    const displayPoint = hoveredAffPoint || (points.length > 0 ? points[points.length - 1] : null);

                    return (
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="relative bg-void/50 border border-neutral-900/40 p-2 rounded-lg flex-1">
                          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
                            {/* Gridlines */}
                            <line x1={padL} y1={padT} x2={w - padR} y2={padT} stroke="#1b1b1b" strokeDasharray="3,3" />
                            <line
                              x1={padL}
                              y1={padT + graphH/2}
                              x2={w - padR}
                              y2={padT + graphH/2}
                              data-color-code="unknown"
                              stroke={getColorCodeValue('unknown')}
                              strokeOpacity="0.25"
                              strokeDasharray="4,4"
                            />
                            <line x1={padL} y1={padT + graphH} x2={w - padR} y2={padT + graphH} stroke="#1b1b1b" strokeDasharray="3,3" />

                            {/* Axes notes */}
                            <text x={padL - 10} y={padT + 4} textAnchor="end" data-color-code="ally" fill={getColorCodeValue('ally')} className="font-mono text-[8px] font-bold">100 (Boon)</text>
                            <text x={padL - 10} y={padT + graphH/2 + 3} textAnchor="end" data-color-code="unknown" fill={getColorCodeValue('unknown')} className="font-mono text-[8px] font-bold">0 (Neutral)</text>
                            <text x={padL - 10} y={padT + graphH + 2} textAnchor="end" data-color-code="enemy" fill={getColorCodeValue('enemy')} className="font-mono text-[8px] font-bold">-100 (Foe)</text>

                            {total > 1 && (
                              <>
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="url(#gradient-affinity)"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  className="transition-all duration-500"
                                />
                                <defs>
                                  <linearGradient id="gradient-affinity" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" data-color-code="enemy" stopColor={getColorCodeValue('enemy')} />
                                    <stop offset="50%" data-color-code="unknown" stopColor={getColorCodeValue('unknown')} />
                                    <stop offset="100%" data-color-code="ally" stopColor={getColorCodeValue('ally')} />
                                  </linearGradient>
                                </defs>
                              </>
                            )}

                            {coords.map((c) => {
                              const isHovered = hoveredAffPoint?.chapterNumber === c.p.chapterNumber || (!hoveredAffPoint && c.index === total - 1);
                              // Affinity is the separate inter-character
                              // ledger. Keep its ±20 neutral band while using
                              // the shared Color Code resolver for every hue.
                              const affinityColorCode = resolveChartAffinityColorCode(c.p.affinity);

                              return (
                                <g key={c.p.chapterNumber} data-color-code={affinityColorCode}>
                                  <circle
                                    cx={c.x}
                                    cy={c.y}
                                    r={isHovered ? "6.5" : "4"}
                                    fill="#0a0a0a"
                                    stroke={getColorCodeValue(affinityColorCode)}
                                    strokeWidth={isHovered ? "2.5" : "1.2"}
                                    className="cursor-pointer transition-all duration-200 hover:scale-125"
                                    onClick={() => setHoveredAffPoint(c.p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHoveredAffPoint(c.p); } }}
                                  />
                                  {total <= 15 && (
                                    <text
                                      x={c.x}
                                      y={padT + graphH + 18}
                                      textAnchor="middle"
                                      fill="#666"
                                      className="font-mono text-[7px]"
                                    >
                                      Ch {c.p.chapterNumber}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {displayPoint && (() => {
                          const affinityColorCode = resolveChartAffinityColorCode(displayPoint.affinity);
                          return (
                            <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-lg space-y-1.5 text-xs">
                              <div className="flex items-center justify-between font-mono">
                                <span className="font-bold text-signal">Chapter {displayPoint.chapterNumber}: {displayPoint.title}</span>
                                <span
                                  className="px-2 py-0.5 font-bold uppercase rounded text-[9px] border"
                                  data-color-code={affinityColorCode}
                                  style={getColorCodeSurfaceStyle(affinityColorCode, { borderOpacity: 0.2, backgroundOpacity: 0.1 })}
                                >
                                  Affinity: {displayPoint.affinity > 0 ? `+${displayPoint.affinity}` : displayPoint.affinity}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 leading-normal italic font-light font-serif">
                                {displayPoint.eventSummary}
                              </p>
                              {displayPoint.hasInteraction && (
                                <div className="flex items-center space-x-1 py-0.5 text-[9px] text-portal/80 font-mono">
                                  <span className="animate-pulse text-xs">•</span>
                                  <span>Direct alchemical alignment interface response logged inside original chapter script.</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* CHART 2: MC Breakthrough & Power Stage Curve Graph */}
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-4 md:p-5 flex flex-col space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
                <div className="flex items-center space-x-2">
                  <Zap
                    size={14}
                    className="shrink-0"
                    data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}
                    style={getColorCodeStyle(POWER_STAGE_BREAKTHROUGH_COLOR_CODE)}
                  />
                  <span className="font-sc font-bold text-xs uppercase tracking-wider text-signal">MC breakthroughs progress</span>
                </div>
                <span
                  className="text-[9.5px] uppercase font-mono px-2 py-0.5 border rounded"
                  data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}
                  style={getColorCodeSurfaceStyle(POWER_STAGE_BREAKTHROUGH_COLOR_CODE, { borderOpacity: 0.2, backgroundOpacity: 0.05 })}
                >
                  Ascension Path
                </span>
              </div>

              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Interactive SVG Staircase Curve for MC Cultivation */}
                {(() => {
                  const points = powerTimeline;
                  const total = points.length;

                  // Dimensions
                  const w = 500;
                  const h = 200;
                  const padL = 40;
                  const padR = 20;
                  const padT = 20;
                  const padB = 30;

                  const graphW = w - padL - padR;
                  const graphH = h - padT - padB;

                  const coords = points.map((p, i) => {
                    const x = padL + (total > 1 ? (i / (total - 1)) * graphW : graphW / 2);
                    const normY = p.score / 100;
                    const y = padT + (1 - normY) * graphH;
                    return { x, y, p, index: i };
                  });

                  let curvePath = '';
                  if (coords.length > 0) {
                    curvePath = `M ${coords[0].x} ${coords[0].y}`;
                    for (let i = 1; i < coords.length; i++) {
                      const midX = coords[i-1].x + (coords[i].x - coords[i-1].x) * 0.4;
                      curvePath += ` L ${midX} ${coords[i-1].y} L ${midX} ${coords[i].y} L ${coords[i].x} ${coords[i].y}`;
                    }
                  }

                  const displayPoint = hoveredPowerPoint || (points.length > 0 ? points[points.length - 1] : null);

                  return (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="relative bg-void/50 border border-neutral-900/40 p-2 rounded-lg flex-1">
                        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
                          {/* Horizontal gridlines representing major celestial thresholds */}
                          <line x1={padL} y1={padT} x2={w - padR} y2={padT} stroke="#1b1b1b" />
                          <line x1={padL} y1={padT + graphH * 0.15} x2={w - padR} y2={padT + graphH * 0.15} stroke="#222" strokeDasharray="3,3" />
                          <line x1={padL} y1={padT + graphH * 0.3} x2={w - padR} y2={padT + graphH * 0.3} stroke="#222" strokeDasharray="3,3" />
                          <line x1={padL} y1={padT + graphH * 0.45} x2={w - padR} y2={padT + graphH * 0.45} stroke="#222" strokeDasharray="3,3" />
                          <line x1={padL} y1={padT + graphH * 0.65} x2={w - padR} y2={padT + graphH * 0.65} stroke="#222" strokeDasharray="3,3" />
                          <line x1={padL} y1={padT + graphH} x2={w - padR} y2={padT + graphH} stroke="#1b1b1b" />

                          {/* Threshold labels retain their established stage meanings through the shared registry. */}
                          {POWER_STAGE_THRESHOLDS.map((threshold) => {
                            const colorCode = resolvePowerStageColorCode(threshold.stageName);
                            return (
                              <text
                                key={threshold.stageName}
                                x={padL - 10}
                                y={padT + graphH * threshold.position + (threshold.position === 1 ? 2 : 3)}
                                textAnchor="end"
                                data-color-code={colorCode}
                                fill={getColorCodeValue(colorCode)}
                                className="font-mono text-[7px] font-medium"
                              >
                                {threshold.label}
                              </text>
                            );
                          })}

                          {total > 1 && (
                            <path
                              d={curvePath}
                              fill="none"
                              data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}
                              stroke={getColorCodeValue(POWER_STAGE_BREAKTHROUGH_COLOR_CODE)}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          )}

                          {coords.map((c) => {
                            const isHovered = hoveredPowerPoint?.chapterNumber === c.p.chapterNumber || (!hoveredPowerPoint && c.index === total - 1);
                            const breakthroughNode = c.p.breakthrough;

                            return (
                              <g key={c.p.chapterNumber} data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}>
                                <circle
                                  cx={c.x}
                                  cy={c.y}
                                  r={isHovered ? "6.5" : breakthroughNode ? "5" : "3.5"}
                                  data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}
                                  fill={breakthroughNode ? getColorCodeValue(POWER_STAGE_BREAKTHROUGH_COLOR_CODE) : "#0d0d0d"}
                                  stroke={getColorCodeValue(POWER_STAGE_BREAKTHROUGH_COLOR_CODE)}
                                  strokeWidth={isHovered ? "2.5" : breakthroughNode ? "1.5" : "1.2"}
                                  className={`cursor-pointer transition-all duration-200 ${breakthroughNode ? 'animate-pulse' : ''} hover:scale-125`}
                                  onClick={() => setHoveredPowerPoint(c.p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHoveredPowerPoint(c.p); } }}
                                />
                                {total <= 15 && (
                                  <text
                                    x={c.x}
                                    y={padT + graphH + 18}
                                    textAnchor="middle"
                                    fill="#666"
                                    className="font-mono text-[7px]"
                                  >
                                    Ch {c.p.chapterNumber}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {displayPoint && (
                        <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-lg space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-signal">Chapter {displayPoint.chapterNumber}: {displayPoint.title}</span>
                            <span
                              className="font-bold border px-2 py-0.5 rounded text-[9.5px] uppercase"
                              data-color-code={resolvePowerStageColorCode(displayPoint.stageName)}
                              style={getColorCodeSurfaceStyle(resolvePowerStageColorCode(displayPoint.stageName), { borderOpacity: 0.2, backgroundOpacity: 0.1 })}
                            >
                              {displayPoint.stageName}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-normal italic font-light font-serif">
                            {displayPoint.summary}
                          </p>
                          {displayPoint.breakthrough && (
                            <div
                              className="flex items-center space-x-1 text-[9px] font-mono"
                              data-color-code={POWER_STAGE_BREAKTHROUGH_COLOR_CODE}
                              style={getColorCodeStyle(POWER_STAGE_BREAKTHROUGH_COLOR_CODE)}
                            >
                              <Sparkles size={11} className="shrink-0" />
                              <span>Core breakthrough advancement recorded inside celestial memory layers.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* Bottom Full-Width Section: Karma Nodes Destiny Analysis */}
          <div className="bg-neutral-950/30 border border-neutral-900 rounded-xl p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div className="flex items-center space-x-2">
                <Network size={14} className="text-portal shrink-0" />
                <span className="font-sc font-bold text-xs uppercase tracking-wider text-signal">Causal Destiny & Karma Balance</span>
              </div>
              <span className="text-[9.5px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 border border-neutral-850 rounded">
                Causal Web Metrics
              </span>
            </div>

            {(() => {
              const nodes = activeStory.karmaNodes || [];

              let activeNodes = 0;
              let resolvedNodes = 0;
              let debts = 0;
              let boons = 0;
              let enmities = 0;
              let destinies = 0;

              // Optimize 6x O(N) array traversals into a single O(N) pass, avoiding intermediate array memory allocations
              for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.status === 'active') activeNodes++;
                if (n.status === 'resolved') resolvedNodes++;
                if (n.type === 'Debt') debts++;
                if (n.type === 'Boon') boons++;
                if (n.type === 'Enmity') enmities++;
                if (n.type === 'Destiny') destinies++;
              }

              const debtColorCode = resolveKarmaMetricColorCode('debt');
              const boonColorCode = resolveKarmaMetricColorCode('boon');
              const destinyColorCode = resolveKarmaMetricColorCode('destiny');

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                  <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Active Karma Contracts</span>
                    <span className="text-2xl font-bold font-sc text-portal mt-2">{activeNodes}</span>
                    <span className="text-[9.5px] text-neutral-500 font-mono mt-1">{resolvedNodes} snaps resolved</span>
                  </div>

                  <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                      <span>Karmic Debts</span>
                      <span data-color-code={debtColorCode} style={getColorCodeStyle(debtColorCode)}>●</span>
                    </div>
                    <span data-color-code={debtColorCode} style={getColorCodeStyle(debtColorCode)} className="text-2xl font-bold font-sc mt-2">{debts}</span>
                    <span className="text-[9.5px] text-neutral-500 font-sans mt-0.5 leading-snug">Spiritual blockages requiring master settlement.</span>
                  </div>

                  <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                      <span>Celestial Boons</span>
                      <span data-color-code={boonColorCode} style={getColorCodeStyle(boonColorCode)}>●</span>
                    </div>
                    <span data-color-code={boonColorCode} style={getColorCodeStyle(boonColorCode)} className="text-2xl font-bold font-sc mt-2">{boons}</span>
                    <span className="text-[9.5px] text-neutral-500 font-sans mt-0.5 leading-snug">Sect inheritance or Master Gu blessings active.</span>
                  </div>

                  <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                      <span>Destinies & Enmities</span>
                      <span data-color-code={destinyColorCode} style={getColorCodeStyle(destinyColorCode)}>●</span>
                    </div>
                    <span data-color-code={destinyColorCode} style={getColorCodeStyle(destinyColorCode)} className="text-2xl font-bold font-sc mt-2">{destinies + enmities}</span>
                    <span className="text-[9.5px] text-neutral-500 font-sans mt-0.5 leading-snug">Vengeful sect elders or fated ascension loops.</span>
                  </div>

                </div>
              );
            })()}

            {(!activeStory.karmaNodes || activeStory.karmaNodes.length === 0) && (
              <div className="text-center py-4 text-[11px] text-neutral-500 font-sans italic">
                No karma nodes have been bound in this mortal cycle yet. Engrave connections inside the **Karma** tab or use **Alter Fate** reader blocks to trigger destinies.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
