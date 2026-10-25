import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  Animal, 
  ScreeningInput, 
  ScreeningRecord, 
  AlertItem, 
  HardwareDevice, 
  FarmStats,
  NodusComputeResult,
  OfflineCacheMetadata,
  OfflineSyncReport,
  OfflineQueuedScreening,
  QuarterLocation,
  MastitisStatus,
  AnomalyFactor,
  WorkloadLabComparisonResult,
  HerdActionPlan
} from '../types';
import { offlineStorage, SEED_HISTORICAL_SCREENINGS } from './indexedDbCache';

const LOCAL_ANIMALS_KEY = 'gaudhara_animals_v2';
const LOCAL_SCREENINGS_KEY = 'gaudhara_screenings_v2';
const LOCAL_ALERTS_KEY = 'gaudhara_alerts_v2';

// Realistic dairy herd initial data (Gir, Sahiwal, Murrah, Red Sindhi, HF Cross)
const INITIAL_ANIMALS: Animal[] = [
  {
    id: 'a1b2c3d4-0001',
    tag_id: 'GIR-104',
    name: 'Ganga',
    breed: 'Gir (Indigenous Zebu)',
    date_of_birth: '2021-03-14',
    lactation_stage: 'Early',
    parity: 2,
    avg_daily_yield_liters: 16.5,
    status: 'healthy',
    barn_location: 'Shed 1 - Bay A',
    rfid_code: 'RFID-9820-00104',
    last_screened_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    created_at: '2023-01-15T00:00:00Z',
    notes: 'High genetic merit dam. Teat sphincter morphology optimal.'
  },
  {
    id: 'a1b2c3d4-0002',
    tag_id: 'SAH-208',
    name: 'Kamdhenu',
    breed: 'Sahiwal',
    date_of_birth: '2020-07-22',
    lactation_stage: 'Mid',
    parity: 3,
    avg_daily_yield_liters: 18.2,
    status: 'subclinical_suspect',
    barn_location: 'Shed 1 - Bay B',
    rfid_code: 'RFID-9820-00208',
    last_screened_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    created_at: '2023-02-10T00:00:00Z',
    notes: 'Front-Left (FL) quarter exhibiting slight firmness during post-milking palpation.'
  },
  {
    id: 'a1b2c3d4-0003',
    tag_id: 'MUR-312',
    name: 'Yamuna',
    breed: 'Murrah Buffalo',
    date_of_birth: '2019-11-05',
    lactation_stage: 'Mid',
    parity: 4,
    avg_daily_yield_liters: 14.0,
    status: 'healthy',
    barn_location: 'Shed 2 - Buffalo Stanchion',
    rfid_code: 'RFID-9820-00312',
    last_screened_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    created_at: '2023-02-20T00:00:00Z',
    notes: 'High milk fat (7.8%). Baseline electrical conductivity consistently 4.4 mS/cm.'
  },
  {
    id: 'a1b2c3d4-0004',
    tag_id: 'HFX-405',
    name: 'Lakshmi',
    breed: 'HF Cross (Frieswal)',
    date_of_birth: '2022-01-18',
    lactation_stage: 'Early',
    parity: 1,
    avg_daily_yield_liters: 24.5,
    status: 'clinical_alert',
    barn_location: 'Isolation Pen 1',
    rfid_code: 'RFID-9820-00405',
    last_screened_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    created_at: '2023-05-12T00:00:00Z',
    notes: 'Acute swelling in Rear-Left quarter. Clots observed on foremilk filter.'
  },
  {
    id: 'a1b2c3d4-0005',
    tag_id: 'RDS-519',
    name: 'Nandini',
    breed: 'Red Sindhi',
    date_of_birth: '2021-09-30',
    lactation_stage: 'Late',
    parity: 2,
    avg_daily_yield_liters: 11.8,
    status: 'healthy',
    barn_location: 'Shed 1 - Bay C',
    rfid_code: 'RFID-9820-00519',
    last_screened_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    created_at: '2023-06-01T00:00:00Z',
    notes: 'Approaching dry period in 45 days. Dry cow therapy protocol pending.'
  },
  {
    id: 'a1b2c3d4-0006',
    tag_id: 'GIR-109',
    name: 'Saraswati',
    breed: 'Gir (Indigenous Zebu)',
    date_of_birth: '2020-04-12',
    lactation_stage: 'Dry',
    parity: 3,
    avg_daily_yield_liters: 0.0,
    status: 'in_recovery',
    barn_location: 'Dry Herd Pasture',
    rfid_code: 'RFID-9820-00109',
    last_screened_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    created_at: '2023-06-15T00:00:00Z',
    notes: 'Recovering post internal teat sealant infusion.'
  }
];

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    animal_id: 'a1b2c3d4-0004',
    animal_tag: 'HFX-405',
    animal_name: 'Lakshmi',
    severity: 'critical',
    title: 'Acute Mastitis Detected in RL Quarter',
    description: 'Quarter conductivity reached 6.8 mS/cm with SCC > 800k cells/mL. Milk pH shifted alkaline to 7.1.',
    affected_quarter: 'RL',
    recommended_action: 'Isolate milk pipeline. Perform California Mastitis Test. Administer intramammary therapy under vet protocol.',
    status: 'pending'
  },
  {
    id: 'alt-002',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    animal_id: 'a1b2c3d4-0002',
    animal_tag: 'SAH-208',
    animal_name: 'Kamdhenu',
    severity: 'warning',
    title: 'Subclinical Quarter Differential Alert (FL vs FR)',
    description: 'FL conductivity is 1.28x higher than contralateral FR quarter (5.9 mS/cm vs 4.6 mS/cm).',
    affected_quarter: 'FL',
    recommended_action: 'Repeat screening in next evening milking. Check milking unit pulsation rate and liner condition.',
    status: 'pending'
  }
];

