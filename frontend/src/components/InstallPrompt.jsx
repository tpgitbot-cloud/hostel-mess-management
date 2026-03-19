import React, { useState, useEffect } from 'react';

let deferredPrompt = null;

// Capture the beforeinstallprompt event globally
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Dispatch custom event so React component knows
    window.dispatchEvent(new Event('pwainstallable'));
  });
}

export const InstallPrompt = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // If Android/Chrome and deferredPrompt already exists
    if (deferredPrompt) {
      setShowInstall(true);
    }

    // Listen for the custom event
    const handler = () => setShowInstall(true);
    window.addEventListener('pwainstallable', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstall(false);
      deferredPrompt = null;
    });

    return () => window.removeEventListener('pwainstallable', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowInstall(false);
    }
    deferredPrompt = null;
  };

  if (isInstalled) return null;

  // Android: show install button
  if (showInstall) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ color: 'white' }}>
          <p style={{ fontWeight: 'bold', fontSize: 16, margin: 0 }}>📲 Install TPGIT Mess App</p>
          <p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0' }}>Quick access from your home screen</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowInstall(false)}
            style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', padding: '10px 16px', borderRadius: 8,
              fontWeight: 'bold', cursor: 'pointer', fontSize: 14,
            }}
          >
            Later
          </button>
          <button
            onClick={handleInstallClick}
            style={{
              background: 'white', color: '#1e40af',
              border: 'none', padding: '10px 20px', borderRadius: 8,
              fontWeight: 'bold', cursor: 'pointer', fontSize: 14,
            }}
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  // iOS: show instructions
  if (isIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
        padding: '16px 20px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: 'white', flex: 1 }}>
            <p style={{ fontWeight: 'bold', fontSize: 15, margin: 0 }}>📲 Install TPGIT Mess App</p>
            <p style={{ fontSize: 12, opacity: 0.9, margin: '6px 0 0' }}>
              Tap <strong style={{ fontSize: 16 }}>⬆️</strong> Share → then <strong>"Add to Home Screen"</strong>
            </p>
          </div>
          <button
            onClick={() => setIsIOS(false)}
            style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', padding: '6px 12px', borderRadius: 6,
              fontWeight: 'bold', cursor: 'pointer', fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPrompt;
