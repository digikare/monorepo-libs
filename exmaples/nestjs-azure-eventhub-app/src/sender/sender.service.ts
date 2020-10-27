import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class SenderService {

  private _logger = new Logger(SenderService.name);

  constructor(
    @Inject('EH_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  sendEventHub() {
    this._logger.log(`Emit event "test"`);
    this.client.emit('test', {
      date: new Date(),
      payload: {
        number: 1,
        string: 'string',
        boolean: true,
      }
    });
  }

}
