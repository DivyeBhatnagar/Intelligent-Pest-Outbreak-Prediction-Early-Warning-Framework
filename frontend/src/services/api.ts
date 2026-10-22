import {
  PredictionRequest,
  PredictionResponse,
  WeatherTelemetry,
  Observation,
  AlertItem,
  ModelComparisonResponse,
  SystemHealthResponse,
} from '../types/dashboard';

const API_BASE = ''; // Uses Vite proxy in development or relative path in production

export const apiService = {
  // System Health
  async getHealth(): Promise<SystemHealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Stations
  async getStations() {
    const res = await fetch(`${API_BASE}/api/stations`);
    if (!res.ok) throw new Error('Failed to fetch stations');
    return res.json();
  },

  // Live Weather Telemetry
  async getLiveWeather(location: string): Promise<WeatherTelemetry> {
    const res = await fetch(`${API_BASE}/api/v1/weather/live/${encodeURIComponent(location)}`);
    if (!res.ok) throw new Error(`Weather fetch failed for ${location}`);
    return res.json();
  },

  // Machine Learning Risk Evaluation
  async evaluateRisk(payload: PredictionRequest): Promise<PredictionResponse> {
    // Try /api/v1/predictions/evaluate first, fallback to /api/evaluate
    let res = await fetch(`${API_BASE}/api/v1/predictions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

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
    if (params.offset) query.set('offset', params.offset.toString());
    if (params.crop) query.set('crop', params.crop);
    if (params.location) query.set('location', params.location);
    if (params.severity) query.set('severity', params.severity);

    const res = await fetch(`${API_BASE}/api/observations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load observations');
    const data = await res.json();
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return {
      items: data.items || [],
      total: data.total || (data.items ? data.items.length : 0),
    };
  },

  async createObservation(observation: Partial<Observation>): Promise<any> {
    const res = await fetch(`${API_BASE}/api/observations`, {
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
    limit?: number;
  } = {}): Promise<AlertItem[]> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/api/alerts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async acknowledgeAlert(alertId: number, officerName: string = 'Field Officer'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officer_name: officerName }),
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },

  async resolveAlert(alertId: number, resolutionNotes: string, officerName: string = 'Field Officer'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution_notes: resolutionNotes,
        officer_name: officerName,
      }),
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
    recipient_email?: string;
    recipient_phone?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/alerts/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to dispatch advisory');
    return res.json();
  },

  // Risk History
  async getRiskHistory(days: number = 30): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/risk/history?days=${days}`);
    if (!res.ok) throw new Error('Failed to load risk history');
    return res.json();
  },

  // Model Benchmarks & Comparison
  async getModelComparison(): Promise<ModelComparisonResponse> {
    const res = await fetch(`${API_BASE}/api/model-comparison`);
    if (!res.ok) throw new Error('Failed to load model comparison');
    return res.json();
  },

  // Station Summary
  async getStationSummary(code: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/station/${encodeURIComponent(code)}/summary`);
    if (!res.ok) throw new Error(`Failed to load summary for ${code}`);
    return res.json();
  },
};
