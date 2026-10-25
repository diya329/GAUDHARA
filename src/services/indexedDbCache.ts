/**
 * GauDhara Dairy Mastitis Screening Platform
 * IndexedDB Local Storage Caching Layer for Offline Field Operations
 * 
 * Provides resilient, transactional offline persistence for:
 * - Animal health records (breed, lactation stage, status, baseline yield, RFID)
 * - Historical quarter milk screenings & Nodus telemetry logs
 * - Clinical mastitis alerts and recommended interventions
 * - Offline screening submission queue with automatic sync on network restoration
 */

import type { Animal, ScreeningRecord, AlertItem, OfflineCacheMetadata, OfflineQueuedScreening } from '../types';

const DB_NAME = 'GauDhara_IndexedDB_Cache_v1';
const DB_VERSION = 1;

// Object Store Names
export const STORES = {
  ANIMALS: 'animals',
  SCREENINGS: 'screenings',
  ALERTS: 'alerts',
  OFFLINE_QUEUE: 'offline_queue',
  METADATA: 'metadata'
} as const;

const LOCAL_STORAGE_FALLBACK_PREFIX = 'gaudhara_idb_fallback_';

// Initial baseline screenings for historical offline viewing
export const SEED_HISTORICAL_SCREENINGS: ScreeningRecord[] = [
  {
    id: 'scr-hist-001',
    animal_id: 'a1b2c3d4-0004',
    animal_tag: 'HFX-405',
    animal_name: 'Lakshmi',
    screened_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    quarter: 'RL',
    electrical_conductivity: 6.85,
    quarter_conductivities: { FL: 4.8, FR: 4.9, RL: 6.85, RR: 4.85 },
    ph_level: 7.12,
    scc_estimate: 840000,
    temperature_c: 39.4,
    optical_density: 0.62,
    milk_yield_kg: 5.2,
    compute_result: {
      provider: 'nodus_compute',
      execution_id: 'nodus-exec-rl-8921',
      status: 'completed',
      submitted_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (2 * 3600 - 4) * 1000).toISOString(),
      latency_ms: 184,
      risk_score: 92,
      risk_level: 'clinical_alert',
      affected_quarters: ['RL'],
      max_quarter_differential_ratio: 1.42,
      anomaly_factors: [
        {
          factor: 'Electrical Conductivity',
          value: '6.85 mS/cm',
          threshold: '> 5.8 mS/cm (ICAR threshold)',
          severity: 'high',
          description: 'Cell wall disruption causing sodium/chloride ion influx into milk.'
        },
        {
          factor: 'Contralateral Quarter Ratio',
          value: '1.42x (RL vs FR)',
          threshold: '> 1.15x differential',
          severity: 'high',
          description: 'Significant asymmetry compared to healthy contralateral quarter.'
        },
        {
          factor: 'Somatic Cell Proxy',
          value: '840,000 cells/mL',
          threshold: '> 400,000 cells/mL',
          severity: 'high',
          description: 'High neutrophil and leukocyte infiltration indicating acute inflammation.'
        }
      ],
      veterinary_recommendations: [
        'Immediate physical isolation of milking cluster to prevent cross-contamination.',
        'Perform strip cup examination and California Mastitis Test (CMT) to verify clot formation.',
        'Administer intramammary antimicrobial therapy under registered veterinarian supervision.'
      ],
      computation_method: 'Nodus Remote Heterogeneous Cloud Container + ICAR Quarter Ratio Algorithm',
      job_url: 'https://cluster.nodus-compute.ai/jobs/nodus-exec-rl-8921'
    },
    notes: 'Severe quarter heat and firmness palpable on rear-left udder.'
  },
  {
    id: 'scr-hist-002',
    animal_id: 'a1b2c3d4-0002',
    animal_tag: 'SAH-208',
    animal_name: 'Kamdhenu',
    screened_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    quarter: 'FL',
    electrical_conductivity: 5.92,
    quarter_conductivities: { FL: 5.92, FR: 4.62, RL: 4.70, RR: 4.65 },
    ph_level: 6.84,
    scc_estimate: 360000,
    temperature_c: 38.8,
    optical_density: 0.44,
    milk_yield_kg: 7.8,
    compute_result: {
      provider: 'nodus_compute',
      execution_id: 'nodus-exec-fl-3104',
      status: 'completed',
      submitted_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (6 * 3600 - 3) * 1000).toISOString(),
      latency_ms: 210,
      risk_score: 68,
      risk_level: 'subclinical_suspect',
      affected_quarters: ['FL'],
      max_quarter_differential_ratio: 1.28,
      anomaly_factors: [
        {
          factor: 'Quarter Differential Ratio',
          value: '1.28x (FL vs FR)',
          threshold: '> 1.15x',
          severity: 'moderate',
          description: 'Elevated differential indicates early asymptomatic subclinical changes.'
        },
        {
          factor: 'Electrical Conductivity',
          value: '5.92 mS/cm',
          threshold: '> 5.5 mS/cm',
          severity: 'moderate',
          description: 'Subclinical boundary elevation in front-left quarter.'
        }
      ],
      veterinary_recommendations: [
        'Mark cow for priority re-screening at subsequent milking session.',
        'Inspect teat liner condition and vacuum fluctuation on parlor unit 2.',
        'Apply post-milking barrier teat dip containing 1% iodophor.'
      ],
      computation_method: 'Nodus Neural Edge Inference with Sahiwal Baseline Calibration',
      job_url: 'https://cluster.nodus-compute.ai/jobs/nodus-exec-fl-3104'
    },
    notes: 'Subclinical suspect. No visible milk abnormalities.'
  },
  {
    id: 'scr-hist-003',
    animal_id: 'a1b2c3d4-0001',
    animal_tag: 'GIR-104',
    animal_name: 'Ganga',
    screened_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    quarter: 'composite',
    electrical_conductivity: 4.75,
    quarter_conductivities: { FL: 4.72, FR: 4.68, RL: 4.78, RR: 4.75 },
    ph_level: 6.65,
    scc_estimate: 85000,
    temperature_c: 38.5,
    optical_density: 0.28,
    milk_yield_kg: 8.5,
    compute_result: {
      provider: 'nodus_compute',
      execution_id: 'nodus-exec-cmp-1109',
      status: 'completed',
      submitted_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (4 * 3600 - 2) * 1000).toISOString(),
      latency_ms: 142,
      risk_score: 8,
      risk_level: 'healthy',
      affected_quarters: [],
      max_quarter_differential_ratio: 1.02,
      anomaly_factors: [],
      veterinary_recommendations: [
        'Optimal udder health. Maintain routine standard milking hygiene.',
        'Next scheduled screening in 3 days.'
      ],
      computation_method: 'Nodus Fast-Path Physiological Rule Engine',
      job_url: 'https://cluster.nodus-compute.ai/jobs/nodus-exec-cmp-1109'
    },
    notes: 'Healthy Indigenous Gir cow. Normal milk composition and somatic cell baseline.'
  },
  {
    id: 'scr-hist-004',
    animal_id: 'a1b2c3d4-0003',
    animal_tag: 'MUR-312',
    animal_name: 'Yamuna',
    screened_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    quarter: 'composite',
    electrical_conductivity: 4.45,
    quarter_conductivities: { FL: 4.42, FR: 4.40, RL: 4.48, RR: 4.45 },
    ph_level: 6.70,
    scc_estimate: 110000,
    temperature_c: 38.3,
    optical_density: 0.35,
    milk_yield_kg: 7.2,
    compute_result: {
      provider: 'nodus_compute',
      execution_id: 'nodus-exec-cmp-0899',
      status: 'completed',
      submitted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (12 * 3600 - 2) * 1000).toISOString(),
      latency_ms: 155,
      risk_score: 11,
      risk_level: 'healthy',
      affected_quarters: [],
      max_quarter_differential_ratio: 1.02,
      anomaly_factors: [],
      veterinary_recommendations: [
        'Normal Murrah buffalo profile. Buffalo baseline conductivity is typically 4.2-4.6 mS/cm.',
        'Continue regular nutrition and parlor routine.'
      ],
      computation_method: 'Nodus Buffalo Breed-Calibrated Assessment',
      job_url: 'https://cluster.nodus-compute.ai/jobs/nodus-exec-cmp-0899'
    },
    notes: 'High butterfat yield (7.8%). Stable quarter balance.'
  },
  {
    id: 'scr-hist-005',
    animal_id: 'a1b2c3d4-0005',
    animal_tag: 'RDS-519',
    animal_name: 'Nandini',
    screened_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    quarter: 'composite',
    electrical_conductivity: 4.88,
    quarter_conductivities: { FL: 4.85, FR: 4.82, RL: 4.90, RR: 4.88 },
    ph_level: 6.68,
    scc_estimate: 145000,
    temperature_c: 38.6,
    optical_density: 0.31,
    milk_yield_kg: 5.8,
    compute_result: {
      provider: 'nodus_compute',
      execution_id: 'nodus-exec-cmp-0720',
      status: 'completed',
      submitted_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - (24 * 3600 - 2) * 1000).toISOString(),
      latency_ms: 160,
      risk_score: 14,
      risk_level: 'healthy',
      affected_quarters: [],
      max_quarter_differential_ratio: 1.02,
      anomaly_factors: [],
      veterinary_recommendations: [
        'Late lactation profile within acceptable physiological limits.',
        'Plan dry cow management protocol in 30 days.'
      ],
      computation_method: 'Nodus Fast-Path Physiological Rule Engine',
      job_url: 'https://cluster.nodus-compute.ai/jobs/nodus-exec-cmp-0720'
    },
    notes: 'Approaching dry-off period. Healthy mammary tissue.'
  }
];

class IndexedDbCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDbSupported: boolean = false;

  constructor() {
    this.isIndexedDbSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Initializes and upgrades the IndexedDB database schema with versioning
   */
  public async getDb(): Promise<IDBDatabase> {
    if (!this.isIndexedDbSupported) {
      throw new Error('IndexedDB is not supported in this browser environment');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Animals Store
          if (!db.objectStoreNames.contains(STORES.ANIMALS)) {
            const animalStore = db.createObjectStore(STORES.ANIMALS, { keyPath: 'id' });
            animalStore.createIndex('tag_id', 'tag_id', { unique: true });
            animalStore.createIndex('status', 'status', { unique: false });
            animalStore.createIndex('breed', 'breed', { unique: false });
            animalStore.createIndex('last_screened_at', 'last_screened_at', { unique: false });
          }

          // 2. Screenings Store
          if (!db.objectStoreNames.contains(STORES.SCREENINGS)) {
            const screeningStore = db.createObjectStore(STORES.SCREENINGS, { keyPath: 'id' });
            screeningStore.createIndex('animal_id', 'animal_id', { unique: false });
            screeningStore.createIndex('animal_tag', 'animal_tag', { unique: false });
            screeningStore.createIndex('screened_at', 'screened_at', { unique: false });
            screeningStore.createIndex('quarter', 'quarter', { unique: false });
          }

          // 3. Alerts Store
          if (!db.objectStoreNames.contains(STORES.ALERTS)) {
            const alertStore = db.createObjectStore(STORES.ALERTS, { keyPath: 'id' });
            alertStore.createIndex('animal_id', 'animal_id', { unique: false });
            alertStore.createIndex('status', 'status', { unique: false });
            alertStore.createIndex('created_at', 'created_at', { unique: false });
          }

          // 4. Offline Screening Queue Store
          if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
            const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
            queueStore.createIndex('queued_at', 'queued_at', { unique: false });
            queueStore.createIndex('animal_id', 'animal_id', { unique: false });
          }

          // 5. Metadata Store
          if (!db.objectStoreNames.contains(STORES.METADATA)) {
            db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          resolve(db);
        };

        request.onerror = (event) => {
          console.error('[GauDhara IndexedDB] Failed to open database:', request.error || event);
          reject(request.error || new Error('Failed to open IndexedDB'));
        };

        request.onblocked = () => {
          console.warn('[GauDhara IndexedDB] Database open blocked by another tab');
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  // --- Animals Cache ---

  public async cacheAnimals(animals: Animal[]): Promise<void> {
    if (!animals || animals.length === 0) return;

    try {
      const db = await this.getDb();
      const tx = db.transaction([STORES.ANIMALS, STORES.METADATA], 'readwrite');
      const store = tx.objectStore(STORES.ANIMALS);

      for (const animal of animals) {
        store.put(animal);
      }

      const metaStore = tx.objectStore(STORES.METADATA);
      metaStore.put({ key: 'last_animals_sync', value: new Date().toISOString() });
      metaStore.put({ key: 'animals_count', value: animals.length });

      await this.promisifyTx(tx);
    } catch (err) {
      console.warn('[GauDhara IndexedDB] Animals cache fallback to localStorage:', err);
      this.setFallback(STORES.ANIMALS, animals);
    }
  }

  public async getCachedAnimals(): Promise<Animal[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.ANIMALS, 'readonly');
      const store = tx.objectStore(STORES.ANIMALS);
      const request = store.getAll();

      const animals = await this.promisifyRequest<Animal[]>(request);
      if (animals && animals.length > 0) {
        return animals;
      }
    } catch (err) {
      console.warn('[GauDhara IndexedDB] getCachedAnimals error, checking fallback:', err);
    }

    return this.getFallback<Animal[]>(STORES.ANIMALS, []);
  }

  public async getCachedAnimal(id: string): Promise<Animal | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.ANIMALS, 'readonly');
      const store = tx.objectStore(STORES.ANIMALS);
      const request = store.get(id);
      const result = await this.promisifyRequest<Animal | undefined>(request);
      return result || null;
    } catch {
      const animals = await this.getCachedAnimals();
      return animals.find(a => a.id === id) || null;
    }
  }

  // --- Screenings Cache ---

  public async cacheScreenings(screenings: ScreeningRecord[]): Promise<void> {
    if (!screenings || screenings.length === 0) return;

    try {
      const db = await this.getDb();
      const tx = db.transaction([STORES.SCREENINGS, STORES.METADATA], 'readwrite');
      const store = tx.objectStore(STORES.SCREENINGS);

      for (const screening of screenings) {
        store.put(screening);
      }

      const metaStore = tx.objectStore(STORES.METADATA);
      metaStore.put({ key: 'last_screenings_sync', value: new Date().toISOString() });
      metaStore.put({ key: 'screenings_count', value: screenings.length });

      await this.promisifyTx(tx);
    } catch (err) {
      console.warn('[GauDhara IndexedDB] Screenings cache fallback:', err);
      this.setFallback(STORES.SCREENINGS, screenings);
    }
  }

  public async addCachedScreening(screening: ScreeningRecord): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.SCREENINGS, 'readwrite');
      const store = tx.objectStore(STORES.SCREENINGS);
      store.put(screening);
      await this.promisifyTx(tx);
    } catch {
      const current = await this.getCachedScreenings();
      this.setFallback(STORES.SCREENINGS, [screening, ...current]);
    }
  }

  public async getCachedScreenings(animalId?: string): Promise<ScreeningRecord[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.SCREENINGS, 'readonly');
      const store = tx.objectStore(STORES.SCREENINGS);

      let screenings: ScreeningRecord[] = [];
      if (animalId) {
        const index = store.index('animal_id');
        screenings = await this.promisifyRequest<ScreeningRecord[]>(index.getAll(animalId));
      } else {
        screenings = await this.promisifyRequest<ScreeningRecord[]>(store.getAll());
      }

      // Sort newest first
      screenings.sort((a, b) => new Date(b.screened_at).getTime() - new Date(a.screened_at).getTime());

      if (screenings.length > 0) {
        return screenings;
      }
    } catch (err) {
      console.warn('[GauDhara IndexedDB] getCachedScreenings error, reading fallback:', err);
    }

    const fallbackList = this.getFallback<ScreeningRecord[]>(STORES.SCREENINGS, SEED_HISTORICAL_SCREENINGS);
    return animalId ? fallbackList.filter(s => s.animal_id === animalId) : fallbackList;
  }

  // --- Alerts Cache ---

  public async cacheAlerts(alerts: AlertItem[]): Promise<void> {
    if (!alerts || alerts.length === 0) return;

    try {
      const db = await this.getDb();
      const tx = db.transaction([STORES.ALERTS, STORES.METADATA], 'readwrite');
      const store = tx.objectStore(STORES.ALERTS);

      for (const alert of alerts) {
        store.put(alert);
      }

      await this.promisifyTx(tx);
    } catch (err) {
      this.setFallback(STORES.ALERTS, alerts);
    }
  }

  public async getCachedAlerts(): Promise<AlertItem[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.ALERTS, 'readonly');
      const store = tx.objectStore(STORES.ALERTS);
      const alerts = await this.promisifyRequest<AlertItem[]>(store.getAll());
      if (alerts && alerts.length > 0) {
        return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (err) {
      console.warn('[GauDhara IndexedDB] getCachedAlerts fallback error:', err);
    }

    return this.getFallback<AlertItem[]>(STORES.ALERTS, []);
  }

  // --- Offline Queue (for Screenings recorded without internet) ---

  public async enqueueOfflineScreening(screening: ScreeningRecord): Promise<OfflineQueuedScreening> {
    const queuedRecord: OfflineQueuedScreening = {
      ...screening,
      queued_at: new Date().toISOString(),
      sync_status: 'pending',
      is_offline_record: true
    };

    try {
      const db = await this.getDb();
      const tx = db.transaction([STORES.OFFLINE_QUEUE, STORES.SCREENINGS], 'readwrite');
      tx.objectStore(STORES.OFFLINE_QUEUE).put(queuedRecord);
      tx.objectStore(STORES.SCREENINGS).put(queuedRecord); // also make visible in screenings list immediately
      await this.promisifyTx(tx);
    } catch {
      const currentQueue = this.getFallback<OfflineQueuedScreening[]>(STORES.OFFLINE_QUEUE, []);
      this.setFallback(STORES.OFFLINE_QUEUE, [queuedRecord, ...currentQueue]);
      await this.addCachedScreening(queuedRecord);
    }

    return queuedRecord;
  }

  public async getOfflineQueue(): Promise<OfflineQueuedScreening[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.OFFLINE_QUEUE);
      const queue = await this.promisifyRequest<OfflineQueuedScreening[]>(store.getAll());
      return queue.sort((a, b) => new Date(b.queued_at).getTime() - new Date(a.queued_at).getTime());
    } catch {
      return this.getFallback<OfflineQueuedScreening[]>(STORES.OFFLINE_QUEUE, []);
    }
  }

  public async removeFromOfflineQueue(screeningId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite');
      tx.objectStore(STORES.OFFLINE_QUEUE).delete(screeningId);
      await this.promisifyTx(tx);
    } catch {
      const queue = await this.getOfflineQueue();
      this.setFallback(STORES.OFFLINE_QUEUE, queue.filter(q => q.id !== screeningId));
    }
  }

  public async clearOfflineQueue(): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite');
      tx.objectStore(STORES.OFFLINE_QUEUE).clear();
      await this.promisifyTx(tx);
    } catch {
      this.setFallback(STORES.OFFLINE_QUEUE, []);
    }
  }

  // --- Metadata & Diagnostics ---

  public async getCacheMetadata(): Promise<OfflineCacheMetadata> {
    let animalCount = 0;
    let screeningCount = 0;
    let alertCount = 0;
    let offlineQueueCount = 0;
    let lastSyncedAt: string | null = null;
    let storageEstimateKb = 0;

    try {
      const db = await this.getDb();
      const tx = db.transaction(
        [STORES.ANIMALS, STORES.SCREENINGS, STORES.ALERTS, STORES.OFFLINE_QUEUE, STORES.METADATA],
        'readonly'
      );

      animalCount = await this.promisifyRequest<number>(tx.objectStore(STORES.ANIMALS).count());
      screeningCount = await this.promisifyRequest<number>(tx.objectStore(STORES.SCREENINGS).count());
      alertCount = await this.promisifyRequest<number>(tx.objectStore(STORES.ALERTS).count());
      offlineQueueCount = await this.promisifyRequest<number>(tx.objectStore(STORES.OFFLINE_QUEUE).count());

      const lastSyncReq = tx.objectStore(STORES.METADATA).get('last_screenings_sync');
      const syncMeta = await this.promisifyRequest<{ key: string; value: string } | undefined>(lastSyncReq);
      lastSyncedAt = syncMeta?.value || null;

      // Estimate quota
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          storageEstimateKb = Math.round(estimate.usage / 1024);
        }
      }
    } catch {
      // Fallback counts
      animalCount = this.getFallback<Animal[]>(STORES.ANIMALS, []).length;
      screeningCount = this.getFallback<ScreeningRecord[]>(STORES.SCREENINGS, []).length;
      alertCount = this.getFallback<AlertItem[]>(STORES.ALERTS, []).length;
      offlineQueueCount = this.getFallback<any[]>(STORES.OFFLINE_QUEUE, []).length;
    }

    return {
      last_synced_at: lastSyncedAt,
      animal_count: animalCount,
      screening_count: screeningCount,
      alert_count: alertCount,
      offline_queue_count: offlineQueueCount,
      storage_estimate_kb: storageEstimateKb,
      is_offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      cache_initialized: animalCount > 0 || screeningCount > 0
    };
  }

  /**
   * Pre-seeds IndexedDB with essential historical screening logs and animal records
   * if the stores are currently empty, ensuring instant offline capability.
   */
  public async ensurePreseeded(animals: Animal[], alerts: AlertItem[]): Promise<void> {
    try {
      const existingScreenings = await this.getCachedScreenings();
      if (existingScreenings.length === 0) {
        await this.cacheScreenings(SEED_HISTORICAL_SCREENINGS);
      }

      const existingAnimals = await this.getCachedAnimals();
      if (existingAnimals.length === 0 && animals.length > 0) {
        await this.cacheAnimals(animals);
      }

      const existingAlerts = await this.getCachedAlerts();
      if (existingAlerts.length === 0 && alerts.length > 0) {
        await this.cacheAlerts(alerts);
      }
    } catch (err) {
      console.warn('[GauDhara IndexedDB] Pre-seeding notice:', err);
    }
  }

  public async clearEntireCache(): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(
        [STORES.ANIMALS, STORES.SCREENINGS, STORES.ALERTS, STORES.OFFLINE_QUEUE, STORES.METADATA],
        'readwrite'
      );
      tx.objectStore(STORES.ANIMALS).clear();
      tx.objectStore(STORES.SCREENINGS).clear();
      tx.objectStore(STORES.ALERTS).clear();
      tx.objectStore(STORES.OFFLINE_QUEUE).clear();
      tx.objectStore(STORES.METADATA).clear();
      await this.promisifyTx(tx);
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_FALLBACK_PREFIX + STORES.ANIMALS);
      localStorage.removeItem(LOCAL_STORAGE_FALLBACK_PREFIX + STORES.SCREENINGS);
      localStorage.removeItem(LOCAL_STORAGE_FALLBACK_PREFIX + STORES.ALERTS);
      localStorage.removeItem(LOCAL_STORAGE_FALLBACK_PREFIX + STORES.OFFLINE_QUEUE);
    }
  }

  // --- Internal Helpers ---

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private promisifyTx(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  private getFallback<T>(storeName: string, defaultVal: T): T {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_PREFIX + storeName);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private setFallback<T>(storeName: string, val: T): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_PREFIX + storeName, JSON.stringify(val));
    } catch {
      // Ignore quota error in fallback
    }
  }
}

export const offlineStorage = new IndexedDbCacheService();
