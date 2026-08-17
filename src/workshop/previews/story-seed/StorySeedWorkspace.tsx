import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import DevelopmentCreationModal from '../../../components/story-seed/development/CreationModal';
import { requestWorldBlueprint } from '../../../components/story-seed/shared/blueprintGenerationClient';
import type { BlueprintGenerationPayload } from '../../../components/story-seed/shared/storySeedSchema';
import {
  resetMockSeeds,
  resetMockState,
  setMockLocalOnlyMode,
  useAppStore,
} from '../../../components/story-seed/shared/stubs';
import {
  resetStorySeedRepository,
  setStorySeedRepository,
} from '../../../components/story-seed/shared/storySeedRepository';
import {
  FeatureWorkspace,
  type WorkshopControlsConfig,
  type WorkspaceView,
} from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import {
  createMockBlueprint,
  createReferenceSavedSeeds,
  createStoryBankRecords,
  MOCK_USER_ID,
} from './previewData';
import {
  PREVIEW_CATEGORIES,
  PreviewCategory,
  PreviewState,
  scenarios,
  scenariosInCategory,
} from './previewStates';
import { createStoryBankPreviewRepository } from './previewStorySeedRepository';
import { DeferredWorkspace } from '../../DeferredWorkspace';

type ReferenceCreationModalModule = typeof import('../../../components/story-seed/reference/CreationModal');

let referenceCreationModalPromise: Promise<ReferenceCreationModalModule> | null = null;

const loadReferenceCreationModal = (): Promise<ReferenceCreationModalModule> => {
  referenceCreationModalPromise ??= import('../../../components/story-seed/reference/CreationModal')
    .catch(error => {
      referenceCreationModalPromise = null;
      throw error;
    });
  return referenceCreationModalPromise;
};

const preloadReferenceCreationModal = () => {
  void loadReferenceCreationModal().catch(() => undefined);
};

const ReferenceCreationModal = lazy(loadReferenceCreationModal);

// ─── DOM-driven scenario scripting ───────────────────────────────────────────
// CreationModal owns `intake`, `stage`, and `showImportPanel` as internal
// component state — it accepts no props for them. To reach a "filled" or
// "blueprint" scenario faithfully (never by reaching into React internals),
// the Workshop drives the *real* rendered controls: typing into the actual
// inputs and clicking the actual buttons, the same way reader-chamber's
// `clickInChamber` drove its preview states.
//
// The two panes are structurally different UIs: the locked
// reference fork is the old numbered accordion, the development fork is the
// two-panel creation workspace. Pane wrappers carry `data-story-seed-pane`
// so each scenario script can drive each fork through its own real controls.

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const SCENARIO_ACTION_TIMEOUT_MS = 10_000;

type PaneKind = 'reference' | 'development';

function getRoots(pane: PaneKind): Element[] {
  return Array.from(
    document.querySelectorAll(`[data-story-seed-pane="${pane}"] [id="creation-portal-root"]`),
  );
}

