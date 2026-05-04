import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, children, onSubmit, submitText = 'Save' }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          className="bg-surface-container-high w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-headline font-bold text-white uppercase tracking-widest">{title}</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div className="p-6 space-y-4">
              {children}
            </div>
            
            <div className="px-6 py-4 bg-surface-container-lowest/30 flex justify-end gap-3 border-t border-white/5">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-primary text-on-primary px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(174,198,255,0.3)]"
              >
                {submitText}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