const INITIAL_DEVICES: HardwareDevice[] = [
  {
    id: 'dev-001',
    device_id: 'GD-ILM-2026-01',
    name: 'GauDhara In-line Parlor Chamber A',
    device_type: 'inline_chamber',
    status: 'online',
    battery_level_pct: 98,
    firmware_version: 'v2.4.1-field-ready',
    last_heartbeat: new Date().toISOString(),
    current_temperature_c: 24.2,
    assigned_parlor: 'Milking Parlor Shed 1',
    sensors: {
      conductivity: 'calibrated',
      ph_electrode: 'calibrated',
      spectrometry: 'calibrated',
      thermistor: 'calibrated'
    }
  },
  {
    id: 'dev-002',
    device_id: 'GD-HND-2026-08',
    name: 'GauDhara Mobile Handheld Scanner',
    device_type: 'handheld_probe',
    status: 'online',
    battery_level_pct: 74,
    firmware_version: 'v2.3.9',
    last_heartbeat: new Date(Date.now() - 300 * 1000).toISOString(),
    current_temperature_c: 26.5,
    assigned_parlor: 'Field Stanchion Kit',
    sensors: {
      conductivity: 'calibrated',
      ph_electrode: 'calibrated',
      spectrometry: 'calibrated',
      thermistor: 'calibrated'
    }
  },
  {
    id: 'dev-003',
    device_id: 'GD-HUB-2026-03',
    name: 'Barn IoT Telemetry Gateway',
    device_type: 'parlor_hub',
    status: 'online',
    battery_level_pct: 100,
    firmware_version: 'v1.8.0',
    last_heartbeat: new Date().toISOString(),
    current_temperature_c: 28.1,
    assigned_parlor: 'Main Server Rack',
    sensors: {
      conductivity: 'calibrated',
      ph_electrode: 'calibrated',
      spectrometry: 'calibrated',
      thermistor: 'calibrated'
    }
  }
];

// Helper: load/save local storage
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

// Ensure offline IndexedDB cache is pre-seeded with animals and historical records
offlineStorage.ensurePreseeded(INITIAL_ANIMALS, INITIAL_ALERTS).catch((err) => {
  console.warn('[GauDhara] Offline cache pre-seeding notice:', err);
});

