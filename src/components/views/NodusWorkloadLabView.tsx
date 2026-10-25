import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  ExternalLink,
  Code,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  ShieldCheck,
  Zap,
  Sliders,
  RotateCcw,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';
import type { Animal, QuarterLocation, ScreeningInput, WorkloadLabComparisonResult, ScreeningRecord } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { HorizontalRiskGauge } from '../common/HorizontalRiskGauge';
import { QuarterComparisonChart } from '../common/Charts';
import { OfflineBanner } from '../common/OfflineBanner';
import { useLanguage } from '../../i18n/LanguageContext';

interface NodusWorkloadLabViewProps {
  onScreeningSaved?: (record: ScreeningRecord) => void;
  onNavigateToAssistant?: (animal?: Animal) => void;
}

export const NodusWorkloadLabView: React.FC<NodusWorkloadLabViewProps> = ({
  onScreeningSaved,
  onNavigateToAssistant
}) => {
  const { t } = useLanguage();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [quarter, setSelectedQuarter] = useState<QuarterLocation>('FL');
  const [quarterConductivities, setQuarterConductivities] = useState({
    FL: 5.92,
    FR: 4.62,
    RL: 4.70,
    RR: 4.65
  });
  const [bulkConductivity, setBulkConductivity] = useState<number>(5.92);
  const [phLevel, setPhLevel] = useState<number>(6.84);
  const [sccEstimate, setSccEstimate] = useState<number>(360000);
  const [temperatureC, setTemperatureC] = useState<number>(38.8);
  const [opticalDensity, setOpticalDensity] = useState<number>(0.44);
  const [milkYieldKg, setMilkYieldKg] = useState<number>(7.8);
  const [notes, setNotes] = useState<string>('Unilateral subclinical asymmetry evaluation.');
  const [runRemote, setRunRemote] = useState<boolean>(true);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [labResult, setLabResult] = useState<WorkloadLabComparisonResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showJsonDump, setShowJsonDump] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [nodusStatus, setNodusStatus] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.getAnimals(), api.getNodusStatus()]).then(([animData, nodusData]) => {
      setAnimals(animData);
      setNodusStatus(nodusData);
      if (animData.length > 0 && !selectedAnimalId) {
        // Pre-select second cow (Kamdhenu - subclinical case) for demonstration
        const kamdhenu = animData.find(a => a.tag_id === 'SAH-208') || animData[0];
        setSelectedAnimalId(kamdhenu.id);
      }
    });
  }, []);

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);

  // Real-time validation checks
  const valChecks = [
    {
      name: 'Bulk Electrical Conductivity',
      value: `${bulkConductivity} mS/cm`,
      valid: bulkConductivity >= 1.0 && bulkConductivity <= 15.0,
      range: '1.0 – 15.0 mS/cm'
    },
    {
      name: 'Quarter Readings (4 Channels)',
      value: `FL:${quarterConductivities.FL}, FR:${quarterConductivities.FR}, RL:${quarterConductivities.RL}, RR:${quarterConductivities.RR}`,
      valid: Object.values(quarterConductivities).every(v => v >= 1.0 && v <= 15.0),
      range: 'All quarters 1.0 – 15.0'
    },
    {
      name: 'Milk pH Level',
      value: `${phLevel}`,
      valid: phLevel >= 4.0 && phLevel <= 9.0,
      range: '4.0 – 9.0'
    },
    {
      name: 'Somatic Cell Proxy',
      value: `${sccEstimate.toLocaleString()} cells/mL`,
      valid: sccEstimate >= 0 && sccEstimate <= 15000000,
      range: '0 – 15,000,000'
    },
    {
      name: 'Milk Temperature',
      value: `${temperatureC}°C`,
      valid: temperatureC >= 30.0 && temperatureC <= 43.0,
      range: '30.0 – 43.0°C'
    }
  ];

  const allValid = valChecks.every(c => c.valid);

  // Presets
  const loadPreset = (preset: 'healthy' | 'subclinical' | 'clinical' | 'borderline') => {
    setIsSaved(false);
    setErrorMessage(null);
    if (preset === 'healthy') {
      const cow = animals.find(a => a.tag_id === 'GIR-104') || animals[0];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 4.65, FR: 4.58, RL: 4.62, RR: 4.60 });
      setBulkConductivity(4.62);
      setPhLevel(6.65);
      setSccEstimate(115000);
      setTemperatureC(38.5);
      setOpticalDensity(0.26);
      setSelectedQuarter('FL');
      setNotes('Healthy baseline control. Bilateral symmetry preserved.');
    } else if (preset === 'subclinical') {
      const cow = animals.find(a => a.tag_id === 'SAH-208') || animals[1];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 5.92, FR: 4.62, RL: 4.70, RR: 4.65 });
      setBulkConductivity(5.92);
      setPhLevel(6.84);
      setSccEstimate(360000);
      setTemperatureC(38.8);
      setOpticalDensity(0.44);
      setSelectedQuarter('FL');
      setNotes('Unilateral subclinical asymmetry evaluation (FL elevated 1.28x).');
    } else if (preset === 'clinical') {
      const cow = animals.find(a => a.tag_id === 'HFX-405') || animals[3];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 4.85, FR: 4.75, RL: 7.15, RR: 4.80 });
      setBulkConductivity(7.15);
      setPhLevel(7.18);
      setSccEstimate(880000);
      setTemperatureC(39.9);
      setOpticalDensity(0.65);
      setSelectedQuarter('RL');
      setNotes('Severe acute clinical mastitis. Significant heat and clots.');
    } else if (preset === 'borderline') {
      const cow = animals.find(a => a.tag_id === 'RDS-519') || animals[0];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 5.48, FR: 4.75, RL: 4.80, RR: 4.70 });
      setBulkConductivity(5.48);
      setPhLevel(6.78);
      setSccEstimate(195000);
      setTemperatureC(38.7);
      setOpticalDensity(0.33);
      setSelectedQuarter('FL');
      setNotes('Borderline threshold test: ratio = 1.16x right at the warning gate.');
    }
  };

  const handleExecuteLab = async () => {
    if (!allValid) {
      setErrorMessage('Please correct invalid physical inputs before submitting to Workload Lab.');
      return;
    }
    setIsRunning(true);
    setErrorMessage(null);
    setIsSaved(false);

    const inputSample: ScreeningInput = {
      animal_id: selectedAnimalId || 'demo-cow-1',
      quarter,
      electrical_conductivity: bulkConductivity,
      quarter_conductivities: quarterConductivities,
      ph_level: phLevel,
      scc_estimate: sccEstimate,
      temperature_c: temperatureC,
      optical_density: opticalDensity,
      milk_yield_kg: milkYieldKg,
      notes
    };

    try {
      const result = await api.runWorkloadLab(inputSample, runRemote);
      setLabResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Workload Lab execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveToScreeningHistory = async () => {
    if (!labResult || !labResult.local_result) return;
    try {
      const inputSample: ScreeningInput = {
        animal_id: selectedAnimalId,
        quarter,
        electrical_conductivity: bulkConductivity,
        quarter_conductivities: quarterConductivities,
        ph_level: phLevel,
        scc_estimate: sccEstimate,
        temperature_c: temperatureC,
        optical_density: opticalDensity,
        milk_yield_kg: milkYieldKg,
        notes: `[Verified via Nodus Workload Lab] ${notes}`
      };
      const saved = await api.submitScreening(inputSample);
      setIsSaved(true);
      if (onScreeningSaved) {
        onScreeningSaved(saved.screening);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to save screening record: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <OfflineBanner />

      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.workloadLabTitle}
            </h1>
            <span className="text-[10px] font-semibold text-[#1B4332] bg-[#F1F5F3] px-2 py-0.5 rounded border border-[#CBD5CD] uppercase font-mono">
              {t.computeIntelligence}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.workloadLabSubtitle}
          </p>
        </div>

        {/* Nodus connection status badge */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded text-xs font-mono font-medium border flex items-center gap-1.5 ${
            nodusStatus?.configured
              ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
              : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
          }`}>
            <Cpu className="w-3.5 h-3.5" />
            <span>{nodusStatus?.configured ? 'Nodus Cloud: Configured' : 'Nodus Cloud: Unconfigured (Local Engine Active)'}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#991B1B] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">{t.critical}</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Visual Execution Flow Pipeline */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-3">
          {t.computeIntelligence}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            {
              step: '1. Validation',
              desc: allValid ? '5 checks passed' : 'Invalid bounds',
              done: allValid,
              current: false
            },
            {
              step: '2. Nodus Dispatch',
              desc: nodusStatus?.configured ? 'REST container job' : 'Local path fallback',
              done: Boolean(labResult),
              current: isRunning
            },
            {
              step: '3. Dual Execution',
              desc: 'Deterministic rules',
              done: Boolean(labResult),
              current: isRunning
            },
            {
              step: '4. Agreement Check',
              desc: labResult?.concordance ? (labResult.concordance.agrees ? 'Full agreement' : 'Evaluated') : 'Delta verification',
              done: Boolean(labResult?.concordance),
              current: false
            },
            {
              step: '5. Record Persistence',
              desc: isSaved ? 'Saved to herd logs' : 'Awaiting commit',
              done: isSaved,
              current: false
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs transition-colors ${
                item.done
                  ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                  : item.current
                  ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E] animate-pulse'
                  : 'bg-[#F8FAF9] border-[#E2E8F0] text-[#64748B]'
              }`}
            >
              <div className="font-semibold flex items-center justify-between">
                <span>{item.step}</span>
                {item.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : item.current ? (
                  <RefreshCw className="w-3.5 h-3.5 text-[#D97706] animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 block opacity-90 truncate">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form & Preset Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sample Input & Verification Controls */}
        <div className="lg:col-span-2 space-y-5 bg-white p-6 rounded-xl border border-[#E2E8F0]">
          {/* Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
              {t.thresholdStandard}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => loadPreset('healthy')}
                className="px-2.5 py-1 text-xs font-medium rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-[#DCFCE7] hover:text-[#166534] transition-colors"
              >
                {t.healthy}
              </button>
              <button
                type="button"
                onClick={() => loadPreset('subclinical')}
                className="px-2.5 py-1 text-xs font-medium rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-[#FEF3C7] hover:text-[#92400E] transition-colors"
              >
                {t.subclinical} (1.28x)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('clinical')}
                className="px-2.5 py-1 text-xs font-medium rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-[#FEE2E2] hover:text-[#991B1B] transition-colors"
              >
                {t.clinical} (7.15 mS/cm)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('borderline')}
                className="px-2.5 py-1 text-xs font-medium rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-[#F1F5F9] transition-colors"
              >
                {t.warning} (1.16x)
              </button>
            </div>
          </div>

          {/* Animal Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Target Herd Animal
              </label>
              <select
                value={selectedAnimalId}
                onChange={(e) => setSelectedAnimalId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-md bg-white text-[#0F172A] focus:outline-hidden focus:ring-1 focus:ring-[#1B4332]"
              >
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.tag_id}) — {a.breed} [{a.status.replace('_', ' ')}]
                  </option>
                ))}
              </select>
              {selectedAnimal && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748B]">
                  <span>Parity: {selectedAnimal.parity}</span>
                  <span>•</span>
                  <span>Yield: {selectedAnimal.avg_daily_yield_liters} L/day</span>
                  <span>•</span>
                  <RiskBadge status={selectedAnimal.status} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Tested Primary Quarter
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['FL', 'FR', 'RL', 'RR'] as QuarterLocation[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setSelectedQuarter(q);
                      setBulkConductivity(quarterConductivities[q as keyof typeof quarterConductivities]);
                    }}
                    className={`py-2 text-xs font-bold rounded border transition-colors ${
                      quarter === q
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-[#F8FAF9] text-[#334155] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#64748B] block mt-1">
                Selected: {quarter === 'FL' ? 'Front-Left' : quarter === 'FR' ? 'Front-Right' : quarter === 'RL' ? 'Rear-Left' : 'Rear-Right'}
              </span>
            </div>
          </div>

          {/* 4-Quarter Electrical Conductivity Table */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                2. Four-Quarter Conductivities (mS/cm)
              </span>
              <span className="text-xs font-mono text-[#64748B]">
                Live Asymmetry Ratio: <strong className="text-[#0F172A]">{
                  (Math.max(...Object.values(quarterConductivities)) / Math.max(0.1, Math.min(...Object.values(quarterConductivities)))).toFixed(2)
                }x</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['FL', 'FR', 'RL', 'RR'] as const).map((q) => (
                <div key={q} className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0]">
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    {q} Quarter
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="15.0"
                    value={quarterConductivities[q]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setQuarterConductivities({ ...quarterConductivities, [q]: val });
                      if (q === quarter) setBulkConductivity(val);
                    }}
                    className="w-full px-2 py-1 text-xs font-mono font-bold border border-[#CBD5E1] rounded bg-white"
                  />
                  <span className="text-[10px] text-[#94A3B8] block mt-0.5">Norm: 4.0 - 5.5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Physical Inputs */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
              3. Physiochemical & Immune Markers
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Milk pH Level
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="4.0"
                  max="9.0"
                  value={phLevel}
                  onChange={(e) => setPhLevel(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-0.5">Norm: 6.55 – 6.75</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                  SCC Proxy (cells/mL)
                </label>
                <input
                  type="number"
                  step="10000"
                  min="0"
                  max="15000000"
                  value={sccEstimate}
                  onChange={(e) => setSccEstimate(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-0.5">Subclin: &gt;200k</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30.0"
                  max="43.0"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-0.5">Norm: 38.0 – 39.2</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Optical Density
                </label>
                <input
                  type="number"
                  step="0.02"
                  min="0.0"
                  max="2.5"
                  value={opticalDensity}
                  onChange={(e) => setOpticalDensity(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-0.5">Turbidity index</span>
              </div>
            </div>
          </div>

          {/* Action Execution Bar */}
          <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                id="run-remote-toggle"
                type="checkbox"
                checked={runRemote}
                onChange={(e) => setRunRemote(e.target.checked)}
                className="w-4 h-4 text-[#1B4332] rounded focus:ring-[#1B4332] cursor-pointer"
              />
              <label htmlFor="run-remote-toggle" className="text-xs text-[#334155] cursor-pointer font-medium">
                Attempt Nodus Remote Cluster Execution
              </label>
            </div>

            <button
              type="button"
              onClick={handleExecuteLab}
              disabled={isRunning || !allValid}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1B4332] hover:bg-[#143427] rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Dual Benchmark...</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" />
                  <span>Run Workload Lab Benchmark</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 1 Col: Input Sanity Limits & Realtime Symmetry */}
        <div className="space-y-5">
          {/* Realtime Biological Bounds Checklist */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] space-y-3">
            <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1B4332]" />
              <span>Pre-Execution Validation Matrix</span>
            </h3>
            <div className="space-y-2 text-xs">
              {valChecks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    chk.valid
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                      : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{chk.name}</span>
                    <span className="text-[10px] opacity-80 font-mono">Limit: {chk.range}</span>
                  </div>
                  <div className="text-right">
                    {chk.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] ml-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] ml-auto" />
                    )}
                    <span className="text-[10px] font-mono font-medium block mt-0.5">{chk.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#64748B] pt-1 leading-snug">
              Ensures multi-sensor inputs adhere strictly to physical sanity limits before cloud or edge compute.
            </p>
          </div>

          {/* Quarter Symmetry Graph */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] space-y-3">
            <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
              Sample Quarter Symmetry
            </h3>
            <QuarterComparisonChart conductivities={quarterConductivities} />
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Execution Comparison Report */}
      {labResult && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in">
          {/* Comparison Header & Concordance Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">
                  Dual-Path Execution & Concordance Report
                </h2>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${
                  labResult.concordance.agrees
                    ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                    : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                }`}>
                  {labResult.concordance.agrees ? 'OUTPUTS AGREE 100%' : 'DISCREPANCY / UNCONFIGURED'}
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                {labResult.concordance.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowJsonDump(!showJsonDump)}
                className="px-3 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-md bg-white hover:bg-[#F8FAF9] flex items-center gap-1.5"
              >
                <Code className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{showJsonDump ? 'Hide JSON' : 'View Payload JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToScreeningHistory}
                disabled={isSaved}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-xs ${
                  isSaved
                    ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                    : 'bg-[#1B4332] text-white hover:bg-[#143427]'
                }`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Screening Logs</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to Screening History</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Path 1: Local Deterministic Baseline */}
            <div className="border border-[#CBD5E1] rounded-xl p-5 bg-[#FAFAF9] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                    L
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#0F172A]">Local Deterministic Baseline</h3>
                    <span className="text-[10px] text-[#64748B]">Autonomous Edge Physiology Engine</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534]">
                  COMPLETED
                </span>
              </div>

              {labResult.local_result && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                      <span className="text-[#64748B] block">Execution ID:</span>
                      <span className="font-mono text-[#0F172A] truncate block font-medium">
                        {labResult.local_result.execution_id}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                      <span className="text-[#64748B] block">Measured Latency:</span>
                      <span className="font-mono font-bold text-[#0F172A] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#64748B]" />
                        {labResult.local_result.latency_ms} ms
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0F172A]">Mastitis Risk Assessment:</span>
                      <RiskBadge status={labResult.local_result.risk_level} score={labResult.local_result.risk_score} showScore />
                    </div>
                    <div className="flex items-center justify-between text-[#475569]">
                      <span>Inter-Quarter Ratio:</span>
                      <strong className="font-mono text-[#0F172A]">{labResult.local_result.max_quarter_differential_ratio}x</strong>
                    </div>
                    <div className="flex items-center justify-between text-[#475569]">
                      <span>Affected Quarters:</span>
                      <span className="font-mono font-bold text-[#B91C1C]">
                        {labResult.local_result.affected_quarters.length > 0 ? labResult.local_result.affected_quarters.join(', ') : 'None'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider block mb-1">
                      Identified Anomaly Factors ({labResult.local_result.anomaly_factors.length})
                    </span>
                    <div className="space-y-1">
                      {labResult.local_result.anomaly_factors.map((af, i) => (
                        <div key={i} className="p-2 bg-white rounded border border-[#E2E8F0] text-[11px]">
                          <div className="flex justify-between font-medium">
                            <span>{af.factor}</span>
                            <span className="font-mono font-bold">{af.value}</span>
                          </div>
                          <span className="text-[10px] text-[#64748B] block mt-0.5">{af.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Path 2: Remote Nodus Compute */}
            <div className="border border-[#CBD5E1] rounded-xl p-5 bg-[#FAFAF9] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[#0369A1] text-white flex items-center justify-center font-bold text-xs">
                    R
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#0F172A]">Nodus Compute Cloud Path</h3>
                    <span className="text-[10px] text-[#64748B]">Remote GPU/CPU Workload Container</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  labResult.remote_result?.status === 'completed'
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : labResult.remote_result?.status === 'failed'
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
                }`}>
                  {labResult.remote_result?.status?.toUpperCase() || 'UNCONFIGURED'}
                </span>
              </div>

              {labResult.remote_result?.status === 'completed' ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                      <span className="text-[#64748B] block">Job / Execution ID:</span>
                      <span className="font-mono text-[#0F172A] truncate block font-medium">
                        {(labResult.remote_result as any).execution_id || 'N/A'}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-[#E2E8F0]">
                      <span className="text-[#64748B] block">Measured Latency:</span>
                      <span className="font-mono font-bold text-[#0F172A] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#64748B]" />
                        {(labResult.remote_result as any).latency_ms} ms
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0F172A]">Mastitis Risk Assessment:</span>
                      <RiskBadge 
                        status={(labResult.remote_result as any).risk_level} 
                        score={(labResult.remote_result as any).risk_score} 
                        showScore 
                      />
                    </div>
                    <div className="flex items-center justify-between text-[#475569]">
                      <span>Inter-Quarter Ratio:</span>
                      <strong className="font-mono text-[#0F172A]">{(labResult.remote_result as any).max_quarter_differential_ratio}x</strong>
                    </div>
                    <div className="flex items-center justify-between text-[#475569]">
                      <span>Affected Quarters:</span>
                      <span className="font-mono font-bold text-[#B91C1C]">
                        {(labResult.remote_result as any).affected_quarters?.join(', ') || 'None'}
                      </span>
                    </div>
                  </div>

                  {(labResult.remote_result as any).job_url && (
                    <div className="pt-1">
                      <a
                        href={(labResult.remote_result as any).job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#0369A1] hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Open Nodus Cloud Console</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* Truthful Unconfigured / Disconnected Notice */
                <div className="p-4 bg-white rounded-lg border border-[#FDE68A] space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-[#92400E]">
                    <Info className="w-4 h-4 text-[#D97706]" />
                    <span>Remote Path Notice</span>
                  </div>
                  <p className="text-[#475569] leading-relaxed">
                    {(labResult.remote_result as any)?.reason || (labResult.remote_result as any)?.error_details || 'NODUS_API_KEY is not configured in backend environment.'}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Per competition guidelines, local computation is never misrepresented as Nodus cloud execution. Set <code className="font-mono bg-[#F1F5F9] px-1 py-0.5 rounded">NODUS_API_KEY</code> in server secrets to dispatch container jobs to the remote cluster.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON Debug Dump */}
          {showJsonDump && (
            <div className="p-4 bg-[#0F172A] rounded-xl text-[#E2E8F0] font-mono text-xs overflow-x-auto max-h-72">
              <span className="text-[#94A3B8] block mb-2">// Complete Workload Lab Return Telemetry</span>
              <pre>{JSON.stringify(labResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
