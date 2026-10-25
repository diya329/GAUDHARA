import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Tag, 
  ChevronRight, 
  Activity, 
  X, 
  CheckCircle2, 
  Calendar,
  Layers,
  AlertTriangle
} from 'lucide-react';
import type { Animal, MastitisStatus, LactationStage } from '../../types';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { AnimalDetailModal } from '../common/AnimalDetailModal';
import { OfflineBanner } from '../common/OfflineBanner';
import { useLanguage } from '../../i18n/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { HardDrive, Database } from 'lucide-react';

interface AnimalMonitoringViewProps {
  onStartScreening: (animal: Animal) => void;
}

export const AnimalMonitoringView: React.FC<AnimalMonitoringViewProps> = ({
  onStartScreening,
}) => {
  const { t } = useLanguage();
  const { isOffline, cacheStatus, setShowOfflineModal } = useOffline();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [breedFilter, setBreedFilter] = useState<string>('all');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Animal Form state
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('Gir (Indigenous Zebu)');
  const [newStage, setNewStage] = useState<LactationStage>('Early');
  const [newParity, setNewParity] = useState(1);
  const [newYield, setNewYield] = useState(15.0);
  const [newLocation, setNewLocation] = useState('Shed 1 - Bay A');
  const [newRfid, setNewRfid] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [animalsData, screeningsData] = await Promise.all([
        api.getAnimals(),
        api.getScreenings(),
      ]);
      setAnimals(animalsData);
      setScreenings(screeningsData);
    } catch (err) {
      console.error('Failed to load herd animals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newTag.trim() || !newName.trim()) {
      setAddError('Ear tag ID and cow name are required.');
      return;
    }

    try {
      const created = await api.addAnimal({
        tag_id: newTag.trim().toUpperCase(),
        name: newName.trim(),
        breed: newBreed,
        date_of_birth: new Date().toISOString().split('T')[0],
        lactation_stage: newStage,
        parity: Number(newParity),
        avg_daily_yield_liters: Number(newYield),
        status: 'healthy',
        barn_location: newLocation,
        rfid_code: newRfid.trim() || `RFID-9820-${Math.floor(10000 + Math.random() * 90000)}`,
        last_screened_at: null,
        notes: newNotes.trim() || undefined,
      });

      setAnimals([created, ...animals]);
      setShowAddModal(false);
      // Reset form
      setNewTag('');
      setNewName('');
      setNewNotes('');
      setAddError(null);
    } catch (err: any) {
      setAddError(err.message || 'Failed to register animal.');
    }
  };

  const filteredAnimals = animals.filter((animal) => {
    const matchesSearch =
      animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.rfid_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || animal.status === statusFilter;
    const matchesBreed = breedFilter === 'all' || animal.breed.toLowerCase().includes(breedFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesBreed;
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
              {t.herdTitle}
            </h1>
            {isOffline && (
              <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] flex items-center gap-1">
                <Database className="w-3 h-3" />
                {t.indexedDbCached} ({cacheStatus?.animal_count || animals.length} cows)
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.herdSubtitle}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded-md shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.registerAnimal}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchHerdPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          >
            <option value="all">{t.filterAll}</option>
            <option value="healthy">{t.healthy}</option>
            <option value="subclinical_suspect">{t.subclinical}</option>
            <option value="clinical_alert">{t.clinical}</option>
            <option value="in_recovery">{t.inRecovery}</option>
          </select>

          {/* Breed Filter */}
          <select
            value={breedFilter}
            onChange={(e) => setBreedFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          >
            <option value="all">{t.breed}: {t.filterAll}</option>
            <option value="Gir">Gir (Indigenous)</option>
            <option value="Sahiwal">Sahiwal</option>
            <option value="Murrah">Murrah Buffalo</option>
            <option value="HF Cross">HF Cross (Frieswal)</option>
            <option value="Red Sindhi">Red Sindhi</option>
          </select>
        </div>
      </div>

      {/* Herd Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#64748B]">{t.loading}</div>
        ) : filteredAnimals.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B] space-y-2">
            <p>{t.searchHerdPlaceholder}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">{t.tagId}</th>
                  <th className="px-4 py-3">{t.cowName}</th>
                  <th className="px-4 py-3">{t.breed}</th>
                  <th className="px-4 py-3">{t.lactationStage}</th>
                  <th className="px-4 py-3">{t.parity}</th>
                  <th className="px-4 py-3">{t.dailyYieldLiters}</th>
                  <th className="px-4 py-3">{t.penLocation}</th>
                  <th className="px-4 py-3">{t.riskLevel}</th>
                  <th className="px-4 py-3">{t.lastScreened}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAnimals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">
                      {animal.tag_id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">
                      {animal.name}
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{animal.breed}</td>
                    <td className="px-4 py-3 text-[#475569]">{animal.lactation_stage}</td>
                    <td className="px-4 py-3 font-mono text-[#475569]">{animal.parity}</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#0F172A]">
                      {animal.avg_daily_yield_liters} L
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{animal.barn_location}</td>
                    <td className="px-4 py-3">
                      <RiskBadge status={animal.status} />
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {animal.last_screened_at 
                        ? new Date(animal.last_screened_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedAnimal(animal)}
                          className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded bg-white text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          {t.view}
                        </button>
                        <button
                          onClick={() => onStartScreening(animal)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#1B4332] hover:bg-[#143427] text-white rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Activity className="w-3 h-3" />
                          <span>{t.screenNow}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Animal Detail Modal */}
      <AnimalDetailModal
        animal={selectedAnimal}
        screenings={screenings}
        onClose={() => setSelectedAnimal(null)}
        onScreenNow={(a) => {
          setSelectedAnimal(null);
          onStartScreening(a);
        }}
      />

      {/* Add Animal Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">Register New Dairy Animal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md text-xs text-[#991B1B] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddAnimal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Ear Tag ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GIR-112"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded focus:ring-1 focus:ring-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Cow Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gauri"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded focus:ring-1 focus:ring-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Breed
                  </label>
                  <select
                    value={newBreed}
                    onChange={(e) => setNewBreed(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded"
                  >
                    <option value="Gir (Indigenous Zebu)">Gir (Indigenous Zebu)</option>
                    <option value="Sahiwal">Sahiwal</option>
                    <option value="Murrah Buffalo">Murrah Buffalo</option>
                    <option value="HF Cross (Frieswal)">HF Cross (Frieswal)</option>
                    <option value="Red Sindhi">Red Sindhi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Lactation Stage
                  </label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as LactationStage)}
                    className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded"
                  >
                    <option value="Early">Early Lactation (0-100d)</option>
                    <option value="Mid">Mid Lactation (100-200d)</option>
                    <option value="Late">Late Lactation (200-305d)</option>
                    <option value="Dry">Dry Cow Period</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Parity (Calvings)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newParity}
                    onChange={(e) => setNewParity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Daily Yield (L)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="60"
                    value={newYield}
                    onChange={(e) => setNewYield(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Barn Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  RFID / Electronic Transponder ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RFID-9820-00155"
                  value={newRfid}
                  onChange={(e) => setNewRfid(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-[#CBD5E1] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Veterinary / Medical Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Pedigree, teat condition, vaccination history..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9] rounded border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded shadow-xs"
                >
                  Save Animal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
