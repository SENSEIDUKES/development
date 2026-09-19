import { describe, expect, it } from 'vitest';
// @ts-expect-error Shared executable tooling is plain ESM.
import { importSpecifiers, stronglyConnected, validateOwnership } from './ownershipGraph.mjs';
// @ts-expect-error Shared executable tooling is plain ESM.
import { ownershipOf } from './ownershipInventory.mjs';

describe('ownership guardrails', () => {
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
  it('detects cycles across type and runtime graphs', () => {
    expect(stronglyConnected(new Map([['a', [{ target: 'b' }]], ['b', [{ target: 'a' }]]]))).toEqual([['a', 'b']]);
  });
});
