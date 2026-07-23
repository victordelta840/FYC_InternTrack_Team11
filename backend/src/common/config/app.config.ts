import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '4000', 10),
  host: process.env.APP_HOST || '0.0.0.0',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','),
  cookieSecret: process.env.COOKIE_SECRET || 'insecure-cookie-secret-change-me-please',
  csrfEnabled: (process.env.CSRF_ENABLED || 'true') === 'true',

  jwt: {
    issuer: process.env.JWT_ISSUER || 'interntrack',
    audience: process.env.JWT_AUDIENCE || 'interntrack-client',
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL || '900', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL || '604800', 10),
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || './keys/jwt-private.pem',
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './keys/jwt-public.pem',
  },

  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '19456', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST || '2', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  },

  storage: {
    root: process.env.STORAGE_ROOT || './storage',
    templateDir: process.env.TEMPLATE_STORAGE_DIR || './storage/templates',
    certificateDir: process.env.CERTIFICATE_STORAGE_DIR || './storage/certificates',
    uploadTmp: process.env.UPLOAD_TMP_DIR || './storage/uploads',
  },

  business: {
    certAttendanceThreshold: process.env.CERT_ATTENDANCE_THRESHOLD || '90.00',
    slaEscalationHours: parseInt(process.env.SLA_ESCALATION_HOURS || '48', 10),
  },

  jobs: {
    pollIntervalMs: parseInt(process.env.JOB_POLL_INTERVAL_MS || '5000', 10),
    concurrency: parseInt(process.env.JOB_CONCURRENCY || '2', 10),
  },

  tesseract: {
    enabled: (process.env.TESSERACT_ENABLED || 'true') === 'true',
    lang: process.env.TESSERACT_LANG || 'eng',
  },
}));
