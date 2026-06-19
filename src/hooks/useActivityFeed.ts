import { useState, useEffect, useCallback } from 'react';
import type { ActivityEntry } from '../types';
import { getAllLogs } from '../lib/contract';

export function useActivityFeed(contractId: string) {
  const [feed, setFeed] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const fetchFeed = useCallback(async () => {
    if (!contractId || contractId === 'your_deployed_contract_address_here') {
      return;
    }
    setIsPolling(true);
    try {
      const logs = await getAllLogs(contractId);
      // Sort ascending (oldest first) so that console appending works like Level 1
      const sortedLogs = logs.sort((a, b) => a.timestamp - b.timestamp);
      setFeed(sortedLogs);
    } catch (e) {
      console.error('Error fetching on-chain activity logs:', e);
    } finally {
      setIsPolling(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (!contractId || contractId === 'your_deployed_contract_address_here') {
      return;
    }

    setIsLoading(true);
    fetchFeed().finally(() => setIsLoading(false));

    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, [contractId, fetchFeed]);

  return {
    feed,
    isLoading,
    isPolling,
    refresh: fetchFeed,
  };
}
