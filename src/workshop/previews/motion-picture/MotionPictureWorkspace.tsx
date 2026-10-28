import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { MotionPicturePreview } from './MotionPicturePreview';

const entry = workshopEntries.find(candidate => candidate.id === 'motion-picture')!;

/** The reusable motion-picture ability. */
export function MotionPictureWorkspace() {
  return <FeatureWorkspace
    entry={entry}
    renderDevelopment={() => <MotionPicturePreview />}
  />;
}
