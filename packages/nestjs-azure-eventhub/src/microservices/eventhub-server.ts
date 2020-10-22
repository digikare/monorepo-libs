import {
  Server,
  CustomTransportStrategy,
  WritePacket,
  Serializer,
  Deserializer,
} from '@nestjs/microservices';
import {
  EventHubProducerClient,
  EventHubConsumerClient,
  ReceivedEventData,
  Subscription,
  PartitionContext,
  SendBatchOptions,
  SubscriptionEventHandlers,
  EventHubConsumerClientOptions,
} from '@azure/event-hubs';
import { Observable } from 'rxjs';
import Debug from 'debug';
import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
import { EventHubProperties } from './contants';
import { isObject } from '@nestjs/common/utils/shared.utils';

const globalDebug = Debug('eventhub:server');

type EventHubContextArgs = [PartitionContext, string];
export class EventHubContext extends BaseRpcContext<EventHubContextArgs> {
  constructor(args: EventHubContextArgs) {
    super(args);
  }

  getEventHubName() {
    return this.args[0].eventHubName;
  }

  getConsumerGroup() {
    return this.args[0].consumerGroup;
  }

  getPartitionId() {
    return this.args[0].partitionId;
  }

  getPattern() {
    return this.args[1];
  }
}

export interface EventHubServerOptions {
  serializer?: Serializer;
  deserializer?: Deserializer;
  withWildcardSupport?: boolean;

  consumerClientOptions?: EventHubConsumerClientOptions;

  // define if a specific partitionId should be listened
  partitionId?: string;
}

export class EventHubServer extends Server implements CustomTransportStrategy {

  private producer?: EventHubProducerClient;
  private consumer?: EventHubConsumerClient;
  private subscription?: Subscription;

  private _debug: Debug.Debugger;

  private wildcardSupport = false;

  constructor(
    private readonly connectionString: string,
    private readonly eventHubName: string,
    private readonly consumerGroup: string,
    private readonly options?: EventHubServerOptions,
  ) {
    super();

    this.logger.setContext(EventHubServer.name);
    this._debug = globalDebug.extend(consumerGroup);
    this._debug(`ctor()`);

    this.initializeDeserializer(this.options);
    this.initializeSerializer(this.options);

    this.wildcardSupport = this.options?.withWildcardSupport === true;
  }

  public close() {
    this.subscription?.close();
    this.producer?.close();
    this.consumer?.close();

    this.subscription = undefined;
    this.producer = undefined;
    this.consumer = undefined;
  }

  public async listen(callback: () => void) {

    const debug = this._debug.extend('listen');

    this.logger.debug(`listen()`);

    this.producer = new EventHubProducerClient(this.connectionString, this.eventHubName);
    this.consumer = new EventHubConsumerClient(
      this.consumerGroup,
      this.connectionString,
      this.eventHubName,
      this.options?.consumerClientOptions,
    );

    debug(`subscribe`);
    this.logger.debug(`listen() - subscribe`);

    const subscribeHandler: SubscriptionEventHandlers = {
      processEvents: async (events: ReceivedEventData[], context: PartitionContext) => {
        if (events.length > 0) {
          this._debug(`Receive ${events.length} messages`);
          this.logger.debug(`Receive ${events.length} messages`);
        }
        events.forEach((event) => this.handlePatternMessage(event, context));
      },
      processError: async (err: Error/*, context: PartitionContext*/) => {
        this._debug(`Error: `, err);
        this.logger.error(err);
      },
    }

    if (this.options?.partitionId) {
      const partitionId = this.options.partitionId;
      const partitionsIds = await this.consumer.getPartitionIds();
      debug('Available partitionIds', partitionsIds);

      if (partitionsIds.includes(partitionId) === false) {
        debug(`Error - partitionId ${partitionId} is not in`, partitionsIds);
        throw new Error(`Invalid partitionId ${partitionId}`);
      }

      debug(`Listen on patitionId=${this.options?.partitionId}`);
      this.subscription = this.consumer.subscribe(
        partitionId,
        subscribeHandler,
      );

    } else {
      debug(`Listen on patitionId=ALL`);
      this.subscription = this.consumer.subscribe(subscribeHandler);
    }

    callback();

  }

