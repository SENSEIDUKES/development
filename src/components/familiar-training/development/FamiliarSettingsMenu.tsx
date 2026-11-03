import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayScrollbar } from '@seihouse/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  FAMILIAR_DEFAULT_SIZE,
  FAMILIAR_MOBILE_DEFAULT_SIZE,
  FAMILIAR_NAME_MAX_LENGTH,
  familiarDisplaySize,
} from '../../familiar/shared/familiar';
import { useFamiliarMobile } from '../../familiar/development/useFamiliarMobile';

/** The companion's behaviour, kept on the host profile. A row shows only where its handler is supplied. */
export interface FamiliarCompanionSettings {
  size?: number;
  onSizeChange?: (size: number) => void;
  /** The Familiar waits in the header until called, instead of floating over the page. */
  inHeader?: boolean;
  onInHeaderChange?: (inHeader: boolean) => void;
  /** Live talk (beta): the Familiar converses in its own voice. */
  liveTalk?: boolean;
  onLiveTalkChange?: (liveTalk: boolean) => void;
  /** Saying "Familiar" calls it, as tapping its microphone does. */
  wakeWord?: boolean;
  onWakeWordChange?: (wakeWord: boolean) => void;
  /** No companion is equipped or the profile is not ready: settings cannot change. */
  disabled?: boolean;
}

export interface FamiliarSettingsMenuProps {
  settings: FamiliarCompanionSettings;
  /** The Familiar being personalized: the one on the stage. */
  familiar: { id: string; catalogueName: string; name?: string; owned: boolean };
  onNameChange?: (name: string | null) => void;
  /** Opens the Lore tab's story editor for this Familiar. */
  onRewriteStory?: () => void;
  onClose: () => void;
}

const SIZE_STEP = 10;

/**
 * Familiar settings, laid out like a console options list: one row per
 * setting with its name on the left and its control on the right, a help
 * line for the row in focus, and Restore defaults · Back at the foot.
 * Companion rows change the Active Familiar's behaviour; Personalise rows
 * change the Familiar on the stage. Voice and Instructions are placeholders
 * until the Live talk service can carry them.
 */
