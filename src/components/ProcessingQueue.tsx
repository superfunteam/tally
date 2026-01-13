import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui';

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  complete: number;
  error: number;
}

interface ProcessingQueueProps {
  stats: QueueStats;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
}

export function ProcessingQueue({
  stats,
  isPaused,
  onPause,
  onResume,
  onClear,
}: ProcessingQueueProps) {
  const progress = stats.total > 0 ? (stats.complete / stats.total) * 100 : 0;
  const isProcessing = stats.processing > 0 || stats.pending > 0;

  if (stats.total === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-sm">
              {stats.processing > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <motion.span
                    className="material-icons-outlined text-lg"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    sync
                  </motion.span>
                  <span>{stats.processing} processing</span>
                </div>
              )}
              {stats.pending > 0 && (
                <div className="flex items-center gap-1 text-slate-500">
                  <span className="material-icons-outlined text-lg">schedule</span>
                  <span>{stats.pending} queued</span>
                </div>
              )}
              {stats.complete > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <span className="material-icons-outlined text-lg">check_circle</span>
                  <span>{stats.complete} done</span>
                </div>
              )}
              {stats.error > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <span className="material-icons-outlined text-lg">error</span>
                  <span>{stats.error} failed</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {isProcessing && (
              <Button
                variant={isPaused ? 'primary' : 'secondary'}
                size="sm"
                icon={isPaused ? 'play_arrow' : 'pause'}
                onClick={isPaused ? onResume : onPause}
                className="flex-1"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
            {(stats.complete === stats.total || stats.error > 0) && (
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                onClick={onClear}
                className="flex-1"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
