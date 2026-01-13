import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface FABAction {
  icon: string;
  label: string;
  onClick: () => void;
}

interface FABProps {
  icon: string;
  actions?: FABAction[];
  onClick?: () => void;
}

export function FAB({ icon, actions, onClick }: FABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (actions && actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-center gap-3">
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            style={{ zIndex: -1 }}
          />
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        className="fab"
        onClick={handleClick}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isExpanded ? 45 : 0 }}
      >
        <span className="material-icons-outlined text-2xl">{icon}</span>
      </motion.button>

      {/* Action buttons */}
      <AnimatePresence>
        {isExpanded && actions && (
          <motion.div
            className="flex flex-col-reverse gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                className="flex items-center gap-3 bg-white rounded-full pl-4 pr-3 py-2 shadow-lg"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActionClick(action)}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  {action.label}
                </span>
                <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <span className="material-icons-outlined">{action.icon}</span>
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
