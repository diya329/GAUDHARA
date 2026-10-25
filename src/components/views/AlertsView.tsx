import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FlaskConical,
  Filter
} from 'lucide-react';
import type { AlertItem } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface AlertsViewProps {
  onStartScreening: (animalTag: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onStartScreening }) => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleUpdateStatus = async (alertId: string, status: 'resolved' | 'dismissed') => {
    await api.updateAlertStatus(alertId, status);
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, status } : a));
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSev = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchesStat = filterStatus === 'all' || a.status === filterStatus;
    return matchesSev && matchesStat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            {t.alertsTitle}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.alertsSubtitle}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white text-[#334155]"
          >
            <option value="pending">{t.pending}</option>
            <option value="resolved">{t.resolved}</option>
            <option value="dismissed">{t.dismissed || 'Dismissed'}</option>
            <option value="all">{t.filterAll}</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white text-[#334155]"
          >
            <option value="all">{t.filterAll}</option>
            <option value="critical">{t.critical}</option>
            <option value="warning">{t.warning}</option>
            <option value="normal">{t.normal}</option>
          </select>
        </div>
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[#64748B]">{t.loading}</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#64748B] space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
          <p className="font-semibold text-[#0F172A]">{t.noAlertsFound}</p>
          <p>{t.normal}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-lg border bg-white flex flex-col sm:flex-row items-start justify-between gap-4 transition-colors ${
                  isCritical ? 'border-[#FCA5A5] bg-[#FFFBFB]' :
                  isWarning ? 'border-[#FDE68A] bg-[#FFFDF5]' :
                  'border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded mt-0.5 shrink-0 ${
                    isCritical ? 'bg-[#FEE2E2] text-[#DC2626]' :
                    isWarning ? 'bg-[#FEF3C7] text-[#D97706]' :
                    'bg-[#F1F5F9] text-[#64748B]'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172A]">
                        {alert.title}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-[#E2E8F0] rounded font-semibold text-[#334155]">
                        {alert.animal_tag}
                      </span>
                      <span className="text-xs text-[#475569]">
                        ({alert.animal_name})
                      </span>
                      {alert.affected_quarter && (
                        <span className="font-mono text-xs text-[#DC2626] font-bold">
                          [{t.quarter} {alert.affected_quarter}]
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="p-3 bg-white/80 border border-[#E2E8F0] rounded text-xs space-y-1">
                      <strong className="text-[#1B4332] block font-semibold">
                        {t.veterinaryNotes}:
                      </strong>
                      <p className="text-[#334155]">{alert.recommended_action}</p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      <span>·</span>
                      <span className="capitalize font-medium text-[#475569]">{alert.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => onStartScreening(alert.animal_tag)}
                    className="w-full sm:w-auto px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded flex items-center justify-center gap-1"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>{t.screenNow}</span>
                  </button>

                  {alert.status === 'pending' && (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                        className="px-2.5 py-1 text-xs font-medium text-[#166534] bg-[#DCFCE7] hover:bg-[#BBF7D0] rounded border border-[#86EFAC]"
                      >
                        {t.resolveAlert}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'dismissed')}
                        className="px-2.5 py-1 text-xs font-medium text-[#64748B] hover:text-[#0F172A] rounded border border-[#CBD5E1]"
                      >
                        {t.dismissed}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