  private async handlePatternMessage(
    event: ReceivedEventData,
    context: PartitionContext,
  ) {

    if (!this.wildcardSupport) {
      this.handleMessage(event, context);
      return ;
    }

    if (event.properties === undefined) {
      this.handleMessage(event, context);
      return ;
    }

    var splitPattern = event.properties.pattern.split(".");
    for (let index = -1; index <= splitPattern.length; index++) {
      if (index === -1) {
        event.properties[EventHubProperties.TOPIC] = '*';
        this.handleMessage(event, context);
      } else {
        var topic = splitPattern.slice(0, index).join('.');
        if (topic !== '') {
          event.properties[EventHubProperties.TOPIC] = topic;
          this.handleMessage(event, context);
          if (index !== splitPattern.length && splitPattern[index] !== '*') {
            event.properties[EventHubProperties.TOPIC] = topic + '.*';
            this.handleMessage(event, context);
          }
        }
      }
    }
  }

  getPublisher({
    partitionId,
    partitionKey,
    sequenceNumber,
    pattern,
  }: {
    partitionId?: string,
    partitionKey?: string,
    sequenceNumber: number,
    pattern: string,
  }): any {
    return (data: WritePacket) => {
      this._debug(`handleMessage - sequenceNumber=${sequenceNumber}`);
      return this.sendMessage(data, pattern, {
        partitionKey,
        partitionId,
      });
    };
  }

  getReplyPattern(pattern) {

    if (isObject(pattern)) {
      return {
        ...pattern,
        reply: 'true',
      }
    }

    return `${pattern}/reply`;
  }

  initializeDeserializer(options?: EventHubServerOptions) {
    if (options ?.deserializer) {
      this.deserializer = options?.deserializer;
    } else {
      super.initializeDeserializer(options);
    }
  }

  initializeSerializer(options?: EventHubServerOptions) {
    if (options ?.serializer) {
      this.serializer = options?.serializer;
    } else {
      super.initializeSerializer(options);
    }
  }

  private async sendMessage(message: WritePacket, pattern: string, options?: SendBatchOptions) {
    this._debug('sendMessage() called');
    await this.producer?.sendBatch(
      [{
        body: JSON.stringify(message),
        properties: {
          [EventHubProperties.TOPIC]: pattern,
        }
      }],
      options,
    );
  }

  private async handleMessage(
    event: ReceivedEventData,
    context: PartitionContext,
  ) {
    const {
      body,
      properties,
      partitionKey,
      enqueuedTimeUtc,
      sequenceNumber,
      offset,
    } = event;

    const debug = this._debug.extend('handleMessage');

    debug(`consumerGroup=${context.consumerGroup} - partitionId=${context.partitionId} partitionKey=${partitionKey} offset=${offset} enqueuedTimeUtc=${enqueuedTimeUtc} sequenceNumber=${sequenceNumber}`, body);
    debug(`properties=`, properties);
    debug(`body=`, body);

    const rawMessage = JSON.parse(body.toString());

    const packet = this.deserializer.deserialize(rawMessage, {
      channel: properties?.pattern
    });
    const pattern = properties && properties[EventHubProperties.TOPIC] || packet.pattern;
    const ctx = new EventHubContext([context, pattern]);

    if (!properties || properties[EventHubProperties.ID] === undefined) {
      this.handleEvent(pattern, packet, ctx);
      return;
    }

    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return;
    }

    const replyPattern = this.getReplyPattern(pattern);

    const publish = this.getPublisher({
      partitionId: context.partitionId,
      partitionKey: partitionKey || undefined,
      sequenceNumber: sequenceNumber,
      pattern: this.normalizePattern(replyPattern),
    });

    const response$ = this.transformToObservable(
      await handler(packet.data, ctx),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }


}
