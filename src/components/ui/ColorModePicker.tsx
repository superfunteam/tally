import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ColorMode = 'light' | 'dark' | 'sepia' | 'eink';

interface ColorModePickerProps {
  mode: ColorMode;
  onChange: (mode: ColorMode) => void;
}

const modes: { id: ColorMode; label: string; icon: string; colors: string }[] = [
  { id: 'light', label: 'Light', icon: 'light_mode', colors: 'bg-white border-slate-200' },
  { id: 'dark', label: 'Dark', icon: 'dark_mode', colors: 'bg-slate-900 border-slate-700' },
  { id: 'sepia', label: 'Sepia', icon: 'auto_stories', colors: 'bg-amber-50 border-amber-200' },
  { id: 'eink', label: 'E-Ink', icon: 'chrome_reader_mode', colors: 'bg-gray-100 border-gray-300' },
];

export function ColorModePicker({ mode, onChange }: ColorModePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMode = modes.find((m) => m.id === mode) || modes[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Color mode"
      >
        <span className="material-icons-outlined text-xl">{currentMode.icon}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 z-50 min-w-[140px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  mode === m.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 ${m.colors}`} />
                <span className="text-sm font-medium">{m.label}</span>
                {mode === m.id && (
                  <span className="material-icons-outlined text-sm ml-auto">check</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
