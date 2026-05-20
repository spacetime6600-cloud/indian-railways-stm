import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/Modal';
import api from '../utils/api';
import EmptyState from '../components/EmptyState';
import VirtualList from '../components/VirtualList';
import { useToast } from '../components/ToastProvider';
import { Helmet } from 'react-helmet-async';

const ZONES = ['Northern', 'North Eastern', 'North Western', 'North Central', 'Eastern', 'East Central', 'East Coast', 'Western', 'West Central', 'Southern', 'South Central', 'South Eastern', 'South East Central', 'South Western', 'Central'];
const TRAIN_TYPES = ['Vande Bharat Express', 'Rajdhani Express', 'Shatabdi Express', 'Duronto Express', 'Tejas Express', 'Superfast Express', 'Mail Express', 'Intercity Express', 'MEMU', 'DEMU', 'Passenger', 'Suburban Local', 'Container Freight', 'Coal Freight', 'Parcel Train', 'Goods Train', 'Tanker Freight', 'Festival Special', 'Military Special', 'Medical Relief Train'];
const STATIONS = ['New Delhi (NDLS)', 'Mumbai Central (BCT)', 'Howrah Jn. (HWH)', 'Chennai Central (MAS)', 'Ahmedabad (ADI)', 'Patna Jn. (PNBE)', 'Jaipur (JP)', 'Bengaluru (SBC)', 'Varanasi (BSB)', 'Kolkata (KOAA)', 'Sealdah (SDAH)', 'Secunderabad (SC)', 'Bhubaneswar (BBS)', 'Guwahati (GHY)', 'Lucknow (LKO)', 'Pune Jn. (PUNE)'];
const STATUSES = ['running', 'delayed', 'scheduled', 'halted'];

const TYPE_COLOR = {
  'Vande Bharat Express': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Rajdhani Express': 'bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/30',
  'Shatabdi Express': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Duronto Express': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Tejas Express': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Freight': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  'MEMU': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'DEMU': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
};
const getTypeColor = (t) => {
  for (const [k, v] of Object.entries(TYPE_COLOR)) if (t?.includes(k.split(' ')[0])) return v;
  return 'bg-white/5 text-zinc-400 border-white/10';
};

const statusStyle = (s) => {
  switch (s?.toLowerCase()) {
    case 'delayed': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'running': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'halted': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'scheduled': return 'bg-primary/10 text-primary border-primary/20';
    default: return 'bg-white/5 text-zinc-400 border-white/10';
  }
};

const LIMIT = 50;

