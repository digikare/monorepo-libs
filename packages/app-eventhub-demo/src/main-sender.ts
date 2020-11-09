import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SenderModule } from './sender/sender.module';

async function bootstrapSender() {
  const app = await NestFactory.create(SenderModule, {
    logger: new Logger(),
  });

  const port = process.env.PORT ?? 3000;

  app.listen(port, () => {
    console.log(`Sender is listening on ${port}`);
  });
}

bootstrapSender();
