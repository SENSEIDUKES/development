#!/usr/bin/env node
/**
 * The NovelExpanded app holds only what is being built now. This walks its
 * real import graph, from the one module app/index.html loads, and fails on
 * any path into an older system, the Workshop, or the HARNESS developer page,
 * printing the chain that reached it. Runs in `check:app`, `verify`, the build
 * and CI.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildGraph } from './ownershipGraph.mjs';
import { ownershipOf } from './ownershipInventory.mjs';

export const APP_PAGE = 'app/index.html';
const APP_SOURCE = 'src/novel-expanded/';

/**
 * The package entries the app's own files may import. Profile and Familiar
 * joined on 2026-10-07, when the owner brought the Profile and everything it
 * connects to (the Cave, the floating Familiar) into the app.
 */
export const APP_ENTRIES = new Set([
  '@seihouse/library/stories', '@seihouse/library/story-seed', '@seihouse/library/home',
  '@seihouse/library/shell', '@seihouse/library/presentation',
  '@seihouse/library/profile', '@seihouse/library/familiar',
  '@seihouse/sen/story-seed', '@seihouse/sen/harness-generation', '@seihouse/sen/presentation',
  '@seihouse/sen/reader-runtime', '@seihouse/sen/styles.css',
]);

/** Entries of older systems, which nothing the app loads may reach. */
export const RETIRED_ENTRIES = new Set([
  '@seihouse/sen/reader-chamber', '@seihouse/sen/reader-codex', '@seihouse/sen/cards', '@seihouse/sen/translation',
  '@seihouse/library/generation',
]);

/** Contracts the current Reader still shares from the older Reader's folders. */
export const SHARED_READER_CONTRACTS = new Set([
  'src/components/reader-chamber/shared/readerLanguage.ts',
  'src/components/reader-chamber/shared/manifestationEligibility.ts',
  'src/components/reader-chamber/shared/cinematicScroll/anchors.ts',
  'src/components/reader-chamber/shared/cinematicScroll/useSemanticReadingPosition.ts',
  'src/components/reader-codex/shared/types.ts',
]);

const CODE = /\.[cm]?[jt]sx?$/;
const OLD_READER = /^src\/components\/reader-(?:chamber|codex)\//;
/** The older Reader's own host pieces: its narration, never the new Read Aloud. */
const OLD_READER_HOST = new Set(['src/host/reader/webSpeechNarration.ts']);

/** The module an HTML page loads. */
export function pageModule(html) {
  const match = html.match(/<script[^>]*type="module"[^>]*src="\/([^"]+)"/);
  if (!match) throw new Error(`${APP_PAGE} loads no module script.`);
  return match[1];
}

/** Why a reached file may not be in the app, or undefined when it may. */
function fileProblem(file, classify) {
  const owner = classify(file)?.owner;
  if (!owner) return 'unowned code';
  if (['workshop', 'test', 'deferred'].includes(owner)) return `${owner} code`;
  if (file.startsWith('src/library/generation/')) return 'the HARNESS developer page';
  if ((OLD_READER.test(file) && CODE.test(file) && !SHARED_READER_CONTRACTS.has(file)) || OLD_READER_HOST.has(file)) return 'the older Reader';
  return undefined;
}

/**
 * Every way the app reaches something it must not, each with the chain of
 * files from the app's module to the offender.
 */
export function findAppViolations(graph, entry, classify = ownershipOf) {
  const parents = new Map([[entry, undefined]]);
  const queue = [entry];
  const violations = [];
  const chain = (file, last) => {
    const steps = last ? [last] : [];
    for (let step = file; step; step = parents.get(step)) steps.unshift(step);
    return steps.join(' → ');
  };
  while (queue.length) {
    const file = queue.shift();
    if (!graph.has(file)) { violations.push(`MISSING ${chain(file)}`); continue; }
    const problem = fileProblem(file, classify);
    // An offending file is reported once; what it imports is not walked.
    if (problem) { violations.push(`${problem.toUpperCase().replaceAll(' ', '_')} ${chain(file)}`); continue; }
    for (const { specifier, target } of graph.get(file)) {
      if (RETIRED_ENTRIES.has(specifier)) { violations.push(`RETIRED_ENTRY ${chain(file, specifier)}`); continue; }
      if (file.startsWith(APP_SOURCE) && /^@seihouse\/(?:sen|library)(?:\/|$)/.test(specifier) && !APP_ENTRIES.has(specifier)) {
        violations.push(`ENTRY_NOT_IN_APP ${chain(file, specifier)}`);
        continue;
      }
      if (!target || parents.has(target)) continue;
      parents.set(target, file);
      queue.push(target);
    }
  }
  return { violations, reached: parents.size };
}

export function checkNovelExpandedApp(root = process.cwd()) {
  const entry = pageModule(readFileSync(resolve(root, APP_PAGE), 'utf8'));
  const { graph } = buildGraph(root);
  return { entry, ...findAppViolations(graph, entry) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { entry, violations, reached } = checkNovelExpandedApp();
  if (violations.length) {
    console.error(`[novel-expanded] The app reaches ${violations.length} thing(s) it must not:`);
    for (const violation of violations) console.error(`  ${violation}`);
    console.error('The app holds only what is being built now. See src/novel-expanded/README.md.');
    process.exit(1);
  }
  console.log(`[novel-expanded] ${APP_PAGE} → ${entry}: ${reached} files reached; 0 violations`);
}
