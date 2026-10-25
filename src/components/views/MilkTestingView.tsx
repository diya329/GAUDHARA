import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Sparkles, 
  ArrowRight,
  Info,
  RotateCcw,
  Sliders
} from 'lucide-react';
import type { Animal, QuarterLocation, ScreeningInput, ScreeningRecord, NodusComputeResult } from '../../types';
import { api } from '../../services/api';
import { NodusExecutionPanel } from '../common/NodusExecutionPanel';
import { HorizontalRiskGauge } from '../common/HorizontalRiskGauge';
import { QuarterComparisonChart } from '../common/Charts';
import { OfflineBanner } from '../common/OfflineBanner';
import { useOffline } from '../../context/OfflineContext';
import { HardDrive, Database, WifiOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface MilkTestingViewProps {
  preselectedAnimal?: Animal | null;
  onScreeningComplete?: (record: ScreeningRecord) => void;
}

export const MilkTestingView: React.FC<MilkTestingViewProps> = ({
  preselectedAnimal,
  onScreeningComplete,
}) => {
  const { t } = useLanguage();
  const { isOffline, simulateOffline } = useOffline();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(preselectedAnimal?.id || '');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterLocation>('FL');
  
  // Sensor readings
  const [quarterConductivities, setQuarterConductivities] = useState({
    FL: 4.6,
    FR: 4.5,
    RL: 4.6,
    RR: 4.5,
  });
  const [bulkConductivity, setBulkConductivity] = useState<number>(4.6);
  const [phLevel, setPhLevel] = useState<number>(6.65);
  const [sccEstimate, setSccEstimate] = useState<number>(140_000);
  const [temperatureC, setTemperatureC] = useState<number>(38.6);
  const [opticalDensity, setOpticalDensity] = useState<number>(0.28);
  const [milkYieldKg, setMilkYieldKg] = useState<number>(8.5);
  const [notes, setNotes] = useState<string>('');
  const [inputOrigin, setInputOrigin] = useState<'manual' | 'preset_demo'>('manual');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [latestResult, setLatestResult] = useState<{ screening: ScreeningRecord; compute: NodusComputeResult } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getAnimals().then((data) => {
      setAnimals(data);
      if (!selectedAnimalId && data.length > 0) {
        setSelectedAnimalId(data[0].id);
      }
    });
  }, [selectedAnimalId]);

  useEffect(() => {
    if (preselectedAnimal) {
      setSelectedAnimalId(preselectedAnimal.id);
    }
  }, [preselectedAnimal]);

  // Compute live quarter ratio preview
  const qVals = Object.values(quarterConductivities);
  const minQ = Math.min(...qVals);
  const maxQ = Math.max(...qVals);
  const liveRatio = minQ > 0 ? (maxQ / minQ) : 1.0;

  // Preset loaders for repeatable verification
  const loadPreset = (type: 'healthy' | 'subclinical' | 'clinical') => {
    setInputOrigin('preset_demo');
    if (type === 'healthy') {
      const cow = animals.find(a => a.tag_id === 'GIR-104') || animals[0];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 4.6, FR: 4.5, RL: 4.6, RR: 4.5 });
      setBulkConductivity(4.55);
      setPhLevel(6.65);
      setSccEstimate(120_000);
      setTemperatureC(38.6);
      setOpticalDensity(0.28);
      setSelectedQuarter('FL');
      setNotes('Routine morning screening. Normal foremilk appearance.');
    } else if (type === 'subclinical') {
      // Subclinical unilateral case in FL (ratio = 1.28x)
      const cow = animals.find(a => a.tag_id === 'SAH-208') || animals[1];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 5.9, FR: 4.6, RL: 4.7, RR: 4.6 });
      setBulkConductivity(5.2);
      setPhLevel(6.75);
      setSccEstimate(320_000);
      setTemperatureC(38.8);
      setOpticalDensity(0.35);
      setSelectedQuarter('FL');
      setNotes('Slight teat firmness. Suspected unilateral subclinical mastitis.');
    } else if (type === 'clinical') {
      // Severe clinical mastitis in RL
      const cow = animals.find(a => a.tag_id === 'HFX-405') || animals[3];
      if (cow) setSelectedAnimalId(cow.id);
      setQuarterConductivities({ FL: 4.8, FR: 4.6, RL: 7.2, RR: 4.7 });
      setBulkConductivity(6.8);
      setPhLevel(7.15);
      setSccEstimate(850_000);
      setTemperatureC(39.8);
      setOpticalDensity(0.58);
      setSelectedQuarter('RL');
      setNotes('Flakes in foremilk cup. Udder quadrant warm and swollen.');
    }
    setErrorMessage(null);
  };

  const handleQuarterECChange = (quarter: 'FL' | 'FR' | 'RL' | 'RR', val: number) => {
    setInputOrigin('manual');
    const updated = { ...quarterConductivities, [quarter]: val };
    setQuarterConductivities(updated);
    // If the active quarter was modified, update bulk as well
    if (quarter === selectedQuarter) {
      setBulkConductivity(val);
    }
  };

  const handleExecuteScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimalId) {
      setErrorMessage('Please select a registered dairy animal to test.');
      return;
    }

    // Physical sanity range validation
    if (bulkConductivity < 1.0 || bulkConductivity > 15.0) {
      setErrorMessage(`Electrical conductivity (${bulkConductivity} mS/cm) is out of plausible range [1.0 - 15.0].`);
      return;
    }
    if (phLevel < 4.0 || phLevel > 9.0) {
      setErrorMessage(`Milk pH (${phLevel}) is out of plausible physical range [4.0 - 9.0].`);
      return;
    }
    if (sccEstimate < 0 || sccEstimate > 15000000) {
      setErrorMessage(`Somatic Cell Count proxy (${sccEstimate}) is out of plausible range [0 - 15,000,000 cells/mL].`);
      return;
    }
    if (temperatureC < 30.0 || temperatureC > 43.0) {
      setErrorMessage(`Milk temperature (${temperatureC}°C) is out of physiological range [30.0 - 43.0°C].`);
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    const payload: ScreeningInput = {
      animal_id: selectedAnimalId,
      quarter: selectedQuarter,
      electrical_conductivity: bulkConductivity,
      quarter_conductivities: quarterConductivities,
      ph_level: phLevel,
      scc_estimate: sccEstimate,
      temperature_c: temperatureC,
      optical_density: opticalDensity,
      milk_yield_kg: milkYieldKg,
      notes: notes.trim() || undefined,
    };

    try {
      const result = await api.submitScreening(payload);
      setLatestResult(result);
      if (onScreeningComplete) {
        onScreeningComplete(result.screening);
      }
    } catch (err: any) {
      console.error('Screening execution failed:', err);
      setErrorMessage(err.message || 'Failed to submit screening workload to compute service.');
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);

  return (
    <div className="space-y-6">
      {/* Offline Status & IndexedDB Cache Banner */}
      <OfflineBanner />

      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.screeningTitle}
            </h1>
            {isOffline && (
              <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] flex items-center gap-1">
                <Database className="w-3 h-3" />
                {t.indexedDbCached}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.screeningSubtitle}
          </p>
        </div>

        {/* Quick Test Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B] hidden md:inline">
            {t.newCowBadge}:
          </span>
          <button
            type="button"
            onClick={() => loadPreset('healthy')}
            className="px-2.5 py-1 text-xs rounded border border-[#CBD5E1] bg-white text-[#166534] hover:bg-[#F0FDF4] font-medium cursor-pointer"
          >
            {t.healthy}
          </button>
          <button
            type="button"
            onClick={() => loadPreset('subclinical')}
            className="px-2.5 py-1 text-xs rounded border border-[#CBD5E1] bg-white text-[#B45309] hover:bg-[#FFFBEB] font-medium cursor-pointer"
          >
            {t.subclinical}
          </button>
          <button
            type="button"
            onClick={() => loadPreset('clinical')}
            className="px-2.5 py-1 text-xs rounded border border-[#CBD5E1] bg-white text-[#DC2626] hover:bg-[#FEF2F2] font-medium cursor-pointer"
          >
            {t.clinical}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md text-xs text-[#991B1B] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Validation or Compute Error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Main Workflow Form and Live Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form controls (2 cols) */}
        <form onSubmit={handleExecuteScreening} className="lg:col-span-2 space-y-6 bg-white p-6 rounded-lg border border-[#E2E8F0]">
          {/* Section 1: Animal Identification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              1. {t.selectCow} & {t.quarter}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.selectCow}
                </label>
                <select
                  value={selectedAnimalId}
                  onChange={(e) => setSelectedAnimalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                >
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.tag_id}) — {a.breed}
                    </option>
                  ))}
                </select>
                {selectedAnimal && (
                  <span className="text-[11px] text-[#64748B] block mt-1">
                    {t.penLocation}: {selectedAnimal.barn_location} · {t.parity}: {selectedAnimal.parity}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.quarter}
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
                      className={`py-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                        selectedQuarter === q
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#F8FAF9] text-[#334155] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-1">
                  FL: {t.quarterFLFull} · FR: {t.quarterFRFull} · RL: {t.quarterRLFull} · RR: {t.quarterRRFull}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Four-Quarter Electrical Conductivity Sensing */}
          <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                2. {t.enterQuarterConductivity}
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#64748B]">{t.qdrRatio}:</span>
                <strong className={`font-mono ${liveRatio >= 1.15 ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                  {liveRatio.toFixed(2)}x
                </strong>
                {liveRatio >= 1.15 && (
                  <span className="text-[10px] text-[#DC2626] font-semibold">({t.warning})</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['FL', 'FR', 'RL', 'RR'] as const).map((q) => (
                <div key={q} className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    {q} ({t.electricalConductivity})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="15.0"
                    value={quarterConductivities[q]}
                    onChange={(e) => handleQuarterECChange(q, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-[#CBD5E1] rounded bg-white text-[#0F172A]"
                  />
                  <span className="text-[10px] text-[#64748B] block mt-1">
                    {t.normal}: 4.0 - 5.5
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Milk Quality & Biological Markers */}
          <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              3. {t.liveEvaluation}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.phLevel}
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="5.0"
                  max="8.5"
                  value={phLevel}
                  onChange={(e) => setPhLevel(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">{t.normal}: 6.5 - 6.8</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.somaticCellProxy}
                </label>
                <input
                  type="number"
                  step="10000"
                  min="10000"
                  max="5000000"
                  value={sccEstimate}
                  onChange={(e) => setSccEstimate(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">{t.healthy}: &lt;200,000</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.temperatureC}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="32.0"
                  max="42.0"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">{t.normal}: 38.0 - 39.2</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.opticalDensity}
                </label>
                <input
                  type="number"
                  step="0.02"
                  min="0.1"
                  max="1.5"
                  value={opticalDensity}
                  onChange={(e) => setOpticalDensity(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-[#CBD5E1] rounded"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">{t.cameraOpticalAnalysis}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                {t.veterinaryNotes}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.qdrExplanation}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-md"
              />
            </div>
          </div>

          {/* Submission CTA */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Cpu className="w-4 h-4 text-[#1B4332]" />
              <span>{t.appName} {t.suiteName}</span>
            </div>

            <button
              type="submit"
              disabled={isExecuting}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded-md shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.loading}</span>
                </>
              ) : (
                <>
                  <span>{t.submitScreening}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Quarter Map & Realtime Indicator (1 col) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-4">
            <h3 className="font-bold text-sm text-[#0F172A]">
              {t.quarterSymmetry}
            </h3>

            <QuarterComparisonChart conductivities={quarterConductivities} />

            <div className="p-3 rounded bg-[#F8FAF9] border border-[#E2E8F0] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">{t.qdrRatio}:</span>
                <span className="font-mono font-bold text-[#0F172A]">{liveRatio.toFixed(2)}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">{t.thresholdStandard}:</span>
                <span className="font-mono text-[#64748B]">1.15x (IDF)</span>
              </div>
              <p className="text-[11px] text-[#475569] pt-1 border-t border-[#E2E8F0]">
                {liveRatio >= 1.25 ? (
                  <strong className="text-[#DC2626]">{t.clinical}: {t.qdrExplanation}</strong>
                ) : liveRatio >= 1.15 ? (
                  <strong className="text-[#B45309]">{t.subclinical}: {t.qdrExplanation}</strong>
                ) : (
                  <span className="text-[#166534]">{t.healthy}</span>
                )}
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#F1F5F3] border border-[#CBD5CD] rounded-lg text-xs space-y-2 text-[#2D3E33]">
            <div className="flex items-center gap-2 font-bold text-[#143D2B]">
              <Info className="w-4 h-4 text-[#1B4332]" />
              <span>{t.nodusExecution}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t.screeningSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Real Execution Evidence Panel when screening completes */}
      {latestResult && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              <span>Compute Execution Report for {latestResult.screening.animal_name} ({latestResult.screening.animal_tag})</span>
            </h3>
            <span className="text-xs text-[#64748B]">
              Recorded at {new Date(latestResult.screening.screened_at).toLocaleTimeString()}
            </span>
          </div>

          <HorizontalRiskGauge 
            score={latestResult.compute.risk_score} 
            quarterRatio={latestResult.compute.max_quarter_differential_ratio} 
          />

          <NodusExecutionPanel compute={latestResult.compute} />
        </div>
      )}
    </div>
  );
};
