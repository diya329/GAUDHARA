import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  HardDrive, 
  Layers, 
  Check, 
  FileText,
  UploadCloud,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../i18n/LanguageContext';

interface OfflineCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineCacheModal: React.FC<OfflineCacheModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { 
    isOnline, 
    isOffline, 
    simulateOffline, 
    setSimulateOffline, 
    cacheStatus, 
    offlineQueue, 
    isSyncing, 
    syncOfflineQueueNow, 
    preloadCache, 
    clearCache, 
    lastSyncReport 
  } = useOffline();

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreload = async () => {
    try {
      setFeedbackMsg(t.loading);
      await preloadCache();
      setFeedbackMsg(t.resolved);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch {
      setFeedbackMsg(t.critical);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleSyncQueue = async () => {
    try {
      setFeedbackMsg(t.loading);
      const report = await syncOfflineQueueNow();
      if (report.synced_screenings > 0) {
        setFeedbackMsg(`${t.resolved}: ${report.synced_screenings}`);
      } else if (report.errors.length > 0) {
        setFeedbackMsg(`${t.critical}: ${report.errors[0]}`);
      } else {
        setFeedbackMsg(t.noAlertsFound);
      }
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (err: any) {
      setFeedbackMsg(`${t.critical}: ${err.message || 'Error'}`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all local IndexedDB records? Historical data will be re-fetched next time online.')) {
      await clearCache();
      setFeedbackMsg(t.resolved);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8FAF9] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${isOffline ? 'bg-[#D97706]' : 'bg-[#1B4332]'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
                {t.offlineStorageModalTitle}
              </h2>
              <p className="text-xs text-[#64748B]">
                {t.offlineStorageModalSubtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Notification Feedback Banner */}
          {feedbackMsg && (
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs font-medium text-[#065F46] flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Current Connectivity & Simulation Mode */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFCFB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${isOffline ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#DCFCE7] text-[#166534]'}`}>
                {isOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0F172A]">
                    {isOffline ? t.offlineModeActive : t.onlineSync}
                  </span>
                  {simulateOffline && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      {t.simulateOffline}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {isOffline 
                    ? t.offlineModeActive
                    : t.onlineSync}
                </p>
              </div>
            </div>

            {/* Offline Simulation Toggle */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#CBD5E1] shadow-2xs self-start sm:self-auto">
              <label htmlFor="simulate-offline-toggle" className="text-xs font-semibold text-[#334155] cursor-pointer">
                {t.simulateOffline}
              </label>
              <input
                id="simulate-offline-toggle"
                type="checkbox"
                checked={simulateOffline}
                onChange={(e) => setSimulateOffline(e.target.checked)}
                className="w-4 h-4 text-[#1B4332] rounded focus:ring-[#1B4332] cursor-pointer"
              />
            </div>
          </div>

          {/* Cache Metrics Grid */}
          <div>
            <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              {t.offlineCached}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                <span className="text-[11px] text-[#64748B] block">{t.animals}</span>
                <span className="text-lg font-bold text-[#0F172A]">
                  {cacheStatus?.animal_count ?? 0}
                </span>
                <span className="text-[10px] text-[#059669] block font-medium">{t.cachedHerdProfiles}</span>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                <span className="text-[11px] text-[#64748B] block">{t.screeningLogs}</span>
                <span className="text-lg font-bold text-[#0F172A]">
                  {cacheStatus?.screening_count ?? 0}
                </span>
                <span className="text-[10px] text-[#2563EB] block font-medium">{t.quarter}</span>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                <span className="text-[11px] text-[#64748B] block">{t.activeAlerts}</span>
                <span className="text-lg font-bold text-[#0F172A]">
                  {cacheStatus?.alert_count ?? 0}
                </span>
                <span className="text-[10px] text-[#D97706] block font-medium">{t.alerts}</span>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                <span className="text-[11px] text-[#64748B] block">{t.storageUsed}</span>
                <span className="text-lg font-bold text-[#0F172A]">
                  {cacheStatus?.storage_estimate_kb ? `${cacheStatus.storage_estimate_kb} KB` : '~320 KB'}
                </span>
                <span className="text-[10px] text-[#64748B] block">IndexedDB</span>
              </div>
            </div>
            
            {cacheStatus?.last_synced_at && (
              <p className="text-[11px] text-[#64748B] mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#94A3B8]" />
                {t.lastScreened}: {new Date(cacheStatus.last_synced_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Offline Pending Screenings Queue */}
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 bg-[#F8FAF9] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#1B4332]" />
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  {t.offlineQueueTitle} ({offlineQueue.length})
                </h3>
              </div>
              {offlineQueue.length > 0 && (
                <button
                  onClick={handleSyncQueue}
                  disabled={isSyncing || isOffline}
                  className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 ${
                    isOffline 
                      ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                      : 'bg-[#1B4332] text-white hover:bg-[#2D6A4F]'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {t.syncCloud}
                </button>
              )}
            </div>

            {offlineQueue.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">
                <CheckCircle2 className="w-6 h-6 text-[#16A34A] mx-auto mb-1.5 opacity-80" />
                <span>{t.normal}</span>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] max-h-48 overflow-y-auto">
                {offlineQueue.map((item) => (
                  <div key={item.id} className="p-3 text-xs flex items-center justify-between hover:bg-[#F8FAF9]">
                    <div>
                      <div className="font-semibold text-[#0F172A] flex items-center gap-2">
                        <span>{item.animal_tag} ({item.animal_name})</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#E2E8F0] text-[#475569] font-mono">
                          {item.quarter}
                        </span>
                        <span className="text-[10px] text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.2 rounded font-medium">
                          EC: {item.electrical_conductivity} mS/cm
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        {new Date(item.queued_at || item.screened_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                      {t.pending}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technical Info Box */}
          <div className="p-3.5 bg-[#F1F5F9] rounded-lg border border-[#CBD5CD] text-xs text-[#475569] space-y-1">
            <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#1B4332]" />
              {t.offlineStorageModalTitle}:
            </div>
            <p className="text-[11px] leading-relaxed">
              {t.offlineStorageModalSubtitle}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-[#F8FAF9] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium text-[#DC2626] hover:bg-[#FEE2E2] rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.clearCache}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreload}
              disabled={isSyncing}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#1B4332] bg-white border border-[#1B4332] hover:bg-[#F1F5F3] rounded-md flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {t.cacheHerdNow}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-[#1B4332] text-white hover:bg-[#2D6A4F] rounded-md transition-colors"
            >
              {t.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
