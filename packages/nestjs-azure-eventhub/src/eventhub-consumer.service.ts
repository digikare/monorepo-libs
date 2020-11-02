import {
  EventHubConsumerClient,
  ReceivedEventData,
  PartitionContext,
  SubscribeOptions,
  EventHubConsumerClientOptions,
} from '@azure/event-hubs';
import { Subject } from 'rxjs';
import Debug from 'debug';

const debug = Debug('eventhub:consumer');

export interface EventHubConsumerServiceOptions {
  client?: EventHubConsumerClientOptions;
  subscribe?: SubscribeOptions;
}

export class EventHubConsumerService<T extends any> {

  protected client: EventHubConsumerClient;
  protected subscription;

  protected _event$ = new Subject<T>();

  public event$ = this._event$.asObservable();

  private _debug: Debug.Debugger = debug;

  constructor(
    readonly connectionString: string,
    readonly eventHubName: string,
    readonly consumerGroup: string = 'Default',
    readonly options?: EventHubConsumerServiceOptions,
  ) {

    // extend with name if provided
    this._debug = debug.extend(eventHubName);

    this._debug('ctor()');
    this.client = new EventHubConsumerClient(
      this.consumerGroup,
      this.connectionString,
      this.eventHubName,
      options?.client);
    this.subscription = this.client.subscribe({
      processEvents: async (events, context) => this.processEvents(events, context),
      processError: async (err/*, context*/) => this.processError(err/*, context*/),
    }, options?.subscribe);
  }

  private processEvents(
    events: ReceivedEventData[],
    context: PartitionContext,
  ) {
    this._debug(`processEvents having ${events.length} events - patitionId=${context.partitionId}`);
    // stream each event
    events.forEach((evt) => {
      const body: T = evt.body;
      this._event$.next(body);
    });
  }

  private processError(err/*, context*/) {
    this._debug('Error:', err);
  }

}
