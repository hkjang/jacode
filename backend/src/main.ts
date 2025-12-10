import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';
import { GlobalExceptionFilter } from './common/exception.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe with input sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Limit input size
      forbidUnknownValues: true,
    }),
  );

  // CORS - configurable origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // Global timeout middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Set timeout to 5 minutes for AI operations
    req.setTimeout(300000);
    res.setTimeout(300000);
    next();
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('JaCode API')
    .setDescription('AI-Powered IDE Backend API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('projects', 'Project management')
    .addTag('files', 'File operations')
    .addTag('agents', 'Agent task management')
    .addTag('artifacts', 'Artifact management')
    .addTag('ai', 'AI model operations')
    .addTag('monitoring', 'Health and metrics')
    .addTag('knowledge', 'Knowledge base')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 JaCode Backend running on: http://localhost:${port}`);
  logger.log(`📚 API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start application:', err);
  process.exit(1);
});

