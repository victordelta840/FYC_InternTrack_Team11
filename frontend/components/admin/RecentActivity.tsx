import { History, Inbox } from 'lucide-react';
import { fmtText } from '@/lib/utils/format';
import type { AdminActivityItem } from './types';

interface RecentActivityProps {
  items?: AdminActivityItem[];
}

function activityTone(action: string): { dot: string; badge: string } {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove') || a.includes('reject') || a.includes('lock')) {
    return { dot: 'bg-red-400', badge: 'border-red-500/30 bg-red-500/10 text-red-300' };
  }
  if (a.includes('update') || a.includes('edit') || a.includes('status') || a.includes('assign')) {
    return { dot: 'bg-cyan-glow', badge: 'border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow' };
  }
  if (a.includes('issue') || a.includes('complaint')) {
    return { dot: 'bg-amber-400', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }
  if (a.includes('create') || a.includes('register') || a.includes('add') || a.includes('upload')) {
    return { dot: 'bg-neon-400', badge: 'border-neon-500/30 bg-neon-500/10 text-neon-400' };
  }
  return { dot: 'bg-slate-400', badge: 'border-line bg-bg-800 text-slate-300' };
}

function humanize(action: string, resource: string): string {
  const cleaned = fmtText(action, '').replace(/[._]/g, ' ').trim();
  const label = cleaned && cleaned !== 'N/A' ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Activity';
  const res = fmtText(resource, '');
  return res !== 'N/A' ? `${label} · ${res}` : label;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RecentActivity({ items }: RecentActivityProps) {
  const list = items ?? [];

  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-neon-400" aria-hidden="true" />
        <h2 className="font-display text-lg text-slate-100">Recent Activity</h2>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Inbox className="h-6 w-6 text-slate-600" aria-hidden="true" />
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        </div>
      ) : (
        <ul className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
          {list.map((item, idx) => {
            const tone = activityTone(item?.action ?? '');
            return (
              <li
                key={item?.id ?? idx}
                className="flex items-start gap-3 border-b border-line/60 py-3 last:border-0"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}>
                      {fmtText(item?.action, 'Activity')}
                    </span>
                    <span className="truncate text-sm text-slate-300">
                      {humanize(item?.action ?? '', item?.resource ?? '')}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{formatTimestamp(item?.createdAt ?? '')}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
