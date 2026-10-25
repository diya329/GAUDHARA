import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  ChevronRight, 
  FlaskConical, 
  Cpu, 
  CheckCircle2,
  X,
  HardDrive,
  Database
} from 'lucide-react';
import type { ScreeningRecord } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { NodusExecutionPanel } from '../common/NodusExecutionPanel';
import { OfflineBanner } from '../common/OfflineBanner';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const HistoryView: React.FC = () => {
  const { isOffline, cacheStatus, preloadCache, isSyncing } = useOffline();
  const { t } = useLanguage();
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [selectedScreening, setSelectedScreening] = useState<ScreeningRecord | null>(null);

  const loadScreenings = () => {
    setLoading(true);
    api.getScreenings().then((data) => {
      setScreenings(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadScreenings();
  }, [isOffline]);

  const exportCsv = () => {
    if (screenings.length === 0) return;
    const headers = ['Screening Date', 'Cow Tag', 'Cow Name', 'Quarter', 'Conductivity (mS/cm)', 'SCC Estimate', 'pH', 'Risk Level', 'Risk Score', 'Execution ID', 'Provider'];
    const rows = screenings.map(s => [
      s.screened_at,
      s.animal_tag,
      s.animal_name,
      s.quarter,
      s.electrical_conductivity,
      s.scc_estimate,
      s.ph_level,
      s.compute_result.risk_level,
      s.compute_result.risk_score,
      s.compute_result.execution_id,
      s.compute_result.provider
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GauDhara_Screenings_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredScreenings = screenings.filter((s) => {
    const matchesSearch =
      s.animal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.animal_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.compute_result.execution_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesQuarter = quarterFilter === 'all' || s.quarter === quarterFilter;
    return matchesSearch && matchesQuarter;
  });

  return (
    <div className="space-y-6">
      {/* Offline Status & IndexedDB Cache Banner */}
      <OfflineBanner />

      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.screeningLogs}
            </h1>
            {isOffline && (
              <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] flex items-center gap-1">
                <Database className="w-3 h-3" />
                {t.offlineCached}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.detailedAnalytics}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={t.searchHerdPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
            />
          </div>

          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white text-[#334155]"
          >
            <option value="all">{t.filterAll}</option>
            <option value="FL">{t.quarterFL} (FL)</option>
            <option value="FR">{t.quarterFR} (FR)</option>
            <option value="RL">{t.quarterRL} (RL)</option>
            <option value="RR">{t.quarterRR} (RR)</option>
            <option value="composite">{t.quarterSymmetry}</option>
          </select>

          <button
            onClick={exportCsv}
            disabled={screenings.length === 0}
            className="px-3 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-md bg-white text-[#334155] hover:bg-[#F8FAF9] flex items-center gap-1.5 shadow-2xs"
            title={t.exportCsv}
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden md:inline">{t.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* Screenings Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#64748B]">{t.loading}</div>
        ) : filteredScreenings.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B] space-y-2">
            <FlaskConical className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p>{t.noAlertsFound}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">{t.lastScreened}</th>
                  <th className="px-4 py-3">{t.cowName} &amp; {t.tagId}</th>
                  <th className="px-4 py-3">{t.quarter}</th>
                  <th className="px-4 py-3">{t.electricalConductivity}</th>
                  <th className="px-4 py-3">{t.somaticCellProxy}</th>
                  <th className="px-4 py-3">{t.phLevel}</th>
                  <th className="px-4 py-3">{t.riskLevel}</th>
                  <th className="px-4 py-3">{t.nodusExecution}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredScreenings.map((scr) => (
                  <tr key={scr.id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#0F172A]">
                      {new Date(scr.screened_at).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">
                      {scr.animal_name}{' '}
                      <span className="font-mono text-[#64748B] font-normal">
                        ({scr.animal_tag})
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#143D2B]">
                      {scr.quarter}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {scr.electrical_conductivity.toFixed(2)} mS/cm
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {scr.scc_estimate.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono">{scr.ph_level.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <RiskBadge
                        status={scr.compute_result.risk_level}
                        score={scr.compute_result.risk_score}
                        showScore
                      />
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono">
                      {(scr as any).is_offline_record ? (
                        <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                          <HardDrive className="w-3 h-3" />
                          {t.offlineCached}
                        </span>
                      ) : scr.compute_result.provider === 'nodus_compute' ? (
                        <span className="text-[#1B4332] font-semibold bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                          Nodus Cloud
                        </span>
                      ) : (
                        <span className="text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                          Edge Engine
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedScreening(scr)}
                        className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded bg-white text-[#334155] hover:bg-[#F1F5F9]"
                      >
                        {t.inspectQuarter}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Screening Inspect Modal */}
      {selectedScreening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  {t.screeningLogs}: {selectedScreening.animal_name} ({selectedScreening.animal_tag})
                </h3>
              </div>
              <button
                onClick={() => setSelectedScreening(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <NodusExecutionPanel compute={selectedScreening.compute_result} />
            </div>

            <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAF9] flex justify-end">
              <button
                onClick={() => setSelectedScreening(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded"
              >
                {t.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
