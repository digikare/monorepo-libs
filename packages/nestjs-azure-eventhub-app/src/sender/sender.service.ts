import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class SenderService {

  constructor(
    @Inject('EH_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  sendEventHub() {
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
