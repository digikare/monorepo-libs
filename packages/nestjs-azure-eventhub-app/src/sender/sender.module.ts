import { EventHubClient } from '@digikare/nestjs-azure-eventhub';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SenderController } from './sender.controller';
import { SenderService } from './sender.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    {
      provide: 'EH_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new EventHubClient(
          configService.get<string>('EVENT_HUB_PRODUCER_CONNECTION_STRING'),
          {
            eventHubName: configService.get<string>('EVENT_HUB_PRODUCER_NAME'),
            partitionId: configService.get<string>('EVENT_HUB_PRODUCER_PARTITION_ID'),
          }
        );
      }
    },
    SenderService,
  ],
  controllers: [SenderController]
})
export class SenderModule { }