// Autonomous Edge Physiological Assessment for offline field screening
function computeOfflineEdgeScreening(input: ScreeningInput): NodusComputeResult {
  const ec = input.electrical_conductivity;
  const scc = input.scc_estimate;
  const ph = input.ph_level;

  let maxRatio = 1.0;
  const affectedQuarters: QuarterLocation[] = [];
  if (input.quarter_conductivities) {
    const vals = Object.values(input.quarter_conductivities).filter((v) => typeof v === 'number' && v > 0);
    const minVal = vals.length > 0 ? Math.min(...vals) : ec;
    maxRatio = minVal > 0 ? Number((ec / minVal).toFixed(2)) : 1.0;
  }

  const isClinical = ec >= 6.5 || scc >= 500000 || ph >= 7.0 || maxRatio >= 1.35;
  const isSubclinical = !isClinical && (ec >= 5.5 || scc >= 200000 || ph >= 6.8 || maxRatio >= 1.15);

  let riskLevel: MastitisStatus = 'healthy';
  let riskScore = 12;
  const anomalyFactors: AnomalyFactor[] = [];
  const recs: string[] = [];

  if (isClinical) {
    riskLevel = 'clinical_alert';
    riskScore = Math.min(98, Math.round(50 + (ec - 5.5) * 20 + (scc / 30000)));
    affectedQuarters.push(input.quarter);
    anomalyFactors.push({
      factor: 'Quarter Electrical Conductivity',
      value: `${ec.toFixed(2)} mS/cm`,
      threshold: '> 5.8 mS/cm',
      severity: 'high',
      description: 'Severe ionic imbalance from compromised mammary tight junctions.'
    });
    if (scc >= 400000) {
      anomalyFactors.push({
        factor: 'Somatic Cell Proxy',
        value: `${scc.toLocaleString()} cells/mL`,
        threshold: '> 400,000 cells/mL',
        severity: 'high',
        description: 'Critical inflammatory neutrophil recruitment.'
      });
    }
    recs.push('Physically isolate milk line and withhold milk from collective bulk tank.');
    recs.push('Execute California Mastitis Test (CMT) to verify coagulated gel score.');
    recs.push('Consult registered veterinary officer for intramammary therapy protocol.');
  } else if (isSubclinical) {
    riskLevel = 'subclinical_suspect';
    riskScore = Math.min(74, Math.round(35 + (ec - 5.0) * 15 + (maxRatio - 1.0) * 40));
    affectedQuarters.push(input.quarter);
    anomalyFactors.push({
      factor: 'Quarter Asymmetry Ratio',
      value: `${maxRatio.toFixed(2)}x`,
      threshold: '> 1.15x',
      severity: 'moderate',
      description: 'Differential conductivity indicates subclinical tissue stress.'
    });
    recs.push('Re-screen during subsequent milking cycle to monitor trajectory.');
    recs.push('Inspect parlor cluster vacuum level and liner pulsation integrity.');
    recs.push('Apply post-dip teat barrier sealant.');
  } else {
    riskLevel = 'healthy';
    riskScore = Math.min(20, Math.round(ec * 2.5));
    recs.push('Milk screening indicates healthy mammary physiology.');
    recs.push('Next scheduled preventive screening in 3-5 days.');
  }

  return {
    provider: 'edge_engine',
    execution_id: `edge-offline-${Date.now()}`,
    status: 'completed',
    submitted_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    latency_ms: 15,
    risk_score: riskScore,
    risk_level: riskLevel,
    affected_quarters: affectedQuarters,
    max_quarter_differential_ratio: maxRatio,
    anomaly_factors: anomalyFactors,
    veterinary_recommendations: recs,
    computation_method: 'Autonomous Edge Physiological Assessment (IndexedDB Field Engine)'
  };
}

export const api = {
  // Animals API with IndexedDB caching
  async getAnimals(): Promise<Animal[]> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (!isOffline && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('animals')
          .select('*')
          .order('tag_id', { ascending: true });

        if (!error && data && data.length > 0) {
          // Asynchronously update IndexedDB cache
          offlineStorage.cacheAnimals(data as Animal[]).catch(() => {});
          setLocal(LOCAL_ANIMALS_KEY, data);
          return data as Animal[];
        }
      } catch (err) {
        console.warn('Supabase query failed, loading from IndexedDB offline cache:', err);
      }
    }

    // Try IndexedDB Cache First for offline field resilience
    try {
      const cached = await offlineStorage.getCachedAnimals();
      if (cached && cached.length > 0) {
        return cached;
      }
    } catch (e) {
      console.warn('IndexedDB animal read error:', e);
    }

    // Fall back to localStorage or initial seed
    const fallback = getLocal<Animal[]>(LOCAL_ANIMALS_KEY, INITIAL_ANIMALS);
    offlineStorage.cacheAnimals(fallback).catch(() => {});
    return fallback;
  },

  async addAnimal(animal: Omit<Animal, 'id' | 'created_at'>): Promise<Animal> {
    const current = await this.getAnimals();
    const tagUpper = animal.tag_id.trim().toUpperCase();
    const existing = current.find(a => a.tag_id.trim().toUpperCase() === tagUpper);
    if (existing) {
      throw new Error(`Ear tag ID "${tagUpper}" is already registered to cow "${existing.name}". Duplicate tag IDs are not permitted.`);
    }

    const newAnimal: Animal = {
      ...animal,
      tag_id: tagUpper,
      id: crypto.randomUUID ? crypto.randomUUID() : `animal-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('animals')
          .insert([newAnimal])
          .select()
          .single();

        if (!error && data) {
          const inserted = data as Animal;
          const cached = await offlineStorage.getCachedAnimals();
          offlineStorage.cacheAnimals([inserted, ...cached]).catch(() => {});
          return inserted;
        }
      } catch (err) {
        console.warn('Supabase insert failed, saving to IndexedDB cache:', err);
      }
    }

    const updated = [newAnimal, ...current];
    setLocal(LOCAL_ANIMALS_KEY, updated);
    await offlineStorage.cacheAnimals(updated);
    return newAnimal;
  },

  // Screenings API with IndexedDB offline retrieval
  async getScreenings(animalId?: string): Promise<ScreeningRecord[]> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (!isOffline && isSupabaseConfigured) {
      try {
        let query = supabase
          .from('screenings')
          .select('*')
          .order('screened_at', { ascending: false });

        if (animalId) {
          query = query.eq('animal_id', animalId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          offlineStorage.cacheScreenings(data as ScreeningRecord[]).catch(() => {});
          setLocal(LOCAL_SCREENINGS_KEY, data);
          return data as ScreeningRecord[];
        }
      } catch (err) {
        console.warn('Supabase screening query failed, querying IndexedDB cache:', err);
      }
    }

    // Load from IndexedDB Local Storage Cache
    try {
      const cached = await offlineStorage.getCachedScreenings(animalId);
      if (cached && cached.length > 0) {
        return cached;
      }
    } catch (e) {
      console.warn('IndexedDB screening query error:', e);
    }

    // Fall back to localStorage or pre-seeded historical screenings
    const fallbackList = getLocal<ScreeningRecord[]>(LOCAL_SCREENINGS_KEY, SEED_HISTORICAL_SCREENINGS);
    offlineStorage.cacheScreenings(fallbackList).catch(() => {});
    return animalId ? fallbackList.filter(s => s.animal_id === animalId) : fallbackList;
  },

  // End-to-end Screening submission with automatic offline Edge fallback & IndexedDB queue
  async submitScreening(input: ScreeningInput): Promise<{ screening: ScreeningRecord; compute: NodusComputeResult; is_offline?: boolean }> {
    const isNetworkOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    let computeResult: NodusComputeResult | null = null;
    let usedOfflineEdge = false;

    // 1. Try compute endpoint if online
    if (!isNetworkOffline) {
      try {
        const response = await fetch('/api/screenings/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });

        if (response.ok) {
          computeResult = await response.json();
        } else {
          console.warn(`Screening API returned ${response.status}, triggering offline edge engine`);
          usedOfflineEdge = true;
          computeResult = computeOfflineEdgeScreening(input);
        }
      } catch (netErr) {
        console.warn('Network unreachable for screening compute, executing edge engine:', netErr);
        usedOfflineEdge = true;
        computeResult = computeOfflineEdgeScreening(input);
      }
    } else {
      usedOfflineEdge = true;
      computeResult = computeOfflineEdgeScreening(input);
    }

    if (!computeResult) {
      computeResult = computeOfflineEdgeScreening(input);
      usedOfflineEdge = true;
    }

    // 2. Fetch animal metadata (from IndexedDB cache or fallback)
    const animals = await this.getAnimals();
    const animal = animals.find(a => a.id === input.animal_id);
    const animalTag = animal ? animal.tag_id : 'UNKNOWN';
    const animalName = animal ? animal.name : 'Unknown Animal';

    const newScreening: ScreeningRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `scr-${Date.now()}`,
      animal_id: input.animal_id,
      animal_tag: animalTag,
      animal_name: animalName,
      screened_at: new Date().toISOString(),
      quarter: input.quarter,
      electrical_conductivity: input.electrical_conductivity,
      quarter_conductivities: input.quarter_conductivities,
      ph_level: input.ph_level,
      scc_estimate: input.scc_estimate,
      temperature_c: input.temperature_c,
      optical_density: input.optical_density,
      milk_yield_kg: input.milk_yield_kg,
      compute_result: computeResult,
      notes: input.notes
    };

    // 3. Persist record to IndexedDB Cache
    await offlineStorage.addCachedScreening(newScreening);

    // If offline or edge engine used, enqueue for later cloud sync
    if (usedOfflineEdge) {
      await offlineStorage.enqueueOfflineScreening(newScreening);
    } else if (isSupabaseConfigured) {
      try {
        await supabase.from('screenings').insert([{
          id: newScreening.id,
          animal_id: newScreening.animal_id,
          animal_tag: newScreening.animal_tag,
          animal_name: newScreening.animal_name,
          screened_at: newScreening.screened_at,
          quarter: newScreening.quarter,
          electrical_conductivity: newScreening.electrical_conductivity,
          quarter_conductivities: newScreening.quarter_conductivities,
          ph_level: newScreening.ph_level,
          scc_estimate: newScreening.scc_estimate,
          temperature_c: newScreening.temperature_c,
          optical_density: newScreening.optical_density,
          compute_result: newScreening.compute_result,
          notes: newScreening.notes
        }]);
      } catch (err) {
        console.warn('Supabase screening persistence fallback, queuing in IndexedDB:', err);
        await offlineStorage.enqueueOfflineScreening(newScreening);
      }
    }

    const currentScreenings = getLocal<ScreeningRecord[]>(LOCAL_SCREENINGS_KEY, []);
    setLocal(LOCAL_SCREENINGS_KEY, [newScreening, ...currentScreenings]);

    // 4. Update animal status and last screened date in both IndexedDB and state
    const updatedAnimals = animals.map(a => {
      if (a.id === input.animal_id) {
        return {
          ...a,
          status: computeResult.risk_level,
          last_screened_at: newScreening.screened_at
        };
      }
      return a;
    });
    setLocal(LOCAL_ANIMALS_KEY, updatedAnimals);
    await offlineStorage.cacheAnimals(updatedAnimals);

    // 5. Generate or update alert if mastitis detected (prevents duplicate alerts on retries)
    if (computeResult.risk_level === 'clinical_alert' || computeResult.risk_level === 'subclinical_suspect') {
      const currentAlerts = await this.getAlerts();
      const existingAlertIndex = currentAlerts.findIndex(
        a => a.animal_id === input.animal_id && a.affected_quarter === input.quarter && a.status === 'pending'
      );

      const alertPayload: AlertItem = {
        id: existingAlertIndex >= 0 ? currentAlerts[existingAlertIndex].id : `alt-${Date.now()}`,
        created_at: new Date().toISOString(),
        animal_id: input.animal_id,
        animal_tag: animalTag,
        animal_name: animalName,
        severity: computeResult.risk_level === 'clinical_alert' ? 'critical' : 'warning',
        title: computeResult.risk_level === 'clinical_alert' 
          ? `Clinical Mastitis Detected (${input.quarter})`
          : `Subclinical Mastitis Warning (${input.quarter})`,
        description: `Risk score ${computeResult.risk_score}/100. EC: ${input.electrical_conductivity} mS/cm, SCC: ${input.scc_estimate.toLocaleString()} cells/mL, Ratio: ${computeResult.max_quarter_differential_ratio}x.`,
        affected_quarter: input.quarter,
        recommended_action: computeResult.veterinary_recommendations[0] || 'Schedule veterinary inspection.',
        status: 'pending'
      };

      let updatedAlerts: AlertItem[];
      if (existingAlertIndex >= 0) {
        updatedAlerts = currentAlerts.map((a, idx) => idx === existingAlertIndex ? alertPayload : a);
      } else {
        updatedAlerts = [alertPayload, ...currentAlerts];
      }
      setLocal(LOCAL_ALERTS_KEY, updatedAlerts);
      await offlineStorage.cacheAlerts(updatedAlerts);
    }

    return { 
      screening: newScreening, 
      compute: computeResult, 
      is_offline: usedOfflineEdge 
    };
  },

  // Alerts API with IndexedDB caching
  async getAlerts(): Promise<AlertItem[]> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (!isOffline && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          offlineStorage.cacheAlerts(data as AlertItem[]).catch(() => {});
          setLocal(LOCAL_ALERTS_KEY, data);
          return data as AlertItem[];
        }
      } catch (err) {
        console.warn('Supabase alert query failed, reading IndexedDB cache:', err);
      }
    }

    try {
      const cached = await offlineStorage.getCachedAlerts();
      if (cached && cached.length > 0) {
        return cached;
      }
    } catch (e) {
      console.warn('IndexedDB alerts query error:', e);
    }

    const fallback = getLocal<AlertItem[]>(LOCAL_ALERTS_KEY, INITIAL_ALERTS);
    offlineStorage.cacheAlerts(fallback).catch(() => {});
    return fallback;
  },

  async updateAlertStatus(alertId: string, status: 'resolved' | 'dismissed'): Promise<void> {
    if (isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await supabase.from('alerts').update({ status }).eq('id', alertId);
      } catch (err) {
        console.warn('Supabase alert update failed:', err);
      }
    }

    const alerts = await this.getAlerts();
    const updated = alerts.map(a => a.id === alertId ? { ...a, status } : a);
    setLocal(LOCAL_ALERTS_KEY, updated);
    await offlineStorage.cacheAlerts(updated);
  },

  // Hardware Devices API
  async getDevices(): Promise<HardwareDevice[]> {
    return INITIAL_DEVICES;
  },


  // Nodus Service Status
  async getNodusStatus() {
    try {
      const res = await fetch('/api/nodus/status');
      return await res.json();
    } catch {
      return {
        configured: false,
        provider: 'local_fallback',
        message: 'Could not contact server API status'
      };
    }
  },

  // Calculate live summary stats from actual animal and screening records
  async getStats(): Promise<FarmStats> {
    const animals = await this.getAnimals();
    const screenings = await this.getScreenings();
    const today = new Date().toISOString().split('T')[0];

    const screenedToday = screenings.filter(s => s.screened_at.startsWith(today)).length;
    const requiringFollowUp = animals.filter(a => a.status === 'clinical_alert' || a.status === 'subclinical_suspect').length;
    const healthyCount = animals.filter(a => a.status === 'healthy').length;
    const subclinicalCount = animals.filter(a => a.status === 'subclinical_suspect').length;
    const clinicalCount = animals.filter(a => a.status === 'clinical_alert').length;

    const avgEC = screenings.length > 0
      ? screenings.reduce((sum, s) => sum + s.electrical_conductivity, 0) / screenings.length
      : 4.8;

    return {
      total_animals: animals.length,
      screened_today: screenedToday,
      requiring_follow_up: requiringFollowUp,
      healthy_count: healthyCount,
      subclinical_count: subclinicalCount,
      clinical_count: clinicalCount,
      avg_herd_conductivity: Number(avgEC.toFixed(2)),
      active_devices: 3
    };
  },

  // Veterinary AI Assistant API
  async sendAssistantChat(params: {
    message: string;
    conversationHistory?: { role: string; content: string; timestamp?: string }[];
    language?: string;
    animalId?: string;
    tagId?: string;
    userId?: string;
    sessionId?: string;
    provider?: string;
  }) {
    // Get authorized herd records for context lookup
    const animals = await this.getAnimals();

    const payload = {
      message: params.message,
      conversation_history: params.conversationHistory || [],
      language: params.language || 'en',
      animal_id: params.animalId,
      tag_id: params.tagId,
      user_id: params.userId || 'authorized_veterinarian',
      animal_records: animals,
      session_id: params.sessionId,
      provider: params.provider
    };

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          return {
            status: 'rate_limited',
            reply: errorData.reply || 'Request rate limit reached (30 queries/min). Please pause for a moment.',
            is_fallback: true,
            provider: 'rate_limiter',
            timestamp: new Date().toISOString()
          };
        }
        throw new Error(errorData.error || errorData.reply || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.warn('Backend assistant chat call error:', err);
      // Transparent fallback response if network fails
      return {
        status: 'fallback',
        reply: `Network connection to inference service is currently interrupted (${err.message || 'Error'}). Please verify server connection or consult veterinary logs directly.`,
        is_fallback: true,
        provider: 'offline_safety_gate',
        timestamp: new Date().toISOString(),
        disclaimer: 'Veterinary Advisory: Ensure clinical observation by on-site veterinary staff.'
      };
    }
  },

  async askGeminiChat(params: {
    message: string;
    history?: Array<{ role: 'user' | 'model'; text: string; content?: string }>;
    language?: string;
    animalContext?: any;
  }) {
    try {
      const res = await fetch('/api/chat/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.reply || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('Backend Gemini chat call error:', err);
      return {
        reply: `Unable to connect to Gemini Veterinary AI service: ${err.message || 'Network error'}. Local physiological rule triage is active.`,
        provider: 'gemini-fallback',
        model_name: 'gemini-3.8-flash (offline mode)',
        is_fallback: true,
        status: 'fallback',
        timestamp: new Date().toISOString(),
        language: params.language || 'en',
        disclaimer: 'Veterinary Advisory: Ensure direct clinical observation by on-site veterinary staff.'
      };
    }
  },

  async getGeminiStatus() {
    try {
      const res = await fetch('/api/gemini/status');
      return await res.json();
    } catch {
      return {
        configured: false,
        model: 'gemini-3.8-flash',
        provider: 'gemini_official_sdk',
        status: 'unreachable'
      };
    }
  },

  async getAssistantStatus() {
    try {
      const res = await fetch('/api/assistant/status');
      return await res.json();
    } catch {
      return {
        status: 'offline',
        active_provider: 'gemini-3.8-flash',
        is_fallback: true,
        model_name: 'gemini-3.8-flash',
        supported_languages: ['en', 'hi', 'as', 'pa', 'gu', 'mr', 'bn', 'ta'],
        rate_limiting: '30 queries/minute',
        safety_disclaimer_mandatory: true,
        message: 'Running in Gemini 3.8 Flash Veterinary AI Engine Fallback Mode'
      };
    }
  },

  async getAgent37Status() {
    try {
      const res = await fetch('/api/agent37/status');
      return await res.json();
    } catch {
      return {
        configured: false,
        is_connected: false,
        status: 'unconfigured',
        provider: 'agent37_cloud',
        message: 'Could not contact Agent37 API status'
      };
    }
  },

  // --- Offline IndexedDB Synchronization & Diagnostic Methods ---

  async getOfflineCacheStatus(): Promise<OfflineCacheMetadata> {
    return await offlineStorage.getCacheMetadata();
  },

  async getOfflineQueue(): Promise<OfflineQueuedScreening[]> {
    return await offlineStorage.getOfflineQueue();
  },

  async preloadOfflineCache(): Promise<OfflineCacheMetadata> {
    const animals = await this.getAnimals();
    const screenings = await this.getScreenings();
    const alerts = await this.getAlerts();

    await offlineStorage.cacheAnimals(animals);
    await offlineStorage.cacheScreenings(screenings);
    await offlineStorage.cacheAlerts(alerts);

    return await offlineStorage.getCacheMetadata();
  },

  async clearOfflineCache(): Promise<void> {
    await offlineStorage.clearEntireCache();
    localStorage.removeItem(LOCAL_ANIMALS_KEY);
    localStorage.removeItem(LOCAL_SCREENINGS_KEY);
    localStorage.removeItem(LOCAL_ALERTS_KEY);
  },

  async syncOfflineQueue(): Promise<OfflineSyncReport> {
    const queue = await offlineStorage.getOfflineQueue();
    const report: OfflineSyncReport = {
      synced_screenings: 0,
      failed_screenings: 0,
      synced_at: new Date().toISOString(),
      errors: []
    };

    if (queue.length === 0) {
      return report;
    }

    for (const record of queue) {
      try {
        if (isSupabaseConfigured) {
          const { error } = await supabase.from('screenings').insert([{
            id: record.id,
            animal_id: record.animal_id,
            animal_tag: record.animal_tag,
            animal_name: record.animal_name,
            screened_at: record.screened_at,
            quarter: record.quarter,
            electrical_conductivity: record.electrical_conductivity,
            quarter_conductivities: record.quarter_conductivities,
            ph_level: record.ph_level,
            scc_estimate: record.scc_estimate,
            temperature_c: record.temperature_c,
            optical_density: record.optical_density,
            compute_result: record.compute_result,
            notes: record.notes
          }]);

          if (error) {
            throw error;
          }
        }

        // Successfully synced to cloud / backend
        await offlineStorage.removeFromOfflineQueue(record.id);
        report.synced_screenings++;
      } catch (err: any) {
        console.warn(`Failed to sync queued screening ${record.id}:`, err);
        report.failed_screenings++;
        report.errors.push(`Screening ${record.animal_tag} (${record.quarter}): ${err.message || 'Sync failed'}`);
      }
    }

    // Refresh animals and alerts after sync
    await this.getAnimals();
    await this.getAlerts();

    return report;
  },

  // --- Nodus Compute Workload Lab ---
  async runWorkloadLab(sample: ScreeningInput, runRemote: boolean = true): Promise<WorkloadLabComparisonResult> {
    try {
      const res = await fetch('/api/nodus/workload-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample, run_remote: runRemote })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 400 && errJson.validation_errors) {
          return errJson as WorkloadLabComparisonResult;
        }
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.warn('Backend workload lab error, executing local baseline fallback:', err);
      const localComp = computeOfflineEdgeScreening(sample);
      return {
        status: 'completed',
        sample,
        local_result: localComp,
        remote_result: {
          provider: 'nodus_compute',
          status: 'unreachable',
          configured: false,
          reason: `Server unreachable: ${err.message || 'Network error'}. Fallback to edge deterministic analysis.`
        },
        concordance: {
          agrees: false,
          risk_level_match: false,
          score_difference: null,
          affected_quarters_match: false,
          quarter_ratio_difference: null,
          summary: 'Evaluated on local autonomous edge engine. Remote execution endpoint was unreachable.'
        },
        execution_flow: [
          { step: 'validation', label: 'Sample Validation', status: 'completed', details: 'Passed local physical validation checks' },
          { step: 'submission', label: 'Workload Submission', status: 'completed', details: 'Configured local deterministic engine' },
          { step: 'execution', label: 'Workload Execution', status: 'completed', details: 'Executed local deterministic rule algorithms' },
          { step: 'verification', label: 'Result Verification', status: 'warning', details: 'Remote endpoint unreachable; local baseline only' },
          { step: 'record', label: 'Screening Record', status: 'ready', details: 'Ready to persist to herd screening records' }
        ],
        timestamp: new Date().toISOString()
      };
    }
  },

  // --- Herd Health Action Planner (Agent37 Workflow) ---
  async generateHerdActionPlan(params?: { language?: string }): Promise<HerdActionPlan> {
    const animals = await this.getAnimals();
    const screenings = await this.getScreenings();
    const alerts = await this.getAlerts();

    const payload = {
      animals,
      screenings,
      alerts,
      language: params?.language || 'en'
    };

    try {
      const res = await fetch('/api/agent37/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const plan: HerdActionPlan = await res.json();
        setLocal('gaudhara_cached_action_plan', plan);
        return plan;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      console.warn('API action plan call failed, checking cached plan or generating fallback:', err);
      const cached = getLocal<HerdActionPlan | null>('gaudhara_cached_action_plan', null);
      if (cached) return cached;

      // Deterministic client-side fallback
      const totalAnimals = animals.length;
      const screenedSet = new Set(screenings.map(s => s.animal_id));
      const healthyCount = animals.filter(a => a.status === 'healthy').length;
      const subclinicalCount = animals.filter(a => a.status === 'subclinical_suspect').length;
      const clinicalCount = animals.filter(a => a.status === 'clinical_alert').length;

      const fallbackPlan: HerdActionPlan = {
        id: `plan-local-${Date.now()}`,
        created_at: new Date().toISOString(),
        provider: 'local_rule_planner',
        is_fallback: true,
        status: 'fallback',
        coverage: {
          total_animals: totalAnimals,
          screened_count: screenedSet.size,
          flagged_count: subclinicalCount + clinicalCount,
          coverage_pct: Math.round((screenedSet.size / Math.max(1, totalAnimals)) * 100)
        },
        prioritized_animals: animals.map(a => {
          const aScreenings = screenings.filter(s => s.animal_id === a.id);
          const latestS = aScreenings[0];
          const isUrgent = a.status === 'clinical_alert';
          const isHigh = a.status === 'subclinical_suspect';
          return {
            tag_id: a.tag_id,
            name: a.name,
            breed: a.breed,
            lactation_stage: a.lactation_stage,
            parity: a.parity,
            urgency: isUrgent ? 'urgent' : (isHigh ? 'high' : 'routine'),
            risk_level: a.status,
            risk_score: latestS ? latestS.compute_result.risk_score : (isUrgent ? 85 : (isHigh ? 50 : 10)),
            reasons: isUrgent 
              ? ['Clinical signs or critical sensor breach: immediate isolation required.']
              : (isHigh ? ['Inter-quarter differential ratio >= 1.15x indicates unilateral subclinical mastitis.'] : ['Healthy physiological baseline.']),
            measurements: {
              ec: latestS ? latestS.electrical_conductivity : 4.6,
              qdr: latestS ? latestS.compute_result.max_quarter_differential_ratio : 1.02,
              scc: latestS ? latestS.scc_estimate : 120000,
              ph: latestS ? latestS.ph_level : 6.65,
              affected_quarter: latestS?.quarter
            },
            history_trajectory: aScreenings.length > 1 
              ? `Tracked over ${aScreenings.length} screenings.` 
              : 'Single baseline screening recorded.',
            suggested_time_window: isUrgent ? 'Within 6–12 hours' : (isHigh ? 'Within 24 hours' : 'Within 7–14 days'),
            clinical_observations_needed: [
              'Examine udder quarters for induration, swelling, or heat.',
              'Strip foremilk into dark cup to verify consistency.',
              'Check teat ends for vacuum hyperkeratosis.'
            ],
            missing_information: [
              'Bacteriological milk culture and sensitivity testing pending.',
              'Confirmation of California Mastitis Test (CMT) score.'
            ]
          };
        }),
        veterinary_review_summary: `Herd Triage: Evaluated ${totalAnimals} cows with ${screenedSet.size} screened. Immediate attention recommended for flagged cows. Maintain pre/post teat dip hygiene and cluster sanitization between milkings.`,
        observations_requiring_vet: [
          'Acute clinical swelling or clots in milk require immediate registered veterinary evaluation.',
          'Persistent unilateral quarter conductivity differential >1.15x over 3 milkings requires bacterial culture.'
        ],
        disclaimer: 'Veterinary Advisory: The GauDhara Action Planner provides screening triage and management scheduling recommendations. It does not prescribe pharmaceuticals or replace direct veterinary diagnosis.'
      };

      setLocal('gaudhara_cached_action_plan', fallbackPlan);
      return fallbackPlan;
    }
  },

  getCachedHerdActionPlan(): HerdActionPlan | null {
    return getLocal<HerdActionPlan | null>('gaudhara_cached_action_plan', null);
  }
};

