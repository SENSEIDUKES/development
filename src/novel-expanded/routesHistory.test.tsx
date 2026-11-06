// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HOME_ROUTE, canGoBack, goBack, historyDepth, useAppRoute, type Navigate } from './routes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { window.history.replaceState(null, '', '/app/'); vi.restoreAllMocks(); });

/** The app's own navigate, as the app holds it. */
function appNavigate(): Navigate {
  let navigate: Navigate | undefined;
  const Probe = () => { navigate = useAppRoute()[1]; return null; };
  act(() => { createRoot(document.createElement('div')).render(<Probe />); });
  return (route, options) => act(() => { navigate!(route, options); });
}

describe('"Take me back", through the app\'s own history', () => {
  it('counts the app\'s screens, so Back returns to the last one and never leaves the app', () => {
    window.history.replaceState(null, '', '/app/');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const navigate = appNavigate();
    expect(historyDepth()).toBe(0);
    // Opened on Home with nothing behind: nowhere to go back to.
    expect(canGoBack(true)).toBe(false);
    navigate({ page: 'profile' });
    expect(historyDepth()).toBe(1);
    navigate({ page: 'profile', cave: '/settings' });
    expect(historyDepth()).toBe(2);
    // Replacing a screen is not one more behind it.
    navigate({ page: 'profile', cave: '/home/store' }, { replace: true });
    expect(historyDepth()).toBe(2);
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const home = vi.fn();
    goBack(home);
    expect(back).toHaveBeenCalledOnce();
    expect(home).not.toHaveBeenCalled();
  });

  it('goes Home from the screen the app was opened on, instead of out of the app', () => {
    window.history.replaceState(null, '', '/app/?page=discover');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const navigate = vi.fn();
    expect(canGoBack(false)).toBe(true);
    goBack(navigate);
    expect(back).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(HOME_ROUTE, { replace: true });
  });
});
