import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { PredictionResponse, WeatherTelemetry, Station } from '../../types/dashboard';
import { PESTS_BY_CROP, STATIONS } from '../../constants/agroData';

interface PredictionStudioTabProps {
  selectedLocation: string;
  selectedCrop: string;
  weather: WeatherTelemetry | null;
  onRefreshWeather?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface ScenarioHistoryItem {
  id: string;
  timestamp: string;
  station: string;
  crop: string;
  pest: string;
  week: number;
  count: number;
  tempMax: number;
  tempMin: number;
  rhMorn: number;
  rhEve: number;
  rainfall: number;
  windSpeed: number;
  riskScore: number;
  riskLevel: string;
  gdd: number | string;
  vpd: number | string;
}

export const PredictionStudioTab: React.FC<PredictionStudioTabProps> = ({
  selectedLocation,
  selectedCrop,
  weather,
  onRefreshWeather,
  onNavigateToTab,
}) => {
  // Input form state
  const [stationName, setStationName] = useState<string>(selectedLocation);
  const [crop, setCrop] = useState<string>(selectedCrop);
  const [pestName, setPestName] = useState<string>('Brown Planthopper');
  const [standardWeek, setStandardWeek] = useState<number>(weather?.standard_week || 38);
  const [pestCount, setPestCount] = useState<number>(8.5);

  // Micro-meteorological inputs
  const [tempMax, setTempMax] = useState<number>(32.5);
  const [tempMin, setTempMin] = useState<number>(24.0);
  const [rhMorning, setRhMorning] = useState<number>(88.0);
  const [rhEvening, setRhEvening] = useState<number>(68.0);
  const [rainfall, setRainfall] = useState<number>(12.0);
  const [windSpeed, setWindSpeed] = useState<number>(4.5);
  const [sunshineHours, setSunshineHours] = useState<number>(7.2);
  const [evaporation, setEvaporation] = useState<number>(3.8);

  // Model & Reference metadata from real backend
  const [stationsList, setStationsList] = useState<Station[]>([]);
  const [referencePests, setReferencePests] = useState<
    Array<{ pest_name: string; base_temperature_deg_c: number; economic_threshold_level: number }>
  >([]);
  const [modelBenchmark, setModelBenchmark] = useState<any>(null);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successActionMsg, setSuccessActionMsg] = useState<string>('');

