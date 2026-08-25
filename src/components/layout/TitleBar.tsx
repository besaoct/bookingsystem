import React, { useState, useEffect, useCallback } from 'react';
import logoSrc from '@/assets/logo.svg';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
const isMac = typeof window !== 'undefined' && window.electronAPI?.platform === 'darwin';

export const TitleBar: React.FC = () => {
  const [maximized, setMaximized] = useState(false);

  const checkMaximized = useCallback(async () => {
    if (window.electronAPI?.windowControls) {
      const m = await window.electronAPI.windowControls.isMaximized();
      setMaximized(m);
    }
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    checkMaximized();
    // Poll every 500ms for maximize/restore state changes
    const id = setInterval(checkMaximized, 500);
    return () => clearInterval(id);
  }, [checkMaximized]);

  if (!isElectron) return null;

  const { minimize, maximize, close } = window.electronAPI!.windowControls;

  return (
    <div
      className="titlebar print:hidden"
      style={{
        // webkit-app-region: drag makes the whole bar draggable
        // @ts-expect-error webkit css
        WebkitAppRegion: 'drag',
      }}
    >
      {/* macOS: traffic lights sit on the left via trafficLightPosition,
          so we just need the app title centred */}
      {isMac ? (
        <div className="titlebar-mac">
          <div className="titlebar-brand">
            <img src={logoSrc} alt="logo" className="titlebar-logo" />
            <span className="titlebar-title">Booking System</span>
          </div>
        </div>
      ) : (
        /* Windows / Linux: full custom bar with our own controls */
        <>
          <div className="titlebar-brand">
            <img src={logoSrc} alt="logo" className="titlebar-logo" />
            <span className="titlebar-title">Booking System</span>
          </div>

          <div
            className="titlebar-controls"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {/* Minimize */}
            <button
              className="titlebar-btn"
              onClick={minimize}
              aria-label="Minimize"
              title="Minimize"
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
                <rect width="10" height="1" />
              </svg>
            </button>

            {/* Maximize / Restore */}
            <button
              className="titlebar-btn"
              onClick={maximize}
              aria-label={maximized ? 'Restore' : 'Maximize'}
              title={maximized ? 'Restore' : 'Maximize'}
            >
              {maximized ? (
                /* Restore icon */
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="2" y="0" width="8" height="8" rx="0.5" />
                  <path d="M0 2v7.5a.5.5 0 0 0 .5.5H8" />
                </svg>
              ) : (
                /* Maximize icon */
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.5" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              className="titlebar-btn titlebar-btn-close"
              onClick={close}
              aria-label="Close"
              title="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
