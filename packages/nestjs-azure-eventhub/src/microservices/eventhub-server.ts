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
import { ContainerClient } from '@azure/storage-blob';
import { BlobCheckpointStore } from '@azure/eventhubs-checkpointstore-blob';

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

export interface EventHubCheckpointStore {
  connectionString: string;
  containerName: string;
}

export interface EventHubServerOptions {
  serializer?: Serializer;
  deserializer?: Deserializer;
  withWildcardSupport?: boolean;

  consumerClientOptions?: EventHubConsumerClientOptions;

  // define if a specific partitionId should be listened
  partitionId?: string;
  checkpointStore?: EventHubCheckpointStore;
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
    this._debug('ctor()');

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

    this.logger.debug('listen()');

    this.producer = new EventHubProducerClient(
      this.connectionString,
      this.eventHubName,
    );

    if (this.options?.checkpointStore) {
      const containerClient = new ContainerClient(
        this.options.checkpointStore.connectionString,
        this.options.checkpointStore.containerName,
      );

      if (!(await containerClient.exists())) {
        this.logger.debug("Checkpoint container creation");
        await containerClient.create();
      } else {
        this.logger.debug("Checkpoint container already exist");
      }

      const checkpointStore = new BlobCheckpointStore(containerClient);

      this.consumer = new EventHubConsumerClient(
        this.consumerGroup,
        this.connectionString,
        this.eventHubName,
        checkpointStore,
        this.options?.consumerClientOptions,
      );
    } else {
      this.consumer = new EventHubConsumerClient(
        this.consumerGroup,
        this.connectionString,
        this.eventHubName,
        this.options?.consumerClientOptions,
      );
    }

    debug('subscribe');
    this.logger.debug('listen() - subscribe');

    const subscribeHandler: SubscriptionEventHandlers = {
      processEvents: async (
        events: ReceivedEventData[],
        context: PartitionContext,
      ) => {
        if (events.length > 0) {
          this._debug(`Receive ${events.length} messages`);
          this.logger.debug(`Receive ${events.length} messages`);
        } else {
          return;
        }

        for (const evt of events) {
          await this.handlePatternMessage(evt, context);
        }

        try {
          if (this.options?.checkpointStore){
            this.logger.debug("Update Checkpoint");
            await context.updateCheckpoint(events[events.length - 1]);
          }
        } catch (err) {
          this.logger.error(`Error when checkpointing on partition ${context.partitionId}: `, err);
          throw err;
        }

        this.logger.debug(
          `Successfully checkpointed event with sequence number: ${
            events[events.length - 1].sequenceNumber
          } from partition: ${context.partitionId}`
        );

      },
      processError: async (err: Error /*, context: PartitionContext*/) => {
        this._debug('Error: ', err);
        this.logger.error(err);
      },
    };

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
      debug('Listen on patitionId=ALL');
      this.subscription = this.consumer.subscribe(subscribeHandler);
    }

    callback();
  }

  private async handlePatternMessage(
    event: ReceivedEventData,
    context: PartitionContext,
  ) {

    const debug = this._debug.extend('handlePatternMessage');
    const {
      body,
      properties,
      partitionKey,
      enqueuedTimeUtc,
      sequenceNumber,
      offset,
    } = event;

    debug(
      `consumerGroup=${context.consumerGroup} - partitionId=${context.partitionId} partitionKey=${partitionKey} offset=${offset} enqueuedTimeUtc=${enqueuedTimeUtc} sequenceNumber=${sequenceNumber}`
    );
    debug('properties=', properties);
    debug('body=', body);

    if (!this.wildcardSupport) {
      await this.handleMessage(event, context);
      return;
    }

    // default emit message with *
    await this.handleMessage(this.clonePacketForTopic(event, '*'), context);

    if (event.properties === undefined) {
      await this.handleMessage(event, context);
      return;
    }

    const splitPattern = event.properties.pattern.split('.');
    for (let index = 0; index <= splitPattern.length; index++) {
      const topic = splitPattern.slice(0, index).join('.');
      if (topic !== '') {
        await this.handleMessage(this.clonePacketForTopic(event, topic), context);
        if (index !== splitPattern.length && splitPattern[index] !== '*') {
          await this.handleMessage(this.clonePacketForTopic(event, topic + '.*'), context);
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
    partitionId?: string;
    partitionKey?: string;
    sequenceNumber: number;
    pattern: string;
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
      };
    }

    return `${pattern}/reply`;
  }

  initializeDeserializer(options?: EventHubServerOptions) {
    if (options?.deserializer) {
      this.deserializer = options?.deserializer;
    } else {
      super.initializeDeserializer(options);
    }
  }

  initializeSerializer(options?: EventHubServerOptions) {
    if (options?.serializer) {
      this.serializer = options?.serializer;
    } else {
      super.initializeSerializer(options);
    }
  }

  private async sendMessage(
    message: WritePacket,
    pattern: string,
    options?: SendBatchOptions,
  ) {
    this._debug('sendMessage() called');
    await this.producer?.sendBatch(
      [
        {
          body: JSON.stringify(message),
          properties: {
            [EventHubProperties.TOPIC]: pattern,
          },
        },
      ],
      options,
    );
  }

  private clonePacketForTopic(
    event: ReceivedEventData,
    topic: string,
  ): ReceivedEventData {
    return {
      ...event,
      properties: {
        ...(event.properties || {}),
        [EventHubProperties.TOPIC]: topic,
      }
    }
  }

  private async handleMessage(
    event: ReceivedEventData,
    context: PartitionContext,
  ) {
    const {
      body,
      properties,
      partitionKey,
      sequenceNumber,
    } = event;

    const rawMessage = JSON.parse(body.toString());

    const packet = this.deserializer.deserialize(rawMessage, {
      channel: properties?.pattern,
    });
    const pattern =
      (properties && properties[EventHubProperties.TOPIC]) || packet.pattern;
    const ctx = new EventHubContext([context, pattern]);

    // no handle found
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return;
    }

    // if not ID defined, it's an event
    if (!properties || properties[EventHubProperties.ID] === undefined) {
      this.handleEvent(pattern, packet, ctx);
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
