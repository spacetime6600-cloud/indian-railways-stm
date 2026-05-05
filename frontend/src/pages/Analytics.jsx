import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import api from '../utils/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};
const pathVariants = {
  hidden:  { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 2, ease: 'easeInOut' } },
};

// ── AI Insight Card ───────────────────────────────────────────────────────────
function AIInsightCard({ title, icon, value, sub, color, loading, xai }) {
  return (
    <div className="bg-[#201f1f]/60 border border-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
        <span className={`material-symbols-outlined text-lg ${color}`}>{icon}</span>
      </div>
      {loading ? (
        <div className="h-7 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className={`text-xl font-black ${color}`}>{value ?? '—'}</div>
      )}
      <div className="text-[9px] text-zinc-600">{sub}</div>
      {xai?.top_features?.length > 0 && (
        <div className="mt-1 space-y-1">
          {xai.top_features.slice(0, 2).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-[#FF9933]/60 rounded-full" style={{ width: `${Math.min(100, f.importance * 100)}%` }} />
              </div>
              <span className="text-[8px] text-zinc-600 w-16 truncate">{f.feature}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(function Analytics() {
  const { analytics, fetchAnalytics, fetchTrainStats } = useStore(useShallow(s => ({
    analytics: s.analytics,
    fetchAnalytics: s.fetchAnalytics,
    fetchTrainStats: s.fetchTrainStats
  })));
  const [overview,   setOverview]   = useState(null);
  const [perfData,   setPerfData]   = useState([]);
  const [topTrains,  setTopTrains]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // AI predictions state
  const [aiSnapshot,    setAiSnapshot]    = useState(null);
  const [aiLoading,     setAiLoading]     = useState(true);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/analytics/overview'),
      api.get('/analytics/performance'),
      api.get('/trains?limit=4&sortBy=delay_minutes&sortDir=desc'),
    ]).then(([ovRes, perfRes, trainRes]) => {
      if (ovRes.status === 'fulfilled')    setOverview(ovRes.value.data);
      if (perfRes.status === 'fulfilled')  setPerfData(perfRes.value.data);
      if (trainRes.status === 'fulfilled') setTopTrains(trainRes.value.data.data || []);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Fetch AI network snapshot
  useEffect(() => {
    setAiLoading(true);
    api.get('/ai/network-snapshot')
      .then(r => { setAiSnapshot(r.data); setAiUnavailable(false); })
      .catch(() => setAiUnavailable(true))
      .finally(() => setAiLoading(false));
  }, []);

  const ov = overview || analytics;
  const totalTrains   = ov?.totalTrains   ?? ov?.total_trains   ?? 0;
  const activeTrains  = ov?.activeTrains  ?? ov?.active_trains  ?? 0;
  const delayedTrains = ov?.delayedTrains ?? ov?.delayed_trains ?? 0;
  const onTimeRate    = ov?.onTimeRate    ?? ov?.on_time_rate   ?? 0;
  const avgDelay      = ov?.avgDelay      ?? ov?.avg_delay      ?? 0;
  const avgSpeed      = ov?.avgSpeed      ?? ov?.avg_speed      ?? 0;
  const activeAlerts  = ov?.activeAlerts  ?? ov?.active_alerts  ?? 0;

  // Build weekly bars from performance data (up to 4 weeks)
  const weekBars = perfData.slice(0, 4).map(d => ({
    target: 90,
    actual: Math.round(parseFloat(d.on_time_rate) || 0),
  }));
  while (weekBars.length < 4) weekBars.push({ target: 90, actual: 0 });

  const statusStyle = (s) => {
    switch (s?.toLowerCase()) {
      case 'running':   return { color: 'secondary', label: 'Running' };
      case 'delayed':   return { color: 'error',     label: 'Delayed' };
      case 'halted':    return { color: 'tertiary',  label: 'Halted'  };
      default:          return { color: 'primary',   label: s || '—'  };
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-label text-[0.6875rem] uppercase tracking-widest text-[#FF9933] mb-2">Insight Module · Indian Railways</p>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface drop-shadow-[0_0_10px_rgba(255,153,51,0.3)]">Zone Analytics Overview</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { fetchAnalytics(); fetchTrainStats(); }}
          className="bg-surface-container-high/40 border border-white/10 text-on-surface font-body font-medium py-2.5 px-6 rounded-lg flex items-center justify-center space-x-2 hover:border-primary/40 hover:bg-surface-container-high transition-all shadow-xl"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          <span className="text-xs font-bold uppercase tracking-widest">Refresh Data</span>
        </motion.button>
      </motion.div>

      {/* KPI Strip */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trains',   value: totalTrains.toLocaleString(),   icon: 'train',        color: 'text-white' },
          { label: 'Running',        value: activeTrains.toLocaleString(),   icon: 'check_circle', color: 'text-emerald-400' },
          { label: 'Delayed',        value: delayedTrains.toLocaleString(),  icon: 'schedule',     color: 'text-red-400' },
          { label: 'Active Alerts',  value: activeAlerts.toLocaleString(),   icon: 'warning',      color: 'text-[#FF9933]' },
        ].map(k => (
          <div key={k.label} className="bg-[#201f1f]/60 border border-white/5 rounded-xl p-5 flex items-center gap-3">
            <span className={`material-symbols-outlined ${k.color} text-2xl`}>{k.icon}</span>
            <div>
              <div className={`text-2xl font-black ${k.color}`}>{loading ? '—' : k.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">{k.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── AI Predictions Panel ── */}
      <motion.div variants={itemVariants} className="bg-[#201f1f]/60 border border-white/5 rounded-xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF9933]/10 rounded-lg">
              <span className="material-symbols-outlined text-[#FF9933]" style={{ fontVariationSettings:"'FILL' 1" }}>psychology</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Network Intelligence</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {aiUnavailable
                  ? 'ML service offline — start with: uvicorn api.main:app --port 8000'
                  : aiLoading ? 'Running predictions…'
                  : `Snapshot at ${aiSnapshot?.timestamp ? new Date(aiSnapshot.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}`
                }
              </p>
            </div>
          </div>
          {aiUnavailable && (
            <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg font-bold uppercase tracking-widest">
              ML Offline
            </span>
          )}
          {!aiUnavailable && !aiLoading && (
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />ML Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AIInsightCard
            title="Predicted Delay"
            icon="schedule"
            value={aiSnapshot?.delay?.delay_minutes != null ? `${aiSnapshot.delay.delay_minutes.toFixed(1)} min` : aiUnavailable ? 'Offline' : null}
            sub="Network avg delay forecast"
            color={aiSnapshot?.delay?.delay_minutes > 15 ? 'text-red-400' : 'text-emerald-400'}
            loading={aiLoading}
            xai={aiSnapshot?.delay?.xai}
          />
          <AIInsightCard
            title="Congestion Level"
            icon="traffic"
            value={aiSnapshot?.congestion?.congestion_level ?? (aiUnavailable ? 'Offline' : null)}
            sub="Current network congestion"
            color={aiSnapshot?.congestion?.congestion_level === 'High' ? 'text-red-400' : aiSnapshot?.congestion?.congestion_level === 'Medium' ? 'text-[#FF9933]' : 'text-emerald-400'}
            loading={aiLoading}
            xai={aiSnapshot?.congestion?.xai}
          />
          <AIInsightCard
            title="Alert Priority"
            icon="priority_high"
            value={aiSnapshot?.alert?.priority ?? (aiUnavailable ? 'Offline' : null)}
            sub="Current alert severity level"
            color={aiSnapshot?.alert?.priority === 'Critical' ? 'text-red-400' : aiSnapshot?.alert?.priority === 'High' ? 'text-[#FF9933]' : 'text-emerald-400'}
            loading={aiLoading}
            xai={aiSnapshot?.alert?.xai}
          />
          <AIInsightCard
            title="Maintenance Risk"
            icon="build"
            value={aiSnapshot?.maintenance?.risk_score != null ? `${aiSnapshot.maintenance.risk_score.toFixed(0)}/100` : aiUnavailable ? 'Offline' : null}
            sub={aiSnapshot?.maintenance?.status ?? 'Fleet health score'}
            color={aiSnapshot?.maintenance?.status === 'Critical' ? 'text-red-400' : aiSnapshot?.maintenance?.status === 'Warning' ? 'text-[#FF9933]' : 'text-emerald-400'}
            loading={aiLoading}
            xai={aiSnapshot?.maintenance?.xai}
          />
        </div>
      </motion.div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* On-Time Rate Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#201f1f]/60 backdrop-blur-[20px] rounded-xl p-6 relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-headline text-lg font-semibold text-on-surface">Network Performance</h3>
              <p className="font-label text-xs text-on-surface-variant mt-1">On-time rate · Avg delay · Avg speed</p>
            </div>
            <span className="material-symbols-outlined text-primary opacity-50">trending_up</span>
          </div>
          <div className="h-64 w-full flex items-end justify-between space-x-2 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent bottom-0 h-3/4 rounded-b-lg" />
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <motion.path variants={pathVariants}
                d={`M0,${100 - onTimeRate} Q25,${100 - onTimeRate * 0.9} 50,${100 - onTimeRate * 0.95} T100,${100 - onTimeRate}`}
                fill="rgba(174,198,255,0.05)" />
              <motion.path variants={pathVariants}
                d={`M0,${100 - onTimeRate} Q25,${100 - onTimeRate * 0.9} 50,${100 - onTimeRate * 0.95} T100,${100 - onTimeRate}`}
                fill="none" stroke="#00f1fe" strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 4px rgba(0,241,254,0.5))' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-between opacity-5 pointer-events-none">
              {[...Array(5)].map((_, i) => <div key={i} className="border-t border-white w-full h-0" />)}
            </div>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
            {[
              { label: 'On-Time Rate', value: `${onTimeRate}%`,      color: 'text-emerald-400' },
              { label: 'Avg Delay',    value: `${avgDelay} min`,     color: 'text-[#FF9933]'  },
              { label: 'Avg Speed',    value: `${avgSpeed} km/h`,    color: 'text-primary'    },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-xl font-black ${s.color}`}>{loading ? '—' : s.value}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Monthly Punctuality */}
        <motion.div variants={itemVariants} className="bg-[#201f1f]/60 backdrop-blur-[20px] rounded-xl p-6 flex flex-col border border-white/5 shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-headline text-lg font-semibold text-on-surface">Weekly Punctuality</h3>
              <p className="font-label text-xs text-on-surface-variant mt-1">Target (90%) vs Actual</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(0,241,254,0.8)]" />
              <span className="font-label text-[0.6rem] uppercase tracking-wider text-secondary font-black">Live</span>
            </div>
          </div>
          <div className="flex-1 flex items-end justify-around pb-2">
            {weekBars.map((w, i) => (
              <div key={i} className="flex space-x-1 items-end h-full">
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${w.target}%` }}
                  transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                  className="w-4 bg-white/5 rounded-t-sm relative group"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-on-surface-variant uppercase">{w.target}%</div>
                </motion.div>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${w.actual}%` }}
                  transition={{ duration: 1, delay: 0.7 + i * 0.1 }}
                  className="w-4 bg-gradient-to-t from-primary to-primary-container rounded-t-sm shadow-[0_0_15px_rgba(79,142,255,0.2)]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-around text-[8px] font-bold text-on-surface-variant border-t border-white/5 pt-3 mt-2 uppercase tracking-widest">
            <span>WK1</span><span>WK2</span><span>WK3</span><span>WK4</span>
          </div>
        </motion.div>

        {/* Route Efficiency */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#201f1f]/60 backdrop-blur-[20px] rounded-xl p-6 flex flex-col md:flex-row items-center gap-8 border border-white/5 shadow-2xl">
          <div className="flex-1 w-full">
            <div className="mb-6">
              <h3 className="font-headline text-lg font-semibold text-on-surface">Network Efficiency Matrix</h3>
              <p className="font-label text-xs text-on-surface-variant mt-1">Multi-vector performance index</p>
            </div>
            <div className="space-y-5">
              {[
                { label: 'On-Time Performance', val: Math.min(100, onTimeRate),                                    color: 'bg-secondary' },
                { label: 'Fleet Utilisation',   val: totalTrains > 0 ? Math.round((activeTrains / totalTrains) * 100) : 0, color: 'bg-primary' },
                { label: 'Delay Exposure',       val: totalTrains > 0 ? Math.round((delayedTrains / totalTrains) * 100) : 0, color: 'bg-tertiary' },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5">
                    <span className="text-on-surface-variant">{m.label}</span>
                    <span className={`${m.color.replace('bg-', 'text-')} font-mono`}>{loading ? '—' : `${m.val}%`}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${m.val}%` }}
                      transition={{ duration: 1.5, delay: 1 + i * 0.2, ease: 'easeOut' }}
                      className={`h-full ${m.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Radar */}
          <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center group">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border border-white/5 rounded-full" />
            <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
              <polygon fill="none" points="50,5 95,25 95,75 50,95 5,75 5,25" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <polygon fill="none" points="50,20 80,35 80,65 50,80 20,65 20,35" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <motion.polygon
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                fill="rgba(0,241,254,0.1)"
                points="50,15 85,30 70,65 50,85 25,60 15,35"
                stroke="#00f1fe" strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,241,254,0.4))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Efficiency</span>
              <span className="font-headline text-xl text-secondary font-black drop-shadow-[0_0_8px_rgba(0,241,254,0.5)]">
                {loading ? '—' : `${onTimeRate}`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Summary card */}
        <motion.div variants={itemVariants} className="bg-[#201f1f]/60 backdrop-blur-[20px] rounded-xl p-6 border border-white/5 shadow-2xl flex flex-col gap-4">
          <h3 className="font-headline text-lg font-semibold text-on-surface">Network Summary</h3>
          {[
            { label: 'Total Trains',    value: totalTrains.toLocaleString(),   icon: 'train' },
            { label: 'Running Now',     value: activeTrains.toLocaleString(),  icon: 'check_circle' },
            { label: 'Delayed',         value: delayedTrains.toLocaleString(), icon: 'schedule' },
            { label: 'Active Alerts',   value: activeAlerts.toLocaleString(),  icon: 'warning' },
            { label: 'Avg Speed',       value: `${avgSpeed} km/h`,             icon: 'speed' },
            { label: 'Avg Delay',       value: `${avgDelay} min`,              icon: 'timer' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF9933] text-sm">{s.icon}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-400">{s.label}</span>
              </div>
              <span className="text-sm font-black text-white">{loading ? '—' : s.value}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Live Train Performance Table */}
      <motion.div variants={itemVariants} className="bg-[#201f1f]/60 backdrop-blur-[20px] rounded-xl mt-8 overflow-hidden border border-white/5 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
          <h3 className="font-headline text-lg font-semibold text-on-surface">Live Train Performance</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Top delayed trains</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                <th className="py-4 px-8">Train</th>
                <th className="py-4 px-8">Route</th>
                <th className="py-4 px-8">Delay</th>
                <th className="py-4 px-8">Speed</th>
                <th className="py-4 px-8 text-right">Status</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} className="text-sm font-label text-on-surface divide-y divide-white/5">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-4 px-8"><div className="h-3 bg-white/5 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
                : topTrains.length > 0
                  ? topTrains.map((t, i) => {
                    const st = statusStyle(t.status);
                    return (
                      <motion.tr key={t.id || i} variants={itemVariants}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)', x: 4 }}
                        className="transition-colors group cursor-pointer"
                      >
                        <td className="py-4 px-8 font-headline font-bold text-primary">{t.train_number}</td>
                        <td className="py-4 px-8 text-on-surface-variant text-xs">{t.source} → {t.destination}</td>
                        <td className="py-4 px-8 font-mono text-[#FF9933] font-bold">
                          {t.delay_minutes > 0 ? `+${t.delay_minutes}m` : '—'}
                        </td>
                        <td className="py-4 px-8 font-mono text-on-surface-variant">{t.speed} km/h</td>
                        <td className="py-4 px-8 text-right">
                          <div className={`inline-flex items-center space-x-2 bg-${st.color}/10 px-3 py-1 rounded-full border border-${st.color}/20`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-${st.color}`} />
                            <span className={`text-[0.65rem] font-black text-${st.color} uppercase tracking-widest`}>{st.label}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                  : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-zinc-500 text-sm">No train data available</td>
                    </tr>
                  )
              }
            </motion.tbody>
          </table>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm text-center">
          Failed to load analytics: {error}
        </div>
      )}
    </motion.div>
  );
});
