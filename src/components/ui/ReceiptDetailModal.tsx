import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from './Modal';
import { Button } from './Button';
import type { ReceiptTransaction } from '../../types';

interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: ReceiptTransaction | null;
  previewUrl?: string;
  onSave: (updated: ReceiptTransaction) => void;
}

export function ReceiptDetailModal({
  isOpen,
  onClose,
  transaction,
  previewUrl,
  onSave,
}: ReceiptDetailModalProps) {
  const [editedTransaction, setEditedTransaction] = useState<ReceiptTransaction | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (transaction) {
      setEditedTransaction({ ...transaction });
      setHasChanges(false);
    }
  }, [transaction]);

  if (!transaction || !editedTransaction) return null;

  const handleFieldChange = (field: keyof ReceiptTransaction, value: string | number) => {
    setEditedTransaction((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      setHasChanges(true);
      return updated;
    });
  };

  const handleNumberChange = (field: keyof ReceiptTransaction, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) || value === '') {
      handleFieldChange(field, value === '' ? 0 : num);
    }
  };

  const handleSave = () => {
    if (editedTransaction) {
      onSave({ ...editedTransaction, edited: true });
      onClose();
    }
  };

  const calculatedTotal =
    (editedTransaction.subtotal || 0) +
    (editedTransaction.tax || 0) +
    (editedTransaction.tip || 0);

  const totalMismatch = Math.abs(calculatedTotal - editedTransaction.total) > 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt Details">
      <div className="space-y-4">
        {/* Receipt Preview */}
        {previewUrl && (
          <div className="rounded-xl overflow-hidden max-h-48 flex justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <img
              src={previewUrl}
              alt="Receipt"
              className="max-h-48 object-contain"
            />
          </div>
        )}

        {/* Confidence Indicator */}
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <span className="material-icons-outlined text-lg" style={{ color: transaction.confidence > 0.8 ? 'var(--color-primary-600)' : '#f59e0b' }}>
            {transaction.confidence > 0.8 ? 'verified' : 'warning'}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            AI Confidence: {Math.round(transaction.confidence * 100)}%
            {transaction.tipHandwritten && ' • Handwritten tip detected'}
          </span>
        </div>

        {/* Editable Fields */}
        <div className="space-y-3">
          {/* Merchant */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Merchant
            </label>
            <input
              type="text"
              value={editedTransaction.merchantName}
              onChange={(e) => handleFieldChange('merchantName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Date
            </label>
            <input
              type="date"
              value={editedTransaction.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Amounts Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Subtotal */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Subtotal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={editedTransaction.subtotal || ''}
                  onChange={(e) => handleNumberChange('subtotal', e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Tax */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Tax
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={editedTransaction.tax || ''}
                  onChange={(e) => handleNumberChange('tax', e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Tip */}
            <div>
              <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                Tip
                {transaction.tipHandwritten && (
                  <span className="material-icons text-xs" style={{ color: '#f59e0b' }}>edit</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={editedTransaction.tip || ''}
                  onChange={(e) => handleNumberChange('tip', e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: transaction.tipHandwritten ? '#f59e0b' : 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Total */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Total
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={editedTransaction.total}
                  onChange={(e) => handleNumberChange('total', e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: totalMismatch ? '#ef4444' : 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Printed vs Handwritten Totals */}
          {(transaction.printedTotal || transaction.handwrittenTotal) && (
            <div className="p-3 rounded-xl text-sm space-y-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Amount Details:</p>
              {transaction.printedTotal && (
                <p style={{ color: 'var(--text-secondary)' }}>
                  Printed total: ${transaction.printedTotal.toFixed(2)}
                </p>
              )}
              {transaction.handwrittenTotal && (
                <p style={{ color: '#f59e0b' }}>
                  Handwritten total: ${transaction.handwrittenTotal.toFixed(2)}
                  <span className="material-icons text-xs ml-1 align-middle">edit</span>
                </p>
              )}
            </div>
          )}

          {/* Math Check Warning */}
          {totalMismatch && (
            <motion.div
              className="p-3 rounded-xl flex items-start gap-2"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="material-icons text-red-500 text-lg">warning</span>
              <div className="text-sm">
                <p className="font-medium text-red-600">Math doesn't add up</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Subtotal + Tax + Tip = ${calculatedTotal.toFixed(2)}, but Total is ${editedTransaction.total.toFixed(2)}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            className="flex-1"
            icon={hasChanges ? 'save' : 'check'}
          >
            {hasChanges ? 'Save Changes' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
