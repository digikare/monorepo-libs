import { Module, DynamicModule } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { DefaultAzureCredential } from '@azure/identity';
import { AppConfigurationClient } from '@azure/app-configuration';
import {
  AppConfigModuleForRootOptionsServicePrincipal,
  AppConfigModuleForRootOptionsConnectionString,
} from './app-config.interfaces';
import { APP_CONFIG_INSTANCE, APP_CONFIG_OPTIONS, APP_CONFIG_LABEL } from './constants';

function createProviders(
  options: AppConfigModuleForRootOptionsServicePrincipal | AppConfigModuleForRootOptionsConnectionString,
) {
  return [
    {
      provide: APP_CONFIG_OPTIONS,
      useValue: options,
    },
    {
      provide: APP_CONFIG_LABEL,
      useValue: options.label,
    },
    AppConfigService,
  ];
}

@Module({})
export class AppConfigModule {

  static forServicePrincipal(
    options: AppConfigModuleForRootOptionsServicePrincipal,
  ): DynamicModule {
    return {
      module: AppConfigModule,
      providers: [
        {
          provide: APP_CONFIG_INSTANCE,
          inject: [APP_CONFIG_OPTIONS],
          useFactory: (opts: AppConfigModuleForRootOptionsServicePrincipal) => {
            const credential = options.credential ?? new DefaultAzureCredential();
            const client = new AppConfigurationClient(
              opts.endpoint, // ex: <https://<your appconfig resource>.azconfig.io>
              credential,
              opts.options,
            );
            return client;
          },
        },
        ...createProviders(options),
      ],
      exports: [
        AppConfigService,
      ],
    };
  }

  static forConnectionString(
    options: AppConfigModuleForRootOptionsConnectionString,
  ): DynamicModule {
    return {
      module: AppConfigModule,
      providers: [
        {
          provide: APP_CONFIG_INSTANCE,
          inject: [APP_CONFIG_OPTIONS],
          useFactory: (opts: AppConfigModuleForRootOptionsConnectionString) => {
            const client = new AppConfigurationClient(opts.connectionString);
            return client;
          },
        },
        ...createProviders(options),
      ],
      exports: [
        AppConfigService,
      ]
    }
  }
}