// TrainRow sub-component - renders as a flex div styled like a table row
const TrainRow = React.memo(function TrainRow({ train, idx, onEdit, onDelete }) {
  const trainNo = train.train_number || train.id || '—';
  const trainName = train.train_name || train.name || '—';
  const type = train.train_type || train.trainType || '—';
  const loc = train.current_location || train.currentLocation || '—';
  const delayVal = train.delay_minutes ?? train.delayMinutes ?? 0;
  const delayStr = delayVal > 0 ? `+${delayVal}m` : (train.delay || 'None');
  const predDelay = train.predicted_delay ?? train.predictedDelay ?? 0;
  const plat = train.platform_number || train.platform || '—';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
      className="group transition-colors flex items-center text-sm border-b border-white/5"
      style={{ height: '52px' }}
    >
      {/* Train No. */}
      <div className="px-4 flex-shrink-0" style={{ width: '120px' }}>
        <span className="text-[#FF9933] font-black font-headline text-sm group-hover:text-white transition-colors">{trainNo}</span>
      </div>

      {/* Name */}
      <div className="px-4 flex-1 min-w-[180px] overflow-hidden">
        <span className="text-white font-medium text-xs truncate block">{trainName}</span>
      </div>

      {/* Type */}
      <div className="px-4 flex-shrink-0" style={{ width: '140px' }}>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getTypeColor(type)}`}>
          {type.split(' ')[0] || '—'}
        </span>
      </div>

      {/* Zone */}
      <div className="px-4 flex-shrink-0" style={{ width: '140px' }}>
        <span className="text-[10px] text-zinc-400 font-bold">{train.zone || '—'}</span>
      </div>

      {/* Route */}
      <div className="px-4 flex-1 min-w-[140px] overflow-hidden">
        <span className="text-zinc-400 text-xs truncate block">{train.route || '—'}</span>
      </div>

      {/* Current Station */}
      <div className="px-4 flex-1 min-w-[140px] overflow-hidden">
        <span className="text-zinc-400 text-xs truncate block">{loc}</span>
      </div>

      {/* Speed */}
      <div className="px-4 flex-shrink-0 text-center" style={{ width: '100px' }}>
        <span className="text-primary font-bold text-xs">{train.speed ?? 0} <span className="text-[9px] text-zinc-600">km/h</span></span>
      </div>

      {/* Delay */}
      <div className="px-4 flex-shrink-0 text-center flex flex-col justify-center" style={{ width: '100px' }}>
        <span className={delayStr === 'None' ? 'text-zinc-600 text-xs' : 'text-red-400 font-bold text-xs'}>{delayStr}</span>
        {predDelay > 0 && (
          <span className="text-[9px] text-[#FF9933] font-bold">🤖 +{Number(predDelay).toFixed(1)}m</span>
        )}
      </div>

      {/* Platform */}
      <div className="px-4 flex-shrink-0 text-center" style={{ width: '100px' }}>
        <span className="bg-surface-container-highest px-2 py-0.5 rounded text-xs font-bold text-white border border-white/5 group-hover:border-[#FF9933]/30 transition-colors">
          {plat}
        </span>
      </div>

      {/* Status */}
      <div className="px-4 flex-shrink-0 text-right" style={{ width: '120px' }}>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusStyle(train.status)}`}>
          <div className={`w-1 h-1 rounded-full ${train.status?.toLowerCase() === 'running' ? 'bg-emerald-400 animate-pulse' : train.status?.toLowerCase() === 'delayed' ? 'bg-red-400' : 'bg-[#FF9933]'}`} />
          {train.status}
        </div>
      </div>

      {/* Actions */}
      <div className="px-2 flex-shrink-0 flex items-center gap-1" style={{ width: '70px' }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit(train); }}
          className="p-1 rounded text-zinc-600 hover:text-[#FF9933] hover:bg-[#FF9933]/10 transition-colors"
          title="Edit"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(train); }}
          className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    </motion.div>
  );
});

