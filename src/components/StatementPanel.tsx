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
    // Filter for PDF files only
    const pdfFiles = files.filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );
    if (pdfFiles.length > 0) {
      onAddFiles(pdfFiles);
    }
  };

  const totalTransactions = statements.reduce(
    (sum, s) => sum + (s.transactions?.length || 0),
    0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="text-xl font-bold text-slate-900">Statements</h2>
        <p className="text-sm text-slate-500 mt-1">
          {statements.length === 0
            ? 'Upload your bank statements'
            : `${statements.length} statement${statements.length !== 1 ? 's' : ''} · ${totalTransactions} transactions`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-hide">
        {statements.length === 0 ? (
          <DropZone
            accept=".pdf,application/pdf"
            multiple
            icon="description"
            title="Drop PDF statements here"
            subtitle="or click to browse"
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
                input.accept = '.pdf,application/pdf';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  handleFiles(files);
                };
                input.click();
              }}
              className="w-full"
            >
              Add More Statements
            </Button>

            {/* Statement list */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {statements.map((statement) => (
                  <StatementCard
                    key={statement.id}
                    statement={statement}
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
  onRemove: () => void;
  onRetry: () => void;
}

function StatementCard({ statement, onRemove, onRetry }: StatementCardProps) {
  const status = statusConfig[statement.status];
  const isProcessing = ['uploading', 'analyzing', 'extracting'].includes(statement.status);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <Card className="flex items-start gap-4">
        {/* PDF Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            statement.status === 'complete'
              ? 'bg-green-100'
              : statement.status === 'error'
              ? 'bg-red-100'
              : 'bg-slate-100'
          }`}
        >
          {isProcessing ? (
            <motion.span
              className="material-icons-outlined text-2xl text-slate-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              sync
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
              picture_as_pdf
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{statement.name}</p>

          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span>{formatFileSize(statement.file.size)}</span>
            {statement.pageCount && (
              <>
                <span>·</span>
                <span>{statement.pageCount} page{statement.pageCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`material-icons-outlined text-lg ${status.color}`}>
              {status.icon}
            </span>
            <span className="text-sm text-slate-600">
              {statement.status === 'complete'
                ? `${statement.transactions.length} transactions found`
                : status.label}
            </span>
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
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-icons-outlined text-xl">close</span>
        </button>
      </Card>
    </motion.div>
  );
}
