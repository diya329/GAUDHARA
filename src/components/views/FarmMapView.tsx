import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Home, 
  Maximize2,
  Info
} from 'lucide-react';
import type { Animal } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { useLanguage } from '../../i18n/LanguageContext';

interface FarmMapViewProps {
  onStartScreening: (animal: Animal) => void;
  onOpenAnimalDetail: (animal: Animal) => void;
}

export const FarmMapView: React.FC<FarmMapViewProps> = ({
  onStartScreening,
  onOpenAnimalDetail,
}) => {
  const { t } = useLanguage();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedPin, setSelectedPin] = useState<Animal | null>(null);

  useEffect(() => {
    api.getAnimals().then(setAnimals);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clinical_alert':
        return 'bg-[#DC2626] border-white text-white ring-2 ring-[#DC2626]/30';
      case 'subclinical_suspect':
        return 'bg-[#D97706] border-white text-white ring-2 ring-[#D97706]/30';
      case 'in_recovery':
        return 'bg-[#2563EB] border-white text-white ring-2 ring-[#2563EB]/30';
      case 'healthy':
      default:
        return 'bg-[#16A34A] border-white text-white ring-2 ring-[#16A34A]/30';
    }
  };

  // Group animals by barn location
  const barnZones = [
    {
      id: 'parlor',
      name: t.milkingParlor,
      type: 'critical',
      description: '4-stall automated milking unit with in-line AC conductivity sensors.',
      zoneAnimals: animals.filter(a => a.status === 'healthy').slice(0, 2),
    },
    {
      id: 'shed1',
      name: 'Shed 1 — Lactating Cows (Bays A & B)',
      type: 'active',
      description: 'High-yield indigenous Gir & Sahiwal milking stalls.',
      zoneAnimals: animals.filter(a => a.barn_location.includes('Shed 1')),
    },
    {
      id: 'shed2',
      name: 'Shed 2 — Murrah Buffalo Stanchion',
      type: 'active',
      description: 'High-fat bubaline herd stanchions with mist cooling.',
      zoneAnimals: animals.filter(a => a.barn_location.includes('Shed 2')),
    },
    {
      id: 'isolation',
      name: t.isolationPens,
      type: 'warning',
      description: 'Separate drainage and isolated pipeline for acute mastitis therapy.',
      zoneAnimals: animals.filter(a => a.status === 'clinical_alert' || a.barn_location.includes('Isolation')),
    },
    {
      id: 'pasture',
      name: 'Dry Cow & Heifer Grazing Pasture',
      type: 'neutral',
      description: 'Non-lactating herd grazing area prior to dry cow therapy protocols.',
      zoneAnimals: animals.filter(a => a.lactation_stage === 'Dry' || a.barn_location.includes('Pasture')),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.farmMapTitle}
            </h1>
            <span className="text-[10px] font-semibold text-[#1B4332] bg-[#F1F5F3] px-2 py-0.5 rounded border border-[#CBD5CD] uppercase font-mono">
              {t.barnLayoutMap}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.farmMapSubtitle}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span>{t.healthy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span>{t.subclinical}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span>{t.clinical}</span>
          </div>
        </div>
      </div>

      {/* Interactive Map Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barnZones.map((zone) => (
          <div
            key={zone.id}
            className={`p-5 rounded-lg border bg-white flex flex-col justify-between space-y-4 ${
              zone.id === 'isolation' && zone.zoneAnimals.length > 0
                ? 'border-[#FCA5A5] bg-[#FFFBFB]'
                : 'border-[#E2E8F0]'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1B4332] flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  <span>{zone.name}</span>
                </span>
                <span className="font-mono text-xs text-[#64748B] font-semibold">
                  {zone.zoneAnimals.length} {t.animals}
                </span>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                {zone.description}
              </p>
            </div>

            {/* Animal Stalls in this zone */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                {t.penLocation}:
              </span>

              {zone.zoneAnimals.length === 0 ? (
                <div className="p-3 bg-[#F8FAF9] rounded text-[11px] text-[#94A3B8] italic text-center">
                  {t.noAlertsFound}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {zone.zoneAnimals.map((animal) => (
                    <div
                      key={animal.id}
                      onClick={() => setSelectedPin(animal)}
                      className="p-2.5 rounded border border-[#E2E8F0] hover:border-[#1B4332] bg-white cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 ${getStatusColor(
                            animal.status
                          )}`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[#0F172A]">{animal.name}</span>
                            <span className="font-mono text-[10px] text-[#64748B]">({animal.tag_id})</span>
                          </div>
                          <span className="text-[10px] text-[#64748B] block">
                            {animal.breed} · {animal.avg_daily_yield_liters} L/day
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <RiskBadge status={animal.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Cow Location Popover */}
      {selectedPin && (
        <div className="p-4 rounded-lg bg-[#F1F5F3] border border-[#CBD5CD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm">
              {selectedPin.tag_id.slice(-3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#0F172A]">{selectedPin.name}</span>
                <span className="font-mono text-xs text-[#64748B]">({selectedPin.tag_id})</span>
                <RiskBadge status={selectedPin.status} />
              </div>
              <span className="text-xs text-[#475569]">
                {t.penLocation}: <strong>{selectedPin.barn_location}</strong> · RFID: <span className="font-mono">{selectedPin.rfid_code}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAnimalDetail(selectedPin)}
              className="px-3 py-1.5 text-xs font-medium text-[#334155] bg-white border border-[#CBD5E1] rounded"
            >
              {t.cowDetails}
            </button>
            <button
              onClick={() => onStartScreening(selectedPin)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded flex items-center gap-1"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t.recordMilkScreening}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
