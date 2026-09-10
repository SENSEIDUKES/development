import React from 'react';
import { AdminStoryRow, UserProfile as UserProfileType } from '../shared/types';
import { Shield, RefreshCw, Search, Flame } from 'lucide-react';

interface UserProfileAdminPanelProps {
  profile: UserProfileType | null;
  currentUser: { uid: string } | null;
  allUsers: UserProfileType[];
  allStories: AdminStoryRow[];
  adminSearchQuery: string;
  setAdminSearchQuery: (query: string) => void;
  adminTab: 'users' | 'stories';
  setAdminTab: (tab: 'users' | 'stories') => void;
  isFetchingAdminData: boolean;
  fetchAdminData: () => void;
  adminError: string;
  handleUpdateUserTier: (uid: string, tier: "mortal" | "outer_sect" | "inner_sect" | "sect_master" | "immortal") => void;
  handleUpdateUserRole: (uid: string, role: 'owner' | 'admin' | 'user') => void;
  handleDeleteStoryAdmin: (storyId: string) => void;
}

// Performance Optimization: Cache Intl.DateTimeFormat at module level to avoid costly recreation during render loops
const dateFormatter = new Intl.DateTimeFormat();
const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Unknown' : dateFormatter.format(d);
};

export function UserProfileAdminPanel({
  profile,
  currentUser,
  allUsers,
  allStories,
  adminSearchQuery,
  setAdminSearchQuery,
  adminTab,
  setAdminTab,
  isFetchingAdminData,
  fetchAdminData,
  adminError,
  handleUpdateUserTier,
  handleUpdateUserRole,
  handleDeleteStoryAdmin
}: UserProfileAdminPanelProps) {
  const filteredUsers = allUsers.filter(u => {
    const query = adminSearchQuery.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(query) ||
      (u.displayName || '').toLowerCase().includes(query) ||
      (u.uid || '').toLowerCase().includes(query)
    );
  });

  const filteredStories = allStories.filter(s => {
    const query = adminSearchQuery.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(query) ||
      (s.genre || '').toLowerCase().includes(query) ||
      (s.mcName || '').toLowerCase().includes(query) ||
      (s.id || '').toLowerCase().includes(query) ||
      (s.userId || '').toLowerCase().includes(query)
    );
  });

  const isOwnerUser = profile?.role === 'owner';

  return (
    <div className="space-y-8 animate-fadeIn motion-reduce:animate-none">
      {/* Admin Header */}
      <div className="border-b border-neutral-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="min-w-0 break-words text-2xl font-sc font-bold uppercase tracking-wider text-signal flex items-center gap-2">
            <Shield aria-hidden="true" className="shrink-0 text-human" size={22} />
            Akashic Records Control Switchboard
          </h3>
          <p className="mt-1.5 max-w-xl break-words font-serif text-xs leading-relaxed text-neutral-400">
            Authorized access as <span className="text-human font-bold uppercase">{profile?.role}</span>. Purple & Crimson vectors signify high-potency write authority.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAdminData}
          disabled={isFetchingAdminData}
          className="self-start md:self-auto min-h-11 px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-signal hover:border-neutral-600 rounded-xl text-xs font-sc font-bold uppercase tracking-widest transition-all motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" size={12} className={isFetchingAdminData ? 'animate-spin motion-reduce:animate-none' : ''} />
          Recalibrate
        </button>
      </div>

      {adminError && (
        <div role="alert" className="p-4 bg-human/10 border border-human/30 text-human text-xs font-mono rounded-xl">
          [ERROR_SIGNAL]: {adminError}
        </div>
      )}

      {/* Directory/Chronicle Switcher */}
      <div role="group" aria-label="Akashic record view" className="flex flex-wrap border-b border-neutral-900 gap-x-6 gap-y-1">
        <button
          type="button"
          aria-pressed={adminTab === 'users'}
          onClick={() => { setAdminTab('users'); setAdminSearchQuery(''); }}
          className={`min-h-11 max-w-full px-1 pb-3 text-xs font-sc font-bold uppercase tracking-widest border-b-2 cursor-pointer transition-all motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] ${
            adminTab === 'users'
              ? 'border-portal text-portal font-black'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          User Directory ({allUsers.length})
        </button>
        <button
          type="button"
          aria-pressed={adminTab === 'stories'}
          onClick={() => { setAdminTab('stories'); setAdminSearchQuery(''); }}
          className={`min-h-11 max-w-full px-1 pb-3 text-xs font-sc font-bold uppercase tracking-widest border-b-2 cursor-pointer transition-all motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] ${
            adminTab === 'stories'
              ? 'border-human text-human font-black'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Novel Chronicles ({allStories.length})
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search aria-hidden="true" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          aria-label={adminTab === 'users' ? 'Search users' : 'Search stories'}
          placeholder={adminTab === 'users' ? "Search users by name, username, or ID..." : "Search stories by title, MC name, genre, or ID..."}
          value={adminSearchQuery}
          onChange={(e) => setAdminSearchQuery(e.target.value)}
          className="min-h-11 w-full pl-11 pr-4 py-3 bg-neutral-950/80 border border-neutral-900 rounded-xl text-xs font-sans text-signal placeholder-neutral-400 focus:outline-none focus-visible:border-portal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] transition-all motion-reduce:transition-none"
        />
      </div>

      {isFetchingAdminData ? (
        <div role="status" aria-live="polite" className="py-20 flex flex-col items-center justify-center space-y-4">
          <RefreshCw aria-hidden="true" size={36} className="text-portal animate-spin motion-reduce:animate-none" />
          <span className="font-sc text-xs tracking-widest uppercase text-neutral-400">Accessing Akashic Nodes...</span>
        </div>
      ) : adminTab === 'users' ? (
        /* USERS MANAGEMENT */
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 font-serif text-sm">
              No matched entities found in this sector.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelf = u.uid === currentUser?.uid;
              return (
                <div key={u.uid} className="bg-[#050505] border border-neutral-900 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-neutral-800 transition-all motion-reduce:transition-none">
                  {/* Left: User stats */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                      <span className="min-w-0 break-words font-display text-lg text-signal">{u.displayName || u.username || 'Anonymous Entity'}</span>
                      {isSelf && (
                        <span className="px-2 py-0.5 bg-portal/10 text-portal text-[9px] font-mono rounded uppercase">You</span>
                      )}
                      <span className={`px-2 py-0.5 text-[9px] font-mono rounded uppercase ${
                        u.role === 'owner' ? 'bg-human/20 text-human border border-human/30' :
                        u.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        'bg-neutral-900 text-neutral-400'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </div>
                    <div className="break-all font-mono text-[10px] text-neutral-400 space-y-0.5">
                      <p>ID: {u.uid}</p>
                      <p>Username: @{u.username}</p>
                      <p>Linked Date: {safeFormatDate(u.joinedDate)}</p>
                      <p>Premium Rank: <span className="text-signal uppercase">{u.premiumTier || 'mortal'}</span></p>
                    </div>
                  </div>

                  {/* Right: Write commands */}
                  <div className="flex min-w-0 shrink-0 flex-col gap-4 sm:flex-row lg:items-center">
                    {/* Premium Tier Selector */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-sc uppercase tracking-wider text-neutral-400 block">Premium Rank Override</span>
                      <div role="group" aria-label={`Premium Rank Override for ${u.displayName || u.username || 'user'}`} className="flex flex-wrap bg-neutral-950 border border-neutral-900 rounded-lg p-0.5 gap-0.5">
                        {(['mortal', 'outer_sect', 'inner_sect', 'sect_master', 'immortal'] as const).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            disabled={!isOwnerUser}
                            aria-pressed={u.premiumTier === tier}
                            onClick={() => handleUpdateUserTier(u.uid, tier)}
                            className={`min-h-11 px-2 py-1 text-[9px] font-mono rounded transition-all motion-reduce:transition-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:cursor-not-allowed disabled:opacity-50 ${
                              u.premiumTier === tier
                                ? 'bg-portal/15 text-portal font-bold'
                                : isOwnerUser ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-700'
                            }`}
                          >
                            {tier === 'outer_sect' ? 'Outer' : tier === 'inner_sect' ? 'Inner' : tier === 'sect_master' ? 'Master' : tier === 'immortal' ? 'Immortal' : tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Role Selector */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-sc uppercase tracking-wider text-neutral-400 block">Permission Sector</span>
                      <div role="group" aria-label={`Permission Sector for ${u.displayName || u.username || 'user'}`} className="flex flex-wrap bg-neutral-950 border border-neutral-900 rounded-lg p-0.5 gap-1">
                        {(['user', 'admin', 'owner'] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            disabled={!isOwnerUser || isSelf}
                            aria-pressed={u.role === role}
                            onClick={() => handleUpdateUserRole(u.uid, role)}
                            className={`min-h-11 px-2.5 py-1 text-[9px] font-sc uppercase tracking-widest rounded transition-all motion-reduce:transition-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff] disabled:cursor-not-allowed disabled:opacity-50 ${
                              u.role === role
                                ? role === 'owner' ? 'bg-human text-signal font-bold' :
                                  role === 'admin' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold' :
                                  'bg-neutral-800 text-neutral-300 font-bold'
                                : (isOwnerUser && !isSelf) ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-800'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* STORIES MANAGEMENT */
        <div className="space-y-4">
          {filteredStories.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 font-serif text-sm">
              No novel matrix configurations found.
            </div>
          ) : (
            filteredStories.map((s) => (
              <div key={s.id} className="bg-[#050505] border border-neutral-900 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-neutral-800 transition-all motion-reduce:transition-none">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words font-display text-lg text-signal">{s.title || 'Untitled Chronicle'}</span>
                    <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-[9px] font-mono rounded">{s.genre}</span>
                    {s.deleted && (
                      <span className="px-2 py-0.5 bg-human/20 text-human text-[9px] font-mono rounded uppercase">Deleted (Soft)</span>
                    )}
                  </div>
                  <div className="break-all font-mono text-[10px] text-neutral-400 space-y-0.5">
                    <p>Story ID: {s.id}</p>
                    <p>Author ID: {s.userId}</p>
                    <p>Principal Cultivator: <span className="text-signal">{s.mcName}</span></p>
                    <p>Scroll Count: <span className="text-portal font-bold">{s.currentChapterNumber || 0} chapters</span></p>
                    <p>Evolving Since: {safeFormatDate(s.createdAt)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Purge Matrix for ${s.title || 'Untitled Chronicle'}`}
                  onClick={() => handleDeleteStoryAdmin(s.id)}
                  className="self-start sm:self-auto min-h-11 shrink-0 bg-transparent hover:bg-human/15 border border-human/30 hover:border-human text-human hover:text-signal rounded-xl px-4 py-2.5 transition-all motion-reduce:transition-none font-sc text-[10px] uppercase font-bold tracking-widest cursor-pointer flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff]"
                >
                  <Flame aria-hidden="true" size={12} />
                  Purge Matrix
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
