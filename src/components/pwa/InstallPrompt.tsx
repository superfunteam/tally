import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';

interface InstallPromptProps {
  show: boolean;
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPrompt({ show, isIOS, onInstall, onDismiss }: InstallPromptProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-4 bottom-24 z-50 md:inset-x-auto md:right-4 md:bottom-4 md:w-96"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="material-icons-outlined text-primary-600 text-2xl">
                  install_mobile
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-lg">Install Tally</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {isIOS
                    ? 'Tap the share button, then "Add to Home Screen" for the best experience.'
                    : 'Add Tally to your home screen for quick access.'}
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-icons-outlined text-xl">close</span>
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <span className="material-icons-outlined text-lg">ios_share</span>
                <span>Tap Share</span>
                <span className="material-icons-outlined text-lg">arrow_forward</span>
                <span>"Add to Home Screen"</span>
              </div>
            ) : (
              <div className="mt-4 flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="flex-1"
                >
                  Not now
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon="download"
                  onClick={onInstall}
                  className="flex-1"
                >
                  Install
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
