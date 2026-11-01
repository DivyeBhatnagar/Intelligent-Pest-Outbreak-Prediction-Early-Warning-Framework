import React from 'react';
import { TabKey } from '../../types/dashboard';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  alertCount: number;
  lastSyncTime?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  alertCount,
  lastSyncTime,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    { key: 'overview' as TabKey, label: 'Overview', icon: 'dashboard' },
    { key: 'predict' as TabKey, label: 'Prediction Studio', icon: 'psychology' },
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
    <>
      {/* ── Mobile Backdrop Blur Overlay (visible on < lg when open) ─────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Main Sidebar Aside ──────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 p-3 sm:p-4 border-r border-border-hairline flex flex-col justify-between overflow-y-auto bg-surface-container-lowest transition-all duration-300 ease-in-out shadow-lg lg:shadow-none ${
          // Mobile state: off-canvas drawer
          isMobileOpen
            ? 'translate-x-0 w-72'
            : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop state: collapsible width
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        }`}
      >
        <div className="flex flex-col gap-5">
          {/* Logo & Header Section */}
          <div className="flex items-center justify-between px-1 py-1">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:justify-center w-full' : ''}`}>
              <div
                className="w-10 h-10 rounded-xl bg-primary-container text-on-surface flex items-center justify-center border border-on-surface/20 shadow-sm shrink-0 cursor-pointer"
                onClick={() => onTabChange('overview')}
                title="AgroWatch AI Overview"
              >
                <span className="material-symbols-outlined text-2xl font-bold">
                  pest_control
                </span>
              </div>

              {!isCollapsed && (
                <div className="overflow-hidden transition-opacity duration-200">
                  <div className="font-headline text-lg sm:text-xl font-bold text-on-surface tracking-tight leading-tight whitespace-nowrap">
                    AgroWatch AI
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-medium whitespace-nowrap">
                    Intelligent Pest Surveillance
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Desktop Collapse Icon (Inside Sidebar Header) */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`hidden lg:flex p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer ${
                isCollapsed ? 'mt-2 mx-auto' : ''
              }`}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="material-symbols-outlined text-lg">
                {isCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          {/* Navigation Items (8 tabs) */}
          <nav aria-label="Main Navigation" className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-xl transition-all text-left w-full cursor-pointer relative group ${
                    isCollapsed ? 'lg:justify-center p-3' : 'justify-between px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-tertiary-container/30 text-primary font-bold border-l-4 border-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-medium'
                  }`}
                >
                  <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isActive ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-xs sm:text-sm font-semibold truncate">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Badge */}
                  {item.badge !== undefined && (
                    <>
                      {!isCollapsed ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-risk-critical text-white rounded-full shrink-0">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-risk-critical lg:block hidden" />
                      )}
                    </>
                  )}

                  {/* Desktop Tooltip for Collapsed State */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden lg:block">
                      {item.label}
                      {item.badge !== undefined && ` (${item.badge})`}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Section: Live Telemetry & Officer Profile */}
        <div className="pt-3 border-t border-border-hairline flex flex-col gap-2.5">
          {/* Live System Telemetry Badge */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-tertiary-container/20 border border-primary/20">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse shrink-0" />
                <span className="text-[11px] font-semibold text-primary truncate">
                  {lastSyncTime ? `Live Sync ${lastSyncTime}` : 'Telemetry Connected'}
                </span>
              </div>
              <span className="text-[10px] text-secondary font-mono shrink-0">v2.0</span>
            </div>
          ) : (
            <div
              className="hidden lg:flex items-center justify-center p-2 rounded-xl bg-tertiary-container/20 border border-primary/20 cursor-pointer"
              title={lastSyncTime ? `Live Sync: ${lastSyncTime}` : 'Telemetry Connected'}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
            </div>
          )}

          {/* User Profile Card */}
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl bg-surface-soft border border-border-hairline ${
              isCollapsed ? 'lg:justify-center' : ''
            }`}
          >
            <div
              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-semibold shrink-0"
              title="ICAR Surveillance Officer"
            >
              <span className="material-symbols-outlined text-lg">account_circle</span>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-semibold truncate text-on-surface">ICAR Officer</div>
                <div className="text-[10px] text-secondary truncate">Agro-Climatic Grid</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
