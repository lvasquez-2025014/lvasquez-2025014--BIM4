import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[NestJS] Servidor corriendo con éxito en http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('[NestJS] Error fatal iniciando la aplicación:', err);
  process.exit(1);
});
