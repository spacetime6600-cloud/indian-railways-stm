import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';

const Dashboard   = lazy(() => import('./pages/Dashboard'));
const LiveTrains  = lazy(() => import('./pages/LiveTrains'));
const Platforms   = lazy(() => import('./pages/Platforms'));
const Alerts      = lazy(() => import('./pages/Alerts'));
const Analytics   = lazy(() => import('./pages/Analytics'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Settings    = lazy(() => import('./pages/Settings'));
const Landing     = lazy(() => import('./pages/Landing'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-black">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Loading Module...</span>
    </div>
  </div>
);

const Wrap = ({ children, name }) => (
  <ErrorBoundary key={name}>{children}</ErrorBoundary>
);

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"      element={<Landing />} />
            <Route path="/login" element={<Login />} />

            <Route element={<Layout />}>
              <Route path="/dashboard"   element={<Wrap name="dashboard">  <Dashboard />  </Wrap>} />
              <Route path="/live-trains" element={<Wrap name="live-trains"><LiveTrains />  </Wrap>} />
              <Route path="/platforms"   element={<Wrap name="platforms">  <Platforms />  </Wrap>} />
              <Route path="/alerts"      element={<Wrap name="alerts">     <Alerts />     </Wrap>} />
              <Route path="/analytics"   element={<Wrap name="analytics">  <Analytics />  </Wrap>} />
              <Route path="/maintenance" element={<Wrap name="maintenance"><Maintenance /></Wrap>} />
              <Route path="/settings"    element={<Wrap name="settings">   <Settings />   </Wrap>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
