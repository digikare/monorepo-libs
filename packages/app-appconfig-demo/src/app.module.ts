import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppConfigModule } from '@digikare/nestjs-azure-appconfig';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // for async
    AppConfigModule.forConnectionStringFactory({
      useFactory: async (configService: ConfigService) => {
        return {
          connectionString: configService.get('APP_CONFIG_CONNECTION')
        };
      },
      inject: [ConfigService],
      imports: [ConfigModule],
    }),

    // below for sync stuff
    // AppConfigModule.forConnectionString({
    //   connectionString: process.env.APP_CONFIG_CONNECTION
    // }),
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule { }
