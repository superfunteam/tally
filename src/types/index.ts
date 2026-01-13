// Receipt Types
export interface ReceiptTransaction {
  id: string;
  merchantName: string;
  date: string;
  time?: string;
  location?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  tipHandwritten?: boolean;
  printedTotal?: number;
  handwrittenTotal?: number;
  total: number;
  paymentMethod?: string;
  confidence: number;
  rawText?: string;
  edited?: boolean;
}

export interface ReceiptImage {
  id: string;
  file?: File; // Optional - File objects can't be serialized to localStorage
  preview: string;
  status: ProcessingStatus;
  transactions: ReceiptTransaction[];
  error?: string;
}

// Statement Types
export interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  rawText?: string;
}

export interface StatementFile {
  id: string;
  file?: File; // Optional - File objects can't be serialized to localStorage
  name: string;
  pageCount?: number;
  status: ProcessingStatus;
  transactions: StatementTransaction[];
  error?: string;
}

// Matching Types
export interface TransactionMatch {
  id: string;
  receiptTransaction: ReceiptTransaction;
  statementTransaction: StatementTransaction;
  confidence: number;
  status: 'confirmed' | 'discrepancy' | 'unmatched';
  difference?: number;
  resolved?: boolean;
}

export interface MatchResults {
  confirmed: TransactionMatch[];
  discrepancies: TransactionMatch[];
  unmatchedReceipts: ReceiptTransaction[];
  unmatchedStatements: StatementTransaction[];
}

// Processing Types
export type ProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'analyzing'
  | 'extracting'
  | 'complete'
  | 'error';

export interface ProcessingStage {
  status: ProcessingStatus;
  message: string;
  progress?: number;
}

// Queue Types
export interface QueueItem {
  id: string;
  type: 'receipt' | 'statement';
  status: ProcessingStatus;
  retries: number;
  createdAt: number;
}

// API Response Types
export interface AnalyzeReceiptResponse {
  success: boolean;
  transactions: ReceiptTransaction[];
  receiptCount: number;
  error?: string;
}

export interface ParseStatementResponse {
  success: boolean;
  transactions: StatementTransaction[];
  pageCount: number;
  error?: string;
}

export interface MatchTransactionsResponse {
  success: boolean;
  results: MatchResults;
  error?: string;
}

// App State Types
export type AppView = 'upload' | 'processing' | 'results';
export type TabType = 'receipts' | 'statements';
