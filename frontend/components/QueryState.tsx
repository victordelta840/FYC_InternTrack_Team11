'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RotateCw, WifiOff, LogIn, Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { getQueryErrorInfo } from '@/lib/query-error';

interface QueryStateProps<T> {
  /** Any useQuery(...) result. */
  query: Pick<UseQueryResult<T, unknown>, 'data' | 'isLoading' | 'isError' | 'error' | 'refetch' | 'isFetching'>;
  /** Renders once data is loaded and not considered empty. */
  children: (data: T) => React.ReactNode;
  /** Optional: decide whether loaded data counts as "empty" (defaults to null/undefined/[] checks). */
  isEmpty?: (data: T) => boolean;
  /** Copy shown while loading. */
  loadingLabel?: string;
  /** Copy + optional action shown when data is empty. */
  emptyLabel?: string;
  emptyAction?: React.ReactNode;
  /** Login route to send the user to on an unauthorized error. */
  loginHref?: string;
  className?: string;
}

function defaultIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data as object).length === 0;
  return false;
}

/**
 * Single source of truth for rendering a query's loading / error / empty /
 * success states. Every page that used to hand-roll `if (isLoading) return
 * "Loading..."` (and risk that condition never resolving, as in the old
 * admin dashboard) should route through this instead.
 */
export function QueryState<T>({
  query,
  children,
  isEmpty = defaultIsEmpty,
  loadingLabel = 'Loading…',
  emptyLabel = 'Nothing here yet.',
  emptyAction,
  loginHref = '/admin/login',
  className,
}: QueryStateProps<T>) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);

  if (query.isLoading) {
    return (
      <div className={className ?? 'flex items-center gap-2 text-slate-400 text-sm py-10 justify-center'}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (query.isError) {
    const info = getQueryErrorInfo(query.error);

    if (info.kind === 'unauthorized') {
      return (
        <div className="flex flex-col items-center gap-3 text-center py-10">
          <LogIn className="w-8 h-8 text-amber-400" />
          <div>
            <div className="font-display text-lg">{info.title}</div>
            <div className="text-sm text-slate-400 mt-1">{info.message}</div>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              clearAuth();
              router.replace(loginHref);
            }}
          >
            Sign in again
          </button>
        </div>
      );
    }

    const Icon = info.kind === 'network' || info.kind === 'timeout' ? WifiOff : AlertTriangle;

    return (
      <div className="flex flex-col items-center gap-3 text-center py-10">
        <Icon className="w-8 h-8 text-red-400" />
        <div>
          <div className="font-display text-lg">{info.title}</div>
          <div className="text-sm text-slate-400 mt-1 max-w-sm">{info.message}</div>
        </div>
        {info.retryable && (
          <button className="btn-ghost" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            Retry
          </button>
        )}
      </div>
    );
  }

  const data = query.data as T;

  if (isEmpty(data)) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-10">
        <Inbox className="w-8 h-8 text-slate-500" />
        <div className="text-sm text-slate-400">{emptyLabel}</div>
        {emptyAction}
      </div>
    );
  }

  return <>{children(data)}</>;
}
