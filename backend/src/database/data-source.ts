import 'reflect-metadata';
import { config as dotenv } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

dotenv();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'interntrack_db',
  entities: [join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: (process.env.DB_LOGGING || 'false') === 'true',
  charset: 'utf8mb4',
  timezone: 'Z',
});


