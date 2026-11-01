import React from 'react';
import { TabKey } from '../../types/dashboard';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  alertCount: number;
  lastSyncTime?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  alertCount,
  lastSyncTime,
}) => {
  const navItems = [
    { key: 'overview' as TabKey, label: 'Overview', icon: 'dashboard' },
    { key: 'map' as TabKey, label: 'Risk Map', icon: 'map' },
    { key: 'obs' as TabKey, label: 'Field Observations', icon: 'visibility' },
    { key: 'history' as TabKey, label: 'Risk History', icon: 'history' },
    {
      key: 'alerts' as TabKey,
      label: 'Alerts & Advisories',
      icon: 'notifications_active',
      badge: alertCount > 0 ? alertCount : undefined,
    },
    { key: 'model' as TabKey, label: 'Model Performance', icon: 'analytics' },
    { key: 'system' as TabKey, label: 'System Health', icon: 'health_and_safety' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 z-40 p-4 border-r border-border-hairline flex flex-col justify-between overflow-y-auto bg-surface-container-lowest">
      <div className="flex flex-col gap-6">
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-surface flex items-center justify-center border border-on-surface/20 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold" data-icon="pest_control">
              pest_control
            </span>
          </div>
          <div>
            <div className="font-headline text-xl font-bold text-on-surface tracking-tight leading-tight">
              AgroWatch AI
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              Intelligent Pest Surveillance
            </div>
          </div>
        </div>

        {/* Navigation Tabs (7 nav tabs) */}
        <nav aria-label="Main Navigation" className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`flex items-center justify-between px-4 py-3 rounded-DEFAULT transition-all text-left w-full ${
                  isActive
                    ? 'bg-tertiary-container/30 text-primary font-semibold border-l-4 border-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-risk-critical text-on-error rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Section: Live Telemetry & Officer Profile */}
      <div className="pt-4 border-t border-border-hairline flex flex-col gap-3">
        {/* Live System Telemetry Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-tertiary-container/20 border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
            <span className="text-xs font-semibold text-primary truncate">
              {lastSyncTime ? `Live Sync ${lastSyncTime}` : 'Telemetry Connected'}
            </span>
          </div>
          <span className="text-[11px] text-secondary font-mono">v2.0</span>
        </div>

        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-surface-soft border border-border-hairline">
          <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-semibold shrink-0">
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold truncate text-on-surface">ICAR Surveillance Officer</div>
            <div className="text-[11px] text-secondary truncate">Agro-Climatic Division</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
