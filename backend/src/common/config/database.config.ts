import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

export default registerAs('database', (): DataSourceOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'interntrack_db',
  entities: [join(__dirname, '..', '..', 'database', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: (process.env.DB_SYNCHRONIZE || 'false') === 'true',
  logging: (process.env.DB_LOGGING || 'false') === 'true',
  charset: 'utf8mb4',
  timezone: 'Z',
  supportBigNumbers: true,
  bigNumberStrings: true,
}));
