import { BookOpen, ShieldAlert, Sparkles, Users, Volume2 } from 'lucide-react';
import type { Character, CreatureSpecies } from '../shared/types';
import { resolveEntityImageHistory } from '../shared/codex/entityImageHistory';

interface ReaderCodexBestiaryProps {
  bestiary: CreatureSpecies[];
  characters: Character[];
}

const manifestationUrl = (species: CreatureSpecies): string => {
  if (species.imageUrl?.trim()) return species.imageUrl;
  const history = resolveEntityImageHistory(species);
  return history.find(image => image.isCurrent)?.imageUrl
    ?? history[history.length - 1]?.imageUrl
    ?? '';
};

const chapterList = (chapters: number[]): string => chapters.length > 0
  ? chapters.map(chapter => `Ch. ${chapter}`).join(' · ')
  : 'No encounter chapters recorded.';

/**
 * Development-only species registry. A Bestiary record documents what a
 * species is; named non-human individuals remain Portrait records and are
 * linked here only by their application-owned IDs.
 */
export function ReaderCodexBestiary({
  bestiary,
  characters,
}: ReaderCodexBestiaryProps) {
  const charactersById = new Map(characters.map(character => [character.id, character]));

  return (
    <section className="space-y-5 animate-fadeIn" id="codex-bestiary" aria-labelledby="bestiary-heading">
      <header className="flex flex-col gap-2 border-b border-neutral-900 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-green-400" aria-hidden="true" />
            <h3 id="bestiary-heading" className="font-sc text-sm font-bold uppercase tracking-widest text-signal">
              Bestiary
            </h3>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Species records answer what a creature is. Portraits retain who a notable individual is.
          </p>
        </div>
        <span className="w-fit rounded border border-green-900/70 bg-green-950/20 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-green-300">
          {bestiary.length} known {bestiary.length === 1 ? 'species' : 'species'}
        </span>
      </header>

      {bestiary.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/30 px-5 py-10 text-center">
          <Sparkles size={18} className="mx-auto mb-2 text-neutral-700" aria-hidden="true" />
          <p className="text-xs text-neutral-500">No species have been encountered yet.</p>
          <p className="mt-1 text-[10px] text-neutral-600">
            A generic encounter will create a Bestiary entry without inventing a Portrait.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {bestiary.map(species => {
            const imageUrl = manifestationUrl(species);
            const notableIndividuals = species.notableIndividualIds
              .map(id => charactersById.get(id))
              .filter((character): character is Character => Boolean(character));

            return (
              <article
                key={species.id}
                className="overflow-hidden rounded-lg border border-neutral-900 bg-neutral-950 shadow-lg transition-colors hover:border-green-900/70"
              >
                <div className="grid grid-cols-[6.25rem_1fr] gap-0 sm:grid-cols-[8rem_1fr]">
                  <div className="relative min-h-32 border-r border-neutral-900 bg-void">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={species.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-center">
                        <Sparkles size={17} className="text-green-900" aria-hidden="true" />
                        <span className="font-mono text-[8px] uppercase tracking-wider text-neutral-600">
                          Species record
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-sc text-base text-signal">{species.name}</h4>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-green-300">
                          {species.classification}
                        </p>
                      </div>
                      <span className="rounded border border-orange-900/70 bg-orange-950/20 px-1.5 py-1 font-mono text-[8px] uppercase tracking-wider text-orange-300">
                        {species.threatLevel}
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
                      {species.description || 'No species description has been recorded.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-neutral-900 px-4 py-3">
                  {species.traits.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[8.5px] font-mono uppercase tracking-wider text-neutral-600">Traits and abilities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {species.traits.map(trait => (
                          <span key={trait} className="rounded border border-green-900/50 bg-green-950/20 px-1.5 py-1 text-[9px] text-green-200">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 text-[10px] text-neutral-500 sm:grid-cols-2">
                    <div className="flex items-start gap-1.5">
                      <BookOpen size={12} className="mt-0.5 shrink-0 text-neutral-600" aria-hidden="true" />
                      <span>First encountered: <strong className="font-medium text-neutral-300">Ch. {species.firstEncounteredChapter}</strong></span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <ShieldAlert size={12} className="mt-0.5 shrink-0 text-neutral-600" aria-hidden="true" />
                      <span>Appearances: <strong className="font-medium text-neutral-300">{chapterList(species.appearanceChapters)}</strong></span>
                    </div>
                    {species.signatureSound && (
                      <div className="flex items-start gap-1.5 sm:col-span-2">
                        <Volume2 size={12} className="mt-0.5 shrink-0 text-neutral-600" aria-hidden="true" />
                        <span>Signature sound: <strong className="font-medium text-neutral-300">{species.signatureSound}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-neutral-900 pt-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[8.5px] font-mono uppercase tracking-wider text-neutral-600">
                      <Users size={11} aria-hidden="true" />
                      Notable individuals
                    </p>
                    {notableIndividuals.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {notableIndividuals.map(individual => (
                          <span key={individual.id} className="rounded border border-portal/30 bg-portal/5 px-1.5 py-1 text-[9px] text-portal">
                            {individual.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-600">No named individual requires a Portrait.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
