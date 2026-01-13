import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui';
import { MatchCard, UnmatchedReceiptCard, UnmatchedStatementCard } from './MatchCard';
import type { MatchResults } from '../types';

interface ResultsDashboardProps {
  results: MatchResults;
  onResolve: (matchId: string) => void;
  onBack: () => void;
  isMatching: boolean;
}

type FilterType = 'all' | 'confirmed' | 'discrepancy' | 'unmatched';

export function ResultsDashboard({
  results,
  onResolve,
  onBack,
  isMatching,
}: ResultsDashboardProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const totalMatched = results.confirmed.length + results.discrepancies.length;
  const totalUnmatched = results.unmatchedReceipts.length + results.unmatchedStatements.length;
  const totalDiscrepancy = results.discrepancies.reduce(
    (sum, m) => sum + Math.abs(m.difference || 0),
    0
  );

  const filters: { id: FilterType; label: string; count: number; color: string }[] = [
    { id: 'all', label: 'All', count: totalMatched + totalUnmatched, color: 'bg-slate-500' },
    { id: 'confirmed', label: 'Confirmed', count: results.confirmed.length, color: 'bg-green-500' },
    { id: 'discrepancy', label: 'Discrepancies', count: results.discrepancies.length, color: 'bg-amber-500' },
    { id: 'unmatched', label: 'Unmatched', count: totalUnmatched, color: 'bg-red-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
          >
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Results</h1>
            <p className="text-sm text-slate-500">
              {isMatching ? 'Matching transactions...' : `${totalMatched} matches found`}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <SummaryCard
            icon="check_circle"
            iconColor="text-green-500"
            label="Matched"
            value={totalMatched.toString()}
          />
          <SummaryCard
            icon="warning"
            iconColor="text-amber-500"
            label="Discrepancies"
            value={results.discrepancies.length.toString()}
          />
          <SummaryCard
            icon="attach_money"
            iconColor="text-red-500"
            label="Difference"
            value={`$${totalDiscrepancy.toFixed(2)}`}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                         whitespace-nowrap transition-colors ${
                           filter === f.id
                             ? 'bg-slate-900 text-white'
                             : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                         }`}
            >
              <span className={`w-2 h-2 rounded-full ${f.color}`} />
              {f.label}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isMatching ? (
          <LoadingState />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Confirmed matches */}
              {(filter === 'all' || filter === 'confirmed') &&
                results.confirmed.length > 0 && (
                  <Section
                    title="Confirmed Matches"
                    icon="check_circle"
                    iconColor="text-green-500"
                    count={results.confirmed.length}
                  >
                    {results.confirmed.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onResolve={() => onResolve(match.id)}
                      />
                    ))}
                  </Section>
                )}

              {/* Discrepancies */}
              {(filter === 'all' || filter === 'discrepancy') &&
                results.discrepancies.length > 0 && (
                  <Section
                    title="Discrepancies"
                    icon="warning"
                    iconColor="text-amber-500"
                    count={results.discrepancies.length}
                  >
                    {results.discrepancies.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onResolve={() => onResolve(match.id)}
                      />
                    ))}
                  </Section>
                )}

              {/* Unmatched */}
              {(filter === 'all' || filter === 'unmatched') && (
                <>
                  {results.unmatchedReceipts.length > 0 && (
                    <Section
                      title="Unmatched Receipts"
                      icon="receipt_long"
                      iconColor="text-red-500"
                      count={results.unmatchedReceipts.length}
                    >
                      {results.unmatchedReceipts.map((t) => (
                        <UnmatchedReceiptCard key={t.id} transaction={t} />
                      ))}
                    </Section>
                  )}

                  {results.unmatchedStatements.length > 0 && (
                    <Section
                      title="Unmatched Statement Entries"
                      icon="account_balance"
                      iconColor="text-amber-500"
                      count={results.unmatchedStatements.length}
                    >
                      {results.unmatchedStatements.map((t) => (
                        <UnmatchedStatementCard key={t.id} transaction={t} />
                      ))}
                    </Section>
                  )}
                </>
              )}

              {/* Empty state */}
              {filter !== 'all' &&
                ((filter === 'confirmed' && results.confirmed.length === 0) ||
                  (filter === 'discrepancy' && results.discrepancies.length === 0) ||
                  (filter === 'unmatched' && totalUnmatched === 0)) && (
                  <EmptyState filter={filter} />
                )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
}

function SummaryCard({ icon, iconColor, label, value }: SummaryCardProps) {
  return (
    <Card padding="sm" className="text-center">
      <span className={`material-icons-outlined text-2xl ${iconColor}`}>{icon}</span>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}

interface SectionProps {
  title: string;
  icon: string;
  iconColor: string;
  count: number;
  children: React.ReactNode;
}

function Section({ title, icon, iconColor, count, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`material-icons-outlined ${iconColor}`}>{icon}</span>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <span className="text-sm text-slate-500">({count})</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <motion.span
          className="material-icons-outlined text-3xl text-primary-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          sync
        </motion.span>
      </motion.div>
      <p className="text-lg font-semibold text-slate-900">Matching transactions...</p>
      <p className="text-sm text-slate-500 mt-1">
        This may take a moment
      </p>
    </div>
  );
}

interface EmptyStateProps {
  filter: FilterType;
}

function EmptyState({ filter }: EmptyStateProps) {
  const messages = {
    confirmed: { icon: 'check_circle', text: 'No confirmed matches' },
    discrepancy: { icon: 'celebration', text: 'No discrepancies found!' },
    unmatched: { icon: 'thumb_up', text: 'Everything is matched!' },
    all: { icon: 'inbox', text: 'No results' },
  };

  const { icon, text } = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <span className="material-icons-outlined text-5xl mb-3">{icon}</span>
      <p className="text-lg">{text}</p>
    </div>
  );
}
