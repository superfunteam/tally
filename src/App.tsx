import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BottomTabs,
  FAB,
  Button,
  InstallPrompt,
} from './components';
import { ReceiptPanel } from './components/ReceiptPanel';
import { StatementPanel } from './components/StatementPanel';
import { ProcessingQueue } from './components/ProcessingQueue';
import { ResultsDashboard } from './components/ResultsDashboard';
import { useQueue } from './hooks/useQueue';
import { useApi } from './hooks/useApi';
import { useCamera } from './hooks/useCamera';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useLocalStorage } from './hooks/useLocalStorage';
import type {
  TabType,
  AppView,
  ReceiptImage,
  StatementFile,
  MatchResults,
  ReceiptTransaction,
  StatementTransaction,
} from './types';

function App() {
  // View and tab state
  const [view, setView] = useState<AppView>('upload');
  const [activeTab, setActiveTab] = useState<TabType>('receipts');

  // Data state with persistence
  const [receipts, setReceipts] = useLocalStorage<ReceiptImage[]>('tally-receipts', []);
  const [statements, setStatements] = useLocalStorage<StatementFile[]>('tally-statements', []);
  const [results, setResults] = useLocalStorage<MatchResults | null>('tally-results', null);

  // Processing state
  const [isMatching, setIsMatching] = useState(false);

  // API hooks
  const api = useApi();

  // PWA Install
  const pwa = usePWAInstall();

  // Receipt queue
  const receiptQueue = useQueue<File, ReceiptTransaction[]>({
    maxConcurrent: 3,
    processor: async (file) => {
      const response = await api.analyzeReceipt(file);
      if (!response.success) throw new Error(response.error);
      return response.transactions;
    },
    onItemComplete: (id, transactions) => {
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'complete', transactions } : r
        )
      );
    },
    onItemError: (id, error) => {
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'error', error: error.message } : r
        )
      );
    },
  });

  // Statement queue
  const statementQueue = useQueue<File, StatementTransaction[]>({
    maxConcurrent: 2,
    processor: async (file) => {
      const response = await api.parseStatement(file);
      if (!response.success) throw new Error(response.error);
      return response.transactions;
    },
    onItemComplete: (id, transactions) => {
      setStatements((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: 'complete', transactions, pageCount: transactions.length > 0 ? 1 : 0 }
            : s
        )
      );
    },
    onItemError: (id, error) => {
      setStatements((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: 'error', error: error.message } : s
        )
      );
    },
  });

  // Camera hook
  const camera = useCamera({
    onCapture: (files) => handleAddReceipts(files),
  });

  // Combined queue stats
  const combinedStats = {
    total: receiptQueue.stats.total + statementQueue.stats.total,
    pending: receiptQueue.stats.pending + statementQueue.stats.pending,
    processing: receiptQueue.stats.processing + statementQueue.stats.processing,
    complete: receiptQueue.stats.complete + statementQueue.stats.complete,
    error: receiptQueue.stats.error + statementQueue.stats.error,
  };

  // Handlers
  const handleAddReceipts = useCallback(
    (files: File[]) => {
      pwa.markUpload();

      files.forEach((file) => {
        const id = `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const preview = URL.createObjectURL(file);

        setReceipts((prev) => [
          ...prev,
          {
            id,
            file,
            preview,
            status: 'pending',
            transactions: [],
          },
        ]);

        receiptQueue.addToQueue(id, file);
      });
    },
    [receiptQueue, setReceipts, pwa]
  );

  const handleAddStatements = useCallback(
    (files: File[]) => {
      pwa.markUpload();

      files.forEach((file) => {
        const id = `statement-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        setStatements((prev) => [
          ...prev,
          {
            id,
            file,
            name: file.name,
            status: 'pending',
            transactions: [],
          },
        ]);

        statementQueue.addToQueue(id, file);
      });
    },
    [statementQueue, setStatements, pwa]
  );

  const handleRemoveReceipt = useCallback(
    (id: string) => {
      setReceipts((prev) => {
        const receipt = prev.find((r) => r.id === id);
        if (receipt) URL.revokeObjectURL(receipt.preview);
        return prev.filter((r) => r.id !== id);
      });
      receiptQueue.removeFromQueue(id);
    },
    [receiptQueue, setReceipts]
  );

  const handleRemoveStatement = useCallback(
    (id: string) => {
      setStatements((prev) => prev.filter((s) => s.id !== id));
      statementQueue.removeFromQueue(id);
    },
    [statementQueue, setStatements]
  );

  const handleRetryReceipt = useCallback(
    (id: string) => {
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'pending', error: undefined } : r))
      );
      receiptQueue.retryItem(id);
    },
    [receiptQueue, setReceipts]
  );

  const handleRetryStatement = useCallback(
    (id: string) => {
      setStatements((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'pending', error: undefined } : s))
      );
      statementQueue.retryItem(id);
    },
    [statementQueue, setStatements]
  );

  const handleMatch = useCallback(async () => {
    const receiptTransactions = receipts
      .filter((r) => r.status === 'complete')
      .flatMap((r) => r.transactions);

    const statementTransactions = statements
      .filter((s) => s.status === 'complete')
      .flatMap((s) => s.transactions);

    if (receiptTransactions.length === 0 || statementTransactions.length === 0) {
      alert('Please upload at least one receipt and one statement first.');
      return;
    }

    setView('results');
    setIsMatching(true);

    try {
      const response = await api.matchTransactions(receiptTransactions, statementTransactions);
      if (response.success) {
        setResults(response.results);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Matching error:', error);
      alert('Failed to match transactions. Please try again.');
    } finally {
      setIsMatching(false);
    }
  }, [receipts, statements, api, setResults]);

  const handleResolve = useCallback(
    (matchId: string) => {
      setResults((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          confirmed: prev.confirmed.map((m) =>
            m.id === matchId ? { ...m, resolved: true } : m
          ),
          discrepancies: prev.discrepancies.map((m) =>
            m.id === matchId ? { ...m, resolved: true } : m
          ),
        };
      });
    },
    [setResults]
  );

  const handleClearAll = useCallback(() => {
    receipts.forEach((r) => URL.revokeObjectURL(r.preview));
    setReceipts([]);
    setStatements([]);
    setResults(null);
    receiptQueue.clearQueue();
    statementQueue.clearQueue();
    setView('upload');
  }, [receipts, setReceipts, setStatements, setResults, receiptQueue, statementQueue]);

  // Check if ready to match
  const receiptsDone = receipts.filter((r) => r.status === 'complete').length;
  const statementsDone = statements.filter((s) => s.status === 'complete').length;
  const canMatch = receiptsDone > 0 && statementsDone > 0;

  // FAB actions for receipts tab
  const receiptActions = [
    { icon: 'photo_camera', label: 'Take Photo', onClick: camera.openCamera },
    { icon: 'photo_library', label: 'From Gallery', onClick: camera.openGallery },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold text-primary-600">Tally</h1>
          <p className="text-xs text-slate-500">Track if your bills match</p>
        </div>

        <div className="flex items-center gap-2">
          {view === 'upload' && canMatch && (
            <Button
              variant="primary"
              size="sm"
              icon="compare_arrows"
              onClick={handleMatch}
            >
              Match
            </Button>
          )}

          {(receipts.length > 0 || statements.length > 0) && (
            <button
              onClick={handleClearAll}
              className="p-2 text-slate-400 hover:text-slate-600"
              title="Clear all"
            >
              <span className="material-icons-outlined">delete_outline</span>
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              {/* Mobile: Tab content */}
              <div className="h-full md:hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'receipts' ? (
                    <motion.div
                      key="receipts"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="h-full"
                    >
                      <ReceiptPanel
                        receipts={receipts}
                        onAddFiles={handleAddReceipts}
                        onRemove={handleRemoveReceipt}
                        onRetry={handleRetryReceipt}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="statements"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="h-full"
                    >
                      <StatementPanel
                        statements={statements}
                        onAddFiles={handleAddStatements}
                        onRemove={handleRemoveStatement}
                        onRetry={handleRetryStatement}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop: Split view */}
              <div className="hidden md:flex h-full">
                <div className="w-1/2 border-r border-slate-200">
                  <ReceiptPanel
                    receipts={receipts}
                    onAddFiles={handleAddReceipts}
                    onRemove={handleRemoveReceipt}
                    onRetry={handleRetryReceipt}
                  />
                </div>
                <div className="w-1/2">
                  <StatementPanel
                    statements={statements}
                    onAddFiles={handleAddStatements}
                    onRemove={handleRemoveStatement}
                    onRetry={handleRetryStatement}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ResultsDashboard
                results={results || {
                  confirmed: [],
                  discrepancies: [],
                  unmatchedReceipts: [],
                  unmatchedStatements: [],
                }}
                onResolve={handleResolve}
                onBack={() => setView('upload')}
                isMatching={isMatching}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile bottom tabs */}
      {view === 'upload' && (
        <div className="md:hidden">
          <BottomTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            receiptCount={receipts.length}
            statementCount={statements.length}
          />
        </div>
      )}

      {/* FAB for mobile */}
      {view === 'upload' && activeTab === 'receipts' && (
        <div className="md:hidden">
          <FAB icon="add" actions={receiptActions} />
        </div>
      )}

      {/* Processing queue indicator */}
      {combinedStats.total > 0 && combinedStats.complete < combinedStats.total && (
        <ProcessingQueue
          stats={combinedStats}
          isPaused={receiptQueue.isPaused || statementQueue.isPaused}
          onPause={() => {
            receiptQueue.pause();
            statementQueue.pause();
          }}
          onResume={() => {
            receiptQueue.resume();
            statementQueue.resume();
          }}
          onClear={() => {
            receiptQueue.clearQueue();
            statementQueue.clearQueue();
          }}
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt
        show={pwa.shouldShowPrompt}
        isIOS={pwa.isIOS}
        onInstall={pwa.promptInstall}
        onDismiss={pwa.dismissPrompt}
      />
    </div>
  );
}

export default App;
