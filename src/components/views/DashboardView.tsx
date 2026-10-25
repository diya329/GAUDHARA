import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  FlaskConical, 
  Plus, 
  ArrowRight, 
  Clock, 
  Cpu, 
  ChevronRight,
  TrendingUp,
  FileText,
  CheckCircle2
} from 'lucide-react';
import type { Animal, ScreeningRecord, AlertItem, FarmStats, HardwareDevice } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { HerdRiskDistributionChart } from '../common/Charts';
import { HorizontalRiskGauge } from '../common/HorizontalRiskGauge';
import { useLanguage } from '../../i18n/LanguageContext';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
  onOpenAnimalDetail: (animal: Animal) => void;
  onStartScreening: (animal?: Animal) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenAnimalDetail,
  onStartScreening,
}) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<FarmStats | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [recentScreenings, setRecentScreenings] = useState<ScreeningRecord[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<AlertItem[]>([]);
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, animalsData, screeningsData, alertsData, devicesData] = await Promise.all([
          api.getStats(),
          api.getAnimals(),
          api.getScreenings(),
          api.getAlerts(),
          api.getDevices(),
        ]);

        setStats(statsData);
        setAnimals(animalsData);
        setRecentScreenings(screeningsData.slice(0, 5));
        setPendingAlerts(alertsData.filter(a => a.status === 'pending'));
        setDevices(devicesData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#64748B]">Loading farm health telemetry...</span>
        </div>
      </div>
    );
  }

  const followUpAnimals = animals.filter(
    (a) => a.status === 'clinical_alert' || a.status === 'subclinical_suspect'
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.consoleTitle}
            </h1>
            <span className="text-[10px] font-semibold text-[#1B4332] bg-[#F1F5F3] px-2 py-0.5 rounded border border-[#CBD5CD]">
              {t.suiteName}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.consoleSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('action_planner')}
            className="px-3 py-1.5 text-xs font-semibold text-[#0369A1] bg-[#F0F9FF] hover:bg-[#E0F2FE] border border-[#BAE6FD] rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Open Herd Action Planner"
          >
            <span>{t.actionPlanner}</span>
            <span className="text-[9px] font-mono font-bold bg-[#0284C7] text-white px-1.5 py-0.2 rounded">Agent37</span>
          </button>
          <button
            onClick={() => onNavigateTab('workload_lab')}
            className="px-3 py-1.5 text-xs font-semibold text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Open Nodus Workload Lab"
          >
            <span>{t.workloadLab}</span>
            <span className="text-[9px] font-mono font-bold bg-[#16A34A] text-white px-1.5 py-0.2 rounded">Nodus</span>
          </button>
          <button
            onClick={() => onStartScreening()}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{t.recordMilkScreening}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>{t.totalHerd}</span>
            <Users className="w-4 h-4 text-[#475569]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A]">
            {stats?.total_animals ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            {t.activeMilkingHerd}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>{t.screenedToday}</span>
            <Activity className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A]">
            {stats?.screened_today ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            {t.quarterSensorTests}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>{t.requiringFollowUp}</span>
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#B91C1C]">
            {stats?.requiring_follow_up ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#DC2626]">
            {stats?.clinical_count ? `${stats.clinical_count} ${t.clinical}` : `0 ${t.clinical}`} · {stats?.subclinical_count ?? 0} {t.subclinical}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>{t.herdAvgEc}</span>
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#0F172A]">
            {stats?.avg_herd_conductivity ?? 4.8} <span className="text-xs font-normal text-[#64748B]">mS/cm</span>
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            {t.baselineNormalEc}
          </div>
        </div>
      </div>

      {/* Risk Distribution & Urgent Follow-up Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Herd Risk Breakdown */}
        <div className="p-5 rounded-lg bg-white border border-[#E2E8F0] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0F172A]">
              {t.herdMastitisRiskDistribution}
            </h3>
            <span className="text-xs text-[#64748B]">
              {t.totalHerd}: {stats?.total_animals ?? 0}
            </span>
          </div>

          <HerdRiskDistributionChart
            healthy={stats?.healthy_count ?? 0}
            subclinical={stats?.subclinical_count ?? 0}
            clinical={stats?.clinical_count ?? 0}
            total={stats?.total_animals ?? 1}
          />

          <div className="pt-2 border-t border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
            <span>{t.thresholdStandard}</span>
            <button
              onClick={() => onNavigateTab('ai_risk')}
              className="font-medium text-[#1B4332] hover:underline cursor-pointer"
            >
              {t.detailedAnalytics}
            </button>
          </div>
        </div>

        {/* Animals Requiring Immediate Follow-up */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-white border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#0F172A]">
                {t.animalsRequiringFollowUp}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B]">
                {followUpAnimals.length} {t.warning}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('animals')}
              className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
            >
              {t.animals} →
            </button>
          </div>

          {followUpAnimals.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[#E2E8F0] rounded-md text-xs text-[#64748B]">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A] mx-auto mb-1.5" />
              <span>{t.healthy}</span>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-md overflow-hidden">
              {followUpAnimals.map((animal) => (
                <div
                  key={animal.id}
                  className="p-3.5 hover:bg-[#F8FAF9] flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#F1F5F9] font-bold text-xs flex items-center justify-center text-[#334155] shrink-0">
                      {animal.tag_id.slice(-3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#0F172A] truncate">
                          {animal.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#64748B]">
                          ({animal.tag_id})
                        </span>
                        <RiskBadge status={animal.status} />
                      </div>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {animal.breed} · {animal.barn_location} · {t.dailyYieldLiters}: {animal.avg_daily_yield_liters} L
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onOpenAnimalDetail(animal)}
                      className="text-xs font-medium text-[#475569] hover:text-[#0F172A] px-2.5 py-1 rounded border border-[#CBD5CD] bg-white cursor-pointer"
                    >
                      {t.history}
                    </button>
                    <button
                      onClick={() => onStartScreening(animal)}
                      className="text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <FlaskConical className="w-3 h-3" />
                      <span>{t.screenNow}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Clinical Alerts Banner */}
      {pendingAlerts.length > 0 && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-[#991B1B]">
                  {pendingAlerts.length} {t.alerts} ({t.pending})
                </h4>
                <p className="text-xs text-[#B91C1C] mt-0.5">
                  {pendingAlerts[0].title} — {pendingAlerts[0].recommended_action}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-xs font-semibold text-[#991B1B] hover:text-[#7F1D1D] underline shrink-0 cursor-pointer"
            >
              {t.reviewAlerts} →
            </button>
          </div>
        </div>
      )}

      {/* Recent Screenings Table */}
      <div className="p-5 rounded-lg bg-white border border-[#E2E8F0] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#0F172A]">
              {t.recentScreenings}
            </h3>
            <p className="text-xs text-[#64748B]">
              {t.consoleSubtitle}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
          >
            {t.viewAllScreenings}
          </button>
        </div>

        {recentScreenings.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E2E8F0] rounded-md text-xs text-[#64748B] space-y-2">
            <FlaskConical className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="font-medium text-[#334155]">{t.screeningSubtitle}</p>
            <button
              onClick={() => onStartScreening()}
              className="mt-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded cursor-pointer"
            >
              {t.recordMilkScreening}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-md">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-2.5">{t.cowName}</th>
                  <th className="px-4 py-2.5">{t.quarter}</th>
                  <th className="px-4 py-2.5">{t.electricalConductivity}</th>
                  <th className="px-4 py-2.5">{t.somaticCellProxy}</th>
                  <th className="px-4 py-2.5">{t.phLevel}</th>
                  <th className="px-4 py-2.5">{t.riskLevel}</th>
                  <th className="px-4 py-2.5">{t.nodusExecution}</th>
                  <th className="px-4 py-2.5">{t.lastScreened}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {recentScreenings.map((scr) => (
                  <tr key={scr.id} className="hover:bg-[#F8FAF9]">
                    <td className="px-4 py-2.5 font-medium text-[#0F172A]">
                      {scr.animal_name} <span className="font-mono text-[#64748B]">({scr.animal_tag})</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold">{scr.quarter}</td>
                    <td className="px-4 py-2.5 font-mono">{scr.electrical_conductivity} mS/cm</td>
                    <td className="px-4 py-2.5 font-mono">{scr.scc_estimate.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono">{scr.ph_level.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-semibold">
                      <RiskBadge 
                        status={scr.compute_result.risk_level} 
                        score={scr.compute_result.risk_score} 
                        showScore 
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-[#64748B]">
                      {scr.compute_result.provider === 'nodus_compute' ? 'Nodus Cloud' : 'Edge Local'}
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B]">
                      {new Date(scr.screened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hardware Telemetry Bar */}
      <div className="p-4 rounded-lg bg-white border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#F1F5F3] text-[#1B4332]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0F172A] block">
              {t.devices}: {devices.filter(d => d.status === 'online').length} / {devices.length} {t.activeSensors}
            </span>
            <span className="text-[#64748B]">
              {t.hardwareSubtitle}
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('hardware')}
          className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
        >
          {t.devices} →
        </button>
      </div>
    </div>
  );
};
