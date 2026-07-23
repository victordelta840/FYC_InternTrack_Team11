import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30_000,
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as any).Authorization = `Bearer ${token}`;
  }
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = res.data.accessToken as string;
    useAuthStore.getState().setAccessToken(token);
    return token;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original) throw err;
    const status = err.response?.status;
    if (status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      if (!refreshing) refreshing = refreshToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${token}`;
        return api.request(original);
      }
    }
    throw err;
  },
);
