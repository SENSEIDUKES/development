import React from 'react';
import { Story, AppUser } from '../shared/types';
import { LogOut, Save, User as UserIcon, Calendar, BookOpen, Globe, Cloud, CloudOff, Sliders, Upload, Download, Zap, Keyboard, Flame, Award, Shield, Compass, Key, Sparkles, Search, Sword, HelpCircle } from 'lucide-react';
import { AURA_TIERS, getAuraColorForXp, getAuraTextStyle, getAuraGlowStyle } from './qi';
import { UserProfileAdminPanel } from './UserProfileAdminPanel';
import { UserProfileSettingsPanel } from './UserProfileSettingsPanel';
import { UserProfileInventoryPanel } from './UserProfileInventoryPanel';
import { UserProfileStoriesPanel } from './UserProfileStoriesPanel';
import { UserProfilePortraitModal } from './UserProfilePortraitModal';
import { useUserProfileServices } from '../shared/userProfileServices';
import './userProfile.css';

interface UserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

// Performance Optimization: Cache Intl.DateTimeFormat at module level to avoid costly recreation during render loops
const dateFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Unknown' : dateFormatter.format(d);
};

export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome }: UserProfileProps) {
  // Production calls `useUserProfile(...)` and reads the Firebase local-only flag
  // directly. Both arrive through the injected services port here, so this file
  // carries no Firebase, PostgreSQL, or generation dependency of its own.
  const { useController: useUserProfile, localOnlyMode } = useUserProfileServices();
  const {
    syncStatus,
    lastSavedTime,
    setIsSettingsOpen,
    handleExportLibrary,
    handleImportLibrary,
    storageType,
    activeStoryId,
    routingConfig,
    profile,
    isEditing,
    setIsEditing,
    formData,
    setFormData,
    isLoading,
    colorInputRef,
    error,
    showAdvanced,
    setShowAdvanced,
    isQiMenuOpen,
    setIsQiMenuOpen,
    activeQiTooltip,
    setActiveQiTooltip,
    isAdminPanelOpen,
    setIsAdminPanelOpen,
    adminTab,
    setAdminTab,
    allUsers,
    allStories,
    isFetchingAdminData,
    adminSearchQuery,
    setAdminSearchQuery,
    adminError,
    pendingLanguageChange,
    countdown,
    confirmLanguageChange,
    revertLanguageChange,
    handleFileChange,
    handleDrag,
    handleDrop,
    handleGeneratePortrait,
    handleApplyPortrait,
    fetchAdminData,
    handleUpdateUserRole,
    handleUpdateUserTier,
    handleDeleteStoryAdmin,
    handleLogin,
    handleAttuneArtifact,
    activeStoriesCount,
    setIsShortcutsOpen,
    setPortraitUploadFile,
    setPortraitUploadBase64,
    currentStreak,
    isCracked,
    daysTo3,
    daysTo10,
    handleRepairPillar,
    handleCheckIn,
    handleLanguageChangeDirect,
    handleDefaultChapterWritingStyleChange,
    isSavingChapterWritingStyle,
    handleSave,
    handleChange,
    daoData,
    equippedArtifact,
    currentPowerStage,
    showPortraitModal,
    setShowPortraitModal,
    portraitUploadFile,
    portraitUploadBase64,
    portraitDesc,
    setPortraitDesc,
    isGeneratingPortrait,
    isSavingPortrait,
    generatedPortraitUrl,
    portraitError,
    generationStep,
  } = useUserProfile({ currentUser, stories, onLogout, onNavigateHome });
  const attunedArtifact = (profile?.cosmicInventory || []).find(a => a.id === profile?.equippedArtifactId);
  const auraColor = getAuraColorForXp(
    profile?.displayNameColor,
    profile?.dao_xp ?? profile?.qi,
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-void border border-neutral-900 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(4,172,255,0.03)] backdrop-blur-sm relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-portal/30 to-transparent"></div>
        
        <div className="bg-black/40 p-6 sm:p-8 border-b border-neutral-900 flex justify-between items-center">
          <h2 className="font-display text-3xl text-signal flex items-center gap-3">
            <Cloud className="text-portal" size={28} /> 
            Celestial Tools
          </h2>
          {currentUser && (
            <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onLogout} className="px-5 py-2 border border-human/30 text-human hover:bg-human/10 hover:border-human hover:text-signal rounded-full text-[11px] font-sc font-bold tracking-wider transition-all flex items-center gap-2">
              <LogOut size={14} /> Sever Link
            </button>
          )}
        </div>

        {currentUser && (profile?.role === 'owner' || profile?.role === 'admin') && (
          <div className="flex border-b border-neutral-900 bg-black/20">
            <button
              onClick={() => setIsAdminPanelOpen(false)}
              className={`flex-1 py-4 text-xs font-sc font-bold uppercase tracking-widest transition-all border-b-2 text-center flex items-center justify-center gap-2 cursor-pointer ${
                !isAdminPanelOpen
                  ? 'border-portal text-portal bg-portal/5'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <UserIcon size={14} />
              My Cultivator Profile
            </button>
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className={`flex-1 py-4 text-xs font-sc font-bold uppercase tracking-widest transition-all border-b-2 text-center flex items-center justify-center gap-2 cursor-pointer ${
                isAdminPanelOpen
                  ? 'border-human text-signal bg-human/10 animate-pulse'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Shield size={14} className="text-human" />
              Akashic Switchboard (Admin)
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-human/10 border-b border-human/30 text-human text-sm font-mono text-center">
            {error}
          </div>
        )}

        <div className="p-6 md:p-10 space-y-12">
          {(!currentUser && !localOnlyMode) ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-8">
              <CloudOff size={56} className="text-neutral-800 drop-shadow-[0_0_30px_rgba(4,172,255,0.08)]" />
              <div className="space-y-4">
                <h3 className="font-display text-3xl text-signal">Spirit Unlinked</h3>
                <p className="text-base font-serif text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Link your soul to the Celestial Cloud to permanently etch your stories into the matrix and sync across different planes of existence.
                </p>
              </div>
              <button 
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleLogin} 
                className="px-8 py-3.5 bg-portal/10 border border-portal/50 text-portal hover:bg-portal hover:text-void rounded-full font-sc uppercase tracking-widest text-[12px] font-bold shadow-[0_0_20px_rgba(4,172,255,0.2)] hover:shadow-[0_0_30px_rgba(4,172,255,0.4)] transition-all"
              >
                Link Spirit Realm
              </button>
            </div>
          ) : isAdminPanelOpen ? (
            <UserProfileAdminPanel 
              profile={profile}
              currentUser={currentUser}
              allUsers={allUsers}
              allStories={allStories}
              adminSearchQuery={adminSearchQuery}
              setAdminSearchQuery={setAdminSearchQuery}
              adminTab={adminTab}
              setAdminTab={setAdminTab}
              isFetchingAdminData={isFetchingAdminData}
              fetchAdminData={fetchAdminData}
              adminError={adminError}
              handleUpdateUserTier={handleUpdateUserTier}
              handleUpdateUserRole={handleUpdateUserRole}
              handleDeleteStoryAdmin={handleDeleteStoryAdmin}
            />
          ) : (
            <>
              {/* Top Section - Avatar & Quick Info */}
              <div className="flex flex-col md:flex-row gap-8 md:items-start border-b border-neutral-900/50 pb-10">
                <div className="flex flex-col items-center flex-shrink-0 md:w-48">
                  <div className={`w-28 h-28 rounded-full border p-1 relative group transition-all duration-700 ${getAuraGlowStyle(auraColor, profile?.activeStatusEffects)}`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center relative">
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={36} className="text-neutral-700" />
                      )}
                      
                      {/* Floating particle animations for Heavenly Chronicler and above */}
                      {(auraColor === '#FFD700' || auraColor === 'gradient-violet-gold' || auraColor === 'animated-custom') && (
                        <div className="absolute inset-0 bg-black/10 pointer-events-none mix-blend-screen overflow-hidden">
                          <div className="absolute bottom-1 inset-x-0 h-8 flex justify-around opacity-75">
                            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-ping" style={{ animationDuration: '3s' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-bounce" style={{ animationDuration: '2s' }}></span>
                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" style={{ animationDuration: '2.5s' }}></span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-full border border-inherit opacity-40 scale-110 animate-[spin_15s_linear_infinite]"></div>
                  </div>
                  
                  {/* Cultivator Portrait Generator Button */}
                  <button
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowPortraitModal(true)}
                    className="mt-3 px-3 py-1.5 border border-portal/30 hover:border-portal text-portal font-sc text-[10px] font-bold uppercase tracking-widest rounded-lg bg-portal/5 hover:bg-portal/10 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(4,172,255,0.05)] hover:shadow-[0_0_20px_rgba(4,172,255,0.15)] group w-full justify-center"
                    title="Divine Mirror: Cast your mortal likeness into the cosmic loom"
                  >
                    <Sparkles size={11} className="text-portal animate-pulse group-hover:scale-110 transition-transform" />
                    Celestial Portrait
                  </button>

                  {/* Collapsible Advanced Settings Panel */}
                  <div className="mt-4 border-t border-neutral-900/50 pt-4 w-full text-center relative">
                    <button
                      type="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between gap-2 w-full text-[10px] font-sc uppercase font-bold tracking-widest text-portal hover:text-signal transition-all py-2 px-3 border border-portal/20 rounded-lg hover:border-portal bg-portal/5 hover:bg-portal/10"
                    >
                      <span>{showAdvanced ? "▲ Hide Tools" : "▼ Advanced Tools"}</span>
                      <Sliders size={11} className="text-portal" />
                    </button>

                    {showAdvanced && (
                      <div className="mt-3 p-4 bg-[#030303] border border-neutral-900 rounded-xl space-y-3 animate-fadeIn text-left w-64 max-w-xs absolute left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        <p className="text-[9px] font-sans text-neutral-500 leading-normal">
                          Configure custom model presets, routing overrides, or API credential endpoints.
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsSettingsOpen(true)}
                            className="w-full px-3 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-[9px] flex items-center gap-2 font-bold group"
                            title="Aether Router"
                          >
                            <Sliders size={12} className="text-portal group-hover:scale-110 transition-transform shrink-0" />
                            <span className="uppercase tracking-widest font-semibold whitespace-nowrap">Aether Router</span>
                          </button>
                          <button
                            type="button"
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsShortcutsOpen(true)}
                            className="w-full px-3 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-[9px] flex items-center gap-2 font-bold group"
                            title="Shortcuts Manual (or press ? key)"
                          >
                            <Keyboard size={12} className="text-portal group-hover:scale-110 transition-transform shrink-0" />
                            <span className="uppercase tracking-widest font-semibold whitespace-nowrap">Shortcuts</span>
                          </button>
                        </div>

                        <div className="border-t border-neutral-900/50 pt-3 flex flex-col gap-2">
                          <label className="flex items-center gap-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-portal border border-neutral-800 hover:border-portal/50 px-3 py-2 rounded-lg text-[9px] font-sc font-bold uppercase tracking-wider cursor-pointer transition-all group" htmlFor="a11y-id-1">
                            <Upload size={12} className="text-portal group-hover:-translate-y-0.5 transition-transform shrink-0" />
                            <span>Import Scroll</span>
                            <input id="a11y-id-1" 
                              type="file" 
                              accept=".json" 
                              onChange={handleImportLibrary} 
                              className="hidden" 
                            />
                          </label>

                          <button
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleExportLibrary}
                            disabled={stories.length === 0}
                            className="w-full flex items-center gap-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-signal border border-neutral-800 hover:border-human/50 px-3 py-2 rounded-lg text-[9px] font-sc font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                          >
                            <Download size={12} className="text-human group-hover:translate-y-0.5 transition-transform shrink-0" />
                            <span>Backup All</span>
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-5">
                  <div className="flex flex-col gap-3 mb-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                      <div className="px-3 py-1 bg-portal/10 border border-portal/30 text-portal text-[10px] font-bold tracking-[0.2em] uppercase rounded font-sc">
                        {daoData.rank}
                      </div>
                      <div className="relative flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQiMenuOpen(!isQiMenuOpen)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-portal/10 border border-portal/30 text-portal text-[11px] font-bold tracking-widest uppercase rounded-lg shadow-[0_0_15px_rgba(4,172,255,0.1)] hover:bg-portal/20 transition-all z-10"
                        >
                          <Zap size={14} className="animate-pulse" />
                          <span>Qi Cores</span>
                        </button>
                        
                        {isQiMenuOpen && (
                          <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-[280px] bg-black/95 border border-neutral-800 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3 z-50 animate-fadeIn space-y-2 backdrop-blur-md">
                            {/* Heavenly Qi Badge */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => setActiveQiTooltip(activeQiTooltip === 'heavenly' ? null : 'heavenly')}
                                className="w-full flex justify-between items-center text-[10px] text-portal font-sc uppercase font-bold tracking-widest border border-portal/20 px-3 py-2.5 rounded-lg bg-portal/5 shadow-[0_0_10px_rgba(4,172,255,0.05)] hover:bg-portal/10 transition-colors"
                              >
                                <div className="flex items-center gap-2.5"><Zap size={14} className="text-portal animate-pulse" /> Heavenly Qi</div>
                                <span className="text-sm font-sans">{profile?.heavenly_qi !== undefined ? profile.heavenly_qi : daoData.currentQi}</span>
                              </button>
                              {activeQiTooltip === 'heavenly' && (
                                <div className="p-2 border-l border-portal/30 ml-1 mb-1 animate-fadeIn">
                                  <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                                    Your fundamental essence gained from reading realms, making choices, and overcoming tribulations. Tracks your progression to higher cultivator ranks and determines your celestial aura color.
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Sect Qi Badge */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => setActiveQiTooltip(activeQiTooltip === 'sect' ? null : 'sect')}
                                className="w-full flex justify-between items-center text-[10px] text-[#FAFAFA] font-sc uppercase font-bold tracking-widest border border-[#8B0000]/40 px-3 py-2.5 rounded-lg bg-[#8B0000]/10 shadow-[0_0_10px_rgba(139,0,0,0.15)] hover:bg-[#8B0000]/20 transition-colors"
                              >
                                <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8B0000] animate-pulse shadow-[0_0_8px_rgba(139,0,0,0.8)]" /> Sect Qi</div>
                                <span className="text-sm font-sans">{profile?.sect_qi || 0}</span>
                              </button>
                              {activeQiTooltip === 'sect' && (
                                <div className="p-2 border-l border-[#8B0000]/50 ml-1 mb-1 animate-fadeIn">
                                  <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                                    Essence stored for your upcoming community contribution achievements. Utilized to exchange for special titles, customize sect affiliations, and fund cooperative arrays when the contribution hall is unlocked.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Demonic Qi Badge */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => setActiveQiTooltip(activeQiTooltip === 'demonic' ? null : 'demonic')}
                                className="w-full flex justify-between items-center text-[10px] text-amber-500 font-sc uppercase font-bold tracking-widest border border-amber-600/40 px-3 py-2.5 rounded-lg bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] hover:bg-amber-950/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> Demonic Qi</div>
                                <span className="text-sm font-sans">{profile?.demonic_qi || 0}</span>
                              </button>
                              {activeQiTooltip === 'demonic' && (
                                <div className="p-2 border-l border-amber-600/50 ml-1 mb-1 animate-fadeIn">
                                  <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                                    Corrupted cultivation power, unlocked from demonic artifacts or taboos. Proceed with caution when harnessing this forbidden essence.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {attunedArtifact && (
                      <div className="flex items-center gap-2 text-[10px] text-amber-400 font-sc uppercase font-bold tracking-widest border border-amber-500/20 px-3 py-1.5 rounded bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] max-w-fit">
                        <Award size={12} className="text-amber-400 animate-pulse" />
                        <span>Soul Attuned: {attunedArtifact.name} ({attunedArtifact.attributeBoost})</span>
                      </div>
                    )}
                    {daoData.nextRank && (
                      <div className="flex-1 max-w-[300px]">
                        <div className="flex justify-between text-[9px] text-neutral-500 mb-1.5 font-sc uppercase tracking-widest">
                          <span>Cultivation to {daoData.nextRank}</span>
                          <span className="text-portal/70">{profile?.heavenly_qi !== undefined ? profile.heavenly_qi : daoData.currentQi} / {daoData.maxQi} Heavenly Qi</span>
                        </div>
                        <div className="h-1 bg-neutral-900 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-portal/50 to-portal shadow-[0_0_10px_rgba(4,172,255,0.5)] transition-all duration-1000" style={{ width: `${daoData.progress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#030303] p-5 rounded-xl border border-neutral-900">
                    <div>
                      <label htmlFor="user-username" className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-2">Username (Dao Name)</label>
                      {isEditing ? (
                        <input 
                          id="user-username"
                          type="text" 
                          name="username" 
                          value={formData.username || ''} 
                          onChange={handleChange}
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-signal focus:border-portal outline-none font-sans"
                          placeholder="Enter Dao Name"
                        />
                      ) : (
                        <div className="text-xl font-sans">
                          {(() => {
                            const styleObj = getAuraTextStyle(auraColor, profile?.activeStatusEffects);
                            return (
                              <span className={styleObj.className || 'text-signal'} style={styleObj.style}>
                                {profile?.username || 'Anonymous Cultivator'}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="user-displayname" className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Display Name</label>
                        {!isEditing && (
                          <button 
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsEditing(true)} 
                            className="text-[10px] uppercase tracking-widest text-portal hover:text-portal/80 font-sc flex items-center gap-1 transition-colors"
                          >
                            Modify
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input 
                              id="user-displayname"
                              type="text" 
                              name="displayName" 
                              value={formData.displayName || ''} 
                              onChange={handleChange}
                              className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-signal focus:border-human outline-none font-sans"
                              placeholder="Your identity..."
                            />
                          </div>
                          
                          {/* Beautiful Gamified Dynamic Color Palette Options */}
                          <div className="bg-[#080808] border border-neutral-900 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-sc font-bold flex items-center gap-1.5">
                                <Zap size={11} className="text-portal animate-pulse" /> Celestial Aura Colors
                              </span>
                              <span className="text-[9px] font-mono text-neutral-500">Current XP: {profile?.dao_xp || profile?.qi || 0} Qi</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                              {AURA_TIERS.map((tier) => {
                                const currentXp = profile?.dao_xp || profile?.qi || 0;
                                const isUnlocked = currentXp >= tier.unlockedAt;
                                const isSelected = formData.displayNameColor === tier.colorHex;
                                const progress = isUnlocked ? 100 : Math.min(100, Math.max(0, (currentXp / tier.unlockedAt) * 100));
                                
                                return (
                                  <button
                                    key={tier.rank}
                                    type="button"
                                    disabled={!isUnlocked}
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                                      if (isUnlocked) {
                                        setFormData(prev => ({ ...prev, displayNameColor: tier.colorHex }));
                                      }
                                    }}
                                    className={`p-3 border rounded-xl text-left transition-all relative flex flex-col gap-3 group overflow-hidden ${
                                      !isUnlocked
                                        ? 'bg-black/40 border-neutral-900/80 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-portal/5 border-portal shadow-[0_0_15px_rgba(4,172,255,0.15)]'
                                        : 'bg-black/40 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/40'
                                    }`}
                                  >
                                    {/* Progress bar background for locked tiers */}
                                    {!isUnlocked && (
                                      <div className="absolute top-0 left-0 bottom-0 bg-neutral-900/30 -z-10" style={{ width: `${progress}%` }} />
                                    )}
                                    {/* Subtle glow background for unlocked tiers */}
                                    {isUnlocked && (
                                      <div className={`absolute inset-0 opacity-20 pointer-events-none -z-10 ${tier.bgGlow}`} />
                                    )}
                                    
                                    <div className="flex items-center gap-3 w-full z-10">
                                      {/* Color Preview Orb */}
                                      <div className="relative shrink-0 flex items-center justify-center w-10 h-10">
                                        <div className={`absolute inset-0 rounded-full opacity-30 ${isUnlocked ? 'animate-ping' : ''}`} style={tier.colorHex.startsWith('#') ? { backgroundColor: tier.colorHex } : undefined}></div>
                                        <div 
                                          className={`w-8 h-8 rounded-full border border-black/50 shadow-inner flex items-center justify-center ${!isUnlocked ? 'grayscale opacity-60' : ''}`}
                                          style={tier.colorHex.startsWith('#') ? { backgroundColor: tier.colorHex, boxShadow: `0 0 10px ${tier.colorHex}` } : { background: 'linear-gradient(to right, #a855f7, #ec4899, #eab308)' }}
                                        >
                                          {!isUnlocked && <span className="text-white drop-shadow-md text-[10px]">🔒</span>}
                                        </div>
                                      </div>

                                      <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex justify-between items-center w-full gap-2">
                                          <span 
                                            className={`text-[12px] font-bold uppercase tracking-wider truncate ${!isUnlocked ? 'text-neutral-400' : ''}`} 
                                          >
                                            <span className={isUnlocked && (tier.textColor.includes('text-') || tier.textColor.includes('bg-')) ? tier.textColor : ''} style={!tier.textColor.includes('text') && !tier.textColor.includes('bg-') && isUnlocked ? { color: tier.colorHex } : undefined}>
                                              {formData.displayName || profile?.displayName || tier.rank}
                                            </span>
                                          </span>
                                          {isSelected && (
                                            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-portal text-void font-bold shrink-0">
                                              Equipped
                                            </span>
                                          )}
                                        </div>
                                        
                                        <span className="text-[10px] text-neutral-300 font-serif italic mt-0.5 truncate">
                                          "{tier.rewardFeeling}"
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Detailed Description Footer */}
                                    <div className="flex items-center justify-between w-full pt-2 border-t border-white/5 z-10">
                                      <span className={`text-[9px] font-mono tracking-tighter uppercase ${!isUnlocked ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                        Aura: {tier.name}
                                      </span>
                                      {!isUnlocked ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-neutral-500 font-mono shrink-0">
                                            {currentXp} / {tier.unlockedAt} Qi
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-portal/70 font-mono">
                                          Unlocked
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Transcendent Custom spectrum input - only active for Dao Master */}
                            {(() => {
                              const currentXp = profile?.dao_xp || profile?.qi || 0;
                              const isDaoMaster = currentXp >= 25000;
                              const isCustomSelected = !AURA_TIERS.some(t => t.colorHex === formData.displayNameColor);
                              
                              return (
                                <div className={`pt-2.5 border-t border-neutral-900 flex flex-col gap-2 ${isDaoMaster ? '' : 'opacity-40'}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold">
                                      Transcendent Custom Spectrum
                                    </span>
                                    {!isDaoMaster && (
                                      <span className="text-[8px] bg-neutral-900 text-neutral-500 px-2 py-0.5 rounded border border-neutral-850">
                                        Requires Dao Master (25k Qi)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <button
                                        type="button"
                                        disabled={!isDaoMaster}
                                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                                          if (isDaoMaster) {
                                            colorInputRef.current?.click();
                                          }
                                        }}
                                        className={`w-9 h-9 rounded-full border transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative bg-gradient-to-tr from-red-500 via-green-500 via-blue-500 to-yellow-500 ${
                                          isCustomSelected ? 'border-portal scale-110 ring-2 ring-portal/30' : 'border-neutral-800'
                                        }`}
                                        title={isDaoMaster ? "Custom Color Spectrum..." : "Locked until Dao Master"}
                                      >
                                        {isCustomSelected && (
                                          <span className="w-2.5 h-2.5 rounded-full border border-black bg-white" style={{ backgroundColor: formData.displayNameColor }}></span>
                                        )}
                                      </button>
                                      <input 
                                        ref={colorInputRef}
                                        type="color" 
                                        name="displayNameColor"
                                        disabled={!isDaoMaster}
                                        value={isCustomSelected && formData.displayNameColor ? formData.displayNameColor : '#00FFFF'}
                                        onChange={handleChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0 pointer-events-none"
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-mono text-neutral-400">
                                        Hex Code: <span className="uppercase font-bold" style={isCustomSelected ? { color: formData.displayNameColor } : undefined}>{formData.displayNameColor || '#FAFAFA'}</span>
                                      </span>
                                      <span className="text-[8px] text-neutral-600 font-sans italic">
                                        {isDaoMaster ? "Click sphere to define your custom frequency" : "Transcend normal UI limits"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-black/30 border border-neutral-900/50 p-3.5 rounded-lg">
                          <div className="text-lg font-serif italic flex items-center">
                            {(() => {
                              const styleObj = getAuraTextStyle(auraColor, profile?.activeStatusEffects);
                              return (
                                <span className={styleObj.className} style={styleObj.style}>
                                  {profile?.displayName || 'Unknown Ascendant'}
                                </span>
                              );
                            })()}
                          </div>
                          {profile?.displayNameColor && (
                            <div className="flex items-center gap-1.5">
                              {!profile.displayNameColor.startsWith('#') ? (
                                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-purple-500 to-yellow-500 animate-pulse"></div>
                              ) : (
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: profile.displayNameColor }}></div>
                              )}
                              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600">{profile.displayNameColor}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><Calendar size={14} className="text-neutral-400" /></div>
                    <span className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Ascent Commenced</span>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-sans tracking-wide">{safeFormatDate(profile?.joinedDate || Date.now())}</div>
                </div>
                
                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><BookOpen size={14} className="text-portal" /></div>
                    <span className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Scrolls Accumulated</span>
                  </div>
                  <div className="text-[11px] text-portal font-sans font-black tracking-widest uppercase">
                    {activeStoriesCount} Realms
                  </div>
                </div>

                {/* Dao Pillar (Daily Streak) */}
                <div className={`bg-[#030303] border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:col-span-2 relative overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.03)] border-l-4 ${isCracked ? 'border-human/40 border-l-human/80 border-t-human/20 border-r-human/20 border-b-human/20' : 'border-l-orange-500/40 border-neutral-900'}`}>
                  {isCracked && (
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PGxpbmUgeDE9IjAiIHkxPSIwIiB4Mj0iODAiIHkyPSI4MCIgc3Ryb2tlPSIjZmY0NDQ0MjAiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none mix-blend-overlay"></div>
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`p-2.5 rounded-lg border ${isCracked ? 'bg-human/10 border-human/30' : 'bg-orange-500/10 border-orange-500/20'}`}>
                      <Flame size={18} className={`${isCracked ? 'text-human animate-bounce' : 'text-orange-500 animate-pulse'}`} />
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-widest font-sc block ${isCracked ? 'text-human' : 'text-neutral-500'}`}>
                        {isCracked ? 'Dao Pillar Cracked!' : 'Daily Dao Pillar'}
                      </span>
                      <div className={`text-2xl font-black font-sans tracking-wide ${isCracked ? 'text-human opacity-50 line-through' : 'text-orange-500'}`}>
                        {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end justify-center text-xs text-neutral-400 font-mono space-y-2 relative z-10">
                    {isCracked ? (
                      <button
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleRepairPillar}
                        className="px-4 py-2 bg-human/20 hover:bg-human/30 text-human font-bold text-[10px] font-sc uppercase tracking-widest border border-human/50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Zap size={12} className="text-human" />
                        Repair Pillar (50 Qi)
                      </button>
                    ) : (
                      <div className="flex flex-col items-start sm:items-end gap-2.5">
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-[10px] text-orange-400 font-sc uppercase tracking-wider">
                            {daysTo3} {daysTo3 === 1 ? 'day' : 'days'} to +20 Qi
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 font-sc uppercase tracking-wider">
                            {daysTo10} {daysTo10 === 1 ? 'day' : 'days'} to +100 Qi
                          </span>
                        </div>
                        
                        {(() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const hasCheckedInToday = profile?.lastReadDate === todayStr;
                          return hasCheckedInToday ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-sc uppercase tracking-wider rounded-lg">
                              <Sparkles size={11} className="text-green-400 animate-pulse" />
                              Refinement Complete Today (+5 Qi)
                            </div>
                          ) : (
                            <button
                              onClick={handleCheckIn}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-sc uppercase font-black text-[10px] tracking-widest rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-orange-400/30"
                            >
                              <Flame size={12} className="animate-pulse text-black" />
                              Refine Daily Dao
                            </button>
                          );
                        })()}

                        {profile?.lastReadDate ? (
                          <span className="text-[10px] text-neutral-500">
                            Last Refined: <span className="text-neutral-300">{profile.lastReadDate}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 italic">Click Refine Daily Dao to establish your pillar.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Status Effects */}
              {(profile?.activeStatusEffects && profile.activeStatusEffects.length > 0) && (
                <div className="pt-10 border-t border-neutral-900/50 mt-10">
                  <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
                    <Flame size={14} className="text-human" />
                    Active Status Effects
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.activeStatusEffects.map(effect => {
                      const isDebuff = ["Curse", "Affliction"].includes(effect.effectDef.type);
                      const colorClass = isDebuff ? "border-human/30 bg-human/5 text-human" : "border-portal/30 bg-portal/5 text-portal";
                      
                      return (
                        <div key={effect.id} className={`p-4 rounded-xl border ${colorClass} flex flex-col gap-3 relative overflow-hidden group`}>
                          {isDebuff && <div className="absolute inset-0 bg-gradient-to-t from-human/10 to-transparent pointer-events-none opacity-50" />}
                          {!isDebuff && <div className="absolute inset-0 bg-gradient-to-t from-portal/10 to-transparent pointer-events-none opacity-50" />}
                          
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <h4 className="font-sc font-bold uppercase tracking-wider text-sm">{effect.effectDef.name}</h4>
                              <p className="text-[10px] font-mono opacity-80 mt-1">{effect.effectDef.type} • {effect.effectDef.scope}</p>
                            </div>
                            <div className="px-2 py-1 bg-black/40 border border-current rounded text-[9px] uppercase tracking-widest font-bold">
                              {Math.round(effect.effectDef.durationMs / (60 * 60 * 1000))}h
                            </div>
                          </div>
                          
                          <p className="text-xs font-serif opacity-90 z-10 leading-relaxed">
                            {effect.effectDef.description}
                          </p>
                          
                          {effect.effectDef.visual && (
                            <p className="text-[10px] opacity-75 font-sans italic z-10">
                              Visual: {effect.effectDef.visual}
                            </p>
                          )}
                          
                          {effect.progress !== undefined && effect.targetProgress !== undefined && !effect.completedAt && (
                            <div className="z-10 mt-1 space-y-1">
                              <div className="flex justify-between text-[10px] font-mono opacity-80">
                                <span>Challenge Progress: {effect.progress} / {effect.targetProgress} Qi</span>
                                <span>{Math.round((effect.progress / effect.targetProgress) * 100)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-current/10">
                                <div 
                                  className={`h-full ${isDebuff ? 'bg-human' : 'bg-portal'} transition-all duration-500`}
                                  style={{ width: `${Math.min(100, (effect.progress / effect.targetProgress) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {effect.completedAt && (
                            <div className="z-10 mt-1 flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-950/20 px-2 py-1 border border-green-500/30 rounded w-fit">
                              <Sparkles size={12} className="text-green-400" />
                              REWARD UNLOCKED • COMPLETED!
                            </div>
                          )}

                          {(effect.effectDef.counterplay || effect.effectDef.rewardHook) && (
                            <div className="mt-2 pt-2 border-t border-current/20 z-10 space-y-2">
                              {effect.effectDef.counterplay && (
                                <div className="flex gap-2 items-start text-[10px]">
                                  <Shield size={12} className="shrink-0 mt-0.5 opacity-80" />
                                  <span className="font-sans leading-relaxed">{effect.effectDef.counterplay}</span>
                                </div>
                              )}
                              {effect.effectDef.rewardHook && (
                                <div className="flex gap-2 items-start text-[10px]">
                                  <Sparkles size={12} className="shrink-0 mt-0.5 opacity-80" />
                                  <span className="font-sans leading-relaxed text-amber-400/90">{effect.effectDef.rewardHook}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cosmic Inventory Section */}
              <UserProfileInventoryPanel profile={profile} handleAttuneArtifact={handleAttuneArtifact} />

              {/* Own Stories Section */}
              <UserProfileStoriesPanel profile={profile} currentUser={currentUser} stories={stories} />

              <div className="pt-8 flex gap-4 min-h-[40px] mt-8">
                {isEditing ? (
                  <>
                    <button 
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleSave} 
                      disabled={isLoading}
                      className="px-8 py-2.5 bg-portal border border-portal text-void font-bold uppercase text-[11px] tracking-widest rounded-full hover:bg-portal/90 shadow-[0_0_15px_rgba(4,172,255,0.3)] transition-all flex items-center gap-2"
                    >
                      <Save size={14} /> Guard Changes
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setFormData(profile || {}); }} 
                      className="px-8 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 font-bold uppercase text-[11px] tracking-widest rounded-full hover:text-signal hover:border-neutral-500 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-8 py-2.5 bg-transparent border border-neutral-700 text-neutral-300 font-bold uppercase text-[11px] tracking-widest rounded-full hover:border-portal hover:text-portal transition-all flex items-center gap-2"
                  >
                    Modify Identity
                  </button>
                )}
              </div>
            </>
          )}

      {/* Divine Mirror of the Soul Modal */}
      {showPortraitModal && (
        <UserProfilePortraitModal
          showPortraitModal={showPortraitModal}
          setShowPortraitModal={setShowPortraitModal}
          portraitUploadFile={portraitUploadFile}
          setPortraitUploadFile={setPortraitUploadFile}
          portraitUploadBase64={portraitUploadBase64}
          setPortraitUploadBase64={setPortraitUploadBase64}
          portraitDesc={portraitDesc}
          setPortraitDesc={setPortraitDesc}
          isGeneratingPortrait={isGeneratingPortrait}
          isSavingPortrait={isSavingPortrait}
          portraitError={portraitError}
          generatedPortraitUrl={generatedPortraitUrl}
          generationStep={generationStep}
          handleGeneratePortrait={handleGeneratePortrait}
          handleApplyPortrait={handleApplyPortrait}
          daoData={daoData}
          equippedArtifact={equippedArtifact}
          profile={profile}
        />
      )}

          {/* Settings & boring things at the very bottom! */}
          <UserProfileSettingsPanel 
            syncStatus={syncStatus}
            lastSavedTime={lastSavedTime}
            formData={formData}
            profile={profile}
            handleLanguageChangeDirect={handleLanguageChangeDirect}
            handleDefaultChapterWritingStyleChange={handleDefaultChapterWritingStyleChange}
            isSavingChapterWritingStyle={isSavingChapterWritingStyle}
          />
        </div>
      </div>

      {pendingLanguageChange && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#030303] border border-portal/50 shadow-[0_0_30px_rgba(4,172,255,0.2)] rounded-2xl max-w-sm w-full p-6 text-center animate-fadeIn">
            <Globe size={32} className="text-portal mx-auto mb-4" />
            <h3 className="text-lg font-sc font-bold uppercase tracking-widest text-portal mb-2">Confirm Language Change</h3>
            <p className="text-sm font-sans text-neutral-400 mb-6 leading-relaxed">
              Are you able to read the interface and content in your newly selected language?<br/>
              It will revert automatically in <span className="text-signal font-mono font-bold text-lg">{countdown}</span> seconds.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmLanguageChange}
                className="w-full py-3 bg-portal text-void font-bold uppercase text-xs tracking-widest rounded-xl shadow-[0_0_15px_rgba(4,172,255,0.4)] hover:bg-portal/90 transition-all"
              >
                Yes, Keep Changes
              </button>
              <button 
                onClick={revertLanguageChange}
                className="w-full py-3 bg-transparent border border-neutral-800 text-neutral-400 font-bold uppercase text-xs tracking-widest rounded-xl hover:text-signal hover:border-neutral-600 transition-all"
              >
                No, Revert Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
