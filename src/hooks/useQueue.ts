import { useState, useCallback, useRef, useEffect } from 'react';
import type { ProcessingStatus } from '../types';

interface QueueItem<T> {
  id: string;
  data: T;
  status: ProcessingStatus;
  retries: number;
  error?: string;
}

interface UseQueueOptions<T, R> {
  maxConcurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
  processor: (item: T) => Promise<R>;
  onItemComplete?: (id: string, result: R) => void;
  onItemError?: (id: string, error: Error) => void;
}

export function useQueue<T, R>(options: UseQueueOptions<T, R>) {
  const {
    maxConcurrent = 3,
    maxRetries = 3,
    retryDelay = 1000,
    processor,
    onItemComplete,
    onItemError,
  } = options;

  const [queue, setQueue] = useState<QueueItem<T>[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const activeCount = useRef(0);
  const processingRef = useRef(false);

  const updateItemStatus = useCallback((id: string, status: ProcessingStatus, error?: string) => {
    setQueue(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status, error } : item
      )
    );
  }, []);

  const processItem = useCallback(async (item: QueueItem<T>) => {
    activeCount.current++;
    updateItemStatus(item.id, 'analyzing');

    try {
      updateItemStatus(item.id, 'extracting');
      const result = await processor(item.data);
      updateItemStatus(item.id, 'complete');
      onItemComplete?.(item.id, result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      if (item.retries < maxRetries) {
        // Retry with exponential backoff
        setQueue(prev =>
          prev.map(q =>
            q.id === item.id
              ? { ...q, status: 'pending', retries: q.retries + 1 }
              : q
          )
        );
        setTimeout(() => {
          processingRef.current = false;
        }, retryDelay * Math.pow(2, item.retries));
      } else {
        updateItemStatus(item.id, 'error', err.message);
        onItemError?.(item.id, err);
      }
    } finally {
      activeCount.current--;
    }
  }, [processor, updateItemStatus, onItemComplete, onItemError, maxRetries, retryDelay]);

  const processQueue = useCallback(async () => {
    if (processingRef.current || isPaused) return;
    processingRef.current = true;

    while (true) {
      if (isPaused) break;

      const pendingItems = queue.filter(item => item.status === 'pending');
      if (pendingItems.length === 0) break;
      if (activeCount.current >= maxConcurrent) break;

      const nextItem = pendingItems[0];
      if (nextItem) {
        updateItemStatus(nextItem.id, 'uploading');
        processItem(nextItem);
      }

      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    processingRef.current = false;
  }, [queue, isPaused, maxConcurrent, processItem, updateItemStatus]);

  // Trigger processing when queue changes
  useEffect(() => {
    processQueue();
  }, [queue, isPaused, processQueue]);

  const addToQueue = useCallback((id: string, data: T) => {
    setQueue(prev => [
      ...prev,
      {
        id,
        data,
        status: 'pending',
        retries: 0,
      },
    ]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: 'pending', retries: 0, error: undefined }
          : item
      )
    );
  }, []);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => {
    setIsPaused(false);
    processingRef.current = false;
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    activeCount.current = 0;
  }, []);

  const getItemStatus = useCallback((id: string) => {
    return queue.find(item => item.id === id);
  }, [queue]);

  const stats = {
    total: queue.length,
    pending: queue.filter(i => i.status === 'pending').length,
    processing: queue.filter(i => ['uploading', 'analyzing', 'extracting'].includes(i.status)).length,
    complete: queue.filter(i => i.status === 'complete').length,
    error: queue.filter(i => i.status === 'error').length,
  };

  return {
    queue,
    stats,
    isPaused,
    addToQueue,
    removeFromQueue,
    retryItem,
    pause,
    resume,
    clearQueue,
    getItemStatus,
  };
}
