import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, ProgressRing } from './ui';
import type { TransactionMatch, ReceiptTransaction, StatementTransaction } from '../types';

interface MatchCardProps {
  match: TransactionMatch;
  onResolve: () => void;
}

export function MatchCard({ match, onResolve }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const confidenceColor =
    match.confidence >= 0.9
      ? '#22c55e'
      : match.confidence >= 0.7
      ? '#f59e0b'
      : '#ef4444';

  return (
    <Card className="overflow-hidden" padding="none">
      {/* Header - Always visible */}
      <button
        className="w-full p-4 text-left flex items-center gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status indicator */}
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            match.status === 'confirmed'
              ? 'bg-green-500'
              : match.status === 'discrepancy'
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">
            {match.receiptTransaction.merchantName}
          </p>
          <p className="text-sm text-slate-500">
            {new Date(match.receiptTransaction.date).toLocaleDateString()}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="font-bold text-slate-900">
            ${match.receiptTransaction.total.toFixed(2)}
          </p>
          {match.difference && Math.abs(match.difference) > 0.01 && (
            <p
              className={`text-sm font-medium ${
                match.difference > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {match.difference > 0 ? '+' : ''}${match.difference.toFixed(2)}
            </p>
          )}
        </div>

        {/* Confidence */}
        <ProgressRing
          progress={match.confidence * 100}
          size={40}
          strokeWidth={3}
          color={confidenceColor}
        />

        {/* Expand icon */}
        <motion.span
          className="material-icons-outlined text-slate-400"
          animate={{ rotate: isExpanded ? 180 : 0 }}
        >
          expand_more
        </motion.span>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-100 pt-4">
              {/* Side by side comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Receipt data */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Receipt
                  </h4>
                  <TransactionDetail
                    label="Merchant"
                    value={match.receiptTransaction.merchantName}
                  />
                  <TransactionDetail
                    label="Date"
                    value={new Date(match.receiptTransaction.date).toLocaleDateString()}
                  />
                  {match.receiptTransaction.time && (
                    <TransactionDetail
                      label="Time"
                      value={match.receiptTransaction.time}
                    />
                  )}
                  {match.receiptTransaction.subtotal && (
                    <TransactionDetail
                      label="Subtotal"
                      value={`$${match.receiptTransaction.subtotal.toFixed(2)}`}
                    />
                  )}
                  {match.receiptTransaction.tip && (
                    <TransactionDetail
                      label="Tip"
                      value={`$${match.receiptTransaction.tip.toFixed(2)}`}
                      highlight
                    />
                  )}
                  <TransactionDetail
                    label="Total"
                    value={`$${match.receiptTransaction.total.toFixed(2)}`}
                    bold
                  />
                </div>

                {/* Statement data */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statement
                  </h4>
                  <TransactionDetail
                    label="Description"
                    value={match.statementTransaction.description}
                  />
                  <TransactionDetail
                    label="Date"
                    value={new Date(match.statementTransaction.date).toLocaleDateString()}
                  />
                  <TransactionDetail
                    label="Amount"
                    value={`$${Math.abs(match.statementTransaction.amount).toFixed(2)}`}
                    bold
                  />
                  <TransactionDetail
                    label="Type"
                    value={match.statementTransaction.type}
                  />
                </div>
              </div>

              {/* Difference highlight */}
              {match.difference && Math.abs(match.difference) > 0.01 && (
                <div
                  className={`p-3 rounded-xl mb-4 ${
                    match.difference > 0 ? 'bg-red-50' : 'bg-green-50'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      match.difference > 0 ? 'text-red-700' : 'text-green-700'
                    }`}
                  >
                    {match.difference > 0
                      ? `Receipt is $${match.difference.toFixed(2)} more than statement (possible overcharge)`
                      : `Receipt is $${Math.abs(match.difference).toFixed(2)} less than statement`}
                  </p>
                </div>
              )}

              {/* Actions */}
              {!match.resolved && (
                <Button
                  variant="primary"
                  icon="check"
                  onClick={onResolve}
                  className="w-full"
                >
                  Mark as Resolved
                </Button>
              )}
              {match.resolved && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <span className="material-icons-outlined">check_circle</span>
                  <span className="font-medium">Resolved</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

interface TransactionDetailProps {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}

function TransactionDetail({ label, value, bold, highlight }: TransactionDetailProps) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-sm truncate ${
          bold ? 'font-bold text-slate-900' : 'text-slate-700'
        } ${highlight ? 'text-amber-600' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

// Unmatched item cards
interface UnmatchedReceiptCardProps {
  transaction: ReceiptTransaction;
}

export function UnmatchedReceiptCard({ transaction }: UnmatchedReceiptCardProps) {
  return (
    <Card className="border-l-4 border-l-red-400">
      <div className="flex items-center gap-4">
        <span className="material-icons-outlined text-2xl text-red-400">receipt_long</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{transaction.merchantName}</p>
          <p className="text-sm text-slate-500">
            {new Date(transaction.date).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900">${transaction.total.toFixed(2)}</p>
          <p className="text-xs text-red-600">No match found</p>
        </div>
      </div>
    </Card>
  );
}

interface UnmatchedStatementCardProps {
  transaction: StatementTransaction;
}

export function UnmatchedStatementCard({ transaction }: UnmatchedStatementCardProps) {
  return (
    <Card className="border-l-4 border-l-amber-400">
      <div className="flex items-center gap-4">
        <span className="material-icons-outlined text-2xl text-amber-400">
          account_balance
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{transaction.description}</p>
          <p className="text-sm text-slate-500">
            {new Date(transaction.date).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900">
            ${Math.abs(transaction.amount).toFixed(2)}
          </p>
          <p className="text-xs text-amber-600">No receipt</p>
        </div>
      </div>
    </Card>
  );
}
