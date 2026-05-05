import React, { useState, useEffect, useCallback, useRef } from 'react';
import StatCard from '../components/StatCard';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import IndiaRailwayMap, { STATIONS } from '../components/IndiaRailwayMap';

const iv = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } } };
const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };

// ── Zone → code map ───────────────────────────────────────────────────────────
const ZONE_CODES = {
  'Northern':'NR','North Eastern':'NER','North Western':'NWR','North Central':'NCR',
  'Eastern':'ER','East Central':'ECR','East Coast':'ECoR',
  'Western':'WR','West Central':'WCR',
  'Southern':'SR','South Central':'SCR','South Eastern':'SER',
  'South East Central':'SECR','South Western':'SWR','Central':'CR',
};

const ALL_ZONES = Object.keys(ZONE_CODES);

// Roles that are locked to their station
const STATION_LOCKED = new Set(['station_master', 'dispatcher']);
// Roles that are locked to their zone
const ZONE_LOCKED    = new Set(['zone_admin']);
// Roles that can switch freely
const CAN_SWITCH     = new Set(['admin', 'national_controller', 'traffic_controller', 'engineer', 'analyst', 'viewer']);

// ── Free Platforms Modal ──────────────────────────────────────────────────────
function FreePlatformsModal({ platforms, onClose }) {
  const navigate = useNavigate();
  const free = platforms.filter(p => p.status === 'Free');
  const byStation = free.reduce((acc, p) => {
    const key = p.station || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
          exit={{ opacity:0, scale:0.95, y:20 }} transition={{ duration:0.2 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400 text-base">meeting_room</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Free Platforms</h3>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">{free.length} available · press Esc to close</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
            {free.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-zinc-700 block mb-2">do_not_disturb</span>
                <p className="text-zinc-500 text-sm">No free platforms at the moment</p>
              </div>
            ) : Object.entries(byStation).map(([station, pfs]) => (
              <div key={station}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-sm text-[#FF9933]">location_on</span>
                  <span className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest">{station}</span>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[9px] text-zinc-600">{pfs.length} free</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {pfs.map((p, i) => (
                    <motion.div key={p.rawId || i} whileHover={{ scale:1.03 }}
                      className="bg-surface-container-low border border-emerald-500/20 rounded-lg p-2.5 cursor-pointer group"
                      onClick={() => { navigate('/platforms'); onClose(); }}>
                      <div className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">{p.id}</div>
                      <div className="text-[8px] text-zinc-500 uppercase tracking-wider">{p.station?.split(' ')[0]}</div>
                      {p.demand > 0 && (
                        <div className="mt-1.5 w-full bg-white/5 rounded-full h-0.5 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500/60" style={{ width:`${p.demand}%` }} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Click any platform to manage</span>
            <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={() => { navigate('/platforms'); onClose(); }}
              className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all">
              <span className="material-symbols-outlined text-sm">open_in_new</span>View All
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default React.memo(function Dashboard() {
  const { alerts, analytics, platforms, user, sidebarOpen, lastUpdatedAt } = useStore(useShallow(s => ({
    alerts: s.alerts,
    analytics: s.analytics,
    platforms: s.platforms,
    user: s.user,
    sidebarOpen: s.sidebarOpen,
    lastUpdatedAt: s.lastUpdatedAt
  })));
  const navigate = useNavigate();

  const [showFreePlatforms, setShowFreePlatforms] = useState(false);
  const [zoneStats,    setZoneStats]    = useState([]);
  const [liveTrains,   setLiveTrains]   = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  // ── Map filter state ─────────────────────────────────────────────────────────
  // Determine initial mode and lock based on role
  const isStationLocked = STATION_LOCKED.has(user?.role);
  const isZoneLocked    = ZONE_LOCKED.has(user?.role);
  const canSwitch       = CAN_SWITCH.has(user?.role) || !user;

  const defaultMode    = isStationLocked ? 'station' : isZoneLocked ? 'zone' : 'all';
  const defaultStation = isStationLocked ? (user?.assignedStation || '') : '';
  const defaultZone    = isZoneLocked    ? (user?.assignedZone    || '') : '';

  const [mapMode,        setMapMode]        = useState(defaultMode);
  const [mapStation,     setMapStation]     = useState(defaultStation);
  const [mapZone,        setMapZone]        = useState(defaultZone);
  const [mapTrainSearch, setMapTrainSearch] = useState('');
  const [mapTrainInput,  setMapTrainInput]  = useState('');
  const trainSearchTimer = useRef(null);

  // Sorted station list for dropdown
  const stationList = Object.values(STATIONS)
    .map(s => s.name)
    .sort((a, b) => a.localeCompare(b));

  // Always start with modal closed
  useEffect(() => { setShowFreePlatforms(false); }, []);

  // ── Zone stats from dedicated endpoint ──────────────────────────────────────
  useEffect(() => {
    setZonesLoading(true);
    api.get('/analytics/zones')
      .then(r => { setZoneStats(r.data || []); })
      .catch(() => {})
      .finally(() => setZonesLoading(false));
  }, []);

  // ── Live trains for map — filtered by current mode ───────────────────────────
  const loadMapTrains = useCallback(() => {
    let url = '/trains?sortBy=speed&sortDir=desc';

    if (mapMode === 'station' && mapStation) {
      // Station mode: trains whose source, destination, or current_location matches
      url += `&search=${encodeURIComponent(mapStation)}&limit=100`;
    } else if (mapMode === 'zone' && mapZone) {
      url += `&zone=${encodeURIComponent(mapZone)}&limit=150`;
    } else if (mapMode === 'train' && mapTrainSearch) {
      url += `&search=${encodeURIComponent(mapTrainSearch)}&limit=20`;
    } else {
      // All India — cap at 200 for performance
      url += '&limit=200';
    }

    api.get(url).then(r => setLiveTrains(r.data.data || [])).catch(() => {});
  }, [mapMode, mapStation, mapZone, mapTrainSearch]);

  useEffect(() => {
    loadMapTrains();
    const id = setInterval(loadMapTrains, 30000);
    return () => clearInterval(id);
  }, [loadMapTrains]);

  // ── Derived KPIs ─────────────────────────────────────────────────────────────
  const runningTrains  = analytics.activeTrains  || 0;
  const delayedTrains  = analytics.delayedTrains || 0;
  const totalTrains    = analytics.totalTrains   || 0;
  const criticalAlerts = alerts.filter(a => a.active).length;
  const freePlatforms  = platforms.filter(p => p.status === 'Free').length;
  const onTime         = analytics?.onTimeRate ?? 0;
  const avgDelay       = analytics?.avgDelay   ?? 0;
  const avgSpeed       = analytics?.avgSpeed   ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <motion.div initial="hidden" animate="visible" variants={cv} className="space-y-5">

      {/* ── Page header ── */}
      <motion.div variants={iv} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-white uppercase tracking-tight">Command Center</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mt-0.5">
            Indian Railways · National Network Overview
            {user?.fullName && <span className="text-zinc-600"> · {user.fullName}</span>}
          </p>
        </div>
        {lastUpdatedAt && (
          <span className="text-[9px] text-zinc-600 uppercase tracking-widest hidden md:block">
            Updated {new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </span>
        )}
      </motion.div>

      {/* ── KPI Row — 6 cards, equal height, no overflow ── */}
      <motion.div variants={cv} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Running */}
        <motion.div variants={iv} className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-lg hover:bg-surface-container transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Running</span>
            <span className="material-symbols-outlined text-primary text-lg">train</span>
          </div>
          <div className="text-2xl font-black text-white">{runningTrains.toLocaleString() || '—'}</div>
          <div className="text-[9px] text-zinc-600">of {totalTrains.toLocaleString()} total</div>
        </motion.div>

        {/* Delayed */}
        <motion.div variants={iv} className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-lg hover:bg-surface-container transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Delayed</span>
            <span className="material-symbols-outlined text-red-400 text-lg">schedule</span>
          </div>
          <div className="text-2xl font-black text-red-400">{delayedTrains.toLocaleString() || '—'}</div>
          <div className="text-[9px] text-zinc-600">avg {avgDelay} min late</div>
        </motion.div>

        {/* Free Platforms — clickable */}
        <motion.div variants={iv}
          onClick={() => setShowFreePlatforms(true)}
          whileHover={{ y: -3, scale: 1.02 }}
          className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-lg cursor-pointer group hover:border-emerald-500/30 hover:bg-surface-container transition-all select-none">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Free Platforms</span>
            <span className="material-symbols-outlined text-emerald-400 text-lg group-hover:scale-110 transition-transform">meeting_room</span>
          </div>
          <div className="text-2xl font-black text-white">{freePlatforms}</div>
          <div className="text-[9px] text-emerald-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">touch_app</span>Click to view
          </div>
        </motion.div>

        {/* Active Alerts */}
        <motion.div variants={iv}
          onClick={() => navigate('/alerts')}
          whileHover={{ y: -3, scale: 1.02 }}
          className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-lg cursor-pointer hover:border-[#FF9933]/30 hover:bg-surface-container transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Alerts</span>
            <span className="material-symbols-outlined text-[#FF9933] text-lg">priority_high</span>
          </div>
          <div className="text-2xl font-black text-white">{criticalAlerts}</div>
          <div className="text-[9px] text-zinc-600">active incidents</div>
        </motion.div>

        {/* Avg Speed */}
        <motion.div variants={iv} className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-lg hover:bg-surface-container transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Avg Speed</span>
            <span className="material-symbols-outlined text-primary text-lg">speed</span>
          </div>
          <div className="text-2xl font-black text-primary">{avgSpeed}</div>
          <div className="text-[9px] text-zinc-600">km/h network avg</div>
        </motion.div>

        {/* Punctuality donut */}
        <motion.div variants={iv} className="bg-surface-container-low border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-lg hover:bg-surface-container transition-colors">
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <motion.circle cx="28" cy="28" r="22" fill="none" stroke="#FF9933" strokeWidth="4"
                strokeLinecap="round" strokeDasharray="138.2"
                initial={{ strokeDashoffset: 138.2 }}
                animate={{ strokeDashoffset: 138.2 - (138.2 * onTime / 100) }}
                transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.4 }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">{Math.round(onTime)}%</div>
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">Punctuality</div>
        </motion.div>
      </motion.div>

      {/* ── Map + AI Panel ── */}
      <motion.div variants={iv} className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Map — explicit height so Leaflet can measure */}
        <div className={`lg:col-span-8 bg-surface-container-low rounded-xl overflow-hidden shadow-2xl border border-white/5 map-container ${sidebarOpen ? 'disabled' : ''}`} style={{ height: '460px' }}>

          {/* ── Map Toolbar ── */}
          <div className="absolute top-0 left-0 right-0 z-[1001] flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-md border-b border-white/5 flex-wrap">

            {/* Mode selector — only for roles that can switch */}
            {canSwitch && (
              <select
                value={mapMode}
                onChange={e => { setMapMode(e.target.value); setMapStation(''); setMapZone(''); setMapTrainSearch(''); setMapTrainInput(''); }}
                className="bg-[#1a1a1a] border border-white/10 text-[10px] font-bold text-white px-2 py-1 rounded-lg outline-none focus:border-[#FF9933]/50 uppercase tracking-widest cursor-pointer"
              >
                <option value="all">🌐 All India</option>
                <option value="station">📍 Station</option>
                <option value="zone">🗺 Zone</option>
                <option value="train">🚂 Track Train</option>
              </select>
            )}

            {/* Station selector */}
            {mapMode === 'station' && (
              <select
                value={mapStation}
                onChange={e => setMapStation(e.target.value)}
                disabled={isStationLocked}
                className="bg-[#1a1a1a] border border-white/10 text-[10px] text-white px-2 py-1 rounded-lg outline-none focus:border-[#FF9933]/50 cursor-pointer min-w-[160px] disabled:opacity-60"
              >
                <option value="">Select Station…</option>
                {stationList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {/* Zone selector */}
            {mapMode === 'zone' && (
              <select
                value={mapZone}
                onChange={e => setMapZone(e.target.value)}
                disabled={isZoneLocked}
                className="bg-[#1a1a1a] border border-white/10 text-[10px] text-white px-2 py-1 rounded-lg outline-none focus:border-[#FF9933]/50 cursor-pointer min-w-[140px] disabled:opacity-60"
              >
                <option value="">Select Zone…</option>
                {ALL_ZONES.map(z => <option key={z} value={z}>{ZONE_CODES[z]} — {z}</option>)}
              </select>
            )}

            {/* Train number search */}
            {mapMode === 'train' && (
              <div className="flex items-center gap-1">
                <input
                  value={mapTrainInput}
                  onChange={e => {
                    setMapTrainInput(e.target.value);
                    clearTimeout(trainSearchTimer.current);
                    trainSearchTimer.current = setTimeout(() => setMapTrainSearch(e.target.value), 500);
                  }}
                  placeholder="Train no. or name…"
                  className="bg-[#1a1a1a] border border-white/10 text-[10px] text-white px-2 py-1 rounded-lg outline-none focus:border-[#FF9933]/50 w-36"
                />
              </div>
            )}

            {/* Reset button */}
            {canSwitch && mapMode !== 'all' && (
              <button
                onClick={() => { setMapMode('all'); setMapStation(''); setMapZone(''); setMapTrainSearch(''); setMapTrainInput(''); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-[#FF9933] hover:border-[#FF9933]/30 text-[9px] font-bold uppercase tracking-widest transition-all"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Reset
              </button>
            )}

            {/* Role badge */}
            <div className="ml-auto flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
              <span className="material-symbols-outlined text-[#FF9933] text-sm">
                {isStationLocked ? 'location_on' : isZoneLocked ? 'map' : 'public'}
              </span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                {isStationLocked ? mapStation || 'Station' : isZoneLocked ? mapZone || 'Zone' : 'National'}
              </span>
            </div>
          </div>

          {/* Map KPI overlay */}
          <div className="absolute top-12 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
            {[
              { label: 'Shown',    value: liveTrains.length.toString(),                                    color: 'text-white'       },
              { label: 'Live',     value: runningTrains.toLocaleString(),                                  color: 'text-emerald-400' },
              { label: 'Delayed',  value: liveTrains.filter(t => t.delay_minutes > 0).length.toString(),  color: 'text-red-400'     },
            ].map(k => (
              <div key={k.label} className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center justify-between gap-4 min-w-[120px]">
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest">{k.label}</span>
                <span className={`text-sm font-black ${k.color}`}>{k.value}</span>
              </div>
            ))}
          </div>

          <IndiaRailwayMap
            liveTrains={liveTrains}
            filterMode={mapMode}
            filterStation={mapStation}
            filterZone={mapZone}
            filterTrain={mapTrainSearch}
          />
        </div>

        {/* AI Advisor */}
        <div className="lg:col-span-4" style={{ height: '460px' }}>
          <div className="bg-surface-container border border-white/5 rounded-xl p-5 h-full flex flex-col shadow-xl">
            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 5 }}
                className="p-2 bg-[#FF9933]/10 rounded-lg flex-shrink-0">
                <span className="material-symbols-outlined text-[#FF9933]" style={{ fontVariationSettings:"'FILL' 1" }}>psychology</span>
              </motion.div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">AI Traffic Advisor</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Live Incidents · Action Required</p>
              </div>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 min-h-0">
              {alerts.filter(a => a.active).slice(0, 5).length > 0
                ? alerts.filter(a => a.active).slice(0, 5).map((alert, i) => (
                  <motion.div key={alert.id} whileHover={{ x: 3 }}
                    className={`p-3 bg-surface-container-highest rounded-lg border-l-2 ${i === 0 ? 'border-[#FF9933]' : alert.type === 'Critical' ? 'border-red-500/50' : 'border-white/10'} cursor-pointer`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white truncate leading-tight">{alert.title}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black shrink-0 ml-2 ${alert.type === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-[#FF9933]/20 text-[#FF9933]'}`}>
                        {alert.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">{alert.message}</p>
                  </motion.div>
                ))
                : (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-emerald-500/40 mb-2">check_circle</span>
                    <p className="text-xs text-zinc-500">All systems nominal</p>
                  </div>
                )
              }
            </div>
            <button onClick={() => navigate('/alerts')}
              className="mt-3 w-full py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#FF9933] hover:border-[#FF9933]/30 transition-all flex-shrink-0">
              View All Alerts
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom Row: All Zones + Alert Feed ── */}
      <motion.div variants={iv} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Zone-wise Activity — all 15 zones */}
        <div className="bg-surface-container-low p-5 rounded-xl border border-white/5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Zone-wise Activity</h3>
            <div className="flex items-center gap-3 text-[9px] text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#138808]" />≥90%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF9933]" />≥75%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />&lt;75%</span>
            </div>
          </div>

          {zonesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-10 h-3 bg-white/5 rounded" />
                  <div className="flex-1 bg-surface-container-high rounded-full h-2" />
                  <div className="w-8 h-3 bg-white/5 rounded" />
                  <div className="w-12 h-3 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : zoneStats.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">No zone data available</p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {zoneStats.map((z, i) => {
                const code = ZONE_CODES[z.zone] || z.zone.slice(0,3).toUpperCase();
                const barColor = z.pct >= 90 ? '#138808' : z.pct >= 75 ? '#FF9933' : '#f87171';
                return (
                  <div key={z.zone} className="flex items-center gap-2 group">
                    {/* Zone code */}
                    <span className="text-[9px] font-black text-[#FF9933] w-10 text-right flex-shrink-0">{code}</span>
                    {/* Bar */}
                    <div className="flex-1 bg-surface-container-high rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${z.pct}%` }}
                        transition={{ duration: 0.9, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: barColor }}
                      />
                    </div>
                    {/* Pct */}
                    <span className="text-[9px] font-bold text-white w-8 text-right flex-shrink-0">{z.pct}%</span>
                    {/* Train count */}
                    <span className="text-[9px] text-zinc-600 w-14 text-right flex-shrink-0 hidden sm:block">
                      {z.total.toLocaleString()} trains
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Alert Feed */}
        <div className="bg-surface-container-low p-5 rounded-xl border border-white/5 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Live Alert Feed</h3>
            <button onClick={() => navigate('/alerts')}
              className="text-[10px] font-bold text-[#FF9933] uppercase border-b border-[#FF9933]/20 hover:text-white transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">
            {alerts.slice(0, 6).map((alert, idx) => (
              <motion.div key={alert.id || idx} whileHover={{ x: 3 }}
                className={`flex gap-3 items-start ${idx < 5 ? 'pb-2.5 border-b border-white/5' : ''}`}>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  alert.type === 'Critical' ? 'bg-red-500/10' : alert.type === 'Warning' ? 'bg-[#FF9933]/10' : 'bg-primary/10'
                }`}>
                  <span className={`material-symbols-outlined text-sm ${
                    alert.type === 'Critical' ? 'text-red-400' : alert.type === 'Warning' ? 'text-[#FF9933]' : 'text-primary'
                  }`}>
                    {alert.type === 'Critical' ? 'bolt' : alert.type === 'Warning' ? 'warning_amber' : 'info'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] font-bold text-white mb-0.5">
                    <span className="uppercase truncate">{alert.title || `${alert.type} Alert`}</span>
                    <span className="text-zinc-600 font-normal shrink-0 ml-2">{alert.timestamp}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">{alert.message}</p>
                </div>
              </motion.div>
            ))}
            {alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <span className="material-symbols-outlined text-2xl text-emerald-500/30 block mb-2">notifications_off</span>
                <p className="text-xs text-zinc-600">No active alerts</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Free Platforms Modal */}
      {showFreePlatforms && (
        <FreePlatformsModal platforms={platforms} onClose={() => setShowFreePlatforms(false)} />
      )}
    </motion.div>
  );
});
