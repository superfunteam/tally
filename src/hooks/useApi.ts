import { useCallback } from 'react';
import type {
  ReceiptTransaction,
  StatementTransaction,
  AnalyzeReceiptResponse,
  ParseStatementResponse,
  MatchTransactionsResponse,
} from '../types';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useApi() {
  const analyzeReceipt = useCallback(async (file: File): Promise<AnalyzeReceiptResponse> => {
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          mimeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze receipt');
      }

      return response.json();
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      throw error;
    }
  }, []);

  const parseStatement = useCallback(async (file: File): Promise<ParseStatementResponse> => {
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const response = await fetch('/api/parse-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64,
          mediaType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse statement');
      }

      return response.json();
    } catch (error) {
      console.error('Error parsing statement:', error);
      throw error;
    }
  }, []);

  const matchTransactions = useCallback(
    async (
      receipts: ReceiptTransaction[],
      statements: StatementTransaction[]
    ): Promise<MatchTransactionsResponse> => {
      try {
        const response = await fetch('/api/match-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receipts,
            statements,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to match transactions');
        }

        return response.json();
      } catch (error) {
        console.error('Error matching transactions:', error);
        throw error;
      }
    },
    []
  );

  return {
    analyzeReceipt,
    parseStatement,
    matchTransactions,
  };
}
