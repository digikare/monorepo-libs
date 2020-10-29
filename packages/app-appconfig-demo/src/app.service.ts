import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@digikare/nestjs-azure-appconfig';

@Injectable()
export class AppService {
  constructor(
    private readonly appConfigService: AppConfigService,
  ) {}

  async getConfigKey(key: string, label?: string) {
    const rest = await this.appConfigService.get(key, label);
    return rest;
  }
}