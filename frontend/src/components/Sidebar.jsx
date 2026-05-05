import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { NAV_CONFIG, getPermissions, getScopeLabel, getRoleBadge, STATION_SCOPED } from '../utils/permissions';

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { x: -20, opacity: 0 },
  visible: { x: 0,   opacity: 1 },
};

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, user, logout } = useStore();

  const perms          = getPermissions(user);
  const scopeLabel     = getScopeLabel(user);
  const roleBadge      = getRoleBadge(user?.role);
  const isStationScope = STATION_SCOPED.has(user?.role);

  const visibleNav = NAV_CONFIG.filter(item => {
    if (item.path === '/maintenance' && !perms.viewMaintenance) return false;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    return true;
  });

  return (
    <motion.nav
      initial={false}
      className={`sidebar flex flex-col bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/5 shadow-[0px_20px_50px_rgba(0,0,0,0.5)] font-['Space_Grotesk'] tracking-tight ${sidebarOpen ? 'open' : ''}`}
    >
      {/* Branding */}
      <div className="p-5 flex justify-between items-center border-b border-white/5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex gap-0.5 mb-3">
            <div className="h-1 flex-1 rounded-full bg-[#FF9933]" />
            <div className="h-1 flex-1 rounded-full bg-white/60" />
            <div className="h-1 flex-1 rounded-full bg-[#138808]" />
          </div>
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FF9933] mb-0.5">भारतीय रेल</div>
          <div className="text-base font-bold tracking-wider text-white leading-tight">Indian Railways</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-primary/70 mt-0.5">Smart Traffic Management</div>
        </motion.div>
        <button onClick={toggleSidebar} className="md:hidden text-white/50 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Context badges */}
      <div className="px-5 py-2 space-y-1.5">
        {/* Scope: station / zone / national */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-400 truncate">
            {scopeLabel} · Active
          </span>
        </div>

        {/* Role badge */}
        <div className={`border rounded-lg px-3 py-1.5 flex items-center gap-2 ${roleBadge.color}`}>
          <span className="material-symbols-outlined text-[14px]">badge</span>
          <span className="text-[9px] font-black uppercase tracking-widest truncate">{roleBadge.label}</span>
        </div>

        {/* Station indicator for station-scoped roles */}
        {isStationScope && user?.assignedStation && (
          <div className="bg-[#FF9933]/5 border border-[#FF9933]/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF9933] text-[14px]">location_on</span>
            <span className="text-[9px] font-bold text-[#FF9933] uppercase tracking-widest truncate">
              {user.assignedStation}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => (
          <motion.div key={item.path} variants={itemVariants}>
            <NavLink
              to={item.path}
              onClick={() => { if (window.innerWidth < 768) toggleSidebar(); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-lg ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_15px_rgba(174,198,255,0.08)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom: Settings + Profile */}
      <div className="mt-auto p-4 border-t border-white/5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {perms.viewSettings && (
            <NavLink to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-lg ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="font-medium text-sm">Settings</span>
            </NavLink>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full border border-[#FF9933]/30 bg-[#FF9933]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#FF9933] text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {user?.fullName?.split(' ')[0] || 'User'}
                </span>
                <span className="text-[10px] text-primary/70 truncate capitalize">
                  {user?.role?.replace(/_/g, ' ') || 'Staff'}
                </span>
              </div>
            </div>
            <button onClick={logout}
              className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-colors flex-shrink-0"
              title="Logout">
              <span className="material-symbols-outlined text-sm">logout</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
}
