import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { MotionCoverReferencePreview } from './MotionCoverReferencePreview';
import { MotionPicturePreview } from './MotionPicturePreview';

const entry = workshopEntries.find(candidate => candidate.id === 'motion-picture')!;

/** Compare the production cover-bound toggle with the reusable Development ability. */
export function MotionPictureWorkspace() {
  return <FeatureWorkspace
    entry={entry}
    renderReference={() => <MotionCoverReferencePreview />}
    renderDevelopment={() => <MotionPicturePreview />}
  />;
}
