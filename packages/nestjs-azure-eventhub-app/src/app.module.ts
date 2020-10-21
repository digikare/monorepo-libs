import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiverModule } from './receiver/receiver.module';
import { SenderModule } from './sender/sender.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SenderModule,
    ReceiverModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
