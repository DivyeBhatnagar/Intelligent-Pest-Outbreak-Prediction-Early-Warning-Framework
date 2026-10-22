export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface Station {
  code: string;
  name: string;
  state?: string;
  lat: number;
  lon: number;
  primary_crops?: string[];
}

export interface WeatherTelemetry {
  location: string;
  temp_max: number;
  temp_min: number;
  rh_morning: number;
  rh_evening: number;
  rainfall: number;
  wind_speed: number;
  sunshine_hours?: number;
  evaporation?: number;
  current_temp?: number;
  rh_current?: number;
  condition?: string;
  season?: string;
  standard_week?: number;
  time?: string;
  date?: string;
  source?: string;
  status?: string;
  timestamp?: string;
}

export interface TopFactor {
  feature: string;
  impact: string;
  description: string;
}

export interface PredictionRequest {
  crop: string;
  pest_name: string;
  location: string;
  standard_week: number;
  current_pest_count: number;
  weather: {
    temp_max: number;
    temp_min: number;
    rh_morning: number;
    rh_evening: number;
    rainfall: number;
    wind_speed: number;
    sunshine_hours: number;
    evaporation: number;
  };
}

export interface PredictionResponse {
  risk_score: number;
  risk_level: RiskLevel;
  is_warning: boolean;
  gdd_accumulated: number | string;
  rh_differential: number | string;
  top_factors: TopFactor[];
  advisory: string;
  model_version: string;
  vpd?: string | number;
}

export interface Observation {
  observation_id?: number;
  id?: number;
  observation_date: string;
  crop: string;
  pest_name: string;
  location: string;
  standard_week: number;
  pest_count: number;
  count_unit?: string;
  life_stage?: string;
  collection_method?: string;
  temp_max?: number | null;
  temp_min?: number | null;
  rh_morning?: number | null;
  rh_evening?: number | null;
  rainfall?: number | null;
  severity_level?: RiskLevel;
  notes?: string;
  observer_id?: string;
  verification_status?: string;
  created_at?: string;
}

export interface AlertItem {
  id: number;
  timestamp?: string;
  created_at?: string;
  location: string;
  crop: string;
  pest_name: string;
  risk_level: RiskLevel;
  risk_score: number;
  advisory_text: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  officer_notes?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  explanation_summary?: string;
}

export interface ModelMetric {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  false_negative_rate?: number;
  confusion_matrix?: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
}

export interface ModelComparisonResponse {
  champion: string;
  selection_metric: string;
  temporal_test_split: string;
  training_split: string;
  test_size: number;
  train_size: number;
  total_records: number;
  models: ModelMetric[];
  static_assets?: {
    shap_summary: string;
    confusion_matrix: string;
    roc_curve: string;
  };
}

export interface SystemHealthResponse {
  status: string;
  version: string;
  datasets_ready: boolean;
  total_surveillance_records: number;
  active_alerts: number;
  model_loaded: boolean;
  weather_service: string;
  database_connected?: boolean;
}
