import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Mail } from 'lucide-react';
import { mockLogin, useAppStore } from '../shared/stubs';

/**
 * Story Authentication gate for CreationModal's
 * signed-out screen. A full-screen cinematic takeover: the living wuxia
 * backdrop dominates while a nearly invisible glass shell floats the
 * sign-in actions over it.
 *
 * Workshop boundary: every provider resolves through `mockLogin()` (the
 * same stub CreationModal's old `handleLogin` used) after a short simulated
 * delay, so loading states are inspectable without real auth. On transfer
 * back to Light-Novels, swap the stub import for `firebase/auth` +
 * `lib/firebase` and replace `mockLogin()` with the real provider calls
 * (`signInWithPopup` for Google/Apple, email/password for Email) — the
 * error mapping below is written against Firebase Auth error codes and is
 * dormant here because the mock never fails.
 */

/**
 * Time (ms) the gate lingers after sign-in so the shell can dissolve while
 * the world is still visible. CreationModal keeps the gate mounted this
 * long before revealing the intake.
 */
export const STORY_AUTH_DISSOLVE_MS = 900;

const BACKDROP_VIDEO_URL =
  'https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/videos/VIDEO/Library%20Auth%20(Backdrop%20Video).mp4';
const BACKDROP_IMAGE_URL = '/story-seed/library-auth-backdrop.jpg';
const CELESTIAL_LIBRARY_EMBLEM_URL = '/favicon.jpg';

interface StorySeedNetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
}

type NavigatorWithConnection = Navigator & {
  connection?: StorySeedNetworkInformation;
};

const canLoadCinematicBackdrop = () => {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as NavigatorWithConnection).connection;
  return !connection?.saveData
    && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
};

type AuthProviderId = 'google' | 'apple' | 'email';
type EmailMode = 'signin' | 'create';

/** Firebase Auth code → calm copy. Dormant in the Workshop (mockLogin never rejects). */
const mapAuthError = (error: unknown): string | null => {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not available yet.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Those credentials did not match our records.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Sign in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (6+ characters).';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'Sign-in was interrupted. Please try again.';
  }
};

const Spinner = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full"
  />
);

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
    />
  </svg>
);

const AppleMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.029 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702" />
  </svg>
);

const PROVIDER_BUTTON_BASE =
  'w-full min-h-[48px] h-12 rounded-xl flex items-center justify-center gap-3 font-display text-[0.95rem] transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 focus-visible:ring-offset-0 disabled:opacity-60 disabled:pointer-events-none';

/** Simulated provider round-trip so pending/loading states are inspectable. */
const simulateProviderDelay = () => new Promise<void>(resolve => setTimeout(resolve, 650));

