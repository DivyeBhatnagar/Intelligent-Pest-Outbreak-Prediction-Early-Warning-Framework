import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, MapPin, Wind, Droplets, Thermometer, ShieldAlert } from 'lucide-react';
import { STATIONS, RISK_BADGES } from '../../constants/agroData';
import { apiService } from '../../services/api';
import { StationMap } from '../common/StationMap';
import { RiskLevel, WeatherTelemetry } from '../../types/dashboard';

export const RiskMapTab: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<string>('Cuttack');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cropFilter, setCropFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [weatherTelemetry, setWeatherTelemetry] = useState<WeatherTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Station risk indicators
  const [stationRisks] = useState<Record<string, { risk_level: RiskLevel; risk_score: number; pest_name?: string }>>({
    Cuttack: { risk_level: 'CRITICAL', risk_score: 0.94, pest_name: 'Brown Planthopper' },
    Maruteru: { risk_level: 'HIGH', risk_score: 0.78, pest_name: 'Yellow Stem Borer' },
    Lam: { risk_level: 'MODERATE', risk_score: 0.52, pest_name: 'American Bollworm' },
    Nagpur: { risk_level: 'HIGH', risk_score: 0.74, pest_name: 'Whitefly' },
    Akola: { risk_level: 'LOW', risk_score: 0.22, pest_name: 'Cotton Aphid' },
    Ludhiana: { risk_level: 'MODERATE', risk_score: 0.45, pest_name: 'Leaf Folder' },
    Raipur: { risk_level: 'LOW', risk_score: 0.18, pest_name: 'Gall Midge' },
    Rajendranagar: { risk_level: 'LOW', risk_score: 0.25, pest_name: 'Green Leafhopper' },
    Sirsa: { risk_level: 'LOW', risk_score: 0.20, pest_name: 'Pink Bollworm' },
    Parbhani: { risk_level: 'MODERATE', risk_score: 0.48, pest_name: 'Spotted Bollworm' },
    Palampur: { risk_level: 'LOW', risk_score: 0.12, pest_name: 'Stem Borer' },
  });

  const loadStationDetails = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const weather = await apiService.getLiveWeather(code);
      setWeatherTelemetry(weather);
    } catch {}

    try {
      await apiService.getStationSummary(code);
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStationDetails(selectedStation);
  }, [selectedStation, loadStationDetails]);

  const currentStation = STATIONS[selectedStation] || STATIONS.Cuttack;
  const currentRisk = stationRisks[selectedStation] || { risk_level: 'LOW' as RiskLevel, risk_score: 0.15 };
  const badge = RISK_BADGES[currentRisk.risk_level] || RISK_BADGES.LOW;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto p-4 md:p-6">
      {/* ── Filter & Search Toolbar ────────────────────────────────────────── */}
      <div className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station or state…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a1017] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {/* Crop Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Crop:</span>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Crops</option>
              <option value="Rice">Rice</option>
              <option value="Cotton">Cotton</option>
              <option value="Maize">Maize</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Risk Tier:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Tiers</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => loadStationDetails(selectedStation)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Pins</span>
        </button>
      </div>

      {/* ── Main Map & Inspection Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                National Agro-Climatic Surveillance Network
              </h2>
              <p className="text-xs text-slate-400">Click any marker to inspect station telemetry and outbreak risk</p>
            </div>
            {/* Color Legend */}
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Moderate</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical</span>
            </div>
          </div>

          <StationMap
            selectedLocation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
            stationRiskMap={stationRisks}
            height="540px"
          />
        </div>

        {/* Station Detail Inspection Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedStation}</h3>
                <p className="text-xs text-slate-400">{currentStation.name}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                {badge.icon} {currentRisk.risk_level}
              </span>
            </div>

            {/* Micro-climate cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-rose-400" /> Temperature
                </span>
                <span className="font-mono font-bold text-sm text-slate-200">
                  {weatherTelemetry?.current_temp || 31.5}°C
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Max: {weatherTelemetry?.temp_max || 33}°C | Min: {weatherTelemetry?.temp_min || 24}°C
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-400" /> Humidity
                </span>
                <span className="font-mono font-bold text-sm text-slate-200">
                  {weatherTelemetry?.rh_current || 88}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Morn: {weatherTelemetry?.rh_morning || 92}% | Eve: {weatherTelemetry?.rh_evening || 72}%
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-teal-400" /> Weekly Rainfall
                </span>
                <span className="font-mono font-bold text-sm text-slate-200">
                  {weatherTelemetry?.rainfall || 18.0} mm
                </span>
                <span className="text-[10px] text-slate-400 block">Precipitation index</span>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-amber-400" /> Wind Velocity
                </span>
                <span className="font-mono font-bold text-sm text-slate-200">
                  {weatherTelemetry?.wind_speed || 4.2} km/h
                </span>
                <span className="text-[10px] text-slate-400 block">Canopy aeration</span>
              </div>
            </div>

            {/* Target Crops & Pests */}
            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Primary Crops:</span>
                <span className="font-semibold text-slate-200">{currentStation.primary_crops?.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monitored Pest:</span>
                <span className="font-semibold text-rose-400">{currentRisk.pest_name || 'Brown Planthopper'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outbreak Probability:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {(currentRisk.risk_score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Geographic Coords:</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {currentStation.lat.toFixed(4)}°N, {currentStation.lon.toFixed(4)}°E
                </span>
              </div>
            </div>

            {/* Quick action advisory */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Regional Advisory Note
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {currentRisk.risk_level === 'CRITICAL'
                  ? 'Urgent bio-agent or recommended chemical spray protocol should be deployed within 48h to prevent hopperburn.'
                  : currentRisk.risk_level === 'HIGH'
                  ? 'Intensify light trap surveillance and perform random tiller scouting every 3 days.'
                  : 'Maintain standard weekly scouting. Meteorological conditions remain within physiological tolerance limits.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
