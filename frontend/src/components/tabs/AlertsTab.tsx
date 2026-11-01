import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { AlertItem } from '../../types/dashboard';

export const AlertsTab: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalAlerts, setTotalAlerts] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string>('');

  // Dispatch Advisory Drawer State
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [dispatchAdvisoryText, setDispatchAdvisoryText] = useState<string>('');
  const [dispatchChannel, setDispatchChannel] = useState<string>('SMS');
  const [recipient, setRecipient] = useState<string>('+91 98765 43210');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getAlerts({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        limit: 50,
      });
      setAlerts(res.items);
      setTotalAlerts(res.total);
      if (res.items.length > 0 && !selectedAlert) {
        setSelectedAlert(res.items[0]);
        setDispatchAdvisoryText(
          res.items[0].explanation_summary ||
            `Urgent ${res.items[0].pest_name} outbreak alert at ${res.items[0].location}. Apply recommended biological/chemical spray protocol.`
        );
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (id: number) => {
    try {
      await apiService.acknowledgeAlert(id);
      setActionMsg(`Alert #${id} acknowledged.`);
      setTimeout(() => setActionMsg(''), 3000);
      loadAlerts();
    } catch (err: any) {
      setActionMsg(`Failed to acknowledge alert: ${err.message}`);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await apiService.resolveAlert(id);
      setActionMsg(`Alert #${id} marked as resolved.`);
      setTimeout(() => setActionMsg(''), 3000);
      loadAlerts();
    } catch (err: any) {
      setActionMsg(`Failed to resolve alert: ${err.message}`);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setIsDispatching(true);
    try {
      await apiService.dispatchAdvisory({
        location: selectedAlert.location,
        crop: selectedAlert.crop,
        pest_name: selectedAlert.pest_name,
        risk_level: selectedAlert.severity || selectedAlert.risk_level || 'HIGH',
        advisory_text: dispatchAdvisoryText,
        channel: dispatchChannel,
        recipient,
      });
      setActionMsg(`Advisory successfully dispatched via ${dispatchChannel}!`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionMsg(`Dispatch failed: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Metrics from real database
  const pendingCount = alerts.filter((a) => (a.status || '').toLowerCase() === 'active').length;
  const acknowledgedCount = alerts.filter((a) => (a.status || '').toLowerCase() === 'acknowledged').length;
  const resolvedCount = alerts.filter((a) => (a.status || '').toLowerCase() === 'resolved').length;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-DEFAULT bg-surface-container-low border border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-risk-critical">
              Automated Early Warning Network
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-risk-critical" />
            <span className="text-xs text-secondary">{totalAlerts} Total System Alerts</span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
            Early Warning Command Center & Advisories
          </h1>
          <p className="text-sm text-secondary mt-1">
            Real-time automated alert queues triggered by verified economic threshold (ETL) breaches.
          </p>
        </div>

        {actionMsg && (
          <div className="px-4 py-2 rounded-full bg-tertiary-container/40 border border-primary/30 text-primary text-xs font-bold animate-fade-in">
            {actionMsg}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-secondary">Total Alerts</span>
          <div className="font-headline text-3xl font-bold text-on-surface mt-2">{totalAlerts}</div>
          <span className="text-[11px] text-secondary mt-1 block">Surveillance triggers</span>
        </div>

        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-risk-critical">Pending Action</span>
          <div className="font-headline text-3xl font-bold text-risk-critical mt-2">{pendingCount}</div>
          <span className="text-[11px] text-secondary mt-1 block">Requires officer review</span>
        </div>

        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-risk-moderate">Acknowledged</span>
          <div className="font-headline text-3xl font-bold text-risk-moderate mt-2">
            {acknowledgedCount}
          </div>
          <span className="text-[11px] text-secondary mt-1 block">In-field action deployed</span>
        </div>

        <div className="p-5 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle">
          <span className="text-xs font-bold uppercase text-risk-low">Resolved</span>
          <div className="font-headline text-3xl font-bold text-risk-low mt-2">{resolvedCount}</div>
          <span className="text-[11px] text-secondary mt-1 block">Suppressed below ETL</span>
        </div>
      </div>

      {/* Filter and Command Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-border-hairline shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active (Pending)</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-secondary font-mono">
          {isLoading ? 'Refreshing queue…' : `${alerts.length} Displayed`}
        </div>
      </div>

      {/* Main Split: Alert Queue (8 cols) + Advisory Dispatch Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Alert Queue Table */}
        <div className="lg:col-span-8 p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
              Alert Queue & Command List
            </h3>
            <span className="text-xs text-secondary">Click row to prepare advisory</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-hairline text-secondary text-[11px]">
                  <th className="pb-3 uppercase font-bold">Severity</th>
                  <th className="pb-3 uppercase font-bold">Station Location</th>
                  <th className="pb-3 uppercase font-bold">Pest / Crop</th>
                  <th className="pb-3 uppercase font-bold">Risk Score</th>
                  <th className="pb-3 uppercase font-bold">Status</th>
                  <th className="pb-3 uppercase font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {alerts.map((al) => {
                  const isSelected = selectedAlert?.id === al.id;
                  const st = (al.status || 'active').toLowerCase();
                  return (
                    <tr
                      key={al.id}
                      onClick={() => {
                        setSelectedAlert(al);
                        setDispatchAdvisoryText(
                          al.explanation_summary ||
                            `Urgent ${al.pest_name} outbreak alert at ${al.location}. Apply recommended protocol.`
                        );
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-tertiary-container/20 border-l-4 border-primary'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <td className="py-3 font-semibold">
                        {(() => {
                          const level = al.severity || al.risk_level || 'MODERATE';
                          return (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                level === 'CRITICAL'
                                  ? 'bg-risk-critical text-white'
                                  : level === 'HIGH'
                                  ? 'bg-risk-high text-white'
                                  : 'bg-risk-moderate text-white'
                              }`}
                            >
                              {level}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 font-bold text-on-surface">{al.location}</td>
                      <td className="py-3 text-secondary">
                        <span className="font-semibold text-on-surface">{al.pest_name}</span> · {al.crop}
                      </td>
                      <td className="py-3 font-mono font-bold text-on-surface">
                        {al.risk_score ? (al.risk_score * 100).toFixed(0) : '--'}%
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            st === 'resolved'
                              ? 'bg-risk-low/20 text-risk-low'
                              : st === 'acknowledged'
                              ? 'bg-risk-moderate/20 text-risk-moderate'
                              : 'bg-risk-critical/20 text-risk-critical'
                          }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {st === 'active' && (
                          <button
                            onClick={() => handleAcknowledge(al.id)}
                            className="px-2.5 py-1 rounded-md bg-surface-container-highest hover:bg-surface-variant text-on-surface text-[11px] font-semibold"
                          >
                            Acknowledge
                          </button>
                        )}
                        {st !== 'resolved' && (
                          <button
                            onClick={() => handleResolve(al.id)}
                            className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-on-primary text-[11px] font-semibold"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-secondary">
                      No active alerts matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Advisory Dispatch Panel */}
        <div className="lg:col-span-4 p-6 rounded-DEFAULT bg-surface-container-lowest border border-border-hairline shadow-subtle space-y-4">
          <div className="pb-3 border-b border-border-hairline">
            <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">send</span>
              Advisory Dispatcher
            </h3>
            <span className="text-xs text-secondary">
              Broadcast advisory to registered farm officers
            </span>
          </div>

          {selectedAlert ? (
            <form onSubmit={handleDispatch} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-soft border border-border-hairline space-y-1">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>Selected: #{selectedAlert.id}</span>
                  <span className="text-primary">{selectedAlert.location}</span>
                </div>
                <div className="text-[11px] text-secondary">
                  Crop: {selectedAlert.crop} · Target: {selectedAlert.pest_name}
                </div>
              </div>

              <div>
                <label className="font-bold text-secondary block mb-1">Dispatch Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('SMS')}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      dispatchChannel === 'SMS'
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-soft text-secondary border-border-hairline'
                    }`}
                  >
                    SMS Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('WhatsApp')}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      dispatchChannel === 'WhatsApp'
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-soft text-secondary border-border-hairline'
                    }`}
                  >
                    WhatsApp Broadcast
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-secondary block mb-1">Recipient Mobile / Group</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border-hairline bg-surface-soft px-2.5 text-xs text-on-surface"
                />
              </div>

              <div>
                <label className="font-bold text-secondary block mb-1">Advisory Text Directive</label>
                <textarea
                  rows={4}
                  value={dispatchAdvisoryText}
                  onChange={(e) => setDispatchAdvisoryText(e.target.value)}
                  className="w-full rounded-lg border border-border-hairline bg-surface-soft p-2.5 text-xs text-on-surface leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isDispatching}
                className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-sm transition-all"
              >
                {isDispatching ? 'Transmitting Advisory…' : `Send via ${dispatchChannel}`}
              </button>
            </form>
          ) : (
            <div className="py-12 text-center text-secondary text-xs">
              Select an alert from the table to prepare and dispatch advisory directives.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
