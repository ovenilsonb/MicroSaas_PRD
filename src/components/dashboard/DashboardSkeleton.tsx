import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-32 bg-white border border-slate-100 rounded-3xl animate-pulse flex flex-col p-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-50 rounded w-1/2" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
            </div>
          </div>
        </div>
      ))}
      <div className="lg:col-span-1 h-48 bg-white border border-slate-100 rounded-3xl animate-pulse" />
      <div className="lg:col-span-3 h-48 bg-white border border-slate-100 rounded-3xl animate-pulse" />
    </div>
  );
}
