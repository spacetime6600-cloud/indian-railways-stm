import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/ToastProvider';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { Helmet } from 'react-helmet-async';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const ALERT_TYPE_META = {
  fog: { icon: 'foggy', color: 'text-sky-300', bar: 'bg-sky-400', badge: 'bg-sky-400/10 text-sky-300 border-sky-400/30' },
  delay: { icon: 'schedule', color: 'text-[#FF9933]', bar: 'bg-[#FF9933]', badge: 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/30' },
  maintenance: { icon: 'construction', color: 'text-red-400', bar: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/30' },
  weather: { icon: 'thunderstorm', color: 'text-purple-400', bar: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  signal: { icon: 'traffic', color: 'text-yellow-400', bar: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  rush: { icon: 'groups', color: 'text-pink-400', bar: 'bg-pink-500', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  Critical: { icon: 'bolt', color: 'text-red-400', bar: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/30' },
  Warning: { icon: 'warning_amber', color: 'text-[#FF9933]', bar: 'bg-[#FF9933]', badge: 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/30' },
  Info: { icon: 'info', color: 'text-primary', bar: 'bg-primary', badge: 'bg-primary/10 text-primary border-primary/30' },
};

const FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'Fog', value: 'fog' },
  { label: 'Delay', value: 'delay' },
  { label: 'Signal', value: 'signal' },
  { label: 'Weather', value: 'weather' },
  { label: 'Rush', value: 'rush' },
  { label: 'Maintenance', value: 'maintenance' },
];

const ALERT_TYPES = ['fog', 'delay', 'maintenance', 'weather', 'signal', 'rush', 'derailment', 'fire', 'flood', 'other'];
const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'low'];

const getMeta = (alert) =>
  ALERT_TYPE_META[alert.alertType] ||
  ALERT_TYPE_META[alert.type] ||
  ALERT_TYPE_META['Info'];

const EMPTY_FORM = { type: 'delay', severity: 'medium', title: '', message: '', stationName: '' };

export default React.memo(function Alerts() {
  const { alerts, resolveAlert, createAlert, deleteAlert, fetchAlerts } = useStore(useShallow(s => ({
    alerts: s.alerts,
    resolveAlert: s.resolveAlert,
    createAlert: s.createAlert,
    deleteAlert: s.deleteAlert,
    fetchAlerts: s.fetchAlerts
  })));
  const { showToast } = useToast();

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const activeCount = alerts.filter(a => a.active).length;
  const criticalCount = alerts.filter(a => a.type === 'Critical' && a.active).length;

  const filtered = alerts.filter(a => {
    if (!showResolved && !a.active) return false;
    const matchFilter = filter === 'All' || a.alertType === filter || a.type === filter;
    const matchSearch = !search ||
      a.message?.toLowerCase().includes(search.toLowerCase()) ||
      a.title?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleResolve = useCallback(async (alertId, alertType) => {
    await resolveAlert(alertId);
    showToast({ title: 'Alert Resolved', message: 'Alert has been acknowledged and resolved.', severity: 'info' }, 3000);
  }, [resolveAlert, showToast]);

  const handleDelete = useCallback(async (alertId) => {
    if (!window.confirm('Permanently delete this alert?')) return;
    const res = await deleteAlert(alertId);
    if (res.ok) {
      showToast({ title: 'Alert Deleted', message: 'Alert removed from the system.', severity: 'info' }, 3000);
    } else {
      showToast({ title: 'Delete Failed', message: res.message, severity: 'critical' }, 5000);
    }
  }, [deleteAlert, showToast]);

  const handleCreate = useCallback(async () => {
    if (!form.title.trim() || !form.message.trim()) {
      showToast({ title: 'Validation Error', message: 'Title and message are required.', severity: 'critical' }, 4000);
      return;
    }
    setCreating(true);
    const res = await createAlert({
      type: form.type,
      severity: form.severity,
      title: form.title.trim(),
      message: form.message.trim(),
      stationName: form.stationName.trim() || null,
    });
    setCreating(false);
    if (res.ok) {
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      showToast({ title: 'Alert Created', message: `"${form.title}" has been broadcast.`, severity: form.severity === 'critical' ? 'critical' : 'info' }, 4000);
    } else {
      showToast({ title: 'Create Failed', message: res.message, severity: 'critical' }, 5000);
    }
  }, [form, createAlert, showToast]);

  const handleClearResolved = useCallback(async () => {
    const resolved = alerts.filter(a => !a.active);
    await Promise.all(resolved.map(a => deleteAlert(a.id)));
    showToast({ title: 'Cleared', message: `${resolved.length} resolved alert(s) removed.`, severity: 'info' }, 3000);
  }, [alerts, deleteAlert, showToast]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex-1 space-y-6 relative">
      <Helmet>
        <title>Alerts | Indian Railways AI</title>
        <meta name="description" content="Live alerts and command center for Indian Railways." />
      </Helmet>

      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FF9933]/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/3 rounded-full blur-[150px] pointer-events-none" />

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tight">Alert Command Center</h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Live Feed</span>
            </div>
            <span className="text-xs text-zinc-500">{activeCount} Active</span>
            {criticalCount > 0 && (
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                {criticalCount} Critical
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Show/hide resolved toggle */}
          <button
            onClick={() => setShowResolved(v => !v)}
            className={`text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-lg border transition-all ${showResolved ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}
          >
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </button>

          {/* Clear resolved */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleClearResolved}
            className="bg-surface-container-high/40 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-lg transition-all"
          >
            Clear Resolved
          </motion.button>

          {/* Create alert */}
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="bg-gradient-to-r from-[#FF9933] to-[#ff7300] px-4 py-2 rounded-lg text-black font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_16px_rgba(255,153,51,0.3)]"
          >
            <span className="material-symbols-outlined text-sm">add_alert</span>
            New Alert
          </motion.button>
        </div>
      </motion.div>

      {/* ── Filter Bar ── */}
      <motion.div variants={itemVariants} className="bg-surface-container-low rounded-xl p-4 border border-white/5 backdrop-blur-xl relative z-10 flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-2 flex-1">
          {FILTERS.map(f => (
            <motion.button key={f.value} onClick={() => setFilter(f.value)}
              whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${filter === f.value
                ? 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/30'
                : 'text-zinc-500 border-white/5 hover:text-white hover:border-white/10'
                }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
        <div className="bg-surface-container-lowest/50 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2 w-full md:w-64 focus-within:border-[#FF9933]/40 transition-all group">
          <span className="material-symbols-outlined text-zinc-500 text-sm group-focus-within:text-[#FF9933] transition-colors">search</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm w-full text-white placeholder-zinc-600 outline-none"
            placeholder="Search alerts..."
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-500 hover:text-white">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
        <span className="text-[9px] text-zinc-600 uppercase tracking-widest">{filtered.length} shown</span>
      </motion.div>

      {/* ── Alert Grid ── */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2">
              <EmptyState icon="notifications_off" message="No active alerts. All systems nominal." />
            </motion.div>
          ) : filtered.map((alert) => {
            const meta = getMeta(alert);
            return (
              <motion.div
                key={alert.id}
                variants={itemVariants}
                whileHover={{ y: -3, scale: 1.005 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className={`bg-surface-container-low rounded-xl p-5 border border-white/5 shadow-2xl relative overflow-hidden group transition-colors ${!alert.active ? 'opacity-50 grayscale' : 'hover:bg-surface-container'}`}
              >
                {/* Severity bar */}
                <div className={`absolute top-0 left-0 w-1 h-full ${meta.bar}`} />

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.badge.split(' ')[0]}`}>
                      <span className={`material-symbols-outlined text-sm ${meta.color}`}>{meta.icon}</span>
                    </div>
                    <div>
                      <div className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${meta.badge}`}>
                        <span className={`w-1 h-1 rounded-full ${meta.bar} ${alert.active ? 'animate-pulse' : ''}`} />
                        {alert.alertType || alert.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-500 font-bold">{alert.timestamp}</span>
                    {!alert.active && <div className="text-[9px] text-emerald-400 font-bold">✓ RESOLVED</div>}
                  </div>
                </div>

                <h3 className="font-headline text-base font-bold text-white mb-1.5 group-hover:text-[#FF9933] transition-colors leading-tight">
                  {alert.title || `${alert.type} Alert`}
                </h3>
                {alert.aiPriority && (
                  <div className="mb-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${alert.aiPriority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      alert.aiPriority === 'High' ? 'bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/30' :
                        alert.aiPriority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>🤖 AI: {alert.aiPriority}</span>
                  </div>
                )}
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{alert.message}</p>

                <div className="flex justify-between items-center gap-2">
                  <motion.button whileHover={{ x: 2 }} className="text-[#FF9933] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors hover:text-white">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    View on Map
                  </motion.button>

                  <div className="flex items-center gap-2">
                    {/* Delete — always visible */}
                    <motion.button
                      onClick={() => handleDelete(alert.id)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="py-1.5 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all bg-white/5 text-zinc-500 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </motion.button>

                    {/* Resolve — only for active */}
                    {alert.active && (
                      <motion.button
                        onClick={() => handleResolve(alert.id, alert.type)}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className={`border py-1.5 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${alert.type === 'Critical'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                          : 'bg-white/5 text-white border-white/10 hover:border-[#FF9933]/40 hover:text-[#FF9933]'
                          }`}
                      >
                        {alert.type === 'Critical' ? '⚡ Resolve' : 'Acknowledge'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* ── Create Alert Modal ── */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Broadcast New Alert"
        onSubmit={handleCreate}
        submitText={creating ? 'Broadcasting…' : 'Broadcast Alert'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Alert Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
                {ALERT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
                {ALERT_SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
              placeholder="e.g. Dense Fog Alert — Northern Zone" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Message <span className="text-red-400">*</span></label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none resize-none"
              placeholder="Describe the alert in detail..." />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Station (optional)</label>
            <input value={form.stationName} onChange={e => setForm(f => ({ ...f, stationName: e.target.value }))}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
              placeholder="e.g. New Delhi (NDLS)" />
          </div>

          {/* Severity preview */}
          <div className={`rounded-lg p-3 text-xs font-bold border ${form.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            form.severity === 'high' ? 'bg-[#FF9933]/10 border-[#FF9933]/30 text-[#FF9933]' :
              'bg-white/5 border-white/10 text-zinc-400'
            }`}>
            {form.severity === 'critical' ? '⚡ Critical alert — will trigger toast notifications for all users' :
              form.severity === 'high' ? '⚠ High severity — will appear prominently in the alert feed' :
                'ℹ Standard alert — will appear in the alert feed'}
          </div>
        </div>
      </Modal>
    </motion.div>
  );
});

