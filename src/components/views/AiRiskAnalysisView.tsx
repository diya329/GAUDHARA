import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Activity, 
  HelpCircle, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Cpu, 
  Layers,
  ChevronRight
} from 'lucide-react';
import type { Animal, ScreeningRecord } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';

export const AiRiskAnalysisView: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAnimals(), api.getScreenings()]).then(([a, s]) => {
      setAnimals(a);
      setScreenings(s);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
          Veterinary Risk Analytics & Mammary Physiology
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Deterministic mathematical rules, quarter asymmetry diagnostics, and Nodus Compute workload benchmarks.
        </p>
      </div>

      {/* Core Analytical Principles (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wider">
              Marker 01
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
              Asymmetry Threshold: ≥1.15x
            </span>
          </div>
          <h3 className="font-bold text-sm text-[#0F172A]">
            Quarter Conductivity Differential Ratio (QDR)
          </h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            In healthy dairy cows, bilateral conductivity between contralateral quarters typically differs by &lt;6%. 
            When subclinical infection damages mammary epithelial tight junctions, Na+ and Cl- ions 
            leak into the milk of the affected quarter. Published literature (IDF Bulletin 338; Hamann &amp; Krömker) establishes 
            that a differential ratio exceeding <strong>1.15x</strong> between the highest and lowest quarter 
            serves as an early physiological screening indicator of unilateral mastitis.
          </p>
          <div className="pt-2 border-t border-[#E2E8F0] text-[11px] font-mono text-[#64748B]">
            Screening Indicator • Requires CMT & culture for confirmation
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wider">
              Marker 02
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
              Normal &lt;200k
            </span>
          </div>
          <h3 className="font-bold text-sm text-[#0F172A]">
            Somatic Cell Count Proxy (cells/mL)
          </h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            Somatic cells are primarily leukocytes (neutrophils, macrophages) mobilized to battle pathogens. 
            Levels under 200,000 cells/mL denote healthy parenchyma. Increases between 200,000 and 500,000 
            trigger subclinical warning protocols, and counts above 500,000 represent clinical inflammatory response.
          </p>
          <div className="pt-2 border-t border-[#E2E8F0] text-[11px] font-mono text-[#64748B]">
            Optical density calibrated against fluoro-opto-electronic counts
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wider">
              Marker 03
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
              Normal 6.5 - 6.8
            </span>
          </div>
          <h3 className="font-bold text-sm text-[#0F172A]">
            ISFET Potentiometric pH Shift
          </h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            Normal bovine milk pH is mildly acidic (6.55–6.75). Increased permeability of blood-milk barrier 
            causes alkaline blood serum (pH 7.4) transudate to leak into milk, raising pH above 6.90. 
            Conversely, coliform bacterial fermentations with lactic acid production drop pH below 6.40.
          </p>
          <div className="pt-2 border-t border-[#E2E8F0] text-[11px] font-mono text-[#64748B]">
            Solid-state ISFET ion-sensitive electrode telemetry
          </div>
        </div>
      </div>

      {/* Breed Susceptibility Matrix */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] space-y-4">
        <div>
          <h3 className="font-bold text-sm text-[#0F172A]">
            Breed-Specific Physiological Risk & Resilience Profile
          </h3>
          <p className="text-xs text-[#64748B]">
            Empirical tolerance observed across indigenous Bos indicus zebu, crossbreds, and bubaline breeds.
          </p>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-md">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-2.5">Breed Classification</th>
                <th className="px-4 py-2.5">Baseline EC (mS/cm)</th>
                <th className="px-4 py-2.5">Thermal Tolerance</th>
                <th className="px-4 py-2.5">Teat Sphincter Morphology</th>
                <th className="px-4 py-2.5">Mastitis Risk Vulnerability</th>
                <th className="px-4 py-2.5">Recommended Screening Cadence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr className="hover:bg-[#F8FAF9]">
                <td className="px-4 py-3 font-semibold text-[#0F172A]">Gir (Bos indicus)</td>
                <td className="px-4 py-3 font-mono">4.2 - 4.8</td>
                <td className="px-4 py-3 text-[#166534]">High (Heat-tolerant)</td>
                <td className="px-4 py-3">Tight sphincter, strong keratin plug</td>
                <td className="px-4 py-3 font-medium text-[#166534]">Low</td>
                <td className="px-4 py-3">Bi-weekly routine</td>
              </tr>
              <tr className="hover:bg-[#F8FAF9]">
                <td className="px-4 py-3 font-semibold text-[#0F172A]">Sahiwal</td>
                <td className="px-4 py-3 font-mono">4.3 - 4.9</td>
                <td className="px-4 py-3 text-[#166534]">High</td>
                <td className="px-4 py-3">Cylindrical teats, moderate canal length</td>
                <td className="px-4 py-3 font-medium text-[#166534]">Low to Moderate</td>
                <td className="px-4 py-3">Weekly routine</td>
              </tr>
              <tr className="hover:bg-[#F8FAF9]">
                <td className="px-4 py-3 font-semibold text-[#0F172A]">Murrah Buffalo</td>
                <td className="px-4 py-3 font-mono">4.0 - 4.6</td>
                <td className="px-4 py-3 text-[#334155]">Moderate (Requires wallowing)</td>
                <td className="px-4 py-3">Thick muscular sphincter ring</td>
                <td className="px-4 py-3 font-medium text-[#166534]">Very Low</td>
                <td className="px-4 py-3">Bi-weekly routine</td>
              </tr>
              <tr className="hover:bg-[#F8FAF9]">
                <td className="px-4 py-3 font-semibold text-[#0F172A]">HF Cross (Frieswal)</td>
                <td className="px-4 py-3 font-mono">4.8 - 5.4</td>
                <td className="px-4 py-3 text-[#B45309]">Lower (Prone to heat stress)</td>
                <td className="px-4 py-3">Funnel-shaped, prone to vacuum rings</td>
                <td className="px-4 py-3 font-semibold text-[#DC2626]">High (High-yield stress)</td>
                <td className="px-4 py-3 font-semibold text-[#DC2626]">Daily / Each Milking</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Workload Execution Diagnostics */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] space-y-3">
        <h3 className="font-bold text-sm text-[#0F172A]">
          Nodus Compute Pipeline Architecture
        </h3>
        <p className="text-xs text-[#475569] leading-relaxed">
          The GauDhara screening engine submits raw sensor packets (conductivity quartet, optical density, pH, 
          thermal telemetry) to Nodus Compute via the Python FastAPI backend. The workload applies physical sanity 
          checks, converts ADC voltages to ionic mobility factors, evaluates inter-quarter asymmetry, and computes 
          the bounded risk score (0-100) before persisting results in Supabase.
        </p>

        <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0] font-mono text-xs text-[#334155] space-y-1">
          <div>$ nodus run --entrypoint "python backend/workload.py" --workload gaudhara-screening</div>
          <div className="text-[#166534]">✓ Model Placement: CPU/GPU Compute Sandbox</div>
          <div className="text-[#166534]">✓ Quarter Differentials: Validated (FL/FR/RL/RR)</div>
          <div className="text-[#166534]">✓ Persistence Target: Supabase Postgres RLS (screenings table)</div>
        </div>
      </div>
    </div>
  );
};
