'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminDashboardErrorProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function AdminDashboardError({ message, onRetry, isRetrying }: AdminDashboardErrorProps) {
  return (
    <div className="card flex flex-col items-center gap-3 py-16 text-center" role="alert">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-display text-lg text-slate-100">Couldn&apos;t load the dashboard</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          {message || 'Something went wrong while fetching the latest data. Please try again.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="btn-ghost mt-2 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        {isRetrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
