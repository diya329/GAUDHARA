import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { OfflineCacheMetadata, OfflineQueuedScreening, OfflineSyncReport } from '../types';
import { api } from '../services/api';
import { offlineStorage } from '../services/indexedDbCache';

interface OfflineContextType {
  isOnline: boolean;
  isOffline: boolean;
  simulateOffline: boolean;
  setSimulateOffline: (val: boolean) => void;
  cacheStatus: OfflineCacheMetadata | null;
  offlineQueue: OfflineQueuedScreening[];
  isSyncing: boolean;
  lastSyncReport: OfflineSyncReport | null;
  syncOfflineQueueNow: () => Promise<OfflineSyncReport>;
  preloadCache: () => Promise<void>;
  clearCache: () => Promise<void>;
  refreshCacheStatus: () => Promise<void>;
  showOfflineModal: boolean;
  setShowOfflineModal: (show: boolean) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [realOnline, setRealOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const [cacheStatus, setCacheStatus] = useState<OfflineCacheMetadata | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedScreening[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncReport, setLastSyncReport] = useState<OfflineSyncReport | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);

  const isEffectiveOffline = !realOnline || simulateOffline;
  const isEffectiveOnline = realOnline && !simulateOffline;

  const refreshCacheStatus = useCallback(async () => {
    try {
      const status = await api.getOfflineCacheStatus();
      setCacheStatus(status);
      const queue = await api.getOfflineQueue();
      setOfflineQueue(queue);
    } catch (e) {
      console.warn('Failed to refresh offline cache status:', e);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setRealOnline(true);
      refreshCacheStatus();
    };

    const handleOffline = () => {
      setRealOnline(false);
      refreshCacheStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache metadata check and pre-seeding
    refreshCacheStatus();

    const interval = setInterval(refreshCacheStatus, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshCacheStatus]);

  // Synchronize queued screenings
  const syncOfflineQueueNow = async (): Promise<OfflineSyncReport> => {
    if (isEffectiveOffline) {
      const emptyReport: OfflineSyncReport = {
        synced_screenings: 0,
        failed_screenings: 0,
        synced_at: new Date().toISOString(),
        errors: ['Cannot synchronize while offline mode is active. Reconnect network or disable offline simulation.']
      };
      setLastSyncReport(emptyReport);
      return emptyReport;
    }

    setIsSyncing(true);
    try {
      const report = await api.syncOfflineQueue();
      setLastSyncReport(report);
      await refreshCacheStatus();
      return report;
    } catch (err: any) {
      const errorReport: OfflineSyncReport = {
        synced_screenings: 0,
        failed_screenings: offlineQueue.length,
        synced_at: new Date().toISOString(),
        errors: [err.message || 'Synchronization failed']
      };
      setLastSyncReport(errorReport);
      return errorReport;
    } finally {
      setIsSyncing(false);
    }
  };

  const preloadCache = async () => {
    setIsSyncing(true);
    try {
      const status = await api.preloadOfflineCache();
      setCacheStatus(status);
      await refreshCacheStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  const clearCache = async () => {
    await api.clearOfflineCache();
    await refreshCacheStatus();
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline: isEffectiveOnline,
        isOffline: isEffectiveOffline,
        simulateOffline,
        setSimulateOffline,
        cacheStatus,
        offlineQueue,
        isSyncing,
        lastSyncReport,
        syncOfflineQueueNow,
        preloadCache,
        clearCache,
        refreshCacheStatus,
        showOfflineModal,
        setShowOfflineModal
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
