import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { useToast } from '../components/ToastProvider';

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Settings() {
  const { user, logout } = useStore();
  const { showToast } = useToast();

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email:    user?.email    || '',
    password: '',
  });
  const [profileMsg,  setProfileMsg]  = useState(null);
  const [profileErr,  setProfileErr]  = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [prefs, setPrefs] = useState({
    notificationsEnabled: true,
    autoResolveAlerts:    false,
    refreshRate:          '30s',
  });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      const payload = { fullName: profileForm.fullName, email: profileForm.email };
      if (profileForm.password) payload.password = profileForm.password;
      await api.put('/auth/profile', payload);
      setProfileMsg('Profile updated successfully.');
      setProfileForm(f => ({ ...f, password: '' }));
      showToast({ title: 'Profile Updated', message: 'Your profile has been saved.', severity: 'info' }, 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setProfileErr(msg);
      showToast({ title: 'Update Failed', message: msg, severity: 'critical' }, 5000);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex-1 space-y-8 max-w-4xl">

      <motion.div variants={itemVariants}>
        <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight uppercase drop-shadow-[0_0_8px_rgba(255,153,51,0.3)]">System Parameters</h2>
        <p className="text-on-surface-variant font-label text-sm mt-1 tracking-widest uppercase">Indian Railways Traffic Management System</p>
      </motion.div>

      {/* Profile Section */}
      <motion.div variants={itemVariants} className="bg-surface-container-low rounded-xl p-8 border border-white/5 shadow-2xl">
        <h3 className="font-headline font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-6">Account Profile</h3>

        {/* Role badge */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-white/3 rounded-xl border border-white/5">
          <div className="w-12 h-12 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#FF9933] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <div>
            <div className="text-white font-bold">{user?.fullName || '—'}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{user?.role?.replace(/_/g, ' ') || '—'}</div>
            {user?.assignedStation && <div className="text-[10px] text-[#FF9933] mt-0.5">{user.assignedStation}</div>}
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-5">
          {profileMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-bold text-center">{profileMsg}</div>
          )}
          {profileErr && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-bold text-center">{profileErr}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Full Name</label>
              <input value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                className="w-full bg-surface/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#FF9933]/50 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Email</label>
              <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                className="w-full bg-surface/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#FF9933]/50 outline-none" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">New Password (leave blank to keep current)</label>
              <input type="password" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                className="w-full bg-surface/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#FF9933]/50 outline-none"
                placeholder="••••••••" />
            </div>
          </div>
          <div className="flex justify-end">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={savingProfile}
              className="bg-[#FF9933] text-black px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-60">
              {savingProfile ? 'Saving…' : 'Update Profile'}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Operational Preferences */}
      <motion.div variants={itemVariants} className="bg-surface-container-low rounded-xl p-8 border border-white/5 shadow-2xl">
        <h3 className="font-headline font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-6">Operational Preferences</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-white">Global Notifications</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Receive critical system alerts</p>
            </div>
            <input type="checkbox" checked={prefs.notificationsEnabled}
              onChange={e => setPrefs({...prefs, notificationsEnabled: e.target.checked})}
              className="w-5 h-5 bg-surface/50 border-white/20 rounded text-primary focus:ring-primary focus:ring-offset-surface" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-white">Auto-Resolve Minor Alerts</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">AI automatically clears low-severity issues</p>
            </div>
            <input type="checkbox" checked={prefs.autoResolveAlerts}
              onChange={e => setPrefs({...prefs, autoResolveAlerts: e.target.checked})}
              className="w-5 h-5 bg-surface/50 border-white/20 rounded text-primary focus:ring-primary focus:ring-offset-surface" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm text-white">Data Refresh Rate</label>
            <select value={prefs.refreshRate} onChange={e => setPrefs({...prefs, refreshRate: e.target.value})}
              className="bg-surface border border-white/10 rounded px-4 py-2 text-sm text-white outline-none focus:border-primary/50">
              <option value="15s">15 Seconds (High CPU)</option>
              <option value="30s">30 Seconds (Standard)</option>
              <option value="60s">60 Seconds (Eco)</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={itemVariants} className="bg-red-500/5 rounded-xl p-8 border border-red-500/20 shadow-2xl">
        <h3 className="font-headline font-bold text-red-400 uppercase tracking-widest border-b border-red-500/20 pb-2 mb-6">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-white">Sign Out</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">End your current session</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={logout}
            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
            Sign Out
          </motion.button>
        </div>
      </motion.div>

    </motion.div>
  );
}
