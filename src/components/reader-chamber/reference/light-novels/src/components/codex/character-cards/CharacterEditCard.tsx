import React from 'react';
import { Character } from '../../../types';
import { Trash2 } from 'lucide-react';
import { CodexEntryContextFields } from '../CodexEntryContextFields';
import type {
  EditableCodexAbility,
  EditingCharData,
  CodexEditingAliasCollision,
} from '../../../hooks/useCodexCharacterEditing';

interface CharacterEditCardProps {
  char: Character;
  editingCharData: EditingCharData;
  setEditingCharData: React.Dispatch<React.SetStateAction<EditingCharData>>;
  setEditingCharId: (id: string | null) => void;
  handleSaveCharEdit: () => void;
  addAbility: () => void;
  removeAbility: (id: string) => void;
  updateAbility: (id: string, data: Partial<EditableCodexAbility>) => void;
  aliasCollisions?: CodexEditingAliasCollision[];
}

export const CharacterEditCard: React.FC<CharacterEditCardProps> = ({
  char,
  editingCharData,
  setEditingCharData,
  setEditingCharId,
  handleSaveCharEdit,
  addAbility,
  removeAbility,
  updateAbility,
  aliasCollisions = [],
}) => {
  return (
    <div key={char.id} className="bg-neutral-950 border border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)] rounded-lg overflow-hidden flex flex-col group relative h-[500px]">
      <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center sticky top-0 z-10">
        <h5 className="font-sc font-medium text-portal text-sm flex items-center gap-2">
          Editing: {char.name}
        </h5>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar pb-16">
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1" htmlFor="edit-status">Status</label>
          <select
            id="edit-status"
            value={editingCharData.status || 'alive'}
            onChange={(e) => setEditingCharData({
              ...editingCharData,
              status: e.target.value as Character['status'],
            })}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 p-1.5 text-xs rounded focus:border-portal outline-none font-sc"
          >
            <option value="alive">Alive</option>
            <option value="deceased">Deceased</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1" htmlFor="edit-powerLevel">Power Level</label>
          <input
            id="edit-powerLevel"
            type="text"
            value={editingCharData.powerLevel || ''}
            onChange={(e) => setEditingCharData({ ...editingCharData, powerLevel: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 p-1.5 text-xs rounded focus:border-portal outline-none font-sc"
          />
        </div>

        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1" htmlFor="edit-faction">Affiliation</label>
          <input
            id="edit-faction"
            type="text"
            value={editingCharData.faction || ''}
            onChange={(e) => setEditingCharData({ ...editingCharData, faction: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 p-1.5 text-xs rounded focus:border-portal outline-none font-sc"
          />
        </div>

        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1" htmlFor="edit-description">Description</label>
          <textarea
            id="edit-description"
            value={editingCharData.description || ''}
            onChange={(e) => setEditingCharData({ ...editingCharData, description: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 p-2 text-xs rounded h-24 resize-none focus:border-portal outline-none font-sans"
          />
        </div>

        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1" htmlFor="edit-signatureQuote">Signature Quote</label>
          <textarea
            id="edit-signatureQuote"
            value={editingCharData.signatureQuote || ''}
            onChange={(e) => setEditingCharData({ ...editingCharData, signatureQuote: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 p-2 text-xs rounded h-16 resize-none focus:border-portal outline-none font-sans italic"
            placeholder="A memorable line spoken by this character..."
          />
        </div>

        <CodexEntryContextFields
          idPrefix={`character-${char.id}`}
          entityLabel={char.name}
          value={editingCharData}
          onChange={(updates) => setEditingCharData(current => ({ ...current, ...updates }))}
        />

        {aliasCollisions.length > 0 && (
          <div role="alert" className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[9px] text-amber-300">
            {aliasCollisions.map((collision, index) => (
              <p key={`${collision.ownerName}-${collision.alias}-${collision.conflictingEntryName}-${index}`}>
                “{collision.alias}” on {collision.ownerName} already identifies {collision.conflictingEntryName}.
              </p>
            ))}
          </div>
        )}

        <div className="border-t border-neutral-800 pt-4 mt-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-portal uppercase tracking-wider block font-bold font-sc">Known Abilities</span>
            <button
              type="button"
              onClick={addAbility}
              className="text-[9px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded border border-neutral-700 transition-colors uppercase font-mono tracking-wider"
            >
              + Add Ability
            </button>
          </div>

          <div className="space-y-3">
            {editingCharData.abilitiesList?.map((ability) => (
              <div key={ability.id} className="bg-neutral-900/50 border border-neutral-800 rounded p-2 space-y-2 relative">
                <div className="flex justify-between items-start">
                  <input
                    type="text"
                    placeholder="Ability Name"
                    value={ability.name}
                    onChange={(e) => updateAbility(ability.id, { name: e.target.value })}
                    className="bg-transparent border-b border-neutral-700 p-0.5 text-xs text-signal focus:border-portal outline-none w-2/3 font-sc"
                  />
                  <button
                    type="button"
                    onClick={() => removeAbility(ability.id)}
                    className="text-human/60 hover:text-human p-1 transition-colors"
                    aria-label={"Remove ability " + (ability.name.trim() || 'unnamed')}
                    title="Remove Ability"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
                <textarea
                  placeholder="Description"
                  value={ability.description}
                  onChange={(e) => updateAbility(ability.id, { description: e.target.value })}
                  className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300 min-h-[40px] resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`ability-${ability.id}-source`} className="text-[8px] text-neutral-500 uppercase">Source</label>
                    <input
                      id={`ability-${ability.id}-source`}
                      type="text"
                      value={ability.source || ''}
                      onChange={(e) => updateAbility(ability.id, { source: e.target.value })}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ability-${ability.id}-cost`} className="text-[8px] text-neutral-500 uppercase">Cost</label>
                    <input
                      id={`ability-${ability.id}-cost`}
                      type="text"
                      value={ability.cost || ''}
                      onChange={(e) => updateAbility(ability.id, { cost: e.target.value })}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ability-${ability.id}-limits`} className="text-[8px] text-neutral-500 uppercase">Limits</label>
                    <input
                      id={`ability-${ability.id}-limits`}
                      type="text"
                      value={ability.limits || ''}
                      onChange={(e) => updateAbility(ability.id, { limits: e.target.value })}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ability-${ability.id}-acq`} className="text-[8px] text-neutral-500 uppercase">Acq. Chapter</label>
                    <input
                      id={`ability-${ability.id}-acq`}
                      type="number"
                      value={ability.acquiredChapter !== undefined ? ability.acquiredChapter : ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateAbility(ability.id, { acquiredChapter: isNaN(val) ? undefined : val });
                      }}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ability-${ability.id}-mastery`} className="text-[8px] text-neutral-500 uppercase">Mastery Level</label>
                    <input
                      id={`ability-${ability.id}-mastery`}
                      type="text"
                      value={ability.masteryLevel || ''}
                      onChange={(e) => updateAbility(ability.id, { masteryLevel: e.target.value })}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ability-${ability.id}-lastUsed`} className="text-[8px] text-neutral-500 uppercase">Last Used Ch.</label>
                    <input
                      id={`ability-${ability.id}-lastUsed`}
                      type="number"
                      value={ability.lastUsedChapter !== undefined ? ability.lastUsedChapter : ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateAbility(ability.id, { lastUsedChapter: isNaN(val) ? undefined : val });
                      }}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ability-${ability.id}-canon`} className="text-[8px] text-neutral-500 uppercase">Canon Status</label>
                    <select
                      id={`ability-${ability.id}-canon`}
                      value={ability.canonStatus || 'confirmed'}
                      onChange={(e) => updateAbility(ability.id, { canonStatus: e.target.value as any })}
                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="rumored">Rumored</option>
                      <option value="forbidden">Forbidden</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>

                <CodexEntryContextFields
                  compact
                  idPrefix={`ability-${ability.id}`}
                  entityLabel={ability.name || 'unnamed ability'}
                  value={ability}
                  onChange={(updates) => updateAbility(ability.id, updates)}
                />
              </div>
            ))}
            {(!editingCharData.abilitiesList || editingCharData.abilitiesList.length === 0) && (
              <div className="text-center text-[10px] text-neutral-500 italic py-2">
                No abilities recorded. Add one above.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 mt-auto border-t border-neutral-900 sticky bottom-0 bg-black/95">
        <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setEditingCharId(null)} className="text-neutral-500 hover:text-neutral-300">Abort</button>
        <button
          type="button"
          disabled={aliasCollisions.length > 0}
          onClick={() => handleSaveCharEdit()}
          className="bg-portal text-void px-3 py-1 rounded font-bold font-sc uppercase tracking-wider text-[10px] hover:bg-portal-300 transition-colors shadow-lg shadow-portal/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
};
