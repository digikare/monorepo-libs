import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiverController } from './receiver.controller';
import { ReceiverService } from './receiver.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [ReceiverService],
  controllers: [ReceiverController],
})
export class ReceiverModule { }
