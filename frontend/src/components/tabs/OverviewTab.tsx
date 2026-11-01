import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { PredictionResponse, WeatherTelemetry } from '../../types/dashboard';
import { PESTS_BY_CROP } from '../../constants/agroData';

interface OverviewTabProps {
  selectedLocation: string;
  selectedCrop: string;
  weather: WeatherTelemetry | null;
  onRefreshWeather: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  selectedLocation,
  selectedCrop,
  weather,
  onRefreshWeather,
  onNavigateToTab,
}) => {
  // Input form state for prediction studio
  const [crop, setCrop] = useState<string>(selectedCrop);
  const [pestName, setPestName] = useState<string>('Brown Planthopper');
  const [location, setLocation] = useState<string>(selectedLocation);
  const [standardWeek, setStandardWeek] = useState<number>(38);
  const [pestCount, setPestCount] = useState<number>(8.5);

  // Weather inputs for prediction
  const [tempMax, setTempMax] = useState<number>(32.5);
  const [tempMin, setTempMin] = useState<number>(24.5);
  const [rhMorning, setRhMorning] = useState<number>(90.0);
  const [rhEvening, setRhEvening] = useState<number>(72.0);
  const [rainfall, setRainfall] = useState<number>(15.0);
  const [windSpeed, setWindSpeed] = useState<number>(4.2);

  // Live state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Real data from backend
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [recentObservations, setRecentObservations] = useState<any[]>([]);
  const [advisoryGuidelines, setAdvisoryGuidelines] = useState<any[]>([]);
  const [stationRisks, setStationRisks] = useState<any[]>([]);

  // Sync crop when parent changes
  useEffect(() => {
    setCrop(selectedCrop);
    const pests = PESTS_BY_CROP[selectedCrop] || PESTS_BY_CROP.Rice;
    if (!pests.includes(pestName)) {
      setPestName(pests[0]);
    }
  }, [selectedCrop]);

  // Sync location when parent changes
  useEffect(() => {
    setLocation(selectedLocation);
  }, [selectedLocation]);

  // Sync weather inputs when live telemetry arrives
  useEffect(() => {
    if (weather) {
      if (weather.temp_max !== undefined) setTempMax(weather.temp_max);
      if (weather.temp_min !== undefined) setTempMin(weather.temp_min);
      if (weather.rh_morning !== undefined) setRhMorning(weather.rh_morning);
      if (weather.rh_evening !== undefined) setRhEvening(weather.rh_evening);
      if (weather.rainfall !== undefined) setRainfall(weather.rainfall);
      if (weather.wind_speed !== undefined) setWindSpeed(weather.wind_speed);
      if (weather.standard_week) setStandardWeek(weather.standard_week);
    }
  }, [weather]);

  // Load real backend data on mount
  useEffect(() => {
    const loadRealData = async () => {
      try {
        const [alertsRes, obsRes, advRes, sumRes] = await Promise.all([
          apiService.getAlerts({ limit: 5 }),
          apiService.getObservations({ limit: 5 }),
          apiService.getReferenceAdvisories(),
          apiService.getStationRiskSummary(),
        ]);
        setActiveAlerts(alertsRes.items);
        setRecentObservations(obsRes.items);
        setAdvisoryGuidelines(advRes.tnau_guidelines || []);
        setStationRisks(sumRes.stations || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    loadRealData();
  }, []);

  // Handle Predict
  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setErrorMessage('');
    try {
      const payload = {
        crop,
        pest_name: pestName,
        location,
        standard_week: Number(standardWeek),
        current_pest_count: Number(pestCount),
        weather: {
          temp_max: Number(tempMax),
          temp_min: Number(tempMin),
          rh_morning: Number(rhMorning),
          rh_evening: Number(rhEvening),
          rainfall: Number(rainfall),
          wind_speed: Number(windSpeed),
          sunshine_hours: 7.0,
          evaporation: 4.0,
        },
      };
      const res = await apiService.evaluateRisk(payload);
      setPrediction(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Prediction evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Find relevant advisory for current pest
  const currentAdvisory = advisoryGuidelines.find(
    (a) => a.Pest_Name?.toLowerCase().includes(pestName.toLowerCase()) || pestName.toLowerCase().includes(a.Pest_Name?.toLowerCase() || '')
  ) || advisoryGuidelines[0];

  // Most critical active alert
  const topAlert = activeAlerts.find((a) => a.severity === 'CRITICAL') || activeAlerts[0];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* 1. Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-DEFAULT bg-surface-container-low border border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              ICAR-TNAU Early Warning Framework
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-secondary">SMW {weather?.standard_week || 44}</span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
            Regional Crop Protection Command
          </h1>
          <p className="text-sm text-secondary mt-1">
            Monitoring Station: <strong className="text-on-surface">{selectedLocation}</strong> · Target Crop:{' '}
            <strong className="text-on-surface">{crop}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshWeather}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-highest hover:bg-surface-variant text-on-surface font-semibold text-xs border border-border-hairline transition-all"
          >
            <span className="material-symbols-outlined text-base">sync</span>
            <span>Sync Weather</span>
          </button>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('obs')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-xs shadow-sm hover:opacity-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Record Scouting</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Three Crop Health & Risk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Current Outbreak Risk */}
        <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline flex flex-col justify-between shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-secondary">Pest Risk Assessment</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                prediction
                  ? prediction.risk_level === 'CRITICAL'
                    ? 'bg-risk-critical/10 text-risk-critical'
                    : prediction.risk_level === 'HIGH'
                    ? 'bg-risk-high/10 text-risk-high'
                    : 'bg-risk-low/10 text-risk-low'
                  : 'bg-tertiary-container/40 text-primary'
              }`}
            >
              {prediction ? prediction.risk_level : 'EVALUATE BELOW'}
            </span>
          </div>
          <div className="my-6 text-center">
            <div className="font-headline text-5xl font-bold text-on-surface">
              {prediction ? `${(prediction.risk_score * 100).toFixed(0)}%` : '--'}
            </div>
            <div className="text-xs font-semibold text-secondary mt-1">
              Outbreak Probability ({pestName})
            </div>
          </div>
          <div className="pt-3 border-t border-border-hairline text-xs text-secondary flex justify-between">
            <span>Model: Random Forest Champion</span>
            <span className="font-mono text-primary font-semibold">90.67% F1</span>
          </div>
        </div>

        {/* Card 2: Weather & Pest Favorability */}
        <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline flex flex-col justify-between shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-secondary">Micro-Climatic Telemetry</span>
            <span className="flex items-center gap-1 text-xs text-primary font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              {weather?.source || 'Open-Meteo'}
            </span>
          </div>
          <div className="my-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface-soft">
              <span className="text-[11px] text-secondary block">Temperature</span>
              <span className="font-headline text-lg font-bold text-on-surface">
                {weather?.temp_max !== undefined ? `${weather.temp_max}° / ${weather.temp_min}°C` : '--'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-soft">
              <span className="text-[11px] text-secondary block">Humidity (Morn/Eve)</span>
              <span className="font-headline text-lg font-bold text-on-surface">
                {weather?.rh_morning !== undefined ? `${weather.rh_morning}% / ${weather.rh_evening}%` : '--'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-soft">
              <span className="text-[11px] text-secondary block">Precipitation</span>
              <span className="font-headline text-lg font-bold text-on-surface">
                {weather?.rainfall !== undefined ? `${weather.rainfall} mm` : '--'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-soft">
              <span className="text-[11px] text-secondary block">Wind Velocity</span>
              <span className="font-headline text-lg font-bold text-on-surface">
                {weather?.wind_speed !== undefined ? `${weather.wind_speed} km/h` : '--'}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-border-hairline text-xs text-secondary flex justify-between">
            <span>Station: {selectedLocation}</span>
            <span>{weather?.condition || 'Live Synced'}</span>
          </div>
        </div>

        {/* Card 3: ETL & Crop Protection Status */}
        <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline flex flex-col justify-between shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-secondary">Economic Threshold (ETL)</span>
            <span className="text-xs font-semibold text-secondary">{crop} Protocol</span>
          </div>
          <div className="my-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-on-surface">{pestName}</span>
              <span className="text-secondary">{pestCount} count recorded</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pestCount >= 10 ? 'bg-risk-critical' : pestCount >= 5 ? 'bg-risk-high' : 'bg-risk-low'
                }`}
                style={{ width: `${Math.min(100, (pestCount / 15) * 100)}%` }}
              />
            </div>
            <div className="mt-3 p-2.5 rounded-lg bg-surface-soft text-[11px] text-secondary leading-relaxed">
              <strong>Official ETL:</strong>{' '}
              {currentAdvisory?.Economic_Threshold_Level || '5–10 nymphs per hill or 10% leaf foliage injury.'}
            </div>
          </div>
          <div className="pt-3 border-t border-border-hairline text-xs text-secondary flex justify-between">
            <span>Surveillance Status</span>
            <span className="font-semibold text-on-surface">
              {pestCount >= 10 ? '🚨 Breach Threshold' : 'Within Tolerance'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Attention Required - Active Alert (Real Data) */}
      {topAlert && (
        <div className="p-5 rounded-DEFAULT bg-primary-fixed/20 border border-primary/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-risk-critical text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-risk-critical text-white">
                  {topAlert.severity}
                </span>
                <span className="text-xs text-secondary">
                  Location: {topAlert.location} · {topAlert.crop}
                </span>
              </div>
              <h3 className="font-headline text-base font-bold text-on-surface mt-1">
                {topAlert.pest_name}: Alert #{topAlert.id}
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                {topAlert.explanation_summary || 'Population dynamic indicates imminent field outbreak.'}
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('alerts')}
              className="px-4 py-2 rounded-full bg-on-surface text-canvas text-xs font-semibold hover:opacity-90 shrink-0"
            >
              View in Command Center
            </button>
          )}
        </div>
      )}

      {/* 4. Actionable Advisory Steps */}
      <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">
              Actionable Extension Guidelines ({pestName})
            </h2>
            <p className="text-xs text-secondary">
              Verified TNAU / ICAR integrated pest management protocols
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-primary">TNAU Production Guide</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-soft border border-border-hairline">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-on-surface">Biological Control</h4>
            <p className="text-[11px] text-secondary mt-1 leading-relaxed">
              {currentAdvisory?.Organic_Biocontrol || 'Release Trichogramma egg parasitoids @ 1,00,000/ha; deploy yellow sticky traps.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-soft border border-border-hairline">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-on-surface">Chemical Intervention</h4>
            <p className="text-[11px] text-secondary mt-1 leading-relaxed">
              {currentAdvisory?.Chemical_Control_Example || 'Chlorantraniliprole 18.5% SC @ 150 ml/ha or Triflumezopyrim 10% SC.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-soft border border-border-hairline">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-on-surface">Water & Canopy Management</h4>
            <p className="text-[11px] text-secondary mt-1 leading-relaxed">
              Drain standing field water for 48 hours to alter micro-climate humidity and dislodge basal nymph colonies.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-soft border border-border-hairline">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold mb-2">
              4
            </div>
            <h4 className="text-xs font-bold text-on-surface">Post-Treatment Scouting</h4>
            <p className="text-[11px] text-secondary mt-1 leading-relaxed">
              Conduct follow-up tiller counts at 72 hours post-application to verify population suppression below ETL.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Prediction Studio Form & Result */}
      <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-border-hairline gap-3">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              Machine Learning Pest Risk Prediction Studio
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Submit agronomic and weather parameters directly to the FastAPI Champion Random Forest Inference Engine.
            </p>
          </div>
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('predict')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary-container/30 hover:bg-tertiary-container text-primary font-bold text-xs border border-primary/20 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>Dedicated Studio Page</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </button>
          )}
        </div>

        <form onSubmit={handleEvaluate} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Crop</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Rice">Rice (Paddy)</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Maize">Maize</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Target Pest Vector</label>
                <select
                  value={pestName}
                  onChange={(e) => setPestName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(PESTS_BY_CROP[crop] || PESTS_BY_CROP.Rice).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Station / Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Max Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempMax}
                  onChange={(e) => setTempMax(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Min Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempMin}
                  onChange={(e) => setTempMin(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">RH Morn (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rhMorning}
                  onChange={(e) => setRhMorning(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">RH Eve (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rhEvening}
                  onChange={(e) => setRhEvening(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Weekly Rain (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rainfall}
                  onChange={(e) => setRainfall(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Wind Speed (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-secondary block mb-1">Current Pest Density</label>
                <input
                  type="number"
                  step="0.1"
                  value={pestCount}
                  onChange={(e) => setPestCount(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-mono text-on-surface"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isEvaluating}
              className="w-full py-3 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                {isEvaluating ? 'sync' : 'auto_awesome'}
              </span>
              <span>{isEvaluating ? 'Evaluating Model Inference…' : 'Run Machine Learning Prediction'}</span>
            </button>
          </div>

          {/* Right Result Panel (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-surface-soft border border-border-hairline flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
                <span className="text-xs font-bold text-secondary uppercase">ML Output Result</span>
                <span className="text-[11px] text-secondary font-mono">Status: Verified</span>
              </div>

              {prediction ? (
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-secondary">Predicted Risk Level:</span>
                      <div
                        className={`text-2xl font-headline font-bold ${
                          prediction.risk_level === 'CRITICAL'
                            ? 'text-risk-critical'
                            : prediction.risk_level === 'HIGH'
                            ? 'text-risk-high'
                            : 'text-risk-low'
                        }`}
                      >
                        {prediction.risk_level}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-secondary">Probability:</span>
                      <div className="font-headline text-3xl font-bold text-on-surface">
                        {(prediction.risk_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-border-hairline text-xs space-y-1">
                    <span className="font-bold text-on-surface block">Bio-Climatic Features:</span>
                    <div className="text-[11px] text-secondary">
                      Growing Degree-Days (GDD):{' '}
                      <strong>{typeof prediction.gdd_accumulated === 'number' ? prediction.gdd_accumulated.toFixed(1) : prediction.gdd_accumulated || '--'} °C-days</strong>
                    </div>
                    <div className="text-[11px] text-secondary">
                      Vapor Pressure Deficit (VPD):{' '}
                      <strong>{typeof prediction.vpd === 'number' ? prediction.vpd.toFixed(2) : prediction.vpd || '--'} kPa</strong>
                    </div>
                  </div>

                  {prediction.top_factors && prediction.top_factors.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Contributing Factors:</span>
                      {prediction.top_factors.map((f, i) => (
                        <div key={i} className="text-[11px] text-secondary flex justify-between">
                          <span>{f.feature}</span>
                          <span className="font-mono text-primary font-semibold">{f.impact}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-border-hairline text-xs">
                    <span className="font-bold text-on-surface block mb-1">Advisory Directive:</span>
                    <p className="text-[11px] text-secondary leading-relaxed">
                      {prediction.advisory}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-secondary text-xs">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-2 block">
                    psychology_alt
                  </span>
                  Ready to evaluate. Modify inputs or click &quot;Run Machine Learning Prediction&quot; to calculate live risk.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border-hairline text-[11px] text-secondary text-center">
              Powered by ICAR & TNAU Trained Random Forest Engine
            </div>
          </div>
        </form>
      </div>

      {/* 6. Two-Column Bottom Section (GIS & Field Observations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Regional Surveillance Status (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">map</span>
                Station Risk Summary
              </h3>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('map')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Full Map →
                </button>
              )}
            </div>
            <div className="space-y-2">
              {stationRisks.slice(0, 5).map((st) => (
                <div
                  key={st.location}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-soft border border-border-hairline text-xs"
                >
                  <div>
                    <span className="font-bold text-on-surface">{st.location}</span>
                    <span className="text-[11px] text-secondary block">
                      {st.crop} · {st.pest_name}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      st.risk_level === 'CRITICAL'
                        ? 'bg-risk-critical text-white'
                        : st.risk_level === 'HIGH'
                        ? 'bg-risk-high text-white'
                        : 'bg-risk-low text-white'
                    }`}
                  >
                    {st.risk_level} ({(st.risk_score * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-border-hairline text-[11px] text-secondary flex justify-between mt-4">
            <span>Coverage: 11 Research Hubs</span>
            <span>Live Data Sync</span>
          </div>
        </div>

        {/* Right: Recent Field Observations (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">fact_check</span>
                Recent Field Scouting Observations
              </h3>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('obs')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All Observations →
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-hairline text-secondary text-[11px]">
                    <th className="pb-2">Station</th>
                    <th className="pb-2">Crop</th>
                    <th className="pb-2">Pest Vector</th>
                    <th className="pb-2">Count</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline">
                  {recentObservations.map((obs) => (
                    <tr key={obs.id} className="text-on-surface">
                      <td className="py-2.5 font-semibold">{obs.location}</td>
                      <td className="py-2.5 text-secondary">{obs.crop}</td>
                      <td className="py-2.5">{obs.pest_name}</td>
                      <td className="py-2.5 font-mono">{obs.pest_count} {obs.count_unit}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container-highest text-secondary uppercase">
                          {obs.verification_status || 'Verified'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentObservations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-secondary">
                        No recent observations recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-4 border-t border-border-hairline text-[11px] text-secondary flex justify-between mt-4">
            <span>Direct Database Stream</span>
            <span>Real-time persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
