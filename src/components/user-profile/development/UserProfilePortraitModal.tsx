import React, { useRef } from 'react';
import { SEIDialog, SEIDialogContent, SEIDialogTitle } from '@seihouse/ui';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { UserProfile } from '../shared/types';

interface UserProfilePortraitModalProps {
  showPortraitModal: boolean;
  setShowPortraitModal: (show: boolean) => void;
  portraitUploadFile: File | null;
  setPortraitUploadFile: (file: File | null) => void;
  portraitUploadBase64: string;
  setPortraitUploadBase64: (base: string) => void;
  portraitDesc: string;
  setPortraitDesc: (desc: string) => void;
  isGeneratingPortrait: boolean;
  isSavingPortrait: boolean;
  portraitError: string;
  generatedPortraitUrl: string;
  generationStep: number;
  handleGeneratePortrait: () => void;
  handleApplyPortrait: () => void;
  daoData: any;
  equippedArtifact: any;
  profile: UserProfile | null;
}

export const UserProfilePortraitModal: React.FC<UserProfilePortraitModalProps> = ({
  showPortraitModal,
  setShowPortraitModal,
  portraitUploadFile,
  setPortraitUploadFile,
  portraitUploadBase64,
  setPortraitUploadBase64,
  portraitDesc,
  setPortraitDesc,
  isGeneratingPortrait,
  isSavingPortrait,
  portraitError,
  generatedPortraitUrl,
  generationStep,
  handleGeneratePortrait,
  handleApplyPortrait,
  daoData,
  equippedArtifact,
  profile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setPortraitUploadFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPortraitUploadBase64(ev.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!showPortraitModal) return null;

  return (
    <SEIDialog open={showPortraitModal} onOpenChange={open => { if (!isSavingPortrait) setShowPortraitModal(open); }}>
      <SEIDialogContent hideClose variant="dark" className="z-[310] !p-0 !gap-0 bg-[#050505] border border-portal/30 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(4,172,255,0.15)] overflow-hidden flex flex-col max-h-[90dvh]" backdropClassName="z-[300]" aria-describedby={undefined}>
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <SEIDialogTitle id="portrait-modal-title" className="font-sc font-bold uppercase tracking-widest text-portal text-xs flex items-center gap-2">
            <Camera aria-hidden="true" size={14} /> Cultivator Portrait Builder
          </SEIDialogTitle>
          <button type="button" onClick={() => setShowPortraitModal(false)} disabled={isSavingPortrait} className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-400 hover:text-white transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Close Portrait Builder">
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {portraitError && (
            <div className="p-3 mb-6 bg-human/10 border border-human/30 rounded-lg" role="alert">
              <p className="text-human font-mono text-xs">{portraitError}</p>
            </div>
          )}

          {!generatedPortraitUrl ? (
            <div className="space-y-6">
              <div 
                className={`border-2 border-dashed ${portraitUploadFile ? 'border-portal/50 bg-portal/5' : 'border-neutral-800 hover:border-portal/30 bg-black/50'} rounded-xl p-8 text-center transition-all motion-reduce:transition-none cursor-pointer relative overflow-hidden group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff]`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setPortraitUploadFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setPortraitUploadBase64(ev.target.result.toString());
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                
                {portraitUploadBase64 ? (
                  <div className="absolute inset-0">
                    <img src={portraitUploadBase64} alt="Upload preview" className="w-full h-full object-cover opacity-30 group-hover:opacity-20 transition-opacity motion-reduce:transition-none" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm border border-portal/30">
                        <span className="text-portal font-mono text-xs">Image Selected - Click to change</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 group-hover:text-portal transition-colors group-hover:scale-110 duration-500 motion-reduce:transition-none motion-reduce:transform-none">
                      <ImageIcon aria-hidden="true" size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-neutral-300 font-sans">Drop a base image here</p>
                      <p className="text-[10px] text-neutral-400 font-sans uppercase tracking-wider">or click to browse</p>
                    </div>
                    <p className="text-[9px] text-portal/60 font-mono mt-4">Optional. If skipped, portrait will be generated from scratch.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label htmlFor="desc-input" className="text-[10px] font-sc uppercase tracking-widest text-neutral-400 ml-1">Appearance Description (Optional)</label>
                <textarea id="desc-input" 
                  value={portraitDesc}
                  onChange={(e) => setPortraitDesc(e.target.value)}
                  maxLength={2000}
                  placeholder="e.g. A young scholar with silver hair, sharp eyes, wearing azure robes of the Sky Sword Sect..."
                  className="w-full h-24 bg-[#080808] border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 font-sans focus:outline-none focus-visible:border-portal/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] transition-colors motion-reduce:transition-none resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGeneratePortrait}
                disabled={isGeneratingPortrait}
                className="flex min-h-11 w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-portal/30 bg-portal/10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-portal shadow-[0_0_20px_rgba(4,172,255,0.1)] transition-all hover:bg-portal/20 hover:shadow-[0_0_30px_rgba(4,172,255,0.2)] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingPortrait ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-portal/10 to-transparent animate-shimmer motion-reduce:animate-none" />
                    <Camera aria-hidden="true" size={14} className="animate-pulse motion-reduce:animate-none" />
                    <span>Manifesting {['Features', 'Aura', 'Soul', 'Completing'][generationStep]}...</span>
                  </>
                ) : (
                  <>
                    <Camera aria-hidden="true" size={14} />
                    <span>Manifest Portrait</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative aspect-square rounded-xl overflow-hidden border border-portal/30 shadow-[0_0_30px_rgba(4,172,255,0.15)] group">
                <img src={generatedPortraitUrl} alt="Generated Portrait" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-portal font-sc font-bold uppercase tracking-widest text-xs">{profile?.displayName || 'Cultivator'}</p>
                    <p className="text-neutral-400 font-mono text-[10px]">{daoData.rank}</p>
                  </div>
                  {equippedArtifact && (
                    <div className="w-6 h-6 rounded border border-portal/30 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-[10px]">✨</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleGeneratePortrait()}
                  disabled={isSavingPortrait}
                  className="min-h-11 flex-1 rounded-lg border border-neutral-700 bg-transparent py-3 font-sans text-xs text-neutral-300 transition-colors hover:border-neutral-500 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleApplyPortrait}
                  disabled={isSavingPortrait}
                  className="min-h-11 flex-[2] rounded-lg border border-portal/50 bg-portal/20 py-3 font-sc text-xs font-bold uppercase tracking-widest text-portal shadow-[0_0_15px_rgba(4,172,255,0.2)] transition-all hover:bg-portal/30 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingPortrait ? 'Saving Portrait...' : 'Accept & Apply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </SEIDialogContent>
    </SEIDialog>
  );
};
