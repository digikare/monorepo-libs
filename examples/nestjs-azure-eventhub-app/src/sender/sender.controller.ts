import { Controller, Get } from '@nestjs/common';
import { SenderService } from './sender.service';

@Controller()
export class SenderController {

  constructor(
    private readonly senderService: SenderService
  ) {}

  @Get()
  getHome() {
    // this.senderService.sendEventHub();
    return 'Hello toto';
  }

  @Get(`/send`)
  getSend() {
    this.senderService.sendEventHub();
    return 'SEND';
  }
}