import type { ComponentProps } from 'react';
import { SkillPackageImport } from '@seihouse/library/stories';
import { inspectHarnessSkillPackage } from '../../../host/generation/capa/sppSkills';

/** The Library's SPP skill importer over this host's package intake. */
export function SppSkillImport(props: Omit<ComponentProps<typeof SkillPackageImport>, 'intake'>) {
  return <SkillPackageImport intake={inspectHarnessSkillPackage} {...props} />;
}
