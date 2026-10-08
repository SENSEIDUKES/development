import React, { useEffect, useRef, useState } from 'react';
import { SEIDialog, SEIDialogContent, SEIDialogTitle, SEIDialogDescription } from '@seihouse/ui';
import { Camera, Check, Download, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { LibraryProfileIcon as SENProfileIcon } from '@seihouse/library-ui';
import './portraitBuilder.css';
import { UserProfile } from './types';
import { EnergyActionCost } from '../../energy/development/EnergyActionCost';
import { EnergySpendFloater, type EnergySpendBurst } from '../../energy/development/EnergySpendFloater';
import { getEnergyPriceEntry } from '../../energy/shared/energyContracts';

/** The builder offers three portraits for each photo. */
export const PORTRAIT_CHOICES = 3;

interface UserProfilePortraitModalProps {
  showPortraitModal: boolean;
  setShowPortraitModal: (show: boolean) => void;
  portraitUploadFile: File | null;
  portraitUploadBase64: string;
  isGeneratingPortrait: boolean;
  isSavingPortrait: boolean;
  portraitError: string;
  generatedPortraitUrls: string[];
  chosenPortrait: number;
  setChosenPortrait: (index: number) => void;
  handleFileChange: (file: File) => void;
  handleGeneratePortrait: () => void;
  handleApplyPortrait: () => void;
  daoData: { rank: string };
  profile: UserProfile | null;
  /** The host's note when it has not built portrait generation yet: Make portraits shows disabled, with the note. */
  generationNote?: string;
}

/**
 * Profile picture: the reader chooses a photo of themselves, the host makes
 * portraits from it (three to choose from), and the one chosen becomes their
 * profile picture.
 */
export const UserProfilePortraitModal: React.FC<UserProfilePortraitModalProps> = ({
  showPortraitModal,
  setShowPortraitModal,
  portraitUploadFile,
  portraitUploadBase64,
  isGeneratingPortrait,
  isSavingPortrait,
  portraitError,
  generatedPortraitUrls,
  chosenPortrait,
  setChosenPortrait,
  handleFileChange,
  handleGeneratePortrait,
  handleApplyPortrait,
  daoData,
  profile,
  generationNote,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [spent, setSpent] = useState<EnergySpendBurst>();
  const imagePrice = getEnergyPriceEntry('image.generate').price ?? 0;
  // Each set of portraits shows its Energy leaving: one "−5" per portrait made.
  useEffect(() => {
    if (generatedPortraitUrls.length && imagePrice) setSpent(previous => ({ key: (previous?.key ?? 0) + 1, amount: imagePrice, count: generatedPortraitUrls.length }));
  }, [generatedPortraitUrls, imagePrice]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  if (!showPortraitModal) return null;

  const made = generatedPortraitUrls.length > 0;
  const chosenUrl = made ? generatedPortraitUrls[chosenPortrait] ?? generatedPortraitUrls[0] : undefined;
  const previewUrl = chosenUrl || portraitUploadBase64 || profile?.avatarUrl;
  const busy = isGeneratingPortrait || isSavingPortrait;

  return (
    <SEIDialog open={showPortraitModal} onOpenChange={open => { if (!isSavingPortrait) setShowPortraitModal(open); }}>
      <SEIDialogContent hideClose variant="dark" className="cave-portrait-builder z-[310]" bodyClassName="portrait-builder-shell" backdropClassName="z-[300]">
        <header className="portrait-builder-header">
          <div>
            <SEIDialogTitle className="portrait-builder-title">Profile picture</SEIDialogTitle>
            <SEIDialogDescription className="portrait-builder-intro">
              {made ? 'Choose the portrait you want as your profile picture.' : 'Choose a photo of yourself. You get three cultivator portraits made from it to choose from.'}
            </SEIDialogDescription>
          </div>
          <button type="button" onClick={() => setShowPortraitModal(false)} disabled={isSavingPortrait}
            className="portrait-builder-close h-11 w-11 focus-visible:outline" aria-label="Close Profile picture">
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="portrait-builder-body">
          {portraitError && <div className="portrait-builder-error" role="alert">{portraitError}</div>}
          <div className="portrait-builder-layout">
            <section className="portrait-builder-mirror" aria-label="Portrait preview">
              <div className="portrait-builder-frame">
                {previewUrl ? <img src={previewUrl} alt={chosenUrl ? 'Chosen portrait' : 'Your photo'} referrerPolicy="no-referrer" />
                  : <SENProfileIcon size={72} aria-hidden="true" />}
              </div>
              <div className="portrait-builder-identity">
                <p>{profile?.displayName || 'Cultivator'}</p>
                <span>{daoData.rank}</span>
              </div>
            </section>

            {!made ? (
              <div className="portrait-builder-fields">
                <div>
                  <h3 className="portrait-builder-label">Your photo</h3>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" data-portrait-photo
                    onChange={event => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) handleFileChange(file);
                    }} />
                  <button type="button" className="portrait-builder-upload" onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver} onDrop={handleDrop} disabled={busy}>
                    <ImageIcon size={24} aria-hidden="true" />
                    <span>{portraitUploadFile ? 'Choose another photo' : 'Choose a photo'}<small>{portraitUploadFile ? portraitUploadFile.name : 'or drop it here · JPG, PNG, WebP'}</small></span>
                  </button>
                  <p className="portrait-builder-hint">A clear photo of your face works best. It is only used to make your portraits and is not kept.</p>
                </div>
              </div>
            ) : (
              <div className="portrait-builder-choices" role="group" aria-label="Portraits to choose from">
                {generatedPortraitUrls.map((url, index) => (
                  <div key={index} className="portrait-builder-choice-wrap">
                    <button type="button" className="portrait-builder-choice" aria-pressed={index === chosenPortrait}
                      aria-label={`Portrait ${index + 1}`} onClick={() => setChosenPortrait(index)} disabled={isSavingPortrait}>
                      <img src={url} alt="" />
                      {index === chosenPortrait && <Check size={18} aria-hidden="true" />}
                    </button>
                    {/* Every portrait made can be kept, chosen or not. */}
                    <a className="portrait-builder-download" href={url} download={`profile-picture-${index + 1}.png`} aria-label={`Download portrait ${index + 1}`} title="Download">
                      <Download size={16} aria-hidden="true" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="portrait-builder-footer">
          <p className="portrait-builder-footer-note" data-cave-not-yet-built={!made && generationNote ? '' : undefined}>
            {made ? 'Your current picture stays until you use a new one.' : generationNote ?? (isGeneratingPortrait ? 'This can take up to a minute.' : 'Your photo goes to the image model and is not kept.')}
          </p>
          <div className="portrait-builder-actions">
            <EnergySpendFloater burst={spent} note="practice: nothing is taken yet" />
            {made ? <>
              <LibraryButton variant="secondary" icon={RefreshCw} onClick={handleGeneratePortrait} disabled={busy}>
                {isGeneratingPortrait ? <span role="status">Making your portraits…</span> : <>Make three more <EnergyActionCost price={imagePrice * PORTRAIT_CHOICES} /></>}
              </LibraryButton>
              <LibraryButton onClick={handleApplyPortrait} disabled={busy}>{isSavingPortrait ? 'Saving…' : 'Use this portrait'}</LibraryButton>
            </> : <LibraryButton icon={Camera} onClick={handleGeneratePortrait} disabled={busy || !portraitUploadFile || Boolean(generationNote)}>
              {isGeneratingPortrait ? <span role="status">Making your portraits…</span> : <>Make my portraits <EnergyActionCost price={imagePrice * PORTRAIT_CHOICES} /></>}
            </LibraryButton>}
          </div>
        </footer>
      </SEIDialogContent>
    </SEIDialog>
  );
};
