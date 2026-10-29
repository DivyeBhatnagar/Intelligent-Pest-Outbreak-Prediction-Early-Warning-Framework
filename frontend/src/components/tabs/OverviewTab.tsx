import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CloudSun,
  Flame,
  AlertCircle,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { STATIONS, PESTS_BY_CROP, RISK_BADGES, RISK_COLORS } from '../../constants/agroData';
import { apiService } from '../../services/api';
import { PredictionResponse, WeatherTelemetry, SystemHealthResponse, RiskLevel } from '../../types/dashboard';
import { StationMap } from '../common/StationMap';

interface OverviewTabProps {
  health: SystemHealthResponse | null;
  activeAlertCount: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ health, activeAlertCount }) => {
  // Form State
  const [crop, setCrop] = useState<string>('Rice');
  const [pestName, setPestName] = useState<string>('Brown Planthopper');
  const [location, setLocation] = useState<string>('Cuttack');
  const [standardWeek, setStandardWeek] = useState<number>(38);
  const [pestCount, setPestCount] = useState<number>(8.5);

  // Weather Inputs
  const [tempMax, setTempMax] = useState<number>(32.5);
  const [tempMin, setTempMin] = useState<number>(25.0);
  const [rhMorning, setRhMorning] = useState<number>(92.0);
  const [rhEvening, setRhEvening] = useState<number>(75.0);
  const [rainfall, setRainfall] = useState<number>(24.0);
  const [windSpeed, setWindSpeed] = useState<number>(4.2);

  // UI & Response States
  const [isFetchingWeather, setIsFetchingWeather] = useState<boolean>(false);
  const [weatherStatusMsg, setWeatherStatusMsg] = useState<string>('');
  const [weatherTelemetry, setWeatherTelemetry] = useState<WeatherTelemetry | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Station Risk Map for leaflet pins
  const [stationRisks, setStationRisks] = useState<Record<string, { risk_level: RiskLevel; risk_score: number; pest_name?: string }>>({});

  // Sync pest list when crop changes
  useEffect(() => {
    const pests = PESTS_BY_CROP[crop] || PESTS_BY_CROP.Rice;
    if (!pests.includes(pestName)) {
      setPestName(pests[0]);
    }
  }, [crop, pestName]);

  const handleSyncWeather = useCallback(async (loc: string) => {
    setIsFetchingWeather(true);
    setWeatherStatusMsg('Syncing telemetry…');
    try {
      const data = await apiService.getLiveWeather(loc);
      setWeatherTelemetry(data);
      if (data.temp_max !== undefined) setTempMax(data.temp_max);
      if (data.temp_min !== undefined) setTempMin(data.temp_min);
      if (data.rh_morning !== undefined) setRhMorning(data.rh_morning);
      if (data.rh_evening !== undefined) setRhEvening(data.rh_evening);
      if (data.rainfall !== undefined) setRainfall(data.rainfall);
      if (data.wind_speed !== undefined) setWindSpeed(data.wind_speed);
      if (data.standard_week) setStandardWeek(data.standard_week);
      setWeatherStatusMsg(`Source: ${data.source || 'Open-Meteo'} (${data.status === 'fallback' ? 'Offline baseline' : 'Live'})`);
    } catch {
      setWeatherStatusMsg('Agro-climatic baseline (offline mode)');
    } finally {
      setIsFetchingWeather(false);
    }
  }, []);

  // Initial weather fetch on mount and location change
  useEffect(() => {
    handleSyncWeather(location);
  }, [location, handleSyncWeather]);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setErrorMsg('');

    try {
      const res = await apiService.evaluateRisk({
        crop,
        pest_name: pestName,
        location,
        standard_week: standardWeek,
        current_pest_count: pestCount,
        weather: {
          temp_max: tempMax,
          temp_min: tempMin,
          rh_morning: rhMorning,
          rh_evening: rhEvening,
          rainfall,
          wind_speed: windSpeed,
          sunshine_hours: 6.5,
          evaporation: 4.0,
        },
      });

      setPrediction(res);
      // Update station risk pin on map
      setStationRisks((prev) => ({
        ...prev,
        [location]: {
          risk_level: res.risk_level,
          risk_score: res.risk_score,
          pest_name: pestName,
        },
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to run model evaluation. Verify FastAPI backend is running.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Calculated biological metrics
  const tMean = (tempMax + tempMin) / 2;
  const diurnalSwing = (tempMax - tempMin).toFixed(1);
  const rhDelta = (rhMorning - rhEvening).toFixed(1);
  const satVp = 0.61078 * Math.exp((17.27 * tMean) / (tMean + 237.3));
  const vpdCalc = (satVp * (1 - ((rhMorning + rhEvening) / 2) / 100)).toFixed(2);

  const activeBadge = prediction
    ? RISK_BADGES[prediction.risk_level]
    : RISK_BADGES.LOW;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto p-4 md:p-6">
      {/* ── Top Metric KPI Strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="w-1 absolute top-0 left-0 bottom-0 bg-emerald-500" />
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monitored Stations</div>
          <div className="text-2xl font-extrabold font-mono text-white mt-1">11</div>
          <div className="text-xs text-slate-400 mt-0.5">National ICAR/TNAU Centers</div>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="w-1 absolute top-0 left-0 bottom-0 bg-rose-500" />
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Alerts</div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 mt-1">{activeAlertCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Requiring IPM Intervention</div>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="w-1 absolute top-0 left-0 bottom-0 bg-blue-500" />
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Historical Records</div>
          <div className="text-2xl font-extrabold font-mono text-blue-400 mt-1">
            {health?.total_surveillance_records?.toLocaleString() || '35,499'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Rice & Cotton Weekly Logs</div>
        </div>

        <div className="glass-card p-4 relative overflow-hidden">
          <div className="w-1 absolute top-0 left-0 bottom-0 bg-purple-500" />
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Champion ML Model</div>
          <div className="text-lg font-extrabold text-purple-400 mt-1 truncate">Random Forest</div>
          <div className="text-xs text-slate-400 mt-0.5">F1: 0.9067 | ROC-AUC: 0.956</div>
        </div>

        <div className="glass-card p-4 relative overflow-hidden col-span-2 md:col-span-1">
          <div className="w-1 absolute top-0 left-0 bottom-0 bg-amber-500" />
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Agro Season</div>
          <div className="text-lg font-extrabold text-amber-400 mt-1 truncate">
            {weatherTelemetry?.season || 'Kharif Post-Monsoon'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">SMW {weatherTelemetry?.standard_week || standardWeek} · {weatherTelemetry?.date || 'Today'}</div>
        </div>
      </div>

      {/* ── Main Dual Panel Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Real-time Outbreak Predictor (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Real-Time Risk Inference
              </h2>
              <p className="text-xs text-slate-400">Micro-climatic bio-surveillance prediction</p>
            </div>
            <button
              type="button"
              onClick={() => handleSyncWeather(location)}
              disabled={isFetchingWeather}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <CloudSun className={`w-3.5 h-3.5 ${isFetchingWeather ? 'animate-spin' : ''}`} />
              <span>{isFetchingWeather ? 'Syncing…' : 'Auto-Fetch Weather'}</span>
            </button>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
            {/* Crop & Pest selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Crop</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Rice">Rice (Paddy)</option>
                  <option value="Cotton">Cotton (Kapas)</option>
                  <option value="Maize">Maize (Corn)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Monitored Pest</label>
                <select
                  value={pestName}
                  onChange={(e) => setPestName(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {(PESTS_BY_CROP[crop] || PESTS_BY_CROP.Rice).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Station Location & Week */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Surveillance Station</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {Object.keys(STATIONS).map((loc) => (
                    <option key={loc} value={loc}>{loc} — {STATIONS[loc].name.split('(')[0]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Standard Met Week (SMW)</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={standardWeek}
                  onChange={(e) => setStandardWeek(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Current Field Count */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Field Scout Population / Trap Catch Count
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={pestCount}
                onChange={(e) => setPestCount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Official Economic Threshold (ETL) for {pestName}: ~5.0 - 10.0 units
              </span>
            </div>

            {/* Weather Sensor Group */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-300">Meteorological Telemetry</span>
                <span className="text-[10px] text-slate-400">{weatherStatusMsg}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempMax}
                    onChange={(e) => setTempMax(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempMin}
                    onChange={(e) => setTempMin(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5">Morning RH (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rhMorning}
                    onChange={(e) => setRhMorning(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Evening RH (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rhEvening}
                    onChange={(e) => setRhEvening(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5">Rainfall (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rainfall}
                    onChange={(e) => setRainfall(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Wind Speed (km/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isEvaluating}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-glow-primary transition-all flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>{isEvaluating ? 'Evaluating Neural Trees…' : 'Run Risk Evaluation Engine'}</span>
            </button>
          </form>
        </div>

        {/* Right Output: Inference Results & Interactive Map (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Risk Prediction Result Card */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                  Model Prediction & Advisory Output
                </h3>
                <span className="text-xs text-slate-400">
                  {prediction ? `Model: ${prediction.model_version}` : 'Run evaluation to inspect predicted risk'}
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${activeBadge.color}`}>
                {activeBadge.icon} {prediction ? prediction.risk_level : 'AWAITING INFERENCE'}
              </div>
            </div>

            {/* Gauge & Main Advisory Banner */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Circular Risk Score Gauge */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      style={{
                        stroke: prediction ? RISK_COLORS[prediction.risk_level] : '#10b981',
                        transition: 'stroke-dasharray 0.8s ease',
                      }}
                      strokeDasharray={`${prediction ? Math.round(prediction.risk_score * 100) : 15}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-mono font-extrabold text-white">
                      {prediction ? prediction.risk_score.toFixed(2) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Risk Index</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Probability: {prediction ? `${(prediction.risk_score * 100).toFixed(1)}%` : '—'}
                </div>
              </div>

              {/* Agronomic Advisory Text */}
              <div className="md:col-span-8 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Official ICAR / TNAU Agronomic Advisory</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {prediction?.advisory ||
                    `Ready to compute bio-climatic forecast for ${pestName} in ${location}. Select weather inputs and click "Run Risk Evaluation Engine" to generate calibrated guidance.`}
                </p>
                {prediction?.is_warning && (
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                    🚨 <strong>Early Warning Triggered:</strong> Expected outbreak condition within 7 to 14 days. Notify regional extension officers.
                  </div>
                )}
              </div>
            </div>

            {/* Physiological Micro-indices */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Degree-Days (GDD)</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {prediction ? prediction.gdd_accumulated : (Math.max(tMean - 12, 0)).toFixed(1)}{' '}
                  <span className="text-[10px] text-slate-400">°C-d</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Vapor Deficit (VPD)</span>
                <span className="text-sm font-mono font-bold text-blue-400">
                  {prediction?.vpd || vpdCalc} <span className="text-[10px] text-slate-400">kPa</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Diurnal Swing</span>
                <span className="text-sm font-mono font-bold text-purple-400">
                  {diurnalSwing} <span className="text-[10px] text-slate-400">°C</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">RH Differential</span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  {prediction ? prediction.rh_differential : rhDelta}{' '}
                  <span className="text-[10px] text-slate-400">%</span>
                </span>
              </div>
            </div>

            {/* Top SHAP Contributing Factors */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-300">
                  SHAP Explainability Factors
                </span>
                <span className="text-[10px]">Local feature attribution</span>
              </div>

              {prediction?.top_factors && prediction.top_factors.length > 0 ? (
                <div className="space-y-1.5">
                  {prediction.top_factors.map((f, idx) => {
                    const isElevating = f.impact.toLowerCase().includes('elevat') || f.impact.includes('+');
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{f.feature}</div>
                          <div className="text-[11px] text-slate-400">{f.description}</div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            isElevating
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isElevating ? '+ Elevating Risk' : '~ Moderating Risk'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 rounded-lg bg-white/[0.01]">
                  Run model prediction above to calculate TreeSHAP local attribution weights.
                </div>
              )}
            </div>
          </div>

          {/* Micro Map & Station Network Overview */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Geographic Station Network
                </h3>
                <p className="text-xs text-slate-400">Active telemetry from 11 ICAR & TNAU stations across India</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                Selected: {location}
              </span>
            </div>

            <StationMap
              selectedLocation={location}
              onSelectStation={(st) => {
                setLocation(st);
                handleSyncWeather(st);
              }}
              stationRiskMap={stationRisks}
              height="280px"
            />

            {/* Live Station Telemetry Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block">Station Status</span>
                <span className="font-bold text-emerald-400">📡 {location} Online</span>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block">Current Weather</span>
                <span className="font-bold text-slate-200">🌤️ {weatherTelemetry?.condition || 'Clear Sky'}</span>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block">Sensor Temp / RH</span>
                <span className="font-mono font-bold text-slate-200">
                  {weatherTelemetry?.current_temp || tempMax}°C | {weatherTelemetry?.rh_current || rhMorning}%
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-slate-400 block">Target Crop</span>
                <span className="font-bold text-amber-400">{STATIONS[location]?.primary_crops?.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
