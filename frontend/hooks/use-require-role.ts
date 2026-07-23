'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import type { Role } from '@/types';

/** Redirect helper for role-gated dashboards. */
export function useRequireRole(role: Role) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!user) {
      router.replace(role === 'ADMIN' ? '/admin/login' : '/auth/login');
      return;
    }
    if (user.role !== role) {
      router.replace(
        user.role === 'ADMIN' ? '/admin' : user.role === 'MENTOR' ? '/mentor' : '/student',
      );
    }
  }, [user, role, router]);
  return user;
}
