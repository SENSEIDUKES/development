import { describe, expect, it } from 'vitest';
// @ts-expect-error Shared executable tooling is plain ESM.
import { importSpecifiers, stronglyConnected, validateOwnership, validateSourcePolicy } from './ownershipGraph.mjs';
// @ts-expect-error Shared executable tooling is plain ESM.
import { ownershipOf } from './ownershipInventory.mjs';

describe('ownership guardrails', () => {
  it('rejects manifest cycles and wrong direction even without a source import', () => {
    const packages = {
      sen: { manifest: { name: '@seihouse/sen', peerDependencies: { '@seihouse/library': '*' } }, entries: {} },
      library: { manifest: { name: '@seihouse/library', peerDependencies: { '@seihouse/sen': '*' } }, entries: {} },
    };
    expect(validateOwnership(new Map(), packages, ownershipOf, {}).failures).toEqual(expect.arrayContaining([
      'PACKAGE_CYCLE @seihouse/library -> @seihouse/sen', 'PACKAGE_DIRECTION @seihouse/sen -> @seihouse/library',
    ]));
  });
  it('rejects unexported files even within an already classified capability', () => {
    expect(validateOwnership(new Map([['src/narrative/forgotten.ts', []]]), {sen:{entries:{}}}, ownershipOf, {}).failures).toContain('UNREACHABLE sen: src/narrative/forgotten.ts');
  });
  it('rejects embedded storage defaults, mock state and computed imports', () => {
    expect(validateSourcePolicy('const storage = window.localStorage; const state = mockStore; const endpoint = "/api/secret"; import(endpoint);', 'src/narrative/file.ts', 'sen')).toEqual(expect.arrayContaining(['HOST_DEFAULT src/narrative/file.ts', 'HOST_LITERAL src/narrative/file.ts', 'DYNAMIC_IMPORT src/narrative/file.ts']));
    expect(validateSourcePolicy('// localStorage mockStore /api/secret', 'src/narrative/file.ts', 'sen')).toEqual([]);
  });
  it('rejects undeclared external packages and missing relative sources', () => {
    const result = validateOwnership(new Map([['src/narrative/file.ts', [{specifier:'vendor-secret'}, {specifier:'./missing'}]]]), {sen:{manifest:{name:'@seihouse/sen'},entries:{}}}, ownershipOf, {});
    expect(result.failures.join('\n')).toContain('UNDECLARED_DEPENDENCY');
    expect(result.failures.join('\n')).toContain('MISSING_SOURCE');
  });
  it('does not mistake comments for imports and includes type and lazy imports', () => {
    expect(importSpecifiers('// import x from "fake";\nimport type { A } from "a"; export * from "b"; const load = () => import("c");')).toEqual(['a', 'b', 'c']);
  });
  it('fails closed for new production source even if no package exports it', () => {
    expect(validateOwnership(new Map([['src/components/new-business/core.ts', []]]), {}, ownershipOf, {}).failures).toEqual(['UNOWNED src/components/new-business/core.ts']);
  });
  it('detects an entire omitted capability', () => {
    expect(validateOwnership(new Map(), { library: { entries: {} } }, ownershipOf, { library: ['energy'] }).failures).toContain('UNEXPORTED library: energy');
  });
  it('rejects cross-owner source bypass, mocks, and Library direction even when unpublished', () => {
    const graph = new Map([
      ['src/components/reader-chamber/development/Reader.tsx', [
        { specifier: '../../energy/shared/energyContracts', target: 'src/components/energy/shared/energyContracts.ts' },
        { specifier: '../shared/stubs', target: 'src/components/reader-chamber/shared/stubs.ts' },
        { specifier: '@seihouse/library-ui' },
      ]],
    ]);
    const failures = validateOwnership(graph, {}, ownershipOf, {}).failures.join('\n');
    expect(failures).toContain('SOURCE_BYPASS');
    expect(failures).toContain('SEN_BOUNDARY');
    expect(failures).toContain('stubs');
    expect(failures).toContain('@seihouse/library-ui');
  });
  it('keeps Front Desk apart: it uses no other SEIHouse package and no host file, by name or by path', () => {
    const graph = new Map([
      ['src/front-desk/core/controller.ts', [
        { specifier: '@seihouse/sen/presentation', target: 'src/package/sen/presentation.ts' },
        { specifier: '@seihouse/library/familiar' },
        { specifier: '../../library/familiars/actionList', target: 'src/library/familiars/actionList.ts' },
        { specifier: '../../host/generation/accessToken', target: 'src/host/generation/accessToken.ts' },
        { specifier: './docsKnowledge', target: 'src/front-desk/core/docsKnowledge.ts' },
      ]],
    ]);
    const failures = validateOwnership(graph, {}, ownershipOf, {}).failures;
    expect(failures).toEqual(expect.arrayContaining([
      'FRONT_DESK_BOUNDARY src/front-desk/core/controller.ts -> @seihouse/sen/presentation',
      'FRONT_DESK_BOUNDARY src/front-desk/core/controller.ts -> @seihouse/library/familiar',
      'FRONT_DESK_BOUNDARY src/front-desk/core/controller.ts -> ../../library/familiars/actionList',
      'FRONT_DESK_BOUNDARY src/front-desk/core/controller.ts -> ../../host/generation/accessToken',
    ]));
    expect(failures.join('\n')).not.toContain('./docsKnowledge');
  });
  it('lets SEN and the Library use Front Desk only by its package name, and never the other way in its manifest', () => {
    const graph = new Map([
      ['src/components/harness-generation/shared/storyKnowledge.ts', [{ specifier: '@seihouse/front-desk/docs-knowledge', target: 'src/package/front-desk/docs-knowledge.ts' }]],
      ['src/library/familiars/FamiliarPlace.tsx', [
        { specifier: '@seihouse/front-desk', target: 'src/package/front-desk/index.ts' },
        { specifier: '../../front-desk/card/FrontDesk', target: 'src/front-desk/card/FrontDesk.tsx' },
      ]],
    ]);
    const failures = validateOwnership(graph, {}, ownershipOf, {}).failures.join('\n');
    expect(failures).not.toContain('SEN_BOUNDARY');
    expect(failures).not.toContain('LIBRARY_BOUNDARY');
    expect(failures).toContain('SOURCE_BYPASS src/library/familiars/FamiliarPlace.tsx -> src/front-desk/card/FrontDesk.tsx');
    const packages = { 'front-desk': { manifest: { name: '@seihouse/front-desk', peerDependencies: { '@seihouse/sen': '*' } }, entries: {} } };
    expect(validateOwnership(new Map(), packages, ownershipOf, {}).failures).toContain('PACKAGE_DIRECTION @seihouse/front-desk -> @seihouse/sen');
  });
  it('detects cycles across type and runtime graphs', () => {
    expect(stronglyConnected(new Map([['a', [{ target: 'b' }]], ['b', [{ target: 'a' }]]]))).toEqual([['a', 'b']]);
  });
});
