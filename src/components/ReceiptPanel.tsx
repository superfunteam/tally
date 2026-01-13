import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DropZone, Card, CameraButton, Button, ScanningOverlay, ReceiptDetailModal } from './ui';
import type { ReceiptImage, ReceiptTransaction, ProcessingStatus } from '../types';

interface ReceiptPanelProps {
  receipts: ReceiptImage[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onUpdateTransaction: (receiptId: string, transactionIndex: number, updated: ReceiptTransaction) => void;
}

const statusConfig: Record<ProcessingStatus, { label: string; icon: string; color: string }> = {
  pending: { label: 'Waiting...', icon: 'schedule', color: 'text-slate-500' },
  uploading: { label: 'Uploading...', icon: 'cloud_upload', color: 'text-blue-500' },
  analyzing: { label: 'Analyzing...', icon: 'visibility', color: 'text-amber-500' },
  extracting: { label: 'Extracting...', icon: 'auto_awesome', color: 'text-purple-500' },
  complete: { label: 'Complete', icon: 'check_circle', color: 'text-green-500' },
  error: { label: 'Error', icon: 'error', color: 'text-red-500' },
};

export function ReceiptPanel({ receipts, onAddFiles, onRemove, onRetry, onUpdateTransaction }: ReceiptPanelProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<{ receipt: ReceiptImage; transactionIndex: number } | null>(null);

  const handleFiles = (files: File[]) => {
    // Filter for image files only
    const imageFiles = files.filter((file) =>
      file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|heic|webp)$/i)
    );
    if (imageFiles.length > 0) {
      onAddFiles(imageFiles);
    }
  };

  const handleReceiptClick = (receipt: ReceiptImage, transactionIndex: number = 0) => {
    if (receipt.status === 'complete' && receipt.transactions.length > 0) {
      setSelectedReceipt({ receipt, transactionIndex });
    }
  };

  const handleSaveTransaction = (updated: ReceiptTransaction) => {
    if (selectedReceipt) {
      onUpdateTransaction(selectedReceipt.receipt.id, selectedReceipt.transactionIndex, updated);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Receipts</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {receipts.length === 0
            ? 'Upload or capture your receipts'
            : `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''} uploaded`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-hide">
        {receipts.length === 0 ? (
          <div className="space-y-4">
            <DropZone
              accept="image/*"
              multiple
              icon="receipt_long"
              title="Drop receipts here"
              subtitle="or click to browse"
              onFiles={handleFiles}
            />
            <div className="flex gap-3">
              <CameraButton onCapture={handleFiles} className="flex-1" />
              <Button
                variant="secondary"
                icon="photo_library"
                onClick={() => document.querySelector<HTMLInputElement>('.drop-zone input')?.click()}
                className="flex-1"
              >
                Gallery
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="flex gap-3">
              <CameraButton onCapture={handleFiles} variant="secondary" className="flex-1" />
              <Button
                variant="secondary"
                icon="add_photo_alternate"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    handleFiles(files);
                  };
                  input.click();
                }}
                className="flex-1"
              >
                Add More
              </Button>
            </div>

            {/* Receipt grid */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {receipts.map((receipt) => (
                  <ReceiptCard
                    key={receipt.id}
                    receipt={receipt}
                    onRemove={() => onRemove(receipt.id)}
                    onRetry={() => onRetry(receipt.id)}
                    onClick={() => handleReceiptClick(receipt)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      <ReceiptDetailModal
        isOpen={selectedReceipt !== null}
        onClose={() => setSelectedReceipt(null)}
        transaction={selectedReceipt?.receipt.transactions[selectedReceipt.transactionIndex] || null}
        previewUrl={selectedReceipt?.receipt.preview}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}

interface ReceiptCardProps {
  receipt: ReceiptImage;
  onRemove: () => void;
  onRetry: () => void;
  onClick: () => void;
}

function ReceiptCard({ receipt, onRemove, onRetry, onClick }: ReceiptCardProps) {
  const status = statusConfig[receipt.status];
  const isProcessing = ['uploading', 'analyzing', 'extracting'].includes(receipt.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <Card className="overflow-hidden" padding="none">
        {/* Image */}
        <div className="relative aspect-[3/4]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <img
            src={receipt.preview}
            alt="Receipt"
            className="w-full h-full object-cover"
          />

          {/* Status overlay */}
          {receipt.status !== 'complete' && receipt.status !== 'error' && (
            <ScanningOverlay status={receipt.status as 'pending' | 'uploading' | 'analyzing' | 'extracting'} />
          )}

          {/* Error overlay */}
          {receipt.status === 'error' && (
            <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center">
              <span className="material-icons-outlined text-4xl text-white">error</span>
              <span className="text-white text-sm mt-2 font-medium">Error</span>
            </div>
          )}

          {/* Remove button */}
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white
                       flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <span className="material-icons-outlined text-lg">close</span>
          </button>
        </div>

        {/* Info */}
        <div
          className={`p-3 ${receipt.status === 'complete' ? 'cursor-pointer hover:bg-black/5 transition-colors' : ''}`}
          onClick={receipt.status === 'complete' ? onClick : undefined}
        >
          {receipt.status === 'complete' && receipt.transactions.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                  {receipt.transactions[0].merchantName}
                </p>
                {receipt.transactions[0].edited && (
                  <span className="material-icons text-xs ml-1" style={{ color: 'var(--color-primary-600)' }}>edit</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  ${receipt.transactions[0].total.toFixed(2)}
                </p>
                {receipt.transactions[0].tipHandwritten && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    tip
                  </span>
                )}
              </div>
              {receipt.transactions.length > 1 && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  +{receipt.transactions.length - 1} more
                </p>
              )}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Tap to review
              </p>
            </div>
          ) : receipt.status === 'error' ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600 truncate">{receipt.error}</p>
              <Button size="sm" variant="secondary" onClick={onRetry} className="w-full">
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`material-icons-outlined text-lg ${status.color}`}>
                {status.icon}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{status.label}</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
