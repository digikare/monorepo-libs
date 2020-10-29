import { Injectable, Inject, Optional } from '@nestjs/common';
import { APP_CONFIG_INSTANCE, APP_CONFIG_OPTIONS } from './constants';
import { AppConfigurationClient, GetConfigurationSettingResponse } from '@azure/app-configuration';
import {
  AppConfigModuleForRootOptionsGeneric,
  ConfigurationResultCacheEntry,
} from './app-config.interfaces';
import Debug from 'debug';

const debug = Debug('AppConfig:Service');

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

  /**
   * Retreive a app config value
   *
   * @param {string} key The configuration key to load
   * @param {string} label The label to use - set empty string to retrive without label
   */
  async get<T>(key: string, label?: string): Promise<T|undefined> {
    try {
      const result = await this.getAsync(key, label);
      // return unique instance
      return JSON.parse(JSON.stringify(result?.value)) as unknown as T;
    } catch (err) {
      debug(`error`, err);
      // if not 404 - an error occurred
      if (err.statusCode !== 404) {
        console.error(err);
      }
      return undefined;
    }

  }

  private getLabel(label: string|undefined): string|undefined {
    if (label === undefined) {
      return this.label;
    }

    // if empty string -> force undefined
    if (label === '') {
      return undefined;
    }

    return label ?? this.label;
  }

  private async getAsync(key: string, label?: string): Promise<GetConfigurationSettingResponse> {

    const normalizeLabel = this.getLabel(label);

    const hashKey = getHashKey(key, normalizeLabel);

    if (this.cache && this._data.has(hashKey)) {

      const cacheEntry = this._data.get(hashKey);

      if (cacheEntry) {
        if (this._options.cache?.ttl === undefined) {
          debug(`[key=${key}] return cached value`);
          return cacheEntry;
        }

        const ttl = this._options.cache.ttl
        if (ttl > 0 && (Date.now() - cacheEntry.time) / 1000 < ttl) {
          debug(`[key=${key}] return cached value`);
          return cacheEntry;
        }
      }
    }

    const result = await this._appConfigClient.getConfigurationSetting({
      key,
      label: normalizeLabel,
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
