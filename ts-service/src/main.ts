import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('TalentFlow API')
    .setDescription('Backend engineering assessment - Candidate document intake and summary workflow')
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local Development')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-workspace-id',
        in: 'header',
        description: 'Workspace ID for authentication',
      },
      'workspace-id',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-user-id',
        in: 'header',
        description: 'User ID for authentication',
      },
      'user-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'TalentFlow API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();
