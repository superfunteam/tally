import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
}

export function Modal({ isOpen, onClose, title, children, showClose = true }: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Desktop Modal */}
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col pointer-events-auto"
              style={{ backgroundColor: 'var(--bg-primary)' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span className="material-icons-outlined">close</span>
                    </button>
                  )}
                </div>
              )}
              <div className="p-6 overflow-y-auto flex-1">{children}</div>
            </motion.div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="md:hidden fixed inset-0 z-50 flex items-end pointer-events-none">
            <motion.div
              className="rounded-t-3xl shadow-2xl w-full max-h-[85vh] flex flex-col pointer-events-auto"
              style={{ backgroundColor: 'var(--bg-primary)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
              </div>

              {title && (
                <div className="flex items-center justify-between px-6 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-1 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span className="material-icons-outlined">close</span>
                    </button>
                  )}
                </div>
              )}
              <div className="p-6 overflow-y-auto flex-1 pb-safe">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
