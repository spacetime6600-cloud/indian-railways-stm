import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import api from '../utils/api';
import { useToast } from '../components/ToastProvider';
import { Helmet } from 'react-helmet-async';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Maintenance() {
  const { maintenance, fetchMaintenance } = useStore();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode,  setIsEditMode]  = useState(false);
  const [formData,    setFormData]    = useState({ id: '', assetType: '', assetId: '', condition: 'good', riskLevel: 'low', nextServiceDate: '', notes: '', status: 'scheduled' });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setIsEditMode(false);
    setFormData({ id: '', assetType: '', assetId: '', condition: 'good', riskLevel: 'low', nextServiceDate: '', notes: '', status: 'scheduled' });
    setIsModalOpen(true);
  };
  const openEdit = (row) => {
    setIsEditMode(true);
    setFormData({
      id: row.id, assetType: row.asset?.split(' · ')[0]?.toLowerCase() || '', assetId: row.asset?.split(' · ')[1] || '',
      condition: row.condition, riskLevel: row.risk, nextServiceDate: '', notes: row.notes || '', status: row.status,
    });
    setIsModalOpen(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance record?')) return;
    try {
      await api.delete(`/maintenance/${id}`);
      fetchMaintenance();
      showToast({ title: 'Record Deleted', message: 'Maintenance record removed.', severity: 'info' }, 3000);
    } catch (e) {
      showToast({ title: 'Delete Failed', message: e.response?.data?.message || e.message, severity: 'critical' }, 5000);
    }
  };
  const handleSave = async () => {
    if (!formData.assetType || !formData.assetId) {
      showToast({ title: 'Validation Error', message: 'Asset type and asset ID are required.', severity: 'critical' }, 4000);
      return;
    }
    setSaving(true);
    try {
      const payload = { assetType: formData.assetType, assetId: formData.assetId, condition: formData.condition, riskLevel: formData.riskLevel, nextServiceDate: formData.nextServiceDate, notes: formData.notes, status: formData.status };
      if (isEditMode) await api.put(`/maintenance/${formData.id}`, payload);
      else await api.post('/maintenance', payload);
      setIsModalOpen(false);
      fetchMaintenance();
      showToast({
        title: isEditMode ? 'Record Updated' : 'Record Created',
        message: isEditMode ? 'Maintenance record updated successfully.' : `New maintenance record for ${formData.assetId} created.`,
        severity: 'info',
      }, 3000);
    } catch (e) {
      showToast({ title: 'Save Failed', message: e.response?.data?.message || e.message, severity: 'critical' }, 5000);
    } finally { setSaving(false); }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col xl:flex-row w-full gap-6 max-w-full"
    >
      <Helmet>
        <title>Maintenance | Indian Railways AI</title>
        <meta name="description" content="Manage asset maintenance and fleet health for Indian Railways." />
      </Helmet>

      {/* Left Column: Core Dashboard */}
      <div className="flex-1 min-w-0 flex flex-col gap-8 w-full">
        {/* Header Status */}
        <motion.section variants={itemVariants} className="flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <h2 className="font-headline text-4xl lg:text-5xl font-light text-on-surface tracking-tight">System Status</h2>
            <p className="font-label text-[0.65rem] text-primary tracking-[0.3em] uppercase mt-2 font-black">Global Network Overview</p>
          </div>
          <div className="flex items-center gap-4 bg-primary/5 px-4 py-2 rounded-full border border-primary/20 shadow-lg backdrop-blur-md">
            <span className="w-3 h-3 bg-secondary rounded-full animate-pulse shadow-[0_0_10px_#ddfcff]"></span>
            <span className="font-headline font-black text-secondary tracking-widest text-[10px] hidden sm:inline-block uppercase">AI Monitoring Active</span>
          </div>
        </motion.section>

        {/* Grid 1: Top-risk assets from real maintenance data */}
        <section>
          <motion.h3 variants={itemVariants} className="font-headline text-sm font-black text-primary mb-6 flex items-center gap-3 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[20px]">train</span> High-Risk Assets
          </motion.h3>
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(maintenance.filter(m => m.risk === 'critical' || m.risk === 'high').slice(0, 3).length > 0
              ? maintenance.filter(m => m.risk === 'critical' || m.risk === 'high').slice(0, 3)
              : maintenance.slice(0, 3)
            ).map((unit, i) => {
              const isWarning = unit.risk === 'critical' || unit.risk === 'high';
              const color = unit.risk === 'critical' ? 'tertiary' : unit.risk === 'high' ? 'primary' : 'on-surface-variant';
              return (
                <motion.div key={unit.id || i} variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }}
                  className={`bg-[#201f1f]/60 backdrop-blur-[20px] border border-white/5 rounded-xl p-6 relative overflow-hidden group hover:bg-surface-container transition-colors shadow-2xl ${isWarning ? 'border-tertiary/20' : ''}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="font-label text-[10px] text-on-surface-variant tracking-widest mb-1 uppercase font-bold">Asset</p>
                      <p className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">{unit.asset}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`bg-surface-container-highest px-3 py-1 rounded text-[10px] font-black text-${color} border border-${color}/20 uppercase tracking-widest shadow-lg`}>
                        {isWarning && <span className="material-symbols-outlined text-[12px] mr-1">warning</span>}
                        {unit.risk?.toUpperCase()}
                      </span>
                      {unit.riskScore && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          unit.riskScore > 80 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          unit.riskScore > 50 ? 'bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/30' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}>🤖 AI Risk: {unit.riskScore}%</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Condition',    val: unit.condition },
                      { label: 'Status',       val: unit.status },
                      { label: 'Next Service', val: unit.nextService },
                    ].map((stat, j) => (
                      <div key={j} className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">{stat.label}</span>
                        <span className="font-headline text-sm font-bold capitalize">{stat.val}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Split Section: Track Map & Faults */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[24rem]">
          {/* Track Map (Bento wide) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#201f1f]/60 backdrop-blur-[20px] border border-white/5 rounded-xl p-0 relative overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/30 z-10 backdrop-blur-md">
              <h3 className="font-headline text-sm font-black text-on-surface uppercase tracking-widest">Track Degradation Map</h3>
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(174,198,255,0.8)]"></span>
                <span className="w-2 h-2 bg-tertiary rounded-full shadow-[0_0_8px_rgba(255,181,150,0.8)]"></span>
                <span className="w-2 h-2 bg-error rounded-full"></span>
              </div>
            </div>
            <div className="flex-1 relative bg-surface-container-lowest/20 flex items-center justify-center overflow-hidden min-h-[300px]">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #8b90a1 1px, transparent 0)", backgroundSize: "32px 32px" }}></div>
              <svg className="w-full h-full stroke-white/5 fill-none absolute z-0 p-8" viewBox="0 0 800 400">
                <motion.path initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 2, ease: 'easeInOut' }} d="M50,200 Q200,50 400,200 T750,200" strokeWidth="2" strokeDasharray="5,5"></motion.path>
                <motion.path initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 2, ease: 'easeInOut', delay: 0.3 }} d="M50,300 Q300,400 500,250 T750,100" strokeWidth="2" strokeDasharray="5,5"></motion.path>
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3, delay: 1 }}
                  className="drop-shadow-[0_0_12px_rgba(255,181,150,0.6)]"
                  d="M400,200 Q575,350 750,200"
                  stroke="#ffb596" strokeWidth="4"
                ></motion.path>
                <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2 }} cx="50" cy="200" fill="#aec6ff" r="4"></motion.circle>
                <motion.circle initial={{ scale: 0 }} animate={{ scale: 1.5 }} transition={{ delay: 2.2, duration: 0.5 }} cx="400" cy="200" fill="#ffb596" r="6" className="shadow-2xl"></motion.circle>
                <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.4 }} cx="750" cy="200" fill="#aec6ff" r="4"></motion.circle>
              </svg>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3 }}
                whileHover={{ scale: 1.05 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-surface-container-high/90 p-5 rounded-xl border border-tertiary/30 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 cursor-pointer"
              >
                <p className="font-label text-[10px] text-on-surface-variant mb-1 uppercase tracking-widest font-bold">Segment: SEC-B-99</p>
                <p className="font-headline text-2xl text-tertiary font-black drop-shadow-[0_0_8px_rgba(255,181,150,0.3)]">Wear Rate: 42%</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-on-surface font-bold uppercase tracking-widest">Insp. Due:</p>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">12 Hrs</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Real-Time Faults — from maintenance records */}
          <motion.div variants={itemVariants} className="bg-[#201f1f]/60 backdrop-blur-[20px] border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-surface/30">
              <h3 className="font-headline text-[10px] font-black text-on-surface flex items-center gap-2 uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-[16px] text-primary">sensors</span> Active Issues
              </h3>
            </div>
            <motion.div variants={containerVariants} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {maintenance.filter(m => m.status === 'in_progress' || m.risk === 'critical' || m.risk === 'high').slice(0, 6).map((m, i) => {
                const color = m.risk === 'critical' ? 'tertiary' : m.risk === 'high' ? 'primary' : 'on-surface-variant';
                return (
                  <motion.div key={m.id || i} variants={itemVariants}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.02)' }}
                    className={`p-3 bg-white/2 rounded border-l-2 border-${color} transition-all cursor-pointer group`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-headline text-[10px] font-black text-${color} uppercase tracking-widest`}>{m.asset}</span>
                      <span className="font-label text-[8px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">{m.nextService}</span>
                    </div>
                    <p className="font-body text-[10px] text-on-surface-variant leading-relaxed group-hover:text-white transition-colors">{m.notes || 'Scheduled maintenance'}</p>
                  </motion.div>
                );
              })}
              {maintenance.filter(m => m.status === 'in_progress' || m.risk === 'critical' || m.risk === 'high').length === 0 && (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-2xl text-emerald-500/40 block mb-2">check_circle</span>
                  <p className="text-[10px] text-zinc-500">No active issues</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        <motion.section variants={itemVariants} className="bg-[#201f1f]/60 backdrop-blur-[20px] border border-white/5 rounded-xl overflow-hidden mt-4 shadow-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
            <h3 className="font-headline text-sm font-black text-on-surface uppercase tracking-widest">Upcoming Interventions</h3>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAdd}
              className="bg-gradient-to-r from-[#FF9933] to-[#ff7300] px-4 py-2 rounded-lg text-black font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span> Add Record
            </motion.button>
          </div>
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-label text-sm min-w-[600px] border-collapse">
              <thead className="bg-white/2 text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-black border-b border-white/5">
                <tr>
                  <th className="px-8 py-4">Asset ID</th>
                  <th className="px-8 py-4">Condition</th>
                  <th className="px-8 py-4">Risk Level</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Scheduled</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} className="divide-y divide-white/5">
                {maintenance.length > 0 ? maintenance.map((row, i) => (
                  <motion.tr key={row.id} variants={itemVariants}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    className="transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-4 font-headline text-on-surface font-bold group-hover:text-primary transition-colors">{row.asset}</td>
                    <td className="px-8 py-4 text-on-surface-variant text-xs group-hover:text-white transition-colors capitalize">{row.condition}</td>
                    <td className="px-8 py-4 flex flex-col gap-1 items-start justify-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${row.risk === 'critical' ? 'text-red-400' : row.risk === 'high' ? 'text-[#FF9933]' : 'text-on-surface-variant'}`}>
                        {row.risk}
                      </span>
                      {row.riskScore && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          row.riskScore > 80 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          row.riskScore > 50 ? 'bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/30' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}>🤖 {row.riskScore}%</span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-on-surface-variant text-xs font-bold uppercase tracking-widest">{row.status}</td>
                    <td className="px-8 py-4 font-headline text-primary font-black">{row.nextService}</td>
                    <td className="px-8 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(row)} className="text-zinc-500 hover:text-[#FF9933] transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-8 py-4">
                      <EmptyState icon="build" message="No maintenance records found." />
                    </td>
                  </tr>
                )}
              </motion.tbody>
            </table>
          </div>
        </motion.section>
      </div>

      {/* Right Sidebar: Real reliability from maintenance data */}
      <aside className="w-full xl:w-[300px] xl:shrink-0 flex flex-col gap-6 min-w-0">
        {/* Reliability Score — computed from real data */}
        <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}
          className="bg-[#201f1f]/60 backdrop-blur-[20px] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <h3 className="font-label text-[10px] tracking-[0.2em] text-on-surface-variant uppercase mb-6 relative z-10 font-black">System Reliability</h3>
          {(() => {
            const total = maintenance.length || 1;
            const good  = maintenance.filter(m => m.condition === 'good').length;
            const score = Math.round((good / total) * 100);
            const dash  = 283;
            const offset = dash - (dash * score / 100);
            return (
              <div className="relative w-32 h-32 flex items-center justify-center mb-4 z-10">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <motion.circle initial={{ strokeDashoffset: dash }} animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 2, ease: 'easeOut', delay: 1 }}
                    className="drop-shadow-[0_0_12px_#ddfcff]"
                    cx="50" cy="50" fill="none" r="45" stroke="#ddfcff"
                    strokeDasharray={dash} strokeWidth="6" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }} transition={{ delay:2 }}
                    className="font-headline text-4xl font-black text-on-surface">
                    {score}<span className="text-xl opacity-50">%</span>
                  </motion.span>
                </div>
              </div>
            );
          })()}
          <p className="font-label text-[9px] text-on-surface-variant relative z-10 uppercase tracking-widest font-bold">
            {maintenance.filter(m => m.condition === 'good').length} of {maintenance.length} assets in good condition
          </p>
        </motion.div>

        {/* Real maintenance breakdown */}
        <motion.div variants={itemVariants} className="bg-[#201f1f]/60 backdrop-blur-[20px] border border-white/5 rounded-xl p-6 flex-1 flex flex-col shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-tertiary">analytics</span>
            <h3 className="font-headline text-[10px] font-black uppercase tracking-[0.2em]">Asset Breakdown</h3>
          </div>
          <div className="space-y-4 flex-1">
            {[
              { label: 'Critical Risk',  count: maintenance.filter(m => m.risk === 'critical').length, color: 'text-red-400',     bar: 'bg-red-500'    },
              { label: 'High Risk',      count: maintenance.filter(m => m.risk === 'high').length,     color: 'text-[#FF9933]',  bar: 'bg-[#FF9933]'  },
              { label: 'Medium Risk',    count: maintenance.filter(m => m.risk === 'medium').length,   color: 'text-yellow-400', bar: 'bg-yellow-500' },
              { label: 'Low Risk',       count: maintenance.filter(m => m.risk === 'low').length,      color: 'text-emerald-400',bar: 'bg-emerald-500'},
              { label: 'In Progress',    count: maintenance.filter(m => m.status === 'in_progress').length, color: 'text-primary', bar: 'bg-primary' },
              { label: 'Scheduled',      count: maintenance.filter(m => m.status === 'scheduled').length,   color: 'text-zinc-400', bar: 'bg-zinc-500' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                  <span className="text-on-surface-variant">{item.label}</span>
                  <span className={item.color}>{item.count}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${maintenance.length > 0 ? (item.count / maintenance.length) * 100 : 0}%` }}
                    transition={{ duration: 1.2, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
                    className={`h-full ${item.bar}`} />
                </div>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={openAdd}
            className="w-full mt-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-black text-[10px] tracking-[0.2em] uppercase rounded-lg hover:shadow-[0_0_20px_rgba(174,198,255,0.4)] transition-all shadow-xl">
            + Add Maintenance Record
          </motion.button>
        </motion.div>
      </aside>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Update Maintenance Record' : 'New Maintenance Record'}
        onSubmit={handleSave} submitText={saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Record'}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Asset Type</label>
            <input value={formData.assetType} onChange={e => setFormData({...formData, assetType: e.target.value})}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
              placeholder="e.g. locomotive" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Asset ID</label>
            <input value={formData.assetId} onChange={e => setFormData({...formData, assetId: e.target.value})}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none"
              placeholder="e.g. WAP-7 #30211" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Condition</label>
            <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              {['good','fair','poor','critical'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Risk Level</label>
            <select value={formData.riskLevel} onChange={e => setFormData({...formData, riskLevel: e.target.value})}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              {['low','medium','high','critical'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none">
              {['scheduled','in_progress','completed','cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Next Service Date</label>
            <input type="datetime-local" value={formData.nextServiceDate} onChange={e => setFormData({...formData, nextServiceDate: e.target.value})}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none" />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2}
              className="w-full bg-surface/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF9933]/50 outline-none resize-none"
              placeholder="Optional notes..." />
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}