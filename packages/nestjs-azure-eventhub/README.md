
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

## Build

```bash
# first install dependencies
$ yarn

# development
$ yarn build

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Message Pattern

When you receive a message, the client will cut out the topic of the event in order to check if handlers are subscribed to these topics.

### Examples

If you send an event on the following topic : event.subevent.topic
The handlePatternMessage will test the following topics :
*
event.*
event.subevent
event.subevent.*
event.subevent.topic

## License

  This library is under [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
