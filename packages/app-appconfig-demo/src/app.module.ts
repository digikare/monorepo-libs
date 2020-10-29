import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppConfigModule } from '@digikare/nestjs-azure-appconfig';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AppConfigModule.forConnectionString({
      connectionString: process.env.APP_CONFIG_CONNECTION_STRING
    }),
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule { }
