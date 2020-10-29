import { AppConfigService } from '../src/app-config.service';
import * as dotenv from 'dotenv';
import { AppConfigurationClient, GetConfigurationSettingResponse } from '@azure/app-configuration';

async function cleanup(key: string[], client: AppConfigurationClient) {
  const existingSettings = client.listConfigurationSettings({
    keyFilter: key.join(',')
  });

  for await (const setting of existingSettings) {
    await client.deleteConfigurationSetting({
      key: setting.key,
      label: setting.label,
    });
  }
}

describe('AppConfigService', () => {
  let appConfigService: AppConfigService;
  let clientAppConfigWrite: AppConfigurationClient;
  let clientAppConfigRead: AppConfigurationClient;

  // populate data
  const urlKey = 'Tests:Endpoint:Url';
  const data = [{
    key: urlKey,
    label: '', // empty string is equal to undefined for app config
    value: 'https://dev.example.com',
  }, {
    key: urlKey,
    label: 'beta',
    value: 'https://beta.example.com',
  }, {
    key: urlKey,
    label: 'production',
    value: 'https://example.com',
  }, {
    key: 'Tests:Production:Key',
    label: 'production',
    value: 'Value only for production',
  }];

  const keysUsed = [...new Set(data.map(i => i.key))];

  // setup app config stuff
  beforeAll(async () => {
    // load env stuff
    dotenv.config();

    if (process.env.USE_MOCK === "false") {
      clientAppConfigWrite = new AppConfigurationClient(process.env.APP_CONFIG_RW_CONNECTION as string);
      await cleanup(keysUsed, clientAppConfigWrite);
      for (const entry of data) {
        await clientAppConfigWrite.addConfigurationSetting(entry);
      }

      clientAppConfigRead = new AppConfigurationClient(process.env.APP_CONFIG_RO_CONNECTION as string);
    } else {
      clientAppConfigWrite = {} as AppConfigurationClient;
      clientAppConfigRead = {
        getConfigurationSetting: async (asked) => {

          const entry = data.find(((i) => {
            if (i.key !== asked.key) {
              return false;
            }

            if ((i.label === '' || i.label === undefined) && (asked.label === undefined || asked.label === '')) {
              return true;
            }

            // if label is defined and same
            if (asked.label && asked.label !== '' && i.label === asked.label) {
              return true;
            }

            return false;

          }));

          if (entry) {
            return {
              value: entry.value,
              statusCode: 200,
              key: asked.key,
              label: asked.label,
            } as GetConfigurationSettingResponse;
          }

          throw { statusCode: 404 };

        },
      } as AppConfigurationClient;
    }
  });

  afterAll(async () => {
    if (process.env.USE_MOCK === "false") {
      // clean up all
      await cleanup(keysUsed, clientAppConfigWrite);
    }
  });

  it(`startup`, () => {
    expect(clientAppConfigWrite).toBeTruthy();
    expect(clientAppConfigRead).toBeTruthy();
  });


  describe(`without any label defined`, () => {
    beforeEach(() => {
      appConfigService = new AppConfigService(clientAppConfigRead);
    });

    describe('#get()', () => {
      it.each(
        data.filter(item => item.key === urlKey).map(item => [item.key, item.label, item.value])
      )(`.get(%s, %s) return %s`, async (key: string, label: string, expected: any) => {
        const value = await appConfigService.get(key, label);
        expect(value).toBe(expected);
      });

      it(`.get(unknownKey) return undefined`, async () => {
        const value = await appConfigService.get('unknownKey');
        expect(value).toBeUndefined();
      });

      it(`.get(Tests:Production:Key) return undefined`, async () => {
        const value = await appConfigService.get('Tests:Production:Key');
        expect(value).toBeUndefined();
      });

    });

  });


  describe(`with a specific label='production'`, () => {

    beforeEach(() => {
      appConfigService = new AppConfigService(clientAppConfigRead, {
        label: 'production',
      });
    });

    describe('#get()', () => {
      let expectedValue = data.find(i => i.key === urlKey && i.label === 'production')?.value;
      it(`.get(${urlKey}) return ${expectedValue}`, async () => {
        const value = await appConfigService.get(urlKey);
        expect(value).toBe(expectedValue);
      });

      it(`.get(unknownKey) return undefined`, async () => {
        const value = await appConfigService.get('unknownKey');
        expect(value).toBeUndefined();
      });

      it(`.get(Tests:Production:Key) return the valid value`, async () => {
        const value = await appConfigService.get('Tests:Production:Key');
        expect(value).toBeDefined();
      });

    });

  });

});
