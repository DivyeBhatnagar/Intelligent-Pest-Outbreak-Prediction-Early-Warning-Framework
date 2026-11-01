import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { STATIONS } from '../../constants/agroData';
import { StationMap } from '../common/StationMap';
import { RiskLevel, WeatherTelemetry } from '../../types/dashboard';

export const RiskMapTab: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<string>('Cuttack');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cropFilter, setCropFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Real backend state
  const [stationRiskMap, setStationRiskMap] = useState<Record<string, { risk_level: RiskLevel; risk_score: number; pest_name?: string }>>({});
  const [stationSummaryList, setStationSummaryList] = useState<any[]>([]);
  const [weatherTelemetry, setWeatherTelemetry] = useState<WeatherTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load latest real station risk summary from backend
  useEffect(() => {
    const loadStationRiskData = async () => {
      try {
        const res = await apiService.getStationRiskSummary();
        const map: Record<string, { risk_level: RiskLevel; risk_score: number; pest_name?: string }> = {};
        if (res.stations) {
          setStationSummaryList(res.stations);
          res.stations.forEach((s) => {
            map[s.location] = {
              risk_level: (s.risk_level as RiskLevel) || 'LOW',
              risk_score: s.risk_score || 0.15,
              pest_name: s.pest_name,
            };
          });
        }
        setStationRiskMap(map);
      } catch (err) {
        console.error('Failed to load station summaries:', err);
      }
    };
    loadStationRiskData();
  }, []);

  // Load weather when selected station changes
  useEffect(() => {
    const loadStationWeather = async () => {
      setIsLoading(true);
      try {
        const w = await apiService.getLiveWeather(selectedStation);
        setWeatherTelemetry(w);
      } catch (err) {
        console.error('Failed to fetch station weather:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStationWeather();
  }, [selectedStation]);

  const currentStationMeta = STATIONS[selectedStation] || {
    code: selectedStation.toUpperCase(),
    name: selectedStation,
    lat: 20.4625,
    lon: 85.8830,
    primary_crops: ['Rice'],
  };

  const currentRisk = stationRiskMap[selectedStation] || {
    risk_level: 'LOW' as RiskLevel,
    risk_score: 0.15,
    pest_name: 'Field Pest',
  };

  const filteredStations = Object.keys(STATIONS).filter((code) => {
    const st = STATIONS[code];
    const risk = stationRiskMap[code]?.risk_level || 'LOW';
    const matchesSearch =
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCrop = cropFilter === 'ALL' || st.primary_crops?.includes(cropFilter);
    const matchesRisk = riskFilter === 'ALL' || risk === riskFilter;
    return matchesSearch && matchesCrop && matchesRisk;
  });

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header & Page Controls Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 rounded-DEFAULT bg-surface-container-low border border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              National Surveillance Network
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-secondary">11 Micro-Climatic Stations</span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
            Geographic Risk Map & Surveillance Grid
          </h1>
          <p className="text-sm text-secondary mt-1">
            Real-time geospatial risk mapping across ICAR research hubs and agro-ecological zones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-surface-container-highest border border-border-hairline text-xs font-medium text-secondary">
            {isLoading ? 'Fetching telemetry…' : `Selected: ${selectedStation}`}
          </div>
        </div>
      </div>

      {/* Map Filter & Layer Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-border-hairline shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Station Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search station or state…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 h-9 rounded-lg border border-border-hairline bg-surface-soft text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 w-48 sm:w-60"
            />
          </div>

          {/* Crop Filter */}
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

          {/* Risk Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Risk Tier:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-low" /> Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-moderate" /> Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-high" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-critical" /> Critical
          </span>
        </div>
      </div>

      {/* Main Workspace: Interactive Map (70%) + Station Detail Panel (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Canvas Workspace */}
        <div className="lg:col-span-8 p-4 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pin_drop</span>
              <span className="font-headline text-sm font-bold text-on-surface">
                Interactive Geographic Surveillance Map
              </span>
            </div>
            <span className="text-xs text-secondary font-mono">
              Showing {filteredStations.length} Stations
            </span>
          </div>

          <div className="w-full flex-1 rounded-xl overflow-hidden border border-border-hairline min-h-[500px]">
            <StationMap
              selectedLocation={selectedStation}
              onSelectStation={(st) => setSelectedStation(st)}
              stationRiskMap={stationRiskMap}
              height="520px"
            />
          </div>
        </div>

        {/* Station Detail Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">
                  {selectedStation}
                </h3>
                <span className="text-xs text-secondary">{currentStationMeta.name}</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentRisk.risk_level === 'CRITICAL'
                    ? 'bg-risk-critical text-white'
                    : currentRisk.risk_level === 'HIGH'
                    ? 'bg-risk-high text-white'
                    : 'bg-risk-low text-white'
                }`}
              >
                {currentRisk.risk_level}
              </span>
            </div>

            {/* Micro-Climate telemetry cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                <span className="text-[11px] text-secondary block">Temperature</span>
                <span className="font-headline text-base font-bold text-on-surface">
                  {weatherTelemetry?.current_temp || 31.5}°C
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">
                  Max: {weatherTelemetry?.temp_max || 33}°C | Min: {weatherTelemetry?.temp_min || 24}°C
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                <span className="text-[11px] text-secondary block">Humidity</span>
                <span className="font-headline text-base font-bold text-on-surface">
                  {weatherTelemetry?.rh_current || 88}%
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">
                  Morn: {weatherTelemetry?.rh_morning || 92}% | Eve: {weatherTelemetry?.rh_evening || 70}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                <span className="text-[11px] text-secondary block">Weekly Rain</span>
                <span className="font-headline text-base font-bold text-on-surface">
                  {weatherTelemetry?.rainfall || 18.0} mm
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">Precipitation index</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline">
                <span className="text-[11px] text-secondary block">Wind Velocity</span>
                <span className="font-headline text-base font-bold text-on-surface">
                  {weatherTelemetry?.wind_speed || 4.2} km/h
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">Canopy dispersion</span>
              </div>
            </div>

            {/* Metadata breakdown */}
            <div className="pt-2 border-t border-border-hairline space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Primary Crops:</span>
                <span className="font-semibold text-on-surface">
                  {currentStationMeta.primary_crops?.join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Monitored Pest:</span>
                <span className="font-semibold text-on-surface">
                  {currentRisk.pest_name || 'Brown Planthopper'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Outbreak Probability:</span>
                <span className="font-mono font-bold text-primary">
                  {(currentRisk.risk_score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Geographic Coords:</span>
                <span className="font-mono text-[11px] text-secondary">
                  {currentStationMeta.lat.toFixed(4)}°N, {currentStationMeta.lon.toFixed(4)}°E
                </span>
              </div>
            </div>

            {/* Regional advisory note */}
            <div className="p-3 rounded-xl bg-tertiary-container/20 border border-primary/20 text-xs space-y-1">
              <span className="font-bold text-primary block">Advisory Protocol:</span>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                {currentRisk.risk_level === 'CRITICAL'
                  ? 'High risk alert active. Deploy recommended bio-control or targeted chemical intervention within 48h.'
                  : currentRisk.risk_level === 'HIGH'
                  ? 'Intensify light trap surveillance and perform random tiller scouting every 3 days.'
                  : 'Maintain standard weekly scouting. Conditions currently within physiological tolerance limits.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
