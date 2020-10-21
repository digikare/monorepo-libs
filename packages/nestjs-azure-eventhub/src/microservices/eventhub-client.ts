import {
  ClientProxy,
  ReadPacket,
  WritePacket,
} from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { EventHubProducerClient, EventData, SendBatchOptions } from '@azure/event-hubs';
import Debug from 'debug';
import { EventHubProperties } from './contants';

export interface EventHubClientOptions {
  eventHubName?: string;
  partitionId?: string;
}

export class EventHubClient extends ClientProxy {

  protected readonly logger = new Logger(EventHubClient.name);

  private producer?: EventHubProducerClient;
  private debug = Debug('eventhub').extend('client');

  constructor(
    private readonly connectionString: string,
    private readonly options?: EventHubClientOptions,
  ) {
    super();

    if (this.options?.eventHubName) {
      this.debug = this.debug.extend(this.options.eventHubName);
    }

    const debug = this.debug.extend('ctor')

    this.initializeSerializer({});
    this.initializeDeserializer({});

    if (this.options?.partitionId) {
      debug(`partitionId=${this.options.partitionId} is present - FORCED`);
    }

  }

  async connect(): Promise<EventHubProducerClient> {

    this.debug(`connect() called`);

    if (this.producer) {
      return this.producer;
    }

    if (this.options?.eventHubName) {
      this.producer = new EventHubProducerClient(this.connectionString, this.options?.eventHubName);
    } else {
      this.producer = new EventHubProducerClient(this.connectionString);
    }
    return this.producer;
  }

  close() {
    this.producer?.close();

    this.producer = undefined;
  }

  protected async dispatchEvent<T extends any>(
    packet: ReadPacket<T>,
  ): Promise<any> {
    const debug = this.debug.extend('dispatchEvent');

    if (this.producer) {

      const pattern = this.normalizePattern(packet.pattern);
      debug('pattern', pattern);

      const event: EventData = this.getEventData({ pattern, packet });
      const sendOptions: SendBatchOptions = {};
      if (this.options?.partitionId) {
        sendOptions.partitionId = this.options.partitionId;
      }

      debug(`partitionId=${sendOptions.partitionId}`);
      debug(`event`, event);

      await this.producer.sendBatch([ event ], sendOptions);

    }
  }

  protected publish<T extends any>(
    partialPacket: ReadPacket<T>,
    callback: (packet: WritePacket) => void,
  // eslint-disable-next-line @typescript-eslint/ban-types
  ): Function {

    const debug = this.debug.extend('publish()');
    debug(`publish() called`);

    try {

      const pattern = this.normalizePattern(partialPacket.pattern);
      debug('pattern', pattern);

      const packet = this.assignPacketId(partialPacket);

      const event: EventData = this.getEventData({
        pattern,
        packet,
        properties: {
          [EventHubProperties.TOPIC]: pattern,
          [EventHubProperties.ID]: packet.id,
        }
      });

      const sendOption: SendBatchOptions = {};

      if (this.options?.partitionId) {
        sendOption.partitionId = this.options.partitionId;
        debug(`force partitionId=${sendOption.partitionId}`);
      }

      debug(`event`, event);
      this.producer?.sendBatch([ event ], sendOption);

      this.routingMap.set(packet.id, callback);

      return () => {
        this.routingMap.delete(packet.id);
      };

    } catch (err) {

      debug(`error`, err);

      callback({ err });

      return () => {
        // no op
      };
    }
  }

  private getEventData({
    pattern,
    packet,
    properties = {},
  }: {
    pattern: string;
    packet: any;
    properties?: { [key: string]: any };
  }): EventData {

    const serializedPacket = this.serializer.serialize(packet);
    const event: EventData = {
      body: JSON.stringify(serializedPacket),
      properties: {
        ...properties,
        pattern,
        date: (new Date()).toISOString(),
      },
    }

    return event;
  }
}