  // What-If Session Audit History
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);

  // 1. Load initial reference data from real API
  useEffect(() => {
    let isMounted = true;

    // Fetch stations
    apiService
      .getStations()
      .then((res) => {
        if (isMounted && res.stations && res.stations.length > 0) {
          const mapped: Station[] = res.stations.map((s) => ({
            code: s.name.toUpperCase().replace(/[^A-Z]/g, ''),
            name: s.name,
            state: s.state,
            lat: s.latitude,
            lon: s.longitude,
          }));
          setStationsList(mapped);
        }
      })
      .catch(() => {});

    // Fetch reference pests & ETL
    apiService
      .getReferencePests()
      .then((res) => {
        if (isMounted && res.pests) {
          setReferencePests(res.pests);
        }
      })
      .catch(() => {});

    // Fetch model info
    apiService
      .getModelComparison()
      .then((res) => {
        if (isMounted) {
          setModelBenchmark(res);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Synchronize crop when parent changes
  useEffect(() => {
    setCrop(selectedCrop);
    const pests = PESTS_BY_CROP[selectedCrop] || PESTS_BY_CROP.Rice;
    if (!pests.includes(pestName)) {
      setPestName(pests[0]);
    }
  }, [selectedCrop]);

  // 3. Synchronize station when parent changes
  useEffect(() => {
    setStationName(selectedLocation);
  }, [selectedLocation]);

  // 4. Synchronize weather inputs when live telemetry arrives
  useEffect(() => {
    if (weather) {
      if (weather.temp_max !== undefined) setTempMax(weather.temp_max);
      if (weather.temp_min !== undefined) setTempMin(weather.temp_min);
      if (weather.rh_morning !== undefined) setRhMorning(weather.rh_morning);
      if (weather.rh_evening !== undefined) setRhEvening(weather.rh_evening);
      if (weather.rainfall !== undefined) setRainfall(weather.rainfall);
      if (weather.wind_speed !== undefined) setWindSpeed(weather.wind_speed);
      if (weather.sunshine_hours !== undefined) setSunshineHours(weather.sunshine_hours);
      if (weather.evaporation !== undefined) setEvaporation(weather.evaporation);
      if (weather.standard_week !== undefined) setStandardWeek(weather.standard_week);
    }
  }, [weather]);

  // Current pest reference metadata
  const currentPestMeta = referencePests.find(
    (p) =>
      p.pest_name.toLowerCase().replace(/[^a-z]/g, '') ===
      pestName.toLowerCase().replace(/[^a-z]/g, '')
  );
  const etlValue = currentPestMeta?.economic_threshold_level ?? (crop.toLowerCase() === 'rice' ? 5.0 : 10.0);
  const isEtlBreached = pestCount >= etlValue;

  // Derived bio-climatic preview
  const meanTemp = ((tempMax + tempMin) / 2).toFixed(1);
  const dtr = Math.max(tempMax - tempMin, 0).toFixed(1);
  const meanRh = ((rhMorning + rhEvening) / 2).toFixed(0);

  // Quick Preset Scenarios
  const applyPreset = (presetKey: string) => {
    if (presetKey === 'rice_bph_outbreak') {
      setCrop('Rice');
      setPestName('Brown Planthopper');
      setStationName('Cuttack');
      setStandardWeek(39);
      setPestCount(16.5);
      setTempMax(33.0);
      setTempMin(25.5);
      setRhMorning(94.0);
      setRhEvening(82.0);
      setRainfall(34.0);
      setWindSpeed(3.8);
    } else if (presetKey === 'cotton_bollworm_alert') {
      setCrop('Cotton');
      setPestName('Pink Bollworm');
      setStationName('Nagpur');
      setStandardWeek(42);
      setPestCount(12.0);
      setTempMax(35.5);
      setTempMin(22.0);
      setRhMorning(80.0);
      setRhEvening(45.0);
      setRainfall(0.0);
      setWindSpeed(5.2);
    } else if (presetKey === 'maize_armyworm') {
      setCrop('Maize');
      setPestName('Fall Armyworm');
      setStationName('Palampur');
      setStandardWeek(32);
      setPestCount(9.0);
      setTempMax(28.0);
      setTempMin(19.0);
      setRhMorning(88.0);
      setRhEvening(70.0);
      setRainfall(18.0);
      setWindSpeed(4.0);
    } else if (presetKey === 'low_risk_baseline') {
      setCrop('Rice');
      setPestName('Yellow Stem Borer');
      setStationName('Palampur');
      setStandardWeek(15);
      setPestCount(1.2);
      setTempMax(23.0);
      setTempMin(12.0);
      setRhMorning(65.0);
      setRhEvening(45.0);
      setRainfall(0.0);
      setWindSpeed(3.0);
    }
    setErrorMessage('');
  };

  // Run Inference through real backend
  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setErrorMessage('');
    try {
      const payload = {
        crop,
        pest_name: pestName,
        location: stationName,
        standard_week: Number(standardWeek),
        current_pest_count: Number(pestCount),
        weather: {
          temp_max: Number(tempMax),
          temp_min: Number(tempMin),
          rh_morning: Number(rhMorning),
          rh_evening: Number(rhEvening),
          rainfall: Number(rainfall),
          wind_speed: Number(windSpeed),
          sunshine_hours: Number(sunshineHours),
          evaporation: Number(evaporation),
        },
      };

      const res = await apiService.evaluateRisk(payload);
      setPrediction(res);

      // Append to in-session scenario history
      const newHistoryItem: ScenarioHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        station: stationName,
        crop,
        pest: pestName,
        week: Number(standardWeek),
        count: Number(pestCount),
        tempMax: Number(tempMax),
        tempMin: Number(tempMin),
        rhMorn: Number(rhMorning),
        rhEve: Number(rhEvening),
        rainfall: Number(rainfall),
        windSpeed: Number(windSpeed),
        riskScore: res.risk_score,
        riskLevel: res.risk_level,
        gdd: res.gdd_accumulated,
        vpd: res.vpd ?? '--',
      };
      setScenarioHistory((prev) => [newHistoryItem, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Prediction evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Restore past scenario into active form
  const handleRestoreScenario = (item: ScenarioHistoryItem) => {
    setStationName(item.station);
    setCrop(item.crop);
    setPestName(item.pest);
    setStandardWeek(item.week);
    setPestCount(item.count);
    setTempMax(item.tempMax);
    setTempMin(item.tempMin);
    setRhMorning(item.rhMorn);
    setRhEvening(item.rhEve);
    setRainfall(item.rainfall);
    setWindSpeed(item.windSpeed);
    setSuccessActionMsg(`Restored scenario #${item.id} (${item.pest} at ${item.station})`);
    setTimeout(() => setSuccessActionMsg(''), 3000);
  };

  // 1-Click Action: Dispatch Advisory
  const handleDispatchAdvisory = async () => {
    if (!prediction) return;
    try {
      await apiService.dispatchAdvisory({
        location: stationName,
        crop,
        pest_name: pestName,
        risk_level: prediction.risk_level,
        advisory_text: prediction.advisory,
        channel: 'SMS',
      });
      setSuccessActionMsg(`Advisory successfully dispatched to ${stationName} agricultural network!`);
      setTimeout(() => setSuccessActionMsg(''), 4000);
    } catch (err: any) {
      setErrorMessage(`Dispatch failed: ${err.message}`);
    }
  };

  // 1-Click Action: Record as Surveillance Observation
  const handleRecordObservation = async () => {
    try {
      await apiService.createObservation({
        location: stationName,
        crop,
        pest_name: pestName,
        pest_count: Number(pestCount),
        observation_date: new Date().toISOString().split('T')[0],
        standard_week: Number(standardWeek),
        collection_method: crop.toLowerCase() === 'rice' ? 'Light Trap' : 'Pheromone Trap',
        notes: `Simulated via Prediction Studio: ${prediction?.risk_level || 'EVAL'} (${(
          (prediction?.risk_score || 0) * 100
        ).toFixed(0)}% risk)`,
      });
      setSuccessActionMsg(`Observation successfully recorded in surveillance database!`);
      setTimeout(() => setSuccessActionMsg(''), 4000);
    } catch (err: any) {
      setErrorMessage(`Failed to save observation: ${err.message}`);
    }
  };

  // Semantic styles for risk levels
  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-risk-critical bg-risk-critical/10 border-risk-critical/30';
      case 'HIGH':
        return 'text-risk-high bg-risk-high/10 border-risk-high/30';
      case 'MODERATE':
        return 'text-risk-moderate bg-risk-moderate/10 border-risk-moderate/30';
      default:
        return 'text-risk-low bg-risk-low/10 border-risk-low/30';
    }
  };

  const getRiskDialBarColor = (score: number) => {
    if (score >= 0.75) return 'bg-risk-critical';
    if (score >= 0.5) return 'bg-risk-high';
    if (score >= 0.25) return 'bg-risk-moderate';
    return 'bg-risk-low';
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* ── Studio Hero Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-DEFAULT bg-surface-container-low border border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Bioclimatic AI Inference Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-secondary font-mono">
              Champion: {modelBenchmark?.champion || 'Random Forest'} (90.46% Acc · 0.957 ROC-AUC)
            </span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
            Machine Learning Pest Risk Prediction Studio
          </h1>
          <p className="text-sm text-secondary mt-1">
            Simulate micro-climatic thresholds, thermal accumulation (GDD), vapor pressure deficit (VPD), and
            predict 7-day outbreak probabilities using TreeSHAP explainable intelligence.
          </p>
        </div>

        {/* Global Action Chips */}
        <div className="flex items-center flex-wrap gap-2">
          {onRefreshWeather && (
            <button
              onClick={onRefreshWeather}
              title="Sync live weather from Open-Meteo"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-highest hover:bg-surface-variant text-on-surface text-xs font-semibold border border-border-hairline transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base text-primary">cloud_sync</span>
              <span>Sync Weather</span>
            </button>
          )}

          {prediction && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-highest hover:bg-surface-variant text-on-surface text-xs font-semibold border border-border-hairline transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Toast */}
      {successActionMsg && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successActionMsg}</span>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToTab && successActionMsg.includes('dispatched') && (
              <button
                type="button"
                onClick={() => onNavigateToTab('alerts')}
                className="underline hover:opacity-80 cursor-pointer"
              >
                View in Alerts Queue →
              </button>
            )}
            {onNavigateToTab && successActionMsg.includes('surveillance') && (
              <button
                type="button"
                onClick={() => onNavigateToTab('obs')}
                className="underline hover:opacity-80 cursor-pointer"
              >
                View in Observations →
              </button>
            )}
            <button onClick={() => setSuccessActionMsg('')} className="text-primary hover:opacity-75">
              ✕
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-risk-critical/10 border border-risk-critical/30 text-risk-critical text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-risk-critical hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* ── Preset Scenario Quick-Bar ────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-surface-container-lowest border border-border-hairline shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">science</span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Quick Simulation Scenarios:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('rice_bph_outbreak')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-risk-critical/10 text-risk-critical hover:bg-risk-critical/20 border border-risk-critical/30 transition-all flex items-center gap-1.5"
          >
            <span>🌾 Monsoon Rice BPH Outbreak</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('cotton_bollworm_alert')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-risk-high/10 text-risk-high hover:bg-risk-high/20 border border-risk-high/30 transition-all flex items-center gap-1.5"
          >
            <span>🌿 Cotton Pink Bollworm</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('maize_armyworm')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-risk-moderate/10 text-risk-moderate hover:bg-risk-moderate/20 border border-risk-moderate/30 transition-all flex items-center gap-1.5"
          >
            <span>🌽 Maize Fall Armyworm</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('low_risk_baseline')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-risk-low/10 text-risk-low hover:bg-risk-low/20 border border-risk-low/30 transition-all flex items-center gap-1.5"
          >
            <span>🛡️ Low-Risk Baseline (Palampur)</span>
          </button>
        </div>
      </div>

      {/* ── Two-Column Master Control & Assessment Viewport ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column: Feature Engineering Parameters Form (7 cols) ───── */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleEvaluate}
            className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <h2 className="font-headline text-lg font-bold text-on-surface">
                  Input Feature Vectors & Bioclimatics
                </h2>
              </div>
              <span className="text-xs text-secondary font-mono">Forecast Horizon: +7 Days</span>
            </div>

            {/* Section 1: Biological Target Domain */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                  1. Biological Target & Agro-Climatic Station
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1">
                    Surveillance Station
                  </label>
                  <select
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-soft border border-border-hairline rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {stationsList.length > 0 ? (
                      stationsList.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name} {st.state ? `(${st.state})` : ''}
                        </option>
                      ))
                    ) : (
                      Object.keys(STATIONS).map((k) => (
                        <option key={k} value={k}>
                          {STATIONS[k].name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1">Crop Type</label>
                  <select
                    value={crop}
                    onChange={(e) => {
                      const newCrop = e.target.value;
                      setCrop(newCrop);
                      const pests = PESTS_BY_CROP[newCrop] || PESTS_BY_CROP.Rice;
                      setPestName(pests[0]);
                    }}
                    className="w-full px-3 py-2 bg-surface-soft border border-border-hairline rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.keys(PESTS_BY_CROP).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1">
                    Target Pest Species
                  </label>
                  <select
                    value={pestName}
                    onChange={(e) => setPestName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-soft border border-border-hairline rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {(PESTS_BY_CROP[crop] || PESTS_BY_CROP.Rice).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-secondary mt-1 block">
                    Base Temp: {currentPestMeta?.base_temperature_deg_c ?? 10.0}°C · ETL Reference: {etlValue}{' '}
                    count
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-secondary uppercase">
                      Epidemiological Week (SMW)
                    </label>
                    <span className="text-xs font-bold text-primary font-mono">Week {standardWeek} / 52</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="52"
                    value={standardWeek}
                    onChange={(e) => setStandardWeek(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-secondary font-mono mt-0.5">
                    <span>W1 (Jan/Rabi)</span>
                    <span>W26 (Jun/Kharif)</span>
                    <span>W52 (Dec/Winter)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Surveillance Field Population & ETL Meter */}
            <div className="space-y-3 pt-3 border-t border-border-hairline">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                    2. In-Field Scouting Population & Economic Threshold (ETL)
                  </h3>
                </div>
                {isEtlBreached ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-risk-critical text-white animate-pulse">
                    ETL Breached!
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-risk-low/20 text-risk-low">
                    Below Economic Threshold
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-on-surface">
                    Field Scouting / Trap Count (Specimens per Sampling Unit)
                  </label>
                  <span className="text-xs font-mono font-bold text-on-surface">{pestCount.toFixed(1)}</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="150"
                  value={pestCount}
                  onChange={(e) => setPestCount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-surface-soft border border-border-hairline rounded-lg text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                {/* Interactive Dynamic ETL Progress Bar */}
                <div className="mt-2 space-y-1">
                  <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isEtlBreached ? 'bg-risk-critical' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min((pestCount / (etlValue * 2)) * 100, 100)}%` }}
                    />
                    {/* ETL Marker Line at 50% */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-black/60 z-10"
                      style={{ left: '50%' }}
                      title={`ETL: ${etlValue}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-secondary font-mono">
                    <span>0</span>
                    <span className="font-bold text-on-surface">ETL Baseline: {etlValue}</span>
                    <span>{(etlValue * 2).toFixed(0)}+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Micro-Meteorological Parameters */}
            <div className="space-y-4 pt-3 border-t border-border-hairline">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                    3. Micro-Meteorological Driving Variables
                  </h3>
                </div>
                <div className="text-[11px] text-secondary font-mono">
                  Mean Temp: <strong className="text-on-surface">{meanTemp}°C</strong> · Mean RH:{' '}
                  <strong className="text-on-surface">{meanRh}%</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempMax}
                    onChange={(e) => setTempMax(Number(e.target.value))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">DTR: {dtr}°C</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempMin}
                    onChange={(e) => setTempMin(Number(e.target.value))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Night cooling</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Morning RH (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={rhMorning}
                    onChange={(e) => setRhMorning(Number(e.target.value))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Dew & sporulation</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Evening RH (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={rhEvening}
                    onChange={(e) => setRhEvening(Number(e.target.value))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Canopy retention</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Rainfall (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={rainfall}
                    onChange={(e) => setRainfall(Math.max(0, Number(e.target.value)))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Precipitation</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Wind Speed (km/h)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(Math.max(0, Number(e.target.value)))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Pest dispersal</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Sunshine (hrs)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={sunshineHours}
                    onChange={(e) => setSunshineHours(Number(e.target.value))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Photoperiod</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                  <label className="block text-[10px] font-bold text-secondary uppercase">Evaporation (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={evaporation}
                    onChange={(e) => setEvaporation(Math.max(0, Number(e.target.value)))}
                    className="w-full mt-1 bg-transparent font-headline text-base font-bold text-on-surface border-b border-border-hairline focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-secondary mt-1 block">Vapor demand</span>
                </div>
              </div>
            </div>

            {/* Submit Action CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isEvaluating}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-DEFAULT bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Executing Random Forest & TreeSHAP Attribution...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">psychology</span>
                    <span>Run ML Outbreak Inference (+7 Days Horizon)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Column: Inference Assessment & SHAP Explainability (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          {prediction ? (
            <div className="space-y-6 animate-fade-in">
              {/* Primary Assessment Hero Card */}
              <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Inference Assessment Result
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getRiskColor(
                      prediction.risk_level
                    )}`}
                  >
                    {prediction.risk_level}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {/* Circular Dial / Progress Pill */}
                  <div className="relative w-24 h-24 rounded-2xl bg-surface-soft border border-border-hairline flex flex-col items-center justify-center shrink-0">
                    <span className="font-headline text-2xl font-bold text-on-surface">
                      {(prediction.risk_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-bold text-secondary uppercase">Probability</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-on-surface">
                      {pestName} Outbreak Probability
                    </div>
                    <div className="text-xs text-secondary">
                      Station: <strong className="text-on-surface">{stationName}</strong> · Crop:{' '}
                      <strong className="text-on-surface">{crop}</strong>
                    </div>
                    <div className="text-[11px] text-secondary font-mono">
                      Target Window: Epidemiological Week {standardWeek} (+7 Days)
                    </div>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getRiskDialBarColor(
                      prediction.risk_score
                    )}`}
                    style={{ width: `${Math.min(prediction.risk_score * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Bio-Climatic Thermal & Moisture Indices Card */}
              <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">thermostat</span>
                    <span>Agronomic Bioclimatic Indices</span>
                  </h3>
                  <span className="text-[11px] text-secondary font-mono">Physiological Models</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                    <span className="text-[10px] font-bold text-secondary uppercase block">
                      Growing Degree Days (GDD)
                    </span>
                    <div className="font-headline text-lg font-bold text-primary mt-1">
                      {typeof prediction.gdd_accumulated === 'number'
                        ? prediction.gdd_accumulated.toFixed(1)
                        : prediction.gdd_accumulated}{' '}
                      <span className="text-xs font-normal text-secondary">GDD</span>
                    </div>
                    <span className="text-[10px] text-secondary mt-0.5 block">
                      Base: {currentPestMeta?.base_temperature_deg_c ?? 10}°C
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                    <span className="text-[10px] font-bold text-secondary uppercase block">
                      Vapor Pressure Deficit (VPD)
                    </span>
                    <div className="font-headline text-lg font-bold text-on-surface mt-1">
                      {typeof prediction.vpd === 'number' ? prediction.vpd.toFixed(2) : prediction.vpd}{' '}
                      <span className="text-xs font-normal text-secondary">kPa</span>
                    </div>
                    <span className="text-[10px] text-secondary mt-0.5 block">Atmospheric drying</span>
                  </div>
                </div>
              </div>

              {/* Explainable AI: Top Contributing Factors (TreeSHAP) */}
              {prediction.top_factors && prediction.top_factors.length > 0 && (
                <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline text-sm font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">account_tree</span>
                      <span>TreeSHAP Attribution Weights</span>
                    </h3>
                    <span className="text-[11px] text-secondary font-mono">Top {prediction.top_factors.length} Drivers</span>
                  </div>

                  <div className="space-y-2.5">
                    {prediction.top_factors.map((factor, idx) => {
                      const isElevating = factor.impact.toLowerCase().includes('elevat') || factor.impact.includes('+');
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-surface-soft border border-border-hairline space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-on-surface">{factor.feature}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isElevating
                                  ? 'bg-risk-critical/20 text-risk-critical'
                                  : 'bg-risk-low/20 text-risk-low'
                              }`}
                            >
                              {factor.impact}
                            </span>
                          </div>
                          <p className="text-[11px] text-secondary leading-relaxed">{factor.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actionable Tactical Advisory & Direct Escalation Actions */}
              <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                    <span>Tactical IPM Advisory Protocol</span>
                  </h3>
                  <span className="text-[10px] text-primary font-bold uppercase">ICAR / TNAU Guidance</span>
                </div>

                <div className="p-3.5 rounded-xl bg-tertiary-container/20 border border-primary/20 text-xs text-on-surface leading-relaxed">
                  {prediction.advisory}
                </div>

                {/* 1-Click Dispatch & Surveillance Persistence CTA Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDispatchAdvisory}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-risk-critical hover:bg-risk-critical/90 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>Dispatch Warning Alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRecordObservation}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-surface-container-highest hover:bg-surface-variant text-on-surface font-bold text-xs border border-border-hairline transition-all cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">add_task</span>
                    <span>Log as Observation</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty Invitation State */
            <div className="p-8 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <div>
                <h3 className="font-headline text-base font-bold text-on-surface">
                  Ready for Model Inference
                </h3>
                <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">
                  Adjust micro-climatic driving parameters on the left or select a quick scenario preset above to
                  calculate multi-factor outbreak probability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-soft border border-border-hairline text-left space-y-2">
                <span className="text-[11px] font-bold text-on-surface block">
                  ML Pipeline Architecture:
                </span>
                <ul className="text-[11px] text-secondary space-y-1 list-disc list-inside">
                  <li>Random Forest Classifier evaluated on 35,499 records</li>
                  <li>Automatic feature scaling and cyclical calendar week encoding</li>
                  <li>Thermal unit accumulation (Growing Degree Days, GDD)</li>
                  <li>TreeSHAP explainability attributing individual feature impact</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Section: In-Session What-If Scenario Comparison Table ──────── */}
      {scenarioHistory.length > 0 && (
        <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
            <div>
              <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
                <span>In-Session What-If Scenario Audit Log</span>
              </h3>
              <p className="text-xs text-secondary">
                Compare multi-scenario simulations evaluated during this active session
              </p>
            </div>
            <button
              onClick={() => setScenarioHistory([])}
              className="text-xs text-secondary hover:text-risk-critical font-medium"
            >
              Clear Log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-hairline text-secondary text-[11px]">
                  <th className="pb-3 uppercase font-bold">Time</th>
                  <th className="pb-3 uppercase font-bold">Station</th>
                  <th className="pb-3 uppercase font-bold">Crop / Pest</th>
                  <th className="pb-3 uppercase font-bold">SMW</th>
                  <th className="pb-3 uppercase font-bold">Count</th>
                  <th className="pb-3 uppercase font-bold">Temp (Max/Min)</th>
                  <th className="pb-3 uppercase font-bold">RH (M/E)</th>
                  <th className="pb-3 uppercase font-bold">GDD</th>
                  <th className="pb-3 uppercase font-bold">VPD</th>
                  <th className="pb-3 uppercase font-bold">Risk Score</th>
                  <th className="pb-3 uppercase font-bold">Risk Level</th>
                  <th className="pb-3 uppercase font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {scenarioHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 font-mono text-secondary">{item.timestamp}</td>
                    <td className="py-3 font-bold text-on-surface">{item.station}</td>
                    <td className="py-3">
                      <span className="font-semibold text-on-surface">{item.pest}</span>
                      <span className="text-secondary text-[11px] block">{item.crop}</span>
                    </td>
                    <td className="py-3 font-mono">W{item.week}</td>
                    <td className="py-3 font-mono font-bold text-on-surface">{item.count.toFixed(1)}</td>
                    <td className="py-3 font-mono">
                      {item.tempMax}° / {item.tempMin}°
                    </td>
                    <td className="py-3 font-mono">
                      {item.rhMorn}% / {item.rhEve}%
                    </td>
                    <td className="py-3 font-mono text-primary font-bold">
                      {typeof item.gdd === 'number' ? item.gdd.toFixed(1) : item.gdd}
                    </td>
                    <td className="py-3 font-mono">
                      {typeof item.vpd === 'number' ? item.vpd.toFixed(2) : item.vpd}
                    </td>
                    <td className="py-3 font-mono font-bold text-on-surface">
                      {(item.riskScore * 100).toFixed(0)}%
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRiskColor(
                          item.riskLevel
                        )}`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRestoreScenario(item)}
                        className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-variant text-on-surface text-[11px] font-semibold transition-all cursor-pointer"
                        title="Reload parameters into input form"
                      >
                        Load Into Form
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