export default function StoryAuthGate() {
  const currentUser = useAppStore(state => state.currentUser);
  const prefersReducedMotion = useReducedMotion();
  const [videoReady, setVideoReady] = useState(false);
  const [videoAllowed, setVideoAllowed] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<AuthProviderId | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // The gate stays mounted briefly after sign-in (CreationModal holds it for
  // STORY_AUTH_DISSOLVE_MS) so the shell can dissolve over the still-visible
  // world instead of vanishing instantly.
  useEffect(() => {
    if (currentUser) setDissolving(true);
  }, [currentUser]);

  // Let the local poster paint first, and keep the 14 MB cinematic backdrop
  // off reduced-motion, data-saver, and constrained mobile connections. A
  // connection change tears the video down promptly instead of continuing a
  // download that is no longer appropriate for the device.
  useEffect(() => {
    if (prefersReducedMotion) {
      setVideoReady(false);
      setVideoAllowed(false);
      return;
    }

    const connection = typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithConnection).connection;
    let deferredStart: number | undefined;

    const updateVideoAllowance = () => {
      if (deferredStart !== undefined) window.clearTimeout(deferredStart);
      setVideoReady(false);
      if (!canLoadCinematicBackdrop()) {
        setVideoAllowed(false);
        return;
      }

      deferredStart = window.setTimeout(() => setVideoAllowed(true), 180);
    };

    updateVideoAllowance();
    connection?.addEventListener('change', updateVideoAllowance);
    return () => {
      if (deferredStart !== undefined) window.clearTimeout(deferredStart);
      connection?.removeEventListener('change', updateVideoAllowance);
    };
  }, [prefersReducedMotion]);

  const runSignIn = async (provider: AuthProviderId, action: () => Promise<unknown>) => {
    setAuthError(null);
    setPendingProvider(provider);
    try {
      await action();
    } catch (error) {
      console.error('Story gate sign-in failed:', error);
      setAuthError(mapAuthError(error));
    } finally {
      setPendingProvider(null);
    }
  };

  const handleProviderSignIn = (provider: Exclude<AuthProviderId, 'email'>) => {
    void runSignIn(provider, async () => {
      await simulateProviderDelay();
      await mockLogin();
    });
  };

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return; // native `required` attributes guide the guest
    void runSignIn('email', async () => {
      await simulateProviderDelay();
      await mockLogin();
    });
  };

  const isBusy = pendingProvider !== null;

  const shellInitial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 };
  const shellAnimate = dissolving
    ? prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.97, y: 8 }
    : prefersReducedMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, scale: 1 };
  const shellTransition = dissolving
    ? { duration: prefersReducedMotion ? 0 : 0.55, ease: 'easeInOut' as const }
    : { duration: 0.5, ease: 'easeOut' as const };

  return (
    <div
      id="creation-portal-root"
      role="dialog"
      aria-modal="true"
      aria-label="Your Destiny Awaits — sign in"
      className="story-seed-development-surface absolute inset-0 z-50 overflow-hidden bg-black"
    >{/* TRANSFER NOTE: `absolute` → `fixed` when moved to Light-Novels. The
      Workshop scopes the takeover to the preview canvas (FeatureWorkspace's
      positioned pane) so it never collides with the Workshop controls that
      float at z-[200]; production wants the full-viewport `fixed` takeover. */}
      {/* Layer 1: static poster, always present so the world never flashes black */}
      <img
        src={BACKDROP_IMAGE_URL}
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover object-[62%_40%] select-none pointer-events-none"
      />

      {/* Layer 2: motion backdrop, fades in only once it is actually playing */}
      {videoAllowed && (
        <video
          src={BACKDROP_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={BACKDROP_IMAGE_URL}
          tabIndex={-1}
          aria-hidden="true"
          onPlaying={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
          className={`absolute inset-0 w-full h-full object-cover object-[62%_40%] select-none pointer-events-none transition-opacity duration-[1200ms] ease-in-out ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Layer 3: local readability pocket behind the shell — the world stays vivid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 62% 58% at 50% 54%, rgba(2,6,14,0.55) 0%, rgba(2,6,14,0.30) 48%, rgba(2,6,14,0) 74%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-full flex-col items-center justify-center [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)] [padding-left:max(1.25rem,env(safe-area-inset-left))] [padding-right:max(1.25rem,env(safe-area-inset-right))]">
        <motion.div
          initial={shellInitial}
          animate={shellAnimate}
          transition={shellTransition}
          className="w-full max-w-sm sm:max-w-md lg:mt-[6vh] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl px-6 py-8 sm:px-9 sm:py-10 bg-[linear-gradient(165deg,rgba(10,18,32,0.38),rgba(3,6,12,0.46))] backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] border border-[rgba(148,196,255,0.22)] shadow-[0_18px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(180,220,255,0.12)]"
        >
          <div className="flex flex-col items-center text-center gap-5">
            <img
              src={CELESTIAL_LIBRARY_EMBLEM_URL}
              alt="Celestial Library"
              width={56}
              height={56}
              decoding="async"
              className="h-14 w-14 rounded-full object-cover ring-1 ring-[#D4AF37]/45 shadow-[0_0_24px_rgba(212,175,55,0.25)]"
            />

            <h1 className="font-display font-bold text-signal text-4xl sm:text-[2.6rem] leading-tight tracking-tight [text-shadow:0_1px_12px_rgba(0,0,0,0.55)]">
              Your Destiny Awaits
            </h1>

            <p className="font-sans font-light text-neutral-300 text-sm sm:text-[0.95rem] leading-relaxed max-w-[34ch] mx-auto [text-shadow:0_1px_12px_rgba(0,0,0,0.55)]">
              Sign in to preserve this world, begin its first chapter, and return to it from any device.
            </p>

            <div className="flex items-center justify-center gap-3 opacity-70" aria-hidden="true">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
              <span className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]/70" />
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
            </div>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => handleProviderSignIn('google')}
                disabled={isBusy}
                className={`${PROVIDER_BUTTON_BASE} bg-white/85 hover:bg-white/95 text-neutral-900 border border-white/40`}
              >
                {pendingProvider === 'google' ? <Spinner /> : <GoogleMark />}
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSignIn('apple')}
                disabled={isBusy}
                className={`${PROVIDER_BUTTON_BASE} bg-black/85 hover:bg-black text-white border border-white/25`}
              >
                {pendingProvider === 'apple' ? <Spinner /> : <AppleMark />}
                <span>Continue with Apple</span>
              </button>

              <button
                type="button"
                onClick={() => setEmailOpen(open => !open)}
                disabled={isBusy}
                aria-expanded={emailOpen}
                className={`${PROVIDER_BUTTON_BASE} bg-white/10 hover:bg-white/15 text-signal border border-white/25`}
              >
                {pendingProvider === 'email' ? <Spinner /> : <Mail size={18} className="text-gold-accent" />}
                <span>Continue with Email</span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {emailOpen && (
                <motion.div
                  key="story-auth-email-form"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
                  className="w-full overflow-hidden"
                >
                  <form onSubmit={handleEmailSubmit} className="w-full space-y-3 pt-1">
                    <div>
                      <label htmlFor="story-auth-email" className="sr-only">
                        Email address
                      </label>
                      <input
                        id="story-auth-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        placeholder="Email"
                        className="w-full bg-white/[0.05] border-b border-white/20 focus:border-portal/60 rounded-t-md px-3 py-2.5 text-base text-signal placeholder:text-neutral-400 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="story-auth-password" className="sr-only">
                        Password
                      </label>
                      <input
                        id="story-auth-password"
                        type="password"
                        autoComplete={emailMode === 'signin' ? 'current-password' : 'new-password'}
                        required
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        placeholder="Password"
                        className="w-full bg-white/[0.05] border-b border-white/20 focus:border-portal/60 rounded-t-md px-3 py-2.5 text-base text-signal placeholder:text-neutral-400 outline-none transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="w-full min-h-[44px] rounded-lg bg-white/10 hover:bg-white/15 border border-white/25 text-signal font-display text-[0.95rem] transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 focus-visible:ring-offset-0 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3"
                    >
                      {pendingProvider === 'email' && <Spinner />}
                      <span>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailMode(mode => (mode === 'signin' ? 'create' : 'signin'))}
                      className="w-full text-center font-sans text-xs text-neutral-400 hover:text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 rounded"
                    >
                      {emailMode === 'signin'
                        ? 'New to the Celestial Library? Create an account'
                        : 'Already have an account? Sign in'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {authError && (
              <p role="alert" className="text-center text-xs text-red-300">
                {authError}
              </p>
            )}

            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-white/15" aria-hidden="true" />
              <p className="font-sans text-xs text-neutral-400">Your Story Seed will not be lost.</p>
              <span className="h-px w-8 bg-white/15" aria-hidden="true" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
