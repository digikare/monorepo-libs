<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

<h1 align="center">
  Digikare nestjs-azure-eventhub
</h1>
<p align="center">
  Transport component for NestJS microservice
</p>

<p align="center">
  The librairies is used and maintained by <a href="https://www.digikare.com">digikare</a> team. We are open for all contributions!
</p>

## Description

`@digikare/nestjs-azure-eventhub` is a transport component provide [Event Hub](https://docs.microsoft.com/fr-fr/azure/event-hubs/event-hubs-about) into [Nest microservice](https://github.com/nestjs/nest)

## Installation

```bash
$ npm install @digikare/nestjs-azure-eventhub

# or yarn

$ yarn add @digikare/nestjs-azure-eventhub
```

## How to use

### Microservice

```typescript
import { EventHubServer } from '@digikare/nestjs-azure-eventhub';
// other imports {...}

const app = await NestFactory.createMicroservice(ApplicationModule, {
  startegy: new EventHubServer(
    '<connection_string>',        // the connection string
    '<event_hub_name>',           // the event hub name
    '<optional_consumer_group>',  // optionnal: The consumer group, the default value is $Default
  ),
});
```

You can also define a specific partitionId to listen if needed (useful for dev/test env).

```typescript
import { EventHubServer } from '@digikare/nestjs-azure-eventhub';
// other imports {...}

const app = await NestFactory.createMicroservice(ApplicationModule, {
  startegy: new EventHubServer(
    '<connection_string>',          // the connection string
    '<event_hub_name>',             // the event hub name
    '<optional_consumer_group>',    // optionnal: The consumer group, the default value is $Default
    {
      partitionId: '<partition_id>' // optional: the partitionId to listen
    }
  ),
});
```

And now you can use `@EventPattern()` and `@MessagePattern()` decorators!

#### Checkpoint store

Since 0.1.2, you can add a checkpoint store, that allow your app to treat pending message.

You will need an azure account storage in order to make it works.

```typescript
import { EventHubServer } from '@digikare/nestjs-azure-eventhub';
// other imports {...}

const app = await NestFactory.createMicroservice(ApplicationModule, {
  startegy: new EventHubServer(
    '<connection_string>',            // the connection string
    '<event_hub_name>',               // the event hub name
    '<optional_consumer_group>',      // optionnal: The consumer group, the default value is $Default
    {
      partitionId: '<partition_id>',  // optional: the partitionId to listen
      checkpointStore: {
        connectionString: '<checkpoint_account_storage_connection_string>',
        containerName: '<checkpoint_container_name>',
      }
    }
  ),
});
```

#### Wildcard support on pattern

Wildcard support on pattern can be usefull. When you receive a message, the client will cut out the topic of the event
in order to check if handlers are subscribed to these topics.

The restriction at the moment:

- The wildcard char '*' must be at the end (eg: `audit.*`, 'my.scope.on.*`)
- The split char is '.'

To enable, just set `wildcardSuppprt` option to `true`

```typescript
import { EventHubServer } from '@digikare/nestjs-azure-eventhub';
// other imports {...}

const app = await NestFactory.createMicroservice(ApplicationModule, {
  startegy: new EventHubServer(
    '<connection_string>',            // the connection string
    '<event_hub_name>',               // the event hub name
    '<optional_consumer_group>',      // optionnal: The consumer group, the default value is $Default
    {
      partitionId: '<partition_id>',  // optional: the partitionId to listen
      wildcardSupport: true,          // <<== Support wildcard
    }
  ),
});
```

__Examples__

If you send an event on the following topic : event.subevent.topic
The handlePatternMessage will test the following topics :
- `*`
- `event.*`
- `event.subevent`
- `event.subevent.*`
- `event.subevent.topic`

### Client

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventHubClient } from '@digikare/nestjs-azure-eventhub';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: {
    {
      provide: 'EVENT_HUB_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('EVENT_HUB_CONNECTION_STRING');
        const eventHubName = configService.get<string>('EVENT_HUB_NAME');
        const partitionId = configService.get<string>('EVENT_HUB_PARTITION_ID'); // optionnal

        return new EventHubClient(
          connectionString,
          {
            eventHubName: eventHubName,
            partitionId: partitionId, // optional - define partitionId if you want sent to only
          }
        );
      },
    }
  },
})
```

Hint: When you define a partitionId, the configuration will override every message/event to send. Even if you provide a partitionID or partitionKey.

## Build

```bash
# To install dependencies, first go to root monorepo and run yarn
$ cd ../../
$ yarn

# development
$ cd packages/nestjs-azure-eventhub
$ yarn build

# watch mode
$ cd packages/nestjs-azure-eventhub
$ npm run dev
```

## License

  This library is under [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
