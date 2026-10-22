import React, { useState, useEffect } from 'react';
import { Plus, Filter, RefreshCw, X, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { apiService } from '../../services/api';
import { Observation, RiskLevel } from '../../types/dashboard';
import { STATIONS, PESTS_BY_CROP, RISK_BADGES } from '../../constants/agroData';

export const ObservationsTab: React.FC = () => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  // Filters
  const [cropFilter, setCropFilter] = useState<string>('');
  const [locFilter, setLocFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [newCrop, setNewCrop] = useState<string>('Rice');
  const [newPest, setNewPest] = useState<string>('Brown Planthopper');
  const [newLocation, setNewLocation] = useState<string>('CUTTACK');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newWeek, setNewWeek] = useState<number>(38);
  const [newCount, setNewCount] = useState<number>(6.5);
  const [newUnit, setNewUnit] = useState<string>('hoppers/hill');
  const [newTmax, setNewTmax] = useState<number>(32.0);
  const [newTmin, setNewTmin] = useState<number>(24.5);
  const [newNotes, setNewNotes] = useState<string>('');
  const [newObserver, setNewObserver] = useState<string>('Field Officer - ICAR');
  const [newSeverity, setNewSeverity] = useState<RiskLevel>('MODERATE');

  useEffect(() => {
    loadObservations();
  }, [page, cropFilter, locFilter, severityFilter]);

  const loadObservations = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getObservations({
        limit: pageSize,
        offset: page * pageSize,
        crop: cropFilter || undefined,
        location: locFilter || undefined,
        severity: severityFilter || undefined,
      });
      setObservations(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);

    try {
      await apiService.createObservation({
        observation_date: newDate,
        crop: newCrop,
        pest_name: newPest,
        location: newLocation,
        standard_week: newWeek,
        pest_count: newCount,
        count_unit: newUnit,
        temp_max: newTmax,
        temp_min: newTmin,
        severity_level: newSeverity,
        notes: newNotes,
        observer_id: newObserver,
        verification_status: 'VERIFIED',
      });

      setFormMsg({ text: 'Observation successfully recorded!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setFormMsg(null);
        loadObservations();
      }, 1200);
    } catch (err) {
      setFormMsg({ text: 'Failed to save observation. Please check required values.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto p-4 md:p-6">
      {/* ── Header & Action Toolbar ────────────────────────────────────────── */}
      <div className="glass-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Field Scouting & Surveillance Observations
          </h2>
          <p className="text-xs text-slate-400">
            Real-world trap catches, field density counts, and telemetry audit trail ({totalCount} total entries)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-glow-primary transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Log Field Observation</span>
          </button>

          <button
            onClick={loadObservations}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Refresh observations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filters Bar ────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 flex items-center gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Crop:</span>
          <select
            value={cropFilter}
            onChange={(e) => { setCropFilter(e.target.value); setPage(0); }}
            className="bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Crops</option>
            <option value="Rice">Rice</option>
            <option value="Cotton">Cotton</option>
            <option value="Maize">Maize</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Station:</span>
          <select
            value={locFilter}
            onChange={(e) => { setLocFilter(e.target.value); setPage(0); }}
            className="bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Stations</option>
            {Object.keys(STATIONS).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Risk Tier:</span>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
            className="bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Tiers</option>
            <option value="LOW">Low</option>
            <option value="MODERATE">Moderate</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {(cropFilter || locFilter || severityFilter) && (
          <button
            onClick={() => { setCropFilter(''); setLocFilter(''); setSeverityFilter(''); setPage(0); }}
            className="text-xs text-emerald-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Observations Table ─────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4"># ID</th>
                <th className="py-3 px-4">Date / SMW</th>
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4">Crop & Pest</th>
                <th className="py-3 px-4 font-mono">Count / Density</th>
                <th className="py-3 px-4 font-mono">Micro-Climate</th>
                <th className="py-3 px-4">Risk Severity</th>
                <th className="py-3 px-4">Notes & Officer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading surveillance telemetry…</span>
                  </td>
                </tr>
              ) : observations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No scouting records found matching the active filters.
                  </td>
                </tr>
              ) : (
                observations.map((obs, idx) => {
                  const severity = obs.severity_level || 'LOW';
                  const badge = RISK_BADGES[severity] || RISK_BADGES.LOW;

                  return (
                    <tr key={obs.id || obs.observation_id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        #{obs.id || obs.observation_id || idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{obs.observation_date}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SMW {obs.standard_week}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200">{obs.location}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">{obs.pest_name}</div>
                        <div className="text-[10px] text-emerald-400">{obs.crop}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {obs.pest_count}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">{obs.count_unit || 'units'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {obs.temp_max !== undefined && obs.temp_max !== null ? (
                          <div>{obs.temp_max}°C / {obs.temp_min}°C</div>
                        ) : (
                          <div className="text-slate-500">—</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        <div>{obs.notes || 'Routine field inspection'}</div>
                        <div className="text-[10px] text-slate-500">By: {obs.observer_id || 'Officer'}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {observations.length > 0 ? page * pageSize + 1 : 0} to{' '}
            {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} observations
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 disabled:opacity-40 hover:bg-white/[0.08]"
            >
              Previous
            </button>
            <button
              disabled={(page + 1) * pageSize >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 disabled:opacity-40 hover:bg-white/[0.08]"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Log Observation Modal ──────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Log New Field Scouting Observation
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateObservation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Crop</label>
                  <select
                    value={newCrop}
                    onChange={(e) => {
                      setNewCrop(e.target.value);
                      const pests = PESTS_BY_CROP[e.target.value] || PESTS_BY_CROP.Rice;
                      setNewPest(pests[0]);
                    }}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="Rice">Rice</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Target Pest</label>
                  <select
                    value={newPest}
                    onChange={(e) => setNewPest(e.target.value)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    {(PESTS_BY_CROP[newCrop] || PESTS_BY_CROP.Rice).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Station Code</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    {Object.keys(STATIONS).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Observation Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">SMW Week</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={newWeek}
                    onChange={(e) => setNewWeek(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Pest Count</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCount}
                    onChange={(e) => setNewCount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTmax}
                    onChange={(e) => setNewTmax(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTmin}
                    onChange={(e) => setNewTmin(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Observed Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as RiskLevel)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Scouting Officer</label>
                  <input
                    type="text"
                    value={newObserver}
                    onChange={(e) => setNewObserver(e.target.value)}
                    className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Field Observation Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., Sub-canopy hopper population increasing, nymphal clustering on lower third of stem."
                  className="w-full bg-[#0a1017] border border-white/10 rounded-lg px-2.5 py-2 text-slate-200"
                />
              </div>

              {formMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    formMsg.isError
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {formMsg.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span>{formMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-glow-primary"
                >
                  {isSubmitting ? 'Submitting…' : 'Save Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
