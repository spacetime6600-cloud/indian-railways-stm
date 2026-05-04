import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

const ROLES = [
  { label: 'Railway Admin',       value: 'admin',              email: 'admin@indianrailways.gov.in',       sub: 'Full national access' },
  { label: 'Station Master',      value: 'station_master',     email: 'master.ndls@indianrailways.gov.in', sub: 'New Delhi only' },
  { label: 'Traffic Controller',  value: 'traffic_controller', email: 'controller@indianrailways.gov.in',  sub: 'National view' },
  { label: 'Engineer',            value: 'engineer',           email: 'engineer@indianrailways.gov.in',    sub: 'Maintenance access' },
];

export default function Login() {
  const navigate  = useNavigate();
  const login     = useStore(state => state.login);
  const error     = useStore(state => state.error);
  const isLoading = useStore(state => state.isLoading);

  const [email,    setEmail]    = useState('admin@indianrailways.gov.in');
  const [password, setPassword] = useState('password123');
  const [showPass, setShowPass] = useState(false);

  // Clear any stale/expired token when landing on login page
  useEffect(() => {
    localStorage.removeItem('token');
    useStore.setState({ isAuthenticated: false, user: null, error: null });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="flex w-full min-h-screen bg-[#050505] overflow-hidden">

      {/* ── LEFT: Visual Panel ── */}
      <div className="hidden lg:flex lg:w-7/12 relative overflow-hidden flex-col">
        {/* Background map */}
        <div className="absolute inset-0">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmkUsmioKROL4RsHBNh7iiAvxjpMRaQK8pVj3do2Prcb_AEkilU5gzuX5zVeXNv1lURn44lnHt-TtMISqPq8rZOgCQOziWxP7GVGlCyxpHThmC22TQ1MFj6nRAc2VZs0hp-4QzpsUfR0bVxSF_tXK-8BxlFCH3ZBF7Pt4h996wwXMY84nLcaIEs36uGVYPRvUB6Vv2iDP-J-9HJIyp7nCuskO09XZkl7lohvXnKShCKU_tH8zTumeQBuLxkvLXEpWF30kGOu3xLTY"
            alt="Indian Railway Network"
            className="w-full h-full object-cover opacity-25 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/60" />
        </div>

        {/* Tricolor top bar */}
        <div className="relative z-10 flex w-full h-1">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white/40" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-16 flex-1">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl border border-[#FF9933]/30 bg-[#FF9933]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#FF9933] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF9933]">भारतीय रेल</div>
              <div className="text-xl font-bold text-white uppercase tracking-widest">Indian Railways</div>
            </div>
          </motion.div>

          {/* Hero text */}
          <div className="max-w-lg">
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-6xl font-black text-white leading-[1] uppercase tracking-tight mb-4">
              Smart<br /><span className="text-[#FF9933]">Traffic</span><br />Control
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-white/50 text-base leading-relaxed mb-8">
              Real-time monitoring across all railway zones. Predictive delay management, platform orchestration, and AI-assisted traffic control for 13,000+ daily train operations.
            </motion.p>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="flex gap-6">
              {[
                { value: '68,000+', label: 'Route KMs' },
                { value: '8 Zones',  label: 'Monitored' },
                { value: '99.2%',   label: 'Uptime' },
              ].map(stat => (
                <div key={stat.label} className="border-l-2 border-[#FF9933]/40 pl-4">
                  <div className="text-xl font-black text-white">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3">
            <div className="flex items-center bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">System: Operational</span>
            </div>
            <div className="flex items-center bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-xl">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Ministry of Railways · GOI</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT: Login Form ── */}
      <div className="w-full lg:w-5/12 flex flex-col items-center justify-center px-8 lg:px-16 relative bg-[#080808]">
        {/* Tricolor top bar on mobile */}
        <div className="lg:hidden absolute top-0 left-0 right-0 flex h-1">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white/40" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,153,51,0.04)_0%,transparent_70%)] pointer-events-none" />

        {/* Badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="mb-10 flex items-center gap-3 bg-white/3 px-5 py-2.5 rounded-full border border-white/5"
        >
          <span className="material-symbols-outlined text-[18px] text-[#FF9933]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Authorized Personnel Only</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Staff Login</h2>
            <p className="text-white/30 text-sm">Indian Railways Traffic Management System</p>
          </div>

          {/* Quick role selector */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Quick Login As</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setEmail(role.email)}
                  className={`px-3 py-2 rounded-lg text-left border transition-all ${
                    email === role.email
                      ? 'border-[#FF9933]/50 bg-[#FF9933]/10 text-[#FF9933]'
                      : 'border-white/5 bg-white/3 text-white/40 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide">{role.label}</div>
                  <div className="text-[9px] opacity-60 mt-0.5">{role.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs font-bold text-center">
                {error}
              </motion.div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Official Email ID</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FF9933] transition-colors text-[20px]">alternate_email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/3 border border-white/8 rounded-xl pl-12 pr-4 py-4 text-white text-sm placeholder:text-white/10 focus:outline-none focus:border-[#FF9933]/50 focus:bg-white/5 transition-all"
                  placeholder="user@indianrailways.gov.in"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Password</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FF9933] transition-colors text-[20px]">lock</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/3 border border-white/8 rounded-xl pl-12 pr-12 py-4 text-white text-sm placeholder:text-white/10 focus:outline-none focus:border-[#FF9933]/50 focus:bg-white/5 transition-all"
                  placeholder="••••••••••••"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={isLoading ? {} : { scale: 1.02, y: -1 }}
              whileTap={isLoading ? {} : { scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#FF9933] to-[#ff7300] text-black font-black text-sm uppercase tracking-[0.2em] py-4 rounded-xl shadow-[0_0_30px_rgba(255,153,51,0.3)] hover:shadow-[0_0_40px_rgba(255,153,51,0.5)] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Access Control Center
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-[10px] text-white/20 uppercase tracking-widest">
            Ministry of Railways · Government of India<br />
            <span className="text-white/10">Unauthorized access is a punishable offence</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
