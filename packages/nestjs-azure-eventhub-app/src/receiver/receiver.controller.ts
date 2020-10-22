import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class ReceiverController {

  private readonly _logger = new Logger(ReceiverController.name, true);

  @EventPattern('test')
  handleTestEvent(data: any) {
    this._logger.log(`======>> Receive event ${JSON.stringify(data)}`);
  }

}
