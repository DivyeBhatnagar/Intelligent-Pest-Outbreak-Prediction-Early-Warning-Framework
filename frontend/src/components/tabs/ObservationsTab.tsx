import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Observation } from '../../types/dashboard';
import { STATIONS, PESTS_BY_CROP } from '../../constants/agroData';

export const ObservationsTab: React.FC = () => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  // Filters
  const [cropFilter, setCropFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modal State for New Observation
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Observation Form State
  const [newCrop, setNewCrop] = useState<string>('Rice');
  const [newPest, setNewPest] = useState<string>('Brown Planthopper');
  const [newLocation, setNewLocation] = useState<string>('Cuttack');
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newWeek, setNewWeek] = useState<number>(38);
  const [newCount, setNewCount] = useState<number>(6.5);
  const [newUnit, setNewUnit] = useState<string>('hoppers/hill');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newObserver, setNewObserver] = useState<string>('Field Officer - ICAR');

  const loadObservations = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getObservations({
        limit: pageSize,
        offset: page * pageSize,
        crop: cropFilter !== 'ALL' ? cropFilter : undefined,
        location: locationFilter !== 'ALL' ? locationFilter : undefined,
      });
      setObservations(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load observations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, [page, cropFilter, locationFilter]);

  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    try {
      await apiService.createObservation({
        crop: newCrop,
        pest_name: newPest,
        location: newLocation,
        observation_date: newDate,
        standard_week: Number(newWeek),
        pest_count: Number(newCount),
        count_unit: newUnit,
        notes: newNotes,
        observer_id: newObserver,
        collection_method: 'Visual count',
        life_stage: 'Mixed',
        verification_status: 'verified',
      });
      setFormMsg({ text: 'Observation successfully recorded and saved to database!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setFormMsg(null);
        loadObservations();
      }, 1000);
    } catch (err: any) {
      setFormMsg({ text: err.message || 'Failed to submit observation', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered in memory for instant text search
  const displayedObservations = observations.filter((obs) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      obs.location.toLowerCase().includes(q) ||
      obs.pest_name.toLowerCase().includes(q) ||
      obs.crop.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 rounded-DEFAULT bg-surface-container-low border border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Ground Truth Surveillance
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-secondary">{totalCount} Total Recorded Observations</span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
            Field Observations & Surveillance Records
          </h1>
          <p className="text-sm text-secondary mt-1">
            Empirical in-field insect scouting, tiller counts, and pheromone trap monitoring logs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Record New In-Field Observation</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-border-hairline shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search observations…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 pr-3 h-9 rounded-lg border border-border-hairline bg-surface-soft text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 w-48 sm:w-60"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Station:</span>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(0);
              }}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Stations</option>
              {Object.keys(STATIONS).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Crop:</span>
            <select
              value={cropFilter}
              onChange={(e) => {
                setCropFilter(e.target.value);
                setPage(0);
              }}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Crops</option>
              <option value="Rice">Rice</option>
              <option value="Cotton">Cotton</option>
              <option value="Maize">Maize</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-secondary font-mono">
          Page {page + 1} of {Math.max(1, Math.ceil(totalCount / pageSize))}
        </div>
      </div>

      {/* Surveillance Data Table */}
      <div className="p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-secondary text-[11px]">
                <th className="pb-3 font-bold uppercase">Record ID</th>
                <th className="pb-3 font-bold uppercase">Station Location</th>
                <th className="pb-3 font-bold uppercase">Crop</th>
                <th className="pb-3 font-bold uppercase">Target Pest</th>
                <th className="pb-3 font-bold uppercase">Population Density</th>
                <th className="pb-3 font-bold uppercase">Obs Date</th>
                <th className="pb-3 font-bold uppercase">Scout Observer</th>
                <th className="pb-3 font-bold uppercase">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {displayedObservations.map((obs) => (
                <tr key={obs.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 font-mono font-bold text-primary">#OBS-{obs.id}</td>
                  <td className="py-3 font-semibold text-on-surface">{obs.location}</td>
                  <td className="py-3 text-secondary">{obs.crop}</td>
                  <td className="py-3 font-medium text-on-surface">{obs.pest_name}</td>
                  <td className="py-3 font-mono font-bold text-on-surface">
                    {obs.pest_count} {obs.count_unit}
                  </td>
                  <td className="py-3 text-secondary">{obs.observation_date || '2026-10-22'}</td>
                  <td className="py-3 text-secondary">{obs.observer_id || 'ICAR Scout'}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-fixed/40 text-on-primary-fixed-variant uppercase">
                      {obs.verification_status || 'VERIFIED'}
                    </span>
                  </td>
                </tr>
              ))}
              {displayedObservations.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-secondary">
                    No field observation records matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="pt-4 mt-4 border-t border-border-hairline flex items-center justify-between text-xs text-secondary">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg bg-surface-soft border border-border-hairline disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= totalCount}
              className="px-3 py-1 rounded-lg bg-surface-soft border border-border-hairline disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Record New In-Field Observation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-DEFAULT bg-canvas border border-border-hairline shadow-elevated space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Record In-Field Scouting Observation
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateObservation} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-secondary block mb-1">Crop</label>
                  <select
                    value={newCrop}
                    onChange={(e) => {
                      setNewCrop(e.target.value);
                      const pests = PESTS_BY_CROP[e.target.value] || PESTS_BY_CROP.Rice;
                      setNewPest(pests[0]);
                    }}
                    className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2 text-xs text-on-surface"
                  >
                    <option value="Rice">Rice (Paddy)</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-secondary block mb-1">Target Pest</label>
                  <select
                    value={newPest}
                    onChange={(e) => setNewPest(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2 text-xs text-on-surface"
                  >
                    {(PESTS_BY_CROP[newCrop] || PESTS_BY_CROP.Rice).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-secondary block mb-1">Station / Location</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2 text-xs text-on-surface"
                  >
                    {Object.keys(STATIONS).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-secondary block mb-1">Observation Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2 text-xs text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-secondary block mb-1">Pest Count</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCount}
                    onChange={(e) => setNewCount(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2 text-xs font-mono text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-bold text-secondary block mb-1">Count Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2 text-xs text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-secondary block mb-1">Scout Notes & Symptoms</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Basal hopper colonies observed; slight leaf bronzing at tillering stage."
                  className="w-full rounded-lg border border-border-hairline bg-surface-soft p-2 text-xs text-on-surface"
                />
              </div>

              {formMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold ${
                    formMsg.isError
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-tertiary-container/40 text-primary'
                  }`}
                >
                  {formMsg.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-border-hairline text-secondary hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-primary text-on-primary font-bold shadow-sm hover:opacity-95"
                >
                  {isSubmitting ? 'Saving to Database…' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
