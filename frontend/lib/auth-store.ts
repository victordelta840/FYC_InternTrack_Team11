import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAccessToken: (t: string | null) => void;
  setUser: (u: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (t) => set({ accessToken: t }),
      setUser: (u) => set({ user: u }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: 'itk-auth' },
  ),
);
