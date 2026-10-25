import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Cpu, 
  ArrowRight, 
  Microscope, 
  AlertTriangle,
  TrendingDown,
  Globe
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface LandingViewProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
  onExploreDemo: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onLoginClick,
  onSignUpClick,
  onExploreDemo,
}) => {
  const { language, setLanguage, languages, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8F9F8] text-[#19231D]">
      {/* Top Navigation */}
      <header className="border-b border-[#E5E7E5] bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm">
              GD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#143D2B]">{t.appName}</span>
                <span className="hidden sm:inline-block text-[10px] font-semibold text-[#52796F] border border-[#CBD5CD] px-1.5 py-0.2 rounded uppercase">
                  {t.suiteName}
                </span>
              </div>
              <span className="hidden md:block text-[11px] text-[#64748B] leading-none">
                {t.tagline}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 8-Language Switcher */}
            <div className="flex items-center gap-1.5 border border-[#CBD5CD] rounded-md px-2 py-1 bg-[#F8FAF9]">
              <Globe className="w-3.5 h-3.5 text-[#1B4332]" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                aria-label={t.languagePreference}
                className="text-xs bg-transparent text-[#143D2B] font-semibold focus:outline-none cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="text-[#0F172A]">
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onExploreDemo}
              className="text-xs font-semibold text-[#1B4332] hover:text-[#0F291E] px-3 py-1.5 rounded border border-[#1B4332]/40 bg-[#F1F5F3] hover:bg-[#E5ECE8] transition-colors"
            >
              {t.viewDemo} →
            </button>
            <button
              onClick={onLoginClick}
              className="text-xs font-semibold text-[#334155] hover:text-[#0F172A] px-2.5 py-1.5"
            >
              {t.login}
            </button>
            <button
              onClick={onSignUpClick}
              className="text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] px-3.5 py-1.5 rounded shadow-xs"
            >
              {t.signUp}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 md:py-20 border-b border-[#E5E7E5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B4332] uppercase tracking-wider mb-4">
              <span>{t.clinicalOperations}</span>
              <span aria-hidden="true">·</span>
              <span>{t.subclinical}</span>
              <span aria-hidden="true">·</span>
              <span>{t.poweredByGemini}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0F172A] leading-tight">
              {t.screeningTitle}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#475569] leading-relaxed">
              {t.screeningSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onExploreDemo}
                className="px-6 py-3 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded-md shadow-xs flex items-center gap-2"
              >
                <span>{t.viewDemo}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onSignUpClick}
                className="px-5 py-3 text-sm font-semibold text-[#1B4332] bg-[#F1F5F3] hover:bg-[#E5ECE8] border border-[#CBD5CD] rounded-md"
              >
                {t.registerAnimal}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#64748B]">
              <div>
                <strong className="block text-sm font-bold text-[#0F172A]">₹7,000+ Cr</strong>
                <span>{t.annualLoss}</span>
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#0F172A]">1.15x QDR</strong>
                <span>{t.qdrRatio}</span>
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#0F172A]">4 {t.quartersScreened}</strong>
                <span>FL, FR, RL, RR</span>
              </div>
              <div>
                <strong className="block text-sm font-bold text-[#0F172A]">Gemini 3.8</strong>
                <span>{t.geminiAssistantTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Problem Breakdown */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#E5E7E5]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wider">
            {t.clinicalOperations}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
            {t.herdMastitisRiskDistribution}
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            {t.qdrExplanation}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A]">
              {t.subclinical} &amp; {t.clinical}
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {t.thresholdStandard}: {t.subclinical} (200k-500k SCC), {t.clinical} (&gt;500k SCC).
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A]">
              {t.quarterSymmetry}
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {t.qdrExplanation}
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#F1F5F3] text-[#1B4332] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A]">
              {t.geminiAssistantTitle}
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {t.geminiAssistantSubtitle}
            </p>
          </div>
        </div>
      </section>

      {/* The GauDhara 3-Pillar Solution */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wider">
            {t.computeIntelligence}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
            {t.suiteName}
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            {t.thresholdStandard}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#F1F5F3] text-[#1B4332] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A]">
              {t.qdrRatio}
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {t.enterQuarterConductivity}
            </p>
            <div className="text-xs text-[#64748B] pt-2 font-mono border-t border-[#E2E8F0]">
              QDR &gt; 1.15x
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#F1F5F3] text-[#1B4332] flex items-center justify-center">
              <Microscope className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A]">
              {t.somaticCellProxy}
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {t.cameraOpticalAnalysis}
            </p>
            <div className="text-xs text-[#64748B] pt-2 font-mono border-t border-[#E2E8F0]">
              {t.sccEst}
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg border border-[#E2E8F0] space-y-3">
            <div className="w-10 h-10 rounded-md bg-[#F1F5F3] text-[#1B4332] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A]">
              {t.workloadLabTitle}
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {t.workloadLabSubtitle}
            </p>
            <div className="text-xs text-[#64748B] pt-2 font-mono border-t border-[#E2E8F0]">
              {t.nodusExecution}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="bg-[#1B4332] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">
              {t.appName} - {t.suiteName}
            </h3>
            <p className="text-sm text-[#A3B899] mt-1">
              {t.tagline}
            </p>
          </div>
          <button
            onClick={onExploreDemo}
            className="px-6 py-3 bg-white text-[#1B4332] hover:bg-[#F8FAF9] font-bold text-sm rounded-md shadow-sm shrink-0"
          >
            {t.viewDemo}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7E5] bg-white py-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {t.appName}. {t.tagline}.</p>
          <div className="flex items-center gap-4">
            <span className="font-medium text-[#1B4332]">{t.suiteName}</span>
            <span>·</span>
            <span>{t.thresholdStandard}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
