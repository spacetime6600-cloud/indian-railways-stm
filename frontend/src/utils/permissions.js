// ── Role definitions ──────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:               'admin',
  NATIONAL_CONTROLLER: 'national_controller',
  ZONE_ADMIN:          'zone_admin',
  STATION_MASTER:      'station_master',
  TRAFFIC_CONTROLLER:  'traffic_controller',
  DISPATCHER:          'dispatcher',
  ENGINEER:            'engineer',
  ANALYST:             'analyst',
  VIEWER:              'viewer',
};

// Roles that see only their station's data
export const STATION_SCOPED = new Set(['station_master', 'dispatcher']);
// Roles that see only their zone's data
export const ZONE_SCOPED    = new Set(['zone_admin']);
// Roles with national/full view
export const NATIONAL_VIEW  = new Set(['admin', 'national_controller', 'analyst', 'engineer', 'traffic_controller']);

// ── Nav items per role ────────────────────────────────────────────────────────
export const NAV_CONFIG = [
  { path: '/dashboard',   icon: 'dashboard',         label: 'Command Center', roles: null }, // null = all
  { path: '/live-trains', icon: 'train',              label: 'Live Trains',    roles: null },
  { path: '/platforms',   icon: 'directions_railway', label: 'Platforms',      roles: null },
  { path: '/alerts',      icon: 'warning_amber',      label: 'Alert Center',   roles: null },
  { path: '/analytics',   icon: 'bar_chart_4_bars',   label: 'Analytics',      roles: null },
  { path: '/maintenance', icon: 'engineering',        label: 'Maintenance',
    roles: ['admin','national_controller','zone_admin','engineer','traffic_controller'] },
];

// ── Permission checker ────────────────────────────────────────────────────────
export function getPermissions(user) {
  if (!user) return {};
  // Use server-sent permissions if available
  if (user.permissions) return user.permissions;
  // Fallback derive
  const role = user.role;
  return {
    viewDashboard:    true,
    viewTrains:       true,
    viewPlatforms:    true,
    viewAlerts:       true,
    viewAnalytics:    true,
    viewMaintenance:  ['admin','national_controller','zone_admin','engineer'].includes(role),
    viewSettings:     ['admin','national_controller'].includes(role),
    viewAllStations:  NATIONAL_VIEW.has(role),
    manageTrains:     !['viewer','analyst'].includes(role),
    manageUsers:      role === 'admin',
    resolveAlerts:    !['viewer','analyst','engineer'].includes(role),
  };
}

// ── Scope label for UI ────────────────────────────────────────────────────────
export function getScopeLabel(user) {
  if (!user) return 'National Network';
  if (STATION_SCOPED.has(user.role) && user.assignedStation)
    return `${user.assignedStation} Station`;
  if (ZONE_SCOPED.has(user.role) && user.assignedZone)
    return `${user.assignedZone} Zone`;
  return 'National Network';
}

export function getRoleBadge(role) {
  const map = {
    admin:               { label: 'Super Admin',          color: 'text-[#FF9933] bg-[#FF9933]/10 border-[#FF9933]/30' },
    national_controller: { label: 'National Controller',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
    zone_admin:          { label: 'Zone Admin',           color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
    station_master:      { label: 'Station Master',       color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
    traffic_controller:  { label: 'Traffic Controller',   color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
    dispatcher:          { label: 'Dispatcher',           color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
    engineer:            { label: 'Engineer',             color: 'text-red-400 bg-red-400/10 border-red-400/30' },
    analyst:             { label: 'Analyst',              color: 'text-primary bg-primary/10 border-primary/30' },
    viewer:              { label: 'Viewer',               color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' },
  };
  return map[role] || { label: role, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' };
}
