import React from 'react';
import { WifiOff, Database, RefreshCw, UploadCloud, ChevronRight } from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';

interface OfflineBannerProps {
  className?: string;
  showDetailsButton?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  className = '',
  showDetailsButton = true 
}) => {
  const { 
    isOffline, 
    simulateOffline, 
    cacheStatus, 
    offlineQueue, 
    setShowOfflineModal,
    isSyncing,
    syncOfflineQueueNow
  } = useOffline();

  if (!isOffline && offlineQueue.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs ${
      isOffline 
        ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]' 
        : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
    } ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md shrink-0 ${
          isOffline ? 'bg-[#FDE68A] text-[#B45309]' : 'bg-[#DBEAFE] text-[#1D4ED8]'
        }`}>
          {isOffline ? <WifiOff className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
        </div>
        <div>
          <div className="font-bold flex items-center gap-1.5">
            <span>
              {isOffline 
                ? 'Offline Mode Active — Operating on Local IndexedDB Storage' 
                : `${offlineQueue.length} Screening(s) Pending Cloud Sync`}
            </span>
            {simulateOffline && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#FDE68A] text-[#78350F]">
                Simulated
              </span>
            )}
          </div>
          <p className="text-[11px] opacity-90 mt-0.5">
            {isOffline 
              ? `Viewing ${cacheStatus?.animal_count || 6} animal records & ${cacheStatus?.screening_count || 5} historical screening logs cached locally.`
              : 'Network restored. Click sync to push records collected in offline sheds to cloud storage.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {!isOffline && offlineQueue.length > 0 && (
          <button
            onClick={() => syncOfflineQueueNow()}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded bg-[#1D4ED8] text-white hover:bg-[#1E40AF] font-semibold text-[11px] flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Now ({offlineQueue.length})
          </button>
        )}

        {showDetailsButton && (
          <button
            onClick={() => setShowOfflineModal(true)}
            className={`px-2.5 py-1 rounded font-semibold text-[11px] flex items-center gap-1 border transition-colors ${
              isOffline
                ? 'bg-white border-[#FBBF24] text-[#B45309] hover:bg-[#FFFBEB]'
                : 'bg-white border-[#93C5FD] text-[#1E40AF] hover:bg-[#F0FDF4]'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>Manage Cache</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