export default React.memo(function LiveTrains() {
  const {
    trainPagination,
    trainFilters,
    fetchTrains,
    fetchTrainStats,
    analytics,
    trains
  } = useStore(useShallow((s) => ({
    trainPagination: s.trainPagination,
    trainFilters: s.trainFilters,
    fetchTrains: s.fetchTrains,
    fetchTrainStats: s.fetchTrainStats,
    analytics: s.analytics,
    trains: s.trains
  })));
  const { showToast } = useToast();

  // Local filter state (debounced before sending to server)
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('train_number');
  const [sortDir, setSortDir] = useState('asc');
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', trainNumber: '', trainName: '', route: '', source: '', destination: '', speed: 0, status: 'scheduled', zone: 'Northern', trainType: 'Mail Express' });

  const searchTimer = useRef(null);

  // Fetch with current filters
  const doFetch = useCallback(async (overrides = {}) => {
    try {
      setIsLoading(true);
      const params = {
        search,
        status: filterStatus,
        zone: filterZone,
        type: filterType,
        sortBy,
        sortDir,
        ...overrides
      };
      await fetchTrains(params);
    } catch (err) {
      console.error("ERROR:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrains, search, filterStatus, filterZone, filterType, sortBy, sortDir]);

  const isFirstSearchRender = useRef(true);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doFetch({ search, page: 1 }), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Immediate filter changes (also fires on mount, which handles the initial fetch)
  useEffect(() => { doFetch({ status: filterStatus, zone: filterZone, type: filterType, sortBy, sortDir, page: 1 }); }, [filterStatus, filterZone, filterType, sortBy, sortDir]);

  // Stats for KPI row
  useEffect(() => { fetchTrainStats(); }, []);

  const goToPage = (p) => doFetch({ page: p });

  const handleSort = (col) => {
    const dir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(col); setSortDir(dir);
  };

  const SortIcon = ({ col }) => (
    <span className={`material-symbols-outlined text-[12px] ml-1 ${sortBy === col ? 'text-[#FF9933]' : 'text-zinc-700'}`}>
      {sortBy === col ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
    </span>
  );

  const handleSave = async () => {
    try {
      if (isEditMode) {
        await api.put(`/trains/${formData.id}`, { trainName: formData.trainName, route: formData.route, source: formData.source, destination: formData.destination, speed: formData.speed, status: formData.status, zone: formData.zone, trainType: formData.trainType });
        showToast({ title: 'Train Updated', message: `${formData.trainName} updated successfully.`, severity: 'info' }, 3000);
      } else {
        await api.post('/trains', { trainNumber: formData.trainNumber, trainName: formData.trainName, route: formData.route, source: formData.source, destination: formData.destination, speed: formData.speed, status: formData.status, zone: formData.zone, trainType: formData.trainType });
        showToast({ title: 'Train Registered', message: `${formData.trainNumber} — ${formData.trainName} added to fleet.`, severity: 'info' }, 3000);
      }
      setIsModalOpen(false);
      doFetch({ page: trainPagination.page });
      fetchTrainStats();
    } catch (err) {
      showToast({ title: 'Save Failed', message: err.response?.data?.message || err.message, severity: 'critical' }, 5000);
    }
  };

  const handleDelete = useCallback(async (train) => {
    const tId = train.rawId || train.id;
    const tNo = train.train_number || train.id;
    const tName = train.train_name || train.name || '—';
    if (!window.confirm(`Delete train ${tNo} — ${tName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/trains/${tId}`);
      showToast({ title: 'Train Deleted', message: `${tNo} removed from fleet.`, severity: 'info' }, 3000);
      doFetch({ page: trainPagination.page });
      fetchTrainStats();
    } catch (err) {
      showToast({ title: 'Delete Failed', message: err.response?.data?.message || err.message, severity: 'critical' }, 5000);
    }
  }, [doFetch, fetchTrainStats, showToast, trainPagination.page]);

  const openAdd = useCallback(() => { setIsEditMode(false); setFormData({ id: '', trainNumber: '', trainName: '', route: '', source: '', destination: '', speed: 0, status: 'scheduled', zone: 'Northern', trainType: 'Mail Express' }); setIsModalOpen(true); }, []);
  const openEdit = useCallback((t) => { setIsEditMode(true); setFormData({ id: t.rawId || t.id, trainNumber: t.train_number || t.id, trainName: t.train_name || t.name || '', route: t.route, source: t.source || '', destination: t.destination || '', speed: t.speed || 0, status: t.status?.toLowerCase() || 'running', zone: t.zone || 'Northern', trainType: t.train_type || t.trainType || 'Mail Express' }); setIsModalOpen(true); }, []);

  const { page, totalPages, total } = trainPagination;

  if (!Array.isArray(trains)) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Helmet>
        <title>Live Trains | Indian Railways AI</title>
        <meta name="description" content="Real-time live train tracking and status for Indian Railways." />
      </Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-white uppercase">Live Train Monitor</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mt-1">
            {total.toLocaleString()} trains across all zones · Indian Railways Network
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAdd}
          className="bg-gradient-to-r from-[#FF9933] to-[#ff7300] px-5 py-2.5 rounded-lg text-black font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(255,153,51,0.3)]">
          <span className="material-symbols-outlined text-sm">add</span> Register Train
        </motion.button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Trains', value: (analytics.totalTrains || total || 0).toLocaleString(), icon: 'train', color: 'text-white' },
          { label: 'Running', value: (analytics.activeTrains || 0).toLocaleString(), icon: 'check_circle', color: 'text-emerald-400' },
          { label: 'Delayed', value: (analytics.delayedTrains || 0).toLocaleString(), icon: 'schedule', color: 'text-red-400' },
          { label: 'Avg Delay', value: `${analytics.avgDelay || 0} min`, icon: 'timer', color: 'text-[#FF9933]' },
          { label: 'Avg Speed', value: `${analytics.avgSpeed || 0} km/h`, icon: 'speed', color: 'text-primary' },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <span className={`material-symbols-outlined ${k.color} text-xl`}>{k.icon}</span>
            <div>
              <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end overflow-visible">
        {/* Search */}
        <div className="flex-1 min-w-[200px] w-full sm:w-auto">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Search</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface/50 border border-white/10 rounded-lg pl-9 pr-4 h-10 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF9933]/50 outline-none"
              placeholder="Train no., name, route, station..." />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>}
          </div>
        </div>

        {/* Zone */}
        <div className="flex-1 sm:flex-none">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Zone</label>
          <select value={filterZone} onChange={e => setFilterZone(e.target.value)}
            className="bg-surface/50 border border-white/10 text-xs px-3 h-10 rounded-lg text-on-surface focus:ring-1 focus:ring-[#FF9933]/50 outline-none cursor-pointer min-w-[140px] w-full sm:w-auto">
            <option value="">All Zones</option>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        {/* Type */}
        <div className="flex-1 sm:flex-none">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-surface/50 border border-white/10 text-xs px-3 h-10 rounded-lg text-on-surface focus:ring-1 focus:ring-[#FF9933]/50 outline-none cursor-pointer min-w-[160px] w-full sm:w-auto">
            <option value="">All Types</option>
            {TRAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status */}
        <div className="flex-1 sm:flex-none">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-surface/50 border border-white/10 text-xs px-3 h-10 rounded-lg text-on-surface focus:ring-1 focus:ring-[#FF9933]/50 outline-none cursor-pointer min-w-[140px] w-full sm:w-auto">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {/* Clear */}
        {(search || filterZone || filterType || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterZone(''); setFilterType(''); setFilterStatus(''); }}
            className="w-full sm:w-auto self-start sm:self-end px-4 h-10 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-xl border border-white/5 overflow-hidden shadow-2xl">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FF9933]">format_list_bulleted</span>
            <h3 className="font-headline text-sm font-bold text-white uppercase tracking-widest">Live Fleet Register</h3>
            <span className="text-[10px] bg-[#FF9933]/10 text-[#FF9933] px-2 py-0.5 rounded-full font-black">
              {total.toLocaleString()} trains
            </span>
            {isLoading && <div className="w-4 h-4 border-2 border-[#FF9933]/30 border-t-[#FF9933] rounded-full animate-spin" />}
          </div>
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
            Page {page} of {totalPages.toLocaleString()} · IST {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            {/* Column headers */}
            <div className="bg-surface-container-lowest/50 flex items-center text-left text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
              <div className="px-4 py-3 flex-shrink-0 cursor-pointer hover:text-white transition-colors flex items-center" style={{ width: '120px' }} onClick={() => handleSort('train_number')}>
                Train No. <SortIcon col="train_number" />
              </div>
              <div className="px-4 py-3 flex-1 min-w-[180px] cursor-pointer hover:text-white transition-colors flex items-center" onClick={() => handleSort('train_name')}>
                Name <SortIcon col="train_name" />
              </div>
              <div className="px-4 py-3 flex-shrink-0" style={{ width: '140px' }}>Type</div>
              <div className="px-4 py-3 flex-shrink-0 cursor-pointer hover:text-white transition-colors flex items-center" style={{ width: '140px' }} onClick={() => handleSort('zone')}>
                Zone <SortIcon col="zone" />
              </div>
              <div className="px-4 py-3 flex-1 min-w-[140px]">Route</div>
              <div className="px-4 py-3 flex-1 min-w-[140px]">Current Station</div>
              <div className="px-4 py-3 flex-shrink-0 text-center cursor-pointer hover:text-white transition-colors flex items-center justify-center" style={{ width: '100px' }} onClick={() => handleSort('speed')}>
                Speed <SortIcon col="speed" />
              </div>
              <div className="px-4 py-3 flex-shrink-0 text-center cursor-pointer hover:text-white transition-colors flex items-center justify-center" style={{ width: '100px' }} onClick={() => handleSort('delay_minutes')}>
                Delay (AI) <SortIcon col="delay_minutes" />
              </div>
              <div className="px-4 py-3 flex-shrink-0 text-center" style={{ width: '100px' }}>Platform</div>
              <div className="px-4 py-3 flex-shrink-0 text-right cursor-pointer hover:text-white transition-colors flex items-center justify-end" style={{ width: '120px' }} onClick={() => handleSort('status')}>
                Status <SortIcon col="status" />
              </div>
              <div className="px-2 py-3 flex-shrink-0 text-center" style={{ width: '70px' }}>Actions</div>
            </div>

            {/* VirtualList replaces tbody */}
            <div style={{ height: '500px' }}>
              {isLoading && trains.length === 0 ? (
                <div className="flex flex-col">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex items-center border-b border-white/5 animate-pulse w-full" style={{ height: '52px' }}>
                      <div className="px-4 w-[120px] flex-shrink-0"><div className="w-16 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 flex-1 min-w-[180px]"><div className="w-32 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 w-[140px] flex-shrink-0"><div className="w-20 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 w-[140px] flex-shrink-0"><div className="w-24 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 flex-1 min-w-[140px]"><div className="w-24 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 flex-1 min-w-[140px]"><div className="w-24 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 w-[100px] flex justify-center"><div className="w-10 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 w-[100px] flex justify-center"><div className="w-12 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 w-[100px] flex justify-center"><div className="w-8 h-4 bg-white/10 rounded" /></div>
                      <div className="px-4 w-[120px] flex justify-end"><div className="w-16 h-4 bg-white/10 rounded" /></div>
                    </div>
                  ))}
                </div>
              ) : (
                Array.isArray(trains) && trains.length > 0 ? (
                  trains.map((train, idx) => (
                    <TrainRow key={train.rawId || train.id || idx} train={train} idx={idx} onEdit={openEdit} onDelete={handleDelete} />
                  ))
                ) : (
                  <div className="p-4 text-center text-zinc-500">No trains found</div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Showing {((page - 1) * LIMIT + 1).toLocaleString()}–{Math.min(page * LIMIT, total).toLocaleString()} of {total.toLocaleString()} trains
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => goToPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 text-xs transition-all">
                <span className="material-symbols-outlined text-sm">first_page</span>
              </button>
              <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 text-xs transition-all">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-all ${p === page ? 'bg-[#FF9933] text-black' : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'}`}>
                    {p}
                  </button>
                );
              })}

              <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 text-xs transition-all">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
              <button onClick={() => goToPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 text-xs transition-all">
                <span className="material-symbols-outlined text-sm">last_page</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Update Train' : 'Register New Train'}
        onSubmit={handleSave} submitText={isEditMode ? 'Save Changes' : 'Register Train'}>
        <div className="grid grid-cols-2 gap-4">
          {!isEditMode && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Train Number</label>
              <input required value={formData.trainNumber} onChange={e => setFormData({ ...formData, trainNumber: e.target.value })}
                className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none" placeholder="e.g. 12301" />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Train Name</label>
            <input required value={formData.trainName} onChange={e => setFormData({ ...formData, trainName: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none" placeholder="e.g. Howrah Rajdhani Express" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Train Type</label>
            <select value={formData.trainType} onChange={e => setFormData({ ...formData, trainType: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              {TRAIN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Zone</label>
            <select value={formData.zone} onChange={e => setFormData({ ...formData, zone: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Route</label>
            <input required value={formData.route} onChange={e => setFormData({ ...formData, route: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none" placeholder="e.g. HWH - NDLS" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Source</label>
            <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              <option value="">Select...</option>
              {STATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Destination</label>
            <select value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              <option value="">Select...</option>
              {STATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Status</label>
            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Speed (km/h)</label>
            <input type="number" value={formData.speed} onChange={e => setFormData({ ...formData, speed: parseInt(e.target.value) || 0 })}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none" min={0} max={250} />
          </div>
        </div>
      </Modal>
    </motion.div>
  );
});
