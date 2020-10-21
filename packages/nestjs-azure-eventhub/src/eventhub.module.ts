import {
  Module,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import {
  EventHubConsumerService,
  EventHubConsumerServiceOptions,
} from './eventhub-consumer.service';
import { EventHubProducerService } from './eventhub-producer.service';

interface EventHubOptions {
  connectionString: string;
  /**
   * debugName for debug log
   */
  debugName?: string;
  options?: EventHubConsumerServiceOptions;
}

interface EventHubConsumerOptions extends EventHubOptions {
  consumerGroup: string;
}

interface EventHubFactoryConsumerOptions {
  useFactory: (...args: unknown[]) => Promise<EventHubConsumerOptions>,
  inject?: any[];
}

interface EventHubFactoryProducerOptions {
  useFactory: (...args: unknown[]) => Promise<EventHubOptions>;
  inject?: any[];
}

@Module({})
export class EventHubModule {

  static forProducer(
    tokenName: string | symbol,
    options: EventHubOptions,
  ): DynamicModule {
    const provider: Provider = {
      provide: tokenName,
      useFactory: () => new EventHubProducerService(
        options.connectionString,
        options.debugName,
        options.options,
      ),
    };
    return {
      module: EventHubModule,
      providers: [provider],
      exports: [provider],
    };
  }

  static forProducerAsync(
    tokenName: string | symbol,
    options: EventHubFactoryProducerOptions,
  ): DynamicModule {
    const provider: Provider = {
      provide: tokenName,
      useFactory: async (...args: unknown[]) => {
        const opt = await options.useFactory(...args);
        return new EventHubProducerService(
          opt.connectionString,
          opt.debugName,
          opt.options,
        );
      },
      inject: options.inject ?? [],
    };

    return {
      module: EventHubModule,
      providers: [provider],
      exports: [provider],
    };
  }

  static forConsumer(
    tokenName: string | symbol,
    options: EventHubConsumerOptions,
  ): DynamicModule {
    const provider: Provider = {
      provide: tokenName,
      useFactory: () => new EventHubConsumerService(
        options.connectionString,
        options.consumerGroup,
        options.debugName,
        options.options,
      ),
    };
    return {
      module: EventHubModule,
      providers: [provider],
      exports: [provider],
    };
  }

  static forConsumerAsync(
    tokenName: string | symbol,
    options: EventHubFactoryConsumerOptions
  ): DynamicModule {

    const provider: Provider = {
      provide: tokenName,
      useFactory: async (...args: unknown[]) => {
        const opt = await options.useFactory(...args);
        return new EventHubConsumerService(
          opt.connectionString,
          opt.consumerGroup,
          opt.debugName,
          opt.options,
        );
      },
      inject: options.inject ?? [],
    };

    return {
      module: EventHubModule,
      providers: [provider],
      exports: [provider],
    };
  }
}