import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/ToastProvider';

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_ZONES = [
  'Northern','North Eastern','North Western','North Central',
  'Eastern','East Central','East Coast',
  'Western','West Central',
  'Southern','South Central','South Eastern','South East Central','South Western',
  'Central',
];

const STATUS_META = {
  Free:        { label: 'Free',        dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', row: 'hover:bg-emerald-500/5',  icon: 'check_circle'   },
  Occupied:    { label: 'Occupied',    dot: 'bg-[#FF9933]',   badge: 'bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/30',       row: 'hover:bg-[#FF9933]/5',   icon: 'train'          },
  Incoming:    { label: 'Incoming',    dot: 'bg-yellow-400',  badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',    row: 'hover:bg-yellow-500/5',  icon: 'arrow_forward'  },
  Maintenance: { label: 'Maintenance', dot: 'bg-red-400',     badge: 'bg-red-500/15 text-red-400 border-red-500/30',             row: 'hover:bg-red-500/5',     icon: 'construction'   },
  Reserved:    { label: 'Reserved',    dot: 'bg-purple-400',  badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',    row: 'hover:bg-purple-500/5',  icon: 'lock'           },
};

const PLATFORM_STATUSES = ['Free','Occupied','Incoming','Maintenance','Reserved'];

function derivePlatformStatus(p) {
  if (p.status === 'maintenance') return 'Maintenance';
  if (p.occupied && p.assigned_train_id) return 'Occupied';
  if (!p.occupied && p.next_arrival) {
    const arr = new Date(p.next_arrival);
    if (arr - Date.now() < 30 * 60 * 1000) return 'Incoming';
  }
  return 'Free';
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDelay(mins) {
  if (!mins || mins <= 0) return null;
  return `+${mins}m`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.Free;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${status === 'Occupied' || status === 'Incoming' ? 'animate-pulse' : ''}`} />
      {m.label}
    </span>
  );
}

// ── StationTable ──────────────────────────────────────────────────────────────
function StationTable({ stationName, platforms, onAction, highlightIds }) {
  const code = stationName.match(/\(([^)]+)\)/)?.[1] || stationName.slice(0, 4).toUpperCase();
  const cleanName = stationName.replace(/\s*\([^)]*\)/, '').trim();

  const occ  = platforms.filter(p => p._status === 'Occupied').length;
  const free = platforms.filter(p => p._status === 'Free').length;
  const inc  = platforms.filter(p => p._status === 'Incoming').length;
  const mnt  = platforms.filter(p => p._status === 'Maintenance').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low border border-white/5 rounded-xl overflow-hidden shadow-xl"
    >
      {/* Station header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF9933]/10 border border-[#FF9933]/20 flex items-center justify-center">
            <span className="text-[#FF9933] font-black text-xs">{code}</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">{cleanName}</h3>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">{platforms.length} platforms</p>
          </div>
        </div>
        {/* Mini KPIs */}
        <div className="hidden sm:flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
          {occ  > 0 && <span className="text-[#FF9933]">{occ} Occupied</span>}
          {free > 0 && <span className="text-emerald-400">{free} Free</span>}
          {inc  > 0 && <span className="text-yellow-400">{inc} Incoming</span>}
          {mnt  > 0 && <span className="text-red-400">{mnt} Maint.</span>}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 bg-surface-container-lowest/40">
              <th className="px-4 py-2.5 text-left w-[90px]">Platform</th>
              <th className="px-4 py-2.5 text-left w-[120px]">Status</th>
              <th className="px-4 py-2.5 text-left">Train</th>
              <th className="px-4 py-2.5 text-left w-[110px]">Train No.</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Arrival</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Departure</th>
              <th className="px-4 py-2.5 text-center w-[80px]">Delay</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Demand</th>
              <th className="px-4 py-2.5 text-right w-[80px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {platforms.map((p) => {
              const m = STATUS_META[p._status] || STATUS_META.Free;
              const delay = fmtDelay(p.delay_minutes);
              const isHighlighted = highlightIds.includes(p.id);
              return (
                <motion.tr
                  key={p.id}
                  animate={isHighlighted ? { backgroundColor: ['rgba(255,153,51,0.12)', 'rgba(0,0,0,0)'] } : {}}
                  transition={{ duration: 1.5 }}
                  className={`text-sm transition-colors cursor-default ${m.row}`}
                >
                  {/* Platform number */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-8 rounded-full ${m.dot.replace('bg-', 'bg-').replace('400','500')}`} />
                      <span className="font-black text-white text-sm">{p.platform_number}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={p._status} />
                  </td>

                  {/* Train name */}
                  <td className="px-4 py-3">
                    {p.train_name ? (
                      <div>
                        <div className="text-white text-xs font-semibold truncate max-w-[180px]">{p.train_name}</div>
                        {p.train_type && (
                          <div className="text-[9px] text-zinc-500 mt-0.5 truncate max-w-[180px]">{p.train_type}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">
                        {p._status === 'Maintenance' ? 'Under maintenance' : '—'}
                      </span>
                    )}
                  </td>

                  {/* Train number */}
                  <td className="px-4 py-3">
                    {p.train_number
                      ? <span className="text-[#FF9933] font-black text-xs">{p.train_number}</span>
                      : <span className="text-zinc-700 text-xs">—</span>
                    }
                  </td>

                  {/* Arrival */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-zinc-300 text-xs font-mono">{fmtTime(p.next_arrival)}</span>
                  </td>

                  {/* Departure — estimated as arrival + 15 min if occupied */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-zinc-500 text-xs font-mono">
                      {p.next_arrival && p._status === 'Occupied'
                        ? fmtTime(new Date(new Date(p.next_arrival).getTime() + 15 * 60000).toISOString())
                        : '—'}
                    </span>
                  </td>

                  {/* Delay */}
                  <td className="px-4 py-3 text-center">
                    {delay
                      ? <span className="text-red-400 font-black text-xs">{delay}</span>
                      : <span className="text-emerald-500 text-xs">On time</span>
                    }
                  </td>

                  {/* Demand */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-white">{p.demand_forecasts ?? 0}%</span>
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${p.demand_forecasts ?? 0}%`,
                            background: (p.demand_forecasts ?? 0) > 80 ? '#f87171' : (p.demand_forecasts ?? 0) > 60 ? '#FF9933' : '#22c55e',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onAction(p)}
                      className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#FF9933] transition-colors px-2 py-1 rounded border border-white/5 hover:border-[#FF9933]/30 hover:bg-[#FF9933]/5"
                    >
                      Manage
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default React.memo(function Platforms() {
  const { showToast } = useToast();
  const [rawPlatforms, setRawPlatforms] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [lastRefresh,  setLastRefresh]  = useState(null);

  // Filters
  const [filterZone,    setFilterZone]    = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [search,        setSearch]        = useState('');

  // Highlight (socket updates)
  const [highlightIds, setHighlightIds] = useState([]);

  // Modal state
  const [modal,     setModal]     = useState(null); // { platform }
  const [modalForm, setModalForm] = useState({ status: 'active', occupied: false, assignedTrainId: '' });
  const [saving,    setSaving]    = useState(false);

  // Add platform modal
  const [addModal,    setAddModal]    = useState(false);
  const [addForm,     setAddForm]     = useState({ platformNumber: '', stationName: '', status: 'active', occupied: false, demandForecasts: 0 });
  const [addSaving,   setAddSaving]   = useState(false);

  const autoRefreshRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/platforms');
      const enriched = res.data.map(p => ({ ...p, _status: derivePlatformStatus(p) }));
      setRawPlatforms(enriched);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    autoRefreshRef.current = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(autoRefreshRef.current);
  }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────────────────────
  // All unique stations from data
  const allStations = [...new Set(rawPlatforms.map(p => p.station_name))].sort();

  // Filter pipeline
  const filtered = rawPlatforms.filter(p => {
    if (filterStatus && p._status !== filterStatus) return false;
    if (filterStation && p.station_name !== filterStation) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.platform_number?.toLowerCase().includes(q) ||
        p.station_name?.toLowerCase().includes(q) ||
        p.train_number?.toLowerCase().includes(q) ||
        p.train_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by station
  const byStation = filtered.reduce((acc, p) => {
    const key = p.station_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Summary counts
  const total = rawPlatforms.length;
  const occ   = rawPlatforms.filter(p => p._status === 'Occupied').length;
  const free  = rawPlatforms.filter(p => p._status === 'Free').length;
  const inc   = rawPlatforms.filter(p => p._status === 'Incoming').length;
  const mnt   = rawPlatforms.filter(p => p._status === 'Maintenance').length;

  // ── Actions ────────────────────────────────────────────────────────────────
  const openManage = (p) => {
    setModal({ platform: p });
    setModalForm({
      status:          p.status || 'active',
      occupied:        p.occupied || false,
      assignedTrainId: p.assigned_train_id || '',
    });
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await api.put(`/platforms/${modal.platform.id}`, {
        status:          modalForm.status,
        occupied:        modalForm.occupied,
        assignedTrainId: modalForm.assignedTrainId || null,
      });
      setHighlightIds(ids => [...ids, modal.platform.id]);
      setTimeout(() => setHighlightIds(ids => ids.filter(id => id !== modal.platform.id)), 2000);
      setModal(null);
      fetchData(true);
      showToast({ title: 'Platform Updated', message: `${modal.platform.platform_number} — ${modal.platform.station_name} updated.`, severity: 'info' }, 3000);
    } catch (e) {
      showToast({ title: 'Update Failed', message: e.response?.data?.message || e.message, severity: 'critical' }, 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.platformNumber || !addForm.stationName) {
      showToast({ title: 'Validation Error', message: 'Platform number and station name are required.', severity: 'critical' }, 4000);
      return;
    }
    setAddSaving(true);
    try {
      await api.post('/platforms', {
        platformNumber:  addForm.platformNumber,
        stationName:     addForm.stationName,
        status:          addForm.status,
        occupied:        addForm.occupied,
        demandForecasts: Number(addForm.demandForecasts) || 0,
      });
      setAddModal(false);
      setAddForm({ platformNumber: '', stationName: '', status: 'active', occupied: false, demandForecasts: 0 });
      fetchData(true);
      showToast({ title: 'Platform Added', message: `${addForm.platformNumber} at ${addForm.stationName} created.`, severity: 'info' }, 3000);
    } catch (e) {
      showToast({ title: 'Create Failed', message: e.response?.data?.message || e.message, severity: 'critical' }, 5000);
    } finally {
      setAddSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tight">Platform Operations</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">Station Control · All Zones</p>
            {lastRefresh && (
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
                · Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setAddModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#FF9933] to-[#ff7300] px-4 py-2 rounded-lg text-black font-bold text-xs uppercase tracking-widest shadow-[0_0_16px_rgba(255,153,51,0.3)]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Platform
          </motion.button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: total, color: 'text-white',        border: 'border-white/10',          icon: 'platform'      },
          { label: 'Occupied',    value: occ,   color: 'text-[#FF9933]',    border: 'border-[#FF9933]/30',      icon: 'train'         },
          { label: 'Free',        value: free,  color: 'text-emerald-400',  border: 'border-emerald-500/30',    icon: 'check_circle'  },
          { label: 'Incoming',    value: inc,   color: 'text-yellow-400',   border: 'border-yellow-500/30',     icon: 'arrow_forward' },
          { label: 'Maintenance', value: mnt,   color: 'text-red-400',      border: 'border-red-500/30',        icon: 'construction'  },
        ].map(k => (
          <motion.div
            key={k.label}
            whileHover={{ y: -2 }}
            onClick={() => setFilterStatus(filterStatus === k.label && k.label !== 'Total' ? '' : k.label === 'Total' ? '' : k.label)}
            className={`bg-surface-container-low border ${k.border} rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${filterStatus === k.label ? 'ring-1 ring-white/20' : ''}`}
          >
            <span className={`material-symbols-outlined ${k.color} text-xl`}>{k.icon}</span>
            <div>
              <div className={`text-2xl font-black ${k.color}`}>{loading ? '—' : k.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">{k.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Search</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF9933]/50 outline-none"
              placeholder="Platform, station, train no., train name..."
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Station */}
        <div>
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Station</label>
          <select
            value={filterStation} onChange={e => setFilterStation(e.target.value)}
            className="bg-surface/50 border border-white/10 text-xs px-3 py-2 rounded-lg text-on-surface focus:ring-1 focus:ring-[#FF9933]/50 outline-none cursor-pointer min-w-[180px]"
          >
            <option value="">All Stations</option>
            {allStations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Status</label>
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-surface/50 border border-white/10 text-xs px-3 py-2 rounded-lg text-on-surface focus:ring-1 focus:ring-[#FF9933]/50 outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {PLATFORM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Clear */}
        {(search || filterStation || filterStatus) && (
          <button
            onClick={() => { setSearch(''); setFilterStation(''); setFilterStatus(''); }}
            className="self-end px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
          >
            Clear
          </button>
        )}

        {/* Results count */}
        <div className="self-end ml-auto text-[9px] text-zinc-500 uppercase tracking-widest">
          {filtered.length} platform{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* ── Status Legend ── */}
      <div className="flex flex-wrap gap-3">
        {PLATFORM_STATUSES.map(s => {
          const m = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
                filterStatus === s
                  ? m.badge
                  : 'border-white/5 text-zinc-500 hover:text-white hover:border-white/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${m.dot}`} />
              {s}
            </button>
          );
        })}
      </div>

      {/* ── Main Content ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-low border border-white/5 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-48 mb-4" />
              {[1,2,3].map(j => <div key={j} className="h-10 bg-white/5 rounded mb-2" />)}
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-red-400 text-3xl block mb-2">error</span>
          <p className="text-red-400 text-sm font-bold">{error}</p>
          <button onClick={() => fetchData()} className="mt-3 text-xs text-zinc-400 hover:text-white underline">Retry</button>
        </div>
      ) : Object.keys(byStation).length === 0 ? (
        <EmptyState icon="platform" message="No platforms match your filters." />
      ) : (
        <div className="space-y-4">
          {Object.entries(byStation)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([station, pfs]) => (
              <StationTable
                key={station}
                stationName={station}
                platforms={pfs}
                onAction={openManage}
                highlightIds={highlightIds}
              />
            ))}
        </div>
      )}

      {/* ── Manage Platform Modal ── */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `Manage ${modal.platform.platform_number} — ${modal.platform.station_name}` : ''}
        onSubmit={handleSave}
        submitText={saving ? 'Saving…' : 'Save Changes'}
      >
        {modal && (
          <div className="space-y-4">
            {/* Current info */}
            <div className="bg-surface-container-lowest rounded-lg p-3 border border-white/5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Status</span>
                <StatusBadge status={modal.platform._status} />
              </div>
              {modal.platform.train_number && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Assigned Train</span>
                  <span className="text-[#FF9933] font-bold">{modal.platform.train_number} — {modal.platform.train_name}</span>
                </div>
              )}
              {modal.platform.delay_minutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Delay</span>
                  <span className="text-red-400 font-bold">+{modal.platform.delay_minutes} min</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Platform Status</label>
                <select
                  value={modalForm.status}
                  onChange={e => setModalForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Occupied</label>
                <select
                  value={modalForm.occupied ? 'yes' : 'no'}
                  onChange={e => setModalForm(f => ({ ...f, occupied: e.target.value === 'yes' }))}
                  className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
                >
                  <option value="no">No — Platform Free</option>
                  <option value="yes">Yes — Train Present</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Assign Train (UUID — leave blank to clear)</label>
              <input
                value={modalForm.assignedTrainId}
                onChange={e => setModalForm(f => ({ ...f, assignedTrainId: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none font-mono text-xs"
                placeholder="e.g. 90a941d4-bb52-4139-... (blank to clear)"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Platform Modal ── */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="Add New Platform"
        onSubmit={handleAdd}
        submitText={addSaving ? 'Adding…' : 'Add Platform'}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Platform Number</label>
            <input
              value={addForm.platformNumber}
              onChange={e => setAddForm(f => ({ ...f, platformNumber: e.target.value }))}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
              placeholder="e.g. PF-7"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Station Name</label>
            <input
              value={addForm.stationName}
              onChange={e => setAddForm(f => ({ ...f, stationName: e.target.value }))}
              list="station-list"
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
              placeholder="e.g. New Delhi (NDLS)"
            />
            <datalist id="station-list">
              {allStations.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Status</label>
            <select
              value={addForm.status}
              onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Demand Forecast (%)</label>
            <input
              type="number" min="0" max="100"
              value={addForm.demandForecasts}
              onChange={e => setAddForm(f => ({ ...f, demandForecasts: e.target.value }))}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
