import { TokenCredential } from '@azure/identity';
import {
  AppConfigurationClientOptions,
  GetConfigurationSettingResponse,
} from '@azure/app-configuration';

export interface AppConfigModuleForRootOptionsGeneric {
  label?: string;
  cache?: {
    enabled?: boolean;
    ttl?: number;
  }
}

export interface AppConfigModuleForRootOptionsServicePrincipal extends AppConfigModuleForRootOptionsGeneric {
  endpoint: string;
  credential?: TokenCredential;
  options?: AppConfigurationClientOptions;
}

export interface AppConfigModuleForRootOptionsConnectionString extends AppConfigModuleForRootOptionsGeneric {
  connectionString: string;
}

export interface ConfigurationResultCacheEntry extends GetConfigurationSettingResponse {
  time: number;
}