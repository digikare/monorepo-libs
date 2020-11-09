import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ReceiverModule } from './receiver/receiver.module';
import { ConfigService } from '@nestjs/config';
import { EventHubServer } from '@digikare/nestjs-azure-eventhub';

async function bootstrapReceiver() {
  const app = await NestFactory.create(ReceiverModule, {
    logger: new Logger(),
  });

  const configService = app.get<ConfigService>(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    strategy: new EventHubServer(
      configService.get<string>('EVENT_HUB_LISTENER_CONNECTION_STRING'),
      configService.get<string>('EVENT_HUB_LISTENER_NAME'),
      configService.get<string>('EVENT_HUB_LISTENER_CONSUMER_GROUP') ?? '$Default',
      {
        wildcardSupport: true,
        partitionId: configService.get<string>('EVENT_HUB_LISTENER_PARTITION_ID'),
        checkpointStore: {
          connectionString: configService.get<string>('EVENT_HUB_LISTENER_CHECKPOINT_CONTAINER_CONNECTION_STRING'),
          containerName: configService.get<string>('EVENT_HUB_LISTENER_CHECKPOINT_CONTAINER_NAME'),
        }
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

bootstrapReceiver();
