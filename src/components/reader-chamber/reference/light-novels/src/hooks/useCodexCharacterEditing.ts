import { useState } from 'react';
import { Character, StoryMemory, Ability } from '../types';
import { generateId } from '../lib/id';
import {
  normalizeCodexEntryContext,
} from '../lib/codexEntryContext';
import type { CodexEntryContextValue } from '../lib/codexEntryContext';
import {
  findCodexAliasCollisions,
  stripLegacyCodexContextFields,
} from '../lib/codexContext';

interface UseCodexCharacterEditingOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

export type EditableCodexAbility = Ability & CodexEntryContextValue;
export type EditingCharData = Partial<Character> & CodexEntryContextValue & {
  abilitiesList?: EditableCodexAbility[];
};

type ContextAwareCharacter = Character & CodexEntryContextValue;

export interface CodexEditingAliasCollision {
  alias: string;
  ownerName: string;
  conflictingEntryName: string;
}

export function useCodexCharacterEditing({ memory, onUpdateMemory }: UseCodexCharacterEditingOptions) {
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editingCharData, setEditingCharData] = useState<EditingCharData>({});

  const editingCharacter = (memory.characters || []).find(char => char.id === editingCharId);
  const aliasCollisions: CodexEditingAliasCollision[] = editingCharacter
    ? [
        ...findCodexAliasCollisions(
          editingCharacter.id,
          editingCharacter.name,
          editingCharData.aliases,
          memory.characters || [],
        ).map(collision => ({
          ...collision,
          ownerName: editingCharacter.name,
        })),
        ...(editingCharData.abilitiesList || []).flatMap(ability => (
          findCodexAliasCollisions(
            ability.id,
            ability.name,
            ability.aliases,
            editingCharData.abilitiesList || [],
          ).map(collision => ({
            ...collision,
            ownerName: ability.name || 'Unnamed ability',
          }))
        )),
      ]
    : [];

  const handleSaveCharEdit = () => {
    if (editingCharId && aliasCollisions.length === 0) {
      const updated = (memory.characters || []).map(char => {
        if (char.id === editingCharId) {
          const contextFields = normalizeCodexEntryContext(
            editingCharData,
            char.provenance,
            char.name,
          );
          return {
            ...stripLegacyCodexContextFields(char as unknown as Record<string, unknown>),
            ...contextFields,
            description: editingCharData.description !== undefined
              ? editingCharData.description.trim()
              : char.description,
            powerLevel: editingCharData.powerLevel?.trim() || undefined,
            faction: editingCharData.faction?.trim() || undefined,
            signatureQuote: editingCharData.signatureQuote?.trim() || undefined,
            status: editingCharData.status || char.status || 'unknown',
            abilities: (() => {
              const validAbilities = editingCharData.abilitiesList
                ?.map(ability => ({
                  ...stripLegacyCodexContextFields(ability as unknown as Record<string, unknown>),
                  ...normalizeCodexEntryContext(ability, ability.provenance, ability.name),
                  name: ability.name.trim(),
                }))
                .filter(a => a.name);
              return validAbilities && validAbilities.length > 0 ? validAbilities : undefined;
            })(),
          } as Character;
        }
        return char;
      });
      onUpdateMemory({ ...memory, characters: updated });
      setEditingCharId(null);
    }
  };

  const beginCharEdit = (char: Character) => {
    setEditingCharId(char.id);
    const contextAwareChar = char as ContextAwareCharacter;
    
    const normalizedAbilities: EditableCodexAbility[] = (char.abilities || []).map((a, index) => {
      if (typeof a === 'string') {
        return {
          id: "ability-" + generateId(7) + "-" + index,
          name: a,
          description: '',
        };
      }
      const contextAwareAbility = a as EditableCodexAbility;
      return {
        ...contextAwareAbility,
        aliases: contextAwareAbility.aliases ? [...contextAwareAbility.aliases] : undefined,
        provenance: contextAwareAbility.provenance ? { ...contextAwareAbility.provenance } : undefined,
      };
    });

    setEditingCharData({
      aliases: contextAwareChar.aliases ? [...contextAwareChar.aliases] : undefined,
      contextPriority: contextAwareChar.contextPriority,
      authorContextNote: contextAwareChar.authorContextNote || '',
      provenance: contextAwareChar.provenance ? { ...contextAwareChar.provenance } : undefined,
      description: char.description || '',
      powerLevel: char.powerLevel || '',
      faction: char.faction || '',
      signatureQuote: char.signatureQuote || '',
      abilitiesList: normalizedAbilities,
      status: char.status || 'unknown',
    });
  };

  const addAbility = () => {
    setEditingCharData((prev) => ({
      ...prev,
      abilitiesList: [
        ...(prev.abilitiesList || []),
        { id: "ability-" + generateId(7), name: '', description: '' }
      ]
    }));
  };

  const updateAbility = (id: string, updates: Partial<EditableCodexAbility>) => {
    setEditingCharData((prev) => ({
      ...prev,
      abilitiesList: (prev.abilitiesList || []).map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  };

  const removeAbility = (id: string) => {
    setEditingCharData((prev) => ({
      ...prev,
      abilitiesList: (prev.abilitiesList || []).filter(a => a.id !== id)
    }));
  };

  return {
    editingCharId,
    setEditingCharId,
    editingCharData,
    setEditingCharData,
    aliasCollisions,
    handleSaveCharEdit,
    beginCharEdit,
    addAbility,
    updateAbility,
    removeAbility,
  };
}
