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
import {
  EventHubClient,
  EventHubClientOptions,
} from './microservices';

interface EventHubConfiguration {
  connectionString: string;
  eventHubName: string;
  options?: EventHubConsumerServiceOptions;
}
type EventHubProducerOptions = FactoryOption<EventHubConfiguration>;

interface FactoryOption<T> {
  provide: string | symbol;
  useFactory: (...args: unknown[]) => T|Promise<T>;
  inject?: any[];
  imports?: any[];
}

interface EventHubConsumerConfiguration extends EventHubConfiguration {
  consumerGroup?: string;
}

type EventHubFactoryConsumerOptions = FactoryOption<EventHubConsumerConfiguration>;

interface EventHubClientProxyConfiguration {
  connectionString: string;
  eventHubName: string;
  options?: EventHubClientOptions;
}

type EventHubClientProxyOptions = FactoryOption<EventHubClientProxyConfiguration>;

@Module({})
export class EventHubModule {

  static forClientProxy(
    options: EventHubClientProxyOptions,
  ): DynamicModule {

    const configToken = Symbol('EventHub_ClientProxy_Config');

    const configProvider: Provider = {
      provide: configToken,
      inject: options.inject ?? [],
      useFactory: options.useFactory,
    };

    const provider: Provider = {
      provide: options.provide,
      inject: [configToken],
      useFactory: (opt?: EventHubClientProxyConfiguration) => {
        if (opt?.connectionString && opt?.eventHubName) {
          return new EventHubClient(
            opt.connectionString,
            opt.eventHubName,
            opt.options
          );
        }
        return undefined;
      },
    };

    return {
      module: EventHubModule,
      imports: options.imports ?? [],
      providers: [configProvider, provider],
      exports: [provider],
    };
  }

  static forProducer(
    options: EventHubProducerOptions,
  ): DynamicModule {

    const configToken = Symbol('EventHub_Producer_Config');

    const configProvider: Provider = {
      provide: configToken,
      inject: options.inject ?? [],
      useFactory: options.useFactory,
    };

    const provider: Provider = {
      provide: options.provide,
      inject: [configToken],
      useFactory: (opt: EventHubConfiguration) => new EventHubProducerService(
        opt.connectionString,
        opt.eventHubName,
        opt.options,
      ),
    };

    return {
      module: EventHubModule,
      imports: options.imports ?? [],
      providers: [configProvider, provider],
      exports: [provider],
    };
  }

  static forConsumer(
    options: EventHubFactoryConsumerOptions
  ): DynamicModule {

    const configToken = Symbol('EventHub_Consumer_Config');

    const configProvider: Provider = {
      provide: configToken,
      inject: options.inject ?? [],
      useFactory: options.useFactory,
    };

    const provider: Provider = {
      provide: options.provide,
      inject: [configToken],
      useFactory: async (opt: EventHubConsumerConfiguration) => new EventHubConsumerService(
        opt.connectionString,
        opt.eventHubName,
        opt.consumerGroup,
        opt.options,
      ),
    };

    return {
      module: EventHubModule,
      imports: options.imports ?? [],
      providers: [configProvider, provider],
      exports: [provider],
    };
  }
}