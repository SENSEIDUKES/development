import { createPortal } from 'react-dom';
import { LibraryLook } from '@seihouse/library/presentation';
import { StoryAuthGate } from '@seihouse/library/story-seed';

/**
 * Sign in, from the Profile Portrait's menu. The app has no accounts yet, so
 * the Library's sign-in screen opens with its buttons switched off and says
 * so: nothing is typed into a form that goes nowhere. Accounts plug in here.
 */
export function AppSignIn({ accentColor, onClose }: { accentColor?: string; onClose: () => void }) {
  return createPortal(<LibraryLook accentColor={accentColor} className="fixed inset-0 z-[120]" data-testid="novel-expanded-sign-in">
    <StoryAuthGate context="spirit-link" onClose={onClose}
      description="Sign in to keep your stories, Familiars and progress, and return to them from any device."
      unavailableNote="Accounts are coming. Sign-in is not connected yet, so nothing is sent."
      reassurance="Your stories stay saved on this device." />
  </LibraryLook>, document.body);
}
