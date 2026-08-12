import React, { useState, useEffect } from 'react';
import { BookMarked, RefreshCcw, Sparkles, Search, ShieldAlert } from 'lucide-react';
import { StoryMemory, StoryArc, MultiModelRouting } from '../types';
import { extractWorkshopGlossaryTerms } from '../codexCompatibility';

const DEFAULT_CULTIVATION_GLOSSARY = [
  { term: "Qi (气)", category: "Vital Energy", definition: "The fundamental spiritual life energy flowing through all celestial creation. Cultivators refine raw worldly Qi inside their dantian to grow standard power." },
  { term: "Dantian (丹田)", category: "Anatomy", definition: "The spiritual elixir field located near the core of the physical body. It functions as the central crucible of alchemical cultivation storage." },
  { term: "Heavenly Tribulation (天劫)", category: "Cosmic Phenomenon", definition: "Savage, lightning-infused trials triggered by the Heavenly Tao when a cultivator breaks through critical tier thresholds, trying to disintegrate them for defying physical laws." },
  { term: "Jade Slip (玉简)", category: "Substance", definition: "Exquisite spiritual jade plates onto which supreme grandmaster mental brands are inscribed, utilized to safely store cultivation martial manuals." },
  { term: "Kowtow (叩头)", category: "Culture", definition: "Kneeling and knocking the forehead to the ground. A submissive form of showing utmost respect or pleading for grand master mercy." },
  { term: "Dao (道)", category: "Cosmic Law", definition: "The infinite, incomprehensible 'Way' or natural order governing absolute physical and spiritual dimensions. Cultivators seek total enlightenment of their chosen Dao paths." },
  { term: "Spiritual Meridians (经脉)", category: "Anatomy", definition: "The internal energetic high-speed channels of the body through which refined Qi flows. Blocked or destroyed meridians lead to crippled cultivation ruins." }
];

type GlossaryTerm = { term: string; category: string; definition: string };

const normalizeGlossaryTermName = (term: string) => term.trim().toLowerCase();

const mergeNewGlossaryTerms = (
  existingTerms: GlossaryTerm[],
  generatedTerms: GlossaryTerm[]
): GlossaryTerm[] => {
  const existingTermNames = new Set(existingTerms.map(({ term }) => normalizeGlossaryTermName(term)));
  const mergedTerms = [...existingTerms];

  for (const generatedTerm of generatedTerms) {
    const normalizedTermName = normalizeGlossaryTermName(generatedTerm.term);

    if (!existingTermNames.has(normalizedTermName)) {
      existingTermNames.add(normalizedTermName);
      mergedTerms.push(generatedTerm);
    }
  }

  return mergedTerms;
};

interface ReaderCodexGlossaryProps {
  memory: StoryMemory;
  arcs: StoryArc[];
  mcName: string;
  routingConfig?: MultiModelRouting;
}

export function ReaderCodexGlossary({ memory, arcs, mcName, routingConfig }: ReaderCodexGlossaryProps) {
  const [glossarySearch, setGlossarySearch] = useState('');
  const [customGlossary, setCustomGlossary] = useState<GlossaryTerm[]>([]);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`custom_glossary_${mcName}`);
      if (cached) {
        setCustomGlossary(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to read glossary cache", e);
    }
  }, [mcName]);

  const saveCustomGlossaryLocally = (terms: GlossaryTerm[]) => {
    setCustomGlossary(terms);
    try {
      localStorage.setItem(`custom_glossary_${mcName}`, JSON.stringify(terms));
    } catch (e) {
      console.warn('LocalStorage Quota exceeded for glossary:', e);
    }
  };

  const handleGenerateCustomGlossary = async () => {
    setIsExtractingGlossary(true);
    setGlossaryError(null);

    try {
      const characterNames = memory.characters?.map(c => c.name) || [];
      const factionNames = (memory.factions || []).map(f => f.name);

      const generatedTerms = await extractWorkshopGlossaryTerms({
        storyTitle: arcs[0]?.title || "Active Light Novel Matrix",
        mcName,
        powerSystem: memory.powerSystem,
        characterNames,
        factionNames,
        routingConfig
      });

      if (Array.isArray(generatedTerms)) {
        saveCustomGlossaryLocally(mergeNewGlossaryTerms(customGlossary, generatedTerms));
      } else {
        throw new Error("Invalid format returned by scribe.");
      }
    } catch (err: any) {
      console.error(err);
      setGlossaryError(err.message || "Celestial archive records currently unstable.");
    } finally {
      setIsExtractingGlossary(false);
    }
  };

  const compositeGlossary = [...DEFAULT_CULTIVATION_GLOSSARY, ...customGlossary];
  const filteredGlossary = compositeGlossary.filter(item =>
    item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    item.definition.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    item.category.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn" id="codex-glossary-lookup">
      <div className="border-b border-neutral-900 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Lore</h3>
          <p className="text-[10px] text-neutral-500 font-sans">Look up traditional light novel cultivation slang and dynamically extract story-specific concepts using Gemini.</p>
        </div>
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleGenerateCustomGlossary}
          disabled={isExtractingGlossary}
          className={`px-3 py-1.5 rounded font-mono border font-bold text-[9px] uppercase tracking-wider flex items-center space-x-1 transition-all ${
            isExtractingGlossary
              ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
              : 'bg-void border-purple-500/20 text-purple-400 hover:border-purple-500 hover:bg-purple-950/10'
          }`}
        >
          {isExtractingGlossary ? (
            <>
              <RefreshCcw size={10} className="animate-spin text-purple-400" />
              <span>SCOUT is scanning...</span>
            </>
          ) : (
            <>
              <Sparkles size={10} className="text-purple-400 animate-pulse" />
              <span>Channel Story Lore</span>
            </>
          )}
        </button>
      </div>

      {glossaryError && (
        <div className="p-3 bg-human/15 border border-human/25 rounded text-[10px] text-neutral-300 font-sans flex items-center gap-2">
          <ShieldAlert size={14} className="text-human" />
          <span>{glossaryError}</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
        <input
          type="text"
          value={glossarySearch}
          onChange={(e) => setGlossarySearch(e.target.value)}
          placeholder="Search standard Xianxia patterns or custom dynamic story nodes..."
          className="w-full bg-neutral-950 border border-neutral-900 text-signal pl-10 pr-4 py-2 text-xs rounded"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGlossary.map((term, idx) => (
          <div key={idx} className="bg-neutral-950/40 border border-neutral-900 rounded p-4 space-y-2">
            <div className="flex items-start justify-between">
              <span className="font-sc font-bold text-signal text-sm">{term.term}</span>
              <span className="text-[8px] uppercase font-mono tracking-wider border border-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">
                {term.category}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans italic leading-relaxed">
              "{term.definition}"
            </p>
          </div>
        ))}
        {filteredGlossary.length === 0 && (
          <div className="text-neutral-500 text-xs italic py-10 col-span-2 text-center">
            No terms found matching "{glossarySearch}".
          </div>
        )}
      </div>
    </div>
  );
}
