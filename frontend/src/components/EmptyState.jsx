import React from 'react';
import { motion } from 'framer-motion';

export default function EmptyState({ icon = 'inbox', message = 'No data available.', action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <span className="material-symbols-outlined text-5xl text-zinc-700 block mb-4 opacity-60">{icon}</span>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">{message}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="mt-5 bg-[#FF9933]/10 text-[#FF9933] border border-[#FF9933]/30 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#FF9933]/20 transition-all"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
