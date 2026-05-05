import { useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { ToastContext } from '../components/ToastProvider';
// Derive socket URL from VITE_API_URL (strip /api suffix)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export function useSocket() {
  const socketRef = useRef(null);
  const toastCtx  = useContext(ToastContext);

  const {
    user,
    updateTrainFromSocket,
    batchUpdateTrainsFromSocket,
    prependAlert,
    resolveAlertFromSocket,
    updatePlatformFromSocket,
    deleteTrainFromSocket,
    deleteAlertFromSocket,
    deletePlatformFromSocket,
    fetchTrains,
    fetchTrainStats,
    fetchMaintenance,
    setReconnecting,
    setSocketConnected,
  } = useStore();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      randomizationFactor: 0,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setReconnecting(false);
      fetchTrains({ page: 1 });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      setReconnecting(true);
    });

    socket.on('reconnect_failed', () => {
      setReconnecting(false); // give up — polling fallback takes over
    });

    let trainUpdateQueue = [];
    let flushTimer = null;
    socket.on('train:updated', (data) => {
      trainUpdateQueue.push(data);
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          if (trainUpdateQueue.length > 0) {
            batchUpdateTrainsFromSocket(trainUpdateQueue);
            trainUpdateQueue = [];
          }
          flushTimer = null;
        }, 1000);
      }
    });

    socket.on('train:deleted',    (data) => deleteTrainFromSocket(data.id));

    socket.on('alert:new', (data) => {
      prependAlert(data, user);
      if (data.severity === 'critical' && toastCtx?.showToast) {
        toastCtx.showToast({ title: data.title, message: data.message, severity: 'critical' }, 6000);
      }
    });

    socket.on('alert:resolved',   (data) => resolveAlertFromSocket(data.id));
    socket.on('alert:deleted',    (data) => deleteAlertFromSocket(data.id));

    socket.on('platform:updated', (data) => updatePlatformFromSocket(data));
    socket.on('platform:deleted', (data) => deletePlatformFromSocket(data.id));

    socket.on('stats:refresh',    ()     => fetchTrainStats());

    // Maintenance events — refetch the list
    socket.on('maintenance:created', () => fetchMaintenance());
    socket.on('maintenance:updated', () => fetchMaintenance());
    socket.on('maintenance:deleted', () => fetchMaintenance());

    // AI real-time events
    socket.on('train:ai_updated', (data) => {
      // Update predicted_delay in store
      useStore.setState(state => ({
        trains: state.trains.map(t =>
          t.rawId === data.id ? { ...t, predictedDelay: data.predicted_delay } : t
        ),
      }));
    });
    socket.on('maintenance:ai_updated', () => fetchMaintenance());

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef;
}
