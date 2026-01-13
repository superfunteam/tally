import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [visitCount, setVisitCount] = useLocalStorage('tally-visit-count', 0);
  const [promptDismissed, setPromptDismissed] = useLocalStorage('tally-prompt-dismissed', false);
  const [hasUploaded, setHasUploaded] = useLocalStorage('tally-has-uploaded', false);

  // Check if app is already installed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone || isIosStandalone);

    // Increment visit count
    setVisitCount(prev => prev + 1);
  }, [setVisitCount]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      } else {
        setPromptDismissed(true);
      }

      setInstallPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [installPrompt, setPromptDismissed]);

  const dismissPrompt = useCallback(() => {
    setPromptDismissed(true);
  }, [setPromptDismissed]);

  const resetPrompt = useCallback(() => {
    setPromptDismissed(false);
  }, [setPromptDismissed]);

  const markUpload = useCallback(() => {
    setHasUploaded(true);
  }, [setHasUploaded]);

  // Determine if we should show the install prompt
  // Show after 2nd visit OR after first upload
  const shouldShowPrompt =
    !isInstalled &&
    !promptDismissed &&
    (installPrompt !== null || isIOS()) &&
    (visitCount >= 2 || hasUploaded);

  return {
    isInstalled,
    canInstall: installPrompt !== null || isIOS(),
    shouldShowPrompt,
    isIOS: isIOS(),
    promptInstall,
    dismissPrompt,
    resetPrompt,
    markUpload,
  };
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
}
