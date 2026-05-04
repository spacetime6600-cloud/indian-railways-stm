import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ title, icon, value, color, iconColor, trend, subtitle, customIcon }) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className="bg-surface-container-low p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between h-full group"
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest group-hover:text-primary transition-colors">{title}</span>
        {customIcon ? (
          customIcon
        ) : (
          <span className={`material-symbols-outlined text-lg ${iconColor} group-hover:scale-110 transition-transform`}>{icon}</span>
        )}
      </div>
      <div className="mt-4">
        <div className={`text-3xl font-headline font-bold ${color}`}>{value}</div>
        <div className={`text-[10px] flex items-center gap-1 mt-1 ${trend ? trend.color : 'text-on-surface-variant'}`}>
          {trend && <span className="material-symbols-outlined text-[12px]">{trend.icon}</span>}
          {subtitle}
        </div>
      </div>
    </motion.div>
  );
}
