import { Injectable, Inject, Optional } from '@nestjs/common';
import { APP_CONFIG_INSTANCE, APP_CONFIG_OPTIONS } from './constants';
import { AppConfigurationClient, GetConfigurationSettingResponse } from '@azure/app-configuration';
import {
  AppConfigModuleForRootOptionsGeneric,
  ConfigurationResultCacheEntry,
} from './app-config.interfaces';

function getHashKey(key: string, label?: string) {
  return `${key}__#__${label}`;
}

@Injectable()
export class AppConfigService {

  _data = new Map<string, ConfigurationResultCacheEntry>();

  private cache = true;

  constructor(
    @Inject(APP_CONFIG_INSTANCE)
    private readonly _appConfigClient: AppConfigurationClient,
    @Optional() @Inject(APP_CONFIG_OPTIONS)
    private readonly _options: AppConfigModuleForRootOptionsGeneric = {},
  ) {
    this.cache = this._options?.cache?.enabled ?? false;
  }

  get label(): string | undefined {
    return this._options.label;
  }

  async get<T>(key: string, label?: string): Promise<T|undefined> {
    try {
      const result = await this.getAsync(key, label);
      // return unique instance
      return JSON.parse(JSON.stringify(result?.value)) as unknown as T;
    } catch (err) {
      // if not 404 - an error occurred
      if (err.statusCode !== 404) {
        console.error(err);
      }
      return undefined;
    }

  }

  private async getAsync(key: string, label?: string): Promise<GetConfigurationSettingResponse> {

    const hashKey = getHashKey(key, label ?? this.label);

    if (this.cache && this._data.has(hashKey)) {

      const cacheEntry = this._data.get(hashKey);

      if (cacheEntry) {
        if (this._options.cache?.ttl === undefined) {
          console.log(`[key=${key}] return cached value`);
          return cacheEntry;
        }

        const ttl = this._options.cache.ttl
        if (ttl > 0 && (Date.now() - cacheEntry.time) / 1000 < ttl) {
          console.log(`[key=${key}] return cached value`);
          return cacheEntry;
        }
      }
    }

    const result = await this._appConfigClient.getConfigurationSetting({
      key,
      label: label ?? this.label,
    });

    if (this.cache) {
      this._data.set(hashKey, {
        ...result,
        time: Date.now(),
      });
    }

    return result;
  }

}
