import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Share2,
  Table
} from 'lucide-react';
import type { Animal, ScreeningRecord, FarmStats } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

export const ReportsView: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<FarmStats | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([api.getStats(), api.getAnimals(), api.getScreenings()]).then(
      ([st, an, sc]) => {
        setStats(st);
        setAnimals(an);
        setScreenings(sc);
      }
    );
  }, []);

  const exportCSV = () => {
    if (screenings.length === 0) return;
    const headers = [
      'Screening ID',
      'Animal Tag',
      'Animal Name',
      'Quarter',
      'Conductivity (mS/cm)',
      'Somatic Cell Proxy',
      'pH',
      'Risk Score',
      'Risk Level',
      'Compute Provider',
      'Date Time'
    ];

    const rows = screenings.map((s) => [
      s.id,
      s.animal_tag,
      `"${s.animal_name}"`,
      s.quarter,
      s.electrical_conductivity,
      s.scc_estimate,
      s.ph_level,
      s.compute_result.risk_score,
      s.compute_result.risk_level,
      s.compute_result.provider,
      s.screened_at
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GauDhara_Mastitis_Audit_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            {t.reportsTitle}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.reportsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#1B4332] bg-white border border-[#1B4332]/40 rounded hover:bg-[#F1F5F3] flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCsv}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.printAudit}</span>
          </button>
        </div>
      </div>

      {/* Printable Audit Sheet Layout */}
      <div className="bg-white p-8 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-6 printable-report">
        {/* Farm & Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-[#143D2B]">{t.appName} {t.suiteName}</span>
              <span className="text-xs text-[#64748B] font-mono">| {t.generateAuditReport}</span>
            </div>
            <p className="text-xs text-[#475569]">
              {t.farmProfile}: GauDhara Research Herd #4 • Registration: #AS-VET-2026-GD
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              {t.disclaimerAdvisory}
            </p>
          </div>

          <div className="text-right text-xs text-[#64748B] font-mono">
            <div>{t.dateRange}: <strong>{reportDate}</strong></div>
            <div>{t.auditTelemetry}</div>
          </div>
        </div>

        {/* Audit Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
            <span className="text-[#64748B] block">{t.totalHerd}</span>
            <span className="text-lg font-bold font-mono text-[#0F172A]">{stats?.total_animals ?? 0}</span>
          </div>
          <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
            <span className="text-[#64748B] block">{t.healthy}</span>
            <span className="text-lg font-bold font-mono text-[#166534]">
              {stats?.total_animals 
                ? Math.round(((stats.healthy_count || 0) / stats.total_animals) * 100)
                : 0}%
            </span>
          </div>
          <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
            <span className="text-[#64748B] block">{t.subclinical}</span>
            <span className="text-lg font-bold font-mono text-[#B45309]">{stats?.subclinical_count ?? 0}</span>
          </div>
          <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
            <span className="text-[#64748B] block">{t.clinical}</span>
            <span className="text-lg font-bold font-mono text-[#DC2626]">{stats?.clinical_count ?? 0}</span>
          </div>
        </div>

        {/* Herd Breakdown Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#475569]">
            {t.herdTitle}
          </h3>

          <div className="border border-[#E2E8F0] rounded overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-3 py-2">{t.tagId}</th>
                  <th className="px-3 py-2">{t.cowName}</th>
                  <th className="px-3 py-2">{t.breed}</th>
                  <th className="px-3 py-2">{t.lactationStage}</th>
                  <th className="px-3 py-2">{t.dailyYieldLiters}</th>
                  <th className="px-3 py-2">{t.riskLevel}</th>
                  <th className="px-3 py-2">{t.lastScreened}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {animals.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-mono font-bold text-[#0F172A]">{a.tag_id}</td>
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-[#475569]">{a.breed}</td>
                    <td className="px-3 py-2">{a.lactation_stage}</td>
                    <td className="px-3 py-2 font-mono">{a.avg_daily_yield_liters} L</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        a.status === 'healthy' ? 'bg-[#DCFCE7] text-[#166534]' :
                        a.status === 'subclinical_suspect' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        a.status === 'clinical_alert' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        'bg-[#DBEAFE] text-[#1E40AF]'
                      }`}>
                        {a.status === 'healthy' ? t.healthy : a.status === 'subclinical_suspect' ? t.subclinical : a.status === 'clinical_alert' ? t.clinical : t.inRecovery}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#64748B]">
                      {a.last_screened_at ? new Date(a.last_screened_at).toLocaleDateString() : t.notAvailable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Veterinary Attestation */}
        <div className="pt-6 border-t border-[#E2E8F0] grid grid-cols-2 gap-8 text-xs text-[#64748B]">
          <div>
            <span className="block font-semibold text-[#0F172A] mb-8">
              {t.veterinarianInCharge}:
            </span>
            <div className="border-b border-[#CBD5E1] w-48 mb-1" />
            <span>Dr. Sunita Sharma, B.V.Sc &amp; A.H. (Reg: VCI-48102)</span>
          </div>

          <div className="text-right">
            <span className="block font-semibold text-[#0F172A] mb-8">
              {t.farmProfile}:
            </span>
            <div className="border-b border-[#CBD5E1] w-48 mb-1 ml-auto" />
            <span>Rajesh Patil ({t.roleLabel})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
