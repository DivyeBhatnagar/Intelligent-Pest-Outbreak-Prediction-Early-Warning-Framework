import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { apiService } from '../../services/api';
import { STATIONS, PESTS_BY_CROP } from '../../constants/agroData';

export const RiskHistoryTab: React.FC = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [cropFilter, setCropFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [pestFilter, setPestFilter] = useState<string>('ALL');
  const [limit, setLimit] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getRiskHistory({
        limit,
        crop: cropFilter !== 'ALL' ? cropFilter : undefined,
        location: locationFilter !== 'ALL' ? locationFilter : undefined,
        pest_name: pestFilter !== 'ALL' ? pestFilter : undefined,
      });
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load risk history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [cropFilter, locationFilter, pestFilter, limit]);

  // Compute summary metrics from real database history
  const totalEntries = historyData.length;
  const avgRiskScore =
    totalEntries > 0
      ? (historyData.reduce((acc, curr) => acc + (curr.risk_score || 0), 0) / totalEntries) * 100
      : 0;
  const criticalOutbreaks = historyData.filter(
    (d) => d.risk_level === 'CRITICAL' || (d.risk_score && d.risk_score >= 0.8)
  ).length;

  // Format data for Recharts chronological sequence
  const chartData = [...historyData].reverse().map((item, idx) => ({
    name: item.created_at ? item.created_at.split(' ')[0] : `#${idx + 1}`,
    risk_score: item.risk_score !== undefined ? Math.round(item.risk_score * 100) : 0,
    gdd: item.gdd_accumulated ? Math.round(item.gdd_accumulated * 10) / 10 : 0,
    vpd: item.vpd_kpa ? Math.round(item.vpd_kpa * 100) / 100 : 0,
    location: item.location,
    pest: item.pest_name,
    crop: item.crop,
  }));

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-DEFAULT bg-surface-container-low border border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Empirical Longitudinal Trends
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-secondary">Temporal Surveillance Log</span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
            Risk History & Bio-Climatic Trajectories
          </h1>
          <p className="text-sm text-secondary mt-1">
            Historical progression of pest risk probabilities correlated with physiological Degree-Days and VPD.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-secondary font-semibold">Time Window:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-3 text-xs font-semibold text-on-surface focus:outline-none"
          >
            <option value={20}>Last 20 Observations</option>
            <option value={50}>Last 50 Observations</option>
            <option value={100}>Last 100 Observations</option>
          </select>
        </div>
      </div>

      {/* 4 Summary Metrics Bento Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-secondary">Logged Predictions</span>
          <div className="font-headline text-3xl font-bold text-on-surface mt-2">
            {totalEntries}
          </div>
          <span className="text-[11px] text-secondary mt-1 block">Inference audit records</span>
        </div>

        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-secondary">Mean Outbreak Risk</span>
          <div className="font-headline text-3xl font-bold text-primary mt-2">
            {avgRiskScore.toFixed(1)}%
          </div>
          <span className="text-[11px] text-secondary mt-1 block">Aggregated risk index</span>
        </div>

        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-secondary">Critical Outbreaks</span>
          <div className="font-headline text-3xl font-bold text-risk-critical mt-2">
            {criticalOutbreaks}
          </div>
          <span className="text-[11px] text-secondary mt-1 block">Breaches above 80% risk</span>
        </div>

        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-secondary">Current Season</span>
          <div className="font-headline text-3xl font-bold text-on-surface mt-2">
            Kharif / Rabi
          </div>
          <span className="text-[11px] text-secondary mt-1 block">Active agricultural cycle</span>
        </div>
      </div>

      {/* High Density Filter Dock */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-border-hairline shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Station:</span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Stations</option>
              {Object.keys(STATIONS).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Crop:</span>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Crops</option>
              <option value="Rice">Rice</option>
              <option value="Cotton">Cotton</option>
              <option value="Maize">Maize</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Pest:</span>
            <select
              value={pestFilter}
              onChange={(e) => setPestFilter(e.target.value)}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Pests</option>
              {(PESTS_BY_CROP[cropFilter] || Object.values(PESTS_BY_CROP).flat()).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Risk Score (%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Degree-Days (GDD)
          </span>
        </div>
      </div>

      {/* Primary Historical Risk Progression Chart */}
      <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline text-base font-bold text-on-surface">
              Historical Risk Progression vs Thermal Accumulation
            </h3>
            <p className="text-xs text-secondary">
              Direct telemetry from backend database audit logs
            </p>
          </div>
          <span className="text-xs font-mono text-secondary">
            {isLoading ? 'Querying records…' : `${chartData.length} Data Points`}
          </span>
        </div>

        <div className="w-full h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006c46" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#006c46" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gddGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk_score"
                  stroke="#006c46"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#riskGradient)"
                  name="Risk Score (%)"
                />
                <Area
                  type="monotone"
                  dataKey="gdd"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gddGradient)"
                  name="GDD (°C-day)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-secondary text-xs">
              No historical prediction data available for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
