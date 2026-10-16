import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer keeps everyone's status, in the tiny SEN language: it reads
 * who and what is not as they were in Story Information's Status section
 * (dead, wounded, sealed away, destroyed), keeps every one of them so, and
 * tags each change of state where the prose shows it. The HARNESS removes the
 * tags, saves each on its sentence, and checks it against what came before,
 * so a dead character stays dead because the record says so. The tag forms use
 * placeholders (Name, Thing), so no example can slip into a story; the main
 * character's name is the speakers' own, `MC`. Where tags may go is said once
 * for every tag kind by the HARNESS tag rules.
 */
export const SEN_STATUS_INSTRUCTIONS = `JOB: Story Information's Status section is every character and thing not as they were: dead, wounded, sealed away, captured, transformed, damaged or destroyed. Keep each so until the story changes it, and tag every change of state where it happens.
FORMAT (how is optional: a few words):
[[status: Name | wounded | how]] / [[status: Name | recovered]]
[[status: Name | dead | how]] / [[status: Name | revived | how]]
[[status: Name | sealed | how]] sealed away themselves / [[status: Name | captured | how]] / [[status: Name | freed]] out of a seal or captivity
[[status: Name | transformed | into what]]
[[status: Thing | damaged | how]] / [[status: Thing | repaired]] / [[status: Thing | destroyed | how]]
REQUIRED:
- Each tag at the start of the sentence that shows the change.
- Name: ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else exactly as Story Information writes them. Thing: the same short name its Holdings or Appeared entry uses.
- The dead stay dead and the destroyed stay gone: they never speak, act or are used again unless the story revives them with a revived tag.
- Everyone in Status keeps that state until a tag changes it.
FORBIDDEN: Tags for threats, fears, rumors, plans or lies; only what truly happens on the page or is truly learned. A tag for a passing scratch, tiredness or a mood. Places, factions and sects. An ability sealed: that is a Holdings tag.
CHECK BEFORE YOU RETURN: Every death, wound, recovery, sealing, capture, release, transformation, and thing damaged, repaired or destroyed has its status tag, and no one in Status acts against their state.`;

/** SEN's bundled Status skill. It occupies the Status slot, which the HARNESS fills on every chapter. */
export const SEN_STATUS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-status',
  version: '1.0.0',
  name: 'SEN Status',
  description: 'Keeps how everyone and everything now is: tags each death, wound, recovery, sealing, capture, release, transformation, and thing damaged, repaired or destroyed.',
  slot: 'status',
  applications: ['generation'],
  instructions: SEN_STATUS_INSTRUCTIONS,
  author: 'SEIHouse',
};
