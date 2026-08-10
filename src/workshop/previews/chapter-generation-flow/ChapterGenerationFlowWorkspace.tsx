import { useMemo } from "react";
import ChapterGenerationTestFlow from "../../../components/chapter-generation/development/ChapterGenerationTestFlow";
import ReferenceChapterGenerationInspector from "../../../components/chapter-generation/reference/ChapterGenerationInspector";
import { assembleChapterGeneration } from "../../../components/chapter-generation/shared/assembleGeneration";
import { FeatureWorkspace } from "../../FeatureWorkspace";
import { workshopEntries } from "../../manifest";

export function ChapterGenerationFlowWorkspace() {
  const entry = workshopEntries.find(item => item.id === "chapter-generation-flow")!;
  // Reference remains the locked deterministic inspector. Development never
  // consumes this fixture run and has no fallback path to it.
  const reference = useMemo(() => assembleChapterGeneration("established"), []);

  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare
      renderReference={() => (
        <ReferenceChapterGenerationInspector
          stages={reference.stages}
          finalOutput={reference.finalOutput}
        />
      )}
      renderDevelopment={() => <ChapterGenerationTestFlow />}
    />
  );
}

export default ChapterGenerationFlowWorkspace;