function setFieldValue(root: Element, id: string, value: string) {
  const el = root.querySelector(`[id="${id}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickByText(root: Element, selector: string, pattern: RegExp) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
  const target = nodes.find(node => pattern.test(node.textContent?.trim() ?? ''));
  target?.click();
  return Boolean(target);
}

async function waitUnlessCancelled(ms: number, isCancelled: () => boolean) {
  await wait(ms);
  return !isCancelled();
}

function mutateRoots(
  pane: PaneKind,
  isCancelled: () => boolean,
  mutate: (root: Element) => void,
) {
  if (isCancelled()) return false;
  getRoots(pane).forEach(mutate);
  return true;
}

async function waitForRoots(
  pane: PaneKind,
  timeoutMs = SCENARIO_ACTION_TIMEOUT_MS,
  isCancelled: () => boolean = () => false,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isCancelled()) return false;
    if (getRoots(pane).length > 0) return true;
    await wait(50);
  }
  return false;
}

async function clickWhenAvailable(
  pane: PaneKind,
  selector: string,
  pattern: RegExp,
  timeoutMs = SCENARIO_ACTION_TIMEOUT_MS,
  isCancelled: () => boolean = () => false,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isCancelled()) return;
    const clicked = getRoots(pane).map(root => clickByText(root, selector, pattern));
    if (clicked.some(Boolean)) return;
    await wait(50);
  }
}

/** Reference pane: fills the locked Phase 1 accordion replica (unchanged steps). */
async function runReferenceFillScenario(isCancelled: () => boolean) {
  if (!await waitForRoots('reference', SCENARIO_ACTION_TIMEOUT_MS, isCancelled)) return;

  if (!mutateRoots('reference', isCancelled, root => {
    setFieldValue(root, 'a11y-control-v2xlbs8', 'Ashes of the Ninth Meridian');
    setFieldValue(root, 'a11y-control-7b2mqtu', 'Ye Chen');
    setFieldValue(
      root,
      'core-premise-input',
      'In seven chapters, the prince will be assassinated. Every timeline says he dies. Can you change fate before it happens?',
    );
  })) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => {
    clickByText(root, 'button', /^\+ death flags$/);
    clickByText(root, 'button', /^\+ sect politics$/);
  })) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /2\. World Setting/))) return;
  if (!await waitUnlessCancelled(120, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => {
    setFieldValue(root, 'world-type-input', 'Ancient sect world with a collapsing celestial court');
    setFieldValue(root, 'society-structure-input', 'Sect-led feudal hierarchy');
    setFieldValue(root, 'danger-level-input', 'Cutthroat, grimdark, mystical');
    setFieldValue(root, 'starting-location-input', 'Outer sect labor quarry inside a volcanic rift.');
  })) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /3\. Main Character Setup/))) return;
  if (!await waitUnlessCancelled(120, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => {
    setFieldValue(root, 'mc-starting-identity-input', 'Crippled young master');
    setFieldValue(root, 'mc-personality-input', 'Ruthless but protective, chaotic neutral');
    setFieldValue(root, 'mc-secret-advantage-input', 'Foreknowledge of seven doomed timelines');
    setFieldValue(root, 'mc-starting-weakness-input', 'Destroyed meridians');
    setFieldValue(
      root,
      'mc-bio-input',
      'Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective.',
    );
  })) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /3\.5\. Character Intake/))) return;
  if (!await waitUnlessCancelled(120, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /\+ Add Character/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => setFieldValue(root, 'a11y-control-boqy7nd', 'Elder Qin'))) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /3\.8\. Faction\/Sect Intake/))) return;
  if (!await waitUnlessCancelled(120, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /\+ Add Faction/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => setFieldValue(root, 'a11y-control-xhc59yh', 'Heavenly Sword Sect'))) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /4\. Power System Seed/))) return;
  if (!await waitUnlessCancelled(120, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => {
    setFieldValue(root, 'a11y-control-itgsjgw', 'Qi Condensation Tier 1');
    setFieldValue(root, 'a11y-control-kytc0oh', 'Martial arts, Daoist');
  })) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /5\. Plot & Trope Control/))) return;
  if (!await waitUnlessCancelled(120, isCancelled)) return;
  if (!mutateRoots('reference', isCancelled, root => {
    setFieldValue(root, 'a11y-control-jolpc3b', 'Shatter the fated assassination timeline');
    setFieldValue(root, 'a11y-control-6a6tmbf', 'Sect tournament that reveals the first assassination attempt');
  })) return;

  if (!await waitUnlessCancelled(80, isCancelled)) return;
  mutateRoots('reference', isCancelled, root => clickByText(root, 'button', /1\. Core Seed/));
}

/** Development pane: fills the compact Origin flow through its real controls
 *  before continuing through the remaining Story and World workspaces. */
async function runDevelopmentFillScenario(isCancelled: () => boolean) {
  const selectSection = async (pattern: RegExp) => {
    if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', pattern))) return false;
    return waitUnlessCancelled(150, isCancelled);
  };

  // Origin is the single home for the four core story ingredients.
  if (!await selectSection(/^Origin/)) return;
  if (!mutateRoots('development', isCancelled, root =>
    (root.querySelector('[id="story-style-chinese"]') as HTMLElement | null)?.click())) return;

  // Genre presets remain available through the compact path picker.
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^Pick a path/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /Xianxia/))) return;

  // Premise remains the dominant Origin field.
  if (!mutateRoots('development', isCancelled, root => setFieldValue(
    root,
    'core-premise-input',
    'In seven chapters, the prince will be assassinated. Every timeline says he dies. Can you change fate before it happens?',
  ))) return;
  if (!mutateRoots('development', isCancelled, root => setFieldValue(root, 'origin-story-title-input', 'Ashes of the Ninth Meridian'))) return;

  // Catalog children remain invisible until their parent family is opened.
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^Fate & Destiny/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^\+ death flags$/))) return;
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^Politics & War/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^\+ sect politics$/))) return;

  // World Identity
  if (!await selectSection(/^World Identity$/)) return;
  if (!mutateRoots('development', isCancelled, root => {
    setFieldValue(root, 'world-type-input', 'Ancient sect world with a collapsing celestial court');
    setFieldValue(root, 'society-structure-input', 'Sect-led feudal hierarchy');
    setFieldValue(root, 'starting-location-input', 'Outer sect labor quarry inside a volcanic rift.');
  })) return;

  // Characters (main character + one additional character)
  if (!await selectSection(/^Characters$/)) return;
  if (!mutateRoots('development', isCancelled, root => {
    setFieldValue(root, 'a11y-control-7b2mqtu', 'Ye Chen');
    setFieldValue(root, 'mc-starting-identity-input', 'Crippled young master');
    setFieldValue(root, 'mc-personality-input', 'Ruthless but protective, chaotic neutral');
    setFieldValue(root, 'mc-secret-advantage-input', 'Foreknowledge of seven doomed timelines');
    setFieldValue(root, 'mc-starting-weakness-input', 'Destroyed meridians');
    setFieldValue(
      root,
      'mc-bio-input',
      'Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective.',
    );
  })) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /\+ Add Character/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('development', isCancelled, root => setFieldValue(root, 'a11y-control-boqy7nd', 'Elder Qin'))) return;

  // Factions
  if (!await selectSection(/^Factions$/)) return;
  if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /\+ Add Faction/))) return;
  if (!await waitUnlessCancelled(80, isCancelled)) return;
  if (!mutateRoots('development', isCancelled, root => setFieldValue(root, 'a11y-control-xhc59yh', 'Heavenly Sword Sect'))) return;

  // Abilities
  if (!await selectSection(/^Abilities$/)) return;
  if (!mutateRoots('development', isCancelled, root => setFieldValue(root, 'a11y-control-itgsjgw', 'Qi Condensation Tier 1'))) return;

  // Power System
  if (!await selectSection(/^Power System$/)) return;
  if (!mutateRoots('development', isCancelled, root => setFieldValue(root, 'a11y-control-kytc0oh', 'Martial arts, Daoist'))) return;

  // ARC combines plot direction with the story's intended destination.
  if (!await selectSection(/^ARC$/)) return;
  if (!mutateRoots('development', isCancelled, root => {
    (root.querySelector('[id="arc-face-slap-high"]') as HTMLElement | null)?.click();
    (root.querySelector('[id="arc-plot-armor-low"]') as HTMLElement | null)?.click();
    (root.querySelector('[id="arc-recognition-high"]') as HTMLElement | null)?.click();
    setFieldValue(root, 'a11y-control-jolpc3b', 'Shatter the fated assassination timeline');
    setFieldValue(root, 'a11y-control-6a6tmbf', 'Sect tournament that reveals the first assassination attempt');
    setFieldValue(root, 'destined-ending-input', 'The prince survives and severs the celestial court from fate.');
    setFieldValue(root, 'make-it-work-instruction-input', 'The weakest bloodline is secretly the only one heaven fears.');
  })) return;

  // Land back on Origin.
  await selectSection(/^Origin/);
}

export function StorySeedWorkspace() {
  const entry = workshopEntries.find(e => e.id === 'story-seed')!;
  const [activeState, setActiveState] = useState<PreviewState>('empty-intake');
  const [activeCategory, setActiveCategory] = useState<PreviewCategory>('intake');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('development');
  const [blueprintAccessToken, setBlueprintAccessToken] = useState('');
  const [blueprintGenerating, setBlueprintGenerating] = useState(false);
  const activeBlueprintRequestRef = useRef<AbortController | null>(null);
  const currentUser = useAppStore(state => state.currentUser);

  const applyScenario = useCallback((
    stateId: PreviewState,
    options: { preserveLocalSeeds?: boolean } = {},
  ) => {
    const scenario = scenarios.find(s => s.id === stateId)!;
    activeBlueprintRequestRef.current?.abort();
    activeBlueprintRequestRef.current = null;
    setBlueprintGenerating(false);
    setActiveState(stateId);
    setActiveCategory(scenario.category);
    setMockLocalOnlyMode(scenario.localOnlyMode ?? true);
    resetMockState({
      currentUser: scenario.signedIn
        ? { uid: MOCK_USER_ID, displayName: 'Workshop Creator' }
        : null,
      activeAgentId: scenario.activeAgentId ?? null,
      stories: scenario.stories ?? [],
    });
    const storyBankRecords = scenario.storyBank === 'populated' ? createStoryBankRecords() : [];
    resetMockSeeds(scenario.storyBank === 'populated' ? createReferenceSavedSeeds() : []);
    if (!options.preserveLocalSeeds) {
      if (scenario.storyBank === 'loading' || scenario.storyBank === 'error') {
        setStorySeedRepository(createStoryBankPreviewRepository(scenario.storyBank));
      } else {
        resetStorySeedRepository(storyBankRecords);
      }
    }
  }, []);

  useEffect(() => () => activeBlueprintRequestRef.current?.abort(), []);

  useEffect(() => {
    // Deep-link support: `?preview=story-seed&state=<scenario-id>` opens the
    // workspace directly in a given preview state (used for inspection and
    // screenshot verification).
    const requested = new URLSearchParams(window.location.search).get('state') as PreviewState | null;
    const initial = requested && scenarios.some(s => s.id === requested) ? requested : 'empty-intake';
    // The default local Workshop behaves like the actual local adapter: a
    // refresh must not erase drafts or reviewed Blueprints. Explicit preview
    // state changes still reset fixtures so visual scenarios stay deterministic.
    applyScenario(initial, { preserveLocalSeeds: initial === 'empty-intake' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the panes remount for a scenario, drive its real UI action.
  useEffect(() => {
    const scenario = scenarios.find(s => s.id === activeState);
    if (!scenario?.uiAction) return;
    let cancelled = false;
    const isCancelled = () => cancelled;
    (async () => {
      if (!await waitUnlessCancelled(220, isCancelled)) return;
      if (scenario.uiAction === 'open-import-panel') {
        const referenceAction = clickWhenAvailable(
          'reference',
          'button',
          /Import (?:World Seed \/ Blueprint|Story Seed)/,
          SCENARIO_ACTION_TIMEOUT_MS,
          isCancelled,
        );
        // Development keeps import inside the Story Bank: open the bank
        // through its real navigation control, then its Import button.
        if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^Story Bank$/))) return;
        await Promise.all([
          referenceAction,
          clickWhenAvailable('development', 'button', /^Import$/, SCENARIO_ACTION_TIMEOUT_MS, isCancelled),
        ]);
      } else if (scenario.uiAction === 'open-story-bank') {
        mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^Story Bank$/));
      } else if (scenario.uiAction === 'use-first-seed') {
        // Development reaches a banked seed through the Story Bank; the
        // locked reference fork still renders its own always-visible panel.
        const referenceAction = clickWhenAvailable(
          'reference',
          'button',
          /^Use Seed$/,
          SCENARIO_ACTION_TIMEOUT_MS,
          isCancelled,
        );
        if (!mutateRoots('development', isCancelled, root => clickByText(root, 'button', /^Story Bank$/))) return;
        await Promise.all([
          referenceAction,
          clickWhenAvailable('development', 'button', /^Use Seed$/, SCENARIO_ACTION_TIMEOUT_MS, isCancelled),
        ]);
      } else if (scenario.uiAction === 'fill-intake') {
        await Promise.all([
          runReferenceFillScenario(isCancelled),
          runDevelopmentFillScenario(isCancelled),
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeState, workspaceView]);

  const activeScenario = scenarios.find(s => s.id === activeState);

  const referenceChamberProps = {
    isGenerating: Boolean(activeScenario?.isGenerating),
    error: activeScenario?.error ?? null,
    onGenerateBlueprint: async (payload: unknown) => {
      await wait(300);
      return createMockBlueprint();
    },
    onStartStory: async () => undefined,
  };

  const developmentChamberProps = {
    isGenerating: Boolean(activeScenario?.isGenerating) || blueprintGenerating,
    error: activeScenario?.error ?? null,
    onGenerateBlueprint: async (payload: BlueprintGenerationPayload) => {
      activeBlueprintRequestRef.current?.abort();
      const controller = new AbortController();
      activeBlueprintRequestRef.current = controller;
      setBlueprintGenerating(true);
      try {
        return await requestWorldBlueprint(payload, blueprintAccessToken, controller.signal);
      } finally {
        if (activeBlueprintRequestRef.current === controller) {
          activeBlueprintRequestRef.current = null;
          setBlueprintGenerating(false);
        }
      }
    },
    onStartStory: async () => undefined,
  };

  const buttonBase =
    'min-h-[2.75rem] rounded-lg border text-xs leading-snug transition-all duration-200';
  const buttonTone = (active: boolean) =>
    active
      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100 font-medium'
      : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10';
  const stateButton = (active: boolean) =>
    `${buttonBase} ${buttonTone(active)} w-full px-3 py-2 text-left break-words hyphens-auto`;

  const stateList = (category: PreviewCategory) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {scenariosInCategory(category).map(scenario => (
        <button
          key={scenario.id}
          type="button"
          onClick={() => applyScenario(scenario.id)}
          className={stateButton(activeState === scenario.id)}
        >
          {scenario.label}
        </button>
      ))}
    </div>
  );

  const selectPreviewPage = (category: PreviewCategory) => {
    const firstScenario = scenariosInCategory(category)[0];
    if (firstScenario) applyScenario(firstScenario.id);
  };
  const previewStatus = (
    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">
      {currentUser ? `Mock account: ${currentUser.uid}` : 'Mock account: signed out'}
      {activeScenario && <> · Active state · {activeScenario.label}</>}
    </p>
  );
  const workshopControls: WorkshopControlsConfig = {
    defaultSection: 'states',
    description: 'Deterministic local scenarios only. The real Story Seed navigation remains inside the component below.',
    sections: [
      {
        id: 'pages',
        description: 'Jump to a representative state for each major Story Seed surface.',
        content: (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {PREVIEW_CATEGORIES.map(category => (
              <button
                key={category.id}
                type="button"
                aria-pressed={activeCategory === category.id}
                onClick={() => selectPreviewPage(category.id)}
                className={`workshop-touch-target rounded-lg border px-3 py-2 text-left text-xs leading-snug transition-colors ${
                  activeCategory === category.id
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/10 hover:text-white/85'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        ),
      },
      {
        id: 'states',
        description: `Preview states for ${PREVIEW_CATEGORIES.find(category => category.id === activeCategory)?.label ?? 'Story Seed'}.`,
        content: (
          <div className="space-y-4">
            {stateList(activeCategory)}
            {previewStatus}
          </div>
        ),
      },
      {
        id: 'advanced',
        description: 'Optional Development-only credentials for the protected World Blueprint endpoint.',
        content: (
          <form onSubmit={event => event.preventDefault()} className="sm:max-w-xl">
            <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/55">
              Development access token
              <input
                type="password"
                value={blueprintAccessToken}
                onChange={event => setBlueprintAccessToken(event.target.value)}
                autoComplete="off"
                disabled={blueprintGenerating}
                placeholder="Enter the server-configured testing token"
                className="min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-normal normal-case tracking-normal text-white/85 outline-none placeholder:text-white/25 focus:border-cyan-500/60 disabled:opacity-50"
              />
              <span className="text-[9px] font-normal normal-case tracking-normal text-white/30">
                Held in memory for this page only. The Gemini key remains server-side.
              </span>
            </label>
          </form>
        ),
      },
    ],
  };

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={workshopControls}
      allowCompare
      onReferenceIntent={preloadReferenceCreationModal}
      onViewChange={setWorkspaceView}
      renderReference={() => (
        <DeferredWorkspace
          loadingLabel="Loading Original Reference"
          className="min-h-screen bg-void"
        >
          <div key={`reference-${activeState}`} data-story-seed-pane="reference" className="min-h-screen bg-void py-10 px-4">
            <ReferenceCreationModal {...referenceChamberProps} />
          </div>
        </DeferredWorkspace>
      )}
      renderDevelopment={() => (
        <div key={`development-${activeState}`} data-story-seed-pane="development" className="min-h-screen bg-void py-10 px-4">
          <DevelopmentCreationModal {...developmentChamberProps} />
        </div>
      )}
    />
  );
}

export default StorySeedWorkspace;
