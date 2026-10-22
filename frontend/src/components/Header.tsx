import React, { useState, useEffect } from 'react';
import { ShieldCheck, CloudSun, BrainCircuit, Database, AlertTriangle } from 'lucide-react';
import { SystemHealthResponse } from '../types/dashboard';

interface HeaderProps {
  health: SystemHealthResponse | null;
  activeAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({ health, activeAlertCount }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const opts: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      };
      setCurrentTime(now.toLocaleTimeString('en-IN', opts));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="px-6 py-4 border-b border-white/10 bg-[#060b10]/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between gap-4 flex-wrap">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xl shadow-glow-primary">
          🌾
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            Intelligent Pest Outbreak Early Warning System
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v2.0 PRO
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            ICAR & TNAU Bio-Climatic Micro-Surveillance Engine
          </p>
        </div>
      </div>

      {/* Live System Status Badges */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Surveillance status */}
        <div className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span>Surveillance Active</span>
        </div>

        {/* Live Weather service */}
        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
          <CloudSun className="w-3.5 h-3.5 text-amber-400" />
          <span>{health?.weather_service || 'Open-Meteo (Live)'}</span>
        </div>

        {/* Champion Model */}
        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-purple-300">
          <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          <span>Random Forest Champion</span>
        </div>

        {/* Database */}
        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>SQLite Connected</span>
        </div>

        {/* Active Alerts Pill */}
        <div className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-all ${
          activeAlertCount > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-glow-danger'
            : 'bg-white/[0.04] border-white/10 text-slate-300'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Alerts: <strong>{activeAlertCount}</strong></span>
        </div>

        {/* Clock */}
        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          <span>🕒 {currentTime || 'Loading…'} IST</span>
        </div>
      </div>
    </header>
  );
};
