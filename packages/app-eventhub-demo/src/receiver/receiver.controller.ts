import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class ReceiverController {

  private readonly _logger = new Logger(ReceiverController.name, true);

  @EventPattern('test')
  handleTestEvent(data: any) {
    this._logger.log(`======>> Receive event ${JSON.stringify(data)}`);
  }

  @EventPattern('audit.*')
  handleAuditEvent(data: any) {
    this._logger.log(`[AUDIT] ======>> Receive event ${JSON.stringify(data)}`);
  }

  @EventPattern('*')
  handleAllEvent(data: any) {
    this._logger.log(`[ALL] ======>> Receive event ${JSON.stringify(data)}`);
  }

}
