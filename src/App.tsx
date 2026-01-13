import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BottomTabs,
  FAB,
  Button,
  InstallPrompt,
  Modal,
  ColorModePicker,
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
import { useColorMode } from './hooks/useColorMode';
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

  // Modal states
  const [showGuide, setShowGuide] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // First-time guide tracking
  const [hasSeenGuide, setHasSeenGuide] = useLocalStorage<boolean>('tally-has-seen-guide', false);

  // Show guide on first load
  useEffect(() => {
    if (!hasSeenGuide) {
      // Small delay to let the app render first
      const timer = setTimeout(() => setShowGuide(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenGuide]);

  // Track when user closes guide
  const handleCloseGuide = useCallback(() => {
    setShowGuide(false);
    if (!hasSeenGuide) {
      setHasSeenGuide(true);
    }
  }, [hasSeenGuide, setHasSeenGuide]);

  // Color mode
  const [colorMode, setColorMode] = useColorMode();

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
    setShowClearConfirm(false);
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

  const hasData = receipts.length > 0 || statements.length > 0;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary-600)' }}>Tally</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Track if your bills match</p>
        </div>

        <div className="flex items-center gap-1">
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

          <ColorModePicker mode={colorMode} onChange={setColorMode} />

          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Guide"
          >
            <span className="material-icons-outlined text-xl" style={{ color: 'var(--text-secondary)' }}>help_outline</span>
          </button>

          {hasData && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Clear all"
              style={{ color: 'var(--color-primary-600)' }}
            >
              <span className="material-icons-outlined text-xl">delete_outline</span>
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
                <div className="w-1/2 border-r" style={{ borderColor: 'var(--border-color)' }}>
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

      {/* Guide Modal */}
      <Modal isOpen={showGuide} onClose={handleCloseGuide} title="How Tally Works">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-icons-outlined text-primary-600">lock</span>
            </div>
            <div>
              <h3 className="font-semibold">100% Private</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                All data stays in your browser's local storage. No accounts, no cloud uploads, no tracking.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-icons-outlined text-primary-600">auto_delete</span>
            </div>
            <div>
              <h3 className="font-semibold">Use Once, Delete</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                After reviewing your matches, tap the trash icon to clear everything. No data is retained.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-icons-outlined text-primary-600">receipt_long</span>
            </div>
            <div>
              <h3 className="font-semibold">Keep Paper Receipts</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Save your paper receipts all month. At month's end, snap photos and upload your statement. Done in 2 minutes!
              </p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold mb-2">Quick Steps:</h4>
            <ol className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>1. Upload receipt photos (can have multiple per image)</li>
              <li>2. Upload your PDF bank statement</li>
              <li>3. Tap "Match" to find discrepancies</li>
              <li>4. Review results, then clear your data</li>
            </ol>
          </div>

          <p className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
            Tally ho! Track if your bills match.
          </p>
        </div>
      </Modal>

      {/* Clear Confirmation Modal */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear All Data?">
        <div className="space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>
            This will permanently delete all uploaded receipts, statements, and match results from your browser.
          </p>

          <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2 text-sm">
              <span className="material-icons-outlined text-lg" style={{ color: 'var(--text-muted)' }}>info</span>
              <span style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon="delete"
              onClick={handleClearAll}
              className="flex-1"
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
