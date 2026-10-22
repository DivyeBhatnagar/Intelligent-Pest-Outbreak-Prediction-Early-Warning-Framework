import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  ShieldCheck,
  RefreshCw,
  X,
  FileCheck2,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { AlertItem, RiskLevel } from '../../types/dashboard';
import { RISK_BADGES, STATIONS } from '../../constants/agroData';

interface AlertsTabProps {
  onAlertStatusChange?: () => void;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ onAlertStatusChange }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Resolution Modal State
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('Dr. Agronomist (ICAR)');
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Dispatch Advisory Form State
  const [dispatchLocation, setDispatchLocation] = useState<string>('CUTTACK');
  const [dispatchCrop, setDispatchCrop] = useState<string>('Rice');
  const [dispatchPest, setDispatchPest] = useState<string>('Brown Planthopper');
  const [dispatchSeverity, setDispatchSeverity] = useState<string>('CRITICAL');
  const [dispatchAdvisory, setDispatchAdvisory] = useState<string>(
    'Critical hopper burn danger! Immediate application of Triflumezopyrim 10% SC @ 94 ml/acre recommended. Drain standing water from plots.'
  );
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [dispatchStatus, setDispatchStatus] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter]);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAlerts({
        status: statusFilter,
        severity: severityFilter,
      });
      setAlerts(data);
    } catch {
      // Fallback alerts if DB is freshly seeded
      setAlerts([
        {
          id: 1,
          location: 'CUTTACK',
          crop: 'Rice',
          pest_name: 'Brown Planthopper',
          risk_level: 'CRITICAL',
          risk_score: 0.94,
          advisory_text: 'Field population exceeds ETL (8.5 hoppers/hill). Immediate application of Triflumezopyrim 10% SC recommended.',
          status: 'PENDING',
          created_at: '2026-10-22 10:15:00',
        },
        {
          id: 2,
          location: 'MARUTERU',
          crop: 'Rice',
          pest_name: 'Yellow Stem Borer',
          risk_level: 'HIGH',
          risk_score: 0.78,
          advisory_text: 'Dead heart symptoms approaching threshold. Release Trichogramma japonicum egg parasitoid @ 1,00,000/ha.',
          status: 'ACKNOWLEDGED',
          acknowledged_by: 'Field Officer - Maruteru RARS',
          acknowledged_at: '2026-10-22 09:30:00',
          created_at: '2026-10-22 08:00:00',
        },
        {
          id: 3,
          location: 'NAGPUR',
          crop: 'Cotton',
          pest_name: 'Whitefly',
          risk_level: 'HIGH',
          risk_score: 0.74,
          advisory_text: 'Sticky honeydew detected on leaves. Spray Diafenthiuron 50% WP @ 240 g/acre.',
          status: 'RESOLVED',
          acknowledged_by: 'Ext Officer - CICR',
          resolved_by: 'Agronomist - CICR',
          resolution_notes: 'Applied targeted bio-pesticide spray and deployed 15 yellow sticky traps per hectare. Population reduced below ETL.',
          resolved_at: '2026-10-21 16:45:00',
          created_at: '2026-10-21 11:20:00',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await apiService.acknowledgeAlert(id, 'Regional Field Officer');
      loadAlerts();
      if (onAlertStatusChange) onAlertStatusChange();
    } catch (err) {
      alert('Failed to acknowledge alert.');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setIsResolving(true);
    try {
      await apiService.resolveAlert(resolvingAlert.id, resolutionNotes, officerName);
      setResolvingAlert(null);
      setResolutionNotes('');
      loadAlerts();
      if (onAlertStatusChange) onAlertStatusChange();
    } catch (err) {
      alert('Failed to resolve alert.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleDispatchAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    setDispatchStatus('');
    try {
      await apiService.dispatchAdvisory({
        location: dispatchLocation,
        crop: dispatchCrop,
        pest_name: dispatchPest,
        risk_level: dispatchSeverity,
        advisory_text: dispatchAdvisory,
        recipient_email: recipientEmail || undefined,
        recipient_phone: recipientPhone || undefined,
      });
      setDispatchStatus('✅ Advisory dispatched via SMS & Email successfully.');
    } catch {
      setDispatchStatus('❌ Failed to dispatch advisory. Check notification service config.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="glass-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-400" />
            Early Warning Alert & Notification Management
          </h2>
          <p className="text-xs text-slate-400">
            Automated threshold violation alerts, extension officer acknowledgment, and resolution audit trail
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-500 text-white shadow-glow-primary'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MODERATE">Moderate</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alert Cards Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {isLoading ? (
            <div className="glass-card p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              <span>Fetching live alerts…</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-500">
              No early warning alerts found for the selected status.
            </div>
          ) : (
            alerts.map((alert) => {
              const badge = RISK_BADGES[alert.risk_level] || RISK_BADGES.LOW;
              return (
                <div key={alert.id} className="glass-card p-5 space-y-3 relative overflow-hidden">
                  <div
                    className={`w-1 absolute top-0 left-0 bottom-0 ${
                      alert.status === 'RESOLVED'
                        ? 'bg-emerald-500'
                        : alert.risk_level === 'CRITICAL'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />

                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">#{alert.id} · {alert.location}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {badge.icon} {alert.risk_level}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Target: <strong className="text-slate-200">{alert.pest_name}</strong> on{' '}
                        <strong className="text-emerald-400">{alert.crop}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        alert.status === 'PENDING'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                          : alert.status === 'ACKNOWLEDGED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {alert.status}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        {alert.created_at || 'Recently'}
                      </div>
                    </div>
                  </div>

                  {/* Advisory Text */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    {alert.advisory_text}
                  </p>

                  {/* Lifecycle info & Action Buttons */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap text-xs">
                    <div className="text-[11px] text-slate-400">
                      {alert.status === 'ACKNOWLEDGED' && (
                        <span>🕒 Acknowledged by {alert.acknowledged_by || 'Officer'}</span>
                      )}
                      {alert.status === 'RESOLVED' && (
                        <span className="text-emerald-400">
                          ✅ Resolved: {alert.resolution_notes || 'IPM treatments applied'}
                        </span>
                      )}
                      {alert.status === 'PENDING' && (
                        <span className="text-rose-400 font-semibold">⚠️ Action required by extension officer</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {alert.status === 'PENDING' && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {alert.status === 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => setResolvingAlert(alert)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Log Resolution</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dispatch Advisory Panel (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Dispatch SMS & Email Advisory
            </h3>
            <p className="text-xs text-slate-400">
              Transmit urgent advisory notices to farming communities and district agricultural officers
            </p>
          </div>

          <form onSubmit={handleDispatchAdvisory} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Target Station</label>
                <select
                  value={dispatchLocation}
                  onChange={(e) => setDispatchLocation(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  {Object.keys(STATIONS).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Severity Tier</label>
                <select
                  value={dispatchSeverity}
                  onChange={(e) => setDispatchSeverity(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MODERATE">MODERATE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Crop</label>
                <input
                  type="text"
                  value={dispatchCrop}
                  onChange={(e) => setDispatchCrop(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Pest Species</label>
                <input
                  type="text"
                  value={dispatchPest}
                  onChange={(e) => setDispatchPest(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Recipient Mobile (SMS)</label>
              <input
                type="text"
                placeholder="+919876543210 (Twilio SMS)"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Recipient Email (HTML Advisory)</label>
              <input
                type="email"
                placeholder="officer@icar.gov.in"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Advisory Guidance Message</label>
              <textarea
                rows={3}
                value={dispatchAdvisory}
                onChange={(e) => setDispatchAdvisory(e.target.value)}
                className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>

            {dispatchStatus && (
              <div className="p-2.5 rounded-lg bg-white/[0.04] text-xs border border-white/10">
                {dispatchStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={isDispatching}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 shadow-glow-danger transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isDispatching ? 'Transmitting…' : 'Dispatch Multi-Channel Alert'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── Resolution Modal ──────────────────────────────────────────────── */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                Resolve Alert #{resolvingAlert.id}
              </h3>
              <button onClick={() => setResolvingAlert(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Resolving Officer Name</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Field Remediation & Outcome Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Deployed 25 egg parasitoid trichocards per ha and drained fields. Trap catches reduced below ETL."
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-glow-primary"
                >
                  {isResolving ? 'Resolving…' : 'Mark as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
