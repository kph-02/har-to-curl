import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables before importing any config
config({ path: join(process.cwd(), '..', '.env.secrets') });
config({ path: join(process.cwd(), '..', '.env') });

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { AppConfig, validateConfig } from './shared/config/app.config';

async function bootstrap() {
  // Validate configuration before starting
  validateConfig();

  const app = await NestFactory.create(AppModule);

  // Security: Helmet middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(AppConfig.server.port);
  console.log(`Backend running on http://localhost:${AppConfig.server.port}`);
}

bootstrap();