export function FamiliarSettingsMenu({ settings, familiar, onNameChange, onRewriteStory, onClose }: FamiliarSettingsMenuProps) {
  const titleId = useId();
  const mobile = useFamiliarMobile();
  const panel = useRef<HTMLDivElement>(null);
  // The Library's own gold overlay scrollbar, used only if the list cannot fit.
  const scroller = useOverlayScrollbar<HTMLDivElement>({ fades: true }, panel);
  const [focused, setFocused] = useState<string>('size');
  const [nameDraft, setNameDraft] = useState(familiar.name ?? '');
  useEffect(() => { setNameDraft(familiar.name ?? ''); }, [familiar.id, familiar.name]);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[data-familiar-setting] button:not(:disabled), [data-familiar-setting] input:not(:disabled)')?.focus();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { disabled = false } = settings;
  const currentSize = familiarDisplaySize(settings.size, mobile);
  const offset = mobile ? 0.5 : 0;
  const percent = Math.round((currentSize - offset) * 100);
  const [minPercent, maxPercent] = mobile ? [10, 100] : [60, 200];
  const defaultSize = mobile ? FAMILIAR_MOBILE_DEFAULT_SIZE : FAMILIAR_DEFAULT_SIZE;
  const stepSize = (direction: 1 | -1) => {
    const next = Math.min(maxPercent, Math.max(minPercent, percent + direction * SIZE_STEP));
    settings.onSizeChange?.(next / 100 + offset);
  };
  const commitName = () => {
    const next = nameDraft.trim();
    if (next === (familiar.name ?? '')) return;
    onNameChange?.(next && next !== familiar.catalogueName ? next : null);
  };
  const restoreDefaults = () => {
    settings.onSizeChange?.(defaultSize);
    settings.onInHeaderChange?.(false);
    settings.onLiveTalkChange?.(false);
    settings.onWakeWordChange?.(false);
  };
  const displayName = familiar.name ?? familiar.catalogueName;

  const help: Record<string, string> = {
    size: 'Adjust the size of your Familiar as it follows you.',
    header: 'Your Familiar waits in the header until you call it, instead of floating over the page.',
    live: 'Talk with your Familiar like a person, in its own voice. Still being tested; off, it listens the usual way.',
    wake: 'Say “Familiar” to call it, like tapping its microphone. While the app is open, your device’s speech recognition listens for the word.',
    name: `Give ${familiar.catalogueName} a name of your own. Leave it empty to keep “${familiar.catalogueName}”.`,
    story: `Rewrite ${displayName}’s story in your own words. You can always return to SEIHouse’s original.`,
    voice: `Choose the voice ${displayName} speaks with. Coming soon.`,
    instructions: `Tell ${displayName} how you want it to talk with you. Coming soon.`,
  };

  // Above the whole app, header and bottom navigation included, like a console's options screen.
  return createPortal(
    <div className="familiar-settings library-scrollbars" role="dialog" aria-modal="true" aria-labelledby={titleId} data-familiar-settings>
      <div className="familiar-settings-panel" ref={scroller}>
        <h2 id={titleId} className="familiar-settings-title">Familiar settings</h2>

        <h3 className="familiar-settings-section">Companion</h3>
        <div className="familiar-settings-list">
          {settings.onSizeChange ? (
            <Row id="size" label="Familiar size" focused={focused} onFocusRow={setFocused}>
              <div className="familiar-settings-stepper" role="group" aria-label="Familiar size">
                <button type="button" aria-label="Smaller" disabled={disabled || percent <= minPercent} onClick={() => stepSize(-1)}><ChevronLeft size={16} aria-hidden /></button>
                <output aria-live="polite" data-familiar-size-value>{percent}%</output>
                <button type="button" aria-label="Larger" disabled={disabled || percent >= maxPercent} onClick={() => stepSize(1)}><ChevronRight size={16} aria-hidden /></button>
              </div>
            </Row>
          ) : null}
          {settings.onInHeaderChange ? (
            <Row id="header" label="Keep in the header" focused={focused} onFocusRow={setFocused}>
              <OnOff label="Keep in the header" checked={settings.inHeader ?? false} disabled={disabled} onChange={settings.onInHeaderChange} />
            </Row>
          ) : null}
          {settings.onLiveTalkChange ? (
            <Row id="live" label="Live talk" badge="Beta" focused={focused} onFocusRow={setFocused}>
              <OnOff label="Live talk" checked={settings.liveTalk ?? false} disabled={disabled} onChange={settings.onLiveTalkChange} />
            </Row>
          ) : null}
          {settings.onWakeWordChange ? (
            <Row id="wake" label="Say “Familiar”" badge="Beta" focused={focused} onFocusRow={setFocused}>
              <OnOff label="Say “Familiar”" checked={settings.wakeWord ?? false} disabled={disabled} onChange={settings.onWakeWordChange} />
            </Row>
          ) : null}
        </div>

        <h3 className="familiar-settings-section">Personalise {displayName}</h3>
        <div className="familiar-settings-list">
          <Row id="name" label="Name" focused={focused} onFocusRow={setFocused}>
            <input type="text" className="familiar-settings-input" aria-label={`${familiar.catalogueName}’s name`}
              placeholder={familiar.catalogueName} maxLength={FAMILIAR_NAME_MAX_LENGTH} value={nameDraft}
              disabled={!onNameChange || !familiar.owned} data-familiar-name-field
              onChange={event => setNameDraft(event.target.value)} onBlur={commitName}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commitName(); } }} />
          </Row>
          <Row id="story" label="Story" focused={focused} onFocusRow={setFocused}>
            <button type="button" className="familiar-settings-value" disabled={!onRewriteStory || !familiar.owned} onClick={onRewriteStory}>
              Rewrite <ChevronRight size={14} aria-hidden />
            </button>
          </Row>
          <Row id="voice" label="Voice" focused={focused} onFocusRow={setFocused}>
            <ComingSoon />
          </Row>
          <Row id="instructions" label="Instructions" focused={focused} onFocusRow={setFocused}>
            <ComingSoon />
          </Row>
        </div>
        {!familiar.owned ? <p className="familiar-settings-note">Bring {familiar.catalogueName} home to personalise it.</p> : null}

        <p className="familiar-settings-help" aria-live="polite" data-familiar-settings-help>{help[focused]}</p>
        <div className="familiar-settings-footer">
          <button type="button" onClick={restoreDefaults} disabled={disabled}>Restore defaults</button>
          <button type="button" onClick={onClose} data-familiar-settings-back>Back</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ id, label, badge, focused, onFocusRow, children }: { id: string; label: string; badge?: string; focused: string; onFocusRow: (id: string) => void; children: ReactNode }) {
  return (
    <div className="familiar-settings-row" data-familiar-setting={id} data-focused={focused === id || undefined}
      onFocusCapture={() => onFocusRow(id)} onPointerEnter={event => { if (event.pointerType === 'mouse') onFocusRow(id); }}
      onPointerDown={() => onFocusRow(id)}>
      <span className="familiar-settings-label">{label}{badge ? <span className="familiar-settings-badge">{badge}</span> : null}</span>
      <span className="familiar-settings-control">{children}</span>
    </div>
  );
}

function OnOff({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className="familiar-settings-onoff" onClick={() => onChange(!checked)}>
      <span data-on={checked || undefined}>On</span>
      <span data-on={!checked || undefined}>Off</span>
    </button>
  );
}

function ComingSoon() {
  return <span className="familiar-settings-soon" data-familiar-coming-soon>Coming soon</span>;
}
