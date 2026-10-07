import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import {
  AudioSettings,
  ImmersionPreferences,
  FateActions,
} from './types';
import { AudioMenu } from './AudioMenu';

interface Props {
  audio: AudioSettings;
  immersion: ImmersionPreferences;
  actions: FateActions;
  isMobile?: boolean;
}

export function ImmersionSettings({
  audio,
  immersion: { immersion, setImmersion },
  actions: { handleExportText },
  isMobile = false,
}: Props) {
  const [showImmersionPopover, setShowImmersionPopover] = useState<boolean>(false);
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

  const renderSettingsPopover = (isMobile: boolean) => (
    <div className={isMobile
      ? "fixed bottom-24 left-4 right-4 max-h-[70vh] overflow-y-auto bg-black/95 backdrop-blur-md border border-neutral-850 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-4 z-50 text-sans text-left"
      : "absolute bottom-full mb-3 left-0 w-72 max-h-[70vh] overflow-y-auto bg-black/95 backdrop-blur-md border border-neutral-855 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-4 z-50 animate-fade-in font-sans text-left"}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3">
        <h4 className="text-[10px] uppercase font-sc text-portal tracking-wider font-bold">
          Immersion Control Matrix
        </h4>
        <span className="text-[8px] font-mono text-neutral-500">
          v2.1
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Master Switch on Top */}
        <div className="flex items-center justify-between bg-neutral-950/85 p-2 rounded-lg border border-neutral-900">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#FAFAFA] font-sans">
              Immersion Engine
            </span>
            <span className="text-[9px] text-neutral-500 font-sans">
              Master on/off for the reading effects below.
            </span>
          </div>
          <button onClick={() => setImmersion({ master: !immersion.master })}
            role="switch"
            aria-checked={immersion.master}
            aria-label="Toggle Master Immersion"
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              immersion.master ? "bg-portal/80 shadow-[0_0_8px_rgba(4,172,255,0.4)]" : "bg-neutral-850"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow transition duration-200 ease-in-out ${
                immersion.master ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
              }`}
            />
          </button>
        </div>

        {/* Sub-toggles */}
        <div className={`space-y-3 pl-1 transition-opacity duration-200 ${immersion.master ? "opacity-100" : "opacity-40 pointer-events-none"}`}>

          {/* Auto-scroll */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Autonomous Reading
              </span>
              <span className="text-[8px] text-neutral-500">
                Pages follow reading playhead
              </span>
            </div>
            <button onClick={() => immersion.master && setImmersion({ autoScroll: !immersion.autoScroll })}
              disabled={!immersion.master}
              role="switch"
              aria-checked={immersion.autoScroll}
              aria-label="Toggle Auto Scroll"
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                immersion.autoScroll ? "bg-portal/60" : "bg-neutral-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                  immersion.autoScroll ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                }`}
              />
            </button>
          </div>

          {/* Image popups */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Holographic Visions
              </span>
              <span className="text-[8px] text-neutral-500">
                Automatic scenic image pop-ups
              </span>
            </div>
            <button onClick={() => immersion.master && setImmersion({ imagePopups: !immersion.imagePopups })}
              disabled={!immersion.master}
              role="switch"
              aria-checked={immersion.imagePopups}
              aria-label="Toggle Image Popups"
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                immersion.imagePopups ? "bg-portal/60" : "bg-neutral-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                  immersion.imagePopups ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                }`}
              />
            </button>
          </div>

        </div>

        {/* Unified audio controls: Master / Music / Atmosphere / Audio Cues.
            Independent of the Immersion Engine switch above — sound has its
            own master. */}
        <div className="border-t border-neutral-900 pt-3 mt-1">
          <h5 className="text-[9px] uppercase font-sc text-neutral-400 tracking-wider font-bold mb-2.5">
            Audio
          </h5>
          <AudioMenu idSuffix={isMobile ? 'mobile' : 'desktop'} />
        </div>

        {/* Collapsible Voice Settings */}
        <div className="border-t border-neutral-900 pt-2 mt-1">
          <button onClick={() => setShowVoiceDetail(!showVoiceDetail)}
            aria-expanded={showVoiceDetail}
            aria-label="Toggle Voice Details"
            className="flex items-center justify-between w-full text-[9px] uppercase font-sc text-neutral-400 hover:text-signal transition-colors py-1 focus:outline-none"
          >
            <div className="text-left">
              <span className="block">Voice Matrix Signature</span>
              <span className="text-[8px] text-neutral-500 font-sans normal-case font-normal">Set narrator and character voices for text-to-speech.</span>
            </div>
            <span className="text-[8px] font-mono">{showVoiceDetail ? "▲" : "▼"}</span>
          </button>

          {showVoiceDetail && (
            <div className="space-y-2 mt-2 animate-fade-in text-neutral-400">
              <div>
                <label className="block text-[8px] text-neutral-500 mb-1" htmlFor={`narrator-voice-${isMobile ? 'mobile' : 'desktop'}`}>
                  Narrator Voice
                </label>
                <select
                  id={`narrator-voice-${isMobile ? 'mobile' : 'desktop'}`}
                  value={audio.selectedVoiceURI}
                  onChange={(e) => audio.setSelectedVoiceURI(e.target.value)}
                  className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                >
                  {audio.availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-neutral-500 mb-1" htmlFor={`dialogue-voice-${isMobile ? 'mobile' : 'desktop'}`}>
                  Protagonist Voice
                </label>
                <select
                  id={`dialogue-voice-${isMobile ? 'mobile' : 'desktop'}`}
                  value={audio.selectedDialogueVoiceURI}
                  onChange={(e) => audio.setSelectedDialogueVoiceURI(e.target.value)}
                  className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                >
                  {audio.availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-neutral-500 mb-1" htmlFor={`side-voice-${isMobile ? 'mobile' : 'desktop'}`}>
                  Side Character Voice
                </label>
                <select
                  id={`side-voice-${isMobile ? 'mobile' : 'desktop'}`}
                  value={audio.selectedSideVoiceURI}
                  onChange={(e) => audio.setSelectedSideVoiceURI(e.target.value)}
                  className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                >
                  {audio.availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Playback & Download Settings */}
        <div className="border-t border-neutral-900 pt-3 mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Playback Speed
              </span>
              <span className="text-[8px] text-neutral-500">
                Adjust recitation rate
              </span>
            </div>
            <button
              onClick={() => audio.setSpeechRate((prev) => (prev >= 2 ? 0.5 : prev + 0.5))}
              className="text-[10px] font-mono hover:text-signal bg-void border border-neutral-800 px-3 py-1.5 rounded text-neutral-400 focus:outline-none"
            >
              {audio.speechRate.toFixed(1)}x
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Export Chronicle
              </span>
              <span className="text-[8px] text-neutral-500">
                Download chapter as text
              </span>
            </div>
            <button
              onClick={handleExportText}
              className="text-[9px] font-sc uppercase hover:text-signal bg-void border border-neutral-800 px-3 py-1.5 rounded text-neutral-400 focus:outline-none"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setShowImmersionPopover(!showImmersionPopover)}
        aria-label="Immersion Settings"
        className={`p-2 border rounded-full transition-colors focus:outline-none ${showImmersionPopover ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900 text-neutral-400"}`}
      >
        <Settings size={16} />
      </button>
      {showImmersionPopover && renderSettingsPopover(isMobile)}
    </div>
  );
}
