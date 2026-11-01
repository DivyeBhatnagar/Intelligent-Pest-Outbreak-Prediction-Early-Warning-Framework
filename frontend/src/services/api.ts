import {
  PredictionRequest,
  PredictionResponse,
  WeatherTelemetry,
  Observation,
  AlertItem,
  ModelComparisonResponse,
  SystemHealthResponse,
} from '../types/dashboard';

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '') as string;
const API_BASE = RAW_API_BASE.replace(/\/+$/, ''); // Uses Vite proxy in development or configured backend URL in production

export const apiService = {
  // System Health
  async getHealth(): Promise<SystemHealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Stations
  async getStations(): Promise<{ count: number; stations: Array<{ name: string; latitude: number; longitude: number; state: string }> }> {
    const res = await fetch(`${API_BASE}/api/v1/stations`);
    if (!res.ok) throw new Error('Failed to fetch stations');
    return res.json();
  },

  // Station Risk Summary (Latest evaluated risk per station for map)
  async getStationRiskSummary(): Promise<{ stations: Array<{ location: string; latest_id: number; risk_score: number; risk_level: string; pest_name: string; crop: string; created_at: string }> }> {
    const res = await fetch(`${API_BASE}/api/v1/stations/summary`);
    if (!res.ok) throw new Error('Failed to fetch station risk summary');
    return res.json();
  },

  // Reference Pests
  async getReferencePests(): Promise<{ supported_crops: Record<string, string[]>; count: number }> {
    const res = await fetch(`${API_BASE}/api/v1/reference/pests`);
    if (!res.ok) throw new Error('Failed to fetch reference pests');
    return res.json();
  },

  // Reference Advisories (TNAU / ICAR)
  async getReferenceAdvisories(): Promise<{ tnau_guidelines: Array<any> }> {
    const res = await fetch(`${API_BASE}/api/v1/reference/advisories`);
    if (!res.ok) throw new Error('Failed to fetch reference advisories');
    return res.json();
  },

  // Live Weather Telemetry
  async getLiveWeather(location: string): Promise<WeatherTelemetry> {
    const res = await fetch(`${API_BASE}/api/v1/weather/live/${encodeURIComponent(location)}`);
    if (!res.ok) throw new Error(`Weather fetch failed for ${location}`);
    return res.json();
  },

  // Machine Learning Risk Evaluation (Prediction Studio)
  async evaluateRisk(payload: PredictionRequest): Promise<PredictionResponse> {
    const res = await fetch(`${API_BASE}/api/v1/predictions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Evaluation failed with status ${res.status}`);
    }
    return res.json();
  },

  // Field Observations
  async getObservations(params: {
    limit?: number;
    offset?: number;
    crop?: string;
    location?: string;
    severity?: string;
  } = {}): Promise<{ items: Observation[]; total: number }> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset !== undefined) query.set('offset', params.offset.toString());
    if (params.crop && params.crop !== 'ALL') query.set('crop', params.crop);
    if (params.location && params.location !== 'ALL') query.set('location', params.location);

    const res = await fetch(`${API_BASE}/api/v1/observations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load observations');
    const data = await res.json();
    return {
      items: data.items || [],
      total: data.total !== undefined ? data.total : (data.items ? data.items.length : 0),
    };
  },

  async createObservation(observation: Partial<Observation>): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(observation),
    });
    if (!res.ok) throw new Error('Failed to submit observation');
    return res.json();
  },

  // Early Warning Alerts
  async getAlerts(params: {
    status?: string;
    severity?: string;
    location?: string;
    crop?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: AlertItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status.toLowerCase());
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity.toUpperCase());
    if (params.location && params.location !== 'ALL') query.set('location', params.location);
    if (params.crop && params.crop !== 'ALL') query.set('crop', params.crop);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset !== undefined) query.set('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/api/v1/alerts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    const data = await res.json();
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return {
      items: data.items || [],
      total: data.total !== undefined ? data.total : (data.items ? data.items.length : 0),
    };
  },

  async acknowledgeAlert(alertId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/alerts/${alertId}/ack`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },

  async resolveAlert(alertId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return res.json();
  },

  async dispatchAdvisory(payload: {
    location: string;
    crop: string;
    pest_name: string;
    risk_level: string;
    advisory_text: string;
    channel?: string;
    recipient?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/alerts/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to dispatch advisory');
    return res.json();
  },

  // Risk History Analytics
  async getRiskHistory(params: {
    limit?: number;
    crop?: string;
    pest_name?: string;
    location?: string;
  } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.crop && params.crop !== 'ALL') query.set('crop', params.crop);
    if (params.pest_name && params.pest_name !== 'ALL') query.set('pest_name', params.pest_name);
    if (params.location && params.location !== 'ALL') query.set('location', params.location);

    const res = await fetch(`${API_BASE}/api/v1/risk-history?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load risk history');
    const data = await res.json();
    return data.items || [];
  },

  // Model Comparison & Benchmarks
  async getModelComparison(): Promise<ModelComparisonResponse> {
    const res = await fetch(`${API_BASE}/api/model-comparison`);
    if (!res.ok) throw new Error('Failed to load model comparison');
    return res.json();
  },

  async getModelInfo(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/model-info`);
    if (!res.ok) throw new Error('Failed to load model info');
    return res.json();
  },
};
