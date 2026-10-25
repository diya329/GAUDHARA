export type MastitisStatus = 'healthy' | 'subclinical_suspect' | 'clinical_alert' | 'in_recovery';

export type LactationStage = 'Early' | 'Mid' | 'Late' | 'Dry';

export type QuarterLocation = 'FL' | 'FR' | 'RL' | 'RR' | 'composite';

export interface QuarterConductivityData {
  FL: number;
  FR: number;
  RL: number;
  RR: number;
}

export interface Animal {
  id: string;
  tag_id: string;
  name: string;
  breed: string;
  date_of_birth: string;
  lactation_stage: LactationStage;
  parity: number;
  avg_daily_yield_liters: number;
  status: MastitisStatus;
  barn_location: string;
  rfid_code: string;
  last_screened_at: string | null;
  notes?: string;
  created_at: string;
}

export interface ScreeningInput {
  animal_id: string;
  quarter: QuarterLocation;
  electrical_conductivity: number; // in mS/cm
  quarter_conductivities?: QuarterConductivityData;
  ph_level: number;
  scc_estimate: number; // cells/mL
  temperature_c: number; // Celsius
  optical_density: number; // OD600 index
  milk_yield_kg?: number;
  screened_by?: string;
  notes?: string;
}

export interface AnomalyFactor {
  factor: string;
  value: string;
  threshold: string;
  severity: 'low' | 'moderate' | 'high';
  description: string;
}

export interface NodusComputeResult {
  provider: 'nodus_compute' | 'edge_engine' | 'local_fallback';
  execution_id: string;
  status: 'completed' | 'failed' | 'queued' | 'running';
  submitted_at: string;
  completed_at: string;
  latency_ms: number;
  risk_score: number; // 0 - 100
  risk_level: MastitisStatus;
  affected_quarters: QuarterLocation[];
  max_quarter_differential_ratio: number;
  anomaly_factors: AnomalyFactor[];
  veterinary_recommendations: string[];
  computation_method: string;
  job_url?: string;
  error_details?: string;
  raw_logs?: string[];
}

export interface ScreeningRecord {
  id: string;
  animal_id: string;
  animal_tag: string;
  animal_name: string;
  screened_at: string;
  quarter: QuarterLocation;
  electrical_conductivity: number;
  quarter_conductivities?: QuarterConductivityData;
  ph_level: number;
  scc_estimate: number;
  temperature_c: number;
  optical_density: number;
  milk_yield_kg?: number;
  compute_result: NodusComputeResult;
  notes?: string;
}

export interface AlertItem {
  id: string;
  created_at: string;
  animal_id: string;
  animal_tag: string;
  animal_name: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affected_quarter?: QuarterLocation;
  recommended_action: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface HardwareDevice {
  id: string;
  device_id: string;
  name: string;
  device_type: 'inline_chamber' | 'handheld_probe' | 'parlor_hub';
  status: 'online' | 'offline' | 'calibrating' | 'maintenance';
  battery_level_pct: number;
  firmware_version: string;
  last_heartbeat: string;
  current_temperature_c: number;
  assigned_parlor: string;
  sensors: {
    conductivity: 'calibrated' | 'uncalibrated' | 'error';
    ph_electrode: 'calibrated' | 'uncalibrated' | 'error';
    spectrometry: 'calibrated' | 'uncalibrated' | 'error';
    thermistor: 'calibrated' | 'uncalibrated' | 'error';
  };
}

export interface FarmStats {
  total_animals: number;
  screened_today: number;
  requiring_follow_up: number;
  healthy_count: number;
  subclinical_count: number;
  clinical_count: number;
  avg_herd_conductivity: number;
  active_devices: number;
}

export interface ClinicalEmergencyAlert {
  level: 'urgent' | 'warning' | 'educational';
  title: string;
  action: string;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  is_fallback?: boolean;
  language?: string;
  referenced_animal?: {
    tag_id: string;
    name: string;
    breed: string;
    status: MastitisStatus;
    lactation_stage: string;
    parity: number;
    avg_daily_yield_liters: number;
    barn_location: string;
    last_screened_at: string | null;
  };
  clinical_alert?: ClinicalEmergencyAlert;
  disclaimer?: string;
  status?: 'sending' | 'sent' | 'error';
  session_id?: string;
  instance_id?: string;
}

export interface Agent37StatusInfo {
  configured: boolean;
  is_connected: boolean;
  status: string;
  instance_id?: string | null;
  instance_url?: string | null;
  provider: string;
  template?: string;
  message: string;
}

export interface AssistantStatusInfo {
  status: string;
  active_provider: string;
  is_fallback: boolean;
  model_name: string;
  supported_languages: string[];
  rate_limiting: string;
  safety_disclaimer_mandatory: boolean;
  message: string;
  agent37?: Agent37StatusInfo;
}
export interface OfflineCacheMetadata {
  last_synced_at: string | null;
  animal_count: number;
  screening_count: number;
  alert_count: number;
  offline_queue_count: number;
  storage_estimate_kb?: number;
  is_offline: boolean;
  cache_initialized: boolean;
}

export interface OfflineQueuedScreening extends ScreeningRecord {
  queued_at: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_error?: string;
  is_offline_record?: boolean;
}

export interface OfflineSyncReport {
  synced_screenings: number;
  failed_screenings: number;
  synced_at: string;
  errors: string[];
}

export interface WorkloadLabExecutionStep {
  step: 'validation' | 'submission' | 'execution' | 'verification' | 'record';
  label: string;
  status: 'completed' | 'in_progress' | 'warning' | 'failed' | 'pending' | 'ready';
  details: string;
  timestamp?: string;
}

export interface WorkloadLabConcordance {
  agrees: boolean;
  risk_level_match: boolean;
  score_difference: number | null;
  affected_quarters_match: boolean;
  quarter_ratio_difference: number | null;
  summary: string;
  details?: string;
}

export interface WorkloadLabComparisonResult {
  status: 'completed' | 'validation_failed';
  sample: ScreeningInput;
  local_result: NodusComputeResult | null;
  remote_result: (NodusComputeResult & { reason?: string; configured?: boolean }) | {
    provider: string;
    status: string;
    configured: boolean;
    reason: string;
  } | null;
  concordance: WorkloadLabConcordance;
  execution_flow: WorkloadLabExecutionStep[];
  timestamp: string;
  validation_errors?: string[];
}

export interface PrioritizedActionAnimal {
  tag_id: string;
  name: string;
  breed: string;
  lactation_stage: LactationStage;
  parity: number;
  urgency: 'urgent' | 'high' | 'moderate' | 'routine';
  risk_level: MastitisStatus;
  risk_score: number;
  reasons: string[];
  measurements: {
    ec: number;
    qdr: number;
    scc: number;
    ph: number;
    affected_quarter?: QuarterLocation;
  };
  history_trajectory: string;
  suggested_time_window: string;
  clinical_observations_needed: string[];
  missing_information: string[];
}

export interface HerdActionPlan {
  id: string;
  created_at: string;
  provider: 'agent37_cloud' | 'local_rule_planner';
  is_fallback: boolean;
  status: string;
  coverage: {
    total_animals: number;
    screened_count: number;
    flagged_count: number;
    coverage_pct: number;
  };
  prioritized_animals: PrioritizedActionAnimal[];
  veterinary_review_summary: string;
  observations_requiring_vet: string[];
  session_id?: string;
  instance_id?: string;
  disclaimer: string;
}

