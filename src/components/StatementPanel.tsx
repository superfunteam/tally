import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DropZone, Card, Button } from './ui';
import type { StatementFile, ProcessingStatus } from '../types';

interface StatementPanelProps {
  statements: StatementFile[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

const statusConfig: Record<ProcessingStatus, { label: string; icon: string; color: string }> = {
  pending: { label: 'Waiting...', icon: 'schedule', color: 'text-slate-500' },
  uploading: { label: 'Uploading...', icon: 'cloud_upload', color: 'text-blue-500' },
  analyzing: { label: 'Analyzing...', icon: 'visibility', color: 'text-amber-500' },
  extracting: { label: 'Extracting...', icon: 'auto_awesome', color: 'text-purple-500' },
  complete: { label: 'Complete', icon: 'check_circle', color: 'text-green-500' },
  error: { label: 'Error', icon: 'error', color: 'text-red-500' },
};

export function StatementPanel({ statements, onAddFiles, onRemove, onRetry }: StatementPanelProps) {
  const handleFiles = (files: File[]) => {
    // Filter for PDF or image files
    const validFiles = files.filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.name.endsWith('.pdf') ||
        file.type.startsWith('image/') ||
        file.name.match(/\.(jpg|jpeg|png|heic|webp)$/i)
    );
    if (validFiles.length > 0) {
      onAddFiles(validFiles);
    }
  };

  const isImageFile = (file?: File) => file?.type?.startsWith('image/') || Boolean(file?.name?.match(/\.(jpg|jpeg|png|heic|webp)$/i));

  const totalTransactions = statements.reduce(
    (sum, s) => sum + (s.transactions?.length || 0),
    0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Statements</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {statements.length === 0
            ? 'Upload your bank statements'
            : `${statements.length} statement${statements.length !== 1 ? 's' : ''} · ${totalTransactions} transactions`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-hide">
        {statements.length === 0 ? (
          <DropZone
            accept=".pdf,application/pdf,image/*"
            multiple
            icon="description"
            title="Drop statements here"
            subtitle="PDF or image"
            onFiles={handleFiles}
          />
        ) : (
          <div className="space-y-4">
            {/* Add more button */}
            <Button
              variant="secondary"
              icon="add"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,application/pdf,image/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  handleFiles(files);
                };
                input.click();
              }}
              className="w-full"
            >
              Add More
            </Button>

            {/* Statement list */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {statements.map((statement) => (
                  <StatementCard
                    key={statement.id}
                    statement={statement}
                    isImage={isImageFile(statement.file)}
                    onRemove={() => onRemove(statement.id)}
                    onRetry={() => onRetry(statement.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatementCardProps {
  statement: StatementFile;
  isImage: boolean;
  onRemove: () => void;
  onRetry: () => void;
}

function StatementCard({ statement, isImage, onRemove, onRetry }: StatementCardProps) {
  const status = statusConfig[statement.status];
  const isProcessing = ['pending', 'uploading', 'analyzing', 'extracting'].includes(statement.status);
  const [elapsed, setElapsed] = useState(0);

  // Timer for processing
  useEffect(() => {
    if (!isProcessing) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isProcessing]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <Card className="flex items-start gap-4 overflow-hidden relative">
        {/* Animated processing background */}
        {isProcessing && (
          <>
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--color-primary-600), transparent)',
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: 'var(--color-primary-600)' }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            />
          </>
        )}

        {/* File Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
          style={{ backgroundColor: isProcessing ? 'var(--color-primary-600)' : 'var(--bg-tertiary)' }}
        >
          {isProcessing ? (
            <motion.span
              className="material-icons-outlined text-2xl text-white"
              animate={{
                rotateY: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotateY: { duration: 2, repeat: Infinity, ease: 'linear' },
                scale: { duration: 1, repeat: Infinity },
              }}
            >
              document_scanner
            </motion.span>
          ) : (
            <span
              className={`material-icons-outlined text-2xl ${
                statement.status === 'complete'
                  ? 'text-green-600'
                  : statement.status === 'error'
                  ? 'text-red-600'
                  : 'text-slate-500'
              }`}
            >
              {isImage ? 'image' : 'picture_as_pdf'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 relative z-10">
          <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{statement.name}</p>

          <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {statement.file?.size && <span>{formatFileSize(statement.file.size)}</span>}
            {statement.pageCount && (
              <>
                <span>·</span>
                <span>{statement.pageCount} page{statement.pageCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            {isProcessing ? (
              <>
                <motion.span
                  className="material-icons-outlined text-lg"
                  style={{ color: 'var(--color-primary-600)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  {status.icon}
                </motion.span>
                <span className="text-sm font-medium" style={{ color: 'var(--color-primary-600)' }}>
                  {status.label}
                </span>
                <motion.span
                  className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary-600)', color: 'white' }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {formatTime(elapsed)}
                </motion.span>
              </>
            ) : (
              <>
                <span className={`material-icons-outlined text-lg ${status.color}`}>
                  {status.icon}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {statement.status === 'complete'
                    ? `${statement.transactions.length} transactions found`
                    : status.label}
                </span>
              </>
            )}
          </div>

          {/* Error state */}
          {statement.status === 'error' && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-red-600">{statement.error}</p>
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="p-2 transition-colors relative z-10"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="material-icons-outlined text-xl">close</span>
        </button>
      </Card>
    </motion.div>
  );
}
