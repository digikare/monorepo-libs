import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ReceiverModule } from './receiver/receiver.module';
import { ConfigService } from '@nestjs/config';
import { EventHubServer } from '@digikare/nestjs-azure-eventhub';
import { SenderModule } from './sender/sender.module';

async function bootstrapReceiver() {
  const app = await NestFactory.create(ReceiverModule, {
    logger: new Logger(),
  });

  const configService = app.get<ConfigService>(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    strategy: new EventHubServer(
      configService.get<string>('EVENT_HUB_LISTENER_CONNECTION_STRING'),
      configService.get<string>('EVENT_HUB_NAME'),
      configService.get<string>('EVENT_HUB_LISTENER_CONSUMER_GROUP') ?? '$Default',
      {
        partitionId: configService.get<string>('EVENT_HUB_LISTENER_PARTITION_ID'),
      }
    ),
  });

  app.startAllMicroservices(() => {
    console.log(`Microservice is listening`);
  });

  app.listen(3001, () => {
    console.log(`Listener is listening`);
  });
}

async function bootstrapSender() {
  const app = await NestFactory.create(SenderModule, {
    logger: new Logger(),
  });

  const port = process.env.PORT ?? 3000;

  app.listen(port, () => {
    console.log(`Sender is listening on ${port}`);
  });
}

bootstrapReceiver();
bootstrapSender();
