import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getScopeLabel, getRoleBadge, STATION_SCOPED } from '../utils/permissions';
import { THEMES, getStoredTheme, applyTheme } from '../utils/theme';

const TYPE_META = {
  train:   { icon: 'train',       color: 'text-[#FF9933]',   bg: 'bg-[#FF9933]/10',   label: 'Train'   },
  station: { icon: 'location_on', color: 'text-primary',     bg: 'bg-primary/10',     label: 'Station' },
  route:   { icon: 'route',       color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Route'   },
  alert:   { icon: 'warning_amber',color: 'text-red-400',    bg: 'bg-red-400/10',     label: 'Alert'   },
};

export default function TopNav() {
  const { toggleSidebar, trains, platforms, alerts, user } = useStore(useShallow(s => ({
    toggleSidebar: s.toggleSidebar,
    trains: s.trains,
    platforms: s.platforms,
    alerts: s.alerts,
    user: s.user
  })));
  const isReconnecting = useStore(s => s.isReconnecting);
  const navigate = useNavigate();

  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const [theme,   setTheme]   = useState(getStoredTheme);
  const inputRef   = useRef(null);
  const wrapperRef = useRef(null);

  // Apply stored theme on mount
  useEffect(() => { applyTheme(theme); }, []);

  const toggleTheme = () => {
    const next = theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setTheme(next);
    applyTheme(next);
  };

  const scopeLabel = getScopeLabel(user);
  const roleBadge  = getRoleBadge(user?.role);
  const isStation  = STATION_SCOPED.has(user?.role);

  // Build search index
  const searchIndex = useMemo(() => {
    const items = [];
    trains.forEach(t => {
      items.push({ type: 'train', primary: `${t.id} · ${t.name || ''}`, secondary: t.route, status: t.status, path: '/live-trains' });
    });
    const seen = new Set();
    platforms.forEach(p => {
      if (!seen.has(p.station)) {
        seen.add(p.station);
        items.push({ type: 'station', primary: p.station, secondary: `${p.id} · ${p.status}`, path: '/platforms' });
      }
    });
    const seenRoutes = new Set();
    trains.forEach(t => {
      if (t.route && !seenRoutes.has(t.route)) {
        seenRoutes.add(t.route);
        items.push({ type: 'route', primary: t.route, secondary: `${t.source || ''} → ${t.destination || ''}`, path: '/live-trains' });
      }
    });
    alerts.filter(a => a.active).forEach(a => {
      items.push({ type: 'alert', primary: a.title || 'Alert', secondary: a.message?.slice(0, 60), path: '/alerts' });
    });
    return items;
  }, [trains, platforms, alerts]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return searchIndex.filter(i =>
      i.primary?.toLowerCase().includes(q) || i.secondary?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, searchIndex]);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (item) => { navigate(item.path); setQuery(''); setOpen(false); };
  const activeAlertCount = alerts.filter(a => a.active).length;

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] flex items-center justify-between px-4 md:px-8 z-20 bg-[#131313]/80 backdrop-blur-xl h-16 font-['Manrope'] font-medium transition-all duration-300 border-b border-white/5 md:border-none">
      <div className="flex items-center gap-4 md:gap-6 flex-1">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={toggleSidebar} className="md:hidden text-white/70 hover:text-white transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </motion.button>

        {/* Search */}
        <div ref={wrapperRef} className="relative hidden sm:flex items-center flex-1 max-w-sm lg:max-w-md">
          <span className={`material-symbols-outlined absolute left-3 text-sm transition-colors z-10 ${focused ? 'text-[#FF9933]' : 'text-gray-400'}`}>search</span>
          <input ref={inputRef} value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); }}
            onBlur={() => setFocused(false)}
            className="bg-surface-container-lowest border border-white/5 text-sm rounded-lg pl-10 pr-16 py-2 w-full focus:ring-1 focus:ring-[#FF9933]/50 focus:border-[#FF9933]/30 transition-all text-on-surface outline-none placeholder:text-zinc-600"
            placeholder="Search trains, stations, routes..."
            autoComplete="off" />
          {!query && <span className="absolute right-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest pointer-events-none">Ctrl K</span>}
          {query && (
            <button onMouseDown={e => { e.preventDefault(); setQuery(''); setOpen(false); }}
              className="absolute right-3 text-zinc-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}

          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {!query && (
                  <div className="px-4 py-5 text-center">
                    <span className="material-symbols-outlined text-2xl text-zinc-700 block mb-2">search</span>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Search by train number, name, station, or route</p>
                    <div className="flex justify-center gap-2 mt-3 flex-wrap">
                      {['12301','Rajdhani','NDLS','HWH - NDLS'].map(hint => (
                        <button key={hint} onMouseDown={e => { e.preventDefault(); setQuery(hint); }}
                          className="text-[9px] px-2 py-1 bg-white/5 border border-white/10 rounded text-zinc-400 hover:text-[#FF9933] hover:border-[#FF9933]/30 transition-all font-bold uppercase tracking-wide">
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {query && results.length > 0 && (
                  <div className="py-1 max-h-80 overflow-y-auto">
                    {['train','station','route','alert'].map(type => {
                      const group = results.filter(r => r.type === type);
                      if (!group.length) return null;
                      const meta = TYPE_META[type];
                      return (
                        <div key={type}>
                          <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5">{meta.label}s</div>
                          {group.map((item, i) => (
                            <motion.button key={i} onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group">
                              <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                                <span className={`material-symbols-outlined text-sm ${meta.color}`}>{meta.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white group-hover:text-[#FF9933] transition-colors truncate">{item.primary}</div>
                                {item.secondary && <div className="text-[10px] text-zinc-500 truncate">{item.secondary}</div>}
                              </div>
                              {item.status && (
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${item.status === 'Delayed' ? 'bg-red-500/10 text-red-400' : item.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-400'}`}>
                                  {item.status}
                                </span>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {query && results.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <span className="material-symbols-outlined text-2xl text-zinc-700 block mb-2">search_off</span>
                    <p className="text-xs text-zinc-500">No results for <span className="text-white font-bold">"{query}"</span></p>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/5 flex justify-between">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">{results.length} result{results.length !== 1 ? 's' : ''}</span>
                    <span className="text-[9px] text-zinc-700 uppercase tracking-widest">Esc to close</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live status / Reconnecting indicator */}
        <AnimatePresence mode="wait">
          {isReconnecting ? (
            <motion.div key="reconnecting" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
              <div className="w-3 h-3 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
              <span className="text-[10px] uppercase tracking-widest font-black text-yellow-400">Reconnecting…</span>
            </motion.div>
          ) : (
            <motion.div key="live" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
              className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-secondary-container/10 border border-secondary-container/20 rounded-full">
              <div className="h-2 w-2 rounded-full bg-secondary-container animate-pulse shadow-[0_0_8px_rgba(0,241,254,0.5)]" />
              <span className="text-[10px] uppercase tracking-widest font-black text-secondary-container">System Live</span>
            </motion.div>
          )}
        </AnimatePresence>      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Scope label — shows station/zone for scoped roles */}
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] font-black text-white uppercase tracking-tight">{scopeLabel}</span>
          <span className={`text-[8px] font-bold uppercase tracking-widest ${roleBadge.color.split(' ')[0]}`}>
            {roleBadge.label}
          </span>
        </div>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: theme === THEMES.DARK ? 20 : -20 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          title={theme === THEMES.DARK ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative text-gray-400 hover:text-[#FF9933] transition-colors"
        >
          <AnimatePresence mode="wait">
            {theme === THEMES.DARK ? (
              <motion.span key="light-icon"
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="material-symbols-outlined block"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                light_mode
              </motion.span>
            ) : (
              <motion.span key="dark-icon"
                initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="material-symbols-outlined block"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                dark_mode
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Alerts bell */}
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/alerts')}
          className="relative text-gray-400 hover:text-[#FF9933] transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          {activeAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#FF9933] rounded-full text-[8px] font-black text-black flex items-center justify-center shadow-[0_0_8px_rgba(255,153,51,0.6)]">
              {activeAlertCount > 9 ? '9+' : activeAlertCount}
            </span>
          )}
        </motion.button>

        {/* User avatar */}
        <motion.div whileHover={{ x: -2 }} className="flex items-center gap-2 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#FF9933] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
