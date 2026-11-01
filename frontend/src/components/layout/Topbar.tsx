import React from 'react';
import { TabKey } from '../../types/dashboard';

interface TopbarProps {
  activeTab: TabKey;
  selectedStation: string;
  onStationChange: (station: string) => void;
  stations: Array<{ name: string; state?: string }>;
  selectedCrop: string;
  onCropChange: (crop: string) => void;
  weatherSyncTime?: string;
  weatherTemp?: number;
  alertCount?: number;
  onRefreshWeather?: () => void;
}

const TAB_TITLES: Record<TabKey, string> = {
  overview: 'Farmer Overview & Advisory',
  map: 'Geographic Risk Map & Network',
  obs: 'Field Surveillance Records',
  history: 'Climatic Trends & Risk History',
  alerts: 'Early Warning Command Center',
  model: 'Model Performance & Benchmarks',
  system: 'System Health & Telemetry',
};

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  selectedStation,
  onStationChange,
  stations,
  selectedCrop,
  onCropChange,
  weatherSyncTime,
  weatherTemp,
  alertCount,
  onRefreshWeather,
}) => {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between px-6 py-3 w-full border-b border-border-hairline bg-surface-container-lowest/95 backdrop-blur gap-4">
      {/* Left: Breadcrumbs & Station Selector */}
      <div className="flex items-center flex-wrap gap-4">
        <div className="hidden lg:flex items-center gap-2 text-xs text-secondary font-medium whitespace-nowrap">
          <span className="font-semibold text-on-surface">AgroWatch AI</span>
          <span>/</span>
          <span className="text-on-surface-variant font-medium">{TAB_TITLES[activeTab]}</span>
        </div>

        {/* Station Selector Dropdown with Pin */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-primary text-lg pointer-events-none">
            location_on
          </span>
          <select
            value={selectedStation}
            onChange={(e) => onStationChange(e.target.value)}
            className="pl-9 pr-8 h-9 bg-surface-soft hover:bg-canvas border border-border-hairline rounded-full text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none shadow-sm"
          >
            {stations.map((st) => (
              <option key={st.name} value={st.name}>
                {st.name} {st.state ? `(${st.state})` : ''}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 text-secondary text-sm pointer-events-none">
            expand_more
          </span>
        </div>

        {/* Live Weather Sync Tag */}
        <div
          onClick={onRefreshWeather}
          title="Click to refresh telemetry"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-soft border border-border-hairline text-xs cursor-pointer hover:bg-surface-container transition-all"
        >
          <span className="material-symbols-outlined text-primary text-sm">cloud</span>
          <span className="font-semibold text-on-surface">
            {weatherTemp !== undefined ? `${weatherTemp}°C` : 'Telemetry Sync'}
          </span>
          {weatherSyncTime && (
            <span className="text-[11px] text-secondary hidden sm:inline">
              · {weatherSyncTime}
            </span>
          )}
        </div>
      </div>

      {/* Right: Crop Selector Pills + Quick Status Indicator */}
      <div className="flex items-center gap-3">
        {/* Crop Selector Segmented Control */}
        <div className="flex p-0.5 rounded-full bg-surface-soft border border-border-hairline">
          <button
            onClick={() => onCropChange('Rice')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedCrop === 'Rice'
                ? 'bg-canvas text-primary shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Rice (Paddy)
          </button>
          <button
            onClick={() => onCropChange('Cotton')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedCrop === 'Cotton'
                ? 'bg-canvas text-primary shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Cotton
          </button>
        </div>

        {/* Alert Notification Pill */}
        {alertCount !== undefined && alertCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-risk-critical/10 border border-risk-critical/20 text-risk-critical text-xs font-bold">
            <span className="material-symbols-outlined text-sm">emergency</span>
            <span>{alertCount} Active Alerts</span>
          </div>
        )}
      </div>
    </header>
  );
};
