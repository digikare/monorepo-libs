import { EventHubClient, EventHubModule } from '@digikare/nestjs-azure-eventhub';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SenderController } from './sender.controller';
import { SenderService } from './sender.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    EventHubModule.forClientProxy({
      provide: 'EH_CLIENT',
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          connectionString: configService.get<string>('EVENT_HUB_PRODUCER_CONNECTION_STRING'),
          eventHubName: configService.get<string>('EVENT_HUB_PRODUCER_NAME'),
          options: {
            partitionId: configService.get<string>('EVENT_HUB_PRODUCER_PARTITION_ID'),
          },
        };
      }
    }),
  ],
  providers: [
    // {
    //   provide: 'EH_CLIENT',
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => {
    //     return new EventHubClient(
    //       configService.get<string>('EVENT_HUB_PRODUCER_CONNECTION_STRING'),
    //       configService.get<string>('EVENT_HUB_PRODUCER_NAME'),
    //       {
    //         partitionId: configService.get<string>('EVENT_HUB_PRODUCER_PARTITION_ID'),
    //       }
    //     );
    //   }
    // },
    SenderService,
  ],
  controllers: [SenderController]
})
export class SenderModule { }
