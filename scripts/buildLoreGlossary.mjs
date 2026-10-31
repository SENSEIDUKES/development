#!/usr/bin/env node
/**
 * Builds the Lore glossary data from SENSEI's master glossary
 * (docs/lore/master-glossary.json), the first official edition of Lore.
 *
 *   node scripts/buildLoreGlossary.mjs
 *
 * Writes src/components/discover/shared/lore-glossary/:
 * - terms.json: every glossary term that is not already one of the curated
 *   36 terms in loreCatalogue.ts, with a permanent id, category, original
 *   script, aliases, related ids and English meaning.
 * - renderings/<language>.json: how each term (curated or glossary) is
 *   written in that SEN language, with the reason when the glossary has one.
 *
 * Ids are permanent: user versions of a term will attach to them later.
 * Never rename a published id; add a new term instead.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(join(root, 'docs/lore/master-glossary.json'), 'utf8'));
const out = join(root, 'src/components/discover/shared/lore-glossary');

/** Platform vocabulary, not genre lore. */
const EXCLUDED_CATEGORIES = new Set(['SEN Platform']);

/** Glossary terms that are the same concept as a curated term keep the curated id. */
const CURATED = {
  'Qi Condensation': 'qi-refining', 'Foundation Establishment': 'foundation-establishment', 'Golden Core': 'golden-core',
  'Nascent Soul': 'nascent-soul', 'Heavenly Tribulation': 'heavenly-tribulation', Ascension: 'ascension', Qi: 'qi',
  Dantian: 'dantian', Meridian: 'meridians', 'Spiritual Root': 'spiritual-root', Naegong: 'internal-energy',
  'Qi Deviation': 'qi-deviation', 'Pill Concocting': 'alchemy', Formation: 'formation', Talisman: 'talisman', Dao: 'dao',
  Jianghu: 'jianghu', Murim: 'murim', Face: 'face', 'Courting Death': 'courting-death', 'Frog in the Well': 'frog-in-well',
  Xianxia: 'xianxia', Wuxia: 'wuxia', Xuanhuan: 'xuanhuan', 'Progression Fantasy': 'progression-fantasy',
  Artifact: 'spiritual-treasure', 'Storage Ring': 'storage-ring',
};

const CATEGORIES = {
  Cultivation: 'cultivation', Techniques: 'cultivation', 'Artifacts and Pills': 'treasures', 'Beast Taming': 'beasts',
  Realms: 'worlds', Cosmology: 'worlds', Geography: 'worlds', Sects: 'sects', 'Kingdom Building': 'sects',
  'LitRPG System': 'systems', Korean: 'korean', Japanese: 'japanese', 'Progression Tropes': 'tropes', Academy: 'tropes',
  'Regression and Reincarnation': 'tropes', 'Meta-Fiction': 'tropes', 'Character Archetypes': 'characters', Genre: 'genres',
};

/** SEN language code → where its rendering comes from in the glossary. */
const LANGUAGES = {
  es: 'es', 'es-ES': 'es-es', 'pt-BR': 'pt-br', 'pt-PT': 'pt-pt', vi: 'vi', id: 'id', th: 'th', tl: 'tl', ms: 'ms',
  ar: 'ar', fa: 'fa', ur: 'ur', de: 'de', fr: 'fr', ru: 'ru', hi: 'hi', sw: 'sw', pl: 'pl', tr: 'tr', ig: 'ig',
  yo: 'yo', am: 'am', ha: 'ha', so: 'so',
};
/** Chinese, Japanese and Korean come from the original-script fields. */
const NATIVE = {
  'zh-CN': term => term.nativeLanguages.chinese.hanzi,
  'zh-TW': term => term.nativeLanguages.chinese.traditional || term.nativeLanguages.chinese.hanzi,
  ja: term => term.nativeLanguages.japanese.kanji,
  ko: term => term.nativeLanguages.korean.hangul,
};

const slug = text => text.normalize('NFKD').replace(/\p{M}|['’]/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const clean = text => (text ?? '').trim();

const terms = source.filter(term => !EXCLUDED_CATEGORIES.has(term.category));
const curatedIds = new Set(Object.values(CURATED));
const ids = new Map();
for (const term of terms) {
  if (!CATEGORIES[term.category] && !CURATED[term.term]) throw new Error(`No Lore category for ${term.category}`);
  const id = CURATED[term.term] ?? slug(term.term);
  if (!id) throw new Error(`Cannot make an id for ${term.term}`);
  if ([...ids.values()].includes(id) || (!CURATED[term.term] && curatedIds.has(id))) throw new Error(`Duplicate Lore id ${id}`);
  ids.set(term.term, id);
}
for (const name of Object.keys(CURATED)) if (!ids.has(name)) throw new Error(`Curated match ${name} is not in the glossary`);

const original = term => {
  const { chinese, korean, japanese } = term.nativeLanguages;
  if (chinese.hanzi) return { script: chinese.hanzi, pronunciation: clean(chinese.pinyin), originalLanguage: 'zh-CN' };
  if (korean.hangul) return { script: korean.hangul, pronunciation: clean(korean.romanization), originalLanguage: 'ko' };
  if (japanese.kanji) return { script: japanese.kanji, pronunciation: clean(japanese.romaji), originalLanguage: 'ja' };
  return { script: '', pronunciation: '', originalLanguage: 'en' };
};

const glossaryTerms = terms.filter(term => !CURATED[term.term]).map(term => {
  const id = ids.get(term.term);
  const related = [...new Set((term.related_terms ?? []).map(name => ids.get(name)).filter(value => value && value !== id))];
  const seen = new Set([plain(term.term)]);
  const aliases = (term.aliases ?? []).map(clean).filter(alias => alias && !seen.has(plain(alias)) && seen.add(plain(alias)));
  return { id, category: CATEGORIES[term.category], name: clean(term.term), ...original(term), aliases, related, meaning: clean(term.definition) };
});

/** A note that only repeats the term or the English name says nothing. */
const usefulNote = (note, rendering, english) => {
  const key = plain(note);
  return key.length > 3 && key !== plain(rendering) && key !== plain(english) ? note : undefined;
};
const entry = (rendering, note) => note ? [rendering, note] : [rendering];

const renderings = { en: {} };
for (const term of terms) renderings.en[ids.get(term.term)] = entry(clean(term.term), clean(term.translationNote) || undefined);
for (const [code, key] of Object.entries(LANGUAGES)) {
  renderings[code] = {};
  for (const term of terms) {
    const local = term.localizations?.[key];
    const rendering = clean(local?.term);
    if (rendering) renderings[code][ids.get(term.term)] = entry(rendering, usefulNote(clean(local.translationNote), rendering, term.term));
  }
}
for (const [code, read] of Object.entries(NATIVE)) {
  renderings[code] = {};
  for (const term of terms) {
    const rendering = clean(read(term));
    if (rendering) renderings[code][ids.get(term.term)] = [rendering];
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'renderings'), { recursive: true });
writeFileSync(join(out, 'terms.json'), `${JSON.stringify(glossaryTerms, null, 1)}\n`);
for (const [code, values] of Object.entries(renderings)) writeFileSync(join(out, 'renderings', `${code}.json`), `${JSON.stringify(values, null, 1)}\n`);
console.log(`[lore] ${glossaryTerms.length} glossary terms + ${Object.keys(CURATED).length} curated matches; renderings for ${Object.keys(renderings).length} languages`);
