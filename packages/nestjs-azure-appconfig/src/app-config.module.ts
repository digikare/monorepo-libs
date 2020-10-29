import { Module, DynamicModule } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { DefaultAzureCredential } from '@azure/identity';
import { AppConfigurationClient } from '@azure/app-configuration';
import {
  AppConfigModuleForRootOptionsServicePrincipal,
  AppConfigModuleForRootOptionsConnectionString,
} from './app-config.interfaces';
import { APP_CONFIG_INSTANCE, APP_CONFIG_OPTIONS } from './constants';
import Debug from 'debug';

interface FactoryOptions<T> {
  inject?: any[];
  imports?: any[];
  useFactory: (...args: any[]) => Promise<T> | T;
}

const debug = Debug('AppConfig:Module');

function hideSecrets(cs: string) {
  return cs.replace(/Secret=[^;]+/g, 'Secret=*********');
}

@Module({})
export class AppConfigModule {

  static forServicePrincipal(
    options: AppConfigModuleForRootOptionsServicePrincipal,
  ): DynamicModule {
    return AppConfigModule.forServicePrincipalFactory({ useFactory: () => options });
  }

  static forServicePrincipalFactory(
    factoryOption: FactoryOptions<AppConfigModuleForRootOptionsServicePrincipal>,
  ): DynamicModule {
    return {
      module: AppConfigModule,
      imports: [
        ...(factoryOption.imports ?? [])
      ],
      providers: [
        {
          provide: APP_CONFIG_OPTIONS,
          useFactory: factoryOption.useFactory,
          inject: factoryOption.inject ?? [],
        },
        {
          provide: APP_CONFIG_INSTANCE,
          inject: [APP_CONFIG_OPTIONS],
          useFactory: (opts: AppConfigModuleForRootOptionsServicePrincipal) => {
            const credential = opts.credential ?? new DefaultAzureCredential();
            const client = new AppConfigurationClient(
              opts.endpoint, // ex: <https://<your appconfig resource>.azconfig.io>
              credential,
              opts.options,
            );
            return client;
          },
        },
      ],
      exports: [
        AppConfigService,
      ],
    };
  }

  static forConnectionString(
    options: AppConfigModuleForRootOptionsConnectionString,
  ): DynamicModule {
    return AppConfigModule.forConnectionStringFactory({ useFactory: () => options });
  }

  static forConnectionStringFactory(
    factoryOption: FactoryOptions<AppConfigModuleForRootOptionsConnectionString>,
  ): DynamicModule {
    return {
      module: AppConfigModule,
      imports: [
        ...(factoryOption.imports ?? []),
      ],
      providers: [
        {
          provide: APP_CONFIG_OPTIONS,
          useFactory: factoryOption.useFactory,
          inject: [...(factoryOption.inject ?? [])],
        },
        {
          provide: APP_CONFIG_INSTANCE,
          inject: [APP_CONFIG_OPTIONS],
          useFactory: (opts: AppConfigModuleForRootOptionsConnectionString) => {

            debug(`ConnectionString`, hideSecrets(opts.connectionString));

            const client = new AppConfigurationClient(opts.connectionString);
            return client;
          },
        },
        AppConfigService,
      ],
      exports: [
        AppConfigService,
      ]
    }
  }
}
