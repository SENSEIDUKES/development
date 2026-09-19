import React, { useRef } from 'react';
import { SEIDialog, SEIDialogContent, SEIDialogTitle, SEIDialogDescription } from '@seihouse/ui';
import { Camera, Image as ImageIcon, RefreshCw, Sparkles, X } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { LibraryProfileIcon as SENProfileIcon } from '@seihouse/library-ui';
import './portraitBuilder.css';
import { UserProfile } from '../shared/types';

const PORTRAIT_GENERATION_LABELS = ['Features', 'Aura', 'Soul', 'Details', 'Finishing Touches', 'Completing'] as const;

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

  const previewUrl = generatedPortraitUrl || portraitUploadBase64 || profile?.avatarUrl;

  return (
    <SEIDialog open={showPortraitModal} onOpenChange={open => { if (!isSavingPortrait) setShowPortraitModal(open); }}>
      <SEIDialogContent hideClose variant="dark" className="cave-portrait-builder z-[310]" bodyClassName="portrait-builder-shell" backdropClassName="z-[300]">
        <header className="portrait-builder-header">
          <div>
            <p className="portrait-builder-eyebrow">The Divine Mirror</p>
            <SEIDialogTitle className="portrait-builder-title">Cultivator Portrait Builder</SEIDialogTitle>
            <SEIDialogDescription className="portrait-builder-intro">
              {generatedPortraitUrl ? 'Your reflection is ready. Make it part of your cultivation journey.' : 'Give your cultivation journey a face of its own.'}
            </SEIDialogDescription>
          </div>
          <button type="button" onClick={() => setShowPortraitModal(false)} disabled={isSavingPortrait}
            className="portrait-builder-close h-11 w-11 focus-visible:outline" aria-label="Close Portrait Builder">
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="portrait-builder-body">
          {portraitError && <div className="portrait-builder-error" role="alert">{portraitError}</div>}
          <div className="portrait-builder-layout">
            <section className="portrait-builder-mirror" aria-label="Portrait preview">
              <p className="portrait-builder-eyebrow">{generatedPortraitUrl ? 'Your new portrait' : 'Your reflection'}</p>
              <div className="portrait-builder-frame">
                {previewUrl ? <img src={previewUrl} alt={generatedPortraitUrl ? 'Generated Portrait' : 'Portrait preview'} referrerPolicy="no-referrer" />
                  : <SENProfileIcon size={72} aria-hidden="true" />}
              </div>
              <div className="portrait-builder-identity">
                <p>{profile?.displayName || 'Cultivator'}</p>
                <span>{daoData.rank}{equippedArtifact ? ' · Relic attuned' : ''}</span>
              </div>
              <p className="portrait-builder-caption">{generatedPortraitUrl ? 'Previewed as it will appear on your profile.' : 'A reflection of the cultivator you are becoming.'}</p>
            </section>

            {!generatedPortraitUrl ? (
              <div className="portrait-builder-fields">
                <div>
                  <h3 className="portrait-builder-label">Reference image <span>Optional</span></h3>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPortraitUploadFile(file);
                      const reader = new FileReader();
                      reader.onload = ev => { if (ev.target?.result) setPortraitUploadBase64(ev.target.result.toString()); };
                      reader.readAsDataURL(file);
                    }} />
                  <button type="button" className="portrait-builder-upload" onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver} onDrop={handleDrop}>
                    <ImageIcon size={24} aria-hidden="true" />
                    <span>{portraitUploadFile ? 'Change reference image' : 'Choose an image'}<small>{portraitUploadFile ? portraitUploadFile.name : 'or drop it here · JPG, PNG, WebP'}</small></span>
                  </button>
                  <p className="portrait-builder-hint">Start with a photo, or leave this empty to create a portrait from your description.</p>
                </div>
                <div>
                  <label htmlFor="desc-input" className="portrait-builder-label">Appearance <span>Optional</span></label>
                  <textarea id="desc-input" value={portraitDesc} onChange={e => setPortraitDesc(e.target.value)} maxLength={2000}
                    placeholder="Silver hair, azure robes, a quiet confidence…" className="portrait-builder-description" />
                  <p className="portrait-builder-hint">Describe your features, clothing, or the feeling you want to capture.</p>
                </div>
              </div>
            ) : (
              <div className="portrait-builder-result">
                <Sparkles size={26} aria-hidden="true" />
                <h3>Your portrait awaits</h3>
                <p>Accept this reflection to display it on your profile, or manifest another.</p>
                <p className="portrait-builder-hint">Your current portrait stays in place until you accept.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="portrait-builder-footer">
          <p className="portrait-builder-footer-note">{generatedPortraitUrl ? 'A new face. The same cultivation journey.' : 'Review your portrait before applying it.'}</p>
          <div className="portrait-builder-actions">
            {generatedPortraitUrl ? <>
              <LibraryButton variant="secondary" icon={RefreshCw} onClick={handleGeneratePortrait} disabled={isSavingPortrait}>Regenerate</LibraryButton>
              <LibraryButton onClick={handleApplyPortrait} disabled={isSavingPortrait}>{isSavingPortrait ? 'Saving Portrait...' : 'Accept & Apply'}</LibraryButton>
            </> : <LibraryButton icon={Camera} onClick={handleGeneratePortrait} disabled={isGeneratingPortrait}>
              {isGeneratingPortrait ? <span role="status">Manifesting {PORTRAIT_GENERATION_LABELS[generationStep] ?? 'Completing'}...</span> : 'Manifest Portrait'}
            </LibraryButton>}
          </div>
        </footer>
      </SEIDialogContent>
    </SEIDialog>
  );
};
