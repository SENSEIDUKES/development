import { SEITabs, SEITabsList, SEITabsTrigger, SEIStatusDot } from '@seihouse/ui';
export function LibraryCollectionStrip({activeTab, chooseTab, syncStatus, libraryStories}: {
 activeTab: string; chooseTab: (tab: string) => void; syncStatus: string; libraryStories: readonly unknown[];
}) { return (
      <SEITabs
        value={activeTab}
        onValueChange={(value) => chooseTab(value as typeof activeTab)}
        variant="underline"
      >
        <SEITabsList aria-label="Library collections" className="mb-6">
          <SEITabsTrigger
            value="featured"
            onClick={() => chooseTab("featured")}
          >
            Immortal Hub
          </SEITabsTrigger>
          <SEITabsTrigger
            value="my-library"
            onClick={() => chooseTab("my-library")}
          >
            My Library{" "}
            {libraryStories.length > 0 && `(${libraryStories.length})`}
            {syncStatus === "syncing" && (
              <SEIStatusDot
                tone="sea"
                pulse
                label="Syncing..."
                title="Syncing..."
              />
            )}
            {syncStatus === "error" && (
              <SEIStatusDot
                tone="danger"
                label="Sync Pending (Offline or Quota)"
                title="Sync Pending (Offline or Quota)"
              />
            )}
          </SEITabsTrigger>
          <SEITabsTrigger
            value="challenges"
            onClick={() => chooseTab("challenges")}
          >
            ☠️ Fate Survival
          </SEITabsTrigger>
        </SEITabsList>
      </SEITabs>
); }
