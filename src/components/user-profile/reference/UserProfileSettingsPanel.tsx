import { CloudOff, RefreshCw, Cloud, Globe, Sliders, AlertTriangle, BookOpen } from 'lucide-react';
import {
  ChapterWritingStyle,
  UserProfile as UserProfileType,
} from '../shared/types';
import { useUserProfileServices } from '../shared/userProfileServices';
import {
  CHAPTER_WRITING_STYLE_OPTIONS,
  normalizeChapterWritingStyle,
} from './chapterWritingStyle';

interface UserProfileSettingsPanelProps {
  syncStatus: string;
  lastSavedTime: Date | null;
  formData: Partial<UserProfileType>;
  profile: UserProfileType | null;
  handleLanguageChangeDirect: (name: 'preferredLanguage' | 'defaultTranslationLanguage', value: string) => void;
  handleDefaultChapterWritingStyleChange: (value: ChapterWritingStyle) => Promise<void>;
  isSavingChapterWritingStyle: boolean;
}

export function UserProfileSettingsPanel({
  syncStatus,
  lastSavedTime,
  formData,
  profile,
  handleLanguageChangeDirect,
  handleDefaultChapterWritingStyleChange,
  isSavingChapterWritingStyle,
}: UserProfileSettingsPanelProps) {
  // Production reads the local-only flag and its setter from `lib/firebase` and
  // calls the deep library sync on `lib/storage`. All three arrive through the
  // injected services port instead.
  const {
    localOnlyMode: LOCAL_ONLY_MODE,
    setLocalOnlyMode,
    requestLibrarySync,
  } = useUserProfileServices();
  const isHarmonizing = syncStatus === 'syncing';
  const harmonyDetail = syncStatus === 'offline'
    ? 'Offline'
    : isHarmonizing
      ? 'Harmonizing…'
      : syncStatus === 'error'
        ? 'Needs attention'
        : 'Press to sync';
  const harmonyTitle = syncStatus === 'offline'
    ? LOCAL_ONLY_MODE
      ? 'Harmony is in legacy device-only mode. Activate to reconnect cloud storage.'
      : 'Harmony is offline. Reconnect, then activate it to reconcile your devices.'
    : isHarmonizing
      ? 'Harmony is synchronizing your library.'
      : syncStatus === 'error'
        ? 'Harmony needs attention. Activate it to reconcile queued and remote changes.'
        : 'Activate Harmony to reconcile every story and chapter across your devices.';
  const activateHarmony = () => {
    if (LOCAL_ONLY_MODE) {
      setLocalOnlyMode(false);
      return;
    }
    requestLibrarySync();
  };

  return (
    <>
      {/* Celestial Tools Section (Always Visible) */}
      <div className="border-t border-neutral-900/50 pt-10">
        <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
          <Sliders size={14} className="text-portal" />
          Environment & Sync Settings
        </h3>
        <div className="flex flex-col gap-5 bg-[#030303] p-5 rounded-xl border border-neutral-900 shadow-inner">
          <div className="flex flex-wrap items-center gap-4 border-b border-neutral-900/50 pb-4">
            <button
              type="button"
              onClick={activateHarmony}
              disabled={isHarmonizing}
              title={harmonyTitle}
              aria-label={`Harmony: ${harmonyDetail}`}
              aria-busy={isHarmonizing}
              className={`group flex min-w-48 items-center gap-3 rounded-lg border bg-black px-4 py-2.5 text-left transition-all disabled:cursor-wait ${
                syncStatus === 'error'
                  ? 'border-human/40 text-human hover:bg-human/10'
                  : syncStatus === 'offline'
                    ? 'border-neutral-800 text-neutral-500 hover:border-portal/40 hover:text-portal'
                    : 'border-portal/30 text-portal hover:border-portal/60 hover:bg-portal/5'
              }`}
            >
              <span aria-hidden="true" className="shrink-0">
                {syncStatus === 'offline' ? (
                  <CloudOff size={16} />
                ) : isHarmonizing ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : syncStatus === 'error' ? (
                  <AlertTriangle size={16} />
                ) : (
                  <Cloud size={16} />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-sc text-[11px] font-bold uppercase tracking-widest">Harmony</span>
                <span
                  aria-live="polite"
                  className="font-sans text-[9px] font-medium uppercase tracking-[0.16em] opacity-70"
                >
                  {harmonyDetail}
                </span>
              </span>
              {isHarmonizing ? (
                <span className="sr-only">Library synchronization is in progress.</span>
              ) : (
                <span className="sr-only">Activate to reconcile every story and chapter now.</span>
              )}
            </button>
            {lastSavedTime && (
              <div className="text-[10px] font-mono text-neutral-600 tracking-wider">
                Saved on device: {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>

          {/* Interactive Language & Translation Settings - Un-gatekept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-b border-neutral-900/50 pb-5">
            <div className="flex items-center justify-between bg-black/40 border border-neutral-850 rounded-xl p-3 sm:p-3.5 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-neutral-900/50 rounded-lg shrink-0"><Globe size={13} className="text-portal animate-pulse" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-neutral-400 font-sc truncate">Preferred Language</span>
                  <span className="text-[8px] text-neutral-500 font-sans truncate">Active UI dialect</span>
                </div>
              </div>
              <div className="relative shrink-0">
                <select 
                  name="preferredLanguage" 
                  value={formData.preferredLanguage || profile?.preferredLanguage || 'English'} 
                  onChange={(e) => handleLanguageChangeDirect('preferredLanguage', e.target.value)}
                  className="bg-black border border-neutral-800 hover:border-portal/50 rounded pl-2 pr-6 py-1.5 text-[11px] text-signal focus:border-portal outline-none font-sans cursor-pointer transition-all appearance-none w-24 sm:w-32 text-ellipsis overflow-hidden"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Simplified Chinese (简体中文)">Simplified Chinese (简体中文)</option>
                  <option value="Traditional Chinese (繁體中文)">Traditional Chinese (繁體中文)</option>
                  <option value="Japanese (日本語)">Japanese (日本語)</option>
                  <option value="Korean (한국어)">Korean (한국어)</option>
                  <option value="Vietnamese (Tiếng Việt)">Vietnamese (Tiếng Việt)</option>
                  <option value="Indonesian (Bahasa Indonesia)">Indonesian (Bahasa Indonesia)</option>
                  <option value="Thai (ภาษาไทย)">Thai (ภาษาไทย)</option>
                  <option value="Tagalog (Filipino)">Tagalog (Filipino)</option>
                  <option value="Malay (Bahasa Melayu)">Malay (Bahasa Melayu)</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[9px]">▼</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/40 border border-neutral-850 rounded-xl p-3 sm:p-3.5 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-neutral-900/50 rounded-lg shrink-0"><Globe size={13} className="text-human animate-pulse" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-neutral-400 font-sc truncate">Translation Default</span>
                  <span className="text-[8px] text-neutral-500 font-sans truncate">Automatic translation</span>
                </div>
              </div>
              <div className="relative shrink-0">
                <select 
                  name="defaultTranslationLanguage" 
                  value={formData.defaultTranslationLanguage || profile?.defaultTranslationLanguage || 'English'} 
                  onChange={(e) => handleLanguageChangeDirect('defaultTranslationLanguage', e.target.value)}
                  className="bg-black border border-neutral-800 hover:border-human/50 rounded pl-2 pr-6 py-1.5 text-[11px] text-signal focus:border-human outline-none font-sans cursor-pointer transition-all appearance-none w-24 sm:w-32 text-ellipsis overflow-hidden"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Simplified Chinese (简体中文)">Simplified Chinese (简体中文)</option>
                  <option value="Traditional Chinese (繁體中文)">Traditional Chinese (繁體中文)</option>
                  <option value="Japanese (日本語)">Japanese (日本語)</option>
                  <option value="Korean (한국어)">Korean (한국어)</option>
                  <option value="Vietnamese (Tiếng Việt)">Vietnamese (Tiếng Việt)</option>
                  <option value="Indonesian (Bahasa Indonesia)">Indonesian (Bahasa Indonesia)</option>
                  <option value="Thai (ภาษาไทย)">Thai (ภาษาไทย)</option>
                  <option value="Tagalog (Filipino)">Tagalog (Filipino)</option>
                  <option value="Malay (Bahasa Melayu)">Malay (Bahasa Melayu)</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[9px]">▼</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-neutral-850 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="shrink-0 rounded-lg bg-neutral-900/50 p-2">
                <BookOpen size={13} className="text-jade-accent" />
              </div>
              <div className="flex min-w-0 flex-col">
                <label
                  htmlFor="default-chapter-writing-style"
                  className="font-sc text-[9px] font-bold uppercase tracking-widest text-neutral-400 sm:text-[10px]"
                >
                  Default Chapter Writing Style
                </label>
                <span className="font-sans text-[8px] text-neutral-500">
                  Used when a new story is created
                </span>
              </div>
            </div>
            <select
              id="default-chapter-writing-style"
              value={normalizeChapterWritingStyle(
                formData.defaultChapterWritingStyle
                  ?? profile?.defaultChapterWritingStyle,
              )}
              onChange={(event) => {
                void handleDefaultChapterWritingStyleChange(
                  event.target.value as ChapterWritingStyle,
                );
              }}
              disabled={!profile || isSavingChapterWritingStyle}
              aria-busy={isSavingChapterWritingStyle}
              className="w-full cursor-pointer rounded border border-neutral-800 bg-black px-3 py-2 font-sans text-[11px] text-signal outline-none transition-all hover:border-jade-accent/50 focus:border-jade-accent disabled:cursor-wait disabled:opacity-60 sm:w-44"
            >
              {CHAPTER_WRITING_STYLE_OPTIONS.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
