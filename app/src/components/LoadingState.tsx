interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ backgroundColor: 'var(--bg-elevated)', ...style }}
    />
  );
}

import React from 'react';

interface LoadingStateProps {
  height?: string;
  variant?: 'page' | 'card' | 'table' | 'chart';
}

export function LoadingState({ variant = 'page' }: LoadingStateProps) {
  if (variant === 'card') {
    return (
      <div className="border p-5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="flex items-end gap-2 h-48">
          {[60, 80, 50, 90, 70, 85, 65, 95, 75, 55].map((h, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border p-5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Skeleton className="h-5 w-48 mb-4" />
          <div className="flex items-end gap-2 h-64">
            {[60, 80, 50, 90, 70, 85, 65, 95, 75, 55, 70, 80].map((h, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <Skeleton className="h-5 w-40" />
              <div className="flex justify-center">
                <Skeleton className="h-44 w-44 rounded-full" />
              </div>
              <div className="space-y-2">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-3 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
