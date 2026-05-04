import { create } from 'zustand';
import api from '../utils/api';

// ── Pure helpers (exported for property-based tests) ──────────────────────────
export function shouldShowAlert(alert, user) {
  if (!user) return false;
  const STATION_SCOPED = new Set(['station_master', 'dispatcher']);
  if (!STATION_SCOPED.has(user.role)) return true;
  if (!alert.station_name) return true;
  return alert.station_name.toLowerCase().includes((user.assignedStation || user.assigned_station || '').toLowerCase());
}

export function recomputeAnalytics(trains) {
  const total   = trains.length;
  const active  = trains.filter(t => t.status?.toLowerCase() === 'running').length;
  const delayed = trains.filter(t => t.status?.toLowerCase() === 'delayed').length;
  const onTime  = total > 0 ? Math.round(((total - delayed) / total) * 1000) / 10 : 0;
  return { activeTrains: active, delayedTrains: delayed, onTimeRate: onTime, onTimePerformance: onTime };
}

export const useStore = create((set, get) => ({
  user:            null,
  isAuthenticated: !!localStorage.getItem('token'),
  trains:          [],
  platforms:       [],
  alerts:          [],
  maintenance:     [],
  analytics: {
    totalTrains:       0,
    activeTrains:      0,
    delayedTrains:     0,
    activeAlerts:      0,
    onTimeRate:        81.5,
    onTimePerformance: 81.5,
    avgDelay:          0,
    avgSpeed:          0,
  },
  // Pagination state for trains
  trainPagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
  trainFilters:    { search: '', status: '', zone: '', type: '', sortBy: 'train_number', sortDir: 'asc' },

  sidebarOpen:             false,
  isLoading:               false,
  error:                   null,
  isReconnecting:          false,
  socketConnected:         false,
  lastUpdatedAt:           null,
  highlightedPlatformIds:  [],

  toggleSidebar:     () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setReconnecting:   (v) => set({ isReconnecting: v }),
  setSocketConnected:(v) => set({ socketConnected: v }),
  touchLastUpdated:  ()  => set({ lastUpdatedAt: new Date().toISOString() }),

  // ── Socket store actions ───────────────────────────────────────────────────
  updateTrainFromSocket: (payload) => set(state => {
    const trains = state.trains.map(t =>
      t.rawId === payload.id
        ? { ...t,
            status:          payload.status ? payload.status.charAt(0).toUpperCase() + payload.status.slice(1) : t.status,
            speed:           payload.speed           ?? t.speed,
            delayMinutes:    payload.delay_minutes   ?? t.delayMinutes,
            delay:           (payload.delay_minutes > 0) ? '+' + payload.delay_minutes + 'm' : 'None',
            currentLocation: payload.current_location ?? t.currentLocation,
          }
        : t
    );
    return { trains, analytics: recomputeAnalytics(trains), lastUpdatedAt: new Date().toISOString() };
  }),

  prependAlert: (payload, user) => {
    if (!shouldShowAlert(payload, user)) return;
    const mapped = {
      id:        payload.id,
      type:      payload.severity === 'critical' ? 'Critical' : payload.severity === 'high' ? 'Warning' : 'Info',
      alertType: payload.type,
      title:     payload.title,
      message:   payload.message,
      timestamp: new Date(payload.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      active:    true,
      aiPriority: payload.priority_level || null,
    };
    set(state => ({ alerts: [mapped, ...state.alerts] }));
  },

  resolveAlertFromSocket: (id) => set(state => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, active: false } : a),
  })),

  deleteAlertFromSocket: (id) => set(state => ({
    alerts: state.alerts.filter(a => a.id !== id),
  })),

  deleteTrainFromSocket: (id) => set(state => {
    const trains = state.trains.filter(t => t.rawId !== id);
    return { trains, analytics: recomputeAnalytics(trains) };
  }),

  deletePlatformFromSocket: (id) => set(state => ({
    platforms: state.platforms.filter(p => p.rawId !== id),
  })),

  updatePlatformFromSocket: (payload) => set(state => ({
    platforms: state.platforms.map(p =>
      p.rawId === payload.id
        ? { ...p,
            status:    payload.status === 'maintenance' ? 'Maintenance' : payload.occupied ? 'Occupied' : 'Free',
            train:     payload.train_number || null,
          }
        : p
    ),
    highlightedPlatformIds: [...state.highlightedPlatformIds, payload.id],
  })),

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      // Also fetch full profile to get assignedStation/Zone
      let userData = res.data;
      try {
        const profile = await api.get('/auth/profile');
        userData = { ...res.data, ...profile.data };
      } catch (_) {}
      set({ user: userData, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check credentials.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null, isAuthenticated: false,
      trains: [], platforms: [], alerts: [], maintenance: [], error: null,
    });
    window.location.href = '/login';
  },

  // ── Trains (server-side paginated) ────────────────────────────────────────
  fetchTrains: async (params = {}) => {
    try {
      const currentFilters = get().trainFilters;
      const currentPg      = get().trainPagination;
      const filters = { ...currentFilters, ...params };
      const pg      = params.page  !== undefined ? params.page  : currentPg.page;
      const limit   = params.limit !== undefined ? params.limit : currentPg.limit;

      const qp = new URLSearchParams({ page: pg, limit });
      if (filters.search) qp.set('search',  filters.search);
      if (filters.status) qp.set('status',  filters.status);
      if (filters.zone)   qp.set('zone',    filters.zone);
      if (filters.type)   qp.set('type',    filters.type);
      qp.set('sortBy',  filters.sortBy  || 'train_number');
      qp.set('sortDir', filters.sortDir || 'asc');

      const res = await api.get(`/trains?${qp.toString()}`);
      const { data, pagination } = res.data;

      const formatted = data.map(t => ({
        id:              t.train_number,
        name:            t.train_name,
        route:           t.route,
        source:          t.source,
        destination:     t.destination,
        currentLocation: t.current_location || '—',
        zone:            t.zone || '—',
        trainType:       t.train_type || '—',
        speed:           t.speed ?? 0,
        eta:             t.eta
                           ? new Date(t.eta).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                           : '--:--',
        delay:           t.delay_minutes > 0 ? `+${t.delay_minutes}m` : 'None',
        delayMinutes:    t.delay_minutes ?? 0,
        platform:        t.platform_number || 'N/A',
        status:          t.status
                           ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
                           : 'Unknown',
        predictedDelay:  t.predicted_delay || 0,
        rawId:           t.id,
      }));

      set({ trains: formatted, trainPagination: pagination, trainFilters: filters });
    } catch (err) {
      console.error('fetchTrains:', err.message);
    }
  },

  // Fast stats-only fetch for dashboard KPIs
  fetchTrainStats: async () => {
    try {
      const res = await api.get('/trains/stats');
      const s   = res.data;
      set(state => ({
        analytics: {
          ...state.analytics,
          totalTrains:   parseInt(s.total)       || 0,
          activeTrains:  parseInt(s.running)     || 0,
          delayedTrains: parseInt(s.delayed)     || 0,
          avgDelay:      parseFloat(s.avg_delay) || 0,
          avgSpeed:      parseFloat(s.avg_speed) || 0,
        },
      }));
    } catch (err) {
      console.error('fetchTrainStats:', err.message);
    }
  },

  // ── Platforms ─────────────────────────────────────────────────────────────
  fetchPlatforms: async () => {
    try {
      const res = await api.get('/platforms');
      const formatted = res.data.map(p => ({
        // Legacy shape (used by Dashboard free-platforms modal)
        id:        p.platform_number,
        station:   p.station_name,
        status:    p.status === 'maintenance'
                     ? 'Maintenance'
                     : p.occupied ? 'Occupied' : 'Free',
        timeLabel: p.next_arrival
                     ? new Date(p.next_arrival).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                     : '--',
        train:     p.train_number || null,
        trainType: p.train_name   || '',
        demand:    p.demand_forecasts ?? 0,
        rawId:     p.id,
      }));
      set({ platforms: formatted });
    } catch (err) {
      console.error('fetchPlatforms:', err.message);
    }
  },

  // ── Alerts ────────────────────────────────────────────────────────────────
  fetchAlerts: async () => {
    try {
      const res = await api.get('/alerts');
      const formatted = res.data.map(a => ({
        id:         a.id,
        type:       a.severity === 'critical' ? 'Critical'
                  : a.severity === 'high'     ? 'Warning'
                  : 'Info',
        alertType:  a.type,
        title:      a.title,
        message:    a.message,
        timestamp:  new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        active:     !a.resolved,
        aiPriority: a.priority_level || null,   // AI-assigned priority
      }));
      set({ alerts: formatted });
    } catch (err) {
      console.error('fetchAlerts:', err.message);
    }
  },

  resolveAlert: async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      set(state => ({
        alerts: state.alerts.map(a => a.id === alertId ? { ...a, active: false } : a),
      }));
    } catch (err) {
      console.error('resolveAlert:', err.message);
    }
  },

  createAlert: async (payload) => {
    try {
      await api.post('/alerts', payload);
      await get().fetchAlerts();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || err.message };
    }
  },

  deleteAlert: async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      set(state => ({ alerts: state.alerts.filter(a => a.id !== alertId) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || err.message };
    }
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  fetchAnalytics: async () => {
    try {
      const res = await api.get('/analytics/overview');
      const d   = res.data;
      set(state => ({
        analytics: {
          ...state.analytics,
          totalTrains:       d.totalTrains       ?? d.total_trains       ?? state.analytics.totalTrains,
          activeTrains:      d.activeTrains      ?? d.active_trains      ?? state.analytics.activeTrains,
          delayedTrains:     d.delayedTrains     ?? d.delayed_trains     ?? state.analytics.delayedTrains,
          activeAlerts:      d.activeAlerts      ?? d.active_alerts      ?? 0,
          onTimeRate:        d.onTimeRate        ?? d.on_time_rate       ?? 81.5,
          onTimePerformance: d.onTimeRate        ?? d.on_time_rate       ?? 81.5,
        },
      }));
    } catch (err) {
      console.error('fetchAnalytics:', err.message);
    }
  },

  // ── Maintenance ───────────────────────────────────────────────────────────
  fetchMaintenance: async () => {
    try {
      const res = await api.get('/maintenance');
      const formatted = res.data.map(m => ({
        id:          m.id,
        asset:       `${m.asset_type?.toUpperCase() ?? 'ASSET'} · ${m.asset_id}`,
        condition:   m.condition,
        risk:        m.risk_level,
        nextService: m.next_service_date
                       ? new Date(m.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                       : 'TBD',
        notes:       m.notes,
        status:      m.status,
        riskScore:   m.risk_score,
        aiStatus:    m.ai_status,
      }));
      set({ maintenance: formatted });
    } catch (err) {
      console.error('fetchMaintenance:', err.message);
    }
  },

  // ── Boot ──────────────────────────────────────────────────────────────────
  initApp: async () => {
    if (get().isAuthenticated) {
      await Promise.allSettled([
        get().fetchTrains({ page: 1, limit: 50 }),
        get().fetchTrainStats(),
        get().fetchPlatforms(),
        get().fetchAlerts(),
        get().fetchAnalytics(),
        get().fetchMaintenance(),
      ]);
    }
  },
}));
