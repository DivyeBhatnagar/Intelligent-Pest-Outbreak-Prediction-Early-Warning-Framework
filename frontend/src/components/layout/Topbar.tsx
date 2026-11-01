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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
}

const TAB_TITLES: Record<TabKey, string> = {
  overview: 'Farmer Overview & Advisory',
  predict: 'Machine Learning Pest Risk Prediction Studio',
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
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onToggleMobile,
}) => {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 w-full border-b border-border-hairline bg-surface-container-lowest/95 backdrop-blur gap-2 sm:gap-4">
      {/* Left: Hamburger (mobile/tab) + Collapse (desktop) + Breadcrumbs + Station */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-3">
        {/* Mobile & Tablet Drawer Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label={isMobileOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          className="p-1.5 sm:p-2 rounded-lg bg-surface-soft hover:bg-surface-container text-on-surface lg:hidden flex items-center justify-center border border-border-hairline cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-xl">
            {isMobileOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex p-2 rounded-lg bg-surface-soft hover:bg-surface-container text-on-surface items-center justify-center border border-border-hairline cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-xl text-secondary hover:text-primary">
            {isCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Breadcrumb - Responsive (Hidden on small mobile, truncated on tablet) */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-secondary font-medium whitespace-nowrap">
          <span className="font-semibold text-on-surface">AgroWatch AI</span>
          <span>/</span>
          <span className="text-on-surface-variant font-medium truncate max-w-[200px]">
            {TAB_TITLES[activeTab]}
          </span>
        </div>

        {/* Station Selector Dropdown with Pin */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-2.5 text-primary text-base sm:text-lg pointer-events-none">
            location_on
          </span>
          <select
            value={selectedStation}
            onChange={(e) => onStationChange(e.target.value)}
            className="pl-8 sm:pl-9 pr-7 sm:pr-8 h-8 sm:h-9 max-w-[150px] sm:max-w-xs bg-surface-soft hover:bg-canvas border border-border-hairline rounded-full text-[11px] sm:text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none shadow-sm truncate"
          >
            {stations.map((st) => (
              <option key={st.name} value={st.name}>
                {st.name} {st.state ? `(${st.state})` : ''}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 text-secondary text-xs sm:text-sm pointer-events-none">
            expand_more
          </span>
        </div>

        {/* Live Weather Sync Tag */}
        <div
          onClick={onRefreshWeather}
          title="Click to refresh telemetry"
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-surface-soft border border-border-hairline text-[11px] sm:text-xs cursor-pointer hover:bg-surface-container transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-primary text-sm">cloud</span>
          <span className="font-semibold text-on-surface">
            {weatherTemp !== undefined ? `${weatherTemp}°C` : 'Sync'}
          </span>
          {weatherSyncTime && (
            <span className="text-[10px] sm:text-[11px] text-secondary hidden md:inline">
              · {weatherSyncTime}
            </span>
          )}
        </div>
      </div>

      {/* Right: Crop Selector Pills + Quick Status Indicator */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Crop Selector Segmented Control */}
        <div className="flex p-0.5 rounded-full bg-surface-soft border border-border-hairline">
          <button
            type="button"
            onClick={() => onCropChange('Rice')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              selectedCrop === 'Rice'
                ? 'bg-canvas text-primary shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Rice
          </button>
          <button
            type="button"
            onClick={() => onCropChange('Cotton')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
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
          <div className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-risk-critical/10 border border-risk-critical/20 text-risk-critical text-[11px] sm:text-xs font-bold shrink-0">
            <span className="material-symbols-outlined text-xs sm:text-sm">emergency</span>
            <span>
              {alertCount} <span className="hidden sm:inline">Active Alerts</span>
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
