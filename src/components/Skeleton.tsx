import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular', 
  width, 
  height,
  animate = true 
}: SkeletonProps) {
  const baseStyles = animate ? 'animate-pulse' : '';
  
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  return (
    <div
      className={`bg-slate-200 dark:bg-slate-700 ${variantStyles[variant]} ${baseStyles} ${className}`}
      style={{
        width: width || '100%',
        height: height || '100%'
      }}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 p-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} height={20} width={i === 2 ? 120 : 60} />
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} height={20} width={i === 2 ? 100 : 50} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1">
            <Skeleton height={12} width="60%" className="mb-2" />
            <Skeleton height={24} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="flex-1">
          <Skeleton height={28} width="40%" className="mb-2" />
          <Skeleton height={16} width="60%" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton height={14} width="30%" className="mb-2" />
          <Skeleton height={40} />
        </div>
        <div>
          <Skeleton height={14} width="30%" className="mb-2" />
          <Skeleton height={40} />
        </div>
      </div>
      
      <Skeleton height={14} width="20%" className="mt-4" />
      <Skeleton height={80} />
    </div>
  );
}

export default Skeleton;
