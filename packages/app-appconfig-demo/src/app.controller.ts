import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {

  constructor(
    private readonly service: AppService,
  ) {}

  @Get('/')
  async getHome() {
    const configKey = await this.service.getConfigKey('configKey1')
    return {
      configKey,
      result: 'ok',
    };
  }

  @Get('/env-label')
  async getEnvLabel() {
    const value = await this.service.getConfigKey('env')
    return {
      env: value,
    };
  }

  @Get('/env-label-prod')
  async getEnvLabelProd() {
    const value = await this.service.getConfigKey('env', 'prod')
    return {
      env: value,
    };
  }

}
