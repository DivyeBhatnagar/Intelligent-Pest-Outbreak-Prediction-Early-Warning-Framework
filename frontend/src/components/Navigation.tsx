import React from 'react';
import { Home, MapPin, ClipboardList, TrendingUp, BellRing, Brain, Cpu } from 'lucide-react';

export type TabKey = 'overview' | 'map' | 'obs' | 'history' | 'alerts' | 'model' | 'system';

interface NavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  alertCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, alertCount }) => {
  const tabs = [
    { key: 'overview' as TabKey, label: 'Overview', icon: Home },
    { key: 'map' as TabKey, label: 'Risk Map', icon: MapPin },
    { key: 'obs' as TabKey, label: 'Field Observations', icon: ClipboardList },
    { key: 'history' as TabKey, label: 'Risk History', icon: TrendingUp },
    {
      key: 'alerts' as TabKey,
      label: 'Alerts & Advisories',
      icon: BellRing,
      badge: alertCount > 0 ? alertCount : undefined,
    },
    { key: 'model' as TabKey, label: 'Model Performance', icon: Brain },
    { key: 'system' as TabKey, label: 'System Health', icon: Cpu },
  ];

  return (
    <nav className="flex gap-2 px-6 border-b border-white/10 bg-[#060b10]/80 backdrop-blur-md overflow-x-auto scrollbar-none sticky top-[73px] z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
              isActive
                ? 'text-emerald-400 border-emerald-400 bg-emerald-500/[0.04]'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
