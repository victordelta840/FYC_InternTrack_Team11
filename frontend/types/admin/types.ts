// Response shape for GET /dashboard/admin-summary.
// This mirrors the existing backend contract exactly — no fields renamed,
// added, or removed. Every field is optional/nullable because the UI must
// never assume the backend has populated a given value.

export interface AdminDashboardTotals {
  users?: number | null;
  internships?: number | null;
  certificates?: number | null;
  templates?: number | null;
}

export interface AdminActivityItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId?: string | null;
  createdAt: string;
}

export type UsersByRoleMap = Partial<Record<'ADMIN' | 'MENTOR' | 'STUDENT', number>>;

export interface AdminDashboardSummary {
  totals?: AdminDashboardTotals;
  activeInternships?: number | null;
  pendingComplaints?: number | null;
  recentActivity?: AdminActivityItem[];
  // Not guaranteed by every deployment of /dashboard/admin-summary today.
  // Read defensively under both plausible keys so the UI keeps working
  // (rendering N/A) whether or not the backend supplies this.
  attendance?: number | null;
  attendancePercentage?: number | null;
  usersByRole?: UsersByRoleMap;
}
