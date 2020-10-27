import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new Logger(),
  });

  const port = process.env.PORT ?? 3000;

  app.listen(port, () => {
    console.log(`App is listening on ${port}`);
  });
}

bootstrap();
