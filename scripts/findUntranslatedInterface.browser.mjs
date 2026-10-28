#!/usr/bin/env node
/**
 * Lists the interface phrases the NovelExpanded app still shows in English when
 * another language is chosen: the to-do list for the interface language packs
 * (`src/library/language/locales/`). It reports and never fails; the interface's
 * wording is still being reworked, so it is a tool, not a check.
 *
 * Run against `npm run dev` or `vite preview`:
 *   node scripts/findUntranslatedInterface.browser.mjs http://127.0.0.1:5173 ar,ja
 * With no languages it walks all 29. Each page is opened at a phone size with the
 * profile set to the language, the way a reader chooses it in Settings. A phrase
 * counts when the English page shows it and the translated page still shows it
 * unchanged. Story text the translator leaves alone on purpose (the same marks
 * `interfaceTranslation.ts` skips) is not counted.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = (process.argv[2] ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const LANGUAGES = ['es', 'zh-CN', 'zh-TW', 'ja', 'ko', 'vi', 'id', 'th', 'tl', 'ms', 'ar', 'he', 'fa', 'ur', 'pt-BR', 'es-ES',
  'pt-PT', 'de', 'fr', 'ru', 'hi', 'sw', 'pl', 'tr', 'ig', 'yo', 'am', 'ha', 'so'];
const languages = process.argv[3] ? process.argv[3].split(',') : LANGUAGES;
const PAGES = { Home: '/app/', Create: '/app/?page=create', Discover: '/app/?page=discover', Profile: '/app/?page=profile' };
const PROFILE_KEY = 'novelexpanded-reader-profile';
const output = 'output/untranslated-interface';

/** The visible interface text on the page, as its translator would see it. */
const collect = () => {
  const skipped = '[data-no-interface-translate], [data-chapter-number], [data-sen-text-block], [data-read-aloud-title], '
    + '[data-cave-bio], [data-cave-full-bio], [data-cave-username], [data-story-blueprint], [data-testid="prose-chapter-body"], '
    + '.world-card-caption-title, .world-card-caption-creator, .world-card-cover-title, .world-card-info-title, '
    + '.world-card-info-creator, .world-card-info-synopsis, .cave-home-bio, script, style, code, pre';
  const found = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.data.trim();
    const element = node.parentElement;
    if (!text || !/[A-Za-z]{2}/.test(text) || !element || element.closest(skipped) || !element.getClientRects().length) continue;
    found.add(text);
  }
  for (const element of document.querySelectorAll('[placeholder], [aria-label], [title]')) {
    if (element.closest(skipped) || element.hasAttribute('data-no-interface-translate-attrs')) continue;
    for (const name of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(name)?.trim();
      if (value && /[A-Za-z]{2}/.test(value)) found.add(value);
    }
  }
  return [...found];
};

async function read(browser, language, path) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(([key, code]) => {
    try { localStorage.setItem(key, JSON.stringify({ interfaceLanguage: code, defaultReadingLanguage: code })); } catch { /* private window */ }
  }, [PROFILE_KEY, language]);
  const page = await context.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForFunction(code => document.documentElement.dataset.interfaceLanguage === code || code === 'en', language);
  await page.waitForTimeout(600);
  const texts = await page.evaluate(collect);
  await context.close();
  return texts;
}

const browser = await chromium.launch();
const report = {};
for (const [name, path] of Object.entries(PAGES)) {
  const english = new Set(await read(browser, 'en', path));
  for (const language of languages) {
    const left = (await read(browser, language, path)).filter(text => english.has(text));
    (report[language] ??= {})[name] = left;
  }
}
await browser.close();

mkdirSync(output, { recursive: true });
writeFileSync(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
for (const [language, pages] of Object.entries(report)) {
  const counts = Object.entries(pages).map(([name, texts]) => `${name} ${texts.length}`).join(', ');
  console.log(`${language.padEnd(6)} ${counts}`);
}
console.log(`\nEvery phrase, by language and page: ${output}/report.json`);
