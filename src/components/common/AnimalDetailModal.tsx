import React from 'react';
import { X, Calendar, MapPin, Tag, Activity, FileText, CheckCircle2, AlertTriangle, Stethoscope, Database, Sparkles } from 'lucide-react';
import type { Animal, ScreeningRecord } from '../../types';
import { RiskBadge } from './RiskBadge';
import { useLanguage } from '../../i18n/LanguageContext';

interface AnimalDetailModalProps {
  animal: Animal | null;
  screenings: ScreeningRecord[];
  onClose: () => void;
  onScreenNow: (animal: Animal) => void;
  onAskVetAssistant?: (animal: Animal) => void;
}

export const AnimalDetailModal: React.FC<AnimalDetailModalProps> = ({
  animal,
  screenings,
  onClose,
  onScreenNow,
  onAskVetAssistant,
}) => {
  const { t } = useLanguage();
  if (!animal) return null;

  const animalScreenings = screenings.filter((s) => s.animal_id === animal.id);
  const latestScreening = animalScreenings[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm">
              {animal.tag_id.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">{animal.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-[#E2E8F0] rounded text-[#334155]">
                  {animal.tag_id}
                </span>
                <RiskBadge status={animal.status} />
              </div>
              <p className="text-xs text-[#64748B]">
                {animal.breed} · {t.parity} {animal.parity} · {animal.lactation_stage}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
              <span className="text-[#64748B] block mb-1">{t.rfidCode}</span>
              <span className="font-mono font-medium text-[#0F172A] block truncate">
                {animal.rfid_code}
              </span>
            </div>
            <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
              <span className="text-[#64748B] block mb-1">{t.penLocation}</span>
              <span className="font-medium text-[#0F172A] block truncate">
                {animal.barn_location}
              </span>
            </div>
            <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
              <span className="text-[#64748B] block mb-1">{t.dailyYieldLiters}</span>
              <span className="font-mono font-semibold text-[#0F172A] block">
                {animal.avg_daily_yield_liters} L / day
              </span>
            </div>
            <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0]">
              <span className="text-[#64748B] block mb-1">{t.lastScreened}</span>
              <span className="text-[#0F172A] block font-medium">
                {animal.last_screened_at 
                  ? new Date(animal.last_screened_at).toLocaleDateString()
                  : t.notAvailable}
              </span>
            </div>
          </div>

          {/* Notes */}
          {animal.notes && (
            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded text-xs text-[#92400E]">
              <strong>{t.veterinaryNotes}:</strong>
              <p className="mt-0.5">{animal.notes}</p>
            </div>
          )}

          {/* Latest Quarter Profile */}
          {latestScreening?.quarter_conductivities && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2">
                {t.quarterSymmetry} (mS/cm)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(latestScreening.quarter_conductivities).map(([q, val]) => {
                  const numVal = Number(val);
                  const isElevated = numVal >= 5.8;
                  return (
                    <div
                      key={q}
                      className={`p-3 rounded border flex items-center justify-between ${
                        isElevated ? 'bg-[#FEF2F2] border-[#FCA5A5]' : 'bg-[#F8FAF9] border-[#E2E8F0]'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-[#0F172A]">{t.quarter} {q}</span>
                        <span className="block text-[11px] text-[#64748B]">
                          {q === 'FL' ? t.quarterFL : q === 'FR' ? t.quarterFR : q === 'RL' ? t.quarterRL : t.quarterRR}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${isElevated ? 'text-[#DC2626]' : 'text-[#166534]'}`}>
                        {numVal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Screening History Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  {t.screeningLogs} ({animalScreenings.length})
                </h4>
                <span className="text-[10px] text-[#059669] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0] flex items-center gap-1 font-mono">
                  <Database className="w-2.5 h-2.5" />
                  {t.offlineCached}
                </span>
              </div>
            </div>

            {animalScreenings.length === 0 ? (
              <p className="text-xs text-[#64748B] italic p-4 text-center border border-dashed border-[#E2E8F0] rounded">
                {t.noAlertsFound}
              </p>
            ) : (
              <div className="border border-[#E2E8F0] rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-3 py-2">{t.lastScreened}</th>
                      <th className="px-3 py-2">{t.quarter}</th>
                      <th className="px-3 py-2">{t.electricalConductivity}</th>
                      <th className="px-3 py-2">{t.somaticCellProxy}</th>
                      <th className="px-3 py-2">{t.riskLevel}</th>
                      <th className="px-3 py-2">{t.nodusExecution}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {animalScreenings.slice(0, 5).map((scr) => (
                      <tr key={scr.id} className="hover:bg-[#F8FAF9]">
                        <td className="px-3 py-2 text-[#0F172A]">
                          {new Date(scr.screened_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-mono font-medium">{scr.quarter}</td>
                        <td className="px-3 py-2 font-mono">{scr.electrical_conductivity}</td>
                        <td className="px-3 py-2 font-mono">{scr.scc_estimate.toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold">
                          <RiskBadge status={scr.compute_result.risk_level} score={scr.compute_result.risk_score} showScore />
                        </td>
                        <td className="px-3 py-2 text-[11px] text-[#64748B]">
                          {scr.compute_result.provider === 'nodus_compute' ? 'Nodus Cloud' : 'Local Engine'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">
            ID: <span className="font-mono">{animal.id}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] border border-[#CBD5E1] rounded-md bg-white"
            >
              {t.closeModal}
            </button>
            {onAskVetAssistant && (
              <button
                onClick={() => {
                  onClose();
                  onAskVetAssistant(animal);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-[#1B4332] bg-[#EAF3EE] hover:bg-[#D4E8DC] border border-[#A7F3D0] rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1B4332]" />
                <span>{t.askGemini}</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onScreenNow(animal);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded-md flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t.recordMilkScreening}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
