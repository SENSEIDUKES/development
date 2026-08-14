import React, { useState } from 'react';
import { Compass, Sparkles, MapPin, Shield, Users } from 'lucide-react';
import { Character, Location, Faction } from '../types';
import { useCodex } from './CodexContext';

export function ReaderCodexFate({
  canonicalCreatureTerminology = false,
}: {
  /** Keeps the frozen Reference's legacy wording while Development emits canonical creature data. */
  canonicalCreatureTerminology?: boolean;
}) {
  const { memory, activeStory, onUpdateMemory } = useCodex();

  const [newChar, setNewChar] = useState<Partial<Character>>({ name: '', description: '', role: 'ally' });
  const [newLocation, setNewLocation] = useState<Partial<Location>>({ name: '', description: '', realm: '', safetyLevel: 'Safe' });
  const [newFaction, setNewFaction] = useState<Partial<Faction>>({ name: '', description: '', alignment: 'Neutral', headquarters: '', status: 'Active' });
  const [newWorldRule, setNewWorldRule] = useState('');

  const handleAddCharacter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChar.name) return;

    const isNonHumanCompanion = canonicalCreatureTerminology
      ? newChar.role === 'non-human-companion'
      : newChar.role === 'beast';
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: newChar.name,
      description: newChar.description || '',
      role: isNonHumanCompanion ? 'Companion' : newChar.role || 'ally',
      relationshipToMC: 'neutral',
      status: 'alive',
      portraitKind: isNonHumanCompanion ? 'non-human' : 'human',
    };

    const updatedChars = [...(memory.characters || []), newCharacter];
    onUpdateMemory({ ...memory, characters: updatedChars });
    setNewChar({ name: '', description: '', role: 'ally' });
  };

  const handleAddLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLocation.name?.trim()) return;

    const currentLocations = memory.locations || [];
    const locationObj: Location = {
      id: `loc-${Date.now()}`,
      name: newLocation.name.trim(),
      description: newLocation.description?.trim() || '',
      realm: newLocation.realm?.trim() || undefined,
      safetyLevel: newLocation.safetyLevel || 'Safe'
    };

    onUpdateMemory({
      ...memory,
      locations: [...currentLocations, locationObj]
    });

    setNewLocation({ name: '', description: '', realm: '', safetyLevel: 'Safe' });
  };

  const handleAddFaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaction.name?.trim()) return;

    const currentFactions = memory.factions || [];
    const factionObj: Faction = {
      id: `fct-${Date.now()}`,
      name: newFaction.name.trim(),
      description: newFaction.description?.trim() || '',
      alignment: newFaction.alignment || 'Neutral',
      headquarters: newFaction.headquarters?.trim() || undefined,
      status: newFaction.status
    };

    onUpdateMemory({
      ...memory,
      factions: [...currentFactions, factionObj]
    });

    setNewFaction({ name: '', description: '', alignment: 'Neutral', headquarters: '', status: 'Active' });
  };

  const handleAddWorldRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldRule.trim()) return;

    const currentRules = memory.worldRules || [];
    onUpdateMemory({
      ...memory,
      worldRules: [...currentRules, newWorldRule.trim()]
    });
    setNewWorldRule('');
  };
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="border-b border-neutral-900 pb-3 mb-4">
        <h3 className="font-display text-signal text-lg flex items-center space-x-2">
          <Compass size={18} className="text-portal" />
          <span>Fate</span>
        </h3>
        <p className="text-sm font-sans text-neutral-400 mt-1">
          Actively intervene in the cultivation world. Forge new entities, domains, and major factions. The story engine will fold these manifestations into the ongoing narrative.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CHARACTER CREATION */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="flex items-center space-x-2 font-sc text-sm uppercase tracking-wider text-human">
              <Users size={16} />
              <span>Manifest Sovereign</span>
            </h4>
          </div>

          <form onSubmit={handleAddCharacter} className="space-y-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-oilumm5">True Name</label>
              <input
                type="text"
                value={newChar.name || ''}
                onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
                placeholder="Name"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                required id="a11y-control-oilumm5"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-ilgjtg0">Destined Role</label>
              <select
                value={newChar.role || 'ally'}
                onChange={(e) => setNewChar({ ...newChar, role: e.target.value as any })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-ilgjtg0"
              >
                <option value="ally">Ally / Trusted Companion</option>
                <option value="enemy">Sworn Enemy / Rival</option>
                <option value="mentor">Hidden Grandmaster</option>
                <option value="neutral">Neutral / Merchant</option>
                <option value={canonicalCreatureTerminology ? 'non-human-companion' : 'beast'}>
                  {canonicalCreatureTerminology ? 'Non-Human Companion / Pet' : 'Spiritual Beast / Pet'}
                </option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-fk41zi8">Essence Description</label>
              <textarea
                value={newChar.description || ''}
                onChange={(e) => setNewChar({ ...newChar, description: e.target.value })}
                placeholder="Background, abilities, or aura style..."
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full h-20 resize-none text-xs"
                required id="a11y-control-fk41zi8"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2 bg-void hover:bg-neutral-900 border border-human text-human hover:text-signal shadow shadow-human/10 rounded font-sc text-[10px] tracking-wider uppercase font-bold transition-all flex justify-center items-center gap-1.5"
            >
              <Sparkles size={12} />
              <span>Force Manifestation</span>
            </button>
          </form>
        </div>

        {/* DOMAIN / LOCATION CREATION */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="flex items-center space-x-2 font-sc text-sm uppercase tracking-wider text-portal">
              <MapPin size={16} />
              <span>Formulate Domain</span>
            </h4>
          </div>

          <form onSubmit={handleAddLocation} className="space-y-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-1ngmw5r">Domain Name</label>
              <input
                type="text"
                value={newLocation.name || ''}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="e.g. Primordial Fog Valley"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                required id="a11y-control-1ngmw5r"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-764ulak">Safety Stratum</label>
              <select
                value={newLocation.safetyLevel || 'Safe'}
                onChange={(e) => setNewLocation({ ...newLocation, safetyLevel: e.target.value as any })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-764ulak"
              >
                <option value="Safe">Safe / Sanctuaries</option>
                <option value="Dangerous">Dangerous / Contested Space</option>
                <option value="Deadly">Deadly / Forbidden Realm</option>
                <option value="Unknown">Mysterious / Untouchable</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-1bu9d8c">Spatial Identity</label>
              <textarea
                value={newLocation.description || ''}
                onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                placeholder="A description of its visual aura, elements, and environmental laws..."
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full h-20 resize-none text-xs"
                required id="a11y-control-1bu9d8c"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2 bg-void hover:bg-neutral-900 border border-portal text-portal hover:text-signal shadow shadow-portal/10 rounded font-sc text-[10px] tracking-wider uppercase font-bold transition-all flex justify-center items-center gap-1.5"
            >
              <Sparkles size={12} />
              <span>Force Domain</span>
            </button>
          </form>
        </div>

        {/* FACTION CREATION */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="flex items-center space-x-2 font-sc text-sm uppercase tracking-wider text-green-500">
              <Shield size={16} />
              <span>Establish Sect</span>
            </h4>
          </div>

          <form onSubmit={handleAddFaction} className="space-y-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-n4yp3a1">Sect Name</label>
              <input
                type="text"
                value={newFaction.name || ''}
                onChange={(e) => setNewFaction({ ...newFaction, name: e.target.value })}
                placeholder="e.g. Celestial Sword Clan"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                required id="a11y-control-n4yp3a1"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-d4cyg74">Alignment / Dao</label>
              <select
                value={newFaction.alignment || 'Neutral'}
                onChange={(e) => setNewFaction({ ...newFaction, alignment: e.target.value as any })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-d4cyg74"
              >
                <option value="Orthodox">Orthodox (Righteous Path)</option>
                <option value="Unorthodox">Unorthodox (Demonic / Heretic)</option>
                <option value="Neutral">Neutral / Mercantile Sect</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-assguiy">Laws & Influence</label>
              <textarea
                value={newFaction.description || ''}
                onChange={(e) => setNewFaction({ ...newFaction, description: e.target.value })}
                placeholder="Core philosophy, signature techniques, or reputation in the world..."
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full h-20 resize-none text-xs"
                required id="a11y-control-assguiy"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2 bg-void hover:bg-neutral-900 border border-green-500 text-green-500 hover:text-signal shadow shadow-green-500/10 rounded font-sc text-[10px] tracking-wider uppercase font-bold transition-all flex justify-center items-center gap-1.5"
            >
              <Sparkles size={12} />
              <span>Force Sect</span>
            </button>
          </form>
        </div>

        {/* STORY DIRECTION / WORLD RULES CREATION */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="flex items-center space-x-2 font-sc text-sm uppercase tracking-wider text-purple-400">
              <Compass size={16} />
              <span>Alter Dao Rules</span>
            </h4>
          </div>

          <form onSubmit={handleAddWorldRule} className="space-y-3 flex flex-col h-full">
            <div className="flex-1">
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-tfeg3vf">Declare Universal Rule</label>
              <textarea
                value={newWorldRule}
                onChange={(e) => setNewWorldRule(e.target.value)}
                placeholder="E.g. No one can fly past the 9th realm, or trope intensity setting..."
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full h-28 resize-none text-xs"
                required id="a11y-control-tfeg3vf"
              />
              <p className="text-[9px] text-neutral-500 mt-2 font-sans italic">
                These rules overwrite standard genre logic and dictate the engine's bounds dynamically. You can adjust plot hooks, story directions, or constraints directly.
              </p>
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2 bg-void hover:bg-neutral-900 border border-purple-500 text-purple-500 hover:text-signal shadow shadow-purple-500/10 rounded font-sc text-[10px] tracking-wider uppercase font-bold transition-all flex justify-center items-center gap-1.5"
            >
              <Sparkles size={12} />
              <span>Manifest Reality</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
