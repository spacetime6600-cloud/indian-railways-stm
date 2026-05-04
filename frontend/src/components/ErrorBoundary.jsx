import React from 'react';
import { motion } from 'framer-motion';

function ErrorFallback({ error, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] text-center p-8"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Something went wrong</h3>
      <p className="text-sm text-zinc-500 mb-2 max-w-md">
        {error?.message || 'An unexpected error occurred in this module.'}
      </p>
      <p className="text-[10px] text-zinc-700 uppercase tracking-widest mb-6">
        The rest of the application is unaffected.
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className="bg-[#FF9933]/10 text-[#FF9933] border border-[#FF9933]/30 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#FF9933]/20 transition-all"
      >
        Reload Page
      </motion.button>
    </motion.div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}
