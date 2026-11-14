import { useRef, useState, type ReactNode } from 'react';
import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';
import { Sparkles } from 'lucide-react';
import { CodexProfileHeader, type CodexPictureMade, type CodexPictureMaker } from '@seihouse/sen/harness-generation';
import { NarrativeButton } from '@seihouse/sen/presentation';

/** The same saved portrait and Manifest action in a Blueprint and the cover prerequisite. */
export function CharacterPortrait({ character, pictures, readOnly, cost = <EnergyActionCost actionId="image.generate" /> }: {
  character: CodexPictureMade; pictures?: CodexPictureMaker; readOnly?: boolean; cost?: ReactNode;
}) {
  const [making, setMaking] = useState(false);
  const [problem, setProblem] = useState<string>();
  const pending = useRef(false);
  const manifest = async () => {
    if (!pictures || pending.current) return;
    pending.current = true; setMaking(true); setProblem(undefined);
    try { await pictures.manifest(character); }
    catch (error) { setProblem(error instanceof Error ? error.message : 'The portrait could not be made. Please try again.'); }
    finally { pending.current = false; setMaking(false); }
  };
  const picture = pictures?.pictureOf(character.key);
  return <div className="min-w-0 space-y-2" aria-busy={making}>
    <CodexProfileHeader category="characters" name={character.name} line="" badges={[]}
      picture={picture} making={making && !picture} />
    {pictures && !readOnly && <NarrativeButton fullWidth size="sm" className="min-h-11" icon={Sparkles} disabled={making || !character.look.summary}
      onClick={() => void manifest()} aria-label={`Manifest ${character.name} portrait`}>
      {making ? 'Manifesting…' : picture ? 'Manifest again' : 'Manifest character'} {cost}
    </NarrativeButton>}
    {!character.look.summary && !readOnly && <p className="text-sm text-amber-200">Add an appearance or visual traits in the Blueprint to manifest this character.</p>}
    {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
  </div>;
}
