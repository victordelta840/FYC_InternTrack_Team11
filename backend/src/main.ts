import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('bootstrap');

  const apiPrefix = config.get<string>('app.apiPrefix', 'api/v1');
  const port = config.get<number>('app.port', 4000);
  const host = config.get<string>('app.host', '0.0.0.0');
  const corsOrigin = config.get<string[]>('app.corsOrigin')!;
  const cookieSecret = config.get<string>('app.cookieSecret')!;

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  });
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser(cookieSecret));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(port, host);
  logger.log(`InternTrack backend running: http://${host}:${port}/${apiPrefix}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal boot error', err);
  process.exit(1);
});
