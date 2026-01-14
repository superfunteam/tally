import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Modal } from './ui';
import type { MatchResults, ReceiptImage, StatementFile, StatementTransaction } from '../types';

interface ResultsDashboardProps {
  results: MatchResults;
  receipts: ReceiptImage[];
  statements: StatementFile[];
  onResolve: (matchId: string) => void;
  onBack: () => void;
  isMatching: boolean;
}

type ReceiptMatchStatus =
  | { type: 'matched'; statementAmount: number; difference: number }
  | { type: 'mismatch'; statementAmount: number; difference: number }
  | { type: 'not_found' };

interface ReceiptWithStatus {
  receipt: ReceiptImage;
  status: ReceiptMatchStatus;
  merchantName: string;
  receiptAmount: number;
}

export function ResultsDashboard({
  results,
  receipts,
  statements,
  onBack,
  isMatching,
}: ResultsDashboardProps) {
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Get all statement transactions
  const allStatementTransactions = useMemo(() => {
    return statements.flatMap(s => s.transactions);
  }, [statements]);

  // Build receipt status map from match results
  const receiptsWithStatus = useMemo((): ReceiptWithStatus[] => {
    // Only show completed receipts
    const completedReceipts = receipts.filter(
      r => r.status === 'complete' && r.transactions.length > 0
    );

    return completedReceipts.map(receipt => {
      const receiptTx = receipt.transactions[0];

      // Check if this receipt is in confirmed matches
      const confirmedMatch = results.confirmed.find(
        m => m.receiptTransaction.id === receiptTx.id
      );
      if (confirmedMatch) {
        return {
          receipt,
          merchantName: receiptTx.merchantName,
          receiptAmount: receiptTx.total,
          status: {
            type: 'matched' as const,
            statementAmount: confirmedMatch.statementTransaction.amount,
            difference: 0,
          },
        };
      }

      // Check if this receipt is in discrepancies
      const discrepancyMatch = results.discrepancies.find(
        m => m.receiptTransaction.id === receiptTx.id
      );
      if (discrepancyMatch) {
        return {
          receipt,
          merchantName: receiptTx.merchantName,
          receiptAmount: receiptTx.total,
          status: {
            type: 'mismatch' as const,
            statementAmount: discrepancyMatch.statementTransaction.amount,
            difference: discrepancyMatch.difference || 0,
          },
        };
      }

      // Not found
      return {
        receipt,
        merchantName: receiptTx.merchantName,
        receiptAmount: receiptTx.total,
        status: { type: 'not_found' as const },
      };
    });
  }, [receipts, results]);

  // Stats
  const matchedCount = receiptsWithStatus.filter(r => r.status.type === 'matched').length;
  const mismatchCount = receiptsWithStatus.filter(r => r.status.type === 'mismatch').length;
  const notFoundCount = receiptsWithStatus.filter(r => r.status.type === 'not_found').length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="p-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Results</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isMatching ? 'Matching transactions...' : `${receiptsWithStatus.length} receipts checked`}
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap">
          <SummaryPill icon="check_circle" color="green" count={matchedCount} label="Matched" />
          <SummaryPill icon="warning" color="amber" count={mismatchCount} label="Mismatch" />
          <SummaryPill icon="help_outline" color="red" count={notFoundCount} label="Not found" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isMatching ? (
          <LoadingState />
        ) : receiptsWithStatus.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {receiptsWithStatus.map(({ receipt, status, merchantName, receiptAmount }) => (
                <ReceiptResultCard
                  key={receipt.id}
                  preview={receipt.preview}
                  merchantName={merchantName}
                  receiptAmount={receiptAmount}
                  status={status}
                  onCheckStatement={() => setShowStatementModal(true)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Statement Modal */}
      <StatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        transactions={allStatementTransactions}
      />
    </div>
  );
}

interface SummaryPillProps {
  icon: string;
  color: 'green' | 'amber' | 'red';
  count: number;
  label: string;
}

function SummaryPill({ icon, color, count, label }: SummaryPillProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  };
  const iconColors = {
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colorClasses[color]}`}>
      <span className={`material-icons-outlined text-base ${iconColors[color]}`}>{icon}</span>
      <span>{count}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

interface ReceiptResultCardProps {
  preview: string;
  merchantName: string;
  receiptAmount: number;
  status: ReceiptMatchStatus;
  onCheckStatement: () => void;
}

function ReceiptResultCard({
  preview,
  merchantName,
  receiptAmount,
  status,
  onCheckStatement,
}: ReceiptResultCardProps) {
  const isMatched = status.type === 'matched';
  const isMismatch = status.type === 'mismatch';
  const isNotFound = status.type === 'not_found';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <Card className="overflow-hidden" padding="none">
        {/* Receipt image */}
        <div className="relative aspect-[3/4]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <img
            src={preview}
            alt="Receipt"
            className="w-full h-full object-cover"
          />

          {/* Status badge overlay */}
          <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center ${
            isMatched ? 'bg-green-500' : isMismatch ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            <span className="material-icons-outlined text-white text-lg">
              {isMatched ? 'check' : isMismatch ? 'warning' : 'question_mark'}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {merchantName}
          </p>

          {/* Amounts */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Receipt</span>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                ${receiptAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Statement</span>
              {isNotFound ? (
                <button
                  onClick={onCheckStatement}
                  className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-0.5"
                >
                  Not found
                  <span className="material-icons-outlined text-sm">chevron_right</span>
                </button>
              ) : (
                <span className={`text-lg font-bold ${isMatched ? 'text-green-600' : 'text-red-500'}`}>
                  ${status.statementAmount.toFixed(2)}
                </span>
              )}
            </div>

            {/* Difference indicator for mismatches */}
            {isMismatch && status.type === 'mismatch' && (
              <div className="flex justify-end">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  status.difference > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {status.difference > 0 ? '+' : ''}${status.difference.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: StatementTransaction[];
}

function StatementModal({ isOpen, onClose, transactions }: StatementModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statement Transactions">
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No statement transactions loaded
          </p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex justify-between items-center p-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {tx.description}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {tx.date}
                </p>
              </div>
              <p className={`font-bold ml-3 ${tx.type === 'credit' ? 'text-green-600' : ''}`} style={{ color: tx.type === 'credit' ? undefined : 'var(--text-primary)' }}>
                {tx.type === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-primary-100)' }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <motion.span
          className="material-icons-outlined text-3xl"
          style={{ color: 'var(--color-primary-600)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          sync
        </motion.span>
      </motion.div>
      <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Matching transactions...</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        This may take a moment
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
      <span className="material-icons-outlined text-5xl mb-3">receipt_long</span>
      <p className="text-lg">No receipts to show</p>
      <p className="text-sm mt-1">Upload some receipts first</p>
    </div>
  );
}
