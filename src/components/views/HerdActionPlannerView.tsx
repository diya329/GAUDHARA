import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  ShieldAlert,
  Bot,
  Filter,
  Layers,
  ArrowRight,
  Info,
  Check,
  FileText,
  FlaskConical,
  Activity,
  Tag,
  Globe
} from 'lucide-react';
import type { Animal, HerdActionPlan, PrioritizedActionAnimal } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { OfflineBanner } from '../common/OfflineBanner';
import { useLanguage } from '../../i18n/LanguageContext';

interface HerdActionPlannerViewProps {
  onNavigateToScreening?: (animalTag: string) => void;
  onNavigateToLab?: (animalTag: string) => void;
  onNavigateToAssistant?: (animal?: Animal) => void;
}

export const HerdActionPlannerView: React.FC<HerdActionPlannerViewProps> = ({
  onNavigateToScreening,
  onNavigateToLab,
  onNavigateToAssistant
}) => {
  const { language, setLanguage, languages, t } = useLanguage();
  const [actionPlan, setActionPlan] = useState<HerdActionPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [selectedAnimal, setSelectedAnimal] = useState<PrioritizedActionAnimal | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const loadActionPlan = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [status, plan] = await Promise.all([
        api.getAgent37Status(),
        api.generateHerdActionPlan({ language })
      ]);
      setAgentStatus(status);
      setActionPlan(plan);
      if (plan.prioritized_animals.length > 0) {
        setSelectedAnimal(plan.prioritized_animals[0]);
      }
    } catch (err) {
      console.error('Failed to generate action plan:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadActionPlan(false);
  }, [language]);

  const exportPlanTxt = () => {
    if (!actionPlan) return;
    const lines = [
      `=============================================================`,
      `GAUDHARA — HERD HEALTH ACTION PLAN`,
      `Generated: ${actionPlan.created_at}`,
      `Execution Provider: ${actionPlan.provider} (Fallback: ${actionPlan.is_fallback})`,
      `Herd Coverage: ${actionPlan.coverage.screened_count}/${actionPlan.coverage.total_animals} (${actionPlan.coverage.coverage_pct}%)`,
      `Flagged Animals: ${actionPlan.coverage.flagged_count}`,
      `=============================================================`,
      ``,
      `VETERINARY REVIEW SUMMARY:`,
      actionPlan.veterinary_review_summary,
      ``,
      `PRIORITIZED COW SCHEDULE:`,
      ...actionPlan.prioritized_animals.map((a, i) => (
        `[${i + 1}] Tag: ${a.tag_id} (${a.name}) | Urgency: ${a.urgency.toUpperCase()} | Suggested Window: ${a.suggested_time_window}\n` +
        `    Measurements: EC ${a.measurements.ec} mS/cm | QDR ${a.measurements.qdr}x | SCC ${a.measurements.scc.toLocaleString()} cells/mL\n` +
        `    History: ${a.history_trajectory}\n` +
        `    Primary Reasons: ${a.reasons.join('; ')}\n` +
        `    Observations Needed: ${a.clinical_observations_needed.join('; ')}\n`
      )),
      ``,
      `OBSERVATIONS REQUIRING LICENSED VETERINARY ATTENTION:`,
      ...actionPlan.observations_requiring_vet.map(o => `• ${o}`),
      ``,
      `DISCLAIMER:`,
      actionPlan.disclaimer
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GauDhara_Herd_Action_Plan_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySummaryToClipboard = () => {
    if (!actionPlan) return;
    navigator.clipboard.writeText(actionPlan.veterinary_review_summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const filteredAnimals = actionPlan?.prioritized_animals.filter(a => {
    if (urgencyFilter === 'all') return true;
    return a.urgency === urgencyFilter;
  }) || [];

  return (
    <div className="space-y-6">
      <OfflineBanner />

      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.actionPlannerTitle}
            </h1>
            <span className="text-[10px] font-semibold text-[#1B4332] bg-[#F1F5F3] px-2 py-0.5 rounded border border-[#CBD5CD] uppercase font-mono">
              {t.computeIntelligence}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.actionPlannerSubtitle}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 8 Language Selector */}
          <div className="flex items-center gap-1.5 border border-[#CBD5CD] rounded-md px-2 py-1 bg-white">
            <Globe className="w-3.5 h-3.5 text-[#1B4332]" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="text-xs bg-transparent text-[#143D2B] font-semibold focus:outline-none cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadActionPlan(true)}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-semibold text-[#1B4332] bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] rounded-md flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? t.generatingPlan : t.generatePlanBtn}</span>
          </button>

          <button
            onClick={exportPlanTxt}
            disabled={!actionPlan}
            className="px-3 py-1.5 text-xs font-semibold text-[#334155] bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] rounded-md flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{t.exportTxt}</span>
          </button>
        </div>
      </div>

      {/* Provider Connectivity Status Strip */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            actionPlan?.provider === 'agent37_cloud'
              ? 'bg-[#E0F2FE] text-[#0369A1]'
              : 'bg-[#FEF3C7] text-[#92400E]'
          }`}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0F172A]">
                {actionPlan?.provider === 'agent37_cloud'
                  ? 'Agent37 Cloud Hermes Inference Active'
                  : 'Autonomous Veterinary Rule Engine (Transparent Local Fallback)'}
              </span>
              <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-medium ${
                actionPlan?.provider === 'agent37_cloud'
                  ? 'bg-[#DCFCE7] text-[#166534]'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}>
                {actionPlan?.provider === 'agent37_cloud' ? 'CONNECTED' : 'LOCAL ENGINE'}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              {actionPlan?.provider === 'agent37_cloud'
                ? `Agent instance: ${actionPlan.instance_id || 'Active Cloud Session'} • Multi-turn session: ${actionPlan.session_id?.slice(0, 8)}...`
                : 'AGENT37_API_KEY is not configured on backend; deterministic ICAR/IDF physiological rules used without hallucination.'}
            </p>
          </div>
        </div>

        {actionPlan && (
          <span className="text-[11px] font-mono text-[#64748B]">
            Plan Timestamp: {new Date(actionPlan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-xl space-y-3">
          <RefreshCw className="w-6 h-6 text-[#1B4332] animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#334155]">{t.loading}</p>
        </div>
      ) : actionPlan ? (
        <div className="space-y-6">
          {/* Herd Overview Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] block">{t.totalHerd}</span>
              <span className="text-2xl font-bold font-mono text-[#0F172A] mt-1 block">
                {actionPlan.coverage.total_animals}
              </span>
              <span className="text-[10px] text-[#059669] font-medium block mt-0.5">{t.healthy}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] block">{t.coverageSummary}</span>
              <span className="text-2xl font-bold font-mono text-[#0F172A] mt-1 block">
                {actionPlan.coverage.coverage_pct}%
              </span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                {actionPlan.coverage.screened_count} / {actionPlan.coverage.total_animals} {t.screenedToday}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] block">{t.requiringFollowUp}</span>
              <span className="text-2xl font-bold font-mono text-[#B91C1C] mt-1 block">
                {actionPlan.coverage.flagged_count}
              </span>
              <span className="text-[10px] text-[#DC2626] font-medium block mt-0.5">{t.urgent}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] block">{t.suggestedTimeWindow}</span>
              <span className="text-lg font-bold text-[#0F172A] mt-1 block truncate">
                {t.urgent} (&lt;12h)
              </span>
              <span className="text-[10px] text-[#D97706] font-semibold block mt-0.5">{t.critical}</span>
            </div>
          </div>

          {/* Veterinary Review Summary Box */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1B4332]" />
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {t.veterinaryReviewSummary}
                </h3>
              </div>
              <button
                onClick={copySummaryToClipboard}
                className="text-xs text-[#1B4332] hover:underline flex items-center gap-1 font-medium"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : null}
                <span>{copiedSummary ? t.resolved : t.copyText}</span>
              </button>
            </div>

            <div className="p-4 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] text-xs leading-relaxed text-[#1E293B] whitespace-pre-line font-normal">
              {actionPlan.veterinary_review_summary}
            </div>
          </div>

          {/* Main Action Schedule: Left List, Right Detail Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Prioritized Animal List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#0F172A]">
                    {t.priorityQueue} ({filteredAnimals.length})
                  </h3>
                </div>

                {/* Urgency Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#64748B]">{t.riskLevel}:</span>
                  {(['all', 'urgent', 'high', 'moderate', 'routine'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setUrgencyFilter(lvl)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
                        urgencyFilter === lvl
                          ? 'bg-[#1B4332] text-white'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {lvl === 'all' ? t.filterAll : lvl === 'urgent' ? t.urgent : lvl === 'high' ? t.high : lvl === 'moderate' ? t.moderate : t.normal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredAnimals.map((animal) => {
                  const isSelected = selectedAnimal?.tag_id === animal.tag_id;
                  const isUrgent = animal.urgency === 'urgent';
                  const isHigh = animal.urgency === 'high';

                  return (
                    <div
                      key={animal.tag_id}
                      onClick={() => setSelectedAnimal(animal)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1B4332] bg-white ring-2 ring-[#1B4332]/20 shadow-sm'
                          : isUrgent
                          ? 'border-[#FCA5A5] bg-[#FFFBFB] hover:border-[#DC2626]'
                          : isHigh
                          ? 'border-[#FDE68A] bg-[#FFFDF5] hover:border-[#D97706]'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                            isUrgent ? 'bg-[#FEE2E2] text-[#991B1B]' :
                            isHigh ? 'bg-[#FEF3C7] text-[#92400E]' :
                            'bg-[#F1F5F9] text-[#475569]'
                          }`}>
                            {animal.tag_id.slice(-3)}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-[#0F172A]">{animal.name}</span>
                              <span className="font-mono text-xs px-1.5 py-0.2 bg-[#E2E8F0] rounded text-[#334155]">
                                {animal.tag_id}
                              </span>
                              <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isUrgent ? 'bg-[#FEE2E2] text-[#991B1B]' :
                                isHigh ? 'bg-[#FEF3C7] text-[#92400E]' :
                                animal.urgency === 'moderate' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                                'bg-[#DCFCE7] text-[#166534]'
                              }`}>
                                {animal.urgency === 'urgent' ? t.urgent : animal.urgency === 'high' ? t.high : t.normal}
                              </span>
                              <RiskBadge status={animal.risk_level} score={animal.risk_score} showScore />
                            </div>

                            <div className="mt-1 text-xs text-[#475569] flex flex-wrap items-center gap-2">
                              <span>{t.breed}: {animal.breed}</span>
                              <span>•</span>
                              <span>{t.ecVal}: <strong className="font-mono text-[#0F172A]">{animal.measurements.ec} mS/cm</strong></span>
                              <span>•</span>
                              <span>{t.qdrRatio}: <strong className="font-mono text-[#0F172A]">{animal.measurements.qdr}x</strong></span>
                              <span>•</span>
                              <span>{t.sccEst}: <strong className="font-mono text-[#0F172A]">{animal.measurements.scc.toLocaleString()}</strong></span>
                            </div>

                            <p className="mt-1.5 text-xs text-[#334155] leading-relaxed">
                              {animal.reasons[0]}
                            </p>
                          </div>
                        </div>

                        <div className="text-right sm:self-center shrink-0">
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1 sm:justify-end">
                            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                            <strong className="text-[#0F172A] font-semibold">{animal.suggested_time_window}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 1 Col: Selected Animal Deep-Dive */}
            <div className="space-y-4">
              {selectedAnimal ? (
                <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4 sticky top-20">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <div>
                      <h4 className="font-bold text-sm text-[#0F172A]">{selectedAnimal.name} ({selectedAnimal.tag_id})</h4>
                      <span className="text-xs text-[#64748B]">{selectedAnimal.breed} • {t.parity} {selectedAnimal.parity}</span>
                    </div>
                    <RiskBadge status={selectedAnimal.risk_level} score={selectedAnimal.risk_score} showScore />
                  </div>

                  {/* Scheduled window banner */}
                  <div className="p-3 bg-[#FFFDF5] border border-[#FDE68A] rounded-lg text-xs space-y-1">
                    <span className="font-bold text-[#92400E] block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {t.suggestedTimeWindow}
                    </span>
                    <p className="font-semibold text-[#0F172A]">{selectedAnimal.suggested_time_window}</p>
                  </div>

                  {/* Historical Trajectory */}
                  <div>
                    <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1">
                      {t.screeningLogs}
                    </span>
                    <p className="text-xs text-[#334155] p-2.5 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
                      {selectedAnimal.history_trajectory}
                    </p>
                  </div>

                  {/* Clinical Observations Needed */}
                  <div>
                    <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1">
                      {t.clinicalObservationsNeeded}
                    </span>
                    <ul className="text-xs text-[#334155] space-y-1.5">
                      {selectedAnimal.clinical_observations_needed.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Missing Information & Uncertainty */}
                  <div>
                    <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1">
                      {t.alertDetails}
                    </span>
                    <ul className="text-xs text-[#64748B] space-y-1">
                      {selectedAnimal.missing_information.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] shrink-0 mt-1.5" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                    {onNavigateToLab && (
                      <button
                        onClick={() => onNavigateToLab(selectedAnimal.tag_id)}
                        className="w-full px-3 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>{t.workloadLabTitle}</span>
                      </button>
                    )}

                    {onNavigateToScreening && (
                      <button
                        onClick={() => onNavigateToScreening(selectedAnimal.tag_id)}
                        className="w-full px-3 py-2 text-xs font-semibold text-[#1B4332] bg-[#F1F5F3] hover:bg-[#E5ECE8] border border-[#CBD5CD] rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>{t.recordMilkScreening}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-white border border-[#E2E8F0] rounded-xl text-center text-xs text-[#64748B]">
                  {t.selectCowPlaceholder}
                </div>
              )}
            </div>
          </div>

          {/* Critical Veterinary Safety Triggers */}
          <div className="bg-white p-5 rounded-xl border border-[#FCA5A5] bg-[#FFFBFB] space-y-3">
            <div className="flex items-center gap-2 text-[#991B1B] font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
              <span>{t.critical} {t.veterinaryNotes}</span>
            </div>
            <ul className="text-xs text-[#7F1D1D] space-y-1.5">
              {actionPlan.observations_requiring_vet.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-bold text-[#DC2626]">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {actionPlan.disclaimer || t.disclaimerAdvisory}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
