import React from 'react';

export default function PagePlaceholder({ title, icon, colorClass }) {
  return (
    <div className="bg-surface-container-low p-8 rounded-xl h-full flex flex-col items-center justify-center text-center">
      <span className={`material-symbols-outlined text-6xl ${colorClass} mb-4`} style={{ fontVariationSettings: "'FILL' 0" }}>{icon}</span>
      <h1 className="font-headline text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-on-surface-variant max-w-md">This section is currently under development.</p>
    </div>
  );
}
