import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useStore } from '../store/useStore';
import { getPermissions } from '../utils/permissions';
import { useSocket } from '../hooks/useSocket';

const ROUTE_PERMISSIONS = {
  '/maintenance': 'viewMaintenance',
  '/settings':    'viewSettings',
};

export default function Layout() {
  const { isAuthenticated, sidebarOpen, toggleSidebar, initApp, user, socketConnected, fetchTrainStats } = useStore();
  const location = useLocation();

  useSocket(); // mount socket connection

  useEffect(() => {
    if (isAuthenticated) {
      initApp();
      const interval = setInterval(() => {
        if (!socketConnected) fetchTrainStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, socketConnected, initApp, fetchTrainStats]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const perms        = getPermissions(user);
  const requiredPerm = ROUTE_PERMISSIONS[location.pathname];
  if (requiredPerm && !perms[requiredPerm]) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex overflow-hidden h-screen bg-surface">
      <Sidebar />
      {sidebarOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={toggleSidebar} />
      )}
      <main className="md:ml-64 flex flex-col flex-1 relative h-screen bg-surface overflow-hidden w-full transition-all duration-300">
        <TopNav />
        <div className="mt-16 p-4 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar text-on-surface">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
